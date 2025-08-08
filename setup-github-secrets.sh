#!/bin/bash

# GitHub Secrets Setup Script for ObsidianComments
# This script configures all required GitHub repository secrets for deployment

echo "🚀 Setting up GitHub secrets for ObsidianComments deployment..."
echo ""

# Repository information
REPO="pangeafate/ObsidianComments"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "Please install it first: brew install gh"
    echo "Or visit: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "📝 Please authenticate with GitHub first..."
    gh auth login
fi

echo "📦 Setting secrets for repository: $REPO"
echo ""

# Set DEPLOY_HOST
echo "Setting DEPLOY_HOST..."
echo "138.197.187.49" | gh secret set DEPLOY_HOST --repo="$REPO"

# Set DEPLOY_USER
echo "Setting DEPLOY_USER..."
echo "dev" | gh secret set DEPLOY_USER --repo="$REPO"

# Set DEPLOY_KEY (SSH private key)
echo "Setting DEPLOY_KEY..."
cat ~/.ssh/id_ed25519 | gh secret set DEPLOY_KEY --repo="$REPO"

# Set POSTGRES_PASSWORD
echo "Setting POSTGRES_PASSWORD..."
echo "XH3D4rzxROT0Jetb4y30" | gh secret set POSTGRES_PASSWORD --repo="$REPO"

# Set JWT_SECRET
echo "Setting JWT_SECRET..."
echo "ac02b2fca3abcedbfc0529a6a5f34968cca27d23d878f1f0f8e46bdb1a34e313" | gh secret set JWT_SECRET --repo="$REPO"

# Set CORS_ORIGIN
echo "Setting CORS_ORIGIN..."
echo "https://obsidiancomments.serverado.app" | gh secret set CORS_ORIGIN --repo="$REPO"

echo ""
echo "✅ All secrets have been configured!"
echo ""
echo "📋 Configured secrets:"
echo "  - DEPLOY_HOST: 138.197.187.49"
echo "  - DEPLOY_USER: dev"
echo "  - DEPLOY_KEY: [SSH private key from ~/.ssh/id_ed25519]"
echo "  - POSTGRES_PASSWORD: XH3D4rzxROT0Jetb4y30"
echo "  - JWT_SECRET: ac02b2f...1a34e313 (truncated for display)"
echo "  - CORS_ORIGIN: https://obsidiancomments.serverado.app"
echo ""
echo "🔐 Security Notes:"
echo "  - These secrets are stored securely in GitHub"
echo "  - They are only accessible to the repository's actions"
echo "  - Never commit these values to your repository"
echo ""
echo "🚀 Next steps:"
echo "  1. Trigger a new deployment by pushing to main branch"
echo "  2. Or manually trigger the workflow from GitHub Actions page"
echo ""
echo "Would you like to trigger a deployment now? (y/n)"
read -r response
if [[ "$response" == "y" ]]; then
    echo "Triggering deployment workflow..."
    gh workflow run "CI/CD Pipeline" --repo="$REPO" --ref=main
    echo "✅ Deployment triggered! Check progress at:"
    echo "https://github.com/$REPO/actions"
else
    echo "You can trigger deployment later by pushing to main branch."
fi