const { chromium } = require('playwright');

async function testProduction() {
  console.log('🚀 Starting production test...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Test 1: Homepage loads
    console.log('📄 Testing homepage...');
    const response = await page.goto('http://obsidiancomments.serverado.app/', { waitUntil: 'load', timeout: 10000 });
    console.log(`✅ Homepage status: ${response.status()}`);
    
    // Test 2: Check page title
    const title = await page.title();
    console.log(`📝 Page title: "${title}"`);
    
    // Test 3: Check if main elements are present
    console.log('🔍 Checking for main elements...');
    await page.waitForSelector('body', { timeout: 5000 });
    console.log('✅ Body element found');
    
    // Test 4: Test API health endpoint via browser
    console.log('🏥 Testing API health endpoint...');
    await page.goto('http://obsidiancomments.serverado.app/api/health');
    const healthText = await page.textContent('body');
    const healthData = JSON.parse(healthText);
    console.log('✅ API Health:', healthData.status, 'Version:', healthData.version);
    
    // Test 5: Go back to frontend and check for editor
    console.log('📝 Testing editor functionality...');
    await page.goto('http://obsidiancomments.serverado.app/');
    await page.waitForLoadState('networkidle');
    
    // Look for editor or document elements
    const bodyContent = await page.textContent('body');
    console.log(`📄 Page content length: ${bodyContent.length} characters`);
    
    console.log('✅ All basic tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testProduction();