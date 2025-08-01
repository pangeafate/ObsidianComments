# Obsidian Comments Plugin - Development Plan for Claude Code

## Plugin Overview

**Plugin Name**: Obsidian Comments  
**Plugin ID**: obsidian-comments  
**Description**: Share individual notes online for collaborative editing  
**Repository**: https://github.com/pangeafate/ObsidianComments/obsidian-plugin

## Quick Start with BRAT (macOS)

### Prerequisites
- Obsidian installed with at least one vault
- Node.js 16+ installed (`brew install node` if needed)
- Git configured with GitHub access
- BRAT plugin installed in Obsidian

### 5-Minute Setup
```bash
# 1. Clone and setup
cd ~/Developer
git clone https://github.com/pangeafate/ObsidianComments.git
cd ObsidianComments/obsidian-plugin

# 2. Install dependencies and build
npm install
npm run build

# 3. Commit built files (required for BRAT)
git add main.js manifest.json styles.css
git commit -m "build: initial plugin"
git push origin main

# 4. Open Obsidian → Settings → BRAT → Add Beta Plugin
# 5. Enter: https://github.com/pangeafate/ObsidianComments
# 6. Enable the plugin in Community Plugins
```

## Recommended BRAT Development Flow

### Daily Development Workflow

1. **Start your development session**:
```bash
# Terminal 1: Watch tests
cd ~/Developer/ObsidianComments/obsidian-plugin
npm run test:watch

# Terminal 2: Watch builds
npm run dev
```

2. **Make changes following TDD**:
   - Write test first
   - See it fail
   - Write code
   - See test pass

3. **Test locally** (two options):

   **Option A: Quick Local Test** (Recommended for rapid iteration)
   ```bash
   # Use the dev-sync.sh script created during setup
   ./dev-sync.sh
   # Then Cmd+R in Obsidian
   ```

   **Option B: Full BRAT Update** (For testing the full flow)
   ```bash
   git add main.js manifest.json styles.css
   git commit -m "feat: add new feature"
   git push origin main
   # In Obsidian: BRAT → Check for updates
   # Cmd+R to reload
   ```

4. **Debug if needed**:
   - Open console: `Cmd+Option+I`
   - Check for errors
   - Use console.log for debugging

### Best Practices for BRAT Development

1. **Always commit built files**:
   ```bash
   # After any feature completion
   npm run build
   git add main.js manifest.json styles.css
   git commit -m "build: update plugin"
   git push
   ```

2. **Use meaningful commit messages**:
   - `test: add tests for share functionality`
   - `feat: implement note sharing`
   - `build: update plugin build`
   - `fix: resolve API connection issue`

3. **Tag releases for users**:
   ```bash
   npm version patch  # Updates version in manifest.json
   git push --tags
   # BRAT users get notified of new version
   ```

### Initial Setup Commands (macOS)
```bash
# Clone repository to your preferred location
cd ~/Developer  # or ~/Documents/Code, wherever you prefer
git clone https://github.com/pangeafate/ObsidianComments.git
cd ObsidianComments/obsidian-plugin

# Install Obsidian plugin development dependencies
npm init -y
npm install -D @types/node obsidian tslib typescript
npm install -D esbuild @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D jest @types/jest ts-jest

# Create TypeScript config
touch tsconfig.json

# Create build config
touch esbuild.config.mjs

# Create test config
touch jest.config.js

# Make the initial build for BRAT
npm run build

# Important: Commit the built files for BRAT to work
git add main.js manifest.json styles.css
git commit -m "build: initial plugin build for BRAT"
git push origin main
```

## Project Structure

```
obsidian-plugin/
├── __tests__/
│   ├── main.test.ts
│   ├── settings.test.ts
│   ├── api-client.test.ts
│   └── share-manager.test.ts
├── src/
│   ├── main.ts           # Plugin entry point
│   ├── settings.ts       # Settings tab
│   ├── api-client.ts     # Server communication
│   ├── share-manager.ts  # Share state management
│   ├── constants.ts      # Configuration
│   └── types.ts          # TypeScript interfaces
├── styles.css            # Plugin styles
├── manifest.json         # Plugin manifest
├── versions.json         # Version history
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
└── jest.config.js
```

## Phase 1: Project Configuration (Week 1, Day 1)

### 1.1 Create manifest.json
```json
{
  "id": "obsidian-comments",
  "name": "Obsidian Comments",
  "version": "1.0.0",
  "minAppVersion": "1.0.0",
  "description": "Share notes online for collaborative editing with comments",
  "author": "Your Name",
  "authorUrl": "https://github.com/pangeafate",
  "fundingUrl": "https://github.com/sponsors/pangeafate",
  "isDesktopOnly": false
}
```

