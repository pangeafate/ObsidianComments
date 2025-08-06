# BRAT Installation Guide - Obsidian Comments Plugin v1.7.0

## 🚀 **Plugin Successfully Released!**

The Obsidian Comments Plugin v1.7.0 has been successfully released on GitHub and is now ready for installation via BRAT (Beta Reviewers Auto-update Tool).

## 📦 **Release Information**

- **Version**: v1.7.0
- **Release URL**: https://github.com/pangeafate/ObsidianComments/releases/tag/v1.7.0
- **Repository**: https://github.com/pangeafate/ObsidianComments

## 📋 **Installation Steps**

### Step 1: Install BRAT Plugin
1. Open Obsidian
2. Go to Settings → Community Plugins
3. Browse and search for "BRAT" 
4. Install "Obsidian42 - BRAT" plugin
5. Enable the BRAT plugin

### Step 2: Add ObsidianComments via BRAT
1. Open Settings → BRAT (in Community Plugins section)
2. Click "Add Beta Plugin"
3. Enter the repository URL: `https://github.com/pangeafate/ObsidianComments`
4. Click "Add Plugin"
5. BRAT will automatically download and install the latest release (v1.7.0)

### Step 3: Enable the Plugin
1. Go to Settings → Community Plugins
2. Find "Obsidian Comments" in the list
3. Toggle it ON to enable

## ✅ **Verification**

After installation, you should see:
- Plugin version 1.7.0 in Community Plugins list
- New ribbon icon for sharing notes
- Share/Unshare commands in Command Palette
- Enhanced frontmatter buttons when notes are shared

## 🔧 **Configuration**

1. Go to Settings → Obsidian Comments
2. Configure your API settings:
   - **Server URL**: `https://obsidiancomments.serverado.app`
   - **API Key**: (get from the service)
3. Test connection using the "Test" button

## 🆕 **New Features in v1.7.0**

1. **Re-share Button Updates Database Node**
   - Clicking re-share properly updates the database
   - Refreshes timestamps and content

2. **Database Cleanup on Un-share/Delete**
   - Properly removes notes from database when unsharing
   - Clean error handling and retry logic

3. **Smart Title Handling**
   - Preserves H1 headings in note content
   - No duplication of titles

4. **Clean Front Matter**
   - Removed shareId clutter from frontmatter
   - Better button visibility

## 🔄 **Auto-Updates**

BRAT will automatically check for and install new releases:
- Updates check daily
- You'll be notified when updates are available
- Updates install automatically (can be configured)

## 🐛 **Troubleshooting**

### BRAT Can't Find Repository
- Verify URL is exactly: `https://github.com/pangeafate/ObsidianComments`
- Check your internet connection
- Ensure BRAT plugin is enabled

### Plugin Won't Load
- Check Obsidian console for errors (Ctrl+Shift+I)
- Verify plugin is enabled in Community Plugins
- Try restarting Obsidian

### Updates Not Working
- Check BRAT settings for auto-update configuration
- Manually refresh in BRAT settings
- Check GitHub for latest release

## 📞 **Support**

- **Issues**: https://github.com/pangeafate/ObsidianComments/issues
- **Discussions**: https://github.com/pangeafate/ObsidianComments/discussions
- **Documentation**: Check repository README

## 🎉 **Success!**

Your Obsidian Comments Plugin v1.7.0 is now successfully:
- ✅ Released on GitHub
- ✅ Compatible with BRAT
- ✅ Ready for installation
- ✅ Includes all requested TDD features

The plugin will now be discoverable and installable by any Obsidian user with BRAT!