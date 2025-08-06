import request from 'supertest';
import { app } from '../app';

describe('CORS Headers', () => {
  it('should return single Access-Control-Allow-Origin header for Obsidian origin', async () => {
    const response = await request(app)
      .options('/api/notes/share')
      .set('Origin', 'app://obsidian.md')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

    expect(response.status).toBe(200);
    
    // Check that only one Access-Control-Allow-Origin header is present
    const corsHeaders = response.headers['access-control-allow-origin'];
    expect(corsHeaders).toBe('app://obsidian.md');
    
    // Ensure no duplicate or multiple CORS headers
    const headerKeys = Object.keys(response.headers);
    const corsOriginHeaders = headerKeys.filter(key => 
      key.toLowerCase() === 'access-control-allow-origin'
    );
    expect(corsOriginHeaders).toHaveLength(1);
  });

  it('should handle POST request with proper CORS for Obsidian', async () => {
    const response = await request(app)
      .post('/api/notes/share')
      .set('Origin', 'app://obsidian.md')
      .set('Content-Type', 'application/json')
      .send({
        content: '# Test Note\n\nThis is a test.',
        title: 'Test Note'
      });

    // Verify single CORS header in response
    const corsHeaders = response.headers['access-control-allow-origin'];
    expect(corsHeaders).toBe('app://obsidian.md');
    
    // Check for no duplicate headers
    const headerKeys = Object.keys(response.headers);
    const corsOriginHeaders = headerKeys.filter(key => 
      key.toLowerCase() === 'access-control-allow-origin'
    );
    expect(corsOriginHeaders).toHaveLength(1);
  });

  it('should reject requests from non-allowed origins', async () => {
    const response = await request(app)
      .options('/api/notes/share')
      .set('Origin', 'https://malicious-site.com')
      .set('Access-Control-Request-Method', 'POST');

    expect(response.status).toBe(500); // CORS error
  });

  it('should allow requests from allowed web origins', async () => {
    const response = await request(app)
      .options('/api/notes/share')
      .set('Origin', 'https://obsidiancomments.serverado.app')
      .set('Access-Control-Request-Method', 'POST');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('https://obsidiancomments.serverado.app');
  });
});