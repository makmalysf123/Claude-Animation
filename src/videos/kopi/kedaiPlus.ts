// Extra detail for the Kopi Mahal set (added after the v2 preview review, 2026-11-17):
// - rivalPlus: LANGIT COFFEE's interior stops looking like a template: brick back wall, tiled and slatted side walls,
//   beams, strings of Edison bulbs with halos that shimmer, pendant light cones, a glowing neon, an LED-lit bar,
//   a dressed espresso machine with chrome glints, coffee bags, wall art, tables, chairs and big leafy plants.
// - streetPlus: the street no longer ends after a few buildings: rows of ruko, trees, poles and parked bikes run out to
//   |x| = 70 on both sides, and tall blocks close the far ends.
// Everything that moves (shimmer) is a pure function of t, driven by Glow.update(t) from KedaiSet.update.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { woodPlanks, plaster, stone, rnd } from "../../lib/world2/textures";
import { std, canvasTex } from "../ketindihan2/sets";
import { ruko, poleLine, scooter, tileTex } from "./kota";

type V3 = [number, number, number];
const mat = (c: string, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
const M = (geo: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], p: V3 = [0, 0, 0], r: V3 = [0, 0, 0]) => { const k = new THREE.Mesh(geo, m); k.position.set(...p); k.rotation.set(...r); k.castShadow = k.receiveShadow = true; return k; };
const B = (w: number, h: number, d: number, m: THREE.Material | THREE.Material[], p: V3, r: V3 = [0, 0, 0]) => M(new THREE.BoxGeometry(w, h, d), m, p, r);
const RB = (w: number, h: number, d: number, rad: number, m: THREE.Material, p: V3, r: V3 = [0, 0, 0]) => M(new RoundedBoxGeometry(w, h, d, 3, rad), m, p, r);
const cyl = (r1: number, r2: number, h: number, m: THREE.Material, p: V3, r: V3 = [0, 0, 0], seg = 20) => M(new THREE.CylinderGeometry(r1, r2, h, seg), m, p, r);
const flat = <T extends THREE.Object3D>(o: T) => { o.traverse((c) => { c.castShadow = false; c.receiveShadow = false; }); return o; };

// ---------------- glow + shimmer ----------------
const haloTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.18, "rgba(255,255,255,0.55)"); gr.addColorStop(0.5, "rgba(255,255,255,0.12)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
const glintTex = canvasTex(128, 128, (g) => { g.translate(64, 64); for (const [a, L, w] of [[0, 62, 3], [Math.PI / 2, 62, 3], [Math.PI / 4, 30, 2], [-Math.PI / 4, 30, 2]] as [number, number, number][]) { g.save(); g.rotate(a); const gr = g.createLinearGradient(-L, 0, L, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(-L, -w, 2 * L, 2 * w); g.restore(); }
  const c = g.createRadialGradient(0, 0, 0, 0, 0, 14); c.addColorStop(0, "rgba(255,255,255,1)"); c.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = c; g.fillRect(-14, -14, 28, 28); });
type GlowItem = { s: THREE.Sprite; base: number; amp: number; f: number; ph: number; size: number; twinkle: boolean };
export class Glow {
  items: GlowItem[] = [];
  /** an additive halo sprite (bulb, neon, lamp) that breathes a little */
  halo(parent: THREE.Object3D, p: V3, size: number, color: string, opacity = 0.7, amp = 0.12, f = 0.6) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    s.position.set(...p); s.scale.setScalar(size); s.renderOrder = 8; parent.add(s); this.items.push({ s, base: opacity, amp, f, ph: rnd() * 6.28, size, twinkle: false }); return s;
  }
  /** a star-shaped glint on chrome / glass that pops in and out */
  glint(parent: THREE.Object3D, p: V3, size: number, f = 0.35) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTex, color: "#fff4dc", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    s.position.set(...p); s.scale.setScalar(size); s.renderOrder = 9; parent.add(s); this.items.push({ s, base: 0.9, amp: 0, f, ph: rnd() * 6.28, size, twinkle: true }); return s;
  }
  update(t: number) {
    for (const g of this.items) {
      const m = g.s.material as THREE.SpriteMaterial;
      if (g.twinkle) { const w = Math.max(0, Math.sin(t * g.f * 6.283 + g.ph)), k = Math.pow(w, 6); m.opacity = g.base * k; g.s.scale.setScalar(g.size * (0.4 + 0.6 * k)); m.rotation = t * 0.6 + g.ph; }
      else { const k = 1 + g.amp * (Math.sin(t * g.f * 6.283 + g.ph) * 0.6 + Math.sin(t * g.f * 15.1 + g.ph * 2) * 0.4); m.opacity = g.base * k; g.s.scale.setScalar(g.size * (0.96 + 0.04 * k)); }
    }
  }
}

