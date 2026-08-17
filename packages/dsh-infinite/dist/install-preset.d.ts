import type { PluginConfig } from './types.js';
/** Copy infinite-play into $DSH_HOME/.agent-presets once; never overwrite a live copy. */
export declare function installUserPreset(config: Required<PluginConfig>): string | null;
