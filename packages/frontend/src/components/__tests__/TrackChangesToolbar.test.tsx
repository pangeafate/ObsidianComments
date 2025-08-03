import { render, screen, fireEvent } from '@testing-library/react';
import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TrackChanges } from '../../extensions/TrackChanges';
import { TrackChangesToolbar } from '../TrackChangesToolbar';

// Mock the editor
const mockEditor = {
  commands: {
    acceptAllChanges: jest.fn(),
    toggleTrackChanges: jest.fn(),
  },
  getHTML: jest.fn(() => '<p>Test content</p>'),
  state: {
    doc: {
      descendants: jest.fn()
    }
  },
  on: jest.fn(),
  off: jest.fn(),
  extensionManager: {
    extensions: [
      { name: 'trackChanges', options: { enabled: true } }
    ]
  }
} as any;

describe('TrackChangesToolbar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Accept All Changes functionality', () => {
    it('should render Accept All Changes button', () => {
      render(<TrackChangesToolbar editor={mockEditor} />);
      expect(screen.getByText('Accept All Changes')).toBeInTheDocument();
    });

    it('should call acceptAllChanges when button is clicked', () => {
      // Mock track changes present so button is enabled
      const mockDescendants = jest.fn((callback) => {
        callback({
          isText: true,
          marks: [{ type: { name: 'trackChange' }, attrs: { userId: 'user-1' } }]
        }, 0);
      });
      
      mockEditor.state.doc.descendants = mockDescendants;
      
      render(<TrackChangesToolbar editor={mockEditor} />);
      
      const acceptButton = screen.getByText('Accept All Changes');
      fireEvent.click(acceptButton);
      
      expect(mockEditor.commands.acceptAllChanges).toHaveBeenCalledTimes(1);
    });

    it('should show track changes count when present', () => {
      // Mock track changes detection
      const mockDescendants = jest.fn((callback) => {
        // Simulate a node with track changes
        callback({
          isText: true,
          marks: [{ type: { name: 'trackChange' }, attrs: { userId: 'user-1' } }]
        }, 0);
      });
      
      mockEditor.state.doc.descendants = mockDescendants;
      
      render(<TrackChangesToolbar editor={mockEditor} />);
      
      expect(screen.getByText('1 change pending')).toBeInTheDocument();
    });

    it('should disable accept button when no changes present', () => {
      // Mock no track changes
      const mockDescendants = jest.fn((callback) => {
        // Simulate a node without track changes
        callback({
          isText: true,
          marks: []
        }, 0);
      });
      
      mockEditor.state.doc.descendants = mockDescendants;
      
      render(<TrackChangesToolbar editor={mockEditor} />);
      
      const acceptButton = screen.getByText('Accept All Changes');
      expect(acceptButton).toBeDisabled();
    });
  });

  describe('Track Changes Toggle functionality', () => {
    it('should render toggle track changes button', () => {
      render(<TrackChangesToolbar editor={mockEditor} />);
      expect(screen.getByText('Track Changes')).toBeInTheDocument();
    });

    it('should call toggleTrackChanges when toggle button is clicked', () => {
      render(<TrackChangesToolbar editor={mockEditor} />);
      
      const toggleButton = screen.getByText('Track Changes');
      fireEvent.click(toggleButton);
      
      expect(mockEditor.commands.toggleTrackChanges).toHaveBeenCalledTimes(1);
    });

    it('should show active state when track changes is enabled', () => {
      const activeEditor = {
        ...mockEditor,
        extensionManager: {
          extensions: [
            { name: 'trackChanges', options: { enabled: true } }
          ]
        }
      };

      render(<TrackChangesToolbar editor={activeEditor} />);
      
      const toggleButton = screen.getByText('Track Changes');
      expect(toggleButton).toHaveClass('bg-blue-100');
    });
  });

  describe('User Color Legend', () => {
    it('should display active users with their colors', () => {
      // Mock multiple users with track changes
      const mockDescendants = jest.fn((callback) => {
        callback({
          isText: true,
          marks: [{ type: { name: 'trackChange' }, attrs: { userId: 'user-1', userName: 'Alice' } }]
        }, 0);
        callback({
          isText: true,
          marks: [{ type: { name: 'trackChange' }, attrs: { userId: 'user-2', userName: 'Bob' } }]
        }, 10);
      });
      
      mockEditor.state.doc.descendants = mockDescendants;
      
      render(<TrackChangesToolbar editor={mockEditor} />);
      
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('should show unique users only once', () => {
      // Mock duplicate user entries
      const mockDescendants = jest.fn((callback) => {
        callback({
          isText: true,
          marks: [{ type: { name: 'trackChange' }, attrs: { userId: 'user-1', userName: 'Alice' } }]
        }, 0);
        callback({
          isText: true,
          marks: [{ type: { name: 'trackChange' }, attrs: { userId: 'user-1', userName: 'Alice' } }]
        }, 10);
      });
      
      mockEditor.state.doc.descendants = mockDescendants;
      
      render(<TrackChangesToolbar editor={mockEditor} />);
      
      const aliceElements = screen.getAllByText('Alice');
      expect(aliceElements).toHaveLength(1);
    });
  });
});