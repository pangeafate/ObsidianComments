#!/bin/bash

set -e

echo "🚀 Starting production deployment for ObsidianComments with Docker clean slate approach"

# Check if Docker and docker compose are available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "❌ docker compose (v2) is not installed or not available"
    exit 1
fi

# Configuration
DEPLOYMENT_DIR="/opt/obsidian-comments"
BACKUP_DIR="/opt/obsidian-comments-backup-$(date +%Y%m%d-%H%M%S)"
REPO_URL="https://github.com/your-username/obsidian-comments.git"

echo "📂 Setting up deployment directory: $DEPLOYMENT_DIR"

# Create deployment directory if it doesn't exist
mkdir -p $DEPLOYMENT_DIR
cd $DEPLOYMENT_DIR

# Backup existing deployment if it exists
if [ -d ".git" ]; then
    echo "💾 Creating backup of existing deployment"
    cp -r $DEPLOYMENT_DIR $BACKUP_DIR
fi

# Clone or update repository
if [ ! -d ".git" ]; then
    echo "📥 Cloning repository"
    git clone $REPO_URL .
else
    echo "🔄 Updating repository"
    git fetch origin
    git reset --hard origin/main
fi

# Check if required files exist
if [ ! -f "docker-compose.production.yml" ]; then
    echo "❌ Production docker compose file not found!"
    exit 1
fi

# Load environment variables
if [ -f ".env.production" ]; then
    echo "🔧 Loading production environment variables"
    export $(cat .env.production | xargs)
else
    echo "⚠️  Warning: .env.production not found. Creating default environment file."
    echo "⚠️  Make sure to update POSTGRES_PASSWORD and JWT_SECRET!"
    
    cat > .env.production << EOF
POSTGRES_DB=obsidian_comments
POSTGRES_USER=postgres
POSTGRES_PASSWORD=production_password_change_me
JWT_SECRET=change_me_in_production_$(openssl rand -hex 32)
NODE_ENV=production
CORS_ORIGIN=https://obsidiancomments.serverado.app
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
EOF
fi

# Ensure required environment variables are set
if [ -z "$POSTGRES_PASSWORD" ] || [ "$POSTGRES_PASSWORD" = "production_password_change_me" ]; then
    echo "❌ POSTGRES_PASSWORD must be set to a secure value in .env.production"
    exit 1
fi

if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "change_me_in_production" ]; then
    echo "❌ JWT_SECRET must be set to a secure value in .env.production"
    exit 1
fi

echo "🐳 Starting clean slate Docker deployment"

# Clean slate approach: Stop and remove everything
echo "🧹 Clean slate: Stopping and removing all existing containers..."
docker compose -f docker-compose.production.yml down --volumes --remove-orphans || true

# Remove all related images to force rebuild
echo "🗑️  Removing old images to force fresh build..."
docker image prune -af || true
docker images | grep -E "(obsidian|nginx)" | awk '{print $3}' | xargs -r docker rmi -f || true

# Pull latest base images
echo "📥 Pulling latest base images..."
docker pull postgres:15
docker pull redis:7-alpine
docker pull nginx:alpine
docker pull node:18-alpine

# Build all services with no cache
echo "🏗️  Building containers with no cache..."
docker compose -f docker-compose.production.yml --env-file .env.production build --no-cache --pull

# Start services with force recreate
echo "▶️  Starting services with force recreate..."
docker compose -f docker-compose.production.yml --env-file .env.production up -d --force-recreate

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 15

# Comprehensive health checks
echo "🏥 Running comprehensive health checks..."

# Wait for database to be ready first
echo "🗄️  Waiting for PostgreSQL to be ready..."
for i in {1..60}; do
    if docker compose -f docker-compose.production.yml exec postgres pg_isready -U postgres; then
        echo "✅ PostgreSQL is ready"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "❌ PostgreSQL health check timeout"
        docker compose -f docker-compose.production.yml logs postgres
        exit 1
    fi
    sleep 2
done

# Wait for Redis to be ready
echo "📮 Waiting for Redis to be ready..."
for i in {1..30}; do
    if docker compose -f docker-compose.production.yml exec redis redis-cli ping | grep -q "PONG"; then
        echo "✅ Redis is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Redis health check timeout"
        docker compose -f docker-compose.production.yml logs redis
        exit 1
    fi
    sleep 2
