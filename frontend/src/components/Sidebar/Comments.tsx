// Comments panel with threaded discussions

import React, { useState } from 'react';
import { useCollaboration } from '../../contexts/CollaborationContext';
import type { Comment } from '../../types/collaboration';

interface CommentItemProps {
  comment: Comment;
  level: number;
  onReply: (parentId: number) => void;
  onEdit: (commentId: number, content: string) => void;
  onDelete: (commentId: number) => void;
}

function CommentItem({ comment, level, onReply, onEdit, onDelete }: CommentItemProps) {
  const { state } = useCollaboration();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(true);

  const isOwner = comment.contributorName === state.contributorName;
  const hasReplies = comment.replies && comment.replies.length > 0;

  const handleEdit = () => {
    if (editContent.trim() && editContent !== comment.content) {
      onEdit(comment.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <div className={`${level > 0 ? 'ml-6 border-l-2 border-gray-200 pl-4' : ''}`}>
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
              style={{ backgroundColor: comment.contributorColor || '#6B7280' }}
            >
              {comment.contributorName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {comment.contributorName}
              </p>
              <p className="text-xs text-gray-500">
                {formatTimestamp(comment.createdAt)}
                {comment.positionStart !== comment.positionEnd && (
                  <span className="ml-2">
                    • Lines {comment.positionStart}-{comment.positionEnd}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-1">
            {!comment.isResolved && (
              <button
                onClick={() => onReply(comment.id)}
                className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
              >
                Reply
              </button>
            )}
            {isOwner && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(comment.id)}
                  className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleCancel}
                className="text-xs px-3 py-1 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-800 mb-2">{comment.content}</p>
            
            {comment.isResolved && (
              <div className="inline-flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Resolved
              </div>
            )}
          </div>
        )}

        {/* Replies toggle */}
        {hasReplies && (
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center"
          >
            <svg 
              className={`w-3 h-3 mr-1 transform transition-transform ${showReplies ? 'rotate-90' : ''}`}
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            {hasReplies ? `${comment.replies.length} ${comment.replies.length === 1 ? 'reply' : 'replies'}` : ''}
          </button>
        )}
      </div>

      {/* Replies */}
      {hasReplies && showReplies && (
        <div className="mt-2 space-y-2">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              level={level + 1}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface AddCommentFormProps {
  onAdd: (content: string, positionStart: number, positionEnd: number, parentId?: number) => void;
  onCancel: () => void;
  parentId?: number;
  positionStart?: number;
  positionEnd?: number;
}

function AddCommentForm({ onAdd, onCancel, parentId, positionStart = 0, positionEnd = 0 }: AddCommentFormProps) {
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onAdd(content.trim(), positionStart, positionEnd, parentId);
      setContent('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={parentId ? "Reply to comment..." : "Add a comment..."}
        className="w-full text-sm border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        rows={3}
        autoFocus
      />
      <div className="flex justify-end space-x-2 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs px-3 py-1 text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!content.trim()}
          className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {parentId ? 'Reply' : 'Comment'}
        </button>
      </div>
    </form>
  );
}

export function Comments() {
  const { state, actions } = useCollaboration();
  const [showAddForm, setShowAddForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  // Group comments by thread (top-level comments with their replies)
  const topLevelComments = state.comments.filter(comment => !comment.parentCommentId);

  const handleAddComment = (content: string, positionStart: number, positionEnd: number, parentId?: number) => {
    actions.addComment(content, positionStart, positionEnd, parentId);
    setShowAddForm(false);
    setReplyingTo(null);
  };

  const handleReply = (parentId: number) => {
    setReplyingTo(parentId);
    setShowAddForm(false);
  };

  const handleEditComment = (commentId: number, content: string) => {
    actions.updateComment(commentId, content);
  };

  const handleDeleteComment = (commentId: number) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      actions.deleteComment(commentId);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Comments</h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            Add
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {state.comments.length} {state.comments.length === 1 ? 'comment' : 'comments'}
        </p>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Add comment form */}
        {showAddForm && (
          <AddCommentForm
            onAdd={handleAddComment}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {/* Comments */}
        {topLevelComments.map(comment => (
          <div key={comment.id}>
            <CommentItem
              comment={comment}
              level={0}
              onReply={handleReply}
              onEdit={handleEditComment}
              onDelete={handleDeleteComment}
            />
            
            {/* Reply form */}
            {replyingTo === comment.id && (
              <div className="mt-2 ml-6">
                <AddCommentForm
                  onAdd={handleAddComment}
                  onCancel={() => setReplyingTo(null)}
                  parentId={comment.id}
                  positionStart={comment.positionStart}
                  positionEnd={comment.positionEnd}
                />
              </div>
            )}
          </div>
        ))}

        {/* Empty state */}
        {state.comments.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No comments yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Select text and add a comment to start the discussion
            </p>
          </div>
        )}
      </div>
    </div>
  );
}