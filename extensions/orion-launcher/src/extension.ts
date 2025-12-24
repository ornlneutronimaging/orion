import * as vscode from "vscode";
import { OrionWizardPanel } from "./OrionWizardPanel";
import { GitService } from "./GitService";
import { PixiService } from "./PixiService";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as process from "process";
import * as simpleGit from "simple-git";

export interface OrionConfig {
  mode: "EXISTING" | "CLONE" | "EXPRESS";
  targetDir: string;
  branchName?: string;
  enableCopilot?: boolean;
  setupDate?: string;
  shallow?: boolean;
}

// Express setup configuration
const DEFAULT_REPO_URL = "https://github.com/neutronimaging/python_notebooks";
const EXPRESS_TARGET_DIR = path.join(os.homedir(), "orion_notebooks");

export function activate(context: vscode.ExtensionContext) {
  console.log("Orion Launcher is active");

  // Register command to manually open wizard
  context.subscriptions.push(
    vscode.commands.registerCommand("orion-launcher.openWizard", () => {
      OrionWizardPanel.createOrShow(context.extensionUri);
    }),
  );

  // Add Status Bar Item
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.text = "$(rocket) Orion Home";
  statusBarItem.command = "orion-launcher.openWizard";
  statusBarItem.tooltip = "Return to Orion Start Screen";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Check config on startup
  checkConfigAndLaunch(context);
}

async function checkConfigAndLaunch(context: vscode.ExtensionContext) {
  // Skip wizard if already in an Orion workspace
  const currentFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (currentFolder && currentFolder.includes("orion_notebooks")) {
    console.log("Already in Orion workspace, skipping wizard");
    return;
  }

  // Show wizard - let user choose Express or Advanced
  OrionWizardPanel.createOrShow(context.extensionUri);
}

export async function runSetup(
  config: OrionConfig,
  progress: vscode.Progress<{ message?: string; increment?: number }>,
) {
  const isRemote = !!vscode.env.remoteName;

  if (isRemote) {
    // Remote Execution via Terminal
    progress.report({ message: "Starting remote setup..." });

    const terminal = vscode.window.createTerminal("Orion Setup");
    terminal.show();

    // Helper to send command
    const send = (cmd: string) => {
      terminal.sendText(cmd);
    };

    if (config.mode === "CLONE") {
      send(`echo "Cloning repository..."`);
      const repoUrl = DEFAULT_REPO_URL;

      // Robust Clone Logic:
      // 1. If dir doesn't exist OR is empty -> Clone
      // 2. If dir exists and is a valid git repo -> Skip
      // 3. Otherwise -> Warn/Fail
      const cloneCmd = `if [ ! -d "${config.targetDir}" ] || [ -z "$(ls -A "${config.targetDir}")" ]; then git clone "${repoUrl}" "${config.targetDir}"; elif git -C "${config.targetDir}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then echo "Directory exists and is a valid git repository. Skipping clone."; else echo "Error: Target directory exists, is not empty, and is not a git repository."; fi`;
      send(cloneCmd);

      if (config.branchName) {
        send(`cd "${config.targetDir}"`);
        // Try create branch, if fails (exists), checkout it
        send(
          `git checkout -b "${config.branchName}" || git checkout "${config.branchName}"`,
        );
      }
    }

    send(`echo "Checking for Pixi..."`);
    // Basic check and install for Linux (assuming remote is Linux)
    send(
      `if ! command -v pixi &> /dev/null; then curl -fsSL https://pixi.sh/install.sh | bash; export PATH="$HOME/.pixi/bin:$PATH"; fi`,
    );

    send(`echo "Setting up environment..."`);
    send(`cd "${config.targetDir}" && pixi install`);

    // Note: Extensions are installed via remote.SSH.defaultExtensions setting.
    // We just wait a bit to ensure everything is ready.

    send(`echo "Setup complete. Opening folder..."`);
    // Attempt to open the folder in the same window
    // Add a small delay to ensure extensions are registered
    send(`sleep 5 && code -r "${config.targetDir}"`);

    vscode.window.showInformationMessage(
      "Setup commands sent to terminal. It should open automatically. If not, run 'code -r .' in the terminal.",
    );
    return true;
  } else {
    // Local Execution (Existing Logic)
    const gitService = new GitService();
    const pixiService = new PixiService();

    try {
      if (config.mode === "CLONE" || config.mode === "EXPRESS") {
        const isExpress = config.mode === "EXPRESS";
        progress.report({
          message: isExpress
            ? "Cloning notebooks (express mode)..."
            : "Cloning repository...",
        });
        await gitService.clone(
          DEFAULT_REPO_URL,
          config.targetDir,
          config.branchName,
          config.shallow,
        );
      }

      progress.report({ message: "Checking Pixi..." });
      await pixiService.checkAndInstall();

      progress.report({ message: "Setting up environment..." });
      try {
        await pixiService.runInstall(config.targetDir);
      } catch (e) {
        // Warn but proceed
        vscode.window.showWarningMessage(
          `Pixi environment setup failed: ${e}. Proceeding to open workspace...`,
        );
        console.warn("Pixi install failed", e);
      }

      // Note: Extensions are now handled by remote.SSH.defaultExtensions setting

      return true;
    } catch (e) {
      vscode.window.showErrorMessage(`Setup failed: ${e}`);
      return false;
    }
  }
}

