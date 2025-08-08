# ObsidianComments Deployment Troubleshooting Guide

This comprehensive guide provides multiple approaches to diagnose and fix Docker deployment issues, specifically targeting the 502 Bad Gateway errors and container startup failures you've been experiencing.

## 🚀 Quick Start - Final Solution

Run the automated comprehensive deployment script:

```bash
chmod +x scripts/deploy-final-solution.sh
./scripts/deploy-final-solution.sh
```

This script provides:
- ✅ Comprehensive environment validation
- ✅ Step-by-step incremental deployment
- ✅ Detailed logging and error reporting
- ✅ Automatic service health checking
- ✅ Smart Title functionality verification

## 📋 Deployment Options Overview

### 1. **Primary Solution: Comprehensive Deployment Script**
**File:** `scripts/deploy-final-solution.sh`
- Complete environment validation
- Incremental service deployment with health checks
- Extensive logging and debugging
- Automatic rollback on failures
- Smart Title verification

### 2. **Environment Validation**
**File:** `scripts/validate-server-environment.sh`
- System requirements check
- Docker installation verification
- Port availability testing
- SSL certificate validation
- Configuration file verification

### 3. **Manual Step-by-Step Testing**
**File:** `scripts/manual-deployment-test.sh`
- Interactive deployment with manual intervention points
- Phase-by-phase service startup
- Detailed health checking at each step
- Debug information collection

### 4. **Debug Mode Deployment**
**Files:** `docker-compose.debug.yml`, `nginx-debug.conf`
- Extensive logging for all services
- Debug monitoring container
- Exposed ports for direct service access
- Comprehensive health checks

### 5. **Minimal Testing Configuration**
**Files:** `docker-compose.minimal.yml`, `nginx-minimal.conf`
- Start with basic nginx + frontend only
- Gradually add services to isolate issues
- Simplified configuration for troubleshooting

### 6. **Alternative Deployment Methods**
**File:** `scripts/alternative-deployment.sh`
- Docker Swarm deployment
- Simple docker run commands
- Podman deployment
- Systemd service integration

## 🔧 Usage Instructions

### Step 1: Environment Validation
```bash
chmod +x scripts/validate-server-environment.sh
./scripts/validate-server-environment.sh
```

Fix any issues reported before proceeding.

### Step 2A: Automated Deployment (Recommended)
```bash
chmod +x scripts/deploy-final-solution.sh
./scripts/deploy-final-solution.sh
```

### Step 2B: Manual Testing (If Automated Fails)
```bash
chmod +x scripts/manual-deployment-test.sh
./scripts/manual-deployment-test.sh
```

### Step 2C: Debug Mode (For Deep Troubleshooting)
```bash
# Create debug logs directory
mkdir -p debug-logs

# Deploy in debug mode
docker compose -f docker-compose.debug.yml up -d

# Monitor logs
docker compose -f docker-compose.debug.yml logs -f
```

### Step 2D: Minimal Testing (To Isolate Issues)
```bash
# Test just nginx + frontend
docker compose -f docker-compose.minimal.yml up -d

# Check if basic setup works
curl http://localhost:8000/health
```

### Step 3: Alternative Approaches (If Docker Compose Fails)
```bash
chmod +x scripts/alternative-deployment.sh
./scripts/alternative-deployment.sh
```

## 🚨 Common Issues and Solutions

### Issue 1: 502 Bad Gateway
**Symptoms:** Nginx returns 502 errors, backend/frontend not accessible through proxy

**Debug Steps:**
1. Check if all containers are running: `docker compose ps`
2. Test direct service access: `curl http://localhost:8081/api/health`
3. Check nginx logs: `docker compose logs nginx`
4. Verify service discovery: `docker compose exec nginx nslookup backend`

**Solutions:**
- Use debug configuration with extensive logging
- Check nginx upstream configuration
- Verify Docker network connectivity
- Ensure services are actually healthy before nginx starts

### Issue 2: Container Startup Failures
**Symptoms:** Services fail to start, containers exit immediately

**Debug Steps:**
1. Check container logs: `docker compose logs [service_name]`
2. Test individual service builds: `docker compose build [service_name]`
3. Verify environment variables: `docker compose config`
4. Check resource usage: `docker stats`

**Solutions:**
- Use manual deployment to test each service individually
- Increase container startup timeouts
- Check for port conflicts
- Verify Dockerfile configurations

