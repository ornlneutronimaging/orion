# Orion Studio - Architecture Document

## Overview
A custom VSCode fork optimized for neutron imaging notebook workflows, similar to how Cursor customized VSCode for AI development.

## Project Goals
1. Provide stable, native Jupyter notebook interface (replacing browser-based JupyterLab)
2. Integrate git-based notebook version management with UI controls
3. Automate Python environment management via pixi
4. Integrate ORNL LDAP/SSH authentication
5. Leverage existing VSCode extension marketplace
6. Add custom neutron imaging-specific tools

## Architecture Overview

```
orion-studio/
├── vscode/                           # Forked from VSCodium
│   ├── src/
│   │   ├── vs/
│   │   │   ├── orion/                # Our custom code namespace
│   │   │   │   ├── browser/          # UI components
│   │   │   │   │   ├── notebookVersionSelector/
│   │   │   │   │   ├── pixiEnvironmentManager/
│   │   │   │   │   └── authenticationProvider/
│   │   │   │   ├── common/           # Shared code
│   │   │   │   │   ├── config.ts
│   │   │   │   │   └── constants.ts
│   │   │   │   └── node/             # Backend services
│   │   │   │       ├── pixiService.ts
│   │   │   │       ├── ldapService.ts
│   │   │   │       └── gitService.ts
│   │   │   ├── workbench/            # VSCode workbench modifications
│   │   │   │   └── contrib/orion/    # Register our features
│   │   │   └── code/                 # Entry points
│   ├── product.json                  # Branding configuration
│   ├── package.json                  # Build dependencies
│   └── build/                        # Build scripts
├── extensions/                       # Pre-bundled extensions
│   ├── ms-toolsai.jupyter/          # Jupyter notebook support
│   ├── continue.continue/           # AI coding (OpenRouter)
│   └── neutron-imaging/             # Custom extension
│       ├── package.json
│       └── src/
│           ├── analysis/            # Neutron analysis tools
│           ├── visualization/       # Custom viewers
│           └── templates/           # Notebook templates
├── resources/                        # Branding assets
│   ├── icons/
│   ├── themes/
│   └── splash/
└── scripts/
    ├── build.sh                     # Build automation
    ├── package-linux.sh             # Package for distribution
    └── update-check.sh              # Auto-update mechanism
```

## Core Custom Features

### 1. Notebook Version Selector
**Location:** Top toolbar (editor/title area)
**Functionality:**
- Detect git repository in workspace
- Show current branch/tag
- Dropdown menu listing available notebook versions
- One-click checkout to different version
- Warning if local changes exist

**Implementation:**
```typescript
// src/vs/orion/browser/notebookVersionSelector/notebookVersionSelector.ts
export class NotebookVersionSelector {
  // UI component in toolbar
  // Calls git service to list tags/branches
  // Executes checkout and refreshes workspace
}
```

### 2. Pixi Environment Manager
**Location:** Status bar + auto-detection
**Functionality:**
- Detect pixi.toml in workspace root
- Show environment status (not installed / installed / outdated)
- Quick action buttons: "Install Environment", "Update Environment", "Use System Python"
- Integration with Jupyter kernel picker
- Progress indicator during pixi operations

**Implementation:**
```typescript
// src/vs/orion/node/pixiService.ts
export class PixiService {
  detectPixiManifest(): boolean
  getEnvironmentStatus(): PixiEnvStatus
  installEnvironment(): Promise<void>
  listAvailableEnvironments(): string[]
}
```

### 3. ORNL LDAP/SSH Authentication
**Location:** Startup authentication screen
**Functionality:**
- Custom authentication provider
- LDAP authentication against ORNL directory
- SSH key validation (alternative)
- Remember credentials (secure storage)
- Offline mode for authenticated users

**Implementation:**
```typescript
// src/vs/orion/node/ldapService.ts
export class OrnlAuthenticationProvider implements AuthenticationProvider {
  authenticate(username: string, password: string): Promise<boolean>
  validateSshKey(): Promise<boolean>
  getToken(): string
}
```

### 4. Neutron Imaging Tools Extension
**Separate Extension (easier to update independently)**
- Analysis function library for notebooks
- Custom visualizations for neutron data
- Notebook templates for common workflows
- Data import/export utilities
- Integration with ORNL data systems

## Technical Stack

### Languages
- **TypeScript** - Core VSCode codebase
- **JavaScript** - Extension code, build scripts
- **Python** - Neutron analysis libraries (bundled with pixi)
- **HTML/CSS** - Custom UI components (webviews)
- **Shell** - Build and deployment scripts

### Key Dependencies
- **Electron** - Desktop application framework
- **Monaco Editor** - Code editor (built into VSCode)
- **Node.js** - Runtime and build tools
- **Yarn** - Package management
- **Gulp** - Build system

