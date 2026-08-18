# dsh-infinite 0.4.13 全代码审计：DSH 插件规范合规评估与优化方案

> 审计日期：2026-08-20。审计范围：`infinite-core`（12 src + 4 spec）、`dsh-infinite`（19 src + 2 spec + static）、`dsh-infinite-preset`（infinite-play + 19 templates）、根配置、scripts。
> 规范依据：本机 DSH checkout `@deepseek-ai/dsh@0.1.0-rc.7` 的 Host API 与插件开发规范（详见 [`docs/dsh-plugin-spec-checklist.md`](dsh-plugin-spec-checklist.md)，每条 API 均标注源码路径）。
> 基线实测：`npm test` 78/78 通过（无 skip/only）、`npm run typecheck` 干净、`npm run build` 产物齐全。

## 一、结论速览

**合规度：高。14 条锁死规则零违反，无 P0 规范违反项。**

- 与 DSH Host 插件规范逐条对照（checklist A–N 共 14 项），全部满足或满足其 Duck 窄面等价形式。
- 发现 **2 个 P1 风险**（其中 1 个可造成长书静默丢章节），十余条 P2 润色项。
- 三个包 + README/CHANGELOG 版本锁步 0.4.13，测试数与文档声称一致（78）。

## 二、DSH 规范对照结果（摘要，完整依据见 checklist 文档）

| 项 | 规范要求 | 本仓实现 | 结论 |
|---|---|---|---|
| 插件 shape | 导出 `name/inject/apply`，**不 export default**（`unwrapExports` 会折叠 default 丢掉 inject） | `index.ts` 仅命名导出；测试断言 `mod.default === undefined` | ✅ |
| bundle 挂载 | `"dsh":{"bundle":{"patch":"./cordis.patch.yml"}}`，patch 为 `PatchOptions[]` | 根 package.json + 单条 `insert` | ✅ |
| patch 语义 | 空文件/仅注释**抛错**；`insert` 存在即进入插入分支，带 id 的空 `insert` 会把组 `config` 重置为 `[]`（皮肤 list 被清空的机制） | 两份 patch 均只有一条非空 insert | ✅ |
| 命令 | `ctx.commands.register` 返回 disposer；`command/done` 事件形状 `{commandId, kind, text?, sourceEventSeq?}` | 注册走 `ctx.effect` 包裹；**注意**：手工 `session.append('command/done')` 缺 `commandId`（见 P2-3） | ⚠️ 基本合规 |
| systemPrompt | `section/context(name, order, text)`；重名抛错 | `infinite:prose` + 4 个 context，order 10–20 | ✅ |
| userQuestions | `ask({questions, agent?, signal?})`；item/answer 字段 `id/question/detail/header/options/multiSelect`、`{id, selected[], custom?}` | Duck 类型与官方逐字段一致（本机核对 rc.7 源码） | ✅ |
| 会话事件 | 新增类型必须入 `KNOWN_SESSION_EVENT_TYPES`（44 项）或标 `ignorable: true`，否则冷加载 `SessionFormatUnsupportedError` | 只读 `turn/start`/`turn/end`/`compaction/summary`/`user|assistant/message`；只写 `session/title`/`command/done`；旧 `infinite/bind` 仅修复读取 | ✅ |
| `session/title` | 一等服务 `ctx.sessionTitle.rename()` 会规范化/校验/钉住标题 | 裸 append，payload 形状合规但绕过服务（见 P2-2） | ⚠️ 基本合规 |
| 唤醒 | `agent.followup` / `send(msg, target, wakeup)`，`InboxTarget = 'next-turn' | 'next-step'` | `followup → send('next-turn', true) → steer` 三降级，全部合法 | ✅ |
| tools.restrict | 必须从 scoped ctx（agent.ctx）调用；`{}` 抛错；`allow: []` 合法；**是可见性组合，不是权限边界** | preset 内 `./restrict.js` 于 agent 作用域 `allow: []` | ✅（安全语义与 README 表述一致，别对外宣称沙箱） |
| preset 格式 | 目录 id `[a-z0-9-]*`；相对路径行从 preset 目录解析；本地 `.js` 必须 ESM（`"type":"module"` 或 `.mjs`）；persona 挂 preset 内为 scope-only | `infinite-play` + `"type":"module"` + `./restrict.js` + `@deepseek-ai/dsh-persona` | ✅ |
| zstd 帧 | 独立 checksummed Zstandard 帧串联；官方包内已有 `scanZstdFrames`/`decompressZstdPrefix` | 自实现逐帧扫描（布局契约一致），不依赖主机包 | ✅（重复实现，见 P2-5） |
| 副作用生命周期 | 所有注册/订阅经 `ctx.effect` 或保留 disposer，不得在 `apply()` 外创建副作用 | 全部注册包在 `ctx.effect`；模块级仅 `inFlight` 去重 Set（无副作用） | ✅ |
| 平面规则 | Host 组合放跨会话能力，agent preset 放单会话工具/persona | 命令/提示/封面在 Host，persona/restrict 在 preset | ✅ |

