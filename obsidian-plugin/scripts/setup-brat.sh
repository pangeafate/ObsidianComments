#!/bin/bash

# BRAT Development Setup Script
# Sets up the plugin for BRAT beta testing in Obsidian

set -e

echo "🔧 Setting up BRAT development workflow..."

# Ensure we're in the right directory
if [[ ! -f "manifest.json" ]]; then
    echo "❌ Error: Run this script from the plugin root directory"
    exit 1
fi

# Check if build files exist
if [[ ! -f "main.js" ]]; then
    echo "📦 Building plugin first..."
    npm run build
fi

# Verify required files
echo "✅ Checking required BRAT files..."
for file in "main.js" "manifest.json" "styles.css"; do
    if [[ ! -f "$file" ]]; then
        echo "❌ Missing required file: $file"
        exit 1
    fi
    echo "  ✓ $file"
done

# Display plugin info
echo ""
echo "📋 Plugin Information:"
PLUGIN_ID=$(grep '"id"' manifest.json | cut -d '"' -f4)
PLUGIN_NAME=$(grep '"name"' manifest.json | cut -d '"' -f4)
PLUGIN_VERSION=$(grep '"version"' manifest.json | cut -d '"' -f4)

echo "  Plugin ID: $PLUGIN_ID"
echo "  Plugin Name: $PLUGIN_NAME"
echo "  Version: $PLUGIN_VERSION"

# Create release info
echo ""
echo "🚀 BRAT Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Commit and push your changes to GitHub"
echo "2. Install BRAT plugin in Obsidian"
echo "3. Add this repository URL to BRAT: https://github.com/YOUR_USERNAME/YOUR_REPO"
echo "4. BRAT will automatically install from the main branch"
echo ""
echo "For development:"
echo "- Run './scripts/dev-sync.sh' to sync changes quickly"
echo "- Any changes to main.js, manifest.json, or styles.css will be detected by BRAT"
echo ""
echo "🎉 Ready for beta testing!"