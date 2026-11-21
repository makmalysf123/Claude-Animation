// Cast of "Kalau Kamu Nemu Emas Kuno di Halaman Belakang" in the approved toon2 card style (plain white faces, no names).
import type { CharSpec } from "../../lib/toon2";

const SKIN = "#fbf9f6";
/** "kamu": a young man in a faded teal tee and dark shorts, messy short hair, a towel round the neck while digging */
export const KAMU: CharSpec = {
  R: 128, bodyW: 196, bodyH: 246, legLen: 342, skin: SKIN, hair: { color: "#1d1512", style: "fringe" }, hat: "none",
  head: { bTop: 0.96, bBot: 0.94, nTop: 2.3, nBot: 2.25, drift: 0.04 },
  cloth: { top: "#3f8790", pattern: "knit", bottom: "#7a6a4e", bottomFrom: 0.74, collar: "round" },
};
/** your girlfriend (only in the dream): long hair, a pink blouse */
export const PACAR: CharSpec = {
  R: 120, bodyW: 176, bodyH: 250, legLen: 330, skin: SKIN, hair: { color: "#2a1a16", style: "long" }, hat: "none", lashes: true,
  head: { bTop: 0.92, bBot: 0.92, nTop: 2.1, nBot: 1.95, drift: -0.06 },
  cloth: { top: "#ff7aa8", pattern: "knit", bottom: "#f4efe6", bottomFrom: 0.72, collar: "round" },
};
/** the imagined (and later real) police officer: brown uniform, dark cap, broad */
export const POLISI: CharSpec = {
  R: 126, bodyW: 214, bodyH: 250, legLen: 350, skin: SKIN, hair: { color: "#1a1410", style: "short" }, hat: "cap", hatColor: "#3a2c22", moustache: "thin", moustacheColor: "#2a1e18",
  head: { bTop: 0.9, bBot: 1.02, nTop: 2.4, nBot: 2.7, drift: 0.03 },
  cloth: { top: "#8a6e4a", pattern: "knit", bottom: "#4a3a2a", bottomFrom: 0.72, collar: "v", buttons: 3 },
};
/** the imagined robber: black-and-grey striped jumper, a balaclava (drawn over the head in the film) */
export const PERAMPOK: CharSpec = {
  R: 122, bodyW: 190, bodyH: 245, legLen: 345, skin: SKIN, hair: { color: "#111", style: "short" }, hat: "none",
  head: { bTop: 0.98, bBot: 0.9, nTop: 2.2, nBot: 2.1, drift: 0.05 },
  cloth: { top: "#2b2d33", pattern: "stripe", patternCol: "#5a5d66", bottom: "#1f2026", bottomFrom: 0.7, collar: "round" },
};
/** the "buyer" (an undercover officer): neat light-blue shirt, slick hair, glasses and tie drawn in the film */
export const INTEL: CharSpec = {
  R: 124, bodyW: 186, bodyH: 262, legLen: 370, skin: SKIN, hair: { color: "#14100e", style: "short" }, hat: "none",
  head: { bTop: 0.94, bBot: 0.98, nTop: 2.5, nBot: 2.4, drift: -0.03 },
  cloth: { top: "#a9c8ec", pattern: "stripe", patternCol: "#c4daf2", bottom: "#2a3346", bottomFrom: 0.72, collar: "v", buttons: 3 },
};
/** the jewellery-shop owner: older, greying, thin moustache, red-and-gold batik shirt */
export const PEMILIK: CharSpec = {
  R: 132, bodyW: 214, bodyH: 240, legLen: 320, skin: SKIN, hair: { color: "#8a847e", style: "short" }, moustache: "thin", moustacheColor: "#6a6460", hat: "none",
  head: { bTop: 0.88, bBot: 1.04, nTop: 2.2, nBot: 2.5, drift: -0.05 },
  cloth: { top: "#a8202c", pattern: "batik", patternCol: "#f2c14e", collar: "round", buttons: 3 },
};
