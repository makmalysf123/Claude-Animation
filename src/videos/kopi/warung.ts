// "Kopi Mahal" set: a kampung coffee stall (warung) on one side of an asphalt street, a glossy new cafe across it.
// Axes: the warung facade is the plane z = 0 facing +z, its counter front at z = 1.2, its yard/sidewalk to z = 2.4;
// the road runs along x from z = 2.6 to 7.6; the cafe facade is at z = 10.2 facing -z (toward the warung).
// mode "day": warm morning sun from the left, cool sky fill. mode "night": one warm bulb under the warung awning,
// the cafe dark except a few security lights, a cool moon.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { woodPlanks, plaster, rooftiles, stone, dirt, grassTuft, bananaLeaf, rnd, fbm, seedRnd } from "../../lib/world2/textures";
import { std, canvasTex, LiveTex } from "../ketindihan2/sets";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { shaftTex } from "../../lib/world2/textures";
import { NOINK } from "../bridge/ink";
import { ruko, poleLine, skyline, scooter, galonStack, tileTex, wallTex, signTex } from "./kota";

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
  g.fillStyle = "#1f2a24"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(255,255,255,${0.02 + rnd() * 0.05})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 6, 1); } // chalk dust smears
  g.fillStyle = "#f4f1e6"; g.font = "bold 46px 'Chalkboard SE', 'Comic Sans MS', cursive"; g.textAlign = "center"; g.fillText("WARUNG KOPI", w / 2, 64);
  g.strokeStyle = "#f4f1e6"; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 84); g.lineTo(w - 40, 84); g.stroke();
  g.textAlign = "left"; g.font = "34px 'Chalkboard SE', 'Comic Sans MS', cursive";
  [["KOPI HITAM", "5.000"], ["KOPI SUSU", "6.000"], ["TEH MANIS", "4.000"], ["GORENGAN", "1.000"]].forEach(([a, b], i) => { g.fillStyle = "#e9e4d6"; g.fillText(a, 34, 140 + i * 52); g.textAlign = "right"; g.fillText(b, w - 34, 140 + i * 52); g.textAlign = "left"; });
  if (p > 0) { // the new line, written like a hand: p 0..0.5 the name, 0.5..1 the price
    const a = Math.min(1, p * 2), b = Math.max(0, p * 2 - 1);
    g.save(); g.beginPath(); g.rect(0, 336, 34 + 330 * a, 42); g.clip(); g.fillStyle = "#ffe08a"; g.font = "bold 36px 'Chalkboard SE', 'Comic Sans MS', cursive"; g.fillText("KOPI ISTIMEWA", 34, 368); g.restore();
    if (b > 0) { g.save(); g.beginPath(); g.rect(300, 370, 178 * b, 56); g.clip(); g.fillStyle = "#ffe08a"; g.font = "bold 52px 'Chalkboard SE', 'Comic Sans MS', cursive"; g.textAlign = "right"; g.fillText("50.000", w - 34, 418); g.restore(); }
  }
  for (let i = 0; i < tally; i++) { g.strokeStyle = "#e9e4d6"; g.lineWidth = 3; g.beginPath(); g.moveTo(40 + i * 14, h - 50); g.lineTo(40 + i * 14, h - 22); g.stroke(); }
};
/** the cafe's backlit sign (invented name) */
const cafeSignTex = canvasTex(1024, 192, (g) => { g.fillStyle = "#14161a"; g.fillRect(0, 0, 1024, 192); g.fillStyle = "#fff5dd"; g.shadowColor = "#ffcf7a"; g.shadowBlur = 24; g.font = "300 96px 'Helvetica Neue', Arial"; g.textAlign = "center"; g.fillText("LANGIT  COFFEE", 512, 128); g.shadowBlur = 0; g.font = "28px 'Helvetica Neue', Arial"; g.fillStyle = "#c9a96e"; g.fillText("SPECIALTY  ·  EST. 2026", 512, 172); });

