import { extractSmartTitle, extractSmartTitleSimple } from '../smartTitle';

describe('smartTitle', () => {
  describe('extractSmartTitle', () => {
    it('should extract title from markdown heading', () => {
      const content = '# My Document Title\n\nSome content here.';
      const result = extractSmartTitle(content);
      
      expect(result).toBe('My Document Title');
    });

    it('should extract title from HTML heading', () => {
      const content = '<h1>My HTML Title</h1><p>Some content here.</p>';
      const result = extractSmartTitle(content);
      
      expect(result).toBe('My HTML Title');
    });

    it('should extract title from first line if no heading', () => {
      const content = 'This is the first line\nThis is the second line';
      const result = extractSmartTitle(content);
      
      expect(result).toBe('This is the first line');
    });

    it('should generate date-based title for empty content', () => {
      const result = extractSmartTitle('');
      
      expect(result).toMatch(/^New Document \d{1,2}\/\d{1,2}\/\d{4}$/);
    });

    it('should generate date-based title for whitespace-only content', () => {
      const result = extractSmartTitle('   \n\n  ');
      
      expect(result).toMatch(/^New Document \d{1,2}\/\d{1,2}\/\d{4}$/);
    });

    it('should handle multiple headings and use the first', () => {
      const content = '# First Title\n\n## Second Title\n\nContent here.';
      const result = extractSmartTitle(content);
      
      expect(result).toBe('First Title');
    });

    it('should clean up title text', () => {
      const content = '#    My Title With Extra Spaces   \n\nContent.';
      const result = extractSmartTitle(content);
      
      expect(result).toBe('My Title With Extra Spaces');
    });

    it('should handle HTML with track changes markup', () => {
      const content = '<h1>Title <span data-track-changes="insertion">Added</span></h1>';
      const result = extractSmartTitle(content);
      
      expect(result).toBe('Title Added');
    });

    it('should truncate very long titles', () => {
      const longTitle = 'A'.repeat(200);
      const content = `# ${longTitle}\n\nContent.`;
      const result = extractSmartTitle(content);
      
      expect(result.length).toBeLessThanOrEqual(100);
      expect(result).toContain('A');
    });
  });

  describe('extractSmartTitleSimple', () => {
    it('should extract title from HTML content', () => {
      const content = '<h1>Simple Title</h1><p>Content here.</p>';
      const result = extractSmartTitleSimple(content);
      
      expect(result).toBe('Simple Title');
    });

    it('should handle markdown headers', () => {
      const content = '# Markdown Title\n\nContent here.';
      const result = extractSmartTitleSimple(content);
      
      expect(result).toBe('Markdown Title');
    });

    it('should truncate long titles', () => {
      const longTitle = 'A'.repeat(100);
      const content = `<h1>${longTitle}</h1>`;
      const result = extractSmartTitleSimple(content);
      
      expect(result.length).toBeLessThanOrEqual(60);
      expect(result).toContain('...');
    });

    it('should handle empty content', () => {
      const result = extractSmartTitleSimple('');
      
      expect(result).toMatch(/^New Document \d{1,2}\/\d{1,2}\/\d{4}$/);
    });

    it('should handle content with only short text', () => {
      const result = extractSmartTitleSimple('Hi');
      
      expect(result).toMatch(/^New Document \d{1,2}\/\d{1,2}\/\d{4}$/);
    });
  });
});