import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../__tests__/setup';

describe.skip('POST /api/publish', () => {
  it('should publish a document and return unique ID and URL', async () => {
    const publishData = {
      title: 'Test Document',
      content: '# Test Heading\n\nThis is test content.',
      metadata: {
        tags: ['test', 'markdown'],
        source: 'obsidian',
        publishedBy: 'test-user'
      }
    };

    const response = await request(app)
      .post('/api/publish')
      .send(publishData)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      url: expect.stringMatching(/^https:\/\/obsidiancomments\.lakestrom\.com\/share\/[a-zA-Z0-9_-]+$/),
      publishedAt: expect.any(String)
    });

    // Verify document was created in database
    const document = await prisma.document.findUnique({
      where: { id: response.body.id }
    });

    expect(document).toMatchObject({
      title: publishData.title,
      content: publishData.content,
      metadata: publishData.metadata
    });
  });

  it('should validate required fields', async () => {
    const response = await request(app)
      .post('/api/publish')
      .send({})
      .expect(400);

    expect(response.body).toMatchObject({
      error: 'Validation error',
      details: expect.arrayContaining([
        expect.objectContaining({
          field: 'title',
          message: expect.any(String)
        }),
        expect.objectContaining({
          field: 'content',
          message: expect.any(String)
        })
      ])
    });
  });

  it('should handle invalid metadata gracefully', async () => {
    const publishData = {
      title: 'Test Document',
      content: '# Test Content',
      metadata: 'invalid-metadata'
    };

    const response = await request(app)
      .post('/api/publish')
      .send(publishData)
      .expect(400);

    expect(response.body).toMatchObject({
      error: 'Validation error'
    });
  });

  it('should generate unique IDs for multiple documents', async () => {
    const publishData = {
      title: 'Test Document',
      content: '# Test Content'
    };

    const response1 = await request(app)
      .post('/api/publish')
      .send(publishData)
      .expect(201);

    const response2 = await request(app)
      .post('/api/publish')
      .send(publishData)
      .expect(201);

    expect(response1.body.id).not.toBe(response2.body.id);
    expect(response1.body.url).not.toBe(response2.body.url);
  });
});