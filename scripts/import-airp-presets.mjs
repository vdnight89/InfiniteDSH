import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const AIRP = join(ROOT, '..', 'airp-desktop', 'src')
const OUT = join(ROOT, 'packages', 'dsh-infinite-preset', 'templates')

const BOOK_FOLDERS = {
  'wb-builtin-xianxia': { id: 'cultivation', label: '修仙', aliases: ['修仙', '仙侠', '玄幻', 'cultivation', 'xianxia'] },
  'wb-builtin-fantasy': { id: 'fantasy', label: '奇幻', aliases: ['奇幻', '异世', '魔法', '西幻', 'fantasy'] },
  'wb-builtin-urban': { id: 'urban', label: '都市异能', aliases: ['都市异能', '异能', 'urban'] },
  'wb-builtin-modern': { id: 'modern', label: '现代', aliases: ['现代', '现实', '都市', 'modern'] },
  'wb-builtin-infinite': { id: 'infinite', label: '无限流', aliases: ['无限', '副本', '轮回', 'infinite'] },
  'wb-builtin-scifi': { id: 'scifi', label: '科幻', aliases: ['科幻', '未来', '星际', 'scifi'] },
  'wb-builtin-apocalypse': { id: 'apocalypse', label: '末世', aliases: ['末世', '丧尸', 'apocalypse'] },
  'wb-builtin-entertainment': { id: 'entertainment', label: '娱乐圈', aliases: ['娱乐圈', '娱乐', 'entertainment'] },
  'wb-builtin-palace': { id: 'palace', label: '宫廷', aliases: ['宫廷', '朝堂', '古代', 'palace'] },
  'wb-builtin-romance': { id: 'romance', label: '言情', aliases: ['言情', '甜宠', 'romance'] },
  'wb-builtin-folklore': { id: 'folklore', label: '民俗', aliases: ['民俗', '志怪', '乡土', 'folklore'] },
  'wb-builtin-rulehorror': { id: 'rulehorror', label: '规则怪谈', aliases: ['规则怪谈', '怪谈', '规则', 'rulehorror'] },
  'wb-builtin-zhaidou': { id: 'zhaidou', label: '宅斗', aliases: ['宅斗', '府邸', 'zhaidou'] },
  'wb-builtin-retro': { id: 'retro', label: '年代', aliases: ['年代', '年代文', 'retro'] },
}

const BASE_TO_TEMPLATES = {
  cultivation: ['cultivation'],
  modern: ['modern', 'urban'],
  ancient: ['palace', 'zhaidou', 'romance', 'retro'],
  future: ['scifi'],
  otherworld: ['fantasy'],
  infinite: ['infinite', 'rulehorror'],
}

function slug(value) {
  const s = String(value)
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return s || 'entry'
}

function yamlList(items) {
  return `[${items.map((item) => String(item).replace(/[\[\],]/g, '')).join(', ')}]`
}

function writeMd(path, fields, body) {
  const lines = ['---']
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) lines.push(`${key}: ${yamlList(value)}`)
    else lines.push(`${key}: ${value}`)
  }
  lines.push('---', body.trim(), '')
  writeFileSync(path, lines.join('\n'), 'utf8')
}

function loadWorldBooks() {
  let src = readFileSync(join(AIRP, 'lib', 'preset_worldbooks.ts'), 'utf8')
  src = src.replace(/^import[\s\S]*?;\r?\n/, '')
  src = src.replace(/export interface PresetWorldBook[\s\S]*?\r?\n}\r?\n/, '')
  src = src.replace(/Omit<WorldBookEntry, "[^"]+">/g, 'Object')
  src = src.replace(/export const PRESET_WORLD_BOOKS:\s*PresetWorldBook\[\]/, 'const PRESET_WORLD_BOOKS')
  src = src.replace(/const (\w+):\s*PresetWorldBook/g, 'const $1')
  return new Function(`${src}\nreturn PRESET_WORLD_BOOKS;`)()
}

function loadTopics() {
  let src = readFileSync(join(AIRP, 'lib', 'topicSchemes.ts'), 'utf8')
  src = src.replace(/^import[\s\S]*?(?=\r?\nexport type|\r?\nexport interface|\r?\nexport const)/, '')
  src = src.replace(/export type [^\n]+\n/g, '')
  src = src.replace(/export interface [\s\S]*?\n}\r?\n/g, '')
  src = src.replace(/(?:export )?const TOPIC_SCHEMES:\s*TopicScheme\[\]/, 'const TOPIC_SCHEMES')
  src = src.replace(/ as (string|TopicAudience)\[]/g, '')
  src = src.replace(/ as Exclude<[^>]+>/g, '')
  const end = src.search(/\nexport function/)
  if (end > 0) src = src.slice(0, end)
  return new Function(`${src}\nreturn TOPIC_SCHEMES;`)()
}

