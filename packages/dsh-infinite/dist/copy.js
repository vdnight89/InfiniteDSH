export const WORLD_NAME = '诸天万界';
export const PRESET_NAME = '诸天万界';
export const PRESET_DESCRIPTION = '穿越诸天，一书一界。不执刀斧，只写正文。';
export const ASK_HEADER = '诸天万界';
export const TOPIC_QUESTION = '踏入哪一界？';
export const TOPIC_DETAIL = '点选一界，天书将落入本会话。亦可写下 /new 修仙 直入。';
export const PROTAGONIST_QUESTION = '谁为天命之人？';
export const OPENING_QUESTION = '从此界何处落足？';
export const OVERWRITE_QUESTION = '此会话已有一界，要撕开重入吗？';
export const OVERWRITE_YES = '撕开重入';
export const OVERWRITE_NO = '留在此界';
export const EMBARK = '启程';
export const REPICK_OPENING = '另择开局';
export const REPICK_PROTAGONIST = '更换天命之人';
export const BIND_QUESTION = '改投他界？';
export const CANCELLED = '未改界，仍立于此。';
export function defaultBodyHint(name) {
    return `点选「以此界默认之身」即 ${name}。要自己起名，写在下方「输入你的答案」。`;
}
export function embarkDetail(world, protagonist) {
    return `此界：${world}。天命之人：${protagonist}。点「启程」才写下第一段。`;
}
export function openedWaiting(world, protagonist) {
    return `界门已开《${world}》。天命之人：${protagonist}。点「启程」踏入，或另择开局、更换天命之人。`;
}
export function openedEmbarked(world, protagonist) {
    return `已踏入《${world}》。天命之人：${protagonist}。第一段正在落笔。`;
}
export function needForceText() {
    return '此会话已有一界；要撕开重入，请在命令后加上 force。';
}
export function unknownWorld(known) {
    return `未知之界。可试：${known}`;
}
export function pickWorldHint() {
    return '先选定一界：只输入 /new 弹出界图，或 /new 修仙、/new 末世 直入。';
}
export function boundTo(world) {
    return `已改投《${world}》。`;
}
export function noWorldYet() {
    return '此会话尚无世界。先 /new 进入新世界。';
}
export function castNeedName() {
    return '用法：/cast 名字，或只输入 /cast 从名单里选。';
}
export function castDone(name, count) {
    return `天命之人现为 ${name}（${count} 张角色卡）。`;
}
export function exportDone(chars, title, path, revealed) {
    const open = revealed ? '已打开所在文件夹。' : '右侧文件树即可打开。';
    return `已誊出 ${chars} 字书稿《${title}》：${path}。${open}`;
}
export function exportPolishing(title) {
    return `正在从头润色《${title}》。写完会落入当前工作区，不必再手拷。`;
}
export function exportNoProse() {
    return '此界尚无可誊的小说正文。模型若只写了构思，请先写出故事再誊。';
}
export function sessionTitle(world, protagonist) {
    return `${world}·${protagonist}`;
}
export const FIRST_STEP_TEXT = '启程。';
export const FORK_QUESTION = '走哪一条歧路？';
export const FORK_DETAIL = '点上面三条之一。要自己走，写在下方「输入你的答案」。';
export const TITLE_QUESTION = '此稿如何题名？';
export const TITLE_DETAIL = '点一个拟题，或在下方自己写。';
export function isEmbarkChoice(picked) {
    const t = picked.trim();
    return t === EMBARK || t === FIRST_STEP_TEXT || t.startsWith(EMBARK);
}
export const COMMANDS_COPY = {
    new: {
        description: '进入新世界：弹出界图选题材与天命之人',
        hint: '修仙 | 末世 | 都市异能 | 现代  [名字]  [force]',
    },
    bind: {
        description: '改投他界（会覆盖本会话天书）',
        hint: '[界名] [force]',
    },
    cast: {
        description: '更换天命之人',
        hint: '[名字]',
    },
    'export-story': {
        description: '把已写出的正文誊成精排 Markdown 书稿',
        hint: '[player]',
    },
};
