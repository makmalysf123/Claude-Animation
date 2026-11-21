// Interior sets for the gold-coin film, all in a colourful city look (no kampung): your bedroom in the perumahan house
// (night / morning / afternoon), a busy mall cafe, a police interrogation room with a barred window, and a red-and-gold
// jewellery shop. Every set: root, sunDir (key light direction for the cards' ink), update(t). No readable text anywhere.
import * as THREE from "three";
import { canvasTex, std } from "../ketindihan2/sets";
import { woodPlanks, rnd, seedRnd } from "../../lib/world2/textures";
import { makeCoin } from "./halaman";
import { mat, M, rb, Guci, Laptop, Clock, GoldScale, handcuffs, cashStack } from "./props";

type V3 = [number, number, number];
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const B = (w: number, h: number, d: number, m: THREE.Material | THREE.Material[], p: V3, r: V3 = [0, 0, 0]) => M(new THREE.BoxGeometry(w, h, d), m, p, r);
const cyl = (r1: number, r2: number, h: number, m: THREE.Material, p: V3, r: V3 = [0, 0, 0], seg = 20) => M(new THREE.CylinderGeometry(r1, r2, h, seg), m, p, r);
const glowTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,240,190,1)"); gr.addColorStop(0.25, "rgba(255,200,90,0.55)"); gr.addColorStop(1, "rgba(255,160,40,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
export const glowSprite = (col = "#ffffff") => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); s.renderOrder = 9; return s; };

/** painted wall material with soft roller blotches (texture repeats every 2 m on extruded walls) */
const paint = (base: string, rough = 0.9) => { seedRnd(base.length * 13 + base.charCodeAt(2)); const t = canvasTex(256, 256, (g) => { g.fillStyle = base; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? "255,255,255" : "0,0,0"},${0.012 + rnd() * 0.02})`; g.beginPath(); g.arc(rnd() * 256, rnd() * 256, 6 + rnd() * 26, 0, Math.PI * 2); g.fill(); } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.5, 0.5); return new THREE.MeshStandardMaterial({ map: t, roughness: rough }); };
/** a wall slab from x w0..w1 (shape units), height h, rectangular holes [x0,y0,x1,y1], 15 cm thick */
const slab = (w0: number, w1: number, h: number, holes: [number, number, number, number][], m: THREE.Material) => {
  const s = new THREE.Shape(); s.moveTo(w0, 0); s.lineTo(w1, 0); s.lineTo(w1, h); s.lineTo(w0, h); s.closePath();
  for (const [a, b, c, d] of holes) { const p = new THREE.Path(); p.moveTo(a, b); p.lineTo(a, d); p.lineTo(c, d); p.lineTo(c, b); p.closePath(); s.holes.push(p); }
  const o = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.15, bevelEnabled: false }), m); o.castShadow = o.receiveShadow = true; return o;
};
type Shell = { w: number; d: number; h: number; back: THREE.Material; left: THREE.Material; right: THREE.Material; floor: THREE.Material; ceil?: string; holesB?: [number, number, number, number][]; holesL?: [number, number, number, number][]; holesR?: [number, number, number, number][] };
/** a room: back wall at z = 0 (facing +z), side walls at x = +-w/2, floor y = 0, ceiling y = h; the camera side is open */
const shell = (R: THREE.Object3D, o: Shell) => {
  const bw = slab(-o.w / 2 - 0.15, o.w / 2 + 0.15, o.h, o.holesB ?? [], o.back); bw.position.z = -0.15; R.add(bw);
  const lw = slab(-o.d, 0.15, o.h, (o.holesL ?? []).map(([z0, y0, z1, y1]) => [-z1, y0, -z0, y1] as [number, number, number, number]), o.left); lw.rotation.y = Math.PI / 2; lw.position.x = -o.w / 2 - 0.15; R.add(lw);
  const rw = slab(-0.15, o.d, o.h, o.holesR ?? [], o.right); rw.rotation.y = -Math.PI / 2; rw.position.x = o.w / 2 + 0.15; R.add(rw);
  const fl = M(new THREE.PlaneGeometry(o.w + 0.3, o.d + 6), o.floor, [0, 0, o.d / 2 + 3], [-Math.PI / 2, 0, 0]); fl.castShadow = false; R.add(fl);
  const ce = M(new THREE.PlaneGeometry(o.w + 0.3, o.d + 6), mat(o.ceil ?? "#f4efe6", { roughness: 0.95 }), [0, o.h, o.d / 2 + 3], [Math.PI / 2, 0, 0]); R.add(ce);
  R.add(B(o.w, 0.08, 0.02, mat("#f4f1ea"), [0, 0.04, 0.01])); // skirting
};
/** an aluminium-framed window in the back wall with glass and a sill */
const winBack = (R: THREE.Object3D, x0: number, y0: number, x1: number, y1: number, frame = "#e9ecef") => {
  const fm = mat(frame, { metalness: 0.5, roughness: 0.35 }), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, w = x1 - x0, h = y1 - y0;
  for (const [p, s] of [[[cx, y0, -0.07], [w + 0.08, 0.05, 0.08]], [[cx, y1, -0.07], [w + 0.08, 0.05, 0.08]], [[x0, cy, -0.07], [0.05, h, 0.08]], [[x1, cy, -0.07], [0.05, h, 0.08]], [[cx, cy, -0.07], [0.035, h, 0.06]]] as [V3, V3][]) R.add(B(s[0], s[1], s[2], fm, p));
  const gl = M(new THREE.PlaneGeometry(w, h), new THREE.MeshPhysicalMaterial({ color: "#dff2ff", roughness: 0.05, transparent: true, opacity: 0.12, depthWrite: false }), [cx, cy, -0.08]); gl.castShadow = false; R.add(gl);
  R.add(B(w + 0.16, 0.04, 0.2, mat("#f2ede4"), [cx, y0 - 0.02, 0.05]));
};
/** a flat painted view behind a window (sky + neighbours' roofs), unlit and unfogged */
const view = (draw: (g: CanvasRenderingContext2D) => void, w: number, h: number, p: V3, ry = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: canvasTex(1024, 512, draw), fog: false, toneMapped: false })); m.position.set(...p); m.rotation.y = ry; return m; };
const roofs = (g: CanvasRenderingContext2D, night: boolean, sky: [string, string]) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, sky[0]); gr.addColorStop(1, sky[1]); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  if (night) { g.fillStyle = "#fff7d8"; g.beginPath(); g.arc(760, 110, 42, 0, Math.PI * 2); g.fill(); g.fillStyle = sky[0]; g.beginPath(); g.arc(780, 98, 38, 0, Math.PI * 2); g.fill(); for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.6})`; g.fillRect(rnd() * 1024, rnd() * 260, 2, 2); } }
  else { for (let i = 0; i < 5; i++) { g.fillStyle = "rgba(255,255,255,0.85)"; const x = rnd() * 1024, y = 60 + rnd() * 120; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + k * 26, y + Math.sin(k) * 8, 22 + rnd() * 14, 0, Math.PI * 2); g.fill(); } } }
  const cols = night ? ["#2b2f4e", "#33385a", "#272a44"] : ["#e9a66b", "#d9675a", "#f0d6a8", "#7fb3c9", "#b8d68a"];
  for (let i = 0; i < 9; i++) { const x = i * 120 - 40 + rnd() * 30, w = 150 + rnd() * 50, y = 300 + rnd() * 50; g.fillStyle = cols[i % cols.length]; g.fillRect(x, y, w, 512 - y);
    g.fillStyle = night ? "#1c1f36" : ["#8a3b2c", "#3d4f72", "#6a6f78"][i % 3]; g.beginPath(); g.moveTo(x - 14, y + 4); g.lineTo(x + w / 2, y - 60); g.lineTo(x + w + 14, y + 4); g.fill();
    for (let k = 0; k < 2; k++) { const lit = night && rnd() < 0.7; g.fillStyle = lit ? "#ffc879" : night ? "#20233c" : "#3e4a58"; g.fillRect(x + 25 + k * 65, y + 50, 40, 46); } }
  g.fillStyle = night ? "#1a2a22" : "#4f8a4a"; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(80 + i * 190 + rnd() * 40, 470, 60 + rnd() * 30, 0, Math.PI * 2); g.fill(); }
};
/** fairy-light bulbs strung on a sagging wire between a and b */
const fairy = (R: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, n: number, sag: number, on: number) => {
  const cols = ["#ff7a7a", "#ffd36b", "#7ad7ff", "#9dff8a", "#ff9ae6"], out: THREE.Mesh[] = [];
  const pts = Array.from({ length: 24 }, (_, i) => { const u = i / 23; return a.clone().lerp(b, u).add(V(0, -sag * 4 * u * (1 - u), 0.02)); });
  const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.003, 4), mat("#2a2a2a")); R.add(wire);
  for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, p = a.clone().lerp(b, u).add(V(0, -sag * 4 * u * (1 - u) - 0.025, 0.03)); const m = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(cols[i % 5]).multiplyScalar(0.35 + 1.4 * on), toneMapped: false })); m.position.copy(p); R.add(m); out.push(m); }
  return out;
};
/** coin + its glow sprite + gold point light, as one rig */
export class CoinRig {
  coin = makeCoin(); glow = glowSprite(); light = new THREE.PointLight("#ffc65a", 0, 1.8, 2);
  constructor(R: THREE.Object3D) { R.add(this.coin, this.glow, this.light); this.glow.visible = false; }
  set(k: number, t: number, size = 0.3, li = 1.2) { const p = this.coin.getWorldPosition(V(0, 0, 0)); this.glow.position.copy(p); this.glow.scale.setScalar(size * k * (1 + 0.06 * Math.sin(t * 8)) + 0.001); (this.glow.material as THREE.SpriteMaterial).opacity = 0.85 * k; this.glow.visible = k > 0.01; this.light.position.copy(p).add(V(0, 0.06, 0.06)); this.light.intensity = li * k; }
}
const plant = (R: THREE.Object3D, p: V3, s = 1, pot = "#d9643a") => { const G = new THREE.Group(); G.add(cyl(0.13 * s, 0.1 * s, 0.26 * s, mat(pot, { roughness: 0.6 }), [0, 0.13 * s, 0])); const lf = mat("#2f7a3a", { roughness: 0.6, side: THREE.DoubleSide });
  for (let i = 0; i < 9; i++) { const a = i * 2.4, l = new THREE.Mesh(new THREE.SphereGeometry(0.14 * s, 12, 8), lf); l.scale.set(1, 0.18, 0.55); l.position.set(Math.cos(a) * 0.12 * s, (0.4 + 0.2 * (i % 3)) * s, Math.sin(a) * 0.12 * s); l.rotation.set(0.4 * Math.sin(i), -a, 0.5 + 0.3 * (i % 2)); l.castShadow = true; G.add(l); }
  G.position.set(...p); R.add(G); return G; };
