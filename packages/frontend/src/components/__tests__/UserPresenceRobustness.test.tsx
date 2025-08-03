import React from 'react';
import { render, screen } from '@testing-library/react';
import { UserPresence } from '../UserPresence';

interface User {
  name: string;
  color: string;
}

describe('UserPresence Robustness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle whitespace-only names correctly', () => {
    const users: User[] = [
      { name: '   ', color: '#6B7280' }, // Spaces only
      { name: '\t\n', color: '#8B5CF6' }, // Tabs and newlines
      { name: '', color: '#EF4444' }, // Empty string
    ];
    
    render(<UserPresence users={users} />);
    
    // All should show question marks since names are effectively empty
    const questionMarks = screen.getAllByText('?');
    expect(questionMarks).toHaveLength(3);
  });

  it('should handle users without name property gracefully', () => {
    const users: any[] = [
      { color: '#3B82F6' }, // Missing name property
      { name: undefined, color: '#EF4444' }, // Undefined name
      { name: null, color: '#10B981' }, // Null name
    ];
    
    render(<UserPresence users={users} />);
    
    // All should show question marks
    const questionMarks = screen.getAllByText('?');
    expect(questionMarks).toHaveLength(3);
  });

  it('should show first character even for names that start with numbers or symbols', () => {
    const users: User[] = [
      { name: '123User', color: '#3B82F6' },
      { name: '@developer', color: '#EF4444' },
      { name: '#hashtag', color: '#10B981' },
      { name: '!exclamation', color: '#8B5CF6' },
    ];
    
    render(<UserPresence users={users} />);
    
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('@')).toBeInTheDocument();
    expect(screen.getByText('#')).toBeInTheDocument();
    expect(screen.getByText('!')).toBeInTheDocument();
  });

  it('should handle names with emojis correctly', () => {
    const users: User[] = [
      { name: '😀 Happy User', color: '#3B82F6' },
      { name: '🚀 Rocket Dev', color: '#EF4444' },
    ];
    
    render(<UserPresence users={users} />);
    
    // Check that avatars are created with proper titles containing emojis
    const avatars = screen.getAllByRole('presentation');
    expect(avatars).toHaveLength(2);
    
    // Verify titles contain the full names with emojis
    expect(screen.getByTitle('😀 Happy User')).toBeInTheDocument();
    expect(screen.getByTitle('🚀 Rocket Dev')).toBeInTheDocument();
    
    // Since emojis might not render in test environment, just verify they don't show ?
    // (names starting with emojis should not be treated as empty)
    const questionMarks = screen.queryAllByText('?');
    expect(questionMarks).toHaveLength(0);
  });

  it('should work with very long names', () => {
    const users: User[] = [
      { name: 'ThisIsAVeryLongUsernameButWeOnlyShowFirstCharacter', color: '#3B82F6' },
    ];
    
    render(<UserPresence users={users} />);
    
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('should be case insensitive for display but preserve original case', () => {
    const users: User[] = [
      { name: 'alice', color: '#3B82F6' },
      { name: 'BOB', color: '#EF4444' },
      { name: 'Charlie', color: '#10B981' },
    ];
    
    render(<UserPresence users={users} />);
    
    // Should convert to uppercase for display
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    
    // But preserve original name in title
    expect(screen.getByText('A')).toHaveAttribute('title', 'alice');
    expect(screen.getByText('B')).toHaveAttribute('title', 'BOB');
    expect(screen.getByText('C')).toHaveAttribute('title', 'Charlie');
  });

  it('should handle user arrays with mixed valid and invalid entries', () => {
    const users: any[] = [
      { name: 'Valid User', color: '#3B82F6' },
      { name: '', color: '#EF4444' },
      { name: 'Another Valid', color: '#10B981' },
      { color: '#8B5CF6' }, // Missing name
      { name: '   ', color: '#F59E0B' }, // Whitespace only
    ];
    
    render(<UserPresence users={users} />);
    
    // Should show proper initials for valid users
    expect(screen.getByText('V')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    
    // Should show question marks for invalid users
    const questionMarks = screen.getAllByText('?');
    expect(questionMarks).toHaveLength(3);
  });

  it('should maintain consistent styling regardless of name validity', () => {
    const users: any[] = [
      { name: 'Valid', color: '#3B82F6' },
      { name: '', color: '#EF4444' },
    ];
    
    render(<UserPresence users={users} />);
    
    const validAvatar = screen.getByText('V');
    const invalidAvatar = screen.getByText('?');
    
    // Both should have the same CSS classes
    const expectedClasses = [
      'w-8', 'h-8', 'rounded-full', 'border-2', 'border-white',
      'flex', 'items-center', 'justify-center', 'text-xs', 'font-semibold'
    ];
    
    expectedClasses.forEach(className => {
      expect(validAvatar).toHaveClass(className);
      expect(invalidAvatar).toHaveClass(className);
    });
  });
});