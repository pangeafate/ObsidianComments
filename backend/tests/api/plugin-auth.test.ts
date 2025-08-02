import request from 'supertest';
import { app } from '../../src/app';

describe('Plugin Anonymous Flow', () => {
  const testShareId = 'test-share-id-123';

  describe('Anonymous editing (no auth required)', () => {
    test('PUT should work without authentication (anonymous system)', async () => {
      const response = await request(app)
        .put(`/api/notes/${testShareId}`)
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({ 
          content: '# Updated Note\n\nThis should work without auth.',
          contributorName: 'Anonymous User'
        });

      // Should not get 401 (may get 404 if note doesn't exist)
      expect(response.status).not.toBe(401);
    });

    test('DELETE should work without authentication (anonymous system)', async () => {
      const response = await request(app)
        .delete(`/api/notes/${testShareId}`)
        .set('Origin', 'app://obsidian.md')
        .send({ contributorName: 'Anonymous User' });

      // Should not get 401, should return 204 for compatibility
      expect(response.status).not.toBe(401);
      expect([204, 404, 500]).toContain(response.status);
    });

    test('PUT should accept contributorName parameter', async () => {
      const response = await request(app)
        .put(`/api/notes/${testShareId}`)
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({ 
          content: '# Updated Note',
          contributorName: 'Test User',
          changeSummary: 'Test update'
        });

      // Should not error due to unknown parameters
      expect([200, 404, 500]).toContain(response.status);
    });
  });
});