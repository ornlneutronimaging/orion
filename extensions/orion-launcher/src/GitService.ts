import * as simpleGit from "simple-git";
import * as fs from "fs";
import * as path from "path";

export class GitService {
  public async clone(
    repoUrl: string,
    targetDir: string,
    branchName?: string,
  ): Promise<void> {
    // 1. Check if directory exists
    if (fs.existsSync(targetDir)) {
      const files = fs.readdirSync(targetDir);
      if (files.length > 0) {
        // Directory not empty. Check if it's a git repo.
        try {
          const git = simpleGit.simpleGit({ baseDir: targetDir });
          const isRepo = await git.checkIsRepo();
          if (isRepo) {
            console.log(
              `Directory ${targetDir} is already a git repository. Skipping clone.`,
            );
            // Proceed to checkout branch
          } else {
            throw new Error(
              `Directory ${targetDir} exists, is not empty, and is not a git repository.`,
            );
          }
        } catch (e) {
          // If checkIsRepo fails, it might not be a repo, or other error.
          // If we threw above, rethrow.
          if (
            e instanceof Error &&
            e.message.includes("exists, is not empty")
          ) {
            throw e;
          }
          // Otherwise, assume it's not a safe place to clone
          throw new Error(`Directory ${targetDir} exists and is not empty.`);
        }
      } else {
        // Directory is empty, safe to clone
        const git = simpleGit.simpleGit();
        await git.clone(repoUrl, targetDir, ["--progress"]);
      }
    } else {
      // Directory doesn't exist, create and clone
      fs.mkdirSync(targetDir, { recursive: true });
      const git = simpleGit.simpleGit();
      await git.clone(repoUrl, targetDir, ["--progress"]);
    }

    // 2. Checkout Branch
    if (branchName) {
      const git = simpleGit.simpleGit({ baseDir: targetDir });
      try {
        // Try to create and checkout new branch
        await git.checkoutLocalBranch(branchName);
      } catch (e) {
        // If failed, maybe branch exists? Try checkout
        try {
          await git.checkout(branchName);
        } catch (e2) {
          console.warn(`Failed to checkout branch ${branchName}: ${e2}`);
        }
      }
    }
  }
}
