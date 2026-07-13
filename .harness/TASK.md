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
- [x] R1: `pixi run clean && pixi run build` (no env var) -> embedded product.json prints `1.127.0`, packaged `cli.js --version` prints `1.127.0`. "update orion" — the VS Code base is genuinely PINNED to 1.127.0, not floating. Before the change the identical command embedded 1.128.0 while the repo claimed 1.116.0.
- [x] R2: `grep -n 'VSCODE_VERSION' scripts/build_orion.py` -> `VSCODE_VERSION = "1.127.0"`. "update orion" — no silent float to an unintended base. Constant renamed from `FALLBACK_VSCODE_VERSION` (see R13): it is no longer a fallback, it is the pin every build uses. R2's intent is met maximally — no floating path remains at all.
- [x] R3: `gh run view 29288416461 --log | grep "pinned VS Code version"` -> BOTH clean CI runners logged `Using pinned VS Code version: 1.127.0` (macos-latest AND ubuntu-latest), and both installed release-channel extensions (v0.124.0, v2025.9.1, v2026.4.0, v2026.2.1, v2026.6.0). release.yml runs the same unchanged `pixi run build` (release.yml:35), so the tagged artifact will embed the same pinned base. "update orion" — the release workflow builds the SAME pinned base, so the tagged artifact provably matches the CHANGELOG. Original check (`grep ORION_VSCODE_VERSION .github/workflows/release.yml`) SUPERSEDED by R13: no env line was added, because a version duplicated into release.yml drifts from build_orion.py — the exact bug that let the CHANGELOG lie. Pinning in build_orion.py covers local + CI + release instead of release only.
- [x] R4: `grep -n '"vscode"' extensions/orion-launcher/package.json` -> `"vscode": "^1.127.0"`; package-lock.json:20 regenerated to match. "update orion" — orion-launcher engine floor raised to ^1.127.0.
- [x] R5: `python3 -m json.tool config/settings.json` -> valid JSON; key dump -> `workbench.activityBar.location = 'hidden'`, `extensions.autoUpdate = 'on'`, `workbench.colorTheme = 'Light Modern'`, dead key `workbench.activityBar.visible` absent. "update orion" — the three deregistered/retyped default settings are migrated. `git diff config/settings.json` shows exactly 3 changed lines.
- [x] R6: RE-VERIFIED after the R20 platform fix. `ls "$E" | grep -cE "20[0-9]{6}"` -> `0` pre-release, `ls "$E" | wc -l` -> `14` extensions, all release-channel AND now platform-correct. Original retraction stands as history: EVIDENCE RETRACTED (see R20) — the artifact had 0 pre-release builds but contained WRONG-PLATFORM binaries, so "release channel" was true yet the extensions were unusable. Re-verify after the platform fix. Old evidence: `ls "dist/Orion Studio.app/Contents/Resources/code-portable-data/extensions" | grep -cE '20[0-9]{6}'` -> `0` pre-release builds, 14 extensions total. (approved addition) "Fix it in v1.7.0" — bundled extensions now come from the RELEASE channel: remote-ssh-0.124.0, jupyter-2025.9.1, python-2026.4.0, pylance-2026.2.1, debugpy-2026.6.0, remote-explorer-0.5.0, jupyter-renderers-1.3.0, python-envs-1.36.0, h5web-0.2.2, even-better-toml-0.21.2. Before: jupyter-2026.6.2026071001, python-2026.5.2026070801, pylance-2026.2.108, debugpy-2026.7.11831011, remote-ssh-0.125.2026062315 — all pre-release.
- [x] R7: `curl -s https://registry.npmjs.org/@types/vscode` -> `latest` dist-tag = `1.125.0`, no 1.126/1.127/1.128 published; `pixi run npm install` exit 0 and `pixi run npm run compile` exit 0 with engine ^1.127.0. GUARD — `@types/vscode` STAYS at ^1.125.0. This deliberately overrides `.claude/skills/release-orion/SKILL.md:31`, which would break the build.
- [x] R8: `pixi run bump 1.7.0` -> "Bumping version: 1.6.0 -> 1.7.0 / Updated pixi.toml / Updated extensions/orion-launcher/package.json"; `grep -n version pixi.toml` -> `version = "1.7.0"`. "make a new release" — version bumped to 1.7.0.
- [x] R9: `grep -n '1.7.0' CHANGELOG.md` -> `## [1.7.0] - 2026-07-13` heading plus compare link `[1.7.0]: https://github.com/ornlneutronimaging/orion/compare/v1.6.0...v1.7.0`. "make a new release" — CHANGELOG.md entry + compare link.
- [?] R10: "make a new release" — changes land on main via a release PR with CI green (never tag directly on main). CI IS GREEN: `gh run view 29288416461 --json status,conclusion,jobs` -> `{"conclusion":"success", jobs:[{"Build Orion Studio (macos-latest)":"success"},{"Build Orion Studio (ubuntu-latest)":"success"}]}`, plus all 5 PR-validation checks pass. PR: https://github.com/ornlneutronimaging/orion/pull/60. BLOCKED ON USER: only the MERGE remains, and it is gated on R12 — `.claude/skills/release-orion/SKILL.md` states "Never skip the manual test gate — CI does not exercise the launcher, wizard, or platform packaging."
- [?] R11: "make a new release" — tag `v1.7.0` pushed; the release.yml workflow (NOT a manual `gh release create`) creates the GitHub Release with both the macOS DMG and the Linux tar.gz attached. BLOCKED ON USER: tagging is irreversible ("releases are immutable once the workflow runs") and is gated on R10 + R12. Will run `git tag v1.7.0 && git push origin v1.7.0` once you confirm.
- [?] R12: Manual smoke test of the built app passes before tagging. BLOCKED ON USER: only a human can launch the GUI and drive it. CI cannot exercise the wizard, a Jupyter kernel, Remote-SSH, or H5Web — and R6 moves Jupyter back ~10 months (2026.6.x-pre -> 2025.9.1), the single most likely regression in this release. `dist/OrionStudio-macOS.dmg` (406 MB, base 1.127.0) is built and waiting.

