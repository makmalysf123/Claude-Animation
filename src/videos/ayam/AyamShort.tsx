// "Satu Ayam yang Sama": full short (80 s, 2400 f at 30 fps), timed to the test narration's word timings
// (voice/ayam/words.json, Microsoft "Ardi" +34 %; the final voice will be re-timed). 15 beats, 18 shots; follows the
// reference's flow (docs/scripts/satu-ayam-v2.md) in our kampung. Effects only where the beat needs them.
import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { AbsoluteFill, Easing, Sequence, useCurrentFrame } from "remotion";
import { InkPass, NOINK } from "../bridge/ink";
import { LensBlur } from "../bridge/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "../bridge/grade";
import { glide } from "../bridge/story";
import { fxPuff } from "../bridge/toon";
import type { Expr, FrontOpts } from "../bridge/toon";
import { blinkAt } from "../format/toonCast";
import { AyamWorld, Cast, COIN_PILE, FARM, LAPANGAN, V, windX, Who, Bird, Mood, BONFIRE_AT, Glow } from "./world";
import { RICH, RICH2, MID, MID2, POOR, POOR2, state, villager, Person, WHITE } from "./people";
import { COUNTRY, P as GEO } from "../format/geo";
import { gradeMat } from "../format/MapStyleTest";
import { buildCountry, setCountry, useTex } from "../format/CountryRevealTest";

const W = 1080, H = 1920, FPS = 30;
export const AYAM_SHORT_FRAMES = 2400;
const FONT = "'Avenir Next', 'Helvetica Neue', Arial, sans-serif";
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (x: number) => Easing.inOut(Easing.cubic)(clamp01(x));
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const T = (sec: number) => Math.round(sec * FPS) - 2; // reactions land 2 f before the word

// ---------------- cast: three groups (each class mixes men and women) ----------------
const G1 = [POOR, POOR2, villager(5)];   // poor: eats the chicken
const G2 = [MID, MID2, villager(4)];     // middle: keeps it for eggs
const G3 = [RICH, RICH2, villager(3)];   // rich: multiplies it
export const JOKER: Person = { o: { jacket: "#e8b820", pants: "#232838", boots: "#1b1a20", hat: "hair", hair: "#1e1410", skin: WHITE, buttons: "#ffffff" }, extras: ["chain", "shades"], shine: 0.7 };
const L = LAPANGAN, F = FARM, BF = BONFIRE_AT();
const FIRE = (f: number): Glow => ({ at: V(BF.x, 0.75, BF.z + 0.2), col: [255, 150, 60], k: 0.86 + 0.08 * Math.sin(f * 1.7) + 0.06 * Math.sin(f * 3.1 + 1), radius: 5 });
/** expression schedule: [[localFrame, expr], ...] -> expr at l */
const ex = (l: number, list: [number, Expr][]): Expr => { let e = list[0][1]; for (const [t, x] of list) if (l >= t) e = x; return e; };
const who = (id: string, P: Person, x: number, z: number, opts: FrontOpts, extra: Partial<Who> = {}): Who => ({ id, P, x, z, opts: { mode: "stand", ...opts }, ...extra });

// ---------------- camera keys (smootherstep glides, creeping push-in on holds) ----------------
type Key = { f: number; dur?: number; pos: [number, number, number]; look: [number, number, number]; fov: number; roll?: number; creep?: number };
type Cam = { pos: THREE.Vector3; look: THREE.Vector3; fov: number; roll: number };
const camOf = (keys: Key[], f: number): Cam => {
  let n = keys.findIndex((k) => f < k.f); if (n === 0) n = 1;
  const k = n < 0 ? keys[keys.length - 1] : keys[n - 1], nx = n < 0 ? null : keys[n];
  let pos = V(...k.pos), look = V(...k.look), fov = k.fov, roll = k.roll ?? 0;
  if (nx && (nx.dur ?? 0) > 0 && f >= nx.f - nx.dur!) { const u = glide((f - (nx.f - nx.dur!)) / nx.dur!); pos = pos.lerp(V(...nx.pos), u); look = look.lerp(V(...nx.look), u); fov = lerp(fov, nx.fov, u); roll = lerp(roll, nx.roll ?? 0, u); }
  else { const c = (k.creep ?? 0.0022) * Math.max(0, f - k.f); pos = pos.lerp(look, Math.min(0.22, c)); }
  return { pos, look, fov, roll };
};

// ---------------- shots ----------------
type Setup = { houses?: boolean; coin?: boolean; signs?: boolean; coops?: number; board?: [number, number, "kenapa" | "telurAyam" | "investasi"]; roast?: boolean; bones?: boolean; basket?: [number, number] | null; protest?: boolean; suv?: [number, number, number]; dijual?: [number, number] };
type Shot = { a: number; b: number; xf?: number; mood: Mood; cam: (l: number) => Cam; focus: (l: number) => THREE.Vector3; cInf: number;
  setup: (l: number, f: number) => Setup; wind?: (l: number) => number | null; people: (l: number, f: number) => Who[]; birds?: (l: number, f: number) => Bird[]; puffs?: (l: number) => [number, number, number, number][] };
const K = (keys: Key[]) => (l: number) => camOf(keys, l);
const blink = (f: number, s: number) => blinkAt(f, s);

