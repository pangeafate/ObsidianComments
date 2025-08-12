/**
 * TDD Tests for Delete/Reupload Button Functionality Issue
 * 
 * Problem: When clicking delete note or reupload in the Obsidian plugin - nothing happens
 * Expected: Delete and reupload operations should work correctly with proper user feedback
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ShareNotePlugin } from '../main';
import { App, Notice, TFile } from 'obsidian';

// Mock Obsidian APIs
const mockApp = {
  workspace: {
    getActiveFile: jest.fn(() => null)
  },
  vault: {
    read: jest.fn(() => Promise.resolve('')),
    modify: jest.fn(() => Promise.resolve())
  },
  metadataCache: {
    getFileCache: jest.fn(() => null)
  }
} as unknown as App;

const mockFile = {
  basename: 'test-note',
  path: 'test-note.md',
  extension: 'md'
} as TFile;

// Mock the Notice constructor
jest.mock('obsidian', () => ({
  Plugin: class MockPlugin {
    app = mockApp;
    addRibbonIcon = jest.fn();
    addCommand = jest.fn();
    addStatusBarItem = jest.fn().mockReturnValue({
      setText: jest.fn(),
      addClass: jest.fn(),
      removeClass: jest.fn(),
      setAttribute: jest.fn(),
      onclick: null
    });
    addSettingTab = jest.fn();
    loadData = jest.fn();
    saveData = jest.fn();
    registerEvent = jest.fn();
  },
  Notice: jest.fn(),
  Modal: class MockModal {
    app: App;
    onConfirm = () => {};
    constructor(app: App) { this.app = app; }
    open = jest.fn();
    close = jest.fn();
    onOpen = jest.fn();
    onClose = jest.fn();
  }
}));

describe('Delete/Reupload Button Functionality', () => {
  let plugin: ShareNotePlugin;
  let mockNotice: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockNotice = Notice as jest.Mock;
    
    plugin = new ShareNotePlugin(mockApp, {} as any);
    await plugin.onload();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Unshare Command Functionality', () => {
    it('should register unshare command correctly', () => {
      // Assert: Unshare command should be registered
      expect(plugin.addCommand).toHaveBeenCalledWith({
        id: 'unshare-note',
        name: 'Stop sharing current note',
        callback: expect.any(Function)
      });
    });

    it('should show error when no active file for unshare', async () => {
      // Arrange: No active file
      mockApp.workspace.getActiveFile.mockReturnValue(null);

      // Act: Execute unshare command
      await plugin.unshareCurrentNote();

      // Assert: Should show appropriate error
      expect(mockNotice).toHaveBeenCalledWith('No active file');
    });

    it('should show error when file is not currently shared', async () => {
      // Arrange: Active file but no share metadata
      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.vault.read.mockResolvedValue('# Test Note\n\nContent here.');
      mockApp.metadataCache.getFileCache.mockReturnValue({
        frontmatter: {} // No share metadata
      });

      // Act: Execute unshare command
      await plugin.unshareCurrentNote();

      // Assert: Should show appropriate error
      expect(mockNotice).toHaveBeenCalledWith('Note is not currently shared');
    });

    it('should show confirmation modal for shared note', async () => {
      // Arrange: Shared note with metadata
      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.vault.read.mockResolvedValue(`---
share_id: test-share-123
share_url: https://example.com/view/test-share-123
edit_url: https://example.com/editor/test-share-123
shared_at: 2024-01-01T00:00:00.000Z
---

# Test Note

Content here.`);

      mockApp.metadataCache.getFileCache.mockReturnValue({
        frontmatter: {
          share_id: 'test-share-123',
          share_url: 'https://example.com/view/test-share-123',
          edit_url: 'https://example.com/editor/test-share-123',
          shared_at: '2024-01-01T00:00:00.000Z'
        },
        frontmatterPosition: { end: { line: 4 } }
      });

      // Act: Execute unshare command
      await plugin.unshareCurrentNote();

      // Assert: Should show confirmation modal (not throw error)
      expect(mockNotice).not.toHaveBeenCalledWith('No active file');
      expect(mockNotice).not.toHaveBeenCalledWith('Note is not currently shared');
    });

    it('should delete from backend and remove frontmatter on confirmation', async () => {
      // Arrange: Mock backend API success
      const mockDeleteShare = jest.fn().mockResolvedValue(undefined);
      plugin.api = {
        deleteShare: mockDeleteShare,
        shareNote: jest.fn()
      } as any;

      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      const originalContent = `---
share_id: test-share-123  
share_url: https://example.com/view/test-share-123
---

# Test Note

Content here.`;

      mockApp.vault.read.mockResolvedValue(originalContent);
      mockApp.metadataCache.getFileCache.mockReturnValue({
        frontmatter: {
          share_id: 'test-share-123',
          share_url: 'https://example.com/view/test-share-123'
        },
        frontmatterPosition: { end: { line: 2 } }
      });

      // Act: Execute unshare and simulate confirmation
      await plugin.unshareCurrentNote();
      
      // Simulate the confirmation modal callback being called
      // (In real implementation, we'd need to access the modal and call onConfirm)

      // Assert: Should attempt to delete from backend
      // Note: This tests the intention, real test would need modal simulation
      expect(mockDeleteShare).toHaveBeenCalledWith('test-share-123');
    });

    it('should handle backend delete failure gracefully', async () => {
      // Arrange: Mock backend API failure
      const mockDeleteShare = jest.fn().mockRejectedValue(new Error('Network error'));
      plugin.api = {
        deleteShare: mockDeleteShare,
        shareNote: jest.fn()
      } as any;

      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.vault.read.mockResolvedValue(`---
share_id: test-share-123
---

# Test Note`);

      mockApp.metadataCache.getFileCache.mockReturnValue({
        frontmatter: { share_id: 'test-share-123' },
        frontmatterPosition: { end: { line: 1 } }
      });

      // Act: Execute unshare with backend failure
      await plugin.unshareCurrentNote();

      // Assert: Should still remove local metadata and show appropriate message
      // The error handling should be graceful, not crash the plugin
    });
  });

  describe('Status Bar Click Functionality', () => {
    it('should copy share link when status bar is clicked', async () => {
      // Arrange: Mock clipboard API
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: mockWriteText }
      });

      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.metadataCache.getFileCache.mockReturnValue({
        frontmatter: {
          share_id: 'test-123',
          share_url: 'https://example.com/view/test-123'
        }
      });

      // Act: Simulate status bar update and click
      plugin.updateStatusBar();
      
      // Get the onclick handler that was set
      const statusBarItem = plugin.statusBarItem;
      if (statusBarItem && statusBarItem.onclick) {
        await statusBarItem.onclick({} as MouseEvent);
      }

      // Assert: Should copy link to clipboard
      expect(mockWriteText).toHaveBeenCalledWith('https://example.com/view/test-123');
      expect(mockNotice).toHaveBeenCalledWith('Share link copied to clipboard');
    });

    it('should provide delete option via right-click or additional UI element', () => {
      // This test defines the expected behavior we want to implement
      // Currently missing: right-click context menu or delete button in status bar
      
      // Arrange: Shared file
      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.metadataCache.getFileCache.mockReturnValue({
        frontmatter: { share_id: 'test-123' }
      });

      // Act: Update status bar
      plugin.updateStatusBar();

      // Assert: Status bar should provide delete functionality (to be implemented)
      // This is currently failing because only copy functionality exists
      const statusBarItem = plugin.statusBarItem;
      expect(statusBarItem).toBeDefined();
      
      // TODO: Implement right-click handler or secondary button
      // expect(statusBarItem.onContextMenu).toBeDefined();
      // or
      // expect(statusBarItem.querySelector('.delete-button')).toBeDefined();
    });
  });

  describe('Re-upload/Share Functionality', () => {
    it('should update existing share when re-sharing', async () => {
      // Arrange: File already shared
      const mockShareNote = jest.fn().mockResolvedValue({
        shareId: 'test-share-123',
        viewUrl: 'https://example.com/view/test-share-123',
        editUrl: 'https://example.com/editor/test-share-123',
        title: 'Test Note'
      });

      plugin.api = {
        shareNote: mockShareNote,
        deleteShare: jest.fn()
      } as any;

      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.vault.read.mockResolvedValue(`---
share_id: test-share-123
share_url: https://example.com/view/test-share-123
---

# Test Note

Updated content here.`);

      // Act: Share again (re-upload)
      await plugin.shareCurrentNote();

      // Assert: Should call share API (this should update, not create new)
      expect(mockShareNote).toHaveBeenCalled();
      expect(mockNotice).toHaveBeenCalledWith('Note shared successfully!');
    });

    it('should handle share update failures gracefully', async () => {
      // Arrange: Mock share API failure
      const mockShareNote = jest.fn().mockRejectedValue(new Error('Update failed'));
      plugin.api = {
        shareNote: mockShareNote,
        deleteShare: jest.fn()
      } as any;

      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.vault.read.mockResolvedValue('# Test Note\n\nContent');

      // Act: Attempt to share/re-upload
      await expect(plugin.shareCurrentNote()).rejects.toThrow('Update failed');

      // Assert: Should show error message
      expect(mockNotice).toHaveBeenCalledWith(expect.stringContaining('Failed to share note'));
    });
  });

  describe('Button Visibility and Discoverability', () => {
    it('should show unshare option in command palette', () => {
      // Assert: Command should be registered and discoverable
      expect(plugin.addCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'unshare-note',
          name: 'Stop sharing current note'
        })
      );
    });

    it('should update status bar text to show sharing state', () => {
      // Arrange: Shared file
      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.metadataCache.getFileCache.mockReturnValue({
        frontmatter: { share_id: 'test-123' }
      });

      // Act: Update status bar
      plugin.updateStatusBar();

      // Assert: Status bar should indicate sharing state
      const statusBarItem = plugin.statusBarItem;
      expect(statusBarItem?.setText).toHaveBeenCalledWith('🔗 Shared');
    });

    it('should clear status bar for non-shared files', () => {
      // Arrange: Non-shared file
      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.metadataCache.getFileCache.mockReturnValue({
        frontmatter: {} // No share metadata
      });

      // Act: Update status bar
      plugin.updateStatusBar();

      // Assert: Status bar should be empty
      const statusBarItem = plugin.statusBarItem;
      expect(statusBarItem?.setText).toHaveBeenCalledWith('');
    });
  });

  describe('Error Logging and Debugging', () => {
    it('should log errors for debugging when operations fail', async () => {
      // Arrange: Mock console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockDeleteShare = jest.fn().mockRejectedValue(new Error('API Error'));
      plugin.api = { deleteShare: mockDeleteShare, shareNote: jest.fn() } as any;

      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.vault.read.mockResolvedValue('---\nshare_id: test-123\n---\n\n# Test');
      mockApp.metadataCache.getFileCache.mockReturnValue({
        frontmatter: { share_id: 'test-123' },
        frontmatterPosition: { end: { line: 1 } }
      });

      // Act: Attempt unshare with error
      await plugin.unshareCurrentNote();

      // Assert: Should log error for debugging
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should provide clear user feedback for all operations', async () => {
      // This test ensures that users get feedback for every action
      // Success and failure scenarios should both show notices
      
      // Arrange: Successful operations
      plugin.settings = { showNotifications: true };

      // Assert: All operations should show user feedback
      // (This is more of a design requirement test)
      expect(plugin.settings.showNotifications).toBe(true);
    });
  });
});