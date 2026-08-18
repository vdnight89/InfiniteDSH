# DSH Host 插件规范合规清单（审计 dsh-infinite 用）

> 路径前缀约定（下文所有相对路径均基于这两个前缀）：
> - `$DSH` = `D:\nvm\v22.22.0\node_modules\@deepseek-ai\dsh`（CLI 包根，即 checkout 根）
> - `$P` = `D:\nvm\v22.22.0\node_modules\@deepseek-ai\dsh\node_modules\@deepseek-ai`（子包簇，真正的 Host 实现所在）

## 0. 版本号

- `@deepseek-ai/dsh` = **0.1.0-rc.7**（`$DSH/package.json` 第 4 行；所有 `@deepseek-ai/dsh-*` 依赖同为 `0.1.0-rc.7`，`@deepseek-ai/cordis` = `^4.0.1`）。
- 会话磁盘格式版本 `SESSION_FORMAT_VERSION = 0`（`$P/dsh-session/lib/types/types.d.ts`）。

---

## 1. Host 插件挂载：`dsh.bundle.patch`（cordis.patch.yml）

### 1.1 bundle/profile 的 `package.json` 声明
`$P/dsh-app-boot/lib/types/profile.d.ts`：
```ts
interface DshBundleManifest { patch: string }        // 相对包根，如 "./cordis.patch.yml"
interface DshProfileManifest { bundles?: string[] }  // 有序 bundle 包名列表
interface DshManifestSection { bundle?: DshBundleManifest; profile?: DshProfileManifest }
```
- bundle 包：`package.json` 声明 `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`（实例见 `$P/dsh-base/package.json`）。
- 在 `dsh.profile.bundles` 里列了没有 `dsh.bundle` 声明的包 → `loadProfile` 直接抛错（fail-loud，非“无 patch”）。见 `$P/dsh-app-boot/lib/index.js` 第 549 行。

### 1.2 PatchOptions 与 EntryOptions 精确形状
`$P/cordis-plugin-include/lib/types/index.d.ts`（PatchOptions）：
```ts
interface PatchOptions {
  id?: string            // 按 id 定位：替换该行整个 config（未改字段也必须重述）
  insert?: EntryOptions[] // 插入新行
  name?: string; config?: any
  group?: boolean | null; disabled?: boolean | null
  inject?: any; intercept?: any; isolate?: any
  [key: string]: any
}
```
`$P/cordis-plugin-loader/lib/types/config/entry.d.ts`（EntryOptions，即每个插件行）：
```ts
interface EntryOptions {
  id: string            // 树内稳定 id
  name: string          // 模块说明符（bare 包名 / 相对路径 / 绝对路径 / cordis:builtin）
  config?: any
  group?: boolean | null
  disabled?: boolean | null   // `disabled: !!js <expr>` 平台门控
  inject?: Inject | null
}
```
- `applyEntryPatches(data, patches, warn)`：按 id 定位的 patch **替换整行 `config`**（不 merge）；`insert` 追加；同列表内后面的 patch 可命中前面 insert 的行；匹配不到 → warn + 跳过。空条目列表之上依次叠加各层（bundle 层 → profile `cordis.patch.yml` → home 级 `cordis.patch.yml` → `--patch` 覆盖层），后者优先。见 `$P/cordis-plugin-include/lib/types/index.d.ts` 与 `$P/dsh-app-boot/README.md`。

### 1.3 `[]` 与空文件的语义（为什么“危险”）
`$P/dsh-app-boot/lib/types/index.d.ts` `loadOptionalPatches` / README：
- `loadOptionalPatches(binName, file): PatchOptions[] | undefined`：文件不存在 → `undefined`（“无层”）；**文件不可读/不可解析/解析结果非数组 → 抛错**（存在却不可用 = 配置错误，启动 fail-loud，绝不静默跳过）。
- **空文件或仅注释文件 → 抛错**（它解析成 nothing，不是列表）；**要禁用某层请显式写 `[]`**（空列表 = “不挂载任何 patch”）。
- 危险点：`[]` 表示“挂载零行”。若本该列出插件行的文件被意外写成/截断成 `[]`，整棵树静默消失。agent preset 正是为此把子树 `write()` 覆盖为 no-op——否则一个 agent 卸载就会把随附组合写回成 `[]`（`$P/dsh-agent-presets/lib/index.js` 第 508–523 行）。

