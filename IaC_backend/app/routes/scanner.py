from flask import Blueprint, request, jsonify
from app.services.github_service import clone_repository
from app.services.scan_service import run_iac_scan
from app.utils.file_manager import safe_cleanup
import shutil

scanner_bp = Blueprint('scanner', __name__)

@scanner_bp.route('/api/iac/scan', methods=['POST'])
def start_scan():
    data = request.json
    repo_url = data.get('repoUrl')
    print("Repo URL received for scanning:", repo_url)  # Debug log

    if not repo_url:
        return jsonify({"error": "URL is required"}), 400

    try:
        # 1. Clone
        path, scan_id = clone_repository(repo_url)
        print(f"Repository cloned to: {path} with scan ID: {scan_id}")  # Debug log
        # 2. Scan
        results = run_iac_scan(path)
        
        # 3. Cleanup (Delete the folder after scan to save space)
        safe_cleanup(path)
        print(f"Cleaned up scan directory: {path}")  # Debug log
        return jsonify({
            "scanId": scan_id,
            "results": results,
            "message": "Scan completed successfully"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500