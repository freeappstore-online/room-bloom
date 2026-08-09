import { useState, useEffect, useRef, useCallback } from "react";
import { Shell } from "./components/Shell";
import { QuestCard } from "./components/QuestCard";
import { QuestDetail } from "./components/QuestDetail";
import { QuestForm } from "./components/QuestForm";
import { QuestMap } from "./components/QuestMap";
import { CompletionScreen } from "./components/CompletionScreen";
import type { Quest, QuestRun, AppState, MysteryBox } from "./types";
import { ALL_BADGES, BADGE_RARITY_COLOR, getLevel, getNextLevel, rollBoxReward } from "./data";
import { loadState, saveState, todayStr, uid, DEFAULT_STATE } from "./store";

// ─── Types ────────────────────────────────────────────────────────────────────

type Page = "today" | "map" | "quests" | "badges" | "inventory" | "add";
type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const NAV: { id: Page; label: string; icon: string }[] = [
  { id: "today",     label: "Today",     icon: "📅" },
  { id: "map",       label: "Quest Map", icon: "🗺️" },
  { id: "quests",    label: "All Quests",icon: "📋" },
  { id: "badges",    label: "Badges",    icon: "🏅" },
  { id: "inventory", label: "Inventory", icon: "📦" },
  { id: "add",       label: "New Quest", icon: "⚔️" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isDueToday(quest: Quest): boolean {
  const now = new Date();
  const day = now.getDay() as Weekday;
  switch (quest.frequency) {
    case "daily":   return true;
    case "once":    return true;
    case "special": return true;
    case "weekly":  return quest.weekdays?.includes(day) ?? false;
    default:        return false;
  }
}

function getOrCreateRun(state: AppState, quest: Quest): QuestRun {
  const date = todayStr();
  const existing = state.runs.find((r) => r.questId === quest.id && r.date === date);
  if (existing) return existing;
  return {
    id: uid(),
    questId: quest.id,
    date,
    startedAt: Date.now(),
    objectivesDone: [],
    xpEarned: 0,
    coinsEarned: 0,
    mysteryBoxEarned: false,
  };
}

async function requestNotifPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  return await Notification.requestPermission();
}

function scheduleNotification(quest: Quest) {
  if (Notification.permission !== "granted" || !quest.notifyEnabled) return;
  const now = new Date();
  const [h, m] = quest.reminderTime.split(":").map(Number);
  const target = new Date(); target.setHours(h, m, 0, 0);
  let diff = target.getTime() - now.getTime();
  if (diff < 0) diff += 86400000;
  if (diff > 86400000) return;
  window.setTimeout(() => {
    new Notification(`⚔️ Quest Awaits!`, {
      body: `"${quest.title}" — your mission begins now!`,
    });
  }, diff);
}

// ─── Badge checker ────────────────────────────────────────────────────────────

function checkBadges(state: AppState): string[] {
  const totalDone = state.runs.filter((r) => r.completedAt).length;
  const typesCompleted = new Set(
    state.runs
      .filter((r) => r.completedAt)
      .map((r) => state.quests.find((q) => q.id === r.questId)?.type)
      .filter(Boolean)
  );
  const unlockedAreas = state.areas.filter((a) => a.unlocked).length;
  const daysWithCompletion = new Set(
    state.runs.filter((r) => r.completedAt).map((r) => r.date)
  ).size;

  const conditions: Record<string, boolean> = {
    first_blood:  totalDone >= 1,
    five_done:    totalDone >= 5,
    twenty_done:  totalDone >= 20,
    fifty_done:   totalDone >= 50,
    streak_3:     state.longestStreak >= 3,
    streak_7:     state.longestStreak >= 7,
    streak_30:    state.longestStreak >= 30,
    planner:      state.quests.length >= 5,
    explorer:     unlockedAreas >= 3,
    full_map:     unlockedAreas >= state.areas.length,
    all_types:    typesCompleted.size >= 7,
    epic_quest:   state.runs.some((r) => r.completedAt && state.quests.find((q) => q.id === r.questId)?.difficulty === "epic"),
    legend_1000:  state.totalXP >= 1000,
    legend_3000:  state.totalXP >= 3000,
    box_opener:   state.mysteryBoxes.some((b) => b.opened),
    daily_hero:   (() => {
      const today = todayStr();
      const dueToday = state.quests.filter(isDueToday);
      return dueToday.length > 0 && dueToday.every((q) =>
        state.runs.some((r) => r.questId === q.id && r.date === today && r.completedAt)
      );
    })(),
  };

  return ALL_BADGES
    .filter((b) => !state.earnedBadgeIds.includes(b.id) && conditions[b.id])
    .map((b) => b.id);
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [page, setPage] = useState<Page>("today");
  const [activeQuestId, setActiveQuestId] = useState<string | null>(null);
  const [editQuestId, setEditQuestId] = useState<string | null>(null);
  const [completionData, setCompletionData] = useState<{
    quest: Quest; run: QuestRun; newBadges: { name: string; icon: string }[]; gotBox: boolean;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(
    "Notification" in window ? Notification.permission : "denied"
  );
  const [filterArea, setFilterArea] = useState<string | null>(null);
  const notifRef = useRef<number[]>([]);

  // Persist
  useEffect(() => { saveState(state); }, [state]);

  // Streak update
  useEffect(() => {
    const t = todayStr();
    setState((prev) => {
      if (prev.lastActiveDate === t) return prev;
      const yest = new Date(); yest.setDate(yest.getDate() - 1);
      const yStr = yest.toISOString().slice(0, 10);
      const newStreak = prev.lastActiveDate === yStr ? prev.streakDays : 0;
      return { ...prev, streakDays: newStreak };
    });
  }, []);

  // Schedule notifications
  useEffect(() => {
    notifRef.current.forEach(clearTimeout);
    notifRef.current = [];
    if (notifPerm === "granted") {
      state.quests.filter(isDueToday).forEach(scheduleNotification);
    }
  }, [state.quests, notifPerm]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ─ Toggle objective ──────────────────────────────────────────────────────────
  const handleToggleObjective = useCallback((questId: string, objId: string) => {
    const date = todayStr();
    setState((prev) => {
      const quest = prev.quests.find((q) => q.id === questId);
      if (!quest) return prev;

      const existingRun = prev.runs.find((r) => r.questId === questId && r.date === date);
      const run: QuestRun = existingRun
        ? { ...existingRun }
        : { id: uid(), questId, date, startedAt: Date.now(), objectivesDone: [], xpEarned: 0, coinsEarned: 0, mysteryBoxEarned: false };

      const alreadyDone = run.objectivesDone.includes(objId);
      run.objectivesDone = alreadyDone
        ? run.objectivesDone.filter((id) => id !== objId)
        : [...run.objectivesDone, objId];

      // Check if all objectives now complete
      const allDone = quest.objectives.every((o) => run.objectivesDone.includes(o.id));

      let newState = { ...prev };

      if (allDone && !run.completedAt) {
        run.completedAt = Date.now();
        run.xpEarned = quest.xpReward;
        run.coinsEarned = quest.coinReward;
        run.mysteryBoxEarned = Math.random() * 100 < quest.mysteryBoxChance;

        // XP + coins
        newState.totalXP = prev.totalXP + run.xpEarned;
        newState.coins = prev.coins + run.coinsEarned;

        // Streak
        const yest = new Date(); yest.setDate(yest.getDate() - 1);
        const yStr = yest.toISOString().slice(0, 10);
        const newStreak = prev.lastActiveDate === date
          ? prev.streakDays
          : prev.lastActiveDate === yStr
          ? prev.streakDays + 1
          : 1;
        newState.lastActiveDate = date;
        newState.streakDays = newStreak;
        newState.longestStreak = Math.max(prev.longestStreak, newStreak);

        // Mystery box
        const newBoxes = [...prev.mysteryBoxes];
        if (run.mysteryBoxEarned) {
          newBoxes.push({ id: uid(), earnedAt: Date.now(), opened: false });
        }
        newState.mysteryBoxes = newBoxes;

        // Area unlock check
        const totalDone = prev.runs.filter((r) => r.completedAt).length + 1;
        const updatedAreas = prev.areas.map((a) =>
          !a.unlocked && a.unlockRequirement <= totalDone ? { ...a, unlocked: true } : a
        );
        const newlyUnlocked = updatedAreas.filter(
          (a, i) => a.unlocked && !prev.areas[i].unlocked
        );
        if (newlyUnlocked.length > 0) {
          setTimeout(() => showToast(`🗺️ New area unlocked: ${newlyUnlocked.map((a) => a.name).join(", ")}!`), 1500);
        }
        newState.areas = updatedAreas;

        // Badges
        const tempState = { ...newState };
        const existingRuns = prev.runs.filter((r) => !(r.questId === questId && r.date === date));
        tempState.runs = [...existingRuns, run];
        const newBadgeIds = checkBadges(tempState);
        newState.earnedBadgeIds = [...prev.earnedBadgeIds, ...newBadgeIds];
        const newBadges = ALL_BADGES.filter((b) => newBadgeIds.includes(b.id));

        // Trigger completion screen
        setTimeout(() => {
          setCompletionData({ quest, run: { ...run }, newBadges, gotBox: run.mysteryBoxEarned });
        }, 300);

        // Remove "once" quests after completion
        if (quest.frequency === "once") {
          setTimeout(() => {
            setState((s) => ({ ...s, quests: s.quests.filter((q) => q.id !== questId) }));
          }, 5000);
        }
      } else if (!allDone && run.completedAt) {
        // Un-completing: refund
        newState.totalXP = Math.max(0, prev.totalXP - run.xpEarned);
        newState.coins = Math.max(0, prev.coins - run.coinsEarned);
        run.completedAt = undefined;
        run.xpEarned = 0;
        run.coinsEarned = 0;
      }

      const otherRuns = prev.runs.filter((r) => !(r.questId === questId && r.date === date));
      newState.runs = [...otherRuns, run];
      return newState;
    });
  }, []);

  // ─ Save quest ────────────────────────────────────────────────────────────────
  const handleSaveQuest = useCallback((quest: Quest) => {
    if (quest.notifyEnabled && notifPerm !== "granted") {
      requestNotifPermission().then((p) => {
        setNotifPerm(p);
        if (p !== "granted") showToast("⚠️ Allow notifications in browser settings");
      });
    }
    setState((prev) => ({
      ...prev,
      quests: editQuestId
        ? prev.quests.map((q) => (q.id === quest.id ? quest : q))
        : [...prev.quests, quest],
    }));
    showToast(editQuestId ? "✏️ Quest updated!" : `⚔️ Quest forged: "${quest.title}"!`);
    setEditQuestId(null);
    setPage("today");
  }, [editQuestId, notifPerm]);

  // ─ Delete quest ──────────────────────────────────────────────────────────────
  const handleDeleteQuest = useCallback((questId: string) => {
    setState((prev) => ({
      ...prev,
      quests: prev.quests.filter((q) => q.id !== questId),
      runs: prev.runs.filter((r) => r.questId !== questId),
    }));
    setActiveQuestId(null);
    showToast("🗑️ Quest deleted");
  }, []);

  // ─ Open mystery box ──────────────────────────────────────────────────────────
  const handleOpenBox = useCallback((boxId: string) => {
    const reward = rollBoxReward();
    setState((prev) => {
      const newState = { ...prev };
      newState.mysteryBoxes = prev.mysteryBoxes.map((b) =>
        b.id === boxId ? { ...b, opened: true, reward } : b
      );
      if (reward.type === "xp")    newState.totalXP = prev.totalXP + (reward.value as number);
      if (reward.type === "coins") newState.coins = prev.coins + (reward.value as number);
      if (reward.type === "title") {
        const t = reward.value as string;
        if (!prev.unlockedTitles.includes(t)) {
          newState.unlockedTitles = [...prev.unlockedTitles, t];
          newState.equippedTitle = t;
        }
      }
      // Badge check for first box
      if (!prev.earnedBadgeIds.includes("box_opener")) {
        newState.earnedBadgeIds = [...prev.earnedBadgeIds, "box_opener"];
        setTimeout(() => showToast("🏅 Badge: Box Opener!"), 600);
      }
      return newState;
    });
    showToast(`📦 Box opened: ${reward.label}`);
  }, []);

  // ─ Derived ───────────────────────────────────────────────────────────────────
  const today = todayStr();
  const todayQuests = state.quests.filter(isDueToday);
  const todayRuns = todayQuests.map((q) => ({ quest: q, run: getOrCreateRun(state, q) }));
  const doneToday = todayRuns.filter((t) => t.run.completedAt);
  const pendingToday = todayRuns.filter((t) => !t.run.completedAt);
  const level = getLevel(state.totalXP);
  const nextLevel = getNextLevel(state.totalXP);
  const xpInLevel = nextLevel ? state.totalXP - level.xp : 0;
  const xpNeeded = nextLevel ? nextLevel.xp - level.xp : 1;
  const levelPct = nextLevel ? Math.min(100, (xpInLevel / xpNeeded) * 100) : 100;
  const totalCompleted = state.runs.filter((r) => r.completedAt).length;
  const unopenedBoxes = state.mysteryBoxes.filter((b) => !b.opened).length;
  const earnedBadges = ALL_BADGES.filter((b) => state.earnedBadgeIds.includes(b.id));
  const lockedBadges = ALL_BADGES.filter((b) => !state.earnedBadgeIds.includes(b.id));

  const activeQuest = activeQuestId ? state.quests.find((q) => q.id === activeQuestId) : null;
  const activeRun = activeQuest ? getOrCreateRun(state, activeQuest) : null;

  const editQuest = editQuestId ? state.quests.find((q) => q.id === editQuestId) : undefined;

  const filteredAllQuests = filterArea
    ? state.quests.filter((q) => q.areaId === filterArea)
    : state.quests;

  // ─ Sidebar ───────────────────────────────────────────────────────────────────
  const sidebar = (
    <nav className="flex-1 px-3 space-y-0.5">
      {NAV.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            setPage(item.id);
            if (item.id === "add") setEditQuestId(null);
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{
            background: page === item.id ? "var(--accent)" : "transparent",
            color: page === item.id ? "#fff" : "var(--ink)",
          }}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
          {item.id === "inventory" && unopenedBoxes > 0 && (
            <span className="ml-auto w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
              style={{ background: "#EF4444", color: "#fff" }}>{unopenedBoxes}</span>
          )}
        </button>
      ))}

      {/* Player card */}
      <div className="pt-4 space-y-2">
        <div className="rounded-xl p-3" style={{ background: "var(--paper)", border: "1px solid var(--line)" }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{level.icon}</span>
            <div>
              <div className="text-xs font-bold">{level.title}</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>Lv.{level.level}</div>
            </div>
          </div>
          <div className="text-sm font-bold">{state.totalXP.toLocaleString()} XP</div>
          {nextLevel && (
            <>
              <div className="h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: "var(--line)" }}>
                <div className="h-full rounded-full" style={{ width: `${levelPct}%`, background: "var(--accent)" }} />
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                {nextLevel.xp - state.totalXP} XP to Lv.{nextLevel.level}
              </div>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <div className="flex-1 rounded-xl p-2 text-center" style={{ background: "var(--paper)", border: "1px solid var(--line)" }}>
            <div className="font-bold">🔥 {state.streakDays}</div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>Streak</div>
          </div>
          <div className="flex-1 rounded-xl p-2 text-center" style={{ background: "var(--paper)", border: "1px solid var(--line)" }}>
            <div className="font-bold">🪙 {state.coins}</div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>Coins</div>
          </div>
        </div>
        {notifPerm !== "granted" && (
          <button onClick={() => requestNotifPermission().then(setNotifPerm)}
            className="w-full text-xs px-3 py-2 rounded-xl font-semibold"
            style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}>
            🔔 Enable reminders
          </button>
        )}
      </div>
    </nav>
  );

  // ─ Render ─────────────────────────────────────────────────────────────────────
  return (
    <Shell sidebar={sidebar}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold max-w-xs"
          style={{ background: "var(--ink)", color: "var(--paper)" }}>
          {toast}
        </div>
      )}

      {/* Mobile header */}
      <div className="flex md:hidden items-center justify-between mb-4">
        <h1 className="text-xl font-black" style={{ fontFamily: "Fraunces, serif" }}>
          {NAV.find((n) => n.id === page)?.icon} {NAV.find((n) => n.id === page)?.label}
        </h1>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-bold">🔥{state.streakDays}</span>
          <span className="px-2 py-1 rounded-xl font-bold" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
            {level.icon} Lv.{level.level}
          </span>
          {unopenedBoxes > 0 && (
            <button onClick={() => setPage("inventory")}
              className="px-2 py-1 rounded-xl font-bold text-white"
              style={{ background: "#EF4444" }}>
              📦{unopenedBoxes}
            </button>
          )}
        </div>
      </div>

      {/* ══ TODAY ═════════════════════════════════════════════════════════════ */}
      {page === "today" && (
        <div className="space-y-5">
          <div className="hidden md:flex items-center justify-between">
            <h1 className="text-2xl font-black" style={{ fontFamily: "Fraunces, serif" }}>📅 Today's Missions</h1>
            <span className="text-sm" style={{ color: "var(--muted)" }}>
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </span>
          </div>

          {/* Player XP bar */}
          <div className="rounded-2xl p-4" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="text-3xl">{level.icon}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold">{level.title} · Lv.{level.level}</span>
                  <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>{state.totalXP} XP</span>
                </div>
                <div className="h-2 rounded-full mt-1 overflow-hidden" style={{ background: "var(--line)" }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${levelPct}%`, background: "linear-gradient(90deg,#3B82F6,#8B5CF6)" }} />
                </div>
                {nextLevel && (
                  <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                    {nextLevel.xp - state.totalXP} XP to {nextLevel.title}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-sm">🪙 {state.coins}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>coins</div>
              </div>
            </div>

            {/* Daily progress */}
            {todayQuests.length > 0 && (
              <>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-semibold">{doneToday.length}/{todayQuests.length} missions done</span>
                  <span style={{ color: "#F59E0B" }}>+{doneToday.reduce((s, t) => s + t.run.xpEarned, 0)} XP today</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(doneToday.length / todayQuests.length) * 100}%`,
                      background: "linear-gradient(90deg,#10B981,#16A34A)",
                    }} />
                </div>
                {doneToday.length === todayQuests.length && todayQuests.length > 0 && (
                  <div className="text-center mt-2 text-sm font-bold" style={{ color: "var(--success)" }}>
                    🎉 All missions complete! You're a legend!
                  </div>
                )}
              </>
            )}
          </div>

          {/* Pending */}
          {pendingToday.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                Active Missions ({pendingToday.length})
              </h2>
              {pendingToday.map(({ quest, run }) => (
                <QuestCard key={quest.id} quest={quest} run={run}
                  onOpen={() => setActiveQuestId(quest.id)} />
              ))}
            </div>
          )}

          {/* Done */}
          {doneToday.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                Completed ({doneToday.length})
              </h2>
              {doneToday.map(({ quest, run }) => (
                <QuestCard key={quest.id} quest={quest} run={run}
                  onOpen={() => setActiveQuestId(quest.id)} />
              ))}
            </div>
          )}

          {/* Empty */}
          {todayQuests.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <div className="text-6xl">🏠</div>
              <div className="font-black text-xl" style={{ fontFamily: "Fraunces, serif" }}>No quests forged yet!</div>
              <div className="text-sm" style={{ color: "var(--muted)" }}>
                Create your first household quest and turn chores into adventures.
              </div>
              <button onClick={() => { setEditQuestId(null); setPage("add"); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white"
                style={{ background: "var(--accent)" }}>
                ⚔️ Forge First Quest
              </button>
            </div>
          )}

          {/* Notif nudge */}
          {notifPerm !== "granted" && state.quests.length > 0 && (
            <button onClick={() => requestNotifPermission().then(setNotifPerm)}
              className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-left"
              style={{ background: "#FFFBEB", border: "1px dashed #FCD34D", color: "#92400E" }}>
              <span className="text-xl">🔔</span>
              <div>
                <div className="font-bold">Enable quest reminders</div>
                <div className="text-xs font-normal">Get notified at your set reminder times</div>
              </div>
            </button>
          )}
        </div>
      )}

      {/* ══ QUEST MAP ═════════════════════════════════════════════════════════ */}
      {page === "map" && (
        <QuestMap
          areas={state.areas}
          quests={state.quests}
          runs={state.runs}
          totalCompleted={totalCompleted}
          onAreaClick={(areaId) => {
            setFilterArea(areaId);
            setPage("quests");
          }}
        />
      )}

      {/* ══ ALL QUESTS ════════════════════════════════════════════════════════ */}
      {page === "quests" && (
        <div className="space-y-4">
          <div className="hidden md:flex items-center justify-between">
            <h1 className="text-2xl font-black" style={{ fontFamily: "Fraunces, serif" }}>📋 All Quests</h1>
            <button onClick={() => { setEditQuestId(null); setPage("add"); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: "var(--accent)" }}>
              ⚔️ New Quest
            </button>
          </div>

          {/* Area filter */}
          {state.areas.filter((a) => a.unlocked).length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setFilterArea(null)}
                className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: filterArea === null ? "var(--accent)" : "var(--panel)",
                  color: filterArea === null ? "#fff" : "var(--ink)",
                  border: "1px solid var(--line)",
                }}>
                All Areas
              </button>
              {state.areas.filter((a) => a.unlocked).map((a) => (
                <button key={a.id}
                  onClick={() => setFilterArea(a.id === filterArea ? null : a.id)}
                  className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: filterArea === a.id ? "var(--accent)" : "var(--panel)",
                    color: filterArea === a.id ? "#fff" : "var(--ink)",
                    border: "1px solid var(--line)",
                  }}>
                  {a.icon} {a.name}
                </button>
              ))}
            </div>
          )}

          {filteredAllQuests.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="text-4xl">📋</div>
              <div className="font-bold" style={{ fontFamily: "Fraunces, serif" }}>
                {filterArea ? "No quests in this area" : "No quests yet"}
              </div>
              <button onClick={() => { setEditQuestId(null); setPage("add"); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white"
                style={{ background: "var(--accent)" }}>
                ⚔️ Create Quest
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAllQuests.map((quest) => {
                const run = state.runs.find((r) => r.questId === quest.id && r.date === today);
                return (
                  <QuestCard key={quest.id} quest={quest} run={run}
                    onOpen={() => setActiveQuestId(quest.id)} />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ BADGES ════════════════════════════════════════════════════════════ */}
      {page === "badges" && (
        <div className="space-y-5">
          <div className="hidden md:flex items-center justify-between">
            <h1 className="text-2xl font-black" style={{ fontFamily: "Fraunces, serif" }}>🏅 Badges</h1>
            <span className="text-sm" style={{ color: "var(--muted)" }}>{earnedBadges.length}/{ALL_BADGES.length} earned</span>
          </div>

          {/* Title selector */}
          {state.unlockedTitles.length > 1 && (
            <div className="rounded-2xl p-4" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>Equipped Title</div>
              <div className="flex gap-2 flex-wrap">
                {state.unlockedTitles.map((t) => (
                  <button key={t}
                    onClick={() => setState((p) => ({ ...p, equippedTitle: t }))}
                    className="px-3 py-1.5 rounded-xl text-sm font-bold transition-all"
                    style={{
                      background: state.equippedTitle === t ? "var(--accent)" : "var(--paper)",
                      color: state.equippedTitle === t ? "#fff" : "var(--ink)",
                      border: "1px solid var(--line)",
                    }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {earnedBadges.length > 0 && (
            <>
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Earned</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {earnedBadges.map((b) => (
                  <div key={b.id} className="rounded-2xl p-4 flex flex-col items-center gap-2 text-center"
                    style={{ background: "var(--panel)", border: `2px solid ${BADGE_RARITY_COLOR[b.rarity]}` }}>
                    <span className="text-4xl">{b.icon}</span>
                    <div className="font-bold text-sm">{b.name}</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>{b.description}</div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold capitalize"
                      style={{ background: `${BADGE_RARITY_COLOR[b.rarity]}22`, color: BADGE_RARITY_COLOR[b.rarity] }}>
                      {b.rarity}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {lockedBadges.length > 0 && (
            <>
              <h2 className="text-xs font-bold uppercase tracking-wider mt-2" style={{ color: "var(--muted)" }}>Locked</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {lockedBadges.map((b) => (
                  <div key={b.id} className="rounded-2xl p-4 flex flex-col items-center gap-2 text-center"
                    style={{ background: "var(--panel)", border: "1px solid var(--line)", opacity: 0.5 }}>
                    <span className="text-4xl">{b.icon}</span>
                    <div className="font-bold text-sm">{b.name}</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>{b.description}</div>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "var(--line)", color: "var(--muted)" }}>🔒 {b.rarity}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══ INVENTORY ═════════════════════════════════════════════════════════ */}
      {page === "inventory" && (
        <div className="space-y-5">
          <div className="hidden md:flex items-center justify-between">
            <h1 className="text-2xl font-black" style={{ fontFamily: "Fraunces, serif" }}>📦 Inventory</h1>
            <div className="flex items-center gap-3 text-sm font-bold">
              <span>⚡ {state.totalXP} XP</span>
              <span>🪙 {state.coins} coins</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: "⚡", label: "Total XP",   value: state.totalXP.toLocaleString() },
              { icon: "🪙", label: "Coins",       value: state.coins.toLocaleString() },
              { icon: "⚔️", label: "Quests Done", value: totalCompleted },
              { icon: "🔥", label: "Best Streak", value: `${state.longestStreak}d` },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl p-4 text-center"
                style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
                <div className="text-3xl mb-1">{s.icon}</div>
                <div className="font-black text-lg">{s.value}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Mystery boxes */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
              Mystery Boxes {unopenedBoxes > 0 && <span className="text-red-500">· {unopenedBoxes} unopened</span>}
            </h2>

            {state.mysteryBoxes.length === 0 ? (
              <div className="text-center py-8 rounded-2xl" style={{ background: "var(--panel)", border: "1px dashed var(--line)" }}>
                <div className="text-4xl mb-2">📦</div>
                <div className="text-sm" style={{ color: "var(--muted)" }}>
                  Complete quests to earn mystery boxes!
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[...state.mysteryBoxes].reverse().map((box) => (
                  <div key={box.id} className="rounded-2xl p-4 flex flex-col items-center gap-2 text-center"
                    style={{
                      background: box.opened ? "var(--panel)" : "#FFFBEB",
                      border: `1.5px solid ${box.opened ? "var(--line)" : "#FCD34D"}`,
                    }}>
                    <span className="text-4xl">{box.opened ? "📭" : "📦"}</span>
                    {box.opened ? (
                      <>
                        <div className="font-bold text-sm" style={{ color: "var(--muted)" }}>Opened</div>
                        {box.reward && (
                          <div className="text-xs px-2 py-1 rounded-xl font-semibold"
                            style={{ background: "var(--paper)", border: "1px solid var(--line)" }}>
                            {box.reward.label}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="font-bold text-sm">Mystery Box</div>
                        <div className="text-xs" style={{ color: "var(--muted)" }}>
                          {new Date(box.earnedAt).toLocaleDateString()}
                        </div>
                        <button
                          onClick={() => handleOpenBox(box.id)}
                          className="w-full py-2 rounded-xl text-sm font-bold text-white"
                          style={{ background: "#F59E0B" }}>
                          Open! 🎁
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Danger zone */}
          <div className="pt-4">
            <button
              onClick={() => {
                if (confirm("Reset ALL progress? This cannot be undone.")) {
                  setState(DEFAULT_STATE);
                  showToast("🗑️ All data cleared");
                }
              }}
              className="text-xs px-3 py-1.5 rounded-xl"
              style={{ border: "1px solid var(--line)", color: "var(--error)" }}>
              🗑️ Reset all data
            </button>
          </div>
        </div>
      )}

      {/* ══ ADD / EDIT QUEST ══════════════════════════════════════════════════ */}
      {page === "add" && (
        <QuestForm
          editQuest={editQuest}
          areas={state.areas}
          onSave={handleSaveQuest}
          onCancel={() => setPage(editQuestId ? "quests" : "today")}
        />
      )}

      {/* ══ QUEST DETAIL MODAL ════════════════════════════════════════════════ */}
      {activeQuest && activeRun && (
        <QuestDetail
          quest={activeQuest}
          run={activeRun}
          onToggleObjective={(objId) => handleToggleObjective(activeQuest.id, objId)}
          onClose={() => setActiveQuestId(null)}
          onEdit={() => {
            setEditQuestId(activeQuest.id);
            setActiveQuestId(null);
            setPage("add");
          }}
          onDelete={() => handleDeleteQuest(activeQuest.id)}
        />
      )}

      {/* ══ COMPLETION SCREEN ═════════════════════════════════════════════════ */}
      {completionData && (
        <CompletionScreen
          quest={completionData.quest}
          run={completionData.run}
          newBadges={completionData.newBadges}
          gotBox={completionData.gotBox}
          onContinue={() => setCompletionData(null)}
        />
      )}

      {/* Mobile bottom dock */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around h-16 border-t z-30"
        style={{ background: "var(--dock)", borderColor: "var(--line)" }}>
        {NAV.map((item) => (
          <button key={item.id}
            onClick={() => { setPage(item.id); if (item.id === "add") setEditQuestId(null); }}
            className="relative flex flex-col items-center gap-0.5 px-2 py-1"
            style={{ color: page === item.id ? "var(--accent)" : "var(--muted)" }}>
            <span className="text-lg">{item.icon}</span>
            <span className="text-xs font-medium" style={{ fontSize: "0.6rem" }}>{item.label}</span>
            {item.id === "inventory" && unopenedBoxes > 0 && (
              <span className="absolute -top-0.5 right-0 w-4 h-4 rounded-full text-xs font-bold flex items-center justify-center"
                style={{ background: "#EF4444", color: "#fff", fontSize: "0.55rem" }}>
                {unopenedBoxes}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="h-20 md:hidden" />
    </Shell>
  );
}
