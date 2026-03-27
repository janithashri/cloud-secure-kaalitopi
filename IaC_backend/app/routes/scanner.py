from flask import Blueprint, request, jsonify, send_file
from app.services.github_service import clone_repository
from app.services.scan_service import run_iac_scan
from app.utils.file_manager import safe_cleanup
from app.utils.reporting import export_to_pdf 
import os

scanner_bp = Blueprint('scanner', __name__)

# Temporary in-memory storage for results
# Key: scan_id, Value: list of findings
scan_storage = {}

@scanner_bp.route('/api/iac/scan', methods=['POST'])
def start_scan():
    data = request.json
    repo_url = data.get('repoUrl')

    if not repo_url:
        return jsonify({"error": "URL is required"}), 400

    try:
        # 1. Clone the repository
        path, scan_id = clone_repository(repo_url)
        
        # 2. Run the IaC scan
        # This function likely returns a list or a dict with a 'results' key
        results_payload = run_iac_scan(path)
        
        # --- FIXED LOGIC HERE ---
        # We check the type to avoid "'list' object has no attribute 'get'"
        if isinstance(results_payload, list):
            findings = results_payload
        elif isinstance(results_payload, dict):
            # Try to drill down into the dictionary structure
            findings = results_payload.get('results', [])
            if isinstance(findings, dict):
                findings = findings.get('results', [])
        else:
            findings = []
        
        # 3. Store the findings in memory for the export route
        scan_storage[scan_id] = findings
        
        # 4. Cleanup local files
        safe_cleanup(path)
        
        return jsonify({
            "scanId": scan_id,
            "results": findings,
            "message": "Scan completed successfully"
        })
    except Exception as e:
        print(f"Scan Error: {str(e)}") # Useful for debugging in console
        return jsonify({"error": str(e)}), 500

@scanner_bp.route('/api/iac/export', methods=['GET'])
def export_scan_results():
    scan_id = request.args.get('scanId')
    
    if not scan_id or scan_id not in scan_storage:
        return jsonify({"error": "Scan results not found or expired"}), 404

    try:
        results = scan_storage[scan_id]
        
        # Generate the PDF file on the server temporarily
        file_path = export_to_pdf(results, filename=f"report_{scan_id}.pdf")
        
        # Ensure the file was actually created before trying to send it
        if not os.path.exists(file_path):
            return jsonify({"error": "Failed to generate PDF file on server"}), 500

        # Stream the file to the user's browser
        response = send_file(
            file_path,
            as_attachment=True,
            download_name=f"CloudSecure_Audit_{scan_id}.pdf",
            mimetype='application/pdf'
        )
        
        # Delete the temp file from the server after the download starts
        @response.call_on_close
        def cleanup_temp_file():
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    print(f"Error cleaning up temp file: {e}")
                
        return response
        
    except Exception as e:
        return jsonify({"error": f"Export failed: {str(e)}"}), 500