### VSCode Extension APIs Used
- **Authentication API** - Custom LDAP provider
- **Webview API** - Custom UI panels
- **Commands API** - Custom toolbar buttons
- **Status Bar API** - Pixi environment indicator
- **File System API** - Git operations
- **Terminal API** - Execute pixi/git commands

## Branding Configuration

### product.json Key Fields
```json
{
  "nameShort": "Orion Studio",
  "nameLong": "Orion Studio",
  "applicationName": "orion-studio",
  "dataFolderName": ".orion-studio",
  "win32MutexName": "orionstudio",
  "licenseName": "MIT",
  "licenseUrl": "https://github.com/ornlneutronimaging/orion/blob/main/LICENSE",
  "extensionsGallery": {
    "serviceUrl": "https://marketplace.visualstudio.com/_apis/public/gallery",
    "itemUrl": "https://marketplace.visualstudio.com/items"
  },
  "extensionEnabledApiProposals": {
    "neutron-imaging": ["authentication"]
  }
}
```

## Build Process

### 1. Initial Fork Setup
```bash
# Clone VSCodium (which tracks VSCode)
git clone https://github.com/VSCodium/vscodium.git
cd vscodium

# Create our custom branch
git checkout -b ornl/orion-studio

# Add our custom code
mkdir -p vscode/src/vs/orion
```

### 2. Development Build
```bash
# Install dependencies
yarn install

# Build for development
yarn gulp vscode-linux-x64-min

# Run in development mode
./VSCode-linux-x64/code-oss
```

### 3. Production Build
```bash
# Full optimized build
yarn gulp vscode-linux-x64

# Package as AppImage
./scripts/package-linux.sh
```

### 4. Continuous Integration
- GitHub Actions for automated builds
- Build on: push to main, tags, pull requests
- Artifacts: Linux (DEB, RPM, AppImage), Windows (MSI), macOS (DMG)

## Extension Marketplace Strategy

### Use Existing VSCode Marketplace
**Pros:**
- Access to 40,000+ extensions
- No need to host our own marketplace
- Users can install Python, Git, Docker extensions, etc.

**Configuration:**
Keep Microsoft's extensionsGallery URLs in product.json (like VSCodium does)

### Custom Extensions
Ship pre-installed:
1. **ms-toolsai.jupyter** - Official Jupyter extension
2. **continue.continue** - AI coding with OpenRouter
3. **neutron-imaging** - Our custom tooling

Users can install additional extensions from marketplace as needed.

## Deployment Strategy

### Package Formats
- **Linux:** DEB (Ubuntu/Debian), RPM (RHEL/CentOS), AppImage (universal)
- **Windows:** MSI installer (if needed)
- **macOS:** DMG (if needed)

### Distribution Channels
1. Internal ORNL package repository
2. GitHub Releases (public or private repo)
3. Shared network location (/SNS/software/orion-studio/)
4. Auto-update mechanism (download from GitHub releases)

### Installation Experience
```bash
# User downloads installer
wget https://github.com/ornlneutronimaging/orion/releases/latest/orion-studio.AppImage

# Make executable
chmod +x orion-studio.AppImage

# First run
./orion-studio.AppImage
# Shows: LDAP authentication screen
# After auth: Opens with default workspace or workspace picker
```

### Updates
- Check for updates on startup
- Auto-download and prompt to install
- Or: Use system package manager (apt, yum)

## Notebook Workflow Integration

### User Journey

1. **Launch Application**
   - Desktop icon: "Orion Studio"
   - Splash screen with ORNL branding
   - Authentication prompt (LDAP or SSH key)

2. **First-Time Workspace Setup**
   - Prompt: "Choose notebook repository"
   - Options:
     - Clone from GitHub (default ORNL repo)
     - Open existing folder
     - Start with empty workspace
   - Auto-detect pixi.toml → prompt to install environment

3. **Daily Workflow**
   - Open studio → auto-opens last workspace
   - Status bar shows:
     - Current notebook version (git branch/tag)
     - Pixi environment status
     - Jupyter kernel status
   - Toolbar buttons:
     - 📚 Switch Notebook Version
     - 🐍 Manage Python Environment
     - 🔄 Sync with Repository

4. **Switching Notebook Versions**
   - Click "Switch Version" button
   - Dropdown shows:
     - ✓ v2.1.0 (current)
     - v2.0.0
     - v1.9.1
     - develop (latest)
   - Select version → git checkout → reload

5. **Environment Management**
   - Auto-detect pixi.toml changes (via file watcher)
   - Prompt: "Environment definition changed. Update?"
   - Click "Update" → runs pixi install
   - Progress shown in terminal panel

### Git Integration Behavior

**Branch Strategy:**
- `main` - Stable notebook templates (read-only for most users)
- `develop` - Latest development notebooks (opt-in)
- `user/username` - Personal modifications (encouraged)

