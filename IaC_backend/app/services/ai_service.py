import os
import requests
from dotenv import load_dotenv
import json

# Load variables from .env
load_dotenv()

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SARVAM_URL = os.getenv("SARVAM_API_URL")

# def get_ai_remediation(finding):
#     """Fetches remediation from Sarvam AI using official sk_ API keys."""
    
#     # Official models include sarvam-105b or sarvam-30b
#     # sarvam-105b is recommended for complex coding/security tasks
#     payload = {
#         "model": "sarvam-105b", 
#         "messages": [
#             {
#                 "role": "system", 
#                 "content": "You are a Cloud Security Expert. Provide 3-step Terraform fixes."
#             },
#             {
#                 "role": "user", 
#                 "content": f"Fix this: {finding['rule_description']}"
#             }
#         ],
#         "temperature": 0.2 # Deterministic for security fixes
#     }
    
#     # Sarvam uses 'api-subscription-key' header
#     headers = {
#         "api-subscription-key": SARVAM_API_KEY,
#         "Content-Type": "application/json"
#     }

#     try:
#         response = requests.post(SARVAM_URL, json=payload, headers=headers)
#         response.raise_for_status()
#         data = response.json()
#         return data['choices'][0]['message']['content']
#     except Exception as e:
#         print(f"AI Error: {e}")
#         return "Manual remediation required. Consult CIS benchmarks."


def get_ai_remediation(finding):
    """Fetches detailed, professional Terraform remediation from Sarvam AI."""
    
    # We create a much more detailed prompt to force the AI to explain 'Why' and 'How'
    system_instruction = (
        "You are a Senior DevSecOps Engineer. Your task is to provide high-quality "
        "remediation for Infrastructure as Code (IaC) vulnerabilities. "
        "For every finding: "
        "1. Briefly explain the security risk. "
        "2. Provide the corrected Terraform code block. "
        "3. List best practices to prevent this in the future. "
        "Always use code blocks for Terraform."
    )

    user_message = (
        f"Vulnerability ID: {finding.get('rule_id')}\n"
        f"Description: {finding.get('rule_description')}\n"
        f"Resource: {finding.get('resource_id')}\n\n"
        "Provide a detailed remediation guide."
    )

    payload = {
        "model": "sarvam-105b", 
        "messages": [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": user_message}
        ],
        # Increased temperature slightly to allow for better explanatory prose, 
        # while keeping the code deterministic.
        "temperature": 0.3, 
        "max_tokens": 1000  # Ensure the AI doesn't get cut off mid-sentence
    }
    
    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(SARVAM_URL, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        
        print("--- FULL AI RESPONSE DATA START ---")
        print(json.dumps(data, indent=4)) 
        print("--- FULL AI RESPONSE DATA END ---\n")
        
        # Extract content safely
        ai_response = data['choices'][0]['message']['content']
        return ai_response
        
    except Exception as e:
        print(f"AI Error: {e}")
        return "Manual remediation required. Check organizational security policies."