// Generates supabase/migrations/0006_fact_cards_seed.sql from the SAME logic as
// src/data/factCards.ts, so the server can roll boosters & reward authoritatively.
// Keep the arrays below in sync with src/data/factCards.ts (run: node scripts/gen-fact-cards.mjs).
import { writeFileSync } from "node:fs";

const RARITY_KEYS = ["common", "rare", "epic", "legendary"];

const NAMES = ["Sir Shellington", "Lady Paddlesworth", "Captain Mossback", "Pebbles", "Duchess Lagoona", "Baron von Flipper", "Tortellini", "Sunny", "Professor Snap", "Marbles", "Admiral Driftwood", "Biscuit"];
const ABILITIES = ["hold its breath for a whole afternoon", "nap on a lily pad without floating away", "sense a rainstorm an hour early", "find its way home across an entire ocean", "out-shine any sunbeam it sits in", "win a staring contest with a frog", "balance a pebble on its nose", "snooze through an entire thunderstorm", "recognise its favourite human's footsteps", "munch a strawberry in record-slow time", "doze with both eyes half-closed", "hum a tune that calms the whole pond"];
const PLACES = ["Lily Lagoon", "Coral Bay", "the Misty Cove", "Pebble Beach", "Sunset Point", "Kelp Forest", "Turtle Town", "Bubble Springs", "Seagrass Meadow", "Rainbow Reef"];
const HABITS = ["sunbathe together at dawn", "race snails (and lose, happily)", "collect the shiniest pebbles", "hum softly to the tide", "stack themselves into tiny towers", "trade lily pads like postcards", "nap in perfect synchronised rows", "throw the gentlest splash parties"];
const ADJ = ["ancient", "sleepy", "majestic", "tiny", "wise", "rainbow", "moonlit", "golden", "bashful", "legendary"];
const FEAT = ["once napped for a hundred years", "taught the tide how to be patient", "carries a whole galaxy on its shell", "knows the name of every star", "invented the art of slowing down", "out-waited a glacier", "befriended a very lost seagull", "keeps the pond's oldest secret"];
const SNACKS = ["a crisp leaf of lettuce", "a single perfect strawberry", "sun-warmed seagrass", "a dandelion (the yellow ones)", "a slice of cucumber", "a handful of pond clover", "a ripe blueberry", "a petal from a lily flower"];
const DREAMS = ["endless sunny lily pads", "a beach made entirely of snacks", "racing clouds across the sky", "a warm rock and nowhere to be", "the softest seagrass meadow", "becoming a very small island", "a pond with no edges", "floating among the stars"];
const EMOJI_POOL = ["🐢", "🪷", "🌿", "🫧", "⭐", "🌸", "🌊", "🐠", "🍃", "🌻", "🪨", "🌅", "🐚", "🌈", "☀️", "💧"];

// curated reals (mirror src/data/facts.ts) — folded in as rarer cards
const FACTS = [
  ["no-teeth", "Toothless Wonders", "Turtles have no teeth! They use a sharp, beak-like mouth to chomp their food.", "common", "🦷"],
  ["breathe-butt", "Bum Breathers", "Some turtles can absorb oxygen through their rear end — cloacal respiration! Truly elite.", "rare", "🍑"],
  ["shell-bones", "Built-in Backpack", "A turtle's shell is fused to its spine and ribs — it can't ever leave home without it.", "common", "🎒"],
  ["ancient", "Older Than Dinosaurs", "Turtles have been around for over 200 million years, predating snakes and crocodiles.", "rare", "🦕"],
  ["oldest", "Jonathan the Tortoise", "Jonathan, a Seychelles tortoise, is ~190+ years old — possibly the oldest land animal alive.", "legendary", "🎂"],
  ["tears", "Salty Criers", "Sea turtles 'cry' to flush out extra salt. Not sad — just very well hydrated.", "common", "😢"],
  ["navigation", "Magnetic Maps", "Sea turtles sense Earth's magnetic field to navigate thousands of miles back to their birth beach.", "rare", "🧭"],
  ["temperature-sex", "Warm = Girls", "For many turtles, nest temperature decides the babies' sex. Warmer sand → more females.", "common", "🌡️"],
  ["fast-leatherback", "Speedy Swimmer", "Leatherback sea turtles can swim up to 35 km/h — faster than you'd ever guess.", "rare", "💨"],
  ["group-name", "A Bale of Turtles", "A group of turtles is called a 'bale.' A bale of turtles. Say it again. Lovely.", "common", "👯"],
  ["care-basking", "Sunbathing Pros", "Pet turtles need a basking spot with UVB light to stay healthy and build strong shells.", "common", "☀️"],
  ["care-clean", "Clean Pond Club", "Turtles are messy! A good filter keeps their water clear and their little selves happy.", "common", "🫧"],
  ["tiny-speck", "Smallest Turtle", "The speckled padloper tortoise fits in your palm at under 10 cm. Pocket-sized perfection.", "rare", "🤏"],
  ["biggest", "Gentle Giant", "Leatherbacks can weigh over 900 kg — a turtle the size of a small car.", "legendary", "🚗"],
  ["hibernate", "Pond Naps", "Some turtles brumate (reptile hibernation) underwater all winter. The original cozy nappers.", "common", "😴"],
  ["shell-feel", "Shells Can Feel", "A shell isn't armor-armor — it has nerve endings. Turtles can feel a gentle scratch.", "common", "🫶"],
];

function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
function rarityFor(id) { const r = hash("rar:" + id) % 100; return r < 60 ? "common" : r < 85 ? "rare" : r < 97 ? "epic" : "legendary"; }
function emojiFor(id) { return EMOJI_POOL[hash("emo:" + id) % EMOJI_POOL.length]; }

const cards = [];
const add = (id, text) => cards.push({ id, text, rarity: rarityFor(id), emoji: emojiFor(id) });
NAMES.forEach((n, i) => ABILITIES.forEach((a, j) => add(`g1-${i}-${j}`, `${n} the turtle can ${a}.`)));
PLACES.forEach((p, i) => HABITS.forEach((h, j) => add(`g2-${i}-${j}`, `In ${p}, turtles love to ${h}.`)));
ADJ.forEach((ad, i) => FEAT.forEach((f, j) => add(`g3-${i}-${j}`, `Legend says the ${ad} turtle ${f}.`)));
SNACKS.forEach((sn, i) => add(`g4-${i}`, `A turtle's favourite snack is ${sn}.`));
DREAMS.forEach((d, i) => add(`g5-${i}`, `Turtles dream of ${d}.`));
for (const [id, title, body, rar, emoji] of FACTS) {
  cards.push({ id: `r-${id}`, text: `${title}: ${body}`, rarity: rar === "legendary" ? "legendary" : rar === "rare" ? "epic" : "rare", emoji });
}

const esc = (s) => s.replace(/'/g, "''");
const values = cards.map((c) => `  ('${c.id}','${esc(c.text)}','${c.rarity}','${c.emoji}')`).join(",\n");
const sql = `-- AUTO-GENERATED by scripts/gen-fact-cards.mjs — do not edit by hand.
-- Mirrors src/data/factCards.ts so boosters roll & reward server-side.
-- (The fact_card table is created in 0005_server_economy.sql; this file seeds it.)
insert into fact_card (id, text, rarity, emoji) values
${values}
on conflict (id) do update set text = excluded.text, rarity = excluded.rarity, emoji = excluded.emoji;
`;
writeFileSync(new URL("../supabase/migrations/0006_fact_cards_seed.sql", import.meta.url), sql);
console.log(`Wrote ${cards.length} fact cards.`);
