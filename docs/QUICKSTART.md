# Quick Start Guide - Orion Studio Development

## Get Started in 5 Minutes

This guide will get you from zero to a working Orion Studio build.

## Prerequisites

### Install Pixi

Pixi manages all dependencies (Python, Node.js) automatically.

**macOS/Linux:**

```bash
curl -fsSL https://pixi.sh/install.sh | bash
```

**Windows:**

```powershell
iwr -useb https://pixi.sh/install.ps1 | iex
```

Restart your terminal after installation.

### Verify Installation

```bash
pixi --version  # Should show v0.39.x or later
```

That's it! No need to manually install Python or Node.js.

## Step 1: Clone the Repository

```bash
git clone https://github.com/ornlneutronimaging/orion.git
cd orion
```

## Step 2: Build Orion Studio

```bash
pixi run build
```

This single command:

1. Installs Python 3.11 and Node.js 22.x (via pixi)
2. Downloads the latest VS Code
3. Compiles the orion-launcher extension
4. Installs all bundled extensions
5. Creates the packaged application

**Build time:** ~5 minutes (first build), ~2 minutes (subsequent builds)

## Step 3: Run Orion Studio

**macOS:**

```bash
open "dist/Orion Studio.app"
```

**Linux:**

```bash
./dist/OrionStudio/OrionStudio
```

You should see VS Code launch with the Orion Launcher wizard.

## First Launch: Express vs Advanced Setup

When Orion Studio launches, you'll see the welcome wizard with two options:

### Express Setup (Recommended for most users)

Click **Start** for a fresh-start experience:

**First time:**
- Clones notebooks to `~/orion_notebooks`
- Creates a session branch: `${USER}-session-YYYYMMDD-HHMMSS`
- Runs `pixi install` to set up the Python environment

**Subsequent launches:**
- Fetches latest changes from the repository
- Resets tracked files to match the latest version
- Creates a new session branch for this session
- **Your renamed/custom files are preserved** (untracked files are not touched)

This workflow ensures you always start with the latest notebooks while preserving any custom work you've saved with different filenames.

### Advanced Setup

Click **Advanced Setup →** for more control:

- Choose a custom location for notebooks
- Select or create a specific git branch
- Configure remote SSH connections to analysis clusters
- Full control over setup options

## Development Workflow

### Making Changes

1. Edit files in `extensions/orion-launcher/src/`
2. Rebuild: `pixi run build`
3. Test: Open the app

### Useful Commands

```bash
# Build the application
pixi run build

# Clean build artifacts
pixi run clean

# Run linters
pixi run lint

# Install pre-commit hooks
pixi run lint-install
```

### Project Structure

```
orion/
├── extensions/orion-launcher/   # Custom extension source
│   ├── src/
│   │   ├── extension.ts         # Entry point
│   │   ├── wizard.ts            # Welcome wizard
│   │   └── git.ts               # Git operations
│   └── package.json
├── scripts/
│   ├── build_orion.py           # Build script
│   └── launch_orion.sh          # App launcher
├── config/
│   ├── settings.json            # Default VS Code settings
│   └── extensions.txt           # Bundled extensions list
└── pixi.toml                    # Project configuration
```

## Customization

### Adding Extensions

Edit `config/extensions.txt`:

```text
ms-vscode-remote.remote-ssh
ms-toolsai.jupyter
ms-python.python
your-publisher.your-extension    # Add new extension
```

Rebuild to include the new extension.

### Excluding Extensions

Use `# !` prefix to exclude problematic extensions:

```text
# Excluded (incompatible):
# !GitHub.copilot-chat
```

### Pinning Extension Versions

Use `@version` syntax:

```text
ms-toolsai.jupyter@2024.1.0
```

### Modifying Default Settings

Edit `config/settings.json`:

```json
{
  "workbench.colorTheme": "Default Dark+",
  "editor.fontSize": 14,
  "python.defaultInterpreterPath": "python"
}
```

## Developing the orion-launcher Extension

### Extension Structure

```
extensions/orion-launcher/
├── src/
│   ├── extension.ts    # VS Code extension entry point
│   ├── wizard.ts       # Webview-based welcome wizard
│   └── git.ts          # Git clone/checkout operations
├── package.json        # Extension manifest
├── tsconfig.json       # TypeScript config
└── out/                # Compiled JavaScript (generated)
```

