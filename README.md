# 诸天万界

**DeepSeek Harness · AI 文字世界冒险**

<p align="center">
  <img src="docs/banner.jpg" alt="诸天万界 DSH：鲸鱼娘与梁圣立于碎裂的万界，身后是修仙、末世、球场、规则怪谈与赛博霓虹" width="100%">
</p>

> 一个会话，就是一扇门。  
> 推开它，你不是在聊天。你是在写，在杀，在活，在死，在诸天万界里把自己活成主角。

这是 DeepSeek Harness 上的文学插件。仓库名 InfiniteDSH，组合包名 `dsh-infinite`。当前 **0.4.5**。  
不另做 App，不另做书架。DSH 侧栏里的一项会话，就是你脚下这一整本。切会话，就是切界。

文学预设叫 **诸天万界**：模型只许吐小说正文。bash、改文件、子代理，全部收刀。你要的不是助手。你要的是世界自己在呼吸。

---

## 一行入界

别人要进这扇门，只需要已经能跑的 DSH，再敲两行。门在 GitHub 上，不走 npm，不求商店审核。

```sh
dsh plugin --profile web add github:vdnight89/InfiniteDSH
dsh web
```

然后：**新开一个会话** → preset 选 **诸天万界** → 输入 `/new` → 点界图 → 点 **启程**。

| 你卡在哪 | 怎么办 |
|---|---|
| 还没有 DSH | `npx @deepseek-ai/dsh web`，浏览器开 http://127.0.0.1:3080 |
| 没有 pnpm | 先装 pnpm。`dsh plugin` 会把它转发给 pnpm |
| 想钉死这一刀 | `dsh plugin --profile web add github:vdnight89/InfiniteDSH#v0.4.5` |
| 已经装过，要换新刀 | `dsh plugin --profile web update dsh-infinite`，**关掉再开** `dsh web`。pnpm 会把 Git 依赖钉在旧提交上，不跑 update 就永远停在旧版。 |
| 卸门 | `dsh plugin --profile web remove dsh-infinite`（故事和 preset 会留在磁盘上） |

仓库带着编好的 `dist/`，Git 安装不必再授权 `prepare`。若你装的是 0.3.0 以前的提交，把 `dsh-infinite` 写进该 profile 的 `pnpm-workspace.yaml` 再 `add` 一次：

```yaml
onlyBuiltDependencies:
  - dsh-infinite
allowBuilds:
  dsh-infinite: true
```

改天书、从源码开炉，往下看「渡劫三途」。

---

## 听着，过客

山门后面是炼气筑基，尸潮后面是最后一块灵石，机房深井里有人把开源协议锁进鲸鱼娘的项圈。  
宫廷的茶还烫着，赛博街区的义体已经开始计息。民俗河面上漂着一盏不该亮的灯。规则怪谈的走廊里，有一行字写着：不要回头。

**诸天万界** 把这些界缝进 DeepSeek Harness。  
你出一张口，世界就得接着演。你写一句「我把令牌拍在案上」，山门就得响。你写「带上鲸鱼娘」，电梯就得下行。

没有第四面墙。没有选项清单。没有「作为 AI 我建议你」。  
只有正文。只有你还敢不敢再走一步。

| 这一招 | 落在哪 |
|---|---|
| 会话即书 | 一本新书 = 一个新会话。万界不共用同一具身体。 |
| 封面开书 | `/new` 弹出题材 / 主角 / 开局卡片。点下去，界就立住。 |
| 规则书随你走 | 全套设定拷进**本会话**目录。换界不串味。 |
| 关键词即天机 | 你提到藏经阁，藏经阁就醒。常驻条目永远压在天幕上。 |
| 随机世界事件 | 每回合可从尚未动用的设定里抽一条刺激。不抽写法，不抽开篇，不开第二次模型。 |
| 只出正文 | 叙事护栏 + 推进护栏默认全开。空转描写，滚。 |
| 长篇落档案 | compaction 把剧情要点**追加**进 `archive.md`。同一会话写到地老天荒。 |
| 洗净导出 | `/export-story` 洗成可读正文。DSH Web 自己的 `/export` 是日志 ZIP，别抢。 |

没开过 `/new` 的会话，插件不碰。编码的人继续编码。写书的人，去写书。

---

## 渡劫三途

