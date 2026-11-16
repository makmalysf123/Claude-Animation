// The three "everyday mystery" rooms at night (S7), with the same detail level as Budi's bedroom:
//  - TamuSet: the living room (sofa, coffee table with jars, TV cabinet, photos, curtains, rug, a hanging bulb that
//    flickers, the wall socket that sparks, a dark hallway doorway where "something" passes)
//  - DapurSet: the kitchen (tiled counter, stove with a rattling pot, rice cooker, dish rack, spice shelf, hanging
//    utensils, sink, fridge, the kerupuk tin the rat raids)
//  - BayiSet: the baby room (crib with a mobile, dresser with diapers, a fan that is OFF, a door that gets kicked open,
//    a window onto the tree where the kunti sits on a branch)
// Every room: plank/plaster walls with skirting and ceiling beams, a moonlit window with curtains, soft shadows.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { woodPlanks, plaster, curtain, stone, rnd, fbm, dirt, grassTuft, bananaLeaf } from "../../lib/world2/textures";
import { std, canvasTex } from "./sets";

type V3 = [number, number, number];
const mat = (c: string, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...o });
const M = (geo: THREE.BufferGeometry, m: THREE.Material | THREE.Material[]) => new THREE.Mesh(geo, m);
const rbox = (w: number, h: number, d: number, r = 0.02) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.1, h / 2.1, d / 2.1));
const put = <T extends THREE.Object3D>(g: THREE.Object3D, o: T, p: V3, r: V3 = [0, 0, 0], cast = true): T => { o.position.set(...p); o.rotation.set(...r); o.traverse((k) => { if ((k as THREE.Mesh).isMesh) { k.castShadow = cast; k.receiveShadow = true; } }); g.add(o); return o; };
const leafTex = (() => { const t = canvasTex(256, 256, (g) => { g.clearRect(0, 0, 256, 256); for (let k = 0; k < 90; k++) { const x = 128 + (rnd() - 0.5) * 210, y = 128 + (rnd() - 0.5) * 210; if ((x - 128) ** 2 + (y - 128) ** 2 > 110 ** 2) continue; const c = 0.6 + rnd() * 0.6; g.fillStyle = `rgb(${34 * c},${70 * c},${36 * c})`; g.save(); g.translate(x, y); g.rotate(rnd() * 6.3); g.beginPath(); g.ellipse(0, 0, 9 + rnd() * 6, 4 + rnd() * 3, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = `rgba(150,190,120,${0.25 * c})`; g.lineWidth = 1; g.beginPath(); g.moveTo(-8, 0); g.lineTo(8, 0); g.stroke(); g.restore(); } }); return t; })();
const leafM = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 });
/** a tree crown of leaf-cluster cards in a squashed sphere */
const canopy = (parent: THREE.Object3D, cx: number, cy: number, cz: number, r: number, n: number) => { for (let k = 0; k < n; k++) { const u = rnd() * 6.28, v = Math.acos(2 * rnd() - 1), rr = r * Math.cbrt(rnd()); const q = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), leafM); q.position.set(cx + rr * Math.sin(v) * Math.cos(u), cy + rr * Math.cos(v) * 0.7, cz + rr * Math.sin(v) * Math.sin(u)); q.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); q.castShadow = true; q.receiveShadow = true; parent.add(q); } };
const fabricTex = (base: string, line: string, step: number) => { const t = canvasTex(256, 256, (g) => { g.fillStyle = base; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.06})`; g.fillRect(rnd() * 256, rnd() * 256, 2, 2); } g.globalAlpha = 0.4; g.fillStyle = line; for (let i = 0; i < 256; i += step) { g.fillRect(i, 0, step * 0.18, 256); g.fillRect(0, i, 256, step * 0.18); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
const tileTex = (c1: string, c2: string, n: number) => { const t = canvasTex(512, 512, (g) => { const s = 512 / n; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = (x + y) % 2 ? c1 : c2; g.fillRect(x * s, y * s, s, s); const gr = g.createLinearGradient(x * s, y * s, x * s + s, y * s + s); gr.addColorStop(0, "rgba(255,255,255,0.18)"); gr.addColorStop(1, "rgba(0,0,0,0.08)"); g.fillStyle = gr; g.fillRect(x * s + 2, y * s + 2, s - 4, s - 4); } g.strokeStyle = "rgba(90,80,70,0.7)"; g.lineWidth = 3; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, 512); g.moveTo(0, i * s); g.lineTo(512, i * s); g.stroke(); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };

/** shared shell: x -2.2..2.2, z -2..2, h 2.8; window on the left (z centre wz) or on the back wall (x centre wx) */
class Shell {
  root = new THREE.Group(); sunDir = new THREE.Vector3(); moon = new THREE.DirectionalLight("#a8bcff", 5); hemi = new THREE.HemisphereLight("#5a6aa0", "#2a2024", 0.6);
  constructor(wallM: THREE.Material, floorM: THREE.Material, win: { side: "left" | "back"; c: number }, outside?: (R: THREE.Group) => void, doorHole?: [number, number]) {
    const R = this.root, X0 = -2.2, X1 = 2.2, Z0 = -2.0, Z1 = 2.0, H = 2.8, trim = std(woodPlanks("#4a2e1c", 2, "rt"), [3, 1]);
    put(R, M(new THREE.BoxGeometry(X1 - X0, 0.1, Z1 - Z0), floorM), [0, -0.05, 0]); put(R, M(new THREE.BoxGeometry(X1 - X0, 0.12, Z1 - Z0), std(woodPlanks("#5a4434", 14, "rc"), [2, 2])), [0, H + 0.06, 0]);
    for (const x of [-1.1, 0, 1.1]) put(R, M(new THREE.BoxGeometry(0.14, 0.18, Z1 - Z0), trim), [x, H - 0.09, 0]);
    const WA = win.c - 0.55, WB = win.c + 0.55, WY0 = 1.0, WY1 = 2.05;
    if (win.side === "left") {
      put(R, M(new THREE.BoxGeometry(X1 - X0, H, 0.12), wallM), [0, H / 2, Z0 - 0.06]);
      put(R, M(new THREE.BoxGeometry(0.12, H, WA - Z0), wallM), [X0 - 0.06, H / 2, (Z0 + WA) / 2]); put(R, M(new THREE.BoxGeometry(0.12, H, Z1 - WB), wallM), [X0 - 0.06, H / 2, (WB + Z1) / 2]);
      put(R, M(new THREE.BoxGeometry(0.12, WY0, WB - WA), wallM), [X0 - 0.06, WY0 / 2, win.c]); put(R, M(new THREE.BoxGeometry(0.12, H - WY1, WB - WA), wallM), [X0 - 0.06, (WY1 + H) / 2, win.c]);
    } else {
      put(R, M(new THREE.BoxGeometry(0.12, H, Z1 - Z0), wallM), [X0 - 0.06, H / 2, 0]);
      put(R, M(new THREE.BoxGeometry(WA - X0, H, 0.12), wallM), [(X0 + WA) / 2, H / 2, Z0 - 0.06]); put(R, M(new THREE.BoxGeometry(X1 - WB, H, 0.12), wallM), [(WB + X1) / 2, H / 2, Z0 - 0.06]);
      put(R, M(new THREE.BoxGeometry(WB - WA, WY0, 0.12), wallM), [win.c, WY0 / 2, Z0 - 0.06]); put(R, M(new THREE.BoxGeometry(WB - WA, H - WY1, 0.12), wallM), [win.c, (WY1 + H) / 2, Z0 - 0.06]);
    }
    if (doorHole) { const [a, b] = doorHole; put(R, M(new THREE.BoxGeometry(0.12, H, a - Z0), wallM), [X1 + 0.06, H / 2, (Z0 + a) / 2]); put(R, M(new THREE.BoxGeometry(0.12, H, Z1 - b), wallM), [X1 + 0.06, H / 2, (b + Z1) / 2]); put(R, M(new THREE.BoxGeometry(0.12, H - 2.05, b - a), wallM), [X1 + 0.06, (H + 2.05) / 2, (a + b) / 2]);
      const tf = std(woodPlanks("#5a3a22", 2, "dfr"), [1, 1]); for (const z of [a, b]) put(R, M(new THREE.BoxGeometry(0.16, 2.1, 0.07), tf), [X1 + 0.02, 1.05, z]); put(R, M(new THREE.BoxGeometry(0.16, 0.07, b - a + 0.14), tf), [X1 + 0.02, 2.08, (a + b) / 2]);
      // the hallway outside: floor, walls, a warm hall lamp, a framed picture, a shoe rack
      const hw = std(plaster("#d8c8a8"), [2, 1]), hf = std(woodPlanks("#6a4a30", 10, "hfl"), [2, 2]);
      put(R, M(new THREE.BoxGeometry(2.2, 0.1, 4), hf), [X1 + 1.1, -0.05, 0.6]); put(R, M(new THREE.BoxGeometry(0.12, H, 4), hw), [X1 + 2.2, H / 2, 0.6]); put(R, M(new THREE.BoxGeometry(2.2, 0.12, 4), hw), [X1 + 1.1, H + 0.06, 0.6]);
      put(R, M(new THREE.BoxGeometry(2.2, H, 0.12), hw), [X1 + 1.1, H / 2, -1.4]); put(R, M(new THREE.BoxGeometry(2.2, H, 0.12), hw), [X1 + 1.1, H / 2, 2.6]);
      put(R, M(rbox(0.5, 0.38, 0.03, 0.008), mat("#4a2e1c")), [X1 + 2.13, 1.6, 0.6], [0, -Math.PI / 2, 0]); put(R, M(new THREE.PlaneGeometry(0.42, 0.3), new THREE.MeshStandardMaterial({ map: canvasTex(128, 96, (g) => { const gr = g.createLinearGradient(0, 0, 0, 96); gr.addColorStop(0, "#e8b878"); gr.addColorStop(1, "#7a9a6a"); g.fillStyle = gr; g.fillRect(0, 0, 128, 96); g.fillStyle = "#3a5a3a"; g.beginPath(); g.moveTo(0, 96); g.lineTo(40, 40); g.lineTo(80, 70); g.lineTo(128, 30); g.lineTo(128, 96); g.fill(); }) })), [X1 + 2.11, 1.6, 0.6], [0, -Math.PI / 2, 0], false);
      put(R, M(rbox(0.3, 0.5, 0.9, 0.02), std(woodPlanks("#7a5232", 3, "shr"), [1, 1])), [X1 + 1.95, 0.25, 1.6]); for (let k = 0; k < 3; k++) put(R, M(rbox(0.1, 0.05, 0.25, 0.02), mat(["#2a4a7a", "#8a3a2a", "#3a3a3a"][k])), [X1 + 1.85, 0.53, 1.3 + k * 0.28]);
      const hb = M(new THREE.SphereGeometry(0.06, 16, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.3, 1.3), toneMapped: false })); hb.position.set(X1 + 1.2, H - 0.25, 0.6); R.add(hb);
      const hl = new THREE.PointLight("#ffbf7a", 4.5, 6, 1.4); hl.position.set(X1 + 1.2, H - 0.35, 0.6); hl.castShadow = true; hl.shadow.mapSize.set(1024, 1024); hl.shadow.bias = -0.002; R.add(hl);
    } else put(R, M(new THREE.BoxGeometry(0.12, H, Z1 - Z0), wallM), [X1 + 0.06, H / 2, 0]);
    put(R, M(new THREE.BoxGeometry(X1 - X0, H, 0.12), wallM), [0, H / 2, Z1 + 0.06]);
    put(R, M(new THREE.BoxGeometry(X1 - X0, 0.14, 0.03), trim), [0, 0.07, Z0 + 0.015]); put(R, M(new THREE.BoxGeometry(0.03, 0.14, Z1 - Z0), trim), [X1 - 0.015, 0.07, 0]);
    // window frame, bars, curtains (local frame: u along the wall, n = inward normal)
    const fr = std(woodPlanks("#3e2616", 2, "rwf"), [1, 1]), wy = (WY0 + WY1) / 2, wg = new THREE.Group();
    if (win.side === "left") { wg.position.set(X0, 0, win.c); wg.rotation.y = Math.PI / 2; } else { wg.position.set(win.c, 0, Z0); }
    R.add(wg);
    for (const u of [-0.55, 0, 0.55]) put(wg, M(new THREE.BoxGeometry(0.06, WY1 - WY0, 0.16), fr), [u, wy, 0]);
    for (const y of [WY0, wy, WY1]) put(wg, M(new THREE.BoxGeometry(1.16, 0.06, 0.16), fr), [0, y, 0]);
    put(wg, M(rbox(1.4, 0.05, 0.26, 0.01), fr), [0, WY0 - 0.04, 0.08]);
    const cm = std(curtain(), [1.5, 1], { side: THREE.DoubleSide, color: "#e0d0c0" });
    for (const s of [-1, 1]) { const g = new THREE.PlaneGeometry(0.5, 1.55, 40, 12); const pa = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pa.count; i++) pa.setZ(i, 0.05 * Math.sin(pa.getX(i) * 40) + 0.02 * Math.sin(pa.getY(i) * 3)); g.computeVertexNormals(); put(wg, M(g, cm), [s * 0.85, 1.55, 0.14]); }
    put(wg, M(new THREE.CylinderGeometry(0.018, 0.018, 2.3, 8), mat("#6a4a2a", { metalness: 0.4 })), [0, 2.35, 0.16], [0, 0, Math.PI / 2]);
    // outside: sky, moon (+ per room extras such as the kunti's tree)
    const sky = M(new THREE.PlaneGeometry(16, 10), new THREE.MeshBasicMaterial({ fog: false, map: canvasTex(256, 512, (g) => { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#081030"); gr.addColorStop(1, "#33467e"); g.fillStyle = gr; g.fillRect(0, 0, 256, 512); g.fillStyle = "#fff"; for (let i = 0; i < 90; i++) g.fillRect(rnd() * 256, rnd() * 320, 1.4, 1.4); }) }));
    const og = new THREE.Group(); og.position.copy(wg.position); og.rotation.copy(wg.rotation); R.add(og); sky.position.set(0, 2.6, -7); og.add(sky);
    const moonD = M(new THREE.CircleGeometry(0.45, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.6, 2.7), fog: false })); moonD.position.set(-1.6, 4.3, -6.9); og.add(moonD);
    outside?.(og);
    // moon through the window
    const n = new THREE.Vector3(0, 0, 1).applyEuler(wg.rotation), along = new THREE.Vector3(1, 0, 0).applyEuler(wg.rotation);
    this.moon.position.copy(wg.position).addScaledVector(n, -6).addScaledVector(along, -1.2).add(new THREE.Vector3(0, 5.2, 0)); this.moon.target.position.copy(wg.position).addScaledVector(n, 1.6).add(new THREE.Vector3(0, 0.4, 0));
    this.moon.castShadow = true; this.moon.shadow.mapSize.set(2048, 2048); Object.assign(this.moon.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 18 }); this.moon.shadow.bias = -0.0004; this.moon.shadow.normalBias = 0.02;
    this.sunDir.copy(this.moon.position).sub(this.moon.target.position).normalize(); R.add(this.moon, this.moon.target, this.hemi);
    const bounce = new THREE.PointLight("#7a8ac8", 1.0, 6, 1.5); bounce.position.set(0.6, 1.8, 1.0); R.add(bounce);
  }
}
const door = (R: THREE.Object3D, x: number, z: number, rotY: number, col: string) => {
  const hinge = new THREE.Group(); put(R, hinge, [x, 0, z], [0, rotY, 0]); const leaf = new THREE.Group(); hinge.add(leaf);
  put(leaf, M(rbox(0.9, 2.05, 0.05, 0.01), std(woodPlanks(col, 3, "dr" + col), [1, 1])), [0.45, 1.03, 0]);
  for (const y of [0.55, 1.45]) put(leaf, M(rbox(0.7, 0.6, 0.02, 0.01), mat("#000", { transparent: true, opacity: 0.12 })), [0.45, y, 0.03]);
  put(leaf, M(new THREE.SphereGeometry(0.03, 10, 8), mat("#c9a24a", { metalness: 0.8, roughness: 0.3 })), [0.8, 1.0, 0.05]);
  return leaf;
};

// =================================================================== living room
export class TamuSet extends Shell {
  bulb: THREE.Mesh; lamp = new THREE.PointLight("#ffbf7a", 3, 7, 1.4); spark: THREE.Sprite; sparkL = new THREE.PointLight("#ffd28a", 0, 1.5, 2); hall: THREE.Group;
  constructor() {
    super(std(woodPlanks("#7a5638", 9, "tw"), [2.2, 1]), std(woodPlanks("#5e3f28", 12, "tf"), [2.5, 2.5], { roughness: 0.5 }), { side: "left", c: -0.6 });
    const R = this.root, fab = new THREE.MeshStandardMaterial({ map: fabricTex("#6a7a4a", "#3a4a2a", 32), roughness: 0.95 }), wood = std(woodPlanks("#5a3420", 4, "tsw"), [1, 1], { roughness: 0.45 });
    // sofa against the back wall
    const sofa = new THREE.Group(); put(R, sofa, [-0.5, 0, -1.55]);
    put(sofa, M(rbox(2.0, 0.42, 0.85, 0.08), fab), [0, 0.25, 0]); put(sofa, M(rbox(2.0, 0.6, 0.22, 0.08), fab), [0, 0.7, -0.33]);
    for (const s of [-1, 1]) put(sofa, M(rbox(0.22, 0.6, 0.85, 0.08), fab), [s * 1.0, 0.45, 0]);
    for (const s of [-0.48, 0.48]) put(sofa, M(rbox(0.9, 0.16, 0.66, 0.07), fab), [s, 0.52, 0.06]);
    for (const [x, c] of [[-0.7, "#c8483c"], [0.72, "#e0b84a"]] as [number, string][]) put(sofa, M(rbox(0.38, 0.36, 0.12, 0.08), mat(c, { roughness: 0.9 })), [x, 0.78, -0.18], [-0.25, 0, x * 0.2]);
    for (const a of [-0.9, 0.9]) for (const b of [-0.35, 0.35]) put(sofa, M(new THREE.CylinderGeometry(0.03, 0.02, 0.06, 8), wood), [a, 0.03, b]);
    // coffee table with toples (cookie jars) and a doily
    const ct = new THREE.Group(); put(R, ct, [-0.5, 0, -0.45]);
    put(ct, M(rbox(1.0, 0.05, 0.55, 0.015), wood), [0, 0.42, 0]); for (const a of [-0.44, 0.44]) for (const b of [-0.22, 0.22]) put(ct, M(new THREE.CylinderGeometry(0.025, 0.02, 0.4, 8), wood), [a, 0.2, b]);
    put(ct, M(new THREE.CircleGeometry(0.22, 32), mat("#f2efe6", { roughness: 1 })), [0, 0.447, 0], [-Math.PI / 2, 0, 0], false);
    const jarM = new THREE.MeshStandardMaterial({ color: "#e8f0f4", transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.1 });
    for (const [x, c] of [[-0.12, "#e0a84a"], [0.12, "#c86a3a"], [0.0, "#f2d29a"]] as [number, string][]) { const z = x === 0 ? 0.1 : -0.06; put(ct, M(new THREE.CylinderGeometry(0.06, 0.065, 0.15, 24), jarM), [x, 0.52, z], [0, 0, 0], false); put(ct, M(new THREE.CylinderGeometry(0.055, 0.055, 0.08, 16), mat(c)), [x, 0.49, z]); put(ct, M(new THREE.CylinderGeometry(0.065, 0.065, 0.025, 24), mat("#d43a3a", { roughness: 0.3 })), [x, 0.61, z]); }
    // TV cabinet + old TV on the right wall
    const tv = new THREE.Group(); put(R, tv, [1.9, 0, -0.6], [0, -Math.PI / 2, 0]);
    put(tv, M(rbox(1.3, 0.55, 0.45, 0.02), wood), [0, 0.28, 0]); for (const s of [-1, 1]) put(tv, M(rbox(0.55, 0.35, 0.02, 0.01), mat("#4a2a18", { roughness: 0.4 })), [s * 0.3, 0.28, 0.23]);
    put(tv, M(rbox(0.7, 0.52, 0.45, 0.06), mat("#2a2a30", { roughness: 0.4 })), [0, 0.83, -0.02]); put(tv, M(rbox(0.56, 0.4, 0.02, 0.04), new THREE.MeshStandardMaterial({ color: "#0e1218", roughness: 0.1, metalness: 0.4 })), [-0.04, 0.84, 0.21]);
    for (const k of [0, 1]) put(tv, M(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 12), mat("#888", { metalness: 0.8 })), [0.29, 0.95 - k * 0.1, 0.22], [Math.PI / 2, 0, 0]);
    // photos on the back wall, a rug, a plant
    for (const [x, y, w, h] of [[-1.0, 1.75, 0.34, 0.26], [-0.45, 1.85, 0.26, 0.34], [0.05, 1.72, 0.3, 0.24]] as [number, number, number, number][]) { put(R, M(rbox(w, h, 0.025, 0.006), mat("#3a2414", { roughness: 0.4 })), [x, y, -1.93]); put(R, M(new THREE.PlaneGeometry(w - 0.05, h - 0.05), new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, (g) => { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "#b8c8d0"); gr.addColorStop(1, "#d8c0a0"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.fillStyle = "#fbf9f6"; g.beginPath(); g.arc(64, 50, 20, 0, 6.3); g.fill(); g.fillStyle = ["#7a2a33", "#2f6f78", "#6a5aa8"][Math.round(x * 3 + 3) % 3]; g.fillRect(44, 72, 40, 56); }) })), [x, y, -1.915], [0, 0, 0], false); }
    put(R, M(new THREE.PlaneGeometry(2.0, 1.4), new THREE.MeshStandardMaterial({ map: fabricTex("#8a3a2a", "#e0b84a", 40), roughness: 1 })), [-0.5, 0.004, -0.6], [-Math.PI / 2, 0, 0], false);
    { const p = new THREE.Group(); put(R, p, [1.75, 0, -1.65]); put(p, M(new THREE.CylinderGeometry(0.18, 0.13, 0.36, 16), mat("#a8583a")), [0, 0.18, 0]); for (let k = 0; k < 9; k++) put(p, M(new THREE.ConeGeometry(0.03, 0.75, 5), mat("#3f7a3a")), [Math.sin(k) * 0.07, 0.65, Math.cos(k) * 0.07], [Math.sin(k * 2) * 0.25, 0, Math.cos(k * 2) * 0.25]); }
    // the hallway doorway in the right part of the back wall (dark), where "something" passes
    this.hall = new THREE.Group(); put(R, this.hall, [1.25, 0, -1.94]);
    put(this.hall, M(new THREE.PlaneGeometry(0.85, 2.0), new THREE.MeshBasicMaterial({ map: canvasTex(128, 300, (g) => { const gr = g.createLinearGradient(0, 0, 0, 300); gr.addColorStop(0, "#0a0c16"); gr.addColorStop(0.55, "#1c2440"); gr.addColorStop(1, "#0c0e18"); g.fillStyle = gr; g.fillRect(0, 0, 128, 300); g.fillStyle = "rgba(150,170,230,0.35)"; g.beginPath(); g.moveTo(40, 300); g.lineTo(88, 300); g.lineTo(76, 170); g.lineTo(52, 170); g.fill(); g.fillStyle = "rgba(160,180,240,0.25)"; g.fillRect(50, 60, 28, 50); }) })), [0, 1.0, 0.005], [0, 0, 0], false);
    for (const s of [-1, 1]) put(this.hall, M(new THREE.BoxGeometry(0.07, 2.08, 0.1), std(woodPlanks("#3e2616", 2, "hf"), [1, 1])), [s * 0.46, 1.04, 0.03]);
    put(this.hall, M(new THREE.BoxGeometry(1.0, 0.07, 0.1), std(woodPlanks("#3e2616", 2, "hf"), [1, 1])), [0, 2.06, 0.03]);
    // hanging bulb, socket + plug + cable, the spark
    put(R, M(new THREE.CylinderGeometry(0.005, 0.005, 0.5, 4), mat("#111")), [-0.4, 2.55, -0.5]);
    put(R, M(new THREE.CylinderGeometry(0.035, 0.03, 0.06, 12), mat("#222")), [-0.4, 2.3, -0.5]);
    this.bulb = M(new THREE.SphereGeometry(0.075, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.3, 1.3), toneMapped: false })); this.bulb.position.set(-0.4, 2.2, -0.5); R.add(this.bulb);
    this.lamp.position.set(-0.4, 2.1, -0.5); this.lamp.castShadow = true; this.lamp.shadow.mapSize.set(1024, 1024); this.lamp.shadow.bias = -0.002; R.add(this.lamp);
    put(R, M(rbox(0.12, 0.18, 0.025, 0.01), mat("#efe9dc", { roughness: 0.4 })), [2.185, 0.4, 0.75], [0, -Math.PI / 2, 0]);
    for (const dz of [-0.02, 0.02]) put(R, M(new THREE.CircleGeometry(0.008, 10), mat("#111")), [2.17, 0.41, 0.75 + dz], [0, -Math.PI / 2, 0], false);
    put(R, M(rbox(0.05, 0.07, 0.07, 0.01), mat("#f2f2f2", { roughness: 0.3 })), [2.14, 0.4, 0.75]);
    const cable = new THREE.CatmullRomCurve3([new THREE.Vector3(2.11, 0.4, 0.75), new THREE.Vector3(1.9, 0.1, 0.6), new THREE.Vector3(1.85, 0.02, 0.1), new THREE.Vector3(1.9, 0.05, -0.5)]); put(R, M(new THREE.TubeGeometry(cable, 40, 0.008, 6), mat("#222")), [0, 0, 0]);
    const st = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,240,200,1)"); gr.addColorStop(0.3, "rgba(255,200,90,0.8)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    this.spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); this.spark.scale.setScalar(0.22); this.spark.position.set(2.12, 0.4, 0.75); R.add(this.spark);
    this.sparkL.position.set(2.0, 0.42, 0.75); R.add(this.sparkL);
    door(R, 2.2, 1.6, -Math.PI / 2, "#5d3a22");
  }
  /** lamp state 0..1, spark burst 0..1 */
  set(on: number, spark: number) { this.lamp.intensity = 0.15 + 2.8 * on; (this.bulb.material as THREE.MeshBasicMaterial).color.setRGB(0.25 + 2.75 * on, 0.2 + 2.1 * on, 0.15 + 1.15 * on); (this.spark.material as THREE.SpriteMaterial).opacity = spark; this.spark.scale.setScalar(0.12 + 0.18 * spark); this.sparkL.intensity = 3 * spark; }
  update(_t: number) { void _t; }
}

// =================================================================== kitchen
export class DapurSet extends Shell {
  pot: THREE.Group; potLid: THREE.Mesh; tin: THREE.Group; crumbs: THREE.Points; crumbBase: Float32Array; torch = new THREE.SpotLight("#fff2d0", 0, 6, 0.4, 0.5, 1.4);
  ratAt: V3 = [0.55, 0.96, -1.62];
  constructor() {
    super(std(plaster("#dccfb4"), [3, 1.5]), new THREE.MeshStandardMaterial({ map: tileTex("#c8b89a", "#a89878", 12), roughness: 0.35 }), { side: "back", c: -1.1 });
    const R = this.root, wood = std(woodPlanks("#7a5232", 5, "dk"), [2, 1], { roughness: 0.5 });
    // counter along the back wall with a tiled backsplash
    put(R, M(rbox(3.4, 0.88, 0.6, 0.02), wood), [0.4, 0.44, -1.68]);
    for (let k = 0; k < 5; k++) put(R, M(rbox(0.6, 0.7, 0.02, 0.01), mat("#5a3a22", { roughness: 0.45 })), [-1.05 + k * 0.68, 0.45, -1.37]);
    for (let k = 0; k < 5; k++) put(R, M(rbox(0.12, 0.02, 0.02, 0.008), mat("#c9a24a", { metalness: 0.9, roughness: 0.25 })), [-1.05 + k * 0.68, 0.72, -1.355]);
    const topM = new THREE.MeshStandardMaterial({ map: tileTex("#e8eef0", "#d8e2e6", 8), roughness: 0.18 }); (topM.map as THREE.Texture).repeat.set(4, 1);
    put(R, M(new THREE.BoxGeometry(3.45, 0.05, 0.64), topM), [0.4, 0.91, -1.68]);
    const bs = new THREE.MeshStandardMaterial({ map: tileTex("#f2f6f8", "#e2ecf0", 10), roughness: 0.15 }); (bs.map as THREE.Texture).repeat.set(5, 1);
    put(R, M(new THREE.PlaneGeometry(1.5, 0.75), bs), [0.95, 1.31, -1.935], [0, 0, 0], false);
    // stove (two burners, knobs) + the pot with a lid, a kettle
    const sv = new THREE.Group(); put(R, sv, [1.05, 0.935, -1.66]);
    put(sv, M(rbox(0.72, 0.1, 0.45, 0.02), mat("#22252c", { metalness: 0.6, roughness: 0.35 })), [0, 0.05, 0]);
    for (const x of [-0.18, 0.18]) { put(sv, M(new THREE.TorusGeometry(0.09, 0.012, 6, 20), mat("#111", { metalness: 0.7 })), [x, 0.105, 0], [Math.PI / 2, 0, 0]); for (let k = 0; k < 4; k++) put(sv, M(new THREE.BoxGeometry(0.2, 0.012, 0.015), mat("#111", { metalness: 0.7 })), [x, 0.11, 0], [0, k * Math.PI / 4, 0]); }
    for (const x of [-0.2, 0.2]) put(sv, M(new THREE.CylinderGeometry(0.025, 0.025, 0.03, 14), mat("#ccc", { metalness: 0.7 })), [x, 0.05, 0.235], [Math.PI / 2, 0, 0]);
    this.pot = new THREE.Group(); put(sv, this.pot, [-0.18, 0.115, 0]);
    put(this.pot, M(new THREE.CylinderGeometry(0.13, 0.12, 0.15, 32, 1, true), mat("#b8bec6", { metalness: 0.75, roughness: 0.28, side: THREE.DoubleSide })), [0, 0.075, 0]); put(this.pot, M(new THREE.CircleGeometry(0.12, 32), mat("#999", { metalness: 0.7 })), [0, 0.002, 0], [-Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) put(this.pot, M(new THREE.TorusGeometry(0.025, 0.007, 6, 12, Math.PI), mat("#333")), [s * 0.14, 0.12, 0], [0, s > 0 ? 0 : Math.PI, Math.PI / 2]);
    this.potLid = put(this.pot, M(new THREE.SphereGeometry(0.135, 32, 8, 0, Math.PI * 2, 0, 0.45), mat("#c8ced4", { metalness: 0.8, roughness: 0.25 })), [0, 0.11, 0]); put(this.potLid, M(new THREE.SphereGeometry(0.02, 10, 8), mat("#222")), [0, 0.06, 0]);
    { const k = new THREE.Group(); put(sv, k, [0.18, 0.115, 0]); put(k, M(new THREE.SphereGeometry(0.1, 24, 16), mat("#d84a3a", { metalness: 0.2, roughness: 0.25 })), [0, 0.09, 0]); k.children[0].scale.set(1, 0.85, 1); put(k, M(new THREE.CylinderGeometry(0.012, 0.02, 0.14, 8), mat("#d84a3a")), [0.1, 0.12, 0], [0, 0, -0.9]); put(k, M(new THREE.TorusGeometry(0.06, 0.008, 6, 16, Math.PI), mat("#222")), [0, 0.18, 0], [0, Math.PI / 2, 0]); }
    // rice cooker, dish rack with plates, sink + tap
    { const rc = new THREE.Group(); put(R, rc, [1.62, 0.935, -1.7]); put(rc, M(new THREE.CylinderGeometry(0.15, 0.14, 0.2, 28), mat("#f2efe6", { roughness: 0.35 })), [0, 0.1, 0]); put(rc, M(new THREE.SphereGeometry(0.15, 28, 10, 0, Math.PI * 2, 0, 0.6), mat("#f2efe6", { roughness: 0.35 })), [0, 0.18, 0]); put(rc, M(new THREE.CircleGeometry(0.02, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 0.6, 0.3) })), [0, 0.1, 0.151], [0, 0, 0], false); }
    { const dr = new THREE.Group(); put(R, dr, [-0.35, 0.935, -1.72]); for (let k = 0; k < 6; k++) put(dr, M(new THREE.CylinderGeometry(0.11, 0.08, 0.015, 24), mat("#f6f6f2", { roughness: 0.2 })), [k * 0.035 - 0.09, 0.11, 0], [0, 0, Math.PI / 2 - 0.15]); put(dr, M(new THREE.BoxGeometry(0.3, 0.01, 0.2), mat("#9aa0a8", { metalness: 0.8 })), [0, 0.005, 0]); }
    put(R, M(rbox(0.5, 0.05, 0.4, 0.04), mat("#c8ccd2", { metalness: 0.9, roughness: 0.2 })), [-1.0, 0.915, -1.68]);
    put(R, M(new THREE.TorusGeometry(0.08, 0.012, 8, 20, Math.PI), mat("#d8dce2", { metalness: 1, roughness: 0.15 })), [-1.0, 1.06, -1.86], [0, 0, 0]);
    // spice shelf + jars, hanging utensils
    put(R, M(rbox(1.2, 0.03, 0.18, 0.01), wood), [0.95, 1.85, -1.88]);
    for (let k = 0; k < 6; k++) { put(R, M(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 14), new THREE.MeshStandardMaterial({ color: "#e8f0f4", transparent: true, opacity: 0.5, roughness: 0.05 })), [0.5 + k * 0.18, 1.93, -1.88], [0, 0, 0], false); put(R, M(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 12), mat(["#c8483c", "#e0b84a", "#5a8a4a", "#8a5a3a", "#d8d0c0", "#3a3a3a"][k])), [0.5 + k * 0.18, 1.91, -1.88]); put(R, M(new THREE.CylinderGeometry(0.042, 0.042, 0.02, 14), mat("#d43a3a", { roughness: 0.3 })), [0.5 + k * 0.18, 2.0, -1.88]); }
    put(R, M(new THREE.CylinderGeometry(0.01, 0.01, 1.0, 6), mat("#888", { metalness: 0.9 })), [0.95, 1.6, -1.9], [0, 0, Math.PI / 2]);
    for (let k = 0; k < 4; k++) { const u = new THREE.Group(); put(R, u, [0.62 + k * 0.22, 1.58, -1.89]); put(u, M(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 6), mat("#5a3a22")), [0, -0.15, 0]); put(u, M(k % 2 ? new THREE.SphereGeometry(0.045, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2) : new THREE.BoxGeometry(0.08, 0.1, 0.008), mat("#c8ccd2", { metalness: 0.85, roughness: 0.25 })), [0, -0.33, 0]); }
    // fridge in the corner
    { const fr = new THREE.Group(); put(R, fr, [-1.75, 0, -1.55]); put(fr, M(rbox(0.7, 1.75, 0.65, 0.06), mat("#e8eaee", { roughness: 0.25, metalness: 0.2 })), [0, 0.875, 0]); put(fr, M(new THREE.BoxGeometry(0.69, 0.01, 0.01), mat("#888")), [0, 1.2, 0.33]); put(fr, M(rbox(0.03, 0.4, 0.04, 0.01), mat("#888", { metalness: 0.9 })), [0.27, 1.45, 0.35]); put(fr, M(rbox(0.03, 0.3, 0.04, 0.01), mat("#888", { metalness: 0.9 })), [0.27, 0.9, 0.35]); for (let k = 0; k < 3; k++) put(fr, M(new THREE.PlaneGeometry(0.1, 0.1), mat(["#ffd84a", "#8ad8ff", "#ff8a9a"][k])), [-0.15 + k * 0.12, 1.5 - k * 0.07, 0.331], [0, 0, (k - 1) * 0.2], false); }
    // the kerupuk tin, knocked over, crackers spilling
    this.tin = new THREE.Group(); put(R, this.tin, [0.42, 0.935, -1.58], [0, 0.4, Math.PI / 2]);
    put(this.tin, M(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 28, 1, true), new THREE.MeshStandardMaterial({ map: canvasTex(256, 128, (g) => { g.fillStyle = "#2a6aa8"; g.fillRect(0, 0, 256, 128); g.fillStyle = "#f2d29a"; g.font = "bold 34px sans-serif"; g.fillText("KERUPUK", 40, 76); g.fillStyle = "#e0b84a"; g.fillRect(0, 0, 256, 12); g.fillRect(0, 116, 256, 12); }), metalness: 0.5, roughness: 0.35, side: THREE.DoubleSide })), [0, 0.12, 0]);
    put(this.tin, M(new THREE.CircleGeometry(0.12, 28), mat("#2a6aa8", { metalness: 0.5, roughness: 0.35 })), [0, -0.03, 0], [Math.PI / 2, 0, 0]);
    const krM = mat("#f2deb0", { roughness: 0.6 });
    for (let k = 0; k < 7; k++) { const kr = M(new THREE.CylinderGeometry(0.05 + rnd() * 0.03, 0.05, 0.012, 9), krM); kr.geometry.computeVertexNormals(); put(R, kr, [0.2 + rnd() * 0.32, 0.945 + rnd() * 0.01, -1.55 + rnd() * 0.2], [rnd() * 0.4, rnd() * 3, rnd() * 0.4]); }
    const cn = 60, cp = new Float32Array(cn * 3); for (let k = 0; k < cn; k++) cp.set([this.ratAt[0] - 0.1 + rnd() * 0.2, 0.94, this.ratAt[2] + rnd() * 0.12], k * 3); this.crumbBase = cp.slice();
    const cg = new THREE.BufferGeometry(); cg.setAttribute("position", new THREE.BufferAttribute(cp, 3)); this.crumbs = new THREE.Points(cg, new THREE.PointsMaterial({ color: "#f2deb0", size: 0.01 })); R.add(this.crumbs);
    this.torch.position.set(-0.8, 1.6, 1.2); this.torch.target.position.set(0.55, 0.95, -1.6); this.torch.castShadow = true; this.torch.shadow.mapSize.set(1024, 1024); R.add(this.torch, this.torch.target);
    door(R, 2.2, 1.0, -Math.PI / 2, "#6a4428");
    void fbm; void stone;
  }
  update(t: number) {
    const pa = this.crumbs.geometry.attributes.position as THREE.BufferAttribute; for (let k = 0; k < pa.count; k++) { const u = ((t * 0.9 + k / pa.count) % 1); pa.setXYZ(k, this.crumbBase[k * 3] + 0.02 * Math.sin(k), 0.99 - 0.05 * u * u - (u > 0.9 ? 0 : 0), this.crumbBase[k * 3 + 2]); } pa.needsUpdate = true;
  }
}

// =================================================================== baby room
export class BayiSet extends Shell {
  fanHead!: THREE.Group; smoke!: THREE.Points; door: THREE.Group; mobile = new THREE.Group(); branchTop: V3 = [0.15, 2.45, -4.6]; fanBlades = new THREE.Group();
  constructor() {
    super(std(plaster("#cfe0e8"), [3, 1.5]), std(woodPlanks("#8a6a4a", 12, "bf"), [2.5, 2.5], { roughness: 0.5 }), { side: "back", c: 0.15 }, (og) => {
      // the kunti's tree outside the window: trunk, a horizontal branch at window height, leaves around
      const bark = std(woodPlanks("#4b3426", 3, "bbark"), [1, 3]);
      const tr = M(new THREE.CylinderGeometry(0.28, 0.4, 6, 12), bark); tr.position.set(1.6, 2.6, -2.8); tr.castShadow = true; og.add(tr);
      const br = M(new THREE.CylinderGeometry(0.1, 0.16, 2.6, 10), bark); br.position.set(0.45, 1.45, -2.6); br.rotation.z = Math.PI / 2 - 0.08; br.castShadow = true; og.add(br);
      canopy(og, 1.9, 4.5, -3.9, 1.7, 220);
      const tl = new THREE.PointLight("#b9ccff", 5, 7, 1.4); tl.position.set(0.0, 3.2, -1.2); og.add(tl);
      const rimL = new THREE.PointLight("#9fb8ff", 6, 5, 1.5); rimL.position.set(0.6, 2.6, -4.2); og.add(rimL);
      for (let k = 0; k < 10; k++) { const q = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.35), leafM); q.position.set(0.9 + rnd() * 0.9, 1.62 + rnd() * 0.25, -2.85 - rnd() * 0.25); q.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); og.add(q); } // twigs with leaves on the branch
      const ground = M(new THREE.PlaneGeometry(14, 10), std(dirt(), [8, 8], { color: "#4a5a3c" })); ground.receiveShadow = true; ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.6, -5); og.add(ground);
      const t2 = M(new THREE.CylinderGeometry(0.18, 0.28, 5, 10), bark); t2.position.set(-2.4, 1.9, -4.5); og.add(t2); canopy(og, -2.4, 4.4, -4.5, 1.5, 140);
      const gt = new THREE.MeshStandardMaterial({ map: grassTuft(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1 }); for (let k = 0; k < 160; k++) { const q = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.45), gt); q.position.set(-4 + rnd() * 8, -0.38, -2.5 - rnd() * 6); q.rotation.y = rnd() * 3; og.add(q); }
      const bl = new THREE.MeshStandardMaterial({ map: bananaLeaf(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.75 }); for (const [bx2, bz2] of [[-1.3, -4.0], [2.8, -5.2]]) { const st = M(new THREE.CylinderGeometry(0.08, 0.12, 1.6, 8), new THREE.MeshStandardMaterial({ color: "#5a6a34" })); st.position.set(bx2, 0.2, bz2); og.add(st); for (let k = 0; k < 6; k++) { const lf = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.8), bl); lf.geometry.translate(0, 0.9, 0); const pv = new THREE.Group(); pv.position.set(bx2, 0.9, bz2); pv.rotation.y = k * 1.05; lf.rotation.x = -0.6 - rnd() * 0.4; lf.castShadow = true; pv.add(lf); og.add(pv); } }

      for (let k = 0; k < 4; k++) { const hx = -4 + k * 2.6, hz = -8.5 - rnd() * 1.5; const hb2 = M(new THREE.BoxGeometry(2.2, 1.8, 1.6), new THREE.MeshStandardMaterial({ color: "#2a2a3a", roughness: 0.9 })); hb2.position.set(hx, 0.3, hz); og.add(hb2); const rf = M(new THREE.ConeGeometry(1.7, 0.8, 4), new THREE.MeshStandardMaterial({ color: "#3a2424", roughness: 0.8 })); rf.position.set(hx, 1.6, hz); rf.rotation.y = Math.PI / 4; og.add(rf);
        if (k % 2 === 0) { const wn = M(new THREE.PlaneGeometry(0.4, 0.35), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.5, 0.7), toneMapped: false })); wn.position.set(hx + 0.4, 0.5, hz + 0.81); og.add(wn); } }
      const ff = new THREE.BufferGeometry(), fp: number[] = []; for (let k = 0; k < 40; k++) fp.push(-2 + rnd() * 4, 0.2 + rnd() * 2.6, -3 - rnd() * 3); ff.setAttribute("position", new THREE.Float32BufferAttribute(fp, 3));
      og.add(new THREE.Points(ff, new THREE.PointsMaterial({ color: new THREE.Color(2.5, 2.6, 1.0), size: 0.035, transparent: true, opacity: 0.9, toneMapped: false })));
    }, [0.15, 1.05]);
    this.branchTop = [0.45, 1.59, -4.6];
    const R = this.root, wood = std(woodPlanks("#e8d2b0", 6, "crib"), [1, 1], { roughness: 0.5 });
    // crib: posts, slats, rails, mattress, sheet, small pillow, blanket, mobile
    const cb = new THREE.Group(); put(R, cb, [-0.35, 0, -1.25]);
    for (const a of [-0.65, 0.65]) for (const b of [-0.36, 0.36]) put(cb, M(rbox(0.06, 1.05, 0.06, 0.015), wood), [a, 0.53, b]);
    for (const b of [-0.36, 0.36]) { for (const y of [0.55, 1.0]) put(cb, M(rbox(1.3, 0.05, 0.05, 0.015), wood), [0, y, b]); for (let k = 0; k < 11; k++) put(cb, M(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 8), wood), [-0.55 + k * 0.11, 0.78, b]); }
    for (const a of [-0.65, 0.65]) { put(cb, M(rbox(0.05, 0.55, 0.72, 0.015), wood), [a, 0.75, 0]); }
    put(cb, M(rbox(1.22, 0.1, 0.66, 0.04), mat("#f2f6f8", { roughness: 0.95 })), [0, 0.6, 0]);
    put(cb, M(rbox(0.3, 0.07, 0.22, 0.03), new THREE.MeshStandardMaterial({ map: fabricTex("#bfe1f2", "#ffffff", 16), roughness: 0.9 })), [0.4, 0.68, 0]);
    { const g = new THREE.PlaneGeometry(0.75, 0.62, 30, 30); g.rotateX(-Math.PI / 2); const pa = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pa.count; i++) pa.setY(i, 0.67 + 0.01 * Math.sin(pa.getX(i) * 30) + 0.008 * Math.sin(pa.getZ(i) * 25)); g.computeVertexNormals(); put(cb, M(g, new THREE.MeshStandardMaterial({ map: fabricTex("#f6c8d8", "#ffffff", 24), roughness: 0.95, side: THREE.DoubleSide })), [-0.32, 0, 0]); }
    put(cb, this.mobile, [0.1, 1.55, 0]); put(this.mobile, M(new THREE.CylinderGeometry(0.004, 0.004, 0.5, 4), mat("#ccc")), [0, 0.25, 0]); put(this.mobile, M(new THREE.TorusGeometry(0.18, 0.006, 6, 30), mat("#e8d2b0")), [0, 0, 0], [Math.PI / 2, 0, 0]);
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; put(this.mobile, M(new THREE.CylinderGeometry(0.002, 0.002, 0.15, 3), mat("#ddd")), [Math.cos(a) * 0.18, -0.08, Math.sin(a) * 0.18]); const toy = k % 2 ? new THREE.SphereGeometry(0.035, 12, 8) : new THREE.OctahedronGeometry(0.04); put(this.mobile, M(toy, mat(["#ffd84a", "#8ad8ff", "#ff8a9a", "#a8e08a", "#c8a8ff"][k], { roughness: 0.4 })), [Math.cos(a) * 0.18, -0.18, Math.sin(a) * 0.18]); }
    // dresser with a diaper pack, a lamp; standing fan (switched off)
    const dw = new THREE.Group(); put(R, dw, [1.35, 0, -1.65]); put(dw, M(rbox(0.9, 0.8, 0.45, 0.02), std(woodPlanks("#f2e6d0", 4, "drs"), [1, 1], { roughness: 0.5 })), [0, 0.4, 0]); for (let k = 0; k < 3; k++) { put(dw, M(rbox(0.82, 0.22, 0.02, 0.01), mat("#e8dcc4", { roughness: 0.5 })), [0, 0.15 + k * 0.25, 0.225]); put(dw, M(new THREE.SphereGeometry(0.02, 10, 8), mat("#c9a24a", { metalness: 0.8 })), [0, 0.15 + k * 0.25, 0.245]); }
    put(dw, M(rbox(0.3, 0.2, 0.18, 0.04), mat("#8ad0f0", { roughness: 0.6 })), [-0.2, 0.9, 0]); put(dw, M(new THREE.PlaneGeometry(0.2, 0.08), new THREE.MeshStandardMaterial({ map: canvasTex(128, 48, (g) => { g.fillStyle = "#fff"; g.fillRect(0, 0, 128, 48); g.fillStyle = "#1a6ab0"; g.font = "bold 26px sans-serif"; g.fillText("POPOK", 18, 34); }) })), [-0.2, 0.92, 0.091], [0, 0, 0], false);
    put(dw, M(new THREE.CylinderGeometry(0.05, 0.07, 0.05, 16), mat("#f2efe6")), [0.25, 0.83, 0]); put(dw, M(new THREE.CylinderGeometry(0.08, 0.12, 0.14, 20, 1, true), new THREE.MeshStandardMaterial({ color: "#fff2d8", emissive: "#ffb46a", emissiveIntensity: 0.6, side: THREE.DoubleSide })), [0.25, 1.0, 0], [0, 0, 0], false);
    const nl = new THREE.PointLight("#ffb46a", 1.2, 3.5, 1.6); nl.position.set(1.6, 1.0, -1.6); R.add(nl);
    { const f = new THREE.Group(); put(R, f, [1.55, 0, -0.5], [0, -0.7, 0]); put(f, M(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 24), mat("#e8e6e0")), [0, 0.03, 0]); put(f, M(new THREE.CylinderGeometry(0.018, 0.018, 0.6, 8), mat("#d8d8d8", { metalness: 0.5 })), [0, 0.33, 0], [0, 0, 0], false);
      const head = new THREE.Group(); head.position.set(0, 0.66, 0); head.rotation.x = 0.85; f.add(head); this.fanHead = head; put(head, M(new THREE.TorusGeometry(0.21, 0.008, 6, 40), mat("#ccc", { metalness: 0.6 })), [0, 0, 0.04]); for (let k = 0; k < 12; k++) put(head, M(new THREE.TorusGeometry(0.21, 0.003, 4, 20, Math.PI), mat("#ccc", { metalness: 0.6 })), [0, 0, 0.04], [0, 0, (k / 12) * Math.PI]);
      put(head, M(new THREE.SphereGeometry(0.08, 16, 10), mat("#5a5450", { roughness: 1 })), [0, 0, -0.08]); put(head, M(new THREE.SphereGeometry(0.05, 12, 8), mat("#1a1614", { roughness: 1 })), [0, -0.02, -0.12]); head.add(this.fanBlades); for (let k = 0; k < 3; k++) put(this.fanBlades, M(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshStandardMaterial({ color: "#6fb0d8", transparent: true, opacity: 0.85 })), [Math.cos(k * 2.09) * 0.1, Math.sin(k * 2.09) * 0.1, 0], [0, 0, k * 2.09]).scale.set(1, 0.45, 0.12);
      put(f, M(rbox(0.07, 0.025, 0.035, 0.006), mat("#e8e6e0", { roughness: 0.4 })), [0, 0.065, 0.155]); put(f, M(rbox(0.022, 0.012, 0.02, 0.004), mat("#c8302a", { roughness: 0.35 })), [-0.012, 0.08, 0.157], [0.25, 0, 0]); put(f, M(new THREE.PlaneGeometry(0.03, 0.012), new THREE.MeshStandardMaterial({ transparent: true, map: canvasTex(96, 40, (g) => { g.clearRect(0, 0, 96, 40); g.fillStyle = "#3a3a3a"; g.font = "bold 22px sans-serif"; g.fillText("I  OFF", 14, 28); }) })), [0.006, 0.0655, 0.1726], [0, 0, 0], false); }
    // wall decor: a star garland, a framed print
    for (let k = 0; k < 7; k++) put(R, M(new THREE.OctahedronGeometry(0.035), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.0, 0.8) })), [-1.6 + k * 0.32, 2.35 - 0.06 * Math.sin((k / 6) * Math.PI), -1.92], [0, 0, 0], false);
    put(R, M(rbox(0.4, 0.3, 0.02, 0.006), mat("#f2e6d0")), [-1.5, 1.6, -1.93]); put(R, M(new THREE.PlaneGeometry(0.34, 0.24), new THREE.MeshStandardMaterial({ map: canvasTex(128, 96, (g) => { g.fillStyle = "#cfe8f4"; g.fillRect(0, 0, 128, 96); g.fillStyle = "#ffd84a"; g.beginPath(); g.arc(90, 30, 16, 0, 6.3); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.ellipse(40, 60, 26, 14, 0, 0, 6.3); g.fill(); }) })), [-1.5, 1.6, -1.918], [0, 0, 0], false);
    this.door = door(R, 2.17, 1.05, Math.PI / 2, "#e8d2b0");
    put(R, M(new THREE.PlaneGeometry(4.4, 4.0), new THREE.MeshStandardMaterial({ map: fabricTex("#d8c8b0", "#b8a890", 64), roughness: 1, transparent: true, opacity: 0.0 })), [0, 0.003, 0], [-Math.PI / 2, 0, 0], false);
  }
  update(t: number) { this.mobile.rotation.y = t * 0.3; this.fanHead.traverse((k) => { if ((k as THREE.Mesh).isMesh) k.castShadow = false; });
    if (!this.smoke) { const n = 70, p = new Float32Array(n * 3); const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3));
      const tx = canvasTex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(200,200,205,0.55)"); gr.addColorStop(1, "rgba(200,200,205,0)"); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); });
      this.smoke = new THREE.Points(g, new THREE.PointsMaterial({ map: tx, size: 0.22, transparent: true, depthWrite: false, color: "#b8b8c0" })); this.root.add(this.smoke); }
    const hp = new THREE.Vector3(); this.fanHead.getWorldPosition(hp); const pa = this.smoke.geometry.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < pa.count; k++) { const u = (t * 0.35 + k / pa.count) % 1; pa.setXYZ(k, hp.x + 0.12 * Math.sin(u * 6 + k) * u - 0.05, hp.y - 0.02 + u * 0.9, hp.z - 0.1 + 0.08 * Math.cos(u * 5 + k * 1.3) * u); } pa.needsUpdate = true; }
}
