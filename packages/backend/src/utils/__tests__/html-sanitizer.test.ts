import { sanitizeHtml } from '../html-sanitizer';

describe('HTML Sanitizer', () => {
  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script><p>Safe content</p>';
      const result = sanitizeHtml(input);
      
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Safe content</p>');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(1)">Click me</div>';
      const result = sanitizeHtml(input);
      
      expect(result).not.toContain('onclick');
      expect(result).toContain('<div>Click me</div>');
    });

    it('should allow safe HTML tags', () => {
      const safeHtml = `
        <h1>Title</h1>
        <h2>Subtitle</h2>
        <p>Paragraph with <strong>bold</strong> and <em>italic</em></p>
        <ul><li>List item</li></ul>
        <blockquote>Quote</blockquote>
        <code>inline code</code>
        <pre><code>code block</code></pre>
      `;
      
      const result = sanitizeHtml(safeHtml);
      
      expect(result).toContain('<h1>Title</h1>');
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<em>italic</em>');
      expect(result).toContain('<ul><li>List item</li></ul>');
      expect(result).toContain('<blockquote>Quote</blockquote>');
      expect(result).toContain('<code>inline code</code>');
    });

    it('should remove dangerous attributes but keep safe ones', () => {
      const input = '<a href="https://example.com" onclick="alert(1)" target="_blank">Link</a>';
      const result = sanitizeHtml(input);
      
      expect(result).toContain('href="https://example.com"');
      expect(result).not.toContain('onclick');
      expect(result).toContain('target="_blank"');
    });

    it('should handle malformed HTML gracefully', () => {
      const input = '<div><p>Unclosed div<script>evil()</script>';
      const result = sanitizeHtml(input);
      
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Unclosed div</p>');
    });

    it('should handle empty input', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(null as any)).toBe('');
      expect(sanitizeHtml(undefined as any)).toBe('');
    });

    it('should remove style attributes for security', () => {
      const input = '<p style="background: url(javascript:alert(1))">Text</p>';
      const result = sanitizeHtml(input);
      
      expect(result).not.toContain('style');
      expect(result).toContain('<p>Text</p>');
    });
  });
});