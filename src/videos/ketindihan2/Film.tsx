// "Satu Malam Ketindihan" (docs/scripts/ketindihan-v3-produksi.md), full film, 1080x1920, picture only (the SFX + music
// track is mixed in afterwards; narrator and subtitles are added by the user). Scenes overlap by XF frames and dissolve.
import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, BrightnessContrastEffect, HueSaturationEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect } from "postprocessing";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
// @ts-expect-error n8ao ships without types
import { N8AOPostPass } from "n8ao";
import { LensBlur } from "../bridge/lensblur";
import { NOINK } from "../bridge/ink";
import { TerasSet } from "../../lib/world2/teras";
import { ToonCard } from "../../lib/toonCard";
import { handPoint, headCenter, Pose } from "../../lib/toon2";
import { actAt, Actor, FPS, noise, sm, clamp01 } from "../../lib/acting";
import { BUDI, NARTI, PETUGAS, KUNTI, BAPAK, IBU, IBU2, BAYI, drawSosok } from "./cast";
import { RoomSet, drawGhost, LiveTex, canvasTex } from "./sets";
import { KampungSet } from "./kampung";
import { KamarSet } from "./kamar";
import { BrainHQ } from "./brainhq";
import { TamuSet, DapurSet, BayiSet } from "./rooms2";
import { drawScissors, drawBroom, drawPillow, drawRat, drawSweat, drawSheet, drawFaceSweat, raggedDress } from "./props2d";

const W = 1080, H = 1920, XF = 6;
type V3 = [number, number, number];
type SetLike = { root: THREE.Group; sunDir: THREE.Vector3; update: (t: number) => void };
type Key = { t: number; pos: V3; look: V3; fov?: number };
/** eased camera path through keys (t = arrival time); holds drift a few millimetres so nothing is ever frozen */
const camPath = (keys: Key[], t: number) => {
  let i = 0; while (i < keys.length - 1 && keys[i + 1].t <= t) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)], u = b === a ? 1 : sm((t - a.t) / (b.t - a.t));
  const L = (p: V3, q: V3) => p.map((v, k) => v + (q[k] - v) * u) as V3;
  const pos = L(a.pos, b.pos), look = L(a.look, b.look), d = 0.004;
  return { pos: [pos[0] + d * noise(t * 0.6, 1), pos[1] + d * noise(t * 0.7, 2), pos[2]] as V3, look, fov: (a.fov ?? 40) + ((b.fov ?? 40) - (a.fov ?? 40)) * u };
};
type Ctx = { t: number; cam: THREE.PerspectiveCamera; set: SetLike; card: (i: number) => ToonCard };
type SceneDef = { from: number; to: number; mk: () => SetLike; keys: Key[]; act: (c: Ctx) => void; fog: string; dens: number; bg: string; focus?: (t: number) => V3; cInf?: number; night?: boolean; env?: number; ao?: [number, number, number] };
/** one PMREM-filtered studio environment per GL context: soft reflections on every PBR surface */
const envCache = new WeakMap<THREE.WebGLRenderer, THREE.Texture>();

const Inner: React.FC<{ S: SceneDef }> = ({ S }) => {
  const f = useCurrentFrame(), t = f / FPS;
  const { camera, scene, gl } = useThree(); const cam = camera as THREE.PerspectiveCamera;
  const set = useMemo(() => S.mk(), [S]);
  let env = envCache.get(gl); if (!env) { const pm = new THREE.PMREMGenerator(gl); env = pm.fromScene(new RoomEnvironment(), 0.04).texture; envCache.set(gl, env); }
  scene.environment = env; scene.environmentIntensity = S.env ?? (S.night ? 0.12 : 0.35);
  gl.shadowMap.type = THREE.PCFSoftShadowMap;
  const cards = useMemo(() => new Map<number, ToonCard>(), [set]);
  const card = (i: number) => { let c = cards.get(i); if (!c) { c = new ToonCard(set.root); if (S.night) { c.shade = 1; (c.mesh.material as THREE.MeshBasicMaterial).color.setRGB(0.86, 0.88, 0.97); } else c.shade = 0.35; cards.set(i, c); } return c; };
  const post = useMemo(() => ({
    ao: (() => { const a = new N8AOPostPass(scene, camera, W, H); const [r, fo, k] = S.ao ?? [0.6, 0.5, 3.0]; Object.assign(a.configuration, { aoRadius: r, distanceFalloff: fo, intensity: k, gammaCorrection: false, halfRes: false, aoSamples: 16, denoiseSamples: 8 }); return a; })(),
    lens: new LensBlur({ maxCoC: 22, nearScale: 1.1 }),
    bloom: new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: S.night ? 0.8 : 0.55, luminanceThreshold: 0.9, luminanceSmoothing: 0.25, mipmapBlur: true, levels: 6, radius: 0.72 }),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), hue: new HueSaturationEffect({ saturation: S.night ? 0.02 : 0.1 }),
    bc: new BrightnessContrastEffect({ brightness: 0, contrast: 0.08 }), vig: new VignetteEffect({ offset: 0.32, darkness: S.night ? 0.62 : 0.5 }),
  }), [S]);
  scene.fog = new THREE.FogExp2(S.fog, S.dens); scene.background = new THREE.Color(S.bg);
  const c = camPath(S.keys, t);
  cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.fov = c.fov; cam.near = 0.05; cam.far = 300; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.layers.enable(NOINK);
  set.update(t); S.act({ t, cam, set, card });
  const fp = S.focus ? S.focus(t) : c.look; post.lens.focus = new THREE.Vector3(...fp).sub(cam.position).length(); post.lens.cInf = S.cInf ?? 6;
  return (
    <>
      <primitive object={set.root} dispose={null} />
      <EffectComposer multisampling={4}>
        <primitive object={post.ao} dispose={null} />
        <primitive object={post.lens.pre} dispose={null} /><primitive object={post.lens.main} dispose={null} />
        <primitive object={post.bloom} dispose={null} /><primitive object={post.tone} dispose={null} />
        <primitive object={post.hue} dispose={null} /><primitive object={post.bc} dispose={null} /><primitive object={post.vig} dispose={null} />
      </EffectComposer>
    </>
  );
};

