// Procedural PBR-ish textures for the world2 sets (reference look: stylised-real surfaces with visible grain, speckle,
// cracks and wear; never flat colour). Each maker paints an albedo + a height field into canvases; the height becomes
// a tangent-space normal map so the low sun rakes across the grain. Made once and cached.
import * as THREE from "three";

// ---------------- noise ----------------
const perm = new Uint8Array(512);
{ let s = 1337; const p = Array.from({ length: 256 }, (_, i) => i); for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; }
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const grad = (h: number, x: number, y: number) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
/** 2D gradient noise, tileable with period p (integer), returns about -1..1 */
export const noise2 = (x: number, y: number, p = 256) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const X0 = ((xi % p) + p) % p, Y0 = ((yi % p) + p) % p, X1 = (X0 + 1) % p, Y1 = (Y0 + 1) % p;
  const h = (a: number, b: number) => perm[(perm[a & 255] + b) & 255];
  const u = fade(xf), v = fade(yf);
  const n00 = grad(h(X0, Y0), xf, yf), n10 = grad(h(X1, Y0), xf - 1, yf), n01 = grad(h(X0, Y1), xf, yf - 1), n11 = grad(h(X1, Y1), xf - 1, yf - 1);
  return (n00 + (n10 - n00) * u + (n01 - n00) * v + (n00 - n10 - n01 + n11) * u * v) * 1.4;
};
/** fractal noise tiling over a canvas of `size` px with base cells `cells` */
export const fbm = (x: number, y: number, size: number, cells: number, oct = 5) => {
  let a = 0, amp = 0.5, f = cells / size, per = cells;
  for (let o = 0; o < oct; o++) { a += amp * noise2(x * f, y * f, per); f *= 2; per *= 2; amp *= 0.5; }
  return a;
};
let rs = 7; export const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };

// ---------------- helpers ----------------
type Px = (x: number, y: number) => [number, number, number, number]; // r,g,b (0-255), height 0..1
const hexRGB = (h: string): [number, number, number] => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mixC = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));

const cache = new Map<string, { map: THREE.Texture; normal: THREE.Texture }>();
/** paint albedo + height with a per-pixel function, derive the normal map (strength = bump) */
const bake = (key: string, size: number, px: Px, bump = 2.5, overlay?: (g: CanvasRenderingContext2D, hg: Float32Array) => void) => {
  const hit = cache.get(key); if (hit) return hit;
  const ca = document.createElement("canvas"); ca.width = ca.height = size; const ga = ca.getContext("2d")!;
  const img = ga.createImageData(size, size), H = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const [r, g, b, h] = px(x, y), i = (y * size + x) * 4;
    img.data[i] = clamp(r, 0, 255); img.data[i + 1] = clamp(g, 0, 255); img.data[i + 2] = clamp(b, 0, 255); img.data[i + 3] = 255; H[y * size + x] = h;
  }
  ga.putImageData(img, 0, 0);
  if (overlay) overlay(ga, H);
  const cn = document.createElement("canvas"); cn.width = cn.height = size; const gn = cn.getContext("2d")!, nimg = gn.createImageData(size, size);
  const at = (x: number, y: number) => H[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * bump, dy = (at(x, y + 1) - at(x, y - 1)) * bump, l = Math.hypot(dx, dy, 1), i = (y * size + x) * 4;
    nimg.data[i] = (-dx / l * 0.5 + 0.5) * 255; nimg.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; nimg.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; nimg.data[i + 3] = 255;
  }
  gn.putImageData(nimg, 0, 0);
  const map = new THREE.CanvasTexture(ca), normal = new THREE.CanvasTexture(cn);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const t of [map, normal]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
  const out = { map, normal }; cache.set(key, out); return out;
};