const books = (R: THREE.Object3D, x0: number, y: number, z: number, n: number, along: "x" | "z" = "x") => { const cs = ["#d64545", "#3a7bd5", "#f2b134", "#3fa66a", "#8e5bd6", "#f07a3c", "#2bb3b1"]; let p = 0;
  for (let i = 0; i < n; i++) { const w = 0.03 + rnd() * 0.03, h = 0.18 + rnd() * 0.08, b = B(along === "x" ? w : 0.15, h, along === "x" ? 0.15 : w, mat(cs[i % cs.length], { roughness: 0.7 }), along === "x" ? [x0 + p + w / 2, y + h / 2, z] : [z, y + h / 2, x0 + p + w / 2]); R.add(b); p += w + 0.004; } };

// ======================================================================================================
// your bedroom upstairs (city perumahan): apricot + periwinkle walls, a double bed, a desk facing into the room
export type RoomMode = "night" | "morning" | "day";
export const BED = { x0: 0.55, x1: 1.95, z0: 0.05, z1: 2.05, top: 0.53 };
export const BED_SEAT: V3 = [1.18, 0.5, 2.12];
export const GUCI_AT: V3 = [1.68, 0.53, 1.85];
export const DESK_SEAT: V3 = [-1.3, 0.48, 0.8];
export const LAPTOP_AT: V3 = [-1.3, 0.75, 1.3];
export class KamarSet {
  root = new THREE.Group(); sunDir = new THREE.Vector3(); key: THREE.DirectionalLight; hemi: THREE.HemisphereLight;
  guci = new Guci(); laptop = new Laptop(); coin: CoinRig; deskLamp = new THREE.PointLight("#ffcf8a", 0, 2.2, 2); bulbs: THREE.Mesh[] = []; extra = new THREE.Group();
  /** the room's front half (TV corner), shown only when the camera looks over the laptop toward the room */
  front = new THREE.Group();
  constructor(public mode: RoomMode) {
    seedRnd(31); const R = this.root, night = mode === "night"; R.add(this.extra);
    shell(R, { w: 4.6, d: 4.6, h: 2.8, back: paint("#efa76a"), left: paint("#6c8fd6"), right: paint("#efa76a"), floor: std(woodPlanks("#b9855a", 8, "kamar"), [3, 3], { roughness: 0.45 }), holesB: [[-1.9, 1.05, -0.7, 2.15], [0.85, 1.5, 1.65, 2.25]], holesR: [[2.75, 0, 3.6, 2.1]] });
    winBack(R, -1.9, 1.05, -0.7, 2.15); winBack(R, 0.85, 1.5, 1.65, 2.25);
    const sky: [string, string] = night ? ["#0f1638", "#3a3270"] : mode === "morning" ? ["#7cc4ff", "#ffe2b0"] : ["#6fb6ff", "#cfe9ff"];
    R.add(view((g) => roofs(g, night, sky), 9, 4.5, [-0.4, 1.9, -2.6]));
    // curtains (soft cloth both sides of the big window)
    for (const x of [-2.05, -0.55]) { const c = M(new THREE.PlaneGeometry(0.32, 1.5, 6, 1), mat("#f2e2c4", { side: THREE.DoubleSide, roughness: 0.95 }), [x, 1.5, 0.08]); const pp = c.geometry.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pp.count; i++) pp.setZ(i, 0.03 * Math.sin(pp.getX(i) * 40)); c.geometry.computeVertexNormals(); R.add(c); }
    R.add(cyl(0.012, 0.012, 1.8, mat("#c9a46a", { metalness: 0.6 }), [-1.3, 2.28, 0.08], [0, 0, Math.PI / 2]));
    // the bed: wooden frame, mustard upholstered headboard, white mattress, a patchwork blanket draped over the foot, pillows, a bolster (guling)
    const bx = (BED.x0 + BED.x1) / 2, bw = BED.x1 - BED.x0, bl = BED.z1 - BED.z0, bz = (BED.z0 + BED.z1) / 2;
    R.add(B(bw + 0.06, 0.3, bl, mat("#a8744a", { roughness: 0.55 }), [bx, 0.15, bz])); R.add(M(rb(bw + 0.1, 1.05, 0.1, 0.04), mat("#e7a93b", { roughness: 0.85 }), [bx, 0.6, BED.z0]));
    R.add(M(rb(bw - 0.02, 0.2, bl - 0.1, 0.05), mat("#f6f3ee", { roughness: 0.9 }), [bx, 0.4, bz + 0.03]));
    const quilt = canvasTex(512, 512, (g) => { const cs = ["#ff8f70", "#ffd166", "#4ecdc4", "#7b8cde", "#f78fb3", "#9be15d"]; for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) { g.fillStyle = cs[(r * 2 + c) % 6]; g.fillRect(c * 85, r * 85, 85, 85); g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.arc(c * 85 + 42, r * 85 + 42, 16, 0, Math.PI * 2); g.fill(); } g.strokeStyle = "rgba(255,255,255,0.7)"; g.setLineDash([6, 6]); g.lineWidth = 3; for (let k = 0; k <= 6; k++) { g.beginPath(); g.moveTo(k * 85, 0); g.lineTo(k * 85, 512); g.stroke(); g.beginPath(); g.moveTo(0, k * 85); g.lineTo(512, k * 85); g.stroke(); } });
    const qm = new THREE.MeshStandardMaterial({ map: quilt, roughness: 0.9 });
    R.add(M(rb(bw + 0.04, 0.04, bl - 0.55, 0.02), qm, [bx, BED.top - 0.01, bz + 0.3])); R.add(M(new THREE.PlaneGeometry(bw + 0.04, 0.26), qm, [bx, BED.top - 0.14, BED.z1 + 0.025]));
    for (const x of [bx - 0.33, bx + 0.33]) R.add(M(rb(0.55, 0.13, 0.34, 0.06), mat("#ffffff", { roughness: 0.9 }), [x, 0.56, 0.32], [0.25, 0, 0]));
    R.add(cyl(0.09, 0.09, 0.95, mat("#8fd3c7", { roughness: 0.9 }), [BED.x1 - 0.18, 0.6, 0.95], [Math.PI / 2, 0, 0]));
    this.guci.group.position.set(...GUCI_AT); R.add(this.guci.group);
    // the coin rig (glows out of the guci, or in your hand)
    this.coin = new CoinRig(R); this.coin.coin.visible = false;
    // the desk (faces into the room), office chair behind it, laptop, lamp, mug, books, a cactus
    const dm = mat("#f4f1ea", { roughness: 0.5 }), top = std(woodPlanks("#c8925e", 4, "desk"), [1, 1], { roughness: 0.4 });
    R.add(B(1.4, 0.04, 0.62, top, [-1.3, 0.73, 1.3])); R.add(B(1.4, 0.6, 0.03, dm, [-1.3, 0.42, 1.6])); for (const x of [-1.98, -0.62]) R.add(B(0.04, 0.71, 0.6, dm, [x, 0.355, 1.3]));
    this.laptop.group.position.set(...LAPTOP_AT); this.laptop.group.rotation.y = Math.PI; R.add(this.laptop.group); this.laptop.open(1);
    const lampG = new THREE.Group(); lampG.position.set(-1.85, 0.75, 1.42); lampG.add(cyl(0.07, 0.08, 0.02, mat("#2b2b2b"), [0, 0.01, 0])); lampG.add(cyl(0.008, 0.008, 0.4, mat("#2b2b2b"), [0.05, 0.2, 0], [0, 0, -0.25]));
    lampG.add(cyl(0.03, 0.085, 0.11, mat("#ff6b6b", { roughness: 0.4, side: THREE.DoubleSide }), [0.13, 0.38, -0.02], [0, 0, 0.8])); this.deskLamp.position.set(-1.65, 1.05, 1.45); R.add(lampG, this.deskLamp);
    R.add(cyl(0.04, 0.036, 0.09, mat("#ffd166", { roughness: 0.4 }), [-0.78, 0.8, 1.45])); books(R, -0.95, 0.75, 1.15, 0); const st = new THREE.Group(); R.add(st);
    for (let i = 0; i < 3; i++) R.add(B(0.24, 0.035, 0.17, mat(["#3a7bd5", "#f07a3c", "#3fa66a"][i]), [-0.82, 0.77 + i * 0.036, 1.18], [0, 0.2 * i, 0]));
    R.add(cyl(0.035, 0.03, 0.06, mat("#e8e1d4"), [-1.78, 0.78, 1.15])); R.add(M(new THREE.CapsuleGeometry(0.022, 0.06, 4, 8), mat("#4f9a4a"), [-1.78, 0.85, 1.15]));
    const chair = new THREE.Group(); chair.position.set(-1.3, 0, 0.58); chair.add(M(rb(0.5, 0.08, 0.46, 0.03), mat("#2bb3b1", { roughness: 0.7 }), [0, 0.46, 0])); chair.add(M(rb(0.48, 0.6, 0.07, 0.03), mat("#2bb3b1", { roughness: 0.7 }), [0, 0.86, -0.22], [-0.08, 0, 0]));
    chair.add(cyl(0.025, 0.025, 0.38, mat("#333", { metalness: 0.7 }), [0, 0.24, 0])); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; chair.add(B(0.28, 0.025, 0.035, mat("#333"), [Math.cos(a) * 0.13, 0.04, Math.sin(a) * 0.13], [0, -a, 0])); } R.add(chair);
    // walls: shelf with books on the left wall, a wardrobe, a framed abstract poster, fairy lights, a purple LED strip, AC, door, rug, ceiling lamp
    R.add(B(0.24, 0.03, 1.1, mat("#f4f1ea"), [-2.18, 1.55, 1.3])); seedRnd(5); books(R, 0.8, 1.565, -2.16, 22, "z");
    R.add(B(0.6, 2.1, 1.2, mat("#f4f1ea", { roughness: 0.5 }), [-2.0, 1.05, 3.2])); R.add(B(0.02, 2.0, 0.01, mat("#c8c2b6"), [-1.69, 1.05, 3.2], [0, Math.PI / 2, 0])); for (const z of [3.05, 3.35]) R.add(cyl(0.012, 0.012, 0.18, mat("#c9a46a", { metalness: 0.8 }), [-1.69, 1.1, z]));
    const poster = canvasTex(256, 340, (g) => { g.fillStyle = "#fff4e6"; g.fillRect(0, 0, 256, 340); g.fillStyle = "#ff6b6b"; g.beginPath(); g.arc(90, 120, 70, 0, Math.PI * 2); g.fill(); g.fillStyle = "#4ecdc4"; g.fillRect(120, 150, 110, 140); g.fillStyle = "#ffd166"; g.beginPath(); g.moveTo(30, 300); g.lineTo(130, 190); g.lineTo(200, 300); g.fill(); g.fillStyle = "#2b2d42"; g.beginPath(); g.arc(190, 80, 22, 0, Math.PI * 2); g.fill(); });
    R.add(B(0.62, 0.8, 0.03, mat("#2b2d42"), [-0.1, 1.62, 0.015])); R.add(M(new THREE.PlaneGeometry(0.56, 0.74), new THREE.MeshStandardMaterial({ map: poster, roughness: 0.6 }), [-0.1, 1.62, 0.032]));
    this.bulbs = fairy(R, V(-2.25, 2.5, 0.02), V(2.25, 2.5, 0.02), 26, 0.14, night ? 1 : 0.15);
    R.add(B(4.5, 0.02, 0.03, new THREE.MeshBasicMaterial({ color: night ? "#c070ff" : "#8a6aa8", toneMapped: false }), [0, 2.77, 0.03]));
    const ac = new THREE.Group(); ac.position.set(2.18, 2.35, 1.2); ac.rotation.y = -Math.PI / 2; ac.add(M(rb(0.85, 0.28, 0.2, 0.05), mat("#fbfbfb", { roughness: 0.4 }), [0, 0, 0])); ac.add(B(0.75, 0.02, 0.02, mat("#d5d8dc"), [0, -0.1, 0.1])); R.add(ac);
    R.add(B(0.06, 2.1, 0.85, std(woodPlanks("#8a5a3a", 3, "door"), [1, 1]), [2.27, 1.05, 3.18])); R.add(cyl(0.012, 0.012, 0.1, mat("#d9c08a", { metalness: 0.9 }), [2.2, 1.0, 2.85], [0, 0, Math.PI / 2]));
    const rug = canvasTex(256, 256, (g) => { const cs = ["#ff8f70", "#ffd166", "#4ecdc4", "#7b8cde", "#f78fb3"]; for (let i = 0; i < 6; i++) { g.fillStyle = cs[i % 5]; g.beginPath(); g.arc(128, 128, 126 - i * 20, 0, Math.PI * 2); g.fill(); } });
    const rg = M(new THREE.CircleGeometry(0.95, 48), new THREE.MeshStandardMaterial({ map: rug, roughness: 0.95, transparent: true }), [0.05, 0.006, 2.85], [-Math.PI / 2, 0, 0]); rg.castShadow = false; R.add(rg);
    R.add(cyl(0.22, 0.22, 0.05, new THREE.MeshStandardMaterial({ color: "#fff", emissive: "#fff3dc", emissiveIntensity: mode === "day" ? 0.8 : 0.1 }), [0, 2.77, 2.3]));
    plant(R, [-2.0, 0, 2.1], 1.3, "#4ecdc4"); plant(R, [2.0, 0, 2.3], 1.0, "#ff6b6b");
    // the front of the room (seen only over the laptop): a mint wall, a TV on a yellow cabinet, framed pictures, a shelf with
    // books and toys, a floor lamp, a beanbag, a skateboard leaning on the wall
    { const F = this.front; F.visible = false; R.add(F);
      F.add(B(4.6, 2.8, 0.06, mat("#8fd3c7", { roughness: 0.85 }), [0, 1.4, 4.5])); F.add(B(4.6, 0.08, 0.02, mat("#f4f1ea"), [0, 0.04, 4.46]));
      const cab = mat("#ffd166", { roughness: 0.45 }); F.add(M(rb(1.3, 0.42, 0.38, 0.03), cab, [-1.15, 0.25, 4.26]));
      for (const x of [-1.47, -0.83]) { F.add(B(0.6, 0.008, 0.005, mat("#d9a92e"), [x, 0.3, 4.068])); F.add(cyl(0.012, 0.012, 0.02, mat("#c9a46a", { metalness: 0.9 }), [x, 0.36, 4.06], [Math.PI / 2, 0, 0])); }
      for (const x of [-1.72, -0.58]) F.add(cyl(0.02, 0.015, 0.05, mat("#8a5a3a"), [x, 0.025, 4.26]));
      const tvTex = canvasTex(512, 288, (g) => { const gr = g.createLinearGradient(0, 0, 0, 288); gr.addColorStop(0, "#5ec8ff"); gr.addColorStop(1, "#c9f0ff"); g.fillStyle = gr; g.fillRect(0, 0, 512, 288);
        g.fillStyle = "#ffd23f"; g.beginPath(); g.arc(400, 70, 38, 0, Math.PI * 2); g.fill(); g.fillStyle = "#7bd389"; g.beginPath(); g.ellipse(120, 300, 220, 110, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#48b46a"; g.beginPath(); g.ellipse(390, 310, 230, 100, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#ff6b9a"; g.beginPath(); g.arc(250, 170, 34, 0, Math.PI * 2); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(240, 160, 9, 0, Math.PI * 2); g.arc(262, 160, 9, 0, Math.PI * 2); g.fill(); g.fillStyle = "#222"; g.beginPath(); g.arc(242, 161, 4, 0, Math.PI * 2); g.arc(264, 161, 4, 0, Math.PI * 2); g.fill(); });
      F.add(M(rb(1.0, 0.6, 0.05, 0.015), mat("#1d1f24", { roughness: 0.3 }), [-1.15, 0.8, 4.34])); F.add(B(0.25, 0.04, 0.14, mat("#1d1f24"), [-1.15, 0.48, 4.34])); F.add(B(0.05, 0.08, 0.04, mat("#1d1f24"), [-1.15, 0.5, 4.36]));
      F.add(M(new THREE.PlaneGeometry(0.94, 0.54), new THREE.MeshBasicMaterial({ map: tvTex, toneMapped: false, color: "#d8d8d8" }), [-1.15, 0.8, 4.312], [0, Math.PI, 0]));
      F.add(M(rb(0.22, 0.05, 0.16, 0.02), mat("#f4f1ea", { roughness: 0.3 }), [-1.65, 0.485, 4.24])); F.add(cyl(0.035, 0.035, 0.02, mat("#4ecdc4"), [-1.65, 0.52, 4.2]));
      plant(F, [-0.66, 0.46, 4.27], 0.55, "#7b8cde");
      const pics: [number, string, string][] = [[-1.72, "#ff8f70", "#ffd166"], [-1.15, "#4ecdc4", "#f78fb3"], [-0.6, "#7b8cde", "#9be15d"]];
      pics.forEach(([x, c1, c2], i) => { const tx = canvasTex(160, 120, (g) => { g.fillStyle = "#fffaf0"; g.fillRect(0, 0, 160, 120); g.fillStyle = c1; g.beginPath(); g.arc(50 + i * 20, 60, 34, 0, Math.PI * 2); g.fill(); g.fillStyle = c2; g.fillRect(80, 30 + i * 8, 56, 60); });
        F.add(B(0.4, 0.3, 0.025, mat(i % 2 ? "#2b2d42" : "#c9a46a", { roughness: 0.5 }), [x, 1.42, 4.45])); F.add(M(new THREE.PlaneGeometry(0.34, 0.24), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.6 }), [x, 1.42, 4.436], [0, Math.PI, 0])); });
      F.add(B(1.5, 0.03, 0.2, mat("#f4f1ea", { roughness: 0.5 }), [-1.15, 1.18, 4.37])); seedRnd(9); books(F, -1.85, 1.195, 4.37, 9);
      F.add(M(new THREE.SphereGeometry(0.06, 16, 12), mat("#ff6b6b", { roughness: 0.3 }), [-0.75, 1.255, 4.36])); F.add(M(new THREE.SphereGeometry(0.04, 16, 12), mat("#fff"), [-0.75, 1.33, 4.36]));
      F.add(M(new THREE.ConeGeometry(0.05, 0.12, 16), mat("#ffd166", { roughness: 0.4 }), [-0.55, 1.255, 4.36]));
      const lamp = new THREE.Group(); lamp.position.set(-0.3, 0, 4.25); lamp.add(cyl(0.12, 0.13, 0.03, mat("#2b2b2b"), [0, 0.015, 0])); lamp.add(cyl(0.012, 0.012, 1.45, mat("#2b2b2b", { metalness: 0.6 }), [0, 0.74, 0]));
      lamp.add(cyl(0.12, 0.2, 0.25, new THREE.MeshStandardMaterial({ color: "#ff9ec4", emissive: "#ff9ec4", emissiveIntensity: 0.35, roughness: 0.7, side: THREE.DoubleSide }), [0, 1.52, 0]));
      const ll = new THREE.PointLight("#ffd0a8", 1.2, 2.5, 2); ll.position.set(0, 1.4, -0.1); lamp.add(ll); F.add(lamp);
      const bean = M(new THREE.SphereGeometry(0.4, 28, 18), mat("#ff6b6b", { roughness: 0.85 }), [-0.75, 0.22, 3.75]); bean.scale.set(1, 0.6, 1); F.add(bean);
      const sk = new THREE.Group(); sk.position.set(-1.98, 0.4, 4.42); sk.rotation.set(-0.12, 0, 0.08); sk.add(M(rb(0.2, 0.78, 0.02, 0.01), mat("#7b2cbf", { roughness: 0.5 }), [0, 0, 0])); for (const y of [-0.27, 0.27]) for (const x of [-0.07, 0.07]) sk.add(cyl(0.025, 0.025, 0.03, mat("#ffd166"), [x, y, -0.03], [Math.PI / 2, 0, 0])); F.add(sk); }
    // lights
    this.key = new THREE.DirectionalLight(night ? "#93b4ff" : mode === "morning" ? "#ffd59a" : "#fff0d6", night ? 1.6 : mode === "morning" ? 4.6 : 3.0);
    this.key.position.set(-2.4, 3.9, -5.5); this.key.target.position.set(-0.2, 0.4, 2.0); this.key.castShadow = true; this.key.shadow.mapSize.set(2048, 2048);
    Object.assign(this.key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 20 }); this.key.shadow.bias = -0.0004; this.key.shadow.normalBias = 0.03; this.key.shadow.radius = 3;
    this.hemi = new THREE.HemisphereLight(night ? "#4b5cb8" : "#cfe0ff", night ? "#3a2440" : "#c8946a", night ? 0.45 : mode === "morning" ? 1.0 : 1.1);
    R.add(this.key, this.key.target, this.hemi);
    const fill = new THREE.PointLight(night ? "#ff9a5a" : "#ffe2bd", night ? 0.9 : 1.6, 7, 1.4); fill.position.set(0.2, 2.3, 3.6); R.add(fill);
    if (night) { const led = new THREE.PointLight("#b45cff", 1.6, 4.5, 1.6); led.position.set(0.8, 2.5, 0.6); R.add(led); const led2 = new THREE.PointLight("#ff7ac8", 0.9, 3.5, 1.6); led2.position.set(-1.6, 2.4, 0.8); R.add(led2); }
    this.sunDir.copy(this.key.position).sub(this.key.target.position).normalize();
  }
  update(t: number) { if (this.mode === "night") this.bulbs.forEach((b, i) => { const k = 0.75 + 0.25 * Math.sin(t * 2.2 + i * 1.7); (b.material as THREE.MeshBasicMaterial).color.setHSL(((i % 5) * 0.2 + 0.02) % 1, 0.9, 0.45 + 0.2 * k); }); }
}

