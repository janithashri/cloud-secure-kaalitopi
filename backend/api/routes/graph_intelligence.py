"""
Graph Intelligence REST API views.

GET  /api/v1/providers/{provider_id}/graph-intelligence/
     Returns high-risk nodes (with adjusted severities) and shadow risks.

POST /api/v1/providers/{provider_id}/graph-intelligence/run/
     Dispatches a Celery task to run graph analytics on-demand.
"""

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import DeepScan, DeepScanStateChoices, Finding
from providers.models import Provider
from tasks.jobs.deep_scan.graph_analytics import compute_adjusted_severity


def _get_neo4j_driver():
    """Return a shared Neo4j driver built from Django settings."""
    from tasks.jobs.deep_scan.utils import _get_or_create_driver

    return _get_or_create_driver(
        settings.NEO4J_SHARED_URI,
        (settings.NEO4J_SHARED_USER, settings.NEO4J_SHARED_PASSWORD),
    )


def _neo4j_session():
    """Context-manager-compatible helper: return a new Neo4j session."""
    driver = _get_neo4j_driver()
    database = getattr(settings, "NEO4J_SHARED_DATABASE", "neo4j")
    return driver.session(database=database)


def _extract_resource_id(arn: str) -> str:
    """
    Derive the short resource ID that Cartography stores as n.id.

    Cartography does NOT store full ARNs on most node types — it stores
    the short service-specific ID:
      arn:aws:ec2:r:a:security-group/sg-0abc123  → sg-0abc123
      arn:aws:ec2:r:a:instance/i-0abc123         → i-0abc123
      arn:aws:iam::a:role/MyRole                 → MyRole
      arn:aws:s3:::my-bucket                     → my-bucket
                                                   (S3Bucket.id = bucket name)

    For S3, Cartography also stores the full ARN as n.arn, so both the
    short name and the full ARN are returned in the lookup set.
    """
    parts = arn.split(":")
    if len(parts) < 6:
        return arn
    resource = parts[-1]           # last colon-separated segment
    if "/" in resource:
        return resource.split("/")[-1]   # take only the final path component
    return resource or arn


def _build_id_to_arn_map(arns: list[str]) -> dict[str, str]:
    """
    Return a dict that maps every lookup key (short ID AND full ARN) back
    to the original full ARN, so we can recover the ARN after a Neo4j match.
    """
    mapping: dict[str, str] = {}
    for arn in arns:
        mapping[arn] = arn                        # full ARN → itself (S3, some IAM)
        short_id = _extract_resource_id(arn)
        if short_id != arn:
            mapping[short_id] = arn               # sg-xxx → full ARN
    return mapping


