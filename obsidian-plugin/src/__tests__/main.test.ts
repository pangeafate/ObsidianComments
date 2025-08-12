/**
 * Tests for main.ts - the core plugin functionality
 * Target: Achieve at least 80% coverage for main plugin file
 */

import { ShareNotePlugin } from '../main';
import { ApiClient } from '../api-client';
import { ShareManager } from '../share-manager';
import { DEFAULT_SETTINGS } from '../settings';
import { App, Plugin, Notice, TFile, MarkdownView, Modal, Menu } from 'obsidian';

// Mock dependencies
jest.mock('../api-client');
jest.mock('../share-manager');
jest.mock('obsidian', () => {
  const mockStatusBarItem = {
    setText: jest.fn(),
    addClass: jest.fn(),
    removeClass: jest.fn(),
    setAttribute: jest.fn(),
    onclick: null as any,
    oncontextmenu: null as any
  };

  return {
    Plugin: class MockPlugin {
      app: any;
      manifest: any;
      addRibbonIcon = jest.fn();
      addCommand = jest.fn();
      addStatusBarItem = jest.fn().mockReturnValue(mockStatusBarItem);
      addSettingTab = jest.fn();
      loadData = jest.fn();
      saveData = jest.fn();
      registerEvent = jest.fn();
    },
    Notice: jest.fn(),
    TFile: class MockTFile {
      basename = 'test-file';
      extension = 'md';
      path = 'test-file.md';
    },
    MarkdownView: class MockMarkdownView {
      file = null;
      getState = jest.fn();
      setState = jest.fn();
      previewMode = {
        containerEl: {
          querySelector: jest.fn()
        }
      };
    },
    Modal: class MockModal {
      open = jest.fn();
      close = jest.fn();
      contentEl = document.createElement('div');
      titleEl = document.createElement('div');
    },
    Menu: class MockMenu {
      addItem = jest.fn().mockReturnThis();
      addSeparator = jest.fn().mockReturnThis();
      showAtMouseEvent = jest.fn();
    },
    PluginSettingTab: class MockSettingTab {
      containerEl = document.createElement('div');
      display = jest.fn();
    },
    Setting: class MockSetting {
      constructor(public containerEl: HTMLElement) {}
      setName = jest.fn().mockReturnThis();
      setDesc = jest.fn().mockReturnThis();
      addText = jest.fn().mockReturnThis();
      addToggle = jest.fn().mockReturnThis();
    }
  };
});

