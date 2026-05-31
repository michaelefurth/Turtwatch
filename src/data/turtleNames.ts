// Silly turtle name generator for the 🎲 button on the upload screen.

const TITLES = ["Sir", "Lady", "Captain", "Baron", "Duchess", "Professor", "Admiral", "Count", "Madame", "General", "Lord", "Princess"];
const FIRSTS = ["Reginald", "Shelly", "Pebbles", "Waddles", "Mossy", "Bubbles", "Chonk", "Noodle", "Tortellini", "Snappy", "Lettuce", "Marble", "Pickle", "Biscuit", "Splash", "Olive"];
const LASTS = ["Shellsworth", "McSnappy", "von Paddlesworth", "Greenshell", "Bogwater", "Lilypad", "Slowpoke", "Pondington", "Crunchwater", "Flipperton", "Mossback", "Snackerly"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateTurtleName(): string {
  const roll = Math.random();
  if (roll < 0.45) return `${pick(TITLES)} ${pick(FIRSTS)} ${pick(LASTS)}`;
  if (roll < 0.8) return `${pick(FIRSTS)} ${pick(LASTS)}`;
  return `${pick(TITLES)} ${pick(FIRSTS)}`;
}
