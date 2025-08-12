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

  private extractShareIdFromUrl(shareUrl: string): string {
    // Extract ID from URL - support both /editor/ and /share/ patterns
    const editorMatch = shareUrl.match(/\/editor\/([^\/]+)$/);
    const shareMatch = shareUrl.match(/\/share\/([^\/]+)$/);
    return editorMatch ? editorMatch[1] : (shareMatch ? shareMatch[1] : shareUrl);
  }

  async addShareMetadata(content: string, shareUrl: string, sharedAt: string): Promise<string> {
    // Extract shareId from URL for frontmatter
    const shareId = this.extractShareIdFromUrl(shareUrl);
    
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
    const match = content.match(frontmatterRegex);

    if (match) {
      // Content has existing frontmatter
      const existingFrontmatter = match[1];
      const contentWithoutFrontmatter = content.substring(match[0].length);
      
      // Remove any existing share metadata (both camelCase and snake_case for migration)
      const cleanedFrontmatter = existingFrontmatter
        .split('\n')
        .filter(line => 
          !line.trim().startsWith('shareUrl:') && 
          !line.trim().startsWith('shareId:') && 
          !line.trim().startsWith('sharedAt:') &&
          !line.trim().startsWith('share_url:') && 
          !line.trim().startsWith('share_id:') && 
          !line.trim().startsWith('shared_at:')
        )
        .join('\n');

      const newFrontmatter = `${cleanedFrontmatter}\nshareId: ${shareId}\nsharedAt: ${sharedAt}`;
      return `---\n${newFrontmatter}\n---\n${contentWithoutFrontmatter}`;
    } else {
      // No existing frontmatter - create frontmatter with shareId
      const newFrontmatter = `shareId: ${shareId}\nsharedAt: ${sharedAt}`;
      return `---\n${newFrontmatter}\n---\n${content}`;
    }
  }

  async updateShareMetadata(content: string, shareUrl: string, sharedAt: string): Promise<string> {
    // Extract shareId from URL for frontmatter
    const shareId = this.extractShareIdFromUrl(shareUrl);
    
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
    const match = content.match(frontmatterRegex);

    if (match) {
      // Update existing frontmatter
      const existingFrontmatter = match[1];
      const contentWithoutFrontmatter = content.substring(match[0].length);
      
      // Remove existing share metadata (both camelCase and snake_case for migration)
      const cleanedLines = existingFrontmatter
        .split('\n')
        .filter(line => 
          !line.trim().startsWith('shareUrl:') && 
          !line.trim().startsWith('shareId:') && 
          !line.trim().startsWith('sharedAt:') &&
          !line.trim().startsWith('share_url:') && 
          !line.trim().startsWith('share_id:') && 
          !line.trim().startsWith('shared_at:')
        );

      // Add updated share metadata with shareId
      cleanedLines.push(`shareId: ${shareId}`);
      cleanedLines.push(`sharedAt: ${sharedAt}`);

      return `---\n${cleanedLines.join('\n')}\n---\n${contentWithoutFrontmatter}`;
    } else {
      // No frontmatter exists, add it
      return await this.addShareMetadata(content, shareUrl, sharedAt);
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
      !line.trim().startsWith('sharedAt:') &&
      !line.trim().startsWith('share_url:') && 
      !line.trim().startsWith('share_id:') && 
      !line.trim().startsWith('shared_at:')
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

      // Check for both camelCase and snake_case keys (Obsidian UI converts camelCase to snake_case)
      return (frontmatter.includes('shareUrl:') || frontmatter.includes('shareId:') ||
              frontmatter.includes('share_url:') || frontmatter.includes('share_id:')) && 
             frontmatter.split('\n').some(line => {
               const shareUrlMatch = line.trim().match(/^shareUrl:\s*(.+)$/);
               const shareIdMatch = line.trim().match(/^shareId:\s*(.+)$/);
               const shareUrlSnakeMatch = line.trim().match(/^share_url:\s*(.+)$/);
               const shareIdSnakeMatch = line.trim().match(/^share_id:\s*(.+)$/);
               return (shareUrlMatch && shareUrlMatch[1].trim() !== '') || 
                      (shareIdMatch && shareIdMatch[1].trim() !== '') ||
                      (shareUrlSnakeMatch && shareUrlSnakeMatch[1].trim() !== '') ||
                      (shareIdSnakeMatch && shareIdSnakeMatch[1].trim() !== '');
             });
    } catch (error) {
      return false;
    }
  }

  getShareUrl(content: string): string | null {
    // For backward compatibility, reconstruct shareUrl from shareId
    const shareId = this.getDirectShareId(content);
    if (shareId) {
      return `${this.apiClient.settings.serverUrl}/editor/${shareId}`;
    }
    
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
        // Try camelCase first (how plugin writes)
        const shareUrlMatch = line.trim().match(/^shareUrl:\s*(.+)$/);
        if (shareUrlMatch) {
          const shareUrl = shareUrlMatch[1].trim();
          return shareUrl === '' ? null : shareUrl;
        }
        
        // Try snake_case (how Obsidian Properties UI displays)
        const shareUrlSnakeMatch = line.trim().match(/^share_url:\s*(.+)$/);
        if (shareUrlSnakeMatch) {
          const shareUrl = shareUrlSnakeMatch[1].trim();
          return shareUrl === '' ? null : shareUrl;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private getDirectShareId(content: string): string | null {
    try {
      const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
      const fmMatch = content.match(frontmatterRegex);

      if (!fmMatch) {
        return null;
      }

      const frontmatter = fmMatch[1];
      
      // Handle malformed YAML gracefully
      if (frontmatter.includes('[unclosed') || frontmatter.includes('invalid yaml:')) {
        return null;
      }
      
      const lines = frontmatter.split('\n');
      
      for (const line of lines) {
        // Try camelCase first (how plugin writes)
        const shareIdMatch = line.trim().match(/^shareId:\s*(.+)$/);
        if (shareIdMatch) {
          const shareId = shareIdMatch[1].trim();
          return shareId === '' ? null : shareId;
        }
        
        // Try snake_case (how Obsidian Properties UI displays)
        const shareIdSnakeMatch = line.trim().match(/^share_id:\s*(.+)$/);
        if (shareIdSnakeMatch) {
          const shareId = shareIdSnakeMatch[1].trim();
          return shareId === '' ? null : shareId;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  getShareId(content: string): string | null {
    return this.getDirectShareId(content);
  }

  async shareNote(content: string): Promise<ShareResult> {
    const existingShareId = this.getShareId(content);

    if (existingShareId) {
      // Update existing share
      const updateResult = await this.apiClient.updateNote(existingShareId, content);
      
      // Get the existing shareUrl from the content or construct it from server URL
      const existingShareUrl = this.getShareUrl(content);
      const shareUrl = existingShareUrl || `${this.apiClient.settings.serverUrl}/editor/${existingShareId}`;
      
      // Update the sharedAt timestamp while preserving other metadata
      const updatedContent = await this.updateShareMetadata(content, shareUrl, new Date().toISOString());
      
      return {
        shareUrl,
        shareId: existingShareId,
        updatedContent,
        wasUpdate: true
      };
    } else {
      // Create new share - generate unique ID
      const uniqueShareId = `obsidian-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const extractedTitle = 'Untitled Document';
      
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

  async reshareNote(content: string): Promise<ShareResult> {
    // Re-share is the same as share - it will update if exists or create if new
    return await this.shareNote(content);
  }

  async shareNoteWithFilename(content: string, filename: string): Promise<ShareResult> {
    // Prepare content with proper title/body structure for editor compatibility
    const preparedContent = this.prepareContentWithTitle(content, filename);
    const cleanFilename = this.cleanFilename(filename);
    
    const existingShareId = this.getShareId(preparedContent);

    if (existingShareId) {
      // Update existing share
      const updateResult = await this.apiClient.updateNote(existingShareId, preparedContent);
      
      // Get the existing shareUrl from the content or construct it from server URL
      const existingShareUrl = this.getShareUrl(preparedContent);
      const shareUrl = existingShareUrl || `${this.apiClient.settings.serverUrl}/editor/${existingShareId}`;
      
      // Update the sharedAt timestamp while preserving other metadata
      const updatedContent = await this.updateShareMetadata(preparedContent, shareUrl, new Date().toISOString());
      
      return {
        shareUrl,
        shareId: existingShareId,
        updatedContent,
        wasUpdate: true
      };
    } else {
      // Create new share - generate unique ID and use filename as title
      const uniqueShareId = `obsidian-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      const shareResponse = await this.apiClient.shareNote(preparedContent, cleanFilename, uniqueShareId);
      
      // Use viewUrl for the property link (not the collaborative editor URL)
      const viewUrl = shareResponse.viewUrl || shareResponse.shareUrl; // Fallback to shareUrl if viewUrl not available
      
      const updatedContent = await this.addShareMetadata(
        preparedContent, 
        viewUrl, // Use viewUrl for the property link
        shareResponse.createdAt || new Date().toISOString()
      );

      return {
        shareUrl: viewUrl, // Return viewUrl as the main shareUrl
        shareId: shareResponse.shareId,
        updatedContent,
        wasUpdate: false
      };
    }
  }

  private prepareContentWithTitle(content: string, filename: string): string {
    // DON'T modify the content - the main.ts already handles title extraction
    // and removal. We should NOT add titles back to prevent duplication.
    // The backend will use the filename parameter as the title.
    return content;
  }

  private cleanFilename(filename: string): string {
    // Remove file extension (.md, .txt, etc.)
    const withoutExtension = filename.replace(/\.[^/.]+$/, '');
    return withoutExtension;
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