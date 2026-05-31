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