/**
 * Express setup - one-click setup with sensible defaults.
 * If repo exists: refresh to latest and create new session branch.
 * If first time: full clone and create session branch.
 */
export async function runExpressSetup(): Promise<boolean> {
  const targetDir = EXPRESS_TARGET_DIR;
  const repoUrl = DEFAULT_REPO_URL;

  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Orion Express Setup",
      cancellable: false,
    },
    async (progress) => {
      try {
        const gitService = new GitService();
        const pixiService = new PixiService();
        let branchName: string;

        const repoExists = fs.existsSync(path.join(targetDir, ".git"));

        if (repoExists) {
          // Existing repo: refresh and create new session branch
          progress.report({ message: "Refreshing notebooks to latest..." });
          branchName = await gitService.refreshRepository(targetDir);
          progress.report({
            message: `Created session branch: ${branchName}`,
          });
        } else {
          // First time: clone (full, not shallow)
          progress.report({
            message:
              "First time setup - cloning notebooks (this may take a moment)...",
          });
          await gitService.clone(repoUrl, targetDir);

          // Create session branch after clone
          const username = process.env.USER || process.env.USERNAME || "user";
          const timestamp = new Date()
            .toISOString()
            .replace(/[-:]/g, "")
            .replace("T", "-")
            .slice(0, 15);
          branchName = `${username}-session-${timestamp}`;

          const git = simpleGit.simpleGit({ baseDir: targetDir });
          await git.checkoutLocalBranch(branchName);
        }

        // Install/update pixi environment
        progress.report({ message: "Checking Pixi installation..." });
        await pixiService.checkAndInstall();

        progress.report({ message: "Setting up Python environment..." });
        try {
          await pixiService.runInstall(targetDir);
        } catch (e) {
          // Warn but proceed
          vscode.window.showWarningMessage(
            `Pixi environment setup failed: ${e}. Proceeding to open workspace...`,
          );
          console.warn("Pixi install failed", e);
        }

        // Save config for logging/debugging
        const config: OrionConfig = {
          mode: "EXPRESS",
          targetDir,
          branchName,
          setupDate: new Date().toISOString(),
        };
        await saveConfig(config);

        // Open workspace
        progress.report({ message: "Opening workspace..." });
        vscode.window.showInformationMessage(
          `Express setup complete! Session branch: ${branchName}`,
        );
        const uri = vscode.Uri.file(targetDir);
        await vscode.commands.executeCommand("vscode.openFolder", uri, false);

        return true;
      } catch (error) {
        vscode.window.showErrorMessage(
          `Express setup failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        return false;
      }
    },
  );
}

/**
 * Save Orion configuration to ~/.orion-studio/config.json
 */
async function saveConfig(config: OrionConfig): Promise<void> {
  const orionDir = path.join(os.homedir(), ".orion-studio");
  if (!fs.existsSync(orionDir)) {
    fs.mkdirSync(orionDir, { recursive: true });
  }
  const configPath = path.join(orionDir, "config.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
