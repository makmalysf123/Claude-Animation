// Kampung world for "Satu Ayam yang Sama" on the cartoon-short engine (bridge/: two-tone shading, sky stops, fog,
// card-shaded billboards, contact blobs, ink; MIT, Mr omi). Our own layout and buildings:
//   a long village road on x (z = 0); poor shacks west (x < -14), middle houses in the centre, rich villas east (x > 16);
//   a lapangan (open field) south of the road where the whirlwind leaves everybody; a farm plot north-east.
// Every house is its own group so the whirlwind can lift and spin it away. Ground = one huge plane (no horizon line),
// paths are thin meshes 2 cm above it (depth jump far below the ink threshold, so no lines along their edges).
import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { ctex, rep, grassHD, roofHD, cloudHD, planksHD } from "../bridge/paint";
import { LIGHTS, LOOK, LightPreset, WorldLook } from "../bridge/lights";
import { TONE, CHAR, twoTone, untone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { Pool, Actor, Fx, SU } from "../bridge/cast";
import { Pen, fxContact, fxPuff, MOUTH_STYLE } from "../bridge/toon";
MOUTH_STYLE.detail = true; // ayam cast: teeth row + tongue in open mouths
import { blobMaterial, CARD_K } from "../bridge/cardshade";
import { drawPerson, drawHen, drawChick, Person, ActOpts } from "./people";
import type { FrontOpts } from "../bridge/toon";

export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** layer of the mirror puddles (main camera only) */
export const PUDDLE = 5;
export type Mood = "day" | "golden" | "night" | "storm";
/** moonlit night: cool blue key from behind-right, navy sky + fog, faces stay readable (charTint cool, not grey) */
const NIGHT: LightPreset = { ...LIGHTS.golden, az: 125, el: 32, lit: [0.24, 0.3, 0.56], shade: [0.07, 0.09, 0.2], lift: [0.02, 0.03, 0.09], term: 0.2,
  charTint: [0.62, 0.68, 0.92], charShade: 0.8, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.85, 0.86, 1.0], actorShadow: false,
  top: "#0f1d44", hor: "#2c3f78", fog: "#22325e", fogNear: 30, fogFar: 300, sunCol: "#a9c4ff", sunI: 1.6, sky: "#4a5f9a", ground: "#2a2a40", hemiI: 0.4,
  bias: LIGHTS.day.bias, normalBias: LIGHTS.day.normalBias };
const NIGHT_LOOK: WorldLook = { ...LOOK.day, sky: { c: ["#34498a", "#2a3d7a", "#1f3068", "#172656", "#0e1a42"], e: [0, 3, 8, 16, 40] }, bounce: [0, 0, 0], sat: 1.0, cloud: { lit: "#56679a", mid: "#3b4a7a", shade: "#283664" } };
/** our sunset: low sun side-back (az 38) so walls get a terminator gradient + warm rims, shade violet but light (never grey) */
const GOLDEN: LightPreset = { ...LIGHTS.golden, az: 62, el: 19, lit: [1.62, 0.92, 0.5], shade: [0.42, 0.32, 0.55], lift: [0.07, 0.05, 0.16], lambert: 0.6, term: 0.35, sideK: 0.78 };
/** storm: overcast, soft light from high up, grey gradient sky, desaturated world, grey fog close in */
const STORM: LightPreset = { ...LIGHTS.day, az: 70, el: 55, lit: [0.9, 0.92, 0.98], shade: [0.62, 0.63, 0.68], lift: [0.04, 0.04, 0.06], lambert: 0.55, term: 0.6, sideK: 0.8,
  charTint: [0.86, 0.88, 0.93], charShade: 0.9, charGrad: 0.05, bodyGrad: 0.12, sideTint: [0.9, 0.9, 0.95], fog: "#8f959e", fogNear: 6, fogFar: 75, sunI: 1.2, hemiI: 0.5 };
const STORM_LOOK: WorldLook = { ...LOOK.day, sky: { c: ["#a9aeb6", "#959aa3", "#7c818a", "#62676f", "#44484f"], e: [0, 4, 10, 20, 45] }, bounce: [0, 0, 0], sat: 0.32, cloud: { lit: "#9aa0a8", mid: "#7d838c", shade: "#5c6169" } };
const PRESET: Record<Mood, [LightPreset, WorldLook]> = { day: [LIGHTS.day, LOOK.day], golden: [GOLDEN, LOOK.golden], night: [NIGHT, NIGHT_LOOK], storm: [STORM, STORM_LOOK] };
/** shade height gradient per mood: [bottom multiplier, top multiplier, height range] */
const HGRAD: Record<Mood, [[number, number, number], [number, number, number], [number, number]]> = {
  day: [[0.9, 0.9, 0.92], [1.12, 1.12, 1.1], [0, 5]],
  golden: [[0.66, 0.56, 0.68], [1.35, 1.18, 1.32], [0, 3.6]],
  night: [[0.75, 0.78, 0.85], [1.15, 1.18, 1.25], [0, 6]],
  storm: [[0.78, 0.78, 0.8], [1.18, 1.18, 1.2], [0, 4]],
};
const mats = new Map<string, THREE.Material>();
const lam = (key: string, p: () => THREE.MeshLambertMaterialParameters) => { let m = mats.get(key); if (!m) { m = twoTone(new THREE.MeshLambertMaterial(p())); mats.set(key, m); } return m; };
const col = (c: string) => lam("c" + c, () => ({ color: c }));
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ---------------- painted textures (own) ----------------
const gedek = () => ctex("gedek", 512, 512, (g, r) => { // woven bamboo wall
  g.fillStyle = "#c9a96e"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 32) for (let x = 0; x < 512; x += 32) {
    const h = ((x + y) / 32) % 2; g.fillStyle = h ? "#b8955a" : "#d4b67c"; g.fillRect(x + 1, y + 1, 30, 30);
    g.strokeStyle = "rgba(90,60,30,0.35)"; g.lineWidth = 2; g.beginPath();
    if (h) { g.moveTo(x + 4, y + 16); g.lineTo(x + 28, y + 16); } else { g.moveTo(x + 16, y + 4); g.lineTo(x + 16, y + 28); } g.stroke();
  }
  g.fillStyle = "rgba(60,40,20,0.12)"; for (let i = 0; i < 40; i++) g.fillRect(r() * 512, r() * 512, 20 + r() * 50, 6 + r() * 20);
});
const seng = () => ctex("seng", 512, 512, (g, r) => { // rusty corrugated zinc
  for (let x = 0; x < 512; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, "#8d9198"); gr.addColorStop(0.5, "#b9bcc2"); gr.addColorStop(1, "#7c8087"); g.fillStyle = gr; g.fillRect(x, 0, 16, 512); }
  for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${150 + r() * 40},${70 + r() * 30},30,${0.25 + r() * 0.35})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 20 + r() * 70, 10 + r() * 40, r() * 3, 0, 7); g.fill(); }
});
const plaster = (key: string, base: string) => ctex("plaster" + key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.05)"; g.fillRect(r() * 512, r() * 512, 2 + r() * 6, 2 + r() * 6); }
  const st = g.createLinearGradient(0, 380, 0, 512); st.addColorStop(0, "rgba(80,70,50,0)"); st.addColorStop(1, "rgba(80,70,50,0.22)"); g.fillStyle = st; g.fillRect(0, 380, 512, 132); // splash grime
});
const ground = () => ctex("kampungGround", 1024, 1024, (g, r) => {
  g.fillStyle = "#c9ac78"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 5000; i++) { g.fillStyle = ["#b8986a", "#d8bd8c", "#a98c60"][i % 3]; g.globalAlpha = 0.45; g.fillRect(r() * 1024, r() * 1024, 2 + r() * 5, 2 + r() * 5); }
  g.globalAlpha = 1;
});
const asphalt = () => ctex("kampungRoad", 1024, 256, (g, r) => {
  g.fillStyle = "#7c7a78"; g.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 4000; i++) { g.fillStyle = ["#6c6a68", "#8a8784", "#5e5c5a"][i % 3]; g.fillRect(r() * 1024, r() * 256, 2 + r() * 3, 2 + r() * 3); }
  g.fillStyle = "#e9e3d2"; for (let x = 0; x < 1024; x += 128) g.fillRect(x + 20, 124, 70, 8);
  g.fillStyle = "rgba(40,35,30,0.18)"; for (let i = 0; i < 12; i++) g.fillRect(r() * 1024, r() * 256, 40 + r() * 120, 6);
});
const coinTex = () => ctex("coins", 512, 512, (g, r) => {
  g.fillStyle = "#e0a91e"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) { const x = r() * 512, y = r() * 512, R = 10 + r() * 12; g.fillStyle = ["#ffd84a", "#f2c230", "#ffe680", "#d99a18"][i % 4]; g.beginPath(); g.ellipse(x, y, R, R * 0.7, r() * 3, 0, 7); g.fill(); g.strokeStyle = "#a06c0e"; g.lineWidth = 2; g.stroke(); }
});
const signTex = (text: string, bg: string, fg: string) => ctex("sign" + text, 1024, 256, (g) => { g.fillStyle = bg; g.fillRect(0, 0, 1024, 256); g.fillStyle = fg; g.font = "bold 120px 'Avenir Next', Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 512, 134); });

// ---------------- geometry helpers ----------------
const box = (parent: THREE.Object3D, w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, ry = 0) => {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = o.receiveShadow = true; parent.add(o); return o;
};
const uvBox = (w: number, h: number, d: number, tile: number) => { // box with world-scaled UVs (texture tiles every `tile` m)
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv as THREE.BufferAttribute, n = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)); const sx = ax > 0.5 ? d : w, sy = ay > 0.5 ? d : h; uv.setXY(i, (uv.getX(i) * sx) / tile, (uv.getY(i) * sy) / tile); }
  return g;
};
const tbox = (parent: THREE.Object3D, w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, tile = 2, ry = 0) => {
  const o = new THREE.Mesh(uvBox(w, h, d, tile), m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = o.receiveShadow = true; parent.add(o); return o;
};
const gable = (parent: THREE.Object3D, w: number, d: number, h: number, m: THREE.Material, y: number, over = 0.4) => {
  const s = new THREE.Shape(); s.moveTo(-w / 2 - over, 0); s.lineTo(0, h); s.lineTo(w / 2 + over, 0); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d + 2 * over, bevelEnabled: false }); g.translate(0, 0, -(d + 2 * over) / 2);
  const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.5, uv.getY(i) / 2.5);
  const o = new THREE.Mesh(g, m); o.position.y = y; o.castShadow = o.receiveShadow = true; parent.add(o); return o;
};


// ---------------- facades: doors / windows PAINTED into the front wall (no thin boxes -> no z-fighting, no shimmering ink) ----------------
const PXM = 128; // texels per metre on facades
const facadeTex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number, m: (v: number) => number) => void) =>
  ctex("fac_" + key, Math.round(w * PXM), Math.round(h * PXM), (g, r) => draw(g, r, (v) => v * PXM));
