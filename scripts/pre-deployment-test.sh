#!/bin/bash

# ShareNote Pre-Deployment Test Script
# Run this script before deploying to production to catch potential issues

set -e  # Exit on any error

echo "🚀 ShareNote Pre-Deployment Test Suite"
echo "======================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
WARNINGS=0

# Helper functions
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    ((TESTS_FAILED++))
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

log_info() {
    echo -e "ℹ️  $1"
}

# Test 1: Environment Variables Check
echo -e "\n📊 1. Environment Variables Check"
echo "--------------------------------"

check_env_var() {
    local var_name=$1
    local required=${2:-false}
    
    if [ -z "${!var_name}" ]; then
        if [ "$required" = true ]; then
            log_error "$var_name is required but not set"
        else
            log_warning "$var_name is not set (using default)"
        fi
    else
        log_success "$var_name is configured"
    fi
}

# Frontend environment variables (checked in packages/frontend/.env if exists)
if [ -f packages/frontend/.env ]; then
    source packages/frontend/.env
fi

check_env_var "VITE_API_URL" false
check_env_var "VITE_WS_URL" false

# Backend environment variables  
check_env_var "DATABASE_URL" false
check_env_var "REDIS_URL" false
check_env_var "JWT_SECRET" true
check_env_var "CORS_ORIGIN" false

# Test 2: Dependency Version Check
echo -e "\n📦 2. Dependency Version Check"  
echo "-----------------------------"

# Check Node.js version
NODE_VERSION=$(node --version | sed 's/v//')
REQUIRED_NODE="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_NODE" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_NODE" ]; then
    log_success "Node.js version $NODE_VERSION is compatible (>= $REQUIRED_NODE)"
else
    log_error "Node.js version $NODE_VERSION is too old (requires >= $REQUIRED_NODE)"
fi

# Check npm version
NPM_VERSION=$(npm --version)
log_info "Using npm version: $NPM_VERSION"

# Check new dependencies are installable
echo -e "\nChecking new dependencies..."

cd packages/frontend
if npm list dompurify > /dev/null 2>&1; then
    DOMPURIFY_VERSION=$(npm list dompurify --depth=0 | grep dompurify | sed 's/.*dompurify@//' | sed 's/ .*//')
    log_success "DOMPurify $DOMPURIFY_VERSION is installed"
else
    log_error "DOMPurify is not installed in frontend"
fi

cd ../backend
if npm list isomorphic-dompurify > /dev/null 2>&1; then
    ISOMORPHIC_VERSION=$(npm list isomorphic-dompurify --depth=0 | grep isomorphic-dompurify | sed 's/.*isomorphic-dompurify@//' | sed 's/ .*//')
    log_success "isomorphic-dompurify $ISOMORPHIC_VERSION is installed"
else
    log_error "isomorphic-dompurify is not installed in backend"
fi

cd ../..

# Test 3: Database Migration Check
echo -e "\n🗄️  3. Database Migration Check"
echo "-----------------------------"

cd packages/backend

# Check if Prisma is available
if command -v npx prisma > /dev/null; then
    log_success "Prisma CLI is available"
    
    # Check migration status (dry run)
    echo "Checking migration status..."
    if npx prisma migrate status > /dev/null 2>&1; then
        log_success "Database is up to date with migrations"
    else
        log_warning "Database migrations may need to be applied"
    fi
    
    # Validate migration file
    if [ -f "prisma/migrations/20250807_073422_add_html_support/migration.sql" ]; then
        log_success "HTML support migration file exists"
        
        # Check migration content
        if grep -q "htmlContent" "prisma/migrations/20250807_073422_add_html_support/migration.sql"; then
            log_success "Migration includes htmlContent column"
        else
            log_error "Migration missing htmlContent column"
        fi
        
        if grep -q "renderMode" "prisma/migrations/20250807_073422_add_html_support/migration.sql"; then
            log_success "Migration includes renderMode column"  
        else
            log_error "Migration missing renderMode column"
        fi
    else
        log_error "HTML support migration file not found"
    fi
