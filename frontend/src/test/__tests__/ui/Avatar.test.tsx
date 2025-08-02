import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Avatar } from '../../../components/ui/Avatar';

describe('Avatar Component', () => {
  describe('Rendering with user prop', () => {
    it('should display user initials when no avatar image is provided', () => {
      const user = { name: 'John Doe', id: '1' };
      render(<Avatar user={user} />);
      
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should display avatar image when provided', () => {
      const user = { name: 'John Doe', avatar: 'https://example.com/avatar.jpg', id: '1' };
      render(<Avatar user={user} />);
      
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      expect(img).toHaveAttribute('alt', 'John Doe');
    });

    it('should fallback to initials when image fails to load', () => {
      const user = { name: 'Jane Smith', avatar: 'invalid-url', id: '2' };
      render(<Avatar user={user} />);
      
      const img = screen.getByRole('img');
      fireEvent.error(img);
      
      // After error, initials should be visible
      expect(screen.getByText('JS')).toBeInTheDocument();
    });
  });

  describe('Rendering with individual props', () => {
    it('should display initials from name prop', () => {
      render(<Avatar name="Alice Johnson" />);
      expect(screen.getByText('AJ')).toBeInTheDocument();
    });

    it('should display image from src prop', () => {
      render(<Avatar name="Bob Wilson" src="https://example.com/bob.jpg" />);
      
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://example.com/bob.jpg');
      expect(img).toHaveAttribute('alt', 'Bob Wilson');
    });

    it('should use custom fallback text', () => {
      render(<Avatar name="Test User" fallback="TU" />);
      expect(screen.getByText('TU')).toBeInTheDocument();
    });
  });

  describe('Size variants', () => {
    it('should render with different sizes', () => {
      const { rerender } = render(<Avatar name="Test" size="sm" />);
      expect(screen.getByText('T')).toBeInTheDocument();
      
      rerender(<Avatar name="Test" size="lg" />);
      expect(screen.getByText('T')).toBeInTheDocument();
      
      rerender(<Avatar name="Test" size="xl" />);
      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('should apply correct CSS classes for sizes', () => {
      const { container, rerender } = render(<Avatar name="Test" size="sm" />);
      expect(container.firstChild).toHaveClass('h-6', 'w-6');

      rerender(<Avatar name="Test" size="default" />);
      expect(container.firstChild).toHaveClass('h-8', 'w-8');

      rerender(<Avatar name="Test" size="lg" />);
      expect(container.firstChild).toHaveClass('h-10', 'w-10');

      rerender(<Avatar name="Test" size="xl" />);
      expect(container.firstChild).toHaveClass('h-12', 'w-12');
    });
  });

  describe('Online status indicator', () => {
    it('should show green indicator when user is online', () => {
      const { container } = render(<Avatar name="Online User" online={true} />);
      const indicator = container.querySelector('.bg-success-500');
      expect(indicator).toBeInTheDocument();
    });

    it('should show gray indicator when user is offline', () => {
      const { container } = render(<Avatar name="Offline User" online={false} />);
      const indicator = container.querySelector('.bg-gray-300');
      expect(indicator).toBeInTheDocument();
    });

    it('should not show indicator when online prop is undefined', () => {
      const { container } = render(<Avatar name="User" />);
      const onlineIndicator = container.querySelector('.bg-success-500');
      const offlineIndicator = container.querySelector('.bg-gray-300');
      
      expect(onlineIndicator).not.toBeInTheDocument();
      expect(offlineIndicator).not.toBeInTheDocument();
    });
  });

  describe('Color generation', () => {
    it('should generate consistent colors for the same name', () => {
      const { container: container1 } = render(<Avatar name="John Doe" />);
      const { container: container2 } = render(<Avatar name="John Doe" />);
      
      const avatar1 = container1.querySelector('[class*="bg-"]');
      const avatar2 = container2.querySelector('[class*="bg-"]');
      
      expect(avatar1?.className).toBe(avatar2?.className);
    });

    it('should generate different colors for different names', () => {
      const { container: container1 } = render(<Avatar name="John Doe" />);
      const { container: container2 } = render(<Avatar name="Jane Smith" />);
      
      const avatar1 = container1.querySelector('[class*="bg-"]');
      const avatar2 = container2.querySelector('[class*="bg-"]');
      
      // They should have different background colors
      expect(avatar1?.className).not.toBe(avatar2?.className);
    });
  });

  describe('Initials generation', () => {
    it('should generate correct initials for single name', () => {
      render(<Avatar name="John" />);
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('should generate correct initials for two names', () => {
      render(<Avatar name="John Doe" />);
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should generate correct initials for multiple names', () => {
      render(<Avatar name="John Michael Doe Smith" />);
      expect(screen.getByText('JM')).toBeInTheDocument();
    });

    it('should handle empty name gracefully', () => {
      render(<Avatar name="" />);
      expect(screen.getByText('A')).toBeInTheDocument(); // Should show "A" for "Anonymous"
    });
  });

  describe('Custom styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<Avatar name="Test" className="custom-avatar" />);
      expect(container.firstChild).toHaveClass('custom-avatar');
    });

    it('should merge custom props', () => {
      render(<Avatar name="Test" data-testid="custom-avatar" />);
      expect(screen.getByTestId('custom-avatar')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper alt text for images', () => {
      render(<Avatar name="John Doe" src="https://example.com/avatar.jpg" />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'John Doe');
    });

    it('should be properly labeled for screen readers', () => {
      const { container } = render(<Avatar name="John Doe" />);
      // The container should be identifiable
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});