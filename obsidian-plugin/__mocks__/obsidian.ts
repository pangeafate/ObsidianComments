/**
 * Mock implementation of Obsidian API for testing
 */

export class Plugin {
  app: any;
  manifest: any;
  
  constructor(app: any, manifest: any) {
    this.app = app;
    this.manifest = manifest;
  }
  
  addRibbonIcon = jest.fn();
  addCommand = jest.fn();
  addStatusBarItem = jest.fn().mockReturnValue({
    setText: jest.fn(),
    addClass: jest.fn(),
    removeClass: jest.fn(),
    setAttribute: jest.fn(),
    onclick: null,
    oncontextmenu: null
  });
  addSettingTab = jest.fn();
  loadData = jest.fn().mockResolvedValue(null);
  saveData = jest.fn().mockResolvedValue(undefined);
  registerEvent = jest.fn();
  onload = jest.fn();
  onunload = jest.fn();
}

export class Modal {
  app: any;
  contentEl: HTMLElement;
  titleEl: HTMLElement;
  modalEl: HTMLElement;
  
  constructor(app: any) {
    this.app = app;
    this.contentEl = document.createElement('div');
    this.titleEl = document.createElement('div');
    this.modalEl = document.createElement('div');
  }
  
  open = jest.fn();
  close = jest.fn();
  onOpen = jest.fn();
  onClose = jest.fn();
}

export class PluginSettingTab {
  app: any;
  plugin: any;
  containerEl: HTMLElement;
  
  constructor(app: any, plugin: any) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement('div');
  }
  
  display = jest.fn();
  hide = jest.fn();
}

export class Setting {
  containerEl: HTMLElement;
  
  constructor(containerEl: HTMLElement) {
    this.containerEl = containerEl;
  }
  
  setName = jest.fn().mockReturnThis();
  setDesc = jest.fn().mockReturnThis();
  addText = jest.fn((cb) => {
    const text = {
      setPlaceholder: jest.fn().mockReturnThis(),
      setValue: jest.fn().mockReturnThis(),
      onChange: jest.fn().mockReturnThis()
    };
    cb(text);
    return this;
  });
  addToggle = jest.fn((cb) => {
    const toggle = {
      setValue: jest.fn().mockReturnThis(),
      onChange: jest.fn().mockReturnThis()
    };
    cb(toggle);
    return this;
  });
  addButton = jest.fn().mockReturnThis();
  addDropdown = jest.fn().mockReturnThis();
  addTextArea = jest.fn().mockReturnThis();
}

export class Notice {
  constructor(message: string) {
    // Store message for testing
    (Notice as any).lastMessage = message;
  }
  static lastMessage: string;
}

export class TFile {
  basename: string = 'test-file';
  extension: string = 'md';
  path: string = 'test-file.md';
  name: string = 'test-file.md';
  parent: any = null;
  vault: any = null;
  stat: any = { mtime: Date.now() };
}

export class MarkdownView {
  file: TFile | null = null;
  editor: any = null;
  previewMode: any = {
    containerEl: {
      querySelector: jest.fn()
    }
  };
  sourceMode: any = null;
  
  getState = jest.fn();
  setState = jest.fn();
  getViewType = jest.fn().mockReturnValue('markdown');
}

export class Menu {
  items: any[] = [];
  
  addItem = jest.fn((cb) => {
    const item = {
      setTitle: jest.fn().mockReturnThis(),
      setIcon: jest.fn().mockReturnThis(),
      onClick: jest.fn().mockReturnThis(),
      setDisabled: jest.fn().mockReturnThis()
    };
    cb(item);
    this.items.push(item);
    return this;
  });
  
  addSeparator = jest.fn().mockReturnThis();
  showAtMouseEvent = jest.fn();
  showAtPosition = jest.fn();
  hide = jest.fn();
}

export class App {
  workspace: any = {
    getActiveFile: jest.fn(),
    getActiveViewOfType: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  };
  
  vault: any = {
    read: jest.fn(),
    modify: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    rename: jest.fn()
  };
  
  metadataCache: any = {
    getFileCache: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  };
}

// Export additional types/enums as needed
export const ViewState = {};
export const Workspace = {};
export const Vault = {};
export const MetadataCache = {};

// Mock functions
export const debounce = jest.fn((fn) => fn);
export const normalizePath = jest.fn((path) => path);