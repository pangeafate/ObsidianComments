#!/bin/bash

# ObsidianComments - Server Environment Validation Script
# Comprehensive validation of server environment before deployment

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Global validation status
VALIDATION_PASSED=true

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    VALIDATION_PASSED=false
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

log_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Check system requirements
check_system_requirements() {
    log "=== SYSTEM REQUIREMENTS CHECK ==="
    
    # OS check
    log_info "Operating System: $(uname -a)"
    
    # Memory check
    TOTAL_MEM=$(free -m | awk 'NR==2{print $2}')
    AVAILABLE_MEM=$(free -m | awk 'NR==2{print $7}')
    
    if [ "$TOTAL_MEM" -lt 2048 ]; then
        log_warning "Total memory is less than 2GB: ${TOTAL_MEM}MB"
    else
        log "✅ Total memory: ${TOTAL_MEM}MB"
    fi
    
    if [ "$AVAILABLE_MEM" -lt 1024 ]; then
        log_warning "Available memory is less than 1GB: ${AVAILABLE_MEM}MB"
    else
        log "✅ Available memory: ${AVAILABLE_MEM}MB"
    fi
    
    # Disk space check
    ROOT_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    AVAILABLE_SPACE_GB=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
    
    if [ "$ROOT_USAGE" -gt 80 ]; then
        log_warning "Root filesystem is ${ROOT_USAGE}% full"
    else
        log "✅ Root filesystem usage: ${ROOT_USAGE}%"
    fi
    
    if [ "$AVAILABLE_SPACE_GB" -lt 5 ]; then
        log_error "Less than 5GB available space: ${AVAILABLE_SPACE_GB}GB"
    else
        log "✅ Available disk space: ${AVAILABLE_SPACE_GB}GB"
    fi
    
    # CPU check
    CPU_COUNT=$(nproc)
    log "✅ CPU cores: $CPU_COUNT"
    
    if [ "$CPU_COUNT" -lt 2 ]; then
        log_warning "Less than 2 CPU cores available"
    fi
}

# Check Docker installation and status
check_docker() {
    log "=== DOCKER INSTALLATION CHECK ==="
    
    # Check Docker installation
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        log_info "Install Docker: https://docs.docker.com/engine/install/"
        return 1
    fi
    
    DOCKER_VERSION=$(docker --version)
    log "✅ Docker installed: $DOCKER_VERSION"
    
    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose v2 is not available"
        log_info "Install Docker Compose: https://docs.docker.com/compose/install/"
        return 1
    fi
    
    COMPOSE_VERSION=$(docker compose version)
    log "✅ Docker Compose available: $COMPOSE_VERSION"
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        log_info "Start Docker daemon: systemctl start docker"
        return 1
    fi
    
    log "✅ Docker daemon is running"
    
    # Check Docker permissions
    if ! docker ps &> /dev/null; then
        log_error "Current user cannot access Docker"
        log_info "Add user to docker group: sudo usermod -aG docker \$USER"
        return 1
    fi
    
    log "✅ Docker permissions are correct"
    
    # Check Docker disk usage
    DOCKER_DISK_USAGE=$(docker system df --format "table {{.Type}}\t{{.TotalCount}}\t{{.Size}}")
    log_info "Docker disk usage:"
    echo "$DOCKER_DISK_USAGE"
}

# Check network and port availability
check_network_ports() {
    log "=== NETWORK AND PORTS CHECK ==="
    
    # Check if ports are available
    REQUIRED_PORTS=(80 443)
    OPTIONAL_PORTS=(8080 8081 8082 5432 6379)
    
    for port in "${REQUIRED_PORTS[@]}"; do
        if netstat -tulpn 2>/dev/null | grep ":$port " | grep -v docker-proxy; then
            log_error "Required port $port is already in use:"
            netstat -tulpn | grep ":$port " | grep -v docker-proxy
        else
            log "✅ Port $port is available"
        fi
    done
    
    for port in "${OPTIONAL_PORTS[@]}"; do
        if netstat -tulpn 2>/dev/null | grep ":$port " | grep -v docker-proxy; then
            log_warning "Optional port $port is in use (may cause conflicts):"
            netstat -tulpn | grep ":$port " | grep -v docker-proxy
        else
            log "✅ Optional port $port is available"
        fi
    done
    
    # Check network connectivity
    if ping -c 1 google.com &> /dev/null; then
        log "✅ Internet connectivity available"
    else
        log_warning "Internet connectivity issues detected"
    fi
    
    # Check if firewall is running
    if command -v ufw &> /dev/null; then
        UFW_STATUS=$(ufw status | head -1)
        log_info "UFW Firewall: $UFW_STATUS"
    elif command -v firewall-cmd &> /dev/null; then
        FIREWALLD_STATUS=$(firewall-cmd --state 2>/dev/null || echo "not running")
        log_info "firewalld: $FIREWALLD_STATUS"
    fi
}

