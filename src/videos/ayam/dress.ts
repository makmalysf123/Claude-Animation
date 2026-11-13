// Set dressing for the acting scenes, after the reference shorts (string lights glowing at night, lived-in props all
// around the actors): a night bonfire corner and a day yard for the middle family. Plain three.js groups; the bulbs use
// HDR colours (> 1) so the bloom pass makes them glow, plus soft additive halos on the NOINK layer.
import * as THREE from "three";
import { NOINK } from "../bridge/ink";
import { twoTone } from "../bridge/shade";

const lam = (color: string) => twoTone(new THREE.MeshLambertMaterial({ color }));
const halo = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,214,140,0.9)"); gr.addColorStop(0.25, "rgba(255,180,90,0.35)"); gr.addColorStop(1, "rgba(255,160,60,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const haloMat = new THREE.SpriteMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });

/** a string of bulbs sagging between two bamboo poles (a -> b), n bulbs; returns the group */
export const stringLights = (a: THREE.Vector3, b: THREE.Vector3, n: number, h = 2.6, sag = 0.45) => {
  const g = new THREE.Group(), bamboo = lam("#b99a5a");
  for (const p of [a, b]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, h + 0.2, 8), bamboo); pole.position.set(p.x, (h + 0.2) / 2, p.z); pole.castShadow = true; g.add(pole); }
  const pts: THREE.Vector3[] = []; for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(new THREE.Vector3(a.x + (b.x - a.x) * t, h - sag * 4 * t * (1 - t), a.z + (b.z - a.z) * t)); }
  const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.008, 4), new THREE.MeshBasicMaterial({ color: "#1b1620" })); g.add(wire);
  const bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffd89a").multiplyScalar(2.6), fog: false });
  for (let i = 1; i < n; i++) { const t = i / n, p = new THREE.Vector3(a.x + (b.x - a.x) * t, h - sag * 4 * t * (1 - t) - 0.07, a.z + (b.z - a.z) * t);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), bulbMat); bulb.position.copy(p); bulb.layers.set(NOINK); g.add(bulb);
    const s = new THREE.Sprite(haloMat); s.position.copy(p); s.scale.setScalar(0.55); s.layers.set(NOINK); g.add(s); }
  return g;
};

/** night corner around the bonfire at bf: two strings of lights, a woven mat, firewood, a pot, a kerosene lamp on a crate */
export const bonfireDress = (bf: THREE.Vector3) => {
  const g = new THREE.Group();
  g.add(stringLights(new THREE.Vector3(bf.x - 3.6, 0, bf.z - 3.2), new THREE.Vector3(bf.x + 3.8, 0, bf.z - 3.6), 14, 2.7, 0.5));
  g.add(stringLights(new THREE.Vector3(bf.x + 3.8, 0, bf.z - 3.6), new THREE.Vector3(bf.x + 4.4, 0, bf.z + 2.6), 10, 2.7, 0.4));
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), new THREE.MeshLambertMaterial({ map: TEX.weaveTex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  mat.rotation.x = -Math.PI / 2; mat.position.set(bf.x - 0.2, 0.012, bf.z - 1.3); mat.receiveShadow = true; g.add(mat);
  const wood = lam("#6b4a2e");
  for (let i = 0; i < 9; i++) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.9, 8), wood); lg.rotation.z = Math.PI / 2; lg.position.set(bf.x - 2.6, 0.07 + Math.floor(i / 4) * 0.12, bf.z - 1.6 + (i % 4) * 0.14 + (Math.floor(i / 4) % 2) * 0.07); lg.castShadow = true; g.add(lg); }
  const pot = new THREE.Mesh(new THREE.LatheGeometry([0, 0.12, 0.17, 0.18, 0.15].map((r, i) => new THREE.Vector2(r, i * 0.06)), 16), lam("#3a3438")); pot.position.set(bf.x + 1.9, 0, bf.z + 0.6); pot.castShadow = true; g.add(pot);
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.4), TEX.texLam(TEX.woodTex)); crate.position.set(bf.x - 2.3, 0.2, bf.z + 0.9); crate.castShadow = true; g.add(crate);
  const lampGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.16, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffcf80").multiplyScalar(2.2), fog: false })); lampGlass.position.set(bf.x - 2.3, 0.5, bf.z + 0.9); lampGlass.layers.set(NOINK); g.add(lampGlass);
  const lh = new THREE.Sprite(haloMat); lh.position.copy(lampGlass.position); lh.scale.setScalar(0.9); lh.layers.set(NOINK); g.add(lh);
  // warm light pools on the ground under the bulbs
  const poolTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d")!; const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,190,110,0.55)"); gr.addColorStop(1, "rgba(255,170,80,0)"); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  for (const [dx, dz, s] of [[-2.2, -3.3, 3.2], [0.3, -3.5, 3.6], [2.6, -3.5, 3.2], [4.1, -1.0, 3.0], [4.2, 1.6, 2.6]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); p.rotation.x = -Math.PI / 2; p.position.set(bf.x + dx, 0.03, bf.z + dz); p.layers.set(NOINK); g.add(p); }
  return g;
};