## 三、质量问题清单

### P1（建议立即修）

1. **润色截断长书** — `packages/dsh-infinite/src/polish.ts:30`：`draft.slice(0, 12000)` 与 HANDOFF「全文贴进提示」矛盾。超过约 1.2 万 CJK 字的书（四章《掌中剑》即临界）润色时后半本**静默丢失**，且定稿会覆盖成稿。修法三选一：
   - 超限时跳过模型润色、直接保留本地草稿装订（最稳，0.4.14 可做）；
   - 上限参数化 `maxPolishChars`（默认提高，如 48k 字符）；
   - 分章分批润色（复杂度最高，不推荐近期做）。
2. **未处理 promise rejection** — `packages/dsh-infinite/src/lifecycle.ts:50`：`void offerForks(...)` 若 `askUser` 抛非 `NO_PROVIDER` 异常（`CALLER_NOT_LIVE`/`DELEGATED_CALLER` 等），promise 拒绝无人接，Node 默认未处理拒绝可能致命。修法：`offerForks` 内 try/catch 吞掉并留日志。

### P2（建议本版本顺手做）

3. **`command/done` 缺 `commandId`** — `lifecycle.ts:74,79` 手工 append 不满足官方形状（缺 `commandId`、`sourceEventSeq`）。不破坏会话加载，但命令日志无法关联。修法：append 时补 `commandId: 'export-story'` 或改走 `ctx.commands.execute`。
4. **`session/title` 绕过一等服务** — `commands.ts:184` 裸 append 跳过 `sessionTitle.rename()` 的规范化/长度截断/空值校验（超长主角名会写出超长标题）。修法：`ctx.get('sessionTitle')` 存在时走 `rename()`，否则回退 append。
5. **zstd 帧扫描与官方重复实现** — `repair-sessions.ts` 自实现 `scanZstdFrames`；官方 `@deepseek-ai/dsh-session-persistence-jsonl` 已有同契约实现。保持自实现（避免依赖主机内部包）是对的，但应在文件头注释锚定官方对应实现与版本，防上游格式演进时无人对照。
6. **孤儿脚本** — `scripts/prepare-bundle.mjs`、`scripts/check-defaults.mjs` 不在 package.json scripts；`prepare-bundle.mjs` 注释自称 `prepare`（与「根包不得有 prepare」锁死规则相悖），是日后误加的雷。修法：删除，或加「非 prepare、仅本地用」注释。
7. **死代码** — `restrict.ts:20 applyRestrict`、`ask.ts:12 canAsk`、`infinite-core/src/covers.ts:22 coverFileForLabel`（仅测试引用）无调用点。修法：删除或标 `@internal`。
8. **重复实现** — `copyTree` 两份（`install-preset.ts:6`、`story-files.ts:179`）；`stripRecommend` 正则四份（`ask.ts:19`、`covers.ts:23`、`topics.ts:31`、`static/cards.js`）。修法：core 导出单一实现；cards.js 无法共享则注释锚定。
9. **每回合重复同步读盘** — `prompt.ts` 一次 assemble 内 `loadMeta` 5+ 次、`loadWorldbook/loadCharacters/recentText`（含 `deriveMessages`）重复执行。长会话同步 IO 放大。修法：per-assemble 缓存一次。
10. **导出双击资源管理器** — `commands.ts:413` 润色前 reveal 一次、`lifecycle.ts:73` 定稿后又 reveal 一次。修法：只在定稿成功后 reveal（失败分支也补一次）。
11. **`wakeSoon` 返回语义误导** — `wake.ts:23-30`：排了 `setTimeout(0)` 重试也返回 `true`，调用方据此乐观报「已誊/已落笔」。修法：三态返回或重命名 `wakeNowOrSoon`。
12. **非空断言** — `transcript.ts:125` `msgs[i]!.text`、`export.ts:100` `runs[i]!`、`covers-host.ts:47` `res.end(body as unknown as string)`。当前安全但脆弱，修法 `?? ''` / 收紧类型。
13. **`session/event` 监听盲转** — `index.ts:27-32` 用 `(...args: unknown[])` + `as` 绕过 Duck 窄面，DSH 若改参数序会静默失效。修法：加运行时 shape 校验（至少校验 `args[1]?.type` 为字符串）。
14. **`.gitignore` 不防书稿** — 已修：新增 `*.草稿.md` 与已知书名条目（本次审计顺手修了）。
15. **README 兼容性注** — 已修：补「本机已用 0.1.0-rc.7 验收」。
16. **`frontmatter.ts:72`** `parseStoryMeta` 用 `---` 包一层复用 front-matter 解析器，隐晦；建议加注释。
17. **测试缺口**：`scanZstdFrames` 错误分支（非法 magic/保留位/torn 帧/RLE block）、`offerForks` 的 `inFlight` 去重、`wake` 的 `tryCall/liveAgent`、`resolveUnder` 路径穿越拒绝、`isFailedPolish` 其余正则、`harvestFictionLines` 无直接覆盖；`reveal.ts` 被 `VITEST` 短路 0 覆盖（可抽纯函数测）。

