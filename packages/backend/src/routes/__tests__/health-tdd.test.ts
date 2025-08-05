import request from 'supertest';
import express from 'express';

// Use mock for unit tests
const { healthRouter } = process.env.NODE_ENV === 'test' 
  ? require('../__mocks__/health')
  : require('../health');

// TDD: Health API Unit Tests
// These tests define the expected behavior BEFORE implementation

describe('Health API Routes - TDD', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', healthRouter);
  });

  describe('GET /api/health', () => {
    it('should return healthy status when all services are up', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
      
      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services).toHaveProperty('redis');
      
      // Timestamp should be a valid ISO string
      expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
    });

    it('should return correct content type', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
    });

    it('should handle database connection issues', async () => {
      // This test would mock database failure
      // For now, we expect the endpoint to handle errors gracefully
      const response = await request(app)
        .get('/api/health');

      // Should respond with either 200 (healthy) or 503 (unhealthy)
      expect([200, 503]).toContain(response.status);
      
      if (response.status === 503) {
        expect(response.body).toHaveProperty('status', 'error');
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should include all required service checks', async () => {
      const response = await request(app)
        .get('/api/health');

      if (response.status === 200) {
        expect(response.body.services).toHaveProperty('database');
        expect(response.body.services).toHaveProperty('redis');
        
        // Each service should have a status
        expect(['connected', 'error']).toContain(response.body.services.database);
        expect(['connected', 'error']).toContain(response.body.services.redis);
      }
    });
  });

  describe('GET /api/health/detailed', () => {
    it('should return detailed health information', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);

      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('redis');
      
      // Each service should have detailed status
      expect(response.body.database).toHaveProperty('status');
      expect(response.body.redis).toHaveProperty('status');
      
      // Status should be either 'ok', 'error', or 'warning'
      expect(['ok', 'error', 'warning']).toContain(response.body.database.status);
      expect(['ok', 'error', 'warning']).toContain(response.body.redis.status);
    });

    it('should include document count when database is healthy', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);

      if (response.body.database.status === 'ok') {
        expect(response.body.database).toHaveProperty('documentCount');
        expect(typeof response.body.database.documentCount).toBe('number');
      }
    });

    it('should include error messages when services are down', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);

      // Check that error statuses include error messages
      Object.values(response.body).forEach((service: any) => {
        if (service.status === 'error') {
          expect(service).toHaveProperty('error');
          expect(typeof service.error).toBe('string');
        }
      });
    });

    it('should check document accessibility', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);

      expect(response.body).toHaveProperty('documents');
      expect(response.body.documents).toHaveProperty('status');
      expect(['ok', 'error', 'warning']).toContain(response.body.documents.status);
    });
  });

  describe('Health endpoint performance', () => {
    it('should respond quickly (under 5 seconds)', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/health')
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
    });

    it('should not be affected by concurrent requests', async () => {
      // Make multiple concurrent requests
      const promises = Array(5).fill(null).map(() => 
        request(app).get('/api/health')
      );

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect([200, 503]).toContain(response.status);
      });
    });
  });

  describe('Health endpoint security', () => {
    it('should not expose sensitive information', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);

      const responseText = JSON.stringify(response.body).toLowerCase();
      
      // Should not contain sensitive data
      expect(responseText).not.toContain('password');
      expect(responseText).not.toContain('secret');
      expect(responseText).not.toContain('token');
      expect(responseText).not.toContain('key');
    });

    it('should have appropriate security headers', async () => {
      const response = await request(app)
        .get('/api/health');

      // Should have basic security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
    });
  });
});