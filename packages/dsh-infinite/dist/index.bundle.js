// packages/infinite-core/dist/types.js
var DEFAULT_WORLD_OPTIONS = {
  maxChars: 8e3,
  maxMatchedEntries: 20,
  maxConstantEntries: 15
};

// packages/infinite-core/dist/frontmatter.js
var FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
function parseFrontMatter(source) {
  const match = FENCE.exec(source);
  if (!match)
    return { fields: {}, body: source.trim() };
  const fields = {};
  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#"))
      continue;
    const colon = line.indexOf(":");
    if (colon <= 0)
      continue;
    fields[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  return { fields, body: source.slice(match[0].length).trim() };
}
function parseStringList(raw) {
  if (!raw)
    return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed.slice(1, -1).split(",").map((part) => part.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
  }
  return trimmed.split(",").map((part) => part.trim()).filter(Boolean);
}
function parseBool(raw, fallback) {
  if (raw === void 0 || raw === "")
    return fallback;
  const v = raw.toLowerCase();
  if (v === "true" || v === "yes" || v === "1")
    return true;
  if (v === "false" || v === "no" || v === "0")
    return false;
  return fallback;
}
function parseIntField(raw, fallback) {
  if (raw === void 0 || raw === "")
    return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}
function parseLoreEntry(source, fallbackId) {
  const { fields, body } = parseFrontMatter(source);
  const id = fields.id?.trim() || fallbackId;
  return {
    id,
    title: fields.title?.trim() || id,
    category: fields.category?.trim() || "\u8BBE\u5B9A",
    keys: parseStringList(fields.keys),
    content: body,
    constant: parseBool(fields.constant, false),
    order: parseIntField(fields.order, 0),
    disabled: parseBool(fields.disabled, false)
  };
}
function parseStoryMeta(source) {
  const { fields } = parseFrontMatter(`---
${source.trim()}
---
`);
  return {
    version: 1,
    templateId: fields.templateId?.trim() || "cultivation",
    protagonist: fields.protagonist?.trim() || "",
    narrativeGuard: parseBool(fields.narrativeGuard, true),
    progressionGuard: parseBool(fields.progressionGuard, true),
    randomEvent: parseBool(fields.randomEvent, true),
    pickedEventIds: parseStringList(fields.pickedEventIds),
    pendingEventId: fields.pendingEventId && fields.pendingEventId !== "null" ? fields.pendingEventId : null,
    createdAt: fields.createdAt?.trim() || (/* @__PURE__ */ new Date()).toISOString()
  };
}
function formatStoryMeta(meta) {
  const pending = meta.pendingEventId ?? "null";
  const picked = meta.pickedEventIds.length === 0 ? "[]" : `[${meta.pickedEventIds.join(", ")}]`;
  return [
    `version: ${meta.version}`,
    `templateId: ${meta.templateId}`,
    `protagonist: ${meta.protagonist}`,
    `narrativeGuard: ${meta.narrativeGuard}`,
    `progressionGuard: ${meta.progressionGuard}`,
    `randomEvent: ${meta.randomEvent}`,
    `pickedEventIds: ${picked}`,
    `pendingEventId: ${pending}`,
    `createdAt: ${meta.createdAt}`,
    ""
  ].join("\n");
}
function defaultMeta(templateId, protagonist) {
  return {
    version: 1,
    templateId,
    protagonist,
    narrativeGuard: true,
    progressionGuard: true,
    randomEvent: true,
    pickedEventIds: [],
    pendingEventId: null,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// packages/infinite-core/dist/worldbook.js
function normalize(s) {
  return s.toLowerCase().replace(/\s+/g, "");
}
function findMatchingEntries(entries, contextText) {
  const haystack = normalize(contextText);
  if (!haystack)
    return [];
  const matched = [];
  for (const entry of entries) {
    if (entry.disabled || entry.constant)
      continue;
    for (const key of entry.keys) {
      const kw = normalize(key);
      if (kw.length >= 2 && haystack.includes(kw)) {
        matched.push(entry);
        break;
      }
    }
  }
  return matched;
}
function buildWorldContext(entries, recentText2, bookName, options) {
  const empty = { text: "", matchedEntryIds: [], constantCount: 0 };
  const enabled = entries.filter((e) => !e.disabled);
  if (enabled.length === 0)
    return empty;
  const opts = { ...DEFAULT_WORLD_OPTIONS, ...options };
  const constants = enabled.filter((e) => e.constant).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const matched = findMatchingEntries(enabled, recentText2).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const header = `\u3010\u4E16\u754C\u89C4\u5219\xB7${bookName}\u3011\uFF08\u4E16\u754C\u57FA\u7840\u89C4\u5219\uFF1A\u4EC5\u5B9A\u4E49\u821E\u53F0\u4E0E\u5E95\u5C42\u8BBE\u5B9A\uFF09`;
  const lines = [];
  for (const e of constants.slice(0, opts.maxConstantEntries)) {
    lines.push(`\u3010${e.category}\xB7${e.title}\u3011${e.content}`);
  }
  const matchedEntryIds = [];
  for (const e of matched.slice(0, opts.maxMatchedEntries)) {
    lines.push(`\u3010${e.category}\xB7${e.title}\u3011${e.content}`);
    matchedEntryIds.push(e.id);
  }
  const included = [];
  let consumed = header.length;
  for (const line of lines) {
    if (consumed + line.length + 1 > opts.maxChars)
      break;
    included.push(line);
    consumed += line.length + 1;
  }
  if (included.length === 0)
    return empty;
  return {
    text: `${header}
${included.join("\n")}`,
    matchedEntryIds,
    constantCount: constants.length
  };
}
function buildCharacterContext(entries, recentText2, protagonist) {
  const enabled = entries.filter((e) => !e.disabled);
  if (enabled.length === 0 && !protagonist)
    return "";
  const hits = enabled.filter((e) => e.constant || findMatchingEntries([e], recentText2).length > 0);
  const lines = [];
  if (protagonist)
    lines.push(`\u4E3B\u89D2\uFF08\u7528\u6237\u89D2\u8272\uFF0C\u53D9\u4E8B\u4E2D\u5FC3\uFF09\uFF1A${protagonist}`);
  for (const e of hits.sort((a, b) => a.order - b.order)) {
    lines.push(`\u3010${e.title}\u3011${e.content}`);
  }
  if (lines.length === 0)
    return "";
  return `\u3010\u89D2\u8272\u3011
${lines.join("\n")}`;
}

// packages/infinite-core/dist/random-event.js
function pickRandomEventEntry(entries, recentText2, excludeIds, rng = Math.random) {
  const matchedIds = new Set(findMatchingEntries(entries, recentText2).map((e) => e.id));
  const excluded = new Set(excludeIds);
  const pool = entries.filter((e) => !e.disabled && !e.constant && !matchedIds.has(e.id) && !excluded.has(e.id));
  if (pool.length === 0)
    return null;
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[index] ?? null;
}
function formatRandomEvent(entry) {
  return `\u3010\u968F\u673A\u4E16\u754C\u4E8B\u4EF6\u3011\u4EE5\u4E0B\u8BBE\u5B9A\u6765\u81EA\u5F53\u524D\u89C4\u5219\u4E66\uFF0C\u53EF\u4F5C\u4E3A\u672C\u6BB5\u5267\u60C5\u7684\u65B0\u8FDB\u5C55\u3001\u8F6C\u6298\u6216\u60AC\u5FF5\u81EA\u7136\u5F15\u51FA\uFF08\u4E0D\u5FC5\u5F3A\u884C\u51FA\u73B0\uFF0C\u672A\u5F15\u51FA\u4E5F\u4E0D\u7B97\u5931\u8D25\uFF09\uFF1A
\u3010${entry.category}\xB7${entry.title}\u3011${entry.content}`;
}

// packages/infinite-core/dist/guards.js
function buildNarrativeGuard() {
  return `\u3010\u53D9\u4E8B\u62A4\u680F\xB7\u5FC5\u987B\u4E25\u683C\u9075\u5B88\u3011
1. \u4E16\u754C\u662F\u6D3B\u7684\uFF1A\u5267\u60C5\u5FC5\u987B\u6709\u5916\u90E8\u4E16\u754C\u53C2\u4E0E\u3002\u89C6\u5267\u60C5\u9700\u8981\u5F15\u5165\u6216\u5EF6\u7EED\u5176\u4ED6 NPC\u3001\u52BF\u529B\u4E0E\u73AF\u5883\u4E8B\u4EF6\uFF1B\u4E25\u7981\u5168\u7BC7\u53EA\u6709\u7537\u5973\u4E3B\u89D2\u4E24\u4E2A\u4EBA\u5BF9\u8BDD\u4E92\u52A8\uFF0C\u4E25\u7981\u5916\u90E8\u4E16\u754C\u6C38\u8FDC\u9759\u6B62\u3002
2. \u89D2\u8272\u7BA1\u7406\uFF1A\u4F18\u5148\u590D\u7528\u5DF2\u51FA\u573A\u89D2\u8272\uFF1B\u6BCF\u6BB5\u6700\u591A\u5F15\u5165 1 \u4E2A\u65B0\u89D2\u8272\uFF1B\u540C\u65F6\u6D3B\u8DC3\u7684\u4E3B\u8981\u89D2\u8272\u4E0D\u8D85\u8FC7 3-4 \u4E2A\uFF1B\u65B0\u89D2\u8272\u5165\u573A\u65F6\u4E00\u6B21\u4EA4\u4EE3\u53EF\u8BB0\u5FC6\u7684\u8EAB\u4EFD\u6216\u7279\u5F81\u3002
3. \u4E3B\u89D2\u4E3A\u4E2D\u5FC3\uFF1A\u7528\u6237\u626E\u6F14\u7684\u4E3B\u89D2\u662F\u53D9\u4E8B\u4E2D\u5FC3\u4E0E\u89C6\u89D2\u951A\u70B9\u3002`;
}
function buildProgressionGuard() {
  return `\u3010\u5267\u60C5\u63A8\u8FDB\xB7\u5FC5\u987B\u4E25\u683C\u9075\u5B88\u3011
1. \u6BCF\u6BB5\u56DE\u590D\u5FC5\u987B\u63A8\u8FDB\u81F3\u5C11\u4E00\u4E2A\u5267\u60C5\u8981\u7D20\uFF1A\u65B0\u4E8B\u4EF6\u3001\u65B0\u4FE1\u606F\u3001\u51B2\u7A81\u5347\u7EA7\u3001\u5173\u7CFB\u53D8\u5316\u3001\u573A\u666F\u8F6C\u79FB\u6216\u60C5\u611F\u8F6C\u6298\u3002
2. \u4E25\u7981\u539F\u5730\u6253\u8F6C\uFF1A\u4E0D\u91CD\u590D\u5DF2\u5199\u8FC7\u7684\u573A\u666F\u4E0E\u5BF9\u8BDD\uFF1B\u4E0D\u5F97\u7528\u7A7A\u6CDB\u6536\u5C3E\u6577\u884D\u3002
3. \u7ED3\u5C3E\u7559\u94A9\uFF1A\u7559\u4E0B\u4E00\u5904\u5177\u4F53\u53EF\u7EE7\u7EED\u7684\u884C\u52A8\u3001\u9009\u62E9\u6216\u60AC\u5FF5\u3002`;
}
function buildProseOnlyGuard() {
  return `\u3010\u8F93\u51FA\u8981\u6C42\u3011\u5148\u8F93\u51FA\u6545\u4E8B\u6B63\u6587\u672C\u8EAB\u3002\u4E0D\u8981\u8F93\u51FA\u7AE0\u8282\u540D\u3001\u573A\u666F\u4FE1\u606F\u7B49\u533A\u5757\u6807\u7B7E\uFF0C\u4E0D\u8981\u6DFB\u52A0\u683C\u5F0F\u8BF4\u660E\u6216\u524D\u540E\u7F00\uFF0C\u4E0D\u8981\u8F93\u51FA markdown \u6807\u9898\u3002
\u6B63\u6587\u7ED3\u675F\u540E\u5FC5\u987B\u53E6\u8D77\u4E00\u5757\uFF1A
\u3010\u6B67\u8DEF\u3011
1. \uFF08\u4E0D\u8D85\u8FC7\u5341\u516D\u5B57\u7684\u5177\u4F53\u884C\u52A8\uFF09
2. \uFF08\u4E0D\u8D85\u8FC7\u5341\u516D\u5B57\u7684\u5177\u4F53\u884C\u52A8\uFF09
3. \uFF08\u4E0D\u8D85\u8FC7\u5341\u516D\u5B57\u7684\u5177\u4F53\u884C\u52A8\uFF09
\u4EA6\u53EF\u81EA\u5DF1\u5199\u4E00\u6761\u522B\u7684\u8DEF\u3002
\u3010\u6B67\u8DEF\u3011\u4E0D\u662F\u6B63\u6587\uFF0C\u4E0D\u8981\u628A\u5B83\u5199\u6210\u89D2\u8272\u53F0\u8BCD\u3002`;
}

// packages/infinite-core/dist/export.js
var META_LINE = /^\s*【(?:章节名|场景信息|对话推荐|开局|世界规则|叙事护栏|剧情推进|输出要求|随机世界事件|角色|当前场景|歧路)】.*$/;
var BODY_TAG = /【正文】/g;
var FENCE_BLOCK = /```[\s\S]*?```/g;
var FORK_BLOCK = /【歧路】[\s\S]*$/;
function cleanProse(text) {
  const withoutFences = text.replace(FENCE_BLOCK, "");
  const withoutFork = withoutFences.replace(FORK_BLOCK, "");
  const withoutMeta = withoutFork.split(/\r?\n/).filter((line) => !META_LINE.test(line) && !/^(?:亦可自己写一条)/.test(line.trim())).join("\n").replace(BODY_TAG, "");
  return withoutMeta.replace(/^\s*#{1,6}\s+.*$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
}
function isOpeningInstruction(text) {
  const t = text.trim();
  return t.startsWith("\u3010\u5F00\u5C40\u3011") || t.startsWith("[\u5F00\u5C40]") || t === "\u542F\u7A0B\u3002" || t === "\u542F\u7A0B";
}
function exportTranscript(title, protagonist, messages, includePlayer) {
  const lines = [title];
  if (protagonist)
    lines.push(`\u4E3B\u89D2\uFF1A${protagonist}`);
  lines.push(`\u5BFC\u51FA\u65F6\u95F4\uFF1A${(/* @__PURE__ */ new Date()).toISOString()}`);
  lines.push("");
  for (const message of messages) {
    if (message.role === "system")
      continue;
    if (isOpeningInstruction(message.text))
      continue;
    if (message.role === "user") {
      if (!includePlayer)
        continue;
      const body2 = message.text.trim();
      if (!body2)
        continue;
      lines.push(`\uFF08\u4F60\uFF09${body2}`, "");
      continue;
    }
    const body = cleanProse(message.text);
    if (!body)
      continue;
    lines.push(body, "");
  }
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}
`;
}
function formatArchive(summary, at, previous = "") {
  const body = summary.trim();
  const prior = previous.trim();
  if (!body)
    return prior;
  const section = `## ${at}

${body}
`;
  if (!prior)
    return `# \u5267\u60C5\u6863\u6848

${section}`;
  return `${prior}

${section}`;
}

// packages/infinite-core/dist/catalog.generated.js
var TEMPLATE_CATALOG = [
  {
    "id": "cultivation",
    "label": "\u4FEE\u4ED9",
    "description": "\u4EE5\u4E2D\u56FD\u4F20\u7EDF\u9053\u6559\u6587\u5316\u4E3A\u57FA\u7840\u7684\u4FEE\u4ED9\u4F53\u7CFB\uFF0C\u5305\u542B\u70BC\u6C14\u3001\u7B51\u57FA\u3001\u91D1\u4E39\u3001\u5143\u5A74\u7B49\u5883\u754C\u4F53\u7CFB",
    "aliases": [
      "\u4FEE\u4ED9",
      "\u4ED9\u4FA0",
      "\u7384\u5E7B",
      "cultivation",
      "xianxia"
    ],
    "defaultProtagonist": "\u8C22\u65E0\u5984"
  },
  {
    "id": "fantasy",
    "label": "\u5947\u5E7B",
    "description": "\u4E07\u65CF\u6797\u7ACB\u3001\u53E4\u65CF\u4F20\u627F\u4E0E\u79D8\u5883\u9057\u8FF9\u4EA4\u7EC7\u7684\u4E1C\u65B9\u7384\u5E7B\u4E16\u754C",
    "aliases": [
      "\u5947\u5E7B",
      "\u5F02\u4E16",
      "\u9B54\u6CD5",
      "\u897F\u5E7B",
      "fantasy"
    ],
    "defaultProtagonist": "\u8C22\u65E0\u5984"
  },
  {
    "id": "urban",
    "label": "\u90FD\u5E02\u5F02\u80FD",
    "description": "\u73B0\u4EE3\u57CE\u5E02\u8868\u5C42\u4E4B\u4E0B\uFF0C\u5F02\u80FD\u89C9\u9192\u3001\u9690\u79D8\u7EC4\u7EC7\u4E0E\u6697\u7EBF\u52BF\u529B\u5E76\u5B58",
    "aliases": [
      "\u90FD\u5E02\u5F02\u80FD",
      "\u5F02\u80FD",
      "urban"
    ],
    "defaultProtagonist": "\u9646\u6C89\u821F"
  },
  {
    "id": "modern",
    "label": "\u73B0\u4EE3",
    "description": "\u4EE5\u73B0\u5B9E\u73B0\u4EE3\u57CE\u5E02\u4E3A\u84DD\u672C\u7684\u901A\u7528\u4E16\u754C\uFF1A\u901A\u52E4\u3001\u804C\u573A\u3001\u5BB6\u5EAD\u3001\u793E\u4EA4\u4E0E\u57CE\u5E02\u7684\u65E5\u5E38\u751F\u6D3B\u8FD0\u8F6C\u3002\u4E0D\u542B\u5F02\u80FD\u3001\u4FEE\u4ED9\u3001\u8D85\u81EA\u7136\u7B49\u7279\u6B8A\u8BBE\u5B9A",
    "aliases": [
      "\u73B0\u4EE3",
      "\u73B0\u5B9E",
      "\u90FD\u5E02",
      "modern"
    ],
    "defaultProtagonist": "\u9646\u6C89\u821F"
  },
  {
    "id": "infinite",
    "label": "\u65E0\u9650\u6D41",
    "description": "\u7A7F\u68AD\u4E8E\u5404\u4E2A\u5F71\u89C6\u3001\u5C0F\u8BF4\u3001\u6E38\u620F\u4E16\u754C\u5B8C\u6210\u4EFB\u52A1\u7684\u65E0\u9650\u6D41\u8BBE\u5B9A",
    "aliases": [
      "\u65E0\u9650",
      "\u526F\u672C",
      "\u8F6E\u56DE",
      "infinite"
    ],
    "defaultProtagonist": "\u9646\u6C89\u821F"
  },
  {
    "id": "scifi",
    "label": "\u79D1\u5E7B",
    "description": "\u4EBA\u7C7B\u8FC8\u5411\u6DF1\u7A7A\u540E\u7684\u661F\u8230\u3001\u6B96\u6C11\u5730\u3001\u8FB9\u7586\u548C\u6280\u672F\u79E9\u5E8F",
    "aliases": [
      "\u79D1\u5E7B",
      "\u672A\u6765",
      "\u661F\u9645",
      "scifi"
    ],
    "defaultProtagonist": "\u987E\u665A\u68E0"
  },
  {
    "id": "apocalypse",
    "label": "\u672B\u4E16",
    "description": "\u4E27\u5C38\u6A2A\u884C\u6216\u6838\u6218\u5E9F\u571F\u7684\u672B\u65E5\u4E16\u754C\u89C2\uFF0C\u4EBA\u7C7B\u5728\u5E9F\u589F\u4E2D\u6C42\u751F",
    "aliases": [
      "\u672B\u4E16",
      "\u4E27\u5C38",
      "apocalypse"
    ],
    "defaultProtagonist": "\u5468\u614E"
  },
  {
    "id": "entertainment",
    "label": "\u5A31\u4E50\u5708",
    "description": "\u73B0\u4EE3\u90FD\u5E02\u80CC\u666F\u4E0B\u7684\u660E\u661F\u3001\u827A\u4EBA\u3001\u5076\u50CF\u3001\u6F14\u5458\u7684\u5A31\u4E50\u5708\u751F\u6001",
    "aliases": [
      "\u5A31\u4E50\u5708",
      "\u5A31\u4E50",
      "entertainment"
    ],
    "defaultProtagonist": "\u88F4\u664F\u6E05"
  },
  {
    "id": "palace",
    "label": "\u5BAB\u5EF7",
    "description": "\u4E2D\u56FD\u53E4\u4EE3\u738B\u671D\u5BAB\u5EF7\u80CC\u666F\uFF0C\u7687\u6743\u3001\u540E\u5BAB\u3001\u6743\u8C0B\u7684\u4EA4\u7EC7",
    "aliases": [
      "\u5BAB\u5EF7",
      "\u671D\u5802",
      "\u53E4\u4EE3",
      "palace"
    ],
    "defaultProtagonist": "\u6C88\u662D\u5B81"
  },
  {
    "id": "romance",
    "label": "\u8A00\u60C5",
    "description": "\u73B0\u4EE3\u90FD\u5E02\u80CC\u666F\u4E0B\u7684\u6D6A\u6F2B\u604B\u7231\u6A21\u62DF\u8BBE\u5B9A\uFF0C\u751C\u5BA0\u3001\u50B2\u5A07\u3001\u9738\u9053\u603B\u88C1\u7B49\u7ECF\u5178\u8BBE\u5B9A",
    "aliases": [
      "\u8A00\u60C5",
      "\u751C\u5BA0",
      "romance"
    ],
    "defaultProtagonist": "\u88F4\u664F\u6E05"
  },
  {
    "id": "folklore",
    "label": "\u6C11\u4FD7",
    "description": "\u6C5F\u6CB3\u6E56\u6D77\u3001\u5C71\u6751\u6C34\u4E61\u4E4B\u95F4\uFF0C\u9690\u85CF\u7740\u53E4\u8001\u7684\u884C\u4E1A\u4E0E\u7981\u5FCC\uFF1A\u635E\u5C38\u4EBA\u3001\u9634\u9633\u5148\u751F\u3001\u8D76\u5C38\u4EBA\u2026\u2026\u656C\u754F\u4F20\u7EDF\uFF0C\u5C0F\u5FC3\u8BE1\u4E8B",
    "aliases": [
      "\u6C11\u4FD7",
      "\u5FD7\u602A",
      "\u4E61\u571F",
      "folklore"
    ],
    "defaultProtagonist": "\u767D\u8605"
  },
  {
    "id": "rulehorror",
    "label": "\u89C4\u5219\u602A\u8C08",
    "description": "\u9690\u79D8\u964D\u4E34\u7684\u4E16\u754C\u2014\u2014\u6BCF\u4E00\u5904\u7A7A\u95F4\u90FD\u6709\u89C4\u5219\uFF0C\u6BCF\u4E00\u6761\u89C4\u5219\u80CC\u540E\u90FD\u662F\u751F\u5B58\u7684\u4EE3\u4EF7\u3002\u8FDD\u53CD\u89C4\u5219\uFF0C\u5C31\u4F1A\u88AB\u300C\u5B83\u300D\u5E26\u8D70",
    "aliases": [
      "\u89C4\u5219\u602A\u8C08",
      "\u602A\u8C08",
      "\u89C4\u5219",
      "rulehorror"
    ],
    "defaultProtagonist": "\u767D\u8605"
  },
  {
    "id": "zhaidou",
    "label": "\u5B85\u6597",
    "description": "\u53E4\u4EE3\u4E16\u5BB6\u5927\u65CF\u7684\u5185\u5B85\u6DF1\u9662\uFF1A\u5AE1\u5EB6\u6709\u522B\uFF0C\u59BB\u59BE\u76F8\u4E89\uFF0C\u4E00\u8349\u4E00\u6728\u7686\u662F\u535A\u5F08\u3002\u6B65\u6B65\u4E3A\u8425\uFF0C\u65B9\u80FD\u5B89\u8EAB\u7ACB\u547D",
    "aliases": [
      "\u5B85\u6597",
      "\u5E9C\u90B8",
      "zhaidou"
    ],
    "defaultProtagonist": "\u6C88\u662D\u5B81"
  },
  {
    "id": "retro",
    "label": "\u5E74\u4EE3",
    "description": "\u91CD\u56DE\u4E03\u516B\u5341\u5E74\u4EE3\uFF1A\u4F9B\u9500\u793E\u3001\u7CAE\u7968\u3001\u4E0B\u4E61\u3001\u9AD8\u8003\u2026\u2026\u8FD9\u4E00\u6B21\uFF0C\u8981\u6293\u4F4F\u6BCF\u4E00\u4E2A\u6539\u53D8\u547D\u8FD0\u7684\u673A\u4F1A",
    "aliases": [
      "\u5E74\u4EE3",
      "\u5E74\u4EE3\u6587",
      "retro"
    ],
    "defaultProtagonist": "\u6C88\u662D\u5B81"
  },
  {
    "id": "wuxia",
    "label": "\u6C5F\u6E56",
    "description": "\u95E8\u6D3E\u3001\u5BA2\u6808\u3001\u82F1\u96C4\u5E16\u4E0E\u6C5F\u6E56\u89C4\u77E9\u3002",
    "aliases": [
      "\u6C5F\u6E56",
      "\u6B66\u4FA0",
      "wuxia"
    ],
    "defaultProtagonist": "\u8C22\u65E0\u5984"
  },
  {
    "id": "campus",
    "label": "\u6821\u56ED",
    "description": "\u5B66\u671F\u3001\u793E\u56E2\u3001\u7ADE\u8D5B\u4E0E\u9519\u8FC7\u7684\u4EBA\u3002",
    "aliases": [
      "\u6821\u56ED",
      "\u5927\u5B66",
      "campus"
    ],
    "defaultProtagonist": "\u6797\u664F"
  },
  {
    "id": "detective",
    "label": "\u5211\u4FA6",
    "description": "\u73B0\u573A\u3001\u53E3\u4F9B\u3001\u7A0B\u5E8F\u4E0E\u4E0D\u5728\u573A\u8BC1\u660E\u3002",
    "aliases": [
      "\u5211\u4FA6",
      "\u7834\u6848",
      "\u4FA6\u63A2",
      "detective"
    ],
    "defaultProtagonist": "\u5468\u614E"
  },
  {
    "id": "cyber",
    "label": "\u8D5B\u535A",
    "description": "\u4E49\u4F53\u3001\u516C\u53F8\u3001\u8BB0\u5FC6\u5907\u4EFD\u4E0E\u4E0B\u5C42\u8857\u533A\u3002",
    "aliases": [
      "\u8D5B\u535A",
      "\u8D5B\u535A\u670B\u514B",
      "\u4E49\u4F53",
      "cyber"
    ],
    "defaultProtagonist": "\u987E\u665A\u68E0"
  },
  {
    "id": "whale",
    "label": "\u6DF1\u6D77\u5B9E\u9A8C\u5BA4",
    "description": "\u540C\u4EBA\u5411\uFF1A\u6DF1\u6D77\u5B9E\u9A8C\u5BA4\u3001\u9CB8\u9C7C\u5A18\u4E0E\u6881\u7EC4\u3002\u5F00\u6E90\u3001\u7EC4\u4F1A\u3001\u7B97\u529B\u6F6E\u6C50\u548C\u793E\u533A\u9ED1\u8BDD\u3002\u975E\u6B63\u5F0F\u5B98\u65B9\u8BBE\u5B9A\u3002",
    "aliases": [
      "\u6DF1\u6D77",
      "\u9CB8\u9C7C\u5A18",
      "\u6881\u5723",
      "\u6881\u7EC4",
      "\u7262\u6881",
      "\u6881\u5B50",
      "whale",
      "deepseek"
    ],
    "defaultProtagonist": "\u963F\u6F9C"
  }
];

// packages/infinite-core/dist/topics.js
var TEMPLATE_IDS = TEMPLATE_CATALOG.map((item) => item.id);
var TOPIC_CHOICES = TEMPLATE_CATALOG.map((item) => ({
  id: item.id,
  label: item.label,
  description: item.description
}));
function topicChoice(id) {
  return TOPIC_CHOICES.find((item) => item.id === id) ?? TOPIC_CHOICES[0];
}
function catalogEntry(id) {
  return TEMPLATE_CATALOG.find((item) => item.id === id);
}
function bookNameForTemplate(templateId) {
  return catalogEntry(templateId)?.label || templateId;
}
function isKeepDefaultChoice(chosen, keep) {
  const t = chosen.replace(/\s*(?:\((?:recommended|推荐)\)|（(?:recommended|推荐)）)\s*$/i, "").trim();
  return !t || t === keep || t.startsWith(keep);
}
function resolveTemplateId(raw) {
  const key = (raw ?? "").trim();
  if (!key)
    return null;
  const lower = key.toLowerCase();
  for (const item of TEMPLATE_CATALOG) {
    if (item.id === lower || item.label === key)
      return item.id;
    if (item.aliases.some((alias) => alias === key || alias.toLowerCase() === lower))
      return item.id;
  }
  return null;
}
function templateIdFromLabel(label) {
  return resolveTemplateId(label);
}
function defaultProtagonist(templateId) {
  return catalogEntry(templateId)?.defaultProtagonist || "\u9646\u6C89\u821F";
}
function parseCommandArgs(rawInput) {
  const tokens = rawInput.trim().split(/\s+/).filter(Boolean);
  const force = tokens.some((t) => t.toLowerCase() === "force");
  const rest = tokens.filter((t) => t.toLowerCase() !== "force");
  return { topic: rest[0] ?? "", force, rest };
}
var KEEP_DEFAULT_PROTAGONIST = "\u4EE5\u6B64\u754C\u9ED8\u8BA4\u4E4B\u8EAB";
var KEEP_DEFAULT_OPENING = "\u8D70\u6B64\u754C\u9ED8\u8BA4\u5F00\u5C40";

// packages/infinite-core/dist/covers.js
var CHARACTER_COVERS = {
  \u963F\u6F9C: "alan.jpg",
  \u9CB8\u9C7C\u5A18: "whale-girl.jpg",
  \u5C0F\u9CB8: "whale-girl.jpg",
  \u6881\u7EC4: "liang.jpg",
  \u6881\u5723: "liang.jpg",
  \u7262\u6881: "liang.jpg",
  \u6881\u5B50: "liang.jpg",
  \u8C22\u65E0\u5984: "cultivation.jpg",
  \u9646\u6C89\u821F: "modern.jpg",
  \u987E\u665A\u68E0: "scifi.jpg",
  \u5468\u614E: "apocalypse.jpg",
  \u88F4\u664F\u6E05: "entertainment.jpg",
  \u6C88\u662D\u5B81: "palace.jpg",
  \u767D\u8605: "folklore.jpg",
  \u6797\u664F: "campus.jpg"
};
function buildCoverManifest() {
  const out = { ...CHARACTER_COVERS };
  for (const item of TEMPLATE_CATALOG) {
    out[item.label] = `${item.id}.jpg`;
    out[item.id] = `${item.id}.jpg`;
    for (const alias of item.aliases)
      out[alias] = `${item.id}.jpg`;
  }
  return out;
}

// packages/dsh-infinite/dist/ask.js
function isNoAskProvider(error) {
  if (error && typeof error === "object" && "code" in error && error.code === "NO_PROVIDER") {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /NO_PROVIDER|no user-questions provider/i.test(message);
}
function stripRecommend(label) {
  return label.replace(/\s*(?:\((?:recommended|推荐)\)|（(?:recommended|推荐)）)\s*$/i, "").trim();
}
function pickAnswer(answers, id) {
  const item = answers.find((row) => row.id === id);
  if (!item)
    return "";
  const custom = item.custom?.trim();
  if (custom)
    return custom;
  return stripRecommend(item.selected[0]?.trim() ?? "");
}
async function askUser(ctx, inv, questions) {
  if (typeof ctx.userQuestions?.ask !== "function")
    return null;
  try {
    const result = await ctx.userQuestions.ask({
      questions,
      agent: inv.agent,
      signal: inv.signal
    });
    return result.answers;
  } catch (error) {
    if (isNoAskProvider(error))
      return null;
    throw error;
  }
}

// packages/dsh-infinite/dist/copy.js
var ASK_HEADER = "\u8BF8\u5929\u4E07\u754C";
var TOPIC_QUESTION = "\u8E0F\u5165\u54EA\u4E00\u754C\uFF1F";
var TOPIC_DETAIL = "\u70B9\u9009\u4E00\u754C\uFF0C\u5929\u4E66\u5C06\u843D\u5165\u672C\u4F1A\u8BDD\u3002\u4EA6\u53EF\u5199\u4E0B /new \u4FEE\u4ED9 \u76F4\u5165\u3002";
var PROTAGONIST_QUESTION = "\u8C01\u4E3A\u5929\u547D\u4E4B\u4EBA\uFF1F";
var OPENING_QUESTION = "\u4ECE\u6B64\u754C\u4F55\u5904\u843D\u8DB3\uFF1F";
var OVERWRITE_QUESTION = "\u6B64\u4F1A\u8BDD\u5DF2\u6709\u4E00\u754C\uFF0C\u8981\u6495\u5F00\u91CD\u5165\u5417\uFF1F";
var OVERWRITE_YES = "\u6495\u5F00\u91CD\u5165";
var OVERWRITE_NO = "\u7559\u5728\u6B64\u754C";
var EMBARK = "\u542F\u7A0B";
var REPICK_OPENING = "\u53E6\u62E9\u5F00\u5C40";
var REPICK_PROTAGONIST = "\u66F4\u6362\u5929\u547D\u4E4B\u4EBA";
var BIND_QUESTION = "\u6539\u6295\u4ED6\u754C\uFF1F";
var CANCELLED = "\u672A\u6539\u754C\uFF0C\u4ECD\u7ACB\u4E8E\u6B64\u3002";
function defaultBodyHint(name2) {
  return `\u70B9\u9009\u300C\u4EE5\u6B64\u754C\u9ED8\u8BA4\u4E4B\u8EAB\u300D\u5373 ${name2}\u3002\u8981\u81EA\u5DF1\u8D77\u540D\uFF0C\u5199\u5728\u4E0B\u65B9\u300C\u8F93\u5165\u4F60\u7684\u7B54\u6848\u300D\u3002`;
}
function embarkDetail(world, protagonist) {
  return `\u6B64\u754C\uFF1A${world}\u3002\u5929\u547D\u4E4B\u4EBA\uFF1A${protagonist}\u3002\u70B9\u300C\u542F\u7A0B\u300D\u624D\u5199\u4E0B\u7B2C\u4E00\u6BB5\u3002`;
}
function openedWaiting(world, protagonist) {
  return `\u754C\u95E8\u5DF2\u5F00\u300A${world}\u300B\u3002\u5929\u547D\u4E4B\u4EBA\uFF1A${protagonist}\u3002\u70B9\u300C\u542F\u7A0B\u300D\u8E0F\u5165\uFF0C\u6216\u53E6\u62E9\u5F00\u5C40\u3001\u66F4\u6362\u5929\u547D\u4E4B\u4EBA\u3002`;
}
function openedEmbarked(world, protagonist) {
  return `\u5DF2\u8E0F\u5165\u300A${world}\u300B\u3002\u5929\u547D\u4E4B\u4EBA\uFF1A${protagonist}\u3002\u7B2C\u4E00\u6BB5\u6B63\u5728\u843D\u7B14\u3002`;
}
function needForceText() {
  return "\u6B64\u4F1A\u8BDD\u5DF2\u6709\u4E00\u754C\uFF1B\u8981\u6495\u5F00\u91CD\u5165\uFF0C\u8BF7\u5728\u547D\u4EE4\u540E\u52A0\u4E0A force\u3002";
}
function unknownWorld(known) {
  return `\u672A\u77E5\u4E4B\u754C\u3002\u53EF\u8BD5\uFF1A${known}`;
}
function pickWorldHint() {
  return "\u5148\u9009\u5B9A\u4E00\u754C\uFF1A\u53EA\u8F93\u5165 /new \u5F39\u51FA\u754C\u56FE\uFF0C\u6216 /new \u4FEE\u4ED9\u3001/new \u672B\u4E16 \u76F4\u5165\u3002";
}
function boundTo(world) {
  return `\u5DF2\u6539\u6295\u300A${world}\u300B\u3002`;
}
function noWorldYet() {
  return "\u6B64\u4F1A\u8BDD\u5C1A\u65E0\u4E16\u754C\u3002\u5148 /new \u8FDB\u5165\u65B0\u4E16\u754C\u3002";
}
function castNeedName() {
  return "\u7528\u6CD5\uFF1A/cast \u540D\u5B57\uFF0C\u6216\u53EA\u8F93\u5165 /cast \u4ECE\u540D\u5355\u91CC\u9009\u3002";
}
function castDone(name2, count) {
  return `\u5929\u547D\u4E4B\u4EBA\u73B0\u4E3A ${name2}\uFF08${count} \u5F20\u89D2\u8272\u5361\uFF09\u3002`;
}
function exportDone(chars, path) {
  return `\u5DF2\u8A8A\u51FA ${chars} \u5B57\u4E66\u7A3F\uFF1A${path}`;
}
function sessionTitle(world, protagonist) {
  return `${world}\xB7${protagonist}`;
}
var FIRST_STEP_TEXT = "\u542F\u7A0B\u3002";
var COMMANDS_COPY = {
  new: {
    description: "\u8FDB\u5165\u65B0\u4E16\u754C\uFF1A\u5F39\u51FA\u754C\u56FE\u9009\u9898\u6750\u4E0E\u5929\u547D\u4E4B\u4EBA",
    hint: "\u4FEE\u4ED9 | \u672B\u4E16 | \u90FD\u5E02\u5F02\u80FD | \u73B0\u4EE3  [\u540D\u5B57]  [force]"
  },
  bind: {
    description: "\u6539\u6295\u4ED6\u754C\uFF08\u4F1A\u8986\u76D6\u672C\u4F1A\u8BDD\u5929\u4E66\uFF09",
    hint: "[\u754C\u540D] [force]"
  },
  cast: {
    description: "\u66F4\u6362\u5929\u547D\u4E4B\u4EBA",
    hint: "[\u540D\u5B57]"
  },
  "export-story": {
    description: "\u8A8A\u51FA\u6B64\u754C\u4E66\u7A3F\uFF08\u4E0D\u662F\u4E0A\u9762\u90A3\u4E2A\u4F1A\u8BDD\u65E5\u5FD7\u538B\u7F29\u5305\uFF09",
    hint: "[player]"
  }
};

// packages/dsh-infinite/dist/paths.js
import { createRequire } from "node:module";
import { statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
var PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
var require2 = createRequire(import.meta.url);
function firstExisting(candidates) {
  for (const candidate of candidates) {
    try {
      if (statSync(candidate).isDirectory())
        return candidate;
    } catch {
    }
  }
  return candidates[candidates.length - 1] ?? "";
}
function presetPackageRoot() {
  try {
    return dirname(require2.resolve("dsh-infinite-preset/package.json"));
  } catch {
    return null;
  }
}
function defaultTemplatesDir() {
  const pkg = presetPackageRoot();
  return firstExisting([
    ...pkg ? [join(pkg, "templates")] : [],
    join(PLUGIN_ROOT, "templates"),
    join(PLUGIN_ROOT, "..", "dsh-infinite-preset", "templates")
  ]);
}
function defaultPresetDir() {
  const pkg = presetPackageRoot();
  return firstExisting([
    ...pkg ? [join(pkg, "infinite-play")] : [],
    join(PLUGIN_ROOT, "preset", "infinite-play"),
    join(PLUGIN_ROOT, "..", "dsh-infinite-preset", "infinite-play")
  ]);
}
function resolveDshHome(config) {
  if (config.dshHome)
    return config.dshHome;
  if (process.env.DSH_HOME)
    return process.env.DSH_HOME;
  return join(homedir(), ".dsh");
}
function fallbackStoriesRoot(config) {
  if (config.dataDir)
    return config.dataDir;
  return join(resolveDshHome(config), "infinite", "stories");
}
function safeSessionId(id) {
  return id.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "session";
}
function resolveSessionDir(ctx, session, config) {
  try {
    const located = ctx.sessionPersistence?.locate?.(session.header ?? { id: session.id });
    if (located?.path)
      return dirname(located.path);
  } catch {
  }
  return join(fallbackStoriesRoot(config), safeSessionId(session.id));
}
function infiniteRoot(sessionDir) {
  return join(sessionDir, "infinite");
}
function templatesDir(config) {
  return config.templatesDir || defaultTemplatesDir();
}
function userPresetTarget(config) {
  return join(resolveDshHome(config), ".agent-presets", "infinite-play");
}

// packages/dsh-infinite/dist/story-files.js
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync as statSync2, writeFileSync } from "node:fs";
import { join as join2 } from "node:path";
var META_FILE = "meta.yml";
var WORLD_DIR = "worldbook";
var CHAR_DIR = "characters";
var PLOT_DIR = "plots";
var ARCHIVE_FILE = "archive.md";
var EXPORT_FILE = "export.txt";
function metaPath(root) {
  return join2(root, META_FILE);
}
function hasStory(root) {
  try {
    return statSync2(metaPath(root)).isFile();
  } catch {
    return false;
  }
}
function loadMeta(root) {
  if (!hasStory(root))
    return null;
  return parseStoryMeta(readFileSync(metaPath(root), "utf8"));
}
function saveMeta(root, meta) {
  mkdirSync(root, { recursive: true });
  writeFileSync(metaPath(root), formatStoryMeta(meta), "utf8");
}
function readMarkdownEntries(dir) {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  const entries = [];
  for (const name2 of names) {
    if (!name2.endsWith(".md"))
      continue;
    const full = join2(dir, name2);
    try {
      if (!statSync2(full).isFile())
        continue;
      entries.push(parseLoreEntry(readFileSync(full, "utf8"), name2.replace(/\.md$/i, "")));
    } catch {
    }
  }
  return entries;
}
function loadWorldbook(root) {
  return readMarkdownEntries(join2(root, WORLD_DIR)).filter((entry) => entry.category !== "\u5199\u6CD5" && entry.category !== "\u5267\u60C5");
}
function loadCharacters(root) {
  return readMarkdownEntries(join2(root, CHAR_DIR));
}
function loadPlots(root) {
  return readMarkdownEntries(join2(root, PLOT_DIR));
}
function listTemplatePlots(config, templateId) {
  return loadPlots(templatePath(config, templateId));
}
function listTemplateCharacters(config, templateId) {
  return loadCharacters(templatePath(config, templateId));
}
function applyOpening(root, plot) {
  mkdirSync(join2(root, WORLD_DIR), { recursive: true });
  writeFileSync(join2(root, WORLD_DIR, "opening.md"), [
    "---",
    "id: opening",
    `title: ${plot.title}`,
    "category: \u5F00\u7BC7",
    "constant: true",
    "keys: [\u5F00\u7BC7]",
    "order: 1",
    "---",
    plot.content,
    ""
  ].join("\n"), "utf8");
}
function loadArchive(root) {
  try {
    return readFileSync(join2(root, ARCHIVE_FILE), "utf8");
  } catch {
    return "";
  }
}
function saveArchive(root, text) {
  if (!text)
    return;
  mkdirSync(root, { recursive: true });
  writeFileSync(join2(root, ARCHIVE_FILE), text, "utf8");
}
function rewriteConstant(raw, constant) {
  if (/^constant:\s*\S+/m.test(raw))
    return raw.replace(/^constant:\s*\S+/m, `constant: ${constant}`);
  return raw.replace(/^---\r?\n/, `---
constant: ${constant}
`);
}
function applyProtagonistIdentity(root, name2) {
  mkdirSync(join2(root, CHAR_DIR), { recursive: true });
  let found = false;
  let names = [];
  try {
    names = readdirSync(join2(root, CHAR_DIR));
  } catch {
    names = [];
  }
  for (const file of names) {
    if (!file.endsWith(".md"))
      continue;
    const full = join2(root, CHAR_DIR, file);
    const raw = readFileSync(full, "utf8");
    const entry = parseLoreEntry(raw, file.replace(/\.md$/i, ""));
    const isHero = entry.title === name2;
    if (isHero)
      found = true;
    if (Boolean(entry.constant) !== isHero) {
      writeFileSync(full, rewriteConstant(raw, isHero), "utf8");
    }
  }
  if (!found)
    writeProtagonistCard(root, name2);
  return name2;
}
function appendStoryBind(session, data) {
  try {
    session.append?.("infinite/bind", data);
  } catch {
  }
}
function saveExport(root, text) {
  mkdirSync(root, { recursive: true });
  const path = join2(root, EXPORT_FILE);
  writeFileSync(path, text, "utf8");
  return path;
}
function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  for (const name2 of readdirSync(from)) {
    const src = join2(from, name2);
    const dest = join2(to, name2);
    if (statSync2(src).isDirectory())
      copyTree(src, dest);
    else
      writeFileSync(dest, readFileSync(src));
  }
}
function templatePath(config, templateId) {
  return join2(templatesDir(config), templateId);
}
function seedStory(root, templateId, config, force) {
  const src = templatePath(config, templateId);
  try {
    if (!statSync2(src).isDirectory())
      throw new Error(`template missing: ${templateId}`);
  } catch {
    throw new Error(`unknown or missing template "${templateId}" at ${src}`);
  }
  if (hasStory(root) && !force) {
    throw new Error("this session already has a story; pass force to replace it");
  }
  if (force && hasStory(root))
    rmSync(root, { recursive: true, force: true });
  copyTree(src, root);
  const seeded = loadMeta(root);
  const meta = {
    ...seeded ?? defaultMeta(templateId, defaultProtagonist(templateId)),
    templateId,
    protagonist: seeded?.protagonist || defaultProtagonist(templateId),
    pickedEventIds: [],
    pendingEventId: null,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  saveMeta(root, meta);
  return meta;
}
function writeProtagonistCard(root, name2) {
  mkdirSync(join2(root, CHAR_DIR), { recursive: true });
  const path = join2(root, CHAR_DIR, "protagonist.md");
  writeFileSync(path, [
    "---",
    "id: protagonist",
    `title: ${name2}`,
    "category: \u89D2\u8272",
    "constant: true",
    `keys: [${name2}, \u4E3B\u89D2]`,
    "order: 0",
    "---",
    `${name2}\u662F\u672C\u6545\u4E8B\u7684\u4E3B\u89D2\uFF0C\u7531\u7528\u6237\u626E\u6F14\u3002\u53D9\u8FF0\u4EE5\u4ED6\uFF08\u5979\uFF09\u7684\u611F\u77E5\u4E3A\u951A\u70B9\u3002`,
    ""
  ].join("\n"), "utf8");
}

// packages/dsh-infinite/dist/transcript.js
function blocksToText(value) {
  if (typeof value === "string")
    return value;
  if (!Array.isArray(value))
    return "";
  const parts = [];
  for (const block of value) {
    if (!block || typeof block !== "object")
      continue;
    const rec = block;
    if (typeof rec.text === "string")
      parts.push(rec.text);
  }
  return parts.join("");
}
function messageText(message) {
  if (!message || typeof message !== "object")
    return "";
  const rec = message;
  if (typeof rec.text === "string")
    return rec.text;
  return blocksToText(rec.content);
}
function eventToMessage(event) {
  if (event.type === "user/message") {
    const text = messageText(event.data?.message ?? event.data);
    return { role: "user", text };
  }
  if (event.type === "assistant/message") {
    const text = messageText(event.data?.message ?? event.data);
    return { role: "assistant", text };
  }
  return null;
}
function sessionMessages(session) {
  if (Array.isArray(session.events) && session.events.length > 0) {
    const out2 = [];
    for (const event of session.events) {
      const msg = eventToMessage(event);
      if (msg && msg.text.trim())
        out2.push(msg);
    }
    return out2;
  }
  const derived = session.deriveMessages?.() ?? [];
  const out = [];
  for (const item of derived) {
    if (!item || typeof item !== "object")
      continue;
    const rec = item;
    const role = rec.role;
    if (role !== "user" && role !== "assistant" && role !== "system")
      continue;
    const text = blocksToText(rec.content);
    if (text.trim())
      out.push({ role, text });
  }
  return out;
}
function recentText(session, last = 4) {
  const msgs = sessionMessages(session).filter((m) => m.role !== "system");
  return msgs.slice(-last).map((m) => m.role === "assistant" ? cleanProse(m.text) : m.text).join("\n");
}
function hasAssistantProse(session) {
  return sessionMessages(session).some((m) => m.role === "assistant" && cleanProse(m.text).length > 0);
}
function summaryFromCompaction(data) {
  if (!data)
    return "";
  if (typeof data.summary === "string")
    return data.summary;
  return blocksToText(data.summary);
}

// packages/dsh-infinite/dist/commands.js
import { readdirSync as readdirSync2 } from "node:fs";
function sessionOf(inv) {
  return inv.agent.session;
}
function knownTemplates(config) {
  try {
    return readdirSync2(templatesDir(config)).join(", ");
  } catch {
    return TOPIC_CHOICES.map((item) => item.label).join(", ");
  }
}
function topicQuestion() {
  return {
    id: "topic",
    header: ASK_HEADER,
    question: TOPIC_QUESTION,
    detail: TOPIC_DETAIL,
    options: TOPIC_CHOICES.map((item) => ({
      label: item.label,
      description: item.description
    }))
  };
}
function protagonistQuestion(templateId, config) {
  const fallback = defaultProtagonist(templateId);
  const cards = listTemplateCharacters(config, templateId);
  const seen = /* @__PURE__ */ new Set([KEEP_DEFAULT_PROTAGONIST]);
  const options = [
    { label: `${KEEP_DEFAULT_PROTAGONIST}\uFF08\u63A8\u8350\uFF09`, description: fallback }
  ];
  for (const card of cards) {
    if (seen.has(card.title))
      continue;
    seen.add(card.title);
    options.push({ label: card.title, description: card.content.slice(0, 48) });
  }
  return {
    id: "protagonist",
    header: ASK_HEADER,
    question: PROTAGONIST_QUESTION,
    detail: defaultBodyHint(fallback),
    options
  };
}
function openingQuestion(templateId, config) {
  const plots = listTemplatePlots(config, templateId).slice(0, 24);
  if (plots.length === 0)
    return null;
  return {
    id: "opening",
    header: ASK_HEADER,
    question: OPENING_QUESTION,
    detail: "\u70B9\u9009\u4E00\u5904\u843D\u8DB3\u3002\u4E5F\u53EF\u8D70\u6B64\u754C\u9ED8\u8BA4\u5F00\u5C40\u3002",
    options: [
      { label: `${KEEP_DEFAULT_OPENING}\uFF08\u63A8\u8350\uFF09`, description: "\u4F7F\u7528\u6B64\u754C\u81EA\u5E26\u7684\u5F00\u7BC7\u3002" },
      ...plots.map((plot) => ({
        label: plot.title,
        description: plot.content.slice(0, 56)
      }))
    ]
  };
}
function overwriteQuestion() {
  return {
    id: "overwrite",
    header: ASK_HEADER,
    question: OVERWRITE_QUESTION,
    options: [
      { label: OVERWRITE_YES, description: "\u6495\u6389\u672C\u4F1A\u8BDD\u65E7\u5929\u4E66\uFF0C\u6309\u65B0\u9009\u4E4B\u754C\u91CD\u62F7\u3002" },
      { label: OVERWRITE_NO, description: "\u7559\u5728\u5F53\u524D\u8FD9\u4E00\u754C\u3002" }
    ]
  };
}
function embarkQuestion(world, protagonist) {
  return {
    id: "embark",
    header: ASK_HEADER,
    question: "\u754C\u95E8\u5DF2\u5F00\uFF0C\u5982\u4F55\u843D\u8DB3\uFF1F",
    detail: embarkDetail(world, protagonist),
    options: [
      { label: EMBARK, description: "\u6309\u5F00\u7BC7\u5199\u4E0B\u7B2C\u4E00\u6BB5\uFF0C\u8E0F\u5165\u6B64\u754C\u3002" },
      { label: REPICK_OPENING, description: "\u6362\u4E00\u4E2A\u5F00\u573A\uFF0C\u5C1A\u672A\u542F\u7A0B\u3002" },
      { label: REPICK_PROTAGONIST, description: "\u6362\u4E00\u4E2A\u5929\u547D\u4E4B\u4EBA\uFF0C\u5C1A\u672A\u542F\u7A0B\u3002" }
    ]
  };
}
function applyProtagonist(root, templateId, chosen) {
  const name2 = isKeepDefaultChoice(chosen, KEEP_DEFAULT_PROTAGONIST) ? defaultProtagonist(templateId) : chosen;
  const meta = loadMeta(root);
  if (meta)
    saveMeta(root, { ...meta, protagonist: name2 });
  return applyProtagonistIdentity(root, name2);
}
function bindSnapshot(root, session) {
  const meta = loadMeta(root);
  if (!meta)
    return;
  appendStoryBind(session, {
    templateId: meta.templateId,
    protagonist: meta.protagonist,
    narrativeGuard: meta.narrativeGuard,
    progressionGuard: meta.progressionGuard,
    randomEvent: meta.randomEvent,
    pendingEventId: meta.pendingEventId,
    pickedEventIds: meta.pickedEventIds,
    dir: "infinite"
  });
}
function pinSessionTitle(session, world, protagonist) {
  try {
    session.append?.("session/title", {
      title: sessionTitle(world, protagonist),
      messageSeqs: [],
      source: { kind: "user" }
    });
  } catch {
  }
}
function wakeEmbark(inv) {
  const followup = inv.agent.followup;
  if (typeof followup !== "function")
    return false;
  try {
    followup({
      id: crypto.randomUUID(),
      role: "user",
      content: [{ type: "text", text: FIRST_STEP_TEXT }],
      source: { kind: "plugin", plugin: "dsh-infinite" }
    });
    return true;
  } catch {
    return false;
  }
}
async function confirmOverwrite(ctx, inv, root, force) {
  if (!hasStory(root) || force)
    return "ok";
  const answers = await askUser(ctx, inv, [overwriteQuestion()]);
  if (!answers)
    return "need-force";
  return pickAnswer(answers, "overwrite") === OVERWRITE_YES ? "ok" : "cancel";
}
async function afterGate(ctx, config, inv, root, templateId, protagonist) {
  const world = bookNameForTemplate(templateId);
  pinSessionTitle(sessionOf(inv), world, protagonist);
  const answers = await askUser(ctx, inv, [embarkQuestion(world, protagonist)]);
  if (!answers) {
    return { kind: "success", text: openedWaiting(world, protagonist) };
  }
  const picked = pickAnswer(answers, "embark");
  if (picked === REPICK_OPENING) {
    const ask = openingQuestion(templateId, config);
    if (ask) {
      const next = await askUser(ctx, inv, [ask]);
      const opening = next ? pickAnswer(next, "opening") : "";
      if (opening && !isKeepDefaultChoice(opening, KEEP_DEFAULT_OPENING)) {
        const plot = listTemplatePlots(config, templateId).find((item) => item.title === opening);
        if (plot)
          applyOpening(root, plot);
      }
    }
    return afterGate(ctx, config, inv, root, templateId, protagonist);
  }
  if (picked === REPICK_PROTAGONIST) {
    const next = await askUser(ctx, inv, [protagonistQuestion(templateId, config)]);
    const name2 = next ? applyProtagonist(root, templateId, pickAnswer(next, "protagonist")) : protagonist;
    bindSnapshot(root, sessionOf(inv));
    return afterGate(ctx, config, inv, root, templateId, name2);
  }
  if (picked !== EMBARK) {
    return { kind: "success", text: openedWaiting(world, protagonist) };
  }
  const woke = wakeEmbark(inv);
  return {
    kind: "success",
    text: woke ? openedEmbarked(world, protagonist) : openedWaiting(world, protagonist)
  };
}
async function handleNew(ctx, config, inv) {
  const { topic, force, rest } = parseCommandArgs(inv.rawInput);
  const namedProtagonist = rest.slice(1).join(" ").trim();
  const root = infiniteRoot(resolveSessionDir(ctx, sessionOf(inv), config));
  const overwrite = await confirmOverwrite(ctx, inv, root, force);
  if (overwrite === "cancel")
    return { kind: "success", text: CANCELLED };
  if (overwrite === "need-force")
    return { kind: "error", text: needForceText() };
  let templateId = topic ? resolveTemplateId(topic) : null;
  if (topic && !templateId) {
    return { kind: "error", text: unknownWorld(`"${topic}". ${knownTemplates(config)}`) };
  }
  if (!templateId) {
    const answers = await askUser(ctx, inv, [topicQuestion()]);
    if (!answers)
      return { kind: "error", text: pickWorldHint() };
    templateId = templateIdFromLabel(pickAnswer(answers, "topic"));
    if (!templateId)
      return { kind: "error", text: "\u672A\u9009\u5B9A\u4E00\u754C\u3002" };
  }
  let protagonist = namedProtagonist;
  if (!protagonist) {
    const answers = await askUser(ctx, inv, [protagonistQuestion(templateId, config)]);
    if (answers)
      protagonist = pickAnswer(answers, "protagonist");
  }
  let opening = "";
  const openingAsk = openingQuestion(templateId, config);
  if (openingAsk) {
    const answers = await askUser(ctx, inv, [openingAsk]);
    if (answers)
      opening = pickAnswer(answers, "opening");
  }
  try {
    seedStory(root, templateId, config, true);
    const name2 = applyProtagonist(root, templateId, protagonist);
    if (opening && !isKeepDefaultChoice(opening, KEEP_DEFAULT_OPENING)) {
      const plot = listTemplatePlots(config, templateId).find((item) => item.title === opening);
      if (plot)
        applyOpening(root, plot);
    }
    bindSnapshot(root, sessionOf(inv));
    return afterGate(ctx, config, inv, root, templateId, name2);
  } catch (error) {
    return { kind: "error", text: error instanceof Error ? error.message : String(error) };
  }
}
async function handleBind(ctx, config, inv) {
  const { topic, force } = parseCommandArgs(inv.rawInput);
  const root = infiniteRoot(resolveSessionDir(ctx, sessionOf(inv), config));
  if (!topic) {
    const meta = loadMeta(root);
    const answers = await askUser(ctx, inv, [{
      ...topicQuestion(),
      id: "bind",
      question: BIND_QUESTION,
      detail: meta ? `\u5F53\u524D\u7ACB\u4E8E\u300C${topicChoice(meta.templateId).label}\u300D\u3002\u6539\u6295\u4F1A\u8986\u76D6\u672C\u4F1A\u8BDD\u5929\u4E66\u3002` : "\u6B64\u4F1A\u8BDD\u5C1A\u65E0\u4E16\u754C\uFF0C\u9009\u4E00\u754C\u5373\u5165\u3002"
    }]);
    if (!answers) {
      if (!meta)
        return { kind: "error", text: noWorldYet() };
      return {
        kind: "success",
        text: `\u73B0\u754C ${meta.templateId}\uFF1B\u5929\u547D\u4E4B\u4EBA ${meta.protagonist || "\uFF08\u672A\u5B9A\uFF09"}\u3002`
      };
    }
    const picked = templateIdFromLabel(pickAnswer(answers, "bind"));
    if (!picked)
      return { kind: "error", text: "\u672A\u9009\u5B9A\u4E00\u754C\u3002" };
    const overwrite2 = await confirmOverwrite(ctx, inv, root, force);
    if (overwrite2 === "cancel")
      return { kind: "success", text: CANCELLED };
    if (overwrite2 === "need-force")
      return { kind: "error", text: needForceText() };
    try {
      const next = seedStory(root, picked, config, true);
      bindSnapshot(root, sessionOf(inv));
      return { kind: "success", text: boundTo(bookNameForTemplate(next.templateId)) };
    } catch (error) {
      return { kind: "error", text: error instanceof Error ? error.message : String(error) };
    }
  }
  const templateId = resolveTemplateId(topic);
  if (!templateId)
    return { kind: "error", text: unknownWorld(`"${topic}". ${knownTemplates(config)}`) };
  const overwrite = await confirmOverwrite(ctx, inv, root, force);
  if (overwrite === "cancel")
    return { kind: "success", text: CANCELLED };
  if (overwrite === "need-force")
    return { kind: "error", text: needForceText() };
  try {
    seedStory(root, templateId, config, true);
    bindSnapshot(root, sessionOf(inv));
    return { kind: "success", text: boundTo(bookNameForTemplate(templateId)) };
  } catch (error) {
    return { kind: "error", text: error instanceof Error ? error.message : String(error) };
  }
}
async function handleCast(ctx, config, inv) {
  let name2 = inv.rawInput.trim();
  const root = infiniteRoot(resolveSessionDir(ctx, sessionOf(inv), config));
  const meta = loadMeta(root);
  if (!meta)
    return { kind: "error", text: noWorldYet() };
  if (!name2) {
    const answers = await askUser(ctx, inv, [protagonistQuestion(meta.templateId, config)]);
    if (!answers)
      return { kind: "error", text: castNeedName() };
    name2 = pickAnswer(answers, "protagonist");
    if (!name2)
      return { kind: "error", text: "\u672A\u9009\u5B9A\u5929\u547D\u4E4B\u4EBA\u3002" };
  }
  const applied = applyProtagonist(root, meta.templateId, name2);
  bindSnapshot(root, sessionOf(inv));
  const cards = loadCharacters(root);
  return { kind: "success", text: castDone(applied, cards.length) };
}
function handleExport(ctx, config, inv) {
  const includePlayer = /\bplayer\b/i.test(inv.rawInput);
  const root = infiniteRoot(resolveSessionDir(ctx, sessionOf(inv), config));
  const meta = loadMeta(root);
  if (!meta)
    return { kind: "error", text: noWorldYet() };
  const title = bookNameForTemplate(meta.templateId);
  const text = exportTranscript(title, meta.protagonist, sessionMessages(sessionOf(inv)), includePlayer);
  const path = saveExport(root, text);
  return { kind: "success", text: exportDone(text.length, path) };
}
function registerCommands(ctx, config) {
  for (const [name2, copy] of Object.entries(COMMANDS_COPY)) {
    const handler = name2 === "new" ? handleNew : name2 === "bind" ? handleBind : name2 === "cast" ? handleCast : handleExport;
    ctx.effect(() => ctx.commands.register({
      name: name2,
      description: copy.description,
      input: { hint: copy.hint },
      handler: (inv) => handler(ctx, config, inv)
    }), `infinite.cmd.${name2}`);
  }
}

// packages/dsh-infinite/dist/covers-host.js
import { existsSync, readFileSync as readFileSync2, statSync as statSync3 } from "node:fs";
import { extname, join as join3, normalize as normalize2, sep } from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
import { dirname as dirname2 } from "node:path";
var STATIC_DIR = join3(dirname2(fileURLToPath2(import.meta.url)), "..", "static");
var MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};
function coversRoot(config) {
  return join3(dirname2(templatesDir(config)), "covers");
}
function safeCoverName(name2) {
  if (!/^[A-Za-z0-9._-]+$/.test(name2))
    return null;
  if (name2.includes(".."))
    return null;
  return name2;
}
function sendFile(res, file, method = "GET") {
  const ext = extname(file).toLowerCase();
  const type = MIME[ext] ?? "application/octet-stream";
  const body = readFileSync2(file);
  res.writeHead(200, {
    "content-type": type,
    "cache-control": "public, max-age=86400",
    "content-length": String(body.length)
  });
  if (method === "HEAD") {
    res.end();
    return;
  }
  res.end(body);
}
function resolveUnder(root, name2) {
  const safe = safeCoverName(name2);
  if (!safe)
    return null;
  const full = normalize2(join3(root, safe));
  const prefix = normalize2(root).toLowerCase() + sep;
  const candidate = full.toLowerCase();
  if (!candidate.startsWith(prefix) && candidate !== normalize2(root).toLowerCase())
    return null;
  return existsSync(full) && statSync3(full).isFile() ? full : null;
}
function registerCoverServer(ctx, config) {
  const web = typeof ctx.get === "function" ? ctx.get("webServer") : ctx.webServer;
  if (!web?.register)
    return;
  const pictures = coversRoot(config);
  const manifest = JSON.stringify(buildCoverManifest());
  ctx.effect(() => web.register({
    kind: "prefix",
    path: "/infinite",
    handler(req, res) {
      const method = req.method ?? "GET";
      if (method !== "GET" && method !== "HEAD") {
        res.writeHead(405, { allow: "GET, HEAD" });
        res.end();
        return;
      }
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const rest = url.pathname.replace(/^\/infinite\/?/, "");
      if (rest === "manifest.json") {
        res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        if (method === "HEAD") {
          res.end();
          return;
        }
        res.end(manifest);
        return;
      }
      if (rest === "cards.css" || rest === "cards.js") {
        const file = resolveUnder(STATIC_DIR, rest);
        if (!file) {
          res.writeHead(404);
          res.end("missing");
          return;
        }
        sendFile(res, file, method);
        return;
      }
      if (rest.startsWith("covers/")) {
        const file = resolveUnder(pictures, rest.slice("covers/".length));
        if (!file) {
          res.writeHead(404);
          res.end("missing cover");
          return;
        }
        sendFile(res, file, method);
        return;
      }
      res.writeHead(404);
      res.end("not found");
    }
  }), "infinite.covers");
  const tapIndex = web.tapIndex;
  if (typeof tapIndex === "function") {
    ctx.effect(() => tapIndex((html) => {
      if (html.includes("data-infinite-cards"))
        return html;
      const tags = '<link rel="stylesheet" href="/infinite/cards.css" data-infinite-cards><script type="module" src="/infinite/cards.js" data-infinite-cards></script>';
      return html.includes("</head>") ? html.replace("</head>", `${tags}</head>`) : `${html}${tags}`;
    }), "infinite.cards-html");
  }
}

// packages/dsh-infinite/dist/install-preset.js
import { mkdirSync as mkdirSync2, readdirSync as readdirSync3, readFileSync as readFileSync3, statSync as statSync4, writeFileSync as writeFileSync2 } from "node:fs";
import { dirname as dirname3, join as join4 } from "node:path";
function copyTree2(from, to) {
  mkdirSync2(to, { recursive: true });
  for (const name2 of readdirSync3(from)) {
    const src = join4(from, name2);
    const dest = join4(to, name2);
    if (statSync4(src).isDirectory())
      copyTree2(src, dest);
    else
      writeFileSync2(dest, readFileSync3(src));
  }
}
function installUserPreset(config) {
  const src = defaultPresetDir();
  try {
    if (!statSync4(src).isDirectory())
      return null;
  } catch {
    return null;
  }
  const dest = userPresetTarget(config);
  try {
    if (statSync4(join4(dest, "agent.cordis.yml")).isFile()) {
      let destPreset = "";
      try {
        destPreset = readFileSync3(join4(dest, "preset.yml"), "utf8");
      } catch {
        destPreset = "";
      }
      if (!/诸天万界/.test(destPreset)) {
        writeFileSync2(join4(dest, "preset.yml"), readFileSync3(join4(src, "preset.yml")));
        writeFileSync2(join4(dest, "agent.cordis.yml"), readFileSync3(join4(src, "agent.cordis.yml")));
      }
      return dest;
    }
  } catch {
  }
  mkdirSync2(dirname3(dest), { recursive: true });
  copyTree2(src, dest);
  return dest;
}

// packages/dsh-infinite/dist/lifecycle.js
function onSessionEvent(ctx, config, session, event) {
  const root = infiniteRoot(resolveSessionDir(ctx, session, config));
  const meta = loadMeta(root);
  if (!meta)
    return;
  if (event.type === "turn/start" && meta.randomEvent) {
    const pool = loadWorldbook(root).filter((entry) => entry.category !== "\u5199\u6CD5" && entry.category !== "\u5F00\u7BC7" && entry.category !== "\u5267\u60C5");
    const picked = pickRandomEventEntry(pool, recentText(session), meta.pickedEventIds);
    saveMeta(root, { ...meta, pendingEventId: picked?.id ?? null });
    return;
  }
  if (event.type === "turn/end") {
    const latest = loadMeta(root);
    if (!latest?.pendingEventId)
      return;
    const next = {
      ...latest,
      pickedEventIds: [...latest.pickedEventIds, latest.pendingEventId],
      pendingEventId: null
    };
    saveMeta(root, next);
    appendStoryBind(session, {
      templateId: next.templateId,
      protagonist: next.protagonist,
      pendingEventId: next.pendingEventId,
      pickedEventIds: next.pickedEventIds,
      dir: "infinite"
    });
    return;
  }
  if (event.type === "compaction/summary") {
    const summary = summaryFromCompaction(event.data);
    const text = formatArchive(summary, (/* @__PURE__ */ new Date()).toISOString(), loadArchive(root));
    saveArchive(root, text);
  }
}

// packages/dsh-infinite/dist/prompt.js
function storyRoot(ctx, assemble, config) {
  const session = assemble.agent?.session;
  if (!session)
    return null;
  const root = infiniteRoot(resolveSessionDir(ctx, session, config));
  return loadMeta(root) ? root : null;
}
function registerPrompt(ctx, config) {
  ctx.systemPrompt.section({
    name: "infinite:prose",
    order: 20,
    text: (assemble) => {
      const root = storyRoot(ctx, assemble, config);
      if (!root)
        return "";
      const parts = [buildProseOnlyGuard()];
      const meta = loadMeta(root);
      if (meta?.narrativeGuard)
        parts.push(buildNarrativeGuard());
      if (meta?.progressionGuard)
        parts.push(buildProgressionGuard());
      if (assemble.agent && !hasAssistantProse(assemble.agent.session)) {
        parts.push("\u6B64\u754C\u5C1A\u65E0\u6B63\u6587\u3002\u6839\u636E\u5929\u4E66\u5F00\u7BC7\u79CD\u5B50\uFF0C\u76F4\u63A5\u5199\u4E0B\u7B2C\u4E00\u6BB5\u53D9\u8FF0\uFF0C\u4E0D\u8981\u590D\u8FF0\u8BBE\u5B9A\u6761\u76EE\u3002\u5199\u5B8C\u540E\u63A5\u3010\u6B67\u8DEF\u3011\u4E09\u62E9\u4E0E\u300C\u4EA6\u53EF\u81EA\u5DF1\u5199\u300D\u3002");
      }
      return parts.join("\n\n");
    }
  });
  ctx.systemPrompt.context({
    name: "infinite:world",
    order: 10,
    text: (assemble) => {
      const session = assemble.agent?.session;
      const root = storyRoot(ctx, assemble, config);
      if (!session || !root)
        return "";
      const meta = loadMeta(root);
      if (!meta)
        return "";
      const world = buildWorldContext(loadWorldbook(root), recentText(session), bookNameForTemplate(meta.templateId), { maxChars: config.maxWorldChars });
      return world.text;
    }
  });
  ctx.systemPrompt.context({
    name: "infinite:characters",
    order: 11,
    text: (assemble) => {
      const session = assemble.agent?.session;
      const root = storyRoot(ctx, assemble, config);
      if (!session || !root)
        return "";
      const meta = loadMeta(root);
      if (!meta)
        return "";
      return buildCharacterContext(loadCharacters(root), recentText(session), meta.protagonist);
    }
  });
  ctx.systemPrompt.context({
    name: "infinite:event",
    order: 12,
    text: (assemble) => {
      const root = storyRoot(ctx, assemble, config);
      if (!root)
        return "";
      const meta = loadMeta(root);
      if (!meta?.randomEvent || !meta.pendingEventId)
        return "";
      const entry = loadWorldbook(root).find((e) => e.id === meta.pendingEventId);
      return entry ? formatRandomEvent(entry) : "";
    }
  });
  ctx.systemPrompt.context({
    name: "infinite:archive",
    order: 13,
    text: (assemble) => {
      const root = storyRoot(ctx, assemble, config);
      if (!root)
        return "";
      const archive = loadArchive(root).trim();
      if (!archive)
        return "";
      return `\u3010\u5267\u60C5\u6863\u6848\u3011\u4EE5\u4E0B\u4E3A\u538B\u7F29\u540E\u7684\u5267\u60C5\u8981\u70B9\uFF0C\u662F\u7EED\u5199\u4E00\u81F4\u6027\u7684\u4F9D\u636E\uFF08\u6B63\u6587\u4E2D\u4E0D\u8981\u590D\u8FF0\u6863\u6848\u6761\u76EE\uFF09\uFF1A
${archive}`;
    }
  });
}

// packages/dsh-infinite/dist/types.js
function resolveConfig(raw) {
  return {
    templatesDir: raw?.templatesDir ?? "",
    dataDir: raw?.dataDir ?? "",
    dshHome: raw?.dshHome ?? "",
    maxWorldChars: raw?.maxWorldChars ?? 8e3
  };
}

// packages/dsh-infinite/dist/index.js
var name = "dsh-infinite";
var inject = ["commands", "systemPrompt", "userQuestions"];
function apply(ctx, raw) {
  const config = resolveConfig(raw);
  installUserPreset(config);
  registerCoverServer(ctx, config);
  registerCommands(ctx, config);
  registerPrompt(ctx, config);
  ctx.effect(() => ctx.on("session/event", (...args) => {
    const session = args[0];
    const event = args[1];
    if (!session || !event)
      return;
    onSessionEvent(ctx, config, session, event);
  }), "infinite.session");
}
export {
  apply,
  inject,
  name
};
