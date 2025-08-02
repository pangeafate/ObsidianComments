import request from 'supertest';
import { app } from '../../src/app';

describe('Plugin Authentication Flow', () => {
  const testShareId = 'test-share-id-123';

  describe('Current behavior (failing tests)', () => {
    test('PUT should fail without authentication (current 401 error)', async () => {
      await request(app)
        .put(`/api/notes/${testShareId}`)
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({ content: '# Updated Note\n\nThis should fail without auth.' })
        .expect(401);
    });

    test('DELETE should fail without authentication (current 401 error)', async () => {
      await request(app)
        .delete(`/api/notes/${testShareId}`)
        .set('Origin', 'app://obsidian.md')
        .expect(401);
    });
  });

  describe('Plugin needs temporary auth for edit/delete', () => {
    test('should return correct error message for PUT without auth', async () => {
      const response = await request(app)
        .put(`/api/notes/${testShareId}`)
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .send({ content: '# Updated Note\n\nThis should fail without auth.' })
        .expect(401);

      expect(response.body.error).toBe('Authentication required for editing');
    });

    test('should return correct error message for DELETE without auth', async () => {
      const response = await request(app)
        .delete(`/api/notes/${testShareId}`)
        .set('Origin', 'app://obsidian.md')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    test('plugin needs valid auth token for edit operations', async () => {
      // Test that the plugin can theoretically work with proper auth
      // For now, we just verify the auth middleware is working correctly
      const response = await request(app)
        .put(`/api/notes/${testShareId}`)
        .set('Origin', 'app://obsidian.md')
        .set('Authorization', 'Bearer invalid-token')
        .set('Content-Type', 'application/json')
        .send({ content: '# Updated Note' })
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });
  });
});