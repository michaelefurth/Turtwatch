/** A baby turtle wearing an outfit emoji — the visual for a hatchling. */
export function Critter({ outfit, size = 40 }: { outfit: string; size?: number }) {
  return (
    <span style={{ position: "relative", fontSize: size, lineHeight: 1, display: "inline-block" }} aria-hidden>
      🐢
      <span style={{ position: "absolute", top: -size * 0.18, right: -size * 0.22, fontSize: size * 0.5 }}>{outfit}</span>
    </span>
  );
}
