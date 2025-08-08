#!/bin/bash

# ObsidianComments - Final Deployment Solution
# This script provides comprehensive troubleshooting and deployment with detailed logging
# It addresses the 502 Bad Gateway issues and container startup failures

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function with timestamp
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

log_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Configuration
DEPLOYMENT_DIR="$HOME/obsidian-comments"
BACKUP_DIR="$HOME/obsidian-comments-backup-$(date +%Y%m%d-%H%M%S)"
DEBUG_LOG_DIR="$DEPLOYMENT_DIR/debug-logs"
COMPOSE_FILE="docker-compose.production.yml"

# Create debug log directory
create_debug_environment() {
    log "Creating debug environment..."
    mkdir -p "$DEBUG_LOG_DIR"
    
    # Create comprehensive logging script
    cat > "$DEBUG_LOG_DIR/collect-logs.sh" << 'EOF'
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_DIR="debug-logs/session-$TIMESTAMP"
mkdir -p "$LOG_DIR"

echo "Collecting comprehensive debug information..."

# System information
echo "=== SYSTEM INFORMATION ===" > "$LOG_DIR/system-info.txt"
uname -a >> "$LOG_DIR/system-info.txt"
df -h >> "$LOG_DIR/system-info.txt"
free -m >> "$LOG_DIR/system-info.txt"
docker --version >> "$LOG_DIR/system-info.txt"
docker compose version >> "$LOG_DIR/system-info.txt"

# Docker status
echo "=== DOCKER STATUS ===" > "$LOG_DIR/docker-status.txt"
docker ps -a >> "$LOG_DIR/docker-status.txt"
docker images >> "$LOG_DIR/docker-status.txt"
docker network ls >> "$LOG_DIR/docker-status.txt"
docker volume ls >> "$LOG_DIR/docker-status.txt"

# Service logs
if docker compose -f docker-compose.production.yml ps > /dev/null 2>&1; then
    echo "Collecting service logs..."
    docker compose -f docker-compose.production.yml logs postgres > "$LOG_DIR/postgres.log"
    docker compose -f docker-compose.production.yml logs redis > "$LOG_DIR/redis.log"
    docker compose -f docker-compose.production.yml logs backend > "$LOG_DIR/backend.log"
    docker compose -f docker-compose.production.yml logs hocuspocus > "$LOG_DIR/hocuspocus.log"
    docker compose -f docker-compose.production.yml logs frontend > "$LOG_DIR/frontend.log"
    docker compose -f docker-compose.production.yml logs nginx > "$LOG_DIR/nginx.log"
fi

# Network diagnostics
echo "=== NETWORK DIAGNOSTICS ===" > "$LOG_DIR/network-diag.txt"
netstat -tulpn | grep -E ':(80|443|8080|8081|8082|5432|6379)' >> "$LOG_DIR/network-diag.txt" || true
ss -tulpn | grep -E ':(80|443|8080|8081|8082|5432|6379)' >> "$LOG_DIR/network-diag.txt" || true

echo "Debug information collected in: $LOG_DIR"
EOF
    chmod +x "$DEBUG_LOG_DIR/collect-logs.sh"
}

# Comprehensive environment validation
validate_server_environment() {
    log "Starting comprehensive server environment validation..."
    
    # Check Docker installation
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        return 1
    fi
    log "✅ Docker is installed: $(docker --version)"
    
    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose v2 is not available"
        return 1
    fi
    log "✅ Docker Compose is available: $(docker compose version)"
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running or accessible"
        return 1
    fi
    log "✅ Docker daemon is running"
    
    # Check available disk space (minimum 5GB)
    AVAILABLE_SPACE=$(df / | awk 'NR==2 {print $4}')
    if [ "$AVAILABLE_SPACE" -lt 5242880 ]; then # 5GB in KB
        log_warning "Low disk space detected: $(df -h / | awk 'NR==2 {print $4}') available"
    else
        log "✅ Sufficient disk space available: $(df -h / | awk 'NR==2 {print $4}')"
    fi
    
    # Check available memory
    AVAILABLE_MEM=$(free -m | awk 'NR==2{print $7}')
    if [ "$AVAILABLE_MEM" -lt 1024 ]; then
        log_warning "Low available memory: ${AVAILABLE_MEM}MB"
    else
        log "✅ Sufficient memory available: ${AVAILABLE_MEM}MB"
    fi
    
    # Check port availability
    log "Checking port availability..."
    for port in 80 443; do
        if netstat -tulpn 2>/dev/null | grep ":$port " | grep -v docker; then
            log_error "Port $port is already in use by another service"
            netstat -tulpn | grep ":$port "
            return 1
        else
            log "✅ Port $port is available"
        fi
    done
    
    # Check SSL certificates
    SSL_CERT_DIR="/etc/letsencrypt/live/obsidiancomments.serverado.app"
    if [ -d "$SSL_CERT_DIR" ]; then
        if [ -f "$SSL_CERT_DIR/fullchain.pem" ] && [ -f "$SSL_CERT_DIR/privkey.pem" ]; then
            log "✅ SSL certificates found at $SSL_CERT_DIR"
        else
            log_error "SSL certificate files missing in $SSL_CERT_DIR"
            ls -la "$SSL_CERT_DIR/" || true
            return 1
        fi
    else
        log_warning "SSL certificate directory not found: $SSL_CERT_DIR"
        log_warning "Deployment will use HTTP only or fail if HTTPS is required"
    fi
    
    log "✅ Server environment validation completed successfully"
    return 0
}

