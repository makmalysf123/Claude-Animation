// Test 2026-11-18: muscular mannequin fighters (src/lib/muscle.ts) in a grey dojo, one left hook.
// Red (boxer, gloves) bounces in guard, loads, throws a left hook that lands on Blue's jaw (contact computed, never
// guessed); a 3-frame hit-stop with flash + burst; Blue's head whips, he spins, staggers and drops to one knee.
import React from "react";
import * as THREE from "three";
import { Reel, SceneDef, Ctx } from "../lib/scene";
import { Fighter, vec as V } from "../lib/muscle";
import { sm, clamp01, noise, kick } from "../lib/acting";

export const FIGHT_FRAMES = 112;
const T_LOAD = 0.95, T_SWING = 1.13, T_IMP = 1.27, HS = 0.1, END = FIGHT_FRAMES / 30; // hit-stop HS seconds
const tm = (t: number) => (t < T_IMP ? t : t < T_IMP + HS ? T_IMP : t - HS); // animation clock (frozen during the hit-stop)
const at = (t: number, a: number, b: number) => sm((t - a) / (b - a));
const lerpV = (a: THREE.Vector3, b: THREE.Vector3, u: number) => a.clone().lerp(b, u);
const Q = (y = 0, x = 0, z = 0) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, "YXZ"));
type E3 = [number, number, number];
const mixE = (a: E3, b: E3, u: number): E3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
/** key track of vectors/eulers: [time, value], smooth between neighbours */
const trackV = (t: number, keys: [number, THREE.Vector3][]) => { if (t <= keys[0][0]) return keys[0][1].clone(); for (let i = 0; i < keys.length - 1; i++) { const [a, va] = keys[i], [b, vb] = keys[i + 1]; if (t < b) return lerpV(va, vb, sm((t - a) / (b - a))); } return keys[keys.length - 1][1].clone(); };
const trackE = (t: number, keys: [number, E3][]) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 0; i < keys.length - 1; i++) { const [a, va] = keys[i], [b, vb] = keys[i + 1]; if (t < b) return mixE(va, vb, sm((t - a) / (b - a))); } return keys[keys.length - 1][1]; };

// ---------------- rig helpers ----------------
const body = (f: Fighter, hips: THREE.Vector3, hq: E3, torso: E3, head: E3) => {
  const qh = Q(...hq), qt = Q(...torso), qn = Q(...head), I = new THREE.Quaternion();
  f.q.hips = qh; f.q.spine = qh.clone().multiply(I.clone().slerp(qt, 0.3)); f.q.spine1 = qh.clone().multiply(I.clone().slerp(qt, 0.65)); f.q.chest = qh.clone().multiply(qt);
  f.q.neck = f.q.chest.clone().multiply(I.clone().slerp(qn, 0.4)); f.q.head = f.q.chest.clone().multiply(qn); f.q.headTop = f.q.head.clone();
  f.q.clavL = f.q.chest.clone(); f.q.clavR = f.q.chest.clone(); f.fk(hips);
};
const leg = (f: Fighter, s: "L" | "R", ankle: THREE.Vector3, toe: THREE.Vector3, pole: THREE.Vector3, tilt = 0) => {
  f.ik("thigh" + s, "shin" + s, "foot" + s, ankle, pole, V(0, 0, -1)); // a leg bends backward below the knee
  const d = toe.clone().setY(0).normalize().multiplyScalar(0.89).add(V(0, -0.45 + tilt, 0));
  f.q["foot" + s] = Fighter.aimQ(f.bindDir("foot" + s, "toe" + s), V(0, 1, 0), d, V(0, 1, 0)); f.q["toe" + s] = f.q["foot" + s].clone();
};
const arm = (f: Fighter, s: "L" | "R", wrist: THREE.Vector3, pole: THREE.Vector3, dir: THREE.Vector3, palm: THREE.Vector3, curl = 1) => {
  f.ik("arm" + s, "fore" + s, "hand" + s, wrist, pole, V(0, 0, 1)); f.handPose(s, dir.clone().normalize(), palm.clone().normalize(), curl);
};
const headCenter = (f: Fighter) => f.p.head.clone().add(V(0, 0.105, 0.01).applyQuaternion(f.q.head));
const gloveCenter = (f: Fighter, s: "L" | "R") => { const sx = s === "L" ? 1 : -1; return f.p["hand" + s].clone().add(V(Math.SQRT1_2 * sx, -Math.SQRT1_2, 0).multiplyScalar(0.075).add(V(-Math.SQRT1_2 * sx, -Math.SQRT1_2, 0).multiplyScalar(0.012)).applyQuaternion(f.q["hand" + s])); };

