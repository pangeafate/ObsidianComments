#!/bin/bash

# Deploy using GitHub Container Registry images
set -e

echo "🚀 Deploying from GitHub Container Registry..."

SERVER_IP="138.197.187.49"
SERVER_USER="root"

echo "⏳ Waiting for GitHub Actions to complete..."
echo "   Check status at: https://github.com/pangeafate/ObsidianComments/actions"
echo "   Press Enter when build is complete, or Ctrl+C to cancel"
read -p "   Continue with deployment? "

# Deploy to server
ssh $SERVER_USER@$SERVER_IP << 'DEPLOY_SCRIPT'
set -e

echo "📦 Setting up GitHub registry deployment..."

cd /opt/obsidian-comments

# Create docker-compose file for GitHub registry images
cat > docker-compose.github.yml << 'COMPOSE_FILE'
version: '3.8'

networks:
  obsidian_network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  nginx_logs:

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-obsidian_comments}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - obsidian_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres}"]
      interval: 30s
      timeout: 10s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - obsidian_network
    healthcheck:
      test: ["CMD", "redis-cli", "--no-auth-warning", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    image: ghcr.io/pangeafate/obsidiancomments-backend:latest
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - PORT=8081
      - CORS_ORIGIN=${CORS_ORIGIN}
      - FRONTEND_URL=${FRONTEND_URL}
    networks:
      - obsidian_network
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  hocuspocus:
    image: ghcr.io/pangeafate/obsidiancomments-hocuspocus:latest
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - PORT=8082
    networks:
      - obsidian_network
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    image: ghcr.io/pangeafate/obsidiancomments-frontend:latest
    networks:
      - obsidian_network
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - nginx_logs:/var/log/nginx
    depends_on:
      - frontend
      - backend
      - hocuspocus
    restart: unless-stopped
    networks:
      - obsidian_network
COMPOSE_FILE

# Stop existing containers
echo "⏹️ Stopping existing containers..."
docker stop obsidian-nginx 2>/dev/null || true
docker rm obsidian-nginx 2>/dev/null || true

# Load environment variables
export $(grep -v '^#' .env.production | xargs)

# Pull latest images (these will be public)
echo "📥 Pulling latest images..."
docker pull ghcr.io/pangeafate/obsidiancomments-backend:latest
docker pull ghcr.io/pangeafate/obsidiancomments-frontend:latest
docker pull ghcr.io/pangeafate/obsidiancomments-hocuspocus:latest

# Start services
echo "🚀 Starting services..."
docker-compose -f docker-compose.github.yml up -d

echo "⏳ Waiting for services to start..."
sleep 45

# Check status
echo "📊 Service status:"
docker-compose -f docker-compose.github.yml ps

# Run health checks
echo "🏥 Running health checks..."
for i in {1..10}; do
    if curl -f http://localhost/api/health 2>/dev/null; then
        echo "✅ Backend is healthy"
        break
    else
        echo "⏳ Waiting for backend... (attempt $i/10)"
        sleep 10
    fi
done

echo "✅ Deployment complete!"
echo "🌐 Service should be available at: http://138.197.187.49"
echo "📊 Check logs: docker-compose -f docker-compose.github.yml logs"
DEPLOY_SCRIPT

echo "✅ GitHub deployment completed!"
echo ""
echo "Next steps:"
echo "1. Set up SSL: ssh $SERVER_USER@$SERVER_IP './scripts/setup-letsencrypt.sh'"
echo "2. Verify deployment: ./scripts/verify-deployment.sh"
echo "3. Run production tests: npm run test:production"