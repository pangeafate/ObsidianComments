# 🧪 **TDD MVP Plan: ShareNote Integration with Minimal Server Changes**

## **Phase 0: Analysis of Current System**

### **Constraints & Requirements**
- ✅ **Minimal backend changes** - preserve existing collaboration
- ✅ **Text-only sharing** - no file uploads
- ✅ **XSS protection** - sanitize HTML content
- ✅ **Title = Filename** - no smart extraction
- ✅ **TDD approach** - tests first, then implementation
- ✅ **CI/CD integration** - all tests in GitHub Actions

### **Current Backend API Analysis**
```typescript
// Existing endpoints we'll use:
POST /api/notes/share     // Modify to accept HTML
GET /api/notes/:shareId   // Modify to return HTML
PUT /api/notes/:shareId   // Keep as-is for editing
DELETE /api/notes/:shareId // Keep as-is
```

---

## **Phase 1: Test-Driven Backend Changes (Week 1)**

### **1.1 Write Failing Tests First**

#### **Test File 1: HTML Support Tests**

```typescript
// packages/backend/src/routes/__tests__/notes-html-support.test.ts

describe('HTML Support for Notes', () => {
  describe('POST /api/notes/share with HTML', () => {
    it('should accept and store HTML content alongside markdown', async () => {
      const shareRequest = {
        title: 'My Test Note',
        content: '# My Test Note\n\nThis is markdown content.',
        htmlContent: '<h1>My Test Note</h1><p>This is markdown content.</p>',
        metadata: { source: 'obsidian-share-note' }
      };

      const response = await request(app)
        .post('/api/notes/share')
        .send(shareRequest)
        .expect(201);

      expect(response.body).toMatchObject({
        shareId: expect.any(String),
        collaborativeUrl: expect.stringContaining('/editor/'),
        title: 'My Test Note'
      });

      // Verify both markdown and HTML are stored
      const document = await prisma.document.findUnique({
        where: { id: response.body.shareId }
      });

      expect(document).toMatchObject({
        title: 'My Test Note',
        content: '# My Test Note\n\nThis is markdown content.',
        htmlContent: '<h1>My Test Note</h1><p>This is markdown content.</p>',
        renderMode: 'html'
      });
    });

    it('should sanitize HTML content to prevent XSS', async () => {
      const maliciousHTML = '<script>alert("xss")</script><h1>Safe Content</h1>';
      const shareRequest = {
        title: 'XSS Test',
        content: '# XSS Test\n\nSafe content',
        htmlContent: maliciousHTML
      };

      const response = await request(app)
        .post('/api/notes/share')
        .send(shareRequest)
        .expect(201);

      const document = await prisma.document.findUnique({
        where: { id: response.body.shareId }
      });

      // Should remove script tags but keep safe HTML
      expect(document.htmlContent).not.toContain('<script>');
      expect(document.htmlContent).toContain('<h1>Safe Content</h1>');
    });

    it('should work with markdown-only content (backward compatibility)', async () => {
      const markdownOnlyRequest = {
        title: 'Markdown Only',
        content: '# Markdown Only\n\nJust markdown.'
      };

      const response = await request(app)
        .post('/api/notes/share')
        .send(markdownOnlyRequest)
        .expect(201);

      const document = await prisma.document.findUnique({
        where: { id: response.body.shareId }
      });

      expect(document).toMatchObject({
        title: 'Markdown Only',
        content: '# Markdown Only\n\nJust markdown.',
        htmlContent: null,
        renderMode: 'markdown'
      });
    });

    it('should NOT extract title from content when title is provided', async () => {
      const request = {
        title: 'Explicit Title',
        content: '# Different H1 Title\n\nContent here.',
        htmlContent: '<h1>Different H1 Title</h1><p>Content here.</p>'
      };

      const response = await request(app)
        .post('/api/notes/share')
        .send(request)
        .expect(201);

      const document = await prisma.document.findUnique({
        where: { id: response.body.shareId }
      });

      // Title should be what was provided, NOT extracted from content
      expect(document.title).toBe('Explicit Title');
    });

    it('should require title when creating notes', async () => {
      const requestWithoutTitle = {
        content: '# Some content',
        htmlContent: '<h1>Some content</h1>'
      };

      await request(app)
        .post('/api/notes/share')
        .send(requestWithoutTitle)
        .expect(400);
    });
  });

  describe('GET /api/notes/:shareId with HTML support', () => {
    it('should return HTML content when available', async () => {
      // Create note with HTML
      const document = await prisma.document.create({
        data: {
          title: 'HTML Note',
          content: '# HTML Note\n\nMarkdown content',
          htmlContent: '<h1>HTML Note</h1><p>Markdown content</p>',
          renderMode: 'html'
        }
      });

      const response = await request(app)
        .get(`/api/notes/${document.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        shareId: document.id,
        title: 'HTML Note',
        content: '# HTML Note\n\nMarkdown content',
        htmlContent: '<h1>HTML Note</h1><p>Markdown content</p>',
        renderMode: 'html',
        viewUrl: expect.stringContaining(`/view/${document.id}`),
        collaborativeUrl: expect.stringContaining(`/editor/${document.id}`)
      });
    });

    it('should work with legacy markdown-only notes', async () => {
      const document = await prisma.document.create({
        data: {
          title: 'Legacy Note',
          content: '# Legacy\n\nOld note format',
          renderMode: 'markdown'
        }
      });

      const response = await request(app)
        .get(`/api/notes/${document.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        title: 'Legacy Note',
        content: '# Legacy\n\nOld note format',
        htmlContent: null,
        renderMode: 'markdown'
      });
    });
  });

  describe('PUT /api/notes/:shareId - preserve existing editing', () => {
    it('should update markdown content without affecting HTML', async () => {
      const document = await prisma.document.create({
        data: {
          title: 'Editable Note',
          content: 'Original markdown',
          htmlContent: '<p>Original HTML</p>',
          renderMode: 'html'
        }
      });

      await request(app)
        .put(`/api/notes/${document.id}`)
        .send({ content: 'Updated markdown' })
        .expect(200);

      const updated = await prisma.document.findUnique({
        where: { id: document.id }
      });

      expect(updated).toMatchObject({
        title: 'Editable Note',  // Title unchanged
        content: 'Updated markdown',
        htmlContent: '<p>Original HTML</p>' // HTML unchanged
      });
    });

    it('should update title only when explicitly provided', async () => {
      const document = await prisma.document.create({
        data: {
          title: 'Original Title',
          content: '# Different H1\n\nContent'
        }
      });

      // Update content only
      await request(app)
        .put(`/api/notes/${document.id}`)
        .send({ content: '# New H1\n\nNew content' })
        .expect(200);

      const afterContentUpdate = await prisma.document.findUnique({
        where: { id: document.id }
      });

      // Title should NOT change (no auto-extraction)
      expect(afterContentUpdate.title).toBe('Original Title');

      // Update title explicitly
      await request(app)
        .put(`/api/notes/${document.id}`)
        .send({ title: 'Explicit New Title' })
        .expect(200);

      const afterTitleUpdate = await prisma.document.findUnique({
        where: { id: document.id }
      });

      expect(afterTitleUpdate.title).toBe('Explicit New Title');
    });
  });
});
```

#### **Test File 2: XSS Protection Tests**

```typescript
// packages/backend/src/utils/__tests__/html-sanitizer.test.ts

describe('HTML Sanitizer', () => {
  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script><p>Safe content</p>';
      const result = sanitizeHtml(input);
      
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Safe content</p>');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(1)">Click me</div>';
      const result = sanitizeHtml(input);
      
      expect(result).not.toContain('onclick');
      expect(result).toContain('<div>Click me</div>');
    });

    it('should allow safe HTML tags', () => {
      const safeHtml = `
        <h1>Title</h1>
        <h2>Subtitle</h2>
        <p>Paragraph with <strong>bold</strong> and <em>italic</em></p>
        <ul><li>List item</li></ul>
        <blockquote>Quote</blockquote>
        <code>inline code</code>
        <pre><code>code block</code></pre>
      `;
      
      const result = sanitizeHtml(safeHtml);
      
      expect(result).toContain('<h1>Title</h1>');
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<em>italic</em>');
      expect(result).toContain('<ul><li>List item</li></ul>');
      expect(result).toContain('<blockquote>Quote</blockquote>');
      expect(result).toContain('<code>inline code</code>');
    });

    it('should remove dangerous attributes but keep safe ones', () => {
      const input = '<a href="https://example.com" onclick="alert(1)" target="_blank">Link</a>';
      const result = sanitizeHtml(input);
      
      expect(result).toContain('href="https://example.com"');
      expect(result).not.toContain('onclick');
      expect(result).toContain('target="_blank"');
    });

    it('should handle malformed HTML gracefully', () => {
      const input = '<div><p>Unclosed div<script>evil()</script>';
      const result = sanitizeHtml(input);
      
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Unclosed div</p>');
    });
  });
});
```

#### **Test File 3: Integration Tests**

```typescript
// packages/backend/src/__tests__/html-sharing-integration.test.ts

describe('HTML Sharing Integration', () => {
  it('should support complete workflow: share -> view -> edit', async () => {
    // 1. Share note with HTML
    const shareResponse = await request(app)
      .post('/api/notes/share')
      .send({
        title: 'Integration Test Note',
        content: '# Integration Test\n\nMarkdown content',
        htmlContent: '<h1>Integration Test</h1><p>HTML content</p>'
      });

    const { shareId } = shareResponse.body;

    // 2. Retrieve for viewing (should get HTML)
    const viewResponse = await request(app)
      .get(`/api/notes/${shareId}`)
      .expect(200);

    expect(viewResponse.body).toMatchObject({
      htmlContent: '<h1>Integration Test</h1><p>HTML content</p>',
      renderMode: 'html'
    });

    // 3. Edit (should work with markdown)
    await request(app)
      .put(`/api/notes/${shareId}`)
      .send({ content: 'Updated markdown content' })
      .expect(200);

    // 4. Verify edit worked
    const afterEdit = await request(app)
      .get(`/api/notes/${shareId}`)
      .expect(200);

    expect(afterEdit.body).toMatchObject({
      content: 'Updated markdown content',
      htmlContent: '<h1>Integration Test</h1><p>HTML content</p>' // HTML preserved
    });
  });

  it('should maintain My Links functionality with proper titles', async () => {
    // Create multiple notes with explicit titles
    const notes = await Promise.all([
      request(app).post('/api/notes/share').send({
        title: 'First Note',
        content: '# Different Title\nContent 1'
      }),
      request(app).post('/api/notes/share').send({
        title: 'Second Note', 
        content: '# Another Title\nContent 2'
      })
    ]);

    // Get notes list (My Links)
    const listResponse = await request(app)
      .get('/api/notes')
      .expect(200);

    expect(listResponse.body.shares).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'First Note' }),
        expect.objectContaining({ title: 'Second Note' })
      ])
    );
  });
});
```

### **1.2 Database Migration (Minimal)**

```sql
-- packages/backend/prisma/migrations/[timestamp]_add_html_support/migration.sql

-- Add only essential columns, no new tables
ALTER TABLE "Document" 
ADD COLUMN "htmlContent" TEXT,
ADD COLUMN "renderMode" VARCHAR(20) DEFAULT 'markdown';

-- Create index for performance
CREATE INDEX "Document_renderMode_idx" ON "Document"("renderMode");
```

### **1.3 Implement HTML Sanitization**

```typescript
// packages/backend/src/utils/html-sanitizer.ts

import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'div', 'span',
  'strong', 'b', 'em', 'i', 'u', 'del', 's',
  'ul', 'ol', 'li',
  'blockquote', 'q',
  'code', 'pre',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'sup', 'sub'
];

const ALLOWED_ATTRIBUTES = {
  'a': ['href', 'target', 'rel'],
  'img': ['src', 'alt', 'width', 'height'],
  'td': ['colspan', 'rowspan'],
  'th': ['colspan', 'rowspan'],
  '*': ['class', 'id'] // Allow class/id for styling
};

export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTRIBUTES,
    FORBID_SCRIPT: true,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: [
      'onclick', 'onerror', 'onload', 'onmouseover', 'onfocus',
      'onblur', 'onchange', 'onsubmit', 'style' // Remove inline styles
    ]
  });
}
```

### **1.4 Minimal Backend Implementation**

```typescript
// packages/backend/src/services/notesService.ts - MODIFY EXISTING

import { sanitizeHtml } from '../utils/html-sanitizer';

// MODIFY createSharedNote (don't add new function)
export async function createSharedNote(data: NoteData, customId?: string) {
  // Title is now REQUIRED
  if (!data.title) {
    throw new ValidationError('Title is required and must be provided explicitly');
  }

  // Sanitize HTML if provided
  const sanitizedHtml = data.htmlContent ? sanitizeHtml(data.htmlContent) : null;

  const document = await prisma.document.create({
    data: {
      id: customId,
      title: data.title, // Use provided title, no extraction
      content: data.content || '',
      htmlContent: sanitizedHtml,
      renderMode: sanitizedHtml ? 'html' : 'markdown',
      metadata: {
        ...data.metadata,
        source: data.htmlContent ? 'obsidian-share-note' : 'obsidian-plugin',
        createdVia: 'api'
      }
    }
  });

  return {
    shareId: document.id,
    collaborativeUrl: generateCollaborativeUrl(document.id),
    viewUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/view/${document.id}`,
    title: document.title
  };
}

// MODIFY getSharedNote to include HTML
export async function getSharedNote(shareId: string) {
  const document = await prisma.document.findUnique({
    where: { id: shareId }
  });

  if (!document) {
    throw new NotFoundError('Shared note not found');
  }

  return {
    shareId: document.id,
    title: document.title,
    content: document.content,
    htmlContent: document.htmlContent,
    renderMode: document.renderMode || 'markdown',
    createdAt: document.publishedAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    permissions: 'edit',
    collaborativeUrl: generateCollaborativeUrl(document.id),
    viewUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/view/${document.id}`
  };
}

// MODIFY updateSharedNote - REMOVE auto title extraction
export async function updateSharedNote(shareId: string, updates: NoteData) {
  const document = await prisma.document.findUnique({
    where: { id: shareId }
  });

  if (!document) {
    throw new NotFoundError('Shared note not found');
  }

  const updateData: any = {
    updatedAt: new Date()
  };

  // Update content without touching title
  if (updates.content !== undefined) {
    updateData.content = updates.content;
    // REMOVED: automatic title extraction
  }

  // Only update title if explicitly provided
  if (updates.title !== undefined) {
    updateData.title = updates.title;
  }

  // Update HTML if provided
  if (updates.htmlContent !== undefined) {
    updateData.htmlContent = updates.htmlContent ? sanitizeHtml(updates.htmlContent) : null;
    updateData.renderMode = updates.htmlContent ? 'html' : 'markdown';
  }

  const updated = await prisma.document.update({
    where: { id: shareId },
    data: updateData
  });

  return {
    success: true,
    updatedAt: updated.updatedAt.toISOString()
  };
}
```

### **1.5 Update Types**

```typescript
// packages/backend/src/utils/validation.ts - ADD htmlContent

export const noteShareSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(), // Now required
  content: Joi.string().min(1).max(1000000).required(),
  htmlContent: Joi.string().max(5000000).optional(), // Allow larger HTML
  metadata: Joi.object().optional()
});

export const noteUpdateSchema = Joi.object({
  content: Joi.string().min(1).max(1000000).optional(),
  title: Joi.string().min(1).max(255).optional(),
  htmlContent: Joi.string().max(5000000).optional()
});
```

---

## **Phase 2: Test-Driven Plugin Development (Week 2)**

### **2.1 Plugin Test Suite**

```typescript
// obsidian-plugin/__tests__/share-html.test.ts

describe('HTML Sharing Plugin', () => {
  let plugin: ShareNotePlugin;
  let mockApp: any;
  let mockVault: any;

  beforeEach(() => {
    mockVault = {
      read: jest.fn(),
      modify: jest.fn()
    };
    mockApp = {
      vault: mockVault,
      workspace: {
        getActiveFile: jest.fn(),
        getActiveViewOfType: jest.fn()
      },
      metadataCache: {
        getFileCache: jest.fn()
      }
    };
    plugin = new ShareNotePlugin(mockApp, {} as any);
  });

  describe('shareNoteWithHtml', () => {
    it('should use filename as title', async () => {
      const mockFile = { 
        basename: 'My Important Note',
        path: 'My Important Note.md' 
      };
      const mockContent = '# Different Title\n\nNote content here.';
      
      mockVault.read.mockResolvedValue(mockContent);
      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);

      // Mock HTML rendering
      const mockHTML = '<h1>Different Title</h1><p>Note content here.</p>';
      jest.spyOn(plugin, 'renderToHTML').mockResolvedValue(mockHTML);

      // Mock API call
      const mockResponse = {
        shareId: 'test-123',
        viewUrl: 'https://backend.com/view/test-123',
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
      const mockFile = { basename: 'Test Note', path: 'Test Note.md' };
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

      mockVault.read.mockResolvedValue(mockContent);
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
            return [];
          })
        })
      };

      // Test the cleaning logic
      const cleanedHTML = plugin.cleanHTML(mockElement);
      
      expect(cleanedHTML).not.toContain('internal-link');
      expect(cleanedHTML).toContain('https://example.com');
    });

    it('should update frontmatter with share URLs', async () => {
      const mockFile = { basename: 'Test', path: 'Test.md' };
      const originalContent = '---\ntags: [test]\n---\n# Test\n\nContent';
      const expectedContent = `---
tags: [test]
share_id: test-123
share_url: https://backend.com/view/test-123
edit_url: https://backend.com/editor/test-123
shared_at: 2024-01-01T00:00:00.000Z
---
# Test

Content`;

      mockVault.read.mockResolvedValue(originalContent);
      mockVault.modify.mockResolvedValue(undefined);
      
      const mockDate = new Date('2024-01-01T00:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const shareResult = {
        shareId: 'test-123',
        viewUrl: 'https://backend.com/view/test-123',
        editUrl: 'https://backend.com/editor/test-123'
      };

      await plugin.updateFrontmatter(mockFile, shareResult);

      expect(mockVault.modify).toHaveBeenCalledWith(mockFile, expectedContent);
    });
  });

  describe('API Integration', () => {
    it('should handle backend errors gracefully', async () => {
      const mockFile = { basename: 'Test', path: 'Test.md' };
      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockVault.read.mockResolvedValue('# Test\n\nContent');
      
      // Mock API error
      jest.spyOn(plugin.api, 'shareNote').mockRejectedValue(
        new Error('Backend unavailable')
      );

      // Mock Notice
      const mockNotice = jest.fn();
      global.Notice = mockNotice;

      await plugin.shareCurrentNote();

      expect(mockNotice).toHaveBeenCalledWith(
        expect.stringContaining('Failed to share')
      );
    });

    it('should validate response from backend', async () => {
      const mockFile = { basename: 'Test', path: 'Test.md' };
      mockApp.workspace.getActiveFile.mockReturnValue(mockFile);
      mockVault.read.mockResolvedValue('# Test');

      // Mock invalid response
      jest.spyOn(plugin.api, 'shareNote').mockResolvedValue({
        // Missing required fields
      });

      await expect(plugin.shareCurrentNote()).rejects.toThrow();
    });
  });
});
```

### **2.2 Replace Current Plugin with TDD Implementation**

```bash
# Remove current plugin
rm -rf obsidian-plugin/src/
rm -rf obsidian-plugin/__tests__/

# Create new structure
mkdir -p obsidian-plugin/src
mkdir -p obsidian-plugin/__tests__
```

```typescript
// obsidian-plugin/src/main.ts - TDD Implementation

export default class ShareNotePlugin extends Plugin {
  settings: ShareNoteSettings;
  api: BackendAPI;

  async onload() {
    await this.loadSettings();
    this.api = new BackendAPI(this.settings.backendUrl);

    this.addCommand({
      id: 'share-note-html',
      name: 'Share note as HTML',
      callback: () => this.shareCurrentNote()
    });

    this.addSettingTab(new ShareNoteSettingTab(this.app, this));
  }

  async shareCurrentNote(): Promise<void> {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice('No active file to share');
      return;
    }

    try {
      // Get markdown content
      const content = await this.app.vault.read(file);
      
      // Render to HTML
      const html = await this.renderToHTML();
      
      // Share to backend
      const result = await this.api.shareNote({
        title: file.basename, // Use filename as title
        content,
        htmlContent: html
      });

      // Update frontmatter
      await this.updateFrontmatter(file, {
        share_id: result.shareId,
        share_url: result.viewUrl,
        edit_url: result.editUrl,
        shared_at: new Date().toISOString()
      });

      if (this.settings.copyToClipboard) {
        await navigator.clipboard.writeText(result.viewUrl);
      }

      new Notice('Note shared successfully!');
      
    } catch (error) {
      new Notice(`Failed to share: ${error.message}`);
      throw error; // Re-throw for tests
    }
  }

  async renderToHTML(): Promise<string> {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return '';

    // Switch to preview mode
    await view.setViewState({
      ...view.getState(),
      mode: 'preview'
    });

    // Get rendered HTML
    const previewEl = view.previewMode.containerEl
      .querySelector('.markdown-preview-view');
    
    if (!previewEl) return '';

    return this.cleanHTML(previewEl);
  }

  cleanHTML(element: Element): string {
    const clone = element.cloneNode(true) as HTMLElement;
    
    // Remove frontmatter
    clone.querySelectorAll('.frontmatter').forEach(el => el.remove());
    
    // Convert internal links to plain text
    clone.querySelectorAll('a.internal-link').forEach(link => {
      const span = document.createElement('span');
      span.textContent = link.textContent;
      span.className = 'internal-link-text';
      link.replaceWith(span);
    });

    // Remove edit buttons and other UI elements
    clone.querySelectorAll('.edit-block-button').forEach(el => el.remove());

    return clone.innerHTML;
  }

  async updateFrontmatter(file: TFile, data: any): Promise<void> {
    const content = await this.app.vault.read(file);
    const cache = this.app.metadataCache.getFileCache(file);
    const frontmatter = cache?.frontmatter || {};

    // Merge data
    Object.assign(frontmatter, data);

    // Rebuild file content
    let body = content;
    if (cache?.frontmatterPosition) {
      body = content.slice(cache.frontmatterPosition.end.offset + 1);
    }

    const yamlLines = Object.entries(frontmatter)
      .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);

    const newContent = `---\n${yamlLines.join('\n')}\n---\n${body}`;
    await this.app.vault.modify(file, newContent);
  }
}
```

### **2.3 Backend API Client**

```typescript
// obsidian-plugin/src/api.ts

export interface ShareRequest {
  title: string;
  content: string;
  htmlContent: string;
}

export interface ShareResponse {
  shareId: string;
  viewUrl: string;
  editUrl: string;
  title: string;
}

export class BackendAPI {
  constructor(private baseUrl: string) {}

  async shareNote(data: ShareRequest): Promise<ShareResponse> {
    const response = await fetch(`${this.baseUrl}/api/notes/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    
    // Validate response
    if (!result.shareId || !result.viewUrl) {
      throw new Error('Invalid response from backend');
    }

    return result;
  }

  async deleteShare(shareId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/notes/${shareId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Failed to delete: ${response.statusText}`);
    }
  }
}
```

---

## **Phase 3: Frontend View Mode (Week 2)**

### **3.1 Frontend Tests**

```typescript
// packages/frontend/src/pages/__tests__/ViewPage.test.tsx

describe('ViewPage', () => {
  it('should render HTML content when available', async () => {
    const mockDocument = {
      id: 'test-123',
      title: 'Test Note',
      content: '# Test\n\nMarkdown',
      htmlContent: '<h1>Test</h1><p>HTML content</p>',
      renderMode: 'html',
      viewUrl: '/view/test-123',
      editUrl: '/editor/test-123'
    };

    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDocument)
    });

    render(
      <MemoryRouter initialEntries={['/view/test-123']}>
        <Routes>
          <Route path="/view/:shareId" element={<ViewPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Note')).toBeInTheDocument();
    });

    // Should render HTML, not markdown
    expect(document.querySelector('.html-content')).toBeInTheDocument();
    expect(document.querySelector('.html-content')?.innerHTML)
      .toContain('<h1>Test</h1><p>HTML content</p>');
  });

  it('should sanitize HTML content for security', async () => {
    const mockDocument = {
      title: 'XSS Test',
      htmlContent: '<script>alert("xss")</script><p>Safe content</p>',
      renderMode: 'html'
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDocument)
    });

    render(
      <MemoryRouter initialEntries={['/view/test-123']}>
        <Routes>
          <Route path="/view/:shareId" element={<ViewPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Safe content')).toBeInTheDocument();
    });

    // Should not contain script tags
    expect(document.querySelector('script')).not.toBeInTheDocument();
  });

  it('should show edit button that links to collaborative editor', async () => {
    const mockDocument = {
      title: 'Editable Note',
      htmlContent: '<p>Content</p>',
      editUrl: '/editor/test-123'
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDocument)
    });

    render(
      <MemoryRouter initialEntries={['/view/test-123']}>
        <Routes>
          <Route path="/view/:shareId" element={<ViewPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      const editButton = screen.getByText('Edit');
      expect(editButton).toBeInTheDocument();
      expect(editButton.closest('a')).toHaveAttribute('href', '/editor/test-123');
    });
  });
});
```

### **3.2 View Page Implementation**

```typescript
// packages/frontend/src/pages/ViewPage.tsx

export function ViewPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareId) return;

    fetch(`/api/notes/${shareId}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(setDocument)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [shareId]);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!document) return <div className="error">Document not found</div>;

  return (
    <div className="view-page">
      <header className="view-header">
        <h1>{document.title}</h1>
        <div className="view-actions">
          <Link 
            to={`/editor/${shareId}`}
            className="btn btn-primary"
          >
            Edit
          </Link>
        </div>
      </header>

      <main className="view-content">
        {document.renderMode === 'html' && document.htmlContent ? (
          <div 
            className="html-content"
            dangerouslySetInnerHTML={{ 
              __html: sanitizeHTML(document.htmlContent) 
            }}
          />
        ) : (
          <div className="markdown-content">
            <ReactMarkdown>{document.content}</ReactMarkdown>
          </div>
        )}
      </main>
    </div>
  );
}

// Client-side HTML sanitization as backup
function sanitizeHTML(html: string): string {
  // Use DOMPurify for client-side sanitization as additional security
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: ['class', 'id'],
    FORBID_SCRIPT: true
  });
}
```

---

## **Phase 4: CI/CD Pipeline Setup (Week 1)**

### **4.1 Enhanced GitHub Actions Workflow**

```yaml
# .github/workflows/test-and-deploy.yml

