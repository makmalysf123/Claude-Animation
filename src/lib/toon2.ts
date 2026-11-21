// toon2 v2: character drawing matched to the reference at full resolution (docs/style-references/frame-by-frame-mine-salting.md,
// frames 22, 52, 216, 461, 789, 1053, 1100, 1636):
//   - big white head (diameter ~1.5x body width), plum-dark outline ~6% of the head radius, COOL lilac-grey form shade low
//     on the head and down the right edge; hair shows under the hat at the sides
//   - every eye and brow is independent (wink, one squinting, one brow up); many eye kinds; lids are straight lines that
//     can tilt (angry / sad)
//   - ~16 mouth kinds, sized/offset/tilted per frame (crescent toothy grin, D talk with top teeth + tongue, zigzag scared
//     teeth, clenched teeth, laugh, smirk to one side, pursed, wavy ...)
//   - bean body that bends and squashes, realistic cloth inside (plaid weave, knit, batik), darker toward its edges
//   - thick noodle arms WITH elbows, big dark ball hands, legs WITH knees and little feet
//   - hat is its own object (offset, tilt, squash) and sits INTO the head
// Design space 600 x 1000, soles at y = 975 (same as the ayam cards).

export const OUTLINE = "#2b1a26";
const MOUTH_IN = "#4a1824", TONGUE = "#e2687a", TEETH = "#fbf8f1", SHADE = "150,138,182";
const FEAT = "#3a2f36"; // eyes, brows (reference Kyle/Spot close-ups: soft dark grey-plum)

export type EyeKind = "open" | "big" | "round" | "shock" | "closed" | "happy" | "squeeze" | "spiral" | "sad";
export type Eye = { kind: EyeKind; lid?: number; lidAng?: number; low?: number; size?: number; px?: number; py?: number };
export type Brow = { dy: number; ang: number; arch?: number; hide?: boolean };
export type MouthKind = "pout" | "stadium" | "line" | "m" | "smile" | "smileBig" | "smirk" | "frown" | "talkD" | "talkO" | "o" | "oo" | "wide" | "clench"
  | "zigzag" | "laugh" | "tongue" | "wavy";
export type Mouth = { kind: MouthKind; open: number; w?: number; dx?: number; tilt?: number };
export type Limb = { a: [number, number]; b: [number, number] }; // arm: a = elbow, b = hand (relative to the shoulder); leg: a = knee (rel. hip), b = foot offset

export type CharSpec = {
  R: number; bodyW: number; bodyH: number; legLen: number;
  skin: string; hair?: { color: string; style: "short" | "bun" | "fringe" | "long" };
  moustache?: "thin" | "handlebar"; moustacheColor?: string; lashes?: boolean;
  hat?: "peci" | "cap" | "none"; hatColor?: string; rim?: string;
  /** hand-drawn head shape (reference: never a perfect circle): n = squareness (2 = ellipse, 2.6 = rounded box),
   *  nTop/nBot = roundness of the upper/lower half (2 round, 3+ flat and straight-sided), egg > 0 widens the jaw */
  head?: { bTop?: number; bBot?: number; nTop?: number; nBot?: number; drift?: number };
  cloth: { top: string; pattern?: "knit" | "batik" | "stripe"; patternCol?: string; bottom?: string; bottomFrom?: number; plaid?: [string, string, string]; collar?: "round" | "v"; buttons?: number };
};
export type Pose = {
  x: number; bob: number;
  body: { lean: number; bend: number; sx: number; sy: number };
  head: { dx: number; dy: number; rot: number; sx: number; sy: number; turn: number };
  eyes: [Eye, Eye]; brows: [Brow, Brow]; mouth: Mouth;
  arms: [Limb, Limb]; armBehind?: [boolean, boolean]; legs: [Limb, Limb];
  hat: { dx: number; dy: number; rot: number; sy: number };
  sweat?: number; blush?: number;
  /** direction (canvas radians: 0 right, pi/2 down) of the THICK side of the ink line, usually away from the key light */
  ink?: number;
};

