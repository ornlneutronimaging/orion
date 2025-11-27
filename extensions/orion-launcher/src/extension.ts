import * as vscode from 'vscode';
import { OrionWizardPanel } from './OrionWizardPanel';
import { GitService } from './GitService';
import { PixiService } from './PixiService';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface OrionConfig {
    mode: 'EXISTING' | 'CLONE';
    targetDir: string;
    branchName?: string;
    enableCopilot?: boolean;
    setupDate?: string;
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Orion Launcher is active');

    // Register command to manually open wizard
    context.subscriptions.push(
        vscode.commands.registerCommand('orion-launcher.openWizard', () => {
            OrionWizardPanel.createOrShow(context.extensionUri);
        })
    );

    // Add Status Bar Item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(rocket) Orion Home";
    statusBarItem.command = "orion-launcher.openWizard";
    statusBarItem.tooltip = "Return to Orion Start Screen";
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Check config on startup
    checkConfigAndLaunch(context);
}

async function checkConfigAndLaunch(context: vscode.ExtensionContext) {
    const homeDir = os.homedir();
    const configPath = path.join(homeDir, '.orion', 'config.json');

    if (!fs.existsSync(configPath)) {
        // No config, show wizard
        OrionWizardPanel.createOrShow(context.extensionUri);
    } else {
        console.log('Orion config found at ' + configPath);

        try {
            const config: OrionConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

            // If we are not in the target workspace, open it
            if (config.targetDir) {
                const currentFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (currentFolder !== config.targetDir) {
                    if (fs.existsSync(config.targetDir)) {
                        const uri = vscode.Uri.file(config.targetDir);
                        vscode.commands.executeCommand('vscode.openFolder', uri);
                    } else {
                        console.log(`Target directory ${config.targetDir} does not exist. Starting wizard.`);
                        OrionWizardPanel.createOrShow(context.extensionUri);
                    }
                }
            } else {
                // No target dir in config, show wizard
                OrionWizardPanel.createOrShow(context.extensionUri);
            }
        } catch (e) {
            console.error('Failed to read config', e);
            OrionWizardPanel.createOrShow(context.extensionUri);
        }
    }
}

export async function runSetup(config: OrionConfig, progress: vscode.Progress<{ message?: string; increment?: number }>) {
    const isRemote = !!vscode.env.remoteName;
    // Default repository URL
    const DEFAULT_REPO_URL = "https://github.com/neutronimaging/python_notebooks";

    if (isRemote) {
        // Remote Execution via Terminal
        progress.report({ message: 'Starting remote setup...' });

        const terminal = vscode.window.createTerminal("Orion Setup");
        terminal.show();

        // Helper to send command
        const send = (cmd: string) => {
            terminal.sendText(cmd);
        };

        if (config.mode === 'CLONE') {
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
                send(`git checkout -b "${config.branchName}" || git checkout "${config.branchName}"`);
            }
        }

        send(`echo "Checking for Pixi..."`);
        // Basic check and install for Linux (assuming remote is Linux)
        send(`if ! command -v pixi &> /dev/null; then curl -fsSL https://pixi.sh/install.sh | bash; export PATH="$HOME/.pixi/bin:$PATH"; fi`);

        send(`echo "Setting up environment..."`);
        send(`cd "${config.targetDir}" && pixi install`);

        // Note: Extensions are installed via remote.SSH.defaultExtensions setting.
        // We just wait a bit to ensure everything is ready.

        send(`echo "Setup complete. Opening folder..."`);
        // Attempt to open the folder in the same window
        // Add a small delay to ensure extensions are registered
        send(`sleep 5 && code -r "${config.targetDir}"`);

        vscode.window.showInformationMessage("Setup commands sent to terminal. It should open automatically. If not, run 'code -r .' in the terminal.");
        return true;

    } else {
        // Local Execution (Existing Logic)
        const gitService = new GitService();
        const pixiService = new PixiService();

        try {
            if (config.mode === 'CLONE') {
                progress.report({ message: 'Cloning repository...' });
                const repoUrl = DEFAULT_REPO_URL;
                await gitService.clone(repoUrl, config.targetDir, config.branchName);
            }

            progress.report({ message: 'Checking Pixi...' });
            await pixiService.checkAndInstall();

            progress.report({ message: 'Setting up environment...' });
            try {
                await pixiService.runInstall(config.targetDir);
            } catch (e) {
                // Warn but proceed
                vscode.window.showWarningMessage(`Pixi environment setup failed: ${e}. Proceeding to open workspace...`);
                console.warn('Pixi install failed', e);
            }

            // Note: Extensions are now handled by remote.SSH.defaultExtensions setting

            return true;
        } catch (e) {
            vscode.window.showErrorMessage(`Setup failed: ${e}`);
            return false;
        }
    }
}