const SHOTS: Shot[] = [
  { // 1 · 0-1.6 s · "Kenapa yang kaya makin kaya" : rich man on his coin heap
    a: 0, b: 48, mood: "day", cInf: 12, cam: K([{ f: 0, pos: [27.75, 2.35, 9.9], look: [28.6, 2.2, 4.9], fov: 40, roll: -0.04, creep: 0.004 }]),
    focus: () => V(COIN_PILE.x, 2.6, COIN_PILE.z), setup: () => ({ houses: true, coin: true, signs: true }),
    people: (l, f) => [who("rich", RICH, COIN_PILE.x, COIN_PILE.z + 0.15, { mode: "sit", expr: Math.floor(f / 7) % 2 ? "laugh" : "grin", blink: blink(f, 3), seed: 4, wave: 0.5 + 0.5 * Math.sin(f / 4) }, { y: 1.22 }),
      who("rich2", RICH2, COIN_PILE.x + 2.4, COIN_PILE.z + 0.6, { expr: "smile", look: -0.6, blink: blink(f, 8), seed: 6 })] },
  { // 2 · 1.6-3.0 s · "dan yang miskin makin susah?" : the poor couple at their shack
    a: 48, b: 90, mood: "day", cInf: 12, cam: K([{ f: 0, pos: [-25.95, 1.45, -1.6], look: [-26.0, 1.3, 4.2], fov: 42, roll: 0.03, creep: 0.003 }]),
    focus: () => V(-26.3, 1.9, 4.1), setup: () => ({ houses: true, signs: true }),
    people: (l, f) => [who("poor", { ...POOR, extras: [...POOR.extras, "sweat"] }, -26.6, 3.95, { expr: "nervous", look: 0.2, blink: blink(f, 11), seed: 3, headTilt: -4 }),
      who("poor2", POOR2, -25.5, 4.35, { expr: "pained", look: -0.7, blink: blink(f, 13), seed: 7 })],
    birds: (l, f) => [{ kind: "hen", x: -25.0, z: 3.0, peck: Math.sin(f * 0.3) > 0.5 ? 1 : 0, mirror: true, scale: 0.9 }] },
  { // 3 · 3.0-4.9 s · "Jawabannya... seekor ayam." : chicken presenter at the KENAPA? board
    a: 90, b: 147, mood: "day", cInf: 12, cam: K([{ f: 0, pos: [2.65, 1.35, 6.9], look: [2.65, 1.4, 1.0], fov: 46, creep: 0.003 }]),
    focus: () => V(2.4, 1.5, 1.4), setup: () => ({ houses: true, signs: true, board: [3.05, 0.7, "kenapa"] }),
    people: () => [], birds: (l) => [{ kind: "hen", x: 1.85, z: 1.75, peck: l > T(3.93) - 90 && l < T(3.93) - 90 + 6 ? 1 : 0, scale: 1.9 }] },
  { // 4 · 4.9-10.9 s · storm, the whirlwind takes houses, gold and fields
    a: 147, b: 326, mood: "storm", cInf: 0,
    cam: (l) => { const wx = -55 + 110 * clamp01((l - 50) / 120); return { pos: V(wx + 4, 9, -40), look: V(wx + 6, 7, 0), fov: 52, roll: 0 }; },
    focus: (l) => V(-55 + 110 * clamp01((l - 50) / 120), 6, 0), setup: () => ({ houses: true, coin: true, signs: true }),
    wind: (l) => 40 + (l - 50) * 0.5, people: () => [] },
  { // 5 · 10.9-15.1 s · "Sekarang semua orang sama ... lapar." : night, everyone in their own torn clothes
    a: 326, b: 453, xf: 8, mood: "night", cInf: 10, cam: K([{ f: 0, pos: [0.3, 1.75, L.z + 7.4], look: [0, 1.2, L.z - 1.2], fov: 48, roll: 0.02, creep: 0.0025 }]),
    focus: () => V(0, 1.6, L.z), setup: () => ({}),
    people: (l, f) => Array.from({ length: 12 }, (_, i) => {
      const g = i % 3, gx = [-1.7, 0.1, 1.8][g], k = Math.floor(i / 3), P = state([G1, G2, G3][g][k % 3], 1);
      return who("n" + i, P, L.x + gx + (k % 2 ? 0.7 : -0.6) + hash(i) * 0.4, L.z - k * 1.3 - hash(i + 3) * 0.5,
        { expr: ex(f, [[0, (["dazed", "nervous", "pained"] as Expr[])[i % 3]], [T(14.18), "pained"]]), look: (hash(i + 5) - 0.5) * 1.6, blink: blink(f, i * 3 + 1), seed: (i % 7) + 1 }, { glow: FIRE(f) });
    }) },
  { // 6 · 15.1-18.0 s · "Tiga hari kemudian, tiap kelompok dapat satu ekor ayam." : chickens drop into each group
    a: 453, b: 540, xf: 8, mood: "day", cInf: 0, cam: K([{ f: 0, pos: [0.2, 1.6, L.z + 7.6], look: [0.1, 1.5, L.z - 1.0], fov: 58, creep: 0.002 }]),
    focus: () => V(0, 1.6, L.z), setup: () => ({}),
    people: (l, f) => {
      const landed = f >= T(17.2), out: Who[] = [];
      [G1, G2, G3].forEach((g, gi) => g.forEach((P, k) => { const gx = [-1.9, 0.15, 2.2][gi];
        out.push(who(`d${gi}${k}`, state(P, 1), L.x + gx + [-0.4, 0.45, 0][k], L.z - 0.3 - k * 0.9, { expr: landed ? (k === 0 ? "relief_open" : "smile") : "shock", look: 0, blink: landed ? blink(f, gi * 5 + k) : 0, seed: gi * 3 + k + 1 })); }));
      return out;
    },
    birds: (l, f) => [-1.9, 0.15, 2.2].map((x, i) => { const u = clamp01((f - T(17.2) + 22 - i * 2) / 22); return { kind: "hen" as const, x: L.x + x, z: L.z + 0.2, y: Math.max(0, 6 * (1 - u * u)), peck: u < 1 ? 0.5 : 0, scale: 1.2, mirror: i === 1 }; }),
    puffs: (l) => { const t = clamp01((l + 453 - T(17.2)) / 18); return t > 0 && t < 1 ? [-1.9, 0.15, 2.2].map((x) => [L.x + x, 0.25, L.z + 0.3, t] as [number, number, number, number]) : []; } },
  { // 7 · 18.0-24.8 s · group 1 roasts it that night: best dinner ... and the last
    a: 540, b: 744, xf: 8, mood: "night", cInf: 12, cam: K([{ f: 0, pos: [BF.x + 0.2, 1.55, BF.z + 5.3], look: [BF.x, 1.25, BF.z - 0.6], fov: 48, creep: 0.0018 }]),
    focus: () => V(BF.x - 1.2, 1.7, BF.z - 0.3), setup: (l, f) => ({ roast: f < T(23.88), bones: f >= T(23.88) }),
    people: (l, f) => {
      const e = (i: number): Expr => ex(f, [[0, (["pained", "dazed", "nervous"] as Expr[])[i]], [T(20.3), (["grin", "lick", "grin"] as Expr[])[i]], [T(22.68), (["laugh", "lick", "laugh"] as Expr[])[i]], [T(23.88), (["dazed", "pained", "nervous"] as Expr[])[i]]]);
      return [who("e1", state(G1[0], 1), BF.x - 1.2, BF.z - 0.35, { expr: e(0), look: 0.6, blink: blink(f, 3), seed: 3 }, { glow: FIRE(f) }),
        who("e2", state(G1[1], 1), BF.x + 1.2, BF.z - 0.3, { expr: e(1), look: -0.6, blink: blink(f, 5), seed: 5 }, { glow: FIRE(f) }),
        who("e3", state(G1[2], 1), BF.x + 0.05, BF.z - 1.7, { expr: e(2), look: 0, blink: blink(f, 7), seed: 7 }, { glow: FIRE(f) })];
    } },
  { // 8 · 24.8-32.8 s · group 2 keeps theirs alive: hen -> eggs, rooster -> breeding
    a: 744, b: 985, xf: 8, mood: "day", cInf: 13, cam: K([{ f: 0, pos: [L.x - 7.5, 1.5, L.z + 3.6], look: [L.x - 7.7, 1.25, L.z - 2.2], fov: 50, creep: 0.0018 }]),
    focus: () => V(L.x - 8, 1.6, L.z - 2.4), setup: (l, f) => ({ coops: 1, basket: f >= T(28.25) ? [L.x - 7.75, L.z - 1.55] : null }),
    people: (l, f) => [0, 1, 2].map((k) => who("m" + k, state(G2[k], 0.8), L.x + [-8.6, -7.0, -7.85][k], L.z + [-2.4, -2.6, -3.3][k],
      { expr: ex(f, [[0, "nervous"], [T(26.25), "smile"], [T(28.25), (["smile", "relief", "smile_closed"] as Expr[])[k]]]), look: [0.4, -0.4, 0][k], blink: blink(f, k * 4 + 2), seed: [2, 4, 6][k] })),
    birds: (l, f) => { const out: Bird[] = [{ kind: "hen", x: L.x - 7.1, z: L.z - 1.5, peck: Math.sin(f * 0.25) > 0.6 ? 1 : 0, scale: 1.05, mirror: true }];
      if (f >= T(30.55)) out.push({ kind: "rooster", x: L.x + lerp(-5.6, -6.5, ease((f - T(30.55)) / 25)), z: L.z - 1.9, peck: 0, scale: 1.2, mirror: true }); return out; } },
  { // 9 · 32.8-40.7 s · group 3 has another plan: they come to group 2 for the eggs
    a: 985, b: 1220, mood: "day", cInf: 10, cam: K([{ f: 0, pos: [L.x - 6.4, 1.6, L.z + 6.2], look: [L.x - 6.4, 1.3, L.z - 2.4], fov: 54, creep: 0.0016 }]),
    focus: () => V(L.x - 6.4, 1.6, L.z - 2.4), setup: () => ({ coops: 1, basket: [L.x - 6.7, L.z - 1.4] }),
    people: (l, f) => {
      const walk = ease((f - T(35.03)) / 40), out: Who[] = [];
      [0, 1].forEach((k) => out.push(who("m" + k, state(G2[k], 0.8), L.x + [-7.9, -7.15][k], L.z + [-2.5, -2.9][k], { expr: ex(f, [[0, "smile"], [T(36.46), "nervous"], [T(39.32), "relief"]]), look: 0.8, blink: blink(f, k * 4 + 2), seed: [2, 4][k] })));
      [0, 1, 2].forEach((k) => { const x = L.x + lerp(-2.6, [-5.6, -4.85, -5.25][k], walk), z = L.z + [-2.4, -2.8, -3.4][k];
        out.push(who("r" + k, state(G3[k], 0.8), x, z, { mode: walk > 0 && walk < 1 ? "stroll" : "stand", phase: f / 20 + k * 0.3, expr: ex(f, [[0, "neutral"], [T(33.59), "grin"], [T(36.46), k === 0 ? "grin" : "smile"], [T(39.32), "grin"]]), look: -0.8, blink: blink(f, k * 4 + 9), seed: [4, 6, 1][k], wave: k === 0 && f >= T(36.46) && f < T(37.4) ? 0.6 : k === 0 && f >= T(39.32) ? 0.3 : undefined })); });
      return out;
    } },
  { // 10 · 40.7-44.2 s · "Kelompok kedua mau telur. Kelompok ketiga ... mau ayam." : the board
    a: 1220, b: 1325, xf: 6, mood: "day", cInf: 12, cam: K([{ f: 0, pos: [L.x + 0.0, 1.35, L.z + 5.4], look: [L.x + 0.0, 1.4, L.z - 0.7], fov: 46, creep: 0.003 }]),
    focus: () => V(L.x, 1.5, L.z - 0.4), setup: () => ({ board: [L.x + 0.4, L.z - 1.0, "telurAyam"] }),
    people: () => [], birds: (l, f) => [{ kind: "hen", x: L.x - 0.8, z: L.z - 0.05, peck: (f >= T(41.47) && f < T(41.47) + 5) || (f >= T(43.39) && f < T(43.39) + 5) ? 1 : 0, scale: 1.9 }] },
  { // 11 · 44.2-46.8 s · "Tiga minggu kemudian, anak ayam pertama menetas."
    a: 1325, b: 1405, xf: 6, mood: "day", cInf: 14, cam: K([{ f: 0, pos: [F.x - 0.4, 0.95, F.z + 9.0], look: [F.x - 0.7, 0.55, F.z + 6.0], fov: 42, creep: 0.003 }]),
    focus: () => V(F.x - 0.6, 0.4, F.z + 6.0), setup: () => ({ basket: [F.x - 0.6, F.z + 6.0] }),
    people: (l, f) => [who("o", state(G3[0], 0.6), F.x - 2.0, F.z + 5.0, { expr: f >= T(46.11) ? "grin" : "smile", look: 0.7, blink: blink(f, 4), seed: 4 })],
    birds: (l, f) => { const out: Bird[] = [{ kind: "hen", x: F.x + 0.35, z: F.z + 5.8, peck: 0, scale: 1.0 }];
      for (let i = 0; i < 4; i++) { const t = (f - T(46.11) - i * 4) / 6; if (t > 0) out.push({ kind: "chick", x: F.x - 0.6 + Math.cos(i * 1.7) * 0.55, z: F.z + 6.25 + Math.sin(i * 1.7) * 0.25, peck: Math.sin(f * 0.6 + i) > 0 ? 1 : 0, scale: 0.6 * Easing.out(Easing.back(2))(clamp01(t)) }); }
      return out; } },
  { // 12 · 46.8-52.5 s · months later they lay eggs; group 3's flock keeps growing (timeline)
    a: 1405, b: 1575, mood: "day", cInf: 0,
    cam: K([{ f: 0, pos: [F.x - 4.9, 1.55, F.z + 12.4], look: [F.x - 5.0, 1.3, F.z + 8.5], fov: 40 }, { f: 70, dur: 40, pos: [F.x - 7.8, 5.6, F.z + 15.5], look: [F.x - 1.5, 0.6, F.z + 2.5], fov: 48 }]),
    focus: () => V(F.x, 1, F.z), setup: (l, f) => ({ coops: f < T(47.21) ? 0 : f < T(48.55) ? 1 : f < T(49.92) ? 3 : f < T(51.4) ? 6 : 9 }),
    people: (l, f) => [who("o", state(G3[0], lerp(0.55, 0.2, clamp01(l / 170))), F.x - 5.0, F.z + 8.4, { expr: f > T(49.92) ? "grin" : "smile", look: 0.9, blink: blink(f, 4), seed: 4 }),
      who("o2", state(G3[1], lerp(0.55, 0.2, clamp01(l / 170))), F.x - 1.5, F.z + 3.2, { expr: "grin", look: -0.6, blink: blink(f, 9), seed: 6 })],
    birds: (l, f) => { const n = Math.floor(lerp(5, 70, clamp01((f - T(47.21)) / 140))), out: Bird[] = [];
      for (let i = 0; i < n; i++) out.push({ kind: i % 4 === 3 ? "chick" : "hen", x: F.x - 7 + hash(i * 3.1) * 12, z: F.z + 0.5 + hash(i * 7.7) * 6, peck: Math.sin(f * 0.25 + i) > 0.6 ? 1 : 0, mirror: i % 2 === 0, scale: (i % 4 === 3 ? 0.7 : 1.3) * Math.min(1, (n - i) / 2 + 0.2) });
      return out; } },
  { // 13 · 52.5-57.5 s · group 1 has nothing; all they can do is protest (sunset)
    a: 1575, b: 1725, mood: "golden", cInf: 10, cam: K([{ f: 0, pos: [F.x - 1.0, 1.7, F.z + 17.2], look: [F.x - 1.0, 1.85, F.z + 4.5], fov: 52, creep: 0.0022 }]),
    focus: () => V(F.x - 1.4, 1.8, F.z + 8.4), setup: () => ({ coops: 9 }),
    people: (l, f) => { const e: Expr = f >= T(56.54) ? "stern" : "pained";
      return [who("p1", { ...state(G1[0], 1), sign: "GA ADIL!" }, F.x - 2.3, F.z + 7.5, { expr: e, blink: blink(f, 3), seed: 3 }),
        who("p2", { ...state(G1[1], 1), sign: "BAGI DONG!" }, F.x - 1.35, F.z + 9.2, { expr: f >= T(56.54) ? "stern" : "nervous", blink: blink(f, 5), seed: 5 }),
        who("p3", { ...state(G1[2], 1), sign: "AYAM KAMI MANA?" }, F.x + 0.05, F.z + 7.9, { expr: e, blink: blink(f, 7), seed: 7 }),
        who("f1", state(G3[0], 0, 1), F.x + 1.2, F.z + 4.8, { expr: "grin", look: -0.6, blink: blink(f, 1), seed: 1 }), who("f2", state(G3[1], 0, 1), F.x - 3.6, F.z + 5.0, { expr: "whistle", look: 0.5, blink: blink(f, 4), seed: 4 })]; },
    birds: (l, f) => Array.from({ length: 40 }, (_, i) => ({ kind: i % 4 === 3 ? "chick" as const : "hen" as const, x: F.x - 7 + ((i * 37) % 120) / 10, z: F.z + 0.5 + ((i * 53) % 55) / 10, peck: Math.sin(f * 0.25 + i) > 0.6 ? 1 : 0, mirror: i % 2 === 0, scale: i % 4 === 3 ? 0.7 : 1.2 })) },
  { // 14 · 57.5-60.2 s · group 2 has eggs, enough to live calmly (clothes neat again)
    a: 1725, b: 1805, xf: 6, mood: "day", cInf: 13, cam: K([{ f: 0, pos: [L.x - 7.4, 1.3, L.z + 2.4], look: [L.x - 7.6, 1.2, L.z - 2.2], fov: 46, creep: 0.002 }]),
    focus: () => V(L.x - 7.8, 1.6, L.z - 2.5), setup: () => ({ coops: 1, basket: [L.x - 7.75, L.z - 1.55] }),
    people: (l, f) => [0, 1, 2].map((k) => who("m" + k, state(G2[k], 0.08), L.x + [-8.5, -7.0, -7.8][k], L.z + [-2.4, -2.6, -3.3][k], { expr: (["smile_closed", "smile", "relief"] as Expr[])[k], look: [0.4, -0.4, 0][k], blink: blink(f, k * 4 + 2), seed: [2, 4, 6][k] })),
    birds: (l, f) => [{ kind: "hen", x: L.x - 7.1, z: L.z - 1.5, peck: Math.sin(f * 0.25) > 0.6 ? 1 : 0, scale: 1.05, mirror: true }, { kind: "chick", x: L.x - 6.7, z: L.z - 1.2, peck: 0, scale: 0.6 }] },
  { // 15 · 60.2-63.2 s · group 3 has too many chickens to look after alone
    a: 1805, b: 1895, mood: "day", cInf: 8, cam: K([{ f: 0, pos: [F.x - 0.9, 1.75, F.z + 12.8], look: [F.x - 0.9, 1.2, F.z + 4.5], fov: 52, creep: 0.003 }]),
    focus: () => V(F.x - 1, 1.6, F.z + 5.5), setup: () => ({ coops: 9 }),
    people: (l, f) => [who("o", state(G3[0], 0, 1), F.x - 2.0, F.z + 6.0, { expr: f > T(61.39) ? "shock" : "nervous", look: 0.4, blink: blink(f, 4), seed: 4 }), who("o2", state(G3[1], 0, 1), F.x + 0.2, F.z + 5.6, { expr: "nervous", look: -0.5, blink: blink(f, 6), seed: 6 })],
    birds: (l, f) => Array.from({ length: 120 }, (_, i) => ({ kind: i % 5 === 4 ? "chick" as const : "hen" as const, x: F.x - 6.5 + hash(i * 2.3) * 11, z: F.z + 3.6 + hash(i * 5.9) * 5.2 + 0.1 * Math.sin(f * 0.05 + i), peck: Math.sin(f * 0.3 + i) > 0.5 ? 1 : 0, mirror: i % 2 === 0, scale: i % 5 === 4 ? 0.7 : 1.2 })) },
  { // 16 · 63.2-68.0 s · so they offer group 1 work, paid in eggs
    a: 1895, b: 2040, mood: "day", cInf: 10, cam: K([{ f: 0, pos: [F.x - 2.6, 1.55, F.z + 15.0], look: [F.x - 2.6, 1.3, F.z + 7.6], fov: 52, creep: 0.0018 }]),
    focus: () => V(F.x - 2.4, 1.6, F.z + 8), setup: (l, f) => ({ coops: 9, basket: f >= T(67.13) - 4 ? [F.x - 3.0, F.z + 8.9] : null }),
    people: (l, f) => { const walk = ease((f - T(63.56)) / 36), paid = f >= T(67.13);
      return [who("p1", state(G1[0], 1), F.x - 3.6, F.z + 8.3, { expr: ex(f, [[0, "dazed"], [T(65.58), "relief_open"], [T(67.13), "smile"]]), look: 0.8, blink: blink(f, 3), seed: 3 }),
        who("p2", state(G1[1], 1), F.x - 4.3, F.z + 7.6, { expr: paid ? "smile_closed" : "nervous", look: 0.7, blink: blink(f, 5), seed: 5 }),
        who("r1", state(G3[0], 0, 1), F.x + lerp(0.6, -1.7, walk), F.z + 8.0, { mode: walk > 0 && walk < 1 ? "stroll" : "stand", phase: f / 20, expr: ex(f, [[0, "neutral"], [T(65.22), "grin"]]), look: -0.9, blink: blink(f, 1), seed: 4, wave: f >= T(65.58) && f < T(66.62) ? 0.5 : undefined })]; },
    birds: (l, f) => Array.from({ length: 30 }, (_, i) => ({ kind: "hen" as const, x: F.x - 6 + hash(i * 2.3) * 10, z: F.z + 1 + hash(i * 5.9) * 4.5, peck: Math.sin(f * 0.3 + i) > 0.5 ? 1 : 0, mirror: i % 2 === 0, scale: 1.2 })) },
  { // 17 · 68.0-74.1 s · "Dan begitulah ... terbelah jadi tiga" : crane up through the clouds, then the map
    a: 2040, b: 2222, mood: "day", cInf: 0,
    cam: (l) => { const u = Easing.in(Easing.quad)(clamp01(l / 70)), h = lerp(3.2, 140, u); return { pos: V(F.x - 2, h, F.z + 16 - u * 14), look: V(F.x - 1, 0, F.z + 2 - u * 2), fov: 50, roll: u * 0.3 }; },
    focus: () => V(F.x, 1, F.z), setup: () => ({ coops: 9 }),
    people: (l, f) => [who("o", state(G3[0], 0, 1), F.x - 1.5, F.z + 3.2, { expr: "grin", blink: blink(f, 4), seed: 4 }), who("p1", state(G1[0], 1), F.x - 3.0, F.z + 8.0, { expr: "dazed", blink: blink(f, 3), seed: 3 })],
    birds: (l, f) => Array.from({ length: 60 }, (_, i) => ({ kind: "hen" as const, x: F.x - 7 + hash(i * 3.1) * 12, z: F.z + 0.5 + hash(i * 7.7) * 6, peck: Math.sin(f * 0.25 + i) > 0.6 ? 1 : 0, mirror: i % 2 === 0, scale: 1.3 })) },
  { // 18a · 74.1-78.2 s · joke: 500 juta cheque at the sold sawah ... "instrumen investasi"
    a: 2222, b: 2346, xf: 6, mood: "day", cInf: 12, cam: K([{ f: 0, pos: [6.0, 1.55, 60.4], look: [6.0, 1.5, 68.0], fov: 52, creep: 0.0025 }]),
    focus: () => V(6.0, 1.7, 67.6), setup: () => ({ dijual: [7.0, 68.6], board: [4.3, 68.2, "investasi"] }),
    people: (l, f) => [who("j", { ...JOKER, sign: "Rp 500.000.000", cheque: true }, 6.15, 67.6, { expr: ex(f, [[0, "grin"], [T(76.88), "dazed"], [T(77.73), "grin"]]), look: f >= T(76.88) && f < T(77.73) ? -1 : 0.2, blink: blink(f, 2), seed: 2 })] },
  { // 18b · 78.2-80 s · smash cut: "...beli Fortuner bekas?" grin out of a used SUV, neighbours cheering
    a: 2346, b: 2400, mood: "day", cInf: 8, cam: K([{ f: 0, pos: [4.2, 1.6, 56.4], look: [5.6, 1.35, 63.0], fov: 50, roll: -0.04, creep: 0.004 }]),
    focus: () => V(6, 1.7, 63.4), setup: () => ({ suv: [6.9, 64.4, Math.PI + 0.6] }),
    people: (l, f) => [who("j", JOKER, 5.0, 61.0, { expr: Math.floor(f / 5) % 2 ? "laugh" : "grin", look: -0.3, blink: 0, seed: 2, wave: 0.5 + 0.5 * Math.sin(f / 3) }),
      who("n1", villager(2), 2.9, 62.6, { expr: "laugh", blink: 0, seed: 6, wave: 0.6 + 0.4 * Math.sin(f / 3) }), who("n2", villager(7), 3.9, 63.6, { expr: "laugh", blink: 0, seed: 7, wave: 0.6 + 0.4 * Math.sin(f / 3 + 1) })] },
];

