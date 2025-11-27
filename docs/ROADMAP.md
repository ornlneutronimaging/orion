# Orion Studio - Development Roadmap

## Phase 0: Project Setup (Week 1)

### Goals

- Set up development environment
- Fork and build VSCodium successfully
- Establish project infrastructure
- Create team communication channels

### Tasks

#### Day 1-2: Environment Setup

- [x] Install build dependencies (Node.js 22.x, Python 3.11, build-essential)
- [x] Clone VSCodium repository
- [x] Successful development build
- [x] Test that it runs
- [x] Document build process

```bash
# Example setup
git clone https://github.com/VSCodium/vscodium.git
cd vscodium
git checkout main
git pull

# Create our custom branch
git checkout -b ornl/orion-studio-main

# Build
VSCODE_QUALITY=stable ./get_repo.sh  # Downloads VSCode source
npm install    # Install dependencies (npm, not yarn!)
npm run gulp -- vscode-linux-x64-min  # Build (faster dev build)

# Test run
./VSCode-linux-x64/bin/code-oss

# Or using pixi (from orion root):
pixi run get-vscode
pixi run build-vscode
pixi run run-vscode
```

#### Day 3-4: Project Infrastructure

- [x] Create GitHub repository (ornl/orion)
- [x] Set up CI/CD pipeline (GitHub Actions)
- [x] Configure branch protection
- [x] Create project documentation structure
- [ ] Set up issue templates

#### Day 5: Branding Basics

- [ ] Modify product.json with basic branding
- [ ] Change application name to "Orion Studio"
- [ ] Replace icons (basic placeholder)
- [ ] Test that branded build works
- [ ] Package as AppImage for testing

**Deliverable:** Working VSCodium build with Neutron Studio branding

---

## Phase 1: Core Infrastructure (Week 2-3)

### Goals

- Create foundation for custom features
- Set up development workflow
- Implement basic services

### Week 2: Custom Code Structure

#### Day 1-2: Project Structure

- [ ] Create `src/vs/neutron/` directory structure
- [ ] Set up TypeScript configuration for neutron namespace
- [ ] Create service injection framework
- [ ] Implement configuration system

```typescript
// File: src/vs/neutron/common/config.ts
export interface INeutronConfig {
  defaultNotebookRepo: string;
  ldapServer: string;
  pixiEnabled: boolean;
}

export const NeutronConfig: INeutronConfig = {
  defaultNotebookRepo: 'https://github.com/ornl/neutron-notebooks',
  ldapServer: 'ldaps://ldap.ornl.gov',
  pixiEnabled: true
};
```

#### Day 3-4: Git Service

- [ ] Implement GitService class
- [ ] Methods: listBranches(), listTags(), checkout(), getCurrentBranch()
- [ ] Error handling for git operations
- [ ] Unit tests

```typescript
// File: src/vs/neutron/node/gitService.ts
export class GitService {
  constructor(private workspaceRoot: string) {}

  async listBranches(): Promise<string[]> {
    // Execute: git branch -a
    // Parse output
    // Return list
  }

  async checkout(ref: string): Promise<void> {
    // Check for uncommitted changes
    // Execute: git checkout <ref>
    // Trigger workspace reload
  }
}
```

#### Day 5: Pixi Service

- [ ] Implement PixiService class
- [ ] Methods: detectManifest(), install(), getStatus()
- [ ] Handle pixi command execution
- [ ] Unit tests

### Week 3: Basic UI Integration

#### Day 1-2: Status Bar Integration

- [ ] Add pixi status indicator to status bar
- [ ] Show "Pixi: Ready" / "Pixi: Not Found" / "Pixi: Installing"
- [ ] Click to open environment manager
- [ ] Test with sample workspace

#### Day 3-4: Command Registration

- [ ] Register custom commands in workbench
- [ ] `neutron.selectNotebookVersion`
- [ ] `neutron.installPixiEnvironment`
- [ ] `neutron.authenticate`
- [ ] Add to command palette

#### Day 5: Integration Testing

- [ ] Test all services work together
- [ ] Fix bugs found during testing
- [ ] Update documentation