// ======================================================================================================
// a busy mall cafe: polished terrazzo floor that reflects the lamps, rattan pendants, a pink neon ring, plants, shops beyond
export const TABLE = { x: 0, z: 1.45, top: 0.74, r: 0.42 };
export const BUYER_AT: V3 = [-0.36, 0.48, 1.08]; export const YOU_AT: V3 = [0.38, 0.48, 1.08];
export class KafeSet {
  root = new THREE.Group(); sunDir = new THREE.Vector3(); key: THREE.DirectionalLight; pend: THREE.Group[] = []; extra = new THREE.Group(); coin: CoinRig; pouch: THREE.Group;
  constructor() {
    seedRnd(41); const R = this.root; R.add(this.extra);
    const terr = canvasTex(512, 512, (g) => { g.fillStyle = "#efe7dc"; g.fillRect(0, 0, 512, 512); const cs = ["#d98c6a", "#8fa7c4", "#b9b0a2", "#e8c27a", "#6f8a7a"]; for (let i = 0; i < 1600; i++) { g.fillStyle = cs[i % 5]; g.globalAlpha = 0.5 + rnd() * 0.4; g.beginPath(); g.ellipse(rnd() * 512, rnd() * 512, 2 + rnd() * 6, 1.5 + rnd() * 4, rnd() * 3, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1; g.fillStyle = "#c9bfb2"; g.fillRect(0, 0, 512, 3); g.fillRect(0, 0, 3, 512); });
    terr.wrapS = terr.wrapT = THREE.RepeatWrapping; terr.repeat.set(8, 8);
    const fl = M(new THREE.PlaneGeometry(22, 22), new THREE.MeshPhysicalMaterial({ map: terr, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 }), [0, 0, 0], [-Math.PI / 2, 0, 0]); fl.castShadow = false; R.add(fl);
    // the mall beyond: two floors of shopfronts in bright colours (logos are shapes, no words), a glass balustrade, an escalator, a skylight
    const shop = (x: number, y: number, w: number, col: string, inner: string, sh: number) => { const G = new THREE.Group(); G.position.set(x, y, -5.2);
      G.add(B(w, 3.2, 0.3, mat("#f6f2ea", { roughness: 0.6 }), [0, 1.6, -0.15])); G.add(B(w - 0.3, 0.55, 0.1, mat(col, { roughness: 0.4 }), [0, 2.8, 0.05]));
      const logo = new THREE.Mesh(sh % 3 === 0 ? new THREE.CircleGeometry(0.2, 24) : sh % 3 === 1 ? new THREE.CircleGeometry(0.22, 3) : new THREE.PlaneGeometry(0.35, 0.3), new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false })); logo.position.set(0, 2.8, 0.11); G.add(logo);
      G.add(B(w - 0.3, 2.3, 0.04, new THREE.MeshStandardMaterial({ color: inner, emissive: inner, emissiveIntensity: 0.55, roughness: 0.5 }), [0, 1.2, -0.12]));
      for (let k = 0; k < 4; k++) G.add(B(0.25 + rnd() * 0.2, 0.3 + rnd() * 0.6, 0.25, mat(["#ff6b6b", "#ffd166", "#4ecdc4", "#7b8cde", "#ffffff"][(k + sh) % 5], { roughness: 0.5 }), [-w / 2 + 0.5 + k * (w - 1) / 3, 0.3 + rnd() * 0.3, 0.1]));
      G.add(M(new THREE.PlaneGeometry(w - 0.3, 2.3), new THREE.MeshPhysicalMaterial({ color: "#e6f6ff", roughness: 0.02, transparent: true, opacity: 0.18, metalness: 0.1 }), [0, 1.2, 0.03])); R.add(G); };
    [["#ff5d73", "#ffe3e8"], ["#2ec4b6", "#dffaf6"], ["#ffb703", "#fff2d1"], ["#5a67d8", "#e3e6ff"], ["#8ac926", "#ecffd6"]].forEach(([c, i], k) => shop(-6.4 + k * 3.2, 0, 3.1, c, i, k));
    [["#9b5de5", "#efe3ff"], ["#f15bb5", "#ffe3f4"], ["#00bbf9", "#dff6ff"], ["#fb8500", "#ffeedb"], ["#06d6a0", "#dbfff4"]].forEach(([c, i], k) => shop(-6.4 + k * 3.2, 4.0, 3.1, c, i, k + 2));
    R.add(B(16, 0.35, 2.2, mat("#f6f2ea"), [0, 4.0, -3.9])); R.add(M(new THREE.PlaneGeometry(16, 1.0), new THREE.MeshPhysicalMaterial({ color: "#cfefff", transparent: true, opacity: 0.25, roughness: 0.05 }), [0, 4.7, -2.8])); R.add(B(16, 0.05, 0.08, mat("#c9ccd0", { metalness: 0.9, roughness: 0.2 }), [0, 5.22, -2.8]));
    const esc = new THREE.Group(); esc.position.set(4.6, 0, -2.2); esc.rotation.y = -0.25; esc.add(B(1.1, 0.25, 5.6, mat("#c9ccd0", { metalness: 0.8, roughness: 0.3 }), [0, 2.0, 0], [0.78, 0, 0])); for (const x of [-0.55, 0.55]) esc.add(M(new THREE.PlaneGeometry(5.6, 0.9), new THREE.MeshPhysicalMaterial({ color: "#d8f3ff", transparent: true, opacity: 0.3, roughness: 0.05, side: THREE.DoubleSide }), [x, 2.6, 0], [0.78 - Math.PI / 2, Math.PI / 2, 0])); R.add(esc);
    const sky = M(new THREE.PlaneGeometry(16, 10), new THREE.MeshBasicMaterial({ color: "#eaf6ff", toneMapped: false, fog: false }), [0, 8.5, 0], [Math.PI / 2, 0, 0]); sky.castShadow = false; R.add(sky);
    R.add(M(new THREE.PlaneGeometry(22, 14), mat("#efe7dc"), [0, 7, -8])); for (const x of [-7.5, 7.5]) R.add(M(new THREE.PlaneGeometry(14, 14), mat("#efe7dc"), [x, 7, 0], [0, -Math.sign(x) * Math.PI / 2, 0]));
    // the cafe: wooden planter partition with plants, a counter with a pastry case, pink neon ring on a teal pillar, pendants
    R.add(B(7.5, 0.55, 0.35, std(woodPlanks("#b07a4a", 6, "cafe"), [3, 1], { roughness: 0.5 }), [0, 0.275, -1.3])); for (let i = 0; i < 14; i++) plant(R, [-3.5 + i * 0.54, 0.55, -1.3], 0.7, "#b07a4a");
    R.add(B(2.2, 1.0, 0.6, mat("#2ec4b6", { roughness: 0.4 }), [-2.6, 0.5, -0.5])); R.add(B(2.24, 0.05, 0.64, mat("#f6f2ea", { roughness: 0.2 }), [-2.6, 1.02, -0.5]));
    R.add(M(new THREE.PlaneGeometry(0.9, 0.35), new THREE.MeshPhysicalMaterial({ color: "#eaf8ff", transparent: true, opacity: 0.25, roughness: 0.02 }), [-2.3, 1.22, -0.2])); for (let i = 0; i < 6; i++) R.add(M(new THREE.TorusGeometry(0.04, 0.02, 8, 16), mat(["#e8a24a", "#c86a3a", "#f2d08a"][i % 3], { roughness: 0.6 }), [-2.65 + i * 0.12, 1.08, -0.45], [Math.PI / 2, 0, 0]));
    R.add(cyl(0.3, 0.3, 4, mat("#118ab2", { roughness: 0.4 }), [2.9, 2, -0.4])); const neon = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.018, 10, 40), new THREE.MeshBasicMaterial({ color: "#ff5fa8", toneMapped: false })); neon.position.set(2.9, 1.9, -0.08); R.add(neon);
    const neon2 = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 8, 24, Math.PI), new THREE.MeshBasicMaterial({ color: "#ffd166", toneMapped: false })); neon2.position.set(2.9, 2.32, -0.08); neon2.rotation.z = Math.PI; R.add(neon2);
    const np = new THREE.PointLight("#ff5fa8", 1.6, 3.2, 1.5); np.position.set(2.7, 1.9, 0.3); R.add(np);
    // tables: ours (a solid drum table, so seated legs never show), three more with extras later
    const wood = std(woodPlanks("#c8925e", 5, "tbl"), [1, 1], { roughness: 0.35 });
    const table = (x: number, z: number) => { R.add(cyl(TABLE.r, TABLE.r, 0.04, wood, [x, TABLE.top - 0.02, z], [0, 0, 0], 40)); R.add(cyl(TABLE.r - 0.06, TABLE.r - 0.02, TABLE.top - 0.04, mat("#f6f2ea", { roughness: 0.5 }), [x, (TABLE.top - 0.04) / 2, z], [0, 0, 0], 40)); };
    const chair = (x: number, z: number, col: string) => { R.add(M(rb(0.42, 0.06, 0.4, 0.02), mat(col, { roughness: 0.6 }), [x, 0.46, z])); R.add(M(rb(0.4, 0.42, 0.05, 0.02), mat(col, { roughness: 0.6 }), [x, 0.74, z - 0.2], [-0.12, 0, 0])); };
    for (const [x, z] of [[TABLE.x, TABLE.z], [-2.1, 0.75], [2.0, 0.8], [-1.6, 3.4], [1.9, 3.3]] as [number, number][]) table(x, z);
    chair(BUYER_AT[0], BUYER_AT[2] - 0.08, "#ff8f70"); chair(YOU_AT[0], YOU_AT[2] - 0.08, "#ffd166"); for (const [x, z, c] of [[-2.45, 0.45, "#4ecdc4"], [-1.75, 0.45, "#7b8cde"], [2.0, 0.48, "#f78fb3"]] as [number, number, string][]) chair(x, z, c);
    // on our table: two iced drinks, a small velvet pouch with the coin
    const drink = (x: number, z: number, c: string) => { const G = new THREE.Group(); G.position.set(x, TABLE.top, z); G.add(cyl(0.035, 0.03, 0.13, new THREE.MeshPhysicalMaterial({ color: "#f2fbff", roughness: 0.04, transparent: true, opacity: 0.35 }), [0, 0.065, 0])); G.add(cyl(0.032, 0.028, 0.1, mat(c, { roughness: 0.25 }), [0, 0.05, 0])); G.add(cyl(0.004, 0.004, 0.2, mat("#ff5fa8"), [0.01, 0.13, 0], [0, 0, 0.15])); R.add(G); };
    drink(-0.2, 1.55, "#c98a5a"); drink(0.24, 1.6, "#7ad7a8");
    this.pouch = new THREE.Group(); this.pouch.position.set(0.0, TABLE.top, 1.6); this.pouch.add(M(new THREE.SphereGeometry(0.05, 16, 12), mat("#7a1f4a", { roughness: 0.95 }), [0, 0.03, 0])); this.pouch.children[0].scale.set(1, 0.6, 1); this.pouch.add(cyl(0.018, 0.03, 0.03, mat("#7a1f4a", { roughness: 0.95 }), [0, 0.065, 0])); R.add(this.pouch);
    this.coin = new CoinRig(R); this.coin.coin.visible = false;
    // rattan pendants with warm bulbs + small lights (they sway a little)
    for (const [x, z] of [[0, 1.45], [-2.1, 0.75], [2.0, 0.8], [-1.0, -0.4], [1.2, -0.5]] as [number, number][]) { const P = new THREE.Group(); P.position.set(x, 3.4, z); P.add(cyl(0.004, 0.004, 1.3, mat("#222"), [0, -0.65, 0])); const sh = M(new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#d8a35e", roughness: 0.9, side: THREE.DoubleSide, emissive: "#a8641e", emissiveIntensity: 0.4 }), [0, -1.4, 0]); P.add(sh);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), new THREE.MeshBasicMaterial({ color: "#fff0c8", toneMapped: false })); bulb.position.y = -1.45; P.add(bulb); const l = new THREE.PointLight("#ffc27a", 1.3, 3.2, 1.6); l.position.y = -1.55; P.add(l); R.add(P); this.pend.push(P); }
    this.key = new THREE.DirectionalLight("#fff6e8", 2.4); this.key.position.set(-3, 9, 4); this.key.target.position.set(0, 0.5, 1); this.key.castShadow = true; this.key.shadow.mapSize.set(2048, 2048);
    Object.assign(this.key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 25 }); this.key.shadow.bias = -0.0004; this.key.shadow.normalBias = 0.03; this.key.shadow.radius = 4;
    R.add(this.key, this.key.target, new THREE.HemisphereLight("#fff3e6", "#d9b89a", 1.25)); const front = new THREE.PointLight("#ffe7cf", 1.2, 9, 1.2); front.position.set(0.5, 2.6, 4.5); R.add(front);
    this.sunDir.copy(this.key.position).sub(this.key.target.position).normalize();
  }
  update(t: number) { this.pend.forEach((p, i) => { p.rotation.z = 0.02 * Math.sin(t * 1.1 + i); p.rotation.x = 0.015 * Math.sin(t * 0.9 + i * 2); }); }
}

