import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { useFeedback } from "@/components/feedback";
import { Card, PillButton } from "@/components/common";
import { shuffledMantras, FOCUS_OPTIONS, MANTRA_REWARD, MANTRA_DAILY_CAP } from "@/logic/mantras";
import { todayKey } from "@/logic/dates";

export function Mantras() {
  const nav = useNavigate();
  const { toast } = useFeedback();
  const award = useStore((s) => s.awardMantraReward);
  const mantraState = useStore((s) => s.mantra);

  const list = useMemo(() => shuffledMantras(), []);
  const [idx, setIdx] = useState(0);
  const [duration, setDuration] = useState(30);
  const [remaining, setRemaining] = useState(30);
  const [running, setRunning] = useState(false);
  const [focused, setFocused] = useState(0); // completed this session
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef = useRef(false); // guards reward against double-fire / pause-at-zero

  const mantra = list[idx % list.length];
  const earnedToday = mantraState?.date === todayKey() ? mantraState.earned : 0;

  // countdown
  useEffect(() => {
    if (!running) return;
    tick.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) return 0;
        return r - 1;
      });
    }, 1000);
    return () => { if (tick.current) clearInterval(tick.current); };
  }, [running]);

  // on completion: reward + advance. Uses a ref (not `running`) so pausing at the
  // last second still pays out, and StrictMode's double-invoke can't double-award.
  useEffect(() => {
    if (remaining !== 0) {
      doneRef.current = false;
      return;
    }
    if (doneRef.current) return;
    doneRef.current = true;
    const reward = award(MANTRA_REWARD);
    toast(reward > 0 ? `+${reward} Turtbux · breathe 🌿` : "Daily focus reward maxed — stay a while 🌿", "🧘");
    setFocused((f) => f + 1);
    setIdx((i) => i + 1);
    setRemaining(duration);
  }, [remaining, award, toast, duration]);

  const startPause = () => {
    if (remaining === 0) setRemaining(duration);
    setRunning((r) => !r);
  };
  const skip = () => {
    setIdx((i) => i + 1);
    setRemaining(duration);
  };
  const pickDuration = (d: number) => {
    setDuration(d);
    setRemaining(d); // always restart the countdown at the new length
  };

  const r = 70;
  const c = 2 * Math.PI * r;
  const pct = duration > 0 ? Math.min(1, remaining / duration) : 0;

  return (
    <div className="screen stack">
      <div className="between">
        <h1>Turtle Mantras 🧘</h1>
        <button className="chip outline" onClick={() => nav(-1)}>‹ Back</button>
      </div>

      <Card className="center stack" style={{ alignItems: "center" }}>
        <p style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.4, minHeight: 88, margin: "4px 8px", display: "flex", alignItems: "center" }}>
          “{mantra}”
        </p>

        <div style={{ position: "relative", width: 176, height: 176 }}>
          <svg width="176" height="176" aria-hidden>
            <circle cx="88" cy="88" r={r} fill="none" stroke="var(--line)" strokeWidth="12" />
            <circle
              className="count-ring"
              cx="88" cy="88" r={r} fill="none" transform="rotate(-90 88 88)"
              stroke="var(--primary)" strokeWidth="12" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c - c * pct}
            />
          </svg>
          <motion.div
            aria-hidden
            animate={running ? { scale: [1, 1.16, 1] } : { scale: 1 }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
          >
            <span style={{ fontSize: 30 }}>🐢</span>
            <b style={{ fontSize: 26 }}>{remaining}</b>
            <span className="muted" style={{ fontSize: 11, fontWeight: 800 }}>{running ? "breathe…" : "ready"}</span>
          </motion.div>
        </div>

        <div className="row gap8" aria-label="focus length">
          {FOCUS_OPTIONS.map((d) => (
            <button key={d} className={`chip ${duration === d ? "selected" : "outline"}`} aria-pressed={duration === d} onClick={() => pickDuration(d)}>
              {d}s
            </button>
          ))}
        </div>
      </Card>

      <div className="stack">
        <PillButton onClick={startPause}>{running ? "⏸ Pause" : remaining === 0 ? "Begin again 🌱" : focused > 0 ? "▶ Resume" : "▶ Begin"}</PillButton>
        <div className="between">
          <button className="chip outline" onClick={skip}>↻ Different mantra</button>
          <span className="chip">Focused: {focused} 🧘</span>
        </div>
      </div>

      <p className="muted center" style={{ fontSize: 12, margin: 0 }}>
        Earned today: {earnedToday}/{MANTRA_DAILY_CAP} 🪙 · {MANTRA_REWARD} per focus
      </p>
      <p className="muted center" style={{ fontSize: 11, margin: 0 }}>Over 200 gentle turtle mantras to drift through 🐢💚</p>
    </div>
  );
}
