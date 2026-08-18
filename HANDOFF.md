# InfiniteDSH 交接

给下一个 agent：读完这份就能开工。词汇以 [`CONTEXT.md`](CONTEXT.md) 为准。产品口吻以 [`README.md`](README.md) 为准。历史决策见 [`docs/grill-airp-on-dsh.md`](docs/grill-airp-on-dsh.md) 与 [`docs/grill-ux-2026-08-17.md`](docs/grill-ux-2026-08-17.md)。规格原稿 [`docs/superpowers/specs/2026-08-16-dsh-infinite-design.md`](docs/superpowers/specs/2026-08-16-dsh-infinite-design.md) 已过时（命令名、题材数、导出流程都变了），只当考古。

**当前船：** `v0.4.12`。GitHub：https://github.com/vdnight89/InfiniteDSH  
**组合包名：** `dsh-infinite`。产品中文名：**诸天万界**。  
**主人：** vdnight89。本机 Windows，仓库 `F:\DocProject\InfiniteDSH`。

---

## 30 秒

这是 **DeepSeek Harness 的文学插件**，不是独立 App，不是 DSH fork。

- 一个 DSH 会话 = 一本书。切会话就是切界。
- 用户选 preset **诸天万界** → `/new` → 点界图 / 天命之人 / 开局 → 点 **启程** → 模型只写小说正文 → 文末【歧路】三条可点 → `/export-story` 先落草稿再请叙事者润色排版。
- 文学会话应收掉 bash / 改文件 / 子代理。UI 上仍可能显示 Full access，那是 DSH 壳，不是我们授权了刀斧。

没开过 `/new`（没有 `infinite/meta.yml`）的会话，插件必须当编码会话：不注入文学上下文。

---

## 先锁死（不要重开辩论）

| 锁 | 含义 |
|---|---|
| 插件不是软件 | 不另做书架、阅读器、首页、独立进程。书 = 侧栏会话。 |
| 一书一会话 | 不建 Story 表。不把工作区当书。切会话不得沿用上一本的规则书。 |
| 模板拷进本会话 | `/new` 把 `packages/dsh-infinite-preset/templates/<id>/` 整树拷到会话目录 `infinite/`。之后只读这份副本。 |
| 命令名英文、给人看的字中文 | `/new` `/bind` `/cast` `/export-story`。文案走诸天万界口吻。 |
| 不要官方 `/export` | DSH Web 的 `/export` 是会话日志 ZIP。我们的是 `/export-story`。 |
| 点选 + 官方「输入你的答案」 | 题材 / 主角 / 开局 / 三键 / 歧路都用 `userQuestions.ask`。歧路只 3 条，不要第四个「自己写」按钮。 |
| 启程才开火 | `/new` 选完不空停。三键：启程 / 另择开局 / 更换天命之人。启程才 `wakeSoon(..., '启程。')`。 |
| 正文后【歧路】 | persona 要求文末三择。导出必须剥掉【歧路】。 |
| 护栏心里遵守 | 禁止把构思、英文指令、角色清单写进回复。 |
| 随机事件不二次调模型 | `turn/start` 从 worldbook 抽一条未用过的非常驻条目，注入上下文。不抽写法、不抽开篇、不抽剧情卡。 |
| compaction 追加档案 | `archive.md` 只追加，不覆盖。 |
| 不写自定义会话事件 | **禁止** `session.append('infinite/bind', …)`。DSH 不认识的 type 且没有 `ignorable: true` 会让整本历史冷加载失败。`Session.append` 写不了 `ignorable`。绑定只活在 `meta.yml`。 |
| 誊书先草稿再润色 | `/export-story` 先写 `书名.草稿.md`，再抄一份 `书名.md`。润色按磁盘上那份草稿（全文贴进提示，因为文学会话不能读盘），只覆盖成稿。失败则两份都留着。 |
| Git 安装带 dist | 根包无 `prepare`、无 `file:` 依赖。宿主打成 `index.bundle.js`。 |
| 只 named export | **不要** `export default`。Cordis `unwrapExports` 会拿走 default、丢掉旁边的 `inject`，Web 直接炸。 |
| `cordis.patch.yml` 不要 `[]` | 空数组会把 Web 的皮肤 list 弄坏。只要 `insert` 我们这一条。 |

---

## 仓库结构

