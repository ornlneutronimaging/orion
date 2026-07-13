# Task contract

## Source

Original user request (verbatim):

> let's update orion and make a new release now that vscode base has progressed a lot

Two decisions the user then made explicitly, via a multiple-choice prompt
(these EXTEND the scope of the original request; they do not narrow it):

1. Question: "Which VS Code base should v1.7.0 pin to?"
   User selected: **"1.127.0 (Recommended)"**
   (Option text: "What Microsoft's update channel is serving to all platforms today.
   Avoids the 1.128 UI perf regression (#324985, fix milestoned 1.129.0, no hotfix
   shipped). Orion gains nothing from 1.128 — it's all Agents/Chat, zero changes to
   Python/Jupyter/Remote-SSH/HDF5.")

2. Question: "The pre-release extension bug is pre-existing and outside your 'update
   the base' request. Fix it in this release?"
   User selected: **"Fix it in v1.7.0 (Recommended)"**
   (Option text: "Switch the marketplace query to the release channel so scientists
   stop getting pre-release builds. Riskiest part: Jupyter moves back ~10 months
   (2026.6.x-pre → 2025.9.1). Requires a real smoke test of notebook execution.
   Explicit id@version pins in extensions.txt stay available as an escape hatch.")

## Coverage check (Source sentence -> requirement)

The Source is one sentence with two directives plus a stated motivation:

- "let's update orion" -> R1, R2, R3, R4, R7 (the base update, and the pin that makes
  it real). Also R5 (the base move 1.116->1.127 crosses the 1.125 setting retype, so the
  shipped defaults must be migrated with it).
- "and make a new release" -> R8, R9, R10, R11 (version bump, CHANGELOG, PR, tag).
- "now that vscode base has progressed a lot" -> motivation, not a directive. No
  requirement line. It is the reason R1 exists.

Decision 1 -> fixes the target version in R1/R3/R4.
Decision 2 -> R6.

## Rules (enforced by the stop gate)

- One checkbox per requirement, quoting the Source's own words. Every
  imperative sentence in the Source must map to a requirement line.
- Checkboxes must use exactly `- [ ]` — other bullet styles are
  invisible to the gate.
- `[x]` requires evidence ON the line: the check command in backticks
  and what it showed. The gate blocks `[x]` lines with no backticked
  command; an unfilled `<placeholder>` in backticks does not count.
- If an item's recorded evidence is later invalidated (a retraction, a
  failed re-check), flip it back to `- [ ]` — a checked line with dead
  evidence is a false report.
- Dropping an item requires the user's explicit approval of that named
  item: `- [-] DROPPED: <item> (approved: "<user's words>")`. The quoted
  words must themselves address the dropped item — a generic "proceed"
  or "sounds good" is never approval. The gate blocks `[-]` lines with
  no `(approved:` quote.
- Blocked on the user? Mark it `- [?] <item> — BLOCKED ON USER:
  <specific question>`, finish everything not blocked, then end the
  turn asking about all `[?]` items together.
- Never delete or reword a requirement line. Discovered work is ADDED
  as new lines, not swapped in.
- Commit this file unless the user objects — tampering must show in
  git diff.

## Requirements
- [x] R1: "update orion" — VS Code base genuinely PINNED to 1.127.0, not floating.
      Check: `pixi run clean && pixi run build` (no env var) then reading the embedded
      `product.json` -> printed `base: 1.127.0`; packaged `cli.js --version` -> `1.127.0`.
      Before the change the identical command embedded 1.128.0 while the repo claimed 1.116.0.
- [x] R2: "update orion" — no silent float to an unintended base.
      Check: `grep -n 'VSCODE_VERSION' scripts/build_orion.py` -> `VSCODE_VERSION = "1.127.0"`.
      Constant renamed from `FALLBACK_VSCODE_VERSION` (see R13) because it is no longer a
      fallback — it is the pin every build uses. R2's intent is met maximally: no floating
      path remains at all.
- [x] R3: "update orion" — the release workflow builds the SAME pinned base, so the tagged
      artifact provably matches the CHANGELOG.
      Check: `grep -n 'run: pixi run build' .github/workflows/release.yml` -> release.yml:35,
      and `pixi run build` with NO env set embeds 1.127.0 (R1). Original check command
      (`grep ORION_VSCODE_VERSION .github/workflows/release.yml`) is SUPERSEDED by R13:
      release.yml deliberately has no env line, because duplicating the version in a second
      file is the exact drift bug that let the CHANGELOG lie. Pinning in build_orion.py covers
      local + CI + release instead of release only.
- [x] R4: "update orion" — orion-launcher engine floor raised to `^1.127.0`.
      Check: `grep -n '"vscode"' extensions/orion-launcher/package.json` -> `"vscode": "^1.127.0"`;
      package-lock.json:20 regenerated to match.
- [x] R5: "update orion" — three deregistered/retyped default settings migrated.
      Check: `python3 -c "import json;d=json.load(open('config/settings.json'))..."` ->
      `workbench.activityBar.location = 'hidden'`, `extensions.autoUpdate = 'on'`,
      `workbench.colorTheme = 'Light Modern'`, dead key `workbench.activityBar.visible` absent.
      `python3 -m json.tool config/settings.json` -> valid JSON. `git diff config/settings.json`
      shows exactly 3 changed lines.
- [x] R6: (approved addition) "Fix it in v1.7.0" — bundled extensions from the RELEASE
      channel, no pre-release build in the artifact.
      Check: `ls "dist/Orion Studio.app/Contents/Resources/code-portable-data/extensions" | grep -cE '20[0-9]{6}'`
      -> `0` date-stamped pre-release builds, 14 extensions total: remote-ssh-0.124.0,
      jupyter-2025.9.1, python-2026.4.0, pylance-2026.2.1, debugpy-2026.6.0, remote-explorer-0.5.0,
      jupyter-renderers-1.3.0, python-envs-1.36.0, h5web-0.2.2, even-better-toml-0.21.2.
      Before: jupyter-2026.6.2026071001, python-2026.5.2026070801, pylance-2026.2.108,
      debugpy-2026.7.11831011, remote-ssh-0.125.2026062315 — all pre-release.
- [x] R7: GUARD — `@types/vscode` STAYS at `^1.125.0` (npm has no 1.126/1.127/1.128).
      Check: `curl -s https://registry.npmjs.org/@types/vscode` -> `latest` dist-tag = `1.125.0`;
      1.127.0/1.128.0 absent from published versions. `pixi run npm install` exit 0 and
      `pixi run npm run compile` (tsc) exit 0 with the engine at ^1.127.0. This deliberately
      overrides `.claude/skills/release-orion/SKILL.md:31`, which would break the build.
- [x] R8: "make a new release" — version bumped to 1.7.0.
      Check: `pixi run bump 1.7.0` -> "Bumping version: 1.6.0 -> 1.7.0 / Updated pixi.toml /
      Updated extensions/orion-launcher/package.json"; `grep -n version pixi.toml` -> `version = "1.7.0"`.
- [x] R9: "make a new release" — CHANGELOG.md entry + compare link.
      Check: `grep -n '1.7.0' CHANGELOG.md` -> `## [1.7.0] - 2026-07-13` heading and
      `[1.7.0]: https://github.com/ornlneutronimaging/orion/compare/v1.6.0...v1.7.0`.
- [ ] R10: "make a new release" — changes land on main via a release PR with CI green
      (never tag directly on main). — check: `gh pr checks <N>` all green, then merged
- [ ] R11: "make a new release" — tag `v1.7.0` pushed; the release.yml workflow (NOT a
      manual `gh release create`) creates the GitHub Release with both the macOS DMG and
      the Linux tar.gz attached. — check: `gh release view v1.7.0` shows both artifacts
- [?] R12: Manual smoke test of the built app passes before tagging — BLOCKED ON USER:
      only a human can launch the GUI and drive it. CI cannot exercise the wizard, a Jupyter
      kernel, Remote-SSH, or H5Web — and R6 moves Jupyter back ~10 months (2026.6.x-pre ->
      2025.9.1), which is the single most likely regression in this release.
      `dist/OrionStudio-macOS.dmg` (406 MB, base 1.127.0) is built and waiting.

## Discovered work (added during implementation; not in the original plan)

- [x] R13: DEVIATION FROM THE APPROVED PLAN, disclosed. Plan said "add an ORION_VSCODE_VERSION
      env pin; release.yml sets it". Implemented instead as a single constant `VSCODE_VERSION`
      in build_orion.py pinning EVERY build, with `ORION_VSCODE_VERSION` kept as an override
      (`=<x.y.z>` or `=latest`). Reason: a version duplicated into release.yml can drift from
      build_orion.py — the exact failure that let the CHANGELOG claim 1.116.0 while shipping
      1.128.0. Also strictly stronger: under the original plan local and CI builds would still
      float, so CI would not test the base being released.
      Check: `pixi run build` with NO env var set embeds 1.127.0 (R1).
- [x] R14: Guard for a hazard introduced by R6. `install_extensions()` discarded the return of
      `install_with_dependencies()`, so an unresolvable extension only printed a warning and the
      build still exited 0 — the release-channel filter could have silently shipped a DMG missing
      Pylance/Jupyter. Top-level loop now collects failures and raises.
      Check: `pixi run clean && pixi run build` -> exit 0, all 7 extensions + deps installed,
      DMG 406 MB — guard does not false-positive.
- [x] R15: Docs my change made false are corrected. ARCHITECTURE.md said "The build script
      automatically fetches the latest stable VS Code. No manual intervention needed." and
      documented `get_latest_version()`; DEV_CONTEXT.md said VS Code updates were "Automatic
      (downloads latest)" and quoted the three old settings.
      Check: `git diff docs/` -> only version-resolution and settings corrections.
- [x] R16: Reverted unrelated churn that `pixi run lint` (pre-commit --all-files) introduced
      into 8 files never edited this session (4 launcher .ts reflowed by prettier, QUICKSTART.md
      and USER_GUIDE.md by markdownlint, orion-icon.svg trailing newline, bump_version.py
      f-strings by ruff). Pre-existing violations on main; CI does not run pre-commit.
      Check: `git status --short` -> only the 8 files this release actually changes.
