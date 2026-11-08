import type { SkillId, TopicId } from "../types";

/** Running totals up to (and including) a date. Achievements & regions read these. */
export interface Stats {
  day: number;
  xp: number;
  level: number;
  questsDone: number;
  keptDays: number;
  minimumDays: number;
  perfectDays: number;
  harmonyDays: number; // perfect day + reflection
  streak: number;
  longest: number;
  comebacks: number;
  pages: number;
  readDays: number;
  books: number;
  sessions: number;
  codingSessions: number;
  learnEff: number;
  topicEff: Record<TopicId, number>;
  topicsTouched: number; // topics with ≥60 effective minutes
  topicsAdept: number; // ≥420
  topicsMaster: number; // ≥1800
  workoutDays: number;
  activeMin: number;
  meditateDays: number;
  healthyDays: number;
  sleepGoodDays: number;
  bestSleepStreak: number;
  recoveries: number;
  earlyWakeDays: number;
  screenOkDays: number;
  bestScreenStreak: number;
  screenGoalDays: number;
  lowScreenDays: number;
  tasksDone: number;
  highTasksDone: number;
  fiveTaskDays: number;
  reflections: number;
  weeklyReflections: number;
  bossWins: number;
  valiants: number;
  weeklyQuests: number;
  monthlyChallenges: number;
  sideQuests: number;
  learnQuestsDone: number;
  rewardsClaimed: number;
  regionsCleared: number;
  finalDayKept: number;
  skillLevel: Record<SkillId, number>;
}

/** Totals inside one week or month. Bosses, weekly quests & monthly challenges read these. */
export interface PeriodStats {
  logDays: number;
  kept: number;
  minimumDays: number;
  perfectDays: number;
  questsDone: number;
  readDays: number;
  pages: number;
  learnDays: number;
  learnSessions: number;
  codingSessions: number;
  learnEff: number;
  workoutDays: number;
  meditateDays: number;
  healthyDays: number;
  sleepGoodDays: number;
  rhythmDays: number;
  screenOkDays: number;
  tasksDone: number;
  highTasks: number;
  reflections: number;
}
export const emptyPeriod = (): PeriodStats => ({
  logDays: 0, kept: 0, minimumDays: 0, perfectDays: 0, questsDone: 0, readDays: 0, pages: 0, learnDays: 0,
  learnSessions: 0, codingSessions: 0, learnEff: 0, workoutDays: 0, meditateDays: 0, healthyDays: 0,
  sleepGoodDays: 0, rhythmDays: 0, screenOkDays: 0, tasksDone: 0, highTasks: 0, reflections: 0,
});

// ───────────────────────── Achievements ─────────────────────────
export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "secret";
export const RARITY_XP: Record<Rarity, number> = { common: 25, uncommon: 50, rare: 100, epic: 200, legendary: 500, secret: 150 };
export const RARITY_COLOR: Record<Rarity, string> = {
  common: "#9AA5B1", uncommon: "#3DDC97", rare: "#46C2F2", epic: "#A978FF", legendary: "#F0BC4E", secret: "#FF6B9A",
};
export const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary", "secret"];

export interface Achievement {
  id: string;
  title: string;
  hint: string; // how to unlock — shown on the locked silhouette
  rarity: Rarity;
  icon: string;
  group: string;
  metric: (s: Stats) => number;
  target: number;
  secret?: boolean;
  /** For secrets: a cryptic line shown instead of the real hint until unlocked. */
  riddle?: string;
}

const a = (
  id: string, group: string, title: string, hint: string, rarity: Rarity, icon: string,
  metric: (s: Stats) => number, target: number, extra: Partial<Achievement> = {},
): Achievement => ({ id, group, title, hint, rarity, icon, metric, target, ...extra });

