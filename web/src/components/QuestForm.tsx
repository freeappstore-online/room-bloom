import type { Quest, QuestType, Difficulty, QuestFrequency, Weekday, Objective } from "../types";
import { TYPE_META, DIFF_META, WEEKDAY_LABELS } from "../data";
import { uid } from "../store";
import { useState, useEffect } from "react";
import type { MapArea } from "../types";

const QUEST_TYPES = Object.keys(TYPE_META) as QuestType[];
const DIFFICULTIES = Object.keys(DIFF_META) as Difficulty[];
const FREQUENCIES: QuestFrequency[] = ["daily", "weekly", "special", "once"];

const FREQ_LABEL: Record<QuestFrequency, string> = {
  daily: "Daily", weekly: "Weekly", special: "Special", once: "One-time",
};

const MYSTERY_CHANCE: Record<Difficulty, number> = {
  easy: 10, medium: 20, hard: 35, epic: 60,
};

const BASE_XP: Record<Difficulty, number> = {
  easy: 30, medium: 60, hard: 100, epic: 180,
};
const BASE_COINS: Record<Difficulty, number> = {
  easy: 10, medium: 20, hard: 35, epic: 60,
};

interface FormState {
  title: string;
  flavourText: string;
  type: QuestType;
  difficulty: Difficulty;
  frequency: QuestFrequency;
  reminderTime: string;
  weekdays: Weekday[];
  objectives: string[];
  notifyEnabled: boolean;
  areaId: string;
}

const DEFAULT_FORM: FormState = {
  title: "",
  flavourText: "",
  type: "cleaning",
  difficulty: "easy",
  frequency: "daily",
  reminderTime: "09:00",
  weekdays: [1, 3, 5],
  objectives: [""],
  notifyEnabled: true,
  areaId: "kitchen",
};

interface Props {
  editQuest?: Quest;
  areas: MapArea[];
  onSave: (quest: Quest) => void;
  onCancel: () => void;
}

