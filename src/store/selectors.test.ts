import { describe, it, expect } from "vitest";
import { findMemory, distinctTurtleNames, completionThisMonth, weeklyRecap } from "./selectors";
import { addDays, todayKey } from "@/logic/dates";
import { makeInitialState } from "@/store/initialState";
import type { TurtleEntry } from "@/types";

function e(date: string, name?: string): TurtleEntry {
  return { id: date, date, state: "completed", turtleName: name, tags: [], earnedTurtbux: 0, bonuses: {}, createdAt: "", updatedAt: "" };
}

describe("findMemory", () => {
  it("returns the one-year-ago entry when present", () => {
    const today = todayKey();
    const entries = { [addDays(today, -365)]: e(addDays(today, -365), "Old Pal") };
    const m = findMemory(entries, today);
    expect(m?.label).toContain("year");
    expect(m?.entry.turtleName).toBe("Old Pal");
  });

  it("falls back to 30 days ago", () => {
    const today = todayKey();
    const entries = { [addDays(today, -30)]: e(addDays(today, -30)) };
    expect(findMemory(entries, today)?.label).toContain("month");
  });

  it("returns undefined with no matching memory", () => {
    expect(findMemory({}, todayKey())).toBeUndefined();
  });
});

describe("distinctTurtleNames", () => {
  it("dedupes and sorts names, ignoring blanks", () => {
    const entries = { a: e("a", "Bob"), b: e("b", "Ann"), c: e("c", "Bob"), d: e("d") };
    expect(distinctTurtleNames(entries)).toEqual(["Ann", "Bob"]);
  });
});

describe("weeklyRecap", () => {
  it("counts covered days in the last week and sums recent earnings", () => {
    const today = todayKey();
    const s = makeInitialState();
    s.entries = { [today]: e(today), [addDays(today, -1)]: e(addDays(today, -1)), [addDays(today, -40)]: e(addDays(today, -40)) };
    s.ledger = [
      { id: "1", delta: 10, reason: "upload", balanceAfter: 10, createdAt: new Date().toISOString() },
      { id: "2", delta: -5, reason: "repair", balanceAfter: 5, createdAt: new Date().toISOString() },
      { id: "3", delta: 99, reason: "upload", balanceAfter: 104, createdAt: "2000-01-01T00:00:00.000Z" },
    ];
    const r = weeklyRecap(s);
    expect(r.days).toHaveLength(7);
    expect(r.covered).toBe(2); // today + yesterday (the -40 day is outside the window)
    expect(r.days[6].done).toBe(true); // today is last
    expect(r.earned).toBe(10); // only positive deltas within the last 7 days
  });
});

describe("completionThisMonth", () => {
  it("counts only elapsed days for the current month", () => {
    const now = new Date();
    const { done, days } = completionThisMonth({}, now.getFullYear(), now.getMonth());
    expect(days).toBe(now.getDate());
    expect(done).toBe(0);
  });
});