/** light-cone falloff: bright at the lamp, gone by the floor (cylinder/cone UV v = 1 at the top) */
export const coneTex = canvasTex(16, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 16, 256); });
// ---------------- textures ----------------
const brickTex = canvasTex(1024, 512, (g) => {
  g.fillStyle = "#b9ad9c"; g.fillRect(0, 0, 1024, 512); // mortar
  const bw = 64, bh = 24;
  for (let r = 0; r * (bh + 4) < 512; r++) for (let c = -1; c * (bw + 4) < 1024; c++) {
    const x = c * (bw + 4) + (r % 2 ? 34 : 0), y = r * (bh + 4) + 2, k = rnd();
    const base = [[150, 72, 52], [168, 86, 60], [132, 62, 46], [178, 98, 70], [120, 58, 44]][Math.floor(k * 5)];
    const v = (rnd() - 0.5) * 18; g.fillStyle = `rgb(${base[0] + v},${base[1] + v * 0.6},${base[2] + v * 0.5})`; g.fillRect(x, y, bw, bh);
    g.fillStyle = "rgba(255,230,200,0.10)"; g.fillRect(x, y, bw, 4); g.fillStyle = "rgba(0,0,0,0.14)"; g.fillRect(x, y + bh - 4, bw, 4);
    for (let i = 0; i < 10; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? "40,20,10" : "230,200,170"},${0.06 + rnd() * 0.08})`; g.fillRect(x + rnd() * bw, y + rnd() * bh, 2 + rnd() * 5, 2); }
  }
  // a whitewash patch fading out, like an old wall cleaned back to brick
  const gr = g.createRadialGradient(820, 90, 10, 820, 90, 260); gr.addColorStop(0, "rgba(240,234,224,0.55)"); gr.addColorStop(1, "rgba(240,234,224,0)"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
});
const greenTileTex = canvasTex(512, 512, (g) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) { const v = rnd() * 16; g.fillStyle = `rgb(${34 + v},${92 + v},${78 + v})`; g.fillRect(x * 64 + 2, y * 32 + 2, 60, 28); g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(x * 64 + 4, y * 32 + 4, 56, 5); }
  g.strokeStyle = "#e9e3d6"; g.lineWidth = 3; for (let y = 0; y <= 16; y++) { g.beginPath(); g.moveTo(0, y * 32); g.lineTo(512, y * 32); g.stroke(); } for (let x = 0; x <= 8; x++) { g.beginPath(); g.moveTo(x * 64, 0); g.lineTo(x * 64, 512); g.stroke(); } });
const bagTex = (name: string, origin: string, col: string) => canvasTex(160, 240, (g) => {
  g.fillStyle = "#c9a476"; g.fillRect(0, 0, 160, 240); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(90,60,30,${rnd() * 0.12})`; g.fillRect(rnd() * 160, rnd() * 240, 2, 2); }
  g.fillStyle = "#3a2618"; g.fillRect(0, 0, 160, 26); g.fillStyle = col; g.fillRect(18, 70, 124, 110); g.fillStyle = "#fbf6ea"; g.font = "bold 24px 'Helvetica Neue', Arial"; g.textAlign = "center"; g.fillText(name, 80, 112);
  g.font = "16px 'Helvetica Neue', Arial"; g.fillText(origin, 80, 140); g.fillText("250 g", 80, 165); g.strokeStyle = "#fbf6ea"; g.lineWidth = 2; g.beginPath(); g.arc(80, 50, 14, 0, Math.PI * 2); g.stroke();
});
const artTex = (seed: number) => canvasTex(256, 320, (g) => {
  const pals = [["#f2e8d5", "#e07a5f", "#3d405b", "#81b29a"], ["#efe6d8", "#264653", "#e9c46a", "#f4a261"], ["#f4efe6", "#6d597a", "#b56576", "#eaac8b"]][((seed % 3) + 3) % 3];
  g.fillStyle = pals[0]; g.fillRect(0, 0, 256, 320);
  for (let i = 0; i < 5; i++) { g.fillStyle = pals[1 + (i % 3)]; g.globalAlpha = 0.9; g.beginPath(); if ((i + seed) % 2) g.arc(40 + rnd() * 176, 50 + rnd() * 220, 25 + rnd() * 50, 0, Math.PI * 2); else g.rect(20 + rnd() * 150, 30 + rnd() * 200, 40 + rnd() * 80, 30 + rnd() * 90); g.fill(); }
  g.globalAlpha = 1; g.strokeStyle = pals[1]; g.lineWidth = 4; g.beginPath(); g.moveTo(20, 280); for (let x = 20; x < 240; x += 10) g.lineTo(x, 280 + 10 * Math.sin(x * 0.08 + seed)); g.stroke();
});
const leafTex = canvasTex(256, 256, (g) => { // a monstera-ish leaf with splits, alpha cut
  g.clearRect(0, 0, 256, 256); g.save(); g.translate(128, 240);
  g.fillStyle = "#2f7a3c"; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-120, -40, -120, -200, 0, -232); g.bezierCurveTo(120, -200, 120, -40, 0, 0); g.fill();
  g.globalCompositeOperation = "destination-out"; for (let i = 0; i < 5; i++) { const y = -50 - i * 34; for (const s of [-1, 1]) { g.save(); g.translate(0, y); g.rotate(s * (1.0 - i * 0.08)); g.fillRect(28, -5, 120, 10); g.restore(); } }
  g.globalCompositeOperation = "source-over"; g.strokeStyle = "#5fae5a"; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -228); g.stroke(); g.restore();
  g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(0, 0, 256, 120);
});
const leafMat = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55 });
/** a big potted plant: tall pot + a dozen monstera leaves on stems */
const bigPlant = (pot = "#e8e2d6", h = 1.2) => { const G = new THREE.Group(); G.add(cyl(0.2, 0.16, 0.45, mat(pot, { roughness: 0.35 }), [0, 0.225, 0], [0, 0, 0], 24)); G.add(cyl(0.19, 0.19, 0.02, mat("#3a2a1e"), [0, 0.44, 0]));
  for (let i = 0; i < 12; i++) { const a = i * 2.4 + rnd() * 0.5, L = h * (0.55 + rnd() * 0.45), tilt = 0.35 + rnd() * 0.5, s = 0.32 + rnd() * 0.18;
    const st = new THREE.Group(); st.position.set(0, 0.44, 0); st.rotation.set(0, a, 0); G.add(st); const arm = new THREE.Group(); arm.rotation.z = tilt; st.add(arm);
    arm.add(cyl(0.006, 0.008, L, mat("#3f7f3a"), [0, L / 2, 0], [0, 0, 0], 5)); const lf = M(new THREE.PlaneGeometry(s, s), leafMat, [0, L + s * 0.35, 0.02], [-0.5 - rnd() * 0.4, 0, rnd() - 0.5]); arm.add(lf); }
  return G; };