// ---------------- placement (world) ----------------
const BLUE_AT = V(-0.31, 0, 0), RED_AT = V(0.31, 0, 0.05);
const BLUE_YAW = Math.atan2(RED_AT.x - BLUE_AT.x, RED_AT.z - BLUE_AT.z), RED_YAW = Math.atan2(BLUE_AT.x - RED_AT.x, BLUE_AT.z - RED_AT.z);

// ---------------- Blue: guard, then the hit reaction ----------------
const poseBlue = (f: Fighter, t: number, tr: number) => {
  const u = t - T_IMP, b = Math.sin(t * 2 * Math.PI * 1.1) * 0.008;
  const hit = t > T_IMP ? 1 : 0;
  // root: spin away from the punch and stagger back, then sink
  f.root.position.copy(BLUE_AT).add(V(0.3 * at(u, 0.05, 0.75), 0, -0.28 * at(u, 0.05, 0.8)).applyAxisAngle(V(0, 1, 0), BLUE_YAW));
  f.root.rotation.y = BLUE_YAW + hit * (0.6 * at(u, 0.0, 0.5) + 0.12 * at(u, 0.5, 1.2));
  const hipsY = 0.93 + b - hit * (0.04 * at(u, 0.0, 0.2) + 0.36 * at(u, 0.78, 1.18));
  const hips = V(0.0 - 0.06 * hit * at(u, 0.8, 1.2), hipsY, 0.02 - 0.05 * hit * at(u, 0.8, 1.2));
  const torso = trackE(u, [[-9, [-0.25, 0.05, 0]], [0, [-0.25, 0.05, 0]], [0.06, [0.55, -0.12, 0.22]], [0.35, [0.35, 0.1, 0.12]], [0.8, [0.1, 0.25, 0.05]], [1.2, [0.05, 0.55, 0.08]]]);
  const head = trackE(u, [[-9, [0.25, -0.05, 0]], [0, [0.25, -0.05, 0]], [0.035, [0.95, 0.15, 0.5]], [0.25, [0.55, 0.3, 0.3]], [0.8, [0.2, 0.2, 0.15]], [1.25, [0.0, 0.45, 0.05]]]);
  body(f, hips, [-0.2 + hit * 0.3 * at(u, 0, 0.3), 0, 0], torso, head);
  // feet: guard stance; after the hit, two stagger steps, then the right knee goes down
  const lA = trackV(u, [[-9, V(0.12, 0.09, 0.18)], [0.3, V(0.12, 0.09, 0.18)], [0.5, V(0.2, 0.09, 0.12)], [0.85, V(0.17, 0.09, 0.26)]]);
  const rA = trackV(u, [[-9, V(-0.14, 0.09, -0.17)], [0.1, V(-0.14, 0.09, -0.17)], [0.28, V(-0.05, 0.12, -0.05)], [0.42, V(0.02, 0.09, -0.2)], [0.85, V(-0.1, 0.11, -0.3)], [1.15, V(-0.12, 0.14, -0.42)]]);
  const lift = (a: number, c: number) => 0.06 * Math.max(0, Math.sin(Math.PI * clamp01((u - a) / (c - a))));
  lA.y += lift(0.3, 0.5); rA.y += lift(0.12, 0.42);
  leg(f, "L", lA, V(0.2, 0, 1), V(0.25, 0, 1)); leg(f, "R", rA, V(0.45, 0, 1), V(-0.1, -hit * at(u, 0.8, 1.15), 1), hit * 0.5 * at(u, 0.85, 1.15));
  // arms: tight guard; flung open by the hit; then the left forearm rests on the knee, the right hand to the floor
  const lW = trackV(u, [[-9, V(0.1, 1.47, 0.22)], [0, V(0.1, 1.47, 0.22)], [0.08, V(0.36, 1.3, 0.12)], [0.5, V(0.3, 1.05, 0.15)], [1.2, V(0.13, 0.66, 0.36)]]);
  const rW = trackV(u, [[-9, V(-0.08, 1.43, 0.17)], [0, V(-0.08, 1.43, 0.17)], [0.08, V(-0.22, 1.22, 0.3)], [0.5, V(-0.34, 0.95, 0.12)], [1.2, V(-0.3, 0.12, 0.3)]]);
  arm(f, "L", lW, V(0.7, -1, -0.2), V(0, 0.4 - hit * 0.5, 1), V(-1, 0, 0), 1 - 0.6 * hit * at(u, 0.6, 1.0));
  arm(f, "R", rW, V(-0.7, -1, -0.2), u > 0.9 ? V(0, -1, 0.2) : V(0.2, 0.5, 1), u > 0.9 ? V(0, -1, 0) : V(1, 0, 0), 1 - 0.9 * hit * at(u, 0.7, 1.1));
  f.fk(f.p.hips); void tr;
};

