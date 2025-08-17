#!/bin/bash
# Production Deployment Script for ObsidianComments
# This script should be run on the production server

set -e

echo "🚀 Starting ObsidianComments Production Deployment"
echo "================================================"

# Configuration
DOMAIN="obsidiancomments.serverado.app"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-secure_password_here}"
JWT_SECRET="${JWT_SECRET:-secure_jwt_secret_here}"

# Pull latest code
echo "📦 Pulling latest code from GitHub..."
git pull origin main

# Check if SSL certificates exist
if [ ! -f "./data/certbot/conf/live/${DOMAIN}/fullchain.pem" ]; then
    echo "🔒 SSL certificates not found. Run init-letsencrypt.sh first!"
    echo "./init-letsencrypt.sh"
    exit 1
fi

# Build Docker images
echo "🏗️ Building Docker images..."
docker compose -f docker-compose.production.yml build

# Stop existing services
echo "⏹️ Stopping existing services..."
docker compose -f docker-compose.production.yml down

# Start database services first
echo "🗄️ Starting database services..."
docker compose -f docker-compose.production.yml up -d postgres redis

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "📊 Running database migrations..."
docker compose -f docker-compose.production.yml run --rm backend npx prisma migrate deploy

# Start all services
echo "🚀 Starting all services..."
docker compose -f docker-compose.production.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Health check
echo "🏥 Running health checks..."
curl -f http://localhost:8081/api/health || exit 1
curl -f http://localhost:8082/health || exit 1
curl -f http://localhost || exit 1
curl -f https://${DOMAIN}/api/health || echo "HTTPS health check failed (may take time to be ready)"

# Nginx is handled by Docker - no system nginx configuration needed

# Final health check
echo "✅ Running final health checks..."
sleep 5
curl -f https://${DOMAIN}/api/health || echo "HTTPS may take a moment to be fully ready"

echo "✅ Deployment completed successfully!"
echo "🌐 Application is now available at https://${DOMAIN}"
echo ""
echo "📊 Service Status:"
docker compose -f docker-compose.production.yml ps