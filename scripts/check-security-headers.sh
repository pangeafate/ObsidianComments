#!/bin/bash
set -euo pipefail

# Security headers validation script for production deployment
# Usage: ./check-security-headers.sh <url>

URL=${1:-https://obsidiancomments.serverado.app}

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔒 Checking security headers for: $URL"
echo "================================================"

# Fetch headers
HEADERS=$(curl -I -s "$URL" | tr -d '\r')

# Track overall status
PASS=0
FAIL=0
WARN=0

check_header() {
    local header_name=$1
    local required=${2:-true}
    local expected_value=$3
    
    local header_value=$(echo "$HEADERS" | grep -i "^$header_name:" | cut -d':' -f2- | sed 's/^ *//' || echo "")
    
    if [[ -n "$header_value" ]]; then
        if [[ -n "$expected_value" ]]; then
            if [[ "$header_value" == *"$expected_value"* ]]; then
                echo -e "${GREEN}✅${NC} $header_name: $header_value"
                ((PASS++))
            else
                echo -e "${RED}❌${NC} $header_name: $header_value (expected: $expected_value)"
                ((FAIL++))
            fi
        else
            echo -e "${GREEN}✅${NC} $header_name: $header_value"
            ((PASS++))
        fi
    else
        if [[ "$required" == "true" ]]; then
            echo -e "${RED}❌${NC} $header_name: MISSING (required)"
            ((FAIL++))
        else
            echo -e "${YELLOW}⚠️${NC} $header_name: MISSING (recommended)"
            ((WARN++))
        fi
    fi
}

# Check critical security headers
echo "Critical Security Headers:"
check_header "Strict-Transport-Security" true "max-age="
check_header "X-Content-Type-Options" true "nosniff"
check_header "X-Frame-Options" true
check_header "Content-Security-Policy" true

echo ""
echo "Additional Security Headers:"
check_header "X-XSS-Protection" false
check_header "Referrer-Policy" false
check_header "Permissions-Policy" false

echo ""
echo "Server Information (should be minimal):"
server_header=$(echo "$HEADERS" | grep -i "^server:" | cut -d':' -f2- | sed 's/^ *//' || echo "")
powered_by_header=$(echo "$HEADERS" | grep -i "^x-powered-by:" | cut -d':' -f2- | sed 's/^ *//' || echo "")

if [[ -z "$server_header" ]]; then
    echo -e "${GREEN}✅${NC} Server header: Not disclosed"
    ((PASS++))
else
    if [[ "$server_header" == "nginx" || "$server_header" == "cloudflare" ]]; then
        echo -e "${GREEN}✅${NC} Server header: $server_header (acceptable)"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠️${NC} Server header: $server_header (consider hiding)"
        ((WARN++))
    fi
fi

if [[ -z "$powered_by_header" ]]; then
    echo -e "${GREEN}✅${NC} X-Powered-By header: Not disclosed"
    ((PASS++))
else
    echo -e "${RED}❌${NC} X-Powered-By header: $powered_by_header (should be hidden)"
    ((FAIL++))
fi

echo ""
echo "SSL/TLS Configuration:"
# Check SSL grade (simplified check)
ssl_check=$(curl -s --connect-timeout 10 --max-time 10 "https://api.ssllabs.com/api/v3/analyze?host=$(echo $URL | sed 's/https\?:\/\///' | cut -d'/' -f1)&publish=off&startNew=off&fromCache=on&all=done" | grep -o '"grade":"[A-F][+-]*"' | head -1 | cut -d'"' -f4 || echo "")

if [[ -n "$ssl_check" ]]; then
    if [[ "$ssl_check" == "A+"* || "$ssl_check" == "A" ]]; then
        echo -e "${GREEN}✅${NC} SSL Labs Grade: $ssl_check"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠️${NC} SSL Labs Grade: $ssl_check (consider improving)"
        ((WARN++))
    fi
else
    echo -e "${YELLOW}⚠️${NC} SSL Labs Grade: Unable to fetch (check manually)"
    ((WARN++))
fi

# Test HTTPS redirect
echo ""
echo "HTTPS Configuration:"
http_url=$(echo "$URL" | sed 's/https:/http:/')
redirect_check=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$http_url" || echo "000")

if [[ "$redirect_check" == "301" || "$redirect_check" == "302" ]]; then
    echo -e "${GREEN}✅${NC} HTTP to HTTPS redirect: Working ($redirect_check)"
    ((PASS++))
else
    echo -e "${RED}❌${NC} HTTP to HTTPS redirect: Not working ($redirect_check)"
    ((FAIL++))
fi

# Summary
echo ""
echo "================================================"
echo "Security Headers Summary:"
echo -e "✅ Passed: ${GREEN}$PASS${NC}"
echo -e "⚠️  Warnings: ${YELLOW}$WARN${NC}"
echo -e "❌ Failed: ${RED}$FAIL${NC}"

# Security score
total=$((PASS + WARN + FAIL))
if [[ $total -gt 0 ]]; then
    score=$((PASS * 100 / total))
    echo -e "🔒 Security Score: $score%"
    
    if [[ $score -ge 80 ]]; then
        echo -e "${GREEN}✅ Security configuration is GOOD${NC}"
        exit_code=0
    elif [[ $score -ge 60 ]]; then
        echo -e "${YELLOW}⚠️ Security configuration needs IMPROVEMENT${NC}"
        exit_code=1
    else
        echo -e "${RED}❌ Security configuration is POOR${NC}"
        exit_code=2
    fi
else
    echo -e "${RED}❌ Unable to evaluate security configuration${NC}"
    exit_code=3
fi

# Recommendations
if [[ $FAIL -gt 0 || $WARN -gt 2 ]]; then
    echo ""
    echo "Recommendations:"
    echo "1. Ensure all critical security headers are present"
    echo "2. Use Content-Security-Policy to prevent XSS attacks"
    echo "3. Hide server information to reduce attack surface"
    echo "4. Implement HSTS with long max-age"
    echo "5. Regular security audits and penetration testing"
fi

exit $exit_code