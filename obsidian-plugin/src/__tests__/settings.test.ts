import { ShareNoteSettings, DEFAULT_SETTINGS } from '../settings';

describe('ShareNote Settings', () => {
  describe('DEFAULT_SETTINGS', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_SETTINGS).toEqual({
        backendUrl: 'https://obsidiancomments.serverado.app',
        copyToClipboard: true,
        showNotifications: true,
        openInBrowser: false
      });
    });
  });

  describe('Settings validation', () => {
    it('should accept valid settings', () => {
      const validSettings: ShareNoteSettings = {
        backendUrl: 'https://my-backend.com',
        copyToClipboard: false,
        showNotifications: true,
        openInBrowser: true
      };

      expect(validSettings.backendUrl).toBe('https://my-backend.com');
      expect(validSettings.copyToClipboard).toBe(false);
      expect(validSettings.showNotifications).toBe(true);
      expect(validSettings.openInBrowser).toBe(true);
    });

    it('should handle empty backend URL', () => {
      const settings: ShareNoteSettings = {
        ...DEFAULT_SETTINGS,
        backendUrl: ''
      };

      expect(settings.backendUrl).toBe('');
    });
  });
});