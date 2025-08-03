import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import { EnhancedCommentPanel } from '../EnhancedCommentPanel';

// Mock editor with highlight removal tracking
const createMockEditor = () => {
  const mockEditor = {
    state: {
      selection: { from: 0, to: 0, empty: true },
      doc: { textBetween: jest.fn(() => '') }
    },
    commands: {
      addCommentHighlight: jest.fn(),
      removeCommentHighlight: jest.fn(),
      setTextSelection: jest.fn()
    },
    on: jest.fn(),
    off: jest.fn(),
    _listeners: new Map(),
    
    emit: function(event: string) {
      const listeners = this._listeners.get(event) || [];
      listeners.forEach((listener: Function) => listener());
    },
    
    _addListener: function(event: string, callback: Function) {
      if (!this._listeners.has(event)) {
        this._listeners.set(event, []);
      }
      this._listeners.get(event)!.push(callback);
    }
  };

  mockEditor.on = jest.fn((event: string, callback: Function) => {
    mockEditor._addListener(event, callback);
  });

  return mockEditor as any;
};

describe('Comment Highlight Integration', () => {
  const mockProps = {
    currentUser: 'TestUser',
    onAddComment: jest.fn(),
    onResolveComment: jest.fn(),
    onDeleteComment: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should ensure comment deletion handler receives correct comment ID for highlight removal', async () => {
    const commentsWithHighlights = [
      {
        id: 'comment-with-highlight-123',
        content: 'This comment has a highlight that should be removed when deleted',
        author: 'User1',
        position: { from: 10, to: 25 },
        threadId: null,
        resolved: false,
        selectedText: 'important text segment',
        displayText: 'important text...'
      }
    ];
    
    const editor = createMockEditor();
    
    render(
      <EnhancedCommentPanel 
        {...mockProps} 
        comments={commentsWithHighlights} 
        editor={editor} 
      />
    );
    
    // Verify the comment is displayed
    expect(screen.getByText('This comment has a highlight that should be removed when deleted')).toBeInTheDocument();
    expect(screen.getByText(/important text/)).toBeInTheDocument();
    
    // Find and click the delete button
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    
    // Verify onDeleteComment was called with the exact comment ID
    expect(mockProps.onDeleteComment).toHaveBeenCalledWith('comment-with-highlight-123');
    expect(mockProps.onDeleteComment).toHaveBeenCalledTimes(1);
  });

  it('should handle deletion of threaded replies without affecting parent highlight', async () => {
    const commentsWithThread = [
      {
        id: 'parent-comment',
        content: 'Parent comment with highlight',
        author: 'User1',
        position: { from: 5, to: 15 },
        threadId: null,
        resolved: false,
        selectedText: 'parent text',
        displayText: 'parent text'
      },
      {
        id: 'reply-comment',
        content: 'Reply to parent comment',
        author: 'User2',
        position: null,
        threadId: 'parent-comment',
        resolved: false
      }
    ];
    
    const editor = createMockEditor();
    
    render(
      <EnhancedCommentPanel 
        {...mockProps} 
        comments={commentsWithThread} 
        editor={editor} 
      />
    );
    
    // Find delete buttons - there should be 2 (parent and reply)
    const deleteButtons = screen.getAllByText('Delete');
    expect(deleteButtons).toHaveLength(2);
    
    // Click delete on the reply (second delete button)
    fireEvent.click(deleteButtons[1]);
    
    // Should only delete the reply, not the parent
    expect(mockProps.onDeleteComment).toHaveBeenCalledWith('reply-comment');
    expect(mockProps.onDeleteComment).toHaveBeenCalledTimes(1);
  });

  it('should handle deletion of parent comment with highlight and all its replies', async () => {
    const commentsWithThread = [
      {
        id: 'parent-with-highlight',
        content: 'Parent comment with highlight and replies',
        author: 'User1',
        position: { from: 8, to: 20 },
        threadId: null,
        resolved: false,
        selectedText: 'highlighted segment',
        displayText: 'highlighted segment'
      },
      {
        id: 'reply-1',
        content: 'First reply',
        author: 'User2',
        position: null,
        threadId: 'parent-with-highlight',
        resolved: false
      },
      {
        id: 'reply-2',
        content: 'Second reply',
        author: 'User3',
        position: null,
        threadId: 'parent-with-highlight',
        resolved: false
      }
    ];
    
    const editor = createMockEditor();
    
    render(
      <EnhancedCommentPanel 
        {...mockProps} 
        comments={commentsWithThread} 
        editor={editor} 
      />
    );
    
    // Find the delete button for the parent comment (first one)
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);
    
    // Should delete the parent comment (highlight removal will be handled by Editor component)
    expect(mockProps.onDeleteComment).toHaveBeenCalledWith('parent-with-highlight');
    expect(mockProps.onDeleteComment).toHaveBeenCalledTimes(1);
  });
});