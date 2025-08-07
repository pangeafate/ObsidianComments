/**
 * Content Filtering Tests - TDD Approach
 * 
 * Tests for the ShareNote plugin's content filtering capabilities.
 * Ensures that images, attachments, and media are properly removed.
 */

import { ShareNotePlugin } from '../../src/main';
import { App, TFile } from 'obsidian';

describe('ShareNotePlugin Content Filtering', () => {
  let plugin: ShareNotePlugin;
  let mockApp: jest.Mocked<App>;

  beforeEach(() => {
    mockApp = {
      vault: { read: jest.fn() },
      workspace: { getActiveFile: jest.fn() }
    } as any;

    plugin = new ShareNotePlugin(mockApp, {
      id: 'share-note',
      name: 'Share Note',
      version: '1.0.0'
    });
  });

  describe('cleanMarkdownContent', () => {
    it('should remove image markdown syntax', () => {
      const content = `
# Document Title

Some text with ![Image Alt](image.jpg) inline image.

![Another image](path/to/image.png "Image title")

More text after images.
      `;
      
      const result = plugin.cleanMarkdownContent(content);
      
      expect(result).not.toContain('![Image Alt](image.jpg)');
      expect(result).not.toContain('![Another image](path/to/image.png "Image title")');
      expect(result).toContain('# Document Title');
      expect(result).toContain('Some text with  inline image.');
      expect(result).toContain('More text after images.');
    });

    it('should remove attachment links with various extensions', () => {
      const content = `
# Document with Attachments

PDF reference: [[document.pdf]]
Word doc: [[report.docx|Report]]
Excel file: [[data.xlsx]]
PowerPoint: [[slides.pptx|Presentation]]
Image: [[photo.jpg]]
Video: [[movie.mp4|My Video]]
Audio: [[song.mp3]]
Archive: [[backup.zip]]
Executable: [[program.exe]]

Regular note link: [[My Note]] should remain.
      `;
      
      const result = plugin.cleanMarkdownContent(content);
      
      // Should remove all attachment links
      expect(result).not.toContain('[[document.pdf]]');
      expect(result).not.toContain('[[report.docx|Report]]');
      expect(result).not.toContain('[[data.xlsx]]');
      expect(result).not.toContain('[[slides.pptx|Presentation]]');
      expect(result).not.toContain('[[photo.jpg]]');
      expect(result).not.toContain('[[movie.mp4|My Video]]');
      expect(result).not.toContain('[[song.mp3]]');
      expect(result).not.toContain('[[backup.zip]]');
      expect(result).not.toContain('[[program.exe]]');
      
      // Should keep regular note links
      expect(result).toContain('[[My Note]]');
      expect(result).toContain('should remain');
      expect(result).toContain('# Document with Attachments');
    });

    it('should remove embedded/transcluded content', () => {
      const content = `
# Main Document

Regular content here.

![[embedded-note]]

More content.

![[another-embed|Custom Display]]

Final content.
      `;
      
      const result = plugin.cleanMarkdownContent(content);
      
      expect(result).not.toContain('![[embedded-note]]');
      expect(result).not.toContain('![[another-embed|Custom Display]]');
      expect(result).toContain('# Main Document');
      expect(result).toContain('Regular content here.');
      expect(result).toContain('More content.');
      expect(result).toContain('Final content.');
    });

    it('should remove HTML media tags', () => {
      const content = `
# Mixed Content Document

Text content.

<img src="image.png" alt="HTML Image">

<video src="video.mp4" controls>
  Your browser does not support video.
</video>

<audio controls>
  <source src="audio.mp3" type="audio/mpeg">
</audio>

<iframe src="https://www.youtube.com/embed/abc123" width="560" height="315"></iframe>

<embed src="document.pdf" type="application/pdf">

<object data="flash.swf" type="application/x-shockwave-flash"></object>

More text content.
      `;
      
      const result = plugin.cleanMarkdownContent(content);
      
      expect(result).not.toContain('<img');
      expect(result).not.toContain('<video');
      expect(result).not.toContain('<audio');
      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('<embed');
      expect(result).not.toContain('<object');
      expect(result).not.toContain('image.png');
      expect(result).not.toContain('video.mp4');
      expect(result).not.toContain('audio.mp3');
      expect(result).not.toContain('youtube.com');
      expect(result).not.toContain('document.pdf');
      expect(result).not.toContain('flash.swf');
      
      expect(result).toContain('# Mixed Content Document');
      expect(result).toContain('Text content.');
      expect(result).toContain('More text content.');
    });

    it('should preserve safe markdown content', () => {
      const safeContent = `
# Clean Document

This document contains only **safe** content with *emphasis* and \`code\`.

## Section 2

- Bullet point 1
- Bullet point 2
  - Nested bullet

### Subsection

1. Numbered list
2. Another item

\`\`\`javascript
function safeCode() {
  return "This is safe";
}
\`\`\`

> This is a blockquote

[External link](https://example.com) is safe.
[[Internal note link]] is also safe.

| Column 1 | Column 2 |
|----------|----------|
| Data     | More data|

---

*Horizontal rule above*

**End of document**
      `;
      
      const result = plugin.cleanMarkdownContent(safeContent);
      
      // Should preserve all safe content
      expect(result).toContain('# Clean Document');
      expect(result).toContain('**safe**');
      expect(result).toContain('*emphasis*');
      expect(result).toContain('`code`');
      expect(result).toContain('## Section 2');
      expect(result).toContain('- Bullet point');
      expect(result).toContain('### Subsection');
      expect(result).toContain('1. Numbered list');
      expect(result).toContain('```javascript');
      expect(result).toContain('function safeCode()');
      expect(result).toContain('> This is a blockquote');
      expect(result).toContain('[External link](https://example.com)');
      expect(result).toContain('[[Internal note link]]');
      expect(result).toContain('| Column 1');
      expect(result).toContain('---');
      expect(result).toContain('**End of document**');
    });

    it('should handle edge cases and malformed content', () => {
      const edgeCases = [
        '', // Empty string
        '![]()', // Empty image
        '[[]]', // Empty link
        '![[]]', // Empty embed
        '<img>', // Malformed HTML
        '![Unclosed image](image.jpg', // Unclosed markdown
        '[[file.pdf', // Unclosed attachment
      ];
      
      edgeCases.forEach(content => {
        expect(() => plugin.cleanMarkdownContent(content)).not.toThrow();
        const result = plugin.cleanMarkdownContent(content);
        expect(typeof result).toBe('string');
      });
    });

    it('should normalize excessive whitespace', () => {
      const content = `
# Title



Too many blank lines.




More content here.
      `;
      
      const result = plugin.cleanMarkdownContent(content);
      
      // Should not have more than two consecutive newlines
      expect(result).not.toMatch(/\n\s*\n\s*\n/);
      expect(result.trim()).toContain('# Title');
      expect(result.trim()).toContain('Too many blank lines.');
      expect(result.trim()).toContain('More content here.');
    });
  });

  describe('cleanHTML', () => {
    it('should remove images from HTML element', () => {
      const mockElement = document.createElement('div');
      mockElement.innerHTML = `
        <p>Text content</p>
        <img src="image1.jpg" alt="Image 1">
        <p>More text</p>
        <img src="image2.png" alt="Image 2">
        <p>Final text</p>
      `;
      
      const result = plugin.cleanHTML(mockElement);
      
      expect(result).not.toContain('<img');
      expect(result).not.toContain('image1.jpg');
      expect(result).not.toContain('image2.png');
      expect(result).toContain('Text content');
      expect(result).toContain('More text');
      expect(result).toContain('Final text');
    });

    it('should remove video and audio elements', () => {
      const mockElement = document.createElement('div');
      mockElement.innerHTML = `
        <p>Content before</p>
        <video src="video.mp4" controls>Video content</video>
        <audio src="audio.mp3" controls>Audio content</audio>
        <p>Content after</p>
      `;
      
      const result = plugin.cleanHTML(mockElement);
      
      expect(result).not.toContain('<video');
      expect(result).not.toContain('<audio');
      expect(result).not.toContain('video.mp4');
      expect(result).not.toContain('audio.mp3');
      expect(result).toContain('Content before');
      expect(result).toContain('Content after');
    });

    it('should remove iframe, embed, and object elements', () => {
      const mockElement = document.createElement('div');
      mockElement.innerHTML = `
        <p>Safe content</p>
        <iframe src="https://example.com/embed"></iframe>
        <embed src="document.pdf" type="application/pdf">
        <object data="flash.swf" type="application/x-shockwave-flash"></object>
        <p>More safe content</p>
      `;
      
      const result = plugin.cleanHTML(mockElement);
      
      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('<embed');
      expect(result).not.toContain('<object');
      expect(result).not.toContain('example.com');
      expect(result).not.toContain('document.pdf');
      expect(result).not.toContain('flash.swf');
      expect(result).toContain('Safe content');
      expect(result).toContain('More safe content');
    });

    it('should remove file and attachment links', () => {
      const mockElement = document.createElement('div');
      mockElement.innerHTML = `
        <p>Content with links</p>
        <a href="file:///path/to/local/file.txt">Local file</a>
        <a href="document.pdf">PDF link</a>
        <a href="report.docx">Word doc</a>
        <a href="data.xlsx">Excel file</a>
        <a href="slides.pptx">PowerPoint</a>
        <a href="archive.zip">Zip file</a>
        <a href="backup.rar">RAR file</a>
        <a href="https://example.com">Safe external link</a>
        <p>More content</p>
      `;
      
      const result = plugin.cleanHTML(mockElement);
      
      expect(result).not.toContain('href="file:');
      expect(result).not.toContain('href="document.pdf"');
      expect(result).not.toContain('href="report.docx"');
      expect(result).not.toContain('href="data.xlsx"');
      expect(result).not.toContain('href="slides.pptx"');
      expect(result).not.toContain('href="archive.zip"');
      expect(result).not.toContain('href="backup.rar"');
      
      // Should preserve safe external links
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('Safe external link');
      expect(result).toContain('Content with links');
      expect(result).toContain('More content');
    });

    it('should remove Obsidian-specific elements', () => {
      const mockElement = document.createElement('div');
      mockElement.innerHTML = `
        <div class="frontmatter">
          <p>Frontmatter content</p>
        </div>
        <p>Main content</p>
        <button class="edit-block-button">Edit</button>
        <p>More content</p>
      `;
      
      const result = plugin.cleanHTML(mockElement);
      
      expect(result).not.toContain('frontmatter');
      expect(result).not.toContain('edit-block-button');
      expect(result).not.toContain('Frontmatter content');
      expect(result).not.toContain('<button');
      expect(result).toContain('Main content');
      expect(result).toContain('More content');
    });

    it('should convert internal links to plain text', () => {
      const mockElement = document.createElement('div');
      mockElement.innerHTML = `
        <p>Content with links</p>
        <a class="internal-link" href="#note">Internal Note</a>
        <p>More content</p>
        <a class="internal-link" href="#another">Another Note</a>
        <a href="https://external.com">External Link</a>
        <p>Final content</p>
      `;
      
      const result = plugin.cleanHTML(mockElement);
      
      // Internal links should become plain text
      expect(result).not.toContain('<a class="internal-link"');
      expect(result).not.toContain('href="#note"');
      expect(result).not.toContain('href="#another"');
      expect(result).toContain('Internal Note');
      expect(result).toContain('Another Note');
      
      // External links should be preserved
      expect(result).toContain('<a href="https://external.com"');
      expect(result).toContain('External Link');
      
      expect(result).toContain('Content with links');
      expect(result).toContain('More content');
      expect(result).toContain('Final content');
    });
  });

  describe('isTextFile', () => {
    it('should allow text file extensions', () => {
      const textFiles = [
        { extension: 'md' },
        { extension: 'txt' },
        { extension: 'org' },
        { extension: 'tex' },
        { extension: 'rst' }
      ] as TFile[];
      
      textFiles.forEach(file => {
        expect(plugin.isTextFile(file)).toBe(true);
      });
    });

    it('should block binary file extensions', () => {
      const binaryFiles = [
        { extension: 'pdf' },
        { extension: 'docx' },
        { extension: 'xlsx' },
        { extension: 'jpg' },
        { extension: 'png' },
        { extension: 'mp4' },
        { extension: 'mp3' },
        { extension: 'zip' },
        { extension: 'exe' }
      ] as TFile[];
      
      binaryFiles.forEach(file => {
        expect(plugin.isTextFile(file)).toBe(false);
      });
    });

    it('should handle files without extensions', () => {
      const noExtensionFile = { extension: '' } as TFile;
      expect(plugin.isTextFile(noExtensionFile)).toBe(true);
    });

    it('should handle unknown extensions', () => {
      const unknownFile = { extension: 'xyz' } as TFile;
      expect(plugin.isTextFile(unknownFile)).toBe(true);
    });

    it('should be case insensitive', () => {
      const mixedCaseFiles = [
        { extension: 'MD' },
        { extension: 'PDF' },
        { extension: 'JpG' },
        { extension: 'TxT' }
      ] as TFile[];
      
      expect(plugin.isTextFile(mixedCaseFiles[0])).toBe(true);  // MD
      expect(plugin.isTextFile(mixedCaseFiles[1])).toBe(false); // PDF
      expect(plugin.isTextFile(mixedCaseFiles[2])).toBe(false); // JPG
      expect(plugin.isTextFile(mixedCaseFiles[3])).toBe(true);  // TXT
    });
  });

  describe('extractCleanTitle', () => {
    it('should extract title from H1 in content', () => {
      const file = { basename: 'filename' } as TFile;
      const content = '# Document Title\n\nContent here.';
      
      const result = plugin.extractCleanTitle(file, content);
      expect(result).toBe('Document Title');
    });

    it('should clean markdown formatting from title', () => {
      const file = { basename: 'filename' } as TFile;
      const content = '# **Bold** *italic* `code` ~~strike~~ title';
      
      const result = plugin.extractCleanTitle(file, content);
      expect(result).toBe('Bold italic code strike title');
    });

    it('should clean HTML tags from title', () => {
      const file = { basename: 'filename' } as TFile;
      const content = '# Title with <strong>HTML</strong> <em>tags</em>';
      
      const result = plugin.extractCleanTitle(file, content);
      expect(result).toBe('Title with HTML tags');
    });

    it('should fall back to filename', () => {
      const file = { basename: 'my-document-name' } as TFile;
      const content = 'Content without H1 header.';
      
      const result = plugin.extractCleanTitle(file, content);
      expect(result).toBe('my document name');
    });

    it('should normalize filename-based titles', () => {
      const file = { basename: 'test_file-name_with-symbols' } as TFile;
      const content = 'No header content.';
      
      const result = plugin.extractCleanTitle(file, content);
      expect(result).toBe('test file name with symbols');
    });

    it('should handle edge cases', () => {
      const file = { basename: '' } as TFile;
      
      expect(plugin.extractCleanTitle(file, '# ')).toBe('Untitled Note');
      expect(plugin.extractCleanTitle(file, '')).toBe('Untitled Note');
      expect(plugin.extractCleanTitle(file, 'No header')).toBe('Untitled Note');
    });
  });

  describe('integration with content filtering', () => {
    it('should produce clean content when sharing notes with media', () => {
      const content = `
# My Research Document

This document contains various media that should be filtered out.

![Research Image](research-photo.jpg)

Here's a reference to the [[data.xlsx|spreadsheet]] with our findings.

![[embedded-chart]]

<video src="presentation.mp4" controls>
  Presentation video
</video>

The main findings are:
- Point 1
- Point 2

Link to [[analysis.pdf|full analysis]].

<iframe src="https://external-tool.com/embed"></iframe>

Final conclusions here.
      `;
      
      const cleaned = plugin.cleanMarkdownContent(content);
      
      // Verify all media is removed
      expect(cleaned).not.toContain('![Research Image](research-photo.jpg)');
      expect(cleaned).not.toContain('[[data.xlsx|spreadsheet]]');
      expect(cleaned).not.toContain('![[embedded-chart]]');
      expect(cleaned).not.toContain('<video');
      expect(cleaned).not.toContain('presentation.mp4');
      expect(cleaned).not.toContain('[[analysis.pdf|full analysis]]');
      expect(cleaned).not.toContain('<iframe');
      expect(cleaned).not.toContain('external-tool.com');
      
      // Verify safe content is preserved
      expect(cleaned).toContain('# My Research Document');
      expect(cleaned).toContain('This document contains various media');
      expect(cleaned).toContain('The main findings are:');
      expect(cleaned).toContain('- Point 1');
      expect(cleaned).toContain('- Point 2');
      expect(cleaned).toContain('Final conclusions here.');
    });
  });
});