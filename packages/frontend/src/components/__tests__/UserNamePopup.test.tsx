import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
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

describe('UserNamePopup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('should show popup when no name is stored', () => {
    const onNameSet = jest.fn();
    
    render(<UserNamePopup onNameSet={onNameSet} />);
    
    expect(screen.getByText('Welcome! Please enter your name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your name...')).toBeInTheDocument();
    expect(screen.getByText('Continue')).toBeInTheDocument();
  });

  it('should not show popup when name is already stored', () => {
    localStorageMock.setItem('obsidian-comments-username', 'John Doe');
    const onNameSet = jest.fn();
    
    render(<UserNamePopup onNameSet={onNameSet} />);
    
    expect(screen.queryByText('Welcome! Please enter your name')).not.toBeInTheDocument();
    expect(onNameSet).toHaveBeenCalledWith('John Doe');
  });

  it('should validate that name is not empty', async () => {
    const onNameSet = jest.fn();
    
    render(<UserNamePopup onNameSet={onNameSet} />);
    
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);
    
    await waitFor(() => {
      expect(screen.getByText('Name cannot be empty')).toBeInTheDocument();
    });
    
    expect(onNameSet).not.toHaveBeenCalled();
  });

  it('should validate that name is not just whitespace', async () => {
    const onNameSet = jest.fn();
    
    render(<UserNamePopup onNameSet={onNameSet} />);
    
    const nameInput = screen.getByPlaceholderText('Enter your name...');
    fireEvent.change(nameInput, { target: { value: '   ' } });
    
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);
    
    await waitFor(() => {
      expect(screen.getByText('Name cannot be empty')).toBeInTheDocument();
    });
    
    expect(onNameSet).not.toHaveBeenCalled();
  });

  it('should save name to localStorage and call onNameSet when valid name entered', async () => {
    const onNameSet = jest.fn();
    
    render(<UserNamePopup onNameSet={onNameSet} />);
    
    const nameInput = screen.getByPlaceholderText('Enter your name...');
    fireEvent.change(nameInput, { target: { value: 'Alice Smith' } });
    
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);
    
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('obsidian-comments-username', 'Alice Smith');
      expect(onNameSet).toHaveBeenCalledWith('Alice Smith');
    });
  });

  it('should handle Enter key press to submit', async () => {
    const onNameSet = jest.fn();
    
    render(<UserNamePopup onNameSet={onNameSet} />);
    
    const nameInput = screen.getByPlaceholderText('Enter your name...');
    fireEvent.change(nameInput, { target: { value: 'Bob Wilson' } });
    fireEvent.keyDown(nameInput, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(onNameSet).toHaveBeenCalledWith('Bob Wilson');
    });
  });

  it('should trim whitespace from entered name', async () => {
    const onNameSet = jest.fn();
    
    render(<UserNamePopup onNameSet={onNameSet} />);
    
    const nameInput = screen.getByPlaceholderText('Enter your name...');
    fireEvent.change(nameInput, { target: { value: '  Charlie Brown  ' } });
    
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);
    
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('obsidian-comments-username', 'Charlie Brown');
      expect(onNameSet).toHaveBeenCalledWith('Charlie Brown');
    });
  });

  it('should clear error when user starts typing again', async () => {
    const onNameSet = jest.fn();
    
    render(<UserNamePopup onNameSet={onNameSet} />);
    
    // Trigger error first
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);
    
    await waitFor(() => {
      expect(screen.getByText('Name cannot be empty')).toBeInTheDocument();
    });
    
    // Start typing
    const nameInput = screen.getByPlaceholderText('Enter your name...');
    fireEvent.change(nameInput, { target: { value: 'D' } });
    
    await waitFor(() => {
      expect(screen.queryByText('Name cannot be empty')).not.toBeInTheDocument();
    });
  });

  it('should show popup with overlay background', () => {
    const onNameSet = jest.fn();
    
    render(<UserNamePopup onNameSet={onNameSet} />);
    
    // Check for modal overlay
    const overlay = screen.getByTestId('user-name-overlay');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveClass('fixed', 'inset-0', 'bg-black', 'bg-opacity-50');
  });

  it('should focus input field when popup opens', () => {
    const onNameSet = jest.fn();
    
    render(<UserNamePopup onNameSet={onNameSet} />);
    
    const nameInput = screen.getByPlaceholderText('Enter your name...');
    expect(nameInput).toHaveFocus();
  });
});