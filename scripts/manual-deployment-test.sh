#!/bin/bash

# ObsidianComments - Manual Deployment Testing Script
# Step-by-step verification with manual intervention points

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Function to wait for user input
wait_for_user() {
    local message="$1"
    echo ""
    log_info "$message"
    read -p "Press Enter to continue or Ctrl+C to abort..."
    echo ""
}

# Function to run command with manual verification
run_with_verification() {
    local description="$1"
    local command="$2"
    local success_message="$3"
    local failure_action="$4"
    
    log "Step: $description"
    log_info "Command: $command"
    
    if eval "$command"; then
        log "✅ $success_message"
        return 0
    else
        log_error "❌ Command failed: $command"
        if [ -n "$failure_action" ]; then
            log_info "Failure action: $failure_action"
            eval "$failure_action"
        fi
        log_warning "Manual intervention may be required"
        wait_for_user "Review the error above. Fix if necessary, then continue"
        return 1
    fi
}

# Initialize debug environment
initialize_debug() {
    log "🔧 Initializing debug environment..."
    
    # Create debug logs directory
    mkdir -p debug-logs
    
    # Create environment file if it doesn't exist
    if [ ! -f ".env.production" ]; then
        log_warning "Creating sample .env.production file"
        cat > .env.production << EOF
POSTGRES_DB=obsidian_comments
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure_password_$(openssl rand -hex 8)
JWT_SECRET=jwt_secret_$(openssl rand -hex 32)
NODE_ENV=production
CORS_ORIGIN=https://obsidiancomments.serverado.app
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
EOF
        wait_for_user "Sample .env.production created. Please review and update as needed"
    fi
    
    log "✅ Debug environment initialized"
}

# Test Phase 1: Environment validation
test_phase_1() {
    log "🔍 PHASE 1: Environment Validation"
    
    wait_for_user "Starting environment validation. This will check system requirements"
    
    if [ -f "scripts/validate-server-environment.sh" ]; then
        run_with_verification \
            "Running environment validation script" \
            "bash scripts/validate-server-environment.sh" \
            "Environment validation completed" \
            "log_info 'Fix any issues reported above before continuing'"
    else
        log_warning "Environment validation script not found, continuing with basic checks"
        
        run_with_verification \
            "Checking Docker installation" \
            "docker --version && docker compose version" \
            "Docker and Docker Compose are available"
        
        run_with_verification \
            "Checking Docker daemon" \
            "docker info > /dev/null" \
            "Docker daemon is running"
    fi
}

# Test Phase 2: Infrastructure services
test_phase_2() {
    log "🗄️ PHASE 2: Infrastructure Services (PostgreSQL + Redis)"
    
    wait_for_user "Starting infrastructure services. This will start PostgreSQL and Redis"
    
    # Stop any existing services
    run_with_verification \
        "Stopping existing services" \
        "docker compose -f docker-compose.debug.yml down --remove-orphans" \
        "Existing services stopped" \
        "log_info 'No existing services to stop'"
    
    # Start infrastructure services
    run_with_verification \
        "Starting PostgreSQL" \
        "docker compose -f docker-compose.debug.yml up -d postgres" \
        "PostgreSQL container started"
    
    wait_for_user "PostgreSQL is starting. Wait for it to be ready (usually 10-30 seconds)"
    
    # Wait for PostgreSQL to be ready
    local postgres_ready=false
    for i in {1..30}; do
        if docker compose -f docker-compose.debug.yml exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
            postgres_ready=true
            break
        fi
        log_info "Waiting for PostgreSQL... attempt $i/30"
        sleep 2
    done
    
    if [ "$postgres_ready" = true ]; then
        log "✅ PostgreSQL is ready"
    else
        log_error "PostgreSQL failed to start properly"
        log_info "PostgreSQL logs:"
        docker compose -f docker-compose.debug.yml logs postgres
        wait_for_user "Review PostgreSQL logs above. Fix issues if any, then continue"
    fi
    
    # Start Redis
    run_with_verification \
        "Starting Redis" \
        "docker compose -f docker-compose.debug.yml up -d redis" \
        "Redis container started"
    
    wait_for_user "Redis is starting. Wait for it to be ready (usually 5-10 seconds)"
    
    # Wait for Redis to be ready
    local redis_ready=false
    for i in {1..15}; do
        if docker compose -f docker-compose.debug.yml exec -T redis redis-cli ping | grep -q "PONG"; then
            redis_ready=true
            break
        fi
        log_info "Waiting for Redis... attempt $i/15"
        sleep 2
    done
    
    if [ "$redis_ready" = true ]; then
        log "✅ Redis is ready"
    else
        log_error "Redis failed to start properly"
        log_info "Redis logs:"
        docker compose -f docker-compose.debug.yml logs redis
        wait_for_user "Review Redis logs above. Fix issues if any, then continue"
    fi
    
    # Test database connectivity
    run_with_verification \
        "Testing database connectivity" \
        "docker compose -f docker-compose.debug.yml exec -T postgres psql -U postgres -d obsidian_comments -c 'SELECT version();'" \
        "Database connectivity verified" \
        "log_info 'Database connectivity test failed. Check PostgreSQL configuration'"
    
    log "✅ PHASE 2 COMPLETED: Infrastructure services are running"
}

