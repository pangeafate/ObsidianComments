/**
 * Test to identify timing issues with comment persistence
 * This test simulates the real-world scenario where a user:
 * 1. Adds a comment
 * 2. Quickly refreshes the page before debounced save occurs
 * 3. Expects to see the comment still there
 */

import * as Y from 'yjs';

describe('Comment Persistence Timing Issues', () => {
  describe('Debounce and Save Timing', () => {
    it('should identify the root cause of single-user comment loss', async () => {
      console.log('=== TIMING ISSUE REPRODUCTION ===');
      
      // Scenario: User adds comment and refreshes quickly
      const originalDoc = new Y.Doc();
      originalDoc.getXmlFragment('content');
      originalDoc.getText('title');
      originalDoc.getMap('comments');
      
      // User adds a comment
      const commentsMap = originalDoc.getMap('comments');
      const comment = {
        id: 'quick-comment',
        content: 'Added and refreshed quickly',
        author: 'Fast User',
        createdAt: new Date().toISOString(),
      };
      
      const startTime = Date.now();
      commentsMap.set(comment.id, comment);
      console.log('Comment added at:', startTime);
      
      // Encode state immediately (what should be saved)
      const stateWithComment = Y.encodeStateAsUpdate(originalDoc);
      console.log('State encoded with comment, size:', stateWithComment.length);
      
      // Simulate database state BEFORE debounced save (empty or old state)
      const emptyDoc = new Y.Doc();
      emptyDoc.getXmlFragment('content');
      emptyDoc.getText('title');
      emptyDoc.getMap('comments');
      const emptyState = Y.encodeStateAsUpdate(emptyDoc);
      
      console.log('Empty state size:', emptyState.length);
      
      // User refreshes page - loads from database (which might be stale)
      const refreshedDoc = new Y.Doc();
      refreshedDoc.getXmlFragment('content');
      refreshedDoc.getText('title');
      refreshedDoc.getMap('comments');
      
      // If refresh happens before debounced save, user gets empty state
      Y.applyUpdate(refreshedDoc, emptyState);
      
      const refreshedComments = refreshedDoc.getMap('comments');
      console.log('Comments after refresh:', refreshedComments.size);
      
      // This demonstrates the timing issue
      expect(refreshedComments.size).toBe(0);
      console.log('❌ Comment lost due to timing - refreshed before save');
      
      // If we simulate the CORRECT behavior (loading current state)
      const correctDoc = new Y.Doc();
      correctDoc.getXmlFragment('content');
      correctDoc.getText('title');
      correctDoc.getMap('comments');
      Y.applyUpdate(correctDoc, stateWithComment);
      
      const correctComments = correctDoc.getMap('comments');
      expect(correctComments.size).toBe(1);
      console.log('✅ Comment preserved with immediate save');
    });

    it('should test multiple users vs single user behavior difference', () => {
      console.log('\\n=== MULTI-USER vs SINGLE-USER BEHAVIOR ===');
      
      // Multi-user scenario: Real-time sync keeps everyone in sync
      const user1Doc = new Y.Doc();
      const user2Doc = new Y.Doc();
      
      // Initialize both docs
      [user1Doc, user2Doc].forEach(doc => {
        doc.getXmlFragment('content');
        doc.getText('title');
        doc.getMap('comments');
      });
      
      // User 1 adds comment
      const user1Comments = user1Doc.getMap('comments');
      user1Comments.set('multi-comment', {
        id: 'multi-comment',
        content: 'Multi-user comment',
        author: 'User 1',
      });
      
      // Real-time sync to User 2 (happens immediately via WebSocket)
      const syncUpdate = Y.encodeStateAsUpdate(user1Doc);
      Y.applyUpdate(user2Doc, syncUpdate);
      
      // User 2 can see the comment immediately
      const user2Comments = user2Doc.getMap('comments');
      expect(user2Comments.size).toBe(1);
      console.log('✅ Multi-user: Comment visible to other users immediately');
      
      // Single-user scenario: No real-time sync partner
      const singleUserDoc = new Y.Doc();
      singleUserDoc.getXmlFragment('content');
      singleUserDoc.getText('title');
      singleUserDoc.getMap('comments');
      
      const singleComments = singleUserDoc.getMap('comments');
      singleComments.set('single-comment', {
        id: 'single-comment',
        content: 'Single-user comment',
        author: 'Solo User',
      });
      
      console.log('❌ Single-user: Comment only in memory, depends on debounced save');
      console.log('❌ If page refreshes before save → comment lost');
      console.log('✅ If page refreshes after save → comment preserved');
    });

    it('should propose solutions for the timing issue', () => {
      console.log('\\n=== PROPOSED SOLUTIONS ===');
      
      console.log('Solution 1: Reduce debounce time for single-user scenarios');
      console.log('- Detect single user (awareness.size === 1)');
      console.log('- Use shorter debounce (e.g., 500ms instead of 2000ms)');
      
      console.log('\\nSolution 2: Immediate save for comments');
      console.log('- Comments are critical UX - save immediately');
      console.log('- Content can use debounced save, comments use immediate save');
      
      console.log('\\nSolution 3: Browser storage backup');
      console.log('- Store comments in localStorage as backup');
      console.log('- On page load, merge localStorage with database state');
      
      console.log('\\nSolution 4: Force save on page unload');
      console.log('- Use beforeunload event to trigger immediate save');
      console.log('- Ensure comments are saved before page closes');
      
      // All solutions aim to prevent timing issues
      expect(true).toBe(true); // This test is for analysis
    });
  });
});