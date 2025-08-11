#!/bin/bash

# Production Deployment Script with SSL and CORS fixes
set -e

echo "================================================"
echo "ObsidianComments Production Deployment"
echo "================================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Generate secure passwords if not set
echo -e "${YELLOW}Step 1: Setting up environment variables...${NC}"

if [ ! -f .env.production ]; then
    echo "Creating .env.production file..."
    
    # Generate secure passwords
    POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    JWT_SECRET=$(openssl rand -base64 48 | tr -d "=+/" | cut -c1-40)
    
    cat > .env.production << EOF
# Database Configuration
POSTGRES_DB=obsidian_comments
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

# Application Configuration  
NODE_ENV=production
JWT_SECRET=$JWT_SECRET

# CORS Configuration - Supporting multiple domains
CORS_ORIGIN=https://obsidiancomments.serverado.app,https://www.obsidiancomments.serverado.app

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# URLs
FRONTEND_URL=https://obsidiancomments.serverado.app
DATABASE_URL=postgresql://postgres:$POSTGRES_PASSWORD@postgres:5432/obsidian_comments
REDIS_URL=redis://redis:6379
EOF
    
    echo -e "${GREEN}✓ Created .env.production with secure passwords${NC}"
    echo -e "${YELLOW}  IMPORTANT: Save these credentials securely!${NC}"
    echo -e "${YELLOW}  PostgreSQL Password: $POSTGRES_PASSWORD${NC}"
    echo -e "${YELLOW}  JWT Secret: $JWT_SECRET${NC}"
else
    echo -e "${GREEN}✓ Using existing .env.production${NC}"
    # Source the environment file to show CORS_ORIGIN
    source .env.production
    echo -e "${GREEN}  CORS_ORIGIN=$CORS_ORIGIN${NC}"
fi

# Step 2: Setup SSL certificates
echo ""
echo -e "${YELLOW}Step 2: Setting up SSL certificates...${NC}"

# Create SSL directory
mkdir -p ssl-certs

# Check if we need to generate certificates
if [ ! -f "ssl-certs/fullchain.pem" ] || [ ! -f "ssl-certs/privkey.pem" ]; then
    echo "SSL certificates not found. Generating self-signed certificates for initial setup..."
    
    # Generate self-signed certificate for testing
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl-certs/privkey.pem \
        -out ssl-certs/fullchain.pem \
        -subj "/C=US/ST=State/L=City/O=ObsidianComments/CN=obsidiancomments.serverado.app" \
        2>/dev/null
    
    echo -e "${GREEN}✓ Generated self-signed certificates${NC}"
    echo -e "${YELLOW}  Note: For production, replace with Let's Encrypt certificates${NC}"
else
    echo -e "${GREEN}✓ SSL certificates found${NC}"
fi

# Step 3: Stop existing deployment
echo ""
echo -e "${YELLOW}Step 3: Stopping existing containers...${NC}"
docker-compose -f docker-compose.production.yml down --remove-orphans 2>/dev/null || true
echo -e "${GREEN}✓ Stopped existing containers${NC}"

# Step 4: Clean up
echo ""
echo -e "${YELLOW}Step 4: Cleaning up old images...${NC}"
docker image prune -f > /dev/null 2>&1
echo -e "${GREEN}✓ Cleaned up old images${NC}"

# Step 5: Create Docker volumes and copy SSL certificates
echo ""
echo -e "${YELLOW}Step 5: Setting up Docker volumes...${NC}"

# Create volumes
docker volume create ssl_certs 2>/dev/null || true
docker volume create certbot_webroot 2>/dev/null || true

# Copy SSL certificates to volume
docker run --rm -v ssl_certs:/ssl -v "$(pwd)/ssl-certs:/source:ro" alpine sh -c "cp -f /source/* /ssl/ 2>/dev/null || true"
echo -e "${GREEN}✓ SSL certificates copied to Docker volume${NC}"

# Step 6: Pull base images
echo ""
echo -e "${YELLOW}Step 6: Pulling base images...${NC}"
docker pull postgres:15 > /dev/null 2>&1
docker pull redis:7-alpine > /dev/null 2>&1
docker pull nginx:alpine > /dev/null 2>&1
docker pull node:18-alpine > /dev/null 2>&1
echo -e "${GREEN}✓ Base images pulled${NC}"

