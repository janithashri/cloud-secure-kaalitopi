from rest_framework import serializers
from api.models import CustomRule, Finding, InventoryRun, ResourceConfig
from .models import IaCFinding


class IaCFindingSerializer(serializers.ModelSerializer):
   
    description = serializers.CharField(source='rule_description')
    suggested_fix = serializers.CharField(source='ai_remediation')

    class Meta:
        model = IaCFinding
        fields = ['id', 'repository_url', 'file_path', 'line_number', 
                  'resource_id', 'rule_id', 'description', 'severity', 
                  'suggested_fix', 'is_remediated', 'created_at']
    
class InventoryRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryRun
        fields = ["id", "state", "started_at", "completed_at", "stats"]


class FindingSerializer(serializers.ModelSerializer):
    resource_config = serializers.SerializerMethodField()

    def get_resource_config(self, obj):
        rc = ResourceConfig.objects.filter(account_id=obj.account_id, arn=obj.arn).first()
        return rc.config if rc else None

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
            "resource_config",
            "first_seen",
            "last_seen",
        ]


class CustomRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomRule
        fields = [
            "id",
            "name",
            "resource_type",
            "rule_id",
            "severity",
            "compliance_frameworks",
            "description",
            "rego_policy",
            "enabled",
            "provider",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
