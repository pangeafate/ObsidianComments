/**
 * Main Obsidian Comments Plugin - Minimal TDD Implementation
 * 
 * Following TDD: This is the minimal code to make tests pass.
 * Will be expanded as tests require more functionality.
 */

import { App, Plugin, PluginManifest, TFile, Notice, Menu, PluginSettingTab, Setting, setIcon } from 'obsidian';
import { ApiClient } from './api-client';
import { ShareManager } from './share-manager';
import { SettingsManager, DEFAULT_SETTINGS } from './settings';
import { PluginSettings } from './types';

export class ObsidianCommentsPlugin extends Plugin {
  settingsManager: SettingsManager;
  apiClient: ApiClient;
  shareManager: ShareManager;
  statusBarItem: HTMLElement | null = null;

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
    
    // Initialize settings manager first
    this.settingsManager = new SettingsManager(app);
    
    // Initialize API client with temporary settings (will be updated after settings load)
    this.apiClient = new ApiClient({
      apiKey: 'temporary-initialization-key-12345',
      serverUrl: DEFAULT_SETTINGS.serverUrl
    });
    
    // Initialize share manager
    this.shareManager = new ShareManager(this.apiClient);
  }

  async onload(): Promise<void> {
    // Load settings first
    await this.settingsManager.loadSettings();
    
    // Update API client with loaded settings (if API key is available)
    if (this.settingsManager.settings && this.settingsManager.settings.apiKey && this.settingsManager.settings.apiKey !== '') {
      this.apiClient = new ApiClient({
        apiKey: this.settingsManager.settings.apiKey,
        serverUrl: this.settingsManager.settings.serverUrl
      });
      this.shareManager = new ShareManager(this.apiClient);
    }

    // Register commands
    this.addCommand({
      id: 'share-note',
      name: 'Share current note online',
      callback: () => this.shareCurrentNote()
    });

    this.addCommand({
      id: 'unshare-note', 
      name: 'Stop sharing current note',
      callback: () => this.unshareCurrentNote()
    });

    // Context menu integration will be added in future version
    // Currently not supported in this Obsidian API version

    // Add ribbon icon
    this.addRibbonIcon('share', 'Share current note', () => {
      this.shareCurrentNote();
    });

    // Add status bar item
    this.statusBarItem = this.addStatusBarItem();
    this.statusBarItem.setText('');

    // Add settings tab
    this.addSettingTab(new ObsidianCommentsSettingTab(this.app, this));

    // Update status on file change
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => {
        this.updateSharingStatus();
      })
    );

    // Initial status update
    await this.updateSharingStatus();

    // Register property widget for shareUrl
    this.registerPropertyWidget();
  }

  registerPropertyWidget(): void {
    // Watch for active file changes to add share icons
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => {
        setTimeout(() => this.addShareIcons(), 100);
      })
    );

    // Also watch for metadata changes
    this.registerEvent(
      this.app.metadataCache.on('changed', () => {
        setTimeout(() => this.addShareIcons(), 100);
      })
    );

    // Initial check
    setTimeout(() => this.addShareIcons(), 500);
  }

  addShareIcons(): void {
    let count = 0;
    const timer = setInterval(() => {
      count++;
      if (count > 8) {
        clearInterval(timer);
        return;
      }

      const activeFile = this.app.workspace.getActiveFile();
      if (!activeFile) return;

      // Check if the file has a shareUrl in frontmatter
      const cache = this.app.metadataCache.getFileCache(activeFile);
      const shareUrl = cache?.frontmatter?.shareUrl;
      if (!shareUrl) return;

      // Find the shareUrl property in the DOM
      document.querySelectorAll(`div.metadata-property[data-property-key="shareUrl"]`)
        .forEach(propertyEl => {
          const valueEl = propertyEl.querySelector('div.metadata-property-value');
          if (!valueEl) return;

          // Check if icons are already added
          if (valueEl.querySelector('div.obsidian-comments-icons')) return;

          // Create icons container
          const iconsEl = document.createElement('div');
          iconsEl.classList.add('obsidian-comments-icons');
          iconsEl.style.display = 'inline-flex';
          iconsEl.style.gap = '4px';
          iconsEl.style.marginLeft = '8px';

          // Re-share button
          const reshareIcon = document.createElement('span');
          reshareIcon.classList.add('clickable-icon');
          reshareIcon.setAttribute('aria-label', 'Re-share note');
          reshareIcon.style.cursor = 'pointer';
          setIcon(reshareIcon, 'upload-cloud');
          reshareIcon.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.shareCurrentNote();
          });
          iconsEl.appendChild(reshareIcon);

          // Copy button
          const copyIcon = document.createElement('span');
          copyIcon.classList.add('clickable-icon');
          copyIcon.setAttribute('aria-label', 'Copy share URL');
          copyIcon.style.cursor = 'pointer';
          setIcon(copyIcon, 'copy');
          copyIcon.addEventListener('click', async (e) => {
            e.stopPropagation();
            await navigator.clipboard.writeText(shareUrl);
            new Notice('Share URL copied to clipboard');
          });
          iconsEl.appendChild(copyIcon);

          // Open external button
          const openIcon = document.createElement('span');
          openIcon.classList.add('clickable-icon');
          openIcon.setAttribute('aria-label', 'Open in browser');
          openIcon.style.cursor = 'pointer';
          setIcon(openIcon, 'external-link');
          openIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            window.open(shareUrl, '_blank');
          });
          iconsEl.appendChild(openIcon);

          // Delete button
          const deleteIcon = document.createElement('span');
          deleteIcon.classList.add('clickable-icon');
          deleteIcon.setAttribute('aria-label', 'Unshare note');
          deleteIcon.style.cursor = 'pointer';
          setIcon(deleteIcon, 'trash');
          deleteIcon.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to unshare this note?')) {
              const content = await this.app.vault.read(activeFile);
              const updatedContent = await this.shareManager.unshareNote(content);
              await this.app.vault.modify(activeFile, updatedContent);
              new Notice('Note unshared');
            }
          });
          iconsEl.appendChild(deleteIcon);

          // Add icons to the value element
          valueEl.appendChild(iconsEl);
        });
    }, 50);
  }

  async shareCurrentNote(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    
    if (!activeFile) {
      new Notice('No active file to share');
      return;
    }

    try {
      const content = await this.app.vault.read(activeFile);
      const filename = activeFile.name;
      const result = await this.shareManager.shareNoteWithFilename(content, filename);
      
      // Update the file with share metadata
      await this.app.vault.modify(activeFile, result.updatedContent);
      
      // Copy to clipboard if enabled
      if (this.settingsManager.settings.copyToClipboard) {
        await navigator.clipboard.writeText(result.shareUrl);
      }
      
      // Show notification if enabled
      if (this.settingsManager.settings.showNotifications) {
        const message = result.wasUpdate 
          ? 'Note updated and shared!'
          : 'Note shared! URL copied to clipboard.';
        new Notice(message);
      }

      // Update status
      await this.updateSharingStatus();
      
    } catch (error) {
      new Notice(`Failed to share note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async unshareCurrentNote(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    
    if (!activeFile) {
      new Notice('No active file to unshare');
      return;
    }

    try {
      const content = await this.app.vault.read(activeFile);  
      const updatedContent = await this.shareManager.unshareNote(content);
      
      // Update the file with share metadata removed
      await this.app.vault.modify(activeFile, updatedContent);
      
      // Show notification if enabled
      if (this.settingsManager.settings.showNotifications) {
        new Notice('Note unshared successfully.');
      }

      // Update status
      await this.updateSharingStatus();
      
    } catch (error) {
      new Notice(`Failed to unshare note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async shareFileNote(file: TFile): Promise<void> {
    try {
      const content = await this.app.vault.read(file);
      const filename = file.name;
      const result = await this.shareManager.shareNoteWithFilename(content, filename);
      
      await this.app.vault.modify(file, result.updatedContent);
      
      if (this.settingsManager.settings.copyToClipboard) {
        await navigator.clipboard.writeText(result.shareUrl);
      }
      
      if (this.settingsManager.settings.showNotifications) {
        new Notice('Note shared! URL copied to clipboard.');
      }
      
    } catch (error) {
      new Notice(`Failed to share note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async unshareFileNote(file: TFile): Promise<void> {
    try {
      const content = await this.app.vault.read(file);
      const updatedContent = await this.shareManager.unshareNote(content);
      
      await this.app.vault.modify(file, updatedContent);
      
      if (this.settingsManager.settings.showNotifications) {
        new Notice('Note unshared successfully.');
      }
      
    } catch (error) {
      new Notice(`Failed to unshare note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateSharingStatus(): Promise<void> {
    if (!this.statusBarItem) return;

    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      this.statusBarItem.setText('');
      return;
    }

    try {
      const content = await this.app.vault.read(activeFile);
      const isShared = this.shareManager.isNoteShared(content);
      
      this.statusBarItem.setText(isShared ? '📤 Shared' : '');
    } catch (error) {
      this.statusBarItem.setText('');
    }
  }

  async onSettingsChange(newSettings: PluginSettings): Promise<void> {
    this.settingsManager.settings = newSettings;
    
    // Update API client with new settings
    if (newSettings.apiKey) {
      this.apiClient = new ApiClient({
        apiKey: newSettings.apiKey,
        serverUrl: newSettings.serverUrl
      });
      this.shareManager = new ShareManager(this.apiClient);
    }
  }

  onunload(): void {
    // Cleanup is handled automatically by Obsidian for registered events
    // and UI elements like status bar items and ribbon icons
  }
}

class ObsidianCommentsSettingTab extends PluginSettingTab {
  plugin: ObsidianCommentsPlugin;

  constructor(app: App, plugin: ObsidianCommentsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    
    containerEl.createEl('h2', { text: 'Obsidian Comments Settings' });

    // API Key setting
    new Setting(containerEl)
      .setName('API Key')
      .setDesc('Your API key for the sharing service')
      .addText(text => text
        .setPlaceholder('Enter your API key')
        .setValue(this.plugin.settingsManager.settings.apiKey)
        .onChange(async (value) => {
          this.plugin.settingsManager.settings.apiKey = value;
          await this.plugin.settingsManager.saveSettings();
          await this.plugin.onSettingsChange(this.plugin.settingsManager.settings);
        })
      );

    // Server URL setting
    new Setting(containerEl)
      .setName('Server URL')
      .setDesc('URL of the sharing service')
      .addText(text => text
        .setPlaceholder('https://api.obsidiancomments.com')
        .setValue(this.plugin.settingsManager.settings.serverUrl)
        .onChange(async (value) => {
          this.plugin.settingsManager.settings.serverUrl = value;
          await this.plugin.settingsManager.saveSettings();
          await this.plugin.onSettingsChange(this.plugin.settingsManager.settings);
        })
      );

    // Copy to clipboard setting
    new Setting(containerEl)
      .setName('Copy to clipboard')
      .setDesc('Automatically copy share URL to clipboard')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settingsManager.settings.copyToClipboard)
        .onChange(async (value) => {
          this.plugin.settingsManager.settings.copyToClipboard = value;
          await this.plugin.settingsManager.saveSettings();
        })
      );

    // Show notifications setting
    new Setting(containerEl)
      .setName('Show notifications')
      .setDesc('Show success/error notifications')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settingsManager.settings.showNotifications)
        .onChange(async (value) => {
          this.plugin.settingsManager.settings.showNotifications = value;
          await this.plugin.settingsManager.saveSettings();
        })
      );

    // Default permissions setting
    new Setting(containerEl)
      .setName('Default permissions')
      .setDesc('Default permission level for shared notes')
      .addDropdown(dropdown => dropdown
        .addOption('view', 'View only')
        .addOption('edit', 'Edit')
        .setValue(this.plugin.settingsManager.settings.defaultPermissions)
        .onChange(async (value) => {
          this.plugin.settingsManager.settings.defaultPermissions = value as 'view' | 'edit';
          await this.plugin.settingsManager.saveSettings();
        })
      );

    // Test connection button
    new Setting(containerEl)
      .setName('Test connection')
      .setDesc('Test your API key and connection')
      .addButton(button => button
        .setButtonText('Test')
        .setCta()
        .onClick(async () => {
          try {
            button.setButtonText('Testing...');
            await this.plugin.apiClient.testConnection();
            new Notice('Connection successful!');
            button.setButtonText('Test');
          } catch (error) {
            new Notice(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            button.setButtonText('Test');
          }
        })
      );
  }
}

// Default export required by Obsidian
export default ObsidianCommentsPlugin;