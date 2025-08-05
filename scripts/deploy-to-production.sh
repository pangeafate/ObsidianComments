#!/bin/bash

set -e

echo "🚀 Starting production deployment for ObsidianComments"

# Check if we're running as root or with sudo privileges
if [[ $EUID -ne 0 ]]; then
   echo "This script needs to be run with sudo privileges for Docker operations"
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
    echo "❌ Production docker-compose file not found!"
    exit 1
fi

# Load environment variables
if [ -f ".env.production.local" ]; then
    echo "🔧 Loading production environment variables"
    export $(cat .env.production.local | xargs)
else
    echo "⚠️  Warning: .env.production.local not found. Using defaults."
    echo "⚠️  Make sure to set POSTGRES_PASSWORD and JWT_SECRET!"
fi

# Ensure required environment variables are set
if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "❌ POSTGRES_PASSWORD must be set in .env.production.local"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo "❌ JWT_SECRET must be set in .env.production.local"
    exit 1
fi

echo "🐳 Building and starting Docker containers"

# Stop existing containers
echo "⏹️  Stopping existing containers"
docker-compose -f docker-compose.production.yml down --remove-orphans || true

# Pull latest images and build
echo "🏗️  Building containers"
docker-compose -f docker-compose.production.yml build --no-cache --pull

# Start services
echo "▶️  Starting services"
docker-compose -f docker-compose.production.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Health checks
echo "🏥 Running health checks"

# Check if containers are running
if ! docker-compose -f docker-compose.production.yml ps | grep -q "Up"; then
    echo "❌ Some containers failed to start"
    docker-compose -f docker-compose.production.yml logs
    exit 1
fi

# Check backend health
if ! curl -f http://localhost:8081/api/health; then
    echo "❌ Backend health check failed"
    docker-compose -f docker-compose.production.yml logs backend
    exit 1
fi

# Check if nginx is accessible (assuming it's running on port 80)
if ! curl -f http://localhost/health; then
    echo "❌ Nginx health check failed"
    docker-compose -f docker-compose.production.yml logs nginx
    exit 1
fi

# Clean up old Docker images
echo "🧹 Cleaning up old Docker images"
docker image prune -af

echo "✅ Deployment completed successfully!"
echo ""
echo "📊 Container status:"
docker-compose -f docker-compose.production.yml ps

echo ""
echo "🌐 Services should be available at:"
echo "   Frontend: https://obsidiancomments.serverado.app"
echo "   API: https://obsidiancomments.serverado.app/api"
echo "   WebSocket: wss://obsidiancomments.serverado.app/ws"

echo ""
echo "📝 Next steps:"
echo "   1. Configure SSL certificates"
echo "   2. Set up monitoring"
echo "   3. Run production tests: npm run test:production"
echo "   4. Test Obsidian plugin integration"

echo ""
echo "🚀 Deployment complete!"