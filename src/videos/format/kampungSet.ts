// Indonesian village set (reusable): painted canvas textures + toon materials so the bridge ink pass outlines them.
// Layout (metres, ground y = 0): balai desa (pendopo) at z -8; three yards along the road at z ~6:
// Budi x -10, Sari x 0, Joko x 10 (Joko's fenced yard grows coops + a flock). Sawah + mountains far behind.
import * as THREE from "three";
import { NOINK } from "../bridge/ink";

const grad = (() => { const d = new Uint8Array([110, 190, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
export const toon = (c: string, map?: THREE.Texture | null) => new THREE.MeshToonMaterial({ color: map ? "#ffffff" : c, map: map ?? null, gradientMap: grad });
let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const paint = (w: number, h: number, fn: (g: CanvasRenderingContext2D) => void, repeat: [number, number] = [1, 1]) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; fn(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8; return t;
};
const speckle = (g: CanvasRenderingContext2D, w: number, h: number, n: number, cols: string[], a: number, sz = 3) => { g.globalAlpha = a; for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * sz, 1 + rnd() * sz); } g.globalAlpha = 1; };
const grassTex = () => paint(512, 512, (g) => {
  g.fillStyle = "#8cc152"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 26; i++) { g.fillStyle = i % 2 ? "rgba(120,180,70,0.35)" : "rgba(160,205,95,0.35)"; g.beginPath(); g.ellipse(rnd() * 512, rnd() * 512, 40 + rnd() * 70, 20 + rnd() * 40, rnd() * 3, 0, 7); g.fill(); }
  g.strokeStyle = "#6fa83e"; g.lineWidth = 2; g.globalAlpha = 0.7; for (let i = 0; i < 700; i++) { const x = rnd() * 512, y = rnd() * 512; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rnd() * 4 - 2, y - 5 - rnd() * 6); g.stroke(); } g.globalAlpha = 1;
}, [10, 10]);
const dirtTex = () => paint(512, 512, (g) => { g.fillStyle = "#d8b98a"; g.fillRect(0, 0, 512, 512); speckle(g, 512, 512, 2500, ["#b8946a", "#e6cfa6", "#a88660"], 0.5, 4); }, [2, 12]);
const plankTex = (base: string) => paint(256, 256, (g) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)"; g.fillRect(i * 32, 0, 32, 256); g.fillStyle = "rgba(40,25,15,0.45)"; g.fillRect(i * 32, 0, 3, 256); }
  speckle(g, 256, 256, 300, ["#00000022"], 1, 3);
}, [2, 1]);
const roofTex = () => paint(256, 256, (g) => {
  g.fillStyle = "#c4512f"; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 3 ? "#d0603a" : "#b84a2a"; g.beginPath(); g.ellipse(x * 32 + (y % 2) * 16 + 16, y * 32 + 20, 15, 12, 0, 0, Math.PI); g.fill(); g.strokeStyle = "rgba(60,20,10,0.5)"; g.lineWidth = 2; g.stroke(); }
}, [3, 3]);
const sawahTex = () => paint(512, 256, (g) => {
  g.fillStyle = "#7dbb4f"; g.fillRect(0, 0, 512, 256);
  for (let y = 0; y < 256; y += 10) { g.fillStyle = y % 20 ? "#93cc5d" : "#6aa842"; g.fillRect(0, y, 512, 5); }
  g.fillStyle = "rgba(170,215,240,0.45)"; for (let i = 0; i < 4; i++) g.fillRect(i * 128 + 2, 0, 3, 256);
}, [6, 3]);
const skyTex = () => { const c = document.createElement("canvas"); c.width = 4; c.height = 512; const g = c.getContext("2d")!; const r = g.createLinearGradient(0, 0, 0, 512); r.addColorStop(0, "#5fb3ea"); r.addColorStop(0.6, "#a8dbf5"); r.addColorStop(1, "#e9f6fb"); g.fillStyle = r; g.fillRect(0, 0, 4, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const bannerTex = (text: string, bg: string, fg: string, w = 1024, h = 220) => paint(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28); g.fillStyle = fg; g.font = `bold ${Math.round(h * 0.42)}px 'Avenir Next', Arial`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, h / 2 + 6); });

