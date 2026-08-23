// Static game content. In production, chapters and trivia would be seeded into
// Supabase tables (campaign_progress, trivia_bank). All historical claims are
// flagged for review so they can be fact-checked before launch.

export type ResourceKey = "fighters" | "provisions" | "morale"

export type Resources = Record<ResourceKey, number>

export interface UpgradeDef {
  id: string
  nameEn: string
  nameAm: string
  descEn: string
  descAm: string
  resource: ResourceKey
  baseCost: number
  baseRate: number // production per second per level
  costResource: ResourceKey
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: "recruit_post",
    nameEn: "Recruit Post",
    nameAm: "የቅጥር ጣቢያ",
    descEn: "Trains new fighters to join the ranks.",
    descAm: "አዳዲስ ተዋጊዎችን ያሰለጥናል።",
    resource: "fighters",
    baseRate: 0.6,
    baseCost: 20,
    costResource: "provisions",
  },
  {
    id: "grain_store",
    nameEn: "Grain Store",
    nameAm: "የእህል መጋዘን",
    descEn: "Stockpiles teff and grain to feed the camp.",
    descAm: "ሰፈሩን ለመመገብ ጤፍና እህል ያከማቻል።",
    resource: "provisions",
    baseRate: 1.0,
    baseCost: 15,
    costResource: "morale",
  },
  {
    id: "council_tent",
    nameEn: "Council Tent",
    nameAm: "የምክር ድንኳን",
    descEn: "Elders and leaders raise the camp's morale.",
    descAm: "ሽማግሌዎችና መሪዎች የሰፈሩን ሞራል ከፍ ያደርጋሉ።",
    resource: "morale",
    baseRate: 0.5,
    baseCost: 25,
    costResource: "fighters",
  },
]

export function upgradeCost(def: UpgradeDef, level: number): number {
  return Math.floor(def.baseCost * Math.pow(1.55, level))
}

export type BattleType = "formation" | "sniper" | "mixed"

export interface ChapterDef {
  id: number
  titleEn: string
  titleAm: string
  blurbEn: string
  blurbAm: string
  enemyPower: number
  reward: Partial<Resources>
  scoreReward: number
  // NEEDS HISTORIAN REVIEW: chapter framing references real 1880s-1930s resistance
  // events and the 1896 Battle of Adwa. All names, sequence, and context must be
  // verified by a historian before launch. Combat is intentionally abstract.
  historian: string
  // Visual distinction for enemy type (abstract, stylized)
  enemyColor?: string // tailwind color class, e.g., "text-ember", "text-primary", etc.
  battleType: BattleType
}

