import { useState, useEffect, useCallback } from "react";
import { Shell } from "./components/Shell";

// ─── Types ────────────────────────────────────────────────────────────────────

type FurnitureItem = {
  id: string;
  name: string;
  emoji: string;
  category: "bed" | "storage" | "lighting" | "decor" | "seating" | "plant" | "rug" | "window";
  cost: number;
  color?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex?: number;
};

type PlacedItem = FurnitureItem & {
  placedX: number;
  placedY: number;
  instanceId: string;
};

type Challenge = {
  id: string;
  title: string;
  description: string;
  reward: number;
  icon: string;
  condition: (room: PlacedItem[]) => boolean;
  completed: boolean;
};

type GameState = {
  coins: number;
  unlockedIds: string[];
  placedItems: PlacedItem[];
  completedChallengeIds: string[];
  roomColor: string;
  floorColor: string;
};

// ─── Furniture Catalog ────────────────────────────────────────────────────────

const CATALOG: FurnitureItem[] = [
  // Beds
  { id: "bed_single", name: "Single Bed", emoji: "🛏️", category: "bed", cost: 0, x: 0, y: 0, w: 120, h: 80 },
  { id: "bed_double", name: "Double Bed", emoji: "🛏️", category: "bed", cost: 80, x: 0, y: 0, w: 160, h: 100, color: "#8B5CF6" },
  { id: "bed_bunk", name: "Bunk Bed", emoji: "🛏️", category: "bed", cost: 150, x: 0, y: 0, w: 130, h: 90, color: "#F59E0B" },
  // Storage
  { id: "dresser", name: "Dresser", emoji: "🗄️", category: "storage", cost: 0, x: 0, y: 0, w: 80, h: 50 },
  { id: "wardrobe", name: "Wardrobe", emoji: "🚪", category: "storage", cost: 60, x: 0, y: 0, w: 90, h: 60 },
  { id: "bookshelf", name: "Bookshelf", emoji: "📚", category: "storage", cost: 40, x: 0, y: 0, w: 70, h: 110 },
  // Lighting
  { id: "lamp_floor", name: "Floor Lamp", emoji: "💡", category: "lighting", cost: 0, x: 0, y: 0, w: 40, h: 80 },
  { id: "lamp_string", name: "String Lights", emoji: "✨", category: "lighting", cost: 30, x: 0, y: 0, w: 100, h: 20 },
  { id: "chandelier", name: "Chandelier", emoji: "🕯️", category: "lighting", cost: 120, x: 0, y: 0, w: 60, h: 60 },
  // Decor
  { id: "poster", name: "Poster", emoji: "🖼️", category: "decor", cost: 0, x: 0, y: 0, w: 50, h: 70 },
  { id: "mirror", name: "Mirror", emoji: "🪞", category: "decor", cost: 50, x: 0, y: 0, w: 50, h: 80 },
  { id: "clock", name: "Wall Clock", emoji: "🕐", category: "decor", cost: 35, x: 0, y: 0, w: 50, h: 50 },
  { id: "trophy", name: "Trophy", emoji: "🏆", category: "decor", cost: 200, x: 0, y: 0, w: 40, h: 50 },
  { id: "globe", name: "Globe", emoji: "🌍", category: "decor", cost: 90, x: 0, y: 0, w: 45, h: 55 },
  // Seating
  { id: "desk_chair", name: "Desk Chair", emoji: "🪑", category: "seating", cost: 0, x: 0, y: 0, w: 60, h: 60 },
  { id: "bean_bag", name: "Bean Bag", emoji: "🫘", category: "seating", cost: 70, x: 0, y: 0, w: 70, h: 70 },
  { id: "sofa", name: "Mini Sofa", emoji: "🛋️", category: "seating", cost: 180, x: 0, y: 0, w: 130, h: 70 },
  // Plants
  { id: "cactus", name: "Cactus", emoji: "🌵", category: "plant", cost: 0, x: 0, y: 0, w: 35, h: 55 },
  { id: "monstera", name: "Monstera", emoji: "🪴", category: "plant", cost: 45, x: 0, y: 0, w: 55, h: 75 },
  { id: "bouquet", name: "Flower Vase", emoji: "💐", category: "plant", cost: 25, x: 0, y: 0, w: 35, h: 45 },
  { id: "bonsai", name: "Bonsai Tree", emoji: "🌳", category: "plant", cost: 110, x: 0, y: 0, w: 50, h: 65 },
  // Rugs
  { id: "rug_round", name: "Round Rug", emoji: "⭕", category: "rug", cost: 0, x: 0, y: 0, w: 100, h: 100 },
  { id: "rug_rect", name: "Area Rug", emoji: "🟫", category: "rug", cost: 55, x: 0, y: 0, w: 150, h: 90 },
  // Window
  { id: "window", name: "Window", emoji: "🪟", category: "window", cost: 0, x: 0, y: 0, w: 80, h: 90 },
  { id: "curtains", name: "Curtains", emoji: "🎭", category: "window", cost: 65, x: 0, y: 0, w: 90, h: 100 },
];

