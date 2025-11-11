# CI/CD Guide for Orion Studio

## Understanding CI/CD for VSCode Forks

### What's Different from Python/C++ Projects?

**Traditional Python/C++ CI/CD:**
```
Code → Test → Build → Publish to PyPI/npm
```
- Fast builds (5-10 minutes)
- Small artifacts (<100MB)
- Single platform usually
- Cheap to run

**VSCode Fork CI/CD:**
```
Code → Download VSCode Source → Build Native Modules → Compile TypeScript →
Bundle Electron → Package → (Optional) Sign → Publish
```
- Slow builds (30-90 minutes per platform)
- Large artifacts (300-500MB per platform)
- Multiple platforms required
- Expensive (costs money on CI providers)

---

## Our CI/CD Strategy

### Phase 1: Basic CI (Current)

**Goal:** Ensure builds don't break

**What it does:**
- Runs on every PR and push to main
- Linux-only (free GitHub runners)
- Verifies the build succeeds
- No artifact uploads (saves storage)

**Cost:** $0 (within GitHub free tier)

**Workflow file:** `.github/workflows/ci-build.yml`

### Phase 2: Multi-Platform Builds (Future)

**Goal:** Build for all platforms

**What it adds:**
- macOS builds (ARM + Intel)
- Windows builds
- Upload artifacts to GitHub Releases
- Build matrix strategy

**Cost:** ~$5-20/month (macOS runners cost money)

### Phase 3: Continuous Deployment (Future)

**Goal:** Automated releases

**What it adds:**
- Code signing (macOS, Windows)
- Notarization (macOS requirement)
- Auto-update server
- Release automation

**Cost:** ~$50-100/month + code signing certificates

---

## Deep Dive: Our CI Workflow

Let's understand each step in `.github/workflows/ci-build.yml`:

### 1. Trigger Configuration

```yaml
on:
  pull_request:        # Run on all PRs
  push:
    branches:
      - main           # Run on main branch pushes
  workflow_dispatch:   # Allow manual trigger
```

**Why?**
- **pull_request:** Catch issues before merging
- **push to main:** Ensure main branch always builds
- **workflow_dispatch:** Debug CI issues manually

### 2. Concurrency Control

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

**Why?**
- If you push 3 commits quickly, it cancels the first 2 builds
- Saves CI minutes (builds take 30+ minutes!)
- Only the latest commit matters

### 3. Environment Setup

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '22.x'
```

**Why Node 22.x specifically?**
- VSCode requires Node 22.x (see package.json `@types/node: "22.x"`)
- Node 25+ breaks native modules
- Node 20 is too old for latest VSCode

```yaml
- uses: actions/setup-python@v5
  with:
    python-version: '3.11'
```

**Why Python 3.11?**
- node-gyp (builds native modules) needs Python
- Python 3.14+ has breaking changes
- Python 3.10 is too old

### 4. System Dependencies

```yaml
- name: Install build dependencies
  run: |
    sudo apt-get install -y \
      build-essential \      # gcc, g++, make
      libx11-dev \          # X11 libraries
      libxkbfile-dev \      # Keyboard file library
      libsecret-1-dev \     # Secret storage
      libkrb5-dev           # Kerberos (for auth)
```

**Why?**
- VSCode native modules link against these
- Without them: `node-gyp` build fails
- macOS/Windows need different packages

### 5. Caching Strategy

```yaml
- uses: actions/cache@v4
  with:
    path: vscodium/vscode/node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}
```

**Why caching matters:**
- `npm install` takes 15-20 minutes
- Cache hit = 2-3 minutes
- **Saves ~15 minutes per build**

**How it works:**
- First build: Downloads everything, saves to cache
- Second build: Restores from cache
- If `package-lock.json` changes: Cache miss, rebuild

### 6. Build Steps

```yaml
- name: Build VSCode
  run: npm run gulp -- vscode-linux-x64-min
  env:
    NODE_OPTIONS: "--max-old-space-size=8192"
