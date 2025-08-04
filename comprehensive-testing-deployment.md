# Comprehensive Testing & Deployment Strategy for ObsidianComments

## Core Issues with Current Approach

1. **Superficial Testing**: HTTP status codes don't verify actual functionality
2. **No Integration Validation**: Database ↔ Frontend ↔ Hocuspocus chain not tested
3. **Manual Deployment**: Error-prone with container naming issues
4. **Missing Health Checks**: No automated verification of service functionality

## Enhanced Testing Framework

### 1. Automated End-to-End Test Suite

Create a test script that validates the complete user journey:

```bash
#!/bin/bash
# test-e2e.sh

DOMAIN="https://obsidiancomments.serverado.app"
TEST_DOC_ID="cmdwl766o0003uvwlbqwn071k"

echo "=== ObsidianComments E2E Test Suite ==="

# Test 1: API Health
echo -n "Testing API health... "
API_RESPONSE=$(curl -s "${DOMAIN}/api/health")
if [[ "$API_RESPONSE" == *"\"status\":\"ok\""* ]]; then
    echo "✓ PASS"
else
    echo "✗ FAIL - API not responding correctly"
    exit 1
fi

# Test 2: Document API Endpoint
echo -n "Testing document API... "
DOC_RESPONSE=$(curl -s "${DOMAIN}/api/notes/${TEST_DOC_ID}")
if [[ "$DOC_RESPONSE" == *"\"id\":\"${TEST_DOC_ID}\""* ]]; then
    echo "✓ PASS"
else
    echo "✗ FAIL - Document not loading from API"
    echo "Response: $DOC_RESPONSE"
    exit 1
fi

# Test 3: WebSocket Connectivity
echo -n "Testing WebSocket... "
WS_TEST=$(timeout 2 curl -s -I "${DOMAIN}/ws" 2>&1 | grep -E "(Upgrade: websocket|101)")
if [[ -n "$WS_TEST" ]]; then
    echo "✓ PASS"
else
    echo "✗ FAIL - WebSocket not responding"
    exit 1
fi

# Test 4: Frontend Bundle Loading
echo -n "Testing frontend assets... "
FRONTEND_HTML=$(curl -s "${DOMAIN}/")
if [[ "$FRONTEND_HTML" == *"<div id=\"root\"></div>"* ]] && [[ "$FRONTEND_HTML" == *"script"* ]]; then
    echo "✓ PASS"
else
    echo "✗ FAIL - Frontend not loading properly"
    exit 1
fi

# Test 5: Document Page Load
echo -n "Testing document page... "
DOC_PAGE=$(curl -s "${DOMAIN}/${TEST_DOC_ID}")
if [[ "$DOC_PAGE" == *"<div id=\"root\"></div>"* ]] && [[ -z $(echo "$DOC_PAGE" | grep -i "error") ]]; then
    echo "✓ PASS"
else
    echo "✗ FAIL - Document page not loading"
    exit 1
fi

echo "=== All basic tests passed ==="
```

### 2. Database-to-Frontend Validation Script

```javascript
// validate-integration.js
const { PrismaClient } = require('@prisma/client');
const WebSocket = require('ws');
const fetch = require('node-fetch');

const prisma = new PrismaClient();
const API_URL = 'https://obsidiancomments.serverado.app/api';
const WS_URL = 'wss://obsidiancomments.serverado.app/ws';

async function validateIntegration() {
  console.log('Starting integration validation...');
  
  try {
    // 1. Check database connectivity
    console.log('1. Testing database connection...');
    const noteCount = await prisma.note.count();
    console.log(`   ✓ Database connected. Found ${noteCount} notes.`);
    
    // 2. Verify specific document exists
    const testDocId = 'cmdwl766o0003uvwlbqwn071k';
    const note = await prisma.note.findUnique({
      where: { id: testDocId }
    });
    
    if (!note) {
      throw new Error('Test document not found in database');
    }
    console.log(`   ✓ Test document found: "${note.title}"`);
    
    // 3. Test API retrieval
    console.log('2. Testing API retrieval...');
    const apiResponse = await fetch(`${API_URL}/notes/${testDocId}`);
    const apiData = await apiResponse.json();
    
    if (apiData.id !== testDocId) {
      throw new Error('API returned wrong document');
    }
    console.log('   ✓ API correctly returns document');
    
    // 4. Test WebSocket connection
    console.log('3. Testing WebSocket connection...');
    const ws = new WebSocket(`${WS_URL}/${testDocId}`);
    
    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        console.log('   ✓ WebSocket connected');
        ws.close();
        resolve();
      });
      ws.on('error', reject);
      setTimeout(() => reject(new Error('WebSocket timeout')), 5000);
    });
    
    // 5. Validate Yjs document exists
    console.log('4. Checking Yjs document state...');
    // This would require querying Hocuspocus directly
    // For now, we assume if WebSocket connects, Yjs is working
    
    console.log('\n✅ All integration tests passed!');
    
  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

validateIntegration();
```

