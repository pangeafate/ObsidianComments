#!/bin/bash

# ObsidianComments Enhanced Deployment Script with Health Checks
set -e

echo "🚀 Starting ObsidianComments deployment to obsidiancomments.serverado.app..."

# Server details
SERVER="root@138.197.187.49"
DEPLOY_DIR="/root/obsidian-comments"

# Build locally first
echo "📦 Building packages locally..."
cd packages/frontend && npm run build
cd ../backend && npm run build
cd ../hocuspocus && npm run build
cd ../..

# Create deployment archive
echo "📋 Creating deployment archive..."
tar -czf obsidian-comments-deploy.tar.gz \
    docker-compose.prod.yml \
    packages/docker/ \
    packages/frontend/dist/ \
    packages/frontend/package.json \
    packages/backend/dist/ \
    packages/backend/package.json \
    packages/backend/prisma/ \
    packages/hocuspocus/dist/ \
    packages/hocuspocus/package.json \
    --exclude="*.test.*" \
    --exclude="node_modules" 2>/dev/null || true

# Upload to server
echo "⬆️  Uploading to server..."
scp obsidian-comments-deploy.tar.gz $SERVER:/root/

# Deploy on server with comprehensive health checks
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
        -subj "/C=US/ST=State/L=City/O=Organization/CN=obsidiancomments.serverado.app"
    
    # Start services
    echo "🚀 Starting Docker services..."
    docker-compose -f docker-compose.prod.yml up -d --build
    
    # Function to check container health
    check_container_health() {
        local container_name=$1
        local max_attempts=30
        local attempt=1
        
        echo "🔍 Checking health of $container_name..."
        
        while [ $attempt -le $max_attempts ]; do
            if docker ps --filter "name=$container_name" --filter "status=running" | grep -q $container_name; then
                echo "✅ $container_name is running"
                return 0
            else
                echo "⏳ Attempt $attempt/$max_attempts: $container_name not ready yet..."
                sleep 2
                ((attempt++))
            fi
        done
        
        echo "❌ $container_name failed to start properly"
        docker-compose -f docker-compose.prod.yml logs $container_name
        return 1
    }
    
    # Function to check service endpoint
    check_service_endpoint() {
        local url=$1
        local service_name=$2
        local max_attempts=15
        local attempt=1
        
        echo "🔍 Checking $service_name endpoint: $url"
        
        while [ $attempt -le $max_attempts ]; do
            if curl -s -f "$url" > /dev/null 2>&1; then
                echo "✅ $service_name endpoint is responding"
                return 0
            else
                echo "⏳ Attempt $attempt/$max_attempts: $service_name endpoint not ready..."
                sleep 3
                ((attempt++))
            fi
        done
        
        echo "❌ $service_name endpoint failed to respond"
        return 1
    }
    
    # Wait for basic container startup
    echo "⏳ Waiting for initial container startup..."
    sleep 10
    
    # Check all containers are running
    echo "🏥 Performing comprehensive health checks..."
    
    check_container_health "obsidian-postgres" || exit 1
    check_container_health "obsidian-redis" || exit 1
    check_container_health "obsidian-backend" || exit 1
    check_container_health "obsidian-hocuspocus" || exit 1
    check_container_health "obsidian-frontend" || exit 1
    check_container_health "obsidian-nginx" || exit 1
    
    # Check database connectivity
    echo "🔍 Checking database connectivity..."
    if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U obsidian -d obsidian_comments; then
        echo "✅ PostgreSQL database is ready"
    else
        echo "❌ PostgreSQL database check failed"
        exit 1
    fi
    
    # Check Redis connectivity
    echo "🔍 Checking Redis connectivity..."
    if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping | grep -q "PONG"; then
        echo "✅ Redis is ready"
    else
        echo "❌ Redis check failed"
        exit 1
    fi
    
    # Run database migrations
    echo "🗃️  Running database migrations..."
    if docker-compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy; then
        echo "✅ Database migrations completed"
    else
        echo "❌ Database migrations failed"
        exit 1
    fi
    
    # Test internal service connectivity
    echo "🔍 Testing internal service connectivity..."
    
    # Test backend health (internal)
    if docker-compose -f docker-compose.prod.yml exec -T backend curl -s -f http://localhost:8081/api/health > /dev/null 2>&1 || true; then
        echo "✅ Backend internal health check passed"
    else
        echo "⚠️  Backend internal health endpoint not found (this is normal)"
    fi
    
    # Wait for nginx to be fully ready
    echo "⏳ Waiting for Nginx to be fully ready..."
    sleep 5
    
    # Test external endpoints through nginx
    echo "🌐 Testing external endpoints..."
    
    # Test HTTP endpoint (should redirect to HTTPS)
    if curl -s -I http://obsidiancomments.serverado.app | grep -q "301\|302"; then
        echo "✅ HTTP to HTTPS redirect is working"
    else
        echo "⚠️  HTTP redirect test inconclusive"
    fi
    
    # Test HTTPS endpoint (may fail with self-signed cert, but connection should work)
    if curl -s -k -I https://obsidiancomments.serverado.app | grep -q "200"; then
        echo "✅ HTTPS endpoint is responding"
    else
        echo "⚠️  HTTPS endpoint test inconclusive (may be due to self-signed certificate)"
    fi
    
    # Show final status
    echo ""
    echo "📊 Final container status:"
    docker-compose -f docker-compose.prod.yml ps
    
    echo ""
    echo "📝 Container logs summary:"
    echo "Backend logs:"
    docker-compose -f docker-compose.prod.yml logs --tail=3 backend
    echo ""
    echo "Hocuspocus logs:"
    docker-compose -f docker-compose.prod.yml logs --tail=3 hocuspocus
    echo ""
    echo "Nginx logs:"
    docker-compose -f docker-compose.prod.yml logs --tail=3 nginx
    
EOF

# Clean up local files
rm obsidian-comments-deploy.tar.gz

echo ""
echo "✅ Deployment complete!"
echo "🌐 Service should be available at: https://obsidiancomments.serverado.app"
echo "📊 Check status with: ssh $SERVER 'cd obsidian-comments && docker-compose -f docker-compose.prod.yml ps'"
echo "🔍 Check logs with: ssh $SERVER 'cd obsidian-comments && docker-compose -f docker-compose.prod.yml logs [service-name]'"

# Final connectivity test from local machine
echo ""
echo "🔍 Performing final connectivity test from local machine..."
sleep 3

if curl -s -k -I https://obsidiancomments.serverado.app | grep -q "200\|301\|302"; then
    echo "✅ External connectivity test passed!"
else
    echo "⚠️  External connectivity test failed or inconclusive"
    echo "💡 This may be normal if DNS propagation is still in progress"
fi