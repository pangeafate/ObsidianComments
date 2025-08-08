interface ProseMirrorNode {
  type: string;
  content?: ProseMirrorNode[];
  attrs?: Record<string, any>;
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
  text?: string;
}

interface ProseMirrorDoc {
  type: 'doc';
  content: ProseMirrorNode[];
}

export function markdownToProseMirror(markdown: string): ProseMirrorDoc {
  if (!markdown.trim()) {
    return {
      type: 'doc',
      content: [{ type: 'paragraph' }]
    };
  }

  const lines = markdown.split('\n');
  const content: ProseMirrorNode[] = [];
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

    // Code blocks
    if (line.startsWith('```')) {
      const language = line.substring(3).trim() || null;
      const codeLines: string[] = [];
      i++;
      
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      
      content.push({
        type: 'codeBlock',
        attrs: language ? { language } : {},
        content: [{ type: 'text', text: codeLines.join('\n') }]
      });
      i++; // Skip closing ```
      continue;
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].substring(2));
        i++;
      }
      
      const quoteParagraph = quoteLines.join(' ').trim();
      content.push({
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: quoteParagraph ? parseInlineContent(quoteParagraph) : []
          }
        ]
      });
      continue;
    }

    // Task lists
    if (line.match(/^-\s+\[[x\s]\]/)) {
      const taskItems: ProseMirrorNode[] = [];
      
      while (i < lines.length && lines[i].match(/^-\s+\[[x\s]\]/)) {
        const taskMatch = lines[i].match(/^-\s+\[([x\s])\]\s*(.*)$/);
        if (taskMatch) {
          taskItems.push({
            type: 'taskItem',
            attrs: { checked: taskMatch[1] === 'x' },
            content: [
              {
                type: 'paragraph',
                content: taskMatch[2] ? parseInlineContent(taskMatch[2]) : []
              }
            ]
          });
        }
        i++;
      }
      
      content.push({
        type: 'taskList',
        content: taskItems
      });
      continue;
    }

    // Regular bullet lists
    if (line.startsWith('- ')) {
      const listItems: ProseMirrorNode[] = [];
      
      while (i < lines.length && lines[i].startsWith('- ')) {
        const itemText = lines[i].substring(2).trim();
        listItems.push({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: itemText ? parseInlineContent(itemText) : []
            }
          ]
        });
        i++;
      }
      
      content.push({
        type: 'bulletList',
        content: listItems
      });
      continue;
    }

    // Regular paragraphs
    if (line.trim()) {
      // Collect all consecutive non-empty lines for the paragraph
      const paragraphLines: string[] = [];
      while (i < lines.length && lines[i].trim() && !isSpecialLine(lines[i])) {
        paragraphLines.push(lines[i].trim());
        i++;
      }
      
      if (paragraphLines.length > 0) {
        const paragraphText = paragraphLines.join(' ');
        content.push({
          type: 'paragraph',
          content: parseInlineContent(paragraphText)
        });
      }
      continue;
    }
    
    i++;
  }

  // Ensure we have at least one paragraph
  if (content.length === 0) {
    content.push({ type: 'paragraph' });
  }

  return {
    type: 'doc',
    content
  };
}

function parseInlineContent(text: string): ProseMirrorNode[] {
  const content: ProseMirrorNode[] = [];
  let i = 0;
  
  while (i < text.length) {
    // Bold text **text**
    if (text.substring(i, i + 2) === '**') {
      const endIndex = text.indexOf('**', i + 2);
      if (endIndex !== -1) {
        const boldText = text.substring(i + 2, endIndex);
        content.push({
          type: 'text',
          text: boldText,
          marks: [{ type: 'bold' }]
        });
        i = endIndex + 2;
        continue;
      }
    }
    
    // Italic text *text*
    if (text[i] === '*' && text[i + 1] !== '*') {
      const endIndex = text.indexOf('*', i + 1);
      if (endIndex !== -1) {
        const italicText = text.substring(i + 1, endIndex);
        content.push({
          type: 'text',
          text: italicText,
          marks: [{ type: 'italic' }]
        });
        i = endIndex + 1;
        continue;
      }
    }
    
    // Find next special character or end of string
    let nextSpecial = text.length;
    for (let j = i + 1; j < text.length; j++) {
      if (text[j] === '*') {
        nextSpecial = j;
        break;
      }
    }
    
    // Add regular text
    const regularText = text.substring(i, nextSpecial);
    if (regularText) {
      content.push({
        type: 'text',
        text: regularText
      });
    }
    
    i = nextSpecial;
  }
  
  return content;
}