class GraphIntelligenceView(APIView):
    """
    GET  — read graph-intelligence results from Neo4j.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, provider_id: int):
        tenant = request.user.profile.tenant
        get_object_or_404(Provider, id=provider_id, tenant=tenant)

        # ------------------------------------------------------------------
        # 1. Fetch open findings from PostgreSQL
        # ------------------------------------------------------------------
        findings_qs = Finding.objects.filter(
            provider_id=provider_id,
            status__in=["OPEN", "NEW"],
        ).values("arn", "severity", "rule_id", "rule_name", "resource_type")

        arn_to_finding: dict[str, dict] = {f["arn"]: f for f in findings_qs}
        arns_list = list(arn_to_finding.keys())

        # Build a two-way lookup: short Cartography ID ↔ original finding ARN
        id_to_arn = _build_id_to_arn_map(arns_list)
        lookup_keys = list(id_to_arn.keys())   # both short IDs and full ARNs

        # ------------------------------------------------------------------
        # 2. Query Neo4j for high-risk nodes
        # ------------------------------------------------------------------
        high_risk_nodes = []
        shadow_risks = []
        gds_available = False
        last_run_timestamp = None

        try:
            with _neo4j_session() as session:
                # Check GDS availability explicitly and independently of data
                try:
                    session.run("CALL gds.list() YIELD name RETURN name LIMIT 1")
                    gds_available = True
                except Exception:
                    gds_available = False

                # -------------------------------------------------------
                # High-risk nodes: match by short Cartography ID OR full ARN.
                #
                # Key design decisions:
                #  • Match on n.id (Cartography primary key) first, then
                #    n.arn / n.ARN (S3Bucket and some IAM nodes set these).
                #  • Exclude Cartography sub-nodes (IpPermission, IpRule,
                #    NetworkInterface, etc.) that have compound IDs
                #    containing '/'.  These get GDS scores but are not AWS
                #    resources we want to surface.
                #  • Return n.id so we can recover the original ARN via
                #    id_to_arn mapping.
                # -------------------------------------------------------
                neo4j_nodes = session.run(
                    """
                    MATCH (n)
                    WHERE (
                        n.id   IN $lookup_keys OR
                        n.arn  IN $lookup_keys OR
                        n.ARN  IN $lookup_keys
                    )
                      AND n.pagerank_score IS NOT NULL
                      AND NOT (n.id IS NOT NULL AND n.id CONTAINS '/')
                    RETURN
                        coalesce(n.id, n.arn, n.ARN)       AS node_id,
                        labels(n)[0]                        AS label,
                        coalesce(n.pagerank_score,    0.0)  AS pagerank_score,
                        coalesce(n.betweenness_score, 0.0)  AS betweenness_score,
                        coalesce(n.hops_from_internet, 99)  AS hops_from_internet,
                        coalesce(n.community_size,    0)    AS community_size,
                        coalesce(n.core_value,        0)    AS core_value,
                        coalesce(n.is_bridge,         false) AS is_bridge
                    """,
                    lookup_keys=lookup_keys,
                ).data()

                for node in neo4j_nodes:
                    node_id = node.get("node_id", "")

                    # Recover the original finding ARN from the short ID
                    original_arn = id_to_arn.get(node_id, node_id)
                    finding = arn_to_finding.get(original_arn, {})

                    # Fall back: try node_id directly as ARN (covers S3/IAM)
                    if not finding:
                        finding = arn_to_finding.get(node_id, {})
                        if finding:
                            original_arn = node_id

                    original_severity = finding.get("severity", "LOW")

                    graph_scores = {
                        "pagerank_score":     node.get("pagerank_score",    0.0),
                        "betweenness_score":  node.get("betweenness_score", 0.0),
                        "hops_from_internet": node.get("hops_from_internet", 99),
                        "community_size":     node.get("community_size",    0),
                        "core_value":         node.get("core_value",        0),
                        "is_bridge":          node.get("is_bridge",         False),
                    }

                    adjusted_severity, escalation_reasons = compute_adjusted_severity(
                        original_severity, graph_scores
                    )

                    high_risk_nodes.append({
                        "arn":                     original_arn,
                        "resource_type":           finding.get("resource_type")
                                                   or node.get("label", ""),
                        "original_severity":       original_severity,
                        "graph_adjusted_severity": adjusted_severity,
                        "escalation_reasons":      escalation_reasons,
                        "pagerank_score":          node.get("pagerank_score",    0.0),
                        "betweenness_score":       node.get("betweenness_score", 0.0),
                        "hops_from_internet":      node.get("hops_from_internet", 99),
                        "community_size":          node.get("community_size",    0),
                        "core_value":              node.get("core_value",        0),
                        "is_bridge":               node.get("is_bridge",         False),
                        "rule_id":                 finding.get("rule_id",   ""),
                        "rule_name":               finding.get("rule_name", ""),
                    })

                # -------------------------------------------------------
                # Shadow risks: nodes NOT in open-findings but with high
                # violation similarity score.  Same compound-ID exclusion.
                # -------------------------------------------------------
                shadow_rows = session.run(
                    """
                    MATCH (n)
                    WHERE n.violation_similarity_score >= 0.75
                      AND NOT (
                          n.id   IN $lookup_keys OR
                          n.arn  IN $lookup_keys OR
                          n.ARN  IN $lookup_keys
                      )
                      AND NOT (n.id IS NOT NULL AND n.id CONTAINS '/')
                    RETURN
                        coalesce(n.id, n.arn, n.ARN)              AS node_id,
                        labels(n)[0]                               AS label,
                        n.violation_similarity_score               AS violation_similarity_score,
                        coalesce(n.matched_rule_id, '')            AS matched_rule_id,
                        coalesce(n.matched_resource_arn, '')       AS matched_resource_arn,
                        coalesce(n.matching_attributes, [])        AS matching_attributes
                    """,
                    lookup_keys=lookup_keys,
                ).data()

                for row in shadow_rows:
                    shadow_risks.append({
                        "arn":                       row.get("node_id", ""),
                        "resource_type":             row.get("label", ""),
                        "violation_similarity_score": row.get("violation_similarity_score", 0),
                        "matched_rule_id":           row.get("matched_rule_id",      ""),
                        "matched_resource_arn":      row.get("matched_resource_arn", ""),
                        "matching_attributes":       row.get("matching_attributes",  []),
                    })

                # Last run from most recently completed Deep Scan
                last_scan = (
                    DeepScan.objects.filter(
                        provider_id=provider_id,
                        tenant=tenant,
                        state=DeepScanStateChoices.COMPLETED,
                    )
                    .order_by("-completed_at")
                    .first()
                )
                if last_scan and last_scan.completed_at:
                    last_run_timestamp = last_scan.completed_at.isoformat()

        except Exception as exc:
            gds_available = False
            import logging
            logging.getLogger(__name__).warning(
                "[Graph Intelligence API] Neo4j read failed: %s", exc
            )

        # ------------------------------------------------------------------
        # 3. Build summary
        # ------------------------------------------------------------------
        escalated = [
            n for n in high_risk_nodes
            if n["graph_adjusted_severity"] != n["original_severity"]
        ]

        most_dangerous_arn = ""
        if high_risk_nodes:
            candidates = escalated if escalated else high_risk_nodes
            most_dangerous_arn = max(
                candidates, key=lambda n: n["pagerank_score"]
            )["arn"]

        summary = {
            "total_high_risk_nodes": len(high_risk_nodes),
            "total_escalated":       len(escalated),
            "total_shadow_risks":    len(shadow_risks),
            "most_dangerous_node_arn": most_dangerous_arn,
            "gds_available":         gds_available,
            "last_run_timestamp":    last_run_timestamp,
        }

        return Response({
            "high_risk_nodes": high_risk_nodes,
            "shadow_risks":    shadow_risks,
            "summary":         summary,
        })


class GraphIntelligenceRunView(APIView):
    """
    POST — dispatch a Celery task to run graph analytics on-demand.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, provider_id: int):
        tenant = request.user.profile.tenant
        get_object_or_404(Provider, id=provider_id, tenant=tenant)

        last_scan = (
            DeepScan.objects.filter(
                provider_id=provider_id,
                tenant=tenant,
                state=DeepScanStateChoices.COMPLETED,
            )
            .order_by("-completed_at")
            .first()
        )
        if last_scan is None:
            return Response(
                {"error": "No completed Deep Scan found for provider"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from tasks.jobs.deep_scan.graph_analytics import run_graph_analytics_task

        task = run_graph_analytics_task.apply_async(
            kwargs={
                "provider_id":  str(provider_id),
                "deep_scan_id": str(last_scan.scan_id),
            },
            queue="deep_scan",
        )

        return Response({"status": "started", "task_id": task.id})
