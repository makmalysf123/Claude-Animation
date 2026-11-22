// Sets for "Pak Jaya dan Plester Tembok": a traditional city market (pasar) on a bright morning, and the macro wall chunk
// for the crack explanation. Everything is 3D except the characters (2D cards). Layout of the market (metres):
//   back area   z -2.1 .. 0.9: the old painted wall at z = -2.2 with the crack at x = CRACK.x; the roof is open over it,
//               so the morning sun lights the wall; a grocer (left) and a fish stall (right) against the side walls;
//               the bakso cart at the edge of the main hall (left)
//   main hall   z 0.9 .. 11: aisle x -1.2 .. 1.2, stalls on both sides with striped tarps, zinc roof on steel columns,
//               a translucent skylight strip over the aisle (sun shafts), the street opening at z = 11
import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { canvasTex } from "../ketindihan2/sets";
import { std } from "../ketindihan2/sets";
import { plaster, woodPlanks, rnd, seedRnd, fbm, shaftTex } from "../../lib/world2/textures";
import { NOINK } from "../bridge/ink";
import { tileTex } from "../kopi/kota";
import { mat, M, rb } from "../emas/props";
import { mdl, recolor } from "./models";

type V3 = [number, number, number];
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const B = (w: number, h: number, d: number, m: THREE.Material | THREE.Material[], p: V3, r: V3 = [0, 0, 0]) => M(new THREE.BoxGeometry(w, h, d), m, p, r);
const RB = (w: number, h: number, d: number, rad: number, m: THREE.Material, p: V3, r: V3 = [0, 0, 0]) => M(rb(w, h, d, rad), m, p, r);
const cyl = (r1: number, r2: number, h: number, m: THREE.Material, p: V3, r: V3 = [0, 0, 0], seg = 20) => M(new THREE.CylinderGeometry(r1, r2, h, seg), m, p, r);
const sph = (r: number, m: THREE.Material, p: V3, s: V3 = [1, 1, 1], seg = 14) => { const o = M(new THREE.SphereGeometry(r, seg, Math.max(8, seg - 4)), m, p); o.scale.set(...s); return o; };

export const WALL_Z = -2.2, FACE_Z = -2.068; // the wall box's front face is at -2.075
export const CRACK = V(0.3, 1.32, FACE_Z); // where the plaster sits (across the crack)
export const PL_W = 0.2, PL_H = 0.06; // the plaster, a bit larger than a real 7 x 2 cm strip so it reads on screen
/** marks on the floor where people stand */
export const SPOT = { jayaWall: V(-0.25, 0, -1.6), bakso: V(-1.05, 0, 0.95), cart: V(-2.05, 0, 0.55), aisle: V(0, 0, 4.5), pillar: V(1.75, 0, 0.75), mgr: V(2.15, 0, 1.15) };

