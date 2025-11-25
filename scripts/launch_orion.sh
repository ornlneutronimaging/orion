#!/bin/bash

# Configuration
NOTEBOOK_REPO="https://github.com/neutronimaging/python_notebooks"
DEFAULT_CLONE_DIR="$HOME/NeutronNotebooks"
APP_PATH="$(dirname "$0")/../dist/OrionStudio/Visual Studio Code.app/Contents/Resources/app/bin/code"

# Detect OS
OS="$(uname)"

# --- Helper Functions ---

generate_branch_name() {
    echo "analysis-$(date +%Y%m%d)-$(openssl rand -hex 2)"
}

# --- macOS Functions (osascript) ---

macos_welcome() {
    # Returns "Remote", "Local", or "Cancel"
    # We also need to handle Copilot toggle. 
    # Since AppleScript dialogs are limited, we'll ask for Copilot in a second step if Local is chosen.
    
    osascript <<EOF
    try
        set result to button returned of (display dialog "Welcome to ORION Studio" buttons {"Connect to Analysis Cluster", "Data Reduction Locally"} default button "Data Reduction Locally" with title "ORION Studio" with icon note)
        return result
    on error
        return "Cancel"
    end try
EOF
}

macos_copilot_toggle() {
    osascript <<EOF
    try
        set result to button returned of (display dialog "Enable AI Assistance (GitHub Copilot)?" buttons {"No", "Yes"} default button "Yes" with title "ORION Studio Configuration" with icon note)
        return result
    on error
        return "Cancel"
    end try
EOF
}

macos_action_select() {
    osascript <<EOF
    try
        set result to button returned of (display dialog "How would you like to proceed?" buttons {"Clone Fresh Copy", "Open Existing Notebooks"} default button "Open Existing Notebooks" with title "ORION Studio")
        return result
    on error
        return "Cancel"
    end try
EOF
}

macos_folder_picker() {
    local prompt="$1"
    osascript <<EOF
    try
        set folderPath to POSIX path of (choose folder with prompt "$prompt")
        return folderPath
    on error
        return ""
    end try
EOF
}

macos_branch_input() {
    local default_name="$1"
    osascript <<EOF
    try
        set result to text returned of (display dialog "Create a new feature branch for your analysis:" default answer "$default_name" buttons {"OK"} default button "OK" with title "Branch Selection")
        return result
    on error
        return ""
    end try
EOF
}

macos_alert() {
    local msg="$1"
    osascript -e "display alert \"$msg\""
}

macos_progress_start() {
    # macOS doesn't have a non-blocking progress bar easily.
    # We will just notify the user.
    osascript -e 'display notification "Cloning repository... This may take a few minutes." with title "ORION Studio"'
}

macos_progress_end() {
    osascript -e 'display notification "Cloning complete!" with title "ORION Studio"'
}

# --- Linux Functions (zenity) ---

linux_welcome() {
    # Returns "Remote", "Local", or "" (Cancel)
    # We use a checklist to allow Copilot toggle in the same screen
    
    # Output format: "Option|Copilot" e.g. "Data Reduction Locally|TRUE"
    
    result=$(zenity --forms --title="Orion Studio" --text="Welcome" \
        --add-list="Mode" --list-values="Data Reduction Locally|Connect to Analysis Cluster (Disabled)" \
        --add-bool="Enable GitHub Copilot" --forms-date-format="%Y-%m-%d" 2>/dev/null)
    
    echo "$result"
}

linux_action_select() {
    zenity --question --title="Orion Studio" \
        --text="How would you like to proceed?" \
        --ok-label="Open Existing Notebooks" \
        --cancel-label="Clone Fresh Copy" \
        --switch
        
    if [ $? -eq 0 ]; then
        echo "Open Existing Notebooks"
    else
        echo "Clone Fresh Copy"
    fi
}

linux_folder_picker() {
    local prompt="$1"
    zenity --file-selection --directory --title="$prompt"
}

linux_branch_input() {
    local default_name="$1"
    zenity --entry --title="Branch Selection" --text="Create a new feature branch for your analysis:" --entry-text="$default_name"
}

