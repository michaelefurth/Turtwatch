// Small helpers + copy pools to keep the UI feeling fresh and alive. Use these
// for things that should vary on each visit/event (NOT for deterministic things
// like the daily fact or daily deal — those stay date-seeded).

export const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Event-specific confetti emoji pools (feedback.celebrate samples from these). */
export const POOLS = {
  upload: ["🐢", "✨", "📸", "🌿", "💚", "🌊", "🌸", "🎉", "🪴", "🍀", "🌻", "🐠"],
  streak: ["🔥", "🐢", "⚡", "🏆", "💪", "✨", "🌟", "🎯", "💥", "🎊", "🥳", "🎉"],
  game: ["🎴", "🐢", "🪷", "✨", "💚", "🌸", "🎊", "🌿", "🍃", "🌊", "💫", "🌺"],
  repair: ["🩹", "🐢", "💚", "🌱", "✨", "🎉", "🌿", "🌸", "💪", "🌊", "🪴", "☀️"],
  shop: ["🪙", "✨", "🛍️", "🎁", "💛", "🌟", "🎊", "🐢", "🌸", "🏮", "💎", "🎉"],
  perfect: ["🌟", "🏆", "💫", "✨", "🥇", "🎊", "🎯", "🐢", "👑", "🌠", "⭐", "🌙"],
  trek: ["🗺️", "🐢", "✨", "🎉", "🌿", "🪷", "🌊", "⭐", "💚", "🏝️"],
};

export const CHEERS = [
  "Shell yeah! 🐢", "Turtle-y awesome! 🎉", "Pond-tastic! 🌿", "Snap-tacular! 📸",
  "What a legend! 🌟", "You're on a roll! 🐢", "Another for the diary! 📔", "Shell we celebrate? 🎉",
  "Magnifi-shell! 🐢", "Pure turtle joy! 💚",
];

export const GAME_WIN = [
  "Lovely! +{n} Turtbux 🪙", "Serene and swift! +{n} 🪙", "Pond champion! +{n} 🪙",
  "Peaceful perfection! +{n} 🪙", "Beautifully done! +{n} 🪙",
];

export const MANTRA_DONE = [
  "+{n} Turtbux · breathe 🌿", "Beautifully focused 🧘 +{n}", "Serenity unlocked 🌊 +{n}",
  "You glowed 🌸 +{n}", "One calm breath 🍃 +{n}",
];

export const GREETINGS = [
  (n: string) => `Hi, ${n}! 🌿`,
  (n: string) => `Welcome back, ${n} 🐢`,
  (n: string) => `Hey ${n}, the pond's ready ☀️`,
  (n: string) => `Good to see you, ${n}! 🌊`,
  (n: string) => `${n}! Your turtle awaits 📸`,
  (n: string) => `Hello again, ${n} 🪷`,
];

export const UNNAMED_TURTLE = ["A lovely turtle", "A mystery turtle", "Today's guest", "An unnamed friend", "The anonymous one 🐢"];

export const EMPTY_DIARY = [
  { emoji: "🐢", title: "No turtles yet", sub: "Upload your first turtle and your diary will fill up here." },
  { emoji: "🌿", title: "The pond is still", sub: "Your first turtle photo will make it come alive." },
  { emoji: "📸", title: "Ready for action!", sub: "Snap a turtle to kick off your collection." },
  { emoji: "🌊", title: "Calm waters await", sub: "Your diary fills up one turtle at a time." },
];

export const EMPTY_SEARCH = [
  { emoji: "🔍", title: "No matches", sub: "Try a different search or filter." },
  { emoji: "🐢", title: "That turtle's hiding", sub: "Try adjusting your filters." },
  { emoji: "🌿", title: "Nothing in the net", sub: "Cast a wider search!" },
];

export const CARD_BACKS = ["🪷", "🌊", "🌿", "🐚", "🍃", "🌸", "🫧", "☘️"];

/** A gentle ambient seasonal accent shown under the mascot (no shop needed). */
export function seasonalHint(now: Date = new Date()): string | null {
  const m = now.getMonth();
  if (m === 11 || m === 0) return "❄️";
  if (m === 1) return "💝";
  if (m === 2 || m === 3) return "🌸";
  if (m === 5 || m === 6 || m === 7) return "☀️";
  if (m === 9 || m === 10) return "🍂";
  return null;
}
