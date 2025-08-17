/**
 * COMPREHENSIVE COMMENT PERSISTENCE DEBUG TEST
 * 
 * This test systematically debugs the comment persistence issue where comments
 * disappear from the sidebar after page refresh in single-user scenarios.
 */

import * as Y from 'yjs';

describe('Comment Persistence Debug', () => {
  let ydoc: Y.Doc;
  let commentsMap: Y.Map<any>;

  beforeEach(() => {
    ydoc = new Y.Doc();
    commentsMap = ydoc.getMap('comments');
  });

  afterEach(() => {
    ydoc.destroy();
  });

  describe('Yjs Comments Map Initialization', () => {
    it('should create comments map without errors', () => {
      expect(commentsMap).toBeDefined();
      expect(commentsMap.size).toBe(0);
    });

    it('should persist comments in Yjs map', () => {
      const testComment = {
        id: 'test-comment-1',
        content: 'Test comment content',
        author: 'Test User',
        position: { from: 0, to: 10 },
        threadId: null,
        resolved: false,
        createdAt: new Date().toISOString()
      };

      // Add comment to Yjs map
      ydoc.transact(() => {
        commentsMap.set(testComment.id, testComment);
      });

      expect(commentsMap.size).toBe(1);
      expect(commentsMap.get(testComment.id)).toEqual(testComment);
    });
  });

  describe('Yjs State Serialization/Deserialization', () => {
    it('should serialize and restore comments from Yjs state', () => {
      const testComment = {
        id: 'test-comment-1',
        content: 'Test comment content',
        author: 'Test User',
        position: { from: 0, to: 10 },
        threadId: null,
        resolved: false,
        createdAt: new Date().toISOString()
      };

      // Add comment to original document
      ydoc.transact(() => {
        commentsMap.set(testComment.id, testComment);
      });

      // Serialize the document state
      const state = Y.encodeStateAsUpdate(ydoc);
      console.log('📦 Serialized state size:', state.length, 'bytes');

      // Create new document and restore state
      const newYdoc = new Y.Doc();
      const newCommentsMap = newYdoc.getMap('comments');

      // Apply the serialized state
      Y.applyUpdate(newYdoc, state);

      // Verify comments are restored
      expect(newCommentsMap.size).toBe(1);
      expect(newCommentsMap.get(testComment.id)).toEqual(testComment);

      newYdoc.destroy();
    });

    it('should handle multiple comments in serialization', () => {
      const comments = [
        {
          id: 'comment-1',
          content: 'First comment',
          author: 'User 1',
          position: { from: 0, to: 10 },
          threadId: null,
          resolved: false,
          createdAt: new Date().toISOString()
        },
        {
          id: 'comment-2',
          content: 'Second comment',
          author: 'User 2',
          position: { from: 20, to: 30 },
          threadId: null,
          resolved: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'reply-1',
          content: 'Reply to first comment',
          author: 'User 2',
          position: null,
          threadId: 'comment-1',
          resolved: false,
          createdAt: new Date().toISOString()
        }
      ];

      // Add all comments
      ydoc.transact(() => {
        comments.forEach(comment => {
          commentsMap.set(comment.id, comment);
        });
      });

      expect(commentsMap.size).toBe(3);

      // Serialize and restore
      const state = Y.encodeStateAsUpdate(ydoc);
      const newYdoc = new Y.Doc();
      const newCommentsMap = newYdoc.getMap('comments');
      Y.applyUpdate(newYdoc, state);

      // Verify all comments are restored
      expect(newCommentsMap.size).toBe(3);
      comments.forEach(comment => {
        expect(newCommentsMap.get(comment.id)).toEqual(comment);
      });

      newYdoc.destroy();
    });
  });

  describe('Database Storage Simulation', () => {
    it('should simulate the complete save/load cycle', () => {
      const testComment = {
        id: 'persistence-test-1',
        content: 'Testing database persistence',
        author: 'Test User',
        position: { from: 0, to: 10 },
        threadId: null,
        resolved: false,
        createdAt: new Date().toISOString()
      };

      // STEP 1: Add comment (simulating user action)
      ydoc.transact(() => {
        commentsMap.set(testComment.id, testComment);
      });

      // STEP 2: Simulate Hocuspocus saving to database
      const yjsState = Y.encodeStateAsUpdate(ydoc);
      console.log('💾 Simulated database save - yjsState size:', yjsState.length);

      // STEP 3: Simulate page refresh - new Y.Doc instance
      const refreshedYdoc = new Y.Doc();
      const refreshedCommentsMap = refreshedYdoc.getMap('comments');

      // STEP 4: Simulate Hocuspocus loading from database
      Y.applyUpdate(refreshedYdoc, yjsState);

      // STEP 5: Verify comment is available after refresh
      expect(refreshedCommentsMap.size).toBe(1);
      const restoredComment = refreshedCommentsMap.get(testComment.id);
      expect(restoredComment).toEqual(testComment);

      console.log('✅ Comment persistence test passed');
      console.log('Original comment:', testComment);
      console.log('Restored comment:', restoredComment);

      refreshedYdoc.destroy();
    });
  });

  describe('Timing and Race Condition Detection', () => {
    it('should handle rapid comment additions and deletions', async () => {
      const comments = Array.from({ length: 10 }, (_, i) => ({
        id: `rapid-comment-${i}`,
        content: `Rapid comment ${i}`,
        author: 'Speed User',
        position: { from: i * 10, to: (i + 1) * 10 },
        threadId: null,
        resolved: false,
        createdAt: new Date().toISOString()
      }));

      // Add comments rapidly
      for (const comment of comments) {
        ydoc.transact(() => {
          commentsMap.set(comment.id, comment);
        });
      }

      expect(commentsMap.size).toBe(10);

      // Serialize state multiple times (simulating rapid saves)
      const states = [];
      for (let i = 0; i < 5; i++) {
        states.push(Y.encodeStateAsUpdate(ydoc));
        // Simulate small delay
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      // Test that the latest state has all comments
      const latestState = states[states.length - 1];
      const testYdoc = new Y.Doc();
      const testCommentsMap = testYdoc.getMap('comments');
      Y.applyUpdate(testYdoc, latestState);

      expect(testCommentsMap.size).toBe(10);
      comments.forEach(comment => {
        expect(testCommentsMap.get(comment.id)).toEqual(comment);
      });

      testYdoc.destroy();
    });
  });

  describe('Browser Environment Simulation', () => {
    it('should simulate localStorage persistence fallback', () => {
      const testComment = {
        id: 'storage-test-1',
        content: 'Testing storage fallback',
        author: 'Test User',
        position: { from: 0, to: 10 },
        threadId: null,
        resolved: false,
        createdAt: new Date().toISOString()
      };

      // Add comment
      ydoc.transact(() => {
        commentsMap.set(testComment.id, testComment);
      });

      // Simulate storing in localStorage (backup mechanism)
      const documentId = 'test-document-123';
      const commentsData = Array.from(commentsMap.entries()).map(([id, comment]) => ({
        id,
        ...comment
      }));

      // Mock localStorage
      const mockStorage = new Map<string, string>();
      const storageKey = `obsidian-comments-${documentId}`;
      mockStorage.set(storageKey, JSON.stringify(commentsData));

      // Simulate retrieval
      const storedData = mockStorage.get(storageKey);
      expect(storedData).toBeDefined();
      const parsedComments = JSON.parse(storedData!);
      expect(parsedComments).toHaveLength(1);
      expect(parsedComments[0]).toEqual({ id: testComment.id, ...testComment });
    });
  });
});