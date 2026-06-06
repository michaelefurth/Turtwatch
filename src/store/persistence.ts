// Persistence adapter. Web prototype = localStorage. Swap this module for
// SQLite (expo-sqlite) or Supabase in the native/cloud builds — the store API
// stays identical.

import type { AppState } from "@/types";
import { makeInitialState } from "./initialState";

const KEY = "turtwatch.v1";
const SCHEMA_VERSION = 3; // v3 adds comfort prefs + perfect-day tracking

interface Persisted {
  __v: number;
  state: AppState;
}

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted | AppState;
    if (parsed && typeof parsed === "object" && "__v" in parsed) {
      const st = (parsed as Persisted).state;
      if ((parsed as Persisted).__v === SCHEMA_VERSION) return st;
      // Older version: best-effort migrate by filling any newly-added fields with
      // defaults instead of discarding the user's turtles. Only attempt this when
      // the core shape is present, so a corrupt blob still starts fresh safely.
      if (st && typeof st === "object" && "entries" in st && "wallet" in st) {
        return { ...makeInitialState(), ...st };
      }
      return null;
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

/** Parse an exported backup (envelope or bare state) into a usable AppState,
 *  filling any missing fields with defaults. Returns null if it isn't one. */
export function parseImportedState(json: string): AppState | null {
  try {
    const parsed = JSON.parse(json) as Persisted | AppState;
    const st = (parsed && typeof parsed === "object" && "state" in parsed ? (parsed as Persisted).state : parsed) as AppState;
    if (st && typeof st === "object" && "entries" in st && "wallet" in st) {
      return { ...makeInitialState(), ...st };
    }
    return null;
  } catch {
    return null;
  }
}