### Manual Extension Build

For faster iteration during extension development:

```bash
cd extensions/orion-launcher
pixi run npm install
pixi run npm run compile
```

### Debugging the Extension

1. Open VS Code in the repository root
2. Press F5 to launch Extension Development Host
3. Set breakpoints in TypeScript files
4. Test the extension in the new window

### Adding a Command

1. Define command in `package.json`:

```json
{
  "contributes": {
    "commands": [
      {
        "command": "orion-launcher.myCommand",
        "title": "My Command"
      }
    ]
  }
}
```

1. Register handler in `extension.ts`:

```typescript
context.subscriptions.push(
  vscode.commands.registerCommand('orion-launcher.myCommand', () => {
    vscode.window.showInformationMessage('Hello from Orion!');
  })
);
```

1. Rebuild and test

## Code Quality

### Pre-commit Hooks

Install hooks to run linters automatically on commit:

```bash
pixi run lint-install
```

### Manual Linting

```bash
pixi run lint
```

Runs:

- **ruff**: Python linting and formatting
- **prettier**: TypeScript/JavaScript formatting
- **shellcheck**: Shell script analysis
- **markdownlint**: Markdown formatting

### Fixing Issues

Most issues are auto-fixed:

```bash
pixi run lint  # Fixes most issues automatically
```

## Troubleshooting

### Build fails with network error

**Cause:** VS Code download or marketplace API timeout

**Fix:** Retry the build

```bash
pixi run clean
pixi run build
```

### Extension not loading

**Cause:** TypeScript compilation error

**Fix:** Check for errors

```bash
cd extensions/orion-launcher
pixi run npm run compile
```

### macOS "app is damaged" error

**Cause:** Gatekeeper quarantine

**Fix:** Clear quarantine attribute

```bash
xattr -cr "dist/Orion Studio.app"
```

### Linux missing libraries

**Cause:** GUI dependencies not installed

**Fix:** Install required packages

```bash
# Ubuntu/Debian
sudo apt-get install -y libnss3 libatk1.0-0 libgtk-3-0

# RHEL/CentOS
sudo yum install -y nss atk gtk3
```

### Changes not appearing

**Cause:** Old build artifacts

**Fix:** Clean and rebuild

```bash
pixi run clean
pixi run build
```

### Notebook asks to install Jupyter extension

**Cause:** In rare cases, VS Code may prompt to install the Jupyter extension even though it's bundled

**Fix:** Click "Install" when prompted - it will recognize the extension is already present. If the issue persists, restart Orion Studio.

## Testing Checklist

After building, verify:

- [ ] Application launches without errors
- [ ] Orion Launcher wizard appears on launch (not inside orion_notebooks workspace)
- [ ] Express Setup "Start" button works:
  - First run: clones to `~/orion_notebooks` and creates session branch
  - Subsequent runs: refreshes repo and creates new session branch
- [ ] Wizard does NOT appear when already in orion_notebooks workspace
- [ ] Advanced Setup flow allows custom configuration
- [ ] Can open a folder/workspace
- [ ] Jupyter extension works (create `.ipynb` file)
- [ ] Python extension works (syntax highlighting)
- [ ] Remote SSH extension available in sidebar

## Next Steps

1. **Read [ARCHITECTURE.md](ARCHITECTURE.md)** - Understand the project structure
2. **Explore the orion-launcher extension** - See how features are implemented
3. **Check [ROADMAP.md](ROADMAP.md)** - See planned features
4. **Set up pre-commit hooks** - `pixi run lint-install`

## Getting Help

- **GitHub Issues:** [Report bugs or request features](https://github.com/ornlneutronimaging/orion/issues)
- **VS Code Extension API:** [Official documentation](https://code.visualstudio.com/api)
- **Pixi Documentation:** [prefix.dev/docs/pixi](https://prefix.dev/docs/pixi)

## Summary

| Task | Command |
|------|---------|
| Build | `pixi run build` |
| Clean | `pixi run clean` |
| Lint | `pixi run lint` |
| Run (macOS) | `open "dist/Orion Studio.app"` |
| Run (Linux) | `./dist/OrionStudio/OrionStudio` |
