import type { ActivityType, LearnKind, SkillId, TopicId } from "../types";

export interface SkillMeta {
  id: SkillId;
  attribute: string; // RPG attribute name
  area: string; // real-life area
  quest: string; // daily quest name
  tagline: string;
  icon: string;
  color: string;
  glow: string;
  /** Skill-tree nodes unlocked as the skill levels up. */
  tree: { level: number; title: string; flavor: string }[];
}

export const SKILLS: Record<SkillId, SkillMeta> = {
  sleep: {
    id: "sleep", attribute: "Energy", area: "Sleep", quest: "Restore Energy",
    tagline: "Rest is a weapon. Sharpen it nightly.",
    icon: "moon", color: "#7C93FF", glow: "rgba(124,147,255,.45)",
    tree: [
      { level: 1, title: "Drowsy Novice", flavor: "You have begun to take rest seriously." },
      { level: 3, title: "Dusk Walker", flavor: "Evenings start to mean something." },
      { level: 5, title: "Moonkeeper", flavor: "Your body learns when the day ends." },
      { level: 8, title: "Dreamweaver", flavor: "Sleep stops being a negotiation." },
      { level: 12, title: "Night Guardian", flavor: "A steady rhythm protects everything else." },
      { level: 16, title: "Dawnbringer", flavor: "Mornings arrive on your terms." },
      { level: 20, title: "Sage of Slumber", flavor: "Recovery is now a reliable power." },
      { level: 25, title: "Circadian Lord", flavor: "Your clock obeys you." },
      { level: 30, title: "Eternal Rhythm", flavor: "Rest and effort, in perfect balance." },
    ],
  },
  reading: {
    id: "reading", attribute: "Intelligence", area: "Reading", quest: "Knowledge Seeker",
    tagline: "Every page is a door.",
    icon: "book", color: "#A978FF", glow: "rgba(169,120,255,.45)",
    tree: [
      { level: 1, title: "Page Turner", flavor: "Two pages is how every library starts." },
      { level: 3, title: "Chapter Chaser", flavor: "Stories stop feeling like chores." },
      { level: 5, title: "Bookworm", flavor: "Your attention can hold a long idea." },
      { level: 8, title: "Margin Scribe", flavor: "You argue with the author, politely." },
      { level: 12, title: "Lore Keeper", flavor: "Ideas from different books start to connect." },
      { level: 16, title: "Sage Reader", flavor: "You read to think, not to finish." },
      { level: 20, title: "Archivist", flavor: "A whole shelf lives in your head." },
      { level: 25, title: "Grand Librarian", flavor: "Wisdom compounds quietly." },
      { level: 30, title: "Living Library", flavor: "You are the book others consult." },
    ],
  },
  learning: {
    id: "learning", attribute: "Knowledge", area: "Learning", quest: "Train Your Mind",
    tagline: "Practice beats passive consumption.",
    icon: "brain", color: "#F0BC4E", glow: "rgba(240,188,78,.45)",
    tree: [
      { level: 1, title: "First Commit", flavor: "You wrote something instead of just watching." },
      { level: 3, title: "Script Apprentice", flavor: "Small tools, real understanding." },
      { level: 5, title: "Debug Adept", flavor: "Errors are clues, not insults." },
      { level: 8, title: "Pipeline Builder", flavor: "You automate what annoys you." },
      { level: 12, title: "Cloud Navigator", flavor: "Infrastructure bends to your intent." },
      { level: 16, title: "System Thinker", flavor: "You see the whole machine." },
      { level: 20, title: "Architect", flavor: "Trade-offs are your native language." },
      { level: 25, title: "Principal Mind", flavor: "Others bring you their hardest problems." },
      { level: 30, title: "Master Engineer", flavor: "Craft, depth and calm." },
    ],
  },
  health: {
    id: "health", attribute: "Vitality", area: "Health", quest: "Build Vitality",
    tagline: "A strong body carries a strong mind.",
    icon: "heart", color: "#3DDC97", glow: "rgba(61,220,151,.45)",
    tree: [
      { level: 1, title: "First Steps", flavor: "Movement has begun." },
      { level: 3, title: "Trail Walker", flavor: "Fresh air is part of the plan." },
      { level: 5, title: "Iron Initiate", flavor: "Strength is built in small reps." },
      { level: 8, title: "Steady Breath", flavor: "Stillness joins the training." },
      { level: 12, title: "Stamina Knight", flavor: "Your engine keeps getting bigger." },
      { level: 16, title: "Body Smith", flavor: "You listen to your body, and it listens back." },
      { level: 20, title: "Warden of Vitality", flavor: "Health is now your default." },
      { level: 25, title: "Ironbound", flavor: "Consistency has become strength." },
      { level: 30, title: "Heart of the Mountain", flavor: "Strong, rested, unhurried." },
    ],
  },
  screen: {
    id: "screen", attribute: "Focus", area: "Screen time", quest: "Master Your Focus",
    tagline: "Attention is the scarcest resource you own.",
    icon: "eye", color: "#46C2F2", glow: "rgba(70,194,242,.45)",
    tree: [
      { level: 1, title: "Focus Initiate", flavor: "You noticed where your hours go." },
      { level: 3, title: "Scroll Breaker", flavor: "The feed lets go a little sooner." },
      { level: 5, title: "Quiet Mind", flavor: "Boredom is no longer an emergency." },
      { level: 8, title: "Distraction Slayer", flavor: "Notifications work for you now." },
      { level: 12, title: "Deep Diver", flavor: "Long, uninterrupted thought is back." },
      { level: 16, title: "Phone Monk", flavor: "The device is a tool again." },
      { level: 20, title: "Steady Gaze", flavor: "Your attention is yours." },
      { level: 25, title: "Warden of Attention", flavor: "You protect others' focus too." },
      { level: 30, title: "Master of Attention", flavor: "Whatever you look at, you see." },
    ],
  },
  work: {
    id: "work", attribute: "Discipline", area: "Work", quest: "Professional Excellence",
    tagline: "Ownership, not overtime.",
    icon: "briefcase", color: "#FF7A59", glow: "rgba(255,122,89,.45)",
    tree: [
      { level: 1, title: "Task Initiate", flavor: "Things get finished." },
      { level: 3, title: "List Slayer", flavor: "The list is a tool, not a threat." },
      { level: 5, title: "Reliable Hand", flavor: "People trust your 'done'." },
      { level: 8, title: "Owner", flavor: "You close loops without being asked." },
      { level: 12, title: "Problem Hunter", flavor: "You chase root causes." },
      { level: 16, title: "Execution Engine", flavor: "Momentum is your default." },
      { level: 20, title: "Trusted Lead", flavor: "Others calibrate to your standard." },
      { level: 25, title: "Force Multiplier", flavor: "Your work makes the whole team faster." },
      { level: 30, title: "Professional of Legend", flavor: "Excellent, and home for dinner." },
    ],
  },
};