export const ACHIEVEMENTS: Achievement[] = [
  // Journey
  a("first_blood", "Journey", "First Blood", "Complete your first daily quest.", "common", "swords", (s) => s.questsDone, 1),
  a("consistency_begins", "Journey", "Consistency Begins", "Keep 3 days in a row.", "common", "repeat", (s) => s.longest, 3),
  a("seven_day_warrior", "Journey", "Seven-Day Warrior", "Complete 7 days of your minimum commitments (read · learn · move).", "uncommon", "shield", (s) => s.minimumDays, 7),
  a("fortnight", "Journey", "Fortnight Fighter", "Reach a 14-day streak.", "rare", "flame", (s) => s.longest, 14),
  a("month_might", "Journey", "Month of Might", "Reach a 30-day streak.", "epic", "flame", (s) => s.longest, 30),
  a("unbroken", "Journey", "Unbroken Resolve", "Reach a 60-day streak.", "epic", "flame", (s) => s.longest, 60),
  a("hundred_flame", "Journey", "The Hundred Flame", "Reach a 100-day streak.", "legendary", "flame", (s) => s.longest, 100),
  a("centurion", "Journey", "Centurion", "Keep 100 days.", "epic", "castle", (s) => s.keptDays, 100),
  a("year_walker", "Journey", "The Year Walker", "Keep 300 days of the journey.", "legendary", "mountain", (s) => s.keptDays, 300),
  a("flawless", "Journey", "Flawless Day", "Complete all six daily quests in one day.", "rare", "gem", (s) => s.perfectDays, 1),
  a("flawless5", "Journey", "Five Flawless", "Complete five flawless days.", "epic", "gem", (s) => s.perfectDays, 5),
  a("hero_returns", "Journey", "The Hero Returns", "Come back after a few days away and keep a day. Falling is part of the story.", "rare", "sunrise", (s) => s.comebacks, 1),
  a("rising_legend", "Journey", "The Rising Legend", "Reach Level 10.", "rare", "crown", (s) => s.level, 10),
  a("veteran", "Journey", "Veteran of the Road", "Reach Level 25.", "epic", "crown", (s) => s.level, 25),
  a("paragon", "Journey", "Paragon", "Reach Level 40.", "legendary", "crown", (s) => s.level, 40),
  a("legend_incarnate", "Journey", "Legend Incarnate", "Reach Level 60.", "legendary", "crown", (s) => s.level, 60),
  a("xp_1k", "Journey", "First Thousand", "Earn 1,000 XP.", "common", "star", (s) => s.xp, 1000),
  a("xp_10k", "Journey", "Ten Thousand Strong", "Earn 10,000 XP.", "epic", "star", (s) => s.xp, 10000),
  a("detour", "Journey", "Wanderer's Detour", "Complete 10 side quests.", "uncommon", "compass", (s) => s.sideQuests, 10),
  a("treat", "Journey", "Treat Yourself", "Claim your first reward.", "common", "gift", (s) => s.rewardsClaimed, 1),

  // Battle
  a("boss_1", "Battle", "Boss Slayer", "Defeat your first weekly boss.", "uncommon", "swords", (s) => s.bossWins, 1),
  a("boss_5", "Battle", "Dragonbane", "Defeat 5 bosses.", "rare", "swords", (s) => s.bossWins, 5),
  a("boss_15", "Battle", "Scourge of Demons", "Defeat 15 bosses.", "epic", "skull", (s) => s.bossWins, 15),
  a("valiant", "Battle", "Valiant Heart", "Fall just short of a boss and earn its respect.", "uncommon", "heart", (s) => s.valiants, 1),
  a("weekly_10", "Battle", "Weekly Warden", "Complete 10 weekly quests.", "uncommon", "scroll", (s) => s.weeklyQuests, 10),
  a("monthly_3", "Battle", "Monthly Champion", "Complete 3 monthly challenges.", "rare", "trophy", (s) => s.monthlyChallenges, 3),

  // Reading
  a("first_chapter", "Reading", "First Chapter", "Read on your first day.", "common", "bookopen", (s) => s.readDays, 1),
  a("pages_100", "Reading", "100 Pages", "Read 100 pages.", "uncommon", "book", (s) => s.pages, 100),
  a("bookworm", "Reading", "Bookworm", "Read 500 pages.", "rare", "book", (s) => s.pages, 500),
  a("pages_1000", "Reading", "A Thousand Pages", "Read 1,000 pages.", "epic", "library", (s) => s.pages, 1000),
  a("readers_journey", "Reading", "Reader's Journey", "Finish your first book.", "uncommon", "bookopen", (s) => s.books, 1),
  a("five_books", "Reading", "5 Books Completed", "Finish 5 books.", "epic", "library", (s) => s.books, 5),
  a("ten_books", "Reading", "Ten Tomes", "Finish 10 books.", "legendary", "library", (s) => s.books, 10),
  a("knowledge_seeker", "Reading", "Knowledge Seeker", "Read on 30 different days.", "rare", "lightbulb", (s) => s.readDays, 30),

  // Learning
  a("first_coding", "Learning", "First Coding Session", "Log a practice, problem or build session.", "common", "terminal", (s) => s.codingSessions, 1),
  a("code_warrior", "Learning", "Code Warrior", "Complete 25 coding sessions.", "rare", "code", (s) => s.codingSessions, 25),
  a("code_100", "Learning", "Hundredfold Hacker", "Complete 100 coding sessions.", "epic", "code", (s) => s.codingSessions, 100),
  a("python_apprentice", "Learning", "Python Apprentice", "Reach 3 effective hours in Python.", "uncommon", "code", (s) => s.topicEff.python, 180),
  a("cloud_explorer", "Learning", "Cloud Explorer", "Reach 3 effective hours in AWS.", "uncommon", "cloud", (s) => s.topicEff.aws, 180),
  a("terraform_smith", "Learning", "Terraform Smith", "Reach 5 effective hours in Terraform.", "uncommon", "layers", (s) => s.topicEff.terraform, 300),
  a("devops_dojo", "Learning", "DevOps Dojo", "Reach 5 effective hours in DevOps.", "uncommon", "infinity", (s) => s.topicEff.devops, 300),
  a("system_architect", "Learning", "System Architect", "Reach 5 effective hours in System Design.", "uncommon", "network", (s) => s.topicEff.sysdesign, 300),
  a("k8s_specialist", "Learning", "Kubernetes Specialist", "Reach 10 effective hours in Kubernetes.", "rare", "boxes", (s) => s.topicEff.kubernetes, 600),
  a("ai_engineer", "Learning", "AI Engineer", "Reach 10 effective hours in AI & AIOps.", "rare", "bot", (s) => s.topicEff.ai, 600),
  a("master_problem", "Learning", "Master Problem Solver", "Reach 25 effective hours in Problem Solving.", "epic", "puzzle", (s) => s.topicEff.problem, 1500),
  a("polymath", "Learning", "Polymath", "Reach Apprentice in all eight learning topics.", "epic", "sparkles", (s) => s.topicsTouched, 8),
  a("quest_first", "Learning", "Project Finisher", "Complete your first learning quest.", "uncommon", "rocket", (s) => s.learnQuestsDone, 1),
  a("quest_five", "Learning", "Quest Builder", "Complete 5 learning quests.", "rare", "boxes", (s) => s.learnQuestsDone, 5),
  a("hundred_hours", "Learning", "Hundred Hours of Craft", "Reach 100 effective hours of learning.", "legendary", "hourglass", (s) => s.learnEff, 6000),

  // Health
  a("first_steps", "Health", "First Steps", "Complete a day of movement (15 min).", "common", "footprints", (s) => s.workoutDays, 1),
  a("iron_will", "Health", "Iron Will", "Complete 10 workouts.", "uncommon", "dumbbell", (s) => s.workoutDays, 10),
  a("steel_body", "Health", "Body of Steel", "Complete 25 workouts.", "rare", "dumbbell", (s) => s.workoutDays, 25),
  a("vitality_100", "Health", "Century of Vitality", "Complete 100 workouts.", "epic", "heart", (s) => s.workoutDays, 100),
  a("still_waters", "Health", "Still Waters", "Meditate on 7 days.", "uncommon", "flower", (s) => s.meditateDays, 7),
  a("inner_peace", "Health", "Inner Peace", "Meditate on 30 days.", "rare", "flower", (s) => s.meditateDays, 30),
  a("well_fed", "Health", "Well Nourished", "Mark healthy eating on 14 days.", "uncommon", "leaf", (s) => s.healthyDays, 14),

  // Sleep
  a("first_rest", "Sleep", "First Rest", "Log a healthy night of sleep.", "common", "bed", (s) => s.sleepGoodDays, 1),
  a("rested_week", "Sleep", "Rested Week", "Sleep well 7 nights in a row.", "uncommon", "moon", (s) => s.bestSleepStreak, 7),
  a("sleep_sage", "Sleep", "Sleep Sage", "Log 30 healthy nights.", "rare", "moon", (s) => s.sleepGoodDays, 30),
  a("circadian", "Sleep", "Circadian Lord", "Sleep well 21 nights in a row.", "epic", "moon", (s) => s.bestSleepStreak, 21),
  a("phoenix", "Sleep", "Phoenix Rising", "Bounce back with a full night after a short one, 3 times.", "rare", "flame", (s) => s.recoveries, 3),

  // Focus
  a("focus_initiate", "Focus", "Focus Initiate", "Stay under your screen-time limit for a day.", "common", "eye", (s) => s.screenOkDays, 1),
  a("seven_day_focus", "Focus", "7-Day Focus", "Stay under your limit 7 days in a row.", "uncommon", "eye", (s) => s.bestScreenStreak, 7),
  a("focus_master", "Focus", "Focus Master", "Reach your deeper screen-time goal on 7 days.", "rare", "eye", (s) => s.screenGoalDays, 7),
  a("distraction_slayer", "Focus", "Distraction Slayer", "Stay under your limit on 30 days.", "rare", "swords", (s) => s.screenOkDays, 30),
  a("master_attention", "Focus", "Master of Attention", "Stay under your limit 30 days in a row.", "epic", "eye", (s) => s.bestScreenStreak, 30),

  // Work
  a("task_initiate", "Work", "Task Initiate", "Complete your first work task.", "common", "check", (s) => s.tasksDone, 1),
  a("ship_it", "Work", "Ship It", "Finish 10 high-priority tasks.", "uncommon", "rocket", (s) => s.highTasksDone, 10),
  a("ownership", "Work", "Ownership", "Complete 50 work tasks.", "uncommon", "briefcase", (s) => s.tasksDone, 50),
  a("execution_engine", "Work", "Execution Engine", "Hit your task goal on 10 days.", "rare", "zap", (s) => s.fiveTaskDays, 10),
  a("task_slayer", "Work", "Task Slayer", "Complete 250 work tasks.", "epic", "swords", (s) => s.tasksDone, 250),
  a("thousand_deeds", "Work", "A Thousand Deeds", "Complete 1,000 work tasks.", "legendary", "trophy", (s) => s.tasksDone, 1000),

  // Reflection
  a("inner_voice", "Reflection", "Inner Voice", "Write your first evening reflection.", "common", "feather", (s) => s.reflections, 1),
  a("looking_back", "Reflection", "Looking Back", "Complete your first weekly reflection.", "common", "scroll", (s) => s.weeklyReflections, 1),
  a("chronicler", "Reflection", "Chronicler", "Write 30 evening reflections.", "rare", "feather", (s) => s.reflections, 30),
  a("sages_ledger", "Reflection", "Sage's Ledger", "Write 100 evening reflections.", "epic", "scroll", (s) => s.reflections, 100),

  // Secrets
  a("harmony", "Secret", "Harmony", "Complete all six quests in one day and write your reflection.", "secret", "sparkles", (s) => s.harmonyDays, 1, { secret: true, riddle: "Honour every part of yourself in a single day — then write it down." }),
  a("quiet_day", "Secret", "The Quiet Day", "Log under one hour of recreational screen time.", "secret", "moon", (s) => s.lowScreenDays, 1, { secret: true, riddle: "Some days, the phone stays in a drawer." }),
  a("dawn_patrol", "Secret", "Dawn Patrol", "Wake before 6:30 after a healthy night, 5 times.", "secret", "sunrise", (s) => s.earlyWakeDays, 5, { secret: true, riddle: "The world is quiet before sunrise." }),
  a("twenty_six", "Secret", "Twenty-Six", "Complete 26 minimum-commitment days.", "secret", "star", (s) => s.minimumDays, 26, { secret: true, riddle: "A number that names this journey." }),
  a("final_page", "Secret", "The Final Page", "Keep day 365 of the journey.", "secret", "bookopen", (s) => s.finalDayKept, 1, { secret: true, riddle: "Every story has a last page." }),
];
export const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((x) => [x.id, x])) as Record<string, Achievement>;

