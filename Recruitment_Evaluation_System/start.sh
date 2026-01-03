#!/bin/bash

echo "Starting Recruitment Evaluation System with Docker..."

# Build and start all services
docker-compose up --build -d

echo "Waiting for services to be ready..."
sleep 15

# Start Tunnelmole on host machine (for GitHub Pages deployment)
echo ""
echo "Starting Tunnelmole on host machine..."
echo "   Note: Tunnelmole needs to run on the host (not in Docker)"
echo "   Tunnelmole will connect directly to backend on port 5001"
echo "   Run this command in a separate terminal:"
echo "   ./start-tunnelmole.sh"
echo ""
echo "   Or manually: npx -y tunnelmole 5001"
echo ""
echo "   After Tunnelmole starts, it will display a public URL."
echo "   Copy the HTTPS URL and:"
echo "   1. Save it to .tunnelmole-url file"
echo "   2. Update GitHub Secrets (NEXT_PUBLIC_API_URL) for GitHub Pages deployment"

echo ""
echo "Services started!"
echo "Frontend (User): http://localhost:3000"
echo "Frontend (Staff): http://localhost:3001"
echo "Backend API: http://localhost:5001"
echo ""
echo "Test accounts:"
echo "Staff: staff@test.com / password123"
echo "User: user@test.com / password123"
echo ""
echo "Tunnelmole (for Google Form sync and GitHub Pages):"
echo "  Start Tunnelmole: ./start-tunnelmole.sh"
echo "  Or manually: npx -y tunnelmole 5001"
echo ""
echo "  After starting, Tunnelmole will display a public URL."
echo "  Look for the HTTPS URL (e.g., https://xxxxx.tunnelmole.net)"
echo "  Use the HTTPS URL (not HTTP) for better security"
echo ""
echo "  To save URL to file:"
echo "    echo 'https://xxxxx.tunnelmole.net' > .tunnelmole-url"
echo "    echo 'https://xxxxx.tunnelmole.net' > server/.tunnelmole-url"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"
echo "To stop Tunnelmole: pkill -f tunnelmole"

