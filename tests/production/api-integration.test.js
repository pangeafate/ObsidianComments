const { test, expect } = require('@playwright/test');

// Production API Integration Tests
// These tests will initially fail until we deploy the service

const PRODUCTION_URL = 'https://obsidiancomments.serverado.app';
const API_BASE = `${PRODUCTION_URL}/api`;

test.describe('Production API Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test data if needed
  });

  test('should have healthy backend service', async ({ request }) => {
    // This test will fail until backend is deployed
    const response = await request.get(`${API_BASE}/health`);
    expect(response.status()).toBe(200);
    
    const healthData = await response.json();
    expect(healthData).toHaveProperty('status', 'healthy');
    expect(healthData).toHaveProperty('timestamp');
    expect(healthData).toHaveProperty('services');
  });

  test('should handle CORS for Obsidian plugin', async ({ request }) => {
    // Test CORS headers for plugin integration
    const response = await request.options(`${API_BASE}/notes`);
    expect(response.status()).toBe(200);
    
    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBeTruthy();
    expect(headers['access-control-allow-methods']).toContain('POST');
    expect(headers['access-control-allow-headers']).toContain('content-type');
  });

  test('should create document via Obsidian plugin API', async ({ request }) => {
    // This simulates the Obsidian plugin creating a shared document
    const documentData = {
      title: 'Test Document from Plugin',
      content: '# Test Document\n\nThis is a test document created by the Obsidian plugin.',
      metadata: {
        source: 'obsidian-plugin',
        version: '1.0.0'
      }
    };

    const response = await request.post(`${API_BASE}/notes/share`, {
      data: documentData,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ObsidianCommentsPlugin/1.0.0'
      }
    });

    expect(response.status()).toBe(201);
    
    const result = await response.json();
    expect(result).toHaveProperty('shareId');
    expect(result).toHaveProperty('collaborativeUrl');
    expect(result.collaborativeUrl).toContain(PRODUCTION_URL);
    expect(result.collaborativeUrl).toContain('/editor/');
  });

  test('should retrieve document for collaboration', async ({ request }) => {
    // First create a document
    const createResponse = await request.post(`${API_BASE}/notes/share`, {
      data: {
        title: 'Collaboration Test',
        content: '# Collaboration Test\n\nThis document will be edited collaboratively.'
      }
    });
    
    expect(createResponse.status()).toBe(201);
    const { shareId } = await createResponse.json();

    // Then retrieve it
    const getResponse = await request.get(`${API_BASE}/notes/${shareId}`);
    expect(getResponse.status()).toBe(200);
    
    const document = await getResponse.json();
    expect(document).toHaveProperty('shareId', shareId);
    expect(document).toHaveProperty('title', 'Collaboration Test');
    expect(document).toHaveProperty('content');
    expect(document).toHaveProperty('permissions', 'edit');
  });

  test('should update document content', async ({ request }) => {
    // Create document
    const createResponse = await request.post(`${API_BASE}/notes/share`, {
      data: {
        title: 'Update Test',
        content: '# Original Content'
      }
    });
    
    const { shareId } = await createResponse.json();

    // Update document
    const updateResponse = await request.put(`${API_BASE}/notes/${shareId}`, {
      data: {
        content: '# Updated Content\n\nThis content has been updated.'
      }
    });

    expect(updateResponse.status()).toBe(200);

    // Verify update
    const getResponse = await request.get(`${API_BASE}/notes/${shareId}`);
    const document = await getResponse.json();
    expect(document.content).toContain('Updated Content');
  });

  test('should handle WebSocket connections for real-time collaboration', async ({ page }) => {
    // Test WebSocket connection for real-time editing
    const wsUrl = 'wss://obsidiancomments.serverado.app/ws';
    
    let wsConnected = false;
    let wsError = null;

    await page.evaluate((url) => {
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(url);
        
        ws.onopen = () => {
          resolve('connected');
        };
        
        ws.onerror = (error) => {
          reject(error);
        };
        
        ws.onclose = () => {
          resolve('closed');
        };
        
        // Timeout after 5 seconds
        setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            ws.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 5000);
      });
    }, wsUrl).then(() => {
      wsConnected = true;
    }).catch((error) => {
      wsError = error;
    });

    expect(wsConnected).toBe(true);
    expect(wsError).toBeNull();
  });

  test('should serve frontend application', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    
    // Should not get a 502 or 404 error
    const response = page.response();
    expect(response?.status()).not.toBe(502);
    expect(response?.status()).not.toBe(404);
    
    // Should load the React application
    await expect(page.locator('div[id="root"]')).toBeVisible({ timeout: 10000 });
  });

  test('should load editor page with document ID', async ({ page }) => {
    // Create a document first
    const response = await page.request.post(`${API_BASE}/notes/share`, {
      data: {
        title: 'Frontend Test Document',
        content: '# Frontend Test\n\nThis tests the frontend editor.'
      }
    });
    
    const { shareId } = await response.json();
    
    // Navigate to editor
    await page.goto(`${PRODUCTION_URL}/editor/${shareId}`);
    
    // Should load editor interface
    await expect(page.locator('text=Frontend Test Document')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="editor-content"]')).toBeVisible({ timeout: 10000 });
  });

  test('should handle rate limiting appropriately', async ({ request }) => {
    // Test rate limiting by making many requests
    const promises = [];
    for (let i = 0; i < 15; i++) {
      promises.push(
        request.get(`${API_BASE}/health`).catch(error => ({ error, status: error.status }))
      );
    }
    
    const responses = await Promise.all(promises);
    const rateLimited = responses.some(r => r.status === 429);
    
    // Should implement rate limiting for production
    expect(rateLimited).toBe(true);
  });

  test('should have proper security headers', async ({ request }) => {
    const response = await request.get(PRODUCTION_URL);
    const headers = response.headers();
    
    // Security headers that should be present in production
    expect(headers).toHaveProperty('strict-transport-security');
    expect(headers).toHaveProperty('x-frame-options');
    expect(headers).toHaveProperty('x-content-type-options');
    expect(headers['x-content-type-options']).toBe('nosniff');
  });
});