// ---------------- cloth textures (made once) ----------------
const pats = new Map<string, CanvasPattern>();
const pat = (g: CanvasRenderingContext2D, key: string, size: number, draw: (c: CanvasRenderingContext2D) => void) => {
  let p = pats.get(key); if (!p) { seedN = 1 + [...key].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 233280, 7); const c = document.createElement("canvas"); c.width = c.height = size; draw(c.getContext("2d")!); p = g.createPattern(c, "repeat")!; pats.set(key, p); } return p;
};
let seedN = 1; const rnd = () => { seedN = (seedN * 9301 + 49297) % 233280; return seedN / 233280; };
const weave = (c: CanvasRenderingContext2D, n: number, a: number) => { // fine thread noise so cloth reads as fabric up close
  for (let y = 0; y < n; y += 2) { c.fillStyle = `rgba(0,0,0,${a})`; c.fillRect(0, y, n, 1); }
  for (let i = 0; i < n * 3; i++) { c.fillStyle = `rgba(${rnd() > 0.5 ? "255,255,255" : "0,0,0"},${a * 1.2})`; c.fillRect(rnd() * n, rnd() * n, 2, 1); }
};
const plaidPat = (a: string, b: string, l: string) => (c: CanvasRenderingContext2D) => {
  c.fillStyle = a; c.fillRect(0, 0, 96, 96);
  c.globalAlpha = 0.5; c.fillStyle = b; c.fillRect(0, 30, 96, 22); c.fillRect(30, 0, 22, 96);
  c.globalAlpha = 0.35; c.fillStyle = "#000"; c.fillRect(0, 36, 96, 8); c.fillRect(36, 0, 8, 96);
  c.globalAlpha = 0.6; c.fillStyle = l; c.fillRect(0, 74, 96, 3); c.fillRect(74, 0, 3, 96);
  c.globalAlpha = 1; weave(c, 96, 0.06);
};
const knitPat = (base: string) => (c: CanvasRenderingContext2D) => {
  c.fillStyle = base; c.fillRect(0, 0, 64, 64);
  for (let x = 0; x < 64; x += 4) { c.fillStyle = "rgba(0,0,0,0.07)"; c.fillRect(x, 0, 1.6, 64); c.fillStyle = "rgba(255,255,255,0.06)"; c.fillRect(x + 2, 0, 1, 64); }
  weave(c, 64, 0.035);
};
const batikPat = (base: string, inkc: string) => (c: CanvasRenderingContext2D) => { // kawung: four-petal ovals on a grid
  c.fillStyle = base; c.fillRect(0, 0, 80, 80); c.strokeStyle = inkc; c.fillStyle = inkc; c.lineWidth = 2.2;
  for (const [x, y] of [[0, 0], [80, 0], [0, 80], [80, 80], [40, 40]]) for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4; c.beginPath(); c.ellipse(x + Math.cos(a) * 14, y + Math.sin(a) * 14, 12, 6.5, a, 0, Math.PI * 2); c.globalAlpha = 0.55; c.fill(); c.globalAlpha = 1; c.stroke();
  }
  for (const [x, y] of [[40, 0], [0, 40], [80, 40], [40, 80]]) { c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); c.fill(); }
  weave(c, 80, 0.05);
};
const stripePat = (base: string, s: string) => (c: CanvasRenderingContext2D) => { c.fillStyle = base; c.fillRect(0, 0, 32, 32); c.fillStyle = s; c.globalAlpha = 0.35; c.fillRect(0, 0, 2, 32); c.fillRect(16, 0, 1, 32); c.globalAlpha = 1; weave(c, 32, 0.05); };
const velvetPat = (c: CanvasRenderingContext2D) => { c.fillStyle = "#1d1a23"; c.fillRect(0, 0, 48, 48); for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(255,255,255,${0.015 + rnd() * 0.045})`; c.fillRect(rnd() * 48, rnd() * 48, 1.5, 1.5); } };

// ---------------- primitives ----------------
type P = [number, number];
const ell = (g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0, a0 = 0, a1 = Math.PI * 2) => { g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, a0, a1); };
const ink = (g: CanvasRenderingContext2D, w: number, col = OUTLINE) => { g.lineWidth = w; g.strokeStyle = col; g.lineCap = "round"; g.lineJoin = "round"; g.stroke(); };
const fill = (g: CanvasRenderingContext2D, c: string | CanvasPattern | CanvasGradient) => { g.fillStyle = c; g.fill(); };
const poly = (g: CanvasRenderingContext2D, pts: P[], close = false) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); if (close) g.closePath(); };
/** smooth limb through three points (shoulder/hip -> elbow/knee -> hand/foot) */
const limb = (g: CanvasRenderingContext2D, a: P, m: P, b: P, w: number) => {
  g.beginPath(); g.moveTo(...a);
  const c1: P = [m[0] - (b[0] - a[0]) * 0.18, m[1] - (b[1] - a[1]) * 0.18], c2: P = [m[0] + (b[0] - a[0]) * 0.18, m[1] + (b[1] - a[1]) * 0.18];
  g.quadraticCurveTo(c1[0], c1[1], m[0], m[1]); g.quadraticCurveTo(c2[0], c2[1], b[0], b[1]); ink(g, w);
};
const ballHand = (g: CanvasRenderingContext2D, x: number, y: number, r: number) => {
  const gr = g.createRadialGradient(x - 0.35 * r, y - 0.4 * r, 0.05 * r, x, y, r);
  gr.addColorStop(0, "#5e4a58"); gr.addColorStop(0.5, OUTLINE); gr.addColorStop(1, "#150b12"); ell(g, x, y, r, r); fill(g, gr);
};

// ---------------- face ----------------
const drawEye = (g: CanvasRenderingContext2D, e: Eye, x: number, y: number, R: number, side: number, skin: string) => {
  const s = e.size ?? 1, rx = 0.088 * R * s, ry = 0.124 * R * s, w = 0.05 * R;
  const ex = x + (e.px ?? 0) * 0.07 * R, ey = y + (e.py ?? 0) * 0.045 * R;
  switch (e.kind) {
    case "open": case "big": case "sad": {
      const k = e.kind === "big" ? 1.22 : 1, lid = e.lid ?? 0, low = e.low ?? 0;
      if (lid + low >= 0.92) { poly(g, [[x - 0.12 * R, y], [x + 0.12 * R, y + side * (e.lidAng ?? 0) * 0.1 * R]]); ink(g, w); break; }
      { const gr = g.createRadialGradient(ex - rx * 0.25, ey - ry * 0.3, 0, ex, ey, ry * k); gr.addColorStop(0, "#5a4e55"); gr.addColorStop(1, FEAT); ell(g, ex, ey, rx * k, ry * k); fill(g, gr); }
      if (lid > 0.02 || e.kind === "sad") { // top lid: skin wipes the top part, a straight (tilted) lid line sits on it
        const ang = (e.lidAng ?? 0) + (e.kind === "sad" ? -0.35 : 0), ly = ey - ry * k + 2 * ry * k * Math.max(lid, e.kind === "sad" ? 0.3 : 0);
        const dx = 0.15 * R, dy = side * Math.tan(ang) * dx; // ang > 0: inner end lower (angry)
        g.save(); ell(g, ex, ey, rx * k * 1.2, ry * k * 1.2); g.clip(); poly(g, [[x - dx * 2, ly + dy * 2], [x + dx * 2, ly - dy * 2], [x + dx * 2, ly - 3 * R], [x - dx * 2, ly - 3 * R]], true); fill(g, skin); g.restore();
        poly(g, [[x - dx, ly + dy], [x + dx, ly - dy]]); ink(g, 0.062 * R, FEAT);
      }
      if (low > 0.02) { // bottom lid (squint), slightly curved
        const by = ey + ry * k - 2 * ry * k * low;
        g.save(); ell(g, ex, ey, rx * k * 1.2, ry * k * 1.2); g.clip(); g.fillStyle = skin; g.fillRect(x - R, by, 2 * R, R); g.restore();
        g.beginPath(); g.moveTo(x - 0.12 * R, by + 0.01 * R); g.quadraticCurveTo(x, by - 0.025 * R, x + 0.12 * R, by + 0.01 * R); ink(g, w * 0.8);
      }
      break;
    }
    case "round": case "shock": {
      const r = (e.kind === "shock" ? 0.17 : 0.135) * R * s, pr = (e.kind === "shock" ? 0.035 : 0.055) * R;
      ell(g, x, y, r, r * 1.04); fill(g, "#ffffff"); ink(g, 0.04 * R);
      ell(g, x + (e.px ?? 0) * 0.45 * r, y + (e.py ?? 0) * 0.4 * r, pr, pr * 1.1); fill(g, OUTLINE);
      if ((e.lid ?? 0) > 0.05) { const ly = y - r + 2 * r * (e.lid ?? 0); g.save(); ell(g, x, y, r * 1.1, r * 1.1); g.clip(); g.fillStyle = skin; g.fillRect(x - r * 1.2, y - r * 1.3, r * 2.4, ly - (y - r * 1.3)); g.restore(); poly(g, [[x - r * 1.05, ly], [x + r * 1.05, ly]]); ink(g, 0.04 * R); }
      break;
    }
    case "closed": g.beginPath(); g.moveTo(x - 0.11 * R, y); g.quadraticCurveTo(x, y + 0.04 * R, x + 0.11 * R, y); ink(g, w); break;
    case "happy": g.beginPath(); g.moveTo(x - 0.11 * R, y + 0.035 * R); g.quadraticCurveTo(x, y - 0.09 * R, x + 0.11 * R, y + 0.035 * R); ink(g, w * 1.1); break;
    case "squeeze": poly(g, [[x + side * 0.1 * R, y - 0.085 * R], [x - side * 0.075 * R, y], [x + side * 0.1 * R, y + 0.085 * R]]); ink(g, w); break;
    case "spiral": { g.beginPath(); for (let t = 0; t < 26; t++) { const a = t * 0.55, r = t * 0.0055 * R; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ink(g, w * 0.6); break; }
  }
};
const drawBrow = (g: CanvasRenderingContext2D, b: Brow, x: number, y: number, R: number, side: number) => {
  // reference brows (Kyle f156, Spot f30): thick tapered bars ~0.36 x the half-width long, bowed (banana) or bent
  // (angry), rounded ends, soft dark grey-plum
  if (b.hide) return;
  const L = 0.17 * R, by = y + b.dy * R, c = Math.cos(b.ang), s = Math.sin(b.ang), arch = (0.035 + (b.arch ?? 0)) * R;
  const ix = x - side * L * c, iy = by - L * s, ox = x + side * L * c, oy = by + L * s; // ang > 0: inner end up (worried)
  const mx = (ix + ox) / 2 - side * 0.02 * R, my = (iy + oy) / 2 - arch, N = 16, top: P[] = [], bot: P[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, px = (1 - t) ** 2 * ix + 2 * (1 - t) * t * mx + t * t * ox, py = (1 - t) ** 2 * iy + 2 * (1 - t) * t * my + t * t * oy;
    const dx = 2 * (1 - t) * (mx - ix) + 2 * t * (ox - mx), dy = 2 * (1 - t) * (my - iy) + 2 * t * (oy - my), l = Math.hypot(dx, dy) || 1;
    const w = R * (0.026 + 0.022 * Math.sin(Math.PI * Math.min(1, t * 1.15))); // thickest a bit toward the inner end, tapers out
    top.push([px - (dy / l) * w, py + (dx / l) * w]); bot.push([px + (dy / l) * w, py - (dx / l) * w]);
  }
  g.beginPath(); top.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); bot.reverse().forEach(([px, py]) => g.lineTo(px, py)); g.closePath();
  g.fillStyle = FEAT; g.fill(); g.lineJoin = "round"; g.lineWidth = 0.018 * R; g.strokeStyle = FEAT; g.stroke();
};
const teethLines = (g: CanvasRenderingContext2D, x0: number, x1: number, y0: number, y1: number, n: number, R: number) => { for (let i = 1; i < n; i++) { const x = x0 + ((x1 - x0) * i) / n; poly(g, [[x, y0], [x, y1]]); ink(g, 0.013 * R); } };
const drawMouth = (g: CanvasRenderingContext2D, m: Mouth, R: number, skin: string) => {
  const o = Math.max(0, Math.min(1.4, m.open)), W = m.w ?? 1, lw = 0.05 * R;
  const inside = (path: () => void, top: number, bottom: number, hw: number, teethTop: boolean, teethBot: boolean, tongue: boolean) => {
    path(); fill(g, MOUTH_IN); g.save(); path(); g.clip();
    if (teethTop) { g.fillStyle = TEETH; g.fillRect(-hw * 1.2, top - 0.2 * R, hw * 2.4, 0.2 * R + 0.055 * R); teethLines(g, -hw, hw, top - 0.02 * R, top + 0.055 * R, 6, R); }
    if (teethBot) { g.fillStyle = TEETH; g.fillRect(-hw * 1.2, bottom - 0.05 * R, hw * 2.4, 0.2 * R); teethLines(g, -hw, hw, bottom - 0.05 * R, bottom + 0.02 * R, 6, R); }
    if (tongue) { ell(g, 0.02 * R, bottom + 0.005 * R, hw * 0.55, 0.06 * R + 0.02 * R * o); fill(g, TONGUE); poly(g, [[0.02 * R, bottom - 0.04 * R], [0.02 * R, bottom]]); ink(g, 0.012 * R, "#b44a5c"); }
    g.restore(); path(); ink(g, 0.04 * R);
  };
  switch (m.kind) {
    case "pout": { // small rounded dark triangle (reference Spot f30)
      g.beginPath(); g.moveTo(-0.07 * R * W, -0.005 * R); g.quadraticCurveTo(0, -0.04 * R, 0.07 * R * W, 0.0); g.quadraticCurveTo(0.03 * R, 0.035 * R, -0.01 * R, 0.03 * R); g.quadraticCurveTo(-0.06 * R, 0.022 * R, -0.07 * R * W, -0.005 * R); g.closePath(); fill(g, FEAT);
      g.beginPath(); g.moveTo(-0.045 * R, -0.012 * R); g.quadraticCurveTo(0, -0.03 * R, 0.045 * R, -0.008 * R); ink(g, 0.008 * R, "rgba(255,255,255,0.25)"); break; }
    case "stadium": { // open talking mouth: rounded slot with a thick dark rim, dark-red inside, a pink tongue glint (Kyle f156)
      const hw = 0.2 * R * W, h = 0.035 * R + 0.075 * R * o, path = () => { g.beginPath(); g.roundRect(-hw, -h, 2 * hw, 2 * h, h); };
      path(); fill(g, MOUTH_IN); g.save(); path(); g.clip();
      if (o > 0.35) { g.fillStyle = TEETH; g.fillRect(-hw, -h - 2, 2 * hw, h * 0.42); }
      ell(g, 0.02 * R, h * 0.62, hw * 0.45, h * 0.32); fill(g, "rgba(226,104,122,0.85)");
      g.restore(); path(); ink(g, 0.07 * R, FEAT); break; }
    case "line": g.beginPath(); g.moveTo(-0.11 * R * W, 0); g.quadraticCurveTo(0, 0.015 * R, 0.11 * R * W, -0.006 * R); ink(g, lw); break;
    case "m": poly(g, [[-0.07 * R * W, 0], [0.07 * R * W, 0]]); ink(g, lw * 1.2); break;
    case "smile": g.beginPath(); g.moveTo(-0.13 * R * W, -0.035 * R); g.quadraticCurveTo(0, 0.08 * R + 0.04 * R * o, 0.13 * R * W, -0.035 * R); ink(g, lw); break;
    case "smirk": g.beginPath(); g.moveTo(-0.1 * R * W, 0.005 * R); g.quadraticCurveTo(0.03 * R, 0.045 * R, 0.13 * R * W, -0.05 * R); ink(g, lw); break;
    case "frown": g.beginPath(); g.moveTo(-0.11 * R * W, 0.03 * R); g.quadraticCurveTo(0, -0.06 * R, 0.11 * R * W, 0.03 * R); ink(g, lw); break;
    case "wavy": { g.beginPath(); for (let i = 0; i <= 12; i++) { const t = i / 12; g.lineTo((-0.13 + 0.26 * t) * R * W, 0.016 * R * Math.sin(t * Math.PI * 4)); } ink(g, lw * 0.9); break; }
    case "o": ell(g, 0, 0.01 * R, 0.045 * R * W, 0.05 * R + 0.03 * R * o); fill(g, OUTLINE); break;
    case "oo": ell(g, 0, 0.01 * R, 0.05 * R * W, 0.045 * R); fill(g, MOUTH_IN); ink(g, 0.045 * R); break;
    case "talkO": { const hw = 0.1 * R * W, d = 0.07 * R + 0.12 * R * o; inside(() => ell(g, 0, d * 0.35, hw, d * 0.65 + 0.02 * R), -d * 0.3, d, hw, o > 0.5, false, true); break; }
    case "talkD": { // flat top with the upper teeth, round bottom, tongue
      const hw = 0.16 * R * W, d = 0.05 * R + 0.15 * R * o;
      inside(() => { g.beginPath(); g.moveTo(-hw, -0.02 * R); g.quadraticCurveTo(0, -0.04 * R, hw, -0.02 * R); g.bezierCurveTo(hw, d * 0.8, hw * 0.45, d, 0, d); g.bezierCurveTo(-hw * 0.45, d, -hw, d * 0.8, -hw, -0.02 * R); g.closePath(); }, -0.03 * R, d, hw, true, o > 1.05, true); break;
    }
    case "smileBig": { // crescent grin with a top row of teeth (reference f461)
      const hw = 0.24 * R * W, d = 0.12 * R + 0.06 * R * o;
      inside(() => { g.beginPath(); g.moveTo(-hw, -0.05 * R); g.quadraticCurveTo(0, 0.02 * R, hw, -0.05 * R); g.quadraticCurveTo(hw * 0.7, d * 1.1, 0, d); g.quadraticCurveTo(-hw * 0.7, d * 1.1, -hw, -0.05 * R); g.closePath(); }, -0.02 * R, d, hw, true, false, o > 0.6); break;
    }
    case "laugh": { const hw = 0.22 * R * W, d = 0.12 * R + 0.14 * R * o;
      inside(() => { g.beginPath(); g.moveTo(-hw, -0.04 * R); g.quadraticCurveTo(0, -0.02 * R, hw, -0.04 * R); g.bezierCurveTo(hw, d, hw * 0.4, d * 1.1, 0, d * 1.1); g.bezierCurveTo(-hw * 0.4, d * 1.1, -hw, d, -hw, -0.04 * R); g.closePath(); }, -0.04 * R, d * 1.05, hw, true, false, true); break; }
    case "wide": case "clench": { // rows of teeth (wide: open gap; clench: shut)
      const hw = (m.kind === "wide" ? 0.22 : 0.19) * R * W, h = (m.kind === "wide" ? 0.055 + 0.04 * o : 0.055) * R;
      const path = () => { g.beginPath(); g.roundRect(-hw, -h, 2 * hw, 2 * h, m.kind === "wide" ? h * 0.9 : h * 0.35); };
      path(); fill(g, TEETH); g.save(); path(); g.clip(); teethLines(g, -hw, hw, -h, h, 7, R);
      if (m.kind === "wide" && o > 0.25) { g.fillStyle = MOUTH_IN; g.fillRect(-hw, -0.012 * R * o, 2 * hw, 0.03 * R * o); } else { poly(g, [[-hw, 0], [hw, 0]]); ink(g, 0.013 * R); }
      g.restore(); path(); ink(g, 0.04 * R); break;
    }
    case "zigzag": { // scared grimace: dark mouth with jagged teeth (reference f1636)
      const hw = 0.25 * R * W, h = 0.06 * R + 0.04 * R * o;
      const path = () => { g.beginPath(); g.moveTo(-hw, 0); g.quadraticCurveTo(0, -h * 1.6, hw, 0); g.quadraticCurveTo(0, h * 1.8, -hw, 0); g.closePath(); };
      path(); fill(g, MOUTH_IN); g.save(); path(); g.clip(); g.beginPath();
      for (let i = 0; i <= 10; i++) { const x = -hw + (2 * hw * i) / 10; g.lineTo(x, i % 2 ? h * 0.6 : -h * 0.6); }
      g.lineTo(hw, h); g.lineTo(-hw, h); g.closePath(); g.fillStyle = TEETH; g.fill(); g.restore(); path(); ink(g, 0.04 * R); break;
    }
    case "tongue": drawMouth(g, { kind: "smile", open: 0, w: W }, R, skin); ell(g, 0.05 * R, 0.08 * R, 0.05 * R, 0.075 * R, 0.2); fill(g, TONGUE); ink(g, 0.03 * R); break;
  }
};

// ---------------- head shapes and brush ink ----------------
/** head contour around (0, 0). Clean confident curves, no wobble (reference f22, f461, f1053, f1100, f1250):
 *  the upper and lower halves have their own roundness (nTop 3+ = flat top / straight sides like the sheriff's "U",
 *  2 = round), w/h set the proportions, egg > 0 widens the lower half, < 0 the upper half. */
const headPts = (R: number, H: NonNullable<CharSpec["head"]>): P[] => {
  // measured on hatless RicksClips3000 heads (scripts/headwidth.py: Kyle, Spot, waiter): R = half-width at the eye
  // line (the widest row); crown 0.9 R above it, chin ~1.0 R below (slightly wider than tall); the lower half follows
  // a superellipse n 1.95-2.25 (Kyle tapers, Spot is blunter); the chin drifts 6-12 % sideways (always screen-left).
  const bT = H.bTop ?? 0.9, bB = H.bBot ?? 1.0, nT = H.nTop ?? 2.05, nB = H.nBot ?? 2.1, drift = H.drift ?? -0.09, pts: P[] = [];
  for (let i = 0; i < 180; i++) {
    const t = (i / 180) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    const low = s > 0 ? 1 : 0, n = low ? nB : nT, b = low ? bB : bT; // canvas y down: s > 0 is the lower half
    let x = Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * R; const y = Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * R * b;
    if (low) x += drift * R * Math.pow(s, 2.5);
    pts.push([x, y]);
  }
  return pts;
};
/** brush ink as a smooth silhouette pushed OUT of the shape: drawn before the shape's own fill, so the visible line
 *  is the rim between the two. Width swells smoothly toward `ang` (the shadow side). Outward normals come from the
 *  polygon's winding, so they never flip from frame to frame. */
const inkSil = (g: CanvasRenderingContext2D, pts: P[], thin: number, thick: number, ang: number) => {
  if (pts.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) throw new Error("inkSil: non-finite contour");
  const n = pts.length; let area = 0; for (let i = 0; i < n; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n]; area += x0 * y1 - x1 * y0; }
  const sgn = area > 0 ? 1 : -1, cx = pts.reduce((a, p) => a + p[0], 0) / n, cy = pts.reduce((a, p) => a + p[1], 0) / n;
  const out: P[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 2 + n) % n], p1 = pts[(i + 2) % n], [x, y] = pts[i];
    let nx = (p1[1] - p0[1]) * sgn, ny = -(p1[0] - p0[0]) * sgn; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const a = Math.atan2(y - cy, x - cx), k = 0.5 + 0.5 * Math.cos(a - ang); // 0 on the lit side .. 1 on the shadow side
    const kk = k * k * (3 - 2 * k), w = thin + (thick - thin) * Math.pow(kk, 1.3);
    out.push([x + nx * w, y + ny * w]);
  }
  g.beginPath(); g.moveTo((out[n - 1][0] + out[0][0]) / 2, (out[n - 1][1] + out[0][1]) / 2);
  for (let i = 0; i < n; i++) { const p = out[i], q = out[(i + 1) % n]; g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
  g.closePath(); g.fillStyle = OUTLINE; g.fill();
};

/** rim light: a soft bright band just inside a contour, strongest on the side facing the light (angle `la`) */
const rimLight = (g: CanvasRenderingContext2D, pts: P[], la: number, w: number, rgb: string) => {
  const n = pts.length, cx = pts.reduce((a, p) => a + p[0], 0) / n, cy = pts.reduce((a, p) => a + p[1], 0) / n;
  g.lineCap = "round"; g.lineWidth = w;
  for (let i = 0; i < n; i += 2) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 2) % n], a = Math.atan2(y0 - cy, x0 - cx), k = Math.max(0, Math.cos(a - la));
    if (k < 0.15) continue;
    const ins = (x: number, y: number): P => { const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1; return [x - (dx / l) * w * 0.75, y - (dy / l) * w * 0.75]; };
    const p = ins(x0, y0), q = ins(x1, y1); g.beginPath(); g.moveTo(...p); g.lineTo(...q); g.strokeStyle = `rgba(${rgb},${Math.min(1, 1.1 * Math.pow((k - 0.15) / 0.85, 1.1)).toFixed(3)})`; g.stroke();
  }
};

// ---------------- body path (bean that bends) ----------------
const beanPts = (cx: number, top: number, H: number, tw: number, bw: number, bend: number) => {
  const pts: P[] = [], n = 2.4;
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    const yy = Math.sign(s) * Math.pow(Math.abs(s), 2 / n), y = top + H / 2 + (H / 2) * yy;
    const u = Math.min(1, Math.max(0, (y - top) / H)), w = tw + (bw - tw) * Math.pow(u, 0.8); // clamp: a hair below 0 made pow() NaN and the whole outline vanished for that frame
    const x = cx + (w / 2) * Math.sign(c) * Math.pow(Math.abs(c), 2 / n) + bend * Math.pow(1 - u, 2);
    pts.push([x, y]);
  }
  return pts;
};
export const bendAt = (u: number, bend: number) => bend * Math.pow(1 - u, 2);

// ---------------- the whole character ----------------
export const drawChar = (g: CanvasRenderingContext2D, S: CharSpec, P: Pose) => {
  const R = S.R, HA = 1, RL = R, ow = 0.085 * RL, lw = 0.095 * RL, sole = 975, cx = P.x; // line weights follow the head SIZE, not just its radius
  const H = S.bodyH * P.body.sy, bw = (S.bodyW * P.body.sx) / Math.sqrt(P.body.sy), tw = bw * 0.84;
  const hipY = sole - S.legLen + P.bob, top = hipY - H;
  const shoulder = (s: number): P => [cx + s * tw * 0.47 + bendAt(0.18, P.body.bend), top + H * 0.18];
  const hip = (s: number): P => [cx + s * bw * 0.22, hipY - 6];
  // legs first, OUTSIDE the lean rotation: the feet stay planted on the ground (reference: legs are still while
  // standing and talking), only the hip ends follow the body
  { const cL = Math.cos(P.body.lean), sL = Math.sin(P.body.lean);
    for (const [i, s] of [[0, -1], [1, 1]] as const) {
      const h0 = hip(s), h: P = [cx + (h0[0] - cx) * cL - (h0[1] - hipY) * sL, hipY + (h0[0] - cx) * sL + (h0[1] - hipY) * cL];
      const L = P.legs[i], f: P = [cx + s * bw * 0.22 + L.b[0], sole + L.b[1]], k: P = [(h[0] + f[0]) / 2 + L.a[0] - s * 5, h[1] + L.a[1]];
      limb(g, h, k, f, lw); poly(g, [f, [f[0] + s * 0.13 * R, f[1] + 0.01 * R]]); ink(g, lw);
    } }
  g.save(); g.translate(cx, hipY); g.rotate(P.body.lean); g.translate(-cx, -hipY);
  const arm = (i: 0 | 1) => {
    const s = i ? 1 : -1, sh = shoulder(s), A = P.arms[i], e: P = [sh[0] + A.a[0], sh[1] + A.a[1]], h: P = [sh[0] + A.b[0], sh[1] + A.b[1]];
    limb(g, sh, e, h, lw); ballHand(g, h[0], h[1], 0.13 * R);
  };
  if (S.hair?.style === "long") { // long hair hanging behind the head and body (kunti)
    const hx = cx + P.body.bend + P.head.dx, hy = top - R * 0.74 * P.head.sy + P.head.dy, by = top + H * 0.8;
    g.beginPath(); g.moveTo(hx - 0.98 * R, hy - 0.2 * R); g.quadraticCurveTo(hx - 1.2 * R, hy + 1.2 * R, hx - 0.85 * R, by);
    for (let i = 0; i <= 6; i++) g.lineTo(hx - 0.85 * R + (1.7 * R * i) / 6, by + (i % 2 ? 0.12 * R : -0.02 * R));
    g.quadraticCurveTo(hx + 1.2 * R, hy + 1.2 * R, hx + 0.98 * R, hy - 0.2 * R); g.closePath();
    fill(g, S.hair.color); ink(g, ow * 0.7);
    g.beginPath(); g.moveTo(hx - 0.5 * R, hy + 0.6 * R); g.quadraticCurveTo(hx - 0.62 * R, hy + 1.3 * R, hx - 0.45 * R, by - 0.1 * R); ink(g, 0.02 * R, "rgba(255,255,255,0.12)");
  }
  if (P.armBehind?.[0]) arm(0); if (P.armBehind?.[1]) arm(1);
  // body
  const pts = beanPts(cx, top, H, tw, bw, P.body.bend), body = () => poly(g, pts, true);
  const C = S.cloth;
  const bp = C.pattern === "batik" ? pat(g, "batik" + C.top, 80, batikPat(C.top, C.patternCol ?? "#c99a3a")) : null; if (bp) bp.setTransform(new DOMMatrix().scale(0.55));
  const inkA = P.ink ?? Math.PI * 0.6;
  inkSil(g, pts, 0.045 * bw * 0.5, 0.16 * bw * 0.5, inkA - P.body.lean);
  body(); fill(g, bp ? bp : C.pattern === "stripe" ? pat(g, "stripe" + C.top, 32, stripePat(C.top, C.patternCol ?? "#000")) : pat(g, "knit" + C.top, 64, knitPat(C.top)));
  g.save(); body(); g.clip();
  if (C.bottom) {
    const by = top + H * (C.bottomFrom ?? 0.62);
    g.fillStyle = C.plaid ? pat(g, "plaid" + C.plaid.join(), 96, plaidPat(...C.plaid)) : C.bottom; g.fillRect(cx - bw, by, bw * 2, H);
    g.beginPath(); g.moveTo(cx - bw, by); g.quadraticCurveTo(cx, by + 8, cx + bw, by); ink(g, 0.035 * R); // waist roll
    g.beginPath(); g.moveTo(cx - bw * 0.05, by + 4); g.quadraticCurveTo(cx + bw * 0.08, by + H * 0.15, cx + bw * 0.02, by + H * 0.33); ink(g, 0.022 * R, "rgba(43,26,38,0.55)"); // sarung fold
  }
  // form shade: darker toward the edges and the bottom, head shadow on the chest
  const rg = g.createRadialGradient(cx - bw * 0.12 + P.body.bend * 0.3, top + H * 0.45, bw * 0.15, cx, top + H * 0.5, bw * 0.75);
  rg.addColorStop(0, "rgba(255,255,255,0.06)"); rg.addColorStop(0.65, "rgba(0,0,0,0)"); rg.addColorStop(1, "rgba(30,15,35,0.32)");
  g.fillStyle = rg; g.fillRect(cx - bw * 1.5, top - 10, bw * 3, H + 20);
  const hs = g.createLinearGradient(0, top, 0, top + H * 0.22); hs.addColorStop(0, "rgba(30,15,35,0.35)"); hs.addColorStop(1, "rgba(30,15,35,0)");
  g.fillStyle = hs; g.fillRect(cx - bw, top, bw * 2, H * 0.25);
  if (C.collar) { const nx = cx + bendAt(0.02, P.body.bend); g.beginPath(); if (C.collar === "v") { g.moveTo(nx - tw * 0.18, top + 2); g.lineTo(nx, top + H * 0.17); g.lineTo(nx + tw * 0.18, top + 2); } else g.ellipse(nx, top + 2, tw * 0.22, 0.1 * R, 0, 0, Math.PI); ink(g, 0.03 * R); }
  for (let b = 0; b < (C.buttons ?? 0); b++) { const by = top + H * (0.22 + b * 0.14), bx = cx + bendAt((by - top) / H, P.body.bend); ell(g, bx, by, 0.022 * R, 0.022 * R); fill(g, "#efe6d2"); ink(g, 0.012 * R); }
  rimLight(g, pts, inkA - P.body.lean + Math.PI, 0.03 * bw, S.rim ?? "255,236,200");
  g.restore();

  // head
  const neck: P = [cx + P.body.bend, top];
  g.save(); g.translate(neck[0] + P.head.dx, neck[1] - R * 0.74 * P.head.sy + P.head.dy); g.rotate(P.head.rot); g.scale(P.head.sx, P.head.sy);
  const hp = headPts(R, S.head ?? {}), head = () => poly(g, hp, true);
  { const hk = 1 / Math.max(0.6, Math.min(P.head.sx, P.head.sy)); inkSil(g, hp, 0.05 * R * hk, 0.19 * R * hk, inkA - P.head.rot - P.body.lean); }
  head(); fill(g, S.skin);
  g.save(); head(); g.clip();
  const vs = g.createLinearGradient(0, -0.1 * R, 0, R); vs.addColorStop(0, `rgba(${SHADE},0)`); vs.addColorStop(1, `rgba(${SHADE},0.55)`); g.fillStyle = vs; g.fillRect(-R, -R, 2 * R, 2 * R);
  const hsd = g.createLinearGradient(0.25 * R, 0, R, 0); hsd.addColorStop(0, `rgba(${SHADE},0)`); hsd.addColorStop(1, `rgba(${SHADE},0.32)`); g.fillStyle = hsd; g.fillRect(-R, -R, 2 * R, 2 * R);
  { const la = inkA - P.head.rot - P.body.lean + Math.PI, lx = Math.cos(la) * 0.3 * R, ly = Math.sin(la) * 0.3 * R - 0.15 * R; // sheen toward the light
    const sh = g.createRadialGradient(lx, ly, 0, lx, ly, 0.75 * R); sh.addColorStop(0, "rgba(255,255,255,0.75)"); sh.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = sh; g.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);
    rimLight(g, hp, la, 0.03 * R, S.rim ?? "255,240,205"); }
  if (S.hair) { // hair cap; it shows as tufts at the sides under the hat
    g.save(); g.scale(HA, 1); g.fillStyle = S.hair.color; g.beginPath(); g.moveTo(-R * 1.1, -R * 1.1); g.lineTo(R * 1.1, -R * 1.1);
    if (S.hair.style === "fringe") { g.lineTo(R * 1.05, -0.3 * R); for (let i = 0; i <= 10; i++) g.lineTo(R - 2 * R * (i / 10), -0.36 * R + (i % 2 ? 0.1 * R : 0)); }
    else { g.lineTo(R * 1.05, 0.05 * R); g.quadraticCurveTo(0.82 * R, -0.18 * R, 0.62 * R, -0.42 * R); g.quadraticCurveTo(0, -0.62 * R, -0.62 * R, -0.42 * R); g.quadraticCurveTo(-0.82 * R, -0.18 * R, -R * 1.05, 0.05 * R); }
    g.closePath(); g.fill();
    g.fillStyle = "rgba(255,255,255,0.12)"; g.beginPath(); g.ellipse(-0.3 * R, -0.62 * R, 0.25 * R, 0.06 * R, -0.3, 0, Math.PI * 2); g.fill(); g.restore();
  }
  g.restore();
  if (S.hair?.style === "bun") { g.save(); g.translate(0.1 * R, -1.02 * R); ell(g, 0, 0, 0.32 * R, 0.26 * R); fill(g, S.hair.color); ink(g, ow); ell(g, -0.08 * R, -0.08 * R, 0.12 * R, 0.05 * R, -0.4); fill(g, "rgba(255,255,255,0.14)"); g.restore(); }
  // face (slides toward where the head is turned)
  const fx = P.head.turn * 0.16 * R, ey = -0.02 * R;
  for (const [i, s] of [[0, -1], [1, 1]] as const) {
    const ex = fx + s * 0.3 * R * (1 - Math.abs(P.head.turn) * 0.12);
    drawEye(g, P.eyes[i], ex, ey, R, s, S.skin);
    if (S.lashes && (P.eyes[i].kind === "open" || P.eyes[i].kind === "big")) { const k = P.eyes[i].kind === "big" ? 1.22 : 1; poly(g, [[ex + s * 0.07 * R * k, ey - 0.08 * R * k], [ex + s * 0.12 * R * k, ey - 0.13 * R * k]]); ink(g, 0.03 * R); }
    drawBrow(g, P.brows[i], ex, ey - (P.eyes[i].kind === "shock" || P.eyes[i].kind === "round" ? 0.3 : 0.22) * R, R, s);
  }
  if (P.blush) for (const s of [-1, 1]) { ell(g, fx + s * 0.45 * R, 0.18 * R, 0.1 * R, 0.05 * R); fill(g, `rgba(240,120,130,${0.35 * P.blush})`); }
  if (S.moustache) {
    const mc = S.moustacheColor ?? "#2d1c16";
    for (const s of [-1, 1]) {
      g.save(); g.translate(fx + (P.mouth.dx ?? 0) * R * 0.5, 0.25 * R); g.scale(s, 1);
      g.beginPath();
      if (S.moustache === "handlebar") { g.moveTo(0, -0.02 * R); g.bezierCurveTo(0.12 * R, -0.07 * R, 0.25 * R, -0.03 * R, 0.28 * R, 0.04 * R); g.bezierCurveTo(0.3 * R, -0.02 * R, 0.24 * R, -0.06 * R, 0.21 * R, -0.01 * R); g.bezierCurveTo(0.14 * R, 0.05 * R, 0.05 * R, 0.06 * R, 0, 0.04 * R); }
      else { g.moveTo(0, -0.02 * R); g.bezierCurveTo(0.08 * R, -0.05 * R, 0.17 * R, -0.03 * R, 0.2 * R, 0.03 * R); g.bezierCurveTo(0.12 * R, 0.04 * R, 0.05 * R, 0.05 * R, 0, 0.035 * R); }
      g.closePath(); fill(g, mc); ink(g, 0.02 * R); g.restore();
    }
  }
  g.save(); g.translate(fx + (P.mouth.dx ?? 0) * R, 0.38 * R); g.rotate(P.mouth.tilt ?? 0); drawMouth(g, P.mouth, R, S.skin); g.restore();
  if (P.sweat) { const a = P.sweat; g.save(); g.translate(0.72 * R, -0.35 * R + a * 0.18 * R); ell(g, 0, 0, 0.06 * R, 0.085 * R); fill(g, "#bfe6ff"); ink(g, 0.025 * R); ell(g, -0.015 * R, -0.03 * R, 0.015 * R, 0.025 * R); fill(g, "#fff"); g.restore(); }
  // hat: its own transform, sitting into the head
  if (S.hat === "cap") { // worker cap: dome + front brim, coloured
    const col = S.hatColor ?? "#e0782a";
    g.save(); g.translate(P.hat.dx, -0.62 * R + P.hat.dy); g.rotate(P.hat.rot); g.scale(1 / Math.sqrt(P.hat.sy), P.hat.sy);
    g.beginPath(); g.ellipse(0, 0.05 * R, 0.86 * R, 0.62 * R, 0, Math.PI, 0); g.closePath(); fill(g, col);
    g.save(); g.clip(); const hl = g.createLinearGradient(-0.8 * R, 0, 0.8 * R, 0); hl.addColorStop(0.2, "rgba(255,255,255,0.25)"); hl.addColorStop(0.45, "rgba(255,255,255,0)"); hl.addColorStop(1, "rgba(0,0,0,0.25)"); g.fillStyle = hl; g.fillRect(-R, -R, 2 * R, 1.2 * R); g.restore();
    g.beginPath(); g.ellipse(0, 0.05 * R, 0.86 * R, 0.62 * R, 0, Math.PI, 0); g.closePath(); ink(g, ow * 0.9);
    g.beginPath(); g.ellipse(0.25 * R, 0.08 * R, 0.75 * R, 0.13 * R, 0, 0, Math.PI * 2); fill(g, col); ink(g, ow * 0.8);
    g.beginPath(); g.ellipse(0, -0.2 * R, 0.14 * R, 0.1 * R, 0, 0, Math.PI * 2); fill(g, "#ffd84a"); ink(g, 0.02 * R);
    g.restore();
  }
  if (S.hat === "peci") {
    g.save(); g.translate(P.hat.dx, -0.5 * R + P.hat.dy); g.rotate(P.hat.rot); g.scale(1 / Math.sqrt(P.hat.sy), P.hat.sy);
    const bw2 = 0.7 * R * HA, tw2 = 0.63 * R * HA, h = 0.38 * R;
    const cap = () => { g.beginPath(); g.moveTo(-bw2, 0.02 * R); g.lineTo(-tw2, -h); g.ellipse(0, -h, tw2, 0.11 * R, 0, Math.PI, 0); g.lineTo(bw2, 0.02 * R); g.quadraticCurveTo(0, 0.2 * R, -bw2, 0.02 * R); g.closePath(); };
    cap(); fill(g, pat(g, "velvet", 48, velvetPat));
    g.save(); cap(); g.clip();
    const hl = g.createLinearGradient(-bw2, 0, bw2, 0); hl.addColorStop(0, "rgba(0,0,0,0.2)"); hl.addColorStop(0.22, "rgba(255,255,255,0.2)"); hl.addColorStop(0.36, "rgba(255,255,255,0)"); hl.addColorStop(1, "rgba(0,0,0,0.35)");
    g.fillStyle = hl; g.fillRect(-R * 1.2, -R, R * 2.4, R * 1.4);
    g.beginPath(); g.moveTo(-bw2, -0.03 * R); g.quadraticCurveTo(0, 0.14 * R, bw2, -0.03 * R); ink(g, 0.025 * R, "rgba(255,255,255,0.18)"); // stitched band
    g.restore();
    cap(); ink(g, ow * 0.95);
    ell(g, 0, -h, tw2, 0.11 * R); fill(g, "#2a2631"); ink(g, ow * 0.8);
    g.restore();
  }
  g.restore(); // head

  // arms in front
  if (!P.armBehind?.[0]) arm(0); if (!P.armBehind?.[1]) arm(1);
  g.restore();
};

/** where hand i (0 = left, 1 = right) ends up on the card for this pose, in design units (same maths as drawChar),
 *  so props can be drawn exactly in the hand */
export const handPoint = (S: CharSpec, P: Pose, i: 0 | 1): [number, number] => {
  const sole = 975, cx = P.x, H = S.bodyH * P.body.sy, bw = (S.bodyW * P.body.sx) / Math.sqrt(P.body.sy), tw = bw * 0.84;
  const hipY = sole - S.legLen + P.bob, top = hipY - H, s = i ? 1 : -1;
  const sh: [number, number] = [cx + s * tw * 0.47 + bendAt(0.18, P.body.bend), top + H * 0.18], A = P.arms[i];
  const x = sh[0] + A.b[0], y = sh[1] + A.b[1], c = Math.cos(P.body.lean), sn = Math.sin(P.body.lean);
  return [cx + (x - cx) * c - (y - hipY) * sn, hipY + (x - cx) * sn + (y - hipY) * c];
};

/** head centre on the card (design units), ignoring body lean: anchor for heads on pillows */
export const headCenter = (S: CharSpec, P: Pose): [number, number] => {
  const top = 975 - S.legLen + P.bob - S.bodyH * P.body.sy;
  return [P.x + P.body.bend + P.head.dx, top - S.R * 0.74 * P.head.sy + P.head.dy];
};
