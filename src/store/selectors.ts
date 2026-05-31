// Small derived selectors over the persisted state. Kept pure for reuse.

import type { AppState, ShellShield } from "@/types";
import { shopItemById } from "@/data/shopItems";

type Inventory = AppState["inventory"];

function equippedInCategory(inventory: Inventory, category: string): string | undefined {
  for (const [id, v] of Object.entries(inventory)) {
    if (v.equipped && shopItemById(id)?.category === category) return id;
  }
  return undefined;
}

export const equippedAccessory = (inv: Inventory) => equippedInCategory(inv, "mascot_accessory");
export const equippedFrame = (inv: Inventory) => equippedInCategory(inv, "frame");

export function availableShields(shields: ShellShield[]): number {
  return shields.filter((s) => s.status === "available").length;
}

export function totalTurtles(entries: AppState["entries"]): number {
  return Object.keys(entries).length;
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
