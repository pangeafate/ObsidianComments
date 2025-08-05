// Content deduplication utility - addresses root cause directly
// Instead of shadow users, detect and prevent actual content duplication

export interface ContentAnalysis {
  hasDuplication: boolean;
  duplicatedSections: string[];
  originalLength: number;
  deduplicatedLength: number;
  confidence: number; // 0-1 score
}

export const analyzeContentDuplication = (content: string): ContentAnalysis => {
  if (!content || content.length < 50) {
    return {
      hasDuplication: false,
      duplicatedSections: [],
      originalLength: content?.length || 0,
      deduplicatedLength: content?.length || 0,
      confidence: 1.0
    };
  }

  const lines = content.split('\n').filter(line => line.trim().length > 0);
  const duplicatedSections: string[] = [];
  let deduplicatedContent = content;
  
  // Look for exact line duplications
  const lineCount = new Map<string, number>();
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.length > 10) { // Only check substantial lines
      lineCount.set(trimmed, (lineCount.get(trimmed) || 0) + 1);
    }
  });
  
  // Find duplicated lines
  let duplicatedLines = 0;
  lineCount.forEach((count, line) => {
    if (count > 1) {
      duplicatedSections.push(line);
      duplicatedLines += count - 1; // Extra occurrences
      
      // Remove extra occurrences
      const regex = new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = deduplicatedContent.match(regex);
      if (matches && matches.length > 1) {
        // Keep first occurrence, remove the rest
        for (let i = 1; i < matches.length; i++) {
          deduplicatedContent = deduplicatedContent.replace(regex, '');
        }
      }
    }
  });
  
  // Check for paragraph-level duplication
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 20);
  const paragraphCount = new Map<string, number>();
  paragraphs.forEach(para => {
    const normalized = para.trim().replace(/\s+/g, ' ');
    if (normalized.length > 20) {
      paragraphCount.set(normalized, (paragraphCount.get(normalized) || 0) + 1);
    }
  });
  
  paragraphCount.forEach((count, para) => {
    if (count > 1) {
      duplicatedSections.push(para.substring(0, 50) + '...');
      // Remove duplicated paragraphs
      for (let i = 1; i < count; i++) {
        const index = deduplicatedContent.lastIndexOf(para);
        if (index !== -1) {
          deduplicatedContent = deduplicatedContent.substring(0, index) + 
                               deduplicatedContent.substring(index + para.length);
        }
      }
    }
  });
  
  const reductionRatio = (content.length - deduplicatedContent.length) / content.length;
  const confidence = Math.min(reductionRatio * 2, 1.0); // Higher reduction = higher confidence
  
  return {
    hasDuplication: duplicatedSections.length > 0 || reductionRatio > 0.1,
    duplicatedSections,
    originalLength: content.length,
    deduplicatedLength: deduplicatedContent.length,
    confidence
  };
};

export const deduplicateContent = (content: string): string => {
  const analysis = analyzeContentDuplication(content);
  
  if (!analysis.hasDuplication) {
    return content;
  }
  
  console.log('🔍 Content duplication detected:', {
    duplicatedSections: analysis.duplicatedSections.length,
    reduction: analysis.originalLength - analysis.deduplicatedLength,
    confidence: analysis.confidence
  });
  
  // Apply the deduplication logic from analysis
  let deduplicatedContent = content;
  
  // Remove exact line duplicates
  const lines = content.split('\n');
  const seenLines = new Set<string>();
  const uniqueLines = lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed.length < 10) return true; // Keep short lines
    
    if (seenLines.has(trimmed)) {
      return false; // Remove duplicate
    }
    seenLines.add(trimmed);
    return true;
  });
  
  return uniqueLines.join('\n');
};

// Initialize content with deduplication check
export const initializeContentSafely = (
  yjsContent: string, 
  apiContent: string, 
  setContentCallback: (content: string) => void
): void => {
  console.log('🛡️ Safe content initialization started');
  
  if (!yjsContent || yjsContent.trim().length === 0) {
    // Yjs is empty, use API content
    const safeApiContent = deduplicateContent(apiContent);
    console.log('📝 Using deduplicated API content');
    setContentCallback(safeApiContent);
    return;
  }
  
  // Check for duplication in existing Yjs content
  const yjsAnalysis = analyzeContentDuplication(yjsContent);
  
  if (yjsAnalysis.hasDuplication && yjsAnalysis.confidence > 0.7) {
    console.log('⚠️ Yjs content has duplication, cleaning...');
    const cleanYjsContent = deduplicateContent(yjsContent);
    setContentCallback(cleanYjsContent);
  } else {
    console.log('✅ Yjs content is clean, using as-is');
    // Yjs content is good, use it
  }
};