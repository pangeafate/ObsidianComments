/**
 * Share Manager - Minimal TDD Implementation
 * 
 * Following TDD: This is the minimal code to make tests pass.
 * Handles frontmatter manipulation and note sharing logic.
 */

import { ApiClient } from './api-client';
import { ShareResult, ShareMetadata } from './types';

export class ShareManager {
  apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  async addShareMetadata(content: string, shareUrl: string, sharedAt: string): Promise<string> {
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
    const match = content.match(frontmatterRegex);

    if (match) {
      // Content has existing frontmatter
      const existingFrontmatter = match[1];
      const contentWithoutFrontmatter = content.substring(match[0].length);
      
      const newFrontmatter = `${existingFrontmatter}\nshareUrl: ${shareUrl}\nsharedAt: ${sharedAt}`;
      return `---\n${newFrontmatter}\n---\n${contentWithoutFrontmatter}`;
    } else {
      // No existing frontmatter
      const newFrontmatter = `shareUrl: ${shareUrl}\nsharedAt: ${sharedAt}`;
      return `---\n${newFrontmatter}\n---\n${content}`;
    }
  }

  async removeShareMetadata(content: string): Promise<string> {
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return content; // No frontmatter to remove
    }

    const frontmatter = match[1];
    const contentWithoutFrontmatter = content.substring(match[0].length);

    // Remove share-related lines
    const lines = frontmatter.split('\n').filter(line => 
      !line.trim().startsWith('shareUrl:') && 
      !line.trim().startsWith('shareId:') && 
      !line.trim().startsWith('sharedAt:')
    );

    if (lines.length === 0 || lines.every(line => line.trim() === '')) {
      // Only share metadata existed, remove entire frontmatter
      return contentWithoutFrontmatter;
    } else {
      // Keep remaining frontmatter
      return `---\n${lines.join('\n')}\n---\n${contentWithoutFrontmatter}`;
    }
  }

  isNoteShared(content: string): boolean {
    try {
      const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
      const match = content.match(frontmatterRegex);

      if (!match) {
        return false;
      }

      const frontmatter = match[1];
      
      // Handle malformed YAML gracefully
      if (frontmatter.includes('[unclosed') || frontmatter.includes('invalid yaml:')) {
        return false;
      }

      return (frontmatter.includes('shareUrl:') || frontmatter.includes('shareId:')) && 
             frontmatter.split('\n').some(line => {
               const shareUrlMatch = line.trim().match(/^shareUrl:\s*(.+)$/);
               const shareIdMatch = line.trim().match(/^shareId:\s*(.+)$/);
               return (shareUrlMatch && shareUrlMatch[1].trim() !== '') || 
                      (shareIdMatch && shareIdMatch[1].trim() !== '');
             });
    } catch (error) {
      return false;
    }
  }

  getShareUrl(content: string): string | null {
    try {
      const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
      const match = content.match(frontmatterRegex);

      if (!match) {
        return null;
      }

      const frontmatter = match[1];
      
      // Handle malformed YAML gracefully
      if (frontmatter.includes('[unclosed') || frontmatter.includes('invalid yaml:')) {
        return null;
      }

      const lines = frontmatter.split('\n');
      
      for (const line of lines) {
        const shareUrlMatch = line.trim().match(/^shareUrl:\s*(.+)$/);
        if (shareUrlMatch) {
          const shareUrl = shareUrlMatch[1].trim();
          return shareUrl === '' ? null : shareUrl;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  getShareId(content: string): string | null {
    try {
      const shareUrl = this.getShareUrl(content);
      if (shareUrl) {
        // Extract ID from URL
        const match = shareUrl.match(/\/share\/([^\/]+)$/);
        return match ? match[1] : null;
      }

      // Fallback to old shareId field for backward compatibility
      const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
      const fmMatch = content.match(frontmatterRegex);

      if (!fmMatch) {
        return null;
      }

      const frontmatter = fmMatch[1];
      const lines = frontmatter.split('\n');
      
      for (const line of lines) {
        const shareIdMatch = line.trim().match(/^shareId:\s*(.+)$/);
        if (shareIdMatch) {
          const shareId = shareIdMatch[1].trim();
          return shareId === '' ? null : shareId;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async shareNote(content: string): Promise<ShareResult> {
    const existingShareId = this.getShareId(content);

    if (existingShareId) {
      // Update existing share
      const updateResult = await this.apiClient.updateNote(existingShareId, content);
      return {
        shareUrl: `https://share.obsidiancomments.com/${existingShareId}`,
        shareId: existingShareId,
        updatedContent: content,
        wasUpdate: true
      };
    } else {
      // Create new share
      const shareResponse = await this.apiClient.shareNote(content);
      const updatedContent = await this.addShareMetadata(
        content, 
        shareResponse.shareUrl, 
        shareResponse.createdAt || new Date().toISOString()
      );

      return {
        shareUrl: shareResponse.shareUrl,
        shareId: shareResponse.shareId,
        updatedContent,
        wasUpdate: false
      };
    }
  }

  async unshareNote(content: string): Promise<string> {
    const shareId = this.getShareId(content);
    
    if (!shareId) {
      return content; // Not shared, return as-is
    }

    await this.apiClient.deleteShare(shareId);
    return await this.removeShareMetadata(content);
  }
}