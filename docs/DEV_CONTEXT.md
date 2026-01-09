# Orion Studio - Development Context Document

> This document provides comprehensive context for Claude.ai to orchestrate development tasks on the Orion Studio codebase.

## 1. Architecture Deep Dive

### Key Architectural Decision: Wrapper vs. Fork

Orion Studio uses a **wrapper approach** rather than forking VS Code (like VSCodium or Cursor):

| Approach | Orion (Wrapper) | Fork (VSCodium-style) |
|----------|-----------------|----------------------|
| Build time | ~5 minutes | 30-60 minutes |
| VS Code updates | Automatic (downloads latest) | Manual merge conflicts |
| Customization | Extension-based only | Full core modification |
| Maintenance | Low | High |

**Rationale**: Reduced maintenance burden and faster iteration outweigh loss of deep customization. All features are implemented as VS Code extensions.

### Wrapper Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Orion Studio.app (Wrapper)               │
├─────────────────────────────────────────────────────────────┤
│  Contents/                                                  │
│  ├── MacOS/                                                 │
│  │   └── OrionStudio          ← Shell launcher script       │
│  ├── Resources/                                             │
│  │   ├── Visual Studio Code.app/  ← Embedded VS Code        │
│  │   │   └── Contents/Resources/app/extensions/             │
│  │   │       └── orion-launcher/  ← Built-in extension      │
│  │   └── code-portable-data/      ← Portable mode data      │
│  │       ├── user-data/User/settings.json                   │
│  │       └── extensions/          ← Marketplace extensions  │
│  └── Info.plist                                             │
└─────────────────────────────────────────────────────────────┘
```

### How It Works

1. **build_orion.py** downloads official VS Code from Microsoft's CDN
2. Creates an outer wrapper app bundle that embeds VS Code
3. **launch_orion.sh** launches the embedded Electron with portable mode flags
4. Extensions are split:
   - **orion-launcher**: Bundled as "built-in" in `Resources/app/extensions/`
   - **Marketplace extensions**: Installed to `code-portable-data/extensions/`

### Portable Mode

VS Code's portable mode stores all user data inside the application:
- No writes to system directories (`~/Library/Application Support/` etc.)
- User can delete the app to remove all traces
- Configuration travels with the app

---

## 2. Roadmap & Current State

### Phase Status Overview

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 0 | Project Setup | ✅ Complete |
| Phase 1 | Core Infrastructure | ⚠️ Partially Complete |
| Phase 2 | Notebook Version Selector | 📋 Planned |
| Phase 3 | Pixi Environment Manager | 📋 Planned |
| Phase 4 | Authentication | 📋 Planned |
| Phase 5 | Extension Bundling | ⚠️ Partially Complete |
| Phase 6 | Packaging & Distribution | ✅ Complete |
| Phase 7 | Launch & Support | 📋 Planned |

### Current Active Work (Phase 1 Remaining)

From the roadmap, these items remain in Phase 1:

- [ ] Create `src/vs/neutron/` directory structure (abandoned - wrapper approach)
- [ ] Set up TypeScript configuration for neutron namespace
- [ ] Create service injection framework
- [ ] Implement GitService with listBranches(), listTags(), checkout()
- [ ] Implement PixiService with detectManifest(), install(), getStatus()
- [ ] Status bar integration for pixi
- [ ] Command registration (`neutron.selectNotebookVersion`, etc.)

**Note**: The roadmap was written for a VSCodium fork approach. The project pivoted to the wrapper approach, so many Phase 1-4 items are now implemented differently via the orion-launcher extension.

### What's Actually Implemented

Based on code analysis:

1. **Build System** - Complete
2. **macOS/Linux Packaging** - Complete (DMG, tarball)
3. **Extension Bundling** - Complete (marketplace + custom)
4. **Welcome Wizard** - Complete
5. **Remote SSH Connection** - Complete (via UI)
6. **Git Clone/Checkout** - Complete (basic)
7. **Pixi Install** - Complete (basic)

### What's Missing (Gap Analysis)

1. **Git branch selector UI** - Not yet implemented
2. **Pixi status bar indicator** - Not yet implemented
3. **LDAP Authentication** - Not implemented
4. **Auto-update system** - Not implemented
5. **Windows support** - Not implemented
6. **Code signing/notarization** - Not implemented

---

## 3. Orion Launcher Extension Analysis

### package.json Configuration

```json
{
  "name": "orion-launcher",
  "activationEvents": ["onStartupFinished"],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [{
      "command": "orion-launcher.openWizard",
      "title": "Open Orion Wizard"
    }]
  },
  "dependencies": {
    "simple-git": "^3.22.0"
  }
}
```

**Activation**: Runs after VS Code fully loads via `onStartupFinished`

### Extension Entry Point (extension.ts)

```typescript
export function activate(context: vscode.ExtensionContext) {
  // 1. Register openWizard command
  // 2. Add status bar item "$(rocket) Orion Home"
  // 3. Check config and launch wizard if needed
}

