#\!/bin/bash
echo "🔍 Checking Production Services Status..."

# Test API endpoints
echo "Testing API Health..."
curl -f --max-time 10 "http://138.197.187.49:8083/api/health" && echo "" || echo "❌ Health check failed"

echo "Testing API Note Creation..."
curl -X POST "http://138.197.187.49:8083/api/notes/share" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":"# Test\nProduction test"}' \
  --max-time 10 || echo "❌ Note creation failed"

echo "Testing Frontend..."
curl -I --max-time 10 "http://138.197.187.49:8080/" || echo "❌ Frontend check failed"
