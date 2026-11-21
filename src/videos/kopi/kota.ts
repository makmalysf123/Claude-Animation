// East-Jakarta street furniture for "Kopi Mahal" (references: ruko streets around Jatinegara, Cawang, Rawamangun):
// 2-3 storey shophouses (ruko) with rolling doors, iron window grilles, AC units, water tanks on the roofs and
// hand-painted shop signs; concrete poles with many sagging cables; covered drains along the terraces; parked
// scooters; a narrow gang (alley); apartment towers and a flyover in the haze. All names are invented.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { plaster, rnd, fbm } from "../../lib/world2/textures";
import { std, canvasTex } from "../ketindihan2/sets";

type V3 = [number, number, number];
const mat = (c: string, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
const M = (geo: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], p: V3 = [0, 0, 0], r: V3 = [0, 0, 0]) => { const k = new THREE.Mesh(geo, m); k.position.set(...p); k.rotation.set(...r); k.castShadow = k.receiveShadow = true; return k; };
const B = (w: number, h: number, d: number, m: THREE.Material | THREE.Material[], p: V3, r: V3 = [0, 0, 0]) => M(new THREE.BoxGeometry(w, h, d), m, p, r);
const cyl = (r1: number, r2: number, h: number, m: THREE.Material, p: V3, r: V3 = [0, 0, 0], seg = 16) => M(new THREE.CylinderGeometry(r1, r2, h, seg), m, p, r);

