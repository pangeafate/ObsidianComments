#!/bin/bash

# Deployment script for Obsidian Comments backend
# Run this script on your DigitalOcean VM

set -e

echo "🚀 Starting deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Don't run this script as root! Use a regular user with sudo access."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    print_error ".env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

# Pull latest changes if git repository
if [ -d .git ]; then
    print_status "Pulling latest changes from git..."
    git pull origin main || {
        print_warning "Failed to pull from git. Continuing with local files..."
    }
fi

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose down || true

# Build and start containers
print_status "Building and starting containers..."
docker-compose up -d --build

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 10

# Check if services are running
print_status "Checking service status..."
docker-compose ps

# Test the health endpoint
print_status "Testing health endpoint..."
sleep 5
if curl -f http://localhost:3000/api/health &> /dev/null; then
    print_status "✅ Backend health check passed!"
else
    print_warning "⚠️  Backend health check failed. Check logs with: docker-compose logs backend"
fi

# Show logs
print_status "Recent logs:"
docker-compose logs --tail=20

print_status "🎉 Deployment completed!"
print_status "Your backend should be available at: https://$(hostname -f)/api/health"
print_status ""
print_status "Useful commands:"
print_status "  View logs: docker-compose logs -f"
print_status "  Restart: docker-compose restart"
print_status "  Stop: docker-compose down"
print_status "  Update: ./scripts/deploy.sh"