export const CHAPTERS: ChapterDef[] = [
  {
    id: 1,
    titleEn: "The Highland Muster",
    titleAm: "የተራራው ስብስብ",
    blurbEn: "Word spreads across the plateau. Farmers and herders answer the call to defend their homeland.",
    blurbAm: "ዜናው በተራራው ላይ ተሰራጨ። ገበሬዎችና እረኞች አገራቸውን ለመከላከል ጥሪውን መለሱ።",
    enemyPower: 40,
    reward: { provisions: 60, morale: 30 },
    scoreReward: 100,
    historian: "NEEDS HISTORIAN REVIEW: general mobilization framing, no specific claims.",
    battleType: "formation",
  },
  {
    id: 2,
    titleEn: "The Mountain Pass",
    titleAm: "የተራራው መተላለፊያ",
    blurbEn: "A narrow pass must be held. Terrain favors the defenders who know every ridge.",
    blurbAm: "ጠባቡ መተላለፊያ መያዝ አለበት። መልክዓ ምድሩ ለተከላካዮች ይጠቅማል።",
    enemyPower: 70,
    reward: { fighters: 25, morale: 40 },
    scoreReward: 140,
    historian: "NEEDS HISTORIAN REVIEW: terrain-based defense is illustrative, not a specific engagement.",
    battleType: "sniper",
  },
  {
    id: 3,
    titleEn: "Supply Lines",
    titleAm: "የስንቅ መስመሮች",
    blurbEn: "Guard the caravans carrying grain and gunpowder to the front.",
    blurbAm: "ወደ ግንባር እህልና ባሩድ የሚያጓጉዙ ተሽከርካሪዎችን ጠብቅ።",
    enemyPower: 100,
    reward: { provisions: 120, fighters: 20 },
    scoreReward: 180,
    historian: "NEEDS HISTORIAN REVIEW: logistics theme is generic.",
    battleType: "formation",
  },
  {
    id: 4,
    titleEn: "The River Crossing",
    titleAm: "የወንዙ መሻገሪያ",
    blurbEn: "Formations must cross swollen highland rivers before the rains close the fords.",
    blurbAm: "ዝናቡ ከመዝጋቱ በፊት ወንዞችን መሻገር አለባቸው።",
    enemyPower: 135,
    reward: { morale: 90, provisions: 60 },
    scoreReward: 220,
    historian: "NEEDS HISTORIAN REVIEW: seasonal/rainy-season logistics are illustrative.",
    battleType: "sniper",
  },
  {
    id: 5,
    titleEn: "The Long Watch",
    titleAm: "ረዥም ጥበቃ",
    blurbEn: "Scouts track movements across the ranges through cold nights.",
    blurbAm: "ተመልካቾች በቀዝቃዛ ሌሊቶች እንቅስቃሴዎችን ይከታተላሉ።",
    enemyPower: 175,
    reward: { fighters: 45, morale: 60 },
    scoreReward: 260,
    historian: "NEEDS HISTORIAN REVIEW: reconnaissance theme is generic.",
    battleType: "formation",
  },
  {
    id: 6,
    titleEn: "Rally of the Regiments",
    titleAm: "የክፍለ ጦሮች ስብሰባ",
    blurbEn: "Separate formations unite under a shared banner for the decisive stand.",
    blurbAm: "የተለያዩ ክፍሎች በአንድ ባንዲራ ስር ተባበሩ።",
    enemyPower: 230,
    reward: { provisions: 150, morale: 100 },
    scoreReward: 320,
    historian: "NEEDS HISTORIAN REVIEW: unity-of-forces framing; regiments are fictional/campaign names.",
    battleType: "formation",
  },
  {
    id: 7,
    titleEn: "Eve of Adwa",
    titleAm: "የዐድዋ ዋዜማ",
    blurbEn: "The largest force yet assembles on the plains near Adwa. Resolve is tested.",
    blurbAm: "እስካሁን ትልቁ ኃይል በዐድዋ አቅራቢያ ተሰበሰበ።",
    enemyPower: 300,
    reward: { fighters: 70, morale: 140 },
    scoreReward: 400,
    historian:
      "NEEDS HISTORIAN REVIEW: references the lead-up to the 1896 Battle of Adwa. Dates, locations, and framing must be verified.",
    battleType: "sniper",
  },
  {
    id: 8,
    titleEn: "The Day at Adwa",
    titleAm: "የዐድዋ ቀን",
    blurbEn:
      "1 March 1896 \u2014 remembered as a landmark victory and a source of shared national pride. Presented respectfully and abstractly.",
    blurbAm: "የ1896 ድል \u2014 እንደ ብሔራዊ ኩራት ምንጭ ይታወሳል።",
    enemyPower: 380,
    reward: { fighters: 120, provisions: 200, morale: 200 },
    scoreReward: 600,
    historian:
      "NEEDS HISTORIAN REVIEW: the Battle of Adwa (1 March 1896). Any date, outcome, and contextual claim must be historian-verified. No invented quotes or attributed actions.",
    battleType: "formation",
  },
]

