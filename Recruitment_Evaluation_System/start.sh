#!/bin/bash

echo "Starting Recruitment Evaluation System with Docker..."

# Build and start all services
docker-compose up --build -d

echo "Waiting for services to be ready..."
sleep 15

# Start Tunnelmole for Google Form sync
echo ""
echo "Starting Tunnelmole for Google Form sync..."
docker-compose --profile tunnelmole up -d tunnelmole

echo "Waiting for Tunnelmole to start..."
sleep 3

# Extract and save Tunnelmole URL to file for backend to read
# Try multiple times as Tunnelmole may need a moment to generate the URL
echo ""
echo "Extracting Tunnelmole URL..."
TUNNELMOLE_URL=""
for i in {1..5}; do
  TUNNELMOLE_URL=$(docker-compose logs tunnelmole 2>/dev/null | grep -o "https://[^ ]*tunnelmole.net" | head -1)
  if [ -n "$TUNNELMOLE_URL" ]; then
    break
  fi
  if [ $i -lt 5 ]; then
    echo "   Attempt $i: URL not found yet, waiting..."
    sleep 2
  fi
done

if [ -n "$TUNNELMOLE_URL" ]; then
  # Save to both project root and server directory (server dir is mounted in container)
  echo "$TUNNELMOLE_URL" > .tunnelmole-url
  echo "$TUNNELMOLE_URL" > server/.tunnelmole-url
  echo "✅ Tunnelmole URL saved: $TUNNELMOLE_URL"
  echo "   The URL is now available in the Staff page under 'Google Form Config' tab"
else
  echo "⚠️  Warning: Could not extract Tunnelmole URL from logs after 5 attempts"
  echo "   You may need to:"
  echo "   1. Check Tunnelmole logs: docker-compose logs tunnelmole"
  echo "   2. Manually extract URL: docker-compose logs tunnelmole | grep 'https://'"
  echo "   3. Save it to server/.tunnelmole-url file"
fi

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
echo "Tunnelmole URL (for Google Form sync):"
echo "  Run: docker-compose logs tunnelmole | grep 'https://'"
echo "  Or: docker-compose logs -f tunnelmole"
echo ""
echo "  Look for the HTTPS URL (e.g., https://xxxxx.tunnelmole.net)"
echo "  Use the HTTPS URL (not HTTP) for better security"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"
echo "To stop Tunnelmole only: docker-compose --profile tunnelmole stop tunnelmole"

