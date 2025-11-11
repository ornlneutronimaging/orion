# Quick Start Guide - Orion Studio Development

## Get Started Today

This guide will get you from zero to a working VSCode fork build in ~2 hours.

---

## Prerequisites Check

```bash
# Check Node.js (need 22.x - VSCode requirement)
node --version  # Should be v22.x.x

# Check Python (need 3.11 - node-gyp requirement)
python3 --version  # Should be 3.11.x (not 3.14+)

# Check build tools
gcc --version  # or clang on macOS
make --version
git --version
```

**Note:** As of 2024, VSCode **no longer supports yarn** - use **npm** instead (comes with Node.js).

### Install Missing Dependencies

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y \
  build-essential \
  g++ \
  libx11-dev \
  libxkbfile-dev \
  libsecret-1-dev \
  python3 \
  git \
  curl

# Install Node.js 22 (VSCode requirement)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# npm comes with Node.js - no need to install yarn
```

**RHEL/CentOS:**
```bash
sudo yum groupinstall -y "Development Tools"
sudo yum install -y \
  libX11-devel \
  libxkbfile-devel \
  libsecret-devel \
  python3 \
  git

# Install Node.js 22 (VSCode requirement)
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo yum install -y nodejs

# npm comes with Node.js - no need to install yarn
```

---

## Step 1: Clone VSCodium (15 minutes)

```bash
# Choose a workspace (needs ~10GB space)
cd ~/projects
mkdir orion
cd orion

# Clone VSCodium
git clone https://github.com/VSCodium/vscodium.git
cd vscodium

# Download the VSCode source (IMPORTANT: Must set VSCODE_QUALITY)
VSCODE_QUALITY=stable ./get_repo.sh

# Or using pixi (from orion root):
pixi run get-vscode
```

**What's happening:**
- VSCodium is a build script wrapper around VSCode source
- `VSCODE_QUALITY=stable` tells get_repo.sh which VSCode version to download
- `get_repo.sh` clones the actual Microsoft VSCode repository
- You'll see a new `vscode/` directory appear

**Troubleshooting:**
- If `get_repo.sh` fails without VSCODE_QUALITY, you'll see "Retrieve latest version" but no vscode/ directory
- If git clone is slow, try: `git clone --depth 1 https://github.com/VSCodium/vscodium.git`

---

## Step 2: First Build (30-60 minutes)

```bash
cd vscode

# Install dependencies (this takes 15-30 minutes)
npm install

# Build (this takes 20-40 minutes)
# For macOS ARM (M1/M2/M3):
npm run gulp -- vscode-darwin-arm64

# For macOS Intel:
npm run gulp -- vscode-darwin-x64

# For Linux:
npm run gulp -- vscode-linux-x64-min

# Or using pixi (from orion root) - handles everything:
pixi run build-vscode
```

**IMPORTANT:** VSCode switched from **yarn to npm** in recent versions. The preinstall script explicitly blocks yarn usage.

**Grab coffee ☕** - This will take a while on first build.

**What's building:**
- TypeScript → JavaScript compilation
- Electron bundling
- Node native modules (requires Node 22.x, Python 3.11)
- Monaco editor
- All built-in extensions

**Troubleshooting:**
- "Seems like you are using yarn" error? Use `npm install` instead
- Out of memory? Close other apps or add swap space
- Build fails with node-gyp error? Ensure Node 22.x and Python 3.11 (not 3.14+)
- Errors about missing packages? Re-run `npm install`

---

## Step 3: Test Run (5 minutes)

```bash
# From vscode/ directory

# macOS:
open ../VSCode-darwin-arm64/Code\ -\ OSS.app
# Or using pixi (from orion root):
pixi run run-vscode

# Linux:
./scripts/code.sh
# Or directly:
../VSCode-linux-x64/bin/code-oss
```

**Success looks like:**
- Application window opens
- Title bar says "Code - OSS"
- You can create/open files
- Extensions panel works

**Test checklist:**
- [ ] Application launches
- [ ] Can open a folder
- [ ] Can create a new file
- [ ] File → Preferences works
- [ ] Terminal panel works (Ctrl+` or Cmd+`)

---

## Step 4: Basic Branding (15 minutes)

Let's change the name from "Code - OSS" to "Neutron Studio"

```bash
cd vscode

# Edit product.json
nano product.json
```

**Find and change these fields:**

```json
{
  "nameShort": "Neutron Studio",
  "nameLong": "Orion Studio",
  "applicationName": "orion",
  "dataFolderName": ".orion",
  "productDescription": "IDE for Neutron Imaging Notebooks"
}
```

