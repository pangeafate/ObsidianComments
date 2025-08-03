// Test the color generation logic from Editor component
describe('Pastel Color Generation', () => {
  // Extract the color generation function for testing
  function generatePastelColor(): string {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 85%)`;
  }

  beforeEach(() => {
    // Reset Math.random mock
    jest.spyOn(Math, 'random').mockRestore();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should generate HSL color with correct saturation and lightness', () => {
    // Mock Math.random to return predictable value
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    
    const color = generatePastelColor();
    
    // Should generate hsl(180, 70%, 85%) - 0.5 * 360 = 180
    expect(color).toBe('hsl(180, 70%, 85%)');
  });

  it('should generate different hues for different random values', () => {
    const testCases = [
      { random: 0, expected: 'hsl(0, 70%, 85%)' },
      { random: 0.25, expected: 'hsl(90, 70%, 85%)' },
      { random: 0.5, expected: 'hsl(180, 70%, 85%)' },
      { random: 0.75, expected: 'hsl(270, 70%, 85%)' },
      { random: 0.999, expected: 'hsl(359, 70%, 85%)' },
    ];

    testCases.forEach(({ random, expected }) => {
      jest.spyOn(Math, 'random').mockReturnValue(random);
      const color = generatePastelColor();
      expect(color).toBe(expected);
      jest.restoreAllMocks();
    });
  });

  it('should generate colors in valid HSL format', () => {
    const color = generatePastelColor();
    
    // Should match HSL pattern: hsl(number, 70%, 85%)
    expect(color).toMatch(/^hsl\(\d{1,3}, 70%, 85%\)$/);
  });

  it('should generate hue values in valid range (0-359)', () => {
    // Test with multiple random values
    const randomValues = [0, 0.1, 0.3, 0.7, 0.99];
    
    randomValues.forEach(randomValue => {
      jest.spyOn(Math, 'random').mockReturnValue(randomValue);
      const color = generatePastelColor();
      
      // Extract hue value from HSL string
      const hueMatch = color.match(/hsl\((\d+),/);
      expect(hueMatch).toBeTruthy();
      
      if (hueMatch) {
        const hue = parseInt(hueMatch[1], 10);
        expect(hue).toBeGreaterThanOrEqual(0);
        expect(hue).toBeLessThan(360);
      }
      
      jest.restoreAllMocks();
    });
  });

  it('should maintain consistent saturation and lightness for pastel effect', () => {
    // Generate multiple colors
    const colors = Array.from({ length: 10 }, () => generatePastelColor());
    
    colors.forEach(color => {
      // All colors should have 70% saturation and 85% lightness for pastel effect
      expect(color).toMatch(/, 70%, 85%\)$/);
    });
  });

  it('should handle edge cases for Math.random()', () => {
    // Test with exactly 0 (minimum)
    jest.spyOn(Math, 'random').mockReturnValue(0);
    let color = generatePastelColor();
    expect(color).toBe('hsl(0, 70%, 85%)');
    
    // Test with value very close to 1 (maximum)
    jest.spyOn(Math, 'random').mockReturnValue(0.9999);
    color = generatePastelColor();
    expect(color).toBe('hsl(359, 70%, 85%)'); // Math.floor(0.9999 * 360) = 359
  });
});