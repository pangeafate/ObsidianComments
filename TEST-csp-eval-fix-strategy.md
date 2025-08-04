# CSP Eval Fix Strategy for ObsidianComments

## Immediate Fix (To Get App Working)

### Step 1: Temporarily Allow unsafe-eval

```nginx
# In packages/docker/nginx-frontend.conf
location / {
    # TEMPORARY: Add unsafe-eval to get app working
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' wss://obsidiancomments.serverado.app; img-src 'self' data:; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;
    
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
}
```

Deploy immediately:
```bash
ssh root@138.197.187.49 << 'EOF'
cd /root/obsidian-comments

# Update nginx config
cat > packages/docker/nginx-frontend.conf << 'NGINX'
server {
    listen 8080;
    server_name localhost;
    
    location / {
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' wss://obsidiancomments.serverado.app; img-src 'self' data:; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;
        
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
NGINX

# Rebuild and restart frontend
docker build -t obsidian-comments_frontend:latest -f packages/docker/Dockerfile.frontend .
docker stop frontend && docker rm frontend
docker run -d --name frontend --network obsidian-comments_obsidian-network obsidian-comments_frontend:latest
docker exec nginx nginx -s reload
EOF
```

## Step 2: Identify What's Using Eval

### Create eval detection script:

```javascript
// detect-eval-usage.js
const fs = require('fs');
const path = require('path');

function findEvalUsage() {
  console.log('🔍 Searching for eval usage in bundle...\n');
  
  const distPath = 'packages/frontend/dist/assets';
  const files = fs.readdirSync(distPath).filter(f => f.endsWith('.js'));
  
  const evalPatterns = [
    /\beval\s*\(/g,
    /new\s+Function\s*\(/g,
    /setTimeout\s*\(\s*["']/g,
    /setInterval\s*\(\s*["']/g,
    /\.constructor\s*\(\s*["']/g
  ];
  
  const results = [];
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(distPath, file), 'utf8');
    
    evalPatterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const start = Math.max(0, match.index - 100);
        const end = Math.min(content.length, match.index + 100);
        const context = content.substring(start, end);
        
        results.push({
          file,
          pattern: pattern.source,
          match: match[0],
          context: context.replace(/\n/g, ' ')
        });
      }
    });
  }
  
  // Try to identify which library it's from
  results.forEach(result => {
    console.log(`📍 Found in ${result.file}:`);
    console.log(`   Pattern: ${result.match}`);
    console.log(`   Context: ...${result.context}...`);
    
    // Try to guess the library
    if (result.context.includes('prosemirror')) {
      console.log('   🏷️  Likely from: ProseMirror');
    } else if (result.context.includes('yjs') || result.context.includes('Y.')) {
      console.log('   🏷️  Likely from: Yjs');
    } else if (result.context.includes('tiptap')) {
      console.log('   🏷️  Likely from: Tiptap');
    } else if (result.context.includes('markdown')) {
      console.log('   🏷️  Likely from: Markdown parser');
    }
    console.log('');
  });
  
  return results;
}

findEvalUsage();
```

### Browser-based eval detection:

```javascript
// inject-eval-detection.js
// Add this to your index.html temporarily
(function() {
  const originalEval = window.eval;
  const originalFunction = window.Function;
  
  window.eval = function(...args) {
    console.trace('eval() called with:', args[0]?.substring(0, 100));
    return originalEval.apply(this, args);
  };
  
  window.Function = function(...args) {
    console.trace('new Function() called with:', args);
    return originalFunction.apply(this, args);
  };
  
  // Also track setTimeout/setInterval with strings
  const originalSetTimeout = window.setTimeout;
  window.setTimeout = function(fn, ...args) {
    if (typeof fn === 'string') {
      console.trace('setTimeout() called with string:', fn.substring(0, 100));
    }
    return originalSetTimeout.apply(this, [fn, ...args]);
  };
})();
```

## Step 3: Long-term Solutions

### Option A: Configure Dependencies to Avoid Eval

Some libraries have options to avoid eval:

```javascript
// vite.config.ts - Add build optimizations
export default defineConfig({
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate problematic libraries
          'yjs': ['yjs'],
          'tiptap': ['@tiptap/core', '@tiptap/pm'],
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['yjs'], // Sometimes helps with eval issues
  }
});
```

### Option B: Use Vite Plugin to Transform Code

```javascript
// vite-plugin-remove-eval.js
export function removeEvalPlugin() {
  return {
    name: 'remove-eval',
    transform(code, id) {
      if (id.includes('node_modules')) {
        // Replace problematic patterns
        code = code.replace(/new Function\(/g, 'new SafeFunction(');
        // Add more replacements as needed
      }
      return code;
    }
  };
}
```

### Option C: Replace Problematic Dependencies

If certain libraries absolutely require eval:

1. **For Markdown parsing**: Use `markdown-it` with safe mode
2. **For ProseMirror**: Use specific builds without eval
3. **For Yjs**: Check if using the correct ESM build

## Step 4: Proper Testing for CSP Issues

```javascript
// test-csp-compliance.js
const puppeteer = require('puppeteer');

async function testCSPCompliance() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const cspViolations = [];
  
  // Listen for CSP violations
  page.on('console', msg => {
    if (msg.text().includes('Content Security Policy')) {
      cspViolations.push(msg.text());
    }
  });
  
  // Also check response headers
  page.on('response', response => {
    const csp = response.headers()['content-security-policy'];
    if (csp) {
      console.log('CSP Header:', csp);
    }
  });
  
  await page.goto('https://obsidiancomments.serverado.app/editor/cmdwl766o0003uvwlbqwn071k');
  await page.waitForTimeout(5000);
  
  if (cspViolations.length > 0) {
    console.log('❌ CSP Violations detected:');
    cspViolations.forEach(v => console.log('  -', v));
  } else {
    console.log('✅ No CSP violations');
  }
  
  await browser.close();
}
```

## Step 5: Gradual Migration Strategy

1. **Week 1**: Deploy with `unsafe-eval` to get app working
2. **Week 2**: Identify and document all eval usage
3. **Week 3**: Replace or configure libraries one by one
4. **Week 4**: Remove `unsafe-eval` and test thoroughly

## Common Culprits in Your Stack

Based on your dependencies, the most likely sources of eval usage are:

1. **ProseMirror** (used by Tiptap) - Sometimes uses Function constructor for performance
2. **Yjs** - May use eval for performance optimizations
3. **Markdown parsers** - Often use eval for custom rendering
4. **Build artifacts** - Vite/Rollup might generate code with eval

## Monitoring in Production

Add CSP reporting to catch issues:

```nginx
# In nginx config
add_header Content-Security-Policy-Report-Only "default-src 'self'; script-src 'self' 'unsafe-inline'; report-uri /api/csp-report;" always;
```

```javascript
// In backend
app.post('/api/csp-report', (req, res) => {
  console.log('CSP Violation:', req.body);
  // Log to monitoring service
  res.status(204).end();
});
```

## Quick Decision Tree

1. **Need app working NOW?** → Add `unsafe-eval` temporarily
2. **Have time to fix properly?** → Identify and replace eval usage
3. **Can't replace dependencies?** → Consider CSP exceptions for specific pages
4. **Security critical?** → Must eliminate all eval usage

The most pragmatic approach is to add `unsafe-eval` now to unblock your users, then systematically eliminate eval usage over the next few weeks.