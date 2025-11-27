import json
import os
import platform
import shutil
import ssl
import subprocess
import tarfile
import urllib.request
import zipfile

# Configuration
# Configuration
APP_NAME = "OrionStudio"
FALLBACK_VSCODE_VERSION = "1.106.3"
CONFIG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config")
BUILD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "build")
DIST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")


def get_latest_version():
    url = "https://update.code.visualstudio.com/api/releases/stable"
    print(f"Fetching latest VS Code version from {url}...")
    try:
        # Bypass SSL verification for simplicity
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        with urllib.request.urlopen(url, context=ctx) as response:
            data = json.loads(response.read().decode())
            if isinstance(data, list) and len(data) > 0:
                version = data[0]
                print(f"Detected latest VS Code version: {version}")
                return version
            else:
                raise Exception("Invalid API response format")
    except Exception as e:
        print(f"Failed to fetch latest version: {e}")
        # Fallback to a known recent version if API fails
        print(f"Falling back to version {FALLBACK_VSCODE_VERSION}")
        return FALLBACK_VSCODE_VERSION


def get_download_url():
    version = get_latest_version()
    system = platform.system()
    machine = platform.machine()

    if system == "Darwin":
        if machine == "arm64":
            return f"https://update.code.visualstudio.com/{version}/darwin-arm64/stable"
        else:
            return f"https://update.code.visualstudio.com/{version}/darwin/stable"
    elif system == "Linux":
        if machine == "x86_64":
            return f"https://update.code.visualstudio.com/{version}/linux-x64/stable"
        elif machine == "aarch64":
            return f"https://update.code.visualstudio.com/{version}/linux-arm64/stable"

    raise Exception(f"Unsupported platform: {system} {machine}")


def download_file(url, dest):
    print(f"Downloading VS Code from {url}...")
    # Bypass SSL verification for simplicity in some environments
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    with urllib.request.urlopen(url, context=ctx) as response, open(dest, "wb") as out_file:
        shutil.copyfileobj(response, out_file)


def extract_file(filepath, dest_dir):
    print(f"Extracting {filepath} to {dest_dir}...")
    if filepath.endswith(".zip"):
        # Use system unzip on macOS to preserve permissions and symlinks
        if platform.system() == "Darwin":
            subprocess.run(["unzip", "-q", filepath, "-d", dest_dir], check=True)
        else:
            with zipfile.ZipFile(filepath, "r") as zip_ref:
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


def get_extension_info(extension_id):
    """Query VS Code Marketplace API to get extension download URL, version, and dependencies."""
    # Parse extension ID (publisher.name or publisher.name@version)
    version = None
    if "@" in extension_id:
        extension_id, version = extension_id.rsplit("@", 1)

    if "." not in extension_id:
        print(f"Warning: Invalid extension ID format: {extension_id}")
        return None

    publisher, name = extension_id.split(".", 1)

    # VS Code Marketplace API
    api_url = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery"

    # Build query payload
    payload = {
        "filters": [
            {
                "criteria": [
                    {"filterType": 7, "value": extension_id}  # ExtensionName filter
                ]
            }
        ],
        "flags": 914,  # Include files, versions, properties
    }

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(
        api_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json;api-version=6.0-preview.1"},
    )

    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            data = json.loads(response.read().decode())

            if not data.get("results") or not data["results"][0].get("extensions"):
                return None

            ext = data["results"][0]["extensions"][0]
            versions = ext.get("versions", [])

            if not versions:
                return None

            # Find requested version or use latest
            target_version = None
            for v in versions:
                if version and v["version"] == version:
                    target_version = v
                    break
                elif not version:
                    target_version = v  # First is latest
                    break

            if not target_version:
                target_version = versions[0]

            # Find VSIX download URL
            vsix_url = None
            for file in target_version.get("files", []):
                if file.get("assetType") == "Microsoft.VisualStudio.Services.VSIXPackage":
                    vsix_url = file.get("source")
                    break

            # Extract dependencies and extension pack members
            dependencies = []
            for prop in target_version.get("properties", []):
                key = prop.get("key", "")
                value = prop.get("value", "")
                if key == "Microsoft.VisualStudio.Code.ExtensionDependencies" and value:
                    dependencies.extend([d.strip() for d in value.split(",") if d.strip()])
                elif key == "Microsoft.VisualStudio.Code.ExtensionPack" and value:
                    dependencies.extend([d.strip() for d in value.split(",") if d.strip()])

            # Check for platform-specific packages
            target_platform = None
            system = platform.system()
            machine = platform.machine()
            if system == "Darwin":
                target_platform = "darwin-arm64" if machine == "arm64" else "darwin-x64"
            elif system == "Linux":
                target_platform = "linux-arm64" if machine == "aarch64" else "linux-x64"

            # Try platform-specific URL
            if target_platform:
                platform_url = f"https://{publisher}.gallery.vsassets.io/_apis/public/gallery/publisher/{publisher}/extension/{name}/{target_version['version']}/assetbyname/Microsoft.VisualStudio.Services.VSIXPackage?targetPlatform={target_platform}"
                # Test if platform-specific exists
                try:
                    test_req = urllib.request.Request(platform_url, method="HEAD")
                    with urllib.request.urlopen(test_req, context=ctx) as resp:
                        if resp.status == 200:
                            vsix_url = platform_url
                except (urllib.error.URLError, urllib.error.HTTPError):
                    pass  # Fall back to universal

            if not vsix_url:
                # Construct fallback URL
                vsix_url = f"https://{publisher}.gallery.vsassets.io/_apis/public/gallery/publisher/{publisher}/extension/{name}/{target_version['version']}/assetbyname/Microsoft.VisualStudio.Services.VSIXPackage"

            return {
                "id": extension_id,
                "publisher": publisher,
                "name": name,
                "version": target_version["version"],
                "vsix_url": vsix_url,
                "dependencies": dependencies,
            }
    except Exception as e:
        print(f"Warning: Could not query marketplace for {extension_id}: {e}")
        return None


