// Pak Budi's bedroom at 3 a.m. (S2) and at bedtime (S8b), rebuilt with real detail: plank walls with skirting and
// beams, a side window whose moonlight falls across the pillow (real shadow of the window bars), curtains with folds,
// a carved bed with mattress, sheet, pillow, bolster and a draped blanket over his body (his head is a billboard card
// on the pillow, so nothing can poke through the blanket), nightstand with a warm night lamp, a water glass, phone and
// glasses, a 3D wall clock (rim, glass, real hands), a hanging calendar, wardrobe with a mirror, shelf with a framed
// photo and a radio, rug and slippers, a standing fan, dust in the moon shaft.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { woodPlanks, plaster, curtain, shaftTex, rnd, fbm } from "../../lib/world2/textures";
import { std, canvasTex, LiveTex, markerCircle } from "./sets";

type V3 = [number, number, number];
const mat = (c: string, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
const M = (geo: THREE.BufferGeometry, m: THREE.Material) => new THREE.Mesh(geo, m);
const rbox = (w: number, h: number, d: number, r = 0.02) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.1, h / 2.1, d / 2.1));
const put = <T extends THREE.Object3D>(g: THREE.Object3D, o: T, p: V3, r: V3 = [0, 0, 0], cast = true): T => { o.position.set(...p); o.rotation.set(...r); o.traverse((k) => { if ((k as THREE.Mesh).isMesh) { k.castShadow = cast; k.receiveShadow = true; } }); g.add(o); return o; };

const fabric = (base: [number, number, number], lines: [number, number, number], step: number, key: string) => {
  const t = canvasTex(512, 512, (g) => {
    for (let y = 0; y < 512; y += 2) for (let x = 0; x < 512; x += 2) { const n = fbm(x, y, 512, 64, 2) * 0.12; g.fillStyle = `rgb(${base[0] * (1 + n)},${base[1] * (1 + n)},${base[2] * (1 + n)})`; g.fillRect(x, y, 2, 2); }
    g.globalAlpha = 0.55; g.fillStyle = `rgb(${lines})`; for (let i = 0; i < 512; i += step) { g.fillRect(i + step * 0.3, 0, step * 0.12, 512); g.fillRect(0, i + step * 0.3, 512, step * 0.12); }
    g.globalAlpha = 0.25; for (let i = 0; i < 512; i += step) { g.fillRect(i + step * 0.62, 0, step * 0.04, 512); g.fillRect(0, i + step * 0.62, 512, step * 0.04); } g.globalAlpha = 1;
    void key;
  }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
};

export const drawClockFace = (g: CanvasRenderingContext2D, w: number) => {
  const c = w / 2; const gr = g.createRadialGradient(c, c * 0.8, c * 0.1, c, c, c); gr.addColorStop(0, "#fbf6e8"); gr.addColorStop(1, "#e6dcc4"); g.fillStyle = gr; g.fillRect(0, 0, w, w);
  g.strokeStyle = "#2b2420"; for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2, big = i % 5 === 0; g.lineWidth = big ? w * 0.012 : w * 0.005; g.beginPath(); g.moveTo(c + Math.sin(a) * c * (big ? 0.8 : 0.85), c - Math.cos(a) * c * (big ? 0.8 : 0.85)); g.lineTo(c + Math.sin(a) * c * 0.92, c - Math.cos(a) * c * 0.92); g.stroke(); }
  g.fillStyle = "#231c18"; g.font = `600 ${c * 0.2}px Georgia, 'Times New Roman', serif`; g.textAlign = "center"; g.textBaseline = "middle";
  for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillText(String(i), c + Math.sin(a) * c * 0.66, c - Math.cos(a) * c * 0.66); }
  g.font = `italic ${c * 0.07}px Georgia, serif`; g.fillStyle = "#6a4a3a"; g.fillText("SEIKO-JAYA", c, c * 1.42); g.fillText("QUARTZ", c, c * 1.52);
};
export const drawCalendar = (g: CanvasRenderingContext2D, w: number, h: number, p: number) => {
  const k = w / 320;
  g.fillStyle = "#f7f1e3"; g.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(120,100,70,${rnd() * 0.05})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
  g.fillStyle = "#b8312c"; g.fillRect(0, 0, w, 72 * k); g.fillStyle = "#fff"; g.font = `bold ${34 * k}px 'Helvetica Neue', Arial, sans-serif`; g.textAlign = "center"; g.fillText("NOVEMBER 2026", w / 2, 48 * k);
  g.fillStyle = "#2b1a26"; g.font = `bold ${130 * k}px Georgia, serif`; g.fillText("14", w / 2, 210 * k); g.font = `bold ${30 * k}px 'Helvetica Neue', Arial, sans-serif`; g.fillText("SABTU", w / 2, 252 * k);
  g.fillStyle = "#8a7a6a"; g.font = `${17 * k}px 'Helvetica Neue', Arial, sans-serif`; g.fillText("Jadwal tidur:", w / 2, 296 * k);
  g.font = `bold ${48 * k}px 'Helvetica Neue', Arial, sans-serif`; g.fillStyle = "#3a2a30"; g.fillText("21.00", w / 2, 345 * k);
  if (p > 0.85) { g.fillStyle = `rgba(214,30,40,${Math.min(1, (p - 0.85) / 0.15)})`; g.font = `italic bold ${34 * k}px 'Marker Felt', 'Comic Sans MS', sans-serif`; g.fillText("TIDUR!", w / 2, 400 * k); }
  markerCircle(g, w / 2, 332 * k, 108 * k, 48 * k, Math.min(1, p / 0.85), 8 * k);
  g.strokeStyle = "rgba(0,0,0,0.12)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 74 * k); g.lineTo(w, 74 * k); g.stroke();
};

