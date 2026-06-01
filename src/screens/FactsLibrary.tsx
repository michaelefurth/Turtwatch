import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, isCloudMode } from "@/store/useStore";
import { cloudOpenBooster } from "@/lib/cloudEconomy";
import { useFeedback } from "@/components/feedback";
import { Card, PillButton, formatNum } from "@/components/common";
import { ALL_FACT_CARDS, RARITY, type CardRarity, type FactCardDef } from "@/data/factCards";
import { BOOSTER_COST, TOTAL_CARDS } from "@/logic/booster";
import { POOLS } from "@/lib/variety";
import { todayKey } from "@/logic/dates";
import { useSheetFocus } from "@/hooks/useSheetFocus";

const FILTERS: { id: CardRarity | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "common", label: "Common" },
  { id: "rare", label: "Rare" },
  { id: "epic", label: "Epic" },
  { id: "legendary", label: "Legendary ✨" },
];

export function FactsLibrary() {
  const { celebrate, toast } = useFeedback();
  const collection = useStore((s) => s.collection ?? {});
  const balance = useStore((s) => s.wallet.balance);
  const lastBoosterOn = useStore((s) => s.lastBoosterOn);
  const openBooster = useStore((s) => s.openBooster);

  const [filter, setFilter] = useState<CardRarity | "all">("all");
  const [reveal, setReveal] = useState<{ card: FactCardDef; isNew: boolean }[] | null>(null);
  const [detail, setDetail] = useState<FactCardDef | null>(null);
  const revealRef = useSheetFocus<HTMLDivElement>(!!reveal, () => setReveal(null));
  const detailRef = useSheetFocus<HTMLDivElement>(!!detail, () => setDetail(null));

  const collectedCount = Object.keys(collection).length;
  const freeReady = lastBoosterOn !== todayKey();

  const shown = useMemo(
    () => ALL_FACT_CARDS.filter((c) => filter === "all" || c.rarity === filter),
    [filter],
  );

  const open = async (paid: boolean) => {
    // cloud mode: the SERVER rolls the cards (authoritative); local mode rolls locally
    const res = isCloudMode() ? await cloudOpenBooster(paid) : openBooster(paid);
    if (!res.ok || !res.cards) {
      toast(res.reason ?? "Couldn't open that", "🐢");
      return;
    }
    const best = Math.max(...res.cards.map((c) => rarityRank(c.card.rarity)));
    celebrate(best >= 3 ? POOLS.perfect : POOLS.shop);
    if (res.rewarded) toast(`+${res.rewarded} Turtbux from the pack! 🪙`, "🎉");
    setReveal(res.cards);
  };

  return (
    <div className="screen stack">
      <div className="between">
        <h1>Fact Cards 🃏</h1>
        <span className="chip gold">🪙 {formatNum(balance)}</span>
      </div>

      <Card className="flat">
        <div className="between">
          <b>Collection</b>
          <span className="chip">{collectedCount}/{TOTAL_CARDS}</span>
        </div>
        <div className="progress mt-sm"><div style={{ width: `${(collectedCount / TOTAL_CARDS) * 100}%` }} /></div>
      </Card>

      {/* booster */}
      <Card className="center" style={{ background: "linear-gradient(160deg, color-mix(in srgb, var(--accent) 30%, var(--surface)), var(--surface))" }}>
        <div style={{ fontSize: 44 }}>🎁</div>
        <h2 style={{ margin: "2px 0" }}>Daily Booster Pack</h2>
        <p className="muted" style={{ marginTop: 0 }}>Open a pack of 3 cards — chase the rare & legendary turtles!</p>
        {freeReady ? (
          <PillButton onClick={() => open(false)}>Open today's free pack ✨</PillButton>
        ) : (
          <PillButton variant="secondary" onClick={() => open(true)} disabled={balance < BOOSTER_COST}>
            Buy another pack · {BOOSTER_COST} 🪙
          </PillButton>
        )}
        {freeReady && (
          <button className="chip outline" style={{ marginTop: 10 }} onClick={() => open(true)} disabled={balance < BOOSTER_COST}>
            or buy an extra · {BOOSTER_COST} 🪙
          </button>
        )}
      </Card>

      <div className="row wrap gap8">
        {FILTERS.map((f) => (
          <button key={f.id} className={`chip ${filter === f.id ? "selected" : "outline"}`} onClick={() => setFilter(f.id)}>{f.label}</button>
        ))}
      </div>

      <div className="card-grid">
        {shown.map((c) => {
          const count = collection[c.id] ?? 0;
          const owned = count > 0;
          return (
            <button
              key={c.id}
              className={`collect-card ${owned ? "" : "locked"}`}
              style={{ background: owned ? `color-mix(in srgb, ${RARITY[c.rarity].color} 26%, var(--surface))` : "var(--line)" }}
              onClick={() => (owned ? setDetail(c) : toast("Keep opening packs to find this one! 🐢", "❔"))}
              aria-label={owned ? `${RARITY[c.rarity].label} card, owned${count > 1 ? `, ${count} copies` : ""}` : "Undiscovered card"}
            >
              <span style={{ fontSize: 26, filter: owned ? "none" : "grayscale(1) opacity(0.5)" }} aria-hidden>{owned ? c.emoji : "❔"}</span>
              <span className="collect-rarity" style={{ color: owned ? "var(--text)" : "var(--muted)" }}>{owned ? RARITY[c.rarity].label : "???"}</span>
              {count > 1 && <span className="collect-count">×{count}</span>}
            </button>
          );
        })}
      </div>

      {/* pack reveal */}
      <AnimatePresence>
        {reveal && (
          <div className="scrim" onClick={() => setReveal(null)}>
            <motion.div ref={revealRef} className="sheet center" role="dialog" aria-modal="true" aria-labelledby="reveal-title" onClick={(e) => e.stopPropagation()} initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
              <h2 id="reveal-title" style={{ marginTop: 0 }}>Pack opened! 🎉</h2>
              <div className="row" style={{ justifyContent: "center", gap: 10 }}>
                {reveal.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ rotateY: 90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    transition={{ delay: i * 0.25 }}
                    className="reveal-card"
                    style={{ background: `color-mix(in srgb, ${RARITY[r.card.rarity].color} 32%, var(--surface))` }}
                  >
                    <span style={{ fontSize: 30 }} aria-hidden>{r.card.emoji}</span>
                    <span className="collect-rarity">{RARITY[r.card.rarity].label}</span>
                    {r.isNew ? <span className="chip gold" style={{ fontSize: 10, padding: "3px 8px" }}>NEW</span> : <span className="muted" style={{ fontSize: 10 }}>dupe +1</span>}
                  </motion.div>
                ))}
              </div>
              <div className="stack" style={{ marginTop: 14, textAlign: "left", gap: 8 }}>
                {reveal.map((r, i) => <p key={i} style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{r.card.emoji} {r.card.text}</p>)}
              </div>
              <div className="mt"><PillButton onClick={() => setReveal(null)}>Collect them! 🃏</PillButton></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* single card detail */}
      <AnimatePresence>
        {detail && (
          <div className="scrim" onClick={() => setDetail(null)}>
            <motion.div ref={detailRef} className="sheet center" role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={(e) => e.stopPropagation()} initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${RARITY[detail.rarity].color} 30%, var(--surface)), var(--surface))` }}>
              <div style={{ fontSize: 48 }}>{detail.emoji}</div>
              <span className="chip" style={{ background: RARITY[detail.rarity].color, color: "#3a4a3f" }}>{RARITY[detail.rarity].label}</span>
              <p id="detail-title" style={{ fontWeight: 700, fontSize: 15, margin: "10px 4px" }}>{detail.text}</p>
              <PillButton onClick={() => setDetail(null)}>Nice 🐢</PillButton>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function rarityRank(r: CardRarity): number {
  return r === "legendary" ? 4 : r === "epic" ? 3 : r === "rare" ? 2 : 1;
}