def download_and_install_vsix(ext_info, extensions_dir):
    """Download VSIX and extract to extensions directory."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    vsix_path = os.path.join(BUILD_DIR, f"{ext_info['publisher']}.{ext_info['name']}.vsix")

    # Download VSIX
    try:
        with urllib.request.urlopen(ext_info["vsix_url"], context=ctx) as response:
            with open(vsix_path, "wb") as f:
                shutil.copyfileobj(response, f)
    except Exception as e:
        print(f"  Failed to download: {e}")
        return False

    # VSIX is a ZIP file - extract it
    ext_dir_name = f"{ext_info['publisher']}.{ext_info['name']}-{ext_info['version']}"
    ext_target = os.path.join(extensions_dir, ext_dir_name)

    if os.path.exists(ext_target):
        shutil.rmtree(ext_target)

    os.makedirs(ext_target, exist_ok=True)

    try:
        with zipfile.ZipFile(vsix_path, "r") as zip_ref:
            # VSIX contains extension/ folder - extract contents
            for member in zip_ref.namelist():
                if member.startswith("extension/"):
                    # Remove 'extension/' prefix
                    target_path = os.path.join(ext_target, member[10:])
                    if member.endswith("/"):
                        os.makedirs(target_path, exist_ok=True)
                    else:
                        os.makedirs(os.path.dirname(target_path), exist_ok=True)
                        with zip_ref.open(member) as src, open(target_path, "wb") as dst:
                            shutil.copyfileobj(src, dst)

        # Clean up VSIX file
        os.remove(vsix_path)
        return True
    except Exception as e:
        print(f"  Failed to extract: {e}")
        return False


def install_extensions(install_dir, data_dir):
    print("Installing extensions...")
    system = platform.system()
    extensions_file = os.path.join(CONFIG_DIR, "extensions.txt")
    if not os.path.exists(extensions_file):
        print("No extensions.txt found, skipping.")
        return

    with open(extensions_file) as f:
        lines = [line.strip() for line in f if line.strip()]

    # Parse extensions and exclusions (lines starting with "# !" are exclusions)
    extensions = []
    excluded = set()
    for line in lines:
        if line.startswith("# !"):
            # Exclusion: # !extension.id
            excluded.add(line[3:].strip().lower())
        elif not line.startswith("#"):
            extensions.append(line)

    # Install Orion Launcher Extension
    print("Building Orion Launcher Extension...")
    ext_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "extensions", "orion-launcher")

    # Install dependencies and compile
    subprocess.run(["pixi", "run", "npm", "install"], cwd=ext_dir, check=True)
    subprocess.run(["pixi", "run", "npm", "run", "compile"], cwd=ext_dir, check=True)

    # Copy to extensions directory
    # For macOS: Orion Studio.app/Contents/Resources/app/extensions/orion-launcher
    # For Linux: OrionStudio/resources/app/extensions/orion-launcher
    # Strategy: Bundle as "built-in" by placing in resources/app/extensions.

    if system == "Darwin":
        target_ext_dir = os.path.join(
            install_dir, "Visual Studio Code.app", "Contents", "Resources", "app", "extensions", "orion-launcher"
        )
    elif system == "Linux":
        contents = os.listdir(install_dir)
        vscode_dir = next((d for d in contents if "VSCode" in d), None)
        if vscode_dir:
            target_ext_dir = os.path.join(install_dir, vscode_dir, "resources", "app", "extensions", "orion-launcher")
        else:
            # Fallback if structure is different
            target_ext_dir = os.path.join(install_dir, "resources", "app", "extensions", "orion-launcher")

    if os.path.exists(target_ext_dir):
        shutil.rmtree(target_ext_dir)

    print(f"Installing Orion Launcher to {target_ext_dir}...")
    shutil.copytree(ext_dir, target_ext_dir, ignore=shutil.ignore_patterns("node_modules", ".git", ".vscode-test"))

    # We need to install production dependencies in the target
    subprocess.run(["pixi", "run", "npm", "install", "--production"], cwd=target_ext_dir, check=True)

    # Define extensions dir inside portable data dir
    extensions_dir = os.path.join(data_dir, "extensions")
    os.makedirs(extensions_dir, exist_ok=True)

    # Track installed/processing extensions to avoid duplicates and circular deps
    installed = set()
    processing = set()  # Track extensions currently being processed to detect cycles

    def install_with_dependencies(ext_id, indent=2):
        """Recursively install an extension and its dependencies."""
        ext_id_lower = ext_id.lower()

        # Skip if excluded, already installed, or currently being processed
        if ext_id_lower in excluded:
            print(f"{' ' * indent}{ext_id}... (excluded)")
            return True
        if ext_id_lower in installed or ext_id_lower in processing:
            return True

        # Mark as processing to prevent circular recursion
        processing.add(ext_id_lower)

        print(f"{' ' * indent}{ext_id}...")
        ext_info = get_extension_info(ext_id)
        if not ext_info:
            print(f"{' ' * indent}  Could not find in marketplace")
            processing.discard(ext_id_lower)
            return False

        # Install dependencies first (skip excluded/installed/processing)
        for dep in ext_info.get("dependencies", []):
            dep_lower = dep.lower()
            if dep_lower not in excluded and dep_lower not in installed and dep_lower not in processing:
                install_with_dependencies(dep, indent + 2)

        # Install the extension itself
        if download_and_install_vsix(ext_info, extensions_dir):
            print(f"{' ' * indent}  Installed v{ext_info['version']}")
            installed.add(ext_id_lower)
            processing.discard(ext_id_lower)
            return True
        else:
            print(f"{' ' * indent}  Failed to install")
            processing.discard(ext_id_lower)
            return False

    # Download and install marketplace extensions directly (no Electron CLI needed)
    print("Downloading marketplace extensions...")
    for ext in extensions:
        install_with_dependencies(ext)


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
        launcher_dest = os.path.join(macos_dir, "OrionStudio")  # Main executable name
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
        for root, dirs, _files in os.walk(extract_dir):
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
        return  # End of macOS build

    elif system == "Linux":
        # Setup Portable
        orion_dir = os.path.join(DIST_DIR, APP_NAME)
        if os.path.exists(orion_dir):
            shutil.rmtree(orion_dir)
        os.makedirs(orion_dir)

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
        launcher_dest = os.path.join(orion_dir, "OrionStudio")  # No extension for cleaner look
        shutil.copy(launcher_src, launcher_dest)
        os.chmod(launcher_dest, 0o755)

    # Now setup portable mode in the final location
    data_dir = setup_portable_mode(orion_dir)

    # Install Extensions
    install_extensions(orion_dir, data_dir)

    print(f"Build complete! Orion Studio is located at: {orion_dir}")


if __name__ == "__main__":
    main()
