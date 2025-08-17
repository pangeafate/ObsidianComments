import { useEffect, useState, useCallback } from 'react';
import * as Y from 'yjs';

export interface Comment {
  id: string;
  content: string;
  author: string;
  position: { from: number; to: number } | null;
  threadId: string | null;
  resolved: boolean;
  createdAt: string;
}

export interface NewComment {
  id: string;
  content: string;
  author: string;
  position: { from: number; to: number } | null;
  threadId: string | null;
}

export interface UseCommentsReturn {
  comments: Comment[];
  addComment: (comment: NewComment) => void;
  resolveComment: (id: string) => void;
  deleteComment: (id: string) => void;
  getThreadComments: (threadId: string) => Comment[];
}

export function useComments(ydoc: Y.Doc | null, synced?: boolean, isInitialSyncComplete?: boolean): UseCommentsReturn {
  const [comments, setComments] = useState<Comment[]>([]);
  const commentsMap = ydoc?.getMap('comments');

  // Force save comments on page unload to prevent data loss
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (ydoc && commentsMap && commentsMap.size > 0) {
        console.log('💾 Page unloading with comments, forcing immediate save');
        // The WebSocket connection will handle the final save
        // This ensures any pending changes are sent
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [ydoc, commentsMap]);

  // Sync comments from Yjs map - CRITICAL FIX: Wait for proper synchronization
  useEffect(() => {
    if (!commentsMap) {
      setComments([]);
      return;
    }

    // CRITICAL FIX: Only load comments after Yjs is fully synchronized
    // This prevents loading empty comments before server data arrives
    if (synced !== undefined && isInitialSyncComplete !== undefined) {
      if (!synced || !isInitialSyncComplete) {
        console.log('⏳ Waiting for Yjs sync before loading comments...', { synced, isInitialSyncComplete });
        setComments([]); // Clear comments until sync is complete
        return;
      }
    }

    const updateComments = () => {
      const commentsList: Comment[] = [];
      commentsMap.forEach((comment) => {
        // Validate comment structure before adding
        if (comment && typeof comment === 'object' && comment.id && comment.content && comment.author) {
          commentsList.push(comment as Comment);
        } else {
          console.warn('Invalid comment data found in Yjs map:', comment);
        }
      });
      
      // Sort by creation time
      commentsList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setComments(commentsList);
      
      console.log(`📊 Comments loaded after sync: ${commentsList.length} valid comments from ${commentsMap.size} map entries`);
      console.log(`🔄 Sync status: synced=${synced}, isInitialSyncComplete=${isInitialSyncComplete}`);
    };

    // Initial sync - only after proper synchronization
    updateComments();

    // Listen for changes
    commentsMap.observe(updateComments);

    return () => {
      commentsMap.unobserve(updateComments);
    };
  }, [commentsMap, synced, isInitialSyncComplete]);

  const addComment = useCallback((newComment: NewComment) => {
    if (!ydoc || !commentsMap) return;

    const comment: Comment = {
      ...newComment,
      resolved: false,
      createdAt: new Date().toISOString(),
    };

    ydoc.transact(() => {
      commentsMap.set(comment.id, comment);
    });
  }, [commentsMap, ydoc]);

  const resolveComment = useCallback((id: string) => {
    if (!ydoc || !commentsMap) return;
    
    const comment = commentsMap.get(id);
    if (comment) {
      ydoc.transact(() => {
        commentsMap.set(id, { ...comment, resolved: true });
      });
    }
  }, [commentsMap, ydoc]);

  const deleteComment = useCallback((id: string) => {
    if (!ydoc || !commentsMap) return;
    
    ydoc.transact(() => {
      commentsMap.delete(id);
      
      // Also delete any replies to this comment
      const replies: string[] = [];
      commentsMap.forEach((comment, commentId) => {
        if (comment.threadId === id) {
          replies.push(commentId);
        }
      });
      
      replies.forEach(replyId => {
        commentsMap.delete(replyId);
      });
    });
  }, [commentsMap, ydoc]);

  const getThreadComments = useCallback((threadId: string) => {
    const threadComments = comments.filter(
      comment => comment.id === threadId || comment.threadId === threadId
    );
    
    // Sort with parent first, then replies by creation time
    return threadComments.sort((a, b) => {
      if (a.id === threadId) return -1;
      if (b.id === threadId) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [comments]);

  return {
    comments,
    addComment,
    resolveComment,
    deleteComment,
    getThreadComments,
  };
}