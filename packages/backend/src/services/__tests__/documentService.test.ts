import { documentService } from '../documentService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    document: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $disconnect: jest.fn(),
  })),
}));

const mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;

describe('documentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find document by id', async () => {
      const mockDocument = {
        id: 'test-id',
        title: 'Test Document',
        content: 'Test content',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.document.findUnique as jest.Mock).mockResolvedValue(mockDocument);

      const result = await documentService.findById('test-id');

      expect(result).toEqual(mockDocument);
      expect(mockPrisma.document.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' }
      });
    });

    it('should return null when document not found', async () => {
      (mockPrisma.document.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await documentService.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new document', async () => {
      const documentData = {
        id: 'new-id',
        title: 'New Document',
        content: 'New content',
      };

      const mockCreatedDocument = {
        ...documentData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.document.create as jest.Mock).mockResolvedValue(mockCreatedDocument);

      const result = await documentService.create(documentData);

      expect(result).toEqual(mockCreatedDocument);
      expect(mockPrisma.document.create).toHaveBeenCalledWith({
        data: documentData
      });
    });
  });

  describe('update', () => {
    it('should update an existing document', async () => {
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content',
      };

      const mockUpdatedDocument = {
        id: 'test-id',
        ...updateData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.document.update as jest.Mock).mockResolvedValue(mockUpdatedDocument);

      const result = await documentService.update('test-id', updateData);

      expect(result).toEqual(mockUpdatedDocument);
      expect(mockPrisma.document.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: updateData
      });
    });
  });

  describe('delete', () => {
    it('should delete a document', async () => {
      const mockDeletedDocument = {
        id: 'test-id',
        title: 'Deleted Document',
        content: 'Deleted content',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.document.delete as jest.Mock).mockResolvedValue(mockDeletedDocument);

      const result = await documentService.delete('test-id');

      expect(result).toEqual(mockDeletedDocument);
      expect(mockPrisma.document.delete).toHaveBeenCalledWith({
        where: { id: 'test-id' }
      });
    });
  });
});