// "Pak Jaya dan Plester Tembok" full film (~94 s), the user's own story, timed in docs/scripts/pak-jaya-plester-timing.md.
// Render rules (same as the last films): no on-screen text (the user adds narration and subtitles in CapCut), effects
// only where a beat needs them, a calm but active camera, nothing cut by the frame, props really held.
// Framing rule: half the frame width at distance d is d * tan(fov/2) * 0.5625.
import React from "react";
import * as THREE from "three";
import { actAt, Actor, Beat, FPS, sm, noise, Word } from "../../lib/acting";
import { headCenter, handPoint, Limb, Pose, CharSpec, OUTLINE } from "../../lib/toon2";
import { SU, ToonCard } from "../../lib/toonCard";
import { Reel, SceneDef, SetLike, Ctx, Key, handWorld, V3 } from "../../lib/scene";
import { TEX, SpritePool, burst, drawShockLines, drawSparkles, drawFlyingSweat } from "../kopi/fx";
import { JAYA, BAKSO, INSINYUR, PENGELOLA, SAYUR, IKAN, BUAH, KELONTONG } from "./cast";
import { loadModels, hasModels } from "./models";
import { continueRender, delayRender } from "remotion";
import { PasarSet, RetakSet, Plaster, PlasterBag, Torch, plasterBox, obatMerah, obatKotak, clipboard, CRACK, FACE_Z, SPOT, PL_W, PasarOpts } from "./pasar";

// ---------------- helpers (same maths as the Emas / Kopi films) ----------------
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const at = (t: number, a: number, b: number) => sm((t - a) / (b - a));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const win = (t: number, a: number, b: number, f = 0.25) => at(t, a, a + f) * (1 - at(t, b - f, b));
type Ex = (g: CanvasRenderingContext2D, P: Pose) => void;
const both = (...f: (Ex | undefined | false | null)[]): Ex => (g, P) => f.forEach((x) => x && x(g, P));
/** lip-sync words spread over [t0, t1] by letter count (the narrator voices them; the mouths only follow) */
const say = (text: string, t0: number, t1: number, stress: number[] = []): Word[] => {
  const ws = text.split(/\s+/).filter(Boolean), n = ws.reduce((a, w) => a + w.length + 1.5, 0); let t = t0;
  return ws.map((w, i) => { const d = ((w.length + 1.5) / n) * (t1 - t0); const o: Word = { w, t0: t, t1: t + d * 0.88, stress: stress.includes(i) }; t += d; return o; });
};
const actor = (seed: number, beats: Beat[], words: Word[] = []): Actor => ({ seed, beats, words });
const scl = (S: CharSpec) => (S === JAYA ? 1 : S === BAKSO ? 0.98 : S === INSINYUR ? 0.96 : 0.98);
const cardPt = (c: ToonCard, x: number, y: number) => { c.mesh.updateMatrixWorld(); return c.mesh.localToWorld(V((x - 300) * SU, (975 - y) * SU, 0)); };
const headPt = (c: ToonCard, S: CharSpec, P: Pose) => { const [x, y] = headCenter(S, P); return cardPt(c, x, y); };
const camDir = (cam: THREE.Camera, x: number, z: number) => V(cam.position.x - x, 0, cam.position.z - z).normalize();
const put = (c: ToonCard, S: CharSpec, P: Pose, x: number, z: number, cx: Ctx, sc = scl(S), y = 0, extra?: Ex) => c.update(S, P, x, z, cx.cam, cx.set.sunDir, sc, y, extra);
const withMouth = (P: Pose, kind: Pose["mouth"]["kind"], open = 0.5): Pose => ({ ...P, mouth: { kind, open } });
const withEyes = (P: Pose, kind: Pose["eyes"][0]["kind"], extra: Partial<Pose["eyes"][0]> = {}): Pose => ({ ...P, eyes: [{ kind, ...extra }, { kind, ...extra }] });
/** move hand i so that, seen from the camera, it lands on `target`; w 0..1 blends the reach in */
const reach = (c: ToonCard, S: CharSpec, P: Pose, i: 0 | 1, T: THREE.Vector3, x: number, z: number, cx: Ctx, sc = scl(S), y = 0, extra?: Ex, w = 1): Pose => {
  put(c, S, P, x, z, cx, sc, y, extra); if (w <= 0.001) return P;
  const cam = cx.cam.position, n = camDir(cx.cam, x, z), right = V(n.z, 0, -n.x), u = SU * sc;
  const d = T.clone().sub(cam), pt = cam.clone().addScaledVector(d, V(x, 0, z).sub(cam).dot(n) / d.dot(n));
  let Q = P;
  for (let it = 0; it < 2; it++) {
    const h = handWorld(c, S, Q, i), du = (pt.clone().sub(h).dot(right) / u) * (it ? 1 : w), dv = ((pt.y - h.y) / u) * (it ? 1 : w);
    const A = Q.arms[i], L: Limb = { a: [A.a[0] + du * 0.5, A.a[1] - dv * 0.5], b: [A.b[0] + du, A.b[1] - dv] };
    Q = { ...Q, arms: (i ? [Q.arms[0], L] : [L, Q.arms[1]]) as [Limb, Limb] }; put(c, S, Q, x, z, cx, sc, y, extra);
    if (w < 1) break;
  }
  return Q;
};
const life = (P: Pose, t: number, seed: number, k = 1): Pose => { const s = seed * 1.7, w = 2 * Math.PI;
  return { ...P, bob: P.bob + 4 * k * Math.sin(t * w * 0.9 + s), body: { ...P.body, sy: P.body.sy * (1 + 0.02 * k * Math.sin(t * w * 0.9 + s + 1)), lean: P.body.lean + 0.03 * k * Math.sin(t * w * 0.45 + s) },
    head: { ...P.head, rot: P.head.rot + 0.05 * k * Math.sin(t * w * 0.6 + s * 2), dy: P.head.dy + 3 * k * Math.sin(t * w * 1.1 + s) } }; };
const laughing = (P: Pose, t: number, k = 1, ph = 0): Pose => { const w = 2 * Math.PI * 2.4, b = Math.sin(w * t + ph);
  return { ...P, bob: P.bob - 12 * k * Math.abs(b), body: { ...P.body, bend: P.body.bend + k * (10 + 10 * b), lean: P.body.lean + k * 0.12 * Math.sin(w * t / 2 + ph), sy: P.body.sy * (1 - 0.05 * k * Math.abs(b)) },
    head: { ...P.head, rot: P.head.rot + k * 0.18 * Math.sin(w * t / 2 + ph), dy: P.head.dy - 10 * k * Math.abs(b) }, eyes: [{ kind: "happy" }, { kind: "happy" }], mouth: { kind: "laugh", open: 0.85 + 0.15 * Math.abs(b) } }; };
const walk = (P: Pose, ph: number, amp = 1, bounce = 1): Pose => {
  const a0 = ph * Math.PI * 2;
  const legs = [0, 1].map((k) => { const s = k ? 1 : -1, a = a0 + k * Math.PI, sw = Math.cos(a), lift = Math.max(0, Math.sin(a)); return { a: [s * 5 + 18 * sw * amp, 118 - 30 * lift * amp], b: [s * 3 + 40 * sw * amp, -60 * lift * amp] } as Limb; }) as [Limb, Limb];
  const arms = P.arms.map((A, k) => { const sw = Math.cos(a0 + (1 - k) * Math.PI) * amp; return { a: [A.a[0] + 14 * sw, A.a[1]], b: [A.b[0] + 34 * sw, A.b[1] - 8 * Math.abs(sw)] } as Limb; }) as [Limb, Limb];
  return { ...P, legs, arms, bob: P.bob - (8 + 10 * bounce) * Math.abs(Math.sin(a0)) * amp, body: { ...P.body, lean: P.body.lean + 0.05 * amp, sy: P.body.sy * (1 + 0.04 * bounce * amp * Math.cos(2 * a0)) }, head: { ...P.head, rot: P.head.rot + 0.07 * amp * Math.sin(a0) } };
};
const stretch = (P: Pose, k: number): Pose => ({ ...P, body: { ...P.body, sy: P.body.sy * (1 + 0.1 * k), sx: P.body.sx * (1 - 0.06 * k) }, head: { ...P.head, sy: P.head.sy * (1 + 0.1 * k), dy: P.head.dy - 14 * k } });
const nod = (P: Pose, t: number, t0: number, n = 3, amp = 16): Pose => { const u = t - t0; if (u < 0 || u > n * 0.32) return P; return { ...P, head: { ...P.head, dy: P.head.dy + amp * Math.abs(Math.sin((u / 0.32) * Math.PI)) } }; };
const shakeHead = (P: Pose, t: number, t0: number, dur: number, amp = 0.22): Pose => { const u = t - t0; if (u < 0 || u > dur) return P; return { ...P, head: { ...P.head, rot: P.head.rot + amp * Math.sin(u * 30) * (1 - u / dur), dx: P.head.dx + 14 * Math.sin(u * 30) * (1 - u / dur) } }; };
/** a walk from a to b between t0 and t1 with planted steps (phase from distance) */
const path = (t: number, t0: number, t1: number, a: [number, number], b: [number, number], stride = 0.62) => { const u = at(t, t0, t1), x = lerp(a[0], b[0], u), z = lerp(a[1], b[1], u), d = Math.hypot(b[0] - a[0], b[1] - a[1]) * u; return { x, z, moving: u > 0.001 && u < 0.999, ph: d / stride }; };
const goTo = (P: Pose, w: { moving: boolean; ph: number }, amp = 0.9) => (w.moving ? walk(P, w.ph, amp) : P);