// ---------------- helpers for poses ----------------
const eyesClosed = (P: Pose): Pose => ({ ...P, eyes: [{ kind: "closed" }, { kind: "closed" }] });
const withMouth = (P: Pose, kind: Pose["mouth"]["kind"], open = 0.8): Pose => ({ ...P, mouth: { kind, open } });
const sheetTex = (title: string, icon: (g: CanvasRenderingContext2D) => void) => canvasTex(300, 400, (g) => drawSheet(g, 300, 400, title, icon));
const iconJin = (g: CanvasRenderingContext2D) => { g.fillStyle = "#1a1622"; g.beginPath(); g.ellipse(0, -10, 55, 90, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#fff"; for (const x of [-20, 20]) { g.beginPath(); g.arc(x, -40, 11, 0, Math.PI * 2); g.fill(); } };
const icons: [string, (g: CanvasRenderingContext2D) => void][] = [
  ["KURANG TIDUR", (g) => { g.fillStyle = "#e8e2d4"; g.fillRect(-80, -20, 160, 50); g.strokeStyle = "#2b1a26"; g.lineWidth = 6; g.strokeRect(-80, -20, 160, 50); g.beginPath(); g.arc(40, -60, 32, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); g.stroke(); g.beginPath(); g.moveTo(40, -60); g.lineTo(40, -80); g.moveTo(40, -60); g.lineTo(55, -60); g.stroke(); }],
  ["STRES", (g) => { g.fillStyle = "#6b7280"; g.beginPath(); g.ellipse(0, -30, 80, 45, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#ffd84a"; g.beginPath(); g.moveTo(-10, 0); g.lineTo(15, 0); g.lineTo(-5, 40); g.lineTo(20, 40); g.lineTo(-20, 90); g.lineTo(0, 50); g.lineTo(-25, 50); g.closePath(); g.fill(); }],
  ["TELENTANG", (g) => { g.fillStyle = "#e8e2d4"; g.fillRect(-100, 10, 200, 40); g.fillStyle = "#fff"; g.beginPath(); g.arc(-60, -5, 28, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#2b1a26"; g.lineWidth = 6; g.stroke(); g.fillStyle = "#b8423c"; g.fillRect(-30, -10, 120, 25); }],
  ["JADWAL KACAU", (g) => { g.fillStyle = "#fff"; g.fillRect(-70, -80, 140, 130); g.strokeStyle = "#2b1a26"; g.lineWidth = 6; g.strokeRect(-70, -80, 140, 130); g.fillStyle = "#b8312c"; g.fillRect(-70, -80, 140, 30); g.strokeStyle = "#d61e28"; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-60 + i * 25, -40); g.lineTo(-45 + i * 22, 30); g.stroke(); } }],
];

// =============== S1: hook, the night kampung from above (0.0-7.0) ===============
const S1: SceneDef = {
  from: 0, to: 7.0, night: true, fog: "#141c3a", dens: 0.014, bg: "#0b1230", cInf: 0, env: 0.08, ao: [1.2, 1.0, 3.0],
  mk: () => new KampungSet(),
  keys: [
    { t: 0, pos: [15, 24, 34], look: [0, 0, 3], fov: 42 }, { t: 3.0, pos: [6, 11.5, 21], look: [0.5, 1, 3], fov: 40 }, { t: 4.3, pos: [1.4, 5.6, 15.2], look: [0.8, 1.4, 2.5], fov: 41 },
    { t: 5.6, pos: [2.6, 2.1, 9.6], look: [1.2, 1.6, 2.2], fov: 42 }, { t: 6.95, pos: [2.4, 1.75, 7.0], look: [1.2, 1.55, 2.1], fov: 42 },
  ],
  act: ({ t, cam, set, card }) => {
    const A = set as unknown as KampungSet;
    A.ghostSpots.slice(0, 12).forEach((p, i) => {
      const t0 = 1.3 + i * 0.13, k = t < t0 ? 0 : Math.min(1.15, 1.15 * sm((t - t0) / 0.12)) - 0.15 * sm((t - t0 - 0.12) / 0.15);
      const bob = 0.15 * Math.sin(t * 2.2 + i);
      if (k > 0.01) card(i).custom((g) => drawGhost(g, k), p[0], p[2], cam, A.sunDir, 1.1, p[1] - 1 + bob); else card(i).setVisible(false);
    });
  },
};

// =============== S2: 3 a.m., the bedroom (7.0-16.4) ===============
// Budi's head is a billboard card on the pillow (drawn head-only, so the 3D blanket can never be crossed), lit by the
// moon through the side window: cool light from the window side, deep blue on the far side, a soft window-bar stripe.
const BUDI_NIGHT: Actor = { seed: 3, words: [], beats: [
  { t: 0, mood: "neutral", arms: ["rest", "rest"] }, { t: 1.0, mood: "shock", look: [0, 0], event: "shockSmall" }, { t: 1.25, mood: "scared", look: "dart" },
  { t: 5.0, mood: "nervous", sweat: true, look: [0.15, 0.4] }, { t: 6.6, mood: "scared", sweat: true, look: [0, 0.5] }, { t: 7.6, mood: "scared", sweat: true, look: [0, 0.6] } ] };
const UPHEAD = new THREE.Vector3(0, 1, -0.15).normalize();
/** the figure: our own character shape (head, body, arms, legs) filled solid black, red glowing eyes, a cold moon rim */
const SOSOK = { ...BUDI, R: 128, bodyH: 300, legLen: 380, hat: "none" as const, moustache: undefined, hair: undefined };
const sosokPaint = (g: CanvasRenderingContext2D, Q: Pose, eyes: number) => {
  const [hx, hy] = headCenter(SOSOK, Q), R = SOSOK.R;
  g.save(); g.globalCompositeOperation = "source-atop"; g.fillStyle = "#050508"; g.fillRect(0, 0, 600, 1000);
  const rim = g.createLinearGradient(80, 0, 330, 0); rim.addColorStop(0, "rgba(120,150,255,0.55)"); rim.addColorStop(0.25, "rgba(60,80,160,0.12)"); rim.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = rim; g.fillRect(0, 0, 600, 1000); g.restore();
  for (const s2 of [-1, 1]) { const x = hx + s2 * R * 0.36, y = hy - R * 0.05; g.save(); g.shadowColor = "#ff1a0a"; g.shadowBlur = 30 * (0.3 + eyes); g.fillStyle = `rgba(255,${40 + 60 * eyes},20,${0.35 + 0.65 * eyes})`;
    g.beginPath(); g.ellipse(x, y, R * 0.16, R * 0.11 * (0.35 + 0.65 * eyes), s2 * 0.25, 0, Math.PI * 2); g.fill(); g.fillStyle = `rgba(255,230,200,${eyes})`; g.beginPath(); g.ellipse(x, y, R * 0.05, R * 0.04 * eyes, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
};
const SOSOK_A: Actor = { seed: 77, words: [], beats: [{ t: 0, mood: "neutral", arms: ["rest", "rest"], look: [0, 0] }, { t: 7.6, mood: "neutral", arms: ["point", "point"], lean: 0.08 }, { t: 8.6, mood: "neutral", arms: ["point", "point"], lean: 0.12, nod: 0.4 }] };
/** moonlight on a 2D head: light from the window side, cool shadow on the far side, a faint bar shadow */
export const moonlit = (g: CanvasRenderingContext2D, cx: number, cy: number, R: number, side: number, k = 1, bars = true) => {
  g.save(); g.globalCompositeOperation = "source-atop";
  const gr = g.createLinearGradient(cx - side * R * 1.3, cy - R * 0.4, cx + side * R * 1.3, cy + R * 0.4);
  gr.addColorStop(0, `rgba(190,210,255,${0.10 * k})`); gr.addColorStop(0.45, `rgba(60,80,150,${0.12 * k})`); gr.addColorStop(1, `rgba(14,18,52,${0.55 * k})`);
  g.fillStyle = gr; g.fillRect(cx - R * 2, cy - R * 2, R * 4, R * 4);
  if (bars) { g.fillStyle = `rgba(16,20,60,${0.1 * k})`; for (const o of [-0.45]) { g.beginPath(); g.moveTo(cx + o * R - R * 2, cy - R * 2); g.lineTo(cx + o * R - R * 2 + R * 0.14, cy - R * 2); g.lineTo(cx + o * R + R * 2 + R * 0.14, cy + R * 2); g.lineTo(cx + o * R + R * 2, cy + R * 2); g.fill(); } }
  g.restore();
};
// in bed: no peci; the head card LIES on the pillow, tilted up 34 degrees toward the foot of the bed, its centre above
// the pillow surface so the pillow can never cut it; the shoulders go under the blanket cuff
const BUDI_BED = { ...BUDI, hat: "none" as const };
const headOnPillow = (card: ToonCard, P: Pose, cam: THREE.PerspectiveCamera, sun: THREE.Vector3, at: V3, scale: number, light = 1) => {
  const [hx, hy] = headCenter(BUDI_BED, P);
  card.update(BUDI_BED, P, 0, 0, cam, sun, scale, 0, (g) => { g.clearRect(0, hy + BUDI.R * 1.55, 600, 1000); moonlit(g, hx, hy, BUDI.R, -1, light, false); });
  card.setVisible(true); const tilt = 0.6, m = card.mesh;
  m.rotation.order = "XYZ"; m.rotation.set(-(Math.PI / 2 - tilt), 0, 0); m.scale.setScalar(scale); m.updateMatrix();
  const up = new THREE.Vector3(0, Math.sin(tilt), -Math.cos(tilt)), right = new THREE.Vector3(1, 0, 0);
  m.position.set(at[0], at[1], at[2]).addScaledVector(up, -(975 - hy) * 0.00216 * scale).addScaledVector(right, -(hx - 300) * 0.00216 * scale);
  card.shadow.visible = false; card.contact.visible = false;
};
/** heartbeat lub-dub under the blanket: the same beat times as the sound (9.0 s global = 2.0 s local, 70 -> 130 bpm) */
const beatLift = (t: number) => { let v = 0, tb = 2.0; while (tb < Math.min(t, 8.85)) { const bpm = 70 + 60 * (tb - 2.0) / 6.8, k = 0.6 + 0.4 * (tb - 2.0) / 6.8; const u = t - tb, u2 = u - 0.17; v += k * (Math.exp(-u / 0.07) * (1 - Math.exp(-u / 0.012)) * 0.016 + (u2 > 0 ? Math.exp(-u2 / 0.07) * (1 - Math.exp(-u2 / 0.012)) * 0.01 : 0)); tb += 60 / bpm; } return v; };
const S2: SceneDef = {
  from: 7.0, to: 16.4, night: true, fog: "#101830", dens: 0.01, bg: "#05060c", cInf: 8, env: 0.06, ao: [0.35, 0.3, 3.2],
  mk: () => new KamarSet() as unknown as SetLike,
  keys: [
    { t: 0, pos: [1.22, 2.02, -1.2], look: [1.25, 2.0, -1.93], fov: 34 }, { t: 0.93, pos: [1.23, 2.01, -1.32], look: [1.25, 2.0, -1.93], fov: 34 },
    { t: 0.96, pos: [0.35, 1.42, -0.62], look: [-0.6, 0.78, -1.45], fov: 38 }, { t: 5.42, pos: [0.28, 1.38, -0.75], look: [-0.6, 0.78, -1.47], fov: 37 },
    { t: 5.45, pos: [-0.6, 1.06, -1.72], look: [-0.6, 0.86, 0.5], fov: 52 }, { t: 6.57, pos: [-0.6, 1.05, -1.68], look: [-0.6, 0.86, 0.5], fov: 51 },
    { t: 6.6, pos: [-0.12, 1.32, -0.92], look: [-0.6, 0.8, -1.6], fov: 34 }, { t: 7.57, pos: [-0.15, 1.3, -0.98], look: [-0.6, 0.8, -1.6], fov: 33 },
    { t: 7.6, pos: [-0.6, 1.06, -1.72], look: [-0.6, 1.0, 0.5], fov: 54 }, { t: 9.4, pos: [-0.6, 1.02, -1.66], look: [-0.6, 1.45, 0.5], fov: 56 },
  ],
  focus: (t) => (t < 0.95 ? [1.25, 2.0, -1.93] : (t > 5.45 && t < 6.6) || t > 7.6 ? [-0.6, 1.1, 0.35] : [-0.6, 0.74, -1.5]),
  act: ({ t, cam, set, card }) => {
    const R = set as unknown as KamarSet; R.setClock(3, 0, t + 2);
    let P = actAt(BUDI_NIGHT, t); if (t < 1.0) P = eyesClosed(P);
    if (t > 5.0) P = withMouth(P, "zigzag", 0.5);
    const shake = t > 5.0 ? (Math.floor(t * 15) % 2 ? 1 : -1) * 0.0025 : 0;
    const pov = (t > 5.45 && t < 6.6) || t > 7.6;
    if (pov) card(0).setVisible(false); else headOnPillow(card(0), P, cam, R.sunDir, [R.pillowHead[0] + shake, R.pillowHead[1], R.pillowHead[2]], 0.5);
    R.setChest(0.012 * Math.sin(t * (t > 1 ? 4.2 : 1.8)) + beatLift(t));
    // the figure at the foot of the bed: fades in, then leans in over him; its eyes open (8.2), it tilts its head
    const fa = sm((t - 5.6) / 0.7), eyes = t < 8.2 ? 0 : t < 8.8 ? 1 : t < 9.0 ? 1 - (t - 8.8) / 0.2 : 0, near = sm((t - 7.6) / 1.4);
    if (fa > 0.01 && pov) { const SP = actAt(SOSOK_A, t); const Q: Pose = { ...SP, head: { ...SP.head, rot: SP.head.rot - 0.12 * sm((t - 8.3) / 0.6) } }; const c1 = card(1); c1.update(SOSOK, Q, -0.6, 0.45 - 0.3 * near, cam, R.sunDir, 0.92 + 0.05 * near, 0, (g) => sosokPaint(g, Q, Math.max(eyes, 0.0))); const mm = c1.mesh.material as THREE.MeshBasicMaterial, want = fa < 0.999; if (mm.transparent !== want) { mm.transparent = want; mm.alphaTest = want ? 0.02 : 0.5; mm.needsUpdate = true; } mm.opacity = fa; } else card(1).setVisible(false);
  },
};

// =============== S3a: morning, the phone search (16.4-20.0) ===============
// shot 1: his point of view, the screen faces him (typing, then the answer); shot 2: from the front, we see the phone's
// back and the cold screen light on his face
const phoneTex = new Map<string, LiveTex>();
const phoneGlow = (g: CanvasRenderingContext2D, cx: number, cy: number, R: number, k: number) => {
  g.save(); g.globalCompositeOperation = "source-atop"; const gr = g.createLinearGradient(cx, cy + R * 1.2, cx, cy - R * 0.9);
  gr.addColorStop(0, `rgba(170,215,255,${0.5 * k})`); gr.addColorStop(0.35, `rgba(140,190,255,${0.26 * k})`); gr.addColorStop(0.7, `rgba(110,150,230,${0.08 * k})`); gr.addColorStop(1, "rgba(110,150,230,0)"); g.fillStyle = gr; g.fillRect(cx - R * 2, cy - R * 2, R * 4, R * 4); g.restore();
};
const S3a: SceneDef = {
  from: 16.4, to: 21.0, fog: "#e6cfa6", dens: 0.022, bg: "#d8e2ec", cInf: 9,
  mk: () => {
    const T = new TerasSet(), lt = new LiveTex(540, 1080); phoneTex.set("p", lt);
    const ph = new THREE.Group(); ph.position.set(0.0, 1.1, 3.02);
    const rb = (w: number, h: number, d: number, r: number, m: THREE.Material) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), m);
    const frameM = new THREE.MeshStandardMaterial({ color: "#5a5f68", metalness: 1, roughness: 0.3, envMapIntensity: 0.5 }), backM = new THREE.MeshPhysicalMaterial({ color: "#121822", metalness: 0.2, roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.2, envMapIntensity: 0.35 });
    ph.add(rb(0.075, 0.156, 0.0085, 0.009, frameM));
    const back = rb(0.0715, 0.1525, 0.002, 0.008, backM); back.position.z = 0.0038; ph.add(back);
    const bump = rb(0.03, 0.032, 0.003, 0.006, new THREE.MeshPhysicalMaterial({ color: "#253246", roughness: 0.2, clearcoat: 1 })); bump.position.set(-0.019, 0.055, 0.0055); ph.add(bump);
    for (const [x, y] of [[-0.026, 0.062], [-0.012, 0.062], [-0.026, 0.048]] as [number, number][]) { const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.0052, 0.0052, 0.002, 24), frameM); ring.rotation.x = Math.PI / 2; ring.position.set(x, y, 0.0072); ph.add(ring); const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.0038, 0.0038, 0.0022, 24), new THREE.MeshPhysicalMaterial({ color: "#05070c", roughness: 0.02, clearcoat: 1, metalness: 0.4 })); lens.rotation.x = Math.PI / 2; lens.position.set(x, y, 0.0075); ph.add(lens); }
    const flash = new THREE.Mesh(new THREE.CircleGeometry(0.0022, 16), new THREE.MeshStandardMaterial({ color: "#f2ead0", emissive: "#3a3020" })); flash.position.set(-0.012, 0.048, 0.0071); ph.add(flash);
    for (const [y, h] of [[0.035, 0.018], [0.01, 0.012]] as [number, number][]) { const btn = rb(0.0015, h, 0.003, 0.0007, frameM); btn.position.set(0.0383, y, 0); ph.add(btn); }
    const bez = new THREE.Mesh(new THREE.PlaneGeometry(0.0715, 0.1525), new THREE.MeshStandardMaterial({ color: "#050507", roughness: 0.1 })); bez.position.z = -0.0044; bez.rotation.y = Math.PI; ph.add(bez);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.148), new THREE.MeshBasicMaterial({ map: lt.tex, toneMapped: false, color: new THREE.Color(0.8, 0.82, 0.86) })); scr.position.z = -0.0046; scr.rotation.y = Math.PI; ph.add(scr);
    const glow = new THREE.PointLight("#bcd8ff", 1.0, 1.0, 2); glow.position.set(0, 0.0, -0.08); ph.add(glow);
    ph.traverse((k) => { if ((k as THREE.Mesh).isMesh) k.castShadow = true; });
    // his arms in the point-of-view shot: long ink arms from below the frame, ball hands gripping the sides, thumbs on the glass
    const inkM = new THREE.MeshBasicMaterial({ color: "#2b1a26" }), arms = new THREE.Group();
    for (const s2 of [-1, 1]) { const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(s2 * 0.2, 0.86, 2.72), new THREE.Vector3(s2 * 0.12, 0.98, 2.92), new THREE.Vector3(s2 * 0.048, 1.075, 3.0)]); arms.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.0055, 8), inkM));
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.013, 18, 14), inkM); hand.position.set(s2 * 0.043, 1.075, 3.008); arms.add(hand);
      const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 14, 10), inkM); thumb.position.set(s2 * 0.03, 1.058, 2.997); thumb.scale.set(1, 1.5, 0.7); arms.add(thumb); }
    const grip = new THREE.Group(); for (const s2 of [-1, 1]) { const hd = new THREE.Mesh(new THREE.SphereGeometry(0.0135, 18, 14), inkM); hd.position.set(s2 * 0.036, -0.038, 0.009); hd.scale.set(0.8, 1.15, 0.7); grip.add(hd); const fg = new THREE.Mesh(new THREE.CapsuleGeometry(0.005, 0.02, 6, 10), inkM); fg.rotation.z = Math.PI / 2; fg.position.set(s2 * 0.026, -0.02, 0.0065); grip.add(fg); } ph.add(grip); (T as unknown as { grip: THREE.Group }).grip = grip;
    T.root.add(ph, arms); (T as unknown as { phone: THREE.Group; arms: THREE.Group }).phone = ph; (T as unknown as { arms: THREE.Group }).arms = arms; return T as unknown as SetLike;
  },
  keys: [{ t: 0, pos: [0.0, 1.36, 2.82], look: [0, 1.1, 3.02], fov: 36 }, { t: 3.37, pos: [0.0, 1.33, 2.86], look: [0, 1.1, 3.02], fov: 33 },
    { t: 3.4, pos: [0.12, 1.22, 4.55], look: [0.0, 1.18, 2.8], fov: 34 }, { t: 4.6, pos: [0.1, 1.22, 4.4], look: [0.0, 1.2, 2.8], fov: 33 }],
  focus: (t) => (t < 3.4 ? [0, 1.1, 3.02] : [0, 1.25, 2.75]),
  act: ({ t, cam, set, card }) => {
    const q = "kenapa ketindihan?", n = Math.min(q.length, Math.floor(Math.max(0, t - 0.25) * 9));
    phoneTex.get("p")!.draw("q" + n + (t > 2.5 ? "r" : "") + (Math.floor(t * 4) % 2), (g, w, h) => {
      g.fillStyle = "#f4f6fa"; g.fillRect(0, 0, w, h); g.fillStyle = "#1a73e8"; g.fillRect(0, 0, w, 150); g.fillStyle = "#fff"; g.font = "600 24px 'Helvetica Neue', Arial"; g.fillText("03.07", 30, 36); g.fillText("4G  82%", w - 130, 36); g.font = "bold 44px 'Helvetica Neue', Arial"; g.fillText("Cari", 34, 112);
      g.fillStyle = "#000"; g.beginPath(); g.roundRect(w / 2 - 50, 10, 100, 30, 15); g.fill();
      g.fillStyle = "#fff"; g.strokeStyle = "#b9c3d6"; g.lineWidth = 5; g.beginPath(); g.roundRect(26, 160, w - 52, 90, 45); g.fill(); g.stroke();
      g.fillStyle = "#1b1d24"; g.font = "40px 'Helvetica Neue', Arial"; g.fillText(q.slice(0, n) + (Math.floor(t * 4) % 2 ? "|" : ""), 60, 220);
      if (t > 2.5) { g.fillStyle = "#1a3d8a"; g.font = "bold 50px 'Helvetica Neue', Arial"; g.fillText("Sleep paralysis", 40, 350); g.fillStyle = "#555"; g.font = "31px 'Helvetica Neue', Arial"; ["Otak sudah bangun, tapi", "otot masih terkunci", "seperti saat mimpi.", "", "Pemicu: kurang tidur,", "stres, tidur telentang,", "jadwal tidur kacau."].forEach((l, i) => g.fillText(l, 40, 410 + i * 46)); }
      else { g.fillStyle = "#c8ccd6"; for (let i = 0; i < 3; i++) g.fillRect(40, 320 + i * 70, w - 80 - i * 90, 26); }
      // keyboard
      if (t < 2.5) { g.fillStyle = "#d9dce3"; g.fillRect(0, h - 380, w, 380); g.fillStyle = "#fff"; for (let r = 0; r < 4; r++) for (let c2 = 0; c2 < 10; c2++) { g.beginPath(); g.roundRect(8 + c2 * 53, h - 365 + r * 88, 46, 74, 8); g.fill(); } }
    });
    const ph = (set as unknown as { phone: THREE.Group }).phone;
    const P = actAt({ seed: 3, words: [], beats: [{ t: 0, mood: "whisper", arms: ["chest", "chest"], look: [0, 0.6] }, { t: 3.4, mood: "surprised", arms: ["chest", "chest"], look: [0, 0.5], event: "shockSmall" }] }, t);
    const arms = (set as unknown as { arms: THREE.Group }).arms;
    const grip = (set as unknown as { grip: THREE.Group }).grip; grip.visible = t >= 3.4;
    if (t < 3.4) { card(0).setVisible(false); arms.visible = true; ph.position.set(0, 1.1, 3.02); ph.rotation.set(0.55, 0, 0); ph.scale.setScalar(1); }
    else {
      arms.visible = false; const [hx, hy] = headCenter(BUDI, P); const c0 = card(0); c0.update(BUDI, P, 0, 2.75, cam, set.sunDir, 0.85, 0, (g) => phoneGlow(g, hx, hy, BUDI.R, 1));
      // the phone sits exactly between his two hands (card space -> world), the screen toward his face
      c0.mesh.updateMatrixWorld(); const hp = (i: 0 | 1) => { const [x, y] = handPoint(BUDI, P, i); return c0.mesh.localToWorld(new THREE.Vector3((x - 300) * 0.00216, (975 - y) * 0.00216, 0)); };
      const mid = hp(0).add(hp(1)).multiplyScalar(0.5); ph.position.set(mid.x, mid.y + 0.03, mid.z + 0.05); ph.rotation.set(-0.3, 0, 0); ph.scale.setScalar(1.45);
    }
  },
};

