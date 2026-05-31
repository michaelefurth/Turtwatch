// Positive, turtle-themed mantras for the focus / meditation page. We combine
// gentle openers with affirmations to generate 200+ unique uplifting lines, plus
// a set of curated standalone turtle mantras. All wholesome, all soothing.

const OPENERS = [
  "Slow and steady,",
  "Breathing in calm,",
  "Like a turtle in the sun,",
  "With each gentle breath,",
  "Safe in my shell,",
  "At my own pace,",
  "Rooted and serene,",
  "Floating easy,",
  "Step by step,",
  "Here in this moment,",
  "Soft and unhurried,",
  "Carried by the current,",
];

const CORES = [
  "I am exactly where I need to be.",
  "I move at my own gentle pace.",
  "I carry everything I need within me.",
  "I am calm, patient, and kind.",
  "I let worries drift away like ripples.",
  "I am stronger than I know.",
  "I deserve rest and gentleness.",
  "I grow a little every single day.",
  "I am safe, warm, and at ease.",
  "I choose peace over pressure.",
  "I trust the path beneath me.",
  "I am proud of how far I've come.",
  "I breathe in calm and breathe out doubt.",
  "I am enough, just as I am.",
  "I welcome this moment with an open heart.",
  "I am gentle with myself today.",
  "I find joy in small, slow things.",
  "I am grounded, steady, and whole.",
  "I let go of what I cannot carry.",
  "I shine quietly, in my own way.",
];

const CURATED = [
  "You don't have to rush to arrive.",
  "Even the slowest turtle still reaches the sea.",
  "Your shell is proof you can carry hard things.",
  "Rest is not falling behind.",
  "Tiny steps still cross great oceans.",
  "Be patient with yourself; you are growing.",
  "Slow progress is still progress.",
  "You are allowed to take up space and time.",
  "Peace travels at a turtle's pace.",
  "Today, simply being is enough.",
  "Your calm is your superpower.",
  "Carry your home in your heart wherever you go.",
  "It's okay to retreat and rest before you continue.",
  "Gentle and steady wins a kinder race.",
  "You bloom in your own season.",
  "The pond is calm because it doesn't hurry.",
  "Every sunrise is a fresh lily pad to land on.",
  "Soft does not mean weak.",
  "You have survived every hard day so far.",
  "Let the current carry what you cannot.",
  "Small ripples become wide, gentle waves.",
  "You are worthy of slow, sunny mornings.",
  "Breathe. The shore isn't going anywhere.",
  "Your pace is the perfect pace.",
  "Kindness to yourself is never wasted.",
  "One calm breath can change the whole day.",
  "You are doing better than you think.",
  "Stillness is a kind of strength.",
  "Let today be soft and unhurried.",
  "There is courage in moving gently forward.",
];

/** Build the full deduped list of 200+ mantras. */
export function buildMantras(): string[] {
  const set = new Set<string>(CURATED);
  for (const o of OPENERS) {
    for (const c of CORES) {
      // lowercase the leading "I" clause to read naturally after the comma
      set.add(`${o} ${c.charAt(0).toLowerCase()}${c.slice(1)}`);
    }
  }
  return [...set];
}

export const ALL_MANTRAS = buildMantras();

export function shuffledMantras(rng: () => number = Math.random): string[] {
  const a = [...ALL_MANTRAS];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- focus session economy ----
export const FOCUS_OPTIONS = [15, 30, 60]; // seconds
export const MANTRA_REWARD = 2; // Turtbux per completed focus
export const MANTRA_DAILY_CAP = 20;

export function remainingMantraReward(earnedToday: number, amount: number): number {
  return Math.max(0, Math.min(amount, MANTRA_DAILY_CAP - earnedToday));
}
