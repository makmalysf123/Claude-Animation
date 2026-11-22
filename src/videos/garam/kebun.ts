// Sets for "Garam di Pohon Kelapa". Everything is 3D (downloaded models + textured ground); only the people are 2D cards.
// KebunSet: an inland coconut garden in hilly country on a hazy morning. Layout (metres):
//   garden      palms on a loose grid for z < 1; Pak Darman's palm (HERO) at the origin
//   footpath    along x at z = PATH_Z (dirt)
//   village rd  along x at z = ROAD_Z (worn asphalt), the warung and houses face it from z > 13
//   hills       rise beyond z < -45 and z > 32, dotted with palms and banana trees, fading into the haze
// Options: sick (0 = lush, 1 = chloride-poor yellow leaves), salt ring, the pickup, and `pit`: a dug pit in front of the
// HERO palm that shows the soil profile and the roots (the explanation shot).
import * as THREE from "three";
import { canvasTex } from "../ketindihan2/sets";
import { fbm, rnd, seedRnd, shaftTex } from "../../lib/world2/textures";
import { NOINK } from "../bridge/ink";
import { mat, M } from "../emas/props";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mdl, recolor, sickLeaves, setHealth, crownWorld } from "./models";

export type V3 = [number, number, number];
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const B = (w: number, h: number, d: number, m: THREE.Material | THREE.Material[], p: V3, r: V3 = [0, 0, 0]) => M(new THREE.BoxGeometry(w, h, d), m, p, r);
const sstep = (a: number, b: number, x: number) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const n2 = (x: number, z: number) => 0.5 + 0.25 * Math.sin(x * 0.061 + z * 0.023) + 0.15 * Math.sin(x * 0.17 - z * 0.11 + 1.3) + 0.1 * Math.sin(x * 0.37 + z * 0.29 + 2.1);
export const PATH_Z = 3.4, ROAD_Z = 9.6, HERO = V(0, 0, 0), RING_R = 1.15;
/** the boundary footpath (along z) between Pak Darman's garden (x > BOUND_X) and Pak Karto's (x < BOUND_X) */
export const BOUND_X = -3.3;
export const WARUNG = V(3.2, 0, 13.6); // the counter front edge
/** ground height (flat garden and village, hills beyond) */
export const heightAt = (x: number, z: number) => sstep(42, 120, -z) * (9 + 16 * n2(x, z)) + sstep(30, 90, z) * (5 + 12 * n2(z, x)) + 0.06 * Math.sin(x * 0.9) * Math.sin(z * 0.7) * sstep(4, 12, Math.abs(z - 5));

