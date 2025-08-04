# Real Browser Testing Strategy for ObsidianComments

## The Core Problem

Your current tests check if services are running (HTTP 200) but don't verify if the application actually works. The real errors only appear in the browser:
- Yjs type conflicts
- Missing authentication tokens
- Blank interface
- CSP violations

## Improved Testing Architecture

### 1. Real Browser Error Detection Test

```javascript
// test-real-browser.js
const puppeteer = require('puppeteer');

async function testRealBrowser() {
  console.log('🧪 Real Browser Test with Error Detection');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true in CI
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  const errors = [];
  const warnings = [];
  
  // Capture ALL console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    
    if (type === 'error') {
      errors.push(text);
      console.log('❌ Browser Error:', text);
    } else if (type === 'warning') {
      warnings.push(text);
      console.log('⚠️  Browser Warning:', text);
    } else {
      console.log(`📝 Browser ${type}:`, text);
    }
  });
  
  // Capture page errors (uncaught exceptions)
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log('💥 Page Error:', error.message);
  });
  
  // Capture failed requests
  page.on('requestfailed', request => {
    errors.push(`Request failed: ${request.url()} - ${request.failure().errorText}`);
    console.log('🚫 Request Failed:', request.url());
  });
  
  try {
    // Test 1: Load the editor page
    console.log('\n📄 Loading editor page...');
    const url = 'https://obsidiancomments.serverado.app/editor/cmdwl766o0003uvwlbqwn071k';
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Test 2: Check for critical errors
    if (errors.length > 0) {
      console.log('\n❌ CRITICAL: Browser errors detected:');
      errors.forEach(err => console.log('  -', err));
      throw new Error('Browser errors detected');
    }
    
    // Test 3: Check if editor actually loaded
    console.log('\n🔍 Checking if editor loaded...');
    const editorExists = await page.evaluate(() => {
      return document.querySelector('.tiptap') !== null;
    });
    
    if (!editorExists) {
      console.log('❌ Editor element not found');
      
      // Get page content for debugging
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log('Page content:', bodyText || '(empty)');
      
      throw new Error('Editor did not load');
    }
    
    // Test 4: Check if content is visible
    const contentVisible = await page.evaluate(() => {
      const editor = document.querySelector('.tiptap');
      return editor && editor.textContent.length > 0;
    });
    
    console.log('✅ Editor loaded:', editorExists);
    console.log('📝 Content visible:', contentVisible);
    
    // Test 5: Test typing
    console.log('\n⌨️  Testing typing functionality...');
    await page.click('.tiptap');
    await page.type('.tiptap', 'Test typing');
    
    // Wait a bit for sync
    await page.waitForTimeout(2000);
    
    // Test 6: Check if text persisted
    const typedText = await page.evaluate(() => {
      const editor = document.querySelector('.tiptap');
      return editor ? editor.textContent : '';
    });
    
    if (!typedText.includes('Test typing')) {
      throw new Error('Typed text not found in editor');
    }
    
    console.log('✅ Typing works, text:', typedText);
    
    // Test 7: Check WebSocket connection
    const wsConnected = await page.evaluate(() => {
      // Check if HocuspocusProvider is connected
      return window.hocuspocusProvider?.isConnected || false;
    });
    
    console.log('🔌 WebSocket connected:', wsConnected);
    
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    // Take screenshot for debugging
    await page.screenshot({ 
      path: 'test-failure.png',
      fullPage: true 
    });
    console.log('📸 Screenshot saved to test-failure.png');
    
    // Get browser logs
    const logs = await browser.pages().then(pages => 
      Promise.all(pages.map(p => p.evaluate(() => {
        const logs = [];
        const originalLog = console.log;
        console.log = (...args) => {
          logs.push(args.join(' '));
          originalLog.apply(console, args);
        };
        return logs;
      })))
    );
    
    throw error;
    
  } finally {
    await browser.close();
  }
}

testRealBrowser().catch(console.error);
```

### 2. Pre-Deployment Bundle Validation

```javascript
// validate-bundle.js
const fs = require('fs');
const path = require('path');

function validateBundle() {
  console.log('🔍 Validating production bundle...');
  
  const bundlePath = 'packages/frontend/dist/assets';
  const files = fs.readdirSync(bundlePath);
  const jsFiles = files.filter(f => f.endsWith('.js'));
  
  console.log(`Found ${jsFiles.length} JS files`);
  
  for (const file of jsFiles) {
    const content = fs.readFileSync(path.join(bundlePath, file), 'utf8');
    
    // Check for eval usage
    const evalMatches = content.match(/\beval\s*\(/g) || [];
    if (evalMatches.length > 0) {
      console.log(`⚠️  ${file} contains ${evalMatches.length} eval() calls`);
    }
    
    // Check for proper environment variable replacement
    if (content.includes('import.meta.env')) {
      console.log(`❌ ${file} still contains import.meta.env references`);
    }
    
    // Check if WebSocket URL is correct
    if (content.includes('ws://') && !content.includes('wss://')) {
      console.log(`❌ ${file} uses insecure WebSocket URL`);
    }
    
    // Check bundle size
    const size = (content.length / 1024 / 1024).toFixed(2);
    console.log(`📦 ${file} size: ${size}MB`);
  }
}
```

### 3. Automated Fix Detection Test

