import type { AppState, MapArea } from "./types";
import { DEFAULT_AREAS } from "./data";

const KEY = "homequest_v3";

export const DEFAULT_STATE: AppState = {
  quests: [],
  runs: [],
  totalXP: 0,
  coins: 0,
  streakDays: 0,
  longestStreak: 0,
  lastActiveDate: "",
  earnedBadgeIds: [],
  mysteryBoxes: [],
  equippedTitle: "Rookie",
  unlockedTitles: ["Rookie"],
  areas: DEFAULT_AREAS,
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      // Merge areas so new areas from DEFAULT_AREAS always appear
      const mergedAreas: MapArea[] = DEFAULT_AREAS.map((da) => {
        const saved = parsed.areas?.find((a) => a.id === da.id);
        return saved ? { ...da, unlocked: saved.unlocked } : da;
      });
      return { ...DEFAULT_STATE, ...parsed, areas: mergedAreas };
    }
  } catch {}
  return { ...DEFAULT_STATE };
}

export function saveState(s: AppState) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}