// =============== S3b: inside the head, the levers (20.0-27.0) ===============
// wide: the eyes are shut (lids down); the operator, on his step stool, pulls SADAR -> the eye lids lift (Budi wakes);
// sleep paralysis seen from inside: ALARM. The left eye already shows the real room (the figure at the bed), the right
// eye is still dreaming. The operator panics: mashes buttons, yanks the OTOT lever with both hands - chained, locked,
// it won't move. Then the terminal: SADAR ON, OTOT LOCKED, and the triggers, one per "ting".
const PET_PANIC: Actor = { seed: 11, words: [], beats: [{ t: 0, mood: "scared", arms: ["point", "chest"], sweat: true, look: "dart" }, { t: 0.4, arms: ["chest", "point"] }, { t: 0.75, arms: ["point", "chest"] }, { t: 1.1, arms: ["chest", "point"] },
  { t: 1.6, mood: "angry", arms: ["rest", "up"], sweat: true, lean: -0.02 }, { t: 2.2, mood: "angry", arms: ["rest", "up"], lean: -0.04, event: "shockSmall" }, { t: 2.7, mood: "scared", arms: ["rest", "up"], lean: -0.02 },
  { t: 3.4, mood: "nervous", arms: ["point", "chest"], sweat: true, turn: -0.3 }, { t: 3.8, mood: "nervous", arms: ["point", "chest"], event: "shockSmall" }, { t: 4.4, arms: ["point", "chest"] }, { t: 5.0, mood: "scared", arms: ["point", "hug"] }] };
