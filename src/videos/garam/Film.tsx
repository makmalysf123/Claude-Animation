// "Garam di Pohon Kelapa" v2 (~116 s), formula A V1 built up like the "guci naga" study. Script: docs/scripts/garam-kelapa-naskah-v2.md.
// Rules: no on-screen text (narration + subtitles are added in CapCut), everything 3D except the people (2D cards),
// downloaded models for objects, props really held, calm camera that holds at stops, characters hold still between
// beats (no idle sway: user request 2026-11-22), smaller heads (cast.ts).
import React from "react";
import * as THREE from "three";
import { continueRender, delayRender } from "remotion";
import { actAt, Actor, Beat, FPS, sm, noise, Word } from "../../lib/acting";
import { headCenter, Limb, Pose, CharSpec, OUTLINE } from "../../lib/toon2";
import { SU, ToonCard } from "../../lib/toonCard";
import { Reel, SceneDef, SetLike, Ctx, Key, handWorld, V3 } from "../../lib/scene";
import { TEX, SpritePool, drawShockLines, drawSparkles } from "../kopi/fx";
import { DARMAN, KARTO, WARUNG_BU, IBU, ADIK, TENGKULAK } from "./cast";
import { loadModels, hasModels, mdl, recolor, nutCol } from "./models";
import { KebunSet, KebunOpts, HERO, RING_R, PATH_Z, ROAD_Z, WARUNG, BOUND_X, mkFrond, mkPhone } from "./kebun";
import { PantaiSet, SHORE, sandAt } from "./pantai";

