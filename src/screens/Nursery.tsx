import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import { useFeedback } from "@/components/feedback";
import { Card, PillButton, BackButton } from "@/components/common";
import { useSheetFocus } from "@/hooks/useSheetFocus";
import { POOLS } from "@/lib/variety";
import { HATCHLINGS, HATCH_RARITY, EGG_COST, TOTAL_HATCHLINGS, hatchlingById, type Hatchling } from "@/data/hatchlings";

/** A baby turtle wearing an outfit. */
function Critter({ outfit, size = 40 }: { outfit: string; size?: number }) {
  return (
    <span style={{ position: "relative", fontSize: size, lineHeight: 1, display: "inline-block" }} aria-hidden>
      🐢
      <span style={{ position: "absolute", top: -size * 0.18, right: -size * 0.22, fontSize: size * 0.5 }}>{outfit}</span>
    </span>
  );
}

export function Nursery() {
  const { celebrate, toast } = useFeedback();
  const hatch = useStore((s) => s.hatch) ?? { care: 0, collection: {}, total: 0 };
  const hatchEgg = useStore((s) => s.hatchEgg);

  const [reveal, setReveal] = useState<{ h: Hatchling; isNew: boolean } | null>(null);
  const revealRef = useSheetFocus<HTMLDivElement>(!!reveal, () => setReveal(null));

  const ready = Math.floor(hatch.care / EGG_COST);
  const toNext = hatch.care - ready * EGG_COST;
  const pct = ready > 0 ? 100 : Math.round((toNext / EGG_COST) * 100);
  const collected = Object.keys(hatch.collection).length;

  const doHatch = () => {
    const res = hatchEgg();
    if (!res) return;
    const h = hatchlingById(res.id);
    if (!h) return;
    celebrate(res.isNew ? POOLS.perfect : POOLS.shop);
    if (res.isNew) toast(`You hatched ${h.name}! 🐣`, h.outfit);
    else toast(`${h.name} again — a cozy duplicate 🐢`, h.outfit);
    setReveal({ h, isNew: res.isNew });
  };

  return (
    <div className="screen stack">
      <div className="between"><h1>Nursery 🥚</h1><BackButton /></div>

      {/* egg / care meter */}
      <Card className="center stack">
        <div style={{ fontSize: 64 }} aria-hidden>{ready > 0 ? "🐣" : "🥚"}</div>
        <h2 style={{ margin: 0 }}>{ready > 0 ? "An egg is ready!" : "Caring for an egg"}</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          Earn care by showing up — upload a turtle, tick a goal, take a mantra breath. A full egg hatches a turtle in a surprise outfit.
        </p>
        <div className="progress" style={{ width: "100%" }}><div style={{ width: `${pct}%` }} /></div>
        <span className="muted" style={{ fontSize: 12, fontWeight: 800 }}>
          {ready > 0 ? `${ready} ready · ${toNext}/${EGG_COST} to the next` : `${toNext}/${EGG_COST} care`}
        </span>
        {ready > 0 ? (
          <PillButton onClick={doHatch}>Hatch! 🐣 {ready > 1 ? `(${ready} ready)` : ""}</PillButton>
        ) : (
          <PillButton variant="secondary" disabled>Keep caring 🌱</PillButton>
        )}
      </Card>

      <Card className="flat">
        <div className="between">
          <b>Hatched friends</b>
          <span className="chip">{collected}/{TOTAL_HATCHLINGS}</span>
        </div>
        <div className="progress mt-sm"><div style={{ width: `${(collected / TOTAL_HATCHLINGS) * 100}%` }} /></div>
        <span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>{hatch.total} egg{hatch.total === 1 ? "" : "s"} hatched in all 🥚</span>
      </Card>

      <div className="card-grid">
        {HATCHLINGS.map((h) => {
          const count = hatch.collection[h.id] ?? 0;
          const owned = count > 0;
          return (
            <button
              key={h.id}
              className={`collect-card ${owned ? "" : "locked"}`}
              style={{ background: owned ? `color-mix(in srgb, ${HATCH_RARITY[h.rarity].color} 26%, var(--surface))` : "var(--line)" }}
              onClick={() => owned ? setReveal({ h, isNew: false }) : toast("Keep caring to hatch this friend! 🥚", "❔")}
              aria-label={owned ? `${h.name}, ${HATCH_RARITY[h.rarity].label}${count > 1 ? `, ${count}` : ""}` : "Unhatched"}
            >
              {owned ? <Critter outfit={h.outfit} size={30} /> : <span style={{ fontSize: 24, opacity: 0.5 }} aria-hidden>🥚</span>}
              <span className="collect-rarity" style={{ color: owned ? "var(--text)" : "var(--muted)" }}>{owned ? h.name : "???"}</span>
              {count > 1 && <span className="collect-count">×{count}</span>}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {reveal && (
          <div className="scrim" onClick={() => setReveal(null)}>
            <motion.div ref={revealRef} className="sheet center" role="dialog" aria-modal="true" aria-labelledby="hatch-title" onClick={(e) => e.stopPropagation()} initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${HATCH_RARITY[reveal.h.rarity].color} 32%, var(--surface)), var(--surface))` }}>
              <motion.div initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 220, damping: 12 }}>
                <Critter outfit={reveal.h.outfit} size={80} />
              </motion.div>
              <h2 id="hatch-title" style={{ margin: "8px 0 2px" }}>{reveal.h.name}</h2>
              <span className="chip" style={{ background: HATCH_RARITY[reveal.h.rarity].color, color: "#3a4a3f" }}>{HATCH_RARITY[reveal.h.rarity].label}</span>
              {reveal.isNew ? <div className="chip gold" style={{ marginTop: 8 }}>NEW friend! ✨</div> : <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>You have {hatch.collection[reveal.h.id] ?? 1}</div>}
              <div className="mt"><PillButton onClick={() => setReveal(null)}>Welcome to the pond! 🐢</PillButton></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
