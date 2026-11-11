// Reference stills for the next story beats of "Satu Ayam yang Sama" (one frame = one shot, rendered as stills only):
//   0 KENAPA?   the chicken presenter at the chalkboard on the village road (day)
//   1 DIBAGI    a few days later: one chicken drops into every group of sacked villagers on the lapangan (day)
//   2 DIMAKAN   group 1 roasts and eats theirs around the bonfire (night)
//   3 DISIMPAN  group 2 keeps theirs: a basket full of eggs next to a little coop (day)
//   4 GA ADIL!  group 1 protests in front of group 3's growing farm (golden, backlit)
import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { InkPass, NOINK } from "../bridge/ink";
import { LensBlur } from "../bridge/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "../bridge/grade";
import { fxPuff } from "../bridge/toon";
import type { Expr } from "../bridge/toon";
import { AyamWorld, Cast, FARM, LAPANGAN, V, Who, Bird, Mood, BONFIRE_AT, Glow } from "./world";
import { MID2, POOR, POOR2, RICH, RICH2, MID, state, villager, Person } from "./people";

const W = 1080, H = 1920;
export const AYAM_REF_FRAMES = 5;
type V3 = [number, number, number];
type Shot = { mood: Mood; pos: V3; look: V3; fov: number; cInf: number; focus: V3; houses: boolean; setup: (w: AyamWorld) => void; people: Who[]; birds: Bird[]; puffs?: V3[] };

const L = LAPANGAN, BF = BONFIRE_AT(), F = FARM;
const FIRE: Glow = { at: V(BF.x, 0.75, BF.z + 0.2), col: [255, 150, 60], k: 1, radius: 4.2 };
const sk = (P: Person, _v: number) => state(P, 1); // straight after the whirlwind: everyone's own clothes, torn
const who = (id: string, P: Person, x: number, z: number, expr: Expr, look = 0, seed = 1, extra: object = {}): Who => ({ id, P, x, z, opts: { mode: "stand", expr, look, blink: 0, seed, ...extra } });
const g1 = [sk(POOR, 0), sk(POOR2, 1), sk(villager(5), 2)];   // poor: eats it
const g2 = [sk(MID, 1), sk(MID2, 0), sk(villager(4), 2)];      // middle: keeps it for eggs
const g3 = [sk(RICH, 2), sk(RICH2, 0), sk(villager(3), 1)];    // rich: multiplies it

const SHOTS: Shot[] = [
  { mood: "day", pos: [2.65, 1.35, 6.9], look: [2.65, 1.4, 1.0], fov: 46, cInf: 12, focus: [2.4, 1.5, 1.4], houses: true,
    setup: (w) => { w.ref.board.visible = true; w.ref.board.position.set(3.05, 0, 0.7); },
    people: [], birds: [{ kind: "hen", x: 1.85, z: 1.75, peck: 0, scale: 1.9 }] },
  { mood: "day", pos: [0.25, 1.5, L.z + 5.8], look: [0, 1.85, L.z - 1.2], fov: 50, cInf: 0, focus: [0, 1.6, L.z], houses: false, setup: () => {},
    people: [
      who("a1", g1[0], -2.0, L.z - 0.2, "shock", 0.2, 3), who("a2", g1[1], -2.7, L.z - 1.1, "dazed", 0.4, 5), who("a3", g1[2], -1.4, L.z - 1.4, "nervous", 0.1, 7),
      who("b1", g2[0], 0.1, L.z - 0.4, "relief_open", 0, 2), who("b2", g2[1], 0.8, L.z - 1.3, "shock", -0.3, 4), who("b3", g2[2], -0.6, L.z - 1.6, "smile", 0.2, 6),
      who("c1", g3[0], 2.2, L.z - 0.3, "grin", -0.2, 1), who("c2", g3[1], 2.9, L.z - 1.2, "shock", -0.5, 4), who("c3", g3[2], 1.7, L.z - 1.5, "relief_open", 0, 6),
    ],
    birds: [{ kind: "hen", x: -1.15, z: L.z - 0.1, y: 2.3, peck: 0.5, scale: 1.35 }, { kind: "hen", x: 0.15, z: L.z - 0.2, y: 2.75, peck: 0, scale: 1.35, mirror: true }, { kind: "hen", x: 1.35, z: L.z - 0.1, y: 2.05, peck: 1, scale: 1.35 }],
    puffs: [[-1.15, 2.15, L.z - 0.05], [0.15, 2.6, L.z - 0.15], [1.35, 1.9, L.z - 0.05]] },
  { mood: "night", pos: [BF.x + 0.2, 1.55, BF.z + 5.3], look: [BF.x, 1.25, BF.z - 0.6], fov: 48, cInf: 12, focus: [BF.x - 1.2, 1.7, BF.z - 0.3], houses: false,
    setup: (w) => { w.ref.roast.visible = true; w.ref.roast.position.copy(BF); w.ref.roast.scale.setScalar(0.62); },
    people: [who("e1", g1[0], BF.x - 1.2, BF.z - 0.35, "lick", 0.6, 3), who("e2", g1[1], BF.x + 1.2, BF.z - 0.3, "laugh", -0.6, 5), who("e3", g1[2], BF.x + 0.05, BF.z - 1.7, "grin", 0, 7)].map((w) => ({ ...w, glow: FIRE })),
    birds: [] },
  { mood: "day", pos: [L.x - 7.6, 1.45, L.z + 2.6], look: [L.x - 7.9, 1.15, L.z - 2.0], fov: 44, cInf: 13, focus: [L.x - 8, 1.6, L.z - 2.4], houses: false,
    setup: (w) => { w.ref.basket.visible = true; w.ref.basket.position.set(L.x - 7.75, 0, L.z - 1.55); const c = w.coops[0]; c.visible = true; c.scale.setScalar(0.8); c.position.set(L.x - 6.2, 0, L.z - 4.6); },
    people: [who("d1", state(g2[0], 0.45), L.x - 8.6, L.z - 2.4, "smile", 0.4, 2), who("d2", state(g2[1], 0.45), L.x - 7.0, L.z - 2.6, "relief", -0.4, 4), who("d3", state(g2[2], 0.45), L.x - 7.85, L.z - 3.3, "smile_closed", 0, 6)],
    birds: [{ kind: "hen", x: L.x - 7.1, z: L.z - 1.5, peck: 1, scale: 1.05, mirror: true }] },
  { mood: "golden", pos: [F.x - 1.2, 1.6, F.z + 15.0], look: [F.x - 1.2, 1.85, F.z + 4.5], fov: 48, cInf: 10, focus: [F.x - 1.4, 1.8, F.z + 8.4], houses: false,
    setup: (w) => { w.coops.forEach((c) => { c.visible = true; c.scale.setScalar(1); }); },
    people: [who("p1", { ...g1[0], sign: "GA ADIL!" }, F.x - 2.3, F.z + 7.5, "pained", 0, 3), who("p2", { ...g1[1], sign: "BAGI DONG!" }, F.x - 1.35, F.z + 9.2, "stern", 0, 5), who("p3", { ...g1[2], sign: "AYAM KAMI MANA?" }, F.x - 0.6, F.z + 7.6, "pained", 0, 7),
      who("f1", state(g3[0], 0, 1), F.x + 1.2, F.z + 4.8, "grin", -0.6, 1), who("f2", state(g3[1], 0, 1), F.x - 3.6, F.z + 5.0, "whistle", 0.5, 4)],
    birds: Array.from({ length: 40 }, (_, i) => ({ kind: i % 4 === 3 ? "chick" as const : "hen" as const, x: F.x - 7 + ((i * 37) % 120) / 10, z: F.z + 0.5 + ((i * 53) % 55) / 10, peck: i % 3 ? 0 : 1, mirror: i % 2 === 0, scale: i % 4 === 3 ? 0.7 : 1.2 })) },
];

