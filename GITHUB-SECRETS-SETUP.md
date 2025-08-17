# GitHub Secrets Setup for ObsidianComments

## 🔑 GitHub Repository Secrets

Go to your repository: https://github.com/pangeafate/ObsidianComments

Navigate to: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets one by one:

### Required Secrets

**DEPLOY_HOST**
```
138.197.187.49
```

**DEPLOY_USER**
```
root
```

**DEPLOY_SSH_KEY**
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBDn5pT62+giWv2MGfnhPJc6n9a4jM+G5PFQ5u5Nzo/0QAAALBseAQBbHgE
AQAAAAtzc2gtZWQyNTUxOQAAACBDn5pT62+giWv2MGfnhPJc6n9a4jM+G5PFQ5u5Nzo/0Q
AAAECnBNI5nE7/pirHdSGDYT+io+n5YI8S+JEzHClNiJiWUUOfmlPrb6CJa/YwZ+eE8lzq
f1riMz4bk8VDm7k3Oj/RAAAAJmdpdGh1Yi1hY3Rpb25zLWRlcGxveUBvYnNpZGlhbmNvbW
1lbnRzAQIDBAUGBw==
-----END OPENSSH PRIVATE KEY-----
```

**POSTGRES_PASSWORD**
```
gtwgPdw61hMYLfed3QTQyTZp6O8ZnqdtDsO+BnvyILM=
```

**JWT_SECRET**
```
QD3YlwyXC5vCAeerSEwRZfeoicDREbUYPRpladOQNBh+pbGPL5osLju8bMPmFffxvkABM7mH1T8HDMHZwjZ2fQ==
```

## 🖥️ Server Setup Commands

SSH into your server (138.197.187.49) and run these commands:

### 1. Add SSH Public Key
```bash
# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add the public key to authorized_keys
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEOfmlPrb6CJa/YwZ+eE8lzqf1riMz4bk8VDm7k3Oj/R github-actions-deploy@obsidiancomments" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 2. Install Docker
```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose v2 (if not included)
apt install -y docker-compose-plugin

# Enable Docker service
systemctl enable docker
systemctl start docker
```

### 3. Setup Firewall
```bash
# Allow SSH, HTTP, and HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

### 4. Update DNS (IMPORTANT!)

⚠️ **Critical**: Update your DNS settings to point the domain to the correct server:

- **Domain**: `obsidiancomments.serverado.app`
- **Current IP**: `198.18.0.15` (incorrect)
- **Correct IP**: `138.197.187.49`

Update your DNS A record to point `obsidiancomments.serverado.app` to `138.197.187.49`

Wait for DNS propagation (can take up to 24 hours, usually 5-15 minutes).

## 🚀 Test Deployment

After setting up the secrets and server:

### 1. Manual Trigger
Go to: **Actions** → **CI/CD** → **Run workflow** → **Run workflow on main**

### 2. Or Push to Main
```bash
git add .
git commit -m "Add production deployment setup"
git push origin main
```

## 🔍 Verify Setup

Check these after deployment:

1. **DNS Resolution**:
   ```bash
   nslookup obsidiancomments.serverado.app
   # Should return: 138.197.187.49
   ```

2. **SSL Certificate**:
   ```bash
   curl -I https://obsidiancomments.serverado.app/health
   # Should return 200 OK with SSL
   ```

3. **Services Running**:
   ```bash
   # On server
   cd ~/obsidian-comments
   docker compose -f docker-compose.production.yml ps
   ```

## 🐛 Troubleshooting

### Common Issues

1. **SSH Connection Failed**
   - Verify the public key is added to `~/.ssh/authorized_keys`
   - Check firewall allows port 22

2. **DNS Not Updated**
   - Wait for DNS propagation
   - Use `nslookup` to verify

3. **SSL Certificate Failed**
   - Ensure DNS points to correct IP first
   - Re-run `./init-letsencrypt.sh` on server

4. **Docker Issues**
   - Check Docker service: `systemctl status docker`
   - Verify Docker Compose: `docker compose version`

### Debug Commands

```bash
# Check workflow logs in GitHub Actions
# SSH to server and check:
cd ~/obsidian-comments
docker compose -f docker-compose.production.yml logs -f

# Manual SSL setup if needed:
./init-letsencrypt.sh
```

## 📋 Checklist

- [ ] All 5 GitHub secrets added
- [ ] SSH public key added to server
- [ ] Docker installed on server
- [ ] Firewall configured (ports 22, 80, 443)
- [ ] DNS updated to point to 138.197.187.49
- [ ] Workflow triggered or pushed to main
- [ ] Services verified running
- [ ] SSL certificate working

Once all steps are complete, your application will be available at:
**https://obsidiancomments.serverado.app**