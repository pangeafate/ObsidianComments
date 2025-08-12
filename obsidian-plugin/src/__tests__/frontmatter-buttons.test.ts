/**
 * Frontmatter Buttons Tests - TDD Approach
 * 
 * These tests define the behavior of frontmatter buttons/checkboxes BEFORE implementation.
 * Following strict TDD: Write test first, see it fail, implement to pass.
 */

import { ShareNotePlugin } from '../main';
import { ShareManager } from '../share-manager';
import { ApiClient } from '../api-client';
import { App, TFile, CachedMetadata } from 'obsidian';

// Mock Obsidian
jest.mock('obsidian', () => ({
  Plugin: class Plugin {},
  Notice: jest.fn(),
  TFile: jest.fn(),
  PluginSettingTab: class PluginSettingTab {},
  Setting: jest.fn(),
  Modal: class Modal {}
}));

describe('Frontmatter Buttons Functionality', () => {
  let plugin: ShareNotePlugin;
  let mockApp: any;
  let mockShareManager: any;
  let mockApiClient: any;

  beforeEach(() => {
    // Mock App
    mockApp = {
      workspace: {
        getActiveFile: jest.fn(),
      },
      vault: {
        read: jest.fn(),
        modify: jest.fn(),
      },
      metadataCache: {
        getFileCache: jest.fn(),
        on: jest.fn(() => ({ unload: jest.fn() }))
      }
    };

    // Mock ApiClient
    mockApiClient = {
      shareNote: jest.fn(),
      updateNote: jest.fn(),
      deleteShare: jest.fn(),
      settings: {
        serverUrl: 'https://obsidiancomments.serverado.app',
        apiKey: 'test-key'
      }
    };

    // Mock ShareManager
    mockShareManager = {
      shareNoteWithFilename: jest.fn(),
      unshareNote: jest.fn(),
      isNoteShared: jest.fn(),
      getShareUrl: jest.fn(),
      getShareId: jest.fn()
    };

    // Create plugin instance
    plugin = new ShareNotePlugin(mockApp as App, {} as any);
    plugin.shareManager = mockShareManager;
    plugin.apiClient = mockApiClient;
    
    // Mock plugin settings
    plugin.settings = {
      backendUrl: 'https://obsidiancomments.serverado.app',
      copyToClipboard: false,
      showNotifications: true,
      openInBrowser: false
    };
    
    // Mock plugin methods
    plugin.extractCleanTitle = jest.fn().mockReturnValue('Test Note');
    plugin.cleanMarkdownContent = jest.fn().mockImplementation(content => content);
    plugin.removeMatchingH1Title = jest.fn().mockImplementation(content => content);
  });

  describe('Frontmatter Properties for Sharing', () => {
    test('should detect share_note checkbox in frontmatter', async () => {
      // Arrange
      const noteContent = `---
title: Test Note
share_note: true
---
# Test Note
Content here`;

      const mockFile = new TFile();
      const mockMetadata: CachedMetadata = {
        frontmatter: {
          title: 'Test Note',
          share_note: true
        }
      };

      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.vault.read.mockResolvedValue(noteContent);
      mockApp.metadataCache.getFileCache.mockReturnValue(mockMetadata);
      mockShareManager.shareNoteWithFilename.mockResolvedValue({
        shareUrl: 'https://example.com/shared/123',
        shareId: 'test123',
        updatedContent: noteContent,
        wasUpdate: false
      });

      // Act - This should trigger sharing when share_note becomes true
      await plugin.onMetadataChange(mockFile);

      // Assert
      expect(mockShareManager.shareNoteWithFilename).toHaveBeenCalled();
    });

    test('should detect unshare_note checkbox in frontmatter', async () => {
      // Arrange
      const noteContent = `---
title: Test Note
shareUrl: https://example.com/shared/123
unshare_note: true
---
# Test Note
Content here`;

      const mockFile = new TFile();
      const mockMetadata: CachedMetadata = {
        frontmatter: {
          title: 'Test Note',
          shareUrl: 'https://example.com/shared/123',
          unshare_note: true
        }
      };

      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.vault.read.mockResolvedValue(noteContent);
      mockApp.metadataCache.getFileCache.mockReturnValue(mockMetadata);
      mockShareManager.isNoteShared.mockReturnValue(true);
      mockShareManager.unshareNote.mockResolvedValue('# Test Note\nContent here');

      // Act - This should trigger unsharing when unshare_note becomes true
      await plugin.onMetadataChange(mockFile);

      // Assert
      expect(mockShareManager.unshareNote).toHaveBeenCalledWith(noteContent);
    });

    test('should detect copy_link checkbox and copy to clipboard', async () => {
      // Arrange
      const noteContent = `---
title: Test Note
shareUrl: https://example.com/shared/123
copy_link: true
---
# Test Note
Content here`;

      const mockFile = new TFile();
      const mockMetadata: CachedMetadata = {
        frontmatter: {
          title: 'Test Note',
          shareUrl: 'https://example.com/shared/123',
          copy_link: true
        }
      };

      // Mock clipboard
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined)
        }
      });

      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.vault.read.mockResolvedValue(noteContent);
      mockApp.metadataCache.getFileCache.mockReturnValue(mockMetadata);
      mockShareManager.isNoteShared.mockReturnValue(true);
      mockShareManager.getShareUrl.mockReturnValue('https://example.com/shared/123');

      // Act - This should copy link when copy_link becomes true
      await plugin.onMetadataChange(mockFile);

      // Assert
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/shared/123');
    });

    test('should reset checkboxes after actions complete', async () => {
      // Arrange
      const noteContent = `---
title: Test Note
share_note: true
---
# Test Note
Content here`;

      const expectedUpdatedContent = `---
title: Test Note
shareUrl: https://example.com/shared/123
---
# Test Note
Content here`;

      const mockFile = new TFile();
      const mockMetadata: CachedMetadata = {
        frontmatter: {
          title: 'Test Note',
          share_note: true
        }
      };

      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.vault.read.mockResolvedValue(noteContent);
      mockApp.metadataCache.getFileCache.mockReturnValue(mockMetadata);
      mockShareManager.shareNoteWithFilename.mockResolvedValue({
        shareUrl: 'https://example.com/shared/123',
        shareId: 'test123',
        updatedContent: expectedUpdatedContent,
        wasUpdate: false
      });

      // Act
      await plugin.onMetadataChange(mockFile);

      // Assert - Should reset the checkbox after sharing
      expect(mockApp.vault.modify).toHaveBeenCalledWith(
        mockFile,
        expect.not.stringContaining('share_note: true')
      );
    });
  });

  describe('Proper Unsharing Functionality', () => {
    test('should completely remove note from database and frontmatter', async () => {
      // Arrange
      const sharedNoteContent = `---
title: Test Note
shareUrl: https://example.com/shared/123
sharedAt: 2024-01-01T00:00:00.000Z
---
# Test Note
Content here`;

      const expectedCleanContent = `---
title: Test Note
---
# Test Note
Content here`;

      const mockFile = new TFile();
      mockShareManager.isNoteShared.mockReturnValue(true);
      mockShareManager.getShareId.mockReturnValue('test123');
      mockApiClient.deleteShare.mockResolvedValue(undefined);
      mockShareManager.unshareNote.mockResolvedValue(expectedCleanContent);

      // Act - This will FAIL until proper unsharing is implemented
      const result = await plugin.unshareCurrentNote();

      // Assert
      expect(mockApiClient.deleteShare).toHaveBeenCalledWith('test123');
      expect(mockShareManager.unshareNote).toHaveBeenCalled();
      expect(result).not.toContain('shareUrl:');
      expect(result).not.toContain('sharedAt:');
    });

    test('should handle database deletion errors gracefully', async () => {
      // Arrange
      const sharedNoteContent = `---
title: Test Note
shareUrl: https://example.com/shared/123
---
# Test Note`;

      mockShareManager.isNoteShared.mockReturnValue(true);
      mockShareManager.getShareId.mockReturnValue('test123');
      mockApiClient.deleteShare.mockRejectedValue(new Error('Database deletion failed'));
      mockShareManager.unshareNote.mockResolvedValue('# Test Note');

      // Act & Assert - Should still clean frontmatter even if DB deletion fails
      const result = await plugin.unshareCurrentNote();
      
      expect(mockApiClient.deleteShare).toHaveBeenCalledWith('test123');
      expect(mockShareManager.unshareNote).toHaveBeenCalled();
      expect(result).not.toContain('shareUrl:');
    });
  });
});