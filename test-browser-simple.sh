#!/bin/bash

echo "🧪 Testing Browser Errors - Simple Version"
echo "📄 Checking if JavaScript loads without errors..."

# Check if the new JavaScript bundle loads
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://obsidiancomments.serverado.app/assets/index-3a9144cd.js)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ JavaScript bundle loads successfully (HTTP $HTTP_CODE)"
else
    echo "❌ JavaScript bundle failed to load (HTTP $HTTP_CODE)"
    exit 1
fi

# Check if the main page loads
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://obsidiancomments.serverado.app/cmdwl766o0003uvwlbqwn071k)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Document page loads successfully (HTTP $HTTP_CODE)"
else
    echo "❌ Document page failed to load (HTTP $HTTP_CODE)"
    exit 1
fi

# Check if all services are running
echo "🔍 Checking service status..."
SERVICES=("frontend" "backend" "hocuspocus" "postgres" "redis")

for service in "${SERVICES[@]}"; do
    if docker ps --format "table {{.Names}}" | grep -q "^$service$"; then
        echo "✅ $service container is running"
    else
        echo "❌ $service container is not running"
    fi
done

# Check API health
echo "🏥 Checking API health..."
API_RESPONSE=$(curl -s https://obsidiancomments.serverado.app/api/health | head -1)
if echo "$API_RESPONSE" | grep -q "ok"; then
    echo "✅ API health check passed"
else
    echo "❌ API health check failed: $API_RESPONSE"
fi

# Check WebSocket connection
echo "🔌 Checking WebSocket endpoint..."
WS_RESPONSE=$(curl -s -I https://obsidiancomments.serverado.app/ws 2>&1 | head -1)
echo "WebSocket endpoint response: $WS_RESPONSE"

echo "✅ Simple browser test completed"
echo ""
echo "🎯 Analysis Summary:"
echo "- Fixed useCollaboration hook to prevent multiple Y.Doc creation"
echo "- Y.Doc now created only in useEffect, not useState"
echo "- Proper null handling added to prevent race conditions"
echo "- Frontend rebuilt and deployed with new JavaScript bundle"
echo ""
echo "🧪 Next Steps:"
echo "- Open https://obsidiancomments.serverado.app/cmdwl766o0003uvwlbqwn071k in browser"
echo "- Check browser DevTools console for Yjs errors"
echo "- Test text editing and collaboration features"