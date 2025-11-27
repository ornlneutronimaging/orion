# CI/CD Guide for Orion Studio

## Overview

Orion Studio uses GitHub Actions for continuous integration. Unlike traditional VS Code forks that require 30-60 minute builds, Orion's wrapper approach enables fast builds (~5 minutes).

## Architecture Decision: Pixi in CI

**Decision:** Use Pixi for reproducible environments in CI.

**Rationale:**

- **Consistency:** Same environment locally and in CI
- **Speed:** Pixi caches dependencies efficiently
- **Simplicity:** Single command setup
- **Reliability:** No version drift between local and CI

## Current CI Workflow

**Workflow file:** `.github/workflows/ci-build.yml`

### Trigger Configuration

```yaml
on:
  pull_request:        # Run on all PRs
  push:
    branches:
      - main           # Run on main branch pushes
  workflow_dispatch:   # Allow manual trigger
```

### Concurrency Control

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

If you push multiple commits quickly, only the latest build runs. This saves CI minutes.

### Build Matrix

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, macos-latest]
```

Builds run on both Linux and macOS in parallel.

### Build Steps

```yaml
steps:
  - name: Checkout repository
    uses: actions/checkout@v4

  - name: Install Pixi
    uses: prefix-dev/setup-pixi@v0.8.1
    with:
      pixi-version: v0.39.2

  - name: Install Linux Dependencies
    if: runner.os == 'Linux'
    run: |
      sudo apt-get update
      sudo apt-get install -y libnss3 libatk1.0-0 ...

  - name: Run Build Script
    run: pixi run build

  - name: Verify Build Output
    run: |
      if [ -d "dist/Orion Studio.app" ]; then
        echo "Build successful"
      fi
```

### Artifacts

Build outputs are uploaded as artifacts with 5-day retention:

```yaml
- name: Upload Artifact
  uses: actions/upload-artifact@v4
  with:
    name: OrionStudio-${{ matrix.os }}
    path: dist/OrionStudio-${{ matrix.os }}.tar.gz
    retention-days: 5
```

## Build Process

### What Happens

1. **Pixi Setup:** Installs Python 3.11 and Node.js 22.x
2. **Build Script:** Runs `python scripts/build_orion.py`
3. **Download VS Code:** Fetches latest stable from Microsoft
4. **Extension Install:** Downloads VSIXs from marketplace
5. **Package:** Creates wrapper app bundle
6. **Compress:** Creates tar.gz for artifact upload

### Build Duration

| Platform | Time |
|----------|------|
| Linux | ~3-5 min |
| macOS | ~5-7 min |

Much faster than traditional VS Code fork builds (30-60 min).

## Cost Analysis

### GitHub Free Tier

- Public repos: Unlimited minutes
- Private repos: 2000 minutes/month

### Our Usage

Assuming 2 builds/day, 20 builds/month:

- Linux: 5 min × 20 = 100 min (FREE)
- macOS: 7 min × 20 = 140 min (FREE for public repos)

**Total cost: $0** for public repository

## Linux Dependencies

Ubuntu runners need GUI libraries for VS Code:

```bash
sudo apt-get install -y \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libgdk-pixbuf2.0-0 \
  libgtk-3-0t64 \
  libgbm1 \
  libasound2t64
```

Note: Ubuntu 24.04 uses `t64` packages for time_t transition.

## Troubleshooting

### Build fails with network error

**Cause:** VS Code download or marketplace API timeout
**Fix:** Re-run the workflow (GitHub Actions button)

### Extension install fails

**Cause:** Marketplace API rate limiting
**Fix:** Wait and retry, or pin specific extension version in `extensions.txt`

### macOS quarantine issues

**Cause:** Downloaded apps are quarantined by Gatekeeper
**Fix:** Build script runs `xattr -cr` automatically

### Linux missing libraries

**Cause:** Ubuntu base image missing GUI dependencies
**Fix:** Ensure apt-get install step includes all required packages

## Adding Quality Checks

### Pre-commit Hooks

Runs automatically via pixi:

```yaml
- name: Run Linters
  run: pixi run lint
```

Checks:

- Python: ruff (linting + formatting)
- TypeScript/JavaScript: prettier
- Shell: shellcheck
- Markdown: markdownlint

### Type Checking (Future)

```yaml
- name: TypeScript Check
  run: |
    cd extensions/orion-launcher
    pixi run npm run compile
```

## Release Workflow (Future)

When ready for releases:

```yaml
on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    steps:
      - run: pixi run build
      - uses: softprops/action-gh-release@v1
        with:
          files: dist/*.tar.gz
```

## Dependabot

Auto-updates configured in `.github/dependabot.yml`:

- **github-actions:** Weekly updates for CI actions
- **npm:** Weekly updates for orion-launcher dependencies
- **pip:** Monthly updates (though we use pixi)

## Local Development

To match CI environment locally:

```bash
# Install pixi (if not already)
curl -fsSL https://pixi.sh/install.sh | bash

# Run build (same as CI)
pixi run build

# Run linters (same as CI)
pixi run lint
```

## Comparison to VSCodium CI

| Aspect | Orion Studio | VSCodium |
|--------|--------------|----------|
| Build time | 5 min | 45-60 min |
| Build complexity | Low | High |
| Environment | Pixi | System tools |
| Artifacts | ~400 MB | ~500 MB |
| Platforms | Linux, macOS | Linux, macOS, Windows |

## Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Pixi CI Guide](https://prefix.dev/docs/pixi/features/ci)
- [setup-pixi Action](https://github.com/prefix-dev/setup-pixi)
