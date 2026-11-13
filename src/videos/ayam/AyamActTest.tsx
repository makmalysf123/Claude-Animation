// Acting test for "Satu Ayam yang Sama" v2: three scenes rebuilt after the frame-by-frame study
// (docs/style-references/frame-by-frame-2026-11-11.md), timed to the scratch narration (voice/ayam/words.json):
//   A  bonfire roast   voice 18.0-24.6 s  (beat 5)   198 f
//   B  group 3 comes   voice 32.8-40.7 s  (beat 7)   237 f
//   C  whirlwind       voice  4.9-10.9 s  (beat 2)   180 f
// Every scene: 4-5 framings cut on words (wide, close-up, insert, over-the-shoulder, low angle), glides + push-ins,
// impact kicks; faces live (talk / chew / blink-covered swaps / head morph); props move through actions; smoke, dust, debris.
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
import { Pen } from "../bridge/toon";
import type { P2 } from "../bridge/toon";
import { AyamWorld, Cast, COIN_PILE, LAPANGAN, V, Who, Bird, Mood, BONFIRE_AT, Glow, windX, PUDDLE } from "./world";
import { RICH, RICH2, MID, MID2, POOR, POOR2, state, villager, Person } from "./people";
import type { ActOpts, Held } from "./people";
import { live, Live, fxSmoke, fxDust, fxDebris, fxCoin, fxEmber, fxCrumb } from "./acting";
import { bonfireDress, yardDress, ruinsDress } from "./dress";

const W = 1080, H = 1920;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const sm = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
/** local frame of a narration time inside a scene that starts at voice time t0 (reactions land 2 f early) */
export const at = (t0: number) => (sec: number) => Math.round((sec - t0) * 30) - 2;

// ---------------- camera: keys with cuts and glides, push-ins, impact kicks ----------------
export type V3 = [number, number, number];
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
export type Key = { f: number; cut?: boolean; dur?: number; s: (l: number) => Partial<Cam> & { pos: V3; look: V3 } };
const full = (c: Partial<Cam> & { pos: V3; look: V3 }): Cam => ({ fov: 40, roll: 0, ...c });
const mixC = (a: Cam, b: Cam, k: number): Cam => ({ pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3, fov: lerp(a.fov, b.fov, k), roll: lerp(a.roll, b.roll, k) });
/** active, not aggressive (reference study 2026-11-12): every glide between framings takes >= 22 f and 35 % longer */
export const CALM = 1.35;
export const runKeys = (keys: Key[], l: number) => { let c = full(keys[0].s(l)); for (let i = 1; i < keys.length; i++) { const k = keys[i]; if (l < k.f) break; c = k.cut ? full(k.s(l)) : mixC(c, full(k.s(l)), glide((l - k.f) / Math.max(22, (k.dur ?? 24) * CALM))); } return c; };
/** dolly toward the look point: rate per frame since f0 (0.0015-0.0035 holds, ~0.006 punch) */
export const push = (pos: V3, look: V3, l: number, f0: number, rate = 0.0025, punch = 0, n = 30) => {
  const x = Math.max(0, l - f0); let s = rate * x; if (punch) for (let i = 0; i < Math.min(x, n); i++) s += 0.5 * (punch - rate) * Math.min(1, (i + 0.5) / 10, (n - i - 0.5) / 10);
  const k = Math.exp(-s); return { pos: look.map((v, i) => v + (pos[i] - v) * k) as V3, look };
};
/** orbit the camera about the look point by `deg` (yaw) */
export const orbit = (pos: V3, look: V3, deg: number): V3 => { const a = (deg * Math.PI) / 180, dx = pos[0] - look[0], dz = pos[2] - look[2]; return [look[0] + dx * Math.cos(a) - dz * Math.sin(a), pos[1], look[2] + dx * Math.sin(a) + dz * Math.cos(a)]; };
export const kickAt = (kicks: [number, number][], l: number) => { let a = 0; for (const [f0, g] of kicks) { const n = l - f0; if (n >= 0 && n < 7) a += 0.5 * g * (Math.floor(n) % 2 ? -1 : 1) * (1 - n / 7) ** 1.5; } return a; };

// ---------------- scene description ----------------
export type Ctx = { l: number; w: AyamWorld; cast: Cast; cam: THREE.PerspectiveCamera };
export type Scene = { len: number; mood: (l: number) => Mood; keys: Key[]; kicks?: [number, number][]; dof: (l: number) => { cInf: number; focus?: V3 }; pose: (c: Ctx) => void; wind?: (l: number) => number | null;
  /** intact kampung (before the whirlwind) or ruins (after); set dressing; ink lines swallowed by fog (storm) */
  set?: "intact" | "ruins"; night?: boolean; yard?: boolean; fogInk?: boolean;
  /** mirror puddles after the rain: [x, z, radius, turn] */ wet?: [number, number, number, number?][] };

/** hand target (HH units from the neck, x = screen right) that reaches a world point, for a standing adult at (x, z) */
export const reach = (cam: THREE.PerspectiveCamera, x: number, z: number, p: THREE.Vector3, squat = 0): P2 => {
  const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0); right.y = 0; right.normalize();
  const dx = (p.x - x) * right.x + (p.z - z) * right.z, chinY = 1.2 - squat * 0.34 * 1.4 * 0.5;
  return [dx / 0.5, (chinY - p.y) / 0.5];
};
export type Hands = [P2 | null, P2 | null];
/** fading ghosts of the hands 1-3 frames back when they moved faster than ~0.12 HH per frame */
export const trailOf = (handsAt: (l: number) => Hands, l: number) => {
  const now = handsAt(l), out: { hands: Hands; a: number }[] = [];
  for (const [k, a] of [[1, 0.34], [2, 0.2], [3, 0.1]] as const) {
    const prev = handsAt(l - k), g: Hands = [null, null]; let any = false;
    for (const i of [0, 1]) { const p = prev[i], q = now[i]; if (p && q && Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.12 * k) { g[i] = [Math.round(p[0] * 50) / 50, Math.round(p[1] * 50) / 50]; any = true; } }
    if (any) out.push({ hands: g, a });
  }
  return out.length ? out : undefined;
};
export const person = (c: Ctx, id: string, P: Person, x: number, z: number, L: Live, o: Partial<ActOpts> & { handsAt?: (l: number) => Hands } = {}, extra: Partial<Who> = {}) => {
  if (o.handsAt) { const { handsAt, ...rest } = o; o = { ...rest, hands: handsAt(c.l), trail: trailOf(handsAt, c.l) }; }
  const s = live(L, c.l);
  const opts: ActOpts = { mode: "stand", armsFront: true, expr: s.expr, blink: s.blink, headK: s.headK, face: s.face, headTilt: (o.headTilt ?? 0) + s.headTilt, seed: L.seed, ...o, ...(o.face ? {} : { face: s.face }) };
  if (o.expr) opts.expr = o.expr;
  c.cast.person({ id, P, x, z, opts, ...extra }, c.cam);
};
export const fx = (c: Ctx, key: string, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h = w, cw = 300, ch = 300) => c.cast.fx(key, cw, ch, draw, x, y, z, w, h, c.cam);
/** a puff that rose from (x, y, z): age u 0..1, drifting up and sideways */
export const smoke = (c: Ctx, tag: string, x: number, y: number, z: number, l: number, n: number, period: number, dark = 0, size = 0.9, rise = 2.2) => {
  for (let k = 0; k < n; k++) {
    const u = (((l + k * (period / n)) % period) + period) % period / period, q = Math.round(u * 20) / 20;
    fx(c, `smoke${dark}|${q}`, (p) => fxSmoke(p, q, dark), x + 0.35 * Math.sin(k * 2.3 + u * 2) + u * 0.6, y + u * rise, z + 0.2 * Math.cos(k * 1.7), size * (0.7 + u * 1.3));
  }
};

