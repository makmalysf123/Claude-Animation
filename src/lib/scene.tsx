// Shared scene engine (first used for "Gaji Naik" and "Kopi Mahal"): the same SceneDef pattern and post chain as
// src/videos/ketindihan2/Film.tsx (copied, so the Ketindihan files stay untouched). One scene = one set + camera keys +
// acting callback; scenes play back to back, optionally cross-dissolving over XF frames.
import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, Effect, BloomEffect, BrightnessContrastEffect, HueSaturationEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect } from "postprocessing";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
// @ts-expect-error n8ao ships without types
import { N8AOPostPass } from "n8ao";
import { LensBlur } from "../videos/bridge/lensblur";
import { NOINK } from "../videos/bridge/ink";
import { ToonCard, SU } from "./toonCard";
import { handPoint, CharSpec, Pose } from "./toon2";
import { FPS, noise, sm, clamp01 } from "./acting";

export const W = 1080, H = 1920;
export type V3 = [number, number, number];
export type SetLike = { root: THREE.Group; sunDir: THREE.Vector3; update: (t: number, scene?: THREE.Scene, cam?: THREE.Camera) => void };
export type Key = { t: number; pos: V3; look: V3; fov?: number };
/** eased camera path through keys; holds still drift a few millimetres so no frame is ever frozen */
export const camPath = (keys: Key[], t: number) => {
  let i = 0; while (i < keys.length - 1 && keys[i + 1].t <= t) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)], u = b === a ? 1 : sm((t - a.t) / (b.t - a.t));
  const L = (p: V3, q: V3) => p.map((v, k) => v + (q[k] - v) * u) as V3;
  const pos = L(a.pos, b.pos), look = L(a.look, b.look), d = 0.004;
  return { pos: [pos[0] + d * noise(t * 0.6, 1), pos[1] + d * noise(t * 0.7, 2), pos[2]] as V3, look, fov: (a.fov ?? 40) + ((b.fov ?? 40) - (a.fov ?? 40)) * u };
};
export type Ctx = { t: number; cam: THREE.PerspectiveCamera; set: SetLike; card: (i: number) => ToonCard };
export type SceneDef = { from: number; to: number; mk: () => SetLike; keys: Key[]; act: (c: Ctx) => void; fog: string; dens: number; bg: string; focus?: (t: number) => V3; cInf?: number; night?: boolean; env?: number; ao?: [number, number, number]; bloom?: number; exposure?: number; grade?: [V3, V3, number]; sat?: number; contrast?: number; satAt?: (t: number) => number; fadeAt?: (t: number) => number; near?: number; far?: number };
/** split toning after tone mapping: shadows pushed toward \`sh\`, highlights toward \`hi\` (0.5 = neutral), strength k */
class SplitTone extends Effect {
  constructor(sh: V3, hi: V3, k: number) {
    super("SplitTone", `uniform vec3 uSh; uniform vec3 uHi; uniform float uK;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float l = dot(inputColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 tint = mix(uSh, uHi, smoothstep(0.12, 0.7, l)) - 0.5;
  outputColor = vec4(inputColor.rgb + tint * uK * (1.0 - 0.6 * abs(l * 2.0 - 1.0)), inputColor.a);
}`, { uniforms: new Map<string, THREE.Uniform>([["uSh", new THREE.Uniform(new THREE.Vector3(...sh))], ["uHi", new THREE.Uniform(new THREE.Vector3(...hi))], ["uK", new THREE.Uniform(k)]]) });
  }
}
const envCache = new WeakMap<THREE.WebGLRenderer, THREE.Texture>();
/**
 * Motion blur: samples per output frame (1 = off). A blur composition runs at FPS * k with k times the frames; frame F
 * is sample j = F % k of output frame n = F / k, drawn at time (n + ((j + 0.5) / k) * 0.5 - 0.25) / FPS: k samples
 * across a 180 degree shutter centred on the frame. scripts/motion_blur.mjs then averages each group of k frames.
 * (Recipe from the MIT-licensed inkbeat-shorts skill.) Wrap a film with <SubCtx.Provider value={4}> or use withBlur().
 */
