/**
 * Browser Debug Script - Check what's actually happening in the browser
 */

const { chromium } = require('playwright');

async function debugBrowser() {
  console.log('🔍 Starting browser debug session...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen for all events
  page.on('console', msg => {
    console.log(`🖥️  CONSOLE [${msg.type()}]: ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.log(`🚨 PAGE ERROR: ${error.message}`);
  });
  
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`❌ FAILED REQUEST: ${response.status()} ${response.url()}`);
    } else if (response.url().includes('assets')) {
      console.log(`✅ ASSET LOADED: ${response.url()}`);
    }
  });
  
  try {
    console.log('📍 Navigating to editor page...');
    await page.goto('http://localhost:3001/edit/browser-debug-test');
    
    console.log('⏳ Waiting for load...');
    await page.waitForLoadState('networkidle');
    
    console.log('🔍 Checking page state...');
    
    // Check if React app loaded
    const rootContent = await page.locator('#root').innerHTML();
    console.log(`📦 Root content length: ${rootContent.length}`);
    
    if (rootContent.trim().length === 0) {
      console.log('❌ React app NOT loaded - root div is empty');
    } else {
      console.log('✅ React app loaded - root div has content');
      console.log(`📄 First 200 chars: ${rootContent.substring(0, 200)}...`);
    }
    
    // Check for specific components
    const hasEditor = await page.locator('.ProseMirror').isVisible().catch(() => false);
    const hasUserPopup = await page.locator('input[placeholder="Enter your name"]').isVisible().catch(() => false);
    const hasHeader = await page.locator('h1').isVisible().catch(() => false);
    
    console.log(`📝 Editor visible: ${hasEditor}`);
    console.log(`👤 User popup visible: ${hasUserPopup}`);
    console.log(`📰 Header visible: ${hasHeader}`);
    
    // Check for JavaScript errors in console
    const jsErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(3000);
    
    console.log('\n📊 FINAL SUMMARY:');
    console.log(`- React App Loaded: ${rootContent.length > 0}`);
    console.log(`- Editor Component: ${hasEditor}`);
    console.log(`- JavaScript Errors: ${jsErrors.length}`);
    
    if (jsErrors.length > 0) {
      console.log('🚨 JavaScript Errors Found:');
      jsErrors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
    }
    
    console.log('\n⏳ Keeping browser open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.log(`❌ Debug failed: ${error.message}`);
  }
  
  await browser.close();
}

debugBrowser().catch(console.error);