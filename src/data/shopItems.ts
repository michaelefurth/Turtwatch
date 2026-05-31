import type { ShopItem, ThemePalette } from "@/types";

export const THEMES: ThemePalette[] = [
  { id: "pond_mint", name: "Pond Mint", bg: "#eafaf0", surface: "#ffffff", primary: "#8fd6a8", primaryDeep: "#4fa873", accent: "#ffd6a5", text: "#33503f" },
  { id: "bubblegum", name: "Bubblegum Pond", bg: "#fdeef4", surface: "#ffffff", primary: "#f7a8c4", primaryDeep: "#e26d97", accent: "#bfe3ff", text: "#5b3346" },
  { id: "lilac_lagoon", name: "Lilac Lagoon", bg: "#f1ecfb", surface: "#ffffff", primary: "#c3b3f0", primaryDeep: "#8f78d6", accent: "#ffe1a8", text: "#423a5e" },
  { id: "sunny_sand", name: "Sunny Sandbar", bg: "#fff6e6", surface: "#ffffff", primary: "#ffcf73", primaryDeep: "#e6a230", accent: "#9fdcc0", text: "#5a4422" },
  { id: "deep_sea", name: "Deep Blue", bg: "#e8f1fb", surface: "#ffffff", primary: "#8fbdf0", primaryDeep: "#4f86d6", accent: "#ffc4d6", text: "#2d4360" },
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
  // frames
  { id: "frame_lilypad", category: "frame", name: "Lily Pad Frame", description: "Frame your daily turtle on a floating lily pad.", price: 120, emoji: "🪷", consumable: false },
  { id: "frame_bubbles", category: "frame", name: "Bubble Frame", description: "Surround your turtle with happy little bubbles.", price: 120, emoji: "🫧", consumable: false },
  { id: "frame_gold", category: "frame", name: "Golden Shell Frame", description: "For your most majestic turtles only.", price: 220, emoji: "🥇", consumable: false },
  // stickers
  { id: "sticker_pond", category: "sticker", name: "Pond Pals Pack", description: "Frogs, ducks & dragonflies to decorate entries.", price: 100, emoji: "🐸", consumable: false },
  { id: "sticker_party", category: "sticker", name: "Party Pack", description: "Confetti, balloons & party hats. Wholesome chaos.", price: 100, emoji: "🎉", consumable: false },
  // mascot accessories
  { id: "acc_party_hat", category: "mascot_accessory", name: "Party Hat", description: "A tiny party hat for your mascot.", price: 90, emoji: "🎩", consumable: false },
  { id: "acc_sunnies", category: "mascot_accessory", name: "Cool Sunnies", description: "Sunglasses. Your mascot is now extremely cool.", price: 120, emoji: "🕶️", consumable: false },
  { id: "acc_crown", category: "mascot_accessory", name: "Royal Crown", description: "Crown your mascot the ruler of the pond.", price: 250, emoji: "👑", consumable: false },
  // themes
  ...themeItems,
];

export function shopItemById(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((i) => i.id === id);
}

export function themeById(id: string): ThemePalette {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
