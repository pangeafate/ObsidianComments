// Smart title extraction from editor content
// Extracts the first meaningful line as a clean title

export const extractSmartTitle = (htmlContent: string): string => {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return `New Document ${new Date().toLocaleDateString()}`;
  }

  try {
    // Parse HTML content to extract text
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Get all text content without HTML tags
    const textContent = doc.body.textContent || doc.body.innerText || '';
    
    // Split into lines and find first non-empty line
    const lines = textContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (lines.length === 0) {
      return `New Document ${new Date().toLocaleDateString()}`;
    }
    
    // Use first meaningful line as title
    let title = lines[0];
    
    // Clean up the title
    title = title
      .replace(/^#+\s*/, '') // Remove markdown headers (# ## ###)
      .replace(/^\*+\s*/, '') // Remove bullet points (* **)  
      .replace(/^\d+\.\s*/, '') // Remove numbered lists (1. 2.)
      .replace(/^[-•]\s*/, '') // Remove dashes and bullets
      .trim();
    
    // Limit title length for display
    if (title.length > 60) {
      title = title.substring(0, 57) + '...';
    }
    
    // Fallback if title is empty or too short
    if (title.length < 3) {
      return `New Document ${new Date().toLocaleDateString()}`;
    }
    
    console.log('📝 Smart title extracted:', title);
    return title;
    
  } catch (error) {
    console.error('❌ Smart title extraction failed:', error);
    return `New Document ${new Date().toLocaleDateString()}`;
  }
};

// Alternative method using regex for simpler parsing
export const extractSmartTitleSimple = (htmlContent: string): string => {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return `New Document ${new Date().toLocaleDateString()}`;
  }

  try {
    // First, convert block elements to line breaks
    let processedHtml = htmlContent
      .replace(/<\/p>/gi, '</p>\n') // Add newlines after paragraphs
      .replace(/<\/div>/gi, '</div>\n') // Add newlines after divs
      .replace(/<\/h[1-6]>/gi, '</h>\n') // Add newlines after headers
      .replace(/<br\s*\/?>/gi, '\n') // Convert br tags to newlines
      .replace(/<\/li>/gi, '</li>\n'); // Add newlines after list items
    
    // Remove HTML tags and get plain text
    const plainText = processedHtml
      .replace(/<[^>]*>/g, '') // Strip HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Replace HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
    
    // Get first non-empty line
    const lines = plainText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (lines.length === 0) {
      return `New Document ${new Date().toLocaleDateString()}`;
    }
    
    let firstLine = lines[0]
      .replace(/^#+\s*/, '') // Remove markdown headers
      .replace(/^\*+\s*/, '') // Remove bullet points
      .replace(/^\d+\.\s*/, '') // Remove numbered lists
      .replace(/^[-•]\s*/, '') // Remove dashes
      .trim();
    
    if (firstLine.length < 3) {
      return `New Document ${new Date().toLocaleDateString()}`;
    }
    
    if (firstLine.length > 60) {
      firstLine = firstLine.substring(0, 57) + '...';
    }
    
    return firstLine;
    
  } catch (error) {
    console.error('❌ Simple title extraction failed:', error);
    return `New Document ${new Date().toLocaleDateString()}`;
  }
};