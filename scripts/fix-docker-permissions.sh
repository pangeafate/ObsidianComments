#!/bin/bash

# Fix Docker permissions for deployment user
# This script attempts to resolve Docker daemon access issues

set -e

log() {
    echo -e "\033[0;32m[$(date '+%Y-%m-%d %H:%M:%S')]\033[0m $1"
}

log_error() {
    echo -e "\033[0;31m[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:\033[0m $1"
}

# Check current Docker access
if docker info > /dev/null 2>&1; then
    log "✅ Docker access already works!"
    exit 0
fi

log "🔧 Fixing Docker permissions..."

# Try adding user to docker group with sudo
USERNAME=$(whoami)
log "Attempting to add user '$USERNAME' to docker group..."

if sudo usermod -aG docker "$USERNAME" 2>/dev/null; then
    log "✅ Successfully added user to docker group"
    
    # Try to activate group membership immediately
    log "Activating docker group membership..."
    if sg docker -c "docker info" > /dev/null 2>&1; then
        log "✅ Docker group access activated"
        
        # Create a wrapper script for deployment
        cat > ~/deploy-with-docker.sh << 'EOF'
#!/bin/bash
# Deployment script with proper Docker group access
cd ~/obsidian-comments
exec sg docker -c "$*"
EOF
        chmod +x ~/deploy-with-docker.sh
        log "✅ Created deployment wrapper script"
        exit 0
    else
        log_warning "Group membership not active yet. Creating sudo wrapper..."
    fi
else
    log_warning "Could not add user to docker group. Creating sudo wrapper..."
fi

# Create sudo wrapper for Docker commands
cat > ~/docker-sudo.sh << 'EOF'
#!/bin/bash
# Docker sudo wrapper for deployment

run_docker() {
    if [ "$1" = "compose" ]; then
        sudo docker compose "${@:2}"
    else
        sudo docker "$@"
    fi
}

# Export for use in scripts
export -f run_docker

# If called directly, execute the command
if [ $# -gt 0 ]; then
    run_docker "$@"
fi
EOF

chmod +x ~/docker-sudo.sh
log "✅ Created sudo wrapper script at ~/docker-sudo.sh"

# Test the wrapper
if ~/docker-sudo.sh info > /dev/null 2>&1; then
    log "✅ Sudo wrapper works!"
else
    log_error "❌ Sudo wrapper failed - passwordless sudo may not be configured"
    
    # Try to set up passwordless sudo for docker commands only
    log "Attempting to configure passwordless sudo for Docker..."
    if sudo sh -c 'echo "$(whoami) ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/docker-compose" >> /etc/sudoers.d/docker-nopasswd' 2>/dev/null; then
        log "✅ Configured passwordless sudo for Docker commands"
        
        # Test again
        if sudo docker info > /dev/null 2>&1; then
            log "✅ Passwordless Docker sudo works!"
        else
            log_error "❌ Passwordless sudo still not working"
        fi
    else
        log_error "❌ Could not configure passwordless sudo"
    fi
fi

log "🎯 Docker permission setup complete"
log "Available methods:"
log "1. User added to docker group (may need logout/login)"
log "2. Docker sudo wrapper at ~/docker-sudo.sh"
log "3. Manual sudo for docker commands"