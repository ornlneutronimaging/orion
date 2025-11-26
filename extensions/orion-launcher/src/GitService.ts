import * as simpleGit from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';

export class GitService {

    public async clone(repoUrl: string, targetDir: string, branchName?: string, progressCallback?: (progress: number) => void): Promise<void> {
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const git = simpleGit.simpleGit({ baseDir: targetDir });

        // simple-git doesn't have a built-in progress callback for clone in the way we might want for a UI bar,
        // but we can simulate or just await it. For a real progress bar, we might need to parse stderr.
        // For now, let's just await the clone.

        try {
            await git.clone(repoUrl, targetDir, ['--progress']);

            if (branchName) {
                await git.cwd(targetDir);
                await git.checkoutLocalBranch(branchName);
            }
        } catch (e) {
            throw new Error(`Git clone failed: ${e}`);
        }
    }
}
