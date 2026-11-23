// Sets for "Menara Es Dolma". Everything is 3D (downloaded models + procedural textured buildings); only people are cards.
// LembahSet: a Ladakhi village on a cold-desert valley floor, with snow peaks all around.
// Layout in metres. The camera mostly looks north (-z) toward the big range; the low sun comes from the south-east.
//   STUPA          the ice cone, with its standing pipe through the middle, at (0, 0, -8)
//   Dolma's field  terraced plots south of the stupa: x 1..11, z -3..9; the meltwater channel runs down it
//   Tashi's field  west of the stone boundary wall (x = -3.5): x -17..-5, z -15..7 (his flat ice sheet covers it)
//   the lane       runs north-south at x = 16, with houses on both sides and the tea stall at (17.5, -3)
//   the stream     snakes down at x ~ 25; the buried pipe runs from upstream (22, -46) to the stupa
//   the hill       rises north of z -30; the snow range ring is 200+ m out
// Season options: winter (snow patches, frozen stream edges), march (thawing, mud), april (dry, cracked fields).
import * as THREE from "three";
import { canvasTex } from "../ketindihan2/sets";
import { fbm, rnd, seedRnd } from "../../lib/world2/textures";
import { M } from "../emas/props";
import { mdl, recolor } from "./models";

export type V3 = [number, number, number];
export type Season = "winter" | "march" | "april";
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const sstep = (a: number, b: number, x: number) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const n2 = (x: number, z: number) => 0.5 + 0.25 * Math.sin(x * 0.041 + z * 0.023) + 0.15 * Math.sin(x * 0.13 - z * 0.09 + 1.3) + 0.1 * Math.sin(x * 0.31 + z * 0.27 + 2.1);
const ridge = (x: number, z: number) => { let s = 0, a = 1, f = 0.008; for (let i = 0; i < 5; i++) { s += a * (1 - Math.abs(Math.sin(x * f + i * 1.7) * Math.cos(z * f * 1.13 + i * 2.3))); a *= 0.5; f *= 2.1; } return s / 1.9; };

export const STUPA = V(0, 0, -8), STUPA_R = 3.0, STUPA_HMAX = 6.6;
export const DOLMA_FIELD = { x0: 1, x1: 11, z0: -3, z1: 9 };
export const TASHI_FIELD = { x0: -17, x1: -5, z0: -15, z1: 7 };
export const WALL_X = -3.5, LANE_X = 20, STALL = V(22.6, 0, -7);
/** Dolma's house: east of her field, its front (with the thermometer) faces west toward the field */
export const DOLMA_HOUSE = V(15.6, 0, 3.5);
export const GATE = V(-5.2, 0, -14.2);
/** the explanation pit: exactly one ground cell (1300 m / 340 cells), so cutting it out leaves a clean square hole */
const CELL = 1300 / 340;
export const PIT = { x0: CELL, x1: 2 * CELL, z0: -4 * CELL, z1: -3 * CELL, d: 2.6 }; // Tashi's sluice gate at the top corner of his field
/** the channel from the stupa base down through Dolma's field (meltwater runs along it) */
export const CHANNEL = new THREE.CatmullRomCurve3([V(1.6, 0, -5.6), V(3.2, 0, -2.6), V(4.4, 0, 0.6), V(5.2, 0, 4), V(6.4, 0, 8.6)]);
export const streamX = (z: number) => 33 + 3.5 * Math.sin(z * 0.045) + 1.5 * Math.sin(z * 0.11 + 1);
/** the buried pipe from the stream upstream to the foot of the stupa */
export const PIPE = new THREE.CatmullRomCurve3([V(streamX(-58) - 1.2, 0, -58), V(22, 0, -46), V(12, 0, -32), V(5, 0, -18), V(0.6, 0, -9.2)]);
/** ground height: a flat valley floor where people act, the hill to the north, side slopes, the snow range far out */
/** footprints of every building (houses, tea stall, chorten): scattered rocks and trees keep 6 m away */
const BUILDINGS: [number, number][] = [[15.6, 3.5], [-23, -2], [26, 6], [26, 16], [14.5, 15], [-3, 25], [-14, 26], [26, 27], [-27, 14], [23.6, -17], [14.5, -16], [-32, -24], [21, -40], [-8, -46], [6, 38], [-22, 34], [40, -4], [42, 18], [22.6, -7], [14, -24]];
const nearBuilding = (x: number, z: number) => BUILDINGS.some(([bx, bz]) => Math.hypot(x - bx, z - bz) < 6);
export const heightAt = (x: number, z: number) => {
  const d = Math.hypot(x * 0.9, z);
  return sstep(34, 160, -z) * (3 + 13 * n2(x, z)) + sstep(60, 190, Math.abs(x)) * (6 + 22 * n2(z, x)) + sstep(55, 190, z) * (5 + 16 * n2(x + 40, z))
    + sstep(230, 470, d) * (60 + 430 * ridge(x, z)) * (1 + 0.45 * sstep(0, 1, -z / Math.max(1, d)));
};
PIPE.points.forEach((p) => (p.y = heightAt(p.x, p.z)));

