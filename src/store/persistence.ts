// Persistence adapter. Web prototype = localStorage. Swap this module for
// SQLite (expo-sqlite) or Supabase in the native/cloud builds — the store API
// stays identical.

import type { AppState } from "@/types";

const KEY = "turtwatch.v1";
const SCHEMA_VERSION = 2;

interface Persisted {
  __v: number;
  state: AppState;
}

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted | AppState;
    // Versioned envelope — ignore data from an incompatible older shape so a
    // schema change can't crash the app with undefined fields.
    if (parsed && typeof parsed === "object" && "__v" in parsed) {
      if ((parsed as Persisted).__v !== SCHEMA_VERSION) return null;
      return (parsed as Persisted).state;
    }
    return null; // pre-versioned data: start fresh rather than risk drift
  } catch {
    return null;
  }
}

/** Returns false if persistence failed (e.g. storage quota exceeded / disabled). */
export function saveState(state: AppState): boolean {
  try {
    const payload: Persisted = { __v: SCHEMA_VERSION, state };
    localStorage.setItem(KEY, JSON.stringify(payload));
    return true;
  } catch (e) {
    // Most commonly QuotaExceededError from large base64 photos. Surface it so
    // the UI can warn instead of silently losing data.
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("turtwatch:storage-error", { detail: String(e) }));
    }
    return false;
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
  return JSON.stringify({ __v: SCHEMA_VERSION, state }, null, 2);
}
