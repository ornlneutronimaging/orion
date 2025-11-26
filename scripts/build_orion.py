import os
import sys
import platform
import urllib.request
import zipfile
import tarfile
import shutil
import subprocess
import json
import ssl
import stat

# Configuration
VSCODE_VERSION = "1.95.0"  # Pin a specific version for stability
APP_NAME = "OrionStudio"
CONFIG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config")
BUILD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "build")
DIST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")

def get_download_url():
    system = platform.system()
    machine = platform.machine()
    
    if system == "Darwin":
        if machine == "arm64":
            return f"https://update.code.visualstudio.com/{VSCODE_VERSION}/darwin-arm64/stable"
        else:
            return f"https://update.code.visualstudio.com/{VSCODE_VERSION}/darwin/stable"
    elif system == "Linux":
        if machine == "x86_64":
            return f"https://update.code.visualstudio.com/{VSCODE_VERSION}/linux-x64/stable"
        elif machine == "aarch64":
            return f"https://update.code.visualstudio.com/{VSCODE_VERSION}/linux-arm64/stable"
    
    raise Exception(f"Unsupported platform: {system} {machine}")

def download_file(url, dest):
    print(f"Downloading VS Code from {url}...")
    # Bypass SSL verification for simplicity in some environments
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    with urllib.request.urlopen(url, context=ctx) as response, open(dest, 'wb') as out_file:
        shutil.copyfileobj(response, out_file)

def extract_file(filepath, dest_dir):
    print(f"Extracting {filepath} to {dest_dir}...")
    if filepath.endswith(".zip"):
        # Use system unzip on macOS to preserve permissions and symlinks
        if platform.system() == "Darwin":
            subprocess.run(["unzip", "-q", filepath, "-d", dest_dir], check=True)
        else:
            with zipfile.ZipFile(filepath, 'r') as zip_ref:
                zip_ref.extractall(dest_dir)
    elif filepath.endswith(".tar.gz"):
        with tarfile.open(filepath, "r:gz") as tar_ref:
            tar_ref.extractall(dest_dir)

def clear_quarantine(app_path):
    if platform.system() == "Darwin":
        print(f"Clearing quarantine attributes for {app_path}...")
        try:
            subprocess.run(["xattr", "-cr", app_path], check=True)
        except subprocess.CalledProcessError as e:
            print(f"Warning: Failed to clear quarantine: {e}")


def setup_portable_mode(install_dir):
    print("Setting up Portable Mode...")
    system = platform.system()
    
    data_dir = ""
    if system == "Darwin":
        # On macOS, 'code-portable-data' goes alongside the .app
        data_dir = os.path.join(install_dir, "code-portable-data")
    elif system == "Linux":
        # On Linux, 'data' goes inside the extracted folder
        contents = os.listdir(install_dir)
        vscode_dir = next((d for d in contents if "VSCode" in d), None)
        if vscode_dir:
             data_dir = os.path.join(install_dir, vscode_dir, "data")
        else:
             data_dir = os.path.join(install_dir, "data")

    os.makedirs(data_dir, exist_ok=True)
    
    # Create User/settings.json
    user_data_dir = os.path.join(data_dir, "user-data", "User")
    os.makedirs(user_data_dir, exist_ok=True)
    
    settings_src = os.path.join(CONFIG_DIR, "settings.json")
    settings_dest = os.path.join(user_data_dir, "settings.json")
    
    if os.path.exists(settings_src):
        print(f"Copying settings from {settings_src}...")
        shutil.copy(settings_src, settings_dest)
    
    return data_dir

def install_extensions(install_dir, data_dir):
    print("Installing extensions...")
    extensions_file = os.path.join(CONFIG_DIR, "extensions.txt")
    if not os.path.exists(extensions_file):
        print("No extensions.txt found, skipping.")
        return

    with open(extensions_file, 'r') as f:
        extensions = [line.strip() for line in f if line.strip() and not line.startswith("#")]

    system = platform.system()
    code_executable = ""
    
    if system == "Darwin":
        # Path inside the app bundle
        code_executable = os.path.join(install_dir, "Visual Studio Code.app", "Contents", "Resources", "app", "bin", "code")
    elif system == "Linux":
         contents = os.listdir(install_dir)
         vscode_dir = next((d for d in contents if "VSCode" in d), None)
         if vscode_dir:
             code_executable = os.path.join(install_dir, vscode_dir, "bin", "code")

    if not os.path.exists(code_executable):
        print(f"Error: Could not find code executable at {code_executable}")
        return

    # Ensure executable permissions
    # We need to chmod the actual binary, not just the shell script if possible, but the shell script is what we call.
    # Let's chmod the shell script.
    st = os.stat(code_executable)
    os.chmod(code_executable, st.st_mode | stat.S_IEXEC)

    for ext in extensions:
        print(f"Installing {ext}...")
        try:
            # We must use the --force flag to ensure it installs even if there are version mismatches or other warnings
            # Also bypass SSL for corporate proxies
            env = os.environ.copy()
            env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0"
            subprocess.run([code_executable, "--install-extension", ext, "--force"], check=True, env=env)
        except subprocess.CalledProcessError as e:
            print(f"Failed to install {ext}: {e}")

