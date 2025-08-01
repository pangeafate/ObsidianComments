#!/bin/bash

# Quick deployment script for lakestrom.com
# This will prepare and deploy your Obsidian Comments backend

set -e

echo "🚀 Deploying Obsidian Comments to obsidiancomments.lakestrom.com"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if we're in the backend directory
if [ ! -f "package.json" ] || [ ! -f "docker-compose.yml" ]; then
    print_error "Please run this script from the backend directory"
    exit 1
fi

# Prompt for server details
read -p "Enter your DigitalOcean VM IP address: " SERVER_IP
read -p "Enter your SSH username (default: deploy): " SSH_USER
SSH_USER=${SSH_USER:-deploy}

print_status "Preparing deployment package..."

# Create deployment directory
DEPLOY_DIR="obsidian-backend-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEPLOY_DIR"

# Copy necessary files
cp -r src/ "$DEPLOY_DIR/"
cp package*.json "$DEPLOY_DIR/"
cp tsconfig.json "$DEPLOY_DIR/"
cp Dockerfile "$DEPLOY_DIR/"
cp docker-compose.yml "$DEPLOY_DIR/"
cp nginx.conf "$DEPLOY_DIR/"
cp .env.example "$DEPLOY_DIR/"
cp -r migrations/ "$DEPLOY_DIR/"
cp -r scripts/ "$DEPLOY_DIR/"

# Create .env file with lakestrom.com settings
cat > "$DEPLOY_DIR/.env" << EOF
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database Configuration
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
DATABASE_URL=postgresql://obsidian_user:\${DB_PASSWORD}@postgres:5432/obsidian_comments
DATABASE_SSL=false

# Authentication (PLEASE UPDATE THESE!)
JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
JWT_EXPIRES_IN=30d
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://obsidiancomments.lakestrom.com/api/auth/google/callback

# CORS Configuration
FRONTEND_URL=https://obsidiancomments.lakestrom.com
ALLOWED_ORIGINS=https://obsidiancomments.lakestrom.com,https://lakestrom.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FORMAT=combined

# Share Settings
MAX_NOTE_SIZE_MB=10
MAX_SHARES_PER_USER=100
SHARE_TOKEN_LENGTH=12

# Session Configuration
SESSION_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
SESSION_MAX_AGE_DAYS=30
EOF

print_status "Generated secure secrets for production"

# Create a setup script for the server
cat > "$DEPLOY_DIR/server-setup.sh" << 'EOL'
#!/bin/bash

set -e

echo "🔧 Setting up Obsidian Comments on obsidiancomments.lakestrom.com"

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Set up firewall
sudo ufw allow 22     # SSH
sudo ufw allow 80     # HTTP
sudo ufw allow 443    # HTTPS
sudo ufw --force enable

# Install Certbot for SSL
sudo apt install snapd -y
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot

echo "✅ Server setup complete!"
echo ""
echo "Next steps:"
echo "1. Get SSL certificate: sudo certbot certonly --standalone -d obsidiancomments.lakestrom.com"
echo "2. Start the application: docker-compose up -d --build"
echo "3. Check status: docker-compose ps"
EOL

chmod +x "$DEPLOY_DIR/server-setup.sh"

# Create archive
print_status "Creating deployment archive..."
tar -czf "${DEPLOY_DIR}.tar.gz" "$DEPLOY_DIR"

print_status "Uploading to server..."
scp "${DEPLOY_DIR}.tar.gz" "${SSH_USER}@${SERVER_IP}:~/"

print_status "Connecting to server and extracting..."
ssh "${SSH_USER}@${SERVER_IP}" << EOF
    tar -xzf ${DEPLOY_DIR}.tar.gz
    cd ${DEPLOY_DIR}
    chmod +x server-setup.sh
    chmod +x scripts/deploy.sh
    echo "📁 Files extracted to: \$(pwd)"
EOF

# Cleanup local files
rm -rf "$DEPLOY_DIR" "${DEPLOY_DIR}.tar.gz"

print_status "🎉 Deployment package uploaded successfully!"
echo ""
echo "Next steps on your server:"
echo "1. SSH to your server: ssh ${SSH_USER}@${SERVER_IP}"
echo "2. Go to the deployment directory: cd ${DEPLOY_DIR}"
echo "3. Run server setup: ./server-setup.sh"
echo "4. Get SSL certificate: sudo certbot certonly --standalone -d obsidiancomments.lakestrom.com"
echo "5. Update Google OAuth settings in .env file"
echo "6. Start the application: docker-compose up -d --build"
echo ""
print_warning "Don't forget to:"
print_warning "- Set up Google OAuth credentials in .env"
print_warning "- Configure your domain's A record to point to ${SERVER_IP}"
echo ""
echo "Your API will be available at: https://obsidiancomments.lakestrom.com/api/health"
EOL