export interface TopicMeta { id: TopicId; name: string; icon: string; blurb: string }
export const TOPICS: TopicMeta[] = [
  { id: "python", name: "Python", icon: "code", blurb: "Scripts, data, tools, clean code." },
  { id: "devops", name: "DevOps", icon: "infinity", blurb: "CI/CD, Linux, observability, automation." },
  { id: "aws", name: "AWS", icon: "cloud", blurb: "Compute, networking, IAM, serverless." },
  { id: "kubernetes", name: "Kubernetes", icon: "boxes", blurb: "Pods, deployments, helm, operators." },
  { id: "terraform", name: "Terraform", icon: "layers", blurb: "Infrastructure as code, modules, state." },
  { id: "ai", name: "AI & AIOps", icon: "bot", blurb: "LLMs, agents, ML ops, intelligent ops." },
  { id: "sysdesign", name: "System Design", icon: "network", blurb: "Scale, reliability, trade-offs." },
  { id: "problem", name: "Problem Solving", icon: "puzzle", blurb: "Algorithms, puzzles, debugging." },
];
export const TOPIC_BY_ID = Object.fromEntries(TOPICS.map((t) => [t.id, t])) as Record<TopicId, TopicMeta>;

/** Effective minutes needed for each topic mastery tier. */
export const TOPIC_TIERS = [
  { at: 0, name: "Novice" },
  { at: 60, name: "Apprentice" },
  { at: 180, name: "Practitioner" },
  { at: 420, name: "Adept" },
  { at: 900, name: "Expert" },
  { at: 1800, name: "Master" },
];
export function topicTier(min: number) {
  let i = 0;
  TOPIC_TIERS.forEach((t, idx) => { if (min >= t.at) i = idx; });
  const next = TOPIC_TIERS[i + 1];
  return { index: i, name: TOPIC_TIERS[i].name, next, pct: next ? (min - TOPIC_TIERS[i].at) / (next.at - TOPIC_TIERS[i].at) : 1 };
}

export interface KindMeta { id: LearnKind; name: string; hint: string; weight: number }
export const LEARN_KINDS: KindMeta[] = [
  { id: "practice", name: "Practice", hint: "Exercises, labs, katas", weight: 1 },
  { id: "problem", name: "Problem solving", hint: "Puzzles, debugging, algorithms", weight: 1 },
  { id: "build", name: "Build", hint: "Implement something real", weight: 1 },
  { id: "explain", name: "Explain", hint: "Teach it back, write notes", weight: 1 },
  { id: "study", name: "Study", hint: "Watching / reading — counts ½", weight: 0.5 },
];
export const KIND_BY_ID = Object.fromEntries(LEARN_KINDS.map((k) => [k.id, k])) as Record<LearnKind, KindMeta>;
export const CODING_KINDS: LearnKind[] = ["practice", "problem", "build"];

export interface ActivityMeta { id: ActivityType; name: string; icon: string }
export const ACTIVITIES: ActivityMeta[] = [
  { id: "walk", name: "Walk", icon: "footprints" },
  { id: "run", name: "Run", icon: "wind" },
  { id: "strength", name: "Strength", icon: "dumbbell" },
  { id: "stretch", name: "Stretch", icon: "flower" },
  { id: "meditate", name: "Meditate", icon: "sparkles" },
];
export const ACTIVITY_BY_ID = Object.fromEntries(ACTIVITIES.map((a) => [a.id, a])) as Record<ActivityType, ActivityMeta>;
