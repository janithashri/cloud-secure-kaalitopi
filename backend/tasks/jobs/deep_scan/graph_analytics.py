"""
Graph Intelligence analytics.

Runs Neo4j GDS algorithms (PageRank, Betweenness, Louvain, K-Core, WCC)
and violation-feature similarity (shadow risk detection) on the Cartography
graph produced by Deep Scan.

Called from the Deep Scan Celery task AFTER sync_internet_exposure() and
BEFORE mark_scan_finished().  NEVER raises an exception — all errors are
logged and the scan continues.

All graph-intelligence data lives ONLY in Neo4j as node properties.
Nothing is written to the PostgreSQL Finding table.
"""

import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Violation feature definitions — used for shadow risk detection
# ---------------------------------------------------------------------------
VIOLATION_FEATURES = {
    # ── S3Bucket ─────────────────────────────────────────────────────────────
    # Cartography property names confirmed from Cartography source.
    # anonymous_access / default_encryption are booleans:
    #   True  = insecure for anonymous_access  (publicly reachable)
    #   False = insecure for default_encryption (not encrypted)
    # The comparison uses value-equality so both directions are caught.
    "S3Bucket": [
        "anonymous_access",       # True  = publicly accessible (bad)
        "default_encryption",     # False = not encrypted (bad)
        "versioning_status",      # "Enabled" vs others — Cartography stores as string
        "log_delivery_enabled",   # False = no access logging (bad)
    ],

    # ── EC2SecurityGroup ──────────────────────────────────────────────────────
    # Cartography stores SG rules as separate IpPermission nodes (relationships),
    # NOT as boolean flags on the EC2SecurityGroup node.  The precompute step
    # below writes boolean flags from those relationship nodes before we compare.
    "EC2SecurityGroup": [
        "ingress_open_ssh",       # precomputed — True = SSH open to 0.0.0.0/0
        "ingress_open_rdp",       # precomputed — True = RDP open to 0.0.0.0/0
        "ingress_open_all",       # precomputed — True = all traffic open
        "egress_unrestricted",    # precomputed — True = all outbound allowed
    ],

    # ── RDSInstance ───────────────────────────────────────────────────────────
    # Cartography property names for RDS (confirmed from Cartography source).
    "RDSInstance": [
        "publicly_accessible",    # True  = publicly reachable (bad)
        "storage_encrypted",      # False = not encrypted (bad)
        "deletion_protection",    # False = not protected (bad)
        "multi_az",               # False = single-AZ (bad)
        "backup_retention_period",# 0     = no backups (bad — treated as 0)
    ],
}

SEVERITY_ORDER = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]


# ---------------------------------------------------------------------------
# GDS guard
# ---------------------------------------------------------------------------

def check_gds_available(session) -> bool:
    """Return True if the GDS plugin is installed and responsive."""
    try:
        session.run("CALL gds.list() YIELD name RETURN name LIMIT 1")
        return True
    except Exception as exc:
        logger.warning("[Graph Analytics] GDS not available: %s", exc)
        return False


# ---------------------------------------------------------------------------
# Graph projection
# ---------------------------------------------------------------------------

def project_cloud_graph(session, projection_name: str) -> None:
    """Create an in-memory GDS projection over the cloud graph.

    Uses wildcard '*' for both nodes and relationships so the projection
    succeeds regardless of which Cartography labels are present. Falls back
    gracefully if the graph is empty.
    """
    # Guard: if Neo4j is empty (Deep Scan hasn't run yet) raise early so
    # run_graph_analytics can return a clean error instead of a cryptic one.
    node_count = session.run("MATCH (n) RETURN count(n) AS c").single()["c"]
    if node_count == 0:
        raise ValueError(
            "Neo4j graph is empty. Run a Deep Scan first to populate the graph."
        )

    # Drop any stale projection first (ignore if it doesn't exist)
    session.run(f"CALL gds.graph.drop('{projection_name}', false)")

    # Wildcard projection — works with any node labels / relationship types
    # that Cartography has written, so it never fails due to missing labels.
    # We force UNDIRECTED orientation on all relationships because K-Core,
    # WCC, and Louvain all require undirected graphs.
    session.run(
        f"""
        CALL gds.graph.project(
            '{projection_name}',
            '*',
            {{
                __ALL__: {{
                    type: '*',
                    orientation: 'UNDIRECTED'
                }}
            }}
        )
        """
    )


