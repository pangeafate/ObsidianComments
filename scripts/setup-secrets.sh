#!/bin/bash
set -euo pipefail

# GitHub Secrets Setup Script
# This script configures all necessary secrets for the CI/CD pipeline

REPO="pangeafate/ObsidianComments"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[SETUP]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    error "GitHub CLI (gh) is not installed. Please install it first:"
    echo "  brew install gh"
    echo "  or visit: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    error "Please authenticate with GitHub CLI first:"
    echo "  gh auth login"
    exit 1
fi

log "Setting up GitHub repository secrets for CI/CD pipeline..."

# Production secrets
log "Setting up production secrets..."

gh secret set POSTGRES_PASSWORD --body "production_password_secure_789" --repo $REPO
gh secret set JWT_SECRET --body "production-jwt-secret-key-secure-101112" --repo $REPO
gh secret set ADMIN_TOKEN --body "admin_token_secure_131415" --repo $REPO
gh secret set CORS_ORIGIN --body "https://obsidiancomments.serverado.app" --repo $REPO

# Deployment secrets
log "Setting up deployment secrets..."

# Generate SSH key for deployment if it doesn't exist
if [ ! -f ~/.ssh/obsidian_deploy_key ]; then
    log "Generating deployment SSH key..."
    ssh-keygen -t ed25519 -f ~/.ssh/obsidian_deploy_key -N "" -C "obsidian-deploy@github-actions"
    log "Public key generated. Add this to your server's authorized_keys:"
    cat ~/.ssh/obsidian_deploy_key.pub
    echo
    read -p "Press Enter after adding the public key to the server..."
fi

# Set deployment secrets
DEPLOY_KEY=$(cat ~/.ssh/obsidian_deploy_key | base64 -w 0)
gh secret set DEPLOY_KEY --body "$DEPLOY_KEY" --repo $REPO
gh secret set DEPLOY_HOST --body "obsidiancomments.serverado.app" --repo $REPO
gh secret set DEPLOY_USER --body "deploy" --repo $REPO

# Staging secrets (if different from production)
log "Setting up staging secrets..."
gh secret set POSTGRES_PASSWORD_STAGING --body "staging_password_secure_123" --repo $REPO
gh secret set JWT_SECRET_STAGING --body "staging-jwt-secret-key-secure-456" --repo $REPO

# Registry secrets (GitHub Container Registry)
log "Setting up container registry secrets..."
gh secret set REGISTRY_USERNAME --body "$(gh api user --jq .login)" --repo $REPO

# Generate GitHub token for container registry access
log "GitHub Container Registry access is handled via GITHUB_TOKEN (automatic)"

# Notification secrets (optional)
log "Setting up notification secrets (optional)..."
read -p "Enter Slack webhook URL (or press Enter to skip): " SLACK_WEBHOOK
if [ -n "$SLACK_WEBHOOK" ]; then
    gh secret set SLACK_WEBHOOK --body "$SLACK_WEBHOOK" --repo $REPO
fi

read -p "Enter Discord webhook URL (or press Enter to skip): " DISCORD_WEBHOOK
if [ -n "$DISCORD_WEBHOOK" ]; then
    gh secret set DISCORD_WEBHOOK --body "$DISCORD_WEBHOOK" --repo $REPO
fi

# Test secrets
log "Testing secret access..."
SECRETS=$(gh secret list --repo $REPO)
echo "$SECRETS"

log "✅ Secrets setup complete!"
log "📋 Next steps:"
echo "  1. Ensure the deployment server is properly configured"
echo "  2. Add the public key to the server: ~/.ssh/obsidian_deploy_key.pub"
echo "  3. Enable GitHub Actions workflows"
echo "  4. Test the CI/CD pipeline with a small PR"

# Create a summary file
cat > secrets-summary.txt << EOF
# GitHub Repository Secrets Summary
# Generated on $(date)

## Production Secrets ✅
- POSTGRES_PASSWORD: Set
- JWT_SECRET: Set  
- ADMIN_TOKEN: Set
- CORS_ORIGIN: Set

## Deployment Secrets ✅
- DEPLOY_KEY: Set (SSH private key)
- DEPLOY_HOST: Set
- DEPLOY_USER: Set

## Registry Secrets ✅
- GITHUB_TOKEN: Automatic (GitHub provides)
- REGISTRY_USERNAME: Set

## Optional Notification Secrets
- SLACK_WEBHOOK: $([ -n "${SLACK_WEBHOOK:-}" ] && echo "Set" || echo "Not set")
- DISCORD_WEBHOOK: $([ -n "${DISCORD_WEBHOOK:-}" ] && echo "Set" || echo "Not set")

## SSH Public Key for Server
Copy this to your server's ~/.ssh/authorized_keys:
$(cat ~/.ssh/obsidian_deploy_key.pub 2>/dev/null || echo "Key not found - run the script again")

## Server Setup Commands
On obsidiancomments.serverado.app:
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG docker deploy
mkdir -p /home/deploy/.ssh
echo "PUBLIC_KEY_ABOVE" >> /home/deploy/.ssh/authorized_keys
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh

## Test Connection
ssh -i ~/.ssh/obsidian_deploy_key deploy@obsidiancomments.serverado.app "docker --version"
EOF

log "📄 Summary saved to secrets-summary.txt"