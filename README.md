# InfiniteDSH

DeepSeek Harness 上的文学插件：一个会话就是一本书。

它把文字冒险 / 网文创作挂进 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）。你继续用 DSH 的 Web 界面、会话列表和斜杠命令；本仓库不另做 App、不另做书架、也不使用灵叙 / Narra 的品牌与整套桌面端。

当前版本 **0.2.0**。可安装的 Host 组合包名是 `dsh-infinite`。文学会话使用 agent preset **Infinite Play**（`infinite-play`）：模型只写小说正文，不提供 bash、改文件、子代理。

> DSH 仍处于 developer preview，上游可能破坏兼容。本插件按 DSH 0.1.0-rc.5 前后的 Host API 编写。

---

## 它做什么

- **会话即书。** DSH 侧栏里的一项会话就是一本故事。切会话即切书，不另建书架实体。
- **开书点卡片。** Web 里输入 `/new`，弹出带封面的题材 / 主角 / 开局网格；点卡片即选中。没有问答 UI 的环境可以手打参数。
- **规则书写在本会话目录。** `/new` 把整套模板拷进该会话自己的 `infinite/`，之后只读这份副本。换会话不会串设定。
- **关键词注入 + 常驻设定。** 规则书按关键词命中，常驻条目始终在场；角色卡单独注入。
- **随机世界事件。** 每回合可从尚未用过的设定里抽一条，作为可选剧情刺激（不抽写法 / 开篇 / 剧情卡，也不另开第二次模型请求）。
- **只出正文。** 默认打开叙事护栏与推进护栏：不解释规则、不列选项、不写工具计划。
- **长篇压缩落档案。** DSH 做 compaction 时，要点写入本会话的 `archive.md`，同一会话继续写，不另开新卷。
- **干净导出。** `/export` 把对话洗成可读正文，写到 `export.txt`。

未执行 `/new` 的会话，插件不注入任何文学上下文，普通编码会话不受影响。

---

## 别人怎么用：三条路径

| 你是谁 | 怎么装 |
|---|---|
| 只想开书玩 | 先装好 DSH，再克隆本仓库、构建，把 `packages/dsh-infinite` 加进 DSH profile |
| 自己改模板 / 改代码 | 同一套克隆，改完 `npm run build`，重启 DSH |
| 从 DSH 源码树调试 | 用 `--patch` 指向 `examples/play.cordis.yml`（要改里面的绝对路径） |

**不要**执行 `dsh plugin add github:vdnight89/InfiniteDSH`。仓库是 monorepo，根包没有 `dsh.bundle`，子包互相以未发布的 workspace 版本依赖；Git 安装也不会跑本仓库的 TypeScript 构建。支持的安装方式是：**克隆整仓 → 本地构建 → 按路径 `add` 组合包目录**。

---

## 环境要求

1. **Node.js** `^22.19.0` 或 `>=24`
2. **pnpm** 在 `PATH` 上（`dsh plugin` 会把子命令转发给 pnpm）
3. 已能启动的 **DeepSeek Harness**，以及可用的 **DeepSeek API Key**
4. Git（用来下载本仓库）

DSH 最快的启动方式：

```sh
npx @deepseek-ai/dsh web
```

