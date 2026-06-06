// Pure streak engine. Recomputes from the full entry set — never increment blindly.
// See docs/05-streak-and-turtbux-logic.md.

import type { TurtleEntry } from "@/types";
import { addDays, todayKey } from "./dates";

export interface StreakInfo {
  current: number;
  longest: number;
  atRisk: boolean; // today not yet covered, but yesterday is (grace until midnight)
  lastCoveredDate?: string;
}

/** A day "counts" if an entry exists in any covered state. */
export function coveredDates(entries: Record<string, TurtleEntry>): Set<string> {
  return new Set(Object.keys(entries));
}

export function computeStreak(
  entries: Record<string, TurtleEntry>,
  now: Date = new Date(),
): StreakInfo {
  const days = coveredDates(entries);
  const today = todayKey(now);
  const yesterday = addDays(today, -1);

  // ----- current streak (with midnight grace) -----
  let current = 0;
  let atRisk = false;
  if (days.has(today)) {
    let cursor = today;
    while (days.has(cursor)) {
      current++;
      cursor = addDays(cursor, -1);
    }
  } else if (days.has(yesterday)) {
    atRisk = true;
    let cursor = yesterday;
    while (days.has(cursor)) {
      current++;
      cursor = addDays(cursor, -1);
    }
  } else {
    current = 0;
  }

  // ----- longest run ever -----
  const sorted = [...days].sort();
  let longest = 0;
  let run = 0;
  let prev: string | undefined;
  for (const key of sorted) {
    if (prev && addDays(prev, 1) === key) run++;
    else run = 1;
    if (run > longest) longest = run;
    prev = key;
  }
  longest = Math.max(longest, current);

  const lastCoveredDate = sorted.length ? sorted[sorted.length - 1] : undefined;
  return { current, longest, atRisk, lastCoveredDate };
}

/** The most recent past day (before today) that has no entry — candidate to repair/shield. */
export function mostRecentMissedDay(
  entries: Record<string, TurtleEntry>,
  now: Date = new Date(),
): string | undefined {
  const today = todayKey(now);
  let cursor = addDays(today, -1);
  // look back up to ~1 year
  for (let i = 0; i < 366; i++) {
    if (!entries[cursor]) return cursor;
    cursor = addDays(cursor, -1);
  }
  return undefined;
}
