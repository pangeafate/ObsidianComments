import request from 'supertest';
import { app } from '../../src/app';
import { NoteModel } from '../../src/db/models/Note';

// Mock the NoteModel for integration tests
jest.mock('../../src/db/models/Note');
const mockNoteModel = NoteModel as jest.Mocked<typeof NoteModel>;

describe('Notes API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/notes/share', () => {
    test('should create a new share with valid content', async () => {
      // Mock the database calls - the create method should return whatever shareId is generated
      mockNoteModel.exists.mockResolvedValue(false);
      mockNoteModel.create.mockImplementation(async (noteData) => ({
        id: 1,
        shareId: noteData.shareId, // Use the generated shareId
        content: noteData.content,
        ownerId: noteData.ownerId,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
        isActive: true
      }));

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

    test('should allow anonymous sharing and create note without auth', async () => {
      // Mock the database calls
      mockNoteModel.exists.mockResolvedValue(false);
      mockNoteModel.create.mockImplementation(async (noteData) => ({
        id: 1,
        shareId: noteData.shareId,
        content: noteData.content,
        ownerId: undefined, // Anonymous share
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
        isActive: true
      }));

      const response = await request(app)
        .post('/api/notes/share')
        .send({ content: 'Test content' })
        .expect(201);

      expect(response.body).toMatchObject({
        shareId: expect.any(String),
        shareUrl: expect.stringContaining('http'),
        createdAt: expect.any(String),
        permissions: 'edit'
      });
    });

    test('should allow anonymous note sharing from Obsidian plugin', async () => {
      // GREEN: This test should pass after removing auth requirement
      // Mock the database calls
      mockNoteModel.exists.mockResolvedValue(false);
      mockNoteModel.create.mockImplementation(async (noteData) => ({
        id: 1,
        shareId: noteData.shareId,
        content: noteData.content,
        ownerId: undefined, // Anonymous share
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
        isActive: true
      }));

      const response = await request(app)
        .post('/api/notes/share')
        .send({ content: '# Test Note from Obsidian\n\nThis should work without auth.' })
        .set('Origin', 'app://obsidian.md')
        .set('Content-Type', 'application/json')
        .set('User-Agent', 'ObsidianComments/1.0.0')
        // No Authorization header - should work now
        .expect(201);

      expect(response.body).toMatchObject({
        shareId: expect.any(String),
        shareUrl: expect.stringContaining('http'),
        createdAt: expect.any(String),
        permissions: 'edit'
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
      // Mock the database call
      mockNoteModel.getByShareId.mockResolvedValue({
        id: 1,
        shareId: testShareId,
        content: '# Test Note\n\nShared content',
        ownerId: 'test-user',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
        isActive: true
      });

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
      // Mock the database call for note with no owner (anonymous)
      mockNoteModel.getByShareId.mockResolvedValue({
        id: 1,
        shareId: testShareId,
        content: '# Public Note\n\nAnonymous content',
        ownerId: undefined, // No owner means anyone can edit
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
        isActive: true
      });

      const response = await request(app)
        .get(`/api/notes/${testShareId}`)
        // No auth header
        .expect(200);

      expect(response.body.permissions).toMatchObject({
        canEdit: true, // No owner means anyone can edit
        canComment: false, // But still need auth to comment
      });
    });

    test('should return 404 for non-existent share', async () => {
      // Mock the database call to return null (not found)
      mockNoteModel.getByShareId.mockResolvedValue(null);

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
      // Mock database calls for update
      mockNoteModel.getByShareId.mockResolvedValue({
        id: 1,
        shareId: testShareId,
        content: '# Old Note',
        ownerId: 'test-user',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
        isActive: true
      });
      
      mockNoteModel.update.mockResolvedValue({
        id: 1,
        shareId: testShareId,
        content: '# Updated Note\n\nThis content has been updated.',
        ownerId: 'test-user',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01T01:00:00Z'),
        version: 2,
        isActive: true
      });

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
      // Mock database call to return current note with higher version
      mockNoteModel.getByShareId.mockResolvedValue({
        id: 1,
        shareId: testShareId,
        content: '# Current Note',
        ownerId: 'test-user',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 2, // Current version is 2
        isActive: true
      });

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
      // Mock successful deletion
      mockNoteModel.delete.mockResolvedValue(true);

      const response = await request(app)
        .delete(`/api/notes/${testShareId}`)
        .set('Authorization', 'Bearer owner-token')
        .expect(204);

      expect(response.body).toEqual({});
    });

    test('should reject deletion by non-owner', async () => {
      // Mock failed deletion (access denied)
      mockNoteModel.delete.mockResolvedValue(false);

      const response = await request(app)
        .delete(`/api/notes/${testShareId}`)
        .set('Authorization', 'Bearer other-user-token')
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Only the owner can delete this share or note not found',
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