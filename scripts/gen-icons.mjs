// Generates PWA PNG icons (192/512) from a simple turtle motif, with no image
// deps — a minimal hand-rolled PNG encoder (RGBA, zlib). Run: node scripts/gen-icons.mjs
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
};

function png(size) {
  const W = size, H = size;
  const px = Buffer.alloc(W * H * 4);
  const set = (x, y, r, g, b) => {
    x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return;
    const o = (y * W + x) * 4; px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = 255;
  };
  const disc = (ox, oy, rad, r, g, b) => {
    const r2 = rad * rad;
    for (let y = Math.floor(oy - rad); y <= oy + rad; y++)
      for (let x = Math.floor(ox - rad); x <= ox + rad; x++) {
        const dx = x - ox, dy = y - oy;
        if (dx * dx + dy * dy <= r2) set(x, y, r, g, b);
      }
  };
  // mint background
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) set(x, y, 0xbf, 0xe3, 0xc6);
  const cx = W / 2, cy = H / 2;
  // four little legs (kept inside the maskable safe zone)
  const legR = W * 0.075;
  for (const [sx, sy] of [[-0.27, -0.22], [0.27, -0.22], [-0.27, 0.22], [0.27, 0.22]])
    disc(cx + W * sx, cy + W * sy, legR, 0x6c, 0xc0, 0x90);
  disc(cx + W * 0.33, cy, W * 0.095, 0x6c, 0xc0, 0x90); // head
  disc(cx, cy, W * 0.30, 0x7c, 0xc9, 0x9a);             // shell
  disc(cx, cy, W * 0.13, 0x5f, 0xb5, 0x82);             // shell center
  disc(cx + W * 0.355, cy - W * 0.02, W * 0.018, 0x2b, 0x46, 0x36); // eye

  const raw = Buffer.alloc(H * (1 + W * 4));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 4)] = 0; // filter byte: none
    px.copy(raw, y * (1 + W * 4) + 1, y * W * 4, y * W * 4 + W * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

writeFileSync(new URL("../public/icon-192.png", import.meta.url), png(192));
writeFileSync(new URL("../public/icon-512.png", import.meta.url), png(512));
console.log("Wrote public/icon-192.png and public/icon-512.png");
