import { describe, it, expect } from "vitest";
import { computeStreak, mostRecentMissedDay } from "./streak";
import { uploadReward, estimateUpload, loginBonus, LOGIN_BONUS_BASE } from "./turtbux";
import { rankFor } from "./ranks";
import { addDays, todayKey } from "./dates";
import type { TurtleEntry } from "@/types";

function entry(date: string, state: TurtleEntry["state"] = "completed"): TurtleEntry {
  return {
    id: date, date, state, tags: [], earnedTurtbux: 0, bonuses: {},
    createdAt: "", updatedAt: "",
  };
}

function entriesFor(keys: string[]): Record<string, TurtleEntry> {
  return Object.fromEntries(keys.map((k) => [k, entry(k)]));
}

describe("computeStreak", () => {
  const today = todayKey();

  it("counts a run ending today", () => {
    const e = entriesFor([addDays(today, -2), addDays(today, -1), today]);
    expect(computeStreak(e).current).toBe(3);
  });

  it("is at-risk-but-intact when only yesterday is covered", () => {
    const e = entriesFor([addDays(today, -2), addDays(today, -1)]);
    const s = computeStreak(e);
    expect(s.current).toBe(2);
    expect(s.atRisk).toBe(true);
  });

  it("breaks to 0 when neither today nor yesterday covered", () => {
    const e = entriesFor([addDays(today, -5), addDays(today, -4)]);
    expect(computeStreak(e).current).toBe(0);
  });

  it("preserves longest across a broken current streak", () => {
    const e = entriesFor([
      addDays(today, -10), addDays(today, -9), addDays(today, -8), addDays(today, -7),
      today,
    ]);
    const s = computeStreak(e);
    expect(s.current).toBe(1);
    expect(s.longest).toBe(4);
  });

  it("shielded/repaired days count toward streaks", () => {
    const e: Record<string, TurtleEntry> = {
      [addDays(today, -1)]: entry(addDays(today, -1), "shielded"),
      [today]: entry(today, "repaired"),
    };
    expect(computeStreak(e).current).toBe(2);
  });
});

describe("mostRecentMissedDay", () => {
  it("finds yesterday when empty", () => {
    const today = todayKey();
    expect(mostRecentMissedDay(entriesFor([today]))).toBe(addDays(today, -1));
  });
});

describe("uploadReward", () => {
  it("gives base + streak bonus", () => {
    const r = uploadReward({ streakAfterUpload: 3, hasNotes: false, hasMeta: false });
    expect(r.total).toBe(13); // 10 + 3
  });

  it("caps streak bonus at 30 and adds milestone", () => {
    const r = uploadReward({ streakAfterUpload: 30, hasNotes: false, hasMeta: false });
    expect(r.total).toBe(10 + 30 + 100); // base + cap + 30-day milestone
  });

  it("adds note and meta bonuses", () => {
    const r = uploadReward({ streakAfterUpload: 1, hasNotes: true, hasMeta: true });
    expect(r.total).toBe(10 + 1 + 3 + 2);
  });

  it("estimate uses streak+1", () => {
    expect(estimateUpload(0, false, false)).toBe(11); // streakAfter=1 -> 10+1
  });
});

describe("loginBonus", () => {
  it("is just the base with no streak", () => {
    expect(loginBonus(0)).toBe(LOGIN_BONUS_BASE);
    expect(loginBonus(3)).toBe(LOGIN_BONUS_BASE);
  });
  it("adds the highest qualifying streak tier", () => {
    expect(loginBonus(7)).toBe(LOGIN_BONUS_BASE + 10);
    expect(loginBonus(30)).toBe(LOGIN_BONUS_BASE + 25);
    expect(loginBonus(365)).toBe(LOGIN_BONUS_BASE + 75);
  });
});

describe("rankFor", () => {
  it("starts at Hatchling", () => {
    expect(rankFor(0).rank.name).toBe("Hatchling");
  });
  it("promotes by total turtles", () => {
    expect(rankFor(12).rank.name).toBe("Pondling");
    expect(rankFor(400).rank.name).toBe("Ancient One");
  });
});
