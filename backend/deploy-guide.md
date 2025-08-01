# DigitalOcean VM Deployment Guide

## Prerequisites
- DigitalOcean VM (Ubuntu 22.04 LTS recommended, minimum 2GB RAM)
- Domain name pointing to your VM's IP address
- SSH access to your VM

## Step 1: Initial Server Setup

### 1.1 Connect to your VM
```bash
ssh root@your-server-ip
```

### 1.2 Update the system
```bash
apt update && apt upgrade -y
```

### 1.3 Create a non-root user
```bash
adduser deploy
usermod -aG sudo deploy
ufw allow OpenSSH
ufw enable
```

### 1.4 Set up SSH key authentication (recommended)
```bash
# On your local machine
ssh-copy-id deploy@your-server-ip

# Test the connection
ssh deploy@your-server-ip
```

## Step 2: Install Docker and Docker Compose

### 2.1 Install Docker
```bash
sudo apt install apt-transport-https ca-certificates curl software-properties-common -y
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io -y
```

### 2.2 Install Docker Compose
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2.3 Add user to docker group
```bash
sudo usermod -aG docker deploy
# Log out and back in for changes to take effect
```

## Step 3: Deploy Your Application

### 3.1 Clone or upload your project
```bash
# Option A: Clone from Git
git clone https://github.com/your-username/ObsidianComments.git
cd ObsidianComments/backend

# Option B: Upload files using SCP
# scp -r backend/ deploy@your-server-ip:~/obsidian-backend/
```

### 3.2 Create environment file
```bash
cp .env.example .env
nano .env
```

Update the `.env` file with your actual values:
```env
# Database
DB_PASSWORD=your-secure-db-password

# JWT & Session
JWT_SECRET=your-jwt-secret-key-here
SESSION_SECRET=your-session-secret-key-here

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# URLs
FRONTEND_URL=https://your-domain.com
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

### 3.3 Update domain in nginx.conf
```bash
nano nginx.conf
```
Replace `your-domain.com` with your actual domain name.

## Step 4: Set Up SSL with Let's Encrypt

### 4.1 Install Certbot
```bash
sudo apt install snapd -y
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

### 4.2 Generate SSL certificates
```bash
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com
```

### 4.3 Set up automatic renewal
```bash
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet && docker-compose restart nginx
```

## Step 5: Configure Firewall

```bash
sudo ufw allow 22     # SSH
sudo ufw allow 80     # HTTP
sudo ufw allow 443    # HTTPS
sudo ufw reload
```

## Step 6: Start the Application

### 6.1 Build and start services
```bash
docker-compose up -d --build
```

### 6.2 Check service status
```bash
docker-compose ps
docker-compose logs -f
```

### 6.3 Initialize database (first time only)
```bash
# Create initial database tables
docker-compose exec postgres psql -U obsidian_user -d obsidian_comments -c "
CREATE TABLE IF NOT EXISTS shares (
    id SERIAL PRIMARY KEY,
    share_id VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    owner_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"
```

## Step 7: Verify Deployment

### 7.1 Test endpoints
```bash
# Health check
curl https://your-domain.com/api/health

# Should return: {"status": "ok", "timestamp": "..."}
```

### 7.2 Monitor logs
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f nginx
```

## Step 8: Set Up Google OAuth

### 8.1 Google Cloud Console setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API and Google OAuth2 API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Set authorized redirect URIs:
   - `https://your-domain.com/api/auth/google/callback`

### 8.2 Update environment variables
```bash
nano .env
# Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
docker-compose restart backend
```

## Step 9: Maintenance Commands

### 9.1 Update application
```bash
git pull origin main
docker-compose build --no-cache
docker-compose up -d
```

### 9.2 View logs
```bash
docker-compose logs -f --tail=100
```

### 9.3 Database backup
```bash
docker-compose exec postgres pg_dump -U obsidian_user -d obsidian_comments > backup.sql
```

### 9.4 Database restore
```bash
docker-compose exec -T postgres psql -U obsidian_user -d obsidian_comments < backup.sql
```

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**: Backend service is down
   ```bash
   docker-compose logs backend
   docker-compose restart backend
   ```

2. **SSL Certificate Issues**: Certificate not found or expired
   ```bash
   sudo certbot certificates
   sudo certbot renew
   docker-compose restart nginx
   ```

3. **Database Connection Issues**: PostgreSQL not ready
   ```bash
   docker-compose logs postgres
   docker-compose restart postgres
   ```

4. **Port Already in Use**: Another service using ports 80/443
   ```bash
   sudo netstat -tulpn | grep :80
   sudo netstat -tulpn | grep :443
   ```

### Performance Monitoring

```bash
# Check system resources
htop
df -h
docker stats

# Check service health
curl https://your-domain.com/api/health
```

## Security Considerations

1. **Regular Updates**: Keep system and Docker images updated
2. **Backup Strategy**: Regular database and file backups
3. **Monitoring**: Set up log monitoring and alerts
4. **Rate Limiting**: Already configured in nginx.conf
5. **HTTPS Only**: All traffic redirected to HTTPS
6. **Security Headers**: Configured in nginx.conf

Your Obsidian Comments backend should now be running at `https://your-domain.com`!