# Orion Studio Extensions

This directory contains custom extensions developed specifically for Orion Studio and neutron imaging workflows.

## Overview

Extensions enhance Orion Studio with specialized functionality for neutron imaging, data analysis, and beamline integration. Each extension is a self-contained package that follows the VSCode extension API.

## Structure

```
extensions/
├── neutron-imaging-tools/     # Core neutron imaging utilities
├── jupyter-integration/        # Jupyter notebook support
├── pixi-environment/          # Pixi environment management
├── mars-beamline/             # MARS (HFIR) beamline integration
├── venus-beamline/            # VENUS (SNS) beamline integration
├── data-visualization/        # Advanced visualization tools
└── ai-assistant/              # AI-powered code assistance
```

## Extension Template Structure

Each extension follows this structure:

```
extension-name/
├── package.json              # Extension manifest
├── README.md                 # Extension documentation
├── CHANGELOG.md             # Version history
├── src/
│   ├── extension.ts         # Main entry point
│   ├── commands/            # Command implementations
│   ├── providers/           # Content/language providers
│   ├── views/               # Custom views and panels
│   └── utils/               # Utility functions
├── resources/
│   ├── icons/              # Extension icons
│   └── images/             # Documentation images
├── syntaxes/               # Language grammars (if applicable)
├── snippets/               # Code snippets
├── themes/                 # Color themes (if applicable)
└── tests/
    ├── suite/              # Test suites
    └── fixtures/           # Test data
```

## Creating a New Extension

### 1. Use the Extension Generator

```bash
# Install Yeoman and VSCode Extension generator
npm install -g yo generator-code

# Generate new extension
cd extensions/
yo code

# Follow the prompts
# Select: New Extension (TypeScript)
# Name: your-extension-name
```

### 2. Update package.json

Key fields in `package.json`:

```json
{
  "name": "orion-extension-name",
  "displayName": "Orion Extension Name",
  "description": "Brief description",
  "version": "0.1.0",
  "publisher": "ornl-neutron-imaging",
  "engines": {
    "vscode": "^1.80.0"
  },
  "categories": ["Other"],
  "activationEvents": ["onCommand:extension.command"],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "extension.command",
        "title": "Command Title"
      }
    ]
  }
}
```

### 3. Implement Extension Logic

```typescript
// src/extension.ts
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension activated');

    let disposable = vscode.commands.registerCommand(
        'extension.command',
        () => {
            vscode.window.showInformationMessage('Hello from Orion!');
        }
    );

    context.subscriptions.push(disposable);
}

export function deactivate() {}
```

### 4. Build and Test

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run tests
npm test

# Package extension
npm run package
```

## Core Extensions

### Neutron Imaging Tools

Provides core functionality for neutron imaging analysis:

- Image loading and preprocessing
- Flat-field and dark-current correction
- Region of interest (ROI) selection
- Basic image operations

### Jupyter Integration

Native Jupyter notebook support:

- Notebook creation and editing
- Kernel management
- Cell execution
- Interactive outputs
- Variable inspection

### Pixi Environment Manager

Python environment management:

- Environment creation and deletion
- Package installation and removal
- Environment switching
- Reproducibility tools

### Beamline Integrations

#### MARS (HFIR)

- Data acquisition
- Instrument control
- Real-time monitoring

#### VENUS (SNS)

- Data acquisition
- Instrument control
- Real-time monitoring

### Data Visualization

Advanced visualization capabilities:

- 2D image viewer with advanced controls
- 3D volume rendering
- Interactive plotting
- Histogram analysis
- Line profiles

### AI Assistant

Intelligent code assistance:

- Context-aware completions
- Documentation lookup
- Best practice suggestions
- Error detection and fixes

## Extension Development

### API Usage

Extensions can use:

- **VSCode API**: Full access to editor, workspace, UI components
- **Node.js API**: File system, networking, etc.
- **Orion-specific APIs**: Custom APIs for neutron imaging workflows

### Best Practices

1. **Performance**: Lazy load features, use workers for heavy computation
2. **Error Handling**: Gracefully handle errors and provide user feedback
3. **Testing**: Write comprehensive unit and integration tests
4. **Documentation**: Document commands, settings, and APIs
5. **Accessibility**: Follow accessibility guidelines
6. **Compatibility**: Ensure compatibility with different platforms

### Publishing

Extensions can be:

1. **Bundled**: Included with Orion Studio distribution
2. **Marketplace**: Published to extension marketplace (future)
3. **Private**: Distributed internally

## Testing Extensions

### Unit Tests

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    test('Sample test', () => {
        assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    });
});
```

### Integration Tests

```typescript
import * as vscode from 'vscode';
import * as assert from 'assert';

suite('Integration Tests', () => {
    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('ornl.extension-name'));
    });
});
```

## Dependencies

Common dependencies for extensions:

- `vscode`: VSCode extension API
- `@types/node`: Node.js type definitions
- `@types/vscode`: VSCode API type definitions
- TypeScript for development
- Testing frameworks (Mocha, Jest)

## Resources

- [VSCode Extension API](https://code.visualstudio.com/api)
- [Extension Guides](https://code.visualstudio.com/api/extension-guides/overview)
- [VSCode Extension Examples](https://github.com/microsoft/vscode-extension-samples)
- [Neutron Imaging Documentation](https://docs.ornl.gov/neutron-imaging)

## Contributing

To contribute an extension:

1. Create a new branch
2. Develop and test your extension
3. Add documentation
4. Submit a pull request
5. Address review feedback

See `CONTRIBUTING.md` for detailed guidelines.

## Support

For extension development help:

- GitHub Issues
- Developer Documentation
- Community Forum

---

*Extensions will be added as they are developed. Check back for updates!*
