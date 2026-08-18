export declare const WORLD_NAME = "\u8BF8\u5929\u4E07\u754C";
export declare const PRESET_NAME = "\u8BF8\u5929\u4E07\u754C";
export declare const PRESET_DESCRIPTION = "\u7A7F\u8D8A\u8BF8\u5929\uFF0C\u4E00\u4E66\u4E00\u754C\u3002\u4E0D\u6267\u5200\u65A7\uFF0C\u53EA\u5199\u6B63\u6587\u3002";
export declare const ASK_HEADER = "\u8BF8\u5929\u4E07\u754C";
export declare const TOPIC_QUESTION = "\u8E0F\u5165\u54EA\u4E00\u754C\uFF1F";
export declare const TOPIC_DETAIL = "\u70B9\u9009\u4E00\u754C\uFF0C\u5929\u4E66\u5C06\u843D\u5165\u672C\u4F1A\u8BDD\u3002\u4EA6\u53EF\u5199\u4E0B /new \u4FEE\u4ED9 \u76F4\u5165\u3002";
export declare const PROTAGONIST_QUESTION = "\u8C01\u4E3A\u5929\u547D\u4E4B\u4EBA\uFF1F";
export declare const OPENING_QUESTION = "\u4ECE\u6B64\u754C\u4F55\u5904\u843D\u8DB3\uFF1F";
export declare const OVERWRITE_QUESTION = "\u6B64\u4F1A\u8BDD\u5DF2\u6709\u4E00\u754C\uFF0C\u8981\u6495\u5F00\u91CD\u5165\u5417\uFF1F";
export declare const OVERWRITE_YES = "\u6495\u5F00\u91CD\u5165";
export declare const OVERWRITE_NO = "\u7559\u5728\u6B64\u754C";
export declare const EMBARK = "\u542F\u7A0B";
export declare const REPICK_OPENING = "\u53E6\u62E9\u5F00\u5C40";
export declare const REPICK_PROTAGONIST = "\u66F4\u6362\u5929\u547D\u4E4B\u4EBA";
export declare const BIND_QUESTION = "\u6539\u6295\u4ED6\u754C\uFF1F";
export declare const CANCELLED = "\u672A\u6539\u754C\uFF0C\u4ECD\u7ACB\u4E8E\u6B64\u3002";
export declare function defaultBodyHint(name: string): string;
export declare function embarkDetail(world: string, protagonist: string): string;
export declare function openedWaiting(world: string, protagonist: string): string;
export declare function openedEmbarked(world: string, protagonist: string): string;
export declare function needForceText(): string;
export declare function unknownWorld(known: string): string;
export declare function pickWorldHint(): string;
export declare function boundTo(world: string): string;
export declare function noWorldYet(): string;
export declare function castNeedName(): string;
export declare function castDone(name: string, count: number): string;
export declare function exportDone(chars: number, path: string): string;
export declare function sessionTitle(world: string, protagonist: string): string;
export declare const FIRST_STEP_TEXT = "\u542F\u7A0B\u3002";
export declare const FORK_QUESTION = "\u8D70\u54EA\u4E00\u6761\u6B67\u8DEF\uFF1F";
export declare const FORK_DETAIL = "\u70B9\u4E00\u6761\u7EE7\u7EED\u3002\u4E5F\u53EF\u5728\u4E0B\u65B9\u81EA\u5DF1\u5199\u4E00\u6761\u522B\u7684\u8DEF\u3002";
export declare const WRITE_OWN = "\u81EA\u5DF1\u5199\u4E00\u6761\u522B\u7684\u8DEF";
export declare function isEmbarkChoice(picked: string): boolean;
export declare const COMMANDS_COPY: {
    readonly new: {
        readonly description: "进入新世界：弹出界图选题材与天命之人";
        readonly hint: "修仙 | 末世 | 都市异能 | 现代  [名字]  [force]";
    };
    readonly bind: {
        readonly description: "改投他界（会覆盖本会话天书）";
        readonly hint: "[界名] [force]";
    };
    readonly cast: {
        readonly description: "更换天命之人";
        readonly hint: "[名字]";
    };
    readonly 'export-story': {
        readonly description: "誊出此界书稿（不是上面那个会话日志压缩包）";
        readonly hint: "[player]";
    };
};