**Rebuild:**
```bash
# Clean old build
rm -rf ../VSCode-darwin-arm64  # or ../VSCode-linux-x64 on Linux

# Rebuild (faster this time, ~10 minutes)
npm run gulp -- vscode-darwin-arm64  # or vscode-linux-x64-min on Linux

# Or using pixi:
pixi run rebuild-vscode

# Test
open ../VSCode-darwin-arm64/Code\ -\ OSS.app  # or ./scripts/code.sh on Linux
```

**You should see:**
- Window title: "Orion Studio"
- About dialog shows "Orion Studio"

---

## Step 5: Create Development Branch (5 minutes)

```bash
cd vscode
git checkout -b ornl/orion-dev

# Commit your changes
git add product.json
git commit -m "Initial branding: Orion Studio"

# Create remote repository (on GitHub)
# Then push:
git remote add ornl git@github.com:ORNL/orion.git
git push -u ornl ornl/orion-dev
```

---

## Step 6: Development Workflow

### Make Changes

```bash
cd vscode/src/vs/

# Example: Add a console log to test
echo "console.log('Hello from Orion Studio!');" >> code/electron-main/main.ts

# Rebuild just the changed files (incremental build)
npm run watch  # This runs in background, auto-rebuilds on changes
```

### Test Changes

```bash
# In another terminal
cd vscode
./scripts/code.sh
```

Check the console output - you should see your log message!

### Debug with Chrome DevTools

```bash
# Launch with debugging enabled
./scripts/code.sh --inspect-brk=5874

# Open Chrome at: chrome://inspect
# Click "Open dedicated DevTools for Node"
```

---

## Step 7: Add Your First Custom Feature (20 minutes)

Let's add a simple "Hello Orion" command.

### Create Custom Directory Structure

```bash
cd vscode/src/vs
mkdir -p neutron/browser/commands
```

### Create Hello Command

```bash
nano neutron/browser/commands/helloCommand.ts
```

```typescript
import { localize } from 'vs/nls';
import { Action } from 'vs/base/common/actions';
import { INotificationService } from 'vs/platform/notification/common/notification';

export class HelloOrionAction extends Action {
  static readonly ID = 'neutron.helloWorld';
  static readonly LABEL = localize('orionHello', "Hello Orion");

  constructor(
    id: string,
    label: string,
    @INotificationService private readonly notificationService: INotificationService
  ) {
    super(id, label);
  }

  async run(): Promise<void> {
    this.notificationService.info('Hello from Orion Studio! 🎉');
  }
}
```

### Register Command

```bash
nano neutron/browser/neutron.contribution.ts
```

```typescript
import { Registry } from 'vs/platform/registry/common/platform';
import { IWorkbenchActionRegistry, Extensions as ActionExtensions } from 'vs/workbench/common/actions';
import { SyncActionDescriptor } from 'vs/platform/actions/common/actions';
import { HelloOrionAction } from './commands/helloCommand';

const registry = Registry.as<IWorkbenchActionRegistry>(ActionExtensions.WorkbenchActions);

registry.registerWorkbenchAction(
  SyncActionDescriptor.from(HelloOrionAction),
  'Neutron: Hello World'
);
```

### Wire It Up

```bash
# Edit workbench.desktop.main.ts to import our contribution
nano ../workbench/workbench.desktop.main.ts
```

Add at the end of imports:
```typescript
import 'vs/neutron/browser/neutron.contribution';
```

### Build and Test

```bash
cd vscode
npm run gulp -- vscode-darwin-arm64  # or vscode-linux-x64-min on Linux
# Then open the app as shown in Step 3

# In the app:
# Press Cmd+Shift+P (macOS) or Ctrl+Shift+P (Linux/Windows) - Command Palette
# Type "Hello Orion"
# Press Enter
```

**You should see:** Notification saying "Hello from Orion Studio! 🎉"

**Congratulations! 🎉** You just added a custom feature to VSCode!

---

## Step 8: Bundle Jupyter Extension (15 minutes)

```bash
cd vscodium
mkdir -p extensions

# Download Jupyter extension
cd extensions
wget "https://marketplace.visualstudio.com/_apis/public/gallery/publishers/ms-toolsai/vsextensions/jupyter/latest/vspackage" -O jupyter.vsix

# Extract
unzip jupyter.vsix -d ms-toolsai.jupyter

# Build with extension included
cd ../vscode
yarn gulp vscode-linux-x64-min
```

### Test Jupyter

```bash
./scripts/code.sh

# Create test.ipynb
# Open it - Jupyter interface should load
# Select Python kernel
# Create cell with: print("Hello from Orion!")
# Run cell
```

---

## Development Tips

