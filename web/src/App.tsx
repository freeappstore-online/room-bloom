import { useState, useEffect, useCallback, useRef } from "react";
import { Shell } from "./components/Shell";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "kitchen" | "bedroom" | "bathroom" | "garden" | "laundry" | "general";
type Recurrence = "once" | "daily" | "weekly" | "monthly";
type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

type Quest = {
  id: string;
  title: string;
  category: Category;
  points: number;
  recurrence: Recurrence;
  reminderTime: string;   // "HH:MM"
  weekdays?: Weekday[];   // for weekly
  monthDay?: number;      // 1-31 for monthly
  createdAt: number;
  notifyEnabled: boolean;
};

type CompletionEntry = {
  questId: string;
  completedAt: number; // timestamp
  date: string;        // YYYY-MM-DD
  points: number;
};

type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (s: AppState) => boolean;
};

type AppState = {
  quests: Quest[];
  completions: CompletionEntry[];
  totalPoints: number;
  streakDays: number;
  longestStreak: number;
  lastActiveDate: string;
  earnedBadgeIds: string[];
};

type Page = "today" | "quests" | "badges" | "add";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "homequest_v2";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const DEFAULT_STATE: AppState = {
  quests: [],
  completions: [],
  totalPoints: 0,
  streakDays: 0,
  longestStreak: 0,
  lastActiveDate: "",
  earnedBadgeIds: [],
};

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_STATE };
}

