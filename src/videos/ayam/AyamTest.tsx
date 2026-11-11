// Test run (3 scenes x 5 s) of "Satu Ayam yang Sama" in the cartoon-short look (bridge engine, MIT Mr omi; our story,
// cast and kampung):  1) hook: the rich man on his coin pile, whip glide down the road to the poor man at his shack
//                     2) harta hilang: a whirlwind lifts every house and the gold, then everyone stands in karung goni
//                     3) peternakan: one group's coops multiply while a sacked villager watches in shock (crane glide)
import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { InkPass, NOINK } from "../bridge/ink";
import { LensBlur } from "../bridge/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "../bridge/grade";
import { glide } from "../bridge/story";
import { AyamWorld, Cast, COIN_PILE, FARM, LAPANGAN, V, windX, WIND, Who, Bird, Mood, BONFIRE_AT } from "./world";
import { RICH, RICH2, MID, MID2, POOR, POOR2, state, villager } from "./people";
import { blinkAt } from "../format/toonCast";
import type { Expr } from "../bridge/toon";

const W = 1080, H = 1920, SCENE = 150;
export const AYAM_TEST_FRAMES = SCENE * 3;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ---------------- cameras: keys = arrive at f after a smootherstep glide of `dur`; holds creep in ----------------
type Key = { f: number; dur?: number; arc?: number; pos: [number, number, number]; look: [number, number, number]; fov: number; roll?: number; creep?: number };
const camOf = (keys: Key[], f: number) => {
  let n = keys.findIndex((k) => f < k.f); // next key not reached yet
  if (n === 0) n = 1;
  const k = n < 0 ? keys[keys.length - 1] : keys[n - 1], nx = n < 0 ? null : keys[n];
  let pos = V(...k.pos), look = V(...k.look), fov = k.fov, roll = k.roll ?? 0;
  if (nx && (nx.dur ?? 0) > 0 && f >= nx.f - nx.dur!) { // glide k -> nx (smootherstep)
    const u = glide((f - (nx.f - nx.dur!)) / nx.dur!);
    pos = pos.lerp(V(...nx.pos), u); pos.y += Math.sin(u * Math.PI) * (nx.arc ?? 0); look = look.lerp(V(...nx.look), u); fov = lerp(fov, nx.fov, u); roll = lerp(roll, nx.roll ?? 0, u);
  } else { // hold: creeping push-in toward the subject (0.25 %/frame of the distance)
    const held = Math.max(0, f - k.f), c = (k.creep ?? 0.0025) * held;
    pos = pos.lerp(look, Math.min(0.25, c));
  }
  return { pos, look, fov, roll };
};
/** index of the key whose light / DOF applies (the one held, or the target once a glide is half done) */
const keyIdx = (keys: Key[], f: number) => { let i = 0; for (let j = 1; j < keys.length; j++) if (f >= keys[j].f - (keys[j].dur ?? 0) / 2) i = j; return i; };
const CAMS: Key[][] = [
  [ // 1 hook: rich man on his gold, whip glide (ease) along the road, poor man at his shack
    { f: 0, pos: [27.75, 2.35, 9.9], look: [28.6, 2.2, 4.9], fov: 40, roll: -0.04 },
    { f: 79, dur: 9, pos: [27.9, 2.4, 9.6], look: [28.3, 11, 3.5], fov: 44, roll: 0.08 }, // whip up into the sky, cut
    { f: 79, pos: [-25.95, 1.45, -1.6], look: [-26.0, 1.3, 4.2], fov: 42, roll: 0.03 },
  ],
  [ // 2 whirlwind: wide over the road following the funnel, then the lapangan with everyone in sacks
    { f: 0, pos: [-34, 9, -40], look: [-36, 8, 0], fov: 52 },
    { f: 98, dur: 66, pos: [22, 9, -40], look: [24, 8, 0], fov: 52 },
    { f: 104, dur: 0, pos: [0.3, 1.75, LAPANGAN.z + 7.4], look: [0, 1.2, LAPANGAN.z - 1.2], fov: 48, roll: 0.02 },
  ],
  [ // 3 farm: close on the shocked villager, crane up and back to the growing farm
    { f: 0, pos: [FARM.x - 4.9, 1.55, FARM.z + 12.4], look: [FARM.x - 5.6, 1.3, FARM.z + 8.5], fov: 40 },
    { f: 64, dur: 36, pos: [FARM.x - 7.8, 5.6, FARM.z + 15.5], look: [FARM.x - 1.5, 0.6, FARM.z + 2.5], fov: 48 },
  ],
];
const DOF: number[][] = [[12, 4], [0, 10], [12, 0]]; // cInf per key (CU/MS 10-14 px, wides 0)

