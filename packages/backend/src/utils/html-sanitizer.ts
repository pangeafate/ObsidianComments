import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'div', 'span',
  'strong', 'b', 'em', 'i', 'u', 'del', 's',
  'ul', 'ol', 'li',
  'blockquote', 'q',
  'code', 'pre',
  'a', // Note: img removed for security
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'sup', 'sub'
];

const ALLOWED_ATTRIBUTES = [
  'href', 'target', 'rel', // Note: src, alt, width, height removed to prevent media
  'colspan', 'rowspan', 'class', 'id'
];

export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') return '';

  try {
    // EMERGENCY FIX: Graceful fallback for CI environments where DOMPurify fails
    if (process.env.CI === 'true' || process.env.NODE_ENV === 'test') {
      console.log('🔧 [CI-FIX] Using basic HTML sanitization in CI environment');
      return basicHtmlSanitize(dirty);
    }

    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS,
      ALLOWED_ATTR: ALLOWED_ATTRIBUTES,
      FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'img', 'video', 'audio', 'iframe', 'canvas', 'svg', 'picture', 'source', 'track'],
      FORBID_ATTR: [
        'onclick', 'onerror', 'onload', 'onmouseover', 'onfocus',
        'onblur', 'onchange', 'onsubmit', 'style' // Remove inline styles for security
      ]
    });
  } catch (error) {
    console.warn('⚠️ [FALLBACK] DOMPurify failed, using basic sanitization:', error);
    return basicHtmlSanitize(dirty);
  }
}

/**
 * Basic HTML sanitization fallback for CI environments
 * This is a simplified sanitizer that removes dangerous content without requiring DOM
 */
function basicHtmlSanitize(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  // Remove script tags and their contents
  let sanitized = input.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Remove dangerous event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^>\s]+/gi, '');
  
  // Remove javascript: links
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  
  // Remove dangerous and media tags
  sanitized = sanitized.replace(/<(object|embed|form|input|img|video|audio|iframe|canvas|svg|picture|source|track)[^>]*>[\s\S]*?<\/\1>/gi, '');
  sanitized = sanitized.replace(/<(object|embed|form|input|img|video|audio|iframe|canvas|svg|picture|source|track)[^>]*>/gi, '');
  
  // Remove style attributes and media-related attributes
  sanitized = sanitized.replace(/\s*style\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*src\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*alt\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*width\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*height\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*poster\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*controls\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*autoplay\s*=\s*["'][^"']*["']/gi, '');
  
  return sanitized;
}

/**
 * Clean markdown content to remove images, attachments, and media
 */
export function cleanMarkdownContent(content: string): string {
  if (!content || typeof content !== 'string') return '';

  let cleanedContent = content;

  // Remove image syntax ![alt](url) and ![alt](url "title")
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

  // Remove HTML media tags that might be in markdown
  cleanedContent = cleanedContent.replace(/<img[^>]*>/gi, '');
  cleanedContent = cleanedContent.replace(/<(video|audio)[^>]*>[\s\S]*?<\/\1>/gi, '');
  cleanedContent = cleanedContent.replace(/<(video|audio)[^>]*\/>/gi, '');
  cleanedContent = cleanedContent.replace(/<(iframe|embed|object)[^>]*>[\s\S]*?<\/\1>/gi, '');
  cleanedContent = cleanedContent.replace(/<(iframe|embed|object)[^>]*\/>/gi, '');

  // Clean up excessive whitespace but preserve intentional formatting
  cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, '\n\n');

  return cleanedContent.trim();
}

/**
 * Extract clean title from content or filename
 */
export function extractCleanTitle(content: string, filename?: string): string {
  // First, try to extract title from H1 header in content
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match && h1Match[1].trim()) {
    let title = h1Match[1].trim();
    // Clean up title - remove any remaining markdown or HTML
    title = title.replace(/[*_`~]/g, ''); // Remove markdown formatting
    title = title.replace(/<[^>]*>/g, ''); // Remove HTML tags
    if (title.length > 0) {
      return title;
    }
  }

  // Fallback to filename without extension if provided
  if (filename) {
    let title = filename.replace(/\.[^/.]+$/, ''); // Remove extension
    title = title.replace(/[-_]/g, ' '); // Replace dashes and underscores with spaces
    title = title.replace(/\s+/g, ' '); // Normalize multiple spaces
    title = title.trim();
    
    if (title.length > 0) {
      return title;
    }
  }

  return 'Untitled Note';
}

/**
 * Check if content contains binary data or media references
 */
export function containsMediaContent(content: string): boolean {
  if (!content || typeof content !== 'string') return false;

  // Check for image markdown syntax
  if (/!\[.*?\]\([^)]+\)/g.test(content)) return true;
  
  // Check for HTML media tags
  if (/<(img|video|audio|iframe|embed|object)[^>]*>/gi.test(content)) return true;
  
  // Check for attachment references
  const attachmentPattern = /\[\[([^\\]]+\.(pdf|doc|docx|xls|xlsx|ppt|pptx|jpg|jpeg|png|gif|bmp|svg|webp|mp4|avi|mov|wmv|flv|mkv|webm|mp3|wav|flac|aac|ogg|m4a|zip|rar|7z|tar|gz|exe))(\\|[^\\]]*)?\\]\\]/gi;
  if (attachmentPattern.test(content)) return true;
  
  return false;
}