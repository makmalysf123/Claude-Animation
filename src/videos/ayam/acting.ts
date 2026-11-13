// Acting layer for the Ayam cast, built from the frame-by-frame study (docs/style-references/frame-by-frame-2026-11-11.md):
// - every expression swap hides behind a 4-frame blink (half / shut / shut / half), idle blinks every 0.5-2.3 s
// - the head outline morphs with the expression (wider and rounder on a grin, narrower on deadpan), eased over ~3 f
// - while a character talks (is quoted) or chews, the mouth changes every 2 f, brows twitch and the head tilts a few degrees
// - effect drawings: smoke, dust, debris, coins, motion streaks, impact burst
import type { Expr, FaceOv, MouthK, Pen } from "../bridge/toon";

const hh = (a: number, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
const LID = [0.5, 1, 1, 0.5];
const HEADK: Partial<Record<Expr, number>> = { laugh: 1.1, grin: 1.07, shock: 1.06, relief_open: 1.06, relief: 1.04, smile: 1.02, smile_closed: 1.03,
  neutral: 0.95, stern: 0.94, nervous: 0.96, dazed: 0.97, whistle: 0.96, pained: 0.99, lick: 1.0 };
const ANGRY: MouthK[] = ["teeth", "dash", "O", "teeth", "frown", "o"], HAPPY: MouthK[] = ["grin", "laugh", "smileWide", "o", "grin", "smile"],
  PLAIN: MouthK[] = ["dash", "o", "O", "smile", "grin", "dash", "teeth"], CHEW: MouthK[] = ["wave", "dash", "o", "dash", "wave", "smile"];
const style = (e: Expr): MouthK[] => (e === "stern" || e === "pained" ? ANGRY : e === "grin" || e === "laugh" || e === "relief_open" || e === "relief" || e === "smile_closed" ? HAPPY : PLAIN);

export type Beat = [number, Expr];
export type Live = { beats: Beat[]; seed: number; talk?: [number, number][]; chew?: [number, number][] };
/** the face state at frame f: expression, eyelid, head morph, mouth / brow overrides, head tilt */
export const live = (L: Live, f: number) => {
  let i = 0; while (i + 1 < L.beats.length && f >= L.beats[i + 1][0]) i++;
  const expr = L.beats[i][1], prev = i > 0 ? L.beats[i - 1][1] : expr, t0 = L.beats[i][0];
  // blink: around every swap (shut frames t0-1, t0), else idle blinks 0.5-2.3 s apart
  let blink = 0;
  for (let k = 1; k < L.beats.length; k++) { const d = f - L.beats[k][0] + 2; if (d >= 0 && d < 4) blink = LID[Math.floor(d)]; }
  if (!blink) { let s = Math.round(-60 * hh(L.seed, 9)); for (let n = 0; s <= f && n < 300; n++) { const d = f - s; if (d >= 0 && d < 4) { blink = LID[Math.floor(d)]; break; } s += Math.round(15 + 54 * hh(L.seed * 31 + n, 13)); } }
  const kA = HEADK[prev] ?? 1, kB = HEADK[expr] ?? 1, u = Math.max(0, Math.min(1, (f - t0 + 1) / 3)), headK = kA + (kB - kA) * u;
  const on = (r?: [number, number][]) => !!r && r.some(([a, b]) => f >= a && f < b);
  const face: FaceOv = {}; let headTilt = 0, bob = 0;
  if (on(L.talk)) {
    const list = style(expr), k = Math.floor(f / 2);
    face.mouth = list[Math.floor(hh(L.seed + k * 0.37, 3) * list.length)];
    const kb = Math.floor(f / 5); face.brow = [Math.round((hh(L.seed, kb) - 0.5) * 4), Math.round((hh(L.seed + 5, kb) - 0.5) * 4)];
    const k6 = f / 6; headTilt = 3 * (Math.sin(k6 * 1.3 + L.seed) * 0.7 + Math.sin(k6 * 2.9 + L.seed * 2) * 0.3);
    bob = 0.5 + 0.5 * Math.sin(f * 0.9 + L.seed);
  } else if (on(L.chew)) {
    face.mouth = CHEW[Math.floor(f / 3) % CHEW.length]; headTilt = 2 * Math.sin(f * 0.7 + L.seed); bob = 0.5 + 0.5 * Math.sin(f * 1.4);
  }
  return { expr, blink, headK: Math.round(headK * 100) / 100, face, headTilt: Math.round(headTilt * 4) / 4, bob };
};

// ---------------- effect drawings (unlit cards, drawn with the Pen in a cw x ch canvas) ----------------
/** soft smoke puff: overlapping blobs, lighter on top; t = age 0..1 (grows, fades) */
export const fxSmoke = (p: Pen, t: number, dark = 0) => {
  const g = p.g, a = Math.max(0, Math.min(1, t * 5)) * (1 - t) ** 1.3, s = 0.55 + 0.45 * t;
  const base = dark ? [70, 70, 78] : [196, 196, 206], top = dark ? [110, 110, 120] : [236, 236, 242];
  for (let k = 0; k < 6; k++) {
    const x = 150 + Math.cos(k * 2.1) * 52 * s, y = 160 + Math.sin(k * 2.1) * 38 * s, r = (58 - k * 4) * s;
    const gr = g.createRadialGradient(x, y - r * 0.4, r * 0.1, x, y, r);
    gr.addColorStop(0, `rgba(${top},${0.42 * a})`); gr.addColorStop(0.7, `rgba(${base},${0.26 * a})`); gr.addColorStop(1, `rgba(${base},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
};
/** brown dust cloud (storm, landings, running feet) */
export const fxDust = (p: Pen, t: number) => {
  const g = p.g, a = Math.min(1, t * 6) * (1 - t);
  for (let k = 0; k < 7; k++) {
    const x = 150 + Math.cos(k * 1.7) * 70 * (0.5 + t), y = 190 - k * 6 * t + Math.sin(k * 1.7) * 24, r = (44 - k * 3) * (0.6 + t);
    const gr = g.createRadialGradient(x, y - r * 0.3, 2, x, y, r);
    gr.addColorStop(0, `rgba(196,170,132,${0.8 * a})`); gr.addColorStop(1, "rgba(150,124,92,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
};
/** flying debris: a plank, a leaf or a roof tile, ink outlined (rotation is applied by the card) */
export const fxDebris = (p: Pen, kind: number) => {
  if (kind === 0) p.poly([[40, 130], [260, 112], [262, 150], [42, 170]], "#9a7048", 6);
  else if (kind === 1) p.poly([[150, 60], [230, 150], [150, 240], [70, 150]], "#4f8f3a", 6);
  else p.poly([[80, 90], [220, 90], [240, 200], [60, 200]], "#b5503a", 6);
};
export const fxCoin = (p: Pen, spin: number) => { p.ell(150, 150, 100 * Math.max(0.15, Math.abs(Math.cos(spin))), 100, "#ffcf3a", 10); p.ell(150, 150, 60 * Math.max(0.1, Math.abs(Math.cos(spin))), 60, null, 5); };
/** speed streaks behind something moving fast (white, left -> right) */
export const fxStreak = (p: Pen, a: number) => { const g = p.g; for (let k = 0; k < 4; k++) { const y = 60 + k * 50; const gr = g.createLinearGradient(20, 0, 280, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(1, `rgba(255,255,255,${0.8 * a})`); g.strokeStyle = gr; g.lineWidth = 10 - k; g.lineCap = "round"; g.beginPath(); g.moveTo(20 + k * 20, y); g.lineTo(280, y); g.stroke(); } };
/** ember sparks rising from a fire */
export const fxEmber = (p: Pen) => { p.g.fillStyle = "rgba(255,190,90,0.95)"; p.g.beginPath(); p.g.arc(50, 50, 30, 0, Math.PI * 2); p.g.fill(); };

/** one crumb of roast chicken (golden-brown chip with a dark rim); k picks the shape */
export const fxCrumb = (p: Pen, k: number) => {
  const pts: [number, number][] = []; for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2, r = 18 + 10 * Math.abs(Math.sin(k * 3.1 + i * 1.9)); pts.push([32 + Math.cos(a) * r * 0.9, 32 + Math.sin(a) * r * 0.75]); }
  p.poly(pts, k % 3 ? "#c9822e" : "#e0b060", 5); if (k % 2) p.dot(28, 28, 4, "#f4d79a");
};
/** egg hatching in stages, t 0..1 on a 300 x 300 card (egg centre 150, 170):
 *  0-.42 the egg rocks and hairline cracks run round its middle; .42-1 the top cap lifts off, tumbles aside and lands,
 *  a few shell chips fly; the bottom half stays in the nest (the chick itself is its own bird card) */
export const fxEggCrack = (p: Pen, t: number) => {
  const g = p.g, cx = 150, cy = 170, rx = 60, ry = 76, crk = Math.min(1, t / 0.42), open = Math.max(0, (t - 0.42) / 0.58);
  const zig: [number, number][] = []; for (let i = 0; i <= 10; i++) { const x = cx - rx - 4 + (i / 10) * (2 * rx + 8); zig.push([x, cy - 8 + (i % 2 ? -11 : 9)]); }
  const egg = (fill = "#fbf3e2") => p.ell(cx, cy, rx, ry, fill, 8);
  const rock = open > 0 ? 0 : Math.sin(t * 60) * 0.14 * crk;
  g.save(); g.translate(cx, cy + ry); g.rotate(rock); g.translate(-cx, -cy - ry);
  if (open <= 0) {
    egg();
    const n = Math.max(1, Math.round(crk * 10)); p.stroke(zig.slice(0, n + 1), 5, "#5a4a3a"); // the crack runs across
    if (crk > 0.5) p.stroke([[cx - 10, cy - 14], [cx - 2, cy - 40], [cx + 8, cy - 52]], 3.5, "#5a4a3a");
  } else {
    // bottom half: clip below the zigzag
    const bot: [number, number][] = [...zig, [cx + rx + 10, cy + ry + 10], [cx - rx - 10, cy + ry + 10]];
    p.clip(bot, () => egg()); p.stroke(zig, 5, "#5a4a3a");
    // top cap: lifts, turns and falls to the right of the nest
    const top: [number, number][] = [...zig, [cx + rx + 10, cy - ry - 10], [cx - rx - 10, cy - ry - 10]];
    const up = Math.sin(Math.min(1, open * 1.4) * Math.PI) * 70, dx = open * 95, rot = open * 2.1;
    g.save(); g.translate(cx + dx, cy - 20 - up + open * 60); g.rotate(rot); g.translate(-cx, -(cy - 20));
    p.clip(top, () => egg()); p.stroke(zig, 5, "#5a4a3a"); g.restore();
    for (let k = 0; k < 4; k++) { const a = -0.6 - k * 0.55, d = open * (60 + 25 * k), fall = open * open * 90; // chips
      p.poly([[cx + Math.cos(a) * d - 6, cy - 30 + Math.sin(a) * d + fall], [cx + Math.cos(a) * d + 7, cy - 34 + Math.sin(a) * d + fall], [cx + Math.cos(a) * d + 2, cy - 24 + Math.sin(a) * d + fall]], "#fbf3e2", 3); }
  }
  g.restore();
};