// ======================================================================================================
// the interrogation room: teal lower walls, mustard upper, a high barred window throwing bar shadows, a swinging lamp
export const INT_SEAT: V3 = [0.0, 0.48, 0.85]; export const INT_TABLE = { x: 0, z: 1.25, top: 0.76 };
export class InterogasiSet {
  root = new THREE.Group(); sunDir = new THREE.Vector3(); key: THREE.DirectionalLight; lamp = new THREE.Group(); spot: THREE.SpotLight; calTex: THREE.CanvasTexture; calCtx: CanvasRenderingContext2D; clock = new Clock(0.17, "#2b2d42"); cuffs = handcuffs(); extra = new THREE.Group();
  constructor() {
    seedRnd(51); const R = this.root; R.add(this.extra);
    const two = (lo: string, hi: string) => { const t = canvasTex(64, 256, (g) => { g.fillStyle = hi; g.fillRect(0, 0, 64, 256); g.fillStyle = lo; g.fillRect(0, 150, 64, 106); g.fillStyle = "#e8e0c8"; g.fillRect(0, 146, 64, 6); for (let i = 0; i < 80; i++) { g.fillStyle = `rgba(0,0,0,${0.02 + rnd() * 0.03})`; g.fillRect(rnd() * 64, rnd() * 256, 3 + rnd() * 8, 2 + rnd() * 10); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.5, 1 / 2.7); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }); };
    const tile = canvasTex(256, 256, (g) => { for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { g.fillStyle = (r + c) % 2 ? "#3c5a5c" : "#c9c1a6"; g.fillRect(c * 64, r * 64, 64, 64); } }); tile.wrapS = tile.wrapT = THREE.RepeatWrapping; tile.repeat.set(4, 4);
    shell(R, { w: 3.8, d: 4.0, h: 2.7, back: two("#2f7a80", "#e2b85a"), left: two("#2f7a80", "#e2b85a"), right: two("#2f7a80", "#e2b85a"), floor: new THREE.MeshStandardMaterial({ map: tile, roughness: 0.35, metalness: 0.05 }), ceil: "#d8d2c2", holesL: [[0.55, 1.75, 1.75, 2.4]] });
    // the barred window (left wall) + a bright sky behind it
    for (let i = 0; i < 6; i++) R.add(cyl(0.014, 0.014, 0.66, mat("#2a2a2a", { metalness: 0.7, roughness: 0.4 }), [-1.95, 2.075, 0.65 + i * 0.19]));
    R.add(B(0.06, 0.05, 1.3, mat("#2a2a2a", { metalness: 0.7 }), [-1.95, 2.0, 1.15]));
    R.add(view((g) => { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#ffb06a"); gr.addColorStop(1, "#ffe2b0"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512); }, 4, 2, [-3.2, 2.1, 1.15], Math.PI / 2));
    // a one-way mirror on the right wall, a calendar and a clock on the back wall
    R.add(B(0.05, 0.95, 1.7, mat("#2b2d42"), [1.87, 1.55, 1.8])); R.add(M(new THREE.PlaneGeometry(1.6, 0.85), new THREE.MeshStandardMaterial({ color: "#1a2430", metalness: 1, roughness: 0.06 }), [1.84, 1.55, 1.8], [0, -Math.PI / 2, 0]));
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 320; this.calCtx = cv.getContext("2d")!; this.calTex = new THREE.CanvasTexture(cv); this.calTex.colorSpace = THREE.SRGBColorSpace; this.drawCal(0);
    R.add(M(new THREE.PlaneGeometry(0.46, 0.58), new THREE.MeshStandardMaterial({ map: this.calTex, roughness: 0.8 }), [1.05, 1.5, 0.01])); R.add(cyl(0.006, 0.006, 0.02, mat("#333"), [1.05, 1.82, 0.02], [Math.PI / 2, 0, 0]));
    this.clock.group.position.set(-0.85, 2.05, 0.03); this.clock.set(4.6); R.add(this.clock.group);
    // the table, two chairs, a folder, a paper cup, the handcuffs on the table
    const steel = mat("#a8b0b8", { metalness: 0.8, roughness: 0.32 });
    R.add(B(1.3, 0.04, 0.75, steel, [INT_TABLE.x, INT_TABLE.top - 0.02, INT_TABLE.z])); R.add(B(1.26, 0.66, 0.03, mat("#6c7a86", { metalness: 0.6, roughness: 0.4 }), [INT_TABLE.x, 0.4, INT_TABLE.z + 0.36])); for (const x of [-0.62, 0.62]) R.add(B(0.04, 0.74, 0.7, steel, [x, 0.37, INT_TABLE.z]));
    R.add(B(0.45, 0.05, 0.42, mat("#4a5560"), [0, 0.46, 0.66])); R.add(B(0.43, 0.5, 0.04, mat("#4a5560"), [0, 0.76, 0.44]));
    R.add(B(0.3, 0.015, 0.22, mat("#e8a23a", { roughness: 0.7 }), [-0.36, INT_TABLE.top + 0.008, 1.2], [0, 0.2, 0])); R.add(cyl(0.035, 0.028, 0.09, mat("#f4f1ea"), [0.45, INT_TABLE.top + 0.045, 1.15]));
    this.cuffs.position.set(0.02, INT_TABLE.top + 0.01, 1.05); this.cuffs.rotation.x = -Math.PI / 2; R.add(this.cuffs);
    // the hanging lamp: a green enamel shade on a long cord (it swings), spotlight down onto the table
    this.lamp.position.set(0, 2.7, 1.2); this.lamp.add(cyl(0.004, 0.004, 0.9, mat("#222"), [0, -0.45, 0])); this.lamp.add(M(new THREE.ConeGeometry(0.2, 0.16, 24, 1, true), new THREE.MeshStandardMaterial({ color: "#2f8a5a", roughness: 0.4, side: THREE.DoubleSide, emissive: "#103020", emissiveIntensity: 0.3 }), [0, -0.98, 0]));
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({ color: "#fff1c6", toneMapped: false })); bulb.position.y = -1.04; this.lamp.add(bulb);
    this.spot = new THREE.SpotLight("#ffe2a8", 10, 4, 0.75, 0.5, 1.6); this.spot.position.set(0, -1.05, 0); this.spot.castShadow = true; this.spot.shadow.mapSize.set(1024, 1024); this.spot.shadow.bias = -0.0005; this.lamp.add(this.spot); this.spot.target.position.set(0, -2.7, 0); this.lamp.add(this.spot.target); R.add(this.lamp);
    // the late-afternoon sun through the bars (the key light: bar shadows across the table, you and the right wall)
    this.key = new THREE.DirectionalLight("#ffb978", 6.5); this.key.position.set(-6.5, 5.0, 0.6); this.key.target.position.set(0.4, 0.8, 1.3); this.key.castShadow = true; this.key.shadow.mapSize.set(2048, 2048);
    Object.assign(this.key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 16 }); this.key.shadow.bias = -0.0004; this.key.shadow.normalBias = 0.02; this.key.shadow.radius = 2;
    R.add(this.key, this.key.target, new THREE.HemisphereLight("#7aa8c8", "#4a3a3a", 0.75)); const fill = new THREE.PointLight("#5aa0ff", 0.7, 6, 1.4); fill.position.set(1.4, 2.0, 3.2); R.add(fill);
    this.sunDir.copy(this.key.position).sub(this.key.target.position).normalize();
  }
  /** calendar: red header, a grid of day cells (no digits), the last cell circled in red marker (p 0..1) */
  drawCal(p: number) { const g = this.calCtx; g.fillStyle = "#fbf7ee"; g.fillRect(0, 0, 256, 320); g.fillStyle = "#d63a3a"; g.fillRect(0, 0, 256, 62); g.fillStyle = "#fff"; for (let i = 0; i < 2; i++) { g.beginPath(); g.arc(70 + i * 116, 10, 7, 0, Math.PI * 2); g.fill(); }
    for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) { const x = 12 + c * 33, y = 78 + r * 46; g.fillStyle = c === 0 ? "rgba(214,58,58,0.18)" : "rgba(40,40,60,0.08)"; g.fillRect(x, y, 29, 40); g.fillStyle = c === 0 ? "#d63a3a" : "#7a7a8a"; g.beginPath(); g.arc(x + 8, y + 9, 3.5, 0, Math.PI * 2); g.fill(); }
    if (p > 0) { const x = 12 + 1 * 33 + 14, y = 78 + 4 * 46 + 20; g.strokeStyle = "#e0201a"; g.lineWidth = 6; g.lineCap = "round"; g.beginPath(); g.ellipse(x, y, 24, 26, -0.3, -0.5, -0.5 + p * Math.PI * 2.15); g.stroke(); }
    this.calTex.needsUpdate = true; }
  update(t: number) { this.lamp.rotation.z = 0.06 * Math.sin(t * 1.3); this.lamp.rotation.x = 0.035 * Math.sin(t * 0.9 + 1); }
}

