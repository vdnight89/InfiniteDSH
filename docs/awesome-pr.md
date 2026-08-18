# 诸天万界DSH 投递与宣传

仓库：https://github.com/vdnight89/InfiniteDSH  
安装：`dsh plugin --profile web add github:vdnight89/InfiniteDSH`  
预设名：**诸天万界DSH**。货架扫 topic **`dsh-plugin`**。

## GitHub About（热血短句，已改）

```
一会话，一扇门，一界命数。诸天万界DSH：DeepSeek Harness 上的文字修罗场。十九扇门点封面启程，不助手不提纲只写正文；誊出来的，是你活过的天书。
```

`package.json` 的 `description` 必须与这句同步（npm / 货架扫包吃这一句）。

## 已经投了

| 渠道 | 状态 |
|---|---|
| GitHub topic `dsh-plugin` + `dsh` + `deepseek-harness` + `cordis` | 已挂。`dsh-find-plugin` 等货架默认搜这个 |
| [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) | PR 已开：https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/1616 。CI 全绿（Submission gate + check），等维护者合并。描述已原地更新（见下「货架条目」），并挂了 4 张截图进 `data/screenshots.json`。合并后 [awesome-dsh-plugin.com](https://awesome-dsh-plugin.com/) 和站内 **dsh-market** 会自动带上 |
| GitHub About | 已改成上句 |

awesome 的提交格式：不要手改 README。在 `data/plugins/vdnight89__InfiniteDSH.yml` 加一条，再跑 `npm ci && node scripts/generate-readme.mjs`，把 YAML 和两份生成的 README 一起提交。分类用 `skill`。描述只写功能、以句号结尾，禁止营销词。已发出的 PR 不用撤回：往 fork 分支 `add-infinitedsh` 推新提交即原地更新。

`data/screenshots.json` 是 `{ "<仓库URL>": ["<raw 图 URL>", …] }`，挂了我们仓库 main 分支 `docs/` 下的 4 张截图（选界 / 天命之人 / 三键 / 正文+歧路）。

## 还能投的货架（按优先级）

1. **[0xsline/awesome-deepseek-harness](https://github.com/0xsline/awesome-deepseek-harness)**  
   人工精选，不自动扫 topic。分类建议 **Domain & Specialist Skills**（写作）或 **Fun & Lifestyle**。  
   在 `README.md` 与 `README.zh-CN.md` 各加一行，PR 标题 `docs: add InfiniteDSH`。1616 合上后再开。

   英文：
   ```
   - [vdnight89/InfiniteDSH](https://github.com/vdnight89/InfiniteDSH) — 诸天万界DSH: one DSH session is one book; a cover-card picker opens 19 realms, a prose-only preset locks the model to fiction, keyword worldbook lore grounds each turn, and /export-story typesets the session into a Markdown novel.
   ```
   中文：
   ```
   - [vdnight89/InfiniteDSH](https://github.com/vdnight89/InfiniteDSH) — 诸天万界DSH：一个会话就是一本书。封面开书十九界，只写正文，规则书按关键词注入，/export-story 誊成 Markdown 小说。
   ```

2. **[dsh.so/submit](https://www.dsh.so/submit/)**  
   验证向目录。填仓库 URL 即可，他们用 GitHub API 核存在。

3. **[deepseekplugins.com](https://deepseekplugins.com/)**  
   独立目录，页面写了欢迎投稿。看站内 `/submit`。

4. **[dshplugin.store](https://dshplugin.store/)**、[dshmarketplace.dev](https://dshmarketplace.dev/)、[dshplugin.me](https://dshplugin.me/)  
   多数扫 `dsh-plugin` topic，**不用单独投稿**。awesome 合并后描述会更好看。

5. **[Anil-matcha/awesome-dsh-plugin](https://github.com/Anil-matcha/awesome-dsh-plugin)**  
   镜像/精选列表，可顺手开同样一行的 PR，优先级低于上面两个。

不要去投只收 `dsh.client` 皮肤的货架。我们是 Host bundle。

## 货架之外的宣传

| 途径 | 怎么做 | 备注 |
|---|---|---|
| Reddit [r/DeepSeek](https://www.reddit.com/r/DeepSeek/) | 发 Show 帖：装一行、一张封面开书图、一句「one session = one book」 | 生态帖已有人在发 plugin |
| 即刻 / 小红书 / V2EX | 中文：诸天万界DSH + 封面开书短视频或 3 张图 | 比英文社区更吃中二文案 |
| X / 微博 | 挂 `#DeepSeek` `#DSH` `#诸天万界`，链仓库 | About 那句可当推文 |
| DeepSeek 官方 Discord / 反馈群 | 插件频道丢安装命令 | 有就发，没有别硬找 |
| npm 上架 `dsh-infinite` | `dsh plugin add dsh-infinite` 比 Git 一行更短 | awesome 维护者推荐；要另开 npm 账号 |
| GitHub Release 附图 | 已有 banner；开书/歧路/誊书截图已进 `docs/` | awesome 的 `data/screenshots.json` 已挂 4 张 |
| 给 dsh-find-plugin 喂词 | 用户问「文字冒险 / 写小说 / interactive fiction」能搜到 | 靠 topic + awesome 双语描述 |

## 建议的对外短句（社区帖用，货架描述不要用）

> 一会话，一扇门，一界命数。诸天万界DSH：DeepSeek Harness 上的文字修罗场。十九扇门点封面启程，只写正文。誊出来的 Markdown，是你活过的天书。
>
> ```
> dsh plugin --profile web add github:vdnight89/InfiniteDSH
> ```

## 货架条目（事实描述，投递用；含 `: ` 的英文必须加引号）

```
Literary DSH plugin: one session is one book. Cover-card /new opens one of 19 realms, a prose-only 诸天万界DSH preset keeps the model writing fiction, keyword worldbook entries ground each turn, and /export-story typesets the session into a Markdown novel.
```

```
诸天万界DSH：一个会话就是一本书。封面开书，十九界任选，文学预设只写正文，规则书按关键词注入，/export-story 把整场会话誊成 Markdown 小说。
```

## 先别做的

- 改仓库名为中文。会弄断所有 `github:vdnight89/InfiniteDSH` 安装。
- 在 awesome 描述里写修罗场 / 活过的天书。会被打回。
- 同时给十个镜像列表开空壳 PR。先盯 1616 合上，再打 0xsline 和 dsh.so。
