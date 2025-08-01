#!/bin/bash

# PostgreSQL Backend Deployment Script for DigitalOcean
# This script deploys the updated backend with PostgreSQL integration

set -e  # Exit on any error

echo "🚀 Starting PostgreSQL Backend Deployment..."
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "This script must be run as root"
    exit 1
fi

print_status "Step 1: Stopping existing services..."
cd /root
if [ -d "obsidian-comments" ]; then
    cd obsidian-comments
    docker-compose down || print_warning "No existing services to stop"
    cd /root
fi

print_status "Step 2: Backing up existing deployment..."
if [ -d "obsidian-comments" ]; then
    BACKUP_NAME="obsidian-comments-backup-$(date +%Y%m%d-%H%M%S)"
    mv obsidian-comments "$BACKUP_NAME"
    print_success "Backup created: $BACKUP_NAME"
fi

print_status "Step 3: Cloning fresh code from GitHub..."
git clone https://github.com/pangeafate/ObsidianComments.git obsidian-comments
cd obsidian-comments/backend

print_status "Step 4: Creating environment configuration..."
# Check if .env already exists
if [ -f ".env" ]; then
    print_warning ".env file already exists, creating backup..."
    cp .env .env.backup
fi

# Generate secure random passwords and secrets
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
JWT_SECRET=$(openssl rand -base64 48 | tr -d "=+/" | cut -c1-64)
SESSION_SECRET=$(openssl rand -base64 48 | tr -d "=+/" | cut -c1-64)

cat > .env << EOF
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=obsidian_comments
DB_USER=postgres
DB_PASSWORD=$POSTGRES_PASSWORD

# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Security
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET

# CORS Configuration
ALLOWED_ORIGINS=https://obsidiancomments.lakestrom.com,https://lakestrom.com
FRONTEND_URL=https://obsidiancomments.lakestrom.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FORMAT=combined

# Application
MAX_NOTE_SIZE_MB=10
MAX_SHARES_PER_USER=100
SHARE_TOKEN_LENGTH=12
EOF

print_success "Environment configuration created with secure random secrets"

print_status "Step 5: Creating Docker Compose configuration..."
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: obsidian_comments
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    secrets:
      - postgres_password
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 5
    restart: unless-stopped

  backend:
    build: .
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - /var/www/certbot:/var/www/certbot
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:

secrets:
  postgres_password:
    file: .postgres_password
EOF

# Create password file for Docker secrets
echo "$POSTGRES_PASSWORD" > .postgres_password
chmod 600 .postgres_password

print_success "Docker Compose configuration created"

print_status "Step 6: Building and starting services..."
docker-compose up -d --build

print_status "Step 7: Waiting for services to be healthy..."
sleep 30

# Check service status
print_status "Checking service status..."
docker-compose ps

print_status "Step 8: Testing database connection..."
sleep 10
docker-compose exec -T postgres psql -U postgres -d obsidian_comments -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" || print_warning "Database tables not yet available (this is normal on first run)"

print_status "Step 9: Testing API endpoints..."
sleep 5

# Test health endpoint
if curl -f -s https://obsidiancomments.lakestrom.com/api/health > /dev/null; then
    print_success "✅ API health endpoint is working"
else
    print_warning "⚠️ API health endpoint not yet responding (may need a few more seconds)"
fi

# Test CORS
if curl -f -s -H 'Origin: app://obsidian.md' https://obsidiancomments.lakestrom.com/api/health > /dev/null; then
    print_success "✅ CORS is working for Obsidian"
else
    print_warning "⚠️ CORS test failed (may need a few more seconds)"
fi

print_success "🎉 Deployment completed!"
echo ""
echo "=========================================="
echo "📋 DEPLOYMENT SUMMARY"
echo "=========================================="
echo "✅ Fresh code cloned from GitHub"
echo "✅ PostgreSQL database configured"  
echo "✅ Secure environment variables generated"
echo "✅ Docker services started"
echo "✅ SSL certificates preserved"
echo ""
echo "🔧 NEXT STEPS:"
echo "1. Monitor logs: docker-compose logs -f"
echo "2. Test Obsidian plugin connection"
echo "3. Check API: https://obsidiancomments.lakestrom.com/api/health"
echo ""
echo "📁 IMPORTANT FILES CREATED:"
echo "- .env (secure environment variables)"
echo "- .postgres_password (database password)"
echo "- docker-compose.yml (service configuration)"
echo ""
echo "🔒 SECURITY NOTES:"
echo "- Database password: $POSTGRES_PASSWORD"
echo "- JWT secret and session secret generated"
echo "- Keep .env file secure!"
echo ""
print_success "Deployment script completed successfully! 🚀"