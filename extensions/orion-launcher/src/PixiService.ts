import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { modify, applyEdits } from "jsonc-parser";

export class PixiService {
  /**
   * Get the path to the pixi-managed Python interpreter for a given project directory.
   * Returns undefined if the environment doesn't exist.
   */
  public getPixiPythonPath(targetDir: string): string | undefined {
    const envDir = path.join(targetDir, ".pixi", "envs", "default");
    // Unix: .pixi/envs/default/bin/python
    // Windows: .pixi/envs/default/python.exe
    const candidates = [
      path.join(envDir, "bin", "python"),
      path.join(envDir, "python.exe"),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
    return undefined;
  }

  /**
   * Write python.defaultInterpreterPath into the workspace's .vscode/settings.json.
   * Merges with existing settings if the file already exists.
   * Uses jsonc-parser to preserve comments and formatting in JSONC files.
   */
  public configureWorkspacePython(targetDir: string): boolean {
    const pythonPath = this.getPixiPythonPath(targetDir);
    if (!pythonPath) {
      return false;
    }

    const vscodeDir = path.join(targetDir, ".vscode");
    const settingsPath = path.join(vscodeDir, "settings.json");

    if (!fs.existsSync(vscodeDir)) {
      fs.mkdirSync(vscodeDir, { recursive: true });
    }

    try {
      if (fs.existsSync(settingsPath)) {
        // Surgically edit existing file, preserving comments and formatting
        const content = fs.readFileSync(settingsPath, "utf-8");
        const edits = modify(content, ["python.defaultInterpreterPath"], pythonPath, {
          formattingOptions: { tabSize: 2, insertSpaces: true },
        });
        fs.writeFileSync(settingsPath, applyEdits(content, edits));
      } else {
        // Create new file with just the Python path
        const settings = { "python.defaultInterpreterPath": pythonPath };
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
      }
    } catch (e) {
      console.warn(`Failed to configure Python interpreter in ${settingsPath}: ${e}`);
      return false;
    }

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
