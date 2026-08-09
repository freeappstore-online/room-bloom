import type { MapArea, Badge, QuestType, Difficulty } from "./types";

// ─── Quest type meta ──────────────────────────────────────────────────────────

export const TYPE_META: Record<QuestType, { label: string; icon: string; color: string; bg: string }> = {
  cleaning:    { label: "Cleaning",     icon: "🧹", color: "#6366F1", bg: "#EEF2FF" },
  garden:      { label: "Garden",       icon: "🌱", color: "#16A34A", bg: "#DCFCE7" },
  kitchen:     { label: "Kitchen",      icon: "🍳", color: "#D97706", bg: "#FEF3C7" },
  shopping:    { label: "Shopping",     icon: "🛒", color: "#0891B2", bg: "#CFFAFE" },
  laundry:     { label: "Laundry",      icon: "🧺", color: "#DB2777", bg: "#FCE7F3" },
  maintenance: { label: "Maintenance",  icon: "🔧", color: "#7C3AED", bg: "#EDE9FE" },
  pet:         { label: "Pet Care",     icon: "🐾", color: "#EA580C", bg: "#FFEDD5" },
};

// ─── Difficulty meta ──────────────────────────────────────────────────────────

export const DIFF_META: Record<Difficulty, { label: string; stars: number; color: string; xpMult: number; coinMult: number }> = {
  easy:   { label: "Easy",   stars: 1, color: "#16A34A", xpMult: 1,   coinMult: 1   },
  medium: { label: "Medium", stars: 2, color: "#D97706", xpMult: 1.5, coinMult: 1.5 },
  hard:   { label: "Hard",   stars: 3, color: "#DC2626", xpMult: 2,   coinMult: 2   },
  epic:   { label: "Epic",   stars: 4, color: "#7C3AED", xpMult: 3,   coinMult: 3   },
};

// ─── XP level thresholds ──────────────────────────────────────────────────────

export const XP_LEVELS = [
  { level: 1,  xp: 0,    title: "Rookie",        icon: "🌱" },
  { level: 2,  xp: 100,  title: "Apprentice",    icon: "🔑" },
  { level: 3,  xp: 250,  title: "Helper",        icon: "🧹" },
  { level: 4,  xp: 500,  title: "Homekeeper",    icon: "🏡" },
  { level: 5,  xp: 900,  title: "Pro Cleaner",   icon: "⭐" },
  { level: 6,  xp: 1400, title: "House Wizard",  icon: "🧙" },
  { level: 7,  xp: 2000, title: "Domain Lord",   icon: "👑" },
  { level: 8,  xp: 3000, title: "Home Legend",   icon: "🏆" },
];

export function getLevel(xp: number) {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].xp) return XP_LEVELS[i];
  }
  return XP_LEVELS[0];
}

export function getNextLevel(xp: number) {
  const cur = getLevel(xp);
  const idx = XP_LEVELS.findIndex((l) => l.level === cur.level);
  return XP_LEVELS[idx + 1] ?? null;
}

// ─── Map Areas ────────────────────────────────────────────────────────────────

export const DEFAULT_AREAS: MapArea[] = [
  { id: "kitchen",   name: "The Kitchen",      icon: "🍳", description: "Where meals are made and messes are born.", unlockRequirement: 0,  unlocked: true,  position: { x: 20, y: 30 } },
  { id: "living",    name: "Living Room",       icon: "🛋️", description: "The heart of the home.",                   unlockRequirement: 3,  unlocked: false, position: { x: 50, y: 20 } },
  { id: "bedroom",   name: "Bedroom Realm",     icon: "🛏️", description: "Your sanctuary of rest.",                  unlockRequirement: 6,  unlocked: false, position: { x: 78, y: 30 } },
  { id: "bathroom",  name: "The Bathroom Lair", icon: "🚿", description: "Tame the porcelain beast.",                unlockRequirement: 10, unlocked: false, position: { x: 78, y: 65 } },
  { id: "garden",    name: "The Wild Garden",   icon: "🌿", description: "Nature reclaims what you abandon.",        unlockRequirement: 15, unlocked: false, position: { x: 50, y: 75 } },
  { id: "garage",    name: "The Garage Dungeon",icon: "🔧", description: "A realm of mystery and lost tools.",       unlockRequirement: 22, unlocked: false, position: { x: 20, y: 65 } },
];

