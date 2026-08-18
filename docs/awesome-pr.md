# awesome-dsh-plugin 投稿草稿

目标仓库：https://github.com/awesome-dsh-plugin/awesome-dsh-plugin  
分类建议：**Skills**（文学会话 / 开书 preset）。维护者若觉得更合适，可改到 Just for Fun。

按 [contributing.md](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)：在 `README.md` 与 `README.zh.md` 对应分类下各加一行，描述只写功能、以句号结尾。

## 先做完再开 PR

1. GitHub Topics 已挂：`dsh-plugin`、`dsh`、`deepseek-harness`。
2. 根包带 `dsh.bundle`，`dist/` 随仓库。
3. 一行能装：

```sh
dsh plugin --profile web add github:vdnight89/InfiniteDSH
```

## PR 标题

```
Add vdnight89/InfiniteDSH to Skills
```

## PR 说明

```
Repo declares a dsh.bundle manifest (installable via dsh plugin add).
Product name: 诸天万界. Root package: dsh-infinite. Compiled dist is in the repo.

Install:
dsh plugin --profile web add github:vdnight89/InfiniteDSH

One DSH session is one literary book: cover-card /new, 诸天万界 prose-only preset, keyword worldbook.
```

## README.md 要加的一行（Skills）

```
- [vdnight89/InfiniteDSH](https://github.com/vdnight89/InfiniteDSH) - 诸天万界: literary sessions for DeepSeek Harness. One chat is one book, with cover-card openings and keyword worldbook injection.
```

## README.zh.md 要加的一行（Skills）

```
- [vdnight89/InfiniteDSH](https://github.com/vdnight89/InfiniteDSH) — 诸天万界：一个 DSH 会话就是一本书，封面开书，点启程落第一段，规则书按关键词注入。
```

开 PR：https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/compare
