/**
 * Smart Title Utility
 * 
 * Provides utilities for extracting and managing smart titles from documents.
 * Note: Per the requirements, smart titles should be removed and documents
 * should use "Untitled Document" as the default title.
 */

/**
 * Extract smart title from content (deprecated - returns null for removal)
 * @param content The document content
 * @returns null (smart title removal feature)
 */
export function extractSmartTitle(content: string): string | null {
  // Smart title feature is disabled - always return null
  // This ensures new documents get "Untitled Document" as intended
  return null;
}

/**
 * Clean content by removing any smart title markup (if any)
 * @param content The document content
 * @returns Cleaned content
 */
export function removeSmartTitleMarkup(content: string): string {
  // For now, just return the content as-is
  // This can be extended if smart title markup needs to be removed
  return content;
}

/**
 * Get default title for new documents
 * @returns Default title string
 */
export function getDefaultTitle(): string {
  return "Untitled Document";
}