# ---------------------------------------------------------------------------
# GDS algorithm runners — all use .write variants so scores persist on nodes
# ---------------------------------------------------------------------------

def run_pagerank(session, projection_name: str) -> None:
    session.run(
        f"""
        CALL gds.pageRank.write('{projection_name}', {{
            writeProperty: 'pagerank_score',
            maxIterations: 20,
            dampingFactor: 0.85
        }})
        """
    )


def run_betweenness(session, projection_name: str) -> None:
    session.run(
        f"""
        CALL gds.betweenness.write('{projection_name}', {{
            writeProperty: 'betweenness_score'
        }})
        """
    )


def run_louvain(session, projection_name: str) -> None:
    session.run(
        f"""
        CALL gds.louvain.write('{projection_name}', {{
            writeProperty: 'community_id'
        }})
        """
    )
    # Compute community_size by counting nodes per community and writing
    # the count back to each member node.
    session.run(
        """
        MATCH (n)
        WHERE n.community_id IS NOT NULL
        WITH n.community_id AS cid, count(*) AS sz
        MATCH (m) WHERE m.community_id = cid
        SET m.community_size = sz
        """
    )


def run_kcore(session, projection_name: str) -> None:
    session.run(
        f"""
        CALL gds.kcore.write('{projection_name}', {{
            writeProperty: 'core_value'
        }})
        """
    )


def run_wcc_and_bridge(session, projection_name: str) -> None:
    """Write component_id, then approximate bridge detection using pure Cypher."""
    session.run(
        f"""
        CALL gds.wcc.write('{projection_name}', {{
            writeProperty: 'component_id'
        }})
        """
    )
    # Bridge approximation: a node is a bridge candidate if it has at least
    # one neighbour in a different component.  No APOC required.
    session.run(
        """
        MATCH (n)
        WHERE n.component_id IS NOT NULL
        WITH n,
             [m IN [(n)--(x) | x]
              WHERE m.component_id IS NOT NULL
                AND m.component_id <> n.component_id] AS cross_neighbors
        SET n.is_bridge = (size(cross_neighbors) > 0)
        """
    )
    # Nodes that were not reached by WCC get is_bridge = false
    session.run(
        """
        MATCH (n) WHERE n.component_id IS NULL
        SET n.is_bridge = false
        """
    )


def run_internet_hops(session, projection_name: str) -> None:
    """Write hops_from_internet (shortest path from Internet node) to each node.

    Uses Cypher's built-in shortestPath (BFS) rather than per-node GDS Dijkstra
    because:
      - Works on every node regardless of which property (id / arn / ARN) is set
      - Single-pass BFS is O(V+E) vs O(V*(V+E)) for per-node Dijkstra
      - No GDS projection dependency — scores are written directly to the live graph
    """
    internet_exists = session.run(
        "MATCH (i:Internet) RETURN count(i) AS c"
    ).single()["c"]

    if not internet_exists:
        session.run(
            """
            MATCH (n) WHERE NOT n:Internet
            SET n.hops_from_internet = 99
            """
        )
        return

    # BFS shortest path from the Internet node to every other node.
    # OPTIONAL MATCH means unreachable nodes get p = NULL → set to 99.
    session.run(
        """
        MATCH (internet:Internet)
        MATCH (n) WHERE NOT n:Internet
        OPTIONAL MATCH p = shortestPath((internet)-[*]-(n))
        SET n.hops_from_internet = CASE
            WHEN p IS NULL THEN 99
            ELSE length(p)
        END
        """
    )


# ---------------------------------------------------------------------------
# Violation-feature similarity (shadow risk detection)
# ---------------------------------------------------------------------------

