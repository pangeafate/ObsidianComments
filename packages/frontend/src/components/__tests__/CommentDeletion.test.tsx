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

describe('Comment Deletion Highlight Removal', () => {
  const mockProps = {
    currentUser: 'TestUser',
    onAddComment: jest.fn(),
    onResolveComment: jest.fn(),
    onDeleteComment: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should remove highlight when comment with selection is deleted', async () => {
    const commentsWithHighlights = [
      {
        id: 'comment-highlight-1',
        content: 'This is a comment on selected text',
        author: 'User1',
        position: { from: 5, to: 15 },
        threadId: null,
        resolved: false,
        selectedText: 'highlighted text',
        displayText: 'highlighted text'
      }
    ];
    
    const editor = createMockEditor(false);
    
    render(
      <EnhancedCommentPanel 
        {...mockProps} 
        comments={commentsWithHighlights} 
        editor={editor} 
      />
    );
    
    // Find and click delete button for the comment
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    
    // Verify that onDeleteComment was called with the correct comment ID
    expect(mockProps.onDeleteComment).toHaveBeenCalledWith('comment-highlight-1');
  });

  it('should not affect other comments when deleting a specific comment', async () => {
    const multipleComments = [
      {
        id: 'comment-1',
        content: 'First comment',
        author: 'User1',
        position: { from: 5, to: 15 },
        threadId: null,
        resolved: false,
        selectedText: 'first text',
        displayText: 'first text'
      },
      {
        id: 'comment-2',
        content: 'Second comment',
        author: 'User2',
        position: { from: 20, to: 30 },
        threadId: null,
        resolved: false,
        selectedText: 'second text',
        displayText: 'second text'
      }
    ];
    
    const editor = createMockEditor(false);
    
    render(
      <EnhancedCommentPanel 
        {...mockProps} 
        comments={multipleComments} 
        editor={editor} 
      />
    );
    
    // Find delete buttons (there should be 2)
    const deleteButtons = screen.getAllByText('Delete');
    expect(deleteButtons).toHaveLength(2);
    
    // Click the first delete button
    fireEvent.click(deleteButtons[0]);
    
    // Verify only the first comment was deleted
    expect(mockProps.onDeleteComment).toHaveBeenCalledWith('comment-1');
    expect(mockProps.onDeleteComment).toHaveBeenCalledTimes(1);
  });
});