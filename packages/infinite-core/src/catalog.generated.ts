export interface TemplateInfo {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly aliases: readonly string[]
  readonly defaultProtagonist: string
}

export const TEMPLATE_CATALOG: readonly TemplateInfo[] = [
  {
    "id": "cultivation",
    "label": "修仙",
    "description": "以中国传统道教文化为基础的修仙体系，包含炼气、筑基、金丹、元婴等境界体系",
    "aliases": [
      "修仙",
      "仙侠",
      "玄幻",
      "cultivation",
      "xianxia"
    ],
    "defaultProtagonist": "谢无妄"
  },
  {
    "id": "fantasy",
    "label": "奇幻",
    "description": "万族林立、古族传承与秘境遗迹交织的东方玄幻世界",
    "aliases": [
      "奇幻",
      "异世",
      "魔法",
      "西幻",
      "fantasy"
    ],
    "defaultProtagonist": "谢无妄"
  },
  {
    "id": "urban",
    "label": "都市异能",
    "description": "现代城市表层之下，异能觉醒、隐秘组织与暗线势力并存",
    "aliases": [
      "都市异能",
      "异能",
      "urban"
    ],
    "defaultProtagonist": "陆沉舟"
  },
  {
    "id": "modern",
    "label": "现代",
    "description": "以现实现代城市为蓝本的通用世界：通勤、职场、家庭、社交与城市的日常生活运转。不含异能、修仙、超自然等特殊设定",
    "aliases": [
      "现代",
      "现实",
      "都市",
      "modern"
    ],
    "defaultProtagonist": "陆沉舟"
  },
  {
    "id": "infinite",
    "label": "无限流",
    "description": "穿梭于各个影视、小说、游戏世界完成任务的无限流设定",
    "aliases": [
      "无限",
      "副本",
      "轮回",
      "infinite"
    ],
    "defaultProtagonist": "陆沉舟"
  },
  {
    "id": "scifi",
    "label": "科幻",
    "description": "人类迈向深空后的星舰、殖民地、边疆和技术秩序",
    "aliases": [
      "科幻",
      "未来",
      "星际",
      "scifi"
    ],
    "defaultProtagonist": "顾晚棠"
  },
  {
    "id": "apocalypse",
    "label": "末世",
    "description": "丧尸横行或核战废土的末日世界观，人类在废墟中求生",
    "aliases": [
      "末世",
      "丧尸",
      "apocalypse"
    ],
    "defaultProtagonist": "周慎"
  },
  {
    "id": "entertainment",
    "label": "娱乐圈",
    "description": "现代都市背景下的明星、艺人、偶像、演员的娱乐圈生态",
    "aliases": [
      "娱乐圈",
      "娱乐",
      "entertainment"
    ],
    "defaultProtagonist": "裴晏清"
  },
  {
    "id": "palace",
    "label": "宫廷",
    "description": "中国古代王朝宫廷背景，皇权、后宫、权谋的交织",
    "aliases": [
      "宫廷",
      "朝堂",
      "古代",
      "palace"
    ],
    "defaultProtagonist": "沈昭宁"
  },
  {
    "id": "romance",
    "label": "言情",
    "description": "现代都市背景下的浪漫恋爱模拟设定，甜宠、傲娇、霸道总裁等经典设定",
    "aliases": [
      "言情",
      "甜宠",
      "romance"
    ],
    "defaultProtagonist": "裴晏清"
  },
  {
    "id": "folklore",
    "label": "民俗",
    "description": "江河湖海、山村水乡之间，隐藏着古老的行业与禁忌：捞尸人、阴阳先生、赶尸人……敬畏传统，小心诡事",
    "aliases": [
      "民俗",
      "志怪",
      "乡土",
      "folklore"
    ],
    "defaultProtagonist": "白蘅"
  },
  {
    "id": "rulehorror",
    "label": "规则怪谈",
    "description": "隐秘降临的世界——每一处空间都有规则，每一条规则背后都是生存的代价。违反规则，就会被「它」带走",
    "aliases": [
      "规则怪谈",
      "怪谈",
      "规则",
      "rulehorror"
    ],
    "defaultProtagonist": "白蘅"
  },
  {
    "id": "zhaidou",
    "label": "宅斗",
    "description": "古代世家大族的内宅深院：嫡庶有别，妻妾相争，一草一木皆是博弈。步步为营，方能安身立命",
    "aliases": [
      "宅斗",
      "府邸",
      "zhaidou"
    ],
    "defaultProtagonist": "沈昭宁"
  },
  {
    "id": "retro",
    "label": "年代",
    "description": "重回七八十年代：供销社、粮票、下乡、高考……这一次，要抓住每一个改变命运的机会",
    "aliases": [
      "年代",
      "年代文",
      "retro"
    ],
    "defaultProtagonist": "沈昭宁"
  },
  {
    "id": "wuxia",
    "label": "江湖",
    "description": "门派、客栈、英雄帖与江湖规矩。",
    "aliases": [
      "江湖",
      "武侠",
      "wuxia"
    ],
    "defaultProtagonist": "谢无妄"
  },
  {
    "id": "campus",
    "label": "校园",
    "description": "学期、社团、竞赛与错过的人。",
    "aliases": [
      "校园",
      "大学",
      "campus"
    ],
    "defaultProtagonist": "林晏"
  },
  {
    "id": "detective",
    "label": "刑侦",
    "description": "现场、口供、程序与不在场证明。",
    "aliases": [
      "刑侦",
      "破案",
      "侦探",
      "detective"
    ],
    "defaultProtagonist": "周慎"
  },
  {
    "id": "cyber",
    "label": "赛博",
    "description": "义体、公司、记忆备份与下层街区。",
    "aliases": [
      "赛博",
      "赛博朋克",
      "义体",
      "cyber"
    ],
    "defaultProtagonist": "顾晚棠"
  },
  {
    "id": "whale",
    "label": "深海实验室",
    "description": "同人向：深海实验室、鲸鱼娘与梁组。开源、组会、算力潮汐和社区黑话。非正式官方设定。",
    "aliases": [
      "深海",
      "鲸鱼娘",
      "梁圣",
      "梁组",
      "牢梁",
      "梁子",
      "whale",
      "deepseek"
    ],
    "defaultProtagonist": "阿澜"
  }
]
