import type { ISODate } from "./dates";

export type SkillId = "sleep" | "reading" | "learning" | "health" | "screen" | "work";
export const SKILL_IDS: SkillId[] = ["sleep", "reading", "learning", "health", "screen", "work"];

export type TopicId = "python" | "devops" | "aws" | "kubernetes" | "terraform" | "ai" | "sysdesign" | "problem";
export type LearnKind = "practice" | "problem" | "build" | "explain" | "study";
export type ActivityType = "walk" | "run" | "strength" | "stretch" | "meditate";
export type Priority = "high" | "medium" | "low";

export interface SleepLog { hours: number; bedtime?: string; wake?: string }
export interface ReadingEntry { id: string; pages: number; bookId?: string; ts: number }
export interface LearnSession { id: string; topic: TopicId; kind: LearnKind; minutes: number; note: string; ts: number }
export interface ActivityEntry { id: string; type: ActivityType; minutes: number; ts: number }

export interface Reflection {
  accomplished: string;
  distraction: string;
  learned: string;
  improve: string;
  mood: 1 | 2 | 3 | 4 | 5;
  journal: string;
  updatedAt: number;
}

export interface DayLog {
  sleep?: SleepLog;
  reading: ReadingEntry[];
  learning: LearnSession[];
  activity: ActivityEntry[];
  healthyEating?: boolean;
  /** Recreational screen minutes. `undefined` = not logged yet (never auto-filled as 0). */
  screen?: number;
  sideDone: string[];
  reflection?: Reflection;
}

export interface Book {
  id: string;
  title: string;
  author?: string;
  totalPages?: number;
  startedOn: ISODate;
  finishedOn?: ISODate;
}

export interface WorkTask {
  id: string;
  title: string;
  priority: Priority;
  createdOn: ISODate;
  doneOn?: ISODate;
  win?: string; // short accomplishment note recorded on completion
}

/** A personal learning goal ("Build a VPC module in Terraform"). Finishing one requires writing what you built. */
export interface LearnQuest { id: string; title: string; topic: TopicId; createdOn: ISODate; doneOn?: ISODate; outcome?: string }

export interface WeeklyReflection { improvement: string; note: string; savedOn: ISODate; updatedAt: number }

export interface Reward {
  id: string;
  title: string;
  cost: number; // gold (1 gold = 1 earned XP; spending never lowers level)
  minLevel?: number; // optional milestone gate
  icon: string;
  note?: string;
}
export interface Redemption { id: string; rewardId: string; title: string; cost: number; date: ISODate; ts: number }

export interface SideQuestDef { id: string; title: string; xp: number; custom?: boolean }

export interface Targets {
  sleepMin: number; // hours
  sleepMax: number;
  readMin: number; // pages
  readGoal: number;
  learnMin: number; // effective minutes
  learnGoal: number;
  moveMin: number; // minutes
  meditateMin: number;
  screenLimit: number; // minutes of recreational screen time
  screenGoal: number;
  workTasks: number;
  streakQuests: number; // quests needed for a day to count as "kept"
}

export interface XpTable {
  sleep: number; reading: number; learning: number; health: number; screen: number; work: number;
  reflection: number; flawless: number; comeback: number;
}

export interface ConfigEntry { from: ISODate; targets: Targets; xp: XpTable }

export interface Settings {
  heroName: string;
  startDate: ISODate;
  sound: boolean;
}

export interface GameState {
  version: 1;
  createdAt: number;
  onboarded: boolean;
  settings: Settings;
  /** Versioned config: edits apply from the day they are made, so history is never re-scored. */
  configHistory: ConfigEntry[];
  days: Record<ISODate, DayLog>;
  books: Book[];
  tasks: WorkTask[];
  learnQuests: LearnQuest[];
  weeklyReflections: Record<ISODate, WeeklyReflection>;
  rewards: Reward[];
  redemptions: Redemption[];
  sideQuests: SideQuestDef[];
  lastExportAt?: number;
  lastUsed: { topic: TopicId; kind: LearnKind; activity: ActivityType; bookId?: string };
}

export const emptyDay = (): DayLog => ({ reading: [], learning: [], activity: [], sideDone: [] });
