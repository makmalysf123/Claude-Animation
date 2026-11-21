// Test 2026-11-18: 2D cut-out fighters as black silhouettes (the user's idea: one drawing made of shapes, only the
// parts move). Every body part is a few circles/ellipses/capsules pinned to a 2D skeleton; because all of it is the same
// black, the joints melt together. Same beats and timing as FightTest (so audio/fight_audio.py fits): Red (boxer, red
// gloves) bounces, winds up, throws an overhand hook; Blue (taekwondo, blue belt) gets hit, staggers back, kneels.
// Animated "on twos" (12 drawings a second) like hand-drawn 2D; the impact itself runs on ones with inverted frames.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

export const SIL_FRAMES = 112;
const FPS = 30, W = 1080, G = 1560, S = 520, OX = 540 - 0.2 * S; // px per metre, ground line, world origin
const T_LOAD = 0.95, T_SWING = 1.13, T_IMP = 1.27, HS = 0.1, D = 0.84; // D = Red's distance from Blue
const tm = (t: number) => (t < T_IMP ? t : t < T_IMP + HS ? T_IMP : t - HS);

type P = [number, number];
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]], sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]], mul = (a: P, k: number): P => [a[0] * k, a[1] * k];
const dot = (a: P, b: P) => a[0] * b[0] + a[1] * b[1], len = (a: P) => Math.hypot(a[0], a[1]), norm = (a: P): P => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
const u = (a: number): P => [Math.sin(a), Math.cos(a)], fw = (a: number): P => [Math.cos(a), -Math.sin(a)]; // up / forward of a body part leaning by a
const clamp01 = (x: number) => Math.min(1, Math.max(0, x)), sm = (x: number) => { const v = clamp01(x); return v * v * (3 - 2 * v); };
const at = (t: number, a: number, b: number) => sm((t - a) / (b - a));
const eIn = (x: number) => x * x * x, eOut = (x: number) => 1 - (1 - x) ** 2;

// ---------------- poses ----------------
type Pose = { hip: P; lean: number; chest: number; head: number; hN: P; hF: P; fN: P; fF: P; tN: number; tF: number; pN: P; pF: P };
type Key = [number, Partial<Pose>, ((x: number) => number)?];
const lp = (a: number, b: number, k: number) => a + (b - a) * k, lP = (a: P, b: P, k: number): P => [lp(a[0], b[0], k), lp(a[1], b[1], k)];
const mixPose = (A: Pose, B: Pose, k: number): Pose => ({ hip: lP(A.hip, B.hip, k), lean: lp(A.lean, B.lean, k), chest: lp(A.chest, B.chest, k), head: lp(A.head, B.head, k), hN: lP(A.hN, B.hN, k), hF: lP(A.hF, B.hF, k),
  fN: lP(A.fN, B.fN, k), fF: lP(A.fF, B.fF, k), tN: lp(A.tN, B.tN, k), tF: lp(A.tF, B.tF, k), pN: lP(A.pN, B.pN, k), pF: lP(A.pF, B.pF, k) });
/** keys hold only what changes; each key inherits the rest from the one before. The ease belongs to the segment ending at that key */
const timeline = (base: Pose, keys: Key[]) => { let cur = base; const full = keys.map(([t, p, e]) => { cur = { ...cur, ...p }; return [t, cur, e ?? sm] as [number, Pose, (x: number) => number]; });
  return (t: number) => { if (t <= full[0][0]) return full[0][1]; for (let i = 1; i < full.length; i++) if (t < full[i][0]) { const [a, A] = full[i - 1], [b, B, e] = full[i]; return mixPose(A, B, e(clamp01((t - a) / (b - a)))); } return full[full.length - 1][1]; }; };

