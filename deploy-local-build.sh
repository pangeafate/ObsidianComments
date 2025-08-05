#!/bin/bash

# Build Docker images locally and deploy
set -e

echo "🚀 Building and deploying Docker images locally..."

SERVER_IP="138.197.187.49"
SERVER_USER="root"

echo "🏗️ Building Docker images locally..."

# Build backend
cd packages/backend
echo "Building backend..."
docker build -f Dockerfile.production -t obsidian-backend:latest .

# Build frontend  
cd ../frontend
echo "Building frontend..."
docker build -f Dockerfile.production -t obsidian-frontend:latest .

# Build hocuspocus
cd ../hocuspocus
echo "Building hocuspocus..."
docker build -f Dockerfile.production -t obsidian-hocuspocus:latest .

cd ../..

echo "💾 Saving images..."
docker save obsidian-backend:latest obsidian-frontend:latest obsidian-hocuspocus:latest | gzip > obsidian-images.tar.gz

echo "📤 Uploading images to server..."
scp obsidian-images.tar.gz $SERVER_USER@$SERVER_IP:/tmp/

echo "🚀 Deploying on server..."
ssh $SERVER_USER@$SERVER_IP << 'DEPLOY_SCRIPT'
set -e

echo "📥 Loading Docker images..."
cd /tmp
docker load < obsidian-images.tar.gz
rm obsidian-images.tar.gz

cd /opt/obsidian-comments

# Create deployment compose file
cat > docker-compose.local-images.yml << 'COMPOSE_FILE'
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
    image: obsidian-backend:latest
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
    image: obsidian-hocuspocus:latest
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
    image: obsidian-frontend:latest
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

# Start services
echo "🚀 Starting services..."
docker-compose -f docker-compose.local-images.yml up -d

echo "⏳ Waiting for services to start..."
sleep 60

# Check status
echo "📊 Service status:"
docker-compose -f docker-compose.local-images.yml ps

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
echo "🌐 Frontend: http://138.197.187.49"
echo "🔗 API: http://138.197.187.49/api/health"
DEPLOY_SCRIPT

# Cleanup local files
rm obsidian-images.tar.gz

echo "✅ Local build deployment completed!"
echo ""
echo "Next steps:"
echo "1. Set up SSL: ssh $SERVER_USER@$SERVER_IP 'cd /opt/obsidian-comments && ./scripts/setup-letsencrypt.sh'"
echo "2. Verify deployment: ./scripts/verify-deployment.sh"