# CloudSecure India compliance — EC2 (DPDP 2023, CERT-In 2022, RBI)
# Same resource types as cis_aws_ec2; India-specific mappings and severity.

package cloudsecure.rules.india_aws_ec2

import future.keywords.in

default allow = true

# ---------------------------------------------------------------------------
# CERT-In 2022: Unrestricted SSH/RDP from internet
# ---------------------------------------------------------------------------
deny[msg] {
	input.asset.asset_type == "security_group"
	input.asset.allows_ssh
	msg := {
		"rule_id": "CERT-In-EC2-SSH",
		"issue": sprintf("Security group '%v' allows SSH from internet — CERT-In 2022 requires restricting administrative access", [input.asset.group_id]),
		"severity": "HIGH",
		"framework": "CERT-In 2022",
		"section": "Network Security",
		"status": "FAIL",
		"compliance": ["CERT-In 2022", "DPDP 2023", "RBI"],
		"remediation": "aws ec2 revoke-security-group-ingress --group-id " + input.asset.group_id + " --protocol tcp --port 22 --cidr 0.0.0.0/0",
	}
}

deny[msg] {
	input.asset.asset_type == "security_group"
	input.asset.allows_rdp
	msg := {
		"rule_id": "CERT-In-EC2-RDP",
		"issue": sprintf("Security group '%v' allows RDP from internet — CERT-In 2022 requires restricting administrative access", [input.asset.group_id]),
		"severity": "HIGH",
		"framework": "CERT-In 2022",
		"section": "Network Security",
		"status": "FAIL",
		"compliance": ["CERT-In 2022", "DPDP 2023", "RBI"],
		"remediation": "aws ec2 revoke-security-group-ingress --group-id " + input.asset.group_id + " --protocol tcp --port 3389 --cidr 0.0.0.0/0",
	}
}

# ---------------------------------------------------------------------------
# DPDP / CERT-In: All ports open to internet
# ---------------------------------------------------------------------------
deny[msg] {
	input.asset.asset_type == "security_group"
	input.asset.allows_all_ingress
	msg := {
		"rule_id": "DPDP-EC2-OPEN-SG",
		"issue": sprintf("Security group '%v' allows all inbound traffic from internet — violates data protection and CERT-In guidance", [input.asset.group_id]),
		"severity": "CRITICAL",
		"framework": "DPDP Act 2023",
		"section": "Section 8 - Security",
		"status": "FAIL",
		"compliance": ["DPDP 2023 S.8", "CERT-In 2022", "RBI"],
		"remediation": "Revoke all ingress rules from 0.0.0.0/0 and ::/0; allow only required ports from trusted CIDRs",
	}
}

# ---------------------------------------------------------------------------
# EC2 instance: public IP (data residency / exposure)
# ---------------------------------------------------------------------------
deny[msg] {
	input.asset.asset_type == "ec2_instance"
	input.asset.has_public_ip
	msg := {
		"rule_id": "DPDP-EC2-PUBLIC-IP",
		"issue": sprintf("EC2 instance '%v' has a public IP — limit exposure for DPDP and CERT-In compliance", [input.asset.instance_id]),
		"severity": severity_india_public_ip,
		"framework": "DPDP Act 2023",
		"section": "Section 8 - Security",
		"status": "FAIL",
		"compliance": ["DPDP 2023 S.8", "CERT-In 2022"],
		"remediation": "Use private subnet and disable auto-assign public IP; use SSM Session Manager or VPN for access",
	}
}

severity_india_public_ip := "HIGH" {
	input.asset.tags["environment"] == "production"
} else := "MEDIUM"

# ---------------------------------------------------------------------------
# IMDSv2 (CERT-In: secure configuration)
# ---------------------------------------------------------------------------
deny[msg] {
	input.asset.asset_type == "ec2_instance"
	not input.asset.imdsv2_required
	msg := {
		"rule_id": "CERT-In-EC2-IMDS",
		"issue": sprintf("EC2 instance '%v' does not require IMDSv2 — CERT-In recommends secure metadata access", [input.asset.instance_id]),
		"severity": "HIGH",
		"framework": "CERT-In 2022",
		"section": "Secure Configuration",
		"status": "FAIL",
		"compliance": ["CERT-In 2022", "DPDP 2023"],
		"remediation": "aws ec2 modify-instance-metadata-options --instance-id " + input.asset.instance_id + " --http-tokens required --http-put-response-hop-limit 2",
	}
}

# ---------------------------------------------------------------------------
# High-risk ports (DB/management) from internet — CERT-In
# ---------------------------------------------------------------------------
deny[msg] {
	input.asset.asset_type == "security_group"
	input.asset.allows_high_risk_ports
	msg := {
		"rule_id": "CERT-In-EC2-DB-PORTS",
		"issue": sprintf("Security group '%v' exposes database or management ports to internet — CERT-In 2022 requires network segmentation", [input.asset.group_id]),
		"severity": "HIGH",
		"framework": "CERT-In 2022",
		"section": "Network Security",
		"status": "FAIL",
		"compliance": ["CERT-In 2022", "RBI", "DPDP 2023"],
		"remediation": "Revoke ingress for MySQL (3306), PostgreSQL (5432), Redis (6379), MSSQL (1433), MongoDB (27017) from 0.0.0.0/0",
	}
}
