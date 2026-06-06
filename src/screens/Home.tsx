import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { useFeedback } from "@/components/feedback";
import { Mascot, type MascotMood } from "@/components/Mascot";
import { StreakRing } from "@/components/StreakRing";
import { Card, PillButton, TurtbuxChip, TurtlePhoto, formatNum } from "@/components/common";
import { GearIcon, BookIcon } from "@/components/icons";
import { computeStreak, mostRecentMissedDay } from "@/logic/streak";
import { FACT_OF_DAY } from "@/logic/turtbux";
import { EGG_COST, hatchlingById } from "@/data/hatchlings";
import { todayKey, prettyDate } from "@/logic/dates";
import { FACTS } from "@/data/facts";
import { equippedAccessory, equippedFrame, equippedSticker, findMemory, weeklyRecap } from "@/store/selectors";
import { STICKER_EMOJI } from "@/data/shopItems";
import { pick, GREETINGS, seasonalHint } from "@/lib/variety";

const tod = () => { const h = new Date().getHours(); return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening"; };

const LINES = {
  done: ["We did it again! 🎉", "Another turtle in the books! 📚", "Look at us go! 🌟", "Pond duty: complete! ✅", "Top-tier turtle energy! 🏆", "Shell yeah, a keeper! 🐢", "I am SO proud of you 💚"],
  risk: ["Quick, before midnight! ⏰", "Don't let our streak nap! 🙇", "One photo saves the day! 📸", "The streak is sleepy — wake it! 🛎️", "Midnight's creeping closer… 🌕"],
  lapsed: ["Welcome back — I missed you 💚", "The pond was quiet without you 🌙", "No worries, let's start again 🌱", "Every comeback starts with one turtle 🐢", "I kept your lily pad warm 🌸"],
  idle: ["Ready for today's turtle? 🐢", "What's today's turtle up to? 🌿", "I've been basking, you? ☀️", "Got a turtle for me? 📸", "I saved you the sunniest lily pad 🌸", "Shell we get started? 🐢", `Lovely ${tod()} for a turtle! 🌊`],
};

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

export function Home() {
  const nav = useNavigate();
  const { toast, celebrate } = useFeedback();
  const entries = useStore((s) => s.entries);
  const profile = useStore((s) => s.profile);
  const balance = useStore((s) => s.wallet.balance);
  const inventory = useStore((s) => s.inventory);
  const autoApplyShield = useStore((s) => s.autoApplyShield);
  const claimFactOfDay = useStore((s) => s.claimFactOfDay);
  const claimLoginBonus = useStore((s) => s.claimLoginBonus);
  const factClaimedOn = useStore((s) => s.factOfDayClaimedOn);

  const ledger = useStore((s) => s.ledger);
  const prefs = useStore((s) => s.prefs);
  const updatePrefs = useStore((s) => s.updatePrefs);
  const quest = useStore((s) => s.quest);
  const mantraState = useStore((s) => s.mantra);
  const lastBoosterOn = useStore((s) => s.lastBoosterOn);
  const hatch = useStore((s) => s.hatch) ?? { care: 0, collection: {}, total: 0 };
  const lastNurseryNudgeOn = useStore((s) => s.lastNurseryNudgeOn);
  const markNurseryNudge = useStore((s) => s.markNurseryNudge);
  const markPerfectDay = useStore((s) => s.markPerfectDay);
  const companion = hatch.companion ? hatchlingById(hatch.companion) : undefined;
  const recap = useMemo(() => weeklyRecap({ entries, ledger }), [entries, ledger]);
  const streak = useMemo(() => computeStreak(entries), [entries]);
  const today = todayKey();
  const todayEntry = entries[today];
  const gentle = prefs.gentleStreak;
  const focus = prefs.focusMode;

  // "Today's pond" quick wins — clear, small, satisfying (ADHD-friendly)
  const wins = [
    { key: "turtle", emoji: "📸", label: "Today's turtle", done: !!todayEntry, to: "/upload" },
    { key: "goal", emoji: "🎯", label: "A daily goal", done: quest?.lastCompletedDate === today, to: "/quest" },
    { key: "mantra", emoji: "🧘", label: "A mantra breath", done: mantraState?.date === today, to: "/mantras" },
    { key: "pack", emoji: "🃏", label: "Open a card pack", done: lastBoosterOn === today, to: "/facts" },
  ];
  const winsDone = wins.filter((w) => w.done).length;
  const allDone = winsDone === wins.length;
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
    const bonus = claimLoginBonus();
    if (bonus > 0) toast(`Welcome back! Daily bonus +${bonus} 🪙`, "🎁");
    const protectedDay = autoApplyShield();
    if (protectedDay) setTimeout(() => toast("Shell Shield saved your streak! 🛡️", "🛡️"), bonus > 0 ? 350 : 0);
    // gentle, once-a-day nudge when an egg is ready to hatch (no pressure)
    if (hatch.care >= EGG_COST && lastNurseryNudgeOn !== today) {
      markNurseryNudge();
      setTimeout(() => toast("An egg is ready to hatch in your nursery 🥚", "🐣"), 700);
    }
  }, [autoApplyShield, claimLoginBonus, toast, hatch.care, lastNurseryNudgeOn, markNurseryNudge, today]);

  // celebrate completing all of today's quick wins, once per day
  const celebratedPerfect = useRef(false);
  useEffect(() => {
    if (!allDone || celebratedPerfect.current) return;
    celebratedPerfect.current = true;
    if (markPerfectDay()) {
      celebrate(["🌟", "🐢", "💚", "✨", "🌿"]);
      const n = useStore.getState().perfectDays ?? 0;
      setTimeout(() => toast(`Perfect pond day! 🌟${n > 1 ? ` · ${n} total` : ""}`, "🐢"), 300);
    }
  }, [allDone, markPerfectDay, celebrate, toast]);

  // gentle mode never shows the "worried" (streak-at-risk) face — no pressure
  const mood: MascotMood = todayEntry
    ? streak.current >= 7
      ? "proud"
      : "excited"
    : streak.atRisk && !gentle
    ? "worried"
    : lapsed
    ? "sleepy"
    : "happy";

  const stateKey = todayEntry ? "done" : (streak.atRisk && !gentle) ? "risk" : lapsed ? "lapsed" : "idle";
  // fresh on each visit, stable within a visit
  const mascotSays = useMemo(() => pick(LINES[stateKey]), [stateKey]);
  const greeting = useMemo(() => pick(GREETINGS)(profile.displayName), [profile.displayName]);
  const seasonal = !accessory ? seasonalHint() : null;
  const frame = equippedFrame(inventory) ?? "";
  const sticker = STICKER_EMOJI[equippedSticker(inventory) ?? ""];
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
          <h1>{greeting}</h1>
          <span className="muted" style={{ fontWeight: 700 }}>{prettyDate(today)}</span>
        </div>
        <TurtbuxChip balance={balance} />
      </div>

      <div className="row gap8" style={{ alignSelf: "flex-start" }}>
        <button
          className={`chip ${focus ? "selected" : "outline"}`}
          aria-pressed={focus}
          aria-label={`Focus mode ${focus ? "on" : "off"}`}
          onClick={() => updatePrefs({ focusMode: !focus })}
        >
          <span aria-hidden>🎯</span> Focus mode{focus ? " on" : ""}
        </button>
        {/* keep Settings reachable even when focus mode hides the shortcuts row */}
        {focus && <button className="chip outline icon-chip" aria-label="Settings" onClick={() => nav("/settings")}><GearIcon size={15} /></button>}
      </div>

      <Card className="center">
        <div className="speech">{mascotName} says: “{mascotSays}”</div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 4, position: "relative" }}>
          <Mascot mascot={profile.mascot} mood={mood} accessory={accessory} size={96} wave={lapsed} interactive />
          {seasonal && <span aria-hidden style={{ position: "absolute", top: -2, right: "32%", fontSize: 20 }}>{seasonal}</span>}
          {companion && (
            <span aria-label={`Companion ${companion.name}`} style={{ position: "absolute", bottom: -2, right: "26%", fontSize: 32, lineHeight: 1 }}>
              🐢<span aria-hidden style={{ position: "absolute", top: -5, right: -7, fontSize: 16 }}>{companion.outfit}</span>
            </span>
          )}
        </div>
        {companion && <div className="muted" style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>with {companion.name} {companion.outfit}</div>}
        <StreakRing current={streak.current} longest={streak.longest} atRisk={streak.atRisk} gentle={gentle} />
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
              <TurtlePhoto src={todayEntry.photoUrl} frameClass={frame} sticker={sticker} size={86} />
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
            {gentle
              ? "Whenever you're ready — one little photo when it suits you 🌿"
              : streak.atRisk
              ? "Your streak naps at midnight — quick!"
              : "Upload one to keep your streak going."}
          </p>
          <PillButton onClick={() => nav("/upload")}>📸 Upload today's turtle</PillButton>
          {(() => {
            // neutral time anchor (ADHD time-blindness) — shown in gentle mode too
            const mins = Math.floor((new Date(today + "T23:59:59").getTime() - Date.now()) / 60000);
            return mins > 0 && mins < 600 ? (
              <p className="muted" style={{ fontSize: 12, margin: "8px 0 0" }}>🕐 {Math.floor(mins / 60)}h {mins % 60}m left today</p>
            ) : null;
          })()}
        </Card>
      )}

      {/* Today's pond — clear, satisfying quick wins */}
      <Card className="stack">
        <div className="between">
          <b>Today's pond 🌊</b>
          <span className={`chip ${allDone ? "gold" : ""}`}>{winsDone}/{wins.length}{allDone ? " 🌟" : ""}</span>
        </div>
        {wins.map((w) => (
          <button key={w.key} className="task-row" style={{ width: "100%", border: "none", textAlign: "left", cursor: "pointer" }} onClick={() => nav(w.to)} aria-label={`${w.label}${w.done ? " (done)" : ""}`}>
            <span className={`task-check ${w.done ? "done" : ""}`} aria-hidden>{w.done ? "✓" : ""}</span>
            <span className="grow" aria-hidden>{w.emoji} <span className={w.done ? "task-done" : ""} style={{ fontWeight: 700 }}>{w.label}</span></span>
            {!w.done && <span className="muted" style={{ fontSize: 18 }} aria-hidden>›</span>}
          </button>
        ))}
        {allDone && <p className="muted center" style={{ fontSize: 13, margin: 0, fontWeight: 700 }}>🌟 All done — a perfect pond day!</p>}
      </Card>

      {!focus && (<>
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

      <Card onClick={() => nav("/calendar")} className="flat">
        <div className="between">
          <b>This week 🗓️</b>
          <span className="muted" style={{ fontSize: 12, fontWeight: 800 }}>{recap.covered}/7 · +{formatNum(recap.earned)} 🪙</span>
        </div>
        <div className="week-dots mt-sm" aria-hidden>
          {recap.days.map((d) => (
            <span key={d.key} className={`week-dot ${d.done ? "on" : ""} ${d.key === today ? "today" : ""}`} />
          ))}
        </div>
      </Card>

      <Card onClick={() => nav("/nursery")} className="flat">
        <div className="between">
          <div className="row">
            <span style={{ fontSize: 30 }} aria-hidden>{hatch.care >= EGG_COST ? "🐣" : "🥚"}</span>
            <div>
              <h3 style={{ margin: 0 }}>Nursery</h3>
              <span className="muted" style={{ fontSize: 13 }}>{hatch.care >= EGG_COST ? "An egg is ready to hatch!" : "Care for an egg → hatch a turtle in an outfit"}</span>
            </div>
          </div>
          <span className={`chip ${hatch.care >= EGG_COST ? "gold" : ""}`}>{hatch.care >= EGG_COST ? "Hatch! 🐣" : `${hatch.care % EGG_COST}/${EGG_COST}`}</span>
        </div>
      </Card>

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
            <span className="chip gold">🪙 +{FACT_OF_DAY}</span>
          ) : (
            <span className="chip">Read ✓</span>
          )}
        </div>
      </Card>

      <Card onClick={() => nav("/quest")} className="flat">
        <div className="between">
          <div className="row">
            <span style={{ fontSize: 30 }} aria-hidden>🗺️</span>
            <div>
              <h3 style={{ margin: 0 }}>Turtle Trek</h3>
              <span className="muted" style={{ fontSize: 13 }}>Tick off daily goals → journey to new places + earn 🪙</span>
            </div>
          </div>
          <span className="chip">Goals 🎯</span>
        </div>
      </Card>

      <Card onClick={() => nav("/play")} className="flat">
        <div className="between">
          <div className="row">
            <span style={{ fontSize: 30 }} aria-hidden>🎴</span>
            <div>
              <h3 style={{ margin: 0 }}>Turtle Flip</h3>
              <span className="muted" style={{ fontSize: 13 }}>A calm match game with your turtles → earn 🪙</span>
            </div>
          </div>
          <span className="chip">Relax 🌿</span>
        </div>
      </Card>

      <Card onClick={() => nav("/mantras")} className="flat">
        <div className="between">
          <div className="row">
            <span style={{ fontSize: 30 }} aria-hidden>🧘</span>
            <div>
              <h3 style={{ margin: 0 }}>Turtle Mantras</h3>
              <span className="muted" style={{ fontSize: 13 }}>Breathe through a positive mantra → earn 🪙</span>
            </div>
          </div>
          <span className="chip">Focus 🌸</span>
        </div>
      </Card>

      <div className="between">
        <PillButton variant="secondary" small onClick={() => nav("/calendar")}>📅 Calendar</PillButton>
        <PillButton variant="secondary" small onClick={() => nav("/feed")}><BookIcon size={16} /> Diary</PillButton>
        <PillButton variant="secondary" small onClick={() => nav("/settings")}><GearIcon size={16} /> Settings</PillButton>
      </div>
      </>)}
    </div>
  );
}
