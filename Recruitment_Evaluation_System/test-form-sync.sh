#!/bin/bash

# Test Google Form sync API
# This script tests if the form submission API is working
# Usage: ./test-form-sync.sh [tunnelmole-url]
# Example: ./test-form-sync.sh https://xxxxx.tunnelmole.net
#          ./test-form-sync.sh http://localhost:5000  (for local testing)

echo "=== Testing Google Form Sync API ==="
echo ""

# Get the tunnelmole URL from user or use default
TUNNELMOLE_URL=${1:-"http://localhost:5000"}

echo "Testing API at: $TUNNELMOLE_URL/api/form/submit"
echo ""

# Test data
TEST_EMAIL="testuser@example.com"
TEST_DATA='{
  "email": "'"$TEST_EMAIL"'",
  "form_id": "jSnLjkfqetqdLgFr7",
  "submission_data": {
    "Your Name": "Test User",
    "Your Email": "'"$TEST_EMAIL"'",
    "Your Nationality": "Test"
  }
}'

echo "Sending test submission..."
echo ""

RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$TUNNELMOLE_URL/api/form/submit" \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

echo "Response Code: $HTTP_CODE"
echo "Response Body:"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Test successful! Form submission API is working."
    echo ""
    echo "Next steps:"
    echo "1. Update google-apps-script/Code.gs with the Tunnelmole URL"
    echo "2. Set up the trigger in Google Apps Script"
    echo "3. Test by submitting a Google Form"
else
    echo "❌ Test failed. Check the error above."
    echo ""
    echo "Troubleshooting:"
    echo "1. Make sure the backend is running: docker-compose ps"
    echo "2. Check backend logs: docker-compose logs backend"
    echo "3. If using Tunnelmole, verify it's running: ps aux | grep tunnelmole"
    echo "4. Test backend locally: curl http://localhost:5001/api/health"
    echo "5. Verify URL is correct (should start with https://)"
fi

