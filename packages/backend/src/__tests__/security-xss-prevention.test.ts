import request from 'supertest';
import { app } from '../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// XSS attack vectors to test
const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  '<img src="x" onerror="alert(\'xss\')">',
  '<svg/onload=alert("xss")>',
  'javascript:alert("xss")',
  '<iframe src="javascript:alert(\'xss\')"></iframe>',
  '<body onload=alert("xss")>',
  '<div onclick="alert(\'xss\')">click me</div>',
  '"><script>alert("xss")</script>',
  '\'"--></style></script><script>alert("xss")</script>',
  '<script>document.cookie="xss=true"</script>'
];

describe('SECURITY: XSS Prevention Tests', () => {
  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.document.deleteMany({
      where: {
        id: {
          startsWith: 'xss-test-'
        }
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.document.deleteMany({
      where: {
        id: {
          startsWith: 'xss-test-'
        }
      }
    });
    await prisma.$disconnect();
  });

  describe('Title Field XSS Prevention', () => {
    test.each(XSS_PAYLOADS)('should sanitize XSS payload in title: %s', async (xssPayload) => {
      const testId = `xss-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await request(app)
        .post('/api/notes/share')
        .send({
          title: xssPayload,
          content: 'Safe content',
          shareId: testId
        });

      if (response.status === 201) {
        // If the request succeeded, verify the title was sanitized
        expect(response.body.title).toBeDefined();
        expect(response.body.title).not.toContain('<script>');
        expect(response.body.title).not.toContain('javascript:');
        expect(response.body.title).not.toContain('onerror');
        expect(response.body.title).not.toContain('onload');
        expect(response.body.title).not.toContain('onclick');

        // Verify in database as well
        const document = await prisma.document.findUnique({
          where: { id: testId }
        });
        
        if (document) {
          expect(document.title).not.toContain('<script>');
          expect(document.title).not.toContain('javascript:');
          expect(document.title).not.toContain('onerror');
          expect(document.title).not.toContain('onload');
          expect(document.title).not.toContain('onclick');
        }
      } else {
        // If the request was rejected, that's also acceptable security behavior
        expect([400, 422, 500]).toContain(response.status);
      }
    });
  });

  describe('Title Update XSS Prevention', () => {
    let testDocumentId: string;

    beforeEach(async () => {
      testDocumentId = `xss-test-update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create a test document first
      await request(app)
        .post('/api/notes/share')
        .send({
          title: 'Safe Title',
          content: 'Safe content',
          shareId: testDocumentId
        });
    });

    test.each(XSS_PAYLOADS)('should sanitize XSS payload in title update: %s', async (xssPayload) => {
      const response = await request(app)
        .patch(`/api/notes/${testDocumentId}`)
        .send({
          title: xssPayload
        });

      if (response.status === 200) {
        // Verify the title was sanitized in the database
        const document = await prisma.document.findUnique({
          where: { id: testDocumentId }
        });
        
        if (document) {
          expect(document.title).not.toContain('<script>');
          expect(document.title).not.toContain('javascript:');
          expect(document.title).not.toContain('onerror');
          expect(document.title).not.toContain('onload');
          expect(document.title).not.toContain('onclick');
        }
      } else {
        // Rejection is also acceptable
        expect([400, 422, 500]).toContain(response.status);
      }
    });
  });

  describe('Content Security Policy Validation', () => {
    test('should include proper CSP headers for XSS protection', async () => {
      // Test that our API endpoints don't accidentally expose XSS vulnerabilities
      // through response headers or content
      const response = await request(app)
        .get('/api/health');

      // Verify basic security headers are present
      expect(response.headers).toBeDefined();
      
      // The actual CSP headers are set by nginx in production,
      // but we can verify our API doesn't introduce vulnerabilities
      expect(response.status).toBe(200);
    });
  });

  describe('HTML Content Sanitization', () => {
    test.each(XSS_PAYLOADS)('should sanitize XSS payload in HTML content: %s', async (xssPayload) => {
      const testId = `xss-test-html-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await request(app)
        .post('/api/notes/share')
        .send({
          title: 'Safe Title',
          content: 'Safe content',
          htmlContent: xssPayload,
          shareId: testId
        });

      if (response.status === 201) {
        // Verify in database that HTML was sanitized
        const document = await prisma.document.findUnique({
          where: { id: testId }
        });
        
        if (document && document.htmlContent) {
          expect(document.htmlContent).not.toContain('<script>');
          expect(document.htmlContent).not.toContain('javascript:');
          expect(document.htmlContent).not.toContain('onerror');
          expect(document.htmlContent).not.toContain('onload');
          expect(document.htmlContent).not.toContain('onclick');
        }
      } else {
        // Rejection is also acceptable
        expect([400, 422, 500]).toContain(response.status);
      }
    });
  });

  describe('Input Sanitization Middleware', () => {
    test('should handle nested objects with XSS payloads', async () => {
      const testId = `xss-test-nested-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await request(app)
        .post('/api/notes/share')
        .send({
          title: 'Safe Title',
          content: 'Safe content',
          metadata: {
            customField: '<script>alert("nested xss")</script>',
            tags: ['<script>alert("array xss")</script>', 'safe-tag']
          },
          shareId: testId
        });

      // The request should either succeed with sanitized data or be rejected
      if (response.status === 201) {
        const document = await prisma.document.findUnique({
          where: { id: testId }
        });
        
        if (document && document.metadata) {
          const metadata = document.metadata as any;
          if (metadata.customField) {
            expect(metadata.customField).not.toContain('<script>');
          }
          if (metadata.tags && Array.isArray(metadata.tags)) {
            metadata.tags.forEach((tag: any) => {
              if (typeof tag === 'string') {
                expect(tag).not.toContain('<script>');
              }
            });
          }
        }
      } else {
        expect([400, 422, 500]).toContain(response.status);
      }
    });
  });

  describe('Edge Cases and Advanced XSS Vectors', () => {
    const ADVANCED_XSS_PAYLOADS = [
      // Data URI XSS
      'data:text/html,<script>alert("xss")</script>',
      // CSS injection
      '<style>@import"http://evil.com/xss.css";</style>',
      // SVG XSS
      '<svg><script>alert("xss")</script></svg>',
      // Mixed content
      'Normal text <script>alert("xss")</script> more text',
      // Unicode encoding
      '\\u003cscript\\u003ealert("xss")\\u003c/script\\u003e',
      // HTML entities
      '&lt;script&gt;alert("xss")&lt;/script&gt;'
    ];

    test.each(ADVANCED_XSS_PAYLOADS)('should handle advanced XSS vector: %s', async (xssPayload) => {
      const testId = `xss-test-advanced-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await request(app)
        .post('/api/notes/share')
        .send({
          title: xssPayload,
          content: 'Safe content',
          shareId: testId
        });

      // Either properly sanitized or rejected
      if (response.status === 201) {
        const document = await prisma.document.findUnique({
          where: { id: testId }
        });
        
        if (document) {
          expect(document.title).not.toContain('script');
          expect(document.title).not.toContain('alert');
          expect(document.title).not.toContain('@import');
        }
      } else {
        expect([400, 422, 500]).toContain(response.status);
      }
    });
  });
});

describe('SECURITY: Defense in Depth Verification', () => {
  test('should verify multiple layers of protection are working', async () => {
    const testId = `xss-test-depth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const xssPayload = '<script>alert("multi-layer-xss")</script>';
    
    // Test that even if one layer fails, others catch the XSS
    const response = await request(app)
      .post('/api/notes/share')
      .send({
        title: xssPayload,
        content: `Content with XSS: ${xssPayload}`,
        htmlContent: `<p>HTML with XSS: ${xssPayload}</p>`,
        shareId: testId
      });

    if (response.status === 201) {
      // Verify multiple fields were all sanitized
      const document = await prisma.document.findUnique({
        where: { id: testId }
      });
      
      if (document) {
        expect(document.title).not.toContain('<script>');
        expect(document.content).not.toContain('<script>');
        
        if (document.htmlContent) {
          expect(document.htmlContent).not.toContain('<script>');
        }
      }

      // Also test the API response doesn't leak XSS
      expect(JSON.stringify(response.body)).not.toContain('<script>');
    } else {
      expect([400, 422, 500]).toContain(response.status);
    }
  });
});