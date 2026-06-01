// Small derived selectors over the persisted state. Kept pure for reuse.

import type { AppState, ShellShield } from "@/types";
import { shopItemById } from "@/data/shopItems";
import { addDays, todayKey } from "@/logic/dates";

type Inventory = AppState["inventory"];

function equippedInCategory(inventory: Inventory, category: string): string | undefined {
  for (const [id, v] of Object.entries(inventory)) {
    if (v.equipped && shopItemById(id)?.category === category) return id;
  }
  return undefined;
}

export const equippedAccessory = (inv: Inventory) => equippedInCategory(inv, "mascot_accessory");
export const equippedFrame = (inv: Inventory) => equippedInCategory(inv, "frame");
export const equippedSticker = (inv: Inventory) => equippedInCategory(inv, "sticker");

export function availableShields(shields: ShellShield[]): number {
  return shields.filter((s) => s.status === "available").length;
}

export function totalTurtles(entries: AppState["entries"]): number {
  return Object.keys(entries).length;
}

/** Last-7-days summary for the Home recap card. */
export function weeklyRecap(s: AppState): { days: { key: string; done: boolean }[]; covered: number; earned: number } {
  const today = todayKey();
  const days = Array.from({ length: 7 }, (_, i) => {
    const key = addDays(today, i - 6); // oldest → today
    return { key, done: !!s.entries[key] };
  });
  const covered = days.filter((d) => d.done).length;
  const since = addDays(today, -6); // inclusive 7-day window by date key
  let earned = 0;
  for (const l of s.ledger) {
    if (l.delta > 0 && l.createdAt.slice(0, 10) >= since) earned += l.delta;
  }
  return { days, covered, earned };
}

/** "On this day" memory: same calendar date last year, else 90 / 30 days ago. */
export function findMemory(
  entries: AppState["entries"],
  todayKey: string,
): { entry: AppState["entries"][string]; label: string } | undefined {
  const back = (days: number) => addDays(todayKey, -days);
  const candidates: { days: number; label: string }[] = [
    { days: 365, label: "One year ago today 🥹" },
    { days: 90, label: "90 days ago 🐢" },
    { days: 30, label: "A month ago today" },
  ];
  for (const c of candidates) {
    const e = entries[back(c.days)];
    if (e) return { entry: e, label: c.label };
  }
  return undefined;
}

/** Distinct turtle names across entries (for feed filtering). */
export function distinctTurtleNames(entries: AppState["entries"]): string[] {
  const set = new Set<string>();
  for (const e of Object.values(entries)) {
    if (e.turtleName && e.turtleName.trim()) set.add(e.turtleName.trim());
  }
  return [...set].sort();
}

export function completionThisMonth(entries: AppState["entries"], year: number, month0: number): { done: number; days: number } {
  const now = new Date();
  const fullDays = new Date(year, month0 + 1, 0).getDate();
  // For the current month, only count days that have actually elapsed so the
  // percentage isn't diluted by future days the user can't have filled yet.
  const isCurrent = now.getFullYear() === year && now.getMonth() === month0;
  const days = isCurrent ? now.getDate() : fullDays;
  let done = 0;
  for (let d = 1; d <= days; d++) {
    const key = `${year}-${String(month0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (entries[key]) done++;
  }
  return { done, days };
}
