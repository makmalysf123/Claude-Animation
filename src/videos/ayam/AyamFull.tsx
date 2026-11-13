// "Satu Ayam yang Sama": the full 80 s short (2400 f), rebuilt with the acting engine from the tests (AyamActTest):
// continuous cameras, live faces, props moved by actions, ruins after the whirlwind, light sources, background life,
// and motivated transitions (follow an object, shape match, matched-composition dissolves through the sky / time).
// Timed to the scratch narration's word times (voice/ayam/words.json); the picture ships WITHOUT the voice (the user
// records their own to docs/scripts/satu-ayam-timing.md). Scenes overlap by XF frames and dissolve.
import React from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { fxPuff } from "../bridge/toon";
import type { P2 } from "../bridge/toon";
import { COIN_PILE, FARM, V, Bird } from "./world";
import { RICH, RICH2, MID, MID2, POOR, POOR2, state, villager, Person } from "./people";
import { fxDebris, fxCoin, fxEggCrack } from "./acting";
import {
  Scene, SceneInner, Ctx, Key, V3, Hands, sceneA, sceneB, sceneC, person, fx, smoke, push, orbit, reach, sm, lerp, clamp01, hash, at,
  L, BF, FIRE, G1, MX, BASKET,
} from "./AyamActTest";
import { Timeline, MapPart, TinTin, JOKER } from "./AyamShort";

const W = 1080, H = 1920, XF = 8;
const OLD_FRAMES = 2400;
const MZ = L.z - 2.4, F = FARM;
const G2 = [MID, MID2, villager(7)], G3 = [RICH, RICH2, villager(6)];
const RX = L.x - 2.9, RZ = L.z - 2.0; // the rich group's spot on the lapangan
const sky = (pos: V3, look: V3, fov = 46): Key => ({ f: 0, s: () => ({ pos, look, fov, roll: 0.02 }) });
const hens = (c: Ctx, list: Bird[]) => list.forEach((b) => c.cast.bird(b, c.cam));
const flock = (n: number, l: number, cx: number, cz: number, w: number, d: number, seed = 0): Bird[] => Array.from({ length: n }, (_, i) => ({
  kind: i % 5 === 4 ? "chick" as const : "hen" as const, x: cx + (hash(i * 2.3 + seed) - 0.5) * w + 0.15 * Math.sin(l * 0.05 + i), z: cz + (hash(i * 5.9 + seed) - 0.5) * d,
  peck: Math.sin(l * 0.3 + i) > 0.5 ? 1 : 0, mirror: i % 2 === 0, scale: i % 5 === 4 ? 0.6 : 1.05 }));

// ======================= 1 · hook (0-4.9 s): rich man on his gold -> the poor couple -> the KENAPA? board =======================
const t1 = at(0);
const s1: Scene = {
  set: "intact", len: 147, mood: () => "day",
  keys: [ // three places, joined by short dips to black (the camera keeps drifting in each)
    { f: 0, s: (l) => ({ ...push(orbit([COIN_PILE.x - 0.6, 1.2, COIN_PILE.z + 4.6], [COIN_PILE.x, 2.0, COIN_PILE.z], -8 + l * 0.35), [COIN_PILE.x, 2.0, COIN_PILE.z], l, 0, 0.003), fov: 42, roll: -0.04 }) },
    { f: 41, cut: true, s: (l) => ({ pos: orbit([-25.9, 1.5, -1.7], [-26.1, 1.6, 4.1], (l - 41) * 0.12), look: [-26.1, 1.6, 4.1], fov: 42, roll: 0.02 }) }, // (dip to black)
    { f: 89, cut: true, s: (l) => ({ ...push([2.65, 1.35, 6.9], [2.65, 1.4, 1.0], l, 89, 0.0022, 0.004, 24), fov: 46 }) }, // (dip to black)
  ],
  dof: (l) => (l < 41 ? { cInf: 12, focus: [COIN_PILE.x, 2.0, COIN_PILE.z] } : l < 89 ? { cInf: 12, focus: [-26.1, 1.7, 4.1] } : { cInf: 10, focus: [2.4, 1.5, 1.4] }),
  pose: (c) => {
    const { l } = c, flip = (l % 18) / 18;
    person(c, "rich", state(RICH, 0, 1), COIN_PILE.x, COIN_PILE.z + 0.15, { seed: 4, beats: [[0, "grin"], [12, "laugh"], [30, "grin"]] },
      { mode: "sit", look: -0.3, hands: [[-0.7, 0.55], [0.75, lerp(0.2, -0.3, Math.sin(flip * Math.PI))]], hold: [null, "coin"], tilt: 3 * Math.sin(l * 0.3) }, { y: 1.22 });
    fx(c, `coinflip${Math.round(flip * 8)}`, (p) => fxCoin(p, flip * 9), COIN_PILE.x + 0.4, 2.3 + 0.7 * Math.sin(flip * Math.PI), COIN_PILE.z + 0.3, 0.16, 0.16, 200, 200);
    person(c, "rich2", state(RICH2, 0, 1), COIN_PILE.x + 2.3, COIN_PILE.z + 0.7, { seed: 6, beats: [[0, "smile"], [20, "grin"]] }, { look: -0.7, hands: [null, [0.3, -0.45]], hold: [null, "coin"] });
    person(c, "poor", { ...state(POOR, 0), extras: [...POOR.extras, "sweat"] }, -26.6, 3.95, { seed: 3, beats: [[0, "neutral"], [t1(1.67), "nervous"], [70, "pained"]] }, { look: 0.3, headTilt: -4, hands: [[-0.25, 0.85], [0.25, 0.85]] });
    person(c, "poor2", state(POOR2, 0), -25.5, 4.35, { seed: 7, beats: [[0, "pained"], [64, "nervous"]] }, { look: -0.7, hands: [[-0.55, 0.75], null] });
    person(c, "poor3", state(villager(2), 0), -27.6, 4.9, { seed: 9, beats: [[0, "dazed"]] }, { mode: "sit", look: 0.4 });
    c.w.ref.board.visible = true; c.w.ref.board.position.set(3.05, 0, 0.7); c.w.setBoard("kenapa"); c.w.ref.board.rotation.y = -0.1;
    const peck = l > t1(3.93) && l < t1(3.93) + 6 ? 1 : 0;
    hens(c, [{ kind: "hen", x: 1.85, z: 1.75, peck, scale: 1.9 }, { kind: "hen", x: -25.0, z: 3.0, peck: Math.sin(l * 0.3) > 0.5 ? 1 : 0, mirror: true, scale: 0.9 }]);
  },
};