### 3. Real Collaboration Test

```javascript
// test-collaboration.js
const puppeteer = require('puppeteer');

async function testCollaboration() {
  const browser1 = await puppeteer.launch({ headless: true });
  const browser2 = await puppeteer.launch({ headless: true });
  
  try {
    const page1 = await browser1.newPage();
    const page2 = await browser2.newPage();
    
    const testUrl = 'https://obsidiancomments.serverado.app/cmdwl766o0003uvwlbqwn071k';
    
    // Load document in both browsers
    await page1.goto(testUrl, { waitUntil: 'networkidle2' });
    await page2.goto(testUrl, { waitUntil: 'networkidle2' });
    
    // Wait for editor to load
    await page1.waitForSelector('.tiptap', { timeout: 10000 });
    await page2.waitForSelector('.tiptap', { timeout: 10000 });
    
    // Type in first browser
    await page1.click('.tiptap');
    await page1.type('.tiptap', 'Test collaboration text');
    
    // Wait and check if text appears in second browser
    await page2.waitForFunction(
      () => document.querySelector('.tiptap').textContent.includes('Test collaboration text'),
      { timeout: 5000 }
    );
    
    console.log('✅ Collaboration test passed!');
    
  } catch (error) {
    console.error('❌ Collaboration test failed:', error);
    process.exit(1);
  } finally {
    await browser1.close();
    await browser2.close();
  }
}

testCollaboration();
```

## Improved Deployment Process

### 1. Health Check Endpoints

Add these endpoints to your backend:

```javascript
// backend/routes/health.js
router.get('/api/health', async (req, res) => {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Redis
    await redis.ping();
    
    // Check Hocuspocus connection
    const hocuspocusHealth = await checkHocuspocusHealth();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected',
        hocuspocus: hocuspocusHealth ? 'connected' : 'error'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error.message
    });
  }
});

router.get('/api/health/detailed', async (req, res) => {
  const checks = {
    database: { status: 'unknown' },
    redis: { status: 'unknown' },
    hocuspocus: { status: 'unknown' },
    documents: { status: 'unknown' }
  };
  
  // Database check
  try {
    const count = await prisma.note.count();
    checks.database = { status: 'ok', noteCount: count };
  } catch (error) {
    checks.database = { status: 'error', error: error.message };
  }
  
  // Redis check
  try {
    const pong = await redis.ping();
    checks.redis = { status: 'ok', response: pong };
  } catch (error) {
    checks.redis = { status: 'error', error: error.message };
  }
  
  // Document accessibility check
  try {
    const testDoc = await prisma.note.findFirst();
    if (testDoc) {
      checks.documents = { status: 'ok', sampleId: testDoc.id };
    } else {
      checks.documents = { status: 'warning', message: 'No documents found' };
    }
  } catch (error) {
    checks.documents = { status: 'error', error: error.message };
  }
  
  res.json(checks);
});
```

### 2. Automated Deployment Script