## Discovered work (added during implementation; not in the original plan)

- [x] R13: `pixi run build` with NO env var set embeds 1.127.0 (R1). DEVIATION FROM THE APPROVED PLAN, disclosed. Plan said "add an ORION_VSCODE_VERSION env pin; release.yml sets it". Implemented instead as a single `VSCODE_VERSION` constant in build_orion.py pinning EVERY build, with `ORION_VSCODE_VERSION` kept as an override (`=<x.y.z>` or `=latest`). Reason: a version duplicated into release.yml drifts from build_orion.py — the exact failure that let the CHANGELOG claim 1.116.0 while shipping 1.128.0. Also strictly stronger: under the original plan, local and CI builds would still float, so CI would not test the base being released.
- [x] R14: RE-VERIFIED after the R21 fix. `pixi run clean && pixi run build` -> "Build complete", exit 0, all 14 extensions present; guard does not false-positive on `# !excluded` or already-installed deps. Original retraction stands as history: EVIDENCE RETRACTED (see R21) — the guard only covered TOP-LEVEL extensions; the recursive call discarded its return, so 7 of 14 (Pylance, debugpy, renderers, python-envs...) were unguarded. Old evidence: `pixi run clean && pixi run build` -> exit 0, all 7 extensions + deps installed, DMG 406 MB — guard does not false-positive. Guard for a hazard introduced by R6: `install_extensions()` discarded the return of `install_with_dependencies()`, so an unresolvable extension only printed a warning and the build still exited 0 — the release-channel filter could have silently shipped a DMG missing Pylance/Jupyter. The top-level loop now collects failures and raises.
- [x] R15: COMPLETED via R22 (`grep -n "Fetches the pinned\|Downloads the pinned" docs/CI-CD-GUIDE.md docs/QUICKSTART.md` -> both now correct). Original retraction stands as history: EVIDENCE RETRACTED — INCOMPLETE. `docs/CI-CD-GUIDE.md:100` ("Fetches latest stable from Microsoft") and `docs/QUICKSTART.md:51` ("Downloads the latest VS Code") were missed; `git diff docs/` could not catch them because it only shows files already changed. Old evidence: `git diff docs/` -> only version-resolution and settings corrections. Docs my change made false are corrected: ARCHITECTURE.md said "The build script automatically fetches the latest stable VS Code. No manual intervention needed." and documented `get_latest_version()`; DEV_CONTEXT.md said VS Code updates were "Automatic (downloads latest)" and quoted the three old settings.
- [x] R16: `git status --short` -> only the files this release actually changes. Reverted unrelated churn that `pixi run lint` (pre-commit --all-files) introduced into 8 files never edited this session (4 launcher .ts reflowed by prettier, QUICKSTART.md and USER_GUIDE.md by markdownlint, orion-icon.svg trailing newline, bump_version.py f-strings by ruff). Pre-existing violations on main; CI does not run pre-commit.
- [x] R17: `grep -n 'Do NOT bump' .claude/skills/release-orion/SKILL.md` -> "**Do NOT bump `@types/vscode` to match the engine floor.**" Fixed the release skill, whose step at line 31 told the next release to bump `@types/vscode` to match the engine floor — an instruction that would hard-fail `npm install` (R7). Also documents the new `VSCODE_VERSION` pin and adds a pre-flight staged-rollout check. NOTE: `.claude/` is untracked in this repo, so this fix is local-only and is NOT part of PR #60.
- [x] R18: `pixi run python` driving `get_extension_info()` directly -> default `ms-toolsai.jupyter` resolves to `2025.9.1` (newest RELEASE, PASS); `ms-python.python@2026.4.0` pin resolves exactly (PASS); `ms-toolsai.jupyter@2026.6.2026071001` still resolves a PRE-RELEASE with a valid vsix_url (PASS — the escape hatch the CHANGELOG promises is real); `ms-toolsai.jupyter@9999.9.9` returns `None` and prints "Version 9999.9.9 not found" (PASS — fails loudly, no silent `versions[0]` fallback). Verifies the R6 rewrite did not break explicit version pinning.
- [x] R19: RETRACTION RECORDED AND SUPERSEDED BY R20; no further action. `find "$E" -name "*.exe"` -> the only remaining .exe live inside Pylance/debugpy, which are genuinely UNIVERSAL VSIXs (package.json has no targetPlatform) shipping every platform by design, and which now also contain the correct Mach-O arm64 binaries (`file .../pylance-indexer` -> `Mach-O 64-bit executable arm64`). MY CONCLUSION WAS WRONG. I read `targetPlatform` from the INSTALLED package.json (absent there) and concluded the VSIXs were "universal, no wrong-architecture risk". They are not: the DMG contained `pet.exe`, `pylance-indexer.exe` (win32-arm64) and linux `.so` files, and Jupyter had ONLY a win32-x64 zeromq prebuild. I had already seen the linux `.so` files and explained them away. Superseded by R20. Old (wrong) evidence: `python3 -c "import json; json.load(...)"` on the installed `ms-python.debugpy-2026.6.0` and `ms-python.vscode-pylance-2026.2.1` package.json -> both report `targetPlatform: (none/universal)`, so the release-channel builds are universal VSIXs and the switch to full version history cannot select a wrong-architecture package. Platform-specific extensions remain covered by the pre-existing `?targetPlatform=` HEAD-test path (build_orion.py:391-398), which derives the URL from the version STRING, not from which duplicate version entry was selected.

