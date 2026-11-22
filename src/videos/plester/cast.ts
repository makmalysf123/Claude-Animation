// Cast of "Pak Jaya dan Plester Tembok" (the user's own story) in the approved toon2 card style: plain white faces,
// hand-drawn head shapes that differ per character, clothes that tell who they are, men and women mixed.
import type { CharSpec } from "../../lib/toon2";

const SKIN = "#fbf9f6";
/** Pak Jaya: an older man, black peci over grey hair, grey moustache, a brown checked shirt, dark trousers */
export const JAYA: CharSpec = {
  R: 130, bodyW: 200, bodyH: 244, legLen: 322, skin: SKIN, hair: { color: "#9a948c", style: "short" }, moustache: "thin", moustacheColor: "#8a847e", hat: "peci", hatColor: "#1d1a1c",
  head: { bTop: 0.92, bBot: 1.0, nTop: 2.3, nBot: 2.5, drift: -0.05 },
  cloth: { top: "#8a5a3a", pattern: "stripe", patternCol: "#b07c52", bottom: "#34343c", bottomFrom: 0.74, collar: "v", buttons: 3 },
};
/** the bakso seller: round and cheerful, fringe hair, a white tee, a towel over the shoulder (drawn), dark shorts */
export const BAKSO: CharSpec = {
  R: 128, bodyW: 226, bodyH: 236, legLen: 300, skin: SKIN, hair: { color: "#1c1512", style: "fringe" }, hat: "cap", hatColor: "#d42a2a",
  head: { bTop: 0.96, bBot: 0.92, nTop: 2.1, nBot: 2.0, drift: 0.06 },
  cloth: { top: "#f1eee6", pattern: "knit", bottom: "#3b4658", bottomFrom: 0.78, collar: "round" },
};
/** the structural engineer: a woman, hair in a bun under a yellow hard hat (drawn), an orange safety vest */
export const INSINYUR: CharSpec = {
  R: 122, bodyW: 184, bodyH: 256, legLen: 352, skin: SKIN, hair: { color: "#2a1c16", style: "bun" }, hat: "none", lashes: true,
  head: { bTop: 0.94, bBot: 0.9, nTop: 2.2, nBot: 2.05, drift: 0.07 },
  cloth: { top: "#ff7a1a", pattern: "stripe", patternCol: "#ff9440", bottom: "#2d3a52", bottomFrom: 0.72, collar: "v", buttons: 2 },
};
/** the market manager: slick hair, a pale-blue office shirt, an ID lanyard (drawn), navy trousers */
export const PENGELOLA: CharSpec = {
  R: 126, bodyW: 196, bodyH: 258, legLen: 352, skin: SKIN, hair: { color: "#15110f", style: "short" }, hat: "none",
  head: { bTop: 0.98, bBot: 0.92, nTop: 2.6, nBot: 2.3, drift: 0.03 },
  cloth: { top: "#b8cfe6", pattern: "stripe", patternCol: "#cbdcee", bottom: "#263048", bottomFrom: 0.72, collar: "v", buttons: 4 },
};
/** market vendors (the laugh, the turning heads) */
export const SAYUR: CharSpec = { // the vegetable seller: bun, green batik
  R: 124, bodyW: 206, bodyH: 250, legLen: 306, skin: SKIN, hair: { color: "#231816", style: "bun" }, hat: "none", lashes: true,
  head: { bTop: 0.9, bBot: 0.98, nTop: 2.1, nBot: 1.95, drift: -0.1 },
  cloth: { top: "#2f7a5e", pattern: "batik", patternCol: "#e9d38a", collar: "round" },
};
export const IKAN: CharSpec = { // the fish seller: blue cap, striped tee, rubber-apron colours
  R: 126, bodyW: 210, bodyH: 240, legLen: 330, skin: SKIN, hair: { color: "#2b211a", style: "short" }, hat: "cap", hatColor: "#2a62b8",
  head: { bTop: 0.92, bBot: 1.0, nTop: 2.2, nBot: 2.5, drift: 0.02 },
  cloth: { top: "#d94b3d", pattern: "stripe", patternCol: "#f2f0ea", bottom: "#2b2b30", bottomFrom: 0.66, collar: "round" },
};
export const BUAH: CharSpec = { // the fruit seller: long hair, a yellow blouse
  R: 118, bodyW: 182, bodyH: 252, legLen: 336, skin: SKIN, hair: { color: "#3b2a20", style: "long" }, hat: "none", lashes: true,
  head: { bTop: 0.95, bBot: 0.9, nTop: 2.3, nBot: 2.0, drift: 0.09 },
  cloth: { top: "#e8b23a", pattern: "knit", bottom: "#6b4a3a", bottomFrom: 0.7, collar: "v" },
};
export const KELONTONG: CharSpec = { // the grocer: a thin old man, white singlet-tee, checked sarung
  R: 124, bodyW: 186, bodyH: 238, legLen: 318, skin: SKIN, hair: { color: "#d8d4ce", style: "short" }, hat: "none",
  head: { bTop: 0.88, bBot: 1.04, nTop: 2.2, nBot: 2.6, drift: -0.04 },
  cloth: { top: "#ece6d8", pattern: "knit", bottom: "#3d5a7a", bottomFrom: 0.62, plaid: ["#3d5a7a", "#8a2f2f", "#e8d9b0"], collar: "round" },
};
export const PEMBELI: CharSpec = { // a shopper: bob of fringe hair, a pink tee
  R: 120, bodyW: 180, bodyH: 248, legLen: 348, skin: SKIN, hair: { color: "#1c1414", style: "fringe" }, hat: "none", lashes: true,
  head: { bTop: 0.92, bBot: 0.95, nTop: 2.0, nBot: 2.0, drift: -0.07 },
  cloth: { top: "#f07fa6", pattern: "knit", bottom: "#33405a", bottomFrom: 0.7, collar: "round" },
};