// ---------------- the textures ----------------
/** vertical wooden planks (teak / weathered): grain lines warped by noise, knots, dark gaps, per-plank tone */
export const woodPlanks = (base = "#7a4e2c", planks = 6, key = "wood") => bake(key + base + planks, 512, (x, y) => {
  const S = 512, pw = S / planks, k = Math.floor(x / pw), u = (x - k * pw) / pw, seed = k * 17.3;
  const tone = 0.85 + 0.3 * ((Math.sin(seed * 12.9898) * 43758.5453) % 1 + 1) % 1;
  const warp = fbm(x * 0.3 + seed * 40, y, S, 4, 3) * 0.6;
  const grain = Math.sin((u * 14 + warp + fbm(x, y * 0.05, S, 3, 2) * 2) * Math.PI) * 0.5 + 0.5, fine = fbm(x * 4 + seed, y * 0.25, S, 32, 3);
  const knotY = ((seed * 97) % S), kd = Math.hypot((u - 0.5) * pw, ((y - knotY + S) % S) - S / 2 * 0) ;
  const knot = Math.exp(-(kd * kd) / 60) * (k % 3 === 1 ? 1 : 0);
  const gap = u < 0.035 || u > 0.965 ? 1 : 0, wear = clamp(fbm(x, y, S, 6, 4) * 0.8 + 0.2);
  const c0 = hexRGB(base), dark: [number, number, number] = [c0[0] * 0.55, c0[1] * 0.5, c0[2] * 0.45], light: [number, number, number] = [Math.min(255, c0[0] * 1.25), Math.min(255, c0[1] * 1.2), Math.min(255, c0[2] * 1.1)];
  let c = mixC(dark, light, clamp(grain * 0.25 + fine * 0.2 + 0.45)); c = c.map((v) => v * tone) as typeof c;
  c = mixC(c, dark, knot * 0.6 + gap * 0.5); c = mixC(c, [c[0] * 1.1 + 12, c[1] * 1.1 + 10, c[2] * 1.05 + 8], wear * 0.15);
  return [c[0], c[1], c[2], 0.6 + grain * 0.12 + fine * 0.05 - gap * 0.6 - knot * 0.15];
}, 3);
/** packed dirt yard with pebbles, darker damp patches, a few dry grass blades */
export const dirt = () => bake("dirt", 512, (x, y) => {
  const S = 512, n = fbm(x, y, S, 8, 5), m = fbm(x + 300, y + 100, S, 3, 3), pebble = Math.max(0, fbm(x * 1.0 + 50, y, S, 48, 2) - 0.32) * 4;
  let c = mixC([128, 104, 82], [168, 142, 112], clamp(n * 0.7 + 0.5)); c = mixC(c, [98, 80, 62], clamp(m * 1.2 + 0.1) * 0.5);
  c = mixC(c, [205, 188, 160], clamp(pebble)); const sp = fbm(x * 3, y * 3, S, 64, 1) > 0.42 ? 1 : 0; c = mixC(c, [70, 52, 38], sp * 0.5);
  return [c[0], c[1], c[2], 0.5 + n * 0.25 + clamp(pebble) * 0.4];
}, 3.5);
/** lime plaster (foundation / lower wall): off-white, stains running down, hairline cracks */
export const plaster = (base = "#e3d8c2") => bake("plaster" + base, 512, (x, y) => {
  const S = 512, n = fbm(x, y, S, 6, 5), stain = clamp(fbm(x * 2, y * 0.35, S, 6, 3) + 0.1) * clamp(y / S * 1.3);
  const crack = Math.abs(fbm(x, y, S, 3, 4)) < 0.004 && fbm(x + 99, y, S, 2, 2) > 0.15 ? 1 : 0;
  let c = mixC(hexRGB(base), [150, 132, 110], stain * 0.45 + n * 0.08 + 0.04); c = mixC(c, [90, 78, 66], crack * 0.6);
  return [c[0], c[1], c[2], 0.5 + n * 0.15 - crack * 0.3];
}, 2.5);
/** clay roof tiles (genteng): overlapping rows, terracotta with burnt patches and moss in the overlaps */
export const rooftiles = () => bake("tiles", 512, (x, y) => {
  const S = 512, rows = 6, cols = 5, ry = (y / S) * rows, r = Math.floor(ry), v = ry - r, cx = (x / S) * cols + (r % 2) * 0.5, u = cx - Math.floor(cx);
  const curve = Math.sin(u * Math.PI), edge = v > 0.88 ? 1 : 0, n = fbm(x, y, S, 8, 4), moss = clamp(fbm(x + 77, y, S, 5, 3) * 1.6 - 0.2) * (v > 0.7 ? 1 : 0.2);
  let c = mixC([150, 66, 40], [196, 104, 62], clamp(curve * 0.6 + n * 0.4 + 0.2)); c = mixC(c, [92, 40, 28], (1 - curve) * 0.45 + edge * 0.6);
  c = mixC(c, [88, 98, 52], moss * 0.5);
  return [c[0], c[1], c[2], curve * 0.6 + (1 - v) * 0.3 - edge * 0.5 + n * 0.05];
}, 4);
/** split bamboo slats (bench, fence) */
export const bamboo = () => bake("bamboo", 256, (x, y) => {
  const S = 256, k = Math.floor((x / S) * 6), u = (x / S) * 6 - k, node = Math.abs(((y / S) * 3 + k * 0.37) % 1 - 0.5) < 0.02 ? 1 : 0;
  const n = fbm(x, y * 0.2, S, 16, 3), round = Math.sin(u * Math.PI);
  let c = mixC([150, 120, 62], [214, 186, 118], clamp(round * 0.7 + n * 0.3)); c = mixC(c, [110, 84, 40], node * 0.7 + (u < 0.05 || u > 0.95 ? 0.6 : 0));
  return [c[0], c[1], c[2], round * 0.5 + node * 0.2];
}, 3);
/** fired clay (pots, kendi) */
export const terracotta = () => bake("terra", 256, (x, y) => { const n = fbm(x, y, 256, 8, 5); const c = mixC([150, 74, 46], [198, 118, 74], clamp(n + 0.5)); return [c[0], c[1], c[2], 0.5 + n * 0.2]; }, 2);
/** rough stone (yard border, step) */
export const stone = () => bake("stone", 256, (x, y) => { const n = fbm(x, y, 256, 6, 5), sp = fbm(x * 4, y * 4, 256, 64, 1); let c = mixC([118, 112, 104], [178, 170, 158], clamp(n + 0.5)); c = mixC(c, [70, 66, 62], sp > 0.35 ? 0.6 : 0); return [c[0], c[1], c[2], 0.5 + n * 0.35]; }, 4);

