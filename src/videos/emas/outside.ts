// Outdoor sets: the pastel dream above the clouds (house, car, scooter, a proposal) and the T-junction at the end
// (police station on the left, the jewellery shop on the right, the housing estate road in between). No text anywhere.
import * as THREE from "three";
import { canvasTex } from "../ketindihan2/sets";
import { rnd, seedRnd } from "../../lib/world2/textures";
import { scooter } from "../kopi/kota";
import { mat, M, rb, dreamCar, dreamHouse, ringBox, cloud3D } from "./props";
import { CoinRig } from "./rooms";

type V3 = [number, number, number];
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const B = (w: number, h: number, d: number, m: THREE.Material | THREE.Material[], p: V3, r: V3 = [0, 0, 0]) => M(new THREE.BoxGeometry(w, h, d), m, p, r);
const cyl = (r1: number, r2: number, h: number, m: THREE.Material, p: V3, r: V3 = [0, 0, 0], seg = 20) => M(new THREE.CylinderGeometry(r1, r2, h, seg), m, p, r);
const skyDome = (stops: [number, string][], r = 120) => { const t = canvasTex(8, 512, (g) => { const gr = g.createLinearGradient(0, 0, 0, 512); for (const [u, c] of stops) gr.addColorStop(u, c); g.fillStyle = gr; g.fillRect(0, 0, 8, 512); });
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, toneMapped: false })); return m; };
const sunLight = (col: string, k: number, pos: V3, tgt: V3, ext = 8) => { const s = new THREE.DirectionalLight(col, k); s.position.set(...pos); s.target.position.set(...tgt); s.castShadow = true; s.shadow.mapSize.set(4096, 4096);
  Object.assign(s.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 60 }); s.shadow.bias = -0.0004; s.shadow.normalBias = 0.03; s.shadow.radius = 4; return s; };

// ======================================================================================================
// the dream: a pastel sky, a floor of clouds, a rainbow; the dream items pop in one after another
export const DREAM = { house: V(-1.7, 0, -2.6), car: V(1.4, 0, -0.9), moto: V(2.35, 0, 0.9), pacar: V(0.35, 0, 1.75), you: V(-0.4, 0, 1.9) };
export class MimpiSet {
  root = new THREE.Group(); sunDir = new THREE.Vector3(); house = dreamHouse(); car = dreamCar("#ff4d6d"); moto = scooter("#4ecdc4"); ring = ringBox(); puffs: THREE.Group[] = []; coin: CoinRig; extra = new THREE.Group();
  constructor() {
    seedRnd(71); const R = this.root; R.add(this.extra);
    R.add(skyDome([[0, "#9f8cff"], [0.35, "#d6a8ff"], [0.5, "#ffc0dc"], [0.58, "#ffe6c4"], [1, "#fff4e4"]]));
    // cloud floor: instanced puffs whose tops sit near y = 0
    const cm = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.85, emissive: "#ffd6ec", emissiveIntensity: 0.18 });
    const n = 420, inst = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 12), cm, n), o = new THREE.Object3D();
    for (let i = 0; i < n; i++) { const x = (rnd() - 0.5) * 26, z = -16 + rnd() * 22, s = 0.45 + rnd() * 0.9, near = Math.abs(x) < 3.5 && z > -4 && z < 3.2; o.position.set(x, near ? -s * 0.82 : -s * (0.55 + rnd() * 0.4) - 0.1, z); o.scale.set(s * 1.3, s, s * 1.1); o.updateMatrix(); inst.setMatrixAt(i, o.matrix); }
    inst.receiveShadow = true; inst.castShadow = false; R.add(inst);
    const flat = M(new THREE.CircleGeometry(4.2, 48), new THREE.MeshStandardMaterial({ color: "#fff6fb", roughness: 0.9, emissive: "#ffd6ec", emissiveIntensity: 0.12 }), [0, -0.01, -0.4], [-Math.PI / 2, 0, 0]); flat.castShadow = false; R.add(flat);
    // a rainbow behind the house, floating clouds, glitter
    ["#ff5d5d", "#ffa94d", "#ffe066", "#69db7c", "#4dabf7", "#9775fa"].forEach((c, i) => { const a = new THREE.Mesh(new THREE.TorusGeometry(6.2 - i * 0.22, 0.11, 8, 64, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.6, toneMapped: false, fog: false })); a.position.set(-0.6, -0.4, -9); R.add(a); });
    for (const [x, y, z, s] of [[-3.2, 2.6, -5, 1.2], [3.4, 3.0, -6, 1.5], [0.5, 4.2, -9, 2.0], [-4.5, 1.2, -2.5, 0.8], [4.2, 1.6, -1.5, 0.9]] as [number, number, number, number][]) { const c = cloud3D(s); c.position.set(x, y, z); R.add(c); this.puffs.push(c); }
    this.house.position.copy(DREAM.house); this.house.scale.setScalar(1.9); this.house.rotation.y = 0.35; R.add(this.house);
    this.car.position.copy(DREAM.car); this.car.rotation.y = -0.55; this.car.scale.setScalar(1.15); R.add(this.car);
    this.moto.position.copy(DREAM.moto); this.moto.rotation.y = -1.1; this.moto.scale.setScalar(0.95); R.add(this.moto);
    R.add(this.ring); this.coin = new CoinRig(R); this.coin.coin.visible = false;
    // little heart-shaped balloons near the couple
    const heart = new THREE.Shape(); heart.moveTo(0, -0.1); heart.bezierCurveTo(-0.12, 0.0, -0.12, 0.12, 0, 0.07); heart.bezierCurveTo(0.12, 0.12, 0.12, 0.0, 0, -0.1);
    for (let i = 0; i < 4; i++) { const h = M(new THREE.ExtrudeGeometry(heart, { depth: 0.04, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 }), new THREE.MeshPhysicalMaterial({ color: ["#ff4d6d", "#ff8fab", "#ffb3c6", "#ff4d6d"][i], roughness: 0.2, clearcoat: 1 }), [0.9 + i * 0.25, 1.9 + (i % 2) * 0.25, 1.2 - i * 0.1]); h.scale.setScalar(1.6); R.add(h); this.puffs.push(h as unknown as THREE.Group); }
    const sun = sunLight("#fff2f6", 2.6, [-4, 8, 7], [0, 0.5, 0], 7); R.add(sun, sun.target, new THREE.HemisphereLight("#e6d4ff", "#ffd2e6", 1.4));
    const rim = new THREE.PointLight("#b48cff", 1.5, 8, 1.2); rim.position.set(1.5, 2.5, -2.5); R.add(rim);
    this.sunDir.copy(sun.position).sub(sun.target.position).normalize();
  }
  update(t: number) { this.puffs.forEach((p, i) => { p.position.y += 0.0015 * Math.sin(t * 1.2 + i); p.rotation.y = 0.15 * Math.sin(t * 0.4 + i); }); }
}

