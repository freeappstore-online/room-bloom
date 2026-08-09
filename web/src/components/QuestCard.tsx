import type { Quest, QuestRun } from "../types";
import { TYPE_META, DIFF_META } from "../data";

interface Props {
  quest: Quest;
  run?: QuestRun;
  onOpen: () => void;
  compact?: boolean;
}

export function QuestCard({ quest, run, onOpen, compact = false }: Props) {
  const meta = TYPE_META[quest.type];
  const diff = DIFF_META[quest.difficulty];
  const done = !!run?.completedAt;
  const progress = run ? run.objectivesDone.length : 0;
  const total = quest.objectives.length;
  const pct = total > 0 ? (progress / total) * 100 : 0;

  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-2xl p-4 transition-all hover:scale-[1.01] active:scale-[0.99]"
      style={{
        background: done ? "rgba(22,163,74,0.06)" : "var(--panel)",
        border: `1.5px solid ${done ? "rgba(22,163,74,0.35)" : "var(--line)"}`,
        opacity: done ? 0.85 : 1,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0"
          style={{ background: meta.bg }}>
          {meta.icon}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm truncate"
              style={{ textDecoration: done ? "line-through" : "none", color: done ? "var(--muted)" : "var(--ink)" }}>
              {quest.title}
            </span>
            {done && <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "#DCFCE7", color: "#16A34A" }}>✓ Done</span>}
          </div>

          {/* Meta row */}
          {!compact && (
            <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--muted)" }}>
              {quest.flavourText}
            </p>
          )}

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: meta.bg, color: meta.color }}>
              {meta.icon} {meta.label}
            </span>
            <span className="text-xs font-bold" style={{ color: diff.color }}>
              {"⚔️".repeat(0)}{"★".repeat(diff.stars)}{"☆".repeat(4 - diff.stars)} {diff.label}
            </span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>⏰ {quest.reminderTime}</span>
          </div>

          {/* Progress bar */}
          {total > 0 && !compact && (
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1" style={{ color: "var(--muted)" }}>
                <span>{progress}/{total} objectives</span>
                <span style={{ color: "#F59E0B" }}>⚡ {quest.xpReward} XP · 🪙 {quest.coinReward}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
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
            </div>
          )}
        </div>

        {/* Arrow */}
        <div className="text-lg shrink-0 mt-1" style={{ color: "var(--muted)" }}>›</div>
      </div>
    </button>
  );
}
