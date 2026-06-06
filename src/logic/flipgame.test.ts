import { describe, it, expect } from "vitest";
import { makeDeck, pickFaces, gameReward, remainingGameReward, DAILY_GAME_CAP } from "./flipgame";

describe("makeDeck", () => {
  it("creates two cards per face", () => {
    const deck = makeDeck(["a", "b", "c"], () => 0);
    expect(deck).toHaveLength(6);
    const counts = deck.reduce<Record<number, number>>((m, c) => ((m[c.pairId] = (m[c.pairId] ?? 0) + 1), m), {});
    expect(Object.values(counts)).toEqual([2, 2, 2]);
  });
});

describe("pickFaces", () => {
  it("prefers own photos then tops up with samples", () => {
    const r = pickFaces(["p1", "p2"], ["s1", "s2", "s3", "s4"], 4);
    expect(r.ownCount).toBe(2);
    expect(r.faces).toEqual(["p1", "p2", "s1", "s2"]);
  });

  it("dedupes own photos", () => {
    const r = pickFaces(["p1", "p1", "p2"], ["s1", "s2"], 3);
    expect(r.faces).toEqual(["p1", "p2", "s1"]);
    expect(r.ownCount).toBe(2);
  });

  it("uses all own photos when enough", () => {
    const r = pickFaces(["a", "b", "c", "d"], ["s1"], 3);
    expect(r.ownCount).toBe(3);
    expect(r.faces).toEqual(["a", "b", "c"]);
  });
});

describe("gameReward", () => {
  it("gives a perfect bonus for no mismatches", () => {
    expect(gameReward(6, 0)).toBeGreaterThan(gameReward(6, 3));
  });
});

describe("remainingGameReward", () => {
  it("caps the daily earnings", () => {
    expect(remainingGameReward(DAILY_GAME_CAP - 2, 10)).toBe(2);
    expect(remainingGameReward(DAILY_GAME_CAP, 10)).toBe(0);
    expect(remainingGameReward(0, 8)).toBe(8);
  });
});
