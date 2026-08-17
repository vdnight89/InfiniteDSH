export function resolveConfig(raw) {
    return {
        templatesDir: raw?.templatesDir ?? '',
        dataDir: raw?.dataDir ?? '',
        dshHome: raw?.dshHome ?? '',
        maxWorldChars: raw?.maxWorldChars ?? 8000,
    };
}
