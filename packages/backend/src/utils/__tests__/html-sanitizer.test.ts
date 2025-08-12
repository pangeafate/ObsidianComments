import { sanitizeHtml, cleanMarkdownContent } from '../html-sanitizer';

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
      expect(result).toContain('<p>Unclosed div');
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

  describe('cleanMarkdownContent', () => {
    describe('H1 title removal', () => {
      it('should remove first H1 header from beginning of content', () => {
        const input = '# Test Title\n\nSome content here';
        const result = cleanMarkdownContent(input);
        
        expect(result).not.toContain('# Test Title');
        expect(result).toBe('Some content here');
      });

      it('should remove H1 with different whitespace patterns', () => {
        const input = '   #   My Title   \n\nContent below';
        const result = cleanMarkdownContent(input);
        
        expect(result).not.toContain('My Title');
        expect(result).toBe('Content below');
      });

      it('should handle H1 with different line endings (CRLF)', () => {
        const input = '# Windows Title\r\n\r\nContent';
        const result = cleanMarkdownContent(input);
        
        expect(result).not.toContain('# Windows Title');
        expect(result).toBe('Content');
      });

      it('should handle H1 with CR line endings', () => {
        const input = '# Mac Title\r\rContent';
        const result = cleanMarkdownContent(input);
        
        expect(result).not.toContain('# Mac Title');
        expect(result).toBe('Content');
      });

      it('should preserve H1 headers that are not at the beginning', () => {
        const input = 'Some intro\n\n# This should stay\n\nMore content';
        const result = cleanMarkdownContent(input);
        
        expect(result).toContain('# This should stay');
        expect(result).toContain('Some intro');
        expect(result).toContain('More content');
      });

      it('should preserve H2, H3, etc. headers at the beginning', () => {
        const input = '## Subtitle\n### Section\n\nContent';
        const result = cleanMarkdownContent(input);
        
        expect(result).toContain('## Subtitle');
        expect(result).toContain('### Section');
        expect(result).toContain('Content');
      });

      it('should handle content with frontmatter and remove H1 after it', () => {
        const input = '---\ntitle: My Note\ntags: [test]\n---\n\n# Title Header\n\nActual content';
        const result = cleanMarkdownContent(input);
        
        expect(result).toContain('---\ntitle: My Note\ntags: [test]\n---');
        expect(result).not.toContain('# Title Header');
        expect(result).toContain('Actual content');
      });

      it('should preserve frontmatter but remove H1 immediately after', () => {
        const input = '---\nkey: value\n---\n# Remove This Title\n\nKeep this content';
        const result = cleanMarkdownContent(input);
        
        expect(result).toContain('---\nkey: value\n---');
        expect(result).not.toContain('# Remove This Title');
        expect(result).toContain('Keep this content');
      });

      it('should handle empty content gracefully', () => {
        expect(cleanMarkdownContent('')).toBe('');
        expect(cleanMarkdownContent(null as any)).toBe('');
        expect(cleanMarkdownContent(undefined as any)).toBe('');
      });

      it('should handle content with only H1 title', () => {
        const input = '# Only Title';
        const result = cleanMarkdownContent(input);
        
        expect(result).toBe('');
      });

      it('should handle frontmatter with no content after', () => {
        const input = '---\ntitle: Test\n---\n\n# Title Only';
        const result = cleanMarkdownContent(input);
        
        expect(result).toContain('---\ntitle: Test\n---');
        expect(result).not.toContain('# Title Only');
      });
    });

    describe('media content removal', () => {
      it('should remove image markdown syntax', () => {
        const input = '# Title\n\n![alt text](image.png)\n\nContent';
        const result = cleanMarkdownContent(input);
        
        expect(result).not.toContain('![alt text](image.png)');
        expect(result).toContain('Content');
      });

      it('should remove attachment links', () => {
        const input = '# Title\n\n[[document.pdf]]\n\nContent';
        const result = cleanMarkdownContent(input);
        
        expect(result).not.toContain('[[document.pdf]]');
        expect(result).toContain('Content');
      });

      it('should remove embedded content', () => {
        const input = '# Title\n\n![[embedded-note]]\n\nContent';
        const result = cleanMarkdownContent(input);
        
        expect(result).not.toContain('![[embedded-note]]');
        expect(result).toContain('Content');
      });

      it('should remove HTML media tags', () => {
        const input = '# Title\n\n<img src="test.jpg">\n<video src="test.mp4"></video>\n\nContent';
        const result = cleanMarkdownContent(input);
        
        expect(result).not.toContain('<img src="test.jpg">');
        expect(result).not.toContain('<video src="test.mp4"></video>');
        expect(result).toContain('Content');
      });
    });

    describe('integration with H1 removal and media cleaning', () => {
      it('should remove both H1 title and media content', () => {
        const input = '# My Document\n\n![image](test.png)\n\nThis is the actual content\n\n[[attachment.pdf]]\n\nMore content';
        const result = cleanMarkdownContent(input);
        
        expect(result).not.toContain('# My Document');
        expect(result).not.toContain('![image](test.png)');
        expect(result).not.toContain('[[attachment.pdf]]');
        expect(result).toContain('This is the actual content');
        expect(result).toContain('More content');
      });

      it('should handle complex content with frontmatter, H1, and media', () => {
        const input = `---
title: Complex Note
tags: [test, demo]
---

# Main Title

![banner](banner.jpg)

This is the real content.

![[embedded-diagram]]

## Subsection

More content here.

[[document.pdf|Document Link]]`;

        const result = cleanMarkdownContent(input);
        
        expect(result).toContain('title: Complex Note');
        expect(result).not.toContain('# Main Title');
        expect(result).not.toContain('![banner](banner.jpg)');
        expect(result).not.toContain('![[embedded-diagram]]');
        expect(result).not.toContain('[[document.pdf|Document Link]]');
        expect(result).toContain('This is the real content.');
        expect(result).toContain('## Subsection');
        expect(result).toContain('More content here.');
      });
    });
  });
});