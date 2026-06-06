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
import {
  uploadReward, ONBOARDING_GIFT, FACT_OF_DAY,
  loginBonus, GOLDEN_TURTLE_PROB, GOLDEN_TURTLE_BONUS,
} from "@/logic/turtbux";
import { remainingGameReward, LUCKY_FLIP_PROB, LUCKY_FLIP_BONUS } from "@/logic/flipgame";
import { remainingMantraReward, ZEN_MOMENT_PROB, ZEN_MOMENT_BONUS } from "@/logic/mantras";
import {
  makeQuest, withDailyReset, remainingTaskReward, nextStreak, arrivalLandmark,
  reachedCount, TASK_REWARD, LEG_BONUS, STEP_DAILY_CAP, type Landmark,
} from "@/logic/quest";
import { pullBooster, cardReward, BOOSTER_COST, TOTAL_CARDS } from "@/logic/booster";
import type { FactCardDef } from "@/data/factCards";
import { REPAIR_COST, AI_RESCUE_COST, SHIELD_PRICE } from "@/logic/recovery";
import { todayKey, addDays } from "@/logic/dates";
import { generateAiTurtle } from "@/data/sampleTurtles";
import { FACTS } from "@/data/facts";
import { shopItemById } from "@/data/shopItems";
import { ACHIEVEMENTS } from "@/data/achievements";

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
const nowIso = () => new Date().toISOString();

// True while a bulk cloud-restore is replacing state — lets UI watchers skip
// celebrating achievements/ranks that the user already earned.
let hydrating = false;
export const isHydrating = () => hydrating;

// In cloud (server-authoritative) mode, an economy reconciler is registered: after
// each optimistic local mutation the store calls it so the server recomputes the
// reward and the authoritative wallet/state is patched back. Null in local mode.
export type EconomyKind =
  | "upload" | "update_entry" | "delete_entry" | "repair" | "ai_rescue" | "shield" | "purchase" | "booster"
  | "login" | "fact_of_day" | "fact_read" | "minigame" | "mantra" | "toggle_task" | "add_task" | "remove_task";
