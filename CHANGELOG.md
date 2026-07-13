# Changelog

All notable changes to Orion Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.0] - 2026-07-13

### Changed

- **Updated VS Code base to 1.127.0** (July 2026 release, up from 1.116.0)
  - No bundled extension became built-in across 1.117–1.127, so unlike the 1.6.0
    Copilot change, nothing had to be removed from `config/extensions.txt`
  - 1.128.0 was deliberately skipped: it ships a known UI performance regression
    (microsoft/vscode#324985, fixed only in 1.129.0) and upstream is still serving
    1.127.0 on the stable update channel
- **The VS Code base version is now actually pinned.** `scripts/build_orion.py` used to
  download whichever version the update API listed as newest at build time, so the
  version recorded in this repo could silently disagree with the version in the shipped
  artifact, and two builds of the same tag could ship different bases. The version is now
  a single constant (`VSCODE_VERSION`), overridable with `ORION_VSCODE_VERSION=<x.y.z>`
  (or `=latest` to track upstream).
- **Bundled extensions now come from the release channel instead of the pre-release
  channel.** The Marketplace query requested only the newest build of each extension,
  which is the *pre-release* build whenever a publisher ships that channel. Orion was
  therefore shipping pre-release builds of Python, Pylance, Jupyter, debugpy and
  Remote-SSH. Explicit `id@version` pins in `config/extensions.txt` still work and can
  still select a pre-release build if one is ever needed.
- Raised minimum VS Code engine requirement to `^1.127.0`
- Migrated three default settings to their current VS Code schema. Behavior is unchanged;
  VS Code had been silently rewriting the shipped `settings.json` on first launch:
  - `workbench.activityBar.visible: false` → `workbench.activityBar.location: "hidden"`
  - `extensions.autoUpdate: true` → `extensions.autoUpdate: "on"` (VS Code 1.125 retyped
    this setting to a string enum of `on`/`off`)
  - `workbench.colorTheme: "Default Light Modern"` → `"Light Modern"` (the `Default`
    prefix was dropped from the built-in theme ids)

### Notes

- `@types/vscode` stays at `^1.125.0`: DefinitelyTyped has not published typings newer
  than 1.125.0, so raising it to match the engine floor would break `npm install`.
  Types at or below the engine floor is the correct direction.

## [1.6.0] - 2026-04-16

### Changed

- **Updated VS Code base to 1.116.0** (April 2026 release)
  - GitHub Copilot (inline suggestions) and Copilot Chat are now built-in
    extensions shipped with VS Code — no longer need to be bundled separately
- Updated fallback VS Code version from 1.114.0 to 1.116.0
- Raised minimum VS Code engine requirement to ^1.116.0

### Removed

- **`GitHub.copilot` and `GitHub.copilot-chat` from bundled extensions** — Both
  are now built-in to VS Code 1.116+. Bundling them separately is no longer
  needed and could cause conflicts with the built-in versions.
- Removed `github.copilot` and `github.copilot-chat` from
  `remote.SSH.defaultExtensions` (built-in extensions auto-install on remotes)

### Added

- **Known limitation documented**: Orion Studio cannot run simultaneously on
  multiple analysis machines that share the same NFS-mounted home directory,
  due to Chromium's `SingletonLock` mechanism

## [1.5.1] - 2026-04-07

### Fixed

- **Explicit Jupyter kernel registration** — After pixi environment setup,
  the kernel is now registered explicitly via `ipykernel install --user`,
  preventing VS Code from falsely reporting ipykernel as missing due to
  fragile auto-discovery with pixi-managed environments.
- Each notebook repo (Reduction, Reconstruction) gets its own named kernel
  (`orion-orion_notebooks`, `orion-orion_ct_recon`) to avoid cross-environment
  conflicts.

### Changed

- **Updated VS Code base to 1.114.0** (latest stable release)
- Updated fallback VS Code version from 1.113.0 to 1.114.0
- Raised minimum VS Code engine requirement to ^1.114.0
- Kernel registration uses async `execFile` (no shell) for safety and to
  avoid blocking the extension host event loop

## [1.5.0] - 2026-03-30

### Changed

- **Updated VS Code base to 1.113.0** (latest stable release)
- Updated fallback VS Code version from 1.111.0 to 1.113.0
- Raised minimum VS Code engine requirement to ^1.113.0

### Added

- **Auto-configure Python interpreter after setup** — After pixi installs the
  environment, the workspace `.vscode/settings.json` is automatically updated
  with `python.defaultInterpreterPath` pointing to the pixi Python. This
  eliminates the need for users to manually select the interpreter. Works for
  local (Express and Advanced) and remote SSH setups.
- **Auto-open Table of Contents notebook after setup** (closes #29) — After
  Express or Advanced setup completes, `A_TABLE_OF_CONTENTS.ipynb` is
  automatically opened so users are immediately oriented in the workspace.

## [1.4.0] - 2026-03-10

### Changed

- **Updated VS Code base to 1.111.0** (March 2026 release)
  - New agent permissions and Autopilot mode support
  - Enhanced chat UI with agent-scoped hooks
- Updated fallback VS Code version from 1.108.2 to 1.111.0
- Raised minimum VS Code engine requirement to ^1.111.0

### Added

- **GitHub Copilot Chat** (`GitHub.copilot-chat`) now bundled as a default extension
  - Previously excluded due to version incompatibility, now compatible with VS Code 1.111.0
  - Powers the built-in chat panel, agent mode, and conversational AI features
- Version bump script (`pixi run bump [major|minor|patch|X.Y.Z]`) for easier releases

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

[1.7.0]: https://github.com/ornlneutronimaging/orion/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/ornlneutronimaging/orion/compare/v1.5.1...v1.6.0
[1.5.1]: https://github.com/ornlneutronimaging/orion/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/ornlneutronimaging/orion/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/ornlneutronimaging/orion/compare/v1.3.0...v1.4.0
[1.2.0]: https://github.com/ornlneutronimaging/orion/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/ornlneutronimaging/orion/compare/v1.1.0...v1.1.1
[1.0.0]: https://github.com/ornlneutronimaging/orion/releases/tag/v1.0.0