// ---------------- the cast ----------------
export const L = LAPANGAN, BF = BONFIRE_AT();
export const FIRE = (l: number, k = 1): Glow => ({ at: V(BF.x, 0.75, BF.z + 0.2), col: [255, 150, 60], k: k * (0.86 + 0.08 * Math.sin(l * 1.7) + 0.06 * Math.sin(l * 3.1 + 1)), radius: 5 });
export const G1 = [POOR, POOR2, villager(2)], G2 = [MID, MID2, villager(7)], G3 = [RICH, RICH2, villager(6)]; // two men + one woman per group

// ======================= A: bonfire roast (beat 5, voice 18.0-24.6 s) =======================
const tA = at(18.0);
const A_MALAM = tA(20.3), A_PANGGANG = tA(21.55), A_MAKAN = tA(22.68), A_AKHIR = tA(23.88);
const A_TEAR1 = A_MAKAN - 14, A_TEAR2 = A_MAKAN - 6; // legs torn off just before "Makan"
/** crumbs knocked off at every bite: they spray from the mouth (mouth = hand target in HH from the neck), fall with
 *  gravity, bounce once on the ground and stay a moment before fading */
export const crumbs = (c: Ctx, tag: string, x: number, z: number, mouth: P2, t0: number, period: number, until: number, n = 5) => {
  const { l, cam } = c, right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0); right.y = 0; right.normalize();
  const toCam = new THREE.Vector3(cam.position.x - x, 0, cam.position.z - z).normalize();
  for (let b = 0; t0 + b * period < Math.min(l + 1, until); b++) {
    const tb = t0 + b * period + Math.round(0.4 * period), age = l - tb; if (age < 0 || age > 26) continue;
    for (let k = 0; k < n; k++) {
      const h = hash(b * 13 + k * 7 + tag.length), vs = (hash(k + b * 3) - 0.5) * 0.05, vu = 0.02 + 0.03 * hash(k * 5 + b), vt = 0.015 * hash(k + 11);
      const y0 = 1.2 - mouth[1] * 0.5 - 0.06, s0 = mouth[0] * 0.5;
      let y = y0 + vu * age - 0.0032 * age * age, a = age; if (y < 0.02) { // landed: one small bounce, then rest
        const tl = (vu + Math.sqrt(vu * vu + 4 * 0.0032 * (y0 - 0.02))) / (2 * 0.0032); a = tl; const ab = age - tl; y = 0.02 + Math.max(0, 0.012 * ab - 0.0032 * ab * ab); }
      const off = s0 + vs * a, fwd = vt * a, wx = x + right.x * off + toCam.x * fwd, wz = z + right.z * off + toCam.z * fwd;
      const kk = Math.floor(h * 6); fx(c, `crumb${kk}`, (p) => fxCrumb(p, kk), wx, y, wz, 0.055 * (age > 20 ? (26 - age) / 6 : 1), undefined, 64, 64);
    }
  }
};
export const bite = (l: number, t0: number, period = 16) => { if (l < t0) return 0; const u = ((l - t0) % period) / period; return u < 0.35 ? sm(u / 0.35) : u < 0.6 ? 1 : 1 - sm((u - 0.6) / 0.4); };
export const sceneA: Scene = {
  night: true, len: 198, mood: () => "night", kicks: [],
  keys: [ // one continuous move: crane down round the fire -> the hungry woman -> the roast -> behind her to the eater -> rise
    { f: 0, s: (l) => ({ pos: orbit([BF.x + 0.4, lerp(3.4, 1.3, sm(l / 40)), BF.z + lerp(7.4, 6.2, sm(l / 40))], [BF.x, 1.2, BF.z - 0.5], -14 + l * 0.3), look: [BF.x, 1.2, BF.z - 0.5], fov: 50, roll: 0.03 }) },
    { f: 30, dur: 34, s: (l) => ({ pos: orbit([BF.x + 2.4, 1.5, BF.z + 1.9], [BF.x + 1.3, 1.62, BF.z - 0.3], 6 - (l - 30) * 0.18), look: [BF.x + 1.3, 1.62, BF.z - 0.3], fov: 38, roll: -0.03 }) },
    { f: A_MALAM - 10, dur: 30, s: (l) => ({ ...push(orbit([BF.x + 0.4, 1.2, BF.z + 2.1], [BF.x, 1.05, BF.z], (l - A_MALAM) * 0.3), [BF.x, 1.05, BF.z], l, A_PANGGANG, 0.002, 0.006, 26), fov: 36 }) },
    { f: A_MAKAN - 22, dur: 30, s: (l) => ({ pos: orbit([BF.x + 2.3, 1.5, BF.z + 2.5], [BF.x - 1.1, 1.45, BF.z - 0.3], (l - A_MAKAN) * 0.12), look: [BF.x - 1.1, 1.45, BF.z - 0.3], fov: 40, roll: 0.02 }) },
    { f: A_AKHIR - 8, dur: 34, s: (l) => { const u = sm((l - A_AKHIR) / 26); return { pos: orbit([BF.x + 0.2, lerp(4.2, 5.0, u), BF.z + lerp(5.4, 6.4, u)], [BF.x, 0.7, BF.z - 0.4], 12 - (l - A_AKHIR) * 0.2), look: [BF.x, 0.7, BF.z - 0.4], fov: 48, roll: -0.04 }; } },
  ],
  dof: (l) => (l < 36 ? { cInf: 10, focus: [BF.x, 1.4, BF.z - 0.4] } : l < A_MALAM ? { cInf: 14, focus: [BF.x + 1.3, 1.62, BF.z - 0.3] } : l < A_MAKAN - 4 ? { cInf: 14, focus: [BF.x, 1.05, BF.z] } : l < A_AKHIR ? { cInf: 12, focus: [BF.x - 1.3, 1.6, BF.z - 0.35] } : { cInf: 6 }),
  pose: (c) => {
    const { l, w } = c;
    // roast: turns on the spit; legs torn off, then bitten down; bones after the last line
    const r = w.ref.roast, spin = r.getObjectByName("spin")!, body = spin.getObjectByName("body")!;
    r.visible = l < A_AKHIR; r.position.copy(BF); r.scale.setScalar(0.62);
    spin.rotation.x = l < A_MAKAN - 14 ? l * 0.09 : (A_MAKAN - 14) * 0.09;
    spin.getObjectByName("legR")!.visible = l < A_TEAR1; spin.getObjectByName("legL")!.visible = l < A_TEAR2;
    const eaten = clamp01((l - A_MAKAN) / (A_AKHIR - A_MAKAN)); body.scale.set(1.35 * (1 - 0.55 * eaten), 0.9 * (1 - 0.45 * eaten), 0.95 * (1 - 0.5 * eaten));
    w.ref.bones.visible = l >= A_AKHIR; w.ref.bones.position.set(BF.x + 0.05, 0, BF.z + 0.85);
    // the three poor: the man turns the crank, all stare at the roast; then they tear it, eat, and it is gone
    const e1x = BF.x - 1.4, e1z = BF.z - 0.15, e2x = BF.x + 1.3, e2z = BF.z - 0.3, e3x = BF.x + 0.05, e3z = BF.z - 1.6;
    const crankA = spin.rotation.x, crankP = V(BF.x - 0.9 * 0.62, 1.05 * 0.62 - 0.11 * 0.62 * Math.cos(crankA), BF.z - 0.11 * 0.62 * Math.sin(crankA));
    const eat1 = (t: number) => bite(t, A_TEAR1 + 6, 17), eat2 = (t: number) => bite(t, A_TEAR2 + 6, 15), eat3 = (t: number) => bite(t, A_MAKAN + 3, 19);
    const mouth1: P2 = [0.2, -0.22], hold1: P2 = [0.55, 0.55], mouth2: P2 = [-0.2, -0.22], hold2: P2 = [-0.55, 0.55];
    /** the mouth opens wide (teeth + tongue) as the food comes up, bites shut on contact, then chews */
    const biteFace = (f: (t: number) => number) => { const v = f(l), dv = v - f(l - 1); return dv > 0.02 && v > 0.45 ? { mouth: "laugh" as const } : v >= 0.99 && f(l - 2) < 0.99 ? { mouth: "teeth" as const } : undefined; };
    // e1 (poor man with caping, left): cranks, tears the right leg, eats
    const r1 = (t: number): Hands => [null, t < A_TEAR1 - 6 ? reach(c.cam, e1x, e1z, crankP) : t < A_TEAR1 ? reach(c.cam, e1x, e1z, V(BF.x - 0.2, 0.68, BF.z + 0.1)) : [lerp(hold1[0], mouth1[0], eat1(t)), lerp(hold1[1], mouth1[1], eat1(t))]];
    person(c, "e1", state(G1[0], 1), e1x, e1z,
      { seed: 3, beats: [[0, "nervous"], [A_MALAM, "pained"], [A_TEAR1, "grin"], [A_MAKAN, "laugh"], [A_AKHIR, "dazed"]], chew: [[A_TEAR1 + 10, A_AKHIR - 2]] },
      { handsAt: r1, face: biteFace(eat1), hold: [null, l >= A_AKHIR ? "bone" : l >= A_TEAR1 ? "drumstick" : "crank"], tilt: l < A_TEAR1 ? 4 : 2 * eat1(l), look: l < A_MAKAN ? 0.8 : 0, squat: l < A_TEAR1 ? 0.12 : 0 }, { glow: FIRE(l) });
    // e2 (woman, right): stares and swallows, tears the left leg, eats
    const l2 = (t: number): Hands => [t < A_TEAR2 - 6 ? [-0.55, 0.85] : t < A_TEAR2 ? reach(c.cam, e2x, e2z, V(BF.x + 0.2, 0.68, BF.z + 0.1)) : [lerp(hold2[0], mouth2[0], eat2(t)), lerp(hold2[1], mouth2[1], eat2(t))], null];
    person(c, "e2", state(G1[1], 1), e2x, e2z,
      { seed: 5, beats: [[0, "dazed"], [40, "nervous"], [56, "lick"], [A_MALAM, "nervous"], [A_TEAR2, "grin"], [A_MAKAN, "relief_open"], [A_AKHIR, "pained"]], chew: [[A_TEAR2 + 10, A_AKHIR - 2]] },
      { handsAt: l2, face: biteFace(eat2), hold: [l >= A_AKHIR ? "bone" : l >= A_TEAR2 ? "drumstick" : null, null], tilt: l < A_TEAR2 ? -5 : -2 * eat2(l), look: l < A_MAKAN ? -0.8 : 0 }, { glow: FIRE(l) });
    // e3 (behind the fire): pulls meat off the body with both hands after "Makan"
    const r3 = (t: number): Hands => [null, t < A_MAKAN ? [0.5, 0.85] : [lerp(0.5, 0.2, eat3(t)), lerp(0.55, -0.22, eat3(t))]];
    person(c, "bg1", state(villager(11), 1), BF.x - 6.5, BF.z - 6.5, { seed: 8, beats: [[0, "dazed"]] }, { mode: "sit", look: 0.6 });
    person(c, "bg2", state(villager(17), 1), BF.x + 6.8, BF.z - 7.5, { seed: 10, beats: [[0, "pained"]] }, { mode: "sit", look: -0.6, headTilt: 6 });
    person(c, "e3", state(G1[2], 1), e3x, e3z,
      { seed: 7, beats: [[0, "pained"], [A_PANGGANG, "nervous"], [A_MAKAN, "grin"], [A_AKHIR, "dazed"]], chew: [[A_MAKAN + 8, A_AKHIR - 2]] },
      { handsAt: r3, face: biteFace(eat3), hold: [null, l >= A_MAKAN ? (l >= A_AKHIR ? "bone" : "drumstick") : null], look: 0 }, { glow: FIRE(l) });
    // crumbs fly at each bite (from the mouth, falling round their feet)
    if (l >= A_TEAR1 + 6) crumbs(c, "c1", e1x, e1z, [0.12, -0.22], A_TEAR1 + 6, 17, A_AKHIR);
    if (l >= A_TEAR2 + 6) crumbs(c, "c2", e2x, e2z, [-0.12, -0.22], A_TEAR2 + 6, 15, A_AKHIR);
    if (l >= A_MAKAN + 3) crumbs(c, "c3", e3x, e3z, [0.1, -0.22], A_MAKAN + 3, 19, A_AKHIR, 4);
    // smoke and embers above the fire, a fat-smoke plume from the roast while it cooks
    smoke(c, "fire", BF.x, 1.7, BF.z - 0.5, l, 5, 60, 0, 1.0, 3.0);
    if (l < A_AKHIR && (l < A_MALAM || l >= A_MAKAN - 4)) smoke(c, "roast", BF.x + 0.1, 1.0, BF.z - 0.35, l + 17, 3, 40, 0, 0.45, 1.2);
    for (let k = 0; k < 8; k++) { const u = ((l * 0.03 + hash(k)) % 1); fx(c, "ember", (p) => fxEmber(p), BF.x + (hash(k + 3) - 0.5) * 0.6 + 0.2 * Math.sin(u * 9 + k), 0.9 + u * 2.6, BF.z + (hash(k + 5) - 0.5) * 0.4, 0.035 * (1 - u), 0.035 * (1 - u), 100, 100); }
  },
};