else
    log_error "Prisma CLI not available"
fi

cd ../..

# Test 4: Build Test
echo -e "\n🔨 4. Build Test"
echo "---------------"

# Test backend build
echo "Testing backend build..."
cd packages/backend
if npm run build > /dev/null 2>&1; then
    log_success "Backend builds successfully"
else
    log_error "Backend build failed"
fi
cd ../..

# Test frontend build  
echo "Testing frontend build..."
cd packages/frontend
if npm run build > /dev/null 2>&1; then
    log_success "Frontend builds successfully"
    
    # Check if ViewPage is included in build
    if [ -d "dist" ]; then
        if find dist -name "*.js" -exec grep -l "ViewPage\|view.*document" {} \; | head -1 > /dev/null; then
            log_success "ViewPage component included in build"
        else
            log_warning "ViewPage component not found in build artifacts"
        fi
    fi
else
    log_error "Frontend build failed"
fi
cd ../..

# Test plugin build
echo "Testing plugin build..."
cd obsidian-plugin
if npm run build > /dev/null 2>&1; then
    log_success "ShareNote plugin builds successfully"
    
    # Check if main.js exists in release folder
    if [ -f "release/main.js" ]; then
        log_success "Plugin release artifacts created"
    else
        log_error "Plugin release artifacts missing"
    fi
else
    log_error "Plugin build failed"
fi
cd ..

# Test 5: Unit Tests
echo -e "\n🧪 5. Unit Tests"
echo "---------------"

# Backend tests
echo "Running backend tests..."
cd packages/backend
if npm test > /dev/null 2>&1; then
    log_success "Backend tests pass"
else
    log_error "Backend tests failed"
fi
cd ../..

# Frontend tests  
echo "Running frontend tests..."
cd packages/frontend
if npm test -- --watchAll=false > /dev/null 2>&1; then
    log_success "Frontend tests pass"
else
    log_error "Frontend tests failed"
fi
cd ../..

# Plugin tests
echo "Running plugin tests..."
cd obsidian-plugin
if npm test -- --watchAll=false > /dev/null 2>&1; then
    log_success "Plugin tests pass"
else
    log_error "Plugin tests failed"
fi
cd ..

# Test 6: Security Vulnerability Check
echo -e "\n🔒 6. Security Check"
echo "------------------"

# Check for high/critical vulnerabilities
echo "Checking backend security..."
cd packages/backend
BACKEND_AUDIT=$(npm audit --audit-level=high --json 2>/dev/null || echo '{"vulnerabilities":{}}')
BACKEND_VULN_COUNT=$(echo "$BACKEND_AUDIT" | jq -r '.metadata.vulnerabilities.high + .metadata.vulnerabilities.critical' 2>/dev/null || echo "0")

if [ "$BACKEND_VULN_COUNT" -eq 0 ]; then
    log_success "No high/critical vulnerabilities in backend"
else
    log_error "Found $BACKEND_VULN_COUNT high/critical vulnerabilities in backend"
fi
cd ../..

echo "Checking frontend security..."
cd packages/frontend  
FRONTEND_AUDIT=$(npm audit --audit-level=high --json 2>/dev/null || echo '{"vulnerabilities":{}}')
FRONTEND_VULN_COUNT=$(echo "$FRONTEND_AUDIT" | jq -r '.metadata.vulnerabilities.high + .metadata.vulnerabilities.critical' 2>/dev/null || echo "0")

if [ "$FRONTEND_VULN_COUNT" -eq 0 ]; then
    log_success "No high/critical vulnerabilities in frontend"
else
    log_error "Found $FRONTEND_VULN_COUNT high/critical vulnerabilities in frontend"
fi
cd ../..

# Test 7: Bundle Size Check
echo -e "\n📏 7. Bundle Size Check"
echo "----------------------"

