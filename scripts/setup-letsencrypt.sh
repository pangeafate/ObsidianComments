#!/bin/bash

# Script to set up Let's Encrypt SSL certificates for production
# This should be run on the production server

set -e

DOMAIN="obsidiancomments.serverado.app"
EMAIL="admin@serverado.app"  # Change this to your email

echo "Setting up Let's Encrypt SSL certificates for $DOMAIN..."

# Stop nginx temporarily to free up port 80 for certbot
echo "Stopping nginx container..."
docker stop obsidian-comments-nginx-1 || true

# Run certbot in standalone mode
echo "Obtaining SSL certificate from Let's Encrypt..."
docker run --rm \
  -p 80:80 \
  -p 443:443 \
  -v obsidian-comments_ssl_certs:/etc/letsencrypt \
  -v obsidian-comments_certbot_webroot:/var/www/certbot \
  certbot/certbot:latest \
  certonly \
  --standalone \
  --agree-tos \
  --no-eff-email \
  --email $EMAIL \
  -d $DOMAIN \
  -d www.$DOMAIN \
  --non-interactive

# Copy certificates to the expected locations
echo "Setting up certificates in the correct location..."
docker run --rm \
  -v obsidian-comments_ssl_certs:/ssl \
  alpine:latest sh -c "
    cd /ssl && 
    if [ -d /ssl/live/$DOMAIN ]; then
      cp /ssl/live/$DOMAIN/fullchain.pem /ssl/fullchain.pem &&
      cp /ssl/live/$DOMAIN/privkey.pem /ssl/privkey.pem &&
      chmod 644 /ssl/fullchain.pem &&
      chmod 600 /ssl/privkey.pem &&
      echo 'Certificates copied successfully!'
    else
      echo 'ERROR: Certificates not found in /ssl/live/$DOMAIN'
      exit 1
    fi
  "

# Restart nginx
echo "Starting nginx with new certificates..."
docker start obsidian-comments-nginx-1

echo "Let's Encrypt SSL certificates have been installed!"
echo "The site should now have a valid SSL certificate."

# Set up auto-renewal
echo "Setting up auto-renewal..."
cat > /tmp/renew-ssl.sh << 'EOF'
#!/bin/bash
docker run --rm \
  -v obsidian-comments_ssl_certs:/etc/letsencrypt \
  -v obsidian-comments_certbot_webroot:/var/www/certbot \
  certbot/certbot:latest \
  renew \
  --webroot \
  --webroot-path /var/www/certbot

# Copy renewed certs
docker run --rm \
  -v obsidian-comments_ssl_certs:/ssl \
  alpine:latest sh -c "
    if [ -d /ssl/live/obsidiancomments.serverado.app ]; then
      cp /ssl/live/obsidiancomments.serverado.app/fullchain.pem /ssl/fullchain.pem &&
      cp /ssl/live/obsidiancomments.serverado.app/privkey.pem /ssl/privkey.pem &&
      chmod 644 /ssl/fullchain.pem &&
      chmod 600 /ssl/privkey.pem
    fi
  "

# Reload nginx
docker exec obsidian-comments-nginx-1 nginx -s reload
EOF

echo "To set up automatic renewal, add this to crontab:"
echo "0 0 * * 0 bash /home/dev/obsidian-comments/scripts/renew-ssl.sh"