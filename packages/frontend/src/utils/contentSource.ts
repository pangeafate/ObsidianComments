import type { DocumentData } from '../services/documentService';

export interface InitialContentChoice {
  type: 'html' | 'markdown' | 'empty';
  content: string;
}

/**
 * Decide which content to use to initialize the editor.
 * - Prefer htmlContent when renderMode==='html' and htmlContent is non-empty
 * - Otherwise use markdown `content` if present
 * - Otherwise empty
 */
export function pickInitialContent(doc: DocumentData | null): InitialContentChoice {
  if (!doc) return { type: 'empty', content: '' };

  const html = (doc.htmlContent || '').trim();
  const md = (doc.content || '').trim();

  if (doc.renderMode === 'html' && html.length > 0) {
    return { type: 'html', content: html };
  }

  if (md.length > 0) {
    return { type: 'markdown', content: md };
  }

  return { type: 'empty', content: '' };
}



