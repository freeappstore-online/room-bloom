import { useEffect, useState } from "react";
import type { Quest, QuestRun } from "../types";
import { TYPE_META, DIFF_META } from "../data";
import { Confetti } from "./Confetti";

const MESSAGES = [
  "Outstanding work, adventurer! 🗡️",
  "Mission accomplished! The home thanks you! 🏠",
  "You crushed it! The dust never stood a chance! 🧹",
  "Quest complete! You are a true home hero! 🦸",
  "Legendary effort! Your domain is proud! 👑",
  "Victory! Another quest falls before you! ⚔️",
];

interface Props {
  quest: Quest;
  run: QuestRun;
  newBadges: { name: string; icon: string }[];
  gotBox: boolean;
  onContinue: () => void;
}

export function CompletionScreen({ quest, run, newBadges, gotBox, onContinue }: Props) {
  const [show, setShow] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  const meta = TYPE_META[quest.type];
  const diff = DIFF_META[quest.difficulty];

  useEffect(() => {
    const t1 = setTimeout(() => setShow(true), 50);
    const t2 = setTimeout(() => setConfettiActive(true), 100);
    const t3 = setTimeout(() => setConfettiActive(false), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <>
      <Confetti active={confettiActive} />
      <div
        className="fixed inset-0 z-40 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.7)" }}
      >
        <div
          className="w-full max-w-sm rounded-3xl overflow-hidden transition-all duration-500"
          style={{
            background: "var(--paper)",
            border: "2px solid var(--line)",
            transform: show ? "scale(1) translateY(0)" : "scale(0.8) translateY(40px)",
            opacity: show ? 1 : 0,
          }}
        >
          {/* Top banner */}
          <div
            className="py-8 px-6 text-center"
            style={{ background: `linear-gradient(135deg, ${meta.color}22, ${meta.color}44)` }}
          >
            <div className="text-6xl mb-3" style={{ animation: "bounce 0.6s ease 0.3s both" }}>
              {meta.icon}
            </div>
            <div className="text-2xl font-black mb-1" style={{ fontFamily: "Fraunces, serif" }}>
              Quest Complete!
            </div>
            <div className="text-sm font-semibold" style={{ color: meta.color }}>
              {quest.title}
            </div>
          </div>

          {/* Message */}
          <div className="px-6 pt-4 pb-2 text-center">
            <p className="text-sm font-semibold" style={{ color: "var(--muted)" }}>{message}</p>
          </div>

          {/* Rewards */}
          <div className="px-6 py-4 space-y-3">
            <div className="rounded-2xl p-4 space-y-2" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
                Rewards Earned
              </div>
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <div className="text-3xl">⚡</div>
                  <div className="font-black text-lg">+{run.xpEarned}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>XP</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl">🪙</div>
                  <div className="font-black text-lg">+{run.coinsEarned}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>Coins</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl">{"★".repeat(diff.stars)}</div>
                  <div className="font-black text-sm" style={{ color: diff.color }}>{diff.label}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>Difficulty</div>
                </div>
              </div>
            </div>

            {/* Mystery box */}
            {gotBox && (
              <div
                className="rounded-2xl p-3 flex items-center gap-3"
                style={{ background: "#FEF3C7", border: "1px solid #FCD34D" }}
              >
                <span className="text-3xl">📦</span>
                <div>
                  <div className="font-bold text-sm" style={{ color: "#92400E" }}>Mystery Box Earned!</div>
                  <div className="text-xs" style={{ color: "#B45309" }}>Open it in your inventory</div>
                </div>
              </div>
            )}

            {/* New badges */}
            {newBadges.map((b) => (
              <div key={b.name}
                className="rounded-2xl p-3 flex items-center gap-3"
                style={{ background: "#EDE9FE", border: "1px solid #C4B5FD" }}
              >
                <span className="text-3xl">{b.icon}</span>
                <div>
                  <div className="font-bold text-sm" style={{ color: "#5B21B6" }}>Badge Unlocked: {b.name}!</div>
                  <div className="text-xs" style={{ color: "#7C3AED" }}>Check your badges page</div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="px-6 pb-6">
            <button
              onClick={onContinue}
              className="w-full py-3 rounded-2xl font-bold text-white text-base"
              style={{ background: `linear-gradient(135deg, ${meta.color}, #8B5CF6)` }}
            >
              Continue Adventure →
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%   { transform: scale(0.5); opacity: 0; }
          60%  { transform: scale(1.2); }
          100% { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </>
  );
}
