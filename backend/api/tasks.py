


import os
import json
import uuid
import stat
import shutil
import subprocess
from pathlib import Path
from celery import shared_task
from celery.utils.log import get_task_logger
from django.contrib.auth.models import User
from api.models import IaCFinding
from .ai_utils import get_sarvam_remediation

# Initialize Logger
logger = get_task_logger(__name__)

def handle_remove_readonly(func, path, exc_info):
    """Windows fix for deleting .git files"""
    os.chmod(path, stat.S_IWRITE)
    func(path)

@shared_task(name="api.tasks.perform_iac_scan")
def perform_iac_scan(user_id, repo_url, tenant_id):
    scan_uuid = str(uuid.uuid4())
    temp_path = Path("temp_scans") / scan_uuid
    temp_path.mkdir(parents=True, exist_ok=True)
    
    logger.info(f"🚀 Starting tfsec scan [{scan_uuid}] for: {repo_url}")

    try:
        # 1. Clone Repository
        logger.info(f"📥 Cloning repository into {temp_path}...")
        subprocess.run(
            ["git", "clone", "--depth", "1", repo_url, str(temp_path)],
            check=True, capture_output=True
        )

        # 2. Run tfsec
        # We use --format json to get the structured data
        logger.info(f"🔍 Running tfsec scanner...")
        result = subprocess.run(
            ["tfsec", str(temp_path), "--format", "json"],
            capture_output=True, 
            text=True, 
            check=False  # tfsec returns non-zero if findings exist
        )

        # 3. Debug raw output (Visible in Celery Worker console)
        if not result.stdout:
            logger.error(f"❌ tfsec produced no output! Error: {result.stderr}")
            return "Scan failed: No output from tfsec."

        scan_data = json.loads(result.stdout)
        
        # tfsec structure: results is a list under the 'results' key
        findings = scan_data.get("results", [])
        logger.info(f"✅ tfsec finished. Found {len(findings)} issues.")

        findings_to_create = []
        user = User.objects.get(id=user_id)

        for issue in findings:
            # tfsec mapping
            # Note: tfsec provides 'severity' as HIGH, MEDIUM, LOW, CRITICAL
            severity = issue.get("severity", "MEDIUM").upper()
            rule_id = issue.get("rule_id", "N/A")
            description = issue.get("description", "No description provided")
            logger.info(f"Processing issue: {rule_id} with severity {severity} and description: {description}")
            # --- AI Remediation Logic (Optional) ---
            ai_fix = "Manual review required."
            if severity in ["CRITICAL", "HIGH"]:
                finding_context = {
                    "rule_id": rule_id,
                    "rule_description": description,
                    "resource_id": rule_id
                }
                try:
                   # Ensure this function is defined and working
                    logger.info(f"🤖 Generating AI remediation for {rule_id} - {description}")
                    ai_fix = get_sarvam_remediation(finding_context)
                    logger.info(f"✅ AI remediation generated for {rule_id} ai_fix: {ai_fix}")
                except Exception as ai_err:
                    ai_fix = f"AI Remediation failed: {str(ai_err)}"
                # -----------------------------

            findings_to_create.append(IaCFinding(
                user=user,
                tenant_id=tenant_id,
                repository_url=repo_url,
                file_path=issue.get("location", {}).get("filename", "unknown"),
                line_number=issue.get("location", {}).get("start_line", 0),
                resource_id=issue.get("resource", "unknown"),
                rule_id=rule_id,
                rule_description=description,
                severity=severity,
                ai_remediation=ai_fix
            ))

        # 4. Bulk Save to DB
        if findings_to_create:
            IaCFinding.objects.bulk_create(findings_to_create)
            logger.info(f"💾 Successfully saved {len(findings_to_create)} findings to database.")
        
        return f"Scan complete: {len(findings_to_create)} findings found."

    except Exception as e:
        logger.error(f"💥 Scan Critical Failure: {str(e)}")
        return f"Scan unexpected error: {str(e)}"
    
    finally:
        # 5. Cleanup temp folder
        if temp_path.exists():
            logger.info(f"🧹 Cleaning up directory: {temp_path}")
            shutil.rmtree(temp_path, onexc=handle_remove_readonly)