// ---------------- helpers (same maths as the Plester film, minus the idle "life" sway) ----------------
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const at = (t: number, a: number, b: number) => sm((t - a) / (b - a));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
type Ex = (g: CanvasRenderingContext2D, P: Pose) => void;
const both = (...f: (Ex | undefined | false | null)[]): Ex => (g, P) => f.forEach((x) => x && x(g, P));
const say = (text: string, t0: number, t1: number, stress: number[] = []): Word[] => {
  const ws = text.split(/\s+/).filter(Boolean), n = ws.reduce((a, w) => a + w.length + 1.5, 0); let t = t0;
  return ws.map((w, i) => { const d = ((w.length + 1.5) / n) * (t1 - t0); const o: Word = { w, t0: t, t1: t + d * 0.88, stress: stress.includes(i) }; t += d; return o; });
};
const actor = (seed: number, beats: Beat[], words: Word[] = []): Actor => ({ seed, beats, words });
const cardPt = (c: ToonCard, x: number, y: number) => { c.mesh.updateMatrixWorld(); return c.mesh.localToWorld(V((x - 300) * SU, (975 - y) * SU, 0)); };
const camDir = (cam: THREE.Camera, x: number, z: number) => V(cam.position.x - x, 0, cam.position.z - z).normalize();
const put = (c: ToonCard, S: CharSpec, P: Pose, x: number, z: number, cx: Ctx, y = 0, extra?: Ex) => c.update(S, P, x, z, cx.cam, cx.set.sunDir, 1, y, extra);
/** move hand i so that, seen from the camera, it lands on `target`; w 0..1 blends the reach in */
const reach = (c: ToonCard, S: CharSpec, P: Pose, i: 0 | 1, T: THREE.Vector3, x: number, z: number, cx: Ctx, y = 0, extra?: Ex, w = 1): Pose => {
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
const walk = (P: Pose, ph: number, amp = 1): Pose => {
  const a0 = ph * Math.PI * 2;
  const legs = [0, 1].map((k) => { const s = k ? 1 : -1, a = a0 + k * Math.PI, sw = Math.cos(a), lift = Math.max(0, Math.sin(a)); return { a: [s * 5 + 18 * sw * amp, 118 - 30 * lift * amp], b: [s * 3 + 40 * sw * amp, -60 * lift * amp] } as Limb; }) as [Limb, Limb];
  const arms = P.arms.map((A, k) => { const sw = Math.cos(a0 + (1 - k) * Math.PI) * amp; return { a: [A.a[0] + 14 * sw, A.a[1]], b: [A.b[0] + 34 * sw, A.b[1] - 8 * Math.abs(sw)] } as Limb; }) as [Limb, Limb];
  return { ...P, legs, arms, bob: P.bob - 10 * Math.abs(Math.sin(a0)) * amp, body: { ...P.body, lean: P.body.lean + 0.04 * amp } };
};
const path = (t: number, t0: number, t1: number, a: [number, number], b: [number, number], stride = 0.62) => { const u = at(t, t0, t1), x = lerp(a[0], b[0], u), z = lerp(a[1], b[1], u), d = Math.hypot(b[0] - a[0], b[1] - a[1]) * u; return { x, z, moving: u > 0.001 && u < 0.999, ph: d / stride }; };
const goTo = (P: Pose, w: { moving: boolean; ph: number }, amp = 0.9) => (w.moving ? walk(P, w.ph, amp) : P);
const nod = (P: Pose, t: number, t0: number, n = 2, amp = 14): Pose => { const u = t - t0; if (u < 0 || u > n * 0.32) return P; return { ...P, head: { ...P.head, dy: P.head.dy + amp * Math.abs(Math.sin((u / 0.32) * Math.PI)) } }; };
/** keep the arms still while a hand holds something (the walk swing would rip the prop around) */
const freezeArm = (P: Pose, from: Pose, i: 0 | 1): Pose => ({ ...P, arms: (i ? [P.arms[0], from.arms[1]] : [from.arms[0], P.arms[1]]) as [Limb, Limb] });
const head = (S: CharSpec, P: Pose): [number, number] => { const [x, y] = headCenter(S, P), hipY = 975 - S.legLen + P.bob, c = Math.cos(P.body.lean), s = Math.sin(P.body.lean); return [P.x + (x - P.x) * c - (y - hipY) * s, hipY + (x - P.x) * s + (y - hipY) * c]; };
const shockEx = (S: CharSpec, k: number): Ex => (g, P) => { if (k <= 0.01) return; const [x, y] = head(S, P); drawShockLines(g, x, y - S.R * 0.1, S.R, k); };
const sparkEx = (S: CharSpec, t: number, k: number): Ex => (g, P) => { if (k <= 0.01) return; const [x, y] = head(S, P); drawSparkles(g, x, y - S.R * 0.1, S.R, t, k); };
/** Pak Darman's woven bamboo caping: a wide shallow cone with a woven texture, sitting on the head */
const capingEx: Ex = (g, P) => { const S = DARMAN, [x, y] = head(S, P), R = S.R; g.save(); g.translate(x, y); g.rotate(P.head.rot * 0.9);
  const tipY = -1.62 * R, brimY = -0.6 * R, w = 1.75 * R;
  g.beginPath(); g.moveTo(-w, brimY); g.quadraticCurveTo(-0.5 * w, brimY - 0.24 * R, 0, tipY); g.quadraticCurveTo(0.5 * w, brimY - 0.24 * R, w, brimY); g.quadraticCurveTo(0, brimY + 0.2 * R, -w, brimY); g.closePath();
  const gr = g.createLinearGradient(-w, tipY, w, brimY); gr.addColorStop(0, "#f0d896"); gr.addColorStop(0.6, "#d8b46a"); gr.addColorStop(1, "#b48a48"); g.fillStyle = gr; g.fill();
  g.save(); g.clip(); g.strokeStyle = "rgba(120,84,40,0.45)"; g.lineWidth = 0.035 * R; for (let k = -12; k <= 12; k++) { g.beginPath(); g.moveTo(0, tipY); g.lineTo(k * 0.16 * w, brimY + 0.2 * R); g.stroke(); }
  for (let k = 1; k < 6; k++) { const u = k / 6; g.beginPath(); g.ellipse(0, tipY + (brimY - tipY) * u + 0.05 * R * u, w * u, 0.1 * R * u, 0, 0, Math.PI); g.stroke(); } g.restore();
  g.lineWidth = 0.07 * R; g.strokeStyle = OUTLINE; g.stroke(); g.restore(); };

// ---------------- camera glides ----------------
type P3 = { pos: V3; look: V3; fov?: number };
const cr = (a: number, b: number, c: number, d: number, u: number) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
const crV = (P: V3[], s: number): V3 => { const n = P.length, i = Math.min(n - 2, Math.floor(s)), u = s - i, g = (k: number) => P[Math.max(0, Math.min(n - 1, k))]; return [0, 1, 2].map((j) => cr(g(i - 1)[j], g(i)[j], g(i + 1)[j], g(i + 2)[j], u)) as V3; };
const move = (tA: number, tB: number, pts: P3[], ease: (x: number) => number = sm): Key[] => {
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
const hold1 = (tA: number, tB: number, p: P3, d: V3 = [0.05, 0.01, -0.08]) => move(tA, tB, [p, { ...p, pos: [p.pos[0] + d[0], p.pos[1] + d[1], p.pos[2] + d[2]] }], (x) => x);
const dip = (len: number, din = 0.3, dout = 0.3) => (t: number) => Math.max(din > 0 ? 1 - at(t, 0, din) : 0, dout > 0 ? at(t, len - dout, len) : 0);

// ---------------- props + hands rig ----------------
type FX = { hands: THREE.Mesh[]; puff: SpritePool; dust: SpritePool; mist: SpritePool; bag: THREE.Object3D; sack: THREE.Object3D; hoe: THREE.Object3D; nut: THREE.Object3D; nutBig: THREE.Object3D; phone: THREE.Object3D; frond: THREE.Object3D; frond2: THREE.Object3D; glow: THREE.PointLight };
const addFx = (R: THREE.Object3D): FX => {
  const F: FX = {
    hands: [0, 1, 2, 3].map(() => { const h = new THREE.Mesh(new THREE.SphereGeometry(17 * SU, 20, 14), new THREE.MeshBasicMaterial({ color: OUTLINE })); h.visible = false; h.renderOrder = 10; R.add(h); return h; }),
    puff: new SpritePool(R, TEX.puff, 60), dust: new SpritePool(R, TEX.dust, 40, false, "#a89878"), mist: new SpritePool(R, TEX.puff, 140, false, "#f4fbff"),
    bag: recolor(mdl("bag_open"), { Bag: "#eeebe2", Bag_Inside: "#fbfbf8" }, 0.9), sack: recolor(mdl("sack", 0.8), { mat18: "#f3f1ea" }, 0.9), hoe: mdl("hoe"), nut: nutCol(mdl("coconut", 0.72), "#8a7a3e", 0.7), nutBig: nutCol(mdl("coconut", 1.3), "#6f9a2e", 0.5),
    phone: mkPhone(), frond: mkFrond(1, 3.3), frond2: mkFrond(0.9, 3.0), glow: new THREE.PointLight("#bcd6ff", 0, 1.6, 2),
  };
  R.add(F.bag, F.sack, F.hoe, F.nut, F.nutBig, F.phone, F.frond, F.frond2, F.glow); return F;
};
const fxBegin = (F: FX) => { for (const p of [F.puff, F.dust, F.mist]) p.begin(); F.hands.forEach((h) => (h.visible = false)); for (const g of [F.bag, F.sack, F.hoe, F.nut, F.nutBig, F.phone, F.frond, F.frond2]) g.visible = false; F.glow.intensity = 0; };
const fxEnd = (F: FX) => { for (const p of [F.puff, F.dust, F.mist]) p.end(); };
/** a 3D ball hand on a grip point, on the camera side of the prop, so the prop is clearly HELD */
const hold = (F: FX, i: number, p: THREE.Vector3, cam: THREE.Camera, sc = 1) => { const h = F.hands[i]; h.position.copy(p).addScaledVector(cam.position.clone().sub(p).normalize(), 0.03 * sc); h.scale.setScalar(sc); h.visible = true; };
type WithFx = { fx: FX };
const mkKebun = (o: KebunOpts = {}) => () => { const k = new KebunSet(o) as KebunSet & WithFx; k.fx = addFx(k.root); return k as unknown as SetLike; };
const mkPantai = (o: { shadowAt?: V3; shadowSize?: number; sun?: V3 } = {}) => () => { const k = new PantaiSet(o) as PantaiSet & WithFx; k.fx = addFx(k.root); return k as unknown as SetLike; };
const K_ = (cx: Ctx) => cx.set as unknown as KebunSet & WithFx;
const PT_ = (cx: Ctx) => cx.set as unknown as PantaiSet & WithFx;
const warm = (c: ToonCard) => { c.shade = 0.5; c.liftCol = "255,214,160"; c.shadeCol = "70,70,140"; };
const noon = (c: ToonCard) => { c.shade = 0.4; c.liftCol = "255,240,210"; c.shadeCol = "70,90,150"; };
/** where the shoulder top of a card is in the world (for a sack on the shoulder) */
const shoulderW = (c: ToonCard, S: CharSpec, P: Pose, side: -1 | 1) => { const top = 975 - S.legLen + P.bob - S.bodyH * P.body.sy; return cardPt(c, P.x + side * S.bodyW * 0.36, top + 8); };

// ---------------- look ----------------
const DAY = { fog: "#eadcc4", dens: 0.0075, bg: "#cfe0f2", cInf: 5, env: 0.42, exposure: 0.03, bloom: 0.7, sat: 0.24, contrast: 0.1, grade: [[0.42, 0.5, 0.6], [0.68, 0.55, 0.42], 0.3] as [V3, V3, number] };
const COAST = { fog: "#e2eef4", dens: 0.0045, bg: "#cfe4f4", cInf: 5, env: 0.5, exposure: 0.02, bloom: 0.65, sat: 0.22, contrast: 0.1, grade: [[0.44, 0.5, 0.6], [0.62, 0.56, 0.46], 0.24] as [V3, V3, number] };
const PIT = { ...DAY, cInf: 1.4, dens: 0.004 };

// ======================================================================================================
// shared acting
const RW = 1.75; // Pak Darman walks outside the ring
const walkA = (t: number) => 0.3 + 0.2 * Math.max(0, t); // his angle around the palm (rad)
const darmanAt = (a: number) => ({ x: HERO.x + Math.cos(a) * RW, z: HERO.z + Math.sin(a) * RW });
const throwFrom = (a: number) => { const p = darmanAt(a); return V(p.x - Math.cos(a) * 0.28, 1.0, p.z - Math.sin(a) * 0.28); };
/** one scattering cycle: the hand dips into the open sack, then flings out toward the ring */
const fling = (t: number, every = 0.55) => { const u = ((t % every) + every) % every / every; return u < 0.45 ? sm(u / 0.45) : 1 - sm((u - 0.45) / 0.55); };
/** Pak Darman scattering salt from the bag at his hip; aOf(t) = his angle around the HERO palm (walking or standing) */
const scatterAct = (cx: Ctx, S: CharSpec, P0: Pose, aOf: (t: number) => number, t: number, walking: boolean, tStart: number, tEnd: number, card = 0) => {
  const k = K_(cx), F = k.fx, c = cx.card(card), { cam } = cx, a = aOf(t), p = darmanAt(a), w = { moving: walking, ph: (a * RW) / 0.5 };
  let P = goTo(P0, w, 0.6); P = freezeArm(P, P0, 0); put(c, S, P, p.x, p.z, cx, 0, capingEx);
  const nC = camDir(cam, p.x, p.z), gripL = cardPt(c, P.x - S.bodyW * 0.6, 975 - S.legLen + P.bob - 18).addScaledVector(nC, 0.1);
  P = reach(c, S, P, 0, gripL, p.x, p.z, cx, 0, capingEx); F.bag.visible = true; F.bag.position.copy(gripL).add(V(0, -0.24, 0)).addScaledVector(nC, 0.02); F.bag.rotation.set(0, Math.atan2(nC.x, nC.z) + 0.3, 0); hold(F, 0, gripL.clone().add(V(0, -0.01, 0)), cam);
  const inSack = F.bag.position.clone().add(V(0, 0.2, 0)).addScaledVector(nC, 0.02), out = throwFrom(a).add(V(0, 0.08, 0)), u = t > tStart && t < tEnd ? fling(t - tStart) : 0;
  P = reach(c, S, P, 1, inSack.clone().lerp(out, u), p.x, p.z, cx, 0, capingEx, 1); hold(F, 1, handWorld(c, S, P, 1), cam);
  k.grains.run(t, tStart + 0.25, tEnd, (tk) => throwFrom(aOf(tk)), (tk, i) => { const aa = aOf(tk) + (i - 13) * 0.022; const rr = RING_R + Math.sin(i * 7.7) * 0.07; return V(HERO.x + Math.cos(aa) * rr, 0.01, HERO.z + Math.sin(aa) * rr); });
  return P;
};
/** the hoe stands at Pak Karto's left side like a staff: blade on the ground, handle in his left hand */
const kartoWithHoe = (cx: Ctx, P0: Pose, x: number, z: number, card: ToonCard, w: { moving: boolean; ph: number }, extra?: Ex) => {
  const F = K_(cx).fx, { cam } = cx; let P = goTo(P0, w, 0.85); P = freezeArm(P, P0, 0); put(card, KARTO, P, x, z, cx, 0, extra);
  const n = camDir(cam, x, z), lift = w.moving ? 0.06 + 0.04 * Math.abs(Math.sin(w.ph * Math.PI)) : 0;
  const grip = cardPt(card, P.x - KARTO.bodyW * 0.68, 975 - KARTO.legLen - KARTO.bodyH * 0.12).addScaledVector(n, 0.1);
  P = reach(card, KARTO, P, 0, grip, x, z, cx, 0, extra); hold(F, 2, grip, cam);
  F.hoe.visible = true; F.hoe.quaternion.setFromUnitVectors(V(1, 0, 0), V(0, -1, 0)); F.hoe.rotateX(Math.atan2(n.x, n.z)); F.hoe.position.copy(grip); F.hoe.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(F.hoe), cx2 = (bb.min.x + bb.max.x) / 2, cz2 = (bb.min.z + bb.max.z) / 2; F.hoe.position.add(V(grip.x - cx2, 0.01 + lift - bb.min.y, grip.z - cz2)); return P;
};
/** the hoe lying flat on the ground */
const hoeDown = (F: FX, x: number, z: number, rot: number) => { F.hoe.visible = true; F.hoe.rotation.set(0, rot, 0); F.hoe.position.set(0, 0, 0); F.hoe.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(F.hoe), c = bb.getCenter(V(0, 0, 0)); F.hoe.position.set(x - c.x, 0.012 - bb.min.y, z - c.z); };
/** a sack on the shoulder, held by the hand on that side */
const sackOnShoulder = (cx: Ctx, F: FX, c: ToonCard, S: CharSpec, P0: Pose, x: number, z: number, side: -1 | 1, y = 0, extra?: Ex) => {
  const { cam } = cx, i: 0 | 1 = side < 0 ? 0 : 1; put(c, S, P0, x, z, cx, y, extra); const sh = shoulderW(c, S, P0, side), n = camDir(cam, x, z), out = V(n.z, 0, -n.x).multiplyScalar(side);
  F.sack.visible = true; F.sack.position.set(0, 0, 0); F.sack.quaternion.setFromUnitVectors(V(0, 1, 0), out.clone().add(V(0, 0.12, 0)).normalize()); F.sack.updateMatrixWorld(true);
  const ctr = new THREE.Box3().setFromObject(F.sack).getCenter(V(0, 0, 0)), want = sh.clone().addScaledVector(out, 0.4).add(V(0, 0.1, 0)).addScaledVector(n, -0.2);
  F.sack.position.copy(want.sub(ctr));
  const grip = sh.clone().addScaledVector(out, 0.5).add(V(0, 0.06, 0)).addScaledVector(n, 0.02);
  const P = reach(c, S, P0, i, grip, x, z, cx, y, extra); hold(F, i + 2, grip, cam); return P;
};
/** a coconut held in both hands in front of the chest (u lifts it from the belly to the chest) */
const holdNut = (cx: Ctx, F: FX, card: ToonCard, S: CharSpec, P0: Pose, nut: THREE.Object3D, r: number, x: number, z: number, y: number, extra: Ex | undefined, u: number, hi: [number, number]) => {
  const { cam } = cx; put(card, S, P0, x, z, cx, y, extra); const n = camDir(cam, x, z), right = V(n.z, 0, -n.x);
  const c = cardPt(card, P0.x, 975 - S.legLen + P0.bob - S.bodyH * lerp(0.3, 0.55, u)).addScaledVector(n, 0.12 + r);
  nut.visible = true; nut.position.copy(c).add(V(0, -r, 0)); nut.rotation.set(0.3, 0.4, 0.15);
  const gl = c.clone().addScaledVector(right, -r * 0.95).add(V(0, -r * 0.15, 0)), gr = c.clone().addScaledVector(right, r * 0.95).add(V(0, -r * 0.15, 0));
  let P = reach(card, S, P0, 0, gl, x, z, cx, y, extra); P = reach(card, S, P, 1, gr, x, z, cx, y, extra); hold(F, hi[0], gl, cam); hold(F, hi[1], gr, cam); return P;
};
/** the phone in one hand at `pos`, its screen turned toward `toward` */
const holdPhone = (cx: Ctx, F: FX, card: ToonCard, S: CharSpec, P0: Pose, x: number, z: number, pos: THREE.Vector3, toward: THREE.Vector3, i: 0 | 1, hi: number, extra?: Ex, y = 0) => {
  F.phone.visible = true; F.phone.position.copy(pos); F.phone.lookAt(toward); const grip = pos.clone().add(V(0, -0.055, 0));
  const P = reach(card, S, P0, i, grip, x, z, cx, y, extra); hold(F, hi, grip, cx.cam); return P;
};
/** world position of a card's head centre */
const headW = (c: ToonCard, S: CharSpec, P: Pose) => { const [x, y] = head(S, P); return cardPt(c, x, y); };
/** crouching: hips drop, knees fold out (k 0..1) */
const crouch = (P: Pose, k: number): Pose => (k <= 0.001 ? P : { ...P, bob: P.bob + 150 * k, body: { ...P.body, lean: P.body.lean + 0.08 * k }, legs: [0, 1].map((i) => { const s = i ? 1 : -1; return { a: [s * (5 + 64 * k), 118 - 66 * k], b: [s * 18 * k, 0] } as Limb; }) as [Limb, Limb] });
/** shaking the head "no" */
const shake = (P: Pose, t: number, t0: number, t1: number, amp = 0.16): Pose => (t < t0 || t > t1 ? P : { ...P, head: { ...P.head, rot: P.head.rot + amp * Math.sin((t - t0) * 13) * Math.sin(Math.PI * (t - t0) / (t1 - t0)), turn: P.head.turn + 0.5 * Math.sin((t - t0) * 13) * Math.sin(Math.PI * (t - t0) / (t1 - t0)) } });
/** cool phone light on the lower face (only on the drawn character, never around it) */
const glowEx = (S: CharSpec, k: number): Ex => (g, P) => { if (k <= 0.01) return; const [x, y] = head(S, P); g.save(); g.globalCompositeOperation = "source-atop"; const gr = g.createRadialGradient(x, y + S.R * 0.9, 0, x, y + S.R * 0.4, S.R * 1.9); gr.addColorStop(0, `rgba(150,190,255,${0.5 * k})`); gr.addColorStop(1, "rgba(150,190,255,0)"); g.fillStyle = gr; g.fillRect(x - S.R * 3, y - S.R * 3, S.R * 6, S.R * 7); g.restore(); };
const nightC = (c: ToonCard) => { c.shade = 0.7; c.liftCol = "150,180,255"; c.shadeCol = "18,22,58"; };
/** a camera that sees two people side by side, perpendicular to the line between them (B on screen right);
 *  shift slides along that line toward B (+) or A (-) */
const twoShot = (A: [number, number], B: [number, number], d: number, o: { h?: number; ly?: number; fov?: number; shift?: number } = {}): P3 => {
  const dx = B[0] - A[0], dz = B[1] - A[1], l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l, nx = -uz, nz = ux, s = o.shift ?? 0, mx = (A[0] + B[0]) / 2 + ux * s, mz = (A[1] + B[1]) / 2 + uz * s;
  return { pos: [mx + nx * d, o.h ?? 1.45, mz + nz * d], look: [mx, o.ly ?? 1.15, mz], fov: o.fov ?? 38 };
};
/** a dry frond falling from a crown: hangs, drops with a tumble, lands flat; returns true on the landing frame range */
const frondFall = (f: THREE.Object3D, c: THREE.Vector3, t: number, t0: number, az: number, dist = 1.4, dur = 1.25) => {
  const u = t - t0; if (u < -0.6) { f.visible = false; return 0; } f.visible = true; const k = Math.max(0, Math.min(1, u / dur)), dirV = V(Math.cos(az), 0, -Math.sin(az));
  const start = c.clone().addScaledVector(dirV, 0.2), land = V(c.x, 0.05, c.z).addScaledVector(dirV, dist);
  f.position.set(lerp(start.x, land.x, k), lerp(start.y, land.y, k * k), lerp(start.z, land.z, k)); f.rotation.set(0.25 * Math.sin(k * 5) * (1 - k), az, lerp(-1.25, 0, sm(k)) + 0.2 * Math.sin(k * 7) * (1 - k));
  return u > dur ? Math.max(0, 1 - (u - dur) / 1.2) : 0;
};
const dustAt = (F: FX, p: THREE.Vector3, t: number, t0: number, n = 10) => { const u = t - t0; if (u < 0 || u > 1.4) return; for (let i = 0; i < n; i++) { const a = i * 2.4, r = 0.2 + u * (0.5 + 0.3 * Math.sin(i)); F.dust.add(V(p.x + Math.cos(a) * r, 0.08 + u * 0.35 * (0.5 + 0.5 * Math.sin(i * 3)), p.z + Math.sin(a) * r), 0.35 + u * 0.7, 0.5 * (1 - u / 1.4), i); } };

// ======================================================================================================
// S1 HOOK (0 - 6): close on the hand: salt flies out and lands in a ring around the palm; pull back to the misty garden.
const D1 = actor(11, [{ t: 0, mood: "neutral", arms: ["rest", "open"], look: [-0.4, 0.4] }]);
const S1: SceneDef = {
  from: 0, to: 6, ...DAY, mk: mkKebun({ salt: true, sick: 1, shadowAt: [1, 0, 1], shadowSize: 10 }),
  keys: [...move(0, 2.0, [{ pos: [2.75, 1.3, 3.15], look: [1.45, 0.95, 0.85], fov: 42 }, { pos: [2.7, 1.32, 3.3], look: [1.35, 0.97, 1.0], fov: 42 }], (x) => x), ...move(2.0, 6, [{ pos: [2.7, 1.32, 3.3], look: [1.35, 0.97, 1.0], fov: 42 }, { pos: [4.2, 1.8, 5.4], look: [0.6, 1.9, 0.9], fov: 44 }, { pos: [5.4, 2.0, 6.6], look: [-0.1, 2.4, 0.4], fov: 44 }])],
  focus: (t) => { const p = darmanAt(walkA(t)); return [p.x, 1.1, p.z]; },
  act: (cx) => {
    const { t } = cx, k = K_(cx), F = k.fx; fxBegin(F); warm(cx.card(0));
    const a = walkA(t); k.ring!.show(Math.min(1, (a + 0.05) / (Math.PI * 2)));
    scatterAct(cx, DARMAN, actAt(D1, t), walkA, t, true, -0.3, 6);
    fxEnd(F);
  },
};

// S2 SICK (6 - 12): tilt up the hero palm (yellow, limp, drooping crown), then Pak Darman with one small nut, flat face.
const D2 = actor(21, [{ t: 0, mood: "worried", arms: ["chest", "chest"], look: [0, 0.5] }, { t: 4.6, mood: "neutral", look: [0.1, -0.6] }]);
const S2: SceneDef = {
  from: 6, to: 12, ...DAY, mk: mkKebun({ salt: true, sick: 1, shadowAt: [0, 0, 1], shadowSize: 9 }), fadeAt: dip(6, 0.2, 0),
  keys: [...move(0, 3.4, [{ pos: [2.1, 0.9, 3.4], look: [0, 1.5, 0], fov: 40 }, { pos: [3.0, 1.6, 5.4], look: [0, 4.2, 0], fov: 42 }, { pos: [3.6, 2.4, 6.9], look: [0, 6.4, 0], fov: 42 }]), ...hold1(3.4, 6, { pos: [1.85, 1.45, 4.9], look: [0.7, 1.25, 1.85], fov: 32 }, [-0.04, 0, -0.08])],
  focus: (t) => (t < 3.4 ? [0, 1.5 + 5 * at(t, 0, 3.4), 0] : [0.7, 1.25, 1.85]),
  act: (cx) => {
    const { t } = cx, k = K_(cx), F = k.fx; fxBegin(F); warm(cx.card(0)); k.ring!.show(1);
    if (t < 3.4) { cx.card(0).setVisible(false); fxEnd(F); return; }
    holdNut(cx, F, cx.card(0), DARMAN, actAt(D2, t), F.nut, 0.1, 0.7, 1.85, 0, capingEx, 1, [0, 1]);
    fxEnd(F);
  },
};

// S3 THE WATCHER (12 - 28): Pak Karto, whose own garden is just as sick, watches from the boundary path.
//   a 0-5 two-shot: Karto (left, hoe) watches Darman scattering   b 5-7 day 1: puzzled, hand on chin
//   c 7-11.5 day 3: deeper along the path, counting the ringed palms with his finger
//   d 11.5-16 day 7: crouched at a ring, dabs the soil, licks: salty! (squeezed eyes, tongue, shudder)
const K3a = actor(31, [{ t: 0, mood: "suspicious", arms: ["rest", "rest"], turn: 0.45, look: [0.85, 0.05] }, { t: 5.0, mood: "worried", arms: ["rest", "chin"], turn: 0.3, look: [0.7, 0.2] }, { t: 6.4, mood: "suspicious", turn: 0.35, look: [0.8, 0.1] }]);
const K3c = actor(32, [{ t: 0, mood: "suspicious", arms: ["point", "rest"], turn: -0.4, look: [-0.9, 0.1] }, { t: 1.2, look: [-0.6, 0.1] }, { t: 1.9, look: [-0.3, 0.05] }, { t: 2.6, look: [-0.95, 0.15] }, { t: 3.3, mood: "surprised", look: [-0.5, 0.1] }, { t: 4.0, look: [-0.75, 0.1] }]);
const K3d = actor(33, [{ t: 0, mood: "suspicious", arms: ["rest", "rest"], turn: 0.3, look: [0.6, 0.6] }, { t: 1.6, mood: "suspicious", arms: ["rest", "mouthHand"], look: [0.2, -0.2] }, { t: 2.5, mood: "neutral", look: [0, -0.3] },
  { t: 2.9, mood: "shock", arms: ["open", "open"], look: [0, -0.2], event: "shockSmall" }, { t: 3.9, mood: "worried", arms: ["rest", "rest"], look: [0.7, 0.2] }]);
const D3 = actor(34, [{ t: 0, mood: "neutral", arms: ["rest", "open"], look: [-0.4, 0.4] }]);
const K_A: [number, number] = [-2.85, 1.35], D3A = (t: number) => 2.75 + 0.06 * t, D3P: [number, number] = [darmanAt(2.9).x, darmanAt(2.9).z], CROUCH: [number, number] = [-1.55, 0.45];
const S3: SceneDef = {
  from: 12, to: 28, ...DAY, mk: mkKebun({ salt: true, rings: true, sick: 1, sickK: 1, shadowAt: [-1.5, 0, 0], shadowSize: 12 }), fadeAt: dip(16, 0.2, 0),
  keys: [...hold1(0, 5, twoShot(K_A, D3P, 4.9, { h: 1.5, ly: 1.2, fov: 40 }), [0.1, 0, -0.06]), ...hold1(5, 7, twoShot(K_A, D3P, 2.3, { shift: -0.72, h: 1.45, ly: 1.3, fov: 34 }), [0.03, 0, -0.06]),
    ...hold1(7, 11.5, { pos: [-4.7, 1.75, -1.7], look: [-1.6, 1.15, -5.6], fov: 42 }, [0.08, 0, -0.08]), ...hold1(11.5, 16, { pos: [-1.3, 0.8, 3.05], look: [-1.45, 0.58, 0.4], fov: 38 }, [-0.05, 0, -0.08])],
  focus: (t) => (t < 7 ? [K_A[0], 1.3, K_A[1]] : t < 11.5 ? [BOUND_X + 0.2, 1.3, -3.6] : [CROUCH[0], 0.7, CROUCH[1]]),
  act: (cx) => {
    const { t, cam } = cx, k = K_(cx), F = k.fx; fxBegin(F); warm(cx.card(0)); warm(cx.card(1)); k.ring!.show(1);
    if (t < 7) {
      scatterAct(cx, DARMAN, actAt(D3, t), D3A, t, true, -0.3, 7, 1);
      kartoWithHoe(cx, actAt(K3a, t), K_A[0], K_A[1], cx.card(0), { moving: false, ph: 0 });
    } else if (t < 11.5) {
      cx.card(1).setVisible(false); const u = t - 7;
      put(cx.card(0), KARTO, actAt(K3c, u), BOUND_X + 0.15, -3.6, cx);
    } else {
      cx.card(1).setVisible(false); const u = t - 11.5, ck = at(u, 0.1, 0.7), sx = shockEx(KARTO, at(u, 2.9, 3.05) * (1 - at(u, 3.7, 4.1)));
      let P = crouch(actAt(K3d, u), ck); if (u > 2.9 && u < 3.9) P = { ...P, eyes: [{ kind: "squeeze" }, { kind: "squeeze" }], mouth: { kind: "tongue", open: 0.6 }, head: { ...P.head, rot: P.head.rot + 0.06 * Math.sin(u * 40) } };
      put(cx.card(0), KARTO, P, CROUCH[0], CROUCH[1], cx, 0, sx);
      const dab = V(-1.08, 0.02, 0.32), wd = at(u, 0.7, 1.1) * (1 - at(u, 1.5, 1.8)); if (wd > 0.01) { P = reach(cx.card(0), KARTO, P, 1, dab, CROUCH[0], CROUCH[1], cx, 0, sx, wd); }
      const wm = at(u, 1.7, 2.0) * (1 - at(u, 2.8, 3.0)); if (wm > 0.01) { const [hx, hy] = head(KARTO, P); const mouth = cardPt(cx.card(0), hx + 8, hy + KARTO.R * 0.42).addScaledVector(camDir(cam, CROUCH[0], CROUCH[1]), 0.06); P = reach(cx.card(0), KARTO, P, 1, mouth, CROUCH[0], CROUCH[1], cx, 0, sx, wm); }
      if (wd > 0.01) hold(F, 1, handWorld(cx.card(0), KARTO, P, 1), cam); hoeDown(F, -2.9, 1.9, 0.3);
    }
    fxEnd(F);
  },
};

// S4 NIGHT SEARCH (28 - 35.5): his house at night, lit windows, a porch bulb; his face lit by the phone; the eyes widen.
//   a 0-2.8 wide   b 2.8-5.2 close on his face   c 5.2-7.5 insert on the phone screen (pictures of salted dead grass)
const KHOUSE: [number, number] = [15, 14.4];
const K4 = actor(41, [{ t: 0, mood: "suspicious", arms: ["chest", "chest"], look: [0.1, 0.7] }, { t: 3.9, mood: "surprised", look: [0, 0.7] }, { t: 4.4, mood: "shock", look: [0, 0.6], event: "shockSmall" }]);
const mkNight = () => () => { const k = mkKebun({ night: true, sick: 1, shadowAt: [KHOUSE[0], 0, KHOUSE[1]], shadowSize: 9 })() as unknown as KebunSet & WithFx;
  const bulb = new THREE.PointLight("#ffb866", 2.2, 7, 2); bulb.position.set(KHOUSE[0] + 0.9, 2.5, 15.0); bulb.castShadow = true; bulb.shadow.mapSize.set(1024, 1024); bulb.shadow.bias = -0.002; k.root.add(bulb);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.6, 0.9), toneMapped: false })); glass.position.copy(bulb.position); k.root.add(glass);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.4, 5), new THREE.MeshStandardMaterial({ color: "#222" })); cord.position.copy(bulb.position).add(V(0, 0.23, 0)); k.root.add(cord); return k as unknown as SetLike; };