const stool = () => { const g = new THREE.Group(); const m = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.42, 0.4, 3, 0.03), new THREE.MeshStandardMaterial({ color: "#e0a020", roughness: 0.45, metalness: 0.2 })); m.position.y = 0.21; m.castShadow = m.receiveShadow = true; g.add(m); for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.02, 0.06), new THREE.MeshStandardMaterial({ color: "#222" })); st.position.set(0, 0.3 + s * 0.06, 0.205); g.add(st); } return g; };
const S3b: SceneDef = {
  from: 21.0, to: 27.0, fog: "#1a1d2c", dens: 0.012, bg: "#10131c", cInf: 6, env: 0.25, ao: [0.6, 0.5, 3.0],
  mk: () => { const B = new BrainHQ(); const st = stool(); st.position.set(0.24, 0, -2.87); B.root.add(st); (B as unknown as { stool: THREE.Group }).stool = st; return B as unknown as SetLike; },
  keys: [{ t: 0, pos: [0, 2.4, 2.4], look: [0, 1.85, -4.5], fov: 54 }, { t: 1.57, pos: [0.05, 2.35, 2.0], look: [0, 1.85, -4.5], fov: 53 },
    { t: 1.6, pos: [1.15, 1.7, -1.05], look: [0.38, 1.22, -3.2], fov: 50 }, { t: 3.37, pos: [1.1, 1.7, -1.15], look: [0.38, 1.22, -3.2], fov: 49 },
    { t: 3.4, pos: [-1.75, 1.75, -1.12], look: [-4.2, 1.6, -2.9], fov: 52 }, { t: 6.0, pos: [-1.85, 1.75, -1.2], look: [-4.2, 1.6, -2.9], fov: 51 }],
  focus: (t) => (t < 1.6 ? [0, 1.8, -3.5] : t < 3.4 ? [0.4, 1.2, -2.9] : [-3.9, 1.7, -2.7]),
  act: ({ t, cam, set, card }) => {
    const B = set as unknown as BrainHQ;
    B.leverSadar.rotation.x = 0.55; // already ON: the brain is awake
    const yank = t > 1.9 && t < 3.3 ? Math.abs(Math.sin((t - 1.9) * 9)) : 0; B.leverOtot.rotation.x = -0.55 + 0.07 * yank; B.lock.rotation.z = yank > 0 ? 0.18 * Math.sin(t * 55) : 0;
    B.setLids(0); B.setEyes("split", t); B.setAlarm(t < 3.4 ? 1 : 0.5, t);
    B.setMonitor(t < 3.8 ? 0 : t < 4.4 ? 1 : t < 5.0 ? 2 : 3, t, true); B.setScreen("", 1, t);
    B.pressButtons(t < 1.6 ? t : -1);
    if (t < 1.6) card(0).update(PETUGAS, actAt(PET_PANIC, t), -0.15, -2.75, cam, B.sunDir, 0.8, 0);
    else if (t < 3.4) { // slide him sideways (on screen) until his raised right hand sits exactly on the OTOT ball
      const P = actAt(PET_PANIC, t), c0 = card(0), ball = new THREE.Vector3(); B.leverOtot.updateMatrixWorld(); B.leverOtot.localToWorld(ball.set(0, 0.32, 0));
      let x = 0.24; for (let it = 0; it < 3; it++) { c0.update(PETUGAS, P, x, -2.87, cam, B.sunDir, 0.8, 0.42); c0.mesh.updateMatrixWorld(); const [hx, hy] = handPoint(PETUGAS, P, 1);
        const hw = c0.mesh.localToWorld(new THREE.Vector3((hx - 300) * 0.00216, (975 - hy) * 0.00216, 0)); const a = hw.clone().project(cam), b2 = ball.clone().project(cam), dist = hw.distanceTo(cam.position);
        x += (b2.x - a.x) * dist * Math.tan((cam.fov * Math.PI) / 360) * cam.aspect; }
      (B as unknown as { stool: THREE.Group }).stool.position.x = x; }
    else card(0).update(PETUGAS, actAt(PET_PANIC, t), -3.3, -2.2, cam, B.sunDir, 0.8);
  },
};

