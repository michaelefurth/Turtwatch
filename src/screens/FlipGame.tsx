import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { useFeedback } from "@/components/feedback";
import { Card, PillButton } from "@/components/common";
import { makeDeck, pickFaces, gameReward, DAILY_GAME_CAP, type FlipCard } from "@/logic/flipgame";
import { SAMPLE_TURTLES } from "@/data/sampleTurtles";
import { todayKey } from "@/logic/dates";

const PAIRS = 6; // 12 cards, gentle 3×4 board

export function FlipGame() {
  const nav = useNavigate();
  const { celebrate, toast } = useFeedback();
  const entries = useStore((s) => s.entries);
  const award = useStore((s) => s.awardGameReward);
  const gameState = useStore((s) => s.game);

  const ownPhotos = useMemo(
    () => Object.values(entries).map((e) => e.photoUrl).filter((u): u is string => !!u),
    [entries],
  );
  const samples = useMemo(() => SAMPLE_TURTLES.map((t) => t.url), []);

  const [round, setRound] = useState(0);
  const { deck, ownCount } = useMemo(() => {
    const { faces, ownCount } = pickFaces(ownPhotos, samples, PAIRS);
    return { deck: makeDeck(faces), ownCount };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, ownPhotos.length]);

  const [revealed, setRevealed] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [mismatches, setMismatches] = useState(0);
  const [lock, setLock] = useState(false);
  const [won, setWon] = useState(false);

  // evaluate a pair when two cards are face-up
  useEffect(() => {
    if (revealed.length !== 2) return;
    const [a, b] = revealed;
    if (deck[a].pairId === deck[b].pairId) {
      setMatched((m) => new Set(m).add(deck[a].pairId));
      setRevealed([]);
    } else {
      setLock(true);
      const t = setTimeout(() => {
        setRevealed([]);
        setMismatches((n) => n + 1);
        setLock(false);
      }, 850);
      return () => clearTimeout(t);
    }
  }, [revealed, deck]);

  // win → award (respecting the daily cap)
  useEffect(() => {
    if (won || matched.size !== PAIRS) return;
    setWon(true);
    const reward = award(gameReward(PAIRS, mismatches));
    celebrate(["🐢", "🪷", "✨", "💚"]);
    if (reward > 0) toast(`Lovely! +${reward} Turtbux 🪙`, mismatches === 0 ? "🌟" : "🐢");
    else toast("Daily Turtbux maxed — keep playing to relax 🌿", "🧘");
  }, [matched, won, mismatches, award, celebrate, toast]);

  const isUp = (pos: number) => revealed.includes(pos) || matched.has(deck[pos].pairId);

  const flip = (pos: number) => {
    if (lock || isUp(pos) || revealed.length === 2) return;
    setRevealed((r) => [...r, pos]);
  };

  const newGame = () => {
    setRevealed([]);
    setMatched(new Set());
    setMismatches(0);
    setLock(false);
    setWon(false);
    setRound((r) => r + 1);
  };

  const earnedToday = gameState?.date === todayKey() ? gameState.earned : 0;

  return (
    <div className="screen stack">
      <div className="between">
        <h1>Turtle Flip 🎴</h1>
        <button className="chip outline" onClick={() => nav(-1)}>‹ Back</button>
      </div>

      {/* meditative breathing cue */}
      <div className="center stack" style={{ gap: 6, marginBottom: 2 }}>
        <motion.div
          aria-hidden
          animate={{ scale: [1, 1.18, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: 54, height: 54, borderRadius: "50%", background: "color-mix(in srgb, var(--primary) 45%, var(--surface))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}
        >
          🐢
        </motion.div>
        <span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>Breathe in… and out. Match the turtles, no rush.</span>
      </div>

      <div className="flip-grid">
        {deck.map((c: FlipCard, pos) => {
          const up = isUp(pos);
          const isMatched = matched.has(c.pairId);
          return (
            <motion.button
              key={pos}
              className={`flip-card ${up ? "up" : ""} ${isMatched ? "matched" : ""}`}
              onClick={() => flip(pos)}
              aria-label={up ? "turtle card" : "face-down card"}
              animate={{ rotateY: up ? 180 : 0, scale: isMatched ? 0.96 : 1 }}
              transition={{ duration: 0.3 }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <span className="flip-back" aria-hidden>🪷</span>
              <span className="flip-front" aria-hidden style={{ transform: "rotateY(180deg)" }}>
                <img src={c.image} alt="" />
              </span>
            </motion.button>
          );
        })}
      </div>

      {ownCount < PAIRS && (
        <p className="muted center" style={{ fontSize: 12, margin: 0 }}>
          🐢 Using {PAIRS - ownCount} sample turtle{PAIRS - ownCount > 1 ? "s" : ""} — upload more photos to play with your own!
        </p>
      )}

      {won ? (
        <Card className="center">
          <div style={{ fontSize: 40 }}>🌸</div>
          <h2 style={{ margin: "4px 0" }}>{mismatches === 0 ? "Flawless & serene!" : "Nicely done!"}</h2>
          <p className="muted" style={{ marginTop: 0 }}>Matched all {PAIRS} pairs in {PAIRS + mismatches} flips.</p>
          <PillButton onClick={newGame}>Play again 🎴</PillButton>
        </Card>
      ) : (
        <div className="between">
          <span className="chip">{matched.size}/{PAIRS} pairs</span>
          <button className="chip outline" onClick={newGame}>🔀 New board</button>
        </div>
      )}

      <p className="muted center" style={{ fontSize: 12, margin: 0 }}>
        Earned today: {earnedToday}/{DAILY_GAME_CAP} 🪙 from playing
      </p>
    </div>
  );
}