// ───────────────────────── Bosses, weekly quests, monthly challenges ─────────────────────────
export interface Objective { id: string; label: string; target: number; value: (p: PeriodStats) => number }
export interface Boss {
  id: string; name: string; epithet: string; flavor: string; icon: string; color: string;
  objectives: Objective[]; xp: number;
}

export const BOSSES: Boss[] = [
  {
    id: "distraction", name: "The Distraction Demon", epithet: "Whisperer of One More Scroll", icon: "ghost", color: "#46C2F2", xp: 150,
    flavor: "It feeds on idle thumbs and open tabs. Starve it with intention.",
    objectives: [
      { id: "screen", label: "Stay under your screen-time limit on 5 days", target: 5, value: (p) => p.screenOkDays },
      { id: "learn", label: "Complete 4 learning sessions", target: 4, value: (p) => p.learnSessions },
      { id: "read", label: "Read on 5 days", target: 5, value: (p) => p.readDays },
    ],
  },
  {
    id: "comfort", name: "The Comfort Monster", epithet: "Keeper of the Warm Blanket", icon: "bed", color: "#FF9F6B", xp: 150,
    flavor: "It never attacks. It just makes tomorrow sound like a better day to start.",
    objectives: [
      { id: "workouts", label: "Complete 3 workouts", target: 3, value: (p) => p.workoutDays },
      { id: "sleep", label: "Sleep a healthy night on 5 nights", target: 5, value: (p) => p.sleepGoodDays },
      { id: "min", label: "Meet every minimum commitment on 5 days", target: 5, value: (p) => p.minimumDays },
    ],
  },
  {
    id: "procrastination", name: "The Procrastination King", epithet: "Ruler of Later", icon: "crown", color: "#A978FF", xp: 150,
    flavor: "His decree is always the same: 'Tomorrow.' Defy it with small, finished things.",
    objectives: [
      { id: "tasks", label: "Complete 20 work tasks", target: 20, value: (p) => p.tasksDone },
      { id: "code", label: "Complete 4 coding sessions", target: 4, value: (p) => p.codingSessions },
      { id: "reflect", label: "Write 5 evening reflections", target: 5, value: (p) => p.reflections },
    ],
  },
  {
    id: "wraith", name: "The Sleep Wraith", epithet: "Thief of Mornings", icon: "moon", color: "#7C93FF", xp: 150,
    flavor: "It lingers at midnight, offering one more episode. Decline kindly.",
    objectives: [
      { id: "sleep", label: "Sleep a healthy night on 5 nights", target: 5, value: (p) => p.sleepGoodDays },
      { id: "rhythm", label: "Keep a steady bedtime on 3 nights (log bed & wake time)", target: 3, value: (p) => p.rhythmDays },
      { id: "screen", label: "Stay under your screen-time limit on 4 days", target: 4, value: (p) => p.screenOkDays },
    ],
  },
  {
    id: "scholar", name: "The Hollow Scholar", epithet: "Guardian of Unread Shelves", icon: "feather", color: "#A978FF", xp: 150,
    flavor: "Knowing about things is not the same as knowing them. Prove it with practice.",
    objectives: [
      { id: "pages", label: "Read 50 pages", target: 50, value: (p) => p.pages },
      { id: "read", label: "Read on 5 days", target: 5, value: (p) => p.readDays },
      { id: "learn", label: "Earn 150 effective learning minutes", target: 150, value: (p) => Math.round(p.learnEff) },
    ],
  },
  {
    id: "golem", name: "The Iron Golem", epithet: "Statue of Stillness", icon: "dumbbell", color: "#3DDC97", xp: 150,
    flavor: "Slow, heavy, patient. Only steady rhythm cracks its shell.",
    objectives: [
      { id: "workouts", label: "Complete 4 workouts", target: 4, value: (p) => p.workoutDays },
      { id: "meditate", label: "Meditate on 3 days", target: 3, value: (p) => p.meditateDays },
      { id: "eat", label: "Mark healthy eating on 4 days", target: 4, value: (p) => p.healthyDays },
    ],
  },
];
export const VALIANT_XP = 40;
export const BOSS_BY_ID = Object.fromEntries(BOSSES.map((b) => [b.id, b])) as Record<string, Boss>;

