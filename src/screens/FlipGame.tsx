import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { useFeedback } from "@/components/feedback";
import { Card, PillButton, BackButton } from "@/components/common";
import { makeDeck, pickFaces, gameReward, DAILY_GAME_CAP, type FlipCard } from "@/logic/flipgame";
import { SAMPLE_TURTLES } from "@/data/sampleTurtles";
import { todayKey } from "@/logic/dates";
import { pick, CARD_BACKS, GAME_WIN, POOLS } from "@/lib/variety";

const WIN_EMOJI = ["🌸", "🎊", "🌺", "🌟", "🏆", "🥳", "🪷"];
const WIN_PERFECT = ["Flawless & serene!", "Absolutely immaculate 🌟", "A perfect pond day 🌸", "Shell of a performance!"];
const WIN_OK = ["Nicely done!", "Lovely matching 🐢", "Pond pairs complete!", "Sweetly solved 🌿"];

const PAIRS = 6; // 12 cards, gentle 3×4 board

export function FlipGame() {
  const { celebrate, toast } = useFeedback();
  const entries = useStore((s) => s.entries);
  const award = useStore((s) => s.awardGameReward);
  const gameState = useStore((s) => s.game);

  const ownPhotos = useMemo(
    () => Object.values(entries).map((e) => e.photoUrl).filter((u): u is string => !!u),
    [entries],
  );
  const [round, setRound] = useState(0);
  const samples = useMemo(() => [...SAMPLE_TURTLES].sort(() => Math.random() - 0.5).map((t) => t.url), [round]);
  const cardBack = useMemo(() => pick(CARD_BACKS), [round]);

  // Rebuild the board only on a new round — never mid-game (e.g. if a photo is
  // uploaded/deleted in another tab), which would desync the matched state.
  const { deck, ownCount } = useMemo(() => {
    const { faces, ownCount } = pickFaces(ownPhotos, samples, PAIRS);
    return { deck: makeDeck(faces), ownCount };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const [revealed, setRevealed] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [mismatches, setMismatches] = useState(0);
  const [lock, setLock] = useState(false);
  const [won, setWon] = useState(false);
  const awardedRef = useRef(false); // guards reward against StrictMode double-fire

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

  // win → award (respecting the daily cap). awardedRef survives StrictMode's
  // mount→unmount→remount so the reward fires exactly once per board.
  useEffect(() => {
    if (awardedRef.current || matched.size !== PAIRS) return;
    awardedRef.current = true;
    setWon(true);
    const { total: reward, lucky } = award(gameReward(PAIRS, mismatches));
    celebrate(mismatches === 0 ? POOLS.perfect : POOLS.game);
    if (reward > 0) toast(pick(GAME_WIN).replace("{n}", String(reward)), mismatches === 0 ? "🌟" : "🐢");
    else toast("Daily Turtbux maxed — keep playing to relax 🌿", "🧘");
    if (lucky > 0) setTimeout(() => toast(`✨ Lucky flip! +${lucky} bonus 🪙`, "🍀"), 450);
  }, [matched, mismatches, award, celebrate, toast]);

  const isUp = (pos: number) => revealed.includes(pos) || matched.has(deck[pos].pairId);

  const flip = (pos: number) => {
    if (lock || isUp(pos) || revealed.length === 2) return;
    setRevealed((r) => [...r, pos]);
  };

  const newGame = () => {
    awardedRef.current = false;
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
        <BackButton />
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
              <span className="flip-back" aria-hidden>{cardBack}</span>
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
          <div style={{ fontSize: 40 }}>{pick(WIN_EMOJI)}</div>
          <h2 style={{ margin: "4px 0" }}>{pick(mismatches === 0 ? WIN_PERFECT : WIN_OK)}</h2>
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