export function QuestForm({ editQuest, areas, onSave, onCancel }: Props) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  useEffect(() => {
    if (editQuest) {
      setForm({
        title: editQuest.title,
        flavourText: editQuest.flavourText,
        type: editQuest.type,
        difficulty: editQuest.difficulty,
        frequency: editQuest.frequency,
        reminderTime: editQuest.reminderTime,
        weekdays: (editQuest.weekdays as Weekday[]) ?? [1, 3, 5],
        objectives: editQuest.objectives.map((o) => o.text),
        notifyEnabled: editQuest.notifyEnabled,
        areaId: editQuest.areaId,
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [editQuest]);

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const addObjective = () => setForm((p) => ({ ...p, objectives: [...p.objectives, ""] }));
  const updateObjective = (i: number, val: string) =>
    setForm((p) => { const o = [...p.objectives]; o[i] = val; return { ...p, objectives: o }; });
  const removeObjective = (i: number) =>
    setForm((p) => ({ ...p, objectives: p.objectives.filter((_, j) => j !== i) }));

  const toggleWeekday = (wd: Weekday) =>
    setForm((p) => ({
      ...p,
      weekdays: p.weekdays.includes(wd)
        ? p.weekdays.filter((d) => d !== wd)
        : [...p.weekdays, wd],
    }));

  const canSave = form.title.trim() &&
    form.objectives.some((o) => o.trim()) &&
    (form.frequency !== "weekly" || form.weekdays.length > 0);

  const handleSave = () => {
    if (!canSave) return;
    const objectives: Objective[] = form.objectives
      .filter((o) => o.trim())
      .map((o) => ({ id: uid(), text: o.trim(), completed: false }));

    const quest: Quest = {
      id: editQuest?.id ?? uid(),
      title: form.title.trim(),
      flavourText: form.flavourText.trim() || `A ${DIFF_META[form.difficulty].label} ${TYPE_META[form.type].label} mission awaits!`,
      type: form.type,
      difficulty: form.difficulty,
      frequency: form.frequency,
      reminderTime: form.reminderTime,
      weekdays: form.frequency === "weekly" ? form.weekdays : undefined,
      objectives,
      notifyEnabled: form.notifyEnabled,
      areaId: form.areaId,
      xpReward: BASE_XP[form.difficulty],
      coinReward: BASE_COINS[form.difficulty],
      mysteryBoxChance: MYSTERY_CHANCE[form.difficulty],
      createdAt: editQuest?.createdAt ?? Date.now(),
    };
    onSave(quest);
  };

  const meta = TYPE_META[form.type];
  const diff = DIFF_META[form.difficulty];

  return (
    <div className="space-y-5 max-w-lg pb-8">
      <h1 className="text-2xl font-black hidden md:block" style={{ fontFamily: "Fraunces, serif" }}>
        {editQuest ? "⚔️ Edit Quest" : "⚔️ Forge New Quest"}
      </h1>

      <div className="rounded-2xl p-5 space-y-5" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>

        {/* Mission name */}
        <div>
          <label className="block text-sm font-bold mb-1.5">Mission Name</label>
          <input
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--paper)", border: "1px solid var(--line)", color: "var(--ink)" }}
            placeholder='e.g. "Operation Fresh Kitchen"'
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            maxLength={60}
          />
        </div>

        {/* Flavour text */}
        <div>
          <label className="block text-sm font-bold mb-1.5">Mission Briefing <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span></label>
          <textarea
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={{ background: "var(--paper)", border: "1px solid var(--line)", color: "var(--ink)" }}
            placeholder='e.g. "The kitchen has fallen into chaos. Restore order before dinner!"'
            value={form.flavourText}
            onChange={(e) => setField("flavourText", e.target.value)}
            rows={2}
            maxLength={120}
          />
        </div>

        {/* Quest type */}
        <div>
          <label className="block text-sm font-bold mb-1.5">Quest Type</label>
          <div className="grid grid-cols-4 gap-1.5">
            {QUEST_TYPES.map((t) => (
              <button key={t}
                onClick={() => setField("type", t)}
                className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: form.type === t ? TYPE_META[t].bg : "var(--paper)",
                  border: `1.5px solid ${form.type === t ? TYPE_META[t].color : "var(--line)"}`,
                  color: form.type === t ? TYPE_META[t].color : "var(--muted)",
                }}>
                <span className="text-lg">{TYPE_META[t].icon}</span>
                <span className="leading-tight text-center">{TYPE_META[t].label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-sm font-bold mb-1.5">Difficulty</label>
          <div className="grid grid-cols-4 gap-1.5">
            {DIFFICULTIES.map((d) => (
              <button key={d}
                onClick={() => setField("difficulty", d)}
                className="py-2 rounded-xl text-xs font-bold capitalize transition-all"
                style={{
                  background: form.difficulty === d ? DIFF_META[d].color : "var(--paper)",
                  color: form.difficulty === d ? "#fff" : "var(--ink)",
                  border: `1px solid ${form.difficulty === d ? DIFF_META[d].color : "var(--line)"}`,
                }}>
                {"★".repeat(DIFF_META[d].stars)} {DIFF_META[d].label}
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs px-3 py-1.5 rounded-xl inline-flex gap-3"
            style={{ background: "var(--paper)", border: "1px solid var(--line)" }}>
            <span>⚡ {BASE_XP[form.difficulty]} XP</span>
            <span>🪙 {BASE_COINS[form.difficulty]} coins</span>
            <span>📦 {MYSTERY_CHANCE[form.difficulty]}% box chance</span>
          </div>
        </div>

        {/* Objectives */}
        <div>
          <label className="block text-sm font-bold mb-1.5">Objectives</label>
          <div className="space-y-2">
            {form.objectives.map((obj, i) => (
              <div key={i} className="flex gap-2 items-center">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: "var(--accent)", color: "#fff" }}>{i + 1}</div>
                <input
                  className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "var(--paper)", border: "1px solid var(--line)", color: "var(--ink)" }}
                  placeholder={`Objective ${i + 1}…`}
                  value={obj}
                  onChange={(e) => updateObjective(i, e.target.value)}
                  maxLength={80}
                />
                {form.objectives.length > 1 && (
                  <button onClick={() => removeObjective(i)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                    style={{ background: "var(--paper)", border: "1px solid var(--line)", color: "var(--error)" }}>
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {form.objectives.length < 8 && (
            <button onClick={addObjective}
              className="mt-2 text-xs px-3 py-1.5 rounded-xl font-semibold"
              style={{ border: "1px dashed var(--line)", color: "var(--accent)" }}>
              + Add objective
            </button>
          )}
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-sm font-bold mb-1.5">Frequency</label>
          <div className="grid grid-cols-4 gap-1.5">
            {FREQUENCIES.map((f) => (
              <button key={f}
                onClick={() => setField("frequency", f)}
                className="py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: form.frequency === f ? "var(--accent)" : "var(--paper)",
                  color: form.frequency === f ? "#fff" : "var(--ink)",
                  border: `1px solid ${form.frequency === f ? "var(--accent)" : "var(--line)"}`,
                }}>
                {FREQ_LABEL[f]}
              </button>
            ))}
          </div>
        </div>

        {/* Weekly day picker */}
        {form.frequency === "weekly" && (
          <div>
            <label className="block text-sm font-bold mb-1.5">Which days?</label>
            <div className="flex gap-1.5 flex-wrap">
              {WEEKDAY_LABELS.map((day, i) => {
                const wd = i as Weekday;
                const active = form.weekdays.includes(wd);
                return (
                  <button key={day}
                    onClick={() => toggleWeekday(wd)}
                    className="w-10 h-10 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: active ? "var(--accent)" : "var(--paper)",
                      color: active ? "#fff" : "var(--ink)",
                      border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
                    }}>
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Reminder time */}
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-bold mb-1.5">⏰ Reminder Time</label>
            <input type="time" value={form.reminderTime}
              onChange={(e) => setField("reminderTime", e.target.value)}
              className="px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--paper)", border: "1px solid var(--line)", color: "var(--ink)" }}
            />
          </div>
          <div className="flex items-center gap-3 pt-5">
            <span className="text-sm font-semibold">🔔 Notify</span>
            <button
              onClick={() => setField("notifyEnabled", !form.notifyEnabled)}
              className="w-12 h-6 rounded-full transition-all relative"
              style={{ background: form.notifyEnabled ? "var(--accent)" : "var(--line)" }}>
              <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{ left: form.notifyEnabled ? "calc(100% - 1.375rem)" : "0.125rem" }} />
            </button>
          </div>
        </div>

        {/* Map area */}
        <div>
          <label className="block text-sm font-bold mb-1.5">Home Area</label>
          <div className="grid grid-cols-3 gap-1.5">
            {areas.map((area) => (
              <button key={area.id}
                onClick={() => setField("areaId", area.id)}
                disabled={!area.unlocked}
                className="flex items-center gap-1.5 px-2 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: form.areaId === area.id ? "var(--accent)" : "var(--paper)",
                  color: form.areaId === area.id ? "#fff" : area.unlocked ? "var(--ink)" : "var(--muted)",
                  border: `1px solid ${form.areaId === area.id ? "var(--accent)" : "var(--line)"}`,
                  opacity: area.unlocked ? 1 : 0.5,
                  cursor: area.unlocked ? "pointer" : "not-allowed",
                }}>
                {area.icon} {area.name}
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="flex gap-2 pt-1">
          <button onClick={handleSave} disabled={!canSave}
            className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-opacity"
            style={{ background: canSave ? "var(--accent)" : "var(--line)", cursor: canSave ? "pointer" : "not-allowed" }}>
            {editQuest ? "✏️ Save Changes" : `⚔️ Forge Quest`}
          </button>
          <button onClick={onCancel}
            className="py-3 px-4 rounded-xl text-sm font-medium"
            style={{ border: "1px solid var(--line)", color: "var(--muted)" }}>
            Cancel
          </button>
        </div>
      </div>

      {/* Preview */}
      {form.title && (
        <div className="rounded-2xl p-4" style={{ border: `2px solid ${meta.color}`, background: `${meta.color}0d` }}>
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>Preview</div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{meta.icon}</span>
            <span className="font-bold">{form.title}</span>
          </div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            {form.objectives.filter(Boolean).length} objective{form.objectives.filter(Boolean).length !== 1 ? "s" : ""} ·{" "}
            <span style={{ color: diff.color }}>{"★".repeat(diff.stars)} {diff.label}</span> ·{" "}
            {FREQ_LABEL[form.frequency]}
          </div>
        </div>
      )}
    </div>
  );
}
