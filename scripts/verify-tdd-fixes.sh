#!/bin/bash

# Verify TDD Fixes for Production Deployment Issues
# This script validates all the fixes made using test-driven development

set -e

echo "================================================"
echo "Production Deployment TDD Fixes Verification"
echo "================================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
OVERALL_STATUS=0

# Function to run tests and report results
run_test() {
    local test_name=$1
    local test_file=$2
    
    echo -e "${YELLOW}Running: ${test_name}${NC}"
    
    if npx jest "$test_file" --silent 2>/dev/null; then
        echo -e "${GREEN}✓ ${test_name} passed${NC}"
    else
        echo -e "${RED}✗ ${test_name} failed${NC}"
        OVERALL_STATUS=1
    fi
    echo ""
}

# 1. Check SSL/HTTPS Configuration
echo "1. SSL/HTTPS Configuration Tests"
echo "---------------------------------"
# Run the entire SSL configuration test suite
run_test "SSL Configuration" "tests/production/ssl-configuration.test.js"

# 2. Check Nginx Server Configuration
echo "2. Nginx Server Configuration Tests"
echo "------------------------------------"
run_test "Nginx Server Names" "tests/production/nginx-server-config.test.js"

# 3. Check CORS Configuration
echo "3. CORS Environment Variable Tests"
echo "-----------------------------------"
cd packages/backend
run_test "CORS Config" "src/__tests__/cors-config.test.ts"
cd ../..

# 4. Run Complete Deployment Validation
echo "4. Complete Deployment Validation"
echo "----------------------------------"
run_test "Deployment Validation" "tests/production/deployment-validation.test.js"

# Summary
echo ""
echo "================================================"
if [ $OVERALL_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ All TDD fixes verified successfully!${NC}"
    echo ""
    echo "Summary of fixes applied:"
    echo "1. ✓ docker-compose.production.yml now uses nginx-ssl.conf"
    echo "2. ✓ SSL certificates volumes properly mounted"
    echo "3. ✓ nginx-ssl.conf server_name configuration fixed"
    echo "4. ✓ CORS now uses CORS_ORIGIN environment variable"
    echo "5. ✓ Frontend built with HTTPS/WSS URLs matching nginx SSL config"
    echo ""
    echo "Next steps:"
    echo "1. Ensure SSL certificates exist at /etc/nginx/ssl/ on production server"
    echo "2. Set CORS_ORIGIN environment variable in production"
    echo "3. Rebuild and redeploy using: docker-compose -f docker-compose.production.yml up --build -d"
else
    echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
    exit 1
fi

echo "================================================"