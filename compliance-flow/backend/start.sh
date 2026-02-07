#!/bin/bash
# ComplianceFlow Backend Startup Script

echo "🚀 Starting ComplianceFlow Backend..."
python3 -m uvicorn app.main:app --reload
