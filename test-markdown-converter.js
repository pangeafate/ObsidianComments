// Quick test of markdownToProseMirror function
const testContent = `# Test Note from Plugin

This is a test note shared from Obsidian plugin.

## Section 1
Some content here.

1. Numbered list item 1
2. Numbered list item 2  
3. Numbered list item 3

## Section 2
- Bullet point 1
- Bullet point 2

Final paragraph with **bold** and *italic* text.`;

function markdownToProseMirror(markdown) {
  if (!markdown.trim()) {
    return {
      type: 'doc',
      content: [{ type: 'paragraph' }]
    };
  }

  const lines = markdown.split('\n');
  const content = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    
    // Skip empty lines at the beginning
    if (!line.trim() && content.length === 0) {
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      content.push({
        type: 'heading',
        attrs: { level: headingMatch[1].length },
        content: [{ type: 'text', text: headingMatch[2] }]
      });
      i++;
      continue;
    }

    // Regular paragraph
    if (line.trim()) {
      // Collect consecutive non-empty lines for a paragraph
      const paragraphLines = [];
      while (i < lines.length && lines[i].trim() && !lines[i].match(/^#{1,6}\s/)) {
        paragraphLines.push(lines[i]);
        i++;
      }
      
      if (paragraphLines.length > 0) {
        content.push({
          type: 'paragraph',
          content: [{ type: 'text', text: paragraphLines.join(' ') }]
        });
      }
      continue;
    }
    
    i++;
  }

  return {
    type: 'doc',
    content
  };
}

console.log('Testing markdown converter...');
const result = markdownToProseMirror(testContent);
console.log('Result:', JSON.stringify(result, null, 2));
console.log('Content nodes:', result.content.length);