def precompute_sg_security_flags(session) -> None:
    """
    Cartography stores EC2SecurityGroup ingress/egress rules as separate
    IpPermission nodes whose IDs encode the group ID and direction:
        {sg_id}/IpPermissions/{rule}         — inbound
        {sg_id}/IpPermissionsEgress/{rule}   — outbound

    This function derives boolean security flags by checking those nodes and
    writes them directly onto EC2SecurityGroup nodes so run_violation_similarity
    can compare security posture across SGs without needing relationship traversal.

    Also works if Cartography uses fromport/toport/protocol properties directly
    on the IpPermission nodes (both approaches are attempted).
    """
    logger.info("[Shadow Risk] Precomputing EC2SecurityGroup security flags")

    # ingress_open_all — any inbound IpPermission node (not egress) exists
    # (conservative: existence of ANY inbound rule means the SG is not fully closed)
    # Use both ID-prefix matching AND relationship-based protocol check.
    session.run("""
        MATCH (sg:EC2SecurityGroup)
        OPTIONAL MATCH (perm)
        WHERE perm.id STARTS WITH (sg.id + '/IpPermissions/')
          AND NOT perm.id CONTAINS 'Egress'
          AND (
              perm.ip_protocol = '-1'
              OR perm.protocol  = '-1'
              OR (perm.fromport IS NULL AND perm.toport IS NULL)
              OR perm.id CONTAINS 'alltraffic'
              OR perm.id CONTAINS 'NoneNone'
          )
        WITH sg, count(perm) AS c
        SET sg.ingress_open_all = (c > 0)
    """)

    # egress_unrestricted — any outbound IpPermissionsEgress node exists
    session.run("""
        MATCH (sg:EC2SecurityGroup)
        OPTIONAL MATCH (perm)
        WHERE perm.id STARTS WITH (sg.id + '/IpPermissionsEgress/')
        WITH sg, count(perm) AS c
        SET sg.egress_unrestricted = (c > 0)
    """)

    # ingress_open_ssh — inbound IpPermission covering port 22
    session.run("""
        MATCH (sg:EC2SecurityGroup)
        OPTIONAL MATCH (perm)
        WHERE perm.id STARTS WITH (sg.id + '/IpPermissions/')
          AND NOT perm.id CONTAINS 'Egress'
          AND (
              perm.fromport = 22
              OR perm.from_port = 22
              OR perm.id CONTAINS 'tcp22'
              OR perm.id CONTAINS '2222'
          )
        WITH sg, count(perm) AS c
        SET sg.ingress_open_ssh = (c > 0)
    """)

    # ingress_open_rdp — inbound IpPermission covering port 3389
    session.run("""
        MATCH (sg:EC2SecurityGroup)
        OPTIONAL MATCH (perm)
        WHERE perm.id STARTS WITH (sg.id + '/IpPermissions/')
          AND NOT perm.id CONTAINS 'Egress'
          AND (
              perm.fromport = 3389
              OR perm.from_port = 3389
              OR perm.id CONTAINS 'tcp3389'
              OR perm.id CONTAINS '33893389'
          )
        WITH sg, count(perm) AS c
        SET sg.ingress_open_rdp = (c > 0)
    """)

    logger.info("[Shadow Risk] EC2SecurityGroup security flags written")


def _arn_to_short_id(arn: str) -> str:
    """
    Cartography stores short resource IDs on n.id, not full ARNs.
    e.g. arn:aws:ec2:r:a:security-group/sg-xxx  → sg-xxx
         arn:aws:s3:::bucket                     → bucket
    """
    parts = arn.split(":")
    if len(parts) < 6:
        return arn
    resource = parts[-1]
    if "/" in resource:
        return resource.split("/")[-1]
    return resource or arn


