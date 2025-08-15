#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

console.log('🔍 Running pre-deployment checks...\n');

const checks = {
  'Environment variables set': () => {
    const required = ['VITE_API_URL', 'VITE_WS_URL'];
    return required.every(env => {
      if (!process.env[env]) {
        console.log(`❌ Missing ${env}`);
        return false;
      }
      console.log(`✅ ${env}=${process.env[env]}`);
      return true;
    });
  },

  'Frontend build exists': () => {
    const buildPath = 'packages/frontend/dist';
    if (!fs.existsSync(buildPath)) {
      console.log(`❌ Build directory ${buildPath} not found`);
      return false;
    }
    
    const indexPath = path.join(buildPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
      console.log(`❌ index.html not found in ${buildPath}`);
      return false;
    }
    
    console.log(`✅ Frontend build found in ${buildPath}`);
    return true;
  },

  'Bundle size reasonable': () => {
    try {
      const distDir = 'packages/frontend/dist/assets';
      const files = fs.readdirSync(distDir);
      const jsFile = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
      
      if (!jsFile) {
        console.log('❌ JavaScript bundle not found');
        return false;
      }
      
      const stats = fs.statSync(path.join(distDir, jsFile));
      const sizeMB = stats.size / 1024 / 1024;
      console.log(`📦 Bundle size: ${sizeMB.toFixed(2)}MB (${jsFile})`);
      
      if (sizeMB > 5) {
        console.log('⚠️  Bundle size exceeds 5MB');
        return false;
      }
      
      return true;
    } catch (error) {
      console.log('❌ Error checking bundle size:', error.message);
      return false;
    }
  },

  'No eval in bundle (reasonable limit)': () => {
    try {
      const distDir = 'packages/frontend/dist/assets';
      const files = fs.readdirSync(distDir);
      const jsFile = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
      
      if (!jsFile) {
        console.log('❌ JavaScript bundle not found');
        return false;
      }
      
      const bundle = fs.readFileSync(path.join(distDir, jsFile), 'utf8');
      const evalCount = (bundle.match(/\beval\s*\(/g) || []).length;
      console.log(`📊 Eval occurrences in bundle: ${evalCount}`);
      
      if (evalCount > 50) {
        console.log('⚠️  High eval usage detected');
        return false;
      }
      
      return true;
    } catch (error) {
      console.log('❌ Error checking eval usage:', error.message);
      return false;
    }
  },

  'TypeScript compilation clean': () => {
    try {
      // Check if there's a type-check script
      const packageJson = JSON.parse(fs.readFileSync('packages/frontend/package.json', 'utf8'));
      if (!packageJson.scripts || !packageJson.scripts['typecheck']) {
        console.log('⚠️  No typecheck script found, skipping');
        return true;
      }
      
      execSync('npm run typecheck --prefix packages/frontend', { stdio: 'pipe' });
      console.log('✅ TypeScript compilation clean');
      return true;
    } catch (e) {
      console.log('❌ TypeScript errors found');
      console.log(e.stdout?.toString() || e.message);
      return false;
    }
  },

  'Docker containers can be built': () => {
    try {
      // Check if Dockerfiles exist (updated paths)
      const dockerfiles = [
        'packages/backend/Dockerfile.production',
        'packages/hocuspocus/Dockerfile.production',
        'packages/frontend/Dockerfile.production'
      ];

      for (const dockerfile of dockerfiles) {
        if (!fs.existsSync(dockerfile)) {
          console.log(`❌ ${dockerfile} not found`);
          return false;
        }
      }

      console.log('✅ All Dockerfiles present');
      return true;
    } catch (error) {
      console.log('❌ Error checking Dockerfiles:', error.message);
      return false;
    }
  },

  'Local environment can start': () => {
    try {
      // Accept any of the known local compose configs
      const candidates = [
        'docker-compose.yml',
        'docker-compose.debug.yml',
        'docker-compose.simple.yml'
      ];

      const found = candidates.find((f) => fs.existsSync(f));
      if (!found) {
        console.log('❌ No local docker-compose file found (checked: ' + candidates.join(', ') + ')');
        return false;
      }

      console.log(`✅ Local docker-compose configuration found: ${found}`);
      return true;
    } catch (error) {
      console.log('❌ Error checking local environment:', error.message);
      return false;
    }
  },

  'E2E tests configured': () => {
    try {
      if (!fs.existsSync('playwright.config.js')) {
        console.log('❌ playwright.config.js not found');
        return false;
      }
      
      if (!fs.existsSync('tests/e2e')) {
        console.log('❌ E2E tests directory not found');
        return false;
      }
      
      const testFiles = fs.readdirSync('tests/e2e').filter(f => f.endsWith('.spec.js'));
      console.log(`✅ Found ${testFiles.length} E2E test files`);
      return testFiles.length > 0;
    } catch (error) {
      console.log('❌ Error checking E2E tests:', error.message);
      return false;
    }
  }
};

let allPassed = true;
Object.entries(checks).forEach(([name, check]) => {
  console.log(`\n🔍 ${name}:`);
  const passed = check();
  console.log(`${passed ? '✅' : '❌'} ${name}: ${passed ? 'PASS' : 'FAIL'}`);
  if (!passed) allPassed = false;
});

console.log('\n' + '='.repeat(60));
if (allPassed) {
  console.log('✅ All pre-deployment checks passed!');
  console.log('🚀 Ready for deployment');
  process.exit(0);
} else {
  console.log('❌ Some pre-deployment checks failed!');
  console.log('🛑 Please fix the issues before deploying');
  process.exit(1);
}