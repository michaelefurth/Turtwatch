import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "./useStore";
import { addDays, todayKey } from "@/logic/dates";
import type { TurtleEntry } from "@/types";

function entry(date: string, state: TurtleEntry["state"] = "completed"): TurtleEntry {
  return { id: date, date, state, tags: [], earnedTurtbux: 0, bonuses: {}, createdAt: "", updatedAt: "" };
}

describe("store: delete reverses rewards (anti-farm)", () => {
  beforeEach(() => useStore.getState().reset());

  it("refunds earned Turtbux when an entry is deleted", () => {
    useStore.getState().completeOnboarding({});
    const before = useStore.getState().wallet.balance; // onboarding gift
    useStore.getState().saveTodayEntry({ photoUrl: "x", photoSource: "sample" });
    const earned = useStore.getState().entries[todayKey()].earnedTurtbux;
    expect(useStore.getState().wallet.balance).toBe(before + earned);

    useStore.getState().deleteEntry(todayKey());
    // delete + re-upload must not net any Turtbux
    expect(useStore.getState().wallet.balance).toBe(before);
  });

  it("restores a consumed Shell Shield when a shielded day is deleted", () => {
    useStore.setState({ shields: [{ id: "s1", status: "available", acquiredAt: "" }] });
    const d = addDays(todayKey(), -3);
    expect(useStore.getState().shieldDay(d).ok).toBe(true);
    expect(useStore.getState().shields[0].status).toBe("used");

    useStore.getState().deleteEntry(d);
    expect(useStore.getState().shields[0].status).toBe("available");
  });
});

describe("store: mini-game & mantra rewards", () => {
  beforeEach(() => useStore.getState().reset());

  it("tracks lifetime games and unlocks the flip achievement", () => {
    useStore.getState().awardGameReward(6);
    expect(useStore.getState().gamesWon).toBe(1);
    expect(useStore.getState().achievements.first_flip).toBeTruthy();
  });

  it("tracks lifetime mantras and unlocks the mantra achievement", () => {
    useStore.getState().awardMantraReward(2);
    expect(useStore.getState().mantrasFocused).toBe(1);
    expect(useStore.getState().achievements.first_mantra).toBeTruthy();
  });

  it("caps daily game Turtbux but still counts the win", () => {
    // first win awards up to the cap; a huge amount is clamped
    const got = useStore.getState().awardGameReward(999);
    expect(got).toBeLessThanOrEqual(30);
    const before = useStore.getState().wallet.balance;
    useStore.getState().awardGameReward(999); // cap already hit → 0 Turtbux
    expect(useStore.getState().wallet.balance).toBe(before);
    expect(useStore.getState().gamesWon).toBe(2); // but the play still counts
  });
});

describe("store: booster packs", () => {
  beforeEach(() => useStore.getState().reset());

  it("opens a free pack once per day, collecting 3 cards", () => {
    const r = useStore.getState().openBooster(false);
    expect(r.ok).toBe(true);
    expect(r.cards).toHaveLength(3);
    expect(Object.keys(useStore.getState().collection ?? {}).length).toBeGreaterThanOrEqual(1);
    // free pack consumed for today
    expect(useStore.getState().openBooster(false).ok).toBe(false);
  });

  it("can buy an extra pack with Turtbux", () => {
    useStore.getState().completeOnboarding({}); // +50 Turtbux
    const before = useStore.getState().wallet.balance;
    const r = useStore.getState().openBooster(true);
    expect(r.ok).toBe(true);
    // spent 40, then gained the pack reward
    expect(useStore.getState().wallet.balance).toBe(before - 40 + (r.rewarded ?? 0));
  });
});

describe("store: daily login bonus", () => {
  beforeEach(() => useStore.getState().reset());

  it("pays once per day", () => {
    const first = useStore.getState().claimLoginBonus();
    expect(first).toBeGreaterThanOrEqual(5);
    expect(useStore.getState().claimLoginBonus()).toBe(0);
  });
});

describe("store: saveTodayEntry never overwrites", () => {
  beforeEach(() => useStore.getState().reset());

  it("re-saving today routes through update (no double base reward)", () => {
    useStore.getState().completeOnboarding({});
    useStore.getState().saveTodayEntry({ photoUrl: "x", photoSource: "sample" });
    const afterFirst = useStore.getState().wallet.balance;
    const entryId = useStore.getState().entries[todayKey()].id;
    useStore.getState().saveTodayEntry({ photoUrl: "y", photoSource: "sample", notes: "a longer note here" });
    // same entry (updated), and no second base upload reward
    expect(useStore.getState().entries[todayKey()].id).toBe(entryId);
    expect(useStore.getState().wallet.balance).toBe(afterFirst + 3); // only the note bonus
  });
});

describe("store: autoApplyShield adjacency guard", () => {
  beforeEach(() => useStore.getState().reset());

  it("auto-shields yesterday when a streak ran into it", () => {
    const today = todayKey();
    useStore.setState({
      shields: [{ id: "s1", status: "available", acquiredAt: "" }],
      entries: { [addDays(today, -2)]: entry(addDays(today, -2)) },
    });
    expect(useStore.getState().autoApplyShield()).toBe(addDays(today, -1));
  });

  it("does NOT burn a shield on a non-adjacent old gap", () => {
    const today = todayKey();
    useStore.setState({
      shields: [{ id: "s1", status: "available", acquiredAt: "" }],
      entries: { [addDays(today, -10)]: entry(addDays(today, -10)) },
    });
    expect(useStore.getState().autoApplyShield()).toBeNull();
    expect(useStore.getState().shields[0].status).toBe("available");
  });

  it("runs at most once per day", () => {
    const today = todayKey();
    useStore.setState({
      shields: [{ id: "s1", status: "available", acquiredAt: "" }],
      entries: { [addDays(today, -2)]: entry(addDays(today, -2)) },
    });
    expect(useStore.getState().autoApplyShield()).toBe(addDays(today, -1));
    expect(useStore.getState().autoApplyShield()).toBeNull(); // already checked today
  });
});