/** wall box: sides/top tile every `tile` m, the +z face shows `front` once (0..1) */
const facadeBox = (parent: THREE.Object3D, w: number, h: number, d: number, side: THREE.Material, front: THREE.Material, x: number, y: number, z: number, tile = 2) => {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv as THREE.BufferAttribute, n = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) { if (n.getZ(i) > 0.5) continue; const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)); const sx = ax > 0.5 ? d : w, sy = ay > 0.5 ? d : h; uv.setXY(i, (uv.getX(i) * sx) / tile, (uv.getY(i) * sy) / tile); }
  const o = new THREE.Mesh(g, [side, side, side, side, front, side]); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent.add(o); return o;
};
const frameRect = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: string, fw: number) => { g.fillStyle = frame; g.fillRect(x - fw, y - fw, w + 2 * fw, h + 2 * fw); };
const glass = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, base = "#5f88a8") => {
  const gr = g.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, base); gr.addColorStop(1, "#3e5f7a"); g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.fillStyle = "rgba(255,255,255,0.28)"; g.beginPath(); g.moveTo(x + w * 0.15, y + h); g.lineTo(x + w * 0.45, y); g.lineTo(x + w * 0.62, y); g.lineTo(x + w * 0.32, y + h); g.fill();
};
const shackFront = (w: number, h: number, seed: number) => facadeTex(`shack${seed}`, w, h, (g, r, m) => {
  const W = m(w), H = m(h);
  const S = m(0.1); for (let y = 0; y < H; y += S) for (let x = 0; x < W; x += S) { const k = Math.round((x + y) / S) % 2; g.fillStyle = k ? "#c4a266" : "#cfb077"; g.fillRect(x, y, S, S); g.fillStyle = "rgba(90,60,30,0.22)"; if (k) g.fillRect(x, y + S * 0.45, S, S * 0.1); else g.fillRect(x + S * 0.45, y, S * 0.1, S); }
  g.fillStyle = "rgba(70,45,20,0.18)"; for (let i = 0; i < 18; i++) g.fillRect(r() * W, r() * H, m(0.3 + r() * 0.5), m(0.08 + r() * 0.2));
  if (seed % 2) { g.fillStyle = "#2f6fb5"; g.fillRect(W * 0.62, H * 0.08, m(0.9), m(0.75)); g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(W * 0.62, H * 0.08 + m(0.3), m(0.9), m(0.04)); } // blue tarpaulin patch
  const dx = W / 2 - m(1.0), dw = m(0.8), dh = m(1.55);
  frameRect(g, dx, H - dh, dw, dh, "#5a3b22", m(0.05)); g.fillStyle = "#3b2618"; g.fillRect(dx, H - dh, dw, dh); for (let i = 1; i < 4; i++) { g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(dx + (dw * i) / 4, H - dh, m(0.012), dh); }
  const wx = W / 2 + m(0.45), wy = H - m(1.7), ww = m(0.7), wh = m(0.5);
  frameRect(g, wx, wy, ww, wh, "#6b4a2e", m(0.05)); g.fillStyle = "#231a14"; g.fillRect(wx, wy, ww, wh);
  g.fillStyle = "#8b6a48"; g.fillRect(wx + ww, wy, m(0.34), wh); g.fillStyle = "rgba(0,0,0,0.2)"; g.fillRect(wx + ww, wy, m(0.02), wh); // open shutter
});
const midFront = (w: number, h: number, c: string, seed: number) => facadeTex(`mid${seed}`, w, h, (g, r, m) => {
  const W = m(w), H = m(h);
  g.fillStyle = c; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 700; i++) { g.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.035)" : "rgba(255,255,255,0.05)"; g.fillRect(r() * W, r() * H, m(0.03), m(0.03)); }
  const st = g.createLinearGradient(0, H - m(0.6), 0, H); st.addColorStop(0, "rgba(90,80,60,0)"); st.addColorStop(1, "rgba(90,80,60,0.25)"); g.fillStyle = st; g.fillRect(0, H - m(0.6), W, m(0.6));
  g.fillStyle = "#8d877c"; g.fillRect(0, H - m(0.12), W, m(0.12)); // plinth tiles
  const dx = W / 2 - m(1.6), dw = m(1.0), dh = m(2.05);
  frameRect(g, dx, H - dh, dw, dh, "#fbf8f0", m(0.07)); g.fillStyle = "#7a4a2a"; g.fillRect(dx, H - dh, dw, dh);
  g.strokeStyle = "rgba(40,20,10,0.4)"; g.lineWidth = m(0.02); g.strokeRect(dx + m(0.12), H - dh + m(0.15), dw - m(0.24), m(0.8)); g.strokeRect(dx + m(0.12), H - dh + m(1.1), dw - m(0.24), m(0.8));
  g.fillStyle = "#e8c45a"; g.beginPath(); g.arc(dx + dw - m(0.15), H - m(1.0), m(0.04), 0, 7); g.fill();
  for (const cx of [W / 2 + m(0.1), W / 2 + m(1.4)]) {
    const wx = cx, wy = H - m(2.2), ww = m(0.9), wh = m(1.0);
    frameRect(g, wx, wy, ww, wh, "#fbf8f0", m(0.07)); glass(g, wx, wy, ww, wh);
    g.fillStyle = "#fbf8f0"; g.fillRect(wx + ww / 2 - m(0.025), wy, m(0.05), wh);
    g.fillStyle = ["#e9a3a3", "#f2d27a", "#a9cfe0"][seed % 3]; g.fillRect(wx, wy, m(0.18), wh); g.fillRect(wx + ww - m(0.18), wy, m(0.18), wh); // curtains
    for (let k = 0; k < 4; k++) { g.fillStyle = "#e6e0d2"; g.fillRect(wx + k * m(0.23), wy - m(0.32), m(0.2), m(0.2)); g.fillStyle = "rgba(60,50,40,0.35)"; g.fillRect(wx + k * m(0.23) + m(0.05), wy - m(0.27), m(0.1), m(0.1)); } // roster vents
  }
  g.fillStyle = "#2f5f8a"; g.fillRect(dx - m(0.45), H - m(1.75), m(0.28), m(0.18)); g.fillStyle = "#fff"; g.font = `bold ${m(0.13)}px Arial`; g.fillText(String(10 + seed), dx - m(0.42), H - m(1.61)); // house number
});
const villaFront = (w: number, h: number) => facadeTex("villa", w, h, (g, r, m) => {
  const W = m(w), H = m(h);
  g.fillStyle = "#f7f4ec"; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.025)" : "rgba(255,255,255,0.05)"; g.fillRect(r() * W, r() * H, m(0.03), m(0.03)); }
  for (const yb of [m(0.5), m(3.6)]) { g.fillStyle = "#d9d4c8"; g.fillRect(0, H - yb - m(0.02), W, m(0.03)); }
  const win = (cx: number, cyFromBottom: number) => { const ww = m(1.1), wh = m(1.4), x = W / 2 + m(cx) - ww / 2, y = H - m(cyFromBottom) - wh / 2; frameRect(g, x, y, ww, wh, "#ffffff", m(0.1)); glass(g, x, y, ww, wh, "#7aa6c8"); g.fillStyle = "#ffffff"; g.fillRect(x + ww / 2 - m(0.03), y, m(0.06), wh); g.fillRect(x, y + wh * 0.35, ww, m(0.05)); g.fillStyle = "#9aa0a6"; g.fillRect(x - m(0.15), y + wh + m(0.1), ww + m(0.3), m(0.1)); };
  for (const x of [-3.6, -2.0, 2.0, 3.6]) win(x, 1.4 + 0.5); for (const x of [-3.6, -2.0, 2.0, 3.6]) win(x, 4.5 + 0.5);
  const dw = m(1.7), dh = m(2.5), dx = W / 2 - dw / 2;
  frameRect(g, dx, H - m(0.5) - dh, dw, dh, "#cfc6b4", m(0.12)); g.fillStyle = "#5a3a22"; g.fillRect(dx, H - m(0.5) - dh, dw, dh);
  for (const k of [0, 1]) { g.strokeStyle = "rgba(255,220,160,0.35)"; g.lineWidth = m(0.03); g.strokeRect(dx + m(0.12) + (k * dw) / 2, H - m(0.5) - dh + m(0.15), dw / 2 - m(0.24), dh - m(0.3)); }
  g.fillStyle = "#e8c45a"; g.fillRect(W / 2 - m(0.12), H - m(0.5) - dh / 2, m(0.05), m(0.35)); g.fillRect(W / 2 + m(0.07), H - m(0.5) - dh / 2, m(0.05), m(0.35));
});

// ---------------- buildings (local frame: door faces +z, origin at ground centre) ----------------
export type Kind = "poor" | "mid" | "rich";
const shack = (seed: number) => { // rumah gubuk: bamboo walls on short stilts, rusty zinc lean-to roof
  const h = new THREE.Group(), w = 3.4 + hash(seed) * 0.6, d = 3.0, wall = lam("gedek", () => ({ map: rep(gedek(), 1, 1) })), wood = col("#6b4a2e");
  for (const [x, z] of [[-w / 2 + 0.1, -d / 2 + 0.1], [w / 2 - 0.1, -d / 2 + 0.1], [-w / 2 + 0.1, d / 2 - 0.1], [w / 2 - 0.1, d / 2 - 0.1]]) box(h, 0.12, 0.45, 0.12, wood, x, 0.22, z);
  tbox(h, w, 0.12, d, wood, 0, 0.5, 0, 1.5);
  facadeBox(h, w, 2.1, d, wall, lam("shackF" + (seed % 4), () => ({ map: shackFront(w, 2.1, seed % 4) })), 0, 1.6, 0, 1.6);
  const roof = tbox(h, w + 0.7, 0.08, d + 0.9, lam("seng", () => ({ map: rep(seng(), 1, 1) })), 0, 2.95, 0.1, 1.6); roof.rotation.x = 0.2;
  box(h, 0.8, 0.14, 0.5, wood, -0.6, 0.3, d / 2 + 0.3); // step
  return h;
};
const midHouse = (seed: number) => { // rumah menengah: plastered walls, terracotta gable roof, terrace with pillars, low fence
  const h = new THREE.Group(), w = 5.6, d = 5.0, cols = ["#f1e3c4", "#cfe3d2", "#f2d2bd", "#d7e0ee"], c = cols[seed % 4];
  const wall = lam("plMid" + c, () => ({ map: rep(plaster(c, c), 1, 1) })), trim = col("#fbf8f0");
  tbox(h, w + 0.3, 0.35, d + 1.8, lam("stoneMid", () => ({ color: "#b9b2a6" })), 0, 0.175, 0.7, 1);
  facadeBox(h, w, 2.9, d, wall, lam("midF" + seed, () => ({ map: midFront(w, 2.9, c, seed) })), 0, 1.8, 0, 2.5);
  gable(h, w, d + 1.6, 2.0, lam("roofT", () => ({ map: rep(roofHD("#c4512f"), 1, 1) })), 3.25, 0.45).position.z = 0.6;
  for (const x of [-w / 2 + 0.3, w / 2 - 0.3]) box(h, 0.22, 2.9, 0.22, trim, x, 1.8, d / 2 + 1.2);
  for (let i = 0; i < 9; i++) { const x = -w / 2 + 0.3 + i * ((w - 0.6) / 8); if (Math.abs(x - 0.0) < 0.6) continue; box(h, 0.08, 0.8, 0.08, col("#3d4a5a"), x, 0.4, d / 2 + 2.2); }
  box(h, w - 0.4, 0.06, 0.06, col("#3d4a5a"), 0, 0.72, d / 2 + 2.2);
  // potted plants on the terrace
  for (const x of [-w / 2 + 0.7, w / 2 - 0.7]) { box(h, 0.35, 0.35, 0.35, col("#b5653f"), x, 0.52, d / 2 + 1.6); const b = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), col("#4f9a45")); b.position.set(x, 0.95, d / 2 + 1.6); b.castShadow = true; h.add(b); }
  return h;
};
const villa = (seed: number) => { // rumah kaya: 2 storeys, white with grey trim, dark hip roof, balcony, columns, gate, car
  const h = new THREE.Group(), w = 9.5, d = 7.5, wall = lam("plVilla", () => ({ map: rep(plaster("villa", "#f7f4ec"), 1, 1) })), trim = col("#8d9298"), dark = col("#2c3038");
  tbox(h, w + 1, 0.5, d + 1, lam("stoneVilla", () => ({ color: "#c9c3b8" })), 0, 0.25, 0, 1);
  facadeBox(h, w, 6.2, d, wall, lam("villaF", () => ({ map: villaFront(w, 6.2) })), 0, 3.6, 0, 3);
  box(h, w + 0.3, 0.25, d + 0.3, trim, 0, 3.6, 0);
  const hip = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4, 1), lam("roofSlate", () => ({ map: rep(roofHD("#4a505c", true), 2, 2) })));
  hip.rotation.y = Math.PI / 4; hip.scale.set((w + 1.6) / Math.SQRT2, 2.6, (d + 1.6) / Math.SQRT2); hip.position.y = 6.7 + 1.3; hip.castShadow = true; h.add(hip);
  // balcony + columns + door + many windows
  box(h, 4.2, 0.2, 1.6, trim, 0, 3.5, d / 2 + 0.8);
  for (let i = 0; i < 9; i++) box(h, 0.07, 0.9, 0.07, dark, -2 + i * 0.5, 4.05, d / 2 + 1.55);
  box(h, 4.2, 0.07, 0.07, dark, 0, 4.5, d / 2 + 1.55);
  for (const x of [-1.8, 1.8]) box(h, 0.4, 3.0, 0.4, col("#f2efe6"), x, 2.0, d / 2 + 1.4);
  // fence wall with a black iron gate, a car in the drive
  for (const s of [-1, 1]) tbox(h, 3.6, 1.6, 0.3, wall, s * 3.6, 0.8, d / 2 + 4.2, 2);
  for (let i = 0; i < 13; i++) box(h, 0.06, 1.7, 0.06, dark, -1.75 + i * 0.29, 0.85, d / 2 + 4.2);
  box(h, 3.6, 0.1, 0.1, dark, 0, 1.65, d / 2 + 4.2);
  const car = new THREE.Group(); car.position.set(2.6, 0, d / 2 + 2.3); h.add(car);
  box(car, 1.8, 0.65, 3.8, col("#c23a3a"), 0, 0.55, 0); box(car, 1.6, 0.55, 2.0, col("#c23a3a"), 0, 1.1, -0.2); box(car, 1.62, 0.42, 1.0, col("#2c3a48"), 0, 1.12, 0.55);
  for (const [x, z] of [[-0.9, 1.2], [0.9, 1.2], [-0.9, -1.2], [0.9, -1.2]]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 14), dark); wh.rotation.z = Math.PI / 2; wh.position.set(x, 0.32, z); car.add(wh); }
  return h;
};
const palm = (parent: THREE.Object3D, x: number, z: number, hgt: number, lean: number) => {
  const p = new THREE.Group(); p.position.set(x, 0, z); parent.add(p);
  const N = 7; let px = 0, py = 0;
  for (let i = 0; i < N; i++) { const seg = hgt / N, nx = lean * ((i + 1) / N) ** 2, ny = py + seg; const m = new THREE.Mesh(new THREE.CylinderGeometry(0.14 - i * 0.008, 0.16 - i * 0.008, seg + 0.05, 8), col(i % 2 ? "#8b6a48" : "#7d5e3e")); m.position.set((px + nx) / 2, (py + ny) / 2, 0); m.rotation.z = -Math.atan2(nx - px, seg); m.castShadow = true; p.add(m); px = nx; py = ny; }
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; const lf = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), col(k % 2 ? "#4f9a45" : "#5fae4f")); lf.scale.set(1.4, 0.08, 0.34); lf.position.set(px + Math.cos(a) * 1.1, py - 0.3, Math.sin(a) * 1.1); lf.rotation.set(0, -a, -0.45); lf.castShadow = true; p.add(lf); }
  return p;
};
const bush = (parent: THREE.Object3D, x: number, z: number, s: number) => { for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.5 * s, 10, 8), col(k % 2 ? "#4f8a3e" : "#5c9b48")); b.position.set(x + Math.cos(k * 1.7) * 0.45 * s, 0.35 * s + (k % 2) * 0.15 * s, z + Math.sin(k * 1.7) * 0.35 * s); b.castShadow = b.receiveShadow = true; parent.add(b); } };
export const coop = (s = 1) => { // kandang ayam (free-standing, never touching a house)
  const c = new THREE.Group(), wood = col("#6b4a2e"), plank = lam("coopPlank", () => ({ map: rep(planksHD(), 0.5, 0.5) }));
  for (const [x, z] of [[-0.8, -0.6], [0.8, -0.6], [-0.8, 0.6], [0.8, 0.6]]) box(c, 0.1, 0.5, 0.1, wood, x, 0.25, z);
  tbox(c, 1.9, 1.1, 1.4, plank, 0, 1.05, 0, 1);
  const r = tbox(c, 2.2, 0.08, 1.8, lam("roofT", () => ({ map: rep(roofHD("#c4512f"), 1, 1) })), 0, 1.75, 0, 1.2); r.rotation.x = -0.22;
  box(c, 0.45, 0.5, 0.05, col("#3a2416"), 0.4, 0.9, 0.71);
  const ramp = box(c, 0.36, 0.04, 0.8, wood, 0.4, 0.33, 1.05); ramp.rotation.x = 0.55;
  c.scale.setScalar(s); return c;
};