let reconciler: ((kind: EconomyKind, payload: unknown) => void) | null = null;
export function setEconomyReconciler(fn: ((kind: EconomyKind, payload: unknown) => void) | null) {
  reconciler = fn;
}
export const isCloudMode = () => reconciler !== null;

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
  aiRescueDay: (date: string, photoUrl?: string) => { ok: boolean; reason?: string };
  shieldDay: (date: string) => { ok: boolean; reason?: string };
  buyShield: () => { ok: boolean; reason?: string };
  autoApplyShield: () => string | null; // returns the date protected, if any
  buyItem: (itemId: string, priceOverride?: number) => { ok: boolean; reason?: string };
  equipItem: (itemId: string) => void;
  readFact: (factId: string) => number; // turtbux awarded (0 if already read)
  claimFactOfDay: () => number;
  claimLoginBonus: () => number; // daily login bonus (0 if already claimed today)
  awardGameReward: (amount: number) => { total: number; lucky: number }; // total awarded + surprise-bonus portion
  awardMantraReward: (amount: number) => { total: number; lucky: number };
  ensureQuestDaily: () => void;
  addTask: (title: string) => void;
  removeTask: (id: string) => void;
  toggleTask: (id: string) => { rewarded: number; arrived: Landmark | null; stepped: boolean };
  openBooster: (paid: boolean) => { ok: boolean; reason?: string; cards?: { card: FactCardDef; isNew: boolean }[]; rewarded?: number };
  updateNotifications: (n: Partial<NotificationSettings>) => void;
  updatePrefs: (p: Partial<import("@/types").ComfortPrefs>) => void;
  markPerfectDay: () => boolean; // returns true if newly completed today
  updateProfile: (p: Partial<UserProfile>) => void;
  markReminderFired: () => void;
  setSharedFlag: (date: string, shared: boolean) => void;
  setCloud: (patch: Partial<NonNullable<AppState["cloud"]>>) => void;
  hydrateState: (state: AppState) => void;
  applyServerWallet: (w: { balance: number; lifetimeEarned?: number; lifetimeSpent?: number }) => void;
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
    // economy invariant: balance must equal the sum of all ledger deltas.
    // Skip in cloud mode, where the server's authoritative balance is patched in
    // without a matching local ledger entry.
    if (import.meta.env.DEV && !isCloudMode()) {
      const sum = s.ledger.reduce((acc, e) => acc + e.delta, 0);
      if (sum !== s.wallet.balance) {
        console.warn(`[turtbux] ledger drift: balance=${s.wallet.balance} sum=${sum}`);
      }
    }
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
      // never overwrite (and re-award) an existing entry — route edits to updateEntry
      if (s.entries[date]) return get().updateEntry(date, draft);
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
      // Pay an upload's base reward at most once per calendar date, ever — closes
      // the delete-(partial refund clamp)-then-re-upload arbitrage.
      const basePaid = s.ledger.some((l) => l.reason === "upload" && l.refId === date);
      const reward = basePaid
        ? { total: 0, parts: [] as { label: string; amount: number }[] }
        : uploadReward({ streakAfterUpload: streakAfter, hasNotes, hasMeta });
      entry.earnedTurtbux = reward.total;
      entry.bonuses = { note: hasNotes && !basePaid, meta: hasMeta && !basePaid };

      let money = reward.total > 0 ? applyDelta(s, reward.total, "upload", "entry", date) : {};
      // surprise "golden turtle" — a rare extra bonus on a first on-time upload.
      // In cloud mode the SERVER rolls this (srv_upload); rolling here too would
      // double-pay, so let applyServerWallet be the source of truth instead.
      if (!basePaid && !isCloudMode() && Math.random() < GOLDEN_TURTLE_PROB) {
        money = applyDelta({ ...s, ...money }, GOLDEN_TURTLE_BONUS, "lucky_upload", "entry", date);
        entry.earnedTurtbux += GOLDEN_TURTLE_BONUS; // so delete fully reverses it
        reward.parts.push({ label: "✨ Golden turtle!", amount: GOLDEN_TURTLE_BONUS });
        reward.total += GOLDEN_TURTLE_BONUS;
      }
      const next: AppState = { ...s, entries, ...money };
      const { achievements, newAchievements } = evaluate(next);
      commit({ entries, ...money, achievements });
      reconciler?.("upload", { date, draft });
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
      reconciler?.("update_entry", { date, draft });
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
      reconciler?.("delete_entry", { date });
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
      reconciler?.("repair", { date, draft });
      return { ok: true };
    },

    aiRescueDay: (date, photoUrl) => {
      const s = get();
      if (s.entries[date]) return { ok: false, reason: "Day already has an entry." };
      if (s.wallet.balance < AI_RESCUE_COST) return { ok: false, reason: "Not enough Turtbux." };
      const entries = { ...s.entries };
      entries[date] = makeRecoveryEntry(date, "ai_rescued", {
        // a server-generated image if supplied, else the local procedural turtle
        photoUrl: photoUrl ?? generateAiTurtle(date + s.profile.displayName),
        photoSource: "ai",
        turtleName: "Mystery AI Turtle",
        tags: ["ai-rescued"],
      });
      const money = applyDelta(s, -AI_RESCUE_COST, "ai_rescue", "entry", date);
      const { achievements } = evaluate({ ...s, entries, ...money });
      commit({ entries, ...money, achievements });
      reconciler?.("ai_rescue", { date, photoUrl: entries[date].photoUrl });
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
      reconciler?.("shield", { date });
      return { ok: true };
    },

    buyShield: () => {
      const s = get();
      if (s.wallet.balance < SHIELD_PRICE) return { ok: false, reason: "Not enough Turtbux." };
      const shields = [...s.shields, { id: uid(), status: "available" as const, acquiredAt: nowIso() }];
      const money = applyDelta(s, -SHIELD_PRICE, "shield_buy", "shield");
      commit({ shields, ...money });
      // cloud: actually create the shield server-side, else a following shieldDay()
      // reconcile finds none and rolls back. (Serialized so it lands first.)
      reconciler?.("purchase", { itemId: "buy_shield" });
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

    buyItem: (itemId, priceOverride) => {
      const s = get();
      const item = shopItemById(itemId);
      if (!item) return { ok: false, reason: "Unknown item." };
      // a daily-deal price override can only lower the price (never raise it, and
      // never below 1 — prevents free/negative purchases from any caller)
      const price = priceOverride != null ? Math.max(1, Math.min(priceOverride, item.price)) : item.price;
      if (item.id === "buy_shield" || item.id === "shield_pack_3") {
        if (s.wallet.balance < price) return { ok: false, reason: "Not enough Turtbux." };
        const count = item.id === "shield_pack_3" ? 3 : 1;
        const newShields = Array.from({ length: count }, () => ({ id: uid(), status: "available" as const, acquiredAt: nowIso() }));
        const shields = [...s.shields, ...newShields];
        const money = applyDelta(s, -price, "shield_buy", "shield");
        commit({ shields, ...money });
        reconciler?.("purchase", { itemId });
        return { ok: true };
      }
      if (!item.consumable && s.inventory[itemId]) return { ok: false, reason: "Already owned." };
      if (s.wallet.balance < price) return { ok: false, reason: "Not enough Turtbux." };
      const inventory = { ...s.inventory, [itemId]: { equipped: false, acquiredAt: nowIso() } };
      const money = applyDelta(s, -price, "shop_purchase", "shopItem", itemId);
      const { achievements } = evaluate({ ...s, inventory, ...money });
      commit({ inventory, ...money, achievements });
      reconciler?.("purchase", { itemId });
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
      reconciler?.("fact_read", { factId });
      return fact.reward;
    },

    claimFactOfDay: () => {
      const s = get();
      const today = todayKey();
      if (s.factOfDayClaimedOn === today) return 0;
      const money = applyDelta(s, FACT_OF_DAY, "fact_of_day");
      commit({ factOfDayClaimedOn: today, ...money });
      reconciler?.("fact_of_day", {});
      return FACT_OF_DAY;
    },

    claimLoginBonus: () => {
      const s = get();
      const today = todayKey();
      if (s.loginBonusClaimedOn === today) return 0;
      const total = loginBonus(computeStreak(s.entries).current);
      const money = applyDelta(s, total, "daily_login");
      commit({ loginBonusClaimedOn: today, ...money });
      reconciler?.("login", {});
      return total;
    },

    awardGameReward: (amount) => {
      const s = get();
      const today = todayKey();
      const gamesWon = (s.gamesWon ?? 0) + 1;
      const earnedToday = s.game?.date === today ? s.game.earned : 0;
      const award = remainingGameReward(earnedToday, amount);
      let money = award > 0 ? applyDelta(s, award, "minigame", "flipgame") : {};
      let total = award;
      let banked = earnedToday + award;
      let luckyBonus = 0;
      // surprise lucky flip (still respects the daily cap)
      if (Math.random() < LUCKY_FLIP_PROB) {
        const lucky = remainingGameReward(banked, LUCKY_FLIP_BONUS);
        if (lucky > 0) {
          money = applyDelta({ ...s, ...money }, lucky, "lucky_game", "flipgame");
          total += lucky;
          banked += lucky;
          luckyBonus = lucky;
        }
      }
      const game = { date: today, earned: banked };
      const { achievements } = evaluate({ ...s, gamesWon, game, ...money });
      commit({ gamesWon, game, achievements, ...money });
      reconciler?.("minigame", { amount: total });
      return { total, lucky: luckyBonus };
    },

    awardMantraReward: (amount) => {
      const s = get();
      const today = todayKey();
      const mantrasFocused = (s.mantrasFocused ?? 0) + 1;
      const earnedToday = s.mantra?.date === today ? s.mantra.earned : 0;
      const award = remainingMantraReward(earnedToday, amount);
      let money = award > 0 ? applyDelta(s, award, "mantra", "mantra") : {};
      let total = award;
      let banked = earnedToday + award;
      let luckyBonus = 0;
      if (Math.random() < ZEN_MOMENT_PROB) {
        const lucky = remainingMantraReward(banked, ZEN_MOMENT_BONUS);
        if (lucky > 0) {
          money = applyDelta({ ...s, ...money }, lucky, "lucky_mantra", "mantra");
          total += lucky;
          banked += lucky;
          luckyBonus = lucky;
        }
      }
      const mantra = { date: today, earned: banked };
      const { achievements } = evaluate({ ...s, mantrasFocused, mantra, ...money });
      commit({ mantrasFocused, mantra, achievements, ...money });
      reconciler?.("mantra", { amount: total });
      return { total, lucky: luckyBonus };
    },

    ensureQuestDaily: () => {
      const s = get();
      const today = todayKey();
      const q = withDailyReset(s.quest ?? makeQuest(today), today);
      if (q !== s.quest) commit({ quest: q });
    },

    addTask: (title) => {
      const t = title.trim();
      if (!t) return;
      const s = get();
      const today = todayKey();
      const q = withDailyReset(s.quest ?? makeQuest(today), today);
      const task = { id: uid(), title: t.slice(0, 80), done: false, createdAt: nowIso() };
      commit({ quest: { ...q, tasks: [...q.tasks, task] } });
      reconciler?.("add_task", { title: t });
    },

    removeTask: (id) => {
      const s = get();
      if (!s.quest) return;
      const base = withDailyReset(s.quest, todayKey());
      commit({ quest: { ...base, tasks: base.tasks.filter((t) => t.id !== id) } });
      reconciler?.("remove_task", { id });
    },

    toggleTask: (id) => {
      const s = get();
      const today = todayKey();
      const yesterday = addDays(today, -1);
      const base = withDailyReset(s.quest ?? makeQuest(today), today);
      const task = base.tasks.find((t) => t.id === id);
      if (!task) return { rewarded: 0, arrived: null, stepped: false };

      if (task.done) {
        // un-tick: keep journey progress & rewards, just clear the checkbox
        const tasks = base.tasks.map((t) => (t.id === id ? { ...t, done: false } : t));
        commit({ quest: { ...base, tasks } });
        return { rewarded: 0, arrived: null, stepped: false };
      }

      const firstPayoutToday = task.lastDoneDate !== today; // pay once/day/task
      const tasks = base.tasks.map((t) =>
        t.id === id ? { ...t, done: true, lastDoneDate: firstPayoutToday ? today : t.lastDoneDate } : t,
      );

      // daily step cap: stops remove-and-re-add (fresh ids) from farming
      // unlimited steps / leg bonuses. Past the cap, ticking just checks the box.
      const stepsToday = base.stepsToday?.date === today ? base.stepsToday.count : 0;
      if (!firstPayoutToday || stepsToday >= STEP_DAILY_CAP) {
        commit({ quest: { ...base, tasks } });
        return { rewarded: 0, arrived: null, stepped: false };
      }

      const oldSteps = base.steps;
      const steps = oldSteps + 1;
      const arrived = arrivalLandmark(oldSteps, steps);
      const earnedToday = base.reward?.date === today ? base.reward.earned : 0;
      const taskPay = remainingTaskReward(earnedToday, TASK_REWARD);
      const legPay = arrived ? LEG_BONUS : 0; // milestone bonus is exempt from the Turtbux cap
      const rewarded = taskPay + legPay;
      const streakCurrent = nextStreak(base.lastCompletedDate, today, yesterday, base.streakCurrent);
      const quest = {
        ...base,
        tasks,
        steps,
        reward: { date: today, earned: earnedToday + taskPay },
        stepsToday: { date: today, count: stepsToday + 1 },
        streakCurrent,
        streakLongest: Math.max(base.streakLongest, streakCurrent),
        lastCompletedDate: today,
      };
      const money = rewarded > 0 ? applyDelta(s, rewarded, "task", "quest") : {};
      const { achievements } = evaluate({ ...s, quest, ...money });
      commit({ quest, achievements, ...money });
      reconciler?.("toggle_task", { id });
      return { rewarded, arrived, stepped: true };
    },

    openBooster: (paid) => {
      const s = get();
      const today = todayKey();
      // cloud mode is server-authoritative — callers must use cloudOpenBooster.
      // Guard so a stray call can't double-roll (local pull + server pull).
      if (isCloudMode()) return { ok: false, reason: "Use cloud booster" };
      const freeAvailable = s.lastBoosterOn !== today;
      if (!paid && !freeAvailable) return { ok: false, reason: "Your free booster is tomorrow!" };
      if (paid && s.wallet.balance < BOOSTER_COST) return { ok: false, reason: "Not enough Turtbux." };

      // pay for an extra pack (free pack consumes the daily slot instead)
      let money = paid ? applyDelta(s, -BOOSTER_COST, "booster_open", "booster") : {};

      const pulled = pullBooster();
      const collection = { ...(s.collection ?? {}) };
      let rewarded = 0;
      const cards = pulled.map((card) => {
        const isNew = !collection[card.id];
        collection[card.id] = (collection[card.id] ?? 0) + 1;
        rewarded += cardReward(card.rarity, isNew);
        return { card, isNew };
      });

      if (rewarded > 0) money = applyDelta({ ...s, ...money }, rewarded, "booster_reward", "booster");
      const patch: Partial<AppState> = { collection, ...money };
      if (!paid) patch.lastBoosterOn = today;
      const { achievements } = evaluate({ ...s, collection, ...money });
      commit({ ...patch, achievements });
      // NOTE: no reconciler here — cloud mode never reaches this (guarded above);
      // cloud booster opens go through cloudOpenBooster (server rolls the cards).
      return { ok: true, cards, rewarded };
    },

    updateNotifications: (n) => commit({ notifications: { ...get().notifications, ...n } }),
    updatePrefs: (p) => commit({ prefs: { ...get().prefs, ...p } }),
    // record a "perfect pond day" once; returns true the first time today
    markPerfectDay: () => {
      const s = get();
      const today = todayKey();
      if (s.lastPerfectDayOn === today) return false;
      commit({ lastPerfectDayOn: today, perfectDays: (s.perfectDays ?? 0) + 1 });
      return true;
    },
    updateProfile: (p) => commit({ profile: { ...get().profile, ...p } }),
    markReminderFired: () => commit({ lastReminderOn: todayKey() }),
    // local-only patch of an entry's share flag (server write happens in the UI)
    setSharedFlag: (date, shared) => {
      const s = get();
      const e = s.entries[date];
      if (!e) return;
      commit({ entries: { ...s.entries, [date]: { ...e, shared } } });
    },
    setCloud: (patch) => commit({ cloud: { ...(get().cloud ?? { autoBackup: false }), ...patch } }),

    hydrateState: (state) => {
      // replace local state with a restored cloud snapshot. Flag the bulk replace
      // so the AppShell watchers don't fire a flood of achievement/rank-up toasts.
      hydrating = true;
      saveState(state);
      set(state as never);
      hydrating = false;
    },

    // cloud mode: overwrite the wallet with the server's authoritative balance
    applyServerWallet: (w) => {
      const cur = get().wallet;
      commit({
        wallet: {
          balance: w.balance,
          lifetimeEarned: w.lifetimeEarned ?? cur.lifetimeEarned,
          lifetimeSpent: w.lifetimeSpent ?? cur.lifetimeSpent,
        },
      });
    },

    reset: () => {
      clearState();
      const fresh = makeInitialState();
      commit(fresh);
    },
  };
});