# Test Phase 3: Application services
test_phase_3() {
    log "⚙️ PHASE 3: Application Services (Backend + Hocuspocus)"
    
    wait_for_user "Starting application services. This will build and start backend and hocuspocus"
    
    # Build backend
    run_with_verification \
        "Building backend service" \
        "docker compose -f docker-compose.debug.yml build backend" \
        "Backend service built successfully" \
        "log_info 'Backend build failed. Check Dockerfile and build context'"
    
    # Start backend
    run_with_verification \
        "Starting backend service" \
        "docker compose -f docker-compose.debug.yml up -d backend" \
        "Backend service started"
    
    wait_for_user "Backend is starting. This may take 30-60 seconds for first startup"
    
    # Wait for backend to be healthy
    local backend_ready=false
    for i in {1..60}; do
        if curl -f http://localhost:8081/api/health > /dev/null 2>&1; then
            backend_ready=true
            break
        fi
        log_info "Waiting for backend... attempt $i/60"
        sleep 5
    done
    
    if [ "$backend_ready" = true ]; then
        log "✅ Backend is ready and responding"
        
        # Test API endpoint
        log_info "Testing API endpoint:"
        curl -s http://localhost:8081/api/health | head -5
    else
        log_error "Backend failed to start properly"
        log_info "Backend logs:"
        docker compose -f docker-compose.debug.yml logs backend | tail -50
        wait_for_user "Review backend logs above. Fix issues if any, then continue"
    fi
    
    # Build hocuspocus
    run_with_verification \
        "Building hocuspocus service" \
        "docker compose -f docker-compose.debug.yml build hocuspocus" \
        "Hocuspocus service built successfully" \
        "log_info 'Hocuspocus build failed. Check Dockerfile and build context'"
    
    # Start hocuspocus
    run_with_verification \
        "Starting hocuspocus service" \
        "docker compose -f docker-compose.debug.yml up -d hocuspocus" \
        "Hocuspocus service started"
    
    wait_for_user "Hocuspocus is starting. This may take 20-40 seconds"
    
    # Wait for hocuspocus to be healthy
    local hocuspocus_ready=false
    for i in {1..40}; do
        if curl -f http://localhost:8082/health > /dev/null 2>&1; then
            hocuspocus_ready=true
            break
        fi
        log_info "Waiting for hocuspocus... attempt $i/40"
        sleep 3
    done
    
    if [ "$hocuspocus_ready" = true ]; then
        log "✅ Hocuspocus is ready and responding"
        
        # Test WebSocket endpoint
        log_info "Testing hocuspocus endpoint:"
        curl -s http://localhost:8082/health | head -5
    else
        log_error "Hocuspocus failed to start properly"
        log_info "Hocuspocus logs:"
        docker compose -f docker-compose.debug.yml logs hocuspocus | tail -50
        wait_for_user "Review hocuspocus logs above. Fix issues if any, then continue"
    fi
    
    log "✅ PHASE 3 COMPLETED: Application services are running"
}

