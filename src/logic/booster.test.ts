import { describe, it, expect } from "vitest";
import { pullBooster, pullCard, cardReward, BOOSTER_SIZE, TOTAL_CARDS } from "./booster";
import { RARITY, ALL_FACT_CARDS, factCardById } from "@/data/factCards";

describe("fact card pool", () => {
  it("has a few hundred unique cards", () => {
    expect(TOTAL_CARDS).toBeGreaterThanOrEqual(250);
    expect(new Set(ALL_FACT_CARDS.map((c) => c.id)).size).toBe(TOTAL_CARDS);
  });
  it("every card has text, rarity and emoji", () => {
    for (const c of ALL_FACT_CARDS) {
      expect(c.text.length).toBeGreaterThan(8);
      expect(RARITY[c.rarity]).toBeTruthy();
      expect(c.emoji.length).toBeGreaterThan(0);
    }
  });
});

describe("booster pulls", () => {
  it("pulls 3 valid cards", () => {
    const pack = pullBooster(() => 0.5);
    expect(pack).toHaveLength(BOOSTER_SIZE);
    for (const c of pack) expect(factCardById(c.id)).toBeTruthy();
  });
  it("pulls by rarity bucket (two-stage): low roll = common, high roll = legendary", () => {
    expect(pullCard(() => 0).rarity).toBe("common");
    expect(pullCard(() => 0.99).rarity).toBe("legendary");
  });
});

describe("cardReward", () => {
  it("rewards new cards by rarity, dupes give dust", () => {
    expect(cardReward("legendary", true)).toBe(RARITY.legendary.reward);
    expect(cardReward("common", true)).toBe(RARITY.common.reward);
    expect(cardReward("legendary", false)).toBe(1);
  });
});
