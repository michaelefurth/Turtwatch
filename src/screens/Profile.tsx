import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { Mascot } from "@/components/Mascot";
import { Card, formatNum } from "@/components/common";
import { computeStreak } from "@/logic/streak";
import { rankFor } from "@/logic/ranks";
import { ACHIEVEMENTS } from "@/data/achievements";
import { TOTAL_CARDS } from "@/logic/booster";
import { ALL_FACT_CARDS, RARITY, factCardById, type CardRarity } from "@/data/factCards";
import { destinationFor, reachedCount, questStreakDisplay } from "@/logic/quest";
import { todayKey, yesterdayKey } from "@/logic/dates";
import { equippedAccessory, totalTurtles } from "@/store/selectors";

const RARITY_TOTALS: Record<CardRarity, number> = ALL_FACT_CARDS.reduce((m, c) => {
  m[c.rarity] = (m[c.rarity] ?? 0) + 1;
  return m;
}, {} as Record<CardRarity, number>);
const RARITY_ORDER: CardRarity[] = ["common", "rare", "epic", "legendary"];
// Stable empty default so the selector never returns a fresh {} (which would make
// useSyncExternalStore loop forever -> React #185 "max update depth exceeded").
const EMPTY_COLLECTION: Record<string, number> = {};

export function Profile() {
  const nav = useNavigate();
  const profile = useStore((s) => s.profile);
  const wallet = useStore((s) => s.wallet);
  const entries = useStore((s) => s.entries);
  const inventory = useStore((s) => s.inventory);
  const achievements = useStore((s) => s.achievements);
  const shields = useStore((s) => s.shields);
  const gamesWon = useStore((s) => s.gamesWon ?? 0);
  const mantrasFocused = useStore((s) => s.mantrasFocused ?? 0);
  const collection = useStore((s) => s.collection) ?? EMPTY_COLLECTION;
  const quest = useStore((s) => s.quest);
  const collected = Object.keys(collection).length;

  const ownedByRarity = useMemo(() => {
    const counts: Record<CardRarity, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };
    for (const id of Object.keys(collection)) {
      const r = factCardById(id)?.rarity;
      if (r) counts[r]++;
    }
    return RARITY_ORDER.map((r) => ({ rarity: r, owned: counts[r], total: RARITY_TOTALS[r] ?? 0 }));
  }, [collection]);
  const questSteps = quest?.steps ?? 0;
  const dest = destinationFor(questSteps);
  const goalStreak = questStreakDisplay(quest, todayKey(), yesterdayKey());

  const streak = useMemo(() => computeStreak(entries), [entries]);
  const total = totalTurtles(entries);
  const { rank, next, toNext } = rankFor(total);
  const accessory = equippedAccessory(inventory);

  const list = Object.values(entries);
  const repaired = list.filter((e) => e.state === "repaired").length;
  const rescued = list.filter((e) => e.state === "ai_rescued").length;
  const shieldedUsed = shields.filter((s) => s.status === "used").length;

  const stats = [
    { label: "Turtles", value: total, emoji: "🐢" },
    { label: "Current streak", value: streak.current, emoji: "🔥" },
    { label: "Longest streak", value: streak.longest, emoji: "🏆" },
    { label: "Cards collected", value: `${collected}/${TOTAL_CARDS}`, emoji: "🃏" },
    { label: "Days repaired", value: repaired, emoji: "🩹" },
    { label: "AI rescued", value: rescued, emoji: "✨" },
    { label: "Shields used", value: shieldedUsed, emoji: "🛡️" },
    { label: "Games won", value: gamesWon, emoji: "🎴" },
    { label: "Mantras focused", value: mantrasFocused, emoji: "🧘" },
    { label: "Lifetime earned", value: formatNum(wallet.lifetimeEarned), emoji: "🪙" },
  ];

  return (
    <div className="screen stack">
      <div className="between">
        <h1>Profile</h1>
        <button className="chip outline" onClick={() => nav("/settings")}>⚙️ Settings</button>
      </div>

      <Card className="center">
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Mascot mascot={profile.mascot} mood="happy" accessory={accessory} size={110} />
        </div>
        <h2 style={{ marginBottom: 2 }}>{profile.displayName}</h2>
        <div className="row" style={{ justifyContent: "center" }}>
          <span className="chip">{rank.emoji} {rank.name}</span>
          <span className="chip gold">🪙 {formatNum(wallet.balance)}</span>
        </div>
        {next && (
          <div style={{ marginTop: 12 }}>
            <div className="progress"><div style={{ width: `${Math.min(100, Math.max(0, ((total - rank.min) / (next.min - rank.min)) * 100))}%` }} /></div>
            <span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>{toNext} more turtle{toNext === 1 ? "" : "s"} → {next.emoji} {next.name}</span>
          </div>
        )}
      </Card>

      <h2 style={{ marginBottom: 0 }}>Stats</h2>
      <div className="stat-grid">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <b>{s.emoji} {s.value}</b>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      <h2 style={{ marginBottom: 0 }}>Journey 🗺️</h2>
      <Card className="flat" onClick={() => nav("/quest")}>
        <div className="between">
          <div>
            <b>{reachedCount(questSteps)} place{reachedCount(questSteps) === 1 ? "" : "s"} explored</b>
            <div className="muted" style={{ fontSize: 13 }}>
              {quest ? `Heading to ${dest.emoji} ${dest.name}` : "Start your trek — set a daily goal →"}
            </div>
          </div>
          <span className="chip">🔥 {goalStreak}</span>
        </div>
      </Card>

      <h2 style={{ marginBottom: 0 }}>Collection 🃏</h2>
      <Card className="flat stack" onClick={() => nav("/facts")}>
        <div className="between">
          <b>{collected}/{TOTAL_CARDS} cards</b>
          <span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>tap to open packs →</span>
        </div>
        {ownedByRarity.map((r) => (
          <div key={r.rarity}>
            <div className="between" style={{ fontSize: 12, fontWeight: 800 }}>
              <span style={{ color: RARITY[r.rarity].color === "#f6c453" ? "#8a5d00" : "var(--text)" }}>{RARITY[r.rarity].label}</span>
              <span className="muted">{r.owned}/{r.total}</span>
            </div>
            <div className="progress" style={{ height: 8, marginTop: 3 }}>
              <div style={{ width: `${r.total ? (r.owned / r.total) * 100 : 0}%`, background: RARITY[r.rarity].color }} />
            </div>
          </div>
        ))}
      </Card>

      <h2 style={{ marginBottom: 0 }}>Achievements</h2>
      <div className="grid2">
        {ACHIEVEMENTS.map((a) => {
          const earned = !!achievements[a.id];
          return (
            <Card key={a.id} className="tight" >
              <div className="row" style={{ opacity: earned ? 1 : 0.45 }}>
                <span style={{ fontSize: 28, filter: earned ? "none" : "grayscale(1)" }}>{a.emoji}</span>
                <div>
                  <b style={{ fontSize: 14 }}>{a.title}</b>
                  <div className="muted" style={{ fontSize: 11 }}>{earned ? a.description : "🔒 " + a.description}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
