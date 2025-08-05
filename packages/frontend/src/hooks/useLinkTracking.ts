import { useEffect, useRef } from 'react';

interface Link {
  id: string;
  title: string;
  url: string;
  accessedAt: string;
}

const LINKS_STORAGE_KEY = 'obsidian-comments-links';

export function useLinkTracking(documentId: string, dynamicTitle?: string) {
  const lastTrackedTitleRef = useRef<string>('');

  useEffect(() => {
    // Only track if we have a valid document ID
    if (!documentId) return;

    const trackCurrentDocument = (currentTitle?: string) => {
      try {
        // Get existing links
        const existingLinksJson = localStorage.getItem(LINKS_STORAGE_KEY);
        let existingLinks: Link[] = [];
        
        if (existingLinksJson) {
          try {
            existingLinks = JSON.parse(existingLinksJson);
            // Ensure it's an array
            if (!Array.isArray(existingLinks)) {
              existingLinks = [];
            }
          } catch (error) {
            console.warn('Failed to parse existing links, starting fresh:', error);
            existingLinks = [];
          }
        }

        // Use dynamic title if provided, otherwise generate from documentId
        const documentTitle = currentTitle || generateDocumentTitle(documentId);
        const documentUrl = `${window.location.origin}/editor/${documentId}`;

        // Check if document already exists in links
        const existingLinkIndex = existingLinks.findIndex(link => link.id === documentId);
        
        if (existingLinkIndex >= 0) {
          // Update existing link's access time and title
          existingLinks[existingLinkIndex] = {
            ...existingLinks[existingLinkIndex],
            title: documentTitle, // Always update title with latest content
            accessedAt: new Date().toISOString(),
          };
        } else {
          // Add new link
          const newLink: Link = {
            id: documentId,
            title: documentTitle,
            url: documentUrl,
            accessedAt: new Date().toISOString(),
          };
          existingLinks.push(newLink);
        }

        // Keep only the most recent 50 links to avoid localStorage bloat
        existingLinks.sort((a, b) => new Date(b.accessedAt).getTime() - new Date(a.accessedAt).getTime());
        const trimmedLinks = existingLinks.slice(0, 50);

        // Save back to localStorage
        localStorage.setItem(LINKS_STORAGE_KEY, JSON.stringify(trimmedLinks));
        
        console.log(`📝 Link tracked: "${documentTitle}" for document ${documentId}`);
      } catch (error) {
        console.error('Failed to track document link:', error);
      }
    };

    // Track the document when the hook is initialized
    trackCurrentDocument(dynamicTitle);
  }, [documentId]);

  // Update title when it changes
  useEffect(() => {
    if (dynamicTitle && dynamicTitle !== lastTrackedTitleRef.current) {
      lastTrackedTitleRef.current = dynamicTitle;
      
      // Update the link with new title
      try {
        const existingLinksJson = localStorage.getItem(LINKS_STORAGE_KEY);
        if (existingLinksJson) {
          const existingLinks: Link[] = JSON.parse(existingLinksJson);
          const linkIndex = existingLinks.findIndex(link => link.id === documentId);
          
          if (linkIndex >= 0) {
            existingLinks[linkIndex].title = dynamicTitle;
            localStorage.setItem(LINKS_STORAGE_KEY, JSON.stringify(existingLinks));
            console.log(`🔄 Link title updated: "${dynamicTitle}" for document ${documentId}`);
          }
        }
      } catch (error) {
        console.error('Failed to update link title:', error);
      }
    }
  }, [dynamicTitle, documentId]);
}

function generateDocumentTitle(documentId: string): string {
  // Extract readable parts from document ID
  if (documentId.includes('-')) {
    // For timestamp-based IDs like "1642771200000-123456789"
    const parts = documentId.split('-');
    if (parts.length >= 2 && !isNaN(Number(parts[0]))) {
      const timestamp = new Date(Number(parts[0]));
      if (!isNaN(timestamp.getTime())) {
        return `Document from ${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}`;
      }
    }
  }

  // For UUID-based IDs, use a more generic title
  if (documentId.length >= 8) {
    const shortId = documentId.substring(0, 8);
    return `Document ${shortId}`;
  }

  // Fallback for any other format
  return `Document ${documentId}`;
}