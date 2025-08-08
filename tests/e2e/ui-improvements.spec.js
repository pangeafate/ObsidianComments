/**
 * TDD Test Suite for UI Improvements
 * 
 * Comprehensive tests to verify dashboard layout separation and button consistency
 * Following Test-Driven Development approach:
 * 1. Write tests first (failing tests)
 * 2. Implement features to make tests pass
 * 3. Refactor and improve
 */

const { test, expect } = require('@playwright/test');

// Helper to create a test document
async function createTestDocument(request) {
  const response = await request.post('http://localhost:8081/api/notes/share', {
    data: {
      title: 'UI Test Document',
      content: 'Content for UI testing'
    }
  });
  
  expect(response.ok()).toBeTruthy();
  const result = await response.json();
  return result;
}

// Helper to wait for editor to be fully loaded
async function waitForEditorReady(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('.ProseMirror', { timeout: 10000 });
  // Wait for dashboard section to be visible (indicates header is fully loaded)
  await page.waitForSelector('[data-testid="dashboard-section"]', { timeout: 10000 });
  
  // Set a name to ensure user presence shows up
  const nameInput = page.locator('input[placeholder="Enter your name..."]');
  if (await nameInput.isVisible()) {
    await nameInput.fill('Test User');
    await nameInput.press('Enter');
    await page.waitForTimeout(1000); // Wait for user presence to appear
  }
}