```
InfiniteDSH/                          根包名 dsh-infinite（对外安装的就是它）
  cordis.patch.yml                    dsh.bundle.patch
  packages/
    infinite-core/                    纯函数：题材、规则书、护栏、抽出正文、装订
    dsh-infinite/                     Host 插件源（@infinite-dsh/host）
      src/                            只改这里
      dist/                           tsc + index.bundle.js（随仓库发布）
      static/                         cards.css / cards.js / 封面
    dsh-infinite-preset/              诸天万界 preset + templates + covers
      infinite-play/                  拷到 ~/.dsh/.agent-presets/infinite-play
      templates/<id>/                 开书种子
      covers/*.jpg                    界图
  scripts/bundle-host.mjs             把 host + core 打成单文件
  scripts/import-airp-presets.mjs     从 AIRP 再导入模板（改完要重建 catalog）
```

工作区：`infinite-core`、`@infinite-dsh/host`、`dsh-infinite-preset`。版本锁步，现在都是 **0.4.10**。

---

## 运行时怎么挂上 DSH

1. 根 `package.json` 的 `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }` 让 `dsh plugin add` 把插件插进 Cordis。
2. 入口是 **named** `apply` + `inject = ['commands', 'systemPrompt', 'userQuestions']` + `name = 'dsh-infinite'`。
3. `apply()` 顺序：
   1. `repairLegacyBindEvents` — 扫描 `~/.dsh/sessions/**/session.jsonl(.zstd)`，把旧 `infinite/bind` 标成 `ignorable: true`，备份 `.bak-infinite`
   2. `installUserPreset` — 拷 / 刷新文学 preset（已含「诸天万界」且 persona 含「禁止把思考」则不覆盖用户改过的文件）
   3. 封面静态服务 `/infinite/covers`、`cards.css`、`cards.js`
   4. 注册四个斜杠命令
   5. 注册 systemPrompt section/context
   6. 听 `session/event`（抽随机事件、compaction 档案、残留的 exportPending 回退）

文学 preset `agent.cordis.yml` 再挂：

- `@deepseek-ai/dsh-persona`（叙事者）
- `./restrict.js` → `tools.restrict({ allow: [] })`

restrict 只对挂了这个 preset 的 agent 生效。用户在 UI 里切走诸天万界，刀斧会回来。

---

## 会话目录（规则书落在哪）

`resolveSessionDir`：

1. 优先 `ctx.sessionPersistence.locate(header).path` 的父目录
2. 否则 `$DSH_HOME` 或 `~/.dsh` 下 `infinite/stories/<safeSessionId>/`

本机核实过：JSONL 后端的 `locate` 经常拿不到，故事实际在：

```
C:\Users\于翔\.dsh\infinite\stories\<sessionId>\infinite\
  meta.yml
  worldbook/*.md
  characters/*.md
  plots/*.md
  archive.md
  export.md
```

会话事件日志在另一处：

```
C:\Users\于翔\.dsh\sessions\--<projectKey>--\<sessionId>\session.jsonl.zstd
```

例如主人常用书《奇幻·谢无妄》：