export class KamarSet {
  root = new THREE.Group(); sunDir = new THREE.Vector3();
  moon = new THREE.DirectionalLight("#a8bcff", 6.0); hemi = new THREE.HemisphereLight("#5a6aa0", "#2a2024", 0.55);
  nightLamp = new THREE.PointLight("#ffb46a", 1.6, 4.5, 1.6);
  hands: { h: THREE.Object3D; m: THREE.Object3D; s: THREE.Object3D } ; calendar: LiveTex; fanBlades: THREE.Group;
  // anchors the film uses
  pillowHead: V3 = [-0.6, 0.81, -1.6]; footOfBed: V3 = [-0.6, 0, 0.45]; clockAt: V3 = [1.25, 2.0, -1.93]; calAt: V3 = [1.25, 1.3, -1.935];
  private dust: THREE.Points; private dustBase: Float32Array; blanket!: THREE.Mesh; private blBase!: Float32Array; private blChest!: Float32Array;
  constructor() {
    const R = this.root;
    const X0 = -2.2, X1 = 2.2, Z0 = -2.0, Z1 = 2.0, H = 2.8;
    // ---------- shell ----------
    const wallM = std(woodPlanks("#8c6646", 9, "kw"), [2.2, 1]), floorM = std(woodPlanks("#5e3f28", 12, "kf"), [2.5, 2.5], { roughness: 0.55 }), trim = std(woodPlanks("#4a2e1c", 2, "kt"), [3, 1]);
    put(R, M(new THREE.BoxGeometry(X1 - X0, 0.1, Z1 - Z0), floorM), [0, -0.05, 0]);
    put(R, M(new THREE.BoxGeometry(X1 - X0, 0.12, Z1 - Z0), std(woodPlanks("#5a4434", 14, "kc"), [2, 2])), [0, H + 0.06, 0]);
    for (const x of [-1.1, 0, 1.1]) put(R, M(new THREE.BoxGeometry(0.14, 0.18, Z1 - Z0), trim), [x, H - 0.09, 0]);
    put(R, M(new THREE.BoxGeometry(X1 - X0, H, 0.12), wallM), [0, H / 2, Z0 - 0.06]); // back
    put(R, M(new THREE.BoxGeometry(0.12, H, Z1 - Z0), wallM), [X1 + 0.06, H / 2, 0]); // right
    put(R, M(new THREE.BoxGeometry(X1 - X0, H, 0.12), wallM), [0, H / 2, Z1 + 0.06]); // front (behind camera)
    // left wall with the window hole: z -1.5..-0.4, y 1.0..2.05
    const WZ0 = -1.5, WZ1 = -0.4, WY0 = 1.0, WY1 = 2.05;
    put(R, M(new THREE.BoxGeometry(0.12, H, WZ0 - Z0), wallM), [X0 - 0.06, H / 2, (Z0 + WZ0) / 2]);
    put(R, M(new THREE.BoxGeometry(0.12, H, Z1 - WZ1), wallM), [X0 - 0.06, H / 2, (WZ1 + Z1) / 2]);
    put(R, M(new THREE.BoxGeometry(0.12, WY0, WZ1 - WZ0), wallM), [X0 - 0.06, WY0 / 2, (WZ0 + WZ1) / 2]);
    put(R, M(new THREE.BoxGeometry(0.12, H - WY1, WZ1 - WZ0), wallM), [X0 - 0.06, (WY1 + H) / 2, (WZ0 + WZ1) / 2]);
    // skirting + top trims
    for (const [w, d, p] of [[X1 - X0, 0.03, [0, 0.07, Z0 + 0.015]], [0.03, Z1 - Z0, [X1 - 0.015, 0.07, 0]], [0.03, Z1 - Z0, [X0 + 0.015, 0.07, 0]]] as [number, number, V3][]) put(R, M(new THREE.BoxGeometry(w, 0.14, d), trim), p);
    // window frame, bars, sill, glass, curtains
    const fr = std(woodPlanks("#3e2616", 2, "kwf"), [1, 1]), wz = (WZ0 + WZ1) / 2, wy = (WY0 + WY1) / 2;
    for (const z of [WZ0, wz, WZ1]) put(R, M(new THREE.BoxGeometry(0.16, WY1 - WY0, 0.06), fr), [X0, wy, z]);
    for (const y of [WY0, wy, WY1]) put(R, M(new THREE.BoxGeometry(0.16, 0.06, WZ1 - WZ0 + 0.06), fr), [X0, y, wz]);
    put(R, M(rbox(0.26, 0.05, WZ1 - WZ0 + 0.3, 0.01), fr), [X0 + 0.08, WY0 - 0.04, wz]);
    for (let k = 0; k < 5; k++) put(R, M(new THREE.CylinderGeometry(0.012, 0.012, WY1 - WY0, 6), mat("#2a2a2a", { metalness: 0.7, roughness: 0.4 })), [X0 - 0.04, wy, WZ0 + 0.12 + k * 0.215]);
    const glass = new THREE.MeshPhysicalMaterial({ color: "#a8b8d8", roughness: 0.05, metalness: 0, transparent: true, opacity: 0.12, clearcoat: 1 });
    put(R, M(new THREE.PlaneGeometry(WZ1 - WZ0, WY1 - WY0), glass), [X0 - 0.02, wy, wz], [0, Math.PI / 2, 0], false);
    const curtM = std(curtain(), [1.5, 1], { side: THREE.DoubleSide, color: "#d8c8e8" });
    const curt = (z: number, w: number, gather: number) => { const g = new THREE.PlaneGeometry(w, 1.55, 40, 12); const pa = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i); pa.setZ(i, (0.035 + gather * 0.03) * Math.sin(x * (24 + gather * 20)) + 0.02 * Math.sin(y * 3)); } g.computeVertexNormals(); return put(R, M(g, curtM), [X0 + 0.14, 1.55, z], [0, Math.PI / 2, 0], true); };
    curt(WZ0 - 0.18, 0.55, 1); curt(WZ1 + 0.22, 0.6, 1);
    put(R, M(new THREE.CylinderGeometry(0.018, 0.018, WZ1 - WZ0 + 1.2, 8), mat("#6a4a2a", { metalness: 0.4 })), [X0 + 0.16, 2.35, wz], [Math.PI / 2, 0, 0]);
    // outside the window: sky, moon, a tree silhouette, neighbour roof
    const sky = M(new THREE.PlaneGeometry(14, 9), new THREE.MeshBasicMaterial({ fog: false, map: canvasTex(256, 512, (g) => { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#081030"); gr.addColorStop(1, "#33467e"); g.fillStyle = gr; g.fillRect(0, 0, 256, 512); g.fillStyle = "#fff"; for (let i = 0; i < 80; i++) g.fillRect(rnd() * 256, rnd() * 320, 1.4, 1.4); }) }));
    put(R, sky, [X0 - 6, 2.5, -1], [0, Math.PI / 2, 0], false);
    const moonD = M(new THREE.CircleGeometry(0.45, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.6, 2.7), fog: false })); put(R, moonD, [X0 - 5.9, 4.1, -1.2], [0, Math.PI / 2, 0], false);
    const treeSil = M(new THREE.PlaneGeometry(4, 5), new THREE.MeshBasicMaterial({ transparent: true, fog: false, map: canvasTex(256, 320, (g) => { g.fillStyle = "#070a14"; g.fillRect(118, 140, 22, 180); for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(70 + rnd() * 120, 40 + rnd() * 120, 24 + rnd() * 30, 18 + rnd() * 22, 0, 0, 6.3); g.fill(); } }) }));
    put(R, treeSil, [X0 - 4, 2.6, 0.6], [0, Math.PI / 2, 0], false);
    // ---------- bed ----------
    const bedW = std(woodPlanks("#6a3f24", 4, "kbed"), [1, 1], { roughness: 0.45 }), bx = -0.6;
    put(R, M(rbox(1.5, 0.22, 2.1, 0.03), bedW), [bx, 0.28, -0.95]);
    for (const a of [-0.7, 0.7]) for (const b of [-1.95, 0.05]) put(R, M(rbox(0.09, 0.2, 0.09, 0.02), bedW), [bx + a, 0.1, b]);
    put(R, M(rbox(1.62, 1.05, 0.07, 0.025), bedW), [bx, 0.75, -1.95]);
    for (const a of [-0.81, 0.81]) { put(R, M(new THREE.CylinderGeometry(0.05, 0.055, 1.25, 12), bedW), [bx + a, 0.62, -1.95]); put(R, M(new THREE.SphereGeometry(0.07, 14, 10), bedW), [bx + a, 1.3, -1.95]); }
    put(R, M(new THREE.CylinderGeometry(0.04, 0.04, 1.62, 12), bedW), [bx, 1.27, -1.94], [0, 0, Math.PI / 2]);
    for (let k = 0; k < 4; k++) put(R, M(rbox(0.22, 0.6, 0.02, 0.01), mat("#4e2c18", { roughness: 0.5 })), [bx - 0.54 + k * 0.36, 0.82, -1.91]);
    put(R, M(rbox(1.62, 0.32, 0.06, 0.02), bedW), [bx, 0.42, 0.08]); // footboard
    put(R, M(rbox(1.42, 0.2, 1.98, 0.06), mat("#e9e4da", { roughness: 0.95 })), [bx, 0.47, -0.95]); // mattress + sheet
    const pillowG = rbox(0.74, 0.15, 0.4, 0.07); { const pa = pillowG.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i); pa.setY(i, y * (1 - 0.5 * Math.exp(-(x * x) / 0.03 - (z * z) / 0.02)) + 0.008 * Math.sin(x * 40)); } pillowG.computeVertexNormals(); }
    put(R, M(pillowG, new THREE.MeshStandardMaterial({ map: fabric([232, 236, 244], [150, 170, 210], 64, "pil"), roughness: 0.9 })), [bx, 0.64, -1.6], [0.12, 0, 0]);
    put(R, M(new THREE.CapsuleGeometry(0.11, 0.75, 8, 16), new THREE.MeshStandardMaterial({ map: fabric([236, 226, 210], [190, 120, 90], 48, "gul"), roughness: 0.9 })), [bx + 0.52, 0.66, -0.95], [Math.PI / 2, 0, 0.05]); // guling
    // blanket: draped over the body from the chest down, hanging over both sides and the foot
    { const bw = 1.7, bl = 1.6, g = new THREE.PlaneGeometry(bw, bl, 80, 80); g.rotateX(-Math.PI / 2); const pa = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), z = pa.getZ(i), ax = Math.abs(x), zr = (z + bl / 2) / bl; // zr 0 = chest edge
        const body = 0.11 * Math.exp(-((x + 0.02) ** 2) / 0.045) * (zr < 0.55 ? 1 : Math.exp(-((zr - 0.55) ** 2) / 0.05)) + 0.06 * Math.exp(-((x + 0.09) ** 2) / 0.01 - ((zr - 0.8) ** 2) / 0.006) + 0.06 * Math.exp(-((x - 0.09) ** 2) / 0.01 - ((zr - 0.8) ** 2) / 0.006);
        let y = 0.6 + body + 0.006 * Math.sin(x * 23 + z * 7) + 0.012 * Math.sin(z * 9 - x * 4) * (ax / 0.8);
        if (ax > 0.7) { const o = ax - 0.7; y = 0.6 - o * 2.2 + 0.03 * Math.sin(z * 16); pa.setX(i, Math.sign(x) * (0.71 + o * 0.08)); }
        if (zr > 0.97) { const o = (zr - 0.97) * bl; y -= o * 6; }
        pa.setY(i, y); }
      g.computeVertexNormals(); const bm = new THREE.MeshStandardMaterial({ map: fabric([168, 44, 48], [240, 214, 170], 80, "blk"), roughness: 0.92, side: THREE.DoubleSide }); bm.map!.repeat.set(2, 2);
      this.blanket = put(R, M(g, bm), [bx, 0, -0.62]); this.blBase = (g.attributes.position.array as Float32Array).slice();
      this.blChest = new Float32Array(pa.count); for (let i = 0; i < pa.count; i++) { const x = this.blBase[i * 3], z = this.blBase[i * 3 + 2], zr = (z + bl / 2) / bl; this.blChest[i] = Math.exp(-((x + 0.02) ** 2) / 0.05 - ((zr - 0.16) ** 2) / 0.012); }
      // folded white sheet cuff at the chest
      put(R, M(new THREE.CapsuleGeometry(0.035, 1.3, 6, 12), mat("#f1efe9", { roughness: 0.9 })), [bx, 0.63, -1.41], [0, 0, Math.PI / 2]);
    }
    // ---------- nightstand: lamp, glass, phone, glasses, book ----------
    const ns = new THREE.Group(); put(R, ns, [0.55, 0, -1.68]);
    put(ns, M(rbox(0.5, 0.56, 0.42, 0.02), bedW), [0, 0.28, 0]); put(ns, M(rbox(0.42, 0.16, 0.02, 0.01), mat("#5a3420", { roughness: 0.45 })), [0, 0.4, 0.215]); put(ns, M(new THREE.SphereGeometry(0.018, 10, 8), mat("#c9a24a", { metalness: 0.9, roughness: 0.25 })), [0, 0.4, 0.23]);
    put(ns, M(new THREE.CylinderGeometry(0.06, 0.08, 0.04, 20), mat("#c9b48a", { metalness: 0.6, roughness: 0.3 })), [-0.12, 0.58, -0.05]); put(ns, M(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), mat("#c9b48a", { metalness: 0.6, roughness: 0.3 })), [-0.12, 0.7, -0.05]);
    put(ns, M(new THREE.CylinderGeometry(0.07, 0.12, 0.14, 24, 1, true), new THREE.MeshStandardMaterial({ color: "#f6e2c0", emissive: "#ffb46a", emissiveIntensity: 0.9, side: THREE.DoubleSide, roughness: 0.9 })), [-0.12, 0.83, -0.05], [0, 0, 0], false);
    this.nightLamp.position.set(0.43, 0.82, -1.73); this.nightLamp.castShadow = true; this.nightLamp.shadow.mapSize.set(1024, 1024); this.nightLamp.shadow.bias = -0.002; R.add(this.nightLamp);
    const glassM = new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.03, transmission: 0.95, thickness: 0.02, ior: 1.45, transparent: true });
    const gp = [new THREE.Vector2(0.0, 0), new THREE.Vector2(0.034, 0), new THREE.Vector2(0.036, 0.005), new THREE.Vector2(0.042, 0.13), new THREE.Vector2(0.038, 0.13), new THREE.Vector2(0.032, 0.008), new THREE.Vector2(0.0, 0.008)];
    put(ns, M(new THREE.LatheGeometry(gp, 32), glassM), [0.12, 0.56, 0.06]);
    put(ns, M(new THREE.CylinderGeometry(0.035, 0.032, 0.085, 32), new THREE.MeshPhysicalMaterial({ color: "#cfe4f2", roughness: 0.02, transmission: 0.9, thickness: 0.06, ior: 1.33, transparent: true })), [0.12, 0.608, 0.06]);
    put(ns, M(rbox(0.075, 0.009, 0.15, 0.006), mat("#111318", { metalness: 0.5, roughness: 0.25 })), [0.05, 0.566, -0.1], [0, 0.4, 0]);
    for (const s of [-1, 1]) put(ns, M(new THREE.TorusGeometry(0.022, 0.003, 6, 20), mat("#222", { metalness: 0.6 })), [-0.02 + s * 0.026, 0.568, 0.12], [Math.PI / 2, 0, 0]);
    put(ns, M(rbox(0.13, 0.025, 0.18, 0.004), mat("#2f5a7a")), [-0.13, 0.573, 0.1], [0, -0.3, 0]);
    // ---------- wall clock (3D) + calendar ----------
    { const g = new THREE.Group(); put(R, g, this.clockAt);
      put(g, M(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 48), mat("#3a2414", { roughness: 0.4 })), [0, 0, 0.025], [Math.PI / 2, 0, 0]);
      put(g, M(new THREE.TorusGeometry(0.245, 0.022, 12, 48), mat("#b08a4a", { metalness: 0.85, roughness: 0.25 })), [0, 0, 0.052]);
      const face = M(new THREE.CircleGeometry(0.228, 64), new THREE.MeshStandardMaterial({ map: canvasTex(1024, 1024, (c) => drawClockFace(c, 1024)), roughness: 0.6 })); put(g, face, [0, 0, 0.051], [0, 0, 0], false);
      const hand = (len: number, w: number, c: string, z: number) => { const p = new THREE.Group(); p.position.z = z; const m = M(rbox(w, len, 0.004, w / 2.2), mat(c, { metalness: 0.4, roughness: 0.4 })); m.position.y = len * 0.38; m.castShadow = true; p.add(m); g.add(p); return p; };
      this.hands = { h: hand(0.13, 0.016, "#1d1814", 0.056), m: hand(0.19, 0.011, "#1d1814", 0.059), s: hand(0.2, 0.004, "#c0353a", 0.062) };
      put(g, M(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 16), mat("#b08a4a", { metalness: 0.9, roughness: 0.2 })), [0, 0, 0.064], [Math.PI / 2, 0, 0]);
      put(g, M(new THREE.CircleGeometry(0.232, 48), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, map: canvasTex(256, 256, (c) => { const gr = c.createLinearGradient(40, 0, 216, 256); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.32, "rgba(0,0,0,0)"); gr.addColorStop(0.38, "rgba(120,140,190,0.35)"); gr.addColorStop(0.5, "rgba(60,70,110,0.12)"); gr.addColorStop(0.56, "rgba(0,0,0,0)"); c.fillStyle = gr; c.fillRect(0, 0, 256, 256); }) })), [0, 0, 0.07], [0, 0, 0], false);
    }
    this.calendar = new LiveTex(640, 840);
    { const g = new THREE.Group(); put(R, g, this.calAt); const pg = new THREE.PlaneGeometry(0.42, 0.55, 12, 12); const pa = pg.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i); pa.setZ(i, 0.004 + (y < -0.18 ? 0.25 * (y + 0.18) ** 2 * (1 + x) * 6 : 0)); } pg.computeVertexNormals();
      put(g, M(pg, new THREE.MeshStandardMaterial({ map: this.calendar.tex, roughness: 0.9, side: THREE.DoubleSide })), [0, 0, 0.005]);
      put(g, M(new THREE.CylinderGeometry(0.006, 0.006, 0.04, 6), mat("#888", { metalness: 0.8 })), [0, 0.36, 0.02], [Math.PI / 2, 0, 0]);
      for (const s of [-1, 1]) put(g, M(new THREE.CylinderGeometry(0.0015, 0.0015, 0.13, 4), mat("#ddd")), [s * 0.05, 0.31, 0.012], [0, 0, s * 0.85]);
      put(g, M(new THREE.BoxGeometry(0.43, 0.02, 0.012), mat("#b8312c")), [0, 0.275, 0.01]);
    }
    // ---------- wardrobe with a mirror door ----------
    { const g = new THREE.Group(); put(R, g, [X1 - 0.32, 0, -0.75], [0, -Math.PI / 2, 0]); const wd = std(woodPlanks("#5a3420", 3, "kwd"), [1, 2], { roughness: 0.45 });
      put(g, M(rbox(1.2, 2.0, 0.58, 0.02), wd), [0, 1.0, 0]); put(g, M(rbox(1.28, 0.08, 0.64, 0.02), wd), [0, 2.03, 0]);
      for (const s of [-1, 1]) { put(g, M(rbox(0.56, 1.7, 0.03, 0.01), mat("#4a2a18", { roughness: 0.4 })), [s * 0.29, 1.05, 0.3]); put(g, M(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8), mat("#c9a24a", { metalness: 0.9, roughness: 0.2 })), [s * 0.05, 1.05, 0.33]); }
      put(g, M(new THREE.PlaneGeometry(0.42, 1.4), new THREE.MeshStandardMaterial({ color: "#c8d2dc", metalness: 1, roughness: 0.03 })), [-0.29, 1.08, 0.318], [0, 0, 0], false);
      put(g, M(rbox(0.6, 0.3, 0.4, 0.03), mat("#6a5038", { roughness: 0.7 })), [0.2, 2.22, -0.02], [0, 0.15, 0]);
    }
    // ---------- shelf: framed photo, radio, plant ----------
    { const g = new THREE.Group(); put(R, g, [-0.6, 1.72, -1.86]); put(g, M(rbox(1.0, 0.04, 0.2, 0.01), bedW), [0, 0, 0]);
      const photo = canvasTex(256, 200, (c) => { c.fillStyle = "#c8b89a"; c.fillRect(0, 0, 256, 200); const gr = c.createLinearGradient(0, 0, 0, 200); gr.addColorStop(0, "#a8c0d0"); gr.addColorStop(1, "#d8c8a8"); c.fillStyle = gr; c.fillRect(14, 14, 228, 172); for (const [x, s] of [[80, 1], [140, 0.95], [190, 0.6]] as [number, number][]) { c.fillStyle = "#fbf9f6"; c.beginPath(); c.arc(x, 90 - 20 * s, 26 * s, 0, 6.3); c.fill(); c.fillStyle = ["#7a2a33", "#2f6f78", "#e0b84a"][Math.round(x / 70) % 3]; c.fillRect(x - 22 * s, 116 - 20 * s, 44 * s, 70 * s); } });
      put(g, M(rbox(0.26, 0.21, 0.025, 0.006), mat("#c9a24a", { metalness: 0.6, roughness: 0.35 })), [-0.25, 0.13, 0.0], [-0.12, 0, 0]); put(g, M(new THREE.PlaneGeometry(0.22, 0.17), new THREE.MeshStandardMaterial({ map: photo, roughness: 0.4 })), [-0.25, 0.13, 0.014], [-0.12, 0, 0], false);
      put(g, M(rbox(0.3, 0.16, 0.1, 0.02), mat("#3a3028", { roughness: 0.5 })), [0.15, 0.1, 0]); put(g, M(new THREE.CircleGeometry(0.05, 20), mat("#1a1a1a")), [0.08, 0.1, 0.051], [0, 0, 0], false); put(g, M(rbox(0.08, 0.04, 0.01, 0.004), mat("#d8c890", { emissive: "#806020", emissiveIntensity: 0.3 })), [0.21, 0.12, 0.051]);
      put(g, M(new THREE.CylinderGeometry(0.05, 0.04, 0.08, 14), mat("#a8583a")), [0.42, 0.06, 0]); for (let k = 0; k < 7; k++) put(g, M(new THREE.ConeGeometry(0.012, 0.22, 5), mat("#3f7a3a")), [0.42 + Math.sin(k) * 0.025, 0.2, Math.cos(k) * 0.02], [Math.sin(k * 2) * 0.3, 0, Math.cos(k * 2) * 0.3]);
    }
    // ---------- rug, slippers, standing fan, hanging lamp, clothes on the door ----------
    put(R, M(new THREE.CircleGeometry(0.75, 48), new THREE.MeshStandardMaterial({ map: fabric([150, 96, 60], [220, 190, 130], 40, "rug"), roughness: 1 })), [0.5, 0.004, -0.5], [-Math.PI / 2, 0, 0], false).scale.set(1, 0.65, 1);
    for (const [x, z, r] of [[0.3, -0.75, 0.2], [0.45, -0.7, 0.1]] as V3[]) put(R, M(rbox(0.11, 0.03, 0.27, 0.012), mat("#2a4a7a", { roughness: 0.7 })), [x, 0.02, z], [0, r, 0]);
    { const f = new THREE.Group(); put(R, f, [-1.75, 0, 0.6], [0, 0.9, 0]); put(f, M(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 24), mat("#e8e6e0")), [0, 0.03, 0]); put(f, M(new THREE.CylinderGeometry(0.018, 0.018, 1.1, 8), mat("#d8d8d8", { metalness: 0.5 })), [0, 0.58, 0]);
      const head = new THREE.Group(); head.position.set(0, 1.18, 0); f.add(head); put(head, M(new THREE.TorusGeometry(0.21, 0.008, 6, 40), mat("#ccc", { metalness: 0.6 })), [0, 0, 0.04]); for (let k = 0; k < 12; k++) put(head, M(new THREE.TorusGeometry(0.21, 0.003, 4, 20, Math.PI), mat("#ccc", { metalness: 0.6 })), [0, 0, 0.04], [0, 0, (k / 12) * Math.PI]);
      put(head, M(new THREE.SphereGeometry(0.08, 16, 10), mat("#e8e6e0")), [0, 0, -0.08]); this.fanBlades = new THREE.Group(); head.add(this.fanBlades); for (let k = 0; k < 3; k++) put(this.fanBlades, M(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshStandardMaterial({ color: "#6fb0d8", transparent: true, opacity: 0.85 })), [Math.cos(k * 2.09) * 0.1, Math.sin(k * 2.09) * 0.1, 0.0], [0, 0, k * 2.09]).scale.set(1, 0.45, 0.12); }
    put(R, M(new THREE.CylinderGeometry(0.004, 0.004, 0.6, 4), mat("#111")), [0.2, H - 0.3, -0.3]); put(R, M(new THREE.ConeGeometry(0.16, 0.12, 24, 1, true), mat("#e8e0d0", { side: THREE.DoubleSide })), [0.2, H - 0.62, -0.3]); put(R, M(new THREE.SphereGeometry(0.04, 12, 8), mat("#f4f0e0", { roughness: 0.2 })), [0.2, H - 0.66, -0.3]);
    { const g = new THREE.Group(); put(R, g, [X1 - 0.03, 0, 1.0], [0, -Math.PI / 2, 0]); put(g, M(rbox(0.95, 2.05, 0.05, 0.01), std(woodPlanks("#5d3a22", 3, "kdr"), [1, 1])), [0, 1.03, 0]);
      put(g, M(new THREE.SphereGeometry(0.03, 10, 8), mat("#c9a24a", { metalness: 0.8, roughness: 0.3 })), [0.36, 1.0, 0.05]);
      const shirt = canvasTex(256, 320, (c) => { c.fillStyle = "#3a6a8a"; c.beginPath(); c.moveTo(60, 20); c.lineTo(196, 20); c.lineTo(250, 90); c.lineTo(210, 120); c.lineTo(200, 300); c.lineTo(56, 300); c.lineTo(46, 120); c.lineTo(6, 90); c.closePath(); c.fill(); c.strokeStyle = "rgba(255,255,255,0.25)"; c.lineWidth = 4; for (let y = 40; y < 300; y += 26) { c.beginPath(); c.moveTo(56, y); c.lineTo(200, y); c.stroke(); } });
      put(g, M(new THREE.PlaneGeometry(0.5, 0.62), new THREE.MeshStandardMaterial({ map: shirt, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 })), [-0.1, 1.45, 0.06], [0.05, 0, 0.04]);
      put(g, M(new THREE.CylinderGeometry(0.01, 0.01, 0.06, 6), mat("#888", { metalness: 0.8 })), [-0.1, 1.78, 0.04], [Math.PI / 2, 0, 0]);
    }
    // ---------- light ----------
    this.moon.position.set(-7.5, 5.6, -0.95); this.moon.target.position.set(-0.6, 0.6, -1.1); this.moon.castShadow = true; this.moon.shadow.mapSize.set(2048, 2048);
    Object.assign(this.moon.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 16 }); this.moon.shadow.bias = -0.0004; this.moon.shadow.normalBias = 0.02; this.moon.shadow.radius = 3;
    this.sunDir.copy(this.moon.position).sub(this.moon.target.position).normalize();
    R.add(this.moon, this.moon.target, this.hemi);
    const bounce = new THREE.PointLight("#7a8ac8", 0.9, 5, 1.5); bounce.position.set(0.6, 1.6, 0.8); R.add(bounce);
    // visible moon shaft + dust motes in it
    const sm = new THREE.MeshBasicMaterial({ map: shaftTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(0.1, 0.13, 0.26), side: THREE.DoubleSide, fog: false });
    const dir = this.sunDir.clone().negate(), len = 3.6;
    for (let k = 0; k < 3; k++) { const s = M(new THREE.PlaneGeometry(0.9 - k * 0.2, len), sm); const mid = new THREE.Vector3(X0, wy, wz + (k - 1) * 0.25).addScaledVector(dir, len / 2); s.position.copy(mid); s.lookAt(mid.clone().add(new THREE.Vector3(0, 0, 1))); s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate()); s.rotateY(k * 1.0); R.add(s); }
    const n = 220, pos = new Float32Array(n * 3); for (let k = 0; k < n; k++) { const u = rnd(); const p = new THREE.Vector3(X0, WY0 + rnd() * (WY1 - WY0), WZ0 + rnd() * (WZ1 - WZ0)).addScaledVector(dir, u * 3.2); pos.set([p.x, p.y, p.z], k * 3); }
    this.dustBase = pos.slice(); const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: "#c8d4ff", size: 0.008, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); R.add(this.dust);
    this.setClock(3, 0, 0); this.setCalendar(0);
  }
  /** the chest under the blanket rises with breath + heartbeat (metres) */
  setChest(lift: number) { const pa = this.blanket.geometry.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pa.count; i++) pa.setY(i, this.blBase[i * 3 + 1] + lift * this.blChest[i]); pa.needsUpdate = true; this.blanket.geometry.computeVertexNormals(); }
  setClock(h: number, m: number, s: number) { const tick = Math.floor(s) + Math.min(1, (s % 1) / 0.08) - 1; this.hands.h.rotation.z = -(((h % 12) + m / 60) / 12) * Math.PI * 2; this.hands.m.rotation.z = -(m / 60) * Math.PI * 2; this.hands.s.rotation.z = -(Math.max(0, tick) / 60) * Math.PI * 2; }
  setCalendar(p: number) { this.calendar.draw("c" + Math.round(p * 80), (g, w, h) => drawCalendar(g, w, h, p)); }
  update(t: number) {
    const pa = this.dust.geometry.attributes.position as THREE.BufferAttribute; for (let k = 0; k < pa.count; k++) pa.setXYZ(k, this.dustBase[k * 3] + 0.03 * Math.sin(t * 0.3 + k), this.dustBase[k * 3 + 1] + 0.04 * Math.sin(t * 0.21 + k * 1.7), this.dustBase[k * 3 + 2] + 0.03 * Math.cos(t * 0.25 + k * 0.9)); pa.needsUpdate = true;
  }
}
