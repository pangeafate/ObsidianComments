#!/bin/bash

# ObsidianComments Deployment Script
set -e

echo "🚀 Starting ObsidianComments deployment..."

# Server details
SERVER="root@46.101.189.137"
DEPLOY_DIR="/root/obsidian-comments"

# Build locally first
echo "📦 Building packages locally..."
cd packages/frontend && npm run build
cd ../backend && npm run build
cd ../..

# Create deployment archive
echo "📋 Creating deployment archive..."
tar -czf obsidian-comments-deploy.tar.gz \
    docker-compose.prod.yml \
    packages/docker/ \
    packages/frontend/dist/ \
    packages/frontend/package.json \
    packages/frontend/package-lock.json \
    packages/backend/dist/ \
    packages/backend/package.json \
    packages/backend/package-lock.json \
    packages/backend/prisma/ \
    --exclude="*.test.*" \
    --exclude="node_modules"

# Upload to server
echo "⬆️  Uploading to server..."
scp obsidian-comments-deploy.tar.gz $SERVER:/root/

# Deploy on server
echo "🔧 Deploying on server..."
ssh $SERVER << 'EOF'
    # Stop existing containers
    cd /root
    docker-compose -f docker-compose.prod.yml down || true
    
    # Clean up old deployment
    rm -rf obsidian-comments
    
    # Create deployment directory
    mkdir -p obsidian-comments
    
    # Extract new deployment
    tar -xzf obsidian-comments-deploy.tar.gz -C obsidian-comments/
    cd obsidian-comments
    
    # Create SSL directory (will be populated by Let's Encrypt)
    mkdir -p packages/docker/ssl
    
    # Create self-signed certificates for initial setup
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout packages/docker/ssl/key.pem \
        -out packages/docker/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=obsidiancomments.lakestrom.com"
    
    # Start services
    docker-compose -f docker-compose.prod.yml up -d --build
    
    # Wait for services to be ready
    echo "⏳ Waiting for services to start..."
    sleep 30
    
    # Run database migrations
    docker-compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy
    
    # Show status
    docker-compose -f docker-compose.prod.yml ps
EOF

# Clean up local files
rm obsidian-comments-deploy.tar.gz

echo "✅ Deployment complete!"
echo "🌐 Service should be available at: https://obsidiancomments.lakestrom.com"
echo "📊 Check status with: ssh $SERVER 'cd obsidian-comments && docker-compose -f docker-compose.prod.yml ps'"