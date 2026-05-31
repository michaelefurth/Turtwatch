// Turn a picked File into a storable, downscaled data URL. Object URLs (blob:)
// do NOT survive a reload, so we persist a compressed base64 JPEG instead and
// keep localStorage well under quota.

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function fileToStorableDataUrl(
  file: File,
  maxDim = 900,
  quality = 0.82,
): Promise<string> {
  const original = await readAsDataUrl(file);
  try {
    const img = await loadImage(original);
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return original; // non-image or canvas unavailable — keep as-is
  }
}
