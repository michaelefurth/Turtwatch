// Collectible turtle fact cards. A few hundred whimsical, wholesome "facts"
// generated from cozy templates, plus the curated real facts as rarer pulls.
// (TurtWatch is a playful diary, not a textbook — the generated ones are fun.)

import { FACTS } from "./facts";

export type CardRarity = "common" | "rare" | "epic" | "legendary";

export interface FactCardDef {
  id: string;
  text: string;
  rarity: CardRarity;
  emoji: string;
}

export const RARITY: Record<CardRarity, { label: string; weight: number; reward: number; color: string }> = {
  common: { label: "Common", weight: 60, reward: 3, color: "#9fdcc0" },
  rare: { label: "Rare", weight: 25, reward: 8, color: "#8fbdf0" },
  epic: { label: "Epic", weight: 12, reward: 16, color: "#c3a8f0" },
  legendary: { label: "Legendary", weight: 3, reward: 35, color: "#f6c453" },
};

const NAMES = ["Sir Shellington", "Lady Paddlesworth", "Captain Mossback", "Pebbles", "Duchess Lagoona", "Baron von Flipper", "Tortellini", "Sunny", "Professor Snap", "Marbles", "Admiral Driftwood", "Biscuit"];
const ABILITIES = ["hold its breath for a whole afternoon", "nap on a lily pad without floating away", "sense a rainstorm an hour early", "find its way home across an entire ocean", "out-shine any sunbeam it sits in", "win a staring contest with a frog", "balance a pebble on its nose", "snooze through an entire thunderstorm", "recognise its favourite human's footsteps", "munch a strawberry in record-slow time", "doze with both eyes half-closed", "hum a tune that calms the whole pond"];
const PLACES = ["Lily Lagoon", "Coral Bay", "the Misty Cove", "Pebble Beach", "Sunset Point", "Kelp Forest", "Turtle Town", "Bubble Springs", "Seagrass Meadow", "Rainbow Reef"];
const HABITS = ["sunbathe together at dawn", "race snails (and lose, happily)", "collect the shiniest pebbles", "hum softly to the tide", "stack themselves into tiny towers", "trade lily pads like postcards", "nap in perfect synchronised rows", "throw the gentlest splash parties"];
const ADJ = ["ancient", "sleepy", "majestic", "tiny", "wise", "rainbow", "moonlit", "golden", "bashful", "legendary"];
const FEAT = ["once napped for a hundred years", "taught the tide how to be patient", "carries a whole galaxy on its shell", "knows the name of every star", "invented the art of slowing down", "out-waited a glacier", "befriended a very lost seagull", "keeps the pond's oldest secret"];
const SNACKS = ["a crisp leaf of lettuce", "a single perfect strawberry", "sun-warmed seagrass", "a dandelion (the yellow ones)", "a slice of cucumber", "a handful of pond clover", "a ripe blueberry", "a petal from a lily flower"];
const DREAMS = ["endless sunny lily pads", "a beach made entirely of snacks", "racing clouds across the sky", "a warm rock and nowhere to be", "the softest seagrass meadow", "becoming a very small island", "a pond with no edges", "floating among the stars"];

const EMOJI_POOL = ["🐢", "🪷", "🌿", "🫧", "⭐", "🌸", "🌊", "🐠", "🍃", "🌻", "🪨", "🌅", "🐚", "🌈", "☀️", "💧"];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function rarityFor(id: string): CardRarity {
  const r = hash("rar:" + id) % 100;
  if (r < 60) return "common";
  if (r < 85) return "rare";
  if (r < 97) return "epic";
  return "legendary";
}

function emojiFor(id: string): string {
  return EMOJI_POOL[hash("emo:" + id) % EMOJI_POOL.length];
}

function gen(): FactCardDef[] {
  const out: FactCardDef[] = [];
  const add = (id: string, text: string) => out.push({ id, text, rarity: rarityFor(id), emoji: emojiFor(id) });

  NAMES.forEach((n, i) => ABILITIES.forEach((a, j) => add(`g1-${i}-${j}`, `${n} the turtle can ${a}.`)));
  PLACES.forEach((p, i) => HABITS.forEach((h, j) => add(`g2-${i}-${j}`, `In ${p}, turtles love to ${h}.`)));
  ADJ.forEach((ad, i) => FEAT.forEach((f, j) => add(`g3-${i}-${j}`, `Legend says the ${ad} turtle ${f}.`)));
  SNACKS.forEach((sn, i) => add(`g4-${i}`, `A turtle's favourite snack is ${sn}.`));
  DREAMS.forEach((d, i) => add(`g5-${i}`, `Turtles dream of ${d}.`));
  return out;
}

// curated real facts become rarer, more prestigious pulls
const CURATED: FactCardDef[] = FACTS.map((f) => ({
  id: `r-${f.id}`,
  text: `${f.title}: ${f.body}`,
  rarity: f.rarity === "legendary" ? "legendary" : f.rarity === "rare" ? "epic" : "rare",
  emoji: f.emoji,
}));

export const ALL_FACT_CARDS: FactCardDef[] = [...gen(), ...CURATED];

const BY_ID = new Map(ALL_FACT_CARDS.map((c) => [c.id, c]));
export function factCardById(id: string): FactCardDef | undefined {
  return BY_ID.get(id);
}
