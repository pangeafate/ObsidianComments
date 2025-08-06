#!/bin/bash

# Deploy services natively (Node.js directly, not in containers)
set -e

echo "🚀 Deploying services natively..."

SERVER_IP="138.197.187.49"
SERVER_USER="root"

# Upload source code
echo "📤 Uploading source code..."
rsync -avz --delete \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=test-results \
  --exclude=*.tar.gz \
  packages/ $SERVER_USER@$SERVER_IP:/opt/obsidian-comments/packages/

# Deploy on server
ssh $SERVER_USER@$SERVER_IP << 'DEPLOY_SCRIPT'
set -e

cd /opt/obsidian-comments

echo "📦 Setting up native deployment..."

# Stop Docker containers
docker-compose -f docker-compose.local-images.yml down 2>/dev/null || true

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Install PM2 for process management
npm install -g pm2 2>/dev/null || true

# Start databases only with Docker
cat > docker-compose.db-only.yml << 'DB_COMPOSE'
version: '3.8'

networks:
  obsidian_network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: obsidian_prod_db_2025_secure
      POSTGRES_DB: obsidian_comments
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - obsidian_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass obsidian_redis_2025_secure_pass
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - obsidian_network
    healthcheck:
      test: ["CMD", "redis-cli", "--no-auth-warning", "-a", "obsidian_redis_2025_secure_pass", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
DB_COMPOSE

echo "🗄️ Starting databases..."
docker-compose -f docker-compose.db-only.yml up -d

echo "⏳ Waiting for databases..."
sleep 20

# Setup backend
echo "🏗️ Setting up backend..."
cd packages/backend
npm install --production
npx prisma generate

# Wait for postgres
until docker exec obsidian-comments_postgres_1 pg_isready -U postgres 2>/dev/null; do
    echo "Waiting for postgres..."
    sleep 2
done

# Run migrations
DATABASE_URL="postgresql://postgres:obsidian_prod_db_2025_secure@localhost:5432/obsidian_comments" npx prisma migrate deploy

# Create PM2 ecosystem file
cd /opt/obsidian-comments
cat > ecosystem.config.js << 'PM2_CONFIG'
module.exports = {
  apps: [
    {
      name: 'obsidian-backend',
      cwd: '/opt/obsidian-comments/packages/backend',
      script: 'node',
      args: 'dist/index.js',
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://postgres:obsidian_prod_db_2025_secure@localhost:5432/obsidian_comments',
        REDIS_URL: 'redis://:obsidian_redis_2025_secure_pass@localhost:6379',
        JWT_SECRET: 'obsidian_jwt_secret_2025_very_secure_key',
        PORT: '8081',
        CORS_ORIGIN: 'https://obsidiancomments.serverado.app',
        FRONTEND_URL: 'https://obsidiancomments.serverado.app'
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1G',
      autorestart: true,
      watch: false
    },
    {
      name: 'obsidian-hocuspocus',
      cwd: '/opt/obsidian-comments/packages/hocuspocus',
      script: 'node',
      args: 'dist/server.js',
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://postgres:obsidian_prod_db_2025_secure@localhost:5432/obsidian_comments',
        REDIS_URL: 'redis://:obsidian_redis_2025_secure_pass@localhost:6379',
        PORT: '8082'
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1G',
      autorestart: true,
      watch: false
    }
  ]
};
PM2_CONFIG

# Setup hocuspocus
echo "🏗️ Setting up hocuspocus..."
cd packages/hocuspocus
npm install --production

# Setup nginx config for native services
cd /opt/obsidian-comments
cat > nginx-native.conf << 'NGINX_NATIVE'
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                   '$status $body_bytes_sent "$http_referer" '
                   '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    client_max_body_size 10M;

    server {
        listen 80;
        server_name obsidiancomments.serverado.app localhost;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Serve frontend
        root /opt/obsidian-comments/packages/frontend/dist;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        # API routes to backend
        location /api/ {
            proxy_pass http://localhost:8081;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Let backend handle CORS - remove nginx CORS headers to prevent conflicts
            # Backend already has proper CORS configuration with credentials support
        }

        # WebSocket to hocuspocus
        location /ws {
            proxy_pass http://localhost:8082;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
NGINX_NATIVE

# Stop any existing PM2 processes
pm2 delete all 2>/dev/null || true

# Start services with PM2
echo "🚀 Starting Node.js services..."
pm2 start ecosystem.config.js

# Start nginx
echo "🌐 Starting nginx..."
docker rm obsidian-nginx 2>/dev/null || true
docker run -d --name obsidian-nginx --network host -v /opt/obsidian-comments/nginx-native.conf:/etc/nginx/nginx.conf:ro -v /opt/obsidian-comments/packages/frontend/dist:/opt/obsidian-comments/packages/frontend/dist:ro nginx:alpine

echo "⏳ Waiting for services..."
sleep 10

# Check status
echo "📊 Service status:"
pm2 status
docker ps | grep obsidian-nginx

# Health check
echo "🏥 Health check:"
curl -f http://localhost/api/health && echo "✅ API is healthy" || echo "❌ API not responding"

echo "✅ Native deployment complete!"
echo "🌐 Frontend: http://138.197.187.49"
echo "🔗 API: http://138.197.187.49/api/health" 
DEPLOY_SCRIPT

echo "✅ Native deployment completed!"
echo ""
echo "Next steps:"
echo "1. Set up SSL: ssh $SERVER_USER@$SERVER_IP 'certbot --nginx -d obsidiancomments.serverado.app'"
echo "2. Verify deployment: ./scripts/verify-deployment.sh"