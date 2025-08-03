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

export function useComments(ydoc: Y.Doc): UseCommentsReturn {
  const [comments, setComments] = useState<Comment[]>([]);
  const commentsMap = ydoc.getMap('comments');

  // Sync comments from Yjs map
  useEffect(() => {
    const updateComments = () => {
      const commentsList: Comment[] = [];
      commentsMap.forEach((comment) => {
        commentsList.push(comment as Comment);
      });
      
      // Sort by creation time
      commentsList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setComments(commentsList);
    };

    // Initial sync
    updateComments();

    // Listen for changes
    commentsMap.observe(updateComments);

    return () => {
      commentsMap.unobserve(updateComments);
    };
  }, [commentsMap]);

  const addComment = useCallback((newComment: NewComment) => {
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
    const comment = commentsMap.get(id);
    if (comment) {
      ydoc.transact(() => {
        commentsMap.set(id, { ...comment, resolved: true });
      });
    }
  }, [commentsMap, ydoc]);

  const deleteComment = useCallback((id: string) => {
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