### P3（观察，不必动）

- `restrict` 是可见性不是权限边界：UI 仍显示 Full access。README/HANDOFF 已如实表述，无 client 包改不了，不承诺。
- `offerForks` 的 `AbortController().signal` 永不 abort，Ask 若无 UI 兜底可能长挂（当前被 `inFlight` 挡住重入，行为保守可接受）。
- `covers-host` 每次请求同步读封面文件：封面小，可加内存缓存再议。
- `worldbook.ts` 的 `matchedEntryIds` 在字数预算截断前统计，与实际注入可能有出入（当前无消费方）。
- 导出 `player` 模式下，用户发的斜杠命令若被投影为 user message，可能残留为 `*你：/xxx*`（本机实测未出现，仅风险提示）。

## 四、优化方案（按优先级排期）

**0.4.14（安全版，半天内）**
1. 修 P1-1（超限跳过润色直接装订 + 上限参数化）；补 `polish.spec.ts` 长草稿用例。
2. 修 P1-2（`offerForks` 内 catch）。
3. 顺手做 P2-3/P2-4（commandId / sessionTitle.rename 降级）、P2-10（只 reveal 一次）。
4. `npm test && npm run typecheck && npm run build`，重启 `dsh web` 验收，锁步 bump。

**0.5.0（体验版，1–2 天）**
5. P2-9 per-assemble 读盘缓存；P2-11 唤醒返回语义；P2-13 事件参数 shape 校验。
6. P2-6/P2-7/P2-8 清理孤儿与重复；P2-5 注释锚定官方 zstd 契约。
7. P2-17 补齐测试缺口（目标 90+）。

**不排期**
8. P3 全部观察项；Full access 文案等 client 包出现再说。

## 五、审计产物

- [`docs/dsh-plugin-spec-checklist.md`](dsh-plugin-spec-checklist.md) — DSH Host 插件规范合规清单（rc.7，逐 API 标注源码路径）。
- 本文件 — 评估结论与优化方案。