const ROOM_COLORS = [
  { label: "Lavender", value: "#EDE9FE" },
  { label: "Blush", value: "#FDE8E8" },
  { label: "Mint", value: "#D1FAE5" },
  { label: "Sky", value: "#DBEAFE" },
  { label: "Peach", value: "#FEF3C7" },
  { label: "Lilac", value: "#F3E8FF" },
  { label: "Sage", value: "#ECFDF5" },
  { label: "Rose", value: "#FFE4E6" },
];

const FLOOR_COLORS = [
  { label: "Oak", value: "#C8A97E" },
  { label: "Walnut", value: "#8B5E3C" },
  { label: "White", value: "#F5F5F5" },
  { label: "Tile", value: "#CBD5E1" },
  { label: "Dark", value: "#4B3621" },
  { label: "Bamboo", value: "#D4B896" },
];

// ─── Challenges ───────────────────────────────────────────────────────────────

const BASE_CHALLENGES: Omit<Challenge, "completed">[] = [
  {
    id: "first_item",
    title: "Getting Started",
    description: "Place your first furniture item",
    reward: 30,
    icon: "🌱",
    condition: (room) => room.length >= 1,
  },
  {
    id: "cozy_corner",
    title: "Cozy Corner",
    description: "Place a bed and a lamp",
    reward: 50,
    icon: "🌙",
    condition: (room) =>
      room.some((i) => i.category === "bed") &&
      room.some((i) => i.category === "lighting"),
  },
  {
    id: "green_thumb",
    title: "Green Thumb",
    description: "Add 2 plants to your room",
    reward: 40,
    icon: "🌿",
    condition: (room) => room.filter((i) => i.category === "plant").length >= 2,
  },
  {
    id: "storage_queen",
    title: "Storage Queen",
    description: "Add 2 storage items",
    reward: 45,
    icon: "📦",
    condition: (room) => room.filter((i) => i.category === "storage").length >= 2,
  },
  {
    id: "decorator",
    title: "Master Decorator",
    description: "Place 5 different items",
    reward: 60,
    icon: "🎨",
    condition: (room) => new Set(room.map((i) => i.id)).size >= 5,
  },
  {
    id: "couch_potato",
    title: "Lounge Vibes",
    description: "Add a sofa or bean bag",
    reward: 35,
    icon: "🛋️",
    condition: (room) => room.some((i) => i.id === "sofa" || i.id === "bean_bag"),
  },
  {
    id: "bookworm",
    title: "Bookworm",
    description: "Add a bookshelf to your room",
    reward: 40,
    icon: "📚",
    condition: (room) => room.some((i) => i.id === "bookshelf"),
  },
  {
    id: "full_room",
    title: "Dream Room",
    description: "Place 10 or more items",
    reward: 100,
    icon: "🌟",
    condition: (room) => room.length >= 10,
  },
  {
    id: "window_dresser",
    title: "Window Dresser",
    description: "Add curtains or a window",
    reward: 30,
    icon: "🪟",
    condition: (room) => room.some((i) => i.category === "window"),
  },
  {
    id: "rug_life",
    title: "Rug Life",
    description: "Add a rug to your room",
    reward: 35,
    icon: "🏡",
    condition: (room) => room.some((i) => i.category === "rug"),
  },
];

// ─── Default State ─────────────────────────────────────────────────────────────

const DEFAULT_STATE: GameState = {
  coins: 100,
  unlockedIds: ["bed_single", "dresser", "lamp_floor", "poster", "desk_chair", "cactus", "rug_round", "window"],
  placedItems: [],
  completedChallengeIds: [],
  roomColor: "#EDE9FE",
  floorColor: "#C8A97E",
};

const STORAGE_KEY = "roombloom_state";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_STATE;
}

function saveState(state: GameState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ─── Category Icons ───────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  bed: "🛏️",
  storage: "🗄️",
  lighting: "💡",
  decor: "🖼️",
  seating: "🪑",
  plant: "🌿",
  rug: "🟫",
  window: "🪟",
};

