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

/** YYYY-MM-DD for the local calendar date (toISOString() would give the UTC date). */
export function dateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayStr() {
  return dateStr(new Date());
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}
