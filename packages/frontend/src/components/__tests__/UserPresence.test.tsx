import React from 'react';
import { render, screen } from '@testing-library/react';
import { UserPresence } from '../UserPresence';

interface User {
  name: string;
  color: string;
}

describe('UserPresence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render anything when no users are provided', () => {
    const { container } = render(<UserPresence users={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should display "Active users:" label when users are present', () => {
    const users: User[] = [
      { name: 'John Doe', color: '#3B82F6' }
    ];
    
    render(<UserPresence users={users} />);
    expect(screen.getByText('Active users:')).toBeInTheDocument();
  });

  it('should display single user with correct initial and background color', () => {
    const users: User[] = [
      { name: 'Alice Smith', color: '#EF4444' }
    ];
    
    render(<UserPresence users={users} />);
    
    const userAvatar = screen.getByText('A');
    expect(userAvatar).toBeInTheDocument();
    expect(userAvatar).toHaveStyle('background-color: #EF4444');
    expect(userAvatar).toHaveAttribute('title', 'Alice Smith');
  });

  it('should display multiple users with correct initials and colors', () => {
    const users: User[] = [
      { name: 'John Doe', color: '#3B82F6' },
      { name: 'Alice Smith', color: '#EF4444' },
      { name: 'Bob Wilson', color: '#10B981' }
    ];
    
    render(<UserPresence users={users} />);
    
    const johnAvatar = screen.getByText('J');
    const aliceAvatar = screen.getByText('A');
    const bobAvatar = screen.getByText('B');
    
    expect(johnAvatar).toBeInTheDocument();
    expect(johnAvatar).toHaveStyle('background-color: #3B82F6');
    expect(johnAvatar).toHaveAttribute('title', 'John Doe');
    
    expect(aliceAvatar).toBeInTheDocument();
    expect(aliceAvatar).toHaveStyle('background-color: #EF4444');
    expect(aliceAvatar).toHaveAttribute('title', 'Alice Smith');
    
    expect(bobAvatar).toBeInTheDocument();
    expect(bobAvatar).toHaveStyle('background-color: #10B981');
    expect(bobAvatar).toHaveAttribute('title', 'Bob Wilson');
  });

  it('should handle empty name by showing question mark', () => {
    const users: User[] = [
      { name: '', color: '#6B7280' }
    ];
    
    render(<UserPresence users={users} />);
    
    const userAvatar = screen.getByText('?');
    expect(userAvatar).toBeInTheDocument();
    expect(userAvatar).toHaveStyle('background-color: #6B7280');
  });

  it('should handle undefined name by showing question mark', () => {
    const users: User[] = [
      { name: undefined as any, color: '#6B7280' }
    ];
    
    render(<UserPresence users={users} />);
    
    const userAvatar = screen.getByText('?');
    expect(userAvatar).toBeInTheDocument();
  });

  it('should handle null name by showing question mark', () => {
    const users: User[] = [
      { name: null as any, color: '#6B7280' }
    ];
    
    render(<UserPresence users={users} />);
    
    const userAvatar = screen.getByText('?');
    expect(userAvatar).toBeInTheDocument();
  });

  it('should display first letter in uppercase even if name is lowercase', () => {
    const users: User[] = [
      { name: 'charlie brown', color: '#8B5CF6' }
    ];
    
    render(<UserPresence users={users} />);
    
    const userAvatar = screen.getByText('C');
    expect(userAvatar).toBeInTheDocument();
  });

  it('should handle names with special characters by taking first character', () => {
    const users: User[] = [
      { name: '@alice_dev', color: '#F59E0B' },
      { name: '123numeric', color: '#EC4899' }
    ];
    
    render(<UserPresence users={users} />);
    
    expect(screen.getByText('@')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should have proper styling classes for avatars', () => {
    const users: User[] = [
      { name: 'Test User', color: '#3B82F6' }
    ];
    
    render(<UserPresence users={users} />);
    
    const userAvatar = screen.getByText('T');
    expect(userAvatar).toHaveClass(
      'w-8', 'h-8', 'rounded-full', 'border-2', 'border-white', 
      'flex', 'items-center', 'justify-center', 'text-xs', 'font-semibold'
    );
  });

  it('should have overlapping avatars when multiple users', () => {
    const users: User[] = [
      { name: 'Alice', color: '#3B82F6' },
      { name: 'Bob', color: '#EF4444' }
    ];
    
    render(<UserPresence users={users} />);
    
    // Find the container with the avatars
    const avatarsContainer = screen.getByText('A').parentElement;
    expect(avatarsContainer).toHaveClass('-space-x-2');
  });
});