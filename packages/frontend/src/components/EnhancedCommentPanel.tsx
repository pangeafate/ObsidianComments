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
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Truncate text to 7 words with ellipsis
  const truncateText = (text: string, maxWords: number = 7): string => {
    const words = text.trim().split(/\s+/);
    if (words.length <= maxWords) {
      return text;
    }
    return words.slice(0, maxWords).join(' ') + '...';
  };

  // Group comments by thread
  const groupCommentsByThread = () => {
    const parentComments = comments.filter(comment => !comment.threadId);
    const threadsMap = new Map<string, Comment[]>();
    
    // Group replies by parent comment ID
    comments.forEach(comment => {
      if (comment.threadId) {
        if (!threadsMap.has(comment.threadId)) {
          threadsMap.set(comment.threadId, []);
        }
        threadsMap.get(comment.threadId)!.push(comment);
      }
    });
    
    return { parentComments, threadsMap };
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

  return (
    <div className="w-80 border-l bg-gray-50 flex flex-col">
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
          (() => {
            const { parentComments, threadsMap } = groupCommentsByThread();
            
            return parentComments.map((comment) => (
              <div key={comment.id} className="space-y-2">
                {/* Parent Comment */}
                <div
                  className={`p-3 rounded-md border ${
                    comment.resolved 
                      ? 'bg-gray-100 border-gray-200 opacity-75' 
                      : 'bg-white border-gray-200'
                  }`}
                >
                  {/* Selected Text Context */}
                  {comment.displayText && (
                    <div className="mb-2 p-2 bg-yellow-50 border-l-4 border-yellow-400 text-sm">
                      <span className="text-yellow-800 font-medium">
                        "{comment.displayText}"
                      </span>
                    </div>
                  )}

                  {/* Comment Content */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <span className="font-medium text-sm text-gray-900">
                        {comment.author}
                      </span>
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
                  <div className="ml-4 p-3 bg-gray-50 rounded-md border">
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

                {/* Thread Replies */}
                {threadsMap.has(comment.id) && (
                  <div className="ml-4 space-y-2">
                    {threadsMap.get(comment.id)!.map((reply) => (
                      <div
                        key={reply.id}
                        className={`p-3 rounded-md border ${
                          reply.resolved 
                            ? 'bg-gray-100 border-gray-200 opacity-75' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <span className="font-medium text-sm text-gray-900">
                              {reply.author}
                            </span>
                            <div className="flex gap-1">
                              {!reply.resolved && (
                                <button
                                  className="text-xs text-green-600 hover:text-green-800"
                                  onClick={() => onResolveComment(reply.id)}
                                >
                                  Resolve
                                </button>
                              )}
                              <button
                                className="text-xs text-red-600 hover:text-red-800 ml-2"
                                onClick={() => onDeleteComment(reply.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-700">
                            {reply.content}
                          </p>
                          
                          {reply.resolved && (
                            <div className="text-xs text-green-600 font-medium">
                              ✓ Resolved
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ));
          })()
        )}
      </div>
    </div>
  );
}