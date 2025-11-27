# Scripts

This directory contains build, development, and deployment scripts for Orion Studio.

## Structure

- **build/**: Build automation scripts
- **dev/**: Development environment setup and utilities
- **deploy/**: Deployment and release scripts
- **test/**: Testing utilities and helpers

## Scripts Overview (Coming Soon)

### Build Scripts

- `build.sh` / `build.ps1`: Main build script for all platforms
- `package.sh` / `package.ps1`: Create distribution packages
- `sign.sh` / `sign.ps1`: Code signing for releases

### Development Scripts

- `setup-dev.sh` / `setup-dev.ps1`: Set up development environment
- `watch.sh` / `watch.ps1`: Watch mode for development
- `lint.sh` / `lint.ps1`: Run linters and formatters
- `test.sh` / `test.ps1`: Run test suites

### Deployment Scripts

- `release.sh` / `release.ps1`: Create a new release
- `publish.sh` / `publish.ps1`: Publish to distribution channels
- `update-version.sh` / `update-version.ps1`: Version bumping

## Usage

Scripts are designed to be run from the repository root:

```bash
# Build the application
./scripts/build.sh

# Set up development environment
./scripts/setup-dev.sh

# Create a release
./scripts/release.sh
```

For Windows, use PowerShell equivalents:

```powershell
# Build the application
.\scripts\build.ps1

# Set up development environment
.\scripts\setup-dev.ps1
```

## Requirements

- Node.js 18+
- npm or yarn
- Platform-specific build tools (see main README)

## Contributing

When adding new scripts:

1. Follow existing naming conventions
2. Add documentation in this README
3. Make scripts cross-platform when possible
4. Add error handling and user feedback
