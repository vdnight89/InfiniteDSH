/** Map a selectable label to a cover filename in the covers directory. */
export declare function coverFileForLabel(label: string): string | undefined;
/** Label → cover filename for the Web card picker. */
export declare function buildCoverManifest(): Record<string, string>;
