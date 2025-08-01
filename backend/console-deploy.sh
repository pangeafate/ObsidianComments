#!/bin/bash

# COPY AND PASTE THIS ENTIRE SCRIPT INTO YOUR DIGITALOCEAN CONSOLE

echo "🚀 Deploying Obsidian Comments to obsidiancomments.lakestrom.com"

# Update system
apt update && apt upgrade -y

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    usermod -aG docker $USER
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Set up firewall
ufw allow 22     # SSH
ufw allow 80     # HTTP
ufw allow 443    # HTTPS
ufw --force enable

# Install Certbot for SSL
apt install snapd -y
snap install core; snap refresh core
snap install --classic certbot
ln -sf /snap/bin/certbot /usr/bin/certbot

# Create project directory
mkdir -p /root/obsidian-comments
cd /root/obsidian-comments

echo "✅ Server setup complete!"
echo ""
echo "Now we need to create the application files..."
echo "Continue with the next part of the script..."