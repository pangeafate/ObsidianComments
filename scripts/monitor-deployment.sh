#!/bin/bash
set -euo pipefail

# Deployment Monitoring Script
# Continuous monitoring with alerting and automatic remediation

# Configuration
PROJECT_NAME="obsidian-comments"
COMPOSE_FILE="docker-compose.production.yml"
MONITOR_INTERVAL=30  # seconds
LOG_FILE="/var/log/obsidian-monitor.log"
ALERT_THRESHOLD=3    # number of consecutive failures before alert
RESTART_THRESHOLD=5  # number of consecutive failures before restart

# Health check configuration
HEALTH_ENDPOINTS=(
    "http://localhost/health"
    "http://localhost/api/health"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters for consecutive failures
declare -A failure_counts
declare -A last_status

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

# Function to check system resources
check_system_resources() {
    local cpu_usage
    local memory_usage
    local disk_usage
    
    # CPU usage
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}' || echo "0")
    
    # Memory usage
    memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}' || echo "0")
    
    # Disk usage
    disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//' || echo "0")
    
    log "System Resources - CPU: ${cpu_usage}%, Memory: ${memory_usage}%, Disk: ${disk_usage}%"
    
    # Alert on high resource usage
    if (( $(echo "$cpu_usage > 90" | bc -l) )); then
        warning "High CPU usage detected: ${cpu_usage}%"
        send_alert "High CPU Usage" "CPU usage is at ${cpu_usage}%"
    fi
    
    if (( $(echo "$memory_usage > 90" | bc -l) )); then
        warning "High memory usage detected: ${memory_usage}%"
        send_alert "High Memory Usage" "Memory usage is at ${memory_usage}%"
    fi
    
    if [[ $disk_usage -gt 90 ]]; then
        warning "High disk usage detected: ${disk_usage}%"
        send_alert "High Disk Usage" "Disk usage is at ${disk_usage}%"
    fi
}

