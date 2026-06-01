import type { CSSProperties, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { DayState } from "@/types";

export function Card({ children, className = "", onClick, style }: { children: ReactNode; className?: string; onClick?: () => void; style?: CSSProperties }) {
  return (
    <div
      className={`card ${className}`}
      onClick={onClick}
      style={{ ...(onClick ? { cursor: "pointer" } : null), ...style }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

export function PillButton({
  children, onClick, variant = "primary", disabled, type = "button", small,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
  small?: boolean;
}) {
  return (
    <button
      type={type}
      className={`pill ${variant === "primary" ? "" : variant} ${small ? "small" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function TurtbuxChip({ balance, onClick }: { balance: number; onClick?: () => void }) {
  const nav = useNavigate();
  return (
    <button className="chip gold" onClick={onClick ?? (() => nav("/shop"))}>
      🪙 {formatNum(balance)} Turtbux
    </button>
  );
}

const STATE_META: Record<string, { label: string; emoji: string }> = {
  completed: { label: "Completed", emoji: "🐢" },
  repaired: { label: "Repaired", emoji: "🩹" },
  ai_rescued: { label: "AI Rescued", emoji: "✨" },
  shielded: { label: "Shielded", emoji: "🛡️" },
  missed: { label: "Napping", emoji: "😴" },
};

export function StateBadge({ state }: { state: DayState }) {
  const m = STATE_META[state] ?? { label: state, emoji: "🐢" };
  return (
    <span className={`badge st-${state}`} style={{ color: state === "missed" ? "var(--muted)" : "#fff" }}>
      {m.emoji} {m.label}
    </span>
  );
}

export function EmptyState({ emoji, title, sub }: { emoji: string; title: string; sub?: string }) {
  return (
    <div className="center stack" style={{ padding: "32px 12px", alignItems: "center" }}>
      <div style={{ fontSize: 52 }}>{emoji}</div>
      <h2 style={{ margin: 0 }}>{title}</h2>
      {sub && <p className="muted" style={{ margin: 0, maxWidth: 280 }}>{sub}</p>}
    </div>
  );
}

/** A turtle photo with an optional equipped frame class + sticker overlay. */
export function TurtlePhoto({
  src, frameClass = "", sticker, size, radius = 16, style,
}: {
  src: string;
  frameClass?: string;
  sticker?: string;
  size?: number;
  radius?: number;
  style?: CSSProperties;
}) {
  return (
    <span className="photo-wrap" style={{ width: size, ...style }}>
      <img src={src} alt="" aria-hidden loading="lazy" decoding="async" className={frameClass} style={{ width: size ?? "100%", height: size, aspectRatio: size ? undefined : "1", objectFit: "cover", borderRadius: radius, display: "block" }} />
      {sticker && <span className="sticker-badge" aria-hidden>{sticker}</span>}
    </span>
  );
}

export function formatNum(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}
