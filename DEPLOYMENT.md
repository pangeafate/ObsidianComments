# ObsidianComments Production Deployment Guide

This guide covers deploying ObsidianComments to production at `https://obsidiancomments.serverado.app` with server IP `138.197.187.49`.

## 🎯 Overview

The production deployment consists of:
- **Frontend**: React SPA served by Nginx
- **Backend API**: Node.js/Express API server
- **Hocuspocus**: WebSocket server for real-time collaboration
- **PostgreSQL**: Database for persistent storage
- **Redis**: Cache and session storage
- **Nginx**: Reverse proxy with SSL termination

## 📋 Prerequisites

### Server Requirements
- Ubuntu 20.04+ or similar Linux distribution
- Docker and Docker Compose installed
- At least 2GB RAM, 20GB disk space
- Domain pointing to server IP (obsidiancomments.serverado.app → 138.197.187.49)

### Local Development Setup
```bash
git clone <repository-url>
cd obsidian-comments
npm install
```

## 🚀 Quick Deployment

### 1. Server Setup
```bash
# On the production server (138.197.187.49)
sudo apt update
sudo apt install -y docker.io docker-compose git curl

# Enable Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Add user to docker group (logout/login required)
sudo usermod -aG docker $USER
```

### 2. Deploy Application
```bash
# Clone and deploy
git clone <repository-url> /opt/obsidian-comments
cd /opt/obsidian-comments

# Create production environment file
sudo cp .env.production .env.production.local
sudo nano .env.production.local  # Edit with real values

# Run deployment script
sudo ./scripts/deploy-to-production.sh
```

### 3. Setup SSL Certificates
```bash
# Run SSL setup
sudo ./scripts/setup-ssl.sh
```

## 📁 File Structure

```
/opt/obsidian-comments/
├── docker-compose.production.yml  # Production services
├── nginx.conf                     # Main reverse proxy config
├── .env.production.local          # Production secrets
├── ssl/                           # SSL certificates
├── scripts/
│   ├── deploy-to-production.sh    # Main deployment script
│   └── setup-ssl.sh              # SSL certificate setup
└── packages/
    ├── backend/
    ├── frontend/
    └── hocuspocus/
```

## 🔧 Configuration

### Environment Variables (.env.production.local)
```env
# Database Configuration
POSTGRES_DB=obsidian_comments
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password_here

# Security
JWT_SECRET=your_jwt_secret_here

# Application
NODE_ENV=production
CORS_ORIGIN=https://obsidiancomments.serverado.app

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

### Docker Services Configuration

The production deployment uses `docker-compose.production.yml` with:

- **PostgreSQL**: Persistent database with health checks
- **Redis**: Cache and session storage
- **Backend**: API server with rate limiting and CORS
- **Hocuspocus**: WebSocket server for real-time collaboration
- **Frontend**: Static React build served by Nginx
- **Nginx**: Reverse proxy with SSL, security headers, and rate limiting

## 🧪 Testing

### Run Production Tests (TDD Approach)

These tests will initially fail until the service is deployed:

```bash
# Install test dependencies
npm install

# Run production API tests
npm run test:production
```

The tests cover:
- ✅ API health endpoints
- ✅ CORS configuration for Obsidian plugin
- ✅ Document creation and retrieval
- ✅ WebSocket connections
- ✅ Frontend application loading
- ✅ Rate limiting
- ✅ Security headers

### Manual Testing Checklist

```bash
# Health checks
curl https://obsidiancomments.serverado.app/health
curl https://obsidiancomments.serverado.app/api/health

# API functionality
curl -X POST https://obsidiancomments.serverado.app/api/notes/share \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":"# Test Content"}'

# WebSocket connection (test in browser console)
new WebSocket('wss://obsidiancomments.serverado.app/ws')
```

## 🔍 Monitoring and Logs

### View Application Logs
```bash
cd /opt/obsidian-comments

# View all service logs
docker-compose -f docker-compose.production.yml logs

# View specific service logs
docker-compose -f docker-compose.production.yml logs backend
docker-compose -f docker-compose.production.yml logs frontend
docker-compose -f docker-compose.production.yml logs hocuspocus
```

### Health Monitoring
- Frontend: `https://obsidiancomments.serverado.app/health`
- API: `https://obsidiancomments.serverado.app/api/health`
- Container status: `docker-compose ps`

## 🔄 CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/deploy-production.yml`) provides:

1. **Testing**: Runs unit and integration tests
2. **Building**: Creates production Docker images
3. **Deployment**: Deploys to production server
4. **Validation**: Runs post-deployment tests

### Required GitHub Secrets
```
PRODUCTION_HOST=138.197.187.49
PRODUCTION_USER=your_ssh_user
PRODUCTION_SSH_KEY=your_private_ssh_key
PRODUCTION_PORT=22
POSTGRES_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret
```

## 🔒 Security Features

- ✅ SSL/HTTPS with Let's Encrypt certificates
- ✅ Security headers (HSTS, CSP, etc.)
- ✅ Rate limiting (API and general requests)
- ✅ CORS configuration for Obsidian plugin
- ✅ Non-root Docker containers
- ✅ Environment variable protection

## 🎯 Obsidian Plugin Integration

The production API is configured to work with the Obsidian plugin:

### Plugin Configuration
```json
{
  "apiUrl": "https://obsidiancomments.serverado.app/api",
  "websocketUrl": "wss://obsidiancomments.serverado.app/ws"
}
```

### API Endpoints for Plugin
- `POST /api/notes/share` - Create shared document
- `GET /api/notes/{shareId}` - Retrieve document
- `PUT /api/notes/{shareId}` - Update document
- `DELETE /api/notes/{shareId}` - Delete document

## 🛠️ Maintenance

### Update Deployment
```bash
cd /opt/obsidian-comments
git pull origin main
sudo ./scripts/deploy-to-production.sh
```

### Backup Database
```bash
docker-compose -f docker-compose.production.yml exec postgres \
  pg_dump -U postgres obsidian_comments > backup_$(date +%Y%m%d).sql
```

### Restore Database
```bash
docker-compose -f docker-compose.production.yml exec -T postgres \
  psql -U postgres obsidian_comments < backup_file.sql
```

### SSL Certificate Renewal
```bash
# Manual renewal (automatic via cron)
sudo certbot renew
sudo ./scripts/setup-ssl.sh
```

## 🚨 Troubleshooting

### Common Issues

1. **502 Bad Gateway**
   - Check if backend containers are running
   - Verify database connection
   - Check application logs

2. **SSL Certificate Issues**
   - Verify domain DNS points to correct IP
   - Check certificate files exist and have correct permissions
   - Re-run SSL setup script

3. **Database Connection Failed**
   - Check PostgreSQL container status
   - Verify environment variables
   - Check database migration status

4. **WebSocket Connection Failed**
   - Verify Hocuspocus container is running
   - Check nginx WebSocket proxy configuration
   - Test WebSocket endpoint directly

### Debug Commands
```bash
# Check container status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs --tail=50

# Test internal connectivity
docker-compose -f docker-compose.production.yml exec backend curl http://postgres:5432
docker-compose -f docker-compose.production.yml exec backend curl http://redis:6379

# Check database
docker-compose -f docker-compose.production.yml exec postgres psql -U postgres -d obsidian_comments
```

## 📞 Support

For deployment issues:
1. Check logs and error messages
2. Verify all configuration files
3. Run production tests to identify specific failures
4. Check GitHub Actions workflow for CI/CD issues

The deployment follows infrastructure as code principles with comprehensive testing and monitoring to ensure reliable production operation.