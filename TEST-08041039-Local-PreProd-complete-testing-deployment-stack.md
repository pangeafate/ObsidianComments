# Complete Testing & Deployment Stack for ObsidianComments

## The Core Problems You're Facing

1. **Environment Differences**: Local dev server vs production nginx/Docker
2. **Missing Integration Tests**: Your tests don't catch real browser issues
3. **No Staging Environment**: Deploying directly to production
4. **Inadequate Error Monitoring**: Finding issues only after users report them

## 1. Local Development Environment (Matches Production)

### Docker Compose for Local Development
```yaml
# docker-compose.local.yml
version: '3.8'

services:
  # Local nginx to match production
  nginx-local:
    image: nginx:alpine
    ports:
      - "3000:80"  # Local port
    volumes:
      - ./packages/docker/nginx-frontend.conf:/etc/nginx/conf.d/default.conf
      - ./packages/frontend/dist:/usr/share/nginx/html
    depends_on:
      - backend-local
      - hocuspocus-local

  backend-local:
    build:
      context: .
      dockerfile: packages/docker/Dockerfile.backend
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://obsidian:obsidian@postgres-local:5432/obsidian_local
      REDIS_URL: redis://redis-local:6379
    ports:
      - "8081:8081"

  hocuspocus-local:
    build:
      context: .
      dockerfile: packages/docker/Dockerfile.hocuspocus
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://obsidian:obsidian@postgres-local:5432/obsidian_local
      REDIS_URL: redis://redis-local:6379
    ports:
      - "8082:8082"

  postgres-local:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: obsidian_local
      POSTGRES_USER: obsidian
      POSTGRES_PASSWORD: obsidian
    ports:
      - "5432:5432"

  redis-local:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

### Local Testing Script
```bash
#!/bin/bash
# test-local-production.sh

echo "🚀 Starting local production-like environment..."

# Build frontend with production settings
export VITE_API_URL=http://localhost:3000
export VITE_WS_URL=ws://localhost:3000/ws
npm run build --prefix packages/frontend

# Start services
docker-compose -f docker-compose.local.yml up -d

echo "⏳ Waiting for services to start..."
sleep 10

# Run tests against local production-like environment
npm run test:e2e

echo "✅ Local production environment ready at http://localhost:3000"
```

## 2. Comprehensive E2E Test Suite

### Playwright Setup (Better than Puppeteer)
```bash
# Install Playwright
npm install -D @playwright/test @playwright/test-reporter-html
npx playwright install
```

### Test Configuration
```javascript
// playwright.config.js
module.exports = {
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 2,
  workers: 1,
  use: {
    baseURL: process.env.TEST_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  reporter: [
    ['html', { outputFolder: 'test-results/html' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['github'],
  ],
};
```

### Critical E2E Tests
```javascript
// tests/e2e/critical-path.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Critical User Paths', () => {
  let documentId;

  test.beforeEach(async ({ page }) => {
    // Set up consistent test data
    documentId = 'test-' + Date.now();
  });

  test('Document loads without JavaScript errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(`/editor/${documentId}`);
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });

  test('No CSP violations', async ({ page }) => {
    const cspViolations = [];
    page.on('console', msg => {
      if (msg.text().includes('Content Security Policy')) {
        cspViolations.push(msg.text());
      }
    });

    await page.goto(`/editor/${documentId}`);
    await page.waitForTimeout(3000);

    expect(cspViolations).toHaveLength(0);
  });

  test('Editor initializes without Yjs conflicts', async ({ page }) => {
    const yjsErrors = [];
    page.on('console', msg => {
      if (msg.text().includes('Type with the name')) {
        yjsErrors.push(msg.text());
      }
    });

    await page.goto(`/editor/${documentId}`);
    await page.waitForSelector('.tiptap');

    expect(yjsErrors).toHaveLength(0);
  });

  test('Real-time collaboration works', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await page1.goto(`/editor/${documentId}`);
    await page2.goto(`/editor/${documentId}`);

    await page1.waitForSelector('.tiptap');
    await page2.waitForSelector('.tiptap');

    // Type in page 1
    await page1.click('.tiptap');
    await page1.type('.tiptap', 'Hello from user 1');

    // Check it appears in page 2
    await expect(page2.locator('.tiptap')).toContainText('Hello from user 1', {
      timeout: 5000
    });

    await context1.close();
    await context2.close();
  });
});
```

## 3. Staging Environment

### Staging Server Setup
```bash
# deploy-staging.sh
#!/bin/bash