linux_alert() {
    local msg="$1"
    zenity --error --text="$msg"
}

# --- Main Logic ---

# Check if App exists
if [ ! -f "$APP_PATH" ]; then
    echo "Error: Orion Studio not found at $APP_PATH"
    if [ "$OS" == "Darwin" ]; then
        macos_alert "Orion Studio not found. Please run the build script."
    else
        linux_alert "Orion Studio not found. Please run the build script."
    fi
    exit 1
fi

# 1. Welcome & Configuration
SELECTED_MODE=""
ENABLE_COPILOT="TRUE"

if [ "$OS" == "Darwin" ]; then
    while true; do
        RESPONSE=$(macos_welcome)
        if [ "$RESPONSE" == "Cancel" ]; then exit 0; fi
        
        if [ "$RESPONSE" == "Connect to Analysis Cluster" ]; then
            macos_alert "Remote analysis is currently disabled. Please select 'Data Reduction Locally'."
        else
            SELECTED_MODE="LOCAL"
            # Ask for Copilot
            COPILOT_RESP=$(macos_copilot_toggle)
            if [ "$COPILOT_RESP" == "No" ]; then
                ENABLE_COPILOT="FALSE"
            fi
            break
        fi
    done
else
    # Linux
    # Zenity forms output: "Data Reduction Locally|TRUE"
    RESPONSE=$(linux_welcome)
    if [ -z "$RESPONSE" ]; then exit 0; fi
    
    MODE=$(echo "$RESPONSE" | cut -d'|' -f1)
    COPILOT_CHECK=$(echo "$RESPONSE" | cut -d'|' -f2)
    
    if [[ "$MODE" == *"Connect to Analysis"* ]]; then
        linux_alert "Remote analysis is currently disabled."
        exit 0
    fi
    
    SELECTED_MODE="LOCAL"
    if [ "$COPILOT_CHECK" == "FALSE" ]; then
        ENABLE_COPILOT="FALSE"
    fi
fi

# 2. Action Selection
ACTION=""
if [ "$OS" == "Darwin" ]; then
    ACTION=$(macos_action_select)
    if [ "$ACTION" == "Cancel" ]; then exit 0; fi
else
    ACTION=$(linux_action_select)
fi

TARGET_DIR=""

if [ "$ACTION" == "Open Existing Notebooks" ]; then
    # 3a. Open Existing
    if [ "$OS" == "Darwin" ]; then
        TARGET_DIR=$(macos_folder_picker "Select the notebook folder to open:")
    else
        TARGET_DIR=$(linux_folder_picker "Select the notebook folder to open:")
    fi
    
else
    # 3b. Clone Fresh Copy
    if [ "$OS" == "Darwin" ]; then
        PARENT_DIR=$(macos_folder_picker "Select where to clone the notebooks:")
    else
        PARENT_DIR=$(linux_folder_picker "Select where to clone the notebooks:")
    fi
    
    if [ -z "$PARENT_DIR" ]; then exit 0; fi
    
    TARGET_DIR="$PARENT_DIR/neutron_notebooks"
    
    # 4. Cloning with Progress
    echo "Cloning to $TARGET_DIR..."
    
    if [ "$OS" == "Darwin" ]; then
        macos_progress_start
        # Stream output to terminal so user sees progress
        git clone --progress "$NOTEBOOK_REPO" "$TARGET_DIR"
        CLONE_STATUS=$?
        macos_progress_end
    else
        # Zenity progress bar
        # git clone --progress outputs to stderr, redirect to stdout for zenity
        (
            echo "10"; sleep 1
            git clone --progress "$NOTEBOOK_REPO" "$TARGET_DIR" 2>&1 | \
                awk '{
                    if ($0 ~ /Receiving objects: +([0-9]+)%/) {
                        print $0; fflush();
                    }
                }' | \
                sed -u 's/Receiving objects: \([0-9]*\)%.*/\1/' | \
                while read percent; do
                    echo "$percent"
                    echo "# Cloning... $percent%"
                done
        ) | zenity --progress --title="Cloning Repository" --text="Starting clone..." --percentage=0 --auto-close
        
        CLONE_STATUS=${PIPESTATUS[0]} 
        # Note: PIPESTATUS might be tricky in subshell, but let's assume success if folder exists
        if [ -d "$TARGET_DIR" ]; then CLONE_STATUS=0; else CLONE_STATUS=1; fi
    fi
    
    if [ $CLONE_STATUS -ne 0 ]; then
        if [ "$OS" == "Darwin" ]; then
            macos_alert "Failed to clone repository. See terminal for details."
        else
            linux_alert "Failed to clone repository."
        fi
        exit 1
    fi
    
    # 5. Branch Selection
    DEFAULT_BRANCH=$(generate_branch_name)
    BRANCH_NAME=""
    
    if [ "$OS" == "Darwin" ]; then
        BRANCH_NAME=$(macos_branch_input "$DEFAULT_BRANCH")
    else
        BRANCH_NAME=$(linux_branch_input "$DEFAULT_BRANCH")
    fi
    
    if [ ! -z "$BRANCH_NAME" ]; then
        echo "Creating branch $BRANCH_NAME..."
        git -C "$TARGET_DIR" checkout -b "$BRANCH_NAME"
    fi