// ---------------- 3D shot renderer ----------------
const makeBloom = () => new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
const fwd = new THREE.Vector3();
const ShotInner: React.FC<{ k: number }> = ({ k }) => {
  const S = SHOTS[k], l = useCurrentFrame(), f = l + S.a;
  const { camera, scene } = useThree(); const cam = camera as THREE.PerspectiveCamera;
  const world = useMemo(() => new AyamWorld(), []); const cast = useMemo(() => new Cast(world), [world]);
  const fx = useMemo(() => ({ ink: new InkPass(scene, cam), lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }), bloom: makeBloom(), tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day) }), [scene, cam]);
  React.useEffect(() => () => InkPass.prototype.dispose.call(fx.ink), [fx]);
  const c = S.cam(l);
  cam.position.copy(c.pos); cam.up.set(0, 1, 0); cam.lookAt(c.look); cam.rotateZ(c.roll); cam.fov = c.fov; cam.near = 0.5; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.layers.enable(NOINK);
  const c0 = S.cam(0);
  world.setLight(cam, scene, { pos: c0.pos, look: c0.look }, c.look, cam.position.distanceTo(c.look), S.mood);
  gradeFor(fx.grade, S.mood === "golden" ? "golden" : "day"); world.flicker(f); world.setRain(cam, f);
  const st = S.setup(l, f);
  world.setWind(S.wind ? S.wind(l) : null);
  if (!S.wind) world.plots.forEach((p) => (p.o.visible = !!st.houses));
  if (!S.wind) world.coinPile.visible = !!st.coin;
  world.signs.forEach((o) => (o.visible = !!st.signs));
  world.coops.forEach((co, i) => { const n = st.coops ?? 0; co.visible = i < n; co.scale.setScalar(i < n ? 1 : 0.01); });
  world.ref.board.visible = !!st.board; if (st.board) { world.ref.board.position.set(st.board[0], 0, st.board[1]); world.setBoard(st.board[2]); world.ref.board.rotation.y = Math.atan2(cam.position.x - st.board[0], cam.position.z - st.board[1]) * 0.6; }
  world.ref.roast.visible = !!st.roast; if (st.roast) { world.ref.roast.position.copy(BF); world.ref.roast.scale.setScalar(0.62); world.ref.roast.children.forEach((ch, i) => { if (i >= 5) ch.rotation.x = f * 0.08; }); }
  world.ref.bones.visible = !!st.bones; if (st.bones) world.ref.bones.position.set(BF.x + 0.9, 0, BF.z + 0.9);
  world.ref.basket.visible = !!st.basket; if (st.basket) world.ref.basket.position.set(st.basket[0], 0, st.basket[1]);
  world.ref.protest.forEach((p) => (p.visible = false));
  world.ref.suv.visible = !!st.suv; if (st.suv) { world.ref.suv.position.set(st.suv[0], 0, st.suv[1]); world.ref.suv.rotation.y = st.suv[2]; }
  world.ref.dijual.visible = !!st.dijual; if (st.dijual) { world.ref.dijual.position.set(st.dijual[0], 0, st.dijual[1]); world.ref.dijual.rotation.y = Math.atan2(cam.position.x - st.dijual[0], cam.position.z - st.dijual[1]); }
  world.setCrack(0, 0, 0);
  cast.begin();
  for (const w of S.people(l, f)) cast.person(w, cam);
  for (const b of S.birds ? S.birds(l, f) : []) cast.bird(b, cam);
  (S.puffs ? S.puffs(l) : []).forEach(([x, y, z, t], i) => cast.fx("puff" + i + Math.round(t * 20), 300, 300, (p) => fxPuff(p, t), x, y, z, 0.9 + t, 0.9 + t, cam));
  cast.end();
  cam.getWorldDirection(fwd);
  fx.lens.focus = Math.max(0.3, S.focus(l).sub(cam.position).dot(fwd)); fx.lens.cInf = S.cInf;
  return (
    <>
      <primitive object={world.root} dispose={null} />
      <EffectComposer multisampling={4}>
        <primitive object={fx.ink} dispose={null} /><primitive object={fx.lens.pre} dispose={null} /><primitive object={fx.lens.main} dispose={null} />
        <primitive object={fx.bloom} dispose={null} /><primitive object={fx.tone} dispose={null} /><primitive object={fx.grade} dispose={null} />
      </EffectComposer>
    </>
  );
};

