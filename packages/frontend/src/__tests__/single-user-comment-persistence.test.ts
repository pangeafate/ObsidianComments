import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';

// Mock the provider
jest.mock('@hocuspocus/provider', () => ({
  HocuspocusProvider: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    off: jest.fn(),
    awareness: {
      on: jest.fn(),
      off: jest.fn(),
      setLocalStateField: jest.fn(),
      getStates: jest.fn(() => new Map()),
    },
    destroy: jest.fn(),
    connect: jest.fn(),
  })),
}));

describe('Single User Comment Persistence Bug', () => {
  let ydoc: Y.Doc;
  let provider: HocuspocusProvider;

  beforeEach(() => {
    ydoc = new Y.Doc();
    // Simulate normal initialization (like in useCollaboration)
    ydoc.getXmlFragment('content');
    ydoc.getText('title');
    // NOTE: comments map is NOT initialized here - this is the bug

    provider = new HocuspocusProvider({
      url: 'ws://localhost:8082',
      name: 'test-doc',
      document: ydoc,
    });
  });

  afterEach(() => {
    ydoc.destroy();
  });

  it('should reproduce the single-user comment persistence bug', () => {
    // Scenario 1: User loads document and adds a comment
    console.log('=== SCENARIO 1: User adds comment ===');
    
    // User adds a comment (this creates the comments map)
    const commentsMap = ydoc.getMap('comments');
    const comment = {
      id: 'test-comment-1',
      content: 'This comment should persist',
      author: 'Test User',
      position: { from: 0, to: 5 },
      threadId: null,
      resolved: false,
      createdAt: new Date().toISOString(),
    };
    
    commentsMap.set(comment.id, comment);
    console.log('Added comment to Yjs map:', comment.content);
    
    // Simulate saving to database
    const state1 = Y.encodeStateAsUpdate(ydoc);
    console.log('Encoded state size:', state1.length);
    
    // Verify comment is in the state
    const testDoc1 = new Y.Doc();
    Y.applyUpdate(testDoc1, state1);
    const testComments1 = testDoc1.getMap('comments');
    expect(testComments1.get(comment.id)).toBeDefined();
    console.log('✅ Comment found in encoded state');
    
    // Scenario 2: User refreshes (new document instance)
    console.log('\\n=== SCENARIO 2: User refreshes page ===');
    
    // Create new document (simulating page refresh)
    const freshDoc = new Y.Doc();
    // BUG: Normal initialization doesn't create comments map
    freshDoc.getXmlFragment('content');
    freshDoc.getText('title');
    
    // Load state from database
    Y.applyUpdate(freshDoc, state1);
    
    // Try to access comments (this is where the bug manifests)
    const freshCommentsMap = freshDoc.getMap('comments');
    console.log('Comments map size after reload:', freshCommentsMap.size);
    
    // The comment should be there, but might not be accessible properly
    const retrievedComment = freshCommentsMap.get(comment.id);
    console.log('Retrieved comment:', retrievedComment ? 'Found' : 'NOT FOUND');
    
    // This test should pass if comments are persisted correctly
    expect(retrievedComment).toBeDefined();
    expect(retrievedComment).toMatchObject({
      content: 'This comment should persist',
      author: 'Test User',
    });
  });

  it('should demonstrate the fix: explicit comments map initialization', () => {
    console.log('\\n=== FIX: Explicit comments map initialization ===');
    
    // Original scenario with comment
    const commentsMap = ydoc.getMap('comments');
    const comment = {
      id: 'test-comment-2',
      content: 'This comment will persist with fix',
      author: 'Test User',
      createdAt: new Date().toISOString(),
    };
    commentsMap.set(comment.id, comment);
    
    const state = Y.encodeStateAsUpdate(ydoc);
    
    // Create fresh document with PROPER initialization
    const freshDoc = new Y.Doc();
    freshDoc.getXmlFragment('content');
    freshDoc.getText('title');
    // FIX: Explicitly initialize comments map
    freshDoc.getMap('comments');
    
    // Load state
    Y.applyUpdate(freshDoc, state);
    
    // Comments should be accessible now
    const freshCommentsMap = freshDoc.getMap('comments');
    const retrievedComment = freshCommentsMap.get(comment.id);
    
    expect(retrievedComment).toBeDefined();
    expect(retrievedComment).toMatchObject({
      content: 'This comment will persist with fix',
      author: 'Test User',
    });
    
    console.log('✅ Comment persisted correctly with explicit initialization');
  });

  it('should test comments map behavior with multiple users simulation', () => {
    console.log('\\n=== MULTI-USER SCENARIO ===');
    
    // Simulate two users working on the same document
    const user1Doc = new Y.Doc();
    const user2Doc = new Y.Doc();
    
    // Both users initialize properly (this works in multi-user scenario)
    user1Doc.getXmlFragment('content');
    user1Doc.getText('title');
    user1Doc.getMap('comments'); // Comments map gets created
    
    user2Doc.getXmlFragment('content');
    user2Doc.getText('title');
    // User 2 might not explicitly get comments map initially
    
    // User 1 adds a comment
    const user1Comments = user1Doc.getMap('comments');
    const comment = {
      id: 'multi-user-comment',
      content: 'Multi-user comment',
      author: 'User 1',
      createdAt: new Date().toISOString(),
    };
    user1Comments.set(comment.id, comment);
    
    // Sync between users (simulate WebSocket sync)
    const update = Y.encodeStateAsUpdate(user1Doc);
    Y.applyUpdate(user2Doc, update);
    
    // User 2 can access comments because they're synced via WebSocket
    const user2Comments = user2Doc.getMap('comments');
    expect(user2Comments.get(comment.id)).toBeDefined();
    
    console.log('✅ Multi-user scenario works because of real-time sync');
    console.log('❌ Single-user scenario fails because no real-time sync on page refresh');
  });
});