done

# Wait for backend to be healthy
echo "⚙️  Waiting for backend service to be healthy..."
for i in {1..60}; do
    if docker compose -f docker-compose.production.yml ps backend | grep -q "healthy"; then
        echo "✅ Backend is healthy"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "❌ Backend health check timeout"
        docker compose -f docker-compose.production.yml logs backend
        exit 1
    fi
    sleep 5
done

# Wait for hocuspocus to be healthy
echo "🔄 Waiting for hocuspocus service to be healthy..."
for i in {1..60}; do
    if docker compose -f docker-compose.production.yml ps hocuspocus | grep -q "healthy"; then
        echo "✅ Hocuspocus is healthy"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "❌ Hocuspocus health check timeout"
        docker compose -f docker-compose.production.yml logs hocuspocus
        exit 1
    fi
    sleep 5
done

# Wait for frontend to be healthy
echo "🎨 Waiting for frontend service to be healthy..."
for i in {1..60}; do
    if docker compose -f docker-compose.production.yml ps frontend | grep -q "healthy"; then
        echo "✅ Frontend is healthy"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "❌ Frontend health check timeout"
        docker compose -f docker-compose.production.yml logs frontend
        exit 1
    fi
    sleep 5
done

# Wait for nginx to be healthy
echo "🌐 Waiting for nginx service to be healthy..."
for i in {1..60}; do
    if docker compose -f docker-compose.production.yml ps nginx | grep -q "healthy"; then
        echo "✅ Nginx is healthy"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "❌ Nginx health check timeout"
        docker compose -f docker-compose.production.yml logs nginx
        exit 1
    fi
    sleep 5
done

# Test external connectivity
echo "🔗 Testing external connectivity..."
if curl -f http://localhost/health; then
    echo "✅ External HTTP connectivity verified"
else
    echo "❌ External HTTP connectivity failed"
    docker compose -f docker-compose.production.yml logs nginx
    exit 1
fi

# Test internal service connectivity
echo "🔗 Testing internal service connectivity..."

# Test nginx -> backend
if docker compose -f docker-compose.production.yml exec -T nginx curl -f http://backend:8081/api/health; then
    echo "✅ Nginx -> Backend connectivity verified"
else
    echo "❌ Nginx cannot reach backend service"
    docker compose -f docker-compose.production.yml logs nginx
    docker compose -f docker-compose.production.yml logs backend
    exit 1
fi

# Test nginx -> hocuspocus
if docker compose -f docker-compose.production.yml exec -T nginx curl -f http://hocuspocus:8082/health; then
    echo "✅ Nginx -> Hocuspocus connectivity verified"
else
    echo "❌ Nginx cannot reach hocuspocus service"
    docker compose -f docker-compose.production.yml logs nginx
    docker compose -f docker-compose.production.yml logs hocuspocus
    exit 1
fi

# Test nginx -> frontend
if docker compose -f docker-compose.production.yml exec -T nginx curl -f http://frontend; then
    echo "✅ Nginx -> Frontend connectivity verified"
else
    echo "❌ Nginx cannot reach frontend service"
    docker compose -f docker-compose.production.yml logs nginx
    docker compose -f docker-compose.production.yml logs frontend
    exit 1
fi

echo "✅ All service connections verified"

# Final verification
echo "🏥 Final deployment verification..."
docker compose -f docker-compose.production.yml ps

echo "✅ Clean slate deployment completed successfully!"
echo ""
echo "📊 All services are running and healthy:"
docker compose -f docker-compose.production.yml ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🌐 Services should be available at:"
echo "   Frontend: https://obsidiancomments.serverado.app"
echo "   API: https://obsidiancomments.serverado.app/api"
echo "   WebSocket: wss://obsidiancomments.serverado.app/ws"

echo ""
echo "📝 Next steps:"
echo "   1. Verify SSL certificates are working: https://obsidiancomments.serverado.app"
echo "   2. Test API endpoints: https://obsidiancomments.serverado.app/api/health"
echo "   3. Test Obsidian plugin integration"
echo "   4. Monitor logs: docker compose -f docker-compose.production.yml logs -f"

echo ""
echo "🚀 Clean slate Docker deployment complete!"