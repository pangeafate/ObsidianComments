import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewNoteButton } from '../NewNoteButton';

// Mock window.open
const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true,
});

// Mock crypto.randomUUID
const mockRandomUUID = jest.fn();

// Create crypto mock if it doesn't exist
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: mockRandomUUID,
  },
  writable: true,
});

describe('NewNoteButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRandomUUID.mockReturnValue('test-uuid-12345');
  });

  it('should render the New Note button', () => {
    render(<NewNoteButton />);
    
    expect(screen.getByText('New Note')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New Note' })).toBeInTheDocument();
  });

  it('should generate a new document ID and open in new tab when clicked', () => {
    render(<NewNoteButton />);
    
    const newNoteButton = screen.getByText('New Note');
    fireEvent.click(newNoteButton);
    
    expect(mockRandomUUID).toHaveBeenCalledTimes(1);
    expect(mockWindowOpen).toHaveBeenCalledWith(
      '/editor/test-uuid-12345',
      '_blank'
    );
  });

  it('should use timestamp-based ID if crypto.randomUUID is not available', () => {
    // Mock crypto.randomUUID to be undefined
    Object.defineProperty(global, 'crypto', {
      value: {
        randomUUID: undefined,
      },
      writable: true,
    });

    // Mock Date.now
    const mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1642771200000);
    const mockMathRandom = jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
    
    render(<NewNoteButton />);
    
    const newNoteButton = screen.getByText('New Note');
    fireEvent.click(newNoteButton);
    
    expect(mockWindowOpen).toHaveBeenCalledWith(
      '/editor/1642771200000-123456789',
      '_blank'
    );
    
    mockDateNow.mockRestore();
    mockMathRandom.mockRestore();
  });

  it('should handle window.open failure gracefully', () => {
    mockWindowOpen.mockReturnValue(null);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    render(<NewNoteButton />);
    
    const newNoteButton = screen.getByText('New Note');
    fireEvent.click(newNoteButton);
    
    expect(mockWindowOpen).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('Failed to open new note');
    
    consoleSpy.mockRestore();
  });

  it('should have proper button styling and hover effects', () => {
    render(<NewNoteButton />);
    
    const button = screen.getByRole('button', { name: 'New Note' });
    expect(button).toHaveClass('bg-green-600');
    expect(button).toHaveClass('text-white');
    expect(button).toHaveClass('hover:bg-green-700');
    expect(button).toHaveClass('transition-colors');
  });

  it('should include an icon in the button', () => {
    render(<NewNoteButton />);
    
    // Check for SVG icon (plus icon)
    const svg = screen.getByRole('button').querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('w-4', 'h-4');
  });

  it('should generate different IDs on multiple clicks', () => {
    render(<NewNoteButton />);
    
    const newNoteButton = screen.getByText('New Note');
    
    fireEvent.click(newNoteButton);
    const firstCall = mockWindowOpen.mock.calls[0][0];
    
    fireEvent.click(newNoteButton);
    const secondCall = mockWindowOpen.mock.calls[1][0];
    
    fireEvent.click(newNoteButton);
    const thirdCall = mockWindowOpen.mock.calls[2][0];
    
    // All calls should have different document IDs
    expect(firstCall).not.toEqual(secondCall);
    expect(secondCall).not.toEqual(thirdCall);
    expect(firstCall).not.toEqual(thirdCall);
    
    // All should start with /editor/
    expect(firstCall).toMatch(/^\/editor\/.+/);
    expect(secondCall).toMatch(/^\/editor\/.+/);
    expect(thirdCall).toMatch(/^\/editor\/.+/);
    
    expect(mockWindowOpen).toHaveBeenCalledTimes(3);
  });

  it('should open new tab with relative URL format', () => {
    render(<NewNoteButton />);
    
    const newNoteButton = screen.getByText('New Note');
    fireEvent.click(newNoteButton);
    
    // Verify that window.open was called with correct format
    expect(mockWindowOpen).toHaveBeenCalledTimes(1);
    const [url, target] = mockWindowOpen.mock.calls[0];
    
    expect(url).toMatch(/^\/editor\/.+/); // Should start with /editor/
    expect(target).toBe('_blank'); // Should open in new tab
    
    // URL should not be empty after /editor/
    const documentId = url.replace('/editor/', '');
    expect(documentId.length).toBeGreaterThan(0);
  });

  it('should be accessible with proper ARIA attributes', () => {
    render(<NewNoteButton />);
    
    const button = screen.getByRole('button', { name: 'New Note' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('title', 'Create a new document');
  });
});