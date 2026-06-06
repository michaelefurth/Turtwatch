// Lazily-created Supabase client. When env vars are absent the app stays in
// local (localStorage) mode and this returns null — so the prototype always
// builds and runs without a backend.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const backend = import.meta.env.VITE_TURTWATCH_BACKEND as string | undefined;

export const isSupabaseEnabled = backend === "supabase" && !!url && !!anon;

// Untyped client: the hand-written Database types in src/data/database.ts don't
// fully satisfy supabase-js's GenericSchema constraint, so we type rows
// explicitly at the boundary (see rowToEntry) instead of via the client generic.
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseEnabled) return null;
  if (!client) {
    client = createClient(url!, anon!, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}