# Function to check container health
check_container_health() {
    local service=$1
    local container_id
    
    container_id=$(docker-compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" ps -q "$service" 2>/dev/null || echo "")
    
    if [[ -z "$container_id" ]]; then
        error "Container for service $service not found"
        return 1
    fi
    
    # Check if container is running
    local container_status
    container_status=$(docker inspect --format='{{.State.Status}}' "$container_id" 2>/dev/null || echo "unknown")
    
    if [[ "$container_status" != "running" ]]; then
        error "Container $service is not running (status: $container_status)"
        return 1
    fi
    
    # Check health status if available
    local health_status
    health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_id" 2>/dev/null || echo "none")
    
    if [[ "$health_status" == "unhealthy" ]]; then
        error "Container $service is unhealthy"
        return 1
    elif [[ "$health_status" == "healthy" ]]; then
        log "Container $service is healthy"
    else
        log "Container $service has no health check configured"
    fi
    
    # Check container resource usage
    local container_stats
    container_stats=$(docker stats --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}" "$container_id" 2>/dev/null | tail -n1 || echo "0% 0B / 0B")
    log "Container $service stats: $container_stats"
    
    return 0
}

# Function to check HTTP endpoints
check_http_endpoint() {
    local endpoint=$1
    local timeout=10
    
    if curl -f -s --max-time $timeout "$endpoint" >/dev/null 2>&1; then
        log "HTTP check passed: $endpoint"
        return 0
    else
        error "HTTP check failed: $endpoint"
        return 1
    fi
}

# Function to check database connectivity
check_database() {
    local db_container
    db_container=$(docker-compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" ps -q postgres 2>/dev/null || echo "")
    
    if [[ -z "$db_container" ]]; then
        error "Database container not found"
        return 1
    fi
    
    # Check database is accepting connections
    if docker exec "$db_container" pg_isready -U postgres >/dev/null 2>&1; then
        log "Database connectivity check passed"
        return 0
    else
        error "Database connectivity check failed"
        return 1
    fi
}

# Function to check WebSocket connectivity
check_websocket() {
    # Simple WebSocket test using curl (basic test)
    local ws_url="ws://localhost/ws"
    
    # Test WebSocket port accessibility
    if nc -z localhost 80 >/dev/null 2>&1; then
        log "WebSocket port is accessible"
        return 0
    else
        error "WebSocket port is not accessible"
        return 1
    fi
}

# Function to restart service
restart_service() {
    local service=$1
    
    warning "Restarting service: $service"
    
    if docker-compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" restart "$service"; then
        success "Service $service restarted successfully"
        
        # Wait for service to stabilize
        sleep 30
        
        # Reset failure count
        failure_counts[$service]=0
        
        send_alert "Service Restarted" "Service $service was automatically restarted due to health check failures"
        return 0
    else
        error "Failed to restart service $service"
        return 1
    fi
}

# Function to send alerts
send_alert() {
    local subject=$1
    local message=$2
    
    local full_message="🚨 ObsidianComments Alert
    
Subject: $subject
Time: $(date)
Message: $message

Server: $(hostname)
Project: $PROJECT_NAME"
    
    log "ALERT: $subject - $message"
    
    # In production, you would integrate with your alerting system
    # Examples:
    
    # Slack webhook
    # curl -X POST "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK" \
    #     -H 'Content-type: application/json' \
    #     --data "{\"text\":\"$full_message\"}" || true
    
    # Email notification
    # echo "$full_message" | mail -s "$subject" admin@yourdomain.com || true
    
    # PagerDuty integration
    # curl -X POST "https://events.pagerduty.com/v2/enqueue" \
    #     -H "Content-Type: application/json" \
    #     -d "{\"routing_key\":\"YOUR_ROUTING_KEY\",\"event_action\":\"trigger\",\"payload\":{\"summary\":\"$subject\",\"source\":\"obsidian-monitor\",\"severity\":\"warning\"}}" || true
    
    # For now, just log to file and console
    echo "$full_message" >> "/var/log/obsidian-alerts.log"
}

# Function to check overall application health
check_application_health() {
    local overall_status="healthy"
    local failed_checks=()
    
    # Check all containers
    for service in postgres redis backend hocuspocus frontend nginx; do
        if ! check_container_health "$service"; then
            overall_status="unhealthy"
            failed_checks+=("container:$service")
            
            # Increment failure count
            failure_counts[$service]=$((${failure_counts[$service]:-0} + 1))
            
            # Check if we should restart the service
            if [[ ${failure_counts[$service]} -ge $RESTART_THRESHOLD ]]; then
                restart_service "$service"
            elif [[ ${failure_counts[$service]} -ge $ALERT_THRESHOLD ]]; then
                send_alert "Service Health Check Failed" "Service $service has failed ${failure_counts[$service]} consecutive health checks"
            fi
        else
            # Reset failure count on success
            failure_counts[$service]=0
        fi
    done
    
    # Check HTTP endpoints
    for endpoint in "${HEALTH_ENDPOINTS[@]}"; do
        if ! check_http_endpoint "$endpoint"; then
            overall_status="unhealthy"
            failed_checks+=("http:$endpoint")
        fi
    done
    
    # Check database
    if ! check_database; then
        overall_status="unhealthy"
        failed_checks+=("database")
    fi
    
    # Check WebSocket
    if ! check_websocket; then
        overall_status="unhealthy"
        failed_checks+=("websocket")
    fi
    
    # Update status
    if [[ "$overall_status" == "healthy" ]]; then
        if [[ "${last_status[overall]:-}" == "unhealthy" ]]; then
            success "Application health restored"
            send_alert "Health Restored" "Application has recovered from previous health issues"
        fi
        log "Overall application status: HEALTHY"
    else
        error "Overall application status: UNHEALTHY"
        error "Failed checks: ${failed_checks[*]}"
        
        if [[ "${last_status[overall]:-}" != "unhealthy" ]]; then
            send_alert "Application Health Degraded" "Application health checks are failing: ${failed_checks[*]}"
        fi
    fi
    
    last_status[overall]=$overall_status
}

# Function to collect metrics
collect_metrics() {
    local timestamp
    timestamp=$(date +%s)
    
    # Collect container metrics
    local metrics_file="/var/log/obsidian-metrics.log"
    
    {
        echo "timestamp:$timestamp"
        echo "system_resources:$(check_system_resources 2>&1 | grep "System Resources" | cut -d'-' -f2)"
        
        # Container resource usage
        for service in backend hocuspocus frontend; do
            local container_id
            container_id=$(docker-compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" ps -q "$service" 2>/dev/null || echo "")
            
            if [[ -n "$container_id" ]]; then
                local stats
                stats=$(docker stats --no-stream --format "{{.CPUPerc}},{{.MemUsage}}" "$container_id" 2>/dev/null || echo "0%,0B / 0B")
                echo "${service}_stats:$stats"
            fi
        done
        
        echo "---"
    } >> "$metrics_file"
}

# Function to cleanup old logs
cleanup_logs() {
    # Keep last 7 days of logs
    find /var/log -name "obsidian-*.log" -mtime +7 -delete 2>/dev/null || true
}

# Function to check deployment integrity
check_deployment_integrity() {
    log "Checking deployment integrity..."
    
    # Check if all expected containers are running
    local expected_services=("postgres" "redis" "backend" "hocuspocus" "frontend" "nginx")
    local running_services
    running_services=$(docker-compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" ps --services --filter "status=running" 2>/dev/null || echo "")
    
    for service in "${expected_services[@]}"; do
        if echo "$running_services" | grep -q "^$service$"; then
            log "Service $service is running"
        else
            error "Service $service is not running"
            
            # Try to start missing service
            warning "Attempting to start missing service: $service"
            docker-compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up -d "$service" || error "Failed to start $service"
        fi
    done
}

# Main monitoring loop
main() {
    log "=== Starting ObsidianComments Deployment Monitor ==="
    log "Monitor interval: ${MONITOR_INTERVAL}s"
    log "Alert threshold: $ALERT_THRESHOLD failures"
    log "Restart threshold: $RESTART_THRESHOLD failures"
    
    # Initialize failure counts
    for service in postgres redis backend hocuspocus frontend nginx; do
        failure_counts[$service]=0
    done
    
    # Main monitoring loop
    while true; do
        log "--- Health Check Cycle ---"
        
        # Check system resources
        check_system_resources
        
        # Check deployment integrity
        check_deployment_integrity
        
        # Check overall application health
        check_application_health
        
        # Collect metrics
        collect_metrics
        
        # Cleanup old logs (once per hour)
        if [[ $(($(date +%s) % 3600)) -lt $MONITOR_INTERVAL ]]; then
            cleanup_logs
        fi
        
        log "Health check cycle completed. Next check in ${MONITOR_INTERVAL}s"
        sleep $MONITOR_INTERVAL
    done
}

# Signal handlers for graceful shutdown
cleanup() {
    log "Monitoring stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --interval)
            MONITOR_INTERVAL="$2"
            shift 2
            ;;
        --alert-threshold)
            ALERT_THRESHOLD="$2"
            shift 2
            ;;
        --restart-threshold)
            RESTART_THRESHOLD="$2"
            shift 2
            ;;
        --help)
            cat << EOF
Usage: $0 [options]

Options:
    --interval SECONDS         Monitoring interval (default: 30)
    --alert-threshold COUNT    Failures before alert (default: 3)
    --restart-threshold COUNT  Failures before restart (default: 5)
    --help                     Show this help message

EOF
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Ensure required directories exist
mkdir -p /var/log

# Check for required tools
for tool in docker docker-compose curl bc nc; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        error "Required tool not found: $tool"
        exit 1
    fi
done

# Start monitoring
main "$@"