export interface PeriodQuest {
  id: string; name: string; desc: string; skill: SkillId; icon: string; xp: number; target: number;
  value: (p: PeriodStats) => number;
}
export const WEEKLY_QUESTS: PeriodQuest[] = [
  { id: "wq_read", name: "Reading Rally", desc: "Read on 5 days this week", skill: "reading", icon: "book", xp: 30, target: 5, value: (p) => p.readDays },
  { id: "wq_learn", name: "Forge Week", desc: "Learn on 4 days this week", skill: "learning", icon: "brain", xp: 40, target: 4, value: (p) => p.learnDays },
  { id: "wq_move", name: "Moving Mountains", desc: "Complete 3 workouts", skill: "health", icon: "heart", xp: 35, target: 3, value: (p) => p.workoutDays },
  { id: "wq_sleep", name: "Rested Realm", desc: "Sleep a healthy night on 5 nights", skill: "sleep", icon: "moon", xp: 30, target: 5, value: (p) => p.sleepGoodDays },
  { id: "wq_focus", name: "Focus Fortress", desc: "Stay under your screen limit on 5 days", skill: "screen", icon: "eye", xp: 30, target: 5, value: (p) => p.screenOkDays },
  { id: "wq_work", name: "Task Slayer", desc: "Complete 20 work tasks", skill: "work", icon: "briefcase", xp: 35, target: 20, value: (p) => p.tasksDone },
];
export const MONTHLY_QUESTS: PeriodQuest[] = [
  { id: "mq_read", name: "Page Turner", desc: "Read 200 pages this month", skill: "reading", icon: "library", xp: 120, target: 200, value: (p) => p.pages },
  { id: "mq_learn", name: "Code Forge", desc: "Learn on 15 days this month", skill: "learning", icon: "terminal", xp: 120, target: 15, value: (p) => p.learnDays },
  { id: "mq_move", name: "Iron Month", desc: "Complete 12 workouts", skill: "health", icon: "dumbbell", xp: 120, target: 12, value: (p) => p.workoutDays },
  { id: "mq_sleep", name: "Steady Sleeper", desc: "Sleep a healthy night on 20 nights", skill: "sleep", icon: "moon", xp: 120, target: 20, value: (p) => p.sleepGoodDays },
  { id: "mq_focus", name: "Focus Month", desc: "Stay under your screen limit on 20 days", skill: "screen", icon: "eye", xp: 120, target: 20, value: (p) => p.screenOkDays },
  { id: "mq_reflect", name: "Reflection Month", desc: "Write 20 evening reflections", skill: "work", icon: "feather", xp: 100, target: 20, value: (p) => p.reflections },
];