async function checkConfigAndLaunch(context) {
  // Reads ~/.orion-studio/config.json
  // If missing: Show wizard
  // If exists: Open target workspace
}

export async function runSetup(config, progress) {
  // Handles both local and remote (SSH) setup
  // Clones repo, installs pixi, opens folder
}
```

### Command Implementations

| Command | Function | Description |
|---------|----------|-------------|
| `orion-launcher.openWizard` | `OrionWizardPanel.createOrShow()` | Opens the setup wizard webview |

### Webview Panel (OrionWizardPanel.ts)

The wizard uses VS Code's Webview API with embedded HTML/CSS/JS:

**Steps:**
1. **Welcome** - Choose "Local" or "Connect to Cluster"
2. **Remote** (if cluster) - Select analysis node (bl10-analysis1.sns.gov, analysis.sns.gov, custom)
3. **Setup Workspace** - "Open Existing" or "Clone Fresh Copy"
4. **Configuration** - Target folder, branch name, Copilot toggle

**Message Handlers:**
- `saveConfig` - Saves to `~/.orion-studio/config.json`, runs setup
- `selectFolder` - Opens folder picker dialog
- `connectRemote` - Opens new window with SSH remote authority

### Service Classes

**GitService.ts:**
```typescript
class GitService {
  async clone(repoUrl, targetDir, branchName?)
  // Uses simple-git library
  // Handles existing repo detection
  // Creates/checks out branch
}
```

**PixiService.ts:**
```typescript
class PixiService {
  async checkAndInstall()    // Auto-install pixi if missing
  async runInstall(targetDir) // Run `pixi install` in directory
  private isPixiInstalled()   // Check if pixi command exists
  private getPixiPath()       // Returns ~/.pixi/bin/pixi or "pixi"
  private installPixi()       // curl | bash install script
}
```

### Remote Connection Logic

```typescript
// In OrionWizardPanel._connectRemote()
await vscode.commands.executeCommand("vscode.newWindow", {
  remoteAuthority: `ssh-remote+${host}`,  // e.g., "ssh-remote+bl10-analysis1.sns.gov"
  reuseWindow: true
});
```

Uses the `remote.SSH.defaultExtensions` setting to auto-install extensions on remote.

---

## 4. Build System

### Build Script Flow (build_orion.py)

```
1. get_latest_version()     → Query VS Code API for latest stable
2. get_download_url()       → Construct platform-specific download URL
3. download_file()          → Download ZIP/tar.gz
4. extract_file()           → Extract with proper permissions
5. create wrapper structure:
   ├── generate_icons()     → SVG → icns/PNG conversion
   ├── copy launch_orion.sh → Main executable
   ├── write Info.plist     → macOS app metadata
   └── move VS Code.app     → Embed in Resources/
6. setup_portable_mode()    → Create code-portable-data/
7. install_extensions():
   ├── npm install/compile  → Build orion-launcher
   ├── copy to built-in     → Resources/app/extensions/
   └── download marketplace → code-portable-data/extensions/
8. create_dmg()/create_tarball() → Package for distribution
```

### Key Functions

**get_extension_info(extension_id)**
- Queries VS Code Marketplace API
- Returns VSIX download URL, version, dependencies
- Handles platform-specific packages (darwin-arm64, linux-x64, etc.)

**install_with_dependencies(ext_id)**
- Recursive dependency resolution
- Parses ExtensionDependencies and ExtensionPack
- Cycle detection for circular dependencies
- Respects exclusion list (`# !extension.id`)

### Platform-Specific Handling

| Platform | Output | Notes |
|----------|--------|-------|
| macOS ARM | `dist/Orion Studio.app` + `OrionStudio-macOS.dmg` | Uses cairosvg for icon generation |
| macOS Intel | Same | Untested but should work |
| Linux x64 | `dist/OrionStudio/` + `OrionStudio-linux.tar.gz` | Includes .desktop file |
| Windows | ❌ Not implemented | Would need .exe wrapper |

### Code Signing Status

**Not implemented.** The DMG is unsigned, which causes Gatekeeper warnings on macOS. Users must:
```bash
xattr -cr "dist/Orion Studio.app"
```

---

## 5. Configuration

### extensions.txt

