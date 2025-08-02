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

  describe('Authenticated requests', () => {
    test('should return 401 for PUT without valid auth', async () => {
      await request(app)
        .put('/api/notes/test-token')
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({ content: 'Updated content' })
        .expect(401);
    });

    test('should return 401 for DELETE without valid auth', async () => {
      await request(app)
        .delete('/api/notes/test-token')
        .set('Origin', 'app://obsidian.md')
        .expect(401);
    });
  });
});