def run_violation_similarity(session, open_finding_arns: set) -> None:
    """
    For each resource type, compare unflagged nodes against flagged nodes
    (those whose ARN appears in open_finding_arns) using per-type security
    attribute lists.  If similarity >= 0.75, write shadow-risk properties to
    the unflagged Neo4j node.  Nothing is written to PostgreSQL.

    Cartography stores short IDs (sg-xxx, i-xxx) on n.id, not full ARNs,
    so we build a lookup that includes both the full ARN and short ID.
    """
    arns_list = list(open_finding_arns)

    # Build lookup set: full ARNs + extracted short IDs (covers all node types)
    short_ids = [_arn_to_short_id(a) for a in arns_list]
    all_lookup = list(set(arns_list) | set(short_ids))

    # Map short_id → original ARN so the matched_resource_arn written to Neo4j
    # is always the full Finding ARN (not a Cartography short ID).
    short_to_full: dict[str, str] = {}
    for arn in arns_list:
        short_to_full[arn] = arn
        short_to_full[_arn_to_short_id(arn)] = arn

    for resource_type, candidate_features in VIOLATION_FEATURES.items():

        # ── Dynamic feature discovery ────────────────────────────────────────
        # Cartography versions differ in which properties they write.
        # Check which of our candidate features actually exist on a sample node
        # before running the full comparison — avoids silent misses when the
        # property name has drifted between Cartography versions.
        sample = session.run(
            f"MATCH (n:{resource_type}) RETURN keys(n) AS props LIMIT 1"
        ).single()
        if not sample:
            logger.debug("[Shadow Risk] No nodes of type %s in graph", resource_type)
            continue
        actual_props = set(sample["props"])
        features = [f for f in candidate_features if f in actual_props]
        if not features:
            logger.warning(
                "[Shadow Risk] None of the candidate features %s exist on %s nodes. "
                "Actual properties: %s",
                candidate_features, resource_type, sorted(actual_props),
            )
            continue
        logger.debug("[Shadow Risk] %s: using features %s", resource_type, features)
        # ─────────────────────────────────────────────────────────────────────

        prop_returns = ", ".join([f"n.{f} AS {f}" for f in features])

        # Nodes that already have open findings (known-bad).
        # Exclude compound IDs (IpPermission sub-nodes) via NOT CONTAINS '/'.
        flagged_result = session.run(
            f"""
            MATCH (n:{resource_type})
            WHERE (n.id IN $lookup OR n.arn IN $lookup OR n.ARN IN $lookup)
              AND NOT (n.id IS NOT NULL AND n.id CONTAINS '/')
            RETURN
                coalesce(n.id, n.arn, n.ARN) AS node_id,
                {prop_returns}
            """,
            lookup=all_lookup,
        ).data()

        if not flagged_result:
            logger.debug("[Shadow Risk] No flagged nodes of type %s", resource_type)
            continue  # Nothing to compare against for this resource type

        # Nodes without any open finding (candidate shadow risks).
        unflagged_result = session.run(
            f"""
            MATCH (n:{resource_type})
            WHERE NOT (n.id IN $lookup OR n.arn IN $lookup OR n.ARN IN $lookup)
              AND (n.id IS NOT NULL OR n.arn IS NOT NULL)
              AND NOT (n.id IS NOT NULL AND n.id CONTAINS '/')
            RETURN
                coalesce(n.id, n.arn, n.ARN) AS node_id,
                {prop_returns}
            """,
            lookup=all_lookup,
        ).data()

        for clean in unflagged_result:
            best_score = 0.0
            best_match_id = ""
            best_attrs: list[str] = []

            for bad in flagged_result:
                matching: list[str] = []
                total_comparable = 0

                for feat in features:
                    cv = clean.get(feat)
                    bv = bad.get(feat)
                    if cv is not None and bv is not None:
                        total_comparable += 1
                        # Match when both nodes have the SAME value for this
                        # security attribute. This handles both directions:
                        #   False = insecure (e.g. default_encryption=False)
                        #   True  = insecure (e.g. anonymous_access=True)
                        # If the flagged node is bad in a certain way and the
                        # clean node shares that same characteristic, it is a
                        # shadow risk regardless of which value signals risk.
                        if cv == bv:
                            matching.append(feat)

                if total_comparable == 0:
                    continue

                score = len(matching) / total_comparable
                if score > best_score:
                    best_score = score
                    best_match_id = bad.get("node_id", "")
                    best_attrs = matching

            if best_score >= 0.75 and best_match_id:
                # Recover the full ARN for the matched flagged node
                best_match_full_arn = short_to_full.get(best_match_id, best_match_id)

                from api.models import Finding  # noqa: PLC0415

                matched_finding = (
                    Finding.objects.filter(
                        arn=best_match_full_arn,
                        status__in=["OPEN", "NEW"],
                    )
                    .order_by("-severity")
                    .first()
                )
                matched_rule = matched_finding.rule_id if matched_finding else ""

                node_id = clean.get("node_id", "")
                session.run(
                    f"""
                    MATCH (n:{resource_type})
                    WHERE n.id = $nid OR n.arn = $nid OR n.ARN = $nid
                    SET n.violation_similarity_score = $score,
                        n.matched_rule_id           = $rule_id,
                        n.matched_resource_arn      = $matched_arn,
                        n.matching_attributes       = $attrs
                    """,
                    {
                        "nid":         node_id,
                        "score":       best_score,
                        "rule_id":     matched_rule,
                        "matched_arn": best_match_full_arn,
                        "attrs":       best_attrs,
                    },
                )


