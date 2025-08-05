#!/bin/bash

# Let's Encrypt SSL setup script for ObsidianComments
set -e

DOMAIN="obsidiancomments.serverado.app"
EMAIL="admin@serverado.app"  # Change this to your email

echo "🔐 Setting up Let's Encrypt SSL certificates for $DOMAIN"

# Install certbot if not already installed
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    apt-get update
    apt-get install -y certbot
fi

# Stop nginx to free up port 80
echo "Stopping nginx container..."
cd /opt/obsidian-comments
docker-compose -f docker-compose.production.yml stop nginx

# Get certificate
echo "Obtaining SSL certificate..."
certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    -d $DOMAIN

# Create SSL directory if it doesn't exist
mkdir -p /opt/obsidian-comments/ssl

# Copy certificates to the deployment directory
echo "Copying certificates..."
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /opt/obsidian-comments/ssl/
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /opt/obsidian-comments/ssl/

# Set proper permissions
chmod 644 /opt/obsidian-comments/ssl/fullchain.pem
chmod 600 /opt/obsidian-comments/ssl/privkey.pem

# Restart nginx
echo "Starting nginx with SSL..."
docker-compose -f docker-compose.production.yml start nginx

# Set up auto-renewal
echo "Setting up auto-renewal..."
cat > /etc/cron.d/certbot-renewal << EOF
# Renew Let's Encrypt certificates twice daily
0 0,12 * * * root certbot renew --quiet --post-hook "cd /opt/obsidian-comments && docker-compose -f docker-compose.production.yml restart nginx"
EOF

echo "✅ SSL setup complete!"
echo ""
echo "🔒 Your site should now be accessible via HTTPS at: https://$DOMAIN"
echo "📅 Certificates will auto-renew via cron job"