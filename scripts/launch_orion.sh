#!/bin/bash

# Resolve the directory where this script is running
# When packaged, this script is Orion Studio.app/Contents/MacOS/OrionStudio
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Detect OS
OS="$(uname)"

# The embedded VS Code is at ../Resources/Visual Studio Code.app
if [ "$OS" == "Darwin" ]; then
    # Bypass the 'bin/code' script because it fails in nested bundles.
    # Use Electron directly.
    APP_PATH="$SCRIPT_DIR/../Resources/Visual Studio Code.app/Contents/MacOS/Electron"
else
    # Linux: Launcher is at root of dist/OrionStudio/
    # VS Code binary is at bin/code relative to root
    APP_PATH="$SCRIPT_DIR/bin/code"
fi

# Fallback for development (if running script directly from repo)
if [ ! -f "$APP_PATH" ]; then
    if [ "$OS" == "Darwin" ]; then
        APP_PATH="$(dirname "$0")/../dist/Orion Studio.app/Contents/Resources/Visual Studio Code.app/Contents/MacOS/Electron"
    else
        APP_PATH="$(dirname "$0")/../dist/OrionStudio/bin/code"
    fi
fi

# --- Define Portable Directories ---

if [ "$OS" == "Darwin" ]; then
    # macOS: Use portable data in app bundle (single-user installs to /Applications)
    DATA_DIR="$SCRIPT_DIR/../Resources/code-portable-data"
    EXT_DIR="$DATA_DIR/extensions"
else
    # Linux: Use per-user portable data for multi-user shared deployments
    USER_PORTABLE_DIR="$HOME/.orion-studio"
    TEMPLATE_DIR="$SCRIPT_DIR/data-template"

    # Check if first run (user portable directory doesn't exist)
    if [ ! -d "$USER_PORTABLE_DIR/user-data" ]; then
        echo "First run: Setting up Orion Studio for $USER..."
        mkdir -p "$USER_PORTABLE_DIR"

        # Copy template if it exists (shared installation)
        if [ -d "$TEMPLATE_DIR" ]; then
            echo "Copying bundled settings and extensions..."
            cp -r "$TEMPLATE_DIR"/* "$USER_PORTABLE_DIR/"
        else
            # Fallback: create minimal structure
            echo "No template found, creating minimal structure..."
            mkdir -p "$USER_PORTABLE_DIR/user-data/User"
            mkdir -p "$USER_PORTABLE_DIR/extensions"
        fi
        echo "Setup complete."
    fi

    # Set portable mode to user directory
    export VSCODE_PORTABLE="$USER_PORTABLE_DIR"
    DATA_DIR="$USER_PORTABLE_DIR"
    EXT_DIR="$USER_PORTABLE_DIR/extensions"
fi

# --- Main Logic ---

# Check if App exists
if [ ! -f "$APP_PATH" ]; then
    echo "Error: Orion Studio not found at $APP_PATH"
    echo "Please run the build script."
    exit 1
fi

echo "Launching Orion Studio..."
if [ "$OS" == "Darwin" ]; then
    # macOS: Launch Electron directly with explicit data directories
    "$APP_PATH" --user-data-dir "$DATA_DIR" --extensions-dir "$EXT_DIR" "$@"
else
    # Linux: VSCODE_PORTABLE env var handles portable mode
    # Still pass explicit dirs for compatibility
    "$APP_PATH" --user-data-dir "$DATA_DIR" --extensions-dir "$EXT_DIR" "$@"
fi