// ======================= 3 · everyone the same, hungry (10.9-15.1 s, night among the ruins) =======================
const t3 = at(10.9);
const W3: [V3, V3] = [[L.x + 0.3, 1.9, L.z + 8.4], [L.x, 1.3, L.z - 1.2]]; // the wide that dissolves into "three days later"
const CROWD = Array.from({ length: 12 }, (_, i) => {
  const g = i % 3, k = Math.floor(i / 3), P = [[POOR, POOR2, villager(2), villager(11)], [MID, MID2, villager(7), villager(13)], [RICH, RICH2, villager(6), villager(9)]][g][k % 4];
  return { P, x: L.x + [-1.9, 0.1, 1.9][g] + (k % 2 ? 0.75 : -0.6) + hash(i) * 0.35, z: L.z - k * 1.25 - hash(i + 3) * 0.4, seed: (i % 7) + 1 };
});
const s3: Scene = {
  len: 126, mood: () => "night",
  keys: [
    { f: 0, s: (l) => ({ pos: orbit(W3[0], W3[1], 6 - l * 0.08), look: W3[1], fov: 48, roll: 0.02 }) },
    { f: t3(12.6), dur: 26, s: (l) => ({ pos: orbit([L.x + 0.9, 1.65, L.z + 2.6], [L.x + 0.6, 1.6, L.z - 0.2], (l - t3(12.6)) * 0.25), look: [L.x + 0.6, 1.6, L.z - 0.2], fov: 40, roll: -0.03 }) },
    { f: 104, dur: 22, s: () => ({ pos: W3[0], look: W3[1], fov: 48, roll: 0.02 }) },
  ],
  dof: (l) => (l > t3(12.6) && l < 104 ? { cInf: 12, focus: [L.x + 0.6, 1.6, L.z - 0.2] } : { cInf: 4 }),
  pose: (c) => {
    const { l } = c, hungry = l >= t3(14.18) - 4;
    CROWD.forEach((m, i) => person(c, "cr" + i, state(m.P, 1), m.x, m.z,
      { seed: m.seed, beats: [[0, (["dazed", "nervous", "pained"] as const)[i % 3]], [t3(14.18), "pained"]] },
      { look: (hash(i + 5) - 0.5) * 1.4, hands: hungry ? [[-0.2, 0.95], [0.2, 0.95]] : [null, null], tilt: hungry ? 4 : 0, squat: hungry && i % 4 === 1 ? 0.25 : 0 }, { glow: FIRE(l, 0.8) }));
    for (let k = 0; k < 10; k++) { const u = clamp01((l - k * 3) / 40), kind = k % 3, a = Math.round((l * 0.3 + k) % 6.28 * 3) / 3; if (u < 1) fx(c, `deb${kind}|${a}`, (p) => { p.g.translate(150, 150); p.g.rotate(a); p.g.translate(-150, -150); fxDebris(p, kind); }, L.x + (hash(k) - 0.5) * 12, 14 - u * 14, L.z - 6 - hash(k + 2) * 8, 0.6); }
    smoke(c, "fire", BF.x, 1.6, BF.z - 0.4, l, 4, 60, 0, 0.9, 2.6);
  },
};

// ======================= 4 · three days later: one chicken drops into each group (15.1-18.0 s, day) =======================
const t4 = at(15.1), LAND = t4(17.2);
const A0 = { pos: orbit([BF.x + 0.4, 3.4, BF.z + 7.4], [BF.x, 1.2, BF.z - 0.5], -14), look: [BF.x, 1.2, BF.z - 0.5] as V3 }; // sceneA's first framing
const E1: [number, number] = [BF.x - 1.4, BF.z - 0.15], E2: [number, number] = [BF.x + 1.3, BF.z - 0.3], E3: [number, number] = [BF.x + 0.05, BF.z - 1.6];
const DROPS: [number, number][] = [[BF.x - 0.2, BF.z + 0.4], [MX + 0.9, MZ + 0.8], [RX + 0.5, RZ + 0.9]];
const s4: Scene = {
  len: 87, mood: () => "day",
  keys: [
    { f: 0, s: () => ({ pos: W3[0], look: W3[1], fov: 48, roll: 0.02 }) },
    { f: 10, dur: 20, s: () => ({ pos: [L.x - 1.0, 1.2, L.z + 7.2], look: [L.x - 2.5, 12, L.z - 2], fov: 52, roll: -0.03 }) }, // look up: something falls
    { f: 34, dur: 24, s: (l) => ({ pos: [L.x - 1.0, 1.5, L.z + 7.6], look: [L.x - 2.5, lerp(8, 1.0, sm((l - 34) / 28)), L.z - 0.6], fov: 54 }) }, // follow them down
    { f: 66, dur: 21, s: () => ({ pos: A0.pos, look: A0.look, fov: 50, roll: 0.03 }) }, // to group 1 (dissolves to the same framing at night)
  ],
  dof: () => ({ cInf: 3 }),
  pose: (c) => {
    const { l } = c, landed = l >= LAND;
    const beats = (s: number) => ({ seed: s, beats: [[0, "dazed"], [t4(16.0), "shock"], [LAND + 2, "relief_open"], [LAND + 18, "grin"]] as [number, import("../bridge/toon").Expr][] });
    const up: Hands = [[-0.5, -0.9], [0.5, -0.95]], catchH: Hands = [[-0.3, 0.45], [0.3, 0.45]];
    const hands = l < t4(16.0) ? undefined : l < LAND - 4 ? up : catchH;
    person(c, "e1", state(G1[0], 1), E1[0], E1[1], beats(3), { look: 0.6, headTilt: !landed && l > t4(16.0) ? -8 : 0, hands, squat: landed ? 0.15 : 0 });
    person(c, "e2", state(G1[1], 1), E2[0], E2[1], beats(5), { look: -0.6, hands });
    person(c, "e3", state(G1[2], 1), E3[0], E3[1], beats(7), { hands });
    [[MX - 0.9, MZ - 0.2], [MX + 0.3, MZ], [MX - 0.2, MZ - 1.1]].forEach(([x, z], i) => person(c, "m" + i, state(G2[i], 1), x, z, beats(2 + i * 2), { look: 1, hands }));
    [[RX + 0.3, RZ], [RX - 0.5, RZ - 0.6], [RX + 1.1, RZ + 0.7]].forEach(([x, z], i) => person(c, "r" + i, state(G3[i], 1), x, z, beats(4 + i), { look: -1, hands }));
    DROPS.forEach(([x, z], i) => { const u = clamp01((l - (LAND - 30) - i * 2) / 30), y = Math.max(0, 14 * (1 - u * u));
      hens(c, [{ kind: "hen", x, z, y, peck: u < 1 ? 0.5 : Math.sin(l * 0.3 + i) > 0.6 ? 1 : 0, scale: 1.1, mirror: i === 1 }]);
      const pu = clamp01((l - LAND - i * 2) / 18); if (pu > 0 && pu < 1) c.cast.fx(`puff${i}${Math.round(pu * 20)}`, 300, 300, (p) => fxPuff(p, pu), x, 0.25, z + 0.2, 0.9 + pu, 0.9 + pu, c.cam); });
  },
};