const stripe = (c: string, i: number) => { const cv = document.createElement("canvas"); cv.width = 64; cv.height = 80; const g = cv.getContext("2d")!; g.fillStyle = c; g.fillRect(0, 0, 64, 80); g.fillStyle = "rgba(0,0,0,0.12)"; if (i % 2) for (let y = 0; y < 80; y += 12) g.fillRect(0, y, 64, 5); else for (let x = 0; x < 64; x += 14) g.fillRect(x, 0, 5, 80); g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(0, 72, 64, 8); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };
/** day yard for the middle family at (x, z): bale-bale bench, laundry line, potted plants, broom */
export const yardDress = (x: number, z: number) => {
  const g = new THREE.Group(), bamboo = lam("#c4a464"), wood = lam("#8a6236");
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.9), bamboo); top.position.set(x - 2.4, 0.5, z - 1.4); top.castShadow = true; top.receiveShadow = true; g.add(top);
  for (const [dx, dz] of [[-0.8, -0.38], [0.8, -0.38], [-0.8, 0.38], [0.8, 0.38]]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.07), wood); leg.position.set(x - 2.4 + dx, 0.25, z - 1.4 + dz); g.add(leg); }
  const a = new THREE.Vector3(x - 3.2, 0, z - 3.2), b = new THREE.Vector3(x + 2.2, 0, z - 3.6);
  for (const p of [a, b]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.0, 8), bamboo); pole.position.set(p.x, 1.0, p.z); pole.castShadow = true; g.add(pole); }
  const line = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(a.x, 1.9, a.z), new THREE.Vector3(b.x, 1.9, b.z)), 8, 0.008, 4), new THREE.MeshBasicMaterial({ color: "#3a3030" })); g.add(line);
  ["#d94a4a", "#f2d24a", "#4a8fd9", "#ffffff", "#6ab04a"].forEach((c, i) => { const t = 0.12 + i * 0.18, cl = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.7), new THREE.MeshLambertMaterial({ map: stripe(c, i), side: THREE.DoubleSide }));
    cl.position.set(a.x + (b.x - a.x) * t, 1.52, a.z + (b.z - a.z) * t); cl.rotation.y = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2; cl.castShadow = true; g.add(cl); });
  for (const [dx, dz, s] of [[-1.7, 0.9, 1], [2.6, -1.2, 0.8], [-3.0, -0.4, 0.9]]) { const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * s, 0.15 * s, 0.32 * s, 12), lam("#b5603a")); pot.position.set(x + dx, 0.16 * s, z + dz); pot.castShadow = true; g.add(pot);
    for (let k = 0; k < 5; k++) { const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 8, 6), lam(k % 2 ? "#4f8f3a" : "#3f7a30")); leaf.scale.set(0.6, 1.4, 0.4); leaf.position.set(x + dx + Math.cos(k * 1.3) * 0.1 * s, 0.45 * s + (k % 3) * 0.06, z + dz + Math.sin(k * 1.3) * 0.1 * s); leaf.rotation.z = Math.cos(k * 1.3) * 0.5; leaf.castShadow = true; g.add(leaf); } }
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), wood); stick.position.set(x + 2.9, 0.6, z - 0.6); stick.rotation.z = 0.25; g.add(stick);
  const brush = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.35, 10), lam("#d9c17a")); brush.position.set(x + 3.05, 0.16, z - 0.6); brush.rotation.z = 0.25; g.add(brush);
  return g;
};