// ---------------- staging per scene ----------------
type Stage = { people: Who[]; birds: Bird[]; focus: THREE.Vector3 };
const blink = (f: number, s: number) => blinkAt(f, s);
const stageOf = (s: number, f: number): Stage => {
  const people: Who[] = [], birds: Bird[] = [];
  if (s === 0) {
    const laugh = Math.floor(f / 7) % 2 ? "laugh" : "grin";
    people.push({ id: "rich", P: RICH, x: COIN_PILE.x, z: COIN_PILE.z + 0.15, y: 1.22, opts: { mode: "sit", expr: laugh as Expr, look: 0, blink: blink(f, 3), seed: 4, wave: 0.5 + 0.5 * Math.sin(f / 4) } });
    people.push({ id: "rich2", P: RICH2, x: COIN_PILE.x + 2.4, z: COIN_PILE.z + 0.6, opts: { mode: "stand", expr: "smile", look: -0.6, blink: blink(f, 8), seed: 6 } });
    people.push({ id: "mid", P: MID, x: lerp(6, 9, f / SCENE), z: 1.6, opts: { mode: "stroll", phase: f / 22, expr: "smile_closed", look: 0.5, blink: blink(f, 2), seed: 2 } });
    people.push({ id: "mid2", P: MID2, x: lerp(4.8, 7.8, f / SCENE), z: 2.1, opts: { mode: "stroll", phase: f / 22 + 0.3, expr: "neutral", look: -0.4, blink: blink(f, 5), seed: 5 } });
    const sad = f > 100 ? "pained" : "nervous";
    people.push({ id: "poor", P: { ...POOR, extras: [...POOR.extras, "sweat"] }, x: -26.6, z: 3.95, opts: { mode: "stand", expr: sad as Expr, look: 0.2, blink: blink(f, 11), seed: 3, headTilt: -4 } });
    people.push({ id: "poor2", P: POOR2, x: -25.5, z: 4.35, opts: { mode: "stand", expr: "dazed", look: -0.7, blink: blink(f, 13), seed: 7 } });
    birds.push({ kind: "hen", x: -25.6, z: 3.4, peck: Math.sin(f * 0.3) > 0.5 ? 1 : 0, mirror: true, scale: 0.9 });
    return { people, birds, focus: f < 66 ? V(COIN_PILE.x, 2.6, COIN_PILE.z) : V(-26.6, 1.9, 4.2) };
  }
  if (s === 1) {
    if (f >= 104) { // everyone in sacks on the empty lapangan, three loose groups, dazed / shocked
      for (let i = 0; i < 14; i++) {
        const g = i % 3, gx = [-1.7, 0.1, 1.8][g], k = Math.floor(i / 3), bf = BONFIRE_AT();
        const P = state(i === 0 ? RICH : i === 1 ? MID : i === 2 ? POOR : villager(i), 1);
        const ex: Expr[] = ["shock", "dazed", "nervous", "pained"];
        people.push({ id: "s" + i, P, x: LAPANGAN.x + gx + (k % 2 ? 0.7 : -0.6) + hash(i) * 0.4, z: LAPANGAN.z - k * 1.3 - hash(i + 3) * 0.5, opts: { mode: "stand", expr: ex[(i + Math.floor((f - 104) / 30)) % 4], look: (hash(i + 5) - 0.5) * 1.6, blink: blink(f, i * 3 + 1), seed: (i % 7) + 1 }, glow: { at: V(bf.x, 0.75, bf.z + 0.2), col: [255, 150, 60], k: 0.86 + 0.08 * Math.sin(f * 1.7) + 0.06 * Math.sin(f * 3.1 + 1), radius: 5.5 } });
      }
    }
    return { people, birds, focus: f < 100 ? V(windX(f), 6, 0) : V(0, 1.6, LAPANGAN.z) };
  }
  // s === 2: farm grows; the shocked villager (poor, sacked) in front, the farmer (middle, sacked) in the farm
  people.push({ id: "watch", P: state(POOR, 1), x: FARM.x - 5.6, z: FARM.z + 8.5, opts: { mode: "stand", expr: f > 40 ? "shock" : "dazed", look: 0.9, blink: f > 40 ? 0 : blink(f, 4), seed: 3 } });
  people.push({ id: "farmer", P: state(RICH, Math.max(0, 0.6 - f / 150), Math.max(0, (f - 90) / 60)), x: FARM.x - 1.5, z: FARM.z + 3.2, opts: { mode: "stand", expr: "grin", look: -0.6, blink: blink(f, 9), seed: 5, wave: f > 70 ? 0.5 + 0.5 * Math.sin(f / 5) : undefined } });
  const n = Math.floor(lerp(4, 64, clamp01((f - 20) / 110)));
  for (let i = 0; i < n; i++) {
    const a = hash(i * 3.1), b = hash(i * 7.7);
    birds.push({ kind: i % 4 === 3 ? "chick" : "hen", x: FARM.x - 7 + a * 12, z: FARM.z + 0.5 + b * 6, peck: Math.sin(f * 0.25 + i) > 0.6 ? 1 : 0, mirror: i % 2 === 0, scale: (i % 4 === 3 ? 0.7 : 1.3) * Math.min(1, (n - i) / 2 + 0.2) });
  }
  return { people, birds, focus: f < 40 ? V(FARM.x - 5.6, 1.9, FARM.z + 8.5) : V(FARM.x, 1, FARM.z) };
};

