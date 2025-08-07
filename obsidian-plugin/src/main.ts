import { App, Plugin, PluginSettingTab, Setting, Notice, TFile, MarkdownView } from 'obsidian';
import { ShareNoteSettings, DEFAULT_SETTINGS } from './settings';
import { BackendAPI, ShareNoteResponse } from './api';

export class ShareNotePlugin extends Plugin {
	settings!: ShareNoteSettings;
	api!: BackendAPI;

	async onload() {
		await this.loadSettings();
		this.api = new BackendAPI(this.settings.backendUrl);

		// Add ribbon icon
		this.addRibbonIcon('share', 'Share note', () => {
			this.shareCurrentNote();
		});

		// Add command
		this.addCommand({
			id: 'share-note',
			name: 'Share current note',
			callback: () => this.shareCurrentNote()
		});

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

		// Remove Obsidian-specific elements
		cloned.querySelectorAll('.frontmatter').forEach(el => el.remove());
		cloned.querySelectorAll('.edit-block-button').forEach(el => el.remove());

		// Remove images and media elements
		cloned.querySelectorAll('img').forEach(el => el.remove());
		cloned.querySelectorAll('video').forEach(el => el.remove());
		cloned.querySelectorAll('audio').forEach(el => el.remove());
		cloned.querySelectorAll('iframe').forEach(el => el.remove());
		cloned.querySelectorAll('embed').forEach(el => el.remove());
		cloned.querySelectorAll('object').forEach(el => el.remove());

		// Remove attachment and file links
		cloned.querySelectorAll('a[href^="file:"]').forEach(el => el.remove());
		cloned.querySelectorAll('a[href*=".pdf"]').forEach(el => el.remove());
		cloned.querySelectorAll('a[href*=".doc"]').forEach(el => el.remove());
		cloned.querySelectorAll('a[href*=".docx"]').forEach(el => el.remove());
		cloned.querySelectorAll('a[href*=".xls"]').forEach(el => el.remove());
		cloned.querySelectorAll('a[href*=".xlsx"]').forEach(el => el.remove());
		cloned.querySelectorAll('a[href*=".ppt"]').forEach(el => el.remove());
		cloned.querySelectorAll('a[href*=".pptx"]').forEach(el => el.remove());
		cloned.querySelectorAll('a[href*=".zip"]').forEach(el => el.remove());
		cloned.querySelectorAll('a[href*=".rar"]').forEach(el => el.remove());

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

		// Remove image syntax ![alt](url) and ![alt](url "title")
		cleanedContent = cleanedContent.replace(/!\[.*?\]\([^)]+\)/g, '');
		
		// Remove attachment links [[filename.ext]]
		const attachmentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 
									 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp',
									 'mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm',
									 'mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a',
									 'zip', 'rar', '7z', 'tar', 'gz', 'exe'];
		
		const attachmentPattern = new RegExp(`\\[\\[([^\\]]+\\.(${attachmentExtensions.join('|')}))(\\|[^\\]]*)?\\]\\]`, 'gi');
		cleanedContent = cleanedContent.replace(attachmentPattern, '');

		// Remove embedded/transcluded content ![[filename]]
		cleanedContent = cleanedContent.replace(/!\[\[([^\]]+)\]\]/g, '');

		// Remove HTML img tags that might have been missed
		cleanedContent = cleanedContent.replace(/<img[^>]*>/gi, '');
		
		// Remove video/audio HTML tags
		cleanedContent = cleanedContent.replace(/<(video|audio)[^>]*>[\s\S]*?<\/\1>/gi, '');
		cleanedContent = cleanedContent.replace(/<(video|audio)[^>]*\/>/gi, '');

		// Remove iframe, embed, object tags
		cleanedContent = cleanedContent.replace(/<(iframe|embed|object)[^>]*>[\s\S]*?<\/\1>/gi, '');
		cleanedContent = cleanedContent.replace(/<(iframe|embed|object)[^>]*\/>/gi, '');

		// Clean up excessive whitespace but preserve intentional line breaks
		cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, '\n\n');

		return cleanedContent.trim();
	}

	extractCleanTitle(file: TFile, content: string): string {
		// First, try to extract title from H1 header in content
		const h1Match = content.match(/^#\s+(.+)$/m);
		if (h1Match && h1Match[1].trim()) {
			let title = h1Match[1].trim();
			// Clean up title - remove any remaining markdown or HTML
			title = title.replace(/[*_`~]/g, ''); // Remove markdown formatting
			title = title.replace(/<[^>]*>/g, ''); // Remove HTML tags
			if (title.length > 0) {
				return title;
			}
		}

		// Fallback to filename without extension
		let title = file.basename;
		
		// Clean up filename-based title
		title = title.replace(/[-_]/g, ' '); // Replace dashes and underscores with spaces
		title = title.replace(/\s+/g, ' '); // Normalize multiple spaces
		title = title.trim();
		
		// If title is still empty or just whitespace, provide a default
		if (!title || title.length === 0) {
			title = 'Untitled Note';
		}

		return title;
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

export default ShareNotePlugin;