// ---------------- skeleton ----------------
const ik = (s: P, t: P, l1: number, l2: number, pole: P): [P, P] => {
  const v = sub(t, s), d = Math.min(Math.max(len(v), Math.abs(l1 - l2) + 1e-3), l1 + l2 - 1e-4), dir = norm(v), a = (l1 * l1 + d * d - l2 * l2) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  let n: P = [-dir[1], dir[0]]; if (dot(n, pole) < 0) n = mul(n, -1); return [add(add(s, mul(dir, a)), mul(n, h)), add(s, mul(dir, d))];
};
type Rig = ReturnType<typeof rig>;
const rig = (p: Pose) => {
  const H = p.hip, A = add(H, mul(u(p.lean), 0.24)), c = p.lean + p.chest, N = add(A, mul(u(c), 0.27)), Sh = add(A, mul(u(c), 0.2)), hd = c + p.head;
  const NT = add(N, mul(u(c + p.head * 0.4), 0.06)), HC = add(add(NT, mul(u(hd), 0.1)), mul(fw(hd), 0.015));
  const [EN, WN] = ik(Sh, p.hN, 0.29, 0.27, p.pN), [EF, WF] = ik(add(Sh, mul(fw(c), -0.02)), p.hF, 0.29, 0.27, p.pF);
  const [KN, AN] = ik(H, p.fN, 0.44, 0.43, [1, 0.12]), [KF, AF] = ik(add(H, [-0.02, 0]), p.fF, 0.44, 0.43, [1, 0.12]);
  return { p, H, A, c, N, Sh, hd, NT, HC, EN, WN, EF, WF, KN, AN, KF, AF };
};
const gloveC = (E: P, Wr: P) => add(Wr, mul(norm(sub(Wr, E)), 0.075));

// ---------------- shapes (metres, y up) ----------------
let kk = 0;
const circ = (c: P, r: number) => <circle key={kk++} cx={c[0]} cy={c[1]} r={r} />;
const ell = (c: P, rx: number, ry: number, ang: number) => <ellipse key={kk++} cx={c[0]} cy={c[1]} rx={rx} ry={ry} transform={`rotate(${(ang * 180) / Math.PI} ${c[0]} ${c[1]})`} />;
const caps = (a: P, b: P, ra: number, rb: number) => { const n0 = norm(sub(b, a)), n: P = [-n0[1], n0[0]], q = [add(a, mul(n, ra)), add(b, mul(n, rb)), add(b, mul(n, -rb)), add(a, mul(n, -ra))];
  return [<polygon key={kk++} points={q.map((x) => x.join(",")).join(" ")} />, circ(a, ra), circ(b, rb)]; };
const segEll = (a: P, b: P, f: number, n: P, off: number, rx: number, ry: number) => { const d = sub(b, a); return ell(add(lP(a, b, f), mul(n, off)), rx, ry, Math.atan2(d[1], d[0])); };
const perpTo = (d: P, v: P): P => { const w = sub(v, mul(d, dot(v, d))); return len(w) < 1e-4 ? [-d[1], d[0]] : norm(w); };
/** side of segment 2 that faces the inside of the joint (biceps, calf...) */
const flexSide = (d1: P, d2: P, def: P): P => { const v = sub(mul(d1, -1), mul(d2, dot(mul(d1, -1), d2))); return len(v) < 0.12 ? perpTo(d2, def) : norm(v); };

const armShapes = (Sh: P, E: P, Wr: P, gloves: boolean) => {
  const d1 = norm(sub(E, Sh)), d2 = norm(sub(Wr, E)), inn = perpTo(d1, d2), fs = flexSide(d1, d2, [1, 0.3]);
  const out = [circ(Sh, 0.066), segEll(Sh, E, 0.18, [0, 0], 0, 0.1, 0.068), ...caps(Sh, E, 0.054, 0.042), segEll(Sh, E, 0.52, inn, 0.02, 0.105, 0.046), segEll(Sh, E, 0.46, mul(inn, -1), 0.017, 0.1, 0.043),
    ...caps(E, Wr, 0.046, 0.032), segEll(E, Wr, 0.3, fs, 0.012, 0.095, 0.048)];
  if (!gloves) out.push(ell(add(Wr, mul(d2, 0.045)), 0.052, 0.043, Math.atan2(d2[1], d2[0])));
  return out;
};
const gloveShapes = (E: P, Wr: P) => { const d = norm(sub(Wr, E)), c = gloveC(E, Wr), n: P = [-d[1], d[0]];
  return [...caps(sub(Wr, mul(d, 0.02)), add(Wr, mul(d, 0.02)), 0.047, 0.05), ell(c, 0.088, 0.074, Math.atan2(d[1], d[0])), ell(add(c, mul(n, 0.05)), 0.045, 0.03, Math.atan2(d[1], d[0]) - 0.4)]; };
