#!/bin/bash

# Script to set up SSL certificates for production deployment
# This script should be run on the production server before docker-compose up

set -e

echo "Setting up SSL certificates for ObsidianComments..."

# Create a temporary container to generate certificates
docker run --rm -v obsidiancomments_ssl_certs:/ssl alpine:latest sh -c "
  apk add --no-cache openssl &&
  cd /ssl &&
  
  # Generate self-signed certificate (temporary solution until Let's Encrypt is set up)
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout privkey.pem \
    -out fullchain.pem \
    -subj '/C=US/ST=State/L=City/O=ObsidianComments/CN=obsidiancomments.serverado.app' &&
  
  # Set proper permissions
  chmod 644 fullchain.pem &&
  chmod 600 privkey.pem &&
  
  echo 'SSL certificates created successfully!'
"

echo "SSL certificates have been created in the Docker volume 'obsidiancomments_ssl_certs'"
echo "You can now start the production deployment with docker-compose"