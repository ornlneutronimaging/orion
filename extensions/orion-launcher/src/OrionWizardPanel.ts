import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class OrionWizardPanel {
    public static currentPanel: OrionWizardPanel | undefined;
    public static readonly viewType = 'orionWizard';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (OrionWizardPanel.currentPanel) {
            OrionWizardPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            OrionWizardPanel.viewType,
            'Orion Studio Setup',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'out')
                ]
            }
        );

        OrionWizardPanel.currentPanel = new OrionWizardPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showErrorMessage(message.text);
                        return;
                    case 'saveConfig':
                        this._saveConfig(message.config);
                        return;
                    case 'selectFolder':
                        this._selectFolder();
                        return;
                    case 'connectRemote':
                        this._connectRemote(message.host);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    private async _connectRemote(host: string) {
        // Open a new window with the remote authority
        // We use the 'vscode.newWindow' command with the remoteAuthority option
        // The format for ssh remote is 'ssh-remote+<host>'
        try {
            await vscode.commands.executeCommand('vscode.newWindow', {
                remoteAuthority: `ssh-remote+${host}`,
                reuseWindow: true
            });
            // Close the wizard as we are moving to a new window
            this.dispose();
        } catch (e) {
            vscode.window.showErrorMessage(`Failed to connect to ${host}: ${e}`);
        }
    }

    private async _selectFolder() {
        const options: vscode.OpenDialogOptions = {
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Folder'
        };

        const folderUri = await vscode.window.showOpenDialog(options);
        if (folderUri && folderUri[0]) {
            this._panel.webview.postMessage({ command: 'folderSelected', path: folderUri[0].fsPath });
        }
    }

    private async _saveConfig(config: any) {
        const homeDir = os.homedir();
        const orionDir = path.join(homeDir, '.orion');
        if (!fs.existsSync(orionDir)) {
            fs.mkdirSync(orionDir);
        }

        // If cloning, append the subdirectory to the targetDir
        if (config.mode === 'CLONE') {
            config.targetDir = path.join(config.targetDir, 'neutron_notebooks');
        }

        const configPath = path.join(orionDir, 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        // Close wizard immediately
        this.dispose();

        // Run Setup with Progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Setting up Orion Studio",
            cancellable: false
        }, async (progress) => {
            const { runSetup } = await import('./extension');
            // Cast config to any to avoid type issues with dynamic import
            const success = await runSetup(config, progress);

            if (success) {
                vscode.window.showInformationMessage('Setup complete! Opening workspace...');
                if (config.targetDir) {
                    let uri: vscode.Uri;
                    if (vscode.env.remoteName) {
                        // Construct remote URI
                        // Use 'as any' to access remoteAuthority if not in type definitions, or check if it exists on env
                        const authority = (vscode.env as any).remoteAuthority;
                        if (authority) {
                            uri = vscode.Uri.from({
                                scheme: 'vscode-remote',
                                authority: authority,
                                path: config.targetDir
                            });
                        } else {
                            // Fallback if authority is missing (shouldn't happen in remote)
                            uri = vscode.Uri.file(config.targetDir);
                        }
                    } else {
                        uri = vscode.Uri.file(config.targetDir);
                    }
                    vscode.commands.executeCommand('vscode.openFolder', uri);
                }
            }
        });
    }

    public dispose() {
        OrionWizardPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();
        const isRemote = !!vscode.env.remoteName;

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Orion Studio Setup</title>
                <style>
                    body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-editor-foreground); background-color: var(--vscode-editor-background); }
                    .container { max-width: 600px; margin: 0 auto; }
                    h1 { text-align: center; }
                    .step { display: none; }
                    .step.active { display: block; }
                    .btn { 
                        background-color: var(--vscode-button-background); 
                        color: var(--vscode-button-foreground); 
                        border: none; padding: 10px 20px; cursor: pointer; 
                        width: 100%; margin-bottom: 10px;
                        font-size: 1.1em;
                    }
                    .btn:hover { background-color: var(--vscode-button-hoverBackground); }
                    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
                    .btn-secondary { background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
                    .btn-secondary:hover { background-color: var(--vscode-button-secondaryHoverBackground); }
                    
                    .input-group { margin-bottom: 15px; }
                    label { display: block; margin-bottom: 5px; }
                    input[type="text"] { 
                        width: 100%; padding: 8px; 
                        background-color: var(--vscode-input-background); 
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                    }
                    .radio-group { margin-bottom: 15px; }
                    .radio-group label { display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 5px; }
                    .radio-group label:hover { background-color: var(--vscode-list-hoverBackground); }
                </style>
			</head>
			<body>
                <div class="container">
                    <!-- Step 1: Welcome -->
                    <div id="step-1" class="step">
                        <h1>Welcome to ORION Studio</h1>
                        <p style="text-align: center; margin-bottom: 30px;">Select your working mode:</p>
                        <button class="btn" onclick="nextStep(2)">Data Reduction Locally</button>
                        <button class="btn btn-secondary" onclick="nextStep('remote')">Connect to Analysis Cluster</button>
                    </div>

                    <!-- Step Remote: Host Selection -->
                    <div id="step-remote" class="step">
                        <h1>Connect to Cluster</h1>
                        <p>Select the analysis node to connect to:</p>
                        
                        <div class="radio-group">
                            <label>
                                <input type="radio" name="host" value="bl10-analysis1.sns.gov" checked onchange="toggleCustomHost()">
                                <div>
                                    <strong>bl10-analysis1.sns.gov</strong> (Default)
                                    <div style="font-size: 0.8em; opacity: 0.8;">Requires ORNL Network Connection</div>
                                </div>
                            </label>
                            <label>
                                <input type="radio" name="host" value="analysis.sns.gov" onchange="toggleCustomHost()">
                                <div>
                                    <strong>analysis.sns.gov</strong>
                                    <div style="font-size: 0.8em; opacity: 0.8;">Load Balancer</div>
                                </div>
                            </label>
                            <label>
                                <input type="radio" name="host" value="custom" onchange="toggleCustomHost()">
                                <strong>Custom Host</strong>
                            </label>
                        </div>

                        <div id="custom-host-input" class="input-group" style="display: none;">
                            <label>Hostname</label>
                            <input type="text" id="customHost" placeholder="e.g. user@host.ornl.gov">
                        </div>

                        <button class="btn" onclick="connectRemote()">Connect</button>
                        <button class="btn btn-secondary" onclick="prevStep(1)">Back</button>
                    </div>

                    <!-- Step 2: Action -->
                    <div id="step-2" class="step">
                        <h1>Setup Workspace</h1>
                        <p id="remote-indicator" style="text-align: center; color: var(--vscode-descriptionForeground); display: none;">Connected to Remote Environment</p>
                        <button class="btn" onclick="setMode('EXISTING'); nextStep(3)">Open Existing Notebooks</button>
                        <button class="btn" onclick="setMode('CLONE'); nextStep(3)">Clone Fresh Copy</button>
                        <button class="btn btn-secondary" onclick="prevStep(1)" id="back-to-welcome">Back</button>
                    </div>

                    <!-- Step 3: Configuration -->
                    <div id="step-3" class="step">
                        <h1>Configuration</h1>
                        
                        <div class="input-group">
                            <label>Target Folder</label>
                            <div style="display: flex; gap: 10px;">
                                <input type="text" id="targetDir" readonly placeholder="Select a folder...">
                                <button id="browse-btn" class="btn" style="width: auto;" onclick="selectFolder()">Browse</button>
                            </div>
                        </div>

                        <div id="clone-options" style="display: none;">
                            <div class="input-group">
                                <label>Branch Name</label>
                                <input type="text" id="branchName" value="analysis-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}">
                            </div>
                        </div>

                        <div class="input-group">
                            <label>
                                <input type="checkbox" id="enableCopilot" checked> Enable GitHub Copilot
                            </label>
                        </div>

                        <button class="btn" onclick="finishSetup()">Start Orion Studio</button>
                        <button class="btn btn-secondary" onclick="prevStep(2)">Back</button>
                    </div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    let currentMode = '';
                    const isRemote = ${isRemote};

                    // Initial State
                    if (isRemote) {
                        document.getElementById('step-2').classList.add('active');
                        document.getElementById('remote-indicator').style.display = 'block';
                        document.getElementById('back-to-welcome').style.display = 'none'; 
                        // Keep Browse button visible as it works with remote context
                        // document.getElementById('browse-btn').style.display = 'none'; 
                        document.getElementById('targetDir').readOnly = false; // Allow typing
                        document.getElementById('targetDir').placeholder = "Enter absolute path (e.g. /SNS/users/...)";
                    } else {
                        document.getElementById('step-1').classList.add('active');
                    }

                    function nextStep(step) {
                        document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
                        document.getElementById('step-' + step).classList.add('active');
                    }

                    function prevStep(step) {
                        nextStep(step);
                    }

                    function setMode(mode) {
                        currentMode = mode;
                        document.getElementById('clone-options').style.display = mode === 'CLONE' ? 'block' : 'none';
                    }

                    function selectFolder() {
                        vscode.postMessage({ command: 'selectFolder' });
                    }

                    function toggleCustomHost() {
                        const isCustom = document.querySelector('input[name="host"][value="custom"]').checked;
                        document.getElementById('custom-host-input').style.display = isCustom ? 'block' : 'none';
                    }

                    function connectRemote() {
                        let host = document.querySelector('input[name="host"]:checked').value;
                        if (host === 'custom') {
                            host = document.getElementById('customHost').value;
                        }
                        
                        if (!host) {
                            vscode.postMessage({ command: 'alert', text: 'Please specify a hostname.' });
                            return;
                        }

                        vscode.postMessage({ command: 'alert', text: 'Connecting to ' + host + '...' });
                        vscode.postMessage({ command: 'connectRemote', host: host });
                    }

                    function finishSetup() {
                        const config = {
                            mode: currentMode,
                            targetDir: document.getElementById('targetDir').value,
                            branchName: document.getElementById('branchName').value,
                            enableCopilot: document.getElementById('enableCopilot').checked,
                            setupDate: new Date().toISOString()
                        };
                        
                        if (!config.targetDir) {
                            vscode.postMessage({ command: 'alert', text: 'Please select a target folder.' });
                            return;
                        }

                        vscode.postMessage({ command: 'saveConfig', config: config });
                    }

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.command) {
                            case 'folderSelected':
                                document.getElementById('targetDir').value = message.path;
                                break;
                        }
                    });
                </script>
			</body>
			</html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
