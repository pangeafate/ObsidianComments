import { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';

interface Comment {
  id: string;
  content: string;
  author: string;
  position: { from: number; to: number } | null;
  threadId: string | null;
  resolved: boolean;
  selectedText?: string;
  displayText?: string;
}

interface EnhancedCommentPanelProps {
  comments: Comment[];
  currentUser: string;
  editor: Editor;
  onAddComment: (comment: {
    content: string;
    author: string;
    position: { from: number; to: number } | null;
    threadId: string | null;
    selectedText?: string;
    displayText?: string;
  }) => void;
  onResolveComment: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
}

interface SelectionState {
  hasSelection: boolean;
  selectedText: string;
  from: number;
  to: number;
  displayText: string;
}

interface CapturedSelection {
  text: string;
  from: number;
  to: number;
  displayText: string;
}

export function EnhancedCommentPanel({
  comments,
  currentUser,
  editor,
  onAddComment,
  onResolveComment,
  onDeleteComment
}: EnhancedCommentPanelProps) {
  const [selectionState, setSelectionState] = useState<SelectionState>({
    hasSelection: false,
    selectedText: '',
    from: 0,
    to: 0,
    displayText: ''
  });
  
  const [capturedSelection, setCapturedSelection] = useState<CapturedSelection | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isCommentInputFocused, setIsCommentInputFocused] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [foldedThreads, setFoldedThreads] = useState<Set<string>>(new Set());

  // Initialize folded threads when comments change
  useEffect(() => {
    const threadsWithChildren = new Set<string>();
    comments.forEach(comment => {
      if (comments.some(c => c.threadId === comment.id)) {
        threadsWithChildren.add(comment.id);
      }
    });
    setFoldedThreads(threadsWithChildren);
  }, [comments]);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Truncate text to 7 words with ellipsis
  const truncateText = (text: string, maxWords: number = 7): string => {
    const words = text.trim().split(/\s+/);
    if (words.length <= maxWords) {
      return text;
    }
    return words.slice(0, maxWords).join(' ') + '...';
  };

  // Build hierarchical comment tree
  const buildCommentTree = () => {
    const commentMap = new Map<string, Comment & { children: Comment[]; depth: number }>();
    
    // Initialize all comments with empty children arrays
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, children: [], depth: 0 });
    });
    
    // Build parent-child relationships
    comments.forEach(comment => {
      if (comment.threadId && commentMap.has(comment.threadId)) {
        const parent = commentMap.get(comment.threadId)!;
        const child = commentMap.get(comment.id)!;
        child.depth = parent.depth + 1;
        parent.children.push(child);
      }
    });
    
    // Return root comments (those without threadId)
    return comments
      .filter(comment => !comment.threadId)
      .map(comment => commentMap.get(comment.id)!)
      .filter(Boolean);
  };

  // Count total replies in a thread recursively
  const countRepliesInThread = (comment: Comment & { children: Comment[] }): number => {
    return comment.children.reduce((count, child) => {
      return count + 1 + countRepliesInThread(child as Comment & { children: Comment[] });
    }, 0);
  };

  // Check if a comment should be visible (not folded)
  const isCommentVisible = (_commentId: string, parentId: string | null): boolean => {
    if (!parentId) return true; // Root comments are always visible
    
    // Check if any ancestor is folded
    let currentParentId = parentId;
    while (currentParentId) {
      if (foldedThreads.has(currentParentId)) {
        return false;
      }
      
      // Find parent of current parent
      const parentComment = comments.find(c => c.id === currentParentId);
      currentParentId = parentComment?.threadId ?? null;
    }
    
    return true;
  };

  // Toggle thread folding
  const toggleThreadFold = (commentId: string) => {
    setFoldedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  // Update selection state when editor selection changes
  useEffect(() => {
    if (!editor) return;

    const updateSelection = () => {
      const { from, to, empty } = editor.state.selection;
      
      if (!empty && from !== to) {
        const selectedText = editor.state.doc.textBetween(from, to, ' ');
        const displayText = truncateText(selectedText);
        
        setSelectionState({
          hasSelection: true,
          selectedText,
          from,
          to,
          displayText
        });
      } else {
        setSelectionState({
          hasSelection: false,
          selectedText: '',
          from: 0,
          to: 0,
          displayText: ''
        });
        
        // Clear captured selection if no text is selected
        if (!isCommentInputFocused) {
          setCapturedSelection(null);
        }
      }
    };

    // Initial update
    updateSelection();

    // Listen for selection changes
    const handleSelectionUpdate = () => {
      updateSelection();
    };

    // Use a custom event listener pattern
    editor.on('selectionUpdate', handleSelectionUpdate);
    editor.on('update', handleSelectionUpdate);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
      editor.off('update', handleSelectionUpdate);
    };
  }, [editor, isCommentInputFocused]);

  // Handle comment input focus - capture current selection
  const handleCommentInputFocus = () => {
    setIsCommentInputFocused(true);
    
    if (selectionState.hasSelection) {
      setCapturedSelection({
        text: selectionState.selectedText,
        from: selectionState.from,
        to: selectionState.to,
        displayText: selectionState.displayText
      });
    }
  };

  // Handle comment input blur
  const handleCommentInputBlur = () => {
    setIsCommentInputFocused(false);
  };

  // Handle adding comment
  const handleAddComment = () => {
    if (!commentText.trim() || !capturedSelection) return;

    // Create comment with selection data - let Editor handle highlight creation
    onAddComment({
      content: commentText.trim(),
      author: currentUser,
      position: { from: capturedSelection.from, to: capturedSelection.to },
      threadId: null,
      selectedText: capturedSelection.text,
      displayText: capturedSelection.displayText
    });

    // Reset state
    setCommentText('');
    setCapturedSelection(null);
    setIsCommentInputFocused(false);
    
    // Blur the input to return to inactive state
    if (commentInputRef.current) {
      commentInputRef.current.blur();
    }
  };

  // Handle adding reply to a comment
  const handleAddReply = (parentCommentId: string) => {
    if (!replyText.trim()) return;

    onAddComment({
      content: replyText.trim(),
      author: currentUser,
      position: null,
      threadId: parentCommentId
    });

    // Reset reply state
    setReplyText('');
    setReplyingTo(null);
  };

  // Handle starting a reply
  const handleStartReply = (commentId: string) => {
    setReplyingTo(commentId);
    setReplyText('');
  };

  // Handle canceling a reply
  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyText('');
  };

  // Determine if comment functionality is active
  const isActive = selectionState.hasSelection || capturedSelection !== null;

  // Recursive component for rendering threaded comments
  const ThreadedComment = ({ 
    comment, 
    depth = 0 
  }: { 
    comment: Comment & { children: Comment[]; depth: number }; 
    depth?: number 
  }) => {
    const hasChildren = comment.children.length > 0;
    const isFolded = foldedThreads.has(comment.id);
    const replyCount = countRepliesInThread(comment);
    const indentationClass = `ml-${Math.min(depth * 4, 16)}`; // Max 16 for very deep nesting
    
    return (
      <div 
        key={comment.id} 
        className={depth > 0 ? indentationClass : ''}
        data-depth={depth}
      >
        <div
          className={`p-3 rounded-md border ${
            comment.resolved 
              ? 'bg-gray-100 border-gray-200 opacity-75' 
              : depth === 0 ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200'
          }`}
        >
          {/* Selected Text Context (only for root comments) */}
          {depth === 0 && comment.displayText && (
            <div className="mb-2 p-2 bg-yellow-50 border-l-4 border-yellow-400 text-sm">
              <span className="text-yellow-800 font-medium">
                "{comment.displayText}"
              </span>
            </div>
          )}

          {/* Comment Content */}
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-gray-900">
                  {comment.author}
                </span>
                {/* Fold/Unfold Toggle */}
                {hasChildren && (
                  <button
                    className="text-xs text-gray-500 hover:text-gray-700"
                    onClick={() => toggleThreadFold(comment.id)}
                    data-testid={`fold-toggle-${comment.id}`}
                  >
                    {isFolded ? (
                      <span className="flex items-center gap-1">
                        ▶ {replyCount} replies
                      </span>
                    ) : (
                      <span>▼</span>
                    )}
                  </button>
                )}
              </div>
              
              <div className="flex gap-1">
                {!comment.resolved && (
                  <>
                    <button
                      className="text-xs text-blue-600 hover:text-blue-800"
                      onClick={() => handleStartReply(comment.id)}
                    >
                      Reply
                    </button>
                    <button
                      className="text-xs text-green-600 hover:text-green-800"
                      onClick={() => onResolveComment(comment.id)}
                    >
                      Resolve
                    </button>
                  </>
                )}
                <button
                  className="text-xs text-red-600 hover:text-red-800 ml-2"
                  onClick={() => onDeleteComment(comment.id)}
                >
                  Delete
                </button>
              </div>
            </div>
            
            <p className="text-sm text-gray-700">
              {comment.content}
            </p>
            
            {comment.resolved && (
              <div className="text-xs text-green-600 font-medium">
                ✓ Resolved
              </div>
            )}
          </div>
        </div>

        {/* Reply Input */}
        {replyingTo === comment.id && (
          <div className="mt-2 p-3 bg-gray-50 rounded-md border">
            <textarea
              className="w-full p-2 border rounded-md resize-none text-sm"
              placeholder="Write a reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={2}
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700"
                onClick={() => handleAddReply(comment.id)}
                disabled={!replyText.trim()}
              >
                Add Reply
              </button>
              <button
                className="px-3 py-1 bg-gray-300 text-gray-700 rounded-md text-xs hover:bg-gray-400"
                onClick={handleCancelReply}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Recursive Children Rendering */}
        {hasChildren && !isFolded && (
          <div className="mt-2 space-y-2">
            {comment.children.map(child => (
              <ThreadedComment 
                key={child.id} 
                comment={child as Comment & { children: Comment[]; depth: number }} 
                depth={depth + 1} 
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-gray-900 mb-4">Comments</h3>
        
        {/* Selection Preview */}
        {selectionState.hasSelection && !capturedSelection && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="text-sm text-yellow-800">
              <strong>Selected:</strong> "{selectionState.displayText}"
            </div>
          </div>
        )}

        {/* Captured Selection Display */}
        {capturedSelection && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="text-sm text-blue-800">
              <strong>Commenting on:</strong> "{capturedSelection.displayText}"
            </div>
          </div>
        )}

        {/* Comment Input */}
        <div className="space-y-3">
          <textarea
            ref={commentInputRef}
            className={`w-full p-3 border rounded-md resize-none ${
              isActive 
                ? 'border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200' 
                : 'border-gray-200 bg-gray-100 cursor-not-allowed'
            }`}
            placeholder={
              isActive 
                ? 'Add your comment...' 
                : 'Select text to add a comment...'
            }
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onFocus={handleCommentInputFocus}
            onBlur={handleCommentInputBlur}
            disabled={!isActive}
            rows={3}
          />
          
          <button
            className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
              isActive && commentText.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            onClick={handleAddComment}
            disabled={!isActive || !commentText.trim()}
          >
            Add Comment
          </button>
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {comments.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-8">
            No comments yet. Select text to add the first comment.
          </div>
        ) : (
          buildCommentTree().map(comment => (
            <ThreadedComment key={comment.id} comment={comment} depth={0} />
          ))
        )}
      </div>
    </div>
  );
}