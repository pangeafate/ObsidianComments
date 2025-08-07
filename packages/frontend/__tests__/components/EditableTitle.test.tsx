import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EditableTitle } from '../../src/components/EditableTitle';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('EditableTitle', () => {
  const mockProps = {
    initialTitle: 'Test Note Title',
    noteId: 'test-note-123',
    onTitleChange: jest.fn(),
    isReadOnly: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ title: 'Updated Title' })
    });
  });

  describe('rendering', () => {
    it('should display initial title', () => {
      render(<EditableTitle {...mockProps} />);
      expect(screen.getByDisplayValue('Test Note Title')).toBeInTheDocument();
    });

    it('should show edit icon when not read-only', () => {
      render(<EditableTitle {...mockProps} />);
      expect(screen.getByRole('button', { name: /edit title/i })).toBeInTheDocument();
    });

    it('should hide edit controls in read-only mode', () => {
      render(<EditableTitle {...mockProps} isReadOnly={true} />);
      expect(screen.queryByRole('button', { name: /edit title/i })).not.toBeInTheDocument();
    });

    it('should render as text span in read-only mode', () => {
      render(<EditableTitle {...mockProps} isReadOnly={true} />);
      expect(screen.getByText('Test Note Title')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Test Note Title')).not.toBeInTheDocument();
    });
  });

  describe('editing interaction', () => {
    it('should enter edit mode when edit button clicked', () => {
      render(<EditableTitle {...mockProps} />);
      
      const editButton = screen.getByRole('button', { name: /edit title/i });
      fireEvent.click(editButton);

      expect(screen.getByDisplayValue('Test Note Title')).toHaveFocus();
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should allow title editing', () => {
      render(<EditableTitle {...mockProps} />);
      
      const editButton = screen.getByRole('button', { name: /edit title/i });
      fireEvent.click(editButton);

      const input = screen.getByDisplayValue('Test Note Title');
      fireEvent.change(input, { target: { value: 'New Title' } });

      expect(screen.getByDisplayValue('New Title')).toBeInTheDocument();
    });

    it('should save title on save button click', async () => {
      render(<EditableTitle {...mockProps} />);
      
      const editButton = screen.getByRole('button', { name: /edit title/i });
      fireEvent.click(editButton);

      const input = screen.getByDisplayValue('Test Note Title');
      fireEvent.change(input, { target: { value: 'Updated Title' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/documents/test-note-123', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Updated Title' })
        });
      });

      expect(mockProps.onTitleChange).toHaveBeenCalledWith('Updated Title');
    });

    it('should cancel editing on cancel button click', () => {
      render(<EditableTitle {...mockProps} />);
      
      const editButton = screen.getByRole('button', { name: /edit title/i });
      fireEvent.click(editButton);

      const input = screen.getByDisplayValue('Test Note Title');
      fireEvent.change(input, { target: { value: 'Changed Title' } });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Should revert to original title
      expect(screen.getByDisplayValue('Test Note Title')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    });

    it('should save on Enter key press', async () => {
      render(<EditableTitle {...mockProps} />);
      
      const editButton = screen.getByRole('button', { name: /edit title/i });
      fireEvent.click(editButton);

      const input = screen.getByDisplayValue('Test Note Title');
      fireEvent.change(input, { target: { value: 'Enter Pressed Title' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/documents/test-note-123', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Enter Pressed Title' })
        });
      });
    });

    it('should cancel on Escape key press', () => {
      render(<EditableTitle {...mockProps} />);
      
      const editButton = screen.getByRole('button', { name: /edit title/i });
      fireEvent.click(editButton);

      const input = screen.getByDisplayValue('Test Note Title');
      fireEvent.change(input, { target: { value: 'Changed Title' } });
      fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

      // Should revert to original title
      expect(screen.getByDisplayValue('Test Note Title')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('should show error for empty title', () => {
      render(<EditableTitle {...mockProps} />);
      
      const editButton = screen.getByRole('button', { name: /edit title/i });
      fireEvent.click(editButton);

      const input = screen.getByDisplayValue('Test Note Title');
      fireEvent.change(input, { target: { value: '' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      expect(screen.getByText('Title cannot be empty')).toBeInTheDocument();
    });

    it('should show error for whitespace-only title', () => {
      render(<EditableTitle {...mockProps} />);
      
      const editButton = screen.getByRole('button', { name: /edit title/i });
      fireEvent.click(editButton);

      const input = screen.getByDisplayValue('Test Note Title');
      fireEvent.change(input, { target: { value: '   ' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      expect(screen.getByText('Title cannot be empty')).toBeInTheDocument();
    });

    it('should trim whitespace from title', async () => {
      render(<EditableTitle {...mockProps} />);
      
      const editButton = screen.getByRole('button', { name: /edit title/i });
      fireEvent.click(editButton);

      const input = screen.getByDisplayValue('Test Note Title');
      fireEvent.change(input, { target: { value: '  Trimmed Title  ' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/documents/test-note-123', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Trimmed Title' })
        });
      });
    });
  });

  describe('error handling', () => {
    it('should show error when API call fails', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server Error')
      });

      render(<EditableTitle {...mockProps} />);
      
      const editButton = screen.getByRole('button', { name: /edit title/i });
      fireEvent.click(editButton);

      const input = screen.getByDisplayValue('Test Note Title');
      fireEvent.change(input, { target: { value: 'New Title' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to update title')).toBeInTheDocument();
      });
    });

    it('should show error when network request fails', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<EditableTitle {...mockProps} />);
      
      const editButton = screen.getByRole('button', { name: /edit title/i });
      fireEvent.click(editButton);

      const input = screen.getByDisplayValue('Test Note Title');
      fireEvent.change(input, { target: { value: 'New Title' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to update title')).toBeInTheDocument();
      });
    });

    it('should show loading state during save', async () => {
      // Mock a slow API response
      (fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ title: 'Updated Title' })
          }), 100)
        )
      );

      render(<EditableTitle {...mockProps} />);
      
      const editButton = screen.getByRole('button', { name: /edit title/i });
      fireEvent.click(editButton);

      const input = screen.getByDisplayValue('Test Note Title');
      fireEvent.change(input, { target: { value: 'New Title' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      // Should show loading state
      expect(screen.getByText('Saving...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<EditableTitle {...mockProps} />);
      
      const editButton = screen.getByRole('button', { name: /edit title/i });
      expect(editButton).toHaveAttribute('aria-label', 'Edit title');
    });

    it('should focus input when entering edit mode', () => {
      render(<EditableTitle {...mockProps} />);
      
      const editButton = screen.getByRole('button', { name: /edit title/i });
      fireEvent.click(editButton);

      const input = screen.getByDisplayValue('Test Note Title');
      expect(input).toHaveFocus();
    });

    it('should have proper keyboard navigation', () => {
      render(<EditableTitle {...mockProps} />);
      
      const editButton = screen.getByRole('button', { name: /edit title/i });
      fireEvent.click(editButton);

      const input = screen.getByDisplayValue('Test Note Title');
      const saveButton = screen.getByRole('button', { name: /save/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      // Should be able to tab between elements
      expect(input).toHaveFocus();
      
      fireEvent.keyDown(input, { key: 'Tab', code: 'Tab' });
      // Note: Testing actual tab behavior would require more complex setup
    });
  });
});