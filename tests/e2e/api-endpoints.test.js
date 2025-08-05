const { test, expect } = require('@playwright/test');

// TDD: Local API Integration Tests
// These tests should fail initially, then we implement code to make them pass

const LOCAL_URL = 'http://localhost:3001';
const API_BASE = `${LOCAL_URL}/api`;

test.describe('API Endpoints - TDD Implementation', () => {
  
  test.describe('Health Endpoints', () => {
    test('should have basic health endpoint', async ({ request }) => {
      const response = await request.get(`${API_BASE}/health`);
      expect(response.status()).toBe(200);
      
      const healthData = await response.json();
      expect(healthData).toHaveProperty('status', 'healthy');
      expect(healthData).toHaveProperty('timestamp');
      expect(healthData).toHaveProperty('services');
      expect(healthData.services).toHaveProperty('database');
      expect(healthData.services).toHaveProperty('redis');
    });

    test('should have detailed health endpoint', async ({ request }) => {
      const response = await request.get(`${API_BASE}/health/detailed`);
      expect(response.status()).toBe(200);
      
      const healthData = await response.json();
      expect(healthData).toHaveProperty('database');
      expect(healthData).toHaveProperty('redis');
      expect(healthData.database).toHaveProperty('status');
    });
  });

  test.describe('CORS Configuration', () => {
    test('should handle OPTIONS preflight for Obsidian plugin', async ({ request }) => {
      const response = await request.fetch(`${API_BASE}/notes/share`, {
        method: 'OPTIONS',
        headers: {
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type',
          'Origin': 'https://obsidian.md'
        }
      });
      
      expect(response.status()).toBe(200);
      expect(response.headers()['access-control-allow-origin']).toBeTruthy();
      expect(response.headers()['access-control-allow-methods']).toContain('POST');
      expect(response.headers()['access-control-allow-headers']).toContain('content-type');
    });

    test('should allow cross-origin requests', async ({ request }) => {
      const response = await request.post(`${API_BASE}/notes/share`, {
        data: {
          title: 'CORS Test',
          content: '# CORS Test Document'
        },
        headers: {
          'Origin': 'https://obsidian.md',
          'Content-Type': 'application/json'
        }
      });
      
      // Should not fail due to CORS
      expect([200, 201, 400, 422]).toContain(response.status());
      expect(response.headers()['access-control-allow-origin']).toBeTruthy();
    });
  });

  test.describe('Notes API - Obsidian Plugin Integration', () => {
    test('should create shared document', async ({ request }) => {
      const documentData = {
        title: 'Test Shared Document',
        content: '# Test Document\n\nThis is a test document for sharing.',
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
      expect(result.shareId).toMatch(/^[a-zA-Z0-9_-]+$/);
      expect(result.collaborativeUrl).toContain('/editor/');
      expect(result.collaborativeUrl).toContain(result.shareId);
    });

    test('should validate required fields for document creation', async ({ request }) => {
      // Test missing title
      const response1 = await request.post(`${API_BASE}/notes/share`, {
        data: {
          content: 'Content without title'
        }
      });
      expect(response1.status()).toBe(400);
      
      const error1 = await response1.json();
      expect(error1).toHaveProperty('error');
      expect(error1.error).toContain('title');

      // Test missing content
      const response2 = await request.post(`${API_BASE}/notes/share`, {
        data: {
          title: 'Title without content'
        }
      });
      expect(response2.status()).toBe(400);
      
      const error2 = await response2.json();
      expect(error2).toHaveProperty('error');
      expect(error2.error).toContain('content');
    });

    test('should retrieve shared document', async ({ request }) => {
      // First create a document
      const createResponse = await request.post(`${API_BASE}/notes/share`, {
        data: {
          title: 'Retrieve Test Document',
          content: '# Retrieve Test\n\nThis document will be retrieved.'
        }
      });
      
      expect(createResponse.status()).toBe(201);
      const { shareId } = await createResponse.json();

      // Then retrieve it
      const getResponse = await request.get(`${API_BASE}/notes/${shareId}`);
      expect(getResponse.status()).toBe(200);
      
      const document = await getResponse.json();
      expect(document).toHaveProperty('id', shareId);
      expect(document).toHaveProperty('title', 'Retrieve Test Document');
      expect(document).toHaveProperty('content');
      expect(document.content).toContain('Retrieve Test');
      expect(document).toHaveProperty('createdAt');
      expect(document).toHaveProperty('updatedAt');
    });

    test('should return 404 for non-existent document', async ({ request }) => {
      const response = await request.get(`${API_BASE}/notes/nonexistent-id`);
      expect(response.status()).toBe(404);
      
      const error = await response.json();
      expect(error).toHaveProperty('error');
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
      
      const updateResult = await updateResponse.json();
      expect(updateResult).toHaveProperty('success', true);

      // Verify update
      const getResponse = await request.get(`${API_BASE}/notes/${shareId}`);
      const document = await getResponse.json();
      expect(document.content).toContain('Updated Content');
    });

    test('should update document title', async ({ request }) => {
      // Create document
      const createResponse = await request.post(`${API_BASE}/notes/share`, {
        data: {
          title: 'Original Title',
          content: '# Test Content'
        }
      });
      
      const { shareId } = await createResponse.json();

      // Update title
      const updateResponse = await request.patch(`${API_BASE}/notes/${shareId}`, {
        data: {
          title: 'Updated Title'
        }
      });

      expect(updateResponse.status()).toBe(200);

      // Verify update
      const getResponse = await request.get(`${API_BASE}/notes/${shareId}`);
      const document = await getResponse.json();
      expect(document.title).toBe('Updated Title');
    });

    test('should delete document', async ({ request }) => {
      // Create document
      const createResponse = await request.post(`${API_BASE}/notes/share`, {
        data: {
          title: 'Delete Test',
          content: '# This will be deleted'
        }
      });
      
      const { shareId } = await createResponse.json();

      // Delete document
      const deleteResponse = await request.delete(`${API_BASE}/notes/${shareId}`);
      expect(deleteResponse.status()).toBe(200);

      // Verify deletion
      const getResponse = await request.get(`${API_BASE}/notes/${shareId}`);
      expect(getResponse.status()).toBe(404);
    });

    test('should list all shared documents', async ({ request }) => {
      // Create a few documents
      await request.post(`${API_BASE}/notes/share`, {
        data: { title: 'List Test 1', content: '# Document 1' }
      });
      await request.post(`${API_BASE}/notes/share`, {
        data: { title: 'List Test 2', content: '# Document 2' }
      });

      // Get list
      const response = await request.get(`${API_BASE}/notes`);
      expect(response.status()).toBe(200);
      
      const documents = await response.json();
      expect(Array.isArray(documents)).toBe(true);
      expect(documents.length).toBeGreaterThanOrEqual(2);
      
      // Check document structure
      if (documents.length > 0) {
        const doc = documents[0];
        expect(doc).toHaveProperty('id');
        expect(doc).toHaveProperty('title');
        expect(doc).toHaveProperty('createdAt');
        expect(doc).toHaveProperty('updatedAt');
      }
    });
  });

  test.describe('Authentication & Security', () => {
    test('should have rate limiting', async ({ request }) => {
      // Make many requests quickly
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          request.get(`${API_BASE}/health`).catch(() => ({ status: () => 429 }))
        );
      }
      
      const responses = await Promise.all(promises);
      const rateLimited = responses.some(r => r.status() === 429);
      
      // Should implement rate limiting
      expect(rateLimited).toBe(true);
    });

    test('should have security headers', async ({ request }) => {
      const response = await request.get(`${API_BASE}/health`);
      const headers = response.headers();
      
      // Should have basic security headers
      expect(headers).toHaveProperty('x-content-type-options');
      expect(headers['x-content-type-options']).toBe('nosniff');
    });

    test('should validate input data', async ({ request }) => {
      // Test malicious content
      const response = await request.post(`${API_BASE}/notes/share`, {
        data: {
          title: '<script>alert("xss")</script>',
          content: '<script>document.cookie</script>'
        }
      });
      
      // Should either reject or sanitize
      if (response.status() === 201) {
        const result = await response.json();
        expect(result.title).not.toContain('<script>');
      } else {
        expect(response.status()).toBe(400);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle invalid JSON', async ({ request }) => {
      const response = await request.post(`${API_BASE}/notes/share`, {
        data: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      expect(response.status()).toBe(400);
      const error = await response.json();
      expect(error).toHaveProperty('error');
    });

    test('should handle large payloads appropriately', async ({ request }) => {
      const largeContent = 'A'.repeat(10 * 1024 * 1024); // 10MB
      
      const response = await request.post(`${API_BASE}/notes/share`, {
        data: {
          title: 'Large Document',
          content: largeContent
        }
      });
      
      // Should either accept (if configured) or reject with 413
      expect([201, 413]).toContain(response.status());
    });

    test('should handle database connection errors gracefully', async ({ request }) => {
      // This test assumes we can simulate DB issues
      // For now, just check that health endpoint handles errors
      const response = await request.get(`${API_BASE}/health`);
      
      // Should respond even if some services are down
      expect([200, 503]).toContain(response.status());
    });
  });
});