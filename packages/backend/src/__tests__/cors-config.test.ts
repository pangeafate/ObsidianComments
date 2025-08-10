import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

describe('CORS Configuration', () => {
  it('should check if CORS configuration uses environment variable', () => {
    // Read the app.ts file
    const appPath = path.join(__dirname, '../app.ts');
    const appContent = fs.readFileSync(appPath, 'utf8');
    
    // Check if CORS_ORIGIN environment variable is being used
    const usesEnvVar = appContent.includes('process.env.CORS_ORIGIN');
    
    // Currently this will fail because CORS_ORIGIN is not used
    expect(usesEnvVar).toBe(true);
  });

  it('should parse CORS_ORIGIN as comma-separated values', () => {
    // Read the app.ts file
    const appPath = path.join(__dirname, '../app.ts');
    const appContent = fs.readFileSync(appPath, 'utf8');
    
    // Check if there's logic to split comma-separated values
    const hasSplitLogic = appContent.includes('.split') && appContent.includes('CORS_ORIGIN');
    
    // Should have logic to handle comma-separated origins
    expect(hasSplitLogic).toBe(true);
  });

  it('should combine environment and default origins', () => {
    // Read the app.ts file
    const appPath = path.join(__dirname, '../app.ts');
    const appContent = fs.readFileSync(appPath, 'utf8');
    
    // Check if app://obsidian.md is still included (for backwards compatibility)
    const hasObsidianOrigin = appContent.includes('app://obsidian.md');
    
    // Should maintain Obsidian desktop app support
    expect(hasObsidianOrigin).toBe(true);
  });
});