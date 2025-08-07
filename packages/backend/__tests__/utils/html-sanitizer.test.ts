import { sanitizeHtml, cleanMarkdownContent, extractCleanTitle, containsMediaContent } from '../../src/utils/html-sanitizer';

describe('html-sanitizer', () => {
  describe('sanitizeHtml', () => {
    it('should remove dangerous script tags', () => {
      const dirty = '<p>Clean content</p><script>alert("dangerous")</script><p>More content</p>';
      const result = sanitizeHtml(dirty);
      
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
      expect(result).toContain('Clean content');
      expect(result).toContain('More content');
    });

    it('should remove img tags', () => {
      const dirty = '<p>Text content</p><img src="image.jpg" alt="test"><p>More text</p>';
      const result = sanitizeHtml(dirty);
      
      expect(result).not.toContain('<img');
      expect(result).not.toContain('image.jpg');
      expect(result).toContain('Text content');
      expect(result).toContain('More text');
    });

    it('should remove video and audio tags', () => {
      const dirty = `
        <p>Content</p>
        <video src="video.mp4">Video</video>
        <audio src="audio.mp3">Audio</audio>
        <p>More content</p>
      `;
      const result = sanitizeHtml(dirty);
      
      expect(result).not.toContain('<video');
      expect(result).not.toContain('<audio');
      expect(result).not.toContain('video.mp4');
      expect(result).not.toContain('audio.mp3');
      expect(result).toContain('Content');
      expect(result).toContain('More content');
    });

    it('should remove iframe and embed tags', () => {
      const dirty = `
        <p>Safe content</p>
        <iframe src="https://example.com"></iframe>
        <embed src="file.pdf" type="application/pdf">
        <object data="flash.swf"></object>
      `;
      const result = sanitizeHtml(dirty);
      
      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('<embed');
      expect(result).not.toContain('<object');
      expect(result).not.toContain('example.com');
      expect(result).not.toContain('file.pdf');
      expect(result).not.toContain('flash.swf');
      expect(result).toContain('Safe content');
    });

    it('should preserve safe HTML elements', () => {
      const safe = `
        <h1>Title</h1>
        <p>Paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
        <ul>
          <li>List item 1</li>
          <li>List item 2</li>
        </ul>
        <blockquote>Quote</blockquote>
        <code>Code snippet</code>
        <a href="https://safe-link.com">Safe link</a>
      `;
      const result = sanitizeHtml(safe);
      
      expect(result).toContain('<h1>');
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>');
      expect(result).toContain('<blockquote>');
      expect(result).toContain('<code>');
      expect(result).toContain('<a href=');
    });

    it('should remove event handlers', () => {
      const dangerous = `
        <p onclick="alert('click')">Click me</p>
        <div onmouseover="steal()">Hover</div>
        <span onerror="hack()" onload="malware()">Text</span>
      `;
      const result = sanitizeHtml(dangerous);
      
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('onmouseover');
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('onload');
      expect(result).not.toContain('alert');
      expect(result).not.toContain('steal');
      expect(result).not.toContain('hack');
      expect(result).not.toContain('malware');
      expect(result).toContain('Click me');
      expect(result).toContain('Hover');
      expect(result).toContain('Text');
    });

    it('should handle empty or invalid input', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(null as any)).toBe('');
      expect(sanitizeHtml(undefined as any)).toBe('');
      expect(sanitizeHtml(123 as any)).toBe('');
    });

    it('should use fallback sanitization in CI environment', () => {
      const originalEnv = process.env.CI;
      process.env.CI = 'true';
      
      const dirty = '<p>Safe</p><script>dangerous()</script><img src="bad.jpg">';
      const result = sanitizeHtml(dirty);
      
      expect(result).toContain('Safe');
      expect(result).not.toContain('<script');
      expect(result).not.toContain('<img');
      expect(result).not.toContain('dangerous');
      expect(result).not.toContain('bad.jpg');
      
      process.env.CI = originalEnv;
    });
  });

  describe('cleanMarkdownContent', () => {
    it('should remove image markdown syntax', () => {
      const markdown = `
# Title

Some text with ![Image Alt](image.jpg) inline.

![Another image](path/to/image.png "Image title")

More text here.
      `;
      const result = cleanMarkdownContent(markdown);
      
      expect(result).not.toContain('![Image Alt](image.jpg)');
      expect(result).not.toContain('![Another image](path/to/image.png "Image title")');
      expect(result).toContain('# Title');
      expect(result).toContain('Some text with  inline.');
      expect(result).toContain('More text here.');
    });

    it('should remove attachment links', () => {
      const markdown = `
# Document

Link to [[document.pdf]] attachment.
Reference to [[presentation.pptx|Slides]].
Audio file [[music.mp3]].
Video [[movie.mp4|My Video]].
Archive [[data.zip]].

Regular [[Internal Link]] should remain.
      `;
      const result = cleanMarkdownContent(markdown);
      
      expect(result).not.toContain('[[document.pdf]]');
      expect(result).not.toContain('[[presentation.pptx|Slides]]');
      expect(result).not.toContain('[[music.mp3]]');
      expect(result).not.toContain('[[movie.mp4|My Video]]');
      expect(result).not.toContain('[[data.zip]]');
      expect(result).toContain('[[Internal Link]]'); // Should keep non-attachment links
      expect(result).toContain('# Document');
      expect(result).toContain('should remain');
    });

    it('should remove embedded content syntax', () => {
      const markdown = `
# Note

Some text.

![[embedded-note]]

![[another-embed|Custom Title]]

More content.
      `;
      const result = cleanMarkdownContent(markdown);
      
      expect(result).not.toContain('![[embedded-note]]');
      expect(result).not.toContain('![[another-embed|Custom Title]]');
      expect(result).toContain('# Note');
      expect(result).toContain('Some text.');
      expect(result).toContain('More content.');
    });

    it('should remove HTML media tags in markdown', () => {
      const markdown = `
# Mixed Content

Regular text.

<img src="image.png" alt="HTML image">

<video src="video.mp4">Video content</video>

<audio controls>
  <source src="audio.mp3">
</audio>

<iframe src="https://example.com"></iframe>

More text.
      `;
      const result = cleanMarkdownContent(markdown);
      
      expect(result).not.toContain('<img');
      expect(result).not.toContain('<video');
      expect(result).not.toContain('<audio');
      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('image.png');
      expect(result).not.toContain('video.mp4');
      expect(result).not.toContain('audio.mp3');
      expect(result).not.toContain('example.com');
      expect(result).toContain('# Mixed Content');
      expect(result).toContain('Regular text.');
      expect(result).toContain('More text.');
    });

    it('should preserve text content and formatting', () => {
      const markdown = `
# Clean Document

This is a **bold** and *italic* text with \`code\`.

## Subsection

- List item 1
- List item 2
  - Nested item

\`\`\`javascript
function example() {
  return "Hello World";
}
\`\`\`

> Blockquote content

[External Link](https://example.com)

[[Internal Link]]

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |
      `;
      const result = cleanMarkdownContent(markdown);
      
      expect(result).toContain('# Clean Document');
      expect(result).toContain('**bold**');
      expect(result).toContain('*italic*');
      expect(result).toContain('`code`');
      expect(result).toContain('## Subsection');
      expect(result).toContain('- List item');
      expect(result).toContain('```javascript');
      expect(result).toContain('function example()');
      expect(result).toContain('> Blockquote');
      expect(result).toContain('[External Link]');
      expect(result).toContain('[[Internal Link]]');
      expect(result).toContain('| Column 1');
    });

    it('should handle empty input', () => {
      expect(cleanMarkdownContent('')).toBe('');
      expect(cleanMarkdownContent(null as any)).toBe('');
      expect(cleanMarkdownContent(undefined as any)).toBe('');
    });

    it('should normalize excessive whitespace', () => {
      const markdown = `
# Title



Too many line breaks.




More content.
      `;
      const result = cleanMarkdownContent(markdown);
      
      expect(result).not.toMatch(/\n\s*\n\s*\n/);
      expect(result).toContain('# Title');
      expect(result).toContain('Too many line breaks.');
      expect(result).toContain('More content.');
    });
  });

  describe('extractCleanTitle', () => {
    it('should extract title from H1 header', () => {
      const content = `
# My Document Title

Content here.

## Subsection

More content.
      `;
      const result = extractCleanTitle(content);
      expect(result).toBe('My Document Title');
    });

    it('should clean markdown formatting from title', () => {
      const content = '# **Bold** and *italic* and `code` title';
      const result = extractCleanTitle(content);
      expect(result).toBe('Bold and italic and code title');
    });

    it('should clean HTML tags from title', () => {
      const content = '# Title with <strong>HTML</strong> and <em>tags</em>';
      const result = extractCleanTitle(content);
      expect(result).toBe('Title with HTML and tags');
    });

    it('should use filename as fallback', () => {
      const content = 'No H1 header in this content.';
      const filename = 'my-document-file.md';
      const result = extractCleanTitle(content, filename);
      expect(result).toBe('my document file');
    });

    it('should normalize filename-based title', () => {
      const content = 'No header';
      const filename = 'test_file-name_with-dashes.md';
      const result = extractCleanTitle(content, filename);
      expect(result).toBe('test file name with dashes');
    });

    it('should return default for empty content and no filename', () => {
      const result = extractCleanTitle('');
      expect(result).toBe('Untitled Note');
    });

    it('should handle edge cases', () => {
      expect(extractCleanTitle('# ')).toBe('Untitled Note');
      expect(extractCleanTitle('# \n\nContent')).toBe('Untitled Note');
      expect(extractCleanTitle('', '')).toBe('Untitled Note');
      expect(extractCleanTitle('', '.md')).toBe('Untitled Note');
    });
  });

  describe('containsMediaContent', () => {
    it('should detect image markdown syntax', () => {
      expect(containsMediaContent('Text with ![image](pic.jpg) inline')).toBe(true);
      expect(containsMediaContent('![Another image](path.png "title")')).toBe(true);
    });

    it('should detect HTML media tags', () => {
      expect(containsMediaContent('Content with <img src="pic.jpg">')).toBe(true);
      expect(containsMediaContent('<video src="vid.mp4"></video>')).toBe(true);
      expect(containsMediaContent('<audio controls><source src="sound.mp3"></audio>')).toBe(true);
      expect(containsMediaContent('<iframe src="https://example.com"></iframe>')).toBe(true);
    });

    it('should detect attachment references', () => {
      expect(containsMediaContent('Link to [[document.pdf]] file')).toBe(true);
      expect(containsMediaContent('See [[presentation.pptx|Slides]]')).toBe(true);
      expect(containsMediaContent('Audio: [[music.mp3]]')).toBe(true);
      expect(containsMediaContent('Video: [[movie.avi]]')).toBe(true);
      expect(containsMediaContent('Archive: [[data.zip]]')).toBe(true);
    });

    it('should return false for clean content', () => {
      const cleanContent = `
        # Clean Document
        
        This is plain text with **formatting** and *emphasis*.
        
        - List items
        - More items
        
        [Regular link](https://example.com)
        [[Internal link]]
        
        \`\`\`code
        function example() {}
        \`\`\`
        
        > Blockquote
      `;
      expect(containsMediaContent(cleanContent)).toBe(false);
    });

    it('should handle empty or invalid input', () => {
      expect(containsMediaContent('')).toBe(false);
      expect(containsMediaContent(null as any)).toBe(false);
      expect(containsMediaContent(undefined as any)).toBe(false);
    });

    it('should distinguish between regular and attachment links', () => {
      expect(containsMediaContent('[[Regular Note Link]]')).toBe(false);
      expect(containsMediaContent('[[folder/Regular Link]]')).toBe(false);
      expect(containsMediaContent('[[image.jpg]]')).toBe(true);
      expect(containsMediaContent('[[file.pdf]]')).toBe(true);
    });
  });
});