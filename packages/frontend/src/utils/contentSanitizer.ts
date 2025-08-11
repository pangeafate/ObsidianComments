// External sanitization utility to avoid closure/hoisting issues
// Based on FIX-initialization-error-resolution-plan.md

import DOMPurify from 'dompurify';

export const stripTrackChangesMarkup = (htmlContent: string): string => {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return htmlContent || '';
  }

  try {
    console.log('🧹 Sanitizing content:', htmlContent.length, 'chars');
    
    let cleanContent = htmlContent;
    let passes = 0;
    
    while (passes < 5) {
      const before = cleanContent.length;
      
      // Use arrow function replacement to avoid $ issues
      cleanContent = cleanContent.replace(
        /<span[^>]*(data-track-change|data-user-id|data-timestamp)[^>]*>([\s\S]*?)<\/span>/gi,
        (match, p1, p2) => p2
      );
      
      cleanContent = cleanContent
        .replace(/\s*data-track-change="[^"]*"/gi, '')
        .replace(/\s*data-user-id="[^"]*"/gi, '')
        .replace(/\s*data-user-name="[^"]*"/gi, '')
        .replace(/\s*data-timestamp="[^"]*"/gi, '');
      
      if (cleanContent.length === before) break;
      passes++;
    }
    
    console.log('✅ Sanitized:', htmlContent.length, '→', cleanContent.length, 'chars');
    return cleanContent;
    
  } catch (error) {
    console.error('❌ Sanitization error:', error);
    return htmlContent;
  }
};

// DOM-based sanitization as alternative (from the plan)
export const stripTrackChangesDOM = (htmlContent: string): string => {
  if (typeof window === 'undefined') return htmlContent;
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Remove all elements with track changes
    const trackChangeElements = doc.querySelectorAll('[data-track-change]');
    trackChangeElements.forEach(el => {
      // Move children to parent
      while (el.firstChild) {
        el.parentNode?.insertBefore(el.firstChild, el);
      }
      el.remove();
    });
    
    // Remove attributes
    const elementsWithAttrs = doc.querySelectorAll('[data-user-id], [data-user-name], [data-timestamp]');
    elementsWithAttrs.forEach(el => {
      el.removeAttribute('data-user-id');
      el.removeAttribute('data-user-name');
      el.removeAttribute('data-timestamp');
    });
    
    return doc.body.innerHTML;
  } catch (error) {
    console.error('DOM sanitization failed:', error);
    return htmlContent;
  }
};

/**
 * SECURITY FIX: Sanitize title text to prevent XSS attacks
 * This function ensures that user-provided titles are safe to display
 */
export const sanitizeTitle = (title: string): string => {
  if (!title || typeof title !== 'string') {
    return '';
  }

  try {
    // Check if DOMPurify is available (it might not be in test environments)
    if (DOMPurify && typeof DOMPurify.sanitize === 'function') {
      // Use DOMPurify to strip all HTML tags and dangerous content from titles
      const sanitized = DOMPurify.sanitize(title, {
        ALLOWED_TAGS: [], // No HTML tags allowed in titles
        ALLOWED_ATTR: [], // No attributes allowed
        KEEP_CONTENT: true // Keep the text content after removing tags
      });

      return sanitized.trim();
    } else {
      // Fallback for test environments or when DOMPurify is not available
      return basicTitleSanitize(title);
    }
  } catch (error) {
    console.warn('⚠️ [FALLBACK] DOMPurify failed, using basic title sanitization:', error);
    return basicTitleSanitize(title);
  }
};

/**
 * Basic title sanitization fallback for test environments
 */
function basicTitleSanitize(title: string): string {
  if (!title || typeof title !== 'string') {
    return '';
  }
  
  // URL decode first to catch encoded attacks
  let sanitized = title;
  try {
    sanitized = decodeURIComponent(sanitized);
  } catch {
    // If decoding fails, continue with original
  }
  
  // Remove all HTML tags and dangerous characters
  sanitized = sanitized
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove any remaining angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: URIs
    .replace(/data:\s*text\/html/gi, '') // Remove data URLs
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/on\w+\s*=\s*[^>\s]+/gi, '') // Remove unquoted event handlers
    .replace(/@import\s*["'][^"']*["']/gi, '') // Remove CSS @import
    .replace(/@import\s*[^;]+/gi, '') // Remove unquoted CSS @import
    .replace(/&lt;script&gt;/gi, '') // Remove HTML encoded script tags
    .replace(/&gt;/g, '') // Remove remaining HTML entities
    .replace(/&lt;/g, '') // Remove remaining HTML entities
    .replace(/alert\s*\(/gi, 'BLOCKED(') // Replace alert calls to make them harmless
    .replace(/eval\s*\(/gi, 'BLOCKED('); // Replace eval calls to make them harmless
  
  return sanitized.trim();
}

/**
 * SECURITY FIX: Safely render title as text content only
 * This function ensures titles are displayed as plain text without HTML interpretation
 */
export const renderSafeTitle = (title: string, placeholder: string = 'Untitled Document'): string => {
  const sanitized = sanitizeTitle(title);
  return sanitized || placeholder;
};