// ---------------- textures ----------------
/** weathered painted concrete: rain streaks under the sills, grime at the base */
export const wallTex = (base: string) => {
  const t = canvasTex(512, 512, (g) => {
    g.drawImage((plaster(base).map.image as HTMLCanvasElement), 0, 0, 512, 512);
    for (let i = 0; i < 26; i++) { const x = rnd() * 512, w = 6 + rnd() * 26, h = 60 + rnd() * 260, gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(40,36,30,0.28)"); gr.addColorStop(1, "rgba(40,36,30,0)"); g.fillStyle = gr; g.fillRect(x, rnd() * 300, w, h); }
    const gb = g.createLinearGradient(0, 400, 0, 512); gb.addColorStop(0, "rgba(30,26,20,0)"); gb.addColorStop(1, "rgba(30,26,20,0.35)"); g.fillStyle = gb; g.fillRect(0, 400, 512, 112);
  }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
};
const rollTex = canvasTex(256, 256, (g) => { for (let y = 0; y < 256; y += 8) { const v = 150 + 30 * fbm(0, y, 256, 8, 2); g.fillStyle = `rgb(${v},${v + 2},${v + 6})`; g.fillRect(0, y, 256, 6); g.fillStyle = "rgba(0,0,0,0.45)"; g.fillRect(0, y + 6, 256, 2); }
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(120,70,30,${0.1 + rnd() * 0.25})`; g.beginPath(); g.ellipse(rnd() * 256, rnd() * 256, 3 + rnd() * 12, 2 + rnd() * 5, 0, 0, 7); g.fill(); }
  g.fillStyle = "rgba(20,20,20,0.6)"; g.font = "bold 22px Arial"; g.fillText("SEDOT WC 0812", 30, 140); });
rollTex.wrapS = rollTex.wrapT = THREE.RepeatWrapping;
export const tileTex = canvasTex(512, 512, (g) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const v = 196 + rnd() * 22; g.fillStyle = `rgb(${v},${v - 6},${v - 14})`; g.fillRect(x * 128, y * 128, 128, 128); }
  g.strokeStyle = "rgba(70,60,50,0.55)"; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke(); }
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(60,50,40,${0.05 + rnd() * 0.12})`; g.beginPath(); g.ellipse(rnd() * 512, rnd() * 512, 6 + rnd() * 40, 4 + rnd() * 20, rnd() * 3, 0, 7); g.fill(); } });
tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping;
/** a painted shop sign board */
export const signTex = (top: string, sub: string, bg: string, fg: string) => canvasTex(1024, 256, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 256); g.strokeStyle = fg; g.lineWidth = 10; g.strokeRect(14, 14, 996, 228);
  g.fillStyle = fg; g.textAlign = "center"; const fit = (txt: string, px: number, face: string, max: number) => { g.font = `bold ${px}px ${face}`; const w = g.measureText(txt).width; if (w > max) g.font = `bold ${Math.floor(px * max / w)}px ${face}`; };
  fit(top, 110, "'Arial Black', Arial", 900); g.fillText(top, 512, 140); fit(sub, 42, "Arial", 900); g.fillText(sub, 512, 210);
  for (let i = 0; i < 20; i++) { g.fillStyle = `rgba(0,0,0,${0.04 + rnd() * 0.08})`; g.fillRect(rnd() * 1024, rnd() * 256, 40 + rnd() * 160, 3 + rnd() * 10); } // sun-faded streaks
});
const windowTex = (lit: boolean) => canvasTex(128, 128, (g) => { g.fillStyle = lit ? "#ffd38a" : "#2e3540"; g.fillRect(0, 0, 128, 128); if (!lit) { const gr = g.createLinearGradient(0, 0, 128, 128); gr.addColorStop(0, "rgba(200,220,240,0.35)"); gr.addColorStop(0.5, "rgba(200,220,240,0.05)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
  else { g.fillStyle = "rgba(160,100,60,0.5)"; g.fillRect(0, 0, 40, 128); } g.strokeStyle = "#ddd"; g.lineWidth = 6; g.strokeRect(0, 0, 128, 128); g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 128); g.stroke(); });
const WIN = { day: windowTex(false), lit: windowTex(true) };

// ---------------- pieces ----------------
/** window with an iron grille (teralis) */
const grilleWin = (w: number, h: number, lit: boolean) => {
  const G = new THREE.Group(); const glass = M(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: lit ? WIN.lit : WIN.day, roughness: 0.2, metalness: 0.2, emissive: lit ? "#ffb060" : "#000", emissiveIntensity: lit ? 0.9 : 0, emissiveMap: lit ? WIN.lit : null }), [0, 0, 0.01]); glass.castShadow = false; G.add(glass);
  const iron = mat("#2a2c2e", { metalness: 0.6, roughness: 0.5 }); for (let x = -w / 2 + 0.08; x < w / 2; x += 0.12) G.add(B(0.015, h, 0.015, iron, [x, 0, 0.06]));
  for (const y of [-h / 2, 0, h / 2]) G.add(B(w, 0.02, 0.02, iron, [0, y, 0.06])); G.add(B(w + 0.1, 0.06, 0.18, mat("#bdb6aa"), [0, -h / 2 - 0.04, 0.08])); return G;
};
const acUnit = () => { const G = new THREE.Group(); G.add(B(0.75, 0.5, 0.28, mat("#e9e8e2", { roughness: 0.5 }), [0, 0, 0])); G.add(M(new THREE.CircleGeometry(0.18, 24), mat("#3a3b3d"), [0.12, 0, 0.142])); G.add(B(0.05, 0.4, 0.3, mat("#777"), [-0.42, -0.05, -0.05])); return G; };
const waterTank = () => { const G = new THREE.Group(); G.add(cyl(0.45, 0.45, 1.1, mat("#2f6fb0", { roughness: 0.4 }), [0, 1.0, 0], [0, 0, 0], 24)); G.add(cyl(0.2, 0.2, 0.1, mat("#2f6fb0"), [0, 1.6, 0])); const st = mat("#555", { metalness: 0.6 }); for (const [x, z] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) G.add(B(0.05, 0.45, 0.05, st, [x, 0.22, z])); G.add(B(0.85, 0.05, 0.85, st, [0, 0.45, 0])); return G; };
/** a parked 110cc scooter, nose toward +x */
export const scooter = (col: string) => {
  const G = new THREE.Group(), body = mat(col, { roughness: 0.3, metalness: 0.3 }), blk = mat("#151515", { roughness: 0.6 }), chrome = mat("#c9ccd0", { metalness: 1, roughness: 0.25 });
  for (const x of [-0.55, 0.55]) { G.add(M(new THREE.TorusGeometry(0.2, 0.06, 10, 24), blk, [x, 0.26, 0])); G.add(cyl(0.11, 0.11, 0.08, chrome, [x, 0.26, 0], [Math.PI / 2, 0, 0])); }
  G.add(M(new RoundedBoxGeometry(0.75, 0.28, 0.3, 3, 0.1), body, [-0.2, 0.5, 0])); G.add(M(new RoundedBoxGeometry(0.62, 0.1, 0.27, 3, 0.05), blk, [-0.25, 0.7, 0]));
  G.add(B(0.4, 0.06, 0.26, blk, [0.2, 0.3, 0])); G.add(M(new RoundedBoxGeometry(0.16, 0.75, 0.32, 3, 0.06), body, [0.48, 0.72, 0], [0, 0, -0.25]));
  G.add(cyl(0.015, 0.015, 0.62, blk, [0.6, 1.08, 0], [Math.PI / 2, 0, 0])); for (const z of [-0.18, 0.18]) G.add(B(0.05, 0.02, 0.12, chrome, [0.58, 1.12, z * 1.4]));
  G.add(M(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshStandardMaterial({ color: "#fff8e0", emissive: "#fff2c0", emissiveIntensity: 0.2 }), [0.62, 0.95, 0]));
  G.add(cyl(0.015, 0.015, 0.4, chrome, [0.15, 0.2, -0.17], [0, 0, 1.4])); G.traverse((k) => { k.castShadow = true; }); return G;
};
/** a galon (19 L water bottle) stack + a crate */
export const galonStack = () => { const G = new THREE.Group(), pl = new THREE.MeshPhysicalMaterial({ color: "#7ec4ea", roughness: 0.08, transparent: true, opacity: 0.55, clearcoat: 1 }), cap = mat("#2b6fd6", { roughness: 0.4 });
  [[0, 0], [0.3, 0.05], [0.15, 0.27]].forEach(([x, z], i) => { const y = i === 2 ? 0.5 : 0; G.add(M(new THREE.CylinderGeometry(0.135, 0.135, 0.42, 24), pl, [x, y + 0.21, z])); G.add(cyl(0.05, 0.135, 0.06, pl, [x, y + 0.45, z])); G.add(cyl(0.03, 0.03, 0.05, cap, [x, y + 0.5, z])); });
  G.add(B(0.45, 0.28, 0.32, mat("#d4342c", { roughness: 0.5 }), [-0.45, 0.14, 0.05])); return G; };