**Deliverable:** Custom services working, status bar showing pixi status

---

## Phase 2: Notebook Version Selector (Week 4)

### Goals

- Implement UI for selecting notebook versions
- Integrate with git service
- Handle edge cases (uncommitted changes, etc.)

### Tasks

#### Day 1-2: UI Component

- [ ] Create toolbar button for notebook version selector
- [ ] Implement dropdown menu (using VSCode QuickPick API)
- [ ] Show current branch/tag
- [ ] List available branches and tags

```typescript
// File: src/vs/neutron/browser/notebookVersionSelector/versionSelector.ts
export class NotebookVersionSelector {
  async showVersionPicker() {
    const gitService = new GitService(workspace.rootPath);
    const branches = await gitService.listBranches();
    const tags = await gitService.listTags();

    const items = [
      { label: '$(git-branch) Branches', kind: QuickPickItemKind.Separator },
      ...branches.map(b => ({ label: b, description: 'branch' })),
      { label: '$(tag) Tags', kind: QuickPickItemKind.Separator },
      ...tags.map(t => ({ label: t, description: 'tag' }))
    ];

    const selected = await vscode.window.showQuickPick(items);
    if (selected) {
      await this.checkoutVersion(selected.label);
    }
  }
}
```

#### Day 3: Git Integration

- [ ] Implement checkout logic
- [ ] Check for uncommitted changes
- [ ] Show warning dialog if changes exist
- [ ] Options: Stash, Commit, Discard, Cancel

#### Day 4: Workspace Reload

- [ ] Trigger workspace reload after checkout
- [ ] Preserve open editors where possible
- [ ] Show notification: "Switched to version X"

#### Day 5: Testing & Polish

- [ ] Test with real git repositories
- [ ] Handle errors gracefully
- [ ] Add keyboard shortcuts
- [ ] Update documentation

**Deliverable:** Working notebook version selector in toolbar

---

## Phase 3: Pixi Environment Manager (Week 5)

### Goals

- Complete pixi integration
- Auto-detection of pixi.toml
- UI for environment management

### Tasks

#### Day 1-2: Auto-Detection

- [ ] File watcher for pixi.toml
- [ ] Detect on workspace open
- [ ] Show notification: "Pixi environment detected"
- [ ] Offer to install environment

#### Day 2-3: Installation UI

- [ ] Create webview panel for pixi management
- [ ] Show current environment status
- [ ] Buttons: Install, Update, View Packages
- [ ] Progress indicator during installation

```typescript
// File: src/vs/neutron/browser/pixiEnvironmentManager/pixiPanel.ts
export class PixiEnvironmentPanel {
  private panel: vscode.WebviewPanel;

  constructor() {
    this.panel = vscode.window.createWebviewPanel(
      'pixiEnvironment',
      'Pixi Environment Manager',
      vscode.ViewColumn.Two,
      { enableScripts: true }
    );

    this.panel.webview.html = this.getHtmlContent();
  }

  private getHtmlContent(): string {
    return `
      <!DOCTYPE html>
      <html>
        <body>
          <h2>Python Environment</h2>
          <p>Status: <span id="status">Checking...</span></p>
          <button onclick="install()">Install Environment</button>
          <button onclick="update()">Update Packages</button>
          <pre id="output"></pre>
        </body>
      </html>
    `;
  }
}
```

#### Day 4: Terminal Integration

- [ ] Run pixi commands in integrated terminal
- [ ] Stream output to user
- [ ] Handle errors (pixi not installed, invalid manifest)

#### Day 5: Jupyter Kernel Integration

- [ ] Detect pixi environments in kernel picker
- [ ] Configure Jupyter extension to use pixi kernel
- [ ] Test notebook execution with pixi environment

**Deliverable:** Complete pixi environment management

---

## Phase 4: Authentication (Week 6)

### Goals

- Implement LDAP authentication
- SSH key fallback
- Secure credential storage

### Tasks

#### Day 1-2: Authentication UI

- [ ] Create authentication dialog (on startup)
- [ ] Username/password fields
- [ ] "Use SSH Key" option
- [ ] "Remember me" checkbox
- [ ] ORNL branding