- 日志：`~\.dsh\sessions\--F-DocProject-InfiniteDSH--\session-1603c339-6922-4cfc-9e53-ed0a9582e240\`
- 天书：`~\.dsh\infinite\stories\session-1603c339-6922-4cfc-9e53-ed0a9582e240\infinite\meta.yml`

`meta.yml` 是绑定 SSOT：`templateId`、`protagonist`、三开关、`pickedEventIds`、`pendingEventId`。誊书进行中会短暂写入 `exportPending` / `exportTitle` / `exportCwd`，润色回合结束清掉。

---

## 命令与开书面

实现：`packages/dsh-infinite/src/commands.ts`。文案：`copy.ts`。

| 令 | 行为 |
|---|---|
| `/new` | 无参必弹界图。再问天命之人、开局，然后三键。有参则解析题材，缺的再问。目录已存在要确认或 `force`。 |
| `/new 修仙 谢无妄 force` | 不弹窗直入。 |
| `/bind` / `/bind 末世` | 改投他界，覆盖本会话天书。 |
| `/cast` / `/cast 林晏` | 换主角；旧 constant 英雄降为 NPC。 |
| `/export-story` | 抽出正文 → 问书名 → 写 `书名.草稿.md` 和 `书名.md` → 按草稿润色 → `turn/end` 只覆盖成稿。 |
| `/export-story player` | 玩家行动留成 `*你：…*`。 |

`/new` 流水线：`seedStory` 拷模板 → `applyProtagonist` → 可选 `applyOpening`（把选中的 plot 写成 `worldbook/opening.md`）→ `afterGate` 三键。启程用 `wakeSoon` 提交用户句「启程。」。

Headless（`NO_PROVIDER`）：当没有问答 UI，用模板默认主角 / 默认开局，或要求 `force`。不要把 `ask()` 的异常直接甩给用户。

---

## 题材

目录 id 在 `packages/dsh-infinite-preset/templates/`。人类标签与别名在 `packages/infinite-core/src/catalog.generated.ts`（由导入脚本生成，改模板后要重跑导入或手改 catalog）。

| id | 标签 | 默认天命之人 | 别名陷阱 |
|---|---|---|---|
| cultivation | 修仙 | 谢无妄 | 仙侠 / 玄幻 |
| fantasy | 奇幻 | 谢无妄 | |
| urban | 都市异能 | 陆沉舟 | **不是**「都市」 |
| modern | 现代 | 陆沉舟 | **「都市」走这里** |
| infinite | 无限流 | 陆沉舟 | |
| scifi | 科幻 | 顾晚棠 | |
| apocalypse | 末世 | 周慎 | |
| entertainment | 娱乐圈 | 裴晏清 | |
| palace | 宫廷 | 沈昭宁 | |
| romance | 言情 | 裴晏清 | |
| folklore | 民俗 | 白蘅 | |
| rulehorror | 规则怪谈 | 白蘅 | |
| zhaidou | 宅斗 | 沈昭宁 | |
| retro | 年代 | 沈昭宁 | |
| wuxia | 江湖 | 谢无妄 | 武侠 |
| campus | 校园 | 林晏 | |
| detective | 刑侦 | 周慎 | |
| cyber | 赛博 | 顾晚棠 | **`/new 赛博` 必须是 cyber，不是 scifi** |
| whale | 深海实验室 | 阿澜 | 鲸鱼娘 / 梁圣 / 牢梁 |

规则书注入只读 `worldbook/`，且丢掉 `category` 为「写法」「剧情」的卡。`plots/` 只给开局点选。`style-tpl-*.md` 是写法卡，不要漏进世界规则。

封面文件名小写，`covers-host.ts` 的 `safeCoverName` 拒路径穿越。`cards.js`：**1 张卡也要出封面**（早期「少于 2 项就跳过」已改）。第三方皮肤改 DOM 时封面脚本可能吃不进，文字条必须仍可用。

---

## 回合生命周期

`lifecycle.ts` 听 `session/event`：

- `turn/start` + `randomEvent`：从 worldbook 抽未用条目写入 `pendingEventId`
- `turn/end`：若仍有 `exportPending`（旧会话），尝试把上一轮助手消息定稿；失败则回退到抽出正文装订。否则把 pending 事件记入 `pickedEventIds`，再 `offerForks`
- `compaction/summary`：追加 `archive.md`

`offerForks`：从**最后一条助手可见正文**解析【歧路】（`lastIndexOf`，不要用第一次出现）。弹 3 项 AskUserQuestion，点中的用 `wakeSoon` 续写。用 `liveAgent(ctx, session)` 找 agent。

`prompt.ts`：

- `infinite:prose` section：只出正文 + 护栏；若 `exportPending` 则改成「这一回合只输出书稿」
- context：world / characters / event / archive。`exportPending` 时这些全部闭嘴。
- **没有 meta.yml 则全部返回空字符串。**

叫醒模型：`wake.ts`。官方路径是 `agent.followup`；不行再 `send(..., 'next-turn', true)` / `steer`。命令刚结束 driver 可能还没 ready，所以 `wakeSoon` 会 `setTimeout(0)` 再试一次。

---

## 誊书（反复炸过，按这个实现）

入口：`handleExport` → `collectExportSource` → 问书名 → `exportTranscript` / `bindManuscript` 先写草稿 → `exportPending` + `wakeSoon(polishPrompt)` → `turn/end` 时 `finalizeManuscript`，失败则保留草稿。

### 消息从哪来

DSH `Session` 有 `events` getter 和 `deriveMessages()`。助手消息的 `content` 是块数组：

```json
{ "type": "reasoning", "text": "We need respond in Chinese..." }
{ "type": "text", "text": "门轴在掌下发出枯骨般的响。\n\n【歧路】\n1. …" }
```

**只取 `type === 'text'`（或无 type 的 text）。永远不要把 `reasoning` 拼进素材。**

实现：`packages/dsh-infinite/src/transcript.ts` 的 `blocksToText`。

`sessionMessages`：先 `deriveMessages`；若其中已有非空助手正文就用它，否则走 `events` 里的 `user/message` / `assistant/message`。

### 抽出正文

`infinite-core/src/export.ts`：

- `cleanProse`：去围栏、去**最后一次**「【歧路】」及之后、去 `【正文】` / 元标签
- `extractStoryBody`：丢掉英文/中文构思段，留下中文叙述
- `harvestFictionLines`：更松的中文行打捞（`collectExportSource` 的第二道）
- `exportTranscript`：按助手消息分章，题记「诸天万界 · 界名」
- `bindManuscript`：已经抽出的一整块散文，装进同一壳
- `manuscriptHasBody`：用 **CJK 个数**（不是连续 24 个汉字，句号会打断）

`【歧路】` 必须用 **最后一次** 出现。模型的 reasoning 里经常先写「Need include 【歧路】 later」，从第一次切会把整段小说裁掉。`parseForkOptions` 同样 `lastIndexOf`。

### 不要再做的事

- 不要只叫醒模型、不先写草稿。模型若去调 `runshell date`，用户会两手空空。
- 润色提示里不要写「今天的中文日期」，必须写死 `formatExportDate()`，并写「禁止调用任何工具」。
- 不要先问书名再发现没有正文（0.4.7 已改：没有 prose 直接报错）。
- 不要把规划段（「用户让我写小说正文」「当前场景：」）当章节。
- `exportPending` 回合不要抽随机事件，不要弹歧路，不要注入 world/characters。

现场书稿：工作区里的 `掌中剑.md` 是从 session-1603c339 抽出的四章，**不要提交**。同类未跟踪文件：`无尽流浪.md`、`暗夜独行.md`（早期失败导出，规划垃圾）。

---

## 会话日志（Ctrl+C 后再开）

DSH 持久化：`session.jsonl.zstd`，拼接的 checksummed zstd 帧。未知事件类型且信封没有 `ignorable: true` → `SessionFormatUnsupportedError`，整本打不开。

我们曾经写入 `infinite/bind`。`KNOWN_SESSION_EVENT_TYPES` 里有 `session/title`、`command/done`，**没有** `infinite/bind`。

0.4.8 起：

- `appendStoryBind` 是空函数，调用点已删
- `repair-sessions.ts` 在 `apply()` 里同步扫日志、改 ignorable、Windows 下先备份再替换
- 本机已修过 9 本 InfiniteDSH 会话，包括 `session-1603c339-…`

**不要发明第二种自定义 type。** 标题用 `session/title`。命令结果用 `command/done`。

改 zstd 时按帧解压 / 按帧压缩（`ZSTD_c_checksumFlag = 1`），不要把多帧合成一帧再交给「只解第一帧」的 API 去验。

---

## DSH 壳上做不到的事（别承诺）

没有 client 包就没有：自定义首页、封面墙路由、隐藏官方 `/export`、改输入框占位符「描述你想要构建的内容」、改 Full access 文案、真正的阅读器。

能稳定用的钩子：斜杠命令、`userQuestions.ask`、`systemPrompt`、preset persona、`tools.restrict`、很脆的 `webServer.tapIndex` 注入 `cards.js`。

AskUserQuestion 自带「输入你的答案」。不要再加第四选项「自己写」。`cards.js` 依赖 `button[role=radio]`；皮肤一改 DOM，封面网格就废，文字选项必须还能用。

---

## 本机开发怎么验

主人的 Web profile：

```
C:\Users\于翔\.dsh\profiles\web\package.json
  "dsh-infinite": "link:F:/DocProject/InfiniteDSH"
