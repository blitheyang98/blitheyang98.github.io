#!/bin/bash
# Start Tunnelmole to expose backend via public URL
# This script should be run on the host machine (not in Docker)

echo "Starting Tunnelmole for port 5001 (direct connection to backend)..."
echo "Make sure docker-compose services are running: docker-compose up -d backend"
echo ""

# Check if port 5001 is accessible
if ! curl -s http://localhost:5001/api/health > /dev/null 2>&1; then
    echo "ERROR: Port 5001 is not accessible. Make sure backend is running."
    echo "Run: docker-compose up -d backend"
    exit 1
fi

echo "Port 5001 is accessible. Starting Tunnelmole..."
echo ""
echo "Your public URL will be displayed below."
echo "After Tunnelmole starts, you'll see a URL like: https://xxxxx.tunnelmole.net"
echo ""
echo "To save the URL to file, run in another terminal:"
echo "  echo 'https://xxxxx.tunnelmole.net' > .tunnelmole-url"
echo "  echo 'https://xxxxx.tunnelmole.net' > server/.tunnelmole-url"
echo ""
echo "To update GitHub Secrets (for GitHub Pages deployment):"
echo "  Use: https://xxxxx.tunnelmole.net/api"
echo ""
echo "Press Ctrl+C to stop Tunnelmole"
echo "=========================================="
echo ""

# Start Tunnelmole (this will run in foreground)
# Direct connection to backend on port 5001 (no proxy needed)
npx -y tunnelmole 5001

