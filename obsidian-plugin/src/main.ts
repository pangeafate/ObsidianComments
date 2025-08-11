import { App, Plugin, PluginSettingTab, Setting, Notice, TFile, MarkdownView, Modal } from 'obsidian';
import { ShareNoteSettings, DEFAULT_SETTINGS } from './settings';
import { BackendAPI, ShareNoteResponse } from './api';

export class ShareNotePlugin extends Plugin {
	settings!: ShareNoteSettings;
	api!: BackendAPI;
	statusBarItem: HTMLElement | null = null;

	async onload() {
		await this.loadSettings();
		this.api = new BackendAPI(this.settings.backendUrl);

		// Add ribbon icon
		this.addRibbonIcon('share', 'Share note', () => {
			this.shareCurrentNote();
		});

		// Add share command
		this.addCommand({
			id: 'share-note',
			name: 'Share current note',
			callback: () => this.shareCurrentNote()
		});

		// Add unshare command
		this.addCommand({
			id: 'unshare-note',
			name: 'Stop sharing current note',
			callback: () => this.unshareCurrentNote()
		});

		// Add status bar item
		this.statusBarItem = this.addStatusBarItem();
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				this.updateStatusBar();
			})
		);
		this.registerEvent(
			this.app.metadataCache.on('changed', (file) => {
				if (file === this.app.workspace.getActiveFile()) {
					this.updateStatusBar();
				}
			})
		);
		
		// Initial status bar update
		this.updateStatusBar();

		// Add settings tab
		this.addSettingTab(new ShareNoteSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.api = new BackendAPI(this.settings.backendUrl);
	}

	async shareCurrentNote() {
		try {
			const file = this.app.workspace.getActiveFile();
			if (!file) {
				new Notice('No active file');
				return;
			}

			// Check if file is a supported text file
			if (!this.isTextFile(file)) {
				new Notice('Only text files can be shared');
				return;
			}

			const content = await this.app.vault.read(file);
			const cleanedContent = this.cleanMarkdownContent(content);
			const htmlContent = await this.renderToHTML();
			const cleanTitle = this.extractCleanTitle(file, cleanedContent);

			const shareData = {
				title: cleanTitle,
				content: cleanedContent,
				htmlContent
			};

			const result = await this.api.shareNote(shareData);

			// Update frontmatter with share information
			await this.updateFrontmatter(file, result);

			// Copy to clipboard if enabled
			if (this.settings.copyToClipboard && navigator.clipboard) {
				await navigator.clipboard.writeText(result.viewUrl);
			}

			// Open in browser if enabled
			if (this.settings.openInBrowser) {
				window.open(result.viewUrl, '_blank');
			}

			if (this.settings.showNotifications) {
				new Notice('Note shared successfully!');
			}
			
			// Update status bar
			this.updateStatusBar();

		} catch (error) {
			console.error('Failed to share note:', error);
			if (this.settings.showNotifications) {
				new Notice(`Failed to share note: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
			throw error; // Re-throw for test validation
		}
	}

	async renderToHTML(): Promise<string> {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return '';

		// Switch to preview mode
		const currentState = view.getState();
		await view.setState({
			...currentState,
			mode: 'preview'
		}, { history: false });

		// Wait for rendering
		await new Promise(resolve => setTimeout(resolve, 100));

		// Get HTML from preview
		const previewElement = view.previewMode?.containerEl?.querySelector('.markdown-preview-view');
		if (!previewElement) return '';

		return this.cleanHTML(previewElement);
	}

	cleanHTML(element: Element): string {
		const cloned = element.cloneNode(true) as Element;

		// Remove Obsidian-specific elements only
		cloned.querySelectorAll('.frontmatter').forEach(el => el.remove());
		cloned.querySelectorAll('.edit-block-button').forEach(el => el.remove());

		// Keep images but ensure they use standard HTML attributes
		cloned.querySelectorAll('img').forEach(img => {
			// Remove any Obsidian-specific attributes but keep the image
			img.removeAttribute('data-obsidian-id');
			img.removeAttribute('data-embed-name');
		});

		// Remove only dangerous elements
		cloned.querySelectorAll('script').forEach(el => el.remove());
		cloned.querySelectorAll('iframe').forEach(el => el.remove());
		cloned.querySelectorAll('embed').forEach(el => el.remove());
		cloned.querySelectorAll('object').forEach(el => el.remove());

		// Remove only binary file links, keep others
		const binaryExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar'];
		binaryExtensions.forEach(ext => {
			cloned.querySelectorAll(`a[href*="${ext}"]`).forEach(el => el.remove());
		});

		// Convert internal links to plain text
		cloned.querySelectorAll('a.internal-link').forEach(link => {
			const textNode = document.createTextNode(link.textContent || '');
			link.replaceWith(textNode);
		});

		return cloned.innerHTML;
	}

	isTextFile(file: TFile): boolean {
		const textExtensions = ['.md', '.txt', '.org', '.tex', '.rst'];
		const binaryExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', 
								 '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp',
								 '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm',
								 '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a',
								 '.zip', '.rar', '.7z', '.tar', '.gz', '.exe', '.dll', '.so'];
		
		const extension = '.' + (file.extension || '');
		
		// Explicitly allow text files
		if (textExtensions.includes(extension.toLowerCase())) {
			return true;
		}
		
		// Explicitly block binary files
		if (binaryExtensions.includes(extension.toLowerCase())) {
			return false;
		}
		
		// Default to allowing files without extensions or unknown extensions (assume text)
		return true;
	}

	cleanMarkdownContent(content: string): string {
		if (!content || typeof content !== 'string') return '';

		let cleanedContent = content;

		// Only remove potentially harmful content, preserve markdown formatting
		// Keep images but convert to standard markdown format if needed
		
		// Remove only binary attachment links (keep text-based wikilinks)
		const binaryExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 
								 'zip', 'rar', '7z', 'tar', 'gz', 'exe'];
		
		const binaryAttachmentPattern = new RegExp(`\\[\\[([^\\]]+\\.(${binaryExtensions.join('|')}))(\\|[^\\]]*)?\\]\\]`, 'gi');
		cleanedContent = cleanedContent.replace(binaryAttachmentPattern, '');

		// Remove embedded/transcluded content but keep regular images
		cleanedContent = cleanedContent.replace(/!\[\[([^\]]+)\]\]/g, '');

		// Remove only dangerous HTML tags, keep basic ones
		cleanedContent = cleanedContent.replace(/<(script|style|object|embed|iframe)[^>]*>[\s\S]*?<\/\1>/gi, '');
		cleanedContent = cleanedContent.replace(/<(script|style|object|embed|iframe)[^>]*\/>/gi, '');

		// Clean up excessive whitespace but preserve intentional line breaks
		cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, '\n\n');

		return cleanedContent.trim();
	}

	extractCleanTitle(file: TFile, content: string): string {
		// Primary: use filename without extension
		let title = file.basename;
		
		// Clean up filename-based title
		title = title.replace(/[-_]/g, ' '); // Replace dashes and underscores with spaces
		title = title.replace(/\s+/g, ' '); // Normalize multiple spaces
		title = title.trim();
		
		// Only fallback to H1 if filename is empty or just whitespace
		if (!title || title.length === 0) {
			const h1Match = content.match(/^#\s+(.+)$/m);
			if (h1Match && h1Match[1].trim()) {
				title = h1Match[1].trim();
				// Clean up title - remove any remaining markdown or HTML
				title = title.replace(/[*_`~]/g, ''); // Remove markdown formatting
				title = title.replace(/<[^>]*>/g, ''); // Remove HTML tags
			}
		}
		
		// Final fallback if still empty
		if (!title || title.length === 0) {
			title = 'Untitled Note';
		}

		return title;
	}

	async unshareCurrentNote() {
		try {
			const file = this.app.workspace.getActiveFile();
			if (!file) {
				new Notice('No active file');
				return;
			}

			const content = await this.app.vault.read(file);
			const cache = this.app.metadataCache.getFileCache(file);
			
			// Check if file is shared
			if (!cache?.frontmatter?.share_id) {
				new Notice('Note is not currently shared');
				return;
			}

			// Confirm deletion
			const confirmModal = new ConfirmModal(this.app, 
				'Stop sharing this note?', 
				'This will remove the shared link. Anyone with the link will no longer be able to access it.');
			
			confirmModal.onConfirm = async () => {
				const shareId = cache.frontmatter!.share_id;

				try {
					// Delete from backend
					await this.api.deleteShare(shareId);
					
					// Remove frontmatter
					await this.removeFrontmatter(file);
					
					if (this.settings.showNotifications) {
						new Notice('Note unshared successfully');
					}
					
					// Update status bar
					this.updateStatusBar();
				} catch (error) {
					console.error('Failed to delete share:', error);
					// Even if backend deletion fails, remove local metadata
					await this.removeFrontmatter(file);
					if (this.settings.showNotifications) {
						new Notice('Note unshared locally (backend may still have the share)');
					}
					
					// Update status bar
					this.updateStatusBar();
				}
			};
			
			confirmModal.open();

		} catch (error) {
			console.error('Failed to unshare note:', error);
			if (this.settings.showNotifications) {
				new Notice(`Failed to unshare note: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		}
	}

	updateStatusBar() {
		if (!this.statusBarItem) return;
		
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			this.statusBarItem.setText('');
			return;
		}
		
		const cache = this.app.metadataCache.getFileCache(activeFile);
		if (cache?.frontmatter?.share_id) {
			// File is shared - show indicator with click action
			this.statusBarItem.setText('🔗 Shared');
			this.statusBarItem.addClass('mod-clickable');
			this.statusBarItem.setAttribute('aria-label', 'Click to copy share link');
			
			// Remove old click handler and add new one
			this.statusBarItem.onclick = async () => {
				const shareUrl = cache.frontmatter!.share_url || cache.frontmatter!.edit_url;
				if (shareUrl && navigator.clipboard) {
					await navigator.clipboard.writeText(shareUrl);
					new Notice('Share link copied to clipboard');
				}
			};
		} else {
			// File is not shared
			this.statusBarItem.setText('');
			this.statusBarItem.removeClass('mod-clickable');
			this.statusBarItem.onclick = null;
		}
	}

	async removeFrontmatter(file: TFile) {
		const content = await this.app.vault.read(file);
		const cache = this.app.metadataCache.getFileCache(file);
		
		if (!cache?.frontmatter) {
			return; // No frontmatter to remove
		}

		const lines = content.split('\n');
		const endLine = cache.frontmatterPosition?.end.line || 0;
		
		// Get existing frontmatter and remove share-related keys
		const existingFrontmatter = { ...cache.frontmatter };
		delete existingFrontmatter.share_id;
		delete existingFrontmatter.share_url;
		delete existingFrontmatter.edit_url;
		delete existingFrontmatter.shared_at;
		
		// Check if any frontmatter remains
		if (Object.keys(existingFrontmatter).length === 0) {
			// Remove entire frontmatter block
			const bodyLines = lines.slice(endLine + 1);
			while (bodyLines.length > 0 && bodyLines[0].trim() === '') {
				bodyLines.shift(); // Remove leading empty lines
			}
			await this.app.vault.modify(file, bodyLines.join('\n'));
		} else {
			// Keep remaining frontmatter
			const frontmatterLines = [
				'---',
				...Object.entries(existingFrontmatter).map(([key, value]) => {
					if (Array.isArray(value)) {
						return `${key}: [${value.join(', ')}]`;
					}
					return `${key}: ${value}`;
				}),
				'---'
			];
			
			const bodyLines = lines.slice(endLine + 1);
			const updatedContent = [...frontmatterLines, ...bodyLines].join('\n');
			await this.app.vault.modify(file, updatedContent);
		}
	}

	async updateFrontmatter(file: TFile, shareResult: ShareNoteResponse) {
		const content = await this.app.vault.read(file);
		const cache = this.app.metadataCache.getFileCache(file);
		
		const shareData = {
			share_id: shareResult.shareId,
			share_url: shareResult.viewUrl,
			edit_url: shareResult.editUrl,
			shared_at: new Date().toISOString()
		};

		let updatedContent: string;

		if (cache?.frontmatter) {
			// Update existing frontmatter
			const lines = content.split('\n');
			const endLine = cache.frontmatterPosition?.end.line || 0;
			
			// Build new frontmatter
			const existingFrontmatter = cache.frontmatter;
			const newFrontmatter = { ...existingFrontmatter, ...shareData };
			
			const frontmatterLines = [
				'---',
				...Object.entries(newFrontmatter).map(([key, value]) => {
					if (Array.isArray(value)) {
						return `${key}: [${value.join(', ')}]`;
					}
					return `${key}: ${value}`;
				}),
				'---'
			];

			// Replace frontmatter, skip the original frontmatter lines
			const bodyLines = lines.slice(endLine + 1);
			updatedContent = [...frontmatterLines, ...bodyLines].join('\n');
		} else {
			// Add new frontmatter
			const frontmatterLines = [
				'---',
				...Object.entries(shareData).map(([key, value]) => `${key}: ${value}`),
				'---'
			];
			
			updatedContent = [...frontmatterLines, content].join('\n');
		}

		await this.app.vault.modify(file, updatedContent);
	}
}

class ShareNoteSettingTab extends PluginSettingTab {
	plugin: ShareNotePlugin;

	constructor(app: App, plugin: ShareNotePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Share Note Settings' });

		new Setting(containerEl)
			.setName('Backend URL')
			.setDesc('URL of your backend server')
			.addText(text => text
				.setPlaceholder('https://your-backend.com')
				.setValue(this.plugin.settings.backendUrl)
				.onChange(async (value) => {
					this.plugin.settings.backendUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Copy to clipboard')
			.setDesc('Automatically copy share URL to clipboard')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.copyToClipboard)
				.onChange(async (value) => {
					this.plugin.settings.copyToClipboard = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show notifications')
			.setDesc('Show success/error notifications')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showNotifications)
				.onChange(async (value) => {
					this.plugin.settings.showNotifications = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Open in browser')
			.setDesc('Automatically open shared note in browser')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.openInBrowser)
				.onChange(async (value) => {
					this.plugin.settings.openInBrowser = value;
					await this.plugin.saveSettings();
				}));
	}
}

class ConfirmModal extends Modal {
	private title: string;
	private message: string;
	onConfirm: () => void = () => {};

	constructor(app: App, title: string, message: string) {
		super(app);
		this.title = title;
		this.message = message;
	}

	onOpen() {
		const { contentEl } = this;
		
		contentEl.createEl('h2', { text: this.title });
		contentEl.createEl('p', { text: this.message });
		
		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
		
		const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelButton.addEventListener('click', () => this.close());
		
		const confirmButton = buttonContainer.createEl('button', { text: 'Delete', cls: 'mod-warning' });
		confirmButton.addEventListener('click', () => {
			this.onConfirm();
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export default ShareNotePlugin;