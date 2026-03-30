import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as vscode from "vscode";

export class PixiService {
  /**
   * Get the path to the pixi-managed Python interpreter for a given project directory.
   * Returns undefined if the environment doesn't exist.
   */
  public getPixiPythonPath(targetDir: string): string | undefined {
    const pythonPath = path.join(targetDir, ".pixi", "envs", "default", "bin", "python");
    if (fs.existsSync(pythonPath)) {
      return pythonPath;
    }
    return undefined;
  }

  /**
   * Write python.defaultInterpreterPath into the workspace's .vscode/settings.json.
   * Merges with existing settings if the file already exists.
   * Handles JSONC (JSON with comments) which VS Code settings files may contain.
   */
  public configureWorkspacePython(targetDir: string): boolean {
    const pythonPath = this.getPixiPythonPath(targetDir);
    if (!pythonPath) {
      return false;
    }

    const vscodeDir = path.join(targetDir, ".vscode");
    const settingsPath = path.join(vscodeDir, "settings.json");

    // Read existing settings or start fresh
    let settings: Record<string, unknown> = {};
    if (fs.existsSync(settingsPath)) {
      try {
        const content = fs.readFileSync(settingsPath, "utf-8");
        // Strip JSONC comments (// and /* */) and trailing commas before parsing,
        // since VS Code settings files may contain them.
        const stripped = content
          .replace(/\/\/.*$/gm, "")
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/,\s*([}\]])/g, "$1");
        const parsed = JSON.parse(stripped);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          settings = parsed;
        }
      } catch {
        console.warn(`Could not parse ${settingsPath}, creating new settings`);
        settings = {};
      }
    }

    // Set the Python interpreter path
    settings["python.defaultInterpreterPath"] = pythonPath;

    // Write back
    if (!fs.existsSync(vscodeDir)) {
      fs.mkdirSync(vscodeDir, { recursive: true });
    }
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
    console.log(`Configured Python interpreter: ${pythonPath}`);
    return true;
  }

  public async checkAndInstall(
    progressCallback?: (msg: string) => void,
  ): Promise<void> {
    if (this.isPixiInstalled()) {
      return;
    }

    if (progressCallback) progressCallback("Installing Pixi...");

    // Install Pixi
    try {
      await this.installPixi();
    } catch (e) {
      throw new Error(`Failed to install Pixi: ${e}`);
    }
  }

  public async runInstall(
    targetDir: string,
    progressCallback?: (msg: string) => void,
  ): Promise<void> {
    if (progressCallback) progressCallback("Running pixi install...");

    const pixiPath = this.getPixiPath();

    return new Promise((resolve, reject) => {
      const child = cp.spawn(pixiPath, ["install"], {
        cwd: targetDir,
        shell: true,
      });

      child.stdout.on("data", (data) => {
        console.log(`pixi stdout: ${data}`);
      });

      child.stderr.on("data", (data) => {
        console.error(`pixi stderr: ${data}`);
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pixi install exited with code ${code}`));
        }
      });
    });
  }

  private isPixiInstalled(): boolean {
    try {
      const pixiPath = this.getPixiPath();
      cp.execSync(`${pixiPath} --version`);
      return true;
    } catch (e) {
      return false;
    }
  }

  private getPixiPath(): string {
    // Check standard location or PATH
    const homeDir = os.homedir();
    const localBin = path.join(homeDir, ".pixi", "bin", "pixi");
    if (fs.existsSync(localBin)) {
      return localBin;
    }
    return "pixi"; // Hope it's in PATH
  }

  private async installPixi(): Promise<void> {
    const installCmd = "curl -fsSL https://pixi.sh/install.sh | bash";
    return new Promise((resolve, reject) => {
      cp.exec(installCmd, (err, stdout, stderr) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
