

import os
import requests
import json
from dotenv import load_dotenv
from celery.utils.log import get_task_logger

# Initialize logger for Celery visibility
logger = get_task_logger(__name__)

# Load variables from .env
load_dotenv()

# Use .strip() to avoid any hidden spaces from Windows .env files
SARVAM_API_KEY = str(os.getenv("SARVAM_API_KEY", "")).strip()
SARVAM_URL = str(os.getenv("SARVAM_API_URL", "https://api.sarvam.ai/v1/chat/completions")).strip()

def get_sarvam_remediation(finding):
    """
    Fetches professional Terraform remediation from Sarvam AI.
    Handles 'reasoning_content' vs 'content' and token overflow.
    """
    
    # 1. Expert Persona & Constraints
    system_instruction = (
        "You are a Senior DevSecOps Engineer. Provide a professional remediation guide. "
        "Your response MUST follow this structure:\n"
        "### 1. Security Risk\n(Brief explanation)\n"
        "### 2. Corrected Terraform Code\n(Code block using hcl)\n"
        "### 3. Best Practices\n(Bullet points)\n\n"
        "IMPORTANT: Do not include any 'internal thought process', 'reasoning steps', "
        "or 'deconstruction' text. Only return the final remediation guide."
    )

    # 2. Contextual User Input
    user_message = (
        f"Vulnerability: {finding.get('rule_description')}\n"
        f"Resource: {finding.get('resource_id')}\n"
        f"Rule ID: {finding.get('rule_id')}"
    )

    payload = {
        "model": "sarvam-105b", 
        "messages": [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": user_message}
        ],
        "temperature": 0.1,  # Keep it technical and consistent
        "max_tokens": 2000    # Enough room for code blocks
    }
    
    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json"
    }

    try:
        if not SARVAM_API_KEY:
            logger.error("❌ SARVAM_API_KEY is missing in environment variables.")
            return "API Configuration Error: Key missing."

        response = requests.post(SARVAM_URL, json=payload, headers=headers, timeout=45)
        
        # Log status for debugging
        logger.info(f"📡 Sarvam AI Request Sent. Status: {response.status_code}")
        
        if response.status_code != 200:
            logger.error(f"❌ AI API Error: {response.status_code} - {response.text}")
            return "Manual remediation required. AI Service temporarily unavailable."

        data = response.json()
        message = data['choices'][0]['message']
        
        # 3. Extraction Logic
        # Some reasoning models put the final answer in 'content' 
        # and the 'thinking' in 'reasoning_content'.
        content = message.get('content')
        reasoning = message.get('reasoning_content')

        if content and len(content.strip()) > 10:
            return content
        elif reasoning:
            # Fallback if the model dumped everything into reasoning
            return reasoning
        
        return "Manual remediation required. AI returned an empty response."

    except requests.exceptions.Timeout:
        logger.error("⏰ AI Request Timed Out.")
        return "Remediation generation timed out. Please try again."
    except Exception as e:
        logger.error(f"💥 Unexpected AI Failure: {str(e)}")
        return "Manual remediation required. Consult CIS benchmarks."