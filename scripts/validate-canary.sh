#!/bin/bash
set -euo pipefail

# Canary validation script
# Returns 'true' if canary is healthy, 'false' otherwise

BASE_URL="https://obsidiancomments.serverado.app"
HEALTH_THRESHOLD=95  # 95% health check success rate

echo "🔍 Validating canary deployment..."

# Track health checks
HEALTH_CHECKS=0
HEALTHY_RESPONSES=0

# Run health checks 10 times over 30 seconds
for i in {1..10}; do
  RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "${BASE_URL}/api/health" || echo "000")
  HEALTH_CHECKS=$((HEALTH_CHECKS + 1))
  
  if [[ "$RESPONSE" == "200" ]]; then
    HEALTHY_RESPONSES=$((HEALTHY_RESPONSES + 1))
    echo "✅ Health check $i/10: OK"
  else
    echo "❌ Health check $i/10: Failed ($RESPONSE)"
  fi
  
  sleep 3
done

# Calculate health percentage
HEALTH_PERCENTAGE=$(echo "scale=2; $HEALTHY_RESPONSES * 100 / $HEALTH_CHECKS" | bc -l)

echo "📊 Health check results: ${HEALTHY_RESPONSES}/${HEALTH_CHECKS} (${HEALTH_PERCENTAGE}%)"

# Test critical functionality
echo "🧪 Testing critical functionality..."

# Test document creation
CREATE_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/notes/share" \
  -H "Content-Type: application/json" \
  -d '{"title":"Canary Test","content":"Canary validation test"}' \
  -w "%{http_code}" || echo "ERROR:000")

if [[ "$CREATE_RESPONSE" == *"200"* ]] || [[ "$CREATE_RESPONSE" == *"201"* ]]; then
  echo "✅ Document creation: OK"
  FUNCTIONALITY_OK=true
else
  echo "❌ Document creation: Failed"
  FUNCTIONALITY_OK=false
fi

# Overall canary health decision
if (( $(echo "$HEALTH_PERCENTAGE >= $HEALTH_THRESHOLD" | bc -l) )) && [ "$FUNCTIONALITY_OK" = true ]; then
  echo "🎉 Canary is healthy - ready for full deployment"
  echo "true"
else
  echo "🚨 Canary is unhealthy - rollback recommended"
  echo "false"
fi