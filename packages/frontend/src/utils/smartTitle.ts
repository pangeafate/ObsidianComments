// Smart title extraction from editor content
// Extracts the first meaningful line as a clean title

export const extractSmartTitle = (htmlContent: string): string => {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return `New Document ${new Date().toLocaleDateString()}`;
  }

  try {
    // Use the simple version which properly handles line breaks
    return extractSmartTitleSimple(htmlContent);
    
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