// ---------------- layout ----------------
export type Plot = { kind: Kind; x: number; z: number; ry: number; o: THREE.Group; seed: number };
const PLOTS: [Kind, number, number][] = [
  // north side of the road (doors face the road = -z ... rotated) and south side
  ["poor", -40, -7], ["poor", -35, -7.5], ["poor", -30, -7], ["poor", -25, -7.5], ["poor", -42, 7], ["poor", -37, 7.5], ["poor", -32, 7], ["poor", -27, 7.5], ["poor", -22, 7],
  ["mid", -16, -9], ["mid", -8.5, -9], ["mid", -1, -9], ["mid", 6.5, -9], ["mid", -15, 9], ["mid", -7.5, 9], ["mid", 7.5, 9],
  ["rich", 18, -11], ["rich", 31, -11], ["rich", 20, 12],
];
export const COIN_PILE = V(28.6, 0, 4.7);
export const LAPANGAN = V(0, 0, 30); // open field south (where everyone ends up)
export const FARM = V(-2, 0, 46);

// ---------------- rolling hills around the village (3D terrain) ----------------
const smooth01 = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** terrain height: flat village (r < 88 m around (0, 15)), then rolling hills; the rice terraces behind the lapangan stay low.
 *  Starts 0.35 m above the flat grass so the two never z-fight. */
export const terrainH = (x: number, z: number) => {
  const r = Math.hypot(x, z - 15), rise = smooth01(88, 170, r);
  const n = 0.55 + 0.25 * Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.017 - 0.4) + 0.2 * Math.sin(x * 0.047 + z * 0.039) + 0.12 * Math.cos(x * 0.09 - z * 0.071);
  const terr = Math.abs(x) < 70 && z > 64 && z < 140 ? 1 - smooth01(0, 1, Math.min((70 - Math.abs(x)) / 15, (z - 64) / 12, (140 - z) / 12)) : 1;
  return 0.35 + rise * (6 + 30 * n) * Math.max(0.15, terr);
};