### Issue 3: Database Connection Issues
**Symptoms:** Backend fails to connect to PostgreSQL

**Debug Steps:**
1. Test PostgreSQL directly: `docker compose exec postgres pg_isready`
2. Check database logs: `docker compose logs postgres`
3. Verify connection string: Check DATABASE_URL environment variable
4. Test network connectivity: `docker compose exec backend ping postgres`

**Solutions:**
- Ensure PostgreSQL is fully ready before starting dependent services
- Use proper wait conditions in docker-compose
- Verify credentials and database configuration
- Check Docker network setup

### Issue 4: SSL Certificate Issues
**Symptoms:** HTTPS not working, SSL errors in nginx logs

**Debug Steps:**
1. Check certificate files: `ls -la /etc/letsencrypt/live/obsidiancomments.serverado.app/`
2. Verify certificate validity: `openssl x509 -in /path/to/cert.pem -text -noout`
3. Test HTTP-only mode first

**Solutions:**
- Set up Let's Encrypt certificates properly
- Use HTTP-only mode for testing
- Check certificate file permissions
- Verify nginx SSL configuration

## 📊 Monitoring and Debugging

### Real-time Monitoring
```bash
# Watch all service logs
docker compose -f docker-compose.debug.yml logs -f

# Monitor specific service
docker compose logs -f backend

# Check service health
docker compose ps
```

### Debug Information Collection
The debug configuration includes a monitoring container that automatically collects:
- Container status every minute
- Network connectivity tests
- Service health check results
- System resource usage

Access debug logs at: `debug-logs/monitor.log`

### Manual Debug Commands
```bash
# Check network connectivity between containers
docker compose exec nginx curl http://backend:8081/api/health
docker compose exec nginx curl http://hocuspocus:8082/health
docker compose exec nginx curl http://frontend/

# Check DNS resolution
docker compose exec nginx nslookup backend
docker compose exec nginx nslookup frontend

# Check port availability on host
netstat -tulpn | grep -E ':(80|443|8080|8081|8082)'

# Check Docker resources
docker system df
docker stats --no-stream
```

## 🎯 Expected Outcomes

### Successful Deployment Indicators
- ✅ All containers show "healthy" status
- ✅ HTTP health endpoints respond: `curl http://localhost/health`
- ✅ API accessible: `curl http://localhost/api/health`
- ✅ Frontend loads: `curl http://localhost/`
- ✅ WebSocket endpoint available (if testing tools available)
- ✅ Smart Title functionality working (automated test in deploy script)

### Service URLs After Successful Deployment
- **Frontend:** https://obsidiancomments.serverado.app
- **API:** https://obsidiancomments.serverado.app/api
- **WebSocket:** wss://obsidiancomments.serverado.app/ws
- **Health Check:** https://obsidiancomments.serverado.app/health

## 🔄 Rollback and Cleanup

### Stop Current Deployment
```bash
# Stop production deployment
docker compose -f docker-compose.production.yml down

# Stop debug deployment
docker compose -f docker-compose.debug.yml down

# Stop minimal deployment
docker compose -f docker-compose.minimal.yml down
```

### Complete Cleanup
```bash
# Use the alternative deployment script's cleanup function
./scripts/alternative-deployment.sh
# Select option 6 for complete cleanup

# Or manual cleanup
docker compose down --volumes --remove-orphans
docker system prune -af
```

## 📞 Final Troubleshooting Steps

If all approaches fail, the issue might be:

1. **Host System Issues:**
   - Insufficient resources (RAM/disk/CPU)
   - Operating system compatibility
   - Docker installation problems
   - Network configuration issues

2. **Configuration Issues:**
   - Incorrect environment variables
   - Missing SSL certificates
   - Port conflicts with other services
   - Firewall blocking connections

3. **Code Issues:**
   - Application startup errors
   - Database migration problems
   - Missing dependencies
   - Configuration file syntax errors

The comprehensive scripts provided will help identify the exact failure point and provide specific guidance for resolution.

## 🚀 Next Steps After Successful Deployment

1. **Verify all functionality:**
   - Test Obsidian plugin integration
   - Verify collaborative editing works
   - Test Smart Title removal functionality
   - Check database persistence

2. **Monitor and maintain:**
   - Set up log rotation
   - Monitor resource usage
   - Regular health checks
   - Backup database regularly

3. **Performance optimization:**
   - Adjust container resource limits
   - Optimize nginx configuration
   - Database performance tuning
   - Frontend asset optimization