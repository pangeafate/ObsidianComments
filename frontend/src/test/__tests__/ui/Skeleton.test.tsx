import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { 
  Skeleton, 
  DocumentSkeleton, 
  CommentSkeleton, 
  ContributorSkeleton 
} from '../../../components/ui/Skeleton';

describe('Skeleton Components', () => {
  describe('Skeleton (Base Component)', () => {
    it('should render with default classes', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild as HTMLElement;
      
      expect(skeleton).toHaveClass('animate-pulse', 'rounded-md', 'bg-gray-200');
    });

    it('should apply custom className', () => {
      const { container } = render(<Skeleton className="h-4 w-full custom-class" />);
      const skeleton = container.firstChild as HTMLElement;
      
      expect(skeleton).toHaveClass('h-4', 'w-full', 'custom-class');
    });

    it('should forward additional props', () => {
      render(<Skeleton data-testid="custom-skeleton" />);
      expect(screen.getByTestId('custom-skeleton')).toBeInTheDocument();
    });

    it('should have shimmer animation classes', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild as HTMLElement;
      
      expect(skeleton).toHaveClass('relative', 'overflow-hidden');
      // Check for before pseudo-element classes in the className
      expect(skeleton.className).toContain('before:animate-shimmer');
    });
  });

  describe('DocumentSkeleton', () => {
    it('should render multiple skeleton lines', () => {
      const { container } = render(<DocumentSkeleton />);
      
      // Should have animation class
      expect(container.firstChild).toHaveClass('animate-fade-in');
      
      // Should contain multiple skeleton elements
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(5); // Should have multiple lines
    });

    it('should have proper structure with spacing', () => {
      const { container } = render(<DocumentSkeleton />);
      
      expect(container.firstChild).toHaveClass('space-y-4', 'p-6');
    });

    it('should have varied skeleton widths', () => {
      const { container } = render(<DocumentSkeleton />);
      const skeletons = container.querySelectorAll('.animate-pulse');
      
      // Check that skeletons have different width classes by looking at all classes
      const allClasses = Array.from(skeletons).map(skeleton => 
        Array.from(skeleton.classList).join(' ')
      );
      
      // Count unique width patterns
      const widthPatterns = allClasses.map(classes => {
        const widthMatch = classes.match(/w-(\d+\/\d+|full|\d+)/);
        return widthMatch ? widthMatch[0] : null;
      }).filter(Boolean);
      
      const uniqueWidths = new Set(widthPatterns);
      expect(uniqueWidths.size).toBeGreaterThan(1); // Should have varied widths
    });
  });

  describe('CommentSkeleton', () => {
    it('should render comment structure with avatar and content', () => {
      const { container } = render(<CommentSkeleton />);
      
      // Should have flex layout
      expect(container.querySelector('.flex')).toBeInTheDocument();
      
      // Should have rounded avatar skeleton
      expect(container.querySelector('.rounded-full')).toBeInTheDocument();
      
      // Should have multiple content lines
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(3);
    });

    it('should have proper spacing and layout', () => {
      const { container } = render(<CommentSkeleton />);
      
      expect(container.firstChild).toHaveClass('flex', 'space-x-3', 'p-4');
    });

    it('should have avatar and content sections', () => {
      const { container } = render(<CommentSkeleton />);
      
      // Avatar skeleton (rounded)
      const avatar = container.querySelector('.rounded-full');
      expect(avatar).toHaveClass('h-8', 'w-8');
      
      // Content section with flex-1
      const contentSection = container.querySelector('.flex-1');
      expect(contentSection).toBeInTheDocument();
    });
  });

  describe('ContributorSkeleton', () => {
    it('should render contributor structure', () => {
      const { container } = render(<ContributorSkeleton />);
      
      // Should have flex layout
      expect(container.firstChild).toHaveClass('flex', 'items-center', 'space-x-3', 'p-3');
      
      // Should have avatar skeleton
      expect(container.querySelector('.rounded-full')).toBeInTheDocument();
      
      // Should have content skeletons
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBe(4); // Avatar + name + status + indicator
    });

    it('should have proper contributor layout elements', () => {
      const { container } = render(<ContributorSkeleton />);
      
      // Avatar
      const avatar = container.querySelector('.h-8.w-8.rounded-full');
      expect(avatar).toBeInTheDocument();
      
      // Content section
      const contentSection = container.querySelector('.flex-1');
      expect(contentSection).toBeInTheDocument();
      
      // Status indicator
      const statusIndicator = container.querySelector('.h-2.w-2.rounded-full');
      expect(statusIndicator).toBeInTheDocument();
    });
  });

  describe('Animation and Accessibility', () => {
    it('should have proper animation classes for loading states', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild as HTMLElement;
      
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('should be identifiable as loading content for screen readers', () => {
      render(<Skeleton aria-label="Loading content" />);
      expect(screen.getByLabelText('Loading content')).toBeInTheDocument();
    });

    it('should not interfere with user interactions when loading', () => {
      const { container } = render(<DocumentSkeleton />);
      
      // Skeleton should not have interactive elements
      const buttons = container.querySelectorAll('button');
      const links = container.querySelectorAll('a');
      const inputs = container.querySelectorAll('input');
      
      expect(buttons.length).toBe(0);
      expect(links.length).toBe(0);
      expect(inputs.length).toBe(0);
    });
  });

  describe('Responsive Design', () => {
    it('should maintain structure across different screen sizes', () => {
      const { container } = render(<CommentSkeleton />);
      
      // Layout should be flexible
      expect(container.firstChild).toHaveClass('flex');
      expect(container.querySelector('.flex-1')).toBeInTheDocument();
    });

    it('should have appropriate spacing for mobile and desktop', () => {
      const { container } = render(<ContributorSkeleton />);
      
      // Should have consistent padding
      expect(container.firstChild).toHaveClass('p-3');
    });
  });
});