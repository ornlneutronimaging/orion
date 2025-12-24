import * as simpleGit from "simple-git";
import * as fs from "fs";
import * as path from "path";
import * as process from "process";

export class GitService {
  public async clone(
    repoUrl: string,
    targetDir: string,
    branchName?: string,
    shallow?: boolean,
  ): Promise<void> {
    // Build clone options
    const cloneOptions = ["--progress"];
    if (shallow) {
      cloneOptions.push("--depth", "1");
    }

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
        await git.clone(repoUrl, targetDir, cloneOptions);
      }
    } else {
      // Directory doesn't exist, create and clone
      fs.mkdirSync(targetDir, { recursive: true });
      const git = simpleGit.simpleGit();
      await git.clone(repoUrl, targetDir, cloneOptions);
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

  /**
   * Refresh an existing repository to latest main and create a session branch.
   * - Fetches from origin
   * - Force checkouts main (discards uncommitted changes to tracked files)
   * - Creates a new branch: ${USER}-session-YYYYMMDD-HHMMSS
   *
   * User's renamed/untracked files are preserved.
   *
   * @param targetDir - The directory containing the git repository
   * @returns The name of the newly created session branch
   */
  public async refreshRepository(targetDir: string): Promise<string> {
    // 1. Open existing repo
    const git = simpleGit.simpleGit({ baseDir: targetDir });

    // Verify it's a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      throw new Error(`Directory ${targetDir} is not a git repository.`);
    }

    // 2. Fetch latest from origin
    console.log("Fetching latest from origin...");
    await git.fetch("origin");

    // 3. Determine the default branch (main or master)
    const defaultBranch = await this.getDefaultBranch(git);
    console.log(`Using default branch: ${defaultBranch}`);

    // 4. Force checkout default branch (discards local changes to tracked files)
    //    This is equivalent to: git checkout main --force
    console.log(`Force checking out ${defaultBranch}...`);
    await git.checkout([defaultBranch, "--force"]);

    // 5. Pull latest (fast-forward)
    console.log(`Pulling latest from origin/${defaultBranch}...`);
    await git.pull("origin", defaultBranch);

    // 6. Generate branch name: ${USER}-session-YYYYMMDD-HHMMSS
    const username = process.env.USER || process.env.USERNAME || "user";
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace("T", "-")
      .slice(0, 15); // YYYYMMDD-HHMMSS
    const branchName = `${username}-session-${timestamp}`;

    // 7. Create and checkout new branch
    console.log(`Creating session branch: ${branchName}`);
    await git.checkoutLocalBranch(branchName);

    // 8. Return the branch name
    return branchName;
  }

  /**
   * Determine the default branch of the repository.
   * Uses multiple strategies for robustness with shallow clones.
   */
  private async getDefaultBranch(
    git: simpleGit.SimpleGit,
  ): Promise<string> {
    try {
      // Strategy 1: Check symbolic ref for origin/HEAD (most reliable)
      try {
        const headRef = await git.raw([
          "symbolic-ref",
          "refs/remotes/origin/HEAD",
          "--short",
        ]);
        // Returns something like "origin/next" or "origin/main"
        const branch = headRef.trim().replace("origin/", "");
        if (branch) {
          console.log(`Detected default branch from origin/HEAD: ${branch}`);
          return branch;
        }
      } catch {
        // symbolic-ref may fail if origin/HEAD doesn't exist
        console.log("origin/HEAD not set, trying other methods...");
      }

      // Strategy 2: Ask remote directly (works even for shallow clones)
      try {
        const remoteInfo = await git.raw(["remote", "show", "origin"]);
        const headMatch = remoteInfo.match(/HEAD branch:\s*(\S+)/);
        if (headMatch && headMatch[1]) {
          console.log(
            `Detected default branch from remote show: ${headMatch[1]}`,
          );
          return headMatch[1];
        }
      } catch {
        console.log("Could not query remote for HEAD branch");
      }

      // Strategy 3: Check for common branch names in remote refs
      const remoteBranches = await git.branch(["-r"]);
      const remoteList = remoteBranches.all;
      console.log(`Remote branches found: ${remoteList.join(", ")}`);

      // Check for common default branch names in priority order
      for (const candidate of ["next", "main", "master", "develop"]) {
        if (
          remoteList.some(
            (b) => b === `origin/${candidate}` || b.endsWith(`/${candidate}`),
          )
        ) {
          console.log(`Found candidate default branch: ${candidate}`);
          return candidate;
        }
      }

      // Strategy 4: Check local branches
      const localBranches = await git.branchLocal();
      console.log(`Local branches found: ${localBranches.all.join(", ")}`);

      for (const candidate of ["next", "main", "master", "develop"]) {
        if (localBranches.all.includes(candidate)) {
          return candidate;
        }
      }

      // Fallback to 'main'
      console.warn(
        "Could not detect default branch. Falling back to 'main'.",
      );
      return "main";
    } catch (error) {
      console.warn(
        `Error detecting default branch: ${error}. Falling back to 'main'.`,
      );
      return "main";
    }
  }
}
