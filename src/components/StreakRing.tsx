import { motion } from "framer-motion";
import { useId } from "react";

interface Props {
  current: number;
  longest: number;
  atRisk?: boolean;
  gentle?: boolean; // soften framing: no fire/at-risk pressure, kinder label
}

export function StreakRing({ current, longest, atRisk: atRiskRaw, gentle }: Props) {
  const atRisk = atRiskRaw && !gentle;
  const r = 72;
  const c = 2 * Math.PI * r;
  const band = Math.max(7, Math.ceil((current || 1) / 7) * 7);
  const pct = Math.min(1, current / band);
  const raw = useId();
  const id = raw.replace(/[:]/g, "");

  return (
    <div className="ring-wrap" role="img" aria-label={`${current}-day streak${atRisk ? " (at risk — upload today)" : ""}. Longest: ${longest} days.`}>
      <div className="ring">
        <svg width="168" height="168" aria-hidden>
          <defs>
            <linearGradient id={`ring-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={atRisk ? "#ffd6a5" : "#a8edbe"} />
              <stop offset="100%" stopColor={atRisk ? "#f0a86a" : "#5fb083"} />
            </linearGradient>
            <pattern id={`hex-${id}`} patternUnits="userSpaceOnUse" width="20" height="23" patternTransform="translate(4 4)">
              <polygon points="10,1 19,6 19,17 10,22 1,17 1,6" fill="none" stroke="var(--primary)" strokeOpacity="0.16" strokeWidth="1.2" />
            </pattern>
          </defs>
          {/* shell-textured disc */}
          <circle cx="84" cy="84" r="76" fill={`url(#hex-${id})`} />
          {/* track */}
          <circle cx="84" cy="84" r={r} fill="none" stroke="var(--line)" strokeWidth="15" />
          {/* progress arc */}
          <motion.circle
            cx="84" cy="84" r={r} fill="none" transform="rotate(-90 84 84)"
            stroke={`url(#ring-${id})`} strokeWidth="15" strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c - c * pct }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
          {/* gloss sheen */}
          <circle
            cx="84" cy="84" r={r} fill="none" transform="rotate(-90 84 84)"
            stroke="rgba(255,255,255,0.35)" strokeWidth="4.5" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c - c * pct * 0.5}
          />
        </svg>
        <div className="num">
          <span style={{ fontSize: 22 }} aria-hidden>{gentle ? "🌿" : atRisk ? "🔥" : "🐢"}</span>
          <b>{current}</b>
          <span className="muted" style={{ fontWeight: 800, fontSize: 12 }}>{gentle ? "days shown up" : "day streak"}</span>
        </div>
      </div>
      <div className="muted" style={{ fontWeight: 800, fontSize: 13 }}>
        {gentle
          ? "🌱 Every day you show up counts"
          : `🏆 Longest: ${longest}${atRisk && current > 0 ? " · upload today to keep it!" : ""}`}
      </div>
    </div>
  );
}
