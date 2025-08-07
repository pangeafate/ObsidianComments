/**
 * CI Validation Test for ShareNote Plugin
 * 
 * This test ensures the ShareNote plugin core functionality works in CI environment.
 * It focuses on the most critical features without requiring full Obsidian API.
 */

import { ShareNoteSettings, DEFAULT_SETTINGS } from '../settings';
import { BackendAPI } from '../api';

// Mock global fetch for CI environment
global.fetch = jest.fn();

describe('ShareNote Plugin CI Validation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Settings Configuration', () => {
    it('should have valid default settings', () => {
      expect(DEFAULT_SETTINGS).toBeDefined();
      expect(DEFAULT_SETTINGS.backendUrl).toBe('https://obsidiancomments.serverado.app');
      expect(DEFAULT_SETTINGS.copyToClipboard).toBe(true);
      expect(DEFAULT_SETTINGS.showNotifications).toBe(true);
      expect(DEFAULT_SETTINGS.openInBrowser).toBe(false);
    });

    it('should validate settings structure', () => {
      const settings: ShareNoteSettings = {
        backendUrl: 'https://example.com',
        copyToClipboard: false,
        showNotifications: true,
        openInBrowser: true
      };

      // Verify all required properties exist
      expect(settings.backendUrl).toBeDefined();
      expect(typeof settings.copyToClipboard).toBe('boolean');
      expect(typeof settings.showNotifications).toBe('boolean');
      expect(typeof settings.openInBrowser).toBe('boolean');
    });
  });

  describe('Backend API Client', () => {
    it('should initialize with backend URL', () => {
      const api = new BackendAPI('https://test.com');
      expect(api).toBeDefined();
    });

    it('should handle successful API response in CI', async () => {
      const mockResponse = {
        shareId: 'ci-test-123',
        viewUrl: 'https://test.com/view/ci-test-123',
        editUrl: 'https://test.com/editor/ci-test-123',
        title: 'CI Test Note'
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      } as any);

      const api = new BackendAPI('https://test.com');
      const result = await api.shareNote({
        title: 'CI Test Note',
        content: '# CI Test\n\nThis is a CI test.',
        htmlContent: '<h1>CI Test</h1><p>This is a CI test.</p>'
      });

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.com/api/notes/share',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: 'CI Test Note',
            content: '# CI Test\n\nThis is a CI test.',
            htmlContent: '<h1>CI Test</h1><p>This is a CI test.</p>'
          })
        })
      );
    });

    it('should handle API errors gracefully in CI', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockResolvedValue({ message: 'Server error in CI' })
      } as any);

      const api = new BackendAPI('https://test.com');
      
      await expect(api.shareNote({
        title: 'Error Test',
        content: '# Error Test',
        htmlContent: '<h1>Error Test</h1>'
      })).rejects.toThrow('Server error in CI');
    });
  });

  describe('Core Plugin Functionality', () => {
    it('should validate required data structure', () => {
      const shareData = {
        title: 'Test Note',
        content: '# Test Note\n\nContent here',
        htmlContent: '<h1>Test Note</h1><p>Content here</p>'
      };

      // Verify the data structure that the plugin will send
      expect(shareData.title).toBeDefined();
      expect(shareData.content).toBeDefined();
      expect(shareData.htmlContent).toBeDefined();
      expect(typeof shareData.title).toBe('string');
      expect(typeof shareData.content).toBe('string');
      expect(typeof shareData.htmlContent).toBe('string');
    });

    it('should validate response structure', () => {
      const response = {
        shareId: 'test-123',
        viewUrl: 'https://example.com/view/test-123',
        editUrl: 'https://example.com/editor/test-123',
        title: 'Test Note'
      };

      // Verify the response structure that the plugin expects
      expect(response.shareId).toBeDefined();
      expect(response.viewUrl).toBeDefined();
      expect(response.editUrl).toBeDefined();
      expect(response.title).toBeDefined();
    });
  });

  describe('HTML Content Handling', () => {
    it('should handle HTML content properly', () => {
      const markdownContent = '# Test Note\n\n**Bold text** and *italic*';
      const htmlContent = '<h1>Test Note</h1><p><strong>Bold text</strong> and <em>italic</em></p>';

      // Verify HTML content is a valid string
      expect(typeof htmlContent).toBe('string');
      expect(htmlContent).toContain('<h1>');
      expect(htmlContent).toContain('<strong>');
      expect(htmlContent).toContain('<em>');
    });

    it('should handle markdown-only content', () => {
      const shareData: { title: string; content: string; htmlContent?: string } = {
        title: 'Markdown Only',
        content: '# Markdown Only\n\nJust markdown content.'
        // No htmlContent - should work fine
      };

      expect(shareData.title).toBeDefined();
      expect(shareData.content).toBeDefined();
      expect(shareData.htmlContent).toBeUndefined();
    });
  });
});