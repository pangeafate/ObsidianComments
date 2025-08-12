/**
 * TypeScript Type Definitions for Obsidian Comments Plugin
 * 
 * Following TDD: These types are the minimal implementation to make tests pass.
 * They will be expanded as tests require more functionality.
 */

export interface ShareResponse {
  shareUrl: string;
  viewUrl?: string;
  editUrl?: string;
  shareId: string;
  createdAt?: string;
  permissions?: string;
}

export interface UpdateResponse {
  shareId: string;
  updatedAt: string;
  version?: number;
}

export interface ShareListResponse {
  shares: ShareInfo[];
  total: number;
}

export interface ShareInfo {
  shareId: string;
  title: string;
  shareUrl: string;
  createdAt: string;
  updatedAt: string;
  permissions: string;
  views: number;
  editors: number;
}

export interface AuthTestResponse {
  valid: boolean;
  user?: {
    id: string;
    email: string;
  };
  limits?: {
    maxShares: number;
    currentShares: number;
  };
}

export interface PluginSettings {
  apiKey: string;
  serverUrl: string;
  copyToClipboard: boolean;
  showNotifications: boolean;
  defaultPermissions: 'view' | 'edit';
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ApiClientConfig {
  apiKey: string;
  serverUrl: string;
  timeout?: number;
}

export interface ShareMetadata {
  shareId: string;
  sharedAt: string;
  permissions?: string;
}

export interface ShareResult {
  shareUrl: string;
  shareId: string;
  updatedContent: string;
  wasUpdate?: boolean;
}