// ======================================================================================================
// the jewellery shop: red lacquer and gold, mirrors, glass counters with lit gold inside, red lanterns, marble floor
export const COUNTER = { z0: 0.95, z1: 1.45, top: 1.0 };
export const OWNER_AT: V3 = [-0.45, 0, 0.55]; export const CUST_AT: V3 = [0.62, 0, 1.95]; export const SCALE_AT: V3 = [0.12, 1.0, 1.2];
export class TokoSet {
  root = new THREE.Group(); sunDir = new THREE.Vector3(); key: THREE.DirectionalLight; scale = new GoldScale(); cash: THREE.Group[] = []; coin: CoinRig; lanterns: THREE.Group[] = []; extra = new THREE.Group();
  constructor() {
    seedRnd(61); const R = this.root; R.add(this.extra);
    const gold = new THREE.MeshStandardMaterial({ color: "#f2c14e", metalness: 0.95, roughness: 0.22, emissive: "#6a4006", emissiveIntensity: 0.3 });
    const marble = canvasTex(512, 512, (g) => { g.fillStyle = "#f5f1ea"; g.fillRect(0, 0, 512, 512); g.strokeStyle = "rgba(160,150,140,0.35)"; for (let i = 0; i < 26; i++) { g.lineWidth = 0.6 + rnd() * 2; g.beginPath(); let x = rnd() * 512, y = rnd() * 512; g.moveTo(x, y); for (let k = 0; k < 12; k++) { x += (rnd() - 0.4) * 60; y += (rnd() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); } g.fillStyle = "rgba(200,190,170,0.6)"; g.fillRect(0, 0, 512, 2); g.fillRect(0, 0, 2, 512); });
    marble.wrapS = marble.wrapT = THREE.RepeatWrapping; marble.repeat.set(4, 4);
    const red = (() => { const t = canvasTex(128, 256, (g) => { g.fillStyle = "#b51f2a"; g.fillRect(0, 0, 128, 256); g.fillStyle = "#e7b54a"; g.fillRect(0, 200, 128, 6); g.fillRect(0, 40, 128, 4); g.strokeStyle = "rgba(231,181,74,0.35)"; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(64, 120, 20 + i * 14, 0, Math.PI * 2); g.stroke(); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.2, 1 / 2.9); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }); })();
    shell(R, { w: 4.6, d: 4.6, h: 2.9, back: red, left: red, right: red, floor: new THREE.MeshPhysicalMaterial({ map: marble, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.06 }), ceil: "#fbf3e0", holesR: [[2.4, 0, 3.5, 2.4]] });
    // mirror panels with gold frames and glass shelves of jewellery on the back wall
    for (const x of [-1.5, 0, 1.5]) { R.add(B(1.2, 1.5, 0.04, gold, [x, 1.65, 0.02])); R.add(M(new THREE.PlaneGeometry(1.1, 1.4), new THREE.MeshStandardMaterial({ color: "#c9d6e0", metalness: 1, roughness: 0.05 }), [x, 1.65, 0.045]));
      for (let s = 0; s < 3; s++) { R.add(B(1.05, 0.015, 0.22, new THREE.MeshPhysicalMaterial({ color: "#eaf8ff", transparent: true, opacity: 0.4, roughness: 0.02 }), [x, 1.12 + s * 0.42, 0.14]));
        for (let k = 0; k < 5; k++) { const p: V3 = [x - 0.4 + k * 0.2, 1.17 + s * 0.42, 0.14]; if ((k + s) % 2) R.add(M(new THREE.TorusGeometry(0.045, 0.008, 10, 28), gold, p)); else { R.add(cyl(0.018, 0.04, 0.14, mat("#2a1418", { roughness: 0.9 }), [p[0], p[1] + 0.02, p[2]])); R.add(M(new THREE.TorusGeometry(0.04, 0.004, 8, 28, Math.PI), gold, [p[0], p[1] + 0.09, p[2] + 0.02], [0, 0, Math.PI])); } } } }
    // glass display counter (the owner stands behind it)
    const cx0 = -2.0, cx1 = 1.6, cw = cx1 - cx0, ccx = (cx0 + cx1) / 2, czc = (COUNTER.z0 + COUNTER.z1) / 2, cd = COUNTER.z1 - COUNTER.z0;
    R.add(B(cw, 0.55, cd, mat("#8e1520", { roughness: 0.35 }), [ccx, 0.275, czc])); R.add(B(cw + 0.02, 0.04, cd + 0.02, gold, [ccx, 0.57, czc])); R.add(B(cw + 0.02, 0.03, cd + 0.02, gold, [ccx, 0.02, czc]));
    const glass = new THREE.MeshPhysicalMaterial({ color: "#f0fbff", transparent: true, opacity: 0.16, roughness: 0.02, metalness: 0.1, depthWrite: false });
    R.add(M(new THREE.PlaneGeometry(cw, 0.42), glass, [ccx, 0.79, COUNTER.z1])); R.add(M(new THREE.PlaneGeometry(cw, cd), glass, [ccx, COUNTER.top, czc], [-Math.PI / 2, 0, 0])); for (const x of [cx0, cx1]) R.add(B(0.03, 0.45, cd, gold, [x, 0.79, czc]));
    R.add(B(cw - 0.05, 0.02, cd - 0.05, mat("#3a0d18", { roughness: 0.95 }), [ccx, 0.6, czc])); const strip = new THREE.Mesh(new THREE.BoxGeometry(cw - 0.1, 0.01, 0.02), new THREE.MeshBasicMaterial({ color: "#fff4d0", toneMapped: false })); strip.position.set(ccx, 0.98, COUNTER.z0 + 0.04); R.add(strip);
    for (let i = 0; i < 16; i++) { const x = cx0 + 0.2 + i * (cw - 0.4) / 15, z = czc + (i % 2 ? 0.08 : -0.08); if (i % 3 === 0) R.add(M(new THREE.TorusGeometry(0.05, 0.01, 10, 28), gold, [x, 0.65, z], [Math.PI / 2 - 0.4, 0, 0])); else if (i % 3 === 1) R.add(M(new THREE.TorusGeometry(0.02, 0.005, 8, 20), gold, [x, 0.63, z], [0.4, 0, 0])); else { for (let k = 0; k < 7; k++) R.add(M(new THREE.TorusGeometry(0.008, 0.002, 6, 10), gold, [x - 0.05 + k * 0.016, 0.615, z], [Math.PI / 2, k % 2 ? 0.8 : 0, 0])); } }
    for (let i = 0; i < 3; i++) { const l = new THREE.PointLight("#fff0c8", 0.8, 1.2, 2); l.position.set(cx0 + 0.6 + i * 1.2, 0.9, czc); R.add(l); }
    this.scale.group.position.set(...SCALE_AT); this.scale.group.rotation.y = -0.2; R.add(this.scale.group); this.scale.show("0.00");
    for (let i = 0; i < 2; i++) { const c = cashStack(14); c.position.set(-0.9 + i * 0.05, COUNTER.top + 0.001, 1.15 + i * 0.02); c.rotation.y = 0.3 + i * 0.4; R.add(c); this.cash.push(c); }
    this.coin = new CoinRig(R); this.coin.coin.visible = false;
    // red lanterns with gold caps and tassels, recessed ceiling spots, the glass door to the bright street
    for (const [x, z] of [[-1.6, 2.2], [0.1, 2.6], [1.5, 2.0]] as [number, number][]) { const L = new THREE.Group(); L.position.set(x, 2.9, z); L.add(cyl(0.004, 0.004, 0.5, mat("#222"), [0, -0.25, 0])); const s = M(new THREE.SphereGeometry(0.17, 20, 14), new THREE.MeshStandardMaterial({ color: "#e0262f", roughness: 0.5, emissive: "#ff3a2a", emissiveIntensity: 0.55 }), [0, -0.68, 0]); s.scale.y = 0.85; L.add(s);
      L.add(cyl(0.08, 0.08, 0.03, gold, [0, -0.53, 0])); L.add(cyl(0.08, 0.08, 0.03, gold, [0, -0.83, 0])); L.add(cyl(0.01, 0.025, 0.16, mat("#e7b54a"), [0, -0.93, 0])); const ll = new THREE.PointLight("#ff6a4a", 0.6, 1.8, 2); ll.position.y = -0.68; L.add(ll); R.add(L); this.lanterns.push(L); }
    for (let i = 0; i < 6; i++) R.add(M(new THREE.CircleGeometry(0.06, 20), new THREE.MeshBasicMaterial({ color: "#fff8e8", toneMapped: false }), [-1.6 + (i % 3) * 1.6, 2.89, 0.9 + Math.floor(i / 3) * 1.6], [Math.PI / 2, 0, 0]));
    R.add(view((g) => { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#9fd4ff"); gr.addColorStop(1, "#fff3d6"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512); g.fillStyle = "#e9a66b"; g.fillRect(100, 200, 300, 312); g.fillStyle = "#7fb3c9"; g.fillRect(520, 160, 360, 352); g.fillStyle = "#4f8a4a"; g.beginPath(); g.arc(470, 300, 90, 0, Math.PI * 2); g.fill(); g.fillStyle = "#8a8a8a"; g.fillRect(0, 440, 1024, 72); }, 4, 2.6, [3.6, 1.3, 2.95], -Math.PI / 2));
    R.add(B(0.05, 2.45, 0.05, gold, [2.3, 1.2, 2.4])); R.add(B(0.05, 2.45, 0.05, gold, [2.3, 1.2, 3.5])); R.add(M(new THREE.PlaneGeometry(1.1, 2.4), new THREE.MeshPhysicalMaterial({ color: "#e6f6ff", transparent: true, opacity: 0.15, roughness: 0.02 }), [2.3, 1.2, 2.95], [0, -Math.PI / 2, 0]));
    plant(R, [-2.05, 0, 2.6], 1.3, "#e7b54a");
    this.key = new THREE.DirectionalLight("#fff1d8", 2.4); this.key.position.set(2.5, 6, 6); this.key.target.position.set(0, 0.8, 1.2); this.key.castShadow = true; this.key.shadow.mapSize.set(2048, 2048);
    Object.assign(this.key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 }); this.key.shadow.bias = -0.0004; this.key.shadow.normalBias = 0.03; this.key.shadow.radius = 4;
    R.add(this.key, this.key.target, new THREE.HemisphereLight("#fff0e0", "#a83a2a", 1.1)); const warm = new THREE.PointLight("#ffd9a0", 1.5, 6, 1.4); warm.position.set(0, 2.5, 2.6); R.add(warm);
    this.sunDir.copy(this.key.position).sub(this.key.target.position).normalize();
  }
  update(t: number) { this.lanterns.forEach((l, i) => { l.rotation.z = 0.03 * Math.sin(t * 1.2 + i * 2); }); }
}
