// "Emas kuno" first-image previews (checklist section 10: 2-3 versions of the first image, the user picks one).
// A: low close at the pit, the hoe blade striking the coin (sparks), your shocked face behind.
// B: wider and higher, the whole yard at dusk, the same strike with a beam of gold light.
// C: the reverse angle against the sunset: you stand in the pit holding the coin up, its glow on your face.
// The chosen one becomes scene 1 of the film. Big hook text sits on top (visible from frame 0).
import React from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { actAt, Actor, Beat, FPS, sm, clamp01, noise } from "../../lib/acting";
import { headCenter, Limb, Pose, CharSpec, OUTLINE } from "../../lib/toon2";
import { SU, ToonCard } from "../../lib/toonCard";
import { Reel, SceneDef, SetLike, Ctx, handWorld, V3 } from "../../lib/scene";
import { TEX, SpritePool, burst, drawSparkles } from "../kopi/fx";
import { drawHeadGlow } from "../kopi/props";
import { shaftTex } from "../../lib/world2/textures";
import { COIN_AT, PIT } from "./halaman";
import { PerumahanSet as HalamanSet } from "./perumahan";
import { KAMU } from "./cast";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const at = (t: number, a: number, b: number) => sm((t - a) / (b - a));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
type Ex = (g: CanvasRenderingContext2D, P: Pose) => void;
const camDir = (cam: THREE.Camera, x: number, z: number) => V(cam.position.x - x, 0, cam.position.z - z).normalize();
const put = (c: ToonCard, S: CharSpec, P: Pose, x: number, z: number, cx: Ctx, sc = 1, y = 0, extra?: Ex) => c.update(S, P, x, z, cx.cam, cx.set.sunDir, sc, y, extra);
/** move hand i so that, seen from the camera, it lands on `target` (same maths as the Kopi film) */
const reach = (c: ToonCard, S: CharSpec, P: Pose, i: 0 | 1, T: THREE.Vector3, x: number, z: number, cx: Ctx, sc = 1, y = 0, extra?: Ex): Pose => {
  put(c, S, P, x, z, cx, sc, y, extra);
  const cam = cx.cam.position, n = camDir(cx.cam, x, z), right = V(n.z, 0, -n.x), u = SU * sc;
  const d = T.clone().sub(cam), pt = cam.clone().addScaledVector(d, V(x, 0, z).sub(cam).dot(n) / d.dot(n));
  let Q = P;
  for (let it = 0; it < 2; it++) {
    const h = handWorld(c, S, Q, i), du = pt.clone().sub(h).dot(right) / u, dv = (pt.y - h.y) / u;
    const A = Q.arms[i], L: Limb = { a: [A.a[0] + du * 0.5, A.a[1] - dv * 0.5], b: [A.b[0] + du, A.b[1] - dv] };
    Q = { ...Q, arms: (i ? [Q.arms[0], L] : [L, Q.arms[1]]) as [Limb, Limb] }; put(c, S, Q, x, z, cx, sc, y, extra);
  }
  return Q;
};
const life = (P: Pose, t: number, seed: number, k = 1): Pose => { const s = seed * 1.7, w = 2 * Math.PI;
  return { ...P, bob: P.bob + 4 * k * Math.sin(t * w * 0.9 + s), body: { ...P.body, sy: P.body.sy * (1 + 0.02 * k * Math.sin(t * w * 0.9 + s + 1)), lean: P.body.lean + 0.03 * k * Math.sin(t * w * 0.45 + s) },
    head: { ...P.head, rot: P.head.rot + 0.05 * k * Math.sin(t * w * 0.6 + s * 2), dy: P.head.dy + 3 * k * Math.sin(t * w * 1.1 + s) } }; };
const actor = (seed: number, beats: Beat[]): Actor => ({ seed, beats, words: [] });

