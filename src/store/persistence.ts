// Persistence adapter. Web prototype = localStorage. Swap this module for
// SQLite (expo-sqlite) or Supabase in the native/cloud builds — the store API
// stays identical.

import type { AppState } from "@/types";

const KEY = "turtwatch.v1";

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AppState) : null;
  } catch {
    return null;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage full / unavailable — fail silent in prototype
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}
