// The bedroom of RoomCamTest: a closed room (4 walls + ceiling, the camera never leaves it) on the upper floor of a
// city house. Sun comes in through a real hole in the back wall (shadowed: a bright window patch on the floor), a cool
// window fill, a warm ceiling lamp and desk lamp. Built here: walls, window, bed, wardrobe, desk, laptop, rug, door,
// curtains, posters. Scanned Poly Haven props: drawers, nightstand, lamps, plants, books, clock, armchair; office chair
// (Poly Pizza). Outside: an HDR sky, neighbour houses and palms in a light haze.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { canvasTex, LiveTex } from "../ketindihan2/sets";
import { fbm } from "../../lib/world2/textures";
import { mdl, pbr, skyTex } from "./models";
import { ROOM, WIN, DESK, BED, CHAIR, WARD, LAPTOP, DOOR, V3 } from "./layout";

const std = (c: string, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
const put = <T extends THREE.Object3D>(g: THREE.Object3D, o: T, p: V3, ry = 0, shadow = true) => { o.position.set(...p); o.rotation.y = ry; o.traverse((x) => { const m = x as THREE.Mesh; if (m.isMesh) { m.castShadow = shadow; m.receiveShadow = true; } }); g.add(o); return o; };
let TGT: THREE.Object3D = new THREE.Group(); // where box() adds to (set to the room root in the constructor)
const box = (w: number, h: number, d: number, m: THREE.Material, p: V3, shadow = true) => put(TGT, new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m), p, 0, shadow);
const rbox = (w: number, h: number, d: number, r: number, m: THREE.Material, p: V3, rot: V3 = [0, 0, 0]) => { const o = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), m); o.position.set(...p); o.rotation.set(...rot); o.castShadow = o.receiveShadow = true; return o; };

const plasterM = (c: string, u: number, v: number) => new THREE.MeshStandardMaterial({ ...pbr("painted_plaster_wall", u, v), color: c, roughness: 1, envMapIntensity: 0.55 });
const woodM = (c: string, u = 1, v = 1, rough = 0.55) => new THREE.MeshStandardMaterial({ ...pbr("laminate_floor_02", u, v), color: c, roughness: rough, envMapIntensity: 0.8 });
const clothM = (c: string, rep = 4, k = 1) => { const F = pbr("fabric_pattern_07", rep, rep); return new THREE.MeshStandardMaterial({ color: c, roughness: 1, normalMap: F.normalMap, roughnessMap: F.roughnessMap, normalScale: new THREE.Vector2(k, k), envMapIntensity: 0.5 }); };

