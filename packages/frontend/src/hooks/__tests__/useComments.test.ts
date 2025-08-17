import { renderHook, act, waitFor } from '@testing-library/react';
import { useComments } from '../useComments';
import * as Y from 'yjs';

describe('useComments hook', () => {
  let ydoc: Y.Doc;
  let commentsMap: Y.Map<any>;

  beforeEach(() => {
    ydoc = new Y.Doc();
    commentsMap = ydoc.getMap('comments');
  });

  afterEach(() => {
    ydoc.destroy();
  });

  it('should initialize with empty comments', () => {
    const { result } = renderHook(() => useComments(ydoc, true, true));

    expect(result.current.comments).toEqual([]);
  });

  it('should add a new comment', async () => {
    const { result } = renderHook(() => useComments(ydoc, true, true));

    act(() => {
      result.current.addComment({
        id: 'comment-1',
        content: 'This is a test comment',
        author: 'Alice',
        position: { from: 10, to: 20 },
        threadId: null,
      });
    });

    await waitFor(() => {
      expect(result.current.comments).toHaveLength(1);
      expect(result.current.comments[0]).toMatchObject({
        id: 'comment-1',
        content: 'This is a test comment',
        author: 'Alice',
        position: { from: 10, to: 20 },
        resolved: false,
      });
    });
  });

  it('should reply to a comment', async () => {
    const { result } = renderHook(() => useComments(ydoc, true, true));

    // Add initial comment
    act(() => {
      result.current.addComment({
        id: 'comment-1',
        content: 'Original comment',
        author: 'Alice',
        position: { from: 10, to: 20 },
        threadId: null,
      });
    });

    // Add reply
    act(() => {
      result.current.addComment({
        id: 'comment-2',
        content: 'Reply to comment',
        author: 'Bob',
        position: null,
        threadId: 'comment-1',
      });
    });

    await waitFor(() => {
      expect(result.current.comments).toHaveLength(2);
      expect(result.current.comments[1]).toMatchObject({
        id: 'comment-2',
        content: 'Reply to comment',
        author: 'Bob',
        threadId: 'comment-1',
      });
    });
  });

  it('should resolve a comment', async () => {
    const { result } = renderHook(() => useComments(ydoc, true, true));

    // Add comment
    act(() => {
      result.current.addComment({
        id: 'comment-1',
        content: 'Test comment',
        author: 'Alice',
        position: { from: 10, to: 20 },
        threadId: null,
      });
    });

    // Resolve comment
    act(() => {
      result.current.resolveComment('comment-1');
    });

    await waitFor(() => {
      expect(result.current.comments[0].resolved).toBe(true);
    });
  });

  it('should delete a comment', async () => {
    const { result } = renderHook(() => useComments(ydoc, true, true));

    // Add comment
    act(() => {
      result.current.addComment({
        id: 'comment-1',
        content: 'Test comment',
        author: 'Alice',
        position: { from: 10, to: 20 },
        threadId: null,
      });
    });

    // Delete comment
    act(() => {
      result.current.deleteComment('comment-1');
    });

    await waitFor(() => {
      expect(result.current.comments).toHaveLength(0);
    });
  });

  it('should get comments for a thread', async () => {
    const { result } = renderHook(() => useComments(ydoc, true, true));

    // Add parent comment
    act(() => {
      result.current.addComment({
        id: 'comment-1',
        content: 'Parent comment',
        author: 'Alice',
        position: { from: 10, to: 20 },
        threadId: null,
      });
    });

    // Add two replies
    act(() => {
      result.current.addComment({
        id: 'comment-2',
        content: 'Reply 1',
        author: 'Bob',
        position: null,
        threadId: 'comment-1',
      });
    });

    act(() => {
      result.current.addComment({
        id: 'comment-3',
        content: 'Reply 2',
        author: 'Charlie',
        position: null,
        threadId: 'comment-1',
      });
    });

    await waitFor(() => {
      const threadComments = result.current.getThreadComments('comment-1');
      expect(threadComments).toHaveLength(3); // Parent + 2 replies
      expect(threadComments[0].id).toBe('comment-1');
      expect(threadComments[1].id).toBe('comment-2');
      expect(threadComments[2].id).toBe('comment-3');
    });
  });

  it('should sync with Yjs document changes', async () => {
    const { result } = renderHook(() => useComments(ydoc, true, true));

    // Simulate external comment addition
    ydoc.transact(() => {
      const comment = {
        id: 'external-comment',
        content: 'External comment',
        author: 'External User',
        position: { from: 5, to: 15 },
        threadId: null,
        resolved: false,
        createdAt: new Date().toISOString(),
      };
      commentsMap.set('external-comment', comment);
    });

    await waitFor(() => {
      expect(result.current.comments).toHaveLength(1);
      expect(result.current.comments[0].id).toBe('external-comment');
    });
  });
});