const makeBloom = () => new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
const fwd = new THREE.Vector3();
const SceneInner: React.FC<{ s: number }> = ({ s }) => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const world = useMemo(() => new AyamWorld(), []);
  const cast = useMemo(() => new Cast(world), [world]);
  const fx = useMemo(() => ({ ink: new InkPass(scene, cam), lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }), bloom: makeBloom(), tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day) }), [scene, cam]);
  React.useEffect(() => () => InkPass.prototype.dispose.call(fx.ink), [fx]);
  const c = camOf(CAMS[s], f);
  cam.position.copy(c.pos); cam.up.set(0, 1, 0); cam.lookAt(c.look); cam.rotateZ(c.roll); cam.fov = c.fov; cam.near = 0.5; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  cam.layers.enable(NOINK);
  // sun frozen per camera key (camera-relative), shadow box on what the shot looks at
  const keys = CAMS[s], ki = keyIdx(keys, f);
  const mood = (s === 1 ? (f < 104 ? "storm" : "night") : "day") as Mood;
  world.setLight(cam, scene, { pos: V(...keys[ki].pos), look: V(...keys[ki].look) }, c.look, cam.position.distanceTo(c.look), mood);
  gradeFor(fx.grade, mood === "golden" ? "golden" : "day"); world.flicker(f); world.setRain(cam, f);
  world.setWind(s === 1 ? (f < 104 ? f : WIND.t1 + 200) : null);
  if (s === 1 && f >= 104) world.funnel.visible = false;
  if (s === 2) world.plots.forEach((p) => (p.o.visible = false)); // the farm scene happens after the whirlwind: no houses left
  if (s === 2) world.coinPile.visible = false;
  world.signs.forEach((o) => (o.visible = !(s === 2 || (s === 1 && f >= 104))));
  world.coops.forEach((co, i) => { const t = clamp01((f - (20 + i * 11)) / 10); co.visible = s === 2 && t > 0; const e = t < 1 ? 1 + Math.sin(t * Math.PI) * 0.18 : 1; co.scale.set(e * t, t, e * t); });
  const st = stageOf(s, f);
  cast.begin(); for (const w of st.people) cast.person(w, cam); for (const b of st.birds) cast.bird(b, cam); cast.end();
  cam.getWorldDirection(fwd);
  fx.lens.focus = Math.max(0.3, st.focus.clone().sub(cam.position).dot(fwd)); fx.lens.cInf = DOF[s][ki] ?? 0;
  return (
    <>
      <primitive object={world.root} dispose={null} />
      <EffectComposer multisampling={4}>
        <primitive object={fx.ink} dispose={null} />
        <primitive object={fx.lens.pre} dispose={null} />
        <primitive object={fx.lens.main} dispose={null} />
        <primitive object={fx.bloom} dispose={null} />
        <primitive object={fx.tone} dispose={null} />
        <primitive object={fx.grade} dispose={null} />
      </EffectComposer>
    </>
  );
};

/** 4-frame white flash on the cut into the lapangan (reference uses flashes as cuts) */
const Flash: React.FC<{ at: number }> = ({ at }) => { const f = useCurrentFrame(); const o = f >= at && f < at + 6 ? [1, 0.85, 0.6, 0.35, 0.15, 0.05][f - at] : 0; return <AbsoluteFill style={{ background: "#fffbea", opacity: o, pointerEvents: "none" }} />; };

export const AyamTest: React.FC = () => (
  <AbsoluteFill style={{ background: "#9cbfea" }}>
    {[0, 1, 2].map((s) => (
      <Sequence key={s} from={s * SCENE} durationInFrames={SCENE}>
        <AbsoluteFill>
          <ThreeCanvas width={W} height={H} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 40, near: 0.2, far: 1500 }}>
            <SceneInner s={s} />
          </ThreeCanvas>
        </AbsoluteFill>
        {s === 1 && <Flash at={102} />}
      </Sequence>
    ))}
  </AbsoluteFill>
);
