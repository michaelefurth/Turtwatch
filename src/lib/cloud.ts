// Account + cloud sync for TurtWatch. Backs up the whole app state (with photos
// offloaded to Supabase Storage) into a per-user JSONB row, so turtles are
// saved and accessible from any device. Requires the Supabase backend
// (VITE_TURTWATCH_BACKEND=supabase). See supabase/migrations/0003_user_state.sql.

import type { User } from "@supabase/supabase-js";
import type { AppState } from "@/types";
import { getSupabase, isSupabaseEnabled } from "@/lib/supabase";
import { SupabaseImageStorage } from "@/lib/storage/supabaseStorage";
import { isDataUrl, dataUrlToBlob } from "@/lib/image";

export { isSupabaseEnabled } from "@/lib/supabase";

// cache the auth user so callers can check sign-in synchronously
let cachedUser: User | null = null;
let listening = false;

function startAuthListener() {
  if (listening) return;
  const sb = getSupabase();
  if (!sb) return;
  listening = true;
  sb.auth.getUser().then(({ data }) => (cachedUser = data.user ?? null));
  sb.auth.onAuthStateChange((_e, session) => {
    cachedUser = session?.user ?? null;
  });
}

export function currentUser(): User | null {
  startAuthListener();
  return cachedUser;
}

export async function refreshUser(): Promise<User | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  cachedUser = data.user ?? null;
  return cachedUser;
}

export async function signUp(email: string, password: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud accounts aren't configured in this build.");
  const { error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  await refreshUser();
}

export async function signIn(email: string, password: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud accounts aren't configured in this build.");
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await refreshUser();
}

export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
  cachedUser = null;
}

/**
 * Push the app state to the cloud. Inline base64 photos are uploaded to Storage
 * first and replaced with durable URLs (so the JSONB row stays small and photos
 * are reachable from any device). Returns the URL-ified snapshot.
 */
export async function backup(state: AppState): Promise<AppState> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud not configured");
  const user = await refreshUser();
  if (!user) throw new Error("Please sign in first.");

  const storage = new SupabaseImageStorage();
  const entries = { ...state.entries };
  for (const [date, e] of Object.entries(entries)) {
    if (isDataUrl(e.photoUrl)) {
      const url = await storage.upload(`${user.id}/${date}`, dataUrlToBlob(e.photoUrl!));
      entries[date] = { ...e, photoUrl: url };
    }
  }
  // `cloud` is device-local metadata (auto-backup pref, last-backup time) — never
  // serialize it, so it can't bleed across devices on restore.
  const snapshot: AppState = { ...state, entries, cloud: undefined };
  const { error } = await sb
    .from("user_state")
    .upsert({ user_id: user.id, state: snapshot, updated_at: new Date().toISOString() });
  if (error) throw error;
  return snapshot;
}

/** Pull the cloud snapshot for the signed-in user, or null if none exists. */
export async function restore(): Promise<AppState | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const user = await refreshUser();
  if (!user) throw new Error("Please sign in first.");
  const { data, error } = await sb
    .from("user_state")
    .select("state")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  const remote = data?.state as AppState | undefined;
  if (!remote) return null;
  // sanity-check the shape before handing it to the store (guards against drift)
  if (!remote.profile || !remote.wallet || typeof remote.entries !== "object") {
    throw new Error("Cloud backup looks corrupted or from an old version.");
  }
  return remote;
}

/**
 * A content signature to detect whether a backup is worth doing. Includes a
 * cheap fold over entry updated-at stamps so metadata-only edits (notes, mood,
 * tags) also trigger auto-backup.
 */
export function contentSignature(s: AppState): string {
  let h = 0;
  for (const e of Object.values(s.entries)) {
    const u = e.updatedAt || "";
    for (let i = 0; i < u.length; i++) h = (h * 31 + u.charCodeAt(i)) | 0;
  }
  return `${s.ledger.length}:${Object.keys(s.entries).length}:${Object.keys(s.inventory).length}:${s.wallet.balance}:${h}`;
}

export const cloudAvailable = isSupabaseEnabled;