// ───────────────────────── World map ─────────────────────────
export interface Milestone { id: string; label: string; target: number; metric: (s: Stats) => number }
export interface Region {
  id: string; name: string; subtitle: string; story: string; icon: string; color: string;
  unlockLevel: number; xp: number; milestones: Milestone[];
}
const m = (id: string, label: string, metric: (s: Stats) => number, target: number): Milestone => ({ id, label, metric, target });

export const REGIONS: Region[] = [
  {
    id: "forest", name: "Forest of Beginnings", subtitle: "Where every journey starts", icon: "trees", color: "#3DDC97", unlockLevel: 1, xp: 100,
    story: "Tall trees, soft light, and a path that only exists because you walked it. Learn the rhythm of showing up.",
    milestones: [
      m("f1", "Complete your first daily quest", (s) => s.questsDone, 1),
      m("f2", "Keep 3 days in a row", (s) => s.longest, 3),
      m("f3", "Write your first evening reflection", (s) => s.reflections, 1),
      m("f4", "Reach Level 5", (s) => s.level, 5),
    ],
  },
  {
    id: "mountains", name: "Mountains of Discipline", subtitle: "Thin air, honest effort", icon: "mountain", color: "#A978FF", unlockLevel: 5, xp: 150,
    story: "Nobody climbs these on motivation. The only handholds are routine and the willingness to do it badly.",
    milestones: [
      m("m1", "Reach a 7-day streak", (s) => s.longest, 7),
      m("m2", "Complete 10 workouts", (s) => s.workoutDays, 10),
      m("m3", "Defeat your first boss", (s) => s.bossWins, 1),
      m("m4", "Keep 20 days", (s) => s.keptDays, 20),
    ],
  },
  {
    id: "library", name: "Library of Wisdom", subtitle: "Silence, shelves, and slow ideas", icon: "library", color: "#F0BC4E", unlockLevel: 10, xp: 200,
    story: "Candlelit aisles that go on longer than they should. The books here argue with each other, and with you.",
    milestones: [
      m("l1", "Read 300 pages", (s) => s.pages, 300),
      m("l2", "Finish a book", (s) => s.books, 1),
      m("l3", "Read on 20 days", (s) => s.readDays, 20),
      m("l4", "Log 10 coding sessions", (s) => s.codingSessions, 10),
    ],
  },
  {
    id: "valley", name: "Valley of Vitality", subtitle: "Streams, sun, and steady breath", icon: "leaf", color: "#46C2F2", unlockLevel: 18, xp: 250,
    story: "A green valley that rewards the patient. Strong legs, quiet mind, and sleep that actually restores you.",
    milestones: [
      m("v1", "Meditate on 15 days", (s) => s.meditateDays, 15),
      m("v2", "Log 30 healthy nights of sleep", (s) => s.sleepGoodDays, 30),
      m("v3", "Complete 25 workouts", (s) => s.workoutDays, 25),
      m("v4", "Stay under your screen limit on 21 days", (s) => s.screenOkDays, 21),
    ],
  },
  {
    id: "citadel", name: "Citadel of Knowledge", subtitle: "Forges, blueprints, working machines", icon: "castle", color: "#7C5CFF", unlockLevel: 32, xp: 350,
    story: "A fortress built by people who shipped things. Every wall is a lesson that was once a bug.",
    milestones: [
      m("c1", "Complete 50 coding sessions", (s) => s.codingSessions, 50),
      m("c2", "Reach Adept in 2 learning topics", (s) => s.topicsAdept, 2),
      m("c3", "Defeat 5 bosses", (s) => s.bossWins, 5),
      m("c4", "Complete 100 work tasks", (s) => s.tasksDone, 100),
    ],
  },
  {
    id: "kingdom", name: "Kingdom of Mastery", subtitle: "Crowns are earned slowly", icon: "crown", color: "#FF9F6B", unlockLevel: 44, xp: 500,
    story: "Few arrive. Fewer stay. The citizens here simply do the work, and the work has become beautiful.",
    milestones: [
      m("k1", "Keep 100 days", (s) => s.keptDays, 100),
      m("k2", "Reach a 30-day streak", (s) => s.longest, 30),
      m("k3", "Finish 5 books", (s) => s.books, 5),
      m("k4", "Defeat 12 bosses", (s) => s.bossWins, 12),
    ],
  },
  {
    id: "summit", name: "Summit of the Legend", subtitle: "Above the clouds, below the stars", icon: "star", color: "#FFE08A", unlockLevel: 56, xp: 1000,
    story: "The last climb. From here you can see the whole year, every ordinary day that made it extraordinary.",
    milestones: [
      m("s1", "Reach Level 60", (s) => s.level, 60),
      m("s2", "Keep 300 days", (s) => s.keptDays, 300),
      m("s3", "Reach Master rank in a learning topic", (s) => s.topicsMaster, 1),
      m("s4", "Reach day 365 of the journey", (s) => s.day, 365),
    ],
  },
];
export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r])) as Record<string, Region>;
