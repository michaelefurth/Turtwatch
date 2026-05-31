// Ranks derived from lifetime turtles uploaded. See docs/05.

export interface Rank {
  name: string;
  emoji: string;
  min: number; // min turtles
}

export const RANKS: Rank[] = [
  { name: "Hatchling", emoji: "🥚", min: 0 },
  { name: "Sprout", emoji: "🌱", min: 3 },
  { name: "Pondling", emoji: "🐢", min: 10 },
  { name: "Shellback", emoji: "🛡️", min: 25 },
  { name: "Wave Rider", emoji: "🌊", min: 60 },
  { name: "Pond Sage", emoji: "🧘", min: 150 },
  { name: "Ancient One", emoji: "🐉", min: 365 },
];

export function rankFor(totalTurtles: number): { rank: Rank; next?: Rank; toNext: number } {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (totalTurtles >= RANKS[i].min) idx = i;
  }
  const rank = RANKS[idx];
  const next = RANKS[idx + 1];
  const toNext = next ? next.min - totalTurtles : 0;
  return { rank, next, toNext };
}
