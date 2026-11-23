// Acting + camera helpers for "Menara Es Dolma" (the same maths as the Garam film, gathered in one place).
// Characters hold still between beats (no idle sway). Props are really held: a 3D ball hand sits on the grip point.
import * as THREE from "three";
import { Beat, Actor, FPS, sm, Word } from "../../lib/acting";
import { Limb, Pose, CharSpec, OUTLINE } from "../../lib/toon2";
import { SU, ToonCard } from "../../lib/toonCard";
import { Ctx, Key, handWorld, V3 } from "../../lib/scene";
import { headAt, Ex } from "./cast";

export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export const at = (t: number, a: number, b: number) => sm((t - a) / (b - a));
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const say = (text: string, t0: number, t1: number, stress: number[] = []): Word[] => {
  const ws = text.split(/\s+/).filter(Boolean), n = ws.reduce((a, w) => a + w.length + 1.5, 0); let t = t0;
  return ws.map((w, i) => { const d = ((w.length + 1.5) / n) * (t1 - t0); const o: Word = { w, t0: t, t1: t + d * 0.88, stress: stress.includes(i) }; t += d; return o; });
};
export const actor = (seed: number, beats: Beat[], words: Word[] = []): Actor => ({ seed, beats, words });
export const cardPt = (c: ToonCard, x: number, y: number) => { c.mesh.updateMatrixWorld(); return c.mesh.localToWorld(V((x - 300) * SU, (975 - y) * SU, 0)); };
export const camDir = (cam: THREE.Camera, x: number, z: number) => V(cam.position.x - x, 0, cam.position.z - z).normalize();
export const put = (c: ToonCard, S: CharSpec, P: Pose, x: number, z: number, cx: Ctx, y = 0, extra?: Ex) => c.update(S, P, x, z, cx.cam, cx.set.sunDir, 1, y, extra);
/** move hand i so that, seen from the camera, it lands on `T`; w 0..1 blends the reach in */
export const reach = (c: ToonCard, S: CharSpec, P: Pose, i: 0 | 1, T: THREE.Vector3, x: number, z: number, cx: Ctx, y = 0, extra?: Ex, w = 1): Pose => {
  put(c, S, P, x, z, cx, y, extra); if (w <= 0.001) return P;
  const cam = cx.cam.position, n = camDir(cx.cam, x, z), right = V(n.z, 0, -n.x), u = SU;
  const d = T.clone().sub(cam), pt = cam.clone().addScaledVector(d, V(x, 0, z).sub(cam).dot(n) / d.dot(n));
  let Q = P;
  for (let it = 0; it < 2; it++) {
    const h = handWorld(c, S, Q, i), du = (pt.clone().sub(h).dot(right) / u) * (it ? 1 : w), dv = ((pt.y - h.y) / u) * (it ? 1 : w);
    const A = Q.arms[i], L: Limb = { a: [A.a[0] + du * 0.5, A.a[1] - dv * 0.5], b: [A.b[0] + du, A.b[1] - dv] };
    Q = { ...Q, arms: (i ? [Q.arms[0], L] : [L, Q.arms[1]]) as [Limb, Limb] }; put(c, S, Q, x, z, cx, y, extra);
    if (w < 1) break;
  }
  return Q;
};
export const walk = (P: Pose, ph: number, amp = 1): Pose => {
  const a0 = ph * Math.PI * 2;
  const legs = [0, 1].map((k) => { const s = k ? 1 : -1, a = a0 + k * Math.PI, sw = Math.cos(a), lift = Math.max(0, Math.sin(a)); return { a: [s * 5 + 18 * sw * amp, 118 - 30 * lift * amp], b: [s * 3 + 40 * sw * amp, -60 * lift * amp] } as Limb; }) as [Limb, Limb];
  const arms = P.arms.map((A, k) => { const sw = Math.cos(a0 + (1 - k) * Math.PI) * amp; return { a: [A.a[0] + 14 * sw, A.a[1]], b: [A.b[0] + 34 * sw, A.b[1] - 8 * Math.abs(sw)] } as Limb; }) as [Limb, Limb];
  return { ...P, legs, arms, bob: P.bob - 10 * Math.abs(Math.sin(a0)) * amp, body: { ...P.body, lean: P.body.lean + 0.04 * amp } };
};
export const path = (t: number, t0: number, t1: number, a: [number, number], b: [number, number], stride = 0.62) => { const u = at(t, t0, t1), x = lerp(a[0], b[0], u), z = lerp(a[1], b[1], u), d = Math.hypot(b[0] - a[0], b[1] - a[1]) * u; return { x, z, moving: u > 0.001 && u < 0.999, ph: d / stride }; };
export const goTo = (P: Pose, w: { moving: boolean; ph: number }, amp = 0.9) => (w.moving ? walk(P, w.ph, amp) : P);
export const nod = (P: Pose, t: number, t0: number, n = 2, amp = 14): Pose => { const u = t - t0; if (u < 0 || u > n * 0.32) return P; return { ...P, head: { ...P.head, dy: P.head.dy + amp * Math.abs(Math.sin((u / 0.32) * Math.PI)) } }; };
/** keep an arm still while its hand holds something (the walk swing would rip the prop around) */
export const freezeArm = (P: Pose, from: Pose, i: 0 | 1): Pose => ({ ...P, arms: (i ? [P.arms[0], from.arms[1]] : [from.arms[0], P.arms[1]]) as [Limb, Limb] });
export const shake = (P: Pose, t: number, t0: number, t1: number, amp = 0.16): Pose => (t < t0 || t > t1 ? P : { ...P, head: { ...P.head, rot: P.head.rot + amp * Math.sin((t - t0) * 13) * Math.sin(Math.PI * (t - t0) / (t1 - t0)), turn: P.head.turn + 0.5 * Math.sin((t - t0) * 13) * Math.sin(Math.PI * (t - t0) / (t1 - t0)) } });
export const crouch = (P: Pose, k: number): Pose => (k <= 0.001 ? P : { ...P, bob: P.bob + 150 * k, body: { ...P.body, lean: P.body.lean + 0.08 * k }, legs: [0, 1].map((i) => { const s = i ? 1 : -1; return { a: [s * (5 + 64 * k), 118 - 66 * k], b: [s * 18 * k, 0] } as Limb; }) as [Limb, Limb] });
/** standing on a ladder rung: the near foot higher (one leg bent up), body close to the rungs */
export const onLadder = (P: Pose): Pose => ({ ...P, legs: [{ a: [-6, 70], b: [-14, 2] }, { a: [8, 118], b: [6, 0] }] as [Limb, Limb] });
export const headW = (c: ToonCard, S: CharSpec, P: Pose) => { const [x, y] = headAt(S, P); return cardPt(c, x, y); };