const NIGHT = { fog: "#141a30", dens: 0.012, bg: "#0c1224", cInf: 3, env: 0.12, exposure: 0.0, bloom: 1.1, sat: 0.2, contrast: 0.14, grade: [[0.3, 0.38, 0.6], [0.7, 0.55, 0.4], 0.35] as [V3, V3, number] };
const S4: SceneDef = {
  from: 28, to: 35.5, ...NIGHT, mk: mkNight(), fadeAt: dip(7.5, 0.35, 0),
  keys: [...hold1(0, 2.8, { pos: [13.7, 1.75, 9.9], look: [15.1, 2.1, 15.2], fov: 46 }, [0.12, 0, 0.15]), ...hold1(2.8, 5.2, { pos: [14.85, 1.52, 12.75], look: [15, 1.45, 14.4], fov: 34 }, [0, 0, 0.12]),
    ...hold1(5.2, 7.5, { pos: [15.02, 1.25, 13.62], look: [15, 1.18, 14.05], fov: 30 }, [0, 0, 0.05])],
  focus: (t) => (t < 5.2 ? [KHOUSE[0], 1.4, KHOUSE[1]] : [15, 1.18, 14.05]),
  act: (cx) => {
    const { t, cam } = cx, F = K_(cx).fx; fxBegin(F); nightC(cx.card(0));
    const P0 = actAt(K4, t), sx = both(glowEx(KARTO, 1), shockEx(KARTO, at(t, 4.4, 4.55) * (1 - at(t, 5.0, 5.2))));
    put(cx.card(0), KARTO, P0, KHOUSE[0], KHOUSE[1], cx, 0, sx);
    const n = camDir(cam, KHOUSE[0], KHOUSE[1]), hw = headW(cx.card(0), KARTO, P0), ph = hw.clone().add(V(0, -0.36, 0)).addScaledVector(n, 0.2);
    F.phone.visible = true; F.phone.position.copy(ph); F.phone.lookAt(hw.clone().addScaledVector(n, -0.3)); F.phone.rotateX(-0.25);
    const right = V(n.z, 0, -n.x), gl = ph.clone().addScaledVector(right, -0.045).add(V(0, -0.05, 0)), gr = ph.clone().addScaledVector(right, 0.045).add(V(0, -0.05, 0));
    let P = reach(cx.card(0), KARTO, P0, 0, gl, KHOUSE[0], KHOUSE[1], cx, 0, sx); P = reach(cx.card(0), KARTO, P, 1, gr, KHOUSE[0], KHOUSE[1], cx, 0, sx); hold(F, 0, gl, cam, 0.8); hold(F, 1, gr, cam, 0.8);
    F.glow.position.copy(ph).addScaledVector(n, -0.08); F.glow.intensity = 1.2;
    if (t > 5.2) { cx.card(0).setVisible(false); F.hands[0].visible = F.hands[1].visible = false; F.phone.position.set(15, 1.18, 14.05); F.phone.lookAt(cam.position); F.phone.rotateZ(0.06); hold(F, 0, V(14.962, 1.118, 14.07), cam, 0.22); hold(F, 1, V(15.04, 1.112, 14.07), cam, 0.22); F.glow.position.set(15, 1.2, 13.9); }
    fxEnd(F);
  },
};