function loadCharacters() {
  const src = readFileSync(join(AIRP, 'lib', 'db.ts'), 'utf8')
  const block = src.match(/export const DEFAULT_CHARACTER_PRESETS[\s\S]*?=\s*(\[[\s\S]*?\n\];)/)
  if (!block) throw new Error('DEFAULT_CHARACTER_PRESETS not found')
  return new Function(`return ${block[1]}`)()
}

function loadStyleCards() {
  const src = readFileSync(join(AIRP, 'lib', 'db.ts'), 'utf8')
  const block = src.match(/const builtins: Omit<PromptTemplate[\s\S]*?=\s*(\[[\s\S]*?\];)/)
  if (!block) throw new Error('style cards not found')
  return new Function(`return ${block[1]}`)()
}

function styleFields(style) {
  const title = String(style.title || style.name || '').trim()
  const body = String(
    style.content
    || [style.description, style.systemPrompt].filter(Boolean).join('。'),
  ).trim()
  const keys = Array.isArray(style.tags) && style.tags.length
    ? style.tags
    : (title ? [title] : [])
  if (!title || !body) return null
  return { id: String(style.id || title), title, body, keys }
}

/** Schemes whose openings belong to one book, even if worldBaseId is shared. */
const EXCLUSIVE_TOPICS = {
  末世: ['apocalypse'],
  无限流: ['infinite'],
  规则怪谈: ['rulehorror'],
  娱乐圈: ['entertainment'],
  民俗悬疑: ['folklore'],
  '宅斗 / 宫廷': ['palace', 'zhaidou'],
  年代生活: ['retro'],
}

function plotAllowedOn(templateId, plot) {
  const exclusive = EXCLUSIVE_TOPICS[plot.topic]
  if (exclusive) return exclusive.includes(templateId)
  return true
}

function writeStyleCards(dir, styles) {
  for (const style of styles) {
    const fields = styleFields(style)
    if (!fields) continue
    writeMd(join(dir, 'worldbook', `style-${fields.id}.md`), {
      id: `style-${fields.id}`,
      title: fields.title,
      category: '写法',
      constant: false,
      keys: fields.keys,
      order: 90,
    }, fields.body)
  }
}

