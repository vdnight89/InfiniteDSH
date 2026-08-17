import { createRequire } from 'node:module';
import { statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
function firstExisting(candidates) {
    for (const candidate of candidates) {
        try {
            if (statSync(candidate).isDirectory())
                return candidate;
        }
        catch {
            // try the next location
        }
    }
    return candidates[candidates.length - 1] ?? '';
}
function presetPackageRoot() {
    try {
        return dirname(require.resolve('dsh-infinite-preset/package.json'));
    }
    catch {
        return null;
    }
}
export function defaultTemplatesDir() {
    const pkg = presetPackageRoot();
    return firstExisting([
        ...(pkg ? [join(pkg, 'templates')] : []),
        join(PLUGIN_ROOT, 'templates'),
        join(PLUGIN_ROOT, '..', 'dsh-infinite-preset', 'templates'),
    ]);
}
export function defaultPresetDir() {
    const pkg = presetPackageRoot();
    return firstExisting([
        ...(pkg ? [join(pkg, 'infinite-play')] : []),
        join(PLUGIN_ROOT, 'preset', 'infinite-play'),
        join(PLUGIN_ROOT, '..', 'dsh-infinite-preset', 'infinite-play'),
    ]);
}
export function resolveDshHome(config) {
    if (config.dshHome)
        return config.dshHome;
    if (process.env.DSH_HOME)
        return process.env.DSH_HOME;
    return join(homedir(), '.dsh');
}
export function fallbackStoriesRoot(config) {
    if (config.dataDir)
        return config.dataDir;
    return join(resolveDshHome(config), 'infinite', 'stories');
}
export function safeSessionId(id) {
    return id.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'session';
}
/** Directory that owns this session's artifacts. */
export function resolveSessionDir(ctx, session, config) {
    try {
        const located = ctx.sessionPersistence?.locate?.(session.header ?? { id: session.id });
        if (located?.path)
            return dirname(located.path);
    }
    catch {
        // SQLite and missing backends have no per-session path.
    }
    return join(fallbackStoriesRoot(config), safeSessionId(session.id));
}
export function infiniteRoot(sessionDir) {
    return join(sessionDir, 'infinite');
}
export function templatesDir(config) {
    return config.templatesDir || defaultTemplatesDir();
}
export function userPresetTarget(config) {
    return join(resolveDshHome(config), '.agent-presets', 'infinite-play');
}
