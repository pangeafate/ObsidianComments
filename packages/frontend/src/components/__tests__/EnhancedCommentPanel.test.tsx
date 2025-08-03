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

const mockComments = [
  {
    id: 'comment-1',
    content: 'This is a test comment',
    author: 'User1',
    position: { from: 5, to: 15 },
    threadId: null,
    resolved: false
  }
];

describe('EnhancedCommentPanel', () => {
  const mockProps = {
    comments: mockComments,
    currentUser: 'TestUser',
    onAddComment: jest.fn(),
    onResolveComment: jest.fn(),
    onDeleteComment: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Selection-based comment activation', () => {
    it('should show inactive state when no text is selected', () => {
      const editor = createMockEditor(false);
      
      render(<EnhancedCommentPanel {...mockProps} editor={editor} />);
      
      const addButton = screen.getByText('Add Comment');
      const commentInput = screen.getByPlaceholderText('Select text to add a comment...');
      
      expect(addButton).toBeDisabled();
      expect(commentInput).toBeDisabled();
    });

    it('should activate when text is selected', async () => {
      const editor = createMockEditor(true, 'selected text', 5, 18);
      
      render(<EnhancedCommentPanel {...mockProps} editor={editor} />);
      
      // Simulate selection change
      await act(async () => {
        editor.emit('selectionUpdate');
      });
      
      await waitFor(() => {
        const commentInput = screen.getByPlaceholderText('Add your comment...');
        
        // Input should be enabled when text is selected
        expect(commentInput).not.toBeDisabled();
        
        // Button should still be disabled until comment text is entered
        const addButton = screen.getByText('Add Comment');
        expect(addButton).toBeDisabled();
        
        // Should show selection preview
        expect(screen.getByText(/Selected:/)).toBeInTheDocument();
      });
    });

    it('should show selected text preview when text is selected', async () => {
      const editor = createMockEditor(true, 'This is some selected text', 10, 35);
      
      render(<EnhancedCommentPanel {...mockProps} editor={editor} />);
      
      // Simulate selection change
      await act(async () => {
        editor.emit('selectionUpdate');
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Selected:/)).toBeInTheDocument();
        expect(screen.getByText(/This is some selected text/)).toBeInTheDocument();
      });
    });

    it('should capture selection when comment input gets focus', async () => {
      const editor = createMockEditor(true, 'selected text for comment', 5, 30);
      
      render(<EnhancedCommentPanel {...mockProps} editor={editor} />);
      
      // Simulate selection change
      await act(async () => {
        editor.emit('selectionUpdate');
      });
      
      await waitFor(() => {
        const commentInput = screen.getByPlaceholderText('Add your comment...');
        fireEvent.focus(commentInput);
        
        // Selection should be captured for comment creation
        expect(screen.getByText(/Commenting on:/)).toBeInTheDocument();
        expect(screen.getByText(/selected text for comment/)).toBeInTheDocument();
      });
    });
  });

  describe('Text truncation for long selections', () => {
    it('should truncate long selected text to 7 words with ellipsis', async () => {
      const longText = 'This is a very long piece of selected text that should be truncated properly';
      const editor = createMockEditor(true, longText, 5, 80);
      
      render(<EnhancedCommentPanel {...mockProps} editor={editor} />);
      
      await act(async () => {
        editor.emit('selectionUpdate');
      });
      
      await waitFor(() => {
        // Should show truncated version (7 words + ...)
        expect(screen.getByText(/Selected:/)).toBeInTheDocument();
        expect(screen.getByText(/This is a very long piece of\.\.\./)).toBeInTheDocument();
      });
    });

    it('should not truncate short selected text', async () => {
      const shortText = 'short selection';
      const editor = createMockEditor(true, shortText, 5, 20);
      
      render(<EnhancedCommentPanel {...mockProps} editor={editor} />);
      
      await act(async () => {
        editor.emit('selectionUpdate');
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Selected:/)).toBeInTheDocument();
        expect(screen.getByText(/short selection/)).toBeInTheDocument();
      });
    });

    it('should create comment with truncated text in comment display', async () => {
      const longText = 'This is a very long piece of selected text that should be truncated in the comment display';
      const editor = createMockEditor(true, longText, 5, 95);
      
      render(<EnhancedCommentPanel {...mockProps} editor={editor} />);
      
      // Simulate selection and focus
      await act(async () => {
        editor.emit('selectionUpdate');
      });
      
      await waitFor(async () => {
        const commentInput = screen.getByPlaceholderText('Add your comment...');
        fireEvent.focus(commentInput);
        
        fireEvent.change(commentInput, { target: { value: 'My comment on this text' } });
        
        const addButton = screen.getByText('Add Comment');
        fireEvent.click(addButton);
        
        expect(mockProps.onAddComment).toHaveBeenCalledWith({
          content: 'My comment on this text',
          author: 'TestUser',
          position: { from: 5, to: 95 },
          threadId: null,
          selectedText: longText,
          displayText: 'This is a very long piece of...'
        });
      });
    });
  });

  describe('Comment creation with selection', () => {
    it('should create comment with correct selection data', async () => {
      const selectedText = 'important text';
      const editor = createMockEditor(true, selectedText, 10, 24);
      
      render(<EnhancedCommentPanel {...mockProps} editor={editor} />);
      
      // Simulate selection and comment creation
      await act(async () => {
        editor.emit('selectionUpdate');
      });
      
      await waitFor(async () => {
        const commentInput = screen.getByPlaceholderText('Add your comment...');
        fireEvent.focus(commentInput);
        fireEvent.change(commentInput, { target: { value: 'This needs clarification' } });
        
        const addButton = screen.getByText('Add Comment');
        fireEvent.click(addButton);
        
        expect(mockProps.onAddComment).toHaveBeenCalledWith({
          content: 'This needs clarification',
          author: 'TestUser',
          position: { from: 10, to: 24 },
          threadId: null,
          selectedText: 'important text',
          displayText: 'important text'
        });
      });
    });

    it('should clear selection state after comment creation', async () => {
      const editor = createMockEditor(true, 'selected text', 5, 18);
      
      render(<EnhancedCommentPanel {...mockProps} editor={editor} />);
      
      await act(async () => {
        editor.emit('selectionUpdate');
      });
      
      await waitFor(async () => {
        const commentInput = screen.getByPlaceholderText('Add your comment...');
        fireEvent.focus(commentInput);
        fireEvent.change(commentInput, { target: { value: 'Test comment' } });
        
        const addButton = screen.getByText('Add Comment');
        fireEvent.click(addButton);
      });
      
      // Clear editor selection to simulate user clicking elsewhere
      editor.state.selection.from = 0;
      editor.state.selection.to = 0;
      editor.state.selection.empty = true;
      
      await act(async () => {
        editor.emit('selectionUpdate');
      });
      
      // Wait for state to clear after comment creation and selection cleared
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Select text to add a comment...')).toBeInTheDocument();
        expect(screen.getByText('Add Comment')).toBeDisabled();
      });
    });

    it('should call onAddComment with correct data when comment is created', async () => {
      const editor = createMockEditor(true, 'highlighted text', 8, 23);
      
      render(<EnhancedCommentPanel {...mockProps} editor={editor} />);
      
      await act(async () => {
        editor.emit('selectionUpdate');
      });
      
      await waitFor(async () => {
        const commentInput = screen.getByPlaceholderText('Add your comment...');
        fireEvent.focus(commentInput);
        fireEvent.change(commentInput, { target: { value: 'Comment text' } });
        
        const addButton = screen.getByText('Add Comment');
        fireEvent.click(addButton);
        
        // Should call onAddComment with position data (Editor will handle highlight)
        expect(mockProps.onAddComment).toHaveBeenCalledWith({
          content: 'Comment text',
          author: 'TestUser',
          position: { from: 8, to: 23 },
          threadId: null,
          selectedText: 'highlighted text',
          displayText: 'highlighted text'
        });
      });
    });
  });

  describe('Enhanced comment display', () => {
    it('should display comments with selected text context', () => {
      const commentsWithSelection = [
        {
          id: 'comment-1',
          content: 'This needs clarification',
          author: 'User1',
          position: { from: 5, to: 15 },
          threadId: null,
          resolved: false,
          selectedText: 'original selected text',
          displayText: 'original selected...'
        }
      ];
      
      const editor = createMockEditor(false);
      
      render(<EnhancedCommentPanel {...mockProps} comments={commentsWithSelection} editor={editor} />);
      
      expect(screen.getByText(/original selected\.\.\./)).toBeInTheDocument();
      expect(screen.getByText('This needs clarification')).toBeInTheDocument();
    });

    it('should handle comments without selected text context', () => {
      const editor = createMockEditor(false);
      
      render(<EnhancedCommentPanel {...mockProps} editor={editor} />);
      
      // Should still display regular comments
      expect(screen.getByText('This is a test comment')).toBeInTheDocument();
    });
  });
});