STAGING_HOST="staging.obsidiancomments.serverado.app"
STAGING_IP="YOUR_STAGING_IP"

echo "🚀 Deploying to staging..."

# Build with staging URLs
export VITE_API_URL=https://$STAGING_HOST
export VITE_WS_URL=wss://$STAGING_HOST/ws

npm run build --prefix packages/frontend

# Deploy to staging
ssh root@$STAGING_IP << 'EOF'
  cd /root/obsidian-comments
  git pull origin staging
  docker-compose -f docker-compose.staging.yml up -d --build
EOF

# Run E2E tests against staging
export TEST_URL=https://$STAGING_HOST
npm run test:e2e

echo "✅ Staging deployment complete"
```

## 4. Pre-Production Checklist

### Automated Pre-Deploy Validation
```javascript
// scripts/pre-deploy-check.js
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 Running pre-deployment checks...\n');

const checks = {
  'No console.logs in production': () => {
    const files = execSync('find packages/frontend/src -name "*.ts" -o -name "*.tsx"')
      .toString().split('\n').filter(Boolean);
    
    let found = false;
    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('console.log') && !content.includes('// eslint-disable')) {
        console.log(`❌ Found console.log in ${file}`);
        found = true;
      }
    });
    return !found;
  },

  'Environment variables set': () => {
    const required = ['VITE_API_URL', 'VITE_WS_URL'];
    return required.every(env => {
      if (!process.env[env]) {
        console.log(`❌ Missing ${env}`);
        return false;
      }
      return true;
    });
  },

  'No eval in bundle': () => {
    const bundle = fs.readFileSync('packages/frontend/dist/assets/index-*.js', 'utf8');
    const evalCount = (bundle.match(/\beval\s*\(/g) || []).length;
    if (evalCount > 0) {
      console.log(`⚠️  Found ${evalCount} eval() calls in bundle`);
    }
    return true; // Warning only
  },

  'Bundle size reasonable': () => {
    const stats = fs.statSync('packages/frontend/dist/assets/index-*.js');
    const sizeMB = stats.size / 1024 / 1024;
    console.log(`📦 Bundle size: ${sizeMB.toFixed(2)}MB`);
    return sizeMB < 5; // 5MB limit
  },

  'TypeScript compilation clean': () => {
    try {
      execSync('npm run type-check --prefix packages/frontend', { stdio: 'pipe' });
      return true;
    } catch (e) {
      console.log('❌ TypeScript errors found');
      return false;
    }
  }
};

let allPassed = true;
Object.entries(checks).forEach(([name, check]) => {
  const passed = check();
  console.log(`${passed ? '✅' : '❌'} ${name}`);
  if (!passed) allPassed = false;
});

if (!allPassed) {
  console.log('\n❌ Pre-deployment checks failed!');
  process.exit(1);
}

console.log('\n✅ All checks passed!');
```

## 5. Production Monitoring

### Sentry Integration
```javascript
// packages/frontend/src/main.tsx
import * as Sentry from "@sentry/react";

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: "YOUR_SENTRY_DSN",
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay(),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      // Filter out known issues
      if (event.exception?.values?.[0]?.value?.includes('Type with the name')) {
        console.error('Yjs error detected:', event);
        // Still send but tag it
        event.tags = { ...event.tags, known_issue: 'yjs_type_conflict' };
      }
      return event;
    }
  });
}
```

### Health Check Monitoring
```javascript
// monitoring/health-check.js
const axios = require('axios');