const EXTRA_TEMPLATES = [
  {
    id: 'wuxia',
    label: '江湖',
    aliases: ['江湖', '武侠', 'wuxia'],
    description: '门派、客栈、英雄帖与江湖规矩。',
    protagonist: '谢无妄',
    world: [
      { id: 'jianghu', title: '江湖规矩', category: '根基', constant: true, keys: ['江湖', '规矩'], order: 10, content: '江湖不是朝堂。门派有门规，绿林有切口，客栈有耳目。刀可以出鞘，话不能白说。欠的人情比银子重，过河拆桥的人活不过三个集市。' },
      { id: 'sects', title: '门派与镖局', category: '势力', constant: true, keys: ['门派', '镖局'], order: 11, content: '名门看家学，镖局看招牌，绿林看山头。少林、武当之类只是传说里的坐标；眼前能要命的是隔壁客栈里那碗没动过的酒。' },
      { id: 'inn', title: '夜雨客栈', category: '地点', constant: false, keys: ['客栈', '英雄帖'], order: 20, content: '夜雨里一封英雄帖被钉在门板上，落款是个死人的名字。掌柜的说：接帖的人今晚必须住店，不住店的人出不了镇。' },
    ],
    plots: [
      { id: 'post', title: '英雄帖', focus: '门板上那封帖点了主角的名，落款人三个月前已经埋了。', tags: ['英雄帖', '客栈'] },
      { id: 'escort', title: '镖路遇雨', focus: '押镖至半路暴雨封山，前面的桥断了，后面的蹄声没有停。', tags: ['镖局', '追杀'] },
    ],
  },
  {
    id: 'campus',
    label: '校园',
    aliases: ['校园', '大学', 'campus'],
    description: '学期、社团、竞赛与错过的人。',
    protagonist: '林晏',
    world: [
      { id: 'term', title: '学期节奏', category: '根基', constant: true, keys: ['学期', '校园'], order: 10, content: '九月到六月。社团招新、期中、竞赛、实习。没有超能力，只有截止日期和没说出口的话。' },
      { id: 'club', title: '旧社团名册', category: '地点', constant: false, keys: ['社团', '名册'], order: 20, content: '文学社活动室抽屉里有一本三年前的名册，最后一页被人撕过。撕页的人现在是学生会主席。' },
    ],
    plots: [
      { id: 'enroll', title: '开学典礼', focus: '开学典礼那天，上一届消失的学长出现在观众席最后一排。', tags: ['开学', '旧人'] },
      { id: 'contest', title: '辩论赛名单', focus: '决赛前夜，对手队的证据包被塞进主角书包，监控刚好坏了。', tags: ['竞赛', '栽赃'] },
    ],
  },
  {
    id: 'detective',
    label: '刑侦',
    aliases: ['刑侦', '破案', '侦探', 'detective'],
    description: '现场、口供、程序与不在场证明。',
    protagonist: '周慎',
    world: [
      { id: 'procedure', title: '办案程序', category: '根基', constant: true, keys: ['刑侦', '程序', '现场'], order: 10, content: '先封现场，再问第一证人。笔录要两人在场。证据链断了就不能上庭。主角可以直觉准，但不能违法取证。' },
      { id: 'firstbody', title: '河堤第一具', category: '事件', constant: false, keys: ['尸体', '河堤'], order: 20, content: '河堤发现第一具尸体时，口袋里有一张今晚的电影票，座位号是主角工位对面那个人的。' },
    ],
    plots: [
      { id: 'ticket', title: '电影票', focus: '死者口袋里的电影票座位，正对主角今晚要约见的线人。', tags: ['线索', '线人'] },
      { id: 'alibi', title: '不在场证明', focus: '所有嫌疑人的不在场证明都能对上，只有监控缺了七分钟。', tags: ['监控', '缺口'] },
    ],
  },
  {
    id: 'cyber',
    label: '赛博',
    aliases: ['赛博', '赛博朋克', '义体', 'cyber'],
    description: '义体、公司、记忆备份与下层街区。',
    protagonist: '顾晚棠',
    world: [
      { id: 'corp', title: '公司与义体', category: '根基', constant: true, keys: ['公司', '义体', '赛博'], order: 10, content: '记忆可以备份，备份可以被公司赎回。下层街区靠黑诊所续命，上层用合规义体续命。没有魔法，只有权限和债务。' },
      { id: 'clinic', title: '黑诊所', category: '地点', constant: false, keys: ['诊所', '备份'], order: 20, content: '巷口黑诊所的冷柜里多了一份没有主的记忆备份，标签写着主角的工号。' },
    ],
    plots: [
      { id: 'wipe', title: '格式化清晨', focus: '醒来发现昨晚的记忆被格式化，工牌还在，任务单上的名字是自己。', tags: ['记忆', '任务'] },
      { id: 'debt', title: '义体赎回', focus: '公司发来赎回函：左臂义体逾期，二十四小时后远程锁死。', tags: ['债务', '义体'] },
    ],
  },
  {
    id: 'whale',
    label: '深海实验室',
    aliases: ['深海', '鲸鱼娘', '梁圣', '梁组', '牢梁', '梁子', 'whale', 'deepseek'],
    description: '同人向：深海实验室、鲸鱼娘与梁组。开源、组会、算力潮汐和社区黑话。非正式官方设定。',
    protagonist: '阿澜',
    skipImportedCast: true,
    world: [
      { id: 'lab', title: '深海实验室', category: '根基', constant: true, keys: ['实验室', '深海', '组'], order: 10, content: '杭州雨季里的一栋不高的楼。门禁认脸，茶水间认胃。对外叫实验室，对内叫深海。没有魔法和系统面板，只有集群、组会、开源协议和凌晨三点的泡面。这里的故事是同人戏仿，不是任何公司的官方史。' },
      { id: 'creed', title: '开源信条', category: '根基', constant: true, keys: ['开源', '协议', '权重'], order: 11, content: '能公开的尽量公开。权重、论文、复现说明，像把灯沉进海里给后来的船。有人笑这是作，梁组只说：闭源是围墙，围墙里面会忘记自己为什么下水。' },
      { id: 'tide', title: '算力潮汐', category: '根基', constant: true, keys: ['算力', '卡', '集群', 'GPU'], order: 12, content: '卡是潮水。涨潮时全组欢呼，退潮时有人去茶水间站十分钟。抢卡不骂人，只发日程表。谁把训练任务写进别人窗口，谁请一周奶茶。' },
      { id: 'whale-totem', title: '鲸鱼图腾', category: '世界观', constant: true, keys: ['鲸鱼', '鲸', '吉祥物'], order: 13, content: '深海的图腾是一头小鲸。贴纸贴满显示器下沿，钥匙扣撞在工牌上响。有人说她是吉祥物，有人说她是实验室的梦。认真的人两个都信。' },
      { id: 'slang', title: '组里黑话', category: '规则', constant: true, keys: ['梁圣', '牢梁', '梁子', '梁组'], order: 14, content: '同一个人，门口表单写「梁组」。论文致谢里有人偷偷写成「梁圣」。群里求卡叫「牢梁」。熟了以后直接「梁子」。他本人很少纠正，只在组会上把话题扳回损失曲线。' },
      { id: 'hangzhou', title: '杭州雨', category: '地点', constant: false, keys: ['杭州', '雨', '西湖'], order: 20, content: '雨一停，楼道里全是湿鞋印。西湖在地图上很近，组员很少真的去。去了也是梁组说「今天损失稳了，出去走走」，然后全组在断桥上讨论下一张卡什么时候到。' },
      { id: 'room', title: '机房深井', category: '地点', constant: false, keys: ['机房', '深井', '风扇'], order: 21, content: '机房叫深井。门一开，热风和风扇声把人吞进去。墙上贴着「禁止自拍闪灯」。有人曾在深井里听见鲸歌，值班员说那是共振，鲸鱼娘说那是她在哼歌。' },
      { id: 'canteen', title: '通宵食堂', category: '地点', constant: false, keys: ['食堂', '宵夜', '泡面'], order: 22, content: '食堂半夜只留一盏灯。菜单手写：拌面、茶叶蛋、防过拟合汤。梁组请客时，汤会莫名其妙多一勺。没人追究厨师是不是鲸鱼娘。' },
      { id: 'meeting', title: '组会规矩', category: '规则', constant: false, keys: ['组会', '周会', '汇报'], order: 23, content: '组会不罚站，只罚把失败讲清楚。可以说「我还没跑完」，不可以说「感觉挺好」。梁组提问很短，记笔记的人往往是鲸鱼娘。她的本子进水也不晕墨，没人敢问为什么。' },
      { id: 'eval', title: '评测夜', category: '规则', constant: false, keys: ['评测', '榜', 'benchmark'], order: 24, content: '榜不是神。刷榜可以，改题不行。评测夜灯火通明，群里只准发数字和复现步骤。谁先截图欢呼，谁负责第二天写失败复盘。' },
      { id: 'license', title: '许可证柜', category: '设定', constant: false, keys: ['许可', '协议', 'license'], order: 25, content: '许可证柜在茶水间对面。打开要两把钥匙：一把在梁组抽屉，一把挂在鲸鱼娘的项圈饰扣上。她说这是为了防止有人半夜把开源改成「再等等」。' },
      { id: 'old-sea', title: '幻海旧账', category: '设定', constant: false, keys: ['幻海', '量化', '旧账'], order: 26, content: '实验室以前靠潮汐吃饭，现在靠深潜。旧同事偶尔来串门，西装比论文整齐。他们叫梁组「还在玩」，梁组回「你们也在赌」。鲸鱼娘负责把气氛圆成一句「喝茶」。' },
      { id: 'community', title: '岸上社区', category: '设定', constant: false, keys: ['社区', '帖子', '同人'], order: 27, content: '岸上的人给实验室起外号，画鲸鱼，写「梁圣保佑训损失」。实验室不承认神坛，也不删玩笑。梁组看一眼，说「别误人子弟」，然后继续改README。' },
      { id: 'intern-rule', title: '实习生守则', category: '规则', constant: false, keys: ['实习', '新人', '工牌'], order: 28, content: '第一周不准碰正式训练。第二周可以看日志。第三周若还能分清「过拟合」和「饿了」，就可以跟鲸鱼娘去深井送宵夜。工牌掉了找前台，灵魂掉了找梁组。' },
    ],
    plots: [
      { id: 'first-night', title: '入职第一夜', focus: '阿澜的工牌还是热的，机房深井突然告警。梁组只丢下一句「带上鲸鱼娘」，头也不回进了电梯。', tags: ['入职', '告警'] },
      { id: 'release', title: '开源发布夜', focus: '权重上传到最后百分之三，外网已经在倒计时。许可证柜的第二把钥匙不见了，鲸鱼娘的项圈空着。', tags: ['开源', '钥匙'] },
      { id: 'gpu', title: '卡被征用', focus: '集群日程被一笔「紧急评测」覆盖。阿澜的实验只差两个小时。梁组站在白板前，让全组投票：保榜，还是保一次有意思的失败。', tags: ['算力', '选择'] },
      { id: 'meeting-cold', title: '组会点名', focus: '周会点到阿澜时，曲线是平的。梁组没有生气，只问：「你敢不敢当着全组把失败讲完？」鲸鱼娘把热茶推到他手边。', tags: ['组会', '失败'] },
      { id: 'rain', title: '论文被拒的雨', focus: '拒信来的那天杭州暴雨。梁组把拒信投影到墙上，一行行读审稿意见，像读一份还没写完的开源说明。', tags: ['论文', '雨'] },
      { id: 'circle', title: '牢梁的朋友圈', focus: '梁组罕见地发了一张深井过道的照片，配字只有一个句号。评论区有人喊梁圣，有人喊梁子，有人问卡什么时候到。', tags: ['朋友圈', '牢梁'] },
      { id: 'poem', title: '模型突然会写诗', focus: '凌晨的采样窗口里，模型连续吐出三首关于潮汐的诗，然后拒绝继续做题。评测君要回滚，鲸鱼娘说先听完第四首。', tags: ['采样', '诗'] },
      { id: 'bill', title: '算力账单', focus: '财务把账单拍在桌上。数字像海啸。梁组问全组：砍哪条船，才能让其余的船继续往深海开。', tags: ['账单', '取舍'] },
      { id: 'visitor', title: '幻海旧人', focus: '旧同事西装革履来访，提出「把开源收回去，换一条更稳的船」。茶水间里，鲸鱼娘把两杯水都续满，谁也不看。', tags: ['旧人', '开源'] },
      { id: 'lost-whale', title: '鲸鱼娘迷路', focus: '鲸鱼娘消失了三个小时。门禁记录停在负一层。阿澜在深井最里面听见水声，墙上的「禁止自拍」贴纸被掀起一角。', tags: ['鲸鱼娘', '迷路'] },
      { id: 'supper', title: '梁组请宵夜', focus: '损失第一次稳住的夜晚，梁组说「走，吃饭」。食堂灯忽然全亮。没人知道他什么时候订的位置，鲸鱼娘已经坐在角落数筷子。', tags: ['宵夜', '梁组'] },
      { id: 'license-fight', title: '许可证之争', focus: '有人想把发布改成「研究专用」。钥匙在梁组抽屉里转了一圈，又被放回去。他说：深海不养只给自己看的灯。', tags: ['许可', '争论'] },
      { id: 'eval-fail', title: '评测翻车', focus: '榜上的数字一夜之间掉下去。群里安静到能听见风扇。梁组只发：复现，对齐，再发。不要先解释。', tags: ['评测', '翻车'] },
      { id: 'intern-badge', title: '工牌进水', focus: '阿澜的工牌掉进洗手池。门禁不认人。前台说「找梁组加白名单」，梁组说「找鲸鱼娘，她记得所有新来的脸」。', tags: ['工牌', '门禁'] },
      { id: 'whale-song', title: '深井鲸歌', focus: '值班夜，深井里传来很轻的哼唱。日志没有异常。集群娘说不是共振。梁组戴上耳罩：让她唱完，别截断任务。', tags: ['鲸歌', '值班'] },
      { id: 'name-storm', title: '外号风暴', focus: '社区把「梁圣」「牢梁」「梁子」刷上热帖。公关想发澄清。梁组看了三秒：他们爱叫就叫。别耽误发模型。', tags: ['外号', '社区'] },
      { id: 'align', title: '对齐长夜', focus: '安全对齐的标注从黄昏做到天亮。鲸鱼娘负责把互相打架的原则写成能执行的句子。梁组只问：这句话会不会害到岸上的人。', tags: ['对齐', '安全'] },
      { id: 'repro', title: '复现失败', focus: '外网说复现不了。阿澜对着配置文件看到天亮，发现少的不是超参，是梁组随口说、谁也没写进文档的那一行。', tags: ['复现', '文档'] },
    ],
    characters: [
      {
        id: 'char-alan',
        title: '阿澜',
        keys: ['阿澜', '主角', '实习'],
        constant: true,
        order: 0,
        content: '外貌：二十出头，卫衣袖口磨白，工牌总斜着别。黑眼圈是诚实的。\n性情：问得多，吹得少。会把失败写进日志，也会在茶水间把泡面汤喝完。\n来历：新来的对齐与文档实习生。不会写诗，但能把梁组的短句翻译成README。用户扮演时以他为锚点。',
      },
      {
        id: 'char-whale-girl',
        title: '鲸鱼娘',
        keys: ['鲸鱼娘', '小鲸', '吉祥物'],
        constant: true,
        order: 1,
        content: '外貌：人类身形，头发深青近黑，耳侧有一小片像潮汐的淡痕。卫衣帽子上缝着圆滚滚的鲸尾。走路没声，靠近机房时衣服会带一点凉。\n性情：温和，记性好，爱给人续热水。认真起来会纠正许可证和致谢名单。不喜欢闪光灯，不喜欢有人把开源说成「做慈善」。\n来历：实验室的梦与吉祥物。有人说她是梁组某次通宵之后画在白板上的涂鸦走下来的。她自己只说：我负责记得所有还没写进文档的事。',
      },
      {
        id: 'char-liang',
        title: '梁组',
        keys: ['梁组', '梁圣', '牢梁', '梁子'],
        constant: true,
        order: 2,
        content: '外貌：瘦，衬衫皱，眼镜反光时常看不清眼神。工牌照片比本人年轻，像是上一次认真拍照已经是很久以前。\n性情：话短，问得准，不爱站神坛。被叫梁圣时会皱眉，被叫牢梁时会当没听见，被叫梁子时才会偶尔应一声。护短，尤其护组里把失败讲清楚的人。\n来历：深海实验室的负责人。从前在幻海算潮汐，后来把船开进更深的水。不接受膜拜，接受复现。对社区玩笑的态度是：笑可以，别把玩笑写成说明书。',
      },
      {
        id: 'char-zhou',
        title: '小周',
        keys: ['小周', '值班'],
        constant: false,
        order: 20,
        content: '外貌：运动裤，钥匙串撞得响，永远拿着平板看告警。\n性情：嘴上抱怨「又是我值班」，手上比谁都快。怕鲸鱼娘在深井里走丢，更怕梁组问「日志呢」。\n来历：集群值班老人。工位抽屉里有三副耳塞和一包过期巧克力。',
      },
      {
        id: 'char-cluster',
        title: '集群娘',
        keys: ['集群娘', '调度'],
        constant: false,
        order: 21,
        content: '外貌：人看见的是调度面板上的一只简笔画小方块。认真想象时，她是短发、工装背心、口袋里全是网线的女孩。\n性情：公平到近乎冷酷。谁先预约谁先跑。求情无效，请客无效，只有梁组的「紧急」能插队，她会记一笔仇，下周讨回来。\n来历：深井的声音。风扇是她的呼吸。',
      },
      {
        id: 'char-eval',
        title: '评测君',
        keys: ['评测君', '榜'],
        constant: false,
        order: 22,
        content: '外貌：格子衫，屏幕亮度拉到伤眼，桌上三台笔记本叠成塔。\n性情：信数字，不信气氛。谁说「感觉这次稳了」，他就打开对照表。翻车时第一句是「先对齐版本」。\n来历：评测组唯一愿意在发布夜留守的人。抽屉里全是不同颜色的优盘，贴着「能发」和「不能发」。',
      },
      {
        id: 'char-cat',
        title: '猫组',
        keys: ['猫组', '对家', '来客'],
        constant: false,
        order: 23,
        content: '外貌：外套很贵，笑很浅，名片印着另一家实验室的浪花。\n性情：礼貌，锋利，爱用问句。会夸开源，也会问「你们准备亏到什么时候」。\n来历：对岸实验室的客人。与梁组认识很久，像两艘在雾里打过灯的船。鲸鱼娘见他会多摆一双筷子，但茶会淡一点。',
      },
      {
        id: 'char-traveler',
        title: '岸上旅人',
        keys: ['旅人', '社区', '同人'],
        constant: false,
        order: 24,
        content: '外貌：背包，耳机，手机壳是鲸鱼贴纸。不一定进得了门禁。\n性情：热情，话多，会把实验室的人写成段子。恶意少，误会多。\n来历：岸上社区的观察者。有时是来投稿的画家，有时是来提 issue 的学生。梁组让阿澜负责把他们送出楼，又让鲸鱼娘把贴纸给够。',
      },
    ],
  },
]