// S5 THE WARNING (35.5 - 44.5), dawn: Karto runs in and holds the phone up to Darman's face. Darman reads, nods, no smile,
//   turns back and goes on scattering. Karto is left with his mouth open.
const D5POS = 1.0, KEND: [number, number] = [-0.12, 1.78];
const K5 = actor(51, [{ t: 0, mood: "worried", arms: ["rest", "rest"], turn: 0.4, look: [0.9, 0] }, { t: 1.6, mood: "angry", arms: ["rest", "rest"], turn: 0.5, look: [0.9, -0.05] }, { t: 3.2, mood: "worried", look: [0.9, 0] },
  { t: 5.7, mood: "surprised", look: [0.9, 0.1] }, { t: 6.6, mood: "shock", arms: ["rest", "rest"], turn: 0.35, look: [0.8, 0.15] }]);
const D5 = actor(52, [{ t: 0, mood: "neutral", arms: ["rest", "open"], look: [-0.4, 0.4] }, { t: 1.4, mood: "neutral", turn: -0.45, look: [-0.85, 0] }, { t: 2.2, mood: "suspicious", turn: -0.5, look: [-0.7, -0.15] },
  { t: 5.6, mood: "neutral", turn: 0.1, look: [0.3, 0.45] }]);
const S5: SceneDef = {
  from: 35.5, to: 44.5, ...DAY, mk: mkKebun({ salt: true, rings: true, sick: 1, sickK: 1, sunH: 0.3, shadowAt: [0.4, 0, 1.6], shadowSize: 9 }), fadeAt: dip(9, 0.35, 0),
  keys: [...hold1(0, 6.0, twoShot(KEND, [darmanAt(D5POS).x, darmanAt(D5POS).z], 4.3, { h: 1.45, ly: 1.2, fov: 38 }), [0.08, 0, -0.06]), ...hold1(6, 9, twoShot(KEND, [darmanAt(D5POS).x, darmanAt(D5POS).z], 2.1, { shift: -0.75, h: 1.45, ly: 1.25, fov: 34 }), [0.03, 0, -0.06])],
  focus: (t) => (t < 6 ? [0.4, 1.3, 1.6] : [KEND[0], 1.3, KEND[1]]),
  act: (cx) => {
    const { t, cam } = cx, k = K_(cx), F = k.fx; fxBegin(F); warm(cx.card(0)); warm(cx.card(1)); k.ring!.show(1);
    // Darman: scatters, stops, reads, nods, goes back to it
    let PD = actAt(D5, t); PD = nod(PD, t, 4.75, 2, 16);
    PD = scatterAct(cx, DARMAN, PD, () => D5POS, t, false, t < 3 ? -0.5 : 6.0, t < 3 ? 1.3 : 9.5, 0);
    // Karto: runs in from the boundary path, holds the phone up at Darman's face, then lowers it
    const w = path(t, 0, 1.6, [BOUND_X, 3.0], KEND, 0.95); let PK = goTo(actAt(K5, t), w, 1.25);
    const hd = headW(cx.card(0), DARMAN, PD), n = camDir(cam, KEND[0], KEND[1]), toK = V(KEND[0] - hd.x, 0, KEND[1] - hd.z).normalize();
    const up = at(t, 1.6, 2.2) * (1 - at(t, 6.0, 6.8)), atFace = hd.clone().addScaledVector(toK, 0.3).addScaledVector(n, 0.06).add(V(0, -0.02, 0));
    put(cx.card(1), KARTO, PK, w.x, w.z, cx); const low = cardPt(cx.card(1), PK.x + KARTO.bodyW * 0.55, 975 - KARTO.legLen + PK.bob - KARTO.bodyH * 0.35).addScaledVector(n, 0.1);
    PK = holdPhone(cx, F, cx.card(1), KARTO, PK, w.x, w.z, low.clone().lerp(atFace, up), up > 0.5 ? hd.clone().addScaledVector(camDir(cam, hd.x, hd.z), 1.2) : low.clone().add(V(0, 0.3, 0)).addScaledVector(n, 0.4), 1, 2);
    F.glow.position.copy(F.phone.position); F.glow.intensity = 0.25 * up;
    fxEnd(F);
  },
};