**User Modifications:**
- Warn before checking out if uncommitted changes
- Offer: "Stash changes", "Commit changes", "Discard changes"
- Never lose user work

## Security Considerations

### LDAP Authentication
- Credentials stored in OS keychain (encrypted)
- Token-based session (expires after 24 hours)
- Optional: Remember me (store token securely)

### SSH Key Authentication
- Check for ~/.ssh/id_rsa or configured key
- Validate against ORNL authentication server
- No password storage required

### Network Security
- All git operations over HTTPS or SSH
- Optional: Use ORNL VPN requirement check
- Extension marketplace over HTTPS

### Code Execution
- Jupyter kernels run in isolated pixi environments
- No elevated privileges required
- Notebooks run with user permissions only

## Testing Strategy

### Unit Tests
- Jest for TypeScript code
- Test: Git service, Pixi service, LDAP service
- Mock external dependencies

### Integration Tests
- Test: Toolbar buttons trigger correct actions
- Test: Authentication flow
- Test: Environment detection and installation

### End-to-End Tests
- Playwright for UI testing
- Test: Complete user workflows
- Test: On Linux VM (CI)

### User Acceptance Testing
- Beta program with neutron imaging users
- Collect feedback on UX
- Iterate on custom features

## Maintenance Plan

### Upstream Sync Strategy
- Track VSCodium releases (they track VSCode)
- Quarterly updates (not every VSCode release)
- Test custom features after each merge
- Automated tests catch regressions

### Versioning
- Semantic versioning: MAJOR.MINOR.PATCH
- MAJOR: VSCode version update (e.g., 1.90 → 1.91)
- MINOR: New custom features
- PATCH: Bug fixes

### Support
- GitHub Issues for bug reports
- Internal Slack channel for users
- Documentation wiki
- Video tutorials for common tasks

## Success Metrics

### Adoption
- Number of active users
- Number of notebooks opened per week
- Reduction in support tickets (vs old JupyterLab)

### Stability
- Crash reports (telemetry opt-in)
- Time to complete common tasks
- User satisfaction surveys

### Maintenance
- Time to merge upstream updates
- Number of custom feature bugs
- Community contributions (if open-source)

## Open Source Strategy

### License
- Fork inherits MIT license (from VSCode/VSCodium)
- Custom extensions: MIT or Apache 2.0
- Clear attribution to Microsoft and VSCodium

### Repository
- Public or Private?
  - **Public:** Community contributions, transparency
  - **Private:** ORNL-specific features, security
- Recommendation: Public repo with private ORNL-specific extensions

### Community
- Accept pull requests for bug fixes
- Feature requests via GitHub Issues
- Monthly releases with changelog

## Future Enhancements (Post-MVP)

### Phase 2 Features
- **Cloud Sync:** Sync workspace settings across machines
- **Collaboration:** Real-time notebook collaboration (like Google Docs)
- **Remote Compute:** Run notebooks on ORNL compute cluster
- **Data Browser:** Built-in neutron data file browser
- **Custom Themes:** Neutron imaging specific color schemes

### Phase 3 Features
- **Web Version:** Browser-based version (using code-server approach)
- **Mobile Viewer:** iOS/Android app for viewing notebooks
- **Integration with Analysis Pipeline:** Submit jobs to beamline DAQ
- **Instrument Status:** Real-time beamline status in IDE

## Cost Analysis (Revised with AI Assistance)

### Initial Development (8 weeks)
- Lead Developer (with Claude AI): 8 weeks @ 40 hrs/week = 320 hours
  - At ORNL rates: ~$25,000 (including overhead)
- Infrastructure setup: $2,000
- Testing environment: $1,000
- **Total: ~$28,000**

### Ongoing Maintenance (Annual)
- Quarterly upstream merges: 40 hours/quarter × 4 = 160 hours/year
- Bug fixes and user support: 10 hours/month × 12 = 120 hours/year
- Feature additions: 80 hours/year
- **Total: ~360 hours/year = $18,000/year**

### Cost Savings vs Current System
- **Reduced support tickets:** Browser JupyterLab issues eliminated
- **Reduced training time:** Familiar IDE interface
- **Reduced dependency conflicts:** Pixi isolation
- **Reduced notebook corruption:** Git version control

**Estimated ROI:** Break-even in 18-24 months if supporting 20+ users

## Conclusion

This architecture provides:
✅ Best Jupyter notebook experience (native VSCode API)
✅ Custom UI for neutron imaging workflows
✅ LDAP/SSH authentication integration
✅ Pixi environment automation
✅ Access to full VSCode extension ecosystem
✅ Professional, maintainable codebase
✅ Clear path for future enhancements

**Next Steps:** See ROADMAP.md for phased implementation plan