const legShapes = (H: P, K: P, Ak: P, toe: number) => {
  const d1 = norm(sub(K, H)), d2 = norm(sub(Ak, K)), back = flexSide(d1, d2, [-1, 0]), front1 = perpTo(d1, [1, 0]);
  const heel = add(Ak, [-0.035, -0.045]), minS = Math.max(-1, Math.min(1, (0.014 - heel[1]) / 0.235)); // the toe never goes under the floor
  const ta = Math.sin(toe) >= minS ? toe : Math.cos(toe) >= 0 ? Math.asin(minS) : Math.PI - Math.asin(minS), tip = add(heel, mul([Math.cos(ta), Math.sin(ta)], 0.235));
  return [...caps(H, K, 0.092, 0.058), segEll(H, K, 0.42, front1, 0.024, 0.2, 0.07), segEll(H, K, 0.5, mul(front1, -1), 0.02, 0.18, 0.06), circ(K, 0.058),
    ...caps(K, Ak, 0.056, 0.035), segEll(K, Ak, 0.32, back, 0.026, 0.12, 0.05), circ(Ak, 0.04), ...caps(heel, tip, 0.042, 0.027)];
};
const torsoShapes = (r: Rig) => {
  const { H, A, N, NT, HC, c, hd, p } = r, f = fw(c), f0 = fw(p.lean);
  return [ell(add(H, mul(f0, -0.035)), 0.125, 0.13, -p.lean), ell(add(H, mul(f0, -0.07)), 0.095, 0.1, -p.lean), segEll(H, A, 0.55, f0, 0.0, 0.17, 0.11),
    segEll(A, N, 0.42, f, 0.015, 0.2, 0.135), ell(add(add(A, mul(u(c), 0.17)), mul(f, 0.085)), 0.075, 0.06, -c - 0.25), segEll(A, N, 0.3, mul(f, -1), 0.06, 0.16, 0.075),
    ...caps(add(N, mul(f, -0.04)), NT, 0.07, 0.05), ...caps(N, NT, 0.056, 0.05),
    ell(HC, 0.09, 0.108, -hd), ell(add(add(HC, mul(fw(hd), 0.035)), mul(u(hd), -0.06)), 0.062, 0.05, -hd)];
};