/** a street tree: trunk, a few branches, round clumps of leaves */
const tree = (h = 4.5) => { const G = new THREE.Group(), bark = mat("#5c4a3a", { roughness: 0.95 }), lv = [mat("#3f7d3a", { roughness: 0.85, flatShading: true }), mat("#4f8f40", { roughness: 0.85, flatShading: true }), mat("#356b32", { roughness: 0.85, flatShading: true })];
  G.add(cyl(0.09, 0.14, h * 0.6, bark, [0, h * 0.3, 0], [0, 0, 0], 8)); G.add(cyl(0.3, 0.3, 0.06, mat("#7a6a58"), [0, 0.03, 0], [0, 0, 0], 16));
  for (let i = 0; i < 7; i++) { const a = i * 0.9 + rnd(), r = 0.4 + rnd() * 0.7, y = h * (0.62 + rnd() * 0.32), s = 0.6 + rnd() * 0.55; G.add(M(new THREE.IcosahedronGeometry(s, 1), lv[i % 3], [Math.cos(a) * r, y, Math.sin(a) * r])); }
  return G; };

// ---------------- LANGIT COFFEE interior (IN-local coords: floor y 0.15, back wall z -2.4, side walls x ±3.6, +z street) ----------------
export const rivalPlus = (IN: THREE.Group, day: boolean, glow: Glow) => {
  // walls: brick behind the bar, green tiles left, oak slats right, dark ceiling with beams
  IN.add(M(new THREE.PlaneGeometry(7.18, 3.1), new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.92, color: "#d8c8b8" }), [0, 1.72, -2.345]));
  { const tt = greenTileTex.clone(); tt.wrapS = tt.wrapT = THREE.RepeatWrapping; tt.repeat.set(3, 2); tt.needsUpdate = true; IN.add(M(new THREE.PlaneGeometry(4.9, 1.6), new THREE.MeshStandardMaterial({ map: tt, roughness: 0.18, envMapIntensity: 1.4 }), [3.54, 0.95, 0], [0, -Math.PI / 2, 0])); }
  { const sl = std(woodPlanks("#8a5a34", 30, "rslat"), [3, 1], { roughness: 0.5 }); IN.add(M(new THREE.PlaneGeometry(4.9, 3.1), sl, [-3.54, 1.72, 0], [0, Math.PI / 2, 0])); }
  IN.add(M(new THREE.PlaneGeometry(7.18, 4.9), mat("#1d1a18", { roughness: 0.9 }), [0, 3.245, 0], [Math.PI / 2, 0, 0]));
  for (const z of [-1.8, -0.6, 0.6, 1.8]) IN.add(B(7.1, 0.16, 0.12, std(woodPlanks("#6b4428", 3, "beam"), [3, 1]), [0, 3.17, z]));
  // wall art on the slats and the tiles
  [[-3.5, 1.9, -1.2, 0], [-3.5, 1.75, -0.2, 1], [3.5, 2.15, -1.3, 2], [3.5, 2.05, 0.5, 0]].forEach(([x, y, z, s]) => { const fr = new THREE.Group(); fr.position.set(x, y, z); fr.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; IN.add(fr);
    fr.add(B(0.52, 0.64, 0.03, mat("#1a1a1a", { roughness: 0.4 }), [0, 0, 0])); fr.add(M(new THREE.PlaneGeometry(0.44, 0.56), new THREE.MeshStandardMaterial({ map: artTex(s + Math.round(z * 10)), roughness: 0.7 }), [0, 0, 0.017])); });
  // strings of Edison bulbs zig-zagging under the beams, each with a halo that shimmers
  const bulbM = new THREE.MeshBasicMaterial({ color: day ? new THREE.Color(2.6, 1.8, 0.9) : new THREE.Color(3.2, 2.2, 1.0), toneMapped: false }), wire = new THREE.MeshBasicMaterial({ color: "#151515" });
  for (const [z0, z1] of [[-2.0, 1.4], [1.4, -2.0]] as [number, number][]) for (const x0 of [-3.2, z0 < z1 ? -0.4 : 0.4]) {
    const a = new THREE.Vector3(x0, 3.0, z0), b = new THREE.Vector3(x0 + (z0 < z1 ? 2.6 : 2.6), 3.0, z1), mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, -0.35, 0)), cur = new THREE.QuadraticBezierCurve3(a, mid, b);
    IN.add(flat(new THREE.Mesh(new THREE.TubeGeometry(cur, 24, 0.004, 4), wire)));
    for (let i = 1; i < 9; i++) { const p = cur.getPoint(i / 9); IN.add(flat(cyl(0.004, 0.004, 0.08, wire, [p.x, p.y - 0.04, p.z]))); IN.add(flat(M(new THREE.SphereGeometry(0.028, 12, 10), bulbM, [p.x, p.y - 0.11, p.z]))); glow.halo(IN, [p.x, p.y - 0.11, p.z], 0.32, "#ffb867", day ? 0.55 : 0.8, 0.14, 0.5 + rnd() * 0.6); }
  }
  // the four pendants: a hot halo at each bulb and a soft cone of light falling to the bar / floor
  const coneM = new THREE.MeshBasicMaterial({ map: coneTex, color: "#ffd59a", transparent: true, opacity: day ? 0.08 : 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  for (const x of [-2.4, -0.8, 0.8, 2.4]) { glow.halo(IN, [x, 2.36, -0.6], 0.55, "#ffc27a", day ? 0.65 : 0.9, 0.08, 0.3); const cn = flat(M(new THREE.ConeGeometry(0.55, 1.25, 28, 1, true), coneM, [x, 1.75, -0.6])); cn.renderOrder = 7; IN.add(cn); }
  // the neon gets a pink haze on the bricks; it buzzes faintly
  glow.halo(IN, [0, 2.5, -2.3], 1.9, "#ff5aa8", day ? 0.32 : 0.6, 0.18, 1.7);
  // the bar: warm LED strip under the counter lip washing down the front, a brass foot rail
  IN.add(flat(B(4.5, 0.015, 0.02, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.6, 0.8), toneMapped: false }), [0, 1.17, -0.8])));
  { const wash = canvasTex(64, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,190,110,0.9)"); gr.addColorStop(0.5, "rgba(255,170,90,0.25)"); gr.addColorStop(1, "rgba(255,170,90,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); });
    const w = flat(M(new THREE.PlaneGeometry(4.4, 0.9), new THREE.MeshBasicMaterial({ map: wash, transparent: true, opacity: day ? 0.45 : 0.75, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), [0, 0.72, -0.84])); w.renderOrder = 6; IN.add(w); }
  IN.add(cyl(0.02, 0.02, 4.4, mat("#c9a14a", { metalness: 1, roughness: 0.2 }), [0, 0.32, -0.7], [0, 0, Math.PI / 2], 10));
  // espresso machine dressing (machine at IN (-0.6, 1.25, -1.3)): cups warming on top, steam wands, drip tray, tamper, knock box, chrome glints
  { const cupM = mat("#f6f3ee", { roughness: 0.25 }); for (let i = 0; i < 7; i++) IN.add(cyl(0.034, 0.026, 0.06, cupM, [-0.98 + i * 0.12, 1.79, -1.3 - (i % 2) * 0.08], [0, 0, 0], 14));
    const ch = mat("#e6e9ee", { metalness: 1, roughness: 0.1 }); for (const s of [-1, 1]) { IN.add(cyl(0.008, 0.008, 0.32, ch, [-0.6 + s * 0.52, 1.38, -1.08], [0.25, 0, s * 0.18], 8)); }
    IN.add(B(0.9, 0.025, 0.16, mat("#222", { metalness: 0.7, roughness: 0.3 }), [-0.6, 1.24, -1.0]));
    IN.add(cyl(0.03, 0.035, 0.05, ch, [0.1, 1.25, -1.0])); IN.add(cyl(0.012, 0.012, 0.07, mat("#3a2418"), [0.1, 1.31, -1.0]));
    IN.add(RB(0.16, 0.12, 0.16, 0.02, mat("#1b1b1b", { roughness: 0.4 }), [0.3, 1.28, -1.25]));
    for (const p of [[-0.95, 1.55, -1.04], [-0.3, 1.5, -1.04], [0.15, 1.62, -1.2], [-0.6, 1.72, -1.05]] as V3[]) glow.glint(IN, p, 0.12, 0.25 + rnd() * 0.25);
    // a second grinder, a scale with a lit display, a row of milk jugs
    IN.add(cyl(0.07, 0.08, 0.28, mat("#1d1f23", { metalness: 0.6, roughness: 0.3 }), [0.55, 1.36, -1.3])); IN.add(M(new THREE.ConeGeometry(0.09, 0.16, 20), new THREE.MeshPhysicalMaterial({ color: "#d0e2e8", roughness: 0.05, transparent: true, opacity: 0.4 }), [0.55, 1.58, -1.3], [Math.PI, 0, 0]));
    IN.add(B(0.16, 0.02, 0.14, mat("#2a2a2a"), [0.85, 1.235, -1.05])); IN.add(flat(M(new THREE.PlaneGeometry(0.06, 0.02), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 2.2, 1.2), toneMapped: false }), [0.85, 1.24, -0.979])));
    for (let i = 0; i < 4; i++) IN.add(cyl(0.035, 0.04, 0.1, ch, [1.95 - i * 0.11, 1.28, -1.4]));
  }
  // shelves: coffee bags with our own labels, stacked cups, small plants
  { const bags: [string, string, string][] = [["LANGIT", "HOUSE BLEND", "#26465a"], ["GAYO", "ACEH", "#7a3b2e"], ["TORAJA", "SULAWESI", "#2e5a3a"], ["KINTAMANI", "BALI", "#8a5a1e"], ["FLORES", "BAJAWA", "#4a2e5a"]];
    for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) { const [a, b, c] = bags[(i + r * 2) % 5], x = -2.25 + i * 0.9 + (r ? 0.3 : 0);
      const bg = M(new THREE.BoxGeometry(0.16, 0.24, 0.09), [mat("#c9a476"), mat("#c9a476"), mat("#3a2618"), mat("#c9a476"), new THREE.MeshStandardMaterial({ map: bagTex(a, b, c), roughness: 0.8 }), mat("#c9a476")], [x, 1.51 + r * 0.45, -2.12], [0, (rnd() - 0.5) * 0.3, 0]); IN.add(bg); }
    for (const x of [-1.6, 0.9, 2.2]) { IN.add(cyl(0.06, 0.05, 0.1, mat("#f0ebe2"), [x, 2.32, -2.15])); for (let i = 0; i < 6; i++) IN.add(M(new THREE.PlaneGeometry(0.06, 0.16), leafMat, [x + (rnd() - 0.5) * 0.06, 2.42, -2.15 + (rnd() - 0.5) * 0.06], [0, rnd() * 3, (rnd() - 0.5) * 0.8])); }
  }
  // two cafe tables with bentwood chairs, cups and a pastry; big plants in the corners
  const tableAt = (x: number, z: number) => { const G = new THREE.Group(); G.position.set(x, 0.15, z); IN.add(G); G.add(cyl(0.32, 0.32, 0.03, mat("#f1ede6", { roughness: 0.2 }), [0, 0.74, 0], [0, 0, 0], 32)); G.add(cyl(0.03, 0.03, 0.72, mat("#1b1d21", { metalness: 0.6 }), [0, 0.37, 0])); G.add(cyl(0.22, 0.24, 0.03, mat("#1b1d21", { metalness: 0.6 }), [0, 0.015, 0]));
    G.add(cyl(0.04, 0.03, 0.07, mat("#fbf8f2", { roughness: 0.25 }), [0.1, 0.79, 0.05], [0, 0, 0], 16)); G.add(cyl(0.07, 0.07, 0.008, mat("#fbf8f2"), [0.1, 0.758, 0.05], [0, 0, 0], 20)); G.add(cyl(0.05, 0.05, 0.04, mat("#d99a4e"), [-0.12, 0.775, -0.06], [0, 0, 0], 16));
    for (const a of [0.6, 3.6]) { const c = new THREE.Group(); c.position.set(Math.cos(a) * 0.48, 0, Math.sin(a) * 0.48); c.rotation.y = -a + Math.PI / 2; G.add(c); const wd = mat("#6a4127", { roughness: 0.5 });
      c.add(cyl(0.2, 0.2, 0.03, wd, [0, 0.46, 0], [0, 0, 0], 20)); for (const [dx, dz] of [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]]) c.add(cyl(0.012, 0.014, 0.46, wd, [dx, 0.23, dz], [dz * 0.4, 0, -dx * 0.4], 6));
      c.add(M(new THREE.TorusGeometry(0.17, 0.012, 6, 20, Math.PI), wd, [0, 0.72, -0.17], [0, 0, 0])); c.add(cyl(0.012, 0.012, 0.26, wd, [-0.17, 0.59, -0.17], [0, 0, 0], 6)); c.add(cyl(0.012, 0.012, 0.26, wd, [0.17, 0.59, -0.17], [0, 0, 0], 6)); } };
  tableAt(0.3, 0.75); tableAt(2.6, 0.45);
  { const p1 = bigPlant("#e8e2d6", 1.3); p1.position.set(3.15, 0.15, -1.95); IN.add(p1); const p2 = bigPlant("#2e2e2e", 1.1); p2.position.set(-3.15, 0.15, -1.9); IN.add(p2); }
  // a chalk A-board sign leaning by the bar end, a floor rug under the tables
  IN.add(M(new THREE.PlaneGeometry(2.6, 1.6), new THREE.MeshStandardMaterial({ color: "#8a6a4a", roughness: 0.95 }), [1.4, 0.168, 0.6], [-Math.PI / 2, 0, 0]));
  // window reflections: faint moving sheen on the glass is drawn by the halos; add glints on the cake case and the ring
  glow.glint(IN, [1.9, 1.62, -0.92], 0.14, 0.3); glow.glint(IN, [-2.1, 1.92, 0.95], 0.18, 0.2);
};