### 1.4 插件入口约定与 `unwrapExports` 精确行为
`$P/cordis-plugin-loader/src/index.ts` 第 191–199 行（lib 版 `$P/cordis-plugin-loader/lib/index.js` 第 736 行同）：
```ts
unwrapExports(exports: any) {
  if (isNullable(exports)) return exports
  exports = exports.default ?? exports
  if (!exports.__esModule) return exports
  return exports.default ?? exports
}
```
- 行为：null/undefined 原样返回；否则先取 `.default`（无则取自身）；若结果不带 `__esModule` 就返回；带 `__esModule`（esbuild 双 default 互操作）再取一次 `.default ?? 自身`。
- 合规结论：**函数/命名空间插件导出 `name` / `inject` / `apply`，不提供 `export default`**。一个意外的 `export default` 会被 `unwrapExports` 折叠成默认导出，`inject` 丢失（`$P/dsh-tool-todo/README.md` 第 37 行；postmortem 0001-acp-default-export-drops-inject）。

---

## 2. 服务

### 2.1 `commands`（斜杠命令）
`$P/dsh-commands/lib/types/index.d.ts` + `types.d.ts`：
```ts
// ctx.commands: CommandRuntime
interface CommandDefinition {
  name: string               // 小写，不带斜杠
  description: string
  input?: { hint: string }   // CommandInputDescriptor
  recordInput?: boolean      // 默认 true；域事件自带载荷时设 false
  handler: (inv: CommandInvocation) => CommandResult | Promise<CommandResult>
}
interface CommandInvocation { commandId: CommandId; agent: Agent; rawInput: string; signal: AbortSignal }
register(def): () => void    // 返回精确 disposer；plain-context=全局，agent 子上下文=按 agent 遮蔽
execute(agent, line, signal): Promise<CommandExecution | undefined>  // 记录 command/run→command/done
type CommandResult = { kind:'success'; text?; sourceEventSeq? } | { kind:'error'; text: string }
```
事件（`SessionEventMap` 合并）：`command/run` = `{ commandId, name, args?, source:{kind:'user'} }`；`command/done` = `{ commandId, kind:'success'|'error', text?, sourceEventSeq? }`（`$P/dsh-commands/lib/types/types.d.ts`）。

### 2.2 `systemPrompt`（section / context）
`$P/dsh-system-prompt/lib/types/index.d.ts`：
```ts
// ctx.systemPrompt: SystemPrompt
interface PromptSection {
  name: string                          // 重复注册抛错
  order: number                         // 升序拼接；约定 -100 身份、0 persona、100–199 工具指引
  text: string | ((ctx: AssembleContext) => string)  // 可含严格 {{variable}}
  complete?: boolean                    // 视为完整系统提示
}
interface PromptContext { name: string; order: number; text: string | ((ctx) => string) }
section(section): () => void
context(context): () => void
tools(provider): () => void
variable(name, provider): () => void    // name 形如 [a-z][a-z0-9_]*
assemble(context?): Promise<PromptAssembly>
// 常量：PERSONA_SECTION = 'deployment:persona'，PERSONA_ORDER = 0
```

