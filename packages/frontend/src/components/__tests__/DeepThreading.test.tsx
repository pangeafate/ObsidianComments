import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import { EnhancedCommentPanel } from '../EnhancedCommentPanel';

// Mock editor
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

describe('Deep Threading with Folding', () => {
  const mockProps = {
    currentUser: 'TestUser',
    onAddComment: jest.fn(),
    onResolveComment: jest.fn(),
    onDeleteComment: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should support nested replies up to 8 levels deep', async () => {
    const deepComments = [
      {
        id: 'level-1',
        content: 'Level 1 comment',
        author: 'User1',
        position: { from: 5, to: 15 },
        threadId: null,
        resolved: false,
        selectedText: 'selected text',
        displayText: 'selected text'
      },
      {
        id: 'level-2',
        content: 'Level 2 reply',
        author: 'User2',
        position: null,
        threadId: 'level-1',
        resolved: false
      },
      {
        id: 'level-3',
        content: 'Level 3 reply',
        author: 'User3',
        position: null,
        threadId: 'level-2',
        resolved: false
      },
      {
        id: 'level-4',
        content: 'Level 4 reply',
        author: 'User4',
        position: null,
        threadId: 'level-3',
        resolved: false
      },
      {
        id: 'level-5',
        content: 'Level 5 reply',
        author: 'User5',
        position: null,
        threadId: 'level-4',
        resolved: false
      },
      {
        id: 'level-6',
        content: 'Level 6 reply',
        author: 'User6',
        position: null,
        threadId: 'level-5',
        resolved: false
      },
      {
        id: 'level-7',
        content: 'Level 7 reply',
        author: 'User7',
        position: null,
        threadId: 'level-6',
        resolved: false
      },
      {
        id: 'level-8',
        content: 'Level 8 reply',
        author: 'User8',
        position: null,
        threadId: 'level-7',
        resolved: false
      }
    ];
    
    const editor = createMockEditor();
    
    render(
      <EnhancedCommentPanel 
        {...mockProps} 
        comments={deepComments} 
        editor={editor} 
      />
    );
    
    // Initially only level 1 should be visible (threads folded by default)
    expect(screen.getByText('Level 1 comment')).toBeInTheDocument();
    expect(screen.queryByText('Level 2 reply')).not.toBeInTheDocument();
    
    // Unfold all levels by clicking fold toggles
    const level1Toggle = screen.getByTestId('fold-toggle-level-1');
    fireEvent.click(level1Toggle);
    
    await waitFor(() => {
      expect(screen.getByText('Level 2 reply')).toBeInTheDocument();
    });
    
    // Continue unfolding to reveal all levels
    const level2Toggle = screen.getByTestId('fold-toggle-level-2');
    fireEvent.click(level2Toggle);
    
    await waitFor(() => {
      expect(screen.getByText('Level 3 reply')).toBeInTheDocument();
    });
    
    const level3Toggle = screen.getByTestId('fold-toggle-level-3');
    fireEvent.click(level3Toggle);
    
    await waitFor(() => {
      expect(screen.getByText('Level 4 reply')).toBeInTheDocument();
    });
    
    const level4Toggle = screen.getByTestId('fold-toggle-level-4');
    fireEvent.click(level4Toggle);
    
    await waitFor(() => {
      expect(screen.getByText('Level 5 reply')).toBeInTheDocument();
    });
    
    const level5Toggle = screen.getByTestId('fold-toggle-level-5');
    fireEvent.click(level5Toggle);
    
    await waitFor(() => {
      expect(screen.getByText('Level 6 reply')).toBeInTheDocument();
    });
    
    const level6Toggle = screen.getByTestId('fold-toggle-level-6');
    fireEvent.click(level6Toggle);
    
    await waitFor(() => {
      expect(screen.getByText('Level 7 reply')).toBeInTheDocument();
    });
    
    const level7Toggle = screen.getByTestId('fold-toggle-level-7');
    fireEvent.click(level7Toggle);
    
    await waitFor(() => {
      expect(screen.getByText('Level 8 reply')).toBeInTheDocument();
    });
  });

  it('should show reply button on all comments including replies', async () => {
    const nestedComments = [
      {
        id: 'parent',
        content: 'Parent comment',
        author: 'User1',
        position: { from: 5, to: 15 },
        threadId: null,
        resolved: false,
        selectedText: 'selected text',
        displayText: 'selected text'
      },
      {
        id: 'reply-1',
        content: 'First level reply',
        author: 'User2',
        position: null,
        threadId: 'parent',
        resolved: false
      },
      {
        id: 'reply-2',
        content: 'Second level reply',
        author: 'User3',
        position: null,
        threadId: 'reply-1',
        resolved: false
      }
    ];
    
    const editor = createMockEditor();
    
    render(
      <EnhancedCommentPanel 
        {...mockProps} 
        comments={nestedComments} 
        editor={editor} 
      />
    );
    
    // Initially only parent comment should be visible
    expect(screen.getAllByText('Reply')).toHaveLength(1);
    
    // Unfold parent thread
    const parentToggle = screen.getByTestId('fold-toggle-parent');
    fireEvent.click(parentToggle);
    
    await waitFor(() => {
      // Should now have reply buttons for parent + first level reply = 2 total
      expect(screen.getAllByText('Reply')).toHaveLength(2);
    });
    
    // Unfold first level reply thread
    const reply1Toggle = screen.getByTestId('fold-toggle-reply-1');
    fireEvent.click(reply1Toggle);
    
    await waitFor(() => {
      // Should now have reply buttons for all comments (parent + 2 replies = 3 total)
      expect(screen.getAllByText('Reply')).toHaveLength(3);
    });
  });

  it('should show thread folding toggle when thread has children', () => {
    const commentsWithReplies = [
      {
        id: 'parent',
        content: 'Parent comment',
        author: 'User1',
        position: { from: 5, to: 15 },
        threadId: null,
        resolved: false,
        selectedText: 'selected text',
        displayText: 'selected text'
      },
      {
        id: 'reply-1',
        content: 'Reply to parent',
        author: 'User2',
        position: null,
        threadId: 'parent',
        resolved: false
      }
    ];
    
    const editor = createMockEditor();
    
    render(
      <EnhancedCommentPanel 
        {...mockProps} 
        comments={commentsWithReplies} 
        editor={editor} 
      />
    );
    
    // Should show fold/unfold button for parent comment with replies
    expect(screen.getByTestId('fold-toggle-parent')).toBeInTheDocument();
  });

  it('should not show thread folding toggle when comment has no children', () => {
    const commentsWithoutReplies = [
      {
        id: 'standalone',
        content: 'Standalone comment',
        author: 'User1',
        position: { from: 5, to: 15 },
        threadId: null,
        resolved: false,
        selectedText: 'selected text',
        displayText: 'selected text'
      }
    ];
    
    const editor = createMockEditor();
    
    render(
      <EnhancedCommentPanel 
        {...mockProps} 
        comments={commentsWithoutReplies} 
        editor={editor} 
      />
    );
    
    // Should not show fold toggle for comment without replies
    expect(screen.queryByTestId('fold-toggle-standalone')).not.toBeInTheDocument();
  });

  it('should fold thread when fold toggle is clicked', async () => {
    const commentsWithReplies = [
      {
        id: 'parent',
        content: 'Parent comment',
        author: 'User1',
        position: { from: 5, to: 15 },
        threadId: null,
        resolved: false,
        selectedText: 'selected text',
        displayText: 'selected text'
      },
      {
        id: 'reply-1',
        content: 'Reply to parent',
        author: 'User2',
        position: null,
        threadId: 'parent',
        resolved: false
      },
      {
        id: 'reply-2',
        content: 'Second reply',
        author: 'User3',
        position: null,
        threadId: 'reply-1',
        resolved: false
      }
    ];
    
    const editor = createMockEditor();
    
    render(
      <EnhancedCommentPanel 
        {...mockProps} 
        comments={commentsWithReplies} 
        editor={editor} 
      />
    );
    
    // Initially thread should be folded (by default), so replies should not be visible
    expect(screen.queryByText('Reply to parent')).not.toBeInTheDocument();
    expect(screen.queryByText('Nested reply')).not.toBeInTheDocument();
    
    // Click to unfold first
    const foldToggle = screen.getByTestId('fold-toggle-parent');
    fireEvent.click(foldToggle);
    
    await waitFor(() => {
      // First level reply should now be visible
      expect(screen.getByText('Reply to parent')).toBeInTheDocument();
    });
    
    // Need to also unfold the nested reply thread to see "Second reply"
    const reply1Toggle = screen.getByTestId('fold-toggle-reply-1');
    fireEvent.click(reply1Toggle);
    
    await waitFor(() => {
      // Now the nested reply should be visible
      expect(screen.getByText('Second reply')).toBeInTheDocument();
    });
    
    // Click parent fold toggle again to fold the entire thread (get fresh reference)
    const parentFoldToggle = screen.getByTestId('fold-toggle-parent');
    fireEvent.click(parentFoldToggle);
    
    await waitFor(() => {
      // All replies should be hidden again
      expect(screen.queryByText('Reply to parent')).not.toBeInTheDocument();
      expect(screen.queryByText('Second reply')).not.toBeInTheDocument();
    });
  });

  it('should unfold thread when unfold toggle is clicked', async () => {
    const commentsWithReplies = [
      {
        id: 'parent',
        content: 'Parent comment',
        author: 'User1',
        position: { from: 5, to: 15 },
        threadId: null,
        resolved: false,
        selectedText: 'selected text',
        displayText: 'selected text'
      },
      {
        id: 'reply-1',
        content: 'Reply to parent',
        author: 'User2',
        position: null,
        threadId: 'parent',
        resolved: false
      }
    ];
    
    const editor = createMockEditor();
    
    render(
      <EnhancedCommentPanel 
        {...mockProps} 
        comments={commentsWithReplies} 
        editor={editor} 
      />
    );
    
    // Initially thread should be folded (by default), so reply should not be visible
    expect(screen.queryByText('Reply to parent')).not.toBeInTheDocument();
    
    // Click unfold toggle to unfold
    const foldToggle = screen.getByTestId('fold-toggle-parent');
    fireEvent.click(foldToggle);
    
    await waitFor(() => {
      expect(screen.getByText('Reply to parent')).toBeInTheDocument();
    });
  });

  it('should show reply count when thread is folded', async () => {
    const commentsWithMultipleReplies = [
      {
        id: 'parent',
        content: 'Parent comment',
        author: 'User1',
        position: { from: 5, to: 15 },
        threadId: null,
        resolved: false,
        selectedText: 'selected text',
        displayText: 'selected text'
      },
      {
        id: 'reply-1',
        content: 'First reply',
        author: 'User2',
        position: null,
        threadId: 'parent',
        resolved: false
      },
      {
        id: 'reply-2',
        content: 'Second reply',
        author: 'User3',
        position: null,
        threadId: 'parent',
        resolved: false
      },
      {
        id: 'reply-3',
        content: 'Third reply',
        author: 'User4',
        position: null,
        threadId: 'reply-1',
        resolved: false
      }
    ];
    
    const editor = createMockEditor();
    
    render(
      <EnhancedCommentPanel 
        {...mockProps} 
        comments={commentsWithMultipleReplies} 
        editor={editor} 
      />
    );
    
    // Thread should be folded by default, showing reply count
    await waitFor(() => {
      // Should show reply count (3 total replies including nested ones)
      expect(screen.getByText(/3 replies/)).toBeInTheDocument();
    });
  });

  it('should have different indentation levels for nested comments', async () => {
    const deeplyNestedComments = [
      {
        id: 'level-1',
        content: 'Level 1',
        author: 'User1',
        position: { from: 5, to: 15 },
        threadId: null,
        resolved: false,
        selectedText: 'selected text',
        displayText: 'selected text'
      },
      {
        id: 'level-2',
        content: 'Level 2',
        author: 'User2',
        position: null,
        threadId: 'level-1',
        resolved: false
      },
      {
        id: 'level-3',
        content: 'Level 3',
        author: 'User3',
        position: null,
        threadId: 'level-2',
        resolved: false
      }
    ];
    
    const editor = createMockEditor();
    
    render(
      <EnhancedCommentPanel 
        {...mockProps} 
        comments={deeplyNestedComments} 
        editor={editor} 
      />
    );
    
    // Unfold level 1 to reveal level 2
    const level1Toggle = screen.getByTestId('fold-toggle-level-1');
    fireEvent.click(level1Toggle);
    
    await waitFor(() => {
      expect(screen.getByText('Level 2')).toBeInTheDocument();
    });
    
    // Unfold level 2 to reveal level 3
    const level2Toggle = screen.getByTestId('fold-toggle-level-2');
    fireEvent.click(level2Toggle);
    
    await waitFor(() => {
      expect(screen.getByText('Level 3')).toBeInTheDocument();
    });
    
    // Check that different levels have different indentation classes
    const level2Comment = screen.getByText('Level 2').closest('[data-depth]');
    const level3Comment = screen.getByText('Level 3').closest('[data-depth]');
    
    expect(level2Comment).toHaveAttribute('data-depth', '1');
    expect(level3Comment).toHaveAttribute('data-depth', '2');
  });
});