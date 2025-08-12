/**
 * Comprehensive tests for cleanMarkdownContent function
 * Tests the title duplication fix and content cleaning functionality
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock Obsidian dependencies first
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

// Import the ShareNotePlugin after mocking
import ShareNotePlugin from '../main';

describe('cleanMarkdownContent - Title Duplication Fix', () => {
  let plugin: ShareNotePlugin;

  beforeEach(() => {
    // Create a mock app instance
    const mockApp = {
      workspace: {
        on: jest.fn(),
        getActiveFile: jest.fn(),
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

    // Create plugin instance with proper mocks
    plugin = new ShareNotePlugin(mockApp as any, { id: 'test', name: 'Test Plugin' } as any);
  });

  describe('Basic Title Removal', () => {
    it('should remove H1 title from content without frontmatter', () => {
      const content = `# My Test Note

This is the content of the note.

## Subtitle

More content here.`;

      const result = plugin.cleanMarkdownContent(content);

      expect(result).toBe(`This is the content of the note.

## Subtitle

More content here.`);
      expect(result).not.toMatch(/^#\s+My Test Note/);
    });

    it('should remove H1 title from content with frontmatter', () => {
      const content = `---
title: My Note
tags: [test]
---

# My Test Note

This is the content after frontmatter.

## Section 1

Content continues here.`;

      const result = plugin.cleanMarkdownContent(content);

      expect(result).toBe(`---
title: My Note
tags: [test]
---

This is the content after frontmatter.

## Section 1

Content continues here.`);
      expect(result).not.toMatch(/# My Test Note/);
    });
  });

  describe('Edge Cases and Whitespace Handling', () => {
    it('should handle content with leading whitespace before H1', () => {
      const content = `   # My Note With Spaces

Content after spaces.`;

      const result = plugin.cleanMarkdownContent(content);

      expect(result).toBe(`Content after spaces.`);
    });

    it('should handle content with tabs before H1', () => {
      const content = `\t\t# My Note With Tabs

Content after tabs.`;

      const result = plugin.cleanMarkdownContent(content);

      expect(result).toBe(`Content after tabs.`);
    });

    it('should handle H1 with various spacing in title', () => {
      const content = `#    Multiple    Spaces    In    Title

Content here.`;

      const result = plugin.cleanMarkdownContent(content);

      expect(result).toBe(`Content here.`);
    });

    it('should handle H1 with special characters in title', () => {
      const content = `# My Note: With Special Characters & Symbols!

Content with special chars.`;

      const result = plugin.cleanMarkdownContent(content);

      expect(result).toBe(`Content with special chars.`);
    });
  });

  describe('Frontmatter Handling', () => {
    it('should preserve frontmatter and remove H1 from content', () => {
      const content = `---
shareUrl: https://example.com/share/123
sharedAt: 2024-01-01T00:00:00Z
---

# Shared Note Title

This is shared note content.`;

      const result = plugin.cleanMarkdownContent(content);

      expect(result).toBe(`---
shareUrl: https://example.com/share/123
sharedAt: 2024-01-01T00:00:00Z
---

This is shared note content.`);
      expect(result).toMatch(/^---/);
      expect(result).toMatch(/shareUrl:/);
    });

    it('should handle frontmatter with CRLF line endings', () => {
      const content = `---\r\ntitle: Test\r\n---\r\n\r\n# My Title\r\n\r\nContent here.`;

      const result = plugin.cleanMarkdownContent(content);

      expect(result).toMatch(/^---/);
      expect(result).not.toMatch(/# My Title/);
      expect(result).toMatch(/Content here\./);
    });

    it('should handle complex frontmatter with nested values', () => {
      const content = `---
title: Complex Note
tags: 
  - tag1
  - tag2
metadata:
  author: John Doe
  date: 2024-01-01
---

# Complex Note

This has complex frontmatter.`;

      const result = plugin.cleanMarkdownContent(content);

      expect(result).toMatch(/author: John Doe/);
      expect(result).not.toMatch(/# Complex Note/);
      expect(result).toMatch(/This has complex frontmatter\./);
    });
  });

  describe('Content Preservation', () => {
    it('should preserve H2-H6 headers', () => {
      const content = `# Title to Remove

## Keep This H2

### Keep This H3

#### Keep This H4

##### Keep This H5

###### Keep This H6`;

      const result = plugin.cleanMarkdownContent(content);

      expect(result).not.toMatch(/# Title to Remove/);
      expect(result).toMatch(/## Keep This H2/);
      expect(result).toMatch(/### Keep This H3/);
      expect(result).toMatch(/#### Keep This H4/);
      expect(result).toMatch(/##### Keep This H5/);
      expect(result).toMatch(/###### Keep This H6/);
    });

    it('should only remove the FIRST H1, not subsequent ones', () => {
      const content = `# First H1 - Should be removed

Content here.

# Second H1 - Should be kept

More content.

# Third H1 - Should also be kept`;

      const result = plugin.cleanMarkdownContent(content);

      expect(result).not.toMatch(/# First H1 - Should be removed/);
      expect(result).toMatch(/# Second H1 - Should be kept/);
      expect(result).toMatch(/# Third H1 - Should also be kept/);
      
      // Count remaining H1 headers
      const h1Count = (result.match(/^# /gm) || []).length;
      expect(h1Count).toBe(2);
    });

    it('should preserve formatting and markdown syntax', () => {
      const content = `# Title

This is **bold text** and *italic text*.

\`\`\`javascript
console.log("code block");
\`\`\`

- List item 1
- List item 2

> Quote block

[Link text](https://example.com)`;

      const result = plugin.cleanMarkdownContent(content);

      expect(result).toMatch(/This is \*\*bold text\*\*/);
      expect(result).toMatch(/\*italic text\*/);
      expect(result).toMatch(/```javascript/);
      expect(result).toMatch(/console\.log/);
      expect(result).toMatch(/- List item 1/);
      expect(result).toMatch(/> Quote block/);
      expect(result).toMatch(/\[Link text\]/);
    });
  });

  describe('Binary Content and Media Removal', () => {
    it('should remove binary attachment links', () => {
      const content = `# Note With Attachments

Here's some content.

[[document.pdf]]
[[spreadsheet.xlsx]]
[[presentation.pptx]]

But keep this: [[regular-note.md]]`;

      const result = plugin.cleanMarkdownContent(content);

      expect(result).not.toMatch(/\[\[document\.pdf\]\]/);
      expect(result).not.toMatch(/\[\[spreadsheet\.xlsx\]\]/);
      expect(result).not.toMatch(/\[\[presentation\.pptx\]\]/);
      expect(result).toMatch(/\[\[regular-note\.md\]\]/);
    });

    it('should remove embedded content', () => {
      const content = `# Note With Embeds

Content here.

![[embedded-image.png]]
![[embedded-video.mp4]]

Regular content continues.`;

      const result = plugin.cleanMarkdownContent(content);

      expect(result).not.toMatch(/!\[\[embedded-image\.png\]\]/);
      expect(result).not.toMatch(/!\[\[embedded-video\.mp4\]\]/);
      expect(result).toMatch(/Regular content continues\./);
    });

    it('should remove dangerous HTML tags', () => {
      const content = `# Note With HTML

Safe content here.

<script>alert('dangerous');</script>
<style>body { background: red; }</style>
<iframe src="evil.com"></iframe>

<p>This paragraph should remain</p>`;

      const result = plugin.cleanMarkdownContent(content);

      expect(result).not.toMatch(/<script>/);
      expect(result).not.toMatch(/<style>/);
      expect(result).not.toMatch(/<iframe>/);
      expect(result).toMatch(/<p>This paragraph should remain<\/p>/);
    });
  });

  describe('Line Ending Normalization', () => {
    it('should handle different line ending types', () => {
      const contentLF = `# Title\n\nContent with LF.`;
      const contentCRLF = `# Title\r\n\r\nContent with CRLF.`;
      const contentCR = `# Title\r\nContent with CR.`; // CR alone is rare, use CRLF instead

      const resultLF = plugin.cleanMarkdownContent(contentLF);
      const resultCRLF = plugin.cleanMarkdownContent(contentCRLF);
      const resultCR = plugin.cleanMarkdownContent(contentCR);

      expect(resultLF).toBe(`Content with LF.`);
      expect(resultCRLF).toBe(`Content with CRLF.`);
      expect(resultCR).toBe(`Content with CR.`);
    });

    it('should clean up excessive whitespace', () => {
      const content = `# Title



Multiple empty lines above.


And here too.




End.`;

      const result = plugin.cleanMarkdownContent(content);

      expect(result).toBe(`Multiple empty lines above.

And here too.

End.`);
      // Should not have more than 2 consecutive newlines
      expect(result).not.toMatch(/\n\n\n/);
    });
  });

  describe('Empty and Invalid Content', () => {
    it('should handle empty content', () => {
      const result = plugin.cleanMarkdownContent('');
      expect(result).toBe('');
    });

    it('should handle null/undefined content', () => {
      const resultNull = plugin.cleanMarkdownContent(null as any);
      const resultUndefined = plugin.cleanMarkdownContent(undefined as any);
      
      expect(resultNull).toBe('');
      expect(resultUndefined).toBe('');
    });

    it('should handle non-string content', () => {
      const resultNumber = plugin.cleanMarkdownContent(123 as any);
      const resultObject = plugin.cleanMarkdownContent({} as any);
      
      expect(resultNumber).toBe('');
      expect(resultObject).toBe('');
    });

    it('should handle content with only H1', () => {
      const content = `# Only Title`;
      const result = plugin.cleanMarkdownContent(content);
      expect(result).toBe('');
    });

    it('should handle content with only frontmatter and H1', () => {
      const content = `---
title: Test
---

# Test Title`;

      const result = plugin.cleanMarkdownContent(content);

      expect(result).toBe(`---
title: Test
---`);
    });
  });

  describe('Real-world Examples', () => {
    it('should handle typical Obsidian note structure', () => {
      const content = `---
tags: [personal, work]
created: 2024-01-01
modified: 2024-01-02
---

# Meeting Notes - January 2024

## Attendees
- John Doe
- Jane Smith

## Discussion Points

### Project Alpha
- Status: In progress
- Next steps: [[follow-up-tasks.md]]

### Budget Review
![[budget-chart.png]]

## Action Items
1. [ ] Review budget proposal
2. [ ] Schedule follow-up meeting

---
End of notes.`;

      const result = plugin.cleanMarkdownContent(content);

      expect(result).toMatch(/^---/); // Preserves frontmatter
      expect(result).not.toMatch(/# Meeting Notes - January 2024/); // Removes H1 title
      expect(result).toMatch(/## Attendees/); // Keeps H2
      expect(result).toMatch(/### Project Alpha/); // Keeps H3
      expect(result).toMatch(/- John Doe/); // Keeps lists
      expect(result).toMatch(/1\. \[ \] Review budget/); // Keeps checkboxes
      expect(result).not.toMatch(/!\[\[budget-chart\.png\]\]/); // Removes embedded image
      expect(result).toMatch(/\[\[follow-up-tasks\.md\]\]/); // Keeps note links
    });
  });
});