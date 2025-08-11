/**
 * Simple test to debug content loading issue
 */

const { test, expect } = require('@playwright/test');

test('debug content loading in editor', async ({ page }) => {
  // Create test document
  const testContent = 'TEST CONTENT FROM DATABASE';
  const shareId = `debug-${Date.now()}`;
  
  const response = await fetch('https://obsidiancomments.serverado.app/api/notes/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Debug Test',
      content: testContent,
      shareId: shareId
    })
  });
  
  const result = await response.json();
  console.log('Created document:', result.shareId);
  
  // Navigate to editor
  await page.goto(result.collaborativeUrl);
  
  // Set up console logging to see what's happening
  page.on('console', msg => {
    if (msg.text().includes('content') || msg.text().includes('API') || msg.text().includes('Yjs') || msg.text().includes('Loading')) {
      console.log('BROWSER LOG:', msg.text());
    }
  });
  
  // Wait for page load
  await page.waitForTimeout(10000);
  
  // Check what's actually in the editor
  const editorExists = await page.locator('.ProseMirror').count();
  console.log('Editor elements found:', editorExists);
  
  if (editorExists > 0) {
    const editorHTML = await page.locator('.ProseMirror').first().innerHTML();
    const editorText = await page.locator('.ProseMirror').first().textContent();
    
    console.log('Editor HTML:', editorHTML);
    console.log('Editor text:', `"${editorText}"`);
    console.log('Content length:', editorText.length);
    
    // Check if our test content is there
    const hasContent = editorText.includes('TEST CONTENT FROM DATABASE');
    console.log('Has expected content:', hasContent);
  }
  
  // Clean up
  await fetch(`https://obsidiancomments.serverado.app/api/notes/${shareId}`, { method: 'DELETE' });
});