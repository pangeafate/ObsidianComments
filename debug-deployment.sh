#!/bin/bash

echo "🔍 Debugging deployment status..."

# Check current directory and user
echo "Current user: $(whoami)"
echo "Current directory: $(pwd)"

# Find the project directory
if [ -d "$HOME/obsidian-comments" ]; then
    cd "$HOME/obsidian-comments"
    PROJECT_DIR="$HOME/obsidian-comments"
    echo "✅ Found project in: $PROJECT_DIR"
elif [ -d "/root/obsidian-comments" ]; then
    cd /root/obsidian-comments
    PROJECT_DIR="/root/obsidian-comments"
    echo "✅ Found project in: $PROJECT_DIR"
else
    echo "❌ Project directory not found!"
    exit 1
fi

echo ""
echo "📦 Docker containers status:"
docker ps -a

echo ""
echo "🔧 Docker compose services status:"
if [ -f "docker-compose.production.yml" ]; then
    /usr/bin/docker-compose -f docker-compose.production.yml ps
else
    echo "❌ docker-compose.production.yml not found"
fi

echo ""
echo "📊 System resources:"
free -h
df -h

echo ""
echo "🌐 Network connectivity:"
netstat -tlnp | grep :80 || echo "No service on port 80"
netstat -tlnp | grep :443 || echo "No service on port 443"

echo ""
echo "🔍 Docker logs (last 20 lines each):"
echo "--- Backend logs ---"
docker logs --tail 20 obsidian-comments-backend-1 2>/dev/null || echo "Backend container not found"

echo "--- Frontend logs ---"
docker logs --tail 20 obsidian-comments-frontend-1 2>/dev/null || echo "Frontend container not found"

echo "--- Nginx logs ---"
docker logs --tail 20 obsidian-comments-nginx-1 2>/dev/null || echo "Nginx container not found"

echo ""
echo "✅ Debug complete"