// ---------------- the two fighters ----------------
const STANCE_R: Pose = { hip: [0, 0.9], lean: 0.16, chest: 0.05, head: -0.05, hN: [0.3, 1.43], hF: [0.17, 1.48], fN: [0.24, 0.08], fF: [-0.27, 0.12], tN: 0, tF: -0.32, pN: [-0.3, -1], pF: [-0.3, -1] };
const STANCE_B: Pose = { hip: [0, 0.93], lean: 0.05, chest: 0.02, head: 0, hN: [0.31, 1.3], hF: [0.2, 1.42], fN: [0.22, 0.08], fF: [-0.28, 0.1], tN: 0, tF: -0.2, pN: [-0.3, -1], pF: [-0.3, -1] };
const blueTL = timeline(STANCE_B, [
  [0, {}], [T_IMP, {}],
  [T_IMP + 0.07, { hip: [-0.08, 0.9], lean: -0.3, chest: -0.22, head: -0.75, hN: [0.12, 1.62], hF: [0.42, 1.48], pN: [-1, 0.3], pF: [0.2, -1] }, eOut],
  [T_IMP + 0.25, { hip: [-0.2, 0.88], lean: -0.34, chest: -0.2, head: -0.5, hN: [-0.12, 1.35], hF: [0.25, 1.22], fF: [-0.38, 0.17], tF: -0.1 }],
  [T_IMP + 0.38, { fN: [0.12, 0.15] }],
  [T_IMP + 0.42, { hip: [-0.3, 0.86], lean: -0.2, fF: [-0.5, 0.09], tF: -0.15 }],
  [T_IMP + 0.5, { fN: [0.0, 0.08], head: -0.2 }],
  [T_IMP + 0.8, { hip: [-0.32, 0.83], lean: 0.18, chest: 0.05, head: 0.35, hN: [-0.12, 1.0], hF: [-0.05, 1.05], pN: [-0.2, -1], pF: [-0.2, -1] }],
  [T_IMP + 1.15, { hip: [-0.38, 0.52], lean: 0.45, chest: 0.22, head: 0.55, fF: [-0.73, 0.07], tF: -2.9, fN: [0.05, 0.08], hN: [0.02, 0.52], hF: [-0.1, 0.26], pN: [1, -0.3], pF: [0, -1] }, eIn],
  [T_IMP + 1.3, { lean: 0.5, head: 0.6 }],
]);
let TARGET: P = [0.2, 1.6]; // Red's wrist at impact (solved below so the glove lands on Blue's jaw)
const redTL = () => timeline(STANCE_R, [
  [0, {}], [T_LOAD, {}],
  [T_SWING, { hip: [-0.05, 0.86], lean: 0.04, chest: -0.16, head: -0.05, hN: [0.0, 1.38], pN: [-0.6, -0.6] }],
  [T_SWING + 0.07, { hip: [0.03, 0.86], lean: 0.2, chest: 0.12, hN: [0.2, 1.74], pN: [0.1, 1], fN: [0.3, 0.12] }, eIn],
  [T_IMP, { hip: [0.1, 0.85], lean: 0.34, chest: 0.2, head: 0.05, hN: TARGET, pN: [0.4, 1], fN: [0.32, 0.08], tF: -0.6 }, (x) => x * x],
  [T_IMP + 0.06, { hN: add(TARGET, [0.06, -0.13]), lean: 0.38 }, eOut],
  [T_IMP + 0.32, { hip: [0.06, 0.88], lean: 0.24, chest: 0.08, hN: [0.3, 1.42], pN: [-0.3, -1] }],
  [1.95, { hip: [0.06, 0.9], lean: 0.16, chest: 0.05, head: -0.05, hN: [0.36, 1.43], hF: [0.23, 1.48], fF: [-0.21, 0.12], tF: -0.32 }],
]);
const bounceR = (t: number) => 0.018 * Math.abs(Math.sin(t * Math.PI * 1.9)) * (1 - at(t, T_LOAD - 0.1, T_LOAD + 0.05) + at(t, 2.3, 2.6));
const bounceB = (t: number) => 0.01 * Math.sin(t * Math.PI * 2 * 1.1) * (1 - at(t, T_IMP, T_IMP + 0.05));
const withBounce = (p: Pose, b: number): Pose => ({ ...p, hip: add(p.hip, [0, b]), hN: add(p.hN, [0, b * 0.6]), hF: add(p.hF, [0, b * 0.6]) });
const poseB = (a: number) => { const p = withBounce(blueTL(a), bounceB(a)); if (a > T_IMP + 1.15) p.hip = add(p.hip, [0, 0.008 * Math.sin((a - T_IMP) * 7)]); return p; };
// solve the impact: glove centre just touching the front of Blue's face
let RTL = redTL();
{ const hb = rig(poseB(T_IMP)).HC, gc: P = [D - (hb[0] + 0.088 + 0.08 - 0.025), hb[1] - 0.03];
  for (let i = 0; i < 4; i++) { const r = rig(withBounce(RTL(T_IMP), bounceR(T_IMP))); TARGET = sub(gc, mul(norm(sub(r.WN, r.EN)), 0.075)); RTL = redTL(); } }
const poseR = (a: number) => withBounce(RTL(a), bounceR(a));
const toWorldR = (q: P): P => [D - q[0], q[1]];

