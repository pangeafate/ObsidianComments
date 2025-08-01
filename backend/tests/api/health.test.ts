import request from 'supertest';
import { app } from '../../src/app';

describe('Health Check Endpoint', () => {
  describe('GET /api/health', () => {
    test('should return 200 with health status', async () => {
      // This test will FAIL until we implement the health endpoint
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        version: expect.any(String),
        environment: expect.any(String),
      });
    });

    test('should include database status when available', async () => {
      // This test will FAIL until database health check is implemented
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        services: {
          database: expect.objectContaining({
            status: expect.stringMatching(/^(connected|disconnected)$/),
          }),
        },
      });
    });

    test('should not expose sensitive information', async () => {
      // This test will FAIL until security is implemented
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      // Should not contain sensitive data
      expect(response.body).not.toHaveProperty('DATABASE_URL');
      expect(response.body).not.toHaveProperty('JWT_SECRET');
      expect(response.body).not.toHaveProperty('env');
    });
  });
});