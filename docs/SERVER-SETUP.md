# Server Setup Guide

## SSH Key Configuration

The deployment key has been generated. You need to add this public key to your server:

```bash
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIuxbnOrDcaG1bftRTQqfrQmawjgCf9HpbbIius8cP5o obsidian-deploy@github-actions
```

## Server Setup Commands

Run these commands on `obsidiancomments.serverado.app`:

```bash
# 1. Create deploy user
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG docker deploy

# 2. Set up SSH directory
sudo mkdir -p /home/deploy/.ssh
sudo touch /home/deploy/.ssh/authorized_keys

# 3. Add the deploy key
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIuxbnOrDcaG1bftRTQqfrQmawjgCf9HpbbIius8cP5o obsidian-deploy@github-actions" | sudo tee -a /home/deploy/.ssh/authorized_keys

# 4. Fix permissions
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys
sudo chown -R deploy:deploy /home/deploy/.ssh

# 5. Test Docker access
sudo usermod -aG docker deploy
```

## Test Connection

After setting up the server, test the connection:

```bash
ssh -i ~/.ssh/obsidian_deploy_key deploy@obsidiancomments.serverado.app "docker --version"
```

## GitHub Secrets Status ✅

All required secrets have been configured:

- ✅ POSTGRES_PASSWORD
- ✅ JWT_SECRET  
- ✅ ADMIN_TOKEN
- ✅ CORS_ORIGIN
- ✅ DEPLOY_KEY (SSH private key)
- ✅ DEPLOY_HOST
- ✅ DEPLOY_USER
- ✅ REGISTRY_USERNAME
- ✅ POSTGRES_PASSWORD_STAGING
- ✅ JWT_SECRET_STAGING

## Next Steps

1. Set up the deploy user on the server
2. Test SSH connection  
3. Enable GitHub Actions workflows
4. Test CI/CD pipeline with a PR

## CI/CD Pipeline Status ✅

The CI/CD pipeline has been successfully implemented with:
- Fast CI lane (<5 minutes)
- Blue-green deployments
- Feature flags system
- Emergency rollback procedures