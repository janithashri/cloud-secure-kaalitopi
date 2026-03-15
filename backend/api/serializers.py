from rest_framework import serializers
from api.models import Finding, InventoryRun


class InventoryRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryRun
        fields = ["id", "state", "started_at", "completed_at", "stats"]


class FindingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Finding
        fields = [
            "id",
            "arn",
            "resource_type",
            "region",
            "rule_id",
            "rule_name",
            "severity",
            "status",
            "compliance_frameworks",
            "remediation_steps",
            "first_seen",
            "last_seen",
        ]
