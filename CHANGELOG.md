# Changelog

All notable changes to Orion Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-01-08

### Added

- **Multi-repository support**: Choose between Reduction and Reconstruction workflows
  - Reduction: Process raw neutron data (python_notebooks → ~/orion_notebooks)
  - Reconstruction: CT reconstruction from projections (all_ct_reconstruction → ~/orion_ct_recon)
- Split Express Setup buttons with visual status indicators
  - Green: Repository ready, no unsaved work
  - Orange: Has unsaved notebooks (with file count)
  - Gray: Not set up, will download on first use
- CSS-based tooltips showing repository description and status
- Repository dropdown in Advanced mode (Reduction, Reconstruction, Custom URL)
- Auto-fill target directory for registered repositories in Advanced mode

### Changed

- Express Setup now shows two workflow options instead of single "Start" button
- Advanced mode CLONE now uses repository registry for known repos
- Orion Home button now closes workspace before showing wizard (clean restart)
- Remote SSH setup uses terminal-based execution for all operations
- Primary sidebar (Explorer) automatically shown when workspace opens
- Secondary sidebar (Copilot panel) hidden by default on startup

### Fixed

- Button tooltips now work correctly in VS Code webview (CSS-based implementation)
- Remote SSH clone operations now use $HOME for correct path resolution
- Target folder field hidden for registered repos to avoid showing local paths

### Removed

- Deprecated DEFAULT_REPO_URL and EXPRESS_TARGET_DIR constants
- Config file persistence (directory preserved for future diagnostic logs)
- Hardcoded neutron_notebooks subdirectory logic

## [1.1.1] - 2024-12-23

### Changed

- **Express Setup refactored for fresh-start workflow**
  - Every launch shows welcome wizard (no session restore)
  - Existing repos: fetches latest, force checkouts default branch, creates new session branch
  - Fresh clones: uses full clone (not shallow) for reliable git operations
  - Session branches named `${USER}-session-YYYYMMDD-HHMMSS` for history tracking
- UI updated: prominent "Start" button, "Advanced Setup" as secondary option
- Added `window.restoreWindows: none` to prevent VS Code session restore

### Added

- `GitService.refreshRepository()` - refresh existing repo to latest and create session branch
- `GitService.getDefaultBranch()` - detect default branch (next/main/master)
- H5Web extension for HDF5 file visualization

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

[1.2.0]: https://github.com/ornlneutronimaging/orion/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/ornlneutronimaging/orion/compare/v1.1.0...v1.1.1
[1.0.0]: https://github.com/ornlneutronimaging/orion/releases/tag/v1.0.0
