# awesome-dsh-plugin 投稿草稿

目标仓库：https://github.com/awesome-dsh-plugin/awesome-dsh-plugin  
分类建议：**Skills**（文学会话 / 开书 preset）。维护者若觉得更合适，可改到 Just for Fun。

按 [contributing.md](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)：在 `README.md` 与 `README.zh.md` 对应分类下各加一行，描述只写功能、以句号结尾。

## 先做完再开 PR

1. GitHub 仓库 Settings → Topics 加上：`dsh-plugin`、`dsh`、`deepseek-harness`（本机 `gh` 未登录，无法代加）。
2. 推送包含根包 `dsh.bundle` 的提交。
3. 确认一行能装：

```sh
dsh plugin --profile web add github:vdnight89/InfiniteDSH
```

pnpm ≥10 第一次会要求在 profile 的 `pnpm-workspace.yaml` 里写 `allowBuilds.dsh-infinite: true`。

## PR 标题

```
Add vdnight89/InfiniteDSH to Skills
```

## PR 说明

```
Repo declares a dsh.bundle manifest (installable via dsh plugin add).
Monorepo: the root package is dsh-infinite; prepare builds TypeScript.

Install:
dsh plugin --profile web add github:vdnight89/InfiniteDSH

One DSH session is one literary book: cover-card /new, session-local worldbook, prose-only Infinite Play preset.
```

## README.md 要加的一行（Skills）

```
- [vdnight89/InfiniteDSH](https://github.com/vdnight89/InfiniteDSH) - Literary sessions for DeepSeek Harness: one chat is one book, with cover-card openings and keyword worldbook injection.
```

## README.zh.md 要加的一行（Skills）

```
- [vdnight89/InfiniteDSH](https://github.com/vdnight89/InfiniteDSH) — 文学会话：一个 DSH 会话就是一本书，封面卡片开书，规则书按关键词注入。
```

开 PR：https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/compare
