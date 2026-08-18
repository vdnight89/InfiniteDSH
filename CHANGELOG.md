# Changelog

## 0.4.1 — 2026-08-18

- 换上新头图：鲸鱼娘与梁圣立于碎裂的万界，金字写着诸天万界 DSH。
- README 把「一行入界」提到最前。正门是 GitHub 一行 `add`，不再把未上架的 npm 写成可走之路。
- GitHub About / Topics / 仓库说明按诸天万界补全，方便 `dsh-plugin` 货架扫到。

## 0.4.0 — 2026-08-18

诸天万界开书面：选完不再空停，点「启程」才写第一段。

- 文学预设改名 **诸天万界**。旧英文 Infinite Play 在下次加载时会被刷新；你改过且已含「诸天万界」的 preset，不会被覆盖。
- `/new` 空参必弹界图。选完题材 / 天命之人 / 开局后出现三键：启程、另择开局、更换天命之人。点启程才代打第一句。
- 正文末必须接【歧路】三条短行动，并写明亦可自己写。导出时剥掉这块。
- 命令名仍是英文；给人看的字全部换成诸天万界口吻。`/export-story` 写明誊的是书稿，不是会话日志包。
- 末世 / 校园 / 刑侦补上默认天命之人；校园、赛博、刑侦、江湖、科幻补满至少三处开局。科幻补了开篇种子。
- `cards.js` 一张卡也出封面；主角 / 开局 / 三键复用刚选的界图。

## 0.3.3 — 2026-08-17

- Cordis 会把 `default` 当成整个插件，丢掉旁边的 `inject`。已去掉 default 导出，Web 启动不再报 `cannot get property "commands" without inject`。

## 0.3.2 — 2026-08-17

- 根包去掉 `file:` 依赖，宿主打成单文件 `index.bundle.js`。Git 安装不再去 profile 目录里找 `packages/dsh-infinite-preset`。

## 0.3.1 — 2026-08-17

- Git 安装不再跑 `prepare`。编译产物随仓库发布，避开 pnpm `onlyBuiltDependencies` 拦截。

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
- 中文名定为 **诸天万界**。README 换成热血介绍，并加上万界头图。

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
