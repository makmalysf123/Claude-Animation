// OUR character art style (deliberately unlike the bridge cast): big round heads (~1:2.6 head:body), large oval eyes
// with a catchlight, rosy cheeks, thin even navy outline, rounded-rectangle torsos, sleeve-and-mitt arms,
// Indonesian outfits (batik pattern, peci, hijab, apron). Drawn on a 600 x 1000 canvas, soles at y = 975.
export const OUT = "#1c2340";
export type Hair = "short" | "peci" | "hijab" | "bun";
export type Look = {
  skin: string; hair: string; hairStyle: Hair; hijab?: string; shirt: string; pattern?: string; pants: string;
  apron?: string; moustache?: boolean; shoes?: string;
};
export type Expr = "neutral" | "smile" | "laugh" | "talk" | "surprised" | "sad" | "angry" | "chew";
export type Act = {
  expr: Expr; talk?: number; blink?: number; look?: number; armL?: number; armR?: number; seated?: boolean;
  holdR?: "plate" | "spoon" | "ladle" | "drumstick" | "bone" | "tray" | "chicken" | "coin" | null; chewT?: number; bob?: number; laughT?: number;
};
const LW = 8;
type G = CanvasRenderingContext2D;
const fs = (g: G, fill: string | null, lw = LW) => { if (fill) { g.fillStyle = fill; g.fill(); } if (lw) { g.lineWidth = lw; g.strokeStyle = OUT; g.lineJoin = "round"; g.stroke(); } };
const rr = (g: G, x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const ell = (g: G, x: number, y: number, rx: number, ry: number, a0 = 0, a1 = Math.PI * 2) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, a0, a1); };
const limb = (g: G, pts: [number, number][], w: number, fill: string) => {
  g.lineCap = "round"; g.lineJoin = "round";
  const path = () => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); };
  path(); g.strokeStyle = OUT; g.lineWidth = w + LW * 2; g.stroke();
  path(); g.strokeStyle = fill; g.lineWidth = w; g.stroke();
};
const shade = (c: string, k: number) => { const n = parseInt(c.slice(1), 16); const r = Math.round(((n >> 16) & 255) * k), gg = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k); return `rgb(${r},${gg},${b})`; };

// arm from shoulder: angle in degrees (0 = straight down, +90 = forward/out to the side, 150 = raised), elbow bends naturally
const arm = (g: G, sx: number, sy: number, ang: number, side: -1 | 1, sleeve: string, skin: string) => {
  const a = (ang * Math.PI) / 180, upper = 125, lower = 115, bend = 0.55 * side;
  const ex = sx + side * Math.sin(a) * upper, ey = sy + Math.cos(a) * upper;
  const hx = ex + side * Math.sin(a + bend * side) * lower, hy = ey + Math.cos(a + bend * side) * lower;
  limb(g, [[sx, sy], [ex, ey]], 62, sleeve);
  limb(g, [[ex, ey], [hx, hy]], 48, skin);
  ell(g, hx, hy, 30, 30); fs(g, skin);
  return [hx, hy] as const;
};

