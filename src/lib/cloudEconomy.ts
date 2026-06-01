// Server-authoritative cloud economy. In cloud mode the local store still
// updates optimistically for snappy UI, then this reconciler calls the matching
// server RPC (which RECOMPUTES the reward) and patches the authoritative wallet
// back — so a tampered client can never mint Turtbux. On any error it re-hydrates
// from the server (rollback). See supabase/migrations/0005_server_economy.sql.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppState } from "@/types";
import { getSupabase } from "@/lib/supabase";
import { persistPhoto } from "@/lib/storage";
import { rowToEntry } from "@/data/repository";
import { makeInitialState } from "@/store/initialState";
import { useStore, type EconomyKind } from "@/store/useStore";
import { todayKey } from "@/logic/dates";

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
const sbOrThrow = (): SupabaseClient => {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  return sb;
};

async function currentUserId(): Promise<string | null> {
  const { data } = await sbOrThrow().auth.getUser();
  return data.user?.id ?? null;
}

/** Build the full local AppState from the relational tables. */
export async function loadCloudState(): Promise<AppState | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const uidv = await currentUserId();
  if (!uidv) return null;

  const [user, wallet, entries, inv, shields, cards, tasks, notif, ledger] = await Promise.all([
    sb.from("app_user").select("*").eq("id", uidv).maybeSingle(),
    sb.from("wallet").select("*").eq("user_id", uidv).maybeSingle(),
    sb.from("turtle_entry").select("*").eq("user_id", uidv),
    sb.from("user_inventory").select("item_id, equipped, acquired_at").eq("user_id", uidv),
    sb.from("shell_shield").select("id, status, acquired_at, used_on_date").eq("user_id", uidv),
    sb.from("user_card").select("card_id, copies").eq("user_id", uidv),
    sb.from("task_item").select("id, title, done, last_done, created_at").eq("user_id", uidv),
    sb.from("notification_settings").select("*").eq("user_id", uidv).maybeSingle(),
    sb.from("turtbux_ledger").select("*").eq("user_id", uidv).order("created_at", { ascending: false }).limit(200),
  ]);

  const base = makeInitialState();
  const u = user.data ?? {};
  const w = wallet.data ?? { balance: 0, lifetime_earned: 0, lifetime_spent: 0 };

  const entryMap: AppState["entries"] = {};
  for (const r of entries.data ?? []) entryMap[(r as { entry_date: string }).entry_date] = rowToEntry(r as never);

  const inventory: AppState["inventory"] = {};
  for (const i of inv.data ?? []) inventory[(i as { item_id: string }).item_id] = { equipped: (i as { equipped: boolean }).equipped, acquiredAt: (i as { acquired_at: string }).acquired_at };

  const collection: Record<string, number> = {};
  for (const c of cards.data ?? []) collection[(c as { card_id: string }).card_id] = (c as { copies: number }).copies;

  const n = notif.data as { daily_reminder_enabled?: boolean; reminder_time?: string; streak_risk_enabled?: boolean; fact_of_day_enabled?: boolean } | null;

  return {
    ...base,
    onboarded: true,
    profile: {
      displayName: (u as { display_name?: string }).display_name ?? "Pond Keeper",
      mascot: ((u as { mascot?: "turtley" | "shelldon" }).mascot ?? "turtley"),
      mascotName: (u as { mascot_name?: string }).mascot_name ?? undefined,
      themeId: (u as { theme_id?: string }).theme_id ?? "pond_mint",
      timezone: (u as { timezone?: string }).timezone ?? base.profile.timezone,
      isPremium: (u as { is_premium?: boolean }).is_premium ?? false,
      createdAt: (u as { created_at?: string }).created_at ?? base.profile.createdAt,
    },
    wallet: { balance: w.balance ?? 0, lifetimeEarned: (w as { lifetime_earned?: number }).lifetime_earned ?? 0, lifetimeSpent: (w as { lifetime_spent?: number }).lifetime_spent ?? 0 },
    entries: entryMap,
    inventory,
    collection,
    shields: (shields.data ?? []).map((s) => ({ id: (s as { id: string }).id, status: (s as { status: "available" | "used" }).status, acquiredAt: (s as { acquired_at: string }).acquired_at, usedOnDate: (s as { used_on_date?: string }).used_on_date ?? undefined })),
    ledger: (ledger.data ?? []).map((l) => ({ id: (l as { id: string }).id, delta: (l as { delta: number }).delta, reason: (l as { reason: AppState["ledger"][number]["reason"] }).reason, refType: (l as { ref_type?: string }).ref_type ?? undefined, refId: (l as { ref_id?: string }).ref_id ?? undefined, balanceAfter: (l as { balance_after: number }).balance_after, createdAt: (l as { created_at: string }).created_at })),
    quest: {
      tasks: (tasks.data ?? []).map((t) => ({ id: (t as { id: string }).id, title: (t as { title: string }).title, done: (t as { done: boolean }).done, lastDoneDate: (t as { last_done?: string }).last_done ?? undefined, createdAt: (t as { created_at: string }).created_at })),
      steps: (u as { trek_steps?: number }).trek_steps ?? 0,
      resetDate: todayKey(),
      streakCurrent: (u as { trek_streak?: number }).trek_streak ?? 0,
      streakLongest: (u as { trek_longest?: number }).trek_longest ?? 0,
    },
    notifications: n
      ? { dailyReminderEnabled: n.daily_reminder_enabled ?? true, reminderTime: n.reminder_time ?? "19:00", streakRiskEnabled: n.streak_risk_enabled ?? true, factOfDayEnabled: n.fact_of_day_enabled ?? false, soundEnabled: false, hapticsEnabled: true }
      : base.notifications,
  };
}

