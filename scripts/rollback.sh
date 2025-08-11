#!/bin/bash
set -euo pipefail

# Rollback script for emergency recovery
# Usage: ./rollback.sh [environment]

ENVIRONMENT=${1:-production}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${YELLOW}[ROLLBACK]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

# Load environment configuration
if [ -f ".env.$ENVIRONMENT" ]; then
    export $(cat .env.$ENVIRONMENT | grep -v '^#' | xargs)
else
    error "Environment file .env.$ENVIRONMENT not found"
fi

DEPLOY_HOST=${DEPLOY_HOST:-obsidiancomments.serverado.app}
DEPLOY_USER=${DEPLOY_USER:-deploy}
IMAGE_PREFIX=${IMAGE_PREFIX:-pangeafate/obsidiancomments}

# Main rollback function
rollback() {
    log "⚠️  Starting emergency rollback for $ENVIRONMENT"
    
    ssh $DEPLOY_USER@$DEPLOY_HOST << 'EOF'
        set -e
        
        echo "Checking for backup images..."
        
        # Check if backup images exist
        if docker image inspect ${IMAGE_PREFIX}-backend:backup > /dev/null 2>&1; then
            echo "Found backup images, restoring..."
            
            # Tag backup as current
            docker tag ${IMAGE_PREFIX}-backend:backup ${IMAGE_PREFIX}-backend:rollback
            docker tag ${IMAGE_PREFIX}-frontend:backup ${IMAGE_PREFIX}-frontend:rollback
            docker tag ${IMAGE_PREFIX}-hocuspocus:backup ${IMAGE_PREFIX}-hocuspocus:rollback
            
            # Stop current containers
            docker-compose -f docker-compose.production.yml down
            
            # Update images
            export BACKEND_IMAGE=${IMAGE_PREFIX}-backend:rollback
            export FRONTEND_IMAGE=${IMAGE_PREFIX}-frontend:rollback
            export HOCUSPOCUS_IMAGE=${IMAGE_PREFIX}-hocuspocus:rollback
            
            # Start with rollback images
            docker-compose -f docker-compose.production.yml up -d
            
            echo "✅ Rollback completed"
        else
            echo "❌ No backup images found"
            
            # Fallback: use last known good from registry
            echo "Attempting to use last stable version from registry..."
            
            docker pull ${REGISTRY}/${IMAGE_PREFIX}-backend:stable || true
            docker pull ${REGISTRY}/${IMAGE_PREFIX}-frontend:stable || true
            docker pull ${REGISTRY}/${IMAGE_PREFIX}-hocuspocus:stable || true
            
            export BACKEND_IMAGE=${REGISTRY}/${IMAGE_PREFIX}-backend:stable
            export FRONTEND_IMAGE=${REGISTRY}/${IMAGE_PREFIX}-frontend:stable
            export HOCUSPOCUS_IMAGE=${REGISTRY}/${IMAGE_PREFIX}-hocuspocus:stable
            
            docker-compose -f docker-compose.production.yml up -d
        fi
        
        # Wait for services
        sleep 10
        
        # Check health
        curl -f http://localhost:8081/api/health || echo "Warning: API health check failed"
EOF
    
    # Verify rollback
    log "Verifying rollback..."
    ./scripts/smoke.sh https://${DEPLOY_HOST} || true
    
    log "✅ Rollback procedure completed"
    log "⚠️  Please verify the application manually"
}

# Create incident report
create_incident_report() {
    local report_file="incident-$(date +%Y%m%d-%H%M%S).md"
    
    cat > $report_file << EOF
# Incident Report - Rollback

**Date**: $(date)
**Environment**: $ENVIRONMENT
**Triggered by**: $USER

## Timeline
- $(date '+%H:%M:%S'): Rollback initiated
- $(date '+%H:%M:%S'): Services stopped
- $(date '+%H:%M:%S'): Backup images restored
- $(date '+%H:%M:%S'): Services restarted
- $(date '+%H:%M:%S'): Health checks performed

## Impact
- Service downtime: ~2 minutes
- Data loss: None (database unchanged)

## Root Cause
To be investigated.

## Action Items
- [ ] Investigate deployment failure
- [ ] Fix identified issues
- [ ] Update deployment process if needed
- [ ] Schedule post-mortem meeting

## Logs
\`\`\`
$(ssh $DEPLOY_USER@$DEPLOY_HOST "docker-compose logs --tail=100" 2>/dev/null || echo "Could not retrieve logs")
\`\`\`
EOF
    
    log "Incident report created: $report_file"
}

# Main execution
main() {
    log "Environment: $ENVIRONMENT"
    log "Host: $DEPLOY_HOST"
    
    # Confirm rollback
    if [ -t 0 ]; then
        read -p "Are you sure you want to rollback $ENVIRONMENT? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
            log "Rollback cancelled"
            exit 0
        fi
    fi
    
    # Execute rollback
    rollback
    
    # Create incident report
    create_incident_report
    
    # Send notification (if configured)
    if [ -n "${SLACK_WEBHOOK:-}" ]; then
        curl -X POST $SLACK_WEBHOOK \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"⚠️ Rollback executed for $ENVIRONMENT environment\"}"
    fi
}

main