cd packages/frontend
if [ -d "dist" ]; then
    BUNDLE_SIZE=$(du -sk dist/ | cut -f1)
    BUNDLE_SIZE_MB=$((BUNDLE_SIZE / 1024))
    
    if [ "$BUNDLE_SIZE_MB" -lt 5 ]; then
        log_success "Frontend bundle size is acceptable (${BUNDLE_SIZE_MB}MB)"
    elif [ "$BUNDLE_SIZE_MB" -lt 10 ]; then
        log_warning "Frontend bundle size is large (${BUNDLE_SIZE_MB}MB)"
    else
        log_error "Frontend bundle size is too large (${BUNDLE_SIZE_MB}MB)"
    fi
else
    log_warning "Frontend dist folder not found, run build first"
fi
cd ../..

# Test 8: Configuration Validation
echo -e "\n⚙️  8. Configuration Validation"
echo "-----------------------------"

# Check docker-compose configuration
if [ -f "docker-compose.production.yml" ]; then
    log_success "Production docker-compose configuration exists"
    
    # Validate compose file
    if command -v docker-compose > /dev/null; then
        if docker-compose -f docker-compose.production.yml config > /dev/null 2>&1; then
            log_success "Docker compose configuration is valid"
        else
            log_error "Docker compose configuration is invalid"
        fi
    else
        log_warning "docker-compose not available, skipping validation"
    fi
else
    log_error "Production docker-compose configuration missing"
fi

# Check nginx configuration
if [ -f "nginx.conf" ]; then
    log_success "Nginx configuration exists"
    
    # Basic nginx config validation
    if command -v nginx > /dev/null; then
        if nginx -t -c "$(pwd)/nginx.conf" > /dev/null 2>&1; then
            log_success "Nginx configuration is valid"
        else
            log_error "Nginx configuration is invalid"
        fi
    else
        log_warning "nginx not available for config validation"
    fi
else
    log_warning "Nginx configuration not found"
fi

# Test 9: Route Conflict Check
echo -e "\n🛣️  9. Route Conflict Check"
echo "-------------------------"

# Check for route conflicts in frontend
cd packages/frontend/src
if grep -r "path.*view" . > /dev/null 2>&1; then
    if grep -r "path.*share" . > /dev/null 2>&1; then
        log_success "Both /view and /share routes are configured"
    else
        log_warning "/view route exists but /share route not found"
    fi
else
    log_error "/view route not found in frontend routing"
fi
cd ../../..

# Test 10: Performance Baseline
echo -e "\n⚡ 10. Performance Check"
echo "----------------------"

# Check if DOMPurify performance is acceptable
cd packages/backend
node -e "
const DOMPurify = require('isomorphic-dompurify');
const testHtml = '<h1>Test</h1><p>Content with <script>alert(\"test\")</script> malicious code</p>';
const iterations = 1000;

const start = Date.now();
for(let i = 0; i < iterations; i++) {
    DOMPurify.sanitize(testHtml);
}
const end = Date.now();
const avgTime = (end - start) / iterations;

console.log('Average sanitization time: ' + avgTime.toFixed(2) + 'ms');
if(avgTime < 1) {
    console.log('✅ Performance acceptable');
    process.exit(0);
} else if(avgTime < 5) {
    console.log('⚠️ Performance borderline');  
    process.exit(1);
} else {
    console.log('❌ Performance too slow');
    process.exit(2);
}
" 2>/dev/null && log_success "HTML sanitization performance acceptable" || log_warning "HTML sanitization may be slow"

cd ../..

# Final Summary
echo -e "\n📋 Pre-Deployment Test Summary"
echo "=============================="

echo -e "✅ Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "❌ Tests Failed: ${RED}$TESTS_FAILED${NC}"  
echo -e "⚠️  Warnings: ${YELLOW}$WARNINGS${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All critical tests passed! Deployment should be safe.${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  However, please review the warnings above.${NC}"
    fi
    exit 0
else
    echo -e "\n${RED}🚨 ${TESTS_FAILED} critical test(s) failed! Do not deploy until these are resolved.${NC}"
    exit 1
fi