// ---------------- drawing ----------------
type Pal = { body: string; far: string; line: string; bg: string };
const NORMAL: Pal = { body: "#0c0c0d", far: "#2e2e31", line: "#ebe7df", bg: "#e7e3db" }, INV: Pal = { body: "#f4f2ee", far: "#bdbab4", line: "#0b0b0c", bg: "#0b0b0c" };
const Fighter: React.FC<{ r: Rig; mirror: boolean; x0: number; gloves: boolean; pal: Pal; belt?: number }> = ({ r, mirror, x0, gloves, pal, belt }) => {
  const far = [...legShapes(r.H, r.KF, r.AF, r.p.tF), ...armShapes(add(r.Sh, mul(fw(r.c), -0.02)), r.EF, r.WF, gloves)];
  const body = [...legShapes(r.H, r.KN, r.AN, r.p.tN), ...torsoShapes(r)], near = armShapes(r.Sh, r.EN, r.WN, gloves);
  // one light outline around the whole group (all strokes first, then all fills on top, so inner seams vanish)
  const lw = 0.009, outline = (els: JSX.Element[], col: string) => <><g fill={pal.line} stroke={pal.line} strokeWidth={lw * 2} strokeLinejoin="round">{els}</g><g fill={col}>{els}</g></>;
  const beltEls = belt !== undefined ? (() => { const f = fw(r.p.lean), w = add(r.H, mul(u(r.p.lean), 0.07)), knot = add(w, mul(f, 0.12));
    return [...caps(add(w, mul(f, -0.13)), add(w, mul(f, 0.125)), 0.024, 0.024), ...[0, 1].flatMap((i) => { const a = -Math.PI / 2 + belt * (1 + i * 0.35) + (i ? 0.18 : -0.05); return caps(knot, add(knot, mul([Math.cos(a), Math.sin(a)], 0.2 - i * 0.03)), 0.016, 0.014); })]; })() : [];
  return (
    <g transform={`translate(${OX + x0 * S},${G}) scale(${(mirror ? -1 : 1) * S},${-S})`}>
      {outline(far, pal.far)}
      {outline(body, pal.body)}
      {beltEls.length > 0 && <><g fill={pal.line} stroke={pal.line} strokeWidth={lw * 1.6}>{beltEls}</g><g fill="#2f6fe8">{beltEls}</g></>}
      {outline(near, pal.body)}
      {gloves && outline(gloveShapes(r.EF, r.WF), "#c42b28")}
      {gloves && outline(gloveShapes(r.EN, r.WN), "#e2342f")}
    </g>
  );
};
const sx = (x: number) => OX + x * S, sy = (y: number) => G - y * S;
const rand = (i: number) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

const Backdrop: React.FC = () => (
  <>
    <rect width={W} height={1920} fill="#e9e6df" />
    {[...Array(4)].map((_, i) => <g key={i}><rect x={-60 + i * 300} y={430} width={240} height={760} fill="#f6f4ef" /><g stroke="#dcd7ce" strokeWidth={6}>{[1, 2].map((j) => <line key={j} x1={-60 + i * 300 + j * 80} y1={430} x2={-60 + i * 300 + j * 80} y2={1190} />)}{[1, 2, 3, 4].map((j) => <line key={"h" + j} x1={-60 + i * 300} y1={430 + j * 152} x2={180 + i * 300} y2={430 + j * 152} />)}</g></g>)}
    {[...Array(5)].map((_, i) => <rect key={i} x={-90 + i * 300} y={380} width={30} height={G - 380} fill="#d2cdc3" />)}
    <rect x={0} y={360} width={W} height={34} fill="#d2cdc3" />
    <rect x={0} y={G - 40} width={W} height={1920 - G + 40} fill="#d6d1c8" />
    {[0, 1, 2, 3, 4, 5].map((i) => <line key={i} x1={0} x2={W} y1={G - 40 + 18 * (i + 1) ** 1.45} y2={G - 40 + 18 * (i + 1) ** 1.45} stroke="#cac4ba" strokeWidth={3} />)}
    <rect x={0} y={G - 44} width={W} height={8} fill="#c4beb3" />
  </>
);