// ---------------- camera glides (Catmull-Rom, eased at the ends only) ----------------
type P3 = { pos: V3; look: V3; fov?: number };
const cr = (a: number, b: number, c: number, d: number, u: number) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
const crV = (P: V3[], s: number): V3 => { const n = P.length, i = Math.min(n - 2, Math.floor(s)), u = s - i, g = (k: number) => P[Math.max(0, Math.min(n - 1, k))]; return [0, 1, 2].map((j) => cr(g(i - 1)[j], g(i)[j], g(i + 1)[j], g(i + 2)[j], u)) as V3; };
const move = (tA: number, tB: number, pts: P3[], ease: (x: number) => number = sm, shake = 0): Key[] => {
  const out: Key[] = [], n = Math.max(1, Math.round((tB - tA) * FPS));
  for (let i = 0; i <= n; i++) {
    const t = tA + ((tB - tA) * i) / n - (i === n ? 0.002 : 0), u = ease(i / n), s = u * (pts.length - 1);
    let pos: V3 = pts.length === 1 ? pts[0].pos : crV(pts.map((p) => p.pos), s); const look: V3 = pts.length === 1 ? pts[0].look : crV(pts.map((p) => p.look), s);
    const k = Math.min(pts.length - 2, Math.floor(s)), f = s - k, fov = pts.length === 1 ? pts[0].fov ?? 40 : lerp(pts[Math.max(0, k)].fov ?? 40, pts[Math.min(pts.length - 1, k + 1)].fov ?? 40, f);
    if (shake) pos = [pos[0] + shake * noise(t * 5, 11), pos[1] + shake * noise(t * 6, 12), pos[2] + shake * 0.5 * noise(t * 4, 13)];
    out.push({ t, pos, look, fov });
  }
  return out;
};
const hold1 = (tA: number, tB: number, p: P3) => move(tA, tB, [p, { ...p, pos: [p.pos[0] + 0.03, p.pos[1] + 0.005, p.pos[2] - 0.04] }]);
/** dip to black at the start and/or end of a scene */
const dip = (len: number, din = 0.3, dout = 0.3) => (t: number) => Math.max(din > 0 ? 1 - at(t, 0, din) : 0, dout > 0 ? at(t, len - dout, len) : 0);

// ---------------- effects + props rig shared by every market scene ----------------
type FX = { hands: THREE.Mesh[]; arms: THREE.Mesh[]; puff: SpritePool; steam: SpritePool; star: SpritePool; dust: SpritePool; drop: SpritePool;
  box: THREE.Group; bottle: THREE.Group; bag: PlasterBag; torch: Torch; clip: THREE.Group; kotak: THREE.Group; handPl: Plaster };
const addFx = (R: THREE.Object3D): FX => {
  const F: FX = {
    hands: [0, 1, 2, 3].map(() => { const h = new THREE.Mesh(new THREE.SphereGeometry(17 * SU, 20, 14), new THREE.MeshBasicMaterial({ color: OUTLINE })); h.visible = false; h.renderOrder = 10; R.add(h); return h; }),
    arms: [0, 1, 2, 3].map(() => { const a = new THREE.Mesh(new THREE.CylinderGeometry(9 * SU, 9 * SU, 1, 10), new THREE.MeshBasicMaterial({ color: OUTLINE })); a.visible = false; R.add(a); return a; }),
    puff: new SpritePool(R, TEX.puff, 60), steam: new SpritePool(R, TEX.puff, 40), star: new SpritePool(R, TEX.star, 40, true), dust: new SpritePool(R, TEX.dust, 40, false, "#9a8a70"), drop: new SpritePool(R, TEX.drop, 10),
    box: plasterBox(), bottle: obatMerah(), bag: new PlasterBag(), torch: new Torch(), clip: clipboard(), kotak: obatKotak(), handPl: new Plaster(),
  };
  R.add(F.box, F.bottle, F.bag.group, F.torch.group, F.clip, F.kotak, F.handPl.group); return F;
};
const fxBegin = (F: FX) => { for (const p of [F.puff, F.steam, F.star, F.dust, F.drop]) p.begin(); F.hands.forEach((h) => (h.visible = false)); F.arms.forEach((a) => (a.visible = false));
  for (const g of [F.box, F.bottle, F.bag.group, F.torch.group, F.clip, F.kotak]) g.visible = false; F.handPl.show("none"); F.torch.light.intensity = 0; };
const fxEnd = (F: FX) => { for (const p of [F.puff, F.steam, F.star, F.dust, F.drop]) p.end(); };
/** a 3D ball hand on a grip point, on the camera side of the prop, so the prop is clearly HELD */
const hold = (F: FX, i: number, p: THREE.Vector3, cam: THREE.Camera, sc = 1) => { const h = F.hands[i]; h.position.copy(p).addScaledVector(cam.position.clone().sub(p).normalize(), 0.022 * sc); h.scale.setScalar(sc); h.visible = true; };
const arm3 = (F: FX, i: number, a: THREE.Vector3, b: THREE.Vector3, th = 1) => { const m = F.arms[i], d = b.clone().sub(a); m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(th, d.length(), th); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); m.visible = true; };
type WithFx = { fx: FX };
const mkPasar = (o: PasarOpts = {}) => () => { const k = new PasarSet(o) as PasarSet & WithFx; k.fx = addFx(k.root); return k as unknown as SetLike; };
const P_ = (cx: Ctx) => cx.set as unknown as PasarSet & WithFx;
const tint = (c: ToonCard, shade: number, lift: string, sh: string) => { c.shade = shade; c.liftCol = lift; c.shadeCol = sh; };
const warmTint = (c: ToonCard) => tint(c, 0.5, "255,214,160", "70,70,140");
/** bakso steam from both pots, every frame */
const steam = (k: PasarSet, F: FX, t: number) => { k.cart.group.updateMatrixWorld(); k.cart.steam.forEach((p0, j) => { const p = k.cart.group.localToWorld(p0.clone());
  for (let i = 0; i < 7; i++) { const a = ((t * 0.55 + i / 7 + j * 0.37) % 1); F.steam.add(p.clone().add(V(0.05 * Math.sin(t * 1.3 + i * 2 + j), a * 0.75, 0.04 * Math.cos(t + i))), 0.12 + 0.35 * a, 0.42 * (1 - a) * Math.min(1, a * 6)); } }); };

// ---------------- drawn extras on the cards ----------------
/** head centre on the card INCLUDING the body lean (drawChar rotates the upper body and head about the hip) */
const head = (S: CharSpec, P: Pose): [number, number] => { const [x, y] = headCenter(S, P), hipY = 975 - S.legLen + P.bob, c = Math.cos(P.body.lean), s = Math.sin(P.body.lean); return [P.x + (x - P.x) * c - (y - hipY) * s, hipY + (x - P.x) * s + (y - hipY) * c]; };
const bodyTop = (S: CharSpec, P: Pose) => 975 - S.legLen + P.bob - S.bodyH * P.body.sy;
const sweatEx = (S: CharSpec, t: number, k = 1): Ex => (g, P) => { const [x, y] = head(S, P); drawFlyingSweat(g, x, y, S.R, t, k); };
const shockEx = (S: CharSpec, k: number): Ex => (g, P) => { if (k <= 0.01) return; const [x, y] = head(S, P); drawShockLines(g, x, y - S.R * 0.1, S.R, k); };
const sparkEx = (S: CharSpec, t: number, k: number): Ex => (g, P) => { if (k <= 0.01) return; const [x, y] = head(S, P); drawSparkles(g, x, y - S.R * 0.1, S.R, t, k); };
/** the engineer's yellow hard hat: a dome with a ridge and a front brim, sitting INTO the head */
const helmetEx: Ex = (g, P) => { const S = INSINYUR, [x, y] = head(S, P), R = S.R; g.save(); g.translate(x, y); g.rotate(P.head.rot * 0.9);
  g.beginPath(); g.ellipse(0, -0.42 * R, 1.02 * R, 0.82 * R, 0, Math.PI, 0); g.closePath(); const gr = g.createLinearGradient(-R, -1.2 * R, R, -0.3 * R); gr.addColorStop(0, "#ffe46a"); gr.addColorStop(1, "#e8b400"); g.fillStyle = gr; g.fill(); g.lineWidth = 0.08 * R; g.strokeStyle = OUTLINE; g.stroke();
  g.beginPath(); g.moveTo(-0.12 * R, -1.22 * R); g.quadraticCurveTo(0, -1.28 * R, 0.12 * R, -1.22 * R); g.lineTo(0.1 * R, -0.45 * R); g.lineTo(-0.1 * R, -0.45 * R); g.closePath(); g.fillStyle = "#f2c400"; g.fill(); g.lineWidth = 0.04 * R; g.stroke();
  g.beginPath(); g.roundRect(-1.18 * R, -0.5 * R, 2.36 * R, 0.16 * R, 0.08 * R); g.fillStyle = "#f0bc00"; g.fill(); g.lineWidth = 0.06 * R; g.stroke();
  g.fillStyle = "rgba(255,255,255,0.55)"; g.beginPath(); g.ellipse(-0.45 * R, -0.95 * R, 0.22 * R, 0.1 * R, -0.5, 0, Math.PI * 2); g.fill(); g.restore(); };
/** reflective stripes on the vest */
const vestEx: Ex = (g, P) => { const S = INSINYUR, top = bodyTop(S, P), H = S.bodyH * P.body.sy, x = P.x + P.body.bend * 0.3; g.save(); g.translate(x, 975 - S.legLen + P.bob); g.rotate(P.body.lean); g.translate(-x, -(975 - S.legLen + P.bob));
  for (const f of [0.42, 0.6]) { g.fillStyle = "#e9edf0"; g.fillRect(x - S.bodyW * 0.44, top + H * f, S.bodyW * 0.88, H * 0.05); g.fillStyle = "rgba(255,255,255,0.6)"; g.fillRect(x - S.bodyW * 0.44, top + H * f, S.bodyW * 0.88, H * 0.015); } g.restore(); };
/** the bakso seller's red-checked towel over the left shoulder */
const towelEx0: Ex = (g, P) => { const S = BAKSO, top = bodyTop(S, P), x = P.x - S.bodyW * 0.3 + P.body.bend * 0.2; g.save(); g.translate(x, top + 6); g.rotate(0.1 + P.body.lean);
  g.beginPath(); g.moveTo(-26, -6); g.quadraticCurveTo(10, -22, 40, -4); g.lineTo(30, 120); g.lineTo(-8, 126); g.closePath(); g.fillStyle = "#f2efe6"; g.fill(); g.save(); g.clip(); g.fillStyle = "rgba(210,40,40,0.75)"; for (let k = -40; k < 140; k += 22) { g.fillRect(-40, k, 100, 7); g.fillRect(-30 + (k % 44), -30, 7, 170); } g.restore();
  g.lineWidth = 6; g.strokeStyle = OUTLINE; g.stroke(); g.restore(); };
