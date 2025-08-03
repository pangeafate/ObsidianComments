import { markdownToProseMirror } from '../markdownConverter';

describe('markdownConverter', () => {
  describe('markdownToProseMirror', () => {
    it('should convert simple markdown to ProseMirror JSON', () => {
      const markdown = '# Heading\n\nThis is a paragraph.';
      
      const result = markdownToProseMirror(markdown);
      
      expect(result).toEqual({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Heading' }]
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'This is a paragraph.' }]
          }
        ]
      });
    });

    it('should convert markdown with multiple headings', () => {
      const markdown = '# H1\n\n## H2\n\n### H3\n\nContent here.';
      
      const result = markdownToProseMirror(markdown);
      
      expect(result.content).toHaveLength(4);
      expect(result.content[0].attrs?.level).toBe(1);
      expect(result.content[1].attrs?.level).toBe(2);
      expect(result.content[2].attrs?.level).toBe(3);
    });

    it('should convert markdown with lists', () => {
      const markdown = '- Item 1\n- Item 2\n- Item 3';
      
      const result = markdownToProseMirror(markdown);
      
      expect(result.content[0].type).toBe('bulletList');
      expect(result.content[0].content).toHaveLength(3);
      expect(result.content[0].content[0].type).toBe('listItem');
    });

    it('should convert markdown with task lists', () => {
      const markdown = '- [ ] Unchecked task\n- [x] Checked task';
      
      const result = markdownToProseMirror(markdown);
      
      expect(result.content[0].type).toBe('taskList');
      expect(result.content[0].content).toHaveLength(2);
      expect(result.content[0].content[0].attrs?.checked).toBe(false);
      expect(result.content[0].content[1].attrs?.checked).toBe(true);
    });

    it('should convert markdown with code blocks', () => {
      const markdown = '```javascript\nconsole.log("Hello");\n```';
      
      const result = markdownToProseMirror(markdown);
      
      expect(result.content[0].type).toBe('codeBlock');
      expect(result.content[0].attrs?.language).toBe('javascript');
      expect(result.content[0].content?.[0].text).toBe('console.log("Hello");');
    });

    it('should convert markdown with emphasis and strong text', () => {
      const markdown = 'This is *italic* and **bold** text.';
      
      const result = markdownToProseMirror(markdown);
      
      expect(result.content[0].type).toBe('paragraph');
      expect(result.content[0].content).toHaveLength(5);
      expect(result.content[0].content[1].marks).toEqual([{ type: 'em' }]);
      expect(result.content[0].content[3].marks).toEqual([{ type: 'strong' }]);
    });

    it('should handle empty or whitespace-only markdown', () => {
      expect(markdownToProseMirror('')).toEqual({
        type: 'doc',
        content: [{ type: 'paragraph' }]
      });
      
      expect(markdownToProseMirror('   \n\n   ')).toEqual({
        type: 'doc',
        content: [{ type: 'paragraph' }]
      });
    });

    it('should convert markdown with blockquotes', () => {
      const markdown = '> This is a quote\n> with multiple lines';
      
      const result = markdownToProseMirror(markdown);
      
      expect(result.content[0].type).toBe('blockquote');
      expect(result.content[0].content[0].type).toBe('paragraph');
    });

    it('should convert complex nested markdown', () => {
      const markdown = `# Document Title

This is the introduction paragraph.

## Features

- Collaborative editing
- Real-time comments  
- Track changes

### Implementation

Here's a code example:

\`\`\`typescript
const editor = new Editor();
\`\`\`

> Important note about the implementation.

- [x] Feature completed
- [ ] Feature in progress`;
      
      const result = markdownToProseMirror(markdown);
      
      // Should have multiple top-level elements
      expect(result.content.length).toBeGreaterThan(5);
      
      // Check that we have headings, paragraphs, lists, code blocks, blockquotes
      const types = result.content.map(node => node.type);
      expect(types).toContain('heading');
      expect(types).toContain('paragraph');
      expect(types).toContain('bulletList');
      expect(types).toContain('codeBlock');
      expect(types).toContain('blockquote');
      expect(types).toContain('taskList');
    });
  });
});