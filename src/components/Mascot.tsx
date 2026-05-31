import { motion } from "framer-motion";
import type { Mascot as MascotType } from "@/types";

export type MascotMood = "happy" | "excited" | "sleepy" | "worried";

interface Props {
  mascot: MascotType;
  mood?: MascotMood;
  size?: number;
  accessory?: string; // shop item id of equipped mascot_accessory
  wave?: boolean;
}

const ACC_EMOJI: Record<string, { emoji: string; top: string }> = {
  acc_party_hat: { emoji: "🎉", top: "-18%" },
  acc_sunnies: { emoji: "🕶️", top: "30%" },
  acc_crown: { emoji: "👑", top: "-20%" },
};

/** Turtley (mint) / Shelldon (blue) — a cute sticker turtle with moods. */
export function Mascot({ mascot, mood = "happy", size = 120, accessory, wave }: Props) {
  const palette =
    mascot === "shelldon"
      ? { shell: "#8fbdf0", shellDark: "#5f8ed6", skin: "#a9d4ff" }
      : { shell: "#8fd6a8", shellDark: "#5fb083", skin: "#bdeccd" };

  const eye = mood === "sleepy" ? "M-3 0 q3 3 6 0" : mood === "worried" ? "M-3 1 q3 -3 6 0" : null;
  const mouth =
    mood === "excited"
      ? "M-7 4 q7 9 14 0"
      : mood === "worried"
      ? "M-6 7 q6 -4 12 0"
      : mood === "sleepy"
      ? "M-5 6 q5 2 10 0"
      : "M-6 5 q6 5 12 0";

  return (
    <motion.div
      style={{ width: size, height: size, position: "relative" }}
      animate={
        wave
          ? { rotate: [0, -4, 4, -4, 0] }
          : mood === "excited"
          ? { y: [0, -6, 0] }
          : { y: [0, -3, 0] }
      }
      transition={{ duration: mood === "excited" ? 0.6 : 2.4, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg viewBox="0 0 120 120" width={size} height={size} aria-label={`${mascot} mascot`}>
        {/* feet */}
        <circle cx="32" cy="92" r="11" fill={palette.skin} />
        <circle cx="88" cy="92" r="11" fill={palette.skin} />
        {/* shell */}
        <ellipse cx="60" cy="74" rx="40" ry="30" fill={palette.shell} />
        <ellipse cx="60" cy="74" rx="27" ry="20" fill={palette.shellDark} />
        <path d="M60 60 l11 9 -4 13 -14 0 -4 -13 z" fill={palette.shell} opacity="0.8" />
        {/* head */}
        <circle cx="60" cy="40" r="22" fill={palette.skin} />
        {/* cheeks */}
        <circle cx="44" cy="46" r="5" fill="#ff9eb5" opacity="0.6" />
        <circle cx="76" cy="46" r="5" fill="#ff9eb5" opacity="0.6" />
        {/* eyes */}
        {eye ? (
          <>
            <path d={`M${52},40 ${eye}`} transform="translate(0,0)" stroke="#3a4a3f" strokeWidth="2.4" fill="none" strokeLinecap="round" />
            <path d={`M${65},40 ${eye}`} stroke="#3a4a3f" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="52" cy="40" r="3.4" fill="#3a4a3f" />
            <circle cx="68" cy="40" r="3.4" fill="#3a4a3f" />
            <circle cx="53.2" cy="38.8" r="1.1" fill="#fff" />
            <circle cx="69.2" cy="38.8" r="1.1" fill="#fff" />
          </>
        )}
        {/* mouth */}
        <path d={mouth} transform="translate(60,48)" stroke="#3a4a3f" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </svg>
      {accessory && ACC_EMOJI[accessory] && (
        <span aria-hidden style={{ position: "absolute", left: "50%", top: ACC_EMOJI[accessory].top, transform: "translateX(-50%)", fontSize: size * 0.34 }}>
          {ACC_EMOJI[accessory].emoji}
        </span>
      )}
    </motion.div>
  );
}
