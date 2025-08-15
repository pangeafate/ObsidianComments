export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') return '';
  
  let sanitized = dirty;
  
  // Remove script tags and their contents
  sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Remove dangerous event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^>\s]+/gi, '');
  
  // Remove javascript: links
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  
  // Remove style attributes
  sanitized = sanitized.replace(/\s*style\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove dangerous tags
  sanitized = sanitized.replace(/<(img|video|audio|iframe|embed|object)[^>]*>/gi, '');
  
  return sanitized;
}

export function cleanMarkdownContent(content: string): string {
  if (!content || typeof content !== 'string') return '';
  
  let cleanedContent = content;
  
  // Handle frontmatter and H1 removal
  const frontmatterMatch = cleanedContent.match(/^---[\s\S]*?---\s*/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[0];
    const contentAfterFrontmatter = cleanedContent.substring(frontmatter.length);
    // Remove first H1 only if it's the very first line after frontmatter
    const contentWithoutTitle = contentAfterFrontmatter.replace(/^\s*#\s+[^\r\n]*(\r\n?|\n|$)/, '');
    cleanedContent = frontmatter + contentWithoutTitle.trimStart();
  } else {
    // No frontmatter, just remove first H1 if it's the very first line
    cleanedContent = cleanedContent.replace(/^\s*#\s+[^\r\n]*(\r\n?|\n|$)/, '');
  }
  
  // Remove image syntax
  cleanedContent = cleanedContent.replace(/!\[.*?\]\([^)]+\)/g, '');
  
  // Remove attachment links for binary files
  const attachmentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 
                               'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp',
                               'mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm',
                               'mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a',
                               'zip', 'rar', '7z', 'tar', 'gz', 'exe'];
  
  const attachmentPattern = new RegExp(`\\[\\[([^\\]]+\\.(${attachmentExtensions.join('|')}))(\\|[^\\]]*)?\\]\\]`, 'gi');
  cleanedContent = cleanedContent.replace(attachmentPattern, '');
  
  // Remove embedded/transcluded content ![[filename]]
  cleanedContent = cleanedContent.replace(/!\[\[([^\]]+)\]\]/g, '');
  
  // Remove HTML media tags
  cleanedContent = cleanedContent.replace(/<img[^>]*>/gi, '');
  cleanedContent = cleanedContent.replace(/<(video|audio)[^>]*>[\s\S]*?<\/\1>/gi, '');
  
  // Clean up excessive whitespace
  cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return cleanedContent.trim();
}

export function containsMediaContent(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  return /!\[.*?\]\([^)]+\)/g.test(content);
}

export function sanitizeTitle(title: string): string {
  if (!title || typeof title !== 'string') return '';
  return title.replace(/<[^>]*>/g, '').trim();
}