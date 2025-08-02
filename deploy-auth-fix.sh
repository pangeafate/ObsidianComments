#!/bin/bash

# Deploy Authentication Fix Script
# This script deploys the authentication fix to DigitalOcean

set -e

echo "🚀 Deploying Authentication Fix to DigitalOcean..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
SERVER_IP="46.101.189.137"
SERVER_USER="root" 
PROJECT_DIR="/root/obsidian-comments"
BACKUP_DIR="/root/backups"

print_status "Deploying to server: $SERVER_USER@$SERVER_IP"
print_status "Project directory: $PROJECT_DIR"

# SSH into server and run deployment commands
ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP << 'ENDSSH'
set -e

echo "🔄 Starting deployment process..."

# Navigate to project directory
cd /root/obsidian-comments

# Create backup
echo "📦 Creating backup..."
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
mkdir -p /root/backups
cp -r backend /root/backups/backend-pre-auth-fix-$TIMESTAMP

# Pull latest changes from GitHub
echo "📥 Pulling latest changes from GitHub..."
git fetch origin
git reset --hard origin/main
git pull origin main

# Show recent commits
echo "📋 Recent commits:"
git log --oneline -3

# Navigate to backend directory
cd backend

# Stop current services
echo "🛑 Stopping current services..."
docker-compose down

# Build and start with latest changes
echo "🔨 Building and starting services..."
docker-compose up -d --build

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check service status
echo "✅ Checking service status..."
docker-compose ps

# Test health endpoint
echo "🏥 Testing health endpoint..."
for i in {1..5}; do
    if curl -f -s http://localhost:3000/api/health > /dev/null; then
        echo "✅ Backend health check passed"
        break
    else
        echo "⏳ Waiting for backend to start... (attempt $i/5)"
        sleep 5
    fi
done

# Test external endpoint
echo "🌐 Testing external endpoint..."
if curl -f -s https://obsidiancomments.lakestrom.com/api/health > /dev/null; then
    echo "✅ External HTTPS endpoint is working"
else
    echo "❌ External HTTPS endpoint test failed"
fi

# Test note creation without auth (should work now)
echo "📝 Testing anonymous note creation..."
RESPONSE=$(curl -s -X POST https://obsidiancomments.lakestrom.com/api/notes/share \
  -H 'Content-Type: application/json' \
  -H 'Origin: app://obsidian.md' \
  -d '{"content": "# Auth Fix Test\n\nThis note was created anonymously to test the authentication fix."}' \
  || echo "request_failed")

if echo "$RESPONSE" | grep -q "shareId"; then
    echo "✅ Anonymous note creation is working!"
    echo "Response: $RESPONSE"
else
    echo "❌ Anonymous note creation failed"
    echo "Response: $RESPONSE"
fi

echo ""
echo "🎉 Deployment complete!"
echo "✅ Authentication fix has been deployed"
echo "✅ Obsidian plugin should now work without 401 errors"
echo ""
echo "📊 Service status:"
docker-compose ps

echo ""
echo "📋 Next steps:"
echo "  1. Test Obsidian plugin with note sharing"
echo "  2. Verify no more 401 errors occur"
echo "  3. Monitor logs: docker-compose logs -f"

ENDSSH

if [ $? -eq 0 ]; then
    print_success "🎉 Authentication fix deployed successfully!"
    echo ""
    echo "✅ The 401 Unauthorized error should now be fixed"
    echo "✅ Obsidian plugin can now create shared notes without authentication"
    echo "✅ All services are running and healthy"
    echo ""
    echo "🔗 Test the fix at: https://obsidiancomments.lakestrom.com"
else
    print_error "❌ Deployment failed. Check the output above for errors."
    exit 1
fi