#### Day 3-4: LDAP Service

- [ ] Implement LDAP client (using ldapjs)
- [ ] Connect to ORNL LDAP server
- [ ] Authenticate user credentials
- [ ] Handle connection errors

```typescript
// File: src/vs/neutron/node/ldapService.ts
import * as ldap from 'ldapjs';

export class LdapAuthenticationService {
  async authenticate(username: string, password: string): Promise<boolean> {
    const client = ldap.createClient({
      url: 'ldaps://ldap.ornl.gov'
    });

    return new Promise((resolve, reject) => {
      client.bind(`uid=${username},ou=people,dc=ornl,dc=gov`, password, (err) => {
        if (err) {
          resolve(false);
        } else {
          resolve(true);
        }
        client.unbind();
      });
    });
  }
}
```

#### Day 5: SSH Key Authentication

- [ ] Check for ~/.ssh/id_rsa
- [ ] Validate key against authentication server
- [ ] Fall back to password if key not found

**Deliverable:** Working authentication on startup

---

## Phase 5: Extension Bundling (Week 7)

### Goals

- Bundle required extensions
- Configure extension marketplace
- Create custom neutron imaging extension

### Tasks

#### Day 1: Bundle Jupyter Extension

- [ ] Download ms-toolsai.jupyter VSIX
- [ ] Include in extensions/ directory
- [ ] Configure product.json to load it
- [ ] Test notebook functionality

#### Day 2: Bundle Continue.dev

- [ ] Download continue.continue VSIX
- [ ] Pre-configure for OpenRouter
- [ ] Create default config with example API key
- [ ] Documentation for users

#### Day 3-4: Custom Extension Development

- [ ] Create neutron-imaging extension
- [ ] Snippet library for common neutron analysis
- [ ] Data visualization helpers
- [ ] Notebook templates

```typescript
// neutron-imaging extension structure
extensions/neutron-imaging/
├── package.json
├── src/
│   ├── extension.ts
│   ├── snippets/
│   │   └── neutron-analysis.json
│   ├── templates/
│   │   ├── basic-analysis.ipynb
│   │   └── image-reconstruction.ipynb
│   └── visualization/
│       └── neutronDataViewer.ts
```

#### Day 5: Marketplace Configuration

- [ ] Test that VSCode marketplace works
- [ ] Users can install additional extensions
- [ ] Document recommended extensions

**Deliverable:** All extensions bundled and working

---

## Phase 6: Packaging & Distribution (Week 7-8)

### Goals

- Create installation packages
- Set up auto-update
- Prepare for deployment

### Week 7: Day 4-5 & Week 8

#### Packaging

- [ ] Create DEB package
- [ ] Create RPM package
- [ ] Create AppImage
- [ ] Test installation on clean systems

```bash
# Package script
./scripts/package-linux.sh

# Output:
# dist/orion_1.0.0_amd64.deb
# dist/orion-1.0.0.x86_64.rpm
# dist/NeutronNotebookStudio-1.0.0.AppImage
```

#### Auto-Update

- [ ] Implement update checker
- [ ] Check GitHub releases on startup
- [ ] Download and install updates
- [ ] Test update flow

#### Documentation

- [ ] User manual
- [ ] Installation guide
- [ ] Troubleshooting guide
- [ ] Video tutorials

#### Beta Testing

- [ ] Recruit 5-10 beta testers
- [ ] Collect feedback
- [ ] Fix critical bugs
- [ ] Iterate

**Deliverable:** Production-ready packages

---

## Phase 7: Launch & Support (Week 9+)

### Week 9: Internal Launch

#### Day 1: Deployment

- [ ] Upload packages to GitHub releases
- [ ] Announce to neutron imaging team
- [ ] Provide installation instructions
- [ ] Set up support channel

#### Day 2-5: Support & Monitoring

- [ ] Monitor for issues
- [ ] Quick bug fixes
- [ ] User training sessions
- [ ] Collect usage metrics

### Week 10+: Maintenance Mode

- [ ] Weekly bug triage
- [ ] Monthly feature planning
- [ ] Quarterly upstream merges
- [ ] User satisfaction surveys

---

