// Acting test v4 in the world2 set "teras kampung pagi" (src/lib/world2/teras.ts): Pak Udin tells Bu Narti about last
// night in front of his house; she is suspicious, whispers "penunggu!", he gets a full shock (peci flies, lands crooked,
// he fixes it), both end nervous. Characters: toon2 cards (src/lib/toonCard.ts). Camera never stops: two-shot push ->
// drift toward Narti -> punch-in on the shock -> back. Post: lens blur (DOF), bloom, neutral tone map, grade, vignette.
// Word times are hand-made until ElevenLabs gives real ones.
import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, BrightnessContrastEffect, HueSaturationEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect } from "postprocessing";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { LensBlur } from "../videos/bridge/lensblur";
import { NOINK } from "../videos/bridge/ink";
import { TerasSet } from "../lib/world2/teras";
import { ToonCard } from "../lib/toonCard";
import { actAt, Actor, FPS, noise, sm } from "../lib/acting";
import { UDIN, NARTI } from "./ToonGallery";

const W = 1080, H = 1920;
export const ACTING_FRAMES = 300;
type V3 = [number, number, number];

const UDIN_A: Actor = {
  seed: 3,
  words: [
    { w: "Semalam", t0: 0.35, t1: 0.8 }, { w: "saya", t0: 0.85, t1: 1.1 }, { w: "ketindihan!", t0: 1.15, t1: 1.95, stress: true, accent: "both" },
    { w: "Dada", t0: 2.35, t1: 2.6 }, { w: "saya", t0: 2.65, t1: 2.9 }, { w: "berat", t0: 2.95, t1: 3.35, stress: true, accent: "body" }, { w: "banget...", t0: 3.4, t1: 3.9 },
    { w: "kayak", t0: 4.05, t1: 4.3 }, { w: "didudukin!", t0: 4.35, t1: 5.05, stress: true, accent: "head" },
  ],
  beats: [
    { t: 0, mood: "story", arms: ["rest", "open"], turn: 0.35, look: [0.5, 0], lean: 0.02 },
    { t: 1.1, arms: ["open", "open"], bend: 8 },
    { t: 2.3, mood: "worried", arms: ["rest", "chest"], lean: 0.05, bend: -14 },
    { t: 4.0, mood: "story", arms: ["shrug", "chest"], lean: 0.02, bend: 6 },
    { t: 5.25, mood: "suspicious", arms: ["rest", "chin"], turn: 0.5, look: [0.9, 0], lean: 0.05, bend: 10 },
    { t: 7.3, mood: "shock", arms: ["up", "up"], legs: ["wide", "wide"], lean: -0.04, bend: -8, look: [0.2, 0], event: "shock" },
    { t: 7.95, mood: "scared", arms: ["hug", "hug"], legs: ["bent", "bent"], sweat: true, look: "dart" },
    { t: 8.7, mood: "nervous", arms: ["hug", "fixhat"] },
    { t: 9.35, arms: ["hug", "hug"], nod: 0.6 },
  ],
};
const NARTI_A: Actor = {
  seed: 9,
  words: [{ w: "Jangan-jangan...", t0: 5.55, t1: 6.35 }, { w: "penunggu!", t0: 6.55, t1: 7.2, stress: true }, { w: "Hiii!", t0: 8.25, t1: 8.75, stress: true }],
  beats: [
    { t: 0, mood: "suspicious", arms: ["hip", "hip"], turn: -0.35, look: [-0.6, 0] },
    { t: 1.55, mood: "surprised", arms: ["clasp", "clasp"], lean: 0.02 },
    { t: 2.4, mood: "worried", arms: ["chest", "rest"] },
    { t: 5.2, mood: "whisper", arms: ["mouthHand", "rest"], lean: -0.07, bend: -18, look: [-0.9, 0], talkSize: 0.8 },
    { t: 6.5, mood: "excited", arms: ["point", "rest"], lean: -0.03, bend: -6, talkSize: 1.2 },
    { t: 7.38, mood: "shock", arms: ["clasp", "clasp"], event: "shockSmall", lean: 0.03 },
    { t: 8.0, mood: "scared", arms: ["clasp", "clasp"], sweat: true, nod: 1, look: "dart" },
  ],
};