// =============== S4: the porch, telling Bu Narti (27.0-38.0) ===============
const BUDI_TALK: Actor = { seed: 3, words: [{ w: "Ah,", t0: 5.9, t1: 6.2 }, { w: "perasaan", t0: 6.3, t1: 6.9 }, { w: "saya", t0: 6.95, t1: 7.2 }, { w: "nggak", t0: 7.25, t1: 7.55, stress: true }, { w: "kecapekan,", t0: 7.6, t1: 8.3 }, { w: "kok.", t0: 8.35, t1: 8.7 }],
  beats: [{ t: 0, mood: "story", arms: ["rest", "open"], turn: 0.35, look: [0.5, 0] }, { t: 2.6, mood: "surprised", arms: ["rest", "chest"] }, { t: 5.6, mood: "smug", arms: ["rest", "fixhat"], turn: 0.3 }, { t: 8.9, mood: "worried", arms: ["chest", "rest"], look: [0.6, 0] }, { t: 9.7, mood: "surprised", arms: ["rest", "rest"], nod: 0.7 }] };
const NARTI_TALK: Actor = { seed: 9, words: [{ w: "Wah,", t0: 2.65, t1: 2.95 }, { w: "itu", t0: 3.0, t1: 3.2 }, { w: "ada", t0: 3.25, t1: 3.45 }, { w: "yang", t0: 3.5, t1: 3.7 }, { w: "nindih,", t0: 3.75, t1: 4.2, stress: true }, { w: "Pak!", t0: 4.3, t1: 4.6, stress: true }],
  beats: [{ t: 0, mood: "suspicious", arms: ["hip", "hip"], turn: -0.35, look: [-0.6, 0] }, { t: 2.5, mood: "excited", arms: ["point", "hip"] }, { t: 5.2, mood: "smug", arms: ["hip", "hip"], look: [-0.7, 0] }, { t: 9.6, mood: "excited", arms: ["clasp", "clasp"] }] };
const S4: SceneDef = {
  from: 27.0, to: 38.0, fog: "#e6cfa6", dens: 0.022, bg: "#d8e2ec", cInf: 7,
  mk: () => new TerasSet() as unknown as SetLike,
  keys: [{ t: 0, pos: [0.35, 1.25, 7.0], look: [0, 1.08, 2.75], fov: 38 }, { t: 2.5, pos: [0.3, 1.24, 6.7], look: [0, 1.08, 2.75], fov: 38 },
    { t: 2.75, pos: [-1.35, 1.32, 5.35], look: [0.25, 1.12, 2.85], fov: 40 }, { t: 4.9, pos: [-1.3, 1.31, 5.2], look: [0.25, 1.12, 2.85], fov: 39 },
    { t: 5.6, pos: [1.45, 1.32, 5.3], look: [-0.25, 1.12, 2.75], fov: 40 }, { t: 8.9, pos: [1.38, 1.31, 5.12], look: [-0.25, 1.12, 2.75], fov: 39 },
    { t: 9.8, pos: [0.35, 1.25, 6.9], look: [0, 1.08, 2.75], fov: 38 }, { t: 11, pos: [0.3, 1.24, 6.55], look: [0, 1.08, 2.75], fov: 38 }],
  focus: (t) => (t > 2.6 && t < 5.4 ? [0.43, 1.1, 2.9] : t > 5.4 && t < 9.4 ? [-0.43, 1.1, 2.75] : [0, 1.1, 2.75]),
  act: ({ t, cam, set, card }) => {
    let PB = actAt(BUDI_TALK, t); if (t > 7.6 && t < 8.3) PB = { ...withMouth(PB, "laugh", 1.0), eyes: [{ kind: "squeeze" }, { kind: "squeeze" }] }; // yawns while saying he is not tired
    card(0).update(BUDI, PB, -0.43, 2.75, cam, set.sunDir, 0.85);
    card(1).update(NARTI, actAt(NARTI_TALK, t), 0.43, 2.9, cam, set.sunDir, 0.85);
  },
};

// =============== S5+S6: the lazy brain, the giant scissors, the mystic memory shelf (38.0-67.0) ===============
// Budi watches from the side. The crane brings the giant scissors down: the single "JIN" sheet is cut in one snip
// (44.0), the top half drops. Four cause sheets drop into the other clamp (45.4-48.4); the scissors bite, jam
// (49.0-50.6), spring open and are flung off (50.6), clattering on the floor (51.55). JIN goes on the big screen; the
// four sheets gather dust; the operator dozes. Then the CERITA MISTIS shelf: push into the orb where Budi watches a
// horror film; orbs tumble onto the operator (63.0, 64.2, 65.4).
const PET_CUT: Actor = { seed: 11, words: [], beats: [
  { t: 0, mood: "whisper", arms: ["rest", "rest"], lean: -0.1 }, { t: 3.0, mood: "smug", arms: ["point", "rest"], lean: 0 }, { t: 5.6, mood: "smug", arms: ["point", "chest"] },
  { t: 7.2, mood: "neutral", arms: ["rest", "chest"] }, { t: 10.8, mood: "nervous", arms: ["chest", "chest"], sweat: true }, { t: 11.6, mood: "angry", arms: ["chest", "chest"], sweat: true, bend: -10 }, { t: 12.6, mood: "angry", arms: ["up", "up"], event: "shockSmall" },
  { t: 13.4, mood: "smug", arms: ["clasp", "clasp"] }, { t: 14.6, mood: "smug", arms: ["rest", "hip"] }, { t: 15.8, mood: "whisper", arms: ["rest", "rest"], lean: -0.08 },
  { t: 20.6, mood: "surprised", arms: ["rest", "rest"], turn: -0.4 }, { t: 24.8, mood: "scared", arms: ["up", "hug"], event: "shockSmall" }, { t: 27.4, mood: "nervous", arms: ["hug", "hug"], sweat: true } ] };
const BUDI_WATCH: Actor = { seed: 5, words: [], beats: [
  { t: 0, mood: "neutral", arms: ["rest", "rest"], look: [-0.6, 0.3] }, { t: 3.6, mood: "surprised", arms: ["rest", "chin"], look: [0.5, -0.3] }, { t: 6.1, mood: "excited", arms: ["clasp", "clasp"], event: "shockSmall" },
  { t: 7.4, mood: "suspicious", arms: ["rest", "chin"], look: [0.8, 0] }, { t: 11.2, mood: "worried", arms: ["chest", "rest"], look: [0.8, 0] }, { t: 12.7, mood: "shock", arms: ["up", "up"], event: "shockSmall" },
  { t: 13.6, mood: "surprised", arms: ["rest", "rest"], look: [0, -0.7] }, { t: 14.4, mood: "excited", arms: ["rest", "rest"], nod: 0.8 } ] };
