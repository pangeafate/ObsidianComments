import { ShareNotePlugin } from '../main';
import { BackendAPI } from '../api';

// Mock Obsidian API
const mockApp = {
  vault: {
    read: jest.fn(),
    modify: jest.fn()
  },
  workspace: {
    getActiveFile: jest.fn(),
    getActiveViewOfType: jest.fn()
  },
  metadataCache: {
    getFileCache: jest.fn()
  }
};

const mockManifest = {};

// Mock Notice
(global as any).Notice = jest.fn();

describe('HTML Sharing Plugin', () => {
  let plugin: ShareNotePlugin;
  
  beforeEach(() => {
    plugin = new ShareNotePlugin(mockApp as any, mockManifest as any);
    plugin.settings = {
      backendUrl: 'http://localhost:3001',
      copyToClipboard: true,
      showNotifications: true,
      openInBrowser: false
    };
    plugin.api = new BackendAPI(plugin.settings.backendUrl);
    
    // Clear mocks
    jest.clearAllMocks();
  });

  describe('shareNoteWithHtml', () => {
    it('should use filename as title', async () => {
      const mockFile = { 
        basename: 'My Important Note',
        name: 'My Important Note.md',
        path: 'My Important Note.md' 
      };
      const mockContent = '# Different Title\n\nNote content here.';
      
      mockApp.vault.read.mockResolvedValue(mockContent);
      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);

      // Mock HTML rendering
      const mockHTML = '<h1>Different Title</h1><p>Note content here.</p>';
      jest.spyOn(plugin, 'renderToHTML').mockResolvedValue(mockHTML);

      // Mock API call
      const mockResponse = {
        shareId: 'test-123',
        viewUrl: 'http://localhost:3001/view/test-123',
        editUrl: 'http://localhost:3001/editor/test-123',
        title: 'My Important Note'
      };
      jest.spyOn(plugin.api, 'shareNote').mockResolvedValue(mockResponse);

      await plugin.shareCurrentNote();

      // Verify API called with filename as title
      expect(plugin.api.shareNote).toHaveBeenCalledWith({
        title: 'My Important Note', // Filename, not extracted from content
        content: mockContent,
        htmlContent: mockHTML
      });
    });

    it('should render HTML from preview mode', async () => {
      const mockFile = { 
        basename: 'Test Note', 
        name: 'Test Note.md',
        path: 'Test Note.md' 
      };
      const mockContent = '# Test\n\n**Bold text** and *italic*';
      
      // Mock preview element
      const mockPreviewElement = {
        innerHTML: '<h1>Test</h1><p><strong>Bold text</strong> and <em>italic</em></p>',
        cloneNode: jest.fn().mockReturnValue({
          innerHTML: '<h1>Test</h1><p><strong>Bold text</strong> and <em>italic</em></p>',
          querySelectorAll: jest.fn().mockReturnValue([])
        })
      };

      const mockView = {
        setViewState: jest.fn(),
        getState: jest.fn().mockReturnValue({}),
        previewMode: {
          containerEl: {
            querySelector: jest.fn().mockReturnValue(mockPreviewElement)
          }
        }
      };

      mockApp.vault.read.mockResolvedValue(mockContent);
      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.workspace.getActiveViewOfType.mockReturnValue(mockView);

      const html = await plugin.renderToHTML();

      expect(html).toBe('<h1>Test</h1><p><strong>Bold text</strong> and <em>italic</em></p>');
      expect(mockView.setViewState).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'preview' })
      );
    });

    it('should clean internal links from HTML', async () => {
      const mockPreviewHTML = `
        <h1>Test</h1>
        <p>Link to <a class="internal-link" href="Other Note">Other Note</a></p>
        <p>External <a href="https://example.com">link</a></p>
      `;

      const mockElement = {
        innerHTML: mockPreviewHTML,
        cloneNode: jest.fn().mockReturnValue({
          innerHTML: mockPreviewHTML,
          querySelectorAll: jest.fn((selector) => {
            if (selector === 'a.internal-link') {
              return [{
                textContent: 'Other Note',
                replaceWith: jest.fn()
              }];
            }
            if (selector === '.frontmatter') return [];
            if (selector === '.edit-block-button') return [];
            return [];
          })
        })
      };

      // Test the cleaning logic
      const cleanedHTML = plugin.cleanHTML(mockElement as unknown as Element);
      
      expect(cleanedHTML).toContain('https://example.com');
    });

    it('should update frontmatter with share URLs', async () => {
      const mockFile = { 
        basename: 'Test', 
        name: 'Test.md',
        path: 'Test.md' 
      };
      const originalContent = '---\ntags: [test]\n---\n# Test\n\nContent';
      const expectedContent = `---
tags: [test]
share_id: test-123
share_url: http://localhost:3001/view/test-123
edit_url: http://localhost:3001/editor/test-123
shared_at: 2024-01-01T00:00:00.000Z
---
# Test

Content`;

      mockApp.vault.read.mockResolvedValue(originalContent);
      mockApp.vault.modify.mockResolvedValue(undefined);
      
      // Mock metadata cache
      mockApp.metadataCache.getFileCache.mockReturnValue({
        frontmatter: { tags: ['test'] },
        frontmatterPosition: {
          start: { line: 0, col: 0, offset: 0 },
          end: { line: 1, col: 16, offset: 17 }
        }
      });
      
      const mockDate = new Date('2024-01-01T00:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const shareResult = {
        title: 'Test',
        shareId: 'test-123',
        viewUrl: 'http://localhost:3001/view/test-123',
        editUrl: 'http://localhost:3001/editor/test-123'
      };

      await plugin.updateFrontmatter(mockFile as any, shareResult);

      expect(mockApp.vault.modify).toHaveBeenCalledWith(mockFile, expectedContent);
    });
  });

  describe('API Integration', () => {
    it('should handle backend errors gracefully', async () => {
      const mockFile = { 
        basename: 'Test', 
        name: 'Test.md',
        path: 'Test.md' 
      };
      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.vault.read.mockResolvedValue('# Test\n\nContent');
      
      // Mock API error
      jest.spyOn(plugin.api, 'shareNote').mockRejectedValue(
        new Error('Backend unavailable')
      );

      await plugin.shareCurrentNote();

      expect((global as any).Notice).toHaveBeenCalledWith(
        expect.stringContaining('Failed to share')
      );
    });

    it('should validate response from backend', async () => {
      const mockFile = { 
        basename: 'Test', 
        name: 'Test.md',
        path: 'Test.md' 
      };
      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.vault.read.mockResolvedValue('# Test');

      // Mock invalid response
      jest.spyOn(plugin.api, 'shareNote').mockResolvedValue({
        // Missing required fields
      } as any);

      await expect(plugin.shareCurrentNote()).rejects.toThrow();
    });

    it('should copy share URL to clipboard when enabled', async () => {
      const mockFile = {
        basename: 'Test Note',
        name: 'Test Note.md',
        path: 'Test Note.md'
      };
      
      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockApp.vault.read.mockResolvedValue('# Test\n\nContent');
      
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn()
        }
      });

      const mockResponse = {
        shareId: 'test-123',
        viewUrl: 'http://localhost:3001/view/test-123',
        editUrl: 'http://localhost:3001/editor/test-123',
        title: 'Test Note'
      };
      
      jest.spyOn(plugin, 'renderToHTML').mockResolvedValue('<p>Test content</p>');
      jest.spyOn(plugin.api, 'shareNote').mockResolvedValue(mockResponse);
      jest.spyOn(plugin, 'updateFrontmatter').mockResolvedValue(undefined);

      plugin.settings.copyToClipboard = true;

      await plugin.shareCurrentNote();

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'http://localhost:3001/view/test-123'
      );
      expect((global as any).Notice).toHaveBeenCalledWith('Note shared successfully!');
    });
  });
});