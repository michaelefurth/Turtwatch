import { motion, useReducedMotion } from "framer-motion";
import { useId, useState } from "react";
import type { Mascot as MascotType } from "@/types";

export type MascotMood = "happy" | "excited" | "sleepy" | "worried" | "proud";

interface Props {
  mascot: MascotType;
  mood?: MascotMood;
  size?: number;
  accessory?: string; // shop item id of equipped mascot_accessory
  wave?: boolean;
  /** tap the mascot for a happy little wiggle */
  interactive?: boolean;
}

const ACC_EMOJI: Record<string, { emoji: string; top: string }> = {
  acc_party_hat: { emoji: "🎩", top: "-18%" },
  acc_sunnies: { emoji: "🕶️", top: "26%" },
  acc_crown: { emoji: "👑", top: "-20%" },
  acc_bow: { emoji: "🎀", top: "-14%" },
  acc_flower: { emoji: "🌷", top: "-16%" },
  acc_scarf: { emoji: "🧣", top: "52%" },
};

/** Turtley (mint) / Shelldon (blue) — a cute sticker turtle with moods + blink. */
export function Mascot({ mascot, mood = "happy", size = 120, accessory, wave, interactive }: Props) {
  const reduce = useReducedMotion();
  const id = useId().replace(/[:]/g, "");
  const [poke, setPoke] = useState(0);

  const palette =
    mascot === "shelldon"
      ? { shell: "#8fbdf0", shellDark: "#5f8ed6", skin: "#a9d4ff" }
      : { shell: "#8fd6a8", shellDark: "#5fb083", skin: "#bdeccd" };

  const eyeClosed = mood === "sleepy" ? "M-3 0 q3 3 6 0" : mood === "worried" ? "M-3 1 q3 -3 6 0" : null;
  const mouth =
    mood === "excited" || mood === "proud"
      ? "M-7 4 q7 9 14 0"
      : mood === "worried"
      ? "M-6 7 q6 -4 12 0"
      : mood === "sleepy"
      ? "M-5 6 q5 2 10 0"
      : "M-6 5 q6 5 12 0";

  const idle = reduce
    ? {}
    : wave
    ? { rotate: [0, -4, 4, -4, 0] }
    : mood === "excited" || mood === "proud"
    ? { y: [0, -6, 0] }
    : { y: [0, -3, 0] };

  return (
    <motion.div
      style={{ width: size, height: size, position: "relative", cursor: interactive ? "pointer" : undefined }}
      onClick={interactive ? () => setPoke((p) => p + 1) : undefined}
      animate={poke ? { rotate: [0, -10, 10, -6, 0], scale: [1, 1.08, 1] } : idle}
      transition={
        poke
          ? { duration: 0.5, ease: "easeInOut" }
          : { duration: mood === "excited" ? 0.6 : 2.4, repeat: Infinity, ease: "easeInOut" }
      }
    >
      <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`${mascot} the turtle, looking ${mood}`}>
        <defs>
          <radialGradient id={`blush-${id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff9eb5" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ff9eb5" stopOpacity="0" />
          </radialGradient>
          {!reduce && (
            <style>{`@keyframes mascotBlink-${id}{0%,92%,100%{transform:scaleY(1)}96%{transform:scaleY(0.1)}}`}</style>
          )}
        </defs>
        {/* feet */}
        <circle cx="32" cy="92" r="11" fill={palette.skin} />
        <circle cx="88" cy="92" r="11" fill={palette.skin} />
        {/* shell */}
        <ellipse cx="60" cy="74" rx="40" ry="30" fill={palette.shell} />
        <ellipse cx="60" cy="74" rx="27" ry="20" fill={palette.shellDark} />
        <path d="M60 60 l11 9 -4 13 -14 0 -4 -13 z" fill={palette.shell} opacity="0.85" />
        {/* shell sheen */}
        <ellipse cx="50" cy="64" rx="12" ry="6" fill="#fff" opacity="0.18" />
        {/* head */}
        <circle cx="60" cy="40" r="22" fill={palette.skin} />
        {/* blush */}
        <ellipse cx="44" cy="47" rx="8" ry="6" fill={`url(#blush-${id})`} />
        <ellipse cx="76" cy="47" rx="8" ry="6" fill={`url(#blush-${id})`} />
        {/* eyes */}
        {eyeClosed ? (
          <>
            <path d={`M52,40 ${eyeClosed}`} stroke="#3a4a3f" strokeWidth="2.6" fill="none" strokeLinecap="round" />
            <path d={`M65,40 ${eyeClosed}`} stroke="#3a4a3f" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <g style={reduce ? undefined : { transformOrigin: "52px 40px", animation: `mascotBlink-${id} 4.2s ease-in-out infinite` }}>
              <circle cx="52" cy="40" r="4.2" fill="#3a4a3f" />
              <circle cx="53.7" cy="38.2" r="1.7" fill="#fff" />
              <circle cx="51.4" cy="41.6" r="0.8" fill="#fff" opacity="0.55" />
            </g>
            <g style={reduce ? undefined : { transformOrigin: "68px 40px", animation: `mascotBlink-${id} 4.2s ease-in-out 0.12s infinite` }}>
              <circle cx="68" cy="40" r="4.2" fill="#3a4a3f" />
              <circle cx="69.7" cy="38.2" r="1.7" fill="#fff" />
              <circle cx="67.4" cy="41.6" r="0.8" fill="#fff" opacity="0.55" />
            </g>
          </>
        )}
        {/* mouth */}
        <path d={mouth} transform="translate(60,48)" stroke="#3a4a3f" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        {/* proud sparkles */}
        {mood === "proud" && (
          <>
            <path d="M40 18 L41.2 21 L44 22 L41.2 23 L40 26 L38.8 23 L36 22 L38.8 21 Z" fill="#f6c453" />
            <path d="M82 22 L82.9 24.2 L85 25 L82.9 25.8 L82 28 L81.1 25.8 L79 25 L81.1 24.2 Z" fill="#f6c453" />
          </>
        )}
      </svg>
      {accessory && ACC_EMOJI[accessory] && (
        <span aria-hidden style={{ position: "absolute", left: "50%", top: ACC_EMOJI[accessory].top, transform: "translateX(-50%)", fontSize: size * 0.34 }}>
          {ACC_EMOJI[accessory].emoji}
        </span>
      )}
    </motion.div>
  );
}