/** The persistable AppState (no action functions) — used for cloud backup. */
export function getPersistableState(): AppState {
  return stripState(useStore.getState());
}

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
  const collected = Object.keys(s.collection ?? {}).length;
  if (collected >= 5) earn("facts_5");
  if (collected >= 100) earn("facts_all");
  if (collected >= TOTAL_CARDS) earn("pondex");
  if (Object.keys(s.collection ?? {}).some((id) => id.startsWith("r-"))) earn("fact_collector");
  if (owned >= 1) earn("shopper");
  if (s.wallet.lifetimeEarned >= 1500) earn("rich");
  if (equippedCats.has("theme") && equippedCats.has("frame") && equippedCats.has("mascot_accessory"))
    earn("decorator");
  if ((s.gamesWon ?? 0) >= 1) earn("first_flip");
  if ((s.gamesWon ?? 0) >= 10) earn("flip_master");
  if ((s.mantrasFocused ?? 0) >= 1) earn("first_mantra");
  if ((s.mantrasFocused ?? 0) >= 25) earn("zen_master");
  if (s.quest && s.quest.steps >= 1) earn("first_task");
  if (s.quest && reachedCount(s.quest.steps) >= 10) earn("globetrotter");
  if (s.quest && s.quest.streakLongest >= 7) earn("goal_getter");

  void ACHIEVEMENTS;
  return { achievements, newAchievements: newly };
}

/** Strip action functions before persisting (keep only AppState fields). */
function stripState(s: Store): AppState {
  const {
    onboarded, profile, wallet, ledger, entries, shields, factsRead,
    inventory, achievements, notifications, prefs, factOfDayClaimedOn,
    autoShieldCheckedOn, lastReminderOn, loginBonusClaimedOn, game, mantra,
    gamesWon, mantrasFocused, quest, collection, lastBoosterOn,
    perfectDays, lastPerfectDayOn, cloud,
  } = s;
  return {
    onboarded, profile, wallet, ledger, entries, shields, factsRead,
    inventory, achievements, notifications, prefs, factOfDayClaimedOn,
    autoShieldCheckedOn, lastReminderOn, loginBonusClaimedOn, game, mantra,
    gamesWon, mantrasFocused, quest, collection, lastBoosterOn,
    perfectDays, lastPerfectDayOn, cloud,
  };
}