// ---------------- the Indonesia map at the end of beat 14 ----------------
const MAP_A = 2100; // map fades in over the crane-up
const CLS = [{ label: "Miskin & rentan miskin", pct: "33,3%", color: "#ff4d5e", at: T(71.85) }, { label: "Kelas menengah", pct: "66,3%", color: "#ffd23f", at: T(72.46) }, { label: "Kelas atas (kaya)", pct: "0,4%", color: "#2ee6a6", at: T(73.25) }];
const MapScene: React.FC<{ tex: THREE.Texture }> = ({ tex }) => {
  const l = useCurrentFrame(), f = l + MAP_A;
  const cam = useThree().camera as THREE.PerspectiveCamera;
  const u = ease(l / 55), lon = lerp(110.4, 119.6, u), lat = lerp(-7.25, -5.5, u), h = lerp(18, 128, u) - 2 * clamp01((l - 55) / 70);
  const tgt = GEO(lon, lat); cam.position.copy(tgt).add(V(0, h, h * 0.03)); cam.lookAt(tgt); cam.fov = 40; cam.near = 0.5; cam.far = 2000; cam.updateProjectionMatrix();
  const base = useMemo(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(110, 136), gradeMat(tex)); m.rotation.x = -Math.PI / 2; m.position.set(-7, 0, -23); return m; }, [tex]);
  const id = useMemo(() => buildCountry(COUNTRY.Indonesia, "#fff1c9", 40), []);
  setCountry(id, 999, f / 30);
  const un = (id.fill.material as THREE.ShaderMaterial).uniforms; un.opacity.value = 0.42;
  un.uSplit.value.set(clamp01((f - CLS[2].at) / 20), clamp01((f - CLS[1].at) / 20), clamp01((f - CLS[0].at) / 20));
  return (<><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}><planeGeometry args={[2000, 2000]} /><meshBasicMaterial color="#12304c" /></mesh><primitive object={base} /><primitive object={id.fill} /><primitive object={id.glow} /><primitive object={id.core} /></>);
};
export const MapPart: React.FC = () => {
  const tex = useTex(); const l = useCurrentFrame(), f = l + MAP_A;
  return (
    <AbsoluteFill style={{ background: "#03080d", opacity: clamp01(l / 14) }}>
      {tex ? <ThreeCanvas flat width={W} height={H} camera={{ fov: 40, near: 0.5, far: 2000 }}><MapScene tex={tex} /></ThreeCanvas> : null}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 65% at 50% 46%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.35) 100%)" }} />
      <div style={{ position: "absolute", left: 60, right: 60, top: 1250, fontFamily: FONT, background: "rgba(8,18,32,0.82)", borderRadius: 28, padding: "28px 34px", opacity: clamp01((f - CLS[0].at + 6) / 8) }}>
        {CLS.map((c) => { const on = clamp01((f - c.at) / 6); return (
          <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 20, opacity: 0.25 + 0.75 * on, margin: "8px 0" }}>
            <div style={{ width: 32, height: 32, borderRadius: 16, background: c.color, boxShadow: `0 0 ${16 * on}px ${c.color}` }} />
            <div style={{ flex: 1, fontSize: 38, fontWeight: 800, color: "#fff" }}>{c.label}</div>
            <div style={{ fontSize: 56, fontWeight: 900, color: c.color }}>{c.pct}</div>
          </div>); })}
        <div style={{ fontSize: 22, color: "rgba(255,255,255,0.5)", marginTop: 10 }}>Sumber: BPS 2024 (dikutip media)</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------- 2D overlays that the beats need ----------------
