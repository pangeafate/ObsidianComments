import request from 'supertest';
import { app } from '../../src/app';

describe('CORS Configuration for Obsidian Plugin', () => {
  describe('Preflight OPTIONS requests', () => {
    test('should handle OPTIONS for POST /api/notes/share from Obsidian', async () => {
      const response = await request(app)
        .options('/api/notes/share')
        .set('Origin', 'app://obsidian.md')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type, Authorization')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('app://obsidian.md');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
      expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
    });

    test('should handle OPTIONS for PUT /api/notes/:token from Obsidian', async () => {
      const response = await request(app)
        .options('/api/notes/test-token')
        .set('Origin', 'app://obsidian.md')
        .set('Access-Control-Request-Method', 'PUT')
        .set('Access-Control-Request-Headers', 'Content-Type, Authorization')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('app://obsidian.md');
      expect(response.headers['access-control-allow-methods']).toContain('PUT');
    });

    test('should handle OPTIONS for DELETE /api/notes/:token from Obsidian', async () => {
      const response = await request(app)
        .options('/api/notes/test-token')
        .set('Origin', 'app://obsidian.md')
        .set('Access-Control-Request-Method', 'DELETE')
        .set('Access-Control-Request-Headers', 'Content-Type, Authorization')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('app://obsidian.md');
      expect(response.headers['access-control-allow-methods']).toContain('DELETE');
    });
  });

  describe('CORS Headers for POST requests', () => {
    test('should include correct CORS headers for POST from Obsidian', async () => {
      const response = await request(app)
        .post('/api/notes/share')
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({ content: '# Test Note\n\nThis should work without auth.' });

      // Even if request fails, CORS headers should be present
      expect(response.headers['access-control-allow-origin']).toBe('app://obsidian.md');
    });
  });

  describe('Anonymous requests (no auth required)', () => {
    test('should allow PUT without auth in anonymous system', async () => {
      const response = await request(app)
        .put('/api/notes/test-token')
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({ 
          content: 'Updated content',
          contributorName: 'Anonymous User'
        });

      // Should not get 401 in anonymous system
      expect(response.status).not.toBe(401);
      expect([200, 404, 500]).toContain(response.status);
    });

    test('should allow DELETE without auth in anonymous system', async () => {
      const response = await request(app)
        .delete('/api/notes/test-token')
        .set('Origin', 'app://obsidian.md')
        .send({ contributorName: 'Anonymous User' });

      // Should not get 401, should return 204 for compatibility
      expect(response.status).not.toBe(401);
      expect([204, 404, 500]).toContain(response.status);
    });
  });
});