// ---------------- textures (so props are never one flat colour) ----------------
const ctexD = (w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, rep = 1) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d")!; let s = 7;
  const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  draw(g, r); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 8; return t;
};
const woodTex = ctexD(256, 64, (g, r) => { g.fillStyle = "#8a6236"; g.fillRect(0, 0, 256, 64); for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(${60 + r() * 40},${38 + r() * 20},${18},${0.35 + r() * 0.3})`; g.lineWidth = 1 + r() * 2.5; g.beginPath(); const y = r() * 64; g.moveTo(0, y); g.bezierCurveTo(80, y + r() * 8 - 4, 170, y + r() * 8 - 4, 256, y + r() * 6 - 3); g.stroke(); } g.fillStyle = "rgba(40,24,12,0.5)"; g.fillRect(0, 0, 256, 3); g.fillRect(0, 61, 256, 3); });
const brickTex = ctexD(256, 256, (g, r) => { g.fillStyle = "#c9b8a0"; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 22) for (let x = (y / 22) % 2 ? -24 : 0; x < 256; x += 48) { g.fillStyle = `hsl(${12 + r() * 10},${38 + r() * 18}%,${46 + r() * 12}%)`; g.fillRect(x + 2, y + 2, 44, 18); } g.fillStyle = "rgba(255,255,255,0.0)"; });
const plasterTex = ctexD(256, 256, (g, r) => { g.fillStyle = "#e9e1cf"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(120,100,80,${0.05 + r() * 0.12})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 30, 4 + r() * 16, r() * 3, 0, 7); g.fill(); } g.strokeStyle = "rgba(60,50,40,0.6)"; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); let x = r() * 256, y = r() * 256; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += r() * 30 - 15; y += 10 + r() * 20; g.lineTo(x, y); } g.stroke(); } });
const zincTex = ctexD(128, 128, (g, r) => { for (let x = 0; x < 128; x += 8) { const gr = g.createLinearGradient(x, 0, x + 8, 0); gr.addColorStop(0, "#8d949c"); gr.addColorStop(0.5, "#c9ced4"); gr.addColorStop(1, "#7d848c"); g.fillStyle = gr; g.fillRect(x, 0, 8, 128); } for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(150,80,40,${0.2 + r() * 0.3})`; g.beginPath(); g.ellipse(r() * 128, r() * 128, 3 + r() * 10, 2 + r() * 6, 0, 0, 7); g.fill(); } });
const weaveTex = ctexD(128, 128, (g) => { g.fillStyle = "#c9a86a"; g.fillRect(0, 0, 128, 128); for (let y = 0; y < 128; y += 8) for (let x = 0; x < 128; x += 8) { g.fillStyle = (x + y) % 16 ? "#b8955a" : "#dcc08a"; g.fillRect(x + 1, y + 1, 6, 6); } }, 3);
const texLam = (map: THREE.Texture, color = "#ffffff") => twoTone(new THREE.MeshLambertMaterial({ map, color }));
export const TEX = { woodTex, brickTex, plasterTex, zincTex, weaveTex, texLam };

/** what the whirlwind left of one house: floor slab, broken wall stubs, scattered planks and tiles, a bent zinc sheet */
const ruin = (kind: "poor" | "mid" | "rich", x: number, z: number, seed: number) => {
  const g = new THREE.Group(); let s = seed * 9301 + 49297; const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const W = kind === "poor" ? 3.4 : kind === "mid" ? 5.6 : 8.5, D = kind === "poor" ? 3.0 : kind === "mid" ? 4.6 : 7;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(W, 0.18, D), texLam(kind === "poor" ? woodTex : plasterTex, "#c8c0b0")); slab.position.y = 0.09; slab.receiveShadow = true; slab.castShadow = true; g.add(slab);
  const wallM = texLam(kind === "poor" ? woodTex : kind === "mid" ? brickTex : plasterTex);
  for (let i = 0; i < 4; i++) { // broken wall stubs along the edges, jagged tops
    const along = i % 2 === 0, len = (along ? W : D) * (0.25 + r() * 0.35), h = 0.4 + r() * (kind === "poor" ? 0.9 : 1.6);
    const w = new THREE.Mesh(new THREE.BoxGeometry(along ? len : 0.18, h, along ? 0.18 : len), wallM);
    w.position.set(along ? (r() - 0.5) * (W - len) : (i === 1 ? 1 : -1) * W / 2, 0.18 + h / 2, along ? (i === 0 ? -1 : 1) * D / 2 : (r() - 0.5) * (D - len)); w.rotation.set((r() - 0.5) * 0.15, 0, (r() - 0.5) * 0.25); w.castShadow = true; g.add(w);
  }
  const plankM = texLam(woodTex), tileM = texLam(brickTex, "#d07050");
  for (let i = 0; i < 9 + (kind === "rich" ? 5 : 0); i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.2 + r() * 1.6, 0.06, 0.16), plankM); p.position.set((r() - 0.5) * (W + 2), 0.2 + r() * 0.35, (r() - 0.5) * (D + 2)); p.rotation.set((r() - 0.5) * 0.6, r() * 3.1, (r() - 0.5) * 0.5); p.castShadow = true; g.add(p); }
  for (let i = 0; i < 16; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.24), tileM); t.position.set((r() - 0.5) * (W + 3), 0.05 + r() * 0.25, (r() - 0.5) * (D + 3)); t.rotation.set(r() * 0.8, r() * 3.1, r() * 0.8); g.add(t); }
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4, 6, 2), texLam(zincTex)); const pos = sheet.geometry.attributes.position as THREE.BufferAttribute;
  for (let k = 0; k < pos.count; k++) pos.setZ(k, 0.25 * Math.sin(pos.getX(k) * 2.2 + seed)); sheet.geometry.computeVertexNormals(); (sheet.material as THREE.MeshLambertMaterial).side = THREE.DoubleSide;
  sheet.position.set((r() - 0.5) * W * 0.6, 0.55, (r() - 0.5) * D * 0.6); sheet.rotation.set(-1.1 + r() * 0.4, r() * 3, 0.2); sheet.castShadow = true; g.add(sheet);
  g.position.set(x, 0, z); return g;
};
/** the whole kampung after the whirlwind */
export const ruinsDress = (plots: { kind: "poor" | "mid" | "rich"; x: number; z: number; seed: number }[]) => { const g = new THREE.Group(); for (const p of plots) g.add(ruin(p.kind, p.x, p.z, p.seed + 3)); return g; };
