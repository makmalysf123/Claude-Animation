// Cast of "Menara Es Dolma" in the toon2 card style. All faces are plain white. Men and women are mixed, and each
// person's clothes say who they are. Heads are small (R ~96) and nobody sways while idle.
// Ladakh winter clothes: a thick wool robe (goncha) closed at the side, tied with a coloured sash, and a hat or knitted
// cap. The hats and sashes are drawn on top of the character as card "extras" (Ex).
import { headCenter, OUTLINE, CharSpec, Pose } from "../../lib/toon2";

const SKIN = "#fbf9f6";
export type Ex = (g: CanvasRenderingContext2D, P: Pose) => void;

/** Dolma: the farmer. A maroon goncha, a mustard knitted cap, and long hair. Her face stays flat all film. */
export const DOLMA: CharSpec = {
  R: 95, bodyW: 206, bodyH: 262, legLen: 318, skin: SKIN, hair: { color: "#1d1614", style: "long" }, hat: "none", lashes: true,
  head: { bTop: 0.92, bBot: 0.98, nTop: 2.2, nBot: 2.1, drift: -0.06 },
  cloth: { top: "#7c2634", pattern: "knit", bottom: "#6a1f2b", bottomFrom: 0.86, collar: "round" },
};
/** Tashi: the neighbour who wants her land for a guesthouse. A slate-grey goncha with an orange sash, a green
 *  velvet tibi hat with turned-up flaps, and a thin moustache. He is a little pompous. */
export const TASHI: CharSpec = {
  R: 97, bodyW: 214, bodyH: 256, legLen: 330, skin: SKIN, hair: { color: "#1a1412", style: "short" }, moustache: "thin", moustacheColor: "#2a1e1a", hat: "none",
  head: { bTop: 0.98, bBot: 0.9, nTop: 2.5, nBot: 2.3, drift: 0.05 },
  cloth: { top: "#4f5562", pattern: "knit", bottom: "#3c414c", bottomFrom: 0.86, collar: "v" },
};
/** villager A: an older woman with her hair in a bun, a plum goncha, and a yellow sash */
export const WARGA_A: CharSpec = {
  R: 94, bodyW: 220, bodyH: 258, legLen: 300, skin: SKIN, hair: { color: "#3a3230", style: "bun" }, hat: "none", lashes: true,
  head: { bTop: 0.9, bBot: 0.98, nTop: 2.1, nBot: 1.95, drift: -0.1 },
  cloth: { top: "#5c3a6e", pattern: "knit", bottom: "#4a2e5a", bottomFrom: 0.86, collar: "round" },
};
/** villager B: a younger man in a rust-orange padded jacket, dark trousers, and a navy cap */
export const WARGA_B: CharSpec = {
  R: 96, bodyW: 210, bodyH: 244, legLen: 344, skin: SKIN, hair: { color: "#1a1410", style: "fringe" }, hat: "cap", hatColor: "#2a3a68",
  head: { bTop: 0.94, bBot: 0.96, nTop: 2.2, nBot: 2.3, drift: 0.04 },
  cloth: { top: "#c0582e", pattern: "stripe", patternCol: "#a84a26", bottom: "#2b2f3a", bottomFrom: 0.72, collar: "round", buttons: 0 },
};
/** villager C: an old man with grey hair, a brown goncha, and a dark tibi hat (used in the callback queue) */
export const WARGA_C: CharSpec = {
  R: 95, bodyW: 204, bodyH: 250, legLen: 320, skin: SKIN, hair: { color: "#9a948e", style: "short" }, moustache: "handlebar", moustacheColor: "#8a8580", hat: "none",
  head: { bTop: 0.96, bBot: 0.92, nTop: 2.1, nBot: 2.0, drift: 0.06 },
  cloth: { top: "#6e4a32", pattern: "knit", bottom: "#5a3c28", bottomFrom: 0.86, collar: "v" },
};

// ---------------- shared drawing helpers ----------------
/** head centre on the card, with the body lean applied (the same maths as the Garam film) */
export const headAt = (S: CharSpec, P: Pose): [number, number] => {
  const [x, y] = headCenter(S, P), hipY = 975 - S.legLen + P.bob, c = Math.cos(P.body.lean), s = Math.sin(P.body.lean);
  return [P.x + (x - P.x) * c - (y - hipY) * s, hipY + (x - P.x) * s + (y - hipY) * c];
};
const inkL = (g: CanvasRenderingContext2D, w: number) => { g.lineWidth = w; g.strokeStyle = OUTLINE; g.lineJoin = "round"; g.stroke(); };

