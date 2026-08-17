# Changelog

## 0.3.0 — 2026-08-16

Review-hardened release. Command and world-rule behavior changed; treat this as the first Web-stable line.

- `/export-story` replaces `/export`, so DSH Web’s session-log ZIP keeps `/export`.
- Headless `/new 修仙` no longer throws `NO_PROVIDER`; missing UI uses template defaults or asks for `force`.
- World-rule injection no longer reads `plots/` or 写法 cards. Cross-genre 末世 openings are gone from 修仙.
- Style cards import `title`/`content`; no more `undefined` lore files.
- `/cast` demotes the old constant hero. `/bind` asks before overwrite, or requires `force`.
- `/new 赛博` opens the 赛博 template. `都市` stays 现代; `都市异能` is urban.
- `/export-story` keeps paragraph breaks. Compaction **appends** to `archive.md`.
- `/new` `/bind` `/cast` write a small `infinite/bind` session event.
- Card CSS hides the original option stack. Cover `HEAD` returns no body.
- Genre covers that shared AIRP filenames are original paintings, not copies.
- Root package is now the installable bundle `dsh-infinite` (`dsh.bundle` + `prepare`).  
  `dsh plugin --profile web add github:vdnight89/InfiniteDSH` works in one line.

## 0.2.0 — 2026-08-16

- 开书改为可选卡片：`/new`、`/bind`、`/cast` 走 DSH 问答；Web 上封面网格点选。
- 迁入灵叙全部规则书 / 开局 / 角色卡，并增加江湖、校园、刑侦、赛博、深海实验室。
- 深海实验室同人题材：鲸鱼娘、梁组（梁圣 / 牢梁 / 梁子）。
- 封面静态路由 `/infinite/covers`，问答选项增强为卡片网格。
- 修复：不再每次启动覆盖用户改过的 `infinite-play` preset。
- 修复：随机事件不再抽写法卡、开篇卡、剧情卡。
- 修复：默认主角不再重复写成第二张卡。
- 静态资源仅接受 GET/HEAD。

## 0.1.0 — 2026-08-16

- 首个可安装的 DSH 文学插件：会话即书、规则书注入、护栏、导出、随机事件、compaction 档案。