// ─── Badges ───────────────────────────────────────────────────────────────────

export const ALL_BADGES: Badge[] = [
  // Common
  { id: "first_blood",  name: "First Mission",    icon: "🌱", description: "Complete your first quest",              rarity: "common"    },
  { id: "five_done",    name: "On a Roll",         icon: "🎯", description: "Complete 5 quests total",               rarity: "common"    },
  { id: "daily_hero",   name: "Daily Hero",        icon: "📅", description: "Complete all daily quests in one day",  rarity: "common"    },
  { id: "box_opener",   name: "Box Opener",        icon: "📦", description: "Open your first mystery box",           rarity: "common"    },
  { id: "planner",      name: "Planner",           icon: "📋", description: "Create 5 quests",                       rarity: "common"    },
  // Rare
  { id: "streak_3",     name: "Hat Trick",         icon: "🔥", description: "3-day streak",                          rarity: "rare"      },
  { id: "streak_7",     name: "Week Warrior",      icon: "🗓️", description: "7-day streak",                          rarity: "rare"      },
  { id: "twenty_done",  name: "Dedicated",         icon: "💪", description: "Complete 20 quests total",              rarity: "rare"      },
  { id: "explorer",     name: "Explorer",          icon: "🗺️", description: "Unlock 3 map areas",                    rarity: "rare"      },
  { id: "all_types",    name: "All-Rounder",       icon: "🌈", description: "Complete a quest of every type",        rarity: "rare"      },
  // Epic
  { id: "streak_30",    name: "Monthly Master",    icon: "🌙", description: "30-day streak",                         rarity: "epic"      },
  { id: "fifty_done",   name: "Centurion",         icon: "⚔️", description: "Complete 50 quests total",              rarity: "epic"      },
  { id: "full_map",     name: "Cartographer",      icon: "🗺️", description: "Unlock all map areas",                  rarity: "epic"      },
  { id: "epic_quest",   name: "Epic Slayer",       icon: "🐉", description: "Complete an Epic difficulty quest",     rarity: "epic"      },
  // Legendary
  { id: "legend_1000",  name: "Legend",            icon: "🏆", description: "Reach 1000 XP",                        rarity: "legendary" },
  { id: "legend_3000",  name: "Grand Master",      icon: "👑", description: "Reach 3000 XP",                        rarity: "legendary" },
];

export const BADGE_RARITY_COLOR: Record<string, string> = {
  common:    "#6B7280",
  rare:      "#3B82F6",
  epic:      "#8B5CF6",
  legendary: "#F59E0B",
};

// ─── Mystery box reward pool ──────────────────────────────────────────────────

export const BOX_REWARDS = [
  { type: "xp"    as const, value: 50,  label: "Bonus 50 XP!" },
  { type: "xp"    as const, value: 100, label: "Bonus 100 XP!" },
  { type: "xp"    as const, value: 25,  label: "Bonus 25 XP!" },
  { type: "coins" as const, value: 30,  label: "30 Gold Coins!" },
  { type: "coins" as const, value: 60,  label: "60 Gold Coins!" },
  { type: "coins" as const, value: 15,  label: "15 Gold Coins!" },
  { type: "title" as const, value: "Treasure Hunter", label: "Title: Treasure Hunter!" },
  { type: "title" as const, value: "Lucky One",       label: "Title: Lucky One!" },
];

export function rollBoxReward() {
  return BOX_REWARDS[Math.floor(Math.random() * BOX_REWARDS.length)];
}

// ─── Confetti colours ─────────────────────────────────────────────────────────
export const CONFETTI_COLORS = [
  "#F59E0B","#3B82F6","#10B981","#EC4899","#8B5CF6","#EF4444","#14B8A6","#F97316"
];

// ─── Weekday labels ───────────────────────────────────────────────────────────
export const WEEKDAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