// ======================= B: group 3 comes for the eggs (beat 7, voice 32.8-40.7 s) =======================
const tB = at(32.8);
const B_MEREKA = tB(34.95), B_PINJAMI = tB(36.46), B_NANTI = tB(37.9), B_BAGI = tB(39.78);
export const MX = L.x - 7.8, MZ = L.z - 2.4; // middle group's spot (basket at MX + 0.6)
export const BASKET = V(MX + 1.05, 0, MZ + 0.6);
export const sceneB: Scene = {
  yard: true, len: 237, mood: () => "day", kicks: [],
  keys: [ // one continuous move: low CU of the plotters -> pull out and track their walk -> behind the middle man -> down to the basket -> up with the egg -> round to the far side for the handshake
    { f: 0, s: () => ({ pos: [L.x - 1.9, 1.3, L.z + 1.6], look: [L.x - 3.4, 14, L.z - 10], fov: 44, roll: -0.02 }) }, // starts in the day sky (dissolved from the night sky) and tilts down
    { f: 2, dur: 24, s: (l) => ({ ...push(orbit([L.x - 1.9, 1.15, L.z + 1.6], [L.x - 2.9, 1.6, L.z - 2.0], -10 + l * 0.2), [L.x - 2.9, 1.6, L.z - 2.0], l, 0, 0.002), fov: 36, roll: -0.03 }) },
    { f: B_MEREKA - 12, dur: 34, s: (l) => { const u = sm((l - B_MEREKA) / 44); const x = lerp(-3.0, -5.6, u); return { pos: [L.x + x + 0.8, lerp(2.4, 1.7, u), L.z + 5.6], look: [L.x + x - 0.6, 1.25, L.z - 2.2], fov: 48 }; } },
    { f: B_PINJAMI - 14, dur: 28, s: (l) => ({ pos: orbit([MX - 0.9, 1.75, MZ + 4.4], [MX + 1.2, 1.75, MZ - 0.1], (l - B_PINJAMI) * 0.15), look: [MX + 1.2, 1.75, MZ - 0.1], fov: 42, roll: 0.03 }) },
    { f: B_NANTI - 6, dur: 22, s: (l) => ({ ...push([BASKET.x + 0.45, 0.62, BASKET.z + 1.9], [BASKET.x, 0.55, BASKET.z], l, B_NANTI, 0.0025), fov: 40 }) },
    { f: B_NANTI + 28, dur: 22, s: () => ({ pos: [BASKET.x + 0.7, 1.1, BASKET.z + 2.5], look: [BASKET.x + 0.3, 1.25, BASKET.z - 0.2], fov: 42 }) },
    { f: B_BAGI - 16, dur: 30, s: (l) => ({ pos: orbit([MX + 0.9, 2.7, MZ + 3.6], [MX + 0.95, 1.2, MZ], -8 + (l - B_BAGI) * 0.4), look: [MX + 0.95, 1.2, MZ], fov: 42, roll: -0.03 }) },
    { f: 220, dur: 17, s: () => ({ pos: [MX + 0.9, 2.9, MZ + 3.8], look: [MX + 0.4, 15, MZ - 10], fov: 46, roll: 0.02 }) }, // tilt up to the clouds
  ],
  dof: (l) => (l < B_MEREKA ? { cInf: 13, focus: [L.x - 2.9, 1.6, L.z - 2.0] } : l < B_PINJAMI ? { cInf: 0 } : l < B_NANTI ? { cInf: 12, focus: [MX + 1.55, 1.6, MZ + 0.05] } : l < B_BAGI ? { cInf: 12, focus: [BASKET.x, 0.6, BASKET.z] } : { cInf: 10, focus: [MX + 1.2, 1.5, MZ] }),
  pose: (c) => {
    const { l, w } = c;
    w.ref.basket.visible = true; w.ref.basket.position.copy(BASKET);
    w.coops.forEach((co, i) => (co.visible = i < 1));
    // the middle group at home: hen pecking, basket of eggs
    const mBeats = (s: number): Live => ({ seed: s, beats: [[0, "smile"], [B_MEREKA + 30, "neutral"], [B_PINJAMI + 6, "nervous"], [B_NANTI + 34, "neutral"], [B_BAGI, "relief_open"]] });
    person(c, "m0", state(G2[0], 0.8), MX - 0.9, MZ - 0.2, mBeats(2), { look: l > B_MEREKA + 20 ? 1 : 0 });
    person(c, "m2", state(G2[2], 0.8), MX - 0.2, MZ - 1.1, mBeats(6), { look: l > B_MEREKA + 20 ? 1 : 0 });
    // the middle man (peci): shakes hands on "bagi"
    const shake = l >= B_BAGI ? 0.05 * Math.sin((l - B_BAGI) * 0.9) : 0;
    const meet = V((MX + 0.3 + MX + 1.55) / 2, 1.0 + shake * 0.5, MZ + 0.03);
    const pop = clamp01((l - B_PINJAMI) / 16), popping = pop > 0 && pop < 1; // the peci jumps off his head in surprise and lands back
    const m1P: Person = popping ? { ...state(G2[1], 0.8), extras: G2[1].extras.filter((e) => e !== "peci") } : state(G2[1], 0.8);
    if (popping) { const hy = 1.98 + 0.3 * Math.sin(Math.PI * pop), a = Math.round(Math.sin(pop * Math.PI * 2) * 6) / 10;
      fx(c, `peci${a}`, (p) => { p.g.translate(150, 150); p.g.rotate(a); p.g.translate(-150, -150); p.poly([[70, 190], [80, 110], [220, 110], [230, 190]], "#18171d", 8); }, MX + 0.3, hy, MZ + 0.05, 0.36); }
    person(c, "m1", m1P, MX + 0.3, MZ, { seed: 4, beats: [[0, "smile"], [B_MEREKA + 30, "neutral"], [B_PINJAMI, "shock"], [B_PINJAMI + 18, "nervous"], [B_NANTI + 34, "neutral"], [B_BAGI, "relief_open"]] }, { look: l > B_MEREKA + 20 ? 1 : 0, facing: l > B_MEREKA + 20 ? 1 : 0, hands: [null, l >= B_BAGI - 6 ? reach(c.cam, MX + 0.3, MZ, meet) : null], tilt: l >= B_BAGI - 6 ? 5 : 0 });
    // the rich group: plotting (CU), then they walk over; the boss talks, takes an egg, shakes on it
    const walk = sm((l - B_MEREKA) / 44), phase = (l - B_MEREKA) / 22;
    const walking = l >= B_MEREKA && l < B_MEREKA + 44;
    const bossX = lerp(L.x - 2.6, MX + 1.55, walk), bossZ = lerp(L.z - 2.0, MZ + 0.05, walk);
    const bossTalk: Live = { seed: 4, beats: [[0, "grin"], [18, "smile"], [44, "grin"], [B_MEREKA, "smile"], [B_PINJAMI, "grin"], [B_NANTI + 30, "laugh"], [B_BAGI, "grin"]], talk: [[B_PINJAMI, B_NANTI - 4], [B_NANTI + 34, B_BAGI - 2]] };
    const inBasket = l >= B_NANTI + 2 && l < B_NANTI + 34, squat = l < B_NANTI + 2 ? 0 : l < B_NANTI + 30 ? sm((l - B_NANTI - 2) / 8) * 0.55 : 0.55 * (1 - sm((l - B_NANTI - 30) / 8));
    const grab = clamp01((l - B_NANTI - 12) / 8), lift = sm((l - B_NANTI - 24) / 14);
    let bossHands: [P2 | null, P2 | null] = [null, null], hold: [Held | null, Held | null] = [null, null];
    if (l < B_MEREKA) bossHands = l < 40 ? [[-0.25, 0.6], [0.25, 0.6 + 0.04 * Math.sin(l * 1.2)]] : [[-0.25, 0.6], [-1.2, -0.25]]; // rubs his hands, then points at them
    else if (l >= B_PINJAMI && l < B_NANTI) bossHands = [null, [-0.75 + 0.1 * Math.sin(l * 0.4), 0.35 + 0.08 * Math.sin(l * 0.7)]]; // open palm toward them
    else if (inBasket || (l >= B_NANTI && l < B_BAGI - 6)) { const tgt = reach(c.cam, bossX, bossZ, V(BASKET.x, 0.4, BASKET.z), squat); bossHands = [null, lift > 0 ? [lerp(tgt[0], 0.35, lift), lerp(tgt[1], -0.25, lift)] : tgt]; hold = [null, grab >= 1 ? "egg" : null]; }
    else if (l >= B_BAGI - 6) bossHands = [null, reach(c.cam, bossX, bossZ, V((MX + 0.3 + MX + 1.55) / 2, 1.0 + shake * 0.5, MZ + 0.03))];
    person(c, "r0", state(G3[0], 0.8), bossX, bossZ, bossTalk, { mode: walking ? "stroll" : "stand", phase, bobK: 2.6, tilt: walking ? -5 : l >= B_PINJAMI && l < B_NANTI ? -4 : 0, facing: l >= B_MEREKA ? -1 : 0, look: l >= B_MEREKA && l < B_PINJAMI ? -1 : l < B_MEREKA && l >= 40 ? -1 : 0, hands: bossHands, hold, squat });
    const f2x = lerp(L.x - 3.4, MX + 2.35, walk), f3x = lerp(L.x - 2.0, MX + 2.9, walk);
    person(c, "r1", state(G3[1], 0.8), f2x, lerp(L.z - 2.6, MZ - 0.75, walk), { seed: 6, beats: [[0, "smile"], [26, "grin"], [B_PINJAMI, "smile"], [B_BAGI, "grin"]] }, { mode: walking ? "stroll" : "stand", phase: phase + 0.35, bobK: 2.4, tilt: walking ? -4 : 0, facing: l >= B_MEREKA ? -1 : 0, look: -1, headTilt: l >= B_PINJAMI && l < B_NANTI ? 4 * Math.sin(l * 0.25) : 0 });
    person(c, "r2", state(G3[2], 0.8), f3x, lerp(L.z - 1.3, MZ + 0.7, walk), { seed: 1, beats: [[0, "neutral"], [20, "grin"], [B_PINJAMI, "smile"], [B_BAGI, "grin"]] }, { mode: walking ? "stroll" : "stand", phase: phase + 0.6, bobK: 2.4, tilt: walking ? -4 : 0, facing: l >= B_MEREKA ? -1 : 0, look: -1 });
    if (walking) for (const [x, z, ph] of [[bossX, bossZ, phase], [f2x, lerp(L.z - 2.6, MZ - 0.75, walk), phase + 0.35]] as const) { const u = ((ph * 2) % 1); if (u < 0.5) fx(c, `dust${Math.round(u * 20)}`, (p) => fxDust(p, Math.round(u * 40) / 20), x + 0.25, 0.12, z + 0.1, 0.5 + u * 0.5); }
    const birds: Bird[] = [{ kind: "hen", x: MX - 0.5, z: MZ + 1.0, peck: Math.sin(l * 0.25) > 0.6 ? 1 : 0, scale: 1.0, mirror: true },
      { kind: "rooster", x: MX - 2.2 + 0.4 * Math.sin(l * 0.02), z: MZ - 0.6, peck: Math.sin(l * 0.21 + 1) > 0.7 ? 1 : 0, scale: 1.1 },
      ...[0, 1, 2].map((i) => ({ kind: "chick" as const, x: MX - 0.9 + i * 0.25 + 0.1 * Math.sin(l * 0.1 + i), z: MZ + 1.35 + 0.1 * i, peck: Math.sin(l * 0.4 + i * 2) > 0.3 ? 1 : 0, mirror: i === 1 }))];
    for (const b of birds) c.cast.bird(b, c.cam);
    // background life: men clear the ruins of their houses (one squats and picks, one carries a plank across)
    person(c, "bg1", state(villager(11), 0.9), -11.5, 11.5, { seed: 8, beats: [[0, "pained"]] }, { squat: 0.5, hands: [[-0.4, 1.1 + 0.1 * Math.sin(l * 0.2)], [0.45, 1.05]] });
    const cx = -4 + ((l * 0.035) % 9);
    person(c, "bg2", state(villager(14), 0.9), cx, 12.5, { seed: 9, beats: [[0, "nervous"]] }, { mode: "stroll", phase: l / 20, bobK: 2, facing: 1, hands: [[-0.35, -0.25], [0.4, -0.3]], hold: [null, "plank"] });
    person(c, "bg3", state(villager(17), 0.9), 3.5, 10.5, { seed: 10, beats: [[0, "dazed"]] }, { look: -1 });
    for (let k = 0; k < 4; k++) { const u = ((l * 0.006 + k * 0.27) % 1), fl = Math.round(((l * 0.5 + k) % 2)); fx(c, `bird${fl}`, (p) => { p.stroke(fl ? [[60, 160], [150, 120], [240, 160]] : [[60, 120], [150, 150], [240, 120]], 14); }, -30 + u * 60, 16 + k * 1.5 + Math.sin(u * 9) * 0.6, -15 - k * 4, 0.9); }
  },
};