```javascript
// test-yjs-fix.js
const puppeteer = require('puppeteer');

async function testYjsFix() {
  console.log('🧪 Testing Yjs Type Conflict Fix');
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  let yjsError = null;
  
  page.on('console', msg => {
    if (msg.text().includes('Type with the name content has already been defined')) {
      yjsError = msg.text();
    }
  });
  
  page.on('pageerror', error => {
    if (error.message.includes('Type with the name content')) {
      yjsError = error.message;
    }
  });
  
  // Load page multiple times to trigger race condition
  for (let i = 0; i < 5; i++) {
    console.log(`Attempt ${i + 1}/5...`);
    await page.goto('https://obsidiancomments.serverado.app/editor/cmdwl766o0003uvwlbqwn071k');
    await page.waitForTimeout(2000);
    
    if (yjsError) {
      console.log('❌ Yjs error still occurs:', yjsError);
      throw new Error('Yjs type conflict not fixed');
    }
  }
  
  console.log('✅ No Yjs type conflicts detected');
  await browser.close();
}
```

### 4. CI/CD Pipeline Test Suite

```yaml
# .github/workflows/test.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Build application
      run: |
        docker-compose -f docker-compose.test.yml build
        
    - name: Start services
      run: |
        docker-compose -f docker-compose.test.yml up -d
        sleep 10 # Wait for services
        
    - name: Run health checks
      run: |
        curl -f http://localhost:8080 || exit 1
        curl -f http://localhost:8081/api/health || exit 1
        
    - name: Run browser tests
      run: |
        npm install puppeteer
        node test-real-browser.js
        
    - name: Validate bundle
      run: |
        node validate-bundle.js
        
    - name: Test Yjs fix
      run: |
        node test-yjs-fix.js
        
    - name: Capture logs on failure
      if: failure()
      run: |
        docker-compose logs > failure-logs.txt
        
    - name: Upload artifacts
      if: failure()
      uses: actions/upload-artifact@v3
      with:
        name: test-failures
        path: |
          test-failure.png
          failure-logs.txt
```

### 5. Local Development Test Script

```bash
#!/bin/bash
# dev-test.sh

echo "🧪 Running comprehensive local tests"

# 1. Build the application
echo "Building application..."
npm run build --prefix packages/frontend

# 2. Check for common issues
echo "Checking for common issues..."

# Check for eval in bundle
if grep -r "eval(" packages/frontend/dist/assets/*.js > /dev/null; then
  echo "⚠️  Warning: Bundle contains eval() calls"
fi

# Check environment variables
if ! grep -q "wss://obsidiancomments.serverado.app" packages/frontend/dist/assets/*.js; then
  echo "❌ Error: WebSocket URL not properly replaced"
  exit 1
fi

# 3. Start local test environment
docker-compose -f docker-compose.test.yml up -d

# 4. Wait for services
echo "Waiting for services..."
sleep 10

# 5. Run browser tests
echo "Running browser tests..."
npx puppeteer test-real-browser.js

# 6. Clean up
docker-compose -f docker-compose.test.yml down
```

## Root Cause Analysis Tools

### 1. Debug Mode for useCollaboration Hook

```typescript
// Add this to useCollaboration.ts for debugging
const DEBUG = true; // Set via environment variable in production

export function useCollaboration(documentId: string): UseCollaborationReturn {
  if (DEBUG) console.log('[useCollaboration] Initializing for:', documentId);
  
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  
  useEffect(() => {
    if (DEBUG) console.log('[useCollaboration] Effect triggered for:', documentId);
    
    // Add stack trace to find multiple initializations
    if (DEBUG) console.trace('[useCollaboration] Creating Y.Doc');
    
    const newYdoc = new Y.Doc();
    
    // Add unique ID to track instances
    const instanceId = Math.random().toString(36).substr(2, 9);
    (newYdoc as any).__instanceId = instanceId;
    if (DEBUG) console.log('[useCollaboration] Created Y.Doc instance:', instanceId);
    
    setYdoc(newYdoc);
    
    return () => {
      if (DEBUG) console.log('[useCollaboration] Cleanup for instance:', instanceId);
      newYdoc.destroy();
    };
  }, [documentId]);
  
  // ... rest of the hook
}
```

### 2. Production Debugging Endpoint

```javascript
// Add to your backend API
app.get('/api/debug/editor-state', async (req, res) => {
  const { documentId } = req.query;
  
  try {
    // Check database
    const note = await prisma.note.findUnique({
      where: { id: documentId }
    });
    
    // Check Redis for active connections
    const activeUsers = await redis.smembers(`doc:${documentId}:users`);
    
    // Check Hocuspocus document state
    const yjsState = await redis.get(`doc:${documentId}:state`);
    
    res.json({
      database: {
        exists: !!note,
        hasContent: !!(note?.content),
        contentLength: note?.content?.length || 0
      },
      redis: {
        activeUsers: activeUsers.length,
        hasState: !!yjsState
      },
      debug: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## The Real Issue

Based on your logs, the core problems are:

1. **Yjs initialization is still broken** - The fix didn't work because something else is creating Y.Doc instances
2. **Authentication token missing** - HocuspocusProvider isn't getting proper config
3. **CSP still blocking eval** - Despite removing `unsafe-eval`, the code still needs it

## Immediate Action Plan

1. **Deploy the real browser test** to see actual errors
2. **Add debug logging** to track Y.Doc creation
3. **Check HocuspocusProvider config** - the token might not be passed correctly
4. **Consider adding `unsafe-eval` back temporarily** to get it working, then fix properly

The key insight: Your tests must run in a real browser and catch JavaScript errors, not just check HTTP status codes.