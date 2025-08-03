/**
 * Generates a consistent pastel color for a user based on their ID
 */
export function generateUserColor(userId: string): string {
  // Create a simple hash from the userId
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert hash to a hue value (0-360)
  const hue = Math.abs(hash) % 360;
  
  // Use moderate saturation and high lightness for pastel colors
  const saturation = 60; // 60% saturation for soft but visible colors
  const lightness = 85;  // 85% lightness for pastel effect
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Generates CSS custom properties for user colors (background, border, text)
 */
export function getUserColorVariables(userId: string): Record<string, string> {
  // Create a simple hash from the userId
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert hash to a hue value (0-360)
  const hue = Math.abs(hash) % 360;
  
  return {
    '--user-color-bg': `hsl(${hue}, 60%, 85%)`,      // Light background
    '--user-color-border': `hsl(${hue}, 60%, 65%)`,  // Medium border
    '--user-color-text': `hsl(${hue}, 60%, 45%)`     // Dark text
  };
}

/**
 * List of predefined pastel colors for quick assignment
 */
export const PREDEFINED_PASTEL_COLORS = [
  'hsl(0, 60%, 85%)',    // Pastel red
  'hsl(30, 60%, 85%)',   // Pastel orange
  'hsl(60, 60%, 85%)',   // Pastel yellow
  'hsl(90, 60%, 85%)',   // Pastel lime
  'hsl(120, 60%, 85%)',  // Pastel green
  'hsl(150, 60%, 85%)',  // Pastel mint
  'hsl(180, 60%, 85%)',  // Pastel cyan
  'hsl(210, 60%, 85%)',  // Pastel sky blue
  'hsl(240, 60%, 85%)',  // Pastel blue
  'hsl(270, 60%, 85%)',  // Pastel purple
  'hsl(300, 60%, 85%)',  // Pastel magenta
  'hsl(330, 60%, 85%)',  // Pastel pink
];

/**
 * Gets a color from predefined list or generates one
 */
export function getUserColor(userId: string, index?: number): string {
  if (index !== undefined && index < PREDEFINED_PASTEL_COLORS.length) {
    return PREDEFINED_PASTEL_COLORS[index];
  }
  return generateUserColor(userId);
}