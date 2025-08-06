import request from 'supertest';
import { app } from '../../app';

describe.skip('Obsidian Plugin Integration API', () => {
  describe('POST /api/notes/share', () => {
    it('should create a new shared document and return collaboration URL', async () => {
      const markdown = `# Test Document

This is a test document from Obsidian.

## Features
- Collaborative editing
- Real-time comments
- Track changes`;

      const response = await request(app)
        .post('/api/notes/share')
        .send({ content: markdown })
        .expect(201);

      expect(response.body).toEqual({
        shareUrl: expect.stringMatching(/^https?:\/\/.+\/editor\/[a-zA-Z0-9_-]+$/),
        shareId: expect.any(String),
        createdAt: expect.any(String),
        permissions: 'edit'
      });

      // Verify shareId is a valid document ID format
      expect(response.body.shareId).toMatch(/^[a-zA-Z0-9_-]+$/);
    });

    it('should handle empty content', async () => {
      const response = await request(app)
        .post('/api/notes/share')
        .send({ content: '' })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Content is required',
        code: 'VALIDATION_ERROR'
      });
    });

    it('should handle missing content field', async () => {
      const response = await request(app)
        .post('/api/notes/share')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'Content is required',
        code: 'VALIDATION_ERROR'
      });
    });

    it('should handle very large content', async () => {
      const largeContent = 'A'.repeat(11 * 1024 * 1024); // 11MB

      const response = await request(app)
        .post('/api/notes/share')
        .send({ content: largeContent })
        .expect(413);

      expect(response.body).toEqual({
        error: 'Content too large',
        code: 'PAYLOAD_TOO_LARGE'
      });
    });

    it('should extract title from markdown heading', async () => {
      const markdown = `# My Important Document

Some content here.`;

      const response = await request(app)
        .post('/api/notes/share')
        .send({ content: markdown })
        .expect(201);

      // We'll check this by fetching the document details
      const shareId = response.body.shareId;
      
      const detailsResponse = await request(app)
        .get(`/api/notes/${shareId}`)
        .expect(200);

      expect(detailsResponse.body.title).toBe('My Important Document');
    });
  });

  describe('GET /api/notes/:shareId', () => {
    it('should return document details', async () => {
      // First create a document
      const createResponse = await request(app)
        .post('/api/notes/share')
        .send({ content: '# Test\n\nContent here' })
        .expect(201);

      const shareId = createResponse.body.shareId;

      // Then fetch it
      const response = await request(app)
        .get(`/api/notes/${shareId}`)
        .expect(200);

      expect(response.body).toEqual({
        shareId,
        title: 'Test',
        content: '# Test\n\nContent here',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        permissions: 'edit',
        collaborativeUrl: expect.stringMatching(new RegExp(`^https?:\\/\\/.+\\/editor\\/${shareId}$`))
      });
    });

    it('should return 404 for non-existent document', async () => {
      const response = await request(app)
        .get('/api/notes/non-existent-id')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Shared note not found. It may have been deleted.',
        code: 'NOT_FOUND'
      });
    });
  });

  describe('PUT /api/notes/:shareId', () => {
    it('should update existing document content', async () => {
      // Create document
      const createResponse = await request(app)
        .post('/api/notes/share')
        .send({ content: '# Original\n\nOriginal content' })
        .expect(201);

      const shareId = createResponse.body.shareId;

      // Update it
      const updatedContent = '# Updated Document\n\nThis content has been updated.';
      const response = await request(app)
        .put(`/api/notes/${shareId}`)
        .send({ content: updatedContent })
        .expect(200);

      expect(response.body).toEqual({
        shareId,
        updatedAt: expect.any(String),
        version: expect.any(Number)
      });

      // Verify the update
      const getResponse = await request(app)
        .get(`/api/notes/${shareId}`)
        .expect(200);

      expect(getResponse.body.content).toBe(updatedContent);
      expect(getResponse.body.title).toBe('Updated Document');
    });

    it('should return 404 for non-existent document', async () => {
      const response = await request(app)
        .put('/api/notes/non-existent-id')
        .send({ content: 'Updated content' })
        .expect(404);

      expect(response.body).toEqual({
        error: 'Shared note not found. It may have been deleted.',
        code: 'NOT_FOUND'
      });
    });
  });

  describe('DELETE /api/notes/:shareId', () => {
    it('should delete existing document', async () => {
      // Create document
      const createResponse = await request(app)
        .post('/api/notes/share')
        .send({ content: '# To Delete\n\nThis will be deleted' })
        .expect(201);

      const shareId = createResponse.body.shareId;

      // Delete it
      await request(app)
        .delete(`/api/notes/${shareId}`)
        .expect(204);

      // Verify it's gone
      await request(app)
        .get(`/api/notes/${shareId}`)
        .expect(404);
    });

    it('should return 404 for non-existent document', async () => {
      const response = await request(app)
        .delete('/api/notes/non-existent-id')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Shared note not found. It may have been deleted.',
        code: 'NOT_FOUND'
      });
    });
  });

  describe('GET /api/notes', () => {
    it('should list all shared documents', async () => {
      // Create multiple documents
      await request(app)
        .post('/api/notes/share')
        .send({ content: '# Doc 1\n\nFirst document' });

      await request(app)
        .post('/api/notes/share')
        .send({ content: '# Doc 2\n\nSecond document' });

      const response = await request(app)
        .get('/api/notes')
        .expect(200);

      expect(response.body).toEqual({
        shares: expect.arrayContaining([
          expect.objectContaining({
            shareId: expect.any(String),
            title: expect.any(String),
            shareUrl: expect.stringMatching(/^https?:\/\/.+\/editor\/[a-zA-Z0-9_-]+$/),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            permissions: 'edit',
            views: expect.any(Number),
            editors: expect.any(Number)
          })
        ]),
        total: expect.any(Number)
      });

      expect(response.body.shares.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty list when no documents exist', async () => {
      // This test assumes we can clear the database or run in isolation
      const response = await request(app)
        .get('/api/notes')
        .expect(200);

      expect(response.body).toEqual({
        shares: [],
        total: 0
      });
    });
  });

  describe('GET /api/auth/test', () => {
    it('should return successful auth test', async () => {
      const response = await request(app)
        .get('/api/auth/test')
        .expect(200);

      expect(response.body).toEqual({
        valid: true,
        user: expect.any(Object),
        limits: expect.any(Object)
      });
    });

    it('should work without authentication for now', async () => {
      // Since we don't have auth implemented yet, this should work
      const response = await request(app)
        .get('/api/auth/test')
        .expect(200);

      expect(response.body.valid).toBe(true);
    });
  });

  describe('URL Format Integration', () => {
    it('should generate URLs that work with our frontend routing', async () => {
      const response = await request(app)
        .post('/api/notes/share')
        .send({ content: '# Test\n\nContent' })
        .expect(201);

      const shareUrl = response.body.shareUrl;
      const shareId = response.body.shareId;

      // URL should match our frontend routing pattern
      expect(shareUrl).toMatch(new RegExp(`/editor/${shareId}$`));
      
      // ShareId should be URL-safe
      expect(shareId).toMatch(/^[a-zA-Z0-9_-]+$/);
      expect(shareId.length).toBeGreaterThan(8);
    });
  });
});