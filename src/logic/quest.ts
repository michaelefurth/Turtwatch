// Pure logic for "Turtle Trek" — a daily goals tracker. Each completed task moves
// your turtle one step along a winding journey; every leg reaches a new place.

import type { QuestState } from "@/types";

export interface Landmark {
  name: string;
  emoji: string;
  lore: string; // a cozy one-liner revealed on arrival
}

export const LANDMARKS: Landmark[] = [
  { name: "Lily Lagoon", emoji: "🪷", lore: "Warm shallows where the lily pads make perfect nap rafts." },
  { name: "Sunny Cove", emoji: "🏖️", lore: "A golden beach for the world's slowest sunbathing." },
  { name: "Coral Bay", emoji: "🪸", lore: "Bright coral gardens that tickle a passing shell." },
  { name: "Mossy Rock", emoji: "🪨", lore: "A cool green boulder — the coziest snack of all." },
  { name: "Bubble Springs", emoji: "🫧", lore: "Fizzy little springs that giggle as you swim." },
  { name: "Pebble Beach", emoji: "🏝️", lore: "Smooth pebbles that clink a gentle hello." },
  { name: "Kelp Forest", emoji: "🌿", lore: "Tall swaying kelp — a calm green cathedral." },
  { name: "Starfish Shoal", emoji: "⭐", lore: "Sleepy starfish wave their arms in slow motion." },
  { name: "Driftwood Dock", emoji: "⚓", lore: "An old dock that creaks the comfiest lullabies." },
  { name: "Seagrass Meadow", emoji: "🌾", lore: "Endless soft meadows to munch and dawdle through." },
  { name: "Pearl Reef", emoji: "🦪", lore: "Oysters here keep secrets and the occasional pearl." },
  { name: "Sunset Point", emoji: "🌅", lore: "The best seat in the sea for golden-hour drifting." },
  { name: "Misty Cove", emoji: "🌫️", lore: "A hush of fog where everything slows even more." },
  { name: "Rainbow Reef", emoji: "🌈", lore: "Coral in every pastel — a shell-keeper's dream." },
  { name: "Turtle Town", emoji: "🏘️", lore: "A bustling little burrow of friendly fellow turtles." },
  { name: "Ancient Atoll", emoji: "🗿", lore: "Legends say the wisest, oldest turtles rest here." },
];

export const STEPS_PER_LEG = 8;
export const TASK_REWARD = 4; // Turtbux per completed task
export const TASK_DAILY_CAP = 24; // daily Turtbux cap from tasks
export const STEP_DAILY_CAP = 12; // max journey steps per day (anti-farm)
export const LEG_BONUS = 20; // bonus for reaching a new place

export function reachedCount(steps: number): number {
  return Math.floor(steps / STEPS_PER_LEG);
}
export function progressInLeg(steps: number): number {
  return steps % STEPS_PER_LEG;
}
/** Where the turtle is currently heading. */
export function destinationFor(steps: number): Landmark {
  return LANDMARKS[reachedCount(steps) % LANDMARKS.length];
}
/** The most recently reached place (or null if still on the first leg). */
export function lastReached(steps: number): Landmark | null {
  const n = reachedCount(steps);
  return n === 0 ? null : LANDMARKS[(n - 1) % LANDMARKS.length];
}
/** If oldSteps→newSteps crossed a leg boundary, the place just arrived at. */
export function arrivalLandmark(oldSteps: number, newSteps: number): Landmark | null {
  if (reachedCount(newSteps) > reachedCount(oldSteps)) {
    return LANDMARKS[(reachedCount(newSteps) - 1) % LANDMARKS.length];
  }
  return null;
}

export function remainingTaskReward(earnedToday: number, amount: number): number {
  return Math.max(0, Math.min(amount, TASK_DAILY_CAP - earnedToday));
}

/** New current streak when a day's first task completes. */
export function nextStreak(lastCompletedDate: string | undefined, today: string, yesterday: string, current: number): number {
  if (lastCompletedDate === today) return current; // already counted today
  return lastCompletedDate === yesterday ? current + 1 : 1;
}

/** Streak value to display (0 if it has lapsed past yesterday). */
export function questStreakDisplay(q: QuestState | undefined, today: string, yesterday: string): number {
  if (!q || !q.lastCompletedDate) return 0;
  if (q.lastCompletedDate === today || q.lastCompletedDate === yesterday) return q.streakCurrent;
  return 0;
}

export function makeQuest(today: string): QuestState {
  return { tasks: [], steps: 0, resetDate: today, streakCurrent: 0, streakLongest: 0 };
}

/** Apply the daily rollover: clear the done checkboxes for a new day. */
export function withDailyReset(q: QuestState, today: string): QuestState {
  if (q.resetDate === today) return q;
  return { ...q, resetDate: today, tasks: q.tasks.map((t) => ({ ...t, done: false })) };
}
