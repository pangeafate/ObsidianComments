// External sanitization utility to avoid closure/hoisting issues
// Based on FIX-initialization-error-resolution-plan.md

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