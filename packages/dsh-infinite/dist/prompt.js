import { bookNameForTemplate, buildCharacterContext, buildNarrativeGuard, buildProgressionGuard, buildProseOnlyGuard, buildWorldContext, formatRandomEvent, } from 'infinite-core';
import { infiniteRoot, resolveSessionDir } from './paths.js';
import { loadArchive, loadCharacters, loadMeta, loadWorldbook } from './story-files.js';
import { hasAssistantProse, recentText } from './transcript.js';
function storyRoot(ctx, assemble, config) {
    const session = assemble.agent?.session;
    if (!session)
        return null;
    const root = infiniteRoot(resolveSessionDir(ctx, session, config));
    return loadMeta(root) ? root : null;
}
export function registerPrompt(ctx, config) {
    ctx.systemPrompt.section({
        name: 'infinite:prose',
        order: 20,
        text: (assemble) => {
            const root = storyRoot(ctx, assemble, config);
            if (!root)
                return '';
            const meta = loadMeta(root);
            if (meta?.exportPending) {
                return '这一回合是重誊成书。只输出完整 Markdown 书稿。不要【歧路】，不要构思，不要英文指令，不要复述护栏。';
            }
            const parts = [buildProseOnlyGuard()];
            if (meta?.narrativeGuard)
                parts.push(buildNarrativeGuard());
            if (meta?.progressionGuard)
                parts.push(buildProgressionGuard());
            if (assemble.agent && !hasAssistantProse(assemble.agent.session)) {
                parts.push('此界尚无正文。根据天书开篇种子直接开写，不要复述设定，不要先列提纲。写完后接【歧路】三择。');
            }
            return parts.join('\n\n');
        },
    });
    ctx.systemPrompt.context({
        name: 'infinite:world',
        order: 10,
        text: (assemble) => {
            const session = assemble.agent?.session;
            const root = storyRoot(ctx, assemble, config);
            if (!session || !root)
                return '';
            const meta = loadMeta(root);
            if (!meta || meta.exportPending)
                return '';
            const world = buildWorldContext(loadWorldbook(root), recentText(session), bookNameForTemplate(meta.templateId), { maxChars: config.maxWorldChars });
            return world.text;
        },
    });
    ctx.systemPrompt.context({
        name: 'infinite:characters',
        order: 11,
        text: (assemble) => {
            const session = assemble.agent?.session;
            const root = storyRoot(ctx, assemble, config);
            if (!session || !root)
                return '';
            const meta = loadMeta(root);
            if (!meta || meta.exportPending)
                return '';
            return buildCharacterContext(loadCharacters(root), recentText(session), meta.protagonist);
        },
    });
    ctx.systemPrompt.context({
        name: 'infinite:event',
        order: 12,
        text: (assemble) => {
            const root = storyRoot(ctx, assemble, config);
            if (!root)
                return '';
            const meta = loadMeta(root);
            if (meta?.exportPending || !meta?.randomEvent || !meta.pendingEventId)
                return '';
            const entry = loadWorldbook(root).find((e) => e.id === meta.pendingEventId);
            return entry ? formatRandomEvent(entry) : '';
        },
    });
    ctx.systemPrompt.context({
        name: 'infinite:archive',
        order: 13,
        text: (assemble) => {
            const root = storyRoot(ctx, assemble, config);
            if (!root)
                return '';
            if (loadMeta(root)?.exportPending)
                return '';
            const archive = loadArchive(root).trim();
            if (!archive)
                return '';
            return `【剧情档案】以下为压缩后的剧情要点，是续写一致性的依据（正文中不要复述档案条目）：\n${archive}`;
        },
    });
}