// ─── Nav Items ────────────────────────────────────────────────────────────────

type NavPage = "room" | "shop" | "challenges" | "customize";

const NAV_ITEMS: { id: NavPage; label: string; icon: string }[] = [
  { id: "room", label: "My Room", icon: "🏠" },
  { id: "shop", label: "Shop", icon: "🛍️" },
  { id: "challenges", label: "Challenges", icon: "🎯" },
  { id: "customize", label: "Customize", icon: "🎨" },
];

// ─── Room Canvas ──────────────────────────────────────────────────────────────

function RoomCanvas({
  placed,
  roomColor,
  floorColor,
  onRemove,
  onMove,
}: {
  placed: PlacedItem[];
  roomColor: string;
  floorColor: string;
  onRemove: (instanceId: string) => void;
  onMove: (instanceId: string, x: number, y: number) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const CANVAS_W = 560;
  const CANVAS_H = 400;
  const FLOOR_H = 280;

  const handleMouseDown = (e: React.MouseEvent, item: PlacedItem) => {
    e.stopPropagation();
    setSelected(item.instanceId);
    setDragging({
      id: item.instanceId,
      startX: e.clientX,
      startY: e.clientY,
      origX: item.placedX,
      origY: item.placedY,
    });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - dragging.startX;
      const dy = e.clientY - dragging.startY;
      const item = placed.find((p) => p.instanceId === dragging.id);
      if (!item) return;
      const newX = Math.max(0, Math.min(CANVAS_W - item.w, dragging.origX + dx));
      const newY = Math.max(0, Math.min(CANVAS_H - item.h, dragging.origY + dy));
      onMove(dragging.id, newX, newY);
    },
    [dragging, placed, onMove]
  );

  const handleMouseUp = () => setDragging(null);

  const handleTouchStart = (e: React.TouchEvent, item: PlacedItem) => {
    e.stopPropagation();
    const touch = e.touches[0];
    setSelected(item.instanceId);
    setDragging({
      id: item.instanceId,
      startX: touch.clientX,
      startY: touch.clientY,
      origX: item.placedX,
      origY: item.placedY,
    });
  };

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging) return;
      const touch = e.touches[0];
      const dx = touch.clientX - dragging.startX;
      const dy = touch.clientY - dragging.startY;
      const item = placed.find((p) => p.instanceId === dragging.id);
      if (!item) return;
      const newX = Math.max(0, Math.min(CANVAS_W - item.w, dragging.origX + dx));
      const newY = Math.max(0, Math.min(CANVAS_H - item.h, dragging.origY + dy));
      onMove(dragging.id, newX, newY);
    },
    [dragging, placed, onMove]
  );

  return (
    <div
      className="relative overflow-hidden rounded-2xl border select-none"
      style={{
        width: "100%",
        maxWidth: CANVAS_W,
        aspectRatio: `${CANVAS_W}/${CANVAS_H}`,
        borderColor: "var(--line)",
        cursor: dragging ? "grabbing" : "default",
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
      onClick={() => setSelected(null)}
    >
      {/* Wall */}
      <div
        className="absolute inset-0"
        style={{ background: roomColor, height: `${(CANVAS_H - FLOOR_H) / CANVAS_H * 100 + 70}%` }}
      />
      {/* Floor */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: "72%",
          background: `repeating-linear-gradient(90deg, ${floorColor} 0px, ${floorColor} 58px, ${adjustColor(floorColor, -15)} 58px, ${adjustColor(floorColor, -15)} 60px)`,
        }}
      />
      {/* Wall/floor divider */}
      <div
        className="absolute left-0 right-0"
        style={{ top: "28%", height: "3px", background: adjustColor(roomColor, -30), opacity: 0.5 }}
      />

      {/* Room items */}
      {[...placed]
        .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
        .map((item) => (
          <div
            key={item.instanceId}
            className="absolute flex items-center justify-center rounded-lg transition-shadow"
            style={{
              left: `${(item.placedX / CANVAS_W) * 100}%`,
              top: `${(item.placedY / CANVAS_H) * 100}%`,
              width: `${(item.w / CANVAS_W) * 100}%`,
              height: `${(item.h / CANVAS_H) * 100}%`,
              cursor: dragging?.id === item.instanceId ? "grabbing" : "grab",
              zIndex: dragging?.id === item.instanceId ? 100 : (item.zIndex || 1),
              boxShadow: selected === item.instanceId ? "0 0 0 2px #8B5CF6" : undefined,
              fontSize: `clamp(1.2rem, ${Math.min(item.w, item.h) / 40}rem, 3rem)`,
              background: selected === item.instanceId ? "rgba(139,92,246,0.08)" : "transparent",
              borderRadius: "0.5rem",
            }}
            onMouseDown={(e) => handleMouseDown(e, item)}
            onTouchStart={(e) => handleTouchStart(e, item)}
            onClick={(e) => { e.stopPropagation(); setSelected(item.instanceId); }}
          >
            <span style={{ fontSize: `clamp(1rem, ${Math.min(item.w, item.h) / 35}rem, 2.8rem)`, userSelect: "none" }}>
              {item.emoji}
            </span>
            {selected === item.instanceId && (
              <button
                className="absolute -top-3 -right-3 w-6 h-6 rounded-full text-white text-xs flex items-center justify-center shadow-lg z-50"
                style={{ background: "var(--error)", fontSize: "0.7rem" }}
                onClick={(e) => { e.stopPropagation(); onRemove(item.instanceId); setSelected(null); }}
              >
                ✕
              </button>
            )}
          </div>
        ))}

      {placed.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center" style={{ color: "var(--muted)" }}>
            <div className="text-4xl mb-2">🏠</div>
            <div className="text-sm font-medium">Your room is empty!</div>
            <div className="text-xs">Go to Shop to add furniture</div>
          </div>
        </div>
      )}
    </div>
  );
}

