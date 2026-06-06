// Hatchlings — collectible baby turtles in outfits, hatched from care eggs
// (Finch-style). Cosmetic only. Render = a turtle with an outfit emoji badge on
// a rarity-tinted tile. Rarity colors are shared with the fact-card system.
import { RARITY, type CardRarity } from "@/data/factCards";

export type HatchRarity = CardRarity; // common | rare | epic | legendary
export const HATCH_RARITY = RARITY;

export interface Hatchling {
  id: string;
  name: string;
  outfit: string; // outfit/prop emoji shown on the turtle
  rarity: HatchRarity;
}

// care points to fill one egg
export const EGG_COST = 100;

// releasing a duplicate hatchling returns care (rarity-scaled) toward the next egg
export const RELEASE_CARE: Record<HatchRarity, number> = { common: 15, rare: 25, epic: 40, legendary: 60 };

export const HATCHLINGS: Hatchling[] = [
  // ---- common (everyday darlings) ----
  { id: "h-cap", name: "Cappy", outfit: "🧢", rarity: "common" },
  { id: "h-scarf", name: "Scarfy", outfit: "🧣", rarity: "common" },
  { id: "h-bow", name: "Bowbow", outfit: "🎀", rarity: "common" },
  { id: "h-glasses", name: "Specs", outfit: "👓", rarity: "common" },
  { id: "h-flower", name: "Blossom", outfit: "🌺", rarity: "common" },
  { id: "h-leaf", name: "Sprout", outfit: "🍀", rarity: "common" },
  { id: "h-shroom", name: "Toadstool", outfit: "🍄", rarity: "common" },
  { id: "h-pack", name: "Trekker", outfit: "🎒", rarity: "common" },
  { id: "h-tie", name: "Sir Shellby", outfit: "👔", rarity: "common" },
  { id: "h-vest", name: "Hi-Vis", outfit: "🦺", rarity: "common" },
  { id: "h-cone", name: "Scoop", outfit: "🍦", rarity: "common" },
  { id: "h-cupcake", name: "Sprinkle", outfit: "🧁", rarity: "common" },
  { id: "h-bee", name: "Buzz", outfit: "🐝", rarity: "common" },
  { id: "h-flutter", name: "Flutter", outfit: "🦋", rarity: "common" },
  { id: "h-sun", name: "Sunny", outfit: "☀️", rarity: "common" },
  { id: "h-moon", name: "Luna", outfit: "🌙", rarity: "common" },
  { id: "h-balloon", name: "Floaty", outfit: "🎈", rarity: "common" },
  { id: "h-umbrella", name: "Drizzle", outfit: "☔", rarity: "common" },

  // ---- rare (a little fancy) ----
  { id: "h-shades", name: "Cool Cucumber", outfit: "🕶️", rarity: "rare" },
  { id: "h-goggles", name: "Tinker", outfit: "🥽", rarity: "rare" },
  { id: "h-cowboy", name: "Tex", outfit: "🤠", rarity: "rare" },
  { id: "h-grad", name: "Scholar", outfit: "🎓", rarity: "rare" },
  { id: "h-guitar", name: "Riff", outfit: "🎸", rarity: "rare" },
  { id: "h-surf", name: "Gnarly", outfit: "🏄", rarity: "rare" },
  { id: "h-chef", name: "Chef Shell", outfit: "🍳", rarity: "rare" },
  { id: "h-paint", name: "Picasshell", outfit: "🎨", rarity: "rare" },
  { id: "h-party", name: "Confetti", outfit: "🎉", rarity: "rare" },
  { id: "h-snow", name: "Frosty", outfit: "❄️", rarity: "rare" },

  // ---- epic (showstoppers) ----
  { id: "h-wizard", name: "Wizard Shelly", outfit: "🧙", rarity: "epic" },
  { id: "h-hero", name: "Captain Shell", outfit: "🦸", rarity: "epic" },
  { id: "h-knight", name: "Sir Baleful", outfit: "🛡️", rarity: "epic" },
  { id: "h-astro", name: "Major Tom", outfit: "🚀", rarity: "epic" },
  { id: "h-rainbow", name: "Prism", outfit: "🌈", rarity: "epic" },
  { id: "h-star", name: "Twinkle", outfit: "⭐", rarity: "epic" },

  // ---- legendary (one in a pond) ----
  { id: "h-crown", name: "Her Majesty", outfit: "👑", rarity: "legendary" },
  { id: "h-diamond", name: "Diamond Dawn", outfit: "💎", rarity: "legendary" },
  { id: "h-dragon", name: "Drake the Shelldon", outfit: "🐉", rarity: "legendary" },
];

export const TOTAL_HATCHLINGS = HATCHLINGS.length;

export const hatchlingById = (id: string): Hatchling | undefined => HATCHLINGS.find((h) => h.id === id);

const WEIGHTS: Record<HatchRarity, number> = { common: 58, rare: 27, epic: 12, legendary: 3 };

/** Roll a hatchling: pick a rarity by weight, then a uniform pick within it. */
export function rollHatchling(): Hatchling {
  const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  let chosen: HatchRarity = "common";
  for (const rarity of ["common", "rare", "epic", "legendary"] as HatchRarity[]) {
    if (r < WEIGHTS[rarity]) { chosen = rarity; break; }
    r -= WEIGHTS[rarity];
  }
  const pool = HATCHLINGS.filter((h) => h.rarity === chosen);
  return pool[Math.floor(Math.random() * pool.length)] ?? HATCHLINGS[0];
}
