import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import { EnhancedCommentPanel } from '../EnhancedCommentPanel';

// Mock editor with selection capabilities
const createMockEditor = (hasSelection = false, selectedText = '', from = 0, to = 0) => {
  const mockEditor = {
    state: {
      selection: {
        from: hasSelection ? from : 0,
        to: hasSelection ? to : 0,
        empty: !hasSelection
      },
      doc: {
        textBetween: jest.fn((from: number, to: number) => selectedText)
      }
    },
    commands: {
      addCommentHighlight: jest.fn(),
      removeCommentHighlight: jest.fn(),
      setTextSelection: jest.fn()
    },
    on: jest.fn(),
    off: jest.fn(),
    _listeners: new Map(),
    
    // Add event simulation methods
    emit: function(event: string) {
      const listeners = this._listeners.get(event) || [];
      listeners.forEach((listener: Function) => listener());
    },
    
    // Override on/off to track listeners
    _addListener: function(event: string, callback: Function) {
      if (!this._listeners.has(event)) {
        this._listeners.set(event, []);
      }
      this._listeners.get(event)!.push(callback);
    }
  };

  // Override the on method to track listeners
  mockEditor.on = jest.fn((event: string, callback: Function) => {
    mockEditor._addListener(event, callback);
  });

  return mockEditor as any;
};

describe('Threaded Comments', () => {
  const mockProps = {
    currentUser: 'TestUser',
    onAddComment: jest.fn(),
    onResolveComment: jest.fn(),
    onDeleteComment: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show reply button for comments with selection context', () => {
    const commentsWithThread = [
      {
        id: 'parent-comment-1',
        content: 'This is the main comment',
        author: 'User1',
        position: { from: 5, to: 15 },
        threadId: null,
        resolved: false,
        selectedText: 'selected text',
        displayText: 'selected text'
      }
    ];
    
    const editor = createMockEditor(false);
    
    render(
      <EnhancedCommentPanel 
        {...mockProps} 
        comments={commentsWithThread} 
        editor={editor} 
      />
    );
    
    // Should show a reply button for the main comment
    expect(screen.getByText('Reply')).toBeInTheDocument();
  });

  it('should display threaded replies under parent comment', () => {
    const commentsWithReplies = [
      {
        id: 'parent-comment-1',
        content: 'This is the main comment',
        author: 'User1',
        position: { from: 5, to: 15 },
        threadId: null,
        resolved: false,
        selectedText: 'selected text',
        displayText: 'selected text'
      },
      {
        id: 'reply-comment-1',
        content: 'This is a reply to the main comment',
        author: 'User2',
        position: null,
        threadId: 'parent-comment-1',
        resolved: false
      },
      {
        id: 'reply-comment-2',
        content: 'This is another reply',
        author: 'User3',
        position: null,
        threadId: 'parent-comment-1',
        resolved: false
      }
    ];
    
    const editor = createMockEditor(false);
    
    render(
      <EnhancedCommentPanel 
        {...mockProps} 
        comments={commentsWithReplies} 
        editor={editor} 
      />
    );
    
    // Should show main comment
    expect(screen.getByText('This is the main comment')).toBeInTheDocument();
    
    // Should show replies indented under main comment
    expect(screen.getByText('This is a reply to the main comment')).toBeInTheDocument();
    expect(screen.getByText('This is another reply')).toBeInTheDocument();
    
    // Should show selected text context only for parent comment
    expect(screen.getByText(/selected text/)).toBeInTheDocument();
  });

  it('should allow adding a reply to an existing comment', async () => {
    const parentComment = [
      {
        id: 'parent-comment-1',
        content: 'This is the main comment',
        author: 'User1',
        position: { from: 5, to: 15 },
        threadId: null,
        resolved: false,
        selectedText: 'selected text',
        displayText: 'selected text'
      }
    ];
    
    const editor = createMockEditor(false);
    
    render(
      <EnhancedCommentPanel 
        {...mockProps} 
        comments={parentComment} 
        editor={editor} 
      />
    );
    
    // Click the reply button
    const replyButton = screen.getByText('Reply');
    fireEvent.click(replyButton);
    
    // Should show reply input field
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Write a reply...')).toBeInTheDocument();
    });
    
    // Type a reply
    const replyInput = screen.getByPlaceholderText('Write a reply...');
    fireEvent.change(replyInput, { target: { value: 'This is my reply' } });
    
    // Submit the reply
    const addReplyButton = screen.getByText('Add Reply');
    fireEvent.click(addReplyButton);
    
    // Should call onAddComment with threadId set to parent comment ID
    expect(mockProps.onAddComment).toHaveBeenCalledWith({
      content: 'This is my reply',
      author: 'TestUser',
      position: null,
      threadId: 'parent-comment-1'
    });
  });

  it('should group comments by thread correctly', () => {
    const mixedComments = [
      {
        id: 'parent-1',
        content: 'First parent comment',
        author: 'User1',
        position: { from: 5, to: 15 },
        threadId: null,
        resolved: false,
        selectedText: 'first text',
        displayText: 'first text'
      },
      {
        id: 'reply-1-1',
        content: 'Reply to first parent',
        author: 'User2',
        position: null,
        threadId: 'parent-1',
        resolved: false
      },
      {
        id: 'parent-2',
        content: 'Second parent comment',
        author: 'User3',
        position: { from: 20, to: 30 },
        threadId: null,
        resolved: false,
        selectedText: 'second text',
        displayText: 'second text'
      },
      {
        id: 'reply-2-1',
        content: 'Reply to second parent',
        author: 'User4',
        position: null,
        threadId: 'parent-2',
        resolved: false
      }
    ];
    
    const editor = createMockEditor(false);
    
    render(
      <EnhancedCommentPanel 
        {...mockProps} 
        comments={mixedComments} 
        editor={editor} 
      />
    );
    
    // All comments should be visible
    expect(screen.getByText('First parent comment')).toBeInTheDocument();
    expect(screen.getByText('Reply to first parent')).toBeInTheDocument();
    expect(screen.getByText('Second parent comment')).toBeInTheDocument();
    expect(screen.getByText('Reply to second parent')).toBeInTheDocument();
    
    // Should have 2 reply buttons (one for each parent)
    const replyButtons = screen.getAllByText('Reply');
    expect(replyButtons).toHaveLength(2);
  });

  it('should not show reply button for reply comments', () => {
    const commentsWithReplies = [
      {
        id: 'parent-comment-1',
        content: 'This is the main comment',
        author: 'User1',
        position: { from: 5, to: 15 },
        threadId: null,
        resolved: false,
        selectedText: 'selected text',
        displayText: 'selected text'
      },
      {
        id: 'reply-comment-1',
        content: 'This is a reply to the main comment',
        author: 'User2',
        position: null,
        threadId: 'parent-comment-1',
        resolved: false
      }
    ];
    
    const editor = createMockEditor(false);
    
    render(
      <EnhancedCommentPanel 
        {...mockProps} 
        comments={commentsWithReplies} 
        editor={editor} 
      />
    );
    
    // Should only show one reply button (for the parent comment)
    const replyButtons = screen.getAllByText('Reply');
    expect(replyButtons).toHaveLength(1);
  });
});