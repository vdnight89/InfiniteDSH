# InfiniteDSH

DeepSeek Harness 树外插件（0.2.0）：把文字冒险 / 文学创作收成 **一个会话就是一本书**。不另做软件，不移植灵叙整套 App，但开书用封面卡片点选。

- 包名：`dsh-infinite`
- 文学 preset：`infinite-play`（关掉 bash / 改文件 / 子代理）
- 预制题材：修仙、奇幻、都市异能、现代、无限流、科幻、末世、娱乐圈、宫廷、言情、民俗、规则怪谈、宅斗、年代，以及江湖、校园、刑侦、赛博、**深海实验室**（鲸鱼娘 / 梁组 / 梁圣 / 牢梁 / 梁子，同人向）。每本带规则书条目、开局剧情卡、角色卡。

## 安装

```sh
cd InfiniteDSH
npm install
npm test
npm run build
```

装进自己的 DSH profile：

```sh
dsh plugin --profile infinite add ./packages/dsh-infinite
dsh --profile infinite web
```

开发期也可从 DSH 源码树用覆盖层加载（改 `examples/play.cordis.yml` 里的绝对路径）：

```sh
pnpm dsh web --patch F:/DocProject/InfiniteDSH/examples/play.cordis.yml
```

插件首次加载会把 `infinite-play` 拷到 `%USERPROFILE%\.dsh\.agent-presets\infinite-play`（或 `$DSH_HOME`）。新开会话后在 Web UI 里选 **Infinite Play**。

## 用法

1. 新开一个 DSH 会话，切到 `infinite-play`
2. 输入 `/new`：Web UI 会弹出带封面的卡片网格（题材 / 主角 / 开局）。点卡片即选中。已有故事时先问是否覆盖。
3. 也可以仍用手打：`/new 修仙`、`/new 末世 周慎`、`/new 都市 林晏 force`
4. `/bind`、`/cast` 不带参数时同样弹出选项
5. 输入行动，模型只出正文
6. `/export` 得到会话目录里的干净 `export.txt`；`/export player` 保留玩家行动

没有问答 UI 的环境（例如部分 headless）里，`/new` 必须带题材参数。

## 一本故事在哪

优先写在 DSH JSONL 为该会话预留的目录下的 `infinite/`。没有逐会话路径时，写到 `~/.dsh/infinite/stories/<sessionId>/infinite/`。

## 仓库

| 包 | 作用 |
|---|---|
| `infinite-core` | 匹配、抽卡、护栏、导出（无 Cordis） |
| `dsh-infinite` | 命令、提示词、compaction 档案 |
| `dsh-infinite-preset` | preset 与模板 |

规格：`docs/superpowers/specs/2026-08-16-dsh-infinite-design.md`  
质询：`docs/grill-airp-on-dsh.md`

灵感来自 MIT 许可的灵叙（airp-desktop）叙事管线，不使用其品牌与插画。DSH 0.1.0-rc.5 开发者预览，上游可能破坏兼容。
