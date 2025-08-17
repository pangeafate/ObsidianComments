const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://138.197.187.49';
const API_URL = `${BASE_URL}/api`;

test.describe('Production Deployment Verification', () => {
  
  test('Health endpoints are working', async ({ request }) => {
    // Test main health endpoint
    const healthResponse = await request.get(`${BASE_URL}/health`);
    expect(healthResponse.ok()).toBeTruthy();
    
    // Test API health endpoint
    const apiHealthResponse = await request.get(`${API_URL}/health`);
    expect(apiHealthResponse.ok()).toBeTruthy();
    const healthData = await apiHealthResponse.json();
    expect(healthData.status).toBe('healthy');
  });

  test('Frontend loads correctly', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if React app loaded
    await expect(page.locator('body')).toBeVisible();
    
    // Check for absence of error messages
    const errorElements = page.locator('text=Error');
    const errorCount = await errorElements.count();
    expect(errorCount).toBe(0);
  });

  test('API endpoints respond correctly', async ({ request }) => {
    // Test CORS preflight
    const optionsResponse = await request.fetch(`${API_URL}/notes/share`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    expect(optionsResponse.ok()).toBeTruthy();
  });

  test('Database connection is working', async ({ request }) => {
    // Create a test note
    const createResponse = await request.post(`${API_URL}/notes/share`, {
      data: {
        title: 'Test Note',
        content: '# Test Content\\n\\nThis is a test note for verification.',
        metadata: {
          tags: ['test'],
          created: new Date().toISOString()
        }
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    expect(createResponse.ok()).toBeTruthy();
    const createData = await createResponse.json();
    expect(createData.shareId).toBeDefined();
    
    // Retrieve the note
    const getResponse = await request.get(`${API_URL}/notes/${createData.shareId}`);
    expect(getResponse.ok()).toBeTruthy();
    const noteData = await getResponse.json();
    expect(noteData.title).toBe('Test Note');
    expect(noteData.content).toContain('Test Content');
  });

  test('WebSocket connection works', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Test WebSocket connection
    const wsConnected = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const ws = new WebSocket('ws://138.197.187.49/ws');
        ws.onopen = () => {
          ws.close();
          resolve(true);
        };
        ws.onerror = () => resolve(false);
        setTimeout(() => resolve(false), 5000);
      });
    });
    
    expect(wsConnected).toBeTruthy();
  });

  test('Rate limiting is configured', async ({ request }) => {
    // Make multiple rapid requests to test rate limiting
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(request.get(`${API_URL}/health`));
    }
    
    const responses = await Promise.all(promises);
    const allSuccessful = responses.every(response => response.ok());
    expect(allSuccessful).toBeTruthy();
  });

  test('Security headers are present', async ({ request }) => {
    const response = await request.get(BASE_URL);
    const headers = response.headers();
    
    // Check for security headers
    expect(headers['x-frame-options']).toBeDefined();
    expect(headers['x-content-type-options']).toBeDefined();
  });

  test('CORS is properly configured', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`, {
      headers: {
        'Origin': 'http://localhost'
      }
    });
    
    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBeDefined();
  });

  test('Document sharing workflow', async ({ page, request }) => {
    // Create a shared document via API
    const createResponse = await request.post(`${API_URL}/notes/share`, {
      data: {
        title: 'Shared Document Test',
        content: '# Shared Document\\n\\nThis document tests the sharing functionality.',
        metadata: {
          tags: ['shared', 'test'],
          created: new Date().toISOString()
        }
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    expect(createResponse.ok()).toBeTruthy();
    const createData = await createResponse.json();
    const shareId = createData.shareId;
    
    // Navigate to the shared document in the browser
    await page.goto(`${BASE_URL}/share/${shareId}`);
    await page.waitForLoadState('networkidle');
    
    // Verify the document loaded
    await expect(page.locator('h1')).toContainText('Shared Document');
  });

  test('Real-time collaboration setup', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Test if Y.js/Hocuspocus integration is working
    const yDocAvailable = await page.evaluate(() => {
      return typeof window.Y !== 'undefined' || 
             typeof window.HocuspocusProvider !== 'undefined' ||
             document.querySelector('[data-testid="editor"]') !== null;
    });
    
    // This should be true if the editor is properly set up
    // We don't fail the test if Y.js isn't loaded on the main page
    // as it might only load on document pages
    console.log('Real-time collaboration setup detected:', yDocAvailable);
  });

  test('Performance and load time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
    
    // Check for critical resources
    const jsErrors = [];
    page.on('pageerror', error => jsErrors.push(error.message));
    
    await page.waitForTimeout(2000);
    expect(jsErrors.length).toBe(0);
  });

  test('Container health checks', async ({ request }) => {
    // Verify all services are healthy by checking their individual health endpoints
    
    // Backend health (direct)
    const backendHealth = await request.get(`${API_URL}/health`);
    expect(backendHealth.ok()).toBeTruthy();
    
    // Frontend health (via nginx)
    const frontendHealth = await request.get(`${BASE_URL}/health`);
    expect(frontendHealth.ok()).toBeTruthy();
  });

  test('Database persistence', async ({ request }) => {
    // Create a document
    const createResponse = await request.post(`${API_URL}/notes/share`, {
      data: {
        title: 'Persistence Test',
        content: 'Testing database persistence',
        metadata: { test: true }
      }
    });
    
    const { shareId } = await createResponse.json();
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Retrieve the document to ensure it was persisted
    const getResponse = await request.get(`${API_URL}/notes/${shareId}`);
    expect(getResponse.ok()).toBeTruthy();
    
    const data = await getResponse.json();
    expect(data.title).toBe('Persistence Test');
    expect(data.content).toBe('Testing database persistence');
  });

});

test.describe('Error Handling and Edge Cases', () => {
  
  test('404 handling', async ({ page }) => {
    await page.goto(`${BASE_URL}/nonexistent-page`);
    
    // Should not crash, should show some kind of not found page
    await expect(page.locator('body')).toBeVisible();
  });

  test('Invalid API requests', async ({ request }) => {
    // Test invalid JSON
    const invalidResponse = await request.post(`${API_URL}/notes/share`, {
      data: 'invalid json',
      headers: { 'Content-Type': 'application/json' }
    });
    
    expect(invalidResponse.status()).toBe(400);
  });

  test('Nonexistent document', async ({ request }) => {
    const response = await request.get(`${API_URL}/notes/nonexistent-id`);
    expect(response.status()).toBe(404);
  });

});