const towelEx: Ex = () => undefined; void towelEx0; // the towel read as a cup; the red cap identifies him now
/** the manager's ID lanyard and card */
const lanyardEx = (sw: number): Ex => (g, P) => { const S = PENGELOLA, top = bodyTop(S, P), H = S.bodyH * P.body.sy, hipY = 975 - S.legLen + P.bob, [, hy] = head(S, P);
  const chin = Math.max(top + 6, hy + S.R * 0.97), y0 = Math.max(chin, top + H * 0.2), cy = Math.max(y0 + 30, top + H * 0.5), x = P.x + P.body.bend * 0.25 + 6 * sw; g.save();
  g.translate(P.x, hipY); g.rotate(P.body.lean); g.translate(-P.x, -hipY); // follow the body lean like the vest stripes
  g.strokeStyle = "#2a62b8"; g.lineWidth = 7; g.beginPath(); g.moveTo(P.x - 30, y0); g.lineTo(x, cy); g.lineTo(P.x + 30, y0); g.stroke();
  g.translate(x, cy); g.rotate(0.12 * sw); g.fillStyle = "#fbfaf6"; g.beginPath(); g.roundRect(-26, 0, 52, 70, 6); g.fill(); g.lineWidth = 4; g.strokeStyle = OUTLINE; g.stroke(); g.fillStyle = "#2a62b8"; g.fillRect(-26, 0, 52, 16); g.fillStyle = "#b8c2cc"; g.fillRect(-16, 24, 32, 26); g.fillStyle = "#9aa3ad"; g.fillRect(-18, 56, 36, 5); g.restore(); };
/** a raised index finger on hand i ("one!") */
const fingerEx = (S: CharSpec, i: 0 | 1, k: number): Ex => (g, P) => { if (k <= 0.01) return; const [x, y] = handPoint(S, P, i), r = 0.13 * S.R; g.save(); g.beginPath(); g.roundRect(x - r * 0.42, y - r * 2.3 * k, r * 0.84, r * 2.3 * k + r * 0.3, r * 0.42); g.fillStyle = OUTLINE; g.fill(); g.restore(); };
/** the bakso strainer-ladle in hand i */
const ladleEx = (S: CharSpec, i: 0 | 1): Ex => (g, P) => { const [x, y] = handPoint(S, P, i); g.save(); g.strokeStyle = "#9aa0a8"; g.lineWidth = 8; g.lineCap = "round"; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 70, y + 60); g.stroke(); g.lineWidth = 4; g.strokeStyle = OUTLINE; g.beginPath(); g.ellipse(x + 84, y + 72, 24, 12, 0.6, 0, Math.PI * 2); g.fillStyle = "#c9ccd2"; g.fill(); g.stroke(); g.restore(); };
/** pale face: a cold green-blue wash over the face and gloom lines on the forehead */
const paleEx = (S: CharSpec, k: number): Ex => (g, P) => { if (k <= 0.01) return; const [x, y] = head(S, P), R = S.R; g.save(); g.globalCompositeOperation = "source-atop";
  const gr = g.createLinearGradient(0, y - R, 0, y + R); gr.addColorStop(0, `rgba(80,140,170,${0.55 * k})`); gr.addColorStop(0.55, `rgba(150,200,200,${0.3 * k})`); gr.addColorStop(1, `rgba(150,200,200,${0.12 * k})`); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, R * 1.05, R * 1.02, 0, 0, Math.PI * 2); g.fill(); g.restore();
  g.save(); g.strokeStyle = `rgba(60,70,130,${0.8 * k})`; g.lineWidth = 0.035 * R; for (let i = 0; i < 5; i++) { const lx = x - 0.45 * R + i * 0.22 * R; g.beginPath(); g.moveTo(lx, y - 0.85 * R); g.lineTo(lx, y - (0.5 + 0.08 * (i % 2)) * R); g.stroke(); } g.restore(); };

// ---------------- grading presets ----------------
const DAY = { fog: "#f4e2c8", dens: 0.012, bg: "#cfe0f2", cInf: 6, env: 0.42, exposure: 0.03, bloom: 0.75, sat: 0.26, contrast: 0.1, grade: [[0.42, 0.5, 0.6], [0.66, 0.55, 0.42], 0.3] as [V3, V3, number] };
const DAY2 = { ...DAY, grade: [[0.44, 0.5, 0.58], [0.7, 0.54, 0.4], 0.34] as [V3, V3, number] };
const MACRO = { fog: "#e8dcc8", dens: 0.0, bg: "#ebe3cf", cInf: 1.2, env: 0.45, exposure: 0.02, bloom: 0.7, sat: 0.24, contrast: 0.12, grade: [[0.42, 0.48, 0.6], [0.68, 0.54, 0.42], 0.3] as [V3, V3, number] };

const JX = SPOT.jayaWall.x, JZ = SPOT.jayaWall.z, PLv = CRACK.clone().add(V(0, 0, 0.012));

// =====================================================================================================================
// 1. THE PLASTER (0 - 5.5): frame 0 = Pak Jaya's thumb smoothing the plaster over the crack on a bright morning; he steps
//    back, admires it, nods; the camera pulls back to reveal the market behind him
const A1 = actor(1, [{ t: 0, mood: "story", arms: ["rest", "rest"], look: [0.7, -0.1] }, { t: 1.5, mood: "neutral", look: [0.6, -0.1] }, { t: 2.2, mood: "smug", arms: ["hip", "hip"], look: [0.5, -0.05] }, { t: 4.2, mood: "excited", arms: ["hip", "hip"], look: [0.1, 0.1] }]);
const S1: SceneDef = {
  from: 0, to: 5.5, ...DAY, mk: mkPasar({ day: 0 }),
  keys: [...hold1(0, 1.4, { pos: [0.45, 1.5, 1.75], look: [-0.08, 1.28, -1.9], fov: 40 }), ...move(1.4, 5.5, [{ pos: [0.48, 1.5, 1.71], look: [-0.08, 1.28, -1.9], fov: 40 }, { pos: [1.2, 1.7, 3.0], look: [-0.3, 1.25, -1.5], fov: 42 }, { pos: [1.6, 1.9, 4.6], look: [-0.45, 1.2, -1.3], fov: 44 }])],
  focus: () => [JX, 1.35, JZ], fadeAt: dip(5.5, 0, 0.25),
  act: (cx) => {
    const { t, cam } = cx, k = P_(cx), F = k.fx, c = cx.card(0); fxBegin(F); warmTint(c); steam(k, F, t); k.plaster.show("fresh");
    let P = life(actAt(A1, t), t, 1, 0.8); if (t < 1.3) P = { ...P, mouth: { kind: "tongue", open: 0.4, dx: 0.12 } };
    P = nod(P, t, 2.4, 2, 12); const back = at(t, 1.3, 1.9), x = JX, z = lerp(JZ, JZ + 0.25, back);
    const sw = t < 1.25 ? Math.sin(t * 2 * Math.PI * 1.6) : 0, tgt = PLv.clone().add(V(0.04 * sw, 0.002 * Math.cos(t * 9), 0));
    const ex = both(sparkEx(JAYA, t, win(t, 4.2, 5.4)));
    if (t < 1.5) { P = reach(c, JAYA, P, 1, tgt, x, z, cx, 1, 0, ex, 1 - at(t, 1.2, 1.5)); if (t < 1.25) hold(F, 1, tgt, cam, 0.9); } else put(c, JAYA, P, x, z, cx, 1, 0, ex);
    fxEnd(F);
  },
};

// 2. ONE. THEN HOME (5.5 - 9): he holds up one finger to the lens, pats the wall, and strolls off down the aisle
const A2 = actor(2, [{ t: 0, mood: "excited", arms: ["rest", "up"], look: [0, 0.1] }, { t: 1.3, mood: "smug", arms: ["rest", "rest"], look: [0.8, 0] }, { t: 2.0, mood: "neutral", look: [0.2, 0.1] }]);
const S2: SceneDef = {
  from: 5.5, to: 9, ...DAY, mk: mkPasar({ day: 0 }),
  keys: [...hold1(0, 1.6, { pos: [0.15, 1.5, 1.95], look: [-0.1, 1.33, -1.6], fov: 40 }), ...move(1.6, 3.5, [{ pos: [0.18, 1.5, 1.91], look: [-0.1, 1.33, -1.6], fov: 40 }, { pos: [-0.2, 1.6, 4.2], look: [-0.1, 1.2, -0.2], fov: 42 }])],
  focus: (t) => (t < 1.8 ? [JX, 1.4, JZ + 0.25] : [0, 1.3, 0.8]), fadeAt: dip(3.5, 0.2, 0),
  act: (cx) => {
    const { t, cam } = cx, k = P_(cx), F = k.fx, c = cx.card(0); fxBegin(F); warmTint(c); steam(k, F, t); k.plaster.show("fresh");
    const w = path(t, 1.6, 3.6, [JX, JZ + 0.25], [0.05, 1.9]); let P = goTo(life(actAt(A2, t), t, 2, 0.8), w);
    P = nod(P, t, 0.3, 2, 10);
    const pat = win(t, 1.0, 1.55, 0.12), tap = PLv.clone().add(V(-0.12, 0.18 + 0.02 * Math.sin(t * 40) * pat, 0));
    const ex = both(fingerEx(JAYA, 1, win(t, 0.05, 1.2, 0.15)));
    if (pat > 0) { P = reach(c, JAYA, P, 1, tap, w.x, w.z, cx, 1, 0, ex, pat); if (pat > 0.6) hold(F, 1, tap, cam, 0.9); } else put(c, JAYA, P, w.x, w.z, cx, 1, 0, ex);
    fxEnd(F);
  },
};

// 3. THE BAKSO SELLER WONDERS (9 - 15.5): he stirs the pot, watches Pak Jaya stroll by, scratches his head and asks;
//    Pak Jaya stops, turns, smiles, walks on
const B3 = actor(3, [{ t: 0, mood: "neutral", arms: ["chest", "rest"], look: [0.5, -0.3] }, { t: 1.3, mood: "suspicious", arms: ["rest", "rest"], look: [0.8, 0] }, { t: 2.0, mood: "worried", arms: ["fixhat", "rest"], look: [0.8, 0] }, { t: 2.6, mood: "surprised", arms: ["rest", "open"], look: [0.8, 0] }, { t: 4.6, mood: "suspicious", arms: ["rest", "rest"], look: [0.6, 0] }],
  say("Pak, temboknya sakit?", 2.6, 4.2, [1]));
