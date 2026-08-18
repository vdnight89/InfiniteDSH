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
    createdAt: fields.createdAt?.trim() || (/* @__PURE__ */ new Date()).toISOString(),
    ...parseBool(fields.exportPending, false) ? { exportPending: true } : {},
    ...fields.exportTitle?.trim() ? { exportTitle: fields.exportTitle.trim() } : {},
    ...fields.exportCwd?.trim() ? { exportCwd: fields.exportCwd.trim().replace(/^['"]|['"]$/g, "") } : {}
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
    ...meta.exportPending ? ["exportPending: true"] : [],
    ...meta.exportTitle ? [`exportTitle: ${JSON.stringify(meta.exportTitle)}`] : [],
    ...meta.exportCwd ? [`exportCwd: ${JSON.stringify(meta.exportCwd)}`] : [],
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
  const constants2 = enabled.filter((e) => e.constant).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const matched = findMatchingEntries(enabled, recentText2).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const header = `\u3010\u4E16\u754C\u89C4\u5219\xB7${bookName}\u3011\uFF08\u4E16\u754C\u57FA\u7840\u89C4\u5219\uFF1A\u4EC5\u5B9A\u4E49\u821E\u53F0\u4E0E\u5E95\u5C42\u8BBE\u5B9A\uFF09`;
  const lines = [];
  for (const e of constants2.slice(0, opts.maxConstantEntries)) {
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
    constantCount: constants2.length
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
  return `\u3010\u53D9\u4E8B\u62A4\u680F\xB7\u5FC3\u91CC\u9075\u5B88\uFF0C\u7981\u6B62\u5199\u8FDB\u6B63\u6587\u3011
1. \u4E16\u754C\u662F\u6D3B\u7684\uFF1A\u8981\u6709 NPC\u3001\u52BF\u529B\u6216\u73AF\u5883\u4E8B\u4EF6\uFF1B\u4E0D\u8981\u6574\u6BB5\u53EA\u5269\u4E24\u4E2A\u4EBA\u8BF4\u8BDD\u3002
2. \u89D2\u8272\u7BA1\u7406\uFF1A\u4F18\u5148\u590D\u7528\u5DF2\u51FA\u573A\u7684\u4EBA\uFF1B\u6BCF\u6BB5\u6700\u591A\u65B0\u6765 1 \u4E2A\uFF1B\u540C\u65F6\u62A2\u620F\u7684\u4E0D\u8D85\u8FC7\u4E09\u56DB\u4E2A\u3002
3. \u4E3B\u89D2\u662F\u89C6\u89D2\u951A\u70B9\u3002`;
}
function buildProgressionGuard() {
  return `\u3010\u5267\u60C5\u63A8\u8FDB\xB7\u5FC3\u91CC\u9075\u5B88\uFF0C\u7981\u6B62\u5199\u8FDB\u6B63\u6587\u3011
1. \u6BCF\u6BB5\u63A8\u8FDB\u4E00\u4EF6\u4E8B\uFF1A\u65B0\u4E8B\u4EF6\u3001\u65B0\u4FE1\u606F\u3001\u51B2\u7A81\u3001\u5173\u7CFB\u3001\u6362\u573A\u6216\u60C5\u611F\u8F6C\u6298\u3002
2. \u4E0D\u8981\u91CD\u590D\u5DF2\u7ECF\u5199\u8FC7\u7684\u573A\u9762\u3002
3. \u6536\u5728\u4E00\u4E2A\u8FD8\u80FD\u5F80\u4E0B\u8D70\u7684\u94A9\u5B50\u4E0A\u3002`;
}
function buildProseOnlyGuard() {
  return `\u3010\u8F93\u51FA\u8981\u6C42\u3011\u4F60\u7684\u56DE\u590D\u4ECE\u7B2C\u4E00\u4E2A\u5B57\u8D77\u5C31\u662F\u5C0F\u8BF4\u53D9\u8FF0\u6216\u5BF9\u8BDD\u3002
\u7981\u6B62\u5199\u51FA\uFF1A\u6784\u601D\u3001\u63D0\u7EB2\u3001\u89C4\u5219\u590D\u8FF0\u3001\u89D2\u8272\u6E05\u5355\u3001\u573A\u666F\u8BF4\u660E\u3001\u5BF9\u81EA\u5DF1\u8BF4\u8BDD\u3001\u82F1\u6587\u6307\u4EE4\u3001\u62A4\u680F\u539F\u6587\u3002
\u4E0D\u8981\u8F93\u51FA\u7AE0\u8282\u540D\u3001\u533A\u5757\u6807\u7B7E\u3001markdown \u6807\u9898\u3001\u683C\u5F0F\u8BF4\u660E\u3002
\u5199\u5B8C\u6B63\u6587\u540E\u53E6\u8D77\u4E00\u5757\uFF1A
\u3010\u6B67\u8DEF\u3011
1. \uFF08\u4E0D\u8D85\u8FC7\u5341\u516D\u5B57\u7684\u5177\u4F53\u884C\u52A8\uFF09
2. \uFF08\u4E0D\u8D85\u8FC7\u5341\u516D\u5B57\u7684\u5177\u4F53\u884C\u52A8\uFF09
3. \uFF08\u4E0D\u8D85\u8FC7\u5341\u516D\u5B57\u7684\u5177\u4F53\u884C\u52A8\uFF09
\u4EA6\u53EF\u81EA\u5DF1\u5199\u4E00\u6761\u522B\u7684\u8DEF\u3002
\u3010\u6B67\u8DEF\u3011\u4E0D\u662F\u6B63\u6587\uFF0C\u4E0D\u8981\u5199\u6210\u89D2\u8272\u53F0\u8BCD\u3002`;
}

// packages/infinite-core/dist/export.js
var META_LINE = /^\s*【(?:章节名|场景信息|对话推荐|开局|世界规则|叙事护栏|剧情推进|输出要求|随机世界事件|角色|当前场景|歧路)】.*$/;
var BODY_TAG = /【正文】/g;
var FENCE_BLOCK = /```[\s\S]*?```/g;
var FORK_MARK = "\u3010\u6B67\u8DEF\u3011";
function stripTrailingFork(text) {
  const at = text.lastIndexOf(FORK_MARK);
  return at < 0 ? text : text.slice(0, at);
}
function cleanProse(text) {
  const withoutFences = text.replace(FENCE_BLOCK, "");
  const withoutFork = stripTrailingFork(withoutFences);
  const withoutMeta = withoutFork.split(/\r?\n/).filter((line) => !META_LINE.test(line) && !/^(?:亦可自己写一条)/.test(line.trim())).join("\n").replace(BODY_TAG, "");
  return withoutMeta.replace(/^\s*#{1,6}\s+.*$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
}
var PLANNING_MARKERS = [
  /We need answer/i,
  /Need obey/i,
  /output story body/i,
  /fiction narrative/i,
  /The user gave/i,
  /I need to (?:continue|write|be careful)/i,
  /Let's (?:craft|draft|write|final)/i,
  /Need to write/i,
  /Do not write plan/i,
  /Must ensure/i,
  /Option \d:/i,
  /用户让我写/,
  /我们需要回应/,
  /按照要求/,
  /需要遵守叙事护栏/,
  /我要推进剧情/,
  /让我构思/,
  /我写正文/,
  /当前场景：/,
  /已出场角色：/,
  /剧情要素：/,
  /不要输出章节名/,
  /同时活跃的主要角色/,
  /第三人称有限视角/
];
var PLANNING_LINE = /^(?:The |I |We |Need |Let's |Must |Could |Option |Count |Draft |Do not |Need to )/i;
var PLANNING_CN_LINE = /我们需要回应|按照要求|只写小说正文|第三人称有限|不要输出|我要推进|让我构思|用户让我|已出场角色|当前场景：|剧情要素：|Need to write|I need to|Let's draft|Let's write|Let's final|Must ensure|Do not write plan/;
function isPlanningParagraph(text) {
  const t = text.trim();
  if (!t)
    return true;
  if (PLANNING_LINE.test(t) || PLANNING_CN_LINE.test(t))
    return true;
  for (const marker of PLANNING_MARKERS) {
    if (marker.test(t))
      return true;
  }
  const letters = t.match(/[A-Za-z]/g)?.length ?? 0;
  const cjk = t.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  return letters >= 16 && letters > cjk * 0.35;
}
function isPlanningDump(text) {
  const t = text.trim();
  if (!t)
    return false;
  if (/^(?:We need|Need obey|The user |用户让我|我们需要回应|我要推进|让我构思|我写正文)/i.test(t))
    return true;
  const paras = t.split(/\n\s*\n/);
  const plan = paras.filter((p) => isPlanningParagraph(p)).length;
  return plan >= 2 || paras.length > 0 && plan / paras.length >= 0.5;
}
function extractStoryBody(text) {
  const cleaned = cleanProse(text);
  if (!cleaned)
    return "";
  const runs = [];
  let current = [];
  for (const para of splitUnits(cleaned)) {
    if (isPlanningParagraph(para)) {
      if (current.length > 0) {
        runs.push(current);
        current = [];
      }
      continue;
    }
    current.push(para);
  }
  if (current.length > 0)
    runs.push(current);
  for (let i = runs.length - 1; i >= 0; i -= 1) {
    const body = runs[i].join("\n\n").trim();
    const cjk = body.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
    if (cjk >= 24 && !isPlanningDump(body))
      return body;
  }
  if (isPlanningDump(cleaned))
    return "";
  return cleaned;
}
function cleanManuscript(text) {
  const withoutFork = stripTrailingFork(text.replace(FENCE_BLOCK, ""));
  const kept = withoutFork.split(/\n\s*\n/).filter((para) => !isPlanningParagraph(para) && !/^(?:亦可自己写一条)/.test(para.trim())).join("\n\n").replace(BODY_TAG, "").replace(/\n{3,}/g, "\n\n").trim();
  return isPlanningDump(kept) ? "" : kept;
}
function splitUnits(text) {
  const chunks = [];
  for (const para of text.split(/\n\s*\n/)) {
    if (para.includes("\n") && (isPlanningParagraph(para) || /[A-Za-z]{16,}/.test(para))) {
      for (const line of para.split(/\n+/)) {
        if (line.trim())
          chunks.push(line.trim());
      }
    } else if (para.trim()) {
      chunks.push(para);
    }
  }
  return chunks;
}
function isOpeningInstruction(text) {
  const t = text.trim();
  return t.startsWith("\u3010\u5F00\u5C40\u3011") || t.startsWith("[\u5F00\u5C40]") || t === "\u542F\u7A0B\u3002" || t === "\u542F\u7A0B";
}
function exportTranscript(title, protagonist, messages, includePlayer, world = "") {
  const chapters = [];
  let bridges = [];
  for (const message of messages) {
    if (message.role === "system")
      continue;
    if (isOpeningInstruction(message.text))
      continue;
    if (message.role === "user") {
      const body2 = message.text.trim();
      if (includePlayer && body2 && !isOpeningInstruction(body2))
        bridges.push(body2);
      continue;
    }
    const body = extractStoryBody(message.text);
    if (!body)
      continue;
    chapters.push({
      heading: chapterHeading(chapters.length + 1, body),
      body,
      bridges
    });
    bridges = [];
  }
  const lines = [`# ${title}`, ""];
  const series = world ? `\u8BF8\u5929\u4E07\u754C \xB7 ${world}` : "\u8BF8\u5929\u4E07\u754C";
  lines.push(`> ${series}`);
  if (protagonist)
    lines.push(`> \u5929\u547D\u4E4B\u4EBA\uFF1A${protagonist}`);
  lines.push(`> \u8A8A\u5F55\u4E8E ${formatExportDate(/* @__PURE__ */ new Date())}`, "", "---", "");
  for (const chapter of chapters) {
    for (const action of chapter.bridges) {
      lines.push(`*\u4F60\uFF1A${action}*`, "");
    }
    lines.push(`## ${chapter.heading}`, "", chapter.body, "");
  }
  if (bridges.length > 0 && includePlayer) {
    for (const action of bridges)
      lines.push(`*\u4F60\uFF1A${action}*`, "");
  }
  if (chapters.length === 0) {
    lines.push("\uFF08\u6B64\u7A3F\u5C1A\u65E0\u53EF\u4EE5\u8A8A\u5F55\u7684\u6B63\u6587\u3002\u6A21\u578B\u82E5\u628A\u6784\u601D\u5199\u51FA\u6765\u4E86\uFF0C\u90A3\u4E9B\u5B57\u4E0D\u4F1A\u8FDB\u4E66\u3002\uFF09", "");
  }
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}
`;
}
function countCjk(text) {
  return text.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
}
function manuscriptHasBody(text) {
  return /##\s*第/.test(text) && countCjk(text) >= 24 && !text.includes("\u6B64\u7A3F\u5C1A\u65E0\u53EF\u4EE5\u8A8A\u5F55");
}
function bindManuscript(title, protagonist, world, source) {
  const body = extractStoryBody(source) || source.trim();
  if (countCjk(body) < 24)
    return "";
  return [
    `# ${title}`,
    "",
    `> ${world ? `\u8BF8\u5929\u4E07\u754C \xB7 ${world}` : "\u8BF8\u5929\u4E07\u754C"}`,
    ...protagonist ? [`> \u5929\u547D\u4E4B\u4EBA\uFF1A${protagonist}`] : [],
    `> \u8A8A\u5F55\u4E8E ${formatExportDate(/* @__PURE__ */ new Date())}`,
    "",
    "---",
    "",
    `## ${chapterHeading(1, body)}`,
    "",
    body,
    ""
  ].join("\n");
}
function chapterHeading(index, body) {
  const name2 = clipChapterTitle(body);
  return name2 ? `\u7B2C${chineseChapter(index)}\u7AE0\u3000${name2}` : `\u7B2C${chineseChapter(index)}\u7AE0`;
}
function chineseChapter(index) {
  if (index <= 0)
    return String(index);
  if (index < 10)
    return "\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D\u4E03\u516B\u4E5D"[index - 1] ?? String(index);
  if (index === 10)
    return "\u5341";
  if (index < 20)
    return `\u5341${"\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D\u4E03\u516B\u4E5D"[index - 11]}`;
  if (index < 100) {
    const tens = Math.floor(index / 10);
    const ones = index % 10;
    const head = `${"\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D\u4E03\u516B\u4E5D"[tens - 1]}\u5341`;
    return ones === 0 ? head : `${head}${"\u4E00\u4E8C\u4E09\u56DB\u4E94\u516D\u4E03\u516B\u4E5D"[ones - 1]}`;
  }
  return String(index);
}
function clipChapterTitle(body) {
  const sentence = body.split(/[。！？\n]/).map((part) => part.trim()).find((part) => part.length >= 2) ?? "";
  const cut = sentence.replace(/^[“"]|[”"]$/g, "").replace(/[，、；：].*$/, "").trim();
  if (cut.length < 2)
    return "";
  return cut.slice(0, 12);
}
function formatExportDate(at = /* @__PURE__ */ new Date()) {
  return `${at.getFullYear()}\u5E74${at.getMonth() + 1}\u6708${at.getDate()}\u65E5`;
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

// packages/infinite-core/dist/forks.js
function parseForkOptions(text) {
  const at = text.lastIndexOf("\u3010\u6B67\u8DEF\u3011");
  if (at < 0)
    return [];
  const tail = text.slice(at + "\u3010\u6B67\u8DEF\u3011".length);
  const out = [];
  for (const line of tail.split(/\r?\n/)) {
    const row = line.match(/^\s*(?:[1-3][.)、]|[-*])\s+(.+?)\s*$/);
    if (!row)
      continue;
    const label = row[1].replace(/亦可自己写.*$/, "").trim();
    if (label)
      out.push(label);
    if (out.length >= 3)
      break;
  }
  return out;
}

// packages/infinite-core/dist/titles.js
function suggestExportTitles(world, protagonist, prose) {
  const titles = [];
  const pair = [world, protagonist].filter(Boolean).join("\xB7");
  if (pair)
    titles.push(pair);
  const quote = prose.match(/[“"]([^”"]{2,16})[”"]/);
  pushUnique(titles, clipTitle(quote?.[1] ?? ""));
  const sentence = prose.split(/[。！？\n]/).map((part) => part.trim()).find((part) => part.length >= 6) ?? "";
  pushUnique(titles, clipTitle(sentence.replace(/^[“"]|[”"]$/g, "")));
  return titles.slice(0, 3);
}
function safeBookFileName(title) {
  const cleaned = title.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
  return `${cleaned || "\u8BF8\u5929\u4E07\u754C\u4E66\u7A3F"}.md`;
}
function clipTitle(raw) {
  const cut = raw.replace(/[。！？…]+$/g, "").trim();
  if (cut.length < 4)
    return "";
  return cut.slice(0, 16);
}
function pushUnique(titles, next) {
  if (next && !titles.includes(next))
    titles.push(next);
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
function exportDone(chars, title, path, revealed) {
  const open = revealed ? "\u5DF2\u6253\u5F00\u6240\u5728\u6587\u4EF6\u5939\u3002" : "\u53F3\u4FA7\u6587\u4EF6\u6811\u5373\u53EF\u6253\u5F00\u3002";
  return `\u5DF2\u8A8A\u51FA ${chars} \u5B57\u4E66\u7A3F\u300A${title}\u300B\uFF1A${path}\u3002${open}`;
}
function exportPolishing(title, path) {
  return `\u8349\u7A3F\u300A${title}\u300B\u5DF2\u843D\u4E0B\uFF1A${path}\u3002\u53D9\u4E8B\u8005\u6B63\u5728\u6DA6\u8272\u6392\u7248\uFF0C\u5B8C\u6210\u540E\u8986\u76D6\u540C\u4E00\u4EFD\u3002\u65E5\u671F\u5DF2\u5199\u597D\uFF0C\u4E0D\u5FC5\u8C03\u5DE5\u5177\u3002`;
}
function exportKeptDraft(title) {
  return `\u6DA6\u8272\u672A\u6210\u4E66\uFF0C\u5DF2\u4FDD\u7559\u8349\u7A3F\u300A${title}\u300B\u3002\u53EF\u518D /export-story\u3002`;
}
function exportNoProse() {
  return "\u6B64\u754C\u5C1A\u65E0\u53EF\u8A8A\u7684\u5C0F\u8BF4\u6B63\u6587\u3002\u6A21\u578B\u82E5\u53EA\u5199\u4E86\u6784\u601D\uFF0C\u8BF7\u5148\u5199\u51FA\u6545\u4E8B\u518D\u8A8A\u3002";
}
function sessionTitle(world, protagonist) {
  return `${world}\xB7${protagonist}`;
}
var FIRST_STEP_TEXT = "\u542F\u7A0B\u3002";
var FORK_QUESTION = "\u8D70\u54EA\u4E00\u6761\u6B67\u8DEF\uFF1F";
var FORK_DETAIL = "\u70B9\u4E0A\u9762\u4E09\u6761\u4E4B\u4E00\u3002\u8981\u81EA\u5DF1\u8D70\uFF0C\u5199\u5728\u4E0B\u65B9\u300C\u8F93\u5165\u4F60\u7684\u7B54\u6848\u300D\u3002";
var TITLE_QUESTION = "\u6B64\u7A3F\u5982\u4F55\u9898\u540D\uFF1F";
var TITLE_DETAIL = "\u70B9\u4E00\u4E2A\u62DF\u9898\uFF0C\u6216\u5728\u4E0B\u65B9\u81EA\u5DF1\u5199\u3002";
function isEmbarkChoice(picked) {
  const t = picked.trim();
  return t === EMBARK || t === FIRST_STEP_TEXT || t.startsWith(EMBARK);
}
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
    description: "\u8BF7\u53D9\u4E8B\u8005\u6DA6\u8272\u6392\u7248\uFF0C\u8A8A\u6210\u7CBE\u6392 Markdown \u4E66\u7A3F",
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
var EXPORT_FILE = "export.md";
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
function saveExport(root, text) {
  mkdirSync(root, { recursive: true });
  const path = join2(root, EXPORT_FILE);
  writeFileSync(path, text, "utf8");
  return path;
}
function saveNamedExport(dir, fileName, text) {
  mkdirSync(dir, { recursive: true });
  const path = join2(dir, fileName);
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
function isNarrativeBlock(block) {
  if (typeof block.text !== "string" || !block.text)
    return false;
  if (!block.type || block.type === "text")
    return true;
  return false;
}
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
    if (isNarrativeBlock(rec))
      parts.push(rec.text);
  }
  return parts.join("\n\n");
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
function fromDeriveMessages(session) {
  let derived = [];
  try {
    derived = session.deriveMessages?.() ?? [];
  } catch {
    derived = [];
  }
  const out = [];
  for (const item of derived) {
    if (!item || typeof item !== "object")
      continue;
    const rec = item;
    const role = rec.role;
    if (role !== "user" && role !== "assistant" && role !== "system")
      continue;
    const text = typeof rec.text === "string" ? rec.text : blocksToText(rec.content);
    if (text.trim())
      out.push({ role, text });
  }
  return out;
}
function fromEvents(session) {
  if (!Array.isArray(session.events))
    return [];
  const out = [];
  for (const event of session.events) {
    const msg = eventToMessage(event);
    if (msg && msg.text.trim())
      out.push(msg);
  }
  return out;
}
function sessionMessages(session) {
  const derived = fromDeriveMessages(session);
  if (derived.some((item) => item.role === "assistant" && item.text.trim()))
    return derived;
  const events = fromEvents(session);
  return events.length > 0 ? events : derived;
}
function collectExportSource(session) {
  const messages = sessionMessages(session);
  const extracted = messages.filter((message) => message.role === "assistant").map((message) => extractStoryBody(message.text)).filter((text) => text.trim().length > 0);
  if (extracted.length > 0)
    return extracted.join("\n\n");
  const harvested = messages.filter((message) => message.role === "assistant").map((message) => harvestFictionLines(message.text)).filter((text) => text.trim().length > 0);
  return harvested.join("\n\n");
}
function harvestFictionLines(text) {
  const cleaned = cleanProse(text);
  if (!cleaned)
    return "";
  const kept = [];
  for (const line of cleaned.split(/\n+/)) {
    const t = line.trim();
    if (!t)
      continue;
    const cjk = t.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
    const letters = t.match(/[A-Za-z]/g)?.length ?? 0;
    if (cjk < 8 || letters > cjk)
      continue;
    if (/我们需要回应|按照要求|用户让我|让我构思|我写正文|当前场景：|已出场角色：/.test(t))
      continue;
    kept.push(t);
  }
  return kept.join("\n\n");
}
function recentText(session, last = 4) {
  const msgs = sessionMessages(session).filter((m) => m.role !== "system");
  return msgs.slice(-last).map((m) => m.role === "assistant" ? extractStoryBody(m.text) : m.text).filter((text) => text.trim().length > 0).join("\n");
}
function hasAssistantProse(session) {
  return sessionMessages(session).some((m) => m.role === "assistant" && extractStoryBody(m.text).length > 0);
}
function lastAssistantRaw(session) {
  const msgs = sessionMessages(session);
  for (let i = msgs.length - 1; i >= 0; i -= 1) {
    if (msgs[i]?.role === "assistant")
      return msgs[i].text;
  }
  return "";
}
function summaryFromCompaction(data) {
  if (!data)
    return "";
  if (typeof data.summary === "string")
    return data.summary;
  return blocksToText(data.summary);
}

// packages/dsh-infinite/dist/polish.js
function polishPrompt(title, world, protagonist, source) {
  const dated = formatExportDate();
  return [
    `\u3010\u91CD\u8A8A\u6210\u4E66\u3011\u8FD9\u4E00\u56DE\u5408\u53EA\u8F93\u51FA\u5B8C\u6574 Markdown \u4E66\u7A3F\u3002`,
    `\u7981\u6B62\u8C03\u7528\u4EFB\u4F55\u5DE5\u5177\uFF0C\u5305\u62EC bash\u3001runshell\u3001date\u3001\u8BFB\u6587\u4EF6\u3002\u65E5\u671F\u5DF2\u7ECF\u5199\u597D\uFF0C\u7167\u6284\u5373\u53EF\u3002`,
    `\u4E0D\u8981\u3010\u6B67\u8DEF\u3011\uFF0C\u4E0D\u8981\u6784\u601D\uFF0C\u4E0D\u8981\u82F1\u6587\uFF0C\u4E0D\u8981\u89E3\u91CA\uFF0C\u4E0D\u8981 tool_calls\u3002\u7B2C\u4E00\u4E2A\u5B57\u5FC5\u987B\u662F #\u3002`,
    `\u4E66\u540D\u300A${title}\u300B\u3002\u8BF8\u5929\u4E07\u754C \xB7 ${world}\u3002\u5929\u547D\u4E4B\u4EBA\uFF1A${protagonist}\u3002`,
    `\u683C\u5F0F\u5FC5\u987B\u662F\uFF1A`,
    `# ${title}`,
    `> \u8BF8\u5929\u4E07\u754C \xB7 ${world}`,
    `> \u5929\u547D\u4E4B\u4EBA\uFF1A${protagonist}`,
    `> \u8A8A\u5F55\u4E8E ${dated}`,
    ``,
    `---`,
    ``,
    `## \u7B2C\u4E00\u7AE0\u3000\uFF08\u4ECE\u6B63\u6587\u62BD\u7684\u77ED\u9898\uFF09`,
    `\uFF08\u6DA6\u8272\u540E\u7684\u6BB5\u843D\uFF09`,
    ``,
    `\u540E\u9762\u6309\u60C5\u8282\u81EA\u7136\u5206\u7AE0\u3002\u6309\u65F6\u95F4\u987A\u5E8F\u91CD\u5199\u7D20\u6750\u91CC\u7684\u6545\u4E8B\uFF0C\u8865\u4E0A\u65AD\u88C2\uFF0C\u4E0D\u8981\u53E6\u8D77\u4E00\u672C\u65E0\u5173\u7684\u4E66\u3002`,
    ``,
    `\u3010\u7D20\u6750\u3011`,
    source.slice(0, 12e3)
  ].join("\n");
}
function isFailedPolish(text) {
  const raw = text.trim();
  if (!raw)
    return true;
  if (/runshell|tool_calls|tool-call|<invoke\s|<\/tool/i.test(raw))
    return true;
  if (/^\s*(?:We need|Need |The user |用户让我)/i.test(raw))
    return true;
  return false;
}
function finalizeManuscript(raw, title, world, protagonist) {
  if (isFailedPolish(raw))
    return "";
  const body = cleanManuscript(raw);
  if (!body || isFailedPolish(body) || countCjk(body) < 24)
    return "";
  if (/^#\s+\S/m.test(body))
    return `${body.trim()}
`;
  return [
    `# ${title}`,
    "",
    `> \u8BF8\u5929\u4E07\u754C \xB7 ${world}`,
    `> \u5929\u547D\u4E4B\u4EBA\uFF1A${protagonist}`,
    `> \u8A8A\u5F55\u4E8E ${formatExportDate()}`,
    "",
    "---",
    "",
    body,
    ""
  ].join("\n");
}

// packages/dsh-infinite/dist/reveal.js
import { spawn } from "node:child_process";
import { dirname as dirname2 } from "node:path";
function revealFile(filePath) {
  if (process.env.VITEST)
    return false;
  try {
    if (process.platform === "win32") {
      spawn("explorer.exe", [`/select,${filePath}`], { detached: true, stdio: "ignore" }).unref();
      return true;
    }
    if (process.platform === "darwin") {
      spawn("open", ["-R", filePath], { detached: true, stdio: "ignore" }).unref();
      return true;
    }
    spawn("xdg-open", [dirname2(filePath)], { detached: true, stdio: "ignore" }).unref();
    return true;
  } catch {
    return false;
  }
}

// packages/dsh-infinite/dist/wake.js
function pluginUserMessage(text) {
  return {
    id: crypto.randomUUID(),
    role: "user",
    content: [{ type: "text", text }],
    source: { kind: "plugin", plugin: "dsh-infinite" }
  };
}
function wakeAgent(agent, text) {
  if (!agent || !text.trim())
    return false;
  const message = pluginUserMessage(text);
  if (tryCall(() => agent.followup?.(message)))
    return true;
  if (tryCall(() => agent.send?.(message, "next-turn", true)))
    return true;
  if (tryCall(() => agent.steer?.(message)))
    return true;
  return false;
}
function wakeSoon(agent, text) {
  if (wakeAgent(agent, text))
    return true;
  if (!agent)
    return false;
  setTimeout(() => {
    wakeAgent(agent, text);
  }, 0);
  return true;
}
function liveAgent(ctx, session) {
  const agents = typeof ctx.get === "function" ? ctx.get("agents") : void 0;
  if (session.id && typeof agents?.get === "function") {
    const found = agents.get(session.id);
    if (found)
      return found;
  }
  return void 0;
}
function tryCall(fn) {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
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
  return wakeSoon(inv.agent, FIRST_STEP_TEXT);
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
    return afterGate(ctx, config, inv, root, templateId, name2);
  }
  if (!isEmbarkChoice(picked)) {
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
  const cards = loadCharacters(root);
  return { kind: "success", text: castDone(applied, cards.length) };
}
async function handleExport(ctx, config, inv) {
  const includePlayer = /\bplayer\b/i.test(inv.rawInput);
  const session = sessionOf(inv);
  const root = infiniteRoot(resolveSessionDir(ctx, session, config));
  const meta = loadMeta(root);
  if (!meta)
    return { kind: "error", text: noWorldYet() };
  const world = bookNameForTemplate(meta.templateId);
  const messages = sessionMessages(session);
  const prose = collectExportSource(session);
  if (!prose.trim())
    return { kind: "error", text: exportNoProse() };
  const suggestions = suggestExportTitles(world, meta.protagonist, prose);
  let title = suggestions[0] || sessionTitle(world, meta.protagonist);
  const answers = await askUser(ctx, inv, [{
    id: "title",
    header: ASK_HEADER,
    question: TITLE_QUESTION,
    detail: TITLE_DETAIL,
    options: suggestions.map((label, index) => ({
      label,
      description: index === 0 ? "\u62DF\u9898\uFF08\u63A8\u8350\uFF09" : "\u53E6\u62DF"
    }))
  }]);
  if (answers) {
    const picked = pickAnswer(answers, "title");
    if (picked)
      title = picked;
  }
  const destDir = session.header?.cwd || process.cwd();
  let book = exportTranscript(title, meta.protagonist, messages, includePlayer, world);
  if (!manuscriptHasBody(book))
    book = bindManuscript(title, meta.protagonist, world, prose);
  if (!manuscriptHasBody(book))
    return { kind: "error", text: exportNoProse() };
  saveExport(root, book);
  const dest = saveNamedExport(destDir, safeBookFileName(title), book);
  revealFile(dest);
  saveMeta(root, {
    ...meta,
    exportPending: true,
    exportTitle: title,
    exportCwd: destDir
  });
  const woke = wakeSoon(inv.agent, polishPrompt(title, world, meta.protagonist, prose));
  if (!woke)
    return { kind: "success", text: exportDone(book.length, title, dest, true) };
  return { kind: "success", text: exportPolishing(title, dest) };
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
import { dirname as dirname3 } from "node:path";
var STATIC_DIR = join3(dirname3(fileURLToPath2(import.meta.url)), "..", "static");
var MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};
function coversRoot(config) {
  return join3(dirname3(templatesDir(config)), "covers");
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
import { dirname as dirname4, join as join4 } from "node:path";
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
      let destPersona = "";
      try {
        destPersona = readFileSync3(join4(dest, "agent.cordis.yml"), "utf8");
      } catch {
        destPersona = "";
      }
      if (!/诸天万界/.test(destPreset) || !/禁止把思考/.test(destPersona)) {
        writeFileSync2(join4(dest, "preset.yml"), readFileSync3(join4(src, "preset.yml")));
        writeFileSync2(join4(dest, "agent.cordis.yml"), readFileSync3(join4(src, "agent.cordis.yml")));
      }
      return dest;
    }
  } catch {
  }
  mkdirSync2(dirname4(dest), { recursive: true });
  copyTree2(src, dest);
  return dest;
}

// packages/dsh-infinite/dist/forks-host.js
var inFlight = /* @__PURE__ */ new Set();
async function offerForks(ctx, session) {
  const key = session.id;
  if (!key || inFlight.has(key))
    return;
  const options = parseForkOptions(lastAssistantRaw(session));
  if (options.length === 0)
    return;
  const agent = liveAgent(ctx, session);
  if (!agent)
    return;
  inFlight.add(key);
  try {
    const answers = await askUser(ctx, { agent, signal: new AbortController().signal }, [{
      id: "fork",
      header: ASK_HEADER,
      question: FORK_QUESTION,
      detail: FORK_DETAIL,
      options: options.map((label, index) => ({
        label,
        description: `\u6B67\u8DEF ${index + 1}`
      }))
    }]);
    if (!answers)
      return;
    const picked = pickAnswer(answers, "fork");
    if (!picked)
      return;
    wakeSoon(agent, picked);
  } finally {
    inFlight.delete(key);
  }
}

// packages/dsh-infinite/dist/lifecycle.js
function onSessionEvent(ctx, config, session, event) {
  const root = infiniteRoot(resolveSessionDir(ctx, session, config));
  const meta = loadMeta(root);
  if (!meta)
    return;
  if (event.type === "turn/start" && meta.exportPending)
    return;
  if (event.type === "turn/start" && meta.randomEvent) {
    const pool = loadWorldbook(root).filter((entry) => entry.category !== "\u5199\u6CD5" && entry.category !== "\u5F00\u7BC7" && entry.category !== "\u5267\u60C5");
    const picked = pickRandomEventEntry(pool, recentText(session), meta.pickedEventIds);
    saveMeta(root, { ...meta, pendingEventId: picked?.id ?? null });
    return;
  }
  if (event.type === "turn/end") {
    const latest = loadMeta(root);
    if (latest?.exportPending) {
      finishPolishExport(root, session, latest);
      return;
    }
    if (latest?.pendingEventId) {
      const next = {
        ...latest,
        pickedEventIds: [...latest.pickedEventIds, latest.pendingEventId],
        pendingEventId: null
      };
      saveMeta(root, next);
    }
    void offerForks(ctx, session);
    return;
  }
  if (event.type === "compaction/summary") {
    const summary = summaryFromCompaction(event.data);
    const text = formatArchive(summary, (/* @__PURE__ */ new Date()).toISOString(), loadArchive(root));
    saveArchive(root, text);
  }
}
function finishPolishExport(root, session, meta) {
  const title = meta.exportTitle || meta.protagonist || "\u8BF8\u5929\u4E07\u754C\u4E66\u7A3F";
  const world = bookNameForTemplate(meta.templateId);
  const destDir = meta.exportCwd || session.header?.cwd || process.cwd();
  const book = finalizeManuscript(lastAssistantRaw(session), title, world, meta.protagonist);
  if (book) {
    const dest = saveNamedExport(destDir, safeBookFileName(title), book);
    saveExport(root, book);
    revealFile(dest);
    session.append?.("command/done", {
      kind: "success",
      text: exportDone(book.length, title, dest, true)
    });
  } else {
    session.append?.("command/done", {
      kind: "success",
      text: exportKeptDraft(title)
    });
  }
  saveMeta(root, {
    version: meta.version,
    templateId: meta.templateId,
    protagonist: meta.protagonist,
    narrativeGuard: meta.narrativeGuard,
    progressionGuard: meta.progressionGuard,
    randomEvent: meta.randomEvent,
    pickedEventIds: meta.pickedEventIds,
    pendingEventId: meta.pendingEventId,
    createdAt: meta.createdAt
  });
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
      const meta = loadMeta(root);
      if (meta?.exportPending) {
        return "\u8FD9\u4E00\u56DE\u5408\u662F\u91CD\u8A8A\u6210\u4E66\u3002\u53EA\u8F93\u51FA\u5B8C\u6574 Markdown \u4E66\u7A3F\u3002\u7981\u6B62\u8C03\u7528\u4EFB\u4F55\u5DE5\u5177\u3002\u4E0D\u8981\u3010\u6B67\u8DEF\u3011\uFF0C\u4E0D\u8981\u6784\u601D\uFF0C\u4E0D\u8981\u82F1\u6587\uFF0C\u4E0D\u8981\u590D\u8FF0\u62A4\u680F\u3002\u7B2C\u4E00\u4E2A\u5B57\u5FC5\u987B\u662F #\u3002";
      }
      const parts = [buildProseOnlyGuard()];
      if (meta?.narrativeGuard)
        parts.push(buildNarrativeGuard());
      if (meta?.progressionGuard)
        parts.push(buildProgressionGuard());
      if (assemble.agent && !hasAssistantProse(assemble.agent.session)) {
        parts.push("\u6B64\u754C\u5C1A\u65E0\u6B63\u6587\u3002\u6839\u636E\u5929\u4E66\u5F00\u7BC7\u79CD\u5B50\u76F4\u63A5\u5F00\u5199\uFF0C\u4E0D\u8981\u590D\u8FF0\u8BBE\u5B9A\uFF0C\u4E0D\u8981\u5148\u5217\u63D0\u7EB2\u3002\u5199\u5B8C\u540E\u63A5\u3010\u6B67\u8DEF\u3011\u4E09\u62E9\u3002");
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
      if (!meta || meta.exportPending)
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
      if (!meta || meta.exportPending)
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
      if (meta?.exportPending || !meta?.randomEvent || !meta.pendingEventId)
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
      if (loadMeta(root)?.exportPending)
        return "";
      const archive = loadArchive(root).trim();
      if (!archive)
        return "";
      return `\u3010\u5267\u60C5\u6863\u6848\u3011\u4EE5\u4E0B\u4E3A\u538B\u7F29\u540E\u7684\u5267\u60C5\u8981\u70B9\uFF0C\u662F\u7EED\u5199\u4E00\u81F4\u6027\u7684\u4F9D\u636E\uFF08\u6B63\u6587\u4E2D\u4E0D\u8981\u590D\u8FF0\u6863\u6848\u6761\u76EE\uFF09\uFF1A
${archive}`;
    }
  });
}

// packages/dsh-infinite/dist/repair-sessions.js
import { copyFileSync, existsSync as existsSync2, readdirSync as readdirSync4, readFileSync as readFileSync4, renameSync, unlinkSync, writeFileSync as writeFileSync3 } from "node:fs";
import { join as join5 } from "node:path";
import { constants, zstdCompressSync, zstdDecompressSync } from "node:zlib";
var LEGACY_BIND_TYPE = "infinite/bind";
var BACKUP_SUFFIX = ".bak-infinite";
var TMP_SUFFIX = ".tmp-infinite";
var ZSTD_MAGIC = 4247762216;
var CHECKSUM_OPTIONS = { params: { [constants.ZSTD_c_checksumFlag]: 1 } };
function isSessionLogName(name2) {
  return name2 === "session.jsonl" || name2 === "session.jsonl.zstd";
}
function repairLegacyBindEvents(config) {
  return repairSessionTree(join5(resolveDshHome(config), "sessions"));
}
function repairSessionTree(root) {
  const files = [];
  const repaired = [];
  let failed = 0;
  collectSessionLogs(root, files);
  for (const file of files) {
    try {
      if (repairSessionLog(file) === "repaired")
        repaired.push(file);
    } catch {
      failed += 1;
    }
  }
  return { scanned: files.length, repaired: repaired.length, failed, files: repaired };
}
function repairSessionLog(path) {
  const raw = readFileSync4(path);
  if (path.endsWith(".zstd") || isZstd(raw)) {
    const next = patchZstd(raw);
    if (!next)
      return "clean";
    replaceFile(path, next);
    return "repaired";
  }
  const patched = patchJsonl(raw.toString("utf8"));
  if (patched.changed === 0)
    return "clean";
  replaceFile(path, Buffer.from(patched.text, "utf8"));
  return "repaired";
}
function patchJsonl(text) {
  const lines = text.split("\n");
  let changed = 0;
  const next = lines.map((line) => {
    if (!line)
      return line;
    try {
      const parsed = JSON.parse(line);
      if (parsed.type === LEGACY_BIND_TYPE && parsed.ignorable !== true) {
        parsed.ignorable = true;
        changed += 1;
        return JSON.stringify(parsed);
      }
    } catch {
    }
    return line;
  });
  return { text: next.join("\n"), changed };
}
function collectSessionLogs(root, acc) {
  let names;
  try {
    names = readdirSync4(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of names) {
    const full = join5(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git")
        continue;
      collectSessionLogs(full, acc);
      continue;
    }
    if (entry.isFile() && isSessionLogName(entry.name))
      acc.push(full);
  }
}
function isZstd(buffer) {
  return buffer.length >= 4 && buffer.readUInt32LE(0) === ZSTD_MAGIC;
}
function patchZstd(buffer) {
  const { frames, tornStart } = scanZstdFrames(buffer);
  const out = [];
  let changed = 0;
  for (const frame of frames) {
    const raw = buffer.subarray(frame.start, frame.end);
    const plain = zstdDecompressSync(raw).toString("utf8");
    const patched = patchJsonl(plain);
    if (patched.changed === 0) {
      out.push(Buffer.from(raw));
      continue;
    }
    changed += patched.changed;
    out.push(zstdCompressSync(Buffer.from(patched.text, "utf8"), CHECKSUM_OPTIONS));
  }
  if (tornStart !== void 0)
    out.push(buffer.subarray(tornStart));
  if (changed === 0)
    return null;
  return Buffer.concat(out);
}
function scanZstdFrames(buffer, maxFrames = Number.POSITIVE_INFINITY) {
  const frames = [];
  let offset = 0;
  while (offset < buffer.length) {
    const start = offset;
    if (buffer.length - offset < 4)
      return { frames, tornStart: start };
    if (buffer.readUInt32LE(offset) !== ZSTD_MAGIC) {
      throw new Error(`corrupt Zstandard session log: invalid frame magic at byte ${offset}`);
    }
    offset += 4;
    if (offset === buffer.length)
      return { frames, tornStart: start };
    const descriptor = buffer.readUInt8(offset);
    offset += 1;
    if ((descriptor & 24) !== 0) {
      throw new Error(`corrupt Zstandard session log: reserved frame-header bit at byte ${offset - 1}`);
    }
    const contentSizeFlag = descriptor >>> 6;
    const singleSegment = (descriptor & 32) !== 0;
    const checksum = (descriptor & 4) !== 0;
    const dictionaryFlag = descriptor & 3;
    const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag;
    const contentSizeBytes = contentSizeFlag === 0 ? singleSegment ? 1 : 0 : 1 << contentSizeFlag;
    const remainingHeaderBytes = (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes;
    if (buffer.length - offset < remainingHeaderBytes)
      return { frames, tornStart: start };
    offset += remainingHeaderBytes;
    for (; ; ) {
      if (buffer.length - offset < 3)
        return { frames, tornStart: start };
      const blockHeader = buffer.readUIntLE(offset, 3);
      offset += 3;
      const lastBlock = (blockHeader & 1) !== 0;
      const blockType = blockHeader >>> 1 & 3;
      const blockSize = blockHeader >>> 3;
      if (blockType === 3) {
        throw new Error(`corrupt Zstandard session log: reserved block type at byte ${offset - 3}`);
      }
      const payloadBytes = blockType === 1 ? 1 : blockSize;
      if (buffer.length - offset < payloadBytes)
        return { frames, tornStart: start };
      offset += payloadBytes;
      if (lastBlock)
        break;
    }
    if (checksum) {
      if (buffer.length - offset < 4)
        return { frames, tornStart: start };
      offset += 4;
    }
    frames.push({ start, end: offset });
    if (frames.length === maxFrames)
      return { frames };
  }
  return { frames };
}
function replaceFile(path, data) {
  const backup = path + BACKUP_SUFFIX;
  const tmp = path + TMP_SUFFIX;
  writeFileSync3(tmp, data);
  if (existsSync2(path) && !existsSync2(backup))
    copyFileSync(path, backup);
  try {
    unlinkSync(path);
  } catch {
  }
  renameSync(tmp, path);
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
  try {
    repairLegacyBindEvents(config);
  } catch {
  }
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