默认打开 [http://127.0.0.1:3080](http://127.0.0.1:3080)。也可以从 [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) 源码构建后用 `pnpm dsh web`。凭据按 DSH 自己的规则读取（环境变量 `DEEPSEEK_API_KEY`、`$DSH_HOME/.credentials.yaml` 或 `.env`）。

Windows 上 `$HOME/.dsh` 一般是 `%USERPROFILE%\.dsh`。若设置了 `DSH_HOME`，本插件也认这个目录。

---

## 下载

```sh
git clone https://github.com/vdnight89/InfiniteDSH.git
cd InfiniteDSH
```

ZIP 也可以：GitHub 仓库页 → **Code** → **Download ZIP**，解压后进入目录，后面的命令一样。

---

## 安装

在仓库根目录构建组合包：

```sh
npm install
npm run build
```

建议顺手跑一遍测试（可选）：

```sh
npm test
npm run typecheck
```

把构建好的 `dsh-infinite` 装进 DSH profile。相对路径会锚定到你执行命令时所在的目录，所以请在本仓库根目录执行。

### 方式 A：加进默认 Web profile（推荐）

```sh
dsh plugin --profile web add ./packages/dsh-infinite
dsh web
```

已有的编码会话还在原来的 `web` profile 里；文学功能随插件加载，只有执行过 `/new` 的会话才会变成一本书。

### 方式 B：单独开一个文学 profile

```sh
dsh plugin --profile infinite add ./packages/dsh-infinite
dsh --profile infinite web
```

首次使用名为 `infinite` 的 profile 时，DSH 会先初始化一份只含 `@deepseek-ai/dsh-base` 的组合。若你还需要官方 Web UI，请再按 DSH 文档把 `@deepseek-ai/dsh-web-app` 加进该 profile；多数人直接用方式 A 更省事。

### 方式 C：从 DSH 源码树用覆盖层加载（开发）

编辑 `examples/play.cordis.yml`，把里面的绝对路径改成你机器上的本仓库路径，然后在 DSH 仓库里：

```sh
pnpm dsh web --patch /你的路径/InfiniteDSH/examples/play.cordis.yml
```

### 装好之后发生了什么

1. `dsh-infinite` 出现在该 profile 的 `dsh.profile.bundles` 里。
2. 插件第一次加载时，若 `%USERPROFILE%\.dsh\.agent-presets\infinite-play`（或 `$DSH_HOME/.agent-presets/infinite-play`）还不存在，会拷入 **Infinite Play** preset。
3. **已经改过** 的 preset 不会被再次覆盖。
4. Web 进程会挂上 `/infinite/covers` 封面和卡片样式。若 DSH 的问答 DOM 以后大改，卡片网格可能退回普通选项列表，命令本身仍可用。

确认层已挂上：

```sh
dsh --profile web --dump-config
```

输出里应能看到 `dsh-infinite` 这一层。

### 升级

```sh
cd InfiniteDSH
git pull
npm install
npm run build
```

本地 `add` 的是这个 checkout。重建后重启 `dsh web` 即可。不要用 `dsh plugin update` 去拉 GitHub 上的未构建源码。

### 卸载

```sh
dsh plugin --profile web remove dsh-infinite
```

这只移除插件层。已经开过的故事文件、以及 `~/.dsh/.agent-presets/infinite-play` 会留在磁盘上，需要的话请自行删除。

---

## 使用

### 第一次开书

1. 启动 DSH Web，打开浏览器里的界面。
2. **新建一个会话**（一本新书 = 一个新会话）。
3. 会话的 agent preset 选 **Infinite Play**。不要用默认的编程 preset：否则模型仍会去调 bash / 改文件。
4. 在输入框输入：

   ```
   /new
   ```

5. 依次点选：
   - **题材**（修仙、末世、深海实验室……）
   - **主角**（用题材默认，或点一张预制角色卡；要自己起名，用界面里的 Other）
   - **开局**（用默认开篇，或点一张剧情卡）
6. 若这个会话里已经有故事，会先问要不要覆盖重开。
7. 看到「已开《……》」之后，直接输入第一个行动，例如「推开山门」或「走进机房」。模型应当只回小说正文。

### 手打命令（无卡片 UI / headless 时必须）

```
/new 修仙
/new 末世 周慎
/new 都市 林晏 force
/new 深海实验室 阿澜
```

`force` 表示覆盖本会话已有故事。没有问答能力时，`/new` 必须带题材；不带参数会报错并列出可选标签。

题材可以用中文名、英文 id 或别名，例如 `修仙` / `cultivation` / `仙侠` 都指向同一套模板。注意：

- **`都市` 会落到「现代」**（日常都市，无异能）。要异能请写 **`都市异能`** 或 `urban`。
- **`赛博` 作为别名会落到「科幻」**。要义体 / 公司那一套，请写 **`赛博朋克`** 或 `cyber`。

### 日常书写

把 DSH 输入框当成「玩家行动 / 作者指令」：

- 「我把令牌拍在案上，问今夜谁当值。」
- 「跳过旅途，直接写到夜宴开席。」
- 「这一段改成更冷、更短的句子。」

模型只应写出可给读者看的叙述。若它开始解释设定、列举选项或自称助手，检查两件事：会话是否选了 **Infinite Play**，以及本会话是否已经 `/new` 成功（目录里要有 `meta.yml`）。

### 换规则书、换主角、导出

| 命令 | 作用 |
|---|---|
| `/new` | 开书。Web 上选题材 / 主角 / 开局；可带参数。 |
| `/new 修仙 谢无妄 force` | 不弹窗，按参数开书；`force` 覆盖旧书。 |
| `/bind` | 查看或换一套规则书（会覆盖本会话设定）。 |
| `/bind 末世` | 直接换到指定题材。 |
| `/cast` | 弹出主角卡；或 `/cast 林晏` 直接改名。 |
| `/export` | 把洗净后的正文写到本会话 `export.txt`。 |
| `/export player` | 同上，但保留玩家行动。 |

### 一本故事在磁盘的哪里

优先写在 DSH 为该会话预留的 artifact 目录下的 `infinite/`。当前持久化后端如果没有逐会话路径（例如部分 SQLite 部署），则写到：

```
~/.dsh/infinite/stories/<sessionId>/infinite/
```

目录结构：

```
infinite/
  meta.yml              # 题材、主角、护栏开关、已抽事件
  worldbook/*.md        # 规则书（设定、开篇、写法……）
  characters/*.md       # 角色卡
  plots/                # 开书时从模板拷来的剧情卡
  archive.md            # compaction 后的剧情档案
  export.txt            # /export 的输出
```

这些文件就是工作副本。你可以用任何编辑器改条目正文、增删角色卡、改 `meta.yml` 里的开关：

| 字段 | 默认 | 含义 |
|---|---|---|
| `narrativeGuard` | `true` | 禁止破第四面墙、列选项、解释规则 |
| `progressionGuard` | `true` | 要求情节往前走，避免空转描写 |
| `randomEvent` | `true` | 每回合抽一条未用设定作刺激 |
| `protagonist` | 题材默认 | 当前主角名 |

改完下一回合就会生效，不必重开会话。不要改别的会话目录，也不要把设定放到工作区根目录——插件不会去那里读。

---

## 预制题材

开书时拷进会话的是整套模板：规则书、开局剧情卡、角色卡。多数条目来自 MIT 许可的灵叙（airp-desktop）叙事资料，并额外补了江湖、校园、刑侦、赛博、以及同人向的深海实验室。

| 标签 | id | 默认主角 | 一句话 |
|---|---|---|---|
| 修仙 | `cultivation` | 谢无妄 | 炼气、筑基、金丹、宗门 |
| 奇幻 | `fantasy` | 谢无妄 | 万族、古族、秘境 |
| 都市异能 | `urban` | 陆沉舟 | 现代城市下的异能与隐秘组织 |
| 现代 | `modern` | 陆沉舟 | 职场与日常，无超自然。别名含「都市」 |
| 无限流 | `infinite` | 陆沉舟 | 副本、轮回、任务世界 |
| 科幻 | `scifi` | 顾晚棠 | 星舰、殖民地、边疆 |
| 末世 | `apocalypse` | 周慎 | 丧尸 / 废土求生 |
| 娱乐圈 | `entertainment` | 裴晏清 | 艺人、热搜、通告 |
| 宫廷 | `palace` | 沈昭宁 | 皇权、后宫、朝堂 |
| 言情 | `romance` | 裴晏清 | 现代恋爱向 |
| 民俗 | `folklore` | 白蘅 | 乡土行业与禁忌 |
| 规则怪谈 | `rulehorror` | 白蘅 | 空间规则与代价 |
| 宅斗 | `zhaidou` | 沈昭宁 | 嫡庶、内宅博弈 |
| 年代 | `retro` | 沈昭宁 | 七八十年代 |
| 江湖 | `wuxia` | 谢无妄 | 门派、客栈、英雄帖 |
| 校园 | `campus` | 林晏 | 学期、社团、竞赛 |
| 刑侦 | `detective` | 周慎 | 现场、口供、程序 |
| 赛博 | `cyber` | 顾晚棠 | 义体、公司、下层街区 |
| 深海实验室 | `whale` | 阿澜 | 同人向：鲸鱼娘、梁组、开源与算力潮汐 |

**深海实验室**是非正式同人设定，与任何真实公司或个人无关。角色包括鲸鱼娘、梁组（梁圣 / 牢梁 / 梁子）、阿澜等。

封面 JPEG 在 `packages/dsh-infinite-preset/covers/`。与灵叙世界图同名的文件来自其 MIT 许可树；鲸鱼娘 / 梁组等图为本仓库生成。

---

## 规则书写法（给想改设定的人）

每条设定是一篇带 YAML 头的 Markdown：

```markdown
---
id: sect-rules
title: 宗门戒律
category: 设定
constant: false
keys: [戒律, 宗门, 罚]
order: 10
---
外门弟子不得夜闯藏经阁。……
```

- `constant: true`：每回合都注入。
- `keys`：最近对话命中这些词才注入。
- `category: 写法 | 开篇 | 剧情`：不会被随机事件抽中。
- 规则书注入有字数上限，默认约 8000 字（插件配置 `maxWorldChars`）。

插件配置（一般不用改）可写在 profile 的 `cordis.patch.yml` 里覆盖 `dsh-infinite` 那一行的 `config`：

| 键 | 默认 | 含义 |
|---|---|---|
| `templatesDir` | 包内 `templates` | 模板根目录 |
| `dataDir` | `~/.dsh/infinite/stories` | 无逐会话路径时的故事根 |
| `dshHome` | `DSH_HOME` 或 `~/.dsh` | DSH 家目录 |
| `maxWorldChars` | `8000` | 规则书注入上限 |

---

## 仓库结构

| 包 | 作用 |
|---|---|
| `infinite-core` | 纯函数：条目解析、关键词匹配、抽卡、护栏、导出洗净。不依赖 Cordis。 |
| `dsh-infinite` | Host 组合包：斜杠命令、提示词、compaction 档案、封面静态路由、preset 安装。 |
| `dsh-infinite-preset` | `infinite-play` preset、19 套模板、封面图。 |

相关文档：

- 设计规格：[`docs/superpowers/specs/2026-08-16-dsh-infinite-design.md`](docs/superpowers/specs/2026-08-16-dsh-infinite-design.md)
- 需求质询：[`docs/grill-airp-on-dsh.md`](docs/grill-airp-on-dsh.md)
- 变更记录：[`CHANGELOG.md`](CHANGELOG.md)
- 用语：[`CONTEXT.md`](CONTEXT.md)

从灵叙仓库重新导入规则书（开发者）：

```sh
npm run import:airp
```

脚本假定旁边有 `../airp-desktop`。导入后请再检查生成的 `catalog.generated.ts` 与封面是否齐全。

---

## 常见问题

**输入 `/new` 没反应或报「无法弹出选项」。**  
当前环境没有 DSH 问答 UI。改用手打：`/new 修仙`。

**模型在列选项、解释规则、或去跑命令。**  
会话 preset 必须是 **Infinite Play**。该 preset 用 `tools.restrict({ allow: [] })` 关掉工具。

**卡片没有封面，只是一排字。**  
确认用的是 Web UI，且插件已加载（`/infinite/covers` 能访问）。DSH 前端 DOM 若大改，增强脚本会放弃美化，退回原生选项。

**想同时写两本。**  
再开一个 DSH 会话，分别 `/new`。不要在同一会话里来回 `/bind` 换世界观，除非你就是要覆盖重开。

**故事文件找不到。**  
先看该会话 artifact 目录下的 `infinite/`；没有再看 `~/.dsh/infinite/stories/`。

**升级 DSH 后插件挂了。**  
DSH 仍在快速改 Host API。把版本和报错开 issue；必要时用 `--patch` 对照本仓库的 `cordis.patch.yml` 检查插件行是否还在。

---

## 许可与致谢

本仓库源码为 [MIT](LICENSE)。

叙事管线（关键词规则书、只出正文、可选护栏、未用设定作回合刺激、洗净导出）受到 MIT 许可的 [灵叙 / airp-desktop](https://github.com/askdfjh/airp-desktop) 启发。本仓库不使用其名称、标志与插画资源。详见 [`NOTICE.md`](NOTICE.md)。

DeepSeek Harness 是 DeepSeek AI 的开源项目；InfiniteDSH 是独立的树外插件，不是官方组件。
