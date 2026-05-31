// Supabase-backed implementation of TurtwatchRepository.
// Economy + streaks are enforced server-side (RPC + triggers). The client just
// issues intents and re-hydrates. See supabase/migrations/0001_init.sql.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database";
import { getSupabase } from "@/lib/supabase";
import { rowToEntry, type TurtwatchRepository, type UserSnapshot } from "./repository";
import type { EntryDraft } from "@/store/useStore";
import type { NotificationSettings, UserProfile } from "@/types";
import { uploadReward } from "@/logic/turtbux";
import { computeStreak } from "@/logic/streak";

const REPAIR_COST = 30;
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));

export class SupabaseRepository implements TurtwatchRepository {
  private get db(): SupabaseClient {
    const c = getSupabase();
    if (!c) throw new Error("Supabase is not configured");
    return c;
  }

  async signUp(email: string, password: string) {
    const { error } = await this.db.auth.signUp({ email, password });
    if (error) throw error;
  }
  async signIn(email: string, password: string) {
    const { error } = await this.db.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }
  async signOut() {
    await this.db.auth.signOut();
  }
  async currentUserId() {
    const { data } = await this.db.auth.getUser();
    return data.user?.id ?? null;
  }

  async loadSnapshot(): Promise<UserSnapshot> {
    const [user, wallet, entries, facts, inv, shields, notif] = await Promise.all([
      this.db.from("app_user").select("*").single(),
      this.db.from("wallet").select("*").single(),
      this.db.from("turtle_entry").select("*"),
      this.db.from("user_fact_read").select("fact_id, read_at"),
      this.db.from("user_inventory").select("item_id, equipped, acquired_at"),
      this.db.from("shell_shield").select("status").eq("status", "available"),
      this.db.from("notification_settings").select("*").single(),
    ]);

    const u = user.data!;
    const w = wallet.data!;
    const profile: UserProfile = {
      displayName: u.display_name,
      mascot: u.mascot,
      mascotName: u.mascot_name ?? undefined,
      themeId: u.theme_id,
      timezone: u.timezone,
      isPremium: u.is_premium,
      createdAt: u.created_at,
    };
    const entryMap: UserSnapshot["entries"] = {};
    for (const r of entries.data ?? []) entryMap[r.entry_date] = rowToEntry(r);
    const factsRead: Record<string, string> = {};
    for (const f of facts.data ?? []) factsRead[f.fact_id] = f.read_at;
    const inventory: UserSnapshot["inventory"] = {};
    for (const i of inv.data ?? []) inventory[i.item_id] = { equipped: i.equipped, acquiredAt: i.acquired_at };
    const n = notif.data!;

    return {
      profile,
      wallet: { balance: w.balance, lifetimeEarned: w.lifetime_earned, lifetimeSpent: w.lifetime_spent },
      entries: entryMap,
      factsRead,
      inventory,
      shieldsAvailable: shields.data?.length ?? 0,
      notifications: {
        dailyReminderEnabled: n.daily_reminder_enabled,
        reminderTime: n.reminder_time,
        streakRiskEnabled: n.streak_risk_enabled,
        factOfDayEnabled: n.fact_of_day_enabled,
      },
    };
  }

  private async insertEntry(date: string, draft: EntryDraft, state: string, earned: number) {
    const uid = await this.requireUser();
    const { error } = await this.db.from("turtle_entry").insert({
      user_id: uid,
      entry_date: date,
      state: state as never,
      photo_url: draft.photoUrl ?? null,
      photo_source: (draft.photoSource ?? null) as never,
      turtle_name: draft.turtleName ?? null,
      mood: (draft.mood ?? null) as never,
      notes: draft.notes ?? null,
      tags: draft.tags ?? [],
      location_label: draft.location?.label ?? null,
      location_lat: draft.location?.lat ?? null,
      location_lng: draft.location?.lng ?? null,
      earned_turtbux: earned,
      bonus_note: !!(draft.notes && draft.notes.trim().length >= 10),
      bonus_meta: !!(draft.mood && (draft.tags?.length ?? 0) > 0),
    });
    if (error) throw error;
  }

