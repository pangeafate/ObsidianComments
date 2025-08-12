/**
 * Integration test for title duplication fix
 * Tests the complete flow from Obsidian plugin to backend
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Obsidian dependencies
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
    App: class MockApp {},
    Plugin: class MockPlugin {
      app: any;
      manifest: any;
      addRibbonIcon = jest.fn();
      addCommand = jest.fn();
      addStatusBarItem = jest.fn().mockReturnValue(mockStatusBarItem);
      addSettingTab = jest.fn();
      loadData = jest.fn().mockResolvedValue({});
      saveData = jest.fn().mockResolvedValue(undefined);
      registerEvent = jest.fn();
    },
    PluginSettingTab: class MockPluginSettingTab {},
    Setting: class MockSetting {
      constructor() {
        return {
          setName: jest.fn().mockReturnThis(),
          setDesc: jest.fn().mockReturnThis(),
          addText: jest.fn().mockReturnThis(),
          addToggle: jest.fn().mockReturnThis(),
          onChange: jest.fn().mockReturnThis(),
        };
      }
    },
    Notice: jest.fn(),
    TFile: class MockTFile {
      basename = 'test-file';
      extension = 'md';
      path = 'test-file.md';
    },
    MarkdownView: class MockMarkdownView {},
    Modal: class MockModal {
      contentEl = {
        createEl: jest.fn(),
        createDiv: jest.fn(),
        empty: jest.fn(),
      };
      onOpen = jest.fn();
      onClose = jest.fn();
      open = jest.fn();
      close = jest.fn();
    },
    Menu: class MockMenu {
      addItem = jest.fn().mockReturnThis();
      addSeparator = jest.fn().mockReturnThis();
      showAtMouseEvent = jest.fn();
    }
  };
});

// Mock the API client and share manager
jest.mock('../api-client');
jest.mock('../share-manager');

// Import after mocking
import ShareNotePlugin from '../main';
import { ApiClient } from '../api-client';
import { ShareManager } from '../share-manager';

describe('Title Duplication Integration Test', () => {
  let plugin: ShareNotePlugin;
  let mockApiClient: jest.Mocked<ApiClient>;
  let mockShareManager: jest.Mocked<ShareManager>;
  let mockApp: any;
  let mockFile: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock file
    mockFile = {
      basename: 'My Important Meeting Notes',
      extension: 'md',
      path: 'My Important Meeting Notes.md'
    };

    // Create mock app
    mockApp = {
      workspace: {
        on: jest.fn(),
        getActiveFile: jest.fn().mockReturnValue(mockFile),
        getActiveViewOfType: jest.fn(),
      },
      vault: {
        read: jest.fn(),
        modify: jest.fn(),
      },
      metadataCache: {
        on: jest.fn(),
      }
    };

    // Create plugin instance
    plugin = new ShareNotePlugin(mockApp, { id: 'test', name: 'Test Plugin' } as any);

    // Ensure app is properly set
    plugin.app = mockApp;

    // Initialize settings
    plugin.settings = {
      backendUrl: 'https://example.com/api',
      copyToClipboard: false,
      showNotifications: false,
      openInBrowser: false
    };

    // Create mocked dependencies
    mockApiClient = new ApiClient({} as any) as jest.Mocked<ApiClient>;
    mockShareManager = new ShareManager(mockApiClient) as jest.Mocked<ShareManager>;

    // Set up mocks
    plugin.apiClient = mockApiClient;
    plugin.shareManager = mockShareManager;
  });

  describe('Complete Share Flow - Title Duplication Prevention', () => {
    it('should share a note without duplicating the title in content', async () => {
      // Arrange: Typical Obsidian note with H1 title matching filename
      const originalContent = `# My Important Meeting Notes

## Attendees
- John Smith
- Jane Doe

## Discussion Points

### Project Alpha Status
- Currently on track
- Budget approved
- Next milestone: Q2 2024

### Action Items
1. [ ] Follow up with stakeholders
2. [ ] Prepare quarterly report
3. [ ] Schedule next review meeting

## Next Steps

We'll reconvene next month to review progress.`;

      const expectedCleanedContent = `## Attendees
- John Smith
- Jane Doe

## Discussion Points

### Project Alpha Status
- Currently on track
- Budget approved
- Next milestone: Q2 2024

### Action Items
1. [ ] Follow up with stakeholders
2. [ ] Prepare quarterly report
3. [ ] Schedule next review meeting

## Next Steps

We'll reconvene next month to review progress.`;

      const mockShareResult = {
        shareUrl: 'https://example.com/editor/test-share-123',
        shareId: 'test-share-123',
        updatedContent: `---
shareUrl: https://example.com/editor/test-share-123
sharedAt: 2024-01-15T10:30:00Z
---

${expectedCleanedContent}`,
        wasUpdate: false
      };

      // Mock vault read
      mockApp.vault.read.mockResolvedValue(originalContent);
      
      // Mock vault modify (to save the updated content with frontmatter)
      mockApp.vault.modify.mockResolvedValue(undefined);

      // Mock shareManager response
      mockShareManager.shareNoteWithFilename.mockResolvedValue(mockShareResult);

      // Act: Share the note
      await plugin.shareCurrentNote();

      // Assert: Verify the content was cleaned before sending to backend
      expect(mockShareManager.shareNoteWithFilename).toHaveBeenCalledWith(
        expectedCleanedContent, // Content should have H1 title removed
        'My Important Meeting Notes' // Filename passed as title
      );

      // Verify the file was updated with frontmatter but content doesn't have duplicate title
      expect(mockApp.vault.modify).toHaveBeenCalledWith(
        mockFile,
        mockShareResult.updatedContent
      );

      // Verify the updated content doesn't contain duplicate title
      const updatedContent = mockShareResult.updatedContent;
      expect(updatedContent).toMatch(/shareUrl: https:\/\/example\.com/);
      expect(updatedContent).not.toMatch(/# My Important Meeting Notes\s*# My Important Meeting Notes/);
      
      // Should have H1 title removed but other headers preserved
      expect(updatedContent).not.toMatch(/# My Important Meeting Notes/);
      expect(updatedContent).toMatch(/## Attendees/);
      expect(updatedContent).toMatch(/### Project Alpha Status/);
    });

    it('should handle notes without H1 titles correctly', async () => {
      // Arrange: Note without H1 title
      const originalContent = `This note doesn't start with an H1 title.

## But it has other content

- List item 1
- List item 2

### Subsection

More content here.`;

      const mockShareResult = {
        shareUrl: 'https://example.com/editor/no-h1-123',
        shareId: 'no-h1-123',
        updatedContent: `---
shareUrl: https://example.com/editor/no-h1-123
sharedAt: 2024-01-15T10:30:00Z
---

${originalContent}`,
        wasUpdate: false
      };

      mockApp.vault.read.mockResolvedValue(originalContent);
      mockApp.vault.modify.mockResolvedValue(undefined);
      mockShareManager.shareNoteWithFilename.mockResolvedValue(mockShareResult);

      // Act
      await plugin.shareCurrentNote();

      // Assert: Content should be unchanged (no H1 to remove)
      expect(mockShareManager.shareNoteWithFilename).toHaveBeenCalledWith(
        originalContent, // Content unchanged
        'My Important Meeting Notes' // Title from filename
      );
    });

    it('should preserve content when H1 title differs from filename', async () => {
      // Arrange: Content H1 differs from filename
      const originalContent = `# Different Title in Content

This is when the content title differs from the filename.

## Section 1

Content here.`;

      const expectedCleanedContent = `This is when the content title differs from the filename.

## Section 1

Content here.`;

      const mockShareResult = {
        shareUrl: 'https://example.com/editor/different-title-123',
        shareId: 'different-title-123',
        updatedContent: `---
shareUrl: https://example.com/editor/different-title-123  
sharedAt: 2024-01-15T10:30:00Z
---

${expectedCleanedContent}`,
        wasUpdate: false
      };

      mockApp.vault.read.mockResolvedValue(originalContent);
      mockApp.vault.modify.mockResolvedValue(undefined);
      mockShareManager.shareNoteWithFilename.mockResolvedValue(mockShareResult);

      // Act
      await plugin.shareCurrentNote();

      // Assert: Should still remove the H1 (to prevent duplication) and use filename as title
      expect(mockShareManager.shareNoteWithFilename).toHaveBeenCalledWith(
        expectedCleanedContent, // H1 removed from content
        'My Important Meeting Notes' // Title from filename, not from content
      );
    });

    it('should handle content with multiple H1 headers correctly', async () => {
      // Arrange: Content with multiple H1 headers (edge case)
      const originalContent = `# First H1 Title

Content after first title.

# Second H1 Title

Content after second title.

# Third H1 Title

Final content.`;

      const expectedCleanedContent = `Content after first title.

# Second H1 Title

Content after second title.

# Third H1 Title

Final content.`;

      const mockShareResult = {
        shareUrl: 'https://example.com/editor/multiple-h1-123',
        shareId: 'multiple-h1-123',
        updatedContent: `---
shareUrl: https://example.com/editor/multiple-h1-123
sharedAt: 2024-01-15T10:30:00Z
---

${expectedCleanedContent}`,
        wasUpdate: false
      };

      mockApp.vault.read.mockResolvedValue(originalContent);
      mockApp.vault.modify.mockResolvedValue(undefined);
      mockShareManager.shareNoteWithFilename.mockResolvedValue(mockShareResult);

      // Act
      await plugin.shareCurrentNote();

      // Assert: Should only remove the FIRST H1, keep the rest
      expect(mockShareManager.shareNoteWithFilename).toHaveBeenCalledWith(
        expectedCleanedContent,
        'My Important Meeting Notes'
      );

      // Verify only first H1 was removed
      const sentContent = (mockShareManager.shareNoteWithFilename as jest.Mock).mock.calls[0][0];
      const h1Count = (sentContent.match(/^# /gm) || []).length;
      expect(h1Count).toBe(2); // Should have 2 remaining H1s (original had 3)
    });

    it('should handle existing frontmatter with title removal', async () => {
      // Arrange: Note with existing frontmatter and H1 title
      const originalContent = `---
tags: [meeting, work]
created: 2024-01-01
---

# My Important Meeting Notes

Meeting content starts here.

## Agenda Items

1. Budget review
2. Project updates`;

      const expectedCleanedContent = `---
tags: [meeting, work]
created: 2024-01-01
---

Meeting content starts here.

## Agenda Items

1. Budget review
2. Project updates`;

      const mockShareResult = {
        shareUrl: 'https://example.com/editor/frontmatter-123',
        shareId: 'frontmatter-123',
        updatedContent: `---
tags: [meeting, work]
created: 2024-01-01
shareUrl: https://example.com/editor/frontmatter-123
sharedAt: 2024-01-15T10:30:00Z
---

Meeting content starts here.

## Agenda Items

1. Budget review
2. Project updates`,
        wasUpdate: false
      };

      mockApp.vault.read.mockResolvedValue(originalContent);
      mockApp.vault.modify.mockResolvedValue(undefined);
      mockShareManager.shareNoteWithFilename.mockResolvedValue(mockShareResult);

      // Act
      await plugin.shareCurrentNote();

      // Assert: Should preserve frontmatter and remove H1 title
      expect(mockShareManager.shareNoteWithFilename).toHaveBeenCalledWith(
        expectedCleanedContent,
        'My Important Meeting Notes'
      );

      // Verify frontmatter is preserved in cleaned content
      const sentContent = (mockShareManager.shareNoteWithFilename as jest.Mock).mock.calls[0][0];
      expect(sentContent).toMatch(/^---/);
      expect(sentContent).toMatch(/tags: \[meeting, work\]/);
      expect(sentContent).not.toMatch(/# My Important Meeting Notes/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle file reading errors gracefully', async () => {
      // Arrange
      mockApp.vault.read.mockRejectedValue(new Error('File read failed'));

      // Act & Assert: Should throw the error for proper handling
      await expect(plugin.shareCurrentNote()).rejects.toThrow('File read failed');
    });

    it('should handle sharing errors gracefully', async () => {
      // Arrange
      const originalContent = `# Test Note\n\nContent here.`;
      mockApp.vault.read.mockResolvedValue(originalContent);
      mockShareManager.shareNoteWithFilename.mockRejectedValue(new Error('Share failed'));

      // Act & Assert: Should throw the error for proper handling
      await expect(plugin.shareCurrentNote()).rejects.toThrow('Share failed');
    });
  });
});