// ---------------- the hoe (cangkul): wooden handle + wide iron blade, built along local +Y (handle) / +Z (blade) ----------------
const BLADE_L = 0.23, BLADE_TILT = -0.35; // the blade leans 20 degrees back toward the user
const makeHoe = () => {
  const G = new THREE.Group(), wood = new THREE.MeshStandardMaterial({ color: "#a77a4a", roughness: 0.7 }), iron = new THREE.MeshStandardMaterial({ color: "#5d5a56", metalness: 0.75, roughness: 0.42 }), edge = new THREE.MeshStandardMaterial({ color: "#c9c6c0", metalness: 0.9, roughness: 0.25 });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.019, 1, 12), wood); handle.castShadow = true; G.add(handle);
  const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.07, 14), iron); eye.rotation.z = Math.PI / 2; eye.castShadow = true; G.add(eye);
  const bl = new THREE.Group(); bl.rotation.x = BLADE_TILT; G.add(bl);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.007, BLADE_L), iron); plate.position.z = BLADE_L / 2; plate.castShadow = true; bl.add(plate);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.008, 0.03), edge); lip.position.z = BLADE_L - 0.015; bl.add(lip);
  const mud = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.009, 0.08), new THREE.MeshStandardMaterial({ color: "#5a3a24", roughness: 1 })); mud.position.z = BLADE_L - 0.07; bl.add(mud);
  return { G, handle };
};
type Hoe = ReturnType<typeof makeHoe>;
/** place the hoe: head point H, grip end E (far hand); the blade hangs on the side away from `side` */
const placeHoe = (h: Hoe, H: THREE.Vector3, E: THREE.Vector3, side = V(-1, 0, 0)) => {
  const d = E.clone().sub(H), L = d.length(); d.normalize();
  const X = side.clone().addScaledVector(d, -side.dot(d)).normalize(), Z = X.clone().cross(d).normalize();
  h.G.matrix.makeBasis(X, d, Z).setPosition(H); h.G.matrixAutoUpdate = false; h.G.matrixWorldNeedsUpdate = true;
  h.handle.scale.set(1, L + 0.1, 1); h.handle.position.y = (L + 0.1) / 2;
  return { d, X, Z, L };
};
/** the blade edge's offset from the head for a handle direction d */
const edgeOff = (d: THREE.Vector3, side = V(-1, 0, 0)) => { const X = side.clone().addScaledVector(d, -side.dot(d)).normalize(), Z = X.clone().cross(d).normalize(); return d.clone().multiplyScalar(-Math.sin(BLADE_TILT) * BLADE_L).addScaledVector(Z, Math.cos(BLADE_TILT) * BLADE_L); };
/** solve the head point so the blade edge lands on `edge` with the far hand at `grip` */
const solveHead = (edge: THREE.Vector3, grip: THREE.Vector3) => { let H = edge.clone().add(V(0, 0.15, -0.1)); for (let i = 0; i < 5; i++) { const d = grip.clone().sub(H).normalize(); H = edge.clone().sub(edgeOff(d)); } return H; };

// ---------------- the set + effects for these shots ----------------
type K = SetLike & { W: HalamanSet; hoe: Hoe; balls: THREE.Mesh[]; spark: SpritePool; dust: SpritePool; star: SpritePool; beam: THREE.Mesh };
const mk = () => {
  const W = new HalamanSet(), k = W as unknown as K, R = W.root; k.W = W; k.hoe = makeHoe(); R.add(k.hoe.G);
  k.balls = [0, 1].map(() => { const b = new THREE.Mesh(new THREE.SphereGeometry(17 * SU, 20, 14), new THREE.MeshBasicMaterial({ color: OUTLINE })); b.visible = false; b.renderOrder = 10; R.add(b); return b; });
  k.spark = new SpritePool(R, TEX.star, 40, true, "#ffd27a"); k.dust = new SpritePool(R, TEX.dust, 40, false, "#9a7a5a"); k.star = new SpritePool(R, TEX.star, 12, true);
  k.beam = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2.6), new THREE.MeshBasicMaterial({ map: shaftTex(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, color: "#ffcf6a", toneMapped: false, fog: false }));
  k.beam.geometry.translate(0, 1.3, 0); k.beam.renderOrder = 7; R.add(k.beam);
  return k as SetLike;
};
const kk = (s: SetLike) => s as K;
/** a 3D ball hand on the grip point, on the camera side, so the hoe is clearly held */
const grip = (k: K, i: number, p: THREE.Vector3 | null, cam: THREE.Camera) => { const b = k.balls[i]; if (!p) { b.visible = false; return; } b.position.copy(p).addScaledVector(cam.position.clone().sub(p).normalize(), 0.022); b.visible = true; };