/** Re-hydrate the local store from the server (used as rollback / refresh). */
export async function rehydrate(): Promise<void> {
  const state = await loadCloudState();
  if (state) useStore.getState().hydrateState(state);
}

/** Push existing on-device data to a fresh cloud account (first sign-in, once). */
export async function migrateLocalUp(local: AppState): Promise<void> {
  const sb = getSupabase();
  if (!sb || Object.keys(local.entries).length === 0) return;
  await sb.rpc("srv_import_state", { p_state: local as unknown as Record<string, unknown> });
}

/** The reconciler registered into the store in cloud mode. */
export async function economyReconcile(kind: EconomyKind, payload: unknown): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const p = (payload ?? {}) as Record<string, unknown>;
  const today = todayKey();
  try {
    const uidv = await currentUserId();
    if (!uidv) return;
    let balance: number | undefined;

    switch (kind) {
      case "upload": {
        const photo = await persistPhoto(`${uidv}/${p.date}`, (p.draft as { photoUrl?: string })?.photoUrl);
        const d = p.draft as { turtleName?: string; mood?: string; notes?: string; tags?: string[]; location?: { label?: string } };
        const { data, error } = await sb.rpc("srv_upload", { p_date: p.date, p_photo: photo ?? null, p_name: d.turtleName ?? null, p_mood: d.mood ?? null, p_notes: d.notes ?? null, p_tags: d.tags ?? [], p_loc: d.location?.label ?? null });
        if (error) throw error;
        balance = (data as { balance?: number })?.balance;
        break;
      }
      case "repair":
      case "ai_rescue": {
        const photo = await persistPhoto(`${uidv}/${p.date}`, (kind === "repair" ? (p.draft as { photoUrl?: string })?.photoUrl : (p.photoUrl as string)) ?? undefined);
        const fn = kind === "repair" ? "srv_repair" : "srv_ai_rescue";
        const { data, error } = await sb.rpc(fn, { p_date: p.date, p_photo: photo ?? null });
        if (error) throw error;
        balance = (data as { balance?: number })?.balance;
        break;
      }
      case "shield": {
        const { error } = await sb.rpc("shield_day", { p_date: p.date });
        if (error) throw error;
        break;
      }
      case "purchase": {
        const { data, error } = await sb.rpc("purchase_shop_item", { p_item_id: p.itemId, p_idempotency: uid() });
        if (error) throw error;
        balance = typeof data === "number" ? data : undefined;
        break;
      }
      case "booster": {
        const { data, error } = await sb.rpc("srv_open_booster", { p_paid: !!p.paid, p_date: today });
        if (error) throw error;
        balance = (data as { balance?: number })?.balance;
        await rehydrate(); // collection became authoritative server-side
        return;
      }
      case "login": {
        const { data, error } = await sb.rpc("srv_login_bonus", { p_date: today });
        if (error) throw error;
        balance = (data as { balance?: number })?.balance;
        break;
      }
      case "fact_of_day": {
        const { data, error } = await sb.rpc("srv_fact_of_day", { p_date: today });
        if (error) throw error;
        balance = (data as { balance?: number })?.balance;
        break;
      }
      case "minigame":
      case "mantra": {
        const { data, error } = await sb.rpc(kind === "minigame" ? "srv_minigame" : "srv_mantra", { p_date: today, p_amount: p.amount ?? 0 });
        if (error) throw error;
        balance = (data as { balance?: number })?.balance;
        break;
      }
      case "add_task": {
        await sb.from("task_item").insert({ user_id: uidv, title: p.title });
        await rehydrate();
        return;
      }
      case "remove_task": {
        await sb.from("task_item").delete().eq("user_id", uidv).eq("id", p.id);
        await rehydrate();
        return;
      }
      case "toggle_task": {
        const { error } = await sb.rpc("srv_toggle_task", { p_id: p.id, p_date: today });
        if (error) throw error;
        await rehydrate();
        return;
      }
    }

    if (typeof balance === "number") useStore.getState().applyServerWallet({ balance });
  } catch {
    // server rejected (insufficient funds, dup, bad id, network) → roll back to truth
    await rehydrate();
  }
}