function isSpecialLine(line: string): boolean {
  return (
    line.match(/^#{1,6}\s/) ||           // Headings
    line.startsWith('```') ||            // Code blocks
    line.startsWith('> ') ||             // Blockquotes
    line.startsWith('- ') ||             // Lists
    line.match(/^-\s+\[[x\s]\]/)        // Task lists
  ) !== null;
}

/**
 * Convert markdown to HTML for ViewPage component
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown.trim()) {
    return '<p></p>';
  }

  const lines = markdown.split('\n');
  const html: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    
    // Skip empty lines at the beginning
    if (!line.trim() && html.length === 0) {
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = escapeHtml(headingMatch[2]);
      html.push(`<h${level}>${processInlineMarkdown(text)}</h${level}>`);
      i++;
      continue;
    }

    // Code blocks
    if (line.startsWith('```')) {
      const language = line.substring(3).trim();
      const codeLines: string[] = [];
      i++;
      
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(escapeHtml(lines[i]));
        i++;
      }
      
      const languageClass = language ? ` language-${language}` : '';
      html.push(`<pre><code class="${languageClass}">${codeLines.join('\n')}</code></pre>`);
      i++; // Skip closing ```
      continue;
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].substring(2));
        i++;
      }
      
      const quoteText = quoteLines.join(' ').trim();
      html.push(`<blockquote><p>${processInlineMarkdown(escapeHtml(quoteText))}</p></blockquote>`);
      continue;
    }

    // Task lists
    if (line.match(/^-\s+\[[x\s]\]/)) {
      html.push('<ul class="task-list" style="list-style: none; padding-left: 0;">');
      
      while (i < lines.length && lines[i].match(/^-\s+\[[x\s]\]/)) {
        const taskMatch = lines[i].match(/^-\s+\[([x\s])\]\s*(.*)$/);
        if (taskMatch) {
          const checked = taskMatch[1] === 'x' ? ' checked="checked"' : '';
          const text = taskMatch[2] ? processInlineMarkdown(escapeHtml(taskMatch[2])) : '';
          html.push(`<li class="task-list-item" style="display: flex; align-items: center; margin: 0.25rem 0;"><input type="checkbox" disabled${checked} style="margin-right: 0.5rem; cursor: default;"> <span>${text}</span></li>`);
        }
        i++;
      }
      
      html.push('</ul>');
      continue;
    }

    // Regular bullet lists
    if (line.startsWith('- ')) {
      html.push('<ul>');
      
      while (i < lines.length && lines[i].startsWith('- ')) {
        const itemText = lines[i].substring(2).trim();
        html.push(`<li>${processInlineMarkdown(escapeHtml(itemText))}</li>`);
        i++;
      }
      
      html.push('</ul>');
      continue;
    }

    // Regular paragraphs
    if (line.trim()) {
      // Collect all consecutive non-empty lines for the paragraph
      const paragraphLines: string[] = [];
      while (i < lines.length && lines[i].trim() && !isSpecialLine(lines[i])) {
        paragraphLines.push(lines[i].trim());
        i++;
      }
      
      if (paragraphLines.length > 0) {
        const paragraphText = paragraphLines.join(' ');
        html.push(`<p>${processInlineMarkdown(escapeHtml(paragraphText))}</p>`);
      }
      continue;
    }
    
    i++;
  }

  return html.join('\n');
}

function processInlineMarkdown(text: string): string {
  // Bold text **text**
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Italic text *text*
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Inline code `code`
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Links [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  return text;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}