## Feature Prioritization

### Must Have (MVP)

- ✅ VSCode fork with custom branding
- ✅ Notebook version selector (git integration)
- ✅ Pixi environment manager
- ✅ LDAP authentication
- ✅ Bundled Jupyter extension
- ✅ Installation packages

### Should Have (Post-MVP)

- Custom neutron imaging extension
- Continue.dev bundled with OpenRouter
- Advanced git features (diff view, merge tools)
- Workspace templates
- Better error messages

### Nice to Have (Future)

- Cloud sync
- Collaboration features
- Remote compute integration
- Mobile viewer
- Web version

---

## Risk Mitigation

### Technical Risks

**Risk:** Build breaks due to upstream changes

- **Mitigation:** Pin to stable VSCodium release, test before merging

**Risk:** Jupyter extension compatibility issues

- **Mitigation:** Test extensively, have fallback to JupyterLab extension

**Risk:** LDAP authentication fails in production

- **Mitigation:** Implement SSH key fallback, test with ORNL IT

### Schedule Risks

**Risk:** Development takes longer than 8 weeks

- **Mitigation:** Phase 6-7 can be extended, MVP is Phase 1-5

**Risk:** Key developer unavailable

- **Mitigation:** Document everything, use Claude AI for assistance

### Adoption Risks

**Risk:** Users resist switching from JupyterLab

- **Mitigation:** Run in parallel, provide training, show clear benefits

**Risk:** Missing critical features users need

- **Mitigation:** Beta testing, collect feedback early

---

## Success Criteria

### Week 4 Checkpoint

- [ ] Can select notebook version from UI
- [ ] Git checkout works correctly
- [ ] Basic error handling in place

### Week 6 Checkpoint

- [ ] Pixi environment auto-detection works
- [ ] Can install environment from UI
- [ ] Authentication screen functional

### Week 8 (MVP Complete)

- [ ] All core features working
- [ ] Packages build successfully
- [ ] Beta testers can use for daily work
- [ ] Major bugs fixed

### 3 Months Post-Launch

- [ ] 50%+ of neutron imaging users adopted
- [ ] Support tickets < 2 per week
- [ ] User satisfaction > 4/5
- [ ] Zero data loss incidents

---

## Resource Allocation

### Development Team

- **Lead Developer:** Full-time (8 weeks)
- **UX Consultant:** Part-time (design feedback)
- **Beta Testers:** 5-10 users (week 8-9)

### Infrastructure

- **GitHub:** Repository, Actions, Releases
- **Test VMs:** Linux test environments
- **Documentation:** Wiki or Read the Docs

### Budget

- **Developer time:** $25,000
- **Infrastructure:** $2,000
- **Contingency:** $3,000
- **Total:** $30,000

---

## Communication Plan

### Weekly Updates

- Progress report every Friday
- Blockers and risks identified
- Demo of new features

### Stakeholder Demos

- Week 4: Notebook version selector demo
- Week 6: Authentication + pixi demo
- Week 8: Full MVP demo

### Launch Communication

- Email announcement to neutron imaging users
- Training session (in-person or virtual)
- Documentation and video tutorials
- Support channel (Slack or email)

---

## Post-Launch Roadmap

### Version 1.1 (3 months after launch)

- Custom neutron imaging extension
- Advanced git features
- Improved error messages
- Performance optimizations

### Version 1.2 (6 months after launch)

- Cloud sync for settings
- Remote compute integration
- Collaboration features (experimental)

### Version 2.0 (12 months after launch)

- Web version (browser-based)
- Mobile viewer
- Integration with ORNL data systems
- Advanced analysis tools

---

## Conclusion

This 8-week roadmap provides a clear path to building a production-ready, custom IDE for neutron imaging notebooks. The phased approach allows for:

- Early validation of technical feasibility (Week 1-2)
- Iterative feature development (Week 3-7)
- Proper testing and polish (Week 8)
- Manageable maintenance burden

**Key to Success:**

- Focus on MVP features first
- Test early and often
- Involve users in beta testing
- Document everything
- Use Claude AI to accelerate development

**Next Step:** Begin Phase 0 setup this week!