// ======================= 6 · group 2 keeps theirs alive: eggs from the hen, a rooster to breed (24.6-32.8 s) =======================
const t6 = at(24.6);
const S6_HIDUP = t6(26.4), S6_BETINA = t6(28.25), S6_JANTAN = t6(30.55), S6_KAWIN = t6(31.81);
const HEN6: [number, number] = [MX + 0.2, MZ + 1.3];
const B0: { pos: V3; look: V3 } = { pos: orbit([L.x - 1.9, 1.15, L.z + 1.6], [RX, 1.6, RZ], -10), look: [RX, 1.6, RZ] }; // sceneB's first framing
const s6: Scene = {
  yard: true, len: 246, mood: () => "day",
  keys: [
    { f: 0, s: (l) => ({ pos: orbit([MX + 0.4, 1.7, MZ + 4.6], [MX - 0.2, 1.3, MZ], 8 - l * 0.08), look: [MX - 0.2, 1.3, MZ], fov: 46 }) },
    { f: S6_HIDUP - 8, dur: 24, s: (l) => ({ pos: orbit([MX - 1.2, 1.45, MZ + 2.4], [MX - 0.3, 1.4, MZ - 0.2], (l - S6_HIDUP) * 0.2), look: [MX - 0.3, 1.4, MZ - 0.2], fov: 40, roll: 0.03 }) }, // the hungry man reaches, she stops him
    { f: S6_BETINA - 6, dur: 22, s: (l) => ({ ...push([HEN6[0] + 0.5, 0.5, HEN6[1] + 1.9], [HEN6[0], 0.45, HEN6[1]], l, S6_BETINA, 0.003), fov: 38 }) }, // low: the hen lays, she picks the egg up
    { f: S6_JANTAN - 10, dur: 22, s: (l) => { const u = sm((l - S6_JANTAN + 10) / 50); return { pos: [lerp(MX + 2.6, MX + 1.0, u), 0.9, MZ + 2.8], look: [lerp(MX + 3.2, MX + 0.9, u), 0.6, MZ + 1.1], fov: 42 }; } }, // follow the rooster in
    { f: S6_KAWIN + 10, dur: 36, s: () => ({ pos: B0.pos, look: B0.look, fov: 36, roll: -0.03 }) }, // swing over to the rich group plotting (dissolves into scene 7)
  ],
  dof: (l) => (l < S6_BETINA - 6 ? { cInf: 10, focus: [MX - 0.3, 1.4, MZ - 0.2] } : l < S6_KAWIN + 10 ? { cInf: 13, focus: [HEN6[0], 0.5, HEN6[1]] } : { cInf: 13, focus: [RX, 1.6, RZ] }),
  pose: (c) => {
    const { l, w } = c;
    // the basket fills egg by egg (eggs are basket children 3.., 13 in all)
    const eggs = l < S6_BETINA + 26 ? 0 : Math.min(13, 1 + Math.floor((l - S6_BETINA - 26) / 10));
    w.ref.basket.visible = true; w.ref.basket.position.copy(BASKET); w.ref.basket.children.forEach((ch, i) => (ch.visible = i < 3 || i - 3 < eggs));
    // the hungry man reaches for the hen; his wife catches his arm and shakes her head
    const reachT = clamp01((l - S6_HIDUP + 10) / 12) * (1 - clamp01((l - S6_HIDUP - 26) / 10));
    const m2x = MX - 0.2, m2z = MZ - 0.6, m0x = MX - 0.9, m0z = MZ - 0.2;
    const hand2 = reach(c.cam, m2x, m2z, V(HEN6[0], 0.5, HEN6[1])), handR: P2 = [lerp(0.4, hand2[0], reachT), lerp(0.85, hand2[1], reachT)];
    person(c, "m2", state(G2[2], 0.8), m2x, m2z, { seed: 6, beats: [[0, "nervous"], [S6_HIDUP - 8, "lick"], [S6_HIDUP + 14, "pained"], [S6_BETINA + 30, "smile"]] }, { hands: [null, handR], squat: 0.2 * reachT, tilt: 6 * reachT });
    const stop = clamp01((l - S6_HIDUP) / 6) * (1 - clamp01((l - S6_HIDUP - 26) / 10));
    const egg = l >= S6_BETINA + 8 && l < S6_BETINA + 30, pick = clamp01((l - S6_BETINA - 8) / 10), put = clamp01((l - S6_BETINA - 20) / 10);
    const m0Hands: Hands = stop > 0.05 ? [null, [0.9 * stop + 0.25, 0.6]] : egg ? [null, put > 0 ? [lerp(0.6, 1.4, put), lerp(0.3, 1.0, put)] : [lerp(0.9, 0.6, pick), lerp(1.3, 0.3, pick)]] : [null, null];
    person(c, "m0", state(G2[0], 0.8), m0x, m0z, { seed: 2, beats: [[0, "nervous"], [S6_HIDUP, "stern"], [S6_HIDUP + 22, "smile"], [S6_BETINA + 12, "relief_open"], [S6_JANTAN, "smile"]] },
      { hands: m0Hands, hold: [null, egg && put < 1 ? "egg" : null], headTilt: stop > 0.5 ? 7 * Math.sin(l * 0.8) : 0, squat: egg ? 0.45 * (1 - put) : 0, look: 0.8 });
    person(c, "m1", state(G2[1], 0.8), MX + 0.3, MZ, { seed: 4, beats: [[0, "nervous"], [S6_JANTAN, "grin"], [S6_KAWIN, "laugh"]] }, { look: 1, hands: l >= S6_JANTAN ? [null, [1.0, -0.15]] : [null, null] });
    // the rich group plots in the background (scene 7 opens on them)
    person(c, "r0", state(G3[0], 0.8), RX + 0.3, RZ, { seed: 4, beats: [[0, "neutral"], [S6_KAWIN, "grin"]] }, { look: -1, hands: l > S6_KAWIN ? [[-0.25, 0.6], [0.25, 0.6 + 0.04 * Math.sin(l * 1.2)]] : [null, null] });
    person(c, "r1", state(G3[1], 0.8), RX - 0.5, RZ - 0.6, { seed: 6, beats: [[0, "smile"]] }, { look: -1 });
    person(c, "r2", state(G3[2], 0.8), RX + 1.1, RZ + 0.7, { seed: 1, beats: [[0, "neutral"], [S6_KAWIN + 10, "grin"]] }, { look: -1 });
    const lay = clamp01((l - S6_BETINA + 2) / 6);
    const birds: Bird[] = [{ kind: "hen", x: HEN6[0], z: HEN6[1], peck: l > S6_BETINA - 2 && l < S6_BETINA + 6 ? 0.4 : Math.sin(l * 0.25) > 0.6 ? 1 : 0, mirror: true, scale: 1.05 }];
    if (l >= S6_JANTAN - 10) { const u = sm((l - S6_JANTAN + 10) / 40); birds.push({ kind: "rooster", x: lerp(MX + 3.6, HEN6[0] + 0.7, u), z: HEN6[1] + 0.1, peck: u < 1 ? (Math.floor(l / 4) % 2) * 0.3 : 0, mirror: true, scale: 1.15 }); }
    hens(c, birds);
    if (lay > 0 && lay < 1) c.cast.fx(`lay${Math.round(lay * 10)}`, 300, 300, (p) => fxPuff(p, lay), HEN6[0] - 0.3, 0.2, HEN6[1] + 0.1, 0.5, 0.5, c.cam);
    if (l >= S6_BETINA && l < S6_BETINA + 8) fx(c, "egg", (p) => p.ell(150, 170, 60, 76, "#fbf3e2", 8), HEN6[0] - 0.32, 0.1, HEN6[1] + 0.12, 0.16);
    if (l >= S6_KAWIN) for (let k = 0; k < 3; k++) { const u = ((l - S6_KAWIN) / 30 + k / 3) % 1; fx(c, "heart", (p) => { p.g.fillStyle = "#e8474f"; p.g.beginPath(); p.g.moveTo(150, 240); p.g.bezierCurveTo(40, 160, 70, 60, 150, 110); p.g.bezierCurveTo(230, 60, 260, 160, 150, 240); p.g.fill(); p.g.lineWidth = 8; p.g.strokeStyle = "#241726"; p.g.stroke(); }, HEN6[0] + 0.35 + 0.15 * Math.sin(u * 7 + k), 0.8 + u * 0.9, HEN6[1] + 0.1, 0.16 * (1 - u * 0.4)); }
  },
};