// ---------------- whirlwind ----------------
export const WIND = { t0: 40, t1: 100 }; // frames inside the "harta hilang" scene when the funnel crosses the town
export const windX = (lf: number) => -55 + 110 * Math.max(0, Math.min(1, (lf - WIND.t0) / (WIND.t1 - WIND.t0)));
const swirlTex = () => ctex("swirlGrey", 512, 512, (g, r) => { // condensation streaks: greys only, darker toward the top of the funnel
  g.clearRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) {
    const y = r() * 512, w = 80 + r() * 220, top = 1 - y / 512, l = Math.round(150 + r() * 70 - top * 70);
    g.strokeStyle = `rgba(${l},${l + 3},${l + 8},${0.35 + r() * 0.45})`; g.lineWidth = 8 + r() * 18; g.lineCap = "round";
    g.beginPath(); const x = r() * 512; g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 10, x + w, y + 4); g.stroke();
  }
});
export class AyamWorld {
  root = new THREE.Group();
  pool = new Pool();
  hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 0.6);
  sun = new THREE.DirectionalLight("#fff0d6", 2.6);
  fog = new THREE.Fog("#bccbec", 25, 420);
  skyMat: THREE.ShaderMaterial; sky: THREE.Mesh;
  plots: Plot[] = [];
  coinPile = new THREE.Group();
  funnel = new THREE.Group(); funnelLayers: THREE.Mesh[] = []; funnelDust: THREE.Mesh[] = [];
  debris: THREE.Mesh[] = [];
  coops: THREE.Group[] = [];
  actors: Actor[] = []; fxs: Fx[] = [];
  clouds: THREE.Mesh[] = [];
  roads: THREE.Mesh[] = [];
  crack!: THREE.Mesh; clouds3d: THREE.Group[] = []; cloudMat!: THREE.MeshBasicMaterial; cloudShadows: THREE.Mesh[] = [];
  ref = { board: new THREE.Group(), roast: new THREE.Group(), basket: new THREE.Group(), protest: [] as THREE.Group[], bones: new THREE.Group(), suv: new THREE.Group(), dijual: new THREE.Group() };
  boardFace!: THREE.MeshBasicMaterial; boardTex: Record<string, THREE.Texture> = {};
  rain: THREE.InstancedMesh; signs: THREE.Object3D[] = []; moon: THREE.Mesh; bonfire = new THREE.Group(); flames: THREE.Mesh[] = [];
  sunDir = new THREE.Vector3();

  constructor() {
    const R = this.root;
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el)); c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat); this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    // 3D clouds: clusters of soft puffs, white tops, blue-grey undersides (vertex gradient), no ink, layered to the horizon
    const puffGeo = (() => { const g = new THREE.SphereGeometry(1, 18, 12), n = g.attributes.normal as THREE.BufferAttribute, c: number[] = [];
      for (let i = 0; i < n.count; i++) { const t = Math.max(0, Math.min(1, (n.getY(i) + 0.45) / 1.2)); c.push(0.72 + 0.28 * t, 0.77 + 0.23 * t, 0.86 + 0.14 * t); }
      g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3)); return g; })();
    this.cloudMat = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(1.06, 1.06, 1.06), fog: true });
    const cloud = (x: number, y: number, z: number, sz: number, seed: number) => {
      const g = new THREE.Group(); g.position.set(x, y, z);
      const n = 6 + Math.floor(hash(seed) * 5);
      for (let k = 0; k < n; k++) { const m = new THREE.Mesh(puffGeo, this.cloudMat); const t = k / (n - 1) - 0.5, r = (0.45 + hash(seed + k) * 0.4) * sz;
        m.position.set(t * sz * 2.1 + (hash(seed + k * 3) - 0.5) * sz * 0.4, r * 0.35 + (k % 2) * sz * 0.18 * (1 - Math.abs(t) * 1.4), (hash(seed + k * 7) - 0.5) * sz * 0.7); m.scale.set(r, r * 0.82, r); m.layers.set(NOINK); g.add(m); }
      const flat = new THREE.Mesh(puffGeo, this.cloudMat); flat.scale.set(sz * 1.25, sz * 0.18, sz * 0.55); flat.layers.set(NOINK); g.add(flat); // flat-ish base
      g.rotation.y = hash(seed + 9) * Math.PI; R.add(g); this.clouds3d.push(g); return g;
    };
    for (let i = 0; i < 46; i++) { const a = hash(i * 3.7) * Math.PI * 2, d = 160 + hash(i * 1.9) * 650; cloud(Math.cos(a) * d, 85 + hash(i * 5.3) * 90 + d * 0.06, Math.sin(a) * d + 15, 14 + hash(i * 2.2) * 26, i * 11); }
    for (const [x, z] of [[-30, 40], [25, -25], [-10, 70], [40, 30]] as number[][]) cloud(x, 62, z, 12, x * 7 + z);
    // ground: grass with holes + dirt strips + road + lapangan, all exactly at y = 0 and never overlapping
    // (overlapping planes z-fight through the post chain: whole planes flickered away in the first test)
    const rectPts = (x0: number, x1: number, z0: number, z1: number) => [new THREE.Vector2(x0, -z0), new THREE.Vector2(x1, -z0), new THREE.Vector2(x1, -z1), new THREE.Vector2(x0, -z1)];
    const flatShape = (sh: THREE.Shape, m: THREE.Material) => { const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); const o = new THREE.Mesh(g, m); o.receiveShadow = true; R.add(o); return o; };
    const TOWN = [-60, 50, -15, 15], LAP = [-30, 30, 17, 51];
    const grassSh = new THREE.Shape(rectPts(-1200, 1200, -1200, 1200)); for (const [a, b, c, d] of [TOWN, LAP]) grassSh.holes.push(new THREE.Path(rectPts(a, b, c, d).reverse()));
    flatShape(grassSh, lam("grassW", () => ({ map: rep(grassHD(), 1 / 6, 1 / 6) })));
    const dirt = lam("dirtW", () => ({ map: rep(ground(), 1 / 10, 1 / 10) }));
    flatShape(new THREE.Shape(rectPts(TOWN[0], TOWN[1], TOWN[2], -2.75)), dirt);
    flatShape(new THREE.Shape(rectPts(TOWN[0], TOWN[1], 2.75, TOWN[3])), dirt);
    flatShape(new THREE.Shape(rectPts(LAP[0], LAP[1], LAP[2], LAP[3])), dirt);
    const roadTex = rep(asphalt(), 1 / 14, 1 / 5.5); roadTex.offset.y = 0.5;
    this.roads.push(flatShape(new THREE.Shape(rectPts(TOWN[0], TOWN[1], -2.75, 2.75)), lam("roadW", () => ({ map: roadTex }))));
    // houses
    PLOTS.forEach(([kind, x, z], i) => {
      const o = kind === "poor" ? shack(i) : kind === "mid" ? midHouse(i) : villa(i);
      o.position.set(x, 0, z); o.rotation.y = z < 0 ? 0 : Math.PI; R.add(o); this.plots.push({ kind, x, z, ry: o.rotation.y, o, seed: i });
    });
    // trees, bushes, a mosque-like dome far away for place (simple), poles
    for (const [x, z, h, l] of [[-44, -14, 7, 0.6], [-28, -13, 6.5, -0.5], [-19, 14, 7, 0.7], [-3, -15, 6, 0.5], [12, -16, 7, -0.6], [14, 15, 6.5, 0.5], [38, -17, 7, -0.4], [28, 17, 7, 0.6], [-10, 22, 6, 0.4], [10, 24, 6.5, -0.5], [-24, 40, 7, 0.5], [22, 44, 6.5, -0.6]] as number[][]) palm(R, x, z, h, l);
    for (const [x, z, s] of [[-20, -4.5, 1], [-12, 4.5, 0.9], [2, -4.6, 1], [11, 4.5, 0.9], [-36, 4.4, 0.8], [26, -5, 1.2], [16, 4.7, 1]] as number[][]) bush(R, x, z, s);
    // ================= surroundings (the reference never shows an empty, flat world) =================
    {
      const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), SC = new THREE.Vector3(), PO = new THREE.Vector3();
      const inst = (geo: THREE.BufferGeometry, mat: THREE.Material, list: { p: THREE.Vector3; r: THREE.Euler; s: THREE.Vector3 }[], shadow = true) => {
        const m = new THREE.InstancedMesh(geo, mat, list.length); list.forEach((it, i) => { Q.setFromEuler(it.r); M4.compose(it.p, Q, it.s); m.setMatrixAt(i, M4); });
        m.castShadow = shadow; m.receiveShadow = true; R.add(m); return m;
      };
      const plotsXZ = PLOTS.map(([k, x, z]) => ({ x, z, r: k === "poor" ? 3.2 : k === "mid" ? 5.2 : 8.5 }));
      const free = (x: number, z: number) => Math.abs(z) > 3.3 && !plotsXZ.some((p) => Math.hypot(x - p.x, z - p.z) < p.r) && Math.hypot(x - COIN_PILE.x, z - COIN_PILE.z) > 3.2;
      // --- 1. layered backdrop: treeline ring (palms + leafy trees), hills, mountains, rice terraces ---
      const trunks: { p: THREE.Vector3; r: THREE.Euler; s: THREE.Vector3 }[] = [], crowns: typeof trunks = [];
      // rolling 3D hills: one ring mesh, height from terrainH, vertex colours (lighter sunny tops, darker hollows)
      { const g = new THREE.RingGeometry(88, 900, 160, 70); g.rotateX(-Math.PI / 2); g.translate(0, 0, 15);
        const pa = g.attributes.position as THREE.BufferAttribute, cl: number[] = [];
        for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), z = pa.getZ(i), y = terrainH(x, z); pa.setY(i, y); }
        g.computeVertexNormals(); const nn = g.attributes.normal as THREE.BufferAttribute;
        for (let i = 0; i < pa.count; i++) { const up = nn.getY(i), y = pa.getY(i), k = 0.78 + 0.28 * Math.min(1, y / 30) + (up - 0.9) * 1.6; cl.push(0.42 * k, 0.66 * k, 0.33 * k); }
        g.setAttribute("color", new THREE.Float32BufferAttribute(cl, 3));
        const t = new THREE.Mesh(g, lam("hillsV", () => ({ vertexColors: true, map: rep(grassHD(), 1 / 12, 1 / 12) }))); t.receiveShadow = true; R.add(t); }
      // 3D broadleaf trees made of leafy clumps (each clump has its own lit / shade side) + coconut palms, standing on the terrain
      const leafTex = ctex("leafClump", 256, 256, (g, r) => { g.fillStyle = "#4f8f3e"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 260; i++) { const x = r() * 256, y = r() * 256; g.fillStyle = ["#5fa34a", "#457f37", "#6db456", "#3c7032"][i % 4]; g.beginPath(); g.ellipse(x, y, 10 + r() * 10, 6 + r() * 6, r() * 3, 0, 7); g.fill(); } });
      const clumpList: { p: THREE.Vector3; r: THREE.Euler; s: THREE.Vector3; c: number }[] = [], tTrunk: typeof trunks = [];
      const clumpTree = (x: number, z: number, hgt: number, seed: number) => {
        const y0 = Math.hypot(x, z - 15) > 88 ? terrainH(x, z) : 0;
        tTrunk.push({ p: V(x, y0 + hgt * 0.35, z), r: new THREE.Euler((hash(seed) - 0.5) * 0.1, 0, (hash(seed + 1) - 0.5) * 0.12), s: V(1, hgt * 0.7, 1) });
        const n = 5 + Math.floor(hash(seed + 2) * 4);
        for (let k = 0; k < n; k++) { const a = k * 2.4 + seed, rr = k === 0 ? 0 : hgt * (0.18 + 0.1 * hash(seed + k)), sz = hgt * (0.22 + 0.12 * hash(seed + k * 5));
          clumpList.push({ p: V(x + Math.cos(a) * rr, y0 + hgt * (0.62 + 0.25 * hash(seed + k * 3)) + (k === 0 ? hgt * 0.18 : 0), z + Math.sin(a) * rr), r: new THREE.Euler(hash(seed + k), hash(seed + k + 1) * 6, 0), s: V(sz, sz * 0.85, sz), c: 0.82 + 0.3 * hash(seed + k * 9) }); }
      };
      for (let i = 0; i < 520; i++) {
        const a = hash(i * 1.3) * Math.PI * 2, r = 75 + hash(i * 2.7) * 120, x = Math.cos(a) * r, z = Math.sin(a) * r + 10;
        if (Math.abs(x) < 70 && z > 64 && z < 140) continue; // keep the rice terraces open
        if (i % 3 === 0) { const h = 6 + hash(i * 3.1) * 5, y0 = Math.hypot(x, z - 15) > 88 ? terrainH(x, z) : 0; trunks.push({ p: V(x, y0 + h / 2, z), r: new THREE.Euler(0, 0, (hash(i) - 0.5) * 0.25), s: V(1, h, 1) }); crowns.push({ p: V(x, y0 + h, z), r: new THREE.Euler(0, a, 0), s: V(2.6, 0.9, 2.6) }); }
        else clumpTree(x, z, 5 + hash(i * 4.1) * 5, i * 7);
      }
      inst(new THREE.CylinderGeometry(0.12, 0.17, 1, 6), col("#7d5e3e"), trunks, false);
      inst(new THREE.SphereGeometry(1, 10, 6), col("#4f9a45"), crowns, false);
      inst(new THREE.CylinderGeometry(0.16, 0.24, 1, 7), col("#6b4a2e"), tTrunk, false);
      { const m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), lam("leafClumpM", () => ({ map: leafTex })), clumpList.length); const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), C = new THREE.Color();
        clumpList.forEach((it, i) => { Q.setFromEuler(it.r); M4.compose(it.p, Q, it.s); m.setMatrixAt(i, M4); m.setColorAt(i, C.setRGB(it.c, it.c * 1.02, it.c * 0.9)); });
        m.castShadow = true; m.receiveShadow = true; R.add(m); }
      // soft cloud shadows drifting over the flat village ground (under the low clouds)
      const shTex = ctex("cloudShadow", 256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 20, 128, 128, 126); gr.addColorStop(0, "rgba(20,30,60,0.55)"); gr.addColorStop(1, "rgba(20,30,60,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
      for (const [x, z] of [[-30, 40], [25, -25], [-10, 70], [40, 30]] as number[][]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(34, 22), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })); m.rotation.x = -Math.PI / 2; m.position.set(x + 8, 0.05, z + 5); m.layers.set(NOINK); m.renderOrder = 0.6; R.add(m); this.cloudShadows.push(m); }
      for (const [x, z, r, h, c] of [[-300, -420, 110, 115, "#8aa3c4"], [70, -470, 140, 135, "#93abc9"], [360, -390, 100, 100, "#9ab0cc"], [-420, 300, 110, 95, "#93abc9"], [330, 380, 120, 110, "#9ab0cc"]] as [number, number, number, number, string][]) {
        const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 9), lam("mtn" + c, () => ({ color: c }))); m.position.set(x, h / 2 - 8, z); R.add(m);
      }
      const sawah = lam("sawahT", () => ({ map: rep(ctex("sawahTex", 512, 256, (g) => { g.fillStyle = "#86c25a"; g.fillRect(0, 0, 512, 256); for (let y = 0; y < 256; y += 12) { g.fillStyle = y % 24 ? "#9fd36c" : "#6faf47"; g.fillRect(0, y, 512, 5); } g.fillStyle = "rgba(170,215,240,0.4)"; for (let i = 0; i < 6; i++) g.fillRect(i * 90 + 10, 0, 4, 256); }), 1 / 10, 1 / 10) }));
      for (let k = 0; k < 6; k++) { const t = new THREE.Mesh(new THREE.BoxGeometry(110 - k * 8, 0.6 + k * 0.9, 9), sawah); t.position.set(0, (0.6 + k * 0.9) / 2, 74 + k * 9); t.receiveShadow = true; R.add(t); } // rice terraces stepping up behind the lapangan
      // --- 2. ground detail: road curbs, dirt mounds, grass tufts, pebbles, dry leaves ---
      const curb = col("#b9b4aa"), curbStripe = col("#3a3f48");
      for (const zc of [-2.95, 2.95]) for (let x = -59; x < 49; x += 2) { const stripe = Math.round(x / 2) % 2 === 0; box(R, 1.96, 0.16, 0.24, stripe ? curb : curbStripe, x + 1, 0.08, zc); }
      const mounds: typeof trunks = [];
      for (let i = 0; i < 40; i++) { const x = -58 + hash(i * 5.1) * 106, z = (hash(i * 6.3) < 0.5 ? -1 : 1) * (4 + hash(i * 7.9) * 10); if (!free(x, z)) continue; mounds.push({ p: V(x, -0.12, z), r: new THREE.Euler(0, hash(i) * 3, 0), s: V(0.5 + hash(i + 1) * 0.7, 0.3 + hash(i + 2) * 0.15, 0.4 + hash(i + 3) * 0.5) }); }
      inst(new THREE.SphereGeometry(1, 10, 6), lam("moundDirt", () => ({ color: "#b8956a" })), mounds);
      const tufts: typeof trunks = [], pebbles: typeof trunks = [], leaves: typeof trunks = [];
      for (let i = 0; i < 5200; i++) {
        const lap = i % 12 === 0, x = lap ? -30 + hash(i * 1.7) * 60 : -60 + hash(i * 1.7) * 110, z = lap ? 17 + hash(i * 2.9) * 34 : -15 + hash(i * 2.9) * 30;
        if (!lap && !free(x, z)) continue;
        if (i % 3 === 0) tufts.push({ p: V(x, 0, z), r: new THREE.Euler((hash(i) - 0.5) * 0.4, hash(i + 1) * 6, (hash(i + 2) - 0.5) * 0.4), s: V(1, 0.7 + hash(i + 3) * 0.8, 1) });
        else if (i % 3 === 1) pebbles.push({ p: V(x, 0.015, z), r: new THREE.Euler(hash(i), hash(i + 1) * 6, 0), s: V(0.6 + hash(i + 2), 0.5, 0.6 + hash(i + 3)) });
        else if (i % 6 === 2) leaves.push({ p: V(x, 0.008, z), r: new THREE.Euler(0, hash(i) * 6, (hash(i + 1) - 0.5) * 0.3), s: V(1, 1, 1) });
      }
      for (let i = 0; i < 3500; i++) { const a = hash(i * 0.37) * Math.PI * 2, r = 16 + hash(i * 0.91) * 60, x = Math.cos(a) * r, z = Math.sin(a) * r + 15; if ((Math.abs(x) < 61 && Math.abs(z) < 16) || (Math.abs(x) < 31 && z > 16 && z < 52)) continue; tufts.push({ p: V(x, 0, z), r: new THREE.Euler(0, hash(i) * 6, 0), s: V(1.3, 0.9 + hash(i + 3), 1.3) }); }
      const tuftGeo = (() => { const gs: THREE.BufferGeometry[] = []; for (let k = 0; k < 5; k++) { const c = new THREE.ConeGeometry(0.035, 0.32, 4); c.translate(0, 0.16, 0); c.rotateZ((k - 2) * 0.28); c.rotateY(k * 1.3); gs.push(c.toNonIndexed()); } const pos = gs.flatMap((g) => Array.from(g.attributes.position.array as Float32Array)); const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g; })();
      inst(tuftGeo, col("#5f9e3e"), tufts, false);
      inst(new THREE.DodecahedronGeometry(0.05), col("#a39684"), pebbles, false);
      inst(new THREE.BoxGeometry(0.09, 0.006, 0.05), col("#a8733a"), leaves, false);
      // --- 3. dense bamboo picket fences along the poor yards, low brick walls along the middle yards ---
      const pickets: typeof trunks = [], rails: typeof trunks = [];
      const fenceRun = (x0: number, x1: number, z: number, gaps: number[]) => { for (let x = x0; x <= x1; x += 0.22) { if (gaps.some((gx) => Math.abs(x - gx) < 0.6)) continue; pickets.push({ p: V(x, 0.55, z), r: new THREE.Euler((hash(x) - 0.5) * 0.06, 0, (hash(x + 1) - 0.5) * 0.08), s: V(1, 1.1 + (hash(x * 3) - 0.5) * 0.15, 1) }); } rails.push({ p: V((x0 + x1) / 2, 0.75, z + 0.04), r: new THREE.Euler(0, 0, Math.PI / 2), s: V(1, x1 - x0, 1) }, { p: V((x0 + x1) / 2, 0.35, z + 0.04), r: new THREE.Euler(0, 0, Math.PI / 2), s: V(1, x1 - x0, 1) }); };
      fenceRun(-43, -21.5, -4.7, [-40.6, -35.6, -30.6, -25.6]); fenceRun(-45, -19.5, 4.8, [-41.4, -36.4, -31.4, -26.4, -21.4]);
      inst(new THREE.CylinderGeometry(0.035, 0.04, 1, 6), col("#c9a45a"), pickets);
      inst(new THREE.CylinderGeometry(0.025, 0.025, 1, 6), col("#a8843f"), rails);
      // --- 4. everyday clutter around the houses ---
      const chair = (x: number, z: number, ry: number, c: string) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; R.add(g); const m = col(c); box(g, 0.45, 0.05, 0.45, m, 0, 0.45, 0); box(g, 0.45, 0.45, 0.05, m, 0, 0.7, -0.2); for (const [a, b] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) box(g, 0.04, 0.45, 0.04, m, a, 0.22, b); };
      const jerigen = (x: number, z: number, c: string) => { box(R, 0.28, 0.4, 0.18, col(c), x, 0.2, z); box(R, 0.06, 0.08, 0.06, col("#2c2f36"), x + 0.08, 0.44, z); };
      const sapu = (x: number, z: number) => { const s1 = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.9, 8), col("#c9a45a")); s1.position.set(x, 0.62, z); s1.rotation.z = 0.25; s1.castShadow = true; R.add(s1); };
      const kayu = (x: number, z: number) => { for (let k = 0; k < 9; k++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 7), col(k % 2 ? "#7a5634" : "#8b6a48")); l.rotation.z = Math.PI / 2; l.position.set(x, 0.08 + Math.floor(k / 4) * 0.13, z + (k % 4) * 0.15 - 0.22 + (Math.floor(k / 4) % 2) * 0.07); l.castShadow = true; R.add(l); } };
      PLOTS.forEach(([kind, x, z], i) => {
        const side = z < 0 ? 1 : -1, fz = z + side * (kind === "poor" ? 2.4 : kind === "mid" ? 4.0 : 0);
        if (kind === "poor") { chair(x + 1.4, fz, hash(i) * 2, ["#2f6fb5", "#e2453c", "#3a9a5a"][i % 3]); jerigen(x - 1.7, fz + side * 0.2, ["#2f7fd0", "#e0a91e"][i % 2]); if (i % 2) sapu(x + 1.9, z + side * 1.5); else kayu(x - 2.2, z - side * 0.5); }
        if (kind === "mid") { chair(x + 1.6, fz - side * 1.0, 0.4, "#f2f2f2"); chair(x + 2.3, fz - side * 1.0, -0.3, "#f2f2f2"); }
      });
      // --- 5. power cables sagging between the street lamp poles ---
      const cableM = col("#2a2c33");
      for (let x = -54; x < 46; x += 12) for (const dy of [0, -0.35]) {
        const pts = Array.from({ length: 13 }, (_, k) => { const t = k / 12; return V(x + 0.05 + t * 12, 4.9 + dy - Math.sin(t * Math.PI) * 0.55, -3.4); });
        const c = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.014, 4), cableM); R.add(c);
      }
    }
    // street life: lamps, umbul-umbul (red-white banners), motorbikes, jemuran (clotheslines), potted plants
    const pole = col("#5c6670"), bambooM = col("#c9a45a");
    for (let x = -54; x <= 46; x += 12) { box(R, 0.14, 5.2, 0.14, pole, x, 2.6, -3.4); box(R, 1.1, 0.1, 0.12, pole, x + 0.5, 5.15, -3.4); const lh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color("#fff3d0").multiplyScalar(1.2) })); lh.position.set(x + 1.0, 5.05, -3.4); R.add(lh); }
    const flagTex2 = ctex("merahPutih", 64, 512, (g) => { g.fillStyle = "#d0202c"; g.fillRect(0, 0, 64, 256); g.fillStyle = "#f7f4ec"; g.fillRect(0, 256, 64, 256); });
    for (let x = -50; x <= 44; x += 10) {
      const bp = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 6.5, 6), bambooM); bp.position.set(x, 3.25, 3.4); bp.rotation.z = 0.06; bp.castShadow = true; R.add(bp);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 2.6, 1, 6), lam("flagMP", () => ({ map: flagTex2, side: THREE.DoubleSide })));
      const pa = fl.geometry.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pa.count; i++) pa.setX(i, pa.getX(i) + Math.sin((pa.getY(i) + 1.3) * 1.6) * 0.18);
      fl.position.set(x + 0.32, 4.6, 3.4); fl.castShadow = true; R.add(fl);
    }
    const motor = (x: number, z: number, ry: number, c: string) => { const m = new THREE.Group(); m.position.set(x, 0, z); m.rotation.y = ry; R.add(m);
      for (const zz of [-0.62, 0.62]) { const wh = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.07, 8, 16), col("#1f2126")); wh.rotation.y = Math.PI / 2; wh.position.set(0, 0.32, zz); wh.castShadow = true; m.add(wh); }
      box(m, 0.26, 0.32, 1.0, col(c), 0, 0.55, 0); box(m, 0.28, 0.12, 0.62, col("#222428"), 0, 0.8, -0.15); box(m, 0.18, 0.55, 0.12, col(c), 0, 0.8, 0.55); box(m, 0.62, 0.05, 0.05, col("#2c2f36"), 0, 1.08, 0.55); };
    motor(-14.2, 5.0, 0.3, "#c0392b"); motor(-6.8, 5.2, -0.2, "#2f6fb5"); motor(8.2, 5.0, 0.4, "#1f8a5a"); motor(-9.5, -5.0, 2.9, "#e0a91e"); motor(-2.5, -5.1, 3.3, "#2c2f36");
    const jemuran = (x: number, z: number) => { for (const dx of [-1.4, 1.4]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.9, 6), bambooM); p.position.set(x + dx, 0.95, z); p.castShadow = true; R.add(p); }
      const line = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 2.8, 4), col("#d9d4c8")); line.rotation.z = Math.PI / 2; line.position.set(x, 1.85, z); R.add(line);
      ["#e2453c", "#3f6fb5", "#f2c230", "#5fae4f"].forEach((c, k) => { const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), lam("cloth" + c, () => ({ color: c, side: THREE.DoubleSide }))); cl.position.set(x - 1.0 + k * 0.65, 1.5, z + (k % 2) * 0.02); cl.castShadow = true; R.add(cl); }); };
    jemuran(-37.5, -3.6 - 1.3); jemuran(-29.5, 4.3); jemuran(-40, 4.5);
    // coin heap of the rich man: ~1600 individual coins on a heap curve (+ a hidden core), gold bars, money sacks
    const heapH = (r: number) => Math.max(0, 1.35 * (1 - Math.pow(Math.min(1, r / 2.3), 1.25)));
    const heapCore = new THREE.Mesh(new THREE.LatheGeometry(Array.from({ length: 12 }, (_, i) => new THREE.Vector2(2.2 * (1 - i / 11), heapH(2.2 * (1 - i / 11)) - 0.06)), 28), lam("goldCore", () => ({ color: "#d99a18" })));
    heapCore.receiveShadow = true; this.coinPile.add(heapCore);
    const coinG = new THREE.CylinderGeometry(0.105, 0.105, 0.028, 14), N = 1600;
    for (const [mi, colr] of [[0, "#f2c230"], [1, "#ffd84a"], [2, "#e0a91e"]] as const) {
      const inst = new THREE.InstancedMesh(coinG, lam("coin" + colr, () => ({ color: colr })), Math.ceil(N / 3)); inst.castShadow = inst.receiveShadow = true;
      const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler();
      for (let k = 0; k < inst.count; k++) {
        const i = k * 3 + mi, a = hash(i) * Math.PI * 2, rr = 2.45 * Math.sqrt(hash(i + 0.5));
        const y = heapH(rr) - hash(i + 2) * 0.05, slope = Math.atan(1.35 * 1.25 * Math.pow(rr / 2.3, 0.25) / 2.3);
        E.set((hash(i + 3) - 0.5) * 0.9, a, rr < 2.3 ? slope + (hash(i + 4) - 0.5) * 0.7 : (hash(i + 4) - 0.5) * 0.3, "YXZ"); Q.setFromEuler(E);
        M4.compose(V(Math.cos(a) * rr, y + 0.014, Math.sin(a) * rr), Q, V(1, 1, 1)); inst.setMatrixAt(k, M4);
      }
      this.coinPile.add(inst);
    }
    for (let i = 0; i < 9; i++) { const a = 0.4 + i * 0.7, rr = 1.2 + (i % 3) * 0.45; const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.11, 0.15), lam("goldBar", () => ({ color: "#ffcf3a" }))); b.position.set(Math.cos(a) * rr, heapH(rr) + 0.04, Math.sin(a) * rr); b.rotation.set(0.25, a * 2, 0.2); b.castShadow = true; this.coinPile.add(b); }
    const sackTex = ctex("rpSack", 512, 256, (g) => { g.fillStyle = "#d8c49a"; g.fillRect(0, 0, 512, 256); g.fillStyle = "#3d6b3a"; g.font = "bold 110px Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("Rp", 256, 140); });
    for (const [x, z, s2] of [[-1.9, 1.3, 1], [2.1, 1.0, 0.85]] as number[][]) {
      const sk = new THREE.Mesh(new THREE.SphereGeometry(0.45, 18, 12), lam("rpSackM", () => ({ map: sackTex }))); sk.scale.set(s2, s2 * 1.15, s2); sk.position.set(x, 0.45 * s2, z); sk.rotation.y = Math.atan2(x, z) + Math.PI / 2 + Math.PI; sk.castShadow = true; this.coinPile.add(sk);
      const knot = new THREE.Mesh(new THREE.ConeGeometry(0.16 * s2, 0.28 * s2, 10), lam("rpKnot", () => ({ color: "#c9b083" }))); knot.position.set(x, 0.98 * s2, z); knot.castShadow = true; this.coinPile.add(knot);
    }
    this.coinPile.position.copy(COIN_PILE); R.add(this.coinPile);
    const streak = ctex("rainStreak", 16, 128, (g) => { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "rgba(220,230,245,0)"); gr.addColorStop(0.5, "rgba(220,230,245,0.9)"); gr.addColorStop(1, "rgba(220,230,245,0)"); g.fillStyle = gr; g.fillRect(5, 0, 6, 128); });
    this.rain = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.025, 0.8), new THREE.MeshBasicMaterial({ map: streak, transparent: true, depthWrite: false, opacity: 0.7, fog: false }), 6000);
    this.rain.layers.set(NOINK); this.rain.renderOrder = 6; this.rain.frustumCulled = false; this.rain.visible = false; R.add(this.rain);
    // moon (night), bonfire on the lapangan (night), Indonesian shop signs, foreground props
    this.moon = new THREE.Mesh(new THREE.CircleGeometry(16, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color("#fff6d8").multiplyScalar(2.2), fog: false }));
    this.moon.layers.set(NOINK); this.moon.visible = false; R.add(this.moon);
    const fireTex = ctex("fireCard", 256, 384, (g) => { const gr = g.createRadialGradient(128, 300, 10, 128, 260, 150); gr.addColorStop(0, "#fff7c0"); gr.addColorStop(0.35, "#ffb236"); gr.addColorStop(0.7, "#e2452a"); gr.addColorStop(1, "rgba(200,40,20,0)");
      g.fillStyle = gr; g.beginPath(); g.moveTo(128, 20); g.bezierCurveTo(200, 140, 236, 230, 200, 330); g.quadraticCurveTo(128, 380, 56, 330); g.bezierCurveTo(20, 230, 60, 140, 128, 20); g.fill(); });
    for (let k = 0; k < 3; k++) { const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.9 - k * 0.2, 1.35 - k * 0.3).translate(0, (1.35 - k * 0.3) / 2, 0), new THREE.MeshBasicMaterial({ map: fireTex, transparent: true, depthWrite: false, color: new THREE.Color(1, 1, 1).multiplyScalar(1.25 - k * 0.1), fog: false })); fl.position.x = (k - 1) * 0.12; fl.layers.set(NOINK); fl.renderOrder = 3; this.flames.push(fl); this.bonfire.add(fl); }
    for (let k = 0; k < 6; k++) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.1, 8), col("#5a3b22")); lg.rotation.set(Math.PI / 2 - 0.35, (k / 6) * Math.PI * 2, 0); lg.position.set(Math.cos((k / 6) * Math.PI * 2) * 0.25, 0.18, Math.sin((k / 6) * Math.PI * 2) * 0.25); lg.castShadow = true; this.bonfire.add(lg); }
    for (let k = 0; k < 10; k++) { const st = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), col("#7a746c")); st.scale.y = 0.6; st.position.set(Math.cos(k * 0.63) * 0.55, 0.05, Math.sin(k * 0.63) * 0.55); this.bonfire.add(st); }
    const glowTex = ctex("glowDisc", 128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,160,70,0.85)"); gr.addColorStop(1, "rgba(255,120,40,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); pool.rotation.x = -Math.PI / 2; pool.position.y = 0.04; pool.layers.set(NOINK); this.bonfire.add(pool); // warm light pool on the ground
    this.bonfire.position.set(LAPANGAN.x + 0.3, 0, LAPANGAN.z + 0.9); this.bonfire.visible = false; R.add(this.bonfire);
    const sign = (text: string, sub: string, bg: string, fg: string, x: number, z: number, faceZ: 1 | -1, w = 3.2, hgt = 0.95, y = 2.3) => {
      const tex = ctex("sign_" + text, 1024, Math.round(1024 * hgt / w), (g) => { const H = g.canvas.height; g.fillStyle = bg; g.fillRect(0, 0, 1024, H); g.strokeStyle = fg; g.lineWidth = 14; g.strokeRect(16, 16, 992, H - 32); g.fillStyle = fg; g.textAlign = "center"; g.font = `900 ${Math.round(H * 0.42)}px 'Avenir Next', Arial`; g.fillText(text, 512, H * 0.52); g.font = `700 ${Math.round(H * 0.18)}px 'Avenir Next', Arial`; g.fillText(sub, 512, H * 0.8); });
      const face = new THREE.MeshBasicMaterial({ map: tex }), side = col("#3a3f48");
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, 0.1), faceZ > 0 ? [side, side, side, side, face, side] : [side, side, side, side, side, face]);
      b.position.set(x, y, z); b.castShadow = true; R.add(b); this.signs.push(b);
      for (const dx of [-w / 2 + 0.2, w / 2 - 0.2]) this.signs.push(box(R, 0.1, y, 0.1, side, x + dx, y / 2, z - faceZ * 0.08));
    };
    sign("TOKO EMAS", "SINAR JAYA · BELI & JUAL", "#b0263a", "#ffd84a", 32.6, -4.0, 1, 3.6);
    sign("WARUNG BU SRI", "KOPI · MIE · ES TEH", "#2f6fb5", "#ffffff", -5.0, -3.95, 1, 3.4);
    sign("PULSA", "TOKEN LISTRIK · E-WALLET", "#f2c230", "#c0392b", -23.4, 4.05, -1, 2.4, 0.9, 2.1);
    // foreground props: coin towers in front of the rich man's heap, a bucket and rice sack by the shack
    const coinStack = (x: number, z: number, n: number) => { for (let i = 0; i < n; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.028, 14), col(i % 2 ? "#ffd84a" : "#f2c230")); c.position.set(x + (hash(i + x) - 0.5) * 0.02, 0.014 + i * 0.03, z + (hash(i + z) - 0.5) * 0.02); c.castShadow = true; R.add(c); } };
    coinStack(27.15, 8.15, 14); coinStack(27.45, 8.35, 9); coinStack(26.9, 8.45, 20);
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.32, 16, 1, true), lam("bucketBlue", () => ({ color: "#2f7fd0", side: THREE.DoubleSide }))); bucket.position.set(-25.15, 0.16, 1.55); bucket.castShadow = true; R.add(bucket);
    const bb = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), col("#2f7fd0")); bb.rotation.x = -Math.PI / 2; bb.position.set(-25.15, 0.005, 1.55); R.add(bb);
    const rice = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), lam("riceSack", () => ({ map: ctex("berasSack", 512, 256, (g) => { g.fillStyle = "#efe6d2"; g.fillRect(0, 0, 512, 256); g.fillStyle = "#3d6b3a"; g.font = "900 70px Arial"; g.textAlign = "center"; g.fillText("BERAS", 256, 150); }) })));
    rice.scale.set(1, 1.2, 0.8); rice.position.set(-27.1, 0.33, 1.7); rice.rotation.y = Math.PI; rice.castShadow = true; R.add(rice);
    // ---- props for the story beats (hidden until a shot shows them) ----
    { // chalkboard on an easel: KENAPA? the rich line goes up, the poor line goes down
      const t = ctex("kenapaBoard", 1024, 740, (g) => {
        g.fillStyle = "#1f4a37"; g.fillRect(0, 0, 1024, 740); g.fillStyle = "rgba(255,255,255,0.05)"; for (let i = 0; i < 60; i++) g.fillRect(Math.random() * 1024, Math.random() * 740, 120, 6);
        g.fillStyle = "#f4f1e6"; g.font = "900 110px 'Avenir Next', Arial"; g.textAlign = "center"; g.fillText("KENAPA?", 512, 130);
        g.strokeStyle = "#f4f1e6"; g.lineWidth = 8; g.beginPath(); g.moveTo(120, 200); g.lineTo(120, 660); g.lineTo(930, 660); g.stroke();
        g.lineCap = "round"; g.lineJoin = "round";
        g.strokeStyle = "#7be08f"; g.lineWidth = 14; g.beginPath(); g.moveTo(140, 470); g.lineTo(380, 430); g.lineTo(560, 340); g.lineTo(760, 250); g.lineTo(880, 190); g.stroke();
        g.fillStyle = "#7be08f"; g.beginPath(); g.moveTo(905, 175); g.lineTo(850, 175); g.lineTo(890, 225); g.fill(); g.font = "900 64px 'Avenir Next', Arial"; g.textAlign = "left"; g.fillText("KAYA", 650, 210);
        g.strokeStyle = "#ff7b7b"; g.beginPath(); g.moveTo(140, 470); g.lineTo(380, 500); g.lineTo(560, 560); g.lineTo(760, 600); g.lineTo(880, 630); g.stroke();
        g.fillStyle = "#ff7b7b"; g.fillText("MISKIN", 600, 560);
      });
      const b = this.ref.board, wood = col("#8b5a32");
      const face = new THREE.MeshBasicMaterial({ map: t }); this.boardFace = face; this.boardTex.kenapa = t;
      this.boardTex.telurAyam = ctex("boardTelurAyam", 1024, 740, (g) => {
        g.fillStyle = "#1f4a37"; g.fillRect(0, 0, 1024, 740); g.fillStyle = "#f4f1e6"; g.textAlign = "center"; g.font = "900 96px 'Avenir Next', Arial"; g.fillText("MAUNYA APA?", 512, 120);
        g.textAlign = "left"; g.font = "900 120px 'Avenir Next', Arial"; g.fillStyle = "#ffd23f"; g.fillText("2 =", 150, 330); g.fillStyle = "#7be08f"; g.fillText("3 =", 150, 560);
        g.fillStyle = "#fbf1e2"; g.beginPath(); g.ellipse(470, 290, 60, 78, 0, 0, 7); g.fill(); g.strokeStyle = "#f4f1e6"; g.lineWidth = 6; g.stroke(); g.font = "800 60px 'Avenir Next', Arial"; g.fillText("TELUR", 570, 312);
        for (let k = 0; k < 3; k++) { const x = 470 + k * 150; g.fillStyle = "#ffd84a"; g.beginPath(); g.ellipse(x, 525, 50, 44, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(x + 34, 488, 28, 26, 0, 0, 7); g.fill(); g.fillStyle = "#f2a33a"; g.beginPath(); g.moveTo(x + 58, 484); g.lineTo(x + 80, 492); g.lineTo(x + 58, 500); g.fill(); }
        g.fillStyle = "#7be08f"; g.font = "800 60px 'Avenir Next', Arial"; g.fillText("AYAM!", 430, 650); });
      this.boardTex.investasi = ctex("boardInvestasi", 1024, 740, (g) => {
        g.fillStyle = "#f6f3ea"; g.fillRect(0, 0, 1024, 740); g.fillStyle = "#1c2340"; g.textAlign = "center"; g.font = "900 78px 'Avenir Next', Arial"; g.fillText("INSTRUMEN INVESTASI", 512, 110);
        g.strokeStyle = "#9aa3ad"; g.lineWidth = 4; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(110, 220 + k * 90); g.lineTo(930, 220 + k * 90); g.stroke(); }
        g.strokeStyle = "#2f6fb5"; g.lineWidth = 14; g.lineJoin = "round"; g.beginPath(); [[120, 560], [260, 540], [380, 548], [520, 500], [640, 470], [780, 430], [920, 360]].forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
        g.fillStyle = "#5a6470"; g.font = "700 46px 'Avenir Next', Arial"; g.fillText("reksa dana · obligasi · saham", 512, 680); });
      const bd = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.38, 0.06), [wood, wood, wood, wood, face, wood]); bd.position.y = 1.55; bd.rotation.x = -0.12; bd.castShadow = true; b.add(bd);
      for (const dx of [-0.75, 0.75]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.4, 0.07), wood); l.position.set(dx, 1.15, 0.12); l.rotation.x = -0.12; l.castShadow = true; b.add(l); }
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.4, 0.07), wood); back.position.set(0, 1.12, -0.45); back.rotation.x = 0.35; back.castShadow = true; b.add(back);
      const tray = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.05, 0.14), wood); tray.position.set(0, 0.84, 0.13); b.add(tray);
      b.visible = false; R.add(b);
    }
    { // roast chicken on a spit over the bonfire
      const r = this.ref.roast, stick = col("#6b4a2e");
      for (const dx of [-0.75, 0.75]) { for (const a of [-0.3, 0.3]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), stick); st.position.set(dx, 0.55, 0); st.rotation.x = a; st.castShadow = true; r.add(st); } }
      const spin = new THREE.Group(); spin.position.y = 1.05; spin.name = "spin"; r.add(spin); // turns about the spit (x axis)
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.8, 6), col("#8a8a8a")); sp.rotation.z = Math.PI / 2; spin.add(sp);
      const crank = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 6), col("#6b4a2e")); crank.position.set(-0.9, -0.11, 0); spin.add(crank);
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), lam("roastSkin", () => ({ color: "#b8642a" }))); body.scale.set(1.35, 0.9, 0.95); body.position.y = -0.03; body.castShadow = true; body.name = "body"; spin.add(body);
      for (const s2 of [-1, 1]) { const leg = new THREE.Group(); leg.name = "leg" + (s2 > 0 ? "R" : "L"); spin.add(leg);
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), lam("roastSkin", () => ({ color: "#b8642a" }))); m.scale.set(1.5, 0.9, 0.9); m.position.set(0.28, -0.05, s2 * 0.16); m.rotation.z = -0.4; leg.add(m);
        const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 6), col("#f4ecd8")); bone.rotation.z = Math.PI / 2; bone.position.set(0.47, 0.01, s2 * 0.16); leg.add(bone); }
      r.visible = false; R.add(r);
    }
    { // woven basket full of eggs
      const k = this.ref.basket;
      const bk = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.36, 20, 1, true), lam("basketW", () => ({ map: rep(gedek(), 2, 0.6), side: THREE.DoubleSide }))); bk.position.y = 0.18; bk.castShadow = true; k.add(bk);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 8, 24), col("#8b6a3a")); rim.rotation.x = Math.PI / 2; rim.position.y = 0.36; k.add(rim);
      const fill = new THREE.Mesh(new THREE.CircleGeometry(0.4, 20), col("#c9a86a")); fill.rotation.x = -Math.PI / 2; fill.position.y = 0.26; k.add(fill);
      for (let i = 0; i < 13; i++) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), col(i % 3 ? "#fbf1e2" : "#f1dcc0")); e.scale.set(1, 1.3, 1); const a = i * 2.4, rr = i < 6 ? 0.22 : 0.1; e.position.set(Math.cos(a) * rr, 0.33 + (i >= 9 ? 0.08 : 0), Math.sin(a) * rr); e.castShadow = true; k.add(e); }
      k.visible = false; R.add(k);
    }
    { // chicken bones on a plate (after the roast is eaten)
      const b = this.ref.bones; const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.05, 24), col("#f2f0ea")); plate.position.y = 0.03; plate.castShadow = true; b.add(plate);
      for (let k = 0; k < 6; k++) { const bone = new THREE.Group(); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.26, 8), col("#f3ead6")); sh.rotation.z = Math.PI / 2; bone.add(sh);
        for (const sx of [-0.14, 0.14]) for (const dz of [-0.025, 0.025]) { const kn = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), col("#f3ead6")); kn.position.set(sx, 0, dz); bone.add(kn); }
        bone.position.set(Math.cos(k * 1.1) * 0.18, 0.08 + (k % 2) * 0.03, Math.sin(k * 1.1) * 0.15); bone.rotation.y = k * 0.9; b.add(bone); }
      b.visible = false; R.add(b);
    }
    { // black used SUV ("BEKAS" sticker), generic shape, no logo
      const c = this.ref.suv, body = twoTone(new THREE.MeshPhongMaterial({ color: "#1b1d22", specular: "#9aa3ad", shininess: 80 })), glass = col("#24364a"), chrome = col("#c9ccd2");
      box(c, 2.0, 0.85, 4.6, body, 0, 0.85, 0); box(c, 1.86, 0.75, 2.7, body, 0, 1.62, -0.25);
      box(c, 1.9, 0.55, 2.4, glass, 0, 1.65, -0.25); box(c, 2.04, 0.12, 4.65, chrome, 0, 0.52, 0);
      for (const [x, z] of [[-0.95, 1.5], [0.95, 1.5], [-0.95, -1.5], [0.95, -1.5]]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 18), col("#15161a")); wh.rotation.z = Math.PI / 2; wh.position.set(x, 0.42, z); wh.castShadow = true; c.add(wh); const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.34, 12), chrome); rim.rotation.z = Math.PI / 2; rim.position.set(x, 0.42, z); c.add(rim); }
      for (const sx of [-0.65, 0.65]) { const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.06), new THREE.MeshBasicMaterial({ color: new THREE.Color("#fff6d8").multiplyScalar(1.6) })); hl.position.set(sx, 1.0, 2.31); c.add(hl); }
      const st = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.26), new THREE.MeshBasicMaterial({ map: ctex("bekasSticker", 512, 220, (g) => { g.fillStyle = "#ffd23f"; g.fillRect(0, 0, 512, 220); g.fillStyle = "#c0262f"; g.font = "900 130px 'Avenir Next', Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("BEKAS", 256, 116); }) }));
      st.position.set(0.97, 1.7, -1.15); st.rotation.y = Math.PI / 2; c.add(st);
      c.visible = false; R.add(c);
    }
    { // "SUDAH DIJUAL" sign on a post at the edge of a sawah
      const d = this.ref.dijual, tex = ctex("dijualSign", 1024, 420, (g) => { g.fillStyle = "#ffffff"; g.fillRect(0, 0, 1024, 420); g.strokeStyle = "#c0262f"; g.lineWidth = 24; g.strokeRect(14, 14, 996, 392); g.fillStyle = "#c0262f"; g.font = "900 150px 'Avenir Next', Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("SUDAH DIJUAL", 512, 160); g.fillStyle = "#1c2340"; g.font = "700 64px 'Avenir Next', Arial"; g.fillText("tanah sawah ± 1 hektar", 512, 305); });
      const side = col("#e8e4da"), face = new THREE.MeshBasicMaterial({ map: tex });
      const bd = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.74, 0.06), [side, side, side, side, face, side]); bd.position.y = 1.7; bd.castShadow = true; d.add(bd);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.7, 8), col("#7a5634")); post.position.y = 0.85; post.castShadow = true; d.add(post);
      d.visible = false; R.add(d);
    }
    for (const [txt, bg] of [["GA ADIL!", "#f2e6c8"], ["BAGI DONG!", "#e9dcc0"], ["AYAM KAMI MANA?", "#f2e6c8"]] as const) { // cardboard protest signs
      const t = ctex("protest" + txt, 512, 300, (g) => { g.fillStyle = bg; g.fillRect(0, 0, 512, 300); g.strokeStyle = "rgba(120,90,50,0.5)"; g.lineWidth = 6; g.strokeRect(10, 10, 492, 280); g.fillStyle = "#c0262f"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = `900 ${txt.length > 10 ? 64 : 92}px 'Avenir Next', Arial`; g.fillText(txt, 256, 155); });
      const gp = new THREE.Group(), card = col("#c9b083"); const face = new THREE.MeshBasicMaterial({ map: t });
      const bd = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.56, 0.03), [card, card, card, card, face, card]); bd.position.y = 2.25; bd.castShadow = true; gp.add(bd);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 6), col("#7a5634")); st.position.y = 1.5; st.castShadow = true; gp.add(st);
      gp.visible = false; R.add(gp); this.ref.protest.push(gp);
    }
    // ground crack decal: branching cracks drawn from the centre (the contact point), revealed outward by uProg; glowing centre
    {
      const tex = ctex("crackDecal", 1024, 1024, (g, r) => {
        g.clearRect(0, 0, 1024, 1024); g.lineCap = "round"; g.lineJoin = "round";
        const branch = (x: number, y: number, a: number, len: number, w: number, depth: number) => {
          let cx = x, cy = y; g.beginPath(); g.moveTo(cx, cy);
          const steps = 6 + Math.floor(r() * 4);
          for (let i = 0; i < steps; i++) { a += (r() - 0.5) * 0.7; cx += Math.cos(a) * len / steps; cy += Math.sin(a) * len / steps; g.lineTo(cx, cy);
            if (depth < 3 && r() < 0.35) { const sx = cx, sy = cy; g.strokeStyle = "rgba(38,30,26,0.92)"; g.lineWidth = w; g.stroke(); branch(sx, sy, a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.6), len * 0.45, w * 0.6, depth + 1); g.beginPath(); g.moveTo(sx, sy); } }
          g.strokeStyle = "rgba(38,30,26,0.92)"; g.lineWidth = w; g.stroke();
        };
        for (let k = 0; k < 9; k++) branch(512, 512, (k / 9) * Math.PI * 2 + r() * 0.5, 300 + r() * 160, 9, 0);
        for (let k = 0; k < 14; k++) branch(512, 512, r() * Math.PI * 2, 60 + r() * 60, 6, 2); // short cracks in the crater
        const gl = g.createRadialGradient(512, 512, 0, 512, 512, 150); gl.addColorStop(0, "rgba(255,236,200,0.9)"); gl.addColorStop(0.4, "rgba(255,190,140,0.45)"); gl.addColorStop(1, "rgba(255,170,120,0)");
        g.globalCompositeOperation = "lighter"; g.fillStyle = gl; g.fillRect(0, 0, 1024, 1024); g.globalCompositeOperation = "source-over";
        for (let k = 0; k < 40; k++) { const a = r() * Math.PI * 2, d = 40 + r() * 160; g.fillStyle = "rgba(60,48,40,0.8)"; g.fillRect(512 + Math.cos(a) * d, 512 + Math.sin(a) * d, 5 + r() * 8, 4 + r() * 6); } // chips
      });
      const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6,
        uniforms: { map: { value: tex }, uProg: { value: 1 }, uGlow: { value: 1 } },
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: `uniform sampler2D map; uniform float uProg, uGlow; varying vec2 vUv;
          void main(){ vec4 c = texture2D(map, vUv); float d = length(vUv - 0.5) * 2.0; float a = c.a * (1.0 - smoothstep(uProg - 0.04, uProg, d));
            gl_FragColor = vec4(c.rgb * mix(1.0, 1.4, uGlow * step(0.6, dot(c.rgb, vec3(0.33)))), a); }` });
      this.crack = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); this.crack.rotation.x = -Math.PI / 2; this.crack.layers.set(NOINK); this.crack.renderOrder = 0.7; this.crack.visible = false; R.add(this.crack);
    }
    // whirlwind: stacked soft swirl cones (NOINK) + debris
    const sw = swirlTex();
    const core = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 0.9, 34, 24, 1, true), new THREE.MeshBasicMaterial({ color: "#4e5258", transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    core.position.y = 17; core.layers.set(NOINK); core.renderOrder = 3; this.funnel.add(core);
    for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(9.5 - k * 1.0, 1.3 + k * 0.25, 34, 32, 1, true), new THREE.MeshBasicMaterial({ map: sw, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: new THREE.Color(["#7a7e85", "#9a9ea5", "#646870"][k % 3]), opacity: 1, fog: false })); m.position.y = 17; m.layers.set(NOINK); m.renderOrder = 4; this.funnelLayers.push(m); this.funnel.add(m); }
    const soft = ctex("softPuff", 256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 10, 128, 128, 126); gr.addColorStop(0, "rgba(255,255,255,0.95)"); gr.addColorStop(0.6, "rgba(255,255,255,0.6)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
    for (let k = 0; k < 14; k++) { // wall cloud: dark flattened puffs where the funnel meets the sky
      const pf = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(k % 2 ? "#3f4349" : "#4b4f56"), transparent: true, opacity: 0.92, depthWrite: false, fog: false }));
      const a = (k / 14) * Math.PI * 2; pf.position.set(Math.cos(a) * (7 + (k % 3) * 3), 33 + (k % 4) * 1.2, Math.sin(a) * (7 + (k % 3) * 3)); pf.scale.set(9, 3.2, 9); pf.layers.set(NOINK); pf.renderOrder = 2; this.funnel.add(pf);
    }
    for (let k = 0; k < 10; k++) { // dust/debris skirt at the base
      const d = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: soft, color: new THREE.Color("#7d7a74"), transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
      const a = (k / 10) * Math.PI * 2; d.position.set(Math.cos(a) * 3.5, 2.2 + (k % 3), Math.sin(a) * 3.5); d.scale.set(9, 6, 1); d.layers.set(NOINK); d.renderOrder = 5; this.funnelDust.push(d); this.funnel.add(d);
    }
    for (let i = 0; i < 40; i++) { const kind = i % 4; const m = new THREE.Mesh(kind === 0 ? new THREE.CylinderGeometry(0.15, 0.15, 0.03, 10) : new THREE.BoxGeometry(kind === 1 ? 1.2 : 0.4, 0.06, kind === 1 ? 0.2 : 0.3), col(kind === 0 ? "#6b6258" : kind === 1 ? "#5a4a3a" : kind === 2 ? "#7a6a5c" : "#4d5a48")); m.castShadow = true; this.debris.push(m); this.funnel.add(m); }
    this.funnel.visible = false; R.add(this.funnel);
    // farm coops (shown by the farm scene)
    for (let i = 0; i < 9; i++) { const c = coop(1.0); c.position.set(FARM.x - 6 + (i % 3) * 4.2, 0, FARM.z - 4 + Math.floor(i / 3) * 3.6); c.visible = false; R.add(c); this.coops.push(c); }
  }

  /** camera-relative day sun, frozen per scene (lights.ts: az from the lens axis, el elevation) */
  setLight(cam: THREE.PerspectiveCamera, scene: THREE.Scene, sceneSunFrom: { pos: THREE.Vector3; look: THREE.Vector3 }, focus: THREE.Vector3, dist: number, mood: Mood = "day") {
    const [L, K] = PRESET[mood];
    const fw = sceneSunFrom.look.clone().sub(sceneSunFrom.pos); fw.y = 0; fw.normalize();
    const rt = V(-fw.z, 0, fw.x), az = THREE.MathUtils.degToRad(L.az), el = THREE.MathUtils.degToRad(L.el);
    this.sunDir.copy(fw).multiplyScalar(Math.cos(az)).addScaledVector(rt, Math.sin(az)).multiplyScalar(Math.cos(el)).setY(Math.sin(el)).normalize();
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 70);
    this.sun.position.copy(focus).addScaledVector(this.sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera; sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    const hg = HGRAD[mood]; TONE.uHBot.value.set(...hg[0]); TONE.uHTop.value.set(...hg[1]); TONE.uHRange.value.set(...hg[2]);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    { // 2D-reads-3D card light: rim colour = the key light, shade crescent = the sky colour of the far side
      const RIM: Record<Mood, [number, [number, number, number], [number, number, number]]> = {
        day: [0.85, [1.0, 0.86, 0.6], [0.64, 0.68, 0.9]], golden: [1.0, [1.45, 0.82, 0.34], [0.55, 0.45, 0.85]],
        night: [1.0, [0.55, 0.7, 1.25], [0.4, 0.44, 0.72]], storm: [0.55, [0.6, 0.64, 0.72], [0.62, 0.64, 0.72]] };
      const [k, rc, scol] = RIM[mood]; CARD_K.uRimK.value = k; CARD_K.uRimCol.value.setRGB(...rc); CARD_K.uShadeCol.value.setRGB(...scol);
    }
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad; CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms; K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg)); su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = mood === "day" ? 40 : L.fogNear; this.fog.far = mood === "day" ? 420 : L.fogFar;
    this.rain.visible = mood === "storm"; scene.fog = this.fog; scene.background = null;
    const cc = mood === "night" ? [0.36, 0.42, 0.62] : mood === "golden" ? [1.12, 0.84, 0.78] : mood === "storm" ? [0.42, 0.43, 0.47] : [1.06, 1.06, 1.06];
    this.cloudMat.color.setRGB(cc[0], cc[1], cc[2]); this.cloudShadows.forEach((m) => (m.visible = mood === "day"));
    this.moon.visible = mood === "night"; this.moon.position.copy(cam.position).add(V(-260, 330, 380)); this.moon.lookAt(cam.position);
    this.bonfire.visible = mood === "night";
    for (const m of this.clouds) m.lookAt(cam.position.x, m.position.y, cam.position.z);
  }

  /** rain streaks in a 28 x 18 x 28 m box that follows the camera; they fall ~15 m/s, slanted by the wind toward +x */
  setRain(cam: THREE.PerspectiveCamera, f: number) {
    for (const d of this.funnelDust) d.quaternion.copy(cam.quaternion);
    if (!this.rain.visible) return;
    const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), tilt = new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), -0.28), P = new THREE.Vector3(), S = V(1, 1, 1);
    Q.copy(cam.quaternion).multiply(tilt);
    // spread the streaks through the whole view frustum (screen-space cells at depth d), falling at ~9 m/s in the world,
    // so the frame is covered wherever the camera looks (the old horizontal slab left bare patches looking up or down)
    const fw = cam.getWorldDirection(new THREE.Vector3()), rt = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    const tv = Math.tan((cam.fov * Math.PI) / 360) * 1.25, th = tv * cam.aspect * 1.4;
    for (let i = 0; i < this.rain.count; i++) {
      const d = 4 + hash(i * 2.3) ** 1.2 * 40, u = (hash(i * 1.1) * 2 - 1) * th * d, span = 2 * tv * d;
      const v = ((((hash(i * 3.7) * span - f * 0.3 - i * 0.01) % span) + span) % span) - tv * d;
      P.copy(cam.position).addScaledVector(fw, d).addScaledVector(rt, u - v * 0.28).addScaledVector(up, v);
      M4.compose(P, Q, S); this.rain.setMatrixAt(i, M4);
    }
    this.rain.instanceMatrix.needsUpdate = true;
  }
  /** rain puddles that really mirror the world (sky, people, signs): three's Reflector on its own layer (PUDDLE) so
   *  puddles never render each other; their mirror cameras see the cards (NOINK) too. [x, z, radius, turn] */
  puddles: Reflector[] = [];
  setPuddles(list: [number, number, number, number?][]) {
    list.forEach(([x, z, r, ry = 0], i) => {
      let m = this.puddles[i];
      if (!m) {
        const pts: THREE.Vector2[] = []; for (let k = 0; k < 28; k++) { const a = (k / 28) * Math.PI * 2, rr = 1 + 0.16 * Math.sin(a * 3 + i * 1.7) + 0.08 * Math.sin(a * 5 + i); pts.push(new THREE.Vector2(Math.cos(a) * rr, Math.sin(a) * rr)); }
        m = new Reflector(new THREE.ShapeGeometry(new THREE.Shape(pts)), { textureWidth: 720, textureHeight: 720, color: 0x8d97a6, clipBias: 0.003 });
        m.rotation.x = -Math.PI / 2; m.camera.layers.enable(NOINK); m.layers.set(PUDDLE); this.root.add(m); this.puddles.push(m);
        const rim = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(pts.map((v) => v.clone().multiplyScalar(1.12)))), blobMaterial(ctex("wetRim", 64, 64, (g) => { g.fillStyle = "#b4aaa0"; g.fillRect(0, 0, 64, 64); })));
        rim.position.z = -0.012; rim.layers.set(NOINK); m.add(rim); // darker wet ground just around the water
      }
      m.visible = true; m.position.set(x, 0.035, z); m.scale.set(r, r * 0.66, 1); m.rotation.z = ry;
    });
    for (let i = list.length; i < this.puddles.length; i++) this.puddles[i].visible = false;
  }
  /** bonfire brightness 0.75..1 this frame (for the glow on faces) */
  fireK(f: number) { return 0.86 + 0.08 * Math.sin(f * 1.7) + 0.06 * Math.sin(f * 3.1 + 1); }
  /** crack centred exactly on the contact point (x, z); prog 0..1 = how far the cracks have run out; size in metres */
  setCrack(x: number, z: number, prog: number, size = 3.2, glow = 1) {
    this.crack.visible = prog > 0; this.crack.position.set(x, 0.04, z); this.crack.scale.set(size, size, 1);
    const u = (this.crack.material as THREE.ShaderMaterial).uniforms; u.uProg.value = prog; u.uGlow.value = glow;
  }
  setBoard(kind: "kenapa" | "telurAyam" | "investasi") { this.boardFace.map = this.boardTex[kind]; this.boardFace.needsUpdate = true; }
  flicker(f: number) { this.flames.forEach((m, k) => { const s2 = 1 + 0.12 * Math.sin(f * 1.7 + k * 2) + 0.08 * Math.sin(f * 3.1 + k); m.scale.set(1 + 0.06 * Math.sin(f * 2.3 + k), s2, 1); }); }
  /** whirlwind at local frame lf of the "harta hilang" scene: funnel crosses west -> east, houses + coins lift and spin up */
  setWind(lf: number | null) {
    const on = lf !== null;
    this.funnel.visible = on && lf! >= WIND.t0 - 25 && lf! <= WIND.t1 + 30;
    const wx = on ? windX(lf!) : -999;
    this.funnel.position.set(wx, 0, 0);
    this.funnelLayers.forEach((m, k) => { m.rotation.y = (lf ?? 0) * (0.25 + k * 0.07); });
    const grow = on ? Math.min(1, Math.max(0, (lf! - (WIND.t0 - 25)) / 20)) * (1 - Math.min(1, Math.max(0, (lf! - WIND.t1 - 10) / 20))) : 0;
    this.funnel.scale.set(0.3 + 0.7 * grow, grow, 0.3 + 0.7 * grow);
    this.debris.forEach((m, i) => { const a = (lf ?? 0) * (0.18 + hash(i) * 0.12) + i, r = 3 + hash(i + 7) * 6 + ((i % 5) * 0.8); m.position.set(Math.cos(a) * r, 2 + ((i * 2.3 + (lf ?? 0) * 0.25) % 28), Math.sin(a) * r); m.rotation.set(a * 1.3, a, a * 0.7); });
    const lift = (x: number, o: THREE.Object3D, base: THREE.Vector3, ry: number, seed: number) => {
      if (!on) { o.visible = true; o.position.copy(base); o.rotation.set(0, ry, 0); o.scale.setScalar(1); return; }
      const hitF = WIND.t0 + ((x + 55) / 110) * (WIND.t1 - WIND.t0) - 4, u = Math.max(0, (lf! - hitF) / 28);
      o.visible = u < 1;
      const e = u * u;
      o.position.set(base.x + Math.sin(u * 6 + seed) * 6 * u + u * 8, base.y + e * 45, base.z + Math.cos(u * 6 + seed) * 4 * u);
      o.rotation.set(u * 2.2 * (seed % 2 ? 1 : -1), ry + u * 9, u * 1.6);
      o.scale.setScalar(1 - 0.6 * u);
    };
    for (const p of this.plots) lift(p.x, p.o, V(p.x, 0, p.z), p.ry, p.seed);
    lift(COIN_PILE.x, this.coinPile, COIN_PILE, 0, 3);
  }
}

