// Booster-pack logic for the collectible turtle facts. A pack is 3 rarity-weighted
// cards. New cards reward by rarity; duplicates give a little "dust".

import { ALL_FACT_CARDS, RARITY, type FactCardDef, type CardRarity } from "@/data/factCards";

export const BOOSTER_SIZE = 3;
export const BOOSTER_COST = 60; // Turtbux to buy an extra pack (a sink)
export const DUPLICATE_REWARD = 1;
// duplicates pay a smaller, rarity-scaled amount so late-game packs aren't a
// pure sink (mirrors srv_open_booster's dupe rewards)
const DUPE_REWARD: Record<CardRarity, number> = { common: 1, rare: 2, epic: 5, legendary: 10 };

// Two-stage pull so the stated 60/25/12/3 rarity rates actually hold:
// (1) pick a rarity by its weight, (2) sample uniformly within that rarity.
// (A single per-card cumulative table would compound rarity weight with the
// number of cards in each tier, making legendaries ~15x rarer than intended.)
const RARITIES: CardRarity[] = ["common", "rare", "epic", "legendary"];
const BY_RARITY = new Map<CardRarity, FactCardDef[]>(
  RARITIES.map((r) => [r, ALL_FACT_CARDS.filter((c) => c.rarity === r)]),
);
const RARITY_CUM = (() => {
  const total = RARITIES.reduce((s, r) => s + RARITY[r].weight, 0);
  let cum = 0;
  return RARITIES.map((r) => ({ rarity: r, upto: (cum += RARITY[r].weight) / total }));
})();

export function pullCard(rng: () => number = Math.random): FactCardDef {
  const roll = rng();
  let bucket = RARITY_CUM.find((e) => roll < e.upto)?.rarity ?? "common";
  let pool = BY_RARITY.get(bucket)!;
  if (pool.length === 0) pool = BY_RARITY.get("common")!; // safety
  return pool[Math.floor(rng() * pool.length)] ?? ALL_FACT_CARDS[0];
}

export function pullBooster(rng: () => number = Math.random): FactCardDef[] {
  return Array.from({ length: BOOSTER_SIZE }, () => pullCard(rng));
}

export function cardReward(rarity: CardRarity, isNew: boolean): number {
  return isNew ? RARITY[rarity].reward : DUPE_REWARD[rarity];
}

export const TOTAL_CARDS = ALL_FACT_CARDS.length;
