import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { Mascot } from "@/components/Mascot";
import { Card, formatNum } from "@/components/common";
import { computeStreak } from "@/logic/streak";
import { rankFor } from "@/logic/ranks";
import { ACHIEVEMENTS } from "@/data/achievements";
import { FACTS } from "@/data/facts";
import { equippedAccessory, totalTurtles } from "@/store/selectors";

export function Profile() {
  const nav = useNavigate();
  const profile = useStore((s) => s.profile);
  const wallet = useStore((s) => s.wallet);
  const entries = useStore((s) => s.entries);
  const inventory = useStore((s) => s.inventory);
  const factsRead = useStore((s) => s.factsRead);
  const achievements = useStore((s) => s.achievements);
  const shields = useStore((s) => s.shields);

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
    { label: "Facts read", value: `${Object.keys(factsRead).length}/${FACTS.length}`, emoji: "📖" },
    { label: "Days repaired", value: repaired, emoji: "🩹" },
    { label: "AI rescued", value: rescued, emoji: "✨" },
    { label: "Shields used", value: shieldedUsed, emoji: "🛡️" },
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
            <div className="progress"><div style={{ width: `${Math.min(100, (total / next.min) * 100)}%` }} /></div>
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