function adjustColor(hex: string, amount: number): string {
  try {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
    const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
    return `rgb(${r},${g},${b})`;
  } catch {
    return hex;
  }
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [state, setState] = useState<GameState>(loadState);
  const [page, setPage] = useState<NavPage>("room");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [toast, setToast] = useState<string | null>(null);
  const [coinAnim, setCoinAnim] = useState(false);

  // Persist state
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Check challenges
  useEffect(() => {
    const newCompleted: string[] = [];
    let coinsEarned = 0;

    BASE_CHALLENGES.forEach((ch) => {
      if (!state.completedChallengeIds.includes(ch.id) && ch.condition(state.placedItems)) {
        newCompleted.push(ch.id);
        coinsEarned += ch.reward;
      }
    });

    if (newCompleted.length > 0) {
      setState((prev) => ({
        ...prev,
        coins: prev.coins + coinsEarned,
        completedChallengeIds: [...prev.completedChallengeIds, ...newCompleted],
      }));
      setCoinAnim(true);
      const names = newCompleted.map((id) => BASE_CHALLENGES.find((c) => c.id === id)?.title).filter(Boolean);
      showToast(`🎉 Challenge complete: ${names.join(", ")}! +${coinsEarned} coins`);
      setTimeout(() => setCoinAnim(false), 600);
    }
  }, [state.placedItems, state.completedChallengeIds]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleBuy = (item: FurnitureItem) => {
    if (state.coins < item.cost) {
      showToast("❌ Not enough coins!");
      return;
    }
    setState((prev) => ({
      ...prev,
      coins: prev.coins - item.cost,
      unlockedIds: [...prev.unlockedIds, item.id],
    }));
    setCoinAnim(true);
    setTimeout(() => setCoinAnim(false), 600);
    showToast(`✅ Unlocked ${item.name}!`);
  };

  const handlePlace = (item: FurnitureItem) => {
    const newItem: PlacedItem = {
      ...item,
      placedX: Math.floor(Math.random() * 300 + 80),
      placedY: Math.floor(Math.random() * 200 + 80),
      instanceId: uid(),
      zIndex: state.placedItems.length + 1,
    };
    setState((prev) => ({ ...prev, placedItems: [...prev.placedItems, newItem] }));
    setPage("room");
    showToast(`🛏️ Placed ${item.name} in your room!`);
  };

  const handleRemove = (instanceId: string) => {
    setState((prev) => ({
      ...prev,
      placedItems: prev.placedItems.filter((i) => i.instanceId !== instanceId),
    }));
  };

  const handleMove = useCallback((instanceId: string, x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      placedItems: prev.placedItems.map((i) =>
        i.instanceId === instanceId ? { ...i, placedX: x, placedY: y } : i
      ),
    }));
  }, []);

  const challenges: Challenge[] = BASE_CHALLENGES.map((ch) => ({
    ...ch,
    completed: state.completedChallengeIds.includes(ch.id),
  }));

  const completedCount = challenges.filter((c) => c.completed).length;
  const categories = ["all", ...Array.from(new Set(CATALOG.map((i) => i.category)))];

  const filteredCatalog = filterCat === "all" ? CATALOG : CATALOG.filter((i) => i.category === filterCat);

  const sidebar = (
    <nav className="flex-1 px-3 space-y-1">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => setPage(item.id)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{
            background: page === item.id ? "var(--accent)" : "transparent",
            color: page === item.id ? "#fff" : "var(--ink)",
          }}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
          {item.id === "challenges" && completedCount > 0 && (
            <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--success)", color: "#fff" }}>
              {completedCount}/{challenges.length}
            </span>
          )}
        </button>
      ))}
      {/* Coin display */}
      <div
        className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
      >
        <span className={`text-xl transition-transform ${coinAnim ? "scale-125" : "scale-100"}`}>🪙</span>
        <span className="font-bold text-sm">{state.coins} coins</span>
      </div>
    </nav>
  );

  return (
    <Shell sidebar={sidebar}>
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-xs"
          style={{ background: "var(--ink)", color: "var(--paper)" }}
        >
          {toast}
        </div>
      )}

      {/* Mobile coin bar */}
      <div className="flex md:hidden items-center justify-between mb-4">
        <h1 className="text-xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>
          {NAV_ITEMS.find((n) => n.id === page)?.label}
        </h1>
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-transform ${coinAnim ? "scale-110" : "scale-100"}`}
          style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
        >
          <span>🪙</span> {state.coins}
        </div>
      </div>

      {/* ── Room Page ── */}
      {page === "room" && (
        <div className="space-y-4">
          <div className="hidden md:flex items-center justify-between">
            <h1 className="text-2xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>My Room</h1>
            <div className="text-sm" style={{ color: "var(--muted)" }}>
              {state.placedItems.length} item{state.placedItems.length !== 1 ? "s" : ""} placed · Tap to select, drag to move
            </div>
          </div>
          <div className="text-xs md:hidden" style={{ color: "var(--muted)" }}>
            Tap to select, drag to move, ✕ to remove
          </div>
          <RoomCanvas
            placed={state.placedItems}
            roomColor={state.roomColor}
            floorColor={state.floorColor}
            onRemove={handleRemove}
            onMove={handleMove}
          />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setPage("shop")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "var(--accent)" }}
            >
              🛍️ Add Furniture
            </button>
            <button
              onClick={() => setPage("customize")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
            >
              🎨 Customize Room
            </button>
            {state.placedItems.length > 0 && (
              <button
                onClick={() => { if (confirm("Clear your room?")) setState((p) => ({ ...p, placedItems: [] })); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--error)" }}
              >
                🗑️ Clear Room
              </button>
            )}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 mt-2">
            {[
              { label: "Items Placed", value: state.placedItems.length, icon: "🪑" },
              { label: "Challenges Done", value: completedCount, icon: "🎯" },
              { label: "Coins Earned", value: state.coins, icon: "🪙" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl p-3 text-center"
                style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
              >
                <div className="text-2xl">{stat.icon}</div>
                <div className="text-lg font-bold mt-1">{stat.value}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Shop Page ── */}
      {page === "shop" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="hidden md:block text-2xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>Furniture Shop</h1>
            <div className="text-sm font-medium" style={{ color: "var(--muted)" }}>
              🪙 {state.coins} coins available
            </div>
          </div>

          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all"
                style={{
                  background: filterCat === cat ? "var(--accent)" : "var(--panel)",
                  color: filterCat === cat ? "#fff" : "var(--ink)",
                  border: `1px solid ${filterCat === cat ? "var(--accent)" : "var(--line)"}`,
                }}
              >
                {cat === "all" ? "🏠 All" : `${CATEGORY_ICONS[cat] || "📦"} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredCatalog.map((item) => {
              const unlocked = state.unlockedIds.includes(item.id);
              const canAfford = state.coins >= item.cost;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl p-4 flex flex-col items-center gap-2 transition-all"
                  style={{
                    background: "var(--panel)",
                    border: `1px solid ${unlocked ? "var(--line)" : "var(--line)"}`,
                    opacity: unlocked ? 1 : 0.85,
                  }}
                >
                  <div className="text-4xl">{item.emoji}</div>
                  <div className="text-sm font-semibold text-center leading-tight">{item.name}</div>
                  <div className="text-xs capitalize px-2 py-0.5 rounded-full" style={{ background: "var(--paper)", color: "var(--muted)" }}>
                    {CATEGORY_ICONS[item.category]} {item.category}
                  </div>

                  {unlocked ? (
                    <button
                      onClick={() => handlePlace(item)}
                      className="w-full py-1.5 rounded-xl text-xs font-bold text-white mt-1"
                      style={{ background: "var(--success)" }}
                    >
                      ➕ Place in Room
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuy(item)}
                      disabled={!canAfford}
                      className="w-full py-1.5 rounded-xl text-xs font-bold mt-1 transition-opacity"
                      style={{
                        background: canAfford ? "var(--accent)" : "var(--line)",
                        color: canAfford ? "#fff" : "var(--muted)",
                        cursor: canAfford ? "pointer" : "not-allowed",
                      }}
                    >
                      🪙 {item.cost} coins
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Challenges Page ── */}
      {page === "challenges" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="hidden md:block text-2xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>Challenges</h1>
            <div
              className="px-3 py-1 rounded-full text-sm font-semibold"
              style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
            >
              {completedCount}/{challenges.length} complete
            </div>
          </div>

          {/* Progress bar */}
          <div className="rounded-2xl p-4" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Overall Progress</span>
              <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>
                {Math.round((completedCount / challenges.length) * 100)}%
              </span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(completedCount / challenges.length) * 100}%`,
                  background: "linear-gradient(90deg, var(--accent), #8B5CF6)",
                }}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {challenges.map((ch) => (
              <div
                key={ch.id}
                className="rounded-2xl p-4 flex items-start gap-3 transition-all"
                style={{
                  background: ch.completed ? "rgba(22,163,74,0.08)" : "var(--panel)",
                  border: `1px solid ${ch.completed ? "var(--success)" : "var(--line)"}`,
                }}
              >
                <div className="text-3xl shrink-0">{ch.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{ch.title}</span>
                    {ch.completed && <span className="text-xs">✅</span>}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{ch.description}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-xs font-bold" style={{ color: ch.completed ? "var(--success)" : "var(--warning)" }}>
                      🪙 +{ch.reward} coins
                    </span>
                    {ch.completed && (
                      <span className="text-xs ml-2" style={{ color: "var(--success)" }}>Earned!</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Customize Page ── */}
      {page === "customize" && (
        <div className="space-y-6">
          <h1 className="hidden md:block text-2xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>Customize Room</h1>

          {/* Wall Color */}
          <div className="rounded-2xl p-5" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
            <h2 className="font-semibold mb-3 flex items-center gap-2">🎨 Wall Color</h2>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {ROOM_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setState((p) => ({ ...p, roomColor: c.value }))}
                  className="flex flex-col items-center gap-1"
                  title={c.label}
                >
                  <div
                    className="w-10 h-10 rounded-xl transition-transform hover:scale-110"
                    style={{
                      background: c.value,
                      border: state.roomColor === c.value ? "3px solid var(--accent)" : "2px solid var(--line)",
                      transform: state.roomColor === c.value ? "scale(1.1)" : undefined,
                    }}
                  />
                  <span className="text-xs" style={{ color: "var(--muted)" }}>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Floor Color */}
          <div className="rounded-2xl p-5" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
            <h2 className="font-semibold mb-3 flex items-center gap-2">🪵 Floor Style</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {FLOOR_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setState((p) => ({ ...p, floorColor: c.value }))}
                  className="flex flex-col items-center gap-1"
                  title={c.label}
                >
                  <div
                    className="w-14 h-10 rounded-xl transition-transform hover:scale-110"
                    style={{
                      background: `repeating-linear-gradient(90deg, ${c.value} 0px, ${c.value} 12px, ${adjustColor(c.value, -15)} 12px, ${adjustColor(c.value, -15)} 14px)`,
                      border: state.floorColor === c.value ? "3px solid var(--accent)" : "2px solid var(--line)",
                      transform: state.floorColor === c.value ? "scale(1.1)" : undefined,
                    }}
                  />
                  <span className="text-xs" style={{ color: "var(--muted)" }}>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-2xl p-5" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
            <h2 className="font-semibold mb-3">👁️ Live Preview</h2>
            <RoomCanvas
              placed={state.placedItems}
              roomColor={state.roomColor}
              floorColor={state.floorColor}
              onRemove={handleRemove}
              onMove={handleMove}
            />
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around h-16 border-t z-40"
        style={{ background: "var(--dock)", borderColor: "var(--line)" }}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all"
            style={{ color: page === item.id ? "var(--accent)" : "var(--muted)" }}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Mobile bottom padding */}
      <div className="h-20 md:hidden" />
    </Shell>
  );
}