// ---------------- Red: bounce, load, left hook, follow-through, recover ----------------
let HIT_TARGET: THREE.Vector3 | null = null; // red-space wrist target at impact (from Blue's head)
const HOOK_DIR = V(-1, 0.05, 0.35).normalize();
const poseRed = (f: Fighter, t: number) => {
  f.root.position.copy(RED_AT); f.root.rotation.y = RED_YAW;
  const bounce = 0.014 * Math.abs(Math.sin(t * Math.PI * 1.9)) * (1 - at(t, T_LOAD - 0.1, T_LOAD + 0.05) + at(t, 2.3, 2.6));
  const yaw = trackE(t, [[0, [-0.4, 0, 0]], [T_LOAD, [-0.4, 0, 0]], [T_SWING, [-0.1, 0.05, 0.06]], [T_IMP, [-0.95, 0.12, -0.06]], [T_IMP + 0.12, [-1.08, 0.14, -0.08]], [1.9, [-0.55, 0.05, 0]], [2.4, [-0.4, 0, 0]]]);
  const hips = V(0.0 + 0.03 * at(t, T_SWING, T_IMP) * (1 - at(t, 1.6, 2.2)), 0.925 + bounce - 0.03 * at(t, T_LOAD, T_SWING) * (1 - at(t, 1.5, 2.0)), 0.02 + 0.06 * at(t, T_SWING, T_IMP) * (1 - at(t, 1.6, 2.3)));
  body(f, hips, [yaw[0] * 0.55, 0, 0], [yaw[0] * 0.45, yaw[1] + 0.06, yaw[2]], [-yaw[0] * 0.85, -0.05, -yaw[2] * 0.5]);
  leg(f, "L", V(0.13, 0.09, 0.2), V(0.15, 0, 1), V(0.3, 0, 1), 0); leg(f, "R", V(-0.15, 0.09 + 0.03 * at(t, T_SWING, T_IMP) * (1 - at(t, 1.6, 2.0)), -0.2), V(0.55, 0, 1), V(-0.2, 0, 1), 0.25 * at(t, T_SWING, T_IMP) * (1 - at(t, 1.6, 2.0)));
  // left (lead) hand: guard -> load wide -> the jaw (computed) -> across -> guard
  const G = V(0.1, 1.46, 0.23), tgt = HIT_TARGET ?? V(-0.02, 1.55, 0.62);
  const lW = trackV(t, [[0, G], [T_LOAD, G], [T_SWING, V(0.28, 1.42, 0.12)], [T_SWING + 0.075, V(0.3, 1.5, 0.36)], [T_IMP, tgt], [T_IMP + 0.06, tgt.clone().add(V(-0.04, -0.02, -0.12))], [T_IMP + 0.28, V(0.17, 1.4, 0.16)], [1.95, G]]);
  const swing = at(t, T_SWING - 0.03, T_IMP) * (1 - at(t, T_IMP + 0.06, T_IMP + 0.28));
  arm(f, "L", lW, lerpV(V(0.6, -1, -0.1), V(1, 0.45, -0.25), swing), lerpV(V(0, 0.35, 1), HOOK_DIR, swing), lerpV(V(-1, 0, 0), V(0, -1, 0.1), swing), 1);
  arm(f, "R", V(-0.07, 1.46, 0.17), V(-0.6, -1, -0.1), V(0.25, 0.5, 1), V(1, 0, 0), 1);
  f.fk(f.p.hips);
};

