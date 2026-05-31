import { describe, it, expect } from "vitest";
import { findMemory, distinctTurtleNames, completionThisMonth } from "./selectors";
import { addDays, todayKey } from "@/logic/dates";
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

describe("completionThisMonth", () => {
  it("counts only elapsed days for the current month", () => {
    const now = new Date();
    const { done, days } = completionThisMonth({}, now.getFullYear(), now.getMonth());
    expect(days).toBe(now.getDate());
    expect(done).toBe(0);
  });
});
