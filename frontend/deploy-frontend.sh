#!/bin/bash

# Frontend Deployment Script for obsidiancomments.lakestrom.com
# This script deploys the built React frontend to the production server

set -e

echo "🚀 Deploying Frontend to obsidiancomments.lakestrom.com"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if dist folder exists
if [ ! -d "dist" ]; then
    print_error "dist folder not found. Please run 'npm run build' first."
    exit 1
fi

# Server details
read -p "Enter your server IP address: " SERVER_IP
read -p "Enter your SSH username (default: deploy): " SSH_USER
SSH_USER=${SSH_USER:-deploy}

print_status "Deploying frontend files to $SSH_USER@$SERVER_IP"

# Create a temporary deployment archive
DEPLOY_DIR="frontend-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEPLOY_DIR"

print_status "Preparing deployment package..."

# Copy built files
cp -r dist/* "$DEPLOY_DIR/"

# Create deployment script for the server
cat > "$DEPLOY_DIR/deploy-on-server.sh" << 'EOF'
#!/bin/bash

echo "📦 Deploying frontend files on server..."

# Backup current frontend if it exists
if [ -d "/usr/share/nginx/html.backup" ]; then
    sudo rm -rf /usr/share/nginx/html.backup
fi

if [ -d "/usr/share/nginx/html" ] && [ "$(ls -A /usr/share/nginx/html)" ]; then
    sudo cp -r /usr/share/nginx/html /usr/share/nginx/html.backup
    echo "✅ Backed up existing frontend"
fi

# Ensure nginx html directory exists
sudo mkdir -p /usr/share/nginx/html

# Deploy new frontend files
sudo cp -r ./* /usr/share/nginx/html/

# Set proper permissions
sudo chown -R nginx:nginx /usr/share/nginx/html
sudo chmod -R 755 /usr/share/nginx/html

# Restart nginx if it's running in Docker
if docker ps | grep -q nginx; then
    docker-compose restart nginx
    echo "✅ Restarted nginx container"
elif systemctl is-active --quiet nginx; then
    sudo systemctl reload nginx
    echo "✅ Reloaded nginx service"
fi

echo "🎉 Frontend deployment complete!"
echo "Visit https://obsidiancomments.lakestrom.com to see the updated frontend"
EOF

chmod +x "$DEPLOY_DIR/deploy-on-server.sh"

# Create archive
print_status "Creating deployment archive..."
tar -czf "${DEPLOY_DIR}.tar.gz" "$DEPLOY_DIR"

# Upload to server
print_status "Uploading to server..."
scp "${DEPLOY_DIR}.tar.gz" "${SSH_USER}@${SERVER_IP}:~/"

# Deploy on server
print_status "Deploying on server..."
ssh "${SSH_USER}@${SERVER_IP}" << EOF
    cd ~
    tar -xzf ${DEPLOY_DIR}.tar.gz
    cd ${DEPLOY_DIR}
    chmod +x deploy-on-server.sh
    ./deploy-on-server.sh
    cd ~
    rm -rf ${DEPLOY_DIR} ${DEPLOY_DIR}.tar.gz
EOF

# Cleanup local files
rm -rf "$DEPLOY_DIR" "${DEPLOY_DIR}.tar.gz"

print_status "🎉 Frontend deployment completed successfully!"
echo ""
echo "The updated frontend with WebSocket fixes is now live at:"
echo "https://obsidiancomments.lakestrom.com"
echo ""
print_warning "Changes made:"
print_warning "- Fixed WebSocket transport order (polling -> websocket)"
print_warning "- Added enhanced connection error logging"
print_warning "- Improved connection timeout and retry configuration"