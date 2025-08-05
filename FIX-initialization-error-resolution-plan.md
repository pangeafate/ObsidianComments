# JavaScript Initialization Error Resolution Plan

## Executive Summary
The duplication fix implementation is complete but blocked by variable initialization errors ('$' and 'B'). These errors occur at runtime due to bundling/hoisting issues, not syntax errors. We need to systematically isolate and fix these without losing the duplication fixes.

---

## Phase 1: Immediate Diagnosis (30 minutes)

### 1.1 Isolate the Exact Error Source

Create a minimal test to identify which specific code causes the 'B' error:

```javascript
// tests/e2e/initialization-diagnosis.spec.js
test('Diagnose initialization error - binary search approach', async ({ page }) => {
  // Capture the exact error
  const errors = [];
  page.on('pageerror', err => {
    errors.push({
      message: err.message,
      stack: err.stack
    });
  });

  await page.goto('/editor/init-test-' + Date.now());
  
  // Log the first error in detail
  if (errors.length > 0) {
    console.log('First error full details:', errors[0]);
    console.log('Stack trace:', errors[0].stack);
  }
  
  // Check if we can access the bundled JS
  const scriptContent = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script'));
    return scripts.map(s => ({
      src: s.src,
      inline: s.innerHTML.substring(0, 200)
    }));
  });
  
  console.log('Scripts loaded:', scriptContent);
});
```

### 1.2 Check Build Output for Minification Issues

Temporarily disable minification to see actual variable names:

```javascript
// vite.config.js - Add to your frontend config
export default {
  build: {
    minify: false, // Temporarily disable
    sourcemap: true, // Enable source maps
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'editor': ['@tiptap/core', '@tiptap/react'],
          'collab': ['yjs', '@hocuspocus/provider']
        }
      }
    }
  }
};
```

### 1.3 Analyze Import Order

Check if there are circular dependencies:

```bash
# Install circular dependency checker
npm install -D madge

# Run analysis
npx madge --circular packages/frontend/src/
```

---

## Phase 2: Systematic Fixes (1 hour)

### 2.1 Fix DocumentService Integration

The error changed from '$' to 'B' when you modified documentService, indicating the issue is there:

```typescript
// packages/frontend/src/services/documentService.ts
// OPTION A: Separate the extended methods into a new file
// documentServiceExtensions.ts

import { documentService } from './documentService';

export const extendedDocumentService = {
  ...documentService,
  
  async createDocument(documentId: string, title?: string, content?: string) {
    // Your implementation
  },
  
  async saveDocument(documentId: string, content: string) {
    // Your implementation
  }
};

// Then in Editor.tsx, import the extended version:
import { extendedDocumentService as documentService } from '../services/documentServiceExtensions';
```

```typescript
// OPTION B: Fix potential circular import in original documentService.ts
// Make sure documentService doesn't import anything that imports it back

class DocumentService {
  private baseUrl: string;
  
  constructor() {
    // Use dynamic import for any dependencies that might cause circles
    this.baseUrl = import.meta.env.VITE_API_URL || '';
  }
  
  // Remove any static imports at the top that could cause circles
  // Move them to dynamic imports inside methods if needed
}

// Export a singleton instance
export const documentService = new DocumentService();
```

### 2.2 Fix the Sanitization Function

Move the sanitization function outside the component to avoid closure issues:

```typescript
// packages/frontend/src/utils/contentSanitizer.ts
export const stripTrackChangesMarkup = (htmlContent: string): string => {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return htmlContent || '';
  }

  try {
    console.log('🧹 Sanitizing content:', htmlContent.length, 'chars');
    
    let cleanContent = htmlContent;
    let passes = 0;
    
    while (passes < 5) {
      const before = cleanContent.length;
      
      // Use function replacement to avoid $ issues
      cleanContent = cleanContent.replace(
        /<span[^>]*(data-track-change|data-user-id|data-timestamp)[^>]*>([\s\S]*?)<\/span>/gi,
        (match, p1, p2) => p2
      );
      
      cleanContent = cleanContent
        .replace(/\s*data-track-change="[^"]*"/gi, '')
        .replace(/\s*data-user-id="[^"]*"/gi, '')
        .replace(/\s*data-user-name="[^"]*"/gi, '')
        .replace(/\s*data-timestamp="[^"]*"/gi, '');
      
      if (cleanContent.length === before) break;
      passes++;
    }
    
    console.log('✅ Sanitized:', htmlContent.length, '→', cleanContent.length, 'chars');
    return cleanContent;
    
  } catch (error) {
    console.error('❌ Sanitization error:', error);
    return htmlContent;
  }
};

// Then in Editor.tsx:
import { stripTrackChangesMarkup } from '../utils/contentSanitizer';
// Remove the useCallback wrapper since it's now a pure function
```

### 2.3 Simplify the Editor Component

Break up the Editor component to reduce complexity:

```typescript
// packages/frontend/src/hooks/useAutoSave.ts
import { useEffect, useRef } from 'react';
import { stripTrackChangesMarkup } from '../utils/contentSanitizer';

export const useAutoSave = (
  editor: any,
  documentId: string,
  documentService: any
) => {
  const lastSavedContentRef = useRef('');
  
  useEffect(() => {
    if (!editor || !documentId) return;
    
    let saveTimeout: NodeJS.Timeout;
    
    const performSave = async () => {
      try {
        const currentContent = editor.getHTML();
        
        if (currentContent === lastSavedContentRef.current) {
          console.log('⏭️ Skipping save - no changes');
          return;
        }
        
        console.log('💾 Saving content...');
        const cleanContent = stripTrackChangesMarkup(currentContent);
        
        await documentService.saveDocument(documentId, cleanContent);
        lastSavedContentRef.current = currentContent;
        
        console.log('✅ Save complete');
      } catch (error) {
        console.error('❌ Save failed:', error);
      }
    };
    
    const scheduleSave = () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(performSave, 2000);
    };
    
    const handleUpdate = () => {
      console.log('📝 Editor updated, scheduling save...');
      scheduleSave();
    };
    
    editor.on('update', handleUpdate);
    
    return () => {
      clearTimeout(saveTimeout);
      editor.off('update', handleUpdate);
    };
  }, [editor, documentId, documentService]);
};
```

---

## Phase 3: Incremental Testing (1 hour)

### 3.1 Test Each Component in Isolation

```javascript
// tests/e2e/incremental-fix-test.spec.js
test.describe('Incremental fix testing', () => {
  test('Step 1: Test without documentService modifications', async ({ page }) => {
    // Temporarily comment out documentService changes
    // Test if editor loads
  });
  
  test('Step 2: Test with sanitization as external function', async ({ page }) => {
    // Move sanitization outside component
    // Test if error persists
  });
  
  test('Step 3: Test with simplified auto-save', async ({ page }) => {
    // Use the extracted hook
    // Test functionality
  });
  
  test('Step 4: Re-enable all features', async ({ page }) => {
    // Gradually re-enable each feature
    // Identify which combination causes the error
  });
});
```

### 3.2 Binary Search for Problem Code

If errors persist, use binary search to find the exact problematic code:

```typescript
// Temporarily comment out half the code in Editor.tsx
// Build and test
// If error gone: problem is in commented section
// If error remains: problem is in uncommented section
// Repeat until you isolate the exact lines
```

---

## Phase 4: Alternative Implementation Strategies

### 4.1 Use a Different Sanitization Approach

If regex issues persist, try DOM-based sanitization:

```typescript
// packages/frontend/src/utils/domSanitizer.ts
export const stripTrackChangesDOM = (htmlContent: string): string => {
  if (typeof window === 'undefined') return htmlContent;
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Remove all elements with track changes
    const trackChangeElements = doc.querySelectorAll('[data-track-change]');
    trackChangeElements.forEach(el => {
      // Move children to parent
      while (el.firstChild) {
        el.parentNode?.insertBefore(el.firstChild, el);
      }
      el.remove();
    });
    
    // Remove attributes
    const elementsWithAttrs = doc.querySelectorAll('[data-user-id], [data-user-name], [data-timestamp]');
    elementsWithAttrs.forEach(el => {
      el.removeAttribute('data-user-id');
      el.removeAttribute('data-user-name');
      el.removeAttribute('data-timestamp');
    });
    
    return doc.body.innerHTML;
  } catch (error) {
    console.error('DOM sanitization failed:', error);
    return htmlContent;
  }
};
```

### 4.2 Server-Side Sanitization Fallback

Add sanitization on the backend as a safety net:

```typescript
// packages/backend/src/services/notesService.ts
const sanitizeContent = (content: string): string => {
  // Simple regex that's less likely to cause bundling issues
  return content
    .replace(/<span[^>]*data-track-change="true"[^>]*>([^<]*)<\/span>/g, '$1')
    .replace(/data-track-change="[^"]*"/g, '')
    .replace(/data-user-id="[^"]*"/g, '')
    .replace(/data-user-name="[^"]*"/g, '');
};

// In updateSharedNote
async updateSharedNote(shareId: string, content: string) {
  const sanitizedContent = sanitizeContent(content);
  return await prisma.document.update({
    where: { shareId },
    data: { content: sanitizedContent }
  });
}
```

---

## Phase 5: Validation and Rollback Strategy

### 5.1 Create a Feature Flag

```typescript
// packages/frontend/src/config/features.ts
export const FEATURES = {
  CONTENT_SANITIZATION: process.env.VITE_ENABLE_SANITIZATION !== 'false',
  ENHANCED_AUTOSAVE: process.env.VITE_ENABLE_ENHANCED_AUTOSAVE !== 'false'
};

// In Editor.tsx
import { FEATURES } from '../config/features';

// Conditionally apply fixes
const contentToSave = FEATURES.CONTENT_SANITIZATION 
  ? stripTrackChangesMarkup(content) 
  : content;
```

### 5.2 Progressive Rollout

1. **Test in development** with all features enabled
2. **Deploy to staging** with feature flags
3. **Enable for specific users** first
4. **Monitor for errors** before full rollout

---

## Immediate Action Items

1. **Right Now**: 
   - Run the initialization diagnosis test to get the full error stack
   - Disable minification temporarily in vite.config.js
   - Check for circular dependencies with madge

2. **Next 30 minutes**:
   - Move stripTrackChangesMarkup to external utility file
   - Remove useCallback wrapper
   - Test if editor loads

3. **If Still Broken**:
   - Comment out all documentService modifications
   - Test with original documentService
   - Gradually add back features

4. **Last Resort**:
   - Implement server-side sanitization only
   - Keep frontend simple
   - Add monitoring to detect if duplication returns

---

## Success Criteria

✅ Editor loads without JavaScript errors  
✅ Content saves to database  
✅ No track changes markup in database  
✅ No text duplication on refresh  
✅ Auto-save works with 2-second interval  
✅ All tests pass  

## Risk Mitigation

- Keep original code in a branch
- Test each change incrementally  
- Have rollback plan ready
- Monitor error logs closely
- Consider phased deployment