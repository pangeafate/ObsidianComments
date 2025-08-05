# Step-by-Step Fix Implementation Guide

## Quick Diagnosis Commands

First, run these in your browser console while on the editor page:

```javascript
// Check if content is being saved
window.editorDebug?.checkContent();

// Check if sanitization function exists
console.log('stripTrackChangesMarkup exists:', typeof window.stripTrackChangesMarkup);

// Monitor fetch calls
const originalFetch = window.fetch;
window.fetch = (...args) => {
  console.log('Fetch called:', args[0], args[1]?.method);
  return originalFetch(...args);
};
```

## Implementation Steps

### Step 1: Verify the Sanitization Function Location

The `stripTrackChangesMarkup` function needs to be in the correct scope. Update your `Editor.tsx`:

```typescript
// At the top level of Editor.tsx, outside the component
const stripTrackChangesMarkup = (htmlContent: string): string => {
  // CRITICAL: Add error handling
  if (!htmlContent || typeof htmlContent !== 'string') {
    console.warn('Invalid input to stripTrackChangesMarkup:', typeof htmlContent);
    return htmlContent || '';
  }

  try {
    console.log(`🧹 Sanitizing content: ${htmlContent.length} chars`);
    
    let cleanContent = htmlContent;
    let passes = 0;
    
    // Keep cleaning until no more changes
    while (passes < 5) {
      const before = cleanContent.length;
      
      // Remove ALL span variations with track changes
      cleanContent = cleanContent.replace(
        /<span[^>]*(data-track-change|data-user-id|data-timestamp)[^>]*>([\s\S]*?)<\/span>/gi,
        '$2'
      );
      
      // Remove attributes
      cleanContent = cleanContent
        .replace(/\s*data-track-change="[^"]*"/gi, '')
        .replace(/\s*data-user-id="[^"]*"/gi, '')
        .replace(/\s*data-user-name="[^"]*"/gi, '')
        .replace(/\s*data-timestamp="[^"]*"/gi, '');
      
      if (cleanContent.length === before) break;
      passes++;
    }
    
    console.log(`✅ Sanitized: ${htmlContent.length} → ${cleanContent.length} chars (${passes} passes)`);
    return cleanContent;
    
  } catch (error) {
    console.error('❌ Sanitization error:', error);
    return htmlContent; // Don't break saving
  }
};
```

### Step 2: Fix the Auto-save Implementation

Find your auto-save effect and update it:

```typescript
// In your Editor component
useEffect(() => {
  if (!editor || !documentId) return;

  let saveTimeout: NodeJS.Timeout;
  let lastSavedContent = '';

  const performSave = async () => {
    try {
      const currentContent = editor.getHTML();
      
      // Skip if content hasn't changed
      if (currentContent === lastSavedContent) {
        console.log('⏭️ Skipping save - no changes');
        return;
      }

      console.log('💾 Saving content...');
      
      // CRITICAL: Sanitize before saving
      const cleanContent = stripTrackChangesMarkup(currentContent);
      
      // Log what we're saving
      console.log({
        originalLength: currentContent.length,
        cleanLength: cleanContent.length,
        hasTrackChanges: currentContent.includes('data-track-change'),
        cleanHasTrackChanges: cleanContent.includes('data-track-change')
      });

      await documentService.saveDocument(documentId, cleanContent);
      lastSavedContent = currentContent; // Track original to detect changes
      
      console.log('✅ Save complete');
    } catch (error) {
      console.error('❌ Save failed:', error);
      // Don't update lastSavedContent on failure
    }
  };

  // Debounced save
  const scheduleSave = () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(performSave, 2000);
  };

  // Listen for changes
  const handleUpdate = () => {
    console.log('📝 Editor updated, scheduling save...');
    scheduleSave();
  };

  editor.on('update', handleUpdate);

  return () => {
    clearTimeout(saveTimeout);
    editor.off('update', handleUpdate);
  };
}, [editor, documentId]);
```

### Step 3: Fix Content Initialization

Update your `checkAndLoadDocument` function:

```typescript
const checkAndLoadDocument = useCallback(async () => {
  if (!documentId || !editor) return;

  try {
    setIsInitializing(true);

    const exists = await documentService.checkDocumentExists(documentId);
    
    if (!exists) {
      await documentService.createDocument(documentId, DEFAULT_CONTENT);
    }

    const doc = await documentService.loadDocument(documentId);
    
    // CRITICAL: Check if Yjs already has content
    const yjsContent = yXmlFragment?.toString() || '';
    const yjsHasContent = yjsContent.length > 50; // More than just wrapper tags

    if (yjsHasContent) {
      console.log('✅ Using Yjs content, skipping API content');
      return;
    }

    // CRITICAL: Sanitize content before loading
    const cleanContent = stripTrackChangesMarkup(doc.content || DEFAULT_CONTENT);
    
    console.log('📄 Loading content:', {
      apiLength: doc.content?.length || 0,
      cleanLength: cleanContent.length,
      hadTrackChanges: doc.content?.includes('data-track-change') || false
    });

    // Set content in editor
    editor.commands.setContent(cleanContent);

  } catch (error) {
    console.error('Document load error:', error);
  } finally {
    setIsInitializing(false);
  }
}, [documentId, editor, yXmlFragment]);
```

### Step 4: Add Save Interception (Debug Mode)

Add this to catch ALL save attempts:

```typescript
// In your documentService.ts
const originalSaveDocument = saveDocument;

export const saveDocument = async (docId: string, content: string) => {
  console.group('🔍 Save Intercepted');
  console.log('Call stack:', new Error().stack?.split('\n').slice(2, 4).join('\n'));
  console.log('Content length:', content.length);
  console.log('Has track changes:', content.includes('data-track-change'));
  
  // ALWAYS sanitize, regardless of caller
  const cleanContent = content.includes('data-track-change') 
    ? stripTrackChangesMarkup(content) 
    : content;
  
  console.log('Clean content length:', cleanContent.length);
  console.groupEnd();
  
  return originalSaveDocument(docId, cleanContent);
};
```

### Step 5: Add Startup Diagnostics

Add this at the beginning of your Editor component:

```typescript
useEffect(() => {
  // Run diagnostics on mount
  console.group('🚀 Editor Startup Diagnostics');
  console.log('Document ID:', documentId);
  console.log('Editor exists:', !!editor);
  console.log('Yjs connected:', provider?.connected);
  console.log('stripTrackChangesMarkup available:', typeof stripTrackChangesMarkup);
  
  // Make functions available for debugging
  if (typeof window !== 'undefined') {
    (window as any).editorFunctions = {
      stripTrackChangesMarkup,
      getEditorContent: () => editor?.getHTML(),
      getCleanContent: () => stripTrackChangesMarkup(editor?.getHTML() || ''),
      forceSave: async () => {
        const content = editor?.getHTML() || '';
        const clean = stripTrackChangesMarkup(content);
        console.log('Force saving:', { original: content.length, clean: clean.length });
        return documentService.saveDocument(documentId, clean);
      }
    };
  }
  
  console.groupEnd();
}, [editor, documentId, provider]);
```

## Testing the Fix

1. **Open browser console**
2. **Navigate to editor**
3. **Type some text**
4. **Watch console for save logs**
5. **Run**: `window.editorFunctions.getCleanContent()`
6. **Refresh page**
7. **Check if content duplicated**

## If Still Not Working

Run this diagnostic in console:

```javascript
// Full diagnostic
(async () => {
  const content = window.editorFunctions?.getEditorContent() || 'No editor';
  const clean = window.editorFunctions?.getCleanContent() || 'No function';
  
  console.log('=== DIAGNOSTIC REPORT ===');
  console.log('Editor content length:', content.length);
  console.log('Clean content length:', clean.length);
  console.log('Track changes found:', (content.match(/data-track-change/g) || []).length);
  console.log('Functions available:', Object.keys(window.editorFunctions || {}));
  
  // Try manual save
  if (window.editorFunctions?.forceSave) {
    console.log('Attempting force save...');
    try {
      await window.editorFunctions.forceSave();
      console.log('✅ Force save succeeded');
    } catch (e) {
      console.error('❌ Force save failed:', e);
    }
  }
})();
```

## Common Issues and Solutions

### Issue: "No saving at all"
- Check browser console for errors
- Verify API endpoints are correct
- Check Network tab for failed requests
- Ensure `documentService.saveDocument` is being called

### Issue: "Duplication returns"
- Sanitization function not being called
- Content loaded before sanitization
- Multiple save paths bypassing sanitization
- Track changes being reapplied after load

### Issue: "Works locally but not in production"
- Environment-specific configuration
- Different track changes behavior
- Timing differences in initialization
- CDN or caching issues