// ======================= 7 · group 3's deal: scene B, opening on the plotters (no sky) =======================
const s7: Scene = { ...sceneB, keys: [{ ...sceneB.keys[1], f: 0 }, ...sceneB.keys.slice(2, -1)] };

// ======================= 8 · "group 2 wants eggs, group 3 wants chickens" at the board (40.7-44.2 s) =======================
const t8 = at(40.7), S8_TELUR = t8(41.47), S8_AYAM = t8(43.39);
const BOARD8 = V(L.x + 0.4, 0, L.z - 1.0);
const s8: Scene = {
  len: 105, mood: () => "day",
  keys: [
    { f: 0, s: (l) => ({ pos: orbit([L.x, 1.4, L.z + 5.4], [L.x + 0.1, 1.45, L.z - 0.7], -6 + l * 0.12), look: [L.x + 0.1, 1.45, L.z - 0.7], fov: 46 }) },
    { f: S8_TELUR - 4, dur: 18, s: () => ({ pos: [BOARD8.x + 0.2, 1.75, BOARD8.z + 3.2], look: [BOARD8.x + 0.1, 1.78, BOARD8.z], fov: 36 }) }, // on the egg row
    { f: S8_AYAM - 6, dur: 18, s: () => ({ pos: [BOARD8.x + 0.35, 1.42, BOARD8.z + 2.8], look: [BOARD8.x + 0.32, 1.42, BOARD8.z], fov: 34 }) }, // on the chicks row
    { f: 90, dur: 15, s: () => ({ pos: [BOARD8.x + 0.3, 1.42, BOARD8.z + 0.75], look: [BOARD8.x + 0.3, 1.42, BOARD8.z], fov: 30 }) }, // into the drawn chicks (they dissolve into real ones)
  ],
  dof: () => ({ cInf: 8, focus: [BOARD8.x, 1.5, BOARD8.z] }),
  pose: (c) => {
    const { l, w } = c;
    w.ref.board.visible = true; w.ref.board.position.copy(BOARD8); w.setBoard("telurAyam"); w.ref.board.rotation.y = 0;
    const peck = (l >= S8_TELUR && l < S8_TELUR + 5) || (l >= S8_AYAM && l < S8_AYAM + 5) ? 1 : 0;
    hens(c, [{ kind: "hen", x: L.x - 0.8, z: L.z - 0.05, peck, scale: 1.9 }]);
    person(c, "m1", state(G2[1], 0.6), L.x - 3.2, L.z - 3.5, { seed: 4, beats: [[0, "smile"]] }, { look: 1, hold: [null, "egg"], hands: [null, [0.5, 0.4]] });
    person(c, "r0", state(G3[0], 0.6), L.x + 3.6, L.z - 3.8, { seed: 4, beats: [[0, "grin"]] }, { look: -1 });
  },
};

