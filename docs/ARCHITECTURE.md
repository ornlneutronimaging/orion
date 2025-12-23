# Orion Studio - Architecture Document

## Overview

Orion Studio is a **custom wrapper** around the official Visual Studio Code distribution, purpose-built for neutron imaging notebook workflows at ORNL. Unlike traditional forks (e.g., VSCodium, Cursor), Orion Studio downloads the official VS Code binaries and bundles them with curated extensions and custom configuration.

## Architecture Decision

**Wrapper vs Fork:**

| Approach | Pros | Cons |
|----------|------|------|
| Fork (VSCodium-style) | Full customization, can modify core UI | Complex builds (30-60 min), merge conflicts, maintenance burden |
| Wrapper (Orion approach) | Simple builds (5 min), automatic VS Code updates, no merge conflicts | Limited to extension-based customization |

**Decision:** Wrapper approach. The benefits of reduced maintenance and faster iteration outweigh the loss of deep customization. All custom features are implemented as VS Code extensions.

## Project Goals

1. Provide stable, native Jupyter notebook interface (replacing browser-based JupyterLab)
2. Integrate git-based notebook version management with UI controls
3. Automate Python environment management via pixi
4. Enable remote SSH connection to ORNL analysis clusters
5. Leverage existing VSCode extension marketplace
6. Add custom neutron imaging-specific tools via extensions

## Project Structure

```
orion/
├── extensions/                 # Custom VS Code Extensions
│   └── orion-launcher/         # Welcome wizard & setup extension
│       ├── src/
│       │   ├── extension.ts    # Extension entry point
│       │   ├── wizard.ts       # Welcome wizard webview
│       │   └── git.ts          # Git operations (clone, checkout)
│       ├── package.json        # Extension manifest
│       └── tsconfig.json
├── scripts/
│   ├── build_orion.py          # Main build script
│   └── launch_orion.sh         # Launcher for packaged app
├── config/
│   ├── settings.json           # Default VS Code settings
│   └── extensions.txt          # Extensions to bundle
├── resources/                  # Branding assets (icons, splash)
├── docs/                       # Documentation
└── pixi.toml                   # Project dependencies
```

## Build System

### How It Works

The build script (`scripts/build_orion.py`) performs these steps:

1. **Download VS Code**: Fetches latest stable VS Code from Microsoft's CDN
2. **Create Wrapper App**: On macOS, creates `Orion Studio.app` bundle containing VS Code
3. **Setup Portable Mode**: Configures VS Code to use bundled data directory
4. **Build orion-launcher**: Compiles the custom extension
5. **Install Extensions**: Downloads VSIX files directly from VS Code Marketplace

### Key Components

**`get_latest_version()`** - Queries VS Code release API for latest stable version

**`download_and_install_vsix()`** - Downloads extensions directly from marketplace:

- Queries marketplace API for extension metadata
- Downloads platform-specific VSIX when available
- Extracts to portable extensions directory

**`install_with_dependencies()`** - Recursive dependency resolution:

- Parses ExtensionDependencies and ExtensionPack properties
- Installs dependencies before main extension
- Handles circular dependencies with cycle detection

### Platform Support

| Platform | Build Output | Notes |
|----------|--------------|-------|
| macOS (ARM) | `dist/Orion Studio.app` | Universal binary via embedded VS Code |
| macOS (Intel) | `dist/Orion Studio.app` | Same wrapper structure |
| Linux (x64) | `dist/OrionStudio/` | Directory with launcher script |

## Extension Architecture

### orion-launcher Extension

The primary custom extension providing the welcome wizard and setup features.

**Activation:** `onStartupFinished` - runs after VS Code fully loads

**Features:**

- **Express Setup**: One-click setup that clones notebooks to `~/orion_notebooks` with shallow clone
- **Advanced Setup**: Full wizard for custom location, branch selection, and remote SSH
- Remote SSH connection to analysis clusters
- Git repository cloning with optional shallow clone support
- Project template selection

**Technology:**

