// TurtWatch domain types — mirror of docs/04-data-model.md.
// These are platform-agnostic and shared by web prototype and (future) RN app.

export type Mascot = "turtley" | "shelldon";

export type EntryState = "completed" | "repaired" | "ai_rescued" | "shielded";

/** Calendar-cell states (includes derived states not stored as entries). */
export type DayState = EntryState | "missed" | "today" | "future" | "blank";

export type PhotoSource = "camera" | "library" | "sample" | "ai";

export type Mood = "happy" | "sleepy" | "derpy" | "majestic" | "shy" | "hungry";

export type LedgerReason =
  | "upload"
  | "streak_bonus"
  | "milestone"
  | "note_bonus"
  | "meta_bonus"
  | "challenge"
  | "fact_read"
  | "fact_of_day"
  | "repair"
  | "ai_rescue"
  | "shield_buy"
  | "shop_purchase"
  | "onboarding_gift"
  | "minigame"
  | "mantra"
  | "task"
  | "daily_login"
  | "lucky_upload"
  | "lucky_game"
  | "lucky_mantra"
  | "booster"
  | "booster_open"
  | "booster_reward"
  | "refund"
  | "admin";

export interface LedgerEntry {
  id: string;
  delta: number; // + earn / - spend
  reason: LedgerReason;
  refType?: string;
  refId?: string;
  balanceAfter: number;
  createdAt: string; // ISO
}

export interface TurtleEntry {
  id: string;
  date: string; // local date key YYYY-MM-DD (unique per user)
  state: EntryState;
  photoUrl?: string;
  photoSource?: PhotoSource;
  turtleName?: string;
  mood?: Mood;
  notes?: string;
  tags: string[];
  location?: { lat?: number; lng?: number; label: string };
  earnedTurtbux: number;
  /** which one-time bonuses have already been paid for this entry */
  bonuses: { note?: boolean; meta?: boolean };
  createdAt: string;
  updatedAt: string;
}

export type ShieldStatus = "available" | "used";
export interface ShellShield {
  id: string;
  status: ShieldStatus;
  acquiredAt: string;
  usedOnDate?: string;
}

export type FactCategory = "biology" | "history" | "record" | "silly" | "care";
export type Rarity = "common" | "rare" | "epic" | "legendary";
export interface TurtleFact {
  id: string;
  title: string;
  body: string;
  category: FactCategory;
  emoji: string;
  rarity: Rarity;
  reward: number;
}

export type ShopCategory =
  | "theme"
  | "sticker"
  | "frame"
  | "mascot_accessory"
  | "shield"
  | "recovery";

export interface ShopItem {
  id: string;
  category: ShopCategory;
  name: string;
  description: string;
  price: number;
  emoji: string;
  consumable: boolean;
  premiumOnly?: boolean;
  /** for theme items: the palette applied when equipped */
  theme?: ThemePalette;
}

export interface ThemePalette {
  id: string;
  name: string;
  bg: string;
  surface: string;
  primary: string;
  primaryDeep: string;
  accent: string;
  text: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
}

export interface TaskItem {
  id: string;
  title: string;
  done: boolean;
  lastDoneDate?: string; // date key when this task last paid out (anti-farm)
  createdAt: string;
}

export interface QuestState {
  tasks: TaskItem[];
  steps: number; // lifetime journey steps (1 per completed task/day)
  resetDate: string; // date the `done` flags correspond to
  streakCurrent: number;
  streakLongest: number;
  lastCompletedDate?: string; // last day ≥1 task was completed
  reward?: { date: string; earned: number }; // daily Turtbux cap tracker
  stepsToday?: { date: string; count: number }; // daily step cap (anti-farm)
}

export interface NotificationSettings {
  dailyReminderEnabled: boolean;
  reminderTime: string; // "HH:mm"
  streakRiskEnabled: boolean;
  factOfDayEnabled: boolean;
  soundEnabled?: boolean; // celebration chime (default off)
  hapticsEnabled?: boolean; // vibration on celebrations (default on)
  pushEnabled?: boolean; // browser push for reminders / good mornings
}

export interface UserProfile {
  displayName: string;
  mascot: Mascot;
  mascotName?: string;
  themeId: string;
  timezone: string;
  isPremium: boolean;
  createdAt: string;
}

export interface Wallet {
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
}

/** The full persisted app state. */
export interface AppState {
  onboarded: boolean;
  profile: UserProfile;
  wallet: Wallet;
  ledger: LedgerEntry[];
  entries: Record<string, TurtleEntry>; // keyed by date
  shields: ShellShield[];
  factsRead: Record<string, string>; // factId -> readAt ISO
  inventory: Record<string, { equipped: boolean; acquiredAt: string }>; // itemId -> ...
  achievements: Record<string, string>; // achievementId -> earnedAt
  notifications: NotificationSettings;
  factOfDayClaimedOn?: string; // date key
  autoShieldCheckedOn?: string; // date key — auto-shield runs at most once/day
  lastReminderOn?: string; // date key — local reminder fired at most once/day
  loginBonusClaimedOn?: string; // date key — daily login bonus claimed once/day
  /** daily Turtbux earned from the mini-game (capped per day) */
  game?: { date: string; earned: number };
  /** daily Turtbux earned from mantra focus sessions (capped per day) */
  mantra?: { date: string; earned: number };
  /** lifetime counts for profile stats + achievements */
  gamesWon?: number;
  mantrasFocused?: number;
  /** Turtle Trek — daily goals that move a turtle along a journey */
  quest?: QuestState;
  /** Collectible fact cards: cardId -> copies owned */
  collection?: Record<string, number>;
  lastBoosterOn?: string; // date key the free daily booster was opened
  /** cloud account / backup metadata (Supabase-backed) */
  cloud?: { autoBackup: boolean; lastBackupAt?: string; email?: string };
}