### 1.2 Create versions.json
```json
{
  "1.0.0": "1.0.0"
}
```

### 1.3 TypeScript Configuration (tsconfig.json)
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "inlineSourceMap": true,
    "inlineSources": true,
    "module": "ESNext",
    "target": "ES6",
    "allowJs": true,
    "noImplicitAny": true,
    "moduleResolution": "node",
    "importHelpers": true,
    "isolatedModules": true,
    "strictNullChecks": true,
    "lib": ["DOM", "ES5", "ES6", "ES7"]
  },
  "include": ["**/*.ts"]
}
```

### 1.4 Build Configuration (esbuild.config.mjs)
```javascript
import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const banner = `/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
*/`;

const prod = (process.argv[2] === "production");

const context = await esbuild.context({
  banner: {
    js: banner,
  },
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtins
  ],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
```

### 1.5 Package.json Scripts
```json
{
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "version": "node version-bump.mjs && git add manifest.json versions.json"
  }
}
```

## Phase 2: TDD Implementation Plan (Week 1, Days 2-5)

### Day 2: Core Types and API Client

#### Step 1: Write Tests First
```typescript
// __tests__/api-client.test.ts
describe('ApiClient', () => {
  test('should create share link for note', async () => {
    // Test FIRST - this should fail
  });
  
  test('should handle network errors gracefully', async () => {
    // Test FIRST
  });
  
  test('should include API key in headers', async () => {
    // Test FIRST
  });
});
```

#### Step 2: Implement Types
```typescript
// src/types.ts
export interface ShareResponse {
  shareUrl: string;
  shareId: string;
}

export interface PluginSettings {
  apiKey: string;
  serverUrl: string;
  copyToClipboard: boolean;
  showNotifications: boolean;
}
```

### Day 3: Settings Management

#### Test First:
```typescript
// __tests__/settings.test.ts
describe('Settings', () => {
  test('should load default settings', () => {
    // Test FIRST
  });
  
  test('should validate API key format', () => {
    // Test FIRST
  });
  
  test('should save settings to disk', async () => {
    // Test FIRST
  });
});
```

### Day 4: Share Manager

#### Test First:
```typescript
// __tests__/share-manager.test.ts
describe('ShareManager', () => {
  test('should add frontmatter to note', async () => {
    // Test FIRST
  });
  
  test('should detect if note is already shared', () => {
    // Test FIRST
  });
  
  test('should remove frontmatter on unshare', async () => {
    // Test FIRST
  });
});
```

### Day 5: Main Plugin Integration

#### Test First:
```typescript
// __tests__/main.test.ts
describe('ObsidianCommentsPlugin', () => {
  test('should register share command', () => {
    // Test FIRST
  });
  
  test('should add context menu item', () => {
    // Test FIRST
  });
  
  test('should show notification on successful share', async () => {
    // Test FIRST
  });
});
```

## Phase 3: UI Implementation (Week 2)

### Week 2, Day 1-2: Settings Tab
- Create settings UI
- Add API key input with validation
- Add server URL configuration
- Add test connection button

### Week 2, Day 3-4: Context Menu Integration
- Add right-click menu item
- Add command palette command
- Add optional ribbon icon
- Add status indicators

### Week 2, Day 5: Polish & Error Handling
- Improve error messages
- Add loading states
- Test edge cases
- Update documentation

## How to Install and Develop with BRAT (macOS)

### Initial BRAT Setup

1. **Install BRAT Plugin**:
   - Open Obsidian Settings → Community plugins
   - Turn off Safe Mode
   - Browse community plugins → Search "BRAT"
   - Install and Enable BRAT

2. **Configure BRAT for Development**:
   - Settings → BRAT → Enable "Auto-update plugins at startup"
   - Enable "Auto-update plugins after update check"

### Development Workflow with BRAT

#### Step 1: Prepare Your Repository

```bash
# Clone your repository
cd ~/Developer  # or wherever you keep your projects
git clone https://github.com/pangeafate/ObsidianComments.git
cd ObsidianComments/obsidian-plugin

# Install dependencies
npm install

# Initial build
npm run build

# Commit the built files for BRAT
git add main.js manifest.json styles.css
git commit -m "build: initial plugin build"
git push origin main
```

#### Step 2: Add Your Plugin to BRAT

1. In Obsidian: Settings → BRAT
2. Click "Add Beta plugin"
3. Enter: `https://github.com/pangeafate/ObsidianComments`
4. Enable "Auto-update" for this plugin
5. BRAT will install your plugin automatically

#### Step 3: Development Cycle

```bash
# Terminal 1: Run tests continuously
npm run test:watch

# Terminal 2: Auto-build on changes
npm run dev

# Your development cycle:
# 1. Make changes in VS Code
# 2. Wait for auto-build to complete
# 3. Commit and push to GitHub
# 4. In Obsidian: BRAT → Update (or wait for auto-update)
# 5. Reload Obsidian (Cmd+R)
```

