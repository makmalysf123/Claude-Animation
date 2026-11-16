// "Markas Otak": the control room inside Pak Budi's head, rebuilt with detail and real light.
//  - back wall: two big oval EYE WINDOWS (what Budi sees, with eyelid shutters), the JAWABAN screen between them
//  - curved main console: dozens of glowing buttons, knobs, sliders, two mini screens (EKG + brain waves), the big
//    SADAR / OTOT levers, OTOT chained and padlocked, a coffee mug, sticky notes; a swivel chair
//  - left wall: the PEMICU monitor (live terminal); copper pipes with gauges along the walls; brain-fold dome ceiling
//  - centre: the TEST STAGE: two clamp stands (1 sheet "JIN" vs a 4-sheet stack) under a ceiling crane rail from which
//    the giant scissors come down
//  - right: the huge "CERITA MISTIS" memory shelf (glowing memory orbs, each a tiny scene; one shows Budi watching a
//    horror film) and the tiny dusty "PENJELASAN ILMIAH" drawer
// Light: warm console glow, cool screen light, warm pendant lamps with visible cones, a glossy floor, dust.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { woodPlanks, plaster, shaftTex, rnd, fbm } from "../../lib/world2/textures";
import { std, canvasTex, LiveTex } from "./sets";
import { drawSheet } from "./props2d";

type V3 = [number, number, number];
const mat = (c: string, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });
const M = (geo: THREE.BufferGeometry, m: THREE.Material | THREE.Material[]) => new THREE.Mesh(geo, m);
const rbox = (w: number, h: number, d: number, r = 0.02) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.1, h / 2.1, d / 2.1));
const put = <T extends THREE.Object3D>(g: THREE.Object3D, o: T, p: V3, r: V3 = [0, 0, 0], cast = true): T => { o.position.set(...p); o.rotation.set(...r); o.traverse((k) => { if ((k as THREE.Mesh).isMesh) { k.castShadow = cast; k.receiveShadow = true; } }); g.add(o); return o; };
const glowMat = (c: THREE.Color) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });

/** brain-fold texture for the dome and wall linings */
const brainTex = canvasTex(1024, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#e9a3b4"); gr.addColorStop(1, "#c9798f"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  for (let k = 0; k < 140; k++) { let x = rnd() * 1024, y = rnd() * 512; g.strokeStyle = `rgba(150,60,90,${0.35 + rnd() * 0.3})`; g.lineWidth = 6 + rnd() * 8; g.lineCap = "round"; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 7; s++) { const nx = x + (rnd() - 0.5) * 90, ny = y + (rnd() - 0.5) * 60; g.quadraticCurveTo(x + (rnd() - 0.5) * 60, y + (rnd() - 0.5) * 60, nx, ny); x = nx; y = ny; } g.stroke();
    g.strokeStyle = "rgba(255,220,230,0.25)"; g.lineWidth = 2; g.stroke(); }
});
brainTex.wrapS = THREE.RepeatWrapping;

/** a 3D pair of scissors: steel blades + red handles + brass pivot. Local: pivot at origin, blades point down (-y),
 *  they open in the y-z plane (flats facing x). open() sets the half-angle. */
export class Scissors {
  g = new THREE.Group(); a = new THREE.Group(); b = new THREE.Group();
  constructor(size = 1) {
    const steel = new THREE.MeshStandardMaterial({ color: "#d8dde4", metalness: 1, roughness: 0.18 }), red = new THREE.MeshPhysicalMaterial({ color: "#d4302c", roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
    const blade = (s: number) => { const sh = new THREE.Shape(); sh.moveTo(-0.07 * s, 0.05); sh.lineTo(0.06 * s, 0.05); sh.quadraticCurveTo(0.07 * s, -0.35, 0.012 * s, -0.95); sh.lineTo(0.0, -0.98); sh.quadraticCurveTo(-0.02 * s, -0.5, -0.07 * s, 0.05);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 16 }); geo.translate(0, 0, -0.011); geo.rotateY(Math.PI / 2); return geo; };
    const ring = () => { const sh = new THREE.Shape(); sh.absellipse(0, 0, 0.13, 0.09, 0, Math.PI * 2, false, 0); const hole = new THREE.Path(); hole.absellipse(0, 0, 0.085, 0.05, 0, Math.PI * 2, true, 0); sh.holes.push(hole);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 3, curveSegments: 32 }); geo.translate(0, 0, -0.025); geo.rotateY(Math.PI / 2); return geo; };
    for (const [grp, s, off] of [[this.a, 1, 0.014], [this.b, -1, -0.014]] as [THREE.Group, number, number][]) {
      const bl = M(blade(s), steel); bl.position.x = off; grp.add(bl);
      const arm = M(new THREE.CylinderGeometry(0.03, 0.035, 0.32, 12), red); arm.position.set(off, 0.2, -s * 0.04); arm.rotation.x = s * 0.25; grp.add(arm);
      const r = M(ring(), red); r.position.set(off, 0.42, -s * 0.11); r.rotation.x = s * 0.35; grp.add(r);
      grp.traverse((k) => { if ((k as THREE.Mesh).isMesh) { k.castShadow = true; k.receiveShadow = true; } }); this.g.add(grp);
    }
    const pin = M(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 20), new THREE.MeshStandardMaterial({ color: "#c9a24a", metalness: 1, roughness: 0.25 })); pin.rotation.z = Math.PI / 2; this.g.add(pin);
    this.g.scale.setScalar(size);
  }
  open(half: number) { this.a.rotation.x = half; this.b.rotation.x = -half; }
}

/** a memory orb's inner scene (drawn once; the "Budi watching horror" orb is redrawn live) */
const orbScene = (g: CanvasRenderingContext2D, kind: number, t = 0) => {
  const W = 256; g.clearRect(0, 0, W, W);
  const bgs = ["#3a1e4a", "#2a1a12", "#14223a", "#401a1a", "#1d2a1a", "#2a2440"];
  g.fillStyle = bgs[kind % 6]; g.fillRect(0, 0, W, W);
  const head = (x: number, y: number, r: number, peci = false) => { g.fillStyle = "#fbf9f6"; g.beginPath(); g.arc(x, y, r, 0, 6.3); g.fill(); g.lineWidth = r * 0.12; g.strokeStyle = "#2b1a26"; g.stroke(); if (peci) { g.fillStyle = "#1a1418"; g.fillRect(x - r * 0.7, y - r * 1.15, r * 1.4, r * 0.45); } };
  if (kind === 0) { // Budi watching a horror film on TV, the screen flickers
    const fl = 0.75 + 0.25 * Math.sin(t * 23) * Math.sin(t * 7.1);
    g.fillStyle = "#0c0c16"; g.fillRect(0, 0, W, W); g.fillStyle = "#2a2a30"; g.fillRect(118, 60, 120, 92); g.fillStyle = `rgba(150,190,255,${fl})`; g.fillRect(126, 68, 104, 74);
    g.fillStyle = "#101018"; g.beginPath(); g.ellipse(178, 120, 16, 34, 0, 0, 6.3); g.fill(); g.fillStyle = "#fff"; g.fillRect(170, 100, 5, 6); g.fillRect(182, 100, 5, 6);
    const gr = g.createRadialGradient(178, 110, 10, 120, 170, 170); gr.addColorStop(0, `rgba(120,170,255,${0.35 * fl})`); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, W, W);
    g.fillStyle = "#5a3424"; g.fillRect(20, 168, 120, 50); g.fillRect(14, 150, 20, 70); head(80, 150, 26, true); g.fillStyle = "#2b1a26"; g.beginPath(); g.arc(72, 148, 5, 0, 6.3); g.arc(90, 148, 5, 0, 6.3); g.fill();
    g.fillStyle = "#e8dfcb"; g.fillRect(58, 176, 44, 30);
  } else if (kind === 1) { // grandma telling a ghost story by an oil lamp
    const gr = g.createRadialGradient(128, 150, 5, 128, 150, 120); gr.addColorStop(0, "rgba(255,190,90,0.8)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, W, W);
    head(80, 120, 24); g.fillStyle = "#b8b8c0"; g.beginPath(); g.arc(80, 100, 20, Math.PI, 0); g.fill(); head(170, 140, 18); head(205, 150, 16); g.fillStyle = "#ffcf6a"; g.beginPath(); g.ellipse(128, 168, 6, 12, 0, 0, 6.3); g.fill();
  } else if (kind === 2) { // a pocong poster
    g.fillStyle = "#e8e4dc"; g.beginPath(); g.ellipse(128, 140, 40, 90, 0, 0, 6.3); g.fill(); g.fillStyle = "#1a1a22"; g.beginPath(); g.arc(128, 90, 22, 0, 6.3); g.fill(); g.fillStyle = "#c83a3a"; g.font = "bold 30px sans-serif"; g.textAlign = "center"; g.fillText("HOROR!", 128, 40);
  } else if (kind === 3) { // a red-eyed figure in a tree
    g.fillStyle = "#0a0a10"; g.fillRect(118, 120, 20, 140); for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(70 + rnd() * 120, 60 + rnd() * 70, 30, 22, 0, 0, 6.3); g.fill(); } g.fillStyle = "#ff3a3a"; g.fillRect(110, 90, 8, 6); g.fillRect(128, 90, 8, 6);
  } else if (kind === 4) { // kids around a campfire
    const gr = g.createRadialGradient(128, 190, 5, 128, 190, 110); gr.addColorStop(0, "rgba(255,150,60,0.9)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, W, W); for (const x of [60, 128, 196]) head(x, 150, 18);
  } else { // "katanya..." gossip text
    g.fillStyle = "#f2e6c8"; g.font = "bold 34px sans-serif"; g.textAlign = "center"; g.fillText("KATANYA...", 128, 110); g.font = "26px sans-serif"; g.fillText("ada yang", 128, 150); g.fillText("nunggu!", 128, 182);
  }
  const vg = g.createRadialGradient(128, 128, 60, 128, 128, 140); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.7)"); g.fillStyle = vg; g.fillRect(0, 0, W, W);
};

