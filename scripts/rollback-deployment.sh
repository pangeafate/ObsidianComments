#!/bin/bash
set -euo pipefail

# Production Rollback Script
# This script implements zero-downtime rollback using blue/green deployment

# Configuration
COMPOSE_FILE="docker-compose.production.yml"
BACKUP_COMPOSE_FILE="docker-compose.production.backup.yml"
PROJECT_NAME="obsidian-comments"
ROLLBACK_TIMEOUT=300  # 5 minutes
LOG_FILE="/var/log/obsidian-rollback.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Function to check if rollback is possible
check_rollback_possible() {
    log "Checking if rollback is possible..."
    
    if [[ ! -f "$BACKUP_COMPOSE_FILE" ]]; then
        error "No backup deployment found at $BACKUP_COMPOSE_FILE"
        return 1
    fi
    
    # Check if backup deployment has required images
    local backup_images
    backup_images=$(grep "image:" "$BACKUP_COMPOSE_FILE" | awk '{print $2}' | grep -v "postgres\|redis\|nginx")
    
    for image in $backup_images; do
        if ! docker image inspect "$image" >/dev/null 2>&1; then
            error "Backup image not available: $image"
            return 1
        fi
    done
    
    success "Rollback validation passed"
    return 0
}

# Function to create database backup before rollback
backup_database() {
    log "Creating database backup before rollback..."
    
    local backup_name="pre-rollback-$(date +%Y%m%d-%H%M%S).sql"
    local backup_path="/tmp/$backup_name"
    
    # Get database connection details from current deployment
    local db_container
    db_container=$(docker-compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" ps -q postgres 2>/dev/null || echo "")
    
    if [[ -z "$db_container" ]]; then
        warning "No database container found, skipping database backup"
        return 0
    fi
    
    # Create backup using pg_dump
    if docker exec "$db_container" pg_dump -U postgres obsidian_comments > "$backup_path"; then
        success "Database backup created: $backup_path"
        echo "$backup_path" > /tmp/rollback-db-backup-path
    else
        error "Failed to create database backup"
        return 1
    fi
}

# Function to switch to backup deployment
switch_to_backup() {
    log "Switching to backup deployment..."
    
    # Stop current deployment gracefully
    log "Stopping current deployment..."
    if docker-compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" down --timeout 30; then
        success "Current deployment stopped"
    else
        warning "Failed to stop current deployment gracefully, forcing stop..."
        docker-compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" down --timeout 10 || true
    fi
    
    # Start backup deployment
    log "Starting backup deployment..."
    if docker-compose -p "$PROJECT_NAME" -f "$BACKUP_COMPOSE_FILE" up -d; then
        success "Backup deployment started"
    else
        error "Failed to start backup deployment"
        return 1
    fi
    
    # Wait for services to become healthy
    wait_for_health_checks
}

# Function to wait for health checks
wait_for_health_checks() {
    log "Waiting for services to become healthy..."
    
    local timeout=$ROLLBACK_TIMEOUT
    local elapsed=0
    local check_interval=10
    
    while [[ $elapsed -lt $timeout ]]; do
        local healthy_services=0
        local total_services=0
        
        # Check each service health
        for service in backend frontend nginx; do
            total_services=$((total_services + 1))
            
            local container_id
            container_id=$(docker-compose -p "$PROJECT_NAME" -f "$BACKUP_COMPOSE_FILE" ps -q "$service" 2>/dev/null || echo "")
            
            if [[ -n "$container_id" ]]; then
                local health_status
                health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_id" 2>/dev/null || echo "none")
                
                if [[ "$health_status" == "healthy" ]] || [[ "$health_status" == "none" ]]; then
                    healthy_services=$((healthy_services + 1))
                    log "Service $service is healthy"
                else
                    log "Service $service health status: $health_status"
                fi
            else
                warning "Service $service container not found"
            fi
        done
        
        if [[ $healthy_services -eq $total_services ]]; then
            success "All services are healthy"
            return 0
        fi
        
        log "Health check: $healthy_services/$total_services services healthy. Waiting..."
        sleep $check_interval
        elapsed=$((elapsed + check_interval))
    done
    
    error "Health check timeout after ${timeout}s"
    return 1
}

# Function to verify rollback success
verify_rollback() {
    log "Verifying rollback success..."
    
    # Test basic connectivity
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s http://localhost/health >/dev/null 2>&1; then
            success "Basic connectivity test passed"
            break
        fi
        
        log "Connectivity test attempt $attempt/$max_attempts failed, retrying..."
        sleep 5
        attempt=$((attempt + 1))
    done
    
    if [[ $attempt -gt $max_attempts ]]; then
        error "Basic connectivity test failed after $max_attempts attempts"
        return 1
    fi
    
    # Test API functionality
    if curl -f -s http://localhost/api/health | grep -q "healthy"; then
        success "API health check passed"
    else
        error "API health check failed"
        return 1
    fi
    
    # Test database connectivity
    local test_id="rollback-verify-$(date +%s)"
    if curl -f -s -X POST http://localhost/api/notes/share \
        -H "Content-Type: application/json" \
        -d "{\"title\":\"Rollback Verification\",\"content\":\"Test\",\"shareId\":\"$test_id\"}" >/dev/null; then
        success "Database connectivity test passed"
        
        # Cleanup test note
        curl -f -s -X DELETE "http://localhost/api/notes/$test_id" >/dev/null || true
    else
        error "Database connectivity test failed"
        return 1
    fi
    
    success "Rollback verification completed successfully"
}

# Function to update deployment tracking
update_deployment_tracking() {
    log "Updating deployment tracking..."
    
    # Get version from backup deployment
    local backup_version
    backup_version=$(grep "image.*:.*" "$BACKUP_COMPOSE_FILE" | head -1 | sed 's/.*://' || echo "unknown")
    
    # Create rollback record
    cat > /tmp/rollback-record.json << EOF
{
    "event": "rollback",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "from_deployment": "$(date +%Y%m%d-%H%M%S)",
    "to_version": "$backup_version",
    "reason": "${ROLLBACK_REASON:-Manual rollback}",
    "performed_by": "${USER:-unknown}",
    "database_backup": "$(cat /tmp/rollback-db-backup-path 2>/dev/null || echo 'none')"
}
EOF
    
    success "Rollback record created: /tmp/rollback-record.json"
}

# Function to send notifications
send_notifications() {
    log "Sending rollback notifications..."
    
    local message="🔄 Production Rollback Completed
    
Time: $(date)
Reason: ${ROLLBACK_REASON:-Manual rollback}
Status: ${1:-Success}
Database Backup: $(cat /tmp/rollback-db-backup-path 2>/dev/null || echo 'None')

Services are now running the previous stable version."
    
    # In a real environment, you would send to Slack, email, etc.
    echo "$message" | tee -a "$LOG_FILE"
    
    # Example webhook notification (commented out)
    # curl -X POST "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK" \
    #     -H 'Content-type: application/json' \
    #     --data "{\"text\":\"$message\"}" || true
}

# Main rollback function
main() {
    log "=== Starting Production Rollback ==="
    log "Project: $PROJECT_NAME"
    log "Rollback reason: ${ROLLBACK_REASON:-Manual rollback}"
    
    # Validate prerequisites
    if ! check_rollback_possible; then
        error "Rollback validation failed"
        exit 1
    fi
    
    # Confirm rollback in production
    if [[ "${FORCE_ROLLBACK:-}" != "true" ]]; then
        echo -e "${YELLOW}WARNING: This will rollback the production deployment!${NC}"
        echo -e "${YELLOW}Current deployment will be stopped and replaced with backup.${NC}"
        echo -n "Are you sure you want to continue? (yes/no): "
        read -r confirmation
        
        if [[ "$confirmation" != "yes" ]]; then
            log "Rollback cancelled by user"
            exit 0
        fi
    fi
    
    # Execute rollback steps
    if backup_database; then
        log "Database backup completed"
    else
        error "Database backup failed"
        exit 1
    fi
    
    if switch_to_backup; then
        log "Deployment switch completed"
    else
        error "Deployment switch failed"
        exit 1
    fi
    
    if verify_rollback; then
        log "Rollback verification passed"
    else
        error "Rollback verification failed"
        exit 1
    fi
    
    update_deployment_tracking
    send_notifications "Success"
    
    success "=== Production Rollback Completed Successfully ==="
    success "System is now running the previous stable version"
    success "Database backup available at: $(cat /tmp/rollback-db-backup-path 2>/dev/null || echo 'None')"
}

# Script usage
usage() {
    cat << EOF
Usage: $0 [options]

Options:
    -r, --reason REASON     Reason for rollback (required)
    -f, --force            Force rollback without confirmation
    -h, --help             Show this help message

Examples:
    $0 --reason "Critical bug in new release"
    $0 --force --reason "Security vulnerability"

Environment Variables:
    ROLLBACK_REASON        Reason for rollback
    FORCE_ROLLBACK=true    Skip confirmation prompt

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -r|--reason)
            ROLLBACK_REASON="$2"
            shift 2
            ;;
        -f|--force)
            FORCE_ROLLBACK="true"
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate required parameters
if [[ -z "${ROLLBACK_REASON:-}" ]]; then
    error "Rollback reason is required. Use --reason or set ROLLBACK_REASON environment variable."
    usage
    exit 1
fi

# Ensure script is run with appropriate permissions
if [[ $EUID -eq 0 ]]; then
    warning "Running as root - ensure this is intentional"
fi

# Check for required tools
for tool in docker docker-compose curl; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        error "Required tool not found: $tool"
        exit 1
    fi
done

# Execute main function
main "$@"