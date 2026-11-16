// Acting v2 for toon2 characters (reference study, docs/style-references/frame-by-frame-mine-salting.md, sections E-G).
// What the user asked for after v1 ("mouths always the same, eyes always the same, body/head never change"):
//   - MOODS set each eye and each brow separately (wink, squint + raised brow, angry tilted lids, sad lids ...)
//   - TALK STYLES per mood: every vowel has 2-3 mouth variants; each syllable picks one and varies width, side offset
//     and tilt, so speech never repeats the same shape; mouths pop (no tweening), like the reference
//   - the body acts: lean, spine bend, squash/stretch, breathing, per-syllable head bobs, stretch on stressed words,
//     beat gestures, weight shifts; arms (with elbows) and legs (with knees) move between named poses on springs
//   - events: shock (anticipation squash -> head pop past 1 -> settle; arms fly up; hat jumps, spins, lands squashed),
//     nod, fixhat; blinks cover every eye swap; eye darts hold then jump
import type { Brow, Eye, Limb, Mouth, Pose } from "./toon2";

export const FPS = 30;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const sm = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const noise = (t: number, seed: number) => Math.sin(t * 1.31 + seed * 7.1) * 0.5 + Math.sin(t * 2.17 + seed * 3.3) * 0.3 + Math.sin(t * 3.73 + seed * 1.7) * 0.2;
/** step response that overshoots and settles (0 before t0) */
export const spring = (t: number, t0: number, freq = 3, damp = 0.45) => { const x = t - t0; if (x <= 0) return 0; const w = 2 * Math.PI * freq; return 1 - Math.exp(-damp * w * x) * Math.cos(w * Math.sqrt(1 - damp * damp) * x); };
/** impulse: 0 -> peak -> wobble -> 0 */
export const kick = (t: number, t0: number, freq = 2.5, damp = 0.3) => { const x = t - t0; if (x <= 0) return 0; const w = 2 * Math.PI * freq; return Math.exp(-damp * w * x) * Math.sin(w * x); };
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

// ---------------- moods ----------------
export type TalkStyle = "normal" | "excited" | "angry" | "scared" | "whisper" | "laugh";
export type MoodDef = { eyes: [Eye, Eye]; brows: [Brow, Brow]; rest: Mouth; talk: TalkStyle; tilt: number; lean: number; energy: number; shake?: number;
  /** held head size while this mood lasts (measured: shouting expert f1055-1065 = +13 % wide, +28 % tall) */ headScale?: [number, number]; lift?: number };
