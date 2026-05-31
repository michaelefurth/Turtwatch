import { motion } from "framer-motion";

interface Props {
  current: number;
  longest: number;
  atRisk?: boolean;
}

export function StreakRing({ current, longest, atRisk }: Props) {
  const r = 74;
  const c = 2 * Math.PI * r;
  // fill the ring relative to the next 7-day band for a satisfying loop
  const band = Math.max(7, Math.ceil((current || 1) / 7) * 7);
  const pct = Math.min(1, current / band);

  return (
    <div className="ring-wrap">
      <div className="ring">
        <svg width="168" height="168">
          <circle cx="84" cy="84" r={r} fill="none" stroke="var(--line)" strokeWidth="14" />
          <motion.circle
            cx="84" cy="84" r={r} fill="none"
            stroke={atRisk ? "var(--accent)" : "var(--primary)"}
            strokeWidth="14" strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c - c * pct }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </svg>
        <div className="num">
          <span style={{ fontSize: 22 }}>{atRisk ? "🔥" : "🐢"}</span>
          <b>{current}</b>
          <span className="muted" style={{ fontWeight: 800, fontSize: 12 }}>day streak</span>
        </div>
      </div>
      <div className="muted" style={{ fontWeight: 800, fontSize: 13 }}>
        🏆 Longest: {longest} {atRisk && current > 0 ? "· upload today to keep it!" : ""}
      </div>
    </div>
  );
}