// ======================= C: the whirlwind (beat 2, voice 4.9-10.9 s) =======================
const tC = at(4.9);
const C_PUTING = tC(6.11), C_EMAS = tC(8.09), C_RUMAH = tC(8.7), C_SAWAH = tC(9.29), C_TERBANG = tC(9.95);
export const HOUSE = V(-7.5, 0, 9); // a middle house that lifts on "rumah"
export const sceneC: Scene = {
  set: "intact", fogInk: true, len: 180, mood: () => "storm", kicks: [[C_EMAS, 1.4], [C_RUMAH, 1.6], [C_RUMAH + 9, 0.8]],
  // wind time per shot: the funnel far off, crossing the poor houses, at the coin heap on "Emas", at the house on "rumah"
  wind: (l) => (l < C_PUTING ? 12 + l * 0.3 : l < C_EMAS ? 40 + (l - C_PUTING) * 0.32 : l < C_RUMAH ? 80 + (l - C_EMAS) * 0.6 : l < C_TERBANG ? 66 + (l - C_RUMAH) * 0.55 : 90 + (l - C_TERBANG) * 0.4),
  keys: [ // continuous on the road (low among the villagers -> down the road as they run at us); one cut to the coin heap; then a whip up to the house and the sky
    { f: 0, s: (l) => ({ ...push([-20.2, 0.55, 3.6], [-28, 3.2, -6], l, 0, 0.0025), fov: 50, roll: 0.02 }) },
    { f: C_PUTING - 12, dur: 30, s: (l) => { const u = sm((l - C_PUTING) / 60); return { pos: [lerp(-19.5, -16.5, u), lerp(1.0, 2.2, u), lerp(1.4, 0.2, u)], look: [-45, lerp(4.5, 6, u), -0.4], fov: 52, roll: -0.03 }; } },
    { f: C_EMAS, cut: true, s: (l) => ({ pos: orbit([COIN_PILE.x - 0.4, 2.0, COIN_PILE.z + 5.0], [COIN_PILE.x, 2.0, COIN_PILE.z], (l - C_EMAS) * 0.6), look: [COIN_PILE.x, 2.0, COIN_PILE.z], fov: 40, roll: 0.05 }) },
    { f: C_RUMAH, cut: true, s: (l) => { const u = sm((l - C_RUMAH) / 34); return { pos: orbit([HOUSE.x + 2.5, lerp(1.3, 3.0, u), HOUSE.z + 10], [HOUSE.x, 3, HOUSE.z], (l - C_RUMAH) * 0.4), look: [HOUSE.x, lerp(3, 11, u), HOUSE.z], fov: 50, roll: lerp(0, -0.08, u) }; } },
    { f: C_TERBANG - 4, dur: 16, s: (l) => { const u = (l - C_TERBANG) / 30; return { pos: [HOUSE.x + 1.5 + u * 3, 6 + u * 14, HOUSE.z + 16 - u * 6], look: [HOUSE.x + u * 8, 18 + u * 22, HOUSE.z - 4], fov: 56, roll: -0.08 - u * 0.25 }; } },
  ],
  dof: (l) => (l >= C_EMAS && l < C_RUMAH ? { cInf: 12, focus: [COIN_PILE.x, 2.0, COIN_PILE.z] } : l < C_PUTING ? { cInf: 10, focus: [-21.6, 1.6, 1.4] } : l < C_EMAS ? { cInf: 3, focus: [-27, 1.6, 1.0] } : { cInf: 0 }),
  pose: (c) => {
    const { l, w } = c;
    w.plots.forEach((p) => (p.o.visible = true)); w.coinPile.visible = true;
    if (l < C_PUTING) { // villagers by the road look up at the sky; the caping man shades his eyes
      person(c, "v1", state(POOR, 0), -21.6, 1.4, { seed: 3, beats: [[0, "neutral"], [14, "nervous"], [C_PUTING - 8, "shock"]] }, { look: -0.4, headTilt: -6, hands: [null, [0.22, -0.72]] });
      person(c, "v2", state(villager(7), 0), -22.9, 0.5, { seed: 2, beats: [[0, "neutral"], [20, "shock"]] }, { look: -0.6, headTilt: 5 });
    } else if (l < C_EMAS) { // people run from the funnel, the caping flies off
      const run = (l - C_PUTING) / 10;
      for (const [i, P, x0, z0, d] of [[0, POOR, -30, 0.9, 0], [1, POOR2, -31.5, -0.6, 6], [2, villager(8), -33, 1.8, 12]] as const) {
        const x = x0 + (l - C_PUTING - d) * 0.16;
        if (l - C_PUTING < d) continue;
        const Pp: Person = i === 0 && l > C_PUTING + 14 ? { ...state(P, 0.3), extras: P.extras.filter((e) => e !== "caping") } : state(P, 0.3);
        person(c, "run" + i, Pp, x, z0, { seed: 3 + i, beats: [[0, "shock"]] }, { mode: "stroll", phase: run + i * 0.3, bobK: 3.2, lift: 120, tilt: 8, facing: 1, look: -1, hands: [[-0.9, -0.35 + 0.15 * Math.sin(l + i)], [0.9, -0.4 + 0.15 * Math.cos(l + i)]] });
        if (((l + i * 3) % 6) < 3) fx(c, `dust${i}${Math.round(((l % 6) / 6) * 10)}`, (p) => fxDust(p, ((l % 6) / 6)), x - 0.4, 0.15, z0 + 0.1, 0.7);
      }
      if (l > C_PUTING + 14) { const u = (l - C_PUTING - 14) / 30, a = Math.round(u * 36) / 6; fx(c, `caping${Math.round(a * 6)}`, (p) => { p.g.translate(150, 150); p.g.rotate(a); p.g.translate(-150, -150); p.poly([[30, 170], [150, 80], [270, 170], [210, 185], [90, 185]], "#e2c27a", 7); }, -29 + (l - C_PUTING) * 0.16 - u * 3, 1.9 + u * 4 + u * u * 3, 0.9 + u, 0.6); }
      for (let k = 0; k < 14; k++) { const u = ((l * 0.02 + hash(k)) % 1), kind = k % 3, a = Math.round((l * 0.3 + k) % 6.28 * 3) / 3; fx(c, `deb${kind}|${a}`, (p) => { p.g.translate(150, 150); p.g.rotate(a); p.g.translate(-150, -150); fxDebris(p, kind); }, windX(LAST_WIND) + Math.cos(k * 2 + l * 0.2) * (2 + u * 6), 1 + u * 14, Math.sin(k * 2 + l * 0.2) * (2 + u * 6), 0.5 + 0.3 * hash(k + 1)); }
      smoke(c, "dustwall", windX(LAST_WIND), 0.4, 0, l, 4, 30, 0, 3.2, 2.5);
    } else if (l < C_RUMAH) { // the rich man on his coins: shock, coins tear loose and fly up
      const u = (l - C_EMAS) / (C_RUMAH - C_EMAS);
      const off = l >= C_EMAS + 3, flyU = clamp01((l - C_EMAS - 3) / 14);
      const richP: Person = off ? { ...state(RICH, 0.15 + 0.5 * u), extras: RICH.extras.filter((e) => e !== "shades") } : state(RICH, 0.15 + 0.5 * u);
      if (off && flyU < 1) { const a = Math.round(flyU * 24) / 4; fx(c, `shades${a}`, (p) => { p.g.translate(150, 150); p.g.rotate(a); p.g.translate(-150, -150); for (const sx of [-1, 1]) p.poly([[150 + sx * 18, 130], [150 + sx * 110, 126], [150 + sx * 100, 180], [150 + sx * 26, 176]], "#14121a", 8); p.stroke([[132, 140], [168, 140]], 8); }, COIN_PILE.x + 0.4 + flyU * 1.6, 2.35 + flyU * 1.4 - flyU * flyU * 0.6, COIN_PILE.z + 0.4, 0.35); }
      person(c, "rich", richP, COIN_PILE.x, COIN_PILE.z + 0.15, { seed: 4, beats: [[0, "grin"], [3, "shock"]] }, { headK: lerp(1.22, 1.08, clamp01((l - C_EMAS - 3) / 12)), mode: "sit", look: -1, headTilt: -6 + 3 * Math.sin(l * 2), hands: [[-0.95, -0.6], [0.95, -0.65]], tilt: 4 * Math.sin(l * 1.7) }, { y: 1.22 });
      for (let k = 0; k < 18; k++) { const v = clamp01(u * 1.6 - hash(k) * 0.5), sp = Math.round((l * 0.5 + k) % 6.28 * 3) / 3; if (v <= 0) continue; fx(c, `coin${sp}`, (p) => fxCoin(p, sp), COIN_PILE.x + Math.cos(k * 1.9) * (0.8 + v * 2.5), 1.3 + v * 3.5 + hash(k + 2) * 0.6, COIN_PILE.z + 0.6 + Math.sin(k * 1.9) * 0.6, 0.18, 0.18, 200, 200); }
    } else if (l < C_TERBANG) { // the house tears loose (world wind lifts it); a family runs out under it
      const u = (l - C_RUMAH) / (C_TERBANG - C_RUMAH);
      for (const [i, P, x, d] of [[0, MID2, -10.4, 0], [1, villager(13), -9.2, 4]] as const) if (l - C_RUMAH >= d)
        person(c, "fam" + i, state(P, 0.4), x + (l - C_RUMAH - d) * 0.12, 13.0 + i * 0.6, { seed: 4 + i, beats: [[0, "shock"]] }, { mode: "stroll", phase: (l - C_RUMAH) / 9 + i * 0.4, bobK: 3, tilt: 7, facing: 1, look: -1, hands: [[-0.8, -0.5], [0.85, -0.45]] });
      for (let k = 0; k < 10; k++) { const v = ((u + hash(k) * 0.6) % 1), kind = k % 3, a = Math.round((l * 0.35 + k) % 6.28 * 3) / 3; fx(c, `deb${kind}|${a}`, (p) => { p.g.translate(150, 150); p.g.rotate(a); p.g.translate(-150, -150); fxDebris(p, kind); }, HOUSE.x + Math.cos(k * 1.3) * 3, 2 + v * 12, HOUSE.z - 1 + Math.sin(k * 1.3) * 2, 0.6); }
      smoke(c, "hdust", HOUSE.x, 0.5, HOUSE.z, l, 5, 24, 0, 3, 2);
    } else { // everything flies: coins, planks and leaves pass the lens
      for (let k = 0; k < 24; k++) { const v = ((l - C_TERBANG) / 30 + hash(k)) % 1, kind = k % 4, a = Math.round((l * 0.4 + k) % 6.28 * 3) / 3, x = HOUSE.x + (hash(k + 3) - 0.3) * 14, y = 8 + v * 40, z = HOUSE.z + (hash(k + 6) - 0.5) * 10;
        if (kind === 3) fx(c, `coin${a}`, (p) => fxCoin(p, a), x, y, z, 0.35, 0.35, 200, 200);
        else fx(c, `deb${kind}|${a}`, (p) => { p.g.translate(150, 150); p.g.rotate(a); p.g.translate(-150, -150); fxDebris(p, kind); }, x, y, z, 1.0); }
    }
  },
};

