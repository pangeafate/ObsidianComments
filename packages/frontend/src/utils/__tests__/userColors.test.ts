import { generateUserColor, getUserColorVariables } from '../userColors';

describe('User Color Utilities', () => {
  describe('generateUserColor', () => {
    it('should generate consistent colors for the same user', () => {
      const userId = 'user-123';
      const color1 = generateUserColor(userId);
      const color2 = generateUserColor(userId);
      expect(color1).toBe(color2);
    });

    it('should generate different colors for different users', () => {
      const color1 = generateUserColor('user-1');
      const color2 = generateUserColor('user-2');
      const color3 = generateUserColor('user-3');
      
      expect(color1).not.toBe(color2);
      expect(color2).not.toBe(color3);
      expect(color1).not.toBe(color3);
    });

    it('should generate pastel colors', () => {
      const color = generateUserColor('test-user');
      expect(color).toMatch(/^hsl\(\d+,\s*\d+%,\s*\d+%\)$/);
      
      // Extract saturation and lightness
      const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
      expect(match).toBeTruthy();
      
      const saturation = parseInt(match![2]);
      const lightness = parseInt(match![3]);
      
      // Pastel colors should have moderate saturation and high lightness
      expect(saturation).toBeGreaterThanOrEqual(40);
      expect(saturation).toBeLessThanOrEqual(80);
      expect(lightness).toBeGreaterThanOrEqual(80);
      expect(lightness).toBeLessThanOrEqual(95);
    });
  });

  describe('getUserColorVariables', () => {
    it('should return CSS variables for user colors', () => {
      const userId = 'test-user';
      const variables = getUserColorVariables(userId);
      
      expect(variables).toHaveProperty('--user-color-bg');
      expect(variables).toHaveProperty('--user-color-border');
      expect(variables).toHaveProperty('--user-color-text');
      
      expect(variables['--user-color-bg']).toMatch(/^hsl\(/);
      expect(variables['--user-color-border']).toMatch(/^hsl\(/);
      expect(variables['--user-color-text']).toMatch(/^hsl\(/);
    });

    it('should generate darker border and text colors', () => {
      const userId = 'test-user';
      const variables = getUserColorVariables(userId);
      
      // Extract lightness values
      const bgMatch = variables['--user-color-bg'].match(/hsl\(\d+,\s*\d+%,\s*(\d+)%\)/);
      const borderMatch = variables['--user-color-border'].match(/hsl\(\d+,\s*\d+%,\s*(\d+)%\)/);
      const textMatch = variables['--user-color-text'].match(/hsl\(\d+,\s*\d+%,\s*(\d+)%\)/);
      
      const bgLightness = parseInt(bgMatch![1]);
      const borderLightness = parseInt(borderMatch![1]);
      const textLightness = parseInt(textMatch![1]);
      
      expect(borderLightness).toBeLessThan(bgLightness);
      expect(textLightness).toBeLessThan(borderLightness);
    });
  });
});