import { render, screen, fireEvent } from '@testing-library/react';
import { CommentPanel } from '../CommentPanel';
import { Comment } from '../../hooks/useComments';

const mockComments: Comment[] = [
  {
    id: 'comment-1',
    content: 'This is a test comment',
    author: 'Alice',
    position: { from: 10, to: 20 },
    threadId: null,
    resolved: false,
    createdAt: '2024-01-01T10:00:00Z',
  },
  {
    id: 'comment-2',
    content: 'This is a reply',
    author: 'Bob',
    position: null,
    threadId: 'comment-1',
    resolved: false,
    createdAt: '2024-01-01T10:05:00Z',
  },
  {
    id: 'comment-3',
    content: 'Another comment',
    author: 'Charlie',
    position: { from: 30, to: 40 },
    threadId: null,
    resolved: true,
    createdAt: '2024-01-01T10:10:00Z',
  },
];

const mockFunctions = {
  onAddComment: jest.fn(),
  onResolveComment: jest.fn(),
  onDeleteComment: jest.fn(),
};

describe('CommentPanel Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all comments', () => {
    render(
      <CommentPanel
        comments={mockComments}
        currentUser="TestUser"
        {...mockFunctions}
      />
    );

    expect(screen.getByText('This is a test comment')).toBeInTheDocument();
    expect(screen.getByText('This is a reply')).toBeInTheDocument();
    expect(screen.getByText('Another comment')).toBeInTheDocument();
  });

  it('should show comment authors', () => {
    render(
      <CommentPanel
        comments={mockComments}
        currentUser="TestUser"
        {...mockFunctions}
      />
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('should show resolved status', () => {
    render(
      <CommentPanel
        comments={mockComments}
        currentUser="TestUser"
        {...mockFunctions}
      />
    );

    const resolvedComments = screen.getAllByText(/resolved/i);
    expect(resolvedComments).toHaveLength(1);
  });

  it('should group threaded comments', () => {
    render(
      <CommentPanel
        comments={mockComments}
        currentUser="TestUser"
        {...mockFunctions}
      />
    );

    // Should have 2 top-level comment threads
    const threads = screen.getAllByTestId('comment-thread');
    expect(threads).toHaveLength(2);
  });

  it('should handle adding a new comment', () => {
    render(
      <CommentPanel
        comments={[]}
        currentUser="TestUser"
        {...mockFunctions}
      />
    );

    const input = screen.getByPlaceholderText(/add a comment/i);
    const addButton = screen.getByText(/add comment/i);

    fireEvent.change(input, { target: { value: 'New test comment' } });
    fireEvent.click(addButton);

    expect(mockFunctions.onAddComment).toHaveBeenCalledWith({
      content: 'New test comment',
      author: 'TestUser',
      position: null,
      threadId: null,
    });
  });

  it('should handle resolving a comment', () => {
    render(
      <CommentPanel
        comments={mockComments}
        currentUser="TestUser"
        {...mockFunctions}
      />
    );

    const resolveButtons = screen.getAllByText(/resolve/i);
    fireEvent.click(resolveButtons[0]);

    expect(mockFunctions.onResolveComment).toHaveBeenCalledWith('comment-1');
  });

  it('should handle deleting a comment', () => {
    render(
      <CommentPanel
        comments={mockComments}
        currentUser="TestUser"
        {...mockFunctions}
      />
    );

    const deleteButtons = screen.getAllByText(/delete/i);
    fireEvent.click(deleteButtons[0]);

    expect(mockFunctions.onDeleteComment).toHaveBeenCalledWith('comment-1');
  });

  it('should allow replying to comments', () => {
    render(
      <CommentPanel
        comments={mockComments}
        currentUser="TestUser"
        {...mockFunctions}
      />
    );

    const replyButtons = screen.getAllByText(/reply/i);
    fireEvent.click(replyButtons[0]);

    const replyInput = screen.getByPlaceholderText(/write a reply/i);
    const submitButton = screen.getByText(/submit reply/i);

    fireEvent.change(replyInput, { target: { value: 'This is a reply' } });
    fireEvent.click(submitButton);

    expect(mockFunctions.onAddComment).toHaveBeenCalledWith({
      content: 'This is a reply',
      author: 'TestUser',
      position: null,
      threadId: 'comment-1',
    });
  });

  it('should filter out resolved comments when hideResolved is true', () => {
    render(
      <CommentPanel
        comments={mockComments}
        currentUser="TestUser"
        hideResolved={true}
        {...mockFunctions}
      />
    );

    expect(screen.queryByText('Another comment')).not.toBeInTheDocument();
    expect(screen.getByText('This is a test comment')).toBeInTheDocument();
  });
});