const S5: SceneDef = {
  from: 38.0, to: 67.0, fog: "#1a1d2c", dens: 0.012, bg: "#10131c", cInf: 6, env: 0.25, ao: [0.6, 0.5, 3.0],
  mk: () => new BrainHQ() as unknown as SetLike,
  keys: [
    { t: 0, pos: [0, 2.05, 4.6], look: [0, 1.4, 0.2], fov: 46 }, { t: 3.37, pos: [0.05, 2.0, 4.3], look: [0, 1.45, 0.2], fov: 45 },
    { t: 3.4, pos: [-0.05, 2.45, 1.45], look: [-0.62, 1.3, 0.35], fov: 46 }, { t: 7.17, pos: [-0.08, 2.4, 1.38], look: [-0.62, 1.28, 0.35], fov: 45 },
    { t: 7.2, pos: [1.35, 2.45, 1.45], look: [0.8, 1.3, 0.35], fov: 46 }, { t: 11.47, pos: [1.32, 2.4, 1.38], look: [0.8, 1.28, 0.35], fov: 45 },
    { t: 11.5, pos: [-0.95, 1.25, 2.35], look: [-1.5, 1.0, 1.0], fov: 40 }, { t: 12.57, pos: [-0.98, 1.24, 2.3], look: [-1.5, 1.0, 1.0], fov: 39 },
    { t: 12.6, pos: [1.9, 1.9, 2.6], look: [1.0, 1.2, 0.5], fov: 48 }, { t: 13.37, pos: [1.95, 1.9, 2.7], look: [1.0, 1.1, 0.5], fov: 48 },
    { t: 13.4, pos: [0, 2.05, 0.6], look: [0, 2.9, -5], fov: 46 }, { t: 15.77, pos: [0, 2.1, 0.75], look: [0, 2.9, -5], fov: 46 },
    { t: 15.8, pos: [0.2, 3.1, 4.5], look: [0.2, 1.45, -1.5], fov: 56 }, { t: 20.37, pos: [0.25, 3.2, 4.8], look: [0.2, 1.45, -1.5], fov: 56 },
    { t: 20.4, pos: [0.7, 2.0, 3.75], look: [3.85, 1.9, 1.45], fov: 50 }, { t: 21.8, pos: [0.9, 1.95, 3.6], look: [3.85, 1.85, 1.45], fov: 48 },
    { t: 23.6, pos: [3.5, 1.63, 1.67], look: [3.86, 1.57, 1.43], fov: 36 }, { t: 24.5, pos: [3.48, 1.63, 1.69], look: [3.86, 1.57, 1.43], fov: 36 },
    { t: 25.0, pos: [1.2, 1.9, 3.4], look: [3.2, 1.2, 1.6], fov: 50 }, { t: 29, pos: [1.1, 1.95, 3.6], look: [3.2, 1.15, 1.6], fov: 50 },
  ],
  focus: (t) => (t < 3.4 ? [0, 1.3, 0.4] : t < 7.2 ? [-0.75, 1.3, 0.35] : t < 11.5 ? [0.75, 1.3, 0.35] : t < 12.6 ? [-1.45, 1.0, 1.05] : t < 13.4 ? [1.0, 1.0, 0.5] : t < 15.8 ? [0, 3.2, -5] : t < 20.4 ? [0.2, 1.3, 0.3] : t > 21.8 && t < 24.6 ? [3.86, 1.59, 1.43] : [3.0, 1.2, 1.7]),
  act: ({ t, cam, set, card }) => {
    const B = set as unknown as BrainHQ, S = B.scissors;
    B.setLids(0); B.setEyes("teras", t); B.setMonitor(3, t); B.setFocus(t < 14.2 || t > 20.4 ? 0 : sm((t - 14.2) / 0.4), t);
    // Budi inside the hero memory orb, on his sofa in front of the TV (a real tiny diorama), facing the camera
    { const H = B as unknown as { heroCard?: ToonCard }; if (!H.heroCard) { H.heroCard = new ToonCard(B.heroOrb); H.heroCard.shade = 0.6; }
      const hc = H.heroCard; hc.update(BUDI, actAt({ seed: 7, words: [], beats: [{ t: 0, mood: "scared", arms: ["hug", "hug"], legs: ["sit", "sit"], look: [-0.6, -0.2], sweat: true }] }, t), 0.035, 0.02, cam, B.sunDir, 0.042, -0.072 - BUDI.legLen * 0.00216 * 0.042 + 0.03);
      B.heroOrb.updateMatrixWorld(); const pq = new THREE.Quaternion(); B.heroOrb.getWorldQuaternion(pq); hc.mesh.quaternion.copy(pq.invert().multiply(cam.quaternion)); hc.shadow.visible = false; hc.contact.visible = false; hc.setVisible(t > 20.0); hc.shadow.visible = false; hc.contact.visible = false; }
    B.setScreen(t >= 14.4 ? "KETINDIHAN" : "", t >= 14.4 ? (Math.floor(t * 2.5) % 2 ? 1 : 0.55) : 1, t);
    // JIN sheet: bottom half stays in the clamp; the top half drops at the snip and bounces on the floor
    const [lx, , lz] = B.stageL, cutT = 6.0;
    B.jinL.position.set(lx, 1.07, lz); B.jinL.rotation.set(0, 0, 0);
    { const u = Math.max(0, t - cutT), fall = Math.min(1, u / 0.45), y = 1.27 - (1.27 - 0.01) * fall * fall, bounce = u > 0.45 ? 0.06 * Math.abs(Math.sin((u - 0.45) * 9)) * Math.exp(-(u - 0.45) * 5) : 0;
      B.jinR.position.set(lx - 0.08 * fall, t < cutT ? 1.27 : y + bounce, lz + 0.12 * fall); B.jinR.rotation.set(-1.5 * fall, 0, 0.5 * fall); }
    // the four cause sheets drop in one by one, then gather dust
    B.setStack(4, [0, 1, 2, 3].map((i) => sm((t - (7.4 + i)) / 0.25)));
    (B.dustCover.material as THREE.MeshStandardMaterial).opacity = 0.85 * sm((t - 16) / 3);
    for (const m of B.stack) (m.material as THREE.MeshStandardMaterial[])[4].color.setScalar(1 - 0.4 * sm((t - 16) / 3));
    // crane + scissors
    const rx = B.stageR[0] + 0.33, lxs = lx + 0.33; let cx = lxs, py = 3.3, open = 0.45, spin = 0, flung = false;
    if (t < 3.4) { cx = 0; py = 3.35; open = 0.08; }
    else if (t < 5.4) { cx = lxs; py = 3.3 - (3.3 - 1.27) * sm((t - 3.4) / 2.0); open = 0.08 + 0.4 * sm((t - 4.4) / 0.6); }
    else if (t < 6.4) { cx = lxs; py = 1.27; open = t < 5.8 ? 0.48 : Math.max(0.03, 0.48 - (t - 5.8) / 0.2 * 0.45); }
    else if (t < 7.2) { cx = lxs; py = 1.27 + 1.8 * sm((t - 6.4) / 0.8); open = 0.03; }
    else if (t < 10.4) { cx = lxs + (rx - lxs) * sm((t - 7.4) / 1.6); py = 3.07; open = 0.1; }
    else if (t < 10.9) { cx = rx; py = 3.07 - (3.07 - 1.27) * sm((t - 10.4) / 0.5); open = 0.48; }
    else if (t < 12.6) { cx = rx + (t > 11 ? 0.006 * Math.sin(t * 70) : 0); py = 1.27 + (t > 11 ? 0.004 * Math.sin(t * 53) : 0); open = t < 11 ? 0.48 - (t - 10.9) * 1.5 : 0.33 + 0.015 * Math.sin(t * 61); }
    else { flung = true; const u = t - 12.6, k = Math.min(1, u / 0.95); cx = rx + 0.9 * k; py = 1.27 + 1.1 * Math.sin(Math.PI * k) * (1 - 0.3 * k) - 1.22 * k * k; open = 0.9; spin = 7 * k;
      if (u > 0.95) { const v = u - 0.95; cx = rx + 0.9 + 0.1 * Math.min(1, v * 3); py = 0.05 + 0.08 * Math.abs(Math.sin(v * 10)) * Math.exp(-v * 6); spin = 7 + 0.3 * Math.min(1, v * 3); } }
    S.open(open); S.g.position.set(cx, py, t < 7.2 ? lz : B.stageR[2]); S.g.rotation.set(flung ? spin * 0.3 : 0, flung ? spin * 0.15 : 0, -Math.PI / 2 + (flung ? spin : 0));
    B.crane.position.x = flung ? rx : cx; B.cable.visible = !flung || t < 12.65; B.cable.scale.y = Math.max(0.01, 3.88 - (flung ? 3.3 : py) - 0.02);
    // the operator at the crane joystick; Budi watching
    const PP = actAt(PET_CUT, t);
    if (t < 15.8) card(0).update(PETUGAS, PP, t > 11.4 && t < 12.6 ? -1.42 : -0.35, t > 11.4 && t < 12.6 ? 1.08 : -1.5, cam, B.sunDir, 0.8);
    else if (t < 20.4) card(0).update(PETUGAS, { ...eyesClosed(PP), mouth: { kind: "oo", open: 0.3 } }, 0.0, 0.75, cam, B.sunDir, 0.8);
    else card(0).update(PETUGAS, PP, 2.75, 2.05, cam, B.sunDir, 0.8);
    if (t < 15.8) card(1).update(BUDI, actAt(BUDI_WATCH, t), t < 13.4 ? 0.3 : -0.75, t < 13.4 ? -1.35 : -2.3, cam, B.sunDir, 0.8); else card(1).setVisible(false);
    // memory orbs tumble down from the top rows onto the operator
    B.orbs.forEach((o, i) => { const row = Math.floor(i / 9), t0 = row === 5 ? 25.0 : row === 4 ? 26.2 : 27.4, falls = row >= 3 && i % 2 === 0;
      const grp = o.m.parent!; if (!falls || t < t0) { grp.position.copy(o.home); return; }
      const u = Math.min(1, (t - t0) / 0.45); grp.position.set(o.home.x + (i % 3 - 1) * 0.1 * u, o.home.y * (1 - u * u) + 0.15, o.home.z + 1.4 * u); });
  },
};