const O = (lid = 0, extra: Partial<Eye> = {}): Eye => ({ kind: "open", lid, ...extra });
const B = (dy: number, ang: number, arch = 0): Brow => ({ dy, ang, arch });
export const MOODS: Record<string, MoodDef> = {
  neutral: { eyes: [O(0.1), O(0.1)], brows: [B(0, 0.05), B(0, 0.05)], rest: { kind: "pout", open: 0 }, talk: "normal", tilt: 0, lean: 0, energy: 1 },
  story: { eyes: [{ kind: "big" }, { kind: "big" }], brows: [B(-0.05, 0.28, 0.02), B(-0.05, 0.28, 0.02)], rest: { kind: "o", open: 0.2 }, talk: "normal", tilt: 0.04, lean: 0.03, energy: 1.4 },
  worried: { eyes: [O(0.28, { lidAng: -0.3 }), O(0.28, { lidAng: -0.3 })], brows: [B(0.01, 0.45), B(0.01, 0.45)], rest: { kind: "wavy", open: 0 }, talk: "normal", tilt: -0.05, lean: 0.04, energy: 0.9 },
  suspicious: { eyes: [O(0.52, { low: 0.28, lidAng: 0.15 }), O(0.18)], brows: [B(0.05, -0.3), B(-0.09, 0.08, 0.035)], rest: { kind: "pout", open: 0, dx: 0.05 }, talk: "normal", tilt: 0.08, lean: -0.02, energy: 0.7 },
  surprised: { eyes: [{ kind: "round" }, { kind: "round" }], brows: [B(-0.1, 0.1, 0.05), B(-0.1, 0.1, 0.05)], rest: { kind: "talkO", open: 0.35 }, talk: "normal", tilt: -0.03, lean: -0.03, energy: 1.2, headScale: [1.03, 1.08], lift: 0.12 },
  shock: { eyes: [{ kind: "shock" }, { kind: "shock" }], brows: [B(-0.12, 0.15, 0.06), B(-0.12, 0.15, 0.06)], rest: { kind: "zigzag", open: 0.6 }, talk: "scared", tilt: 0, lean: -0.05, energy: 1.5, shake: 1 },
  scared: { eyes: [{ kind: "shock", size: 0.85 }, { kind: "shock", size: 0.85 }], brows: [B(-0.06, 0.5), B(-0.06, 0.5)], rest: { kind: "zigzag", open: 0.2 }, talk: "scared", tilt: -0.04, lean: -0.03, energy: 1.3, shake: 0.7, headScale: [1.04, 1.1], lift: 0.1 },
  nervous: { eyes: [O(0, { size: 0.88 }), O(0, { size: 0.88 })], brows: [B(-0.04, 0.58, 0.02), B(-0.04, 0.58, 0.02)], rest: { kind: "clench", open: 0 }, talk: "scared", tilt: 0.03, lean: 0.02, energy: 1.1, shake: 0.35 },
  whisper: { eyes: [O(0.36, { lidAng: 0.1 }), O(0.3, { lidAng: 0.1 })], brows: [B(0.03, -0.12), B(-0.03, 0.2)], rest: { kind: "m", open: 0 }, talk: "whisper", tilt: 0.1, lean: 0, energy: 0.6 },
  excited: { eyes: [{ kind: "big" }, { kind: "big" }], brows: [B(-0.07, 0.05, 0.04), B(-0.07, 0.05, 0.04)], rest: { kind: "smileBig", open: 0.3 }, talk: "excited", tilt: 0.05, lean: 0, energy: 1.5, headScale: [1.06, 1.12], lift: 0.08 },
  smug: { eyes: [O(0.5), O(0.5)], brows: [B(-0.06, 0, 0.03), B(0.02, -0.1)], rest: { kind: "smirk", open: 0, dx: 0.06 }, talk: "normal", tilt: 0.07, lean: -0.03, energy: 0.8 },
  angry: { eyes: [O(0.42, { lidAng: 0.38 }), O(0.42, { lidAng: 0.38 })], brows: [B(0.05, -0.45), B(0.05, -0.45)], rest: { kind: "frown", open: 0 }, talk: "angry", tilt: -0.02, lean: 0.05, energy: 1.3, headScale: [1.13, 1.28], lift: 0.12 },
  laugh: { eyes: [{ kind: "happy" }, { kind: "happy" }], brows: [B(-0.04, -0.2), B(-0.04, -0.2)], rest: { kind: "laugh", open: 0.8 }, talk: "laugh", tilt: -0.08, lean: -0.05, energy: 1.6 },
  wink: { eyes: [{ kind: "happy" }, O(0)], brows: [B(0.04, 0), B(-0.08, 0.05, 0.03)], rest: { kind: "smirk", open: 0, dx: 0.08 }, talk: "normal", tilt: 0.08, lean: 0, energy: 1 },
};
export type MoodName = "neutral" | "story" | "worried" | "suspicious" | "surprised" | "shock" | "scared" | "nervous" | "whisper" | "excited" | "smug" | "angry" | "laugh" | "wink";

