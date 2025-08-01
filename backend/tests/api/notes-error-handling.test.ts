import request from 'supertest';
import { app } from '../../src/app';
import { NoteModel } from '../../src/db/models/Note';

// Mock the NoteModel for error handling tests
jest.mock('../../src/db/models/Note');
const mockNoteModel = NoteModel as jest.Mocked<typeof NoteModel>;

describe('Notes API Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/notes/share - Error Cases', () => {
    test('should handle database create error', async () => {
      mockNoteModel.exists.mockResolvedValue(false);
      mockNoteModel.create.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/notes/share')
        .send({ content: '# Test Note' })
        .set('Authorization', 'Bearer test-token')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to create share'
      });
    });

    test('should handle shareId generation failure', async () => {
      // Mock exists to return true multiple times (all IDs taken)
      mockNoteModel.exists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true); // 6 attempts, all fail

      const response = await request(app)
        .post('/api/notes/share')
        .send({ content: '# Test Note' })
        .set('Authorization', 'Bearer test-token')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to generate unique share ID'
      });
    });
  });

  describe('GET /api/notes/:token - Error Cases', () => {
    test('should handle database fetch error', async () => {
      mockNoteModel.getByShareId.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/notes/test-share-id')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to fetch shared note'
      });
    });
  });

  describe('PUT /api/notes/:token - Error Cases', () => {
    test('should handle database error during update', async () => {
      mockNoteModel.getByShareId.mockResolvedValue({
        id: 1,
        shareId: 'test-share-id',
        content: '# Old Note',
        ownerId: 'test-user',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
        isActive: true
      });

      mockNoteModel.update.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .put('/api/notes/test-share-id')
        .send({ content: '# Updated Note' })
        .set('Authorization', 'Bearer test-token')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to update shared note'
      });
    });

    test('should handle access denied error during update', async () => {
      mockNoteModel.getByShareId.mockResolvedValue({
        id: 1,
        shareId: 'test-share-id',
        content: '# Old Note',
        ownerId: 'test-user',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        version: 1,
        isActive: true
      });

      mockNoteModel.update.mockRejectedValue(new Error('Note not found or access denied'));

      const response = await request(app)
        .put('/api/notes/test-share-id')
        .send({ content: '# Updated Note' })
        .set('Authorization', 'Bearer test-token')
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Access denied or note not found'
      });
    });
  });

  describe('DELETE /api/notes/:token - Error Cases', () => {
    test('should handle database error during delete', async () => {
      mockNoteModel.delete.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .delete('/api/notes/test-share-id')
        .set('Authorization', 'Bearer test-token')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to delete shared note'
      });
    });
  });
});