### 2.3 `userQuestions`（ask 方法 / 选项 / 答案）
`$P/dsh-user-questions/lib/types/index.d.ts` + `types.d.ts`：
```ts
// ctx.userQuestions: UserQuestionService
interface UserQuestionProvider { ask(req: AskUserQuestionRequest): Promise<AskUserQuestionAnswer> }
ask(request): Promise<AskUserQuestionAnswer>   // 抛 UserQuestionError: 'CALLER_NOT_LIVE' | 'DELEGATED_CALLER'
registerProvider(provider): () => void         // 每上下文仅一个 provider

interface AskUserQuestionRequest { questions: AskUserQuestionItem[]; agent?: Agent; signal?: AbortSignal }
interface AskUserQuestionItem {
  id: string; question: string
  detail?: string; header?: string
  options?: AskUserQuestionOption[]            // { label: string; description?: string }
  multiSelect?: boolean
  intent?: { kind:'plan-review'; approve: string }
}
interface AskUserQuestionAnswer { answers: AskUserQuestionAnswerItem[] }
interface AskUserQuestionAnswerItem { id: string; selected: string[]; custom?: string }
```
（模型侧工具是独立包 `@deepseek-ai/dsh-tool-ask-user`，服务本身只提供 UI 回传通道。）

### 2.4 `webServer`（静态路由 / tapIndex）
`$P/dsh-host-webserver/lib/types/index.d.ts`：
```ts
// ctx.webServer: WebServer
type WebRouteKind = 'exact' | 'prefix'
interface WebRoute { kind: WebRouteKind; path: string; handler: (req, res) => void|Promise<void> }
interface WebUpgradeRoute { path: string; handler: (req, socket, head) => void|Promise<void> }
register(route): () => void            // 重复 (kind,path) 抛错
registerUpgrade(route): () => void     // 重复 path 抛错
registerFallback(handler): () => void  // 唯一 fallback 席位，第二个抛错
tapIndex(transform: (html:string)=>string): () => void  // 按注册顺序施加
applyIndexTaps(html): string
// Config: { host: '127.0.0.1'|'0.0.0.0'; port: number }  (port:0 = 系统分配)
get port(): number; get host(): Config['host']
```
注意：本包不 serve 文件；静态 dist 由 fallback owner（如 `dsh-host-frontend-static`）经 fallback 钩子提供。

### 2.5 `tools` 与 restrict 机制
`$P/dsh-tools/lib/types/index.d.ts` + `$P/dsh-tools/lib/index.js` 第 2779–2793 行：
```ts
// ctx.tools: ToolRuntime
interface ToolRestriction { allow?: readonly string[]; deny?: readonly string[] }
register(def: ToolDefinition): () => void
restrict(filter: ToolRestriction): () => void   // 精确 disposer
guard(guard: ToolGuard): () => void
presentAs(mode: ToolPresentationMode): () => void
schemas(scope?): ToolSchema[]
execute(exec: ToolExecutionInput): Promise<ToolExecutionResult>
// ToolPresentationMode = 'native' | 'code' | 'both'
```
`restrict` 精确语义（源码 2779–2793 行，含抛错条件）：
- **必须从 scoped 上下文调用**（`agent.ctx`）；从普通上下文调用抛错（“a context-global restriction would mask every agent”）。
- `restrict({})`（allow/deny 均缺省）抛错：no-op。
- `allow`/`deny` 中不得出现保留名 `run_code`。
- 未知名（不在当前可见全局工具集）抛错。
- **`tools.restrict({ allow: [] })` 是合法且常用的“隐藏全部全局工具”写法**（allow=空集 → 每个继承的全局名都不通过，见 `admits` 判定 `$P/dsh-tools/lib/index.js` 第 2532 行）；scoped 本地注册的工具（自身层）仍保留可见。这是 dsh-infinite 做“极简/锚定”面时应调用的 API。
- 交集语义：多个掩码取交集；`deny` 掩码放行后来出现的未点名全局工具，`allow` 掩码排除后来出现的名称。注释声明这是**可见性组合，不是权限边界**。

---

## 3. 会话

