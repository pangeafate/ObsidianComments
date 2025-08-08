#!/bin/bash

# Script to set up Docker permissions for the deployment user
# This script tries multiple approaches to resolve Docker access issues

set -e

log() {
    echo -e "\033[0;32m[$(date '+%Y-%m-%d %H:%M:%S')]\033[0m $1"
}

log_error() {
    echo -e "\033[0;31m[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:\033[0m $1"
}

log_warning() {
    echo -e "\033[1;33m[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:\033[0m $1"
}

# Check current Docker access
check_docker_access() {
    log "Checking Docker access..."
    
    if docker info > /dev/null 2>&1; then
        log "✅ Docker access works!"
        return 0
    else
        log_error "❌ Docker access failed"
        return 1
    fi
}

# Try to add user to docker group
setup_docker_group() {
    local username=${1:-$(whoami)}
    
    log "Attempting to add user '$username' to docker group..."
    
    # Check if docker group exists
    if ! getent group docker > /dev/null 2>&1; then
        log_error "Docker group does not exist"
        return 1
    fi
    
    # Check if user is already in docker group
    if groups "$username" | grep -q "docker"; then
        log "✅ User '$username' is already in docker group"
        return 0
    fi
    
    # Try to add user to docker group
    if sudo usermod -aG docker "$username" 2>/dev/null; then
        log "✅ Successfully added user '$username' to docker group"
        log_warning "User needs to log out and back in for group change to take effect"
        log "Or run: newgrp docker"
        return 0
    else
        log_error "Failed to add user to docker group (may need admin privileges)"
        return 1
    fi
}

# Setup rootless Docker as alternative
setup_rootless_docker() {
    log "Setting up rootless Docker as alternative..."
    
    # Check if rootless Docker is available
    if command -v dockerd-rootless.sh > /dev/null 2>&1; then
        log "Rootless Docker is available"
        
        # Set up rootless Docker
        if dockerd-rootless.sh --experimental &; then
            export DOCKER_HOST=unix://$HOME/.docker/run/docker.sock
            sleep 5
            
            if docker info > /dev/null 2>&1; then
                log "✅ Rootless Docker setup successful"
                return 0
            fi
        fi
    fi
    
    log_error "Rootless Docker setup failed"
    return 1
}

# Alternative: Use direct docker run commands with specific user
setup_alternative_deployment() {
    log "Setting up alternative deployment method..."
    
    # Create a wrapper script that handles Docker commands
    cat > ~/docker-wrapper.sh << 'EOF'
#!/bin/bash
# Docker wrapper script for deployment

# Try different Docker access methods
run_docker_command() {
    local cmd="$1"
    
    # Method 1: Direct docker command (if user has access)
    if docker info > /dev/null 2>&1; then
        eval "docker $cmd"
        return $?
    fi
    
    # Method 2: Using sudo
    if sudo -n docker info > /dev/null 2>&1; then
        eval "sudo docker $cmd"
        return $?
    fi
    
    # Method 3: Using alternative socket
    if [ -n "$DOCKER_HOST" ] && docker info > /dev/null 2>&1; then
        eval "docker $cmd"
        return $?
    fi
    
    echo "ERROR: No Docker access method available"
    return 1
}

# Export function for use in deployment
export -f run_docker_command
EOF
    
    chmod +x ~/docker-wrapper.sh
    log "✅ Created Docker wrapper script at ~/docker-wrapper.sh"
}

# Main execution
main() {
    log "🐳 Setting up Docker permissions for deployment..."
    
    # First, try to check current access
    if check_docker_access; then
        log "✅ Docker access already works - no setup needed"
        exit 0
    fi
    
    # Try to add user to docker group
    if setup_docker_group "$(whoami)"; then
        log "Docker group setup completed. Testing access after group change..."
        
        # Try to refresh group membership
        if newgrp docker << 'EOF'
check_docker_access
EOF
        then
            log "✅ Docker access works after group change"
            exit 0
        else
            log_warning "Group change didn't take effect immediately"
        fi
    fi
    
    # Try rootless Docker
    if setup_rootless_docker; then
        exit 0
    fi
    
    # Set up alternative deployment method
    setup_alternative_deployment
    
    log "🎯 Setup complete. Available options:"
    log "1. Log out and back in to refresh group membership"
    log "2. Run 'newgrp docker' to activate docker group"
    log "3. Use the alternative deployment wrapper at ~/docker-wrapper.sh"
    log "4. Contact system administrator to add user to docker group"
}

main "$@"