import { describe, it, expect } from "vitest";
import { buildMantras, ALL_MANTRAS, remainingMantraReward, MANTRA_DAILY_CAP } from "./mantras";

describe("mantras", () => {
  it("generates 200+ unique mantras", () => {
    const all = buildMantras();
    expect(all.length).toBeGreaterThanOrEqual(200);
    expect(new Set(all).size).toBe(all.length); // all unique
  });

  it("exposes the prebuilt list", () => {
    expect(ALL_MANTRAS.length).toBeGreaterThanOrEqual(200);
  });

  it("every mantra is non-empty and reasonably sized", () => {
    for (const m of ALL_MANTRAS) {
      expect(m.trim().length).toBeGreaterThan(8);
      expect(m.length).toBeLessThan(160);
    }
  });
});

describe("remainingMantraReward", () => {
  it("respects the daily cap", () => {
    expect(remainingMantraReward(0, 2)).toBe(2);
    expect(remainingMantraReward(MANTRA_DAILY_CAP - 1, 2)).toBe(1);
    expect(remainingMantraReward(MANTRA_DAILY_CAP, 2)).toBe(0);
  });
});