// ---------------- camera glides ----------------
export type P3 = { pos: V3; look: V3; fov?: number };
const cr = (a: number, b: number, c: number, d: number, u: number) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
const crV = (P: V3[], s: number): V3 => { const n = P.length, i = Math.min(n - 2, Math.floor(s)), u = s - i, g = (k: number) => P[Math.max(0, Math.min(n - 1, k))]; return [0, 1, 2].map((j) => cr(g(i - 1)[j], g(i)[j], g(i + 1)[j], g(i + 2)[j], u)) as V3; };
export const move = (tA: number, tB: number, pts: P3[], ease: (x: number) => number = sm): Key[] => {
  const out: Key[] = [], n = Math.max(1, Math.round((tB - tA) * FPS));
  for (let i = 0; i <= n; i++) {
    const t = tA + ((tB - tA) * i) / n - (i === n ? 0.002 : 0), u = ease(i / n), s = u * (pts.length - 1);
    const pos: V3 = pts.length === 1 ? pts[0].pos : crV(pts.map((p) => p.pos), s), look: V3 = pts.length === 1 ? pts[0].look : crV(pts.map((p) => p.look), s);
    const k = Math.min(pts.length - 2, Math.floor(s)), f = s - k, fov = pts.length === 1 ? pts[0].fov ?? 40 : lerp(pts[Math.max(0, k)].fov ?? 40, pts[Math.min(pts.length - 1, k + 1)].fov ?? 40, f);
    out.push({ t, pos, look, fov });
  }
  return out;
};
/** a held shot that creeps a few centimetres (never fully frozen) */
export const hold1 = (tA: number, tB: number, p: P3, d: V3 = [0.05, 0.01, -0.08]) => move(tA, tB, [p, { ...p, pos: [p.pos[0] + d[0], p.pos[1] + d[1], p.pos[2] + d[2]] }], (x) => x);
export const dip = (len: number, din = 0.3, dout = 0.3) => (t: number) => Math.max(din > 0 ? 1 - at(t, 0, din) : 0, dout > 0 ? at(t, len - dout, len) : 0);
/** a camera that sees two people side by side, perpendicular to the line between them (B on screen right) */
export const twoShot = (A: [number, number], B: [number, number], d: number, o: { h?: number; ly?: number; fov?: number; shift?: number } = {}): P3 => {
  const dx = B[0] - A[0], dz = B[1] - A[1], l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l, nx = -uz, nz = ux, s = o.shift ?? 0, mx = (A[0] + B[0]) / 2 + ux * s, mz = (A[1] + B[1]) / 2 + uz * s;
  return { pos: [mx + nx * d, o.h ?? 1.45, mz + nz * d], look: [mx, o.ly ?? 1.15, mz], fov: o.fov ?? 38 };
};