function charToContent(c) {
  return [`外貌：${c.appearance}`, `性情：${c.personality}`, `来历：${c.background}`].join('\n')
}

function charTemplates(c) {
  const tags = c.tags || []
  const set = new Set()
  if (tags.includes('仙侠')) set.add('cultivation')
  if (tags.includes('都市') || tags.includes('重生')) ['modern', 'urban'].forEach((id) => set.add(id))
  if (tags.includes('古言') || tags.includes('嫡女') || tags.includes('权谋')) ['palace', 'zhaidou', 'romance', 'retro'].forEach((id) => set.add(id))
  if (tags.includes('现言')) ['modern', 'urban', 'romance'].forEach((id) => set.add(id))
  if (tags.includes('灵异')) ['folklore', 'rulehorror'].forEach((id) => set.add(id))
  if (tags.includes('星际') || tags.includes('机甲')) set.add('scifi')
  if (tags.includes('抓鬼')) ['folklore', 'rulehorror'].forEach((id) => set.add(id))
  if (tags.includes('反派')) ['palace', 'zhaidou', 'cultivation'].forEach((id) => set.add(id))
  if (set.size === 0) Object.values(BOOK_FOLDERS).forEach((b) => set.add(b.id))
  set.add('wuxia')
  if (tags.includes('星际')) set.add('cyber')
  if (tags.includes('现言') || tags.includes('都市')) set.add('campus')
  return [...set]
}