### Fast Iteration
```bash
# Terminal 1: Watch mode (auto-rebuild on changes)
npm run watch

# Terminal 2: Test (macOS)
open ../VSCode-darwin-arm64/Code\ -\ OSS.app
# Or Linux:
./scripts/code.sh

# Make changes → Save → Reload window (Cmd+R on macOS, Ctrl+R on Linux)
```

### Debug Logging
```typescript
// Add anywhere in your code
console.log('DEBUG:', variableName);

// View in:
# Help → Toggle Developer Tools → Console
```

### TypeScript Compilation Errors
```bash
# Check for errors
npm run compile

# Or specific file
npx tsc --noEmit src/vs/neutron/browser/commands/helloCommand.ts
```

### Clean Build
```bash
# If things get weird, clean and rebuild
git clean -xfd  # WARNING: Deletes all untracked files
npm install
npm run gulp -- vscode-darwin-arm64  # or vscode-linux-x64-min on Linux

# Or using pixi:
pixi run clean-vscode
pixi run build-vscode
```

---

## Common Issues & Solutions

### "Cannot find module"
**Problem:** Import path wrong or module not compiled
**Solution:**
```bash
npm run compile
# Check import path matches file location
```

### "Port already in use"
**Problem:** Old instance still running
**Solution:**
```bash
killall code-oss
./scripts/code.sh
```

### Build fails with memory error
**Problem:** Not enough RAM (need 8GB+)
**Solution:**
```bash
# Add swap space
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Or: Close other apps and try again
```

### Changes not appearing
**Problem:** Cached build
**Solution:**
```bash
# Rebuild the specific module
npm run gulp -- compile-build

# Or force clean rebuild
rm -rf out
npm run gulp -- vscode-darwin-arm64  # or vscode-linux-x64-min on Linux
```

---

## Next Steps

Now that you have a working development environment:

1. **Read ARCHITECTURE.md** - Understand the project structure
2. **Read ROADMAP.md** - See the 8-week development plan
3. **Set up Git workflow** - Create feature branches
4. **Join development channel** - Coordinate with team
5. **Start Phase 1** - Implement GitService and PixiService

---

## Useful Commands Reference

```bash
# Using pixi (recommended - from orion root):
pixi run get-vscode         # Download VSCode source
pixi run build-vscode       # Full build (npm install + gulp)
pixi run rebuild-vscode     # Rebuild without npm install
pixi run clean-vscode       # Clean build artifacts
pixi run run-vscode         # Launch the app

# Manual commands (from vscode/ directory):
# Development build (fast)
npm run gulp -- vscode-darwin-arm64        # macOS ARM
npm run gulp -- vscode-darwin-x64          # macOS Intel
npm run gulp -- vscode-linux-x64-min       # Linux

# Production build (optimized, slow)
npm run gulp -- vscode-darwin-arm64        # Same target, just takes longer first time
npm run gulp -- vscode-linux-x64           # Linux production

# Watch mode (auto-rebuild)
npm run watch

# Compile TypeScript only
npm run compile

# Run tests
npm test

# Clean everything
git clean -xfd && npm install
```

---

## Resources

- **VSCodium Docs:** https://github.com/VSCodium/vscodium/blob/master/docs/index.md
- **VSCode Source:** https://github.com/microsoft/vscode
- **VSCode Extension API:** https://code.visualstudio.com/api
- **VSCode Dev Docs:** https://github.com/microsoft/vscode/wiki
- **Electron Docs:** https://www.electronjs.org/docs

---

## Getting Help

### Documentation
- Check ARCHITECTURE.md for design decisions
- Check ROADMAP.md for implementation plan
- Check VSCode wiki: https://github.com/microsoft/vscode/wiki

### AI Assistant
- Use Claude AI for code questions
- Paste error messages for debugging help
- Ask for code examples

### Community
- VSCodium Gitter: https://gitter.im/VSCodium/Lobby
- VSCode GitHub Discussions
- Stack Overflow (tag: vscode)

---

## Success Checklist

After following this guide, you should have:

- [x] VSCode building successfully
- [x] Custom branding (Neutron Studio)
- [x] Development workflow set up
- [x] First custom command working
- [x] Jupyter extension bundled
- [x] Understanding of code structure

**Ready to build features!** 🚀

---

## Time Investment Summary

| Task | Time | Cumulative |
|------|------|------------|
| Install dependencies | 15 min | 15 min |
| Clone & setup | 15 min | 30 min |
| First build | 45 min | 1h 15min |
| Test run | 5 min | 1h 20min |
| Basic branding | 15 min | 1h 35min |
| Git setup | 5 min | 1h 40min |
| First custom feature | 20 min | 2h |
| Bundle Jupyter | 15 min | **2h 15min** |

**Total: ~2 hours** to go from nothing to custom features!

---

**Questions?** Start with the architecture document, then dive into the roadmap. You've got this! 💪