```

改源码后：`npm test && npm run typecheck && npm run build`，然后 **关掉再开 `dsh web`**。不重启就是旧 bundle。

别人从 Git 装：

```
dsh plugin --profile web add github:vdnight89/InfiniteDSH
dsh plugin --profile web update dsh-infinite   # pnpm 会把 Git 依赖钉死，不 update 永远旧版
```

钉版本：`github:vdnight89/InfiniteDSH#v0.4.10`

`dsh plugin add` 要 pnpm。根包不要恢复 `prepare`（pnpm `onlyBuiltDependencies` 会拦）。不要把 `dsh-infinite` 写进 patch 的 list 当数组空元素。

测：`npm test`（vitest，现 76 测）。测文件：

- `packages/infinite-core/tests/*.spec.ts`
- `packages/dsh-infinite/tests/plugin.spec.ts`
- `packages/dsh-infinite/tests/repair-sessions.spec.ts`

发布节奏（主人要求闭环时）：改代码 → 测 → 打 bundle → 锁步 bump → CHANGELOG / README 版本钉 → commit `fix/feat: 0.x.y …` → tag `v0.x.y` → push → `gh release create --latest`。`gh` 若未 login，可用 git credential 填 `GH_TOKEN`（不要把 token 写进仓库或回复）。