function defaultProtagonistFor(templateId, characters) {
  const preferred = {
    cultivation: '谢无妄',
    apocalypse: '周慎',
    urban: '陆沉舟',
    modern: '陆沉舟',
    palace: '沈昭宁',
    zhaidou: '沈昭宁',
    romance: '裴晏清',
    folklore: '白蘅',
    rulehorror: '白蘅',
    scifi: '顾晚棠',
    cyber: '顾晚棠',
    entertainment: '裴晏清',
    retro: '沈昭宁',
    fantasy: '谢无妄',
    infinite: '陆沉舟',
    wuxia: '谢无妄',
    campus: '林晏',
    detective: '周慎',
    whale: '阿澜',
  }
  if (preferred[templateId]) return preferred[templateId]
  return characters[0]?.name || '陈行舟'
}

const books = loadWorldBooks()
const topics = loadTopics()
const characters = loadCharacters()
const styles = loadStyleCards()

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const catalog = []
const plotsByTemplate = new Map()

function addPlot(templateId, plot) {
  if (!plotsByTemplate.has(templateId)) plotsByTemplate.set(templateId, [])
  plotsByTemplate.get(templateId).push(plot)
}

for (const scheme of topics) {
  const fallback = BASE_TO_TEMPLATES[scheme.worldBaseId] || ['modern']
  for (const seed of scheme.openingSeeds || []) {
    const targets = new Set()
    const exclusive = EXCLUSIVE_TOPICS[scheme.label]
    if (exclusive) {
      exclusive.forEach((id) => targets.add(id))
    } else {
      const bases = seed.bases?.length ? seed.bases : [scheme.worldBaseId]
      for (const base of bases) {
        for (const id of BASE_TO_TEMPLATES[base] || []) targets.add(id)
      }
      if (scheme.id.includes('apocalypse')) targets.add('apocalypse')
      if (scheme.id.includes('folklore')) targets.add('folklore')
      if (scheme.id.includes('rules')) targets.add('rulehorror')
      if (scheme.id.includes('entertainment')) targets.add('entertainment')
      if (scheme.id.includes('palace')) targets.add('palace')
      if (scheme.id.includes('infinite')) targets.add('infinite')
      if (targets.size === 0) fallback.forEach((id) => targets.add(id))
    }
    for (const id of targets) {
      addPlot(id, {
        id: `${scheme.id}-${seed.id}`,
        title: seed.name,
        focus: seed.focus,
        tags: seed.tags || [],
        topic: scheme.label,
      })
    }
  }
}

