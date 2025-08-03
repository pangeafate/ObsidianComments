#!/bin/bash

# Dev-Sync Script for Obsidian Plugin Development
# Automatically builds and syncs changes for BRAT testing

set -e

# Configuration
WATCH_MODE=${1:-false}
BUILD_ONLY=${2:-false}

echo "🔄 Obsidian Plugin Dev-Sync"

# Function to build the plugin
build_plugin() {
    echo "📦 Building plugin..."
    npm run build
    if [[ $? -eq 0 ]]; then
        echo "✅ Build successful"
        return 0
    else
        echo "❌ Build failed"
        return 1
    fi
}

# Function to run tests
run_tests() {
    echo "🧪 Running tests..."
    npm test -- --passWithNoTests --silent
    if [[ $? -eq 0 ]]; then
        echo "✅ Tests passed"
        return 0
    else
        echo "❌ Tests failed"
        return 1
    fi
}

# Function to check for changes
check_for_changes() {
    # Check if git is available and we're in a git repo
    if command -v git &> /dev/null && git rev-parse --git-dir &> /dev/null; then
        # Check for uncommitted changes
        if [[ -n $(git status --porcelain) ]]; then
            echo "📝 Uncommitted changes detected"
            git status --short
            return 0
        else
            echo "✅ No changes to sync"
            return 1
        fi
    else
        echo "ℹ️  Not a git repository - building anyway"
        return 0
    fi
}

# Main sync function
sync_changes() {
    echo "🔍 Checking for changes..."
    
    if check_for_changes; then
        echo ""
        
        # Run tests first
        if ! run_tests; then
            echo "⚠️  Tests failed - continuing with build anyway"
        fi
        
        # Build the plugin
        if build_plugin; then
            echo ""
            echo "🎉 Sync complete!"
            echo "   BRAT will detect the updated files automatically"
            echo "   Reload the plugin in Obsidian to see changes"
        else
            echo "💥 Sync failed due to build errors"
            exit 1
        fi
    fi
}

# Watch mode
watch_mode() {
    echo "👀 Starting watch mode..."
    echo "   Watching for changes in src/ directory"
    echo "   Press Ctrl+C to stop"
    echo ""
    
    # Initial sync
    sync_changes
    
    # Watch for changes (requires fswatch or inotify-tools)
    if command -v fswatch &> /dev/null; then
        fswatch -o src/ | while read; do
            echo ""
            echo "🔄 Changes detected, syncing..."
            sync_changes
            echo "   Watching for more changes..."
        done
    elif command -v inotifywait &> /dev/null; then
        while inotifywait -r -e modify,create,delete src/; do
            echo ""
            echo "🔄 Changes detected, syncing..."
            sync_changes
            echo "   Watching for more changes..."
        done
    else
        echo "⚠️  File watching not available (install fswatch or inotify-tools)"
        echo "   Running single sync instead"
        sync_changes
    fi
}

# Main execution
if [[ "$WATCH_MODE" == "true" ]] || [[ "$1" == "--watch" ]] || [[ "$1" == "-w" ]]; then
    watch_mode
elif [[ "$BUILD_ONLY" == "true" ]] || [[ "$1" == "--build-only" ]] || [[ "$1" == "-b" ]]; then
    build_plugin
else
    sync_changes
fi