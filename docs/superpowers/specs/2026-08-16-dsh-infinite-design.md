# dsh-infinite 规格

日期：2026-08-16  
状态：已按质询共识开工  
质询记录：[`docs/grill-airp-on-dsh.md`](../../grill-airp-on-dsh.md)

## 目标

树外 DSH 插件：一个文学会话就是一本书。不移植灵叙 UI，不进 DSH 源码树。

## 已锁决策

A+D 插件；Host bundle + 文学 preset；C2 能力；B1 会话=书；T1 无编码工具；F1+F2+F3 模板拷到会话目录；O4 `/new [题材]`；无场景分析；M2 compaction 档案；N1 包名 `dsh-infinite`。

## 包

| 包 | 职责 |
|---|---|
| `infinite-core` | 纯函数：条目解析、匹配、抽卡、护栏、导出洗净、档案文本 |
| `dsh-infinite` | Host 插件：命令、提示词、compaction 钩子、会话目录 |
| `dsh-infinite-preset` | `infinite-play` preset + 修仙/末世/都市模板 |

## 会话目录

优先 `sessionPersistence.locate(header).path` 的父目录；否则 `$DSH_HOME` 或 `~/.dsh` 下的 `infinite/stories/<sessionId>/`。

```
<sessionDir>/infinite/
  meta.yml
  worldbook/*.md
  characters/*.md
  archive.md
  export.txt
```

未执行 `/new` 的会话：插件不注入任何文学上下文（编码会话不受影响）。

## 命令

- `/new [题材]` — 拷模板；目录已存在则拒绝，除非 `/new 修仙 force`
- `/bind [题材]` — 显示或更换模板（更换需 `force`）
- `/cast <主角>` — 写 meta 与角色卡名
- `/export [player]` — 洗净正文写到 `export.txt`；带 `player` 则保留玩家行动

题材：`修仙|cultivation`、`末世|apocalypse`、`都市|urban`，缺省修仙。

## 提示词

仅当存在 `meta.yml`：

1. 只出正文  
2. 护栏（meta 开关，默认开）  
3. 规则书常驻 + 关键词命中（上限 8000 字）  
4. 角色卡  
5. 本回合随机事件（turn/start 抽 1 条，turn/end 记入已抽）  
6. `archive.md`

用 `systemPrompt.section`（稳定）与 `systemPrompt.context`（动态，可进日志快照）。

## 文学 preset

`~/.dsh/.agent-presets/infinite-play`：persona 改为叙事者；`tools.restrict({ allow: [] })`。插件加载时若目录不存在则拷入。

## 非目标

书架、阅读器、场景分析、二次模型调用、续卷、灵叙 JSON 导入、client 包。
