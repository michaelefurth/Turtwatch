// Pure logic for "Turtle Flip" — a calm, no-fail memory match. Find the pairs;
// there's no timer and no losing. Cards show YOUR uploaded turtle photos (with
// sample turtles filling in if you haven't uploaded enough yet).

export interface FlipCard {
  id: number; // unique slot
  pairId: number; // two cards share this
  image: string; // photo / sample turtle data URL
}

/**
 * Build a shuffled board from a list of face images (one per pair). Each face is
 * placed on exactly two cards.
 */
export function makeDeck(faces: string[], rng: () => number = Math.random): FlipCard[] {
  const cards: FlipCard[] = [];
  faces.forEach((image, pairId) => {
    cards.push({ id: pairId * 2, pairId, image });
    cards.push({ id: pairId * 2 + 1, pairId, image });
  });
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

/**
 * Choose `pairs` face images: prefer the player's own uploaded photos (deduped),
 * then top up with sample turtles. Returns the faces plus how many were yours.
 */
export function pickFaces(
  ownPhotos: string[],
  samplePhotos: string[],
  pairs: number,
): { faces: string[]; ownCount: number } {
  const own = [...new Set(ownPhotos)].slice(0, pairs);
  const faces = [...own];
  let s = 0;
  while (faces.length < pairs && s < samplePhotos.length) {
    faces.push(samplePhotos[s++]);
  }
  return { faces, ownCount: own.length };
}

export const DAILY_GAME_CAP = 30;
export const PERFECT_BONUS = 6;
export const BASE_WIN = 6;

/** Reward for finishing a board; a flawless run (no wasted flips) earns a bonus. */
export function gameReward(pairs: number, mismatches: number): number {
  const perfect = mismatches === 0;
  return BASE_WIN + (perfect ? PERFECT_BONUS : 0) + Math.max(0, Math.min(4, pairs - 4));
}

/** How much of `amount` can still be earned today given the daily cap. */
export function remainingGameReward(earnedToday: number, amount: number): number {
  return Math.max(0, Math.min(amount, DAILY_GAME_CAP - earnedToday));
}