# Test Phase 4: Frontend service
test_phase_4() {
    log "🎨 PHASE 4: Frontend Service"
    
    wait_for_user "Starting frontend service. This will build and start the React frontend"
    
    # Build frontend
    run_with_verification \
        "Building frontend service" \
        "docker compose -f docker-compose.debug.yml build frontend" \
        "Frontend service built successfully" \
        "log_info 'Frontend build failed. Check Dockerfile and build context'"
    
    # Start frontend
    run_with_verification \
        "Starting frontend service" \
        "docker compose -f docker-compose.debug.yml up -d frontend" \
        "Frontend service started"
    
    wait_for_user "Frontend is starting. This may take 10-20 seconds"
    
    # Wait for frontend to be healthy
    local frontend_ready=false
    for i in {1..30}; do
        if curl -f http://localhost:8080/ > /dev/null 2>&1; then
            frontend_ready=true
            break
        fi
        log_info "Waiting for frontend... attempt $i/30"
        sleep 2
    done
    
    if [ "$frontend_ready" = true ]; then
        log "✅ Frontend is ready and serving content"
        
        # Test frontend
        log_info "Frontend response (first 200 characters):"
        curl -s http://localhost:8080/ | head -c 200
        echo ""
    else
        log_error "Frontend failed to start properly"
        log_info "Frontend logs:"
        docker compose -f docker-compose.debug.yml logs frontend | tail -50
        wait_for_user "Review frontend logs above. Fix issues if any, then continue"
    fi
    
    log "✅ PHASE 4 COMPLETED: Frontend service is running"
}

# Test Phase 5: Nginx proxy
test_phase_5() {
    log "🌐 PHASE 5: Nginx Reverse Proxy"
    
    wait_for_user "Starting nginx reverse proxy. This will handle SSL and route requests"
    
    # Check SSL certificates
    SSL_CERT_DIR="/etc/letsencrypt/live/obsidiancomments.serverado.app"
    if [ -d "$SSL_CERT_DIR" ] && [ -f "$SSL_CERT_DIR/fullchain.pem" ] && [ -f "$SSL_CERT_DIR/privkey.pem" ]; then
        log "✅ SSL certificates found"
    else
        log_warning "SSL certificates not found, nginx will use debug configuration"
        log_info "Certificates expected at: $SSL_CERT_DIR"
        wait_for_user "SSL certificates missing. You may need to set up Let's Encrypt. Continue anyway?"
    fi
    
    # Start nginx
    run_with_verification \
        "Starting nginx service" \
        "docker compose -f docker-compose.debug.yml up -d nginx" \
        "Nginx service started"
    
    wait_for_user "Nginx is starting. This may take 10-15 seconds"
    
    # Wait for nginx to be healthy
    local nginx_ready=false
    for i in {1..20}; do
        if curl -f http://localhost/health > /dev/null 2>&1; then
            nginx_ready=true
            break
        fi
        log_info "Waiting for nginx... attempt $i/20"
        sleep 3
    done
    
    if [ "$nginx_ready" = true ]; then
        log "✅ Nginx is ready and responding"
        
        # Test nginx health endpoint
        log_info "Nginx health response:"
        curl -s http://localhost/health
    else
        log_error "Nginx failed to start properly"
        log_info "Nginx logs:"
        docker compose -f docker-compose.debug.yml logs nginx | tail -50
        wait_for_user "Review nginx logs above. Fix issues if any, then continue"
    fi
    
    log "✅ PHASE 5 COMPLETED: Nginx reverse proxy is running"
}

# Test Phase 6: End-to-end functionality
test_phase_6() {
    log "🧪 PHASE 6: End-to-End Functionality Testing"
    
    wait_for_user "Testing complete application functionality through nginx proxy"
    
    # Test API through nginx
    run_with_verification \
        "Testing API through nginx" \
        "curl -f http://localhost/api/health" \
        "API accessible through nginx" \
        "log_info 'API not accessible through nginx. Check routing configuration'"
    
    # Test frontend through nginx
    run_with_verification \
        "Testing frontend through nginx" \
        "curl -f -s http://localhost/ | grep -q 'ObsidianComments'" \
        "Frontend accessible through nginx" \
        "log_info 'Frontend not accessible through nginx or title not found'"
    
    # Test debug endpoint
    log_info "Testing debug endpoint:"
    curl -s http://localhost/debug 2>/dev/null || log_warning "Debug endpoint not available"
    
    # Test Smart Title functionality (if possible)
    log "🔍 Testing Smart Title Removal Functionality..."
    
    # Create test note data
    TEST_NOTE_DATA='{"title":"Test Smart Title","content":"# Test Smart Title\n\nThis is a test note to verify smart title removal is working correctly."}'
    
    # Test note creation
    if curl -f -X POST http://localhost/api/notes \
        -H "Content-Type: application/json" \
        -d "$TEST_NOTE_DATA" > /dev/null 2>&1; then
        log "✅ Smart Title test: Note creation successful"
    else
        log_warning "Smart Title test: Could not create test note (may require authentication)"
    fi
    
    # Show current service status
    log "📊 Current Service Status:"
    docker compose -f docker-compose.debug.yml ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"
    
    log "✅ PHASE 6 COMPLETED: End-to-end functionality tested"
}