export interface TriviaQuestion {
  id: number
  questionEn: string
  questionAm: string
  optionsEn: string[]
  optionsAm: string[]
  // NOTE: the correct answer index lives ONLY in the server-side trivia_questions
  // table. The client renders questions and submits an answer; the server verdict
  // drives the UI (see game_submit_trivia in the production migration).
  sourceNote: string
}

// NEEDS HISTORIAN REVIEW: every question below states a historical claim and must be
// fact-checked against cited sources before launch. Placeholders for a Supabase
// `trivia_bank` seed. No quotes are attributed to specific individuals.
export const TRIVIA_BANK: TriviaQuestion[] = [
  {
    id: 1,
    questionEn: "In what year was the Battle of Adwa fought?",
    questionAm: "የዐድዋ ጦርነት በየትኛው ዓመት ተካሄደ?",
    optionsEn: ["1878", "1889", "1896", "1913"],
    optionsAm: ["1878", "1889", "1896", "1913"],
    sourceNote: "NEEDS HISTORIAN REVIEW: commonly cited as 1 March 1896.",
  },
  {
    id: 2,
    questionEn: "The Battle of Adwa took place in which region of present-day Ethiopia?",
    questionAm: "የዐድዋ ጦርነት በአሁኑ ኢትዮጵያ በየትኛው ክልል ተካሄደ?",
    optionsEn: ["Tigray", "Sidama", "Gambela", "Afar"],
    optionsAm: ["ትግራይ", "ሲዳማ", "ጋምቤላ", "አፋር"],
    sourceNote: "NEEDS HISTORIAN REVIEW: Adwa is located in the Tigray region.",
  },
  {
    id: 3,
    questionEn: "What is the capital city of Ethiopia?",
    questionAm: "የኢትዮጵያ ዋና ከተማ ማን ናት?",
    optionsEn: ["Gondar", "Addis Ababa", "Axum", "Harar"],
    optionsAm: ["ጎንደር", "አዲስ አበባ", "አክሱም", "ሐረር"],
    sourceNote: "NEEDS HISTORIAN REVIEW: Addis Ababa founded in the late 19th century.",
  },
  {
    id: 4,
    questionEn: "Which script is traditionally used to write Amharic?",
    questionAm: "አማርኛን ለመጻፍ በባህላዊ የሚጠቀመው ፊደል የትኛው ነው?",
    optionsEn: ["Latin", "Ge'ez (Fidel)", "Arabic", "Cyrillic"],
    optionsAm: ["ላቲን", "ግዕዝ (ፊደል)", "ዓረብኛ", "ሲሪሊክ"],
    sourceNote: "NEEDS HISTORIAN REVIEW: Amharic uses the Ge'ez script.",
  },
  {
    id: 5,
    questionEn: "The anniversary of the Battle of Adwa is commemorated in which month?",
    questionAm: "የዐድዋ ድል መታሰቢያ በየትኛው ወር ይከበራል?",
    optionsEn: ["January", "March", "July", "November"],
    optionsAm: ["ጥር", "መጋቢት", "ሐምሌ", "ኅዳር"],
    sourceNote: "NEEDS HISTORIAN REVIEW: commemorated in early March.",
  },
  {
    id: 6,
    questionEn: "Which ancient city is famous for its towering carved stelae (obelisks)?",
    questionAm: "በተቀረጹ ረዣዥም ሐውልቶች የምትታወቀው ጥንታዊ ከተማ የትኛዋ ናት?",
    optionsEn: ["Lalibela", "Axum", "Dire Dawa", "Bahir Dar"],
    optionsAm: ["ላሊበላ", "አክሱም", "ድሬዳዋ", "ባህር ዳር"],
    sourceNote: "NEEDS HISTORIAN REVIEW: Axum is known for its ancient stelae.",
  },
  {
    id: 7,
    questionEn: "Ethiopia's highland plateau is drained by a major tributary of which river?",
    questionAm: "የኢትዮጵያ ደጋማ አካባቢ ውሃ የሚፈሰው ወደ የትኛው ወንዝ ነው?",
    optionsEn: ["Congo", "Nile", "Niger", "Zambezi"],
    optionsAm: ["ኮንጎ", "ናይል", "ኒጀር", "ዛምቤዚ"],
    sourceNote: "NEEDS HISTORIAN REVIEW: the Blue Nile rises in the Ethiopian highlands.",
  },
  {
    id: 8,
    questionEn: "Which staple grain, native to Ethiopia, is used to make injera?",
    questionAm: "እንጀራ ለመስራት የሚያገለግለው የኢትዮጵያ ተወላጅ እህል የትኛው ነው?",
    optionsEn: ["Teff", "Rice", "Barley", "Maize"],
    optionsAm: ["ጤፍ", "ሩዝ", "ገብስ", "በቆሎ"],
    sourceNote: "NEEDS HISTORIAN REVIEW: teff is an indigenous Ethiopian grain.",
  },
  {
    id: 9,
    questionEn: "Approximately how many colors are on the traditional Ethiopian tricolor?",
    questionAm: "በባህላዊ የኢትዮጵያ ባንዲራ ላይ ስንት ቀለሞች አሉ?",
    optionsEn: ["Two", "Three", "Four", "Five"],
    optionsAm: ["ሁለት", "ሶስት", "አራት", "አምስት"],
    sourceNote: "NEEDS HISTORIAN REVIEW: green, yellow, and red tricolor.",
  },
  {
    id: 10,
    questionEn: "The rock-hewn churches celebrated as a heritage site are located at which town?",
    questionAm: "በቅርስነት የሚታወቁት ከድንጋይ የተፈለፈሉ አብያተ ክርስቲያናት የት ይገኛሉ?",
    optionsEn: ["Lalibela", "Adwa", "Jimma", "Mekelle"],
    optionsAm: ["ላሊበላ", "ዐድዋ", "ጅማ", "መቀሌ"],
    sourceNote: "NEEDS HISTORIAN REVIEW: Lalibela's rock-hewn churches.",
  },
]

