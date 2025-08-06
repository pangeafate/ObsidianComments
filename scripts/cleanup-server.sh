#!/bin/bash

set -e

echo "🧹 Starting server cleanup for ObsidianComments"
echo "Server: 138.197.187.49 (obsidiancomments.serverado.app)"

# SSH connection details from GitHub Actions
DEPLOY_HOST="138.197.187.49"
DEPLOY_USER="${DEPLOY_USER:-root}"  # Will use SSH key from GitHub secrets

echo "📡 Connecting to server and performing cleanup..."

# Create cleanup commands to run on the server
cleanup_commands='
echo "🔍 Checking current server state..."
cd /opt/obsidian-comments || echo "Directory /opt/obsidian-comments does not exist"

echo "⏹️ Stopping all running services..."

# Stop Docker containers if they exist
if [ -f "docker-compose.production.yml" ]; then
    echo "🐳 Stopping Docker containers..."
    docker-compose -f docker-compose.production.yml down --remove-orphans --volumes || true
fi

# Stop any other docker-compose files
docker-compose -f docker-compose.yml down --remove-orphans --volumes 2>/dev/null || true
docker-compose -f docker-compose.prod.yml down --remove-orphans --volumes 2>/dev/null || true
docker-compose -f docker-compose.staging.yml down --remove-orphans --volumes 2>/dev/null || true

# Stop PM2 processes (as mentioned in the CI/CD pipeline)
echo "🔄 Stopping PM2 processes..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

echo "🧹 Cleaning up Docker resources..."

# Remove all containers (including stopped ones)
docker container prune -af || true

# Remove all unused images
docker image prune -af || true

# Remove all unused volumes 
docker volume prune -af || true

# Remove all unused networks
docker network prune -f || true

# Clean up any obsidian-specific containers/images
docker ps -a | grep obsidian | awk "{print \$1}" | xargs docker rm -f 2>/dev/null || true
docker images | grep obsidian | awk "{print \$3}" | xargs docker rmi -f 2>/dev/null || true

echo "🧹 Cleaning up application files..."

# Clean up log files
rm -rf /opt/obsidian-comments/logs/* 2>/dev/null || true
rm -rf /var/log/nginx/* 2>/dev/null || true

# Clean up temporary files
rm -rf /opt/obsidian-comments/tmp/* 2>/dev/null || true
rm -rf /tmp/obsidian* 2>/dev/null || true

echo "🔧 Restarting system services..."

# Restart Docker service to ensure clean state
systemctl restart docker || true

# Restart nginx if its running as a service (not in container)
systemctl restart nginx 2>/dev/null || true

echo "📊 Current system state after cleanup..."
echo "Docker containers:"
docker ps -a

echo ""
echo "Docker images:"
docker images | head -10

echo ""
echo "Disk usage:"
df -h / | head -2

echo ""
echo "Memory usage:"
free -h

echo ""
echo "PM2 processes:"
pm2 list 2>/dev/null || echo "No PM2 processes running"

echo ""
echo "✅ Server cleanup completed successfully!"
echo "🚀 Server is now ready for fresh deployment"
'

echo "Cleanup commands prepared. This will:"
echo "  ⏹️  Stop all Docker containers and PM2 processes"
echo "  🧹 Remove all Docker containers, images, volumes, and networks"
echo "  📁 Clean up log files and temporary files"
echo "  🔄 Restart Docker service"
echo "  📊 Show final system state"

echo ""
echo "⚠️  WARNING: This will completely purge the server!"
echo "⚠️  All running services and data will be removed!"
echo ""
echo "To execute this cleanup on the server, run:"
echo "ssh -i deploy_key $DEPLOY_USER@$DEPLOY_HOST '$cleanup_commands'"
echo ""
echo "Or if you have the GitHub Actions secrets configured, we can trigger"
echo "the CI/CD pipeline which will handle the cleanup and rebuild automatically."