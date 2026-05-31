# TurtWatch — Suggested Component Structure

Mirrors the prototype in `src/`. Same tree ports to React Native (swap DOM
elements for RN primitives; logic/store/types are identical).

```
src/
  main.tsx                 # app entry, router mount
  App.tsx                  # routes + app shell (pond bg, tab bar)
  index.css                # design tokens + base styles

  types/
    index.ts               # all domain TypeScript types (mirror of data model)

  data/
    facts.ts               # turtle fact catalog
    shopItems.ts           # shop catalog (themes, frames, stickers, shields...)
    sampleTurtles.ts       # bundled sample turtle images (data URIs / emoji art)
    achievements.ts        # achievement definitions

  logic/                   # PURE functions — no React, no I/O (unit-tested)
    dates.ts               # today(), toKey(), addDays(), local-tz helpers
    streak.ts              # computeStreak(entries) -> {current, longest, atRisk}
    turtbux.ts             # earn formulas, milestone bonuses, ledger helpers
    recovery.ts            # costs + apply repair/rescue/shield to a date
    ranks.ts               # rank from lifetimeEarned/total turtles
    economy.ts             # spend()/earn() pure transitions returning new state

  store/
    useStore.ts            # Zustand store + actions, persisted to localStorage
    persistence.ts         # load/save adapter (swap for SQLite/Supabase)
    seed.ts                # demo seed data toggle

  components/
    AppShell.tsx           # background ripples/bubbles + <Outlet/> + TabBar
    TabBar.tsx             # bottom floating nav
    Mascot.tsx             # Turtley/Shelldon SVG with mood + accessory
    TurtleAvatar.tsx       # reusable turtle sticker
    StreakRing.tsx         # animated circular streak display
    TurtbuxChip.tsx        # balance pill with coin icon
    Card.tsx               # rounded pastel card primitive
    PillButton.tsx         # primary CTA button
    MoodPicker.tsx         # emoji mood segmented control
    TagInput.tsx           # chip tag editor
    DayCell.tsx            # calendar day tile (state-aware)
    StateBadge.tsx         # completed/missed/repaired/... badge
    FactCard.tsx           # flippable fact card
    ShopItemCard.tsx       # shop item w/ buy/equip
    ConfirmModal.tsx       # cost/confirmation modal
    Celebration.tsx        # confetti + bubbles overlay
    Toast.tsx              # reward/info toasts
    EmptyState.tsx         # cozy empty states

  screens/
    Onboarding.tsx
    Home.tsx
    DailyUpload.tsx
    Calendar.tsx
    EntryDetail.tsx
    MissedDayRepair.tsx
    Shop.tsx
    FactsLibrary.tsx
    Profile.tsx
    Settings.tsx

  hooks/
    useToday.ts            # reactive local date
    useCelebration.ts      # trigger confetti/toast
```

## Conventions
- **Screens** orchestrate; **components** are dumb/presentational + themeable.
- **No business logic in components** — call store actions which call `logic/`.
- **Pure `logic/` functions** are the unit-test surface (see `logic/*.test.ts`).
- Theme via CSS custom properties set on `:root` from the active theme object,
  so cosmetic themes are pure data.
