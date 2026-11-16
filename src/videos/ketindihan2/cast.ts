// Cast of "Satu Malam Ketindihan" (docs/scripts/ketindihan-v3-produksi.md), all in the approved toon2 style
// (acting test v13): measured head shape, brush ink, soft features, shine + rim.
import type { CharSpec } from "../../lib/toon2";

const SKIN = "#fbf9f6";
export const BUDI: CharSpec = {
  R: 134, bodyW: 196, bodyH: 245, legLen: 345, skin: SKIN, hair: { color: "#1f1512", style: "short" }, moustache: "thin", hat: "peci",
  head: { bTop: 0.9, bBot: 1.0, nTop: 2.05, nBot: 2.25, drift: -0.09 },
  cloth: { top: "#e8dfcb", pattern: "knit", bottom: "#7a2a33", bottomFrom: 0.6, plaid: ["#7a2a33", "#2d3352", "#f0d9a8"], collar: "round" },
};
export const NARTI: CharSpec = {
  R: 126, bodyW: 188, bodyH: 258, legLen: 335, skin: SKIN, hair: { color: "#231816", style: "bun" }, hat: "none",
  head: { bTop: 0.92, bBot: 0.95, nTop: 2.05, nBot: 1.95, drift: -0.11 },
  cloth: { top: "#2f6f78", pattern: "batik", patternCol: "#d9a441", collar: "v" },
};
/** the brain's tired operator: small, cap, orange vest */
export const PETUGAS: CharSpec = {
  R: 118, bodyW: 176, bodyH: 205, legLen: 250, skin: SKIN, hair: { color: "#2a1d14", style: "short" }, hat: "cap", hatColor: "#e0782a",
  head: { bTop: 0.9, bBot: 1.0, nTop: 2.1, nBot: 2.0, drift: -0.08 },
  cloth: { top: "#f08a2c", pattern: "stripe", patternCol: "#fff2c8", bottom: "#3b4a6b", bottomFrom: 0.66, collar: "v", buttons: 2 },
};
/** comic, innocent kuntilanak: long black hair, long white dress (no scary face) */
export const KUNTI: CharSpec = {
  R: 122, bodyW: 182, bodyH: 330, legLen: 230, skin: "#f6f6fb", hair: { color: "#14101a", style: "long" }, hat: "none", rim: "200,215,255",
  head: { bTop: 0.92, bBot: 1.02, nTop: 2.0, nBot: 1.9, drift: -0.1 },
  cloth: { top: "#f4f2ee", pattern: "knit", collar: "round" },
};
export const BAPAK: CharSpec = {
  R: 130, bodyW: 200, bodyH: 240, legLen: 340, skin: SKIN, hair: { color: "#2a2018", style: "short" }, moustache: "handlebar", hat: "none",
  head: { bTop: 0.88, bBot: 1.0, nTop: 2.1, nBot: 2.3, drift: -0.07 },
  cloth: { top: "#3f7a52", pattern: "knit", bottom: "#4a4038", bottomFrom: 0.64, collar: "round" },
};
export const IBU: CharSpec = {
  R: 124, bodyW: 190, bodyH: 255, legLen: 330, skin: SKIN, hair: { color: "#2b1b16", style: "bun" }, hat: "none",
  head: { bTop: 0.92, bBot: 0.96, nTop: 2.05, nBot: 1.95, drift: -0.1 },
  cloth: { top: "#b8545a", pattern: "batik", patternCol: "#f2d39a", collar: "v" },
};
export const IBU2: CharSpec = {
  R: 124, bodyW: 192, bodyH: 255, legLen: 330, skin: SKIN, hair: { color: "#1e1512", style: "fringe" }, hat: "none",
  head: { bTop: 0.92, bBot: 0.96, nTop: 2.05, nBot: 2.0, drift: -0.12 },
  cloth: { top: "#6a5aa8", pattern: "knit", bottom: "#3a3456", bottomFrom: 0.7, collar: "round" },
};
export const BAYI: CharSpec = {
  R: 110, bodyW: 150, bodyH: 120, legLen: 90, skin: "#fff6f2", hat: "none",
  head: { bTop: 0.95, bBot: 1.0, nTop: 2.0, nBot: 2.0, drift: -0.05 },
  cloth: { top: "#bfe1f2", pattern: "knit", collar: "round" },
};

/** the shadow figure: tall soft-edged silhouette, round white eyes (1 = open), drawn in card space (600 x 1000) */
export const drawSosok = (g: CanvasRenderingContext2D, eyes: number, tilt = 0, alpha = 1, yawn = 0) => {
  g.save(); g.globalAlpha = alpha; g.translate(300, 975); g.rotate(tilt); g.translate(-300, -975);
  const body = "#0b0b14";
  g.fillStyle = body; g.beginPath();
  g.moveTo(170, 975); g.bezierCurveTo(150, 700, 175, 420, 215, 330); g.bezierCurveTo(200, 230, 230, 150, 300, 140 - yawn * 40);
  g.bezierCurveTo(370, 150, 400, 230, 385, 330); g.bezierCurveTo(425, 420, 450, 700, 430, 975); g.closePath(); g.fill();
  // long arms hanging
  g.strokeStyle = body; g.lineCap = "round"; g.lineWidth = 26;
  g.beginPath(); g.moveTo(215, 360); g.quadraticCurveTo(150, 560, 160, 760); g.stroke();
  g.beginPath(); g.moveTo(385, 360); g.quadraticCurveTo(450, 560, 440, 760); g.stroke();
  if (eyes > 0.02) for (const x of [262, 338]) { g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(x, 245 - yawn * 30, 26, 30 * eyes, 0, 0, Math.PI * 2); g.fill(); }
  if (yawn > 0.05) { g.fillStyle = "#2a0d18"; g.beginPath(); g.ellipse(300, 300 - yawn * 20, 30, 55 * yawn, 0, 0, Math.PI * 2); g.fill(); }
  g.restore();
};
