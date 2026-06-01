import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { TabBar } from "./TabBar";
import { useFeedback } from "./feedback";
import { useStore, isHydrating } from "@/store/useStore";
import { themeById } from "@/data/shopItems";
import { ACHIEVEMENTS } from "@/data/achievements";
import { RANKS, rankFor } from "@/logic/ranks";
import { totalTurtles } from "@/store/selectors";
import { useReminders } from "@/hooks/useReminders";
import { useCloudAutoBackup } from "@/hooks/useCloudAutoBackup";

/** Decorative pond background — drifting bubbles + ripples. */
function PondDecor() {
  const bubbles = Array.from({ length: 9 });
  return (
    <div className="pond-decor" aria-hidden>
      {bubbles.map((_, i) => {
        const size = 8 + ((i * 7) % 26);
        return (
          <span
            key={i}
            className="bubble"
            style={{
              left: `${(i * 11 + 4) % 96}%`,
              bottom: `-${size}px`,
              width: size,
              height: size,
              animationDuration: `${8 + (i % 5) * 3}s`,
              animationDelay: `${i * 1.3}s`,
            }}
          />
        );
      })}
      <span className="ripple" style={{ left: "12%", top: "30%", width: 90, height: 90 }} />
      <span className="ripple" style={{ right: "8%", top: "55%", width: 70, height: 70, animationDelay: "2.5s" }} />

      {/* lily pads */}
      <LilyPad style={{ left: "4%", top: "16%", width: 54, opacity: 0.7 }} flower />
      <LilyPad style={{ right: "5%", top: "40%", width: 40, opacity: 0.55 }} />
      <LilyPad style={{ left: "28%", bottom: "20%", width: 46, opacity: 0.5 }} />

      {/* a shy little fish drifting by */}
      <span className="fish" aria-hidden>🐠</span>
    </div>
  );
}

function LilyPad({ style, flower }: { style: React.CSSProperties; flower?: boolean }) {
  return (
    <svg viewBox="0 0 52 52" style={{ position: "absolute", ...style }} aria-hidden>
      <path d="M26 4 A22 22 0 1 1 25.9 4 L26 26 Z" fill="#7dba8a" />
      <line x1="26" y1="26" x2="26" y2="5" stroke="#5f9a6a" strokeWidth="1.2" opacity="0.5" />
      {flower && (
        <>
          <circle cx="26" cy="11" r="4" fill="#ffb3c6" opacity="0.9" />
          <circle cx="26" cy="11" r="1.8" fill="#fff" opacity="0.8" />
        </>
      )}
    </svg>
  );
}

export function AppShell() {
  const themeId = useStore((s) => s.profile.themeId);
  const loc = useLocation();
  const { toast, celebrate } = useFeedback();
  useReminders();
  useCloudAutoBackup();

  // surface persistence failures (e.g. storage quota from large photos)
  useEffect(() => {
    const onErr = () => toast("Couldn't save — storage is full 😬", "💾");
    window.addEventListener("turtwatch:storage-error", onErr);
    return () => window.removeEventListener("turtwatch:storage-error", onErr);
  }, [toast]);

  // surface newly-earned achievements from ANY source (upload, game, mantra,
  // trek, booster, login…) — actions write to `achievements`; we toast the diff
  const seenAch = useRef(new Set(Object.keys(useStore.getState().achievements)));
  const lastRankIdx = useRef(RANKS.indexOf(rankFor(totalTurtles(useStore.getState().entries)).rank));
  useEffect(() => {
    return useStore.subscribe((s) => {
      const achKeys = Object.keys(s.achievements);
      const rankIdx = RANKS.indexOf(rankFor(totalTurtles(s.entries)).rank);

      // A reset or cloud restore replaces state wholesale — re-sync the baselines
      // without celebrating anything the user already had.
      if (isHydrating() || achKeys.length < seenAch.current.size) {
        seenAch.current = new Set(achKeys);
        lastRankIdx.current = rankIdx;
        return;
      }

      for (const id of achKeys) {
        if (!seenAch.current.has(id)) {
          seenAch.current.add(id);
          const a = ACHIEVEMENTS.find((x) => x.id === id);
          if (a) toast(`Achievement: ${a.title}`, a.emoji);
        }
      }
      // rank-up celebration (promotion only) — delayed so it doesn't get
      // overwritten by an upload's confetti fired in the same commit
      if (rankIdx > lastRankIdx.current) {
        lastRankIdx.current = rankIdx;
        const rank = RANKS[rankIdx];
        setTimeout(() => {
          celebrate(["🏅", "🐢", "✨", "🎉", "👑", "🌟"]);
          toast(`Ranked up to ${rank.emoji} ${rank.name}!`, rank.emoji);
        }, 1800);
      } else if (rankIdx < lastRankIdx.current) {
        lastRankIdx.current = rankIdx; // sync on downgrade, no celebration
      }
    });
  }, [toast, celebrate]);

  // apply theme palette as CSS custom properties
  useEffect(() => {
    const t = themeById(themeId);
    const root = document.documentElement;
    root.style.setProperty("--bg", t.bg);
    root.style.setProperty("--surface", t.surface);
    root.style.setProperty("--primary", t.primary);
    root.style.setProperty("--primary-deep", t.primaryDeep);
    root.style.setProperty("--accent", t.accent);
    root.style.setProperty("--text", t.text);
  }, [themeId]);

  // scroll to top on route change
  useEffect(() => {
    document.querySelector(".app")?.scrollTo?.(0, 0);
    window.scrollTo(0, 0);
  }, [loc.pathname]);

  return (
    <div className="app">
      <PondDecor />
      <AnimatePresence mode="wait">
        <motion.div
          key={loc.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
      <TabBar />
    </div>
  );
}
