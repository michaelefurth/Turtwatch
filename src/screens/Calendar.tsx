import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { Card } from "@/components/common";
import { monthGrid, monthLabel, todayKey, isFuture } from "@/logic/dates";
import { completionThisMonth } from "@/store/selectors";
import type { DayState } from "@/types";

const STATE_ICON: Record<string, string> = {
  completed: "🐢",
  repaired: "🩹",
  ai_rescued: "✨",
  shielded: "🛡️",
  missed: "😴",
};

const LEGEND: { state: DayState; label: string; color: string }[] = [
  { state: "completed", label: "Completed", color: "var(--primary)" },
  { state: "repaired", label: "Repaired", color: "var(--accent)" },
  { state: "ai_rescued", label: "AI Rescued", color: "#d9c8f5" },
  { state: "shielded", label: "Shielded", color: "#b9d6f5" },
  { state: "missed", label: "Napping", color: "#e3e7e4" },
];

export function CalendarScreen() {
  const nav = useNavigate();
  const entries = useStore((s) => s.entries);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month0, setMonth0] = useState(now.getMonth());
  const today = todayKey();

  const cells = monthGrid(year, month0);
  const { done, days } = completionThisMonth(entries, year, month0);

  const move = (delta: number) => {
    let m = month0 + delta;
    let y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth0(m);
    setYear(y);
  };

  const dayState = (key: string): DayState => {
    const e = entries[key];
    if (e) return e.state;
    if (key === today) return "today";
    if (isFuture(key)) return "future";
    return "missed";
  };

  return (
    <div className="screen stack">
      <h1>Turtle Calendar 📅</h1>

      <Card>
        <div className="between" style={{ marginBottom: 10 }}>
          <button className="chip outline" aria-label="Previous month" onClick={() => move(-1)}>‹</button>
          <b style={{ fontSize: 16 }}>{monthLabel(year, month0)}</b>
          <button className="chip outline" aria-label="Next month" onClick={() => move(1)}>›</button>
        </div>

        <div className="cal-head">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className="cal-grid">
          {cells.map((key, i) => {
            if (!key) return <div key={i} />;
            const st = dayState(key);
            const e = entries[key];
            const dnum = Number(key.split("-")[2]);
            const cls = st === "today" ? "st-today" : `st-${st}`;
            const future = st === "future";
            const target = e ? `/day/${key}` : future ? null : st === "today" ? "/upload" : `/repair/${key}`;
            const stateLabel = e ? e.state : st;
            return (
              <button
                key={i}
                className={`day ${cls} ${future ? "future" : ""} ${key === today ? "today" : ""}`}
                onClick={() => target && nav(target)}
                disabled={future}
                aria-label={`${monthLabel(year, month0).split(" ")[0]} ${dnum} — ${stateLabel}`}
              >
                {e?.photoUrl && <img src={e.photoUrl} alt="" aria-hidden />}
                <span className="dnum overlay" style={e?.photoUrl ? undefined : { color: "inherit" }}>{dnum}</span>
                <span className="ic overlay" aria-hidden style={e?.photoUrl ? undefined : { color: "inherit", textShadow: "none" }}>
                  {e ? STATE_ICON[e.state] : st === "missed" ? STATE_ICON.missed : ""}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="flat">
        <div className="between">
          <b>{monthLabel(year, month0).split(" ")[0]}</b>
          <span className="chip">{done}/{days} days · {days ? Math.round((done / days) * 100) : 0}%</span>
        </div>
        <div className="progress mt-sm"><div style={{ width: `${days ? (done / days) * 100 : 0}%` }} /></div>
      </Card>

      <div className="legend">
        {LEGEND.map((l) => (
          <span key={l.state} className="badge">
            <span className="sw" style={{ background: l.color }} /> {STATE_ICON[l.state]} {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