// stage: the yard in front of the porch; camera looks -z, so screen-right is +x (Udin left, Narti right)
const UX = -0.43, NX = 0.43, CZ = 2.75, SC = 0.85;
const two = { pos: [0, 1.22, CZ + 4.35] as V3, look: [0, 1.1, CZ] as V3, fov: 36 };
const nar = { pos: [0.98, 1.27, CZ + 3.05] as V3, look: [0.25, 1.13, CZ] as V3, fov: 38 };
const pun = { pos: [-0.33, 1.32, CZ + 2.05] as V3, look: [-0.43, 1.24, CZ] as V3, fov: 38 };
const mix = (a: typeof two, b: typeof two, u: number) => ({ pos: a.pos.map((v, i) => v + (b.pos[i] - v) * u) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * u) as V3, fov: a.fov + (b.fov - a.fov) * u });
const push = (k: number, from: typeof two) => ({ ...from, pos: from.pos.map((v, i) => v + (from.look[i] - v) * k) as V3 });
const camAt = (t: number) => {
  let c = two;
  if (t < 5.0) c = push(0.06 * sm(t / 5), two);
  else if (t < 7.27) c = mix(push(0.06, two), nar, sm((t - 5.0) / 1.1));
  else if (t < 8.6) c = mix(nar, pun, 1 - Math.pow(1 - Math.min(1, (t - 7.27) / 0.22), 3)); // punch in over ~7 frames
  else c = mix(pun, push(0.05, two), sm((t - 8.6) / 1.2));
  const d = 0.003;
  return { pos: [c.pos[0] + d * noise(t * 0.7, 1), c.pos[1] + d * noise(t * 0.9, 2), c.pos[2]] as V3, look: [c.look[0] + d * noise(t * 0.6, 3), c.look[1] + d * noise(t * 0.8, 4), c.look[2]] as V3, fov: c.fov };
};

const Inner: React.FC = () => {
  const f = useCurrentFrame(), t = f / FPS;
  const { camera, scene } = useThree(); const cam = camera as THREE.PerspectiveCamera;
  const set = useMemo(() => new TerasSet(), []);
  const cards = useMemo(() => ({ u: new ToonCard(set.root), n: new ToonCard(set.root) }), [set]);
  const post = useMemo(() => ({
    lens: new LensBlur({ maxCoC: 22, nearScale: 1.1 }),
    bloom: new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.55, luminanceThreshold: 0.92, luminanceSmoothing: 0.25, mipmapBlur: true, levels: 6, radius: 0.72 }),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    hue: new HueSaturationEffect({ saturation: 0.1 }),
    bc: new BrightnessContrastEffect({ brightness: 0.0, contrast: 0.08 }),
    vig: new VignetteEffect({ offset: 0.32, darkness: 0.5 }),
  }), []);
  scene.fog = new THREE.FogExp2("#e6cfa6", 0.022); scene.background = new THREE.Color("#d8e2ec");
  const c = camAt(t);
  cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.fov = c.fov; cam.near = 0.1; cam.far = 200; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.layers.enable(NOINK); // the character cards live on the NOINK layer
  set.update(t);
  cards.u.update(UDIN, actAt(UDIN_A, t), UX, CZ, cam, set.sunDir, SC);
  cards.n.update(NARTI, actAt(NARTI_A, t), NX, CZ + 0.15, cam, set.sunDir, SC);
  const focusX = t > 5.1 && t < 7.27 ? NX : UX;
  post.lens.focus = new THREE.Vector3(focusX, 1.1, CZ).sub(cam.position).length(); post.lens.cInf = 7;
  return (
    <>
      <primitive object={set.root} dispose={null} />
      <EffectComposer multisampling={4}>
        <primitive object={post.lens.pre} dispose={null} /><primitive object={post.lens.main} dispose={null} />
        <primitive object={post.bloom} dispose={null} /><primitive object={post.tone} dispose={null} />
        <primitive object={post.hue} dispose={null} /><primitive object={post.bc} dispose={null} /><primitive object={post.vig} dispose={null} />
      </EffectComposer>
    </>
  );
};

const Caption: React.FC<{ t: number }> = ({ t }) => {
  const w = [...UDIN_A.words, ...NARTI_A.words].find((x) => t >= x.t0 - 0.03 && t < x.t1 + 0.1);
  if (!w) return null;
  return <div style={{ position: "absolute", left: 0, right: 0, top: 1320, textAlign: "center", fontFamily: "'Avenir Next', 'Helvetica Neue', Arial, sans-serif", fontWeight: 800, fontSize: 82, color: "#fff", WebkitTextStroke: "3px #111", textShadow: "0 5px 10px rgba(0,0,0,0.55)" }}>{w.w.replace("...", "…")}</div>;
};
export const ActingTest: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#d8e2ec" }}>
      <ThreeCanvas width={W} height={H} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 36, near: 0.1, far: 200 }}>
        <Inner />
      </ThreeCanvas>
      <Caption t={f / FPS} />
    </AbsoluteFill>
  );
};