// S6 WARUNG (44.5 - 52.5): Darman comes out with a whole sack; the young mother finds the salt rack empty; Bu Warung and
//   the mother whisper, glancing at him walking away down the road.
const RACK = WARUNG.clone().add(V(-2.55, 0.18, 0.9));
const BU_SPOT: [number, number] = [2.4, 14.65];
const IBU_SPOT: [number, number] = [1.3, 13.4];
const D6 = actor(61, [{ t: 0, mood: "neutral", arms: ["rest", "rest"], look: [-0.3, 0.1] }]);
const B6 = actor(62, [{ t: 0, mood: "surprised", arms: ["chest", "chest"], look: [-0.7, 0.1] }, { t: 0.4, mood: "shock", event: "shockSmall", look: [-0.8, 0.1] }, { t: 1.6, mood: "worried", look: [-0.7, 0.1] }, { t: 4.4, mood: "worried", arms: ["shrug", "shrug"], look: [-0.6, 0] },
  { t: 6.0, mood: "whisper", arms: ["rest", "mouthHand"], turn: 0.45, look: [0.8, 0.15] }, { t: 7.1, look: [-0.8, 0.3] }]);
const I6 = actor(63, [{ t: 0, mood: "neutral", arms: ["rest", "rest"], look: [-0.5, 0] }, { t: 3.9, mood: "surprised", arms: ["rest", "point"], look: [-0.8, -0.2] }, { t: 4.8, mood: "worried", arms: ["rest", "rest"], look: [0.6, 0.1] },
  { t: 6.0, mood: "whisper", arms: ["chest", "rest"], turn: -0.4, look: [-0.8, 0.05] }, { t: 7.0, look: [-0.8, 0.3] }]);