## Findings from independent adversarial review (fresh-context subagent), and their fixes

- [x] R20: FIXED AND VERIFIED. `ls .../ms-toolsai.jupyter-2025.9.1/dist/node_modules/zeromq/prebuilds` -> `darwin-arm64` (was `win32-x64` only — the notebook-kernel killer); `ls .../ms-python.python-2026.4.0/python-env-tools/bin/` -> `pet` and `file` -> `Mach-O 64-bit executable arm64` (was `pet.exe`); `find .../ms-python.debugpy-2026.6.0 -name "*darwin*"` -> `pydevd_cython.cpython-3xx-darwin.so` (was only `x86_64-linux-gnu.so`). CRITICAL, found by review, NOT by me — the build downloaded WRONG-PLATFORM extension
      binaries. The gallery returns a separate version entry per `targetPlatform` for extensions
      shipping native code (Python, Pylance, debugpy, Jupyter); the selection loop ignored
      `targetPlatform` and took an arbitrary one. Verified in the shipped DMG:
      `find dist -name "*.exe"` -> `ms-python.python-2026.4.0/python-env-tools/bin/pet.exe`,
      `ms-python.vscode-pylance-2026.2.1/dist/bundled/bin/win32-arm64/pylance-indexer.exe`; and
      `ls .../ms-toolsai.jupyter-2025.9.1/dist/node_modules/zeromq/prebuilds` -> ONLY `win32-x64`
      (no darwin build => notebook kernels would fail on macOS). The `?targetPlatform=` rescue at
      build_orion.py was dead code: `curl -I` on the gallery -> `HTTP 405`, and the HTTPError was
      swallowed. PRE-EXISTING (main mis-picked too), but this release would have tagged it.
      FIX: `get_target_platform()` computed BEFORE selection; entries filtered to
      `targetPlatform in (this_platform, None)`; VSIX URL taken from the selected entry's
      `files[]`; dead HEAD probe removed. — check: rebuild, then assert zero `.exe` in the DMG and
      a darwin zeromq prebuild present