// ---------------- the dojo (greyscale) ----------------
const canvasTex = (w: number, h: number, f: (g: CanvasRenderingContext2D) => void) => { const c = document.createElement("canvas"); c.width = w; c.height = h; f(c.getContext("2d")!); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
let rs = 11; const rnd = () => { rs = (rs * 16807) % 2147483647; return (rs - 1) / 2147483646; };
class Dojo {
  root = new THREE.Group(); sunDir = new THREE.Vector3(); dust: THREE.Points;
  constructor() {
    const R = this.root;
    const key = new THREE.DirectionalLight("#ffffff", 3.2); key.position.set(-2.6, 4.2, 3.6); key.target.position.set(0, 1, 0.3); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 15 }); key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02; R.add(key, key.target);
    this.sunDir.copy(key.position).sub(key.target.position).normalize();
    const rim = new THREE.DirectionalLight("#f0f2ff", 1.0); rim.position.set(2.5, 2.5, -3.5); R.add(rim);
    R.add(new THREE.HemisphereLight("#b9bcc4", "#2a2a2c", 0.9));
    const planks = canvasTex(1024, 1024, (g) => { for (let i = 0; i < 16; i++) { const v = 118 + rnd() * 26; g.fillStyle = `rgb(${v},${v},${v + 2})`; g.fillRect(0, i * 64, 1024, 64); g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(0, i * 64, 1024, 2);
      for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},0.04)`; g.fillRect(rnd() * 1024, i * 64 + rnd() * 60, 80 + rnd() * 200, 2); } } });
    planks.repeat.set(5, 5);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ map: planks, roughness: 0.35, color: "#bfbfc2" })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; R.add(floor);
    // back wall: tall paper screens (bright) between dark posts, a beam, hanging lanterns; side wall the same
    const post = new THREE.MeshStandardMaterial({ color: "#3a3a3d", roughness: 0.7 }), paper = new THREE.MeshStandardMaterial({ color: "#e9e9ea", emissive: "#d8d8db", emissiveIntensity: 0.55, roughness: 0.9 });
    const lattice = canvasTex(256, 512, (g) => { g.fillStyle = "#00000000"; g.clearRect(0, 0, 256, 512); g.strokeStyle = "#2c2c2f"; g.lineWidth = 7; for (let x = 0; x <= 256; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); } for (let y = 0; y <= 512; y += 85) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); } });
    const latM = new THREE.MeshBasicMaterial({ map: lattice, transparent: true, color: "#555" });
    for (const [z, rotY, xs] of [[-4.2, 0, [-4, -2.4, -0.8, 0.8, 2.4, 4]], [-0.5, Math.PI / 2, [-4, -2.4, -0.8, 0.8, 2.4]]] as [number, number, number[]][]) {
      const wall = new THREE.Group(); wall.rotation.y = rotY; if (rotY) wall.position.set(-4.4, 0, 0); else wall.position.z = z; R.add(wall);
      for (let i = 0; i < xs.length - 1; i++) { const cx = (xs[i] + xs[i + 1]) / 2, w = xs[i + 1] - xs[i] - 0.18;
        const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.6), paper); p.position.set(cx, 1.65, 0); wall.add(p); const l = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.6), latM); l.position.set(cx, 1.65, 0.01); wall.add(l); }
      for (const x of xs) { const pp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.6, 0.2), post); pp.position.set(x, 1.8, 0.05); pp.castShadow = true; wall.add(pp); }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(9, 0.25, 0.22), post); beam.position.set(0, 3.1, 0.06); wall.add(beam);
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(9, 0.3, 0.06), post); skirt.position.set(0, 0.15, 0.04); wall.add(skirt); }
    for (const [x, z] of [[-1.6, -3.6], [1.6, -3.6], [-3.8, -1.6]] as [number, number][]) { const ln = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.45, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.6) })); ln.position.set(x, 2.55, z); R.add(ln);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 20), post); cap.position.set(x, 2.8, z); R.add(cap); }
    // a heavy bag on a chain at the back left, a rack of wooden staffs at the back right
    { const bag = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.75, 8, 20), new THREE.MeshStandardMaterial({ color: "#2f2f32", roughness: 0.5 })); bag.position.set(-2.1, 1.35, -2.6); bag.castShadow = true; R.add(bag);
      const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.5, 6), post); ch.position.set(-2.1, 2.6, -2.6); R.add(ch); }
    for (let i = 0; i < 7; i++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.9, 8), new THREE.MeshStandardMaterial({ color: "#6a6a6e", roughness: 0.6 })); st.position.set(1.6 + i * 0.13, 1.0, -3.9); st.rotation.z = 0.06; st.castShadow = true; R.add(st); }
    // floating dust specks (white), like the reference
    const dg = new THREE.BufferGeometry(), dp: number[] = []; for (let i = 0; i < 260; i++) dp.push((rnd() - 0.5) * 6, rnd() * 3, -3 + rnd() * 5.5); dg.setAttribute("position", new THREE.Float32BufferAttribute(dp, 3));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: "#ffffff", size: 0.012, transparent: true, opacity: 0.7, depthWrite: false })); R.add(this.dust);
  }
  update(t: number) { this.dust.position.set(0.05 * Math.sin(t * 0.4), 0.03 * t, 0.04 * Math.cos(t * 0.3)); }
}

// ---------------- effects: glove smear ribbon, impact burst, spit droplets ----------------
class FX {
  smear: THREE.Mesh; burst: THREE.Group; drops: THREE.Mesh[] = [];
  constructor(R: THREE.Object3D) {
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(16 * 2 * 3), 3)); g.setAttribute("alpha", new THREE.Float32BufferAttribute(new Float32Array(32), 1));
    const idx: number[] = []; for (let i = 0; i < 15; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); g.setIndex(idx);
    this.smear = new THREE.Mesh(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: "attribute float alpha; varying float va; varying vec2 vp; void main(){ va = alpha; vp = position.xy * 40.0 + position.z * 23.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "varying float va; varying vec2 vp; void main(){ float s = fract(sin(dot(floor(vp * vec2(1.0, 9.0)), vec2(12.9898, 78.233))) * 43758.5453); gl_FragColor = vec4(0.06, 0.06, 0.07, va * (0.55 + 0.45 * step(0.35, s))); }" }));
    this.smear.frustumCulled = false; this.smear.renderOrder = 6; R.add(this.smear);
    this.burst = new THREE.Group(); R.add(this.burst);
    for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.2), transparent: true, depthTest: false, toneMapped: false })); m.renderOrder = 9; this.burst.add(m); }
    const dm = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.7, 1.9), toneMapped: false });
    for (let i = 0; i < 12; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), dm); d.visible = false; R.add(d); this.drops.push(d); }
  }
  setSmear(pts: THREE.Vector3[], widths: number[], alpha: number, cam: THREE.Camera) {
    const pos = this.smear.geometry.attributes.position as THREE.BufferAttribute, al = this.smear.geometry.attributes.alpha as THREE.BufferAttribute; const n = pts.length;
    this.smear.visible = alpha > 0.01 && n > 1; if (!this.smear.visible) return;
    for (let i = 0; i < 16; i++) { const k = Math.min(n - 1, Math.round((i / 15) * (n - 1))), p = pts[k], nx = pts[Math.min(n - 1, k + 1)].clone().sub(pts[Math.max(0, k - 1)]).normalize(), toCam = cam.position.clone().sub(p).normalize(), side = nx.cross(toCam).normalize().multiplyScalar(widths[k] / 2);
      pos.setXYZ(i * 2, p.x + side.x, p.y + side.y, p.z + side.z); pos.setXYZ(i * 2 + 1, p.x - side.x, p.y - side.y, p.z - side.z); const a = alpha * (i / 15) ** 1.5; al.setX(i * 2, a); al.setX(i * 2 + 1, a); }
    pos.needsUpdate = al.needsUpdate = true;
  }
}

// ---------------- scene ----------------
type K = Dojo & { red: Fighter; blue: Fighter; fx: FX };
const mk = () => {
  const D = new Dojo() as K; D.red = new Fighter({ color: "#d9625c", gloves: true }); D.blue = new Fighter({ color: "#4f86d8" }); D.root.add(D.red.root, D.blue.root); D.fx = new FX(D.root);
  // where Blue's jaw will be at the moment of impact -> Red's wrist target (glove centre one head-radius + glove away)
  poseBlue(D.blue, T_IMP, T_IMP); const hc = D.blue.world(headCenter(D.blue)).add(V(0, -0.035, 0));
  poseRed(D.red, 0); const hcR = D.red.local(hc), gcW = hcR.addScaledVector(HOOK_DIR, -0.165); HIT_TARGET = gcW.addScaledVector(HOOK_DIR, -0.075).add(V(0, 0.012, 0));
  return D as unknown as ReturnType<SceneDef["mk"]>;
};
const camShake = (t: number) => { const k = Math.exp(-Math.max(0, t - T_IMP) * 7) * (t > T_IMP ? 1 : 0); return V(noise(t * 30, 1) * 0.03 * k, noise(t * 30, 2) * 0.03 * k, 0); };
const act = (cx: Ctx) => {
  const t = cx.t, a = tm(t), K = cx.set as unknown as K; K.update(t);
  poseRed(K.red, a); poseBlue(K.blue, a, t);
  // camera shake (after the camera was placed this frame)
  const sh = camShake(t); cx.cam.position.add(sh); cx.cam.updateMatrixWorld();
  // smear: the glove's path over the last 0.07 s of the swing
  const sw = at(a, T_SWING + 0.02, T_IMP) * (1 - at(t, T_IMP + HS, T_IMP + HS + 0.08));
  if (sw > 0.01) { const pts: THREE.Vector3[] = [], ws: number[] = []; for (let i = 0; i < 12; i++) { const ti = Math.min(a, T_IMP) - 0.085 * (1 - i / 11); poseRed(K.red, ti); pts.push(K.red.world(gloveCenter(K.red, "L"))); ws.push(0.03 + 0.12 * (i / 11)); }
    poseRed(K.red, a); K.fx.setSmear(pts, ws, sw * 0.85, cx.cam); } else K.fx.setSmear([], [], 0, cx.cam);
  // impact burst: white spikes around the contact point, facing the camera
  const hb = t >= T_IMP && t < T_IMP + HS + 0.12, bu = clamp01((t - T_IMP) / (HS + 0.12)); K.fx.burst.visible = hb;
  if (hb) { const c = K.red.world(gloveCenter(K.red, "L")).addScaledVector(K.red.world(V(0, 0, 0)).sub(K.red.world(HOOK_DIR)).normalize(), 0.0); K.fx.burst.position.copy(c); K.fx.burst.quaternion.copy(cx.cam.quaternion);
    K.fx.burst.children.forEach((m, i) => { const ang = (i / 14) * Math.PI * 2 + 0.3 * Math.sin(i * 7.3), len = (0.16 + 0.22 * ((i * 37) % 10) / 10) * (0.6 + bu), r0 = 0.05 + 0.25 * bu;
      m.position.set(Math.cos(ang) * (r0 + len / 2), Math.sin(ang) * (r0 + len / 2), 0); m.rotation.z = ang; m.scale.set(len, 0.012 * (1 - bu) + 0.004, 1); ((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 1 - bu * bu; }); }
  // spit / sweat droplets flying off Blue's face along the punch
  const du = t - (T_IMP + HS * 0.5), hcB = K.blue.world(headCenter(K.blue)), dir = K.red.world(HOOK_DIR).sub(K.red.world(V())).normalize();
  K.fx.drops.forEach((d, i) => { d.visible = du > 0 && du < 0.7; if (!d.visible) return; const sp = 1.6 + ((i * 53) % 10) / 6, sp2 = V(((i * 17) % 7) / 7 - 0.5, ((i * 29) % 9) / 9 - 0.2, ((i * 13) % 5) / 5 - 0.5).multiplyScalar(0.9);
    d.position.copy(hcB).add(dir.clone().add(sp2).normalize().multiplyScalar(sp * du)).add(V(0, -2.6 * du * du, 0)); d.scale.setScalar(0.007 + 0.006 * ((i * 7) % 3) / 2); });
};
const SCENES: SceneDef[] = [{
  from: 0, to: END, mk, act, fog: "#a9abb0", dens: 0.045, bg: "#9a9ca2", cInf: 5, env: 0.15, exposure: 0.0, bloom: 0.5, sat: 0.0, contrast: 0.1,
  keys: [{ t: 0, pos: [0.3, 1.25, 3.7], look: [0.0, 1.05, 0.0], fov: 36 }, { t: T_IMP, pos: [0.27, 1.25, 3.5], look: [0.0, 1.05, 0.0], fov: 36 }, { t: END, pos: [0.0, 1.12, 3.45], look: [-0.22, 0.92, 0.0], fov: 36 }],
  focus: () => [0, 1.2, 0.05], fadeAt: (t) => (t >= T_IMP && t < T_IMP + 2 / 30 ? -0.18 : 0),
}];
const CLOSE = false ? [{ t: 0, pos: [-0.02, 1.9, 0.6] as [number, number, number], look: [-0.15, 1.45, 0.02] as [number, number, number], fov: 30 }] : null;
if (CLOSE) { SCENES[0].keys = CLOSE; SCENES[0].focus = () => [-0.1, 1.45, 0.1]; }
export const FightTest: React.FC = () => <Reel scenes={SCENES} />;
export { kick as _k, Q as _q };