/** the tibi hat: a tall velvet crown with four flaps turned up around it (front flap shorter) */
export const tibiEx = (S: CharSpec, crown: string, flap: string): Ex => (g, P) => {
  const [x, y] = headAt(S, P), R = S.R; g.save(); g.translate(x + P.hat.dx, y + P.hat.dy); g.rotate(P.head.rot * 0.9 + P.hat.rot);
  const base = -0.62 * R, top = -1.38 * R, bw = 0.74 * R, tw = 0.6 * R;
  // crown
  g.beginPath(); g.moveTo(-bw, base); g.quadraticCurveTo(-tw - 0.05 * R, (base + top) / 2, -tw, top + 0.08 * R); g.quadraticCurveTo(0, top - 0.12 * R, tw, top + 0.08 * R); g.quadraticCurveTo(tw + 0.05 * R, (base + top) / 2, bw, base); g.closePath();
  const gr = g.createLinearGradient(-bw, 0, bw, 0); gr.addColorStop(0, crown); gr.addColorStop(0.3, "rgba(255,255,255,0.0)"); gr.addColorStop(1, crown);
  g.fillStyle = crown; g.fill(); g.save(); g.clip(); const hl = g.createLinearGradient(-bw, 0, bw, 0); hl.addColorStop(0.15, "rgba(255,255,255,0.28)"); hl.addColorStop(0.4, "rgba(255,255,255,0)"); hl.addColorStop(1, "rgba(0,0,0,0.3)"); g.fillStyle = hl; g.fillRect(-R, top - 0.2 * R, 2 * R, 1.2 * R);
  g.strokeStyle = "rgba(255,226,140,0.55)"; g.lineWidth = 0.035 * R; for (const k of [-0.33, 0, 0.33]) { g.beginPath(); g.moveTo(k * bw, base); g.lineTo(k * tw * 0.9, top); g.stroke(); } g.restore();
  g.beginPath(); g.moveTo(-bw, base); g.quadraticCurveTo(-tw - 0.05 * R, (base + top) / 2, -tw, top + 0.08 * R); g.quadraticCurveTo(0, top - 0.12 * R, tw, top + 0.08 * R); g.quadraticCurveTo(tw + 0.05 * R, (base + top) / 2, bw, base); inkL(g, 0.06 * R);
  // turned-up flaps: two side flaps flare out like small wings, the front flap is a low band
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 0.35 * R, base + 0.06 * R); g.quadraticCurveTo(s * 0.95 * R, base + 0.02 * R, s * 1.08 * R, base - 0.42 * R); g.quadraticCurveTo(s * 0.86 * R, base - 0.2 * R, s * 0.5 * R, base - 0.16 * R); g.closePath(); g.fillStyle = flap; g.fill(); inkL(g, 0.05 * R); }
  g.beginPath(); g.moveTo(-0.66 * R, base + 0.08 * R); g.quadraticCurveTo(0, base + 0.2 * R, 0.66 * R, base + 0.08 * R); g.lineTo(0.6 * R, base - 0.12 * R); g.quadraticCurveTo(0, base - 0.02 * R, -0.6 * R, base - 0.12 * R); g.closePath(); g.fillStyle = flap; g.fill();
  g.save(); g.clip(); g.fillStyle = "rgba(0,0,0,0.15)"; g.fillRect(-R, base - 0.02 * R, 2 * R, 0.2 * R); g.restore(); inkL(g, 0.05 * R);
  g.restore();
};
/** a knitted wool cap with a folded brim and a small pompom */
export const woolCapEx = (S: CharSpec, col: string): Ex => (g, P) => {
  const [x, y] = headAt(S, P), R = S.R; g.save(); g.translate(x + P.hat.dx, y + P.hat.dy); g.rotate(P.head.rot * 0.9 + P.hat.rot);
  const brim = -0.42 * R, w = 0.96 * R;
  const dome = () => { g.beginPath(); g.moveTo(-w, brim); g.bezierCurveTo(-w, -1.25 * R, w, -1.25 * R, w, brim); g.closePath(); };
  dome(); g.fillStyle = col; g.fill(); g.save(); dome(); g.clip();
  g.strokeStyle = "rgba(0,0,0,0.16)"; g.lineWidth = 0.05 * R; for (let k = -6; k <= 6; k++) { g.beginPath(); g.moveTo(k * 0.15 * R, brim); g.quadraticCurveTo(k * 0.12 * R, -0.85 * R, k * 0.05 * R, -1.15 * R); g.stroke(); }
  const hl = g.createLinearGradient(-w, 0, w, 0); hl.addColorStop(0.1, "rgba(255,255,255,0.22)"); hl.addColorStop(0.4, "rgba(255,255,255,0)"); hl.addColorStop(1, "rgba(0,0,0,0.28)"); g.fillStyle = hl; g.fillRect(-R * 1.2, -1.3 * R, 2.4 * R, 1.2 * R); g.restore();
  dome(); inkL(g, 0.06 * R);
  // folded brim band with ribbing
  g.beginPath(); g.moveTo(-w - 0.04 * R, brim + 0.06 * R); g.quadraticCurveTo(0, brim + 0.16 * R, w + 0.04 * R, brim + 0.06 * R); g.lineTo(w + 0.02 * R, brim - 0.2 * R); g.quadraticCurveTo(0, brim - 0.1 * R, -w - 0.02 * R, brim - 0.2 * R); g.closePath();
  g.fillStyle = col; g.fill(); g.save(); g.clip(); g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(-R * 1.2, brim - 0.25 * R, 2.4 * R, 0.4 * R);
  g.strokeStyle = "rgba(0,0,0,0.2)"; g.lineWidth = 0.03 * R; for (let k = -10; k <= 10; k++) { g.beginPath(); g.moveTo(k * 0.1 * R, brim - 0.2 * R); g.lineTo(k * 0.1 * R, brim + 0.15 * R); g.stroke(); } g.restore(); inkL(g, 0.05 * R);
  g.beginPath(); g.arc(0.05 * R, -1.18 * R, 0.17 * R, 0, Math.PI * 2); g.fillStyle = col; g.fill(); g.fillStyle = "rgba(255,255,255,0.18)"; g.beginPath(); g.arc(0, -1.23 * R, 0.07 * R, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(0.05 * R, -1.18 * R, 0.17 * R, 0, Math.PI * 2); inkL(g, 0.045 * R);
  g.restore();
};
/** the coloured sash tied around the robe's waist, with the knot ends hanging on one side */
export const sashEx = (S: CharSpec, col: string, side: -1 | 1 = 1): Ex => (g, P) => {
  const hipY = 975 - S.legLen + P.bob, H = S.bodyH * P.body.sy, bw = (S.bodyW * P.body.sx) / Math.sqrt(P.body.sy), y0 = hipY - H * 0.3;
  g.save(); g.translate(P.x, hipY); g.rotate(P.body.lean); g.translate(-P.x, -hipY);
  const half = bw * 0.47, cx = P.x + P.body.bend * 0.3;
  g.beginPath(); g.moveTo(cx - half, y0 - 14); g.quadraticCurveTo(cx, y0 - 4, cx + half, y0 - 14); g.lineTo(cx + half * 1.01, y0 + 14); g.quadraticCurveTo(cx, y0 + 26, cx - half * 1.01, y0 + 14); g.closePath();
  g.fillStyle = col; g.fill(); g.save(); g.clip(); g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(cx - half, y0 + 6, 2 * half, 24); g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(cx - half, y0 - 12, 2 * half, 6); g.restore(); inkL(g, 4);
  const kx = cx + side * half * 0.55; g.beginPath(); g.moveTo(kx - 8, y0 + 12); g.quadraticCurveTo(kx - 14 * side, y0 + 50, kx - 4 * side, y0 + 82); g.lineTo(kx + 12 * side, y0 + 78); g.quadraticCurveTo(kx + 4, y0 + 46, kx + 10, y0 + 12); g.closePath(); g.fillStyle = col; g.fill(); inkL(g, 4);
  g.beginPath(); g.ellipse(kx, y0 + 6, 13, 11, 0, 0, Math.PI * 2); g.fillStyle = col; g.fill(); inkL(g, 4);
  g.restore();
};
export const both = (...f: (Ex | undefined | false | null)[]): Ex => (g, P) => f.forEach((x) => x && x(g, P));
/** each person's standing outfit extras (hat + sash) */
export const DOLMA_X = both(sashEx(DOLMA, "#d8a838", 1), woolCapEx(DOLMA, "#d49a2a"));
export const TASHI_X = both(sashEx(TASHI, "#e07a2e", -1), tibiEx(TASHI, "#2f6a4a", "#c8742a"));
export const WARGA_A_X = sashEx(WARGA_A, "#e8c440", 1);
export const WARGA_C_X = both(sashEx(WARGA_C, "#9a2a2a", 1), tibiEx(WARGA_C, "#2a2a3a", "#7a4a2a"));
