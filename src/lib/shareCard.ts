// Renders a shareable turtle card (PNG) on a canvas — no backend. Used by
// EntryDetail's "Share card" so a turtle can leave the pond as a cute image.

interface CardOpts {
  photoUrl?: string;
  name: string;
  dateLabel: string;
  streak: number;
  earned: number;
  badge?: string; // small emoji (mascot / state)
}

function roundRect(x: CanvasRenderingContext2D, rx: number, ry: number, w: number, h: number, r: number) {
  x.beginPath();
  x.moveTo(rx + r, ry);
  x.arcTo(rx + w, ry, rx + w, ry + h, r);
  x.arcTo(rx + w, ry + h, rx, ry + h, r);
  x.arcTo(rx, ry + h, rx, ry, r);
  x.arcTo(rx, ry, rx + w, ry, r);
  x.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // allow drawing remote (Storage) photos without tainting
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
    setTimeout(() => resolve(img.complete && img.naturalWidth ? img : null), 6000);
  });
}

/** Draw the card and return a PNG blob (or null if the canvas can't export). */
export async function makeTurtleCard(opts: CardOpts): Promise<Blob | null> {
  const W = 1080, H = 1350;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const x = cv.getContext("2d");
  if (!x) return null;

  // pastel pond background
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#cdeed8");
  g.addColorStop(1, "#eafaf0");
  x.fillStyle = g; x.fillRect(0, 0, W, H);

  // white clay card
  roundRect(x, 56, 72, W - 112, H - 150, 64);
  x.fillStyle = "#ffffff";
  x.shadowColor = "rgba(47,125,80,0.18)"; x.shadowBlur = 40; x.shadowOffsetY = 18;
  x.fill();
  x.shadowColor = "transparent"; x.shadowBlur = 0; x.shadowOffsetY = 0;

  // photo (cover-fit into a rounded square)
  const pad = 116, ps = W - pad * 2, py = 150;
  roundRect(x, pad, py, ps, ps, 44); x.save(); x.clip();
  const img = opts.photoUrl ? await loadImage(opts.photoUrl) : null;
  if (img && img.naturalWidth) {
    const scale = Math.max(ps / img.naturalWidth, ps / img.naturalHeight);
    const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
    try {
      x.drawImage(img, pad + (ps - dw) / 2, py + (ps - dh) / 2, dw, dh);
    } catch { /* tainted — fall through to placeholder */ }
  } else {
    x.fillStyle = "#dff1e6"; x.fillRect(pad, py, ps, ps);
    x.fillStyle = "#7cc99a"; x.font = "260px serif"; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText("🐢", W / 2, py + ps / 2);
  }
  x.restore();

  // text block
  x.textAlign = "left"; x.textBaseline = "alphabetic";
  const tx = pad, ty = py + ps + 96;
  x.fillStyle = "#2b4636";
  x.font = "800 64px ui-rounded, 'Segoe UI', system-ui, sans-serif";
  const name = (opts.name || "A lovely turtle").slice(0, 22);
  x.fillText(`${opts.badge ? opts.badge + " " : ""}${name}`, tx, ty);
  x.fillStyle = "#5f7d6f";
  x.font = "600 40px ui-rounded, 'Segoe UI', system-ui, sans-serif";
  x.fillText(opts.dateLabel, tx, ty + 58);

  // stat pills
  const pillY = ty + 110;
  const pill = (label: string, px: number): number => {
    x.font = "800 40px ui-rounded, 'Segoe UI', system-ui, sans-serif";
    const w = x.measureText(label).width + 56;
    roundRect(x, px, pillY, w, 76, 38); x.fillStyle = "#e7f5ec"; x.fill();
    x.fillStyle = "#2f7d50"; x.fillText(label, px + 28, pillY + 51);
    return px + w + 20;
  };
  let px = tx;
  px = pill(`🔥 ${opts.streak} day${opts.streak === 1 ? "" : "s"}`, px);
  if (opts.earned > 0) pill(`🪙 +${opts.earned}`, px);

  // footer brand
  x.fillStyle = "#2f7d50"; x.textAlign = "center";
  x.font = "800 44px ui-rounded, 'Segoe UI', system-ui, sans-serif";
  x.fillText("TurtWatch 🐢", W / 2, H - 70);

  return await new Promise<Blob | null>((resolve) => cv.toBlob((b) => resolve(b), "image/png", 0.95));
}

/** Share the card via the Web Share API, falling back to a download. */
export async function shareTurtleCard(opts: CardOpts): Promise<"shared" | "downloaded" | "failed"> {
  const blob = await makeTurtleCard(opts);
  if (!blob) return "failed";
  const file = new File([blob], "turtwatch-card.png", { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "My TurtWatch turtle 🐢" });
      return "shared";
    } catch {
      return "failed"; // user cancelled or share rejected
    }
  }
  // fallback: trigger a download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "turtwatch-card.png"; a.click();
  URL.revokeObjectURL(url);
  return "downloaded";
}
