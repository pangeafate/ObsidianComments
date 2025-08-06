#!/bin/bash
# Diagnose the 500 Internal Server Error

set -e

echo "🔍 DIAGNOSING 500 INTERNAL SERVER ERROR"
echo "========================================"

cd /opt/obsidian-comments

echo "1️⃣ NGINX STATUS AND LOGS"
echo "========================="
echo "nginx container status:"
docker ps | grep nginx || echo "No nginx container"

echo ""
echo "nginx container logs (last 20 lines):"
docker logs --tail 20 obsidian-nginx 2>&1 || echo "Can't get logs"

echo ""
echo "2️⃣ BACKEND SERVICE STATUS"
echo "=========================="
echo "PM2 status:"
pm2 list || echo "PM2 not available"

echo ""
echo "Backend service test:"
curl -I http://localhost:8081/api/health 2>&1 | head -5 || echo "Backend not responding"

echo ""
echo "3️⃣ FRONTEND STATIC FILES"
echo "========================="
echo "Frontend dist directory:"
ls -la /opt/obsidian-comments/packages/frontend/dist/ | head -10 || echo "Dist directory not found"

echo ""
echo "index.html exists?"
if [ -f "/opt/obsidian-comments/packages/frontend/dist/index.html" ]; then
    echo "✅ index.html exists"
    echo "File size: $(stat -c%s /opt/obsidian-comments/packages/frontend/dist/index.html) bytes"
else
    echo "❌ index.html missing!"
fi

echo ""
echo "4️⃣ NGINX FILE ACCESS TEST"
echo "=========================="
echo "Testing if nginx can access static files:"
docker exec obsidian-nginx ls -la /opt/obsidian-comments/packages/frontend/dist/ | head -5 2>&1 || echo "Can't access mounted directory"

echo ""
echo "Testing if nginx can read index.html:"
docker exec obsidian-nginx head -5 /opt/obsidian-comments/packages/frontend/dist/index.html 2>&1 || echo "Can't read index.html"

echo ""
echo "5️⃣ NGINX ERROR LOGS"
echo "===================="
echo "nginx error logs:"
docker exec obsidian-nginx cat /var/log/nginx/error.log 2>&1 || echo "No error logs available"

echo ""
echo "nginx access logs:"
docker exec obsidian-nginx tail -10 /var/log/nginx/access.log 2>&1 || echo "No access logs available"

echo ""
echo "6️⃣ TESTING DIFFERENT ENDPOINTS"
echo "==============================="
echo "Testing health endpoint:"
curl -I http://localhost/health 2>&1 | head -3 || echo "Health endpoint failed"

echo ""
echo "Testing API endpoint:"
curl -I http://localhost:8081/api/health 2>&1 | head -3 || echo "Direct API failed"

echo ""
echo "Testing API through nginx:"
curl -I https://localhost/api/health -k 2>&1 | head -3 || echo "API through nginx failed"

echo ""
echo "🎯 DIAGNOSIS COMPLETE"
echo "===================="