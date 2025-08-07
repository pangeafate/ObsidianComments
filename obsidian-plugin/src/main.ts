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

			const content = await this.app.vault.read(file);
			const htmlContent = await this.renderToHTML();

			const shareData = {
				title: file.basename,
				content,
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

		// Convert internal links to plain text
		cloned.querySelectorAll('a.internal-link').forEach(link => {
			const textNode = document.createTextNode(link.textContent || '');
			link.replaceWith(textNode);
		});

		return cloned.innerHTML;
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