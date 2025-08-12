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

# Build Docker images
echo "🏗️ Building Docker images..."
docker-compose -f docker-compose.production.yml build

# Stop existing services
echo "⏹️ Stopping existing services..."
docker-compose -f docker-compose.production.yml down

# Start database services first
echo "🗄️ Starting database services..."
docker-compose -f docker-compose.production.yml up -d postgres redis

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "📊 Running database migrations..."
docker-compose -f docker-compose.production.yml run --rm backend npx prisma migrate deploy

# Start all services
echo "🚀 Starting all services..."
docker-compose -f docker-compose.production.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Health check
echo "🏥 Running health checks..."
curl -f http://localhost:8081/api/health || exit 1
curl -f http://localhost:8082/health || exit 1
curl -f http://localhost:3000 || exit 1

# Configure Nginx (if needed)
echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/obsidiancomments << EOF
server {
    listen 80;
    server_name ${DOMAIN};
    
    # Redirect to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};
    
    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # WebSocket for collaboration
    location /ws {
        proxy_pass http://localhost:8082;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site and reload Nginx
ln -sf /etc/nginx/sites-available/obsidiancomments /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# SSL Certificate (if not already done)
if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo "🔒 Setting up SSL certificate..."
    certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN}
fi

# Final health check
echo "✅ Running final health checks..."
sleep 5
curl -f https://${DOMAIN}/api/health || exit 1

echo "✅ Deployment completed successfully!"
echo "🌐 Application is now available at https://${DOMAIN}"
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.production.yml ps