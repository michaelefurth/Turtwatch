// Minimal hand-written Database types for the Supabase client. In a real project
// generate these with `supabase gen types typescript`. Kept lean to the tables
// and RPCs the client touches (see supabase/migrations/0001_init.sql).

import type { EntryState, Mood, PhotoSource, LedgerReason } from "@/types";

export interface AppUserRow {
  id: string;
  display_name: string;
  timezone: string;
  mascot: "turtley" | "shelldon";
  mascot_name: string | null;
  theme_id: string;
  is_premium: boolean;
  onboarded: boolean;
  created_at: string;
}

export interface WalletRow {
  user_id: string;
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
}

export interface TurtleEntryRow {
  id: string;
  user_id: string;
  entry_date: string;
  state: EntryState;
  photo_url: string | null;
  photo_source: PhotoSource | null;
  turtle_name: string | null;
  mood: Mood | null;
  notes: string | null;
  tags: string[];
  location_lat: number | null;
  location_lng: number | null;
  location_label: string | null;
  earned_turtbux: number;
  bonus_note: boolean;
  bonus_meta: boolean;
  shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface StreakRow {
  user_id: string;
  current: number;
  longest: number;
  last_covered_date: string | null;
}

export interface LedgerRow {
  id: string;
  user_id: string;
  delta: number;
  reason: LedgerReason;
  ref_type: string | null;
  ref_id: string | null;
  balance_after: number;
  idempotency_key: string | null;
  created_at: string;
}

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      app_user: Table<AppUserRow>;
      wallet: Table<WalletRow>;
      turtle_entry: Table<TurtleEntryRow>;
      streak: Table<StreakRow>;
      turtbux_ledger: Table<LedgerRow>;
      shell_shield: Table<{ id: string; user_id: string; status: string; acquired_at: string; used_on_date: string | null }>;
      user_fact_read: Table<{ user_id: string; fact_id: string; read_at: string }>;
      user_inventory: Table<{ user_id: string; item_id: string; equipped: boolean; acquired_at: string }>;
      notification_settings: Table<{
        user_id: string;
        daily_reminder_enabled: boolean;
        reminder_time: string;
        streak_risk_enabled: boolean;
        fact_of_day_enabled: boolean;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      apply_turtbux: {
        Args: { p_delta: number; p_reason: LedgerReason; p_ref_type?: string; p_ref_id?: string; p_idempotency?: string };
        Returns: number;
      };
      purchase_shop_item: { Args: { p_item_id: string; p_idempotency: string }; Returns: number };
      read_fact: { Args: { p_fact_id: string }; Returns: number };
      shield_day: { Args: { p_date: string }; Returns: void };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
