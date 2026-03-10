"""Bump version across all project files that track the Orion Studio version.

Usage:
    pixi run bump 1.5.0
    pixi run bump patch   # 1.4.0 -> 1.4.1
    pixi run bump minor   # 1.4.0 -> 1.5.0
    pixi run bump major   # 1.4.0 -> 2.0.0
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VERSION_FILES = [
    ROOT / "pixi.toml",
    ROOT / "extensions" / "orion-launcher" / "package.json",
]

VERSION_RE = re.compile(r"(\d+)\.(\d+)\.(\d+)")


def read_current_version():
    """Read the current version from pixi.toml."""
    text = (ROOT / "pixi.toml").read_text()
    match = re.search(r'^version\s*=\s*"(\d+\.\d+\.\d+)"', text, re.MULTILINE)
    if not match:
        print("Error: Could not find version in pixi.toml")
        sys.exit(1)
    return match.group(1)


def compute_new_version(current, arg):
    """Compute new version from a semver keyword or explicit version string."""
    major, minor, patch = (int(x) for x in current.split("."))

    if arg == "patch":
        return f"{major}.{minor}.{patch + 1}"
    elif arg == "minor":
        return f"{major}.{minor + 1}.0"
    elif arg == "major":
        return f"{major + 1}.0.0"
    elif VERSION_RE.fullmatch(arg):
        return arg
    else:
        print(f"Error: Invalid version argument '{arg}'")
        print("Usage: pixi run bump [major|minor|patch|X.Y.Z]")
        sys.exit(1)


def bump_pixi_toml(path, old, new):
    text = path.read_text()
    updated = re.sub(
        rf'^(version\s*=\s*"){re.escape(old)}(")',
        rf"\g<1>{new}\2",
        text,
        count=1,
        flags=re.MULTILINE,
    )
    path.write_text(updated)


def bump_package_json(path, old, new):
    data = json.loads(path.read_text())
    if data.get("version") != old:
        print(f"Warning: {path.name} version is '{data.get('version')}', expected '{old}'")
    data["version"] = new
    path.write_text(json.dumps(data, indent=2) + "\n")


def main():
    if len(sys.argv) != 2:
        print("Usage: pixi run bump [major|minor|patch|X.Y.Z]")
        sys.exit(1)

    current = read_current_version()
    new = compute_new_version(current, sys.argv[1])

    if current == new:
        print(f"Version is already {current}")
        sys.exit(0)

    print(f"Bumping version: {current} -> {new}")

    bump_pixi_toml(ROOT / "pixi.toml", current, new)
    print(f"  Updated pixi.toml")

    bump_package_json(ROOT / "extensions" / "orion-launcher" / "package.json", current, new)
    print(f"  Updated extensions/orion-launcher/package.json")

    print(f"\nVersion bumped to {new}")
    print("Remember to update CHANGELOG.md before tagging the release.")


if __name__ == "__main__":
    main()