// ---------------- the street goes on: ground, buildings, trees, poles, bikes out to |x| = 70 ----------------
const SIGNS: [string, string, string, string][] = [
  ["APOTEK SEHAT", "OBAT · VITAMIN · ALKES", "#1f8a4c", "#ffffff"], ["BAKSO PAK DIN", "BAKSO URAT · MIE AYAM", "#c0392b", "#ffe9a8"], ["WARTEG BAHARI", "MASAKAN RUMAH", "#2a5aa8", "#ffffff"],
  ["TOKO EMAS SURYA", "PERHIASAN · LOGAM MULIA", "#8a1d1d", "#ffd55a"], ["BIMBEL CERDAS", "SD · SMP · SMA", "#f2c230", "#1b1b1b"], ["MART 24", "BUKA 24 JAM", "#e8473b", "#ffffff"],
  ["PECEL LELE", "LAMONGAN · SAMBAL MANTAP", "#f4efe6", "#b0302a"], ["SERVIS AC", "CUCI AC · ISI FREON", "#1b6aa5", "#ffffff"], ["BENGKEL LAS", "PAGAR · KANOPI · TERALIS", "#3a3a3a", "#ffd23a"],
  ["MARTABAK BANGKA", "MANIS · TELOR", "#6a2a7a", "#ffe08a"], ["OPTIK TERANG", "KACAMATA · SOFTLENS", "#f2f0ea", "#1d4f9c"], ["TOKO KUE NIA", "KUE BASAH · TART", "#e86f8a", "#ffffff"],
];
const COLS = ["#e3d6b8", "#d6c3c3", "#cfd6c8", "#d9cdb8", "#c9cfd6", "#e6dccb", "#d1c4b0", "#c7d0c2"];
export const streetPlus = (R: THREE.Group, day: boolean, asphalt: THREE.Texture) => {
  // ground continues past the old 30-40 m strip (separate pieces only beyond it: no overlapping planes, no z-fighting)
  for (const s of [-1, 1]) {
    const cx = s * 42.5, cx2 = s * 45; // old strips end at |x| 15 (road, curbs, sidewalk) and 20 (terraces, drain)
    const road = M(new THREE.PlaneGeometry(55, 5), new THREE.MeshStandardMaterial({ map: (() => { const t = asphalt.clone(); t.repeat.set(55 / 3.75, 2); t.needsUpdate = true; return t; })(), color: "#9a9a9e", roughness: day ? 0.72 : 0.4 }), [cx, 0.002, 5.1], [-Math.PI / 2, 0, 0]); road.castShadow = false; R.add(road);
    for (let x = 15.6; x < 70; x += 2.4) R.add(M(new THREE.PlaneGeometry(1.2, 0.1), mat("#e9e6da", { roughness: 0.6 }), [s * x, 0.004, 5.1], [-Math.PI / 2, 0, 0]));
    const curbM = std(stone(), [14, 1]); R.add(B(55, 0.14, 0.2, curbM, [cx, 0.07, 2.6])); R.add(B(55, 0.14, 0.2, curbM, [cx, 0.07, 7.6]));
    R.add(B(55, 0.12, 2.4, std(plaster("#bdb6aa"), [18, 1]), [cx, 0.06, 8.9]));
    { const tt = tileTex.clone(); tt.wrapS = tt.wrapT = THREE.RepeatWrapping; tt.repeat.set(50 / 1.6, 2.0 / 1.6); tt.needsUpdate = true; R.add(M(new THREE.PlaneGeometry(50, 2.0), new THREE.MeshStandardMaterial({ map: tt, roughness: day ? 0.3 : 0.35 }), [cx2, 0.03, 0.97], [-Math.PI / 2, 0, 0])); }
    R.add(B(50, 0.02, 0.6, mat("#1c1a16"), [cx2, 0.0, 2.25])); R.add(B(50, 0.06, 0.04, mat("#77746c"), [cx2, 0.03, 1.96])); { const slab = std(stone(), [1, 1]); for (let x = 20; x < 70; x += 1.0) R.add(B(0.97, 0.06, 0.55, slab, [s * (x + 0.5), 0.03, 2.25])); }
    // ruko rows: the warung side (facing +z) and the cafe side (facing -z), varied height, colour and sign
    let k = 0;
    for (let x = s > 0 ? 18.65 : 17.0; x < 68; x += 4.4, k++) { const sg = rnd() < 0.75 ? SIGNS[(k * 5 + (s > 0 ? 0 : 7)) % SIGNS.length] : undefined;
      const r = ruko({ w: 4.4, floors: 2 + Math.floor(rnd() * 3), col: COLS[(k + (s > 0 ? 0 : 3)) % COLS.length], sign: sg, ground: (["shop", "door", "half", "shop"] as const)[k % 4], night: !day }); r.position.set(s * x, 0, -0.1); R.add(r); }
    k = 0;
    for (let x = 14.8; x < 68; x += 4.4, k++) { const sg = rnd() < 0.75 ? SIGNS[(k * 7 + (s > 0 ? 3 : 9)) % SIGNS.length] : undefined;
      const r = ruko({ w: 4.4, floors: 2 + Math.floor(rnd() * 3), col: COLS[(k + (s > 0 ? 5 : 1)) % COLS.length], sign: sg, ground: (["door", "shop", "shop", "half"] as const)[k % 4], night: !day }); r.position.set(s * x, 0, 10.35); r.rotation.y = Math.PI; R.add(r); }
    // trees on the cafe-side sidewalk and in front of a few warung-side shops, parked bikes, poles with cables
    for (let x = 16.5; x < 68; x += 7.5 + rnd() * 3) { const tr = tree(4.2 + rnd() * 1.6); tr.position.set(s * x, 0.12, 9.6); tr.rotation.y = rnd() * 6; R.add(tr); }
    for (let x = 21; x < 68; x += 11 + rnd() * 4) { const tr = tree(3.6 + rnd() * 1.2); tr.position.set(s * x, 0, 2.1); R.add(tr); }
    for (let x = 17; x < 66; x += 3 + rnd() * 6) { const sc = scooter(["#1f1f22", "#c0392b", "#2f68b0", "#e8e4da", "#8a1f2a", "#3a7a4a"][Math.floor(rnd() * 6)]); const far = rnd() < 0.5; sc.position.set(s * x, far ? 0.12 : 0, far ? 8.4 : 1.6); sc.rotation.y = (far ? 1.6 : 1.5) + (rnd() - 0.5) * 0.5; R.add(sc); }
    const xs: number[] = []; for (let x = s > 0 ? 15.4 : 13.9; x < 70; x += 9.5) xs.push(s * x); if (s < 0) xs.reverse(); poleLine(R, xs, 2.5, !day); poleLine(R, xs.map((x) => x + 2.2 * s), 7.75, !day);
    // the far end: tall blocks across the street so the view never runs out into empty haze
    for (let i = 0; i < 4; i++) { const h = 14 + rnd() * 20, w = 7 + rnd() * 5, z = -6 + i * 7;
      const t = canvasTex(128, 256, (g) => { g.fillStyle = COLS[(i + (s > 0 ? 2 : 5)) % COLS.length]; g.fillRect(0, 0, 128, 256); for (let y = 8; y < 256; y += 14) for (let x = 8; x < 128; x += 16) { g.fillStyle = !day && rnd() < 0.4 ? "#ffcf86" : "#3a4652"; g.fillRect(x, y, 9, 8); } });
      R.add(B(w, h, 6, new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, emissive: day ? "#000" : "#fff", emissiveMap: day ? null : t, emissiveIntensity: day ? 0 : 0.3 }), [s * (74 + rnd() * 6), h / 2, z])); }
  }
};
