import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NamePrompt } from '../../components/NamePrompt';

describe('NamePrompt Component', () => {
  it('should render the component with initial state', () => {
    const onSubmit = vi.fn();
    render(<NamePrompt onSubmit={onSubmit} />);
    
    expect(screen.getByRole('heading', { name: 'Join Collaboration' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your name...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Join Collaboration' })).toBeDisabled();
  });

  it('should enable submit button when name is entered', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NamePrompt onSubmit={onSubmit} />);
    
    const nameInput = screen.getByPlaceholderText('Enter your name...');
    const submitButton = screen.getByRole('button', { name: 'Join Collaboration' });
    
    expect(submitButton).toBeDisabled();
    
    await user.type(nameInput, 'John Doe');
    
    expect(submitButton).toBeEnabled();
  });

  it('should call onSubmit with trimmed name when form is submitted', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NamePrompt onSubmit={onSubmit} />);
    
    const nameInput = screen.getByPlaceholderText('Enter your name...');
    const submitButton = screen.getByRole('button', { name: 'Join Collaboration' });
    
    await user.type(nameInput, '  John Doe  ');
    await user.click(submitButton);
    
    expect(onSubmit).toHaveBeenCalledWith('John Doe');
  });

  it('should not submit when name is only whitespace', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NamePrompt onSubmit={onSubmit} />);
    
    const nameInput = screen.getByPlaceholderText('Enter your name...');
    const submitButton = screen.getByRole('button', { name: 'Join Collaboration' });
    
    await user.type(nameInput, '   ');
    
    expect(submitButton).toBeDisabled();
    
    fireEvent.click(submitButton);
    
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should show loading state when submitting', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NamePrompt onSubmit={onSubmit} />);
    
    const nameInput = screen.getByPlaceholderText('Enter your name...');
    await user.type(nameInput, 'John Doe');
    
    const submitButton = screen.getByRole('button', { name: 'Join Collaboration' });
    await user.click(submitButton);
    
    expect(screen.getByText('Joining...')).toBeInTheDocument();
  });

  it('should submit form on Enter key press', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NamePrompt onSubmit={onSubmit} />);
    
    const nameInput = screen.getByPlaceholderText('Enter your name...');
    await user.type(nameInput, 'John Doe');
    await user.keyboard('{Enter}');
    
    expect(onSubmit).toHaveBeenCalledWith('John Doe');
  });

  it('should display feature list', () => {
    const onSubmit = vi.fn();
    render(<NamePrompt onSubmit={onSubmit} />);
    
    expect(screen.getByText('What you can do:')).toBeInTheDocument();
    expect(screen.getByText('Real-time collaborative editing')).toBeInTheDocument();
    expect(screen.getByText('Live cursor tracking')).toBeInTheDocument();
    expect(screen.getByText('Comments & discussions')).toBeInTheDocument();
  });
});