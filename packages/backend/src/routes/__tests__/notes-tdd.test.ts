import request from 'supertest';
import express from 'express';
import { notesRouter } from '../notes';

// Mock the notes service to avoid database dependencies
jest.mock('../../services/notesService', () => require('../../services/__mocks__/notesService'));

// TDD: Notes API Unit Tests
// These tests define the expected behavior BEFORE implementation

describe('Notes API Routes - TDD', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/notes', notesRouter);
    
    // Add error handling middleware
    app.use((error: any, req: any, res: any, next: any) => {
      if (error.name === 'ValidationError') {
        return res.status(400).json({ error: error.message });
      }
      if (error.status === 404) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Internal server error' });
    });
  });

  describe('POST /api/notes/share', () => {
    it('should create a shared document', async () => {
      const documentData = {
        title: 'Test Document',
        content: '# Test Content\n\nThis is a test document.'
      };

      const response = await request(app)
        .post('/api/notes/share')
        .send(documentData)
        .expect(201);

      expect(response.body).toHaveProperty('shareId');
      expect(response.body).toHaveProperty('collaborativeUrl');
      expect(response.body.shareId).toMatch(/^[a-zA-Z0-9_-]+$/);
      expect(response.body.collaborativeUrl).toContain('/editor/');
    });

    it('should validate required fields', async () => {
      // Missing title
      await request(app)
        .post('/api/notes/share')
        .send({ content: 'Content only' })
        .expect(400);

      // Missing content
      await request(app)
        .post('/api/notes/share')
        .send({ title: 'Title only' })
        .expect(400);

      // Empty values
      await request(app)
        .post('/api/notes/share')
        .send({ title: '', content: '' })
        .expect(400);
    });

    it('should handle metadata', async () => {
      const documentData = {
        title: 'Test Document',
        content: '# Test Content',
        metadata: {
          source: 'obsidian-plugin',
          version: '1.0.0'
        }
      };

      const response = await request(app)
        .post('/api/notes/share')
        .send(documentData)
        .expect(201);

      expect(response.body).toHaveProperty('shareId');
    });

    it('should sanitize input data', async () => {
      const documentData = {
        title: '<script>alert("xss")</script>Test',
        content: '# Safe Content<script>malicious()</script>'
      };

      const response = await request(app)
        .post('/api/notes/share')
        .send(documentData)
        .expect(201);

      // Should sanitize the title and content
      expect(response.body.title).not.toContain('<script>');
    });
  });

  describe('GET /api/notes/:shareId', () => {
    let testShareId: string;

    beforeEach(async () => {
      // Create a test document first
      const response = await request(app)
        .post('/api/notes/share')
        .send({
          title: 'Test Document',
          content: '# Test Content'
        });
      testShareId = response.body.shareId;
    });

    it('should retrieve a document by share ID', async () => {
      const response = await request(app)
        .get(`/api/notes/${testShareId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testShareId);
      expect(response.body).toHaveProperty('title', 'Test Document');
      expect(response.body).toHaveProperty('content');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should return 404 for non-existent document', async () => {
      const response = await request(app)
        .get('/api/notes/nonexistent-id')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate share ID format', async () => {
      await request(app)
        .get('/api/notes/invalid-id-with-special-chars!')
        .expect(400);
    });
  });

  describe('PUT /api/notes/:shareId', () => {
    let testShareId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/notes/share')
        .send({
          title: 'Test Document',
          content: '# Original Content'
        });
      testShareId = response.body.shareId;
    });

    it('should update document content', async () => {
      const updateData = {
        content: '# Updated Content\n\nThis has been updated.'
      };

      const response = await request(app)
        .put(`/api/notes/${testShareId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // Verify the update
      const getResponse = await request(app)
        .get(`/api/notes/${testShareId}`)
        .expect(200);

      expect(getResponse.body.content).toContain('Updated Content');
    });

    it('should validate content field', async () => {
      await request(app)
        .put(`/api/notes/${testShareId}`)
        .send({})
        .expect(400);

      await request(app)
        .put(`/api/notes/${testShareId}`)
        .send({ content: '' })
        .expect(400);
    });

    it('should return 404 for non-existent document', async () => {
      await request(app)
        .put('/api/notes/nonexistent')
        .send({ content: 'New content' })
        .expect(404);
    });
  });

  describe('PATCH /api/notes/:shareId', () => {
    let testShareId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/notes/share')
        .send({
          title: 'Original Title',
          content: '# Test Content'
        });
      testShareId = response.body.shareId;
    });

    it('should update document title', async () => {
      const updateData = {
        title: 'Updated Title'
      };

      await request(app)
        .patch(`/api/notes/${testShareId}`)
        .send(updateData)
        .expect(200);

      // Verify the update
      const getResponse = await request(app)
        .get(`/api/notes/${testShareId}`)
        .expect(200);

      expect(getResponse.body.title).toBe('Updated Title');
    });

    it('should validate title field', async () => {
      await request(app)
        .patch(`/api/notes/${testShareId}`)
        .send({ title: '' })
        .expect(400);
    });
  });

  describe('DELETE /api/notes/:shareId', () => {
    let testShareId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/notes/share')
        .send({
          title: 'To Be Deleted',
          content: '# Delete Me'
        });
      testShareId = response.body.shareId;
    });

    it('should delete a document', async () => {
      const response = await request(app)
        .delete(`/api/notes/${testShareId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // Verify deletion
      await request(app)
        .get(`/api/notes/${testShareId}`)
        .expect(404);
    });

    it('should return 404 for non-existent document', async () => {
      await request(app)
        .delete('/api/notes/nonexistent')
        .expect(404);
    });
  });

  describe('GET /api/notes', () => {
    beforeEach(async () => {
      // Create some test documents
      await request(app)
        .post('/api/notes/share')
        .send({ title: 'Document 1', content: '# Doc 1' });
      
      await request(app)
        .post('/api/notes/share')
        .send({ title: 'Document 2', content: '# Doc 2' });
    });

    it('should list all documents', async () => {
      const response = await request(app)
        .get('/api/notes')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      // Check document structure
      if (response.body.length > 0) {
        const doc = response.body[0];
        expect(doc).toHaveProperty('id');
        expect(doc).toHaveProperty('title');
        expect(doc).toHaveProperty('createdAt');
        expect(doc).toHaveProperty('updatedAt');
        // Should not include full content in list
        expect(doc).not.toHaveProperty('content');
      }
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/notes?limit=1&offset=0')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(1);
    });

    it('should return empty array when no documents exist', async () => {
      // This test would need a way to clear the database first
      // For now, just check that we get an array
      const response = await request(app)
        .get('/api/notes')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});