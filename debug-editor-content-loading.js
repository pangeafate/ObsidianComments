/**
 * Debug script to test the content loading flow in editing mode
 */

// Test the current contentDeduplication logic
function initializeContentSafely(yjsContent, apiContent, setContentCallback) {
  console.log('🛡️ Safe content initialization started');
  console.log('📊 Inputs:', {
    yjsContent: yjsContent ? `"${yjsContent}"` : 'null',
    yjsContentLength: yjsContent ? yjsContent.length : 0,
    apiContent: apiContent ? `"${apiContent.substring(0, 100)}..."` : 'null',
    apiContentLength: apiContent ? apiContent.length : 0
  });
  
  // Check if Yjs content is effectively empty (just has empty paragraph tags)
  const yjsIsEmpty = !yjsContent || 
    yjsContent.trim().length === 0 || 
    yjsContent.replace(/<[^>]*>/g, '').trim().length === 0; // Remove HTML tags and check
  
  console.log('🔍 Empty check results:', {
    yjsIsEmpty,
    yjsHasContent: !!yjsContent,
    yjsTrimmedLength: yjsContent ? yjsContent.trim().length : 0,
    yjsWithoutHtmlLength: yjsContent ? yjsContent.replace(/<[^>]*>/g, '').trim().length : 0
  });
  
  if (yjsIsEmpty) {
    // Yjs is empty, use API content
    console.log('📝 Using API content (Yjs is empty)');
    console.log('✅ DECISION: Load content from database');
    setContentCallback(apiContent);
    return;
  }
  
  console.log('✅ DECISION: Use existing Yjs content (not empty)');
  // Yjs content is good, use it (no callback needed)
}

console.log('🧪 Testing content loading scenarios...\n');

// Scenario 1: Fresh editor (empty paragraph)
console.log('=== Scenario 1: Fresh Editor (typical case) ===');
const emptyParagraph = '<p><br class="ProseMirror-trailingBreak"></p>';
const apiContent1 = `This is the content from the database.

## Section 1
Some database content here.

1. Database item 1
2. Database item 2`;

let loadedContent1 = null;
initializeContentSafely(emptyParagraph, apiContent1, (content) => {
  loadedContent1 = content;
});
console.log('Result:', loadedContent1 ? 'SUCCESS - API content loaded' : 'FAILED - No content loaded');
console.log();

// Scenario 2: Completely empty editor
console.log('=== Scenario 2: Completely Empty Editor ===');
let loadedContent2 = null;
initializeContentSafely('', apiContent1, (content) => {
  loadedContent2 = content;
});
console.log('Result:', loadedContent2 ? 'SUCCESS - API content loaded' : 'FAILED - No content loaded');
console.log();

// Scenario 3: Editor with actual content (should NOT load from API)
console.log('=== Scenario 3: Editor with Existing Content ===');
const existingContent = '<p>User has already typed something here</p>';
let loadedContent3 = null;
initializeContentSafely(existingContent, apiContent1, (content) => {
  loadedContent3 = content;
});
console.log('Result:', loadedContent3 ? 'LOADED - ' + loadedContent3.substring(0, 50) : 'CORRECTLY NOT LOADED - existing content preserved');
console.log();

console.log('🎯 Summary:');
console.log('- Fresh editor (empty paragraph): ', loadedContent1 ? '✅ WORKS' : '❌ BROKEN');
console.log('- Completely empty editor: ', loadedContent2 ? '✅ WORKS' : '❌ BROKEN');
console.log('- Editor with content: ', !loadedContent3 ? '✅ WORKS' : '❌ BROKEN (overwrote content)');