name: Test and Deploy

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '18'

jobs:
  test-backend:
    name: Backend Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: obsidian_comments_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: packages/backend/package-lock.json

      - name: Install backend dependencies
        working-directory: packages/backend
        run: npm ci

      - name: Run database migrations
        working-directory: packages/backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/obsidian_comments_test
        run: npx prisma migrate deploy

      - name: Run backend unit tests
        working-directory: packages/backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/obsidian_comments_test
          NODE_ENV: test
        run: npm run test:unit

      - name: Run backend integration tests
        working-directory: packages/backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/obsidian_comments_test
          NODE_ENV: test
        run: npm run test:integration

      - name: HTML Sanitization Security Tests
        working-directory: packages/backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/obsidian_comments_test
        run: npm run test -- --testPathPattern=html-sanitizer

  test-frontend:
    name: Frontend Tests
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: packages/frontend/package-lock.json

      - name: Install frontend dependencies
        working-directory: packages/frontend
        run: npm ci

      - name: Run frontend tests
        working-directory: packages/frontend
        run: npm test -- --coverage --watchAll=false

      - name: Build frontend
        working-directory: packages/frontend
        run: npm run build

  test-plugin:
    name: Plugin Tests
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: obsidian-plugin/package-lock.json

      - name: Install plugin dependencies
        working-directory: obsidian-plugin
        run: npm ci

      - name: Run plugin tests
        working-directory: obsidian-plugin
        run: npm test

      - name: Build plugin
        working-directory: obsidian-plugin
        run: npm run build

  integration-tests:
    name: End-to-End Integration
    runs-on: ubuntu-latest
    needs: [test-backend, test-frontend]
    if: github.event_name == 'push' || github.event.pull_request.base.ref == 'main'
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: obsidian_comments_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install root dependencies
        run: npm ci

      - name: Setup test environment
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/obsidian_comments_test
        run: |
          cd packages/backend
          npm ci
          npx prisma migrate deploy
          npm run build
          cd ../frontend
          npm ci
          npm run build

      - name: Start services
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/obsidian_comments_test
          PORT: 3001
          FRONTEND_URL: http://localhost:5173
        run: |
          cd packages/backend && npm start &
          cd packages/frontend && npm run preview &
          sleep 10

      - name: Run integration tests
        env:
          BACKEND_URL: http://localhost:3001
          FRONTEND_URL: http://localhost:5173
        run: npm run test:e2e

  security-audit:
    name: Security Audit
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Run npm audit (Backend)
        working-directory: packages/backend
        run: npm audit --audit-level=high

      - name: Run npm audit (Frontend) 
        working-directory: packages/frontend
        run: npm audit --audit-level=high

      - name: Run npm audit (Plugin)
        working-directory: obsidian-plugin
        run: npm audit --audit-level=high

      - name: Check for XSS vulnerabilities in HTML sanitizer
        working-directory: packages/backend
        run: npm run test -- --testNamePattern="XSS|sanitize" --verbose

  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [test-backend, test-frontend, test-plugin, integration-tests]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to server
        env:
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
          DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
        run: |
          echo "$DEPLOY_KEY" > deploy_key
          chmod 600 deploy_key
          
          # Deploy backend with zero-downtime
          ssh -i deploy_key -o StrictHostKeyChecking=no $DEPLOY_USER@$DEPLOY_HOST << 'EOF'
            cd /var/www/obsidian-comments
            git pull origin main
            
            # Run tests on production server before deployment
            cd packages/backend
            npm ci --production=false
            npm run test:unit
            
            # If tests pass, proceed with deployment
            npm ci --production
            npx prisma migrate deploy
            pm2 reload backend
            
            # Health check
            sleep 5
            curl -f http://localhost:3001/health || exit 1
          EOF
          
          rm deploy_key

  plugin-release:
    name: Release Plugin
    runs-on: ubuntu-latest
    needs: [test-plugin, integration-tests]
    if: github.ref == 'refs/heads/main' && contains(github.event.head_commit.message, 'release:')
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Build plugin release
        working-directory: obsidian-plugin
        run: |
          npm ci
          npm run build
          npm run release

      - name: Create GitHub Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          cd obsidian-plugin
          VERSION=$(node -p "require('./manifest.json').version")
          
          gh release create "v$VERSION" \
            --title "Plugin v$VERSION" \
            --notes-file CHANGELOG.md \
            main.js manifest.json styles.css