#### Step 4: Faster Local Development (Hybrid Approach)

For faster iteration without pushing to GitHub every time:

```bash
# Find where BRAT installed your plugin
VAULT_PATH="$HOME/Documents/YourVault"  # Update this path
BRAT_PLUGIN_PATH="$VAULT_PATH/.obsidian/plugins/obsidian-comments-[hash]"

# Find the exact folder name
ls "$VAULT_PATH/.obsidian/plugins/" | grep obsidian-comments

# Create a development script (save as dev-sync.sh)
cat > dev-sync.sh << 'EOF'
#!/bin/bash
VAULT_PATH="$HOME/Documents/YourVault"
PLUGIN_NAME=$(ls "$VAULT_PATH/.obsidian/plugins/" | grep obsidian-comments)
PLUGIN_PATH="$VAULT_PATH/.obsidian/plugins/$PLUGIN_NAME"

# Copy built files to BRAT's installation
cp main.js manifest.json styles.css "$PLUGIN_PATH/"
echo "✅ Synced to Obsidian. Reload with Cmd+R"
EOF

chmod +x dev-sync.sh

# Now your workflow is:
# 1. Make changes
# 2. Auto-build completes
# 3. Run: ./dev-sync.sh
# 4. Cmd+R in Obsidian
```

### GitHub Workflow for BRAT

Create `.github/workflows/release.yml`:

```yaml
name: Build obsidian plugin

on:
  push:
    tags:
      - "*"

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      
      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18.x"

      - name: Build plugin
        run: |
          cd obsidian-plugin
          npm install
          npm run build

      - name: Create release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            obsidian-plugin/main.js
            obsidian-plugin/manifest.json
            obsidian-plugin/styles.css
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### BRAT-Specific Requirements

1. **Always commit built files** for development:
```bash
# After building
git add main.js manifest.json styles.css
git commit -m "build: update plugin build"
git push
```

2. **Update manifest.json for each version**:
```bash
# Use npm version to update both package.json and manifest.json
npm version patch
git push --tags
```

3. **Test BRAT updates**:
   - Make a small change (like console.log)
   - Build, commit, push
   - In Obsidian: BRAT → Check for updates
   - Verify the change loaded

### macOS-Specific Development Tips

#### Quick Commands for Your .zshrc/.bash_profile:

```bash
# Add to ~/.zshrc or ~/.bash_profile
alias obs-build="cd ~/Developer/ObsidianComments/obsidian-plugin && npm run build"
alias obs-dev="cd ~/Developer/ObsidianComments/obsidian-plugin && npm run dev"
alias obs-test="cd ~/Developer/ObsidianComments/obsidian-plugin && npm run test:watch"
alias obs-push="cd ~/Developer/ObsidianComments/obsidian-plugin && git add main.js manifest.json styles.css && git commit -m 'build: update' && git push"
```

#### Obsidian Developer Console Shortcut:
- Open Console: `Cmd+Option+I`
- Reload Obsidian: `Cmd+R`
- Quick Plugin Reload: `Cmd+Shift+R` (if you add this command to your plugin)

### For End Users

Users will install via BRAT:
1. Install BRAT from Community Plugins
2. Settings → BRAT → Add Beta Plugin
3. URL: `https://github.com/pangeafate/ObsidianComments`
4. Enable auto-update
5. Plugin installs and updates automatically

### Debugging with BRAT

In Obsidian Console (`Cmd+Option+I`):
```javascript
// Check if plugin loaded
app.plugins.plugins['obsidian-comments']

// Check BRAT installations
app.plugins.plugins['obsidian42-brat'].settings.pluginList

// Manually reload your plugin
app.plugins.unloadPlugin('obsidian-comments')
app.plugins.loadPlugin('obsidian-comments')
```

## Testing Strategy for Claude Code

### Running Tests During Development
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- api-client.test.ts
```

### Test Coverage Requirements
- Minimum 80% overall coverage
- 100% coverage for:
  - API communication
  - Frontmatter manipulation
  - Settings validation
  - Error handling

### Integration Testing
Create a test vault:
```bash
# Create test vault structure
mkdir -p test-vault/.obsidian/plugins/obsidian-comments
mkdir -p test-vault/Notes

# Copy built plugin
cp main.js manifest.json styles.css test-vault/.obsidian/plugins/obsidian-comments/

# Create test notes
echo "# Test Note\nThis is a test" > test-vault/Notes/test.md
```

## Debug Mode Features

Add debug capabilities for development:

```typescript
// src/constants.ts
export const DEBUG = process.env.NODE_ENV !== 'production';

