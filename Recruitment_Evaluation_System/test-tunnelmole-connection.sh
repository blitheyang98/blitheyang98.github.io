#!/bin/bash

# Test Tunnelmole connection
# Usage: ./test-tunnelmole-connection.sh https://xxxxx.tunnelmole.net

if [ -z "$1" ]; then
    echo "Usage: $0 <tunnelmole-url>"
    echo "Example: $0 https://abc123.tunnelmole.net"
    exit 1
fi

TUNNELMOLE_URL=$1
# Remove trailing slash if present
TUNNELMOLE_URL=${TUNNELMOLE_URL%/}

echo "=========================================="
echo "Testing Tunnelmole Connection"
echo "=========================================="
echo ""
echo "Tunnelmole URL: $TUNNELMOLE_URL"
echo "API Endpoint: $TUNNELMOLE_URL/api/form/submit"
echo ""

# Test if URL is reachable
echo "1. Testing if URL is reachable..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$TUNNELMOLE_URL/api/form/submit" -X POST -H "Content-Type: application/json" -d '{}' 2>/dev/null)

if [ "$HTTP_CODE" = "000" ]; then
    echo "   ❌ Cannot reach URL. Check if Tunnelmole is running."
    exit 1
else
    echo "   ✅ URL is reachable (HTTP $HTTP_CODE)"
fi

echo ""

# Test form submission
echo "2. Testing form submission API..."
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_DATA='{
  "email": "'"$TEST_EMAIL"'",
  "form_id": "jSnLjkfqetqdLgFr7",
  "submission_data": {
    "Test Name": "Tunnelmole Test",
    "Test Email": "'"$TEST_EMAIL"'",
    "Test Time": "'"$(date)"'"
  }
}'

RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$TUNNELMOLE_URL/api/form/submit" \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

echo "   Response Code: $HTTP_CODE"
echo "   Response:"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY" | head -10
echo ""

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Test successful! Form submission API is working."
    echo ""
    echo "Next steps:"
    echo "1. Update google-apps-script/Code.gs:"
    echo "   API_URL: '$TUNNELMOLE_URL/api/form/submit'"
    echo "2. Set up trigger in Google Apps Script"
    echo "3. Test by submitting a Google Form"
else
    echo "❌ Test failed. Response code: $HTTP_CODE"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check if backend is running: docker-compose ps"
    echo "2. Check backend logs: docker-compose logs backend | tail -20"
    echo "3. Verify Tunnelmole is still running"
    echo "4. Check if URL is correct (should start with https://)"
fi

echo ""

