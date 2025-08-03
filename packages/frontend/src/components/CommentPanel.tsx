import { useState } from 'react';
import { Comment } from '../hooks/useComments';

export interface CommentPanelProps {
  comments: Comment[];
  currentUser: string;
  hideResolved?: boolean;
  onAddComment: (comment: {
    content: string;
    author: string;
    position: { from: number; to: number } | null;
    threadId: string | null;
  }) => void;
  onResolveComment: (id: string) => void;
  onDeleteComment: (id: string) => void;
}

export function CommentPanel({
  comments,
  currentUser,
  hideResolved = false,
  onAddComment,
  onResolveComment,
  onDeleteComment,
}: CommentPanelProps) {
  const [newComment, setNewComment] = useState('');
  const [replyToComment, setReplyToComment] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // Filter comments based on hideResolved setting
  const filteredComments = hideResolved 
    ? comments.filter(comment => !comment.resolved)
    : comments;

  // Group comments into threads
  const commentThreads = filteredComments.reduce((threads, comment) => {
    if (!comment.threadId) {
      // This is a top-level comment
      threads[comment.id] = [comment];
    } else {
      // This is a reply
      if (threads[comment.threadId]) {
        threads[comment.threadId].push(comment);
      }
    }
    return threads;
  }, {} as Record<string, Comment[]>);

  const handleAddComment = () => {
    if (newComment.trim()) {
      onAddComment({
        content: newComment.trim(),
        author: currentUser,
        position: null,
        threadId: null,
      });
      setNewComment('');
    }
  };

  const handleReply = (threadId: string) => {
    if (replyContent.trim()) {
      onAddComment({
        content: replyContent.trim(),
        author: currentUser,
        position: null,
        threadId,
      });
      setReplyContent('');
      setReplyToComment(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Comments</h3>
        
        {/* Add new comment */}
        <div className="mb-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full p-2 border border-gray-300 rounded-md resize-none"
            rows={3}
          />
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Add Comment
          </button>
        </div>
      </div>

      {/* Comment threads */}
      <div className="space-y-4">
        {Object.entries(commentThreads).map(([threadId, threadComments]) => (
          <div key={threadId} data-testid="comment-thread" className="border border-gray-200 rounded-lg p-3">
            {threadComments.map((comment, index) => (
              <div
                key={comment.id}
                className={`${index > 0 ? 'ml-4 mt-3 pt-3 border-t border-gray-100' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{comment.author}</span>
                      <span className="text-xs text-gray-500">
                        {formatDate(comment.createdAt)}
                      </span>
                      {comment.resolved && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Resolved
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{comment.content}</p>
                  </div>
                </div>

                {/* Comment actions */}
                {index === 0 && ( // Only show actions for the main comment
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => setReplyToComment(comment.id)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Reply
                    </button>
                    {!comment.resolved && (
                      <button
                        onClick={() => onResolveComment(comment.id)}
                        className="text-xs text-green-600 hover:text-green-800"
                      >
                        Resolve
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteComment(comment.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                )}

                {/* Reply form */}
                {replyToComment === comment.id && (
                  <div className="mt-3 ml-4">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write a reply..."
                      className="w-full p-2 border border-gray-300 rounded-md resize-none"
                      rows={2}
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleReply(comment.id)}
                        disabled={!replyContent.trim()}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md disabled:bg-gray-300"
                      >
                        Submit Reply
                      </button>
                      <button
                        onClick={() => {
                          setReplyToComment(null);
                          setReplyContent('');
                        }}
                        className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded-md"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {filteredComments.length === 0 && (
        <div className="text-center text-gray-500 mt-8">
          <p>No comments yet.</p>
          <p className="text-sm">Be the first to add one!</p>
        </div>
      )}
    </div>
  );
}