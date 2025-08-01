#!/bin/bash

# Troubleshooting Script for PostgreSQL Backend
# This script helps diagnose and fix common deployment issues

set -e

echo "🔧 PostgreSQL Backend Troubleshooting Tool"
echo "=========================================="

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

cd /root/obsidian-comments/backend

echo "🔍 Diagnostic Information:"
echo "========================="

print_status "Current directory: $(pwd)"
print_status "Current user: $(whoami)"
print_status "Date: $(date)"

echo ""
print_status "1. Docker System Status:"
docker version --format 'Docker version: {{.Server.Version}}'
docker-compose version --short

echo ""
print_status "2. Service Status:"
docker-compose ps

echo ""
print_status "3. Container Logs (last 20 lines each):"
echo ""
echo "--- Backend Logs ---"
docker-compose logs --tail=20 backend || print_error "Cannot get backend logs"

echo ""
echo "--- PostgreSQL Logs ---"
docker-compose logs --tail=20 postgres || print_error "Cannot get postgres logs"

echo ""
echo "--- Nginx Logs ---"
docker-compose logs --tail=20 nginx || print_error "Cannot get nginx logs"

echo ""
print_status "4. Network Connectivity Tests:"

# Test internal connectivity
print_status "Testing internal backend connection..."
if curl -f -s http://localhost:3000/api/health > /dev/null; then
    print_success "✅ Internal backend is reachable"
else
    print_error "❌ Internal backend is not reachable"
    print_status "Attempting to debug..."
    netstat -tlnp | grep :3000 || print_warning "Port 3000 not listening"
fi

# Test external connectivity
print_status "Testing external HTTPS connection..."
if curl -f -s https://obsidiancomments.lakestrom.com/api/health > /dev/null; then
    print_success "✅ External HTTPS is working"
else
    print_error "❌ External HTTPS is not working"
    print_status "Testing HTTP (port 80)..."
    if curl -f -s http://obsidiancomments.lakestrom.com/api/health > /dev/null; then
        print_warning "HTTP works but HTTPS doesn't - SSL issue"
    else
        print_error "Both HTTP and HTTPS failing - network/nginx issue"
    fi
fi

echo ""
print_status "5. Database Connection Test:"
if docker-compose exec -T postgres pg_isready -U postgres; then
    print_success "✅ PostgreSQL is accepting connections"
    
    print_status "Testing database access..."
    docker-compose exec -T postgres psql -U postgres -d obsidian_comments -c "SELECT version();" || print_error "Cannot query database"
    
    print_status "Checking tables..."
    docker-compose exec -T postgres psql -U postgres -d obsidian_comments -c "\dt" || print_error "Cannot list tables"
else
    print_error "❌ PostgreSQL is not accepting connections"
fi

echo ""
print_status "6. Configuration Files Check:"
if [ -f ".env" ]; then
    print_success "✅ .env file exists"
    echo "Environment variables count: $(wc -l < .env)"
else
    print_error "❌ .env file missing"
fi

if [ -f "docker-compose.yml" ]; then
    print_success "✅ docker-compose.yml exists"
else
    print_error "❌ docker-compose.yml missing"
fi

if [ -f "nginx.conf" ]; then
    print_success "✅ nginx.conf exists"
else
    print_error "❌ nginx.conf missing"
fi

echo ""
print_status "7. SSL Certificate Check:"
if [ -f "/etc/letsencrypt/live/obsidiancomments.lakestrom.com/fullchain.pem" ]; then
    print_success "✅ SSL certificate exists"
    
    # Check certificate validity
    if openssl x509 -checkend 86400 -noout -in /etc/letsencrypt/live/obsidiancomments.lakestrom.com/cert.pem; then
        print_success "✅ SSL certificate is valid for at least 24 hours"
    else
        print_error "❌ SSL certificate expires within 24 hours"
    fi
else
    print_error "❌ SSL certificate not found"
fi

echo ""
print_status "8. System Resources:"
echo "Memory usage:"
free -h

echo ""
echo "Disk usage:"
df -h /

echo ""
echo "Docker disk usage:"
docker system df

echo ""
echo "================================================"
echo "🛠️  COMMON FIXES"
echo "================================================"

echo ""
echo "🔄 If services are not running:"
echo "   docker-compose up -d --build"

echo ""
echo "🔄 If database is not connecting:"
echo "   docker-compose restart postgres"
echo "   docker-compose logs postgres"

echo ""
echo "🔄 If SSL is not working:"
echo "   docker run --rm -v /etc/letsencrypt:/etc/letsencrypt -v /var/www/certbot:/var/www/certbot certbot/certbot renew"
echo "   docker-compose restart nginx"

echo ""
echo "🔄 If CORS is not working:"
echo "   Check backend logs for CORS errors"
echo "   Verify Origin headers in requests"

echo ""
echo "🔄 If nothing works, full restart:"
echo "   docker-compose down"
echo "   docker system prune -f"
echo "   docker-compose up -d --build"

echo ""
echo "📞 For further help:"
echo "   - Check logs: docker-compose logs -f [service-name]"
echo "   - Monitor system: htop or top"
echo "   - Check network: netstat -tlnp"

print_success "Troubleshooting analysis complete!"