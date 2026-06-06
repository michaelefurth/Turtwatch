import type { ShopItem, ThemePalette } from "@/types";

export const THEMES: ThemePalette[] = [
  { id: "pond_mint", name: "Pond Mint", bg: "#eafaf0", surface: "#ffffff", primary: "#8fd6a8", primaryDeep: "#2f7d50", accent: "#ffd6a5", text: "#2b4636" },
  { id: "bubblegum", name: "Bubblegum Pond", bg: "#fdeef4", surface: "#ffffff", primary: "#f7a8c4", primaryDeep: "#c14d77", accent: "#bfe3ff", text: "#5b3346" },
  { id: "lilac_lagoon", name: "Lilac Lagoon", bg: "#f1ecfb", surface: "#ffffff", primary: "#c3b3f0", primaryDeep: "#6f57bd", accent: "#ffe1a8", text: "#423a5e" },
  { id: "sunny_sand", name: "Sunny Sandbar", bg: "#fff6e6", surface: "#ffffff", primary: "#ffcf73", primaryDeep: "#b3760f", accent: "#9fdcc0", text: "#5a4422" },
  { id: "deep_sea", name: "Deep Blue", bg: "#e8f1fb", surface: "#ffffff", primary: "#8fbdf0", primaryDeep: "#2f66b8", accent: "#ffc4d6", text: "#2d4360" },
  { id: "seafoam", name: "Seafoam", bg: "#e6fbf6", surface: "#ffffff", primary: "#8fe0d2", primaryDeep: "#2f8a78", accent: "#ffd0a5", text: "#244f49" },
];

const themeItems: ShopItem[] = THEMES.filter((t) => t.id !== "pond_mint").map((t, i) => ({
  id: `theme_${t.id}`,
  category: "theme",
  name: t.name,
  description: "A cozy new pond palette for the whole app.",
  price: 150 + i * 40,
  emoji: "🎨",
  consumable: false,
  theme: t,
}));

export const SHOP_ITEMS: ShopItem[] = [
  // recovery & shields (consumable)
  { id: "buy_shield", category: "shield", name: "Shell Shield", description: "Protects one missed day so your streak survives. Stock up!", price: 80, emoji: "🛡️", consumable: true },
  { id: "shield_pack_3", category: "shield", name: "Shield Pack ×3", description: "Three Shell Shields at once — stock up for a long trip.", price: 210, emoji: "🛡️", consumable: true },
  // frames
  { id: "frame_lilypad", category: "frame", name: "Lily Pad Frame", description: "Frame your daily turtle on a floating lily pad.", price: 120, emoji: "🪷", consumable: false },
  { id: "frame_bubbles", category: "frame", name: "Bubble Frame", description: "Surround your turtle with happy little bubbles.", price: 120, emoji: "🫧", consumable: false },
  { id: "frame_gold", category: "frame", name: "Golden Shell Frame", description: "For your most majestic turtles only.", price: 220, emoji: "🥇", consumable: false },
  { id: "frame_starlight", category: "frame", name: "Starlight Frame", description: "A dreamy sparkle border for cosmic turtles.", price: 200, emoji: "✨", consumable: false },
  { id: "frame_rainbow", category: "frame", name: "Rainbow Frame", description: "A soft rainbow halo around your turtle.", price: 200, emoji: "🌈", consumable: false },
  // stickers
  { id: "sticker_pond", category: "sticker", name: "Pond Pals Pack", description: "Frogs, ducks & dragonflies to decorate entries.", price: 100, emoji: "🐸", consumable: false },
  { id: "sticker_party", category: "sticker", name: "Party Pack", description: "Confetti, balloons & party hats. Wholesome chaos.", price: 100, emoji: "🎉", consumable: false },
  { id: "sticker_food", category: "sticker", name: "Snack Pack", description: "Strawberries, lettuce & little cakes for hungry turtles.", price: 100, emoji: "🍓", consumable: false },
  // mascot accessories
  { id: "acc_party_hat", category: "mascot_accessory", name: "Party Hat", description: "A tiny party hat for your mascot.", price: 90, emoji: "🎩", consumable: false },
  { id: "acc_sunnies", category: "mascot_accessory", name: "Cool Sunnies", description: "Sunglasses. Your mascot is now extremely cool.", price: 120, emoji: "🕶️", consumable: false },
  { id: "acc_bow", category: "mascot_accessory", name: "Cute Bow", description: "An adorable bow for a dapper turtle.", price: 90, emoji: "🎀", consumable: false },
  { id: "acc_flower", category: "mascot_accessory", name: "Flower Crown", description: "A springtime flower for your mascot's head.", price: 110, emoji: "🌷", consumable: false },
  { id: "acc_scarf", category: "mascot_accessory", name: "Cozy Scarf", description: "Keep your turtle snug and stylish.", price: 140, emoji: "🧣", consumable: false },
  { id: "acc_crown", category: "mascot_accessory", name: "Royal Crown", description: "Crown your mascot the ruler of the pond.", price: 250, emoji: "👑", consumable: false },
  // themes
  ...themeItems,
];

/** A deterministic daily-deal: one cosmetic at 30% off (rotates by date). */
export function dailyDeal(dateKey: string): { item: ShopItem; price: number } {
  const pool = SHOP_ITEMS.filter((i) => i.category !== "shield");
  let h = 0;
  for (let i = 0; i < dateKey.length; i++) h = (h * 31 + dateKey.charCodeAt(i)) | 0;
  const item = pool[Math.abs(h) % pool.length];
  const price = Math.max(5, Math.round((item.price * 0.7) / 5) * 5);
  return { item, price };
}

/** Representative sticker emoji shown on entry photos when a pack is equipped. */
export const STICKER_EMOJI: Record<string, string> = {
  sticker_pond: "🐸",
  sticker_party: "🎉",
  sticker_food: "🍓",
};

export function shopItemById(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((i) => i.id === id);
}

export function themeById(id: string): ThemePalette {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