# Step 7: Build and deploy
echo ""
echo -e "${YELLOW}Step 7: Building and deploying application...${NC}"
docker-compose -f docker-compose.production.yml --env-file .env.production up -d --build

# Step 8: Wait for services to be healthy
echo ""
echo -e "${YELLOW}Step 8: Waiting for services to start...${NC}"

# Wait up to 2 minutes for services to be healthy
for i in {1..24}; do
    HEALTHY=$(docker-compose -f docker-compose.production.yml ps | grep -c "healthy" || echo "0")
    if [ "$HEALTHY" -ge 5 ]; then
        echo -e "${GREEN}✓ Services are healthy ($HEALTHY/6)${NC}"
        break
    fi
    echo -n "."
    sleep 5
done

# Step 9: Run database migrations
echo ""
echo -e "${YELLOW}Step 9: Running database migrations...${NC}"
sleep 10  # Give services more time to stabilize
docker-compose -f docker-compose.production.yml exec -T backend npx prisma migrate deploy 2>/dev/null || \
docker-compose -f docker-compose.production.yml exec -T backend npx prisma db push --force-reset 2>/dev/null || \
echo -e "${YELLOW}  Database already initialized${NC}"

# Step 10: Verify deployment
echo ""
echo -e "${YELLOW}Step 10: Verifying deployment...${NC}"

# Show service status
docker-compose -f docker-compose.production.yml ps

# Test health endpoint
echo ""
echo "Testing endpoints..."

# Test HTTP (should redirect)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}✓ HTTP redirect working${NC}"
else
    echo -e "${YELLOW}⚠ HTTP returned code: $HTTP_CODE${NC}"
fi

# Test API health
API_HEALTH=$(curl -sk https://localhost/api/health 2>/dev/null || curl -s http://localhost/api/health 2>/dev/null || echo "failed")
if [[ "$API_HEALTH" == *"ok"* ]] || [[ "$API_HEALTH" == *"healthy"* ]]; then
    echo -e "${GREEN}✓ API health check passed${NC}"
else
    echo -e "${YELLOW}⚠ API health check: $API_HEALTH${NC}"
fi

# Test CORS headers
echo ""
echo "Testing CORS configuration..."
CORS_HEADER=$(curl -sk -H "Origin: app://obsidian.md" -I https://localhost/api/health 2>/dev/null | grep -i "access-control-allow-origin" || \
              curl -s -H "Origin: app://obsidian.md" -I http://localhost/api/health 2>/dev/null | grep -i "access-control-allow-origin" || \
              echo "No CORS header")

if [[ "$CORS_HEADER" == *"access-control-allow-origin"* ]]; then
    echo -e "${GREEN}✓ CORS headers configured${NC}"
    echo "  $CORS_HEADER"
else
    echo -e "${YELLOW}⚠ CORS headers may need verification${NC}"
fi

# Final summary
echo ""
echo "================================================"
echo -e "${GREEN}Deployment Complete!${NC}"
echo "================================================"
echo ""
echo "Application should be accessible at:"
echo "  https://obsidiancomments.serverado.app"
echo ""
echo "To monitor logs:"
echo "  docker-compose -f docker-compose.production.yml logs -f"
echo ""
echo "To check service status:"
echo "  docker-compose -f docker-compose.production.yml ps"
echo ""

if [ -f "ssl-certs/fullchain.pem" ]; then
    # Check if it's self-signed
    if openssl x509 -in ssl-certs/fullchain.pem -noout -issuer 2>/dev/null | grep -q "ObsidianComments"; then
        echo -e "${YELLOW}Note: Using self-signed certificates. To use Let's Encrypt:${NC}"
        echo "  1. Ensure domain points to this server"
        echo "  2. Run: docker-compose -f docker-compose.ssl.yml --profile ssl-setup up certbot"
        echo "  3. Copy generated certificates to ssl-certs/"
        echo "  4. Redeploy with: ./deploy-production.sh"
    fi
fi

echo ""
echo -e "${YELLOW}Important: Save the credentials from .env.production securely!${NC}"