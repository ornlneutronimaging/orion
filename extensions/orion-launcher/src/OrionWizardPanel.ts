import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  REPOSITORY_REGISTRY,
  getRepositoryStatus,
  Repository,
  RepositoryStatus,
} from "./extension";

/**
 * Status data for a repository, used for UI display.
 */
interface RepoStatusData {
  repo: Repository;
  status: RepositoryStatus;
  untrackedCount?: number;
}

/**
 * Escape special characters for use in HTML attribute values.
 */
function escapeHtmlAttr(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "&#10;");
}

export class OrionWizardPanel {
  public static currentPanel: OrionWizardPanel | undefined;
  public static readonly viewType = "orionWizard";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _repoStatuses: RepoStatusData[];
  private _disposables: vscode.Disposable[] = [];

  public static async createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it.
    if (OrionWizardPanel.currentPanel) {
      OrionWizardPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Fetch status for all repositories before creating panel
    const repoStatuses: RepoStatusData[] = await Promise.all(
      REPOSITORY_REGISTRY.map(async (repo) => {
        const statusResult = await getRepositoryStatus(repo);
        return {
          repo,
          status: statusResult.status,
          untrackedCount: statusResult.untrackedCount,
        };
      })
    );

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      OrionWizardPanel.viewType,
      "Orion Studio Setup",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, "media"),
          vscode.Uri.joinPath(extensionUri, "out"),
        ],
      },
    );

    OrionWizardPanel.currentPanel = new OrionWizardPanel(panel, extensionUri, repoStatuses);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    repoStatuses: RepoStatusData[]
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._repoStatuses = repoStatuses;

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programmatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "alert":
            vscode.window.showErrorMessage(message.text);
            return;
          case "expressSetup":
            this.dispose();
            const { runExpressSetup } = await import("./extension");
            // Pass the repository ID from the UI button clicked
            await runExpressSetup(message.repoId);
            return;
          case "saveConfig":
            this._saveConfig(message.config);
            return;
          case "selectFolder":
            this._selectFolder();
            return;
          case "connectRemote":
            this._connectRemote(message.host);
            return;
        }
      },
      null,
      this._disposables,
    );
  }

  private async _connectRemote(host: string) {
    // Open a new window with the remote authority
    // We use the 'vscode.newWindow' command with the remoteAuthority option
    // The format for ssh remote is 'ssh-remote+<host>'
    try {
      await vscode.commands.executeCommand("vscode.newWindow", {
        remoteAuthority: `ssh-remote+${host}`,
        reuseWindow: true,
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
      openLabel: "Select Folder",
    };

    const folderUri = await vscode.window.showOpenDialog(options);
    if (folderUri && folderUri[0]) {
      this._panel.webview.postMessage({
        command: "folderSelected",
        path: folderUri[0].fsPath,
      });
    }
  }

  private async _saveConfig(config: any) {
    const homeDir = os.homedir();
    const orionDir = path.join(homeDir, ".orion-studio");
    if (!fs.existsSync(orionDir)) {
      fs.mkdirSync(orionDir);
    }

    // targetDir is now set directly from registry or user input (no subdirectory appending)

    const configPath = path.join(orionDir, "config.json");
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Close wizard immediately
    this.dispose();

    // Run Setup with Progress
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Setting up Orion Studio",
        cancellable: false,
      },
      async (progress) => {
        const { runSetup } = await import("./extension");
        // Cast config to any to avoid type issues with dynamic import
        const success = await runSetup(config, progress);

        if (success) {
          vscode.window.showInformationMessage(
            "Setup complete! Opening workspace...",
          );
          if (config.targetDir) {
            let uri: vscode.Uri;
            if (vscode.env.remoteName) {
              // Construct remote URI
              // Use 'as any' to access remoteAuthority if not in type definitions, or check if it exists on env
              const authority = (vscode.env as any).remoteAuthority;
              if (authority) {
                uri = vscode.Uri.from({
                  scheme: "vscode-remote",
                  authority: authority,
                  path: config.targetDir,
                });
              } else {
                // Fallback if authority is missing (shouldn't happen in remote)
                uri = vscode.Uri.file(config.targetDir);
              }
            } else {
              uri = vscode.Uri.file(config.targetDir);
            }
            vscode.commands.executeCommand("vscode.openFolder", uri);
          }
        }
      },
    );
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

  /**
   * Generate HTML for the Express setup buttons with status indicators.
   */
  private _generateExpressButtonsHtml(): string {
    return this._repoStatuses
      .map(({ repo, status, untrackedCount }) => {
        const statusClass =
          status === "ready"
            ? "status-ready"
            : status === "has-changes"
              ? "status-has-changes"
              : "status-missing";

        const statusTooltip =
          status === "ready"
            ? "Ready — no unsaved work"
            : status === "has-changes"
              ? `Has unsaved notebooks: ${untrackedCount} file${untrackedCount !== 1 ? "s" : ""} — these will be preserved`
              : "Not set up — will download on first use";

        // Combine repo description with status for button tooltip
        const buttonTooltip = `${repo.description}\n\nStatus: ${statusTooltip}`;

        return `
          <button
            class="btn-express"
            onclick="startExpressSetup('${repo.id}')"
            title="${escapeHtmlAttr(buttonTooltip)}"
          >
            <span class="status-indicator ${statusClass}" title="${escapeHtmlAttr(statusTooltip)}"></span>
            ${repo.displayName}
          </button>
        `;
      })
      .join("");
  }

  /**
   * Generate HTML options for the repository dropdown in Advanced mode.
   */
  private _generateRepoOptionsHtml(): string {
    const repoOptions = this._repoStatuses
      .map(({ repo }) => `<option value="${repo.id}">${repo.displayName}</option>`)
      .join("");
    return repoOptions + '<option value="custom">Custom URL</option>';
  }

  /**
   * Serialize repository registry data for JavaScript access.
   */
  private _getRepoRegistryJson(): string {
    const registryData = this._repoStatuses.map(({ repo }) => ({
      id: repo.id,
      displayName: repo.displayName,
      url: repo.url,
      targetDir: repo.targetDir,
    }));
    return JSON.stringify(registryData);
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
                    h2 { margin-bottom: 8px; }
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

                    /* Primary large button for Express setup */
                    .btn-primary-large {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 18px 40px;
                        cursor: pointer;
                        font-size: 1.4em;
                        font-weight: 600;
                        border-radius: 6px;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                    }
                    .btn-primary-large:hover { background-color: var(--vscode-button-hoverBackground); }
                    .btn-primary-large:disabled { opacity: 0.5; cursor: not-allowed; }

                    /* Split Express buttons container */
                    .express-buttons {
                        display: flex;
                        gap: 12px;
                        justify-content: center;
                        margin-bottom: 16px;
                    }

                    /* Individual Express button */
                    .btn-express {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 14px 24px;
                        cursor: pointer;
                        font-size: 1.1em;
                        font-weight: 500;
                        border-radius: 6px;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                        min-width: 160px;
                        transition: background-color 0.15s ease;
                    }
                    .btn-express:hover { background-color: var(--vscode-button-hoverBackground); }
                    .btn-express:disabled { opacity: 0.5; cursor: not-allowed; }

                    /* Status indicator circle */
                    .status-indicator {
                        width: 10px;
                        height: 10px;
                        border-radius: 50%;
                        flex-shrink: 0;
                        pointer-events: none;
                    }
                    .status-ready { background-color: #22c55e; }
                    .status-has-changes { background-color: #f97316; }
                    .status-missing { background-color: #9ca3af; }

                    /* Link-style button for Advanced setup */
                    .btn-link {
                        background: none;
                        border: none;
                        color: var(--vscode-textLink-foreground);
                        cursor: pointer;
                        font-size: 1em;
                        padding: 8px 0;
                        text-decoration: none;
                    }
                    .btn-link:hover {
                        color: var(--vscode-textLink-activeForeground);
                        text-decoration: underline;
                    }

                    .input-group { margin-bottom: 15px; }
                    label { display: block; margin-bottom: 5px; }
                    input[type="text"] {
                        width: 100%; padding: 8px;
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                    }
                    select {
                        width: 100%; padding: 8px;
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                        cursor: pointer;
                    }
                    select:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }
                    .radio-group { margin-bottom: 15px; }
                    .radio-group label { display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 5px; }
                    .radio-group label:hover { background-color: var(--vscode-list-hoverBackground); }

                    /* Welcome screen layout */
                    .welcome-container {
                        text-align: center;
                        padding-top: 20px;
                    }
                    .welcome-container h1 {
                        margin-bottom: 8px;
                    }
                    .subtitle {
                        opacity: 0.7;
                        margin-bottom: 40px;
                        font-size: 1.1em;
                    }

                    /* Primary action (Express) */
                    .primary-action {
                        margin-bottom: 50px;
                    }
                    .action-description {
                        margin-top: 12px;
                        opacity: 0.7;
                        font-size: 0.95em;
                    }

                    /* Secondary action (Advanced) */
                    .secondary-action {
                        padding-top: 20px;
                        border-top: 1px solid var(--vscode-panel-border);
                    }
                    .action-description-small {
                        margin-top: 8px;
                        opacity: 0.6;
                        font-size: 0.85em;
                    }

                    /* Legacy setup-section styles (for other steps) */
                    .setup-section {
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 6px;
                        padding: 20px;
                        margin-bottom: 15px;
                    }
                    .setup-section p {
                        margin: 0 0 15px 0;
                        opacity: 0.8;
                        font-size: 0.95em;
                    }
                    .setup-section .btn { margin-bottom: 0; }
                    .divider {
                        text-align: center;
                        margin: 20px 0;
                        opacity: 0.6;
                        font-size: 0.9em;
                    }
                    .loading-overlay {
                        display: none;
                        position: fixed;
                        top: 0; left: 0; right: 0; bottom: 0;
                        background: rgba(0,0,0,0.7);
                        justify-content: center;
                        align-items: center;
                        flex-direction: column;
                        z-index: 1000;
                    }
                    .loading-overlay.active { display: flex; }
                    .spinner {
                        width: 40px; height: 40px;
                        border: 3px solid var(--vscode-editor-foreground);
                        border-top-color: transparent;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-bottom: 15px;
                    }
                    @keyframes spin { to { transform: rotate(360deg); } }
                </style>
			</head>
			<body>
                <!-- Loading Overlay -->
                <div id="loading-overlay" class="loading-overlay">
                    <div class="spinner"></div>
                    <div>Setting up Orion Studio...</div>
                </div>

                <div class="container">
                    <!-- Step 1: Welcome -->
                    <div id="step-1" class="step">
                        <div class="welcome-container">
                            <h1>Welcome to Orion Studio</h1>
                            <p class="subtitle">Neutron Imaging Notebook Environment</p>

                            <div class="primary-action">
                                <p style="margin-bottom: 16px; font-weight: 500;">Express Setup</p>
                                <div class="express-buttons">
                                    ${this._generateExpressButtonsHtml()}
                                </div>
                                <p class="action-description">
                                    Opens a fresh notebook environment ready to use
                                </p>
                            </div>

                            <div class="secondary-action">
                                <button class="btn-link" onclick="nextStep('advanced')">
                                    Advanced Setup →
                                </button>
                                <p class="action-description-small">
                                    Configure location, branch, or connect to remote cluster
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Step Advanced: Local or Remote -->
                    <div id="step-advanced" class="step">
                        <h1>Setup Mode</h1>
                        <p style="text-align: center; margin-bottom: 30px;">Select your working mode:</p>
                        <button class="btn" onclick="nextStep(2)">Data Reduction Locally</button>
                        <button class="btn btn-secondary" onclick="nextStep('remote')">Connect to Analysis Cluster</button>
                        <button class="btn btn-secondary" onclick="prevStep(1)" style="margin-top: 10px;">Back</button>
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
                        <button class="btn btn-secondary" onclick="prevStep('advanced')">Back</button>
                    </div>

                    <!-- Step 2: Action -->
                    <div id="step-2" class="step">
                        <h1>Setup Workspace</h1>
                        <p id="remote-indicator" style="text-align: center; color: var(--vscode-descriptionForeground); display: none;">Connected to Remote Environment</p>
                        <button class="btn" onclick="setMode('EXISTING'); nextStep(3)">Open Existing Notebooks</button>
                        <button class="btn" onclick="setMode('CLONE'); nextStep(3)">Clone Fresh Copy</button>
                        <button class="btn btn-secondary" onclick="prevStep('advanced')" id="back-to-welcome">Back</button>
                    </div>

                    <!-- Step 3: Configuration -->
                    <div id="step-3" class="step">
                        <h1>Configuration</h1>

                        <div id="clone-options" style="display: none;">
                            <div class="input-group">
                                <label>Repository</label>
                                <select id="repoSelect" onchange="onRepoSelectChange()">
                                    ${this._generateRepoOptionsHtml()}
                                </select>
                            </div>

                            <div id="custom-url-group" class="input-group" style="display: none;">
                                <label>Repository URL</label>
                                <input type="text" id="customRepoUrl" placeholder="https://github.com/...">
                            </div>

                            <div class="input-group">
                                <label>Branch Name</label>
                                <input type="text" id="branchName" value="analysis-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}">
                            </div>
                        </div>

                        <div class="input-group">
                            <label>Target Folder</label>
                            <div id="target-dir-container" style="display: flex; gap: 10px;">
                                <input type="text" id="targetDir" readonly placeholder="Select a folder...">
                                <button id="browse-btn" class="btn" style="width: auto;" onclick="selectFolder()">Browse</button>
                            </div>
                            <p id="target-dir-hint" style="margin-top: 5px; font-size: 0.85em; opacity: 0.7; display: none;">
                                Auto-filled from repository selection
                            </p>
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

                    // Repository registry data for auto-fill
                    const repoRegistry = ${this._getRepoRegistryJson()};

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

                    function startExpressSetup(repoId) {
                        // Show loading overlay
                        document.getElementById('loading-overlay').classList.add('active');
                        // Disable all express buttons
                        document.querySelectorAll('.btn-express').forEach(btn => btn.disabled = true);
                        // Send message to extension with the repository ID
                        vscode.postMessage({ command: 'expressSetup', repoId: repoId });
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

                        if (mode === 'CLONE') {
                            // Initialize repo selection to first option and auto-fill
                            document.getElementById('repoSelect').value = repoRegistry[0].id;
                            onRepoSelectChange();
                        } else {
                            // For EXISTING mode, enable manual folder selection
                            document.getElementById('targetDir').readOnly = isRemote ? false : true;
                            document.getElementById('targetDir').value = '';
                            document.getElementById('browse-btn').style.display = 'inline-block';
                            document.getElementById('target-dir-hint').style.display = 'none';
                        }
                    }

                    function onRepoSelectChange() {
                        const repoSelect = document.getElementById('repoSelect');
                        const selectedValue = repoSelect.value;
                        const customUrlGroup = document.getElementById('custom-url-group');
                        const targetDirInput = document.getElementById('targetDir');
                        const browseBtn = document.getElementById('browse-btn');
                        const targetDirHint = document.getElementById('target-dir-hint');

                        if (selectedValue === 'custom') {
                            // Custom URL mode: show URL field, enable folder browsing
                            customUrlGroup.style.display = 'block';
                            targetDirInput.value = '';
                            targetDirInput.readOnly = isRemote ? false : true;
                            targetDirInput.placeholder = 'Select a folder...';
                            browseBtn.style.display = 'inline-block';
                            targetDirHint.style.display = 'none';
                        } else {
                            // Registered repo: hide URL field, auto-fill target directory
                            customUrlGroup.style.display = 'none';
                            const repo = repoRegistry.find(r => r.id === selectedValue);
                            if (repo) {
                                targetDirInput.value = repo.targetDir;
                                targetDirInput.readOnly = true;
                                browseBtn.style.display = 'none';
                                targetDirHint.style.display = 'block';
                            }
                        }
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

                        // For CLONE mode, include the repository URL
                        if (currentMode === 'CLONE') {
                            const repoSelect = document.getElementById('repoSelect');
                            const selectedValue = repoSelect.value;

                            if (selectedValue === 'custom') {
                                // Use custom URL
                                const customUrl = document.getElementById('customRepoUrl').value;
                                if (!customUrl) {
                                    vscode.postMessage({ command: 'alert', text: 'Please enter a repository URL.' });
                                    return;
                                }
                                config.repoUrl = customUrl;
                            } else {
                                // Use registered repo URL
                                const repo = repoRegistry.find(r => r.id === selectedValue);
                                if (repo) {
                                    config.repoUrl = repo.url;
                                }
                            }
                        }

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
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
