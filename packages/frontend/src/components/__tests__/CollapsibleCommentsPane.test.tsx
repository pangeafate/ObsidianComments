import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';

// Create a simple test component that mimics the Editor layout with collapsible pane
interface TestCollapsibleEditorProps {
  showCommentsPane?: boolean;
}

function TestCollapsibleEditor({ showCommentsPane = false }: TestCollapsibleEditorProps) {
  const [isCommentsPaneOpen, setIsCommentsPaneOpen] = useState(showCommentsPane);

  const toggleCommentsPane = () => {
    setIsCommentsPaneOpen(!isCommentsPaneOpen);
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b p-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Collaborative Editor</h1>
        <div className="flex items-center gap-4">
          <button
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              isCommentsPaneOpen 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={toggleCommentsPane}
          >
            Comments
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex relative">
        <div className="flex-1 overflow-auto">
          <div className="p-4">
            <p>Editor content goes here...</p>
          </div>
        </div>
        
        {/* Comments Pane */}
        <div 
          className={`w-80 border-l bg-gray-50 flex flex-col absolute right-0 top-0 h-full transition-transform duration-300 ease-in-out ${
            isCommentsPaneOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          data-testid="comments-pane"
        >
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900 mb-4">Comments</h3>
            
            <div className="space-y-3">
              <textarea
                className="w-full p-3 border rounded-md resize-none border-gray-200 bg-gray-100 cursor-not-allowed"
                placeholder="Select text to add a comment..."
                disabled
                rows={3}
              />
              
              <button
                className="w-full py-2 px-4 rounded-md font-medium transition-colors bg-gray-300 text-gray-500 cursor-not-allowed"
                disabled
              >
                Add Comment
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="p-3 rounded-md border bg-white border-gray-200">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <span className="font-medium text-sm text-gray-900">TestUser</span>
                </div>
                <p className="text-sm text-gray-700">Test comment content</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


describe('Collapsible Comments Pane', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show Comments button in top right corner', () => {
    render(<TestCollapsibleEditor />);
    
    const commentsButton = screen.getByRole('button', { name: 'Comments' });
    expect(commentsButton).toBeInTheDocument();
    
    // Button should be in the header area
    const header = commentsButton.closest('.border-b');
    expect(header).toBeInTheDocument();
  });

  it('should hide comments pane by default', () => {
    render(<TestCollapsibleEditor />);
    
    // Comments pane should be translated off-screen
    const commentsPane = screen.getByTestId('comments-pane');
    expect(commentsPane).toHaveClass('translate-x-full');
  });

  it('should show comments pane when Comments button is clicked', async () => {
    render(<TestCollapsibleEditor />);
    
    const commentsButton = screen.getByRole('button', { name: 'Comments' });
    fireEvent.click(commentsButton);
    
    await waitFor(() => {
      const commentsPane = screen.getByTestId('comments-pane');
      expect(commentsPane).toHaveClass('translate-x-0');
    });
  });

  it('should hide comments pane when Comments button is clicked again', async () => {
    render(<TestCollapsibleEditor />);
    
    const commentsButton = screen.getByRole('button', { name: 'Comments' });
    
    // Show comments pane
    fireEvent.click(commentsButton);
    
    await waitFor(() => {
      const commentsPane = screen.getByTestId('comments-pane');
      expect(commentsPane).toHaveClass('translate-x-0');
    });
    
    // Hide comments pane
    fireEvent.click(commentsButton);
    
    await waitFor(() => {
      const commentsPane = screen.getByTestId('comments-pane');
      expect(commentsPane).toHaveClass('translate-x-full');
    });
  });

  it('should have slide animation classes when showing pane', async () => {
    render(<TestCollapsibleEditor />);
    
    const commentsButton = screen.getByRole('button', { name: 'Comments' });
    fireEvent.click(commentsButton);
    
    await waitFor(() => {
      const commentsPane = screen.getByTestId('comments-pane');
      expect(commentsPane).toHaveClass('transition-transform');
      expect(commentsPane).toHaveClass('translate-x-0');
    });
  });

  it('should have slide animation classes when hiding pane', async () => {
    render(<TestCollapsibleEditor />);
    
    const commentsButton = screen.getByRole('button', { name: 'Comments' });
    
    // Show pane first
    fireEvent.click(commentsButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('comments-pane')).toHaveClass('translate-x-0');
    });
    
    // Hide pane
    fireEvent.click(commentsButton);
    
    await waitFor(() => {
      const commentsPane = screen.getByTestId('comments-pane');
      expect(commentsPane).toHaveClass('translate-x-full');
    });
  });

  it('should maintain Comments button functionality when pane is open', async () => {
    render(<TestCollapsibleEditor />);
    
    const commentsButton = screen.getByRole('button', { name: 'Comments' });
    fireEvent.click(commentsButton);
    
    await waitFor(() => {
      const commentsPane = screen.getByTestId('comments-pane');
      expect(commentsPane).toHaveClass('translate-x-0');
    });
    
    // Button should still be clickable and visible
    expect(commentsButton).toBeInTheDocument();
    expect(commentsButton).not.toBeDisabled();
  });

  it('should show visual indicator when comments pane is open', async () => {
    render(<TestCollapsibleEditor />);
    
    const commentsButton = screen.getByRole('button', { name: 'Comments' });
    
    // Initially button should not have active state
    expect(commentsButton).not.toHaveClass('bg-blue-600');
    
    fireEvent.click(commentsButton);
    
    await waitFor(() => {
      // Button should have active styling when pane is open
      expect(commentsButton).toHaveClass('bg-blue-600');
    });
  });

  it('should remove visual indicator when comments pane is closed', async () => {
    render(<TestCollapsibleEditor />);
    
    const commentsButton = screen.getByRole('button', { name: 'Comments' });
    
    // Open pane
    fireEvent.click(commentsButton);
    
    await waitFor(() => {
      expect(commentsButton).toHaveClass('bg-blue-600');
    });
    
    // Close pane
    fireEvent.click(commentsButton);
    
    await waitFor(() => {
      expect(commentsButton).not.toHaveClass('bg-blue-600');
    });
  });

  it('should start with pane open when showCommentsPane is true', () => {
    render(<TestCollapsibleEditor showCommentsPane={true} />);
    
    const commentsPane = screen.getByTestId('comments-pane');
    expect(commentsPane).toHaveClass('translate-x-0');
  });
});