// ======================================================================================================
// the T-junction at golden hour: you on the near kerb; across the road the police station (left) and the jewellery shop
// (right); between them the estate road runs away past two-storey houses
export const SIMPANG = { you: V(0, 0, 1.6), police: V(-2.9, 0, -5.6), shop: V(2.9, 0, -5.6) };
/** a patrol car at real size: 4.2 m long, 1.75 m wide, 1.5 m tall; white with navy + gold stripes, a light bar whose
 *  red and blue halves are pushed into `sirens` so the set can flash them */
const policeCar = (sirens: THREE.Mesh[]) => {
  const G = new THREE.Group(), paint = new THREE.MeshPhysicalMaterial({ color: "#f6f4ef", metalness: 0.3, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 }), navy = mat("#1f4fa8", { roughness: 0.4 }),
    glass = new THREE.MeshPhysicalMaterial({ color: "#1d2b3a", roughness: 0.05, metalness: 0.3, clearcoat: 1 }), tyre = mat("#141414", { roughness: 0.85 }), rim = mat("#c9ccd0", { metalness: 1, roughness: 0.25 }), blk = mat("#1a1a1a", { roughness: 0.6 });
  G.add(M(rb(4.2, 0.6, 1.75, 0.16), paint, [0, 0.62, 0])); G.add(M(rb(2.25, 0.55, 1.58, 0.18), paint, [-0.2, 1.17, 0]));
  for (const sz of [-1, 1]) { G.add(B(2.0, 0.42, 0.02, glass, [-0.2, 1.2, sz * 0.795])); G.add(B(0.04, 0.42, 0.03, blk, [-0.25, 1.2, sz * 0.8])); G.add(B(4.22, 0.17, 0.02, navy, [0, 0.72, sz * 0.88])); G.add(B(4.22, 0.035, 0.02, mat("#f2c14e", { metalness: 0.6 }), [0, 0.62, sz * 0.885]));
    G.add(B(0.12, 0.08, 0.14, blk, [0.75, 1.0, sz * 0.92])); for (const x of [-0.75, 0.35]) G.add(B(0.18, 0.03, 0.02, mat("#c9ccd0", { metalness: 1 }), [x, 0.88, sz * 0.89])); }
  G.add(M(new THREE.PlaneGeometry(1.45, 0.62), glass, [0.98, 1.18, 0], [0, Math.PI / 2, 0.85])); G.add(M(new THREE.PlaneGeometry(1.4, 0.5), glass, [-1.38, 1.18, 0], [0, -Math.PI / 2, -0.85]));
  for (const x of [-1.35, 1.35]) for (const z of [-0.78, 0.78]) { G.add(cyl(0.33, 0.33, 0.24, tyre, [x, 0.33, z], [Math.PI / 2, 0, 0], 28)); G.add(cyl(0.2, 0.2, 0.25, rim, [x, 0.33, z], [Math.PI / 2, 0, 0], 20)); }
  for (const sz of [-1, 1]) { G.add(B(0.04, 0.12, 0.34, new THREE.MeshStandardMaterial({ color: "#fff8e0", emissive: "#fff2c0", emissiveIntensity: 0.9 }), [2.1, 0.72, sz * 0.55])); G.add(B(0.04, 0.12, 0.3, new THREE.MeshStandardMaterial({ color: "#d01020", emissive: "#ff2030", emissiveIntensity: 0.6 }), [-2.1, 0.75, sz * 0.58])); }
  G.add(B(0.05, 0.16, 0.8, blk, [2.11, 0.55, 0])); for (const x of [-2.12, 2.12]) G.add(B(0.08, 0.16, 1.7, mat("#4a4d55", { roughness: 0.5 }), [x, 0.4, 0]));
  G.add(B(0.3, 0.08, 1.15, blk, [-0.2, 1.49, 0])); for (const [z, c] of [[-0.28, "#2a5cff"], [0.28, "#ff2a3a"]] as [number, string][]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.11, 0.5), new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); s.position.set(-0.2, 1.585, z); G.add(s); sirens.push(s); }
  G.traverse((k) => { if ((k as THREE.Mesh).isMesh) (k as THREE.Mesh).castShadow = true; }); return G; };