const DUSK = { fog: "#e3a487", dens: 0.011, bg: "#6a5a8a", cInf: 6, env: 0.32, exposure: 0.02, bloom: 0.85, sat: 0.2, contrast: 0.12, grade: [[0.42, 0.45, 0.62], [0.66, 0.52, 0.38], 0.32] as [V3, V3, number] };

// ---------------- the strike (shared by A and B) ----------------
const TI = 0.2; // impact time (s)
const ME_X = 0.62, ME_Z = 2.55, ME_Y = -PIT.depth; // you stand IN the pit, facing the yard (+z)
const EDGE = COIN_AT.clone().add(V(-0.01, 0.006, -0.03));
const G_DOWN = V(0.6, 0.4, 2.78), G_UP = V(0.6, 1.62, 2.5);
const H_DOWN = solveHead(EDGE, G_DOWN), V_DOWN = H_DOWN.clone().sub(G_DOWN), LH = V_DOWN.length();
const TH_DOWN = Math.atan2(V_DOWN.y, V_DOWN.z), TH_UP = 2.15;
const ACT_STRIKE = actor(7, [{ t: 0, mood: "angry", arms: ["rest", "rest"], look: [0, 0.8] }, { t: TI + 0.04, mood: "surprised", look: [0, 0.95], event: "shockSmall" }]);
const strike = (cx: Ctx) => {
  const { t, cam } = cx, k = kk(cx.set), c = cx.card(0);
  // swing: accelerating down to the impact, then a little metal bounce
  const u = t < TI ? Math.pow(clamp01(t / TI), 2) : 1, bounce = t > TI ? Math.exp(-(t - TI) * 9) * Math.sin((t - TI) * 38) : 0;
  const th = lerp(TH_UP, TH_DOWN, u) + 0.07 * Math.abs(bounce), gp = G_UP.clone().lerp(G_DOWN, u).add(V(0, 0.012 * bounce, 0));
  const H = gp.clone().add(V(V_DOWN.x * u, Math.sin(th) * LH, Math.cos(th) * LH));
  placeHoe(k.hoe, H, gp);
  const near = H.clone().lerp(gp, 0.55);
  let P = life(actAt(ACT_STRIKE, t), t, 7, 0.6);
  P = { ...P, body: { ...P.body, sy: P.body.sy * 0.93, sx: P.body.sx * 1.03 }, bob: P.bob + 22, head: { ...P.head, dy: P.head.dy + 10 } };
  const shake = t > TI && t < TI + 0.35 ? (1 - (t - TI) / 0.35) * 0.012 * Math.sin(t * 140) : 0; // the jolt runs up your arms
  P = reach(c, KAMU, P, 0, gp.clone().add(V(shake, 0, 0)), ME_X, ME_Z, cx, 1, ME_Y);
  P = reach(c, KAMU, P, 1, near.clone().add(V(-shake, 0, 0)), ME_X, ME_Z, cx, 1, ME_Y); c.contact.visible = false;
  grip(k, 0, gp, cam); grip(k, 1, near, cam);
  // sparks, flying soil, the coin's glow
  const n = cam.position.clone().sub(EDGE).normalize();
  k.spark.begin(); for (const [p, a, i] of burst(t, TI, 0.45, 26, EDGE.clone().add(V(0, 0.01, 0)), V(0, 1, 0).addScaledVector(n, 0.4), 0.9, 1.6, 4.0, 3)) k.spark.add(p, 0.035 * (1 - a) * (i % 3 ? 1 : 1.6), 1 - a); k.spark.end();
  k.dust.begin(); for (const [p, a, i] of burst(t, TI, 0.9, 16, EDGE.clone(), V(0, 1, 0), 0.8, 1.1, 3.2, 9)) k.dust.add(p, (0.05 + 0.04 * (i % 3)) * (0.6 + a), 0.8 * (1 - a)); k.dust.end();
  const g = t < TI ? 0.25 : 0.25 + 0.75 * at(t, TI, TI + 0.12); k.W.glow(g, t);
  k.star.begin(); for (let i = 0; i < 4; i++) { const a = t * 2 + i * 1.57, r = 0.05 + 0.02 * Math.sin(t * 5 + i); k.star.add(COIN_AT.clone().add(V(r * Math.cos(a), 0.03 + 0.03 * Math.abs(Math.sin(t * 3 + i)), r * Math.sin(a) * 0.6)), 0.05 * g * (0.6 + 0.4 * Math.sin(t * 9 + i)), g); } k.star.end();
  return { P, c };
};