// =============== S7a: a noise from the kitchen -> "someone's there" -> it's a rat (67.0-71.8) ===============
// shot 1: the living room in the dark, Bapak on the sofa freezes at the clatter from the dark hallway, grabs the broom;
// shot 2: the torch beam finds the culprit in the kitchen, a rat chewing kerupuk; Bapak deadpan
const BAPAK_A: Actor = { seed: 21, words: [], beats: [{ t: 0, mood: "neutral", arms: ["rest", "rest"], legs: ["bent", "bent"], look: [0, 0] }, { t: 0.35, mood: "shock", arms: ["hug", "rest"], look: [0.9, 0], event: "shockSmall" }, { t: 1.0, mood: "scared", arms: ["hug", "rest"], look: [0.9, 0.1], sweat: true },
  { t: 2.4, mood: "suspicious", arms: ["rest", "point"], legs: ["stand", "stand"], look: [-0.6, 0.3] }, { t: 3.2, mood: "angry", arms: ["hip", "point"], look: [-0.6, 0.3], event: "shockSmall" }] };
const torchDraw = (g: CanvasRenderingContext2D, x: number, y: number) => { g.save(); g.translate(x, y); g.rotate(-1.9); g.fillStyle = "#2a2e36"; g.fillRect(-12, -10, 70, 20); g.fillStyle = "#c8ccd2"; g.fillRect(52, -15, 14, 30); g.fillStyle = "#fff6d0"; g.fillRect(64, -12, 4, 24); g.lineWidth = 5; g.strokeStyle = "#2b1a26"; g.strokeRect(-12, -10, 70, 20); g.restore(); };
const S7a: SceneDef = {
  from: 67.0, to: 71.8, night: true, fog: "#101830", dens: 0.01, bg: "#05060c", cInf: 6, env: 0.07, ao: [0.4, 0.35, 3.0],
  mk: () => { const T = new TamuSet(); T.set(0, 0); const D = new DapurSet(); D.root.position.set(20, 0, 0); const g = new THREE.Group(); g.add(T.root, D.root); return { root: g, sunDir: T.sunDir, update: (t: number) => { T.update(t); D.update(t); }, T, D } as unknown as SetLike; },
  keys: [{ t: 0, pos: [0.85, 1.3, 1.6], look: [0.15, 1.0, -1.3], fov: 48 }, { t: 2.37, pos: [0.8, 1.27, 1.45], look: [0.15, 1.0, -1.3], fov: 47 },
    { t: 2.4, pos: [20.6, 1.45, -0.45], look: [20.5, 1.0, -1.6], fov: 40 }, { t: 3.57, pos: [20.62, 1.42, -0.55], look: [20.5, 1.0, -1.6], fov: 39 },
    { t: 3.6, pos: [21.95, 1.45, 1.65], look: [20.7, 1.0, -1.5], fov: 44 }, { t: 4.8, pos: [21.92, 1.43, 1.55], look: [20.7, 1.0, -1.5], fov: 43 }],
  focus: (t) => (t < 2.4 ? [-0.5, 0.9, -1.2] : [20.55, 1.0, -1.6]),
  act: ({ t, cam, set, card }) => {
    const { T, D } = set as unknown as { T: TamuSet; D: DapurSet };
    T.set(0, 0); D.pot.rotation.z = t < 2.2 ? 0.05 * Math.sin(t * 38) : 0; D.potLid.rotation.z = t < 2.2 ? 0.12 * Math.sin(t * 31) : 0; D.potLid.position.y = 0.11 + (t < 2.2 ? 0.01 * Math.abs(Math.sin(t * 31)) : 0);
    D.torch.intensity = t > 2.45 ? 16 : 0;
    if (t < 2.4) { card(0).update(BAPAK, actAt(BAPAK_A, t), 0.0, -1.06, cam, T.sunDir, 0.82, 0.63 - BAPAK.legLen * 0.00216 * 0.82, (g, Q) => { const [hx, hy] = handPoint(BAPAK, Q, 1); drawBroom(g, hx, hy, 0.12); }); card(1).setVisible(false); }
    else { if (t < 3.6) card(0).setVisible(false); else card(0).update(BAPAK, actAt(BAPAK_A, t), 21.4, -0.25, cam, D.sunDir, 0.82, 0, (g, Q) => { const [hx, hy] = handPoint(BAPAK, Q, 1); torchDraw(g, hx, hy); });
      card(1).custom((g) => drawRat(g, Math.floor(t * 8) % 2), 20.0 + D.ratAt[0], D.ratAt[2], cam, D.sunDir, 0.36, D.ratAt[1]); }
  },
};

// =============== S7b: the lamp flickers -> "something passed" -> faulty wiring (71.8-75.0) ===============
const IBU_A: Actor = { seed: 31, words: [], beats: [{ t: 0, mood: "worried", arms: ["hug", "hug"], legs: ["bent", "bent"], look: [0.3, 0.4] }, { t: 1.25, mood: "shock", arms: ["hug", "hug"], look: [0.9, 0], event: "shock" }, { t: 1.9, mood: "scared", arms: ["hug", "hug"], look: "dart", sweat: true }] };
export const flickerOn = (t: number) => Math.sin(t * 31) * Math.sin(t * 7.3) > -0.2 && !(t > 0.95 && t < 1.3);
const S7b: SceneDef = {
  from: 71.8, to: 75.0, night: true, fog: "#101830", dens: 0.01, bg: "#05060c", cInf: 6, env: 0.07, ao: [0.4, 0.35, 3.0],
  mk: () => new TamuSet() as unknown as SetLike,
  keys: [{ t: 0, pos: [0.45, 1.3, 1.6], look: [0.55, 1.1, -1.4], fov: 48 }, { t: 2.27, pos: [0.45, 1.28, 1.45], look: [0.55, 1.1, -1.4], fov: 47 },
    { t: 2.3, pos: [1.7, 0.55, 0.95], look: [2.18, 0.4, 0.75], fov: 34 }, { t: 3.2, pos: [1.75, 0.53, 0.9], look: [2.18, 0.4, 0.75], fov: 32 }],
  focus: (t) => (t < 2.3 ? [-0.5, 0.9, -1.2] : [2.15, 0.4, 0.75]),
  act: ({ t, cam, set, card }) => {
    const T = set as unknown as TamuSet, on = flickerOn(t) ? 1 : 0, spark = t > 2.3 && Math.sin(t * 37) > 0.55 ? 1 : 0;
    T.set(on, spark);
    card(0).update(IBU, actAt(IBU_A, t), 0.28, -1.06, cam, T.sunDir, 0.82, 0.63 - IBU.legLen * 0.00216 * 0.82, (g, Q) => drawPillow(g, handPoint(IBU, Q, 0), handPoint(IBU, Q, 1)));
    // the dark figure dashes across the hallway doorway during the blackout
    const u = (t - 0.98) / 0.28; if (u > 0 && u < 1) card(1).custom((g) => { g.save(); g.globalAlpha = 0.92; drawSosok(g, 0, 0.12, 1); g.restore(); }, 0.85 + 0.85 * u, -1.86, cam, T.sunDir, 0.9); else card(1).setVisible(false);
  },
};

// =============== S7c + S8a: the crying baby, the kicked door, the kunti on her branch (75.0-83.2) ===============
// baby crying (sweat on the face) -> the closed door is kicked open; mum stays IN THE DOOR FRAME (the lit hallway behind
// her), furious, points at the window, shakes her head -> the kunti in a ragged dress on her branch outside, puzzled,
// palms up -> the baby drenched in sweat -> the fan: head bowed, switched OFF -> mum in the door frame, sheepish
const IBU2_A: Actor = { seed: 41, words: [], beats: [{ t: 0, mood: "angry", arms: ["rest", "rest"] }, { t: 1.75, mood: "angry", arms: ["rest", "rest"], legs: ["stand", "wide"], event: "shockSmall" }, { t: 2.0, mood: "angry", arms: ["point", "hip"], legs: ["stand", "stand"], lean: -0.04 },
  { t: 3.6, mood: "angry", arms: ["point", "hip"] }, { t: 7.3, mood: "nervous", arms: ["fixhat", "rest"], sweat: true, look: [0.3, 0.5], event: "shockSmall" }] };