export class SimpangSet {
  root = new THREE.Group(); sunDir = new THREE.Vector3(); flag: THREE.Mesh; flagBase: Float32Array; siren: THREE.Mesh[] = []; glints: THREE.Mesh[] = []; extra = new THREE.Group();
  constructor() {
    seedRnd(81); const R = this.root; R.add(this.extra);
    R.add(skyDome([[0, "#2f6fd8"], [0.28, "#6aa6f2"], [0.43, "#bcdcff"], [0.49, "#ffe0b0"], [0.53, "#ffc48a"], [1, "#ffcf9a"]], 150));
    for (const [x, y, z, w] of [[-26, 16, -55, 9], [-9, 21, -62, 12], [12, 15, -50, 8], [28, 19, -58, 10], [-38, 12, -40, 7], [40, 11, -38, 7], [0, 26, -70, 14]] as [number, number, number, number][]) { const c = cloud3D(w, "#fffaf2"); c.position.set(x, y, z); c.scale.y = 0.75; R.add(c); }
    // asphalt with lane dashes + a zebra crossing; kerbs painted black and white; pavements in red-grey paving
    const asph = canvasTex(512, 512, (g) => { g.fillStyle = "#4b5060"; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 4000; i++) { const v = 60 + rnd() * 60; g.fillStyle = `rgba(${v},${v},${v + 10},0.5)`; g.fillRect(rnd() * 512, rnd() * 512, 2, 2); } }); asph.wrapS = asph.wrapT = THREE.RepeatWrapping; asph.repeat.set(10, 10);
    const road = M(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: asph, roughness: 0.75 }), [0, 0, 0], [-Math.PI / 2, 0, 0]); road.castShadow = false; R.add(road);
    const white = new THREE.MeshStandardMaterial({ color: "#f4f1ea", roughness: 0.6 });
    for (let i = 0; i < 10; i++) { const x = -12 + i * 2.8; if (Math.abs(x) < 3.2) continue; const d = M(new THREE.PlaneGeometry(1.2, 0.14), white, [x, 0.005, -1.65], [-Math.PI / 2, 0, 0]); d.castShadow = false; R.add(d); }
    // the zebra crossing: 8 bold white bars running from kerb to kerb, plus a stop line either side
    const zebra = new THREE.MeshStandardMaterial({ color: "#f2f0ea", roughness: 0.7 });
    for (let i = 0; i < 7; i++) { const s = M(new THREE.PlaneGeometry(0.45, 6.3), zebra, [-2.7 + i * 0.9, 0.008, -1.67], [-Math.PI / 2, 0, 0]); s.castShadow = false; R.add(s); }
    for (const [x, z] of [[-3.5, -0.1], [3.5, -3.2]] as [number, number][]) { const l = M(new THREE.PlaneGeometry(0.2, 3.1), zebra, [x, 0.007, z], [-Math.PI / 2, 0, 0]); l.castShadow = false; R.add(l); }
    const pave = canvasTex(256, 256, (g) => { for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { g.fillStyle = (r + c) % 3 ? "#b9a59a" : "#9a5a4a"; g.fillRect(c * 32 + 1, r * 32 + 1, 30, 30); } }); pave.wrapS = pave.wrapT = THREE.RepeatWrapping; pave.repeat.set(12, 2);
    const pm = new THREE.MeshStandardMaterial({ map: pave, roughness: 0.8 });
    const kerbT = canvasTex(256, 16, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#f4f1ea" : "#26262a"; g.fillRect(i * 32, 0, 32, 16); } }); kerbT.wrapS = THREE.RepeatWrapping; kerbT.repeat.set(10, 1);
    const kerb = new THREE.MeshStandardMaterial({ map: kerbT, roughness: 0.7 });
    const walk = (x: number, z: number, w: number, d: number) => { R.add(B(w, 0.14, d, [kerb, kerb, pm, pm, kerb, kerb], [x, 0.07, z])); };
    walk(0, 2.9, 30, 2.6); walk(-8.2, -6.2, 13.6, 2.6); walk(8.2, -6.2, 13.6, 2.6); // near kerb, far kerbs either side of the estate road
    // the estate road between the two buildings, lined with two-storey houses in pastel paint
    const house = (x: number, z: number, col: string, roof: string, ry: number) => { const G = new THREE.Group(); G.position.set(x, 0, z); G.rotation.y = ry;
      G.add(B(4.2, 5.6, 5, mat(col, { roughness: 0.85 }), [0, 2.8, 0])); G.add(M(new THREE.ConeGeometry(3.6, 1.4, 4), mat(roof, { roughness: 0.7 }), [0, 6.3, 0], [0, Math.PI / 4, 0]));
      for (const [wx, wy] of [[-1.1, 1.4], [1.1, 1.4], [-1.1, 4.0], [1.1, 4.0]] as [number, number][]) { G.add(B(0.95, 1.1, 0.06, mat("#f4f1ea"), [wx, wy, 2.51])); G.add(B(0.8, 0.95, 0.07, new THREE.MeshStandardMaterial({ color: "#3e5266", roughness: 0.1, metalness: 0.4, emissive: "#ffb870", emissiveIntensity: rnd() < 0.4 ? 0.35 : 0 }), [wx, wy, 2.52])); }
      G.add(B(4.4, 0.12, 1.2, mat("#efe9dc"), [0, 2.85, 2.9])); G.add(B(4.6, 1.2, 0.12, mat("#efe9dc"), [0, 0.6, 4.6])); R.add(G); };
    house(-4.6, -15, "#ffd6a5", "#c0583f", 0.0); house(4.6, -15, "#bde0fe", "#3d5a80", 0.0); house(-4.8, -22, "#caffbf", "#7a4a3a", 0); house(4.8, -22, "#ffc6ff", "#5a4a7a", 0); house(0, -30, "#fdffb6", "#c0583f", 0);
    // ---- the police station (left): two storeys, white with a navy floor band and parapet, a stone plinth, framed windows,
    //      a canopy on columns with downlights, steps with chrome rails, a big 3D shield + star, wall lamps, CCTV, a downpipe,
    //      AC units + a water tank on the roof, a guard booth with a red-white boom barrier, the flag, potted shrubs
    { const G = new THREE.Group(); G.position.copy(SIMPANG.police); G.rotation.y = 0.32; const w = 4.8, d = 4.2;
      const wall = mat("#f6f4ef", { roughness: 0.6 }), navy = mat("#1f4fa8", { roughness: 0.45 }), navyD = mat("#163a7a", { roughness: 0.5 }), stone = mat("#7d8088", { roughness: 0.85 }), stoneL = mat("#b9bcc2", { roughness: 0.8 }),
        glass = new THREE.MeshPhysicalMaterial({ color: "#8fb4dc", roughness: 0.05, metalness: 0.35, clearcoat: 1, emissive: "#28466a", emissiveIntensity: 0.3 }), frame = mat("#2b3240", { metalness: 0.6, roughness: 0.35 }), chrome = mat("#d8dce0", { metalness: 1, roughness: 0.2 });
      G.add(B(w + 0.1, 0.35, d + 0.1, stone, [0, 0.175, -d / 2])); G.add(B(w, 2.7, d, wall, [0, 1.7, -d / 2])); G.add(B(w + 0.1, 0.25, d + 0.1, navy, [0, 3.175, -d / 2]));
      G.add(B(w, 2.0, d, mat("#e6edf7", { roughness: 0.6 }), [0, 4.3, -d / 2])); G.add(B(w + 0.2, 0.42, d + 0.2, navy, [0, 5.51, -d / 2])); G.add(B(w + 0.3, 0.08, d + 0.3, navyD, [0, 5.76, -d / 2]));
      const win = (x: number, y: number, ww: number, hh: number) => { G.add(B(ww + 0.12, hh + 0.12, 0.08, frame, [x, y, 0.02])); G.add(B(ww, hh, 0.05, glass, [x, y, 0.05])); G.add(B(0.035, hh, 0.06, frame, [x, y, 0.075])); G.add(B(ww, 0.035, 0.06, frame, [x, y + hh * 0.2, 0.075])); G.add(B(ww + 0.25, 0.07, 0.2, mat("#dcdcd6"), [x, y - hh / 2 - 0.09, 0.1])); };
      for (const x of [-1.85, -1.05, 1.05, 1.85]) win(x, 4.3, 0.6, 1.05); for (const x of [-1.85, 1.85]) win(x, 1.75, 0.85, 1.2);
      // entrance: double glass door, chrome pulls, wall lamps
      G.add(B(1.7, 2.25, 0.08, frame, [0, 1.48, 0.02])); for (const sx of [-1, 1]) { G.add(B(0.78, 2.12, 0.05, glass, [sx * 0.42, 1.48, 0.06])); G.add(cyl(0.015, 0.015, 0.5, chrome, [sx * 0.09, 1.45, 0.11])); G.add(B(0.14, 0.24, 0.1, new THREE.MeshStandardMaterial({ color: "#fff4d6", emissive: "#ffd28a", emissiveIntensity: 1.2 }), [sx * 1.02, 2.2, 0.08])); }
      // canopy on four columns with downlights; the fascia carries a white trim line
      G.add(B(2.7, 0.2, 1.7, navy, [0, 2.95, 0.8])); G.add(B(2.72, 0.04, 1.72, wall, [0, 2.83, 0.8])); G.add(B(2.72, 0.05, 0.02, mat("#ffffff"), [0, 2.97, 1.66]));
      for (const x of [-1.1, -0.37, 0.37, 1.1]) G.add(cyl(0.06, 0.06, 0.02, new THREE.MeshBasicMaterial({ color: "#fff4d6", toneMapped: false }), [x, 2.8, 1.05]));
      for (const x of [-1.2, 1.2]) { G.add(cyl(0.09, 0.09, 2.5, wall, [x, 1.6, 1.5])); G.add(B(0.24, 0.12, 0.24, stone, [x, 0.41, 1.5])); }
      for (let i = 0; i < 3; i++) G.add(B(2.2, 0.12 * (3 - i), 1.0 - i * 0.3, stoneL, [0, 0.06 * (3 - i), 0.05 + (1.0 - i * 0.3) / 2]));
      for (const sx of [-1, 1]) { for (const [z, h] of [[0.25, 0.95], [0.95, 0.75]] as [number, number][]) G.add(cyl(0.02, 0.02, h, chrome, [sx * 0.95, 0.35 + h / 2 - 0.12 * (z > 0.5 ? 2 : 0), z])); G.add(cyl(0.022, 0.022, 0.75, chrome, [sx * 0.95, 1.08, 0.6], [Math.atan2(0.7, -0.25), 0, 0])); }
      // the emblem: a gold shield with a navy star in the middle of the upper floor
      const sh = new THREE.Shape(); sh.moveTo(0, 0.55); sh.lineTo(0.45, 0.45); sh.quadraticCurveTo(0.45, -0.25, 0, -0.55); sh.quadraticCurveTo(-0.45, -0.25, -0.45, 0.45); sh.closePath();
      G.add(M(new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }), new THREE.MeshStandardMaterial({ color: "#e8b84a", metalness: 0.85, roughness: 0.3, emissive: "#5a3a06", emissiveIntensity: 0.3 }), [0, 4.3, 0.06]));
      const st = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.09 : 0.22; if (i === 0) st.moveTo(r * Math.cos(a), r * Math.sin(a)); else st.lineTo(r * Math.cos(a), r * Math.sin(a)); }
      G.add(M(new THREE.ExtrudeGeometry(st, { depth: 0.04, bevelEnabled: false }), navy, [0, 4.35, 0.18]));
      // CCTV, downpipe, roof AC units + water tank
      G.add(B(0.18, 0.1, 0.1, mat("#f0f0f0"), [w / 2 - 0.15, 3.0, 0.15])); G.add(cyl(0.035, 0.035, 0.1, mat("#222"), [w / 2 - 0.15, 3.0, 0.22], [Math.PI / 2, 0, 0]));
      G.add(cyl(0.05, 0.05, 5.6, mat("#9aa0a8", { metalness: 0.4 }), [w / 2 - 0.05, 2.8, 0.06]));
      for (const x of [-1.5, -0.7]) G.add(B(0.7, 0.5, 0.3, mat("#eef0f2", { roughness: 0.4 }), [x, 6.05, -1.0])); G.add(cyl(0.45, 0.45, 0.9, mat("#3b82c4", { roughness: 0.4 }), [1.3, 6.25, -2.6]));
      // shrubs in pots either side of the steps
      for (const sx of [-1, 1]) { G.add(cyl(0.22, 0.17, 0.4, mat("#2b3240"), [sx * 1.6, 0.2, 0.75])); G.add(M(new THREE.SphereGeometry(0.33, 16, 12), mat("#3f9a4a", { roughness: 0.8 }), [sx * 1.6, 0.62, 0.75])); }
      // the guard booth + a red-white boom barrier on the left; the flagpole next to it
      const booth = new THREE.Group(); booth.position.set(-3.75, 0, 0.3); booth.add(B(1.05, 2.25, 1.05, wall, [0, 1.125, 0])); booth.add(B(1.3, 0.14, 1.3, navy, [0, 2.32, 0])); booth.add(B(0.8, 0.7, 0.04, glass, [0, 1.45, 0.53])); booth.add(B(1.07, 0.18, 1.07, navy, [0, 0.95, 0])); G.add(booth);
      const bt = canvasTex(256, 16, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#f6f4ef" : "#e0262f"; g.fillRect(i * 32, 0, 32, 16); } });
      G.add(B(0.28, 0.95, 0.28, navy, [-3.2, 0.475, 1.85])); G.add(B(2.8, 0.09, 0.09, new THREE.MeshStandardMaterial({ map: bt, roughness: 0.5 }), [-4.6, 0.9, 1.85]));
      G.add(cyl(0.05, 0.06, 5.8, mat("#d8dce0", { metalness: 0.8, roughness: 0.3 }), [-2.75, 2.9, 0.85])); G.add(M(new THREE.SphereGeometry(0.08, 12, 8), mat("#e8b84a", { metalness: 0.9 }), [-2.75, 5.85, 0.85]));
      const fg = new THREE.PlaneGeometry(1.3, 0.85, 12, 4), fc: number[] = []; const pp = fg.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pp.count; i++) { const c = new THREE.Color(pp.getY(i) > 0 ? "#e0262f" : "#f6f4ef"); fc.push(c.r, c.g, c.b); } fg.setAttribute("color", new THREE.Float32BufferAttribute(fc, 3)); fg.translate(0.65, 0, 0);
      this.flag = M(fg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }), [-2.73, 5.3, 0.85]); this.flagBase = (fg.attributes.position.array as Float32Array).slice(); G.add(this.flag); R.add(G); }
    // the patrol car, real size (4.2 m long, 1.5 m tall), parked by the far kerb left of the station
    { const car = policeCar(this.siren); car.position.set(-4.9, 0, -3.75); car.rotation.y = 0.32; R.add(car); }
    // ---- the jewellery shop (right): a two-storey ruko. Ground floor red with gold columns, two glowing display windows with
    //      velvet busts and rings, a gold-framed glass door, a rolling-shutter box, striped scalloped awnings, red lanterns,
    //      mandarin trees in pots; upper floor cream with gold-trimmed windows and a balcony railing; a red eave with a gold
    //      ridge; on top, a marquee sign board with a big 3D gold ring and a diamond
    { const G = new THREE.Group(); G.position.copy(SIMPANG.shop); G.rotation.y = -0.32; const w = 4.6, d = 4.2;
      const gold = new THREE.MeshStandardMaterial({ color: "#f2c14e", metalness: 0.95, roughness: 0.22, emissive: "#6a4006", emissiveIntensity: 0.35 }), red = mat("#c3202c", { roughness: 0.5 }), dred = mat("#8e1520", { roughness: 0.5 }), cream = mat("#fbe7c6", { roughness: 0.7 });
      const gl = new THREE.MeshPhysicalMaterial({ color: "#ffe4b8", roughness: 0.05, metalness: 0.2, emissive: "#ffb870", emissiveIntensity: 0.3, clearcoat: 1 });
      G.add(B(w + 0.1, 0.25, d + 0.1, mat("#3a2a2a", { roughness: 0.4 }), [0, 0.125, -d / 2])); G.add(B(w, 3.0, d, red, [0, 1.75, -d / 2])); G.add(B(w + 0.14, 0.2, d + 0.14, gold, [0, 3.35, -d / 2]));
      G.add(B(w, 1.85, d, cream, [0, 4.375, -d / 2])); G.add(B(w + 0.2, 0.3, d + 0.2, red, [0, 5.45, -d / 2]));
      for (const x of [-2.15, -0.8, 0.8, 2.15]) { G.add(cyl(0.13, 0.15, 3.0, gold, [x, 1.75, 0.12])); G.add(B(0.36, 0.12, 0.36, gold, [x, 0.31, 0.12])); G.add(B(0.36, 0.12, 0.36, gold, [x, 3.19, 0.12])); }
      // display windows: warm glow, a gold sill, velvet necklace busts + rings
      for (const x of [-1.475, 1.475]) { G.add(B(1.12, 1.7, 0.05, new THREE.MeshStandardMaterial({ color: "#fff1c8", emissive: "#ffcf7a", emissiveIntensity: 0.7 }), [x, 1.55, -0.05])); G.add(B(1.22, 0.08, 0.32, gold, [x, 0.66, 0.05]));
        for (const bx of [-0.27, 0.27]) { G.add(M(new THREE.ConeGeometry(0.09, 0.32, 16), dred, [x + bx, 0.86, 0.02])); G.add(M(new THREE.TorusGeometry(0.06, 0.01, 8, 24), gold, [x + bx, 0.92, 0.05], [0.3, 0, 0])); }
        for (let k = 0; k < 4; k++) { const r = M(new THREE.TorusGeometry(0.06, 0.014, 10, 24), gold, [x - 0.24 + k * 0.16, 1.55 + (k % 2) * 0.35, 0.03]); G.add(r); this.glints.push(r); } }
      // the door: gold frame, glass, two gold pulls, a step and a red mat; the rolling-shutter box above
      G.add(B(1.35, 2.5, 0.08, gold, [0, 1.5, 0.0])); G.add(B(1.2, 2.35, 0.05, gl, [0, 1.47, 0.04])); for (const sx of [-1, 1]) G.add(cyl(0.018, 0.018, 0.45, gold, [sx * 0.1, 1.4, 0.1]));
      G.add(B(1.6, 0.12, 0.45, mat("#3a2a2a", { roughness: 0.4 }), [0, 0.06, 0.3])); G.add(B(1.0, 0.01, 0.4, mat("#a3161f", { roughness: 0.95 }), [0, 0.125, 0.3]));
      G.add(cyl(0.14, 0.14, 1.45, mat("#9aa0a8", { metalness: 0.5, roughness: 0.4 }), [0, 2.9, 0.12], [0, 0, Math.PI / 2]));
      // striped awnings with a scalloped edge over the display windows
      const aw = canvasTex(256, 64, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#fff3dc" : "#d62839"; g.fillRect(i * 32, 0, 32, 64); } });
      for (const x of [-1.475, 1.475]) { const a = M(new THREE.PlaneGeometry(1.3, 0.75), new THREE.MeshStandardMaterial({ map: aw, roughness: 0.8, side: THREE.DoubleSide }), [x, 2.75, 0.33], [-1.0, 0, 0]); G.add(a);
        for (let i = 0; i < 8; i++) G.add(M(new THREE.CircleGeometry(0.081, 16, 0, Math.PI), new THREE.MeshStandardMaterial({ color: i % 2 ? "#fff3dc" : "#d62839", roughness: 0.8, side: THREE.DoubleSide }), [x - 0.57 + i * 0.1625, 2.465, 0.645], [0, 0, Math.PI])); }
      // lanterns with gold caps and tassels; mandarin trees in gold-rimmed red pots
      for (const x of [-1.95, 1.95]) { const l = M(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshStandardMaterial({ color: "#e0262f", emissive: "#ff3a2a", emissiveIntensity: 0.6 }), [x, 2.75, 0.9]); l.scale.y = 0.85; G.add(l);
        G.add(cyl(0.08, 0.08, 0.05, gold, [x, 2.95, 0.9])); G.add(cyl(0.08, 0.08, 0.05, gold, [x, 2.56, 0.9])); G.add(cyl(0.012, 0.012, 0.25, gold, [x, 2.4, 0.9])); G.add(cyl(0.008, 0.008, 0.5, gold, [x, 3.2, 0.9]));
        G.add(cyl(0.24, 0.19, 0.42, red, [x * 0.95, 0.21, 0.85])); G.add(cyl(0.25, 0.25, 0.04, gold, [x * 0.95, 0.42, 0.85])); G.add(M(new THREE.SphereGeometry(0.38, 16, 12), mat("#2f7a3a", { roughness: 0.8 }), [x * 0.95, 0.85, 0.85]));
        for (let k = 0; k < 9; k++) { const a = k * 2.1; G.add(M(new THREE.SphereGeometry(0.05, 10, 8), mat("#ff9f1c", { roughness: 0.4 }), [x * 0.95 + 0.3 * Math.cos(a), 0.85 + 0.25 * Math.sin(k * 1.3), 0.85 + 0.3 * Math.sin(a)])); } }
      // upper floor: three gold-trimmed windows with warm curtains, a balcony railing, an AC unit
      for (const x of [-1.45, 0, 1.45]) { G.add(B(0.95, 1.15, 0.07, gold, [x, 4.4, 0.02])); G.add(B(0.83, 1.03, 0.05, new THREE.MeshPhysicalMaterial({ color: "#7fb7d8", roughness: 0.05, metalness: 0.3, emissive: "#ffb870", emissiveIntensity: 0.2 }), [x, 4.4, 0.05])); G.add(B(0.03, 1.03, 0.06, gold, [x, 4.4, 0.08])); }
      G.add(B(w - 0.3, 0.08, 0.55, cream, [0, 3.5, 0.27])); G.add(B(w - 0.3, 0.05, 0.05, gold, [0, 4.1, 0.52])); for (let i = 0; i < 22; i++) G.add(cyl(0.015, 0.015, 0.55, gold, [-2.05 + i * 0.195, 3.82, 0.52]));
      G.add(B(0.7, 0.45, 0.25, mat("#eef0f2", { roughness: 0.4 }), [-1.9, 4.95, 0.15]));
      // a red eave with a gold ridge, then the marquee sign: dark red board, gold border, bulbs, a 3D ring and a diamond
      G.add(B(w + 0.6, 0.08, 0.8, mat("#a3161f", { roughness: 0.6 }), [0, 5.55, 0.25], [0.35, 0, 0])); G.add(cyl(0.05, 0.05, w + 0.6, gold, [0, 5.7, -0.12], [0, 0, Math.PI / 2]));
      G.add(B(2.1, 1.05, 0.12, dred, [0, 6.15, -0.35])); for (const [bw, bh, x, y] of [[2.2, 0.06, 0, 6.68], [2.2, 0.06, 0, 5.62], [0.06, 1.1, -1.08, 6.15], [0.06, 1.1, 1.08, 6.15]] as [number, number, number, number][]) G.add(B(bw, bh, 0.14, gold, [x, y, -0.33]));
      const bulb = new THREE.MeshBasicMaterial({ color: "#fff2c4", toneMapped: false }); for (let i = 0; i < 11; i++) for (const y of [6.62, 5.68]) G.add(M(new THREE.SphereGeometry(0.03, 8, 6), bulb, [-0.95 + i * 0.19, y, -0.26]));
      const ring = M(new THREE.TorusGeometry(0.3, 0.075, 16, 48), gold, [0, 6.05, -0.18]); G.add(ring); G.add(M(new THREE.OctahedronGeometry(0.17), new THREE.MeshPhysicalMaterial({ color: "#eafcff", roughness: 0, emissive: "#9fe8ff", emissiveIntensity: 0.6 }), [0, 6.48, -0.18]));
      const s1 = scooter("#ffd166"); s1.position.set(-2.6, 0, 2.3); s1.rotation.y = 1.3; s1.scale.setScalar(1.1); G.add(s1); R.add(G); }
    // trees (one flame tree in flower), street lamps, a blue sign post with only a symbol, scooters
    const tree = (x: number, z: number, col: string, s = 1) => { const G = new THREE.Group(); G.position.set(x, 0, z); G.add(cyl(0.12 * s, 0.18 * s, 2.6 * s, mat("#6a4a32"), [0, 1.3 * s, 0])); for (let i = 0; i < 6; i++) { const a = i * 1.05; G.add(M(new THREE.SphereGeometry((0.8 + 0.25 * (i % 2)) * s, 14, 10), mat(col, { roughness: 0.8 }), [Math.cos(a) * 0.6 * s, (2.9 + 0.4 * (i % 3)) * s, Math.sin(a) * 0.5 * s])); } R.add(G); };
    tree(-7.5, -6.6, "#ff6a3a", 1.2); tree(7.8, -6.8, "#3f9a4a", 1.2); tree(-2.4, -13, "#4fae5a", 0.9); tree(2.4, -13, "#ff8a5a", 0.9); tree(-6, 3.4, "#3f9a4a", 1.1); tree(6.2, 3.4, "#62b84a", 1.0);
    const lamp = (x: number, z: number) => { R.add(cyl(0.05, 0.07, 4.5, mat("#3a3f4a", { metalness: 0.6 }), [x, 2.25, z])); R.add(B(0.7, 0.06, 0.12, mat("#3a3f4a"), [x + 0.3 * Math.sign(-x || 1), 4.45, z])); };
    lamp(-1.8, -5.6); lamp(1.8, -5.6); lamp(-3.0, 3.6); lamp(3.0, 3.6);
    const sc = scooter("#ff6b6b"); sc.position.set(-5.4, 0.14, 3.2); sc.rotation.y = 0.4; R.add(sc); const sc2 = scooter("#7b8cde"); sc2.position.set(5.4, 0.14, 3.3); sc2.rotation.y = -0.3; R.add(sc2);
    const sun = sunLight("#ffc78f", 3.2, [-9, 9, 12], [0, 0.5, -2], 14); R.add(sun, sun.target, new THREE.HemisphereLight("#9ab8f0", "#b07a5a", 1.15));
    this.sunDir.copy(sun.position).sub(sun.target.position).normalize();
  }
  update(t: number) {
    const pp = this.flag.geometry.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pp.count; i++) { const x = this.flagBase[i * 3]; pp.setZ(i, x * 0.12 * Math.sin(t * 4 - x * 4)); } pp.needsUpdate = true; this.flag.geometry.computeVertexNormals();
    this.siren.forEach((s, i) => { (s.material as THREE.MeshBasicMaterial).color.set(Math.sin(t * 9 + i * Math.PI) > 0 ? (i ? "#ff2a3a" : "#2a5cff") : "#222"); });
    void rb;
  }
}
