import * as vscode from 'vscode';
import { OrionWizardPanel } from './OrionWizardPanel';
import { GitService } from './GitService';
import { PixiService } from './PixiService';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

            // If we are not in the target workspace, open it
            if (config.targetDir) {
                const currentFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (currentFolder !== config.targetDir) {
                    const uri = vscode.Uri.file(config.targetDir);
                    vscode.commands.executeCommand('vscode.openFolder', uri);
                }
            }
        } catch (e) {
            console.error('Failed to read config', e);
            OrionWizardPanel.createOrShow(context.extensionUri);
        }
    }
}

export async function runSetup(config: any, progress: vscode.Progress<{ message?: string; increment?: number }>) {
    const gitService = new GitService();
    const pixiService = new PixiService();

    try {
        if (config.mode === 'CLONE') {
            progress.report({ message: 'Cloning repository...' });
            // TODO: Make repo configurable or constant
            const repoUrl = "https://github.com/neutronimaging/python_notebooks";
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

        return true;
    } catch (e) {
        vscode.window.showErrorMessage(`Setup failed: ${e}`);
        return false;
    }
}

export function deactivate() { }
