import { useState } from "react";
import { useStore } from "@/store/useStore";
import { useFeedback } from "@/components/feedback";
import { Card, PillButton, formatNum } from "@/components/common";
import { ConfirmModal } from "@/components/ConfirmModal";
import { SHOP_ITEMS } from "@/data/shopItems";
import { availableShields } from "@/store/selectors";
import type { ShopCategory, ShopItem } from "@/types";

const CATS: { id: ShopCategory; label: string; emoji: string }[] = [
  { id: "shield", label: "Shields", emoji: "🛡️" },
  { id: "theme", label: "Themes", emoji: "🎨" },
  { id: "frame", label: "Frames", emoji: "🖼️" },
  { id: "sticker", label: "Stickers", emoji: "✨" },
  { id: "mascot_accessory", label: "Mascot", emoji: "🎩" },
];

export function Shop() {
  const { celebrate, toast } = useFeedback();
  const balance = useStore((s) => s.wallet.balance);
  const inventory = useStore((s) => s.inventory);
  const shields = useStore((s) => s.shields);
  const buyItem = useStore((s) => s.buyItem);
  const equipItem = useStore((s) => s.equipItem);

  const [cat, setCat] = useState<ShopCategory>("shield");
  const [buying, setBuying] = useState<ShopItem | null>(null);

  const items = SHOP_ITEMS.filter((i) => i.category === cat);

  const confirmBuy = () => {
    if (!buying) return;
    const r = buyItem(buying.id);
    if (!r.ok) { toast(r.reason ?? "Couldn't buy that", "😢"); setBuying(null); return; }
    celebrate(["🪙", buying.emoji, "✨"]);
    toast(`Got ${buying.name}!`, buying.emoji);
    setBuying(null);
  };

  return (
    <div className="screen stack">
      <div className="between">
        <h1>Turtbux Shop 🛍️</h1>
        <span className="chip gold">🪙 {formatNum(balance)}</span>
      </div>

      <div className="row wrap gap8">
        {CATS.map((c) => (
          <button key={c.id} className={`chip ${cat === c.id ? "selected" : "outline"}`} onClick={() => setCat(c.id)}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {cat === "shield" && (
        <Card className="flat center">
          <b>🛡️ Shields in your bag: {availableShields(shields)}</b>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>Shields auto-protect a missed day to save your streak.</p>
        </Card>
      )}

      <div className="grid2">
        {items.map((item) => {
          const owned = !item.consumable && !!inventory[item.id];
          const equipped = owned && inventory[item.id].equipped;
          const previewBg = item.theme ? item.theme.primary : "color-mix(in srgb, var(--primary) 18%, var(--surface))";
          return (
            <Card key={item.id} className="tight">
              <div className="center" style={{ background: previewBg, borderRadius: 14, padding: "16px 0", fontSize: 34 }}>
                {item.emoji}
              </div>
              <h3 style={{ margin: "8px 0 2px" }}>{item.name}</h3>
              <p className="muted" style={{ fontSize: 12, margin: "0 0 8px", minHeight: 32 }}>{item.description}</p>
              {owned ? (
                equipped ? (
                  <span className="chip selected" style={{ width: "100%", justifyContent: "center" }}>✓ Equipped</span>
                ) : (
                  <PillButton small variant="secondary" onClick={() => { equipItem(item.id); toast(`Equipped ${item.name}`, item.emoji); }}>Equip</PillButton>
                )
              ) : (
                <PillButton small onClick={() => setBuying(item)}>{item.price} 🪙</PillButton>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="flat center">
        <b>✨ Premium (coming soon)</b>
        <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>Extra AI rescues, exclusive themes & sticker packs, advanced stats, PDF export, and cloud backup.</p>
      </Card>

      <ConfirmModal
        open={!!buying}
        emoji={buying?.emoji}
        title={`Buy ${buying?.name}?`}
        confirmLabel={`Buy for ${buying?.price} 🪙`}
        confirmDisabled={!!buying && balance < buying.price}
        onCancel={() => setBuying(null)}
        onConfirm={confirmBuy}
      >
        <p className="center muted" style={{ margin: 0 }}>
          {buying && balance < buying.price
            ? "Not enough Turtbux — keep uploading turtles! 🐢"
            : `Balance after: ${buying ? balance - buying.price : 0} 🪙`}
        </p>
      </ConfirmModal>
    </div>
  );
}