async function checkHealth() {
  const checks = [
    {
      name: 'Frontend',
      url: 'https://obsidiancomments.serverado.app/',
      expect: (data) => data.includes('<div id="root">')
    },
    {
      name: 'API',
      url: 'https://obsidiancomments.serverado.app/api/health',
      expect: (data) => JSON.parse(data).status === 'ok'
    },
    {
      name: 'WebSocket',
      url: 'https://obsidiancomments.serverado.app/ws',
      expect: () => true // Just check it doesn't 404
    },
    {
      name: 'Document Load',
      url: 'https://obsidiancomments.serverado.app/editor/test-doc',
      expect: (data) => !data.includes('error')
    }
  ];

  for (const check of checks) {
    try {
      const response = await axios.get(check.url);
      const passed = check.expect(response.data);
      console.log(`${passed ? '✅' : '❌'} ${check.name}`);
    } catch (error) {
      console.log(`❌ ${check.name}: ${error.message}`);
    }
  }
}

// Run every 5 minutes
setInterval(checkHealth, 5 * 60 * 1000);
```

## 6. Deployment Pipeline

### GitHub Actions CI/CD
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm test
        
      - name: Build application
        run: |
          export VITE_API_URL=https://obsidiancomments.serverado.app
          export VITE_WS_URL=wss://obsidiancomments.serverado.app/ws
          npm run build --prefix packages/frontend
          
      - name: Run pre-deploy checks
        run: node scripts/pre-deploy-check.js
        
      - name: Start local environment
        run: docker-compose -f docker-compose.local.yml up -d
        
      - name: Run E2E tests
        run: npm run test:e2e
        
      - name: Deploy to staging
        run: ./deploy-staging.sh
        
      - name: Test staging
        run: |
          export TEST_URL=https://staging.obsidiancomments.serverado.app
          npm run test:e2e
          
      - name: Deploy to production
        if: success()
        run: ./deploy-production.sh
        
      - name: Notify on failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          text: 'Deployment failed!'
```

## 7. Developer Tooling

### Package.json Scripts
```json
{
  "scripts": {
    "dev": "docker-compose -f docker-compose.local.yml up",
    "test:unit": "jest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:production": "TEST_URL=https://obsidiancomments.serverado.app playwright test",
    "build:local": "VITE_API_URL=http://localhost:3000 vite build",
    "build:staging": "VITE_API_URL=https://staging.obsidiancomments.serverado.app vite build",
    "build:production": "VITE_API_URL=https://obsidiancomments.serverado.app vite build",
    "deploy:staging": "./scripts/deploy-staging.sh",
    "deploy:production": "./scripts/deploy-production.sh",
    "check:pre-deploy": "node scripts/pre-deploy-check.js",
    "monitor:health": "node monitoring/health-check.js",
    "debug:production": "node scripts/debug-production.js"
  }
}
```

## 8. Debugging Tools

### Production Debugging Script
```javascript
// scripts/debug-production.js
const puppeteer = require('puppeteer');

async function debugProduction() {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--disable-web-security'] // For testing only
  });

  const page = await browser.newPage();
  
  // Enable verbose logging
  await page.evaluateOnNewDocument(() => {
    // Log all errors
    window.addEventListener('error', (e) => {
      console.error('Global error:', e);
    });
    
    // Log unhandled promise rejections
    window.addEventListener('unhandledrejection', (e) => {
      console.error('Unhandled rejection:', e.reason);
    });
    
    // Log CSP violations
    document.addEventListener('securitypolicyviolation', (e) => {
      console.error('CSP violation:', e);
    });
  });

  console.log('Opening production site with debugging enabled...');
  await page.goto('https://obsidiancomments.serverado.app/editor/cmdwl766o0003uvwlbqwn071k');
  
  console.log('Check the DevTools console for errors.');
  console.log('Press Ctrl+C to exit.');
  
  await new Promise(() => {}); // Keep running
}

debugProduction();
```

## The Complete Workflow

1. **Develop locally** with production-like Docker environment
2. **Run pre-deploy checks** automatically
3. **Deploy to staging** first
4. **Run full E2E test suite** against staging
5. **Deploy to production** only if staging passes
6. **Monitor continuously** with health checks and error tracking

This stack will catch issues like CSP violations, Yjs conflicts, and environment differences before they reach production.