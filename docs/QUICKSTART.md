# Quick Start Guide - Orion Studio Development

## Get Started Today

This guide will get you from zero to a working VSCode fork build in ~2 hours.

---

## Prerequisites Check

```bash
# Check Node.js (need 18.x or higher)
node --version  # Should be v18.x.x or higher

# Check Python
python3 --version  # Should be 3.8+

# Check build tools
gcc --version
make --version
git --version
```

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

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Yarn
sudo npm install -g yarn
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

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install Yarn
sudo npm install -g yarn
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

# This will download the VSCode source
./get_repo.sh
```

**What's happening:**
- VSCodium is a build script wrapper around VSCode source
- `get_repo.sh` clones the actual Microsoft VSCode repository
- You'll see a new `vscode/` directory appear

**Troubleshooting:**
- If `get_repo.sh` fails, check internet connection
- If git clone is slow, try: `git clone --depth 1 https://github.com/VSCodium/vscodium.git`

---

## Step 2: First Build (30-60 minutes)

```bash
cd vscode

# Install dependencies (this takes 15-30 minutes)
yarn install

# Build (this takes 20-40 minutes)
yarn gulp vscode-linux-x64-min

# The 'min' suffix means faster build for development
# Production builds use 'vscode-linux-x64' (slower but optimized)
```

**Grab coffee ☕** - This will take a while on first build.

**What's building:**
- TypeScript → JavaScript compilation
- Electron bundling
- Node native modules
- Monaco editor
- All built-in extensions

**Troubleshooting:**
- Out of memory? Close other apps or add swap space
- Build fails with node-gyp error? Install python2 (some modules need it)
- Errors about missing packages? Re-run `yarn install`

---

## Step 3: Test Run (5 minutes)

```bash
# From vscode/ directory
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
- [ ] Terminal panel works (Ctrl+`)

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
rm -rf ../VSCode-linux-x64

# Rebuild (faster this time, ~10 minutes)
yarn gulp vscode-linux-x64-min

# Test
./scripts/code.sh
```

**You should see:**
- Window title: "Neutron Studio"
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
yarn watch  # This runs in background, auto-rebuilds on changes
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
yarn gulp vscode-linux-x64-min
./scripts/code.sh

# In the app:
# Press Ctrl+Shift+P (Command Palette)
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
yarn watch

# Terminal 2: Test
./scripts/code.sh

# Make changes → Save → Reload window (Ctrl+R in app)
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
yarn compile

# Or specific file
yarn tsc --noEmit src/vs/neutron/browser/commands/helloCommand.ts
```

### Clean Build
```bash
# If things get weird, clean and rebuild
git clean -xfd  # WARNING: Deletes all untracked files
yarn install
yarn gulp vscode-linux-x64-min
```

---

## Common Issues & Solutions

### "Cannot find module"
**Problem:** Import path wrong or module not compiled
**Solution:**
```bash
yarn compile
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
yarn gulp compile-build

# Or force clean rebuild
rm -rf out
yarn gulp vscode-linux-x64-min
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
# Development build (fast)
yarn gulp vscode-linux-x64-min

# Production build (optimized, slow)
yarn gulp vscode-linux-x64

# Watch mode (auto-rebuild)
yarn watch

# Compile TypeScript only
yarn compile

# Run tests
yarn test

# Package as AppImage
./scripts/package-appimage.sh

# Clean everything
git clean -xfd && yarn install
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