### 3.1 `sessionPersistence`（locate）
`$P/dsh-session-persistence/lib/types/index.d.ts`：
```ts
// ctx.sessionPersistence: SessionPersistence（抽象服务，后端实现）
abstract locate(meta: SessionHeader): SessionLocation | undefined  // 不触文件系统
interface SessionLocation { kind: string; path: string }           // 绝对路径，仅位置提示非授权令牌
abstract readonly supportsRawArtifacts: boolean
readRaw(id, signal?): Promise<SessionRawArtifact | undefined>
create(meta): Promise<void>; append(id, events): Promise<void>
prepare(id, signal?): Promise<SessionPreparation>; load(id): Promise<SessionInspection>
inspect(id, signal?): Promise<SessionInspection>; readFrom(id, fromSeq, signal?)
list(signal?); listSnapshots(signal?)
```

### 3.2 Session 类
`$P/dsh-session/lib/types/index.d.ts`：
```ts
class Session {
  readonly header: SessionHeader; get id(): SessionId
  readonly firstLiveSeq: number
  get events(): readonly SessionEvent[]   // 深冻结不可变快照
  get seq(): number
  append<T extends SessionEventType>(type, data, ...opts): SessionEvent<T>
  deriveMessages(): Message[]             // 由 surfaceOp 标记的 message 事件投影，缓存
  deriveEventMessage(event): Message | null
  requestHeader(): EpochHeader | undefined; requestContext(): RequestContext | undefined
  static create(id, seed?, header?): Session; static fromRestore(...): Session
}
// ctx.sessions: SessionStore（create/prepare/enter/announce/fork/get/list/flush）
type SurfaceEventType = 'user/message' | 'assistant/message' | 'tool/result'
```
- 内容块（`$P/dsh-llm/lib/types/types.d.ts`）：`type: 'text' | 'reasoning' | 'image' | 'tool-call' | 'tool-result'`；`TextBlock = {type:'text', text}`、`ReasoningBlock = {type:'reasoning', text}`。`Message = { id; role:'system'|'user'|'assistant'; content: ContentBlock[]; source }`（`$P/dsh-llm/lib/types/message.d.ts`）。

### 3.3 `KNOWN_SESSION_EVENT_TYPES`（完整 44 项）
`$P/dsh-session/lib/index.js` 第 1054–1099 行（生成源 `lib/types/known-event-types.d.ts`）：
```
agent-preset/selected, agent/inbox/spliced, approval/asked, approval/decided,
approval/policy, assistant/chunk, assistant/message, command/done, command/run,
compaction/end, compaction/prune, compaction/start, compaction/summary, feedback/record,
goal/change, hook/invoked, hook/result, llm/retry, llm/retry-started, permission/preset,
plan/mode, request/context, request/header, sandbox/mode, schedule/change, session/end-seed,
session/title, session/title-llm-request, step/end, step/start, subagent/descriptor, todo/write,
tool-workflow/agent-end, tool-workflow/agent-start, tool-workflow/run-end, tool-workflow/run-start,
tool/call, tool/code-dispatch, tool/code-dispatch-start, tool/result, turn/end, turn/start,
user/message, web/deepseek-search-llm-request
```
- **dsh-infinite 若新增插件自有事件类型，默认不在该集合内**；未加 `ignorable` 标记的未知类型会导致读取路径拒绝重建会话（见 3.5）。

### 3.4 `session/title` 与 `command/done` 事件结构
- `session/title`（`$P/dsh-session-title/lib/types/index.d.ts`，SessionEventMap 合并）：`{ title: string; messageSeqs: number[]; source: {kind:'fallback'} | {kind:'provider', provider, model?} | {kind:'user'} }`（log-only，不进派生历史）。
- `command/run`：`{ commandId, name, args?, source:{kind:'user'} }`；`command/done`：`{ commandId, kind:'success'|'error', text?, sourceEventSeq? }`（`$P/dsh-commands/lib/types/types.d.ts`）。

