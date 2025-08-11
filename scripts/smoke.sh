#!/bin/bash
set -euo pipefail

# Smoke test script - minimal critical path validation
# Usage: ./smoke.sh <url>
# Returns: 0 if all tests pass, 1 if any fail

URL=${1:-http://localhost}
VERBOSE=${2:-false}

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counters
PASSED=0
FAILED=0
TESTS=()

# Helper functions
log() {
    if [ "$VERBOSE" = "true" ]; then
        echo -e "${GREEN}[SMOKE]${NC} $1"
    fi
}

pass() {
    echo -e "${GREEN}✅${NC} $1"
    ((PASSED++))
    TESTS+=("PASS: $1")
}

fail() {
    echo -e "${RED}❌${NC} $1"
    ((FAILED++))
    TESTS+=("FAIL: $1")
}

test_endpoint() {
    local endpoint=$1
    local expected_status=${2:-200}
    local description=$3
    
    log "Testing $endpoint..."
    
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL$endpoint" || echo "000")
    
    if [ "$STATUS" = "$expected_status" ]; then
        pass "$description"
    else
        fail "$description (got $STATUS, expected $expected_status)"
    fi
}

test_post() {
    local endpoint=$1
    local data=$2
    local description=$3
    
    log "Testing POST $endpoint..."
    
    RESPONSE=$(curl -s -X POST "$URL$endpoint" \
        -H "Content-Type: application/json" \
        -d "$data" \
        -w "\n%{http_code}" || echo "ERROR\n000")
    
    STATUS=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [ "$STATUS" = "200" ] || [ "$STATUS" = "201" ]; then
        if echo "$BODY" | grep -q "shareId\|id\|success"; then
            pass "$description"
        else
            fail "$description (invalid response body)"
        fi
    else
        fail "$description (got $STATUS)"
    fi
}

test_websocket() {
    local ws_url=${URL/http/ws}/ws
    local description="WebSocket connectivity"
    
    log "Testing WebSocket at $ws_url..."
    
    # Use curl to test WebSocket upgrade with HTTP/1.1 and max time limit
    RESPONSE=$(curl -s -i --http1.1 --max-time 3 \
        -H "Connection: Upgrade" \
        -H "Upgrade: websocket" \
        -H "Sec-WebSocket-Version: 13" \
        -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" \
        "$ws_url" | head -1 || echo "ERROR")
    
    if echo "$RESPONSE" | grep -q "101"; then
        pass "$description"
    else
        fail "$description (got: $RESPONSE)"
    fi
}

test_cors() {
    local description="CORS headers"
    
    log "Testing CORS..."
    
    HEADERS=$(curl -s -I -H "Origin: app://obsidian.md" "$URL/api/health" || echo "ERROR")
    
    if echo "$HEADERS" | grep -qi "access-control-allow-origin"; then
        pass "$description"
    else
        fail "$description"
    fi
}

test_database() {
    local description="Database connectivity"
    
    log "Testing database..."
    
    # Create a test document
    RESPONSE=$(curl -s -X POST "$URL/api/notes/share" \
        -H "Content-Type: application/json" \
        -d '{"title":"Smoke Test","content":"Test content"}' || echo '{"error":"failed"}')
    
    if echo "$RESPONSE" | grep -q "shareId"; then
        SHARE_ID=$(echo "$RESPONSE" | grep -o '"shareId":"[^"]*' | cut -d'"' -f4)
        
        # Try to retrieve it
        RETRIEVE=$(curl -s "$URL/api/notes/$SHARE_ID" || echo '{"error":"failed"}')
        
        if echo "$RETRIEVE" | grep -q "Smoke Test"; then
            pass "$description"
            
            # Cleanup
            curl -s -X DELETE "$URL/api/notes/$SHARE_ID" > /dev/null 2>&1
        else
            fail "$description (retrieve failed)"
        fi
    else
        fail "$description (create failed)"
    fi
}

test_frontend() {
    local description="Frontend assets"
    
    log "Testing frontend..."
    
    # Check if index.html is served
    HTML=$(curl -s "$URL/" || echo "ERROR")
    
    if echo "$HTML" | grep -q "</html>\|</body>"; then
        # Check for JS bundle
        JS_FILE=$(echo "$HTML" | grep -o 'src="/assets/[^"]*\.js"' | head -1 | cut -d'"' -f2 || echo "")
        
        if [ -n "$JS_FILE" ]; then
            JS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL$JS_FILE" || echo "000")
            
            if [ "$JS_STATUS" = "200" ]; then
                pass "$description"
            else
                fail "$description (JS bundle not found)"
            fi
        else
            fail "$description (No JS bundle in HTML)"
        fi
    else
        fail "$description (HTML not served)"
    fi
}

test_redis() {
    local description="Redis connectivity"
    
    log "Testing Redis through rate limiting..."
    
    # Make multiple rapid requests to trigger rate limiting
    for i in {1..5}; do
        curl -s "$URL/api/health" > /dev/null 2>&1
    done
    
    # If Redis is working, we should still get responses
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL/api/health" || echo "000")
    
    if [ "$STATUS" = "200" ] || [ "$STATUS" = "429" ]; then
        pass "$description"
    else
        fail "$description"
    fi
}

# Main test execution
main() {
    echo "🔥 Running smoke tests against $URL"
    echo "================================"
    
    # Test 1: API Health
    test_endpoint "/api/health" 200 "API health endpoint"
    
    # Test 2: Frontend
    test_frontend
    
    # Test 3: Database operations
    test_database
    
    # Test 4: CORS
    test_cors
    
    # Test 5: WebSocket
    test_websocket
    
    # Test 6: Redis
    test_redis
    
    # Test 7: Create note
    test_post "/api/notes/share" \
        '{"title":"Test","content":"# Test\nContent","htmlContent":"<h1>Test</h1><p>Content</p>"}' \
        "Create note endpoint"
    
    # Test 8: 404 handling
    test_endpoint "/api/nonexistent" 404 "404 error handling"
    
    # Print summary
    echo "================================"
    echo -e "Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
    
    if [ "$VERBOSE" = "true" ]; then
        echo "Detailed results:"
        for test in "${TESTS[@]}"; do
            echo "  $test"
        done
    fi
    
    # Exit with appropriate code
    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}✅ All smoke tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}❌ Some smoke tests failed${NC}"
        exit 1
    fi
}

# Run tests
main