# ---------------------------------------------------------------------------
# Severity adjustment (computed on the fly — never written to PostgreSQL)
# ---------------------------------------------------------------------------

def compute_adjusted_severity(
    base_severity: str, graph_scores: dict
) -> tuple[str, list[str]]:
    """
    Return (adjusted_severity_str, [escalation_reason, ...]).

    base_severity must be one of: LOW, MEDIUM, HIGH, CRITICAL, INFO.
    INFO is treated as LOW for escalation purposes.
    """
    safe_base = base_severity if base_severity in SEVERITY_ORDER else "LOW"
    idx = SEVERITY_ORDER.index(safe_base)
    reasons: list[str] = []

    if graph_scores.get("pagerank_score", 0) > 0.7:
        idx += 1
        reasons.append("high_centrality")
    if graph_scores.get("betweenness_score", 0) > 500:
        idx += 1
        reasons.append("chokepoint")
    if graph_scores.get("hops_from_internet", 99) <= 2:
        idx += 1
        reasons.append("internet_exposed")
    if graph_scores.get("community_size", 0) > 5:
        idx += 1
        reasons.append("large_blast_radius")
    if graph_scores.get("core_value", 0) >= 3:
        idx += 1
        reasons.append("dense_zone")
    if graph_scores.get("is_bridge", False):
        idx += 1
        reasons.append("bridge_node")

    adjusted = SEVERITY_ORDER[min(idx, len(SEVERITY_ORDER) - 1)]
    return adjusted, reasons


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def run_graph_analytics(
    neo4j_driver,
    provider_id: str,
    deep_scan_id: str,
) -> dict:
    """
    Called from the Deep Scan Celery task and from the manual-run Celery task.

    Returns a summary dict.  NEVER raises an exception — all failures are
    captured and returned as {'error': '...'}.
    """
    empty_result = {
        "high_risk_nodes_count": 0,
        "escalated_findings_count": 0,
        "shadow_risks_count": 0,
        "timestamp": datetime.utcnow().isoformat(),
        "error": None,
    }

    try:
        projection_name = f"cloud-graph-{provider_id}"

        with neo4j_driver.session() as session:

            # Guard: abort cleanly if GDS is not installed
            if not check_gds_available(session):
                empty_result["error"] = "GDS_NOT_AVAILABLE"
                return empty_result

            logger.info("[Graph Analytics] Starting for provider %s", provider_id)

            # Step A: Create in-memory graph projection
            project_cloud_graph(session, projection_name)
            logger.info("[Graph Analytics] Graph projected")

            # Step B: Run algorithms — scores are written back to Neo4j nodes
            run_pagerank(session, projection_name)
            logger.info("[Graph Analytics] PageRank complete")

            run_betweenness(session, projection_name)
            logger.info("[Graph Analytics] Betweenness complete")

            run_louvain(session, projection_name)
            logger.info("[Graph Analytics] Louvain complete")

            run_kcore(session, projection_name)
            logger.info("[Graph Analytics] K-Core complete")

            run_wcc_and_bridge(session, projection_name)
            logger.info("[Graph Analytics] WCC + bridge complete")

            run_internet_hops(session, projection_name)
            logger.info("[Graph Analytics] Internet hops complete")

            # Drop projection — scores are now persisted on nodes
            session.run(f"CALL gds.graph.drop('{projection_name}', false)")
            logger.info("[Graph Analytics] Projection dropped")

            # Step C: Fetch open finding ARNs from PostgreSQL
            from api.models import Finding  # noqa: PLC0415

            open_arns: set[str] = set(
                Finding.objects.filter(
                    provider_id=provider_id,
                    status__in=["OPEN", "NEW"],
                ).values_list("arn", flat=True)
            )
            logger.info("[Graph Analytics] %d open finding ARNs", len(open_arns))

            # Step D: Pre-compute SG security flags from IpPermission nodes,
            # then run violation-feature similarity → shadow risks written to Neo4j
            precompute_sg_security_flags(session)
            run_violation_similarity(session, open_arns)
            logger.info("[Graph Analytics] Violation similarity complete")

            # Step E: Compute summary counts for the return value
            arns_list = list(open_arns)

            high_risk_count = session.run(
                """
                MATCH (n)
                WHERE (n.id IN $arns OR n.arn IN $arns OR n.ARN IN $arns)
                  AND n.pagerank_score IS NOT NULL
                RETURN count(n) AS c
                """,
                arns=arns_list,
            ).single()["c"]

            shadow_risk_count = session.run(
                """
                MATCH (n)
                WHERE n.violation_similarity_score >= 0.75
                  AND NOT (n.id IN $arns OR n.arn IN $arns OR n.ARN IN $arns)
                RETURN count(n) AS c
                """,
                arns=arns_list,
            ).single()["c"]

            logger.info("[Graph Analytics] Complete")

            return {
                "high_risk_nodes_count": high_risk_count,
                "escalated_findings_count": 0,  # computed at API read time
                "shadow_risks_count": shadow_risk_count,
                "timestamp": datetime.utcnow().isoformat(),
                "error": None,
            }

    except Exception as exc:
        logger.error("[Graph Analytics] Failed: %s", exc, exc_info=True)
        empty_result["error"] = str(exc)
        return empty_result