```

**Why `--max-old-space-size=8192`?**
- Default Node.js heap: 2GB
- VSCode build needs 6-8GB
- Without it: Out of memory error

**Why `vscode-linux-x64-min`?**
- `min` = development build (faster)
- Full build = production (slower, optimized)
- CI doesn't need production builds (just verify it compiles)

---

## Cost Analysis

### Current Setup (Phase 1)

**GitHub Free Tier:**
- 2000 minutes/month private repos
- Unlimited minutes public repos
- Linux runners: FREE

**Our usage:**
- 1 build = ~45 minutes
- ~40 builds/month (assuming 2 builds/day)
- **Cost: $0** (public repo)

### Future: Multi-Platform (Phase 2)

**GitHub Pricing:**
- Linux: FREE
- macOS: $0.08/minute
- Windows: $0.008/minute

**Cost estimate:**
- Linux: 45 min × $0 = $0
- macOS ARM: 60 min × $0.08 = $4.80
- macOS Intel: 60 min × $0.08 = $4.80
- Windows: 45 min × $0.008 = $0.36
- **Total per build: ~$10**

**Monthly (40 builds):**
- Only main branch: 20 builds × $10 = $200/month
- **Too expensive!**

**Solution:**
- Build all platforms only on releases (manual trigger)
- PRs: Linux-only validation
- Monthly cost: ~$20-40

---

## Optimization Strategies

### 1. Conditional Platform Builds

```yaml
# Only build macOS on release tags
build-macos:
  if: startsWith(github.ref, 'refs/tags/v')
```

### 2. Build Caching

We cache:
- ✅ `node_modules` (npm packages)
- ✅ Compiled TypeScript (future)
- ❌ VSCode source (changes rarely, but huge)

### 3. Artifact Storage

GitHub artifact storage:
- First 500MB: FREE
- After: $0.008/GB/day

**Our artifacts:**
- Linux build: ~350MB
- Retention: 7 days
- **Cost: ~$0.02/artifact**

**Strategy:**
- Don't upload artifacts on PRs
- Only upload on main branch
- Delete old artifacts

---

## Comparison to Other CI Providers

### GitHub Actions (Current)
✅ Free for public repos
✅ Integrated with GitHub
✅ Good caching
❌ macOS expensive
❌ 6-hour job timeout

### Travis CI
❌ No longer free
✅ Good for open source
❌ Slower

### CircleCI
✅ 30,000 minutes/month free
✅ Good caching
❌ Complex configuration
❌ macOS credits expensive

### Self-Hosted Runners
✅ No per-minute cost
✅ Full control
❌ Maintenance burden
❌ Need macOS hardware for Mac builds

**Recommendation:** Stick with GitHub Actions for now.

---

## Adding Code Quality Checks

Before expensive builds, check code quality:

### Lint Check (Fast)

```yaml
lint:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: npm run eslint
```

**Benefits:**
- Runs in 2-3 minutes
- Catches style issues
- Fails before expensive build

### Type Check (Fast)

```yaml
typecheck:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: npm run compile  # TypeScript check only
```

**Benefits:**
- Runs in 5-10 minutes
- No full build needed
- Catches type errors early

---

## Next Steps

### Immediate (Do now)
1. ✅ Push `.github/workflows/ci-build.yml`
2. ✅ Create a PR to test it
3. ✅ Watch it run on GitHub Actions tab

### Short-term (This week)
1. Add linting workflow
2. Add PR status checks
3. Require CI pass before merge

### Long-term (Later)
1. Add macOS builds (on releases only)
2. Set up code signing
3. Implement auto-updates

---

## Troubleshooting CI

### Build fails with "Cannot find module"

**Cause:** npm install didn't complete
**Fix:** Check if cache is corrupted
```yaml
- name: Clear cache on failure
  if: failure()
  run: rm -rf node_modules
```

### Build times out after 6 hours

**Cause:** Infinite loop or very slow build
**Fix:** Add timeout
```yaml
timeout-minutes: 90
```

### macOS builds fail with code signing error

**Cause:** macOS requires signed binaries
**Fix:** Disable code signing in CI (development builds)
```bash
export CSC_IDENTITY_AUTO_DISCOVERY=false
```

### Out of memory error

**Cause:** Node.js ran out of heap
**Fix:** Increase memory
```yaml
env:
  NODE_OPTIONS: "--max-old-space-size=8192"
```

---

## Learning Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [VSCodium CI](https://github.com/VSCodium/vscodium/tree/master/.github/workflows) - Learn from their setup
- [Electron Builder](https://www.electron.build/) - Packaging tool
- [Action Cache Best Practices](https://github.com/actions/cache/blob/main/tips-and-workarounds.md)

---

## Questions to Consider

**Q: Why not build on every commit?**
**A:** Too expensive. 45-minute builds add up fast.

**Q: Should we upload artifacts?**
**A:** Only on main branch. PR artifacts are wasteful.

**Q: When should we add macOS builds?**
**A:** When you need to test macOS-specific features or for releases.

**Q: Do we need Windows builds?**
**A:** Eventually, yes. But Linux/macOS covers most users initially.

**Q: Should we use self-hosted runners?**
**A:** Only if you have spare hardware. Maintenance is a burden.

---

**Remember:** CI/CD for desktop apps is expensive. Start simple, optimize later.
