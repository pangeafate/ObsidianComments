/**
 * COMPREHENSIVE HTML Sanitizer Tests - SECURITY CRITICAL
 * This test suite ensures 80%+ coverage of all sanitization functions
 * and validates defense against XSS and injection attacks
 */

import { 
  sanitizeHtml, 
  cleanMarkdownContent, 
  containsMediaContent, 
  sanitizeTitle 
} from '../html-sanitizer';

describe('HTML Sanitizer - Comprehensive Security Tests', () => {
  
  describe('sanitizeHtml() - HTML Content Sanitization', () => {
    
    describe('Input Validation', () => {
      it('should handle null and undefined inputs', () => {
        expect(sanitizeHtml(null as any)).toBe('');
        expect(sanitizeHtml(undefined as any)).toBe('');
        expect(sanitizeHtml('')).toBe('');
      });

      it('should handle non-string inputs', () => {
        expect(sanitizeHtml(123 as any)).toBe('');
        expect(sanitizeHtml({} as any)).toBe('');
        expect(sanitizeHtml([] as any)).toBe('');
      });
    });

    describe('Allowed HTML Tags', () => {
      it('should preserve safe heading tags', () => {
        const input = '<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>';
        const result = sanitizeHtml(input);
        expect(result).toContain('<h1>Title</h1>');
        expect(result).toContain('<h2>Subtitle</h2>');
        expect(result).toContain('<h3>Section</h3>');
      });

      it('should preserve safe text formatting tags', () => {
        const input = '<p>Text</p><strong>Bold</strong><em>Italic</em><br>';
        const result = sanitizeHtml(input);
        expect(result).toContain('<p>Text</p>');
        expect(result).toContain('<strong>Bold</strong>');
        expect(result).toContain('<em>Italic</em>');
        expect(result).toContain('<br>');
      });

      it('should preserve safe list tags', () => {
        const input = '<ul><li>Item 1</li><li>Item 2</li></ul>';
        const result = sanitizeHtml(input);
        expect(result).toContain('<ul>');
        expect(result).toContain('<li>Item 1</li>');
        expect(result).toContain('<li>Item 2</li>');
        expect(result).toContain('</ul>');
      });

      it('should preserve code and blockquote tags', () => {
        const input = '<blockquote>Quote</blockquote><code>code</code><pre>preformatted</pre>';
        const result = sanitizeHtml(input);
        expect(result).toContain('<blockquote>Quote</blockquote>');
        expect(result).toContain('<code>code</code>');
        expect(result).toContain('<pre>preformatted</pre>');
      });

      it('should preserve table tags', () => {
        const input = '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>';
        const result = sanitizeHtml(input);
        expect(result).toContain('<table>');
        expect(result).toContain('<thead>');
        expect(result).toContain('<th>Header</th>');
        expect(result).toContain('<td>Cell</td>');
      });
    });

    describe('XSS Attack Prevention', () => {
      it('should remove script tags completely', () => {
        const maliciousInputs = [
          '<script>alert("xss")</script>',
          '<script type="text/javascript">alert("xss")</script>',
          '<SCRIPT>alert("XSS")</SCRIPT>',
          '<script\n>alert("xss")</script>',
          'Text <script>alert("xss")</script> more text'
        ];

        maliciousInputs.forEach(input => {
          const result = sanitizeHtml(input);
          expect(result).not.toContain('<script');
          expect(result).not.toContain('alert(');
          expect(result).not.toContain('javascript');
        });
      });

      it('should remove dangerous event handlers', () => {
        const maliciousInputs = [
          '<div onclick="alert(\'xss\')">Click me</div>',
          '<img onerror="alert(\'xss\')" src="invalid">',
          '<body onload="alert(\'xss\')">',
          '<input onfocus="alert(\'xss\')" type="text">',
          '<a onmouseover="alert(\'xss\')" href="#">Hover</a>'
        ];

        maliciousInputs.forEach(input => {
          const result = sanitizeHtml(input);
          expect(result).not.toContain('onclick');
          expect(result).not.toContain('onerror');
          expect(result).not.toContain('onload');
          expect(result).not.toContain('onfocus');
          expect(result).not.toContain('onmouseover');
          expect(result).not.toContain('alert(');
        });
      });

      it('should remove javascript: URLs', () => {
        const maliciousInputs = [
          '<a href="javascript:alert(\'xss\')">Link</a>',
          '<a href="JAVASCRIPT:alert(\'XSS\')">Link</a>',
          '<a href="javascript:void(0)">Link</a>'
        ];

        maliciousInputs.forEach(input => {
          const result = sanitizeHtml(input);
          expect(result).not.toContain('javascript:');
          expect(result).not.toContain('alert(');
        });
      });

      it('should remove forbidden dangerous tags', () => {
        const forbiddenTags = [
          '<object data="malicious.swf"></object>',
          '<embed src="malicious.swf">',
          '<form action="/evil"><input type="password"></form>',
          '<iframe src="javascript:alert(\'xss\')"></iframe>',
          '<canvas></canvas>',
          '<svg><script>alert("xss")</script></svg>'
        ];

        forbiddenTags.forEach(input => {
          const result = sanitizeHtml(input);
          expect(result).not.toContain('<object');
          expect(result).not.toContain('<embed');
          expect(result).not.toContain('<form');
          expect(result).not.toContain('<iframe');
          expect(result).not.toContain('<canvas');
          expect(result).not.toContain('<svg');
        });
      });

      it('should remove style attributes to prevent CSS injection', () => {
        const stylingInputs = [
          '<div style="background: url(javascript:alert(\'xss\'))">Text</div>',
          '<p style="color: red; background: url(\'evil.jpg\')">Text</p>',
          '<span style="expression(alert(\'xss\'))">Text</span>'
        ];

        stylingInputs.forEach(input => {
          const result = sanitizeHtml(input);
          expect(result).not.toContain('style=');
          expect(result).not.toContain('javascript:');
          expect(result).not.toContain('expression(');
        });
      });
    });

    describe('Media Content Removal', () => {
      it('should remove image tags', () => {
        const mediaInputs = [
          '<img src="image.jpg" alt="Image">',
          '<img src="javascript:alert(\'xss\')" onerror="alert(\'xss\')">',
          '<picture><source src="image.webp"><img src="image.jpg"></picture>'
        ];

        mediaInputs.forEach(input => {
          const result = sanitizeHtml(input);
          expect(result).not.toContain('<img');
          expect(result).not.toContain('<picture');
          expect(result).not.toContain('<source');
        });
      });

      it('should remove video and audio tags', () => {
        const mediaInputs = [
          '<video src="video.mp4" controls></video>',
          '<audio src="audio.mp3" autoplay></audio>',
          '<video><source src="video.webm"><track src="subtitles.vtt"></video>'
        ];

        mediaInputs.forEach(input => {
          const result = sanitizeHtml(input);
          expect(result).not.toContain('<video');
          expect(result).not.toContain('<audio');
          expect(result).not.toContain('<track');
        });
      });
    });

    describe('CI Environment Fallback', () => {
      let originalEnv: any;

      beforeEach(() => {
        originalEnv = { ...process.env };
      });

      afterEach(() => {
        process.env = originalEnv;
      });

      it('should use basic sanitization in CI environment', () => {
        process.env.CI = 'true';
        const input = '<script>alert("xss")</script><p>Safe content</p>';
        const result = sanitizeHtml(input);
        
        expect(result).not.toContain('<script');
        expect(result).not.toContain('alert(');
        expect(result).toContain('<p>Safe content</p>');
      });

      it('should use basic sanitization in test environment', () => {
        process.env.NODE_ENV = 'test';
        const input = '<script>alert("xss")</script><strong>Bold text</strong>';
        const result = sanitizeHtml(input);
        
        expect(result).not.toContain('<script');
        expect(result).not.toContain('alert(');
        expect(result).toContain('<strong>Bold text</strong>');
      });
    });
  });

  describe('cleanMarkdownContent() - Markdown Sanitization', () => {
    
    describe('Title Removal', () => {
      it('should remove H1 titles from the beginning', () => {
        const inputs = [
          '# Main Title\n\nContent here',
          '#   Spaced Title   \n\nContent',
          '# Title with symbols! @#$\nContent'
        ];

        inputs.forEach(input => {
          const result = cleanMarkdownContent(input);
          expect(result).not.toMatch(/^#\s+/);
          expect(result).toContain('Content');
        });
      });

      it('should handle frontmatter and remove title after it', () => {
        const input = `---
title: Document Title
date: 2024-01-01
---

# This title should be removed

This content should remain.`;

        const result = cleanMarkdownContent(input);
        expect(result).toContain('---');
        expect(result).toContain('title: Document Title');
        expect(result).not.toContain('# This title should be removed');
        expect(result).toContain('This content should remain.');
      });

      it('should preserve H2-H6 headings', () => {
        const input = `# Remove this
## Keep this
### And this
#### Also this`;

        const result = cleanMarkdownContent(input);
        expect(result).not.toContain('# Remove this');
        expect(result).toContain('## Keep this');
        expect(result).toContain('### And this');
        expect(result).toContain('#### Also this');
      });
    });

    describe('Image Removal', () => {
      it('should remove markdown image syntax', () => {
        const inputs = [
          '![Alt text](image.jpg)',
          '![](image.png)',
          '![Image with title](image.gif "Title")',
          'Text ![inline image](image.webp) more text'
        ];

        inputs.forEach(input => {
          const result = cleanMarkdownContent(input);
          expect(result).not.toContain('![');
          expect(result).not.toContain('.jpg');
          expect(result).not.toContain('.png');
          expect(result).not.toContain('.gif');
          expect(result).not.toContain('.webp');
        });
      });

      it('should preserve non-image links', () => {
        const input = 'Check out [this link](https://example.com) and ![this image](image.jpg)';
        const result = cleanMarkdownContent(input);
        
        expect(result).toContain('[this link](https://example.com)');
        expect(result).not.toContain('![this image]');
      });
    });

    describe('Attachment Removal', () => {
      it('should remove binary file attachments', () => {
        const attachments = [
          '[[document.pdf]]',
          '[[presentation.pptx|Custom Name]]',
          '[[image.jpg]]',
          '[[video.mp4]]',
          '[[audio.mp3]]',
          '[[archive.zip]]'
        ];

        attachments.forEach(input => {
          const result = cleanMarkdownContent(input);
          expect(result).not.toContain('[[');
          expect(result).not.toContain('.pdf');
          expect(result).not.toContain('.pptx');
          expect(result).not.toContain('.jpg');
          expect(result).not.toContain('.mp4');
          expect(result).not.toContain('.mp3');
          expect(result).not.toContain('.zip');
        });
      });

      it('should preserve regular wiki links', () => {
        const input = '[[Regular Note]] and [[document.pdf]] and [[Another Note]]';
        const result = cleanMarkdownContent(input);
        
        expect(result).toContain('[[Regular Note]]');
        expect(result).toContain('[[Another Note]]');
        expect(result).not.toContain('[[document.pdf]]');
      });
    });

    describe('Embedded Content Removal', () => {
      it('should remove embedded/transcluded content', () => {
        const inputs = [
          '![[Embedded Note]]',
          '![[template.md]]',
          'Text ![[embedded]] more text'
        ];

        inputs.forEach(input => {
          const result = cleanMarkdownContent(input);
          expect(result).not.toContain('![[');
          expect(result).toContain('Text');
          expect(result).toContain('more text');
        });
      });
    });

    describe('HTML Media Tag Removal', () => {
      it('should remove HTML media tags from markdown', () => {
        const mediaHtml = [
          '<img src="image.jpg" alt="Image">',
          '<video src="video.mp4" controls></video>',
          '<audio src="audio.mp3"></audio>',
          '<iframe src="https://youtube.com/embed/123"></iframe>',
          '<embed src="flash.swf">',
          '<object data="animation.swf"></object>'
        ];

        mediaHtml.forEach(input => {
          const result = cleanMarkdownContent(input);
          expect(result).not.toContain('<img');
          expect(result).not.toContain('<video');
          expect(result).not.toContain('<audio');
          expect(result).not.toContain('<iframe');
          expect(result).not.toContain('<embed');
          expect(result).not.toContain('<object');
        });
      });
    });

    describe('Whitespace Cleanup', () => {
      it('should clean up excessive whitespace', () => {
        const input = `Content here


With too much


Whitespace`;

        const result = cleanMarkdownContent(input);
        expect(result).not.toMatch(/\n\s*\n\s*\n/);
        expect(result).toContain('Content here');
        expect(result).toContain('With too much');
        expect(result).toContain('Whitespace');
      });

      it('should preserve intentional double line breaks', () => {
        const input = `Paragraph one.

Paragraph two.`;

        const result = cleanMarkdownContent(input);
        expect(result).toContain('Paragraph one.\n\nParagraph two.');
      });
    });

    describe('Input Validation', () => {
      it('should handle null and undefined inputs', () => {
        expect(cleanMarkdownContent(null as any)).toBe('');
        expect(cleanMarkdownContent(undefined as any)).toBe('');
        expect(cleanMarkdownContent('')).toBe('');
      });

      it('should handle non-string inputs', () => {
        expect(cleanMarkdownContent(123 as any)).toBe('');
        expect(cleanMarkdownContent({} as any)).toBe('');
        expect(cleanMarkdownContent([] as any)).toBe('');
      });
    });
  });

  describe('containsMediaContent() - Media Detection', () => {
    
    it('should detect markdown images', () => {
      const mediaInputs = [
        '![Alt text](image.jpg)',
        'Text with ![image](pic.png) embedded',
        '![](image.gif)',
        '![Image with title](image.webp "Title")'
      ];

      mediaInputs.forEach(input => {
        expect(containsMediaContent(input)).toBe(true);
      });
    });

    it('should detect HTML media tags', () => {
      const mediaInputs = [
        '<img src="image.jpg">',
        '<video src="video.mp4"></video>',
        '<audio controls><source src="audio.mp3"></audio>',
        '<iframe src="https://youtube.com"></iframe>',
        '<embed src="flash.swf">',
        '<object data="animation.swf"></object>'
      ];

      mediaInputs.forEach(input => {
        expect(containsMediaContent(input)).toBe(true);
      });
    });

    it('should detect attachment references', () => {
      const attachmentInputs = [
        '[[document.pdf]]',
        '[[presentation.pptx|Custom Name]]',
        '[[image.jpg]]',
        '[[video.mp4]]',
        '[[audio.mp3]]',
        '[[archive.zip]]',
        '[[data.xlsx]]'
      ];

      attachmentInputs.forEach(input => {
        expect(containsMediaContent(input)).toBe(true);
      });
    });

    it('should not detect false positives', () => {
      const cleanInputs = [
        'Just plain text',
        '[Regular link](https://example.com)',
        '[[Regular Note Link]]',
        'Code with `![not an image]` in backticks',
        '# Title\n\nContent without media'
      ];

      cleanInputs.forEach(input => {
        expect(containsMediaContent(input)).toBe(false);
      });
    });

    it('should handle null and undefined inputs', () => {
      expect(containsMediaContent(null as any)).toBe(false);
      expect(containsMediaContent(undefined as any)).toBe(false);
      expect(containsMediaContent('')).toBe(false);
    });

    it('should handle non-string inputs', () => {
      expect(containsMediaContent(123 as any)).toBe(false);
      expect(containsMediaContent({} as any)).toBe(false);
      expect(containsMediaContent([] as any)).toBe(false);
    });
  });

  describe('sanitizeTitle() - Title Sanitization', () => {
    
    describe('XSS Prevention in Titles', () => {
      it('should remove all HTML tags from titles', () => {
        const maliciousTitles = [
          '<script>alert("xss")</script>My Title',
          'Title <strong>with</strong> formatting',
          '<img src="x" onerror="alert(\'xss\')">Title',
          'Title<iframe src="javascript:alert(\'xss\')"></iframe>'
        ];

        maliciousTitles.forEach(input => {
          const result = sanitizeTitle(input);
          expect(result).not.toContain('<');
          expect(result).not.toContain('>');
          expect(result).not.toContain('script');
          expect(result).not.toContain('alert(');
          expect(result).toContain('Title');
        });
      });

      it('should remove dangerous characters and URIs', () => {
        const maliciousTitles = [
          'Title javascript:alert("xss")',
          'Title onclick="alert(\'xss\')"',
          'Title<>with brackets',
          'Title with "quotes" and \'apostrophes\''
        ];

        maliciousTitles.forEach(input => {
          const result = sanitizeTitle(input);
          expect(result).not.toContain('javascript:');
          expect(result).not.toContain('onclick');
          expect(result).not.toContain('<');
          expect(result).not.toContain('>');
          expect(result).toContain('Title');
        });
      });
    });

    describe('Content Preservation', () => {
      it('should preserve safe title content', () => {
        const safeTitles = [
          'My Document Title',
          'Title with Numbers 123',
          'Title with symbols: dash-underscore_period.',
          'Title (with parentheses) and [brackets]'
        ];

        safeTitles.forEach(input => {
          const result = sanitizeTitle(input);
          expect(result).toBe(input);
        });
      });

      it('should preserve Unicode and international characters', () => {
        const internationalTitles = [
          'Título en Español',
          'Document français',
          'Deutsche Überschrift',
          '中文标题',
          'العنوان العربي'
        ];

        internationalTitles.forEach(input => {
          const result = sanitizeTitle(input);
          expect(result).toBe(input);
        });
      });
    });

    describe('CI Environment Fallback', () => {
      let originalEnv: any;

      beforeEach(() => {
        originalEnv = { ...process.env };
      });

      afterEach(() => {
        process.env = originalEnv;
      });

      it('should use basic sanitization in CI environment', () => {
        process.env.CI = 'true';
        const input = '<script>alert("xss")</script>Clean Title';
        const result = sanitizeTitle(input);
        
        expect(result).not.toContain('<script');
        expect(result).not.toContain('alert(');
        expect(result).toContain('Clean Title');
      });

      it('should use basic sanitization in test environment', () => {
        process.env.NODE_ENV = 'test';
        const input = 'Title <strong>with</strong> HTML';
        const result = sanitizeTitle(input);
        
        expect(result).not.toContain('<strong>');
        expect(result).not.toContain('</strong>');
        expect(result).toContain('Title');
        expect(result).toContain('with');
        expect(result).toContain('HTML');
      });
    });

    describe('Input Validation', () => {
      it('should handle null and undefined inputs', () => {
        expect(sanitizeTitle(null as any)).toBe('');
        expect(sanitizeTitle(undefined as any)).toBe('');
        expect(sanitizeTitle('')).toBe('');
      });

      it('should handle non-string inputs', () => {
        expect(sanitizeTitle(123 as any)).toBe('');
        expect(sanitizeTitle({} as any)).toBe('');
        expect(sanitizeTitle([] as any)).toBe('');
      });

      it('should trim whitespace', () => {
        expect(sanitizeTitle('  Title with spaces  ')).toBe('Title with spaces');
        expect(sanitizeTitle('\n\tTitle\n\t')).toBe('Title');
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    
    it('should handle extremely long inputs gracefully', () => {
      const longInput = 'a'.repeat(10000) + '<script>alert("xss")</script>';
      
      expect(() => sanitizeHtml(longInput)).not.toThrow();
      expect(() => cleanMarkdownContent(longInput)).not.toThrow();
      expect(() => containsMediaContent(longInput)).not.toThrow();
      expect(() => sanitizeTitle(longInput)).not.toThrow();
      
      const htmlResult = sanitizeHtml(longInput);
      expect(htmlResult).not.toContain('<script');
    });

    it('should handle malformed HTML gracefully', () => {
      const malformedInputs = [
        '<div><p>Unclosed tags',
        '<script>alert("xss"<script>nested</script>',
        '<<>>invalid<<brackets>>',
        '<div class="unclosed quotes>Content</div>'
      ];

      malformedInputs.forEach(input => {
        expect(() => sanitizeHtml(input)).not.toThrow();
        const result = sanitizeHtml(input);
        expect(result).not.toContain('alert(');
        expect(result).not.toContain('<script');
      });
    });

    it('should handle special characters and encoding', () => {
      const specialInputs = [
        'Title with & ampersand',
        'Content with © copyright',
        'Text with "smart quotes"',
        'Content with — em dash'
      ];

      specialInputs.forEach(input => {
        expect(() => sanitizeHtml(input)).not.toThrow();
        expect(() => cleanMarkdownContent(input)).not.toThrow();
        expect(() => sanitizeTitle(input)).not.toThrow();
      });
    });
  });
});