/**
 * COMMENT SYNCHRONIZATION TIMING FIX TEST
 * 
 * This test verifies that the synchronization timing fix prevents comments
 * from disappearing after page refresh by ensuring the useComments hook waits
 * for proper Yjs synchronization before loading comments.
 */

import { renderHook, act } from '@testing-library/react';
import { useComments } from '../hooks/useComments';
import * as Y from 'yjs';

describe('Comment Synchronization Timing Fix', () => {
  let ydoc: Y.Doc;
  let commentsMap: Y.Map<any>;

  beforeEach(() => {
    ydoc = new Y.Doc();
    commentsMap = ydoc.getMap('comments');
  });

  afterEach(() => {
    ydoc.destroy();
  });

  describe('Sync Status Handling', () => {
    it('should not load comments when sync is incomplete', () => {
      // Add a comment to the Yjs map before initializing the hook
      const testComment = {
        id: 'test-comment',
        content: 'Test comment',
        author: 'Test User',
        position: { from: 0, to: 10 },
        threadId: null,
        resolved: false,
        createdAt: new Date().toISOString()
      };

      ydoc.transact(() => {
        commentsMap.set(testComment.id, testComment);
      });

      // Initialize hook with sync incomplete
      const { result } = renderHook(() => useComments(ydoc, false, false));

      // Should have empty comments despite Yjs map containing a comment
      expect(result.current.comments).toEqual([]);
      expect(commentsMap.size).toBe(1); // Verify comment is actually in Yjs map
    });

    it('should load comments when sync is complete', () => {
      const testComment = {
        id: 'test-comment',
        content: 'Test comment',
        author: 'Test User',
        position: { from: 0, to: 10 },
        threadId: null,
        resolved: false,
        createdAt: new Date().toISOString()
      };

      ydoc.transact(() => {
        commentsMap.set(testComment.id, testComment);
      });

      // Initialize hook with sync complete
      const { result } = renderHook(() => useComments(ydoc, true, true));

      // Should load comments from Yjs map
      expect(result.current.comments).toHaveLength(1);
      expect(result.current.comments[0]).toMatchObject(testComment);
    });

    it('should wait for both synced and isInitialSyncComplete flags', () => {
      const testComment = {
        id: 'test-comment',
        content: 'Test comment',
        author: 'Test User',
        position: { from: 0, to: 10 },
        threadId: null,
        resolved: false,
        createdAt: new Date().toISOString()
      };

      ydoc.transact(() => {
        commentsMap.set(testComment.id, testComment);
      });

      // Test synced=true but isInitialSyncComplete=false
      const { result: result1 } = renderHook(() => useComments(ydoc, true, false));
      expect(result1.current.comments).toEqual([]);

      // Test synced=false but isInitialSyncComplete=true
      const { result: result2 } = renderHook(() => useComments(ydoc, false, true));
      expect(result2.current.comments).toEqual([]);

      // Test both flags true
      const { result: result3 } = renderHook(() => useComments(ydoc, true, true));
      expect(result3.current.comments).toHaveLength(1);
    });
  });

  describe('Page Refresh Simulation', () => {
    it('should simulate the page refresh scenario correctly', () => {
      // STEP 1: User adds a comment (collaborative session)
      const originalComment = {
        id: 'refresh-test-comment',
        content: 'This comment should persist after refresh',
        author: 'Test User',
        position: { from: 0, to: 20 },
        threadId: null,
        resolved: false,
        createdAt: new Date().toISOString()
      };

      // User session with sync complete - comments should load
      const { result: userSession } = renderHook(() => useComments(ydoc, true, true));
      
      act(() => {
        userSession.current.addComment(originalComment);
      });

      expect(userSession.current.comments).toHaveLength(1);

      // STEP 2: Simulate Hocuspocus saving to database
      const savedState = Y.encodeStateAsUpdate(ydoc);

      // STEP 3: Simulate page refresh - new Yjs document instance
      const refreshedYdoc = new Y.Doc();
      
      // STEP 4: Before sync completion - should show no comments
      const { result: beforeSync, rerender } = renderHook(
        ({ synced, isInitialSyncComplete }) => useComments(refreshedYdoc, synced, isInitialSyncComplete),
        { initialProps: { synced: false, isInitialSyncComplete: false } }
      );

      expect(beforeSync.current.comments).toEqual([]);

      // STEP 5: Simulate Hocuspocus restoring state from database
      Y.applyUpdate(refreshedYdoc, savedState);

      // STEP 6: Simulate sync completion
      rerender({ synced: true, isInitialSyncComplete: true });

      // STEP 7: Comments should now be visible
      expect(beforeSync.current.comments).toHaveLength(1);
      expect(beforeSync.current.comments[0]).toMatchObject({
        id: originalComment.id,
        content: originalComment.content,
        author: originalComment.author,
        position: originalComment.position,
        threadId: originalComment.threadId,
        resolved: originalComment.resolved
        // Note: createdAt may differ slightly due to timing
      });

      refreshedYdoc.destroy();
    });

    it('should handle the edge case of undefined sync parameters', () => {
      const testComment = {
        id: 'edge-case-comment',
        content: 'Edge case test',
        author: 'Test User',
        position: { from: 0, to: 10 },
        threadId: null,
        resolved: false,
        createdAt: new Date().toISOString()
      };

      ydoc.transact(() => {
        commentsMap.set(testComment.id, testComment);
      });

      // When sync parameters are undefined, should load comments normally
      const { result } = renderHook(() => useComments(ydoc, undefined, undefined));
      
      expect(result.current.comments).toHaveLength(1);
      expect(result.current.comments[0]).toMatchObject(testComment);
    });
  });

  describe('Real-world Timing Scenarios', () => {
    it('should handle rapid sync state changes', () => {
      const testComment = {
        id: 'rapid-test-comment',
        content: 'Rapid state change test',
        author: 'Test User',
        position: { from: 0, to: 10 },
        threadId: null,
        resolved: false,
        createdAt: new Date().toISOString()
      };

      ydoc.transact(() => {
        commentsMap.set(testComment.id, testComment);
      });

      const { result, rerender } = renderHook(
        ({ synced, isInitialSyncComplete }) => useComments(ydoc, synced, isInitialSyncComplete),
        { initialProps: { synced: false, isInitialSyncComplete: false } }
      );

      // Initial state - no comments
      expect(result.current.comments).toEqual([]);

      // Partial sync - still no comments
      rerender({ synced: true, isInitialSyncComplete: false });
      expect(result.current.comments).toEqual([]);

      // Full sync - comments should appear
      rerender({ synced: true, isInitialSyncComplete: true });
      expect(result.current.comments).toHaveLength(1);

      // Simulate temporary disconnection
      rerender({ synced: false, isInitialSyncComplete: true });
      expect(result.current.comments).toEqual([]);

      // Reconnection
      rerender({ synced: true, isInitialSyncComplete: true });
      expect(result.current.comments).toHaveLength(1);
    });
  });
});