export const Timeline: React.FC = () => { // shot 12: BULAN 1 -> BULAN 6 -> TAHUN 2
  const l = useCurrentFrame(), f = l + 1405, marks = [T(47.21), T(48.55), T(49.92)], labels = ["BULAN 1", "BULAN 6", "TAHUN 2"];
  const k = marks.filter((m) => f >= m).length - 1; if (k < 0) return null;
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: 150, fontFamily: FONT, background: "rgba(255,255,255,0.82)", borderRadius: 30, padding: "18px 0 30px" }}>
      <div style={{ position: "relative", height: 110, margin: "0 70px" }}>
        <div style={{ position: "absolute", left: 40, right: 40, top: 40, height: 14, borderRadius: 7, background: "rgba(28,35,64,0.25)" }} />
        <div style={{ position: "absolute", left: 40, top: 40, height: 14, borderRadius: 7, width: `calc(${(k / 2).toFixed(3)} * (100% - 80px))`, background: "#1c2340" }} />
        {labels.map((t, i) => (<div key={t} style={{ position: "absolute", left: `calc(40px + ${i / 2} * (100% - 80px))`, top: 47, transform: "translate(-50%,-50%)" }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: i <= k ? "#2ee6a6" : "#fff", border: "6px solid #1c2340" }} />
          <div style={{ position: "absolute", top: 54, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", fontSize: 32, fontWeight: 900, color: i <= k ? "#1c2340" : "rgba(28,35,64,0.45)" }}>{t}</div></div>))}
      </div>
    </div>
  );
};
export const TinTin: React.FC = () => { const l = useCurrentFrame(); const s = Easing.out(Easing.back(3))(clamp01((l - 4) / 6));
  return <div style={{ position: "absolute", left: 0, right: 0, top: 330, textAlign: "center", fontFamily: FONT, fontWeight: 900, fontSize: 120, color: "#ffd23f", WebkitTextStroke: "8px #1c2340", transform: `scale(${s}) rotate(-6deg)`, textShadow: "0 8px 0 #1c2340" }}>TIN TIN!</div>; };

export const AyamShort: React.FC = () => (
  <AbsoluteFill style={{ background: "#9cbfea" }}>
    {SHOTS.map((S, k) => { const next = SHOTS[k + 1], tail = next?.xf ?? 0;
      return (
        <Sequence key={k} from={S.a} durationInFrames={S.b - S.a + tail}>
          <FadeIn frames={S.xf ?? 0}>
            <ThreeCanvas width={W} height={H} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 40, near: 0.5, far: 1500 }}>
              <ShotInner k={k} />
            </ThreeCanvas>
          </FadeIn>
          {k === 11 && <Timeline />}
          {k === 18 && <TinTin />}
        </Sequence>
      ); })}
    <Sequence from={MAP_A} durationInFrames={2222 - MAP_A}><MapPart /></Sequence>
  </AbsoluteFill>
);
const FadeIn: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => { const l = useCurrentFrame(); return <AbsoluteFill style={{ opacity: frames ? clamp01(l / frames) : 1 }}>{children}</AbsoluteFill>; };
