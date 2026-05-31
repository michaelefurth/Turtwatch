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
  const snapshot: AppState = { ...state, entries };
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
  return (data?.state as AppState | undefined) ?? null;
}

/** A cheap content signature to detect whether a backup is worth doing. */
export function contentSignature(s: AppState): string {
  return `${s.ledger.length}:${Object.keys(s.entries).length}:${Object.keys(s.inventory).length}:${s.wallet.balance}`;
}

export const cloudAvailable = isSupabaseEnabled;
