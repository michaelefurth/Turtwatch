// Booster-pack logic for the collectible turtle facts. A pack is 3 rarity-weighted
// cards. New cards reward by rarity; duplicates give a little "dust".

import { ALL_FACT_CARDS, RARITY, type FactCardDef, type CardRarity } from "@/data/factCards";

export const BOOSTER_SIZE = 3;
export const BOOSTER_COST = 40; // Turtbux to buy an extra pack (a sink)
export const DUPLICATE_REWARD = 1;

// precompute a cumulative weight table once
const TABLE = (() => {
  let total = 0;
  const cum: { card: FactCardDef; upto: number }[] = [];
  for (const card of ALL_FACT_CARDS) {
    total += RARITY[card.rarity].weight;
    cum.push({ card, upto: total });
  }
  return { total, cum };
})();

export function pullCard(rng: () => number = Math.random): FactCardDef {
  const r = rng() * TABLE.total;
  // binary-ish linear scan is fine for a few hundred entries
  for (const e of TABLE.cum) if (r < e.upto) return e.card;
  return TABLE.cum[TABLE.cum.length - 1].card;
}

export function pullBooster(rng: () => number = Math.random): FactCardDef[] {
  return Array.from({ length: BOOSTER_SIZE }, () => pullCard(rng));
}

export function cardReward(rarity: CardRarity, isNew: boolean): number {
  return isNew ? RARITY[rarity].reward : DUPLICATE_REWARD;
}

export const TOTAL_CARDS = ALL_FACT_CARDS.length;