const J3 = actor(4, [{ t: 0, mood: "neutral", arms: ["rest", "rest"], look: [0.3, 0.1] }, { t: 3.9, mood: "neutral", look: [-0.9, 0] }, { t: 4.3, mood: "laugh", arms: ["rest", "rest"], look: [-0.9, 0] }, { t: 5.7, mood: "smug", look: [0.4, 0] }]);
const S3: SceneDef = {
  from: 9, to: 15.5, ...DAY, mk: mkPasar({ day: 0 }),
  keys: [...move(0, 3.2, [{ pos: [2.45, 1.6, 5.6], look: [-0.25, 1.25, 0.9], fov: 40 }, { pos: [2.3, 1.58, 5.35], look: [-0.25, 1.28, 1.0], fov: 40 }]), ...move(3.2, 6.5, [{ pos: [2.3, 1.58, 5.35], look: [-0.25, 1.28, 1.0], fov: 40 }, { pos: [2.1, 1.55, 5.0], look: [-0.22, 1.3, 1.1], fov: 40 }])],
  focus: () => [-0.5, 1.4, 1.2],
  act: (cx) => {
    const { t } = cx, k = P_(cx), F = k.fx, b = cx.card(0), c = cx.card(1); fxBegin(F); warmTint(b); warmTint(c); steam(k, F, t); k.plaster.show("fresh");
    let Q = life(actAt(B3, t), t, 3, 0.9); if (t < 1.3) Q = { ...Q, arms: [{ a: [-30, 70], b: [-70 + 20 * Math.sin(t * 7), 40 + 10 * Math.cos(t * 7)] }, Q.arms[1]] }; // stirring
    if (t > 2.0 && t < 2.6) Q = { ...Q, arms: [{ ...Q.arms[0], b: [Q.arms[0].b[0] + 8 * Math.sin(t * 40), Q.arms[0].b[1]] }, Q.arms[1]] }; // scratching
    put(b, BAKSO, Q, SPOT.bakso.x, SPOT.bakso.z, cx, scl(BAKSO), 0, both(towelEx, t < 1.3 && ladleEx(BAKSO, 0)));
    const w1 = path(t, 0, 3.9, [0.2, 0.2], [0.6, 1.9]), w2 = path(t, 5.9, 6.5, [0.6, 1.9], [0.75, 2.45]), w = t < 5 ? w1 : w2;
    let P = goTo(life(actAt(J3, t), t, 4, 0.8), w); if (t > 4.3 && t < 5.7) P = { ...P, eyes: [{ kind: "happy" }, { kind: "happy" }], mouth: { kind: "smileBig", open: 0.15 } };
    put(c, JAYA, P, w.x, w.z, cx);
    fxEnd(F);
  },
};

// 4a. THE NEXT DAY (15.5 - 19.5): the plaster is torn in two; Pak Jaya peels the halves off, takes a new one from his
//     shirt pocket, presses it on and smooths it with his thumb
const A4a = actor(40, [{ t: 0, mood: "surprised", arms: ["rest", "rest"], look: [0.7, -0.1] }, { t: 0.7, mood: "neutral", look: [0.75, -0.1] }, { t: 3.2, mood: "smug", look: [0.3, 0.1] }]);
const S4a: SceneDef = {
  from: 15.5, to: 19.5, ...DAY2, mk: mkPasar({ day: 1 }),
  keys: [...move(0, 4, [{ pos: [0.5, 1.48, 1.65], look: [-0.05, 1.28, -1.9], fov: 40 }, { pos: [0.45, 1.46, 1.35], look: [-0.03, 1.3, -1.9], fov: 40 }])],
  focus: () => [0.05, 1.32, -1.75], fadeAt: dip(4, 0.3, 0.3),
  act: (cx) => {
    const { t, cam } = cx, k = P_(cx), F = k.fx, c = cx.card(0); fxBegin(F); warmTint(c); steam(k, F, t);
    const x = JX, z = JZ + 0.05; let P = life(actAt(A4a, t), t, 40, 0.7); if (t > 2.4 && t < 3.1) P = { ...P, mouth: { kind: "tongue", open: 0.4, dx: 0.12 } };
    put(c, JAYA, P, x, z, cx); const hd = headPt(c, JAYA, P), n = camDir(cam, x, z), right = V(n.z, 0, -n.x), pocket = hd.clone().addScaledVector(n, 0.22).addScaledVector(right, 0.1).add(V(0, -0.62, 0));
    const peel = at(t, 0.5, 0.9), away = at(t, 0.95, 1.35), fetch = at(t, 1.45, 1.75), press = at(t, 1.85, 2.3);
    let tg: THREE.Vector3;
    if (t < 0.95) tg = PLv.clone().add(V(PL_W * 0.25, 0, 0.03 * peel));
    else if (t < 1.45) tg = PLv.clone().lerp(pocket.clone().add(V(0.15, -0.1, 0)), away);
    else if (t < 1.85) tg = pocket.clone().add(V(0.15, -0.1, 0)).lerp(pocket, fetch);
    else { const sw = t > 2.35 ? Math.sin((t - 2.35) * 2 * Math.PI * 1.6) * (1 - at(t, 3.0, 3.2)) : 0; tg = pocket.clone().lerp(PLv.clone().add(V(0.05 * sw, 0, 0)), press); }
    if (t < 0.95) k.plaster.show("torn", 0.008, peel); else k.plaster.show(press >= 1 ? "fresh" : "none");
    if (t > 0.9 && t < 1.4) { F.handPl.show("torn", 0.012); F.handPl.group.position.copy(tg).add(V(-0.04, 0, 0)); F.handPl.group.lookAt(cam.position); }
    if (t > 1.75 && press < 1) { F.handPl.show("fresh"); F.handPl.group.position.copy(tg).add(V(-0.05, 0, 0)); F.handPl.group.lookAt(cam.position); }
    const hw = at(t, 0.15, 0.5) * (1 - at(t, 3.2, 3.6));
    P = reach(c, JAYA, P, 1, tg, x, z, cx, 1, 0, undefined, hw); if (hw > 0.7) hold(F, 1, tg, cam, 0.9);
    if (t > 0.8 && t < 1.1) for (const [p, a] of burst(t, 0.85, 0.5, 6, CRACK.clone().add(V(0.04, 0, 0.03)), V(0.2, -0.3, 0.6), 0.5, 0.3, 1.2, 5)) F.dust.add(p, 0.015 * (1 + a), 0.7 * (1 - a));
    fxEnd(F);
  },
};

// 4b. THE DAY AFTER (19.5 - 22.5): Pak Jaya comes to the wall again, torn again; he leans in and squints, chin in hand
const A4 = actor(5, [{ t: 0, mood: "neutral", arms: ["rest", "rest"], look: [0.7, 0] }, { t: 1.2, mood: "surprised", arms: ["rest", "rest"], look: [0.8, -0.1] }, { t: 1.8, mood: "suspicious", arms: ["rest", "chin"], look: [0.9, -0.1] }]);
const S4b: SceneDef = {
  from: 19.5, to: 22.5, ...DAY, mk: mkPasar({ day: 2 }),
  keys: [...move(0, 3, [{ pos: [1.4, 1.55, 1.4], look: [-0.05, 1.32, -1.9], fov: 40 }, { pos: [1.2, 1.5, 1.0], look: [-0.05, 1.33, -1.9], fov: 40 }])],
  focus: () => [0, 1.35, -1.7], fadeAt: dip(3, 0.3, 0.2),
  act: (cx) => {
    const { t } = cx, k = P_(cx), F = k.fx, c = cx.card(0); fxBegin(F); warmTint(c); steam(k, F, t); k.plaster.show("torn", 0.008);
    const w = path(t, 0, 1.1, [JX - 0.4, JZ + 1.2], [JX, JZ + 0.05]); let P = goTo(life(actAt(A4, t), t, 5, 0.8), w);
    const lean = at(t, 1.7, 2.2); P = { ...P, body: { ...P.body, lean: P.body.lean + 0.12 * lean }, head: { ...P.head, dx: P.head.dx + 30 * lean, rot: P.head.rot + 0.1 * lean } };
    put(c, JAYA, P, w.x, w.z, cx, 1, 0, both(t > 1.2 && t < 1.6 && shockEx(JAYA, 0.5)));
    fxEnd(F);
  },
};

// 5. A WHOLE BOX (22.5 - 30): a week later he marches in carrying a box of plasters; the bakso seller holds up a bottle
//    of obat merah and teases him
const J5 = actor(6, [{ t: 0, mood: "excited", arms: ["rest", "rest"], look: [0, 0.1] }, { t: 2.7, mood: "neutral", look: [-0.9, 0] }, { t: 4.5, mood: "suspicious", look: [-0.9, 0] }, { t: 6.4, mood: "smug", look: [-0.8, 0] }]);
const B5 = actor(7, [{ t: 0, mood: "neutral", arms: ["rest", "rest"], look: [0.6, 0] }, { t: 2.4, mood: "surprised", look: [0.8, 0] }, { t: 3.2, mood: "excited", arms: ["rest", "rest"], look: [0.8, 0] }, { t: 5.5, mood: "wink", look: [0.8, 0] }, { t: 6.8, mood: "laugh", look: [0.6, 0] }],
  say("Pak, sekalian kasih obat merah, siapa tahu sembuh.", 3.3, 6.8, [3, 6]));