// ---------------- textures ----------------
const grassTex = (() => { const t = canvasTex(1024, 1024, (g) => {
  for (let y = 0; y < 1024; y += 4) for (let x = 0; x < 1024; x += 4) { const n = fbm(x, y, 1024, 8, 5), m = fbm(x + 333, y + 91, 1024, 3, 3), d = fbm(x * 2 + 7, y * 2, 1024, 12, 3);
    let r = 104 + 40 * n, gg = 128 + 34 * n, b = 52 + 16 * n; if (m > 0.18) { const k = Math.min(1, (m - 0.18) * 4); r += (176 - r) * k * 0.6; gg += (156 - gg) * k * 0.6; b += (92 - b) * k * 0.6; } // dry patches
    if (d > 0.3) { const k = Math.min(1, (d - 0.3) * 5); r += (122 - r) * k; gg += (94 - gg) * k; b += (64 - b) * k; } // bare soil spots
    g.fillStyle = `rgb(${r | 0},${gg | 0},${b | 0})`; g.fillRect(x, y, 4, 4); }
  for (let i = 0; i < 9000; i++) { const x = rnd() * 1024, y = rnd() * 1024; g.strokeStyle = `rgba(${rnd() > 0.5 ? "40,70,20" : "190,200,120"},${0.25 + rnd() * 0.3})`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 6, y - 5 - rnd() * 7); g.stroke(); }
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; })();
const soilTex = (base: [number, number, number], key: number) => { const t = canvasTex(512, 512, (g) => {
  for (let y = 0; y < 512; y += 2) for (let x = 0; x < 512; x += 2) { const n = fbm(x + key, y, 512, 10, 5); g.fillStyle = `rgb(${(base[0] + 46 * n) | 0},${(base[1] + 38 * n) | 0},${(base[2] + 30 * n) | 0})`; g.fillRect(x, y, 2, 2); }
  for (let i = 0; i < 1400; i++) { const x = rnd() * 512, y = rnd() * 512, r = 0.6 + rnd() * 2.2; g.fillStyle = `rgba(${rnd() > 0.5 ? "230,214,190" : "60,44,30"},${0.3 + rnd() * 0.4})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
const dirtT = soilTex([128, 98, 70], 0), darkSoilT = soilTex([84, 62, 44], 50);
/** a strip texture with soft ragged alpha edges (paths, road shoulders) */
const stripTex = (base: (g: CanvasRenderingContext2D) => void) => { const t = canvasTex(256, 256, (g) => { base(g); const id = g.getImageData(0, 0, 256, 256); for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const e = Math.min(y, 255 - y) / 256, a = sstep(0.02, 0.16 + 0.08 * fbm(x, y * 0.2, 256, 8, 3), e); id.data[(y * 256 + x) * 4 + 3] = 255 * a; } g.putImageData(id, 0, 0); }); t.wrapS = THREE.RepeatWrapping; return t; };
const pathTex = stripTex((g) => { for (let y = 0; y < 256; y += 2) for (let x = 0; x < 256; x += 2) { const n = fbm(x, y, 256, 8, 5); g.fillStyle = `rgb(${(150 + 40 * n) | 0},${(116 + 34 * n) | 0},${(80 + 26 * n) | 0})`; g.fillRect(x, y, 2, 2); } for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(90,70,50,${0.3 + rnd() * 0.3})`; g.beginPath(); g.arc(rnd() * 256, 40 + rnd() * 176, 0.8 + rnd() * 1.8, 0, 7); g.fill(); } });
const roadTex = stripTex((g) => { for (let y = 0; y < 256; y += 2) for (let x = 0; x < 256; x += 2) { const n = fbm(x, y, 256, 16, 4), p = fbm(x + 90, y + 40, 256, 3, 3); const v = 78 + 30 * n + (p > 0.2 ? 18 : 0); g.fillStyle = `rgb(${v | 0},${(v - 2) | 0},${(v - 4) | 0})`; g.fillRect(x, y, 2, 2); }
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? "190,186,178" : "30,30,30"},${0.35 + rnd() * 0.4})`; g.fillRect(rnd() * 256, rnd() * 256, 1 + rnd(), 1 + rnd()); }
  g.strokeStyle = "rgba(25,25,25,0.6)"; g.lineWidth = 1.2; for (let i = 0; i < 7; i++) { g.beginPath(); let x = rnd() * 256, y = 40 + rnd() * 176; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (rnd() - 0.5) * 22; y += (rnd() - 0.5) * 14; g.lineTo(x, y); } g.stroke(); } });
/** the cut soil face: dark humus on top, brown subsoil, red-ochre laterite below, pebbles and fine root hairs */
const profileTex = (() => canvasTex(512, 512, (g) => {
  for (let y = 0; y < 512; y += 2) for (let x = 0; x < 512; x += 2) { const n = fbm(x, y, 512, 12, 5), w = y + 18 * fbm(x, 3, 512, 6, 3);
    const c = w < 120 ? [62, 46, 34] : w < 300 ? [118, 84, 56] : [150, 86, 52]; g.fillStyle = `rgb(${(c[0] + 40 * n) | 0},${(c[1] + 30 * n) | 0},${(c[2] + 24 * n) | 0})`; g.fillRect(x, y, 2, 2); }
  for (let i = 0; i < 150; i++) { const x = rnd() * 512, y = 60 + rnd() * 450, r = 1.2 + rnd() * 3.2, k = rnd(); const gr = g.createRadialGradient(x - r * 0.2, y - r * 0.4, 0, x, y, r * 1.1); gr.addColorStop(0, `rgb(${150 + 40 * k},${128 + 30 * k},${104 + 24 * k})`); gr.addColorStop(1, `rgb(${70 + 20 * k},${56 + 16 * k},${44 + 12 * k})`); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r * 0.6, r, rnd() * 0.6, 0, 7); g.fill(); }
  g.strokeStyle = "rgba(220,200,170,0.35)"; g.lineWidth = 0.8; for (let i = 0; i < 80; i++) { let x = rnd() * 512, y = rnd() * 200; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 10; y += 4 + rnd() * 8; g.lineTo(x, y); } g.stroke(); }
}))();
const barkTex = (() => { const t = canvasTex(256, 512, (g) => { for (let y = 0; y < 512; y += 2) for (let x = 0; x < 256; x += 2) { const n = fbm(x, y, 256, 8, 4), ring = 0.5 + 0.5 * Math.sin(y * 0.22 + 2 * fbm(x, 0, 256, 4, 2)); const v = 104 + 40 * n - 26 * Math.pow(ring, 6); g.fillStyle = `rgb(${v | 0},${(v * 0.9) | 0},${(v * 0.78) | 0})`; g.fillRect(x, y, 2, 2); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();

// ---------------- helpers ----------------
/** many copies of a downloaded model as instanced meshes (one draw per sub-mesh) */
export const scatter = (R: THREE.Object3D, name: string, pts: { x: number; y?: number; z: number; s: number; r: number }[], o: { cast?: boolean; tint?: string } = {}) => {
  const src = mdl(name); src.updateMatrixWorld(true); const out: THREE.InstancedMesh[] = [];
  src.traverse((m) => { const me = m as THREE.Mesh; if (!me.isMesh) return; let mt = me.material as THREE.Material; if (o.tint) { mt = (mt as THREE.MeshStandardMaterial).clone(); (mt as THREE.MeshStandardMaterial).color.set(o.tint); }
    const im = new THREE.InstancedMesh(me.geometry, mt, pts.length); const T = new THREE.Matrix4(), q = new THREE.Quaternion();
    pts.forEach((p, i) => { q.setFromAxisAngle(V(0, 1, 0), p.r); T.compose(V(p.x, p.y ?? heightAt(p.x, p.z), p.z), q, V(p.s, p.s, p.s)).multiply(me.matrixWorld); im.setMatrixAt(i, T); });
    im.castShadow = o.cast ?? true; im.receiveShadow = true; R.add(im); out.push(im); });
  return out;
};
/** the salt ring: thousands of tiny cubic grains on the soil around a palm; `show(u)` reveals them by angle */
export class SaltRing {
  mesh: THREE.InstancedMesh; N = 4200; ang: number[] = [];
  constructor(R: THREE.Object3D, c: THREE.Vector3, rad = RING_R, n = 4200) {
    this.N = n; this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: "#fbfbf6", roughness: 0.35, emissive: "#ffffff", emissiveIntensity: 0.08 }), this.N);
    const T = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); seedRnd(5);
    const list: { a: number; m: THREE.Matrix4 }[] = [];
    for (let i = 0; i < this.N; i++) { const a = rnd() * Math.PI * 2, rr = rad + (rnd() + rnd() + rnd() - 1.5) * 0.11, s = 0.006 + rnd() * 0.01; e.set(rnd() * 3, rnd() * 3, rnd() * 3); q.setFromEuler(e);
      const dens = Math.exp(-Math.pow((rr - rad) / 0.09, 2)); list.push({ a, m: new THREE.Matrix4().compose(V(c.x + Math.cos(a) * rr, 0.004 + s * 0.4 + 0.012 * dens * rnd(), c.z + Math.sin(a) * rr), q, V(s, s, s)) }); }
    list.sort((p, r) => p.a - r.a).forEach((p, i) => { this.mesh.setMatrixAt(i, p.m); this.ang.push(p.a); }); void T;
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; R.add(this.mesh); this.show(1);
  }
  /** u 0..1 of the ring laid down (by angle from a0) */
  show(u: number) { this.mesh.count = Math.round(this.N * Math.max(0, Math.min(1, u))); }
}
/** falling salt grains thrown from a hand: `throwAt(t, hand, ring centre)` places grains along short arcs */
export class Grains {
  mesh: THREE.InstancedMesh; N = 260; T = new THREE.Matrix4(); q = new THREE.Quaternion(); e = new THREE.Euler();
  constructor(R: THREE.Object3D) { this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.3, emissive: "#ffffff", emissiveIntensity: 0.15 }), this.N); this.mesh.castShadow = false; this.mesh.frustumCulled = false; this.mesh.count = 0; R.add(this.mesh); }
  /** handfuls thrown every `every` s from `hand` toward points on the ring; each grain flies ~0.55 s */
  run(t: number, t0: number, t1: number, hand: (tt: number) => THREE.Vector3, target: (tt: number, i: number) => THREE.Vector3, every = 0.55) {
    let n = 0;
    for (let k = 0; k < 40 && n < this.N; k++) { const tk = t0 + k * every; if (tk > t1) break; const a = t - tk; if (a < 0 || a > 0.75) continue;
      const h = hand(tk);
      for (let i = 0; i < 26 && n < this.N; i++) { const r1 = Math.sin(k * 91.7 + i * 12.9) * 0.5 + 0.5, r2 = Math.sin(k * 33.1 + i * 7.7) * 0.5 + 0.5, life = 0.45 + 0.3 * r1, u = a / life; if (u > 1) continue;
        const tg = target(tk, i); const p = h.clone().lerp(tg, u); p.y += Math.sin(u * Math.PI) * (0.12 + 0.1 * r2) * (1 - u * 0.3); p.x += (r2 - 0.5) * 0.06 * u; p.z += (r1 - 0.5) * 0.06 * u;
        const s = 0.007 + 0.006 * r2; this.e.set(t * 7 + i, t * 5 + k, i); this.q.setFromEuler(this.e); this.T.compose(p, this.q, V(s, s, s)); this.mesh.setMatrixAt(n++, this.T); } }
    this.mesh.count = n; this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export type KebunOpts = { sick?: number; sickK?: number; salt?: boolean; rings?: boolean; truck?: boolean; pit?: boolean; shadowAt?: V3; shadowSize?: number; sunH?: number; empty?: boolean; heroSacks?: boolean; night?: boolean; rain?: boolean; fronds?: number };
type PalmRec = { o: THREE.Object3D; x: number; z: number; top: THREE.Vector3; crown: THREE.Vector3; side: 0 | 1; s: number };
export class KebunSet {
  root = new THREE.Group(); sunDir = new THREE.Vector3(); ring?: SaltRing; grains: Grains; hero!: THREE.Object3D; heroTop = new THREE.Vector3(); palms: PalmRec[] = [];
  motes!: THREE.Points; drops?: THREE.InstancedMesh; ions?: THREE.InstancedMesh; pitInfo?: { face: number; roots: THREE.CatmullRomCurve3[] }; crystals?: THREE.InstancedMesh;
  shelfSalt: THREE.Group = new THREE.Group(); karto: THREE.Group = new THREE.Group(); rings: SaltRing[] = []; sun!: THREE.DirectionalLight; sunAt = new THREE.Vector3();
  nuts: { ims: THREE.InstancedMesh[]; list: { palm: number; p: THREE.Vector3; q: THREE.Quaternion; s: number; base: THREE.Matrix4[] }[] } = { ims: [], list: [] }; rainM?: THREE.InstancedMesh; wet?: THREE.Mesh; beads?: THREE.InstancedMesh; porch?: THREE.PointLight;
  constructor(public o: KebunOpts = {}) {
    const R = this.root, sick = o.sick ?? 1, sickK = o.sickK ?? sick; seedRnd(21);
    // ---- ground: one big displaced sheet (flat garden and village, hills beyond), grass texture tinted darker uphill
    const gg = new THREE.PlaneGeometry(520, 520, 260, 260).rotateX(-Math.PI / 2); const pa = gg.attributes.position as THREE.BufferAttribute, col: number[] = [];
    for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), z = pa.getZ(i), h = heightAt(x, z); pa.setY(i, h); const k = Math.min(1, h / 22); col.push(1 - 0.28 * k, 1 - 0.18 * k, 1 - 0.3 * k); }
    gg.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); gg.computeVertexNormals();
    if (o.pit) { // cut the pit out of the ground in front of the hero palm (triangles inside the pit rectangle removed)
      const idx = gg.index!, keep: number[] = []; for (let i = 0; i < idx.count; i += 3) { let inside = 0; for (let k = 0; k < 3; k++) { const v = idx.getX(i + k), x = pa.getX(v), z = pa.getZ(v); if (x > -1.45 && x < 1.45 && z > 0.42 && z < 2.6) inside++; } if (inside < 1) keep.push(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)); } gg.setIndex(keep); }
    const gt = grassTex.clone(); gt.repeat.set(130, 130); gt.needsUpdate = true;
    const ground = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ map: gt, vertexColors: true, roughness: 0.95 })); ground.receiveShadow = true; R.add(ground);
    // bare soil rings under every garden palm and a dirt footpath; worn village road with gravel shoulders
    const pt = pathTex.clone(); pt.repeat.set(30, 1); pt.needsUpdate = true; R.add(M(new THREE.PlaneGeometry(120, 1.7), new THREE.MeshStandardMaterial({ map: pt, transparent: true, roughness: 0.95, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), [0, 0.012, PATH_Z], [-Math.PI / 2, 0, 0]));
    const rt = roadTex.clone(); rt.repeat.set(40, 1); rt.needsUpdate = true; R.add(M(new THREE.PlaneGeometry(200, 5.4), new THREE.MeshStandardMaterial({ map: rt, transparent: true, roughness: 0.82, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }), [0, 0.02, ROAD_Z], [-Math.PI / 2, 0, 0]));
    const sh = pathTex.clone(); sh.repeat.set(50, 1); sh.needsUpdate = true; for (const dz of [-3.2, 3.2]) R.add(M(new THREE.PlaneGeometry(200, 1.6), new THREE.MeshStandardMaterial({ map: sh, transparent: true, roughness: 1, color: "#d8ccb8", depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), [0, 0.015, ROAD_Z + dz], [-Math.PI / 2, 0, 0]));
    // ---- coconut palms: a loose grid in the garden (the HERO at the origin), more on the hills
    const soilM = new THREE.MeshStandardMaterial({ map: dirtT, transparent: true, roughness: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, alphaMap: canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 10, 64, 64, 62); gr.addColorStop(0, "#fff"); gr.addColorStop(0.6, "#bbb"); gr.addColorStop(1, "#000"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }) });
    const addPalm = (x: number, z: number, kind: 0 | 1, s: number, rot: number, k: number, seed: number, near: boolean) => {
      let p = mdl(kind ? "coco_palm2" : "coco_palm", s); p = sickLeaves(p, k, seed); p.position.set(x, heightAt(x, z) - 0.05, z); p.rotation.y = rot; R.add(p);
      if (near) { const d = M(new THREE.CircleGeometry(1.9, 24), soilM, [x, heightAt(x, z) + 0.008, z], [-Math.PI / 2, 0, 0]); d.receiveShadow = true; R.add(d); }
      p.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(p); const top = V(x, bb.max.y - 1.6 * s, z); this.palms.push({ o: p, x, z, top, crown: crownWorld(p), side: x < BOUND_X ? 1 : 0, s }); return p; };
    this.hero = addPalm(HERO.x, HERO.z, 0, 1, 0.4, sick, 3, !o.pit); this.heroTop.copy(this.palms[0].top);
    for (let ix = -6; ix <= 6; ix++) for (let iz = -8; iz <= 0; iz++) { if (ix === 0 && iz === 0) continue; const x = ix * 6.6 + (rnd() - 0.5) * 2.6, z = iz * 6.6 - 1.2 + (rnd() - 0.5) * 2.4; if (z > -1.5 && Math.abs(x) < 4) continue;
      const r0 = rnd(), sd = x < BOUND_X ? sickK : sick; addPalm(x, z, r0 > 0.5 ? 1 : 0, 0.85 + rnd() * 0.35, rnd() * 6.28, sd * (0.75 + 0.25 * rnd()), ix * 13 + iz, Math.abs(x) < 26 && z > -40); }
    for (let i = 0; i < 90; i++) { const back = i < 60, x = (rnd() - 0.5) * 300, z = back ? -60 - rnd() * 110 : 40 + rnd() * 60; addPalm(x, z, rnd() > 0.5 ? 1 : 0, 0.9 + rnd() * 0.4, rnd() * 6.28, 0, i, false); }
    // the boundary footpath between the two gardens (runs from the cross path into the garden)
    const bp = pathTex.clone(); bp.repeat.set(14, 1); bp.needsUpdate = true; R.add(M(new THREE.PlaneGeometry(50, 1.3), new THREE.MeshStandardMaterial({ map: bp, transparent: true, roughness: 0.95, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), [BOUND_X, 0.013, PATH_Z - 25.5], [-Math.PI / 2, 0, Math.PI / 2]));
    // a low bamboo boundary fence: a row of short stakes with a top rail, broken in places
    const bam = new THREE.MeshStandardMaterial({ color: "#b8a070", roughness: 0.7 }), stakeG = new THREE.CylinderGeometry(0.025, 0.03, 0.75, 7);
    for (let z = PATH_Z - 1.2; z > -40; z -= 1.1) { if (rnd() < 0.12) continue; const st = new THREE.Mesh(stakeG, bam); st.position.set(BOUND_X - 0.75, 0.36, z); st.rotation.set((rnd() - 0.5) * 0.1, 0, (rnd() - 0.5) * 0.12); st.castShadow = st.receiveShadow = true; R.add(st);
      if (rnd() > 0.2) { const rl = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.12, 6), bam); rl.position.set(BOUND_X - 0.75, 0.62 - rnd() * 0.05, z - 0.55); rl.rotation.x = Math.PI / 2 + (rnd() - 0.5) * 0.06; rl.castShadow = true; R.add(rl); } }
    // coconut bunches (downloaded coconut model, green) hanging under the crowns of the near palms; sizes follow health
    this.buildNuts(R);
    // salt rings around Pak Darman's near palms (he salts all thirty)
    if (o.rings) this.palms.forEach((p, i) => { if (i === 0 || p.side || p.z < -26 || Math.abs(p.x) > 22) return; this.rings.push(new SaltRing(R, V(p.x, heightAt(p.x, p.z), p.z), RING_R * p.s, 2200)); });
    // ---- undergrowth: grass tufts, ferns, bushes, rocks, banana clumps (instanced)
    const pts = (n: number, f: () => { x: number; z: number } | null, s: [number, number]) => { const out: { x: number; z: number; s: number; r: number }[] = []; let k = 0; while (out.length < n && k++ < n * 6) { const p = f(); if (p) out.push({ ...p, s: s[0] + rnd() * (s[1] - s[0]), r: rnd() * 6.28 }); } return out; };
    const clear = (x: number, z: number) => Math.hypot(x - HERO.x, z - HERO.z) > 2.2 && Math.abs(z - PATH_Z) > 1.1 && !(Math.abs(x - BOUND_X) < 0.9 && z < PATH_Z) && Math.abs(z - ROAD_Z) > 3.8 && !(o.pit && x > -2 && x < 2 && z > 0 && z < 3.2);
    scatter(R, "grass", pts(1300, () => { const x = (rnd() - 0.5) * 90, z = -55 + rnd() * 75; return clear(x, z) ? { x, z } : null; }, [0.7, 1.5]), { cast: false });
    scatter(R, "grass", pts(260, () => { const x = (rnd() - 0.5) * 60, z = ROAD_Z + 3.4 + rnd() * 2.2; return { x, z }; }, [0.6, 1.2]), { cast: false });
    scatter(R, "fern", pts(110, () => { const x = (rnd() - 0.5) * 80, z = -50 + rnd() * 52; return clear(x, z) ? { x, z } : null; }, [0.6, 1.2]));
    scatter(R, "bushes", pts(26, () => { const x = (rnd() - 0.5) * 90, z = -48 + rnd() * 48; return clear(x, z) && Math.abs(x) > 3 ? { x, z } : null; }, [0.5, 0.9]));
    scatter(R, "rocks", pts(60, () => { const x = (rnd() - 0.5) * 60, z = -40 + rnd() * 46; return clear(x, z) ? { x, z } : null; }, [0.4, 1.4]));
    scatter(R, "banana", pts(22, () => { const x = (rnd() - 0.5) * 110, z = rnd() > 0.5 ? 13 + rnd() * 9 : -50 - rnd() * 20; return Math.abs(x - WARUNG.x) > 5 ? { x, z } : null; }, [0.75, 1.15]));
    // fallen dry palm fronds under the sick palms
    if (sick > 0.3) scatter(R, "fern", pts(40, () => { const p = this.palms[1 + Math.floor(rnd() * 100)]; if (!p || p.z < -40) return null; const a = rnd() * 6.28, d = 1 + rnd() * 2; const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d; return clear(x, z) ? { x, z } : null; }, [0.9, 1.4]), { tint: "#9a7a4a" });
    if (o.fronds) for (let i = 0; i < o.fronds; i++) { const p = this.palms[i % 12 === 0 ? 0 : 1 + Math.floor(rnd() * 60)]; if (!p || p.z < -30 || (o.fronds < 20 && p.side)) continue; const a = rnd() * 6.28, d = 1.2 + rnd() * 1.6; const f = mkFrond(1, 3.2 + rnd()); f.position.set(p.x + Math.cos(a) * d, 0.04, p.z + Math.sin(a) * d); f.rotation.set(0, a + Math.PI / 2 + (rnd() - 0.5), 0); R.add(f); }
    // ---- the village across the road: houses (recoloured), the warung, banana trees, a parked scooter
    const WALLS = ["#f1ece0", "#dfe9d6", "#ece0c6", "#dce6ee", "#f4e6d0"], ROOFS = ["#b4532e", "#9e4a2c", "#b86a3a"];
    const house = (x: number, z: number, rot: number, i: number, s = 1) => { const h = recolor(mdl("house", s), { _crayfishdiffuse: WALLS[i % 5], "02___Default": ROOFS[i % 3], "07___Default": "#5a3a26", "03___Default": "#2a2a30" }); h.position.set(x, heightAt(x, z), z); h.rotation.y = rot; R.add(h); return h; };
    [[-10, 18.5, 0], [-21, 18, 1], [15, 18.6, 2], [26, 18.2, 3], [-33, 19, 4], [38, 19, 0], [3.6, 19.8, 1]].forEach(([x, z, i]) => house(x, z, Math.PI / 2, i));
    this.buildWarung(R);
    if (o.truck) this.buildTruck(R);
    if (o.salt) this.ring = new SaltRing(R, HERO);
    this.grains = new Grains(R);
    if (o.pit) this.buildPit(R);
    // ---- clouds and the sky: hazy morning, warm at the horizon
    const cm = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#f2ece2", emissiveIntensity: 0.5, roughness: 1, fog: false });
    for (let i = 0; i < 18; i++) { const az = (i / 18) * Math.PI * 2 + rnd() * 0.3, dist = 170 + rnd() * 40, h = 30 + rnd() * 34, o2 = mdl(i % 2 ? "cloud_1" : "cloud_2", 22 + rnd() * 26); o2.traverse((x) => { const me = x as THREE.Mesh; if (me.isMesh) { me.material = cm; me.castShadow = me.receiveShadow = false; } }); o2.position.set(Math.sin(az) * dist, h, -Math.cos(az) * dist); o2.lookAt(0, h, 0); R.add(o2); }
    if (o.night) { this.buildNight(R); return; }
    const skyT = canvasTex(8, 512, (g) => { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#5b93d0"); gr.addColorStop(0.38, "#9cc2e6"); gr.addColorStop(0.49, "#f0dfc4"); gr.addColorStop(0.52, "#e9d6b8"); gr.addColorStop(1, "#d8c4a4"); g.fillStyle = gr; g.fillRect(0, 0, 8, 512); });
    R.add(new THREE.Mesh(new THREE.SphereGeometry(280, 32, 16), new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide, fog: false, depthWrite: false })));
    // ---- light: low warm morning sun from the east (+x, a little behind the garden), cool sky fill, warm bounce
    const at = V(...(o.shadowAt ?? [0, 0, 2])), S = o.shadowSize ?? 16, dir = V(0.74, o.sunH ?? 0.42, -0.52).normalize();
    const sun = new THREE.DirectionalLight("#ffd9a8", 3.6); sun.position.copy(at).addScaledVector(dir, 60); sun.target.position.copy(at); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
    Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 20, far: 110 }); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.04; sun.shadow.radius = 3; R.add(sun, sun.target); this.sun = sun; this.sunAt.copy(at);
    R.add(new THREE.HemisphereLight("#bcd4f4", "#8a7a52", 1.25)); const fill = new THREE.DirectionalLight("#b4cbff", 0.45); fill.position.set(-8, 6, 10); R.add(fill);
    this.sunDir.copy(dir);
    // sun shafts slanting through the palm crowns, with dust motes
    const shm = new THREE.MeshBasicMaterial({ map: shaftTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, color: new THREE.Color(0.09, 0.07, 0.045) });
    const mp: number[] = [];
    this.palms.slice(0, 40).filter((p) => p.z > -24 && Math.abs(p.x) < 18).forEach((p, i) => { const len = 14, base = p.top.clone().addScaledVector(dir, -len * 0.55), mid = base.clone().addScaledVector(dir, len / 2);
      if (i % 2) return; for (const ry of [0, Math.PI / 2]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(1.4 + (i % 3) * 0.6, len), shm); s.position.copy(mid); s.quaternion.setFromUnitVectors(V(0, 1, 0), dir); s.rotateY(ry + i); s.castShadow = s.receiveShadow = false; s.layers.set(NOINK); R.add(s); } });
    for (let k = 0; k < 500; k++) mp.push((rnd() - 0.5) * 14, 0.3 + rnd() * 4, -3 + rnd() * 9);
    const mg = new THREE.BufferGeometry(); mg.setAttribute("position", new THREE.Float32BufferAttribute(mp, 3));
    const dot = canvasTex(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(255,236,200,1)"); gr.addColorStop(1, "rgba(255,236,200,0)"); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
    this.motes = new THREE.Points(mg, new THREE.PointsMaterial({ map: dot, size: 0.014, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })); R.add(this.motes);
    if (o.rain) this.buildRain(R);
  }
  /** rain over the garden: thin streaks falling to the ground (never below it) */
  private buildRain(R: THREE.Object3D) { this.rainM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.003, 0.006, 0.34, 5), new THREE.MeshStandardMaterial({ color: "#dcecff", roughness: 0.1, transparent: true, opacity: 0.5 }), 2500); this.rainM.castShadow = false; this.rainM.frustumCulled = false; this.rainM.count = 0; R.add(this.rainM); }
  /** k 0..1 rain strength; streaks fill a box around `c` (x/z half sizes), tilted slightly by the wind */
  rainAt(t: number, k: number, c: THREE.Vector3, hx = 14, hz = 14, top = 9) {
    const m = this.rainM!, T = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.08, 0, 0.12)); let n = 0;
    for (let i = 0; i < 2500 && k > 0.01; i++) { if ((i % 10) / 10 >= k) continue; const ph = (t * (1.9 + (i % 7) * 0.05) + i * 0.0617) % 1, x = c.x + (((i * 0.6180339) % 1) - 0.5) * 2 * hx, z = c.z + (((i * 0.3819) % 1) - 0.5) * 2 * hz, y = top * (1 - ph);
      if (y < heightAt(x, z) + 0.17) continue; T.compose(V(x + 0.6 * (1 - ph), y, z - 0.4 * (1 - ph)), q, V(1, 1, 1)); m.setMatrixAt(n++, T); }
    m.count = n; m.instanceMatrix.needsUpdate = true;
  }
  /** move the sun across the sky (time-lapse): `a` turns the sun direction around the vertical axis */
  sunTurn(a: number, h = 0.42) { const d = V(0.74, h, -0.52); d.applyAxisAngle(V(0, 1, 0), a).normalize(); this.sun.position.copy(this.sunAt).addScaledVector(d, 60); this.sunDir.copy(d); }
  /** palm health per garden (0 lush .. 1 sick): leaf colour, crown shape and the size of the coconut bunches */
  setGarden(darman: number, karto: number) {
    this.palms.forEach((p, i) => setHealth(p.o, (p.side ? karto : darman) * (i ? 0.85 + 0.15 * Math.abs(Math.sin(i * 3.1)) : 1)));
    const T = new THREE.Matrix4(); this.nuts.list.forEach((n, j) => { const h = this.palms[n.palm].side ? karto : darman, sc = n.s * (1.35 - 0.75 * h), show = h < 0.5 || (j % 3 === 0);
      this.nuts.ims.forEach((im, k) => { T.compose(n.p, n.q, V(1, 1, 1).multiplyScalar(show ? sc : 0)).multiply(n.base[k]); im.setMatrixAt(j, T); }); });
    const g0 = new THREE.Color("#6f9a2e"), g1 = new THREE.Color("#8a6a36"), C = new THREE.Color();
    this.nuts.list.forEach((n, j) => { C.lerpColors(g0, g1, this.palms[n.palm].side ? karto : darman); this.nuts.ims.forEach((im) => im.setColorAt(j, C)); });
    this.nuts.ims.forEach((im) => { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; });
  }
  private buildNuts(R: THREE.Object3D) {
    const src = mdl("coconut"); src.updateMatrixWorld(true); const subs: THREE.Mesh[] = []; src.traverse((m) => { if ((m as THREE.Mesh).isMesh) subs.push(m as THREE.Mesh); });
    const list = this.nuts.list; this.palms.forEach((p, i) => { if (p.z < -30 || Math.abs(p.x) > 24) return; const c = p.crown;
      for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2 * 2.3 + i, r = (0.28 + 0.12 * ((k * 0.37) % 1)) * p.s, y = -0.25 - 0.55 * ((k * 0.618) % 1);
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(k, k * 2, k * 0.5)); list.push({ palm: i, p: V(c.x + Math.cos(a) * r, c.y + y * p.s, c.z + Math.sin(a) * r), q, s: (1.1 + 0.25 * ((k * 0.73) % 1)) * p.s, base: subs.map((sm) => sm.matrixWorld.clone()) }); } });
    this.nuts.ims = subs.map((sm) => { const mt = (sm.material as THREE.MeshStandardMaterial).clone(); mt.map = null; mt.color.set("#ffffff"); mt.roughness = 0.5; const im = new THREE.InstancedMesh(sm.geometry, mt, list.length); im.castShadow = true; im.receiveShadow = true; R.add(im); return im; });
    this.setGarden(this.o.sick ?? 1, this.o.sickK ?? this.o.sick ?? 1);
  }
  /** night: deep blue sky with a moon and stars, cool moonlight, warm lit windows and a porch bulb at Pak Karto's house */
  private buildNight(R: THREE.Object3D) {
    const skyT = canvasTex(8, 512, (g) => { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#070b1c"); gr.addColorStop(0.4, "#14204a"); gr.addColorStop(0.5, "#2a3a64"); gr.addColorStop(0.53, "#1a2238"); gr.addColorStop(1, "#0c1020"); g.fillStyle = gr; g.fillRect(0, 0, 8, 512); });
    R.add(new THREE.Mesh(new THREE.SphereGeometry(280, 32, 16), new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide, fog: false, depthWrite: false })));
    const sp: number[] = []; for (let i = 0; i < 900; i++) { const a = rnd() * 6.28, e = 0.12 + rnd() * 1.3; sp.push(Math.cos(a) * Math.cos(e) * 260, Math.sin(e) * 260, Math.sin(a) * Math.cos(e) * 260); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3)); R.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: "#dfe8ff", size: 1.1, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 })));
    const moon = new THREE.Mesh(new THREE.SphereGeometry(6, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.55, 1.35), fog: false, toneMapped: false })); moon.position.set(-90, 120, 160); R.add(moon);
    const at = V(...(this.o.shadowAt ?? [0, 0, 16])), S = this.o.shadowSize ?? 12, dir = V(-0.45, 0.62, 0.64).normalize();
    const ml = new THREE.DirectionalLight("#9fb8ff", 0.9); ml.position.copy(at).addScaledVector(dir, 60); ml.target.position.copy(at); ml.castShadow = true; ml.shadow.mapSize.set(2048, 2048);
    Object.assign(ml.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 20, far: 110 }); ml.shadow.bias = -0.0004; ml.shadow.normalBias = 0.04; R.add(ml, ml.target); this.sun = ml; this.sunAt.copy(at);
    R.add(new THREE.HemisphereLight("#33406e", "#1a1812", 0.55)); this.sunDir.copy(dir);
    R.traverse((x) => { const me = x as THREE.Mesh; if (!me.isMesh) return; const ms = Array.isArray(me.material) ? me.material : [me.material]; ms.forEach((q) => { if (q.name === "03___Default") { const sm = q as THREE.MeshStandardMaterial; sm.emissive = new THREE.Color("#ffb45a"); sm.emissiveIntensity = 1.6; } }); });
  }
  /** the village warung: a wooden counter under a zinc awning in front of a small house, shelves of goods, a salt shelf,
   *  hanging sachet strips, a bench, crates and sacks, a parked scooter */
  private buildWarung(R: THREE.Object3D) {
    const W = WARUNG, G = new THREE.Group(); G.position.copy(W); R.add(G);
    const wood = mat("#8a5a36", { roughness: 0.85 }), dark = mat("#5a3a24", { roughness: 0.9 }), zinc = mat("#a9aeb4", { metalness: 0.55, roughness: 0.45 });
    // floor slab, back wall (the house front), posts, awning
    G.add(B(6.4, 0.18, 4.0, mat("#b9ad98", { roughness: 0.95 }), [0, 0.09, 2.0]));
    const wallT = canvasTex(256, 256, (g) => { for (let y = 0; y < 256; y += 2) for (let x = 0; x < 256; x += 2) { const n = fbm(x, y, 256, 8, 4); g.fillStyle = `rgb(${(214 + 24 * n) | 0},${(224 + 20 * n) | 0},${(196 + 22 * n) | 0})`; g.fillRect(x, y, 2, 2); } const gr = g.createLinearGradient(0, 180, 0, 256); gr.addColorStop(0, "rgba(120,100,70,0)"); gr.addColorStop(1, "rgba(120,100,70,0.35)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
    G.add(B(6.4, 3.2, 0.2, new THREE.MeshStandardMaterial({ map: wallT, roughness: 0.9 }), [0, 1.6, 3.9]));
    G.add(B(1.0, 2.1, 0.06, dark, [-2.2, 1.05, 3.78])); // back door
    for (const x of [-3.0, 3.0]) G.add(B(0.12, 2.75, 0.12, wood, [x, 1.38, 0.05]));
    const aw = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 4.4, 24, 1), zinc); aw.rotation.x = -Math.PI / 2 + 0.16; aw.position.set(0, 2.95, 1.9); aw.castShadow = aw.receiveShadow = true;
    const ap = aw.geometry.attributes.position as THREE.BufferAttribute; for (let i = 0; i < ap.count; i++) ap.setZ(i, 0.025 * Math.sin(ap.getX(i) * 18)); aw.geometry.computeVertexNormals(); G.add(aw);
    G.add(B(6.6, 0.1, 0.08, wood, [0, 2.78, 0.02])); // fascia
    // counter: wooden front with a glass display top
    G.add(B(4.2, 0.95, 0.6, wood, [0.5, 0.65, 0.45])); G.add(B(4.3, 0.05, 0.66, dark, [0.5, 1.13, 0.45]));
    const glass = new THREE.MeshPhysicalMaterial({ color: "#dfeff2", roughness: 0.05, transmission: 0.0, transparent: true, opacity: 0.25, metalness: 0 });
    G.add(B(4.2, 0.35, 0.56, glass, [0.5, 1.33, 0.45]));
    for (let i = 0; i < 6; i++) { const j = recolor(mdl("jar", 0.9), {}, 0.2); j.position.set(-1.1 + i * 0.62, 1.16, 0.45); G.add(j); } // kerupuk jars on the counter
    // shelves behind the counter (recoloured to wood), stocked with boxes, bottles, packs
    for (const x of [-1.2, 1.6]) { const s = recolor(mdl("shelves"), { Orange: "#8a5a36", Blue: "#6a4a30", Black_u_leg: "#3a2a20", Wood_light: "#a87a4e" }); s.position.set(x, 0.18, 3.35); s.rotation.y = Math.PI / 2; G.add(s); }
    const goods = ["#e04a3a", "#2a62b8", "#f0c020", "#2a9a5a", "#f07a24", "#7a3e8e", "#f4f0e6"];
    for (const x0 of [-2.2, 0.6]) for (let lv = 0; lv < 4; lv++) for (let k = 0; k < 9; k++) { const w = 0.12 + rnd() * 0.08, h = 0.14 + rnd() * 0.16; G.add(B(w, h, 0.12, mat(goods[(k + lv * 3) % 7], { roughness: 0.5 }), [x0 + k * 0.22, 0.42 + lv * 0.5 + h / 2, 3.3 + (rnd() - 0.5) * 0.1])); }
    // the salt shelf: a low wooden rack by the counter, stacked with 1 kg salt packs (white with a blue band)
    const packT = canvasTex(64, 96, (g) => { g.fillStyle = "#f6f6f2"; g.fillRect(0, 0, 64, 96); g.fillStyle = "#2a5cc0"; g.fillRect(0, 30, 64, 24); g.fillStyle = "#e04a3a"; g.fillRect(8, 64, 48, 6); g.fillStyle = "rgba(0,0,0,0.08)"; g.fillRect(0, 0, 4, 96); });
    const rack = new THREE.Group(); rack.position.set(-2.55, 0.18, 0.9); G.add(rack);
    for (const y of [0.25, 0.65, 1.05]) rack.add(B(0.8, 0.04, 0.5, wood, [0, y, 0])); for (const x of [-0.38, 0.38]) for (const z of [-0.22, 0.22]) rack.add(B(0.04, 1.1, 0.04, dark, [x, 0.55, z]));
    const pm = new THREE.MeshStandardMaterial({ map: packT, roughness: 0.4 }); this.shelfSalt.position.copy(rack.position); G.add(this.shelfSalt);
    for (const y of [0.27, 0.67, 1.07]) for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) this.shelfSalt.add(B(0.12, 0.17, 0.06, pm, [-0.28 + i * 0.14, y + 0.085, -0.12 + j * 0.2], [0, (rnd() - 0.5) * 0.2, 0]));
    // hanging sachet strips (renceng) along the awning front
    const sachet = (c1: string, c2: string) => new THREE.MeshStandardMaterial({ map: canvasTex(32, 48, (g) => { g.fillStyle = c1; g.fillRect(0, 0, 32, 48); g.fillStyle = c2; g.fillRect(4, 14, 24, 18); g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(0, 0, 32, 3); }), roughness: 0.35, metalness: 0.2 });
    const sm2 = [sachet("#d4202a", "#f0c020"), sachet("#1a4aa0", "#ffffff"), sachet("#f0a020", "#6a2a10"), sachet("#2a8a4a", "#f4f0e6"), sachet("#5a2a80", "#f0c020")];
    for (const x of [-2.75, -2.25, 2.3, 2.8]) { G.add(B(0.012, 0.16, 0.012, mat("#6a6a6a", { metalness: 0.6, roughness: 0.4 }), [x, 2.7, 0.06])); for (let k = 0; k < 7; k++) { const sc2 = B(0.085, 0.115, 0.016, sm2[(Math.round(x * 4) + 9) % 5], [x + (k % 2 ? 0.006 : -0.006), 2.56 - k * 0.112, 0.06 + (k % 2 ? 0.012 : 0)], [0.06, 0, (k % 2 ? 0.04 : -0.04)]); G.add(sc2); } }
    // bench in front, crates, sacks of rice, a parked scooter, potted plants
    const bench = mdl("table", 0.9); bench.position.set(-1.0, 0.18, -0.85); bench.rotation.y = Math.PI / 2; G.add(bench);
    for (const [x, z, r] of [[2.7, 0.5, 0.2], [2.75, 1.2, -0.3]] as V3[]) { const s = recolor(mdl("sack", 0.9), { mat18: "#e8dcc0" }); s.position.set(x, 0.18, z); s.rotation.y = r; G.add(s); }
    const sc = recolor(mdl("scooter"), { BROWN: "#1c1c20", BLUE: "#c8302a" }, 0.5); sc.position.set(-4.6, 0, -0.6); sc.rotation.y = 1.35; G.add(sc);
  }
  /** the buyer's pickup on the road, its bed heaped with coconuts */
  private buildTruck(R: THREE.Object3D) {
    const tr = recolor(mdl("pickup"), { M_0042_Sienna: "#e9e6dc", FrontColor: "#e9e6dc" }, 0.4); tr.position.set(-4.5, 0, ROAD_Z - 0.6); tr.rotation.y = Math.PI / 2; R.add(tr);
    tr.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(tr); const pile: { x: number; y: number; z: number; s: number; r: number }[] = [];
    for (let i = 0; i < 120; i++) { const u = rnd(), v = rnd(); const x = bb.max.x - 0.3 - u * 1.6, z = ROAD_Z - 0.6 + (v - 0.5) * 1.25, hump = 0.45 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI); pile.push({ x, y: 0.95 + hump + rnd() * 0.12, z, s: 1.05 + rnd() * 0.3, r: rnd() * 6 }); }
    scatter(R, "coconut", pile, { tint: "#7f9a3a" });
  }
  /** the dug pit in front of the HERO palm: soil-profile walls, roots running down the back wall, the trunk base */
  private buildPit(R: THREE.Object3D) {
    const D = 1.25, x0 = -1.45, x1 = 1.45, z0 = 0.42, z1 = 2.6, pm = new THREE.MeshStandardMaterial({ map: profileTex, roughness: 1 });
    const wall = (w: number, p: V3, r: V3) => { const m = M(new THREE.PlaneGeometry(w, D, 1, 1), pm, p, r); m.receiveShadow = true; R.add(m); };
    wall(x1 - x0, [0, -D / 2, z0], [0, 0, 0]); wall(z1 - z0, [x0, -D / 2, (z0 + z1) / 2], [0, Math.PI / 2, 0]); wall(z1 - z0, [x1, -D / 2, (z0 + z1) / 2], [0, -Math.PI / 2, 0]); wall(x1 - x0, [0, -D / 2, z1], [0, Math.PI, 0]);
    R.add(M(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshStandardMaterial({ map: darkSoilT, roughness: 1 }), [0, -D, (z0 + z1) / 2], [-Math.PI / 2, 0, 0]));
    // a rim of turned-over soil and a shovel stuck in the heap
    scatter(R, "rocks", Array.from({ length: 30 }, () => ({ x: x0 - 0.3 + rnd() * (x1 - x0 + 0.6), y: 0, z: z1 + 0.1 + rnd() * 0.4, s: 0.6 + rnd(), r: rnd() * 6 })), { tint: "#6a4c34" });
    // roots: fibrous coconut roots fanning out from the trunk base, pressed into the back wall (half showing)
    const rm = new THREE.MeshStandardMaterial({ color: "#c49a6a", roughness: 0.8 }), roots: THREE.CatmullRomCurve3[] = []; seedRnd(9);
    for (let i = 0; i < 26; i++) { const a = -1.3 + (i / 25) * 2.6 + (rnd() - 0.5) * 0.12, pts: THREE.Vector3[] = []; let x = 0.12 * Math.sin(a), y = -0.04, z = z0 - 0.005;
      for (let k = 0; k < 7; k++) { pts.push(V(x, y, z)); x += Math.sin(a) * (0.12 + rnd() * 0.08); y -= 0.1 + rnd() * 0.08; x += (rnd() - 0.5) * 0.05; }
      const c = new THREE.CatmullRomCurve3(pts); roots.push(c); const tm = new THREE.Mesh(new THREE.TubeGeometry(c, 30, 0.011 + rnd() * 0.006, 6), rm); tm.castShadow = true; R.add(tm);
      for (let b = 0; b < 3; b++) { const p0 = c.getPoint(0.3 + b * 0.22), p1 = p0.clone().add(V((rnd() - 0.5) * 0.14, -0.06 - rnd() * 0.06, 0)); R.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(p0, p1), 4, 0.004, 4), rm)); } }
    // the trunk base continues below ground behind the cut (bulbous root plate)
    const base = M(new THREE.CylinderGeometry(0.2, 0.3, 0.5, 24), new THREE.MeshStandardMaterial({ map: barkTex, roughness: 0.9, color: "#d8c4a4" }), [0, -0.22, 0.1]); R.add(base);
    this.pitInfo = { face: z0, roots };
    // the wet front: rain water soaking down the cut face (darker, glossy soil with a ragged lower edge); scale.y = depth
    const wetT = canvasTex(256, 256, (g) => { const id = g.createImageData(256, 256); for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const edge = 236 - 40 * fbm(x, 5, 256, 10, 3) - 14 * fbm(x * 3, 9, 256, 20, 2), a = y < edge ? 0.62 : Math.max(0, 0.62 - (y - edge) / 14); const i = (y * 256 + x) * 4; id.data[i] = 34; id.data[i + 1] = 24; id.data[i + 2] = 18; id.data[i + 3] = 255 * a * (0.85 + 0.15 * fbm(x, y, 256, 16, 3)); } g.putImageData(id, 0, 0); });
    const wg = new THREE.PlaneGeometry(x1 - x0 - 0.02, D * 0.98).translate(0, -D * 0.49, 0); this.wet = M(wg, new THREE.MeshStandardMaterial({ map: wetT, transparent: true, roughness: 0.25, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), [0, 0, z0 + 0.003]) as THREE.Mesh; this.wet.renderOrder = 2; this.wet.scale.y = 0.001; R.add(this.wet);
    // salt crystals on the surface ring (bigger cubes for the macro), raindrops, glowing chloride particles
    this.crystals = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.15, transmission: 0.3, thickness: 0.01, emissive: "#ffffff", emissiveIntensity: 0.1 }), 500);
    this.crystals.castShadow = true; R.add(this.crystals);
    this.drops = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.002, 0.004, 0.09, 6), new THREE.MeshStandardMaterial({ color: "#d8ecff", roughness: 0.05, transparent: true, opacity: 0.65 }), 300); this.drops.castShadow = false; this.drops.frustumCulled = false; R.add(this.drops);
    this.beads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.011, 10, 8), new THREE.MeshPhysicalMaterial({ color: "#bfe2ff", roughness: 0.05, transmission: 0.2, transparent: true, opacity: 0.85, emissive: "#3a6a9a", emissiveIntensity: 0.25 }), 200); this.beads.frustumCulled = false; R.add(this.beads);
    this.ions = new THREE.InstancedMesh(new THREE.SphereGeometry(0.014, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.95, 1.6), toneMapped: false }), 240); this.ions.frustumCulled = false; this.ions.layers.set(NOINK); R.add(this.ions);
  }
  update(t: number) { if (this.motes) this.motes.position.set(0.05 * Math.sin(t * 0.21), 0.04 * Math.sin(t * 0.17) + ((0.015 * t) % 0.3), 0.04 * Math.cos(t * 0.19)); }
}

/** a coconut frond: an arched midrib with ~2 x 64 narrow leaflets (instanced), green (dry 0) to straw-brown (dry 1).
 *  Built along +x from the base at the origin, lying flat with the leaflets drooping. */
export const mkFrond = (dry: number, len = 3.6) => {
  const G = new THREE.Group(); const cA = new THREE.Color("#5f8a2e"), cB = new THREE.Color("#b88e4c"), cC = new THREE.Color("#7a5530");
  const rach = new THREE.CatmullRomCurve3([V(0, 0.02, 0), V(len * 0.3, 0.16, 0), V(len * 0.65, 0.14, 0), V(len, 0.02, 0)]);
  const rm = new THREE.MeshStandardMaterial({ color: new THREE.Color().lerpColors(new THREE.Color("#8aa04a"), new THREE.Color("#a8824a"), dry), roughness: 0.75 });
  const tube = new THREE.Mesh(new THREE.TubeGeometry(rach, 24, 0.028, 7), rm); tube.castShadow = tube.receiveShadow = true; G.add(tube);
  const lg = new THREE.PlaneGeometry(1, 0.04, 6, 1).translate(0.5, 0, 0); const pa = lg.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pa.count; i++) { const x = pa.getX(i); pa.setY(i, pa.getY(i) * (1 - 0.7 * x)); pa.setZ(i, -0.18 * x * x); } lg.computeVertexNormals();
  const N = 64, im = new THREE.InstancedMesh(lg, new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.8, side: THREE.DoubleSide }), N * 2); im.castShadow = im.receiveShadow = true;
  const T = new THREE.Matrix4(), q = new THREE.Quaternion(), C = new THREE.Color(); let k = 0;
  for (let i = 0; i < N; i++) { const u = 0.1 + 0.88 * (i / (N - 1)), p = rach.getPoint(u), L = 0.2 + 0.62 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 0.7);
    for (const sd of [-1, 1]) { q.setFromEuler(new THREE.Euler(-Math.PI / 2 + sd * 0.25 - 0.35, 0, sd * (Math.PI / 2 - 0.55) + 0.06 * Math.sin(i * 7.1), "XZY")); T.compose(p, q, V(L, 1, 1)); im.setMatrixAt(k, T);
      const h = 0.5 + 0.5 * Math.sin(i * 12.9 + sd * 3); C.lerpColors(cA, cB, Math.min(1, dry * (0.8 + 0.3 * h))); if (dry > 0.5 && h > 0.75) C.lerp(cC, 0.6); im.setColorAt(k++, C); } }
  G.add(im); return G;
};
/** a phone: rounded dark body and a lit screen showing an image search (pictures of salted, dead grass; no text) */
export const mkPhone = () => {
  const G = new THREE.Group(), body = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.155, 0.009, 3, 0.007), new THREE.MeshStandardMaterial({ color: "#1b1d24", roughness: 0.32, metalness: 0.4 }));
  body.castShadow = true; G.add(body);
  const tex = canvasTex(272, 584, (g) => { g.fillStyle = "#f7f8fa"; g.fillRect(0, 0, 272, 584); g.fillStyle = "#e4e7ec"; g.beginPath(); g.roundRect(16, 34, 240, 34, 17); g.fill();
    g.strokeStyle = "#7a808a"; g.lineWidth = 3; g.beginPath(); g.arc(36, 51, 7, 0, 7); g.stroke(); g.beginPath(); g.moveTo(41, 56); g.lineTo(47, 62); g.stroke();
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { const x = 16 + c * 124, y = 86 + r * 160, w = 116, h = 150; g.save(); g.beginPath(); g.roundRect(x, y, w, h, 8); g.clip();
      const sky = g.createLinearGradient(0, y, 0, y + h); sky.addColorStop(0, "#a8c8e8"); sky.addColorStop(0.45, "#dfe8ee"); sky.addColorStop(0.46, "#9a7a4a"); sky.addColorStop(1, "#6a5034"); g.fillStyle = sky; g.fillRect(x, y, w, h);
      for (let i = 0; i < 70; i++) { const gx = x + rnd() * w, gy = y + h * 0.5 + rnd() * h * 0.5; g.strokeStyle = rnd() > 0.3 ? "#c8a860" : "#8a6a3a"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + (rnd() - 0.5) * 8, gy - 6 - rnd() * 14); g.stroke(); }
      if ((r + c) % 2 === 0) { g.fillStyle = "#fbfbf6"; g.beginPath(); g.ellipse(x + w * 0.5, y + h * 0.8, 30, 12, 0, Math.PI, 0); g.fill(); for (let i = 0; i < 40; i++) { g.fillRect(x + w * 0.5 + (rnd() - 0.5) * 70, y + h * 0.8 + rnd() * 10, 2, 2); } }
      g.restore(); } });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.146), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(1.25, 1.25, 1.3) })); screen.position.z = 0.0048; G.add(screen);
  return G;
};