// src/main.ts
if (DEBUG) {
  console.log('Obsidian Comments: Debug mode enabled');
  // @ts-ignore
  window.obsidianComments = {
    plugin: this,
    apiClient: this.apiClient,
    settings: this.settings
  };
}
```

Access in Obsidian console (Ctrl+Shift+I):
```javascript
// Test API connection
await window.obsidianComments.apiClient.testConnection()

// Check settings
window.obsidianComments.settings

// Manually trigger share
await window.obsidianComments.plugin.shareCurrentNote()
```

## Common Development Issues & Solutions (BRAT + macOS)

### Issue: "BRAT can't find my plugin"
- Ensure manifest.json is in the root of your repo
- Check that main.js is committed to GitHub
- Repository must be public

### Issue: "Plugin not updating in BRAT"
- Make sure you pushed to the correct branch (main)
- In Obsidian: BRAT → "Check for updates"
- Try removing and re-adding the plugin in BRAT

### Issue: "Changes not reflecting after BRAT update"
- Always reload Obsidian after BRAT updates (Cmd+R)
- Check console for errors (Cmd+Option+I)
- Verify the build succeeded before pushing

### Issue: "Permission denied errors on Mac"
```bash
# Fix npm permissions on macOS
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

### Issue: "Cannot find module 'obsidian'"
- This is normal in tests
- Mock Obsidian API in tests
- Use `@ts-ignore` if needed

### Issue: "API calls failing in development"
- Check CORS settings on server
- Use localhost exception
- Verify API key is correct

### BRAT-Specific Tips:
- Always build before pushing: `npm run build`
- Commit built files: `git add main.js manifest.json styles.css`
- Use tags for stable releases: `git tag -a 1.0.0 -m "Release v1.0.0"`
- Enable BRAT notifications for update failures

## Release Process with BRAT

1. **Update version**:
```bash
npm version patch  # or minor/major
```

2. **Build production bundle**:
```bash
npm run build
```

3. **Commit and tag**:
```bash
git add main.js manifest.json styles.css package.json
git commit -m "release: v$(node -p "require('./package.json').version")"
git push origin main
git push --tags
```

4. **BRAT users automatically get update notification**

5. **Create GitHub release** (optional but recommended):
   - Go to GitHub → Releases → Create new release
   - Choose your tag
   - Add release notes
   - Attach main.js, manifest.json, styles.css

## Automated Setup Script (macOS)

Save this as `setup-obsidian-plugin.sh` in your ObsidianComments folder:

```bash
#!/bin/bash

echo "🚀 Setting up Obsidian Comments Plugin Development with BRAT"

# Check if we're in the right directory
if [ ! -d "obsidian-plugin" ]; then
    echo "❌ Error: Run this from the ObsidianComments root directory"
    exit 1
fi

cd obsidian-plugin

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build initial version
echo "🔨 Building plugin..."
npm run build

# Check if files exist
if [ ! -f "main.js" ] || [ ! -f "manifest.json" ]; then
    echo "❌ Error: Build failed. Check for errors above."
    exit 1
fi

# Commit built files
echo "📝 Committing built files..."
git add main.js manifest.json styles.css
git commit -m "build: initial plugin build for BRAT" || echo "Already committed"

# Push to GitHub
echo "⬆️ Pushing to GitHub..."
git push origin main

# Create dev-sync script
echo "🔧 Creating dev-sync.sh script..."
cat > dev-sync.sh << 'EOF'
#!/bin/bash
# Find your vault path - update this!
VAULT_PATH="$HOME/Documents/YourVault"

# Find BRAT plugin folder
PLUGIN_NAME=$(ls "$VAULT_PATH/.obsidian/plugins/" 2>/dev/null | grep obsidian-comments | head -1)

if [ -z "$PLUGIN_NAME" ]; then
    echo "❌ Plugin not found in vault. Install via BRAT first!"
    exit 1
fi

PLUGIN_PATH="$VAULT_PATH/.obsidian/plugins/$PLUGIN_NAME"

# Copy files
cp main.js manifest.json styles.css "$PLUGIN_PATH/" 2>/dev/null
echo "✅ Synced to Obsidian. Reload with Cmd+R"
EOF

chmod +x dev-sync.sh

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Open Obsidian"
echo "2. Install BRAT from Community Plugins"
echo "3. In BRAT settings, add beta plugin:"
echo "   https://github.com/pangeafate/ObsidianComments"
echo "4. Enable 'Obsidian Comments' in Community Plugins"
echo "5. Update VAULT_PATH in dev-sync.sh to your vault location"
echo ""
echo "Happy coding! 🎉"
```

Run it with:
```bash
chmod +x setup-obsidian-plugin.sh
./setup-obsidian-plugin.sh
```