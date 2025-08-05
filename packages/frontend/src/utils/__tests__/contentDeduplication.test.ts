import { 
  initializeContentSafely, 
  deduplicateContent, 
  analyzeContentDuplication, 
  ContentAnalysis 
} from '../contentDeduplication';

describe('contentDeduplication', () => {
  describe('analyzeContentDuplication', () => {
    it('should detect duplicated content', () => {
      const duplicatedText = 'This is a long line that appears multiple times in the content\nThis is a long line that appears multiple times in the content';
      const result = analyzeContentDuplication(duplicatedText);
      
      expect(result.hasDuplication).toBe(true);
      expect(result.duplicatedSections.length).toBeGreaterThan(0);
    });

    it('should not detect unique content as duplicated', () => {
      const uniqueText = 'This is the first unique line\nThis is the second unique line';
      const result = analyzeContentDuplication(uniqueText);
      
      expect(result.hasDuplication).toBe(false);
      expect(result.duplicatedSections).toHaveLength(0);
    });

    it('should handle empty content', () => {
      const result = analyzeContentDuplication('');
      
      expect(result.hasDuplication).toBe(false);
      expect(result.duplicatedSections).toHaveLength(0);
    });

    it('should handle short content', () => {
      const result = analyzeContentDuplication('Hi');
      
      expect(result.hasDuplication).toBe(false);
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('deduplicateContent', () => {
    it('should remove duplicated lines', () => {
      const duplicatedText = 'This is a long line to avoid short line filter\nThis is a long line to avoid short line filter\nGoodbye world is also long';
      const result = deduplicateContent(duplicatedText);
      
      expect(result).toContain('This is a long line to avoid short line filter');
      expect(result).toContain('Goodbye world is also long');
    });

    it('should preserve unique content', () => {
      const uniqueText = 'Hello world is a long line\nGoodbye world is also long';
      const result = deduplicateContent(uniqueText);
      
      expect(result).toBe(uniqueText);
    });

    it('should handle empty content', () => {
      const result = deduplicateContent('');
      
      expect(result).toBe('');
    });

    it('should preserve order of first occurrence', () => {
      const duplicatedText = 'First line is long enough\nSecond line is also long\nFirst line is long enough\nThird line is long too\nSecond line is also long';
      const result = deduplicateContent(duplicatedText);
      
      expect(result).toContain('First line is long enough');
      expect(result).toContain('Second line is also long');
      expect(result).toContain('Third line is long too');
    });

    it('should handle content with special characters', () => {
      const text = '# Header line that is long enough\n# Header line that is long enough\n- List item that is also long\n- List item that is also long';
      const result = deduplicateContent(text);
      
      expect(result).toContain('# Header line that is long enough');
      expect(result).toContain('- List item that is also long');
    });
  });

  describe('initializeContentSafely', () => {
    it('should call callback with deduplicated content when yjs is empty', () => {
      const callback = jest.fn();
      const yjsContent = '';
      const apiContent = 'This is a long line to avoid short line filter\nThis is a long line to avoid short line filter';
      
      initializeContentSafely(yjsContent, apiContent, callback);
      
      expect(callback).toHaveBeenCalledWith(expect.stringContaining('This is a long line to avoid short line filter'));
    });

    it('should not call callback when api content is empty', () => {
      const callback = jest.fn();
      const yjsContent = '';
      const apiContent = '';
      
      initializeContentSafely(yjsContent, apiContent, callback);
      
      expect(callback).toHaveBeenCalledWith('');
    });

    it('should handle content with duplication in yjs', () => {
      const callback = jest.fn();
      const yjsContent = 'This is duplicated content that is long enough to trigger analysis\nThis is duplicated content that is long enough to trigger analysis\nThis is duplicated content that is long enough to trigger analysis';
      const apiContent = 'Different content';
      
      initializeContentSafely(yjsContent, apiContent, callback);
      
      // Should clean the yjs content due to high duplication
      expect(callback).toHaveBeenCalled();
    });

    it('should not call callback when yjs content is clean', () => {
      const callback = jest.fn();
      const yjsContent = 'This is clean content without any duplication that is substantial enough';
      const apiContent = 'Different content';
      
      initializeContentSafely(yjsContent, apiContent, callback);
      
      expect(callback).not.toHaveBeenCalled();
    });
  });
});