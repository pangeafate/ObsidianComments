// Color-coded edit highlighting system for collaborative editing

export interface TextHighlight {
  start: number;
  end: number;
  contributorName: string;
  contributorColor: string;
  timestamp: Date;
  operationId: string;
  type: 'insert' | 'modify';
}

export interface HighlightRange {
  start: number;
  end: number;
  contributorName: string;
  contributorColor: string;
  intensity: number; // 0-1, based on how recent the edit is
  operationId: string;
}

export class HighlightManager {
  private highlights: TextHighlight[] = [];
  private highlightDuration: number = 30000; // 30 seconds
  private fadeStartTime: number = 10000; // Start fading after 10 seconds

  constructor(highlightDuration?: number, fadeStartTime?: number) {
    if (highlightDuration) this.highlightDuration = highlightDuration;
    if (fadeStartTime) this.fadeStartTime = fadeStartTime;
  }

  /**
   * Add a new highlight for an inserted text range
   */
  addInsertHighlight(
    start: number,
    length: number,
    contributorName: string,
    contributorColor: string,
    operationId: string
  ): void {
    const highlight: TextHighlight = {
      start,
      end: start + length,
      contributorName,
      contributorColor,
      timestamp: new Date(),
      operationId,
      type: 'insert'
    };

    this.highlights.push(highlight);
    this.cleanupExpiredHighlights();
  }

  /**
   * Update highlights when text is deleted
   */
  handleDeleteOperation(deleteStart: number, deleteLength: number, operationId: string): void {
    const deleteEnd = deleteStart + deleteLength;
    
    this.highlights = this.highlights
      .map(highlight => {
        // Highlight is completely before the deletion - no change
        if (highlight.end <= deleteStart) {
          return highlight;
        }
        
        // Highlight is completely after the deletion - shift positions
        if (highlight.start >= deleteEnd) {
          return {
            ...highlight,
            start: highlight.start - deleteLength,
            end: highlight.end - deleteLength
          };
        }
        
        // Highlight overlaps with deletion
        const overlapStart = Math.max(highlight.start, deleteStart);
        const overlapEnd = Math.min(highlight.end, deleteEnd);
        const overlapLength = overlapEnd - overlapStart;
        
        // If highlight is completely within deletion, remove it
        if (highlight.start >= deleteStart && highlight.end <= deleteEnd) {
          return null;
        }
        
        // If deletion is completely within highlight, split the highlight
        if (highlight.start < deleteStart && highlight.end > deleteEnd) {
          // Keep the part before deletion, the part after deletion will be handled separately
          return {
            ...highlight,
            end: deleteStart
          };
        }
        
        // Highlight starts before deletion but overlaps
        if (highlight.start < deleteStart) {
          return {
            ...highlight,
            end: deleteStart
          };
        }
        
        // Highlight starts within deletion but extends beyond
        if (highlight.start < deleteEnd && highlight.end > deleteEnd) {
          return {
            ...highlight,
            start: deleteStart,
            end: highlight.end - deleteLength
          };
        }
        
        return highlight;
      })
      .filter((highlight): highlight is TextHighlight => highlight !== null);
    
    this.cleanupExpiredHighlights();
  }

  /**
   * Update highlights when text is retained (cursor movement in operations)
   */
  handleRetainOperation(retainStart: number, retainLength: number): void {
    // Retain operations don't modify highlights, just validate positions
    this.validateHighlightPositions();
  }

  /**
   * Get current highlight ranges with intensity based on age
   */
  getCurrentHighlights(): HighlightRange[] {
    const now = Date.now();
    
    return this.highlights
      .filter(highlight => {
        const age = now - highlight.timestamp.getTime();
        return age < this.highlightDuration;
      })
      .map(highlight => {
        const age = now - highlight.timestamp.getTime();
        let intensity = 1;
        
        if (age > this.fadeStartTime) {
          const fadeProgress = (age - this.fadeStartTime) / (this.highlightDuration - this.fadeStartTime);
          intensity = Math.max(0, 1 - fadeProgress);
        }
        
        return {
          start: highlight.start,
          end: highlight.end,
          contributorName: highlight.contributorName,
          contributorColor: highlight.contributorColor,
          intensity,
          operationId: highlight.operationId
        };
      })
      .sort((a, b) => a.start - b.start); // Sort by position
  }

  /**
   * Get highlights for a specific contributor
   */
  getContributorHighlights(contributorName: string): HighlightRange[] {
    return this.getCurrentHighlights()
      .filter(highlight => highlight.contributorName === contributorName);
  }

  /**
   * Get highlights overlapping with a specific range
   */
  getHighlightsInRange(start: number, end: number): HighlightRange[] {
    return this.getCurrentHighlights()
      .filter(highlight => 
        highlight.start < end && highlight.end > start
      );
  }

  /**
   * Remove expired highlights
   */
  private cleanupExpiredHighlights(): void {
    const now = Date.now();
    this.highlights = this.highlights.filter(highlight => {
      const age = now - highlight.timestamp.getTime();
      return age < this.highlightDuration;
    });
  }

  /**
   * Validate and fix highlight positions
   */
  private validateHighlightPositions(): void {
    this.highlights = this.highlights.filter(highlight => 
      highlight.start >= 0 && 
      highlight.end > highlight.start
    );
  }

  /**
   * Clear all highlights (for testing or reset)
   */
  clearAllHighlights(): void {
    this.highlights = [];
  }

  /**
   * Get highlight statistics
   */
  getStats(): {
    totalHighlights: number;
    contributorCount: number;
    oldestHighlight?: Date;
    newestHighlight?: Date;
  } {
    const currentHighlights = this.getCurrentHighlights();
    const contributors = new Set(currentHighlights.map(h => h.contributorName));
    
    let oldestHighlight: Date | undefined;
    let newestHighlight: Date | undefined;
    
    if (this.highlights.length > 0) {
      const timestamps = this.highlights.map(h => h.timestamp.getTime());
      oldestHighlight = new Date(Math.min(...timestamps));
      newestHighlight = new Date(Math.max(...timestamps));
    }
    
    return {
      totalHighlights: currentHighlights.length,
      contributorCount: contributors.size,
      oldestHighlight,
      newestHighlight
    };
  }

  /**
   * Merge overlapping highlights from the same contributor
   */
  mergeOverlappingHighlights(): void {
    // Group by contributor
    const byContributor = new Map<string, TextHighlight[]>();
    
    for (const highlight of this.highlights) {
      if (!byContributor.has(highlight.contributorName)) {
        byContributor.set(highlight.contributorName, []);
      }
      byContributor.get(highlight.contributorName)!.push(highlight);
    }
    
    // Merge overlapping highlights for each contributor
    const mergedHighlights: TextHighlight[] = [];
    
    for (const [contributorName, highlights] of byContributor) {
      // Sort by start position
      highlights.sort((a, b) => a.start - b.start);
      
      let current = highlights[0];
      if (!current) continue;
      
      for (let i = 1; i < highlights.length; i++) {
        const next = highlights[i];
        
        // If highlights overlap or are adjacent, merge them
        if (current.end >= next.start) {
          current = {
            ...current,
            end: Math.max(current.end, next.end),
            timestamp: new Date(Math.max(current.timestamp.getTime(), next.timestamp.getTime())),
            operationId: current.operationId + '+' + next.operationId
          };
        } else {
          mergedHighlights.push(current);
          current = next;
        }
      }
      
      mergedHighlights.push(current);
    }
    
    this.highlights = mergedHighlights;
  }
}