const KUNTI_A: Actor = { seed: 51, words: [], beats: [{ t: 0, mood: "neutral", arms: ["rest", "rest"], legs: ["sit", "sit"], look: [0.3, 0.4] }, { t: 3.9, mood: "surprised", arms: ["rest", "rest"], legs: ["sit", "sit"], look: [0, 0], event: "shockSmall" }, { t: 4.3, mood: "worried", arms: ["shrug", "shrug"], legs: ["sit", "sit"], turn: 0.25 }, { t: 6.4, mood: "worried", arms: ["shrug", "shrug"], legs: ["sit", "sit"], turn: 0.4 }] };
const S7c: SceneDef = {
  from: 75.0, to: 83.2, night: true, fog: "#101830", dens: 0.006, bg: "#05060c", cInf: 6, env: 0.08, ao: [0.3, 0.3, 2.2],
  mk: () => new BayiSet() as unknown as SetLike,
  keys: [
    { t: 0, pos: [-0.4, 1.62, -0.6], look: [-0.42, 0.82, -1.25], fov: 36 }, { t: 1.37, pos: [-0.4, 1.6, -0.66], look: [-0.42, 0.82, -1.25], fov: 35 },
    { t: 1.4, pos: [-0.75, 1.42, -0.95], look: [2.2, 1.1, 0.6], fov: 48 }, { t: 3.57, pos: [-0.65, 1.4, -0.85], look: [2.2, 1.1, 0.6], fov: 47 },
    { t: 3.6, pos: [0.2, 1.72, -1.9], look: [0.45, 1.95, -4.6], fov: 44 }, { t: 5.37, pos: [0.2, 1.72, -1.93], look: [0.45, 1.95, -4.6], fov: 42 },
    { t: 5.4, pos: [-0.4, 1.55, -0.68], look: [-0.42, 0.85, -1.25], fov: 34 }, { t: 6.57, pos: [-0.4, 1.53, -0.74], look: [-0.42, 0.85, -1.25], fov: 32 },
    { t: 6.6, pos: [0.95, 0.72, 0.45], look: [1.52, 0.45, -0.45], fov: 46 }, { t: 7.27, pos: [0.98, 0.71, 0.38], look: [1.52, 0.45, -0.45], fov: 45 },
    { t: 7.3, pos: [0.85, 1.4, -0.35], look: [2.6, 1.2, 0.78], fov: 44 }, { t: 8.2, pos: [0.92, 1.4, -0.28], look: [2.6, 1.2, 0.78], fov: 43 },
  ],
  focus: (t) => (t < 1.4 ? [-0.43, 0.9, -1.25] : t < 3.6 ? [2.55, 1.2, 0.6] : t < 5.4 ? [0.45, 2.1, -4.6] : t < 6.6 ? [-0.43, 0.9, -1.25] : t < 7.3 ? [1.52, 0.45, -0.45] : [2.6, 1.25, 0.6]),
  act: ({ t, cam, set, card }) => {
    const R = set as unknown as BayiSet;
    // the kick: shut until 1.75, flies open in 3 frames, bounces off the wall
    R.door.rotation.y = t < 1.75 ? 0 : 1.45 * Math.min(1, (t - 1.75) / (3 / FPS)) - 0.14 * Math.exp(-(t - 1.85) * 6) * Math.sin((t - 1.85) * 28) * (t > 1.85 ? 1 : 0);
    // the baby: crying hard, sweat beads ON the face sliding down, red hot cheeks
    const bp: Pose = { ...actAt({ seed: 61, words: [], beats: [{ t: 0, mood: "scared", arms: ["up", "up"] }] }, t), eyes: [{ kind: "squeeze" }, { kind: "squeeze" }], mouth: { kind: "laugh", open: 0.8 + 0.3 * Math.sin(t * 9) } };
    card(0).update(BAYI, bp, -0.5, -1.25, cam, R.sunDir, 0.42, 0.655, (g, Q) => { const [hx, hy] = headCenter(BAYI, Q); drawFaceSweat(g, hx, hy, BAYI.R, t); });
    // mum, standing in the door frame (in the hallway), never stepping in
    if (t > 1.78) { const P = actAt(IBU2_A, t); const shakeH = t > 2.3 && t < 3.4 ? 0.2 * Math.sin((t - 2.3) * 17) : 0; const Q = t > 7.3 ? { ...P, head: { ...P.head, turn: 0.05 * Math.sin(t * 9) }, mouth: { kind: "smile" as const, open: 0.15 } } : { ...P, head: { ...P.head, turn: shakeH } };
      card(1).update(IBU2, Q, 2.6, 0.78, cam, R.sunDir, 0.82); } else card(1).setVisible(false);
    // the kunti on her branch: ragged, stained dress; puzzled, palms up
    const ks = 0.72; card(2).update(KUNTI, actAt(KUNTI_A, t), R.branchTop[0], R.branchTop[2], cam, R.sunDir, ks, R.branchTop[1] - KUNTI.legLen * 0.00216 * ks, (g, Q) => { const hipY = 975 - KUNTI.legLen + Q.bob, top = hipY - KUNTI.bodyH * Q.body.sy; raggedDress(g, Q.x, top, hipY, KUNTI.bodyW * Q.body.sx); });
  },
};

// =============== S8b: bedtime circled on the calendar (83.2-88.5) ===============
const S8b: SceneDef = {
  from: 83.2, to: 86.7, night: true, fog: "#101830", dens: 0.01, bg: "#05060c", cInf: 7, env: 0.06, ao: [0.35, 0.3, 3.2],
  mk: () => new KamarSet() as unknown as SetLike,
  keys: [{ t: 0, pos: [0.3, 1.45, -0.7], look: [-0.6, 0.72, -1.45], fov: 38 }, { t: 0.9, pos: [0.25, 1.4, -0.8], look: [-0.6, 0.72, -1.45], fov: 37 },
    { t: 0.83, pos: [1.2, 1.66, -0.35], look: [1.25, 1.64, -1.93], fov: 46 }, { t: 3.5, pos: [1.21, 1.65, -0.5], look: [1.25, 1.64, -1.93], fov: 45 }],
  focus: (t) => (t < 0.83 ? [-0.6, 0.74, -1.5] : [1.25, 1.64, -1.93]),
  act: ({ t, cam, set, card }) => {
    const R = set as unknown as KamarSet; R.setClock(21, 0, t); R.setCalendar(clamp01((t - 1.05) / 1.8));
    const P = eyesClosed(actAt({ seed: 3, words: [], beats: [{ t: 0, mood: "neutral", arms: ["rest", "rest"] }] }, t));
    headOnPillow(card(0), { ...P, mouth: { kind: "smile", open: 0 } }, cam, R.sunDir, R.pillowHead, 0.5, 0.8);
    R.setChest(0.014 * Math.sin(t * 1.6));
  },
};

// =============== S8c: the kunti, in the corner of the frame, pointing at herself: "me?" (86.7-88.5) ===============
const KUNTI_ME: Actor = { seed: 52, words: [], beats: [{ t: 0, mood: "worried", arms: ["chest", "rest"], legs: ["sit", "sit"], look: [0.4, 0.2], turn: 0.3 }, { t: 0.5, mood: "surprised", arms: ["chest", "shrug"], legs: ["sit", "sit"], look: [0.6, 0], event: "shockSmall" }, { t: 1.1, mood: "worried", arms: ["chest", "shrug"], legs: ["sit", "sit"], turn: 0.45 }] };
const S8c: SceneDef = {
  from: 86.7, to: 88.5, night: true, fog: "#101830", dens: 0.006, bg: "#05060c", cInf: 6, env: 0.08, ao: [0.3, 0.3, 2.2],
  mk: () => new BayiSet() as unknown as SetLike,
  keys: [{ t: 0, pos: [0.0, 1.72, -1.92], look: [0.05, 2.2, -4.6], fov: 44 }, { t: 1.8, pos: [0.0, 1.72, -1.95], look: [0.07, 2.2, -4.6], fov: 42 }],
  focus: () => [0.45, 2.1, -4.6],
  act: ({ t, cam, set, card }) => { const R = set as unknown as BayiSet; const ks = 0.72; card(2).update(KUNTI, actAt(KUNTI_ME, t), R.branchTop[0], R.branchTop[2], cam, R.sunDir, ks, R.branchTop[1] - KUNTI.legLen * 0.00216 * ks, (g, Q) => { const hipY = 975 - KUNTI.legLen + Q.bob, top = hipY - KUNTI.bodyH * Q.body.sy; raggedDress(g, Q.x, top, hipY, KUNTI.bodyW * Q.body.sx); }); },
};

export const SCENES = [S1, S2, S3a, S3b, S4, S5, S7a, S7b, S7c, S8b, S8c];
export const FILM_FRAMES = Math.round(88.5 * FPS);
const Fade: React.FC<{ n: number; children: React.ReactNode }> = ({ n, children }) => { const f = useCurrentFrame(); return <AbsoluteFill style={{ opacity: n === 0 ? 1 : clamp01((f + 1) / (XF + 1)) }}>{children}</AbsoluteFill>; };
export const KetindihanFilm: React.FC = () => {
  const f = useCurrentFrame(), t = f / FPS;
  // the figure's blink closes the frame at the end of S2 (15.9-16.4)
  const black = t > 15.85 && t < 16.5 ? sm((t - 15.85) / 0.25) * (1 - sm((t - 16.35) / 0.15)) : 0;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {SCENES.map((S, i) => { const a = Math.round(S.from * FPS), b = Math.round(S.to * FPS) + (i < SCENES.length - 1 ? XF : 0); return (
        <Sequence key={i} from={a} durationInFrames={b - a}>
          <Fade n={i}>
            <ThreeCanvas width={W} height={H} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 40, near: 0.05, far: 300 }}>
              <Inner S={S} />
            </ThreeCanvas>
          </Fade>
        </Sequence>
      ); })}
      <AbsoluteFill style={{ background: "#000", opacity: black }} />
    </AbsoluteFill>
  );
};
