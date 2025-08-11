/**
 * API Client - Minimal TDD Implementation
 * 
 * Following TDD: This is the minimal code to make tests pass.
 * Will be expanded as tests require more functionality.
 */

import { 
  ApiClientConfig, 
  ShareResponse, 
  UpdateResponse, 
  ShareListResponse, 
  AuthTestResponse 
} from './types';

export class ApiClient {
  private config: ApiClientConfig;
  private timeout: number;

  constructor(config: ApiClientConfig) {
    // API key is optional for now (authentication not implemented yet)
    if (config.apiKey && config.apiKey.trim() === '') {
      config = { ...config, apiKey: '' };
    }

    try {
      new URL(config.serverUrl);
    } catch {
      throw new Error('Invalid server URL');
    }

    this.config = config;
    this.timeout = config.timeout || 5000;
  }

  get settings() {
    return this.config;
  }

  async shareNote(content: string, title?: string, shareId?: string): Promise<ShareResponse> {
    const url = `${this.config.serverUrl}/api/notes/share`;
    
    // Use provided title or fallback to 'Untitled Document'
    const extractedTitle = title || 'Untitled Document';
    
    try {
      const requestBody: any = { 
        content,
        title: extractedTitle
      };
      
      // Include shareId for database persistence if provided
      if (shareId) {
        requestBody.shareId = shareId;
      }
      
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data = await response.json();
      return {
        shareUrl: data.shareUrl, // Backend now consistently returns shareUrl
        shareId: data.shareId,
        createdAt: data.createdAt || new Date().toISOString(),
        permissions: data.permissions || 'edit'
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Request timeout') {
        throw error;
      }
      if (error instanceof Error && error.message.includes('Network')) {
        throw new Error('Failed to connect to sharing service. Please check your internet connection.');
      }
      throw error;
    }
  }


  async updateNote(shareId: string, content: string): Promise<UpdateResponse> {
    const url = `${this.config.serverUrl}/api/notes/${shareId}`;
    
    const response = await this.makeRequest(url, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ content })
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const data = await response.json();
    return {
      shareId: data.shareId,
      updatedAt: data.updatedAt,
      version: data.version
    };
  }

  async getSharedNote(shareId: string): Promise<any> {
    const url = `${this.config.serverUrl}/api/notes/${shareId}`;
    
    const response = await this.makeRequest(url, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    return await response.json();
  }

  async deleteShare(shareId: string): Promise<void> {
    const url = `${this.config.serverUrl}/api/notes/${shareId}`;
    
    const response = await this.makeRequest(url, {
      method: 'DELETE',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }
  }

  async listShares(): Promise<ShareListResponse> {
    const url = `${this.config.serverUrl}/api/notes`;
    
    const response = await this.makeRequest(url, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const data = await response.json();
    return {
      shares: data.shares || [],
      total: data.total || 0
    };
  }

  async testConnection(): Promise<AuthTestResponse> {
    const url = `${this.config.serverUrl}/api/auth/test`;
    
    const response = await this.makeRequest(url, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    const data = await response.json();
    return {
      valid: data.valid,
      user: data.user,
      limits: data.limits
    };
  }

  private async makeRequest(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        credentials: 'omit', // Don't send credentials to avoid CORS complications
        mode: 'cors' // Explicitly set CORS mode
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw new Error('Network error');
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'ObsidianComments/1.0.0'
    };

    // Add authorization header only if API key is provided
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: 'Unknown error' };
    }

    switch (response.status) {
      case 401:
        throw new Error('API key is invalid or expired');
      case 404:
        throw new Error('Shared note not found. It may have been deleted.');
      case 429:
        throw new Error('Too many requests. Please wait before trying again.');
      case 500:
        throw new Error('Server error. Please try again later.');
      default:
        throw new Error(errorData.message || `HTTP ${response.status} error`);
    }
  }
}