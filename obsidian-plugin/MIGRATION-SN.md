🚀 MVP Implementation Plan: ShareNote + ObsidianComments Backend

  MVP Scope Definition

  What We're Building (MVP)

  - ✅ ShareNote plugin sends HTML-rendered notes to your backend
  - ✅ Backend stores both HTML (for viewing) and Markdown (for editing)
  - ✅ Title = Filename (no smart extraction, no auto-updates)
  - ✅ Basic attachment/image upload support
  - ✅ My Links pane shows shared notes with proper titles
  - ✅ View mode with perfect Obsidian rendering
  - ✅ Edit mode with existing collaborative editor

  What We're NOT Building (MVP)

  - ❌ Encryption functionality
  - ❌ CSS theme uploads (use default styling for now)
  - ❌ Attachment deduplication via hashing
  - ❌ Note expiration
  - ❌ Complex permission systems

  ---
  Stage 1: Backend Changes (Week 1)

  1.1 Remove Smart Title Extraction

⏺ Update Todos
  ⎿  ☒ Define MVP scope for ShareNote integration
     ☐ Plan backend changes for MVP
     ☐ Plan plugin modifications for MVP
     ☐ Define title handling strategy
     ☐ Create implementation timeline

⏺ Backend File Changes Required

  1. packages/backend/src/services/notesService.ts

  // REMOVE the extractTitleFromMarkdown function entirely
  // DELETE lines 10-77 (the entire extraction logic)

  // MODIFY createSharedNote function:
  export async function createSharedNote(data: NoteData, customId?: string) {
    // Title MUST be provided explicitly, no extraction
    if (!data.title) {
      throw new ValidationError('Title is required');
    }

    const document = await prisma.document.create({
      data: {
        id: customId || cuid(),
        title: data.title,  // Use provided title as-is
        content: data.content || '',
        metadata: {
          ...data.metadata,
          source: 'obsidian-share-note',
          createdVia: 'api'
        }
      }
    });

    return {
      shareId: document.id,
      collaborativeUrl: generateCollaborativeUrl(document.id),
      title: document.title
    };
  }

  // MODIFY updateSharedNote - Remove automatic title extraction:
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

    if (updates.content !== undefined) {
      updateData.content = updates.content;
      // DO NOT extract title from content anymore
    }

    if (updates.title !== undefined) {
      updateData.title = updates.title;  // Only update if explicitly provided
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

  2. Add HTML Support - Database Schema

  -- packages/backend/prisma/migrations/[timestamp]_add_html_support.sql
  ALTER TABLE "Document"
  ADD COLUMN "htmlContent" TEXT,
  ADD COLUMN "renderMode" VARCHAR(20) DEFAULT 'markdown';

  -- Simple attachment support
  CREATE TABLE "Attachment" (
    "id" TEXT PRIMARY KEY DEFAULT cuid(),
    "documentId" TEXT REFERENCES "Document"("id") ON DELETE CASCADE,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT,
    "url" TEXT NOT NULL,
    "size" INTEGER,
    "createdAt" TIMESTAMP DEFAULT NOW()
  );

  3. New API Endpoint for Rich Sharing

  // packages/backend/src/routes/notes.ts - ADD new endpoint:

  // POST /api/notes/share-html - Share with HTML rendering
  router.post('/share-html', async (req, res, next) => {
    try {
      const { title, markdown, html, attachments } = req.body;

      // Validation
      if (!title || !markdown) {
        return res.status(400).json({
          error: 'Title and markdown content are required'
        });
      }

      const result = await createHtmlNote({
        title,        // Filename from Obsidian
        content: markdown,  // Original markdown
        htmlContent: html,  // Rendered HTML
        attachments: attachments || []
      });

      res.status(201).json({
        shareId: result.shareId,
        viewUrl: `${process.env.FRONTEND_URL}/view/${result.shareId}`,
        editUrl: `${process.env.FRONTEND_URL}/editor/${result.shareId}`,
        title: result.title
      });
    } catch (error) {
      next(error);
    }
  });

  // GET /api/notes/:shareId - MODIFY to return HTML when available
  router.get('/:shareId', async (req, res, next) => {
    try {
      const { shareId } = validateShareId(req.params);
      const document = await getSharedNote(shareId);

      res.json({
        shareId: document.id,
        title: document.title,
        content: document.content,        // Markdown for editing
        htmlContent: document.htmlContent, // HTML for viewing
        renderMode: document.renderMode,
        createdAt: document.publishedAt,
        updatedAt: document.updatedAt,
        viewUrl: `${process.env.FRONTEND_URL}/view/${document.id}`,
        editUrl: `${process.env.FRONTEND_URL}/editor/${document.id}`
      });
    } catch (error) {
      next(error);
    }
  });

  4. Service Function for HTML Notes

  // packages/backend/src/services/notesService.ts - ADD:

  export async function createHtmlNote(data: {
    title: string;
    content: string;
    htmlContent?: string;
    attachments?: any[];
  }) {
    // Create document with both markdown and HTML
    const document = await prisma.document.create({
      data: {
        title: data.title,  // No extraction, use as-is
        content: data.content,
        htmlContent: data.htmlContent || null,
        renderMode: data.htmlContent ? 'html' : 'markdown',
        metadata: {
          source: 'obsidian-share-note',
          hasHtml: !!data.htmlContent
        }
      }
    });

    // Store attachments if provided
    if (data.attachments && data.attachments.length > 0) {
      await Promise.all(
        data.attachments.map(att =>
          prisma.attachment.create({
            data: {
              documentId: document.id,
              filename: att.filename,
              url: att.url,
              mimeType: att.mimeType,
              size: att.size
            }
          })
        )
      );
    }

    return {
      shareId: document.id,
      title: document.title
    };
  }

  5. Simple Attachment Upload Endpoint

  // packages/backend/src/routes/attachments.ts - NEW FILE:

  import { Router } from 'express';
  import multer from 'multer';
  import path from 'path';
  import { v4 as uuidv4 } from 'uuid';

  const router = Router();

  // Configure multer for file uploads
  const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
      const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  });

  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  // POST /api/attachments/upload
  router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const fileUrl = `${process.env.BACKEND_URL}/uploads/${req.file.filename}`;

    res.json({
      url: fileUrl,
      filename: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype
    });
  });

  export { router as attachmentsRouter };

  // Add to app.ts:
  // app.use('/api/attachments', attachmentsRouter);
  // app.use('/uploads', express.static('uploads'));

  ---
  Stage 2: ShareNote Plugin Modifications (Week 1-2)

  2.1 Fork and Setup

  # Fork https://github.com/alangrainger/share-note
  # Clone to obsidian-plugin directory
  git clone [your-fork] obsidian-share-note
  cd obsidian-share-note
  npm install

  2.2 Core Plugin Changes

  1. Settings Configuration

  // src/settings.ts - REPLACE with:

  export interface ShareNoteSettings {
    backendUrl: string;
    showNotifications: boolean;
    copyToClipboard: boolean;
    openInBrowser: boolean;
  }

  export const DEFAULT_SETTINGS: ShareNoteSettings = {
    backendUrl: 'https://obsidiancomments.serverado.app',
    showNotifications: true,
    copyToClipboard: true,
    openInBrowser: false
  }

  export class ShareNoteSettingTab extends PluginSettingTab {
    plugin: ShareNotePlugin;

    constructor(app: App, plugin: ShareNotePlugin) {
      super(app, plugin);
      this.plugin = plugin;
    }

    display(): void {
      const { containerEl } = this;
      containerEl.empty();

      new Setting(containerEl)
        .setName('Backend URL')
        .setDesc('Your ObsidianComments backend server')
        .addText(text => text
          .setPlaceholder('https://obsidiancomments.serverado.app')
          .setValue(this.plugin.settings.backendUrl)
          .onChange(async (value) => {
            this.plugin.settings.backendUrl = value;
            await this.plugin.saveSettings();
          }));

      new Setting(containerEl)
        .setName('Copy link to clipboard')
        .addToggle(toggle => toggle
          .setValue(this.plugin.settings.copyToClipboard)
          .onChange(async (value) => {
            this.plugin.settings.copyToClipboard = value;
            await this.plugin.saveSettings();
          }));
    }
  }

  2. API Integration

  // src/api.ts - NEW SIMPLIFIED VERSION:

  export class BackendAPI {
    constructor(private settings: ShareNoteSettings) {}

    async shareNote(data: {
      title: string;
      markdown: string;
      html: string;
      attachments: Array<{ url: string; filename: string }>;
    }): Promise<ShareResult> {
      const response = await fetch(`${this.settings.backendUrl}/api/notes/share-html`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Failed to share: ${response.statusText}`);
      }

      return await response.json();
    }

    async uploadAttachment(file: File): Promise<{ url: string }> {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.settings.backendUrl}/api/attachments/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Failed to upload: ${response.statusText}`);
      }

      return await response.json();
    }

    async deleteShare(shareId: string): Promise<void> {
      await fetch(`${this.settings.backendUrl}/api/notes/${shareId}`, {
        method: 'DELETE'
      });
    }
  }

  3. Note Processing (Simplified)

  // src/note.ts - SIMPLIFIED VERSION:

  export class Note {
    constructor(
      private app: App,
      private file: TFile,
      private settings: ShareNoteSettings
    ) {}

    async process(): Promise<ProcessedNote> {
      // Get markdown content
      const markdown = await this.app.vault.read(this.file);

      // Get HTML from preview
      const html = await this.getRenderedHTML();

      // Process attachments
      const attachments = await this.processAttachments(html);

      return {
        title: this.file.basename,  // Use filename as title
        markdown,
        html,
        attachments
      };
    }

    private async getRenderedHTML(): Promise<string> {
      // Switch to preview mode
      const leaf = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!leaf) return '';

      await leaf.setViewState({
        ...leaf.getState(),
        mode: 'preview'
      });

      // Get preview element
      const previewEl = leaf.previewMode.containerEl.querySelector('.markdown-preview-view');
      if (!previewEl) return '';

      // Clone and clean HTML
      const clone = previewEl.cloneNode(true) as HTMLElement;

      // Remove frontmatter
      clone.querySelectorAll('.frontmatter').forEach(el => el.remove());

      // Convert internal links to text
      clone.querySelectorAll('a.internal-link').forEach(link => {
        const span = document.createElement('span');
        span.textContent = link.textContent;
        link.replaceWith(span);
      });

      return clone.innerHTML;
    }

    private async processAttachments(html: string): Promise<Attachment[]> {
      const attachments: Attachment[] = [];
      const imgRegex = /<img[^>]+src="([^"]+)"/g;
      let match;

      while ((match = imgRegex.exec(html)) !== null) {
        const src = match[1];

        // Skip external URLs
        if (src.startsWith('http')) continue;

        // Handle local images
        const file = this.app.vault.getAbstractFileByPath(src);
        if (file instanceof TFile) {
          const arrayBuffer = await this.app.vault.readBinary(file);
          const blob = new Blob([arrayBuffer]);
          const uploadedFile = new File([blob], file.name);

          // Upload to backend
          const api = new BackendAPI(this.settings);
          const result = await api.uploadAttachment(uploadedFile);

          attachments.push({
            originalPath: src,
            url: result.url,
            filename: file.name
          });
        }
      }

      return attachments;
    }
  }

  4. Main Plugin File

  // src/main.ts - SIMPLIFIED VERSION:

  export default class ShareNotePlugin extends Plugin {
    settings: ShareNoteSettings;
    api: BackendAPI;

    async onload() {
      await this.loadSettings();
      this.api = new BackendAPI(this.settings);

      // Add command
      this.addCommand({
        id: 'share-note',
        name: 'Share note to ObsidianComments',
        callback: () => this.shareCurrentNote()
      });

      // Add context menu
      this.registerEvent(
        this.app.workspace.on('file-menu', (menu, file) => {
          if (file instanceof TFile && file.extension === 'md') {
            menu.addItem((item) => {
              item
                .setTitle('Share to ObsidianComments')
                .setIcon('share')
                .onClick(() => this.shareNote(file));
            });
          }
        })
      );

      // Settings tab
      this.addSettingTab(new ShareNoteSettingTab(this.app, this));
    }

    async shareCurrentNote() {
      const file = this.app.workspace.getActiveFile();
      if (!file) {
        new Notice('No active file');
        return;
      }
      await this.shareNote(file);
    }

    async shareNote(file: TFile) {
      try {
        // Process note
        const note = new Note(this.app, file, this.settings);
        const processed = await note.process();

        // Share to backend
        const result = await this.api.shareNote(processed);

        // Update frontmatter
        await this.updateFrontmatter(file, {
          share_id: result.shareId,
          share_url: result.viewUrl,
          edit_url: result.editUrl,
          shared_at: new Date().toISOString()
        });

        // Copy to clipboard
        if (this.settings.copyToClipboard) {
          await navigator.clipboard.writeText(result.viewUrl);
          new Notice('Share link copied!');
        }

        // Open in browser
        if (this.settings.openInBrowser) {
          window.open(result.viewUrl);
        }

      } catch (error) {
        new Notice(`Failed to share: ${error.message}`);
      }
    }

    async updateFrontmatter(file: TFile, data: any) {
      const content = await this.app.vault.read(file);
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter || {};

      // Merge new data
      Object.assign(frontmatter, data);

      // Update file
      const yaml = this.stringifyYaml(frontmatter);
      const body = content.replace(/^---\n[\s\S]*?\n---\n/, '');
      const newContent = `---\n${yaml}\n---\n${body}`;

      await this.app.vault.modify(file, newContent);
    }

    stringifyYaml(obj: any): string {
      return Object.entries(obj)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    }
  }

  ---
  Stage 3: Frontend Changes (Week 2)

  3.1 Add View Route for HTML

  // packages/frontend/src/pages/ViewPage.tsx - NEW FILE:

  export function ViewPage() {
    const { shareId } = useParams();
    const [document, setDocument] = useState(null);

    useEffect(() => {
      fetch(`/api/notes/${shareId}`)
        .then(res => res.json())
        .then(setDocument);
    }, [shareId]);

    if (!document) return <div>Loading...</div>;

    return (
      <div className="view-page">
        <header className="view-header">
          <h1>{document.title}</h1>
          <button 
            onClick={() => window.location.href = document.editUrl}
            className="edit-button"
          >
            Edit
          </button>
        </header>

        <div className="view-content">
          {document.htmlContent ? (
            <div 
              className="rendered-html"
              dangerouslySetInnerHTML={{ __html: document.htmlContent }}
            />
          ) : (
            <div className="markdown-content">
              {document.content}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Add route in App.tsx:
  // <Route path="/view/:shareId" element={<ViewPage />} />

  3.2 Update My Links Pane

  // packages/frontend/src/components/MyLinksPane.tsx - MODIFY:

  // Ensure title is displayed properly (no changes needed if using document.title)
  // The backend now guarantees title = filename, so it will show correctly

  ---
  Implementation Timeline

  Week 1: Backend

  - Day 1-2: Remove smart title extraction, add HTML columns
  - Day 3-4: Create share-html endpoint, attachment upload
  - Day 5: Test with Postman/curl

  Week 2: Plugin

  - Day 1-2: Fork ShareNote, setup development
  - Day 3-4: Implement backend API integration
  - Day 5: Test sharing from Obsidian

  Week 3: Frontend & Integration

  - Day 1-2: Add view page for HTML rendering
  - Day 3-4: Test full flow
  - Day 5: Bug fixes and polish

  ---
  Testing Checklist

  - Share note from Obsidian → Backend receives correct title (filename)
  - HTML content is stored and retrieved correctly
  - View page shows rendered HTML
  - Edit page shows markdown with collaboration
  - My Links shows correct titles (filenames)
  - Images upload and display correctly
  - Re-share updates existing note
  - Delete removes note from backend

⏺ Update Todos
  ⎿  ☒ Define MVP scope for ShareNote integration
     ☒ Plan backend changes for MVP
     ☒ Plan plugin modifications for MVP
     ☒ Define title handling strategy
     ☒ Create implementation timeline

⏺ This MVP plan focuses on the essential integration:
  1. Backend: Remove smart title extraction, add HTML storage
  2. Plugin: Simplified ShareNote that sends HTML + markdown
  3. Frontend: Basic view page for HTML rendering

  The key principle: Title = Filename, no automatic extraction or modification. This ensures consistency between Obsidian
   and your backend.