// ---------------- card extras ----------------
/** breath steam puffing from the mouth on cold nights (drawn into the card, a soft white cloud that drifts) */
export const breathEx = (S: CharSpec, t: number, k = 1, dir = 1): Ex => (g, P) => {
  if (k <= 0.01) return; const [x, y] = headAt(S, P), R = S.R, per = 2.2, ph = ((t % per) + per) % per / per; if (ph > 0.7) return; const u = ph / 0.7;
  g.save(); for (let i = 0; i < 4; i++) { const v = Math.max(0, u - i * 0.08); const cx = x + dir * (0.45 * R + v * 1.4 * R + i * 0.18 * R), cy = y + 0.35 * R - v * 0.5 * R, r = (0.12 + v * 0.45) * R;
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, `rgba(255,255,255,${0.5 * k * (1 - v)})`); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); }
  g.restore();
};
/** a head torch strap with a lit lamp on the forehead */
export const headlampEx = (S: CharSpec): Ex => (g, P) => { const [x, y] = headAt(S, P), R = S.R; g.save(); g.translate(x, y); g.rotate(P.head.rot * 0.9);
  g.beginPath(); g.ellipse(0, -0.42 * R, 0.98 * R, 0.16 * R, 0, 0, Math.PI); g.lineWidth = 0.09 * R; g.strokeStyle = "#2a2a2e"; g.stroke();
  g.beginPath(); g.roundRect(-0.17 * R + P.head.turn * 0.16 * R, -0.58 * R, 0.34 * R, 0.22 * R, 0.05 * R); g.fillStyle = "#3a3a40"; g.fill(); g.lineWidth = 0.04 * R; g.strokeStyle = OUTLINE; g.stroke();
  const gr = g.createRadialGradient(P.head.turn * 0.16 * R, -0.47 * R, 0, P.head.turn * 0.16 * R, -0.47 * R, 0.4 * R); gr.addColorStop(0, "rgba(255,255,230,1)"); gr.addColorStop(0.3, "rgba(255,240,190,0.7)"); gr.addColorStop(1, "rgba(255,240,190,0)"); g.fillStyle = gr; g.beginPath(); g.arc(P.head.turn * 0.16 * R, -0.47 * R, 0.4 * R, 0, Math.PI * 2); g.fill();
  g.restore(); };
/** cold flush on the cheeks + a frosty look */
export const coldEx = (S: CharSpec, k = 1): Ex => (g, P) => { const [x, y] = headAt(S, P), R = S.R; for (const s of [-1, 1]) { const cx = x + P.head.turn * 0.16 * R + s * 0.45 * R, cy = y + 0.2 * R; const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 0.18 * R); gr.addColorStop(0, `rgba(235,110,120,${0.4 * k})`); gr.addColorStop(1, "rgba(235,110,120,0)"); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 0.18 * R, 0, Math.PI * 2); g.fill(); } };