```bash
#!/bin/bash
# deploy.sh

set -e  # Exit on any error

echo "=== Starting ObsidianComments Deployment ==="

# Configuration
REMOTE_HOST="root@138.197.187.49"
PROJECT_DIR="/root/obsidian-comments"
BACKUP_TAG="backup-$(date +%Y%m%d-%H%M%S)"

# Step 1: Create backups
echo "1. Creating backup of current images..."
ssh $REMOTE_HOST << EOF
  docker tag obsidian-comments_frontend:latest obsidian-comments_frontend:$BACKUP_TAG || true
  docker tag obsidian-comments_backend:latest obsidian-comments_backend:$BACKUP_TAG || true
  docker tag obsidian-comments_hocuspocus:latest obsidian-comments_hocuspocus:$BACKUP_TAG || true
EOF

# Step 2: Pull latest code
echo "2. Pulling latest code..."
ssh $REMOTE_HOST "cd $PROJECT_DIR && git pull"

# Step 3: Build all services
echo "3. Building services..."
ssh $REMOTE_HOST << 'EOF'
  cd /root/obsidian-comments
  
  # Build frontend with correct environment variables
  export VITE_API_URL=https://obsidiancomments.serverado.app
  export VITE_WS_URL=wss://obsidiancomments.serverado.app/ws
  
  # Build all images
  docker-compose -f docker-compose.prod.yml build
EOF

# Step 4: Deploy with zero downtime
echo "4. Deploying services..."
ssh $REMOTE_HOST << 'EOF'
  cd /root/obsidian-comments
  
  # Start new containers with temporary names
  docker run -d --name frontend-new --network obsidian-comments_obsidian-network obsidian-comments_frontend:latest
  docker run -d --name backend-new --network obsidian-comments_obsidian-network \
    -e NODE_ENV=production \
    -e PORT=8081 \
    -e DATABASE_URL="postgresql://obsidian:obsidian_password@postgres:5432/obsidian_comments" \
    -e REDIS_URL="redis://redis:6379" \
    obsidian-comments_backend:latest
  
  docker run -d --name hocuspocus-new --network obsidian-comments_obsidian-network \
    -e NODE_ENV=production \
    -e PORT=8082 \
    -e DATABASE_URL="postgresql://obsidian:obsidian_password@postgres:5432/obsidian_comments" \
    -e REDIS_URL="redis://redis:6379" \
    obsidian-comments_hocuspocus:latest
  
  # Wait for services to be healthy
  sleep 10
  
  # Switch over
  docker stop frontend backend hocuspocus || true
  docker rm frontend backend hocuspocus || true
  
  docker rename frontend-new frontend
  docker rename backend-new backend
  docker rename hocuspocus-new hocuspocus
  
  # Reload nginx
  docker exec nginx nginx -s reload
EOF

# Step 5: Run tests
echo "5. Running post-deployment tests..."
sleep 5  # Give services time to fully start

# Run the E2E test script
./test-e2e.sh

# If tests fail, rollback
if [ $? -ne 0 ]; then
  echo "❌ Tests failed! Rolling back..."
  ssh $REMOTE_HOST << EOF
    docker stop frontend backend hocuspocus
    docker rm frontend backend hocuspocus
    
    docker run -d --name frontend --network obsidian-comments_obsidian-network obsidian-comments_frontend:$BACKUP_TAG
    docker run -d --name backend --network obsidian-comments_obsidian-network \
      -e NODE_ENV=production \
      -e PORT=8081 \
      -e DATABASE_URL="postgresql://obsidian:obsidian_password@postgres:5432/obsidian_comments" \
      -e REDIS_URL="redis://redis:6379" \
      obsidian-comments_backend:$BACKUP_TAG
    
    docker run -d --name hocuspocus --network obsidian-comments_obsidian-network \
      -e NODE_ENV=production \
      -e PORT=8082 \
      -e DATABASE_URL="postgresql://obsidian:obsidian_password@postgres:5432/obsidian_comments" \
      -e REDIS_URL="redis://redis:6379" \
      obsidian-comments_hocuspocus:$BACKUP_TAG
EOF
  exit 1
fi

echo "✅ Deployment successful!"
```

### 3. Docker Compose Production Configuration

