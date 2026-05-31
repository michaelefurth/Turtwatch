// Data-access port. The app talks to a TurtwatchRepository; swapping the
// implementation (local ⇄ supabase) is the only change to move between
// offline-first and cloud-synced. See docs/08-technical-architecture.md.

import type { EntryDraft } from "@/store/useStore";
import type { NotificationSettings, TurtleEntry, UserProfile, Wallet } from "@/types";
import type { TurtleEntryRow } from "./database";

/** Everything needed to hydrate the app for the signed-in user. */
export interface UserSnapshot {
  profile: UserProfile;
  wallet: Wallet;
  entries: Record<string, TurtleEntry>;
  factsRead: Record<string, string>;
  inventory: Record<string, { equipped: boolean; acquiredAt: string }>;
  shieldsAvailable: number;
  notifications: NotificationSettings;
}

export interface TurtwatchRepository {
  // auth
  signUp(email: string, password: string): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  currentUserId(): Promise<string | null>;

  // hydrate
  loadSnapshot(): Promise<UserSnapshot>;

  // mutations (server validates economy & streaks)
  createEntry(date: string, draft: EntryDraft): Promise<void>;
  updateEntry(date: string, draft: EntryDraft): Promise<void>;
  deleteEntry(date: string): Promise<void>;
  repairDay(date: string, draft: EntryDraft): Promise<void>;
  aiRescueDay(date: string): Promise<void>;
  shieldDay(date: string): Promise<void>;
  buyShield(): Promise<void>;
  purchaseItem(itemId: string): Promise<void>;
  equipItem(itemId: string, category: string): Promise<void>;
  readFact(factId: string): Promise<number>;
  updateProfile(p: Partial<UserProfile>): Promise<void>;
  updateNotifications(n: Partial<NotificationSettings>): Promise<void>;
}

/** Map a DB row to the app's TurtleEntry shape. */
export function rowToEntry(r: TurtleEntryRow): TurtleEntry {
  return {
    id: r.id,
    date: r.entry_date,
    state: r.state,
    photoUrl: r.photo_url ?? undefined,
    photoSource: r.photo_source ?? undefined,
    turtleName: r.turtle_name ?? undefined,
    mood: r.mood ?? undefined,
    notes: r.notes ?? undefined,
    tags: r.tags ?? [],
    location: r.location_label
      ? { label: r.location_label, lat: r.location_lat ?? undefined, lng: r.location_lng ?? undefined }
      : undefined,
    earnedTurtbux: r.earned_turtbux,
    bonuses: { note: r.bonus_note, meta: r.bonus_meta },
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
