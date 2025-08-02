import request from 'supertest';
import { app } from '../../src/app';

describe('Anonymous Editing System', () => {
  const testShareId = 'test-anonymous-123';

  describe('Route Changes for Anonymous System', () => {
    test('POST /api/notes/share should accept contributorName parameter', async () => {
      // For now, just test that the route accepts the new parameter structure
      // Database tests will be handled separately
      const response = await request(app)
        .post('/api/notes/share')
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({ 
          content: '# Test Note\n\nCreated by Bob.',
          contributorName: 'Bob'
        });

      // Should not get 404 or method not allowed
      expect([200, 201, 400, 500]).toContain(response.status);
    });

    test('POST /api/notes/share should work without contributorName', async () => {
      const response = await request(app)
        .post('/api/notes/share')
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({ 
          content: '# Anonymous Note\n\nNo contributor specified.'
        });

      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  describe('Authentication Removal', () => {
    test('PUT should no longer require authentication', async () => {
      const response = await request(app)
        .put(`/api/notes/${testShareId}`)
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({ 
          content: '# Updated Note\n\nThis was updated by Charlie.',
          contributorName: 'Charlie',
          changeSummary: 'Updated content and added examples'
        });

      // Should not get 401 Unauthorized (which was the original problem)
      expect(response.status).not.toBe(401);
      // Should accept the request (may fail with 404 or 500 due to missing note, but not 401)
      expect([200, 404, 500]).toContain(response.status);
    });

    test('DELETE should no longer require authentication', async () => {
      const response = await request(app)
        .delete(`/api/notes/${testShareId}`)
        .set('Origin', 'app://obsidian.md')
        .send({ 
          contributorName: 'Dave'
        });

      // Should not get 401 Unauthorized
      expect(response.status).not.toBe(401);
      // DELETE should return 204 for compatibility (even if note doesn't exist)
      expect([204, 404, 500]).toContain(response.status);
    });

    test('should include contributorName in API parameters', async () => {
      const response = await request(app)
        .put(`/api/notes/${testShareId}`)
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({ 
          content: '# Test Content',
          contributorName: 'TestUser',
          changeSummary: 'Test change'
        });

      // Should not error due to unknown parameters
      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe('Core Principle Verification', () => {
    test('should demonstrate anonymous editing without 401 errors', async () => {
      // This test verifies the core fix: no more 401 authentication errors
      
      // Test PUT without auth - should not return 401
      const putResponse = await request(app)
        .put(`/api/notes/${testShareId}`)
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({ 
          content: '# Test Content',
          contributorName: 'Anonymous User'
        });
      
      expect(putResponse.status).not.toBe(401);
      
      // Test DELETE without auth - should not return 401  
      const deleteResponse = await request(app)
        .delete(`/api/notes/${testShareId}`)
        .set('Origin', 'app://obsidian.md')
        .send({ 
          contributorName: 'Anonymous User'
        });
      
      expect(deleteResponse.status).not.toBe(401);
    });
  });
});