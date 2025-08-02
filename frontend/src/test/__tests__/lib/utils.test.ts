import { describe, it, expect, vi } from 'vitest';
import { cn, formatTimeAgo, generateAvatarColor, getInitials, debounce } from '../../../lib/utils';

describe('Utils', () => {
  describe('cn (className merger)', () => {
    it('should merge class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      expect(cn('base', true && 'conditional', false && 'hidden')).toBe('base conditional');
    });

    it('should handle undefined and null values', () => {
      expect(cn('base', undefined, null, 'valid')).toBe('base valid');
    });

    it('should handle arrays and objects', () => {
      expect(cn(['class1', 'class2'], { active: true, hidden: false })).toBe('class1 class2 active');
    });
  });

  describe('formatTimeAgo', () => {
    const now = new Date('2024-01-01T12:00:00Z');
    
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(now);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "just now" for recent timestamps', () => {
      const recent = new Date('2024-01-01T11:59:30Z'); // 30 seconds ago
      expect(formatTimeAgo(recent)).toBe('just now');
    });

    it('should return minutes ago for timestamps within an hour', () => {
      const minutesAgo = new Date('2024-01-01T11:45:00Z'); // 15 minutes ago
      expect(formatTimeAgo(minutesAgo)).toBe('15m ago');
    });

    it('should return hours ago for timestamps within a day', () => {
      const hoursAgo = new Date('2024-01-01T09:00:00Z'); // 3 hours ago
      expect(formatTimeAgo(hoursAgo)).toBe('3h ago');
    });

    it('should return days ago for timestamps within a week', () => {
      const daysAgo = new Date('2023-12-30T12:00:00Z'); // 2 days ago
      expect(formatTimeAgo(daysAgo)).toBe('2d ago');
    });

    it('should return formatted date for older timestamps', () => {
      const oldDate = new Date('2023-12-01T12:00:00Z'); // More than a week ago
      expect(formatTimeAgo(oldDate)).toBe('12/1/2023');
    });

    it('should handle string dates', () => {
      const dateString = '2024-01-01T11:45:00Z';
      expect(formatTimeAgo(dateString)).toBe('15m ago');
    });
  });

  describe('generateAvatarColor', () => {
    it('should generate consistent colors for the same name', () => {
      const color1 = generateAvatarColor('John Doe');
      const color2 = generateAvatarColor('John Doe');
      expect(color1).toBe(color2);
    });

    it('should generate different colors for different names', () => {
      const color1 = generateAvatarColor('John Doe');
      const color2 = generateAvatarColor('Jane Smith');
      expect(color1).not.toBe(color2);
    });

    it('should return a valid Tailwind color class', () => {
      const color = generateAvatarColor('Test User');
      expect(color).toMatch(/^bg-\w+-500$/);
    });

    it('should handle empty strings', () => {
      const color = generateAvatarColor('');
      expect(color).toMatch(/^bg-\w+-500$/);
    });

    it('should handle special characters', () => {
      const color = generateAvatarColor('User@123!');
      expect(color).toMatch(/^bg-\w+-500$/);
    });
  });

  describe('getInitials', () => {
    it('should return single initial for single name', () => {
      expect(getInitials('John')).toBe('J');
    });

    it('should return two initials for two names', () => {
      expect(getInitials('John Doe')).toBe('JD');
    });

    it('should return first two initials for multiple names', () => {
      expect(getInitials('John Michael Doe Smith')).toBe('JM');
    });

    it('should handle lowercase names', () => {
      expect(getInitials('john doe')).toBe('JD');
    });

    it('should handle names with extra spaces', () => {
      expect(getInitials('  John   Doe  ')).toBe('JD');
    });

    it('should handle single character names', () => {
      expect(getInitials('A B')).toBe('AB');
    });

    it('should handle empty string', () => {
      expect(getInitials('')).toBe('');
    });

    it('should handle names with numbers and special characters', () => {
      expect(getInitials('User123 Test@456')).toBe('UT');
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should delay function execution', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should cancel previous calls when called multiple times', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to the debounced function', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn('arg1', 'arg2');
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should handle different wait times', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 200);

      debouncedFn();
      vi.advanceTimersByTime(100);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should work with complex functions', () => {
      const fn = vi.fn((a: number, b: number) => a + b);
      const debouncedFn = debounce(fn, 50);

      debouncedFn(1, 2);
      vi.advanceTimersByTime(50);

      expect(fn).toHaveBeenCalledWith(1, 2);
    });
  });
});