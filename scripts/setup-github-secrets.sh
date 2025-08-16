#!/bin/bash

# Setup GitHub Secrets for ObsidianComments CI/CD
# Run this script to configure required secrets for the deployment pipeline

set -e

echo "🔐 GitHub Secrets Setup for ObsidianComments"
echo "==========================================="
echo ""
echo "This script will help you configure the required GitHub secrets."
echo "You'll need to manually add these via GitHub UI or CLI."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Required Secrets:${NC}"
echo ""

echo "1. SSH_PRIVATE_KEY"
echo "   Description: SSH private key for production server access"
echo "   How to get: cat ~/.ssh/id_rsa (or your SSH key path)"
echo ""

echo "2. PRODUCTION_HOST"
echo "   Value: 138.197.187.49"
echo "   Description: Production server IP address"
echo ""

echo "3. PRODUCTION_USER"
echo "   Value: root"
echo "   Description: SSH username for production server"
echo ""

echo "4. POSTGRES_PASSWORD"
echo "   Value: obsidian_secure_password_2024"
echo "   Description: PostgreSQL database password"
echo ""

echo "5. JWT_SECRET"
echo "   Value: $(openssl rand -base64 32)"
echo "   Description: JWT secret for authentication"
echo ""

echo "6. REDIS_PASSWORD"
echo "   Value: redis_password_2024"
echo "   Description: Redis password (if using authenticated Redis)"
echo ""

echo -e "${GREEN}Using GitHub CLI:${NC}"
echo ""
echo "gh secret set SSH_PRIVATE_KEY < ~/.ssh/id_rsa"
echo "gh secret set PRODUCTION_HOST --body '138.197.187.49'"
echo "gh secret set PRODUCTION_USER --body 'root'"
echo "gh secret set POSTGRES_PASSWORD --body 'obsidian_secure_password_2024'"
echo "gh secret set JWT_SECRET --body '$(openssl rand -base64 32)'"
echo "gh secret set REDIS_PASSWORD --body 'redis_password_2024'"
echo ""

echo -e "${GREEN}GitHub Environments Setup:${NC}"
echo ""
echo "1. Go to: https://github.com/pangeafate/ObsidianComments/settings/environments"
echo "2. Create 'staging' environment:"
echo "   - No protection rules needed"
echo "   - URL: https://staging.obsidiancomments.serverado.app"
echo ""
echo "3. Create 'production' environment:"
echo "   - Add protection rules:"
echo "     ✓ Required reviewers (add yourself)"
echo "     ✓ Dismiss stale reviews"
echo "     ✓ Require branches to be up to date"
echo "   - URL: https://obsidiancomments.serverado.app"
echo ""

echo -e "${YELLOW}Current Status:${NC}"
echo ""

# Check if gh CLI is installed
if command -v gh &> /dev/null; then
    echo "✅ GitHub CLI is installed"
    
    # Check if authenticated
    if gh auth status &> /dev/null; then
        echo "✅ GitHub CLI is authenticated"
        
        # List current secrets
        echo ""
        echo "Current repository secrets:"
        gh secret list 2>/dev/null || echo "  (none or no permission to view)"
    else
        echo "❌ GitHub CLI not authenticated. Run: gh auth login"
    fi
else
    echo "❌ GitHub CLI not installed. Install from: https://cli.github.com/"
fi

echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "1. Add the secrets using the commands above or via GitHub UI"
echo "2. Configure the environments as described"
echo "3. Push changes to trigger the new CI/CD pipeline"
echo ""