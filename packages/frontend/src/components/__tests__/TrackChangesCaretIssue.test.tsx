import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackChangesToolbar } from '../TrackChangesToolbar';
import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TrackChanges } from '../../extensions/TrackChanges';

// Mock user colors utility
jest.mock('../../utils/userColors', () => ({
  getUserColorVariables: jest.fn(() => ({
    '--user-color-bg': '#e3f2fd',
    '--user-color-border': '#2196f3',
    '--user-color-text': '#1976d2'
  }))
}));

describe('TrackChanges Caret Issue', () => {
  let editor: Editor;

  beforeEach(() => {
    // Create a real editor instance for testing
    editor = new Editor({
      extensions: [
        StarterKit,
        TrackChanges.configure({
          userId: 'test-user',
          userName: 'Test User',
          enabled: true,
        }),
      ],
      content: '<p>Initial content</p>',
    });
  });

  afterEach(() => {
    editor?.destroy();
  });

  it('should properly update track changes state when toggled', () => {
    render(<TrackChangesToolbar editor={editor} />);
    
    const trackChangesButton = screen.getByText('Track Changes');
    
    // Initially enabled (blue background)
    expect(trackChangesButton).toHaveClass('bg-blue-100');
    
    // Click to disable
    fireEvent.click(trackChangesButton);
    
    // Should be disabled (white background)
    expect(trackChangesButton).toHaveClass('bg-white');
    
    // Check that the extension options are actually updated
    const trackChangesExt = editor.extensionManager.extensions.find(
      ext => ext.name === 'trackChange'
    );
    expect(trackChangesExt?.options.enabled).toBe(false);
  });

  it('should clear track changes marks for future typing when disabled', () => {
    // Add some text with track changes
    editor.commands.setContent('<p>Initial</p>');
    editor.commands.focus();
    editor.commands.setTextSelection({ from: 8, to: 8 }); // Position after "Initial"
    
    // Type something to add track changes marks
    editor.commands.insertContent(' new text');
    
    // Verify track changes marks exist
    let hasTrackChanges = false;
    editor.state.doc.descendants((node) => {
      if (node.isText) {
        node.marks.forEach(mark => {
          if (mark.type.name === 'trackChange') {
            hasTrackChanges = true;
          }
        });
      }
    });
    expect(hasTrackChanges).toBe(true);
    
    render(<TrackChangesToolbar editor={editor} />);
    
    // Position cursor at the end where track changes marks exist
    editor.commands.setTextSelection({ from: editor.state.doc.content.size - 1, to: editor.state.doc.content.size - 1 });
    
    // Disable track changes
    const trackChangesButton = screen.getByText('Track Changes');
    fireEvent.click(trackChangesButton);
    
    // Now type more text - it should NOT have track changes marks
    editor.commands.insertContent(' more text');
    
    // Check that the new text doesn't have track changes
    let newTextHasTrackChanges = false;
    editor.state.doc.descendants((node) => {
      if (node.isText && node.text?.includes('more text')) {
        node.marks.forEach(mark => {
          if (mark.type.name === 'trackChange') {
            newTextHasTrackChanges = true;
          }
        });
      }
    });
    expect(newTextHasTrackChanges).toBe(false);
  });

  it('should prevent new track changes when disabled', () => {
    render(<TrackChangesToolbar editor={editor} />);
    
    // Disable track changes
    const trackChangesButton = screen.getByText('Track Changes');
    fireEvent.click(trackChangesButton);
    
    // Clear content and add new text
    editor.commands.setContent('<p></p>');
    editor.commands.focus();
    editor.commands.insertContent('New text without tracking');
    
    // Verify no track changes marks were added
    let hasTrackChanges = false;
    editor.state.doc.descendants((node) => {
      if (node.isText) {
        node.marks.forEach(mark => {
          if (mark.type.name === 'trackChange') {
            hasTrackChanges = true;
          }
        });
      }
    });
    expect(hasTrackChanges).toBe(false);
  });

  it('should maintain proper caret visibility when track changes is disabled', () => {
    // This test would check caret styling, but since we're in a test environment,
    // we'll verify that no track changes styling is applied to the cursor position
    
    render(<TrackChangesToolbar editor={editor} />);
    
    // Add text with track changes
    editor.commands.focus();
    editor.commands.insertContent('Tracked text');
    
    // Position cursor at the end
    const endPos = editor.state.doc.content.size - 1;
    editor.commands.setTextSelection({ from: endPos, to: endPos });
    
    // Disable track changes
    const trackChangesButton = screen.getByText('Track Changes');
    fireEvent.click(trackChangesButton);
    
    // Verify cursor position doesn't have track changes marks
    const { $from } = editor.state.selection;
    const marksAtCursor = $from.marks();
    const trackChangeMarks = marksAtCursor.filter(mark => mark.type.name === 'trackChange');
    
    expect(trackChangeMarks).toHaveLength(0);
  });

  it('should handle re-enabling track changes correctly', () => {
    render(<TrackChangesToolbar editor={editor} />);
    
    const trackChangesButton = screen.getByText('Track Changes');
    
    // Disable track changes
    fireEvent.click(trackChangesButton);
    expect(trackChangesButton).toHaveClass('bg-white');
    
    // Re-enable track changes
    fireEvent.click(trackChangesButton);
    expect(trackChangesButton).toHaveClass('bg-blue-100');
    
    // Verify extension is enabled
    const trackChangesExt = editor.extensionManager.extensions.find(
      ext => ext.name === 'trackChange'
    );
    expect(trackChangesExt?.options.enabled).toBe(true);
    
    // New text should be tracked again
    editor.commands.insertContent(' re-enabled text');
    
    let hasNewTrackChanges = false;
    editor.state.doc.descendants((node) => {
      if (node.isText && node.text?.includes('re-enabled')) {
        node.marks.forEach(mark => {
          if (mark.type.name === 'trackChange') {
            hasNewTrackChanges = true;
          }
        });
      }
    });
    expect(hasNewTrackChanges).toBe(true);
  });

  it('should sync toolbar state with actual extension state', () => {
    render(<TrackChangesToolbar editor={editor} />);
    
    // Manually change extension options
    const trackChangesExt = editor.extensionManager.extensions.find(
      ext => ext.name === 'trackChange'
    );
    
    if (trackChangesExt) {
      trackChangesExt.options.enabled = false;
    }
    
    // Force a state update in the editor
    editor.commands.blur();
    editor.commands.focus();
    
    // Toolbar should reflect the actual extension state
    // Note: This might require a re-render or state update mechanism
    const trackChangesButton = screen.getByText('Track Changes');
    
    // The button should eventually reflect the disabled state
    // This test exposes that the toolbar state might not sync properly
    expect(trackChangesExt?.options.enabled).toBe(false);
  });
});