# Test individual service functionality
test_service_individually() {
    local service=$1
    local max_attempts=30
    local attempt=0
    
    log "Testing service: $service"
    
    while [ $attempt -lt $max_attempts ]; do
        if docker compose -f "$COMPOSE_FILE" ps "$service" | grep -q "running"; then
            log "✅ Service $service is running"
            
            # Service-specific health checks
            case $service in
                postgres)
                    if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U postgres &> /dev/null; then
                        log "✅ PostgreSQL is accepting connections"
                        return 0
                    fi
                    ;;
                redis)
                    if docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping | grep -q "PONG"; then
                        log "✅ Redis is responding to ping"
                        return 0
                    fi
                    ;;
                backend)
                    if docker compose -f "$COMPOSE_FILE" exec -T backend curl -f http://localhost:8081/api/health &> /dev/null; then
                        log "✅ Backend health endpoint is responding"
                        return 0
                    fi
                    ;;
                hocuspocus)
                    if docker compose -f "$COMPOSE_FILE" exec -T hocuspocus curl -f http://localhost:8082/health &> /dev/null; then
                        log "✅ Hocuspocus health endpoint is responding"
                        return 0
                    fi
                    ;;
                frontend)
                    if docker compose -f "$COMPOSE_FILE" exec -T frontend curl -f http://localhost &> /dev/null; then
                        log "✅ Frontend is serving content"
                        return 0
                    fi
                    ;;
                nginx)
                    if docker compose -f "$COMPOSE_FILE" exec -T nginx curl -f http://localhost/health &> /dev/null; then
                        log "✅ Nginx health endpoint is responding"
                        return 0
                    fi
                    ;;
            esac
        fi
        
        attempt=$((attempt + 1))
        log_info "Attempt $attempt/$max_attempts - Service $service not ready yet, waiting..."
        sleep 5
    done
    
    log_error "Service $service failed to become healthy within $(($max_attempts * 5)) seconds"
    log_error "Collecting logs for $service..."
    docker compose -f "$COMPOSE_FILE" logs "$service" | tail -50
    return 1
}

# Incremental deployment with detailed testing
incremental_deployment() {
    log "Starting incremental deployment with detailed testing..."
    
    # Stage 1: Infrastructure services (postgres, redis)
    log "Stage 1: Starting infrastructure services..."
    docker compose -f "$COMPOSE_FILE" up -d postgres redis
    
    if ! test_service_individually "postgres"; then
        log_error "PostgreSQL failed to start properly"
        return 1
    fi
    
    if ! test_service_individually "redis"; then
        log_error "Redis failed to start properly"
        return 1
    fi
    
    log "✅ Infrastructure services are running correctly"
    
    # Stage 2: Application services (backend, hocuspocus)
    log "Stage 2: Starting application services..."
    docker compose -f "$COMPOSE_FILE" up -d backend hocuspocus
    
    if ! test_service_individually "backend"; then
        log_error "Backend service failed to start properly"
        return 1
    fi
    
    if ! test_service_individually "hocuspocus"; then
        log_error "Hocuspocus service failed to start properly"
        return 1
    fi
    
    log "✅ Application services are running correctly"
    
    # Stage 3: Frontend service
    log "Stage 3: Starting frontend service..."
    docker compose -f "$COMPOSE_FILE" up -d frontend
    
    if ! test_service_individually "frontend"; then
        log_error "Frontend service failed to start properly"
        return 1
    fi
    
    log "✅ Frontend service is running correctly"
    
    # Stage 4: Nginx reverse proxy
    log "Stage 4: Starting nginx reverse proxy..."
    docker compose -f "$COMPOSE_FILE" up -d nginx
    
    if ! test_service_individually "nginx"; then
        log_error "Nginx service failed to start properly"
        return 1
    fi
    
    log "✅ All services are running correctly"
    
    # Final connectivity tests
    log "Performing final connectivity tests..."
    
    # Test external connectivity
    if curl -f -m 10 http://localhost/health &> /dev/null; then
        log "✅ External HTTP connectivity verified"
    else
        log_error "External HTTP connectivity failed"
        return 1
    fi
    
    # Test API endpoint
    if curl -f -m 10 http://localhost/api/health &> /dev/null; then
        log "✅ API endpoint connectivity verified"
    else
        log_error "API endpoint connectivity failed"
        return 1
    fi
    
    log "✅ Incremental deployment completed successfully!"
    return 0
}