function saveState(s: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function isCompletedOn(completions: CompletionEntry[], questId: string, date: string) {
  return completions.some((c) => c.questId === questId && c.date === date);
}

// Is this quest "due" today?
function isDueToday(quest: Quest): boolean {
  const now = new Date();
  const day = now.getDay() as Weekday;
  const dom = now.getDate();
  switch (quest.recurrence) {
    case "daily": return true;
    case "once": return true; // always show until completed
    case "weekly": return quest.weekdays?.includes(day) ?? false;
    case "monthly": return quest.monthDay === dom;
    default: return false;
  }
}

// Parse "HH:MM" → minutes since midnight
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// ─── Category meta ────────────────────────────────────────────────────────────

const CAT_META: Record<Category, { label: string; icon: string; bg: string }> = {
  kitchen:  { label: "Kitchen",  icon: "🍳", bg: "#FEF3C7" },
  bedroom:  { label: "Bedroom",  icon: "🛏️", bg: "#EDE9FE" },
  bathroom: { label: "Bathroom", icon: "🚿", bg: "#DBEAFE" },
  garden:   { label: "Garden",   icon: "🌿", bg: "#D1FAE5" },
  laundry:  { label: "Laundry",  icon: "👕", bg: "#FCE7F3" },
  general:  { label: "General",  icon: "🏠", bg: "#F3F4F6" },
};

const CATEGORIES = Object.keys(CAT_META) as Category[];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Tier system ──────────────────────────────────────────────────────────────

function getTier(pts: number) {
  if (pts < 100)  return { label: "Rookie",      icon: "🌱", next: 100,  color: "#6B7280" };
  if (pts < 300)  return { label: "Helper",      icon: "🔑", next: 300,  color: "#10B981" };
  if (pts < 600)  return { label: "Homekeeper",  icon: "🧹", next: 600,  color: "#3B82F6" };
  if (pts < 1000) return { label: "Pro Cleaner", icon: "⭐", next: 1000, color: "#8B5CF6" };
  return               { label: "Home Legend",  icon: "🏆", next: Infinity, color: "#F59E0B" };
}

// ─── Badges ───────────────────────────────────────────────────────────────────

const BADGES: Badge[] = [
  { id: "first",     name: "First Quest",    icon: "🌱", description: "Complete your first mission",          condition: (s) => s.completions.length >= 1 },
  { id: "five",      name: "On a Roll",      icon: "🎯", description: "Complete 5 missions",                  condition: (s) => s.completions.length >= 5 },
  { id: "twenty",    name: "Dedicated",      icon: "💪", description: "Complete 20 missions",                 condition: (s) => s.completions.length >= 20 },
  { id: "cent",      name: "Century",        icon: "💯", description: "Earn 100 total points",                condition: (s) => s.totalPoints >= 100 },
  { id: "five_hun",  name: "High Scorer",    icon: "⭐", description: "Earn 500 total points",                condition: (s) => s.totalPoints >= 500 },
  { id: "legend",    name: "Legend",         icon: "🏆", description: "Earn 1000 total points",               condition: (s) => s.totalPoints >= 1000 },
  { id: "streak3",   name: "Hat Trick",      icon: "🔥", description: "3-day streak",                         condition: (s) => s.longestStreak >= 3 },
  { id: "streak7",   name: "Week Warrior",   icon: "🗓️", description: "7-day streak",                         condition: (s) => s.longestStreak >= 7 },
  { id: "streak30",  name: "Monthly Master", icon: "🌙", description: "30-day streak",                        condition: (s) => s.longestStreak >= 30 },
  { id: "planner",   name: "Planner",        icon: "📋", description: "Create 5 quests",                      condition: (s) => s.quests.length >= 5 },
  { id: "tenday",    name: "Ten-Day Hero",   icon: "🦸", description: "Complete at least 1 quest for 10 days",
    condition: (s) => {
      const days = new Set(s.completions.map((c) => c.date));
      return days.size >= 10;
    }
  },
  { id: "allcats",   name: "All-Rounder",   icon: "🌈", description: "Complete a quest in every category",
    condition: (s) => {
      const cats = new Set(s.completions.map((c) => s.quests.find((q) => q.id === c.questId)?.category));
      return CATEGORIES.every((cat) => cats.has(cat));
    }
  },
];

// ─── Notification helpers ─────────────────────────────────────────────────────

async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function sendNotification(title: string, body: string) {
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/manifest.json" });
  }
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

const NAV: { id: Page; label: string; icon: string }[] = [
  { id: "today",  label: "Today",  icon: "📅" },
  { id: "quests", label: "Quests", icon: "📋" },
  { id: "badges", label: "Badges", icon: "🏅" },
  { id: "add",    label: "New Quest", icon: "➕" },
];

// ─── Default form state ───────────────────────────────────────────────────────

const DEFAULT_FORM = {
  title: "",
  category: "general" as Category,
  points: 20,
  recurrence: "daily" as Recurrence,
  reminderTime: "09:00",
  weekdays: [1, 3, 5] as Weekday[],
  monthDay: 1,
  notifyEnabled: true,
};

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [page, setPage] = useState<Page>("today");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; pts?: number } | null>(null);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(
    "Notification" in window ? Notification.permission : "denied"
  );
  const [justDone, setJustDone] = useState<string | null>(null);
  const notifTimers = useRef<number[]>([]);

  // Persist
  useEffect(() => { saveState(state); }, [state]);

  // Streak update on mount
  useEffect(() => {
    const t = todayStr();
    setState((prev) => {
      if (prev.lastActiveDate === t) return prev;
      const yest = new Date(); yest.setDate(yest.getDate() - 1);
      const yStr = yest.toISOString().slice(0, 10);
      const streak = prev.lastActiveDate === yStr ? prev.streakDays : 0;
      return { ...prev, streakDays: streak };
    });
  }, []);

  // Badge check
  useEffect(() => {
    const newBadges = BADGES.filter(
      (b) => !state.earnedBadgeIds.includes(b.id) && b.condition(state)
    );
    if (newBadges.length === 0) return;
    setState((prev) => ({
      ...prev,
      earnedBadgeIds: [...prev.earnedBadgeIds, ...newBadges.map((b) => b.id)],
    }));
    newBadges.forEach((b, i) => {
      setTimeout(() => showToast(`🏅 Badge unlocked: ${b.name}!`), 500 + i * 800);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalPoints, state.completions.length, state.longestStreak, state.quests.length]);

  // Schedule browser notifications
  useEffect(() => {
    notifTimers.current.forEach(clearTimeout);
    notifTimers.current = [];
    if (notifPerm !== "granted") return;

    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();

    state.quests.filter((q) => q.notifyEnabled && isDueToday(q)).forEach((q) => {
      const qMins = timeToMinutes(q.reminderTime);
      let diffMs = (qMins - nowMins) * 60 * 1000 - now.getSeconds() * 1000;
      if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000; // tomorrow
      if (diffMs > 24 * 60 * 60 * 1000) return; // too far
      const tid = window.setTimeout(() => {
        if (!isCompletedOn(state.completions, q.id, todayStr())) {
          sendNotification(`⏰ Quest Reminder`, `"${q.title}" is waiting for you! +${q.points} pts`);
        }
      }, diffMs);
      notifTimers.current.push(tid);
    });

    return () => notifTimers.current.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.quests, notifPerm]);

  const showToast = (msg: string, pts?: number) => {
    setToast({ msg, pts });
    setTimeout(() => setToast(null), 3000);
  };

  const handleComplete = useCallback((quest: Quest) => {
    const date = todayStr();
    if (isCompletedOn(state.completions, quest.id, date)) return;

    setState((prev) => {
      const yest = new Date(); yest.setDate(yest.getDate() - 1);
      const yStr = yest.toISOString().slice(0, 10);
      const newStreak = prev.lastActiveDate === date
        ? prev.streakDays
        : prev.lastActiveDate === yStr
        ? prev.streakDays + 1
        : 1;
      return {
        ...prev,
        totalPoints: prev.totalPoints + quest.points,
        completions: [
          { questId: quest.id, completedAt: Date.now(), date, points: quest.points },
          ...prev.completions,
        ],
        lastActiveDate: date,
        streakDays: newStreak,
        longestStreak: Math.max(prev.longestStreak, newStreak),
      };
    });

    setJustDone(quest.id);
    setTimeout(() => setJustDone(null), 700);
    showToast(`✅ "${quest.title}" complete!`, quest.points);

    // Remove "once" quests after completion
    if (quest.recurrence === "once") {
      setTimeout(() => {
        setState((prev) => ({ ...prev, quests: prev.quests.filter((q) => q.id !== quest.id) }));
      }, 1500);
    }
  }, [state.completions]);

  const handleSaveQuest = () => {
    if (!form.title.trim()) return;
    const quest: Quest = {
      id: editingId ?? uid(),
      title: form.title.trim(),
      category: form.category,
      points: Math.max(5, Math.min(200, form.points)),
      recurrence: form.recurrence,
      reminderTime: form.reminderTime,
      weekdays: form.recurrence === "weekly" ? form.weekdays : undefined,
      monthDay: form.recurrence === "monthly" ? form.monthDay : undefined,
      notifyEnabled: form.notifyEnabled,
      createdAt: Date.now(),
    };

    if (form.notifyEnabled && notifPerm !== "granted") {
      requestNotificationPermission().then((granted) => {
        setNotifPerm(granted ? "granted" : "denied");
        if (!granted) showToast("⚠️ Notifications blocked — enable in browser settings");
      });
    }

    setState((prev) => ({
      ...prev,
      quests: editingId
        ? prev.quests.map((q) => (q.id === editingId ? quest : q))
        : [...prev.quests, quest],
    }));

    showToast(editingId ? `✏️ Quest updated!` : `✨ Quest "${quest.title}" created!`);
    setForm(DEFAULT_FORM);
    setEditingId(null);
    setPage("today");
  };

  const handleEdit = (quest: Quest) => {
    setForm({
      title: quest.title,
      category: quest.category,
      points: quest.points,
      recurrence: quest.recurrence,
      reminderTime: quest.reminderTime,
      weekdays: (quest.weekdays as Weekday[]) ?? [1, 3, 5],
      monthDay: quest.monthDay ?? 1,
      notifyEnabled: quest.notifyEnabled,
    });
    setEditingId(quest.id);
    setPage("add");
  };

  const handleDelete = (id: string) => {
    setState((prev) => ({
      ...prev,
      quests: prev.quests.filter((q) => q.id !== id),
      completions: prev.completions.filter((c) => c.questId !== id),
    }));
    showToast("🗑️ Quest deleted");
  };

  const enableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotifPerm(granted ? "granted" : "denied");
    if (granted) showToast("🔔 Notifications enabled!");
    else showToast("⚠️ Notifications blocked — check browser settings");
  };

  // ─ Derived ──────────────────────────────────────────────────────────────────

  const today = todayStr();
  const todayQuests = state.quests.filter(isDueToday);
  const doneToday = todayQuests.filter((q) => isCompletedOn(state.completions, q.id, today));
  const pendingToday = todayQuests.filter((q) => !isCompletedOn(state.completions, q.id, today));
  const todayPoints = doneToday.reduce((s, q) => s + q.points, 0);
  const tier = getTier(state.totalPoints);
  const tierProgress = tier.next === Infinity ? 100 : Math.min(100, (state.totalPoints / tier.next) * 100);

  // Sort pending by reminder time
  const sortedPending = [...pendingToday].sort(
    (a, b) => timeToMinutes(a.reminderTime) - timeToMinutes(b.reminderTime)
  );

  const earnedBadges = BADGES.filter((b) => state.earnedBadgeIds.includes(b.id));
  const lockedBadges = BADGES.filter((b) => !state.earnedBadgeIds.includes(b.id));

  // ─ Sidebar ──────────────────────────────────────────────────────────────────

  const sidebar = (
    <nav className="flex-1 px-3 space-y-1">
      {NAV.map((item) => (
        <button
          key={item.id}
          onClick={() => { setPage(item.id); if (item.id === "add") { setForm(DEFAULT_FORM); setEditingId(null); } }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{
            background: page === item.id ? "var(--accent)" : "transparent",
            color: page === item.id ? "#fff" : "var(--ink)",
          }}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}

      {/* Mini stats */}
      <div className="pt-4 space-y-2">
        <div className="rounded-xl p-3" style={{ background: "var(--paper)", border: "1px solid var(--line)" }}>
          <div className="flex items-center gap-2 mb-1">
            <span>{tier.icon}</span>
            <span className="text-xs font-bold">{tier.label}</span>
          </div>
          <div className="text-lg font-bold">{state.totalPoints.toLocaleString()} pts</div>
          {tier.next !== Infinity && (
            <>
              <div className="h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: "var(--line)" }}>
                <div className="h-full rounded-full" style={{ width: `${tierProgress}%`, background: tier.color }} />
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>{tier.next - state.totalPoints} pts to next tier</div>
            </>
          )}
        </div>
        <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "var(--paper)", border: "1px solid var(--line)" }}>
          <span className="text-2xl">🔥</span>
          <div>
            <div className="text-lg font-bold">{state.streakDays}</div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>day streak</div>
          </div>
        </div>
        {notifPerm !== "granted" && (
          <button
            onClick={enableNotifications}
            className="w-full text-xs px-3 py-2 rounded-xl font-semibold flex items-center gap-2"
            style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" }}
          >
            🔔 Enable reminders
          </button>
        )}
      </div>
    </nav>
  );

  // ─ Render ────────────────────────────────────────────────────────────────────

  return (
    <Shell sidebar={sidebar}>
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold max-w-xs"
          style={{ background: "var(--ink)", color: "var(--paper)", animation: "fadeIn .2s ease" }}
        >
          <span>{toast.msg}</span>
          {toast.pts && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "#F59E0B", color: "#000" }}>
              +{toast.pts}
            </span>
          )}
        </div>
      )}

      {/* Mobile header bar */}
      <div className="flex md:hidden items-center justify-between mb-4">
        <h1 className="text-xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>
          {NAV.find((n) => n.id === page)?.icon} {NAV.find((n) => n.id === page)?.label}
        </h1>
        <div className="flex items-center gap-2 text-sm font-bold">
          <span>🔥 {state.streakDays}</span>
          <span className="px-2 py-1 rounded-xl" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
            {tier.icon} {state.totalPoints}
          </span>
        </div>
      </div>

      {/* ══ TODAY PAGE ══════════════════════════════════════════════════════════ */}
      {page === "today" && (
        <div className="space-y-5">
          <div className="hidden md:flex items-center justify-between">
            <h1 className="text-2xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>
              Today's Quests
            </h1>
            <span className="text-sm" style={{ color: "var(--muted)" }}>
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </span>
          </div>

          {/* Progress bar */}
          {todayQuests.length > 0 && (
            <div className="rounded-2xl p-4" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">{doneToday.length}/{todayQuests.length} quests done</span>
                <span className="text-sm font-bold" style={{ color: "#F59E0B" }}>+{todayPoints} pts earned</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${todayQuests.length ? (doneToday.length / todayQuests.length) * 100 : 0}%`,
                    background: "linear-gradient(90deg, #10B981, #3B82F6)",
                  }}
                />
              </div>
              {doneToday.length === todayQuests.length && todayQuests.length > 0 && (
                <div className="text-center mt-2 text-sm font-semibold" style={{ color: "var(--success)" }}>
                  🎉 All done for today! Amazing work!
                </div>
              )}
            </div>
          )}

          {/* Notification nudge */}
          {notifPerm !== "granted" && state.quests.length > 0 && (
            <button
              onClick={enableNotifications}
              className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-left"
              style={{ background: "#FFFBEB", border: "1px dashed #FCD34D", color: "#92400E" }}
            >
              <span className="text-xl">🔔</span>
              <div>
                <div className="font-bold">Enable reminder notifications</div>
                <div className="text-xs font-normal">Get pinged at your set times so you never miss a quest</div>
              </div>
            </button>
          )}

          {/* Pending quests */}
          {sortedPending.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Pending</h2>
              {sortedPending.map((quest) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  done={false}
                  popping={justDone === quest.id}
                  onComplete={() => handleComplete(quest)}
                  onEdit={() => handleEdit(quest)}
                  onDelete={() => handleDelete(quest.id)}
                />
              ))}
            </div>
          )}

          {/* Done quests */}
          {doneToday.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Completed</h2>
              {doneToday.map((quest) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  done={true}
                  popping={false}
                  onComplete={() => {}}
                  onEdit={() => handleEdit(quest)}
                  onDelete={() => handleDelete(quest.id)}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {todayQuests.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <div className="text-6xl">🏠</div>
              <div className="font-bold text-lg" style={{ fontFamily: "Fraunces, serif" }}>No quests yet!</div>
              <div className="text-sm" style={{ color: "var(--muted)" }}>
                Add your first household quest and set a reminder time.
              </div>
              <button
                onClick={() => { setForm(DEFAULT_FORM); setEditingId(null); setPage("add"); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white"
                style={{ background: "var(--accent)" }}
              >
                ➕ Add your first quest
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══ ALL QUESTS PAGE ═════════════════════════════════════════════════════ */}
      {page === "quests" && (
        <div className="space-y-4">
          <div className="hidden md:flex items-center justify-between">
            <h1 className="text-2xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>All Quests</h1>
            <button
              onClick={() => { setForm(DEFAULT_FORM); setEditingId(null); setPage("add"); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "var(--accent)" }}
            >
              ➕ New Quest
            </button>
          </div>

          {state.quests.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="text-5xl">📋</div>
              <div className="font-bold" style={{ fontFamily: "Fraunces, serif" }}>No quests created yet</div>
              <button
                onClick={() => { setForm(DEFAULT_FORM); setEditingId(null); setPage("add"); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white"
                style={{ background: "var(--accent)" }}
              >
                ➕ Create first quest
              </button>
            </div>
          ) : (
            CATEGORIES.map((cat) => {
              const catQuests = state.quests.filter((q) => q.category === cat);
              if (catQuests.length === 0) return null;
              return (
                <div key={cat}>
                  <h2 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
                    {CAT_META[cat].icon} {CAT_META[cat].label}
                  </h2>
                  <div className="space-y-2">
                    {catQuests.map((quest) => (
                      <QuestCard
                        key={quest.id}
                        quest={quest}
                        done={isCompletedOn(state.completions, quest.id, today)}
                        popping={false}
                        onComplete={() => handleComplete(quest)}
                        onEdit={() => handleEdit(quest)}
                        onDelete={() => handleDelete(quest.id)}
                        showSchedule
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ══ BADGES PAGE ═════════════════════════════════════════════════════════ */}
      {page === "badges" && (
        <div className="space-y-5">
          <div className="hidden md:flex items-center justify-between">
            <h1 className="text-2xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>Badges</h1>
            <span className="text-sm" style={{ color: "var(--muted)" }}>{earnedBadges.length}/{BADGES.length} earned</span>
          </div>

          {/* Tier card */}
          <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
            <div className="text-5xl">{tier.icon}</div>
            <div className="flex-1">
              <div className="font-bold text-lg" style={{ fontFamily: "Fraunces, serif" }}>{tier.label}</div>
              <div className="text-sm" style={{ color: "var(--muted)" }}>{state.totalPoints.toLocaleString()} total points · 🔥 {state.longestStreak} best streak</div>
              {tier.next !== Infinity && (
                <>
                  <div className="h-2 rounded-full mt-2 overflow-hidden" style={{ background: "var(--line)" }}>
                    <div className="h-full rounded-full" style={{ width: `${tierProgress}%`, background: tier.color }} />
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>{tier.next - state.totalPoints} pts to next tier</div>
                </>
              )}
            </div>
          </div>

          {earnedBadges.length > 0 && (
            <>
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Earned</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {earnedBadges.map((b) => (
                  <div key={b.id} className="rounded-2xl p-4 flex flex-col items-center gap-2 text-center"
                    style={{ background: "var(--panel)", border: "2px solid var(--success)" }}>
                    <span className="text-4xl">{b.icon}</span>
                    <div className="font-bold text-sm">{b.name}</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>{b.description}</div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(22,163,74,0.1)", color: "var(--success)" }}>✓ Earned</span>
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
                    style={{ background: "var(--panel)", border: "1px solid var(--line)", opacity: 0.55 }}>
                    <span className="text-4xl">{b.icon}</span>
                    <div className="font-bold text-sm">{b.name}</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>{b.description}</div>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--line)", color: "var(--muted)" }}>🔒 Locked</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══ ADD / EDIT QUEST PAGE ═══════════════════════════════════════════════ */}
      {page === "add" && (
        <div className="space-y-4 max-w-lg">
          <h1 className="hidden md:block text-2xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>
            {editingId ? "Edit Quest" : "New Quest"}
          </h1>

          <div className="rounded-2xl p-5 space-y-5" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold mb-1.5">Quest name</label>
              <input
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--paper)", border: "1px solid var(--line)", color: "var(--ink)" }}
                placeholder='e.g. "Clean the fridge" or "Water the plants"'
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                maxLength={60}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold mb-1.5">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setForm((p) => ({ ...p, category: cat }))}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: form.category === cat ? CAT_META[cat].bg : "var(--paper)",
                      border: `1.5px solid ${form.category === cat ? "var(--accent)" : "var(--line)"}`,
                      color: "var(--ink)",
                    }}
                  >
                    {CAT_META[cat].icon} {CAT_META[cat].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Points */}
            <div>
              <label className="block text-sm font-semibold mb-1.5">
                Points: <span style={{ color: "#F59E0B" }}>⚡ {form.points}</span>
              </label>
              <input
                type="range" min={5} max={200} step={5}
                value={form.points}
                onChange={(e) => setForm((p) => ({ ...p, points: Number(e.target.value) }))}
                className="w-full"
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: "var(--muted)" }}>
                <span>5 (quick)</span><span>50 (medium)</span><span>200 (big job)</span>
              </div>
            </div>

            {/* Reminder time */}
            <div>
              <label className="block text-sm font-semibold mb-1.5">⏰ Reminder time</label>
              <input
                type="time"
                value={form.reminderTime}
                onChange={(e) => setForm((p) => ({ ...p, reminderTime: e.target.value }))}
                className="px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--paper)", border: "1px solid var(--line)", color: "var(--ink)" }}
              />
            </div>

            {/* Recurrence */}
            <div>
              <label className="block text-sm font-semibold mb-1.5">How often?</label>
              <div className="grid grid-cols-4 gap-2">
                {(["once", "daily", "weekly", "monthly"] as Recurrence[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setForm((p) => ({ ...p, recurrence: r }))}
                    className="py-2 rounded-xl text-xs font-semibold capitalize transition-all"
                    style={{
                      background: form.recurrence === r ? "var(--accent)" : "var(--paper)",
                      color: form.recurrence === r ? "#fff" : "var(--ink)",
                      border: `1px solid ${form.recurrence === r ? "var(--accent)" : "var(--line)"}`,
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Weekly day picker */}
            {form.recurrence === "weekly" && (
              <div>
                <label className="block text-sm font-semibold mb-1.5">Which days?</label>
                <div className="flex gap-1.5 flex-wrap">
                  {WEEKDAY_LABELS.map((day, i) => {
                    const wd = i as Weekday;
                    const active = form.weekdays.includes(wd);
                    return (
                      <button
                        key={day}
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            weekdays: active
                              ? p.weekdays.filter((d) => d !== wd)
                              : [...p.weekdays, wd],
                          }))
                        }
                        className="w-10 h-10 rounded-xl text-xs font-bold transition-all"
                        style={{
                          background: active ? "var(--accent)" : "var(--paper)",
                          color: active ? "#fff" : "var(--ink)",
                          border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
                        }}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Monthly day picker */}
            {form.recurrence === "monthly" && (
              <div>
                <label className="block text-sm font-semibold mb-1.5">Day of month</label>
                <input
                  type="number" min={1} max={31}
                  value={form.monthDay}
                  onChange={(e) => setForm((p) => ({ ...p, monthDay: Number(e.target.value) }))}
                  className="w-24 px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--paper)", border: "1px solid var(--line)", color: "var(--ink)" }}
                />
              </div>
            )}

            {/* Notifications toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">🔔 Send reminder notification</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>
                  {notifPerm === "granted" ? "Notifications are enabled" : "You'll be asked to allow notifications"}
                </div>
              </div>
              <button
                onClick={() => setForm((p) => ({ ...p, notifyEnabled: !p.notifyEnabled }))}
                className="w-12 h-6 rounded-full transition-all relative"
                style={{ background: form.notifyEnabled ? "var(--accent)" : "var(--line)" }}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                  style={{ left: form.notifyEnabled ? "calc(100% - 1.375rem)" : "0.125rem" }}
                />
              </button>
            </div>

            {/* Submit */}
            <button
              onClick={handleSaveQuest}
              disabled={!form.title.trim() || (form.recurrence === "weekly" && form.weekdays.length === 0)}
              className="w-full py-3 rounded-xl font-bold text-sm text-white transition-opacity"
              style={{
                background: form.title.trim() ? "var(--accent)" : "var(--line)",
                cursor: form.title.trim() ? "pointer" : "not-allowed",
              }}
            >
              {editingId ? "✏️ Save Changes" : "✨ Create Quest"}
            </button>

            {editingId && (
              <button
                onClick={() => { setForm(DEFAULT_FORM); setEditingId(null); setPage("quests"); }}
                className="w-full py-2 rounded-xl text-sm font-medium"
                style={{ color: "var(--muted)", border: "1px solid var(--line)" }}
              >
                Cancel
              </button>
            )}
          </div>

          {/* Reset */}
          {!editingId && state.completions.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Reset ALL progress and quests? This cannot be undone.")) {
                  setState(DEFAULT_STATE);
                  showToast("🗑️ All data cleared");
                }
              }}
              className="text-xs px-3 py-1.5 rounded-xl"
              style={{ border: "1px solid var(--line)", color: "var(--error)" }}
            >
              🗑️ Reset all data
            </button>
          )}
        </div>
      )}

      {/* Mobile bottom dock */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around h-16 border-t z-40"
        style={{ background: "var(--dock)", borderColor: "var(--line)" }}>
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => { setPage(item.id); if (item.id === "add") { setForm(DEFAULT_FORM); setEditingId(null); } }}
            className="flex flex-col items-center gap-0.5 px-3 py-1"
            style={{ color: page === item.id ? "var(--accent)" : "var(--muted)" }}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
      <div className="h-20 md:hidden" />
    </Shell>
  );
}

// ─── Quest Card Component ─────────────────────────────────────────────────────

function QuestCard({
  quest,
  done,
  popping,
  onComplete,
  onEdit,
  onDelete,
  showSchedule = false,
}: {
  quest: Quest;
  done: boolean;
  popping: boolean;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  showSchedule?: boolean;
}) {
  const scheduleLabel = () => {
    switch (quest.recurrence) {
      case "daily": return "Every day";
      case "once": return "One time";
      case "weekly":
        return quest.weekdays && quest.weekdays.length > 0
          ? quest.weekdays.map((d) => WEEKDAY_LABELS[d]).join(", ")
          : "Weekly";
      case "monthly": return `Monthly on day ${quest.monthDay}`;
      default: return quest.recurrence;
    }
  };

  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-all"
      style={{
        background: done ? "rgba(22,163,74,0.06)" : "var(--panel)",
        border: `1px solid ${done ? "rgba(22,163,74,0.3)" : "var(--line)"}`,
        opacity: done ? 0.8 : 1,
      }}
    >
      <span className="text-2xl shrink-0">{CAT_META[quest.category].icon}</span>
      <div className="flex-1 min-w-0">
        <div
          className="text-sm font-semibold truncate"
          style={{
            textDecoration: done ? "line-through" : "none",
            color: done ? "var(--muted)" : "var(--ink)",
          }}
        >
          {quest.title}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: CAT_META[quest.category].bg, color: "#374151" }}>
            {CAT_META[quest.category].label}
          </span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>⏰ {quest.reminderTime}</span>
          {showSchedule && <span className="text-xs" style={{ color: "var(--muted)" }}>· {scheduleLabel()}</span>}
          {quest.notifyEnabled && <span className="text-xs">🔔</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs font-bold px-2 py-1 rounded-xl" style={{ background: "var(--paper)", border: "1px solid var(--line)", color: "#F59E0B" }}>
          ⚡{quest.points}
        </span>
        <button
          onClick={onComplete}
          disabled={done}
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold transition-all ${popping ? "scale-125" : "scale-100"}`}
          style={{
            background: done ? "var(--success)" : "var(--accent)",
            color: "#fff",
            cursor: done ? "default" : "pointer",
          }}
          title={done ? "Done!" : "Mark complete"}
        >
          {done ? "✓" : "→"}
        </button>
        <button
          onClick={onEdit}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
          style={{ background: "var(--paper)", border: "1px solid var(--line)", color: "var(--muted)" }}
          title="Edit"
        >
          ✏️
        </button>
        <button
          onClick={onDelete}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
          style={{ background: "var(--paper)", border: "1px solid var(--line)", color: "var(--error)" }}
          title="Delete"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
