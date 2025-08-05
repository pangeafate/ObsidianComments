#!/bin/bash

# Deployment verification script
set -e

echo "🔍 Verifying ObsidianComments deployment..."

DOMAIN="https://obsidiancomments.serverado.app"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check frontend
echo -n "Checking frontend... "
if curl -sf $DOMAIN > /dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "Frontend is not accessible"
fi

# Check API health
echo -n "Checking API health... "
if curl -sf $DOMAIN/api/health > /dev/null; then
    echo -e "${GREEN}✓${NC}"
    HEALTH=$(curl -s $DOMAIN/api/health)
    echo "  Response: $HEALTH"
else
    echo -e "${RED}✗${NC}"
    echo "API health check failed"
fi

# Check WebSocket endpoint
echo -n "Checking WebSocket endpoint... "
if curl -sf -H "Connection: Upgrade" -H "Upgrade: websocket" $DOMAIN/ws 2>&1 | grep -q "400\|426"; then
    echo -e "${GREEN}✓${NC} (WebSocket upgrade required - normal response)"
else
    echo -e "${YELLOW}?${NC} (Cannot fully test WebSocket from curl)"
fi

# Check CORS headers
echo -n "Checking CORS headers... "
CORS_HEADERS=$(curl -sI -X OPTIONS $DOMAIN/api/health | grep -i "access-control-allow-origin" || true)
if [ -n "$CORS_HEADERS" ]; then
    echo -e "${GREEN}✓${NC}"
    echo "  $CORS_HEADERS"
else
    echo -e "${RED}✗${NC}"
    echo "CORS headers not found"
fi

# Check security headers
echo -n "Checking security headers... "
SECURITY_HEADERS=$(curl -sI $DOMAIN | grep -E "(X-Frame-Options|X-Content-Type-Options|X-XSS-Protection)" | wc -l)
if [ "$SECURITY_HEADERS" -ge "3" ]; then
    echo -e "${GREEN}✓${NC} ($SECURITY_HEADERS security headers found)"
else
    echo -e "${YELLOW}⚠${NC} (Only $SECURITY_HEADERS security headers found)"
fi

# Test document creation
echo -n "Testing document creation... "
CREATE_RESPONSE=$(curl -s -X POST $DOMAIN/api/notes/share \
    -H "Content-Type: application/json" \
    -d '{"title": "Test Document", "content": "# Test\n\nThis is a test document."}' || true)

if echo "$CREATE_RESPONSE" | grep -q "shareId"; then
    echo -e "${GREEN}✓${NC}"
    SHARE_ID=$(echo "$CREATE_RESPONSE" | grep -o '"shareId":"[^"]*"' | cut -d'"' -f4)
    echo "  Created document: $SHARE_ID"
    
    # Test document retrieval
    echo -n "Testing document retrieval... "
    if curl -sf $DOMAIN/api/notes/$SHARE_ID > /dev/null; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
    fi
else
    echo -e "${RED}✗${NC}"
    echo "  Response: $CREATE_RESPONSE"
fi

echo ""
echo "🏁 Verification complete!"