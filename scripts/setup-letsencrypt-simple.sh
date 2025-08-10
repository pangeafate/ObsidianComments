#!/bin/bash

# Script to set up Let's Encrypt SSL certificates for production (single domain)
# This should be run on the production server

set -e

DOMAIN="obsidiancomments.serverado.app"
EMAIL="admin@serverado.app"  # Change this to your email

echo "Setting up Let's Encrypt SSL certificates for $DOMAIN..."

# Stop nginx temporarily to free up port 80 for certbot
echo "Stopping nginx container..."
docker stop obsidian-comments-nginx-1 || true

# Run certbot in standalone mode (single domain only)
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
      ls -la /ssl/
      ls -la /ssl/live/ || echo 'No live directory'
      exit 1
    fi
  "

# Restart nginx
echo "Starting nginx with new certificates..."
docker start obsidian-comments-nginx-1

# Wait for nginx to start
sleep 5

echo "Let's Encrypt SSL certificates have been installed!"
echo "Checking certificate..."
docker logs obsidian-comments-nginx-1 | tail -10