### 3.5 `ignorable` 标志与 `SessionFormatUnsupportedError`
- `SessionEvent<T>` 信封（`$P/dsh-session/lib/types/types.d.ts`）：`{ type; seq; time; data; ignorable?: true }`（surface 类型另带 `sourceEventSeqs?`/`surfaceOp?`）。`ignorable: true` 表示“纯信息性、丢失不影响重建”，读方可安全跳过；**缺省 = required**，读到未识别类型且无此标记 → 拒绝重建（宁可过拒，不静默吞）。
- `SessionFormatUnsupportedError extends Error { location?: SessionLocation }`（`$P/dsh-session-persistence/lib/types/coordinator.d.ts`）：存储日志完好但本 runtime 无法忠实解读——header 版本不支持，或事件类型未知且未标 ignorable。与 `SessionPersistenceCorruptionError`（损坏）区分；raw log 仍可经 `location` 读取。

### 3.6 session.jsonl 的 zstd 帧格式
`$P/dsh-session-persistence-jsonl/lib/types/format.d.ts` + `zstd.d.ts` + `index.d.ts`：
- `JsonlCompression = 'zstd' | 'none'`；`logSuffix` → `.jsonl.zstd` / `.jsonl`（默认 **checksummed Zstandard** 帧）。
- 首行 `HeaderLine = { type:'session'; version; id; createdAt; cwd?; parentSession?; seedLength?; origin?; delegationDepth; agentPreset? }`。
- 容器 = **独立可解码、带 checksum 的 Zstandard 帧串联**；`compressZstdFrame(input)` / `decompressZstdFrame`（校验 checksum）；结构扫描 `scanZstdFrames` 定位完整帧与 `tornStart`（EOF 截断的尾帧）；`decompressZstdPrefix` 用 flush 模式从截断尾帧恢复明文。
- `eventLines(events, packChunks)`：`packChunks: true` 时连续 delta-chunk 打包为 `text-chunks` / `reasoning-chunks` / `tool-call-chunks` 行（读取 layout-blind）。

---

## 4. Agent 唤醒（followup / send / steer）
`$P/dsh-agent/lib/types/runtime-types.d.ts`（`Agent` 接口）：
```ts
interface Agent {
  readonly id: SessionId; readonly options: AgentOptions
  readonly session: Session; readonly inbox: Inbox
  readonly status: AgentStatus          // 'idle' | 'running'
  readonly ctx: Context                 // agent 作用域上下文
  cancel(cause: AgentCancelCause, options?: { keepInbox? }): void
  whenIdle(): Promise<void>
  runMaintenance<T>(task: (signal) => Promise<T>): Promise<T>
  send(message: UserMessage, target: InboxTarget, wakeup: boolean): void
  followup(message: UserMessage): void  // 排队一个普通后续轮次并唤醒 driver
  steer(message: UserMessage): void     // 最近一步的转向输入；空闲则开新轮
  inject(message: UserMessage): void    // 注入下一 pre-step 上下文，不唤醒
}
```

---

## 5. Agent preset 格式（`~/.dsh/.agent-presets`）

### 5.1 目录结构
`$P/dsh-agent-presets/README.md` + `$DSH/config/agent-presets/*`（随附实例）：
```
~/.dsh/.agent-presets/<id>/
  ├── agent.cordis.yml    # 必须：顶层 YAML 数组（插件行列表）
  └── preset.yml          # 可选：仅展示元数据 { name, description, order? }
```
- `id` 即目录名，正则 `PRESET_ID = [a-z0-9][a-z0-9-]*`（`$P/dsh-agent-presets/lib/types/preset.d.ts`）。`trust: 'system' | 'user'`（由发现根决定）。
- `Config { default: string; roots: PresetRoot[]; includeUserRoot: boolean }`；`includeUserRoot: true` 追加 `<dshHome>/.agent-presets` 为 user 根（在配置根之后）。
- 行解析（`$P/dsh-agent-presets/lib/index.js` 第 495–506 行）：**bare 包名 → 从 harness 安装目录解析；相对路径（`.` 开头）→ 从 preset 自身目录解析；绝对路径 → 转 `file:` URL；`cordis:` → builtin**。
- preset 是输入，非持久化目标：子树 `write()` 为 no-op，Loader 不会把组合写回（第 508–523 行）。

