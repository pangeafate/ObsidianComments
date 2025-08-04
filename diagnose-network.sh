#!/bin/bash
# diagnose-network.sh

echo "=== Network Diagnostics ==="

# Check container connectivity
echo "1. Container Network Status:"
ssh root@138.197.187.49 'docker network inspect obsidian-comments_obsidian-network | grep -A 5 "Containers"'

# Test internal connectivity
echo -e "\n2. Internal Connectivity Tests:"
ssh root@138.197.187.49 << 'EOF'
  echo "Frontend -> Backend:"
  docker exec frontend wget -q -O- http://backend:8081/api/health 2>/dev/null | head -n1 || echo "FAILED"
  
  echo "Frontend -> Hocuspocus:"
  docker exec frontend wget -q -O- http://hocuspocus:8082/ 2>/dev/null | head -n1 || echo "FAILED"
  
  echo "Nginx -> Frontend:"
  docker exec obsidian-nginx wget -q -O- http://frontend:80/ 2>/dev/null | grep -o "<title>.*</title>" || echo "FAILED"
  
  echo "Nginx -> Backend:"
  docker exec obsidian-nginx wget -q -O- http://backend:8081/api/health 2>/dev/null || echo "FAILED"
  
  echo "Nginx -> Hocuspocus:"
  docker exec obsidian-nginx wget -q -O- http://hocuspocus:8082/ 2>/dev/null || echo "FAILED"
EOF

# Check logs for errors
echo -e "\n3. Recent Error Logs:"
ssh root@138.197.187.49 << 'EOF'
  echo "Frontend errors:"
  docker logs frontend 2>&1 | grep -i error | tail -5 || echo "No errors found"
  
  echo -e "\nBackend errors:"
  docker logs backend 2>&1 | grep -i error | tail -5 || echo "No errors found"
  
  echo -e "\nHocuspocus errors:"
  docker logs hocuspocus 2>&1 | grep -i error | tail -5 || echo "No errors found"
  
  echo -e "\nNginx errors:"
  docker logs obsidian-nginx 2>&1 | grep -i error | tail -5 || echo "No errors found"
EOF

echo -e "\n4. Service Status:"
ssh root@138.197.187.49 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'