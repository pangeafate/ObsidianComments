# ObsidianComments - Unified Deployment Guide

## Overview
This document describes the single, unified deployment approach for ObsidianComments collaborative markdown editor.

## Deployment Architecture

### Containerized Services
- **Backend**: Express.js API with Prisma ORM
- **Frontend**: React + Vite application  
- **Hocuspocus**: Real-time collaboration WebSocket server
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Proxy**: Nginx with SSL termination

### Deployment Strategy
**GitHub Actions CI/CD Pipeline** with the following stages:

1. **🏗️ Build & Push Images** - Build and push Docker images to GitHub Container Registry
2. **🌐 E2E Tests** - Validation of deployment readiness
3. **🚀 Deploy Staging** - Staging environment validation
4. **✅ Production Ready** - Pre-deployment checks
5. **🚀 Deploy Production** - Production deployment with Docker Compose
6. **✅ Validate Deployment** - Post-deployment validation with Playwright tests

## Docker Images
All images are built and stored in GitHub Container Registry:
- `ghcr.io/pangeafate/obsidiancomments-backend:latest`
- `ghcr.io/pangeafate/obsidiancomments-frontend:latest`
- `ghcr.io/pangeafate/obsidiancomments-hocuspocus:latest`

## Configuration Files

### Active Configuration
- `docker-compose.production.yml` - Main production configuration
- `docker-compose.yml` - Development configuration  
- `docker-compose.test.yml` - Testing configuration
- `.env.production` - Production environment variables
- `.github/workflows/02-release.yml` - CI/CD pipeline

### Archived (No longer used)
- `archived/deployment-scripts/` - Legacy deployment scripts
- `archived/docker-compose/` - Legacy compose files

## Required Secrets
GitHub repository secrets:
- `POSTGRES_PASSWORD` - Database password
- `JWT_SECRET` - JWT signing secret
- `GITHUB_TOKEN` - Automatic (for container registry)

## Deployment Process

### Automatic (Recommended)
1. Push changes to `main` branch
2. GitHub Actions automatically builds and deploys
3. Monitor deployment at: https://github.com/pangeafate/ObsidianComments/actions

### Manual Trigger
```bash
# Trigger workflow manually
gh workflow run "02 - Release & Deploy"
```

## Post-Deployment Validation
- Homepage availability test
- API health endpoint check
- Database connectivity test  
- WebSocket collaboration test
- Security headers validation
- SSL certificate validation
- Performance benchmarks

## Production URL
- **Application**: https://obsidiancomments.serverado.app
- **API Health**: https://obsidiancomments.serverado.app/api/health

## Monitoring
- GitHub Actions for deployment status
- Playwright tests for functionality validation
- Docker health checks for service monitoring

## Rollback Process
If deployment fails, the pipeline includes automatic validation and rollback capabilities through Docker image management.

---

**Last Updated**: August 2025
**Deployment Method**: GitHub Actions CI/CD with Docker Compose
**Status**: Production Ready ✅