- [x] R21: FIXED AND VERIFIED. Dependency failure now propagates to the parent (build_orion.py `install_with_dependencies`). `pixi run clean && pixi run build` -> exit 0 with all 14 extensions installed, so the stricter guard does not false-positive on excluded (`# !id`) or already-installed dependencies. HIGH, found by review — the R14 guard only covered TOP-LEVEL extensions. The recursive
      call in `install_with_dependencies` discarded its return value, so a failing dependency
      (Pylance, debugpy, jupyter-renderers, python-envs, remote-explorer... 7 of the 14 bundled
      extensions) still let the parent return True and the build exit 0 with the extension missing.
      FIX: dependency failure now propagates and fails the parent. — check: rebuild exits 0 with
      all 14 extensions present (guard does not false-positive on `# !excluded` or already-installed)
- [x] R22: `grep -n "Fetches the pinned\|Downloads the pinned" docs/CI-CD-GUIDE.md docs/QUICKSTART.md`
      -> CI-CD-GUIDE.md:100 "Fetches the pinned `VSCODE_VERSION` from Microsoft", QUICKSTART.md:51
      "Downloads the pinned VS Code version". Fixes the two docs R15 missed (review finding #3).
- [x] R23: `grep -n "wrong platform\|targetPlatform" CHANGELOG.md` -> new `### Fixed` section in the
      1.7.0 entry documents the wrong-platform download bug AND the build-now-fails-on-unresolvable-
      extension behavior change (review finding #4, which noted the CHANGELOG omitted the latter).
- [x] R24: `pixi run python` driving `get_extension_info()` after the R20 platform filter ->
      default `ms-toolsai.jupyter` -> `2025.9.1` PASS; `ms-python.python@2026.4.0` pin -> exact PASS;
      `ms-toolsai.jupyter@2026.6.2026071001` pre-release escape hatch -> PASS; `@9999.9.9` -> `None`
      ("Version 9999.9.9 not found for ms-toolsai.jupyter on darwin-arm64") PASS. Confirms the
      platform filter did not break explicit `id@version` pinning (R18 re-verified post-fix).