/** framed poster art (drawn here, no copyrighted image): 0 = mountains at sunset, 1 = shapes, 2 = city skyline */
const posterT = (k: number) => canvasTex(300, 400, (g) => {
  if (k === 0) { const gr = g.createLinearGradient(0, 0, 0, 400); gr.addColorStop(0, "#f6c58a"); gr.addColorStop(0.55, "#ef8a68"); gr.addColorStop(1, "#7a5a8a"); g.fillStyle = gr; g.fillRect(0, 0, 300, 400);
    g.fillStyle = "#fff1c8"; g.beginPath(); g.arc(200, 170, 42, 0, 7); g.fill();
    for (const [c, y0, a] of [["#6a4c78", 260, 1], ["#4a3a64", 300, 1.6], ["#2e2848", 340, 2.3]] as [string, number, number][]) { g.fillStyle = c; g.beginPath(); g.moveTo(0, 400); for (let x = 0; x <= 300; x += 10) g.lineTo(x, y0 - 60 * Math.abs(Math.sin(x * 0.012 * a + a)) - 20 * fbm(x, y0, 300, 6, 2)); g.lineTo(300, 400); g.fill(); } }
  else if (k === 1) { g.fillStyle = "#f1ebe0"; g.fillRect(0, 0, 300, 400); g.fillStyle = "#e0a43a"; g.beginPath(); g.arc(110, 140, 70, 0, 7); g.fill(); g.fillStyle = "#2f5d62"; g.fillRect(140, 180, 110, 150); g.fillStyle = "#c8553d"; g.beginPath(); g.moveTo(40, 340); g.lineTo(150, 220); g.lineTo(200, 340); g.fill(); g.fillStyle = "#1e1e24"; g.font = "bold 22px sans-serif"; g.fillText("BENTUK", 40, 380); }
  else { g.fillStyle = "#1d2a44"; g.fillRect(0, 0, 300, 400); g.fillStyle = "#f4d27a"; g.beginPath(); g.arc(230, 90, 26, 0, 7); g.fill(); for (let i = 0; i < 12; i++) { const w = 18 + (i * 37) % 22, h = 90 + (i * 53) % 150, x = i * 25; g.fillStyle = i % 2 ? "#2e4066" : "#3a5280"; g.fillRect(x, 400 - h, w, h); g.fillStyle = "#f4d27a"; for (let y = 400 - h + 10; y < 390; y += 16) for (let xx = x + 4; xx < x + w - 4; xx += 7) if ((xx * 7 + y) % 3) g.fillRect(xx, y, 3, 5); } }
});
/** woven rug: terracotta field, cream border, a row of diamonds */
const rugT = canvasTex(1024, 712, (g) => { for (let y = 0; y < 712; y += 2) for (let x = 0; x < 1024; x += 2) { const n = 0.88 + 0.12 * fbm(x, y, 1024, 60, 3); g.fillStyle = `rgb(${(196 * n) | 0},${(112 * n) | 0},${(84 * n) | 0})`; g.fillRect(x, y, 2, 2); }
  g.strokeStyle = "#efe2c8"; g.lineWidth = 26; g.strokeRect(40, 40, 944, 632); g.strokeStyle = "#3f5f5a"; g.lineWidth = 8; g.strokeRect(80, 80, 864, 552);
  g.fillStyle = "#efe2c8"; for (let i = 0; i < 6; i++) { const cx = 192 + i * 128, cy = 356; g.beginPath(); g.moveTo(cx, cy - 70); g.lineTo(cx + 44, cy); g.lineTo(cx, cy + 70); g.lineTo(cx - 44, cy); g.closePath(); g.fill(); g.fillStyle = "#3f5f5a"; g.beginPath(); g.arc(cx, cy, 14, 0, 7); g.fill(); g.fillStyle = "#efe2c8"; } });
/** laptop keyboard + trackpad, seen from above (u along width) */
const keysT = canvasTex(512, 360, (g) => { g.fillStyle = "#b9bcc2"; g.fillRect(0, 0, 512, 360); g.fillStyle = "#202226"; for (let r = 0; r < 5; r++) for (let c = 0; c < 14; c++) { const w = r === 4 && c > 3 && c < 10 ? 0 : 30; if (!w) continue; g.beginPath(); g.roundRect(22 + c * 34, 24 + r * 34, 29, 29, 4); g.fill(); } g.beginPath(); g.roundRect(22 + 4 * 34, 24 + 4 * 34, 6 * 34 - 5, 29, 4); g.fill(); g.fillStyle = "#a8abb2"; g.beginPath(); g.roundRect(166, 210, 180, 120, 10); g.fill(); g.strokeStyle = "#9a9da4"; g.lineWidth = 2; g.stroke(); });

