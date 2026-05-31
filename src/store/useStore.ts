import { create } from "zustand";
import type {
  AppState,
  LedgerEntry,
  LedgerReason,
  Mood,
  PhotoSource,
  TurtleEntry,
  UserProfile,
  NotificationSettings,
} from "@/types";
import { makeInitialState } from "./initialState";
import { loadState, saveState, clearState } from "./persistence";
import { computeStreak, mostRecentMissedDay } from "@/logic/streak";
import { uploadReward, ONBOARDING_GIFT, FACT_OF_DAY } from "@/logic/turtbux";
import { REPAIR_COST, AI_RESCUE_COST, SHIELD_PRICE } from "@/logic/recovery";
import { todayKey, addDays } from "@/logic/dates";
import { generateAiTurtle } from "@/data/sampleTurtles";
import { FACTS } from "@/data/facts";
import { shopItemById } from "@/data/shopItems";
import { ACHIEVEMENTS } from "@/data/achievements";

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
const nowIso = () => new Date().toISOString();

export interface EntryDraft {
  photoUrl?: string;
  photoSource?: PhotoSource;
  turtleName?: string;
  mood?: Mood;
  notes?: string;
  tags?: string[];
  location?: { label: string; lat?: number; lng?: number };
}

export interface Reward {
  total: number;
  parts: { label: string; amount: number }[];
  newAchievements: string[];
}

interface Actions {
  completeOnboarding: (p: Partial<UserProfile>) => void;
  saveTodayEntry: (draft: EntryDraft) => Reward;
  updateEntry: (date: string, draft: EntryDraft) => Reward;
  deleteEntry: (date: string) => void;
  repairDay: (date: string, draft: EntryDraft) => { ok: boolean; reason?: string };
  aiRescueDay: (date: string) => { ok: boolean; reason?: string };
  shieldDay: (date: string) => { ok: boolean; reason?: string };
  buyShield: () => { ok: boolean; reason?: string };
  autoApplyShield: () => string | null; // returns the date protected, if any
  buyItem: (itemId: string) => { ok: boolean; reason?: string };
  equipItem: (itemId: string) => void;
  readFact: (factId: string) => number; // turtbux awarded (0 if already read)
  claimFactOfDay: () => number;
  updateNotifications: (n: Partial<NotificationSettings>) => void;
  updateProfile: (p: Partial<UserProfile>) => void;
  markReminderFired: () => void;
  reset: () => void;
}

type Store = AppState & Actions;

const persisted = loadState();
const initial: AppState = persisted ?? makeInitialState();