// ---------------- cast (billboards via the engine's Pool / Actor / Fx) ----------------
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const BIRD = (() => { const g = new THREE.PlaneGeometry(300 * SU * 0.62, 300 * SU * 0.62); g.translate(0, (300 / 2 - 15) * SU * 0.62, 0); return g; })();
const tier = (d: number): [number, number, number] => (d < 3.2 ? [1200, 2000, 2.0] : d < 6.5 ? [900, 1500, 1.5] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4]);
const q = (v: number) => Math.round(v * 60) / 60;
/** a nearby light (bonfire, lamp, glowing prop) that tints the side of the card facing it: k = strength 0..1 */
export type Glow = { at: THREE.Vector3; col: [number, number, number]; k: number; radius?: number };
export type Who = { id: string; P: Person; x: number; z: number; y?: number; opts: ActOpts; scale?: number; glow?: Glow; shadow?: boolean };
/** paint a light falling on the drawing: warm radial tint on the drawn pixels only (source-atop), strongest where the light is */
const glowOn = (g: CanvasRenderingContext2D, cx: number, cy: number, col: [number, number, number], k: number) => {
  g.save(); g.globalCompositeOperation = "source-atop";
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 900); const [r, gg, b] = col;
  gr.addColorStop(0, `rgba(${r},${gg},${b},${(0.8 * k).toFixed(3)})`); gr.addColorStop(0.5, `rgba(${r},${gg},${b},${(0.5 * k).toFixed(3)})`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = gr; g.fillRect(-200, -200, 1000, 1400);
  g.globalCompositeOperation = "lighter"; const hl = g.createRadialGradient(cx, cy, 0, cx, cy, 520);
  hl.addColorStop(0, `rgba(${r},${Math.round(gg * 0.7)},${Math.round(b * 0.4)},${(0.38 * k).toFixed(3)})`); hl.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = hl; g.fillRect(-200, -200, 1000, 1400);
  g.restore();
};
export type Bird = { kind: "hen" | "chick" | "rooster"; x: number; z: number; peck: number; mirror?: boolean; scale?: number; y?: number };

