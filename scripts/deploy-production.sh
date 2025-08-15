#!/bin/bash
set -e

echo "🚀 Production Deployment Script v2"
echo "=================================="

# Configuration
PROJECT_NAME="obsidian-comments"
COMPOSE_FILE="docker-compose.production.yml"

echo "📦 Step 1: Stopping existing services..."
docker-compose -p $PROJECT_NAME -f $COMPOSE_FILE down --remove-orphans 2>/dev/null || true

echo "🧹 Step 2: Cleaning up old containers..."
# Remove any containers with our project name
docker ps -a --format "{{.Names}}" | grep -E "^${PROJECT_NAME}" | xargs -r docker rm -f 2>/dev/null || true

echo "🌐 Step 3: Cleaning up networks..."
docker network ls --format "{{.Name}}" | grep -E "^${PROJECT_NAME}" | xargs -r docker network rm 2>/dev/null || true

echo "💾 Step 4: Creating fresh environment..."
# Ensure clean state
docker system prune -f --volumes 2>/dev/null || true

echo "📥 Step 5: Pulling latest images..."
# These should already be built and pushed by CI/CD
docker-compose -p $PROJECT_NAME -f $COMPOSE_FILE pull

echo "🚀 Step 6: Starting services..."
docker-compose -p $PROJECT_NAME -f $COMPOSE_FILE up -d --force-recreate

echo "⏳ Step 7: Waiting for services to be healthy..."
sleep 10

echo "🔍 Step 8: Checking service status..."
docker-compose -p $PROJECT_NAME -f $COMPOSE_FILE ps

echo "✅ Deployment complete!"
echo "🌐 Service URL: http://obsidiancomments.serverado.app"