# Development Workflow for Orion Studio

## Architecture: Two Repository Approach

Orion Studio is built by customizing VSCodium. We maintain **two separate repositories**:

### 1. VSCodium Fork Repository
**Repository:** `ornlneutronimaging/vscodium` (your fork on GitHub)
**Purpose:** Track all VSCode source code modifications
**Location:** Cloned locally to `/path/to/vscodium/`

### 2. Orion Project Repository
**Repository:** `ornlneutronimaging/orion` (this repo)
**Purpose:** Documentation, scripts, CI/CD, custom extensions
**Location:** `/home/user/orion/`

---

## Initial Setup Workflow

### Step 1: Fork VSCodium on GitHub

```bash
# On GitHub.com:
# 1. Go to: https://github.com/VSCodium/vscodium
# 2. Click "Fork" button
# 3. Create fork in ornlneutronimaging organization
# Result: https://github.com/ornlneutronimaging/vscodium
```

### Step 2: Clone YOUR Fork Locally

```bash
# Clone YOUR fork (not the upstream VSCodium)
cd /home/user/
git clone https://github.com/ornlneutronimaging/vscodium.git
cd vscodium

# Add upstream for syncing later
git remote add upstream https://github.com/VSCodium/vscodium.git

# Create your development branch
git checkout -b ornl/orion-studio-main
```

### Step 3: Keep Orion Repo Separate

```bash
# The orion repo stays separate
cd /home/user/orion/

# It references your vscodium fork via scripts
# But does NOT contain the vscodium source code
```

---

## Daily Development Workflow

### Making Changes to VSCode

```bash
# 1. Work in the vscodium directory
cd /home/user/vscodium/

# 2. Make your changes (branding, custom features, etc.)
# Example: Edit product.json for branding
nano vscode/product.json

# 3. Commit changes to YOUR fork
git add vscode/product.json
git commit -m "Add Orion branding to product.json"

# 4. Push to YOUR GitHub fork
git push origin ornl/orion-studio-main

# Your changes are now tracked in:
# https://github.com/ornlneutronimaging/vscodium
```

### Building

```bash
# From the vscodium directory
cd /home/user/vscodium/

# Download VSCode source (first time only)
VSCODE_QUALITY=stable ./get_repo.sh

# Build
npm install
npm run gulp -- vscode-linux-x64-min

# Run
./VSCode-linux-x64/bin/code-oss
```

### Using Pixi Scripts (Alternative)

```bash
# From the orion repo, you can use pixi tasks
cd /home/user/orion/

# Update pixi.toml to reference YOUR vscodium fork
# Then run:
pixi run get-vscode    # Clones YOUR fork
pixi run build-vscode  # Builds from your fork
pixi run run-vscode    # Runs the built version
```

---

## File Structure

```
/home/user/
├── vscodium/              # Your VSCodium fork (separate git repo)
│   ├── .git/              # Tracks YOUR changes
│   ├── vscode/            # VSCode source (downloaded by get_repo.sh)
│   ├── build/             # Build scripts
│   ├── patches/           # VSCodium patches
│   └── product.json       # Your branding changes
│
└── orion/                 # Orion project repo (this repo)
    ├── .git/              # Tracks docs/scripts/CI
    ├── docs/              # Documentation
    ├── scripts/           # Build automation
    ├── .github/           # CI/CD workflows
    ├── extensions/        # Custom extensions (separate from VSCode)
    └── pixi.toml          # Dev environment config
```

---

## What Goes in Each Repository?

### vscodium/ (Your Fork) - DOES Track:
- ✅ All VSCode source code modifications
- ✅ Branding changes (product.json, icons, etc.)
- ✅ Custom code in `src/vs/orion/`
- ✅ Build configuration changes
- ✅ Patches applied to VSCode

### vscodium/ - Does NOT Track:
- ❌ `vscode/` directory (downloaded by get_repo.sh, in .gitignore)
- ❌ `node_modules/` (installed by npm)
- ❌ Build outputs (`VSCode-linux-x64/`)

### orion/ (This Repo) - DOES Track:
- ✅ Documentation (ROADMAP, ARCHITECTURE, etc.)
- ✅ Build scripts
- ✅ CI/CD workflows (.github/)
- ✅ Custom standalone extensions
- ✅ Deployment configurations
- ✅ Pixi environment config

### orion/ - Does NOT Track:
- ❌ VSCode source code (that's in your vscodium fork)
- ❌ Build outputs
- ❌ Downloaded dependencies

---

## Syncing with Upstream VSCodium

Periodically, you'll want to merge updates from upstream VSCodium:

```bash
cd /home/user/vscodium/

# Fetch latest from upstream VSCodium
git fetch upstream

# Merge into your branch
git checkout ornl/orion-studio-main
git merge upstream/master

# Resolve any conflicts with your custom changes
# Test the build
npm run gulp -- vscode-linux-x64-min

# Push updated version to your fork
git push origin ornl/orion-studio-main
```

---

## CI/CD Integration

### Option 1: Build from Your Fork (Recommended)

Update `.github/workflows/ci-build.yml` in the orion repo:

```yaml
- name: Clone vscodium fork
  run: |
    git clone https://github.com/ornlneutronimaging/vscodium.git
    cd vscodium
    git checkout ornl/orion-studio-main

- name: Build VSCode
  run: |
    cd vscodium
    VSCODE_QUALITY=stable ./get_repo.sh
    npm install
    npm run gulp -- vscode-linux-x64-min
```

### Option 2: Git Submodule (Alternative)

If you want orion repo to reference a specific vscodium commit:

```bash
cd /home/user/orion/

# Add vscodium as submodule pointing to YOUR fork
git submodule add -b ornl/orion-studio-main \
  https://github.com/ornlneutronimaging/vscodium.git vscodium

# Commit the submodule reference
git add .gitmodules vscodium
git commit -m "Add vscodium fork as submodule"
```

**However**, this is more complex and not recommended unless you need tight version coupling.

---

## Summary: Key Points

1. **Fork VSCodium** on GitHub to your organization
2. **Clone YOUR fork** locally (not upstream VSCodium)
3. **Make all code changes** in your vscodium fork directory
4. **Commit and push** changes to YOUR fork repository
5. **Keep orion repo separate** for docs/scripts/CI
6. **Reference your fork** in build scripts and CI

This way:
- ✅ All your VSCode modifications are tracked (in vscodium fork)
- ✅ Documentation and automation are tracked (in orion repo)
- ✅ You can sync with upstream VSCodium periodically
- ✅ CI/CD can build from your fork
- ✅ Clean separation of concerns

---

## Quick Reference Commands

```bash
# Make changes to VSCode
cd /home/user/vscodium/
# ... edit files ...
git add .
git commit -m "Description of changes"
git push origin ornl/orion-studio-main

# Update documentation/scripts
cd /home/user/orion/
# ... edit docs/scripts ...
git add .
git commit -m "Update documentation"
git push origin main

# Build
cd /home/user/vscodium/
npm run gulp -- vscode-linux-x64-min
```