```
ms-vscode-remote.remote-ssh    # Remote development over SSH
ms-toolsai.jupyter             # Jupyter notebook support
ms-python.python               # Python language support
ms-python.vscode-pylance       # Python IntelliSense
ms-python.debugpy              # Python debugger
GitHub.copilot                 # AI coding assistant
tamasfe.even-better-toml       # TOML file support
h5web.vscode-h5web             # HDF5 file visualization

# Excluded (incompatible versions):
# !GitHub.copilot-chat
```

**Extension Format:**
- `publisher.name` - Latest version
- `publisher.name@1.2.3` - Pinned version
- `# !publisher.name` - Excluded (for dependency conflicts)

### settings.json

```json
{
  "workbench.startupEditor": "none",        // Don't show welcome tab
  "workbench.colorTheme": "Default Light Modern",
  "workbench.iconTheme": "vs-seti",
  "security.workspace.trust.enabled": false, // Disable trust prompts
  "telemetry.telemetryLevel": "off",         // Privacy
  "update.mode": "manual",                   // No auto-update
  "extensions.autoUpdate": true,
  "window.title": "Orion Studio",
  "remote.SSH.showLoginTerminal": true,
  "remote.SSH.useLocalServer": false,
  "workbench.activityBar.visible": false,    // Hidden for simpler UI
  "workbench.statusBar.visible": true,
  "window.menuBarVisibility": "compact",     // Minimal menu
  "jupyter.askForKernelRestart": false,
  "http.proxyStrictSSL": false,              // For ORNL network
  "remote.SSH.defaultExtensions": [...]      // Auto-install on remote
}
```

**Neutron Imaging-Specific:**
- Telemetry disabled for ORNL compliance
- SSL verification disabled for corporate proxies
- Remote SSH configured for analysis clusters
- Jupyter configured for minimal friction

---

## 6. Dependencies (pixi.toml)

```toml
[workspace]
name = "orion"
platforms = ["osx-arm64", "linux-64"]
version = "1.2.0"

[dependencies]
nodejs = "22.*"      # VS Code's expected runtime
python = "3.11.*"    # Stable version (3.14 too new)
pre-commit = ">=3.8"
ruff = ">=0.8"
cairosvg = ">=2.8.2,<3"  # SVG to PNG/ICNS conversion

[tasks]
build = "python scripts/build_orion.py"
clean = "rm -rf build dist"
clean_config = "rm -rf ~/.orion-studio"
lint = "pre-commit run --all-files"
lint-install = "pre-commit install"
```

### Missing Platforms
- `osx-64` (Intel Mac) - Not in platforms list
- `win-64` (Windows) - Not supported

### Task Reference

| Task | Command |
|------|---------|
| `pixi run build` | Build complete application |
| `pixi run clean` | Remove build/dist directories |
| `pixi run clean_config` | Remove user config (~/.orion-studio) |
| `pixi run lint` | Run all linters |
| `pixi run lint-install` | Install git pre-commit hooks |

---

## 7. Code Quality & Conventions

### Pre-commit Hooks (.pre-commit-config.yaml)

| Hook | Purpose |
|------|---------|
| `trailing-whitespace` | Remove trailing whitespace |
| `end-of-file-fixer` | Ensure files end with newline |
| `check-yaml/json/toml` | Validate syntax |
| `check-merge-conflict` | Prevent committing conflict markers |
| `check-added-large-files` | Block files >1MB |
| `mixed-line-ending` | Enforce LF line endings |
| `ruff` | Python linting with auto-fix |
| `ruff-format` | Python formatting |
| `prettier` | TypeScript/JavaScript formatting |
| `shellcheck` | Shell script analysis |
| `markdownlint` | Markdown formatting |

### Ruff Configuration (ruff.toml)

```toml
line-length = 120
target-version = "py311"

[lint]
select = ["E", "W", "F", "I", "B", "C4", "UP"]
# E/W: pycodestyle, F: pyflakes, I: isort
# B: flake8-bugbear, C4: comprehensions, UP: pyupgrade
```

### CI Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `pr-validation.yml` | PR open/sync | Fast checks (~5 min) |
| `ci-build.yml` | Push to main, PRs | Full build test (~30 min) |
| `release.yml` | Tag `v*` | Build + create GitHub release |

**PR Validation Checks:**
- README exists
- pixi.toml valid (correct Node/Python versions)
- .gitignore includes build/dist
- No files >10MB

---

## 8. Open Work Items

### No TODO/FIXME Comments Found
A grep for `TODO|FIXME|HACK|XXX` returned no results.

### Incomplete Features (from roadmap analysis)

1. **Git Version Selector UI**
   - Roadmap Phase 2 describes toolbar button to select branches/tags
   - Currently only clone + checkout on setup, no runtime switching

