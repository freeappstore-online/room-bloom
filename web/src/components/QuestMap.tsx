import type { MapArea, Quest, QuestRun } from "../types";

interface Props {
  areas: MapArea[];
  quests: Quest[];
  runs: QuestRun[];
  totalCompleted: number;
  onAreaClick: (areaId: string) => void;
}

export function QuestMap({ areas, quests, runs, totalCompleted, onAreaClick }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const areaStats = (areaId: string) => {
    const areaQuests = quests.filter((q) => q.areaId === areaId);
    const doneTodayCount = areaQuests.filter((q) =>
      runs.some((r) => r.questId === q.id && r.date === today && r.completedAt)
    ).length;
    return { total: areaQuests.length, done: doneTodayCount };
  };

  // Which areas unlock next
  const nextUnlock = areas.find((a) => !a.unlocked);

  return (
    <div className="space-y-4">
      <div className="hidden md:flex items-center justify-between">
        <h1 className="text-2xl font-black" style={{ fontFamily: "Fraunces, serif" }}>🗺️ Quest Map</h1>
        <span className="text-sm" style={{ color: "var(--muted)" }}>{totalCompleted} quests completed</span>
      </div>

      {/* Map */}
      <div
        className="relative w-full rounded-3xl overflow-hidden"
        style={{
          paddingBottom: "65%",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0f172a 100%)",
          border: "2px solid var(--line)",
        }}
      >
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94a3b8" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Connection lines */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {areas.map((area, i) => {
            if (i === 0) return null;
            const prev = areas[i - 1];
            return (
              <line
                key={area.id}
                x1={`${prev.position.x}%`} y1={`${prev.position.y}%`}
                x2={`${area.position.x}%`} y2={`${area.position.y}%`}
                stroke={area.unlocked ? "#3B82F6" : "#374151"}
                strokeWidth="2"
                strokeDasharray={area.unlocked ? "0" : "6,4"}
              />
            );
          })}
        </svg>

        {/* Area nodes */}
        {areas.map((area) => {
          const stats = areaStats(area.id);
          const allDone = stats.total > 0 && stats.done === stats.total;
          return (
            <button
              key={area.id}
              onClick={() => area.unlocked && onAreaClick(area.id)}
              className="absolute flex flex-col items-center gap-1 transition-all hover:scale-110 active:scale-95"
              style={{
                left: `${area.position.x}%`,
                top: `${area.position.y}%`,
                transform: "translate(-50%, -50%)",
                cursor: area.unlocked ? "pointer" : "not-allowed",
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg"
                style={{
                  background: area.unlocked
                    ? allDone
                      ? "linear-gradient(135deg,#10B981,#16A34A)"
                      : "linear-gradient(135deg,#3B82F6,#8B5CF6)"
                    : "#1F2937",
                  border: `3px solid ${area.unlocked ? (allDone ? "#10B981" : "#60A5FA") : "#374151"}`,
                  opacity: area.unlocked ? 1 : 0.6,
                }}
              >
                {area.unlocked ? area.icon : "🔒"}
              </div>
              <div className="text-center">
                <div
                  className="text-xs font-bold leading-tight px-2 py-0.5 rounded-lg"
                  style={{
                    background: "rgba(0,0,0,0.7)",
                    color: area.unlocked ? "#fff" : "#6B7280",
                    whiteSpace: "nowrap",
                    maxWidth: "80px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {area.unlocked ? area.name : `🔒 ${area.unlockRequirement}`}
                </div>
                {area.unlocked && stats.total > 0 && (
                  <div className="text-xs font-semibold" style={{ color: "#94A3B8" }}>
                    {stats.done}/{stats.total}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Area cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {areas.map((area) => {
          const stats = areaStats(area.id);
          const areaQuests = quests.filter((q) => q.areaId === area.id);
          return (
            <button
              key={area.id}
              onClick={() => area.unlocked && onAreaClick(area.id)}
              className="text-left rounded-2xl p-4 transition-all"
              style={{
                background: area.unlocked ? "var(--panel)" : "var(--panel)",
                border: `1.5px solid ${area.unlocked ? "var(--line)" : "var(--line)"}`,
                opacity: area.unlocked ? 1 : 0.6,
                cursor: area.unlocked ? "pointer" : "default",
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{area.unlocked ? area.icon : "🔒"}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{area.name}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{area.description}</div>
                </div>
                {area.unlocked ? (
                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm">{areaQuests.length}</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>quests</div>
                  </div>
                ) : (
                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm" style={{ color: "var(--muted)" }}>{area.unlockRequirement}</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>to unlock</div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Next unlock hint */}
      {nextUnlock && (
        <div className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: "var(--panel)", border: "1px dashed var(--line)" }}>
          <span className="text-2xl">🔒</span>
          <div>
            <div className="text-sm font-bold">Next: {nextUnlock.name}</div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>
              Complete {nextUnlock.unlockRequirement - totalCompleted} more quest{nextUnlock.unlockRequirement - totalCompleted !== 1 ? "s" : ""} to unlock
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
