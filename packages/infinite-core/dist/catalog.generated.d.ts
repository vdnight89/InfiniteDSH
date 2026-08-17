export interface TemplateInfo {
    readonly id: string;
    readonly label: string;
    readonly description: string;
    readonly aliases: readonly string[];
    readonly defaultProtagonist: string;
}
export declare const TEMPLATE_CATALOG: readonly TemplateInfo[];