2. **Pixi Status Bar**
   - Roadmap Phase 1/3 describes "Pixi: Ready/Not Found/Installing" indicator
   - Currently only install during setup

3. **LDAP Authentication**
   - Roadmap Phase 4 describes LDAP login at startup
   - Not implemented, SSH key passthrough is used instead

4. **Auto-Update System**
   - Roadmap Phase 6 describes update checker
   - Not implemented

5. **Custom Neutron Imaging Extension**
   - Roadmap Phase 5 describes `neutron-imaging` extension
   - Snippets, templates, visualization helpers
   - Not implemented

### Architectural Gaps

1. **Windows Support** - Platform not in pixi.toml, no build logic
2. **Code Signing** - DMG unsigned, causes Gatekeeper warnings
3. **Error Telemetry** - No crash reporting (intentional for ORNL?)

---

## 9. Key File Reference

| File/Directory | Purpose | When to Modify |
|----------------|---------|----------------|
| `scripts/build_orion.py` | Main build script | Adding platforms, changing VS Code version logic |
| `scripts/launch_orion.sh` | App launcher | Changing CLI args, paths |
| `config/extensions.txt` | Bundled extensions | Adding/removing marketplace extensions |
| `config/settings.json` | Default VS Code settings | Changing user defaults |
| `extensions/orion-launcher/src/extension.ts` | Extension entry | Adding commands, startup logic |
| `extensions/orion-launcher/src/OrionWizardPanel.ts` | Setup wizard | Modifying wizard UI/flow |
| `extensions/orion-launcher/src/GitService.ts` | Git operations | Changing clone/checkout behavior |
| `extensions/orion-launcher/src/PixiService.ts` | Pixi operations | Changing environment setup |
| `extensions/orion-launcher/package.json` | Extension manifest | Adding commands, activation events |
| `pixi.toml` | Project config | Dependencies, platforms, tasks |
| `.pre-commit-config.yaml` | Linting config | Code quality rules |
| `ruff.toml` | Python linting | Python-specific rules |
| `.github/workflows/ci-build.yml` | CI pipeline | Build/test automation |
| `.github/workflows/release.yml` | Release pipeline | Distribution automation |
| `resources/icons/orion-icon.svg` | App icon source | Branding changes |

---

## 10. Domain-Specific Notes

### ORNL Analysis Clusters

The wizard offers connection to:
- `bl10-analysis1.sns.gov` - BL10 dedicated analysis node (requires ORNL network)
- `analysis.sns.gov` - Load-balanced analysis cluster

These are Linux servers with shared filesystems (`/SNS/users/...`) for neutron data.

### Repository Registry

The wizard supports multiple notebook repositories via a registry:

| Repository | URL | Target Directory | Description |
|------------|-----|------------------|-------------|
| Reduction | `neutronimaging/python_notebooks` | `~/orion_notebooks` | Process raw neutron data into hyperspectrum |
| Reconstruction | `ornlneutronimaging/all_ct_reconstruction` | `~/orion_ct_recon` | CT reconstruction from projection stacks |

Express Setup provides one-click buttons for each workflow. Advanced mode allows selecting from registered repos or entering a custom URL.

### H5Web Extension

`h5web.vscode-h5web` is included for viewing HDF5 files (`.h5`, `.nxs`), which is the standard format for neutron scattering data at ORNL.

### Pixi for Reproducibility

Pixi is used instead of pip/conda because:
1. Exact lockfile for reproducible environments
2. Works on shared filesystems (analysis clusters)
3. No admin privileges needed
4. Handles both Python and non-Python dependencies

### Configuration Location

The `~/.orion-studio/` directory is preserved for future diagnostic logs but is no longer used for session persistence. The Express Setup workflow creates fresh session branches on each launch.

### Scientific Computing Dependencies

Currently no scientific packages bundled (numpy, tomopy, etc.) - these come from the cloned repository's `pixi.toml`.

---

## Summary: Development Priorities

### Immediate (Low Effort, High Value)
1. Add Intel Mac (`osx-64`) to pixi.toml platforms
2. Create issue templates for GitHub
3. Fix inconsistency: `GitHub.copilot-chat` in settings but excluded in extensions.txt

### Short-term (Medium Effort)
1. Implement git branch/tag selector in status bar
2. Add pixi status indicator
3. Code signing for macOS DMG

### Long-term (High Effort)
1. Windows support
2. Auto-update mechanism
3. Custom neutron-imaging extension with templates/snippets
4. LDAP authentication (if still needed)

---

*Generated: 2025-01-08 | Orion Studio v1.2.0*