const S5: SceneDef = {
  from: 22.5, to: 30, ...DAY, mk: mkPasar({ day: 3 }),
  keys: [...move(0, 2.8, [{ pos: [0.9, 1.6, 7.4], look: [-0.2, 1.2, 2.2], fov: 42 }, { pos: [1.5, 1.58, 5.8], look: [-0.35, 1.25, 1.6], fov: 41 }]), ...move(2.8, 7.5, [{ pos: [1.5, 1.58, 5.8], look: [-0.35, 1.25, 1.6], fov: 41 }, { pos: [1.75, 1.54, 5.0], look: [-0.22, 1.3, 1.3], fov: 40 }, { pos: [1.6, 1.52, 4.7], look: [-0.22, 1.32, 1.3], fov: 40 }])],
  focus: (t) => (t < 2.6 ? [0.1, 1.3, 3.0] : [-0.5, 1.4, 1.3]),
  act: (cx) => {
    const { t, cam } = cx, k = P_(cx), F = k.fx, b = cx.card(0), c = cx.card(1); fxBegin(F); warmTint(b); warmTint(c); steam(k, F, t); k.plaster.show("torn", 0.008);
    // Pak Jaya: marches in with the box held in front in both hands (a proud, bouncy walk), stops by the cart
    const w = path(t, 0, 2.7, [0.4, 5.4], [0.45, 1.95]); let P = goTo(life(actAt(J5, t), t, 6, 0.8), w, 1.0);
    if (t > 6.4) P = shakeHead(P, t, 6.4, 0.6, 0.12);
    put(c, JAYA, P, w.x, w.z, cx); const hd = headPt(c, JAYA, P), n = camDir(cam, w.x, w.z), right = V(n.z, 0, -n.x);
    const bx = hd.clone().addScaledVector(n, 0.3).add(V(0, -0.5 + 0.02 * Math.sin(t * 9) * (w.moving ? 1 : 0), 0)); F.box.visible = true; F.box.position.copy(bx); F.box.lookAt(cam.position.clone().setY(bx.y)); F.box.rotateY(0.25);
    P = reach(c, JAYA, P, 0, bx.clone().addScaledVector(right, -0.07), w.x, w.z, cx); P = reach(c, JAYA, P, 1, bx.clone().addScaledVector(right, 0.07), w.x, w.z, cx);
    hold(F, 0, bx.clone().addScaledVector(right, -0.075), cam, 0.95); hold(F, 1, bx.clone().addScaledVector(right, 0.075), cam, 0.95);
    // the bakso seller: lifts the little bottle up beside his face, wiggles it
    let Q = life(actAt(B5, t), t, 7, 1); if (t > 6.8) Q = laughing(Q, t, 0.8);
    put(b, BAKSO, Q, SPOT.bakso.x, SPOT.bakso.z, cx, scl(BAKSO), 0, towelEx); const bh = headPt(b, BAKSO, Q), nb = camDir(cam, SPOT.bakso.x, SPOT.bakso.z), rb = V(nb.z, 0, -nb.x);
    const up = at(t, 3.0, 3.5), bp = bh.clone().addScaledVector(nb, 0.25).addScaledVector(rb, 0.36).add(V(0, lerp(-0.6, -0.05, up) + 0.015 * Math.sin(t * 14) * up, 0));
    if (t > 2.9) { F.bottle.visible = true; F.bottle.position.copy(bp).add(V(0, -0.03, 0)); F.bottle.rotation.set(0, 0, 0.15 * Math.sin(t * 7) * up); Q = reach(b, BAKSO, Q, 1, bp.clone().add(V(0, -0.0, 0)), SPOT.bakso.x, SPOT.bakso.z, cx, scl(BAKSO), 0, towelEx, at(t, 2.9, 3.2)); hold(F, 1, bp.clone().add(V(0, 0.0, 0)), cam, 0.9); }
    fxEnd(F);
  },
};

// 6. THE WHOLE MARKET LAUGHS (30 - 33): a crane shot from the aisle: vendors on both sides laugh, Pak Jaya stays calm
const LAUGHERS: [CharSpec, number, number, number][] = [[BAKSO, SPOT.bakso.x, SPOT.bakso.z, 0], [SAYUR, -0.9, 2.8, 1.1], [BUAH, 0.9, 2.75, 2.3], [KELONTONG, -0.55, 4.4, 3.1], [IKAN, 0.55, 4.45, 0.7]];
const S6: SceneDef = {
  from: 30, to: 33, ...DAY, mk: mkPasar({ day: 3 }),
  keys: [...move(0, 3, [{ pos: [0.05, 2.3, 8.6], look: [0.0, 1.05, 2.5], fov: 50 }, { pos: [0.0, 3.2, 9.5], look: [0.0, 0.95, 2.5], fov: 50 }])],
  focus: () => [0, 1.2, 3.0], cInf: 9,
  act: (cx) => {
    const { t, cam } = cx, k = P_(cx), F = k.fx; fxBegin(F); steam(k, F, t); k.plaster.show("torn", 0.008);
    LAUGHERS.forEach(([S, x, z, ph], i) => { const c = cx.card(i); warmTint(c); let P = actAt(actor(20 + i, [{ t: 0, mood: "laugh", arms: i % 2 ? ["hip", "hip"] : ["chest", "rest"], look: [-0.3 * Math.sign(x || 1), 0] }]), t);
      P = laughing(P, t + ph, 1.0, ph); if (i === 1) P = { ...P, arms: [P.arms[0], { a: [40, 80], b: [10 + 30 * Math.abs(Math.sin(t * 15)), 150] }] }; // slapping her knee
      put(c, S, P, x, z, cx, scl(S) * 0.97, 0, S === BAKSO ? towelEx : undefined); });
    const c = cx.card(9); warmTint(c); let P = life(actAt(actor(9, [{ t: 0, mood: "smug", arms: ["rest", "rest"], look: [0, 0.2] }]), t), t, 9, 0.5); P = { ...P, eyes: [{ kind: "closed" }, { kind: "closed" }] };
    const hd = put(c, JAYA, P, 0.1, 1.75, cx); void hd; const n = camDir(cam, 0.1, 1.75), bx = headPt(c, JAYA, P).addScaledVector(n, 0.3).add(V(0, -0.5, 0)), right = V(n.z, 0, -n.x);
    F.box.visible = true; F.box.position.copy(bx); F.box.lookAt(cam.position.clone().setY(bx.y));
    P = reach(c, JAYA, P, 0, bx.clone().addScaledVector(right, -0.07), 0.1, 1.75, cx); P = reach(c, JAYA, P, 1, bx.clone().addScaledVector(right, 0.07), 0.1, 1.75, cx); hold(F, 0, bx.clone().addScaledVector(right, -0.075), cam); hold(F, 1, bx.clone().addScaledVector(right, 0.075), cam);
    fxEnd(F);
  },
};

// 7a. HE KEEPS COMING (33 - 36): at the wall: peels the torn halves off and drops them into a clear plastic bag
const A7 = actor(10, [{ t: 0, mood: "neutral", arms: ["rest", "rest"], look: [0.7, -0.1] }, { t: 1.9, mood: "smug", look: [0.2, 0.4] }]);
const S7a: SceneDef = {
  from: 33, to: 36, ...DAY2, mk: mkPasar({ day: 4 }),
  keys: [...move(0, 3, [{ pos: [0.7, 1.45, 1.6], look: [-0.15, 1.2, -1.9], fov: 40 }, { pos: [0.6, 1.42, 1.3], look: [-0.15, 1.2, -1.9], fov: 40 }])],
  focus: () => [0, 1.3, -1.6], fadeAt: dip(3, 0.3, 0.25),
  act: (cx) => {
    const { t, cam } = cx, k = P_(cx), F = k.fx, c = cx.card(0); fxBegin(F); warmTint(c); steam(k, F, t);
    const peel = at(t, 0.5, 0.95), x = JX, z = JZ + 0.05; let P = life(actAt(A7, t), t, 10, 0.7);
    put(c, JAYA, P, x, z, cx); const hd = headPt(c, JAYA, P), n = camDir(cam, x, z), right = V(n.z, 0, -n.x);
    const bagP = hd.clone().addScaledVector(n, 0.28).addScaledVector(right, -0.32).add(V(0, -0.55, 0)); F.bag.group.visible = true; F.bag.group.position.copy(bagP).add(V(0, -0.02, 0)); F.bag.fill(lerp(0.12, 0.2, at(t, 1.6, 1.8)));
    const off = t < 1.0 ? PLv.clone() : PLv.clone().lerp(bagP.clone().add(V(0, 0.06, 0)), at(t, 1.0, 1.6));
    if (t < 1.0) k.plaster.show("torn", 0.008, peel); else k.plaster.show("none");
    if (t > 0.95 && t < 1.75) { F.handPl.show("torn", 0.01); F.handPl.group.position.copy(off).add(V(-0.03, -0.01, 0)); F.handPl.group.lookAt(cam.position); }
    const hw = at(t, 0.2, 0.5) * (1 - at(t, 1.8, 2.2));
    P = reach(c, JAYA, P, 1, off.clone().add(V(0.02, 0, 0)), x, z, cx, 1, 0, undefined, hw); if (hw > 0.6) hold(F, 1, off.clone().add(V(0.02, 0, 0)), cam);
    P = reach(c, JAYA, P, 0, bagP.clone(), x, z, cx); hold(F, 0, bagP.clone(), cam);
    fxEnd(F);
  },
};

// 7b. THE BAG FILLS (36 - 39.5): three quick days at the wall (a short dip between each): peel the torn halves, drop
//     them in the bag; it gets fuller
const CYC = [0, 1.17, 2.34];
const S7b: SceneDef = {
  from: 36, to: 39.5, ...DAY, mk: mkPasar({ day: 5 }),
  keys: [...move(0, 3.5, [{ pos: [0.4, 1.42, 1.65], look: [-0.25, 1.2, -1.9], fov: 40 }, { pos: [0.35, 1.4, 1.42], look: [-0.25, 1.2, -1.9], fov: 40 }])],
  focus: () => [-0.25, 1.3, -1.55], fadeAt: (t) => Math.max(1 - at(t, 0, 0.2), at(t, 3.25, 3.5), ...CYC.slice(1).map((c) => win(t, c - 0.12, c + 0.12, 0.1) * 0.9)),
  act: (cx) => {
    const { t, cam } = cx, k = P_(cx), F = k.fx, c = cx.card(0); fxBegin(F); warmTint(c); steam(k, F, t);
    const ci = t < CYC[1] ? 0 : t < CYC[2] ? 1 : 2, lt = t - CYC[ci], x = JX, z = JZ + 0.05;
    let P = life(actAt(actor(31 + ci, [{ t: 0, mood: ci === 2 ? "smug" : "neutral", arms: ["rest", "rest"], look: [0.7, -0.1] }, { t: 0.75, mood: "neutral", look: [-0.3, 0.3] }]), lt), t, 31, 0.6);
    put(c, JAYA, P, x, z, cx); const hd = headPt(c, JAYA, P), n = camDir(cam, x, z), right = V(n.z, 0, -n.x);
    const bagP = hd.clone().addScaledVector(n, 0.28).addScaledVector(right, -0.34).add(V(0, -0.55, 0)); F.bag.group.visible = true; F.bag.group.position.copy(bagP).add(V(0, -0.02, 0)); F.bag.fill(0.25 + 0.22 * ci + 0.22 * at(lt, 0.7, 0.8));
    const peel = at(lt, 0.15, 0.4), carry = at(lt, 0.42, 0.75), off = PLv.clone().lerp(bagP.clone().add(V(0, 0.08, 0)), carry);
    if (lt < 0.42) k.plaster.show("torn", 0.008, peel); else k.plaster.show(lt > 0.95 ? "torn" : "none", 0.008);
    if (lt > 0.4 && lt < 0.78) { F.handPl.show("torn", 0.01); F.handPl.group.position.copy(off).add(V(-0.03, -0.01, 0)); F.handPl.group.lookAt(cam.position); }
    const hw = at(lt, 0.0, 0.15) * (1 - at(lt, 0.8, 1.05));
    P = reach(c, JAYA, P, 1, off.clone().add(V(0.02, 0, 0)), x, z, cx, 1, 0, undefined, hw); if (hw > 0.6) hold(F, 1, off.clone().add(V(0.02, 0, 0)), cam);
    P = reach(c, JAYA, P, 0, bagP.clone(), x, z, cx); hold(F, 0, bagP.clone(), cam);
    fxEnd(F);
  },
};

