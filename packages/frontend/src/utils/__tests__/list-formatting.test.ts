/**
 * TDD Tests for HTML View List Formatting Issue
 * 
 * Problem: Numbered lists in Obsidian appear as plain text in HTML view mode
 * Expected: Markdown lists should be converted to proper HTML list elements
 */

import { describe, it, expect } from '@jest/globals';
import { markdownToHtml } from '../markdownConverter';

describe('HTML View List Formatting', () => {
  describe('Numbered List Conversion', () => {
    it('should convert simple numbered list to HTML ordered list', () => {
      // Arrange: Markdown with numbered list (the failing case)
      const markdown = `# My Note

Here is a numbered list:

1. First item
2. Second item  
3. Third item

End of list.`;

      // Act: Convert to HTML
      const html = markdownToHtml(markdown);

      // Assert: Should create proper HTML ordered list
      expect(html).toContain('<ol>');
      expect(html).toContain('<li>First item</li>');
      expect(html).toContain('<li>Second item</li>'); 
      expect(html).toContain('<li>Third item</li>');
      expect(html).toContain('</ol>');
      
      // Should NOT appear as plain text paragraph
      expect(html).not.toContain('1. First item');
      expect(html).not.toContain('2. Second item');
      expect(html).not.toContain('<p>1. First item</p>');
    });

    it('should handle numbered lists with different number formats', () => {
      // Arrange: Different numbering styles
      const markdown = `1. Standard numbering
10. Double digit  
100. Triple digit
1) Parenthesis style`;

      // Act: Convert to HTML
      const html = markdownToHtml(markdown);

      // Assert: All should be converted to list items
      expect(html).toContain('<li>Standard numbering</li>');
      expect(html).toContain('<li>Double digit</li>');
      expect(html).toContain('<li>Triple digit</li>');
      expect(html).toContain('<li>Parenthesis style</li>');
    });

    it('should handle nested numbered lists', () => {
      // Arrange: Nested list structure
      const markdown = `1. First level item
   1. Nested item 1
   2. Nested item 2
2. Second level item
   - Bullet nested in numbered
   - Another bullet
3. Third level item`;

      // Act: Convert to HTML
      const html = markdownToHtml(markdown);

      // Assert: Should create nested structure
      expect(html).toContain('<ol>');
      expect(html).toContain('<li>First level item');
      expect(html).toContain('<ol>'); // Nested ol
      expect(html).toContain('<li>Nested item 1</li>');
      expect(html).toContain('<ul>'); // Mixed with bullet list
      expect(html).toContain('<li>Bullet nested in numbered</li>');
    });

    it('should handle numbered lists with inline formatting', () => {
      // Arrange: List items with inline markdown
      const markdown = `1. Item with **bold text**
2. Item with *italic text*
3. Item with \`code\` and [link](https://example.com)
4. Item with line break  
   continuing on next line`;

      // Act: Convert to HTML
      const html = markdownToHtml(markdown);

      // Assert: Should preserve inline formatting within list items
      expect(html).toContain('<li>Item with <strong>bold text</strong></li>');
      expect(html).toContain('<li>Item with <em>italic text</em></li>');
      expect(html).toContain('<li>Item with <code>code</code>');
      expect(html).toContain('<a href="https://example.com">link</a></li>');
      expect(html).toContain('continuing on next line</li>');
    });

    it('should handle mixed numbered and bullet lists', () => {
      // Arrange: Document with both list types
      const markdown = `First some bullets:

- Bullet item 1
- Bullet item 2

Then numbered:

1. Numbered item 1  
2. Numbered item 2

And more bullets:

- Another bullet
- Final bullet`;

      // Act: Convert to HTML
      const html = markdownToHtml(markdown);

      // Assert: Should create separate list structures
      expect(html).toContain('<ul>');
      expect(html).toContain('<ol>');
      expect(html).toContain('<li>Bullet item 1</li>');
      expect(html).toContain('<li>Numbered item 1</li>');
      
      // Should have proper list separation
      const ulCount = (html.match(/<ul>/g) || []).length;
      const olCount = (html.match(/<ol>/g) || []).length;
      expect(ulCount).toBe(2); // Two separate bullet lists
      expect(olCount).toBe(1); // One numbered list
    });
  });

  describe('List Continuation and Spacing', () => {
    it('should handle lists separated by blank lines', () => {
      // Arrange: Lists with spacing
      const markdown = `1. First list item

2. Second list item after blank line

3. Third item`;

      // Act: Convert to HTML
      const html = markdownToHtml(markdown);

      // Assert: Should still be one continuous list
      expect(html).toContain('<ol>');
      expect(html).toContain('<li>First list item</li>');
      expect(html).toContain('<li>Second list item after blank line</li>');
      expect(html).toContain('<li>Third item</li>');
      expect(html).toContain('</ol>');
    });

    it('should break lists when interrupted by other content', () => {
      // Arrange: Lists interrupted by paragraph
      const markdown = `1. First list item
2. Second list item

This is interrupting text.

3. This should start a new list
4. Fourth item`;

      // Act: Convert to HTML
      const html = markdownToHtml(markdown);

      // Assert: Should create two separate lists
      const olCount = (html.match(/<ol>/g) || []).length;
      expect(olCount).toBe(2);
      expect(html).toContain('<p>This is interrupting text.</p>');
    });

    it('should handle indented list continuation', () => {
      // Arrange: Multi-line list items
      const markdown = `1. First item
   with continuation line
   
2. Second item  
   also with continuation
   
3. Third item`;

      // Act: Convert to HTML  
      const html = markdownToHtml(markdown);

      // Assert: Should include continuation in same list items
      expect(html).toContain('<li>First item\n   with continuation line</li>');
      expect(html).toContain('<li>Second item<br>   also with continuation</li>');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed numbered lists gracefully', () => {
      // Arrange: Various malformed cases
      const markdown = `1.No space after dot
2 Missing dot
3. Good item
4.  Extra spaces
5.	Tab after dot`;

      // Act: Convert to HTML
      const html = markdownToHtml(markdown);

      // Assert: Should handle gracefully, convert valid ones
      expect(html).toContain('<li>Good item</li>');
      // May or may not convert malformed ones - should not crash
      expect(html).toBeDefined();
      expect(html.length).toBeGreaterThan(0);
    });

    it('should handle empty list items', () => {
      // Arrange: List with empty items
      const markdown = `1. First item
2. 
3. Third item`;

      // Act: Convert to HTML
      const html = markdownToHtml(markdown);

      // Assert: Should handle empty items without breaking
      expect(html).toContain('<li>First item</li>');
      expect(html).toContain('<li></li>'); // Empty item
      expect(html).toContain('<li>Third item</li>');
    });

    it('should handle very long list items', () => {
      // Arrange: Long list item content
      const longContent = 'A'.repeat(1000);
      const markdown = `1. Short item
2. ${longContent}
3. Another short item`;

      // Act: Convert to HTML
      const html = markdownToHtml(markdown);

      // Assert: Should handle long content without issues
      expect(html).toContain('<li>Short item</li>');
      expect(html).toContain(`<li>${longContent}</li>`);
      expect(html).toContain('<li>Another short item</li>');
    });
  });

  describe('Integration with Existing Features', () => {
    it('should work with existing bullet list functionality', () => {
      // Arrange: Mixed content that currently works
      const markdown = `# Title

Regular paragraph.

- Bullet item 1  
- Bullet item 2

1. Numbered item 1
2. Numbered item 2

**Bold text** and *italic text*.`;

      // Act: Convert to HTML
      const html = markdownToHtml(markdown);

      // Assert: Should not break existing functionality
      expect(html).toContain('<h1>Title</h1>');
      expect(html).toContain('<p>Regular paragraph.</p>');
      expect(html).toContain('<ul>');
      expect(html).toContain('<li>Bullet item 1</li>');
      expect(html).toContain('<ol>');
      expect(html).toContain('<li>Numbered item 1</li>');
      expect(html).toContain('<strong>Bold text</strong>');
      expect(html).toContain('<em>italic text</em>');
    });

    it('should maintain performance with large documents', () => {
      // Arrange: Large document with many lists
      let markdown = '# Large Document\n\n';
      
      for (let i = 1; i <= 100; i++) {
        markdown += `${i}. List item number ${i}\n`;
      }

      // Act: Convert to HTML (should be fast)
      const startTime = Date.now();
      const html = markdownToHtml(markdown);
      const endTime = Date.now();

      // Assert: Should complete reasonably quickly and correctly
      expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second
      expect(html).toContain('<ol>');
      expect(html).toContain('<li>List item number 1</li>');
      expect(html).toContain('<li>List item number 100</li>');
    });
  });

  describe('Real-World Obsidian Content', () => {
    it('should handle typical Obsidian plugin content', () => {
      // Arrange: Content like what the Obsidian plugin would send
      const markdown = `# Meeting Notes

## Agenda
1. Review last week's progress
2. Discuss new features
3. Plan next sprint

## Action Items  
1. Update documentation
2. Fix bug #123
3. Test new deployment

## Notes
- General discussion points
- Important decisions made`;

      // Act: Convert to HTML
      const html = markdownToHtml(markdown);

      // Assert: Should render all elements correctly
      expect(html).toContain('<h1>Meeting Notes</h1>');
      expect(html).toContain('<h2>Agenda</h2>');
      expect(html).toContain('<ol>');
      expect(html).toContain('<li>Review last week\'s progress</li>');
      expect(html).toContain('<li>Update documentation</li>');
      expect(html).toContain('<ul>');
      expect(html).toContain('<li>General discussion points</li>');
    });
  });
});