/**
 * Main Plugin Tests - TDD Approach
 * 
 * These tests define the behavior of the main ObsidianCommentsPlugin class BEFORE implementation.
 * Following strict TDD: Write test first, see it fail, implement to pass.
 */

import { ObsidianCommentsPlugin } from '../../src/main';
import { App, TFile, Notice } from 'obsidian';
import { MOCK_SETTINGS, TEST_NOTES } from '../fixtures/test-notes';

// Mock dependencies
jest.mock('../../src/api-client');
jest.mock('../../src/share-manager');
jest.mock('../../src/settings');

// Mock global Notice and clipboard
global.Notice = jest.fn();
global.navigator = {
  clipboard: {
    writeText: jest.fn()
  }
} as any;

describe('ObsidianCommentsPlugin', () => {
  let plugin: ObsidianCommentsPlugin;
  let mockApp: jest.Mocked<App>;
  let mockManifest: any;

  beforeEach(() => {
    mockApp = {
      vault: {
        read: jest.fn(),
        modify: jest.fn(),
        adapter: {
          write: jest.fn(),
          read: jest.fn(),
          exists: jest.fn().mockResolvedValue(false) // No existing settings file
        }
      },
      workspace: {
        getActiveFile: jest.fn(),
        on: jest.fn()
      },
      commands: {
        addCommand: jest.fn()
      }
    } as any;

    mockManifest = {
      id: 'obsidian-comments',
      name: 'Obsidian Comments',
      version: '1.0.0'
    };

    // Create plugin instance - using a base Plugin mock
    plugin = new ObsidianCommentsPlugin(mockApp, mockManifest);
    
    // Mock Plugin base class methods
    plugin.addCommand = jest.fn();
    plugin.addRibbonIcon = jest.fn();
    plugin.addStatusBarItem = jest.fn().mockReturnValue({ setText: jest.fn() });
    plugin.addSettingTab = jest.fn();
    plugin.registerEvent = jest.fn();
  });

  describe('constructor', () => {
    test('should initialize with app and manifest', () => {
      // This test will FAIL until constructor is implemented
      expect(plugin).toBeInstanceOf(ObsidianCommentsPlugin);
      expect(plugin.app).toBe(mockApp);
      expect(plugin.manifest).toBe(mockManifest);
    });

    test('should initialize settings manager', () => {
      // This test will FAIL until settings integration is implemented
      expect(plugin.settingsManager).toBeDefined();
    });

    test('should initialize API client and share manager', () => {
      // This test will FAIL until component initialization is implemented
      expect(plugin.apiClient).toBeDefined();
      expect(plugin.shareManager).toBeDefined();
    });
  });

  describe('onload', () => {
    test('should load settings on plugin activation', async () => {
      // Arrange
      const loadSettingsSpy = jest.spyOn(plugin.settingsManager, 'loadSettings');
      
      // Act - This will FAIL until onload is implemented
      await plugin.onload();
      
      // Assert
      expect(loadSettingsSpy).toHaveBeenCalled();
    });

    test('should register share command', async () => {
      // Act - This will FAIL until command registration is implemented
      await plugin.onload();
      
      // Assert - Plugin.addCommand is called, not app.commands.addCommand
      expect(plugin.addCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'share-note',
          name: 'Share current note online',
          callback: expect.any(Function)
        })
      );
    });

    test('should register unshare command', async () => {
      // Act - This will FAIL until command registration is implemented
      await plugin.onload();
      
      // Assert - Plugin.addCommand is called, not app.commands.addCommand
      expect(plugin.addCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'unshare-note',
          name: 'Stop sharing current note',
          callback: expect.any(Function)  
        })
      );
    });

    test('should add context menu items', async () => {
      // Arrange
      const registerEventSpy = jest.spyOn(plugin, 'registerEvent');
      
      // Act - This will FAIL until context menu registration is implemented
      await plugin.onload();
      
      // Assert
      expect(registerEventSpy).toHaveBeenCalled();
    });

    test('should add settings tab', async () => {
      // Arrange
      const addSettingTabSpy = jest.spyOn(plugin, 'addSettingTab');
      
      // Act - This will FAIL until settings tab registration is implemented
      await plugin.onload();
      
      // Assert
      expect(addSettingTabSpy).toHaveBeenCalled();
    });
  });

  describe('shareCurrentNote', () => {
    test('should share the currently active note', async () => {
      // Arrange
      const mockFile = new TFile('test-note.md');
      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.vault.read.mockResolvedValue(TEST_NOTES.simple.content);
      
      const shareNoteSpy = jest.spyOn(plugin.shareManager, 'shareNote');
      shareNoteSpy.mockResolvedValue({
        shareUrl: 'https://share.obsidiancomments.com/abc123',
        shareId: 'abc123',
        updatedContent: TEST_NOTES.simple.expectedFrontmatter,
        wasUpdate: false
      });

      // Act - This will FAIL until shareCurrentNote is implemented
      await plugin.shareCurrentNote();

      // Assert
      expect(shareNoteSpy).toHaveBeenCalledWith(TEST_NOTES.simple.content);
      expect(mockApp.vault.modify).toHaveBeenCalledWith(
        mockFile,
        TEST_NOTES.simple.expectedFrontmatter
      );
    });

    test('should show error if no active file', async () => {
      // Arrange
      mockApp.workspace.getActiveFile.mockReturnValue(null);
      const noticeSpy = global.Notice as jest.Mock;

      // Act - This will FAIL until error handling is implemented
      await plugin.shareCurrentNote();

      // Assert
      expect(noticeSpy).toHaveBeenCalledWith('No active file to share');
    });

    test('should copy URL to clipboard and show notification', async () => {
      // Arrange
      const mockFile = new TFile('test-note.md');
      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.vault.read.mockResolvedValue(TEST_NOTES.simple.content);
      
      const shareNoteSpy = jest.spyOn(plugin.shareManager, 'shareNote');
      shareNoteSpy.mockResolvedValue({
        shareUrl: 'https://share.obsidiancomments.com/abc123',
        shareId: 'abc123',
        updatedContent: TEST_NOTES.simple.content,
        wasUpdate: false
      });

      const copyToClipboardSpy = navigator.clipboard.writeText as jest.Mock;
      const noticeSpy = global.Notice as jest.Mock;

      // Act - This will FAIL until clipboard and notification handling is implemented
      await plugin.shareCurrentNote();

      // Assert
      expect(copyToClipboardSpy).toHaveBeenCalledWith('https://share.obsidiancomments.com/abc123');
      expect(noticeSpy).toHaveBeenCalledWith('Note shared! URL copied to clipboard.');
    });

    test('should handle sharing errors gracefully', async () => {
      // Arrange
      const mockFile = new TFile('test-note.md');
      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.vault.read.mockResolvedValue(TEST_NOTES.simple.content);
      
      const shareNoteSpy = jest.spyOn(plugin.shareManager, 'shareNote');
      shareNoteSpy.mockRejectedValue(new Error('API Error'));
      
      const noticeSpy = global.Notice as jest.Mock;

      // Act - This will FAIL until error handling is implemented
      await plugin.shareCurrentNote();

      // Assert
      expect(noticeSpy).toHaveBeenCalledWith('Failed to share note: API Error');
    });
  });

  describe('unshareCurrentNote', () => {
    test('should unshare the currently active note', async () => {
      // Arrange
      const mockFile = new TFile('test-note.md');
      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.vault.read.mockResolvedValue(TEST_NOTES.withFrontmatter.content);
      
      const unshareNoteSpy = jest.spyOn(plugin.shareManager, 'unshareNote');
      unshareNoteSpy.mockResolvedValue(TEST_NOTES.simple.content);

      // Act - This will FAIL until unshareCurrentNote is implemented
      await plugin.unshareCurrentNote();

      // Assert
      expect(unshareNoteSpy).toHaveBeenCalledWith(TEST_NOTES.withFrontmatter.content);
      expect(mockApp.vault.modify).toHaveBeenCalledWith(mockFile, TEST_NOTES.simple.content);
    });

    test('should show success notification', async () => {
      // Arrange
      const mockFile = new TFile('test-note.md');
      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.vault.read.mockResolvedValue(TEST_NOTES.withFrontmatter.content);
      
      const unshareNoteSpy = jest.spyOn(plugin.shareManager, 'unshareNote');
      unshareNoteSpy.mockResolvedValue(TEST_NOTES.simple.content);
      
      const noticeSpy = global.Notice as jest.Mock;

      // Act - This will FAIL until notification handling is implemented
      await plugin.unshareCurrentNote();

      // Assert
      expect(noticeSpy).toHaveBeenCalledWith('Note unshared successfully.');
    });

    test('should handle unshare errors', async () => {
      // Arrange
      const mockFile = new TFile('test-note.md');
      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.vault.read.mockResolvedValue(TEST_NOTES.withFrontmatter.content);
      
      const unshareNoteSpy = jest.spyOn(plugin.shareManager, 'unshareNote');
      unshareNoteSpy.mockRejectedValue(new Error('Delete failed'));
      
      const noticeSpy = global.Notice as jest.Mock;

      // Act - This will FAIL until error handling is implemented
      await plugin.unshareCurrentNote();

      // Assert
      expect(noticeSpy).toHaveBeenCalledWith('Failed to unshare note: Delete failed');
    });
  });

  describe('onunload', () => {
    test('should cleanup resources on plugin deactivation', async () => {
      // This test will FAIL until onunload is implemented
      await plugin.onload();
      
      // Act
      plugin.onunload();
      
      // Assert - should not throw errors
      expect(true).toBe(true);
    });
  });

  describe('context menu integration', () => {
    test('should add share option to file context menu', async () => {
      // Arrange
      await plugin.onload();
      
      // This test will FAIL until context menu integration is implemented
      const contextMenuCallback = mockApp.workspace.on.mock.calls.find(
        call => call[0] === 'file-menu'
      )?.[1];
      
      expect(contextMenuCallback).toBeDefined();
    });
  });

  describe('ribbon icon', () => {
    test('should add ribbon icon for quick sharing', async () => {
      // Arrange
      const addRibbonIconSpy = jest.spyOn(plugin, 'addRibbonIcon');
      
      // Act - This will FAIL until ribbon icon is implemented
      await plugin.onload();
      
      // Assert
      expect(addRibbonIconSpy).toHaveBeenCalledWith(
        'share',
        'Share current note',
        expect.any(Function)
      );
    });
  });

  describe('settings integration', () => {
    test('should update API client when settings change', async () => {
      // Arrange
      await plugin.onload();
      const newSettings = { ...MOCK_SETTINGS.configured };
      
      // Act - This will FAIL until settings change handling is implemented
      await plugin.onSettingsChange(newSettings);
      
      // Assert
      expect(plugin.apiClient.settings).toEqual(newSettings);
    });
  });

  describe('status bar integration', () => {
    test('should show sharing status in status bar', async () => {
      // Arrange
      const addStatusBarItemSpy = jest.spyOn(plugin, 'addStatusBarItem');
      
      // Act - This will FAIL until status bar integration is implemented
      await plugin.onload();
      
      // Assert
      expect(addStatusBarItemSpy).toHaveBeenCalled();
    });

    test('should update status when note sharing state changes', async () => {
      // Arrange
      await plugin.onload();
      const mockFile = new TFile('test-note.md');
      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.vault.read.mockResolvedValue(TEST_NOTES.withFrontmatter.content);
      
      // Act - This will FAIL until status update is implemented
      await plugin.updateSharingStatus();
      
      // Assert
      expect(plugin.statusBarItem?.setText).toHaveBeenCalledWith('📤 Shared');
    });
  });
});