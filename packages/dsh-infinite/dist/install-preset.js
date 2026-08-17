import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { defaultPresetDir, userPresetTarget } from './paths.js';
function copyTree(from, to) {
    mkdirSync(to, { recursive: true });
    for (const name of readdirSync(from)) {
        const src = join(from, name);
        const dest = join(to, name);
        if (statSync(src).isDirectory())
            copyTree(src, dest);
        else
            writeFileSync(dest, readFileSync(src));
    }
}
/** Copy infinite-play into $DSH_HOME/.agent-presets once; never overwrite a live copy. */
export function installUserPreset(config) {
    const src = defaultPresetDir();
    try {
        if (!statSync(src).isDirectory())
            return null;
    }
    catch {
        return null;
    }
    const dest = userPresetTarget(config);
    try {
        if (statSync(join(dest, 'agent.cordis.yml')).isFile())
            return dest;
    }
    catch {
        // first install
    }
    mkdirSync(dirname(dest), { recursive: true });
    copyTree(src, dest);
    return dest;
}
