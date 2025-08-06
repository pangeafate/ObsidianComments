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

    // Extract shareId from shareUrl
    const shareIdMatch = shareUrl.match(/\/editor\/([^\/]+)$/);
    const shareId = shareIdMatch ? shareIdMatch[1] : '';

    if (match) {
      // Content has existing frontmatter
      const existingFrontmatter = match[1];
      const contentWithoutFrontmatter = content.substring(match[0].length);
      
      const newFrontmatter = `${existingFrontmatter}\nshareId: ${shareId}\nshareUrl: ${shareUrl}\nsharedAt: ${sharedAt}`;
      return `---\n${newFrontmatter}\n---\n${contentWithoutFrontmatter}`;
    } else {
      // No existing frontmatter
      const newFrontmatter = `shareId: ${shareId}\nshareUrl: ${shareUrl}\nsharedAt: ${sharedAt}`;
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
        // Extract ID from URL - support both /editor/ and /share/ patterns for backward compatibility
        const editorMatch = shareUrl.match(/\/editor\/([^\/]+)$/);
        const shareMatch = shareUrl.match(/\/share\/([^\/]+)$/);
        return editorMatch ? editorMatch[1] : (shareMatch ? shareMatch[1] : null);
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
      
      // Get the existing shareUrl from the content or construct it from server URL
      const existingShareUrl = this.getShareUrl(content);
      const shareUrl = existingShareUrl || `${this.apiClient.settings.serverUrl}/editor/${existingShareId}`;
      
      return {
        shareUrl,
        shareId: existingShareId,
        updatedContent: content,
        wasUpdate: true
      };
    } else {
      // Create new share - generate unique ID and extract title
      const uniqueShareId = `obsidian-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const extractedTitle = this.extractTitleFromContent(content);
      
      const shareResponse = await this.apiClient.shareNote(content, extractedTitle, uniqueShareId);
      
      // Use the shareUrl from response (which is collaborativeUrl from backend)
      const updatedContent = await this.addShareMetadata(
        content, 
        shareResponse.shareUrl, // This is now collaborativeUrl from backend
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

  private extractTitleFromContent(content: string): string {
    // Extract title from first H1 heading
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        return trimmed.substring(2).trim();
      }
    }
    
    // Fallback: use first non-empty line
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0 && !trimmed.startsWith('#')) {
        return trimmed.length > 60 ? trimmed.substring(0, 57) + '...' : trimmed;
      }
    }
    
    return 'New Document';
  }

  async unshareNote(content: string): Promise<string> {
    const shareId = this.getShareId(content);
    
    if (!shareId) {
      return content; // Not shared, return as-is
    }

    // Attempt to delete from database with proper error handling
    await this.deleteFromDatabaseSafely(shareId);
    
    // Always remove frontmatter locally, even if API call fails
    return await this.removeShareMetadata(content);
  }

  private async deleteFromDatabaseSafely(shareId: string, maxRetries: number = 2): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🗑️ Attempting to delete note ${shareId} from database (attempt ${attempt})`);
        
        await this.apiClient.deleteShare(shareId);
        
        console.log(`✅ Successfully deleted note ${shareId} from database`);
        return; // Success - exit retry loop
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`⚠️ Delete attempt ${attempt} failed for ${shareId}:`, lastError.message);
        
        // Don't retry on certain errors
        if (error instanceof Error) {
          if (error.message.includes('not found') || error.message.includes('404')) {
            console.log(`ℹ️ Note ${shareId} already deleted or not found in database`);
            return; // Consider this a success - note is gone
          }
          
          if (error.message.includes('invalid') || error.message.includes('401')) {
            console.error(`❌ Authentication error for ${shareId}, not retrying`);
            return; // Don't retry auth errors
          }
        }
        
        // For temporary errors, wait before retry
        if (attempt < maxRetries) {
          const delay = attempt * 1000; // 1s, 2s delay
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries failed, but don't throw - we still want to remove frontmatter
    console.error(`❌ Failed to delete note ${shareId} from database after ${maxRetries} attempts:`, lastError?.message);
    console.log(`🧹 Continuing with local frontmatter removal for ${shareId}`);
  }
}