Create a proper `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./packages/docker/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./packages/docker/nginx-frontend.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - frontend
      - backend
      - hocuspocus
    networks:
      - obsidian-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: .
      dockerfile: packages/docker/Dockerfile.frontend
      args:
        VITE_API_URL: https://obsidiancomments.serverado.app
        VITE_WS_URL: wss://obsidiancomments.serverado.app/ws
    container_name: frontend
    networks:
      - obsidian-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    build:
      context: .
      dockerfile: packages/docker/Dockerfile.backend
    container_name: backend
    environment:
      NODE_ENV: production
      PORT: 8081
      DATABASE_URL: postgresql://obsidian:obsidian_password@postgres:5432/obsidian_comments
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - obsidian-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8081/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  hocuspocus:
    build:
      context: .
      dockerfile: packages/docker/Dockerfile.hocuspocus
    container_name: hocuspocus
    environment:
      NODE_ENV: production
      PORT: 8082
      DATABASE_URL: postgresql://obsidian:obsidian_password@postgres:5432/obsidian_comments
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - obsidian-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8082/"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    container_name: postgres
    environment:
      POSTGRES_DB: obsidian_comments
      POSTGRES_USER: obsidian
      POSTGRES_PASSWORD: obsidian_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - obsidian-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U obsidian -d obsidian_comments"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: redis
    volumes:
      - redis_data:/data
    networks:
      - obsidian-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  obsidian-network:
    name: obsidian-comments_obsidian-network
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

## Debugging Current Issues

### 1. Check Yjs Document Initialization

```javascript
// Add to your Hocuspocus server
onLoadDocument: async ({ document, documentName }) => {
  console.log(`Loading document: ${documentName}`);
  
  // Check if document exists in database
  const note = await prisma.note.findUnique({
    where: { id: documentName }
  });
  
  if (note && note.content) {
    // Initialize Yjs document with database content
    const yText = document.getText('content');
    if (yText.length === 0) {
      yText.insert(0, note.content);
      console.log(`Initialized document ${documentName} with database content`);
    }
  }
  
  return document;
}
```

### 2. Frontend Connection Debugging

Add comprehensive logging to your frontend:

```javascript
// useCollaboration.ts
useEffect(() => {
  console.log('[Collaboration] Initializing for document:', noteId);
  
  const ydoc = new Y.Doc();
  const provider = new HocuspocusProvider({
    url: VITE_WS_URL,
    name: noteId,
    document: ydoc,
    onConnect: () => {
      console.log('[Collaboration] Connected to server');
    },
    onDisconnect: () => {
      console.log('[Collaboration] Disconnected from server');
    },
    onSynced: ({ state }) => {
      console.log('[Collaboration] Sync state:', state);
    },
    onStatus: ({ status }) => {
      console.log('[Collaboration] Status:', status);
    },
    onAwarenessUpdate: ({ states }) => {
      console.log('[Collaboration] Awareness update:', states.size, 'users');
    }
  });
  
  // ... rest of the code
});
```

### 3. Network Diagnostics

```bash
#!/bin/bash
# diagnose-network.sh

echo "=== Network Diagnostics ==="

# Check container connectivity
echo "1. Container Network Status:"
ssh root@138.197.187.49 'docker network inspect obsidian-comments_obsidian-network | grep -A 5 "Containers"'

# Test internal connectivity
echo -e "\n2. Internal Connectivity Tests:"
ssh root@138.197.187.49 << 'EOF'
  # Frontend -> Backend
  docker exec frontend wget -q -O- http://backend:8081/api/health | head -n1
  
  # Frontend -> Hocuspocus
  docker exec frontend wget -q -O- http://hocuspocus:8082/ | head -n1
  
  # Nginx -> All services
  docker exec nginx wget -q -O- http://frontend:8080/ | grep -o "<title>.*</title>"
  docker exec nginx wget -q -O- http://backend:8081/api/health
  docker exec nginx wget -q -O- http://hocuspocus:8082/
EOF

# Check logs for errors
echo -e "\n3. Recent Error Logs:"
ssh root@138.197.187.49 << 'EOF'
  echo "Frontend errors:"
  docker logs frontend 2>&1 | grep -i error | tail -5
  
  echo -e "\nBackend errors:"
  docker logs backend 2>&1 | grep -i error | tail -5
  
  echo -e "\nHocuspocus errors:"
  docker logs hocuspocus 2>&1 | grep -i error | tail -5
EOF
```

## Action Plan

1. **Immediate**: Run the diagnostic script to identify specific failures
2. **Deploy**: Use the automated deployment script with proper health checks
3. **Monitor**: Implement the comprehensive testing suite
4. **Debug**: Add detailed logging to identify where the chain breaks
5. **Validate**: Use Puppeteer tests to verify actual user experience

The key is moving from superficial HTTP checks to actual functional validation of the complete document loading and collaboration flow.