export const Silhouette2DTest: React.FC = () => {
  const f = useCurrentFrame(), t = f / FPS;
  const inHit = t >= T_IMP - 0.12 && t < T_IMP + HS + 0.1; // the hit itself runs on ones, the rest on twos
  const tq = inHit ? t : (Math.floor(f / 2) * 2) / FPS, a = tm(tq);
  const fi = f - Math.ceil(T_IMP * FPS), inv = fi === 0 || fi === 2; // impact frames: 1st and 3rd inverted
  const pal = inv ? INV : NORMAL;
  const rb = rig(poseB(a)), rr = rig(poseR(a)), contact = toWorldR(gloveC(rr.EN, rr.WN));
  // camera: shake after the hit, a small push-in on the contact point
  const k = t > T_IMP ? Math.exp(-(t - T_IMP) * 6) : 0, shx = (Math.sin(t * 91) + Math.sin(t * 57)) * 9 * k, shy = (Math.sin(t * 77) + Math.cos(t * 43)) * 9 * k;
  const zoom = 1 + 0.07 * at(t, T_IMP, T_IMP + 0.05) * (1 - at(t, T_IMP + 0.4, T_IMP + 1.2)), cx = sx(contact[0]), cy = sy(contact[1]);
  // belt tails swing with Blue's hip speed
  const vx = (poseB(a).hip[0] - poseB(a - 0.06).hip[0]) / 0.06, belt = Math.max(-1.2, Math.min(1.2, -vx * 1.4)) + 0.06 * Math.sin(t * 9);
  // smear: ghost gloves along the swing
  const ghosts = a > T_SWING + 0.03 && t < T_IMP + 0.02 ? [1, 2, 3, 4, 5].map((g) => { const ta = Math.min(a, T_IMP) - g * 0.02, r = rig(poseR(ta)); return { c: toWorldR(gloveC(r.EN, r.WN)), o: 0.5 * (1 - g / 6) }; }) : [];
  const bu = clamp01((t - T_IMP) / 0.35), burstOn = t >= T_IMP && t < T_IMP + 0.35;
  const du = t - (T_IMP + HS * 0.5), knee = rig(poseB(T_IMP + 1.15)).KF, kd = t - (T_IMP + HS + 1.15);
  kk = 0;
  return (
    <AbsoluteFill style={{ background: pal.bg }}>
      <svg width={W} height={1920} viewBox={`0 0 ${W} 1920`}>
        <defs>
          <radialGradient id="vig" cx="50%" cy="55%" r="75%"><stop offset="55%" stopColor="#000" stopOpacity={0} /><stop offset="100%" stopColor="#000" stopOpacity={0.28} /></radialGradient>
        </defs>
        <g transform={`translate(${shx},${shy}) translate(${cx},${cy}) scale(${zoom}) translate(${-cx},${-cy})`}>
          {!inv && <Backdrop />}
          {!inv && [...Array(40)].map((_, i) => <circle key={"d" + i} cx={(rand(i) * W + t * 12 * (rand(i + 7) - 0.5)) % W} cy={300 + rand(i + 3) * 1100 - t * 8 * rand(i + 9)} r={1.5 + rand(i + 5) * 2.5} fill="#ffffff" opacity={0.8} />)}
          {!inv && [rb, rr].map((r, i) => { const fx = i ? (x: number) => D - x : (x: number) => x, xs = [r.AN[0], r.AF[0], r.H[0]].map(fx), mid = (Math.min(...xs) + Math.max(...xs)) / 2;
            return <ellipse key={"s" + i} cx={sx(mid)} cy={G - 6} rx={(Math.max(...xs) - Math.min(...xs)) * S * 0.6 + 70} ry={16} fill="#000" opacity={0.16} />; })}
          {ghosts.map((g, i) => <circle key={"g" + i} cx={sx(g.c[0])} cy={sy(g.c[1])} r={0.085 * S} fill="#e2342f" opacity={g.o} />)}
          {ghosts.length > 2 && [0, 1, 2].map((i) => { const a0 = ghosts[ghosts.length - 1].c, a1 = ghosts[0].c, n = norm([-(a1[1] - a0[1]), a1[0] - a0[0]]), o = (i - 1) * 0.06;
            return <line key={"l" + i} x1={sx(a0[0] + n[0] * o)} y1={sy(a0[1] + n[1] * o)} x2={sx(a1[0] + n[0] * o)} y2={sy(a1[1] + n[1] * o)} stroke={pal.body} strokeWidth={4} strokeLinecap="round" opacity={0.7} />; })}
          {burstOn && !inv && (() => { const R0 = (0.18 + 0.5 * eOut(bu)) * S, pts = [...Array(28)].map((_, i) => { const ang = (i / 28) * Math.PI * 2, rr2 = i % 2 ? R0 * 0.45 : R0 * (0.8 + 0.4 * rand(i)); return [cx + Math.cos(ang) * rr2, cy + Math.sin(ang) * rr2].join(","); }).join(" ");
            return <polygon points={pts} fill="#ffffff" stroke="#0c0c0d" strokeWidth={6} opacity={1 - bu * bu} />; })()}
          <Fighter r={rb} mirror={false} x0={0} gloves={false} pal={pal} belt={belt} />
          <Fighter r={rr} mirror x0={D} gloves pal={pal} />
          {burstOn && [...Array(14)].map((_, i) => { const ang = (i / 14) * Math.PI * 2 + rand(i) * 0.3, r0 = (0.1 + 0.55 * eOut(bu)) * S, r1 = r0 + (0.12 + 0.2 * rand(i + 2)) * S * (1 - bu);
            return <line key={"r" + i} x1={cx + Math.cos(ang) * r0} y1={cy + Math.sin(ang) * r0} x2={cx + Math.cos(ang) * r1} y2={cy + Math.sin(ang) * r1} stroke={inv ? "#f4f2ee" : "#0c0c0d"} strokeWidth={7 * (1 - bu) + 2} strokeLinecap="round" />; })}
          {du > 0 && du < 0.75 && [...Array(9)].map((_, i) => { const v: P = [-0.6 - 1.1 * rand(i + 20), 0.2 + 1.0 * rand(i + 30)], p0 = rig(poseB(T_IMP)).HC, x = p0[0] + 0.05 + v[0] * du, y = p0[1] + v[1] * du - 4.9 * du * du;
            return y > 0.02 ? <circle key={"w" + i} cx={sx(x)} cy={sy(y)} r={(0.006 + 0.007 * rand(i + 40)) * S} fill={pal.body} /> : null; })}
          {kd > 0 && kd < 0.6 && [...Array(7)].map((_, i) => { const side = i % 2 ? 1 : -1, d = (0.05 + 0.25 * eOut(kd / 0.6)) * (0.6 + rand(i + 50)), r = (0.03 + 0.07 * eOut(kd / 0.6)) * (0.7 + 0.6 * rand(i + 60));
            return <circle key={"p" + i} cx={sx(knee[0] + side * d)} cy={sy(0.03 + 0.08 * eOut(kd / 0.6) * rand(i + 70))} r={r * S} fill="#bdb6aa" opacity={0.75 * (1 - kd / 0.6)} />; })}
        </g>
        {!inv && <rect width={W} height={1920} fill="url(#vig)" />}
        {!inv && <text x={W / 2} y={250} textAnchor="middle" fontFamily="Impact, 'Arial Black', sans-serif" fontSize={112} letterSpacing={2}>
          <tspan fill="#d5302c">BOXING</tspan><tspan fill="#0c0c0d" fontSize={80} dx={18} dy={-6}>vs</tspan><tspan fill="#2f6fe8" dx={18} dy={6}>TAEKWONDO</tspan></text>}
      </svg>
    </AbsoluteFill>
  );
};
