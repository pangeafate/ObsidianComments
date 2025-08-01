import request from 'supertest';
import { app } from '../../src/app';

describe('Notes API Endpoints', () => {
  describe('POST /api/notes/share', () => {
    test('should create a new share with valid content', async () => {
      // This test will FAIL until share endpoint is implemented
      const noteContent = '# Test Note\n\nThis is a test note for sharing.';
      
      const response = await request(app)
        .post('/api/notes/share')
        .send({ content: noteContent })
        .set('Authorization', 'Bearer test-token')
        .expect(201);

      expect(response.body).toMatchObject({
        shareId: expect.any(String),
        shareUrl: expect.stringContaining('http'),
        createdAt: expect.any(String),
      });
      
      // Share ID should be alphanumeric
      expect(response.body.shareId).toMatch(/^[a-zA-Z0-9]+$/);
      
      // URL should contain the share ID
      expect(response.body.shareUrl).toContain(response.body.shareId);
    });

    test('should reject share without authentication', async () => {
      // This test will FAIL until auth middleware is implemented
      const response = await request(app)
        .post('/api/notes/share')
        .send({ content: 'Test content' })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Authentication required',
      });
    });

    test('should validate note size limit', async () => {
      // This test will FAIL until validation is implemented
      const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
      
      const response = await request(app)
        .post('/api/notes/share')
        .send({ content: largeContent })
        .set('Authorization', 'Bearer test-token')
        .expect(413); // Express sends 413 for payload too large

      // Express handles this at the middleware level
      expect(response.body).toMatchObject({
        error: 'request entity too large',
      });
    });

    test('should handle empty content', async () => {
      // This test will FAIL until validation is implemented
      const response = await request(app)
        .post('/api/notes/share')
        .send({ content: '' })
        .set('Authorization', 'Bearer test-token')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Note content cannot be empty',
      });
    });
  });

  describe('GET /api/notes/:token', () => {
    const testShareId = 'test-share-123';
    
    test('should retrieve shared note by token', async () => {
      // This test will FAIL until get endpoint is implemented
      const response = await request(app)
        .get(`/api/notes/${testShareId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        shareId: testShareId,
        content: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        permissions: expect.objectContaining({
          canEdit: expect.any(Boolean),
          canComment: expect.any(Boolean),
        }),
      });
    });

    test('should allow anonymous viewing', async () => {
      // This test will FAIL until anonymous access is implemented
      const response = await request(app)
        .get(`/api/notes/${testShareId}`)
        // No auth header
        .expect(200);

      expect(response.body.permissions).toMatchObject({
        canEdit: false,
        canComment: false,
      });
    });

    test('should return 404 for non-existent share', async () => {
      // This test will FAIL until error handling is implemented
      const response = await request(app)
        .get('/api/notes/invalid-share-id')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Shared note not found',
      });
    });
  });

  describe('PUT /api/notes/:token', () => {
    const testShareId = 'test-share-123';
    
    test('should update shared note with authentication', async () => {
      // This test will FAIL until update endpoint is implemented
      const updatedContent = '# Updated Note\n\nThis content has been updated.';
      
      const response = await request(app)
        .put(`/api/notes/${testShareId}`)
        .send({ content: updatedContent })
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body).toMatchObject({
        shareId: testShareId,
        updatedAt: expect.any(String),
        version: expect.any(Number),
      });
    });

    test('should reject update without authentication', async () => {
      // This test will FAIL until auth is implemented
      const response = await request(app)
        .put(`/api/notes/${testShareId}`)
        .send({ content: 'Updated content' })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Authentication required for editing',
      });
    });

    test('should handle version conflicts', async () => {
      // This test will FAIL until version control is implemented
      const response = await request(app)
        .put(`/api/notes/${testShareId}`)
        .send({ 
          content: 'Updated content',
          version: 1 // Outdated version
        })
        .set('Authorization', 'Bearer test-token')
        .expect(409);

      expect(response.body).toMatchObject({
        error: 'Version conflict',
        currentVersion: expect.any(Number),
      });
    });
  });

  describe('DELETE /api/notes/:token', () => {
    const testShareId = 'test-share-123';
    
    test('should delete shared note by owner', async () => {
      // This test will FAIL until delete endpoint is implemented
      const response = await request(app)
        .delete(`/api/notes/${testShareId}`)
        .set('Authorization', 'Bearer owner-token')
        .expect(204);

      expect(response.body).toEqual({});
    });

    test('should reject deletion by non-owner', async () => {
      // This test will FAIL until ownership check is implemented
      const response = await request(app)
        .delete(`/api/notes/${testShareId}`)
        .set('Authorization', 'Bearer other-user-token')
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Only the owner can delete this share',
      });
    });

    test('should reject deletion without authentication', async () => {
      // This test will FAIL until auth is implemented
      const response = await request(app)
        .delete(`/api/notes/${testShareId}`)
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Authentication required',
      });
    });
  });
});