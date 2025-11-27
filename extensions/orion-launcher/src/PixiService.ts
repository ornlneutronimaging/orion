import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as vscode from "vscode";

export class PixiService {
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
