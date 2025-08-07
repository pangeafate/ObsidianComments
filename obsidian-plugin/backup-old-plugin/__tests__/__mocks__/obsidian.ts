import { jest } from '@jest/globals';

// Mock Obsidian API classes and interfaces
export class TFile {
  path: string;
  basename: string;
  extension: string;
  name: string;
  
  constructor(path: string) {
    this.path = path;
    this.name = path.split('/').pop() || '';
    this.basename = this.name.replace(/\.[^/.]+$/, '');
    this.extension = this.name.includes('.') ? this.name.split('.').pop() || '' : '';
  }
}

export class TFolder {
  path: string;
  name: string;
  
  constructor(path: string) {
    this.path = path;
    this.name = path.split('/').pop() || '';
  }
}

export class Vault {
  read = jest.fn<(file: TFile) => Promise<string>>();
  modify = jest.fn<(file: TFile, data: string) => Promise<void>>();
  create = jest.fn<(path: string, data: string) => Promise<TFile>>();
  delete = jest.fn<(file: TFile) => Promise<void>>();
  exists = jest.fn<(path: string) => Promise<boolean>>();
  
  constructor() {
    // Set up default mock implementations
    this.read.mockResolvedValue('# Test Note\nContent');
    this.modify.mockResolvedValue(undefined);
    this.create.mockImplementation((path: string) => 
      Promise.resolve(new TFile(path))
    );
    this.delete.mockResolvedValue(undefined);
    this.exists.mockResolvedValue(true);
  }
}

export class Workspace {
  getActiveFile = jest.fn<() => TFile | null>();
  openLinkText = jest.fn<(linkText: string) => Promise<void>>();
  
  constructor() {
    this.getActiveFile.mockReturnValue(new TFile('test-note.md'));
    this.openLinkText.mockResolvedValue(undefined);
  }
}

export class App {
  vault: Vault;
  workspace: Workspace;
  
  constructor() {
    this.vault = new Vault();
    this.workspace = new Workspace();
  }
}

export class Plugin {
  app: App;
  manifest: PluginManifest;
  
  constructor(app: App, manifest: PluginManifest) {
    this.app = app;
    this.manifest = manifest;
  }
  
  addCommand = jest.fn();
  addRibbonIcon = jest.fn();
  registerEvent = jest.fn();
  loadData = jest.fn<() => Promise<any>>();
  saveData = jest.fn<(data: any) => Promise<void>>();
  
  onload(): Promise<void> {
    return Promise.resolve();
  }
  
  onunload(): void {
    // Override in subclasses
  }
}

export class PluginSettingTab {
  app: App;
  plugin: Plugin;
  containerEl: HTMLElement;
  
  constructor(app: App, plugin: Plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement('div');
  }
  
  display(): void {
    // Override in subclasses
  }
  
  hide(): void {
    // Override in subclasses
  }
}

export class Setting {
  settingEl: HTMLElement;
  
  constructor(containerEl: HTMLElement) {
    this.settingEl = document.createElement('div');
    containerEl.appendChild(this.settingEl);
  }
  
  setName = jest.fn(() => this);
  setDesc = jest.fn(() => this);
  addText = jest.fn(() => this);
  addToggle = jest.fn(() => this);
  addButton = jest.fn(() => this);
  addDropdown = jest.fn(() => this);
}

export class Notice {
  message: string;
  timeout: number;
  
  constructor(message: string, timeout?: number) {
    this.message = message;
    this.timeout = timeout || 5000;
  }
  
  setMessage = jest.fn();
  hide = jest.fn();
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  minAppVersion: string;
  description: string;
  author: string;
  authorUrl?: string;
  fundingUrl?: string;
  isDesktopOnly?: boolean;
}

// Export commonly used types
export type TAbstractFile = TFile | TFolder;

// Mock commonly used functions
export const normalizePath = jest.fn((path: string) => path);
export const requestUrl = jest.fn();

// Set up default requestUrl mock
requestUrl.mockResolvedValue({
  status: 200,
  json: {},
  text: '',
  arrayBuffer: new ArrayBuffer(0),
});