// ---------------- talk: syllables -> mouth variants ----------------
export type Word = { w: string; t0: number; t1: number; stress?: boolean; accent?: "head" | "body" | "both" };
type V = Mouth;
const TALK: Record<TalkStyle, { a: V[]; e: V[]; o: V[]; c: V[] }> = {
  normal: { a: [{ kind: "stadium", open: 0.9 }, { kind: "stadium", open: 1.1, w: 1.1 }, { kind: "talkD", open: 0.9 }],
    e: [{ kind: "wide", open: 0.5, w: 0.9 }, { kind: "talkD", open: 0.45, w: 0.95 }, { kind: "smileBig", open: 0.1, w: 0.75 }],
    o: [{ kind: "stadium", open: 0.55, w: 0.7 }, { kind: "oo", open: 0 }], c: [{ kind: "stadium", open: 0.15, w: 0.8 }, { kind: "pout", open: 0 }, { kind: "line", open: 0, w: 0.8 }] },
  excited: { a: [{ kind: "smileBig", open: 0.9 }, { kind: "laugh", open: 0.6, w: 0.9 }, { kind: "talkD", open: 1.15, w: 1.2 }],
    e: [{ kind: "smileBig", open: 0.35 }, { kind: "wide", open: 0.7, w: 1.1 }], o: [{ kind: "talkO", open: 0.95, w: 1.1 }], c: [{ kind: "smileBig", open: 0.1, w: 0.85 }, { kind: "wide", open: 0.2 }] },
  angry: { a: [{ kind: "talkD", open: 1.15, w: 0.95 }, { kind: "wide", open: 0.9, w: 0.95 }], e: [{ kind: "clench", open: 0, w: 1.05 }, { kind: "wide", open: 0.45 }],
    o: [{ kind: "talkO", open: 0.6, w: 0.8 }], c: [{ kind: "clench", open: 0, w: 0.85 }] },
  scared: { a: [{ kind: "zigzag", open: 0.9 }, { kind: "talkO", open: 0.95, w: 0.9 }], e: [{ kind: "zigzag", open: 0.35 }, { kind: "clench", open: 0 }],
    o: [{ kind: "talkO", open: 0.7, w: 0.75 }], c: [{ kind: "zigzag", open: 0.15, w: 0.85 }, { kind: "wavy", open: 0 }] },
  whisper: { a: [{ kind: "o", open: 0.6, w: 1.2 }, { kind: "talkD", open: 0.3, w: 0.7 }], e: [{ kind: "line", open: 0, w: 0.6 }, { kind: "wide", open: 0.15, w: 0.6 }],
    o: [{ kind: "oo", open: 0 }], c: [{ kind: "m", open: 0 }, { kind: "o", open: 0.1, w: 0.8 }] },
  laugh: { a: [{ kind: "laugh", open: 1.1 }, { kind: "laugh", open: 0.8, w: 1.1 }], e: [{ kind: "laugh", open: 0.6 }, { kind: "smileBig", open: 0.8 }], o: [{ kind: "laugh", open: 0.9 }], c: [{ kind: "smileBig", open: 0.5 }] },
};
const syllables = (w: string) => {
  const s = w.toLowerCase().replace(/[^a-z]/g, ""), out: { c: string; v: string }[] = []; let c = "";
  for (let i = 0; i < s.length; i++) { const ch = s[i]; if ("aiueo".includes(ch)) { let v = ch; while (i + 1 < s.length && "aiueo".includes(s[i + 1])) v += s[++i]; out.push({ c, v }); c = ""; } else c += ch; }
  return { units: out.length ? out : [{ c: s, v: "a" }], tail: c };
};
/** mouth while speaking at t (or null when silent); also reports syllable onsets for the body beats */
export const speechAt = (words: Word[], t: number, style: TalkStyle, seed: number, size = 1): { mouth: Mouth | null; sinceSyl: number; stressT: number | null } => {
  const wi = words.findIndex((x) => t >= x.t0 && t < x.t1);
  const lastStress = [...words].reverse().find((x) => x.stress && x.t0 <= t);
  const stressT = lastStress ? lastStress.t0 : null;
  if (wi < 0) {
    const prev = [...words].reverse().find((x) => x.t1 <= t);
    if (prev && t - prev.t1 < 2 / FPS) return { mouth: { kind: "o", open: 0.15 }, sinceSyl: 9, stressT }; // closing
    return { mouth: null, sinceSyl: 9, stressT };
  }
  const w = words[wi], { units, tail } = syllables(w.w), n = units.length, u = (t - w.t0) / (w.t1 - w.t0), k = Math.min(n - 1, Math.floor(u * n));
  const local = u * n - k, unit = units[k], set = TALK[style], h = hash(seed * 31 + wi * 7 + k * 3);
  const sinceSyl = (local * (w.t1 - w.t0)) / n;
  const cons = unit.c.slice(-1), closing = k === n - 1 && tail && local > 0.8 ? tail.slice(-1) : "";
  let pick: V;
  const lip = (ch: string) => "mbp".includes(ch);
  if ((cons && local < 0.25) || closing) { const ch = closing || cons; pick = lip(ch) ? { kind: "m", open: 0 } : set.c[Math.floor(h * set.c.length)]; }
  else { const v = unit.v[0], list = v === "a" ? set.a : v === "e" || v === "i" ? set.e : set.o; pick = list[Math.floor(h * list.length)]; }
  const stress = w.stress ? 1.18 : 1, jit = 0.85 + 0.3 * hash(Math.floor((t * FPS) / 2) + seed);
  return { mouth: { ...pick, open: pick.open * stress * jit * size, w: (pick.w ?? 1) * (0.9 + 0.2 * hash(h * 13)) * (0.8 + 0.2 * size), dx: (hash(h * 7) - 0.5) * 0.09, tilt: (hash(h * 5) - 0.5) * 0.2 }, sinceSyl, stressT };
};