export type Kampung = {
  group: THREE.Group; sky: THREE.Texture;
  sariEggs: THREE.Mesh[]; nestEggs: THREE.Mesh[]; coops: THREE.Object3D[]; fire: THREE.Mesh; steam: THREE.Mesh[]; sign: THREE.Object3D; budiHomeHen: THREE.Vector3;
};

export const buildKampung = (): Kampung => {
  seed = 11;
  const g = new THREE.Group();
  const add = <T extends THREE.Object3D>(m: T, parent: THREE.Object3D = g) => { m.traverse((o) => { o.castShadow = o.receiveShadow = true; }); parent.add(m); return m; };
  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, ry = 0, parent: THREE.Object3D = g) => { const m = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), parent); m.position.set(x, y, z); m.rotation.y = ry; return m; };
  const cyl = (rt: number, rb: number, h: number, mat: THREE.Material, x: number, y: number, z: number, seg = 12, parent: THREE.Object3D = g) => { const m = add(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat), parent); m.position.set(x, y, z); return m; };
  const grass = toon("#fff", grassTex()), dirt = toon("#fff", dirtTex()), roof = toon("#fff", roofTex()), white = toon("#f7f3e8"), darkWood = toon("#5a3b24"), bamboo = toon("#d9b25f");
  // ground, road, sawah, mountains
  const gr = add(new THREE.Mesh(new THREE.PlaneGeometry(90, 90), grass)); gr.rotation.x = -Math.PI / 2; gr.position.z = -10;
  const road = add(new THREE.Mesh(new THREE.PlaneGeometry(60, 3.2), toon("#fff", paint(512, 64, (c) => { c.fillStyle = "#d8b98a"; c.fillRect(0, 0, 512, 64); speckle(c, 512, 64, 900, ["#b8946a", "#e6cfa6"], 0.5, 3); }, [10, 1])))); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, 11.2);
  const path = add(new THREE.Mesh(new THREE.PlaneGeometry(2.2, 15), dirt)); path.rotation.x = -Math.PI / 2; path.position.set(0, 0.012, 3);
  const saw = add(new THREE.Mesh(new THREE.PlaneGeometry(90, 30), toon("#fff", sawahTex()))); saw.rotation.x = -Math.PI / 2; saw.position.set(0, 0.015, -30);
  for (const [x, z, r, h, c] of [[-30, -70, 22, 20, "#6f93b8"], [5, -80, 30, 28, "#7a9cc0"], [38, -72, 20, 16, "#86a7c6"]] as [number, number, number, number, string][]) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, h / 2 - 1, z); m.layers.set(NOINK); g.add(m);
  }
  // ---- houses: plank walls, tiled gable roof, door, windows, terrace posts ----
  const house = (x: number, z: number, wall: string, w = 3.6, d = 2.8) => {
    const h = new THREE.Group(); h.position.set(x, 0, z); g.add(h);
    box(w, 0.35, d + 0.6, toon("#bfb3a0"), 0, 0.175, 0.3, 0, h); // stone base / terrace
    box(w, 2.1, d, toon("#fff", plankTex(wall)), 0, 1.4, 0, 0, h);
    const sh = new THREE.Shape(); sh.moveTo(-w / 2 - 0.35, 0); sh.lineTo(0, 1.35); sh.lineTo(w / 2 + 0.35, 0); sh.closePath();
    const rg = new THREE.ExtrudeGeometry(sh, { depth: d + 1.1, bevelEnabled: false }); rg.translate(0, 0, -(d + 1.1) / 2);
    const rf = add(new THREE.Mesh(rg, roof), h); rf.position.y = 2.45; rf.position.z = 0.25;
    box(0.9, 1.55, 0.06, darkWood, -0.6, 1.12, d / 2 + 0.01, 0, h);
    for (const wx of [0.75, -1.45]) { if (wx < -w / 2 + 0.4) continue; box(0.7, 0.6, 0.06, toon("#3b5f7a"), wx, 1.55, d / 2 + 0.01, 0, h); box(0.8, 0.08, 0.1, white, wx, 1.22, d / 2 + 0.04, 0, h); box(0.04, 0.6, 0.08, white, wx, 1.55, d / 2 + 0.04, 0, h); }
    for (const px of [-w / 2 + 0.15, w / 2 - 0.15]) cyl(0.07, 0.07, 2.1, darkWood, px, 1.4, d / 2 + 0.55, 8, h);
    box(w + 0.2, 0.08, 0.5, darkWood, 0, 2.45, d / 2 + 0.5, 0, h);
    return h;
  };
  house(-10, 2.6, "#c9a77a"); house(0, 2.6, "#e9d7b0"); house(10, 2.4, "#9fc3d6", 4.0, 3.0);
  // ---- balai desa (pendopo, joglo roof) + banner ----
  box(6, 0.3, 4.4, toon("#cdbfa6"), 0, 0.15, -8.2);
  for (const px of [-2.6, -0.9, 0.9, 2.6]) for (const pz of [-9.9, -6.5]) cyl(0.09, 0.09, 2.4, darkWood, px, 1.5, pz, 8);
  const j1 = add(new THREE.Mesh(new THREE.ConeGeometry(4.6, 1.3, 4, 1), roof)); j1.rotation.y = Math.PI / 4; j1.scale.set(1, 1, 0.78); j1.position.set(0, 3.3, -8.2);
  const j2 = add(new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.4, 4, 1), roof)); j2.rotation.y = Math.PI / 4; j2.scale.set(1, 1, 0.78); j2.position.set(0, 4.3, -8.2);
  const ban = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.75), toon("#fff", bannerTex("BANTUAN AYAM · DESA SUKAMAJU", "#d0453b", "#fff6e0", 1400, 240))); ban.position.set(0, 2.32, -6.42); ban.receiveShadow = true; g.add(ban);
  box(1.4, 0.75, 0.7, toon("#a77c4a"), -1.9, 0.68, -7.4); // table
  box(0.8, 0.45, 0.55, toon("#fff", plankTex("#c79a63")), -1.9, 1.28, -7.4); // crate of chickens
  // ---- coconut palms, bushes, banana-ish clumps ----
  const palm = (x: number, z: number, hgt: number, lean: number) => {
    const p = new THREE.Group(); p.position.set(x, 0, z); g.add(p);
    const N = 7; let px = 0, py = 0; for (let i = 0; i < N; i++) { const seg = hgt / N; const nx = lean * Math.pow((i + 1) / N, 2), ny = py + seg; const m = cyl(0.13 - i * 0.008, 0.15 - i * 0.008, seg + 0.05, toon(i % 2 ? "#8b6a48" : "#7d5e3e"), (px + nx) / 2, (py + ny) / 2, 0, 8, p); m.rotation.z = -Math.atan2(nx - px, seg); px = nx; py = ny; }
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; const lf = add(new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), toon(k % 2 ? "#4f9a45" : "#5fae4f")), p); lf.scale.set(1.25, 0.08, 0.32); lf.position.set(px + Math.cos(a) * 1.0, py - 0.25, Math.sin(a) * 1.0); lf.rotation.set(0, -a, -0.45); }
    for (let k = 0; k < 3; k++) { const c = add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), toon("#6b8a2e")), p); c.position.set(px + Math.cos(k * 2.1) * 0.18, py - 0.25, Math.sin(k * 2.1) * 0.18); }
  };
  for (const [x, z, h, l] of [[-14, 0.5, 6.5, 0.8], [-6.5, 0.2, 5.5, -0.6], [4.2, 0.4, 6, 0.7], [-4, -9.5, 6.5, -0.5], [5, -10.5, 7, 0.8], [19.5, 1.5, 6.5, -0.7], [-18, -4, 7, 0.5], [14, -3, 6, -0.4]] as number[][]) palm(x, z, h, l);
  const bush = (x: number, z: number, s: number) => { for (let k = 0; k < 4; k++) { const b = add(new THREE.Mesh(new THREE.SphereGeometry(0.45 * s, 10, 8), toon(k % 2 ? "#4f8a3e" : "#5c9b48"))); b.position.set(x + Math.cos(k * 1.7) * 0.4 * s, 0.32 * s + (k % 2) * 0.15 * s, z + Math.sin(k * 1.7) * 0.3 * s); } };
  for (const [x, z, s] of [[-12.6, 4.6, 1], [-7.6, 4.4, 0.8], [-2.4, 4.6, 0.9], [2.6, 4.4, 0.8], [-3.5, -6, 1.1], [3.5, -6.2, 1], [7.2, 4.2, 0.9], [-15.5, 7, 1.1]] as number[][]) bush(x, z, s);
  for (let i = 0; i < 40; i++) { const f = add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), toon(["#ff6b8a", "#ffd23f", "#ffffff"][i % 3]))); f.position.set(-16 + rnd() * 32, 0.05, 4.2 + rnd() * 0.5); }
  // ---- bamboo fences: front of each yard + Joko's yard (west side has the gate gap where visitors stand) ----
  const fence = (x0: number, z0: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / 0.45)), ry = -Math.atan2(z1 - z0, x1 - x0);
    for (let i = 0; i <= n; i++) { const t = i / n; cyl(0.04, 0.045, 0.95, bamboo, x0 + (x1 - x0) * t, 0.47, z0 + (z1 - z0) * t, 6); }
    for (const y of [0.35, 0.75]) { const r = cyl(0.03, 0.03, len, bamboo, (x0 + x1) / 2, y, (z0 + z1) / 2, 6); r.rotation.set(0, ry, Math.PI / 2); }
  };
  fence(-13.5, 9.6, -6.5, 9.6); fence(-3.5, 9.6, -1.4, 9.6); fence(1.4, 9.6, 3.5, 9.6); // Budi + Sari fronts
  fence(8.6, 9.8, 19, 9.8); fence(19, 9.8, 19, 4.5); fence(8.6, 4.6, 8.6, 7.0); // Joko's yard (gap x 8.6 z 7..9.8 = gate)
  // ---- Budi: tungku (clay stove) + wajan ----
  box(0.9, 0.55, 0.7, toon("#b5653f"), -9.4, 0.275, 6.3); box(0.4, 0.3, 0.04, toon("#2a1a14"), -9.4, 0.2, 6.66);
  const wok = add(new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon("#2b2f38"))); wok.position.set(-9.4, 0.88, 6.3); wok.scale.y = 0.55;
  const oil = add(new THREE.Mesh(new THREE.CircleGeometry(0.33, 24), toon("#e3a64a"))); oil.rotation.x = -Math.PI / 2; oil.position.set(-9.4, 0.84, 6.3);
  for (let k = 0; k < 3; k++) { const pc = add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), toon("#c8742e"))); pc.scale.set(1.3, 0.6, 0.9); pc.position.set(-9.48 + k * 0.1, 0.86, 6.24 + (k % 2) * 0.1); }
  const fire = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffb347").multiplyScalar(1.6) })); fire.position.set(-9.4, 0.14, 6.6); fire.layers.set(NOINK); g.add(fire);
  const steam: THREE.Mesh[] = []; const stTex = paint(64, 64, (c) => { const r = c.createRadialGradient(32, 32, 2, 32, 32, 30); r.addColorStop(0, "rgba(255,255,255,0.45)"); r.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = r; c.fillRect(0, 0, 64, 64); });
  for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ map: stTex, transparent: true, depthWrite: false })); s.layers.set(NOINK); s.renderOrder = 3; g.add(s); steam.push(s); }
  box(0.7, 0.5, 0.5, toon("#a77c4a"), -11.6, 0.25, 5.9); // bench
  // ---- Sari: small coop + egg basket (eggs revealed over time) ----
  const coop = (x: number, z: number, s = 1, ry = 0) => {
    const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; c.scale.setScalar(s); g.add(c);
    for (const [lx, lz] of [[-0.7, -0.5], [0.7, -0.5], [-0.7, 0.5], [0.7, 0.5]]) box(0.08, 0.4, 0.08, darkWood, lx, 0.2, lz, 0, c);
    box(1.6, 0.9, 1.15, toon("#fff", plankTex("#c79a63")), 0, 0.85, 0, 0, c);
    const r = box(1.85, 0.08, 1.5, roof, 0, 1.42, 0, 0, c); r.rotation.x = -0.25;
    box(0.4, 0.45, 0.05, toon("#3a2416"), 0.35, 0.72, 0.58, 0, c);
    const ramp = box(0.32, 0.04, 0.7, darkWood, 0.35, 0.25, 0.85, 0, c); ramp.rotation.x = 0.55;
    return c;
  };
  coop(1.5, 5.3, 0.8);
  const basket = add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.24, 18, 1, true), toon("#b07a3e"))); basket.position.set(-0.05, 0.12, 7.0);
  const bb = add(new THREE.Mesh(new THREE.CircleGeometry(0.25, 18), toon("#8a5a2e"))); bb.rotation.x = -Math.PI / 2; bb.position.set(-0.05, 0.02, 7.0);
  const eggMat = toon("#fbf1e2"), eggGeo = new THREE.SphereGeometry(0.06, 10, 8);
  const sariEggs: THREE.Mesh[] = [];
  for (let i = 0; i < 14; i++) { const e = add(new THREE.Mesh(eggGeo, eggMat)); const a = i * 2.4, r = 0.06 + (i % 5) * 0.04; e.scale.set(1, 1.3, 1); e.position.set(-0.05 + Math.cos(a) * r, 0.08 + Math.floor(i / 6) * 0.07, 7.0 + Math.sin(a) * r); e.visible = false; sariEggs.push(e); }
  // ---- Joko: straw nest with eggs, coops that appear stage by stage ----
  const nest = add(new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.1, 8, 18), toon("#e0bf6a"))); nest.rotation.x = -Math.PI / 2; nest.position.set(10.1, 0.08, 6.7);
  const nestEggs: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) { const e = add(new THREE.Mesh(eggGeo, eggMat)); e.scale.set(1, 1.3, 1); e.position.set(10.1 + Math.cos(i * 1.3) * 0.13, 0.08, 6.7 + Math.sin(i * 1.3) * 0.13); nestEggs.push(e); }
  const coops = [[12.6, 3.4], [14.9, 3.4], [17.2, 3.4], [12.6, 0.9], [14.9, 0.9], [17.2, 0.9], [16.4, 6.1]].map(([x, z]) => coop(x, z, 1.05, 0));
  // ---- protest sign (held next to Budi in the last scenes) ----
  const sign = new THREE.Group(); g.add(sign);
  cyl(0.025, 0.025, 1.2, darkWood, 0, 0.6, 0, 6, sign);
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.42, 0.03), [toon("#f2e6c8"), toon("#f2e6c8"), toon("#f2e6c8"), toon("#f2e6c8"), toon("#fff", bannerTex("GA ADIL!", "#fff6e0", "#d0453b", 512, 280)), toon("#f2e6c8")]); board.position.y = 1.25; add(board, sign);
  sign.visible = false;
  return { group: g, sky: skyTex(), sariEggs, nestEggs, coops, fire, steam, sign, budiHomeHen: new THREE.Vector3(-10.9, 0, 6.8) };
};