export const drawPerson = (g: G, L: Look, A: Act) => {
  g.clearRect(0, 0, 600, 1000);
  g.save();
  g.translate(0, A.bob ?? 0);
  const seated = !!A.seated, top = 470, bottom = seated ? 760 : 690;
  // legs + shoes
  if (!seated) {
    limb(g, [[255, 670], [250, 930]], 74, L.pants); limb(g, [[345, 670], [350, 930]], 74, L.pants);
    for (const x of [240, 360]) { ell(g, x, 950, 58, 28); fs(g, L.shoes ?? "#3b2a22"); }
  }
  // hijab back drape (behind the body)
  if (L.hairStyle === "hijab") { g.beginPath(); g.moveTo(150, 260); g.quadraticCurveTo(110, 520, 170, 560); g.lineTo(430, 560); g.quadraticCurveTo(490, 520, 450, 260); g.closePath(); fs(g, L.hijab!); }
  // arms behind? draw left arm first (behind torso when down)
  const sleeve = L.shirt;
  // torso
  rr(g, 175, top, 250, bottom - top, 70); fs(g, L.shirt);
  if (L.pattern) {
    g.save(); rr(g, 175, top, 250, bottom - top, 70); g.clip(); g.globalAlpha = 0.55;
    for (let y = top + 20; y < bottom; y += 46) for (let x = 180 + ((y / 46) % 2) * 23; x < 430; x += 46) { g.beginPath(); g.moveTo(x, y - 12); g.lineTo(x + 12, y); g.lineTo(x, y + 12); g.lineTo(x - 12, y); g.closePath(); g.fillStyle = L.pattern; g.fill(); }
    g.restore();
  }
  // side shade on the torso (light from the left)
  g.save(); rr(g, 175, top, 250, bottom - top, 70); g.clip(); g.fillStyle = "rgba(20,25,60,0.16)"; g.fillRect(345, top, 90, bottom - top); g.restore();
  rr(g, 175, top, 250, bottom - top, 70); fs(g, null);
  if (L.apron) { rr(g, 205, top + 90, 190, bottom - top - 80, 30); fs(g, L.apron, 6); g.beginPath(); g.moveTo(215, top + 95); g.lineTo(250, top + 20); g.moveTo(385, top + 95); g.lineTo(350, top + 20); g.lineWidth = 6; g.strokeStyle = OUT; g.stroke(); }
  // arms
  arm(g, 190, top + 40, A.armL ?? 8, -1, sleeve, L.skin);
  const [hx, hy] = arm(g, 410, top + 40, A.armR ?? 8, 1, sleeve, L.skin);
  if (A.holdR === "plate") { ell(g, hx + 10, hy - 20, 95, 30); fs(g, "#fbfbf6"); ell(g, hx + 10, hy - 34, 55, 26, Math.PI, Math.PI * 2); fs(g, "#fffdf2"); ell(g, hx + 40, hy - 40, 22, 12); fs(g, "#e8a33a", 5); }
  if (A.holdR === "spoon") { limb(g, [[hx, hy], [hx - 10, hy - 70]], 10, "#c9ccd2"); ell(g, hx - 12, hy - 82, 16, 22); fs(g, "#d8dbe0", 5); }
  if (A.holdR === "ladle") { limb(g, [[hx, hy], [hx + 30, hy - 120]], 12, "#7a5634"); }
  if (A.holdR === "drumstick" || A.holdR === "bone") {
    limb(g, [[hx - 6, hy + 4], [hx - 30, hy - 70]], 16, "#f4ecd8"); for (const d of [-9, 9]) { ell(g, hx - 32 + d, hy - 78, 12, 12); fs(g, "#f4ecd8", 5); }
    if (A.holdR === "drumstick") { g.save(); g.translate(hx + 8, hy + 40); g.rotate(-0.35); ell(g, 0, 0, 44, 62); fs(g, "#c8742e"); ell(g, -12, -16, 16, 22); fs(g, "#e9a35a", 0); g.restore(); ell(g, hx, hy, 30, 30); fs(g, L.skin); }
  }
  if (A.holdR === "tray") { rr(g, hx - 110, hy - 40, 170, 34, 10); fs(g, "#c9a36b"); for (let i = 0; i < 4; i++) { ell(g, hx - 88 + i * 42, hy - 52, 18, 22); fs(g, i % 2 ? "#fff6e6" : "#f3dcc0", 5); } }
  if (A.holdR === "chicken") { g.save(); g.translate(hx + 10, hy - 70); g.scale(0.55, 0.55); drawHenShape(g, 0, -1); g.restore(); ell(g, hx, hy, 30, 30); fs(g, L.skin); }
  if (A.holdR === "coin") { ell(g, hx + 4, hy - 40, 30, 30); fs(g, "#ffcf3f"); ell(g, hx + 4, hy - 40, 18, 18); fs(g, null, 4); }
  // neck + head
  rr(g, 270, 400, 60, 90, 20); fs(g, shade(L.skin, 0.9), 6);
  const cx = 300, cy = 255, R = 150;
  if (L.hairStyle === "hijab") { ell(g, cx, cy + 5, R + 28, R + 30); fs(g, L.hijab!); }
  ell(g, cx, cy, R, R * 0.98); fs(g, L.skin);
  // hair / hats
  if (L.hairStyle === "short" || L.hairStyle === "peci" || L.hairStyle === "bun") {
    g.beginPath(); g.ellipse(cx, cy - 8, R + 4, R - 6, 0, Math.PI * 1.02, Math.PI * 1.98);
    for (let i = 0; i <= 6; i++) { const x = cx + R - 8 - i * ((2 * R - 16) / 6); g.lineTo(x, cy - 70 + (i % 2) * 26); }
    g.closePath(); fs(g, L.hair);
  }
  if (L.hairStyle === "bun") { ell(g, cx, cy - R - 20, 52, 46); fs(g, L.hair); }
  if (L.hairStyle === "peci") { g.beginPath(); g.moveTo(cx - 118, cy - 88); g.lineTo(cx - 102, cy - 170); g.quadraticCurveTo(cx, cy - 192, cx + 102, cy - 170); g.lineTo(cx + 118, cy - 88); g.quadraticCurveTo(cx, cy - 104, cx - 118, cy - 88); fs(g, "#15161a"); }
  if (L.hairStyle === "hijab") { g.beginPath(); g.ellipse(cx, cy + 12, R - 14, R - 4, 0, Math.PI * 1.08, Math.PI * 1.92); g.lineTo(cx + R - 2, cy - 30); g.ellipse(cx, cy - 6, R + 22, R + 18, 0, -0.05, Math.PI + 0.05, true); g.closePath(); fs(g, L.hijab!, 0); }
  // face
  const look = (A.look ?? 0) * 10, blink = A.blink ?? 0, e = A.expr;
  const eyeY = cy + 10, eyeRx = 26, eyeRy = e === "surprised" ? 40 : 33;
  for (const ex of [cx - 58, cx + 58]) {
    if (e === "laugh") { g.beginPath(); g.arc(ex, eyeY + 10, 26, Math.PI * 1.1, Math.PI * 1.9); g.lineWidth = 9; g.strokeStyle = OUT; g.lineCap = "round"; g.stroke(); continue; }
    ell(g, ex, eyeY, eyeRx, eyeRy); fs(g, "#ffffff", 6);
    ell(g, ex + look, eyeY + 4, 15, 19); fs(g, "#2a1d16", 0);
    ell(g, ex + look + 6, eyeY - 4, 6, 6); fs(g, "#ffffff", 0); // catchlight
    if (blink > 0) { g.save(); ell(g, ex, eyeY, eyeRx + 4, eyeRy + 4); g.clip(); g.fillStyle = L.skin; g.fillRect(ex - 40, eyeY - eyeRy - 6, 80, (eyeRy * 2 + 8) * blink); g.restore(); if (blink > 0.8) { g.beginPath(); g.moveTo(ex - 24, eyeY + 4); g.quadraticCurveTo(ex, eyeY + 14, ex + 24, eyeY + 4); g.lineWidth = 7; g.strokeStyle = OUT; g.stroke(); } }
  }
  // brows
  const browUp = e === "surprised" ? -26 : e === "laugh" || e === "smile" ? -8 : 0;
  const inner = e === "sad" ? -22 : e === "angry" ? 20 : 0; // inner brow end: up = worried, down = angry
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 30, eyeY - 52 + browUp + inner); g.quadraticCurveTo(cx + s * 58, eyeY - 66 + browUp + inner * 0.4, cx + s * 86, eyeY - 56 + browUp - inner * 0.3); g.lineWidth = 9; g.strokeStyle = shade(L.hair, 0.8); g.lineCap = "round"; g.stroke(); }
  // cheeks
  g.globalAlpha = e === "laugh" ? 0.6 : 0.4; for (const s of [-1, 1]) { ell(g, cx + s * 92, eyeY + 50, 26, 15); fs(g, "#ff8a8a", 0); } g.globalAlpha = 1;
  if (L.moustache) { g.beginPath(); g.moveTo(cx - 48, cy + 78); g.quadraticCurveTo(cx, cy + 58, cx + 48, cy + 78); g.quadraticCurveTo(cx, cy + 70, cx - 48, cy + 78); fs(g, shade(L.hair, 0.9), 5); }
  // mouth
  const my = cy + 92;
  const openMouth = (w: number, h: number) => { ell(g, cx, my, w, h, 0, Math.PI); g.lineTo(cx - w, my); fs(g, "#7a2230", 6); ell(g, cx, my + h * 0.55, w * 0.55, h * 0.35, 0, Math.PI); fs(g, "#ef7d86", 0); };
  if (e === "laugh") openMouth(48, 44 + 8 * Math.sin((A.laughT ?? 0) * 1.6));
  else if (e === "surprised") { ell(g, cx, my + 8, 22, 28); fs(g, "#7a2230", 6); }
  else if (e === "talk") { const o = A.talk ?? 0; if (o > 0.15) openMouth(30, 8 + 26 * o); else { g.beginPath(); g.moveTo(cx - 26, my); g.quadraticCurveTo(cx, my + 12, cx + 26, my); g.lineWidth = 8; g.strokeStyle = OUT; g.stroke(); } }
  else if (e === "sad") { g.beginPath(); g.moveTo(cx - 34, my + 14); g.quadraticCurveTo(cx, my - 12, cx + 34, my + 14); g.lineWidth = 8; g.strokeStyle = OUT; g.lineCap = "round"; g.stroke(); }
  else if (e === "angry") { rr(g, cx - 40, my - 6, 80, 30, 12); fs(g, "#ffffff", 6); g.beginPath(); g.moveTo(cx - 38, my + 9); g.lineTo(cx + 38, my + 9); g.lineWidth = 4; g.strokeStyle = OUT; g.stroke(); }
  else if (e === "chew") { const c = Math.sin((A.chewT ?? 0) * 1.3); for (const s of [-1, 1]) { ell(g, cx + s * 62, my - 4, 26 + 6 * c, 20 + 4 * c); fs(g, shade(L.skin, 0.97), 0); } g.beginPath(); g.moveTo(cx - 24, my + 2 * c); g.quadraticCurveTo(cx, my + 16 + 6 * c, cx + 24, my + 2 * c); g.lineWidth = 8; g.strokeStyle = OUT; g.lineCap = "round"; g.stroke(); }
  else if (e === "smile") { g.beginPath(); g.moveTo(cx - 40, my - 6); g.quadraticCurveTo(cx, my + 30, cx + 40, my - 6); g.lineWidth = 8; g.strokeStyle = OUT; g.lineCap = "round"; g.stroke(); }
  else { g.beginPath(); g.moveTo(cx - 22, my + 4); g.lineTo(cx + 22, my + 4); g.lineWidth = 8; g.strokeStyle = OUT; g.stroke(); }
  g.restore();
};