- TypeScript compiled to JavaScript
- VS Code Webview API for wizard UI
- `simple-git` library for git operations

### Bundled Marketplace Extensions

Defined in `config/extensions.txt`:

```
ms-vscode-remote.remote-ssh      # Remote development
ms-toolsai.jupyter               # Jupyter notebook support
ms-python.python                 # Python language support
ms-python.vscode-pylance         # Python IntelliSense
GitHub.copilot                   # AI coding assistant
tamasfe.even-better-toml         # TOML file support
```

Extensions can be excluded using `# !extension.id` syntax for incompatible versions.

## Portable Mode

Orion Studio runs in "portable mode" where all user data is stored alongside the application:

**macOS Structure:**

```
Orion Studio.app/
└── Contents/
    ├── MacOS/OrionStudio          # Launcher script
    ├── Info.plist
    └── Resources/
        ├── Visual Studio Code.app/ # Embedded VS Code
        └── code-portable-data/     # User data
            ├── user-data/User/settings.json
            └── extensions/         # Installed extensions
```

**Linux Structure:**

```
OrionStudio/
├── OrionStudio                    # Launcher script
├── bin/code                       # VS Code binary
├── resources/app/extensions/      # Built-in extensions
└── data/                          # Portable data
    ├── user-data/User/settings.json
    └── extensions/                # User extensions
```

## Default Configuration

The `config/settings.json` provides sensible defaults:

```json
{
  "workbench.startupEditor": "none",
  "workbench.colorTheme": "Default Dark+",
  "editor.fontSize": 14,
  "terminal.integrated.fontSize": 13,
  "python.defaultInterpreterPath": "python",
  "jupyter.askForKernelRestart": false
}
```

## Technology Stack

### Build Tools

- **Python 3.11** - Build script language
- **Node.js 22.x** - Extension compilation
- **Pixi** - Environment management

### Runtime

- **Electron** - VS Code's desktop framework (bundled with VS Code)
- **VS Code Extension API** - Custom extension development

### CI/CD

- **GitHub Actions** - Automated builds
- **Pixi** - Reproducible CI environment

## Security Considerations

### Extension Installation

- Extensions downloaded directly from official VS Code Marketplace
- HTTPS with SSL verification (disabled in dev for some environments)
- No code execution during install (just file extraction)

### Portable Mode

- All data stored in application bundle
- No writes to system directories
- User can delete app to remove all traces

### Network Security

- All downloads over HTTPS
- Git operations via SSH or HTTPS

## Future Enhancements

### Phase 2 Features

- **Pixi Integration**: Auto-detect and install pixi environments
- **Notebook Templates**: Pre-built analysis workflows
- **Custom Visualizations**: Neutron data viewers

### Phase 3 Features

- **Remote Compute**: Submit jobs to ORNL clusters
- **Data Browser**: Browse neutron data archives
- **Collaboration**: Shared notebook sessions

## Maintenance

### Updating VS Code

The build script automatically fetches the latest stable VS Code. No manual intervention needed.

### Updating Extensions

Edit `config/extensions.txt` and rebuild. Use `@version` syntax to pin specific versions.

### Adding New Extensions

1. Add extension ID to `config/extensions.txt`
2. Run `pixi run build`
3. Extension and its dependencies are automatically installed

## Comparison to Alternatives

| Feature | Orion Studio | VS Code | JupyterLab | Cursor |
|---------|--------------|---------|------------|--------|
| Jupyter Support | Bundled | Extension | Native | Extension |
| Git Integration | Bundled | Extension | Extension | Bundled |
| Portable Mode | Yes | Manual | No | No |
| ORNL Customization | Yes | No | No | No |
| Build Complexity | Low | N/A | N/A | High |
| Maintenance | Low | N/A | Medium | High |

## Resources

- **VS Code Extension API:** <https://code.visualstudio.com/api>
- **VS Code Marketplace API:** <https://github.com/nicholasberlin/vscode-marketplace>
- **Pixi Documentation:** <https://prefix.dev/docs/pixi>
