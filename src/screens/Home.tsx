import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { useFeedback } from "@/components/feedback";
import { Mascot, type MascotMood } from "@/components/Mascot";
import { StreakRing } from "@/components/StreakRing";
import { Card, PillButton, TurtbuxChip } from "@/components/common";
import { computeStreak, mostRecentMissedDay } from "@/logic/streak";
import { todayKey, prettyDate } from "@/logic/dates";
import { FACTS } from "@/data/facts";
import { equippedAccessory, equippedFrame, findMemory } from "@/store/selectors";

const LINES = {
  done: ["We did it again! 🎉", "Another turtle in the books! 📚", "Look at us go! 🌟", "Pond duty: complete! ✅"],
  risk: ["Quick, before midnight! ⏰", "Don't let our streak nap! 🙇", "One photo saves the day! 📸"],
  lapsed: ["Welcome back — I missed you 💚", "The pond was quiet without you 🌙", "No worries, let's start again 🌱"],
  idle: ["Ready for today's turtle? 🐢", "What's today's turtle up to? 🌿", "I've been basking, you? ☀️", "Got a turtle for me? 📸"],
};

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

export function Home() {
  const nav = useNavigate();
  const { toast } = useFeedback();
  const entries = useStore((s) => s.entries);
  const profile = useStore((s) => s.profile);
  const balance = useStore((s) => s.wallet.balance);
  const inventory = useStore((s) => s.inventory);
  const autoApplyShield = useStore((s) => s.autoApplyShield);
  const claimFactOfDay = useStore((s) => s.claimFactOfDay);
  const factClaimedOn = useStore((s) => s.factOfDayClaimedOn);

  const streak = useMemo(() => computeStreak(entries), [entries]);
  const today = todayKey();
  const todayEntry = entries[today];
  const accessory = equippedAccessory(inventory);
  const mascotName = profile.mascotName || (profile.mascot === "turtley" ? "Turtley" : "Shelldon");

  // lapsed user: streak is broken but they have history → offer recovery
  const hasHistory = Object.keys(entries).length > 0;
  const lapsed = !todayEntry && streak.current === 0 && hasHistory;
  const missedDay = lapsed ? mostRecentMissedDay(entries) : undefined;

  // auto-apply a Shell Shield to a missed day on first load (default behavior)
  const ranAuto = useRef(false);
  useEffect(() => {
    if (ranAuto.current) return;
    ranAuto.current = true;
    const protectedDay = autoApplyShield();
    if (protectedDay) toast("Shell Shield saved your streak! 🛡️", "🛡️");
  }, [autoApplyShield, toast]);

  const mood: MascotMood = todayEntry
    ? "excited"
    : streak.atRisk
    ? "worried"
    : lapsed
    ? "sleepy"
    : "happy";

  const lineSet = todayEntry ? LINES.done : streak.atRisk ? LINES.risk : lapsed ? LINES.lapsed : LINES.idle;
  const mascotSays = lineSet[hashStr(today) % lineSet.length];
  const frame = equippedFrame(inventory) ?? "";
  const memory = useMemo(() => (todayEntry ? findMemory(entries, today) : undefined), [entries, today, todayEntry]);

  // deterministic fact-of-the-day (hash of full date, not day-of-month)
  const fact = FACTS[hashStr(today) % FACTS.length];

  const openFactOfDay = () => {
    const reward = claimFactOfDay();
    if (reward > 0) toast(`+${reward} Turtbux — fact of the day! 🪙`, "📖");
    nav("/facts");
  };

  return (
    <div className="screen stack">
      <div className="between">
        <div>
          <h1>Hi, {profile.displayName}! 🌿</h1>
          <span className="muted" style={{ fontWeight: 700 }}>{prettyDate(today)}</span>
        </div>
        <TurtbuxChip balance={balance} />
      </div>

      <Card className="center">
        <div className="speech">{mascotName} says: “{mascotSays}”</div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
          <Mascot mascot={profile.mascot} mood={mood} accessory={accessory} size={96} wave={lapsed} interactive />
        </div>
        <StreakRing current={streak.current} longest={streak.longest} atRisk={streak.atRisk} />
      </Card>

      {lapsed && missedDay && (
        <Card>
          <div className="row">
            <span style={{ fontSize: 30 }}>💤</span>
            <div className="grow">
              <h3 style={{ margin: 0 }}>Welcome back!</h3>
              <span className="muted" style={{ fontSize: 13 }}>
                Your streak history is safe (longest: {streak.longest}). Repair a missed day or just start fresh today.
              </span>
            </div>
          </div>
          <div className="mt">
            <PillButton variant="secondary" small onClick={() => nav(`/repair/${missedDay}`)}>🩹 Repair a missed day</PillButton>
          </div>
        </Card>
      )}

      {todayEntry ? (
        <Card>
          <div className="between">
            <h2 style={{ margin: 0 }}>Done for today! 🎉</h2>
            <span className="muted" style={{ fontWeight: 800 }}>+{todayEntry.earnedTurtbux} 🪙</span>
          </div>
          <div className="row mt" style={{ alignItems: "flex-start" }}>
            {todayEntry.photoUrl && (
              <img src={todayEntry.photoUrl} alt="today's turtle" className={frame} style={{ width: 86, height: 86, borderRadius: 16, objectFit: "cover" }} />
            )}
            <div className="grow">
              <b>{todayEntry.turtleName || "Today's turtle"}</b>
              <div className="muted" style={{ fontSize: 13 }}>{todayEntry.notes || "No notes today."}</div>
            </div>
          </div>
          <div className="mt">
            <PillButton variant="secondary" small onClick={() => nav(`/day/${today}`)}>View / edit</PillButton>
          </div>
        </Card>
      ) : (
        <Card className="center">
          <h2 style={{ marginBottom: 2 }}>No turtle yet today 🐢</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            {streak.atRisk ? "Your streak naps at midnight — quick!" : "Upload one to keep your streak going."}
          </p>
          <PillButton onClick={() => nav("/upload")}>📸 Upload today's turtle</PillButton>
        </Card>
      )}

      {memory && (
        <Card onClick={() => nav(`/day/${memory.entry.date}`)} className="flat">
          <div className="row">
            {memory.entry.photoUrl ? (
              <img src={memory.entry.photoUrl} alt="" aria-hidden className={frame} style={{ width: 54, height: 54, borderRadius: 12, objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 30 }} aria-hidden>🛡️</span>
            )}
            <div className="grow">
              <h3 style={{ margin: 0 }}>{memory.label}</h3>
              <span className="muted" style={{ fontSize: 13 }}>{memory.entry.turtleName || "A lovely turtle"} →</span>
            </div>
          </div>
        </Card>
      )}

      <Card onClick={openFactOfDay} className="flat">
        <div className="between">
          <div className="row">
            <span style={{ fontSize: 30 }} aria-hidden>{fact.emoji}</span>
            <div>
              <h3 style={{ margin: 0 }}>Turtle fact of the day</h3>
              <span className="muted" style={{ fontSize: 13 }}>{fact.title} →</span>
            </div>
          </div>
          {factClaimedOn !== today ? (
            <span className="chip gold">🪙 +2</span>
          ) : (
            <span className="chip">Read ✓</span>
          )}
        </div>
      </Card>

      <div className="between">
        <PillButton variant="secondary" small onClick={() => nav("/calendar")}>📅 Calendar</PillButton>
        <PillButton variant="secondary" small onClick={() => nav("/shop")}>🛍️ Shop</PillButton>
        <PillButton variant="secondary" small onClick={() => nav("/settings")}>⚙️ Settings</PillButton>
      </div>
    </div>
  );
}