// ---------------- alpha cards (leaves, grass) ----------------
const alphaTex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const hit = cache.get(key); if (hit) return hit.map;
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; cache.set(key, { map: t, normal: t }); return t;
};
/** banana leaf: long blade, midrib, parallel veins, torn edges, a dry brown tip */
export const bananaLeaf = () => alphaTex("banana", 256, 1024, (g) => {
  g.translate(128, 0);
  const edge = (s: number) => { g.beginPath(); g.moveTo(0, 1010); for (let y = 1000; y >= 10; y -= 10) { const w = Math.sin((1 - y / 1024) * Math.PI) ** 0.6 * 120; const tear = (Math.floor(y / 37) % 5 === 2 && s > 0) ? -40 : 0; g.lineTo(s * Math.max(4, w + tear), y); } g.lineTo(0, 0); };
  for (const s of [-1, 1]) { edge(s); g.closePath(); const gr = g.createLinearGradient(-120, 0, 120, 0); gr.addColorStop(0, "#3f7a2c"); gr.addColorStop(0.5, "#6aa83e"); gr.addColorStop(1, "#447f2e"); g.fillStyle = gr; g.fill(); }
  g.strokeStyle = "rgba(30,60,20,0.35)"; g.lineWidth = 1.2; for (let y = 40; y < 1000; y += 9) { g.beginPath(); g.moveTo(0, y); g.lineTo(-110 * Math.sin((1 - y / 1024) * Math.PI) ** 0.6, y - 30); g.moveTo(0, y); g.lineTo(110 * Math.sin((1 - y / 1024) * Math.PI) ** 0.6, y - 30); g.stroke(); }
  g.fillStyle = "#c9d98a"; g.fillRect(-4, 0, 8, 1024);
  g.globalCompositeOperation = "source-atop"; const tip = g.createLinearGradient(0, 0, 0, 220); tip.addColorStop(0, "rgba(140,100,50,0.9)"); tip.addColorStop(1, "rgba(140,100,50,0)"); g.fillStyle = tip; g.fillRect(-128, 0, 256, 220);
});
/** tuft of grass blades */
export const grassTuft = () => alphaTex("grass", 128, 128, (g) => {
  for (let i = 0; i < 26; i++) { const x0 = 64 + (rnd() - 0.5) * 50, lean = (rnd() - 0.5) * 50, h = 50 + rnd() * 70; g.beginPath(); g.moveTo(x0 - 2, 128); g.quadraticCurveTo(x0 + lean * 0.4, 128 - h * 0.6, x0 + lean, 128 - h); g.lineTo(x0 + 2, 128); g.closePath(); const c = [62 + rnd() * 50, 96 + rnd() * 50, 40 + rnd() * 20]; g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; g.fill(); }
});
/** sansevieria (lidah mertua) leaf */
export const snakeLeaf = () => alphaTex("snake", 64, 256, (g) => {
  g.beginPath(); g.moveTo(10, 256); g.quadraticCurveTo(0, 120, 32, 0); g.quadraticCurveTo(64, 120, 54, 256); g.closePath(); g.fillStyle = "#3d6b35"; g.fill();
  g.save(); g.clip(); for (let y = 0; y < 256; y += 14) { g.fillStyle = "rgba(170,200,120,0.35)"; g.fillRect(0, y, 64, 5); } g.strokeStyle = "#d8c95a"; g.lineWidth = 5; g.stroke(); g.restore();
});
/** soft light shaft (additive) */
export const shaftTex = () => alphaTex("shaft", 64, 256, (g) => { const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, "rgba(255,230,180,0)"); gr.addColorStop(0.5, "rgba(255,230,180,1)"); gr.addColorStop(1, "rgba(255,230,180,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); const v = g.createLinearGradient(0, 0, 0, 256); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(0.3, "rgba(0,0,0,1)"); v.addColorStop(1, "rgba(0,0,0,0.0)"); g.globalCompositeOperation = "destination-in"; g.fillStyle = v; g.fillRect(0, 0, 64, 256); });
/** batik curtain cloth */
export const curtain = () => bake("curtain", 256, (x, y) => { const k = Math.sin(x / 256 * Math.PI * 16) * 0.5 + 0.5, n = fbm(x, y, 256, 8, 3), m = (Math.floor(x / 32) + Math.floor(y / 32)) % 2; const c = mixC([222, 206, 176], [190, 150, 104], m * 0.15 + n * 0.12); return [c[0] * (0.85 + 0.15 * k), c[1] * (0.85 + 0.15 * k), c[2] * (0.85 + 0.15 * k), k * 0.6]; }, 2);
