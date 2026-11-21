// "Kopi Mahal" v2 set: KEDAI MAKMUR, a small old coffee shop on one side of an asphalt street, a glossy new cafe across it.
// Axes: the warung facade is the plane z = 0 facing +z, its counter front at z = 1.2, its yard/sidewalk to z = 2.4;
// the road runs along x from z = 2.6 to 7.6; the cafe facade is at z = 10.2 facing -z (toward the warung).
// mode "day": warm morning sun from the left, cool sky fill. mode "night": one warm bulb under the warung awning,
// the cafe dark except a few security lights, a cool moon.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { woodPlanks, plaster, stone, rnd, fbm, seedRnd } from "../../lib/world2/textures";
import { std, canvasTex, LiveTex } from "../ketindihan2/sets";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { shaftTex } from "../../lib/world2/textures";
import { NOINK } from "../bridge/ink";
import { ruko, poleLine, skyline, scooter, galonStack, tileTex, wallTex, signTex } from "./kota";
import { Glow, rivalPlus, streetPlus, coneTex } from "./kedaiPlus";

type V3 = [number, number, number];
const mat = (c: string, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
const M = (geo: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], p: V3 = [0, 0, 0], r: V3 = [0, 0, 0]) => { const k = new THREE.Mesh(geo, m); k.position.set(...p); k.rotation.set(...r); k.castShadow = k.receiveShadow = true; return k; };
const B = (w: number, h: number, d: number, m: THREE.Material | THREE.Material[], p: V3, r: V3 = [0, 0, 0]) => M(new THREE.BoxGeometry(w, h, d), m, p, r);
const RB = (w: number, h: number, d: number, rad: number, m: THREE.Material, p: V3, r: V3 = [0, 0, 0]) => M(new RoundedBoxGeometry(w, h, d, 3, rad), m, p, r);
const cyl = (r1: number, r2: number, h: number, m: THREE.Material, p: V3, r: V3 = [0, 0, 0], seg = 20) => M(new THREE.CylinderGeometry(r1, r2, h, seg), m, p, r);

