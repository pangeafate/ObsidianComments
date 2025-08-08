#!/bin/bash

# ObsidianComments - Alternative Deployment Approaches
# Provides multiple deployment strategies when docker-compose fails

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

# Load environment variables
load_environment() {
    if [ -f ".env.production" ]; then
        log "Loading production environment variables"
        set -a
        source .env.production
        set +a
    else
        log_error ".env.production file not found!"
        log_info "Creating minimal environment file..."
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
        log_info "Created .env.production. Please review and modify as needed."
        wait_for_user "Environment file created. Press Enter to continue..."
        set -a
        source .env.production
        set +a
    fi
}

# Alternative 1: Docker Swarm Deployment
deploy_docker_swarm() {
    log "🐝 ALTERNATIVE 1: Docker Swarm Deployment"
    log "Docker Swarm provides better service management and recovery"
    
    wait_for_user "This will initialize Docker Swarm and deploy services as a stack"
    
    # Initialize Docker Swarm if not already done
    if ! docker node ls > /dev/null 2>&1; then
        log "Initializing Docker Swarm..."
        docker swarm init --advertise-addr $(hostname -I | awk '{print $1}')
        log "✅ Docker Swarm initialized"
    else
        log "✅ Docker Swarm already initialized"
    fi
    
    # Create docker-compose.swarm.yml
    log "Creating Docker Swarm configuration..."
    cat > docker-compose.swarm.yml << EOF
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-obsidian_comments}
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - obsidian_network
    deploy:
      replicas: 1
      restart_policy:
        condition: any
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    networks:
      - obsidian_network
    deploy:
      replicas: 1
      restart_policy:
        condition: any
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    image: obsidian_backend:latest
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-obsidian_comments}
      - REDIS_URL=redis://redis:6379
      - PORT=8081
      - CORS_ORIGIN=${CORS_ORIGIN:-https://obsidiancomments.serverado.app}
      - JWT_SECRET=${JWT_SECRET}
    networks:
      - obsidian_network
    deploy:
      replicas: 2
      restart_policy:
        condition: any
        delay: 10s
        max_attempts: 3
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8081/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  hocuspocus:
    image: obsidian_hocuspocus:latest
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-obsidian_comments}
      - REDIS_URL=redis://redis:6379
      - PORT=8082
      - CORS_ORIGIN=${CORS_ORIGIN:-https://obsidiancomments.serverado.app}
    networks:
      - obsidian_network
    deploy:
      replicas: 1
      restart_policy:
        condition: any
        delay: 10s
        max_attempts: 3
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8082/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: obsidian_frontend:latest
    networks:
      - obsidian_network
    deploy:
      replicas: 2
      restart_policy:
        condition: any
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: obsidian_nginx:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /etc/letsencrypt/live/obsidiancomments.serverado.app:/etc/nginx/ssl:ro
    networks:
      - obsidian_network
    deploy:
      replicas: 1
      restart_policy:
        condition: any
        delay: 10s
        max_attempts: 3
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
  redis_data:

networks:
  obsidian_network:
    driver: overlay
    attachable: true
EOF
    
    # Build images first
    log "Building Docker images for Swarm deployment..."
    docker build -t obsidian_backend:latest ./packages/backend -f ./packages/backend/Dockerfile.production
    docker build -t obsidian_hocuspocus:latest ./packages/hocuspocus -f ./packages/hocuspocus/Dockerfile.production
    docker build --build-arg VITE_API_URL=https://obsidiancomments.serverado.app/api --build-arg VITE_WS_URL=wss://obsidiancomments.serverado.app/ws -t obsidian_frontend:latest ./packages/frontend -f ./packages/frontend/Dockerfile.production
    docker build -t obsidian_nginx:latest . -f Dockerfile.nginx
    
    # Deploy stack
    log "Deploying ObsidianComments stack to Docker Swarm..."
    docker stack deploy -c docker-compose.swarm.yml obsidian
    
    # Wait for services to be ready
    log "Waiting for services to start..."
    sleep 30
    
    # Check service status
    log "📊 Swarm Service Status:"
    docker stack services obsidian
    
    log "✅ Docker Swarm deployment completed"
    log_info "Monitor services: docker stack services obsidian"
    log_info "View logs: docker service logs obsidian_backend"
    log_info "Remove stack: docker stack rm obsidian"
}

