import type { PluginConfig } from './types.js';
/** Custom type we used to append. DSH refuses it unless `ignorable: true`. */
export declare const LEGACY_BIND_TYPE = "infinite/bind";
export interface RepairReport {
    readonly scanned: number;
    readonly repaired: number;
    readonly failed: number;
    readonly files: readonly string[];
}
interface ZstdFrameRange {
    readonly start: number;
    readonly end: number;
}
interface ZstdFrameScan {
    readonly frames: ZstdFrameRange[];
    readonly tornStart?: number;
}
export declare function isSessionLogName(name: string): boolean;
/** Walk `~/.dsh/sessions` (or this config's DSH home) and mark leftover bind events ignorable. */
export declare function repairLegacyBindEvents(config: Required<PluginConfig>): RepairReport;
export declare function repairSessionTree(root: string): RepairReport;
/** Patch one JSONL or JSONL+zstd session artifact. Returns whether the file changed. */
export declare function repairSessionLog(path: string): 'repaired' | 'clean';
export declare function patchJsonl(text: string): {
    text: string;
    changed: number;
};
/**
 * Locate complete Zstandard frames without decompressing blocks.
 * Same layout contract as `@deepseek-ai/dsh-session-persistence-jsonl`.
 */
export declare function scanZstdFrames(buffer: Buffer, maxFrames?: number): ZstdFrameScan;
export {};