GitHub About 描述已是诸天万界那句。Topics 优先级（货架扫前面的）：

`dsh-plugin` `dsh` `deepseek-harness` `cordis` `deepseek` `cordis-plugin` `ai-agents` `plugins` … 然后才是 `interactive-fiction` 等题材。不要堆 `awesome` / `mcp` / `desktop`。API 返回的 topic 数组是字母序，和页面展示顺序不是一回事。

---

## 源码地图（动手时从这里进）

| 要改 | 文件 |
|---|---|
| 开书 / 改界 / 换角 / 誊书 | `packages/dsh-infinite/src/commands.ts` |
| 给人看的字 | `copy.ts` |
| 抽出会话正文 | `transcript.ts` |
| 装订 / 去构思 / 去歧路 | `packages/infinite-core/src/export.ts` |
| 歧路解析 | `infinite-core/src/forks.ts` + `dsh-infinite/src/forks-host.ts` |
| 回合钩子 | `lifecycle.ts` |
| 提示词 | `prompt.ts` + `infinite-core/src/guards.ts` |
| 落盘 | `story-files.ts` + `paths.ts` |
| 唤醒模型 | `wake.ts` |
| 问答 | `ask.ts` |
| 修旧日志 | `repair-sessions.ts` |
| 禁工具 | `restrict.ts`（preset 里的那份是拷贝） |
| 题材表 | `infinite-core/src/catalog.generated.ts` + `topics.ts` |
| 封面 HTTP | `covers-host.ts` |
| 插件入口 | `index.ts` |
| 润色提示与定稿 | `polish.ts` |

`Duck*` 类型在 `dsh-infinite/src/types.ts`，是对 DSH 的窄面，不要直接依赖 `@deepseek-ai/*`（Git 安装的 bundle 里也打不进主机那些包当 runtime 依赖）。

---

## 已知未解 / 下一刀可能踩的

1. **Full access 条还在。** restrict 生效，UI 仍吓人。没 client 包改不了。
2. **封面网格看皮肤脸色。** 文字问答是保底。
3. **Think / 工具 XML 会进对话。** 文学会话里模型有时仍把 `<tool_calls>` 当字打出来。誊书已忽略 reasoning 并当场装订；正文回合只能靠 persona + 护栏。
4. **会话标题。** 我们会 `session/title` 写成「奇幻·谢无妄」。用户若先手打「开始」，DSH 自己的标题逻辑可能抢先。
5. **故事目录和日志目录是分开的。** 修日志别假定 `infinite/meta.yml` 在 session.jsonl 旁边。
6. **导出质量上限是模型有没有写出可见 `text` 块。** 只有 reasoning、没有 text，仍然誊不出。
7. **润色仍可能跑偏。** 草稿已在磁盘上。`turn/end` 若看到工具 XML 会保留草稿并提示可再 `/export-story`。
8. **不要提交用户书稿。** `掌中剑.md`、`无尽流浪.md`、`暗夜独行.md` 留在工作区即可。

---

## 主人怎么玩（验收口径）

1. `dsh web` → 新会话 → preset **诸天万界**
2. `/new` → 点界 → 点人 → 点开局 → **启程**
3. 应立刻出现小说正文，不是「界门已开请手打开始」
4. 正文后弹【歧路】三择，点一条就续写；自己走写在「输入你的答案」
5. Ctrl+C 再开，**同一会话必须还能进**，不能报 `SessionFormatUnsupportedError`
6. `/export-story` 选书名后工作区立刻有草稿 `.md`，随后模型应只输出以 `#` 开头的书稿，不得调 `date` / `runshell`

对照会话：`session-1603c339-6922-4cfc-9e53-ed0a9582e240`（奇幻 / 谢无妄 / 酒铺 / 悬赏）。0.4.10 已能抽出四章《掌中剑》。

---

## 开工检查单

```
npm test
npm run typecheck
npm run build
```

改 Host 或 core 后必须重新 bundle，`index.bundle.js` 才是 DSH 加载的那份。本地 junction 重启 `dsh web` 即用新包；Git 用户必须 `dsh plugin --profile web update dsh-infinite` 再重启。