def main():
    # Clean build dir
    if os.path.exists(BUILD_DIR):
        shutil.rmtree(BUILD_DIR)
    os.makedirs(BUILD_DIR)
    
    if os.path.exists(DIST_DIR):
        shutil.rmtree(DIST_DIR)
    os.makedirs(DIST_DIR)

    # Download
    url = get_download_url()
    
    # Determine filename based on platform
    if platform.system() == "Darwin":
        filename = "vscode.zip"
    else:
        filename = "vscode.tar.gz"
        
    download_path = os.path.join(BUILD_DIR, filename)
    download_file(url, download_path)

    # Extract
    extract_dir = os.path.join(BUILD_DIR, "extracted")
    os.makedirs(extract_dir)
    extract_file(download_path, extract_dir)

    system = platform.system()
    if system == "Darwin":
        # Create the Wrapper App Structure
        wrapper_app = os.path.join(DIST_DIR, "Orion Studio.app")
        contents_dir = os.path.join(wrapper_app, "Contents")
        macos_dir = os.path.join(contents_dir, "MacOS")
        resources_dir = os.path.join(contents_dir, "Resources")
        
        if os.path.exists(wrapper_app):
            shutil.rmtree(wrapper_app)
            
        os.makedirs(macos_dir)
        os.makedirs(resources_dir)
        
        # 1. Install the Launcher Script
        launcher_src = os.path.join(os.path.dirname(__file__), "launch_orion.sh")
        launcher_dest = os.path.join(macos_dir, "OrionStudio") # Main executable name
        shutil.copy(launcher_src, launcher_dest)
        os.chmod(launcher_dest, 0o755)
        
        # 2. Create Info.plist for the Wrapper
        info_plist_content = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>OrionStudio</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>gov.ornl.neutron.orionstudio</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>Orion Studio</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.13</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>"""
        with open(os.path.join(contents_dir, "Info.plist"), "w") as f:
            f.write(info_plist_content)

        # 3. Move VS Code to Resources (Embedded)
        # Find Visual Studio Code.app in extract_dir
        vscode_src = None
        for root, dirs, files in os.walk(extract_dir):
            for d in dirs:
                if d == "Visual Studio Code.app":
                    vscode_src = os.path.join(root, d)
                    break
            if vscode_src:
                break
        
        if not vscode_src:
            print(f"Error: Could not find Visual Studio Code.app in {extract_dir}")
            return

        vscode_dest = os.path.join(resources_dir, "Visual Studio Code.app")
        print(f"Embedding {vscode_src} into {vscode_dest}...")
        shutil.move(vscode_src, vscode_dest)
        
        # Clear quarantine on the embedded app
        clear_quarantine(vscode_dest)
        
        # 4. Setup Portable Mode (inside the embedded app)
        # For macOS, 'code-portable-data' goes alongside the binary's app bundle, 
        # BUT since we are embedding it, we need to be careful.
        # VS Code looks for 'code-portable-data' sibling to 'Visual Studio Code.app' OR inside it.
        # Let's put it inside the embedded app's Contents/Resources/app/ to be safe? 
        # Actually, standard portable mode for macOS is sibling to the .app.
        # So we put 'code-portable-data' in Orion Studio.app/Contents/Resources/
        
        data_dir = os.path.join(resources_dir, "code-portable-data")
        os.makedirs(data_dir, exist_ok=True)
        
        # Create User/settings.json
        user_data_dir = os.path.join(data_dir, "user-data", "User")
        os.makedirs(user_data_dir, exist_ok=True)
        
        settings_src = os.path.join(CONFIG_DIR, "settings.json")
        settings_dest = os.path.join(user_data_dir, "settings.json")
        
        if os.path.exists(settings_src):
            print(f"Copying settings from {settings_src}...")
            shutil.copy(settings_src, settings_dest)

        # 5. Install Extensions
        # We need to point install_extensions to the EMBEDDED app
        # install_extensions expects the PARENT directory of "Visual Studio Code.app"
        install_extensions(resources_dir, data_dir)
        
        print(f"Build complete! Orion Studio.app is located at: {wrapper_app}")
        return # End of macOS build

    elif system == "Linux":
        # Setup Portable
        orion_dir = os.path.join(DIST_DIR, APP_NAME)
        # Find the inner folder
        contents = os.listdir(extract_dir)
        vscode_dir = next((d for d in contents if "VSCode" in d), None)
        if vscode_dir:
            src_dir = os.path.join(extract_dir, vscode_dir)
            # Move contents of src_dir to orion_dir
            for item in os.listdir(src_dir):
                shutil.move(os.path.join(src_dir, item), orion_dir)
        
        # Install Launcher Script for Linux
        launcher_src = os.path.join(os.path.dirname(__file__), "launch_orion.sh")
        launcher_dest = os.path.join(orion_dir, "OrionStudio") # No extension for cleaner look
        shutil.copy(launcher_src, launcher_dest)
        os.chmod(launcher_dest, 0o755)

    # Now setup portable mode in the final location
    data_dir = setup_portable_mode(orion_dir)
    
    # Install Extensions
    install_extensions(orion_dir, data_dir)
    
    print(f"Build complete! Orion Studio is located at: {orion_dir}")

if __name__ == "__main__":
    main()