// 8. HE BRINGS AN ENGINEER (39.5 - 45.5): from the back area looking out to the bright street: Pak Jaya walks in; the
//    engineer steps out from behind him; the vendors turn their heads
const J8 = actor(11, [{ t: 0, mood: "neutral", arms: ["rest", "rest"], look: [0, 0.1] }, { t: 3.4, mood: "smug", arms: ["rest", "open"], look: [0.4, 0] }]);
const E8 = actor(12, [{ t: 0, mood: "neutral", arms: ["rest", "rest"], look: [0, 0.1] }, { t: 3.6, mood: "story", arms: ["rest", "rest"], look: [-0.2, 0.2] }, { t: 4.4, mood: "smug", look: [0.1, 0.1] }]);
const S8: SceneDef = {
  from: 39.5, to: 45.5, ...DAY, mk: mkPasar({ day: 6 }),
  keys: [...move(0, 6, [{ pos: [-0.3, 1.5, -0.6], look: [0.2, 1.4, 6.0], fov: 40 }, { pos: [-0.35, 1.5, -0.3], look: [0.2, 1.38, 5.0], fov: 40 }, { pos: [-0.45, 1.48, -0.1], look: [0.3, 1.38, 3.2], fov: 40 }])],
  focus: (t) => [0.2, 1.4, lerp(6.5, 2.8, at(t, 0, 3.4))], cInf: 7,
  act: (cx) => {
    const { t, cam } = cx, k = P_(cx), F = k.fx, c = cx.card(0), e = cx.card(1), b = cx.card(2), v1 = cx.card(3), v2 = cx.card(4); fxBegin(F); for (const q of [c, e, b, v1, v2]) warmTint(q); steam(k, F, t); k.plaster.show("torn", 0.008);
    const w = path(t, 0, 3.2, [0.1, 8.8], [0.15, 2.9]); put(c, JAYA, goTo(life(actAt(J8, t), t, 11, 0.8), w), w.x, w.z, cx);
    // the engineer walks hidden right behind him, then steps out to his right
    const side = at(t, 3.4, 4.0), we = path(t, 0, 3.2, [0.1, 9.25], [0.15, 3.35]), ex = we.x - 0.62 * side, ez = we.z - 0.25 * side;
    let E = goTo(life(actAt(E8, t), t, 12, 0.8), we); if (side > 0 && side < 1) E = walk(E, side * 1.2, 0.7);
    put(e, INSINYUR, E, ex, ez, cx, scl(INSINYUR), 0, both(vestEx, helmetEx));
    const eh = headPt(e, INSINYUR, E), ne = camDir(cam, ex, ez), re = V(ne.z, 0, -ne.x), cp = eh.clone().addScaledVector(ne, 0.22).addScaledVector(re, -0.28).add(V(0, -0.5, 0));
    F.clip.visible = true; F.clip.position.copy(cp); F.clip.lookAt(cam.position); F.clip.rotateX(-0.3); E = reach(e, INSINYUR, E, 0, cp.clone().add(V(0, -0.1, 0)), ex, ez, cx, scl(INSINYUR), 0, both(vestEx, helmetEx)); hold(F, 0, cp.clone().add(V(0, -0.1, 0)), cam);
    b.setVisible(false);
    for (const [q, S, x, z, sd] of [[v1, SAYUR, -3.0, 18.5, 31], [v2, IKAN, 2.9, 18.3, 32]] as [ToonCard, CharSpec, number, number, number][]) {
      const turn = at(t, 3.2 + (sd - 31) * 0.3, 3.8 + (sd - 31) * 0.3); put(q, S, life(actAt(actor(sd, [{ t: 0, mood: "neutral", arms: ["rest", "rest"], look: [x < 0 ? 0.8 : -0.8, 0] }, { t: 3.3, mood: "surprised", look: [x < 0 ? -0.3 : 0.3, -0.1] }]), t), t, sd, 0.6 + 0.4 * turn), x, z, cx, 0.95, 0.14); }
    fxEnd(F);
  },
};

// 9a. THE INSPECTION (45.5 - 49): torch on the crack, knock-knock with a knuckle (dust), a worried face; Pak Jaya beside
const E9 = actor(16, [{ t: 0, mood: "suspicious", arms: ["rest", "rest"], look: [-0.7, 0] }, { t: 1.9, mood: "worried", look: [-0.8, -0.1] }, { t: 2.8, mood: "scared", event: "shockSmall", look: [0.1, 0.1] }]);
const J9 = actor(17, [{ t: 0, mood: "neutral", arms: ["rest", "rest"], look: [0.6, 0] }, { t: 2.9, mood: "worried", arms: ["clasp", "clasp"], look: [0.5, 0] }]);
const S9a: SceneDef = {
  from: 45.5, to: 49, ...DAY, mk: mkPasar({ day: 6 }),
  keys: [...move(0, 3.5, [{ pos: [1.8, 1.55, 1.75], look: [0.5, 1.32, -1.9], fov: 40 }, { pos: [1.65, 1.52, 1.4], look: [0.5, 1.34, -1.9], fov: 40 }])],
  focus: () => [0.3, 1.35, -1.6],
  act: (cx) => {
    const { t, cam } = cx, k = P_(cx), F = k.fx, e = cx.card(0), c = cx.card(1); fxBegin(F); warmTint(e); warmTint(c); steam(k, F, t); k.plaster.show("torn", 0.008);
    const ex = 0.85, ez = -1.45; let E = life(actAt(E9, t), t, 16, 0.8); put(e, INSINYUR, E, ex, ez, cx, scl(INSINYUR), 0, both(vestEx, helmetEx));
    const eh = headPt(e, INSINYUR, E), ne = camDir(cam, ex, ez), re = V(ne.z, 0, -ne.x);
    // torch in the hand nearer the crack, aimed at it; between 1.1 and 2.5 s she taps the wall with it (dust falls);
    // the clipboard in the other hand
    const kn = win(t, 1.1, 2.5, 0.25), bob = Math.max(0, Math.sin((t - 1.35) * 2 * Math.PI * 2.5)) * kn;
    const tp0 = eh.clone().addScaledVector(ne, 0.24).addScaledVector(re, -0.34).add(V(0, -0.55, 0)), tap = CRACK.clone().add(V(0.05, -0.18, 0.12 + 0.05 * bob)), tp = tp0.lerp(tap, kn * 0.85);
    const aim = CRACK.clone().add(V(0.02 * Math.sin(t * 1.7), 0.2 * Math.sin(t * 0.9), 0));
    F.torch.group.visible = true; F.torch.group.scale.setScalar(1.3); F.torch.group.position.copy(tp); F.torch.group.lookAt(aim); F.torch.light.intensity = 6; F.torch.light.target.updateMatrixWorld();
    E = reach(e, INSINYUR, E, 0, tp.clone(), ex, ez, cx, scl(INSINYUR), 0, both(vestEx, helmetEx)); hold(F, 0, tp, cam);
    const cp = eh.clone().addScaledVector(ne, 0.22).addScaledVector(re, 0.32).add(V(0, -0.52, 0)); F.clip.visible = true; F.clip.position.copy(cp); F.clip.lookAt(cam.position); F.clip.rotateX(-0.3);
    E = reach(e, INSINYUR, E, 1, cp.clone().add(V(0, -0.1, 0)), ex, ez, cx, scl(INSINYUR), 0, both(vestEx, helmetEx)); hold(F, 1, cp.clone().add(V(0, -0.1, 0)), cam);
    for (const t0 of [1.4, 1.8, 2.2]) for (const [p, a] of burst(t, t0, 0.7, 5, CRACK.clone().add(V(0.05, -0.1, 0.02)), V(0, -0.5, 0.5), 0.5, 0.2, 0.4, Math.round(t0 * 10))) F.dust.add(p, 0.018 * (1 + a), 0.8 * (1 - a));
    c.setVisible(false); void J9;
    fxEnd(F);
  },
};