// ======================= 9 · chicks hatch, the farm grows (44.2-52.5 s) =======================
const t9 = at(44.2), S9_MENETAS = t9(46.11), S9_BULAN = t9(47.21), S9_LAMA = t9(49.92);
const NEST = V(F.x - 0.6, 0, F.z + 6.0);
const coopsAt = (l: number) => (l < S9_BULAN ? 0 : l < t9(48.55) ? 1 : l < S9_LAMA ? 3 : l < t9(51.4) ? 6 : 9);
const HIGH9 = { pos: [F.x - 7.8, 6.8, F.z + 17.5] as V3, look: [F.x - 1.5, 0.6, F.z + 2.5] as V3 };
const s9: Scene = {
  len: 249, mood: () => "day",
  keys: [
    { f: 0, s: (l) => ({ ...push([NEST.x + 0.25, 1.35, NEST.z + 1.55], [NEST.x, 0.3, NEST.z + 0.2], l, 0, 0.003), fov: 40 }) }, // looking down into the nest
    { f: S9_MENETAS + 18, dur: 40, s: (l) => ({ pos: orbit([NEST.x - 1.2, 1.5, NEST.z + 4.4], [NEST.x - 0.6, 1.0, NEST.z], (l - S9_MENETAS) * 0.12), look: [NEST.x - 0.6, 1.0, NEST.z], fov: 44 }) }, // back to the owner's grin
    { f: S9_BULAN + 10, dur: 50, s: (l) => ({ pos: orbit(HIGH9.pos, HIGH9.look, (l - S9_BULAN) * 0.06), look: HIGH9.look, fov: 48 }) }, // crane up: the farm grows
  ],
  dof: (l) => (l < S9_MENETAS + 18 ? { cInf: 14, focus: [NEST.x, 0.35, NEST.z] } : l < S9_BULAN + 10 ? { cInf: 10, focus: [NEST.x - 1.2, 1.5, NEST.z] } : { cInf: 0 }),
  pose: (c) => {
    const { l, w } = c, n = coopsAt(l);
    w.coops.forEach((co, i) => { const t0 = i < 1 ? S9_BULAN : i < 3 ? t9(48.55) + (i - 1) * 6 : i < 6 ? S9_LAMA + (i - 3) * 6 : t9(51.4) + (i - 6) * 5, u = clamp01((l - t0) / 8);
      co.visible = i < n || u > 0; co.scale.setScalar(Math.max(0.01, i < n ? (u < 1 ? 1.1 * Math.sin(u * Math.PI * 0.6) / Math.sin(Math.PI * 0.6) : 1) : 0.01));
      if (u > 0 && u < 1) c.cast.fx(`cp${i}${Math.round(u * 10)}`, 300, 300, (p) => fxPuff(p, u), co.position.x, 0.4, co.position.z + 1.2, 2 + u, 2 + u, c.cam); });
    // each egg cracks in stages (crack runs round, cap lifts off and tumbles aside), the chick climbs out, the shell stays
    const CRK = (i: number) => S9_MENETAS + i * 4 - 8;
    w.ref.basket.visible = true; w.ref.basket.position.copy(NEST); w.ref.basket.children.forEach((ch, i) => (ch.visible = i < 3 || (i - 3 < 5 && l < CRK(i - 3))));
    w.ref.basket.updateMatrixWorld(true);
    const eggAt = [0, 1, 2, 3, 4].map((i) => w.ref.basket.children[3 + i].getWorldPosition(new THREE.Vector3()));
    const dmg = lerp(0.6, 0.2, clamp01((l - S9_BULAN) / 150));
    person(c, "o", state(G3[0], dmg, clamp01((l - S9_LAMA) / 60)), NEST.x - 1.3, NEST.z - 0.6, { seed: 4, beats: [[0, "smile"], [S9_MENETAS, "grin"], [S9_LAMA, "laugh"]] }, { look: 0.7, hands: [[-0.25, 0.6], [0.25, 0.6 + 0.04 * Math.sin(l * 1.2)]] });
    person(c, "o2", state(G3[1], dmg), F.x - 1.5, F.z + 3.2, { seed: 6, beats: [[0, "smile"], [S9_LAMA, "grin"]] }, { look: -0.6 });
    person(c, "o3", state(G3[2], dmg), F.x + 1.8, F.z + 4.4, { seed: 1, beats: [[0, "neutral"], [S9_BULAN, "grin"]] }, { look: -0.8, hands: [null, [0.6, -0.2]] });
    const birds: Bird[] = [{ kind: "hen", x: NEST.x + 0.7, z: NEST.z - 0.1, peck: 0, scale: 1.0 }];
    for (let i = 0; i < 5; i++) { const tt = (l - CRK(i) - 8) / 6, e = eggAt[i]; if (tt > 0) { const out = clamp01(tt / 2.5); // climbs out of its shell, then wanders a little
      birds.push({ kind: "chick", y: e.y - 0.05 + 0.04 * Math.sin(Math.min(1, tt) * Math.PI), x: e.x + 0.06 * out + 0.03 * Math.sin(l * 0.2 + i) * out, z: e.z + 0.05 * out, peck: Math.sin(l * 0.6 + i) > 0 ? 1 : 0, mirror: i % 2 === 1, scale: 0.62 * Math.min(1, 0.35 + tt * 0.9) }); } }
    const many = Math.floor(lerp(0, 70, clamp01((l - S9_BULAN) / 150)));
    hens(c, [...birds, ...flock(many, l, F.x - 1.5, F.z + 2.8, 13, 6.5, 3)]);
    for (let i = 0; i < 5; i++) { const tc = CRK(i), e = eggAt[i]; if (l >= tc) { const t = Math.round(clamp01((l - tc) / 16) * 32) / 32; c.cast.fx(`eggcrk${t}`, 300, 300, (p) => fxEggCrack(p, t), e.x, e.y + 0.03, e.z + 0.01, 0.37, 0.37, c.cam); } }
  },
};