export class WarungSet {
  root = new THREE.Group(); sunDir = new THREE.Vector3(); menu = new LiveTex(512, 512); calendar = new LiveTex(256, 320);
  bulbLight: THREE.PointLight; bulb: THREE.Mesh;
  /** points used by the scenes */
  spots = { counterTop: 0.96, counterZ: 0.9, board: new THREE.Vector3(-2.05, 1.12, 1.95), table: new THREE.Vector3(1.15, 0.74, 2.1), owner: [0.25, 0.42] as [number, number] };
  lamp: THREE.PointLight | null = null;
  private sway: { o: THREE.Object3D; amp: number; f: number; ph: number; base: number }[] = []; private dust!: THREE.Points;
  constructor(public mode: "day" | "night" = "day") {
    seedRnd(4242); const R = this.root, day = mode === "day";
    // ---------------- light ----------------
    const sun = new THREE.DirectionalLight(day ? "#ffc98e" : "#9fb4ff", day ? 4.1 : 0.35); if (day) sun.position.set(-9, 4.4, 8.5); else sun.position.set(-7, 5.5, 8); sun.target.position.set(0, 0.6, 3);
    sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
    this.sunDir.copy(sun.position).sub(sun.target.position).normalize(); R.add(sun, sun.target);
    R.add(new THREE.HemisphereLight(day ? "#b9d3ff" : "#2a3866", day ? "#a8794a" : "#140e0a", day ? 1.2 : 0.25));
    this.bulbLight = new THREE.PointLight("#ffbf72", day ? 0.6 : 7.5, day ? 3 : 9, 1.7); this.bulbLight.position.set(0.2, 2.18, 1.35); this.bulbLight.castShadow = !day; this.bulbLight.shadow.mapSize.set(1024, 1024); this.bulbLight.shadow.bias = -0.002; R.add(this.bulbLight);
    this.bulb = M(new THREE.SphereGeometry(0.055, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 2.5, 1.3) }), [0.2, 2.25, 1.35]); this.bulb.castShadow = false; R.add(this.bulb);
    R.add(M(new THREE.CylinderGeometry(0.004, 0.004, 0.3, 4), mat("#111"), [0.2, 2.42, 1.35]));

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
    // ---------------- the warung ----------------
    const W = new THREE.Group(); R.add(W);
    const plast = std(plaster("#e7dcc4"), [3, 1]), wood = std(woodPlanks("#8a5a33", 7, "wrg"), [3, 1]), beam = std(woodPlanks("#5a3820", 2, "wbeam"), [1, 1]);
    W.add(B(6.4, 1.0, 0.16, plast, [0, 0.5, -0.08])); W.add(B(6.4, 1.9, 0.12, wood, [0, 1.95, -0.06])); // plinth + plank wall
    { const up = ruko({ w: 6.6, floors: 3, col: "#d9d2bf", ground: "none", night: !day }); up.position.set(0, 0, -0.16); R.add(up);
      R.add(M(new THREE.PlaneGeometry(3.0, 0.75), new THREE.MeshStandardMaterial({ map: signTex("WARKOP MAKMUR", "KOPI · MIE REBUS · GORENGAN", "#1f5f3a", "#f4e9c8"), roughness: 0.6 }), [0.75, 3.78, 0.3])); }
    W.add(B(6.5, 0.12, 0.18, beam, [0, 1.0, 0.02])); for (const x of [-3.1, 3.1]) W.add(B(0.16, 2.9, 0.18, beam, [x, 1.45, 0.02]));
    // back opening behind the counter: dark room with stocked shelves
    W.add(B(2.4, 1.5, 0.02, new THREE.MeshStandardMaterial({ map: shelfTex, roughness: 0.9, color: day ? "#9a8a7a" : "#5a4a40" }), [0.3, 1.7, 0.02]));
    W.add(B(2.6, 0.1, 0.12, beam, [0.3, 2.5, 0.06])); for (const x of [-1.0, 1.6]) W.add(B(0.1, 1.6, 0.12, beam, [x, 1.7, 0.06]));
    // awning: zinc sheet on rafters, two posts, a fascia board
    const zinc = new THREE.MeshStandardMaterial({ map: zincTex, metalness: 0.6, roughness: 0.42, side: THREE.DoubleSide }); zinc.map!.repeat.set(10, 1);
    W.add(M(new THREE.PlaneGeometry(6.8, 2.45), zinc, [0, 2.62, 1.12], [-Math.PI / 2 + 0.2, 0, 0]));
    for (let x = -3.2; x <= 3.2; x += 0.8) W.add(B(0.06, 0.08, 2.4, beam, [x, 2.55, 1.12], [0.2, 0, 0]));
    W.add(B(6.9, 0.18, 0.04, std(woodPlanks("#b8432e", 1, "fas"), [4, 1]), [0, 2.36, 2.34]));
    for (const x of [-3.0, 3.0]) { W.add(B(0.12, 2.36, 0.12, beam, [x, 1.18, 2.25])); W.add(B(0.22, 0.08, 0.22, plast, [x, 0.04, 2.25])); }
    // counter: wooden body, plank top, front panel with a painted stripe
    const counter = new THREE.Group(); counter.position.set(0.3, 0, 0.9); W.add(counter);
    counter.add(B(2.7, 0.9, 0.58, std(woodPlanks("#7a4a2a", 9, "cnt"), [2, 1]), [0, 0.45, 0]));
    counter.add(B(2.85, 0.06, 0.66, std(woodPlanks("#a06a3e", 3, "ctop"), [2, 1], { roughness: 0.55 }), [0, 0.93, 0]));
    counter.add(B(2.72, 0.1, 0.01, mat("#2e7d5b"), [0, 0.7, 0.296]));
    // glass display case (etalase) on the counter, left end: fried snacks inside
    { const e = new THREE.Group(); e.position.set(-0.85, 0.96, 0.02); counter.add(e);
      const glass = new THREE.MeshPhysicalMaterial({ color: "#dfeff2", roughness: 0.05, transmission: 0, transparent: true, opacity: 0.18, metalness: 0, clearcoat: 1, envMapIntensity: 1.2 });
      const fr = mat("#c9c9c9", { metalness: 0.8, roughness: 0.35 });
      e.add(B(0.62, 0.02, 0.4, fr, [0, 0.01, 0])); e.add(B(0.62, 0.02, 0.4, fr, [0, 0.36, 0]));
      for (const [x, z] of [[-0.3, -0.19], [0.3, -0.19], [-0.3, 0.19], [0.3, 0.19]] as [number, number][]) e.add(B(0.02, 0.36, 0.02, fr, [x, 0.18, z]));
      const gl = M(new THREE.BoxGeometry(0.6, 0.34, 0.38), glass, [0, 0.18, 0]); gl.castShadow = false; gl.renderOrder = 4; e.add(gl);
      const fried = mat("#c4842e", { roughness: 0.6 }); for (let i = 0; i < 14; i++) { const k = M(new THREE.CapsuleGeometry(0.022, 0.06, 4, 8), fried, [(rnd() - 0.5) * 0.48, 0.05 + (i > 8 ? 0.03 : 0), (rnd() - 0.5) * 0.26], [Math.PI / 2, rnd() * 3, 0]); k.scale.set(1, 1, 0.7); e.add(k); } }
    // kerupuk jars (3) with red lids
    { const jarM = new THREE.MeshPhysicalMaterial({ color: "#e8f3f4", roughness: 0.06, transparent: true, opacity: 0.3, clearcoat: 1 }); const lidM = mat("#c0392b", { roughness: 0.35 }); const kr = mat("#f1e3b2", { roughness: 0.9 });
      [-0.25, 0.0, 0.25].forEach((x, i) => { const j = new THREE.Group(); j.position.set(x - 0.15, 0.96, -0.12); counter.add(j);
        const jg = M(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 24, 1, true), jarM, [0, 0.15, 0]); jg.castShadow = false; jg.renderOrder = 4; j.add(jg);
        j.add(cyl(0.104, 0.104, 0.04, lidM, [0, 0.32, 0])); for (let k = 0; k < 9; k++) j.add(M(new THREE.CircleGeometry(0.04 + rnd() * 0.02, 9), i === 1 ? mat("#e8a8b8") : kr, [(rnd() - 0.5) * 0.12, 0.04 + k * 0.025, (rnd() - 0.5) * 0.12], [rnd() * 3, rnd() * 3, 0])); }); }
    // thermos (red floral) and a kettle on a small stove at the right end
    { const tm = new THREE.Group(); tm.position.set(1.05, 0.96, -0.12); counter.add(tm);
      const flor = canvasTex(256, 256, (g) => { g.fillStyle = "#c62e2e"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 14; i++) { const x = rnd() * 256, y = rnd() * 256; for (let k = 0; k < 5; k++) { g.fillStyle = "#f6d2d2"; g.beginPath(); g.ellipse(x + 10 * Math.cos(k * 1.26), y + 10 * Math.sin(k * 1.26), 8, 5, k * 1.26, 0, Math.PI * 2); g.fill(); } g.fillStyle = "#f2c12e"; g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill(); } });
      tm.add(M(new THREE.CylinderGeometry(0.075, 0.08, 0.34, 28), new THREE.MeshPhysicalMaterial({ map: flor, roughness: 0.3, clearcoat: 0.8 }), [0, 0.17, 0]));
      tm.add(cyl(0.05, 0.07, 0.06, mat("#eeeeee", { metalness: 0.6, roughness: 0.3 }), [0, 0.37, 0])); tm.add(cyl(0.03, 0.03, 0.04, mat("#c62e2e"), [0, 0.42, 0]));
      const st = new THREE.Group(); st.position.set(0.32, 0, 0.02); tm.add(st); st.add(B(0.3, 0.06, 0.24, mat("#2a2a2a", { metalness: 0.5, roughness: 0.4 }), [0, 0.03, 0]));
      st.add(M(new THREE.SphereGeometry(0.1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat("#b9bec4", { metalness: 0.9, roughness: 0.25 }), [0, 0.07, 0]));
      st.add(cyl(0.012, 0.02, 0.12, mat("#b9bec4", { metalness: 0.9, roughness: 0.25 }), [0.1, 0.12, 0], [0, 0, -0.9])); }
    // coffee sachet strips hanging from the awning bar
    { const bar = cyl(0.012, 0.012, 2.6, mat("#666", { metalness: 0.7, roughness: 0.4 }), [0.3, 2.32, 1.25], [0, 0, Math.PI / 2]); W.add(bar);
      const kinds: [string, string][] = [["#7a3b1d", "KOPI JAYA"], ["#d9a02a", "SUSU"], ["#2f5d8a", "MOKA"], ["#7a3b1d", "KOPI JAYA"], ["#3c7a3a", "JAHE"], ["#a33a2a", "KOPI TUBRUK"]];
      kinds.forEach(([c, n], i) => { const s = new THREE.Group(); s.position.set(-0.75 + i * 0.4, 2.3, 1.25); W.add(s);
        const rt = rencengTex(c, n); rt.repeat.set(1, 0.664); rt.offset.set(0, 0.336); // short strips (4 sachets) so they hang above the heads
        const pl = M(new THREE.PlaneGeometry(0.11, 0.4), new THREE.MeshStandardMaterial({ map: rt, roughness: 0.45, metalness: 0.15, side: THREE.DoubleSide }), [0, -0.2, 0]); s.add(pl);
        this.sway.push({ o: s, amp: 0.05, f: 0.5 + rnd() * 0.4, ph: rnd() * 6, base: 0 }); }); }
    // chalk menu board on an A-frame easel in the yard (left)
    { const bd = new THREE.Group(); bd.position.set(-2.05, 0, 1.95); bd.rotation.y = 0.22; W.add(bd);
      const fr = std(woodPlanks("#6a4224", 2, "easel"), [1, 1]);
      for (const s of [-1, 1]) bd.add(B(0.05, 1.7, 0.05, fr, [s * 0.45, 0.82, 0.08], [-0.12, 0, 0]));
      bd.add(B(0.05, 1.5, 0.05, fr, [0, 0.72, -0.25], [0.35, 0, 0]));
      bd.add(B(0.98, 1.0, 0.04, fr, [0, 1.12, 0.0], [-0.12, 0, 0]));
      const face = M(new THREE.PlaneGeometry(0.88, 0.9), new THREE.MeshStandardMaterial({ map: this.menu.tex, roughness: 0.95 }), [0, 1.12, 0.025], [-0.12, 0, 0]); face.castShadow = false; bd.add(face);
      bd.add(B(0.4, 0.02, 0.05, fr, [0, 0.63, 0.1], [-0.12, 0, 0])); // chalk ledge
      bd.add(B(0.07, 0.015, 0.015, mat("#f4f1e6"), [0.1, 0.645, 0.11], [-0.12, 0, 0.1])); }
    this.menu.draw("init", (g, w, h) => drawChalkMenu(g, w, h, 0));
    // tear-off calendar on the right post (the day count)
    { const cal = M(new THREE.PlaneGeometry(0.26, 0.33), new THREE.MeshStandardMaterial({ map: this.calendar.tex, roughness: 0.9 }), [2.93, 1.55, 2.325], [0, 0, 0]); cal.castShadow = false; W.add(cal); this.setDay("SENIN", 1); }
    // long bench + two plastic stools in front of the counter, a small table on the right for guests
    { const bw = std(woodPlanks("#7d5232", 3, "bench"), [2, 1]); const bn = new THREE.Group(); bn.position.set(-0.6, 0, 1.75); W.add(bn);
      bn.add(B(1.6, 0.05, 0.3, bw, [0, 0.45, 0])); for (const x of [-0.7, 0.7]) bn.add(B(0.06, 0.45, 0.26, bw, [x, 0.225, 0]));
      for (const [x, z, c] of [[2.45, 1.05, "#d33a2c"], [-1.62, 1.3, "#2a7fd1"]] as [number, number, string][]) { const st = new THREE.Group(); st.position.set(x, 0, z); W.add(st); const sm = mat(c, { roughness: 0.35 });
        st.add(cyl(0.16, 0.16, 0.03, sm, [0, 0.44, 0], [0, 0, 0], 28)); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; st.add(cyl(0.015, 0.02, 0.44, sm, [Math.cos(a) * 0.12, 0.22, Math.sin(a) * 0.12], [Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12])); } }
      const tb = new THREE.Group(); tb.position.set(1.15, 0, 2.1); W.add(tb); tb.add(B(0.7, 0.04, 0.5, std(woodPlanks("#9a6a40", 4, "tbl"), [1, 1], { roughness: 0.5 }), [0, 0.72, 0])); for (const [x, z] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]] as [number, number][]) tb.add(B(0.04, 0.72, 0.04, bw, [x, 0.36, z]));
      tb.add(B(0.7, 0.002, 0.5, new THREE.MeshStandardMaterial({ color: "#d7e7dd", roughness: 0.3, transparent: true, opacity: 0.6 }), [0, 0.742, 0])); }
    // potted plants and a banana tree beside the warung, a bicycle leaning on the wall
    { const pot = std(woodPlanks("#a0522d", 1, "pot"), [1, 1]); for (const x of [-2.75, 3.4]) { W.add(cyl(0.16, 0.12, 0.3, pot, [x, 0.15, 0.4])); const lm = new THREE.MeshStandardMaterial({ color: "#3f7a3a", roughness: 0.7, side: THREE.DoubleSide }); for (let i = 0; i < 8; i++) W.add(M(new THREE.PlaneGeometry(0.1, 0.45), lm, [x + (rnd() - 0.5) * 0.1, 0.5, 0.4 + (rnd() - 0.5) * 0.1], [(rnd() - 0.5) * 0.5, rnd() * 3, (rnd() - 0.5) * 0.5])); }
    }
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
    { const gl = galonStack(); gl.position.set(2.55, 0, 0.35); R.add(gl); }
    this.lamp = poleLine(R, [-4.95, 4.6, 15.4], 2.5, !day, 4.6);
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
    if (day) { const pl = new THREE.PointLight("#ffcf8a", 3.5, 7, 1.6); pl.position.set(0, 2.2, -0.6); IN.add(pl); }
    for (const x of [-3.0, 3.0]) { IN.add(cyl(0.2, 0.16, 0.4, mat("#e9e6df", { roughness: 0.3 }), [x, 0.35, 1.8])); const lm = new THREE.MeshStandardMaterial({ color: "#2f6b34", side: THREE.DoubleSide, roughness: 0.6 }); for (let i = 0; i < 12; i++) IN.add(M(new THREE.PlaneGeometry(0.22, 0.6), lm, [x + (rnd() - 0.5) * 0.2, 0.85, 1.8 + (rnd() - 0.5) * 0.2], [(rnd() - 0.5) * 0.7, rnd() * 3, (rnd() - 0.5) * 0.7])); }
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
    for (const s of this.sway) { if (s.base) s.o.rotation.x = s.base + s.amp * Math.sin(t * s.f * 6.28 + s.ph); else { s.o.rotation.z = s.amp * Math.sin(t * s.f * 6.28 + s.ph); s.o.rotation.x = 0.5 * s.amp * Math.sin(t * s.f * 4 + s.ph); } }
    this.dust.position.set(0.04 * Math.sin(t * 0.3), (0.03 * t) % 0.5, 0.03 * Math.cos(t * 0.25));
    if (this.motes) this.motes.position.set(0.05 * Math.sin(t * 0.21), 0.04 * Math.sin(t * 0.17) + ((0.02 * t) % 0.3), 0.04 * Math.cos(t * 0.19));
    if (this.lamp) this.lamp.intensity = 9 * (0.98 + 0.02 * Math.sin(t * 50));
    if (this.mode === "night") this.bulbLight.intensity = 7.5 * (0.97 + 0.03 * Math.sin(t * 13) * Math.sin(t * 3.1));
  }
}
