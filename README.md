# Obsidian Comments

An Obsidian plugin that enables sharing individual notes online for collaborative editing and commenting.

## Features

- 🔗 Share notes online with a single click
- 📝 Collaborative editing support
- 💬 Comments and feedback system
- 🔒 Configurable permissions (view/edit)
- 🎨 Seamless Obsidian integration
- 📋 Automatic URL copying to clipboard

## Installation (Beta Testing)

This plugin is currently in beta testing. Install via BRAT:

1. **Install BRAT** (Beta Reviewers Auto-update Tool) from Obsidian Community Plugins
2. **Open BRAT settings** in Obsidian
3. **Add Beta Plugin**: `https://github.com/pangeafate/ObsidianComments`
4. **Enable the plugin** in Community Plugins settings

## Usage

### Quick Start

1. Open a note in Obsidian
2. Run the command "Share current note online" (Ctrl/Cmd+P)
3. The share URL is automatically copied to your clipboard
4. Share the URL with collaborators

### Commands

- **Share current note online**: Creates a shareable link for the active note
- **Stop sharing current note**: Removes sharing and deletes the online copy

### Settings

Configure the plugin in Settings → Obsidian Comments:

- **API Key**: Your authentication key for the sharing service
- **Server URL**: The sharing service endpoint
- **Copy to clipboard**: Automatically copy share URLs
- **Show notifications**: Display success/error messages
- **Default permissions**: Set default access level (view/edit)

## Development

This plugin follows Test-Driven Development (TDD) principles.

### Setup

```bash
cd obsidian-plugin
npm install
npm run build
```

### Development Workflow

```bash
# Run tests in watch mode
npm run test:watch

# Build and sync for BRAT testing
./scripts/dev-sync.sh

# Setup BRAT development workflow
./scripts/setup-brat.sh
```

See [BRAT_SETUP.md](obsidian-plugin/BRAT_SETUP.md) for detailed development instructions.

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- settings.test.ts
```

## Architecture

- **TDD Implementation**: 94 tests with 83% pass rate
- **TypeScript**: Full type safety and modern ES6+ features
- **Modular Design**: Separate concerns for API, settings, and sharing logic
- **Error Handling**: Comprehensive error management and user feedback
- **Obsidian Integration**: Native UI elements and workflow integration

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests first (TDD approach)
4. Implement the feature
5. Ensure all tests pass (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## License

MIT License - see LICENSE file for details.

## Support

- 🐛 [Report Issues](https://github.com/pangeafate/ObsidianComments/issues)
- 💡 [Feature Requests](https://github.com/pangeafate/ObsidianComments/discussions)
- 📖 [Documentation](obsidian-plugin/BRAT_SETUP.md)

---

Built with ❤️ using Test-Driven Development