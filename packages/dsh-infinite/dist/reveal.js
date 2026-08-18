import { spawn } from 'node:child_process';
import { dirname } from 'node:path';
/** Open the folder and select the file. Skipped under tests. */
export function revealFile(filePath) {
    if (process.env.VITEST)
        return false;
    try {
        if (process.platform === 'win32') {
            spawn('explorer.exe', [`/select,${filePath}`], { detached: true, stdio: 'ignore' }).unref();
            return true;
        }
        if (process.platform === 'darwin') {
            spawn('open', ['-R', filePath], { detached: true, stdio: 'ignore' }).unref();
            return true;
        }
        spawn('xdg-open', [dirname(filePath)], { detached: true, stdio: 'ignore' }).unref();
        return true;
    }
    catch {
        return false;
    }
}