for (const extra of EXTRA_TEMPLATES) {
  for (const plot of extra.plots) {
    addPlot(extra.id, { ...plot, topic: extra.label })
  }
}

for (const book of books) {
  const meta = BOOK_FOLDERS[book.id]
  if (!meta) throw new Error(`unmapped book ${book.id}`)
  const dir = join(OUT, meta.id)
  mkdirSync(join(dir, 'worldbook'), { recursive: true })
  mkdirSync(join(dir, 'characters'), { recursive: true })
  mkdirSync(join(dir, 'plots'), { recursive: true })

  const used = new Set()
  for (const [index, entry] of book.entries.entries()) {
    let id = slug(entry.title)
    if (used.has(id)) id = `${id}-${index}`
    used.add(id)
    writeMd(join(dir, 'worldbook', `${id}.md`), {
      id,
      title: entry.title,
      category: entry.category || '设定',
      constant: Boolean(entry.constant),
      keys: entry.key || [],
      order: entry.order ?? 10,
    }, entry.content)
  }

  writeStyleCards(dir, styles)

  if (meta.id === 'cultivation') {
    writeMd(join(dir, 'worldbook', '藏经阁.md'), {
      id: 'library',
      title: '藏经阁',
      category: '地点',
      constant: false,
      keys: ['藏经阁', '经阁'],
      order: 30,
    }, '藏经阁分三层。一层外门可入，只放基础吐纳与杂役口诀。二层需内门推荐。三层由金丹执事守钥，夜半阁顶常有灯。')
  }

  const plots = (plotsByTemplate.get(meta.id) || []).filter((plot) => plotAllowedOn(meta.id, plot))
  for (const plot of plots) {
    writeMd(join(dir, 'plots', `${slug(plot.id)}.md`), {
      id: plot.id,
      title: plot.title,
      category: '剧情',
      constant: false,
      keys: [...new Set([plot.title, ...(plot.tags || [])])],
      order: 5,
    }, `【开局·${plot.topic || meta.label}】${plot.focus}`)
  }
  if (plots[0]) {
    writeMd(join(dir, 'worldbook', 'opening.md'), {
      id: 'opening',
      title: '开篇种子',
      category: '开篇',
      constant: true,
      keys: ['开篇'],
      order: 1,
    }, `默认开局「${plots[0].title}」。${plots[0].focus}`)
  }

  const hero = defaultProtagonistFor(meta.id, characters)
  for (const character of characters) {
    if (!charTemplates(character).includes(meta.id) && character.name !== hero) continue
    writeMd(join(dir, 'characters', `${slug(character.id)}.md`), {
      id: character.id,
      title: character.name,
      category: '角色',
      constant: character.name === hero,
      keys: [character.name, ...(character.tags || [])],
      order: character.name === hero ? 0 : 20,
    }, charToContent(character))
  }

  writeFileSync(join(dir, 'meta.yml'), [
    'version: 1',
    `templateId: ${meta.id}`,
    `protagonist: ${hero}`,
    'narrativeGuard: true',
    'progressionGuard: true',
    'randomEvent: true',
    'pickedEventIds: []',
    'pendingEventId: null',
    'createdAt: 2026-08-16T00:00:00.000Z',
    '',
  ].join('\n'), 'utf8')

  catalog.push({
    id: meta.id,
    label: meta.label,
    description: book.description,
    aliases: meta.aliases,
    defaultProtagonist: hero,
  })
}

