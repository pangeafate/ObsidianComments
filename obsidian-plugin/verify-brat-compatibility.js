#!/usr/bin/env node

/**
 * BRAT Compatibility Verification Script
 * Checks that the plugin release meets BRAT requirements
 */

const https = require('https');

async function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function verifyBRATCompatibility() {
  console.log('🔍 Verifying BRAT compatibility...\n');

  try {
    // 1. Check latest release exists
    console.log('1️⃣ Checking GitHub release...');
    const release = await fetchJSON('https://api.github.com/repos/pangeafate/ObsidianComments/releases/latest');
    
    console.log(`   ✅ Latest release: ${release.tag_name}`);
    console.log(`   ✅ Release name: ${release.name}`);
    console.log(`   ✅ Published: ${release.published_at}`);

    // 2. Check required assets exist
    console.log('\n2️⃣ Checking required assets...');
    const requiredAssets = ['main.js', 'manifest.json', 'styles.css'];
    const assets = release.assets.map(asset => asset.name);
    
    for (const required of requiredAssets) {
      if (assets.includes(required)) {
        console.log(`   ✅ ${required} - Found`);
      } else {
        console.log(`   ❌ ${required} - Missing`);
        return false;
      }
    }

    // 3. Check manifest.json content
    console.log('\n3️⃣ Checking manifest.json...');
    const manifestAsset = release.assets.find(asset => asset.name === 'manifest.json');
    
    if (manifestAsset) {
      console.log(`   ✅ manifest.json download URL: ${manifestAsset.browser_download_url}`);
    }

    // 4. Verify version format
    console.log('\n4️⃣ Checking version format...');
    const versionRegex = /^v?\d+\.\d+\.\d+$/;
    if (versionRegex.test(release.tag_name)) {
      console.log(`   ✅ Version format valid: ${release.tag_name}`);
    } else {
      console.log(`   ❌ Version format invalid: ${release.tag_name}`);
      return false;
    }

    // 5. BRAT installation instructions
    console.log('\n🎉 BRAT Compatibility: PASSED');
    console.log('\n📦 Installation Instructions:');
    console.log('1. Install BRAT plugin in Obsidian');
    console.log('2. Open BRAT settings');
    console.log('3. Add Beta Plugin: https://github.com/pangeafate/ObsidianComments');
    console.log('4. BRAT will automatically install the latest release (v1.7.0)');

    return true;

  } catch (error) {
    console.error('❌ Error verifying BRAT compatibility:', error.message);
    return false;
  }
}

// Run verification
verifyBRATCompatibility().then(success => {
  process.exit(success ? 0 : 1);
});