export class BrainHQ {
  root = new THREE.Group(); sunDir = new THREE.Vector3(0.35, 0.8, 0.5).normalize();
  leverSadar = new THREE.Group(); leverOtot = new THREE.Group(); lock = new THREE.Group();
  monitor = new LiveTex(512, 704); screen = new LiveTex(1024, 512); ekg = new LiveTex(256, 128); waves = new LiveTex(256, 128);
  eyeL = new LiveTex(512, 384); eyeR = new LiveTex(512, 384); lids: THREE.Mesh[] = [];
  scissors = new Scissors(1.0); crane = new THREE.Group(); cable!: THREE.Mesh;
  jinL!: THREE.Mesh; jinR!: THREE.Mesh; stack: THREE.Mesh[] = []; dustCover!: THREE.Mesh;
  orbs: { m: THREE.Mesh; home: THREE.Vector3 }[] = []; hero!: { tex: LiveTex; m: THREE.Mesh }; heroOrb!: THREE.Group; heroTv!: THREE.MeshBasicMaterial;
  lights: Record<string, THREE.Light> = {}; eyeLights: THREE.PointLight[] = []; bulbs: THREE.MeshBasicMaterial[] = []; beacon = new THREE.Group(); boardSpots: THREE.SpotLight[] = [];
  private blink: { m: THREE.MeshBasicMaterial; ph: number; c: THREE.Color }[] = []; private steam!: THREE.Points;
  // anchors
  stageL: V3 = [-0.75, 0, 0.35]; stageR: V3 = [0.75, 0, 0.35]; paperY = 1.35;
  constructor() {
    const R = this.root;
    // ---------- room shell: glossy tile floor, curved riveted walls, brain-fold dome ----------
    const floor = M(new THREE.CircleGeometry(6.5, 64), new THREE.MeshStandardMaterial({ map: canvasTex(1024, 1024, (g) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = 36 + ((x + y) % 2) * 10 + rnd() * 6; g.fillStyle = `rgb(${v},${v + 4},${v + 14})`; g.fillRect(x * 64, y * 64, 64, 64); g.strokeStyle = "rgba(0,0,0,0.5)"; g.lineWidth = 3; g.strokeRect(x * 64, y * 64, 64, 64); } }), roughness: 0.38, metalness: 0.1 }));
    (floor.material as THREE.MeshStandardMaterial).map!.repeat.set(1, 1); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; R.add(floor);
    const wallM = new THREE.MeshStandardMaterial({ map: canvasTex(1024, 512, (g) => { g.fillStyle = "#3a4458"; g.fillRect(0, 0, 1024, 512); for (let x = 0; x < 1024; x += 128) { g.fillStyle = "rgba(255,255,255,0.05)"; g.fillRect(x, 0, 4, 512); g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(x + 4, 0, 3, 512); for (let y = 16; y < 512; y += 48) { g.fillStyle = "#6a7488"; g.beginPath(); g.arc(x + 14, y, 4, 0, 6.3); g.fill(); g.beginPath(); g.arc(x + 114, y, 4, 0, 6.3); g.fill(); } } for (let k = 0; k < 600; k++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.08})`; g.fillRect(rnd() * 1024, rnd() * 512, 3, 3); } }), side: THREE.BackSide, roughness: 0.55, metalness: 0.3 });
    (wallM.map as THREE.Texture).wrapS = THREE.RepeatWrapping; (wallM.map as THREE.Texture).repeat.set(4, 1);
    const wall = M(new THREE.CylinderGeometry(6, 6, 3.6, 72, 1, true), wallM); wall.position.y = 1.8; wall.receiveShadow = true; R.add(wall);
    const dome = M(new THREE.SphereGeometry(6, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: brainTex, side: THREE.BackSide, roughness: 0.55 })); dome.position.y = 3.6; dome.scale.y = 0.45; R.add(dome);
    (dome.material as THREE.MeshStandardMaterial).map!.repeat.set(3, 1);
    // copper pipes with gauges along the wall
    const copper = new THREE.MeshStandardMaterial({ color: "#c87a48", metalness: 1, roughness: 0.3 });
    for (const [y, r] of [[3.2, 0.06], [3.35, 0.045], [0.5, 0.07]] as [number, number][]) { const p = M(new THREE.TorusGeometry(5.85, r, 10, 120, Math.PI * 1.3), copper); p.rotation.set(Math.PI / 2, 0, Math.PI * 0.85); p.position.y = y; R.add(p); }
    for (let k = 0; k < 6; k++) { const a = Math.PI * (0.95 + k * 0.2), x = Math.cos(a) * 5.82, z = -Math.sin(a) * 5.82; const ga = new THREE.Group(); put(R, ga, [x, 3.2, z], [0, Math.atan2(-x, -z), 0]); put(ga, M(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 24), copper), [0, 0, 0.06], [Math.PI / 2, 0, 0]); put(ga, M(new THREE.CircleGeometry(0.09, 24), new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, (g) => { g.fillStyle = "#f2ead8"; g.beginPath(); g.arc(64, 64, 62, 0, 6.3); g.fill(); g.strokeStyle = "#222"; g.lineWidth = 3; for (let i = 0; i < 9; i++) { const aa = -2.4 + i * 0.6; g.beginPath(); g.moveTo(64 + Math.cos(aa) * 50, 64 + Math.sin(aa) * 50); g.lineTo(64 + Math.cos(aa) * 58, 64 + Math.sin(aa) * 58); g.stroke(); } g.strokeStyle = "#c0353a"; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.cos(-1 + k) * 44, 64 + Math.sin(-1 + k) * 44); g.stroke(); }) })), [0, 0, 0.086]); }
    // ---------- back wall: eye windows with eyelid shutters, JAWABAN screen ----------
    for (const [i, x] of [[0, -1.25], [1, 1.25]] as [number, number][]) {
      const eg = new THREE.Group(); put(R, eg, [x, 2.15, -5.72]);
      const rim = M(new THREE.TorusGeometry(1, 0.07, 16, 64), new THREE.MeshStandardMaterial({ color: "#b08a4a", metalness: 1, roughness: 0.25 })); rim.scale.set(1.05, 0.7, 1); eg.add(rim);
      const view = M(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ map: (i ? this.eyeR : this.eyeL).tex, toneMapped: false })); view.scale.set(1.05, 0.7, 1); view.position.z = -0.02; eg.add(view);
      const lid = M(new THREE.PlaneGeometry(2.3, 1.45), mat("#f0b8a8", { roughness: 0.6, side: THREE.DoubleSide, emissive: "#5a2a2a", emissiveIntensity: 0.4 })); lid.position.set(0, 1.45, 0.03); eg.add(lid); this.lids.push(lid); for (let k = 0; k < 9; k++) { const lash = M(new THREE.CylinderGeometry(0.012, 0.004, 0.16, 5), mat("#2b1a26")); lash.position.set(-0.9 + k * 0.225, -0.74, 0.01); lash.rotation.z = (k - 4) * 0.08; lid.add(lash); }
      const ms = new THREE.Shape([new THREE.Vector2(-1.5, -1.3), new THREE.Vector2(1.5, -1.3), new THREE.Vector2(1.5, 2.4), new THREE.Vector2(-1.5, 2.4)]); const hole = new THREE.Path(); hole.absellipse(0, 0, 1.05, 0.7, 0, Math.PI * 2, true, 0); ms.holes.push(hole);
      const mask = M(new THREE.ShapeGeometry(ms, 48), mat("#3a4458", { roughness: 0.6, metalness: 0.3 })); mask.position.z = 0.04; eg.add(mask);
      for (let k = 0; k < 10; k++) { const aa = (k / 10) * Math.PI * 2; put(eg, M(new THREE.SphereGeometry(0.03, 10, 8), copper), [Math.cos(aa) * 1.12, Math.sin(aa) * 0.78, 0.06]); }
    }
    { const sg = new THREE.Group(); put(R, sg, [0, 3.35, -5.0], [0.12, 0, 0]); put(sg, M(rbox(2.3, 1.2, 0.14, 0.04), mat("#22262e", { metalness: 0.5, roughness: 0.35 })), [0, 0, -0.05]);
      put(sg, M(new THREE.PlaneGeometry(2.12, 1.04), new THREE.MeshBasicMaterial({ map: this.screen.tex, toneMapped: false })), [0, 0, 0.03], [0, 0, 0], false);
      for (const s of [-1, 1]) put(sg, M(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 6), mat("#555", { metalness: 0.8 })), [s * 0.9, 1.1, -0.05]);
      const sl = new THREE.PointLight("#ff5a4a", 0, 7, 1.4); sl.position.set(0, 3.0, -4.3); R.add(sl); (this as unknown as { screenLight: THREE.PointLight }).screenLight = sl;
      // marquee bulbs around the board, chasing when the answer lands
      const per: [number, number][] = []; for (let k = 0; k <= 22; k++) { per.push([-1.2 + k * (2.4 / 22), 0.66]); per.push([-1.2 + k * (2.4 / 22), -0.66]); } for (let k = 1; k < 12; k++) { per.push([-1.2, -0.66 + k * (1.32 / 12)]); per.push([1.2, -0.66 + k * (1.32 / 12)]); }
      for (const [x, y] of per) { const bm = glowMat(new THREE.Color(1.2, 0.9, 0.5)); put(sg, M(new THREE.SphereGeometry(0.022, 10, 8), bm), [x, y, 0.03], [0, 0, 0], false); this.bulbs.push(bm); }
      put(sg, M(rbox(2.5, 1.4, 0.08, 0.05), mat("#b08a4a", { metalness: 1, roughness: 0.25 })), [0, 0, -0.1]);
      // the red alarm beacon on top
      put(sg, this.beacon, [0, 0.82, 0]); put(this.beacon, M(new THREE.CylinderGeometry(0.1, 0.12, 0.06, 24), mat("#333", { metalness: 0.8 })), [0, 0, 0]);
      const dome = M(new THREE.SphereGeometry(0.1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: "#ff2a1a", emissive: "#ff2a1a", emissiveIntensity: 0, transparent: true, opacity: 0.85, roughness: 0.1, clearcoat: 1 })); dome.position.y = 0.03; this.beacon.add(dome); (this as unknown as { dome: THREE.Mesh }).dome = dome;
      const bsp = new THREE.SpotLight("#ff3a2a", 0, 9, 0.35, 0.5, 1.2); bsp.position.set(0, 0.1, 0); const bt = new THREE.Object3D(); bt.position.set(3, -1.5, 0); this.beacon.add(bsp, bt); bsp.target = bt; (this as unknown as { beaconSpot: THREE.SpotLight }).beaconSpot = bsp;
      for (const x of [-2.2, 2.2]) { const sp2 = new THREE.SpotLight("#fff0d8", 0, 9, 0.32, 0.4, 1.3); sp2.position.set(x, 2.8, 1.5); sp2.target.position.set(0, 3.35, -5.0); sp2.castShadow = true; sp2.shadow.mapSize.set(1024, 1024); R.add(sp2, sp2.target); this.boardSpots.push(sp2); }
    }
    // ---------- main console ----------
    const cg = new THREE.Group(); put(R, cg, [0, 0, -1.0]);
    const desk = new THREE.Shape(); desk.absarc(0, 0, 3.0, Math.PI * 0.2, Math.PI * 0.8, false); desk.absarc(0, 0, 2.2, Math.PI * 0.8, Math.PI * 0.2, true);
    const dg = new THREE.ExtrudeGeometry(desk, { depth: 1.0, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3, curveSegments: 48 }); dg.rotateX(-Math.PI / 2);
    put(cg, M(dg, mat("#2c3442", { metalness: 0.55, roughness: 0.35 })), [0, 0, 0]);
    const top = new THREE.ExtrudeGeometry(desk, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 48 }); top.rotateX(-Math.PI / 2); top.translate(0, 1.0, 0);
    put(cg, M(top, mat("#4a5568", { metalness: 0.7, roughness: 0.25 })), [0, 0, 0]);
    // buttons, knobs, sliders on the desk arc
    const cols = [new THREE.Color(3, 0.5, 0.4), new THREE.Color(0.4, 2.6, 0.8), new THREE.Color(0.5, 1.2, 3), new THREE.Color(3, 2.2, 0.4), new THREE.Color(2.6, 0.6, 2.4)];
    for (let k = 0; k < 64; k++) { const a = Math.PI * (0.24 + 0.52 * ((k % 16) / 15)), rr = 2.35 + Math.floor(k / 16) * 0.16; const x = Math.cos(a) * rr, z = -Math.sin(a) * rr;
      if ((k * 7) % 5 === 0) { put(cg, M(new THREE.CylinderGeometry(0.035, 0.04, 0.04, 16), mat("#cfd3da", { metalness: 0.9, roughness: 0.3 })), [x, 1.08, z]); continue; }
      const c = cols[k % cols.length].clone(), bm = glowMat(c); const b = M(new THREE.CylinderGeometry(0.03, 0.03, 0.025, 14), bm); b.position.set(x, 1.07, z); cg.add(b); this.blink.push({ m: bm, ph: rnd() * 10, c }); }
    for (let k = 0; k < 6; k++) { const a = Math.PI * (0.3 + k * 0.08), x = Math.cos(a) * 2.9, z = -Math.sin(a) * 2.9; put(cg, M(rbox(0.04, 0.02, 0.22, 0.005), mat("#111")), [x, 1.06, z], [0, -a + Math.PI / 2, 0]); put(cg, M(rbox(0.05, 0.04, 0.04, 0.01), mat("#e8e2d0", { roughness: 0.4 })), [x, 1.09, z + 0.05 * Math.sin(k)], [0, -a + Math.PI / 2, 0]); }
    // mini screens on the console (EKG + brain waves)
    for (const [tex, x] of [[this.ekg, -1.45], [this.waves, 1.45]] as [LiveTex, number][]) { const sgp = new THREE.Group(); put(cg, sgp, [x, 1.28, -2.45], [-0.35, -Math.sign(x) * 0.55, 0]); put(sgp, M(rbox(0.55, 0.34, 0.06, 0.02), mat("#1c2028", { metalness: 0.5 })), [0, 0, -0.03]); put(sgp, M(new THREE.PlaneGeometry(0.5, 0.28), new THREE.MeshBasicMaterial({ map: tex.tex, toneMapped: false })), [0, 0, 0.002], [0, 0, 0], false); }
    // the levers (on the front edge, near the camera side of the arc)
    const mkLever = (g: THREE.Group, x: number, label: string, color: string) => {
      g.position.set(x, 1.04, -3.32); const steel = mat("#d8dce2", { metalness: 0.9, roughness: 0.2 });
      put(R, M(rbox(0.3, 0.06, 0.3, 0.02), mat("#1d2028", { metalness: 0.6 })), [x, 1.06, g.position.z]);
      put(g, M(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 14), steel), [0, 0.15, 0]); put(g, M(new THREE.SphereGeometry(0.085, 24, 16), new THREE.MeshPhysicalMaterial({ color, roughness: 0.2, clearcoat: 1 })), [0, 0.32, 0]); R.add(g);
      const plate = M(new THREE.PlaneGeometry(0.62, 0.2), new THREE.MeshStandardMaterial({ map: canvasTex(320, 104, (c) => { c.fillStyle = "#c9a24a"; c.fillRect(0, 0, 320, 104); c.fillStyle = "#1a1410"; c.fillRect(8, 8, 304, 88); c.fillStyle = "#f2e6c8"; c.font = "bold 58px 'Helvetica Neue', Arial"; c.textAlign = "center"; c.fillText(label, 160, 74); }), metalness: 0.4, roughness: 0.4 }));
      // follow the desk's curved front (inner radius 2.2 around z=-1.0) so no part of the plate sinks into it
      const px = x + Math.sign(x) * 0.12, th = Math.asin(px / 2.2); // nudged outward so the operator on his stool never covers it
      put(R, plate, [2.13 * Math.sin(th), 0.78, -1.0 - 2.13 * Math.cos(th)], [0, -th, 0], false);
    };
    mkLever(this.leverSadar, -0.6, "OTAK", "#3fd06a"); mkLever(this.leverOtot, 0.6, "OTOT", "#e8463a");
    this.lock.position.set(0.6, 1.16, this.leverOtot.position.z + 0.05); put(this.lock, M(rbox(0.16, 0.14, 0.07, 0.02), mat("#d4a93a", { metalness: 1, roughness: 0.25 })), [0, 0, 0]); put(this.lock, M(new THREE.TorusGeometry(0.055, 0.016, 10, 20, Math.PI), mat("#c9ccd2", { metalness: 1, roughness: 0.2 })), [0, 0.07, 0]); R.add(this.lock);
    for (let k = 0; k < 7; k++) put(R, M(new THREE.TorusGeometry(0.035, 0.01, 8, 16), mat("#9aa0a8", { metalness: 1, roughness: 0.3 })), [0.6 + (k - 3) * 0.05, 1.26 - Math.abs(k - 3) * 0.025, this.leverOtot.position.z + 0.02], [0, k % 2 ? Math.PI / 2 : 0, 0]);
    // coffee mug + steam, sticky notes, swivel chair
    put(cg, M(new THREE.CylinderGeometry(0.06, 0.055, 0.12, 24), mat("#f2efe8", { roughness: 0.3 })), [1.1, 1.1, -2.55]); put(cg, M(new THREE.TorusGeometry(0.035, 0.01, 8, 16), mat("#f2efe8", { roughness: 0.3 })), [1.17, 1.1, -2.55], [0, 0, Math.PI / 2]); put(cg, M(new THREE.CircleGeometry(0.052, 20), mat("#3a2014", { roughness: 0.1 })), [1.1, 1.155, -2.55], [-Math.PI / 2, 0, 0], false);
    { const n = 40, p = new Float32Array(n * 3); for (let k = 0; k < n; k++) p.set([1.1, 1.18, -3.55], k * 3); const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(p, 3)); this.steam = new THREE.Points(sg, new THREE.PointsMaterial({ color: "#ffffff", size: 0.03, transparent: true, opacity: 0.25, depthWrite: false })); R.add(this.steam); }
    { const ch = new THREE.Group(); put(R, ch, [-1.6, 0, -0.6], [0, 0.6, 0]); put(ch, M(rbox(0.5, 0.1, 0.48, 0.04), mat("#2a2a32", { roughness: 0.6 })), [0, 0.5, 0]); put(ch, M(rbox(0.48, 0.55, 0.08, 0.04), mat("#2a2a32", { roughness: 0.6 })), [0, 0.82, -0.22], [-0.1, 0, 0]); put(ch, M(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 10), mat("#888", { metalness: 0.9 })), [0, 0.25, 0]); for (let k = 0; k < 5; k++) put(ch, M(new THREE.BoxGeometry(0.3, 0.03, 0.04), mat("#888", { metalness: 0.9 })), [Math.cos(k * 1.26) * 0.15, 0.05, Math.sin(k * 1.26) * 0.15], [0, -k * 1.26, 0]); }
    // ---------- left wall: PEMICU terminal, tiny dusty science drawer ----------
    { const mg = new THREE.Group(); put(R, mg, [-4.2, 1.85, -2.9], [0, 0.95, 0]); put(mg, M(rbox(1.36, 1.86, 0.16, 0.05), mat("#22262e", { metalness: 0.5, roughness: 0.35 })), [0, 0, -0.06]); const ml = new THREE.PointLight("#7dffc4", 2.5, 4, 1.6); ml.position.set(0, 0, 0.6); mg.add(ml); put(mg, M(new THREE.PlaneGeometry(1.24, 1.72), new THREE.MeshBasicMaterial({ map: this.monitor.tex, toneMapped: false })), [0, 0, 0.025], [0, 0, 0], false); }
    { const dw = new THREE.Group(); put(R, dw, [-4.9, 0.9, 1.6], [0, 1.9, 0]); const wd = std(woodPlanks("#6a5040", 3, "sci"), [1, 1]); put(dw, M(rbox(0.5, 0.36, 0.4, 0.02), wd), [0, 0, 0]); put(dw, M(rbox(0.12, 0.03, 0.03, 0.01), mat("#888", { metalness: 0.9 })), [0, 0, 0.21]);
      put(dw, M(new THREE.PlaneGeometry(0.46, 0.12), new THREE.MeshStandardMaterial({ map: canvasTex(400, 100, (c) => { c.fillStyle = "#f0ead8"; c.fillRect(0, 0, 400, 100); c.fillStyle = "#333"; c.font = "bold 34px sans-serif"; c.textAlign = "center"; c.fillText("PENJELASAN ILMIAH", 200, 62); }) })), [0, 0.11, 0.205], [0, 0, 0], false);
      for (let k = 0; k < 8; k++) put(dw, M(new THREE.CylinderGeometry(0.002, 0.002, 0.3, 3), mat("#ddd", { transparent: true, opacity: 0.5 })), [-0.2 + k * 0.05, 0.2, 0.15], [0.4, 0, 0.6 - k * 0.15], false);
      put(dw, M(new THREE.BoxGeometry(0.52, 0.012, 0.42), mat("#9a9690", { roughness: 1 })), [0, 0.186, 0]); }
    // ---------- test stage: pedestals with clamp stands, crane rail ----------
    const pedM = mat("#3c4658", { metalness: 0.6, roughness: 0.3 }), clampM = mat("#b8bec8", { metalness: 1, roughness: 0.25 });
    for (const p of [this.stageL, this.stageR]) { const st = new THREE.Group(); put(R, st, p); put(st, M(new THREE.CylinderGeometry(0.32, 0.38, 0.12, 32), pedM), [0, 0.06, 0]); put(st, M(new THREE.CylinderGeometry(0.035, 0.035, 0.95, 12), clampM), [0, 0.6, 0]); put(st, M(rbox(0.5, 0.06, 0.1, 0.02), clampM), [0, 1.04, 0]);
      put(st, M(rbox(0.46, 0.05, 0.05, 0.015), mat("#222", { metalness: 0.7, roughness: 0.3 })), [0, 1.085, 0.04]); put(st, M(rbox(0.46, 0.05, 0.05, 0.015), mat("#222", { metalness: 0.7, roughness: 0.3 })), [0, 1.085, -0.04]);
      const ring = M(new THREE.TorusGeometry(0.34, 0.012, 8, 48), glowMat(new THREE.Color(0.4, 1.4, 2.6))); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.125; st.add(ring); }
    const rail = M(rbox(3.2, 0.12, 0.16, 0.02), mat("#4a4f58", { metalness: 0.8, roughness: 0.3 })); put(R, rail, [0, 4.0, 0.35]);
    put(R, this.crane, [0, 3.88, 0.35]); put(this.crane, M(rbox(0.4, 0.22, 0.3, 0.04), mat("#e0a020", { metalness: 0.4, roughness: 0.4 })), [0, 0, 0]);
    for (let k = 0; k < 2; k++) put(this.crane, M(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 16), mat("#222")), [0, -0.12, k ? 0.1 : -0.1], [0, 0, Math.PI / 2]);
    this.cable = M(new THREE.CylinderGeometry(0.008, 0.008, 1, 6), mat("#222", { metalness: 0.6 })); this.cable.geometry.translate(0, -0.5, 0); this.crane.add(this.cable);
    R.add(this.scissors.g);
    // paper: the JIN sheet as two halves (cut line in the middle), the 4-sheet stack, a dust cover for later
    const sheetT = (title: string, icon: (g: CanvasRenderingContext2D) => void) => canvasTex(300, 400, (g) => drawSheet(g, 300, 400, title, icon));
    const jinIcon = (g: CanvasRenderingContext2D) => { g.fillStyle = "#1a1622"; g.beginPath(); g.ellipse(0, -10, 55, 90, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#fff"; for (const x of [-20, 20]) { g.beginPath(); g.arc(x, -40, 11, 0, Math.PI * 2); g.fill(); } };
    const jt = sheetT("KETINDIHAN", jinIcon), half = (u0: number) => { const t = jt.clone(); t.repeat.set(0.5, 1); t.offset.set(u0, 0); t.needsUpdate = true; return t; };
    const pm = (t: THREE.Texture) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, side: THREE.DoubleSide });
    const part = (v0: number) => { const t = jt.clone(); t.repeat.set(1, 0.5); t.offset.set(0, v0); t.needsUpdate = true; return t; };
    const bg = new THREE.PlaneGeometry(0.42, 0.2); bg.translate(0, 0.1, 0); this.jinL = M(bg, pm(part(0))); const tg = new THREE.PlaneGeometry(0.42, 0.2); tg.translate(0, 0.1, 0); this.jinR = M(tg, pm(part(0.5)));
    for (const m of [this.jinL, this.jinR]) { m.castShadow = true; R.add(m); } void half;
    void plaster; void fbm;
    (this as unknown as { sheetT: typeof sheetT }).sheetT = sheetT;
    (this as unknown as { stackIcons: [string, (g: CanvasRenderingContext2D) => void][] }).stackIcons = [
      ["SLEEP PARALYSIS", (g) => { g.fillStyle = "#e8e2d4"; g.fillRect(-100, 20, 200, 36); g.fillStyle = "#fff"; g.beginPath(); g.arc(-62, 8, 26, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#2b1a26"; g.lineWidth = 6; g.stroke(); g.fillStyle = "#2b1a26"; g.beginPath(); g.arc(-70, 4, 4, 0, 7); g.arc(-54, 4, 4, 0, 7); g.fill(); g.fillStyle = "#4a6ab0"; g.fillRect(-30, 4, 120, 24); g.font = "bold 40px sans-serif"; g.fillStyle = "#4a6ab0"; g.fillText("Z z", 40, -40); }],
      ["KURANG TIDUR", (g) => { g.fillStyle = "#e8e2d4"; g.fillRect(-80, -20, 160, 50); g.strokeStyle = "#2b1a26"; g.lineWidth = 6; g.strokeRect(-80, -20, 160, 50); g.beginPath(); g.arc(40, -60, 32, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); g.stroke(); g.beginPath(); g.moveTo(40, -60); g.lineTo(40, -80); g.moveTo(40, -60); g.lineTo(55, -60); g.stroke(); }],
      ["STRES", (g) => { g.fillStyle = "#6b7280"; g.beginPath(); g.ellipse(0, -30, 80, 45, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#ffd84a"; g.beginPath(); g.moveTo(-10, 0); g.lineTo(15, 0); g.lineTo(-5, 40); g.lineTo(20, 40); g.lineTo(-20, 90); g.lineTo(0, 50); g.lineTo(-25, 50); g.closePath(); g.fill(); }],
      ["TELENTANG__SKIP", (g) => { g.fillStyle = "#e8e2d4"; g.fillRect(-100, 10, 200, 40); g.fillStyle = "#fff"; g.beginPath(); g.arc(-60, -5, 28, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#2b1a26"; g.lineWidth = 6; g.stroke(); g.fillStyle = "#b8423c"; g.fillRect(-30, -10, 120, 25); }],
      ["JADWAL KACAU", (g) => { g.fillStyle = "#fff"; g.fillRect(-70, -80, 140, 130); g.strokeStyle = "#2b1a26"; g.lineWidth = 6; g.strokeRect(-70, -80, 140, 130); g.fillStyle = "#b8312c"; g.fillRect(-70, -80, 140, 30); g.strokeStyle = "#d61e28"; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-60 + i * 25, -40); g.lineTo(-45 + i * 22, 30); g.stroke(); } }],
    ];
    // crane joystick box for the operator, a dust sheet for the forgotten stack
    { const jb = new THREE.Group(); put(R, jb, [-1.75, 0, 0.9], [0, 0.5, 0]); put(jb, M(rbox(0.45, 0.7, 0.35, 0.03), mat("#e0a020", { metalness: 0.3, roughness: 0.45 })), [0, 0.35, 0]); put(jb, M(rbox(0.4, 0.04, 0.3, 0.01), mat("#222", { metalness: 0.5 })), [0, 0.71, 0]);
      put(jb, M(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 8), mat("#888", { metalness: 0.9 })), [0, 0.82, 0]); put(jb, M(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshPhysicalMaterial({ color: "#d4302c", clearcoat: 1, roughness: 0.2 })), [0, 0.93, 0]);
      for (let k = 0; k < 3; k++) { const bm = glowMat(new THREE.Color(...([[3, 0.5, 0.4], [0.4, 2.6, 0.8], [3, 2.2, 0.4]][k] as V3))); const b = M(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 12), bm); b.position.set(-0.12 + k * 0.12, 0.73, 0.1); jb.add(b); } }
    this.dustCover = M(new THREE.PlaneGeometry(0.46, 0.44), new THREE.MeshStandardMaterial({ transparent: true, opacity: 0, roughness: 1, map: canvasTex(256, 256, (g) => { for (let k = 0; k < 2500; k++) { g.fillStyle = `rgba(150,140,125,${0.2 + rnd() * 0.4})`; g.fillRect(rnd() * 256, rnd() * 256, 2 + rnd() * 3, 2 + rnd() * 3); } g.strokeStyle = "rgba(230,230,230,0.6)"; g.lineWidth = 1.5; for (let r = 20; r < 120; r += 18) { g.beginPath(); g.arc(230, 20, r, Math.PI * 0.5, Math.PI); g.stroke(); } for (let k = 0; k < 7; k++) { g.beginPath(); g.moveTo(230, 20); g.lineTo(230 - Math.cos(k * 0.25) * 130, 20 + Math.sin(k * 0.25) * 130); g.stroke(); } }) }));
    this.dustCover.position.set(this.stageR[0], 1.29, this.stageR[2] + 0.04); R.add(this.dustCover);
    // ---------- memory shelf (CERITA MISTIS): glowing orbs, one is the live "Budi watching horror" orb ----------
    { const sh = new THREE.Group(); put(R, sh, [3.9, 0, 1.4], [0, -Math.PI / 2 + 0.55, 0]); const wd = std(woodPlanks("#5a3d26", 3, "msh"), [1, 2], { roughness: 0.5 });
      put(sh, M(rbox(2.8, 3.2, 0.5, 0.03), wd), [0, 1.6, -0.25]);
      for (let r = 0; r < 6; r++) put(sh, M(rbox(2.7, 0.05, 0.5, 0.01), wd), [0, 0.25 + r * 0.52, 0.02]);
      put(sh, M(rbox(1.9, 0.34, 0.06, 0.03), mat("#2b1a12", { roughness: 0.5 })), [0, 3.38, 0.05]);
      put(sh, M(new THREE.PlaneGeometry(1.8, 0.28), new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, map: canvasTex(720, 112, (c) => { c.fillStyle = "#ffcf6a"; c.font = "bold 78px 'Helvetica Neue', Arial"; c.textAlign = "center"; c.shadowColor = "#ff8a2a"; c.shadowBlur = 18; c.fillText("CERITA MISTIS", 360, 84); }) })), [0, 3.38, 0.085], [0, 0, 0], false);
      const glassO = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false });
      let k = 0; for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) { const x = -1.2 + c * 0.3 + (r % 2) * 0.05, y = 0.42 + r * 0.52;
        const tex = new LiveTex(256, 256); const kind = (k * 5 + r) % 6; tex.draw("o", (g) => orbScene(g, kind)); const hue = [new THREE.Color(1.6, 0.6, 2.2), new THREE.Color(2.2, 1.1, 0.4), new THREE.Color(0.6, 1.2, 2.4), new THREE.Color(2.2, 0.5, 0.5)][k % 4];
        const core = M(new THREE.CircleGeometry(0.1, 32), new THREE.MeshBasicMaterial({ map: tex.tex, color: hue.clone().multiplyScalar(0.3).addScalar(0.55), toneMapped: false })); core.position.z = 0.105; const glowB = M(new THREE.SphereGeometry(0.1, 24, 16), new THREE.MeshBasicMaterial({ color: hue.clone().multiplyScalar(0.85), toneMapped: false })); const shell = M(new THREE.SphereGeometry(0.13, 24, 16), glassO);
        const orb = new THREE.Group(); orb.add(glowB, core, shell); put(sh, orb, [x, y + 0.13, 0.05], [0, 0, 0], false); this.orbs.push({ m: core, home: orb.position.clone() });
        if (r === 2 && c === 4) { this.hero = { tex, m: core }; orb.scale.setScalar(1.35); core.visible = false; glowB.visible = false; this.heroOrb = orb;
          // a tiny real room inside: floor, rug, sofa, a TV showing a ghost (it lights the room blue), a lamp
          const d = new THREE.Group(); orb.add(d); const wd = mat("#6a4a30", { roughness: 0.5 });
          put(d, M(new THREE.CylinderGeometry(0.105, 0.105, 0.006, 32), std(woodPlanks("#7a5232", 8, "dio"), [1, 1])), [0, -0.075, 0]);
          put(d, M(new THREE.CircleGeometry(0.05, 24), mat("#8a3a2a", { roughness: 1 })), [0, -0.0715, 0.01], [-Math.PI / 2, 0, 0]);
          put(d, M(rbox(0.1, 0.022, 0.04, 0.006), mat("#4a6a3a", { roughness: 0.9 })), [-0.02, -0.06, 0.035]); put(d, M(rbox(0.1, 0.035, 0.012, 0.005), mat("#4a6a3a", { roughness: 0.9 })), [-0.02, -0.045, 0.054]); for (const sx of [-0.072, 0.032]) put(d, M(rbox(0.012, 0.03, 0.04, 0.004), mat("#4a6a3a", { roughness: 0.9 })), [sx, -0.055, 0.035]);
          put(d, M(rbox(0.07, 0.025, 0.03, 0.004), wd), [0.0, -0.06, -0.055]); put(d, M(rbox(0.06, 0.042, 0.03, 0.006), mat("#222", { roughness: 0.4 })), [0.0, -0.025, -0.055]);
          this.heroTv = new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(128, 96, (g) => { g.fillStyle = "#9ab8ff"; g.fillRect(0, 0, 128, 96); g.fillStyle = "#101018"; g.beginPath(); g.ellipse(64, 60, 14, 30, 0, 0, 6.3); g.fill(); g.fillStyle = "#fff"; g.fillRect(56, 44, 5, 6); g.fillRect(67, 44, 5, 6); }) });
          put(d, M(new THREE.PlaneGeometry(0.05, 0.033), this.heroTv), [0.0, -0.025, -0.0395], [0, 0, 0], false);
          const tvL = new THREE.PointLight("#8ab0ff", 0.25, 0.3, 2); tvL.position.set(0, -0.02, -0.02); d.add(tvL); const lampL = new THREE.PointLight("#ffc890", 0.5, 0.35, 2); lampL.position.set(-0.07, 0.03, 0.02); d.add(lampL); put(d, M(new THREE.CylinderGeometry(0.004, 0.006, 0.06, 8), mat("#c9b48a", { metalness: 0.6 })), [-0.075, -0.045, -0.02]); put(d, M(new THREE.ConeGeometry(0.014, 0.016, 16, 1, true), new THREE.MeshStandardMaterial({ color: "#fff2d8", emissive: "#ffb46a", emissiveIntensity: 1.2, side: THREE.DoubleSide })), [-0.075, -0.012, -0.02]); (this as unknown as { tvL: THREE.PointLight }).tvL = tvL;
          d.rotation.y = Math.PI / 2; }
        k++; }
      const shelfLight = new THREE.PointLight("#c89aff", 3.5, 4, 1.6); shelfLight.position.set(0, 1.8, 1.0); sh.add(shelfLight);
    }
    // ---------- light ----------
    const key = new THREE.DirectionalLight("#ffe2c0", 1.0); this.lights.key = key; key.position.set(3, 7, 5); key.target.position.set(0, 1, 0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 20 }); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
    this.sunDir.copy(key.position).sub(key.target.position).normalize(); const hemi = new THREE.HemisphereLight("#8aa0d8", "#2a2030", 0.45); this.lights.hemi = hemi; R.add(key, key.target, hemi);
    const warm = new THREE.PointLight("#ff9a4a", 6, 6, 1.5); warm.position.set(0, 1.5, -2.6); warm.castShadow = true; warm.shadow.mapSize.set(1024, 1024); warm.shadow.bias = -0.002; R.add(warm); this.lights.warm = warm;
    const cool = new THREE.PointLight("#5aa8ff", 4, 7, 1.5); cool.position.set(-3.6, 2.2, -2.2); R.add(cool); this.lights.cool = cool;
    for (const x of [-1.25, 1.25]) { const el = new THREE.PointLight("#8aa8ff", 2, 5, 1.6); el.position.set(x, 2.15, -5.1); R.add(el); this.eyeLights.push(el); }
    const rim = new THREE.PointLight("#7ab8ff", 3.0, 6, 1.5); rim.position.set(0, 2.6, -1.4); R.add(rim);
    for (const [x, z] of [[-0.75, 0.35], [0.75, 0.35]] as [number, number][]) { const sp = new THREE.SpotLight("#ffd8a0", 40, 6, 0.45, 0.5, 1.4); sp.position.set(x, 4.3, z + 0.4); sp.target.position.set(x, 1, z); sp.castShadow = true; sp.shadow.mapSize.set(1024, 1024); sp.shadow.bias = -0.0006; R.add(sp, sp.target);
      const lampG = new THREE.Group(); put(R, lampG, [x, 4.35, z + 0.4]); put(lampG, M(new THREE.ConeGeometry(0.2, 0.2, 24, 1, true), mat("#2a2a30", { metalness: 0.7, side: THREE.DoubleSide })), [0, 0, 0]); put(lampG, M(new THREE.SphereGeometry(0.06, 12, 8), glowMat(new THREE.Color(4, 3.2, 2))), [0, -0.06, 0], [0, 0, 0], false);
      }
    this.setMonitor(0, 0); this.setScreen("", 1, 0); this.setEyes("night", 0);
  }
  setStack(n: number, drop: number[]) { // n sheets in the right clamp, drop[i] = 0..1 fall-in progress
    const st = this as unknown as { sheetT: (t: string, i: (g: CanvasRenderingContext2D) => void) => THREE.Texture; stackIcons: [string, (g: CanvasRenderingContext2D) => void][] };
    const order = ["KURANG TIDUR", "STRES", "JADWAL KACAU", "SLEEP PARALYSIS"]; while (this.stack.length < 4) { const [t, ic] = st.stackIcons.find((q) => q[0] === order[this.stack.length])!; const m = M(new THREE.BoxGeometry(0.42, 0.4, 0.012), [0, 1, 2, 3, 4, 5].map((f) => new THREE.MeshStandardMaterial(f === 4 ? { map: st.sheetT(t, ic), roughness: 0.85 } : { color: "#f2ead8", roughness: 0.9 }))); m.geometry.translate(0, 0.2, 0); m.castShadow = true; this.root.add(m); this.stack.push(m); }
    this.stack.forEach((m, i) => { const d = drop[i] ?? 0; m.visible = i < n && d > 0; m.position.set(this.stageR[0] - 0.045 * (3 - i) + 0.07, 1.07 + 0.012 * (3 - i) + 0.9 * (1 - d) * (1 - d), this.stageR[2] - 0.045 + i * 0.03); m.rotation.set(0, 0, 0.35 * (1 - d) - 0.025 * (3 - i)); });
  }
  setMonitor(n: number, t: number, status = false) { this.monitor.draw("m" + n + (status ? "s" : "") + Math.floor(t * 4), (g, w, h) => {
    g.fillStyle = "#06141a"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 4) { g.fillStyle = "rgba(80,255,190,0.05)"; g.fillRect(0, y, w, 1); }
    let y0 = 70; g.textAlign = "left";
    if (status) {
      g.fillStyle = "#7dffc4"; g.font = "bold 40px 'Courier New', monospace"; g.fillText("> STATUS TUBUH", 26, y0); y0 += 70;
      g.fillStyle = "#3aff8a"; g.font = "bold 44px 'Courier New', monospace"; g.fillText("OTAK  : BANGUN", 40, y0); y0 += 62;
      g.fillStyle = Math.floor(t * 4) % 2 ? "#ff4a3a" : "#7a1a14"; g.fillText("OTOT  : TERKUNCI", 40, y0); g.font = "bold 28px 'Courier New', monospace"; g.fillStyle = "#ff8a7a"; g.fillText("(mode mimpi)", 40, y0 + 36); y0 += 100;
    }
    g.fillStyle = "#7dffc4"; g.font = "bold 40px 'Courier New', monospace"; g.fillText("> PEMICU:", 26, y0); y0 += 70;
    const lab = ["KURANG TIDUR", "STRES", "TELENTANG"]; for (let i = 0; i < Math.min(3, n); i++) { g.fillStyle = "rgba(255,211,106,0.22)"; g.fillRect(26, y0 - 44 + i * 70, w - 52, 58); g.fillStyle = "#ffd36a"; g.font = "bold 42px 'Courier New', monospace"; g.fillText("[!] " + lab[i], 36, y0 + i * 70); }
    if (Math.floor(t * 2) % 2) { g.fillStyle = "#7dffc4"; g.fillRect(28, h - 60, 24, 38); }
    const vg = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.75); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.55)"); g.fillStyle = vg; g.fillRect(0, 0, w, h);
  }); }
  /** sleep-paralysis alarm: red light pulses through the room, the beacon spins, the room light drops */
  setAlarm(k: number, t: number) {
    const self = this as unknown as { beaconSpot: THREE.SpotLight; dome: THREE.Mesh; alarmL?: THREE.PointLight };
    if (!self.alarmL) { self.alarmL = new THREE.PointLight("#ff2a1a", 0, 12, 1.2); self.alarmL.position.set(0, 3.3, -1.5); this.root.add(self.alarmL); }
    const pulse = 0.5 + 0.5 * Math.sin(t * 9); self.alarmL.intensity = 18 * k * pulse; this.beacon.rotation.y = t * 7; self.beaconSpot.intensity = 45 * k; (self.dome.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 3 * k * (0.5 + 0.5 * pulse);
    const base: Record<string, number> = { key: 1.0, hemi: 0.45, warm: 6, cool: 4 }; for (const n2 in base) this.lights[n2].intensity = base[n2] * (1 - 0.45 * k);
  }
  /** frantic button mashing: random buttons flare */
  pressButtons(t: number) { if (t < 0) return; const f = Math.floor(t * 14); this.blink.forEach((b, i) => { const hot = ((i * 7 + f * 13) % 9) === 0; if (hot) b.m.color.copy(b.c).multiplyScalar(2.2); }); }
  setScreen(text: string, blink: number, t: number) { this.screen.draw("s" + text + blink.toFixed(2) + Math.floor(t * 6), (g, w, h) => {
    g.fillStyle = "#0b1020"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 4) { g.fillStyle = "rgba(120,160,255,0.05)"; g.fillRect(0, y, w, 1); }
    const sy = (t * 140) % h; g.fillStyle = "rgba(160,200,255,0.06)"; g.fillRect(0, sy, w, 30);
    g.fillStyle = "#6fa8ff"; g.font = "bold 70px 'Helvetica Neue', Arial"; g.textAlign = "center"; g.fillText("JAWABAN:", w / 2, 110);
    if (text) {
      const gl = Math.floor(t * 12) % 7 === 0 ? 8 : 0, cy = 360;
      g.save(); g.globalAlpha = 0.35 * blink; const rg = g.createRadialGradient(w / 2, cy - 70, 20, w / 2, cy - 70, 420); rg.addColorStop(0, "#ff4a2a"); rg.addColorStop(1, "rgba(255,40,20,0)"); g.fillStyle = rg; g.fillRect(0, 0, w, h); g.restore();
      for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2 + t * 0.6; g.strokeStyle = `rgba(255,120,80,${0.12 * blink})`; g.lineWidth = 18; g.beginPath(); g.moveTo(w / 2, cy - 80); g.lineTo(w / 2 + Math.cos(a) * 700, cy - 80 + Math.sin(a) * 700); g.stroke(); }
      g.globalAlpha = blink; let fz = 250; g.font = `900 ${fz}px 'Helvetica Neue', Arial Black, Arial`; while (g.measureText(text).width > w * 0.88 && fz > 60) { fz -= 6; g.font = `900 ${fz}px 'Helvetica Neue', Arial Black, Arial`; } g.lineJoin = "round";
      g.shadowColor = "#ff2a1a"; g.shadowBlur = 60; g.lineWidth = 26; g.strokeStyle = "#5a0806"; g.strokeText(text, w / 2 + gl, cy);
      const tg = g.createLinearGradient(0, cy - 200, 0, cy); tg.addColorStop(0, "#fff0d0"); tg.addColorStop(0.35, "#ff8a5a"); tg.addColorStop(0.6, "#ff2a1a"); tg.addColorStop(1, "#8a0a08"); g.fillStyle = tg; g.fillText(text, w / 2 + gl, cy);
      g.shadowBlur = 0; g.lineWidth = 6; g.strokeStyle = "rgba(255,240,220,0.9)"; g.strokeText(text, w / 2 + gl, cy);
      if (gl) { g.fillStyle = "rgba(120,220,255,0.35)"; g.fillRect(0, cy - 120, w, 14); }
      for (let k = 0; k < 10; k++) { const sx = (k * 97 + t * 160) % w, sy2 = 150 + ((k * 53) % 300); g.fillStyle = `rgba(255,230,190,${0.6 * blink})`; g.beginPath(); g.moveTo(sx, sy2 - 10); g.lineTo(sx + 3, sy2); g.lineTo(sx, sy2 + 10); g.lineTo(sx - 3, sy2); g.fill(); }
      g.globalAlpha = 1; }
    else { g.fillStyle = "#3a4a70"; g.font = "60px 'Courier New', monospace"; g.fillText(Math.floor(t * 3) % 2 ? "_" : "", w / 2, 330); }
    const sl = (this as unknown as { screenLight?: THREE.PointLight }).screenLight; if (sl) sl.intensity = text ? 8 * blink : 0;
  }); }
  /** what Budi sees through the eye windows: "night" (dark bedroom ceiling) or "teras" (warm morning) */
  setEyes(view0: "night" | "teras" | "split", t: number) { this.eyeLights.forEach((el, i) => { const v = view0 === "split" ? (i ? "dream" : "night") : view0; el.color.set(v === "night" ? "#8aa8ff" : v === "dream" ? "#ffb0f0" : "#ffd8a0"); el.intensity = v === "night" ? 2 : 3.5; });
    for (const [k, tex] of [[0, this.eyeL], [1, this.eyeR]] as [number, LiveTex][]) { const view = view0 === "split" ? (k ? "dream" : "night") : view0; tex.draw(view + k + Math.floor(t * (view === "dream" ? 8 : 2)), (g, w, h) => {
    if (view === "dream") { // still dreaming: pastel sky, soft clouds, floating stars and a flying fish
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#f6b8e8"); gr.addColorStop(0.5, "#b8c8ff"); gr.addColorStop(1, "#ffe0b0"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let c = 0; c < 7; c++) { const x = ((c * 97 + t * 30) % (w + 200)) - 100, y = 60 + (c * 53) % (h - 120); g.fillStyle = "rgba(255,255,255,0.85)"; for (let q = 0; q < 4; q++) { g.beginPath(); g.arc(x + q * 26, y + Math.sin(q) * 8, 26 - q * 2, 0, 6.3); g.fill(); } }
      for (let c = 0; c < 6; c++) { const sx = (c * 83 + 40) % w, sy = (c * 61 + 30 + Math.sin(t * 2 + c) * 14) % h; g.fillStyle = "#fff6a0"; g.beginPath(); for (let q = 0; q < 10; q++) { const a = (q / 10) * Math.PI * 2, rr = q % 2 ? 7 : 16; g.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); } g.fill(); }
      const fx = (t * 60) % (w + 120) - 60, fy = h * 0.45 + Math.sin(t * 3) * 20; g.fillStyle = "#ff8a5a"; g.beginPath(); g.ellipse(fx, fy, 46, 22, 0, 0, 6.3); g.fill(); g.beginPath(); g.moveTo(fx - 40, fy); g.lineTo(fx - 72, fy - 22); g.lineTo(fx - 72, fy + 22); g.fill(); g.fillStyle = "#222"; g.beginPath(); g.arc(fx + 26, fy - 4, 4, 0, 6.3); g.fill(); }
    else if (view === "night") { // what he sees at 3 a.m.: the dark room, his blanket, the figure at the foot of the bed
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#56689c"); gr.addColorStop(1, "#7a6070"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = "#9a7050"; for (let x = -40 + k * 30; x < w; x += 60) { g.fillRect(x, 0, 5, h * 0.75); }
      g.fillStyle = "rgba(190,205,255,0.28)"; g.beginPath(); g.moveTo(w * 0.05, h * 0.2); g.lineTo(w * 0.3, h * 0.1); g.lineTo(w * 0.45, h); g.lineTo(w * 0.1, h); g.fill();
      const fx = w * (0.56 - k * 0.12); g.fillStyle = "#07070d"; g.beginPath(); g.moveTo(fx - 60, h); g.bezierCurveTo(fx - 70, h * 0.55, fx - 45, h * 0.25, fx, h * 0.2); g.bezierCurveTo(fx + 45, h * 0.25, fx + 70, h * 0.55, fx + 60, h); g.fill();
      g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(fx - 16, h * 0.33, 8, 10, 0, 0, 6.3); g.ellipse(fx + 16, h * 0.33, 8, 10, 0, 0, 6.3); g.fill();
      g.fillStyle = "#d8404a"; g.beginPath(); g.moveTo(0, h); g.quadraticCurveTo(w / 2, h * 0.68, w, h); g.fill(); g.strokeStyle = "rgba(240,214,170,0.6)"; g.lineWidth = 6; for (let x = 20; x < w; x += 70) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + (x - w / 2) * 0.1, h * 0.8); g.stroke(); } }
    else { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#9ccaf0"); gr.addColorStop(0.55, "#f2d8a8"); gr.addColorStop(1, "#c89a6a"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = "#8a5a34"; g.fillRect(0, h * 0.5, w, h * 0.12); g.fillStyle = "#fbf9f6"; g.beginPath(); g.arc(w * (0.62 - k * 0.12), h * 0.48, h * 0.2, 0, 6.3); g.fill(); g.fillStyle = "#231816"; g.beginPath(); g.arc(w * (0.62 - k * 0.12), h * 0.34, h * 0.07, 0, 6.3); g.fill(); g.fillStyle = "#2f6f78"; g.fillRect(w * (0.62 - k * 0.12) - h * 0.17, h * 0.66, h * 0.34, h * 0.4); }
    const vg = g.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, w * 0.6); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.55)"); g.fillStyle = vg; g.fillRect(0, 0, w, h);
  }); } }
  /** focus on the answer board: room dims, spots + beacon + chasing bulbs come on (0..1) */
  setFocus(k: number, t: number) {
    const base: Record<string, number> = { key: 1.0, hemi: 0.45, warm: 6, cool: 4 }; for (const n in base) this.lights[n].intensity = base[n] * (1 - 0.65 * k);
    for (const s2 of this.boardSpots) s2.intensity = 35 * k; this.beacon.rotation.y = t * 6;
    const self = this as unknown as { beaconSpot: THREE.SpotLight; dome: THREE.Mesh }; self.beaconSpot.intensity = 40 * k; (self.dome.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 2.5 * k;
    this.bulbs.forEach((b, i) => { const on = k > 0 ? ((i + Math.floor(t * 10)) % 3 === 0 ? 1 : 0.25) : 0.12; b.color.setRGB(3.2 * on, 2.4 * on, 1.2 * on); });
  }
  setLids(close: number) { for (const l of this.lids) l.position.y = 1.45 * (1 - close); }
  update(t: number) {
    for (const b of this.blink) { const on = Math.sin(t * (1.5 + (b.ph % 3)) + b.ph) > -0.4; b.m.color.copy(b.c).multiplyScalar(on ? 1 : 0.15); }
    this.ekg.draw("e" + Math.floor(t * 15), (g, w, h) => { g.fillStyle = "#04140c"; g.fillRect(0, 0, w, h); g.strokeStyle = "#3aff8a"; g.lineWidth = 3; g.beginPath(); for (let x = 0; x < w; x++) { const u = ((x / w) * 2 + t * 1.2) % 1, y = u > 0.45 && u < 0.5 ? h * 0.2 : u > 0.5 && u < 0.55 ? h * 0.85 : h * 0.55 + 4 * Math.sin(x * 0.2); x === 0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); });
    this.waves.draw("w" + Math.floor(t * 15), (g, w, h) => { g.fillStyle = "#0a0a1c"; g.fillRect(0, 0, w, h); for (const [c, f, a] of [["#ff7ad8", 0.06, 22], ["#7ad8ff", 0.11, 14]] as [string, number, number][]) { g.strokeStyle = c; g.lineWidth = 3; g.beginPath(); for (let x = 0; x < w; x++) { const y = h / 2 + a * Math.sin(x * f + t * 5) * Math.sin(x * 0.013 + t); x === 0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); } });
    const pa = this.steam.geometry.attributes.position as THREE.BufferAttribute; for (let k = 0; k < pa.count; k++) { const u = ((t * 0.4 + k / pa.count) % 1); pa.setXYZ(k, 1.1 + 0.03 * Math.sin(u * 9 + k), 1.18 + u * 0.35, -3.55 + 0.02 * Math.cos(u * 7 + k)); } pa.needsUpdate = true;
    const tl = (this as unknown as { tvL?: THREE.PointLight }).tvL; if (tl && this.heroTv) { const fl = 0.7 + 0.3 * Math.sin(t * 23) * Math.sin(t * 7.1); tl.intensity = 0.6 * fl; this.heroTv.color.setScalar(0.7 + 0.5 * fl); }
  }
}

