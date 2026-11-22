// Cast of "Garam di Pohon Kelapa" in the toon2 card style: plain white faces, men and women mixed, clothes that tell who
// they are. Heads are SMALLER than in earlier films (user request 2026-11-22): R ~98 instead of ~125.
import type { CharSpec } from "../../lib/toon2";

const SKIN = "#fbf9f6";
/** Pak Darman: the coconut farmer, 50s, grey-black hair under a woven caping (drawn), a faded green tee, rolled sarung */
export const DARMAN: CharSpec = {
  R: 98, bodyW: 204, bodyH: 250, legLen: 330, skin: SKIN, hair: { color: "#4a4440", style: "short" }, moustache: "thin", moustacheColor: "#3a3430", hat: "none",
  head: { bTop: 0.92, bBot: 1.0, nTop: 2.3, nBot: 2.5, drift: -0.05 },
  cloth: { top: "#5f8a4a", pattern: "knit", bottom: "#6a4a3a", bottomFrom: 0.7, plaid: ["#6a4a3a", "#3a2a24", "#c8a86a"], collar: "round" },
};
/** Pak Karto: the neighbour who mocks him, thin, black peci, a checked shirt, dark trousers, a hoe on his shoulder */
export const KARTO: CharSpec = {
  R: 96, bodyW: 182, bodyH: 248, legLen: 350, skin: SKIN, hair: { color: "#1c1512", style: "short" }, hat: "peci", hatColor: "#1d1a1c",
  head: { bTop: 0.98, bBot: 0.92, nTop: 2.6, nBot: 2.2, drift: 0.05 },
  cloth: { top: "#c8a040", pattern: "stripe", patternCol: "#a8382a", bottom: "#2e3440", bottomFrom: 0.72, collar: "v", buttons: 4 },
};
/** Bu Warung: the shop owner, hair in a bun, a batik house dress */
export const WARUNG_BU: CharSpec = {
  R: 96, bodyW: 214, bodyH: 262, legLen: 300, skin: SKIN, hair: { color: "#231816", style: "bun" }, hat: "none", lashes: true,
  head: { bTop: 0.9, bBot: 0.98, nTop: 2.1, nBot: 1.95, drift: -0.1 },
  cloth: { top: "#a8402a", pattern: "batik", patternCol: "#f0d08a", collar: "round" },
};
/** the young mother who finds the salt gone: fringe hair, a pink tee, a long skirt */
export const IBU: CharSpec = {
  R: 94, bodyW: 180, bodyH: 250, legLen: 344, skin: SKIN, hair: { color: "#1c1414", style: "long" }, hat: "none", lashes: true,
  head: { bTop: 0.92, bBot: 0.95, nTop: 2.0, nBot: 2.0, drift: -0.07 },
  cloth: { top: "#f07fa6", pattern: "knit", bottom: "#3a4a6a", bottomFrom: 0.62, collar: "round" },
};
/** Pak Darman's younger brother on the coast: a cap, a blue striped tee, shorts */
export const ADIK: CharSpec = {
  R: 96, bodyW: 196, bodyH: 244, legLen: 340, skin: SKIN, hair: { color: "#1a1410", style: "fringe" }, hat: "cap", hatColor: "#2a62b8",
  head: { bTop: 0.94, bBot: 0.96, nTop: 2.2, nBot: 2.3, drift: 0.04 },
  cloth: { top: "#3a7ac8", pattern: "stripe", patternCol: "#f2f0ea", bottom: "#c8b48a", bottomFrom: 0.74, collar: "round" },
};
/** the coconut buyer (tengkulak): broad, a red cap, a white polo, dark trousers */
export const TENGKULAK: CharSpec = {
  R: 98, bodyW: 236, bodyH: 248, legLen: 316, skin: SKIN, hair: { color: "#1c1512", style: "short" }, hat: "cap", hatColor: "#c8302a", moustache: "handlebar", moustacheColor: "#1c1512",
  head: { bTop: 0.96, bBot: 0.92, nTop: 2.1, nBot: 2.0, drift: 0.06 },
  cloth: { top: "#f1eee6", pattern: "knit", bottom: "#2b2f3a", bottomFrom: 0.74, collar: "v", buttons: 2 },
};