let LAST_WIND = 0;
const SCENES = [sceneA, sceneB, sceneC];
const XF = 8; // scenes overlap and dissolve over 8 frames, each joined through the sky (see the first / last camera keys)
export const AYAM_ACT_FRAMES = SCENES.reduce((a, s) => a + s.len, 0) - XF * (SCENES.length - 1);

// ---------------- renderer ----------------
const makeBloom = () => new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
const fwd = new THREE.Vector3();
/** rate < 1 plays the scene slower (all acting and camera moves stretched; the scene clock may be fractional) */
export const SceneInner: React.FC<{ S: Scene; rate?: number }> = ({ S, rate = 1 }) => {
  const l = Math.round(useCurrentFrame() * rate * 1000) / 1000;
  const { camera, scene } = useThree(); const cam = camera as THREE.PerspectiveCamera;
  const world = useMemo(() => new AyamWorld(), []); const cast = useMemo(() => new Cast(world), [world]);
  const dress = useMemo(() => { const night = bonfireDress(BF), yard = yardDress(MX, MZ); world.root.add(night, yard); return { night, yard }; }, [world]);
  const ruins = useMemo(() => { const r = ruinsDress(world.plots.map((p) => ({ kind: p.kind, x: p.x, z: p.z, seed: p.seed }))); world.root.add(r); return r; }, [world]);
  const intact = S.set === "intact"; dress.night.visible = !!S.night; dress.yard.visible = !!S.yard; ruins.visible = !intact; // after the whirlwind only ruins are left

  const post = useMemo(() => ({ ink: new InkPass(scene, cam), lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }), bloom: makeBloom(), tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day) }), [scene, cam]);
  React.useEffect(() => () => InkPass.prototype.dispose.call(post.ink), [post]);
  // ink lines fade fully into the storm fog (no tree outlines behind the funnel); elsewhere the usual light fog tint
  const ink = post.ink as unknown as { compMat: THREE.ShaderMaterial; maskMat: THREE.ShaderMaterial };
  ink.compMat.uniforms.fogInk.value = S.fogInk ? 1.0 : 0.3; ink.maskMat.uniforms.fogStart.value = S.fogInk ? 4 : 60;
  let c = runKeys(S.keys, l); const kick = kickAt(S.kicks ?? [], l);
  if (kick) { const d = c.look.map((v, i) => v - c.pos[i]), Lh = Math.hypot(d[0], d[2]) || 1, m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * Math.hypot(...d) * kick * 1.5; c = { ...c, look: [c.look[0] - (d[2] / Lh) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / Lh) * m], roll: c.roll + kick * 0.006 }; }
  cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll); cam.fov = c.fov; cam.near = 0.3; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.layers.enable(NOINK); cam.layers.enable(PUDDLE);
  // the sun is frozen per camera key (camera-relative), so find the key this frame belongs to
  let kf = 0; for (const key of S.keys) if (l >= key.f && (key.cut || key === S.keys[0])) kf = key.f;
  const c0 = runKeys(S.keys, kf), mood = S.mood(l);
  world.setLight(cam, scene, { pos: V(...c0.pos), look: V(...c0.look) }, V(...c.look), cam.position.distanceTo(V(...c.look)), mood);
  gradeFor(post.grade, mood === "golden" ? "golden" : "day"); world.flicker(l); world.setRain(cam, l);
  const wl = S.wind ? S.wind(l) : null; world.setWind(wl); LAST_WIND = wl ?? 0;
  if (!S.wind) { world.plots.forEach((p) => (p.o.visible = intact)); world.coinPile.visible = intact; }
  world.signs.forEach((o) => (o.visible = intact)); world.coops.forEach((co) => (co.visible = false));
  for (const r of [world.ref.board, world.ref.roast, world.ref.basket, world.ref.bones, world.ref.suv, world.ref.dijual]) r.visible = false;
  world.ref.protest.forEach((p) => (p.visible = false)); world.setCrack(0, 0, 0); world.setPuddles(S.wet ?? []);
  cast.begin(); S.pose({ l, w: world, cast, cam }); cast.end();
  // depth of field eases between settings over ~14 f (the camera moves continuously, so the focus must too)
  cam.getWorldDirection(fwd); let fsum = 0, csum = 0, n = 0;
  for (let j = Math.max(0, l - 13); j <= l; j++) { const d = S.dof(j); fsum += (d.focus ? V(...d.focus) : V(...c.look)).sub(cam.position).dot(fwd); csum += d.cInf; n++; }
  post.lens.focus = Math.max(0.3, fsum / n); post.lens.cInf = csum / n;
  return (
    <>
      <primitive object={world.root} dispose={null} />
      <EffectComposer multisampling={4}>
        <primitive object={post.ink} dispose={null} /><primitive object={post.lens.pre} dispose={null} /><primitive object={post.lens.main} dispose={null} />
        <primitive object={post.bloom} dispose={null} /><primitive object={post.tone} dispose={null} /><primitive object={post.grade} dispose={null} />
      </EffectComposer>
    </>
  );
};

const FadeWrap: React.FC<{ k: number; children: React.ReactNode }> = ({ k, children }) => { const l = useCurrentFrame(); return <AbsoluteFill style={{ opacity: k > 0 ? clamp01((l + 1) / (XF + 1)) : 1 }}>{children}</AbsoluteFill>; };
export const AyamActTest: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: "#0c1020" }}>
      {SCENES.map((S, k) => { const a = from; from += S.len - XF; return (
        <Sequence key={k} from={a} durationInFrames={S.len}>
          <FadeWrap k={k}>
            <ThreeCanvas width={W} height={H} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 40, near: 0.3, far: 1500 }}>
              <SceneInner S={S} />
            </ThreeCanvas>
          </FadeWrap>
        </Sequence>
      ); })}
    </AbsoluteFill>
  );
};
