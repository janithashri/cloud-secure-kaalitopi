# CloudSecure India compliance — KMS (DPDP 2023, CERT-In 2022, RBI)
# Same resource type as cis_aws_kms; India-specific mappings.

package cloudsecure.rules.india_aws_kms

import future.keywords.in

default allow = true

# ---------------------------------------------------------------------------
# DPDP / RBI: KMS key policy must not allow public or external access
# ---------------------------------------------------------------------------
deny[msg] {
	input.asset.asset_type == "kms_key"
	input.asset.key_policy_public_or_external
	msg := {
		"rule_id": "DPDP-KMS-POLICY",
		"issue": sprintf("KMS key '%v' allows public or cross-account access — DPDP and RBI require strict key access control", [input.asset.key_id]),
		"severity": "CRITICAL",
		"framework": "DPDP Act 2023",
		"section": "Section 8 - Security",
		"status": "FAIL",
		"compliance": ["DPDP 2023 S.8", "RBI", "CERT-In 2022"],
		"remediation": "aws kms put-key-policy --key-id " + input.asset.key_id + " --policy-name default --policy '{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"AWS\":\"arn:aws:iam::<account_id>:root\"},\"Action\":\"kms:*\",\"Resource\":\"*\"}]}'",
	}
}

# ---------------------------------------------------------------------------
# RBI: CMK rotation
# ---------------------------------------------------------------------------
deny[msg] {
	input.asset.asset_type == "kms_key"
	input.asset.key_manager == "CUSTOMER"
	input.asset.key_state == "Enabled"
	not input.asset.rotation_enabled
	msg := {
		"rule_id": "RBI-KMS-ROTATE",
		"issue": sprintf("KMS customer managed key '%v' does not have automatic rotation — RBI recommends key rotation", [input.asset.key_id]),
		"severity": "HIGH",
		"framework": "RBI Cyber Security Framework",
		"section": "Cryptographic Controls",
		"status": "FAIL",
		"compliance": ["RBI", "CERT-In 2022", "DPDP 2023"],
		"remediation": "aws kms enable-key-rotation --key-id " + input.asset.key_id,
	}
}

# ---------------------------------------------------------------------------
# CERT-In: Key pending deletion
# ---------------------------------------------------------------------------
deny[msg] {
	input.asset.asset_type == "kms_key"
	input.asset.key_state == "PendingDeletion"
	msg := {
		"rule_id": "CERT-In-KMS-DELETE",
		"issue": sprintf("KMS key '%v' is in PendingDeletion state — ensure this is intentional per CERT-In key management", [input.asset.key_id]),
		"severity": "CRITICAL",
		"framework": "CERT-In 2022",
		"section": "Key Management",
		"status": "FAIL",
		"compliance": ["CERT-In 2022", "RBI", "DPDP 2023"],
		"remediation": "aws kms cancel-key-deletion --key-id " + input.asset.key_id,
	}
}