/** one ruko unit facing +z, base centre at the group origin. `ground`: "door" (rolling door), "half" (half open), "shop" (open front, lit) or "none" */
export const ruko = (o: { w: number; floors: number; col: string; sign?: [string, string, string, string]; ground: "door" | "half" | "shop" | "none"; night: boolean; seed?: number }) => {
  const G = new THREE.Group(), H1 = 3.2, HF = 3.0, top = H1 + HF * (o.floors - 1), wt = wallTex(o.col); const wm = new THREE.MeshStandardMaterial({ map: wt, roughness: 0.9 }); wt.repeat.set(o.w / 4, top / 4);
  G.add(B(o.w, top, 0.3, wm, [0, top / 2, -0.15])); // body
  G.add(B(o.w + 0.02, 0.5, 0.12, mat("#d8d2c6"), [0, top + 0.25, -0.05])); // parapet
  for (let f = 1; f < o.floors; f++) { const y = H1 + HF * (f - 1); G.add(B(o.w, 0.18, 0.7, mat("#cfc8bb"), [0, y, 0.2])); // floor slab / small balcony
    const n = o.w > 4 ? 2 : 1; for (let k = 0; k < n; k++) { const x = n === 1 ? 0 : (k ? 1 : -1) * o.w * 0.22, win = grilleWin(1.2, 1.3, o.night && rnd() < 0.55); win.position.set(x, y + 1.5, 0.02); G.add(win); }
    if (rnd() < 0.7) { const ac = acUnit(); ac.position.set((rnd() < 0.5 ? -1 : 1) * (o.w / 2 - 0.55), y + 0.5, 0.25); G.add(ac); } }
  if (rnd() < 0.8) { const tk = waterTank(); tk.position.set((rnd() - 0.5) * o.w * 0.5, top, -0.6); G.add(tk); }
  // ground floor
  const gw = o.w - 0.4;
  if (o.ground === "door" || o.ground === "half") { const dm = new THREE.MeshStandardMaterial({ map: rollTex, roughness: 0.55, metalness: 0.5 }); const h = o.ground === "half" ? 1.2 : 2.7; const rt = rollTex.clone(); rt.repeat.set(gw / 2, h / 2); rt.needsUpdate = true; dm.map = rt;
    G.add(B(gw, h, 0.05, dm, [0, 2.75 - h / 2, 0.02])); G.add(B(gw, 0.25, 0.25, mat("#9aa0a6", { metalness: 0.6, roughness: 0.4 }), [0, 2.85, 0.1]));
    if (o.ground === "half") { G.add(B(gw, 1.6, 0.05, new THREE.MeshStandardMaterial({ color: o.night ? "#3a2a1a" : "#2a2622", emissive: o.night ? "#ffb060" : "#000", emissiveIntensity: o.night ? 0.25 : 0 }), [0, 0.8, -0.2])); } }
  if (o.ground === "shop") { const inner = new THREE.MeshStandardMaterial({ color: "#efe9dc", emissive: "#ffe8c0", emissiveIntensity: o.night ? 0.7 : 0.18 }); G.add(B(gw, 2.7, 0.05, inner, [0, 1.35, -0.25]));
    for (let r = 0; r < 3; r++) G.add(B(gw - 0.3, 0.04, 0.35, mat("#888", { metalness: 0.4 }), [0, 0.6 + r * 0.6, -0.05]));
    for (let i = 0; i < 18; i++) G.add(B(0.12 + rnd() * 0.15, 0.15 + rnd() * 0.25, 0.15, mat(["#c0392b", "#2e86c1", "#f1c40f", "#27ae60", "#e67e22", "#ecf0f1"][i % 6], { roughness: 0.5 }), [-gw / 2 + 0.3 + rnd() * (gw - 0.6), 0.72 + Math.floor(rnd() * 3) * 0.6, -0.05])); }
  for (const s of [-1, 1]) G.add(B(0.25, 3.2, 0.32, mat("#cfc8bb"), [s * (o.w / 2 - 0.12), 1.6, 0.02])); // pilasters
  if (o.sign) { const [a, b, bg, fg] = o.sign; const sg = M(new THREE.PlaneGeometry(o.w - 0.5, (o.w - 0.5) / 4), new THREE.MeshStandardMaterial({ map: signTex(a, b, bg, fg), roughness: 0.6, emissive: o.night ? "#ffffff" : "#000", emissiveIntensity: o.night ? 0.25 : 0, emissiveMap: o.night ? signTex(a, b, bg, fg) : null }), [0, 3.15 + (o.w - 0.5) / 8 + 0.15, 0.32]); G.add(sg); }
  G.add(B(o.w, 0.12, 1.4, mat("#9a9488"), [0, 3.15, 0.55])); // concrete canopy over the terrace
  return G;
};