// ---------------- textures ----------------
/** the old market wall (a Dutch-era building): bright cream lime paint, a few worn patches low down, soft rain streaks, damp at the base */
const wallPaintTex = (() => {
  const t = canvasTex(1024, 1024, (g) => {
    // pale green paint, softly mottled (no hard streaks, no extra cracks: the one crack is the decal)
    for (let y = 0; y < 1024; y += 4) for (let x = 0; x < 1024; x += 4) { const n = fbm(x, y, 1024, 6, 4), m = fbm(x + 500, y * 0.3, 1024, 4, 3); const r = 233 + 9 * n - 8 * Math.max(0, m), gg = 225 + 9 * n - 8 * Math.max(0, m), b = 204 + 9 * n - 10 * Math.max(0, m); g.fillStyle = `rgb(${r | 0},${gg | 0},${b | 0})`; g.fillRect(x, y, 4, 4); }
    for (let i = 0; i < 4; i++) { // a few small worn patches near the floor (grey lime plaster showing)
      const cx = 120 + rnd() * 780, cy = 760 + rnd() * 150, rx = 22 + rnd() * 26, ry = 14 + rnd() * 16; g.save(); g.beginPath();
      for (let k = 0; k <= 24; k++) { const a = (k / 24) * Math.PI * 2, r = 1 + 0.25 * Math.sin(a * 4 + i) + 0.12 * Math.sin(a * 7 + i * 2); g.lineTo(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r); }
      g.closePath(); g.clip(); g.fillStyle = "#dcd5c4"; g.fillRect(cx - 100, cy - 100, 200, 200); for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(150,140,124,${0.1 + rnd() * 0.15})`; g.fillRect(cx - 60 + rnd() * 120, cy - 40 + rnd() * 80, 2 + rnd() * 4, 2 + rnd() * 3); }
      g.restore(); g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = 2; g.stroke(); }
    for (let i = 0; i < 26; i++) { const x = rnd() * 1024, y = rnd() * 260, h = 120 + rnd() * 380; for (let k = 0; k < 6; k++) { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, "rgba(120,108,84,0.05)"); gr.addColorStop(1, "rgba(120,108,84,0)"); g.fillStyle = gr; g.fillRect(x + k * 2 + Math.sin(k) * 2, y, 3, h); } }
    const gb = g.createLinearGradient(0, 860, 0, 1024); gb.addColorStop(0, "rgba(130,118,96,0)"); gb.addColorStop(1, "rgba(130,118,96,0.35)"); g.fillStyle = gb; g.fillRect(0, 860, 1024, 164);
  }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
})();
/** the crack itself, as a decal: a jagged main crack running from low left up to high right with small branches */
export const crackPath = (() => { // points in metres relative to CRACK (x across, y up)
  const pts: [number, number][] = []; let x = -0.08, y = -0.82; seedRnd(41);
  while (y < 1.0) { pts.push([x, y]); y += 0.03 + rnd() * 0.05; x += (rnd() - 0.45) * 0.04; if (Math.abs(y) < 0.05) x = 0; }
  return pts;
})();
const crackTex = (() => canvasTex(512, 1024, (g) => { // 0.9 m wide, 1.8 m tall, centre = CRACK
  const X = (x: number) => 256 + (x / 0.9) * 512, Y = (y: number) => 512 - (y / 1.8) * 1024;
  const stroke = (pts: [number, number][], w: number, c: string) => { g.strokeStyle = c; g.lineWidth = w; g.lineJoin = "round"; g.lineCap = "round"; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.stroke(); };
  stroke(crackPath, 30, "rgba(70,60,48,0.22)"); stroke(crackPath, 18, "rgba(60,50,40,0.3)"); // dirt halo
  crackPath.forEach(([x, y], i) => { if (i % 5 === 2) { const b: [number, number][] = [[x, y]]; let bx = x, by = y; const s = i % 2 ? 1 : -1; for (let k = 0; k < 4; k++) { bx += s * (0.02 + rnd() * 0.03); by += (rnd() - 0.3) * 0.04; b.push([bx, by]); } stroke(b, 5, "rgba(40,30,26,0.85)"); } });
  stroke(crackPath, 11, "#2a201c"); stroke(crackPath.map(([x, y]) => [x + 0.006, y + 0.006]), 3, "rgba(255,255,255,0.4)");
}))();
/** a fresh plaster: tan fabric with tiny vent holes and a lighter pad in the middle */
const plasterDraw = (g: CanvasRenderingContext2D, w: number, h: number, part: "full" | "left" | "right", torn: boolean) => {
  g.clearRect(0, 0, w, h); g.save(); const r = h * 0.45;
  const cut = (x0: number) => { const pts: [number, number][] = []; for (let k = 0; k <= 10; k++) pts.push([x0 + (k % 2 ? 6 : -6) + 4 * Math.sin(k * 2.3), (k / 10) * h]); return pts; };
  g.beginPath();
  if (part === "full") g.roundRect(2, 2, w - 4, h - 4, r);
  else if (part === "left") { g.moveTo(r, 2); const c = torn ? cut(w - 10) : [[w, 2], [w, h - 2]] as [number, number][]; c.forEach(([x, y]) => g.lineTo(x, Math.max(2, Math.min(h - 2, y)))); g.lineTo(r, h - 2); g.arc(r, h / 2, h / 2 - 2, Math.PI / 2, -Math.PI / 2); }
  else { const c = torn ? cut(10) : [[0, 2], [0, h - 2]] as [number, number][]; g.moveTo(c[0][0], 2); c.forEach(([x, y]) => g.lineTo(x, Math.max(2, Math.min(h - 2, y)))); g.lineTo(w - r, h - 2); g.arc(w - r, h / 2, h / 2 - 2, Math.PI / 2, -Math.PI / 2, true); }
  g.closePath(); g.clip();
  g.fillStyle = "#e0ad83"; g.fillRect(0, 0, w, h);
  const padX = part === "full" ? w * 0.33 : part === "left" ? w * 0.66 : -w * 0.2, padW = part === "full" ? w * 0.34 : w * 0.54;
  g.fillStyle = "#f4ece2"; g.fillRect(padX, h * 0.16, padW, h * 0.68); g.fillStyle = "rgba(200,120,110,0.18)"; for (let i = 0; i < 30; i++) g.fillRect(padX + rnd() * padW, h * 0.16 + rnd() * h * 0.68, 2, 2);
  g.fillStyle = "rgba(120,70,40,0.35)"; for (let y = h * 0.1; y < h; y += h * 0.2) for (let x = 6; x < w; x += 12) if (x < padX || x > padX + padW) { g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); }
  if (torn) { g.strokeStyle = "rgba(255,245,230,0.9)"; g.lineWidth = 2; const x0 = part === "left" ? w - 12 : 12; for (let i = 0; i < 12; i++) { const y = rnd() * h; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + (part === "left" ? 1 : -1) * (6 + rnd() * 10), y + (rnd() - 0.5) * 6); g.stroke(); } }
  const sh = g.createLinearGradient(0, 0, 0, h); sh.addColorStop(0, "rgba(255,255,255,0.25)"); sh.addColorStop(1, "rgba(0,0,0,0.12)"); g.fillStyle = sh; g.fillRect(0, 0, w, h);
  g.restore();
};
const PT = { full: canvasTex(512, 160, (g) => plasterDraw(g, 512, 160, "full", false)), left: canvasTex(256, 160, (g) => plasterDraw(g, 256, 160, "left", true)), right: canvasTex(256, 160, (g) => plasterDraw(g, 256, 160, "right", true)),
  leftW: canvasTex(256, 160, (g) => plasterDraw(g, 256, 160, "left", false)), rightW: canvasTex(256, 160, (g) => plasterDraw(g, 256, 160, "right", false)) };
const pmat = (t: THREE.Texture) => new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.4, roughness: 0.85, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });

/** a plaster on a wall: either whole, stretched over a widening gap, or torn into two halves */
export class Plaster {
  group = new THREE.Group(); full: THREE.Mesh; L: THREE.Mesh; Rt: THREE.Mesh; mid: THREE.Mesh;
  constructor(w = PL_W, h = PL_H) {
    this.full = new THREE.Mesh(new THREE.PlaneGeometry(w, h), pmat(PT.full));
    this.L = new THREE.Mesh(new THREE.PlaneGeometry(w / 2, h), pmat(PT.left)); this.Rt = new THREE.Mesh(new THREE.PlaneGeometry(w / 2, h), pmat(PT.right));
    this.mid = new THREE.Mesh(new THREE.PlaneGeometry(1, h * 0.8), new THREE.MeshStandardMaterial({ color: "#f0dcc6", roughness: 0.9, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    for (const m of [this.full, this.L, this.Rt, this.mid]) { m.receiveShadow = true; m.castShadow = false; this.group.add(m); }
    this.w = w; this.h = h; this.show("none");
  }
  w: number; h: number;
  /** mode: none | fresh | torn | stretch (gap in metres between the halves; `tear` 0..1 after it snapped) ; peel 0..1 lifts one end */
  show(mode: "none" | "fresh" | "torn" | "stretch", gap = 0, peel = 0) {
    const { w } = this; this.group.visible = mode !== "none"; this.full.visible = mode === "fresh"; this.L.visible = this.Rt.visible = mode === "torn" || mode === "stretch"; this.mid.visible = mode === "stretch" && gap > 0.0005;
    const torn = mode === "torn"; (this.L.material as THREE.MeshStandardMaterial).map = torn ? PT.left : PT.leftW; (this.Rt.material as THREE.MeshStandardMaterial).map = torn ? PT.right : PT.rightW;
    const g = torn ? Math.max(gap, 0.006) : gap; this.L.position.set(-w / 4 - g / 2, 0, 0); this.Rt.position.set(w / 4 + g / 2, 0, 0);
    this.mid.scale.set(Math.max(0.0001, g + 0.004), 1 - Math.min(0.5, g * 25), 1); this.mid.position.set(0, 0, 0.0004);
    this.L.rotation.set(0, torn ? 0.12 : 0, torn ? 0.04 : 0); this.Rt.rotation.set(0, torn ? -0.12 : 0, torn ? -0.05 : 0);
    this.full.rotation.set(0, 0, 0); this.full.position.set(0, 0, 0);
    if (peel > 0) { const m = torn ? this.Rt : this.full; m.rotation.y = -1.1 * peel; m.position.z = 0.03 * peel; m.position.x += (torn ? 0 : 0.01) * peel; }
  }
}

// ---------------- props ----------------
/** a box of plasters (our own brand: a red cross and stripes, no words) */
export const plasterBox = () => {
  const G = new THREE.Group(), side = canvasTex(256, 160, (g) => { g.fillStyle = "#f3eee4"; g.fillRect(0, 0, 256, 160); g.fillStyle = "#d33a3a"; g.fillRect(0, 0, 256, 34); g.fillRect(0, 140, 256, 20);
    g.fillStyle = "#d33a3a"; g.fillRect(28, 62, 56, 18); g.fillRect(47, 43, 18, 56); for (let i = 0; i < 3; i++) { g.save(); g.translate(130 + i * 34, 82); g.rotate(-0.5); g.fillStyle = "#e0ad83"; g.beginPath(); g.roundRect(-24, -8, 48, 16, 8); g.fill(); g.fillStyle = "#f4ece2"; g.fillRect(-7, -6, 14, 12); g.restore(); } });
  const m = new THREE.MeshStandardMaterial({ map: side, roughness: 0.7 }), top = mat("#f3eee4", { roughness: 0.7 });
  G.add(M(new THREE.BoxGeometry(0.14, 0.085, 0.06), [m, m, top, top, m, m])); G.scale.setScalar(1.5); return G;
};
/** a little bottle of obat merah: brown glass, red cap, a label with a red cross */
export const obatMerah = () => {
  const G = new THREE.Group(), glass = new THREE.MeshPhysicalMaterial({ color: "#5a2a14", roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.9 });
  G.add(cyl(0.022, 0.022, 0.06, glass, [0, 0.03, 0], [0, 0, 0], 20)); G.add(cyl(0.01, 0.02, 0.014, glass, [0, 0.067, 0])); G.add(cyl(0.012, 0.012, 0.022, mat("#d42a2a", { roughness: 0.35 }), [0, 0.084, 0]));
  const lab = canvasTex(128, 64, (g) => { g.fillStyle = "#f4f0e6"; g.fillRect(0, 0, 128, 64); g.fillStyle = "#d42a2a"; g.fillRect(14, 26, 30, 12); g.fillRect(23, 17, 12, 30); g.fillStyle = "#c08a2a"; g.fillRect(56, 18, 60, 8); g.fillRect(56, 34, 44, 8); });
  const L = new THREE.Mesh(new THREE.CylinderGeometry(0.0225, 0.0225, 0.032, 20, 1, true, -1.2, 2.4), new THREE.MeshStandardMaterial({ map: lab, roughness: 0.6 })); L.position.y = 0.03; G.add(L); G.scale.setScalar(1.7); return G;
};
/** the medicine for the manager: a white box with a green cross and a little green bottle of eucalyptus oil */
export const obatKotak = () => {
  const G = new THREE.Group(), side = canvasTex(256, 160, (g) => { g.fillStyle = "#f7f7f2"; g.fillRect(0, 0, 256, 160); g.fillStyle = "#2a9a5a"; g.fillRect(0, 0, 256, 26); g.fillRect(96, 62, 64, 22); g.fillRect(117, 41, 22, 64); g.fillStyle = "#88c8a8"; g.fillRect(30, 124, 196, 10); });
  const m = new THREE.MeshStandardMaterial({ map: side, roughness: 0.6 }); G.add(M(new THREE.BoxGeometry(0.12, 0.075, 0.045), [m, m, mat("#f7f7f2"), mat("#f7f7f2"), m, m]));
  const gl = new THREE.MeshPhysicalMaterial({ color: "#3fae6a", roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.85 }); G.add(cyl(0.017, 0.017, 0.07, gl, [0.085, -0.002, 0])); G.add(cyl(0.008, 0.008, 0.02, mat("#1e5a34"), [0.085, 0.043, 0])); G.scale.setScalar(1.5); return G;
};
/** a clear plastic bag that fills up with torn plaster halves (fill 0..1) */
export class PlasterBag {
  group = new THREE.Group(); bits: THREE.Mesh[] = [];
  constructor(n = 44) {
    const prof: THREE.Vector2[] = []; for (let i = 0; i <= 14; i++) { const u = i / 14; prof.push(new THREE.Vector2(0.004 + 0.105 * Math.sin(Math.min(1, u * 1.25) * Math.PI * 0.62) * (1 - 0.55 * Math.max(0, u - 0.72) / 0.28), -0.22 + u * 0.22)); }
    const bag = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), new THREE.MeshPhysicalMaterial({ color: "#f4f6f8", roughness: 0.15, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false, clearcoat: 1 }));
    bag.scale.set(1.25, 1.25, 0.9); bag.renderOrder = 5; this.group.add(bag);
    this.group.add(sph(0.016, new THREE.MeshPhysicalMaterial({ color: "#f4f6f8", roughness: 0.2, transparent: true, opacity: 0.6 }), [0, 0.004, 0], [1.2, 0.8, 0.8], 10)); // the knot
    const ms = [pmat(PT.left), pmat(PT.right)]; seedRnd(9);
    for (let i = 0; i < n; i++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(PL_W * 0.3, PL_H * 0.6), ms[i % 2]); const u = i / n, y = -0.2 + 0.15 * Math.sqrt(u) * 1.1 + (rnd() - 0.5) * 0.02, r = 0.075 * Math.min(1, 0.5 + u);
      const a = rnd() * Math.PI * 2; b.position.set(Math.cos(a) * r * rnd(), Math.min(-0.06, y), Math.sin(a) * r * 0.65 * rnd()); b.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); b.renderOrder = 4; this.bits.push(b); this.group.add(b); }
  }
  fill(k: number) { const n = Math.round(this.bits.length * Math.max(0, Math.min(1, k))); this.bits.forEach((b, i) => (b.visible = i < n)); }
}
/** a torch: black barrel, a lens glow and a real spot light (no fake cone) */
export class Torch {
  group = new THREE.Group(); light = new THREE.SpotLight("#fff6e0", 0, 4, 0.32, 0.5, 1.4); glow: THREE.Mesh;
  constructor() { const b = mat("#1d1f22", { roughness: 0.4, metalness: 0.5 }); this.group.add(cyl(0.018, 0.018, 0.13, b, [0, 0, -0.03], [Math.PI / 2, 0, 0])); this.group.add(cyl(0.026, 0.02, 0.04, b, [0, 0, 0.05], [Math.PI / 2, 0, 0]));
    this.glow = new THREE.Mesh(new THREE.CircleGeometry(0.021, 20), new THREE.MeshBasicMaterial({ color: "#fffbe8", toneMapped: false })); this.glow.position.z = 0.0705; this.group.add(this.glow);
    this.light.position.set(0, 0, 0.07); this.light.target.position.set(0, 0, 1); this.group.add(this.light, this.light.target); }
}
/** a clipboard with a checklist sheet (marks, no words) */
export const clipboard = () => { const G = new THREE.Group(); G.add(RB(0.23, 0.32, 0.008, 0.01, mat("#8a5a34", { roughness: 0.6 }), [0, 0, 0]));
  const sheet = canvasTex(230, 300, (g) => { g.fillStyle = "#fbfaf6"; g.fillRect(0, 0, 230, 300); for (let i = 0; i < 9; i++) { g.strokeStyle = "#3a3a44"; g.lineWidth = 2; g.strokeRect(16, 40 + i * 28, 14, 14); g.fillStyle = "#9aa3ad"; g.fillRect(40, 44 + i * 28, 120 + (i * 37) % 50, 6); if (i < 5) { g.strokeStyle = "#d33a3a"; g.lineWidth = 3; g.beginPath(); g.moveTo(17, 48 + i * 28); g.lineTo(23, 53 + i * 28); g.lineTo(32, 38 + i * 28); g.stroke(); } } g.fillStyle = "#d33a3a"; g.beginPath(); g.arc(180, 250, 22, 0, 7); g.fill(); g.fillStyle = "#fff"; g.fillRect(177, 236, 6, 18); g.fillRect(177, 258, 6, 6); });
  G.add(M(new THREE.PlaneGeometry(0.2, 0.27), new THREE.MeshStandardMaterial({ map: sheet, roughness: 0.8 }), [0, -0.015, 0.0045])); G.add(RB(0.08, 0.03, 0.02, 0.006, mat("#c8ccd2", { metalness: 0.9, roughness: 0.3 }), [0, 0.15, 0.008])); return G; };
/** the crack monitor (tell-tale): a white plate with a millimetre grid on one side of the crack and a clear plate with a
 *  red cross-hair on the other, overlapping; when the crack opens the cross-hair slides off the grid's zero */
export class TellTale {
  group = new THREE.Group(); a = new THREE.Group(); b = new THREE.Group();
  constructor(s = 1) {
    const grid = canvasTex(400, 200, (g) => { g.fillStyle = "#f8f8f4"; g.fillRect(0, 0, 400, 200); g.strokeStyle = "#1a1a1a"; for (let x = 200; x <= 400; x += 10) { g.lineWidth = (x - 200) % 50 ? 1 : 2.5; g.beginPath(); g.moveTo(x, 30); g.lineTo(x, 170); g.stroke(); } for (let y = 30; y <= 170; y += 10) { g.lineWidth = (y - 100) % 50 ? 1 : 2.5; g.beginPath(); g.moveTo(200, y); g.lineTo(400, y); g.stroke(); }
      g.strokeStyle = "#111"; g.lineWidth = 4; g.beginPath(); g.moveTo(300, 20); g.lineTo(300, 180); g.moveTo(195, 100); g.lineTo(400, 100); g.stroke(); g.fillStyle = "#777"; g.beginPath(); g.arc(40, 100, 12, 0, 7); g.fill(); });
    const pa = new THREE.Mesh(new THREE.BoxGeometry(0.16 * s, 0.08 * s, 0.003), [mat("#eee"), mat("#eee"), mat("#eee"), mat("#eee"), new THREE.MeshStandardMaterial({ map: grid, roughness: 0.4 }), mat("#eee")]); pa.position.set(0.02 * s, 0, 0.0015); pa.receiveShadow = true; this.a.add(pa);
    const red = canvasTex(400, 200, (g) => { g.clearRect(0, 0, 400, 200); g.fillStyle = "rgba(220,235,245,0.25)"; g.fillRect(0, 0, 400, 200); g.strokeStyle = "#e02020"; g.lineWidth = 5; g.beginPath(); g.moveTo(100, 15); g.lineTo(100, 185); g.moveTo(10, 100); g.lineTo(190, 100); g.stroke(); g.fillStyle = "#777"; g.beginPath(); g.arc(340, 100, 12, 0, 7); g.fill(); });
    const pb = new THREE.Mesh(new THREE.PlaneGeometry(0.16 * s, 0.08 * s), new THREE.MeshPhysicalMaterial({ map: red, transparent: true, roughness: 0.05, clearcoat: 1, side: THREE.DoubleSide })); pb.position.set(0.1 * s, 0, 0.0045); this.b.add(pb);
    // screw heads on the outer ends
    const scr = mat("#9aa0a8", { metalness: 0.9, roughness: 0.3 }); this.a.add(cyl(0.006 * s, 0.006 * s, 0.004, scr, [-0.044 * s, 0, 0.004], [Math.PI / 2, 0, 0], 12)); this.b.add(cyl(0.006 * s, 0.006 * s, 0.004, scr, [0.156 * s, 0, 0.007], [Math.PI / 2, 0, 0], 12));
    this.group.add(this.a, this.b);
  }
  /** opening in metres (exaggerated on screen) */
  set(gap: number) { this.b.position.x = gap; }
}
/** a yellow plastic hard hat would be drawn on the card; striped barrier tape between two points */
const tapeTex = (() => { const t = canvasTex(256, 32, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#1a1a1a" : "#ffd21f"; g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 32, 0); g.lineTo(i * 32 + 16, 32); g.lineTo(i * 32 - 16, 32); g.fill(); } }); t.wrapS = THREE.RepeatWrapping; return t; })();
const tape = (a: THREE.Vector3, b: THREE.Vector3, sag = 0.06) => { const G = new THREE.Group(), n = 10, pts: THREE.Vector3[] = []; for (let i = 0; i <= n; i++) { const u = i / n; pts.push(a.clone().lerp(b, u).add(V(0, -sag * 4 * u * (1 - u), 0))); }
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[i + 1], d = q.clone().sub(p), len = d.length(), t = tapeTex.clone(); t.repeat.set(len / 0.3, 1); t.needsUpdate = true;
    const s = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.06), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, side: THREE.DoubleSide })); s.position.copy(p).addScaledVector(d, 0.5); s.rotation.y = -Math.atan2(d.z, d.x); s.rotation.z = Math.atan2(d.y, Math.hypot(d.x, d.z)); s.castShadow = true; G.add(s); }
  return G; };
const cone = () => { const G = new THREE.Group(), o = mat("#ff5a1a", { roughness: 0.45 }), w = mat("#f4f4f0", { roughness: 0.4 }); G.add(B(0.36, 0.03, 0.36, o, [0, 0.015, 0])); G.add(cyl(0.035, 0.15, 0.62, o, [0, 0.33, 0], [0, 0, 0], 20)); G.add(cyl(0.085, 0.112, 0.1, w, [0, 0.38, 0], [0, 0, 0], 20)); G.add(cyl(0.06, 0.08, 0.07, w, [0, 0.52, 0], [0, 0, 0], 20)); return G; };
/** a folding warning sign: yellow triangle with an exclamation mark */
const warnSign = () => { const G = new THREE.Group(), face = canvasTex(256, 256, (g) => { g.fillStyle = "#ffd21f"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#111"; g.beginPath(); g.moveTo(128, 30); g.lineTo(232, 220); g.lineTo(24, 220); g.closePath(); g.fill(); g.fillStyle = "#ffd21f"; g.beginPath(); g.moveTo(128, 62); g.lineTo(206, 204); g.lineTo(50, 204); g.closePath(); g.fill(); g.fillStyle = "#111"; g.beginPath(); g.roundRect(116, 100, 24, 64, 8); g.fill(); g.beginPath(); g.arc(128, 184, 13, 0, 7); g.fill(); });
  const fm = new THREE.MeshStandardMaterial({ map: face, roughness: 0.5 }); for (const s of [-1, 1]) { const p = M(new THREE.BoxGeometry(0.5, 0.72, 0.02), [mat("#e8c014"), mat("#e8c014"), mat("#e8c014"), mat("#e8c014"), fm, fm]); p.position.set(0, 0.36, s * 0.12); p.rotation.x = s * -0.17; G.add(p); } return G; };

// ---------------- market pieces ----------------
const zincTex = (() => { const t = canvasTex(256, 256, (g) => { for (let x = 0; x < 256; x++) { const k = 0.5 + 0.5 * Math.sin((x / 256) * Math.PI * 20), n = fbm(x, 0, 256, 8, 3), v = 120 + 70 * k + 30 * n; g.fillStyle = `rgb(${v},${v + 3},${v + 8})`; g.fillRect(x, 0, 1, 256); }
  for (let i = 0; i < 50; i++) { g.fillStyle = `rgba(${120 + rnd() * 50},${60 + rnd() * 30},30,${0.15 + rnd() * 0.3})`; g.beginPath(); g.ellipse(rnd() * 256, rnd() * 256, 4 + rnd() * 14, 2 + rnd() * 6, 0, 0, Math.PI * 2); g.fill(); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
const stripeTex = (a: string, b: string) => { const t = canvasTex(256, 64, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * 32, 0, 32, 64); } g.fillStyle = "rgba(0,0,0,0.08)"; for (let i = 0; i < 60; i++) g.fillRect(rnd() * 256, rnd() * 64, 20, 2); }); t.wrapS = THREE.RepeatWrapping; return t; };
const crateTex = (c: string) => canvasTex(128, 96, (g) => { g.fillStyle = c; g.fillRect(0, 0, 128, 96); g.fillStyle = "rgba(0,0,0,0.55)"; for (let y = 14; y < 90; y += 18) for (let x = 10; x < 120; x += 22) { g.beginPath(); g.roundRect(x, y, 14, 9, 3); g.fill(); } g.fillStyle = "rgba(255,255,255,0.15)"; g.fillRect(0, 0, 128, 6); });
const crate = (c: string) => { const m = new THREE.MeshStandardMaterial({ map: crateTex(c), roughness: 0.5 }); return M(new THREE.BoxGeometry(0.5, 0.3, 0.36), [m, m, mat(c), mat(c), m, m]); };
const VEG = { tomato: mat("#d9362b", { roughness: 0.3 }), chili: mat("#e8261e", { roughness: 0.3 }), cabbage: mat("#9cc46a", { roughness: 0.7 }), carrot: mat("#f08a24", { roughness: 0.6 }), egg: mat("#7a3e8e", { roughness: 0.25 }), orange: mat("#f2a21e", { roughness: 0.55 }), onion: mat("#a3435a", { roughness: 0.4 }), potato: mat("#c7a06a", { roughness: 0.9 }), lime: mat("#7bbf3a", { roughness: 0.5 }), fish: mat("#c8ced6", { metalness: 0.6, roughness: 0.25 }), ice: new THREE.MeshPhysicalMaterial({ color: "#dff1fb", roughness: 0.1, transparent: true, opacity: 0.8 }) };
/** a heap of round produce on a woven tray */
const heap = (m: THREE.Material, r: number, n: number, w: number) => { const G = new THREE.Group(); G.add(cyl(w * 0.55, w * 0.5, 0.05, mat("#c8a46a", { roughness: 0.9 }), [0, 0.025, 0], [0, 0, 0], 24));
  for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * w * 0.42, h = (1 - d / (w * 0.45)) * w * 0.35; G.add(sph(r * (0.85 + rnd() * 0.3), m, [Math.cos(a) * d, 0.05 + r + h * rnd(), Math.sin(a) * d], [1, 0.9, 1], 10)); } return G; };
const fishBox = () => { const G = new THREE.Group(); G.add(B(0.6, 0.22, 0.42, mat("#f4f4f2", { roughness: 0.9 }), [0, 0.11, 0])); G.add(B(0.56, 0.02, 0.38, VEG.ice, [0, 0.215, 0]));
  for (let i = 0; i < 6; i++) { const f = sph(0.04, VEG.fish, [-0.2 + i * 0.08, 0.235, (rnd() - 0.5) * 0.15], [3.2, 0.7, 1.1], 12); f.rotation.y = (rnd() - 0.5) * 0.8; G.add(f); G.add(M(new THREE.ConeGeometry(0.03, 0.05, 4), VEG.fish, [-0.2 + i * 0.08 + 0.14, 0.235, f.position.z], [0, 0, Math.PI / 2])); } return G; };
const banana = () => { const G = new THREE.Group(), y = mat("#f2d23a", { roughness: 0.5 }); G.add(cyl(0.012, 0.012, 0.35, mat("#6a4a2a"), [0, 0, 0])); for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + r; const b = M(new THREE.CapsuleGeometry(0.018, 0.12, 4, 8), y, [Math.cos(a) * 0.06, -0.1 + r * 0.06, Math.sin(a) * 0.06], [0.5 * Math.cos(a), 0, 0.5 * Math.sin(a) + 0.4]); G.add(b); } return G; };
/** one market stall facing the aisle (+x side faces -x when flip) */
const stall = (kind: "veg" | "fruit" | "fish" | "grocer" | "spice", flip: boolean, awn: [string, string]) => {
  const G = new THREE.Group(), wood = std(woodPlanks("#7a5a3a", 5, "stallw"), [1, 1], { roughness: 0.85 }), s = flip ? -1 : 1;
  G.add(B(1.5, 0.06, 1.0, wood, [0, 0.8, 0])); for (const [x, z] of [[-0.7, -0.45], [0.7, -0.45], [-0.7, 0.45], [0.7, 0.45]]) G.add(B(0.06, 0.8, 0.06, wood, [x, 0.4, z]));
  G.add(B(1.5, 0.5, 0.04, wood, [0, 0.5, -0.48 * s])); // back board low
  for (const x of [-0.72, 0.72]) G.add(cyl(0.02, 0.02, 2.4, mat("#5a5d62", { metalness: 0.6, roughness: 0.4 }), [x, 1.2, 0.5 * s]));
  const at = stripeTex(...awn); at.repeat.set(2, 1); const aw = M(new THREE.PlaneGeometry(1.7, 1.2), new THREE.MeshStandardMaterial({ map: at, roughness: 0.7, side: THREE.DoubleSide }), [0, 2.32, 0], [-Math.PI / 2 + 0.22 * s, 0, 0]); G.add(aw);
  for (let i = 0; i < 9; i++) G.add(M(new THREE.PlaneGeometry(0.19, 0.1), new THREE.MeshStandardMaterial({ map: at, roughness: 0.7, side: THREE.DoubleSide }), [-0.76 + i * 0.19, 2.16, 0.6 * s])); // valance
  const top = 0.83, put = (o: THREE.Object3D, x: number, z: number, y = top) => { o.position.set(x, y, z * s); G.add(o); };
  if (kind === "veg") { for (const [x, z] of [[-0.5, 0.1], [-0.25, -0.25], [0.3, -0.28]]) put(mdl("basket", 2.4), x, z, top - 0.005); put(heap(VEG.tomato, 0.035, 26, 0.36), -0.5, 0.1, top + 0.03); put(heap(VEG.chili, 0.016, 60, 0.3), -0.05, 0.2); put(heap(VEG.cabbage, 0.08, 6, 0.42), 0.45, 0.05); put(heap(VEG.carrot, 0.025, 20, 0.3), -0.25, -0.25, top + 0.03); put(heap(VEG.egg, 0.03, 14, 0.3), 0.3, -0.28, top + 0.03); }
  if (kind === "fruit") { put(heap(VEG.orange, 0.04, 28, 0.42), -0.4, 0.05); put(heap(VEG.lime, 0.026, 30, 0.32), 0.15, 0.2); put(heap(VEG.tomato, 0.04, 14, 0.3), 0.5, -0.15); for (const [x, z, r] of [[-0.1, -0.28, 0.3], [0.3, -0.25, -0.5]] as V3[]) { const b = mdl("bananas", 1.3); b.position.set(x, top, z * s); b.rotation.y = r; G.add(b); } }
  if (kind === "fish") { put(fishBox(), -0.38, 0.05); put(fishBox(), 0.36, 0.0); put(heap(VEG.lime, 0.02, 12, 0.2), 0.0, 0.33); }
  if (kind === "grocer") { for (let i = 0; i < 3; i++) { const sk = RB(0.36, 0.42, 0.28, 0.08, mat(["#e8dcc0", "#d9c9a4", "#eae2cc"][i], { roughness: 0.95 }), [-0.45 + i * 0.42, top + 0.21, 0.1 * s]); G.add(sk); } put(heap(VEG.onion, 0.03, 22, 0.32), -0.3, -0.28); put(heap(VEG.potato, 0.035, 18, 0.32), 0.3, -0.28); }
  if (kind === "spice") { for (let i = 0; i < 6; i++) put(heap([VEG.chili, VEG.potato, VEG.onion, VEG.carrot, VEG.lime, VEG.orange][i], 0.014, 40, 0.24), -0.55 + (i % 3) * 0.55, i < 3 ? 0.15 : -0.22); }
  // hanging plastic-bag bundles and a hanging scale on some stalls
  if (rnd() < 0.7) { const bg = sph(0.08, mat(["#f05a5a", "#2a2a2a", "#f4f4f2"][Math.floor(rnd() * 3)], { roughness: 0.4 }), [0.55, 1.95, 0.4 * s], [1, 1.6, 0.4]); G.add(bg); }
  for (const [x, y] of [[-0.45, 0], [0.0, 0], [-0.22, 0.26]]) { const c = mdl("crate"); c.position.set(x, y, -0.75 * s); c.rotation.y = Math.PI / 2 + (rnd() - 0.5) * 0.2; G.add(c); }
  return G;
};
/** the bakso cart: a blue wooden gerobak with a glass case, two steaming aluminium pots, a gas tank, bicycle wheels, a roof */
export class BaksoCart {
  group = new THREE.Group(); steam: THREE.Vector3[] = [];
  constructor() {
    const G = this.group, blue = mat("#2f6fb6", { roughness: 0.45 }), white = mat("#f2efe6", { roughness: 0.5 }), alu = mat("#c9ccd2", { metalness: 0.95, roughness: 0.28 }), glass = new THREE.MeshPhysicalMaterial({ color: "#e6f2f8", roughness: 0.04, transparent: true, opacity: 0.28, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
    G.add(RB(1.5, 0.7, 0.6, 0.03, blue, [0, 0.62, 0])); G.add(B(1.54, 0.04, 0.64, white, [0, 0.99, 0]));
    const word = canvasTex(512, 128, (g) => { g.fillStyle = "rgba(0,0,0,0)"; g.clearRect(0, 0, 512, 128); g.font = "bold 92px 'Arial Black', Arial"; g.textAlign = "center"; g.lineWidth = 10; g.strokeStyle = "#fff"; g.strokeText("BAKSO", 256, 100); g.fillStyle = "#d42a2a"; g.fillText("BAKSO", 256, 100); });
    const caseM = M(new THREE.BoxGeometry(0.8, 0.42, 0.5), glass, [-0.3, 1.22, 0]); caseM.castShadow = false; G.add(caseM); G.add(M(new THREE.PlaneGeometry(0.72, 0.18), new THREE.MeshBasicMaterial({ map: word, transparent: true, toneMapped: false }), [-0.3, 1.28, 0.252]));
    for (const x of [-0.7, 0.1]) for (const z of [-0.25, 0.25]) G.add(B(0.02, 0.44, 0.02, alu, [x, 1.22, z]));
    const ball = mat("#a8876a", { roughness: 0.75 }), noodle = mat("#f2dc8a", { roughness: 0.6 }); for (let i = 0; i < 26; i++) G.add(sph(0.026, ball, [-0.6 + rnd() * 0.25, 1.05 + rnd() * 0.04, -0.15 + rnd() * 0.3], [1, 1, 1], 8)); G.add(RB(0.25, 0.06, 0.3, 0.03, noodle, [-0.15, 1.05, 0])); G.add(RB(0.12, 0.05, 0.2, 0.02, mat("#5a8a3a"), [0.0, 1.04, 0.05]));
    for (const [x, r] of [[0.42, 0.17], [0.42, 0.0]] as [number, number][]) { void r; }
    G.add(cyl(0.19, 0.19, 0.36, alu, [0.38, 1.19, -0.08], [0, 0, 0], 28)); G.add(cyl(0.2, 0.2, 0.02, alu, [0.38, 1.38, -0.08])); G.add(cyl(0.02, 0.02, 0.04, mat("#222"), [0.38, 1.41, -0.08]));
    G.add(cyl(0.13, 0.13, 0.26, alu, [0.6, 1.14, 0.17], [0, 0, 0], 24)); this.steam.push(V(0.38, 1.42, -0.08), V(0.6, 1.3, 0.17));
    G.add(cyl(0.14, 0.14, 0.42, mat("#2e9a4a", { roughness: 0.35 }), [0.45, 0.48, 0.0])); // gas tank (melon) under
    for (const [x, z] of [[-0.45, 0.33], [0.45, 0.33], [-0.45, -0.33], [0.45, -0.33]]) { G.add(M(new THREE.TorusGeometry(0.23, 0.018, 8, 28), mat("#1a1a1a", { roughness: 0.8 }), [x, 0.24, z])); G.add(cyl(0.008, 0.008, 0.46, alu, [x, 0.24, z], [0, 0, Math.PI / 2])); }
    for (const z of [-0.29, 0.29]) G.add(cyl(0.015, 0.015, 0.9, alu, [0.72, 1.4, z])); G.add(cyl(0.015, 0.015, 0.9, alu, [-0.72, 1.4, 0.29])); G.add(cyl(0.015, 0.015, 0.9, alu, [-0.72, 1.4, -0.29]));
    const rt = stripeTex("#d42a2a", "#f4f0e6"); rt.repeat.set(2, 1); G.add(M(new THREE.BoxGeometry(1.7, 0.03, 0.8), new THREE.MeshStandardMaterial({ map: rt, roughness: 0.6 }), [0, 1.86, 0]));
    for (let i = 0; i < 5; i++) G.add(cyl(0.065, 0.045, 0.05, mat("#f4f2ee", { roughness: 0.3 }), [0.08 + (i % 2) * 0.01, 1.035 + i * 0.03, 0.2])); // bowls
    for (const [x, c] of [[-0.05, "#c0261e"], [0.0, "#5a2a14"], [0.05, "#e8b81a"]] as [number, string][]) G.add(cyl(0.022, 0.025, 0.14, mat(c, { roughness: 0.3 }), [x, 1.09, -0.22]));
    G.add(cyl(0.012, 0.012, 1.1, mat("#6a4a2a"), [-0.95, 0.8, 0.2], [0, 0, 1.2])); G.add(cyl(0.012, 0.012, 1.1, mat("#6a4a2a"), [-0.95, 0.8, -0.2], [0, 0, 1.2])); // handles
    G.traverse((k) => { if ((k as THREE.Mesh).isMesh && k !== caseM) k.castShadow = true; });
  }
}
const stool = (c: string) => { const G = new THREE.Group(), m = mat(c, { roughness: 0.4 }); G.add(cyl(0.16, 0.16, 0.03, m, [0, 0.44, 0])); for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.78; G.add(cyl(0.02, 0.025, 0.45, m, [Math.cos(a) * 0.12, 0.22, Math.sin(a) * 0.12], [Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15])); } return G; };

// ======================================================================================================
export type PasarOpts = { day?: number; closed?: boolean; gauge?: boolean; tint?: number };
export class PasarSet {
  root = new THREE.Group(); sunDir = new THREE.Vector3(); plaster = new Plaster(); oldPlaster = new Plaster(); cart = new BaksoCart(); gauge = new TellTale(0.8);
  sway: { o: THREE.Object3D; amp: number; f: number; ph: number }[] = []; motes: THREE.Points; tubes: THREE.PointLight[] = []; closedG = new THREE.Group(); backGoods = new THREE.Group();
  constructor(public o: PasarOpts = {}) {
    const R = this.root, day = o.day ?? 0; seedRnd(11 + day * 0);
    // ---- floor: worn market tiles, a drain channel along the back wall
    const ft = tileTex.clone(); ft.repeat.set(10, 16); ft.needsUpdate = true;
    const floor = M(new THREE.PlaneGeometry(14, 22), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.42, metalness: 0.05, color: "#d8d0c4" }), [0, 0, 7.8], [-Math.PI / 2, 0, 0]); floor.castShadow = false; R.add(floor);
    R.add(B(8.4, 0.06, 0.3, mat("#6a6a66", { roughness: 0.9 }), [0, -0.02, -1.92])); const grate = mat("#3a3c3e", { metalness: 0.6, roughness: 0.5 }); for (let x = -4; x < 4; x += 0.06) R.add(B(0.015, 0.02, 0.28, grate, [x, 0.012, -1.92]));
    // ---- the back wall with the crack, side walls of the back area
    const wt = wallPaintTex.clone(); wt.repeat.set(2.4, 1); wt.needsUpdate = true; const wm = new THREE.MeshStandardMaterial({ map: wt, roughness: 0.88, normalMap: plaster("#b9cdb0").normal, normalScale: new THREE.Vector2(0.35, 0.35) });
    R.add(B(8.8, 3.5, 0.25, wm, [0, 1.75, WALL_Z])); R.add(B(8.9, 0.22, 0.4, mat("#efe8d6", { roughness: 0.8 }), [0, 3.58, WALL_Z])); // cap
    // Dutch-era details: a moulded cornice under the cap and two flat pilasters (kept outside the taped areas)
    const trim = mat("#f6f1e4", { roughness: 0.75 }); R.add(B(8.8, 0.1, 0.1, trim, [0, 3.36, FACE_Z + 0.045])); R.add(B(8.8, 0.05, 0.06, trim, [0, 3.27, FACE_Z + 0.025]));
    for (const x of [-3.65, 3.75]) { R.add(B(0.4, 3.1, 0.05, trim, [x, 1.7, FACE_Z + 0.02])); R.add(B(0.5, 0.12, 0.08, trim, [x, 3.2, FACE_Z + 0.035])); R.add(B(0.5, 0.35, 0.08, mat("#d9d0bc", { roughness: 0.85 }), [x, 0.33, FACE_Z + 0.035])); }
    R.add(B(8.8, 0.3, 0.27, mat("#a39a88", { roughness: 0.9 }), [0, 0.15, WALL_Z + 0.01])); // skirting, grey stone, a bit dirty
    const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.8), new THREE.MeshStandardMaterial({ map: crackTex, color: "#4a4440", transparent: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 })); crack.position.set(CRACK.x, CRACK.y, FACE_Z + 0.002); crack.receiveShadow = false; R.add(crack); // receiving shadows made a moving grid (shadow-map acne) around the crack
    this.plaster.group.position.copy(CRACK).add(V(0, 0, 0.006)); this.plaster.group.rotation.z = 0.06; R.add(this.plaster.group);
    this.oldPlaster.group.visible = false; R.add(this.oldPlaster.group);
    // wall clutter: a conduit and switch box, a water tap with a bucket, a broom, an old calendar picture, a hanging cable
    const pvc = mat("#e8e6de", { roughness: 0.5 }); R.add(cyl(0.02, 0.02, 3.2, pvc, [-2.6, 1.9, FACE_Z + 0.03])); R.add(B(0.14, 0.2, 0.06, pvc, [-2.6, 1.3, FACE_Z + 0.04])); R.add(cyl(0.02, 0.02, 4.0, pvc, [-0.6, 3.1, FACE_Z + 0.03], [0, 0, Math.PI / 2]));
    R.add(cyl(0.015, 0.015, 0.12, mat("#c9ccd2", { metalness: 0.9, roughness: 0.3 }), [2.2, 0.7, FACE_Z + 0.06], [Math.PI / 2, 0, 0])); R.add(cyl(0.16, 0.13, 0.32, mat("#2a7ad6", { roughness: 0.4 }), [2.2, 0.16, FACE_Z + 0.3], [0, 0, 0], 20));
    const broom = new THREE.Group(); broom.add(cyl(0.012, 0.012, 1.3, mat("#c8a46a"), [0, 0.85, 0])); broom.add(cyl(0.02, 0.12, 0.25, mat("#b89a5a", { roughness: 1 }), [0, 0.12, 0])); broom.position.set(-1.7, 0, FACE_Z + 0.12); broom.rotation.z = 0.12; R.add(broom);
    const cal = canvasTex(256, 360, (g) => { g.fillStyle = "#f4ecd8"; g.fillRect(0, 0, 256, 360); const gr = g.createLinearGradient(0, 0, 0, 180); gr.addColorStop(0, "#7ab0d8"); gr.addColorStop(1, "#d8e8c0"); g.fillStyle = gr; g.fillRect(16, 16, 224, 170); g.fillStyle = "#3a7a3a"; g.beginPath(); g.moveTo(16, 186); g.lineTo(90, 90); g.lineTo(150, 150); g.lineTo(200, 110); g.lineTo(240, 186); g.fill();
      for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) { g.fillStyle = c === 0 ? "#c0392b" : "#555"; g.fillRect(24 + c * 32, 206 + r * 28, 20, 14); } });
    R.add(M(new THREE.PlaneGeometry(0.4, 0.56), new THREE.MeshStandardMaterial({ map: cal, roughness: 0.8 }), [-1.35, 1.85, FACE_Z + 0.01], [0, 0, 0.03]));
    for (const s of [-1, 1]) R.add(B(0.25, 3.5, 3.0, wm, [s * 4.3, 1.75, -0.7])); // side walls of the back area
    // back-area stalls (closed later): grocer left, fish right
    const sg = stall("grocer", false, ["#2a62b8", "#f4f0e6"]); sg.position.set(-3.1, 0, -1.2); sg.rotation.y = Math.PI / 2; this.backGoods.add(sg);
    const sf = stall("fish", false, ["#2a9a5a", "#f4f0e6"]); sf.position.set(3.1, 0, -1.2); sf.rotation.y = -Math.PI / 2; this.backGoods.add(sf); R.add(this.backGoods);
    // the structural pillar at the edge of the main hall (the manager leans on it at the end)
    R.add(B(0.32, 4.2, 0.32, mat("#d8d2c4", { roughness: 0.85 }), [SPOT.pillar.x, 2.1, SPOT.pillar.z]));
    // ---- the bakso cart, stools
    this.cart.group.position.copy(SPOT.cart); this.cart.group.rotation.y = 0.25; R.add(this.cart.group);
    const st1 = mdl("chair"); st1.position.set(-2.45, 0, 1.45); st1.rotation.y = 2.6; R.add(st1); const st2 = recolor(mdl("chair"), { plastic_monobloc_chair_01: "#e04a3a" }); st2.position.set(-1.7, 0, 1.75); st2.rotation.y = -2.8; R.add(st2);
    // ---- main hall: stalls both sides of the aisle, zinc roof on steel columns, skylight strip
    const kinds: ("veg" | "fruit" | "fish" | "grocer" | "spice")[] = ["veg", "fruit", "spice", "veg", "fish", "fruit", "grocer", "spice"];
    const awns: [string, string][] = [["#e0402a", "#f4f0e6"], ["#2a62b8", "#f4f0e6"], ["#e8b81a", "#2a62b8"], ["#2a9a5a", "#f4f0e6"], ["#7a3e8e", "#f4f0e6"], ["#f08a24", "#f4f0e6"], ["#2a62b8", "#e8b81a"], ["#e0402a", "#2a62b8"]];
    for (let i = 0; i < 8; i++) { const side = i % 2 ? 1 : -1, z = 2.4 + Math.floor(i / 2) * 2.2, s = stall(kinds[i], side > 0, awns[i]); s.position.set(side * 2.45, 0, z); s.rotation.y = side * Math.PI / 2 * -1 + (side > 0 ? 0 : 0); s.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; R.add(s); }
    const steel = mat("#4a5058", { metalness: 0.7, roughness: 0.45 });
    for (let z = 1.2; z < 11; z += 2.6) for (const x of [-3.5, 3.5]) R.add(B(0.18, 4.3, 0.18, steel, [x, 2.15, z]));
    for (let z = 1.2; z < 11; z += 2.6) { R.add(B(7.2, 0.14, 0.1, steel, [0, 4.25, z])); for (let k = -3; k <= 3; k++) R.add(B(0.05, 0.5, 0.05, steel, [k * 1.1, 4.0 + 0.0, z], [0, 0, k % 2 ? 0.6 : -0.6])); }
    const zt = zincTex.clone(); zt.repeat.set(3, 6); zt.needsUpdate = true; const zm = new THREE.MeshStandardMaterial({ map: zt, roughness: 0.55, metalness: 0.5, side: THREE.DoubleSide, color: "#b8bcc2" });
    for (const s of [-1, 1]) { const r = M(new THREE.PlaneGeometry(3.0, 10.6), zm, [s * 2.4, 4.35 + 0.1, 6.0], [-Math.PI / 2, s * 0.08, 0]); R.add(r); }
    const sky = M(new THREE.PlaneGeometry(1.8, 10.6), new THREE.MeshStandardMaterial({ color: "#f4f0e0", emissive: "#fff6d8", emissiveIntensity: 0.6, transparent: true, opacity: 0.55, side: THREE.DoubleSide }), [0, 4.5, 6.0], [-Math.PI / 2, 0, 0]); sky.castShadow = false; R.add(sky);
    // hanging fluorescent tubes (lit, a little cool) over the aisle
    for (let z = 2.5; z < 10; z += 2.6) { R.add(cyl(0.004, 0.004, 0.9, mat("#333"), [0, 3.75, z])); const tb = cyl(0.018, 0.018, 1.2, new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#eef6ff", emissiveIntensity: 2.2 }), [0, 3.3, z], [0, 0, Math.PI / 2]); tb.castShadow = false; R.add(tb);
      const pl = new THREE.PointLight("#e8f0ff", 1.2, 5, 1.6); pl.position.set(0, 3.15, z); R.add(pl); this.tubes.push(pl); }
    // warm bulbs under some awnings
    for (const [x, z] of [[-2.3, 2.4], [2.3, 4.6], [-2.3, 6.8], [2.3, 9.0]] as [number, number][]) { const b = sph(0.04, new THREE.MeshStandardMaterial({ color: "#fff2c8", emissive: "#ffcf80", emissiveIntensity: 3 }), [x, 2.05, z]); b.castShadow = false; R.add(b); const pl = new THREE.PointLight("#ffbf70", 1.4, 3.2, 1.6); pl.position.set(x, 1.95, z); R.add(pl); }
    // ---- the street at the far end (downloaded models): pavements with striped kerbs both sides, an asphalt road,
    //      a row of old Dutch-era shophouses across it, street vendors on the far pavement, parked scooters, palms
    const pt = tileTex.clone(); pt.repeat.set(28, 3); pt.needsUpdate = true; const pave = new THREE.MeshStandardMaterial({ map: pt, color: "#cfc6b8", roughness: 0.8 });
    const kt = stripeTex("#26262a", "#f2f0ea"); kt.repeat.set(14, 1); const kerb = new THREE.MeshStandardMaterial({ map: kt, roughness: 0.7 });
    R.add(B(30, 0.14, 1.2, pave, [0, 0.07, 11.6])); R.add(B(30, 0.16, 0.14, kerb, [0, 0.08, 12.25]));
    R.add(B(30, 0.02, 5.0, mat("#4c4c50", { roughness: 0.75 }), [0, 0.01, 14.8])); for (let x = -14; x < 15; x += 2.6) R.add(B(1.3, 0.006, 0.12, mat("#f2f0e6", { roughness: 0.6 }), [x, 0.024, 14.8]));
    R.add(B(30, 0.16, 0.14, kerb, [0, 0.08, 17.33])); R.add(B(30, 0.14, 2.8, pave, [0, 0.07, 18.8]));
    const DUTCH: Record<string, string>[] = [
      { Beige: "#efe6d0", LightYellow: "#f7f0de", White: "#ffffff", DarkRed: "#b4532e", Brown: "#2f5d44", Grey: "#cbc4b4", DarkGrey: "#4a4440", GreyBlue: "#e8dec6", BrickRed: "#ecdcbc", LightGrey: "#f4efe4" },
      { Beige: "#f4efe3", LightYellow: "#fbf7ec", White: "#ffffff", DarkRed: "#a8482a", Brown: "#5a3a26", Grey: "#cfc8ba", DarkGrey: "#4a4440", GreyBlue: "#f1e9d6", BrickRed: "#f2e8d4", LightGrey: "#fbf7ee" },
      { Beige: "#eedba6", LightYellow: "#f4e6bc", White: "#fffaf0", DarkRed: "#b0502c", Brown: "#2f5d44", Grey: "#d2c6a8", DarkGrey: "#4a4440", GreyBlue: "#efe0b4", BrickRed: "#eedcae", LightGrey: "#f8f0d8" },
    ];
    /** a building with its front at z = front, facing the market (+z when face = 1, -z when face = -1) */
    const house = (n: string, x: number, front: number, face: 1 | -1, look: number, s = 1) => { const o = recolor(mdl(n, s), DUTCH[look]); o.rotation.y = face > 0 ? 0 : Math.PI; o.position.x = x; o.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(o); o.position.z += front - (face > 0 ? b.max.z : b.min.z); R.add(o); return o; };
    house("town_d", -8.6, 20.2, -1, 0, 0.62); house("town_a", 1.4, 20.2, -1, 1, 0.75); house("town_h", 10.2, 20.2, -1, 2, 0.6); house("town_c", -16, 20.2, -1, 1, 0.6);
    const veg = (o: THREE.Object3D, x: number, y: number, z: number, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; R.add(o); return o; };
    veg(mdl("vendor_cart", 0.95), -1.9, 0.14, 18.4, Math.PI * 0.85); veg(mdl("market_stalls"), 4.1, 0.14, 18.9, Math.PI);
    veg(mdl("umbrella"), 0.9, 0.14, 18.3); for (const [x, z, y] of [[0.65, 18.3, 0.14], [1.1, 18.4, 0.14], [0.85, 18.3, 0.4]] as V3[]) veg(mdl("crate"), x, y, z, 1.57);
    veg(mdl("bananas"), 0.85, 0.66, 18.3, 0.4); veg(mdl("basket", 1.4), 1.25, 0.4, 18.25); veg(mdl("basket", 1.4), 0.45, 0.4, 18.35, 1);
    for (const x of [-5.4, 6.6]) veg(mdl("lamp"), x, 0.14, 17.6, Math.PI);
    veg(mdl("palm", 1.1), -4.2, 0.14, 19.3, 0.6); veg(mdl("palm"), 8.0, 0.14, 19.2, 2.2); veg(mdl("plant", 1.2), 2.6, 0.14, 19.6);
    // parked scooters, side-on to the camera so their shapes read (each a different colour)
    veg(recolor(mdl("scooter_matic"), { BROWN: "#1c1c20", BLUE: "#d8262e", HARDblue: "#d8262e" }, 0.5), -2.0, 0, 12.95, 1.25); veg(mdl("scooter_vespa"), -0.6, 0, 12.9, 1.35); veg(mdl("scooter_white"), 1.9, 0, 12.95, -1.3);
    veg(mdl("scooter_white"), 4.4, 0, 16.6, 1.4); veg(recolor(mdl("scooter_matic"), { BROWN: "#1c1c20" }, 0.5), -4.7, 0, 16.7, -1.45);
    // behind the back wall: lower old buildings further back, palms between them, so a band of sky shows over them
    house("town_a", -7.5, -13, 1, 2, 0.62); house("town_b", 3.5, -14, 1, 0, 0.6); house("town_d", 14, -13, 1, 1, 0.55);
    veg(mdl("palm", 1.2), -2.6, 0, -9.5, 1.1); veg(mdl("palm", 0.95), 8.6, 0, -10.2, 2.5);
    // clouds: soft white low-poly clouds around the horizon (no fog, no shadows)
    const cm = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#e6eef8", emissiveIntensity: 0.45, roughness: 1, fog: false });
    for (const [az, dist, h, sz, kind] of [[-2.3, 90, 16, 26, 2], [-1.9, 85, 22, 14, 1], [-1.5, 95, 14, 30, 2], [-1.15, 80, 19, 12, 1], [-0.8, 92, 24, 18, 1], [-0.4, 88, 15, 24, 2],
      [0.0, 95, 26, 16, 1], [0.45, 85, 17, 22, 2], [0.9, 90, 21, 14, 1], [1.3, 92, 13, 28, 2], [1.75, 86, 18, 16, 1], [2.3, 94, 23, 20, 2], [2.8, 88, 15, 26, 2], [3.3, 90, 20, 14, 1]] as number[][]) {
      const o = mdl(kind === 1 ? "cloud_1" : "cloud_2", sz); o.traverse((x) => { const me = x as THREE.Mesh; if (me.isMesh) { me.material = cm; me.castShadow = me.receiveShadow = false; } });
      o.position.set(Math.sin(az) * dist, h, -Math.cos(az) * dist); o.lookAt(0, h, 0); R.add(o); }
    // ---- sky: a warm morning dome
    const skyT = canvasTex(8, 512, (g) => { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#5f97d6"); gr.addColorStop(0.4, "#9cc4ea"); gr.addColorStop(0.5, "#f6e4c4"); gr.addColorStop(1, "#e8d2b0"); g.fillStyle = gr; g.fillRect(0, 0, 8, 512); });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(120, 32, 16), new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide, fog: false, depthWrite: false })); R.add(dome);
    // ---- light: warm morning sun from the front-right, high enough to light the wall through the open back roof
    const warm = ["#ffe0b0", "#ffd8a0", "#ffe6c0", "#ffd0a0", "#ffe8c8", "#ffdcaa"][day % 6];
    const sun = new THREE.DirectionalLight(warm, 3.4); sun.position.set(6, 11.5, 3.5); sun.target.position.set(0, 0.8, -1.5); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
    Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 4; R.add(sun, sun.target);
    R.add(new THREE.HemisphereLight("#bcd6ff", "#b08a62", 1.35)); const fill = new THREE.DirectionalLight("#a8c6ff", 0.6); fill.position.set(-6, 4, 6); fill.target.position.set(0, 1, 0); R.add(fill, fill.target);
    const bounce = new THREE.PointLight("#ffb571", 1.2, 4.5, 1.5); bounce.position.set(0.3, 0.4, -0.9); R.add(bounce);
    this.sunDir.copy(sun.position).sub(sun.target.position).normalize();
    // sun shafts through the open back roof and the skylight, with motes
    const shm = new THREE.MeshBasicMaterial({ map: shaftTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, color: new THREE.Color(0.1, 0.075, 0.045) });
    const feet: V3[] = [[-1.6, 0, -1.2], [0.9, 0, -0.6], [2.6, 0, -1.4], [-0.3, 0, 2.6], [0.4, 0, 5.2], [-0.5, 0, 7.8], [0.3, 0, 9.8]]; const mp: number[] = [];
    feet.forEach(([x, y, z], i) => { const len = i < 3 ? 7 : 5, w = 0.5 + (i % 3) * 0.25, base = V(x, y, z), mid = base.clone().addScaledVector(this.sunDir, len / 2);
      for (const ry of [0, Math.PI / 2]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(w, len), shm); s.position.copy(mid); s.quaternion.setFromUnitVectors(V(0, 1, 0), this.sunDir); s.rotateY(ry + i * 0.4); s.castShadow = s.receiveShadow = false; s.layers.set(NOINK); R.add(s); }
      for (let k = 0; k < 40; k++) { const p = base.clone().addScaledVector(this.sunDir, 0.3 + rnd() * 3.5).add(V((rnd() - 0.5) * w, (rnd() - 0.5) * 0.3, (rnd() - 0.5) * w)); mp.push(p.x, p.y, p.z); } });
    const mg = new THREE.BufferGeometry(); mg.setAttribute("position", new THREE.Float32BufferAttribute(mp, 3));
    const dot = canvasTex(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(255,236,200,1)"); gr.addColorStop(1, "rgba(255,236,200,0)"); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
    this.motes = new THREE.Points(mg, new THREE.PointsMaterial({ map: dot, size: 0.012, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })); R.add(this.motes);
    // wet floor: the aisle was just hosed; a few mirror puddles
    const blob = (cx: number, cz: number, r: number, seed: number) => { const sh = new THREE.Shape(); for (let k = 0; k <= 32; k++) { const a = (k / 32) * Math.PI * 2, rr = r * (1 + 0.18 * Math.sin(a * 3 + seed) + 0.09 * Math.sin(a * 5 + seed * 2)); const px = cx + Math.cos(a) * rr * 1.5, pz = cz + Math.sin(a) * rr * 0.85; if (k) sh.lineTo(px, -pz); else sh.moveTo(px, -pz); } return sh; };
    const P: [number, number, number, number][] = [[0.6, -0.6, 0.26, 1], [-0.7, 0.35, 0.2, 2.3], [0.3, 2.2, 0.3, 3.7], [-0.4, 4.0, 0.24, 5.1], [0.5, 6.3, 0.28, 6.2], [-0.3, 8.4, 0.25, 7.7]];
    const pud = new Reflector(new THREE.ShapeGeometry(P.map(([x, z, r, sd]) => blob(x, z, r, sd)), 12), { textureWidth: 1024, textureHeight: 1024, color: 0x9aa2ad, clipBias: 0.003 }); pud.rotation.x = -Math.PI / 2; pud.position.y = 0.006; pud.camera.layers.enable(NOINK); R.add(pud);
    // ---- the tell-tale gauge (after the engineer) and the closure (tape, cones, warning sign, goods moved out)
    this.gauge.group.position.copy(CRACK).add(V(-0.045, -0.3, 0.004)); this.gauge.group.visible = !!o.gauge; R.add(this.gauge.group);
    if (o.closed) { this.backGoods.visible = false;
      const TZ = -0.25, tp = V(-4.15, 1.05, TZ), tq = V(4.15, 1.05, TZ); for (const x of [-1.0, 1.0, 3.4]) { const c = cone(); c.position.set(x, 0, TZ); this.closedG.add(c); } // the bakso cart stays outside the tape
      this.closedG.add(tape(tp, V(-1.0, 0.6, TZ), 0.05), tape(V(-1.0, 0.6, TZ), V(1.0, 0.6, TZ), 0.05), tape(V(1.0, 0.6, TZ), V(3.4, 0.6, TZ), 0.05), tape(V(3.4, 0.6, TZ), tq, 0.03));
      this.closedG.add(tape(V(-2.7, 2.5, FACE_Z + 0.03), V(-0.95, 0.6, FACE_Z + 0.03), 0), tape(V(-0.95, 2.5, FACE_Z + 0.03), V(-2.7, 0.6, FACE_Z + 0.03), 0), tape(V(1.4, 2.5, FACE_Z + 0.03), V(3.0, 0.6, FACE_Z + 0.03), 0), tape(V(3.0, 2.5, FACE_Z + 0.03), V(1.4, 0.6, FACE_Z + 0.03), 0)); // X marks on the wall either side of the crack (the crack stays visible)
      const ws = warnSign(); ws.position.set(-0.3, 0, -0.05); ws.rotation.y = 0.2; this.closedG.add(ws);
      for (const [x, z, c] of [[-3.3, 1.5, "#2a62b8"], [-2.8, 1.7, "#e0402a"], [3.1, 1.6, "#2a9a5a"]] as [number, number, string][]) { const k = crate(c); k.position.set(x, 0.15, z); this.closedG.add(k); }
      R.add(this.closedG); }
    if (o.closed) { this.closedG.traverse((k) => { (k as THREE.Mesh).castShadow = true; }); }
    // swaying things
    R.traverse((k) => { if (k instanceof THREE.Group && k.children.length > 20 && k.position.y > 1.9) this.sway.push({ o: k, amp: 0.05, f: 0.4 + rnd() * 0.3, ph: rnd() * 6 }); });
  }
  update(t: number) {
    for (const s of this.sway) s.o.rotation.z = s.amp * Math.sin(t * s.f * 6.28 + s.ph);
    this.motes.position.set(0.05 * Math.sin(t * 0.21), 0.04 * Math.sin(t * 0.17) + ((0.02 * t) % 0.3), 0.04 * Math.cos(t * 0.19));
    this.tubes.forEach((l, i) => (l.intensity = 1.2 * (0.97 + 0.03 * Math.sin(t * 40 + i))));
  }
}

// ======================================================================================================
// the macro wall chunk: two blocks of the same painted wall with a jagged crack between them; the right block slides
// away (`open`), the plaster across it stretches and snaps; the tell-tale gauge across the crack lower down
const jag = (() => { seedRnd(77); const pts: [number, number][] = []; for (let y = -0.7; y <= 0.7; y += 0.012) pts.push([0.006 * Math.sin(y * 60) + (rnd() - 0.5) * 0.012 + 0.03 * Math.sin(y * 6), y]); return pts; })();
export class RetakSet {
  root = new THREE.Group(); sunDir = new THREE.Vector3(); left = new THREE.Group(); right = new THREE.Group(); plaster = new Plaster(0.11, 0.034); gauge = new TellTale(0.9); arrows: THREE.Group[] = [];
  constructor() {
    const R = this.root, wt = wallPaintTex.clone(); wt.repeat.set(0.9, 0.9); wt.needsUpdate = true;
    const wm = new THREE.MeshStandardMaterial({ map: wt, roughness: 0.85, normalMap: plaster("#b9cdb0").normal, normalScale: new THREE.Vector2(1.4, 1.4) }), inner = mat("#6a5a4a", { roughness: 1 });
    const slab = (side: -1 | 1) => { const sh = new THREE.Shape(), X = side * 0.8; sh.moveTo(X, -0.7); jag.forEach(([x, y]) => sh.lineTo(x, y)); sh.lineTo(X, 0.7); sh.closePath();
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: false }); geo.translate(0, 0, -0.12); const m = new THREE.Mesh(geo, [wm, inner]); m.castShadow = m.receiveShadow = true;
      // UVs from position so the texture runs continuously across both blocks
      const pos = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) * 1.2 + 0.5, pos.getY(i) * 1.2 + 0.5); uv.needsUpdate = true; return m; };
    this.left.add(slab(-1)); this.right.add(slab(1)); R.add(this.left, this.right);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 1.6), mat("#2e231c", { roughness: 1 })); back.position.set(0, 0, -0.1); R.add(back); // the dark inside of the crack
    // dust along the crack edge (fine dark grains)
    const grain = mat("#3a2e26", { roughness: 1 }); for (let i = 0; i < 70; i++) { const [x, y] = jag[Math.floor(rnd() * jag.length)]; const s = sph(0.0006 + rnd() * 0.0008, grain, [x + (rnd() - 0.5) * 0.008, y, 0.0005], [1, 1, 0.4], 6); (rnd() < 0.5 ? this.left : this.right).add(s); }
    // the plaster: its left half on the left block, its right half on the right block, the middle stretches
    this.plaster.group.position.set(0.005, 0.06, 0.003); this.plaster.group.rotation.z = 0.05; R.add(this.plaster.group);
    this.gauge.group.position.set(-0.075, -0.12, 0.002); this.left.add(this.gauge.a); this.right.add(this.gauge.b); this.gauge.a.position.copy(this.gauge.group.position); this.gauge.b.position.copy(this.gauge.group.position);
    // arrows (3D) showing the two sides moving apart
    const am = new THREE.MeshStandardMaterial({ color: "#ff4a3a", emissive: "#ff2a1a", emissiveIntensity: 0.6, roughness: 0.3 });
    for (const s of [-1, 1]) { const A = new THREE.Group(); A.add(cyl(0.007, 0.007, 0.06, am, [0, 0, 0], [0, 0, Math.PI / 2], 12)); A.add(M(new THREE.ConeGeometry(0.016, 0.03, 16), am, [s * 0.044, 0, 0], [0, 0, -s * Math.PI / 2])); A.position.set(s * 0.12, 0.06, 0.03); this.arrows.push(A); R.add(A); }
    // warm raking morning light from the upper left so the paint texture and the crack edges read
    const sun = new THREE.DirectionalLight("#ffe2b8", 3.0); sun.position.set(-2.0, 2.4, 2.2); sun.target.position.set(0, 0, 0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -0.6, right: 0.6, top: 0.6, bottom: -0.6, near: 0.5, far: 8 }); sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.005; R.add(sun, sun.target);
    R.add(new THREE.HemisphereLight("#c4dcff", "#b08a62", 1.0)); const rim = new THREE.PointLight("#9cc4ff", 0.6, 3, 1.5); rim.position.set(0.8, -0.4, 0.6); R.add(rim);
    this.sunDir.copy(sun.position).normalize();
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), mat("#ebe3cf")); bg.position.z = -0.4; R.add(bg);
  }
  /** open: gap in metres (shown exaggerated); tear: when the plaster has snapped */
  set(open: number, torn: boolean, arrows: number, t: number) {
    this.right.position.x = open; this.left.position.x = -open * 0.15;
    this.plaster.group.position.x = 0.005 + 0.425 * open; // each half rides on its own block
    this.plaster.show(torn ? "torn" : "stretch", torn ? open * 1.15 + 0.004 : open * 1.15);
    this.arrows.forEach((A, i) => { A.visible = arrows > 0.01; A.scale.setScalar(Math.max(0.001, arrows)); A.position.x = (i ? 1 : -1) * (0.12 + 0.012 * Math.sin(t * 6)) + (i ? open : -open * 0.15); });
  }
  update(t: number) { void t; }
}
export const stoolMk = stool; export const coneMk = cone;