// ---------------- textures ----------------
const soilTex = (base: [number, number, number], key: number, pebbles = 1800) => { const t = canvasTex(1024, 1024, (g) => {
  for (let y = 0; y < 1024; y += 4) for (let x = 0; x < 1024; x += 4) { const n = fbm(x + key, y, 1024, 10, 5), m = fbm(x + 300 + key, y + 77, 1024, 3, 3);
    let r = base[0] + 46 * n, gg = base[1] + 40 * n, b = base[2] + 34 * n; if (m > 0.2) { const k = Math.min(1, (m - 0.2) * 3); r -= 22 * k; gg -= 18 * k; b -= 10 * k; } // greyer gravel patches
    g.fillStyle = `rgb(${r | 0},${gg | 0},${b | 0})`; g.fillRect(x, y, 4, 4); }
  for (let i = 0; i < pebbles; i++) { const x = rnd() * 1024, y = rnd() * 1024, r = 1 + rnd() * 4, k = rnd(); const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.4, 0, x, y, r);
    gr.addColorStop(0, `rgb(${200 + 40 * k},${188 + 30 * k},${170 + 30 * k})`); gr.addColorStop(1, `rgb(${96 + 30 * k},${86 + 24 * k},${76 + 20 * k})`); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * (0.6 + 0.4 * rnd()), rnd() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 260; i++) { const x = rnd() * 1024, y = rnd() * 1024; g.strokeStyle = `rgba(${rnd() > 0.5 ? "120,104,70" : "170,150,100"},0.6)`; g.lineWidth = 1.4; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 10, y - 4 - rnd() * 8); g.stroke(); } } // dry tufts
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
const groundT = soilTex([150, 128, 98], 0);
/** a ploughed field: furrows along the plot, clods, a little straw */
const fieldTex = (dark: number, cracks: boolean) => { const t = canvasTex(512, 512, (g) => {
  for (let y = 0; y < 512; y += 2) for (let x = 0; x < 512; x += 2) { const n = fbm(x, y, 512, 12, 5), fur = 0.5 + 0.5 * Math.sin(y * 0.39 + 1.5 * fbm(x, 0, 512, 6, 2));
    const v = (1 - dark) * (126 + 40 * n) + dark * (86 + 34 * n) - 26 * fur; g.fillStyle = `rgb(${(v * 1.08) | 0},${(v * 0.9) | 0},${(v * 0.72) | 0})`; g.fillRect(x, y, 2, 2); }
  for (let i = 0; i < 900; i++) { const x = rnd() * 512, y = rnd() * 512, r = 1 + rnd() * 3; g.fillStyle = `rgba(${rnd() > 0.5 ? "60,44,30" : "190,170,140"},0.5)`; g.beginPath(); g.ellipse(x, y, r * 1.4, r, 0, 0, 7); g.fill(); }
  for (let i = 0; i < 120; i++) { g.strokeStyle = "rgba(220,200,140,0.55)"; g.lineWidth = 1; const x = rnd() * 512, y = rnd() * 512; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 16, y + (rnd() - 0.5) * 6); g.stroke(); }
  if (cracks) { g.strokeStyle = "rgba(40,28,20,0.75)"; for (let i = 0; i < 70; i++) { let x = rnd() * 512, y = rnd() * 512; g.lineWidth = 1 + rnd() * 1.6; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 7; k++) { x += (rnd() - 0.5) * 30; y += (rnd() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); } }
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
const fieldT = fieldTex(0, false), fieldDryT = fieldTex(0, true), fieldWetT = fieldTex(1, false);
/** whitewashed mud plaster: uneven white, grey rain streaks, a brown splash band near the ground */
const plasterT = (() => { const t = canvasTex(512, 512, (g) => {
  for (let y = 0; y < 512; y += 2) for (let x = 0; x < 512; x += 2) { const n = fbm(x, y, 512, 8, 5), s = fbm(x * 3, y * 0.3, 512, 6, 3); const v = 236 + 16 * n - (s > 0.25 ? 22 * (s - 0.25) * 4 : 0); g.fillStyle = `rgb(${v | 0},${(v - 4) | 0},${(v - 12) | 0})`; g.fillRect(x, y, 2, 2); }
  for (let i = 0; i < 40; i++) { const x = rnd() * 512; const gr = g.createLinearGradient(x, 0, x, 512); gr.addColorStop(0, "rgba(140,130,120,0)"); gr.addColorStop(0.5, "rgba(140,130,120,0.12)"); gr.addColorStop(1, "rgba(140,130,120,0)"); g.fillStyle = gr; g.fillRect(x, rnd() * 200, 2 + rnd() * 5, 300); }
  g.strokeStyle = "rgba(110,100,90,0.35)"; for (let i = 0; i < 14; i++) { let x = rnd() * 512, y = rnd() * 512; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 18; y += rnd() * 14; g.lineTo(x, y); } g.stroke(); }
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; })();
const mudT = soilTex([146, 112, 82], 90, 400);
/** the brushwood parapet stacked along Ladakhi roof edges */
const twigT = (() => { const t = canvasTex(512, 128, (g) => { g.fillStyle = "#4a3424"; g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 1600; i++) { const x = rnd() * 512, y = rnd() * 128, l = 6 + rnd() * 22, a = (rnd() - 0.5) * 0.5; g.strokeStyle = `rgb(${(90 + 70 * rnd()) | 0},${(64 + 50 * rnd()) | 0},${(40 + 30 * rnd()) | 0})`; g.lineWidth = 1 + rnd() * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? "200,170,120" : "30,20,14"},0.7)`; g.beginPath(); g.arc(rnd() * 512, rnd() * 128, 1 + rnd() * 2, 0, 7); g.fill(); }
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
/** a Ladakhi window: black trapezoid frame, stacked painted lintels above, small panes with a dim room behind */
const windowT = (lit: boolean) => canvasTex(256, 320, (g) => {
  g.clearRect(0, 0, 256, 320);
  const cols = ["#8a2a24", "#2a5a8a", "#2f7a4a", "#d8a040"];
  for (let i = 0; i < 4; i++) { g.fillStyle = cols[i]; g.fillRect(28 - i * 4, 8 + i * 16, 200 + i * 8, 14); g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(28 - i * 4, 19 + i * 16, 200 + i * 8, 3);
    if (i === 1) for (let k = 0; k < 14; k++) { g.fillStyle = "#e8d8a8"; g.fillRect(34 + k * 14, 28, 6, 6); } }
  g.fillStyle = "#151112"; g.beginPath(); g.moveTo(48, 76); g.lineTo(208, 76); g.lineTo(236, 314); g.lineTo(20, 314); g.closePath(); g.fill(); // black frame (wider at the bottom)
  g.fillStyle = "#5a3a24"; g.fillRect(74, 92, 108, 196);
  const gr = g.createLinearGradient(0, 100, 0, 280); if (lit) { gr.addColorStop(0, "#f8c878"); gr.addColorStop(1, "#c87a38"); } else { gr.addColorStop(0, "#3a4656"); gr.addColorStop(1, "#1c2028"); }
  g.fillStyle = gr; for (const [x, y] of [[80, 98], [130, 98], [80, 194], [130, 194]]) g.fillRect(x, y, 46, 88);
  if (!lit) { g.fillStyle = "rgba(200,220,255,0.28)"; for (const [x, y] of [[80, 98], [130, 98], [80, 194], [130, 194]]) { g.beginPath(); g.moveTo(x, y + 40); g.lineTo(x + 30, y); g.lineTo(x + 40, y); g.lineTo(x, y + 58); g.fill(); } }
  g.fillStyle = "#8a2a24"; g.fillRect(70, 288, 116, 10);
});
const winDay = windowT(false), winLit = windowT(true);
const doorT = canvasTex(160, 256, (g) => { g.fillStyle = "#151112"; g.fillRect(0, 0, 160, 256); g.fillStyle = "#6a4428"; g.fillRect(14, 30, 64, 222); g.fillRect(82, 30, 64, 222);
  g.strokeStyle = "rgba(30,18,10,0.6)"; g.lineWidth = 2; for (let y = 40; y < 250; y += 18) { g.beginPath(); g.moveTo(14, y); g.lineTo(146, y); g.stroke(); } g.fillStyle = "#c8a040"; g.beginPath(); g.arc(74, 140, 4, 0, 7); g.arc(86, 140, 4, 0, 7); g.fill();
  const c = ["#8a2a24", "#2a5a8a", "#2f7a4a"]; for (let i = 0; i < 3; i++) { g.fillStyle = c[i]; g.fillRect(0, i * 9, 160, 8); } });
/** ice skin: milky white with blue depth, vertical drip streaks, trapped bubbles */
const iceT = (() => { const t = canvasTex(512, 1024, (g) => {
  for (let y = 0; y < 1024; y += 2) for (let x = 0; x < 512; x += 2) { const n = fbm(x, y, 512, 8, 5), st = fbm(x * 6, y * 0.25, 512, 10, 3); const w = 0.55 + 0.35 * n + 0.25 * st;
    g.fillStyle = `rgb(${(170 + 80 * w) | 0},${(200 + 52 * w) | 0},${(222 + 33 * w) | 0})`; g.fillRect(x, y, 2, 2); }
  for (let i = 0; i < 900; i++) { const x = rnd() * 512, y = rnd() * 1024, r = 0.8 + rnd() * 2.2; g.fillStyle = "rgba(255,255,255,0.7)"; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  for (let i = 0; i < 60; i++) { const x = rnd() * 512; const gr = g.createLinearGradient(x - 6, 0, x + 6, 0); gr.addColorStop(0, "rgba(90,150,200,0)"); gr.addColorStop(0.5, "rgba(90,150,200,0.35)"); gr.addColorStop(1, "rgba(90,150,200,0)"); g.fillStyle = gr; g.fillRect(x - 6, rnd() * 1024, 12, 80 + rnd() * 300); }
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; })();
/** flat sheet ice: clear grey-blue with white cracks and frozen bubbles; also the melt-noise mask in the alpha channel */
const sheetT = (() => { const t = canvasTex(1024, 1024, (g) => {
  for (let y = 0; y < 1024; y += 4) for (let x = 0; x < 1024; x += 4) { const n = fbm(x, y, 1024, 6, 5); g.fillStyle = `rgb(${(178 + 50 * n) | 0},${(204 + 36 * n) | 0},${(222 + 26 * n) | 0})`; g.fillRect(x, y, 4, 4); }
  g.strokeStyle = "rgba(255,255,255,0.75)"; for (let i = 0; i < 90; i++) { let x = rnd() * 1024, y = rnd() * 1024; g.lineWidth = 0.8 + rnd() * 1.6; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 80; y += (rnd() - 0.5) * 80; g.lineTo(x, y); } g.stroke(); }
  for (let i = 0; i < 1500; i++) { g.fillStyle = "rgba(255,255,255,0.55)"; g.beginPath(); g.arc(rnd() * 1024, rnd() * 1024, 0.8 + rnd() * 2.5, 0, 7); g.fill(); }
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; })();
/** melt order for the flat ice: low = melts first. Edges and thin spots go first, a few islands last. */
const meltT = (() => { const t = canvasTex(256, 256, (g) => { const id = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const e = Math.min(x, y, 255 - x, 255 - y) / 128, n = fbm(x, y, 256, 5, 4), v = Math.max(0, Math.min(1, 0.15 + 0.55 * Math.pow(e, 0.6) + 0.5 * (n - 0.5)));
    const i = (y * 256 + x) * 4; id.data[i] = id.data[i + 1] = id.data[i + 2] = v * 255; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0); }); t.colorSpace = THREE.NoColorSpace; return t; })();
const waterT = (() => { const t = canvasTex(256, 256, (g) => { for (let y = 0; y < 256; y += 2) for (let x = 0; x < 256; x += 2) { const n = fbm(x, y * 3, 256, 8, 4); g.fillStyle = `rgb(${(70 + 60 * n) | 0},${(96 + 60 * n) | 0},${(110 + 60 * n) | 0})`; g.fillRect(x, y, 2, 2); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
const roundAlpha = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 10, 64, 64, 62); gr.addColorStop(0, "#fff"); gr.addColorStop(0.65, "#ccc"); gr.addColorStop(1, "#000"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
const stripAlpha = canvasTex(256, 64, (g) => { const id = g.createImageData(256, 64); for (let y = 0; y < 64; y++) for (let x = 0; x < 256; x++) { const e = Math.min(y, 63 - y) / 32, a = sstep(0.05, 0.55 + 0.25 * fbm(x, y * 3, 256, 8, 3), e), i = (y * 256 + x) * 4; id.data[i] = id.data[i + 1] = id.data[i + 2] = 255 * a; id.data[i + 3] = 255; } g.putImageData(id, 0, 0); });
stripAlpha.wrapS = THREE.RepeatWrapping;

// ---------------- snow on any surface ----------------
/** adds snow to a standard material: patchy on the valley floor (amount uSnow), full on high ground, only on surfaces
 *  that face up. Uses world position, so the same patches line up across the ground, fields, roofs and rocks. */
export const snowify = (m: THREE.MeshStandardMaterial, U: { value: number }, high = true) => {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uSnow = U;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vSW; varying vec3 vSN;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvSW = (modelMatrix * vec4(transformed, 1.0)).xyz; vSN = normalize(mat3(modelMatrix) * objectNormal);");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
      uniform float uSnow; varying vec3 vSW; varying vec3 vSN;
      float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
      float fb(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }`)
      .replace("#include <map_fragment>", `#include <map_fragment>
      { float up = smoothstep(0.45, 0.85, vSN.y); float n = fb(vSW.xz * 0.18) + 0.35 * fb(vSW.xz * 1.7);
        float low = smoothstep(1.02 - uSnow, 1.1 - uSnow, n) * up;
        float hi = ${high ? "smoothstep(55.0, 100.0, vSW.y + 50.0 * (n - 0.5)) * smoothstep(0.15, 0.5, vSN.y) + smoothstep(200.0, 260.0, vSW.y) * 0.9" : "0.0"};
        float s = clamp(max(low, hi), 0.0, 1.0);
        vec3 snow = mix(vec3(0.78, 0.84, 0.95), vec3(0.97, 0.98, 1.0), smoothstep(0.3, 0.9, n));
        diffuseColor.rgb = mix(diffuseColor.rgb, snow, s); }`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.55, 0.0);");
  };
  m.customProgramCacheKey = () => "snow" + (high ? 1 : 0);
  return m;
};

// ---------------- helpers ----------------
/** many copies of a downloaded model as instanced meshes */
export const scatter = (R: THREE.Object3D, name: string, pts: { x: number; y?: number; z: number; s: number; r: number; tilt?: number }[], o: { cast?: boolean; tint?: string; snow?: { value: number }; flat?: boolean; sxz?: number } = {}) => {
  const src = mdl(name); src.updateMatrixWorld(true); const out: THREE.InstancedMesh[] = [];
  src.traverse((m) => { const me = m as THREE.Mesh; if (!me.isMesh) return; let mt = me.material as THREE.Material; if (o.tint || o.snow) { mt = (mt as THREE.MeshStandardMaterial).clone(); if (o.tint) (mt as THREE.MeshStandardMaterial).color.set(o.tint); if (o.flat) { (mt as THREE.MeshStandardMaterial).map = null; (mt as THREE.MeshStandardMaterial).roughness = 0.95; } if (o.snow) snowify(mt as THREE.MeshStandardMaterial, o.snow, false); }
    const im = new THREE.InstancedMesh(me.geometry, mt, pts.length); const T = new THREE.Matrix4(), q = new THREE.Quaternion();
    pts.forEach((p, i) => { q.setFromEuler(new THREE.Euler(p.tilt ?? 0, p.r, (p.tilt ?? 0) * 0.7)); T.compose(V(p.x, p.y ?? heightAt(p.x, p.z), p.z), q, V(p.s * (o.sxz ?? 1), p.s, p.s * (o.sxz ?? 1))).multiply(me.matrixWorld); im.setMatrixAt(i, T); });
    im.castShadow = o.cast ?? true; im.receiveShadow = true; R.add(im); out.push(im); });
  return out;
};
/** a flat decal on the ground (y offset avoids z-fighting via polygonOffset) */
const decal = (R: THREE.Object3D, w: number, d: number, m: THREE.Material, x: number, z: number, rot = 0, y = 0.01) => { const o = M(new THREE.PlaneGeometry(w, d), m, [x, y, z], [-Math.PI / 2, 0, rot]); o.castShadow = false; R.add(o); return o; };
/** a ribbon along a curve on the ground (paths, channels, the trench) */
export const ribbon = (curve: THREE.Curve<THREE.Vector3>, width: number, seg: number, m: THREE.Material, lift = 0.02, follow = true) => {
  const pos: number[] = [], uv: number[] = [], idx: number[] = []; const L = curve.getLength();
  for (let i = 0; i <= seg; i++) { const u = i / seg, p = curve.getPointAt(u), tg = curve.getTangentAt(u), n = V(-tg.z, 0, tg.x).normalize();
    for (const s of [-1, 1]) { const q = p.clone().addScaledVector(n, (s * width) / 2); pos.push(q.x, (follow ? heightAt(q.x, q.z) : 0) + lift, q.z); uv.push((u * L) / width, s < 0 ? 0 : 1); }
    if (i < seg) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  m.side = THREE.DoubleSide; /* the strip's winding faces down for curves running +z; render both sides */
  const o = new THREE.Mesh(g, m); o.receiveShadow = true; return o;
};

// ---------------- buildings ----------------
const plasterM = (U: { value: number }) => { const m = new THREE.MeshStandardMaterial({ map: plasterT, roughness: 0.92 }); return m; void U; };
/** a whitewashed Ladakhi house: tapering walls, brown splash band, painted trapezoid windows, brushwood parapet,
 *  firewood and fodder on the flat roof, prayer flag poles at the corners. Front faces +z of the local frame. */
export const ladakhHouse = (w: number, d: number, floors: number, seed: number, o: { lit?: boolean; snow: { value: number } }) => {
  const G = new THREE.Group(), H = floors * 2.9, k = 0.965; seedRnd(seed);
  const geo = new THREE.BoxGeometry(w, H, d, 1, 1, 1); const pa = geo.attributes.position; for (let i = 0; i < pa.count; i++) if (pa.getY(i) > 0) { pa.setX(i, pa.getX(i) * k); pa.setZ(i, pa.getZ(i) * k); } geo.translate(0, H / 2, 0); geo.computeVertexNormals();
  const uvs = geo.attributes.uv; for (let i = 0; i < uvs.count; i++) uvs.setXY(i, uvs.getX(i) * w * 0.3, uvs.getY(i) * H * 0.3);
  const wall = plasterM(o.snow); const body = M(geo, wall); G.add(body);
  // brown mud splash band near the ground
  const band = M(new THREE.BoxGeometry(w + 0.04, 0.42, d + 0.04), new THREE.MeshStandardMaterial({ map: mudT, color: "#b89a7a", roughness: 1 }), [0, 0.21, 0]); G.add(band);
  // roof slab + brushwood parapet (with a thin snow cap in winter via snowify)
  const roofM = snowify(new THREE.MeshStandardMaterial({ map: mudT, color: "#a88a6a", roughness: 1 }), o.snow, false);
  G.add(M(new THREE.BoxGeometry(w * k + 0.2, 0.16, d * k + 0.2), roofM, [0, H + 0.08, 0]));
  const tw = twigT.clone(); tw.repeat.set(w / 1.6, 1); tw.needsUpdate = true; const tm = snowify(new THREE.MeshStandardMaterial({ map: tw, roughness: 1 }), o.snow, false);
  for (const [sx, sz, len, rot] of [[0, 1, w, 0], [0, -1, w, 0], [1, 0, d, Math.PI / 2], [-1, 0, d, Math.PI / 2]] as const) {
    const p = M(new THREE.BoxGeometry(len * k + 0.24, 0.38, 0.34), tm, [sx * (w * k / 2 + 0.02), H + 0.35, sz * (d * k / 2 + 0.02)], [0, rot, 0]); G.add(p); }
  // red-brown painted band just under the parapet
  G.add(M(new THREE.BoxGeometry(w * k + 0.06, 0.16, d * k + 0.06), new THREE.MeshStandardMaterial({ color: "#7a3424", roughness: 0.9 }), [0, H - 0.12, 0]));
  // windows: front and sides, per floor
  const wm = new THREE.MeshStandardMaterial({ map: o.lit ? winLit : winDay, transparent: true, alphaTest: 0.3, roughness: 0.5, emissive: o.lit ? "#ffb060" : "#000000", emissiveMap: o.lit ? winLit : null, emissiveIntensity: o.lit ? 0.9 : 0, polygonOffset: true, polygonOffsetFactor: -2 });
  const win = (x: number, y: number, z: number, ry: number, s = 1) => { const p = M(new THREE.PlaneGeometry(1.3 * s, 1.62 * s), wm, [x, y, z], [0, ry, 0]); p.castShadow = false; G.add(p); };
  for (let f = 0; f < floors; f++) { const y = f * 2.9 + 1.75, kk = 1 - (1 - k) * (y / H), nf = Math.max(1, Math.floor(w / 2.6));
    for (let i = 0; i < nf; i++) { const x = (i - (nf - 1) / 2) * (w / nf) * kk; if (f === 0 && i === Math.floor(nf / 2)) continue; win(x, y, (d / 2) * kk + 0.03, 0, f ? 1 : 0.85); }
    win((w / 2) * kk + 0.03, y, 0, Math.PI / 2, 0.85); win(-(w / 2) * kk - 0.03, y, -d * 0.15, -Math.PI / 2, 0.85); win(0, y, -(d / 2) * kk - 0.03, Math.PI, 0.85); }
  const door = M(new THREE.PlaneGeometry(1.25, 2.05), new THREE.MeshStandardMaterial({ map: doorT, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 }), [0, 1.02, d / 2 + 0.035]); door.castShadow = false; G.add(door);
  // step stones at the door
  G.add(M(new THREE.BoxGeometry(1.7, 0.18, 0.7), new THREE.MeshStandardMaterial({ map: mudT, color: "#9a9088" }), [0, 0.09, d / 2 + 0.38]));
  // firewood + fodder stacks on the roof edge
  for (let i = 0; i < 2 + Math.floor(rnd() * 2); i++) { const wp = mdl("woodpile", 0.8 + rnd() * 0.5); wp.position.set((rnd() - 0.5) * w * 0.6, H + 0.16, -d * 0.28 + (rnd() - 0.5) * 0.6); wp.rotation.y = rnd() * 3; G.add(wp); }
  // prayer flag poles at two roof corners (a tall stick with a narrow vertical flag and a tuft)
  const cols = ["#2a62c8", "#f4f2ea", "#c8302a", "#2f9a4a", "#f2c22a"];
  for (const sx of [-1, 1]) { const px = sx * (w * k / 2 - 0.2), pz = d * k / 2 - 0.2;
    G.add(M(new THREE.CylinderGeometry(0.03, 0.04, 2.6, 6), new THREE.MeshStandardMaterial({ color: "#6a4a2a" }), [px, H + 1.4, pz]));
    const fl = M(new THREE.PlaneGeometry(0.36, 1.5), new THREE.MeshStandardMaterial({ color: cols[(seed + sx + 5) % 5], side: THREE.DoubleSide, roughness: 0.9 }), [px + 0.19, H + 1.9, pz]); fl.userData.flag = 1; G.add(fl); }
  return { G, H };
};
/** a whitewashed chorten: stepped base, bell-shaped dome, square harmika, tapering spire of rings, sun-moon finial */
export const chorten = (snow: { value: number }) => {
  const G = new THREE.Group(), wm = new THREE.MeshStandardMaterial({ map: plasterT, roughness: 0.9 }), gold = new THREE.MeshStandardMaterial({ color: "#c89a3a", roughness: 0.35, metalness: 0.6 }), red = new THREE.MeshStandardMaterial({ color: "#8a2a24", roughness: 0.8 });
  let y = 0; [[3.4, 0.5], [3.0, 0.45], [2.6, 0.45], [2.2, 0.4]].forEach(([s, h]) => { G.add(M(new THREE.BoxGeometry(s, h, s), wm, [0, y + h / 2, 0])); y += h; }); void snow;
  G.add(M(new THREE.BoxGeometry(2.24, 0.14, 2.24), red, [0, y + 0.07, 0])); y += 0.14;
  const prof: THREE.Vector2[] = []; for (let i = 0; i <= 16; i++) { const u = i / 16; prof.push(new THREE.Vector2(0.95 * Math.sin(Math.min(1, 0.2 + u) * Math.PI * 0.55) * (1 - 0.2 * u * u) + 0.02, u * 1.5)); } prof.push(new THREE.Vector2(0.001, 1.52));
  G.add(M(new THREE.LatheGeometry(prof, 28), wm, [0, y, 0])); y += 1.45;
  G.add(M(new THREE.BoxGeometry(0.62, 0.36, 0.62), wm, [0, y + 0.18, 0])); y += 0.36;
  for (let i = 0; i < 9; i++) { const r = 0.26 - i * 0.022; G.add(M(new THREE.CylinderGeometry(r * 0.92, r, 0.11, 18), gold, [0, y + 0.055, 0])); y += 0.11; }
  G.add(M(new THREE.SphereGeometry(0.11, 14, 10), gold, [0, y + 0.1, 0])); G.add(M(new THREE.TorusGeometry(0.12, 0.025, 6, 16, Math.PI), gold, [0, y + 0.3, 0], [0, 0, Math.PI]));
  return G;
};
/** the tea stall: a small one-room shop with a wide opening and a striped awning; front faces +x of the local frame */
const teaStall = (snow: { value: number }) => {
  const G = new THREE.Group(), w = 4.2, d = 3.6, H = 2.9;
  const wm = new THREE.MeshStandardMaterial({ map: plasterT, roughness: 0.9 });
  G.add(M(new THREE.BoxGeometry(0.3, H, d), wm, [-w / 2, H / 2, 0]), M(new THREE.BoxGeometry(w, H, 0.3), wm, [0, H / 2, -d / 2]), M(new THREE.BoxGeometry(w, H, 0.3), wm, [0, H / 2, d / 2]));
  G.add(M(new THREE.BoxGeometry(0.3, 0.7, d), wm, [w / 2, H - 0.35, 0])); // lintel over the opening
  G.add(M(new THREE.BoxGeometry(w + 0.3, 0.16, d + 0.3), snowify(new THREE.MeshStandardMaterial({ map: mudT, color: "#a88a6a" }), snow, false), [0, H + 0.08, 0]));
  const tw = twigT.clone(); tw.repeat.set(3, 1); tw.needsUpdate = true; G.add(M(new THREE.BoxGeometry(0.3, 0.32, d + 0.3), new THREE.MeshStandardMaterial({ map: tw }), [w / 2, H + 0.3, 0]));
  // the inside: a back shelf with jars and a glowing stove
  G.add(M(new THREE.BoxGeometry(0.4, 1.6, d - 0.6), new THREE.MeshStandardMaterial({ color: "#5a3a24", roughness: 0.8 }), [-w / 2 + 0.4, 0.8, 0]));
  const jar = new THREE.MeshStandardMaterial({ color: "#c8d8d0", roughness: 0.2, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 6; i++) G.add(M(new THREE.CylinderGeometry(0.09, 0.09, 0.24, 10), jar, [-w / 2 + 0.45, 1.75, -1.1 + i * 0.44]));
  const stove = M(new THREE.CylinderGeometry(0.28, 0.32, 0.7, 14), new THREE.MeshStandardMaterial({ color: "#2a2624", roughness: 0.5, metalness: 0.4 }), [-0.6, 0.35, -1.1]); G.add(stove);
  const glow = M(new THREE.CircleGeometry(0.1, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.1, 0.4), toneMapped: false }), [-0.31, 0.3, -1.1], [0, Math.PI / 2, 0]); G.add(glow);
  G.add(M(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8), new THREE.MeshStandardMaterial({ color: "#2a2624", metalness: 0.5 }), [-0.6, 2.0, -1.1]));
  // striped awning on two poles
  const aw = canvasTex(256, 64, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#f2eee2" : "#2a62a8"; g.fillRect(i * 32, 0, 32, 64); } g.fillStyle = "rgba(0,0,0,0.15)"; g.fillRect(0, 54, 256, 10); });
  const awn = M(new THREE.PlaneGeometry(2.0, d + 0.6), new THREE.MeshStandardMaterial({ map: aw, side: THREE.DoubleSide, roughness: 0.9 }), [w / 2 + 0.95, H - 0.25, 0], [0, 0, 0]); awn.rotation.set(-Math.PI / 2, 0.28, Math.PI / 2, "YXZ"); awn.rotation.set(0, 0, 0); awn.quaternion.setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + 0.28, 0, 0))); G.add(awn);
  for (const s of [-1, 1]) G.add(M(new THREE.CylinderGeometry(0.04, 0.04, H - 0.5, 6), new THREE.MeshStandardMaterial({ color: "#6a4a2a" }), [w / 2 + 1.85, (H - 0.5) / 2, s * (d / 2 + 0.1)]));
  // counter table outside with a kettle and glasses
  const tb = recolor(mdl("table", 0.95), { "*": "#7a5432" }); tb.position.set(w / 2 + 1.0, 0, -0.3); tb.rotation.y = Math.PI / 2; G.add(tb);
  // the kettle and glasses stand ON the table top, spread along its long side (measured, not guessed)
  const tbb = new THREE.Box3().setFromObject(tb), tc = tbb.getCenter(new THREE.Vector3()), tsz = tbb.getSize(new THREE.Vector3()), alongX = tsz.x > tsz.z, L = Math.max(tsz.x, tsz.z), Wd = Math.min(tsz.x, tsz.z);
  const onTop = (a: number, c: number) => new THREE.Vector3(tc.x + (alongX ? a : c), tbb.max.y, tc.z + (alongX ? c : a));
  const kt = mdl("kettle", 1.0); kt.position.copy(onTop(L * 0.3, 0)); G.add(kt);
  for (let i = 0; i < 3; i++) { const c = recolor(mdl("cup", 0.9), { _defaultMat: "#e8e2d4" }, 0.3); c.position.copy(onTop(-L * 0.3 + i * 0.17, ((i % 2) - 0.5) * Wd * 0.3)); G.add(c); }
  G.userData.free = onTop(L * 0.12, 0); // a clear spot on the table top (between the glasses and the kettle)
  return G;
};
/** a wall thermometer on a wooden board (the red column reads `deg` on a -40..+20 scale) */
/** the side the broken tip falls to (north-east of the cone, in view of the March and April cameras) */
export const TIP_SIDE = new THREE.Vector3(0.74, 0, -0.68).normalize();
export const thermometer = (deg: number) => {
  const G = new THREE.Group();
  const face = canvasTex(128, 512, (g) => { g.fillStyle = "#f4f0e4"; g.fillRect(0, 0, 128, 512); g.strokeStyle = "#5a3a24"; g.lineWidth = 10; g.strokeRect(0, 0, 128, 512);
    g.fillStyle = "#222"; g.font = "bold 22px sans-serif"; g.textAlign = "right";
    for (let v = 20; v >= -40; v -= 2) { const y = 60 + (20 - v) * 6.6; g.fillRect(v % 10 ? 74 : 62, y - 1, v % 10 ? 14 : 26, 2); if (v % 10 === 0) g.fillText(String(v), 56, y + 8); }
    g.fillStyle = "#2a62a8"; g.fillRect(70, 60 + 20 * 6.6, 3, 40 * 6.6); });
  G.add(M(new THREE.BoxGeometry(0.16, 0.62, 0.025), [new THREE.MeshStandardMaterial({ color: "#5a3a24" }), new THREE.MeshStandardMaterial({ color: "#5a3a24" }), new THREE.MeshStandardMaterial({ color: "#5a3a24" }), new THREE.MeshStandardMaterial({ color: "#5a3a24" }), new THREE.MeshStandardMaterial({ map: face, roughness: 0.6 }), new THREE.MeshStandardMaterial({ color: "#5a3a24" })]));
  const glass = new THREE.MeshStandardMaterial({ color: "#e8f4ff", roughness: 0.05, transparent: true, opacity: 0.45 });
  const y0 = 0.31 - 0.6 * (60 / 512), top = 0.31 - 0.6 * ((60 + (20 - deg) * 6.6) / 512), bot = 0.31 - 0.6 * ((60 + 60 * 6.6) / 512);
  G.add(M(new THREE.CylinderGeometry(0.008, 0.008, y0 - bot, 8), glass, [0.012, (y0 + bot) / 2, 0.025])); void y0;
  const col = M(new THREE.CylinderGeometry(0.0045, 0.0045, Math.max(0.005, top - bot + 0.02), 8), new THREE.MeshStandardMaterial({ color: "#d4202a", roughness: 0.3, emissive: "#600808" }), [0.012, (top + bot - 0.02) / 2, 0.025]); G.add(col);
  G.add(M(new THREE.SphereGeometry(0.016, 12, 10), new THREE.MeshStandardMaterial({ color: "#d4202a", roughness: 0.25, emissive: "#600808" }), [0.012, bot - 0.025, 0.025]));
  return G;
};