# Check SSL certificates
check_ssl_certificates() {
    log "=== SSL CERTIFICATES CHECK ==="
    
    SSL_CERT_DIR="/etc/letsencrypt/live/obsidiancomments.serverado.app"
    
    if [ -d "$SSL_CERT_DIR" ]; then
        log "✅ SSL certificate directory exists: $SSL_CERT_DIR"
        
        if [ -f "$SSL_CERT_DIR/fullchain.pem" ]; then
            CERT_EXPIRY=$(openssl x509 -enddate -noout -in "$SSL_CERT_DIR/fullchain.pem" | cut -d= -f2)
            log "✅ SSL certificate found, expires: $CERT_EXPIRY"
            
            # Check if certificate expires soon (within 30 days)
            if openssl x509 -checkend 2592000 -noout -in "$SSL_CERT_DIR/fullchain.pem" > /dev/null; then
                log "✅ SSL certificate is valid for at least 30 days"
            else
                log_warning "SSL certificate expires within 30 days"
            fi
        else
            log_error "SSL certificate file not found: $SSL_CERT_DIR/fullchain.pem"
        fi
        
        if [ -f "$SSL_CERT_DIR/privkey.pem" ]; then
            log "✅ SSL private key found"
        else
            log_error "SSL private key not found: $SSL_CERT_DIR/privkey.pem"
        fi
        
        # Check certificate permissions
        if [ -r "$SSL_CERT_DIR/fullchain.pem" ] && [ -r "$SSL_CERT_DIR/privkey.pem" ]; then
            log "✅ SSL certificates are readable"
        else
            log_error "SSL certificates are not readable by current user"
        fi
    else
        log_warning "SSL certificate directory not found: $SSL_CERT_DIR"
        log_info "Consider using HTTP-only deployment or setting up Let's Encrypt certificates"
    fi
}

# Check environment files and configuration
check_configuration() {
    log "=== CONFIGURATION CHECK ==="
    
    # Check if we're in the right directory
    if [ ! -f "docker-compose.production.yml" ]; then
        log_error "Production Docker Compose file not found"
        log_info "Run this script from the ObsidianComments project root directory"
        return 1
    fi
    
    log "✅ Production Docker Compose file found"
    
    # Check .env.production file
    if [ -f ".env.production" ]; then
        log "✅ Production environment file found"
        
        # Check required environment variables
        source .env.production
        
        if [ -z "$POSTGRES_PASSWORD" ]; then
            log_error "POSTGRES_PASSWORD not set in .env.production"
        else
            log "✅ POSTGRES_PASSWORD is set"
        fi
        
        if [ -z "$JWT_SECRET" ]; then
            log_error "JWT_SECRET not set in .env.production"
        else
            log "✅ JWT_SECRET is set"
        fi
        
        if [ -z "$CORS_ORIGIN" ]; then
            log_warning "CORS_ORIGIN not set in .env.production"
        else
            log "✅ CORS_ORIGIN is set: $CORS_ORIGIN"
        fi
    else
        log_error ".env.production file not found"
        log_info "Create .env.production with required environment variables"
    fi
    
    # Check Dockerfile existence
    DOCKERFILES=(
        "Dockerfile.nginx"
        "packages/backend/Dockerfile.production"
        "packages/frontend/Dockerfile.production"
        "packages/hocuspocus/Dockerfile.production"
    )
    
    for dockerfile in "${DOCKERFILES[@]}"; do
        if [ -f "$dockerfile" ]; then
            log "✅ Found: $dockerfile"
        else
            log_error "Missing Dockerfile: $dockerfile"
        fi
    done
}

# Test Docker functionality
test_docker_functionality() {
    log "=== DOCKER FUNCTIONALITY TEST ==="
    
    # Test basic Docker functionality
    if docker run --rm hello-world &> /dev/null; then
        log "✅ Basic Docker functionality works"
    else
        log_error "Basic Docker functionality test failed"
        return 1
    fi
    
    # Test Docker Compose functionality
    cat > /tmp/test-compose.yml << EOF
version: '3.8'
services:
  test:
    image: hello-world
EOF
    
    if docker compose -f /tmp/test-compose.yml up --no-start &> /dev/null; then
        log "✅ Docker Compose functionality works"
        docker compose -f /tmp/test-compose.yml down &> /dev/null
    else
        log_error "Docker Compose functionality test failed"
        return 1
    fi
    
    rm -f /tmp/test-compose.yml
}

# Generate validation report
generate_report() {
    log "=== VALIDATION REPORT ==="
    
    if [ "$VALIDATION_PASSED" = true ]; then
        log "🎉 All validation checks passed!"
        log "✅ Server is ready for ObsidianComments deployment"
        echo ""
        log_info "Next steps:"
        log_info "1. Run the deployment script: ./scripts/deploy-final-solution.sh"
        log_info "2. Or test with minimal setup: docker compose -f docker-compose.minimal.yml up"
        return 0
    else
        log_error "❌ Validation failed!"
        log_error "Please fix the issues above before deploying"
        echo ""
        log_info "Common fixes:"
        log_info "- Install Docker and Docker Compose"
        log_info "- Add user to docker group: sudo usermod -aG docker \$USER"
        log_info "- Free up disk space and stop services using required ports"
        log_info "- Set up SSL certificates or configure HTTP-only deployment"
        log_info "- Create .env.production with required variables"
        return 1
    fi
}

# Main function
main() {
    log "🔍 ObsidianComments Server Environment Validation"
    echo ""
    
    check_system_requirements
    echo ""
    
    check_docker
    echo ""
    
    check_network_ports
    echo ""
    
    check_ssl_certificates
    echo ""
    
    check_configuration
    echo ""
    
    test_docker_functionality
    echo ""
    
    generate_report
}

# Run main function
main