// ---------------- A: low close at the pit ----------------
const SA: SceneDef = {
  from: 0, to: 1.5, ...DUSK, mk,
  keys: [{ t: 0, pos: [1.15, 1.05, 5.4], look: [0.75, 0.75, 3.0], fov: 53 }, { t: 1.5, pos: [1.14, 1.04, 5.3], look: [0.75, 0.75, 3.0], fov: 53 }],
  focus: () => [0.8, 0.2, 3.3],
  act: (cx) => { strike(cx); kk(cx.set).beam.visible = false; },
};
// ---------------- B: wide and high, a beam of gold light out of the pit ----------------
const SB: SceneDef = {
  from: 0, to: 1.5, ...DUSK, mk,
  keys: [{ t: 0, pos: [2.35, 2.25, 7.0], look: [0.5, 0.78, 2.8], fov: 44 }, { t: 1.5, pos: [2.31, 2.23, 6.85], look: [0.5, 0.78, 2.8], fov: 44 }],
  focus: () => [0.6, 0.5, 3.0],
  act: (cx) => { strike(cx); const k = kk(cx.set), b = k.beam; b.visible = true; b.position.copy(COIN_AT); b.rotation.set(0, Math.atan2(cx.cam.position.x - COIN_AT.x, cx.cam.position.z - COIN_AT.z), 0);
    (b.material as THREE.MeshBasicMaterial).opacity = 0.75 * at(cx.t, TI, TI + 0.15) * (0.9 + 0.1 * Math.sin(cx.t * 11)); b.scale.set(1 + 0.15 * Math.sin(cx.t * 3), 1, 1); },
};
// ---------------- C: reverse angle, you in the pit holding the coin up against the sunset ----------------
const IN_X = 0.3, IN_Z = 3.1, IN_Y = -PIT.depth;
const ACT_C = actor(9, [{ t: 0, mood: "story", arms: ["mouthHand", "rest"], look: [0.55, -0.1] }]);
const SC: SceneDef = {
  from: 0, to: 1.5, ...DUSK, mk,
  keys: [{ t: 0, pos: [1.95, 0.8, 0.62], look: [0.3, 1.02, 3.1], fov: 44 }, { t: 1.5, pos: [1.93, 0.8, 0.67], look: [0.3, 1.02, 3.1], fov: 44 }],
  focus: () => [0.3, 1.0, 3.1],
  act: (cx) => {
    const { t, cam } = cx, k = kk(cx.set), c = cx.card(0);
    const n = camDir(cam, IN_X, IN_Z), right = V(n.z, 0, -n.x);
    let P = life(actAt(ACT_C, t), t, 9, 0.7);
    // the hoe leans on the pit edge behind you, the coin is up in your right hand in front of your face
    placeHoe(k.hoe, V(-0.75, 0.05, 3.9), V(-0.9, 0.06, 2.85), V(0, 1, 0));
    put(c, KAMU, P, IN_X, IN_Z, cx, 1, IN_Y);
    const [hx, hy] = headCenter(KAMU, P); c.mesh.updateMatrixWorld(); const head = c.mesh.localToWorld(V((hx - 300) * SU, (975 - hy) * SU, 0));
    const coinP = head.clone().addScaledVector(n, 0.22).addScaledVector(right, 0.3).add(V(0, -0.08, 0));
    k.W.coin.position.copy(coinP); k.W.coin.scale.setScalar(2.6); k.W.coin.quaternion.setFromUnitVectors(V(0, 1, 0), cam.position.clone().sub(coinP).normalize().add(V(0, 0.15, 0)).normalize()); k.W.coin.rotateY(0.3 * Math.sin(t * 1.4));
    const glowK = 0.9 + 0.1 * Math.sin(t * 6);
    const ex: Ex = (g, Q) => { const [x, y] = headCenter(KAMU, Q); drawHeadGlow(g, x, y, KAMU.R, 0.55 * glowK, t); drawSparkles(g, x, y, KAMU.R, t, 0.8, 7); };
    P = reach(c, KAMU, P, 1, coinP.clone().add(V(0, -0.062, 0)), IN_X, IN_Z, cx, 1, IN_Y, ex);
    grip(k, 1, coinP.clone().add(V(0, -0.062, 0)), cam); k.balls[0].visible = false;
    c.contact.visible = false;
    k.W.glow(1, t); k.W.coinGlow.scale.multiplyScalar(1.6); k.W.coinLight.intensity = 2.2; k.W.coinLight.distance = 1.2;
    k.star.begin(); for (let i = 0; i < 6; i++) { const a = t * 1.6 + i * 1.05, r = 0.06 + 0.02 * Math.sin(t * 4 + i); k.star.add(coinP.clone().addScaledVector(right, r * Math.cos(a)).add(V(0, r * Math.sin(a), 0)).addScaledVector(n, 0.02), 0.045 * (0.6 + 0.4 * Math.sin(t * 8 + i)), 1); } k.star.end();
    k.spark.begin(); k.spark.end(); k.dust.begin(); k.dust.end(); k.beam.visible = false;
  },
};