// ---------------- the ice stupa ----------------
/** the ice cone around its standing pipe. Built once at full height; `setH` scales it taller (the base never widens:
 *  it grows up, not out). `melt` 0..1 makes it wet, glossy and dripping; `breakTip(u)` drops the top chunk. */
export class IceStupa {
  G = new THREE.Group(); body: THREE.Mesh; tip: THREE.Mesh; icicles: THREE.InstancedMesh; pipe: THREE.Group; mat: THREE.MeshPhysicalMaterial; h = STUPA_HMAX;
  tipBase = 0.84; broken = 0; nozzle = new THREE.Vector3(); drops: THREE.InstancedMesh; tipPts: { p: THREE.Vector3; r: number }[] = []; puddle: THREE.Mesh;
  constructor(R: THREE.Object3D, public at = STUPA) {
    const Hm = STUPA_HMAX, prof = (u: number) => STUPA_R * Math.pow(1 - u, 0.9) * (1 + 0.05 * Math.sin(u * 19) * (1 - u)) + 0.05;
    // rime lumps: frozen spray builds up as rounded knobs and ledges all over the cone
    seedRnd(41); const lumps = Array.from({ length: 90 }, () => { const y = Math.pow(rnd(), 0.8) * Hm * 0.93; return { a: rnd() * Math.PI * 2, y, s: 0.25 + rnd() * 0.55 * (1 - y / Hm * 0.6), amp: 0.1 + rnd() * 0.32 * (1 - (y / Hm) * 0.5) }; });
    const bumpAt = (a: number, y: number, r: number) => { let b = 0; for (const l of lumps) { let da = a - l.a; da -= Math.round(da / (Math.PI * 2)) * Math.PI * 2; const ds = da * Math.max(0.3, r), dy = (y - l.y) * (y < l.y ? 1.8 : 1.1); b += l.amp * Math.exp(-(ds * ds + dy * dy) / (l.s * l.s)); } return b; };
    const mk = (u0: number, u1: number) => { const pts: THREE.Vector2[] = []; const n = 56; for (let i = 0; i <= n; i++) { const u = u0 + ((u1 - u0) * i) / n; pts.push(new THREE.Vector2(Math.max(0.06, prof(u)), u * Hm)); }
      if (u1 >= 0.999) pts.push(new THREE.Vector2(0.0, Hm)); const g = new THREE.LatheGeometry(pts, 96); const pa = g.attributes.position, col: number[] = [];
      for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z); if (r < 0.07) { col.push(1, 1, 1); continue; }
        const rib = 0.07 * Math.sin(a * 11 + Math.sin(y * 0.7) * 1.4) + 0.05 * Math.sin(a * 27 + y * 0.4), b = bumpAt(a, y, r), d = rib + b, f = 0.35 + 0.65 * (1 - y / Hm);
        const k = (r + d * f) / r; pa.setX(i, x * k); pa.setZ(i, z * k);
        const w = Math.max(0, Math.min(1, 0.45 + b * 2.4 + rib * 2 + 0.25 * (y / Hm))); col.push(0.74 + 0.26 * w, 0.86 + 0.14 * w, 0.97 + 0.03 * w); }
      g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 4, uv.getY(i) * 1.6); g.computeVertexNormals();
      // weld the lathe seam: the first and last columns are the same points, so share one averaged normal
      const nm = g.attributes.normal, np = pts.length, last = 96 * np; for (let j = 0; j < np; j++) { const a2 = j, b2 = last + j; const nx = nm.getX(a2) + nm.getX(b2), ny = nm.getY(a2) + nm.getY(b2), nz = nm.getZ(a2) + nm.getZ(b2), l = Math.hypot(nx, ny, nz) || 1; nm.setXYZ(a2, nx / l, ny / l, nz / l); nm.setXYZ(b2, nx / l, ny / l, nz / l); }
      return g; };
    this.mat = new THREE.MeshPhysicalMaterial({ map: iceT, bumpMap: iceT, bumpScale: 1.6, vertexColors: true, color: "#f4faff", roughness: 0.42, metalness: 0, clearcoat: 0.45, clearcoatRoughness: 0.25, emissive: "#3a70a8", emissiveIntensity: 0.05, sheen: 0.4, sheenColor: new THREE.Color("#d8f0ff") });
    this.body = M(mk(0, this.tipBase), this.mat); this.tip = M(mk(this.tipBase, 1).translate(0, -this.tipBase * STUPA_HMAX, 0), this.mat); this.tip.position.y = this.tipBase * STUPA_HMAX;
    // close the break: a cap under the tip piece and one on top of the body, so neither shows hollow once it snaps
    { const cr = prof(this.tipBase) + 0.08, cm = new THREE.MeshStandardMaterial({ color: "#e4f0f8", roughness: 0.35 });
      this.tip.add(new THREE.Mesh(new THREE.CircleGeometry(cr, 40).rotateX(Math.PI / 2), cm)); const bc = new THREE.Mesh(new THREE.CircleGeometry(cr, 40).rotateX(-Math.PI / 2), cm); bc.position.y = this.tipBase * Hm - 0.01; this.body.add(bc); } this.G.add(this.body, this.tip);
    // icicle fringes hanging under the lumps (clear, glossy), longer low down
    const iceClear = new THREE.MeshPhysicalMaterial({ color: "#e4f4ff", roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.05, emissive: "#5a90c0", emissiveIntensity: 0.08 });
    const cone = new THREE.ConeGeometry(1, 1, 6).rotateX(Math.PI).translate(0, -0.5, 0); this.icicles = new THREE.InstancedMesh(cone, iceClear, 420); const T = new THREE.Matrix4(); let n = 0;
    for (const l of lumps) { if (l.y < 0.25) continue; const u = l.y / Hm, cnt = 2 + Math.floor(rnd() * 5);
      for (let j = 0; j < cnt && n < 420; j++) { const a = l.a + (rnd() - 0.5) * (l.s / Math.max(0.4, prof(u))) * 1.4, yy = l.y - l.s * (0.45 + rnd() * 0.3), uu = yy / Hm, r = prof(uu) + (bumpAt(a, yy, prof(uu)) + 0.02) * (0.35 + 0.65 * (1 - uu)) - 0.03;
        const len = 0.1 + rnd() * 0.55 * (1 - uu * 0.7), th = 0.022 + rnd() * 0.03, p = V(Math.cos(a) * r, yy, Math.sin(a) * r); this.tipPts.push({ p: p.clone().add(V(0, -len, 0)), r: rnd() });
        T.compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.15, 0, (rnd() - 0.5) * 0.15)), V(th, len, th)); this.icicles.setMatrixAt(n++, T); } }
    this.icicles.count = n; this.icicles.castShadow = true; this.G.add(this.icicles);
    // the standing pipe (black HDPE) up the middle, with a bent nozzle and a metal clamp
    this.pipe = new THREE.Group(); const pm = new THREE.MeshStandardMaterial({ color: "#1c1c1e", roughness: 0.45 });
    this.pipe.add(M(new THREE.CylinderGeometry(0.06, 0.06, Hm + 0.9, 12), pm, [0, (Hm + 0.9) / 2, 0]));
    const el = M(new THREE.TorusGeometry(0.16, 0.06, 10, 16, Math.PI / 2), pm, [0.16, Hm + 0.9, 0], [Math.PI / 2, 0, Math.PI]); el.rotation.set(0, 0, 0); el.position.set(-0.16, Hm + 0.9, 0); el.rotation.z = -Math.PI / 2 * 0; this.pipe.add(el);
    const nz = M(new THREE.CylinderGeometry(0.045, 0.06, 0.22, 10), new THREE.MeshStandardMaterial({ color: "#8a9098", metalness: 0.7, roughness: 0.3 }), [-0.16, Hm + 1.06 + 0.02, 0]); nz.rotation.z = 0.3; this.pipe.add(nz);
    this.pipe.add(M(new THREE.CylinderGeometry(0.075, 0.075, 0.08, 12), new THREE.MeshStandardMaterial({ color: "#a8b0b8", metalness: 0.8, roughness: 0.25 }), [0, Hm + 0.5, 0]));
    this.G.add(this.pipe);
    this.drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.018, 6, 5), new THREE.MeshStandardMaterial({ color: "#e8f6ff", roughness: 0.05, transparent: true, opacity: 0.85 }), 120); this.drops.count = 0; this.drops.frustumCulled = false; this.G.add(this.drops);
    this.puddle = M(new THREE.CircleGeometry(STUPA_R + 0.9, 40), new THREE.MeshStandardMaterial({ map: waterT, color: "#6a8494", roughness: 0.06, metalness: 0.2, transparent: true, alphaMap: roundAlpha, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }), [0, 0.015, 0], [-Math.PI / 2, 0, 0]);
    this.puddle.castShadow = false; this.puddle.visible = false; this.G.add(this.puddle);
    this.G.position.copy(at); R.add(this.G); this.setH(Hm);
  }
  /** height in metres (scales the cone; pipe and nozzle stay on top) */
  setH(h: number) { this.h = h; const s = h / STUPA_HMAX; this.body.scale.y = this.tip.scale.y = this.icicles.scale.y = s; if (this.broken <= 0) this.tip.position.y = this.tipBase * STUPA_HMAX * s; this.pipe.position.y = h - STUPA_HMAX; this.drops.position.y = 0;
    this.nozzle.set(this.at.x - 0.2, this.at.y + h + 1.2, this.at.z); }
  /** wetness: 0 dry frosty winter ice, 1 wet glossy melting ice */
  setMelt(k: number) { this.mat.roughness = 0.28 - 0.2 * k; this.mat.clearcoatRoughness = 0.2 - 0.15 * k; this.mat.color.set(k > 0.01 ? new THREE.Color("#eef8ff").lerp(new THREE.Color("#cfe6f4"), k) : "#eef8ff"); this.puddle.visible = k > 0.05; (this.puddle.material as THREE.MeshStandardMaterial).opacity = Math.min(1, k * 1.4); }
  /** drips falling from the icicle tips (k strength) */
  drip(t: number, k: number) { const T = new THREE.Matrix4(), s = this.h / STUPA_HMAX; let n = 0;
    for (let i = 0; i < this.tipPts.length && n < 120 && k > 0.01; i++) { const tp = this.tipPts[i]; if (tp.r > k) continue; const per = 0.7 + tp.r * 0.9, ph = ((t + tp.r * 7.3) % per) / per, y0 = tp.p.y * s, y = y0 - 9.8 * Math.pow(ph * 0.6, 2) * 1.2;
      if (y < 0.02) continue; T.makeTranslation(tp.p.x, y, tp.p.z); this.drops.setMatrixAt(n++, T); }
    this.drops.count = n; this.drops.instanceMatrix.needsUpdate = true; }
  /** u 0 attached .. 1 lying broken on the ground beside the cone */
  breakTip(u: number, side = TIP_SIDE) {
    const s = this.h / STUPA_HMAX, top = this.tipBase * STUPA_HMAX * s; this.broken = Math.max(0, Math.min(1, u));
    if (u <= 0) { this.tip.position.set(0, top, 0); this.tip.rotation.set(0, 0, 0); return; }
    // out grows fast at first so the piece clears the flank; it ends lying on its side 3.4 m out, base disc above ground
    const f = this.broken, out = 3.4 * Math.sqrt(f), y = top + (0.55 - top) * f * f;
    this.tip.position.set(side.x * out, y, side.z * out); this.tip.rotation.set(side.z * 1.45 * f, 0, -side.x * 1.45 * f); }
}

