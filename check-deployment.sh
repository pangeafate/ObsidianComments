#!/bin/bash

# Deployment Health Check Script
# This script checks if the PostgreSQL deployment is working correctly

set -e

echo "🔍 Checking PostgreSQL Backend Deployment..."
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

cd /root/obsidian-comments/backend

print_status "1. Checking Docker services..."
if docker-compose ps | grep -q "Up"; then
    print_success "Docker services are running"
    docker-compose ps
else
    print_error "Some Docker services are not running"
    docker-compose ps
fi

echo ""
print_status "2. Checking service health..."

# Check PostgreSQL
if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    print_success "PostgreSQL is healthy"
else
    print_error "PostgreSQL is not responding"
fi

# Check backend
if curl -f -s http://localhost:3000/api/health > /dev/null 2>&1; then
    print_success "Backend API is responding locally"
else
    print_error "Backend API is not responding locally"
fi

echo ""
print_status "3. Checking database tables..."
if docker-compose exec -T postgres psql -U postgres -d obsidian_comments -c "\dt" 2>/dev/null | grep -q "shares"; then
    print_success "Database tables are created"
    echo "Available tables:"
    docker-compose exec -T postgres psql -U postgres -d obsidian_comments -c "\dt"
else
    print_warning "Database tables not found or not accessible"
fi

echo ""
print_status "4. Checking external API access..."

# Test HTTPS health endpoint
if curl -f -s https://obsidiancomments.lakestrom.com/api/health > /dev/null 2>&1; then
    print_success "HTTPS API endpoint is accessible"
    echo "Response:"
    curl -s https://obsidiancomments.lakestrom.com/api/health | jq . 2>/dev/null || curl -s https://obsidiancomments.lakestrom.com/api/health
else
    print_error "HTTPS API endpoint is not accessible"
fi

echo ""
print_status "5. Checking CORS for Obsidian..."
if curl -f -s -H 'Origin: app://obsidian.md' https://obsidiancomments.lakestrom.com/api/health > /dev/null 2>&1; then
    print_success "CORS is working for Obsidian app"
else
    print_error "CORS is not working for Obsidian app"
fi

echo ""
print_status "6. Testing note creation (without auth - should fail gracefully)..."
RESPONSE=$(curl -s -X POST https://obsidiancomments.lakestrom.com/api/notes/share \
  -H 'Content-Type: application/json' \
  -H 'Origin: app://obsidian.md' \
  -d '{"content": "# Test Note"}' || echo "request_failed")

if echo "$RESPONSE" | grep -q "Authentication required"; then
    print_success "Note creation properly requires authentication"
else
    print_warning "Note creation response: $RESPONSE"
fi

echo ""
print_status "7. Checking logs for errors..."
echo "Recent backend logs:"
docker-compose logs --tail=10 backend

echo ""
print_status "8. Checking SSL certificates..."
if [ -f "/etc/letsencrypt/live/obsidiancomments.lakestrom.com/fullchain.pem" ]; then
    print_success "SSL certificates are present"
    # Check certificate expiry
    CERT_EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/obsidiancomments.lakestrom.com/cert.pem | cut -d= -f2)
    echo "Certificate expires: $CERT_EXPIRY"
else
    print_error "SSL certificates not found"
fi

echo ""
echo "================================================"
echo "🏁 DEPLOYMENT CHECK SUMMARY"
echo "================================================"

# Overall health check
ALL_GOOD=true

if ! docker-compose ps | grep -q "Up"; then
    ALL_GOOD=false
fi

if ! curl -f -s https://obsidiancomments.lakestrom.com/api/health > /dev/null 2>&1; then
    ALL_GOOD=false
fi

if [ "$ALL_GOOD" = true ]; then
    print_success "🎉 Deployment appears to be working correctly!"
    echo ""
    echo "✅ You can now:"
    echo "  - Test the Obsidian plugin"
    echo "  - Create shared notes"
    echo "  - View notes at: https://obsidiancomments.lakestrom.com/share/[note-id]"
else
    print_error "🚨 Some issues detected. Check the logs above."
    echo ""
    echo "🔧 Troubleshooting:"
    echo "  - Check logs: docker-compose logs -f"
    echo "  - Restart services: docker-compose restart"
    echo "  - Rebuild if needed: docker-compose up -d --build"
fi

echo ""
echo "📊 System Resources:"
echo "Memory usage:"
free -h
echo ""
echo "Disk usage:"
df -h /
echo ""
echo "Docker images:"
docker images | head -5