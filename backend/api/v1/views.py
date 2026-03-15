from django.contrib.auth import authenticate
import json
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from api.models import Finding, InventoryRun
from api.serializers import FindingSerializer
from providers.models import Provider
from tasks.jobs.inventory.neo4j_writer import get_neo4j_driver


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        if not username or not password:
            return Response(
                {"detail": "username and password required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response(
                {"detail": "Invalid credentials"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            "token": token.key,
            "user": {
                "id": user.id,
                "email": getattr(user, "email", "") or user.username,
                "username": user.username,
            },
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            request.user.auth_token.delete()
        except Exception:
            pass
        return Response(status=status.HTTP_200_OK)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        tenant_id = None
        if hasattr(user, "profile") and user.profile.tenant_id:
            tenant_id = user.profile.tenant_id
        return Response({
            "id": user.id,
            "email": getattr(user, "email", "") or user.username,
            "username": user.username,
            "tenant_id": tenant_id,
        })


def _short_label_from_arn(arn: str) -> str:
    if not arn:
        return ""
    if ":::" in arn:
        return arn.split(":::")[-1]
    parts = arn.split("/")
    return parts[-1] if parts else arn


class InventorySummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, provider_id: int):
        tenant = request.user.profile.tenant
        provider = get_object_or_404(Provider, id=provider_id, tenant=tenant)
        account_id = provider.aws_account_id

        by_type: dict[str, int] = {}
        total_resources = 0
        active_resources = 0
        deleted_resources = 0

        driver = get_neo4j_driver()
        try:
            with driver.session() as session:
                rows = session.run(
                    """
                    MATCH (r:Resource)-[:BELONGS_TO]->(a:AWSAccount {account_id: $account_id})
                    RETURN r.type AS type, r.status AS status, count(r) AS count
                    """,
                    account_id=account_id,
                )
                for row in rows:
                    r_type = row.get("type") or "unknown"
                    r_status = row.get("status") or "UNKNOWN"
                    c = int(row.get("count") or 0)
                    by_type[r_type] = by_type.get(r_type, 0) + c
                    total_resources += c
                    if r_status == "ACTIVE":
                        active_resources += c
                    elif r_status == "DELETED":
                        deleted_resources += c
        except Exception:
            # Empty graph or Neo4j down: return zeros, never crash dashboard.
            by_type = {}
            total_resources = 0
            active_resources = 0
            deleted_resources = 0

        last_run = (
            InventoryRun.objects.filter(provider=provider)
            .order_by("-started_at")
            .first()
        )
        last_run_payload = None
        if last_run:
            last_run_payload = {
                "state": last_run.state,
                "started_at": last_run.started_at,
                "completed_at": last_run.completed_at,
                "stats": last_run.stats or {},
            }

        return Response(
            {
                "total_resources": total_resources,
                "by_type": by_type,
                "active_resources": active_resources,
                "deleted_resources": deleted_resources,
                "last_run": last_run_payload,
            }
        )


class GraphDataView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, provider_id: int):
        tenant = request.user.profile.tenant
        provider = get_object_or_404(Provider, id=provider_id, tenant=tenant)
        account_id = provider.aws_account_id

        type_filter = request.query_params.get("type")
        status_filter = request.query_params.get("status")

        driver = get_neo4j_driver()

        nodes: dict[str, dict] = {}
        edges: list[dict] = []

        # Always include account root node.
        nodes[account_id] = {
            "id": account_id,
            "label": account_id,
            "type": "AWSAccount",
            "region": "global",
            "status": "ACTIVE",
            "account_id": account_id,
            "properties": {},
        }

        params = {
            "account_id": account_id,
            "type": type_filter,
            "status": status_filter,
        }

        try:
            with driver.session() as session:
                # Nodes (resources + account)
                result = session.run(
                    """
                    MATCH (r:Resource)-[:BELONGS_TO]->(a:AWSAccount {account_id: $account_id})
                    WHERE ($type IS NULL OR r.type = $type)
                      AND ($status IS NULL OR r.status = $status)
                    RETURN r, a
                    """,
                    **params,
                )
                for row in result:
                    r = row.get("r")
                    if not r:
                        continue
                    arn = r.get("arn")
                    if not arn:
                        continue

                    config_raw = r.get("config") or ""
                    try:
                        properties = json.loads(config_raw) if config_raw else {}
                        if not isinstance(properties, dict):
                            properties = {}
                    except Exception:
                        properties = {}

                    nodes[arn] = {
                        "id": arn,
                        "label": _short_label_from_arn(arn),
                        "type": r.get("type"),
                        "region": r.get("region"),
                        "status": r.get("status") or "UNKNOWN",
                        "account_id": account_id,
                        "properties": properties,
                    }

                # BELONGS_TO edges
                for node_id, node in list(nodes.items()):
                    if node.get("type") == "AWSAccount":
                        continue
                    edges.append(
                        {
                            "id": f"edge-belongs-{node_id}",
                            "source": node_id,
                            "target": account_id,
                            "relationship": "BELONGS_TO",
                        }
                    )

                # Other edges
                rel_rows = session.run(
                    """
                    MATCH (r:Resource)-[:BELONGS_TO]->(a:AWSAccount {account_id: $account_id})
                    WHERE ($type IS NULL OR r.type = $type)
                      AND ($status IS NULL OR r.status = $status)
                    MATCH (r)-[rel]->(target)
                    WHERE r.arn STARTS WITH 'arn:aws'
                    RETURN r.arn AS source,
                           coalesce(target.arn, target.account_id, target.vpc_id, target.group_id) AS target,
                           type(rel) AS relationship
                    """,
                    **params,
                )
                i = 0
                for row in rel_rows:
                    source = row.get("source")
                    target = row.get("target")
                    relationship = row.get("relationship")
                    if not source or not target or not relationship:
                        continue
                    edges.append(
                        {
                            "id": f"edge-{i}",
                            "source": source,
                            "target": target,
                            "relationship": relationship,
                        }
                    )
                    i += 1

        except Exception:
            # Empty graph or Neo4j down: return minimal shape.
            return Response({"nodes": [], "edges": []})

        return Response({"nodes": list(nodes.values()), "edges": edges})


# --- Findings (Rule Engine) ---

class ProviderFindingsListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, provider_id: int):
        tenant = request.user.profile.tenant
        provider = get_object_or_404(Provider, id=provider_id, tenant=tenant)
        qs = Finding.objects.filter(tenant=tenant, provider=provider)
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        severity_filter = request.query_params.get("severity")
        if severity_filter:
            qs = qs.filter(severity=severity_filter)
        resource_type_filter = request.query_params.get("resource_type")
        if resource_type_filter:
            qs = qs.filter(resource_type=resource_type_filter)
        qs = qs.order_by("-last_seen")

        from rest_framework.pagination import PageNumberPagination
        paginator = PageNumberPagination()
        paginator.page_size = 50
        page = paginator.paginate_queryset(qs, request)
        serializer = FindingSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class ProviderFindingsSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, provider_id: int):
        tenant = request.user.profile.tenant
        provider = get_object_or_404(Provider, id=provider_id, tenant=tenant)
        qs = Finding.objects.filter(tenant=tenant, provider=provider, status="OPEN")
        total_open = qs.count()
        from django.db.models import Count
        by_severity = dict(qs.values("severity").annotate(c=Count("id")).values_list("severity", "c"))
        by_resource_type = dict(qs.values("resource_type").annotate(c=Count("id")).values_list("resource_type", "c"))
        frameworks = {}
        for f in qs.values_list("compliance_frameworks", flat=True):
            if isinstance(f, list):
                for x in f:
                    if isinstance(x, str):
                        frameworks[x] = frameworks.get(x, 0) + 1
        last_run = InventoryRun.objects.filter(provider=provider).order_by("-started_at").first()
        new_this_run = 0
        if last_run:
            new_this_run = Finding.objects.filter(tenant=tenant, provider=provider, inventory_run=last_run).count()
        return Response({
            "total_open": total_open,
            "by_severity": by_severity,
            "by_resource_type": by_resource_type,
            "by_framework": frameworks,
            "new_this_run": new_this_run,
        })


class FindingSuppressView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, id: int):
        tenant = request.user.profile.tenant
        finding = get_object_or_404(Finding, id=id, tenant=tenant)
        finding.status = "SUPPRESSED"
        finding.save(update_fields=["status"])
        return Response(status=status.HTTP_200_OK)