// ---------------- Tashi's flat ice sheet ----------------
/** a flat ice sheet over Tashi's field. uFill 0..1 spreads water from the sluice gate, uIce 0 water .. 1 frozen,
 *  uMelt 0..1.05 melts it away (thin edges first), leaving puddles that dry with uDry. */
export class FlatIce {
  U = { uFill: { value: 1 }, uIce: { value: 1 }, uMelt: { value: 0 }, uDry: { value: 0 }, uGate: { value: new THREE.Vector2() } };
  ice: THREE.Mesh; pud: THREE.Mesh;
  constructor(R: THREE.Object3D) {
    const F = TASHI_FIELD, w = F.x1 - F.x0, d = F.z1 - F.z0, cx = (F.x0 + F.x1) / 2, cz = (F.z0 + F.z1) / 2;
    this.U.uGate.value.set((GATE.x - F.x0) / w, 1 - (GATE.z - F.z0) / d);
    const st = sheetT.clone(); st.repeat.set(w / 6, d / 6); st.needsUpdate = true;
    const im = new THREE.MeshPhysicalMaterial({ map: st, color: "#f2f5f6", roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.12, metalness: 0, transparent: true, depthWrite: true, envMapIntensity: 0.7 });
    const U = this.U, inj = (m: THREE.Material, water: boolean) => { m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U, { uMask: { value: meltT } });
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vMU;").replace("#include <uv_vertex>", "#include <uv_vertex>\nvMU = uv;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec2 vMU; uniform float uFill; uniform float uIce; uniform float uMelt; uniform float uDry; uniform vec2 uGate; uniform sampler2D uMask;")
        .replace("#include <map_fragment>", `#include <map_fragment>
        { float n = texture2D(uMask, vMU).r; float dg = distance(vMU * vec2(1.0, 1.8), uGate * vec2(1.0, 1.8)); float filled = step(dg, uFill * 2.2 - 0.25 * n);
          ${water ? `float pud = smoothstep(uMelt - 0.28, uMelt - 0.2, n) * (1.0 - step(uMelt, n)) * step(0.02, uMelt) * (1.0 - smoothstep(0.0, 1.0, uDry * 1.3 + (1.0 - n) * uDry));
            float wet = max(filled * (1.0 - uIce), pud); if (wet < 0.5) discard;`
            : `if (filled < 0.5 || n < uMelt) discard; diffuseColor.rgb = mix(vec3(0.42, 0.5, 0.55), diffuseColor.rgb, uIce); diffuseColor.a *= mix(0.0, 1.0, step(0.02, uIce));`} }`); };
      m.customProgramCacheKey = () => (water ? "flatW" : "flatI"); };
    inj(im, false); this.ice = M(new THREE.PlaneGeometry(w, d), im, [cx, 0.035, cz], [-Math.PI / 2, 0, 0]); this.ice.castShadow = false; R.add(this.ice);
    const wt = waterT.clone(); wt.repeat.set(w / 3, d / 3); wt.needsUpdate = true;
    const wm = new THREE.MeshStandardMaterial({ map: wt, color: "#e2eef6", roughness: 0.08, metalness: 0.0, envMapIntensity: 1.0, emissive: "#6f93aa", emissiveIntensity: 0.55, polygonOffset: true, polygonOffsetFactor: -3 }); inj(wm, true);
    this.pud = M(new THREE.PlaneGeometry(w, d), wm, [cx, 0.03, cz], [-Math.PI / 2, 0, 0]); this.pud.castShadow = false; R.add(this.pud);
  }
}

