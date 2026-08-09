import { useState } from "react";
import type { Quest, QuestRun } from "../types";
import { TYPE_META, DIFF_META } from "../data";

interface Props {
  quest: Quest;
  run: QuestRun;
  onToggleObjective: (objId: string) => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function QuestDetail({ quest, run, onToggleObjective, onClose, onEdit, onDelete }: Props) {
  const meta = TYPE_META[quest.type];
  const diff = DIFF_META[quest.difficulty];
  const done = !!run.completedAt;
  const progress = run.objectivesDone.length;
  const total = quest.objectives.length;
  const pct = total > 0 ? (progress / total) * 100 : 0;
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl"
        style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
      >
        {/* Header */}
        <div className="p-5 pb-3 border-b" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                style={{ background: meta.bg }}>
                {meta.icon}
              </div>
              <div>
                <div className="font-bold text-base leading-tight">{quest.title}</div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: meta.bg, color: meta.color }}>
                    {meta.label}
                  </span>
                  <span className="text-xs font-bold" style={{ color: diff.color }}>
                    {"★".repeat(diff.stars)}{"☆".repeat(4 - diff.stars)} {diff.label}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-lg shrink-0"
              style={{ background: "var(--panel)", color: "var(--muted)" }}>
              ✕
            </button>
          </div>

          {/* Flavour text */}
          <div className="mt-3 px-3 py-2.5 rounded-xl text-sm italic"
            style={{ background: "var(--panel)", color: "var(--muted)", borderLeft: `3px solid ${meta.color}` }}>
            "{quest.flavourText}"
          </div>
        </div>

        {/* Progress */}
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Mission Progress</span>
            <span className="text-sm font-bold" style={{ color: done ? "var(--success)" : "var(--accent)" }}>
              {progress}/{total} objectives
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: done
                  ? "linear-gradient(90deg,#10B981,#16A34A)"
                  : "linear-gradient(90deg,#3B82F6,#8B5CF6)",
              }}
            />
          </div>
          {done && (
            <div className="text-center mt-2 text-sm font-bold" style={{ color: "var(--success)" }}>
              🎉 Mission Complete!
            </div>
          )}
        </div>

        {/* Objectives */}
        <div className="px-5 py-4 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
            Objectives
          </div>
          {quest.objectives.map((obj, i) => {
            const checked = run.objectivesDone.includes(obj.id);
            return (
              <button
                key={obj.id}
                onClick={() => !done && onToggleObjective(obj.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                style={{
                  background: checked ? "rgba(22,163,74,0.08)" : "var(--panel)",
                  border: `1px solid ${checked ? "rgba(22,163,74,0.3)" : "var(--line)"}`,
                  cursor: done ? "default" : "pointer",
                }}
              >
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-sm shrink-0 font-bold transition-all"
                  style={{
                    background: checked ? "var(--success)" : "var(--paper)",
                    border: `2px solid ${checked ? "var(--success)" : "var(--line)"}`,
                    color: checked ? "#fff" : "var(--muted)",
                  }}
                >
                  {checked ? "✓" : i + 1}
                </div>
                <span className="text-sm flex-1"
                  style={{
                    textDecoration: checked ? "line-through" : "none",
                    color: checked ? "var(--muted)" : "var(--ink)",
                  }}>
                  {obj.text}
                </span>
              </button>
            );
          })}
        </div>

        {/* Rewards */}
        <div className="px-5 pb-4">
          <div className="rounded-2xl p-4" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--muted)" }}>
              Quest Rewards
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xl">⚡</span>
                <div>
                  <div className="font-bold text-sm">{quest.xpReward} XP</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>Experience</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl">🪙</span>
                <div>
                  <div className="font-bold text-sm">{quest.coinReward} Coins</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>Gold</div>
                </div>
              </div>
              {quest.mysteryBoxChance > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xl">📦</span>
                  <div>
                    <div className="font-bold text-sm">{quest.mysteryBoxChance}%</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>Mystery Box</div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-xl">⏰</span>
                <div>
                  <div className="font-bold text-sm">{quest.reminderTime}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>Reminder</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onEdit}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ border: "1px solid var(--line)", color: "var(--ink)", background: "var(--panel)" }}>
            ✏️ Edit
          </button>
          {confirmDelete ? (
            <>
              <button onClick={onDelete}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: "var(--error)" }}>
                Confirm Delete
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="py-2.5 px-3 rounded-xl text-sm"
                style={{ border: "1px solid var(--line)", color: "var(--muted)" }}>
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              className="py-2.5 px-3 rounded-xl text-sm font-semibold"
              style={{ border: "1px solid var(--line)", color: "var(--error)" }}>
              🗑️
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
