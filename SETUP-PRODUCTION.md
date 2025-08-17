# Quick Production Setup Guide

## Required GitHub Secrets

Add these in GitHub repository settings → Secrets and variables → Actions:

```
DEPLOY_HOST=138.197.187.49
DEPLOY_USER=your_ssh_username
DEPLOY_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
your_private_key_content_here
-----END OPENSSH PRIVATE KEY-----
POSTGRES_PASSWORD=secure_database_password_2025
JWT_SECRET=secure_jwt_secret_2025_production
```

## Server Setup (One-time)

SSH into your server and run:

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
# Logout and login again

# Clone repository
git clone https://github.com/pangeafate/ObsidianComments.git ~/obsidian-comments
cd ~/obsidian-comments

# Set up SSL certificates (Let's Encrypt)
chmod +x ./init-letsencrypt.sh
./init-letsencrypt.sh

# Deploy application
chmod +x ./deploy-production.sh
./deploy-production.sh
```

## Automated Deployment

Push to `main` branch or manually trigger:
- Go to GitHub → Actions → CI/CD → Run workflow

## Health Checks

After deployment, verify:
- https://obsidiancomments.serverado.app/health
- https://obsidiancomments.serverado.app/api/health

## Troubleshooting

View logs:
```bash
cd ~/obsidian-comments
docker compose -f docker-compose.production.yml logs -f
```

SSL issues:
```bash
./init-letsencrypt.sh  # Re-run SSL setup
```

That's it! The CI/CD pipeline handles everything else automatically.