// ---------------- the set ----------------
export type LembahOpts = { pit?: boolean; season?: Season; night?: boolean; stupa?: number | false; flat?: { fill?: number; ice?: number; melt?: number; dry?: number } | false; trench?: number;
  sowed?: number; channel?: number; shadowAt?: V3; shadowSize?: number; sunH?: number; lit?: boolean; stream?: "frozen" | "dry"; flowing?: boolean; stubble?: boolean; sheep?: boolean; tipBroken?: boolean };
export class LembahSet {
  root = new THREE.Group(); sunDir = new THREE.Vector3(); sun!: THREE.DirectionalLight; sunAt = new THREE.Vector3(); snow = { value: 0 };
  stupa?: IceStupa; flat?: FlatIce; flags: THREE.Mesh[] = []; chan?: THREE.Mesh; chanU = { value: 0 }; spray!: THREE.InstancedMesh; trenchM?: THREE.Mesh; pipeM?: THREE.Mesh;
  sprouts?: THREE.InstancedMesh; stars?: THREE.Points; moon?: THREE.Mesh; gateSlab!: THREE.Mesh; tableFree = new THREE.Vector3();
  constructor(public o: LembahOpts = {}) {
    const R = this.root, season = o.season ?? "winter"; seedRnd(31);
    this.snow.value = season === "winter" ? 0.3 : season === "march" ? 0.12 : 0.0;
    // ---- ground: one big displaced sheet (flat valley floor, hill to the north, the snow range far out)
    const gg = new THREE.PlaneGeometry(1300, 1300, 340, 340).rotateX(-Math.PI / 2); const pa = gg.attributes.position as THREE.BufferAttribute, col: number[] = [];
    for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), z = pa.getZ(i), h = heightAt(x, z); pa.setY(i, h); const k = Math.min(1, h / 90), w = n2(x * 0.5, z * 0.5), st = 0.5 + 0.5 * Math.sin(h * 0.16 + 3 * n2(x * 0.3, z * 0.3));
      col.push(1 - 0.22 * k + 0.1 * (w - 0.5) - 0.12 * k * st, 1 - 0.3 * k - 0.1 * k * st, 1 - 0.26 * k + 0.12 * k * w); } // ochre valley floor; banded brown, rust and purple-grey rock up high
    gg.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); gg.computeVertexNormals();
    if (o.pit) { const idx = gg.index!, keep: number[] = [], e = 0.01; for (let i = 0; i < idx.count; i += 3) { let inside = 0; for (let k = 0; k < 3; k++) { const v = idx.getX(i + k), x = pa.getX(v), z = pa.getZ(v); if (x > PIT.x0 - e && x < PIT.x1 + e && z > PIT.z0 - e && z < PIT.z1 + e) inside++; } if (inside < 3) keep.push(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)); } gg.setIndex(keep); }
    const gt = groundT.clone(); gt.repeat.set(170, 170); gt.needsUpdate = true;
    const ground = new THREE.Mesh(gg, snowify(new THREE.MeshStandardMaterial({ map: gt, vertexColors: true, roughness: 0.96 }), this.snow)); ground.receiveShadow = true; R.add(ground);
    this.buildFields(R, season);
    if (o.pit) this.buildPit(R);
    this.buildStream(R, o.stream ?? (season === "winter" ? "frozen" : "dry"));
    this.buildVillage(R, !!o.night);
    this.buildPipe(R);
    // ---- the ice stupa and Tashi's flat ice
    if (o.stupa !== false) { this.stupa = new IceStupa(R); this.stupa.setH(o.stupa ?? STUPA_HMAX); if (o.tipBroken) this.stupa.breakTip(1); }
    if (o.flat) { this.flat = new FlatIce(R); const f = o.flat; this.flat.U.uFill.value = f.fill ?? 1; this.flat.U.uIce.value = f.ice ?? 1; this.flat.U.uMelt.value = f.melt ?? 0; this.flat.U.uDry.value = f.dry ?? 0; }
    // spray droplets (frozen glitter) from the nozzle
    this.spray = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.02, 0), new THREE.MeshStandardMaterial({ color: "#f4fbff", roughness: 0.1, emissive: "#9ac8ee", emissiveIntensity: 0.4, transparent: true, opacity: 0.9 }), 700);
    this.spray.count = 0; this.spray.frustumCulled = false; this.spray.castShadow = false; R.add(this.spray);
    // ---- clouds
    const cm = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#e8eef8", emissiveIntensity: o.night ? 0.02 : 0.45, roughness: 1, fog: false });
    for (let i = 0; i < 12; i++) { const az = (i / 12) * Math.PI * 2 + rnd() * 0.4, dist = 420 + rnd() * 60, h = 170 + rnd() * 60, c = mdl(i % 2 ? "cloud_1" : "cloud_2", 40 + rnd() * 50); c.traverse((x) => { const me = x as THREE.Mesh; if (me.isMesh) { me.material = cm; me.castShadow = me.receiveShadow = false; } }); c.position.set(Math.sin(az) * dist, h, -Math.cos(az) * dist); c.lookAt(0, h, 0); R.add(c); }
    if (o.night) this.buildNight(R); else this.buildDay(R);
  }
  private buildDay(R: THREE.Object3D) {
    const o = this.o, skyT = canvasTex(8, 512, (g) => { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#1f4fa8"); gr.addColorStop(0.3, "#3f78cc"); gr.addColorStop(0.47, "#9cc4ec"); gr.addColorStop(0.5, "#e8eef4"); gr.addColorStop(1, "#d8d4cc"); g.fillStyle = gr; g.fillRect(0, 0, 8, 512); });
    R.add(new THREE.Mesh(new THREE.SphereGeometry(640, 32, 16), new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide, fog: false, depthWrite: false })));
    const at = V(...(o.shadowAt ?? [0, 0, -4])), S = o.shadowSize ?? 16, dir = V(0.62, o.sunH ?? 0.42, 0.66).normalize();
    const sun = new THREE.DirectionalLight("#fff2de", 3.5); sun.position.copy(at).addScaledVector(dir, 80); sun.target.position.copy(at); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
    Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 30, far: 140 }); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.04; sun.shadow.radius = 3; R.add(sun, sun.target); this.sun = sun; this.sunAt.copy(at);
    R.add(new THREE.HemisphereLight("#a8c6ff", "#8a7258", 1.15)); const fill = new THREE.DirectionalLight("#a8c0ff", 0.4); fill.position.set(-10, 8, -6); R.add(fill);
    this.sunDir.copy(dir);
  }
  private buildNight(R: THREE.Object3D) {
    const o = this.o, skyT = canvasTex(8, 512, (g) => { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#050a1c"); gr.addColorStop(0.44, "#0e1a3a"); gr.addColorStop(0.5, "#1c2a4c"); gr.addColorStop(1, "#0a0e18"); g.fillStyle = gr; g.fillRect(0, 0, 8, 512); });
    R.add(new THREE.Mesh(new THREE.SphereGeometry(640, 32, 16), new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide, fog: false, depthWrite: false })));
    const sp: number[] = []; for (let i = 0; i < 2600; i++) { const a = rnd() * Math.PI * 2, e = 0.05 + Math.pow(rnd(), 0.7) * 1.45; sp.push(Math.cos(a) * Math.cos(e) * 600, Math.sin(e) * 600, Math.sin(a) * Math.cos(e) * 600); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    const dot = canvasTex(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(220,230,255,0.6)"); gr.addColorStop(1, "rgba(200,220,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ map: dot, size: 3.2, sizeAttenuation: true, transparent: true, depthWrite: false, fog: false, color: new THREE.Color(1.6, 1.6, 1.8) })); R.add(this.stars);
    const mdir = V(-0.45, 0.62, -0.64).normalize();
    this.moon = M(new THREE.CircleGeometry(9, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.0), fog: false, toneMapped: false }), [mdir.x * 600, mdir.y * 600, mdir.z * 600]); this.moon.lookAt(0, 0, 0); R.add(this.moon);
    const at = V(...(o.shadowAt ?? [0, 0, -4])), S = o.shadowSize ?? 16;
    const moon = new THREE.DirectionalLight("#9ab4ff", 1.1); moon.position.copy(at).addScaledVector(mdir, 80); moon.target.position.copy(at); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
    Object.assign(moon.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 30, far: 140 }); moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.05; R.add(moon, moon.target); this.sun = moon; this.sunAt.copy(at);
    R.add(new THREE.HemisphereLight("#2a3a6a", "#0c0c14", 0.55)); this.sunDir.copy(mdir);
  }
  /** terraced plots with dry-stone walls; Dolma's channel; sprouts when sown */
  private buildFields(R: THREE.Object3D, season: Season) {
    const o = this.o, plot = (x0: number, x1: number, z0: number, z1: number, t: THREE.Texture) => { const w = x1 - x0, d = z1 - z0, tt = t.clone(); tt.repeat.set(w / 5, d / 5); tt.needsUpdate = true;
      const m = snowify(new THREE.MeshStandardMaterial({ map: tt, roughness: 0.98, transparent: true, alphaMap: stripAlpha, polygonOffset: true, polygonOffsetFactor: -1 }), this.snow, false); m.alphaMap = null; m.transparent = false;
      decal(R, w, d, m, (x0 + x1) / 2, (z0 + z1) / 2, 0, 0.012); };
    const dolmaT = season === "april" ? (o.channel ? fieldWetT : fieldDryT) : fieldT, otherT = season === "april" ? fieldDryT : fieldT;
    const D = DOLMA_FIELD, T = TASHI_FIELD;
    plot(D.x0, D.x1, D.z0, D.z1, dolmaT); plot(T.x0, T.x1, T.z0, T.z1, otherT);
    // neighbours' plots further out (all dry in april)
    for (const [x0, x1, z0, z1] of [[-17, -5, 9, 20], [1, 11, 11, 20], [-32, -19, -15, 6], [-32, -19, 8, 20], [-17, -5, -30, -17], [1, 11, -30, -13]]) plot(x0, x1, z0, z1, otherT);
    // dry-stone walls around the plots (instanced rocks), the boundary wall between Dolma and Tashi is taller
    const pts: { x: number; z: number; s: number; r: number; y?: number; tilt?: number }[] = [];
    const wall = (x0: number, z0: number, x1: number, z1: number, layers = 2, gap?: [number, number]) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(L / 0.42);
      for (let ly = 0; ly < layers; ly++) for (let i = 0; i <= n; i++) { const u = (i + (ly % 2) * 0.5) / n; if (u > 1) continue; const x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u; if (gap && Math.hypot(x - gap[0], z - gap[1]) < 0.8) continue;
        pts.push({ x: x + (rnd() - 0.5) * 0.08, z: z + (rnd() - 0.5) * 0.12, y: ly * 0.24, s: 0.7 + rnd() * 0.35, r: rnd() * 6.28, tilt: (rnd() - 0.5) * 0.3 }); } };
    wall(WALL_X, -16, WALL_X, 21, 3); wall(-17.5, -15.6, -4.2, -15.6, 2, [GATE.x, GATE.z - 1.4]); wall(-17.5, 7.6, -4.2, 7.6, 2); wall(-17.8, -15.6, -17.8, 21, 2);
    wall(0.5, -3.6, 11.5, -3.6, 2, [1.8, -3.6]); wall(0.5, 9.6, 11.5, 9.6, 2, [6.4, 9.6]); wall(11.8, -16, 11.8, 21, 2); wall(0.5, 10.4, 11.5, 10.4, 1);
    scatter(R, "rocks", pts, { tint: "#b0a090", snow: this.snow });
    // boulders on the open ground and on the hill
    const bp: { x: number; z: number; s: number; r: number }[] = []; for (let i = 0; i < 160; i++) { const x = (rnd() - 0.5) * 150, z = -110 + rnd() * 150; if (Math.abs(x) < 20 && z > -32 && z < 24) continue; if (Math.abs(x - streamX(z)) < 7 && z > -34 && z < 16) continue; bp.push({ x, z, s: 0.6 + rnd() * 2.2, r: rnd() * 6.28 }); }
    scatter(R, "rock_big", bp.filter((p) => !nearBuilding(p.x, p.z)), { tint: "#9a8a7a", snow: this.snow, flat: true });
    // Dolma's irrigation channel: a shallow earth ditch from the stupa down her field; water flows when `channel` > 0
    const ditch = ribbon(CHANNEL, 0.62, 60, new THREE.MeshStandardMaterial({ map: mudT, color: "#a08a72", roughness: 1, polygonOffset: true, polygonOffsetFactor: -3 }), 0.02, false); R.add(ditch);
    if (o.channel) { const wt = waterT.clone(); wt.repeat.set(1, 1); wt.needsUpdate = true; const wm = new THREE.MeshStandardMaterial({ map: wt, color: "#e2eef6", roughness: 0.06, metalness: 0.0, envMapIntensity: 1.2, emissive: "#7aa0b8", emissiveIntensity: 0.6, polygonOffset: true, polygonOffsetFactor: -5 });
      const U = this.chanU; wm.onBeforeCompile = (sh) => { sh.uniforms.uT = U; sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uT;").replace("#include <uv_vertex>", "#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv.x -= uT * 1.4;\n#endif"); };
      this.chan = ribbon(CHANNEL, 0.4, 80, wm, 0.035, false); R.add(this.chan); }
    // sown barley: tiny green shoots in rows over Dolma's field
    if (o.sowed) { const n = 2400, im = new THREE.InstancedMesh(new THREE.ConeGeometry(0.012, 0.09, 4).translate(0, 0.045, 0), new THREE.MeshStandardMaterial({ color: "#7ab83a", roughness: 0.8 }), n); const Tm = new THREE.Matrix4();
      for (let i = 0; i < n; i++) { const x = D.x0 + 0.4 + rnd() * (D.x1 - D.x0 - 0.8), z = D.z0 + 0.4 + Math.floor(rnd() * 28) * ((D.z1 - D.z0 - 0.8) / 28); Tm.compose(V(x, 0.012, z), new THREE.Quaternion().setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.4, rnd() * 3, (rnd() - 0.5) * 0.4)), V(1, o.sowed * (0.6 + rnd() * 0.8), 1)); im.setMatrixAt(i, Tm); }
      im.castShadow = false; R.add(im); this.sprouts = im; }
    // last year's failed harvest: sparse, short, pale stubble in rows over Dolma's field
    if (o.stubble) { const n = 1600, im = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.004, 0.006, 0.14, 4).translate(0, 0.07, 0), new THREE.MeshStandardMaterial({ color: "#b8a070", roughness: 0.9 }), n); const Tm = new THREE.Matrix4();
      for (let i = 0; i < n; i++) { const x = D.x0 + 0.4 + rnd() * (D.x1 - D.x0 - 0.8), z = D.z0 + 0.4 + Math.floor(rnd() * 24) * ((D.z1 - D.z0 - 0.8) / 24); Tm.compose(V(x, 0.0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.7, rnd() * 3, (rnd() - 0.5) * 0.7)), V(1, 0.4 + rnd() * 0.8, 1)); im.setMatrixAt(i, Tm); }
      im.castShadow = false; R.add(im); }
    // Tashi's sluice gate: two upright stones and a lifted slab at the top corner of his field
    const sm = new THREE.MeshStandardMaterial({ color: "#8a8076", roughness: 0.95 });
    for (const s of [-1, 1]) R.add(M(new THREE.BoxGeometry(0.22, 0.6, 0.3), sm, [GATE.x + s * 0.42, 0.3, GATE.z - 1.4]));
    this.gateSlab = M(new THREE.BoxGeometry(0.66, 0.06, 0.34), sm, [GATE.x, 0.62, GATE.z - 1.4]); this.gateSlab.castShadow = true; R.add(this.gateSlab);
    // the feeder ditch that brings stream water along the field tops to his gate
    const feed = new THREE.CatmullRomCurve3([V(GATE.x, 0, GATE.z - 1.4), V(-2, 0, -17.5), V(6, 0, -19.5), V(14, 0, -21), V(streamX(-22) - 1, 0, -22)]);
    R.add(ribbon(feed, 0.5, 60, new THREE.MeshStandardMaterial({ map: mudT, color: "#7a6a5a", roughness: 1, polygonOffset: true, polygonOffsetFactor: -3 }), 0.02, false));
  }
  pitWater?: THREE.Mesh; pitU = { value: 0 };
  /** the explanation pit: the back wall shows the frozen top layer and the soft soil below; the buried pipe runs
   *  along the wall, cut open so the flowing water shows. A pipe left on the surface is frozen solid. */
  private buildPit(R: THREE.Object3D) {
    const P = PIT, w = P.x1 - P.x0, l = P.z1 - P.z0, d = P.d;
    const prof = canvasTex(512, 512, (g) => {
      for (let y = 0; y < 512; y += 2) for (let x = 0; x < 512; x += 2) { const n = fbm(x, y, 512, 12, 5), yy = y + 14 * fbm(x, 9, 512, 5, 3), fz = yy < 215;
        const c = fz ? [196, 190, 186] : yy < 380 ? [120, 90, 64] : [104, 80, 60]; g.fillStyle = `rgb(${(c[0] + 34 * n) | 0},${(c[1] + 30 * n) | 0},${(c[2] + 30 * n) | 0})`; g.fillRect(x, y, 2, 2); }
      g.strokeStyle = "rgba(236,246,255,0.9)"; for (let i = 0; i < 60; i++) { const y = 20 + rnd() * 190, x = rnd() * 512; g.lineWidth = 1.5 + rnd() * 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20 + rnd() * 60, y + (rnd() - 0.5) * 6); g.stroke(); } // ice lenses in the frozen layer
      for (let i = 0; i < 500; i++) { const y = rnd() * 210; g.fillStyle = "rgba(255,255,255,0.9)"; g.fillRect(rnd() * 512, y, 2, 2); }
      g.strokeStyle = "rgba(160,200,235,0.85)"; g.lineWidth = 3; g.beginPath(); for (let x = 0; x <= 512; x += 8) g.lineTo(x, 216 + 6 * Math.sin(x * 0.05)); g.stroke(); // the freezing line
      for (let i = 0; i < 160; i++) { const x = rnd() * 512, y = 230 + rnd() * 280, r = 2 + rnd() * 6, k = rnd(); g.fillStyle = `rgb(${150 + 40 * k},${132 + 30 * k},${112 + 26 * k})`; g.beginPath(); g.ellipse(x, y, r, r * 0.7, rnd() * 3, 0, 7); g.fill(); }
      for (let i = 0; i < 120; i++) { const x = rnd() * 512, y = rnd() * 200; g.fillStyle = `rgb(${120 + 40 * rnd()},${110 + 30 * rnd()},${100 + 30 * rnd()})`; g.beginPath(); g.ellipse(x, y, 2 + rnd() * 5, 2 + rnd() * 3, rnd() * 3, 0, 7); g.fill(); }
    });
    const wallM = new THREE.MeshStandardMaterial({ map: prof, roughness: 0.95 }), sideM = new THREE.MeshStandardMaterial({ map: prof, roughness: 0.95, color: "#d8d0c8" });
    const back = M(new THREE.PlaneGeometry(w, d), wallM, [(P.x0 + P.x1) / 2, -d / 2, P.z0], [0, 0, 0]); R.add(back);
    for (const s2 of [-1, 1]) R.add(M(new THREE.PlaneGeometry(l, d), sideM, [s2 < 0 ? P.x0 : P.x1, -d / 2, (P.z0 + P.z1) / 2], [0, (s2 < 0 ? 1 : -1) * Math.PI / 2, 0]));
    R.add(M(new THREE.PlaneGeometry(w, l), new THREE.MeshStandardMaterial({ map: mudT, color: "#8a6a4e" }), [(P.x0 + P.x1) / 2, -d, (P.z0 + P.z1) / 2], [-Math.PI / 2, 0, 0]));
    // the buried pipe along the back wall at 1.8 m, cut open toward the camera (diagram size: radius 0.14)
    const py = -1.8, pr = 0.14, pm = new THREE.MeshStandardMaterial({ color: "#1c1c1e", roughness: 0.45, side: THREE.DoubleSide });
    const half = M(new THREE.CylinderGeometry(pr, pr, w, 24, 1, true, Math.PI, Math.PI).rotateZ(Math.PI / 2), pm, [(P.x0 + P.x1) / 2, py, P.z0 + 0.02]); R.add(half);
    const stripes = canvasTex(256, 32, (g) => { g.fillStyle = "#3a8ac8"; g.fillRect(0, 0, 256, 32); for (let i = 0; i < 8; i++) { g.fillStyle = "rgba(220,240,255,0.7)"; g.fillRect(i * 32, 8 + (i % 3) * 6, 14, 3); } }); stripes.wrapS = THREE.RepeatWrapping; stripes.repeat.set(4, 1);
    const wm = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.1, emissive: "#1a4a78", emissiveIntensity: 0.6 });
    const U = this.pitU; wm.onBeforeCompile = (sh) => { sh.uniforms.uT = U; sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uT;").replace("#include <uv_vertex>", "#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv.x -= uT * 0.9;\n#endif"); };
    this.pitWater = M(new THREE.CylinderGeometry(pr * 0.86, pr * 0.86, w - 0.02, 20, 1, true, Math.PI, Math.PI).rotateZ(Math.PI / 2), wm, [(P.x0 + P.x1) / 2, py, P.z0 + 0.025]); R.add(this.pitWater);
    // a pipe lying on the surface beside the pit: frosted white, frozen solid (ice plug in its cut end)
    const fr = new THREE.MeshStandardMaterial({ color: "#dfe6ec", roughness: 0.7 }); const sp = M(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 16).rotateZ(Math.PI / 2), fr, [P.x1 + 1.5, 0.07, P.z1 - 0.5]); sp.rotation.y = 0.5; R.add(sp);
    const plug = M(new THREE.CircleGeometry(0.06, 16), new THREE.MeshStandardMaterial({ color: "#f4faff", roughness: 0.3, emissive: "#5a8ab8", emissiveIntensity: 0.2 }), [0, 0, 0]); sp.updateMatrixWorld(true);
    const endP = V(-1.21, 0, 0).applyMatrix4(sp.matrixWorld); plug.position.copy(endP); plug.lookAt(endP.clone().add(V(-Math.cos(0.5), 0, Math.sin(0.5)))); R.add(plug);
    const ic = new THREE.MeshStandardMaterial({ color: "#eaf6ff", roughness: 0.1 }); for (let i = 0; i < 9; i++) { const u = -1 + i * 0.24, q = V(u, -0.07, 0).applyMatrix4(sp.matrixWorld); R.add(M(new THREE.ConeGeometry(0.015, 0.09 + 0.05 * Math.sin(i * 3), 5).rotateX(Math.PI), ic, [q.x, q.y + 0.01, q.z])); }
  }
  /** the stream bed: pale rounded stones, frozen shelves in winter, bone dry in april */
  private buildStream(R: THREE.Object3D, kind: "frozen" | "dry") {
    const curve = new THREE.CatmullRomCurve3(Array.from({ length: 30 }, (_, i) => { const z = -200 + i * 10; return V(streamX(z), 0, z); }));
    const bedT = soilTex([168, 160, 150], 400, 5000); bedT.repeat.set(1, 1);
    R.add(ribbon(curve, 5.5, 240, new THREE.MeshStandardMaterial({ map: bedT, color: "#c8c0b4", roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2 }), 0.03));
    if (kind === "frozen") { const im = new THREE.MeshPhysicalMaterial({ map: sheetT, color: "#e8f4ff", roughness: 0.1, clearcoat: 1, polygonOffset: true, polygonOffsetFactor: -4 }); R.add(ribbon(curve, 2.6, 240, im, 0.08));
      if (this.o.flowing) { const wt = waterT.clone(); wt.repeat.set(1, 1); wt.needsUpdate = true; const wm = new THREE.MeshStandardMaterial({ map: wt, color: "#d4e6f0", roughness: 0.06, metalness: 0.0, envMapIntensity: 1.2, emissive: "#6a92aa", emissiveIntensity: 0.55, polygonOffset: true, polygonOffsetFactor: -6 });
        const U = this.chanU; wm.onBeforeCompile = (sh) => { sh.uniforms.uT = U; sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uT;").replace("#include <uv_vertex>", "#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv.x -= uT * 0.15;\n#endif"); };
        R.add(ribbon(curve, 0.9, 240, wm, 0.1)); } }
    const st: { x: number; z: number; s: number; r: number }[] = []; for (let i = 0; i < 420; i++) { const z = -200 + rnd() * 290, x = streamX(z) + (rnd() - 0.5) * 5.4; st.push({ x, z, s: 0.25 + rnd() * 0.6, r: rnd() * 6.28 }); }
    scatter(R, "rocks", st, { tint: "#d0c8bc", snow: this.snow });
    // willows along the banks (bare)
    const tr: { x: number; z: number; s: number; r: number }[] = []; for (let i = 0; i < 34; i++) { const z = -60 + i * 3.4 + rnd() * 2, side = i % 2 ? 1 : -1, x = streamX(z) + side * (3.6 + rnd() * 2); tr.push({ x, z, s: 0.55 + rnd() * 0.3, r: rnd() * 6.28 }); }
    scatter(R, "tree_bare", tr.map((p) => ({ ...p, s: p.s * 0.55 })), { tint: "#b8a894" });
  }
  /** the village along the lane, the tea stall, the chorten, poplar rows, prayer flag lines, animals */
  private buildVillage(R: THREE.Object3D, night: boolean) {
    const o = this.o, place = (x: number, z: number, ry: number, w: number, d: number, fl: number, seed: number, lit = false) => { const h = ladakhHouse(w, d, fl, seed, { lit: lit && night, snow: this.snow }); h.G.position.set(x, heightAt(x, z), z); h.G.rotation.y = ry; R.add(h.G); h.G.traverse((c) => { if ((c as THREE.Mesh).userData.flag) this.flags.push(c as THREE.Mesh); }); return h; };
    // Dolma's house at the east edge of her field (front to the west, toward the field); Tashi's bigger house west
    place(DOLMA_HOUSE.x, DOLMA_HOUSE.z, -Math.PI / 2, 7, 6, 2, 3, true);
    place(-23, -2, Math.PI / 2, 9.5, 7, 2, 7, true);
    // the lane houses (fronts face the lane at x = 16)
    [[26, 6, -Math.PI / 2, 8, 6, 2], [26, 16, -Math.PI / 2, 7, 6, 2], [14.5, 15, Math.PI / 2, 7, 6, 2], [-3, 25, Math.PI, 8, 7, 2], [-14, 26, Math.PI, 7, 6, 1], [26, 27, -Math.PI / 2, 9, 6, 2], [-27, 14, Math.PI / 2, 7, 6, 2],
      [23.6, -17, -Math.PI / 2, 7, 5, 2], [14.5, -16, Math.PI / 2, 6, 6, 1], [-32, -24, 0.3, 7, 6, 2], [21, -40, -0.6, 8, 6, 2], [-8, -46, 0.1, 7, 6, 2], [6, 38, Math.PI, 8, 6, 2], [-22, 34, Math.PI, 7, 6, 2], [40, -4, -1.2, 7, 6, 2], [42, 18, -1.5, 8, 6, 2]]
      .forEach(([x, z, r, w, d, f], i) => place(x, z, r, w, d, f, 11 + i, i % 3 === 0));
    // the tea stall on the lane, opening to the west (toward the fields)
    const ts = teaStall(this.snow); ts.position.copy(STALL); ts.rotation.y = Math.PI; R.add(ts); ts.updateMatrixWorld(true); this.tableFree = ts.localToWorld((ts.userData.free as THREE.Vector3).clone());
    // a chorten at the village entrance and a line of smaller ones on the hill path
    const ch = chorten(this.snow); ch.position.set(14, 0, -24); R.add(ch);
    for (let i = 0; i < 5; i++) { const c = chorten(this.snow); c.scale.setScalar(0.45); const z = -36 - i * 4, x = 2 + i * 1.6; c.position.set(x, heightAt(x, z), z); R.add(c); }
    // tall bare poplar rows along the lane and the field edges
    const tr: { x: number; z: number; s: number; r: number }[] = [];
    for (let z = -30; z < 40; z += 3.4) for (const x of [LANE_X - 2.0, LANE_X + 2.0]) if (Math.abs(z - STALL.z) > 3.4 && Math.abs(z - DOLMA_HOUSE.z) > 4.2 && Math.abs(z - 15) > 4 && Math.abs(z + 16.5) > 3.8 && rnd() > 0.15) tr.push({ x: x + (rnd() - 0.5) * 0.6, z, s: 0.85 + rnd() * 0.35, r: rnd() * 6.28 });
    for (let x = -30; x < 12; x += 2.8) if (rnd() > 0.2) tr.push({ x, z: 21.5 + (rnd() - 0.5), s: 0.8 + rnd() * 0.4, r: rnd() * 6.28 });
    for (let z = -28; z < -17; z += 3) tr.push({ x: -20 + (rnd() - 0.5), z, s: 0.8 + rnd() * 0.3, r: rnd() * 6.28 });
    scatter(R, "tree_bare2", tr, { tint: o.season === "april" ? "#c8bc98" : "#c4b4a0", sxz: 0.42 }); // bare poplars: tall, narrow, twiggy
    const sm: { x: number; z: number; s: number; r: number }[] = []; for (let i = 0; i < 40; i++) { const x = (rnd() - 0.5) * 110, z = -80 + rnd() * 130; if (Math.abs(x) < 20 && z > -30 && z < 24) continue; sm.push({ x, z, s: 0.8 + rnd() * 0.6, r: rnd() * 6.28 }); }
    scatter(R, "trees_small", sm.filter((p) => !nearBuilding(p.x, p.z)), { tint: "#b0a090" });
    // prayer flag lines: house roof to pole, chorten to pole
    const cols = ["#2a62c8", "#f4f2ea", "#c8302a", "#2f9a4a", "#f2c22a"];
    const line = (a: THREE.Vector3, b: THREE.Vector3, n: number) => { const sag = new THREE.QuadraticBezierCurve3(a, a.clone().lerp(b, 0.5).add(V(0, -0.9, 0)), b);
      R.add(new THREE.Mesh(new THREE.TubeGeometry(sag, 20, 0.006, 4), new THREE.MeshBasicMaterial({ color: "#3a3028" })));
      for (let i = 1; i < n; i++) { const p = sag.getPointAt(i / n); const f = M(new THREE.PlaneGeometry(0.24, 0.3), new THREE.MeshStandardMaterial({ color: cols[i % 5], side: THREE.DoubleSide, roughness: 0.9 }), [p.x, p.y - 0.15, p.z]); f.castShadow = true; f.lookAt(p.x + (b.z - a.z), p.y - 0.15, p.z - (b.x - a.x)); f.userData.flag = 1; this.flags.push(f); R.add(f); } };
    R.add(M(new THREE.CylinderGeometry(0.05, 0.06, 6, 8), new THREE.MeshStandardMaterial({ color: "#6a4a2a" }), [8, 3, -21]));
    line(V(14, 4.6, -24), V(8, 5.9, -21), 22); line(V(14, 4.6, -24), V(LANE_X - 2, 6.5, -12), 30); line(V(8, 5.9, -21), V(-2, 3.4, -27), 30);
    line(V(DOLMA_HOUSE.x - 2.6, 6.2, DOLMA_HOUSE.z - 3.0), V(DOLMA_HOUSE.x + 2.6, 6.2, DOLMA_HOUSE.z + 3.0), 14);
    // animals near the houses: sheep in a pen, a dzo (recoloured cow)
    if (o.sheep !== false) { const sp: { x: number; z: number; s: number; r: number }[] = []; for (let i = 0; i < 7; i++) sp.push({ x: -30 + rnd() * 4, z: 5.4 + rnd() * 1.8, s: 0.9 + rnd() * 0.2, r: rnd() * 6.28 }); scatter(R, "sheep", sp);
      const dzo = recolor(mdl("cow"), { Main: "#2a221e", Main_Light: "#5a4a40", Muzzle: "#3a302a" }); dzo.position.set(-24.5, 0, 6.2); dzo.rotation.y = 2.2; R.add(dzo); }
  }
  /** the buried pipe: an open trench while it is being dug (trench 0..1 progress), a pale backfilled line afterwards */
  private buildPipe(R: THREE.Object3D) {
    const o = this.o; if (o.trench === undefined) return;
    if (o.trench >= 1.5) { R.add(ribbon(PIPE, 0.9, 120, new THREE.MeshStandardMaterial({ map: mudT, color: "#a89070", roughness: 1, transparent: true, alphaMap: stripAlpha, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false }), 0.025)); return; }
    const sub = (u: number) => new THREE.CatmullRomCurve3(Array.from({ length: 24 }, (_, i) => PIPE.getPointAt((i / 23) * u)));
    const u = Math.max(0.02, Math.min(1, o.trench)); const c = sub(u);
    this.trenchM = ribbon(c, 0.62, 100, new THREE.MeshStandardMaterial({ map: mudT, color: "#3a2a1e", roughness: 1, polygonOffset: true, polygonOffsetFactor: -4 }), 0.02); R.add(this.trenchM);
    // the dug-out earth heaped along one side (instanced clods)
    const cl: { x: number; z: number; s: number; r: number }[] = []; for (let i = 0; i < 200 * u; i++) { const p = c.getPointAt(rnd()), tg = c.getTangentAt(0.5), n = V(-tg.z, 0, tg.x).normalize(); cl.push({ x: p.x + n.x * (0.55 + rnd() * 0.3), z: p.z + n.z * (0.55 + rnd() * 0.3), s: 0.3 + rnd() * 0.4, r: rnd() * 6.28 }); }
    scatter(R, "rocks", cl, { tint: "#6a5038" });
    // the black pipe lying beside the trench, waiting
    this.pipeM = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(PIPE.getSpacedPoints(30).map((p) => { const tg = V(0, 0, 1); void tg; return V(p.x - 0.7, heightAt(p.x - 0.7, p.z) + 0.06, p.z); })), 160, 0.06, 10), new THREE.MeshStandardMaterial({ color: "#1c1c1e", roughness: 0.45 }));
    this.pipeM.castShadow = true; R.add(this.pipeM);
  }
  /** the nozzle spray: water thrown up and out, freezing into glittering droplets as it falls back on the cone */
  sprayAt(t: number, k: number, cam?: THREE.Camera) {
    const m = this.spray, s = this.stupa; if (!s || k <= 0.01) { m.count = 0; return; } const T = new THREE.Matrix4(), q = new THREE.Quaternion(), N = s.nozzle; let n = 0; void cam;
    for (let i = 0; i < 700 && n < 700; i++) { if ((i % 100) / 100 > k) continue; const per = 1.2 + (i % 9) * 0.07, ph = ((t + i * 0.0137) % per) / per, a = i * 2.39996, sp = 0.6 + 1.4 * ((i * 0.618) % 1);
      const vx = Math.cos(a) * sp, vz = Math.sin(a) * sp, vy = 3.2 + ((i * 0.37) % 1) * 1.4, tt = ph * per;
      const p = V(N.x + vx * tt, N.y + vy * tt - 4.9 * tt * tt, N.z + vz * tt); const r = Math.hypot(p.x - s.at.x, p.z - s.at.z), surf = s.h * Math.max(0, 1 - r / STUPA_R) + 0.05; if (p.y < surf) continue;
      const sc = 0.6 + 1.2 * ((i * 0.73) % 1); T.compose(p, q, V(sc, sc, sc)); m.setMatrixAt(n++, T); }
    m.count = n; m.instanceMatrix.needsUpdate = true;
  }
  sunTurn(a: number, h = 0.42) { const d = V(0.62, h, 0.66); d.applyAxisAngle(V(0, 1, 0), a).normalize(); this.sun.position.copy(this.sunAt).addScaledVector(d, 80); this.sunDir.copy(d); }
  update(t: number) { this.chanU.value = t; this.pitU.value = t; this.flags.forEach((f, i) => { f.rotation.z = 0.06 * Math.sin(t * 2.3 + i * 0.7); }); }
}