// 9b. CLOSED (49 - 52): tape, cones and a warning sign across the back area; the grocer carries his crate out
const S9b: SceneDef = {
  from: 49, to: 52, ...DAY, mk: mkPasar({ day: 6, closed: true, gauge: true }),
  keys: [...move(0, 3, [{ pos: [0.8, 2.1, 5.6], look: [0.0, 1.1, -0.7], fov: 44 }, { pos: [0.5, 1.95, 5.0], look: [0.0, 1.15, -0.8], fov: 44 }])],
  focus: () => [0, 1.2, 0.9], cInf: 8,
  act: (cx) => {
    const { t, cam } = cx, k = P_(cx), F = k.fx, e = cx.card(0), c = cx.card(1), g = cx.card(2); fxBegin(F); for (const q of [e, c, g]) warmTint(q); steam(k, F, t); k.plaster.show("torn", 0.008);
    const E = life(actAt(actor(18, [{ t: 0, mood: "worried", arms: ["rest", "point"], look: [-0.8, 0] }, { t: 1.6, mood: "neutral", arms: ["rest", "rest"], look: [0, 0.1] }]), t), t, 18, 0.8);
    put(e, INSINYUR, E, 0.75, 1.45, cx, scl(INSINYUR), 0, both(vestEx, helmetEx));
    put(c, JAYA, life(actAt(actor(19, [{ t: 0, mood: "worried", arms: ["clasp", "clasp"], look: [0.5, 0] }]), t), t, 19, 0.6), 0.1, 1.55, cx);
    const w = path(t, 0, 3, [-2.9, 1.5], [-1.4, 3.2], 0.55); let G = goTo(life(actAt(actor(20, [{ t: 0, mood: "worried", arms: ["rest", "rest"], look: [0.5, 0] }]), t), t, 20, 0.7), w, 0.7);
    put(g, KELONTONG, G, w.x, w.z, cx, 0.97); const gh = headPt(g, KELONTONG, G), ng = camDir(cam, w.x, w.z), rg = V(ng.z, 0, -ng.x), crp = gh.clone().addScaledVector(ng, 0.3).add(V(0, -0.62, 0));
    F.box.visible = false; const cr8 = k.closedG.children.find((o) => o.type === "Mesh" && Math.abs(o.position.x + 2.8) < 0.05) as THREE.Object3D | undefined; if (cr8) { cr8.position.copy(crp); cr8.lookAt(cam.position.clone().setY(crp.y)); }
    G = reach(g, KELONTONG, G, 0, crp.clone().addScaledVector(rg, -0.24), w.x, w.z, cx, 0.97); G = reach(g, KELONTONG, G, 1, crp.clone().addScaledVector(rg, 0.24), w.x, w.z, cx, 0.97);
    hold(F, 0, crp.clone().addScaledVector(rg, -0.25), cam); hold(F, 1, crp.clone().addScaledVector(rg, 0.25), cam);
    fxEnd(F);
  },
};

// 10. THE MANAGER (52 - 57): hurries up the aisle, out of breath, palms up: "Bapak tahu dari mana?"
const M10 = actor(21, [{ t: 0, mood: "worried", arms: ["rest", "rest"], look: [0, 0.2] }, { t: 2.0, mood: "nervous", arms: ["open", "open"], look: [-0.8, 0] }, { t: 4.4, mood: "worried", arms: ["open", "open"], look: [-0.8, 0] }],
  say("Bapak tahu dari mana?", 2.3, 4.2, [1]));
const J10 = actor(22, [{ t: 0, mood: "neutral", arms: ["rest", "rest"], look: [0.4, 0] }, { t: 2.0, mood: "neutral", look: [0.8, 0] }, { t: 4.3, mood: "smug", look: [0.8, 0] }]);
const S10: SceneDef = {
  from: 52, to: 57, ...DAY, mk: mkPasar({ day: 6, closed: true, gauge: true }),
  keys: [...move(0, 1.9, [{ pos: [2.5, 1.62, 5.6], look: [0.05, 1.3, 2.3], fov: 42 }, { pos: [2.3, 1.6, 5.05], look: [0.05, 1.3, 1.85], fov: 41 }]), ...move(1.9, 5, [{ pos: [2.3, 1.6, 5.05], look: [0.05, 1.3, 1.85], fov: 41 }, { pos: [2.1, 1.56, 4.75], look: [0.05, 1.33, 1.8], fov: 40 }])],
  focus: () => [0, 1.4, 1.75],
  act: (cx) => {
    const { t } = cx, k = P_(cx), F = k.fx, m = cx.card(0), c = cx.card(1); fxBegin(F); warmTint(m); warmTint(c); steam(k, F, t); k.plaster.show("torn", 0.008);
    const w = path(t, 0, 1.9, [1.2, 6.0], [0.55, 1.85], 0.7); let M = goTo(life(actAt(M10, t), t, 21, 1.0), w, 1.15);
    const sw = Math.sin(t * (w.moving ? 9 : 3)); put(m, PENGELOLA, M, w.x, w.z, cx, scl(PENGELOLA), 0, both(lanyardEx(sw), sweatEx(PENGELOLA, t, 0.8)));
    put(c, JAYA, life(actAt(J10, t), t, 22, 0.7), -0.45, 1.6, cx);
    fxEnd(F);
  },
};

// 11. THE BAG OF TORN PLASTERS (57 - 60.5): Pak Jaya lifts the full bag up between them; the manager's eyes pop
const M11 = actor(23, [{ t: 0, mood: "worried", arms: ["open", "open"], look: [-0.8, 0] }, { t: 1.5, mood: "shock", event: "shock", arms: ["rest", "rest"], look: [-0.5, -0.2] }, { t: 2.4, mood: "surprised", look: [-0.6, -0.1] }]);
const J11 = actor(24, [{ t: 0, mood: "smug", arms: ["rest", "rest"], look: [0.8, 0] }, { t: 1.4, mood: "smug", look: [0.6, -0.1] }]);
const S11: SceneDef = {
  from: 57, to: 60.5, ...DAY, mk: mkPasar({ day: 6, closed: true, gauge: true }),
  keys: [...move(0, 1.3, [{ pos: [2.1, 1.56, 4.75], look: [0.05, 1.35, 1.8], fov: 40 }, { pos: [2.05, 1.55, 4.65], look: [0.03, 1.38, 1.78], fov: 40 }]), ...move(1.3, 3.5, [{ pos: [2.05, 1.55, 4.65], look: [0.03, 1.38, 1.78], fov: 40 }, { pos: [1.9, 1.54, 4.5], look: [0.0, 1.42, 1.75], fov: 40 }])],
  focus: () => [-0.1, 1.45, 1.9],
  act: (cx) => {
    const { t, cam } = cx, k = P_(cx), F = k.fx, m = cx.card(0), c = cx.card(1); fxBegin(F); warmTint(m); warmTint(c); steam(k, F, t); k.plaster.show("torn", 0.008);
    let M = life(actAt(M11, t), t, 23, 1.0); const pop = at(t, 1.5, 1.62) * (1 - 0.4 * at(t, 2.4, 3.0)); M = stretch(M, pop * 0.7); if (pop > 0.2) M = withMouth(withEyes(M, "shock", { size: 1 + 0.5 * pop }), "wide", 1);
    put(m, PENGELOLA, M, 0.55, 1.85, cx, scl(PENGELOLA), 0, both(lanyardEx(Math.sin(t * 3)), shockEx(PENGELOLA, win(t, 1.5, 2.4))));
    let P = life(actAt(J11, t), t, 24, 0.6), x = -0.45, z = 1.6; put(c, JAYA, P, x, z, cx); const hd = headPt(c, JAYA, P), n = camDir(cam, x, z), right = V(n.z, 0, -n.x);
    const up = at(t, 0.4, 1.3), bp = hd.clone().addScaledVector(n, 0.3).addScaledVector(right, 0.42).add(V(0, lerp(-0.75, -0.05, up) + 0.01 * Math.sin(t * 2), 0));
    F.bag.group.visible = true; F.bag.group.position.copy(bp).add(V(0, -0.02, 0)); F.bag.group.rotation.y = 0.3 * Math.sin(t * 1.2); F.bag.fill(1);
    P = reach(c, JAYA, P, 1, bp, x, z, cx); hold(F, 1, bp, cam);
    if (t > 1.3) for (let i = 0; i < 4; i++) { const a = t * 1.8 + i * 1.57; F.star.add(bp.clone().add(V(0.13 * Math.cos(a), -0.1 + 0.08 * Math.sin(a), 0.05)), 0.03 * (0.6 + 0.4 * Math.sin(t * 7 + i)), 0.6 * at(t, 1.3, 1.6)); }
    fxEnd(F);
  },
};

// 12. WHY IT TEARS (60.5 - 71): macro: the camera follows the crack down to the plaster; the two sides of the wall move
//     apart (red arrows), the plaster stretches thinner and snaps
const OPEN12 = (t: number) => 0.0095 * at(t, 3.2, 6.7) + 0.0035 * at(t, 6.9, 10.5);
const S12: SceneDef = {
  from: 60.5, to: 71, ...MACRO, mk: () => new RetakSet() as unknown as SetLike,
  keys: [...move(0, 3.0, [{ pos: [0.02, 0.42, 0.5], look: [0.0, 0.34, 0], fov: 35 }, { pos: [0.03, 0.24, 0.52], look: [0.0, 0.18, 0], fov: 35 }, { pos: [0.04, 0.09, 0.5], look: [0.005, 0.06, 0], fov: 35 }]),
    ...move(3.0, 6.75, [{ pos: [0.04, 0.09, 0.5], look: [0.005, 0.06, 0], fov: 35 }, { pos: [0.04, 0.085, 0.4], look: [0.006, 0.06, 0], fov: 35 }]),
    ...move(6.75, 7.1, [{ pos: [0.04, 0.085, 0.4], look: [0.006, 0.06, 0], fov: 35 }, { pos: [0.04, 0.085, 0.39], look: [0.006, 0.06, 0], fov: 35 }], sm, 0.004),
    ...move(7.1, 10.5, [{ pos: [0.04, 0.085, 0.39], look: [0.006, 0.06, 0], fov: 35 }, { pos: [0.17, 0.11, 0.36], look: [0.006, 0.055, 0], fov: 35 }])],
  focus: (t) => (t < 3 ? [0, lerp(0.34, 0.06, at(t, 0, 3)), 0] : [0.006, 0.06, 0]), cInf: 0.6, fadeAt: dip(10.5, 0.3, 0.3),
  act: (cx) => { const k = cx.set as unknown as RetakSet, t = cx.t; k.set(OPEN12(t), t > 6.8, win(t, 3.2, 6.9, 0.3), t); },
};

