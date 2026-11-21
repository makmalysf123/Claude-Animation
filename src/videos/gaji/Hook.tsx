// "Gaji Naik Tapi Tetap Habis": three candidate FIRST FRAMES (3 s each) for the user to pick from. Lesson from the
// Ketindihan numbers (docs/style-references/rekap-standar-video.md section 10): the first second must be bright, the
// character clear and already in action. A = payday jump in a rain of notes; B = end of the month, instant noodles
// under the crossed-out calendar; C = running on a treadmill in the yard, money flying off the belt.
import * as THREE from "three";
import { TerasSet } from "../../lib/world2/teras";
import { actAt, Actor, FPS, clamp01 } from "../../lib/acting";
import { headCenter, handPoint, Limb, Pose } from "../../lib/toon2";
import { Reel, SceneDef, SetLike, handWorld } from "../../lib/scene";
import { DIKA } from "./cast";
import { BillRain, NoodleBowl, Treadmill, endOfMonthCalendar, drawEnvelope, drawForkNoodles, makeBill } from "./props";
import { canvasTex } from "../ketindihan2/sets";
import { hash } from "../../lib/acting";

const DAY = { fog: "#ecd8b4", dens: 0.018, bg: "#cfe0f2", cInf: 7, env: 0.42, exposure: 0.03 } as const;
type Extra = { blob?: THREE.Mesh; rain?: BillRain; bowl?: NoodleBowl; mill?: Treadmill; fly?: THREE.Mesh[] };
const ex = (s: SetLike) => s as unknown as SetLike & Extra;

// =============== A: GAJIAN! (0-3) ===============
const DIKA_JOY: Actor = { seed: 21, words: [{ w: "Gajian!", t0: 0.12, t1: 0.8, stress: true }], beats: [
  { t: 0, mood: "excited", arms: ["up", "up"], look: [0, -0.2] }, { t: 1.4, mood: "laugh", arms: ["up", "up"] }, { t: 2.3, mood: "excited", arms: ["open", "up"] }] };
const tuck = (P: Pose, k: number): Pose => ({ ...P, legs: P.legs.map((L, i) => { const s = i ? 1 : -1; return { a: [L.a[0] + s * 34 * k, L.a[1] - 70 * k], b: [L.b[0] + s * 22 * k, L.b[1] - 150 * k] } as Limb; }) as [Limb, Limb] });
const A: SceneDef = {
  from: 0, to: 3, ...DAY,
  mk: () => { const T = new TerasSet() as unknown as SetLike & Extra; T.rain = new BillRain(70, { x: [-1.3, 1.8], y: [0.4, 3.1], z: [2.4, 5.4] }, 0, 3); T.root.add(T.rain.group);
    T.blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, "rgba(40,22,20,0.6)"); gr.addColorStop(1, "rgba(40,22,20,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }), transparent: true, depthWrite: false }));
    T.blob.rotation.x = -Math.PI / 2; T.blob.position.set(0.25, 0.012, 2.9); T.root.add(T.blob); return T; },
  keys: [{ t: 0, pos: [0.9, 0.95, 6.5], look: [0.25, 1.2, 2.9], fov: 40 }, { t: 3, pos: [0.75, 0.98, 5.9], look: [0.25, 1.2, 2.9], fov: 40 }],
  focus: () => [0.25, 1.3, 2.9],
  act: ({ t, cam, set, card }) => {
    ex(set).rain!.update(t + 0.6);
    const hop = Math.abs(Math.sin((Math.PI * (t + 0.45)) / 0.95)), y = 0.34 * hop;
    const P = tuck(actAt(DIKA_JOY, t), clamp01((y - 0.04) / 0.2));
    const bl = ex(set).blob!, k = 1 - 0.45 * y / 0.34; bl.scale.set(0.75 * k, 0.38 * k, 1); (bl.material as THREE.MeshBasicMaterial).opacity = 0.5 + 0.5 * k;
    card(0).update(DIKA, P, 0.25, 2.9, cam, set.sunDir, 0.85, y, (g, Q) => { const [hx, hy] = handPoint(DIKA, Q, 1); drawEnvelope(g, hx, hy - 20, 0.2, 0.9); });
  },
};

// =============== B: akhir bulan, mi instan (3-6) ===============
const DIKA_MI: Actor = { seed: 22, words: [], beats: [{ t: 0, mood: "worried", arms: ["chest", "mouthHand"], look: [0, 0.1] }, { t: 1.6, mood: "nervous", arms: ["chest", "mouthHand"], look: [-0.5, -0.4] }, { t: 2.3, mood: "worried", look: [0, 0.1] }] };
const hpBox = () => {
  const tex = canvasTex(256, 256, (g) => { g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#1c1c22"; g.fillRect(0, 0, 256, 70); g.fillStyle = "#fff"; g.font = "bold 40px 'Helvetica Neue', Arial"; g.fillText("HP BARU", 36, 50); g.fillStyle = "#1c1c22"; g.beginPath(); g.roundRect(96, 92, 64, 132, 12); g.fill(); g.fillStyle = "#3a6fd8"; g.fillRect(102, 104, 52, 104); });
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.07), [0, 1, 2, 3, 4, 5].map((i) => new THREE.MeshStandardMaterial(i === 4 ? { map: tex, roughness: 0.55 } : { color: i === 2 ? "#f4f1ea" : "#1c1c22", roughness: 0.55 })));
  m.castShadow = m.receiveShadow = true; return m;
};
const B: SceneDef = {
  from: 3, to: 6, ...DAY,
  mk: () => {
    const T = new TerasSet() as unknown as SetLike & Extra;
    const cal = endOfMonthCalendar(); cal.position.set(-0.15, 1.95, 0.1); T.root.add(cal);
    const box = hpBox(); box.position.set(-0.72, 0.57, 1.05); box.rotation.y = 0.12; T.root.add(box);
    
    T.bowl = new NoodleBowl(); T.root.add(T.bowl.group); return T;
  },
  keys: [{ t: 0, pos: [0.6, 1.28, 4.75], look: [0.05, 1.3, 1.6], fov: 40 }, { t: 3, pos: [0.55, 1.28, 4.4], look: [0.05, 1.3, 1.6], fov: 40 }],
  focus: () => [0.3, 1.3, 2.35],
  act: ({ t, cam, set, card }) => {
    let P = actAt(DIKA_MI, t);
    const chew = Math.floor(t * 7) % 2; P = { ...P, mouth: { kind: chew ? "oo" : "pout", open: 0.3 } };
    const c = card(0);
    c.update(DIKA, P, 0.3, 2.35, cam, set.sunDir, 0.85, 0, (g, Q) => { const [hx, hy] = handPoint(DIKA, Q, 1), [cx, cy] = headCenter(DIKA, Q); drawForkNoodles(g, hx, hy, cx - 4, cy + DIKA.R * 0.42, t); });
    const h = handWorld(c, DIKA, P, 0), bowl = ex(set).bowl!; bowl.group.position.set(h.x + 0.03, h.y - 0.02, h.z + 0.09); bowl.update(t);
  },
};

