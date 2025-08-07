import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'div', 'span',
  'strong', 'b', 'em', 'i', 'u', 'del', 's',
  'ul', 'ol', 'li',
  'blockquote', 'q',
  'code', 'pre',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'sup', 'sub'
];

const ALLOWED_ATTRIBUTES = [
  'href', 'target', 'rel', 'src', 'alt', 'width', 'height', 
  'colspan', 'rowspan', 'class', 'id'
];

export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') return '';

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTRIBUTES,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: [
      'onclick', 'onerror', 'onload', 'onmouseover', 'onfocus',
      'onblur', 'onchange', 'onsubmit', 'style' // Remove inline styles for security
    ]
  });
}