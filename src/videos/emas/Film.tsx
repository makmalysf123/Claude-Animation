// "Kalau Kamu Nemu Emas Kuno di Halaman Belakang" full film (106 s), following docs/scripts/emas-kuno-naskah-v2.md.
// The user's rules for this render (2026-11-18): no text at all on screen (they add voice + subtitles), a colourful world
// where light visibly bounces onto objects and the 2D characters (card tints), everything 3D except the characters,
// unhurried scenes, an active camera, goofy acting, nothing cut by the frame, no close-ups that slice heads or props.
// Framing rule used everywhere: the portrait frame is narrow, half its width at distance d is d * tan(fov/2) * 0.5625,
// so every shot keeps the people and their props inside that width with a margin.
import React from "react";
import * as THREE from "three";
import { actAt, Actor, Beat, FPS, clamp01, sm, noise } from "../../lib/acting";
import { headCenter, Limb, Pose, CharSpec, OUTLINE } from "../../lib/toon2";
import { SU, ToonCard } from "../../lib/toonCard";
import { Reel, SceneDef, SetLike, Ctx, Key, handWorld, V3 } from "../../lib/scene";
import { TEX, SpritePool, burst, drawTears, drawShockLines, drawSpeedLines, drawSparkles, drawFlyingSweat, drawZzz, easeOutBack } from "../kopi/fx";
import { drawHeadGlow, drawGlasses, drawTie } from "../kopi/props";
import { ANTRE } from "../kopi/cast";
import { canvasTex } from "../ketindihan2/sets";
import { yardMk, yardK, strike, placeHoe, DUSK, TI, yardGrip, COIN_AT, type YardK } from "./Preview";
import { KAMU, PACAR, POLISI, PERAMPOK, INTEL, PEMILIK } from "./cast";
import { PhoneProp, PhoneMode, Clock, envelope, cashStack, handcuffs } from "./props";
import { KamarSet, KafeSet, InterogasiSet, TokoSet, CoinRig, BED_SEAT, GUCI_AT, DESK_SEAT, LAPTOP_AT, BUYER_AT, YOU_AT, TABLE, INT_SEAT, INT_TABLE, OWNER_AT, CUST_AT, SCALE_AT, COUNTER, RoomMode } from "./rooms";
import { MimpiSet, SimpangSet, DREAM, SIMPANG } from "./outside";

// ---------------- small helpers (same maths as the Kopi film) ----------------
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const at = (t: number, a: number, b: number) => sm((t - a) / (b - a));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const win = (t: number, a: number, b: number, f = 0.25) => at(t, a, a + f) * (1 - at(t, b - f, b));
type Ex = (g: CanvasRenderingContext2D, P: Pose) => void;
const both = (...f: (Ex | undefined | false | null)[]): Ex => (g, P) => f.forEach((x) => x && x(g, P));
const actor = (seed: number, beats: Beat[]): Actor => ({ seed, beats, words: [] });
const scl = (S: CharSpec) => (S === KAMU ? 1 : S === PACAR ? 0.93 : 0.98);
const cardPt = (c: ToonCard, x: number, y: number) => { c.mesh.updateMatrixWorld(); return c.mesh.localToWorld(V((x - 300) * SU, (975 - y) * SU, 0)); };
const headPt = (c: ToonCard, S: CharSpec, P: Pose) => { const [x, y] = headCenter(S, P); return cardPt(c, x, y); };
const camDir = (cam: THREE.Camera, x: number, z: number) => V(cam.position.x - x, 0, cam.position.z - z).normalize();
const rightOf = (cam: THREE.Camera, x: number, z: number) => { const n = camDir(cam, x, z); return V(n.z, 0, -n.x); };
const put = (c: ToonCard, S: CharSpec, P: Pose, x: number, z: number, cx: Ctx, sc = scl(S), y = 0, extra?: Ex) => c.update(S, P, x, z, cx.cam, cx.set.sunDir, sc, y, extra);
const withMouth = (P: Pose, kind: Pose["mouth"]["kind"], open = 0.5): Pose => ({ ...P, mouth: { kind, open } });
const withEyes = (P: Pose, kind: Pose["eyes"][0]["kind"], extra: Partial<Pose["eyes"][0]> = {}): Pose => ({ ...P, eyes: [{ kind, ...extra }, { kind, ...extra }] });
const eyesShut = (P: Pose): Pose => withEyes(P, "closed");
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
// ---- goofy acting layer ----
const life = (P: Pose, t: number, seed: number, k = 1): Pose => { const s = seed * 1.7, w = 2 * Math.PI;
  return { ...P, bob: P.bob + 4 * k * Math.sin(t * w * 0.9 + s), body: { ...P.body, sy: P.body.sy * (1 + 0.02 * k * Math.sin(t * w * 0.9 + s + 1)), lean: P.body.lean + 0.03 * k * Math.sin(t * w * 0.45 + s) },
    head: { ...P.head, rot: P.head.rot + 0.05 * k * Math.sin(t * w * 0.6 + s * 2), dy: P.head.dy + 3 * k * Math.sin(t * w * 1.1 + s) } }; };
const laughing = (P: Pose, t: number, k = 1): Pose => { const w = 2 * Math.PI * 2.4, b = Math.sin(w * t);
  return { ...P, bob: P.bob - 12 * k * Math.abs(b), body: { ...P.body, bend: P.body.bend + k * (10 + 10 * b), lean: P.body.lean + k * 0.12 * Math.sin(w * t / 2), sy: P.body.sy * (1 - 0.05 * k * Math.abs(b)) },
    head: { ...P.head, rot: P.head.rot + k * 0.18 * Math.sin(w * t / 2), dy: P.head.dy - 10 * k * Math.abs(b) }, eyes: [{ kind: "happy" }, { kind: "happy" }], mouth: { kind: "laugh", open: 0.85 + 0.15 * Math.abs(b) } }; };
const walk = (P: Pose, ph: number, amp = 1, bounce = 1): Pose => {
  const a0 = ph * Math.PI * 2;
  const legs = [0, 1].map((k) => { const s = k ? 1 : -1, a = a0 + k * Math.PI, sw = Math.cos(a), lift = Math.max(0, Math.sin(a)); return { a: [s * 5 + 18 * sw * amp, 118 - 30 * lift * amp], b: [s * 3 + 40 * sw * amp, -60 * lift * amp] } as Limb; }) as [Limb, Limb];
  const arms = P.arms.map((A, k) => { const sw = Math.cos(a0 + (1 - k) * Math.PI) * amp; return { a: [A.a[0] + 14 * sw, A.a[1]], b: [A.b[0] + 34 * sw, A.b[1] - 8 * Math.abs(sw)] } as Limb; }) as [Limb, Limb];
  return { ...P, legs, arms, bob: P.bob - (8 + 10 * bounce) * Math.abs(Math.sin(a0)) * amp, body: { ...P.body, lean: P.body.lean + 0.05 * amp, sy: P.body.sy * (1 + 0.04 * bounce * amp * Math.cos(2 * a0)) }, head: { ...P.head, rot: P.head.rot + 0.07 * amp * Math.sin(a0) } };
};
const hopY = (t: number, t0: number, dur: number, h: number) => { const u = (t - t0) / dur; return u <= 0 || u >= 1 ? 0 : h * 4 * u * (1 - u); };
const squash = (P: Pose, k: number): Pose => ({ ...P, body: { ...P.body, sy: P.body.sy * (1 - 0.14 * k), sx: P.body.sx * (1 + 0.1 * k) }, bob: P.bob + 18 * k });
const stretch = (P: Pose, k: number): Pose => ({ ...P, body: { ...P.body, sy: P.body.sy * (1 + 0.1 * k), sx: P.body.sx * (1 - 0.06 * k) }, head: { ...P.head, sy: P.head.sy * (1 + 0.1 * k), dy: P.head.dy - 14 * k } });
const crouch = (P: Pose, k: number): Pose => k <= 0 ? P : ({ ...P, bob: P.bob + 125 * k, legs: [{ a: [-5 - 75 * k, 118 - 40 * k], b: [-34 * k, 0] }, { a: [5 + 75 * k, 118 - 40 * k], b: [34 * k, 0] }], body: { ...P.body, sy: P.body.sy * (1 - 0.06 * k) } });
const nod = (P: Pose, t: number, t0: number, n = 3, amp = 16): Pose => { const u = t - t0; if (u < 0 || u > n * 0.32) return P; return { ...P, head: { ...P.head, dy: P.head.dy + amp * Math.abs(Math.sin((u / 0.32) * Math.PI)) } }; };
const shakeHead = (P: Pose, t: number, t0: number, dur: number, amp = 0.22): Pose => { const u = t - t0; if (u < 0 || u > dur) return P; return { ...P, head: { ...P.head, rot: P.head.rot + amp * Math.sin(u * 30) * (1 - u / dur), dx: P.head.dx + 14 * Math.sin(u * 30) * (1 - u / dur) } }; };
const sitY = (S: CharSpec, sc: number, seat = 0.48) => seat - S.legLen * SU * sc;
const SIT_LEGS: [Limb, Limb] = [{ a: [-14, 60], b: [-30, -40] }, { a: [14, 60], b: [30, -40] }];
const seated = (P: Pose): Pose => ({ ...P, legs: SIT_LEGS });
/** seated on the bed's foot edge, feet on the floor, knees out (a bit goofy) */
const bedLegs = (P: Pose, swing = 0): Pose => ({ ...P, legs: [{ a: [-22, 30], b: [-34 - 14 * swing, -108 + 10 * Math.max(0, swing)] }, { a: [22, 30], b: [34 + 14 * swing, -108 + 10 * Math.max(0, -swing)] }] });

// ---------------- camera glides (Catmull-Rom, eased at the ends only) ----------------
type P3 = { pos: V3; look: V3; fov?: number };
const cr = (a: number, b: number, c: number, d: number, u: number) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
const crV = (P: V3[], s: number): V3 => { const n = P.length, i = Math.min(n - 2, Math.floor(s)), u = s - i, g = (k: number) => P[Math.max(0, Math.min(n - 1, k))]; return [0, 1, 2].map((j) => cr(g(i - 1)[j], g(i)[j], g(i + 1)[j], g(i + 2)[j], u)) as V3; };
const whip = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
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
const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ---------------- effects rig shared by every set ----------------
const heartTex = canvasTex(64, 64, (g) => { g.fillStyle = "#ff4d6d"; g.beginPath(); g.moveTo(32, 56); g.bezierCurveTo(-6, 30, 10, 2, 32, 20); g.bezierCurveTo(54, 2, 70, 30, 32, 56); g.fill(); g.fillStyle = "rgba(255,255,255,0.6)"; g.beginPath(); g.arc(22, 22, 6, 0, Math.PI * 2); g.fill(); });
type FX = { hands: THREE.Mesh[]; arms: THREE.Mesh[]; puff: SpritePool; star: SpritePool; spark: SpritePool; dust: SpritePool; drop: SpritePool; flash: SpritePool; heart: SpritePool; phone: PhoneProp; flashL: THREE.PointLight; tint: THREE.PointLight; env: THREE.Group; cash: THREE.Group; clock: Clock };
const addFx = (R: THREE.Object3D): FX => {
  const F: FX = {
    hands: [0, 1, 2, 3].map(() => { const h = new THREE.Mesh(new THREE.SphereGeometry(17 * SU, 20, 14), new THREE.MeshBasicMaterial({ color: OUTLINE })); h.visible = false; h.renderOrder = 10; R.add(h); return h; }),
    arms: [0, 1, 2, 3].map(() => { const a = new THREE.Mesh(new THREE.CylinderGeometry(7 * SU, 7 * SU, 1, 8), new THREE.MeshBasicMaterial({ color: OUTLINE })); a.visible = false; R.add(a); return a; }),
    puff: new SpritePool(R, TEX.puff, 60), star: new SpritePool(R, TEX.star, 50, true), spark: new SpritePool(R, TEX.star, 40, true, "#ffd27a"), dust: new SpritePool(R, TEX.dust, 40, false, "#8a6a4a"),
    drop: new SpritePool(R, TEX.drop, 20), flash: new SpritePool(R, TEX.flash, 3, true), heart: new SpritePool(R, heartTex, 16), phone: new PhoneProp(), flashL: new THREE.PointLight("#eef4ff", 0, 5, 1.5), tint: new THREE.PointLight("#b45cff", 0, 4, 1.4),
    env: envelope(), cash: cashStack(16), clock: new Clock(0.3, "#ffd166"),
  };
  R.add(F.phone.group, F.flashL, F.tint, F.env, F.cash, F.clock.group); F.phone.group.visible = false; F.env.visible = false; F.cash.visible = false; F.clock.group.visible = false; return F;
};
const fxBegin = (F: FX) => { for (const p of [F.puff, F.star, F.spark, F.dust, F.drop, F.flash, F.heart]) p.begin(); F.hands.forEach((h) => (h.visible = false)); F.arms.forEach((a) => (a.visible = false)); F.phone.group.visible = false; F.env.visible = false; F.cash.visible = false; F.clock.group.visible = false; F.flashL.intensity = 0; F.tint.intensity = 0; };
const fxEnd = (F: FX) => { for (const p of [F.puff, F.star, F.spark, F.dust, F.drop, F.flash, F.heart]) p.end(); };
/** a 3D ball hand on a grip point, on the camera side of the prop, so the prop is clearly HELD */
const hold = (F: FX, i: number, p: THREE.Vector3, cam: THREE.Camera, sc = 1) => { const h = F.hands[i]; h.position.copy(p).addScaledVector(cam.position.clone().sub(p).normalize(), 0.022 * sc); h.scale.setScalar(sc); h.visible = true; };
const arm3 = (F: FX, i: number, a: THREE.Vector3, b: THREE.Vector3, th = 1) => { const m = F.arms[i], d = b.clone().sub(a); m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(th, d.length(), th); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); m.visible = true; };
type WithFx = { fx: FX };
const withFx = <T extends SetLike>(make: () => T, f?: (k: T & WithFx) => void) => () => { const k = make() as T & WithFx; k.fx = addFx(k.root); f?.(k); return k as SetLike; };
const get = <T,>(cx: Ctx) => cx.set as unknown as T & WithFx;
/** the card picks up coloured bounce light: lift on the lit side, shade colour on the far side */
const tint = (c: ToonCard, shade: number, lift: string, sh: string) => { c.shade = shade; c.liftCol = lift; c.shadeCol = sh; };
const faceCam = (o: THREE.Object3D, cam: THREE.Camera, up = 0.15) => { const d = cam.position.clone().sub(o.position).normalize().add(V(0, up, 0)).normalize(); o.quaternion.setFromUnitVectors(V(0, 1, 0), d); };
/** coin (on a CoinRig) at p, its face toward the camera, glowing k */
const coinAt = (r: CoinRig, p: THREE.Vector3, cam: THREE.Camera, s: number, k: number, t: number, spin = 0.3) => { r.coin.visible = true; r.coin.position.copy(p); r.coin.scale.setScalar(s); faceCam(r.coin, cam); r.coin.rotateY(spin * Math.sin(t * 1.4)); r.set(k, t, 0.12 + 0.1 * s, 1.4); };
const orbit = (F: FX, p: THREE.Vector3, t: number, k: number, n = 5, r = 0.07, size = 0.045) => { for (let i = 0; i < n; i++) { const a = t * 1.7 + (i * Math.PI * 2) / n, rr = r * (1 + 0.25 * Math.sin(t * 4 + i)); F.star.add(p.clone().add(V(rr * Math.cos(a), rr * Math.sin(a) * 0.8, 0.02 * Math.sin(a))), size * k * (0.6 + 0.4 * Math.sin(t * 8 + i)), k); } };