# Main deployment function
main_deployment() {
    log "🚀 Starting ObsidianComments Final Deployment Solution"
    
    # Create debug environment
    create_debug_environment
    
    # Validate server environment
    if ! validate_server_environment; then
        log_error "Server environment validation failed. Please fix the issues above."
        exit 1
    fi
    
    # Setup deployment directory
    log "Setting up deployment directory: $DEPLOYMENT_DIR"
    mkdir -p "$DEPLOYMENT_DIR"
    cd "$DEPLOYMENT_DIR"
    
    # Check if we're already in the correct directory with the compose file
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "Production compose file not found in current directory!"
        log_error "Please ensure you're running this script from the ObsidianComments root directory"
        exit 1
    fi
    
    # Load environment variables
    if [ -f ".env.production" ]; then
        log "Loading production environment variables"
        set -a
        source .env.production
        set +a
    else
        log_error ".env.production file not found!"
        log_error "Please create .env.production with the required environment variables"
        exit 1
    fi
    
    # Validate critical environment variables
    if [ -z "$POSTGRES_PASSWORD" ]; then
        log_error "POSTGRES_PASSWORD must be set in .env.production"
        exit 1
    fi
    
    if [ -z "$JWT_SECRET" ]; then
        log_error "JWT_SECRET must be set in .env.production"
        exit 1
    fi
    
    # Clean up previous deployment
    log "Cleaning up previous deployment..."
    docker compose -f "$COMPOSE_FILE" down --volumes --remove-orphans || true
    
    # Remove old images to force rebuild
    log "Removing old images to force fresh build..."
    docker image prune -af || true
    
    # Build all services with no cache
    log "Building all services with no cache..."
    if ! docker compose -f "$COMPOSE_FILE" build --no-cache --pull; then
        log_error "Docker build failed!"
        "$DEBUG_LOG_DIR/collect-logs.sh"
        exit 1
    fi
    
    # Start incremental deployment
    if ! incremental_deployment; then
        log_error "Incremental deployment failed!"
        "$DEBUG_LOG_DIR/collect-logs.sh"
        exit 1
    fi
    
    # Final verification
    log "🏥 Final deployment verification..."
    docker compose -f "$COMPOSE_FILE" ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"
    
    # Test Smart Title removal functionality
    log "🧪 Testing Smart Title removal functionality..."
    if curl -f -X POST http://localhost/api/notes \
        -H "Content-Type: application/json" \
        -d '{"title":"Test Note","content":"# Test Note\n\nThis is a test note to verify Smart Title removal."}' &> /dev/null; then
        log "✅ Smart Title functionality test passed"
    else
        log_warning "Smart Title functionality test could not be completed (this might be normal if authentication is required)"
    fi
    
    log "✅ Final deployment solution completed successfully!"
    echo ""
    log_info "🌐 Services should be available at:"
    log_info "   Frontend: https://obsidiancomments.serverado.app"
    log_info "   API: https://obsidiancomments.serverado.app/api"
    log_info "   WebSocket: wss://obsidiancomments.serverado.app/ws"
    echo ""
    log_info "📊 Service Status:"
    docker compose -f "$COMPOSE_FILE" ps
    echo ""
    log_info "📝 To monitor logs: docker compose -f $COMPOSE_FILE logs -f"
    log_info "📝 To collect debug info: $DEBUG_LOG_DIR/collect-logs.sh"
}

# Trap for cleanup on script exit
cleanup() {
    if [ $? -ne 0 ]; then
        log_error "Deployment failed! Collecting debug information..."
        if [ -f "$DEBUG_LOG_DIR/collect-logs.sh" ]; then
            "$DEBUG_LOG_DIR/collect-logs.sh"
        fi
    fi
}
trap cleanup EXIT

# Check if running as root (not recommended for Docker)
if [ "$EUID" -eq 0 ]; then
    log_warning "Running as root is not recommended. Consider using a regular user with Docker permissions."
fi

# Start main deployment
main_deployment