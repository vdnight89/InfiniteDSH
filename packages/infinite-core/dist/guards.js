export function buildNarrativeGuard() {
    return `【叙事护栏·必须严格遵守】
1. 世界是活的：剧情必须有外部世界参与。视剧情需要引入或延续其他 NPC、势力与环境事件；严禁全篇只有男女主角两个人对话互动，严禁外部世界永远静止。
2. 角色管理：优先复用已出场角色；每段最多引入 1 个新角色；同时活跃的主要角色不超过 3-4 个；新角色入场时一次交代可记忆的身份或特征。
3. 主角为中心：用户扮演的主角是叙事中心与视角锚点。`;
}
export function buildProgressionGuard() {
    return `【剧情推进·必须严格遵守】
1. 每段回复必须推进至少一个剧情要素：新事件、新信息、冲突升级、关系变化、场景转移或情感转折。
2. 严禁原地打转：不重复已写过的场景与对话；不得用空泛收尾敷衍。
3. 结尾留钩：留下一处具体可继续的行动、选择或悬念。`;
}
export function buildProseOnlyGuard() {
    return `【输出要求】直接输出故事正文本身。不要输出章节名、场景信息、对话推荐等任何区块标签，不要添加格式说明或前后缀。不要在正文里写作者备忘、创作提示或括号标注，也不要输出 markdown 标题。`;
}
import { catalogEntry } from './topics.js';
export function bookNameForTemplate(templateId) {
    return catalogEntry(templateId)?.label || templateId;
}
