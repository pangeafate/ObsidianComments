#!/bin/bash
# test-local-production.sh

set -e  # Exit on any error

echo "🚀 Starting local production-like environment..."

# Build frontend with local development settings
echo "📦 Building frontend for local environment..."
export VITE_API_URL=http://localhost:3001
export VITE_WS_URL=ws://localhost:3001/ws

cd packages/frontend
npm run build
cd ../..

echo "🐳 Starting Docker services..."
# Stop any existing services first
docker-compose -f docker-compose.local.yml down

# Start services
docker-compose -f docker-compose.local.yml up -d

echo "⏳ Waiting for services to start..."
sleep 15

# Check service health
echo "🔍 Checking service health..."

# Wait for postgres
echo "Waiting for PostgreSQL..."
timeout 60 bash -c 'until docker exec $(docker-compose -f docker-compose.local.yml ps -q postgres-local) pg_isready -U obsidian -d obsidian_local; do sleep 2; done'

# Wait for redis
echo "Waiting for Redis..."
timeout 30 bash -c 'until docker exec $(docker-compose -f docker-compose.local.yml ps -q redis-local) redis-cli ping; do sleep 2; done'

# Check backend health
echo "Checking backend health..."
timeout 60 bash -c 'until curl -f http://localhost:8091/health; do sleep 2; done'

# Check frontend health
echo "Checking frontend health..."
timeout 60 bash -c 'until curl -f http://localhost:3001/health; do sleep 2; done'

echo "✅ Local production environment ready at http://localhost:3001"
echo "📊 Services running:"
echo "  - Frontend (nginx): http://localhost:3001"
echo "  - Backend API: http://localhost:8091"
echo "  - Hocuspocus WebSocket: http://localhost:8092"
echo "  - PostgreSQL: localhost:5433"
echo "  - Redis: localhost:6380"

echo ""
echo "🧪 You can now run E2E tests with:"
echo "  export TEST_URL=http://localhost:3001"
echo "  npm run test:e2e"

echo ""
echo "🐳 To view logs:"
echo "  docker-compose -f docker-compose.local.yml logs -f [service-name]"

echo ""
echo "🛑 To stop:"
echo "  docker-compose -f docker-compose.local.yml down"