# ---------------------------------------------------------------------------
# Celery task for on-demand (manual) runs via POST /graph-intelligence/run/
# ---------------------------------------------------------------------------

def run_graph_analytics_task(provider_id: str, deep_scan_id: str) -> dict:
    """
    Celery-friendly wrapper.  Builds a fresh Neo4j driver from Django settings
    and calls run_graph_analytics().  Registered below as a Celery task so
    the API can dispatch it asynchronously.
    """
    from django.conf import settings

    from tasks.jobs.deep_scan.utils import _get_or_create_driver

    driver = _get_or_create_driver(
        settings.NEO4J_SHARED_URI,
        (settings.NEO4J_SHARED_USER, settings.NEO4J_SHARED_PASSWORD),
    )
    return run_graph_analytics(
        neo4j_driver=driver,
        provider_id=provider_id,
        deep_scan_id=deep_scan_id,
    )


# Register as a Celery task on the deep_scan queue so it can be dispatched
# via .apply_async() from the REST API.
try:
    from cloudsecure.celery import app as _celery_app

    run_graph_analytics_task = _celery_app.task(
        name="tasks.jobs.deep_scan.graph_analytics.run_graph_analytics_task",
        bind=False,
        max_retries=0,
        acks_late=True,
        queue="deep_scan",
    )(run_graph_analytics_task)
except Exception:
    # If the Celery app is not available (e.g. during unit tests), keep the
    # plain function — callers that need the task interface will handle it.
    pass