const S6: SceneDef = {
  from: 44.5, to: 52.5, ...DAY, mk: mkKebun({ salt: true, sick: 1, shadowAt: [2, 0, 12], shadowSize: 10 }), fadeAt: dip(8, 0.3, 0),
  keys: [...hold1(0, 3.6, { pos: [3.4, 1.55, 7.0], look: [3.4, 1.3, 13.0], fov: 40 }, [0, 0, -0.1]), ...hold1(3.6, 6.0, { pos: [1.6, 1.5, 9.0], look: [1.55, 1.1, 14.3], fov: 40 }, [0.03, 0, 0.08]),
    ...hold1(6, 8, { pos: [1.85, 1.55, 9.9], look: [1.85, 1.3, 14.0], fov: 40 }, [0.04, 0, 0.06])],
  focus: (t) => (t < 3.6 ? [3.1, 1.3, 11.0] : [1.8, 1.2, 14.0]),
  act: (cx) => {
    const { t } = cx, k = K_(cx), F = k.fx; fxBegin(F); [0, 1, 2].forEach((i) => warm(cx.card(i))); k.shelfSalt.visible = false; void RACK;
    put(cx.card(1), WARUNG_BU, actAt(B6, t), BU_SPOT[0], BU_SPOT[1], cx, 0.18, shockEx(WARUNG_BU, at(t, 0.4, 0.6) * (1 - at(t, 1.2, 1.6))));
    // Darman: out from the warung to the road and away along it, sack on the right shoulder (slightly bent under it)
    const w = t < 2.4 ? path(t, 0, 2.4, [3.5, 13.0], [3.0, 10.5], 0.55) : path(t, 2.4, 8, [3.0, 10.5], [-3.2, 10.0], 0.55); let PD = goTo(actAt(D6, t), w, 0.7); PD = { ...PD, body: { ...PD.body, lean: PD.body.lean + 0.06 } };
    if (t < 3.6 || t > 6.0) sackOnShoulder(cx, F, cx.card(0), DARMAN, PD, w.x, w.z, 1, 0, capingEx); else cx.card(0).setVisible(false);
    const wi = path(t, 1.6, 4.3, [5.4, 11.4], IBU_SPOT, 0.55); const PI = goTo(actAt(I6, t), wi, 0.85); if (t > 1.6) put(cx.card(2), IBU, PI, wi.x, wi.z, cx); else cx.card(2).setVisible(false);
    fxEnd(F);
  },
};

// S7 THE FALSE SIGN (52.5 - 60): a month later the dry fronds start falling; Karto, arms crossed, shakes his head.
const K7 = actor(71, [{ t: 0, mood: "suspicious", arms: ["hug", "hug"], turn: 0.4, look: [0.8, -0.2] }, { t: 1.4, mood: "smug", look: [0.6, 0.1] }, { t: 3.2, mood: "suspicious", look: [0.85, -0.25] }]);
const S7: SceneDef = {
  from: 52.5, to: 60, ...DAY, mk: mkKebun({ salt: true, rings: true, sick: 1, sickK: 1, fronds: 30, shadowAt: [-1, 0, 0.5], shadowSize: 10 }), fadeAt: dip(7.5, 0.3, 0),
  keys: [...hold1(0, 3.4, { pos: [2.3, 0.55, 3.3], look: [0.2, 4.6, 0.1], fov: 50 }, [0.04, 0.02, 0.06]), ...hold1(3.4, 7.5, { pos: [-6.0, 1.45, 3.4], look: [-1.93, 1.4, 0.5], fov: 40 }, [0.06, 0, -0.06])],
  focus: (t) => (t < 3.4 ? [0.6, 2.5, 0.6] : [BOUND_X, 1.3, 1.0]),
  act: (cx) => {
    const { t } = cx, k = K_(cx), F = k.fx; fxBegin(F); warm(cx.card(0)); k.ring!.show(1);
    const c = k.palms[0].crown, land = frondFall(F.frond, c, t, 0.55, -0.85, 1.5); dustAt(F, V(c.x, 0, c.z).add(V(Math.cos(-0.85) * 1.5, 0, Math.sin(0.85) * 1.5)), t, 1.8, 12); void land;
    if (t < 3.4) { cx.card(0).setVisible(false); fxEnd(F); return; }
    const u = t - 3.4; let P = actAt(K7, u); P = shake(P, u, 0.9, 2.3);
    put(cx.card(0), KARTO, P, BOUND_X, 1.0, cx);
    const c2 = k.palms.find((p) => !p.side && p.z < -4 && p.z > -9 && p.x > -1)?.crown ?? c; frondFall(F.frond2, c2, u, 0.4, 0.3, 1.4); dustAt(F, V(c2.x + Math.cos(0.3) * 1.4, 0, c2.z - Math.sin(0.3) * 1.4), u, 1.65, 10);
    fxEnd(F);
  },
};

// S8 TIME PASSES (60 - 67): one locked wide shot along the boundary path; the sun swings, rain comes and goes, Karto pops
//   up in a new spot each week, Darman keeps scattering, and Darman's crowns slowly turn green while Karto's stay yellow.
const K8 = actor(81, [{ t: 0, mood: "suspicious", arms: ["rest", "rest"], turn: 0.45, look: [0.85, 0] }, { t: 1.8, mood: "worried", arms: ["hug", "hug"], look: [0.8, 0.1] }, { t: 3.9, mood: "suspicious", arms: ["rest", "rest"], look: [0.9, -0.1] }, { t: 5.5, mood: "surprised", arms: ["rest", "chin"], look: [0.8, -0.3] }]);
const D8 = actor(82, [{ t: 0, mood: "neutral", arms: ["rest", "open"], look: [-0.4, 0.4] }]);
const SPOTS: [number, number, number, number][] = [[0, 1.8, BOUND_X - 0.45, 1.2], [1.8, 3.9, BOUND_X + 0.25, -3.4], [3.9, 5.5, BOUND_X - 0.2, -1.0], [5.5, 7.1, BOUND_X + 0.35, 0.4]];
const S8: SceneDef = {
  from: 60, to: 67, ...DAY, mk: mkKebun({ salt: true, rings: true, sick: 1, sickK: 1, rain: true, shadowAt: [-1, 0, -2], shadowSize: 14 }), fadeAt: dip(7, 0.3, 0),
  keys: [...hold1(0, 7, { pos: [-3.6, 2.5, 7.4], look: [-1.6, 1.9, -6], fov: 48 }, [0, 0, -0.05])],
  focus: () => [-1.8, 1.3, 0],
  act: (cx) => {
    const { t } = cx, k = K_(cx), F = k.fx; fxBegin(F); warm(cx.card(0)); warm(cx.card(1)); k.ring!.show(1);
    const gd = 1 - 0.6 * at(t, 0.6, 6.6); k.setGarden(gd, 1); k.sunTurn(0.75 * Math.sin((t / 3.5) * Math.PI * 2), 0.42 + 0.12 * Math.cos((t / 3.5) * Math.PI * 2));
    const rain = at(t, 1.7, 2.1) * (1 - at(t, 3.6, 4.0)); k.sun.intensity = 3.6 * (1 - 0.7 * rain); k.rainAt(t, rain, V(-1.5, 0, 1), 7, 6, 6);
    scatterAct(cx, DARMAN, actAt(D8, t), (tt) => 0.3 + 1.1 * tt, t, true, -0.3, 7, 1);
    const sp = SPOTS.find(([a, b]) => t >= a && t < b) ?? SPOTS[3]; let P = actAt(K8, t); if (sp === SPOTS[2]) P = crouch(P, 1);
    put(cx.card(0), KARTO, P, sp[2], sp[3], cx);
    fxEnd(F);
  },
};

