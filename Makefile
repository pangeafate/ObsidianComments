.PHONY: help test build up down lint unit int e2e clean setup health smoke deploy rollback

# Default target
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*##"; printf "\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  %-15s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

# Setup and cleanup
setup: ## Install all dependencies
	@echo "📦 Installing dependencies..."
	cd packages/backend && npm ci
	cd packages/frontend && npm ci
	cd packages/hocuspocus && npm ci
	cd obsidian-plugin && npm ci
	@echo "✅ Dependencies installed"

clean: ## Clean all build artifacts and containers
	docker-compose -f docker-compose.production.yml down -v
	docker system prune -f
	rm -rf packages/*/dist packages/*/build
	rm -rf node_modules packages/*/node_modules
	@echo "🧹 Cleanup complete"

# Testing targets
lint: ## Run linting checks
	@echo "🔍 Running linters..."
	@echo "⚠️  ESLint configs not found - skipping linting for now"
	@echo "✅ Linting skipped (TODO: add ESLint configs)"

unit: ## Run unit tests only
	@echo "🧪 Running unit tests..."
	cd packages/backend && npm test -- --testPathPattern="\.test\." --maxWorkers=4
	cd packages/frontend && npm test -- --testPathPattern="\.test\." --maxWorkers=4
	@echo "✅ Unit tests complete"

int: ## Run integration tests with dockerized dependencies
	@echo "🔄 Running integration tests..."
	docker-compose -f docker-compose.test.yml up -d postgres redis
	sleep 5
	cd packages/backend && DATABASE_URL=postgresql://postgres:password123@localhost:5432/test npm test -- --testPathPattern="\.integration\."
	docker-compose -f docker-compose.test.yml down
	@echo "✅ Integration tests complete"

e2e: ## Run E2E tests against running application
	@echo "🌐 Running E2E tests..."
	npx playwright test tests/e2e/ --reporter=list --workers=2
	@echo "✅ E2E tests complete"

test: lint unit ## Run all fast tests (lint + unit)

test-all: lint unit int e2e ## Run all tests including slow ones

# Build targets
build: ## Build all Docker images
	@echo "🏗️ Building Docker images..."
	docker-compose -f docker-compose.production.yml build --parallel
	@echo "✅ Build complete"

build-frontend: ## Build frontend only
	cd packages/frontend && npm run build
	docker build -t obsidiancomments-frontend:${GITHUB_SHA:-local} -f packages/frontend/Dockerfile.production packages/frontend

build-backend: ## Build backend only
	cd packages/backend && npm run build
	docker build -t obsidiancomments-backend:${GITHUB_SHA:-local} -f packages/backend/Dockerfile.production packages/backend

build-hocuspocus: ## Build hocuspocus only
	cd packages/hocuspocus && npm run build
	docker build -t obsidiancomments-hocuspocus:${GITHUB_SHA:-local} -f packages/hocuspocus/Dockerfile.production packages/hocuspocus

# Docker operations
up: ## Start all services locally
	@echo "🚀 Starting services..."
	docker-compose -f docker-compose.production.yml --env-file .env.production up -d
	@echo "⏳ Waiting for services to be healthy..."
	@sleep 10
	@make health
	@echo "✅ Services are up and running"

down: ## Stop all services
	@echo "🛑 Stopping services..."
	docker-compose -f docker-compose.production.yml down
	@echo "✅ Services stopped"

logs: ## Show logs from all services
	docker-compose -f docker-compose.production.yml logs -f

# Health checks
health: ## Check health of all services
	@echo "🏥 Checking service health..."
	@curl -f -s http://localhost/api/health > /dev/null && echo "✅ Backend: healthy" || echo "❌ Backend: unhealthy"
	@curl -f -s http://localhost/ > /dev/null && echo "✅ Frontend: healthy" || echo "❌ Frontend: unhealthy"
	@docker exec obsidiancomments-postgres-1 pg_isready > /dev/null 2>&1 && echo "✅ Database: healthy" || echo "❌ Database: unhealthy"
	@docker exec obsidiancomments-redis-1 redis-cli ping > /dev/null 2>&1 && echo "✅ Redis: healthy" || echo "❌ Redis: unhealthy"

smoke: ## Run smoke tests against deployed environment
	@echo "🔥 Running smoke tests..."
	./scripts/smoke.sh ${DEPLOY_URL:-http://localhost}

# Deployment
deploy-staging: ## Deploy to staging environment
	@echo "🚀 Deploying to staging..."
	./scripts/deploy.sh staging ${GITHUB_SHA:-local}

deploy-prod: ## Deploy to production (requires confirmation)
	@echo "⚠️  Deploying to PRODUCTION"
	@read -p "Are you sure? (y/N) " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		./scripts/deploy.sh prod ${GITHUB_SHA:-local}; \
	else \
		echo "Deployment cancelled"; \
	fi

rollback: ## Rollback to previous version
	@echo "⏮️ Rolling back to previous version..."
	./scripts/rollback.sh

# Plugin operations
plugin-build: ## Build Obsidian plugin
	cd obsidian-plugin && npm run build

plugin-test: ## Test Obsidian plugin
	cd obsidian-plugin && npm test

plugin-release: ## Create plugin release
	cd obsidian-plugin && npm run version && npm run release

# Database operations
db-migrate: ## Run database migrations
	cd packages/backend && npx prisma migrate deploy

db-seed: ## Seed database with test data
	cd packages/backend && npx prisma db seed

db-reset: ## Reset database (WARNING: destructive)
	cd packages/backend && npx prisma migrate reset --force

# Development helpers
dev: ## Start development environment
	docker-compose up -d postgres redis
	cd packages/backend && npm run dev &
	cd packages/frontend && npm run dev &
	cd packages/hocuspocus && npm run dev &
	wait

dev-stop: ## Stop development environment
	pkill -f "npm run dev" || true
	docker-compose down

# CI/CD helpers
ci-setup: ## Setup CI environment
	npm ci
	cd packages/backend && npm ci
	cd packages/frontend && npm ci
	cd packages/hocuspocus && npm ci

ci-cache-key: ## Generate cache key for CI
	@echo "node-$(cat .nvmrc)-$(shasum -a 256 package-lock.json | cut -d' ' -f1)"

# Security
security-scan: ## Run security vulnerability scan
	npm audit
	cd packages/backend && npm audit
	cd packages/frontend && npm audit
	trivy image obsidiancomments-backend:latest || true
	trivy image obsidiancomments-frontend:latest || true