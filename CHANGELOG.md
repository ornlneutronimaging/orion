# Changelog

All notable changes to Orion Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-12-23

### Added

- **Express Setup**: One-click setup option for new users
  - Clones notebooks to `~/orion_notebooks`
  - Uses shallow clone for faster downloads
  - Automatically runs `pixi install` to configure environment
- **Shallow clone support**: GitService now supports `--depth 1` cloning for faster repository downloads
- **H5Web extension**: Added h5web.vscode-h5web for HDF5 file visualization

## [1.0.0] - 2024-11-27

### Added

- **Orion Studio Application**: Custom VS Code wrapper for neutron imaging workflows
- **Orion Launcher Extension**: Welcome wizard with project setup capabilities
  - Git clone and branch checkout functionality
  - Remote SSH connection wizard for ORNL analysis clusters
  - Quick access to recent projects
- **Automated Build System**: Python-based build script (`scripts/build_orion.py`)
  - Downloads latest stable VS Code automatically
  - Compiles and bundles the orion-launcher extension
  - Installs curated marketplace extensions with dependency resolution
  - Generates platform-specific icons from SVG source
- **macOS Support**
  - Native `.app` bundle with custom icon
  - DMG installer with drag-and-drop installation
  - Portable mode with embedded settings and extensions
- **Linux Support**
  - Standalone application directory
  - Compressed tarball distribution
  - `.desktop` file for application menu integration
  - PNG icons at multiple sizes
- **Bundled Extensions**
  - Remote SSH for cluster connections
  - Jupyter notebooks support
  - Python language support with Pylance
  - GitHub Copilot integration
  - TOML support for pixi configuration
- **CI/CD Pipeline**
  - GitHub Actions workflow for automated builds
  - Builds on both macOS and Ubuntu runners
  - Artifact uploads (DMG for macOS, tarball for Linux)
- **Documentation**
  - Architecture overview
  - Quick start guide
  - CI/CD guide
  - Development roadmap
  - Brand iconography rationale
- **ORNL Branding**
  - Custom icon representing neutron beamline physics
  - ORNL color palette integration

### Technical Details

- Base: Visual Studio Code (latest stable)
- Extension: TypeScript with VS Code Extension API
- Build: Python 3.11 with Pixi environment management
- Icon Generation: cairosvg for SVG to PNG/ICNS conversion

[1.0.0]: https://github.com/ornlneutronimaging/orion/releases/tag/v1.0.0