// =============== C: lari di treadmill di halaman (6-9) ===============
const DIKA_RUN: Actor = { seed: 23, words: [], beats: [{ t: 0, mood: "scared", sweat: true, look: [-0.6, 0] }, { t: 1.5, mood: "nervous", sweat: true, look: [0.7, 0.3] }, { t: 2.2, mood: "scared", sweat: true, look: [-0.6, 0] }] };
const MILL: [number, number, number] = [0.1, 0, 3.1], YAW = 1.2;
const run = (P: Pose, t: number): Pose => {
  const ph0 = t * Math.PI * 2 * 2.2 + Math.PI / 2;
  const legs = [0, 1].map((k) => { const s = k ? 1 : -1, ph = ph0 + k * Math.PI, lift = Math.max(0, Math.sin(ph)); return { a: [s * (12 + 30 * lift), 118 - 78 * lift], b: [s * (6 + 14 * lift), -165 * lift] } as Limb; }) as [Limb, Limb];
  const arms = [0, 1].map((k) => { const s = k ? 1 : -1, u = 0.5 + 0.5 * Math.sin(ph0 + (1 - k) * Math.PI); return { a: [s * (30 + 12 * (1 - u)), 88 - 8 * u], b: [s * (48 - 60 * u), 132 - 122 * u] } as Limb; }) as [Limb, Limb];
  return { ...P, legs, arms, bob: P.bob - 16 * Math.abs(Math.sin(ph0)), body: { ...P.body, lean: P.body.lean + 0.06 } };
};
const C: SceneDef = {
  from: 6, to: 9, ...DAY,
  mk: () => {
    const T = new TerasSet() as unknown as SetLike & Extra;
    T.mill = new Treadmill(); T.mill.group.position.set(...MILL); T.mill.group.rotation.y = YAW; T.root.add(T.mill.group);
    T.fly = []; for (let i = 0; i < 40; i++) { const m = makeBill(); T.root.add(m); T.fly.push(m); }
    return T;
  },
  keys: [{ t: 0, pos: [1.25, 1.55, 6.9], look: [0.15, 1.0, 3.0], fov: 42 }, { t: 3, pos: [1.12, 1.52, 6.4], look: [0.15, 1.0, 3.0], fov: 42 }],
  focus: () => [0.1, 1.1, 3.1],
  act: ({ t, cam, set, card }) => {
    const E = ex(set); E.mill!.update(t, 1.4);
    card(0).update(DIKA, run(actAt(DIKA_RUN, t), t), MILL[0], MILL[2], cam, set.sunDir, 0.85, 0.175);
    // notes shoot off the back of the belt, tumble, and land flat behind the machine (pre-rolled so frame 0 is busy)
    const rear = new THREE.Vector3(0, 0.2, -0.95).applyAxisAngle(new THREE.Vector3(0, 1, 0), YAW).add(new THREE.Vector3(...MILL));
    const back = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), YAW);
    E.fly!.forEach((m, i) => {
      const born = -1.0 + i * 0.1, u = t - born; if (u < 0) { m.visible = false; return; } m.visible = true;
      const sp = 0.55 + 0.5 * hash(i * 3), side = (hash(i * 7) - 0.5) * 0.9, vy = 1.7 + 0.8 * hash(i * 5), T0 = (vy + Math.sqrt(vy * vy + 2 * 3.2 * 0.2)) / 3.2, ul = Math.min(u, T0);
      const drag = (1 - Math.exp(-1.6 * ul)) / 1.6, y = Math.max(0.004, 0.2 + vy * ul - 1.6 * ul * ul);
      m.position.copy(rear).addScaledVector(back, sp * drag).add(new THREE.Vector3(side * drag, 0, side * drag * 0.4)); m.position.y = y;
      if (u >= T0) { m.rotation.set(-Math.PI / 2, 0, hash(i) * 6); m.scale.set(1, 1, 0.3); } else { m.rotation.set(u * 7 + i, u * 4, u * 5); m.scale.set(1, 1, 1); }
    });
  },
};

export const HOOK_SCENES = [A, B, C];
export const HOOK_FRAMES = 9 * FPS;
export const GajiHook: React.FC = () => <Reel scenes={HOOK_SCENES} />;
