// Pure Turtbux earning formulas. See docs/05-streak-and-turtbux-logic.md.

export const BASE_UPLOAD = 10;
export const STREAK_BONUS_CAP = 30;
export const NOTE_BONUS = 3;
export const META_BONUS = 2; // mood + >=1 tag
export const ONBOARDING_GIFT = 50;
export const FACT_OF_DAY = 2;

export const MILESTONES: Record<number, number> = {
  7: 25,
  30: 100,
  100: 500,
  365: 2000,
};

/** Streak bonus added to an on-time upload (capped). */
export function streakBonus(streakAfterUpload: number): number {
  return Math.min(streakAfterUpload, STREAK_BONUS_CAP);
}

export function milestoneBonus(streakAfterUpload: number): number {
  return MILESTONES[streakAfterUpload] ?? 0;
}

/** Reward breakdown for an on-time (today) upload. */
export function uploadReward(opts: {
  streakAfterUpload: number;
  hasNotes: boolean;
  hasMeta: boolean;
}): { total: number; parts: { label: string; amount: number }[] } {
  const parts: { label: string; amount: number }[] = [
    { label: "Daily turtle", amount: BASE_UPLOAD },
  ];
  const sb = streakBonus(opts.streakAfterUpload);
  if (sb > 0) parts.push({ label: `Streak bonus (×${sb})`, amount: sb });
  const mb = milestoneBonus(opts.streakAfterUpload);
  if (mb > 0) parts.push({ label: `🎉 ${opts.streakAfterUpload}-day milestone!`, amount: mb });
  if (opts.hasNotes) parts.push({ label: "Wrote notes", amount: NOTE_BONUS });
  if (opts.hasMeta) parts.push({ label: "Mood + tags", amount: META_BONUS });
  const total = parts.reduce((s, p) => s + p.amount, 0);
  return { total, parts };
}

/** Live estimate shown on the upload screen before saving. */
export function estimateUpload(streakNow: number, hasNotes: boolean, hasMeta: boolean): number {
  return uploadReward({ streakAfterUpload: streakNow + 1, hasNotes, hasMeta }).total;
}
