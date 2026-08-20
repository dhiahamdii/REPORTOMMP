#!/usr/bin/env python3
"""
Start the FastAPI server with environment variables properly configured.
"""
import os
import subprocess
import sys

# Try to load environment variables from Vercel
# In production, these will be automatically available
# In local dev, they might need to be passed in

if __name__ == '__main__':
    # Print debug info
    api_key = os.getenv('OPENAI_API_KEY', '')
    print(f"[DEBUG] OPENAI_API_KEY available: {bool(api_key)}")
    if api_key:
        print(f"[DEBUG] API Key starts with: {api_key[:20]}...")
    
    # Start uvicorn
    subprocess.run([
        sys.executable, '-m', 'uvicorn',
        'main:app',
        '--host', '0.0.0.0',
        '--port', '8000'
    ])