/** invisible stand-in that only draws into the sun's shadow map: the character's silhouette turned to face the sun, so
 *  the cast shadow keeps the full figure whatever way the camera-facing card is turned (reference: every figure throws a
 *  soft shadow along the ground away from the key light) */
const shadowOnly = () => new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false, side: THREE.DoubleSide, alphaTest: 0.5 });
export class Cast {
  private used = 0; private bused = 0; private fused = 0; private sused = 0;
  actors: Actor[] = []; birds: Actor[] = []; blobs: Fx[] = []; shadows: THREE.Mesh[] = []; private shadowSrc: Actor[] = [];
  constructor(private w: AyamWorld) {}
  begin() { this.used = this.bused = this.fused = this.sused = 0; }
  private shadowOf(a: Actor, geo: THREE.BufferGeometry) {
    let m = this.shadows[this.sused++];
    if (!m) { m = new THREE.Mesh(geo, shadowOnly()); m.castShadow = true; m.receiveShadow = false; m.layers.set(NOINK); m.renderOrder = -5; this.w.root.add(m); this.shadows.push(m); }
    // three's shadow pass copies map + alphaTest from the mesh's OWN material, so each stand-in carries the card texture
    m.geometry = geo; m.visible = true; this.shadowSrc[this.sused - 1] = a;
    m.position.copy(a.mesh.position); m.scale.copy(a.mesh.scale); m.scale.x = Math.abs(m.scale.x);
    const d = this.w.sunDir; m.rotation.set(0, Math.atan2(d.x, d.z), 0);
    a.mesh.receiveShadow = false; // its own stand-in would cut through the card
  }
  private blob(x: number, z: number, s: number, cam: THREE.Camera) {
    let f = this.blobs[this.fused++]; if (!f) { f = new Fx(this.w.root); this.blobs.push(f); }
    f.r = this.w.pool.req("blob|contact|#3a3554", 128, 128, 1, (p) => fxContact(p, "#7f7b98"));
    f.mesh.visible = true; f.mesh.position.set(x, 0.035, z); f.mesh.rotation.set(-Math.PI / 2, 0, 0); f.mesh.scale.set(0.62 * s, 0.42 * s, 1); void cam;
  }
  fx(key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, cam: THREE.PerspectiveCamera) {
    let f = this.blobs[this.fused++]; if (!f) { f = new Fx(this.w.root); this.blobs.push(f); }
    f.r = this.w.pool.req("fx|" + key, cw, ch, 1, draw); f.use(true);
    f.mesh.visible = true; f.mesh.position.set(x, y, z); f.mesh.scale.set(w, h, 1); f.mesh.rotation.set(0, Math.atan2(cam.position.x - x, cam.position.z - z), 0);
  }
  person(w: Who, cam: THREE.PerspectiveCamera) {
    let a = this.actors[this.used++]; if (!a) { a = new Actor(this.w.root, BODY); this.actors.push(a); }
    const d = cam.position.distanceTo(V(w.x, 1.2, w.z)) / (w.scale ?? 1), [cw, ch, k] = tier(d);
    let gl: [number, number, number] | null = null;
    if (w.glow) { // light position in the card's design space (card faces the camera, yaw only)
      const yaw = Math.atan2(cam.position.x - w.x, cam.position.z - w.z), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const dx = (w.glow.at.x - w.x) * rx + (w.glow.at.z - w.z) * rz, dy = w.glow.at.y - (w.y ?? 0), dist = Math.hypot(w.glow.at.x - w.x, w.glow.at.z - w.z);
      const fall = Math.max(0, 1 - dist / (w.glow.radius ?? 4.5)) * w.glow.k;
      if (fall > 0.02) gl = [Math.round(300 + dx / SU / (w.scale ?? 1)), Math.round(975 - dy / SU / (w.scale ?? 1)), Math.round(fall * 20) / 20];
    }
    const key = `P|${w.id}|${JSON.stringify(w.opts, (_k, v) => (typeof v === "number" ? q(v) : v))}|${gl ? gl.join(",") : ""}`;
    a.r = this.w.pool.req(key, cw, ch, k, (p) => { drawPerson(p, w.P, w.opts); if (gl) glowOn(p.g, gl[0], gl[1], w.glow!.col, gl[2]); });
    a.mesh.visible = true; a.mesh.position.set(w.x, w.y ?? 0, w.z); a.mesh.scale.setScalar(w.scale ?? 1);
    a.mesh.rotation.set(0, Math.atan2(cam.position.x - w.x, cam.position.z - w.z), 0);
    if ((w.y ?? 0) < 0.3) this.blob(w.x, w.z, w.scale ?? 1, cam);
    if (w.shadow !== false) this.shadowOf(a, BODY);
  }
  bird(b: Bird, cam: THREE.PerspectiveCamera) {
    let a = this.birds[this.bused++]; if (!a) { a = new Actor(this.w.root, BIRD); this.birds.push(a); }
    const pk = q(b.peck);
    a.r = this.w.pool.req(`B|${b.kind}|${pk}`, 300, 300, 1, (p) => (b.kind === "hen" ? drawHen(p, pk) : b.kind === "rooster" ? drawHen(p, pk, "#c4682c", "#e0302f") : drawChick(p, pk)));
    a.mesh.visible = true; a.mesh.position.set(b.x, b.y ?? 0, b.z); const s = b.scale ?? (b.kind === "chick" ? 0.55 : b.kind === "rooster" ? 1.15 : 1);
    a.mesh.scale.set(s * (b.mirror ? -1 : 1), s, s);
    a.mesh.rotation.set(0, Math.atan2(cam.position.x - b.x, cam.position.z - b.z), 0);
    if (s > 0.05 && (b.y ?? 0) < 0.2) this.blob(b.x, b.z, s * 0.6, cam);
    if (s > 0.05) this.shadowOf(a, BIRD);
  }
  end() {
    for (let i = this.used; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    for (let i = this.bused; i < this.birds.length; i++) this.birds[i].mesh.visible = false;
    for (let i = this.fused; i < this.blobs.length; i++) this.blobs[i].mesh.visible = false;
    for (let i = this.sused; i < this.shadows.length; i++) this.shadows[i].visible = false;
    this.w.pool.flush();
    for (let i = 0; i < this.used; i++) this.actors[i].bind();
    for (let i = 0; i < this.bused; i++) this.birds[i].bind();
    for (let i = 0; i < this.fused; i++) this.blobs[i].bind();
    for (let i = 0; i < this.sused; i++) (this.shadows[i].material as THREE.MeshBasicMaterial).map = this.shadowSrc[i].mat.map;
  }
}
export { Pen, fxPuff, blobMaterial };
export const BONFIRE_AT = () => V(LAPANGAN.x + 0.3, 0, LAPANGAN.z + 0.9);
