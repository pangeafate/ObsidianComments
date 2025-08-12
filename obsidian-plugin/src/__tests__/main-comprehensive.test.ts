/**
 * Comprehensive tests for main.ts to achieve 80%+ coverage
 */

import { ShareNotePlugin } from '../main';
import { ApiClient } from '../api-client';
import { ShareManager } from '../share-manager';
import { DEFAULT_SETTINGS } from '../settings';

// Mock all dependencies
jest.mock('../api-client');
jest.mock('../share-manager');

// Store original console methods
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

// Mock console to avoid noise in tests
beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

describe('ShareNotePlugin - Comprehensive Coverage', () => {
  let plugin: ShareNotePlugin;
  let mockApp: any;
  let mockStatusBarItem: any;
  let mockNotice: jest.Mock;
  let mockModal: any;
  let mockMenu: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create comprehensive mock status bar item
    mockStatusBarItem = {
      setText: jest.fn(),
      addClass: jest.fn(),
      removeClass: jest.fn(),
      setAttribute: jest.fn(),
      onclick: null,
      oncontextmenu: null
    };

    // Create mock modal
    mockModal = {
      open: jest.fn(),
      close: jest.fn(),
      onConfirm: null,
      contentEl: document.createElement('div'),
      titleEl: document.createElement('div')
    };

    // Create mock menu
    mockMenu = {
      addItem: jest.fn((callback: any) => {
        const item = {
          setTitle: jest.fn().mockReturnThis(),
          setIcon: jest.fn().mockReturnThis(),
          onClick: jest.fn().mockReturnThis()
        };
        callback(item);
        return mockMenu;
      }),
      addSeparator: jest.fn().mockReturnThis(),
      showAtMouseEvent: jest.fn()
    };

    // Mock Notice constructor
    mockNotice = jest.fn();
    (global as any).Notice = mockNotice;

    // Mock Modal constructor
    (global as any).Modal = jest.fn().mockImplementation(() => mockModal);
    (global as any).ConfirmModal = jest.fn().mockImplementation(() => mockModal);

    // Mock Menu constructor
    (global as any).Menu = jest.fn().mockImplementation(() => mockMenu);

    // Create comprehensive mock app
    mockApp = {
      workspace: {
        getActiveFile: jest.fn(),
        getActiveViewOfType: jest.fn(),
        on: jest.fn((event, callback) => ({ unload: jest.fn() }))
      },
      vault: {
        read: jest.fn(),
        modify: jest.fn()
      },
      metadataCache: {
        getFileCache: jest.fn(),
        on: jest.fn((event, callback) => ({ unload: jest.fn() }))
      }
    };

    // Create mock Plugin base class
    const MockPlugin = class {
      app = mockApp;
      manifest = { id: 'test-plugin' };
      addRibbonIcon = jest.fn();
      addCommand = jest.fn();
      addStatusBarItem = jest.fn().mockReturnValue(mockStatusBarItem);
      addSettingTab = jest.fn();
      loadData = jest.fn().mockResolvedValue(null);
      saveData = jest.fn().mockResolvedValue(undefined);
      registerEvent = jest.fn();
    };

    // Create plugin instance with mocked base
    plugin = new ShareNotePlugin(mockApp, {} as any);
    Object.setPrototypeOf(plugin, MockPlugin.prototype);
    Object.assign(plugin, new MockPlugin());
  });

  describe('Full Plugin Lifecycle', () => {
    it('should complete full initialization cycle', async () => {
      await plugin.onload();

      expect(plugin.settings).toBeDefined();
      expect(plugin.apiClient).toBeDefined();
      expect(plugin.shareManager).toBeDefined();
      expect(plugin.statusBarItem).toBeDefined();
      expect(plugin.addRibbonIcon).toHaveBeenCalled();
      expect(plugin.addCommand).toHaveBeenCalledTimes(2);
      expect(plugin.registerEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe('Share Workflow - Complete', () => {
    beforeEach(async () => {
      await plugin.onload();
    });

    it('should handle complete share workflow with clipboard and browser opening', async () => {
      const mockFile = {
        basename: 'test-note',
        extension: 'md',
        path: 'test-note.md'
      };
      
      const mockContent = '# Test Note\nContent to share';
      const mockShareResult = {
        shareUrl: 'https://example.com/share/123',
        shareId: '123',
        updatedContent: '---\nshareUrl: https://example.com/share/123\n---\n# Test Note\nContent',
        wasUpdate: false
      };

      // Setup mocks
      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.vault.read.mockResolvedValue(mockContent);
      mockApp.vault.modify.mockResolvedValue(undefined);
      
      const mockShareManager = (plugin.shareManager as jest.Mocked<ShareManager>);
      mockShareManager.shareNoteWithFilename = jest.fn().mockResolvedValue(mockShareResult);

      // Mock clipboard and window.open
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined)
        }
      });
      const mockOpen = jest.fn();
      global.window = { open: mockOpen } as any;

      // Enable all settings
      plugin.settings.copyToClipboard = true;
      plugin.settings.openInBrowser = true;
      plugin.settings.showNotifications = true;

      await plugin.shareCurrentNote();

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockShareResult.shareUrl);
      expect(mockOpen).toHaveBeenCalledWith(mockShareResult.shareUrl, '_blank');
      expect(mockNotice).toHaveBeenCalledWith('Note shared successfully!');
    });

    it('should handle update workflow', async () => {
      const mockFile = {
        basename: 'test-note',
        extension: 'md'
      };
      
      const mockShareResult = {
        shareUrl: 'https://example.com/share/123',
        shareId: '123',
        updatedContent: 'updated content',
        wasUpdate: true
      };

      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.vault.read.mockResolvedValue('content');
      
      const mockShareManager = (plugin.shareManager as jest.Mocked<ShareManager>);
      mockShareManager.shareNoteWithFilename = jest.fn().mockResolvedValue(mockShareResult);

      plugin.settings.showNotifications = true;

      await plugin.shareCurrentNote();

      expect(mockNotice).toHaveBeenCalledWith('Note updated successfully!');
    });
  });

  describe('Unshare Workflow - Complete', () => {
    beforeEach(async () => {
      await plugin.onload();
    });

    it('should handle complete unshare workflow with confirmation', async () => {
      const mockFile = {
        basename: 'test-note',
        extension: 'md'
      };
      
      const sharedContent = '---\nshareUrl: https://example.com/share/123\n---\nContent';
      const unsharedContent = 'Content';

      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.vault.read.mockResolvedValue(sharedContent);
      mockApp.vault.modify.mockResolvedValue(undefined);
      
      const mockShareManager = (plugin.shareManager as jest.Mocked<ShareManager>);
      mockShareManager.isNoteShared = jest.fn().mockReturnValue(true);
      mockShareManager.unshareNote = jest.fn().mockResolvedValue(unsharedContent);

      plugin.settings.showNotifications = true;

      // Start unshare process
      await plugin.unshareCurrentNote();

      // Modal should be opened
      expect(mockModal.open).toHaveBeenCalled();

      // Simulate confirmation
      if (mockModal.onConfirm) {
        await mockModal.onConfirm();
      }

      expect(mockShareManager.unshareNote).toHaveBeenCalledWith(sharedContent);
      expect(mockApp.vault.modify).toHaveBeenCalledWith(mockFile, unsharedContent);
      expect(mockNotice).toHaveBeenCalledWith('Note unshared successfully');
    });

    it('should handle unshare error with notification', async () => {
      const mockFile = {
        basename: 'test-note',
        extension: 'md'
      };
      
      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.vault.read.mockResolvedValue('---\nshareUrl: test\n---\nContent');
      
      const mockShareManager = (plugin.shareManager as jest.Mocked<ShareManager>);
      mockShareManager.isNoteShared = jest.fn().mockReturnValue(true);
      mockShareManager.unshareNote = jest.fn().mockRejectedValue(new Error('API Error'));

      plugin.settings.showNotifications = true;

      await plugin.unshareCurrentNote();

      // Simulate confirmation
      if (mockModal.onConfirm) {
        await mockModal.onConfirm();
      }

      expect(mockNotice).toHaveBeenCalledWith('Failed to unshare note: API Error');
    });
  });

  describe('Status Bar Updates', () => {
    beforeEach(async () => {
      await plugin.onload();
      plugin.statusBarItem = mockStatusBarItem;
    });

    it('should setup clickable status bar for shared notes', async () => {
      const mockFile = { basename: 'test', extension: 'md' };
      const sharedContent = '---\nshareUrl: https://example.com/share/123\n---\nContent';

      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.vault.read.mockResolvedValue(sharedContent);
      
      const mockShareManager = (plugin.shareManager as jest.Mocked<ShareManager>);
      mockShareManager.isNoteShared = jest.fn().mockReturnValue(true);
      mockShareManager.getShareUrl = jest.fn().mockReturnValue('https://example.com/share/123');

      await plugin.updateStatusBar();

      expect(mockStatusBarItem.setText).toHaveBeenCalledWith('🔗 Shared');
      expect(mockStatusBarItem.addClass).toHaveBeenCalledWith('mod-clickable');
      expect(mockStatusBarItem.onclick).toBeDefined();
      expect(mockStatusBarItem.oncontextmenu).toBeDefined();

      // Test click to copy
      Object.assign(navigator, {
        clipboard: { writeText: jest.fn().mockResolvedValue(undefined) }
      });
      
      const clickEvent = new MouseEvent('click');
      clickEvent.preventDefault = jest.fn();
      await mockStatusBarItem.onclick(clickEvent);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/share/123');
      expect(mockNotice).toHaveBeenCalledWith('Share link copied to clipboard');

      // Test context menu
      const contextEvent = new MouseEvent('contextmenu');
      contextEvent.preventDefault = jest.fn();
      await mockStatusBarItem.oncontextmenu(contextEvent);
      
      expect(mockMenu.showAtMouseEvent).toHaveBeenCalledWith(contextEvent);
    });

    it('should handle status bar errors gracefully', async () => {
      mockApp.workspace.getActiveFile.mockReturnValue({ basename: 'test', extension: 'md' });
      mockApp.vault.read.mockRejectedValue(new Error('Read error'));

      await plugin.updateStatusBar();

      expect(mockStatusBarItem.setText).toHaveBeenCalledWith('');
    });
  });

  describe('HTML Rendering', () => {
    beforeEach(async () => {
      await plugin.onload();
    });

    it('should render markdown to HTML with preview mode', async () => {
      const mockView = {
        file: { basename: 'test' },
        getState: jest.fn().mockReturnValue({ mode: 'source' }),
        setState: jest.fn().mockResolvedValue(undefined),
        previewMode: {
          containerEl: {
            querySelector: jest.fn().mockReturnValue({
              innerHTML: '<h1>Title</h1><p>Content</p>',
              cloneNode: function(deep: boolean) {
                const clone = document.createElement('div');
                clone.innerHTML = this.innerHTML;
                clone.querySelectorAll = jest.fn((selector) => {
                  if (selector === '.frontmatter') return [{ remove: jest.fn() }];
                  if (selector === 'script') return [{ remove: jest.fn() }];
                  return [];
                });
                return clone;
              }
            })
          }
        }
      };

      mockApp.workspace.getActiveViewOfType.mockReturnValue(mockView);

      const html = await plugin.renderToHTML();
      
      expect(html).toContain('Title');
      expect(html).toContain('Content');
      expect(mockView.setState).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    beforeEach(async () => {
      await plugin.onload();
    });

    it('should handle malformed content gracefully', () => {
      const malformed = null;
      const cleaned = plugin.cleanMarkdownContent(malformed as any);
      expect(cleaned).toBe('');
    });

    it('should handle file without extension', () => {
      const file = { extension: undefined, basename: 'test' };
      expect(plugin.isTextFile(file as any)).toBe(true);
    });

    it('should extract title from various formats', () => {
      const file = { basename: 'Test_Document-2024', extension: 'md' };
      const title = plugin.extractCleanTitle(file as any, '');
      expect(title).toBe('Test Document 2024');
    });

    it('should handle settings save error', async () => {
      plugin.saveData = jest.fn().mockRejectedValue(new Error('Save failed'));
      plugin.settings = DEFAULT_SETTINGS;
      
      // Should not throw
      await expect(plugin.saveSettings()).resolves.toBeUndefined();
    });
  });

  describe('Commands and Ribbon Actions', () => {
    beforeEach(async () => {
      await plugin.onload();
    });

    it('should register and execute share command', async () => {
      // Get the share command callback
      const shareCommand = (plugin.addCommand as jest.Mock).mock.calls.find(
        call => call[0].id === 'share-note'
      );
      
      expect(shareCommand).toBeDefined();
      
      // Setup mock for share
      mockApp.workspace.getActiveFile.mockReturnValue({ 
        basename: 'test', 
        extension: 'md' 
      });
      mockApp.vault.read.mockResolvedValue('content');
      
      const mockShareManager = (plugin.shareManager as jest.Mocked<ShareManager>);
      mockShareManager.shareNoteWithFilename = jest.fn().mockResolvedValue({
        shareUrl: 'https://example.com/share/123',
        shareId: '123',
        updatedContent: 'updated',
        wasUpdate: false
      });

      // Execute command
      await shareCommand[0].callback();
      
      expect(mockShareManager.shareNoteWithFilename).toHaveBeenCalled();
    });

    it('should register and execute ribbon icon action', async () => {
      // Get the ribbon callback
      const ribbonAction = (plugin.addRibbonIcon as jest.Mock).mock.calls[0];
      
      expect(ribbonAction[0]).toBe('share');
      expect(ribbonAction[1]).toBe('Share note');
      
      // Setup mock
      mockApp.workspace.getActiveFile.mockReturnValue({ 
        basename: 'test', 
        extension: 'md' 
      });
      mockApp.vault.read.mockResolvedValue('content');
      
      // Execute ribbon action
      await ribbonAction[2]();
      
      // Should trigger share
      expect(mockApp.workspace.getActiveFile).toHaveBeenCalled();
    });
  });
});