test.describe('UI Improvements (TDD)', () => {
  
  test('should have dashboard section with proper data-testid attributes', async ({ page, request }) => {
    console.log('🎨 Testing dashboard section identification in editor');
    
    const doc = await createTestDocument(request);
    await page.goto(`http://localhost:8083/editor/${doc.shareId}`);
    await waitForEditorReady(page);
    
    // Test: Dashboard section should exist with proper testid
    const dashboardSection = page.locator('[data-testid="dashboard-section"]');
    await expect(dashboardSection).toBeVisible({ timeout: 10000 });
    
    // Test: Dashboard should contain user presence
    const userPresence = dashboardSection.locator('[data-testid="user-presence"]');
    await expect(userPresence).toBeVisible();
    
    // Test: Dashboard should contain connection status
    const connectionStatus = dashboardSection.locator('[data-testid="connection-status"]');
    await expect(connectionStatus).toBeVisible();
    
    // Test: Dashboard should contain mode indicator
    const modeIndicator = dashboardSection.locator('[data-testid="mode-indicator"]');
    await expect(modeIndicator).toBeVisible();
    
    console.log('✅ Dashboard section structure test passed');
  });

  test('should have action buttons section separate from dashboard', async ({ page, request }) => {
    console.log('🎨 Testing button section separation in editor');
    
    const doc = await createTestDocument(request);
    await page.goto(`http://localhost:8083/editor/${doc.shareId}`);
    await waitForEditorReady(page);
    
    // Test: Button section should exist with proper testid
    const buttonSection = page.locator('[data-testid="button-section"]');
    await expect(buttonSection).toBeVisible({ timeout: 10000 });
    
    // Test: Button section should contain action buttons
    const commentsButton = buttonSection.locator('button:has-text("Comments")');
    await expect(commentsButton).toBeVisible();
    
    const myLinksButton = buttonSection.locator('button:has-text("My Links"), button:has-text("Links")');
    await expect(myLinksButton).toBeVisible();
    
    const newNoteButton = buttonSection.locator('button:has-text("New Note")');
    await expect(newNoteButton).toBeVisible();
    
    const viewButton = buttonSection.locator('button:has-text("View")');
    await expect(viewButton).toBeVisible();
    
    console.log('✅ Button section structure test passed');
  });

  test('should have visual separation between dashboard and buttons', async ({ page, request }) => {
    console.log('🎨 Testing visual separation between sections');
    
    const doc = await createTestDocument(request);
    await page.goto(`http://localhost:8083/editor/${doc.shareId}`);
    await waitForEditorReady(page);
    
    const dashboardSection = page.locator('[data-testid="dashboard-section"]');
    const buttonSection = page.locator('[data-testid="button-section"]');
    
    // Test: Sections should be visually separated (different layout containers)
    const dashboardBox = await dashboardSection.boundingBox();
    const buttonBox = await buttonSection.boundingBox();
    
    expect(dashboardBox).toBeTruthy();
    expect(buttonBox).toBeTruthy();
    
    // Test: Dashboard should have distinct styling from buttons
    const dashboardClass = await dashboardSection.getAttribute('class');
    const buttonClass = await buttonSection.getAttribute('class');
    
    expect(dashboardClass).not.toBe(buttonClass);
    
    // Test: There should be visual spacing between sections
    if (dashboardBox && buttonBox) {
      // Either horizontally or vertically separated
      const hasHorizontalSeparation = Math.abs(dashboardBox.x + dashboardBox.width - buttonBox.x) > 10;
      const hasVerticalSeparation = Math.abs(dashboardBox.y + dashboardBox.height - buttonBox.y) > 10;
      
      expect(hasHorizontalSeparation || hasVerticalSeparation).toBeTruthy();
    }
    
    console.log('✅ Visual separation test passed');
  });

  test('should have consistent button heights in action section', async ({ page, request }) => {
    console.log('🎨 Testing button consistency in editor');
    
    const doc = await createTestDocument(request);
    await page.goto(`http://localhost:8083/editor/${doc.shareId}`);
    await waitForEditorReady(page);
    
    const buttonSection = page.locator('[data-testid="button-section"]');
    const actionButtons = buttonSection.locator('button');
    
    const buttonCount = await actionButtons.count();
    expect(buttonCount).toBeGreaterThan(0);
    
    // Test: All action buttons should have consistent height
    const firstButtonBox = await actionButtons.first().boundingBox();
    expect(firstButtonBox).toBeTruthy();
    
    if (firstButtonBox) {
      for (let i = 1; i < buttonCount; i++) {
        const buttonBox = await actionButtons.nth(i).boundingBox();
        if (buttonBox) {
          // Buttons should have same height (within 2px tolerance for sub-pixel rendering)
          const heightDiff = Math.abs(buttonBox.height - firstButtonBox.height);
          expect(heightDiff).toBeLessThanOrEqual(2);
        }
      }
    }
    
    console.log('✅ Button height consistency test passed');
  });

  test('should have consistent button padding classes', async ({ page, request }) => {
    console.log('🎨 Testing button padding consistency');
    
    const doc = await createTestDocument(request);
    await page.goto(`http://localhost:8083/editor/${doc.shareId}`);
    await waitForEditorReady(page);
    
    const buttonSection = page.locator('[data-testid="button-section"]');
    const actionButtons = buttonSection.locator('button');
    
    const buttonCount = await actionButtons.count();
    
    // Test: All action buttons should have consistent padding classes
    for (let i = 0; i < buttonCount; i++) {
      const button = actionButtons.nth(i);
      const buttonClass = await button.getAttribute('class');
      
      // Should have standardized padding
      expect(buttonClass).toMatch(/px-3/); // Horizontal padding
      expect(buttonClass).toMatch(/py-2/); // Vertical padding
      
      // Should have basic button styling
      expect(buttonClass).toContain('rounded-md');
      expect(buttonClass).toContain('text-sm');
      expect(buttonClass).toContain('font-medium');
      expect(buttonClass).toContain('transition-colors');
    }
    
    console.log('✅ Button padding consistency test passed');
  });

  test('should maintain color schemes while having consistent styling', async ({ page, request }) => {
    console.log('🎨 Testing color scheme preservation with consistency');
    
    const doc = await createTestDocument(request);
    await page.goto(`http://localhost:8083/editor/${doc.shareId}`);
    await waitForEditorReady(page);
    
    const buttonSection = page.locator('[data-testid="button-section"]');
    
    // Test: Comments button should have proper color scheme (gray when inactive)
    const commentsButton = buttonSection.locator('button:has-text("Comments")');
    const commentsClass = await commentsButton.getAttribute('class');
    // Should be gray when inactive or blue when active
    expect(commentsClass).toMatch(/bg-blue-|bg-gray-/);
    
    // Test: My Links button should have proper color scheme (gray when inactive)
    const myLinksButton = buttonSection.locator('button:has-text("My Links"), button:has-text("Links")');
    const myLinksClass = await myLinksButton.getAttribute('class');
    // Should be gray when inactive or purple when active
    expect(myLinksClass).toMatch(/bg-purple-|bg-gray-/);
    
    // Test: New Note button should maintain green color scheme
    const newNoteButton = buttonSection.locator('button:has-text("New Note")');
    const newNoteClass = await newNoteButton.getAttribute('class');
    expect(newNoteClass).toMatch(/bg-green-/);
    
    // Test: View button should maintain green color scheme
    const viewButton = buttonSection.locator('button:has-text("View")');
    const viewClass = await viewButton.getAttribute('class');
    expect(viewClass).toMatch(/bg-green-/);
    
    console.log('✅ Color scheme preservation test passed');
  });

  test('should have proper dashboard layout in view mode', async ({ page, request }) => {
    console.log('🎨 Testing view mode dashboard layout');
    
    const doc = await createTestDocument(request);
    await page.goto(`http://localhost:8083/view/${doc.shareId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.prose', { timeout: 10000 });
    
    // Test: Dashboard section should exist in view mode
    const dashboardSection = page.locator('[data-testid="dashboard-section"]');
    await expect(dashboardSection).toBeVisible({ timeout: 10000 });
    
    // Test: View mode should show mode indicator
    const viewModeIndicator = dashboardSection.locator('[data-testid="mode-indicator"]');
    await expect(viewModeIndicator).toBeVisible();
    await expect(viewModeIndicator).toHaveText(/View Mode/);
    
    // Test: Button section should exist in view mode
    const buttonSection = page.locator('[data-testid="button-section"]');
    await expect(buttonSection).toBeVisible();
    
    // Test: Edit button should be present with consistent styling
    const editButton = buttonSection.locator('button:has-text("Edit")');
    await expect(editButton).toBeVisible();
    
    const buttonClass = await editButton.getAttribute('class');
    expect(buttonClass).toMatch(/px-3/); // Consistent horizontal padding
    expect(buttonClass).toMatch(/py-2/); // Consistent vertical padding
    expect(buttonClass).toContain('rounded-md');
    expect(buttonClass).toContain('text-sm');
    expect(buttonClass).toContain('font-medium');
    
    console.log('✅ View mode dashboard layout test passed');
  });

  test('should have minimalistic button styling without excessive visual elements', async ({ page, request }) => {
    console.log('🎨 Testing minimalistic button design');
    
    const doc = await createTestDocument(request);
    await page.goto(`http://localhost:8083/editor/${doc.shareId}`);
    await waitForEditorReady(page);
    
    const buttonSection = page.locator('[data-testid="button-section"]');
    const actionButtons = buttonSection.locator('button');
    
    const buttonCount = await actionButtons.count();
    
    // Test: Buttons should have minimal, clean styling
    for (let i = 0; i < buttonCount; i++) {
      const button = actionButtons.nth(i);
      const buttonClass = await button.getAttribute('class');
      
      // Should not have excessive decorative elements
      expect(buttonClass).not.toContain('shadow-lg');
      expect(buttonClass).not.toContain('border-4');
      expect(buttonClass).not.toContain('ring-');
      
      // Should have clean, minimal appearance
      expect(buttonClass).toContain('rounded-md'); // Not rounded-full or rounded-3xl
      expect(buttonClass).toMatch(/text-sm|text-xs/); // Reasonable text size
    }
    
    console.log('✅ Minimalistic button design test passed');
  });

  test('should have responsive layout for mobile devices', async ({ page, request }) => {
    console.log('🎨 Testing responsive dashboard layout');
    
    const doc = await createTestDocument(request);
    await page.goto(`http://localhost:8083/editor/${doc.shareId}`);
    await waitForEditorReady(page);
    
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000); // Wait for responsive changes
    
    const dashboardSection = page.locator('[data-testid="dashboard-section"]');
    const buttonSection = page.locator('[data-testid="button-section"]');
    
    await expect(dashboardSection).toBeVisible();
    await expect(buttonSection).toBeVisible();
    
    // Test: Both sections should remain functional on mobile
    const commentsButton = buttonSection.locator('button:has-text("Comments")');
    await expect(commentsButton).toBeVisible();
    
    // Test: Mobile-specific text should appear (e.g., "Links" instead of "My Links")
    const compactTextButtons = buttonSection.locator('button:has-text("Links")');
    const mobileButtonCount = await compactTextButtons.count();
    
    // Should have either "My Links" or "Links" visible
    const fullTextButtons = buttonSection.locator('button:has-text("My Links")');
    const fullButtonCount = await fullTextButtons.count();
    
    expect(mobileButtonCount + fullButtonCount).toBeGreaterThan(0);
    
    console.log('✅ Responsive layout test passed');
  });
});

console.log('🧪 UI Improvements Test Suite Loaded!');