// ---------------- hook text ----------------
const HookText: React.FC<{ lines: { s: string; c?: string; size?: number }[]; top: number; kleng?: [number, number] }> = ({ lines, top, kleng }) => {
  const f = useCurrentFrame(), pop = 1 + 0.12 * Math.exp(-f / 3) * (f < 12 ? 1 : 0);
  const kt = f / FPS - TI, kk2 = kt < 0 ? 0 : Math.min(1, kt / 0.08) * (1 + 0.25 * Math.exp(-kt * 10));
  const style = (size: number, color: string): React.CSSProperties => ({ fontFamily: "'Arial Black', 'Helvetica Neue', Arial, sans-serif", fontWeight: 900, fontSize: size, lineHeight: 1.02, color, WebkitTextStroke: `${Math.round(size * 0.13)}px #1b1020`, paintOrder: "stroke fill", letterSpacing: 2, textShadow: "0 10px 0 rgba(27,16,32,0.55)" });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top, width: "100%", textAlign: "center", transform: `scale(${pop})` }}>
        {lines.map((l, i) => <div key={i} style={style(l.size ?? 132, l.c ?? "#ffffff")}>{l.s}</div>)}
      </div>
      {kleng && kk2 > 0 && <div style={{ position: "absolute", left: kleng[0], top: kleng[1], transform: `translate(-50%,-50%) rotate(-8deg) scale(${kk2})`, ...style(108, "#ffd23f") }}>KLENG!</div>}
    </AbsoluteFill>
  );
};
const withText = (S: SceneDef, text: React.ReactNode): React.FC => () => (<AbsoluteFill><Reel scenes={[S]} />{text}</AbsoluteFill>);
export const EmasPrevA = withText(SA, <HookText top={150} lines={[{ s: "AYUNAN" }, { s: "KE-300", c: "#ffd23f", size: 170 }]} kleng={[300, 1180]} />);
export const EmasPrevB = withText(SB, <HookText top={150} lines={[{ s: "AYUNAN" }, { s: "KE-300", c: "#ffd23f", size: 170 }]} kleng={[800, 1380]} />);
export const EmasPrevC = withText(SC, <HookText top={150} lines={[{ s: "EMAS" }, { s: "1.000 TAHUN", c: "#ffd23f", size: 128 }]} />);
export const EMAS_PREV_FRAMES = 45;
void noise;

export { mk as yardMk, kk as yardK, strike, placeHoe, DUSK, TI, grip as yardGrip, COIN_AT, PIT };
export type { K as YardK };