// S9 TWO YEARS LATER (67 - 79): from above: Darman's side lush and heavy with nuts, Karto's still yellow; the full crown;
//   the buyer's pickup; Karto in his own yellow garden with a small nut, looking across.
const T9 = actor(91, [{ t: 0, mood: "excited", arms: ["rest", "up"], look: [0.6, 0] }, { t: 1.4, mood: "laugh", arms: ["rest", "up"] }]);
const D9 = actor(92, [{ t: 0, mood: "neutral", arms: ["rest", "rest"], look: [-0.6, 0] }]);
const K9 = actor(93, [{ t: 0, mood: "worried", arms: ["chest", "chest"], turn: 0.45, look: [0.85, -0.1] }, { t: 1.2, mood: "suspicious", look: [0.9, -0.2] }]);
const S9: SceneDef = {
  from: 67, to: 79, ...DAY, mk: mkKebun({ salt: false, sick: 0, sickK: 1, truck: true, fronds: 14, shadowAt: [-2.5, 0, 2], shadowSize: 14 }), fadeAt: dip(12, 0.35, 0),
  keys: [...move(0, 4.5, [{ pos: [-3.3, 12.5, 13], look: [-3.3, 1, -14], fov: 50 }, { pos: [-3.3, 9.5, 9.2], look: [-3.3, 1.8, -14], fov: 50 }], (x) => x), ...hold1(4.5, 7.5, { pos: [3.2, 3.0, 6.4], look: [0, 6.2, 0], fov: 40 }, [0.05, 0.04, 0.05]),
    ...hold1(7.5, 10, { pos: [1.6, 2.6, 1.5], look: [-2.6, 1.15, 8.4], fov: 42 }, [-0.12, 0, 0.18]), ...hold1(10, 12, { pos: [-5.0, 1.45, 3.6], look: [-5.9, 1.3, -0.6], fov: 36 }, [0.05, 0, -0.06])],
  focus: (t) => (t < 4.5 ? [-3.3, 2, -4] : t < 7.5 ? [0, 6, 0] : t < 10 ? [-2.2, 1.3, 7.0] : [-6.0, 1.3, -0.4]),
  act: (cx) => {
    const { t } = cx, F = K_(cx).fx; fxBegin(F); [0, 1].forEach((i) => warm(cx.card(i)));
    if (t < 7.5) { cx.card(0).setVisible(false); cx.card(1).setVisible(false); fxEnd(F); return; }
    if (t < 10) { const u = t - 7.5; put(cx.card(0), TENGKULAK, actAt(T9, u), -3.0, 7.3, cx); put(cx.card(1), DARMAN, actAt(D9, u), -1.5, 6.6, cx, 0, capingEx); fxEnd(F); return; }
    cx.card(1).setVisible(false); holdNut(cx, F, cx.card(0), KARTO, actAt(K9, t - 10), F.nut, 0.1, -6.0, -0.4, 0, undefined, 1, [0, 1]);
    fxEnd(F);
  },
};

// S10 THE QUESTION (79 - 87): on the cross path between the two gardens: "Dar... kok bisa?" Darman, flat:
//   "Pernah lihat kelapa di pinggir pantai yang kurus?" then he looks off into the distance.
const KQ = say("Dar... kok bisa?", 1.4, 3.0, [2]), DQ = say("Pernah lihat kelapa di pinggir pantai yang kurus?", 4.1, 6.9, [4, 6]);
const KA: [number, number] = [-3.9, 2.95], DA: [number, number] = [-2.75, 2.85];
const K10 = actor(101, [{ t: 0, mood: "worried", arms: ["rest", "rest"], turn: 0.5, look: [0.85, 0] }, { t: 1.3, mood: "worried", arms: ["rest", "open"] }, { t: 3.4, mood: "suspicious", arms: ["rest", "rest"] }, { t: 7.2, mood: "suspicious", look: [0.9, -0.2] }], KQ);
const D10 = actor(102, [{ t: 0, mood: "neutral", arms: ["rest", "rest"], turn: -0.5, look: [-0.85, 0] }, { t: 7.1, mood: "neutral", turn: 0.45, look: [0.9, -0.25] }], DQ);
const S10: SceneDef = {
  from: 79, to: 87, ...DAY, mk: mkKebun({ salt: false, sick: 0, sickK: 1, fronds: 14, shadowAt: [-3.3, 0, 2], shadowSize: 10 }), fadeAt: dip(8, 0.3, 0),
  keys: [...hold1(0, 3.8, twoShot(KA, DA, 4.3, { h: 1.45, ly: 1.2, fov: 38 }), [0.06, 0, -0.06]), ...hold1(3.8, 8, twoShot(KA, DA, 2.0, { shift: 0.75, h: 1.45, ly: 1.28, fov: 34 }), [0.03, 0, -0.06])],
  focus: (t) => (t < 3.8 ? [-3.3, 1.3, 2.9] : [DA[0], 1.3, DA[1]]),
  act: (cx) => {
    const { t } = cx, F = K_(cx).fx; fxBegin(F); warm(cx.card(0)); warm(cx.card(1));
    put(cx.card(0), KARTO, actAt(K10, t), KA[0], KA[1], cx); put(cx.card(1), DARMAN, actAt(D10, t), DA[0], DA[1], cx, 0, capingEx);
    fxEnd(F);
  },
};

// S11a THE COAST (87 - 94.5): a coconut coast thick with lush palms heavy with nuts; waves break and the salty spray
//   blows inland through the crowns.
const sprayFx = (F: FX, t: number, cam: THREE.Camera, mist = 1) => {
  for (let i = 0; i < 40; i++) { const per = 1.6 + (i % 5) * 0.23, ph = ((t + i * 0.37) % per) / per, x = ((i * 2.71) % 9) - 4.5, z = SHORE - 0.4 + ((i * 0.53) % 1) * 0.8;
    F.puff.add(V(x + ph * 0.3, 0.1 + 0.9 * Math.sin(ph * Math.PI) * (0.5 + 0.5 * ((i * 0.37) % 1)), z + ph * 0.5), 0.35 + 1.1 * ph, 0.6 * Math.sin(ph * Math.PI) * (1 - ph * 0.5), i); }
  for (let i = 0; i < 140 && mist > 0; i++) { const ph = (t * 0.14 + i / 140) % 1, x = ((i * 37.7) % 16) - 8 + 0.8 * Math.sin(i * 1.7), z = SHORE - 0.6 + ph * 20, y = 0.3 + ph * ph * 7 + 0.4 * Math.sin(i * 3.1 + t), s = 1.0 + 3.2 * ph;
    const p = V(x, y, z), d = p.distanceTo(cam.position); if (d < 4.5) continue;
    F.mist.add(p, s, mist * 0.24 * Math.min(1, (d - 4.5) / 3) * Math.sin(Math.min(1, ph * 1.3) * Math.PI) * (0.55 + 0.45 * Math.sin(i * 5.3) ** 2), i); }
};
const S11a: SceneDef = {
  from: 87, to: 94.5, ...COAST, mk: mkPantai({ shadowAt: [0, 0, 4], shadowSize: 16 }), fadeAt: dip(7.5, 0.35, 0),
  keys: [...move(0, 3.6, [{ pos: [2.6, 2.3, SHORE - 0.6], look: [-6, 2.2, SHORE + 7.5], fov: 50 }, { pos: [2.2, 2.25, SHORE - 0.2], look: [-6, 2.3, SHORE + 7.8], fov: 49 }], (x) => x),
    ...hold1(3.6, 7.5, { pos: [1.5, 1.3, -1.0], look: [-0.5, 5.0, 8.0], fov: 46 }, [0, 0.1, 0.15])],
  focus: (t) => (t < 3.6 ? [0, 3, 6] : [0, 4, 5]),
  act: (cx) => { const { t } = cx, k = PT_(cx), F = k.fx; fxBegin(F); k.update(t + 87); sprayFx(F, t, cx.cam, t < 3.6 ? 0.6 : 1); fxEnd(F); },
};
// S11b FAR FROM THE SEA (94.5 - 98): high over the inland gardens, hills to the horizon, no sea anywhere.
const S11b: SceneDef = {
  from: 94.5, to: 98, ...DAY, mk: mkKebun({ salt: true, sick: 1, sickK: 1, shadowAt: [0, 0, -10], shadowSize: 30 }), fadeAt: dip(3.5, 0.25, 0),
  keys: [...move(0, 3.5, [{ pos: [9, 24, 20], look: [0, 4, -40], fov: 50 }, { pos: [6.5, 21.5, 13.5], look: [0, 3, -50], fov: 50 }], (x) => x)],
  act: (cx) => { const F = K_(cx).fx; fxBegin(F); fxEnd(F); },
};