export const useStore = create<Store>((set, get) => {
  // persist after every mutation
  const commit = (patch: Partial<AppState>) => {
    set(patch as never);
    const s = get();
    saveState(stripState(s));
  };

  /** Append a ledger entry and update the wallet. Returns the patch slices. */
  const applyDelta = (
    s: AppState,
    delta: number,
    reason: LedgerReason,
    refType?: string,
    refId?: string,
  ): Pick<AppState, "wallet" | "ledger"> => {
    const balanceAfter = s.wallet.balance + delta;
    const entry: LedgerEntry = {
      id: uid(),
      delta,
      reason,
      refType,
      refId,
      balanceAfter,
      createdAt: nowIso(),
    };
    return {
      wallet: {
        balance: balanceAfter,
        lifetimeEarned: s.wallet.lifetimeEarned + (delta > 0 ? delta : 0),
        lifetimeSpent: s.wallet.lifetimeSpent + (delta < 0 ? -delta : 0),
      },
      ledger: [entry, ...s.ledger],
    };
  };

  return {
    ...initial,

    completeOnboarding: (p) => {
      const s = get();
      const profile = { ...s.profile, ...p };
      const money = applyDelta(s, ONBOARDING_GIFT, "onboarding_gift");
      commit({ onboarded: true, profile, ...money });
    },

    saveTodayEntry: (draft) => {
      const s = get();
      const date = todayKey();
      const entries = { ...s.entries };
      const entry: TurtleEntry = {
        id: uid(),
        date,
        state: "completed",
        photoUrl: draft.photoUrl,
        photoSource: draft.photoSource ?? "sample",
        turtleName: draft.turtleName,
        mood: draft.mood,
        notes: draft.notes,
        tags: draft.tags ?? [],
        location: draft.location,
        earnedTurtbux: 0,
        bonuses: {},
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      entries[date] = entry;

      const streakAfter = computeStreak(entries).current;
      const hasNotes = !!(draft.notes && draft.notes.trim().length >= 10);
      const hasMeta = !!(draft.mood && (draft.tags?.length ?? 0) > 0);
      const reward = uploadReward({ streakAfterUpload: streakAfter, hasNotes, hasMeta });
      entry.earnedTurtbux = reward.total;
      entry.bonuses = { note: hasNotes, meta: hasMeta };

      const money = applyDelta(s, reward.total, "upload", "entry", date);
      const next: AppState = { ...s, entries, ...money };
      const { achievements, newAchievements } = evaluate(next);
      commit({ entries, ...money, achievements });
      return { ...reward, newAchievements };
    },

    updateEntry: (date, draft) => {
      const s = get();
      const existing = s.entries[date];
      if (!existing) return { total: 0, parts: [], newAchievements: [] };
      const entries = { ...s.entries };
      const updated: TurtleEntry = {
        ...existing,
        ...draft,
        tags: draft.tags ?? existing.tags,
        updatedAt: nowIso(),
      };

      // pay one-time note/meta bonuses if newly satisfied
      const parts: { label: string; amount: number }[] = [];
      const hasNotes = !!(updated.notes && updated.notes.trim().length >= 10);
      const hasMeta = !!(updated.mood && updated.tags.length > 0);
      let delta = 0;
      if (hasNotes && !existing.bonuses.note) {
        delta += 3;
        parts.push({ label: "Wrote notes", amount: 3 });
      }
      if (hasMeta && !existing.bonuses.meta) {
        delta += 2;
        parts.push({ label: "Mood + tags", amount: 2 });
      }
      updated.bonuses = { note: hasNotes || existing.bonuses.note, meta: hasMeta || existing.bonuses.meta };
      updated.earnedTurtbux = existing.earnedTurtbux + delta;
      entries[date] = updated;

      const money = delta > 0 ? applyDelta(s, delta, "note_bonus", "entry", date) : {};
      const { achievements, newAchievements } = evaluate({ ...s, entries, ...money });
      commit({ entries, ...money, achievements });
      return { total: delta, parts, newAchievements };
    },

    deleteEntry: (date) => {
      const s = get();
      const entry = s.entries[date];
      if (!entry) return;
      const entries = { ...s.entries };
      delete entries[date];

      // Restore a Shell Shield that was consumed on this day (fairness).
      let shields = s.shields;
      if (entry.state === "shielded") {
        const idx = shields.findIndex((sh) => sh.status === "used" && sh.usedOnDate === date);
        if (idx !== -1) {
          shields = shields.map((sh, i) =>
            i === idx ? { ...sh, status: "available" as const, usedOnDate: undefined } : sh,
          );
        }
      }

      // Reverse Turtbux earned by this entry so delete + re-upload can't farm
      // currency. Clamp to current balance to preserve the balance >= 0 invariant.
      const reverse = Math.min(entry.earnedTurtbux, s.wallet.balance);
      const money = reverse > 0 ? applyDelta(s, -reverse, "refund", "entry", date) : {};
      commit({ entries, shields, ...money });
    },

    repairDay: (date, draft) => {
      const s = get();
      if (s.entries[date]) return { ok: false, reason: "Day already has an entry." };
      if (s.wallet.balance < REPAIR_COST) return { ok: false, reason: "Not enough Turtbux." };
      const entries = { ...s.entries };
      entries[date] = makeRecoveryEntry(date, "repaired", {
        photoUrl: draft.photoUrl,
        photoSource: draft.photoSource ?? "library",
        turtleName: draft.turtleName,
        mood: draft.mood,
        notes: draft.notes,
        tags: draft.tags ?? [],
        location: draft.location,
      });
      const money = applyDelta(s, -REPAIR_COST, "repair", "entry", date);
      const { achievements } = evaluate({ ...s, entries, ...money });
      commit({ entries, ...money, achievements });
      return { ok: true };
    },

    aiRescueDay: (date) => {
      const s = get();
      if (s.entries[date]) return { ok: false, reason: "Day already has an entry." };
      if (s.wallet.balance < AI_RESCUE_COST) return { ok: false, reason: "Not enough Turtbux." };
      const entries = { ...s.entries };
      entries[date] = makeRecoveryEntry(date, "ai_rescued", {
        photoUrl: generateAiTurtle(date + s.profile.displayName),
        photoSource: "ai",
        turtleName: "Mystery AI Turtle",
        tags: ["ai-rescued"],
      });
      const money = applyDelta(s, -AI_RESCUE_COST, "ai_rescue", "entry", date);
      const { achievements } = evaluate({ ...s, entries, ...money });
      commit({ entries, ...money, achievements });
      return { ok: true };
    },

    shieldDay: (date) => {
      const s = get();
      if (s.entries[date]) return { ok: false, reason: "Day already has an entry." };
      const idx = s.shields.findIndex((sh) => sh.status === "available");
      if (idx === -1) return { ok: false, reason: "No Shell Shields available." };
      const shields = s.shields.map((sh, i) =>
        i === idx ? { ...sh, status: "used" as const, usedOnDate: date } : sh,
      );
      const entries = { ...s.entries };
      entries[date] = makeRecoveryEntry(date, "shielded", { tags: ["shielded"] });
      const { achievements } = evaluate({ ...s, entries, shields });
      commit({ entries, shields, achievements });
      return { ok: true };
    },

    buyShield: () => {
      const s = get();
      if (s.wallet.balance < SHIELD_PRICE) return { ok: false, reason: "Not enough Turtbux." };
      const shields = [...s.shields, { id: uid(), status: "available" as const, acquiredAt: nowIso() }];
      const money = applyDelta(s, -SHIELD_PRICE, "shield_buy", "shield");
      commit({ shields, ...money });
      return { ok: true };
    },

    autoApplyShield: () => {
      const s = get();
      const today = todayKey();
      if (s.autoShieldCheckedOn === today) return null; // run at most once per day

      const yesterday = addDays(today, -1);
      const dayBefore = addDays(yesterday, -1);
      const missed = mostRecentMissedDay(s.entries);

      // Only protect YESTERDAY, and only when a real streak ran into it
      // (the day before yesterday is covered). Otherwise a shield would be
      // burned on an old, streak-irrelevant gap.
      const worthSaving = missed === yesterday && !!s.entries[dayBefore];
      const idx = s.shields.findIndex((sh) => sh.status === "available");
      if (!worthSaving || idx === -1) {
        commit({ autoShieldCheckedOn: today });
        return null;
      }

      const shields = s.shields.map((sh, i) =>
        i === idx ? { ...sh, status: "used" as const, usedOnDate: missed } : sh,
      );
      const entries = { ...s.entries };
      entries[missed!] = makeRecoveryEntry(missed!, "shielded", { tags: ["shielded", "auto"] });
      commit({ entries, shields, autoShieldCheckedOn: today });
      return missed!;
    },

    buyItem: (itemId) => {
      const s = get();
      const item = shopItemById(itemId);
      if (!item) return { ok: false, reason: "Unknown item." };
      if (item.id === "buy_shield") return get().buyShield();
      if (!item.consumable && s.inventory[itemId]) return { ok: false, reason: "Already owned." };
      if (s.wallet.balance < item.price) return { ok: false, reason: "Not enough Turtbux." };
      const inventory = { ...s.inventory, [itemId]: { equipped: false, acquiredAt: nowIso() } };
      const money = applyDelta(s, -item.price, "shop_purchase", "shopItem", itemId);
      const { achievements } = evaluate({ ...s, inventory, ...money });
      commit({ inventory, ...money, achievements });
      return { ok: true };
    },

    equipItem: (itemId) => {
      const s = get();
      const item = shopItemById(itemId);
      if (!item || !s.inventory[itemId]) return;
      const inventory = { ...s.inventory };
      // unequip peers in same category
      for (const [id] of Object.entries(inventory)) {
        const other = shopItemById(id);
        if (other && other.category === item.category) {
          inventory[id] = { ...inventory[id], equipped: false };
        }
      }
      inventory[itemId] = { ...inventory[itemId], equipped: true };
      let profile = s.profile;
      if (item.category === "theme" && item.theme) {
        profile = { ...profile, themeId: item.theme.id };
      }
      const { achievements } = evaluate({ ...s, inventory, profile });
      commit({ inventory, profile, achievements });
    },

    readFact: (factId) => {
      const s = get();
      if (s.factsRead[factId]) return 0;
      const fact = FACTS.find((f) => f.id === factId);
      if (!fact) return 0;
      const factsRead = { ...s.factsRead, [factId]: nowIso() };
      const money = applyDelta(s, fact.reward, "fact_read", "fact", factId);
      const { achievements } = evaluate({ ...s, factsRead, ...money });
      commit({ factsRead, ...money, achievements });
      return fact.reward;
    },

    claimFactOfDay: () => {
      const s = get();
      const today = todayKey();
      if (s.factOfDayClaimedOn === today) return 0;
      const money = applyDelta(s, FACT_OF_DAY, "fact_of_day");
      commit({ factOfDayClaimedOn: today, ...money });
      return FACT_OF_DAY;
    },

    updateNotifications: (n) => commit({ notifications: { ...get().notifications, ...n } }),
    updateProfile: (p) => commit({ profile: { ...get().profile, ...p } }),
    markReminderFired: () => commit({ lastReminderOn: todayKey() }),

    reset: () => {
      clearState();
      const fresh = makeInitialState();
      commit(fresh);
    },
  };
});

// ---------- helpers (module scope, pure-ish) ----------

function makeRecoveryEntry(
  date: string,
  state: TurtleEntry["state"],
  draft: Partial<EntryDraft>,
): TurtleEntry {
  return {
    id: uid(),
    date,
    state,
    photoUrl: draft.photoUrl,
    photoSource: draft.photoSource,
    turtleName: draft.turtleName,
    mood: draft.mood,
    notes: draft.notes,
    tags: draft.tags ?? [],
    location: draft.location,
    earnedTurtbux: 0, // recovery days are a sink, not a source
    bonuses: {},
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

/** Recompute earned achievements; returns merged map + newly earned ids. */
function evaluate(s: AppState): { achievements: Record<string, string>; newAchievements: string[] } {
  const achievements = { ...s.achievements };
  const newly: string[] = [];
  const earn = (id: string) => {
    if (!achievements[id]) {
      achievements[id] = nowIso();
      newly.push(id);
    }
  };
  const entries = Object.values(s.entries);
  const streak = computeStreak(s.entries);
  const factsRead = Object.keys(s.factsRead).length;
  const owned = Object.keys(s.inventory).length;
  const equippedCats = new Set(
    Object.entries(s.inventory)
      .filter(([, v]) => v.equipped)
      .map(([id]) => shopItemById(id)?.category),
  );

  if (entries.length >= 1) earn("first_turtle");
  if (streak.longest >= 7) earn("streak_7");
  if (streak.longest >= 30) earn("streak_30");
  if (streak.longest >= 100) earn("streak_100");
  if (entries.some((e) => e.state === "repaired")) earn("first_repair");
  if (entries.some((e) => e.state === "shielded")) earn("first_shield");
  if (entries.some((e) => e.state === "ai_rescued")) earn("first_rescue");
  if (factsRead >= 5) earn("facts_5");
  if (factsRead >= FACTS.length) earn("facts_all");
  if (owned >= 1) earn("shopper");
  if (s.wallet.lifetimeEarned >= 500) earn("rich");
  if (equippedCats.has("theme") && equippedCats.has("frame") && equippedCats.has("mascot_accessory"))
    earn("decorator");

  void ACHIEVEMENTS;
  return { achievements, newAchievements: newly };
}

/** Strip action functions before persisting (keep only AppState fields). */
function stripState(s: Store): AppState {
  const {
    onboarded, profile, wallet, ledger, entries, shields, factsRead,
    inventory, achievements, notifications, factOfDayClaimedOn,
    autoShieldCheckedOn, lastReminderOn,
  } = s;
  return {
    onboarded, profile, wallet, ledger, entries, shields, factsRead,
    inventory, achievements, notifications, factOfDayClaimedOn,
    autoShieldCheckedOn, lastReminderOn,
  };
}
