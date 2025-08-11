#!/bin/bash
set -euo pipefail

# Deploy script with blue-green deployment strategy
# Usage: ./deploy.sh <environment> <version>

ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}
PERCENTAGE=${3:-100}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Validate environment
case $ENVIRONMENT in
    staging|production|canary)
        log "Deploying to $ENVIRONMENT environment"
        ;;
    *)
        error "Invalid environment: $ENVIRONMENT. Must be staging, production, or canary"
        ;;
esac

# Load environment-specific configuration
if [ -f ".env.$ENVIRONMENT" ]; then
    export $(cat .env.$ENVIRONMENT | grep -v '^#' | xargs)
else
    error "Environment file .env.$ENVIRONMENT not found"
fi

# Set deployment variables
DEPLOY_HOST=${DEPLOY_HOST:-obsidiancomments.serverado.app}
DEPLOY_USER=${DEPLOY_USER:-deploy}
REGISTRY=${REGISTRY:-ghcr.io}
IMAGE_PREFIX=${IMAGE_PREFIX:-pangeafate/obsidiancomments}

# Health check function
health_check() {
    local url=$1
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url/api/health" > /dev/null; then
            log "✅ Health check passed"
            return 0
        fi
        log "Attempt $attempt/$max_attempts: Waiting for service..."
        sleep 5
        ((attempt++))
    done
    
    error "Health check failed after $max_attempts attempts"
}

# Backup function
backup_current() {
    log "Creating backup of current deployment..."
    ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
        docker tag ${IMAGE_PREFIX}-backend:current ${IMAGE_PREFIX}-backend:backup || true
        docker tag ${IMAGE_PREFIX}-frontend:current ${IMAGE_PREFIX}-frontend:backup || true
        docker tag ${IMAGE_PREFIX}-hocuspocus:current ${IMAGE_PREFIX}-hocuspocus:backup || true
        
        # Backup database
        docker exec obsidiancomments-postgres-1 pg_dump -U postgres obsidian_comments | gzip > backup-$(date +%Y%m%d-%H%M%S).sql.gz
EOF
    log "Backup completed"
}

# Deploy function
deploy() {
    local color=$1  # blue or green
    
    log "Starting $color deployment..."
    
    # Pull new images
    ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
        docker pull ${REGISTRY}/${IMAGE_PREFIX}-backend:${VERSION}
        docker pull ${REGISTRY}/${IMAGE_PREFIX}-frontend:${VERSION}
        docker pull ${REGISTRY}/${IMAGE_PREFIX}-hocuspocus:${VERSION}
        
        # Tag as deployment color
        docker tag ${REGISTRY}/${IMAGE_PREFIX}-backend:${VERSION} ${IMAGE_PREFIX}-backend:${color}
        docker tag ${REGISTRY}/${IMAGE_PREFIX}-frontend:${VERSION} ${IMAGE_PREFIX}-frontend:${color}
        docker tag ${REGISTRY}/${IMAGE_PREFIX}-hocuspocus:${VERSION} ${IMAGE_PREFIX}-hocuspocus:${color}
EOF
    
    # Start new color stack
    ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
        cd ~/obsidian-comments
        
        # Export color for docker-compose
        export DEPLOY_COLOR=${color}
        export BACKEND_IMAGE=${IMAGE_PREFIX}-backend:${color}
        export FRONTEND_IMAGE=${IMAGE_PREFIX}-frontend:${color}
        export HOCUSPOCUS_IMAGE=${IMAGE_PREFIX}-hocuspocus:${color}
        
        # Start the new stack
        docker-compose -f docker-compose.${color}.yml up -d --no-build
        
        # Run migrations
        docker exec obsidiancomments-${color}-backend-1 npx prisma migrate deploy
EOF
    
    log "$color deployment started"
}

# Switch traffic function
switch_traffic() {
    local target=$1  # blue or green
    local percentage=$2
    
    log "Switching $percentage% traffic to $target..."
    
    ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
        cd ~/obsidian-comments
        
        # Update nginx configuration
        if [ "$percentage" = "100" ]; then
            # Full switch
            ln -sf nginx-${target}.conf /etc/nginx/sites-enabled/obsidiancomments
        else
            # Canary deployment with weighted routing
            cat > /etc/nginx/sites-enabled/obsidiancomments << NGINX
upstream backend {
    server obsidiancomments-blue-backend-1:8081 weight=$((100-percentage));
    server obsidiancomments-green-backend-1:8081 weight=${percentage};
}

upstream frontend {
    server obsidiancomments-blue-frontend-1:80 weight=$((100-percentage));
    server obsidiancomments-green-frontend-1:80 weight=${percentage};
}

upstream hocuspocus {
    server obsidiancomments-blue-hocuspocus-1:8082 weight=$((100-percentage));
    server obsidiancomments-green-hocuspocus-1:8082 weight=${percentage};
}
NGINX
        fi
        
        # Reload nginx
        nginx -t && nginx -s reload
EOF
    
    log "Traffic switched successfully"
}

# Cleanup old deployment
cleanup_old() {
    local old_color=$1
    
    log "Cleaning up $old_color deployment..."
    
    ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
        cd ~/obsidian-comments
        
        # Stop old containers
        docker-compose -f docker-compose.${old_color}.yml down
        
        # Remove old images (keep backup)
        docker image prune -f
EOF
    
    log "Cleanup completed"
}

# Main deployment flow
main() {
    log "🚀 Starting deployment to $ENVIRONMENT (version: $VERSION)"
    
    # Determine current color
    CURRENT_COLOR=$(ssh $DEPLOY_USER@$DEPLOY_HOST "docker ps --format '{{.Names}}' | grep -o 'blue\|green' | head -1" || echo "blue")
    NEW_COLOR=$([ "$CURRENT_COLOR" = "blue" ] && echo "green" || echo "blue")
    
    log "Current deployment: $CURRENT_COLOR, deploying to: $NEW_COLOR"
    
    # Step 1: Backup current deployment
    if [ "$ENVIRONMENT" = "production" ]; then
        backup_current
    fi
    
    # Step 2: Deploy new version
    deploy $NEW_COLOR
    
    # Step 3: Health check new deployment
    health_check "http://${DEPLOY_HOST}:8081"
    
    # Step 4: Switch traffic
    if [ "$ENVIRONMENT" = "canary" ]; then
        switch_traffic $NEW_COLOR $PERCENTAGE
        log "Canary deployment active with $PERCENTAGE% traffic"
    else
        switch_traffic $NEW_COLOR 100
        
        # Step 5: Cleanup old deployment (after 5 minutes)
        if [ "$ENVIRONMENT" = "production" ]; then
            log "Waiting 5 minutes before cleanup..."
            sleep 300
            cleanup_old $CURRENT_COLOR
        fi
    fi
    
    # Tag as current
    ssh $DEPLOY_USER@$DEPLOY_HOST << EOF
        docker tag ${IMAGE_PREFIX}-backend:${NEW_COLOR} ${IMAGE_PREFIX}-backend:current
        docker tag ${IMAGE_PREFIX}-frontend:${NEW_COLOR} ${IMAGE_PREFIX}-frontend:current
        docker tag ${IMAGE_PREFIX}-hocuspocus:${NEW_COLOR} ${IMAGE_PREFIX}-hocuspocus:current
EOF
    
    log "✅ Deployment completed successfully!"
    log "URL: https://${DEPLOY_HOST}"
}

# Run main function
main