// 13. HOW ENGINEERS WATCH IT (71 - 78.5): macro on the tell-tale gauge across the same crack; the red cross-hair slides
//     off the zero of the millimetre grid as the crack opens
const S13: SceneDef = {
  from: 71, to: 78.5, ...MACRO, mk: () => new RetakSet() as unknown as SetLike,
  keys: [...move(0, 2.4, [{ pos: [0.12, 0.2, 0.62], look: [0.0, 0.0, 0], fov: 35 }, { pos: [0.0, -0.04, 0.74], look: [-0.01, -0.12, 0], fov: 35 }]), ...move(2.4, 7.5, [{ pos: [0.0, -0.04, 0.74], look: [-0.01, -0.12, 0], fov: 35 }, { pos: [-0.005, -0.07, 0.64], look: [-0.01, -0.12, 0], fov: 35 }])],
  focus: (t) => (t < 2.4 ? [0, lerp(0.0, -0.12, at(t, 0, 2.4)), 0] : [-0.012, -0.12, 0]), cInf: 0.6, fadeAt: dip(7.5, 0.3, 0.3),
  act: (cx) => { const k = cx.set as unknown as RetakSet, t = cx.t; k.set(0.009 * at(t, 2.6, 6.8), true, 0, t); k.plaster.group.visible = false; },
};

// 14. NOT HEALING A WALL (78.5 - 84): Pak Jaya stands calm in front of the taped-off wall with the gauge on it, hands
//     clasped, looking at the crack; slow push in
const A14 = actor(25, [{ t: 0, mood: "neutral", arms: ["clasp", "clasp"], look: [0.7, -0.1] }, { t: 3.2, mood: "smug", look: [0.2, 0.2] }]);
const S14: SceneDef = {
  from: 78.5, to: 84, ...DAY2, mk: mkPasar({ day: 7, closed: true, gauge: true }),
  keys: [...move(0, 5.5, [{ pos: [1.15, 1.55, 2.1], look: [-0.05, 1.3, -1.9], fov: 40 }, { pos: [0.95, 1.52, 1.65], look: [-0.05, 1.3, -1.9], fov: 40 }, { pos: [0.85, 1.5, 1.45], look: [-0.08, 1.32, -1.9], fov: 40 }])],
  focus: () => [-0.1, 1.4, -1.5], fadeAt: dip(5.5, 0.3, 0.3),
  act: (cx) => {
    const { t } = cx, k = P_(cx), F = k.fx, c = cx.card(0); fxBegin(F); warmTint(c); steam(k, F, t); k.plaster.show("torn", 0.008);
    let P = life(actAt(A14, t), t, 25, 0.5); P = nod(P, t, 3.6, 1, 10); put(c, JAYA, P, JX + 0.12, JZ + 0.3, cx);
    fxEnd(F);
  },
};

// 15. THE NEXT DAY, MEDICINE (84 - 88.5): the bakso seller walks up with a box of medicine; "Buat siapa?"
const B15 = actor(26, [{ t: 0, mood: "neutral", arms: ["rest", "rest"], look: [0.2, 0.1] }, { t: 2.3, mood: "neutral", look: [-0.8, 0] }, { t: 3.6, mood: "smug", look: [-0.8, 0] }]);
const J15 = actor(27, [{ t: 0, mood: "neutral", arms: ["rest", "rest"], look: [0.4, 0] }, { t: 1.6, mood: "surprised", look: [0.8, 0] }, { t: 2.4, mood: "suspicious", arms: ["rest", "chin"], look: [0.8, 0] }],
  say("Buat siapa?", 2.6, 3.6, [1]));
const S15: SceneDef = {
  from: 84, to: 88.5, ...DAY, mk: mkPasar({ day: 8, closed: true, gauge: true }),
  keys: [...move(0, 2.3, [{ pos: [-2.1, 1.62, 6.6], look: [0.1, 1.3, 2.0], fov: 41 }, { pos: [-1.9, 1.58, 6.0], look: [0.05, 1.32, 1.9], fov: 40 }]), ...move(2.3, 4.5, [{ pos: [-1.9, 1.58, 6.0], look: [0.05, 1.32, 1.9], fov: 40 }, { pos: [-1.75, 1.56, 5.7], look: [0.05, 1.34, 1.85], fov: 40 }])],
  focus: () => [0.05, 1.4, 1.9], fadeAt: dip(4.5, 0.3, 0),
  act: (cx) => {
    const { t, cam } = cx, k = P_(cx), F = k.fx, b = cx.card(0), c = cx.card(1); fxBegin(F); warmTint(b); warmTint(c); steam(k, F, t); k.plaster.show("torn", 0.008);
    put(c, JAYA, life(actAt(J15, t), t, 27, 0.7), 0.65, 1.55, cx);
    const w = path(t, 0, 2.2, [-1.0, 5.4], [-0.5, 2.15]); let Q = goTo(life(actAt(B15, t), t, 26, 0.8), w);
    put(b, BAKSO, Q, w.x, w.z, cx, scl(BAKSO), 0, towelEx); const bh = headPt(b, BAKSO, Q), nb = camDir(cam, w.x, w.z), rb = V(nb.z, 0, -nb.x), kp = bh.clone().addScaledVector(nb, 0.3).add(V(0, -0.5 + 0.015 * Math.sin(t * 9) * (w.moving ? 1 : 0), 0));
    F.kotak.visible = true; F.kotak.position.copy(kp); F.kotak.lookAt(cam.position.clone().setY(kp.y));
    Q = reach(b, BAKSO, Q, 0, kp.clone().addScaledVector(rb, -0.06), w.x, w.z, cx, scl(BAKSO), 0, towelEx); Q = reach(b, BAKSO, Q, 1, kp.clone().addScaledVector(rb, 0.08), w.x, w.z, cx, scl(BAKSO), 0, towelEx);
    hold(F, 0, kp.clone().addScaledVector(rb, -0.065), cam); hold(F, 1, kp.clone().addScaledVector(rb, 0.085), cam);
    fxEnd(F);
  },
};

// 16. "THE MANAGER. HE'S BEEN PALE SINCE YESTERDAY" (88.5 - 94): the bakso seller thumbs toward the pillar; the camera
//     glides over to the manager leaning on it: pale, sweating, staring at the closed area; fade out
const B16 = actor(28, [{ t: 0, mood: "story", arms: ["rest", "point"], look: [0.8, 0] }, { t: 2.9, mood: "worried", arms: ["rest", "rest"], look: [0.8, 0] }],
  say("Pengelola pasar. Mukanya pucat dari kemarin.", 0.15, 2.9, [0, 3]));
const M16 = actor(29, [{ t: 0, mood: "worried", arms: ["rest", "mouthHand"], look: [-0.7, -0.15] }, { t: 3.6, mood: "scared", arms: ["rest", "mouthHand"], look: [-0.8, -0.1] }]);
const S16: SceneDef = {
  from: 88.5, to: 94, ...DAY, mk: mkPasar({ day: 8, closed: true, gauge: true }),
  keys: [...move(0, 2.2, [{ pos: [-1.75, 1.56, 5.7], look: [0.05, 1.34, 1.85], fov: 40 }, { pos: [-1.55, 1.56, 5.5], look: [0.25, 1.36, 1.8], fov: 40 }]), ...move(2.2, 4.0, [{ pos: [-1.55, 1.56, 5.5], look: [0.25, 1.36, 1.8], fov: 40 }, { pos: [0.6, 1.6, 5.2], look: [2.0, 1.38, 1.25], fov: 40 }, { pos: [1.35, 1.55, 4.75], look: [2.05, 1.4, 1.2], fov: 40 }]),
    ...move(4.0, 5.5, [{ pos: [1.35, 1.55, 4.75], look: [2.05, 1.4, 1.2], fov: 40 }, { pos: [1.45, 1.53, 4.45], look: [2.05, 1.42, 1.2], fov: 40 }])],
  focus: (t) => (t < 2.4 ? [0.1, 1.4, 1.9] : [2.15, 1.4, 1.2]), fadeAt: dip(5.5, 0, 0.6),
  act: (cx) => {
    const { t, cam } = cx, k = P_(cx), F = k.fx, b = cx.card(0), c = cx.card(1), m = cx.card(2); fxBegin(F); warmTint(b); warmTint(c); tint(m, 0.6, "200,230,255", "60,80,150"); steam(k, F, t); k.plaster.show("torn", 0.008);
    put(c, JAYA, life(actAt(actor(30, [{ t: 0, mood: "suspicious", arms: ["rest", "chin"], look: [0.8, 0] }, { t: 2.0, mood: "surprised", arms: ["rest", "rest"], look: [1, 0] }]), t), t, 30, 0.6), 0.65, 1.55, cx);
    let Q = life(actAt(B16, t), t, 28, 0.8); put(b, BAKSO, Q, -0.5, 2.15, cx, scl(BAKSO), 0, towelEx); const bh = headPt(b, BAKSO, Q), nb = camDir(cam, -0.5, 2.15), kp = bh.clone().addScaledVector(nb, 0.3).add(V(0, -0.5, 0)), rb = V(nb.z, 0, -nb.x);
    F.kotak.visible = true; F.kotak.position.copy(kp.clone().addScaledVector(rb, -0.06)); F.kotak.lookAt(cam.position.clone().setY(kp.y)); Q = reach(b, BAKSO, Q, 0, kp.clone().addScaledVector(rb, -0.12), -0.5, 2.15, cx, scl(BAKSO), 0, towelEx); hold(F, 0, kp.clone().addScaledVector(rb, -0.125), cam);
    // the manager: leaning on the pillar (body tilted toward it), pale, sweating, a hand over his mouth
    let M = life(actAt(M16, t), t, 29, 0.5); M = { ...M, body: { ...M.body, lean: M.body.lean - 0.16 }, head: { ...M.head, rot: M.head.rot - 0.1 } };
    put(m, PENGELOLA, M, SPOT.mgr.x, SPOT.mgr.z, cx, scl(PENGELOLA), 0, both(lanyardEx(0), paleEx(PENGELOLA, 1), sweatEx(PENGELOLA, t, 1)));
    fxEnd(F);
  },
};

export const PLESTER_SCENES: SceneDef[] = [S1, S2, S3, S4a, S4b, S5, S6, S7a, S7b, S8, S9a, S9b, S10, S11, S12, S13, S14, S15, S16];
export const PLESTER_FRAMES = Math.round(94 * FPS);
/** the downloaded models (public/plester/models) load once; the film waits for them */
export const PlesterFilm: React.FC = () => {
  const [ok, setOk] = React.useState(hasModels()), [h] = React.useState(() => (hasModels() ? null : delayRender("plester models", { timeoutInMilliseconds: 240000 })));
  React.useEffect(() => { if (!ok) loadModels().then(() => { setOk(true); if (h !== null) continueRender(h); }); }, [ok, h]);
  return ok ? <Reel scenes={PLESTER_SCENES} /> : null;
};