for (const extra of EXTRA_TEMPLATES) {
  const dir = join(OUT, extra.id)
  mkdirSync(join(dir, 'worldbook'), { recursive: true })
  mkdirSync(join(dir, 'characters'), { recursive: true })
  mkdirSync(join(dir, 'plots'), { recursive: true })
  for (const entry of extra.world) {
    writeMd(join(dir, 'worldbook', `${entry.id}.md`), {
      id: entry.id,
      title: entry.title,
      category: entry.category,
      constant: entry.constant,
      keys: entry.keys,
      order: entry.order,
    }, entry.content)
  }
  writeStyleCards(dir, styles)
  const plots = plotsByTemplate.get(extra.id) || extra.plots
  for (const plot of plots) {
    writeMd(join(dir, 'plots', `${slug(plot.id)}.md`), {
      id: plot.id,
      title: plot.title,
      category: '剧情',
      constant: false,
      keys: [...new Set([plot.title, ...(plot.tags || [])])],
      order: 5,
    }, `【开局·${extra.label}】${plot.focus}`)
  }
  if (plots[0]) {
    writeMd(join(dir, 'worldbook', 'opening.md'), {
      id: 'opening',
      title: '开篇种子',
      category: '开篇',
      constant: true,
      keys: ['开篇'],
      order: 1,
    }, `默认开局「${plots[0].title}」。${plots[0].focus}`)
  }
  const hero = extra.protagonist
  if (Array.isArray(extra.characters)) {
    for (const character of extra.characters) {
      writeMd(join(dir, 'characters', `${slug(character.id)}.md`), {
        id: character.id,
        title: character.title,
        category: '角色',
        constant: Boolean(character.constant),
        keys: character.keys,
        order: character.order ?? 20,
      }, character.content)
    }
  } else {
    for (const character of characters) {
      if (!charTemplates(character).includes(extra.id) && character.name !== hero) continue
      writeMd(join(dir, 'characters', `${slug(character.id)}.md`), {
        id: character.id,
        title: character.name,
        category: '角色',
        constant: character.name === hero,
        keys: [character.name, ...(character.tags || [])],
        order: character.name === hero ? 0 : 20,
      }, charToContent(character))
    }
  }
  writeFileSync(join(dir, 'meta.yml'), [
    'version: 1',
    `templateId: ${extra.id}`,
    `protagonist: ${hero}`,
    'narrativeGuard: true',
    'progressionGuard: true',
    'randomEvent: true',
    'pickedEventIds: []',
    'pendingEventId: null',
    'createdAt: 2026-08-16T00:00:00.000Z',
    '',
  ].join('\n'), 'utf8')
  catalog.push({
    id: extra.id,
    label: extra.label,
    description: extra.description,
    aliases: extra.aliases,
    defaultProtagonist: hero,
  })
}

const catalogSrc = `export interface TemplateInfo {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly aliases: readonly string[]
  readonly defaultProtagonist: string
}

export const TEMPLATE_CATALOG: readonly TemplateInfo[] = ${JSON.stringify(catalog, null, 2)}
`

writeFileSync(join(ROOT, 'packages', 'infinite-core', 'src', 'catalog.generated.ts'), catalogSrc, 'utf8')
console.log(`wrote ${catalog.length} templates`)
for (const item of catalog) {
  console.log(`- ${item.id} ${item.label}`)
}
