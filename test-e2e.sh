#!/bin/bash
# test-e2e.sh

DOMAIN="https://obsidiancomments.serverado.app"
TEST_DOC_ID="cmdwl766o0003uvwlbqwn071k"

echo "=== ObsidianComments E2E Test Suite ==="

# Test 1: API Health
echo -n "Testing API health... "
API_RESPONSE=$(curl -s "${DOMAIN}/api/health")
if [[ "$API_RESPONSE" == *"\"status\":\"ok\""* ]]; then
    echo "✓ PASS"
else
    echo "✗ FAIL - API not responding correctly"
    echo "Response: $API_RESPONSE"
    exit 1
fi

# Test 2: Document API Endpoint
echo -n "Testing document API... "
DOC_RESPONSE=$(curl -s "${DOMAIN}/api/notes/${TEST_DOC_ID}")
if [[ "$DOC_RESPONSE" == *"\"shareId\":\"${TEST_DOC_ID}\""* ]] || [[ "$DOC_RESPONSE" == *"\"id\":\"${TEST_DOC_ID}\""* ]]; then
    echo "✓ PASS"
else
    echo "✗ FAIL - Document not loading from API"
    echo "Response: $DOC_RESPONSE"
    exit 1
fi

# Test 3: WebSocket Connectivity
echo -n "Testing WebSocket... "
WS_TEST=$(curl -s -I "${DOMAIN}/ws" 2>&1 | grep -E "(200 OK)")
if [[ -n "$WS_TEST" ]]; then
    echo "✓ PASS"
else
    echo "✗ FAIL - WebSocket not responding"
    exit 1
fi

# Test 4: Frontend Bundle Loading
echo -n "Testing frontend assets... "
FRONTEND_HTML=$(curl -s "${DOMAIN}/")
if [[ "$FRONTEND_HTML" == *"<div id=\"root\"></div>"* ]] && [[ "$FRONTEND_HTML" == *"script"* ]]; then
    echo "✓ PASS"
else
    echo "✗ FAIL - Frontend not loading properly"
    exit 1
fi

# Test 5: Document Page Load
echo -n "Testing document page... "
DOC_PAGE=$(curl -s "${DOMAIN}/${TEST_DOC_ID}")
if [[ "$DOC_PAGE" == *"<div id=\"root\"></div>"* ]] && [[ -z $(echo "$DOC_PAGE" | grep -i "error") ]]; then
    echo "✓ PASS"
else
    echo "✗ FAIL - Document page not loading"
    exit 1
fi

# Test 6: Secure CSP Headers Check
echo -n "Testing secure CSP headers... "
CSP_HEADER=$(curl -s -I "${DOMAIN}/" | grep -i "content-security-policy")
if [[ "$CSP_HEADER" == *"script-src"* ]] && [[ "$CSP_HEADER" != *"unsafe-eval"* ]]; then
    echo "✓ PASS - Secure CSP without unsafe-eval"
else
    echo "✗ FAIL - CSP headers insecure or missing"
    echo "CSP Header: $CSP_HEADER"
    exit 1
fi

echo "=== All basic tests passed ==="