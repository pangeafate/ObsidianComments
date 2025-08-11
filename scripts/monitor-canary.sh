#!/bin/bash
set -euo pipefail

# Canary monitoring script
# Usage: ./monitor-canary.sh --duration 300 --error-threshold 1

DURATION=300  # 5 minutes default
ERROR_THRESHOLD=1  # 1% error rate default
BASE_URL="https://obsidiancomments.serverado.app"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --duration)
      DURATION="$2"
      shift 2
      ;;
    --error-threshold)
      ERROR_THRESHOLD="$2"
      shift 2
      ;;
    --url)
      BASE_URL="$2"
      shift 2
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

echo "🐤 Monitoring canary deployment for ${DURATION} seconds"
echo "📊 Error threshold: ${ERROR_THRESHOLD}%"
echo "🌐 Base URL: ${BASE_URL}"

# Counters
TOTAL_REQUESTS=0
ERROR_COUNT=0
START_TIME=$(date +%s)
END_TIME=$((START_TIME + DURATION))

# Monitor loop
while [ $(date +%s) -lt $END_TIME ]; do
  # Test critical endpoints
  ENDPOINTS=(
    "/api/health"
    "/api/notes/health-check-canary"
    "/"
  )
  
  for endpoint in "${ENDPOINTS[@]}"; do
    RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null "${BASE_URL}${endpoint}" || echo "000")
    
    TOTAL_REQUESTS=$((TOTAL_REQUESTS + 1))
    
    if [[ "$RESPONSE" -ge 400 ]] || [[ "$RESPONSE" == "000" ]]; then
      ERROR_COUNT=$((ERROR_COUNT + 1))
      echo "❌ Error: ${endpoint} returned ${RESPONSE}"
    fi
  done
  
  # Calculate current error rate
  if [ $TOTAL_REQUESTS -gt 0 ]; then
    ERROR_RATE=$(echo "scale=2; $ERROR_COUNT * 100 / $TOTAL_REQUESTS" | bc -l)
    
    # Check if error rate exceeds threshold
    if (( $(echo "$ERROR_RATE > $ERROR_THRESHOLD" | bc -l) )); then
      echo "🚨 Error rate ${ERROR_RATE}% exceeds threshold ${ERROR_THRESHOLD}%"
      echo "📊 Stats: ${ERROR_COUNT} errors out of ${TOTAL_REQUESTS} requests"
      exit 1
    fi
    
    echo "✅ Error rate: ${ERROR_RATE}% (${ERROR_COUNT}/${TOTAL_REQUESTS})"
  fi
  
  sleep 5
done

echo "🎉 Canary monitoring completed successfully"
echo "📊 Final stats: ${ERROR_COUNT} errors out of ${TOTAL_REQUESTS} requests"

if [ $TOTAL_REQUESTS -gt 0 ]; then
  FINAL_ERROR_RATE=$(echo "scale=2; $ERROR_COUNT * 100 / $TOTAL_REQUESTS" | bc -l)
  echo "📈 Final error rate: ${FINAL_ERROR_RATE}%"
fi