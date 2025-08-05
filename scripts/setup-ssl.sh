#!/bin/bash

set -e

echo "🔒 Setting up SSL certificates for ObsidianComments"

# Configuration
DOMAIN="obsidiancomments.serverado.app"
EMAIL="admin@serverado.app"
WEBROOT="/var/www/certbot"
SSL_DIR="/opt/obsidian-comments/ssl"

# Check if we're running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script needs to be run with sudo privileges"
   exit 1
fi

# Install certbot if not already installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing certbot"
    apt update
    apt install -y certbot
fi

# Create webroot directory
mkdir -p $WEBROOT
mkdir -p $SSL_DIR

# Stop nginx if running to avoid port conflicts
echo "⏹️  Temporarily stopping nginx"
docker-compose -f /opt/obsidian-comments/docker-compose.production.yml stop nginx || true

# Obtain SSL certificate
echo "🔐 Obtaining SSL certificate for $DOMAIN"
certbot certonly \
    --webroot \
    --webroot-path=$WEBROOT \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --domains $DOMAIN

# Copy certificates to our SSL directory
echo "📄 Copying certificates"
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $SSL_DIR/
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $SSL_DIR/

# Set proper permissions
chmod 644 $SSL_DIR/fullchain.pem
chmod 600 $SSL_DIR/privkey.pem

# Create certificate renewal cron job
echo "⏰ Setting up automatic certificate renewal"
cat > /etc/cron.d/certbot-renewal << EOF
# Renew SSL certificates twice daily
0 */12 * * * root certbot renew --quiet && cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $SSL_DIR/ && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $SSL_DIR/ && docker-compose -f /opt/obsidian-comments/docker-compose.production.yml restart nginx
EOF

echo "✅ SSL certificates have been set up successfully!"
echo ""
echo "📁 Certificates are located at:"
echo "   Fullchain: $SSL_DIR/fullchain.pem"
echo "   Private key: $SSL_DIR/privkey.pem"
echo ""
echo "⏰ Automatic renewal has been configured via cron"
echo ""
echo "🔄 You can now restart your services:"
echo "   cd /opt/obsidian-comments"
echo "   docker-compose -f docker-compose.production.yml up -d"