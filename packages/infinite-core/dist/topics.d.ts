import type { TemplateId } from './types.js';
export interface TopicChoice {
    readonly id: TemplateId;
    readonly label: string;
    readonly description: string;
}
export declare const TEMPLATE_IDS: readonly TemplateId[];
export declare const TOPIC_CHOICES: readonly TopicChoice[];
export declare function topicChoice(id: TemplateId): TopicChoice;
export declare function catalogEntry(id: string): import("./catalog.generated.js").TemplateInfo | undefined;
export declare function bookNameForTemplate(templateId: string): string;
export declare function isKeepDefaultChoice(chosen: string, keep: string): boolean;
/** Resolve a user topic token to a shipped template id. Empty → null (caller should ask). */
export declare function resolveTemplateId(raw: string | undefined): TemplateId | null;
export declare function templateIdFromLabel(label: string): TemplateId | null;
export declare function defaultProtagonist(templateId: TemplateId): string;
export declare function parseCommandArgs(rawInput: string): {
    topic: string;
    force: boolean;
    rest: string[];
};
export declare const KEEP_DEFAULT_PROTAGONIST = "\u4EE5\u6B64\u754C\u9ED8\u8BA4\u4E4B\u8EAB";
export declare const KEEP_DEFAULT_OPENING = "\u8D70\u6B64\u754C\u9ED8\u8BA4\u5F00\u5C40";