/** concrete poles with many sagging cables, a coil of spare cable, a street lamp; returns the lamp light (or null by day) */
export const poleLine = (R: THREE.Object3D, xs: number[], z: number, night: boolean, lampAt?: number) => {
  const pm = std(plaster("#9b9a95"), [1, 4]), tops: THREE.Vector3[] = [];
  for (const x of xs) { R.add(cyl(0.11, 0.16, 8.5, pm, [x, 4.25, z], [0, 0, 0], 8)); R.add(B(1.4, 0.1, 0.12, mat("#6d6c68"), [x, 7.9, z])); R.add(B(0.9, 0.1, 0.12, mat("#6d6c68"), [x, 6.8, z]));
    R.add(B(0.22, 0.32, 0.18, mat("#8a8a86"), [x, 5.6, z + 0.15])); // junction box
    const coil = M(new THREE.TorusGeometry(0.22, 0.035, 6, 20), mat("#111"), [x + 0.05, 4.6, z + 0.17]); R.add(coil); R.add(M(new THREE.TorusGeometry(0.18, 0.03, 6, 20), mat("#1a1a1a"), [x - 0.04, 4.35, z + 0.18], [0.3, 0.2, 0]));
    tops.push(new THREE.Vector3(x, 0, z)); }
  const wm = new THREE.MeshBasicMaterial({ color: "#141414" });
  const wires: [number, number, number, number][] = []; for (let k = 0; k < 16; k++) wires.push([7.9 - (k % 5) * 0.28 - (k > 9 ? 1.2 : 0), (rnd() - 0.5) * 1.1, 0.5 + rnd() * 1.4, k % 4 === 0 ? 0.022 : 0.009]);
  for (let i = 0; i < tops.length - 1; i++) for (const [y, dz, sag, r] of wires) { const a = tops[i].clone().add(new THREE.Vector3(0, y, dz * 0.4)), b = tops[i + 1].clone().add(new THREE.Vector3(0, y + (rnd() - 0.5) * 0.3, dz * 0.4)), mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, -sag, dz * 0.3));
    R.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 30, r, 4), wm)); }
  // drop cables from the poles into the buildings
  for (const t of tops) for (let k = 0; k < 4; k++) { const a = t.clone().add(new THREE.Vector3(0, 6.5 - k * 0.3, 0)), b = new THREE.Vector3(t.x + (rnd() - 0.5) * 5, 3.6 + rnd() * 2, z > 5 ? z + 2.4 : 0.1), mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, -0.7, 0)); R.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 20, 0.008, 4), wm)); }
  if (lampAt === undefined) return null;
  const x = lampAt, arm = cyl(0.04, 0.04, 1.6, mat("#5a5a5a", { metalness: 0.5 }), [x, 7.2, z + (z > 5 ? -0.7 : 0.7)], [Math.PI / 2, 0, 0]); R.add(arm);
  const head = M(new RoundedBoxGeometry(0.5, 0.12, 0.25, 2, 0.04), mat("#4a4a4a", { metalness: 0.5 }), [x, 7.15, z + (z > 5 ? -1.45 : 1.45)]); R.add(head);
  R.add(M(new THREE.PlaneGeometry(0.4, 0.18), new THREE.MeshBasicMaterial({ color: night ? new THREE.Color(3, 1.9, 0.9) : new THREE.Color(0.7, 0.7, 0.68) }), [x, 7.08, z + (z > 5 ? -1.45 : 1.45)], [Math.PI / 2, 0, 0]));
  if (!night) return null; const L = new THREE.PointLight("#ffb46a", 9, 14, 1.6); L.position.set(x, 6.9, z + (z > 5 ? -1.45 : 1.45)); R.add(L); return L;
};