// natural blinks: deterministic per character, 4-frame blink every 1.5-3.5 s
export const blinkAt = (f: number, seed: number) => {
  let t = 20 + (seed * 37) % 50;
  while (t < f) { const d = f - t; if (d < 4) return [0.5, 1, 1, 0.5][d]; t += 45 + Math.floor(((Math.sin(t * 12.9898 + seed) * 43758.5453) % 1 + 1) % 1 * 60); }
  return 0;
};
// talking mouth: syllable-like open/close
export const talkAt = (f: number, seed: number) => Math.max(0, Math.sin(f * 0.9 + seed) * 0.6 + Math.sin(f * 0.37 + seed * 2) * 0.5);

// ---------- chickens (same outline + palette as the cast) ----------
// hen body centred at (0,0) in a ~300 x 300 box; peck 0..1 lowers the head; dir -1 faces left, 1 right
export function drawHenShape(g: G, peck: number, dir: 1 | -1, body = "#fbf7ee", comb = "#e2453c") {
  g.save(); g.scale(dir, 1);
  limb(g, [[-22, 60], [-26, 120]], 10, "#f2a33a"); limb(g, [[22, 60], [26, 120]], 10, "#f2a33a");
  g.beginPath(); g.moveTo(-95, -10); g.lineTo(-150, -70); g.lineTo(-120, -2); g.lineTo(-160, -30); g.lineTo(-110, 30); g.closePath(); fs(g, body); // tail
  ell(g, 0, 10, 105, 72); fs(g, body);
  g.beginPath(); g.ellipse(-10, 18, 52, 32, -0.3, 0, Math.PI * 2); fs(g, shade(body.length === 7 ? body : "#fbf7ee", 0.9), 5); // wing
  const hx = 72 + peck * 30, hy = -62 + peck * 85;
  limb(g, [[50, -20], [hx, hy]], 46, body);
  ell(g, hx, hy, 40, 38); fs(g, body);
  g.beginPath(); g.moveTo(hx - 18, hy - 32); g.arc(hx - 8, hy - 40, 12, Math.PI, 0); g.arc(hx + 12, hy - 42, 12, Math.PI, 0); g.arc(hx + 28, hy - 34, 10, Math.PI, 0.3); g.closePath(); fs(g, comb, 5);
  g.beginPath(); g.moveTo(hx + 34, hy - 6); g.lineTo(hx + 62, hy + 4); g.lineTo(hx + 34, hy + 14); g.closePath(); fs(g, "#f2a33a", 5);
  ell(g, hx + 22, hy + 24, 8, 13); fs(g, comb, 4);
  ell(g, hx + 12, hy - 8, 7, 9); fs(g, OUT, 0);
  g.restore();
}
export function drawChick(g: G, hop: number, dir: 1 | -1) {
  g.save(); g.scale(dir, 1); g.translate(0, -hop * 14);
  limb(g, [[-12, 40], [-14, 70]], 7, "#f2a33a"); limb(g, [[12, 40], [14, 70]], 7, "#f2a33a");
  ell(g, 0, 10, 58, 50); fs(g, "#ffd84a"); ell(g, 34, -36, 34, 32); fs(g, "#ffd84a");
  g.beginPath(); g.moveTo(62, -40); g.lineTo(84, -32); g.lineTo(62, -24); g.closePath(); fs(g, "#f2a33a", 5);
  ell(g, 44, -42, 6, 8); fs(g, OUT, 0);
  g.restore();
}
