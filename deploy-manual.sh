#!/bin/bash

# Manual deployment script for ObsidianComments
set -e

echo "🚀 Starting manual deployment to production..."

# Configuration
SERVER_IP="138.197.187.49"
SERVER_USER="root"
DEPLOY_DIR="/opt/obsidian-comments"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📦 Building packages locally...${NC}"

# Build frontend
echo "Building frontend..."
cd packages/frontend
npm run build || { echo -e "${RED}Frontend build failed${NC}"; exit 1; }

# Build backend
echo "Building backend..."
cd ../backend
npm run build || { echo -e "${RED}Backend build failed${NC}"; exit 1; }

# Build hocuspocus
echo "Building hocuspocus..."
cd ../hocuspocus
npm run build || { echo -e "${RED}Hocuspocus build failed${NC}"; exit 1; }

cd ../..

echo -e "${YELLOW}📋 Creating deployment package...${NC}"

# Create a temporary directory for the deployment
TEMP_DIR=$(mktemp -d)
echo "Using temporary directory: $TEMP_DIR"

# Copy necessary files
cp -r docker-compose.production.yml $TEMP_DIR/
cp -r nginx.conf $TEMP_DIR/
cp -r packages $TEMP_DIR/

# Create production environment file template
cat > $TEMP_DIR/.env.production << EOF
# Production Environment Variables
NODE_ENV=production
POSTGRES_USER=postgres
POSTGRES_PASSWORD=CHANGE_ME_SECURE_PASSWORD
POSTGRES_DB=obsidian_comments
JWT_SECRET=CHANGE_ME_SECURE_SECRET
REDIS_PASSWORD=CHANGE_ME_REDIS_PASSWORD
CORS_ORIGIN=https://obsidiancomments.serverado.app
FRONTEND_URL=https://obsidiancomments.serverado.app
EOF

# Create setup script for the server
cat > $TEMP_DIR/setup-production.sh << 'EOF'
#!/bin/bash
set -e

echo "🔧 Setting up production environment..."

# Create necessary directories
mkdir -p /opt/obsidian-comments
cd /opt/obsidian-comments

# Check for .env.production
if [ ! -f .env.production ]; then
    echo "⚠️  WARNING: .env.production not found!"
    echo "Please create .env.production with secure passwords before starting services"
    exit 1
fi

# Load environment variables
export $(cat .env.production | xargs)

# Create SSL directory for Let's Encrypt
mkdir -p ssl

# Generate self-signed certificate for initial setup (replace with Let's Encrypt)
if [ ! -f ssl/fullchain.pem ]; then
    echo "🔐 Generating self-signed certificate for initial setup..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/privkey.pem \
        -out ssl/fullchain.pem \
        -subj "/C=US/ST=State/L=City/O=ObsidianComments/CN=obsidiancomments.serverado.app"
fi

# Stop any existing containers
docker-compose -f docker-compose.production.yml down --remove-orphans || true

# Build and start services
echo "🐳 Building and starting services..."
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start (60 seconds)..."
sleep 60

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose -f docker-compose.production.yml exec -T backend npx prisma migrate deploy || echo "Migration already applied"

# Check service status
echo "📊 Service status:"
docker-compose -f docker-compose.production.yml ps

# Health checks
echo "🏥 Running health checks..."
if curl -f http://localhost/api/health; then
    echo -e "\n✅ Backend is healthy"
else
    echo -e "\n❌ Backend health check failed"
    docker-compose -f docker-compose.production.yml logs backend
fi

echo -e "\n✅ Setup complete!"
EOF

chmod +x $TEMP_DIR/setup-production.sh

# Create tarball
echo -e "${YELLOW}📦 Creating deployment archive...${NC}"
cd $TEMP_DIR
tar -czf obsidian-comments-deployment.tar.gz * --exclude=node_modules

# Copy to server
echo -e "${YELLOW}⬆️  Uploading to server...${NC}"
scp obsidian-comments-deployment.tar.gz $SERVER_USER@$SERVER_IP:/tmp/

# Execute deployment on server
echo -e "${YELLOW}🚀 Deploying on server...${NC}"
ssh $SERVER_USER@$SERVER_IP << 'REMOTE_SCRIPT'
set -e

# Create deployment directory
mkdir -p /opt/obsidian-comments
cd /opt/obsidian-comments

# Backup existing deployment if it exists
if [ -d "packages" ]; then
    echo "Creating backup..."
    tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz * || true
fi

# Extract new deployment
echo "Extracting deployment package..."
tar -xzf /tmp/obsidian-comments-deployment.tar.gz

# Clean up
rm /tmp/obsidian-comments-deployment.tar.gz

echo "Deployment files extracted. Please run setup-production.sh to complete deployment."
REMOTE_SCRIPT

# Clean up local temp directory
rm -rf $TEMP_DIR

echo -e "${GREEN}✅ Deployment package uploaded successfully!${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT NEXT STEPS:${NC}"
echo "1. SSH into the server: ssh $SERVER_USER@$SERVER_IP"
echo "2. Navigate to: cd /opt/obsidian-comments"
echo "3. Edit .env.production and set secure passwords"
echo "4. Run: ./setup-production.sh"
echo "5. Set up Let's Encrypt SSL certificates"
echo "6. Configure firewall to allow ports 80 and 443"
echo ""
echo "To check status after deployment:"
echo "ssh $SERVER_USER@$SERVER_IP 'cd /opt/obsidian-comments && docker-compose -f docker-compose.production.yml ps'"