export const SubCtx = React.createContext(1);
export const subTime = (F: number, k: number) => { if (k <= 1) return F / FPS; const n = Math.floor(F / k), j = F - n * k; return (n + ((j + 0.5) / k) * 0.5 - 0.25) / FPS; };
export const withBlur = <P extends object>(C: React.ComponentType<P>, k = 4): React.FC<P> => (p) => <SubCtx.Provider value={k}><C {...p} /></SubCtx.Provider>;

const Inner: React.FC<{ S: SceneDef; k: number }> = ({ S, k }) => {
  const f = useCurrentFrame(), t = subTime(f, k);
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
    bloom: new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: S.bloom ?? (S.night ? 0.8 : 0.55), luminanceThreshold: 0.9, luminanceSmoothing: 0.25, mipmapBlur: true, levels: 6, radius: 0.72 }),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), hue: new HueSaturationEffect({ saturation: S.sat ?? (S.night ? 0.02 : 0.14) }), grade: new SplitTone(S.grade?.[0] ?? [0.5, 0.5, 0.5], S.grade?.[1] ?? [0.5, 0.5, 0.5], S.grade?.[2] ?? 0),
    bc: new BrightnessContrastEffect({ brightness: S.exposure ?? 0, contrast: S.contrast ?? 0.08 }), vig: new VignetteEffect({ offset: 0.32, darkness: S.night ? 0.62 : 0.42 }),
  }), [S]);
  scene.fog = new THREE.FogExp2(S.fog, S.dens); scene.background = new THREE.Color(S.bg);
  const c = camPath(S.keys, t);
  cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.fov = c.fov; cam.near = S.near ?? 0.05; cam.far = S.far ?? 300; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.layers.enable(NOINK);
  set.update(t, scene, cam); S.act({ t, cam, set, card });
  if (S.satAt) post.hue.saturation = S.satAt(t);
  if (S.fadeAt) post.bc.brightness = (S.exposure ?? 0) - S.fadeAt(t);
  const fp = S.focus ? S.focus(t) : c.look; post.lens.focus = new THREE.Vector3(...fp).sub(cam.position).length(); post.lens.cInf = S.cInf ?? 6;
  return (
    <>
      <primitive object={set.root} dispose={null} />
      <EffectComposer multisampling={4}>
        <primitive object={post.ao} dispose={null} />
        <primitive object={post.lens.pre} dispose={null} /><primitive object={post.lens.main} dispose={null} />
        <primitive object={post.bloom} dispose={null} /><primitive object={post.tone} dispose={null} /><primitive object={post.grade} dispose={null} />
        <primitive object={post.hue} dispose={null} /><primitive object={post.bc} dispose={null} /><primitive object={post.vig} dispose={null} />
      </EffectComposer>
    </>
  );
};

const Fade: React.FC<{ on: boolean; xf: number; k: number; children: React.ReactNode }> = ({ on, xf, k, children }) => { const f = subTime(useCurrentFrame(), k) * FPS; return <AbsoluteFill style={{ opacity: on ? clamp01((f + 1) / (xf + 1)) : 1 }}>{children}</AbsoluteFill>; };
/** plays the scenes back to back; xf > 0 dissolves each scene in over xf frames */
export const Reel: React.FC<{ scenes: SceneDef[]; xf?: number }> = ({ scenes, xf = 0 }) => { const k = React.useContext(SubCtx); return (
  <AbsoluteFill style={{ background: "#000" }}>
    {scenes.map((S, i) => { const a = Math.round(S.from * FPS) * k, b = (Math.round(S.to * FPS) + (xf && i < scenes.length - 1 ? xf : 0)) * k; return (
      <Sequence key={i} from={a} durationInFrames={b - a}>
        <Fade on={xf > 0 && i > 0} xf={xf} k={k}>
          <ThreeCanvas width={W} height={H} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 40, near: 0.05, far: 300 }}>
            <Inner S={S} k={k} />
          </ThreeCanvas>
        </Fade>
      </Sequence>
    ); })}
  </AbsoluteFill>
); };

/** world position of hand i of a placed card (for 3D props held in the hand) */
export const handWorld = (c: ToonCard, S: CharSpec, P: Pose, i: 0 | 1) => {
  c.mesh.updateMatrixWorld(); const [x, y] = handPoint(S, P, i);
  return c.mesh.localToWorld(new THREE.Vector3((x - 300) * SU, (975 - y) * SU, 0));
};
