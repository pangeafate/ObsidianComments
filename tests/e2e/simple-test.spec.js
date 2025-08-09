const { test, expect } = require('@playwright/test');

test.describe('Simple Test - Document Creation Flow', () => {
  test('Create document via API then load via browser', async ({ page, request }) => {
    // Step 1: Create document via API
    const documentId = 'simple-test-' + Date.now();
    console.log(`📝 Creating document: ${documentId}`);
    
    const createResponse = await request.post('/api/notes/share', {
      data: {
        title: 'Simple Test Document',
        content: '# Simple Test Document\n\nThis is a simple test document content.',
        shareId: documentId
      }
    });
    
    expect(createResponse.status()).toBe(201);
    const createResult = await createResponse.json();
    console.log('✅ Document created:', createResult.shareId);
    
    // Step 2: Verify document exists via API
    const getResponse = await request.get(`/api/notes/${documentId}`);
    expect(getResponse.status()).toBe(200);
    const document = await getResponse.json();
    console.log('✅ Document retrieved:', document.title);
    
    // Step 3: Load document in browser
    console.log(`🌐 Loading document in browser: /editor/${documentId}`);
    
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('❌ Console error:', msg.text());
        errors.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      console.error('❌ Page error:', error.message);
      errors.push(error.message);
    });
    
    await page.goto(`/editor/${documentId}`);
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for any async operations
    await page.waitForTimeout(3000);
    
    console.log(`📊 Total errors found: ${errors.length}`);
    if (errors.length > 0) {
      console.error('❌ Errors during page load:', errors);
    }
    
    // Check if page loaded successfully
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    // Check if React app mounted
    const rootElement = await page.locator('#root').count();
    console.log('⚛️ React root elements found:', rootElement);
    
    if (errors.length > 0) {
      console.warn('⚠️ Page loaded with errors, investigating...');
      // Don't fail immediately, let's see what we can learn
    } else {
      console.log('✅ Page loaded successfully without errors');
    }
    
    expect(errors).toHaveLength(0);
  });
});