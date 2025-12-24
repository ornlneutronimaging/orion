# Orion Studio

**A Custom VSCode Environment for Neutron Imaging at ORNL**

Orion Studio is a specialized distribution of Visual Studio Code, purpose-built for neutron imaging workflows at Oak Ridge National Laboratory's MARS (HFIR) and VENUS (SNS) beamlines.

Unlike a traditional fork, Orion Studio is built as a **custom wrapper** around the official VS Code distribution. It bundles a set of curated extensions, settings, and a custom launcher wizard (`orion-launcher`) to provide a seamless "out-of-the-box" experience for neutron scientists.

## Why Orion Studio?

Traditional notebook environments (JupyterLab in browsers) present challenges:

- Browser-based interfaces lack native IDE features
- Manual Python environment management
- No integrated git version control for notebooks
- Separate authentication systems

**Orion Studio solves these problems by providing:**

- Native desktop application with full IDE capabilities
- **Orion Launcher**: A custom wizard for easy setup, remote connection, and project cloning
- **Pixi Integration**: Automated Python environment management
- **Remote Development**: Seamless SSH connection to analysis clusters
- **Curated Extensions**: Pre-installed tools for Jupyter, Python, and Neutron Imaging

## Key Features

### 🎯 Core Capabilities

- **Express Setup**: One-click fresh start for every session
  - First launch: clones notebooks to `~/orion_notebooks`
  - Subsequent launches: refreshes to latest and creates a new session branch
  - Your renamed/custom notebooks are preserved (only tracked files are reset)
- **Native Jupyter Notebooks**: Full-featured notebook interface built on VSCode's excellent Jupyter extension
- **Git Version Control**: Integrated git support for notebook versioning
- **Pixi Environment Manager**: Auto-detect and manage Python environments from `pixi.toml`
- **Remote Connection Wizard**: Simplified connection to ORNL analysis clusters (e.g., `analysis.sns.gov`)

### 🔬 Neutron Imaging Tools

- Pre-configured for neutron radiography and tomography workflows
- Custom visualization tools for neutron data
- Analysis templates and snippets

## Project Status

**Current Phase:** Initial Development (Phase 1)

See [ROADMAP.md](docs/ROADMAP.md) for the complete development plan.

## Documentation

- **[QUICKSTART.md](docs/QUICKSTART.md)** - Detailed developer guide
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Complete system architecture
- **[ROADMAP.md](docs/ROADMAP.md)** - Development plan
- **[BRANDING.md](docs/BRANDING.md)** - Icon design rationale
- **[CHANGELOG.md](CHANGELOG.md)** - Release history

## Quick Start (for Developers)

### Prerequisites

Install [Pixi](https://pixi.sh) - it manages all dependencies (Python, Node.js) automatically:

```bash
# macOS/Linux
curl -fsSL https://pixi.sh/install.sh | bash

# Windows
iwr -useb https://pixi.sh/install.ps1 | iex
```

### Build & Run

```bash
# Clone the repository
git clone https://github.com/ornlneutronimaging/orion.git
cd orion

# Build Orion Studio
pixi run build

# Run Orion Studio
# macOS:
open "dist/Orion Studio.app"
# Linux:
./dist/OrionStudio/OrionStudio
```

The build script downloads VS Code, compiles the orion-launcher extension, installs bundled extensions, and creates platform-specific installers (DMG for macOS, tarball for Linux).

## Architecture Overview

```
orion/
├── extensions/               # Custom Extensions
│   └── orion-launcher/       # The "Welcome Wizard" extension
├── scripts/                  # Build and deployment scripts
│   └── build_orion.py        # Main build script (Python)
├── config/                   # Default settings and extension lists
│   ├── settings.json         # Default VS Code settings
│   └── extensions.txt        # List of extensions to bundle
└── resources/                # Branding assets
```

## Technology Stack

- **Base:** Visual Studio Code (Official Build)
- **Wrapper:** Python (Build Script)
- **Launcher Extension:** TypeScript (VS Code Extension API)
- **Environment Management:** Pixi

## Target Users

- Neutron imaging scientists at ORNL's MARS (HFIR) and VENUS (SNS) beamlines
- Researchers working with radiography and tomography data
- Data analysts processing neutron imaging experiments

## License

MIT License - See [LICENSE](LICENSE) for details

Orion Studio bundles Visual Studio Code, which is subject to the [Microsoft Software License Terms](https://code.visualstudio.com/license).

## Contact & Support

- **Issues:** [GitHub Issues](https://github.com/ornlneutronimaging/orion/issues)