// ---------------- named limb poses (right side; left is mirrored) ----------------
const ARM: Record<string, Limb> = {
  rest: { a: [16, 92], b: [20, 182] }, hip: { a: [88, 52], b: [26, 128] }, chest: { a: [28, 98], b: [-72, 52] },
  open: { a: [78, 58], b: [128, 2] }, point: { a: [92, 8], b: [188, -36] }, up: { a: [102, -52], b: [108, -165] },
  clasp: { a: [44, 104], b: [-40, 116] }, hug: { a: [22, 84], b: [-98, 28] }, chin: { a: [34, 100], b: [-40, -62] },
  mouthHand: { a: [62, 30], b: [-28, -98] }, fixhat: { a: [105, -100], b: [28, -228] }, shrug: { a: [74, 40], b: [98, -38] },
};
export type ArmName = "rest" | "hip" | "chest" | "open" | "point" | "up" | "clasp" | "hug" | "chin" | "mouthHand" | "fixhat" | "shrug";
const LEG: Record<string, Limb> = { stand: { a: [5, 118], b: [0, 0] }, wide: { a: [26, 116], b: [28, 0] }, bent: { a: [18, 104], b: [6, 0] }, tiptoe: { a: [4, 120], b: [2, -14] }, sit: { a: [16, 22], b: [10, -150] } };
export type LegName = "stand" | "wide" | "bent" | "tiptoe" | "sit";
const mirror = (L: Limb, s: number): Limb => ({ a: [L.a[0] * s, L.a[1]], b: [L.b[0] * s, L.b[1]] });

// ---------------- timeline ----------------
export type Beat = {
  t: number; mood?: MoodName; arms?: [ArmName, ArmName]; legs?: [LegName, LegName]; lean?: number; bend?: number;
  turn?: number; look?: [number, number] | "dart"; sweat?: boolean; nod?: number; talkSize?: number;
  event?: "shock" | "shockSmall";
};
export type Actor = { seed: number; words: Word[]; beats: Beat[] };
type St = { t: number; mood: MoodName; arms: [ArmName, ArmName]; legs: [LegName, LegName]; lean: number; bend: number; turn: number; look: [number, number] | "dart"; sweat: boolean; nod: number; talkSize: number };
const resolveCache = new WeakMap<Actor, St[]>();
const resolve = (A: Actor): St[] => {
  const c = resolveCache.get(A); if (c) return c;
  let s: St = { t: 0, mood: "neutral", arms: ["rest", "rest"], legs: ["stand", "stand"], lean: 0, bend: 0, turn: 0, look: [0, 0], sweat: false, nod: 0, talkSize: 1 };
  const out = A.beats.map((b) => { const { event: _e, ...rest } = b; void _e; s = { ...s, ...rest }; return s; });
  resolveCache.set(A, out); return out;
};
const eyeMix = (a: Eye, b: Eye, u: number): Eye => (a.kind !== b.kind ? b : { ...b, lid: lerp(a.lid ?? 0, b.lid ?? 0, u), low: lerp(a.low ?? 0, b.low ?? 0, u), lidAng: lerp(a.lidAng ?? 0, b.lidAng ?? 0, u), size: lerp(a.size ?? 1, b.size ?? 1, u) });
const browMix = (a: Brow, b: Brow, u: number): Brow => ({ dy: lerp(a.dy, b.dy, u), ang: lerp(a.ang, b.ang, u), arch: lerp(a.arch ?? 0, b.arch ?? 0, u) });
const limbMix = (a: Limb, b: Limb, u: number): Limb => ({ a: [lerp(a.a[0], b.a[0], u), lerp(a.a[1], b.a[1], u)], b: [lerp(a.b[0], b.b[0], u), lerp(a.b[1], b.b[1], u)] });
const blinkShape = (x: number) => (x < 0 || x >= 4 / FPS ? 0 : [0.55, 1, 1, 0.55][Math.floor(x * FPS + 1e-6)]);
export const dartAt = (t: number, seed: number, range = 0.8): [number, number] => {
  let tt = 0, i = 0, x = 0, y = 0;
  while (i < 400) { const hold = 0.45 + hash(seed * 3 + i) * 1.0; if (tt + hold > t) break; tt += hold; i++; x = (hash(seed + i * 5.3) * 2 - 1) * range; y = (hash(seed + i * 9.1) * 2 - 1) * range * 0.4; }
  return [x, y];
};