# Final verification and cleanup
final_verification() {
    log "🏁 FINAL VERIFICATION"
    
    wait_for_user "Performing final deployment verification"
    
    # Show comprehensive status
    log "📊 Complete Service Status:"
    echo ""
    docker compose -f docker-compose.debug.yml ps
    echo ""
    
    # Show debug logs location
    log_info "Debug logs are available at: $(pwd)/debug-logs/"
    if [ -f "debug-logs/monitor.log" ]; then
        log_info "Monitor log (last 10 lines):"
        tail -10 debug-logs/monitor.log 2>/dev/null || log_info "Monitor log not yet available"
    fi
    
    # Test connectivity summary
    log "🔗 Connectivity Test Summary:"
    echo ""
    
    # Direct service tests
    services=("postgres:5432" "redis:6379" "backend:8081" "hocuspocus:8082" "frontend:8080")
    for service in "${services[@]}"; do
        name=$(echo $service | cut -d: -f1)
        port=$(echo $service | cut -d: -f2)
        
        if curl -f -m 5 http://localhost:$port/health 2>/dev/null || \
           ([ "$name" = "postgres" ] && docker compose -f docker-compose.debug.yml exec -T postgres pg_isready -U postgres > /dev/null 2>&1) || \
           ([ "$name" = "redis" ] && docker compose -f docker-compose.debug.yml exec -T redis redis-cli ping | grep -q "PONG" 2>/dev/null) || \
           ([ "$name" = "frontend" ] && curl -f -m 5 http://localhost:$port/ > /dev/null 2>&1); then
            log "✅ $name (port $port): Accessible"
        else
            log_warning "⚠️  $name (port $port): Not accessible"
        fi
    done
    
    # Nginx proxy tests
    echo ""
    log "🌐 Nginx Proxy Tests:"
    if curl -f http://localhost/health > /dev/null 2>&1; then
        log "✅ Nginx health endpoint: OK"
    else
        log_error "❌ Nginx health endpoint: FAILED"
    fi
    
    if curl -f http://localhost/api/health > /dev/null 2>&1; then
        log "✅ API through nginx: OK"
    else
        log_error "❌ API through nginx: FAILED"
    fi
    
    if curl -f http://localhost/ > /dev/null 2>&1; then
        log "✅ Frontend through nginx: OK"
    else
        log_error "❌ Frontend through nginx: FAILED"
    fi
    
    echo ""
    log "🎯 DEPLOYMENT SUMMARY:"
    log "Services are running in debug mode with extensive logging"
    log "Monitor logs: docker compose -f docker-compose.debug.yml logs -f"
    log "Debug logs: ls -la debug-logs/"
    log "Stop services: docker compose -f docker-compose.debug.yml down"
    
    echo ""
    log_info "🌐 Access URLs:"
    log_info "Frontend: http://localhost/ or http://localhost:8080/"
    log_info "API: http://localhost/api/ or http://localhost:8081/api/"
    log_info "WebSocket: ws://localhost/ws or ws://localhost:8082/"
    log_info "Debug info: http://localhost/debug"
    
    wait_for_user "Manual deployment testing completed! Review the summary above"
}

# Main function
main() {
    log "🚀 ObsidianComments Manual Deployment Testing"
    echo ""
    log_info "This script will guide you through step-by-step deployment testing"
    log_info "You can intervene at each stage to fix issues or verify functionality"
    echo ""
    
    wait_for_user "Ready to begin manual deployment testing?"
    
    # Initialize debug environment
    initialize_debug
    
    # Run test phases
    test_phase_1  # Environment validation
    test_phase_2  # Infrastructure services
    test_phase_3  # Application services  
    test_phase_4  # Frontend service
    test_phase_5  # Nginx proxy
    test_phase_6  # End-to-end functionality
    
    # Final verification
    final_verification
    
    log "🎉 Manual deployment testing completed successfully!"
}

# Check if running from correct directory
if [ ! -f "docker-compose.debug.yml" ]; then
    log_error "docker-compose.debug.yml not found!"
    log_error "Please run this script from the ObsidianComments root directory"
    exit 1
fi

# Start main function
main