// S12a THE MECHANISM (98 - 105.5): a dug pit in front of the palm. Rain falls on the surface only; the salt crystals
//   melt; the wet front soaks down the cut face; water beads seep through the soil to the roots; glowing chloride enters
//   the roots and climbs the trunk.
const S12a: SceneDef = {
  from: 98, to: 105.5, ...PIT, mk: mkKebun({ salt: true, sick: 1, pit: true, shadowAt: [0, 0, 1], shadowSize: 5 }), fadeAt: dip(7.5, 0.3, 0),
  keys: [...move(0, 7.5, [{ pos: [0.5, 0.42, 2.75], look: [0, -0.35, 0.3], fov: 42 }, { pos: [0.35, 0.22, 2.35], look: [0, -0.45, 0.35], fov: 40 }], (x) => x)],
  focus: () => [0, -0.4, 0.45],
  act: (cx) => {
    const { t } = cx, k = K_(cx), F = k.fx; fxBegin(F); k.ring!.mesh.visible = false;
    const pit = k.pitInfo!, cr2 = k.crystals!, T = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    // salt crystals on the ground ring (outside the pit), melting in the rain
    let n = 0; const melt = 1 - at(t, 0.9, 3.3);
    for (let i = 0; i < 500 && melt > 0.02; i++) { const a = (i / 500) * Math.PI * 2 + Math.sin(i * 9.1) * 0.02, rr = RING_R + Math.sin(i * 3.7) * 0.1, x = Math.cos(a) * rr, z = Math.sin(a) * rr; if (z > 0.38 && x > -1.5 && x < 1.5) continue;
      const s = (0.012 + 0.012 * (0.5 + 0.5 * Math.sin(i * 1.3))) * melt; e.set(i, i * 2, i * 3); q.setFromEuler(e); T.compose(V(x, s * 0.4, z), q, V(s, s, s)); cr2.setMatrixAt(n++, T); }
    cr2.count = n; cr2.instanceMatrix.needsUpdate = true;
    // rain: ONLY above the ground behind the cut (it lands on the surface, never falls into the pit or the soil)
    const dr = k.drops!; let m = 0; const rain = at(t, 0.0, 0.5) * (1 - at(t, 4.6, 5.6));
    for (let i = 0; i < 300 && rain > 0.01; i++) { const ph = ((t * 2.4 + i * 0.137) % 1), x = ((i * 0.618) % 1) * 3.2 - 1.6, z = -1.4 + ((i * 0.377) % 1) * 1.75, y = 0.05 + 2.2 * (1 - ph); if ((i % 7) / 7 > rain) continue;
      T.compose(V(x, y, z), new THREE.Quaternion(), V(1, 1, 1)); dr.setMatrixAt(m++, T); }
    dr.count = m; dr.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 18 && rain > 0.2; i++) { const ph = ((t * 3 + i * 0.29) % 1), x = -1.3 + ((i * 0.61) % 1) * 2.6, z = -0.9 + ((i * 0.37) % 1) * 1.2; F.puff.add(V(x, 0.02 + ph * 0.04, z), 0.02 + 0.03 * ph, 0.35 * (1 - ph)); }
    // the wet front soaking down the cut face
    k.wet!.scale.y = Math.max(0.001, at(t, 1.2, 5.4) * 0.92);
    // water beads seeping down through the soil (just behind the face, following the wet front) toward the roots
    const bd = k.beads!; let b = 0;
    for (let i = 0; i < 60; i++) { const st = 1.5 + (i % 20) * 0.12 + Math.floor(i / 20) * 0.6, u = (t - st) / 2.6; if (u < 0 || u > 1) continue; const x = -1.25 + ((i * 0.618) % 1) * 2.5, y = -0.02 - u * 0.8 * (0.7 + 0.3 * ((i * 0.37) % 1));
      T.compose(V(x + 0.03 * Math.sin(u * 9 + i), y, pit.face + 0.012), new THREE.Quaternion(), V(1, 1.25, 1).multiplyScalar(0.8 + 0.4 * ((i * 0.73) % 1))); bd.setMatrixAt(b++, T); }
    bd.count = b; bd.instanceMatrix.needsUpdate = true;
    // glowing chloride: from the soaked soil into the root tips, along the roots to the trunk, up the trunk
    const io = k.ions!; let c = 0;
    for (let i = 0; i < 120; i++) { const start = 3.0 + (i % 40) * 0.06 + Math.floor(i / 40) * 0.4, u = (t - start) / 3.0; if (u < 0 || u > 1) continue;
      const root = pit.roots[i % pit.roots.length], end = root.getPoint(0.95), top = V(end.x * 0.6 + Math.sin(i) * 0.05, -0.1, pit.face + 0.008);
      let p: THREE.Vector3; if (u < 0.25) p = top.clone().lerp(V(end.x, end.y, pit.face + 0.008), u / 0.25); else if (u < 0.8) p = root.getPoint(0.95 - 0.95 * ((u - 0.25) / 0.55)).add(V(0, 0, 0.012)); else p = V(0, -0.05 + (u - 0.8) * 3.5, 0.32);
      T.compose(p, new THREE.Quaternion(), V(1, 1, 1).multiplyScalar(0.7 + 0.5 * Math.sin(i * 5 + t * 6) ** 2)); io.setMatrixAt(c++, T); }
    io.count = c; io.instanceMatrix.needsUpdate = true;
    fxEnd(F);
  },
};
// S12b THE PAYOFF (105.5 - 109): the lush crown heavy with nuts, down to Darman under it, his hand on the trunk.
const D12 = actor(121, [{ t: 0, mood: "neutral", arms: ["hip", "rest"], look: [-0.3, -0.5] }, { t: 2.0, mood: "neutral", look: [0.2, 0.2] }]);
const S12b: SceneDef = {
  from: 105.5, to: 109, ...DAY, mk: mkKebun({ salt: false, sick: 0, shadowAt: [0, 0, 1], shadowSize: 9 }), fadeAt: dip(3.5, 0.3, 0),
  keys: [...move(0, 1.9, [{ pos: [3.0, 3.0, 6.0], look: [0, 6.2, 0], fov: 42 }, { pos: [2.4, 1.7, 4.6], look: [0.25, 1.6, 0.1], fov: 36 }]), ...hold1(1.9, 3.5, { pos: [2.4, 1.5, 4.5], look: [0.3, 1.2, 0.1], fov: 34 }, [-0.04, 0, -0.06])],
  focus: (t) => (t < 1.6 ? [0, 5, 0] : [0.63, 1.3, 0.0]),
  act: (cx) => {
    const { t, cam } = cx, F = K_(cx).fx; fxBegin(F); warm(cx.card(0));
    const x = 0.63, z = 0.0; let P = actAt(D12, t); put(cx.card(0), DARMAN, P, x, z, cx, 0, capingEx);
    const tn = camDir(cam, 0, 0), trunk = V(tn.x * 0.16, 1.2, tn.z * 0.16); P = reach(cx.card(0), DARMAN, P, 0, trunk, x, z, cx, 0, capingEx); hold(F, 0, trunk, cam);
    fxEnd(F);
  },
};

// S13 CALLBACK (109 - 116): the young mother at the empty salt rack again: "Diborong siapa, Bu?" "Pak Karto." Pak Karto
//   shuffles past on the road with a sack of salt on his shoulder.
const IQ = say("Diborong siapa, Bu?", 3.05, 4.3, [0]), BQ = say("Pak Karto.", 4.55, 5.25, [1]);
const I13 = actor(131, [{ t: 0, mood: "surprised", arms: ["rest", "rest"], look: [-0.8, -0.2] }, { t: 3.0, mood: "worried", arms: ["rest", "open"], look: [0.7, 0.1] }, { t: 5.3, mood: "surprised", look: [-0.9, 0] }], IQ);
const B13 = actor(132, [{ t: 0, mood: "neutral", arms: ["chest", "chest"], look: [-0.6, 0.1] }, { t: 4.4, mood: "smug", arms: ["chest", "point"], look: [-0.9, 0] }], BQ);
const K13 = actor(133, [{ t: 0, mood: "nervous", arms: ["rest", "rest"], look: [0.9, 0] }, { t: 5.9, mood: "nervous", look: [-0.1, 0.1] }]);
const S13: SceneDef = {
  from: 109, to: 116, ...DAY, mk: mkKebun({ salt: false, sick: 0, shadowAt: [1, 0, 11.5], shadowSize: 10 }), fadeAt: dip(7, 0.3, 0.5),
  keys: [...hold1(0, 4.55, { pos: [1.6, 1.5, 9.0], look: [1.55, 1.1, 14.3], fov: 40 }, [0.03, 0, 0.08]), ...hold1(4.56, 7, { pos: [1.0, 1.5, 6.6], look: [0.6, 1.2, 10.9], fov: 40 }, [0.05, 0, 0])],
  focus: (t) => (t < 4.5 ? [1.4, 1.2, 13.8] : [0.2, 1.2, 10.9]),
  act: (cx) => {
    const { t } = cx, k = K_(cx), F = k.fx; fxBegin(F); [0, 1, 2].forEach((i) => warm(cx.card(i))); k.shelfSalt.visible = false;
    put(cx.card(0), IBU, actAt(I13, t), IBU_SPOT[0], IBU_SPOT[1], cx);
    put(cx.card(1), WARUNG_BU, actAt(B13, t), BU_SPOT[0], BU_SPOT[1], cx, 0.18);
    const w = path(t, 4.5, 7, [-0.9, 10.9], [1.8, 10.9], 0.5); if (t > 4.4) sackOnShoulder(cx, F, cx.card(2), KARTO, goTo(actAt(K13, t), w, 0.7), w.x, w.z, 1); else cx.card(2).setVisible(false);
    fxEnd(F);
  },
};

export const GARAM_SCENES: SceneDef[] = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11a, S11b, S12a, S12b, S13];
export const GARAM_FRAMES = Math.round(116 * FPS);
void noise; void sparkEx; void ROAD_Z; void mkFrond;
/** the downloaded models (public/garam/models) load once; the film waits for them */
export const GaramFilm: React.FC = () => {
  const [ok, setOk] = React.useState(hasModels()), [h] = React.useState(() => (hasModels() ? null : delayRender("garam models", { timeoutInMilliseconds: 240000 })));
  React.useEffect(() => { if (!ok) loadModels().then(() => { setOk(true); if (h !== null) continueRender(h); }); }, [ok, h]);
  return ok ? <Reel scenes={GARAM_SCENES} /> : null;
};