/** the full pose of an actor at time t (seconds) */
export const actAt = (A: Actor, t: number, x = 300): Pose => {
  const S = resolve(A);
  let i = 0; for (let k = 0; k < S.length; k++) if (S[k].t <= t) i = k;
  const cur = S[i], prev = S[Math.max(0, i - 1)], ue = i === 0 ? 1 : sm((t - cur.t) / (4 / FPS));
  // pose-to-pose like the reference (Spot f35-50, measured with scripts/bodytrack.py): ANTICIPATION 5 f (the body
  // crouches: height to ~84 %, a touch wider, leans a bit the wrong way) -> MOVE 5 f (eases out into the new pose while
  // stretching: height ~108 %, width ~85 %) -> SETTLE 6 f -> HOLD dead still. No springy overshoot, no idle wobble.
  const isEvent = !!A.beats[i]?.event; // a shock lands instantly: no anticipation, short move
  // corrected 2026-11-14 after reading standing characters (rich f1120-1155, expert f1043-1066): bodies stay upright and
  // nearly rigid; pose changes ease over ~6 frames with no anticipation squash and no overshoot, then hold
  const ANT = 0, MOV = isEvent ? 3 / FPS : 6 / FPS, SET = 0, tr = i === 0 ? 9 : t - cur.t; void SET;
  const moved = i > 0 && (prev.lean !== cur.lean || prev.bend !== cur.bend || prev.arms.join() !== cur.arms.join() || prev.legs.join() !== cur.legs.join() || MOODS[prev.mood].lean !== MOODS[cur.mood].lean);
  const mag = moved ? Math.min(1, 0.5 + 6 * Math.abs(cur.lean - prev.lean + MOODS[cur.mood].lean - MOODS[prev.mood].lean) + Math.abs(cur.bend - prev.bend) / 25) : 0;
  const eo = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
  const u = i === 0 ? 1 : sm(tr / MOV);
  const crouch = 0 * mag * (tr < ANT ? sm(tr / ANT) : tr < ANT + MOV ? 1 - sm((tr - ANT) / MOV) : 0);
  const stretch = 0 * mag * (tr < ANT || tr > ANT + MOV + SET ? 0 : Math.sin(Math.PI * Math.min(1, (tr - ANT) / (MOV + SET))));
  const lagA = isEvent ? 0 : 1 / FPS, uArm = i === 0 ? 1 : tr < lagA ? 0 : sm((tr - lagA) / (5 / FPS)); // arms: ~5 frames, then hold // arms follow 2 frames behind the body
  const Mc = MOODS[cur.mood], Mp = MOODS[prev.mood];
  const ev = [...A.beats].reverse().find((b) => b.event && b.t <= t + 3 / FPS), evT = ev ? ev.t : -99, big = ev?.event === "shock" ? 1 : 0.55;
  const since = t - evT;
  // ---- speech ----
  const sp = speechAt(A.words, t, Mc.talk, A.seed, cur.talkSize);
  const speaking = A.words.some((w) => t >= w.t0 && t < w.t1);
  const mouth: Mouth = sp.mouth ?? { ...Mc.rest, open: Mc.rest.open * (0.9 + 0.1 * Math.sin(t * 3)) };
  // ---- eyes: mood (springy lids), blinks covering swaps, darts ----
  const swapCover = A.beats.filter((b, k) => k > 0 && b.mood && !b.event && (MOODS[b.mood].eyes[0].kind !== MOODS[S[k - 1].mood].eyes[0].kind || MOODS[b.mood].eyes[1].kind !== MOODS[S[k - 1].mood].eyes[1].kind)).map((b) => b.t - 1 / FPS);
  let blink = 0;
  for (const f of swapCover) blink = Math.max(blink, blinkShape(t - f));
  if (since > 0.7 || since < -0.2) { let tt = 0.5 + hash(A.seed) * 1.4, k = 0; while (tt <= t + 0.01 && k < 200) { blink = Math.max(blink, blinkShape(t - tt)); tt += 1.6 + hash(A.seed * 7 + k) * 2.6; k++; } }
  const look: [number, number] = cur.look === "dart" ? dartAt(t, A.seed, 1) : [cur.look[0], cur.look[1]];
  const eyes = [0, 1].map((k) => {
    const e = eyeMix(Mp.eyes[k], Mc.eyes[k], ue);
    const out: Eye = { ...e, px: look[0] + 0.0 * k, py: look[1] };
    if (blink > 0 && (e.kind === "open" || e.kind === "big" || e.kind === "sad" || e.kind === "round" || e.kind === "shock")) out.lid = Math.max(e.lid ?? 0, blink >= 1 ? 1 : 0.55);
    if (out.lid !== undefined && out.lid >= 0.95 && e.kind !== "open" && e.kind !== "big") return { kind: "closed" } as Eye;
    return out;
  }) as [Eye, Eye];
  // ---- brows: spring between moods + lift on stressed words + tiny life ----
  const sinceStress = sp.stressT !== null ? t - sp.stressT : 9, stressK = sinceStress < 0.35 ? Math.sin((sinceStress / 0.35) * Math.PI) : 0;
  // accent (reference Spot f1-13, f37-47; Kyle f158-164): attack in 2 frames, then eases back over ~10 frames with a small overshoot
  const stressW = [...A.words].reverse().find((x) => x.stress && x.t0 <= t);
  const target = stressW?.accent ?? "head"; // measured: accents are almost always head-only
  const aH = target === "body" ? 0 : 1, aB = target === "head" ? 0 : 1;
  /* measured accents (scripts/bodytrack.py):
   - talk stress, head only (Kyle f157-164): squash +6 % wide / -5 % tall, 2 frames in, hold 1, 4 frames out
   - strong stress (excited/angry/scared moods): stretch pop in ONE frame (+6 % wide, +13 % tall, head up) then 6 frames out */
  const sq = sinceStress < 0 ? 0 : sinceStress < 2 / FPS ? sm(sinceStress / (2 / FPS)) : sinceStress < 3 / FPS ? 1 : sinceStress < 7 / FPS ? 1 - sm((sinceStress - 3 / FPS) / (4 / FPS)) : 0;
  const strong = Mc.energy >= 1.3, popA = sinceStress < 0 ? 0 : sinceStress < 1 / FPS ? 1 : sinceStress < 7 / FPS ? 1 - sm((sinceStress - 1 / FPS) / (6 / FPS)) : 0;
  const hSX = strong ? 1 + 0.06 * popA : 1 + 0.06 * sq, hSY = strong ? 1 + 0.13 * popA : 1 - 0.05 * sq;
  const ATT = 1 / FPS, accent = sinceStress < 0 || sinceStress > 0.8 ? 0 : sinceStress < ATT ? sinceStress / ATT : Math.exp(-(sinceStress - ATT) / 0.07); // reference expert f1053->1055: pops in ONE frame, back in ~3 frames
  const brows = [0, 1].map((k) => { const b = browMix(Mp.brows[k], Mc.brows[k], ue); return { ...b, dy: b.dy - 0.045 * stressK }; }) as [Brow, Brow];
  // ---- body ----
  const E = lerp(Mp.energy, Mc.energy, ue), breath = 0; void E;
  const sylBob = 0; // reference: the head stays calm while talking, only the mouth moves
  const pop = since > 0 ? kick(t, evT, 2.4, 0.26) * big : 0, antic = since > -3 / FPS && since <= 0 ? sm((since + 3 / FPS) / (3 / FPS)) * big : 0;
  const nodK = cur.nod ? Math.max(0, Math.sin(t * Math.PI * 2 * 2.1)) * cur.nod : 0;
  const holdLean = (k: number) => (hash(A.seed * 5 + k * 3) - 0.5) * 0.1;
  const lean = holdLean(i - 1) + (holdLean(i) - holdLean(i - 1)) * u + lerp(prev.lean + Mp.lean, cur.lean + Mc.lean, u) - 0.07 * pop + 0.03 * sq * aB;
  const bend = lerp(prev.bend, cur.bend, u) + 25 * pop;
  const bodySy = 1 + 0.02 * sq * aB - 0.09 * antic + 0.14 * pop - 0.02 * sylBob;
  const holdTilt = (k: number) => (hash(A.seed * 11 + k) - 0.5) * 0.1; // each beat holds its own small tilt (+-3 deg)
  const tilt = lerp(Mp.tilt + holdTilt(i - 1), Mc.tilt + holdTilt(i), Math.max(0, u)) + 0.05 * pop;
  const headS = 1 + 0.3 * pop - 0.08 * antic;
  const hold = sm((t - cur.t) / (10 / FPS)), msA = Mp.headScale ?? [1, 1], msB = Mc.headScale ?? [1, 1];
  const moodSX = lerp(msA[0], msB[0], hold), moodSY = lerp(msA[1], msB[1], hold), lift = lerp(Mp.lift ?? 0, Mc.lift ?? 0, sm((t - cur.t) / (2 / FPS)));
  const shake = since > 0 && since < 0.6 ? (1 - since / 0.6) * (Mc.shake ?? 0) : 0, sh2 = (Math.floor(t * FPS / 2) % 2 ? 1 : -1) * shake * (0.7 + 0.3 * hash(Math.floor(t * FPS / 2)));
  // ---- limbs ----
  const arms = [0, 1].map((k) => {
    const s = k ? 1 : -1, L = limbMix(mirror(ARM[prev.arms[k]], s), mirror(ARM[cur.arms[k]], s), uArm);
    // in-between: the hand swings OUT around the body/face instead of cutting across it
    const A0 = mirror(ARM[prev.arms[k]], s), A1 = mirror(ARM[cur.arms[k]], s), dist = Math.hypot(A1.b[0] - A0.b[0], A1.b[1] - A0.b[1]), arc = Math.sin(Math.PI * clamp01(u)) * dist * 0.4 * (prev.arms[k] === cur.arms[k] ? 0 : 1);
    L.b[0] += s * arc; L.a[0] += s * arc * 0.6;
    const gest = 0; // holds are still in the reference
    const flick = -14 * accent * (cur.arms[k] === "open" || cur.arms[k] === "point" ? 1 : 0.3);
    return { a: [L.a[0] + gest * 0.5, L.a[1] + gest * 0.4], b: [L.b[0] + gest, L.b[1] + gest * 0.8 + flick] } as Limb;
  }) as [Limb, Limb];
  const legs = [0, 1].map((k) => { const s = k ? 1 : -1, L = limbMix(mirror(LEG[prev.legs[k]], s), mirror(LEG[cur.legs[k]], s), u); const shift = 0; return { a: [L.a[0] + shift, L.a[1] - Math.abs(shift) * 0.5], b: L.b } as Limb; }) as [Limb, Limb];
  // ---- hat: lags the head, jumps on shock, lands crooked until fixed ----
  const tiltLag = lerp(Mp.tilt + holdTilt(i - 1), Mc.tilt + holdTilt(i), Math.max(0, u - 0.25)); // the hat follows the head tilt a few frames late
  const jump = ev?.event === "shock" && since > 0 && since < 0.62 ? Math.sin((since / 0.62) * Math.PI) : 0;
  const land = ev?.event === "shock" && since > 0.62 ? kick(t, evT + 0.62, 4, 0.33) : 0;
  const fixing = cur.arms[1] === "fixhat" || cur.arms[0] === "fixhat";
  const crooked = ev?.event === "shock" && since > 0.62 && !fixing ? 0.22 : fixing ? 0.22 * (1 - sm((t - cur.t - 0.25) / 0.3)) : 0;
  return {
    x, bob: 14 * crouch + 10 * antic - 8 * pop + 2 * nodK,
    body: { lean, bend, sx: 1 + 0.06 * antic - 0.05 * pop, sy: bodySy },
    head: { dx: 3.5 * sh2, dy: 16 * nodK - 30 * pop + 12 * antic - 11 * popA * (strong ? 1 : 0) * aH - lift * 140, rot: tilt, sx: headS * moodSX * (aH ? hSX : 1), sy: headS * moodSY * (aH ? hSY : 1), turn: lerp(prev.turn, cur.turn, clamp01(u)) },
    eyes: eyes.map((e) => ({ ...e, px: (e.px ?? 0) + 0.12 * sh2 })) as [Eye, Eye], brows, mouth: { ...mouth, open: mouth.open * (1 + 0.15 * sh2), dx: (mouth.dx ?? 0) + 0.01 * sh2 }, arms, legs,
    hat: { dx: 0, dy: -120 * jump + 4 * accent, rot: (tilt - tiltLag) * 1.5 + 0.9 * jump * (hash(evT) > 0.5 ? 1 : -1) + crooked, sy: 1 - 0.3 * land + 0.08 * stressK },
    sweat: cur.sweat ? (t * 0.9) % 1 : undefined,
  };
};