describe('ShareNotePlugin', () => {
  let plugin: ShareNotePlugin;
  let mockApp: App;
  let mockApiClient: jest.Mocked<ApiClient>;
  let mockShareManager: jest.Mocked<ShareManager>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock app
    mockApp = {
      workspace: {
        getActiveFile: jest.fn(),
        getActiveViewOfType: jest.fn(),
        on: jest.fn()
      },
      vault: {
        read: jest.fn(),
        modify: jest.fn()
      },
      metadataCache: {
        getFileCache: jest.fn(),
        on: jest.fn()
      }
    } as any;

    // Create plugin instance
    plugin = new ShareNotePlugin(mockApp, {} as any);
    
    // Get mocked instances
    mockApiClient = (ApiClient as jest.MockedClass<typeof ApiClient>).mock.instances[0] as jest.Mocked<ApiClient>;
    mockShareManager = (ShareManager as jest.MockedClass<typeof ShareManager>).mock.instances[0] as jest.Mocked<ShareManager>;
  });

  describe('onload', () => {
    it('should initialize plugin with settings and services', async () => {
      // Mock loadData to return default settings
      plugin.loadData = jest.fn().mockResolvedValue({});
      plugin.saveData = jest.fn().mockResolvedValue(undefined);

      await plugin.onload();

      // Check settings loaded
      expect(plugin.settings).toBeDefined();
      expect(plugin.settings.backendUrl).toBe(DEFAULT_SETTINGS.backendUrl);

      // Check ApiClient initialized
      expect(ApiClient).toHaveBeenCalledWith({
        serverUrl: DEFAULT_SETTINGS.backendUrl,
        apiKey: '',
        timeout: 10000
      });

      // Check ShareManager initialized
      expect(ShareManager).toHaveBeenCalledWith(mockApiClient);

      // Check UI elements added
      expect(plugin.addRibbonIcon).toHaveBeenCalledWith('share', 'Share note', expect.any(Function));
      expect(plugin.addCommand).toHaveBeenCalledTimes(2); // share and unshare commands
      expect(plugin.addStatusBarItem).toHaveBeenCalled();
      expect(plugin.registerEvent).toHaveBeenCalledTimes(2); // workspace and metadata events
    });
  });

  describe('loadSettings', () => {
    it('should load and merge settings with defaults', async () => {
      const customSettings = { backendUrl: 'https://custom.example.com' };
      plugin.loadData = jest.fn().mockResolvedValue(customSettings);

      await plugin.loadSettings();

      expect(plugin.settings.backendUrl).toBe('https://custom.example.com');
      expect(plugin.settings.copyToClipboard).toBe(DEFAULT_SETTINGS.copyToClipboard);
    });

    it('should use defaults when no saved settings', async () => {
      plugin.loadData = jest.fn().mockResolvedValue(null);

      await plugin.loadSettings();

      expect(plugin.settings).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('saveSettings', () => {
    it('should save settings and reinitialize services', async () => {
      plugin.settings = { ...DEFAULT_SETTINGS, backendUrl: 'https://new.example.com' };
      plugin.saveData = jest.fn().mockResolvedValue(undefined);

      await plugin.saveSettings();

      expect(plugin.saveData).toHaveBeenCalledWith(plugin.settings);
      expect(ApiClient).toHaveBeenCalledWith({
        serverUrl: 'https://new.example.com',
        apiKey: '',
        timeout: 10000
      });
    });
  });

  describe('shareCurrentNote', () => {
    beforeEach(async () => {
      plugin.loadData = jest.fn().mockResolvedValue({});
      await plugin.loadSettings();
      plugin.apiClient = mockApiClient;
      plugin.shareManager = mockShareManager;
    });

    it('should share a note successfully', async () => {
      const mockFile = new TFile();
      mockFile.basename = 'test-note';
      mockFile.extension = 'md';
      
      const mockContent = '# Test Note\nThis is test content';
      const mockResult = {
        shareUrl: 'https://example.com/share/123',
        shareId: '123',
        updatedContent: '---\nshareUrl: https://example.com/share/123\n---\n# Test Note\nThis is test content',
        wasUpdate: false
      };

      mockApp.workspace.getActiveFile = jest.fn().mockReturnValue(mockFile);
      mockApp.vault.read = jest.fn().mockResolvedValue(mockContent);
      mockApp.vault.modify = jest.fn().mockResolvedValue(undefined);
      mockShareManager.shareNoteWithFilename = jest.fn().mockResolvedValue(mockResult);

      // Mock clipboard
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined)
        }
      });

      await plugin.shareCurrentNote();

      expect(mockShareManager.shareNoteWithFilename).toHaveBeenCalled();
      expect(mockApp.vault.modify).toHaveBeenCalledWith(mockFile, mockResult.updatedContent);
      expect(Notice).toHaveBeenCalledWith('Note shared successfully!');
    });

    it('should handle no active file', async () => {
      mockApp.workspace.getActiveFile = jest.fn().mockReturnValue(null);

      await plugin.shareCurrentNote();

      expect(Notice).toHaveBeenCalledWith('No active file');
      expect(mockShareManager.shareNoteWithFilename).not.toHaveBeenCalled();
    });

    it('should handle non-text files', async () => {
      const mockFile = new TFile();
      mockFile.extension = 'pdf';
      
      mockApp.workspace.getActiveFile = jest.fn().mockReturnValue(mockFile);

      await plugin.shareCurrentNote();

      expect(Notice).toHaveBeenCalledWith('Only text files can be shared');
      expect(mockShareManager.shareNoteWithFilename).not.toHaveBeenCalled();
    });

    it('should handle share errors', async () => {
      const mockFile = new TFile();
      const error = new Error('Network error');
      
      mockApp.workspace.getActiveFile = jest.fn().mockReturnValue(mockFile);
      mockApp.vault.read = jest.fn().mockResolvedValue('content');
      mockShareManager.shareNoteWithFilename = jest.fn().mockRejectedValue(error);

      await expect(plugin.shareCurrentNote()).rejects.toThrow('Network error');
      expect(Notice).toHaveBeenCalledWith('Failed to share note: Network error');
    });
  });

  describe('unshareCurrentNote', () => {
    beforeEach(async () => {
      plugin.loadData = jest.fn().mockResolvedValue({});
      await plugin.loadSettings();
      plugin.apiClient = mockApiClient;
      plugin.shareManager = mockShareManager;
    });

    it('should handle unshare when note is not shared', async () => {
      const mockFile = new TFile();
      const mockContent = '# Test Note\nNot shared';
      
      mockApp.workspace.getActiveFile = jest.fn().mockReturnValue(mockFile);
      mockApp.vault.read = jest.fn().mockResolvedValue(mockContent);
      mockShareManager.isNoteShared = jest.fn().mockReturnValue(false);

      await plugin.unshareCurrentNote();

      expect(Notice).toHaveBeenCalledWith('Note is not currently shared');
      expect(mockShareManager.unshareNote).not.toHaveBeenCalled();
    });
  });

  describe('isTextFile', () => {
    it('should identify text files correctly', () => {
      const textFile = new TFile();
      textFile.extension = 'md';
      expect(plugin.isTextFile(textFile as TFile)).toBe(true);

      textFile.extension = 'txt';
      expect(plugin.isTextFile(textFile as TFile)).toBe(true);
    });

    it('should reject binary files', () => {
      const binaryFile = new TFile();
      binaryFile.extension = 'pdf';
      expect(plugin.isTextFile(binaryFile as TFile)).toBe(false);

      binaryFile.extension = 'jpg';
      expect(plugin.isTextFile(binaryFile as TFile)).toBe(false);
    });
  });

  describe('cleanMarkdownContent', () => {
    it('should clean markdown content properly', () => {
      const content = `---
frontmatter: test
---
# Title
Some content
![[attachment.pdf]]
<script>alert('xss')</script>`;

      const cleaned = plugin.cleanMarkdownContent(content);
      
      expect(cleaned).toContain('Some content');
      expect(cleaned).not.toContain('# Title'); // Title should be removed
      expect(cleaned).not.toContain('[[attachment.pdf]]');
      expect(cleaned).not.toContain('<script>');
    });

    it('should handle empty content', () => {
      expect(plugin.cleanMarkdownContent('')).toBe('');
      expect(plugin.cleanMarkdownContent(null as any)).toBe('');
      expect(plugin.cleanMarkdownContent(undefined as any)).toBe('');
    });
  });

  describe('extractCleanTitle', () => {
    it('should extract title from filename', () => {
      const file = new TFile();
      file.basename = 'My-Test_Note';
      
      const title = plugin.extractCleanTitle(file as TFile, '# Some H1\nContent');
      
      expect(title).toBe('My Test Note');
    });

    it('should fallback to H1 if filename is empty', () => {
      const file = new TFile();
      file.basename = '';
      
      const title = plugin.extractCleanTitle(file as TFile, '# Document Title\nContent');
      
      expect(title).toBe('Document Title');
    });

    it('should use default title if no filename or H1', () => {
      const file = new TFile();
      file.basename = '';
      
      const title = plugin.extractCleanTitle(file as TFile, 'No heading here');
      
      expect(title).toBe('Untitled Note');
    });
  });

  describe('updateStatusBar', () => {
    beforeEach(async () => {
      plugin.loadData = jest.fn().mockResolvedValue({});
      await plugin.loadSettings();
      plugin.shareManager = mockShareManager;
      plugin.statusBarItem = {
        setText: jest.fn(),
        addClass: jest.fn(),
        removeClass: jest.fn(),
        setAttribute: jest.fn(),
        onclick: null,
        oncontextmenu: null
      } as any;
    });

    it('should show shared indicator when note is shared', async () => {
      const mockFile = new TFile();
      const mockContent = '---\nshareUrl: https://example.com/share/123\n---\nContent';
      
      mockApp.workspace.getActiveFile = jest.fn().mockReturnValue(mockFile);
      mockApp.vault.read = jest.fn().mockResolvedValue(mockContent);
      mockShareManager.isNoteShared = jest.fn().mockReturnValue(true);
      mockShareManager.getShareUrl = jest.fn().mockReturnValue('https://example.com/share/123');

      await plugin.updateStatusBar();

      expect(plugin.statusBarItem!.setText).toHaveBeenCalledWith('🔗 Shared');
      expect(plugin.statusBarItem!.addClass).toHaveBeenCalledWith('mod-clickable');
    });

    it('should clear status when note is not shared', async () => {
      const mockFile = new TFile();
      const mockContent = 'Not shared content';
      
      mockApp.workspace.getActiveFile = jest.fn().mockReturnValue(mockFile);
      mockApp.vault.read = jest.fn().mockResolvedValue(mockContent);
      mockShareManager.isNoteShared = jest.fn().mockReturnValue(false);

      await plugin.updateStatusBar();

      expect(plugin.statusBarItem!.setText).toHaveBeenCalledWith('');
      expect(plugin.statusBarItem!.removeClass).toHaveBeenCalledWith('mod-clickable');
    });

    it('should handle no active file', async () => {
      mockApp.workspace.getActiveFile = jest.fn().mockReturnValue(null);

      await plugin.updateStatusBar();

      expect(plugin.statusBarItem!.setText).toHaveBeenCalledWith('');
    });
  });

  describe('cleanHTML', () => {
    it('should clean HTML content', () => {
      const element = document.createElement('div');
      element.innerHTML = `
        <div class="frontmatter">Frontmatter</div>
        <p>Content</p>
        <script>alert('xss')</script>
        <iframe src="evil"></iframe>
        <a href="file.pdf">PDF</a>
        <a class="internal-link">Internal</a>
      `;

      const cleaned = plugin.cleanHTML(element);
      
      expect(cleaned).toContain('<p>Content</p>');
      expect(cleaned).not.toContain('frontmatter');
      expect(cleaned).not.toContain('script');
      expect(cleaned).not.toContain('iframe');
      expect(cleaned).not.toContain('file.pdf');
    });
  });

  describe('renderToHTML', () => {
    it('should render markdown to HTML', async () => {
      const mockView = new MarkdownView();
      mockView.getState = jest.fn().mockReturnValue({ mode: 'source' });
      mockView.setState = jest.fn().mockResolvedValue(undefined);
      mockView.previewMode = {
        containerEl: {
          querySelector: jest.fn().mockReturnValue({
            innerHTML: '<p>Rendered HTML</p>',
            cloneNode: jest.fn().mockReturnValue({
              querySelectorAll: jest.fn().mockReturnValue([]),
              innerHTML: '<p>Rendered HTML</p>'
            })
          })
        }
      } as any;

      mockApp.workspace.getActiveViewOfType = jest.fn().mockReturnValue(mockView);

      const html = await plugin.renderToHTML();
      
      expect(html).toContain('Rendered HTML');
      expect(mockView.setState).toHaveBeenCalled();
    });

    it('should handle no active view', async () => {
      mockApp.workspace.getActiveViewOfType = jest.fn().mockReturnValue(null);

      const html = await plugin.renderToHTML();
      
      expect(html).toBe('');
    });
  });
});