export interface BadgeDef {
  id: string
  nameEn: string
  nameAm: string
  descEn: string
  descAm: string
  chapterRequired: number
  emblem: string // used to pick an icon; purely cosmetic, no monetary value
}

export const BADGES: BadgeDef[] = [
  {
    id: "first_muster",
    nameEn: "The First Muster",
    nameAm: "የመጀመሪያ ስብስብ",
    descEn: "Cleared Chapter 1.",
    descAm: "ምዕራፍ 1 አጠናቀቁ።",
    chapterRequired: 1,
    emblem: "flag",
  },
  {
    id: "pass_holder",
    nameEn: "Keeper of the Pass",
    nameAm: "የመተላለፊያ ጠባቂ",
    descEn: "Cleared Chapter 2.",
    descAm: "ምዕራፍ 2 አጠናቀቁ።",
    chapterRequired: 2,
    emblem: "mountain",
  },
  {
    id: "quartermaster",
    nameEn: "Quartermaster",
    nameAm: "የስንቅ አስተዳዳሪ",
    descEn: "Cleared Chapter 3.",
    descAm: "ምዕራፍ 3 አጠናቀቁ።",
    chapterRequired: 3,
    emblem: "wheat",
  },
  {
    id: "banner_bearer",
    nameEn: "Banner Bearer",
    nameAm: "ባንዲራ ተሸካሚ",
    descEn: "Cleared Chapter 6 and united the regiments.",
    descAm: "ምዕራፍ 6 አጠናቀቁ።",
    chapterRequired: 6,
    emblem: "banner",
  },
  {
    id: "adwa_star",
    nameEn: "Star of Adwa",
    nameAm: "የዐድዋ ኮከብ",
    descEn: "Cleared the final chapter. A collectible emblem of shared pride.",
    descAm: "የመጨረሻውን ምዕራፍ አጠናቀቁ።",
    chapterRequired: 8,
    emblem: "star",
  },
]
