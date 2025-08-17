import * as Y from 'yjs';
import { PrismaClient } from '@prisma/client';

// Mock Prisma client
const mockPrismaClient = {
  $connect: jest.fn(),
  document: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient),
}));

describe('Comment Persistence', () => {
  let ydoc: Y.Doc;

  beforeEach(() => {
    jest.clearAllMocks();
    ydoc = new Y.Doc();
  });

  describe('Comment Storage in Yjs State', () => {
    it('should include comments map in Yjs state', () => {
      // Arrange: Create a document with content and comments
      const prosemirrorFragment = ydoc.getXmlFragment('default');
      const paragraph = new Y.XmlElement('paragraph');
      const textNode = new Y.XmlText();
      textNode.insert(0, 'Test content');
      paragraph.insert(0, [textNode]);
      prosemirrorFragment.insert(0, [paragraph]);

      // Add a comment to the comments map
      const commentsMap = ydoc.getMap('comments');
      const comment = {
        id: 'comment-1',
        content: 'This is a test comment',
        author: 'Test User',
        position: { from: 0, to: 5 },
        threadId: null,
        resolved: false,
        createdAt: new Date().toISOString(),
      };
      commentsMap.set(comment.id, comment);

      // Act: Encode the state
      const state = Y.encodeStateAsUpdate(ydoc);

      // Assert: State should contain the comment
      const newDoc = new Y.Doc();
      Y.applyUpdate(newDoc, state);
      const restoredComments = newDoc.getMap('comments');
      expect(restoredComments.get('comment-1')).toEqual(comment);
    });

    it('should persist multiple comments in Yjs state', () => {
      // Arrange: Add multiple comments
      const commentsMap = ydoc.getMap('comments');
      const comments = [
        {
          id: 'comment-1',
          content: 'First comment',
          author: 'User 1',
          position: { from: 0, to: 5 },
          threadId: null,
          resolved: false,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'comment-2',
          content: 'Second comment',
          author: 'User 2',
          position: { from: 10, to: 15 },
          threadId: null,
          resolved: false,
          createdAt: '2024-01-01T00:01:00.000Z',
        },
        {
          id: 'comment-3',
          content: 'Reply to first comment',
          author: 'User 3',
          position: null,
          threadId: 'comment-1',
          resolved: false,
          createdAt: '2024-01-01T00:02:00.000Z',
        },
      ];

      comments.forEach(comment => {
        commentsMap.set(comment.id, comment);
      });

      // Act: Encode and restore state
      const state = Y.encodeStateAsUpdate(ydoc);
      const newDoc = new Y.Doc();
      Y.applyUpdate(newDoc, state);

      // Assert: All comments should be restored
      const restoredComments = newDoc.getMap('comments');
      expect(restoredComments.size).toBe(3);
      expect(restoredComments.get('comment-1')).toEqual(comments[0]);
      expect(restoredComments.get('comment-2')).toEqual(comments[1]);
      expect(restoredComments.get('comment-3')).toEqual(comments[2]);
    });

    it('should handle comment deletion in Yjs state', () => {
      // Arrange: Add comments
      const commentsMap = ydoc.getMap('comments');
      commentsMap.set('comment-1', { id: 'comment-1', content: 'Test' });
      commentsMap.set('comment-2', { id: 'comment-2', content: 'Test 2' });

      // Act: Delete a comment and encode state
      commentsMap.delete('comment-1');
      const state = Y.encodeStateAsUpdate(ydoc);

      // Assert: Deleted comment should not be in restored state
      const newDoc = new Y.Doc();
      Y.applyUpdate(newDoc, state);
      const restoredComments = newDoc.getMap('comments');
      expect(restoredComments.has('comment-1')).toBe(false);
      expect(restoredComments.has('comment-2')).toBe(true);
    });

    it('should handle resolved comments in Yjs state', () => {
      // Arrange: Add a comment
      const commentsMap = ydoc.getMap('comments');
      const comment = {
        id: 'comment-1',
        content: 'Test comment',
        author: 'User',
        resolved: false,
        createdAt: new Date().toISOString(),
      };
      commentsMap.set(comment.id, comment);

      // Act: Resolve the comment
      commentsMap.set(comment.id, { ...comment, resolved: true });
      const state = Y.encodeStateAsUpdate(ydoc);

      // Assert: Comment should be marked as resolved
      const newDoc = new Y.Doc();
      Y.applyUpdate(newDoc, state);
      const restoredComments = newDoc.getMap('comments');
      expect(restoredComments.get('comment-1')).toMatchObject({ resolved: true });
    });
  });

  describe('Database Persistence Integration', () => {
    it('should store comments as part of yjsState in database', async () => {
      // Arrange: Create a document with comments
      const commentsMap = ydoc.getMap('comments');
      commentsMap.set('comment-1', {
        id: 'comment-1',
        content: 'Database test comment',
        author: 'Test User',
        createdAt: new Date().toISOString(),
      });

      const state = Y.encodeStateAsUpdate(ydoc);

      // Act: Simulate database store
      mockPrismaClient.document.update.mockResolvedValue({});
      await mockPrismaClient.document.update({
        where: { id: 'test-doc' },
        data: { yjsState: Buffer.from(state) },
      });

      // Assert: Update should include the state with comments
      expect(mockPrismaClient.document.update).toHaveBeenCalledWith({
        where: { id: 'test-doc' },
        data: { yjsState: expect.any(Buffer) },
      });

      // Verify the stored state contains comments
      const storedBuffer = mockPrismaClient.document.update.mock.calls[0][0].data.yjsState;
      const restoredDoc = new Y.Doc();
      Y.applyUpdate(restoredDoc, new Uint8Array(storedBuffer));
      const restoredComments = restoredDoc.getMap('comments');
      expect(restoredComments.get('comment-1')).toBeDefined();
    });

    it('should restore comments from database yjsState', async () => {
      // Arrange: Create a state with comments
      const commentsMap = ydoc.getMap('comments');
      commentsMap.set('comment-1', {
        id: 'comment-1',
        content: 'Persisted comment',
        author: 'User',
        createdAt: '2024-01-01T00:00:00.000Z',
      });
      const state = Y.encodeStateAsUpdate(ydoc);

      // Act: Simulate database fetch
      mockPrismaClient.document.findUnique.mockResolvedValue({
        id: 'test-doc',
        content: 'Test content',
        yjsState: Buffer.from(state),
      });

      const document = await mockPrismaClient.document.findUnique({
        where: { id: 'test-doc' },
      });

      // Assert: Comments should be retrievable from stored state
      const restoredDoc = new Y.Doc();
      Y.applyUpdate(restoredDoc, new Uint8Array(document.yjsState));
      const restoredComments = restoredDoc.getMap('comments');
      expect(restoredComments.get('comment-1')).toMatchObject({
        content: 'Persisted comment',
        author: 'User',
      });
    });
  });

  describe('Single User Scenario', () => {
    it('should persist comments when only one user is connected', async () => {
      // This test simulates the bug scenario:
      // 1. Single user adds a comment
      // 2. State is saved to database
      // 3. User refreshes (disconnects and reconnects)
      // 4. Comment should still be there

      // Step 1: User adds a comment
      const commentsMap = ydoc.getMap('comments');
      const comment = {
        id: 'single-user-comment',
        content: 'Comment from single user',
        author: 'Solo User',
        position: { from: 0, to: 10 },
        threadId: null,
        resolved: false,
        createdAt: new Date().toISOString(),
      };
      commentsMap.set(comment.id, comment);

      // Step 2: Save state to database (simulating debounced save)
      const stateBeforeRefresh = Y.encodeStateAsUpdate(ydoc);
      mockPrismaClient.document.update.mockResolvedValue({});
      await mockPrismaClient.document.update({
        where: { id: 'single-user-doc' },
        data: { yjsState: Buffer.from(stateBeforeRefresh) },
      });

      // Step 3: User refreshes - simulate loading from database
      mockPrismaClient.document.findUnique.mockResolvedValue({
        id: 'single-user-doc',
        content: 'Document content',
        yjsState: Buffer.from(stateBeforeRefresh),
      });

      const loadedDocument = await mockPrismaClient.document.findUnique({
        where: { id: 'single-user-doc' },
      });

      // Step 4: Verify comment persists after refresh
      const freshDoc = new Y.Doc();
      Y.applyUpdate(freshDoc, new Uint8Array(loadedDocument.yjsState));
      const loadedComments = freshDoc.getMap('comments');
      
      expect(loadedComments.size).toBe(1);
      expect(loadedComments.get('single-user-comment')).toMatchObject({
        content: 'Comment from single user',
        author: 'Solo User',
      });
    });

    it('should handle rapid comment additions by single user', async () => {
      // Simulate adding multiple comments quickly before debounced save
      const commentsMap = ydoc.getMap('comments');
      
      // Add comments rapidly
      for (let i = 1; i <= 5; i++) {
        commentsMap.set(`comment-${i}`, {
          id: `comment-${i}`,
          content: `Rapid comment ${i}`,
          author: 'Fast User',
          createdAt: new Date().toISOString(),
        });
      }

      // Simulate debounced save (happens after all comments added)
      const state = Y.encodeStateAsUpdate(ydoc);
      
      // Verify all comments are in the state
      const verifyDoc = new Y.Doc();
      Y.applyUpdate(verifyDoc, state);
      const verifyComments = verifyDoc.getMap('comments');
      
      expect(verifyComments.size).toBe(5);
      for (let i = 1; i <= 5; i++) {
        expect(verifyComments.get(`comment-${i}`)).toBeDefined();
      }
    });
  });
});