| 你是谁 | 怎么入界 |
|---|---|
| 只想开书 | 回到上面「一行入界」。GitHub 这一行就是正门。 |
| 要改天书 | 克隆本仓，根目录 `dsh plugin --profile web add .` |
| 从 DSH 源码里凿门 | `--patch` 指向 `examples/play.cordis.yml`（改成你机器上的绝对路径） |

先备好刀：

1. **Node.js** `^22.19.0` 或 `>=24`
2. **pnpm** 在 `PATH` 上（`dsh plugin` 会把它转发给 pnpm）
3. 已经能跑的 **DeepSeek Harness**，以及可用的 **DeepSeek API Key**
4. Git

DSH 本尊最快的点灯方式：

```sh
npx @deepseek-ai/dsh web
```

浏览器开 [http://127.0.0.1:3080](http://127.0.0.1:3080)。凭据按 DSH 自己的规矩读：`DEEPSEEK_API_KEY`、`$DSH_HOME/.credentials.yaml` 或 `.env`。  
Windows 上 `$HOME/.dsh` 多半是 `%USERPROFILE%\.dsh`。设了 `DSH_HOME`，本插件也认。

官方发现靠 GitHub topic **`dsh-plugin`**。`dsh-find-plugin`、dsh-market 一类货架都扫这个标签。本仓已挂上。npm 包名预留 `dsh-infinite`，尚未上架——现在不要写 `dsh plugin add dsh-infinite`，会扑空。

### 从源码开炉

```sh
git clone https://github.com/vdnight89/InfiniteDSH.git
cd InfiniteDSH
npm install
dsh plugin --profile web add .
dsh web
```

相对路径锚定到你敲命令的目录。务必在**仓库根**执行 `add .`。不要再 `add ./packages/dsh-infinite`——对外组合包就是根上这个 `dsh-infinite`。

### 确认门还在

```sh
dsh --profile web --dump-config
```

看见 `dsh-infinite` 这一层，就是界立住了。  
插件首次加载会把 **诸天万界** 拷到 `~/.dsh/.agent-presets/infinite-play`。若你还停在旧英文名 Infinite Play，下次加载会改成诸天万界。已经含「诸天万界」的改稿，不会被覆盖。

---

## 入世

1. 点亮 DSH Web。
2. **新开一个会话。** 一本新书，一具新身体。
3. preset 选 **诸天万界**。默认编程预设会去跑命令，那是另一条命。
4. 输入：

```
/new
```

5. 点选一界、天命之人、落足之处。已经有故事会先问你要不要撕开重入。
6. 三键出来：**启程** / 另择开局 / 更换天命之人。点「启程」，第一段才落笔。  
   写完后弹出【歧路】三择，点一条继续；也可以自己写一条别的路。

没有卡片 UI 时，手打：

```
/new 修仙
/new 末世 周慎
/new 都市 林晏 force
/new 深海实验室 阿澜
```

`force` 就是撕掉旧界。没有问答能力时，`/new` 必须带题材。

口令可以对上中文名、英文 id 或别名：

- **`都市` → 现代**（日常，无异能）。异能请写 **`都市异能`**。
- **`赛博` / `赛博朋克` → 赛博**。星舰请写 **`科幻`**。

### 你开口，世界接招

把输入框当成你的手：

- 「我把令牌拍在案上，问今夜谁当值。」
- 「跳过旅途，直接写到夜宴开席。」
- 「这一段改成更冷、更短的句子。」

它若开始解释规则、列举选项、自称助手——检查两件事：是不是 **诸天万界**，本会话有没有 `meta.yml`。

| 令 | 事 |
|---|---|
| `/new` | 进入新世界。弹出界图，选题材与天命之人。 |
| `/new 修仙 谢无妄 force` | 不弹窗，按参数开界。 |
| `/bind` | 改投他界（会覆盖本会话天书）。 |
| `/bind 末世` | 直接坠入末世。 |
| `/cast` | 更换天命之人；或 `/cast 林晏`。 |
| `/export-story` | 拟题后誊出精排 Markdown 书稿到当前工作区（不是上面那个会话日志压缩包）。 |
| `/export-story player` | 连你的行动一起留下。 |

故事优先落在该会话 artifact 目录的 `infinite/`。没有逐会话路径时：

```
~/.dsh/infinite/stories/<sessionId>/infinite/
```

```
infinite/
  meta.yml              # 界契：题材、主角、护栏、已抽事件
  worldbook/*.md        # 天书
  characters/*.md       # 角色
  plots/                # 开局剧情卡
  archive.md            # 长篇档案
  export.txt            # 洗净后的书
```

这些文件就是工作副本。改完下一回合生效。`narrativeGuard` / `progressionGuard` / `randomEvent` 默认全开。

---

## 万界名册

开书时，整套模板砸进你的会话：规则书、开局、角色卡。十九扇门，十九种活法。

| 界 | 令 | 默认主角 | 门外是什么 |
|---|---|---|---|
| 修仙 | `cultivation` | 谢无妄 | 炼气、筑基、金丹、宗门 |
| 奇幻 | `fantasy` | 谢无妄 | 万族、古族、秘境 |
| 都市异能 | `urban` | 陆沉舟 | 霓虹下面还有另一套神经 |
| 现代 | `modern` | 陆沉舟 | 职场与日常，无超自然 |
| 无限流 | `infinite` | 陆沉舟 | 副本、轮回、任务世界 |
| 科幻 | `scifi` | 顾晚棠 | 星舰、殖民地、边疆 |
| 末世 | `apocalypse` | 周慎 | 丧尸与废土 |
| 娱乐圈 | `entertainment` | 裴晏清 | 热搜比刀快 |
| 宫廷 | `palace` | 沈昭宁 | 皇权、后宫、朝堂 |
| 言情 | `romance` | 裴晏清 | 现代恋爱向 |
| 民俗 | `folklore` | 白蘅 | 乡土行业与禁忌 |
| 规则怪谈 | `rulehorror` | 白蘅 | 违者被「它」带走 |
| 宅斗 | `zhaidou` | 沈昭宁 | 嫡庶、内宅、一步一劫 |
| 年代 | `retro` | 沈昭宁 | 粮票、供销社、改命 |
| 江湖 | `wuxia` | 谢无妄 | 门派、客栈、英雄帖 |
| 校园 | `campus` | 林晏 | 学期、社团、错过的人 |
| 刑侦 | `detective` | 周慎 | 现场、口供、程序 |
| 赛博 | `cyber` | 顾晚棠 | 义体、公司、下层街区 |
| 深海实验室 | `whale` | 阿澜 | 鲸鱼娘、梁组、算力潮汐 |

**深海实验室**是非正式同人戏。鲸鱼娘、梁组（梁圣 / 牢梁 / 梁子）、阿澜，都不是任何真实公司或个人。笑可以，别写成说明书。

头图与封面均为本仓库原创。叙事管线受 MIT 许可的灵叙启发，不用它的品牌与插画。

---

## 改天书

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

- `constant: true`：每回合都在。
- `keys`：你提到这些词，它才现身。
- `写法` / `开篇` / `剧情`：随机事件不抽它们。
- 注入上限默认约 8000 字（`maxWorldChars`）。

---

## 炉子里有什么

| 包 | 职 |
|---|---|
| `infinite-core` | 匹配、抽卡、护栏、导出。不依赖 Cordis。 |
| 根包 `dsh-infinite` | 对外组合包：命令、提示词、档案、封面路由。 |
| `dsh-infinite-preset` | 诸天万界预设与十九套模板。 |

规格 / 质询 / 变更：`docs/superpowers/specs/`、`docs/grill-airp-on-dsh.md`、[`CHANGELOG.md`](CHANGELOG.md)。

---

## 卡关

**`/new` 没弹窗。** 没有问答 UI。手打：`/new 修仙`。  
**模型在列选项、跑命令。** 切到诸天万界。  
**卡片没封面。** 确认 Web UI 且 `/infinite/covers` 活着。  
**想同时活两本。** 再开一个会话。同一会话里来回 `/bind`，是撕书，不是分身。  
**找不到稿。** 先看会话目录下的 `infinite/`，再看 `~/.dsh/infinite/stories/`。

DSH 仍是 developer preview，上游可能拆门。本插件按 0.1.0-rc.5 前后的 Host API 写就。

---

## 许可

源码 [MIT](LICENSE)。详见 [`NOTICE.md`](NOTICE.md)。

DeepSeek Harness 是 DeepSeek AI 的开源项目。诸天万界是独立的树外插件，不是官方组件。

---

门在。刀也在。  
你还站在外面干什么？
