import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserNamePopup } from '../UserNamePopup';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('User Name Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('should show popup when no username is stored', () => {
    const mockOnNameSet = jest.fn();
    
    render(<UserNamePopup onNameSet={mockOnNameSet} />);
    
    // Should show the popup
    expect(screen.getByText('Welcome! Please enter your name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your name...')).toBeInTheDocument();
  });

  it('should not show popup when username is already stored', () => {
    localStorageMock.setItem('obsidian-comments-username', 'StoredUser');
    const mockOnNameSet = jest.fn();
    
    const { container } = render(<UserNamePopup onNameSet={mockOnNameSet} />);
    
    // Should not show popup (component returns null)
    expect(container.firstChild).toBeNull();
    
    // Should call onNameSet with stored username
    expect(mockOnNameSet).toHaveBeenCalledWith('StoredUser');
  });

  it('should save username and call onNameSet when form is submitted', async () => {
    const mockOnNameSet = jest.fn();
    
    render(<UserNamePopup onNameSet={mockOnNameSet} />);
    
    // Enter a username
    const input = screen.getByPlaceholderText('Enter your name...');
    fireEvent.change(input, { target: { value: 'NewUser' } });
    
    // Submit the form
    const submitButton = screen.getByText('Continue');
    fireEvent.click(submitButton);
    
    // Should save to localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith('obsidian-comments-username', 'NewUser');
    
    // Should call onNameSet
    expect(mockOnNameSet).toHaveBeenCalledWith('NewUser');
    
    // Should hide popup
    await waitFor(() => {
      expect(screen.queryByText('Welcome! Please enter your name')).not.toBeInTheDocument();
    });
  });

  it('should show error for empty username', () => {
    const mockOnNameSet = jest.fn();
    
    render(<UserNamePopup onNameSet={mockOnNameSet} />);
    
    // Try to submit without entering name
    const submitButton = screen.getByText('Continue');
    fireEvent.click(submitButton);
    
    // Should show error
    expect(screen.getByText('Name cannot be empty')).toBeInTheDocument();
    
    // Should not call onNameSet or save to storage
    expect(mockOnNameSet).not.toHaveBeenCalled();
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('should show error for whitespace-only username', () => {
    const mockOnNameSet = jest.fn();
    
    render(<UserNamePopup onNameSet={mockOnNameSet} />);
    
    // Enter whitespace-only name
    const input = screen.getByPlaceholderText('Enter your name...');
    fireEvent.change(input, { target: { value: '   ' } });
    
    const submitButton = screen.getByText('Continue');
    fireEvent.click(submitButton);
    
    // Should show error
    expect(screen.getByText('Name cannot be empty')).toBeInTheDocument();
    
    // Should not call onNameSet or save to storage
    expect(mockOnNameSet).not.toHaveBeenCalled();
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('should trim whitespace from valid usernames', () => {
    const mockOnNameSet = jest.fn();
    
    render(<UserNamePopup onNameSet={mockOnNameSet} />);
    
    // Enter name with extra whitespace
    const input = screen.getByPlaceholderText('Enter your name...');
    fireEvent.change(input, { target: { value: '  ValidUser  ' } });
    
    const submitButton = screen.getByText('Continue');
    fireEvent.click(submitButton);
    
    // Should save trimmed name
    expect(localStorageMock.setItem).toHaveBeenCalledWith('obsidian-comments-username', 'ValidUser');
    expect(mockOnNameSet).toHaveBeenCalledWith('ValidUser');
  });

  it('should clear error when user starts typing', () => {
    const mockOnNameSet = jest.fn();
    
    render(<UserNamePopup onNameSet={mockOnNameSet} />);
    
    // First trigger an error
    const submitButton = screen.getByText('Continue');
    fireEvent.click(submitButton);
    expect(screen.getByText('Name cannot be empty')).toBeInTheDocument();
    
    // Start typing to clear error
    const input = screen.getByPlaceholderText('Enter your name...');
    fireEvent.change(input, { target: { value: 'U' } });
    
    // Error should be cleared
    expect(screen.queryByText('Name cannot be empty')).not.toBeInTheDocument();
  });

  it('should submit form when Enter key is pressed', () => {
    const mockOnNameSet = jest.fn();
    
    render(<UserNamePopup onNameSet={mockOnNameSet} />);
    
    // Enter a username
    const input = screen.getByPlaceholderText('Enter your name...');
    fireEvent.change(input, { target: { value: 'EnterUser' } });
    
    // Press Enter
    fireEvent.keyDown(input, { key: 'Enter' });
    
    // Should save and call onNameSet
    expect(localStorageMock.setItem).toHaveBeenCalledWith('obsidian-comments-username', 'EnterUser');
    expect(mockOnNameSet).toHaveBeenCalledWith('EnterUser');
  });

  it('should focus input when popup is shown', async () => {
    const mockOnNameSet = jest.fn();
    
    render(<UserNamePopup onNameSet={mockOnNameSet} />);
    
    const input = screen.getByPlaceholderText('Enter your name...');
    
    // Input should be focused
    await waitFor(() => {
      expect(input).toHaveFocus();
    });
  });
});