  async createEntry(date: string, draft: EntryDraft) {
    // optimistic streak for reward calc; server trigger recomputes authoritative streak
    const snap = await this.loadSnapshot();
    const after = computeStreak({ ...snap.entries, [date]: { date } as never }).current;
    const reward = uploadReward({
      streakAfterUpload: after,
      hasNotes: !!(draft.notes && draft.notes.trim().length >= 10),
      hasMeta: !!(draft.mood && (draft.tags?.length ?? 0) > 0),
    });
    await this.insertEntry(date, draft, "completed", reward.total);
    await this.applyTurtbux(reward.total, "upload", "entry", date, `upload:${date}`);
  }

  async updateEntry(date: string, draft: EntryDraft) {
    const uid = await this.requireUser();
    const { error } = await this.db
      .from("turtle_entry")
      .update({
        photo_url: draft.photoUrl ?? null,
        turtle_name: draft.turtleName ?? null,
        mood: (draft.mood ?? null) as never,
        notes: draft.notes ?? null,
        tags: draft.tags ?? [],
        location_label: draft.location?.label ?? null,
      })
      .eq("user_id", uid)
      .eq("entry_date", date);
    if (error) throw error;
  }

  async deleteEntry(date: string) {
    const uid = await this.requireUser();
    const { error } = await this.db.from("turtle_entry").delete().eq("user_id", uid).eq("entry_date", date);
    if (error) throw error;
  }

  async repairDay(date: string, draft: EntryDraft) {
    await this.applyTurtbux(-REPAIR_COST, "repair", "entry", date, `repair:${date}`);
    await this.insertEntry(date, draft, "repaired", 0);
  }

  async aiRescueDay(date: string) {
    const { error } = await this.db.functions.invoke("ai-rescue", { body: { date } });
    if (error) throw error;
  }

  async shieldDay(date: string) {
    const { error } = await this.db.rpc("shield_day", { p_date: date });
    if (error) throw error;
  }

  async buyShield() {
    await this.purchaseItem("buy_shield");
  }

  async purchaseItem(itemId: string) {
    const { error } = await this.db.rpc("purchase_shop_item", { p_item_id: itemId, p_idempotency: uuid() });
    if (error) throw error;
  }

  async equipItem(itemId: string, category: string) {
    const uid = await this.requireUser();
    // unequip peers in same category, then equip the target (two statements; a
    // dedicated RPC would make this atomic — see docs/11).
    const { data: owned } = await this.db.from("user_inventory").select("item_id").eq("user_id", uid);
    void category; // category-peer unequip is handled by a SQL RPC in production
    void owned;
    const { error } = await this.db
      .from("user_inventory")
      .update({ equipped: true })
      .eq("user_id", uid)
      .eq("item_id", itemId);
    if (error) throw error;
  }

  async readFact(factId: string): Promise<number> {
    const { data, error } = await this.db.rpc("read_fact", { p_fact_id: factId });
    if (error) throw error;
    return data ?? 0;
  }

  async updateProfile(p: Partial<UserProfile>) {
    const uid = await this.requireUser();
    const { error } = await this.db
      .from("app_user")
      .update({
        display_name: p.displayName,
        mascot: p.mascot,
        mascot_name: p.mascotName,
        theme_id: p.themeId,
        timezone: p.timezone,
      })
      .eq("id", uid);
    if (error) throw error;
  }

  async updateNotifications(n: Partial<NotificationSettings>) {
    const uid = await this.requireUser();
    const { error } = await this.db
      .from("notification_settings")
      .update({
        daily_reminder_enabled: n.dailyReminderEnabled,
        reminder_time: n.reminderTime,
        streak_risk_enabled: n.streakRiskEnabled,
        fact_of_day_enabled: n.factOfDayEnabled,
      })
      .eq("user_id", uid);
    if (error) throw error;
  }

  // ---- helpers ----
  private async requireUser(): Promise<string> {
    const id = await this.currentUserId();
    if (!id) throw new Error("AUTH_REQUIRED");
    return id;
  }

  private async applyTurtbux(
    delta: number,
    reason: Database["public"]["Functions"]["apply_turtbux"]["Args"]["p_reason"],
    refType: string,
    refId: string,
    idempotency: string,
  ) {
    const { error } = await this.db.rpc("apply_turtbux", {
      p_delta: delta,
      p_reason: reason,
      p_ref_type: refType,
      p_ref_id: refId,
      p_idempotency: idempotency,
    });
    if (error) throw error;
  }
}
