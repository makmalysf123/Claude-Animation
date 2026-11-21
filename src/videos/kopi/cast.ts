// Cast of "Kopi Mahal Itu Cuma Gengsi?" in the approved toon2 style: plain white faces, hand-drawn head shapes that
// differ per character, clothes that tell who they are. No names are spoken in the film.
import type { CharSpec } from "../../lib/toon2";

const SKIN = "#fbf9f6";
/** the warung owner: greying hair, thin moustache, white singlet-tee, checked sarung */
export const BAPAK: CharSpec = {
  R: 132, bodyW: 206, bodyH: 238, legLen: 330, skin: SKIN, hair: { color: "#6e6862", style: "short" }, moustache: "thin", moustacheColor: "#5a5450", hat: "none",
  head: { bTop: 0.9, bBot: 1.02, nTop: 2.2, nBot: 2.45, drift: -0.06 },
  cloth: { top: "#efe9dc", pattern: "knit", bottom: "#3d5a7a", bottomFrom: 0.62, plaid: ["#3d5a7a", "#8a2f2f", "#e8d9b0"], collar: "round" },
};
/** his wife: hair in a bun, floral-batik house dress */
export const ISTRI: CharSpec = {
  R: 124, bodyW: 196, bodyH: 262, legLen: 318, skin: SKIN, hair: { color: "#2a1d18", style: "bun" }, hat: "none", lashes: true,
  head: { bTop: 0.94, bBot: 0.92, nTop: 2.0, nBot: 2.05, drift: 0.08 },
  cloth: { top: "#b04a5a", pattern: "batik", patternCol: "#f2c46b", collar: "round" },
};
/** the cafe barista: black cap, black apron over a white tee, young and smug */
export const BARISTA: CharSpec = {
  R: 122, bodyW: 172, bodyH: 250, legLen: 372, skin: SKIN, hair: { color: "#191210", style: "fringe" }, hat: "cap", hatColor: "#18181b",
  head: { bTop: 0.98, bBot: 0.88, nTop: 2.6, nBot: 2.0, drift: 0.05 },
  cloth: { top: "#1e1e22", pattern: "stripe", patternCol: "#2e2e34", bottom: "#2a2a2e", bottomFrom: 0.7, collar: "v" },
};
/** the man in the suit: navy suit, loosened tie (drawn), tall */
export const BERJAS: CharSpec = {
  R: 126, bodyW: 190, bodyH: 270, legLen: 380, skin: SKIN, hair: { color: "#1b1512", style: "short" }, hat: "none",
  head: { bTop: 0.92, bBot: 0.96, nTop: 2.3, nBot: 2.6, drift: 0.04 },
  cloth: { top: "#26334f", pattern: "stripe", patternCol: "#33415f", bottom: "#202a42", bottomFrom: 0.72, collar: "v", buttons: 2 },
};
/** the coffee critic: turtleneck, handlebar moustache, round glasses (drawn), short and stern */
export const KRITIKUS: CharSpec = {
  R: 128, bodyW: 200, bodyH: 232, legLen: 300, skin: SKIN, hair: { color: "#3a2a22", style: "short" }, moustache: "handlebar", moustacheColor: "#3a2a22", hat: "none",
  head: { bTop: 0.86, bBot: 1.05, nTop: 2.1, nBot: 2.7, drift: -0.1 },
  cloth: { top: "#6b2a35", pattern: "knit", bottom: "#2c2a30", bottomFrom: 0.7, collar: "round" },
};
/** two gossiping neighbours */
export const TETANGGA1: CharSpec = {
  R: 122, bodyW: 200, bodyH: 255, legLen: 310, skin: SKIN, hair: { color: "#231816", style: "bun" }, hat: "none", lashes: true,
  head: { bTop: 0.9, bBot: 0.98, nTop: 2.1, nBot: 1.95, drift: -0.1 },
  cloth: { top: "#2f7a6e", pattern: "batik", patternCol: "#e9d38a", collar: "v" },
};
export const TETANGGA2: CharSpec = {
  R: 118, bodyW: 186, bodyH: 248, legLen: 316, skin: SKIN, hair: { color: "#3b2a20", style: "long" }, hat: "none", lashes: true,
  head: { bTop: 0.95, bBot: 0.9, nTop: 2.3, nBot: 2.0, drift: 0.09 },
  cloth: { top: "#d9a441", pattern: "stripe", patternCol: "#b8862a", collar: "round" },
};
/** queue extras outside the cafe (varied silhouettes and colours) */
export const ANTRE: CharSpec[] = [
  { R: 120, bodyW: 180, bodyH: 250, legLen: 360, skin: SKIN, hair: { color: "#2a1d14", style: "fringe" }, hat: "none", head: { bTop: 0.95, bBot: 0.9, nTop: 2.4, nBot: 2.1, drift: 0.05 }, cloth: { top: "#e2b04a", pattern: "knit", bottom: "#33405a", bottomFrom: 0.68, collar: "round" } },
  { R: 116, bodyW: 176, bodyH: 255, legLen: 340, skin: SKIN, hair: { color: "#1c1414", style: "long" }, hat: "none", lashes: true, head: { bTop: 0.9, bBot: 0.95, nTop: 2.0, nBot: 2.0, drift: -0.07 }, cloth: { top: "#7fa7c9", pattern: "stripe", patternCol: "#e8eef5", collar: "v" } },
  { R: 126, bodyW: 210, bodyH: 240, legLen: 330, skin: SKIN, hair: { color: "#2b211a", style: "short" }, hat: "cap", hatColor: "#c0392b", head: { bTop: 0.92, bBot: 1.0, nTop: 2.2, nBot: 2.5, drift: 0.02 }, cloth: { top: "#4a7a4a", pattern: "knit", bottom: "#2b2b30", bottomFrom: 0.66, collar: "round" } },
  { R: 118, bodyW: 182, bodyH: 262, legLen: 350, skin: SKIN, hair: { color: "#3a2618", style: "bun" }, hat: "none", lashes: true, head: { bTop: 0.96, bBot: 0.9, nTop: 2.3, nBot: 2.0, drift: 0.1 }, cloth: { top: "#e7e2d6", pattern: "batik", patternCol: "#6b4a8a", collar: "v" } },
  { R: 124, bodyW: 190, bodyH: 245, legLen: 365, skin: SKIN, hair: { color: "#111", style: "fringe" }, hat: "none", head: { bTop: 1.0, bBot: 0.86, nTop: 2.6, nBot: 2.2, drift: -0.04 }, cloth: { top: "#3b3b44", pattern: "stripe", patternCol: "#56565f", bottom: "#6b5a44", bottomFrom: 0.7, collar: "round" } },
];