// ---------------- drawn extras on the cards ----------------
const head = (S: CharSpec, P: Pose) => headCenter(S, P);
const glowEx = (S: CharSpec, k: number, t: number): Ex => (g, P) => { const [x, y] = head(S, P); drawHeadGlow(g, x, y, S.R, k, t); };
const screenEx = (S: CharSpec, k: number, col = "150,200,255"): Ex => (g, P) => { if (k <= 0.01) return; const [x, y] = head(S, P); g.save(); g.globalCompositeOperation = "source-atop"; const gr = g.createRadialGradient(x, y + S.R * 0.3, 0, x, y + S.R * 0.3, S.R * 1.6); gr.addColorStop(0, `rgba(${col},${0.5 * k})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(x - S.R * 2, y - S.R * 2, S.R * 4, S.R * 5); g.restore(); };
const sweatEx = (S: CharSpec, t: number, k = 1): Ex => (g, P) => { const [x, y] = head(S, P); drawFlyingSweat(g, x, y, S.R, t, k); };
const shockEx = (S: CharSpec, k: number): Ex => (g, P) => { if (k <= 0.01) return; const [x, y] = head(S, P); drawShockLines(g, x, y - S.R * 0.1, S.R, k); };
const sparkEx = (S: CharSpec, t: number, k: number): Ex => (g, P) => { if (k <= 0.01) return; const [x, y] = head(S, P); drawSparkles(g, x, y - S.R * 0.1, S.R, t, k); };
const tearsEx = (S: CharSpec, t: number, k = 1): Ex => (g, P) => { if (k <= 0.01) return; const [x, y] = head(S, P); drawTears(g, x, y, S.R, t, k); };
const zzzEx = (t: number): Ex => (g, P) => { const [x, y] = head(KAMU, P); drawZzz(g, x + 90, y - 120, t); };
/** messy morning hair: strands sticking out of the hair cap */
const messyEx: Ex = (g, P) => { const [x, y] = head(KAMU, P), R = KAMU.R; g.save(); g.lineJoin = "round";
  for (let i = 0; i < 6; i++) { const a = -2.6 + i * 0.4 + 0.08 * Math.sin(i * 5), b = R * 0.86, l = R * (0.2 + 0.07 * (i % 3)), w = 0.13; // short spiky tufts poking out of the hair
    g.beginPath(); g.moveTo(x + Math.cos(a - w) * b, y + Math.sin(a - w) * b); g.lineTo(x + Math.cos(a + 0.12 * (i % 2 ? 1 : -1)) * (b + l), y + Math.sin(a) * (b + l)); g.lineTo(x + Math.cos(a + w) * b, y + Math.sin(a + w) * b); g.closePath();
    g.fillStyle = KAMU.hair!.color; g.fill(); g.lineWidth = 6; g.strokeStyle = OUTLINE; g.stroke(); }
  g.restore(); };
/** the robber's knitted balaclava: covers the head except an eye band, a bobble on top */
const balaclavaEx: Ex = (g, P) => { const [x, y] = head(PERAMPOK, P), R = PERAMPOK.R; g.save(); g.translate(x, y); g.rotate(P.head.rot * 0.6);
  g.beginPath(); g.ellipse(0, -0.04 * R, 1.07 * R, 1.05 * R, 0, 0, Math.PI * 2); g.roundRect(-0.74 * R, -0.33 * R, 1.48 * R, 0.52 * R, 0.24 * R); g.fillStyle = "#24262e"; g.fill("evenodd"); g.lineWidth = 0.075 * R; g.strokeStyle = OUTLINE; g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.08)"; g.lineWidth = 4; for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(i * 0.22 * R, -1.0 * R); g.lineTo(i * 0.2 * R, -0.36 * R); g.stroke(); g.beginPath(); g.moveTo(i * 0.2 * R, 0.22 * R); g.lineTo(i * 0.22 * R, 1.0 * R); g.stroke(); }
  g.fillStyle = "#c0392b"; g.beginPath(); g.arc(0, -1.12 * R, 0.2 * R, 0, Math.PI * 2); g.fill(); g.lineWidth = 0.05 * R; g.strokeStyle = OUTLINE; g.stroke(); g.restore(); };
const intelEx: Ex = (g, P) => { const [x, y] = head(INTEL, P); drawGlasses(g, x, y + INTEL.R * 0.02, INTEL.R, P.head.rot); drawTie(g, x + P.body.lean * 120, y + INTEL.R * 1.02, 128); };
/** a little shine on the cap badge for the police officer */
const badgeEx: Ex = (g, P) => { const [x, y] = head(POLISI, P); g.save(); g.fillStyle = "#f2c14e"; g.strokeStyle = OUTLINE; g.lineWidth = 4; g.beginPath(); g.arc(x + P.hat.dx, y - POLISI.R * 0.78 + P.hat.dy, 15, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore(); };

const NIGHT_B = { fog: "#140f2a", dens: 0.02, bg: "#0a0a18", cInf: 5, night: true, env: 0.14, bloom: 1.0, exposure: 0.02, sat: 0.22, contrast: 0.1, grade: [[0.36, 0.4, 0.66], [0.62, 0.52, 0.42], 0.3] as [V3, V3, number] };
const ROOM_DAY = { fog: "#f2dcc4", dens: 0.006, bg: "#cfe0f2", cInf: 6, env: 0.4, exposure: 0.03, bloom: 0.75, sat: 0.26, contrast: 0.1, grade: [[0.42, 0.5, 0.6], [0.64, 0.54, 0.42], 0.3] as [V3, V3, number] };
const MORNING = { ...ROOM_DAY, fog: "#ffe2c0", bloom: 0.9, grade: [[0.44, 0.5, 0.6], [0.68, 0.55, 0.4], 0.34] as [V3, V3, number] };
const MALL = { fog: "#f4e6d6", dens: 0.012, bg: "#f0e6da", cInf: 7, env: 0.45, exposure: 0.03, bloom: 0.8, sat: 0.28, contrast: 0.1, grade: [[0.44, 0.48, 0.6], [0.64, 0.54, 0.44], 0.28] as [V3, V3, number] };
const INTERRO = { fog: "#3a3440", dens: 0.02, bg: "#2a2630", cInf: 6, env: 0.25, exposure: 0.0, bloom: 0.9, sat: 0.18, contrast: 0.14, grade: [[0.34, 0.46, 0.6], [0.7, 0.52, 0.36], 0.4] as [V3, V3, number] };
const SHOP = { fog: "#f2d6c0", dens: 0.008, bg: "#f2e0d0", cInf: 6, env: 0.5, exposure: 0.02, bloom: 0.95, sat: 0.26, contrast: 0.1, grade: [[0.46, 0.44, 0.56], [0.66, 0.54, 0.4], 0.28] as [V3, V3, number] };
const DREAMY = { fog: "#ffd6ec", dens: 0.014, bg: "#d6a8ff", cInf: 8, env: 0.5, exposure: 0.04, bloom: 1.1, sat: 0.3, contrast: 0.06, grade: [[0.52, 0.42, 0.66], [0.66, 0.54, 0.6], 0.3] as [V3, V3, number] };
const GOLDEN = { fog: "#ffcf9a", dens: 0.008, bg: "#9ab8f0", cInf: 10, env: 0.35, exposure: 0.02, bloom: 0.85, sat: 0.26, contrast: 0.12, grade: [[0.42, 0.45, 0.62], [0.68, 0.53, 0.38], 0.32] as [V3, V3, number] };
const DUSKY = { ...DUSK, sat: 0.27 };

// =====================================================================================================================
// 1. KLENG (0 - 3): the 300th swing hits metal; sparks, a beam of gold out of the pit; the camera drifts in
const T1 = 0.9;
const S1: SceneDef = {
  from: 0, to: 3, ...DUSKY, mk: withFx(yardMk as () => SetLike),
  keys: move(0, 3, [{ pos: [2.65, 2.4, 7.9], look: [0.5, 0.85, 2.9], fov: 47 }, { pos: [2.25, 2.0, 7.0], look: [0.55, 0.72, 2.95], fov: 45 }, { pos: [1.8, 1.6, 6.05], look: [0.62, 0.58, 3.05], fov: 42 }]),
  focus: () => [0.7, 0.3, 3.1],
  act: (cx) => {
    const t = cx.t, ts = t - T1, k = yardK(cx.set), F = get<YardK>(cx).fx; fxBegin(F);
    const sh = ts > TI && ts < TI + 0.3 ? (1 - (ts - TI) / 0.3) * 0.02 : 0; if (sh) { cx.cam.position.add(V(sh * Math.sin(t * 90), sh * Math.cos(t * 70), 0)); cx.cam.updateMatrixWorld(); }
    tint(cx.card(0), 0.55, "255,180,120", "70,40,120"); strike({ ...cx, t: ts });
    const b = k.beam; b.visible = true; b.position.copy(COIN_AT); b.rotation.set(0, Math.atan2(cx.cam.position.x - COIN_AT.x, cx.cam.position.z - COIN_AT.z), 0);
    (b.material as THREE.MeshBasicMaterial).opacity = 0.7 * at(ts, TI, TI + 0.15) * (0.9 + 0.1 * Math.sin(t * 11)); b.scale.set(1 + 0.15 * Math.sin(t * 3), 1, 1);
    fxEnd(F);
  },
};

// 2. DIG IT OUT (3 - 11): crouch, pick the coin out of the soil, rub it clean, it glows; the camera arcs in
const A2 = actor(12, [{ t: 0, mood: "surprised", arms: ["rest", "rest"], look: [0.2, 0.9] }, { t: 1.0, mood: "suspicious", look: [0.35, 0.95] }, { t: 2.6, mood: "surprised", look: [0.3, 0.2] },
  { t: 4.0, mood: "excited", look: [0.45, 0.15] }, { t: 6.0, mood: "shock", event: "shockSmall", look: [0.5, 0.05] }, { t: 6.7, mood: "excited", look: [0.25, 0.1] }]);
const IN2 = { x0: 0.62, z0: 2.55, x: 0.48, z: 3.02, y: -0.42 };
const S2: SceneDef = {
  from: 3, to: 11, ...DUSKY, mk: withFx(yardMk as () => SetLike),
  keys: [...move(0, 4.2, [{ pos: [2.9, 2.0, 7.2], look: [0.6, 0.25, 3.2], fov: 44 }, { pos: [2.4, 1.7, 6.9], look: [0.6, 0.4, 3.1], fov: 43 }, { pos: [1.85, 1.5, 6.7], look: [0.55, 0.6, 3.05], fov: 42 }]),
    ...move(4.2, 8, [{ pos: [1.85, 1.5, 6.7], look: [0.55, 0.6, 3.05], fov: 42 }, { pos: [1.3, 1.42, 6.75], look: [0.52, 0.78, 3.0], fov: 42 }, { pos: [0.85, 1.38, 6.75], look: [0.5, 0.82, 3.0], fov: 42 }])],
  focus: (t) => (t < 4 ? [0.7, 0.1, 3.3] : [0.5, 0.9, 3.05]),
  act: (cx) => {
    const { t, cam } = cx, k = yardK(cx.set), F = get<YardK>(cx).fx, c = cx.card(0); fxBegin(F); tint(c, 0.6, "255,176,110", "80,40,130");
    placeHoe(k.hoe, V(-0.75, 0.05, 3.9), V(-0.9, 0.06, 2.85), V(0, 1, 0)); k.beam.visible = false; k.balls.forEach((b) => (b.visible = false)); k.spark.begin(); k.spark.end(); k.star.begin(); k.star.end(); k.dust.begin(); k.dust.end();
    const go = at(t, 0.1, 0.9), x = lerp(IN2.x0, IN2.x, go), z = lerp(IN2.z0, IN2.z, go);
    let P = life(actAt(A2, t), t, 12, 0.8); if (go > 0 && go < 1) P = walk(P, t * 2.4, 0.7);
    const down = at(t, 0.7, 1.3) * (1 - at(t, 2.7, 3.3)); P = crouch(P, down);
    const n = camDir(cam, x, z), right = V(n.z, 0, -n.x);
    put(c, KAMU, P, x, z, cx, 1, IN2.y); const hd = headPt(c, KAMU, P);
    const chest = hd.clone().addScaledVector(n, 0.26).addScaledVector(right, 0.06).add(V(0, -0.42, 0)), face = hd.clone().addScaledVector(n, 0.24).addScaledVector(right, 0.27).add(V(0, -0.06, 0));
    const pick = at(t, 2.05, 2.25), up = at(t, 2.6, 3.4), raise = at(t, 5.9, 6.4);
    const coinP = COIN_AT.clone().lerp(chest, up).lerp(face, raise); if (pick > 0 && up <= 0) coinP.y += 0.02 * pick;
    const W = k.W; W.coin.position.copy(coinP); const s = 1 + 2.0 * at(t, 2.4, 3.6); W.coin.scale.setScalar(s);
    if (pick > 0) { faceCam(W.coin, cam); W.coin.rotateY(0.25 * Math.sin(t * 1.4)); }
    const gl = lerp(0.25, 1, at(t, 4.3, 6.0)); W.glow(gl, t); W.coinGlow.scale.multiplyScalar(0.7 + 0.5 * s * 0.5); W.coinLight.intensity = 0.6 + 2.2 * gl; W.coinLight.distance = 1.6;
    const rub = t > 4.0 && t < 5.9 ? 1 : 0, ra = t * 2 * Math.PI * 2.6;
    const ex = both(glowEx(KAMU, 0.7 * at(t, 4.6, 6.2), t), sparkEx(KAMU, t, at(t, 6.0, 6.4)), shockEx(KAMU, win(t, 6.0, 6.9)));
    P = reach(c, KAMU, P, 1, coinP.clone().add(V(0.0, -0.03 * s, 0)), x, z, cx, 1, IN2.y, ex, at(t, 1.2, 1.9));
    if (rub || at(t, 3.6, 4.0) > 0) P = reach(c, KAMU, P, 0, coinP.clone().addScaledVector(right, -0.015 + 0.03 * Math.cos(ra) * rub).add(V(0, 0.025 + 0.025 * Math.sin(ra) * rub, 0)).addScaledVector(n, 0.02), x, z, cx, 1, IN2.y, ex, at(t, 3.6, 4.0) * (1 - at(t, 5.8, 6.0)));
    c.contact.visible = false; if (pick > 0) yardGrip(k, 1, coinP.clone().add(V(0, -0.03 * s, 0)), cam);
    if (rub) for (const [p, a, i] of burst(t, 4.0 + Math.floor((t - 4) * 4) / 4, 0.8, 4, coinP.clone(), V(0, -0.2, 0.3), 0.7, 0.25, 2.5, Math.floor(t * 4))) F.dust.add(p, (0.012 + 0.008 * (i % 2)) * (1 + a), 0.9 * (1 - a));
    if (t > 5.4) orbit(F, coinP, t, at(t, 5.4, 6.2), 6, 0.06 * s, 0.05);
    for (const [p, a] of burst(t, 6.0, 0.9, 18, coinP.clone(), V(0, 0.4, 0).addScaledVector(n, 0.4), 0.9, 1.0, 0.6, 33)) F.spark.add(p, 0.03 * (1 - a), 1 - a);
    fxEnd(F);
  },
};

// 3. PHOTO + ASK THE AI (11 - 20): snap the coin in your palm (flash), the screen: the photo and the AI's answer, eyes pop
const A3 = actor(13, [{ t: 0, mood: "excited", arms: ["rest", "rest"], look: [0.1, 0.6] }, { t: 1.75, mood: "surprised", look: [0.1, 0.5] }, { t: 6.6, mood: "story", look: [0.05, 0.45] }, { t: 7.05, mood: "shock", event: "shock", look: [0, 0.2] }, { t: 8.0, mood: "excited", look: [0, 0.3] }]);
const YX = 0.48, YZ = 3.02, YY = -0.42;
const PH3 = V(0.5, 0.82, 3.45);
const phoneInsert = (cx: Ctx, F: FX, p: THREE.Vector3, mode: PhoneMode, u: number, typing = 0) => {
  const { t, cam } = cx, ph = F.phone; ph.group.visible = true; ph.group.position.copy(p).add(V(0.003 * Math.sin(t * 7), 0.003 * Math.sin(t * 5), 0)); ph.group.lookAt(cam.position); ph.group.rotateZ(0.04 * Math.sin(t * 1.3)); ph.draw(mode, u, t); ph.group.updateMatrixWorld();
  for (const s of [-1, 1]) { const g = ph.group.localToWorld(V(s * 0.046, -0.045, 0.0)); hold(F, s < 0 ? 0 : 1, g, cam, 0.42); arm3(F, s < 0 ? 0 : 1, g, g.clone().add(V(s * 0.16, -0.4, 0.22)), 0.45); }
  if (typing > 0) for (const s of [-1, 1]) { const tap = Math.max(0, Math.sin(t * 2 * Math.PI * (s < 0 ? 4.6 : 5.3))), tp = ph.group.localToWorld(V(s * 0.018 + 0.012 * Math.sin(t * (s < 0 ? 7.3 : 6.1)), -0.052 + 0.012 * Math.sin(t * 4.1 + s), 0.012 - 0.006 * tap)); hold(F, s < 0 ? 2 : 3, tp, cam, 0.3); arm3(F, s < 0 ? 2 : 3, tp, ph.group.localToWorld(V(s * 0.046, -0.045, 0.004)), 0.3); }
};
const S3: SceneDef = {
  from: 11, to: 20, ...DUSKY, mk: withFx(yardMk as () => SetLike),
  keys: [...move(0, 2.4, [{ pos: [1.75, 1.65, 6.85], look: [0.48, 0.68, 3.05], fov: 42 }, { pos: [1.4, 1.6, 6.7], look: [0.48, 0.68, 3.05], fov: 42 }]),
    ...move(2.4, 6.6, [{ pos: add3([0.5, 0.82, 3.45], [0.07, 0.1, 0.5]), look: [0.5, 0.82, 3.45], fov: 34 }, { pos: add3([0.5, 0.82, 3.45], [0.02, 0.07, 0.43]), look: [0.5, 0.82, 3.45], fov: 34 }]),
    ...move(6.6, 7.15, [{ pos: [1.05, 1.45, 6.7], look: [0.45, 0.92, 3.0], fov: 40 }, { pos: [0.8, 1.38, 6.35], look: [0.45, 0.95, 3.0], fov: 40 }], whip),
    ...move(7.15, 9, [{ pos: [0.8, 1.38, 6.35], look: [0.45, 0.95, 3.0], fov: 40 }, { pos: [0.6, 1.36, 6.35], look: [0.45, 0.95, 3.0], fov: 40 }])],
  focus: (t) => (t < 2.4 ? [0.5, 0.75, 3.1] : t < 6.6 ? [0.5, 0.82, 3.45] : [0.45, 1.0, 3.05]),
  act: (cx) => {
    const { t, cam } = cx, k = yardK(cx.set), F = get<YardK>(cx).fx, c = cx.card(0), W = k.W; fxBegin(F);
    placeHoe(k.hoe, V(-0.75, 0.05, 3.9), V(-0.9, 0.06, 2.85), V(0, 1, 0)); k.beam.visible = false; k.balls.forEach((b) => (b.visible = false)); for (const p of [k.spark, k.star, k.dust]) { p.begin(); p.end(); }
    W.glow(0.75, t); W.coinLight.intensity = 1.2;
    if (t >= 2.4 && t < 6.6) { // the screen insert: the photo, then the AI's answer (pictures only)
      c.setVisible(false); W.coin.visible = false; W.coinGlow.visible = false; W.coinLight.intensity = 0;
      const cam1 = t < 3.3; phoneInsert(cx, F, PH3, cam1 ? "camera" : "answer", cam1 ? at(t, 2.4, 3.3) * 0.69 : at(t, 3.4, 5.6), 0);
      if (!cam1) orbit(F, F.phone.group.localToWorld(V(0, -0.02, 0.01)), t, at(t, 4.6, 5.2), 6, 0.06, 0.02);
      fxEnd(F); return;
    }
    c.setVisible(true); W.coin.visible = t < 6.6;
    let P = life(actAt(A3, t), t, 13, 0.9); tint(c, 0.6, "255,176,110", "80,40,130");
    const n = camDir(cam, YX, YZ), right = V(n.z, 0, -n.x); put(c, KAMU, P, YX, YZ, cx, 1, YY); const hd = headPt(c, KAMU, P);
    if (t < 2.4) { // coin in the left palm, phone held flat above it in the right hand, snap with a flash
      const palm = hd.clone().addScaledVector(n, 0.3).addScaledVector(right, -0.06).add(V(0, -0.58, 0)), phP = palm.clone().add(V(0.07, 0.2, 0.02));
      W.coin.position.copy(palm).add(V(0, 0.02, 0)); W.coin.scale.setScalar(2.2); W.coin.rotation.set(-0.3, 0.3, 0); W.glow(0.7, t);
      const ph = F.phone; ph.group.visible = true; ph.group.position.copy(phP); ph.group.rotation.set(-Math.PI / 2 + 0.35, 0, 0.1); ph.draw("camera", 0.3, t);
      const fl = t > 1.7 && t < 1.82 ? 1 : 0; F.flashL.position.copy(phP).add(V(0, -0.05, 0.05)); F.flashL.intensity = 5 * fl; if (fl) F.flash.add(phP.clone().add(V(0, -0.02, 0.03)), 0.25, 0.8);
      const ex = both(glowEx(KAMU, 0.45, t), screenEx(KAMU, 0.6 * fl, "255,255,255"));
      P = reach(c, KAMU, P, 0, palm.clone(), YX, YZ, cx, 1, YY, ex); P = reach(c, KAMU, P, 1, phP.clone().add(V(0.03, 0, 0)), YX, YZ, cx, 1, YY, ex);
      hold(F, 1, phP.clone().add(V(0.035, -0.005, 0)), cam, 0.9);
    } else { // reaction: phone in both hands at the chest (its screen toward you), blue light on your face, eyes pop
      W.coin.visible = false; W.coinGlow.visible = false; W.coinLight.intensity = 0;
      const pop = at(t, 7.05, 7.2) * (1 - 0.3 * at(t, 8.2, 8.8)); P = stretch(P, pop * 0.8); if (pop > 0.2) P = withMouth(withEyes(P, "shock", { size: 1 + 0.6 * pop }), "wide", 1);
      const phP = hd.clone().addScaledVector(n, 0.3).add(V(0, -0.45 + 0.04 * pop, 0)), ph = F.phone; ph.group.visible = true; ph.group.position.copy(phP); ph.group.lookAt(hd); ph.draw("answer", 1, t); F.phone.light.intensity = 1.0;
      tint(c, 0.75, "160,205,255", "70,40,130");
      const ex = both(screenEx(KAMU, 0.85), shockEx(KAMU, win(t, 7.05, 8.0)), sparkEx(KAMU, t, at(t, 7.3, 7.8)));
      P = reach(c, KAMU, P, 0, phP.clone().addScaledVector(right, -0.045), YX, YZ, cx, 1, YY, ex); P = reach(c, KAMU, P, 1, phP.clone().addScaledVector(right, 0.045), YX, YZ, cx, 1, YY, ex);
      hold(F, 0, phP.clone().addScaledVector(right, -0.045), cam, 0.9); hold(F, 1, phP.clone().addScaledVector(right, 0.045), cam, 0.9);
    }
    c.contact.visible = false; fxEnd(F);
  },
};

// 4. "NO. JUST A PHOTO FROM GOOGLE" (20 - 26): the AI asks; thumbs type in a panic; then you shuffle about, hide the phone, whistle
const A4 = actor(14, [{ t: 0, mood: "nervous", arms: ["chest", "chest"], look: "dart" }, { t: 4.6, mood: "suspicious", arms: ["rest", "rest"], look: [-0.7, 0.1] }, { t: 5.1, mood: "smug", look: [0.2, -0.5] }]);
const S4: SceneDef = {
  from: 20, to: 26, ...DUSKY, satAt: () => 0.27,
  mk: withFx(yardMk as () => SetLike),
  keys: [...move(0, 3.1, [{ pos: add3([0.5, 0.82, 3.45], [0.03, 0.08, 0.46]), look: [0.5, 0.82, 3.45], fov: 34 }, { pos: add3([0.5, 0.82, 3.45], [-0.02, 0.06, 0.42]), look: [0.5, 0.8, 3.45], fov: 34 }], sm, 0.004),
    ...move(3.1, 6, [{ pos: [1.9, 1.5, 8.4], look: [0.25, 0.95, 4.6], fov: 42 }, { pos: [0.6, 1.45, 8.5], look: [0.2, 0.95, 4.6], fov: 42 }, { pos: [-0.6, 1.45, 8.3], look: [0.15, 0.95, 4.6], fov: 42 }], sm, 0.01)],
  focus: (t) => (t < 3.1 ? [0.5, 0.82, 3.45] : [0.2, 1.0, 4.6]),
  act: (cx) => {
    const { t, cam } = cx, k = yardK(cx.set), F = get<YardK>(cx).fx, c = cx.card(0), W = k.W; fxBegin(F);
    placeHoe(k.hoe, V(-0.75, 0.05, 3.9), V(-0.9, 0.06, 2.85), V(0, 1, 0)); k.beam.visible = false; k.balls.forEach((b) => (b.visible = false)); for (const p of [k.spark, k.star, k.dust]) { p.begin(); p.end(); }
    W.coin.visible = false; W.coinGlow.visible = false; W.coinLight.intensity = 0;
    if (t < 3.1) { c.setVisible(false); phoneInsert(cx, F, PH3, t < 0.9 ? "ask" : "typing", t < 0.9 ? 0 : at(t, 0.9, 3.0), t > 0.9 ? 1 : 0);
      // a drop of sweat falls onto the screen
      const dp = 1 - at(t, 1.9, 2.3), sp = F.phone.group.localToWorld(V(0.015, 0.04 + 0.25 * dp, 0.02 + 0.05 * dp)); if (t > 1.85 && t < 2.3) F.drop.add(sp, 0.018, 1); for (const [p, a] of burst(t, 2.3, 0.4, 8, F.phone.group.localToWorld(V(0.015, 0.04, 0.01)), V(0, 0.6, 0.6), 0.9, 0.25, 1.5, 44)) F.drop.add(p, 0.006 * (1 - a), 1 - a);
      fxEnd(F); return; }
    c.setVisible(true); tint(c, 0.6, "255,160,120", "70,40,140");
    const X = 0.2 + 0.18 * Math.sin((t - 3.1) * 2.2) * (1 - at(t, 4.5, 4.7)), Z = 4.6; let P = life(actAt(A4, t - 3.1), t, 14, 1.3);
    const hide = at(t, 4.6, 4.85); if (hide < 0.5) { P = walk(P, t * 3.2, 0.55, 1.4); P = { ...P, legs: [{ ...P.legs[0], b: [P.legs[0].b[0], P.legs[0].b[1] - 14] }, { ...P.legs[1], b: [P.legs[1].b[0], P.legs[1].b[1] - 14] }] }; }
    else { P = { ...P, armBehind: [true, true], arms: [{ a: [-30, 80], b: [10, 150] }, { a: [30, 80], b: [-10, 150] }], mouth: { kind: "oo", open: 0.5 }, head: { ...P.head, rot: P.head.rot + 0.1 * Math.sin(t * 4) } }; }
    const n = camDir(cam, X, Z); put(c, KAMU, P, X, Z, cx, 1, 0); const hd = headPt(c, KAMU, P), phP = hd.clone().addScaledVector(n, 0.22).add(V(0, -0.48, 0));
    const ex = both(sweatEx(KAMU, t, 1 - hide * 0.5), screenEx(KAMU, 0.5 * (1 - hide)));
    if (hide < 0.5) { const ph = F.phone; ph.group.visible = true; ph.group.position.copy(phP); ph.group.lookAt(hd); ph.draw("typing", 1, t); P = reach(c, KAMU, P, 0, phP.clone().add(V(-0.04, 0, 0)), X, Z, cx, 1, 0, ex); P = reach(c, KAMU, P, 1, phP.clone().add(V(0.04, 0, 0)), X, Z, cx, 1, 0, ex); hold(F, 0, phP.clone().add(V(-0.04, 0, 0)), cam); hold(F, 1, phP.clone().add(V(0.04, 0, 0)), cam); }
    else put(c, KAMU, P, X, Z, cx, 1, 0, ex);
    fxEnd(F);
  },
};

// 5. THE SLEEPLESS NIGHT (26 - 33): on the bed with the little guci on your lap: open (gold light), shut, open, shut, then stare
const A5 = actor(15, [{ t: 0, mood: "nervous", arms: ["rest", "rest"], look: [0.4, 0.6] }, { t: 1.8, mood: "suspicious", look: "dart" }, { t: 2.6, mood: "excited", look: [0.35, 0.7] }, { t: 4.2, mood: "story", look: [0.3, 0.75] }]);
const lidK5 = (t: number) => Math.max(win(t, 1.0, 1.8, 0.2), win(t, 2.6, 2.95, 0.12), win(t, 3.25, 3.6, 0.1), at(t, 4.2, 4.5));
const mkKamar = (mode: RoomMode, f?: (k: KamarSet & WithFx) => void) => withFx(() => new KamarSet(mode), f);
/** guci on your lap: base on the lap, left hand on its side, right hand on the lid knob (lid k 0..1) */
const guciLap = (cx: Ctx, k: KamarSet & WithFx, c: ToonCard, P: Pose, x: number, z: number, y: number, lid: number, ex: Ex, lap = 1) => {
  const n = camDir(cx.cam, x, z), right = V(n.z, 0, -n.x), base = V(x, 0.56, z).addScaledVector(n, 0.16).addScaledVector(right, 0.04);
  const G = k.guci; G.group.position.lerpVectors(V(...GUCI_AT), base, lap); G.group.rotation.y = 0; G.open(lid); G.group.updateMatrixWorld();
  const side = G.group.localToWorld(V(-0.07, 0.06, 0)), knob = G.lid.localToWorld(V(0, 0.02, 0));
  P = reach(c, KAMU, P, 0, side, x, z, cx, 1, y, ex, lap); P = reach(c, KAMU, P, 1, knob, x, z, cx, 1, y, ex, lap > 0.5 ? 1 : 0);
  if (lap > 0.6) { hold(k.fx, 0, side, cx.cam, 0.9); hold(k.fx, 1, knob, cx.cam, 0.9); }
  return { P, mouth: G.group.localToWorld(V(0, 0.13, 0)) };
};
const S5: SceneDef = {
  from: 26, to: 33, ...NIGHT_B, mk: mkKamar("night"),
  keys: move(0, 7, [{ pos: [-0.6, 2.0, 6.0], look: [1.15, 0.95, 1.9], fov: 44 }, { pos: [0.35, 1.75, 5.9], look: [1.2, 0.98, 2.0], fov: 42 }, { pos: [1.0, 1.58, 5.8], look: [1.22, 1.0, 2.0], fov: 41 }, { pos: [1.5, 1.52, 5.7], look: [1.25, 1.02, 2.0], fov: 41 }]),
  focus: () => [1.2, 1.0, 2.15], fadeAt: (t) => 0.9 * at(t, 6.4, 7.0),
  act: (cx) => {
    const { t } = cx, k = get<KamarSet>(cx), F = k.fx, c = cx.card(0); fxBegin(F);
    const [x, , z] = BED_SEAT, y = sitY(KAMU, 1, 0.5), lid = lidK5(t);
    let P = bedLegs(life(actAt(A5, t), t, 15, 0.9), Math.sin(t * 3) * 0.3 * (t > 4.2 ? 0 : 1));
    if (t > 4.2) { const lean = at(t, 4.3, 5.0); P = { ...P, head: { ...P.head, dy: P.head.dy + 26 * lean, rot: P.head.rot + 0.08 * lean }, eyes: [{ kind: "big", size: 1.25 }, { kind: "big", size: 1.25 }], mouth: { kind: "smile", open: 0.3 } }; }
    if (t > 2.55 && t < 3.7) P = withEyes(P, "squeeze");
    const gk = lid * (0.9 + 0.1 * Math.sin(t * 9)); tint(c, 1, gk > 0.1 ? "255,205,120" : "190,210,255", "40,26,90");
    const ex = both(glowEx(KAMU, 0.85 * gk, t), sparkEx(KAMU, t, at(t, 4.6, 5.2) * gk), sweatEx(KAMU, t, win(t, 1.8, 2.6) * 0.8));
    const r = guciLap(cx, k, c, P, x, z, y, lid, ex); P = r.P;
    k.coin.coin.visible = false; k.coin.glow.visible = gk > 0.02; k.coin.glow.position.copy(r.mouth).add(V(0, 0.04, 0)); k.coin.glow.scale.setScalar(0.5 * gk + 0.001); (k.coin.glow.material as THREE.SpriteMaterial).opacity = gk; k.coin.light.position.copy(r.mouth).add(V(0, 0.12, 0.06)); k.coin.light.intensity = 3.2 * gk; k.coin.light.distance = 3;
    if (gk > 0.1) orbit(F, r.mouth.clone().add(V(0, 0.08, 0)), t, gk, 5, 0.06, 0.035);
    fxEnd(F);
  },
};

// 6. MORNING (33 - 38): asleep, snoring; you spring awake with wild hair, grab the guci, open it: still there. Relief.
const A6 = actor(16, [{ t: 0, mood: "neutral", arms: ["rest", "rest"] }, { t: 1.2, mood: "shock", event: "shock", look: [0.3, 0.3] }, { t: 2.0, mood: "worried", look: [0.45, 0.7] }, { t: 3.0, mood: "laugh", look: [0.3, 0.5] }, { t: 3.6, mood: "excited", arms: ["hug", "hug"], look: [0, 0.2] }]);
const S6: SceneDef = {
  from: 33, to: 38, ...MORNING, mk: mkKamar("morning"),
  keys: [...move(0, 1.25, [{ pos: [0.8, 1.75, 6.0], look: [1.2, 0.95, 2.0], fov: 42 }, { pos: [0.9, 1.72, 5.9], look: [1.2, 0.95, 2.0], fov: 42 }]),
    ...move(1.25, 1.5, [{ pos: [0.9, 1.72, 5.9], look: [1.2, 0.95, 2.0], fov: 42 }, { pos: [1.1, 1.6, 5.75], look: [1.28, 1.0, 2.0], fov: 42 }], whip, 0.01),
    ...move(1.5, 5, [{ pos: [1.1, 1.6, 5.75], look: [1.28, 1.0, 2.0], fov: 42 }, { pos: [1.5, 1.52, 5.7], look: [1.32, 1.0, 2.0], fov: 42 }, { pos: [1.8, 1.5, 5.65], look: [1.35, 1.02, 2.0], fov: 42 }])],
  focus: () => [1.3, 1.0, 2.1], fadeAt: (t) => 0.9 * (1 - at(t, 0, 0.5)),
  act: (cx) => {
    const { t } = cx, k = get<KamarSet>(cx), F = k.fx, c = cx.card(0); fxBegin(F); tint(c, 0.6, "255,220,160", "90,70,150");
    const [x, , z] = BED_SEAT, y = sitY(KAMU, 1, 0.5);
    if (t < 1.25) { // dozed off sitting on the bed: head drooping, snoring, a Zzz, a bubble of drool
      let P = bedLegs(eyesShut(withMouth(actAt(A6, 0), "o", 0.4 + 0.2 * Math.sin(t * 5)))); P = { ...P, body: { ...P.body, sy: P.body.sy * (1 + 0.03 * Math.sin(t * 5)), lean: 0.12 }, head: { ...P.head, rot: 0.35 + 0.05 * Math.sin(t * 2.5), dy: P.head.dy + 30 } };
      put(c, KAMU, P, x, z, cx, 1, y, both(zzzEx(t), messyEx)); k.guci.group.position.set(...GUCI_AT); k.guci.open(0); k.coin.glow.visible = false; fxEnd(F); return;
    }
    let P = bedLegs(life(actAt(A6, t), t, 16, 1.1)); const pop = hopY(t, 1.25, 0.35, 0.22);
    for (const [p, a] of burst(t, 1.25, 0.6, 12, V(1.2, 0.6, 1.6), V(0, 0.6, 0.4), 1, 0.9, 1.0, 61)) F.puff.add(p, 0.12 + 0.2 * a, 0.7 * (1 - a));
    const grab = at(t, 1.8, 2.2), lid = at(t, 2.55, 2.8), relief = at(t, 3.0, 3.4);
    if (relief > 0) P = { ...P, body: { ...P.body, sy: P.body.sy * (1 - 0.06 * relief) }, bob: P.bob + 10 * relief };
    const gk = lid * (0.9 + 0.1 * Math.sin(t * 9));
    const ex = both(messyEx, glowEx(KAMU, 0.6 * gk, t), sweatEx(KAMU, t, win(t, 1.5, 2.6)), sparkEx(KAMU, t, relief * 0.8));
    if (t > 3.6) { // hug the guci to the chest
      const n = camDir(cx.cam, x, z); put(c, KAMU, P, x, z, cx, 1, y + pop, ex); const hd = headPt(c, KAMU, P), ch = hd.clone().addScaledVector(n, 0.18).add(V(0, -0.5, 0));
      k.guci.group.position.copy(ch).add(V(0, -0.06, 0)); k.guci.open(0.3); P = reach(c, KAMU, P, 0, ch.clone().add(V(-0.08, 0, 0)), x, z, cx, 1, y + pop, ex); P = reach(c, KAMU, P, 1, ch.clone().add(V(0.08, 0, 0)), x, z, cx, 1, y + pop, ex);
      hold(F, 0, ch.clone().add(V(-0.075, 0.0, 0)), cx.cam, 0.9); hold(F, 1, ch.clone().add(V(0.075, 0.0, 0)), cx.cam, 0.9);
      F.puff.add(hd.clone().addScaledVector(n, 0.2).add(V(0.1, -0.1, 0)), 0.1 * win(t, 3.6, 4.4), 0.5 * win(t, 3.6, 4.4));
      k.coin.glow.visible = true; k.coin.glow.position.copy(ch); k.coin.glow.scale.setScalar(0.35); (k.coin.glow.material as THREE.SpriteMaterial).opacity = 0.6; k.coin.light.position.copy(ch).add(V(0, 0.1, 0.1)); k.coin.light.intensity = 1.2;
    } else {
      const r = guciLap(cx, k, c, P, x, z, y + pop, lid, ex, grab); P = r.P;
      k.coin.glow.visible = gk > 0.02; k.coin.glow.position.copy(r.mouth).add(V(0, 0.04, 0)); k.coin.glow.scale.setScalar(0.45 * gk + 0.001); (k.coin.glow.material as THREE.SpriteMaterial).opacity = gk; k.coin.light.position.copy(r.mouth).add(V(0, 0.12, 0.06)); k.coin.light.intensity = 2.2 * gk;
      if (gk > 0.1) orbit(F, r.mouth.clone().add(V(0, 0.06, 0)), t, gk, 5, 0.05, 0.03);
    }
    fxEnd(F);
  },
};

// 7. FIND A COLLECTOR ONLINE (38 - 45): typing at the desk, the collector's page, then: what if you get robbed? A masked
//    robber pops up behind your chair (imagined, in a puff of purple smoke), you jump
const A7 = actor(17, [{ t: 0, mood: "excited", arms: ["rest", "rest"], look: [0, 0.75] }, { t: 3.6, mood: "smug", arms: ["chin", "rest"], look: [0.5, -0.3] }, { t: 5.3, mood: "scared", event: "shock", arms: ["up", "up"], look: [-0.5, -0.2] }, { t: 6.3, mood: "nervous", arms: ["chest", "chest"], look: "dart" }]);
const R7 = actor(18, [{ t: 0, mood: "smug", arms: ["up", "up"], look: [0.4, 0.4] }, { t: 5.4, mood: "laugh", arms: ["up", "up"], look: [0.4, 0.4] }]);
const LAP_INS: P3[] = [{ pos: [-1.3, 1.16, 0.46], look: [-1.3, 0.88, 1.42], fov: 36 }, { pos: [-1.3, 1.12, 0.52], look: [-1.3, 0.88, 1.42], fov: 36 }];
/** you at the desk: typing hands on the keyboard (hidden behind the lid), or free arms */
const atDesk = (cx: Ctx, k: KamarSet & WithFx, c: ToonCard, P: Pose, ex: Ex, typing: number, hop = 0) => {
  const [x, seat, z] = DESK_SEAT, y = sitY(KAMU, 1, seat) + hop; P = seated(P);
  if (typing > 0) { const L = k.laptop.group; L.updateMatrixWorld(); for (const i of [0, 1] as const) { const s = i ? 1 : -1, tap = Math.sin(cx.t * (i ? 23 : 19)); P = reach(c, KAMU, P, i, L.localToWorld(V(-s * 0.07 + 0.01 * tap, 0.03 + 0.012 * Math.abs(tap), 0.0)), x, z, cx, 1, y, ex, typing); } }
  else put(c, KAMU, P, x, z, cx, 1, y, ex);
  return P;
};
const S7: SceneDef = {
  from: 38, to: 45, ...ROOM_DAY, mk: mkKamar("day"),
  keys: [...move(0, 1.6, [{ pos: [-0.2, 1.68, 4.9], look: [-1.25, 1.02, 0.9], fov: 42 }, { pos: [-0.7, 1.62, 4.75], look: [-1.28, 1.04, 0.9], fov: 42 }]), ...move(1.6, 3.6, LAP_INS),
    ...move(3.6, 7, [{ pos: [-0.2, 1.7, 5.0], look: [-1.2, 1.15, 0.75], fov: 44 }, { pos: [-0.7, 1.65, 4.85], look: [-1.22, 1.15, 0.75], fov: 44 }, { pos: [-1.15, 1.6, 4.75], look: [-1.22, 1.15, 0.75], fov: 44 }])],
  focus: (t) => (t >= 1.6 && t < 3.6 ? [-1.3, 0.88, 1.42] : [-1.28, 1.1, 0.8]),
  act: (cx) => {
    const { t } = cx, k = get<KamarSet>(cx), F = k.fx, c = cx.card(0), rb = cx.card(1); fxBegin(F); k.front.visible = cx.cam.position.z < 2; k.guci.open(0); k.coin.glow.visible = false;
    const ins = t >= 1.6 && t < 3.6; k.laptop.draw("browse", at(t, 1.6, 3.6), t);
    if (ins) { c.setVisible(false); rb.setVisible(false); fxEnd(F); return; }
    c.setVisible(true); tint(c, 0.45, "255,226,180", "90,80,170");
    let P = life(actAt(A7, t), t, 17, 1); const jump = hopY(t, 5.3, 0.4, 0.16);
    const scare = win(t, 5.3, 6.6), ex = both(screenEx(KAMU, 0.5), shockEx(KAMU, scare), sweatEx(KAMU, t, at(t, 5.6, 6.0)));
    if (scare > 0.3) P = withEyes(P, "shock", { size: 1.3 });
    P = atDesk(cx, k, c, P, ex, t < 1.6 ? 1 : 0, jump);
    // the imagined robber: pops up behind the chair in purple smoke, claws up, then vanishes
    const on = win(t, 4.6, 6.4, 0.12), rx = -1.08, rz = 0.3;
    if (on > 0.01) { let R = life(actAt(R7, t), t, 18, 1.4); R = { ...R, bob: R.bob + 120 * (1 - on), head: { ...R.head, rot: R.head.rot + 0.12 * Math.sin(t * 6) } }; put(rb, PERAMPOK, R, rx, rz, cx, 1.0, 0, balaclavaEx); tint(rb, 0.8, "220,120,255", "40,10,60"); rb.setVisible(true); F.tint.position.set(rx, 1.5, rz + 0.5); F.tint.intensity = 3.5 * on; F.tint.color.set("#b45cff"); }
    else rb.setVisible(false);
    for (const t0 of [4.6, 6.3]) for (const [p, a] of burst(t, t0, 0.8, 14, V(rx, 1.3, rz + 0.1), V(0, 0.5, 0.3), 1, 0.8, -0.2, t0 * 10)) F.puff.add(p, 0.15 + 0.3 * a, 0.6 * (1 - a));
    fxEnd(F);
  },
};
// fix the puff colours for the robber smoke (purple)
void 0;

// 8. "ASK FOR PROTECTION? THE POLICE WILL KNOW" (45 - 51): imagined officer marches in, salutes, hands you a thin envelope,
//    takes the coin and marches off whistling; you hold the envelope, deflated
const A8 = actor(19, [{ t: 0, mood: "smug", arms: ["rest", "rest"], look: [0.1, 0.3] }, { t: 1.3, mood: "surprised", look: [0.6, 0.1] }, { t: 2.2, mood: "nervous", look: [0.6, 0.2] }, { t: 3.4, mood: "worried", look: [0.5, 0.4] }, { t: 4.4, mood: "worried", look: [0.0, 0.6] }]);
const P8 = actor(20, [{ t: 0, mood: "smug", arms: ["rest", "rest"], look: [-0.6, 0.1] }, { t: 1.4, mood: "excited", arms: ["fixhat", "rest"], look: [-0.6, 0] }, { t: 2.0, mood: "smug", arms: ["rest", "rest"], look: [-0.6, 0.2] }, { t: 3.9, mood: "laugh", look: [0.3, -0.2] }]);
const S8: SceneDef = {
  from: 45, to: 51, ...ROOM_DAY, sat: 0.3, mk: mkKamar("day"),
  keys: move(0, 6, [{ pos: [1.0, 1.65, 6.7], look: [0.45, 1.05, 2.3], fov: 42 }, { pos: [0.5, 1.58, 6.6], look: [0.42, 1.05, 2.3], fov: 42 }, { pos: [0.05, 1.55, 6.5], look: [0.4, 1.05, 2.3], fov: 42 }]),
  focus: () => [0.4, 1.1, 2.3],
  act: (cx) => {
    const { t, cam } = cx, k = get<KamarSet>(cx), F = k.fx, c = cx.card(0), pc = cx.card(1); fxBegin(F); k.guci.open(0); k.coin.glow.visible = false;
    F.tint.position.set(0.4, 2.2, 3.0); F.tint.intensity = 1.6; F.tint.color.set("#ff8ad8"); // imagination: a pink wash
    const kx = 0.05, kz = 2.35; tint(c, 0.55, "255,200,230", "90,60,170"); tint(pc, 0.55, "255,200,230", "90,60,170");
    // the officer: marches in from the door, salutes, gives, takes, marches out
    const inU = at(t, 0.0, 1.35), outU = at(t, 4.0, 5.9), px = lerp(2.3, 0.82, inU) + lerp(0, 1.6, outU), pz = lerp(3.1, 2.45, inU) + lerp(0, 0.5, outU);
    let Q = life(actAt(P8, t), t, 20, 1.2); if ((inU > 0 && inU < 1) || (outU > 0 && outU < 1)) Q = walk(Q, t * 2.8, 1.1, 1.6);
    if (t > 3.9) Q = { ...Q, mouth: { kind: "oo", open: 0.6 } };
    let P = life(actAt(A8, t), t, 19, 1); const sad = at(t, 4.2, 4.8); if (sad > 0) P = { ...P, body: { ...P.body, sy: P.body.sy * (1 - 0.07 * sad) }, bob: P.bob + 16 * sad, head: { ...P.head, dy: P.head.dy + 18 * sad } };
    put(c, KAMU, P, kx, kz, cx, 1); put(pc, POLISI, Q, px, pz, cx, 0.98, 0, badgeEx);
    const n = camDir(cam, kx, kz), right = V(n.z, 0, -n.x), hd = headPt(c, KAMU, P), mid = hd.clone().addScaledVector(right, 0.38).addScaledVector(n, 0.12).add(V(0, -0.5, 0));
    // the coin: proudly up in your right hand until he takes it (3.2), then in his hand
    const coinMine = hd.clone().addScaledVector(n, 0.2).addScaledVector(right, 0.3).add(V(0, -0.05, 0)), take = at(t, 3.1, 3.5);
    const ph = headPt(pc, POLISI, Q), coinHis = ph.clone().addScaledVector(camDir(cam, px, pz), 0.18).addScaledVector(right, 0.28).add(V(0, -0.02, 0));
    const coinP = take < 1 ? coinMine.clone().lerp(mid.clone().add(V(0.05, 0.05, 0)), take) : coinHis; coinAt(k.coin, coinP, cam, 2.9, t > 3.5 ? 1 : 0.7, t);
    const exK = both(sweatEx(KAMU, t, win(t, 2.0, 3.6)), tearsEx(KAMU, t, at(t, 4.6, 5.2)), sparkEx(KAMU, t, 1 - at(t, 0.8, 1.4)));
    P = reach(cx.card(0), KAMU, P, 1, coinP.clone().add(V(0, -0.045, 0)), kx, kz, cx, 1, 0, exK, 1 - at(t, 3.3, 3.6));
    // the envelope: from his hand (2.2) to yours (3.0); so thin it flaps
    const envHis = mid.clone().add(V(0.12, 0.02, 0.02)), envMine = hd.clone().addScaledVector(n, 0.25).addScaledVector(right, -0.22).add(V(0, -0.48, 0));
    const give = at(t, 2.6, 3.0), envP = t < 2.2 ? null : envHis.clone().lerp(envMine, give);
    if (envP) { F.env.visible = true; F.env.position.copy(envP); F.env.lookAt(cam.position); F.env.rotateZ(0.3 * Math.sin(t * 9) * (t > 3 ? 1 : 0.3)); F.env.scale.setScalar(1.3); P = reach(c, KAMU, P, 0, envP.clone().add(V(-0.07, -0.02, 0)), kx, kz, cx, 1, 0, exK, at(t, 2.4, 2.8)); if (give > 0.6) hold(F, 0, envP.clone().add(V(-0.07, -0.02, 0)), cam); }
    if (take < 1) hold(F, 1, coinP.clone().add(V(0, -0.045, 0)), cam);
    if (t > 1.9 && t < 3.6) { const tg = t < 3.0 ? envHis.clone().add(V(0.07, -0.02, 0)) : coinP.clone().add(V(0, -0.045, 0)); Q = reach(pc, POLISI, Q, 0, tg, px, pz, cx, 0.98, 0, badgeEx); hold(F, 2, tg, cam, 0.98); }
    if (t >= 3.5) { Q = reach(pc, POLISI, Q, 1, coinHis.clone().add(V(0, -0.045, 0)), px, pz, cx, 0.98, 0, badgeEx); hold(F, 3, coinHis.clone().add(V(0, -0.045, 0)), cam, 0.98); }
    for (const [p, a] of burst(t, 0.0, 0.7, 12, V(2.2, 1.0, 3.1), V(-0.5, 0.5, 0.2), 1, 0.9, -0.1, 71)) F.puff.add(p, 0.15 + 0.3 * a, 0.6 * (1 - a));
    fxEnd(F);
  },
};

// 9. THE DREAM (51 - 57): a pastel sky; a villa, a red car and a scooter pop out of the clouds; you kneel with a ring
const A9 = actor(21, [{ t: 0, mood: "excited", arms: ["open", "open"], look: [-0.6, -0.4] }, { t: 1.6, mood: "laugh", look: [0.6, -0.1] }, { t: 2.8, mood: "excited", look: [0.8, 0.0] }, { t: 3.9, mood: "nervous", arms: ["rest", "rest"], look: [0.6, -0.3] }, { t: 5.0, mood: "laugh", look: [0.6, -0.3] }]);
const G9 = actor(22, [{ t: 0, mood: "story", arms: ["rest", "rest"], look: [-0.5, 0.2] }, { t: 4.3, mood: "surprised", arms: ["mouthHand", "mouthHand"], look: [-0.6, 0.3] }, { t: 5.0, mood: "laugh", arms: ["up", "up"], look: [-0.5, 0.1] }]);
const popIn = (o: THREE.Object3D, t: number, t0: number, s: number) => { const u = clamp01((t - t0) / 0.5); o.visible = u > 0; o.scale.setScalar(s * Math.max(0.001, easeOutBack(u))); };
const S9: SceneDef = {
  from: 51, to: 57, ...DREAMY, mk: withFx(() => new MimpiSet()),
  keys: [...move(0, 1.6, [{ pos: [0.6, 2.1, 4.4], look: [-1.6, 1.4, -2.6], fov: 46 }, { pos: [0.85, 1.95, 4.1], look: [-1.5, 1.3, -2.4], fov: 46 }]),
    ...move(1.6, 2.8, [{ pos: [0.85, 1.95, 4.1], look: [-1.5, 1.3, -2.4], fov: 46 }, { pos: [3.1, 1.65, 4.0], look: [1.4, 0.55, -0.9], fov: 44 }], whip),
    ...move(2.8, 3.9, [{ pos: [3.1, 1.65, 4.0], look: [1.4, 0.55, -0.9], fov: 44 }, { pos: [3.8, 1.45, 4.4], look: [2.35, 0.6, 0.9], fov: 44 }], whip),
    ...move(3.9, 6, [{ pos: [1.3, 1.6, 6.1], look: [-0.03, 0.95, 1.8], fov: 42 }, { pos: [0.4, 1.55, 6.05], look: [-0.03, 0.95, 1.8], fov: 42 }, { pos: [-0.4, 1.5, 6.0], look: [-0.03, 0.95, 1.8], fov: 42 }])],
  focus: (t) => (t < 1.6 ? [-1.7, 1.2, -2.6] : t < 2.8 ? [1.4, 0.5, -0.9] : t < 3.9 ? [2.35, 0.6, 0.9] : [-0.05, 1.0, 1.8]),
  act: (cx) => {
    const { t, cam } = cx, k = get<MimpiSet>(cx), F = k.fx, c = cx.card(0), g = cx.card(1); fxBegin(F);
    popIn(k.house, t, 0.15, 1.9); popIn(k.car, t, 1.75, 1.15); popIn(k.moto, t, 2.95, 0.95); k.moto.position.y = DREAM.moto.y + hopY(t, 3.3, 0.35, 0.12);
    for (const [t0, p] of [[0.15, DREAM.house], [1.75, DREAM.car], [2.95, DREAM.moto]] as [number, THREE.Vector3][]) { for (const [q, a] of burst(t, t0, 0.8, 16, p.clone().add(V(0, 0.4, 0)), V(0, 1, 0), 1, 1.6, 0.3, t0 * 7)) F.star.add(q, 0.08 * (1 - a), 1 - a); for (const [q, a] of burst(t, t0, 0.7, 10, p.clone(), V(0, 0.3, 0), 1.2, 1.2, 0, t0 * 9)) F.puff.add(q, 0.3 + 0.4 * a, 0.7 * (1 - a)); }
    tint(c, 0.6, "255,210,240", "120,80,200"); tint(g, 0.6, "255,210,240", "120,80,200");
    // you: kneel (from 3.9) holding the ring box out to her; she gasps, then jumps for joy, hearts float up
    let P = life(actAt(A9, t), t, 21, 1.2); const kneel = at(t, 3.9, 4.3); P = crouch(P, kneel * 0.85);
    let Q = life(actAt(G9, t), t, 22, 1.2); const jy = t > 5.0 ? hopY(t, 5.0, 0.45, 0.18) + hopY(t, 5.5, 0.45, 0.18) : 0;
    const { x: yx, z: yz } = DREAM.you, { x: gx, z: gz } = DREAM.pacar;
    put(g, PACAR, Q, gx, gz, cx, scl(PACAR), jy, sparkEx(PACAR, t, at(t, 5.0, 5.3))); g.setVisible(t > 3.85);
    for (const [q, a] of burst(t, 3.8, 0.8, 16, V(0, 0.9, 1.8), V(0, 0.3, 0.3), 1.2, 1.0, 0, 77)) F.puff.add(q, 0.3 + 0.4 * a, 0.8 * (1 - a));
    const n = camDir(cam, yx, yz), right = V(n.z, 0, -n.x); put(c, KAMU, P, yx, yz, cx, 1); c.setVisible(t > 3.85); const hd = headPt(c, KAMU, P);
    const rp = hd.clone().addScaledVector(n, 0.15).addScaledVector(right, 0.33).add(V(0, -0.12 - 0.1 * (1 - kneel), 0)); k.ring.visible = t > 3.9; k.ring.position.copy(rp); k.ring.scale.setScalar(2.2); k.ring.lookAt(cam.position.clone().setY(rp.y + 0.6)); k.ring.rotateX(-0.5);
    if (t > 3.9) { P = reach(c, KAMU, P, 1, rp.clone().add(V(0, -0.02, 0)), yx, yz, cx, 1, 0, sweatEx(KAMU, t, win(t, 3.9, 4.9))); c.setVisible(true); hold(F, 0, rp.clone().add(V(0, -0.02, 0)), cam); orbit(F, rp.clone().add(V(0, 0.15, 0)), t, at(t, 4.0, 4.4), 4, 0.06, 0.04); }
    if (t > 5.0) for (let i = 0; i < 6; i++) { const a = ((t - 5.0) * 0.6 + i / 6) % 1; F.heart.add(V(lerp(yx, gx, 0.5) + 0.4 * Math.sin(i * 2.1 + t), 1.2 + 1.3 * a, 1.9), 0.12 * (1 - a * 0.5), 1 - a); }
    fxEnd(F);
  },
};

// 10. THE BUYER (57 - 64): bored daydreaming at the desk; ding: a mail pops up (an envelope + green banknotes); you lean in,
//     bite your lip, think, then nod nod nod
const A10 = actor(23, [{ t: 0, mood: "story", arms: ["chin", "chin"], look: [0.5, -0.4] }, { t: 1.0, mood: "surprised", arms: ["rest", "rest"], look: [0, 0.75] }, { t: 3.5, mood: "shock", event: "shockSmall", look: [0, 0.7] },
  { t: 4.2, mood: "nervous", arms: ["chin", "rest"], look: "dart" }, { t: 5.7, mood: "angry", arms: ["rest", "rest"], look: [0, 0.6] }]);
const S10: SceneDef = {
  from: 57, to: 64, ...ROOM_DAY, mk: mkKamar("day"),
  keys: [...move(0, 1.05, [{ pos: [-0.45, 1.65, 4.9], look: [-1.27, 1.08, 0.8], fov: 42 }, { pos: [-0.6, 1.62, 4.8], look: [-1.27, 1.08, 0.8], fov: 42 }]), ...move(1.05, 3.4, LAP_INS),
    ...move(3.4, 3.8, [{ pos: [-0.5, 1.65, 4.8], look: [-1.28, 1.1, 0.8], fov: 42 }, { pos: [-0.85, 1.6, 4.45], look: [-1.29, 1.1, 0.8], fov: 42 }], whip), ...move(3.8, 7, [{ pos: [-0.85, 1.6, 4.45], look: [-1.29, 1.1, 0.8], fov: 42 }, { pos: [-1.45, 1.58, 4.4], look: [-1.3, 1.1, 0.8], fov: 42 }])],
  focus: (t) => (t >= 1.05 && t < 3.4 ? [-1.3, 0.88, 1.42] : [-1.3, 1.15, 0.85]),
  act: (cx) => {
    const { t } = cx, k = get<KamarSet>(cx), F = k.fx, c = cx.card(0); fxBegin(F); k.guci.open(0); k.coin.glow.visible = false; k.front.visible = cx.cam.position.z < 2;
    k.laptop.draw(t < 1.05 ? "browse" : "notif", t < 1.05 ? 1 : at(t, 1.05, 3.0), t);
    if (t >= 1.05 && t < 3.4) { c.setVisible(false); fxEnd(F); return; }
    c.setVisible(true); tint(c, 0.5, "200,225,255", "90,80,170");
    let P = life(actAt(A10, t), t, 23, 1); if (t < 1.0) P = { ...P, eyes: [{ kind: "happy" }, { kind: "happy" }], mouth: { kind: "smile", open: 0.2 } };
    if (t > 4.2 && t < 5.7) P = withMouth(P, "clench", 0.4);
    P = nod(P, t, 5.8, 3, 18);
    const ex = both(screenEx(KAMU, 0.7), shockEx(KAMU, win(t, 3.5, 4.2)), sweatEx(KAMU, t, win(t, 4.2, 5.6)), sparkEx(KAMU, t, t < 1.0 ? 0.6 : 0));
    atDesk(cx, k, c, P, ex, 0);
    fxEnd(F);
  },
};

// 11. THE DEAL (64 - 69): a busy, colourful mall cafe; the neat buyer talks smoothly; handshake
const mkKafe = withFx(() => new KafeSet());
const EXTRA_SEAT: [number, number, number][] = [[-2.45, 0.6, 0], [-1.75, 0.6, 1], [2.0, 0.62, 2]];
const EXTRA_ACT = ANTRE.map((_, i) => actor(40 + i, [{ t: 0, mood: (["story", "laugh", "excited", "neutral", "smug"] as const)[i], arms: (([["rest", "chest"], ["clasp", "clasp"], ["rest", "hip"], ["chest", "rest"], ["hip", "rest"]] as const)[i]) as unknown as ["rest", "rest"], look: "dart" }]));
/** the cafe crowd: three seated guests, two walkers on the mall floor behind; look = turn toward the arrest (0..1) */
const crowd = (cx: Ctx, t: number, from: number, look = 0) => {
  EXTRA_SEAT.forEach(([x, z, i], j) => { let P = life(actAt(EXTRA_ACT[i], t + j), t, 40 + i, 1.2); if (j === 1 && look < 0.3) P = laughing(P, t + 0.3, 0.6); if (look > 0.3) P = { ...withEyes(P, "shock", { size: 1.2 }), mouth: { kind: "o", open: 0.6 }, head: { ...P.head, turn: x < 0 ? 0.6 : -0.6 } }; P = seated(P);
    const c = cx.card(from + j); put(c, ANTRE[i], P, x, z, cx, 0.92, sitY(ANTRE[i], 0.92, 0.48)); tint(c, 0.4, "255,220,180", "90,70,140"); });
  for (let j = 0; j < 2; j++) { const S = ANTRE[3 + j], dir = j ? -1 : 1, x = ((t * 0.55 * dir + j * 3.3 + 20) % 9) - 4.5, c = cx.card(from + 3 + j); let P = walk(life(actAt(EXTRA_ACT[3 + j], t), t, 43 + j, 1), t * 1.7 + j, 0.8); if (look > 0.3) P = withEyes(P, "shock"); put(c, S, P, x, -2.4 - j * 0.4, cx, 0.92); tint(c, 0.35, "255,220,180", "90,70,140"); }
};
const A11 = actor(24, [{ t: 0, mood: "nervous", arms: ["clasp", "clasp"], look: [-0.6, 0.1] }, { t: 2.2, mood: "nervous", look: [-0.7, 0.1] }, { t: 3.0, mood: "excited", look: [-0.7, 0.0] }, { t: 4.2, mood: "laugh", look: [-0.6, 0.0] }]);
const B11 = actor(25, [{ t: 0, mood: "story", arms: ["open", "rest"], look: [0.6, 0.1] }, { t: 1.2, mood: "smug", arms: ["point", "rest"], look: [0.7, 0.1] }, { t: 2.2, mood: "story", arms: ["open", "open"], look: [0.6, 0.1] }, { t: 3.0, mood: "smug", arms: ["rest", "rest"], look: [0.6, 0.1] }, { t: 4.4, mood: "wink", look: [0.6, 0.0] }]);
const SHAKE = V(0.0, 0.98, 1.5);
const S11: SceneDef = {
  from: 64, to: 69, ...MALL, mk: mkKafe,
  keys: [...move(0, 2.2, [{ pos: [3.0, 2.7, 6.6], look: [0.0, 1.0, 1.0], fov: 44 }, { pos: [1.8, 2.1, 5.4], look: [0.0, 1.0, 1.1], fov: 42 }, { pos: [0.9, 1.6, 4.55], look: [0.0, 1.0, 1.2], fov: 40 }]),
    ...move(2.2, 5, [{ pos: [0.9, 1.6, 4.55], look: [0.0, 1.0, 1.2], fov: 40 }, { pos: [0.3, 1.52, 5.3], look: [0.0, 1.0, 1.2], fov: 40 }, { pos: [-0.3, 1.5, 5.3], look: [0.0, 1.0, 1.2], fov: 40 }])],
  focus: () => [0, 1.0, 1.2],
  act: (cx) => {
    const { t, cam } = cx, k = get<KafeSet>(cx), F = k.fx, c = cx.card(0), b = cx.card(1); fxBegin(F); crowd(cx, t, 2);
    tint(c, 0.5, "255,214,170", "90,60,150"); tint(b, 0.5, "255,214,170", "90,60,150");
    const [bx, , bz] = BUYER_AT, [yx, , yz] = YOU_AT;
    let P = seated(life(actAt(A11, t), t, 24, 1)), Q = seated(life(actAt(B11, t), t, 25, 1));
    const sh = at(t, 2.9, 3.2) * (1 - at(t, 4.3, 4.6)), wob = Math.sin((t - 3.2) * 2 * Math.PI * 3.5) * 0.03 * (t > 3.2 && t < 4.3 ? 1 : 0), hp = SHAKE.clone().add(V(0, wob, 0));
    const ex = both(sweatEx(KAMU, t, win(t, 0.3, 2.8)), sparkEx(KAMU, t, at(t, 4.2, 4.5)));
    P = reach(c, KAMU, P, 0, hp, yx, yz, cx, 1, sitY(KAMU, 1, 0.48), ex, sh); Q = reach(b, INTEL, Q, 1, hp.clone().add(V(0.01, 0, 0)), bx, bz, cx, scl(INTEL), sitY(INTEL, scl(INTEL), 0.48), intelEx, sh);
    k.pouch.visible = true; void cam;
    fxEnd(F);
  },
};

// 12. "HE'S POLICE" (69 - 72): he stands, twists your arm behind you, cuffs click; the whole cafe turns
const A12 = actor(26, [{ t: 0, mood: "laugh", arms: ["rest", "rest"], look: [-0.6, 0.0] }, { t: 0.45, mood: "shock", event: "shock", look: [0.3, 0.3] }, { t: 1.4, mood: "scared", look: [0.0, 0.5] }]);
const B12 = actor(27, [{ t: 0, mood: "smug", arms: ["rest", "rest"], look: [0.6, 0.1] }, { t: 0.4, mood: "angry", arms: ["rest", "up"], look: [0.5, 0.4] }]);
const S12: SceneDef = {
  from: 69, to: 72, ...MALL, sat: 0.22, mk: mkKafe,
  keys: [...move(0, 0.45, [{ pos: [-0.3, 1.5, 5.3], look: [0.0, 1.0, 1.2], fov: 40 }, { pos: [-0.32, 1.5, 5.25], look: [0.05, 1.0, 1.2], fov: 40 }]),
    ...move(0.45, 0.85, [{ pos: [-0.32, 1.5, 5.25], look: [0.05, 1.0, 1.2], fov: 40 }, { pos: [0.7, 1.62, 5.75], look: [0.66, 1.1, 0.9], fov: 42 }], whip), ...move(0.85, 3, [{ pos: [0.7, 1.62, 5.75], look: [0.66, 1.1, 0.9], fov: 42 }, { pos: [0.74, 1.6, 5.6], look: [0.66, 1.1, 0.9], fov: 42 }], sm, 0.004)],
  focus: () => [0.4, 1.1, 1.05],
  act: (cx) => {
    const { t, cam } = cx, k = get<KafeSet>(cx), F = k.fx, c = cx.card(0), b = cx.card(1); fxBegin(F); crowd(cx, t + 5, 2, at(t, 0.9, 1.2));
    tint(c, 0.6, "255,214,170", "70,50,150"); tint(b, 0.6, "255,214,170", "70,50,150");
    const up = at(t, 0.4, 0.75), yx = YOU_AT[0], yz = YOU_AT[2];
    let P = life(actAt(A12, t), t, 26, 1.3); P = up < 0.5 ? seated(P) : { ...P, armBehind: [true, true], arms: [{ a: [-20, 90], b: [30, 160] }, { a: [20, 90], b: [-30, 160] }], body: { ...P.body, sy: P.body.sy * 0.94 }, head: { ...P.head, dy: P.head.dy + 22 } };
    if (t > 0.45 && t < 0.9) P = withEyes(P, "shock", { size: 1.4 });
    const yy = up < 0.5 ? sitY(KAMU, 1, 0.48) : 0;
    put(c, KAMU, P, yx, yz, cx, 1, yy, both(shockEx(KAMU, win(t, 0.45, 1.6)), sweatEx(KAMU, t, at(t, 1.2, 1.6))));
    // the buyer: up and round behind you (0.4 - 0.8), holds the cuffs up (they click at 1.25)
    const gx = lerp(BUYER_AT[0], 0.98, up), gz = lerp(BUYER_AT[2], 0.72, up); let Q = life(actAt(B12, t), t, 27, 1); if (up < 0.5) Q = seated(Q); else if (up < 1) Q = walk(Q, t * 3, 0.8);
    const gy = up < 0.5 ? sitY(INTEL, scl(INTEL), 0.48) : 0; put(b, INTEL, Q, gx, gz, cx, scl(INTEL), gy, intelEx);
    const n = camDir(cam, gx, gz), right = V(n.z, 0, -n.x), gh = headPt(b, INTEL, Q), cuff = gh.clone().addScaledVector(right, 0.34).addScaledVector(n, 0.25).add(V(0, -0.06 + 0.02 * Math.sin(t * 7), 0));
    if (t > 0.75) { const hc = k.extra.children[0] as THREE.Group | undefined; if (hc) { hc.visible = true; hc.position.copy(cuff); hc.lookAt(cam.position); hc.rotateZ(0.6 * Math.sin(t * 5)); } Q = reach(b, INTEL, Q, 1, cuff.clone().add(V(-0.05, 0.0, 0)), gx, gz, cx, scl(INTEL), gy, intelEx); hold(F, 0, cuff.clone().add(V(-0.05, 0, 0)), cam, 0.98); }
    for (const [p, a] of burst(t, 1.25, 0.4, 10, cuff.clone(), V(0, 1, 0.3), 1, 0.9, 0.5, 81)) F.star.add(p, 0.05 * (1 - a), 1 - a);
    k.pouch.visible = true; fxEnd(F);
  },
};
// the handcuffs prop for the cafe lives in the set's `extra` group (added here so rooms.ts stays generic)
const mkKafeCuffs = withFx(() => { const s = new KafeSet(); const h = handcuffs(); h.visible = false; h.scale.setScalar(2.6); s.extra.add(h); return s; });
S12.mk = mkKafeCuffs;

// 13. THE INTERROGATION (72 - 81): bar shadows, a swinging lamp; the officer paces, slams the table (you jump), points to the
//     calendar where a circle is drawn round the last day; you shrink, sweating, tears
const A13 = actor(28, [{ t: 0, mood: "worried", arms: ["rest", "rest"], look: [-0.5, 0.2] }, { t: 3.0, mood: "shock", event: "shock", look: [-0.4, 0.1] }, { t: 3.9, mood: "scared", look: [0.6, -0.3] }, { t: 5.6, mood: "worried", look: [-0.5, 0.2] }, { t: 7.0, mood: "worried", look: [0.0, 0.6] }]);
const O13 = actor(29, [{ t: 0, mood: "angry", arms: ["hip", "hip"], look: [0.5, 0.3] }, { t: 2.6, mood: "angry", arms: ["rest", "up"], look: [0.6, 0.4] }, { t: 3.4, mood: "smug", arms: ["point", "hip"], look: [0.8, -0.3] }, { t: 5.6, mood: "angry", arms: ["hip", "hip"], look: [0.6, 0.3] }, { t: 7.2, mood: "suspicious", arms: ["chest", "chest"], look: [0.5, 0.4] }]);
const OX13 = -0.95, OZ13 = 0.6;
const S13: SceneDef = {
  from: 72, to: 81, ...INTERRO, mk: withFx(() => new InterogasiSet()),
  keys: [...move(0, 3.4, [{ pos: [0.7, 1.95, 5.8], look: [-0.4, 1.0, 0.8], fov: 44 }, { pos: [0.3, 1.7, 5.2], look: [-0.42, 1.05, 0.8], fov: 43 }]),
    ...move(3.4, 3.75, [{ pos: [0.3, 1.7, 5.2], look: [-0.42, 1.05, 0.8], fov: 43 }, { pos: [0.78, 1.47, 1.55], look: [1.05, 1.5, 0.0], fov: 38 }], whip), ...move(3.75, 5.5, [{ pos: [0.78, 1.47, 1.55], look: [1.05, 1.5, 0.0], fov: 38 }, { pos: [0.82, 1.48, 1.45], look: [1.05, 1.5, 0.0], fov: 38 }]),
    ...move(5.5, 9, [{ pos: [-0.35, 1.52, 5.1], look: [-0.42, 1.06, 0.8], fov: 42 }, { pos: [-0.32, 1.48, 4.85], look: [-0.32, 1.06, 0.8], fov: 42 }])],
  focus: (t) => (t >= 3.6 && t < 5.5 ? [1.05, 1.5, 0.02] : [-0.2, 1.1, 0.8]),
  act: (cx) => {
    const { t, cam } = cx, k = get<InterogasiSet>(cx), F = k.fx, c = cx.card(0), o = cx.card(1); fxBegin(F);
    tint(c, 0.75, "255,190,120", "30,60,110"); tint(o, 0.75, "255,190,120", "30,60,110");
    k.drawCal(at(t, 3.9, 4.8));
    const slam = t > 3.0 ? Math.exp(-(t - 3.0) * 8) : 0, [x, seat, z] = INT_SEAT;
    k.cuffs.position.y = 0.77 + 0.05 * hopY(t, 3.0, 0.25, 1);
    // you: hands on the cuffs on the table; jump at the slam; shrink later, tears from 7
    let P = seated(life(actAt(A13, t), t, 28, 0.9)); const shrink = at(t, 6.6, 7.6); P = { ...P, body: { ...P.body, sy: P.body.sy * (1 - 0.07 * shrink) }, bob: P.bob + 18 * shrink };
    const ex = both(sweatEx(KAMU, t, at(t, 3.2, 3.8)), tearsEx(KAMU, t, at(t, 7.0, 7.6)), shockEx(KAMU, win(t, 3.0, 3.9)));
    const y = sitY(KAMU, 1, seat) + 0.12 * hopY(t, 3.0, 0.3, 1); k.cuffs.updateMatrixWorld();
    for (const i of [0, 1] as const) P = reach(c, KAMU, P, i, k.cuffs.localToWorld(V(i ? 0.05 : -0.05, 0, 0)), x, z, cx, 1, y, ex);
    // the officer: paces a little, slams the table (3.0), points to the calendar (3.4 - 5.5), leans in
    const pace = t < 2.5 ? 0.18 * Math.sin(t * 1.6) : 0; let Q = life(actAt(O13, t), t, 29, 1.1); if (t < 2.5) Q = walk(Q, t * 1.6, 0.6);
    const ox = OX13 + pace; put(o, POLISI, Q, ox, OZ13, cx, 0.98, 0, badgeEx);
    if (t > 2.6 && t < 3.4) { const hand = V(-0.5, INT_TABLE.top + 0.02 + 0.28 * (1 - at(t, 2.75, 3.0)), 1.05); Q = reach(o, POLISI, Q, 1, hand, ox, OZ13, cx, 0.98, 0, badgeEx); }
    if (t > 7.2) { const lean = at(t, 7.2, 7.6); Q = { ...Q, head: { ...Q.head, dy: Q.head.dy + 20 * lean, rot: Q.head.rot + 0.15 * lean } }; put(o, POLISI, Q, ox, OZ13, cx, 0.98, 0, badgeEx); }
    for (const [p, a] of burst(t, 3.0, 0.5, 10, V(-0.5, INT_TABLE.top + 0.03, 1.05), V(0, 1, 0.4), 1.2, 0.8, 0.8, 91)) F.puff.add(p, 0.05 + 0.1 * a, 0.6 * (1 - a));
    if (slam > 0.05) { cam.position.add(V(0.01 * slam * Math.sin(t * 80), 0.01 * slam * Math.cos(t * 70), 0)); cam.updateMatrixWorld(); }
    fxEnd(F);
  },
};

// 14. REGRET, THEN REWIND (81 - 84.5): face in your hands; a big clock spins backwards in front of the lens, the picture
//     rolls and flashes white
const A14 = actor(30, [{ t: 0, mood: "worried", arms: ["mouthHand", "mouthHand"], look: [0, 0.7] }, { t: 1.4, mood: "surprised", look: [0, 0.2] }]);
const S14: SceneDef = {
  from: 81, to: 84.5, ...INTERRO, mk: withFx(() => new InterogasiSet()),
  keys: [...move(0, 1.4, [{ pos: [-0.15, 1.45, 4.3], look: [0.0, 1.06, 0.85], fov: 42 }, { pos: [-0.1, 1.42, 4.1], look: [0.0, 1.06, 0.85], fov: 42 }]), ...move(1.4, 3.5, [{ pos: [-0.1, 1.42, 4.1], look: [0.0, 1.06, 0.85], fov: 42 }, { pos: [0.0, 1.3, 3.3], look: [0.0, 1.06, 0.85], fov: 52 }])],
  focus: () => [0, 1.1, 0.85], fadeAt: (t) => -0.85 * at(t, 2.9, 3.45), satAt: (t) => 0.18 - 0.5 * at(t, 1.6, 3.2),
  act: (cx) => {
    const { t, cam } = cx, k = get<InterogasiSet>(cx), F = k.fx, c = cx.card(0); fxBegin(F); k.drawCal(1); tint(c, 0.75, "255,190,120", "30,60,110"); cx.card(1).setVisible(false);
    const [x, seat, z] = INT_SEAT, sob = Math.max(0, Math.sin(t * 2 * Math.PI * 2.2)) * (t < 1.4 ? 1 : 0);
    let P = seated(life(actAt(A14, t), t, 30, 0.9)); P = { ...P, body: { ...P.body, sy: P.body.sy * (1 - 0.04 * sob) }, bob: P.bob + 8 * sob };
    if (t < 1.4) P = eyesShut(P);
    put(c, KAMU, P, x, z, cx, 1, sitY(KAMU, 1, seat), both(tearsEx(KAMU, t, t < 1.4 ? 1 : 1 - at(t, 1.4, 2.0)), sweatEx(KAMU, t, 0)));
    // the rewind: the clock flies in, spins backwards faster and faster; the camera rolls
    const r = at(t, 1.4, 3.4), cl = F.clock; cl.group.visible = r > 0; const f = V(0, 0, -1).applyQuaternion(cam.quaternion);
    cl.group.position.copy(cam.position).addScaledVector(f, lerp(3.0, 1.75, sm(at(t, 1.4, 2.0)))); cl.group.quaternion.copy(cam.quaternion); cl.set(8 - 40 * r * r);
    cam.rotateZ(-3.2 * r * r); cam.updateMatrixWorld();
    for (let i = 0; i < 14; i++) { const a = i * 0.45 - t * 6 * r, rr = 0.35 + 0.06 * (i % 3); F.puff.add(cam.position.clone().addScaledVector(f, 1.1).add(V(rr * Math.cos(a), rr * Math.sin(a), 0).applyQuaternion(cam.quaternion)), 0.12, 0.5 * r); }
    fxEnd(F);
  },
};

// 15. BACK IN YOUR ROOM (84.5 - 88.5): the roll unwinds out of white; you blink, shake your head, the mail is still open;
//     you slam the laptop shut
const A15 = actor(31, [{ t: 0, mood: "surprised", arms: ["rest", "rest"], look: [0, 0.4] }, { t: 1.6, mood: "worried", look: [0, 0.75] }, { t: 2.6, mood: "angry", look: [0, 0.6] }, { t: 3.3, mood: "smug", look: [0.2, 0.2] }]);
const S15: SceneDef = {
  from: 84.5, to: 88.5, ...ROOM_DAY, mk: mkKamar("day"),
  keys: [...move(0, 1.5, [{ pos: [-0.95, 1.5, 3.9], look: [-1.3, 1.1, 0.8], fov: 50 }, { pos: [-0.95, 1.55, 4.3], look: [-1.3, 1.1, 0.8], fov: 42 }]), ...move(1.5, 2.4, LAP_INS),
    ...move(2.4, 4, [{ pos: [-0.55, 1.65, 4.75], look: [-1.28, 1.06, 0.8], fov: 42 }, { pos: [-0.85, 1.62, 4.65], look: [-1.28, 1.06, 0.8], fov: 42 }])],
  focus: (t) => (t >= 1.5 && t < 2.4 ? [-1.3, 0.88, 1.42] : [-1.3, 1.1, 0.85]), fadeAt: (t) => -0.85 * (1 - at(t, 0, 0.5)), satAt: (t) => 0.26 - 0.4 * (1 - at(t, 0, 0.6)),
  act: (cx) => {
    const { t, cam } = cx, k = get<KamarSet>(cx), F = k.fx, c = cx.card(0); fxBegin(F); k.guci.open(0); k.coin.glow.visible = false; k.front.visible = cx.cam.position.z < 2;
    cam.rotateZ(0.9 * (1 - sm(at(t, 0, 1.0)))); cam.updateMatrixWorld();
    const shut = at(t, 2.75, 2.95); k.laptop.open(1 - shut); k.laptop.draw(shut > 0.9 ? "off" : "email", 1, t);
    if (t >= 1.5 && t < 2.4) { c.setVisible(false); fxEnd(F); return; }
    c.setVisible(true); tint(c, 0.5, "200,225,255", "90,80,170");
    let P = life(actAt(A15, t), t, 31, 1); if (t < 0.5 || (t > 0.75 && t < 0.85)) P = eyesShut(P); P = shakeHead(P, t, 0.9, 0.6);
    const ex = both(screenEx(KAMU, 0.6 * (1 - shut)), sparkEx(KAMU, t, at(t, 3.2, 3.5)));
    if (t > 2.4 && t < 3.1) { const L = k.laptop.lid; L.updateMatrixWorld(); const tp = L.localToWorld(V(0, 0.2, 0.0)); P = seated(P); P = reach(c, KAMU, P, 1, tp, DESK_SEAT[0], DESK_SEAT[2], cx, 1, sitY(KAMU, 1, DESK_SEAT[1]), ex); hold(F, 1, tp, cam); }
    else atDesk(cx, k, c, P, ex, 0);
    for (const [p, a] of burst(t, 2.95, 0.5, 10, V(...LAPTOP_AT).add(V(0, 0.05, 0.1)), V(0, 1, 0.5), 1, 0.7, 0.6, 99)) F.puff.add(p, 0.04 + 0.08 * a, 0.6 * (1 - a));
    fxEnd(F);
  },
};

// 16. THE GOLD SHOP (88.5 - 94.5): you put the coin on the scale, the digits climb to 4.25, the owner counts out cash;
//     you take it with a crooked smile and a shrug
const A16 = actor(32, [{ t: 0, mood: "nervous", arms: ["rest", "rest"], look: [-0.5, 0.3] }, { t: 1.2, mood: "story", look: [-0.4, 0.6] }, { t: 3.6, mood: "worried", look: [-0.6, 0.2] }, { t: 4.8, mood: "smug", arms: ["rest", "shrug"], look: [0.2, 0.1] }]);
const O16 = actor(33, [{ t: 0, mood: "smug", arms: ["clasp", "clasp"], look: [0.5, 0.3] }, { t: 2.4, mood: "story", arms: ["rest", "rest"], look: [0.4, 0.7] }, { t: 3.6, mood: "smug", arms: ["rest", "rest"], look: [0.6, 0.2] }, { t: 5.0, mood: "laugh", arms: ["clasp", "clasp"], look: [0.6, 0.2] }]);
const SCALE_V = (t: number) => { const u = at(t, 1.9, 3.3); if (u >= 1) return "4.25"; const v = 4.25 * u + (u > 0 && u < 1 ? 0.13 * Math.sin(t * 40) : 0); return Math.max(0, v).toFixed(2); };
const S16: SceneDef = {
  from: 88.5, to: 94.5, ...SHOP, mk: withFx(() => new TokoSet()),
  keys: [...move(0, 1.6, [{ pos: [1.9, 2.05, 6.9], look: [0.05, 1.2, 1.2], fov: 46 }, { pos: [1.0, 1.8, 6.4], look: [0.08, 1.15, 1.25], fov: 46 }]),
    ...move(1.6, 1.9, [{ pos: [1.0, 1.8, 6.4], look: [0.08, 1.15, 1.25], fov: 46 }, { pos: [0.3, 1.33, 1.85], look: [0.12, 1.03, 1.22], fov: 36 }], whip), ...move(1.9, 3.5, [{ pos: [0.3, 1.33, 1.85], look: [0.12, 1.03, 1.22], fov: 36 }, { pos: [0.26, 1.3, 1.8], look: [0.12, 1.03, 1.22], fov: 36 }]),
    ...move(3.5, 6, [{ pos: [0.7, 1.75, 6.3], look: [0.08, 1.15, 1.25], fov: 46 }, { pos: [0.15, 1.72, 6.2], look: [0.08, 1.15, 1.25], fov: 46 }, { pos: [-0.35, 1.7, 6.1], look: [0.08, 1.15, 1.25], fov: 46 }])],
  focus: (t) => (t >= 1.75 && t < 3.5 ? [0.12, 1.04, 1.25] : [0.08, 1.15, 1.25]),
  act: (cx) => {
    const { t, cam } = cx, k = get<TokoSet>(cx), F = k.fx, c = cx.card(0), o = cx.card(1); fxBegin(F);
    tint(c, 0.5, "255,200,150", "130,30,50"); tint(o, 0.5, "255,200,150", "130,30,50");
    k.scale.show(SCALE_V(t)); const pan = k.scale.pan.getWorldPosition(V(0, 0, 0)).add(V(0, 0.006, 0));
    const [cxx, , czz] = CUST_AT, [ox, , oz] = OWNER_AT; let P = life(actAt(A16, t), t, 32, 1), Q = life(actAt(O16, t), t, 33, 1);
    if (t > 4.8) P = withMouth(P, "smirk", 0.3);
    const ex = both(sweatEx(KAMU, t, win(t, 4.6, 6.0) * 0.8), glowEx(KAMU, 0.2, t)); put(c, KAMU, P, cxx, czz, cx, 1, 0, ex); const hd = headPt(c, KAMU, P), n = camDir(cam, cxx, czz), right = V(n.z, 0, -n.x);
    // the coin: from your hand onto the pan (0.6 - 1.4), stays on the pan
    const handC = hd.clone().addScaledVector(n, 0.2).addScaledVector(right, -0.28).add(V(0, -0.35, 0)), lay = at(t, 0.6, 1.4), cp = handC.clone().lerp(pan, lay);
    coinAt(k.coin, cp, cam, 2.0, 0.6, t, 0); if (lay >= 1) { k.coin.coin.quaternion.identity(); k.coin.coin.rotation.set(0, 0.4, 0); k.coin.coin.scale.setScalar(2.0); }
    if (lay < 1 && t < 1.5) { P = reach(c, KAMU, P, 0, cp.clone().add(V(0, -0.04, 0)), cxx, czz, cx, 1, 0, ex); hold(F, 0, cp.clone().add(V(0, -0.04, 0)), cam); }
    // the cash: the owner slides a stack across (3.8 - 4.4); you pick it up (4.6) and hold it up, shrug
    const slide = at(t, 3.8, 4.4), lift = at(t, 4.6, 5.0), csh = k.cash[0], from = V(-0.75, COUNTER.top + 0.002, 1.2), to = V(0.42, COUNTER.top + 0.002, 1.32);
    const cashP = from.clone().lerp(to, slide).lerp(hd.clone().addScaledVector(n, 0.25).addScaledVector(right, 0.3).add(V(0, -0.25, 0)), lift); csh.position.copy(cashP); csh.rotation.set(lift * -1.0, 0.3 - 0.2 * slide, lift * 0.3);
    if (slide > 0 && slide < 1) { Q = reach(o, PEMILIK, Q, 1, cashP.clone().add(V(-0.07, 0.02, 0)), ox, oz, cx, 0.98, 0); hold(F, 2, cashP.clone().add(V(-0.07, 0.02, 0)), cam); }
    else put(o, PEMILIK, Q, ox, oz, cx, 0.98, 0);
    if (lift > 0) { const gp = cashP.clone().add(V(0, -0.01, 0)); P = reach(c, KAMU, P, 1, gp, cxx, czz, cx, 1, 0, ex); hold(F, 1, gp, cam); }
    if (lay >= 1 && t < 3.6) orbit(F, pan.clone().add(V(0, 0.03, 0)), t, 0.7, 4, 0.05, 0.03);
    fxEnd(F);
  },
};

// 17. THE OWNER'S CALL (94.5 - 98.5): you walk out; the owner picks up the phone and, rubbing his chin, puts on an evil-plan
//     face (narrowed eyes, sharp brows, a wide sly grin), chuckles with his shoulders, a red glow creeps up from below
const O17 = actor(34, [{ t: 0, mood: "smug", arms: ["rest", "chin"], look: [0.7, 0.0] }, { t: 1.3, mood: "suspicious", arms: ["rest", "chin"], look: [0.5, -0.1] }, { t: 2.2, mood: "smug", arms: ["rest", "chin"], look: [0.15, 0.05] }]);
const A17 = actor(35, [{ t: 0, mood: "worried", arms: ["rest", "rest"], look: [0.7, 0.1] }]);
/** the scheming face: lids low and angled in, brows slanted down to the nose, a wide closed grin pushed to one side */
const evilFace = (P: Pose, k: number, grin: number): Pose => k <= 0 ? P : ({ ...P,
  eyes: [{ kind: "open", lid: 0.55 * k, lidAng: 0.4 * k, size: 0.95 }, { kind: "open", lid: 0.55 * k, lidAng: 0.4 * k, size: 0.95 }],
  brows: [{ dy: 0.05 * k, ang: -0.55 * k, arch: 0 }, { dy: 0.05 * k, ang: -0.55 * k, arch: 0 }],
  mouth: k > 0.5 ? { kind: "smileBig", open: 0.12 + 0.2 * grin, dx: 0.05, w: 1.15 } : P.mouth,
  head: { ...P.head, rot: P.head.rot + 0.1 * k } });
const S17: SceneDef = {
  from: 94.5, to: 98.5, ...SHOP, mk: withFx(() => new TokoSet()),
  keys: [...move(0, 1.1, [{ pos: [1.0, 1.6, 5.8], look: [0.4, 1.2, 1.4], fov: 44 }, { pos: [0.6, 1.5, 5.3], look: [0.0, 1.25, 1.0], fov: 44 }]), ...move(1.1, 4, [{ pos: [0.6, 1.5, 5.3], look: [0.0, 1.25, 1.0], fov: 44 }, { pos: [0.1, 1.15, 4.6], look: [-0.42, 1.4, 0.55], fov: 44 }, { pos: [-0.2, 1.1, 4.4], look: [-0.45, 1.42, 0.55], fov: 44 }])],
  focus: (t) => (t < 1.1 ? [0.5, 1.2, 1.8] : [-0.45, 1.45, 0.6]),
  act: (cx) => {
    const { t, cam } = cx, k = get<TokoSet>(cx), F = k.fx, c = cx.card(0), o = cx.card(1); fxBegin(F); k.scale.show("0.00"); k.cash.forEach((m) => (m.visible = false)); k.coin.coin.visible = false; k.coin.set(0, t);
    tint(o, 0.6, "255,210,140", "130,30,50"); tint(c, 0.5, "255,200,150", "130,30,50");
    const go = at(t, 0, 1.2); c.setVisible(go < 1); if (go < 1) put(c, KAMU, walk(life(actAt(A17, t), t, 35, 1), t * 2.2, 0.9), lerp(CUST_AT[0], 2.6, go), lerp(CUST_AT[2], 2.9, go), cx, 1);
    const [ox, , oz] = OWNER_AT, ev = sm(at(t, 1.5, 2.1)), chuckle = t > 2.6 ? Math.max(0, Math.sin((t - 2.6) * 2 * Math.PI * 3.2)) * (1 - at(t, 3.5, 3.9)) : 0;
    let Q = life(actAt(O17, t), t, 34, 1.0); Q = evilFace(Q, ev, chuckle); Q = { ...Q, bob: Q.bob + 7 * chuckle, body: { ...Q.body, sy: Q.body.sy * (1 - 0.025 * chuckle) } };
    // the other hand rubs the chin slowly (fingers tap)
    Q = { ...Q, arms: [Q.arms[0], { ...Q.arms[1], b: [Q.arms[1].b[0] + 6 * Math.sin(t * 9) * ev, Q.arms[1].b[1] + 4 * Math.sin(t * 4.5)] }] };
    const n = camDir(cam, ox, oz), right = V(n.z, 0, -n.x); put(o, PEMILIK, Q, ox, oz, cx, 0.98, 0); const hd = headPt(o, PEMILIK, Q);
    const ear = hd.clone().addScaledVector(right, -0.29).addScaledVector(n, 0.12).add(V(0, 0.0, 0)), ph = F.phone; const lift = at(t, 0.7, 1.1); ph.group.visible = lift > 0;
    // the phone pressed to his ear, turned three-quarters to the lens so its lit screen and its thickness both read
    ph.group.position.copy(ear.clone().add(V(0, -0.35 * (1 - lift), 0))); ph.group.lookAt(cam.position); ph.group.rotateY(-0.75); ph.group.rotateZ(0.3); ph.group.scale.setScalar(1.35); ph.draw("answer", 1, t);
    if (lift > 0) { const hp = ph.group.position.clone().add(V(0, -0.06, 0)); Q = reach(o, PEMILIK, Q, 0, hp, ox, oz, cx, 0.98, 0); hold(F, 0, hp, cam, 0.98); }
    // the evil glow from below
    F.tint.color.set("#ff2d55"); F.tint.position.copy(hd).add(V(0, -0.3, 0)).addScaledVector(n, 0.2); F.tint.distance = 1.2; F.tint.intensity = 1.8 * ev;
    fxEnd(F);
  },
};

// 18. THE CROSSROADS (98.5 - 106): you on the kerb with the coin; look left: the police station; look right: the gold
//     shop; the camera cranes up to show both; fade out
const A18 = actor(36, [{ t: 0, mood: "worried", arms: ["rest", "rest"], look: [0, 0.4] }, { t: 1.1, mood: "suspicious", look: [-0.9, -0.1] }, { t: 3.4, mood: "nervous", look: [0.9, -0.1] }, { t: 5.6, mood: "worried", arms: ["rest", "shrug"], look: [0, 0.3] }]);
const S18: SceneDef = {
  from: 98.5, to: 106, ...GOLDEN, mk: withFx(() => new SimpangSet()),
  keys: [...move(0, 1.5, [{ pos: [0.6, 1.7, 6.2], look: [0, 1.15, 1.9], fov: 42 }, { pos: [0.9, 1.72, 6.4], look: [0, 1.15, 1.8], fov: 42 }]),
    ...move(1.5, 3.2, [{ pos: [0.9, 1.72, 6.4], look: [0, 1.15, 1.8], fov: 42 }, { pos: [2.7, 1.8, 7.2], look: [-0.25, 1.7, 1.4], fov: 42 }]),
    ...move(3.2, 5.4, [{ pos: [2.7, 1.8, 7.2], look: [-0.25, 1.7, 1.4], fov: 42 }, { pos: [0, 1.85, 8.0], look: [0, 1.7, 1.4], fov: 42 }, { pos: [-2.7, 1.8, 7.2], look: [0.25, 1.7, 1.4], fov: 42 }]),
    ...move(5.4, 7.5, [{ pos: [-2.7, 1.8, 7.2], look: [0.25, 1.7, 1.4], fov: 42 }, { pos: [-0.6, 4.4, 11.2], look: [0, 1.4, -2.0], fov: 50 }, { pos: [0, 6.3, 14.2], look: [0, 1.5, -2.8], fov: 54 }])],
  focus: (t) => (t > 5.6 ? [0, 1.2, 0] : [0, 1.15, 1.6]), cInf: 2.5, fadeAt: (t) => 0.95 * at(t, 6.8, 7.5),
  act: (cx) => {
    const { t, cam } = cx, k = get<SimpangSet>(cx), F = k.fx, c = cx.card(0); fxBegin(F); tint(c, 0.55, "255,200,140", "70,70,160");
    const { x, z } = SIMPANG.you; let P = life(actAt(A18, t), t, 36, 1); if (t > 5.6) P = { ...P, head: { ...P.head, rot: P.head.rot + 0.12 * Math.sin(t * 3) } };
    const n = camDir(cam, x, z), right = V(n.z, 0, -n.x); put(c, KAMU, P, x, z, cx, 1, 0.14); const hd = headPt(c, KAMU, P), coinP = hd.clone().addScaledVector(n, 0.2).addScaledVector(right, 0.3).add(V(0, -0.28, 0));
    const coin = (k as unknown as { cr?: CoinRig }).cr ?? ((k as unknown as { cr: CoinRig }).cr = new CoinRig(k.root)); coinAt(coin, coinP, cam, 3.0, 0.8, t);
    P = reach(c, KAMU, P, 1, coinP.clone().add(V(0, -0.045, 0)), x, z, cx, 1, 0.14, sweatEx(KAMU, t, win(t, 5.6, 7.0) * 0.6)); hold(F, 1, coinP.clone().add(V(0, -0.045, 0)), cam);
    orbit(F, coinP, t, 0.6, 4, 0.06, 0.035);
    fxEnd(F);
  },
};

export const EMAS_SCENES: SceneDef[] = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14, S15, S16, S17, S18];
export const EMAS_FRAMES = Math.round(106 * FPS);
export const EmasFilm: React.FC = () => <Reel scenes={EMAS_SCENES} />;
void TABLE; void SCALE_AT; void YOU_AT; void drawSpeedLines; void clamp01; void rightOf; void squash;
