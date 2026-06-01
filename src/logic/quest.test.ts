import { describe, it, expect } from "vitest";
import {
  reachedCount, progressInLeg, destinationFor, lastReached, arrivalLandmark,
  remainingTaskReward, nextStreak, withDailyReset, makeQuest, LANDMARKS,
  STEPS_PER_LEG, TASK_DAILY_CAP,
} from "./quest";

describe("trek geometry", () => {
  it("counts reached places and leg progress", () => {
    expect(reachedCount(0)).toBe(0);
    expect(reachedCount(STEPS_PER_LEG)).toBe(1);
    expect(progressInLeg(STEPS_PER_LEG + 3)).toBe(3);
  });

  it("heads to the right destination and reports last stop", () => {
    expect(destinationFor(0).name).toBe(LANDMARKS[0].name);
    expect(lastReached(0)).toBeNull();
    expect(lastReached(STEPS_PER_LEG)?.name).toBe(LANDMARKS[0].name);
    expect(destinationFor(STEPS_PER_LEG).name).toBe(LANDMARKS[1].name);
  });

  it("detects arrival only when crossing a leg boundary", () => {
    expect(arrivalLandmark(STEPS_PER_LEG - 1, STEPS_PER_LEG)?.name).toBe(LANDMARKS[0].name);
    expect(arrivalLandmark(1, 2)).toBeNull();
  });
});

describe("trek rewards & streak", () => {
  it("caps daily task reward", () => {
    expect(remainingTaskReward(0, 5)).toBe(5);
    expect(remainingTaskReward(TASK_DAILY_CAP, 5)).toBe(0);
    expect(remainingTaskReward(TASK_DAILY_CAP - 2, 5)).toBe(2);
  });

  it("increments streak across consecutive days, resets after a gap", () => {
    expect(nextStreak("2026-05-30", "2026-05-31", "2026-05-30", 4)).toBe(5); // yesterday → +1
    expect(nextStreak("2026-05-31", "2026-05-31", "2026-05-30", 5)).toBe(5); // same day → unchanged
    expect(nextStreak("2026-05-20", "2026-05-31", "2026-05-30", 9)).toBe(1); // gap → reset
  });
});

describe("withDailyReset", () => {
  it("clears done flags on a new day but keeps tasks", () => {
    const q = makeQuest("2026-05-30");
    q.tasks = [{ id: "a", title: "t", done: true, createdAt: "" }];
    const reset = withDailyReset(q, "2026-05-31");
    expect(reset.tasks[0].done).toBe(false);
    expect(reset.tasks).toHaveLength(1);
    expect(reset.resetDate).toBe("2026-05-31");
  });

  it("is a no-op on the same day", () => {
    const q = makeQuest("2026-05-31");
    expect(withDailyReset(q, "2026-05-31")).toBe(q);
  });
});
