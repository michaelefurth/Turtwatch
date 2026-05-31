import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TurtleFact } from "@/types";

const CAT_COLOR: Record<string, string> = {
  biology: "#9fdcc0",
  history: "#ffcf73",
  record: "#f7a8c4",
  silly: "#c3b3f0",
  care: "#8fbdf0",
};

const RARITY_LABEL: Record<string, string> = { common: "Common", rare: "Rare", legendary: "Legendary ✨" };

export function FactCard({ fact, read, onRead }: { fact: TurtleFact; read: boolean; onRead: () => void }) {
  const [flipped, setFlipped] = useState(false);
  const color = CAT_COLOR[fact.category];

  const flip = () => {
    if (!flipped && !read) onRead();
    setFlipped((f) => !f);
  };

  return (
    <div className="card tight" style={{ background: `color-mix(in srgb, ${color} 22%, var(--surface))`, position: "relative" }} onClick={flip}>
      {!read && (
        <span style={{ position: "absolute", top: 8, right: 10, fontSize: 16 }} title="Unread">✨</span>
      )}
      <AnimatePresence mode="wait">
        {!flipped ? (
          <motion.div key="front" initial={{ rotateY: -90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ rotateY: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
            <div style={{ fontSize: 40 }}>{fact.emoji}</div>
            <h3 style={{ margin: "6px 0 2px" }}>{fact.title}</h3>
            <span className="muted" style={{ fontSize: 11, fontWeight: 800 }}>{RARITY_LABEL[fact.rarity]} · tap to flip</span>
          </motion.div>
        ) : (
          <motion.div key="back" initial={{ rotateY: -90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ rotateY: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{fact.body}</p>
            <span className="chip gold" style={{ marginTop: 8 }}>🪙 +{fact.reward}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
