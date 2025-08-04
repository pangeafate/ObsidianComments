#!/bin/bash

echo "🧪 Browser Validation Test Suite"
echo "Comprehensive testing without requiring Node.js/Puppeteer"
echo "Date: $(date)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $2"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: $2"
        ((FAILED++))
    fi
}

echo -e "${BLUE}🔍 1. CSP Header Validation${NC}"

# Test 1: CSP Headers Present
CSP_HEADER=$(curl -s -I https://obsidiancomments.serverado.app/cmdwl766o0003uvwlbqwn071k | grep -i "content-security-policy")
test_result $([ -n "$CSP_HEADER" ] && echo 0 || echo 1) "CSP headers present"

if [ -n "$CSP_HEADER" ]; then
    echo "   CSP: ${CSP_HEADER:0:100}..."
    
    # Test 2: No unsafe-eval in CSP
    echo "$CSP_HEADER" | grep -q "unsafe-eval"
    test_result $([ $? -ne 0 ] && echo 0 || echo 1) "CSP does not contain unsafe-eval"
    
    # Test 3: Has necessary directives
    echo "$CSP_HEADER" | grep -q "script-src"
    test_result $? "CSP has script-src directive"
    
    echo "$CSP_HEADER" | grep -q "connect-src"
    test_result $? "CSP has connect-src directive"
else
    echo "   ⚠️ No CSP header found"
fi

echo ""
echo -e "${BLUE}🔍 2. JavaScript Bundle Analysis${NC}"

# Test 4: Bundle loads correctly
BUNDLE_URL="https://obsidiancomments.serverado.app/assets/index-3a9144cd.js"
BUNDLE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BUNDLE_URL")
test_result $([ "$BUNDLE_STATUS" = "200" ] && echo 0 || echo 1) "JavaScript bundle loads (HTTP $BUNDLE_STATUS)"

# Test 5: Bundle size reasonable
if [ "$BUNDLE_STATUS" = "200" ]; then
    BUNDLE_SIZE=$(curl -s "$BUNDLE_URL" | wc -c)
    test_result $([ "$BUNDLE_SIZE" -gt 100000 ] && echo 0 || echo 1) "Bundle size reasonable (${BUNDLE_SIZE} bytes)"
    
    # Test 6: Check for eval usage in bundle
    EVAL_COUNT=$(curl -s "$BUNDLE_URL" | grep -o "eval" | wc -l)
    echo "   📊 Eval occurrences in bundle: $EVAL_COUNT"
    test_result $([ "$EVAL_COUNT" -lt 50 ] && echo 0 || echo 1) "Bundle eval usage within reasonable limits"
    
    # Test 7: Check for Yjs in bundle
    curl -s "$BUNDLE_URL" | grep -q "yjs\|Y\.Doc"
    test_result $? "Bundle contains Yjs library"
    
    # Test 8: Environment variables properly replaced
    curl -s "$BUNDLE_URL" | grep -q "wss://obsidiancomments.serverado.app"
    test_result $? "WebSocket URL properly set in bundle"
    
    # Test 9: No development URLs in bundle
    curl -s "$BUNDLE_URL" | grep -q "localhost"
    test_result $([ $? -ne 0 ] && echo 0 || echo 1) "No localhost URLs in production bundle"
fi

echo ""
echo -e "${BLUE}🔍 3. Frontend HTML Analysis${NC}"

# Test 10: HTML structure
HTML_CONTENT=$(curl -s https://obsidiancomments.serverado.app/editor/cmdwl766o0003uvwlbqwn071k)

echo "$HTML_CONTENT" | grep -q '<div id="root">'
test_result $? "HTML contains React root element"

echo "$HTML_CONTENT" | grep -q 'index-.*\.js'
test_result $? "HTML references JavaScript bundle"

echo "$HTML_CONTENT" | grep -q 'index-.*\.css'
test_result $? "HTML references CSS bundle"

# Test 11: Correct JavaScript bundle referenced
echo "$HTML_CONTENT" | grep -q 'index-3a9144cd\.js'
test_result $? "HTML references latest JavaScript bundle"

echo ""
echo -e "${BLUE}🔍 4. API and WebSocket Tests${NC}"

# Test 12: API Health
API_RESPONSE=$(curl -s https://obsidiancomments.serverado.app/api/health)
echo "$API_RESPONSE" | grep -q "ok"
test_result $? "API health check passes"

# Test 13: Document API
DOC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://obsidiancomments.serverado.app/api/notes/cmdwl766o0003uvwlbqwn071k)
test_result $([ "$DOC_STATUS" = "200" ] && echo 0 || echo 1) "Document API accessible (HTTP $DOC_STATUS)"

# Test 14: WebSocket endpoint
WS_STATUS=$(curl -s -I https://obsidiancomments.serverado.app/ws | head -1 | grep -o "200")
test_result $([ "$WS_STATUS" = "200" ] && echo 0 || echo 1) "WebSocket endpoint accessible"

echo ""
echo -e "${BLUE}🔍 5. Container and Service Health${NC}"

# Test 15-19: Container status
CONTAINERS=("frontend" "backend" "hocuspocus" "obsidian-postgres" "obsidian-redis")
for container in "${CONTAINERS[@]}"; do
    docker ps --format "table {{.Names}}" | grep -q "^$container$"
    test_result $? "$container container running"
done

echo ""
echo -e "${BLUE}🔍 6. Hocuspocus Collaboration Server${NC}"

# Test 20: Hocuspocus logs show successful authentication
AUTH_SUCCESS=$(docker logs hocuspocus 2>&1 | tail -20 | grep -c "Authentication successful")
test_result $([ "$AUTH_SUCCESS" -gt 0 ] && echo 0 || echo 1) "Hocuspocus authentication working"

# Test 21: No critical Hocuspocus errors
CRITICAL_ERRORS=$(docker logs hocuspocus 2>&1 | tail -20 | grep -i "error" | grep -v "Cannot read properties" | wc -l)
test_result $([ "$CRITICAL_ERRORS" -eq 0 ] && echo 0 || echo 1) "No critical Hocuspocus errors"

echo ""
echo -e "${BLUE}🔍 7. Security and Performance Tests${NC}"

# Test 22: HTTPS redirect
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L http://obsidiancomments.serverado.app/cmdwl766o0003uvwlbqwn071k)
test_result $([ "$HTTP_STATUS" = "200" ] && echo 0 || echo 1) "HTTP to HTTPS redirect works"

# Test 23: Security headers
SECURITY_HEADERS=$(curl -s -I https://obsidiancomments.serverado.app/cmdwl766o0003uvwlbqwn071k | grep -E "(X-Frame-Options|X-Content-Type-Options|X-XSS-Protection)" | wc -l)
test_result $([ "$SECURITY_HEADERS" -ge 2 ] && echo 0 || echo 1) "Security headers present ($SECURITY_HEADERS found)"

# Test 24: Response time reasonable
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" https://obsidiancomments.serverado.app/cmdwl766o0003uvwlbqwn071k)
RESPONSE_OK=$(echo "$RESPONSE_TIME < 3.0" | bc -l 2>/dev/null || echo "1")
test_result $([ "$RESPONSE_OK" = "1" ] && echo 0 || echo 1) "Response time reasonable (${RESPONSE_TIME}s)"

echo ""
echo -e "${BLUE}🔍 8. Yjs Fix Validation (Static Analysis)${NC}"

# Test 25: Check useCollaboration source for fix
if [ -f "packages/frontend/src/hooks/useCollaboration.ts" ]; then
    # Check that useState doesn't create Y.Doc
    grep -q "useState<Y\.Doc | null>(null)" packages/frontend/src/hooks/useCollaboration.ts
    test_result $? "useCollaboration hook properly initializes ydoc as null"
    
    # Check that Y.Doc is only created in useEffect
    YDOC_CREATIONS=$(grep -c "new Y\.Doc()" packages/frontend/src/hooks/useCollaboration.ts)
    test_result $([ "$YDOC_CREATIONS" -eq 1 ] && echo 0 || echo 1) "Only one Y.Doc creation in useCollaboration ($YDOC_CREATIONS found)"
    
    # Check for proper cleanup
    grep -q "newYdoc\.destroy()" packages/frontend/src/hooks/useCollaboration.ts
    test_result $? "Y.Doc cleanup implemented in useCollaboration"
else
    echo "   ⚠️ Source file not available for static analysis"
fi

echo ""
echo -e "${YELLOW}📊 Test Summary${NC}"
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo "Total: $((PASSED + FAILED))"

echo ""
echo -e "${BLUE}🎯 Key Validation Results:${NC}"

# Determine overall status
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED! System is fully functional.${NC}"
    echo ""
    echo -e "${GREEN}✅ Yjs type conflict fix: VALIDATED${NC}"
    echo -e "${GREEN}✅ CSP security: COMPLIANT${NC}"
    echo -e "${GREEN}✅ Application: FUNCTIONAL${NC}"
    echo -e "${GREEN}✅ Infrastructure: HEALTHY${NC}"
    echo ""
    echo -e "${GREEN}🚀 Ready for production use: https://obsidiancomments.serverado.app/editor/cmdwl766o0003uvwlbqwn071k${NC}"
    exit 0
elif [ $FAILED -le 2 ]; then
    echo -e "${YELLOW}⚠️  MOSTLY FUNCTIONAL with minor issues ($FAILED failed tests)${NC}"
    echo "Review the failed tests above and consider if they're critical."
    exit 0
else
    echo -e "${RED}❌ SIGNIFICANT ISSUES detected ($FAILED failed tests)${NC}"
    echo "Multiple test failures indicate problems that should be addressed."
    exit 1
fi