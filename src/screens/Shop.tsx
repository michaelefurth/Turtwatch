import { useMemo, useState } from "react";
import { useStore } from "@/store/useStore";
import { useFeedback } from "@/components/feedback";
import { Card, PillButton, formatNum } from "@/components/common";
import { ConfirmModal } from "@/components/ConfirmModal";
import { SHOP_ITEMS, dailyDeal } from "@/data/shopItems";
import { availableShields } from "@/store/selectors";
import { todayKey } from "@/logic/dates";
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
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [buying, setBuying] = useState<{ item: ShopItem; price: number } | null>(null);

  const deal = useMemo(() => dailyDeal(todayKey()), []);
  const dealOwned = deal.item.category !== "shield" && !!inventory[deal.item.id];

  const items = SHOP_ITEMS.filter((i) => i.category === cat).filter(
    (i) => !ownedOnly || i.consumable || inventory[i.id],
  );

  const countFor = (c: ShopCategory) => {
    const all = SHOP_ITEMS.filter((i) => i.category === c && !i.consumable);
    if (all.length === 0) return null;
    const owned = all.filter((i) => inventory[i.id]).length;
    return `${owned}/${all.length}`;
  };

  const confirmBuy = () => {
    if (!buying) return;
    const r = buyItem(buying.item.id, buying.price);
    if (!r.ok) { toast(r.reason ?? "Couldn't buy that", "😢"); setBuying(null); return; }
    celebrate(["🪙", buying.item.emoji, "✨", "🛍️", "🎁", "💛", "🌟", "🎊"]);
    toast(`Got ${buying.item.name}!`, buying.item.emoji);
    setBuying(null);
  };

  return (
    <div className="screen stack">
      <div className="between">
        <h1>Turtbux Shop 🛍️</h1>
        <span className="chip gold">🪙 {formatNum(balance)}</span>
      </div>

      {/* daily deal */}
      <Card style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 35%, var(--surface)), var(--surface))" }}>
        <div className="between">
          <div className="row">
            <span style={{ fontSize: 34 }} aria-hidden>{deal.item.emoji}</span>
            <div>
              <span className="chip gold" style={{ fontSize: 11 }}>✨ Daily Deal · {Math.round((1 - deal.price / deal.item.price) * 100)}% off</span>
              <h3 style={{ margin: "4px 0 0" }}>{deal.item.name}</h3>
            </div>
          </div>
          {dealOwned ? (
            <span className="chip selected">✓ Owned</span>
          ) : (
            <button className="pill small" onClick={() => setBuying(deal)}>
              <s style={{ opacity: 0.6, marginRight: 6 }}>{deal.item.price}</s>{deal.price} 🪙
            </button>
          )}
        </div>
      </Card>

      <div className="row wrap gap8">
        {CATS.map((c) => (
          <button key={c.id} className={`chip ${cat === c.id ? "selected" : "outline"}`} onClick={() => { setCat(c.id); setOwnedOnly(false); }}>
            {c.emoji} {c.label}{countFor(c.id) ? ` ${countFor(c.id)}` : ""}
          </button>
        ))}
      </div>

      <div className="between">
        {cat === "shield" ? (
          <span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>🛡️ In your bag: {availableShields(shields)}</span>
        ) : <span />}
        {cat !== "shield" && (
          <button className={`chip ${ownedOnly ? "selected" : "outline"}`} aria-pressed={ownedOnly} onClick={() => setOwnedOnly((v) => !v)}>Owned only</button>
        )}
      </div>

      <div className="grid2">
        {items.map((item) => {
          const owned = !item.consumable && !!inventory[item.id];
          const equipped = owned && inventory[item.id].equipped;
          const previewBg = item.theme ? item.theme.primary : "color-mix(in srgb, var(--primary) 18%, var(--surface))";
          return (
            <Card key={item.id} className="tight">
              <div className="center" style={{ background: previewBg, borderRadius: 14, padding: "16px 0", fontSize: 34 }} aria-hidden>
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
                <PillButton small onClick={() => setBuying({ item, price: item.price })}>{item.price} 🪙</PillButton>
              )}
            </Card>
          );
        })}
        {items.length === 0 && <p className="muted center">Nothing here yet — go earn some Turtbux! 🐢</p>}
      </div>

      <ConfirmModal
        open={!!buying}
        emoji={buying?.item.emoji}
        title={`Buy ${buying?.item.name}?`}
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
