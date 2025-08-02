import request from 'supertest';
import { app } from '../../src/app';

describe('Share Routes - Browser Frontend', () => {
  describe('GET /share/:shareId', () => {
    test('should return 404 HTML page for non-existent share', async () => {
      const response = await request(app)
        .get('/share/non-existent-id')
        .expect(404);

      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.text).toContain('<!DOCTYPE html>');
      expect(response.text).toContain('Note not found');
      expect(response.text).toContain('non-existent-id');
    });

    test('should have share route registered', async () => {
      // This test ensures the route is properly registered
      // We expect either 200 (note found) or 404 (note not found)
      // but not 404 with "Cannot GET" which would indicate route not registered
      const response = await request(app)
        .get('/share/test-route-registration');

      // Should not get Express default 404 (which would be different)
      expect([200, 404, 500]).toContain(response.status);
      if (response.status === 404) {
        expect(response.text).toContain('Note not found');
      }
    });
  });
});