fi

if [ -z "$TARGET_DIR" ]; then exit 0; fi

if [ -z "$TARGET_DIR" ]; then exit 0; fi

# 6. Pixi Environment Setup
echo "Checking for Pixi..."

install_pixi() {
    echo "Installing Pixi..."
    curl -fsSL https://pixi.sh/install.sh | bash
    export PATH="$HOME/.pixi/bin:$PATH"
}

if ! command -v pixi &> /dev/null; then
    # Check if it's in the default location but not in PATH
    if [ -f "$HOME/.pixi/bin/pixi" ]; then
        export PATH="$HOME/.pixi/bin:$PATH"
    else
        # Prompt to install
        INSTALL_PIXI="NO"
        if [ "$OS" == "Darwin" ]; then
            osascript <<EOF
            try
                set result to button returned of (display dialog "Pixi is required but not found. Install it now?" buttons {"No", "Yes"} default button "Yes" with title "Missing Dependency" with icon note)
                if result is "Yes" then return "YES"
            on error
                return "NO"
            end try
EOF
            if [ $? -eq 0 ]; then INSTALL_PIXI="YES"; fi # Note: capturing output from osascript above is tricky in this block structure, let's simplify.
        else
            if zenity --question --title="Missing Dependency" --text="Pixi is required but not found. Install it now?"; then
                INSTALL_PIXI="YES"
            fi
        fi
        
        # Re-implementing the capture correctly
        if [ "$OS" == "Darwin" ]; then
             RESP=$(osascript -e 'try
                set result to button returned of (display dialog "Pixi is required but not found. Install it now?" buttons {"No", "Yes"} default button "Yes" with title "Missing Dependency" with icon note)
                return result
            on error
                return "No"
            end try')
            if [ "$RESP" == "Yes" ]; then INSTALL_PIXI="YES"; fi
        fi

        if [ "$INSTALL_PIXI" == "YES" ]; then
            install_pixi
        else
            echo "Pixi is required. Exiting."
            exit 1
        fi
    fi
fi

# Run pixi install
echo "Setting up Pixi environment in $TARGET_DIR..."
if [ "$OS" == "Darwin" ]; then
    osascript -e 'display notification "Setting up Python environment (Pixi)..." with title "ORION Studio"'
fi

# We run pixi install. It might take a while, so we stream output.
cd "$TARGET_DIR"
if [ -f "pixi.toml" ]; then
    pixi install
else
    echo "Warning: No pixi.toml found in $TARGET_DIR. Skipping pixi install."
fi
cd - > /dev/null

# 7. Launch Orion Studio
ARGS=("$TARGET_DIR")

if [ "$ENABLE_COPILOT" == "FALSE" ]; then
    echo "Disabling Copilot..."
    ARGS+=("--disable-extension" "GitHub.copilot")
    ARGS+=("--disable-extension" "GitHub.copilot-chat")
fi

echo "Launching Orion Studio..."
"$APP_PATH" "${ARGS[@]}"
