import type { AppState } from "@/types";

export function makeInitialState(): AppState {
  return {
    onboarded: false,
    profile: {
      displayName: "Pond Keeper",
      mascot: "turtley",
      mascotName: "Turtley",
      themeId: "pond_mint",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      isPremium: false,
      createdAt: new Date().toISOString(),
    },
    wallet: { balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 },
    ledger: [],
    entries: {},
    shields: [],
    factsRead: {},
    inventory: {},
    achievements: {},
    notifications: {
      dailyReminderEnabled: true,
      reminderTime: "19:00",
      streakRiskEnabled: true,
      factOfDayEnabled: false,
      soundEnabled: false,
      hapticsEnabled: true,
      pushEnabled: false,
    },
    // explicit so reset() (a shallow merge) clears any prior values
    factOfDayClaimedOn: undefined,
    autoShieldCheckedOn: undefined,
    lastReminderOn: undefined,
    loginBonusClaimedOn: undefined,
    game: undefined,
    mantra: undefined,
    gamesWon: 0,
    mantrasFocused: 0,
    quest: undefined,
    collection: {},
    lastBoosterOn: undefined,
    cloud: { autoBackup: false },
  };
}