/** hazy city behind the rows: apartment towers + an elevated road (flyover) */
export const skyline = (R: THREE.Object3D, z: number, night: boolean, flyover = false) => {
  const s = Math.sign(z);
  for (let i = 0; i < 9; i++) { const w = 6 + rnd() * 6, h = 18 + rnd() * 40, x = -40 + i * 10 + rnd() * 4, zz = z + s * (rnd() * 14);
    const t = canvasTex(128, 256, (g) => { g.fillStyle = ["#c9c4bb", "#b8c2c6", "#d4cbb9"][i % 3]; g.fillRect(0, 0, 128, 256); for (let y = 6; y < 256; y += 12) for (let xx = 6; xx < 128; xx += 14) { g.fillStyle = night ? (rnd() < 0.4 ? "#ffcf86" : "#1d2230") : `rgba(60,75,90,${0.35 + rnd() * 0.3})`; g.fillRect(xx, y, 9, 7); } });
    R.add(B(w, h, w * 0.8, new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, emissive: night ? "#ffffff" : "#000", emissiveMap: night ? t : null, emissiveIntensity: night ? 0.35 : 0 }), [x, h / 2, zz])); }
  if (!flyover) return;
  const cm = std(plaster("#b9b4aa"), [12, 1]); R.add(B(80, 1.0, 9, cm, [0, 9.2, z - s * 4])); R.add(B(80, 0.9, 0.25, cm, [0, 10.1, z - s * 4 - s * 4.4]));
  for (let x = -36; x <= 36; x += 12) R.add(B(1.6, 9, 1.6, cm, [x, 4.5, z - s * 4]));
};