```

### **4.2 Package.json Scripts**

```json
// packages/backend/package.json - Add test scripts

{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathIgnorePatterns=integration",
    "test:integration": "jest --testPathPattern=integration",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### **4.3 Pre-commit Hooks**

```yaml
# .github/workflows/pre-commit.yml

name: Pre-commit Checks

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  pre-commit:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Quick tests (changed files only)
        run: |
          # Run tests only for changed files
          CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD)
          
          if echo "$CHANGED_FILES" | grep -q "packages/backend/"; then
            cd packages/backend
            npm ci
            npm run test:unit
          fi
          
          if echo "$CHANGED_FILES" | grep -q "obsidian-plugin/"; then
            cd obsidian-plugin
            npm ci
            npm test
          fi
```

---

## **Implementation Timeline (3 Weeks Total)**

### **Week 1: Backend + Tests**
- **Day 1**: Write all backend tests (failing)
- **Day 2**: Database migration + HTML sanitizer
- **Day 3**: Implement minimal backend changes
- **Day 4**: All backend tests passing
- **Day 5**: CI/CD pipeline setup

### **Week 2: Plugin + Frontend**  
- **Day 1**: Write plugin tests (failing)
- **Day 2**: Implement simplified plugin
- **Day 3**: Frontend view page + tests
- **Day 4**: All tests passing
- **Day 5**: Integration testing

### **Week 3: Integration + Deployment**
- **Day 1-2**: End-to-end testing
- **Day 3**: Security audit + XSS testing  
- **Day 4**: Performance testing
- **Day 5**: Production deployment

---

## **Key Success Criteria**

✅ **Zero Breaking Changes**: Existing collaboration features work unchanged  
✅ **Security First**: All HTML is sanitized, XSS tests passing  
✅ **Title = Filename**: No smart extraction, manual title changes only  
✅ **Test Coverage**: >90% coverage, all tests in CI/CD  
✅ **Text Only**: No file uploads, simplified implementation  
✅ **Minimal Backend**: Only essential changes to existing API  

This TDD approach ensures we build exactly what's needed, with comprehensive testing and security built-in from day one.