export class Kamar {
  root = new THREE.Group(); sunDir = new THREE.Vector3(0.45, 0.62, -0.64).normalize();
  private curtains: { geo: THREE.BufferGeometry; base: Float32Array; ph: number }[] = []; private screen = new LiveTex(640, 400);
  constructor() {
    const g = this.root, { x0, x1, z0, z1, h } = ROOM, W = x1 - x0, D = z1 - z0, T = 0.14; TGT = g;
    // ---------------- shell ----------------
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ ...pbr("laminate_floor_02", 2.4, 2.7), color: "#d9c2a4", roughness: 0.85, envMapIntensity: 0.9 })); fl.receiveShadow = true; g.add(fl);
    const ce = new THREE.Mesh(new THREE.PlaneGeometry(W, D).rotateX(Math.PI / 2), plasterM("#f6f3ee", 2, 2)); ce.position.y = h; ce.receiveShadow = true; g.add(ce);
    const side = plasterM("#fff6e6", 2.6, 1.5), accent = plasterM("#8fa79a", 2.6, 1.5);
    box(T, h, D + 2 * T, side, [x0 - T / 2, h / 2, 0]); box(T, h, D + 2 * T, side, [x1 + T / 2, h / 2, 0]); box(W, h, T, side, [0, h / 2, z1 + T / 2]);
    // back wall in four pieces round the window hole (sage green accent wall)
    const bz = z0 - T / 2; box(WIN.x0 - x0, h, T, accent, [(x0 + WIN.x0) / 2, h / 2, bz]); box(x1 - WIN.x1, h, T, accent, [(WIN.x1 + x1) / 2, h / 2, bz]);
    box(WIN.x1 - WIN.x0, WIN.y0, T, accent, [(WIN.x0 + WIN.x1) / 2, WIN.y0 / 2, bz]); box(WIN.x1 - WIN.x0, h - WIN.y1, T, accent, [(WIN.x0 + WIN.x1) / 2, (WIN.y1 + h) / 2, bz]);
    const skirt = std("#f4f1ea", { roughness: 0.5 });
    box(0.02, 0.09, D, skirt, [x0 + 0.01, 0.045, 0], false); box(0.02, 0.09, D, skirt, [x1 - 0.01, 0.045, 0], false); box(W, 0.09, 0.02, skirt, [0, 0.045, z0 + 0.01], false); box(W, 0.09, 0.02, skirt, [0, 0.045, z1 - 0.01], false);
    box(W, 0.05, 0.05, skirt, [0, h - 0.025, z0 + 0.025], false); box(W, 0.05, 0.05, skirt, [0, h - 0.025, z1 - 0.025], false); box(0.05, 0.05, D, skirt, [x0 + 0.025, h - 0.025, 0], false); box(0.05, 0.05, D, skirt, [x1 - 0.025, h - 0.025, 0], false); // cornice
    // ---------------- window: white frame, mullion, glass, sill, rod + curtains ----------------
    const wf = std("#f7f7f4", { roughness: 0.4 }), wcx = (WIN.x0 + WIN.x1) / 2, ww = WIN.x1 - WIN.x0, wh = WIN.y1 - WIN.y0, wcy = (WIN.y0 + WIN.y1) / 2;
    for (const [w, hh, p] of [[ww, 0.06, [wcx, WIN.y0 + 0.03, bz]], [ww, 0.06, [wcx, WIN.y1 - 0.03, bz]], [0.06, wh, [WIN.x0 + 0.03, wcy, bz]], [0.06, wh, [WIN.x1 - 0.03, wcy, bz]], [0.045, wh, [wcx, wcy, bz]], [ww, 0.04, [wcx, WIN.y1 - 0.36, bz]]] as [number, number, V3][]) box(w, hh, T + 0.02, wf, p);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshPhysicalMaterial({ color: "#dfeaf2", transparent: true, opacity: 0.07, roughness: 0.03, metalness: 0, depthWrite: false })); glass.position.set(wcx, wcy, bz); g.add(glass);
    box(ww + 0.16, 0.035, 0.2, std("#f2efe8", { roughness: 0.35 }), [wcx, WIN.y0 - 0.017, z0 + 0.06]);
    const rodM = std("#2a2a2e", { roughness: 0.35, metalness: 0.8 }); const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, ww + 1.0, 12).rotateZ(Math.PI / 2), rodM); rod.position.set(wcx, WIN.y1 + 0.18, z0 + 0.2); g.add(rod);
    const curM = clothM("#e9dcc6", 3, 0.8); curM.side = THREE.DoubleSide;
    for (const [cx, ph] of [[WIN.x0 - 0.22, 0], [WIN.x1 + 0.22, 2.1]]) { const geo = new THREE.PlaneGeometry(0.42, WIN.y1 + 0.16, 28, 30); const m = new THREE.Mesh(geo, curM); m.position.set(cx, (WIN.y1 + 0.16) / 2 + 0.02, z0 + 0.2); m.castShadow = m.receiveShadow = true; g.add(m); this.curtains.push({ geo, base: Float32Array.from(geo.attributes.position.array as Float32Array), ph }); }
    // ---------------- bed (headboard on the back wall) ----------------
    const bx = (BED.x0 + BED.x1) / 2, bl = BED.z1 - BED.z0, frameM = woodM("#7b5236", 0.8, 1.2, 0.5);
    g.add(rbox(BED.x1 - BED.x0, 0.3, bl - 0.08, 0.03, frameM, [bx, 0.23, BED.z0 + 0.04 + (bl - 0.08) / 2]));
    for (const lx of [BED.x0 + 0.08, BED.x1 - 0.08]) for (const lz of [BED.z0 + 0.15, BED.z1 - 0.08]) box(0.07, 0.08, 0.07, frameM, [lx, 0.04, lz]);
    g.add(rbox(1.7, 1.08, 0.1, 0.04, clothM("#4f6383", 3, 1.2), [bx, 0.66, z0 + 0.06]));
    g.add(rbox(1.5, 0.22, bl - 0.16, 0.06, clothM("#f4f2ee", 4, 0.6), [bx, 0.49, BED.z0 + 0.1 + (bl - 0.16) / 2]));
    const duv = clothM("#d8a85a", 5, 1.0); g.add(rbox(1.64, 0.3, 1.5, 0.1, duv, [bx, 0.53, BED.z1 - 0.79])); // duvet over the lower part, hanging over the sides
    g.add(rbox(1.62, 0.1, 0.26, 0.05, clothM("#f6f4f0", 4, 0.6), [bx, 0.66, BED.z1 - 1.52], [-0.12, 0, 0])); // folded sheet edge
    g.add(rbox(1.66, 0.05, 0.42, 0.02, clothM("#3f5f5a", 4, 1.2), [bx, 0.69, BED.z1 - 0.34])); // throw at the foot
    for (const [px, rz] of [[bx - 0.38, 0.05], [bx + 0.38, -0.06]]) g.add(rbox(0.62, 0.17, 0.4, 0.08, clothM("#fbfaf7", 4, 0.7), [px, 0.71, z0 + 0.38], [-0.32, 0, rz]));
    g.add(rbox(0.4, 0.13, 0.13, 0.06, clothM("#c8553d", 3, 1.0), [bx + 0.1, 0.72, z0 + 0.62], [-0.2, 0.3, 0])); // small cushion
    // ---------------- nightstand + posters ----------------
    const ns = put(g, mdl("side_table"), [-2.23, 0, -2.5], 0.2); const nsTop = new THREE.Box3().setFromObject(ns).max.y;
    put(g, mdl("plant_small"), [-2.3, nsTop, -2.58]); put(g, mdl("books", 0.5), [-2.15, nsTop, -2.42], 1.4);
    for (const [k, px, py, w, hh] of [[0, -1.55, 1.72, 0.42, 0.56], [1, -0.8, 1.66, 0.34, 0.45]] as [number, number, number, number, number][]) {
      box(w + 0.04, hh + 0.04, 0.025, std("#1e1a18", { roughness: 0.4 }), [px, py, z0 + 0.013]); const pm = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), std("#fff", { map: posterT(k), roughness: 0.45 })); pm.position.set(px, py, z0 + 0.027); g.add(pm); }
    // ---------------- desk under the window + chair ----------------
    const dl = DESK.x - DESK.w / 2, dr = DESK.x + DESK.w / 2, dz = DESK.z, top = woodM("#c49a6c", 0.9, 0.5, 0.45), steel = std("#26272b", { roughness: 0.35, metalness: 0.6 });
    box(DESK.w, 0.035, DESK.d, top, [DESK.x, DESK.top - 0.0175, dz]);
    for (const lx of [dl + 0.04, dr - 0.04]) { box(0.035, DESK.top - 0.035, 0.035, steel, [lx, (DESK.top - 0.035) / 2, dz - DESK.d / 2 + 0.05]); box(0.035, DESK.top - 0.035, 0.035, steel, [lx, (DESK.top - 0.035) / 2, dz + DESK.d / 2 - 0.05]); box(0.03, 0.03, DESK.d - 0.1, steel, [lx, 0.1, dz]); }
    box(0.4, 0.16, DESK.d - 0.08, top, [dr - 0.26, DESK.top - 0.115, dz]); box(0.12, 0.014, 0.014, steel, [dr - 0.26, DESK.top - 0.115, dz + DESK.d / 2 - 0.03]); // drawer
    put(g, mdl("lamp"), [dl + 0.2, DESK.top, dz - 0.14], 0.9);
    put(g, mdl("books", 0.75), [dr - 0.2, DESK.top, dz - 0.2], 0.05); put(g, mdl("notepads"), [LAPTOP[0] + 0.33, DESK.top, dz + 0.14], -0.3); put(g, mdl("stationery"), [dl + 0.42, DESK.top, dz + 0.06], 0.6);
    put(g, mdl("plant_small", 0.9), [WIN.x1 - 0.12, WIN.y0, z0 + 0.06]);
    const mug = new THREE.Group(); mug.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.095, 24), std("#e7ecef", { roughness: 0.3 }))); const hd = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.008, 8, 16, Math.PI), std("#e7ecef", { roughness: 0.3 })); hd.rotation.z = -Math.PI / 2; hd.position.set(0.042, 0, 0); mug.add(hd); mug.children[0].position.y = 0; mug.position.set(0, 0.048, 0);
    const mg = new THREE.Group(); mg.add(mug); put(g, mg, [LAPTOP[0] - 0.3, DESK.top, dz + 0.12], 0.6);
    this.laptop(g);
    put(g, mdl("chair"), CHAIR, Math.PI);
    // ---------------- wardrobe on the right wall ----------------
    const wd = new THREE.Group(); g.add(wd); const oak = woodM("#c8a27a", 0.6, 1.2, 0.5), white = std("#efeae0", { roughness: 0.45 }), wz = (WARD.z0 + WARD.z1) / 2, wwid = WARD.z1 - WARD.z0, wx = (WARD.x0 + WARD.x1) / 2, dep = WARD.x1 - WARD.x0;
    put(wd, new THREE.Mesh(new THREE.BoxGeometry(dep - 0.03, WARD.h - 0.06, wwid), oak), [wx + 0.015, (WARD.h - 0.06) / 2 + 0.06, wz]);
    box(dep - 0.06, 0.06, wwid - 0.06, std("#3a2c22"), [wx + 0.02, 0.03, wz]); box(dep + 0.02, 0.035, wwid + 0.04, oak, [wx, WARD.h - 0.0175, wz]);
    for (const s of [-1, 1]) { const dzc = wz + s * (wwid / 4); box(0.022, WARD.h - 0.16, wwid / 2 - 0.012, white, [WARD.x0 + 0.011, 0.07 + (WARD.h - 0.16) / 2 + 0.03, dzc]);
      box(0.012, 0.4, 0.018, steel, [WARD.x0 - 0.012, 1.05, wz + s * 0.06]); box(0.02, 0.018, 0.018, steel, [WARD.x0 - 0.004, 1.24, wz + s * 0.06]); box(0.02, 0.018, 0.018, steel, [WARD.x0 - 0.004, 0.86, wz + s * 0.06]); }
    const crate = rbox(0.42, 0.24, 0.5, 0.01, std("#b98d5c", { roughness: 0.9 }), [wx + 0.05, WARD.h + 0.12, wz - 0.25], [0, 0.15, 0]); g.add(crate);
    // ---------------- left wall: drawers, books, clock; corners: plant, armchair; rug; door; ceiling lamp ----------------
    const dw = put(g, mdl("drawers"), [-2.2, 0, 1.45], Math.PI / 2); const dTop = new THREE.Box3().setFromObject(dw).max.y;
    put(g, mdl("books", 0.8), [-2.24, dTop, 1.25], Math.PI / 2); put(g, mdl("plant_small", 1.1), [-2.22, dTop, 1.72]);
    const ck = put(g, mdl("clock"), [x0 + 0.02, 2.0, 1.45], Math.PI / 2); void ck;
    put(g, mdl("plant_big"), [2.17, 0, -1.0], 1.2);
    put(g, mdl("armchair"), [2.02, 0, 2.3], -Math.PI * 0.78);
    const rug = new THREE.Mesh(new RoundedBoxGeometry(2.3, 0.014, 1.6, 2, 0.006), new THREE.MeshStandardMaterial({ map: rugT, normalMap: pbr("dirty_carpet", 2.2, 1.6).normalMap, roughness: 1, envMapIntensity: 0.4 })); rug.position.set(0.3, 0.007, 0.35); rug.receiveShadow = true; g.add(rug);
    const doorM = woodM("#f1ece3", 0.4, 1, 0.4); box(DOOR.w, 2.05, 0.04, doorM, [DOOR.x, 1.025, z1 - 0.02]);
    for (const [w, hh, p] of [[0.06, 2.1, [DOOR.x - DOOR.w / 2 - 0.03, 1.05, z1 - 0.015]], [0.06, 2.1, [DOOR.x + DOOR.w / 2 + 0.03, 1.05, z1 - 0.015]], [DOOR.w + 0.12, 0.06, [DOOR.x, 2.08, z1 - 0.015]]] as [number, number, V3][]) box(w, hh, 0.03, skirt, p);
    for (const py of [0.55, 1.45]) box(DOOR.w - 0.24, py > 1 ? 0.7 : 0.7, 0.012, std("#e6e0d4", { roughness: 0.45 }), [DOOR.x, py, z1 - 0.046]);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 12), std("#c8a060", { roughness: 0.25, metalness: 1 })); knob.position.set(DOOR.x - DOOR.w / 2 + 0.1, 1.0, z1 - 0.07); g.add(knob);
    box(0.08, 0.12, 0.012, std("#f8f7f4", { roughness: 0.4 }), [DOOR.x + DOOR.w / 2 + 0.2, 1.2, z1 - 0.006], false); // light switch
    // flush ceiling light: a white base ring and a glowing opal dome
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.03, 48), std("#f4f4f2", { roughness: 0.4 })); base.position.set(0, h - 0.015, 0); g.add(base);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.22, 48, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffe8c8", emissiveIntensity: 1.1, roughness: 0.6 })); dome.scale.y = 0.35; dome.position.set(0, h - 0.03, 0); g.add(dome);
    const bulb = new THREE.PointLight("#ffd6a0", 1.4, 7, 1.5); bulb.position.set(0, h - 0.25, 0); g.add(bulb);
    // ---------------- light ----------------
    const sun = new THREE.DirectionalLight("#fff0da", 3.4); const tgt = new THREE.Vector3(0.4, 0.6, -1.0); sun.position.copy(tgt).addScaledVector(this.sunDir, 14); sun.target.position.copy(tgt); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
    Object.assign(sun.shadow.camera, { left: -4.2, right: 4.2, top: 4.2, bottom: -4.2, near: 4, far: 26 }); sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.025; sun.shadow.radius = 3; g.add(sun, sun.target);
    g.add(new THREE.HemisphereLight("#dfe6f2", "#9a8064", 0.95));
    const fill = new THREE.DirectionalLight("#b8ccf4", 0.45); fill.position.set(1.0, 2.2, -6); fill.target.position.set(0, 0.8, 1); g.add(fill, fill.target); // cool sky light from the window side (rim on things seen against the room)
    const back = new THREE.DirectionalLight("#ffe2c0", 0.3); back.position.set(-3, 2.5, 5); back.target.position.set(0.5, 0.8, -1.5); g.add(back, back.target); // soft warm bounce from the room behind the camera
    const dlamp = new THREE.PointLight("#ffc98a", 0.9, 2.2, 1.6); dlamp.position.set(dl + 0.35, DESK.top + 0.42, dz - 0.05); g.add(dlamp);
    // ---------------- outside the window ----------------
    const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 48, 24), new THREE.MeshBasicMaterial({ map: skyTex(), side: THREE.BackSide, fog: false, color: new THREE.Color(0.75, 0.75, 0.75) })); sky.rotation.y = Math.PI; g.add(sky);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200).rotateX(-Math.PI / 2), std("#7f8f5e", { roughness: 1 })); ground.position.set(0, -3.4, -60); ground.receiveShadow = true; g.add(ground);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(200, 7).rotateX(-Math.PI / 2), std("#6a6a6c", { roughness: 0.95 })); road.position.set(0, -3.38, -11); g.add(road);
    // across the street: town houses with their fronts on z = -20, a fence wall, palms and bushes in front gardens
    for (const [n, x, s] of [["town_d", -9, 1], ["town_a", 1.5, 1], ["town_h", 12, 1], ["town_a", 23, 0.95], ["town_d", -21, 1]] as [string, number, number][]) {
      const o = mdl(n, s); o.position.set(x, -3.4, 0); o.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(o); o.position.z = -20 - bb.max.z; put(g, o, [o.position.x, o.position.y, o.position.z]); }
    for (const [x, s] of [[-3.5, 1], [6.5, 1.15], [17, 0.9], [-14, 1.1]]) put(g, mdl("palm", s), [x, -3.4, -17.5], x);
    for (const x of [-6, -1.5, 4, 9, 14]) put(g, mdl("bush"), [x, -3.4, -18.2]);
    const fence = std("#e2dccf", { roughness: 0.95 }); box(60, 1.3, 0.2, fence, [0, -2.75, -16.6]); for (let x = -30; x <= 30; x += 2.5) box(0.32, 1.5, 0.32, std("#cfc8b8", { roughness: 0.95 }), [x, -2.65, -16.6]);
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(200, 2.2).rotateX(-Math.PI / 2), std("#b4b0a6", { roughness: 0.95 })); walk.position.set(0, -3.37, -15.3); g.add(walk);
    const walk2 = walk.clone(); walk2.position.z = -6.7; g.add(walk2);
    const lineM = std("#e8e4d8", { roughness: 0.8 }); for (let x = -40; x < 40; x += 4) box(2, 0.005, 0.12, lineM, [x, -3.375, -11], false); // dashed centre line
  }
  private laptop(g: THREE.Group) {
    const L = new THREE.Group(); L.position.set(...LAPTOP); L.rotation.y = 0.08; g.add(L);
    const alu = std("#c3c6cc", { roughness: 0.32, metalness: 0.55 }), w = 0.34, d = 0.235;
    L.add(rbox(w, 0.016, d, 0.006, alu, [0, 0.008, 0]));
    const kb = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.02, d - 0.02).rotateX(-Math.PI / 2), std("#fff", { map: keysT, roughness: 0.5 })); kb.position.set(0, 0.0165, 0); L.add(kb);
    const lid = new THREE.Group(); lid.position.set(0, 0.016, -d / 2); lid.rotation.x = -0.32; L.add(lid);
    lid.add(rbox(w, d, 0.01, 0.005, alu, [0, d / 2, -0.005]));
    const sm = new THREE.MeshStandardMaterial({ color: "#000", emissive: "#ffffff", emissiveMap: this.screen.tex, emissiveIntensity: 0.95, roughness: 0.15 });
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.025, d - 0.03), sm); sc.position.set(0, d / 2 + 0.004, 0.0012); lid.add(sc);
    L.traverse((x) => { const m = x as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  }
  private drawScreen(t: number) {
    const blink = Math.floor(t * 2) % 2;
    this.screen.draw("s" + blink + Math.floor(t * 4), (g, w, h) => {
      g.fillStyle = "#f3f5f8"; g.fillRect(0, 0, w, h); g.fillStyle = "#2c3e66"; g.fillRect(0, 0, w, 38); g.fillStyle = "#fff"; g.font = "bold 20px sans-serif"; g.fillText("Catatan Kamar", 18, 26);
      for (const [x, c] of [[560, "#ff6a5a"], [588, "#ffc44a"], [616, "#4ad06a"]] as [number, string][]) { g.fillStyle = c; g.beginPath(); g.arc(x, 19, 8, 0, 7); g.fill(); }
      g.fillStyle = "#e2e7ef"; g.fillRect(0, 38, 150, h - 38); g.fillStyle = "#7c8aa6"; for (let i = 0; i < 6; i++) g.fillRect(18, 62 + i * 34, 100 - (i * 17) % 40, 12);
      const lines = Math.min(9, 3 + Math.floor(t / 3)); // one more line every 3 s, never resets (a reset = a visible pop) g.fillStyle = "#3a4458"; for (let i = 0; i < lines; i++) g.fillRect(176, 66 + i * 30, 380 - ((i * 73) % 160), 12);
      g.fillStyle = "#e0a43a"; g.fillRect(176, 66 + 9 * 30 + 6, 120, 34);
      if (blink) { g.fillStyle = "#2c3e66"; g.fillRect(176 + 380 - ((lines * 73) % 160) + 6, 62 + lines * 30, 3, 20); }
    });
  }
  update(t: number) {
    this.drawScreen(t);
    // curtains: soft folds plus a slow breeze sway (bottom moves most), a pure function of time
    for (const c of this.curtains) { const p = c.geo.attributes.position as THREE.BufferAttribute, b = c.base, H = WIN.y1 + 0.16;
      for (let i = 0; i < p.count; i++) { const x = b[i * 3], y = b[i * 3 + 1], k = (H / 2 - y) / H; p.setZ(i, 0.035 * Math.sin(x * 38 + c.ph) + 0.012 * Math.sin(x * 90) + k * k * (0.03 * Math.sin(t * 1.3 + c.ph + x * 4) + 0.012 * Math.sin(t * 2.1 + y * 3))); }
      p.needsUpdate = true; c.geo.computeVertexNormals(); }
  }
}
