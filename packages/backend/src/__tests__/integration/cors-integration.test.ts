import request from 'supertest';
import { app } from '../../app';

describe('CORS Integration - Multiple Services', () => {
  it('should not have conflicting CORS headers from multiple services', async () => {
    // Test the actual endpoint that was failing
    const response = await request(app)
      .post('/api/notes/share')
      .set('Origin', 'app://obsidian.md')
      .set('Content-Type', 'application/json')
      .send({
        content: '# Test Note\n\nThis is a test for CORS.',
        title: 'Test CORS Note'
      });

    // Check the response headers for CORS
    const corsOriginHeader = response.headers['access-control-allow-origin'];
    
    // Ensure we get exactly one CORS origin header value
    expect(corsOriginHeader).toBe('app://obsidian.md');
    
    // Verify the header is not an array (which would indicate multiple values)
    expect(Array.isArray(corsOriginHeader)).toBe(false);
    
    // Verify the header doesn't contain multiple comma-separated values
    expect(corsOriginHeader).not.toMatch(/,/);
    expect(corsOriginHeader).not.toContain('*');
    
    // Count headers to ensure no duplicate CORS headers exist
    const allHeaderNames = Object.keys(response.headers).map(h => h.toLowerCase());
    const corsHeaderCount = allHeaderNames.filter(h => h === 'access-control-allow-origin').length;
    expect(corsHeaderCount).toBe(1);
  });

  it('should handle preflight OPTIONS request correctly', async () => {
    const response = await request(app)
      .options('/api/notes/share')
      .set('Origin', 'app://obsidian.md')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('app://obsidian.md');
    expect(response.headers['access-control-allow-methods']).toContain('POST');
    
    // Ensure single CORS header
    const corsOriginHeader = response.headers['access-control-allow-origin'];
    expect(corsOriginHeader).not.toMatch(/,/);
    expect(corsOriginHeader).not.toContain('*');
  });

  it('should reject requests with multiple CORS origin values', async () => {
    // This test ensures our implementation never returns multiple values
    const response = await request(app)
      .post('/api/notes/share')
      .set('Origin', 'app://obsidian.md')
      .send({
        content: '# Test',
        title: 'Test'
      });

    const corsHeader = response.headers['access-control-allow-origin'];
    
    // Should never have comma-separated values like 'app://obsidian.md, *'
    expect(corsHeader).not.toMatch(/^[^,]+,/);
    
    // Should never have multiple values
    const headerValue = Array.isArray(corsHeader) ? corsHeader.join(',') : corsHeader;
    expect(headerValue.split(',').length).toBe(1);
  });
});