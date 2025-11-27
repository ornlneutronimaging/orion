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

# Define Portable Directories
if [ "$OS" == "Darwin" ]; then
    DATA_DIR="$SCRIPT_DIR/../Resources/code-portable-data"
else
    DATA_DIR="$SCRIPT_DIR/../code-portable-data"
fi
EXT_DIR="$DATA_DIR/extensions"

# --- Main Logic ---

# Check if App exists
if [ ! -f "$APP_PATH" ]; then
    echo "Error: Orion Studio not found at $APP_PATH"
    echo "Please run the build script."
    exit 1
fi

echo "Launching Orion Studio..."
if [ "$OS" == "Darwin" ]; then
    # Launch Electron directly as the main app
    "$APP_PATH" --user-data-dir "$DATA_DIR" --extensions-dir "$EXT_DIR" "$@"
else
    "$APP_PATH" --user-data-dir "$DATA_DIR" --extensions-dir "$EXT_DIR" "$@"
fi
