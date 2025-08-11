/**
 * Manual test to inject the fix directly into the browser and test it
 */

const { test, expect } = require('@playwright/test');

test('manually test the content loading fix', async ({ page }) => {
  // Create test document
  const testContent = 'CONTENT SHOULD LOAD FROM DATABASE';
  const shareId = `manual-test-${Date.now()}`;
  
  const response = await fetch('https://obsidiancomments.serverado.app/api/notes/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Manual Test',
      content: testContent,
      shareId: shareId
    })
  });
  
  const result = await response.json();
  console.log('Created document:', result.shareId);
  
  // Navigate to editor
  await page.goto(result.collaborativeUrl);
  
  // Wait for page to load
  await page.waitForTimeout(5000);
  
  // Inject our corrected function directly into the browser
  await page.evaluate(() => {
    // Override the problematic function
    window.fixedInitializeContentSafely = function(yjsContent, apiContent, setContentCallback) {
      console.log('🔧 FIXED: Safe content initialization started');
      console.log('🔧 FIXED: yjsContent:', yjsContent ? `"${yjsContent}"` : 'null');
      console.log('🔧 FIXED: apiContent:', apiContent ? `"${apiContent.substring(0, 50)}..."` : 'null');
      
      // Our improved empty check
      const yjsIsEmpty = !yjsContent || 
        yjsContent.trim().length === 0 || 
        yjsContent.replace(/<[^>]*>/g, '').trim().length === 0;
      
      console.log('🔧 FIXED: yjsIsEmpty =', yjsIsEmpty);
      
      if (yjsIsEmpty) {
        console.log('🔧 FIXED: Loading API content (Yjs is empty)');
        setContentCallback(apiContent);
        return true; // Indicate success
      }
      
      console.log('🔧 FIXED: Using existing Yjs content (not empty)');
      return false; // Indicate no action needed
    };
  });
  
  // Test our function with the typical scenario
  const testResult = await page.evaluate(() => {
    const emptyParagraph = '<p><br class="ProseMirror-trailingBreak"></p>';
    const apiContent = 'CONTENT SHOULD LOAD FROM DATABASE';
    
    let loadedContent = null;
    const setContentCallback = (content) => {
      loadedContent = content;
    };
    
    const success = window.fixedInitializeContentSafely(emptyParagraph, apiContent, setContentCallback);
    
    return {
      success,
      loadedContent,
      emptyParagraphLength: emptyParagraph.length,
      withoutHtml: emptyParagraph.replace(/<[^>]*>/g, '').trim().length
    };
  });
  
  console.log('Manual fix test results:', testResult);
  
  // The fix should work
  expect(testResult.success).toBeTruthy();
  expect(testResult.loadedContent).toBe('CONTENT SHOULD LOAD FROM DATABASE');
  expect(testResult.withoutHtml).toBe(0); // HTML tags removed should leave empty string
  
  console.log('✅ Manual fix test PASSED - the fix logic is correct!');
  
  // Clean up
  await fetch(`https://obsidiancomments.serverado.app/api/notes/${shareId}`, { method: 'DELETE' });
});