// ======================= 10 · group 1 has nothing: protest at sunset (52.5-57.5 s) =======================
const t10 = at(52.5), S10_PROTES = t10(56.54);
const SIGNS: [Person, string, number, number][] = [[G1[0], "GA ADIL!", -2.3, 7.5], [G1[1], "BAGI DONG!", -1.35, 9.2], [G1[2], "AYAM KAMI MANA?", 0.05, 7.9]];
const s10: Scene = {
  len: 150, mood: () => "golden", wet: [[F.x - 1.6, F.z + 10.4, 1.3, 0.3], [F.x + 0.6, F.z + 9.9, 0.85, 1.2], [F.x - 0.4, F.z + 6.2, 0.9, 2.1]],
  keys: [
    { f: 0, s: () => ({ pos: HIGH9.pos, look: HIGH9.look, fov: 48 }) },
    { f: 8, dur: 50, s: (l) => ({ pos: orbit([F.x - 1.0, 1.75, F.z + 13.5], [F.x - 0.6, 1.4, F.z + 4.5], -10 + (l - 8) * 0.08), look: [F.x - 0.6, 1.4, F.z + 4.5], fov: 48 }) }, // behind the protesters, the farm beyond
    { f: S10_PROTES - 26, dur: 30, s: (l) => ({ pos: orbit([F.x - 1.2, 1.6, F.z + 3.6], [F.x - 1.2, 1.9, F.z + 8.2], (l - S10_PROTES) * 0.15), look: [F.x - 1.2, 1.9, F.z + 8.2], fov: 46, roll: 0.03 }) }, // round to their angry faces
    { f: 130, dur: 20, s: () => ({ pos: [F.x + 0.05, 2.75, F.z + 6.2], look: [F.x + 0.05, 2.75, F.z + 7.9], fov: 40 }) }, // onto the sign (dissolves to the egg basket)
  ],
  dof: (l) => (l < S10_PROTES - 26 ? { cInf: 6, focus: [F.x - 1.2, 1.8, F.z + 8] } : { cInf: 10, focus: [F.x - 1.2, 1.9, F.z + 8.2] }),
  pose: (c) => {
    const { l, w } = c, angry = l >= S10_PROTES - 2;
    w.coops.forEach((co) => { co.visible = true; co.scale.setScalar(1); });
    SIGNS.forEach(([P, sign, dx, dz], i) => person(c, "p" + i, { ...state(P, 1), sign }, F.x + dx, F.z + dz,
      { seed: 3 + i * 2, beats: [[0, (["pained", "nervous", "pained"] as const)[i]], [S10_PROTES, "stern"]], talk: angry ? [[S10_PROTES, 150]] : undefined },
      { tilt: angry ? 4 * Math.sin(l * 0.5 + i) : 1.2 * Math.sin(l * 0.12 + i), headTilt: angry ? 3 * Math.sin(l * 0.7 + i * 2) : 0,
        signSway: angry ? 0.14 * Math.sin(l * 0.42 + i * 1.7) : 0.05 * Math.sin(l * 0.16 + i * 2.1) }));
    person(c, "f1", state(G3[0], 0, 1), F.x + 1.4, F.z + 4.6, { seed: 1, beats: [[0, "grin"]] }, { look: -0.6, hands: [[-0.25, 0.6], [0.25, 0.6]] });
    person(c, "f2", state(G3[1], 0, 1), F.x - 3.8, F.z + 4.8, { seed: 4, beats: [[0, "whistle"]] }, { look: 0.5 });
    hens(c, flock(40, l, F.x - 1.5, F.z + 2.5, 12, 5, 5));
  },
};

// ======================= 11 · group 2: eggs enough to live calmly (57.5-60.2 s) =======================
const t11 = at(57.5);
const s11: Scene = {
  yard: true, len: 81, mood: () => "day",
  keys: [
    { f: 0, s: () => ({ pos: [BASKET.x + 0.05, 0.75, BASKET.z + 1.1], look: [BASKET.x, 0.35, BASKET.z], fov: 40 }) }, // the full basket (matched to the sign)
    { f: 4, dur: 34, s: (l) => ({ pos: orbit([MX + 0.6, 1.6, MZ + 4.4], [MX - 0.4, 1.1, MZ - 0.2], (l - 4) * 0.25), look: [MX - 0.4, 1.1, MZ - 0.2], fov: 46 }) },
    { f: 64, dur: 17, s: () => ({ pos: [MX + 0.6, 1.8, MZ + 4.4], look: [F.x, 1.5, F.z], fov: 46 }) }, // look across to the farm (dissolves there)
  ],
  dof: (l) => (l < 4 ? { cInf: 12, focus: [BASKET.x, 0.35, BASKET.z] } : { cInf: 8, focus: [MX - 0.4, 1.3, MZ - 0.2] }),
  pose: (c) => {
    const { l, w } = c;
    w.ref.basket.visible = true; w.ref.basket.position.copy(BASKET); w.ref.basket.children.forEach((ch) => (ch.visible = true));
    w.coops.forEach((co) => { co.visible = true; co.scale.setScalar(1); });
    person(c, "m0", state(G2[0], 0.1), MX - 0.9, MZ - 0.2, { seed: 2, beats: [[0, "smile_closed"]] }, { hold: [null, "egg"], hands: [null, [0.35, -0.3 + 0.05 * Math.sin(l * 0.4)]] });
    person(c, "m1", state(G2[1], 0.1), MX - 2.4, MZ - 1.4, { seed: 4, beats: [[0, "whistle"], [t11(59.36), "relief"]] }, { mode: "sit", look: 0.4, hands: [[-0.5, -0.35], [0.5, -0.35]] }, { y: 0.32 });
    person(c, "m2", state(G2[2], 0.1), MX + 0.1, MZ - 1.0, { seed: 6, beats: [[0, "smile"]] }, { look: -0.5 });
    hens(c, [{ kind: "hen", x: MX - 0.5, z: MZ + 1.0, peck: Math.sin(l * 0.25) > 0.6 ? 1 : 0, mirror: true }, { kind: "rooster", x: MX - 1.6, z: MZ + 0.4, peck: 0, scale: 1.1 },
      ...[0, 1, 2, 3].map((i) => ({ kind: "chick" as const, x: MX - 0.9 + i * 0.25 + 0.1 * Math.sin(l * 0.1 + i), z: MZ + 1.35 + 0.1 * i, peck: Math.sin(l * 0.4 + i * 2) > 0.3 ? 1 : 0, mirror: i === 1 }))]);
  },
};

