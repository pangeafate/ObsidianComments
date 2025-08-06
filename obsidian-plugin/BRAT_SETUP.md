# BRAT Development Setup

This document explains how to set up the Obsidian Comments plugin for beta testing using BRAT (Beta Reviewers Auto-update Tool).

## Quick Start

1. **Run the setup script:**
   ```bash
   ./scripts/setup-brat.sh
   ```

2. **Install BRAT in Obsidian:**
   - Go to Settings → Community Plugins
   - Search for "BRAT" and install it
   - Enable the BRAT plugin

3. **Add this plugin to BRAT:**
   - Open BRAT settings
   - Click "Add Beta Plugin"
   - Enter your repository URL: `https://github.com/pangeafate/ObsidianComments`
   - BRAT will automatically install the plugin

## Development Workflow

### Quick Sync
For rapid development, use the dev-sync script:
```bash
./scripts/dev-sync.sh
```

This will:
- Run tests (if they exist)
- Build the plugin
- Notify when changes are ready for BRAT

### Watch Mode
For continuous development:
```bash
./scripts/dev-sync.sh --watch
```

This monitors the `src/` directory and rebuilds automatically when changes are detected.

### Build Only
To just build without testing:
```bash
./scripts/dev-sync.sh --build-only
```

## BRAT Integration

### How BRAT Works
- BRAT monitors your repository's main branch
- It automatically detects changes to:
  - `main.js` (compiled plugin code)
  - `manifest.json` (plugin metadata)
  - `styles.css` (plugin styles)
- Updates are pulled automatically in Obsidian

### Required Files for BRAT
- ✅ `main.js` - Built plugin code
- ✅ `manifest.json` - Plugin manifest
- ✅ `styles.css` - Plugin styles
- ✅ `versions.json` - Version history

### Version Management
Update version in `manifest.json`:
```json
{
  "version": "1.0.1"
}
```

BRAT will detect version changes and notify users of updates.

## Testing Workflow

1. **Make changes** to source files in `src/`
2. **Run dev-sync** to build and prepare for BRAT
3. **Push changes** to your repository
4. **BRAT automatically updates** in Obsidian
5. **Test the changes** in Obsidian
6. **Repeat** as needed

## Plugin Information

- **Plugin ID:** obsidian-comments
- **Plugin Name:** Obsidian Comments
- **Current Version:** 1.5.0

## Troubleshooting

### Build Errors
If the build fails:
```bash
npm run build
```
Check the TypeScript compilation errors and fix them.

### BRAT Not Detecting Changes
1. Ensure all required files are committed to git
2. Check that BRAT is monitoring the correct repository
3. Verify the repository URL in BRAT settings
4. Try removing and re-adding the plugin in BRAT

### Plugin Not Loading
1. Check Obsidian's console for errors (Ctrl+Shift+I)
2. Verify the plugin is enabled in Settings → Community Plugins
3. Try disabling and re-enabling the plugin

## Scripts Reference

| Script | Purpose | Usage |
|--------|---------|-------|
| `setup-brat.sh` | Initial BRAT setup | `./scripts/setup-brat.sh` |
| `dev-sync.sh` | Development sync | `./scripts/dev-sync.sh` |
| `dev-sync.sh --watch` | Continuous development | `./scripts/dev-sync.sh --watch` |
| `dev-sync.sh --build-only` | Build without tests | `./scripts/dev-sync.sh --build-only` |

## Best Practices

1. **Always test** before pushing to the main branch
2. **Use semantic versioning** (1.0.0 → 1.0.1 → 1.1.0)
3. **Keep commits atomic** - one feature per commit
4. **Update version numbers** for each release
5. **Test in a separate Obsidian vault** to avoid data loss

## Advanced Setup

### GitHub Actions (Optional)
Consider setting up automated builds with GitHub Actions to ensure consistent build quality.

### Multiple Branches
- Use `main` branch for stable releases
- Use `develop` branch for active development
- BRAT can monitor different branches if needed

---

Happy developing! 🚀