const makeBloom = () => new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
const fwd = new THREE.Vector3();
const Inner: React.FC = () => {
  const k = Math.min(SHOTS.length - 1, useCurrentFrame()), S = SHOTS[k];
  const { camera, scene } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const world = useMemo(() => new AyamWorld(), []);
  const cast = useMemo(() => new Cast(world), [world]);
  const fx = useMemo(() => ({ ink: new InkPass(scene, cam), lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }), bloom: makeBloom(), tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day) }), [scene, cam]);
  React.useEffect(() => () => InkPass.prototype.dispose.call(fx.ink), [fx]);
  const pos = V(...S.pos), look = V(...S.look);
  cam.position.copy(pos); cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = S.fov; cam.near = 0.5; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.layers.enable(NOINK);
  world.setLight(cam, scene, { pos, look }, look, pos.distanceTo(look), S.mood);
  gradeFor(fx.grade, S.mood === "golden" ? "golden" : "day"); world.flicker(k * 7);
  world.setWind(null);
  world.plots.forEach((p) => (p.o.visible = S.houses)); world.coinPile.visible = false; world.signs.forEach((o) => (o.visible = S.houses));
  world.setCrack(0, 0, 0); world.coops.forEach((c) => (c.visible = false)); world.ref.board.visible = world.ref.roast.visible = world.ref.basket.visible = false; world.ref.protest.forEach((p) => (p.visible = false));
  S.setup(world);
  for (const p of world.ref.protest) p.rotation.y = Math.atan2(cam.position.x - p.position.x, cam.position.z - p.position.z);
  world.ref.board.rotation.y = Math.atan2(cam.position.x - world.ref.board.position.x, cam.position.z - world.ref.board.position.z) * 0.6;
  cast.begin();
  for (const w of S.people) cast.person(w, cam);
  for (const b of S.birds) cast.bird(b, cam);
  (S.puffs ?? []).forEach(([x, y, z], i) => cast.fx("puff" + i, 300, 300, (p) => fxPuff(p, 0.55), x, y, z, 0.8, 0.8, cam));
  cast.end();
  cam.getWorldDirection(fwd);
  fx.lens.focus = Math.max(0.3, V(...S.focus).sub(cam.position).dot(fwd)); fx.lens.cInf = S.cInf;
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
export const AyamRef: React.FC = () => (
  <AbsoluteFill style={{ background: "#9cbfea" }}>
    <ThreeCanvas width={W} height={H} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 40, near: 0.5, far: 1500 }}>
      <Inner />
    </ThreeCanvas>
  </AbsoluteFill>
);
