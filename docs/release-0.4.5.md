一头图、一行入界。当前稳定刀 **0.4.5**。

别人只要已经能跑 DSH，再敲：

```
dsh plugin --profile web add github:vdnight89/InfiniteDSH
dsh web
```

已装过的：

```
dsh plugin --profile web update dsh-infinite
```

然后关掉再开 `dsh web`。pnpm 会把 Git 依赖钉在旧提交上，不跑 update 就永远停在旧版。

钉死这一刀：`github:vdnight89/InfiniteDSH#v0.4.5`

### 0.4.5
- 护栏改成心里遵守：禁止把构思、英文指令、角色清单写进回复。
- 誊书丢掉写作计划。「用户让我写小说正文」不会进稿。

### 0.4.4
- `/export-story` 誊出精排 Markdown：书名、诸天万界题记、分章标题与正文。落到工作区的是 `.md`。

### 0.4.3
- 歧路只列三条。自己走写在「输入你的答案」。
- 誊书先拟题再问你，书稿落到当前工作区，并尽量打开所在文件夹。

### 0.4.2
- 点「启程」叫醒模型写第一段。
- 正文后的【歧路】可点。