### 5.2 package.json 的 `"type": "module"` 要求
- 所有 `@deepseek-ai/dsh-*` 包自身均为 `"type": "module"`（如 `$P/dsh-agent-presets/package.json` 第 13 行），且 DSH 经 Node ESM `import()` 装载插件行。
- 随附 preset 目录**不带 package.json**，只引用 bare 包名与 `cordis:group`。因此 preset 若要引用本地 `.js` 插件文件（如相对 `./restrict.js`），该文件必须是 ESM：要么在 preset 目录放一个 `{"type":"module"}` 的 `package.json`，要么用 `.mjs` 扩展名。（此为 ESM 装载机制的推论；installed checkout 内未找到针对 preset 的逐字 “type:module” 条文，审计时按此推断，不要硬编码为成文规范。）

### 5.3 preset 如何引用本地 `./restrict.js`
- checkout 内**没有名为 `restrict.js` 的文件**，也没有“preset 必须放 restrict.js”的约定；工具限制是运行时 API `ctx.tools.restrict()`（见 2.5）。
- 正确的组合方式：`agent.cordis.yml` 用**相对路径**行 `- { id: restrict, name: './restrict.js' }` 指向 preset 目录内本地插件；该插件 `apply(ctx)` 内调用 `ctx.tools.restrict({ allow: [...] })`。参考宿主实现 `$P/dsh-subagent/lib/index.js` 第 582 行 `childCtx.tools.restrict(composition.toolFilter)`（子 agent 创建窗口内的能力过滤）。

### 5.4 `@deepseek-ai/dsh-persona` 如何挂载
`$P/dsh-persona/lib/types/index.d.ts`：
```ts
// name = 'persona'；Config { text: string; complete?: boolean; includeRuntimeContext?: boolean }
apply(ctx, config)  // 注册 PERSONA_SECTION('deployment:persona')@PERSONA_ORDER(0)
```
- **scope-only**：挂在 agent preset 内遮蔽部署 persona；挂到全局会与 registry 自身注册冲突 fail-loud。
- 实例：`$DSH/config/agent-presets/minimal/agent.cordis.yml`（`complete: true` + `includeRuntimeContext: false` 即“极简锚定”面）；`standard`/`cordis` 版本用 `{{model}}`/`{{cwd}}` 变量。

### 5.5 preset 组合红线（mount 拒绝项）
`$P/dsh-agent-presets/lib/types/mount.d.ts` + `editing-cordis-compositions` SKILL：
- 发布服务的行**不得裸露在 preset 中**，必须包在 `cordis:group` + `isolate` realm 内，否则第二个会话挂载即冲突；`mountPreset`/`standingKeyFor` 会拒绝。
- 未激活行（等待不存在的服务）拒绝；无 scope 目标拒绝。
- 验证用 `standingKeyFor(id)`（真实挂载一次）；`list().broken` 只做 shape 检查，不作可用性验证。

---

## 6. 官方插件开发规范要点（README / SKILL / 实例摘录）

来源：`$DSH/README.md`；`$DSH/config/agent-presets/cordis/skills/{cordis-plugin-development,editing-cordis-compositions}/SKILL.md`；各包 README。

