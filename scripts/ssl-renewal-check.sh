#!/bin/bash

# SSL Certificate Renewal Check Script
# This script checks and renews Let's Encrypt certificates automatically
# Should be run via cron job every week

set -e

DOMAIN="obsidiancomments.serverado.app"
LOG_FILE="/var/log/ssl-renewal.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting SSL certificate renewal check..."

# Check certificate expiration
EXPIRY_DATE=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))

log "Certificate expires: $EXPIRY_DATE ($DAYS_UNTIL_EXPIRY days from now)"

# Renew if certificate expires within 30 days
if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
    log "Certificate expires in $DAYS_UNTIL_EXPIRY days. Renewing..."
    
    # Try to renew using webroot method
    docker run --rm \
        -v obsidiancomments_ssl_certs:/etc/letsencrypt \
        -v obsidiancomments_certbot_webroot:/var/www/certbot \
        certbot/certbot:latest \
        renew \
        --webroot \
        --webroot-path /var/www/certbot \
        --non-interactive
    
    # Copy renewed certificates
    docker run --rm \
        -v obsidiancomments_ssl_certs:/ssl \
        alpine:latest sh -c "
            if [ -d /ssl/live/$DOMAIN ]; then
                cp /ssl/live/$DOMAIN/fullchain.pem /ssl/fullchain.pem &&
                cp /ssl/live/$DOMAIN/privkey.pem /ssl/privkey.pem &&
                chmod 644 /ssl/fullchain.pem &&
                chmod 600 /ssl/privkey.pem &&
                echo 'Certificates updated successfully!'
            else
                echo 'ERROR: Renewed certificates not found'
                exit 1
            fi
        "
    
    # Reload nginx to use new certificates
    docker exec obsidiancomments-nginx-1 nginx -s reload
    
    log "Certificate renewal completed successfully!"
    
    # Test the new certificate
    NEW_EXPIRY_DATE=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
    log "New certificate expires: $NEW_EXPIRY_DATE"
    
else
    log "Certificate is valid for $DAYS_UNTIL_EXPIRY more days. No renewal needed."
fi

log "SSL renewal check completed."