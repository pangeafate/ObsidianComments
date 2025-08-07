/**
 * Settings Management - Minimal TDD Implementation
 * 
 * Following TDD: This is the minimal code to make tests pass.
 * Will be expanded as tests require more functionality.
 */

import { App } from 'obsidian';
import { PluginSettings, ValidationResult } from './types';

export const DEFAULT_SETTINGS: PluginSettings = {
  apiKey: '',
  serverUrl: 'https://obsidiancomments.serverado.app',
  copyToClipboard: true,
  showNotifications: true,
  defaultPermissions: 'edit'
};

export function validateSettings(settings: Partial<PluginSettings>): ValidationResult {
  const errors: string[] = [];

  // API key validation - now optional but if provided must be valid
  if (settings.apiKey !== undefined) {
    if (settings.apiKey.trim() === '') {
      // Empty string is allowed (optional API key)
    } else if (settings.apiKey.length < 20) {
      errors.push('API key must be at least 20 characters long');
    }
  }

  // Server URL validation  
  if (settings.serverUrl) {
    try {
      const url = new URL(settings.serverUrl);
      const isLocalhost = url.hostname.includes('localhost') || url.hostname.includes('127.0.0.1');
      const isHttps = url.protocol === 'https:';
      
      if (!isHttps && !isLocalhost) {
        errors.push('Server URL must use HTTPS for security');
      }
    } catch {
      errors.push('Invalid server URL format');
    }
  }

  // Permissions validation
  if (settings.defaultPermissions && 
      settings.defaultPermissions !== 'view' && 
      settings.defaultPermissions !== 'edit') {
    errors.push('Default permissions must be either "view" or "edit"');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export class SettingsManager {
  app: App;
  settings: PluginSettings;

  constructor(app: App) {
    this.app = app;
    this.settings = { ...DEFAULT_SETTINGS };
  }

  async loadSettings(): Promise<void> {
    const settingsPath = this.getSettingsPath();
    
    try {
      if (await this.app.vault.adapter.exists(settingsPath)) {
        const data = await this.app.vault.adapter.read(settingsPath);
        const savedSettings = JSON.parse(data);
        this.settings = { ...DEFAULT_SETTINGS, ...savedSettings };
      }
    } catch (error) {
      // If parsing fails, use defaults
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  async saveSettings(): Promise<void> {
    try {
      const settingsPath = this.getSettingsPath();
      await this.app.vault.adapter.write(
        settingsPath,
        JSON.stringify(this.settings, null, 2)
      );
    } catch (error) {
      throw new Error(`Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateSettings(updates: Partial<PluginSettings>): Promise<void> {
    const newSettings = { ...this.settings, ...updates };
    const validation = validateSettings(newSettings);
    
    if (!validation.isValid) {
      throw new Error('Invalid settings update');
    }

    this.settings = newSettings;
    await this.saveSettings();
  }

  async resetSettings(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS };
    await this.saveSettings();
  }

  getSettingsPath(): string {
    return '.obsidian/plugins/obsidian-comments/data.json';
  }

  async isFirstRun(): Promise<boolean> {
    return !(await this.app.vault.adapter.exists(this.getSettingsPath()));
  }

  exportSettings(options?: { excludeSensitive?: boolean }): string {
    const settingsToExport = options?.excludeSensitive 
      ? { ...this.settings, apiKey: undefined }
      : this.settings;
    
    return JSON.stringify(settingsToExport, null, 2);
  }

  async importSettings(settingsJson: string): Promise<void> {
    try {
      const importedSettings = JSON.parse(settingsJson);
      const validation = validateSettings(importedSettings);
      
      if (!validation.isValid) {
        throw new Error('Imported settings are invalid');
      }

      this.settings = { ...DEFAULT_SETTINGS, ...importedSettings };
      await this.saveSettings();
    } catch (error) {
      if (error instanceof Error && error.message.includes('Imported settings are invalid')) {
        throw error;
      }
      throw new Error('Invalid settings format');
    }
  }
}