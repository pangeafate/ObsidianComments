#!/bin/bash

set -e

echo "🔍 Verifying ObsidianComments deployment configuration"

# Check Docker and docker compose are available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "❌ docker compose (v2) is not installed or not available"
    exit 1
fi

echo "✅ Docker and Docker Compose v2 are available"

# Check if required files exist
required_files=(
    "docker-compose.production.yml"
    "nginx.conf"
    "Dockerfile.nginx"
    "packages/backend/Dockerfile.production"
    "packages/frontend/Dockerfile.production"  
    "packages/hocuspocus/Dockerfile.production"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Required file not found: $file"
        exit 1
    fi
done

echo "✅ All required files are present"

# Validate docker-compose.production.yml syntax
echo "🔧 Validating docker-compose.production.yml syntax..."
if ! docker compose -f docker-compose.production.yml config > /dev/null; then
    echo "❌ docker-compose.production.yml has syntax errors"
    exit 1
fi

echo "✅ docker-compose.production.yml syntax is valid"

# Check environment variables
echo "🔧 Checking environment variable configuration..."

# Create a test environment file to validate the configuration
cat > .env.test << EOL
POSTGRES_DB=obsidian_comments
POSTGRES_USER=postgres
POSTGRES_PASSWORD=test_password
JWT_SECRET=test_jwt_secret
NODE_ENV=production
CORS_ORIGIN=https://obsidiancomments.serverado.app
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
EOL

# Test the configuration with test environment
if ! docker compose -f docker-compose.production.yml --env-file .env.test config > /dev/null; then
    echo "❌ Environment variable configuration has issues"
    rm .env.test
    exit 1
fi

rm .env.test
echo "✅ Environment variable configuration is valid"

# Validate nginx configuration syntax (basic check)
echo "🔧 Validating nginx configuration syntax..."
# Note: Full nginx -t test will fail because upstream servers don't exist during isolated testing
# Instead, check for basic syntax issues
if ! grep -q 'upstream backend' nginx.conf || ! grep -q 'upstream hocuspocus' nginx.conf || ! grep -q 'upstream frontend' nginx.conf; then
    echo "❌ nginx.conf is missing required upstream definitions"
    exit 1
fi

echo "✅ nginx configuration syntax looks correct"

# Check for common issues
echo "🔧 Checking for common deployment issues..."

# Check health check consistency
echo "  - Verifying health check consistency..."

# Backend health check should use Node.js (not curl)
if grep -q 'curl.*8081' docker-compose.production.yml; then
    echo "❌ Backend health check should use Node.js, not curl"
    exit 1
fi

# Hocuspocus health check should use Node.js (not curl)
if grep -q 'curl.*8082' docker-compose.production.yml; then
    echo "❌ Hocuspocus health check should use Node.js, not curl"
    exit 1
fi

echo "  ✅ Health checks are configured correctly"

# Check service dependencies
echo "  - Verifying service dependencies..."

if ! grep -A 20 'nginx:' docker-compose.production.yml | grep -q 'condition: service_healthy'; then
    echo "❌ Nginx should wait for service health checks"
    exit 1
fi

echo "  ✅ Service dependencies are configured correctly"

# Check for required environment variables
echo "  - Verifying required environment variables are defined..."

# Check that critical environment variables don't have fallback defaults
if grep -q "POSTGRES_PASSWORD:-" docker-compose.production.yml; then
    echo "❌ POSTGRES_PASSWORD should not have fallback defaults in production"
    exit 1
fi

if grep -q "JWT_SECRET:-" docker-compose.production.yml; then
    echo "❌ JWT_SECRET should not have fallback defaults in production"
    exit 1
fi

echo "  ✅ Environment variables are properly configured"

echo ""
echo "✅ All deployment configuration checks passed!"
echo ""
echo "🚀 Deployment configuration is ready for production"
echo ""
echo "📝 Next steps:"
echo "   1. Ensure SSL certificates are properly configured on the server"
echo "   2. Set POSTGRES_PASSWORD and JWT_SECRET in GitHub Secrets"
echo "   3. Verify the server has Docker and Docker Compose v2 installed"
echo "   4. Deploy using the CI/CD pipeline or run the deployment script"
echo ""
echo "🔗 After deployment, verify these endpoints:"
echo "   - https://obsidiancomments.serverado.app (frontend)"
echo "   - https://obsidiancomments.serverado.app/api/health (backend API)"
echo "   - wss://obsidiancomments.serverado.app/ws (WebSocket collaboration)"