import request from 'supertest';
import { app } from '../app';

describe('CORS Fix Verification', () => {
  it('should handle Obsidian CORS requests correctly', async () => {
    // Test both preflight and actual request scenarios
    const preflightResponse = await request(app)
      .options('/api/notes/share')
      .set('Origin', 'app://obsidian.md')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

    expect(preflightResponse.status).toBe(200);
    
    // Verify single CORS header
    const corsHeader = preflightResponse.headers['access-control-allow-origin'];
    expect(corsHeader).toBe('app://obsidian.md');
    
    // Ensure no multiple values
    expect(typeof corsHeader).toBe('string');
    expect(corsHeader).not.toContain(',');
    expect(corsHeader).not.toContain('*');
  });

  it('should prevent CORS header duplication', async () => {
    const response = await request(app)
      .post('/api/notes/share')
      .set('Origin', 'app://obsidian.md')
      .set('Content-Type', 'application/json')
      .send({
        content: '# Test CORS Fix\n\nThis tests the CORS fix deployment.',
        title: 'CORS Fix Test'
      });

    // Check that we get a response (may be 401/500 due to auth/db issues)
    expect([200, 201, 401, 500]).toContain(response.status);
    
    // The key test: ensure single CORS header
    const corsOrigin = response.headers['access-control-allow-origin'];
    expect(corsOrigin).toBeDefined();
    
    // Must be single value, not multiple
    if (typeof corsOrigin === 'string') {
      expect(corsOrigin).not.toMatch(/,/);
      expect(corsOrigin).toBe('app://obsidian.md');
    } else {
      // Should never be an array (indicates multiple headers)
      expect(Array.isArray(corsOrigin)).toBe(false);
    }
  });

  it('should handle web origin CORS correctly', async () => {
    const response = await request(app)
      .options('/api/notes/share')
      .set('Origin', 'https://obsidiancomments.serverado.app')
      .set('Access-Control-Request-Method', 'POST');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('https://obsidiancomments.serverado.app');
    
    // Should not have multiple values
    const corsHeader = response.headers['access-control-allow-origin'];
    expect(typeof corsHeader).toBe('string');
    expect(corsHeader).not.toContain(',');
  });
});