// ======================= 12-13 · too many chickens -> they hire group 1, paid in eggs (60.2-70.5 s, ends craning up) =======================
const t12 = at(60.2), S12_SENDIRI = t12(62.29), S13_JADI = t12(63.33), S13_KERJA = t12(65.58), S13_UPAH = t12(66.62), S13_TELUR = t12(67.13), S14_UP = t12(68.0);
const P1: [number, number] = [F.x - 3.9, F.z + 8.6];
const s12: Scene = {
  len: 309, mood: () => "day",
  keys: [
    { f: 0, s: (l) => ({ pos: orbit([F.x - 0.9, 1.75, F.z + 12.8], [F.x - 0.9, 1.2, F.z + 4.5], -6 + l * 0.15), look: [F.x - 0.9, 1.2, F.z + 4.5], fov: 52 }) },
    { f: S12_SENDIRI - 10, dur: 18, s: (l) => ({ ...push([F.x - 1.5, 1.55, F.z + 8.6], [F.x - 2.0, 1.65, F.z + 6.0], l, S12_SENDIRI, 0.002, 0.007, 20), fov: 40, roll: -0.04 }) }, // on his overwhelmed face
    { f: S13_JADI - 4, dur: 26, s: (l) => { const u = sm((l - S13_JADI) / 40); return { pos: [lerp(F.x - 0.6, F.x - 3.0, u), 1.6, F.z + 13.0], look: [lerp(F.x - 1.6, F.x - 3.4, u), 1.35, F.z + 7.5], fov: 48 }; } }, // track his walk over
    { f: S13_UPAH - 6, dur: 16, s: (l) => ({ ...push([P1[0] - 0.5, 1.35, P1[1] + 2.0], [P1[0] + 0.6, 1.15, P1[1] - 0.15], l, S13_UPAH, 0.003), fov: 40 }) }, // the eggs into his hands
    { f: S13_TELUR + 10, dur: 22, s: (l) => ({ pos: orbit([P1[0] + 0.4, 1.7, P1[1] + 3.2], [P1[0] + 0.3, 1.6, P1[1]], (l - S13_TELUR) * 0.2), look: [P1[0] + 0.3, 1.6, P1[1]], fov: 44 }) },
    { f: S14_UP - 2, dur: 70, s: (l) => { const u = sm((l - S14_UP) / 70); return { pos: [F.x - 2, lerp(3.2, 120, u * u), F.z + 16 - u * 14], look: [F.x - 1, 0, F.z + 2 - u * 2], fov: 50, roll: u * 0.3 }; } }, // crane up through the sky (the map comes in)
  ],
  dof: (l) => (l < S12_SENDIRI - 10 ? { cInf: 4 } : l < S13_JADI ? { cInf: 12, focus: [F.x - 2.0, 1.65, F.z + 6.0] } : l < S14_UP ? { cInf: 10, focus: [P1[0] + 0.4, 1.4, P1[1]] } : { cInf: 0 }),
  pose: (c) => {
    const { l, w } = c;
    w.coops.forEach((co) => { co.visible = true; co.scale.setScalar(1); });
    // the owner: chickens all round his feet, then he walks to group 1 and offers work; his wife hands over the eggs
    const walk = sm((l - S13_JADI) / 40), ox = lerp(F.x - 2.0, P1[0] + 1.25, walk), oz = lerp(F.z + 6.0, P1[1] - 0.1, walk), walking = walk > 0 && walk < 1;
    const ownerHands: Hands = l < S13_JADI ? [[-0.85, -0.25 + 0.2 * Math.sin(l * 0.6)], [0.85, -0.3 + 0.2 * Math.cos(l * 0.6)]] : l >= S13_KERJA && l < S13_UPAH ? [null, [-0.8 + 0.1 * Math.sin(l * 0.4), 0.35]] : [null, null];
    person(c, "o", { ...state(G3[0], 0, 1), extras: l < S13_JADI ? [...RICH.extras, "sweat"] : RICH.extras }, ox, oz,
      { seed: 4, beats: [[0, "nervous"], [S12_SENDIRI, "shock"], [S13_JADI, "neutral"], [S13_KERJA - 6, "grin"]], talk: [[S13_KERJA - 4, S13_UPAH - 2]] },
      { mode: walking ? "stroll" : "stand", phase: (walk * Math.hypot(P1[0] + 1.25 - F.x + 2.0, P1[1] - 0.1 - F.z - 6.0)) / 0.9, bobK: 2.4, facing: l >= S13_JADI ? -1 : 0, look: l >= S13_JADI ? -1 : 0.3, hands: ownerHands, headK: l >= S12_SENDIRI && l < S12_SENDIRI + 12 ? 1.18 : undefined, tilt: walking ? -5 : 0 });
    const give = clamp01((l - S13_UPAH) / 10), wx = lerp(F.x + 0.4, P1[0] + 1.0, sm((l - S13_JADI - 10) / 40));
    person(c, "o2", state(G3[1], 0, 1), wx, P1[1] - 0.45, { seed: 6, beats: [[0, "nervous"], [S13_JADI, "smile"]] }, { mode: sm((l - S13_JADI - 10) / 40) > 0 && sm((l - S13_JADI - 10) / 40) < 1 ? "stroll" : "stand", phase: (sm((l - S13_JADI - 10) / 40) * Math.abs(P1[0] + 1.0 - F.x - 0.4)) / 0.9 + 0.3, bobK: 2.2, look: -1, facing: -1, hands: [give > 0 ? [lerp(-0.4, -0.85, give), 0.35] : [-0.3, 0.45], null], hold: [give < 1 ? "basket" : null, null] });
    // group 1 waiting at the edge of the farm; the man takes the eggs and looks at them
    const takes = l >= S13_UPAH + 8;
    person(c, "p1", state(G1[0], 1), P1[0], P1[1], { seed: 3, beats: [[0, "dazed"], [S13_KERJA, "relief_open"], [S13_TELUR, "dazed"], [S13_TELUR + 20, "smile_closed"]] }, { look: 0.8, hands: takes ? [[-0.2, 0.4], [0.25, 0.4]] : [null, null], hold: [null, takes ? "egg" : null], headTilt: takes ? -6 : 0 });
    person(c, "p2", state(G1[1], 1), P1[0] - 0.75, P1[1] - 0.7, { seed: 5, beats: [[0, "nervous"], [S13_TELUR, "pained"]] }, { look: 0.7 });
    person(c, "p3", state(G1[2], 1), P1[0] - 1.4, P1[1] + 0.3, { seed: 7, beats: [[0, "pained"]] }, { look: 0.6 });
    // chickens everywhere (they mob the owner's feet at the start)
    hens(c, [...flock(110, l, F.x - 1.2, F.z + 4.4, 12, 6.5, 7), ...flock(14, l, F.x - 2.0, F.z + 6.4, 1.6, 1.4, 11)]);
  },
};

