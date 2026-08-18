/** Pull up to three concrete actions from a trailing 【歧路】 block. */
export function parseForkOptions(text) {
    const matched = text.match(/【歧路】([\s\S]*)$/);
    if (!matched)
        return [];
    const out = [];
    for (const line of matched[1].split(/\r?\n/)) {
        const row = line.match(/^\s*(?:[1-3][.)、]|[-*])\s+(.+?)\s*$/);
        if (!row)
            continue;
        const label = row[1].replace(/亦可自己写.*$/, '').trim();
        if (label)
            out.push(label);
        if (out.length >= 3)
            break;
    }
    return out;
}