// ---------------- textures ----------------
const asphaltTex = canvasTex(512, 512, (g) => {
  for (let y = 0; y < 512; y += 2) for (let x = 0; x < 512; x += 2) { const n = fbm(x, y, 512, 24, 4), v = 62 + 22 * n + 26 * (rnd() - 0.5); g.fillStyle = `rgb(${v},${v},${v + 3})`; g.fillRect(x, y, 2, 2); }
  for (let i = 0; i < 900; i++) { const v = 120 + rnd() * 60; g.fillStyle = `rgba(${v},${v},${v},0.5)`; g.fillRect(rnd() * 512, rnd() * 512, 1.5, 1.5); }
  g.strokeStyle = "rgba(20,20,22,0.55)"; g.lineWidth = 2; for (let i = 0; i < 6; i++) { g.beginPath(); let x = rnd() * 512, y = rnd() * 512; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (rnd() - 0.5) * 60; y += (rnd() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
});
asphaltTex.wrapS = asphaltTex.wrapT = THREE.RepeatWrapping; asphaltTex.repeat.set(8, 2);
const zincTex = canvasTex(256, 256, (g) => { for (let x = 0; x < 256; x++) { const k = 0.5 + 0.5 * Math.sin((x / 256) * Math.PI * 20), n = fbm(x, 0, 256, 8, 3), v = 128 + 70 * k + 30 * n; g.fillStyle = `rgb(${v},${v + 3},${v + 8})`; g.fillRect(x, 0, 1, 256); }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${120 + rnd() * 50},${60 + rnd() * 30},30,${0.15 + rnd() * 0.25})`; g.beginPath(); g.ellipse(rnd() * 256, rnd() * 256, 4 + rnd() * 14, 2 + rnd() * 6, 0, 0, Math.PI * 2); g.fill(); } });
zincTex.wrapS = zincTex.wrapT = THREE.RepeatWrapping;
/** a hanging strip (renceng) of 3-in-1 coffee sachets, our own brand */
const rencengTex = (hue: string, name: string) => canvasTex(128, 512, (g) => {
  for (let i = 0; i < 6; i++) { const y = i * 85; g.fillStyle = hue; g.fillRect(8, y + 4, 112, 78); g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(8, y + 4, 112, 10);
    g.fillStyle = "#3a1d10"; g.beginPath(); g.ellipse(64, y + 50, 26, 18, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#fff"; g.font = "bold 20px Arial"; g.textAlign = "center"; g.fillText(name, 64, y + 30);
    g.strokeStyle = "rgba(0,0,0,0.35)"; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(8, y + 83); g.lineTo(120, y + 83); g.stroke(); g.setLineDash([]); }
});
const shelfTex = canvasTex(1024, 512, (g) => { // kiosk goods on the back shelves: bottles, cans, cartons, snack bags, eggs
  g.fillStyle = "#2e2219"; g.fillRect(0, 0, 1024, 512);
  for (let r = 0; r < 3; r++) { const base = 150 + r * 168; g.fillStyle = "#6b4a2e"; g.fillRect(0, base, 1024, 12);
    for (let x = 8; x < 1010;) { const k = rnd(), c = ["#c0392b", "#f1c40f", "#2e86c1", "#27ae60", "#ecf0f1", "#e67e22", "#7a3b1d", "#1d1d1d"][Math.floor(rnd() * 8)];
      if (k < 0.35) { const n = 3 + Math.floor(rnd() * 4); for (let i = 0; i < n; i++) { const bx = x + i * 16, h = 70 + rnd() * 10; g.fillStyle = c; g.fillRect(bx, base - h + 18, 13, h - 18); g.beginPath(); g.moveTo(bx, base - h + 18); g.lineTo(bx + 4, base - h); g.lineTo(bx + 9, base - h); g.lineTo(bx + 13, base - h + 18); g.fill(); g.fillStyle = "#ddd"; g.fillRect(bx + 4, base - h - 5, 5, 6); g.fillStyle = "rgba(255,255,255,0.7)"; g.fillRect(bx + 1, base - h * 0.55, 11, 12); } x += n * 16 + 6; }
      else if (k < 0.6) { const n = 4 + Math.floor(rnd() * 4); for (let i = 0; i < n; i++) { g.fillStyle = c; g.fillRect(x + i * 15, base - 34, 13, 34); g.fillStyle = "#bbb"; g.fillRect(x + i * 15, base - 36, 13, 3); g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(x + i * 15 + 2, base - 24, 9, 8); } x += n * 15 + 6; }
      else if (k < 0.85) { const w = 50 + rnd() * 40, h = 40 + rnd() * 60; g.fillStyle = c; g.fillRect(x, base - h, w, h); g.fillStyle = "rgba(255,255,255,0.6)"; g.fillRect(x + 6, base - h + 8, w - 12, 10); g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(x + w - 6, base - h, 6, h); x += w + 5; }
      else { for (let i = 0; i < 3; i++) { g.fillStyle = c; g.beginPath(); g.ellipse(x + 18 + i * 34, base - 30, 17, 32, 0, 0, 7); g.fill(); g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(x + 10 + i * 34, base - 46, 6, 24); } x += 108; } } }
});
/** the chalk menu: four fixed lines; line 5 ("KOPI ISTIMEWA 50.000") is written stroke by stroke (progress 0..1) */
export const drawChalkMenu = (g: CanvasRenderingContext2D, w: number, h: number, p: number, tally = 0) => {
  seedRnd(77); // the same chalk smears on every redraw
  g.fillStyle = "#1f2a24"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(255,255,255,${0.02 + rnd() * 0.05})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 6, 1); } // chalk dust smears
  g.fillStyle = "#f4f1e6"; g.font = "bold 46px 'Chalkboard SE', 'Comic Sans MS', cursive"; g.textAlign = "center"; g.fillText("KEDAI MAKMUR", w / 2, 64);
  g.strokeStyle = "#f4f1e6"; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 84); g.lineTo(w - 40, 84); g.stroke();
  g.textAlign = "left"; g.font = "34px 'Chalkboard SE', 'Comic Sans MS', cursive";
  [["KOPI TUBRUK", "8.000"], ["KOPI SUSU", "10.000"], ["TEH TARIK", "9.000"], ["ROTI BAKAR", "12.000"]].forEach(([a, b], i) => { g.fillStyle = "#e9e4d6"; g.fillText(a, 34, 140 + i * 52); g.textAlign = "right"; g.fillText(b, w - 34, 140 + i * 52); g.textAlign = "left"; });
  if (p > 0) { // the new line, written like a hand: p 0..0.5 the name, 0.5..1 the price
    const a = Math.min(1, p * 2), b = Math.max(0, p * 2 - 1);
    g.save(); g.beginPath(); g.rect(0, 336, 34 + 330 * a, 42); g.clip(); g.fillStyle = "#ffe08a"; g.font = "bold 36px 'Chalkboard SE', 'Comic Sans MS', cursive"; g.fillText("KOPI SPESIAL", 34, 368); g.restore();
    if (b > 0) { g.save(); g.beginPath(); g.rect(300, 370, 178 * b, 56); g.clip(); g.fillStyle = "#ffe08a"; g.font = "bold 52px 'Chalkboard SE', 'Comic Sans MS', cursive"; g.textAlign = "right"; g.fillText("50.000", w - 34, 418); g.restore(); }
  }
  for (let i = 0; i < tally; i++) { g.strokeStyle = "#e9e4d6"; g.lineWidth = 3; g.beginPath(); g.moveTo(40 + i * 14, h - 50); g.lineTo(40 + i * 14, h - 22); g.stroke(); }
};
/** the cafe's backlit sign (invented name) */
const cafeSignTex = canvasTex(1024, 192, (g) => { g.fillStyle = "#14161a"; g.fillRect(0, 0, 1024, 192); g.fillStyle = "#fff5dd"; g.shadowColor = "#ffcf7a"; g.shadowBlur = 24; g.font = "300 96px 'Helvetica Neue', Arial"; g.textAlign = "center"; g.fillText("LANGIT  COFFEE", 512, 128); g.shadowBlur = 0; g.font = "28px 'Helvetica Neue', Arial"; g.fillStyle = "#c9a96e"; g.fillText("SPECIALTY  ·  EST. 2026", 512, 172); });

export class KedaiSet {
  root = new THREE.Group(); sunDir = new THREE.Vector3(); menu = new LiveTex(512, 512); calendar = new LiveTex(256, 320);
  bulbLight: THREE.PointLight; bulb: THREE.Mesh;
  /** points used by the scenes */
  spots = { counterTop: 0.96, counterZ: 0.9, board: new THREE.Vector3(-2.05, 1.12, 1.95), table: new THREE.Vector3(1.15, 0.74, 2.1), owner: [0.25, 0.42] as [number, number] };
  lamp: THREE.PointLight | null = null; glow = new Glow(); kettle!: THREE.Group;
  private sway: { o: THREE.Object3D; amp: number; f: number; ph: number; base: number }[] = []; private dust!: THREE.Points;
  constructor(public mode: "day" | "night" = "day") {
    seedRnd(4242); const R = this.root, day = mode === "day";
    // ---------------- light ----------------
    const sun = new THREE.DirectionalLight(day ? "#ffc98e" : "#9fb4ff", day ? 4.1 : 0.35); if (day) sun.position.set(-9, 4.4, 8.5); else sun.position.set(-7, 5.5, 8); sun.target.position.set(0, 0.6, 3);
    sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
    this.sunDir.copy(sun.position).sub(sun.target.position).normalize(); R.add(sun, sun.target);
    R.add(new THREE.HemisphereLight(day ? "#b9d3ff" : "#2a3866", day ? "#a8794a" : "#140e0a", day ? 1.2 : 0.25));
    this.bulbLight = new THREE.PointLight("#ffbf72", day ? 0.6 : 7.5, day ? 3 : 9, 1.7); this.bulbLight.position.set(0.55, 2.0, 1.05); this.bulbLight.castShadow = !day; this.bulbLight.shadow.mapSize.set(1024, 1024); this.bulbLight.shadow.bias = -0.002; R.add(this.bulbLight);
    this.bulb = M(new THREE.SphereGeometry(0.001, 4, 4), mat("#000"), [0, -1, 0]); this.bulb.visible = false; R.add(this.bulb);

    // ---------------- ground: yard, curb, asphalt, far sidewalk ----------------
    { const tt = tileTex.clone(); tt.repeat.set(30 / 1.6, 2.0 / 1.6); tt.needsUpdate = true; R.add(M(new THREE.PlaneGeometry(40, 2.0), new THREE.MeshStandardMaterial({ map: tt, roughness: day ? 0.24 : 0.3, envMapIntensity: day ? 1.6 : 1 }), [0, 0.03, 0.97], [-Math.PI / 2, 0, 0])); } // ruko terraces (ceramic tiles)
    { const slab = std(stone(), [1, 1]); for (let x = -20; x < 20; x += 1.0) R.add(B(0.97, 0.06, 0.55, slab, [x + 0.5, 0.03, 2.25])); // concrete covers over the drain (got)
      R.add(B(40, 0.02, 0.6, mat("#1c1a16"), [0, 0.0, 2.25])); R.add(B(40, 0.06, 0.04, mat("#77746c"), [0, 0.03, 1.96])); }
    const road = M(new THREE.PlaneGeometry(30, 5), new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: day ? 0.72 : 0.4, color: "#9a9a9e" }), [0, 0.002, 5.1], [-Math.PI / 2, 0, 0]); road.castShadow = false; R.add(road);
    const lineM = new THREE.MeshStandardMaterial({ color: "#e9e6da", roughness: 0.6 }); for (let x = -14; x < 14; x += 2.4) R.add(M(new THREE.PlaneGeometry(1.2, 0.1), lineM, [x, 0.004, 5.1], [-Math.PI / 2, 0, 0]));
    const curbM = std(stone(), [8, 1]); R.add(B(30, 0.14, 0.2, curbM, [0, 0.07, 2.6])); R.add(B(30, 0.14, 0.2, curbM, [0, 0.07, 7.6]));
    for (let x = -14.7; x < 15; x += 0.6) R.add(B(0.3, 0.141, 0.201, mat(Math.round(x / 0.6) % 2 ? "#e8e4da" : "#2a2a2a"), [x, 0.072, 7.6])); // painted curb on the cafe side
    R.add(B(30, 0.12, 2.4, std(plaster("#bdb6aa"), [10, 1]), [0, 0.06, 8.9])); // cafe sidewalk (paving)
    { const pv = new THREE.LineBasicMaterial({ color: "#8f887c" }); const pts: THREE.Vector3[] = []; for (let x = -15; x <= 15; x += 0.5) pts.push(new THREE.Vector3(x, 0.122, 7.75), new THREE.Vector3(x, 0.122, 10.05)); R.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), pv)); }
    // ---------------- KEDAI MAKMUR: a small, old, modest coffee shop on the ruko's ground floor ----------------
    // open front (folding doors pushed aside), back wall with shelves and a chalk menu, a long wooden bar, striped canvas
    // awning, two solid teak cube tables on the terrace (seated guests are hidden from the hips down, nothing to clip)
    const W = new THREE.Group(); R.add(W);
    const sage = std(plaster("#8e9f86"), [3, 1]), wains = std(woodPlanks("#5b3a22", 10, "wains"), [3, 1]), beam = std(woodPlanks("#3d2a1c", 2, "kbeam"), [1, 1]);
    const teak = std(woodPlanks("#8a5a33", 6, "teak"), [1, 1], { roughness: 0.5 }), darkTop = std(woodPlanks("#4a2c18", 3, "ktop"), [2, 1], { roughness: 0.38 });
    const brass = mat("#c9a24a", { metalness: 1, roughness: 0.28 }), chromeOld = mat("#b8b2a6", { metalness: 0.9, roughness: 0.38 });
    W.add(B(6.4, 1.0, 0.12, wains, [0, 0.5, -0.06])); W.add(B(6.4, 1.95, 0.1, sage, [0, 1.97, -0.05])); W.add(B(6.4, 0.05, 0.06, beam, [0, 1.0, 0.02]));
    { const up = ruko({ w: 6.6, floors: 3, col: "#d9d2bf", ground: "none", night: !day }); up.position.set(0, 0, -0.16); R.add(up);
      R.add(M(new THREE.PlaneGeometry(3.0, 0.75), new THREE.MeshStandardMaterial({ map: signTex("KEDAI MAKMUR", "KOPI · ROTI BAKAR · SEJAK 1998", "#3b2a1e", "#f1d9a6"), roughness: 0.55 }), [0.75, 3.78, 0.3])); }
    for (const x of [-3.1, 3.1]) W.add(B(0.16, 2.95, 0.18, beam, [x, 1.47, 0.02]));
    // folding wooden doors pushed open at both ends
    { const dw = std(woodPlanks("#6e4526", 4, "fold"), [1, 1]); for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const p = B(0.42, 2.6, 0.04, dw, [s * (2.82 - k * 0.05), 1.32, 0.18 + k * 0.1], [0, s * (0.9 - k * 0.5), 0]); W.add(p); } }
    // back wall: three floating shelves with real cups, bean jars, a radio, a framed photo, plants
    { const sh = std(woodPlanks("#6a4426", 2, "kshelf"), [2, 1]); const cupM = new THREE.MeshPhysicalMaterial({ color: "#f4efe6", roughness: 0.2, clearcoat: 0.8 });
      const cupGeo = new THREE.LatheGeometry([0, 1, 2, 3, 4, 5, 6].map((i) => new THREE.Vector2(0.026 + 0.012 * Math.sin((i / 6) * 1.6), (i / 6) * 0.07)), 18);
      const jarM = new THREE.MeshPhysicalMaterial({ color: "#eef4f2", roughness: 0.05, transparent: true, opacity: 0.32, clearcoat: 1 }), beanM = mat("#3b2214", { roughness: 0.7 });
      const lab = (txt: string, col: string) => new THREE.MeshStandardMaterial({ map: canvasTex(128, 64, (g) => { g.fillStyle = "#efe4c8"; g.fillRect(0, 0, 128, 64); g.strokeStyle = col; g.lineWidth = 5; g.strokeRect(4, 4, 120, 56); g.fillStyle = col; g.font = "bold 22px Georgia"; g.textAlign = "center"; g.fillText(txt, 64, 40); }), roughness: 0.8 });
      [1.42, 1.86, 2.3].forEach((y, r) => { W.add(B(2.9, 0.04, 0.24, sh, [0.45, y, 0.12])); for (const x of [-0.9, 1.8]) W.add(B(0.03, 0.12, 0.2, brass, [x, y - 0.07, 0.1]));
        if (r === 0) for (let i = 0; i < 12; i++) { const c = M(cupGeo, cupM, [-0.85 + i * 0.12, y + 0.02, 0.12]); W.add(c); if (i % 3 === 0) W.add(M(new THREE.TorusGeometry(0.037, 0.002, 6, 24), brass, [-0.85 + i * 0.12, y + 0.09, 0.12], [Math.PI / 2, 0, 0])); }
        if (r === 1) ["ARABIKA", "ROBUSTA", "TORAJA", "GAYO", "KINTAMANI"].forEach((n, i) => { const j = new THREE.Group(); j.position.set(-0.8 + i * 0.3, y + 0.02, 0.12); W.add(j);
          const jg = M(new THREE.CylinderGeometry(0.07, 0.07, 0.22, 20, 1, true), jarM, [0, 0.11, 0]); jg.castShadow = false; jg.renderOrder = 4; j.add(jg); j.add(cyl(0.066, 0.066, 0.15, beanM, [0, 0.08, 0], [0, 0, 0], 16)); j.add(cyl(0.072, 0.072, 0.03, brass, [0, 0.235, 0]));
          j.add(M(new THREE.PlaneGeometry(0.11, 0.055), lab(n, "#5a2e14"), [0, 0.1, 0.071])); });
        if (r === 1) { const rad = new THREE.Group(); rad.position.set(1.05, y + 0.02, 0.12); W.add(rad); rad.add(RB(0.36, 0.2, 0.14, 0.03, mat("#7b4a2a", { roughness: 0.35 }), [0, 0.1, 0])); rad.add(M(new THREE.CircleGeometry(0.06, 24), mat("#d8cba8", { roughness: 0.6 }), [-0.08, 0.1, 0.071])); rad.add(M(new THREE.PlaneGeometry(0.12, 0.06), mat("#f0e2b6", { emissive: "#ffb85a", emissiveIntensity: 0.25 }), [0.09, 0.12, 0.071])); rad.add(cyl(0.004, 0.004, 0.3, chromeOld, [0.14, 0.32, 0], [0, 0, -0.4])); }
        if (r === 2) { const fr = new THREE.Group(); fr.position.set(-0.6, y + 0.17, 0.08); fr.rotation.x = -0.12; W.add(fr); fr.add(B(0.34, 0.28, 0.02, beam, [0, 0, 0])); fr.add(M(new THREE.PlaneGeometry(0.28, 0.22), new THREE.MeshStandardMaterial({ map: canvasTex(128, 100, (g) => { g.fillStyle = "#b9a27c"; g.fillRect(0, 0, 128, 100); g.fillStyle = "#6e5a3e"; g.fillRect(0, 70, 128, 30); g.fillStyle = "#4a3a28"; g.beginPath(); g.arc(46, 46, 16, 0, 7); g.fill(); g.fillRect(34, 58, 24, 30); g.beginPath(); g.arc(84, 48, 14, 0, 7); g.fill(); g.fillRect(74, 58, 20, 30); g.fillStyle = "rgba(255,240,210,0.25)"; g.fillRect(0, 0, 128, 100); }), roughness: 0.6 }), [0, 0, 0.012]));
          for (let i = 0; i < 4; i++) W.add(M(cupGeo, mat(["#2f5d8a", "#c0392b", "#e0b04a", "#3c7a3a"][i], { roughness: 0.3 }), [0.1 + i * 0.13, y + 0.02, 0.12]));
          const pot = cyl(0.07, 0.05, 0.12, mat("#b5653a"), [1.45, y + 0.08, 0.12]); W.add(pot); const lm = new THREE.MeshStandardMaterial({ color: "#4b8a3e", side: THREE.DoubleSide }); for (let i = 0; i < 9; i++) W.add(M(new THREE.PlaneGeometry(0.05, 0.28), lm, [1.45 + (rnd() - 0.5) * 0.08, y + 0.05, 0.14 + (rnd() - 0.5) * 0.06], [0.9 + rnd() * 0.6, rnd() * 3, 0])); } }); }
    // chalk menu board hung on the back wall (left), in a wooden frame
    { const bd = new THREE.Group(); bd.position.set(-1.85, 1.62, 0.02); W.add(bd); bd.add(B(1.0, 1.0, 0.04, beam, [0, 0, 0.0]));
      const face = M(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshStandardMaterial({ map: this.menu.tex, roughness: 0.95 }), [0, 0, 0.022]); face.castShadow = false; bd.add(face);
      bd.add(B(0.6, 0.025, 0.06, beam, [0, -0.52, 0.04])); bd.add(B(0.07, 0.015, 0.015, mat("#f4f1e6"), [0.12, -0.5, 0.06], [0, 0, 0.1])); }
    this.menu.draw("init", (g, w, h) => drawChalkMenu(g, w, h, 0));
    // the bar: slatted front, dark top, brass foot rail
    const counter = new THREE.Group(); counter.position.set(0.5, 0, 0.75); W.add(counter);
    counter.add(B(2.8, 0.9, 0.56, std(woodPlanks("#6f4428", 16, "kslat"), [2, 1]), [0, 0.45, 0]));
    counter.add(B(2.96, 0.06, 0.66, darkTop, [0, 0.93, 0.02]));
    counter.add(cyl(0.015, 0.015, 2.8, brass, [0, 0.16, 0.36], [0, 0, Math.PI / 2])); for (const x of [-1.2, 0, 1.2]) counter.add(cyl(0.01, 0.01, 0.12, brass, [x, 0.16, 0.3], [Math.PI / 2, 0, 0]));
    // an old lever espresso machine, red enamel, dusty, with a paper "RUSAK" note: it is only decoration
    { const em = new THREE.Group(); em.position.set(1.25, 0.96, -0.08); counter.add(em); const red = mat("#9c2f25", { roughness: 0.42, metalness: 0.3 });
      em.add(RB(0.42, 0.3, 0.3, 0.04, red, [0, 0.15, 0])); em.add(cyl(0.12, 0.14, 0.18, chromeOld, [0, 0.39, 0], [0, 0, 0], 24)); em.add(M(new THREE.SphereGeometry(0.06, 16, 10), brass, [0, 0.5, 0]));
      for (const x of [-0.1, 0.1]) { em.add(cyl(0.012, 0.012, 0.32, chromeOld, [x, 0.42, 0.13], [0.5, 0, 0])); em.add(M(new THREE.SphereGeometry(0.025, 12, 8), mat("#1a1a1a"), [x, 0.56, 0.2])); em.add(cyl(0.035, 0.035, 0.05, chromeOld, [x, 0.06, 0.16])); }
      em.add(cyl(0.04, 0.04, 0.02, mat("#f3ead2", { roughness: 0.4 }), [0, 0.2, 0.152], [Math.PI / 2, 0, 0]));
      em.add(M(new THREE.PlaneGeometry(0.16, 0.1), new THREE.MeshStandardMaterial({ map: canvasTex(160, 100, (g) => { g.fillStyle = "#fbf6e6"; g.fillRect(0, 0, 160, 100); g.fillStyle = "#c0302a"; g.font = "bold 40px 'Comic Sans MS', cursive"; g.textAlign = "center"; g.fillText("RUSAK", 80, 64); g.fillStyle = "rgba(220,210,170,0.7)"; g.fillRect(55, 0, 50, 12); }), roughness: 0.9 }), [0.1, 0.1, 0.153], [0, 0, -0.08]));
      const dust = mat("#cfc7b6", { roughness: 1, transparent: true, opacity: 0.35 }); em.add(M(new THREE.PlaneGeometry(0.4, 0.28), dust, [0, 0.31, 0.0], [-Math.PI / 2, 0, 0])); }
    // gooseneck kettle on a small hot plate, a glass cake dome, a biscuit jar, a bell, a little cash box
    { const kt = new THREE.Group(); kt.position.set(0.15, 0.96, -0.1); counter.add(kt); this.kettle = kt; kt.add(B(0.26, 0.04, 0.22, mat("#2a2a2a", { metalness: 0.5, roughness: 0.4 }), [0, 0.02, 0]));
      const steel = mat("#c8ccd0", { metalness: 0.95, roughness: 0.22 }); kt.add(cyl(0.065, 0.08, 0.14, steel, [0, 0.11, 0], [0, 0, 0], 28)); kt.add(cyl(0.02, 0.065, 0.03, steel, [0, 0.195, 0]));
      kt.add(M(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0.06, 0.07, 0), new THREE.Vector3(0.16, 0.08, 0), new THREE.Vector3(0.17, 0.2, 0)), 16, 0.007, 8), steel));
      kt.add(M(new THREE.TorusGeometry(0.05, 0.008, 8, 20, Math.PI), mat("#222"), [-0.07, 0.13, 0], [0, 0, Math.PI / 2])); }
    { const dome = new THREE.Group(); dome.position.set(-0.75, 0.96, -0.02); counter.add(dome); dome.add(cyl(0.16, 0.16, 0.02, mat("#efe9df", { roughness: 0.3 }), [0, 0.01, 0], [0, 0, 0], 32));
      const cake = cyl(0.1, 0.1, 0.09, mat("#6b3a20", { roughness: 0.7 }), [0, 0.065, 0], [0, 0, 0], 28); dome.add(cake); dome.add(cyl(0.101, 0.101, 0.015, mat("#f3e7cf"), [0, 0.11, 0], [0, 0, 0], 28));
      const gd = M(new THREE.SphereGeometry(0.15, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: "#eef6f4", roughness: 0.04, transparent: true, opacity: 0.22, clearcoat: 1 }), [0, 0.02, 0]); gd.scale.y = 1.25; gd.castShadow = false; gd.renderOrder = 4; dome.add(gd); dome.add(M(new THREE.SphereGeometry(0.018, 10, 8), brass, [0, 0.21, 0])); }
    { const bj = new THREE.Group(); bj.position.set(-1.15, 0.96, 0.0); counter.add(bj); const jg = M(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 20, 1, true), new THREE.MeshPhysicalMaterial({ color: "#eef4f2", roughness: 0.05, transparent: true, opacity: 0.3 }), [0, 0.1, 0]); jg.castShadow = false; jg.renderOrder = 4; bj.add(jg);
      for (let i = 0; i < 8; i++) bj.add(cyl(0.035, 0.035, 0.012, mat("#c8893f", { roughness: 0.8 }), [(rnd() - 0.5) * 0.08, 0.02 + i * 0.022, (rnd() - 0.5) * 0.08], [rnd(), 0, rnd()], 14)); bj.add(cyl(0.083, 0.083, 0.025, brass, [0, 0.21, 0])); }
    counter.add(M(new THREE.SphereGeometry(0.035, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), brass, [-0.45, 0.965, 0.18])); counter.add(B(0.22, 0.1, 0.16, std(woodPlanks("#5a3a22", 2, "cash"), [1, 1]), [0.65, 1.01, -0.12]));
    // striped canvas awning with a scalloped valance, dark green posts
    { const stripe = canvasTex(256, 64, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#efe6cf" : "#2f5e46"; g.fillRect(i * 32, 0, 32, 64); } g.fillStyle = "rgba(0,0,0,0.08)"; for (let i = 0; i < 300; i++) g.fillRect(rnd() * 256, rnd() * 64, 2, 1); });
      stripe.wrapS = THREE.RepeatWrapping; stripe.repeat.set(5, 1); const cm = new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.85, side: THREE.DoubleSide });
      W.add(M(new THREE.PlaneGeometry(6.8, 2.45), cm, [0, 2.62, 1.12], [-Math.PI / 2 + 0.2, 0, 0]));
      const val = canvasTex(512, 64, (g) => { g.clearRect(0, 0, 512, 64); for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? "#efe6cf" : "#2f5e46"; g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 32, 0); g.lineTo(i * 32 + 32, 34); g.arc(i * 32 + 16, 34, 16, 0, Math.PI); g.closePath(); g.fill(); } });
      val.wrapS = THREE.RepeatWrapping; val.repeat.set(3, 1); const vm = M(new THREE.PlaneGeometry(6.9, 0.26), new THREE.MeshStandardMaterial({ map: val, roughness: 0.85, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }), [0, 2.27, 2.35]); W.add(vm);
      for (let x = -3.2; x <= 3.2; x += 0.8) W.add(B(0.05, 0.06, 2.4, beam, [x, 2.55, 1.12], [0.2, 0, 0])); }
    const green = mat("#284a39", { roughness: 0.45, metalness: 0.2 }); for (const x of [-3.0, 3.0]) { W.add(B(0.12, 2.36, 0.12, green, [x, 1.18, 2.25])); W.add(B(0.22, 0.08, 0.22, mat("#cfc8bb"), [x, 0.04, 2.25])); }
    // two enamel pendant lamps over the bar
    for (const x of [-0.3, 1.45]) { W.add(cyl(0.004, 0.004, 0.5, mat("#111"), [x, 2.4, 1.0])); W.add(M(new THREE.ConeGeometry(0.17, 0.13, 28, 1, true), mat("#2f5e46", { roughness: 0.35, side: THREE.DoubleSide }), [x, 2.12, 1.0]));
      const bl = M(new THREE.SphereGeometry(0.045, 14, 10), new THREE.MeshBasicMaterial({ color: day ? new THREE.Color(2.2, 1.7, 1.0) : new THREE.Color(3.4, 2.5, 1.3) }), [x, 2.05, 1.0]); bl.castShadow = false; W.add(bl);
      this.glow.halo(W, [x, 2.03, 1.0], day ? 0.45 : 0.8, "#ffc27a", day ? 0.4 : 0.85, 0.1, 0.4);
      { const cn = M(new THREE.ConeGeometry(0.6, 1.3, 28, 1, true), new THREE.MeshBasicMaterial({ map: coneTex, color: "#ffd59a", transparent: true, opacity: day ? 0.05 : 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), [x, 1.4, 1.0]); cn.castShadow = cn.receiveShadow = false; cn.renderOrder = 7; W.add(cn); } }
    // two solid teak cube tables + chairs on the terrace; T1 (right) is where guests sit facing the street
    const chair = (x: number, z: number, ry: number) => { const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; W.add(c); c.add(B(0.42, 0.04, 0.4, teak, [0, 0.46, 0]));
      for (const [a, b] of [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]] as [number, number][]) c.add(B(0.035, 0.46, 0.035, teak, [a, 0.23, b]));
      for (const a of [-0.18, 0.18]) c.add(B(0.035, 0.5, 0.035, teak, [a, 0.72, -0.18])); for (const y of [0.78, 0.9]) c.add(B(0.4, 0.06, 0.025, teak, [0, y, -0.18])); return c; };
    const cube = (x: number, z: number) => { const t = new THREE.Group(); t.position.set(x, 0, z); W.add(t); t.add(B(0.72, 0.7, 0.5, std(woodPlanks("#7c4f2c", 5, "cube"), [1, 1]), [0, 0.35, 0])); t.add(B(0.78, 0.04, 0.56, darkTop, [0, 0.72, 0])); return t; };
    cube(2.35, 1.62); chair(2.35, 1.08, 0); cube(-1.75, 1.62); chair(-2.05, 1.08, 0.15); chair(-1.4, 1.08, -0.15);
    // potted plants at both ends, a sleepy cat's cushion on the left chair
    { const pot = mat("#b5653a", { roughness: 0.8 }); for (const x of [-2.75, 3.35]) { W.add(cyl(0.18, 0.13, 0.36, pot, [x, 0.18, 0.55])); const lm = new THREE.MeshStandardMaterial({ color: "#3f7a3a", roughness: 0.6, side: THREE.DoubleSide }); for (let i = 0; i < 14; i++) W.add(M(new THREE.PlaneGeometry(0.12, 0.6), lm, [x + (rnd() - 0.5) * 0.14, 0.62, 0.55 + (rnd() - 0.5) * 0.14], [(rnd() - 0.5) * 0.6, rnd() * 3, (rnd() - 0.5) * 0.6])); } }
    // tear-off calendar on the right post (the day count)
    { const cal = M(new THREE.PlaneGeometry(0.26, 0.33), new THREE.MeshStandardMaterial({ map: this.calendar.tex, roughness: 0.9 }), [2.93, 1.55, 2.325], [0, 0, 0]); cal.castShadow = false; W.add(cal); this.setDay("SENIN", 1); }
    // neighbours: a narrow gang (alley) on the left, then a 2-storey house with an iron fence (the gossip spot), then a
    // motorbike workshop; on the right a phone-credit shop, a laundry and a closed unit
    { const house = new THREE.Group(); house.position.set(-7.4, 0, -0.6); R.add(house); const hw = new THREE.MeshStandardMaterial({ map: (() => { const t = wallTex("#e6dcc8"); t.repeat.set(1.5, 1.5); return t; })(), roughness: 0.9 });
      house.add(B(6, 6.2, 0.3, hw, [0, 3.1, -0.15])); house.add(B(6.1, 0.2, 1.8, mat("#9a9488"), [0, 3.1, 0.75])); house.add(B(6.2, 0.4, 0.12, mat("#d8d2c6"), [0, 6.3, -0.05]));
      for (const x of [-1.5, 1.5]) { const w2 = new THREE.Group(); w2.position.set(x, 4.6, 0.02); house.add(w2); w2.add(B(1.3, 1.3, 0.05, mat("#3a4048", { roughness: 0.2, metalness: 0.3 }), [0, 0, 0])); for (let k = -0.55; k < 0.6; k += 0.13) w2.add(B(0.015, 1.3, 0.015, mat("#222"), [k, 0, 0.06])); }
      house.add(B(1.3, 1.2, 0.05, mat("#3a4048", { roughness: 0.2, metalness: 0.3 }), [1.3, 1.6, 0.02])); house.add(B(0.95, 2.1, 0.06, std(woodPlanks("#6b3f22", 3, "hdoor"), [1, 1]), [-1.0, 1.05, 0.03]));
      for (const [x, c] of [[-2.4, "#c43b2f"], [2.4, "#3f7a3a"]] as [number, string][]) { house.add(cyl(0.18, 0.13, 0.35, mat("#8a4a2a"), [x, 0.17, 1.4])); const lm = new THREE.MeshStandardMaterial({ color: c === "#3f7a3a" ? c : "#4c8a3e", side: THREE.DoubleSide }); for (let i = 0; i < 9; i++) house.add(M(new THREE.PlaneGeometry(0.1, 0.5), lm, [x + (rnd() - 0.5) * 0.12, 0.6, 1.4 + (rnd() - 0.5) * 0.12], [(rnd() - 0.5) * 0.5, rnd() * 3, (rnd() - 0.5) * 0.5])); }
      const sc = scooter("#b8bcc2"); sc.position.set(1.3, 0, 1.9); sc.rotation.y = 0.3; house.add(sc); }
    { const iron = mat("#2f6b4a", { metalness: 0.5, roughness: 0.45 }); for (let x = -9.9; x < -4.5; x += 0.13) { R.add(B(0.02, 0.88, 0.02, iron, [x, 0.44, 2.2])); R.add(M(new THREE.ConeGeometry(0.025, 0.07, 4), iron, [x, 0.91, 2.2])); }
      for (const y of [0.12, 0.45, 0.8]) R.add(B(5.4, 0.04, 0.03, iron, [-7.2, y, 2.2])); for (const x of [-9.9, -4.5]) R.add(B(0.25, 1.05, 0.25, mat("#cfc8bb"), [x, 0.52, 2.2])); }
    { const L = ruko({ w: 4.4, floors: 2, col: "#c9d3c6", sign: ["BENGKEL", "SERVIS MOTOR · GANTI OLI", "#c23a2b", "#ffffff"], ground: "half", night: !day }); L.position.set(-12.6, 0, -0.3); R.add(L); }
    { const g1 = ruko({ w: 4.4, floors: 3, col: "#e3d6b8", sign: ["KONTER PULSA", "PULSA · KUOTA · SERVIS HP", "#1d4f9c", "#ffe14d"], ground: "shop", night: !day }); g1.position.set(5.45, 0, -0.1); R.add(g1);
      const g2 = ruko({ w: 4.4, floors: 2, col: "#d6c3c3", sign: ["LAUNDRY", "KILOAN · 1 HARI JADI", "#f2f0ea", "#2a62b8"], ground: "half", night: !day }); g2.position.set(9.85, 0, -0.1); R.add(g2);
      const g3 = ruko({ w: 4.4, floors: 3, col: "#cfcabf", ground: "door", night: !day }); g3.position.set(14.25, 0, -0.1); R.add(g3); }
    // the gang (alley) between the warkop and the house: a dark gap with a hanging lamp and a parked scooter
    R.add(B(1.2, 6, 0.1, mat("#2a2622"), [-3.85, 3, -4])); { const s1 = scooter("#c0392b"); s1.position.set(-3.85, 0, 1.3); s1.rotation.y = -1.35; R.add(s1); }
    { const s2 = scooter("#1f1f22"); s2.position.set(4.2, 0, 1.55); s2.rotation.y = 1.75; R.add(s2); const s3 = scooter("#2f68b0"); s3.position.set(6.4, 0, 1.6); s3.rotation.y = 1.4; R.add(s3); }
    { const gl = galonStack(); gl.position.set(4.0, 0, 0.45); R.add(gl); }
    this.lamp = poleLine(R, [-4.95, 4.6, 15.4], 2.5, !day, 4.6); if (!day) this.glow.halo(R, [4.6, 7.04, 3.95], 1.4, "#ffb46a", 0.75, 0.05, 0.2);
    poleLine(R, [-9.5, 3.15, 13.9], 7.75, !day);
    skyline(R, -22, !day); skyline(R, 30, !day, true);

    // ---------------- the cafe across the road ----------------
    const C = new THREE.Group(); C.position.set(0.4, 0.12, 10.2); C.rotation.y = Math.PI; R.add(C); // local +z faces the warung
    { const up = new THREE.Group(); up.position.set(0, 0, 0); C.add(up); const wt = wallTex("#ece8e0"); wt.repeat.set(2, 1); const wm = new THREE.MeshStandardMaterial({ map: wt, roughness: 0.85 });
      up.add(B(7.4, 3.4, 0.3, wm, [0, 5.65, -0.2])); up.add(B(7.5, 0.4, 0.14, mat("#d6d0c4"), [0, 7.55, -0.1]));
      for (const x of [-2.3, 0, 2.3]) { const g = new THREE.Group(); g.position.set(x, 5.6, -0.03); up.add(g); g.add(B(1.8, 1.9, 0.05, new THREE.MeshStandardMaterial({ color: day ? "#40505e" : "#ffcf8a", roughness: 0.1, metalness: 0.4, emissive: day ? "#000" : "#ffb060", emissiveIntensity: day ? 0 : 0.6 }), [0, 0, 0])); g.add(B(1.9, 0.08, 0.2, mat("#1b1d21"), [0, -0.98, 0.08])); }
      for (const [x, cfg] of [[-5.6, { w: 4.4, floors: 3, col: "#d7cfbd", sign: ["SALON", "POTONG · CREAMBATH", "#e8558a", "#ffffff"], ground: "door" }], [6.2, { w: 4.4, floors: 3, col: "#c5cdd3", sign: ["TOKO BANGUNAN", "SEMEN · CAT · PIPA", "#f2c230", "#1b1b1b"], ground: "shop" }], [10.6, { w: 4.4, floors: 2, col: "#ddd3c2", ground: "door" }], [-10.0, { w: 4.4, floors: 2, col: "#cdd5c7", sign: ["FOTOKOPI", "PRINT · JILID · LAMINATING", "#ffffff", "#1d4f9c"], ground: "half" }]] as [number, Parameters<typeof ruko>[0]][]) {
        const r = ruko({ ...cfg, night: !day } as Parameters<typeof ruko>[0]); r.position.set(x, -0.12, -0.15); C.add(r); } }
    { const s4 = scooter("#e8e4da"); s4.position.set(3.4, 0.12, 9.0); s4.rotation.y = 1.5; R.add(s4); const s5 = scooter("#8a1f2a"); s5.position.set(-2.3, 0.12, 8.9); s5.rotation.y = 1.7; R.add(s5); }
    const steel = mat("#1b1d21", { metalness: 0.6, roughness: 0.35 }), slat = std(woodPlanks("#b07b4a", 24, "slat"), [2, 1], { roughness: 0.55 });
    C.add(B(7.4, 0.25, 0.4, mat("#2a2c30", { roughness: 0.6 }), [0, 0.12, 0])); // plinth
    C.add(B(7.4, 1.2, 0.3, slat, [0, 3.35, -0.05])); // slatted wood band above the glass
    C.add(M(new THREE.PlaneGeometry(2.7, 0.51), new THREE.MeshBasicMaterial({ map: cafeSignTex, toneMapped: false, color: day ? new THREE.Color(1, 1, 1) : new THREE.Color(0.6, 0.55, 0.5) }), [-0.35, 3.4, 0.11]));
    for (const x of [-3.6, -1.2, 1.2, 3.6]) C.add(B(0.08, 2.6, 0.12, steel, [x, 1.55, 0.1]));
    C.add(B(7.4, 0.08, 0.12, steel, [0, 2.8, 0.1])); C.add(B(7.4, 0.08, 0.12, steel, [0, 0.28, 0.1]));
    const glassM = new THREE.MeshPhysicalMaterial({ color: "#d8e8ee", roughness: 0.03, metalness: 0.1, transparent: true, opacity: day ? 0.16 : 0.1, clearcoat: 1, envMapIntensity: 1.6 });
    const gl = M(new THREE.PlaneGeometry(7.2, 2.5), glassM, [0, 1.55, 0.09]); gl.castShadow = false; gl.renderOrder = 5; C.add(gl);
    // interior: warm wood floor, back wall with menu boards and shelves of beans, the bar with a chrome espresso machine, pendant lamps, plants
    const IN = new THREE.Group(); IN.position.set(0, 0, -2.6); C.add(IN);
    IN.add(B(7.2, 0.02, 5, std(woodPlanks("#a5713f", 14, "cflr"), [3, 2], { roughness: 0.4 }), [0, 0.15, 0.1]));
    IN.add(B(7.2, 3.2, 0.1, mat("#ece6dc", { roughness: 0.9 }), [0, 1.75, -2.4]));
    IN.add(B(7.2, 0.1, 5, mat("#2a2420"), [0, 3.3, 0]));
    for (const s of [-1, 1]) IN.add(B(0.1, 3.2, 5, mat("#e3dbcf"), [s * 3.6, 1.75, 0]));
    const menuBoard = canvasTex(512, 256, (g) => { g.fillStyle = "#111"; g.fillRect(0, 0, 512, 256); g.fillStyle = "#eee"; g.font = "bold 30px 'Helvetica Neue', Arial"; ["ESPRESSO  38K", "CAPPUCCINO  48K", "V60 GAYO  55K", "COLD BREW  52K"].forEach((t, i) => g.fillText(t, 30, 56 + i * 54)); });
    for (const x of [-1.2, 1.2]) IN.add(M(new THREE.PlaneGeometry(1.3, 0.65), new THREE.MeshBasicMaterial({ map: menuBoard, color: day ? "#cfcfcf" : "#7a6a5a" }), [x, 2.45, -2.34]));
    const beanM = [mat("#5a3420"), mat("#c9a26a"), mat("#2e2e2e")]; for (let r = 0; r < 2; r++) { IN.add(B(5, 0.04, 0.3, slat, [0, 1.35 + r * 0.45, -2.2])); for (let i = 0; i < 16; i++) IN.add(RB(0.14, 0.24, 0.1, 0.02, beanM[i % 3], [-2.3 + i * 0.3, 1.49 + r * 0.45, -2.2])); }
    const bar = new THREE.Group(); bar.position.set(0, 0.15, -1.2); IN.add(bar); bar.add(B(4.4, 1.05, 0.7, slat, [0, 0.52, 0])); bar.add(B(4.6, 0.06, 0.8, mat("#f2efe9", { roughness: 0.15, metalness: 0.05 }), [0, 1.07, 0]));
    { const chrome = mat("#dfe3e8", { metalness: 1, roughness: 0.12 }); const em = new THREE.Group(); em.position.set(-0.6, 1.1, -0.1); bar.add(em);
      em.add(RB(0.95, 0.45, 0.5, 0.05, chrome, [0, 0.23, 0])); em.add(RB(0.95, 0.06, 0.5, 0.02, mat("#1b1b1b", { metalness: 0.4, roughness: 0.3 }), [0, 0.48, 0]));
      for (const x of [-0.25, 0.25]) { em.add(cyl(0.05, 0.05, 0.1, chrome, [x, 0.0, 0.2])); em.add(cyl(0.012, 0.012, 0.18, mat("#111"), [x, -0.02, 0.32], [Math.PI / 2, 0, 0])); }
      em.add(cyl(0.04, 0.04, 0.03, mat("#ffffff", { emissive: "#ffd9a0", emissiveIntensity: 0.6 }), [0, 0.3, 0.255], [Math.PI / 2, 0, 0])); // pressure gauge
      em.add(cyl(0.09, 0.09, 0.32, chrome, [0.75, 0.16, 0])); em.add(M(new THREE.ConeGeometry(0.1, 0.18, 24), new THREE.MeshPhysicalMaterial({ color: "#d0e2e8", roughness: 0.05, transparent: true, opacity: 0.4 }), [0.75, 0.42, 0], [Math.PI, 0, 0])); } // grinder
    for (const x of [-2.4, -0.8, 0.8, 2.4]) { IN.add(cyl(0.004, 0.004, 0.9, mat("#111"), [x, 2.85, -0.6])); IN.add(M(new THREE.SphereGeometry(0.16, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat("#222", { metalness: 0.5, roughness: 0.35, side: THREE.DoubleSide }), [x, 2.4, -0.6]));
      IN.add(M(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial({ color: day ? new THREE.Color(2.4, 1.9, 1.2) : new THREE.Color(0.25, 0.2, 0.15) }), [x, 2.38, -0.6])); }
    if (day) { const pl = new THREE.PointLight("#ffcf8a", 2.2, 7, 1.6); pl.position.set(0, 2.2, -0.6); IN.add(pl); }
    for (const x of [-3.0, 3.0]) { IN.add(cyl(0.2, 0.16, 0.4, mat("#e9e6df", { roughness: 0.3 }), [x, 0.35, 1.8])); const lm = new THREE.MeshStandardMaterial({ color: "#2f6b34", side: THREE.DoubleSide, roughness: 0.6 }); for (let i = 0; i < 12; i++) IN.add(M(new THREE.PlaneGeometry(0.22, 0.6), lm, [x + (rnd() - 0.5) * 0.2, 0.85, 1.8 + (rnd() - 0.5) * 0.2], [(rnd() - 0.5) * 0.7, rnd() * 3, (rnd() - 0.5) * 0.7])); }
    // ---- LANGIT COFFEE is busy for reasons you can see: a pink neon, hanging plants, a cake case, window bar with
    // laptops, a ring light for selfies, a milk pitcher on the bar (local coords of IN; +z toward the street)
    { const neon = canvasTex(512, 160, (g) => { g.clearRect(0, 0, 512, 160); g.shadowColor = "#ff4fa0"; g.shadowBlur = 26; g.strokeStyle = "#ffd1e6"; g.lineWidth = 7; g.font = "italic bold 84px 'Brush Script MT', 'Snell Roundhand', cursive"; g.textAlign = "center"; g.strokeText("ngopi dulu", 256, 104); g.shadowBlur = 0; g.fillStyle = "#fff4fa"; g.fillText("ngopi dulu", 256, 104); });
      IN.add(M(new THREE.PlaneGeometry(1.15, 0.36), new THREE.MeshBasicMaterial({ map: neon, transparent: true, toneMapped: false, color: new THREE.Color(1.6, 1.4, 1.5) }), [0, 2.5, -2.33]));
      const pl = new THREE.PointLight("#ff6fb2", day ? 1.2 : 2.5, 3, 2); pl.position.set(0, 2.5, -2.0); IN.add(pl); }
    { const lm = new THREE.MeshStandardMaterial({ color: "#3d7d3f", roughness: 0.6, side: THREE.DoubleSide }); for (const x of [-2.9, -1.7, 1.7, 2.9]) { IN.add(cyl(0.003, 0.003, 0.5, mat("#ccc"), [x, 3.0, 0.9])); IN.add(cyl(0.13, 0.1, 0.16, mat("#e9e3d8", { roughness: 0.3 }), [x, 2.7, 0.9]));
      for (let i = 0; i < 12; i++) { const a = rnd() * 6.28, L = 0.3 + rnd() * 0.5; IN.add(M(new THREE.PlaneGeometry(0.08, L), lm, [x + Math.cos(a) * 0.12, 2.65 - L / 2, 0.9 + Math.sin(a) * 0.12], [0.15 * Math.cos(a), a, 0.15 * Math.sin(a)])); } } }
    { const cc = new THREE.Group(); cc.position.set(1.5, 1.22, -1.15); IN.add(cc); const gm = new THREE.MeshPhysicalMaterial({ color: "#e8f4f6", roughness: 0.03, transparent: true, opacity: 0.2, clearcoat: 1 });
      const gb = M(new THREE.BoxGeometry(0.9, 0.42, 0.45), gm, [0, 0.21, 0]); gb.castShadow = false; gb.renderOrder = 4; cc.add(gb); cc.add(B(0.92, 0.03, 0.47, mat("#1b1d21", { metalness: 0.6 }), [0, 0.43, 0]));
      const cakes = ["#6b3a20", "#f2d7e0", "#e9c46a", "#7a2e2e", "#f4efe6", "#3a6b4a"]; cakes.forEach((c, i) => { const x = -0.3 + (i % 3) * 0.3, y = i < 3 ? 0.03 : 0.22; cc.add(cyl(0.09, 0.09, 0.07, mat(c, { roughness: 0.6 }), [x, y + 0.035, 0], [0, 0, 0], 24)); cc.add(cyl(0.091, 0.091, 0.012, mat("#fbf3e6"), [x, y + 0.075, 0], [0, 0, 0], 24)); cc.add(M(new THREE.SphereGeometry(0.015, 10, 8), mat("#c0392b"), [x, y + 0.09, 0])); });
      cc.add(B(0.88, 0.012, 0.42, mat("#f2efe9"), [0, 0.2, 0])); }
    { const pit = new THREE.Group(); pit.position.set(-1.25, 1.22, -0.95); IN.add(pit); const ch = mat("#dfe3e8", { metalness: 1, roughness: 0.15 }); pit.add(cyl(0.045, 0.05, 0.12, ch, [0, 0.06, 0], [0, 0, 0], 24)); pit.add(M(new THREE.ConeGeometry(0.02, 0.05, 8), ch, [0.05, 0.11, 0], [0, 0, -1.2])); }
    { const wb = new THREE.Group(); wb.position.set(0, 0, 1.9); IN.add(wb); const oak = std(woodPlanks("#c79a62", 8, "wbar"), [3, 1], { roughness: 0.4 }); wb.add(B(6.6, 0.05, 0.42, oak, [0, 1.05, 0])); for (const x of [-3.0, 0, 3.0]) wb.add(B(0.05, 1.05, 0.05, mat("#1b1d21", { metalness: 0.6 }), [x, 0.52, 0]));
      const lap = (x: number, ry: number) => { const l = new THREE.Group(); l.position.set(x, 1.075, -0.02); l.rotation.y = ry; wb.add(l); l.add(B(0.32, 0.012, 0.22, mat("#c9ccd1", { metalness: 0.8, roughness: 0.3 }), [0, 0.006, 0])); const sc = new THREE.Group(); sc.position.set(0, 0.012, -0.11); sc.rotation.x = -1.85; l.add(sc); sc.add(B(0.32, 0.21, 0.01, mat("#c9ccd1", { metalness: 0.8, roughness: 0.3 }), [0, 0.105, 0])); sc.add(M(new THREE.PlaneGeometry(0.29, 0.18), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.85, 1.1), toneMapped: false }), [0, 0.105, -0.006], [0, Math.PI, 0])); };
      lap(-2.3, 0.1); lap(2.2, -0.15); lap(0.3, 0.05);
      for (const x of [-2.3, -1.2, 0.3, 2.2]) { wb.add(cyl(0.16, 0.16, 0.04, mat("#1b1d21", { roughness: 0.4 }), [x, 0.72, -0.35], [0, 0, 0], 24)); wb.add(cyl(0.02, 0.02, 0.7, mat("#1b1d21", { metalness: 0.6 }), [x, 0.36, -0.35])); }
      const iced = (x: number) => { const gl = M(new THREE.CylinderGeometry(0.035, 0.03, 0.13, 18, 1, true), new THREE.MeshPhysicalMaterial({ color: "#f2fbff", roughness: 0.04, transparent: true, opacity: 0.3 }), [x, 1.14, 0.05]); gl.castShadow = false; gl.renderOrder = 5; wb.add(gl); wb.add(cyl(0.032, 0.028, 0.1, mat("#b7865a", { roughness: 0.2 }), [x, 1.125, 0.05], [0, 0, 0], 16)); wb.add(cyl(0.004, 0.004, 0.2, mat("#2a2a2a"), [x + 0.01, 1.2, 0.05], [0, 0, 0.15])); };
      iced(-1.9); iced(0.65); iced(2.55); }
    { const rl = new THREE.Group(); rl.position.set(-2.1, 0.15, 0.9); IN.add(rl); for (let k = 0; k < 3; k++) { const a = k * 2.094; rl.add(cyl(0.008, 0.008, 1.3, mat("#111"), [Math.cos(a) * 0.18, 0.62, Math.sin(a) * 0.18], [Math.sin(a) * 0.28, 0, -Math.cos(a) * 0.28])); }
      rl.add(cyl(0.012, 0.012, 0.5, mat("#111"), [0, 1.45, 0])); const ring = M(new THREE.TorusGeometry(0.2, 0.025, 12, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.35, 2.2), toneMapped: false }), [0, 1.72, 0], [0, 0.4, 0]); ring.castShadow = false; rl.add(ring);
      const rp = new THREE.PointLight("#fff6ea", day ? 1.5 : 3, 2.5, 2); rp.position.set(0.1, 1.7, 0.25); rl.add(rp); }
    rivalPlus(IN, day, this.glow); streetPlus(R, day, asphaltTex);
    // outside the cafe: two tall planters, a standing menu sign, string of bulbs
    for (const x of [-3.0, 3.0]) { C.add(B(0.5, 0.6, 0.5, mat("#3a3d42", { roughness: 0.5 }), [x, 0.3, 0.6])); const lm = new THREE.MeshStandardMaterial({ color: "#3c7a3f", side: THREE.DoubleSide }); for (let i = 0; i < 10; i++) C.add(M(new THREE.PlaneGeometry(0.16, 0.7), lm, [x + (rnd() - 0.5) * 0.2, 0.9, 0.6 + (rnd() - 0.5) * 0.2], [(rnd() - 0.5) * 0.5, rnd() * 3, (rnd() - 0.5) * 0.5])); }
    for (let i = 0; i < 14; i++) { const x = -3.4 + i * 0.52, y = 2.95 - 0.12 * Math.sin((i / 13) * Math.PI); C.add(M(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: day ? new THREE.Color(1.6, 1.3, 0.8) : new THREE.Color(2.4, 1.8, 1.0) }), [x, y, 0.35])); }

    // floating dust in the warung shade
    { const dg = new THREE.BufferGeometry(), dp: number[] = []; for (let i = 0; i < 220; i++) dp.push((rnd() - 0.5) * 6, 0.3 + rnd() * 2.2, 0.4 + rnd() * 2.2); dg.setAttribute("position", new THREE.Float32BufferAttribute(dp, 3));
      const dot = canvasTex(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(255,240,210,1)"); gr.addColorStop(1, "rgba(255,240,210,0)"); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
      this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ map: dot, size: 0.007, transparent: true, opacity: day ? 0.35 : 0.25, blending: THREE.AdditiveBlending, depthWrite: false })); R.add(this.dust); }
    if (day) this.morning(R);
  }
  /** morning detail: sky dome with clouds, cool fill + warm ground bounce, sun shafts with motes, a mirror puddle */
  private motes: THREE.Points | null = null;
  private morning(R: THREE.Group) {
    // sky: warm hazy horizon to clear blue, soft cumulus low over the roofs
    const skyT = canvasTex(1024, 512, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#4f86c9"); gr.addColorStop(0.32, "#8db6e4"); gr.addColorStop(0.47, "#d9e2e6"); gr.addColorStop(0.5, "#f3dfbf"); gr.addColorStop(1, "#e8cfa8"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
      for (let c = 0; c < 26; c++) { const cx = rnd() * 1024, cy = 150 + rnd() * 90, w = 50 + rnd() * 110;
        for (let k = 0; k < 9; k++) { const x = cx + (rnd() - 0.5) * w * 1.6, y = cy + (rnd() - 0.6) * w * 0.35, r = w * (0.25 + rnd() * 0.3); const rg = g.createRadialGradient(x, y - r * 0.3, 0, x, y, r);
          rg.addColorStop(0, "rgba(255,248,236,0.85)"); rg.addColorStop(0.6, "rgba(246,232,214,0.45)"); rg.addColorStop(1, "rgba(220,215,220,0)"); g.fillStyle = rg; g.beginPath(); g.ellipse(x, y, r * 1.5, r, 0, 0, Math.PI * 2); g.fill(); } } });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(140, 48, 24), new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide, fog: false, depthWrite: false }));
    sky.position.set(0, -10, 5); sky.castShadow = sky.receiveShadow = false; R.add(sky);
    // cool skylight from the open street side and warm light bounced up off the sunny tiles and asphalt
    const fill = new THREE.DirectionalLight("#a8c6ff", 0.55); fill.position.set(8, 3.5, 6); fill.target.position.set(0, 1, 1); R.add(fill, fill.target);
    const bounce = new THREE.PointLight("#ffb571", 1.3, 5, 1.5); bounce.position.set(0.6, 0.35, 2.4); R.add(bounce);
    // sun shafts: crossed additive planes slanting down from the sun, onto the terrace and the road
    const dir = this.sunDir.clone(), sm = new THREE.MeshBasicMaterial({ map: shaftTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, color: new THREE.Color(0.12, 0.088, 0.05) });
    const feet: V3[] = [[-2.6, 0, 2.3], [-0.9, 0, 3.1], [1.6, 0, 2.6], [3.3, 0, 3.4], [-4.6, 0, 3.0], [5.6, 0, 2.8], [-1.8, 0, 5.2], [0.9, 0, 6.0], [3.0, 0, 5.4], [-0.2, 0, 7.4], [2.2, 0, 8.3]];
    const mp: number[] = [];
    feet.forEach(([x, y, z], i) => { const len = 6.5, w = 0.55 + (i % 3) * 0.25, base = new THREE.Vector3(x, y, z), mid = base.clone().addScaledVector(dir, len / 2);
      for (const ry of [0, Math.PI / 2]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(w, len), sm); s.position.copy(mid); s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); s.rotateY(ry + i * 0.4); s.castShadow = s.receiveShadow = false; R.add(s); }
      for (let k = 0; k < 45; k++) { const p = base.clone().addScaledVector(dir, 0.3 + rnd() * 4.5).add(new THREE.Vector3((rnd() - 0.5) * w, (rnd() - 0.5) * 0.3, (rnd() - 0.5) * w)); mp.push(p.x, p.y, p.z); } });
    const mg = new THREE.BufferGeometry(); mg.setAttribute("position", new THREE.Float32BufferAttribute(mp, 3));
    const dot = canvasTex(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(255,236,200,1)"); gr.addColorStop(1, "rgba(255,236,200,0)"); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
    this.motes = new THREE.Points(mg, new THREE.PointsMaterial({ map: dot, size: 0.012, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })); R.add(this.motes);
    // the terrace was just mopped (habis dipel): wet puddles on the tiles mirror people and shop fronts: one Reflector holding several blobs (no mirror recursion)
    const blob = (cx: number, cz: number, r: number, seed: number) => { const sh = new THREE.Shape(); for (let k = 0; k <= 32; k++) { const a = (k / 32) * Math.PI * 2, rr = r * (1 + 0.18 * Math.sin(a * 3 + seed) + 0.09 * Math.sin(a * 5 + seed * 2)); const px = cx + Math.cos(a) * rr * 1.6, pz = cz + Math.sin(a) * rr * 0.8; if (k) sh.lineTo(px, -pz); else sh.moveTo(px, -pz); } return sh; };
    const P: [number, number, number, number][] = [[-0.9, 1.78, 0.28, 1], [0.05, 1.86, 0.16, 2.3], [2.0, 1.74, 0.3, 3.7], [3.45, 1.8, 0.22, 5.1], [-2.7, 1.76, 0.26, 6.2], [5.0, 1.78, 0.25, 7.7]];
    const shapes = P.map(([x, z, r, sd]) => blob(x, z, r, sd));
    const pud = new Reflector(new THREE.ShapeGeometry(shapes, 12), { textureWidth: 1024, textureHeight: 1024, color: 0x9aa2ad, clipBias: 0.003 });
    pud.rotation.x = -Math.PI / 2; pud.position.y = 0.037; pud.camera.layers.enable(NOINK); R.add(pud);
    const wet = new THREE.Mesh(new THREE.ShapeGeometry(P.map(([x, z, r, sd]) => blob(x, z, Math.min(r * 1.3, 0.3), sd)), 12), new THREE.MeshStandardMaterial({ color: "#4a4a4e", roughness: 0.25, transparent: true, opacity: 0.55 }));
    wet.rotation.x = -Math.PI / 2; wet.position.y = 0.034; wet.receiveShadow = true; R.add(wet);
  }
  setMenu(p: number, tally = 0) { this.menu.draw("m" + p.toFixed(2) + "t" + tally, (g, w, h) => drawChalkMenu(g, w, h, p, tally)); }
  setDay(name: string, n: number) { this.calendar.draw(name + n, (g, w, h) => { g.fillStyle = "#f6f3ea"; g.fillRect(0, 0, w, h); g.fillStyle = "#c0392b"; g.fillRect(0, 0, w, 70); g.fillStyle = "#fff"; g.font = "bold 40px 'Helvetica Neue', Arial"; g.textAlign = "center"; g.fillText(name, w / 2, 52); g.fillStyle = n === 0 ? "#c0392b" : "#222"; g.font = "bold 170px 'Helvetica Neue', Arial"; g.fillText(String(n), w / 2, 260); }); }
  update(t: number) {
    this.glow.update(t);
    for (const s of this.sway) { if (s.base) s.o.rotation.x = s.base + s.amp * Math.sin(t * s.f * 6.28 + s.ph); else { s.o.rotation.z = s.amp * Math.sin(t * s.f * 6.28 + s.ph); s.o.rotation.x = 0.5 * s.amp * Math.sin(t * s.f * 4 + s.ph); } }
    this.dust.position.set(0.04 * Math.sin(t * 0.3), (0.03 * t) % 0.5, 0.03 * Math.cos(t * 0.25));
    if (this.motes) this.motes.position.set(0.05 * Math.sin(t * 0.21), 0.04 * Math.sin(t * 0.17) + ((0.02 * t) % 0.3), 0.04 * Math.cos(t * 0.19));
    if (this.lamp) this.lamp.intensity = 9 * (0.98 + 0.02 * Math.sin(t * 50));
    if (this.mode === "night") this.bulbLight.intensity = 7.5 * (0.97 + 0.03 * Math.sin(t * 13) * Math.sin(t * 3.1));
  }
}