// ======================= 15 · the joke: 500 juta ... investasi ... atau Fortuner bekas? (74.1-80 s) =======================
const t15 = at(74.1), S15_INV = t15(77.18), S15_CUT = t15(78.26) + 2;
const s15: Scene = {
  set: "intact", len: 177, mood: () => "day",
  keys: [
    { f: 0, s: () => ({ pos: [6.0, 9, 58], look: [6.0, 1.4, 68], fov: 50 }) },
    { f: 4, dur: 34, s: (l) => ({ ...push([6.0, 1.55, 60.6], [6.0, 1.5, 68.0], l, 40, 0.0025), fov: 52 }) }, // crane down to him with his cheque
    { f: S15_INV - 8, dur: 16, s: () => ({ pos: [5.2, 1.6, 64.4], look: [4.3, 1.5, 68.2], fov: 40, roll: 0.03 }) }, // the boring investment board
    { f: S15_INV + 18, dur: 10, s: () => ({ pos: [6.2, 1.55, 63.6], look: [6.15, 1.7, 67.6], fov: 38, roll: -0.03 }) }, // whip back to his grin
    { f: S15_CUT, cut: true, s: (l) => ({ pos: orbit([4.2, 0.9, 56.4], [5.6, 1.35, 63.0], (l - S15_CUT) * 0.5), look: [5.6, 1.35, 63.0], fov: 50, roll: -0.05 }) }, // smash cut: the used SUV
  ],
  dof: (l) => (l < S15_CUT ? { cInf: 8, focus: [6.15, 1.6, 67.6] } : { cInf: 6, focus: [5.0, 1.5, 61.0] }),
  pose: (c) => {
    const { l, w } = c;
    if (l < S15_CUT) {
      w.ref.dijual.visible = true; w.ref.dijual.position.set(7.0, 0, 68.6); w.ref.dijual.rotation.y = Math.PI;
      w.ref.board.visible = true; w.ref.board.position.set(4.3, 0, 68.2); w.setBoard("investasi"); w.ref.board.rotation.y = Math.PI - 0.4;
      person(c, "j", { ...JOKER, sign: "Rp 500.000.000", cheque: true }, 6.15, 67.6, { seed: 2, beats: [[0, "grin"], [S15_INV - 4, "neutral"], [S15_INV + 18, "grin"]] }, { look: l >= S15_INV - 4 && l < S15_INV + 18 ? -1 : 0.2 });
    } else {
      w.ref.suv.visible = true; w.ref.suv.position.set(6.9, 0, 64.4); w.ref.suv.rotation.y = Math.PI + 0.6;
      person(c, "j", JOKER, 5.0, 61.0, { seed: 2, beats: [[0, "laugh"]] }, { look: -0.3, hands: [null, [0.75, -0.75 + 0.15 * Math.sin(l * 0.6)]] });
      [[2.9, 62.6, 7], [3.9, 63.6, 10], [8.6, 62.0, 13]].forEach(([x, z, v], i) => person(c, "n" + i, state(villager(v), 0), x, z, { seed: 6 + i, beats: [[0, "laugh"]] }, { hands: [[-0.7, -0.8 + 0.2 * Math.sin(l * 0.7 + i)], [0.7, -0.8 + 0.2 * Math.cos(l * 0.7 + i)]] }));
    }
  },
};

// ======================= timeline =======================
type Slot = { S: Scene; at: number };
const OLD: Slot[] = [
  { S: s1, at: 0 }, { S: sceneC, at: 147 }, { S: s3, at: 327 }, { S: s4, at: 453 }, { S: sceneA, at: 540 }, { S: s6, at: 738 }, { S: s7, at: 984 },
  { S: s8, at: 1221 }, { S: s9, at: 1326 }, { S: s10, at: 1575 }, { S: s11, at: 1725 }, { S: s12, at: 1806 }, { S: s15, at: 2223 },
];
/** pacing (user, 2026-11-12: some scenes changed too fast): each slot plays at this speed (< 1 = slower, longer).
 *  The hatching (timeline overlay), the farm/map crane and the joke keep 1 so their 2D overlays stay in sync.
 *  audio/ayam_short_sfx.py holds the same table (PACE) to move every effect cue with the picture. */
export const PACE = [0.8, 0.9, 0.85, 0.75, 0.9, 0.92, 0.92, 0.8, 1, 0.85, 0.75, 1, 1];
const NEW_AT = OLD.reduce<number[]>((a, o, k) => { if (k) a.push(a[k - 1] + Math.round((o.at - OLD[k - 1].at) / PACE[k - 1])); return a; }, [0]);
/** old 80 s timeline frame -> new frame */
export const warp = (f: number) => { let k = 0; while (k + 1 < OLD.length && f >= OLD[k + 1].at) k++; return NEW_AT[k] + (f - OLD[k].at) / PACE[k]; };
export const AYAM_FULL_FRAMES = Math.round(warp(OLD_FRAMES));
const SLOTS: (Slot & { rate: number })[] = OLD.map((o, k) => ({ S: o.S, at: NEW_AT[k], rate: PACE[k] }));
/** scene changes of place dip through black (reference: fade out, fade in, the new shot already moving); matched
 *  compositions where only time passes keep the 8-frame dissolve. DIPS = slot indexes whose start dips. */
const DIPS = new Set([1, 2, 5, 7, 12]);
/** extra dips inside a scene (absolute frames): the hook's three places */
const INNER_DIPS = [41, 89].map((f) => Math.round(warp(f)));
const FadeIn: React.FC<{ on: boolean; children: React.ReactNode }> = ({ on, children }) => { const l = useCurrentFrame(); return <AbsoluteFill style={{ opacity: on ? clamp01((l + 1) / (XF + 1)) : 1 }}>{children}</AbsoluteFill>; };
/** black dip centred on the cut: 7 frames down, 3 held, 7 up (the cut happens under full black) */
const Dip: React.FC = () => { const l = useCurrentFrame(), k = l < 7 ? sm((l + 1) / 7) : l < 10 ? 1 : 1 - sm((l - 9) / 7); return <AbsoluteFill style={{ background: "#05060a", opacity: k }} />; };
const slot = (k: number) => {
  const { S, at: a, rate } = SLOTS[k], next = SLOTS[k + 1], dur = next ? Math.max(S.len, next.at - a) + XF : AYAM_FULL_FRAMES - a;
  return (
    <Sequence key={k} from={a} durationInFrames={dur}>
      <FadeIn on={k > 0 && !DIPS.has(k)}>
        <ThreeCanvas width={W} height={H} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 40, near: 0.3, far: 1500 }}>
          <SceneInner S={S} rate={rate} />
        </ThreeCanvas>
      </FadeIn>
    </Sequence>
  );
};
export const AyamFull: React.FC = () => (
  <AbsoluteFill style={{ background: "#0c1020" }}>
    {SLOTS.slice(0, -1).map((_, k) => slot(k))}
    <Sequence from={Math.round(warp(1405))} durationInFrames={170}><Timeline /></Sequence>
    <Sequence from={Math.round(warp(2100))} durationInFrames={SLOTS[12].at - Math.round(warp(2100)) + 2}><MapPart /></Sequence>
    {slot(SLOTS.length - 1)}
    {[...[...DIPS].map((k) => SLOTS[k].at + 1), ...INNER_DIPS].map((c) => <Sequence key={"dip" + c} from={c - 8} durationInFrames={17}><Dip /></Sequence>)}
    <Sequence from={SLOTS[12].at + S15_CUT} durationInFrames={AYAM_FULL_FRAMES - SLOTS[12].at - S15_CUT}><TinTin /></Sequence>
  </AbsoluteFill>
);