1. **平面规则**：能力要么在 Host 组合（registry、跨会话的 persistence/query/settings/credentials/telemetry、sandbox+approval、模型路由、subagent registry），要么在 agent preset（单个会话贡献的工具/persona/prompt 段落/compaction 策略）。有 agent 平面外消费者的服务不得移入 preset（`subagents` 是反例）。
2. **插件 shape**：`{ name?, inject?, apply(ctx) }`；函数/命名空间插件导出 name/inject/apply、**不 export default**（1.4）。
3. **依赖获取**：可选能力用 `ctx.get('x')` + 判空；仅硬依赖才 `inject: ['x']`（否则 Guard 拒绝未声明 `ctx.x`）。
4. **副作用生命周期**：一切贡献在停止/更新/移除后必须回收——`ctx.on()` 注册事件、`ctx.effect()` 包外部订阅、保留 Service/Tool/Slot/timer 返回的 disposer；**不得在模块作用域或 `apply()` 外创建进程级/页面级副作用**。
5. **工具注册**：参数/返回值必须 JSON 兼容；`execute` 负责业务结果，render/presentation 只负责模型可见与原生 UI；注册须归属当前插件 Fiber（自动随 stop/update 回收）。
6. **内部活数据只读叶子**：禁止对 Service 实例、Event payload、Slot props、Session、ConversationSnapshot、Tool state 做 `JSON.stringify`/`structuredClone`/整体递归拷贝/整对象展示；只取所需标量构造自有 JSON。
7. **preset 编修红线**：永不编辑/删除/覆盖随附 preset（升级会覆盖，损坏 `cordis` 即失去编修能力）；改随附 preset = 先 `copy()` 再改副本；`copy()` 是唯一 authoring 写入；`id` 必须匹配 `[a-z0-9][a-z0-9-]*`。
8. **服务发布 realm 规则**：preset 内发布服务的行必须同组同 `isolate` realm，消费者与提供者同 realm；只消费 host 能力的行不得套 realm。
9. **`[]` / 空文件语义**（1.3）：空 patch 文件抛错，禁用层用 `[]`；组合文件被意外清空/截断等于“零行”。
10. **版本/可重建性**：preset 决定工具 schema 与 prompt 段落，切换预设受 `agent-preset/selected` 事件 + header `agentPreset` 字段约束；空白会话才可 `recompose`（有产物即锁定）。

---

## 7. dsh-infinite 审计快速核对表

| # | 检查项 | 合规依据（上文节号） |
|---|---|---|
| A | 插件导出 `name/inject/apply` 且无 `export default` | 1.4 |
| B | 若为 bundle，`package.json` 有 `"dsh":{"bundle":{"patch":"./cordis.patch.yml"}}` 且 patch 是 `PatchOptions[]` | 1.1 / 1.2 |
| C | patch 文件非空/非仅注释；禁用层用 `[]` | 1.3 |
| D | 命令经 `ctx.commands.register` 且返回 disposer；事件结构匹配 `command/run`/`command/done` | 2.1 |
| E | prompt 段落经 `ctx.systemPrompt.section`，persona 走 `dsh-persona` 行（scope-only） | 2.2 / 5.4 |
| F | 提问经 `ctx.userQuestions.ask`，item/answer 结构匹配 | 2.3 |
| G | HTTP 路由经 `ctx.webServer.register/registerUpgrade/registerFallback/tapIndex` | 2.4 |
| H | 隐藏工具用 `ctx.tools.restrict({ allow: [...] })`（scoped、不得 `{}`、不得 `run_code`） | 2.5 |
| I | 新增会话事件类型：要么合入已知集合语义、要么标 `ignorable: true`，否则读取端拒绝重建 | 3.3 / 3.5 |
| J | 持久化经 `ctx.sessionPersistence` 抽象（locate/create/append/…），不直写 jsonl；zstd 帧带 checksum | 3.1 / 3.6 |
| K | 唤醒 agent 用 `agent.followup/send/steer/inject`，非私改 inbox | 4 |
| L | preset 目录结构 + 本地插件文件为 ESM（`package.json {"type":"module"}` 或 `.mjs`） | 5.1 / 5.2 |
| M | preset 内发布服务的行置于 `cordis:group`+`isolate` | 5.5 |
| N | 不编辑随附 preset；authoring 走 `copy()` | 6.7 |
