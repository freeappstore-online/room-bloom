// ─── Core Types ───────────────────────────────────────────────────────────────

export type QuestType =
  | "cleaning"
  | "garden"
  | "kitchen"
  | "shopping"
  | "laundry"
  | "maintenance"
  | "pet";

export type Difficulty = "easy" | "medium" | "hard" | "epic";
export type QuestFrequency = "daily" | "weekly" | "special" | "once";
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Objective = {
  id: string;
  text: string;
  completed: boolean;
};

export type Quest = {
  id: string;
  title: string;           // e.g. "Operation Fresh Kitchen"
  flavourText: string;     // narrative description
  type: QuestType;
  difficulty: Difficulty;
  frequency: QuestFrequency;
  objectives: Objective[];
  reminderTime: string;    // "HH:MM"
  weekdays?: Weekday[];
  notifyEnabled: boolean;
  createdAt: number;
  areaId: string;          // which map area this belongs to
  xpReward: number;        // base XP
  coinReward: number;      // coins
  mysteryBoxChance: number; // 0-100 %
};

export type QuestRun = {
  id: string;
  questId: string;
  date: string;            // YYYY-MM-DD
  startedAt: number;
  completedAt?: number;
  objectivesDone: string[]; // objective ids ticked
  xpEarned: number;
  coinsEarned: number;
  mysteryBoxEarned: boolean;
};

export type MapArea = {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlockRequirement: number; // total quests completed to unlock
  unlocked: boolean;
  position: { x: number; y: number }; // percent on map
};

export type MysteryBox = {
  id: string;
  earnedAt: number;
  opened: boolean;
  reward?: BoxReward;
};

export type BoxReward = {
  type: "xp" | "coins" | "badge" | "title";
  value: string | number;
  label: string;
};

export type Badge = {
  id: string;
  name: string;
  icon: string;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary";
};

export type PlayerTitle = {
  id: string;
  label: string;
};

export type AppState = {
  quests: Quest[];
  runs: QuestRun[];
  totalXP: number;
  coins: number;
  streakDays: number;
  longestStreak: number;
  lastActiveDate: string;
  earnedBadgeIds: string[];
  mysteryBoxes: MysteryBox[];
  equippedTitle: string;
  unlockedTitles: string[];
  areas: MapArea[];
};