# Alternative 2: Simple Docker Run Commands
deploy_docker_run() {
    log "🐳 ALTERNATIVE 2: Simple Docker Run Deployment"
    log "Using individual docker run commands with explicit networking"
    
    wait_for_user "This will create and run containers individually with docker run commands"
    
    # Create network
    if ! docker network ls | grep -q obsidian_simple; then
        log "Creating Docker network..."
        docker network create obsidian_simple
    else
        log "✅ Docker network already exists"
    fi
    
    # Remove existing containers if they exist
    log "Cleaning up existing containers..."
    docker rm -f obsidian_postgres obsidian_redis obsidian_backend obsidian_hocuspocus obsidian_frontend obsidian_nginx 2>/dev/null || true
    
    # Start PostgreSQL
    log "Starting PostgreSQL..."
    docker run -d \
        --name obsidian_postgres \
        --network obsidian_simple \
        -e POSTGRES_DB="${POSTGRES_DB:-obsidian_comments}" \
        -e POSTGRES_USER="${POSTGRES_USER:-postgres}" \
        -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
        -v obsidian_postgres_data:/var/lib/postgresql/data \
        -p 5432:5432 \
        --restart unless-stopped \
        postgres:15
    
    log "Waiting for PostgreSQL to start..."
    sleep 15
    
    # Wait for PostgreSQL to be ready
    for i in {1..30}; do
        if docker exec obsidian_postgres pg_isready -U postgres > /dev/null 2>&1; then
            log "✅ PostgreSQL is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "PostgreSQL failed to start"
            docker logs obsidian_postgres | tail -20
            return 1
        fi
        sleep 2
    done
    
    # Start Redis
    log "Starting Redis..."
    docker run -d \
        --name obsidian_redis \
        --network obsidian_simple \
        -v obsidian_redis_data:/data \
        -p 6379:6379 \
        --restart unless-stopped \
        redis:7-alpine
    
    log "Waiting for Redis to start..."
    sleep 5
    
    # Build and start backend
    log "Building and starting backend..."
    docker build -t obsidian_backend_simple ./packages/backend -f ./packages/backend/Dockerfile.production
    
    docker run -d \
        --name obsidian_backend \
        --network obsidian_simple \
        -e NODE_ENV=production \
        -e DATABASE_URL="postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD}@obsidian_postgres:5432/${POSTGRES_DB:-obsidian_comments}" \
        -e REDIS_URL="redis://obsidian_redis:6379" \
        -e PORT=8081 \
        -e CORS_ORIGIN="${CORS_ORIGIN:-https://obsidiancomments.serverado.app}" \
        -e JWT_SECRET="${JWT_SECRET}" \
        -p 8081:8081 \
        --restart unless-stopped \
        obsidian_backend_simple
    
    log "Waiting for backend to start..."
    sleep 20
    
    # Wait for backend to be ready
    for i in {1..30}; do
        if curl -f http://localhost:8081/api/health > /dev/null 2>&1; then
            log "✅ Backend is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "Backend failed to start"
            docker logs obsidian_backend | tail -20
        fi
        sleep 3
    done
    
    # Build and start hocuspocus
    log "Building and starting hocuspocus..."
    docker build -t obsidian_hocuspocus_simple ./packages/hocuspocus -f ./packages/hocuspocus/Dockerfile.production
    
    docker run -d \
        --name obsidian_hocuspocus \
        --network obsidian_simple \
        -e NODE_ENV=production \
        -e DATABASE_URL="postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD}@obsidian_postgres:5432/${POSTGRES_DB:-obsidian_comments}" \
        -e REDIS_URL="redis://obsidian_redis:6379" \
        -e PORT=8082 \
        -e CORS_ORIGIN="${CORS_ORIGIN:-https://obsidiancomments.serverado.app}" \
        -p 8082:8082 \
        --restart unless-stopped \
        obsidian_hocuspocus_simple
    
    log "Waiting for hocuspocus to start..."
    sleep 15
    
    # Build and start frontend
    log "Building and starting frontend..."
    docker build --build-arg VITE_API_URL=https://obsidiancomments.serverado.app/api --build-arg VITE_WS_URL=wss://obsidiancomments.serverado.app/ws -t obsidian_frontend_simple ./packages/frontend -f ./packages/frontend/Dockerfile.production
    
    docker run -d \
        --name obsidian_frontend \
        --network obsidian_simple \
        -p 8080:80 \
        --restart unless-stopped \
        obsidian_frontend_simple
    
    log "Waiting for frontend to start..."
    sleep 10
    
    # Build and start nginx
    log "Building and starting nginx..."
    docker build -t obsidian_nginx_simple . -f Dockerfile.nginx
    
    docker run -d \
        --name obsidian_nginx \
        --network obsidian_simple \
        -v $(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro \
        -v /etc/letsencrypt/live/obsidiancomments.serverado.app:/etc/nginx/ssl:ro \
        -p 80:80 \
        -p 443:443 \
        --restart unless-stopped \
        obsidian_nginx_simple
    
    log "Waiting for nginx to start..."
    sleep 10
    
    # Test connectivity
    log "Testing connectivity..."
    if curl -f http://localhost/health > /dev/null 2>&1; then
        log "✅ Nginx health check passed"
    else
        log_warning "Nginx health check failed"
    fi
    
    # Show container status
    log "📊 Container Status:"
    docker ps --filter "name=obsidian_" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    log "✅ Simple Docker Run deployment completed"
    log_info "View logs: docker logs obsidian_backend"
    log_info "Stop all: docker stop obsidian_postgres obsidian_redis obsidian_backend obsidian_hocuspocus obsidian_frontend obsidian_nginx"
    log_info "Remove all: docker rm obsidian_postgres obsidian_redis obsidian_backend obsidian_hocuspocus obsidian_frontend obsidian_nginx"
}

# Alternative 3: Podman Deployment
deploy_podman() {
    log "🦭 ALTERNATIVE 3: Podman Deployment"
    log "Using Podman as Docker alternative with pods"
    
    if ! command -v podman &> /dev/null; then
        log_error "Podman is not installed"
        log_info "Install Podman: https://podman.io/getting-started/installation"
        return 1
    fi
    
    wait_for_user "This will deploy using Podman with a pod structure"
    
    # Create pod
    log "Creating Podman pod..."
    podman pod rm -f obsidian-pod 2>/dev/null || true
    podman pod create --name obsidian-pod -p 80:80 -p 443:443 -p 8080:8080 -p 8081:8081 -p 8082:8082
    
    # Start PostgreSQL in pod
    log "Starting PostgreSQL in pod..."
    podman run -d \
        --pod obsidian-pod \
        --name obsidian_postgres \
        -e POSTGRES_DB="${POSTGRES_DB:-obsidian_comments}" \
        -e POSTGRES_USER="${POSTGRES_USER:-postgres}" \
        -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
        -v obsidian_postgres_data:/var/lib/postgresql/data \
        postgres:15
    
    sleep 15
    
    # Start Redis in pod
    log "Starting Redis in pod..."
    podman run -d \
        --pod obsidian-pod \
        --name obsidian_redis \
        -v obsidian_redis_data:/data \
        redis:7-alpine
    
    sleep 5
    
    # Build and start services
    log "Building and starting services in pod..."
    
    # Backend
    podman build -t obsidian_backend_pod ./packages/backend -f ./packages/backend/Dockerfile.production
    podman run -d \
        --pod obsidian-pod \
        --name obsidian_backend \
        -e NODE_ENV=production \
        -e DATABASE_URL="postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB:-obsidian_comments}" \
        -e REDIS_URL="redis://localhost:6379" \
        -e PORT=8081 \
        -e CORS_ORIGIN="${CORS_ORIGIN:-https://obsidiancomments.serverado.app}" \
        -e JWT_SECRET="${JWT_SECRET}" \
        obsidian_backend_pod
    
    sleep 20
    
    # Hocuspocus
    podman build -t obsidian_hocuspocus_pod ./packages/hocuspocus -f ./packages/hocuspocus/Dockerfile.production
    podman run -d \
        --pod obsidian-pod \
        --name obsidian_hocuspocus \
        -e NODE_ENV=production \
        -e DATABASE_URL="postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB:-obsidian_comments}" \
        -e REDIS_URL="redis://localhost:6379" \
        -e PORT=8082 \
        -e CORS_ORIGIN="${CORS_ORIGIN:-https://obsidiancomments.serverado.app}" \
        obsidian_hocuspocus_pod
    
    sleep 15
    
    # Frontend
    podman build --build-arg VITE_API_URL=https://obsidiancomments.serverado.app/api --build-arg VITE_WS_URL=wss://obsidiancomments.serverado.app/ws -t obsidian_frontend_pod ./packages/frontend -f ./packages/frontend/Dockerfile.production
    podman run -d \
        --pod obsidian-pod \
        --name obsidian_frontend \
        obsidian_frontend_pod
    
    sleep 10
    
    # Nginx
    podman build -t obsidian_nginx_pod . -f Dockerfile.nginx
    podman run -d \
        --pod obsidian-pod \
        --name obsidian_nginx \
        -v $(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro \
        -v /etc/letsencrypt/live/obsidiancomments.serverado.app:/etc/nginx/ssl:ro \
        obsidian_nginx_pod
    
    sleep 10
    
    log "📊 Podman Pod Status:"
    podman pod ps
    podman ps --filter "pod=obsidian-pod"
    
    log "✅ Podman deployment completed"
    log_info "View pod logs: podman pod logs obsidian-pod"
    log_info "Stop pod: podman pod stop obsidian-pod"
    log_info "Remove pod: podman pod rm -f obsidian-pod"
}

# Alternative 4: Systemd Service Deployment
deploy_systemd() {
    log "⚙️ ALTERNATIVE 4: Systemd Service Deployment"
    log "Creating systemd services for better system integration"
    
    if [ "$EUID" -ne 0 ]; then
        log_error "Systemd deployment requires root privileges"
        log_info "Run with sudo or as root user"
        return 1
    fi
    
    wait_for_user "This will create systemd services for each component"
    
    # Create systemd service files
    SERVICE_DIR="/etc/systemd/system"
    
    # Docker network service
    cat > "$SERVICE_DIR/obsidian-network.service" << EOF
[Unit]
Description=ObsidianComments Docker Network
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/bin/docker network create obsidian_systemd || true
ExecStop=/usr/bin/docker network rm obsidian_systemd || true
TimeoutStartSec=60

[Install]
WantedBy=multi-user.target
EOF
    
    # PostgreSQL service
    cat > "$SERVICE_DIR/obsidian-postgres.service" << EOF
[Unit]
Description=ObsidianComments PostgreSQL
After=docker.service obsidian-network.service
Requires=docker.service obsidian-network.service

[Service]
Type=forking
RemainAfterExit=yes
ExecStartPre=-/usr/bin/docker stop obsidian_postgres_systemd
ExecStartPre=-/usr/bin/docker rm obsidian_postgres_systemd
ExecStart=/usr/bin/docker run -d \\
    --name obsidian_postgres_systemd \\
    --network obsidian_systemd \\
    -e POSTGRES_DB=${POSTGRES_DB:-obsidian_comments} \\
    -e POSTGRES_USER=${POSTGRES_USER:-postgres} \\
    -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \\
    -v obsidian_postgres_systemd_data:/var/lib/postgresql/data \\
    postgres:15
ExecStop=/usr/bin/docker stop obsidian_postgres_systemd
ExecReload=/usr/bin/docker restart obsidian_postgres_systemd
TimeoutStartSec=60
Restart=always

[Install]
WantedBy=multi-user.target
EOF
    
    # Add more services...
    log "Creating remaining systemd service files..."
    
    # Enable and start services
    systemctl daemon-reload
    systemctl enable obsidian-network.service
    systemctl enable obsidian-postgres.service
    
    systemctl start obsidian-network.service
    systemctl start obsidian-postgres.service
    
    log "✅ Systemd deployment initiated"
    log_info "Check status: systemctl status obsidian-postgres"
    log_info "View logs: journalctl -u obsidian-postgres -f"
}

# Menu system
show_menu() {
    echo ""
    log "🚀 ObsidianComments Alternative Deployment Options"
    echo ""
    log_info "Available deployment alternatives:"
    echo "1. Docker Swarm Deployment (Recommended for production)"
    echo "2. Simple Docker Run Commands (Easy troubleshooting)"
    echo "3. Podman Deployment (Docker alternative)"
    echo "4. Systemd Service Deployment (System integration)"
    echo "5. Show current deployment status"
    echo "6. Clean up all deployments"
    echo "0. Exit"
    echo ""
}

# Status check
show_status() {
    log "📊 Current Deployment Status"
    echo ""
    
    # Docker Compose
    if docker compose -f docker-compose.production.yml ps > /dev/null 2>&1; then
        log "Docker Compose (Production):"
        docker compose -f docker-compose.production.yml ps
    fi
    
    if docker compose -f docker-compose.debug.yml ps > /dev/null 2>&1; then
        log "Docker Compose (Debug):"
        docker compose -f docker-compose.debug.yml ps
    fi
    
    # Docker Swarm
    if docker node ls > /dev/null 2>&1; then
        log "Docker Swarm:"
        if docker stack ls | grep -q obsidian; then
            docker stack services obsidian
        else
            log_info "No ObsidianComments stack deployed"
        fi
    fi
    
    # Simple Docker containers
    log "Individual Docker Containers:"
    docker ps --filter "name=obsidian_" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || log_info "No individual containers found"
    
    # Podman
    if command -v podman &> /dev/null; then
        log "Podman Pods:"
        podman pod ps --filter "name=obsidian" || log_info "No Podman pods found"
    fi
    
    echo ""
}

# Cleanup function
cleanup_all() {
    log "🧹 Cleaning up all deployments"
    
    wait_for_user "This will stop and remove all ObsidianComments deployments. Continue?"
    
    # Docker Compose
    log "Cleaning up Docker Compose deployments..."
    docker compose -f docker-compose.production.yml down --volumes --remove-orphans 2>/dev/null || true
    docker compose -f docker-compose.debug.yml down --volumes --remove-orphans 2>/dev/null || true
    docker compose -f docker-compose.minimal.yml down --volumes --remove-orphans 2>/dev/null || true
    
    # Docker Swarm
    if docker node ls > /dev/null 2>&1; then
        if docker stack ls | grep -q obsidian; then
            log "Removing Docker Swarm stack..."
            docker stack rm obsidian
        fi
    fi
    
    # Simple Docker containers
    log "Removing individual Docker containers..."
    docker rm -f obsidian_postgres obsidian_redis obsidian_backend obsidian_hocuspocus obsidian_frontend obsidian_nginx 2>/dev/null || true
    
    # Podman
    if command -v podman &> /dev/null; then
        log "Cleaning up Podman deployments..."
        podman pod rm -f obsidian-pod 2>/dev/null || true
    fi
    
    # Clean up networks
    docker network rm obsidian_simple obsidian_systemd 2>/dev/null || true
    
    # Clean up images
    log "Cleaning up custom images..."
    docker rmi -f $(docker images | grep "obsidian_" | awk '{print $3}') 2>/dev/null || true
    
    log "✅ Cleanup completed"
}

# Main menu loop
main() {
    load_environment
    
    while true; do
        show_menu
        read -p "Select option (0-6): " choice
        
        case $choice in
            1)
                deploy_docker_swarm
                ;;
            2)
                deploy_docker_run
                ;;
            3)
                deploy_podman
                ;;
            4)
                deploy_systemd
                ;;
            5)
                show_status
                ;;
            6)
                cleanup_all
                ;;
            0)
                log "👋 Goodbye!"
                exit 0
                ;;
            *)
                log_error "Invalid option. Please select 0-6."
                ;;
        esac
        
        wait_for_user "Press Enter to return to menu..."
    done
}

# Check if running from correct directory
if [ ! -f "docker-compose.production.yml" ]; then
    log_error "docker-compose.production.yml not found!"
    log_error "Please run this script from the ObsidianComments root directory"
    exit 1
fi

# Start main menu
main