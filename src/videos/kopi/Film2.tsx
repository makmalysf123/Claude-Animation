// "Kopi Mahal Itu Cuma Gengsi?" v2 (about 85 s). Plan: docs/scripts/kopi-mahal-v2-rencana.md (approved 2026-11-17).
// The owner's place is now KEDAI MAKMUR, a small old coffee shop; the rival LANGIT COFFEE gets its own shots. Scene
// clocks start at 0. No narrator, subtitles or speech bubbles: the user adds voice + subtitles in CapCut.
// Rules learned from the rejected v1: something happens every 3-6 s, nobody stands still, goofy cartoon acting, cameras
// glide on splines (no stop-start), close-ups keep the whole head in frame (distance >= 0.67 / tan(fov/2)), seated
// guests sit behind solid tables (no legs to clip), cups really sit in front of the mouth when sipping.
import React from "react";
import * as THREE from "three";
import { actAt, Actor, Beat, Word, FPS, clamp01, sm, noise, hash } from "../../lib/acting";
import { headCenter, handPoint, Limb, Pose, CharSpec, OUTLINE } from "../../lib/toon2";
import { SU, ToonCard } from "../../lib/toonCard";
import { Reel, SceneDef, SetLike, Ctx, Key, handWorld, V3 } from "../../lib/scene";
import { KedaiSet } from "./kedai";
import { BAPAK, ISTRI, BARISTA, BERJAS, KRITIKUS, TETANGGA1, TETANGGA2, ANTRE } from "./cast";
import { CoffeeCup, Sachet, Phone, drawHeadGlow, drawGlasses, drawTie, drawChalk, drawNotebook } from "./props";
import { TEX, SpritePool, burst, LatteArt, Stream, drawTears, drawShockLines, drawSpeedLines, drawSparkles, drawSpray, drawFlyingSweat, drawZzz, drawCat, easeOutBack } from "./fx";
import { canvasTex } from "../ketindihan2/sets";

// ---------------- small helpers ----------------
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const at = (t: number, a: number, b: number) => sm((t - a) / (b - a));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const SC = 0.88, SB = 1.0;
const scl = (S: CharSpec) => (S === BAPAK ? SB : S === BERJAS ? 0.95 : SC);
type Ex = (g: CanvasRenderingContext2D, P: Pose) => void;
const both = (...f: (Ex | undefined | false)[]): Ex => (g, P) => f.forEach((x) => x && x(g, P));
const say = (text: string, t0: number, t1: number, stress: number[] = []): Word[] => {
  const ws = text.split(" "), tot = ws.reduce((s, w) => s + w.length + 2, 0); let c = t0;
  return ws.map((w, i) => { const d = ((w.length + 2) / tot) * (t1 - t0), o = { w, t0: c, t1: c + d * 0.92, stress: stress.includes(i) }; c += d; return o; });
};
const actor = (seed: number, beats: Beat[], words: Word[] = []): Actor => ({ seed, beats, words });
const cardPt = (c: ToonCard, x: number, y: number) => { c.mesh.updateMatrixWorld(); return c.mesh.localToWorld(V((x - 300) * SU, (975 - y) * SU, 0)); };
const mouthPt = (c: ToonCard, S: CharSpec, P: Pose) => { const [x, y] = headCenter(S, P); return cardPt(c, x, y + S.R * 0.5); };
const camDir = (cam: THREE.Camera, x: number, z: number) => V(cam.position.x - x, 0, cam.position.z - z).normalize();
const yawTo = (cam: THREE.Camera, x: number, z: number) => Math.atan2(cam.position.x - x, cam.position.z - z);
const put = (c: ToonCard, S: CharSpec, P: Pose, x: number, z: number, cx: Ctx, sc = scl(S), y = 0, extra?: Ex) => c.update(S, P, x, z, cx.cam, cx.set.sunDir, sc, y, extra);
const setArm = (P: Pose, i: 0 | 1, L: Limb, u = 1): Pose => { if (u <= 0) return P; const A = P.arms[i], M: Limb = { a: [lerp(A.a[0], L.a[0], u), lerp(A.a[1], L.a[1], u)], b: [lerp(A.b[0], L.b[0], u), lerp(A.b[1], L.b[1], u)] }; return { ...P, arms: (i ? [P.arms[0], M] : [M, P.arms[1]]) as [Limb, Limb] }; };
const eyesShut = (P: Pose, u = 1): Pose => (u < 0.5 ? P : { ...P, eyes: [{ kind: "closed" }, { kind: "closed" }] });
const withMouth = (P: Pose, kind: Pose["mouth"]["kind"], open = 0.5): Pose => ({ ...P, mouth: { kind, open } });
const withEyes = (P: Pose, kind: Pose["eyes"][0]["kind"], extra: Partial<Pose["eyes"][0]> = {}): Pose => ({ ...P, eyes: [{ kind, ...extra }, { kind, ...extra }] });
/** move hand i so that, seen from the camera, it lands on `target`; w 0..1 blends the reach in */
const reach = (c: ToonCard, S: CharSpec, P: Pose, i: 0 | 1, target: THREE.Vector3 | ((c: ToonCard) => THREE.Vector3), x: number, z: number, cx: Ctx, sc = scl(S), y = 0, extra?: Ex, w = 1): Pose => {
  put(c, S, P, x, z, cx, sc, y, extra); if (w <= 0.001) return P;
  const T = typeof target === "function" ? target(c) : target, cam = cx.cam.position, n = camDir(cx.cam, x, z), right = V(n.z, 0, -n.x), u = SU * sc;
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
// ---- goofy acting layer (on top of the calm acting engine) ----
/** never still: breathing, weight shifts, head bob */
const life = (P: Pose, t: number, seed: number, k = 1): Pose => { const s = seed * 1.7, w = 2 * Math.PI;
  return { ...P, bob: P.bob + 4 * k * Math.sin(t * w * 0.9 + s), body: { ...P.body, sy: P.body.sy * (1 + 0.02 * k * Math.sin(t * w * 0.9 + s + 1)), lean: P.body.lean + 0.03 * k * Math.sin(t * w * 0.45 + s) },
    head: { ...P.head, rot: P.head.rot + 0.05 * k * Math.sin(t * w * 0.6 + s * 2), dy: P.head.dy + 3 * k * Math.sin(t * w * 1.1 + s) } }; };
/** belly laugh: knees pump, body rocks, head swings */
const laughing = (P: Pose, t: number, k = 1): Pose => { const w = 2 * Math.PI * 2.4, b = Math.sin(w * t), up = Math.max(0, Math.sin(w * t / 2)), up2 = Math.max(0, -Math.sin(w * t / 2));
  const legs: [Limb, Limb] = [{ a: [-8 - 34 * up * k, 118 - 52 * up * k], b: [-4 - 44 * up * k, -96 * up * k] }, { a: [8 + 34 * up2 * k, 118 - 52 * up2 * k], b: [4 + 44 * up2 * k, -96 * up2 * k] }];
  return { ...P, legs, bob: P.bob - 14 * k * Math.abs(b), body: { ...P.body, bend: P.body.bend + k * (12 + 12 * b), lean: P.body.lean + k * 0.13 * Math.sin(w * t / 2), sy: P.body.sy * (1 - 0.05 * k * Math.abs(b)) },
    head: { ...P.head, rot: P.head.rot + k * 0.2 * Math.sin(w * t / 2), dy: P.head.dy - 12 * k * Math.abs(b) }, eyes: k > 0.5 ? [{ kind: "happy" }, { kind: "happy" }] : P.eyes, mouth: k > 0.5 ? { kind: "laugh", open: 0.85 + 0.15 * Math.abs(b) } : P.mouth }; };
/** a bouncy walk: stride + bob + head sway; ph in cycles */
const walk = (P: Pose, ph: number, amp = 1, bounce = 1): Pose => {
  const a0 = ph * Math.PI * 2;
  const legs = [0, 1].map((k) => { const s = k ? 1 : -1, a = a0 + k * Math.PI, sw = Math.cos(a), lift = Math.max(0, Math.sin(a)); return { a: [s * 5 + 18 * sw * amp, 118 - 30 * lift * amp], b: [s * 3 + 40 * sw * amp, -60 * lift * amp] } as Limb; }) as [Limb, Limb];
  const arms = P.arms.map((A, k) => { const sw = Math.cos(a0 + (1 - k) * Math.PI) * amp; return { a: [A.a[0] + 14 * sw, A.a[1]], b: [A.b[0] + 34 * sw, A.b[1] - 8 * Math.abs(sw)] } as Limb; }) as [Limb, Limb];
  return { ...P, legs, arms, bob: P.bob - (8 + 10 * bounce) * Math.abs(Math.sin(a0)) * amp, body: { ...P.body, lean: P.body.lean + 0.05 * amp, sy: P.body.sy * (1 + 0.04 * bounce * amp * Math.cos(2 * a0)) }, head: { ...P.head, rot: P.head.rot + 0.07 * amp * Math.sin(a0) } };
};
/** a hop: height (m) over [t0, t0 + dur] plus squash before and after */
const hopY = (t: number, t0: number, dur: number, h: number) => { const u = (t - t0) / dur; return u <= 0 || u >= 1 ? 0 : h * 4 * u * (1 - u); };
const squash = (P: Pose, k: number): Pose => ({ ...P, body: { ...P.body, sy: P.body.sy * (1 - 0.14 * k), sx: P.body.sx * (1 + 0.1 * k) }, bob: P.bob + 18 * k });
/** seated: the hips at the seat (a solid table hides the legs) */
const sitY = (S: CharSpec, sc: number, seat = 0.48) => seat - S.legLen * SU * sc;
const SIT_LEGS: [Limb, Limb] = [{ a: [-14, 60], b: [-30, -40] }, { a: [14, 60], b: [30, -40] }];
const seated = (P: Pose): Pose => ({ ...P, legs: SIT_LEGS });
const drawTwoFingers = (g: CanvasRenderingContext2D, x: number, y: number) => {
  g.save(); g.fillStyle = "#fbf9f6"; g.strokeStyle = OUTLINE; g.lineWidth = 5;
  for (const [dx, a] of [[-9, -0.28], [9, 0.28]] as [number, number][]) { g.save(); g.translate(x + dx * 0.6, y - 6); g.rotate(a); g.beginPath(); g.roundRect(-6.5, -50, 13, 50, 6.5); g.fill(); g.stroke(); g.restore(); }
  g.fillStyle = OUTLINE; g.beginPath(); g.arc(x, y, 17, 0, Math.PI * 2); g.fill(); g.restore();
};
const drawFinger = (g: CanvasRenderingContext2D, x: number, y: number, a = 0) => { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = "#fbf9f6"; g.strokeStyle = OUTLINE; g.lineWidth = 5; g.beginPath(); g.roundRect(-6.5, -52, 13, 52, 6.5); g.fill(); g.stroke(); g.fillStyle = OUTLINE; g.beginPath(); g.arc(0, 0, 17, 0, Math.PI * 2); g.fill(); g.restore(); };
const head = (S: CharSpec, P: Pose) => headCenter(S, P);
const glowEx = (S: CharSpec, k: number, t: number): Ex => (g, P) => { const [x, y] = head(S, P); drawHeadGlow(g, x, y, S.R, k, t); };
const glassesEx: Ex = (g, P) => { const [x, y] = head(KRITIKUS, P); drawGlasses(g, x, y + KRITIKUS.R * 0.02, KRITIKUS.R, P.head.rot); };
const tieEx: Ex = (g, P) => { const [x, y] = head(BERJAS, P); drawTie(g, x + P.body.lean * 120, y + BERJAS.R * 1.02, 118); };
const tearsEx = (S: CharSpec, t: number, k = 1): Ex => (g, P) => { const [x, y] = head(S, P); drawTears(g, x, y, S.R, t, k); };
const shockEx = (S: CharSpec, k: number): Ex => (g, P) => { const [x, y] = head(S, P); drawShockLines(g, x, y - S.R * 0.1, S.R, k); };
const sweatEx = (S: CharSpec, t: number, k = 1): Ex => (g, P) => { const [x, y] = head(S, P); drawFlyingSweat(g, x, y, S.R, t, k); };
const sparkEx = (S: CharSpec, t: number, k: number): Ex => (g, P) => { const [x, y] = head(S, P); drawSparkles(g, x, y - S.R * 0.1, S.R, t, k); };
const blushEx = (S: CharSpec, k: number, col = "220,60,60"): Ex => (g, P) => { if (k <= 0.01) return; const [x, y] = head(S, P); g.save(); g.globalCompositeOperation = "source-atop"; const gr = g.createRadialGradient(x, y, 0, x, y, S.R * 1.1); gr.addColorStop(0, `rgba(${col},${0.55 * k})`); gr.addColorStop(1, `rgba(${col},${0.15 * k})`); g.fillStyle = gr; g.fillRect(x - S.R * 1.3, y - S.R * 1.3, S.R * 2.6, S.R * 2.6); g.restore(); };
const tent = (txt: string, col: string) => {
  const tex = canvasTex(256, 128, (g) => { g.fillStyle = "#fbf7ec"; g.fillRect(0, 0, 256, 128); g.strokeStyle = col; g.lineWidth = 8; g.strokeRect(8, 8, 240, 112); g.fillStyle = col; g.font = "bold 66px 'Helvetica Neue', Arial"; g.textAlign = "center"; g.fillText(txt, 128, 88); });
  const G = new THREE.Group(), geo = new THREE.PlaneGeometry(0.13, 0.065); geo.translate(0, 0.0325, 0);
  const f = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 })); f.position.z = 0.012; f.rotation.x = -0.36; f.castShadow = true;
  const b = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: "#efe8d6", roughness: 0.8 })); b.position.z = -0.012; b.rotation.set(0.36, Math.PI, 0); b.castShadow = true;
  G.add(f, b); return G;
};
const sticker = () => { const tex = canvasTex(160, 96, (g) => { g.fillStyle = "#fff6d8"; g.fillRect(0, 0, 160, 96); g.fillStyle = "#b0302a"; g.font = "bold 46px 'Helvetica Neue', Arial"; g.textAlign = "center"; g.fillText("50.000", 80, 64); g.fillStyle = "rgba(200,200,190,0.6)"; g.fillRect(0, 0, 160, 10); });
  return new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.036), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 })); };
const pageTex = (name: string, n: number) => canvasTex(256, 320, (g) => { g.fillStyle = "#f6f3ea"; g.fillRect(0, 0, 256, 320); g.fillStyle = "#c0392b"; g.fillRect(0, 0, 256, 70); g.fillStyle = "#fff"; g.font = "bold 40px 'Helvetica Neue', Arial"; g.textAlign = "center"; g.fillText(name, 128, 52); g.fillStyle = "#2a2a2a"; g.font = "bold 170px 'Helvetica Neue', Arial"; g.fillText(String(n), 128, 250); g.strokeStyle = "rgba(0,0,0,0.15)"; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(0, 6); g.lineTo(256, 6); g.stroke(); });
const boxTex = canvasTex(256, 192, (g) => { g.fillStyle = "#c79a5e"; g.fillRect(0, 0, 256, 192); g.fillStyle = "#3a2410"; g.font = "bold 30px Arial"; g.textAlign = "center"; g.fillText("CANGKIR", 128, 70); g.fillText("KERAMIK", 128, 106); g.font = "bold 26px Arial"; g.fillText("isi 12", 128, 150); g.strokeStyle = "#3a2410"; g.lineWidth = 3; g.strokeRect(10, 10, 236, 172); g.fillStyle = "rgba(255,255,255,0.15)"; g.fillRect(0, 86, 256, 14); });
const mkBox = () => { const b = new THREE.MeshStandardMaterial({ color: "#c79a5e", roughness: 0.9 }), l = new THREE.MeshStandardMaterial({ map: boxTex, roughness: 0.9 }); const m = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.28), [b, b, b, b, l, b]); m.castShadow = m.receiveShadow = true; return m; };
const notebook3D = () => { const G = new THREE.Group(); const cov = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.22), new THREE.MeshStandardMaterial({ color: "#2a1d18", roughness: 0.55 })); cov.castShadow = true; G.add(cov); const pg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.008, 0.21), new THREE.MeshStandardMaterial({ color: "#f1ead8" })); pg.position.y = 0.006; G.add(pg); return G; };
const icedCup = () => { const G = new THREE.Group(); const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.03, 0.13, 18, 1, true), new THREE.MeshPhysicalMaterial({ color: "#f2fbff", roughness: 0.04, transparent: true, opacity: 0.32, side: THREE.DoubleSide })); gl.position.y = 0.065; gl.renderOrder = 6; G.add(gl);
  const lq = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.028, 0.1, 16), new THREE.MeshStandardMaterial({ color: "#b98a5e", roughness: 0.25 })); lq.position.y = 0.05; G.add(lq); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.2, 6), new THREE.MeshStandardMaterial({ color: "#2e7d5b" })); st.position.set(0.01, 0.13, 0); st.rotation.z = 0.15; G.add(st); return G; };

// ---------------- camera: Catmull-Rom glides sampled every frame (no stop-start at inner points) ----------------
type P3 = { pos: V3; look: V3; fov?: number };
const cr = (a: number, b: number, c: number, d: number, u: number) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
const crV = (P: V3[], s: number): V3 => { const n = P.length, i = Math.min(n - 2, Math.floor(s)), u = s - i, g = (k: number) => P[Math.max(0, Math.min(n - 1, k))]; return [0, 1, 2].map((j) => cr(g(i - 1)[j], g(i)[j], g(i + 1)[j], g(i + 2)[j], u)) as V3; };
const whip = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lin = (x: number) => x;
/** one continuous camera move through pts over [tA, tB): eased at its ends only; `shake` = handheld metres */
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

// ---------------- the set + props for a scene ----------------
type K = SetLike & { W: KedaiSet; cups: CoffeeCup[]; sachets: Sachet[]; phone: Phone; tents: THREE.Group[]; head: THREE.PointLight; flashL: THREE.PointLight; label?: THREE.Mesh;
  puff: SpritePool; star: SpritePool; drop: SpritePool; laugh: SpritePool; dirt: SpritePool; chalk: SpritePool; flash: SpritePool; fly: SpritePool; bag: SpritePool; stream: Stream; milk: Stream;
  hands: THREE.Mesh[]; arms: THREE.Mesh[]; pages: THREE.Mesh[]; boxes: THREE.Mesh[]; nb?: THREE.Group; iced?: THREE.Group; latte?: LatteArt; pitcher?: THREE.Group; extra: THREE.Object3D[] };
const kk = (s: SetLike) => s as K;
const mkSet = (mode: "day" | "night", f?: (k: K) => void) => () => {
  const W = new KedaiSet(mode), k = W as unknown as K, R = W.root; k.W = W; k.cups = []; k.sachets = []; k.tents = []; k.pages = []; k.boxes = []; k.extra = [];
  k.phone = new Phone(); k.phone.group.visible = false; R.add(k.phone.group);
  k.head = new THREE.PointLight("#ffc472", 0, 1.4, 2); R.add(k.head); k.flashL = new THREE.PointLight("#eef4ff", 0, 6, 1.5); R.add(k.flashL);
  k.puff = new SpritePool(R, TEX.puff, 40); k.star = new SpritePool(R, TEX.star, 40, true); k.drop = new SpritePool(R, TEX.drop, 40); k.laugh = new SpritePool(R, TEX.laugh, 16);
  k.dirt = new SpritePool(R, TEX.dust, 40); k.chalk = new SpritePool(R, TEX.chalk, 30); k.flash = new SpritePool(R, TEX.flash, 3, true); k.fly = new SpritePool(R, TEX.drop, 2, false, "#222222"); k.bag = new SpritePool(R, TEX.bag, 2);
  k.stream = new Stream(R); k.milk = new Stream(R, "#fbf3e4", 0.95);
  k.hands = [0, 1, 2].map(() => { const h = new THREE.Mesh(new THREE.SphereGeometry(17 * SU, 20, 14), new THREE.MeshBasicMaterial({ color: OUTLINE })); h.visible = false; h.renderOrder = 10; R.add(h); return h; });
  k.arms = [0, 1].map(() => { const a = new THREE.Mesh(new THREE.CylinderGeometry(5 * SU, 5 * SU, 1, 8), new THREE.MeshBasicMaterial({ color: OUTLINE })); a.visible = false; R.add(a); return a; });
  f?.(k); return k as SetLike;
};
const addCup = (k: K, kind: "glass" | "ceramic", p: THREE.Vector3, full = true) => { const c = new CoffeeCup(kind, full); c.group.position.copy(p); c.saucer.position.copy(p); k.W.root.add(c.group, c.saucer); k.cups.push(c); return c; };
const addSachet = (k: K) => { const s = new Sachet(); s.attachStream(k.W.root); k.W.root.add(s.group); k.sachets.push(s); return s; };
const addPage = (k: K, name: string, n: number) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.33), new THREE.MeshStandardMaterial({ map: pageTex(name, n), roughness: 0.9, side: THREE.DoubleSide })); m.visible = false; m.castShadow = true; k.W.root.add(m); k.pages.push(m); return m; };
/** a page flying from the calendar (u 0..1): torn off, flutters and tumbles toward the camera */
const flyPage = (m: THREE.Mesh, u: number, cam: THREE.Camera, from = V(2.93, 1.55, 2.34), side = 1) => {
  m.visible = u > 0 && u < 1; if (!m.visible) return; const to = cam.position.clone().add(V(side * 0.5, 0.25, 0)).lerp(from, 0.15);
  m.position.copy(from).lerp(to, u * u); m.position.y += Math.sin(u * Math.PI) * 0.25; m.rotation.set(-u * 2.2, side * u * 3.2, side * u * 1.4 + 0.3 * Math.sin(u * 18));
};
/** a page crossing right in front of the camera: a wipe transition (u 0..1) */
const wipePage = (m: THREE.Mesh, u: number, cam: THREE.Camera, dir = 1) => {
  m.visible = u > 0 && u < 1; if (!m.visible) return; const f = V(0, 0, -1).applyQuaternion(cam.quaternion), r = V(1, 0, 0).applyQuaternion(cam.quaternion), up = V(0, 1, 0).applyQuaternion(cam.quaternion);
  m.position.copy(cam.position).addScaledVector(f, 0.32).addScaledVector(r, dir * lerp(-0.45, 0.45, u)).addScaledVector(up, 0.06 * Math.sin(u * 6)); m.quaternion.copy(cam.quaternion); m.rotateZ(dir * (0.6 - 1.2 * u)); m.rotateY(0.4 * Math.sin(u * 9)); m.scale.setScalar(1.6);
};
/** lift a cup to the mouth (u 0..1) and tip it (sip 0..1+): the cup sits right IN FRONT of the mouth; returns the handle point */
const cupPath = (cup: CoffeeCup, rest: THREE.Vector3, mouth: THREE.Vector3, n: THREE.Vector3, u: number, sip: number, yaw: number, right: THREE.Vector3, hand: 1 | -1 = 1) => {
  const rimY = cup.topY, m = mouth.clone().addScaledVector(n, 0.055).add(V(0, -rimY * 0.82, 0)).addScaledVector(right, -0.012 * hand), p = rest.clone().lerp(m, sm(u));
  p.y += Math.sin(Math.PI * clamp01(u)) * 0.05;
  cup.group.position.copy(p); cup.group.rotation.set(0, yaw, 0, "YXZ"); cup.group.rotateOnWorldAxis(right, 0); cup.group.rotateX(-0.95 * sip); // tip the rim toward the face
  cup.group.updateWorldMatrix(true, false);
  return cup.group.localToWorld(V(cup.kind === "ceramic" ? 0.07 * hand : 0.042 * hand, 0.036, 0));
};
/** a 3D toon hand ball sitting on the grip point, on the camera's side of the prop, so the prop is clearly HELD (never floating) */
const grip = (k: K, i: number, p: THREE.Vector3 | null, cam: THREE.Camera, sc = SC) => { const h = k.hands[i]; if (!p) { h.visible = false; return; } h.position.copy(p).addScaledVector(cam.position.clone().sub(p).normalize(), 0.03); h.scale.setScalar(sc); h.visible = true; };
/** a 3D stick arm from a to b (for close inserts where the character card itself is out of frame) */
const arm3 = (k: K, i: number, a: THREE.Vector3 | null, b?: THREE.Vector3) => { const m = k.arms[i]; if (!a || !b) { m.visible = false; return; } const d = b.clone().sub(a); m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, d.length(), 1); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); m.visible = true; };
const rightOf = (cam: THREE.Camera) => V(1, 0, 0).applyQuaternion(cam.quaternion).setY(0).normalize();

const DAY = { fog: "#efd9b6", dens: 0.009, bg: "#cfe0f2", cInf: 6, env: 0.42, exposure: 0.03, bloom: 0.7, sat: 0.2, contrast: 0.12, grade: [[0.4, 0.5, 0.58], [0.64, 0.54, 0.4], 0.32] as [V3, V3, number] };
const NIGHT = { fog: "#0a0e1a", dens: 0.03, bg: "#05070d", cInf: 5, night: true, env: 0.1, bloom: 0.95, exposure: 0.02 };

// kedai spots
const OX = 0.75, OZ = 0.34, BAR = 0.96, CUP1 = V(0.95, 0.968, 0.68);
const T1X = 2.35, T1Z = 1.12; // seated guest at table 1
const CUP_G = V(2.16, 0.746, 1.5), CUP_C = V(2.55, 0.752, 1.5), TENT_Z = 1.8;
const BOARD_C = V(-1.85, 1.62, 0.07);
const boardPt = (bx: number, by: number) => BOARD_C.clone().add(V(bx, by, 0));
// rival spots (world)
const BAR_X = -0.45, BAR_Z = 14.45, RIV_Y = 0.27, LATTE = V(-0.45, 1.345, 13.82);
const QUEUE: [number, number][] = [[2.1, 9.35], [1.65, 9.42], [1.2, 9.33], [0.75, 9.4], [0.32, 9.36]];
const Q_ACT = ANTRE.map((_, i) => actor(40 + i, [{ t: 0, mood: (["story", "neutral", "excited", "neutral", "smug"] as const)[i], arms: ([["rest", "chest"], ["clasp", "clasp"], ["rest", "hip"], ["chest", "rest"], ["hip", "rest"]] as const)[i] as unknown as ["rest", "rest"], look: "dart" }]));
const queue = (cx: Ctx, t: number, from: number, n = 5) => { for (let i = 0; i < 5; i++) { if (i >= n) { cx.card(from + i).setVisible(false); continue; } const [x, z] = QUEUE[i]; put(cx.card(from + i), ANTRE[i], life(actAt(Q_ACT[i], t + i), t, 40 + i, 1.2), x, z, cx, SC * (0.95 + 0.05 * (i % 2)), 0.12); } };

// ======================= 1. HOOK (0 - 6): sachet into a fine cup, kettle, then "50.000" on the menu, a wink =======================
const B1 = actor(31, [{ t: 0, mood: "smug", arms: ["chest", "open"], look: [0.1, 0.6] }, { t: 2.0, mood: "excited", look: [0.2, 0.5] }, { t: 2.6, mood: "smug", look: [-0.7, 0] }, { t: 3.4, mood: "neutral", arms: ["point", "rest"], look: [-0.8, 0.1] }, { t: 4.9, mood: "smug", arms: ["rest", "hip"], look: [-0.6, 0] }, { t: 5.35, mood: "wink", arms: ["rest", "hip"], look: [0.2, 0.1] }]);
const S1: SceneDef = {
  from: 0, to: 6, ...DAY,
  mk: mkSet("day", (k) => { k.W.setMenu(0.5); addCup(k, "ceramic", CUP1, false); addSachet(k); }),
  keys: [...move(0, 2.5, [{ pos: [1.05, 1.62, 2.35], look: [0.85, 1.22, 0.6], fov: 44 }, { pos: [1.0, 1.56, 2.15], look: [0.85, 1.22, 0.6], fov: 44 }]),
    ...move(2.5, 3.6, [{ pos: [1.0, 1.56, 2.15], look: [0.85, 1.22, 0.6], fov: 44 }, { pos: [-0.5, 1.55, 2.8], look: [-0.9, 1.35, 0.3], fov: 48 }, { pos: [-1.52, 1.5, 3.35], look: [-1.55, 1.33, 0.2], fov: 50 }]),
    ...move(3.6, 6, [{ pos: [-1.52, 1.5, 3.35], look: [-1.55, 1.33, 0.2], fov: 50 }, { pos: [-1.52, 1.5, 3.2], look: [-1.55, 1.34, 0.2], fov: 50 }])],
  focus: (t) => (t < 2.5 ? [0.85, 1.15, 0.6] : t < 3.6 ? [-0.9, 1.35, 0.3] : [-1.45, 1.4, 0.25]),
  act: (cx) => {
    const { t, card, cam } = cx, k = kk(cx.set), cup = k.cups[0], sa = k.sachets[0], c = card(0), kt = k.W.kettle;
    k.puff.begin(); k.chalk.begin(); k.drop.begin();
    // the sachet: wiggle, tear, pour, toss away
    const tear = at(t, 0.3, 0.55), tilt = at(t, 0.6, 0.85) * (1 - at(t, 1.3, 1.45)), pour = at(t, 0.75, 0.85) * (1 - at(t, 1.25, 1.35)), toss = at(t, 1.4, 1.75);
    sa.group.visible = toss < 1; sa.group.position.copy(CUP1).add(V(0.055 * tilt + 0.5 * toss, 0.16 - 0.02 * tilt + 0.5 * toss - 0.9 * toss * toss, 0.02 - 0.3 * toss)); sa.group.rotation.set(0, 0, 1.9 * tilt + 0.25 * Math.sin(t * 22) * (1 - at(t, 0.25, 0.3)) + 6 * toss); sa.group.updateWorldMatrix(true, false);
    sa.update(t, tear, pour, sa.group.localToWorld(V(0, 0.06, 0)), CUP1.clone().add(V(0, 0.055, 0)));
    for (const [p, a] of burst(t, 0.42, 0.5, 8, sa.group.localToWorld(V(0, 0.06, 0)), V(0.3, 1, 0.3), 0.6, 0.35, 1.2, 3)) k.drop.add(p, 0.008, 1 - a); // powder flecks at the tear
    // the kettle: lift over the cup, pour, put back
    const lift = at(t, 1.5, 1.75) * (1 - at(t, 2.35, 2.55)), kp = at(t, 1.72, 1.85) * (1 - at(t, 2.2, 2.32));
    kt.position.set(lerp(0.15, 0.27, lift), 0.96 + 0.12 * lift, lerp(-0.1, -0.07, lift)); kt.rotation.set(0, 0, -0.75 * kp); kt.updateWorldMatrix(true, false);
    const spout = kt.localToWorld(V(0.17, 0.2, 0)); k.stream.set(kp > 0.3 ? spout : null, CUP1.clone().add(V(0, 0.06, 0)), 0.0028);
    cup.coffee.visible = t > 0.95; cup.coffee.scale.setScalar(0.4 + 0.6 * at(t, 0.95, 2.2)); cup.update(t, at(t, 1.9, 2.5));
    for (const [p, a] of burst(t, 1.9, 1.1, 12, CUP1.clone().add(V(0, 0.08, 0)), V(0, 1, 0), 0.5, 0.25, -0.1, 7)) k.puff.add(p, 0.05 + 0.12 * a, 0.35 * (1 - a)); // steam burst as the water hits
    // the owner: behind the bar for the pour, then a quick tiptoe dash to the menu, writes 50.000, blows the chalk, winks
    const dash = at(t, 2.55, 3.35), x = lerp(OX, -1.1, dash), z = lerp(OZ, 0.36, dash), writing = at(t, 3.5, 4.85), p = 0.5 + 0.5 * writing; k.W.setMenu(p);
    let P = life(actAt(B1, t), t, 31);
    if (dash > 0 && dash < 1) P = walk(P, t * 3.4, 1.2, 1.5);
    const ex = both(dash > 0.05 && dash < 0.95 && ((g) => drawSpeedLines(g, 1, 1, t)), t > 3.45 && t < 4.95 && ((g, Q) => { const [hx, hy] = handPoint(BAPAK, Q, 0); drawChalk(g, hx - 4, hy - 6, -0.7); }));
    if (t < 1.45) { P = reach(c, BAPAK, P, 1, sa.group.localToWorld(V(0.042, -0.03, 0.0)), OX, OZ, cx, SB, 0, ex); P = reach(c, BAPAK, P, 0, sa.group.localToWorld(V(-0.042, 0.05, 0.0)), OX, OZ, cx, SB, 0, ex, 1 - at(t, 0.6, 0.9)); }
    else if (t < 2.6) { const w = at(t, 1.4, 1.55) * (1 - at(t, 2.45, 2.6)), tg = kt.localToWorld(V(-0.09, 0.13, 0.0)); P = reach(c, BAPAK, P, 0, tg, OX, OZ, cx, SB, 0, ex, w); grip(k, 0, w > 0.7 ? tg : null, cam, SB); }
    if (t < 1.4 || t >= 2.6) grip(k, 0, null, cam);
    if (t < 2.6) { /* behind the bar: placed by reach above */ }
    else if (t < 3.45) put(c, BAPAK, P, x, z, cx, SB, 0, ex);
    else { const wu = writing, bx = lerp(0.1, 0.36, wu), by = -0.27 + 0.03 * Math.sin(t * 26) * (wu < 1 ? 1 : 0); P = { ...P, mouth: t > 4.9 && t < 5.3 ? { kind: "oo", open: 0.7 } : P.mouth };
      P = reach(c, BAPAK, P, 0, boardPt(bx, by), x, z, cx, SB, 0, ex, 1 - at(t, 4.9, 5.2));
      if (wu > 0 && wu < 1) for (const [q, a] of burst(t, Math.floor(t * 10) / 10, 0.4, 3, boardPt(bx, by).add(V(0, 0, 0.02)), V(0.2, -1, 0.5), 0.5, 0.12, 0.4, Math.floor(t * 10))) k.chalk.add(q, 0.015 + 0.02 * a, 0.7 * (1 - a));
      for (const [q, a] of burst(t, 4.95, 1.0, 16, boardPt(0.2, -0.25).add(V(0.05, 0, 0.05)), V(-0.6, 0.3, 0.8), 0.5, 0.35, -0.05, 21)) k.chalk.add(q, 0.03 + 0.1 * a, 0.75 * (1 - a)); }
    void cam; k.puff.end(); k.chalk.end(); k.drop.end();
  },
};

// ======================= 2. CONTEXT (6 - 13.5): the quiet kedai, whip across the road, inside the busy rival =======================
const B2 = actor(33, [{ t: 0, mood: "worried", arms: ["chest", "clasp"], look: [0.5, 0.3] }, { t: 1.1, mood: "neutral", arms: ["up", "up"], look: [0, 0] }, { t: 1.9, mood: "worried", arms: ["chest", "clasp"], look: [-0.4, 0.2] }]);
const BAR2 = actor(48, [{ t: 0, mood: "smug", arms: ["chest", "chest"], look: [0.0, 0.6] }, { t: 1.1, mood: "excited", look: [0.3, 0.3] }]);
const PHOTO = actor(70, [{ t: 0, mood: "excited", arms: ["up", "rest"], look: [0.2, 0.5] }, { t: 1.6, mood: "laugh", look: [0, 0.2] }]);
const SELFIE = actor(71, [{ t: 0, mood: "smug", arms: ["up", "hip"], look: [0.5, -0.3] }, { t: 1.2, mood: "wink", look: [0.5, -0.3] }]);
const LAPTOP = actor(72, [{ t: 0, mood: "neutral", arms: ["clasp", "clasp"], look: [0, 0.6] }]);
const S2: SceneDef = {
  from: 6, to: 13.5, ...DAY,
  mk: mkSet("day", (k) => { k.W.setMenu(1); addCup(k, "glass", V(0.6, BAR, 0.7)); const lc = addCup(k, "ceramic", LATTE.clone()); k.latte = new LatteArt(); (lc.coffee.material as THREE.MeshPhysicalMaterial).map = k.latte.tex.tex; lc.coffee.visible = true;
    const pit = new THREE.Group(); const ch = new THREE.MeshStandardMaterial({ color: "#dfe3e8", metalness: 1, roughness: 0.15 }); const body = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.12, 24), ch); body.position.y = 0.06; pit.add(body); const sp = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 8), ch); sp.position.set(0.05, 0.11, 0); sp.rotation.z = -1.2; pit.add(sp); const hd = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 8, 16, Math.PI), ch); hd.position.set(-0.05, 0.07, 0); hd.rotation.set(0, 0, Math.PI / 2); pit.add(hd); k.W.root.add(pit); k.pitcher = pit; }),
  keys: [...move(0, 2.5, [{ pos: [0.35, 1.55, 3.1], look: [0.25, 1.2, 0.6], fov: 46 }, { pos: [0.3, 1.5, 2.8], look: [0.25, 1.2, 0.6], fov: 46 }]),
    ...move(2.5, 4.0, [{ pos: [0.3, 1.5, 2.8], look: [0.25, 1.2, 0.6], fov: 46 }, { pos: [0.6, 1.5, 3.6], look: [2.6, 1.4, 5.0], fov: 48 }, { pos: [0.6, 1.6, 4.7], look: [0.2, 2.0, 10.0], fov: 50 }], whip),
    ...move(4.0, 4.75, [{ pos: [0.6, 1.6, 4.7], look: [0.2, 2.0, 10.0], fov: 50 }, { pos: [0.0, 1.65, 9.3], look: [-0.4, 1.5, 13.8], fov: 46 }, { pos: [-0.33, 1.78, 12.6], look: [-0.45, 1.44, 13.82], fov: 44 }], whip),
    ...move(4.75, 5.95, [{ pos: [-0.33, 1.78, 12.6], look: [-0.45, 1.44, 13.82], fov: 44 }, { pos: [-0.35, 1.76, 12.72], look: [-0.45, 1.45, 13.84], fov: 44 }]),
    ...move(5.95, 7.5, [{ pos: [0.6, 1.75, 10.6], look: [-0.6, 1.45, 13.3], fov: 50 }, { pos: [0.65, 1.75, 10.65], look: [0.5, 1.5, 13.2], fov: 50 }, { pos: [0.7, 1.75, 10.7], look: [1.9, 1.55, 12.6], fov: 50 }])],
  focus: (t) => (t < 2.5 ? [0.2, 1.2, 0.6] : t < 4 ? [0.2, 2.0, 10] : t < 5.95 ? [-0.45, 1.36, 13.82] : [0.6, 1.45, 13.0]),
  act: (cx) => {
    const { t, card } = cx, k = kk(cx.set); k.puff.begin(); k.star.begin(); k.flash.begin(); k.fly.begin(); k.cups[0].update(t, 0.2); k.cups[1].update(t, 0.5); k.flashL.intensity = 0;
    // the quiet kedai: owner polishes a glass and yawns, the cat sleeps, a fly circles
    let P = life(actAt(B2, t), t, 33, 1.3); const yawn = at(t, 1.1, 1.3) * (1 - at(t, 1.8, 2.0));
    if (yawn > 0.1) P = withEyes(withMouth(P, "laugh", 1), "squeeze"); P = { ...P, head: { ...P.head, rot: P.head.rot - 0.15 * yawn, dy: P.head.dy - 10 * yawn } };
    const X2 = 0.55, rub = V(X2 + 0.05 + 0.04 * Math.cos(t * 9), 1.18 + 0.03 * Math.sin(t * 9), OZ + 0.25);
    k.cups[0].group.position.copy(rub).add(V(0, -0.05, 0.03)); k.cups[0].saucer.visible = false;
    P = reach(card(0), BAPAK, P, 0, rub, X2, OZ, cx, SB, 0, undefined, 1 - yawn); card(0).setVisible(t < 2.9);
    card(1).custom((g) => { drawCat(g, t); drawZzz(g, 160, 700, t); }, 0.0, 0.88, cx.cam, cx.set.sunDir, 0.42, BAR); card(1).contact.visible = false; card(1).setVisible(t < 2.9);
    const fa = t * 3.1; if (t < 2.9) k.fly.add(V(0.45 + 0.35 * Math.cos(fa), 1.65 + 0.1 * Math.sin(fa * 2.3), OZ + 0.3 + 0.25 * Math.sin(fa)), 0.012, 1);
    // across the road: the queue, the barista at work, the latte art, a photo with flash, a selfie at the ring light, a laptop
    queue(cx, t, 2);
    const art = at(t, 4.85, 5.85); k.latte!.draw(art);
    let Bp = life(actAt(BAR2, t - 4), t, 48); const pit = k.pitcher!, pour = at(t, 4.8, 5.0) * (1 - at(t, 5.85, 6.05));
    pit.position.copy(LATTE).add(V(0.09 - 0.03 * art, 0.11 + 0.05 * (1 - pour), 0.02)); pit.rotation.set(0, Math.PI, 0.9 * pour); pit.updateWorldMatrix(true, false);
    k.milk.set(pour > 0.4 ? pit.localToWorld(V(0.07, 0.125, 0)) : null, LATTE.clone().add(V(0, 0.062, 0)), 0.005);
    const pg = pit.localToWorld(V(-0.08, 0.07, 0)); Bp = reach(card(7), BARISTA, Bp, 1, pg, BAR_X, BAR_Z, cx, SC, RIV_Y); grip(k, 0, t > 4.75 && t < 5.95 ? pg : null, cx.cam);
    // steam wand hiss
    for (const [p, a] of burst(t, Math.floor(t * 4) / 4, 0.6, 5, V(1.25, 1.42, 13.85), V(0.1, 1, -0.2), 0.4, 0.4, -0.2, Math.floor(t * 4))) k.puff.add(p, 0.04 + 0.1 * a, 0.22 * (1 - a));
    // the photo customer at the bar (flash at 6.35), the selfie girl, the laptop guy
    const ph = k.phone; ph.group.visible = t > 5.9; const PHP = V(-0.5, 1.55, 13.45);
    if (t > 5.9) { ph.group.position.copy(PHP); ph.group.rotation.set(-0.9, Math.PI, 0); ph.group.updateWorldMatrix(true, false); ph.draw("camera", t, k.W.menu.c); }
    const fl = t > 6.35 && t < 6.47 ? 1 : 0; k.flashL.position.copy(PHP).add(V(0, 0, 0.1)); k.flashL.intensity = 2.5 * fl; if (fl) k.flash.add(PHP.clone().add(V(0, -0.02, -0.03)), 0.1, 0.7);
    let Pp = life(actAt(PHOTO, t - 5.9), t, 70, 1.2); Pp = reach(card(8), ANTRE[1], Pp, 0, PHP.clone().add(V(0.03, -0.05, 0)), -0.8, 13.2, cx, SC, RIV_Y); grip(k, 1, t > 5.95 ? PHP.clone().add(V(0.03, -0.05, 0)) : null, cx.cam);
    let Ps = life(actAt(SELFIE, t - 5.9), t, 71, 1.4); Ps = { ...Ps, bob: Ps.bob - 8 * Math.abs(Math.sin(t * 6)) };
    put(card(9), TETANGGA2, Ps, 1.9, 12.6, cx, SC, RIV_Y, (g, Q) => { const [hx, hy] = handPoint(TETANGGA2, Q, 0); g.save(); g.fillStyle = "#2b2e35"; g.strokeStyle = OUTLINE; g.lineWidth = 5; g.beginPath(); g.roundRect(hx - 24, hy - 70, 48, 86, 8); g.fill(); g.stroke(); g.fillStyle = OUTLINE; g.beginPath(); g.arc(hx, hy, 17, 0, Math.PI * 2); g.fill(); g.restore(); drawFinger(g, handPoint(TETANGGA2, Q, 1)[0], handPoint(TETANGGA2, Q, 1)[1], 0.2); });
    put(card(10), ANTRE[4], { ...life(actAt(LAPTOP, t), t, 72), arms: [{ a: [40, 90], b: [-30 + 8 * Math.sin(t * 20), 100] }, { a: [-40, 90], b: [30 + 8 * Math.sin(t * 23 + 1), 100] }] }, 2.6, 11.4, cx, SC, RIV_Y);
    card(7).setVisible(t > 2.6); for (const i of [8, 9, 10]) card(i).setVisible(t > 5.95);
    for (let i = 2; i < 7; i++) card(i).setVisible(t > 2.6 && t < 4.9);
    k.puff.end(); k.star.end(); k.flash.end(); k.fly.end();
  },
};

// ======================= 3. THE WIFE LAUGHS (13.5 - 18.5): knees up, slaps the bar, tears, chokes; he pats her back =======================
const IX = -0.72, IZ = 1.4;
const W3 = actor(34, [{ t: 0, mood: "laugh", arms: ["hug", "point"] }, { t: 1.6, mood: "laugh", arms: ["hug", "point"], look: [-0.6, -0.1] }, { t: 3.1, mood: "shock", event: "shockSmall", arms: ["chest", "rest"] }, { t: 4.2, mood: "worried", arms: ["chest", "rest"], look: [0.6, 0] }],
  say("Siapa yang mau bayar lima puluh ribu buat kopi sachet?", 1.0, 3.0, [4, 8]));
const B3 = actor(35, [{ t: 0, mood: "suspicious", arms: ["chest", "chest"], look: [-0.6, 0.1] }, { t: 2.4, mood: "worried", arms: ["chest", "chest"], look: [-0.7, 0] }, { t: 3.3, mood: "surprised", arms: ["rest", "rest"], look: [-0.8, 0] }]);
const S3: SceneDef = {
  from: 13.5, to: 18.5, ...DAY,
  mk: mkSet("day", (k) => { k.W.setMenu(1); addCup(k, "ceramic", CUP1); }),
  keys: [...move(0, 3.1, [{ pos: [-0.4, 1.45, 3.55], look: [-0.68, 1.25, 1.2], fov: 46 }, { pos: [-0.46, 1.45, 3.35], look: [-0.68, 1.25, 1.2], fov: 46 }]),
    ...move(3.1, 3.6, [{ pos: [-0.46, 1.45, 3.35], look: [-0.68, 1.25, 1.2], fov: 46 }, { pos: [-0.5, 1.47, 3.0], look: [-0.64, 1.32, 1.2], fov: 46 }], whip),
    ...move(3.6, 5, [{ pos: [-0.5, 1.47, 3.0], look: [-0.64, 1.32, 1.2], fov: 46 }, { pos: [-0.52, 1.47, 2.9], look: [-0.64, 1.33, 1.2], fov: 46 }])],
  focus: () => [-0.68, 1.3, 1.3],
  act: (cx) => {
    const { t, card } = cx, k = kk(cx.set); k.cups[0].update(t, 0.3); k.puff.begin();
    const choke = at(t, 3.1, 3.2), cough = t > 3.15 && t < 4.4 ? Math.max(0, Math.sin((t - 3.15) * 2 * Math.PI * 3.2)) : 0;
    let P = life(actAt(W3, t), t, 34, 1.4); if (t < 3.1) P = laughing(P, t, 1); else P = { ...P, mouth: { kind: "oo", open: 0.3 + 0.5 * cough }, body: { ...P.body, bend: P.body.bend + 14 * cough }, head: { ...P.head, dy: P.head.dy + 10 * cough, sx: P.head.sx * (1 + 0.05 * cough) } };
    const slap = t < 3.0 ? Math.max(0, Math.sin(t * 2 * Math.PI * 2.4)) : 0, bar = V(-0.58, BAR + 0.02 + 0.12 * slap, 1.0);
    const ex = both(tearsEx(ISTRI, t, t < 3.1 ? 1 : 0), shockEx(ISTRI, choke * (1 - at(t, 3.6, 3.9))), blushEx(ISTRI, at(t, 3.1, 3.4) * (1 - at(t, 4.5, 5)) * 0.9));
    P = reach(card(1), ISTRI, P, 1, bar, IX, IZ, cx, 0.86, 0, ex, t < 3.0 ? 1 : 1 - at(t, 3.0, 3.2));
    if (t > 3.15 && t < 4.4) for (const [p, a] of burst(t, 3.2 + Math.floor((t - 3.2) * 3.2) / 3.2, 0.5, 5, mouthPt(card(1), ISTRI, P).add(V(0.05, 0, 0.1)), V(1, 0.2, 0.6), 0.4, 0.6, 0.3, Math.floor(t * 3.2))) k.puff.add(p, 0.03 + 0.08 * a, 0.5 * (1 - a));
    // he rushes along behind the bar and pats her back
    const go = at(t, 3.25, 3.75), bx = lerp(OX, -0.5, go);
    let B = life(actAt(B3, t), t, 35, 1.2); if (go > 0 && go < 1) B = walk(B, t * 3, 1, 1.2);
    const pat = t > 3.8 ? Math.max(0, Math.sin((t - 3.8) * 2 * Math.PI * 3)) : 0;
    B = reach(card(0), BAPAK, B, 0, (cc) => cardPt(card(1), 300 + 60, 975 - 360 + 20 * pat).add(V(0, 0, 0.02)), bx, OZ + 0.08, cx, SB, 0, sweatEx(BAPAK, t, at(t, 3.2, 3.5)), at(t, 3.7, 3.9));
    void cx; k.puff.end();
  },
};

// ======================= 4. DAY 1, DAY 2, the barista's photo (18.5 - 26.5) =======================
const B4 = actor(36, [{ t: 0, mood: "worried", arms: ["chin", "chin"], look: [0.5, -0.4] }, { t: 1.6, mood: "suspicious", look: [0.3, 0.6] }, { t: 2.35, mood: "angry", arms: ["chin", "chin"] }, { t: 2.8, mood: "worried", look: [0, 0.2] }]);
const BAR4 = actor(37, [{ t: 0, mood: "smug", arms: ["rest", "rest"], look: [-0.6, 0] }, { t: 1.3, mood: "smug", arms: ["up", "hip"], look: [-0.6, -0.1] }, { t: 2.4, mood: "laugh", arms: ["up", "hip"], look: [0.3, 0.1] }]);
const PH4 = V(-0.48, 1.52, 3.38);
const S4: SceneDef = {
  from: 18.5, to: 26.5, ...DAY,
  mk: mkSet("day", (k) => { k.W.setMenu(1); addCup(k, "ceramic", CUP1); k.W.setDay("HARI", 1); addPage(k, "HARI", 1); addPage(k, "HARI", 2); }),
  keys: [...move(0, 1.05, [{ pos: [2.78, 1.5, 3.45], look: [2.93, 1.55, 2.33], fov: 38 }, { pos: [2.8, 1.52, 3.3], look: [2.93, 1.55, 2.33], fov: 38 }]),
    ...move(1.05, 3.3, [{ pos: [0.95, 1.38, 2.45], look: [0.82, 1.2, 0.5], fov: 42 }, { pos: [0.92, 1.36, 2.3], look: [0.82, 1.2, 0.5], fov: 42 }]),
    ...move(3.3, 5.0, [{ pos: [-1.6, 1.25, 4.6], look: [0.9, 1.0, 1.1], fov: 46 }, { pos: [-1.3, 1.25, 4.45], look: [0.9, 1.0, 1.1], fov: 46 }]),
    ...move(5.0, 6.6, [{ pos: [2.2, 1.55, 6.4], look: [0.2, 1.4, 3.6], fov: 46 }, { pos: [0.9, 1.6, 5.4], look: [-0.6, 1.45, 3.1], fov: 46 }]),
    ...move(6.6, 8.0, [{ pos: [-0.36, 1.54, 3.8], look: [-0.46, 1.53, 3.38], fov: 44 }, { pos: [-0.36, 1.54, 3.74], look: [-0.46, 1.53, 3.38], fov: 44 }])],
  focus: (t) => (t < 1.05 ? [2.93, 1.55, 2.33] : t < 3.3 ? [0.8, 1.2, 0.45] : t < 5 ? [0.8, 1.1, 0.6] : t < 6.6 ? [-0.6, 1.5, 3.4] : [-0.48, 1.52, 3.38]),
  act: (cx) => {
    const { t, card, cam } = cx, k = kk(cx.set); k.W.setDay("HARI", t < 0.8 ? 1 : t < 3.4 ? 2 : 2); k.puff.begin(); k.fly.begin(); k.bag.begin(); k.flash.begin(); k.laugh.begin(); k.flashL.intensity = 0;
    flyPage(k.pages[0], at(t, 0.7, 1.15) * 1.0 + (t > 1.15 ? 1 : 0) * 0, cam); wipePage(k.pages[1], clamp01((t - 3.05) / 0.4), cam, 1);
    k.cups[0].update(t, 1 - at(t, 1.2, 2.6)); k.W.setDay("HARI", t < 0.75 ? 1 : 2);
    // day 1: chin in hands, a fly lands on the cup, he blows it away
    let P = life(actAt(B4, t - 1.05), t, 36, 1.0); const blow = at(t, 2.35, 2.45) * (1 - at(t, 2.75, 2.85));
    if (blow > 0.2) P = withMouth(P, "oo", 0.8);
    const fa = (t - 1.05) * 2.6, land = at(t, 1.8, 2.1), gone = at(t, 2.45, 2.8);
    const flyP = V(0.95 + 0.25 * Math.cos(fa) * (1 - land), 1.35 * (1 - land) + 1.04 * land + 0.06 * Math.sin(fa * 2) * (1 - land), 0.7 + 0.2 * Math.sin(fa) * (1 - land)).add(V(-0.8 * gone, 0.5 * gone, 0.6 * gone));
    if (t > 1.05 && t < 3.3) { k.fly.add(flyP, 0.014, 1); for (const [p, a] of burst(t, 2.4, 0.6, 8, mouthPt(card(0), BAPAK, P).add(V(0, 0, 0.1)), V(0.3, -0.4, 1), 0.5, 0.6, 0, 9)) k.puff.add(p, 0.04 + 0.1 * a, 0.45 * (1 - a)); }
    // day 2: he naps standing, a plastic bag tumbles across the empty terrace
    if (t >= 3.3 && t < 5.0) { const nod = Math.sin((t - 3.3) * 2.2); P = { ...eyesShut(P), arms: P.arms, head: { ...P.head, rot: 0.25 + 0.06 * nod, dy: P.head.dy + 26 + 8 * nod }, mouth: { kind: "o", open: 0.2 } };
      const bu = (t - 3.3) / 1.7; k.bag.add(V(lerp(3.2, -2.4, bu), 0.14 + 0.25 * Math.abs(Math.sin(bu * 9)), 1.7 + 0.1 * Math.sin(bu * 5)), 0.28, 1, bu * 14); }
    const zz: Ex | undefined = t >= 3.3 && t < 5.0 ? (g, Q) => { const [x, y] = head(BAPAK, Q); drawZzz(g, x + 90, y - 60, t); } : undefined;
    if (t < 5.0) put(card(0), BAPAK, P, OX, OZ, cx, SB, 0, zz); else put(card(0), BAPAK, life(actAt(B4, 0.2), t, 36), OX, OZ, cx);
    // the barista crosses the road, photographs the menu with flash, grins; the screen gets a HALU stamp and laughing faces
    if (t >= 5.0) {
      const wu = at(t, 5.0, 5.9), bx = lerp(1.8, -0.75, wu), bz = lerp(4.6, 3.3, wu); let Bp = life(actAt(BAR4, t - 5.0), t, 37, 1.2); if (wu > 0 && wu < 1) Bp = walk(Bp, t * 1.9, 1, 1.4);
      const ph = k.phone; ph.group.visible = t > 6.0; const raise = at(t, 6.0, 6.3), hp = V(lerp(-0.6, PH4.x, raise), lerp(1.2, PH4.y, raise), lerp(3.28, PH4.z, raise));
      ph.group.position.copy(hp); ph.group.rotation.set(0, Math.atan2(cam.position.x - hp.x, cam.position.z - hp.z), 0); if (t < 6.6) ph.group.rotateY(Math.PI); ph.group.updateWorldMatrix(true, false);
      const stamp = at(t, 6.85, 6.95), lu = clamp01((t - 7.05) / 0.9);
      ph.screen.draw("s" + Math.round(stamp * 10) + (t > 6.6 ? "b" : "a"), (g, w, h) => { g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.drawImage(k.W.menu.c, 10, 150, w - 20, w - 20);
        if (t > 6.6 && stamp > 0) { const s = 1 + 1.5 * (1 - stamp); g.save(); g.translate(w / 2, 330); g.rotate(-0.25); g.scale(s, s); g.globalAlpha = stamp; g.strokeStyle = "#e0262e"; g.lineWidth = 12; g.strokeRect(-140, -62, 280, 124); g.fillStyle = "#e0262e"; g.font = "bold 104px Impact, 'Arial Black', Arial"; g.textAlign = "center"; g.fillText("HALU", 0, 38); g.restore(); }
        g.fillStyle = "#fff"; g.beginPath(); g.arc(w / 2, h - 90, 34, 0, Math.PI * 2); g.fill(); });
      const fl = t > 6.3 && t < 6.42 ? 1 : 0; k.flashL.position.copy(hp).add(V(0, 0, -0.15)); k.flashL.intensity = 8 * fl; if (fl) k.flash.add(hp.clone().add(V(0, 0.03, -0.05)), 0.22, 0.85);
      if (t > 7.0) for (const [p, a, i] of burst(t, 7.0, 1.0, 12, ph.group.localToWorld(V(0, 0, 0.01)), V(0, 0.4, 1).applyAxisAngle(V(0, 1, 0), Math.atan2(cam.position.x - hp.x, cam.position.z - hp.z)), 0.7, 0.45, 0.2, 41)) k.laugh.add(p, 0.022 * easeOutBack(a * 3), 1 - Math.pow(a, 3), 0.4 * Math.sin(t * 8 + i));
      void lu;
      const pg = ph.group.localToWorld(V(-0.03, -0.06, -0.01)); Bp = reach(card(1), BARISTA, Bp, 0, pg, bx, bz, cx, SC, 0, undefined, at(t, 5.9, 6.1)); grip(k, 0, t > 6.1 ? pg : null, cam);
      if (t >= 6.6) { card(1).setVisible(false); const L = ph.group.localToWorld(V(-0.042, -0.05, 0)), Rr = ph.group.localToWorld(V(0.042, -0.05, 0)); grip(k, 0, L, cam, 0.5); grip(k, 1, Rr, cam, 0.5); arm3(k, 0, L, L.clone().add(V(-0.06, -0.45, 0.05))); arm3(k, 1, Rr, Rr.clone().add(V(0.06, -0.45, 0.05))); k.arms.forEach((m) => m.scale.setX(0.5).setZ(0.5)); } else { arm3(k, 0, null); arm3(k, 1, null); grip(k, 1, null, cam); }
    } else card(1).setVisible(false);
    k.puff.end(); k.fly.end(); k.bag.end(); k.flash.end(); k.laugh.end();
  },
};

// ======================= 5. THE MAN IN THE SUIT (26.5 - 33.5) =======================
const J5 = actor(38, [{ t: 0, mood: "worried", arms: ["rest", "up"], look: [0.6, 0.2] }, { t: 0.9, mood: "worried", arms: ["rest", "rest"], look: [0.2, 0.4] }, { t: 1.6, mood: "surprised", event: "shockSmall", arms: ["rest", "point"], look: [-0.8, 0] },
  { t: 2.4, mood: "excited", arms: ["rest", "rest"], look: [-0.6, 0] }, { t: 4.1, mood: "neutral", arms: ["rest", "rest"], look: [0, 0.3] }, { t: 5.3, mood: "suspicious", look: [0, 0.1] }, { t: 5.75, mood: "surprised", look: [0, 0] }, { t: 6.15, mood: "excited", look: [0, 0] }]);
const B5 = actor(39, [{ t: 0, mood: "nervous", arms: ["clasp", "clasp"], look: [0.6, 0.2] }, { t: 6.25, mood: "excited", event: "shockSmall", arms: ["up", "up"], look: [0.7, 0] }]);
const actSuit = (cx: Ctx, tt: number, c: ToonCard, gk = 1, cup = kk(cx.set).cups[0], rest = CUP_C) => {
  const n = camDir(cx.cam, T1X, T1Z), yaw = yawTo(cx.cam, T1X, T1Z), r = rightOf(cx.cam), y = sitY(BERJAS, 0.95);
  const lift = at(tt, 4.2, 4.6) * (1 - 0.5 * at(tt, 5.2, 5.6)), sip = at(tt, 4.55, 4.8) * (1 - at(tt, 5.0, 5.2)), fing = at(tt, 6.1, 6.25), glow = at(tt, 5.4, 6.2) * gk;
  let P = seated(life(actAt(J5, tt), tt, 38, 0.8)); P = eyesShut(P, sip > 0.3 || (tt > 4.8 && tt < 5.35) ? 1 : 0);
  if (tt > 4.6 && tt < 5.3) P = { ...P, head: { ...P.head, rot: P.head.rot - 0.12 } };
  P = setArm(P, 0, { a: [-64, -8], b: [-58, -118] }, fing); if (fing > 0) P = squash(P, Math.max(0, 1 - (tt - 6.2) * 4) * (fing > 0.9 ? 1 : 0));
  const ex = both(tieEx, glowEx(BERJAS, glow, cx.t), sparkEx(BERJAS, cx.t, glow * 0.7), (g, Q) => { if (fing > 0.6) { const [x, yy] = handPoint(BERJAS, Q, 0); drawTwoFingers(g, x, yy); } }, shockEx(BERJAS, fing * (1 - at(tt, 6.3, 6.7))));
  P = reach(c, BERJAS, P, 1, () => cupPath(cup, rest.clone(), mouthPt(c, BERJAS, P), n, lift, sip, yaw, r), T1X, T1Z, cx, 0.95, y, ex, at(tt, 4.0, 4.2));
  const k = kk(cx.set); k.head.position.copy(mouthPt(c, BERJAS, P)).add(V(0, 0.3, 0)).addScaledVector(n, 0.3); k.head.intensity = glow * 0.5;
  cup.update(cx.t, 0.7); return P;
};
const S5: SceneDef = {
  from: 26.5, to: 33.5, ...DAY,
  mk: mkSet("day", (k) => { k.W.setMenu(1); addCup(k, "ceramic", CUP_C.clone()); }),
  keys: [...move(0, 2.4, [{ pos: [-1.9, 1.38, 7.55], look: [0.3, 1.3, 9.45], fov: 44 }, { pos: [-1.75, 1.38, 7.7], look: [0.2, 1.3, 9.45], fov: 44 }]),
    ...move(2.4, 4.0, [{ pos: [-2.3, 0.9, 8.5], look: [-0.1, 1.05, 8.4], fov: 54 }, { pos: [-1.9, 0.9, 5.4], look: [0.85, 1.05, 5.3], fov: 54 }, { pos: [-1.1, 0.95, 3.1], look: [1.7, 1.05, 2.3], fov: 54 }]),
    ...move(4.0, 7.0, [{ pos: [2.7, 1.32, 3.25], look: [2.38, 1.12, 1.15], fov: 42 }, { pos: [2.6, 1.3, 3.0], look: [2.37, 1.14, 1.15], fov: 42 }])],
  focus: (t) => (t < 2.4 ? [-0.15, 1.3, 9.3] : t < 4 ? [lerp(-0.1, 1.75, at(t, 2.4, 3.95)), 1.0, lerp(8.6, 2.1, at(t, 2.4, 3.95))] : [T1X, 1.2, T1Z + 0.2]),
  act: (cx) => {
    const { t, card } = cx, k = kk(cx.set), c = card(0); k.puff.begin(); k.dirt.begin();
    if (t < 2.4) { // in the rival's queue: watch, sigh, an idea
      queue(cx, t, 2); let P = life(actAt(J5, t), t, 38, 1.2); const sigh = at(t, 0.9, 1.1) * (1 - at(t, 1.4, 1.6)); P = { ...P, body: { ...P.body, sy: P.body.sy * (1 - 0.1 * sigh) }, head: { ...P.head, dy: P.head.dy + 14 * sigh } };
      for (const [p, a] of burst(t, 1.0, 0.7, 6, V(-0.15, 1.55, 9.6), V(-0.5, 0.2, -1), 0.3, 0.3, 0, 5)) k.puff.add(p, 0.05 + 0.1 * a, 0.4 * (1 - a));
      put(c, BERJAS, P, -0.25, 9.55, cx, 0.95, 0.12, both(tieEx, shockEx(BERJAS, at(t, 1.6, 1.7) * (1 - at(t, 2.0, 2.3)))));
    } else if (t < 4.0) { // crosses the road with a big goofy hop up the curb
      for (let i = 2; i < 7; i++) card(i).setVisible(false);
      const u = at(t, 2.4, 3.95), x = lerp(-0.1, 1.75, u), z = lerp(8.6, 2.1, u), hy = hopY(t, 3.35, 0.4, 0.35) + (t > 3.75 ? 0.12 * (1 - at(t, 3.75, 3.95)) : 0);
      let P = walk(life(actAt(J5, t), t, 38), t * 2.4, 1.2, 1.6); if (t > 3.3 && t < 3.4) P = squash(P, 1); if (t > 3.75 && t < 3.85) P = squash(P, 1);
      put(c, BERJAS, P, x, z, cx, 0.95, hy, both(tieEx, (g) => drawSpeedLines(g, -1, 0.8, t)));
      const st = Math.floor((t - 2.4) * 4.8); for (const [p, a] of burst(t, 2.4 + st / 4.8, 0.5, 4, V(lerp(-0.1, 1.75, at(2.4 + st / 4.8, 2.4, 3.95)), 0.05, lerp(8.6, 2.1, at(2.4 + st / 4.8, 2.4, 3.95))), V(0, 1, 0), 0.8, 0.3, 0.4, st)) k.dirt.add(p, 0.05 + 0.12 * a, 0.5 * (1 - a));
    } else { // seated at table 1: sip ... silence ... glow ... two fingers
      actSuit(cx, t, c);
      let B = life(actAt(B5, t), t, 39); const hop = hopY(t, 6.3, 0.35, 0.18); if (t > 6.3) B = laughing(B, t, 0.5);
      put(card(1), BAPAK, B, OX, OZ, cx, SB, hop, sweatEx(BAPAK, t, 1 - at(t, 6.0, 6.3)));
    }
    k.puff.end(); k.dirt.end();
  },
};

// ======================= 6. GOSSIP (33.5 - 38): two ladies by the rival's planter; the "fake smile" gag, no bubbles =======================
const L1 = actor(50, [{ t: 0, mood: "whisper", arms: ["rest", "mouthHand"], look: [-0.8, 0], lean: 0.1 }, { t: 1.8, mood: "smug", arms: ["rest", "chest"], look: [0.7, 0] }, { t: 2.6, mood: "laugh", arms: ["hug", "chest"], look: [0.6, 0] }], say("itu cuma gengsi", 0.2, 1.4, [2]));
const L2 = actor(51, [{ t: 0, mood: "suspicious", arms: ["chest", "rest"], look: [-0.8, 0], lean: -0.06 }, { t: 1.6, mood: "neutral", arms: ["mouthHand", "mouthHand"], look: [0, 0] }, { t: 3.2, mood: "smug", arms: ["hip", "hip"], look: [-0.6, 0], nod: 0.8 }]);
const S6: SceneDef = {
  from: 33.5, to: 38, ...DAY,
  mk: mkSet("day", (k) => { for (const o of k.W.root.children) if (Math.abs(o.position.x - 3.4) < 0.05 && Math.abs(o.position.z - 9.0) < 0.05) o.visible = false; /* the white scooter would sit half in frame */ const pl = new THREE.Group(); pl.position.set(3.85, 0.12, 7.85); k.W.root.add(pl); pl.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.5, 20), new THREE.MeshStandardMaterial({ color: "#3a3d42", roughness: 0.5 })).translateY(0.25));
    const lm = new THREE.MeshStandardMaterial({ color: "#3c7a3f", side: THREE.DoubleSide, roughness: 0.6 }); for (let i = 0; i < 14; i++) { const a = hash(i) * 6.28, L = 0.25 + hash(i + 3) * 0.3; const m = new THREE.Mesh(new THREE.PlaneGeometry(0.08, L), lm); m.position.set(Math.cos(a) * 0.12, 0.5 + L / 2, Math.sin(a) * 0.12); m.rotation.set(0.35 * Math.cos(a), a, 0.35 * Math.sin(a)); m.castShadow = true; pl.add(m); }
    k.iced = icedCup(); k.W.root.add(k.iced); }),
  keys: move(0, 4.5, [{ pos: [4.1, 1.5, 7.1], look: [2.65, 1.3, 9.1], fov: 46 }, { pos: [4.02, 1.5, 7.2], look: [2.65, 1.3, 9.1], fov: 46 }], sm, 0.012),
  focus: () => [2.8, 1.3, 9.1],
  act: (cx) => {
    const { t, card } = cx, k = kk(cx.set);
    let A = life(actAt(L1, t), t, 50, 1.2); if (t > 2.6) A = laughing(A, t, 0.6);
    A = reach(card(0), TETANGGA1, A, 0, (cc) => { const hp = cardPt(cc, 230, 760); k.iced!.position.copy(hp).add(V(0, -0.05, 0.05)); return hp; }, 2.35, 9.15, cx, 0.86, 0.12, undefined, t < 1.7 ? 1 : 1);
    // the fake smile: both hands push the mouth corners up, dead eyes, then she lets go and nods
    let B = life(actAt(L2, t), t, 51, 1.1); const fake = at(t, 1.7, 1.85) * (1 - at(t, 3.0, 3.15));
    if (fake > 0.3) B = { ...B, mouth: { kind: "smileBig", open: 0.35, w: 1.3 }, eyes: [{ kind: "open", lid: 0.5 }, { kind: "open", lid: 0.5 }], head: { ...B.head, sx: B.head.sx * 1.04, rot: 0.05 * Math.sin(t * 9) } };
    if (fake > 0.3) { B = reach(card(1), TETANGGA2, B, 0, (cc) => { const [hx, hy] = head(TETANGGA2, B); return cardPt(cc, hx - TETANGGA2.R * 0.45, hy + TETANGGA2.R * 0.42); }, 2.95, 9.0, cx, 0.86, 0.12); B = reach(card(1), TETANGGA2, B, 1, (cc) => { const [hx, hy] = head(TETANGGA2, B); return cardPt(cc, hx + TETANGGA2.R * 0.45, hy + TETANGGA2.R * 0.42); }, 2.95, 9.0, cx, 0.86, 0.12); }
    else put(card(1), TETANGGA2, B, 2.95, 9.0, cx, 0.86, 0.12);
    queue(cx, t, 2, 3);
  },
};

// ======================= 7. WEEK 1 -> MONTH 2 (38 - 45): he brings friends, a small queue, the box catch, the barista's cap pops =======================
const J7 = actor(52, [{ t: 0, mood: "excited", arms: ["point", "rest"], look: [-0.6, 0] }, { t: 1.2, mood: "story", arms: ["open", "rest"], look: [0.5, 0] }]);
const F7 = actor(53, [{ t: 0, mood: "surprised", arms: ["rest", "rest"], look: [-0.5, 0.1] }, { t: 1.0, mood: "excited", look: [-0.6, 0] }]);
const B7 = actor(54, [{ t: 0, mood: "excited", arms: ["up", "rest"], look: [0.6, 0] }, { t: 2.6, mood: "excited", arms: ["clasp", "clasp"], look: [0.5, 0.2] }, { t: 3.2, mood: "shock", event: "shockSmall", arms: ["open", "open"], look: [-0.3, -0.3] }, { t: 3.9, mood: "nervous", arms: ["clasp", "clasp"], look: [0, -0.4], sweat: true }]);
const BAR7 = actor(55, [{ t: 0, mood: "suspicious", arms: ["clasp", "clasp"], look: [0, 0] }, { t: 0.55, mood: "shock", event: "shock", arms: ["rest", "rest"], look: [0, 0] }]);
const SLOW7 = 1.6, D7 = 2.3 * (SLOW7 - 1); // month 2 plays 1.6x slower (user: too fast)
const S7: SceneDef = {
  from: 38, to: 45 + D7, ...DAY,
  mk: mkSet("day", (k) => { k.W.setMenu(1, 7); k.W.setDay("MINGGU", 1); for (const [n, d] of [["HARI", 3], ["HARI", 5], ["HARI", 6], ["MINGGU", 1]] as [string, number][]) addPage(k, n, d); for (let i = 0; i < 3; i++) { const b = mkBox(); k.W.root.add(b); k.boxes.push(b); } addCup(k, "ceramic", V(0.55, BAR + 0.008, 0.72)); addCup(k, "ceramic", V(1.1, BAR + 0.008, 0.72)); }),
  keys: [...move(0, 1.0, [{ pos: [2.78, 1.5, 3.45], look: [2.93, 1.55, 2.33], fov: 38 }, { pos: [2.8, 1.52, 3.32], look: [2.93, 1.55, 2.33], fov: 38 }]),
    ...move(1.0, 3.3, [{ pos: [0.2, 1.5, 4.4], look: [2.2, 1.15, 1.5], fov: 48 }, { pos: [0.45, 1.5, 4.2], look: [2.0, 1.15, 1.4], fov: 48 }]),
    ...move(3.3, 5.6 + D7, [{ pos: [0.38, 1.5, 5.3], look: [0.42, 1.15, 1.2], fov: 60 }, { pos: [0.38, 1.5, 5.1], look: [0.42, 1.15, 1.2], fov: 60 }]),
    ...move(5.6 + D7, 5.95 + D7, [{ pos: [0.38, 1.5, 5.1], look: [0.42, 1.15, 1.2], fov: 60 }, { pos: [0.7, 1.55, 3.0], look: [0.5, 1.6, 11.3], fov: 16 }], whip),
    ...move(5.95 + D7, 7.0 + D7, [{ pos: [0.7, 1.55, 3.0], look: [0.5, 1.6, 11.3], fov: 16 }, { pos: [0.7, 1.55, 3.05], look: [0.5, 1.62, 11.3], fov: 15 }])],
  focus: (t) => (t < 1 ? [2.93, 1.55, 2.33] : t < 3.3 ? [2.4, 1.2, 1.9] : t < 5.6 + D7 ? [0.3, 1.2, 1.4] : [0.5, 1.6, 11.3]),
  act: (cx) => {
    const { t: tr, card, cam } = cx, k = kk(cx.set); k.puff.begin(); k.dirt.begin();
    const t = tr < 3.3 ? tr : tr < 3.3 + 2.3 * SLOW7 ? 3.3 + (tr - 3.3) / SLOW7 : tr - D7;
    k.W.setDay(t < 3.4 ? "MINGGU" : "BULAN", t < 3.4 ? 1 : 2); k.cups.forEach((c, i) => c.update(t + i, 0.8));
    for (let i = 0; i < 3; i++) flyPage(k.pages[i], clamp01((t - 0.05 - i * 0.22) / 0.45), cam, V(2.93, 1.55, 2.34), i % 2 ? -1 : 1); wipePage(k.pages[3], clamp01((t - 3.05) / 0.4), cam, -1);
    for (let i = 0; i < 12; i++) card(i).setVisible(false);
    if (t < 3.3) { // the man in the suit marches his friends in and points at the kedai like a tour guide
      const u = at(t, 1.0, 2.6); for (let i = 0; i < 3; i++) { const S = i ? (i === 1 ? ANTRE[2] : ANTRE[1]) : BERJAS, x = lerp(3.4 + i * 0.55, 1.6 + i * 0.55, u), z = 2.0 + i * 0.05; let P = life(actAt(i ? F7 : J7, t - 1), t, 52 + i, 1.2); if (u > 0 && u < 1) P = walk(P, t * 2.2 + i * 0.3, 1, 1.3);
        put(card(i), S, P, x, z, cx, i ? SC : 0.95, 0, i ? undefined : tieEx); }
      let B = life(actAt(B7, t), t, 54, 1.3); const wave = Math.sin(t * 14) * 30; B = setArm(B, 0, { a: [-90 + wave * 0.3, -60], b: [-110 + wave, -170] }, at(t, 1.3, 1.5)); put(card(3), BAPAK, B, OX, OZ, cx);
    } else if (t < 5.6) { // month 2: a queue, the courier's wobbling stack, the catch over the bar
      const qx = [0.95, 1.0, 1.05], qs = [ANTRE[0], ANTRE[3], TETANGGA1]; qx.forEach((x, i) => put(card(4 + i), qs[i], life(actAt(Q_ACT[i], t), t, 60 + i, 1.4), x, 1.35 + 0.4 * i, cx, SC * 0.97)); // a line running toward us, so all three fit the frame
      const cu = at(t, 3.3, 4.2), cxp = lerp(-2.2, -0.32, cu), wob = Math.sin(t * 11) * (0.04 + 0.06 * at(t, 3.9, 4.3)), fall = at(t, 4.25, 4.75);
      let C = life(actAt(F7, t), t, 63, 1.3); if (cu > 0 && cu < 1) C = walk(C, t * 2.2, 1, 1.2); C = { ...C, head: { ...C.head, rot: C.head.rot - wob * 2 } };
      const base = V(cxp, 0.82, 1.7); k.boxes.forEach((b, i) => { b.position.copy(base).add(V(wob * i * 1.5, 0.13 + i * 0.245, 0.0)); b.rotation.set(0, 0.1 * i, wob * i * 3); });
      // the top box slides off toward the bar and he catches it at the bar edge
      const top = k.boxes[2], catchP = V(0.25, BAR + 0.16, 0.95); if (fall > 0) { top.position.lerpVectors(base.clone().add(V(wob * 3, 0.62, 0)), catchP, fall); top.position.y += Math.sin(Math.PI * fall) * 0.15; top.rotation.set(0.3 * Math.sin(fall * 6), 0, -2.8 * fall + (fall >= 1 ? 2.8 : 0)); }
      C = reach(card(7), ANTRE[4], C, 0, base.clone().add(V(-0.17, 0.15, 0.02)), cxp, 1.7, cx, SC, 0, sweatEx(ANTRE[4], t, at(t, 4.0, 4.2))); C = reach(card(7), ANTRE[4], C, 1, base.clone().add(V(0.17, 0.15, 0.02)), cxp, 1.7, cx);
      const dive = at(t, 4.2, 4.6); let B = life(actAt(B7, t), t, 54, 1.4); B = { ...B, body: { ...B.body, lean: B.body.lean - 0.25 * dive } };
      const bx = lerp(OX, 0.3, dive); B = reach(card(3), BAPAK, B, 0, top.position.clone().add(V(-0.17, 0, 0.05)), bx, OZ + 0.1, cx, SB, 0.05 * dive, both(shockEx(BAPAK, at(t, 4.2, 4.3) * (1 - at(t, 4.6, 4.9))), sweatEx(BAPAK, t, at(t, 4.6, 4.8))), dive);
      if (dive > 0.5) B = reach(card(3), BAPAK, B, 1, top.position.clone().add(V(0.17, 0, 0.05)), bx, OZ + 0.1, cx, SB, 0.05 * dive);
      for (const [p, a] of burst(t, 4.75, 0.6, 8, catchP.clone(), V(0, 1, 0.5), 0.8, 0.4, 0.2, 77)) k.dirt.add(p, 0.04 + 0.1 * a, 0.45 * (1 - a));
    } else { // across the road: the barista peeking out of the window, his cap pops
      for (const b of k.boxes) b.visible = false;
      put(card(8), BARISTA, life(actAt(BAR7, t - 5.6), t, 55), 0.5, 11.35, cx, SC, RIV_Y, shockEx(BARISTA, at(t, 6.15, 6.25) * (1 - at(t, 6.6, 6.9))));
    }
    k.puff.end(); k.dirt.end();
  },
};

// ======================= 8. THE CRITIC (45 - 54.5): stomping in, the notebook slam, "two", the secret sachets =======================
const KW = actor(56, [{ t: 0, mood: "angry", arms: ["rest", "rest"], look: [-0.4, 0.1] }, { t: 2.4, mood: "suspicious", look: [-0.5, -0.1] }]);
const KO = actor(57, [{ t: 0, mood: "angry", arms: ["rest", "rest"], look: [0, 0.2] }, { t: 0.9, mood: "angry", arms: ["rest", "point"], look: [-0.6, -0.2] }, { t: 1.7, mood: "smug", arms: ["rest", "rest"], look: [-0.3, 0] }]);
const B8 = actor(58, [{ t: 0, mood: "nervous", sweat: true, arms: ["clasp", "clasp"], look: [0.7, 0.1] }, { t: 0.4, mood: "shock", event: "shockSmall", arms: ["clasp", "clasp"], look: [0.7, 0.1] }, { t: 1.2, mood: "nervous", look: [0.7, 0], nod: 1 }]);
const B8s = actor(59, [{ t: 0, mood: "nervous", sweat: true, arms: ["chest", "chest"], look: [0.5, 0.4] }, { t: 1.8, mood: "smug", arms: ["chest", "chest"], look: [0.3, 0] }, { t: 2.5, mood: "wink", arms: ["chest", "chest"], look: [0.2, 0] }]);
/** the right awning post stands exactly in the critic's low-angle walk: leave it out of that one scene */
const hidePost = (k: K) => { k.W.root.updateMatrixWorld(true); const p = V(0, 0, 0); k.W.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.getWorldPosition(p); if (Math.abs(p.x - 3.0) < 0.1 && Math.abs(p.z - 2.25) < 0.1) o.visible = false; } else if (o !== k.W.root) { o.getWorldPosition(p); if (Math.abs(p.x - 4.2) < 0.05 && Math.abs(p.z - 1.55) < 0.05 && Math.abs(p.y) < 0.05) o.visible = false; /* the parked scooter in his path */ } }); };
const S8: SceneDef = {
  from: 45, to: 54.5, ...DAY,
  mk: mkSet("day", (k) => { hidePost(k); k.W.setMenu(1, 7); addCup(k, "glass", V(0.62, BAR + 0.004, 0.62)); addCup(k, "ceramic", V(1.0, BAR + 0.012, 0.62)); addSachet(k); addSachet(k); k.nb = notebook3D(); k.W.root.add(k.nb); }),
  keys: [...move(0, 3.0, [{ pos: [1.2, 0.28, 3.35], look: [4.9, 0.45, 3.0], fov: 46 }, { pos: [1.4, 0.4, 3.35], look: [3.7, 0.8, 2.75], fov: 46 }, { pos: [1.6, 0.7, 3.35], look: [2.75, 1.45, 2.15], fov: 46 }]),
    ...move(3.0, 6.2, [{ pos: [2.55, 1.36, 3.3], look: [2.3, 1.12, 1.15], fov: 44 }, { pos: [2.5, 1.35, 3.05], look: [2.25, 1.14, 1.1], fov: 44 }]),
    ...move(6.2, 9.5, [{ pos: [1.0, 1.66, 2.05], look: [0.82, 1.1, 0.55], fov: 44 }, { pos: [0.95, 1.64, 1.9], look: [0.82, 1.12, 0.55], fov: 44 }])],
  focus: (t) => (t < 3 ? [lerp(5.4, 2.75, at(t, 0, 2.7)), 0.9, 2.6] : t < 6.2 ? [T1X, 1.1, T1Z + 0.2] : [0.82, 1.1, 0.5]),
  act: (cx) => {
    const { t, card, cam } = cx, k = kk(cx.set); k.dirt.begin(); k.puff.begin(); k.cups.forEach((c) => c.update(t, 0.2));
    const [s1, s2] = k.sachets; s1.group.visible = s2.group.visible = t >= 6.2; for (let i = 0; i < 3; i++) card(i).setVisible(false);
    if (t < 3.0) { // stomp stomp: dust at every footfall, the calendar swings, the camera tilts up to his face
      const u = at(t, 0, 2.7), x = lerp(5.4, 2.75, u), z = x > 3.7 ? 3.0 : lerp(2.15, 3.0, (x - 2.75) / 0.95), /* in front of the street pole at (4.6, 2.5) */ ph = t * 1.25; let P = walk(life(actAt(KW, t), t, 56), ph, 1 - at(t, 2.5, 2.9), 2); P = { ...P, body: { ...P.body, sx: P.body.sx * 1.05 } };
      put(card(1), KRITIKUS, P, x, z, cx, 0.86, 0, glassesEx);
      const st = Math.floor(ph * 2); for (const [p, a] of burst(t, st / 2.5, 0.7, 7, V(x + (st % 2 ? 0.08 : -0.08), 0.04, z), V(0, 0.6, 0.3), 0.9, 0.35, 0.3, st)) k.dirt.add(p, 0.06 + 0.16 * a, 0.55 * (1 - a));
      cam.position.y += 0.012 * Math.max(0, Math.cos(ph * 2 * Math.PI)) * (1 - at(t, 2.5, 2.9)); cam.updateMatrixWorld();
    } else if (t < 6.2) { // seated: the slam, the point, two fingers; the owner nods nervously
      const tt = t - 3.0, y = sitY(KRITIKUS, 0.86), slam = at(tt, 0.35, 0.42), lift = at(tt, 0.1, 0.33) * (1 - slam);
      let P = seated(life(actAt(KO, tt), t, 57)); const two = at(tt, 1.8, 1.95); P = setArm(P, 0, { a: [-60, -10], b: [-50, -120] }, two); if (tt > 0.36 && tt < 0.5) P = squash(P, 0.6);
      const nbP = V(T1X - 0.05, 0.75 + 0.18 * lift, 1.55); k.nb!.position.copy(nbP); k.nb!.rotation.set(0, 0.2, 0);
      P = reach(card(1), KRITIKUS, P, 1, nbP.clone().add(V(0.06, 0.01, 0)), T1X, T1Z, cx, 0.86, y, both(glassesEx, (g, Q) => { if (two > 0.6) { const [hx, hy] = handPoint(KRITIKUS, Q, 0); drawTwoFingers(g, hx, hy); } }, shockEx(KRITIKUS, slam * (1 - at(tt, 0.6, 0.9)) * 0.7)), 1 - at(tt, 0.8, 1.0));
      for (const [p, a] of burst(t, 3.42, 0.6, 10, nbP.clone(), V(0, 1, 0.3), 1, 0.45, 0.3, 88)) k.dirt.add(p, 0.03 + 0.08 * a, 0.5 * (1 - a));
      const B = life(actAt(B8, tt), t, 58, 1.2); put(card(0), BAPAK, B, OX, OZ, cx, SB, hopY(tt, 0.42, 0.25, 0.08), sweatEx(BAPAK, t, 1));
    } else { // behind the bar: two identical sachets torn over two cups, "shh", a wink to us
      k.nb!.visible = false; const tw = t - 6.2, tear = at(tw, 0.5, 0.9), pour = at(tw, 1.0, 1.15) * (1 - at(tw, 1.7, 1.85)), tilt = at(tw, 0.95, 1.1) * (1 - at(tw, 1.8, 2.0));
      const cups = [V(0.62, BAR + 0.004, 0.62), V(1.0, BAR + 0.012, 0.62)];
      [s1, s2].forEach((s, i) => { const base = cups[i].clone().add(V((i ? -1 : 1) * 0.05 * tilt, 0.17 + 0.012 * Math.sin(tw * 3 + i), 0.02)); s.group.position.copy(base); s.group.rotation.set(0, 0, (i ? -1 : 1) * (0.12 + 1.7 * tilt)); s.group.updateWorldMatrix(true, false); s.update(tw, tear, pour, s.group.localToWorld(V(0, 0.06, 0)), cups[i].clone().add(V(0, 0.07, 0))); });
      let P = life(actAt(B8s, tw), t, 59); const shh = at(tw, 2.1, 2.3);
      P = reach(card(0), BAPAK, P, 0, s1.group.localToWorld(V(-0.025, -0.03, 0.006)), OX, OZ, cx, SB, 0, undefined, 1 - shh);
      if (shh < 0.5) P = reach(card(0), BAPAK, P, 1, s2.group.localToWorld(V(0.025, -0.03, 0.006)), OX, OZ, cx); else { [s1, s2].forEach((s) => (s.group.visible = false));
        P = reach(card(0), BAPAK, P, 1, (cc) => mouthPt(cc, BAPAK, P).add(V(0, 0.02, 0.02)), OX, OZ, cx, SB, 0, (g, Q) => { const [hx, hy] = handPoint(BAPAK, Q, 1); drawFinger(g, hx, hy + 10, 0); }); }
    }
    k.dirt.end(); k.puff.end();
  },
};

// ======================= 9. THE TASTE TEST (54.5 - 61.5): spit-take, then the float + glow + five stars =======================
const KT = actor(60, [{ t: 0, mood: "suspicious", arms: ["rest", "rest"], look: [0, 0.3] }, { t: 1.5, mood: "angry", look: [0, 0] }, { t: 2.0, mood: "neutral", look: [-0.3, 0.1] },
  { t: 3.0, mood: "suspicious", look: [0.3, 0.3] }, { t: 4.3, mood: "excited", look: [0, -0.3] }, { t: 6.0, mood: "excited", arms: ["chest", "rest"], look: [-0.3, 0.5] }],
  [...say("Pahit.", 1.9, 2.3, [0]), ...say("Biasa.", 2.45, 2.9, [0]), ...say("Ada cokelat.", 4.75, 5.4, [1]), ...say("Ada buah.", 5.55, 6.1, [1])]);
const actCritic = (cx: Ctx, tt: number, c: ToonCard, gk = 1) => {
  const k = kk(cx.set), [cg, cc] = k.cups, n = camDir(cx.cam, T1X, T1Z), yaw = yawTo(cx.cam, T1X, T1Z), r = rightOf(cx.cam);
  const l1 = at(tt, 0.3, 0.75) * (1 - at(tt, 1.45, 1.6)), s1 = at(tt, 0.75, 0.95) * (1 - at(tt, 1.3, 1.45)), spit = clamp01((tt - 1.42) / 0.6);
  const l2 = at(tt, 3.3, 3.75) * (1 - 0.4 * at(tt, 4.6, 5.0)), s2 = at(tt, 3.75, 4.0) * (1 - at(tt, 4.35, 4.55)), glow = at(tt, 4.3, 5.0) * gk, float = at(tt, 4.4, 4.9) * (1 - at(tt, 5.8, 6.1)), stars = clamp01((tt - 6.1) / 0.75) * 5;
  let P = seated(life(actAt(KT, tt), cx.t, 60, 0.8));
  if (tt > 1.4 && tt < 1.95) P = { ...P, eyes: [{ kind: "squeeze" }, { kind: "squeeze" }], mouth: { kind: "tongue", open: 0.6 }, head: { ...P.head, sx: P.head.sx * 1.08, rot: P.head.rot + 0.2 } };
  if (tt > 3.9 && tt < 6.05) P = { ...eyesShut(P), mouth: tt > 4.7 ? P.mouth : { kind: "smile", open: 0.25 }, head: { ...P.head, rot: P.head.rot + 0.12 * at(tt, 4.0, 4.4) } };
  if (tt > 6.1) { const scrib = Math.sin(tt * 40); P = { ...P, arms: [P.arms[0], { a: [-40, 80], b: [-60 + 12 * scrib, 70 + 6 * scrib] }] }; }
  const ex = both(glassesEx, glowEx(KRITIKUS, glow, cx.t), sparkEx(KRITIKUS, cx.t, float), (g, Q) => { if (tt > 1.4) { const [mx, my] = head(KRITIKUS, Q); drawSpray(g, mx + 30, my + KRITIKUS.R * 0.5, 1, spit, KRITIKUS.R); } },
    shockEx(KRITIKUS, at(tt, 1.4, 1.5) * (1 - at(tt, 1.9, 2.2))), (g, Q) => { if (tt > 6.0) { const [x, y] = handPoint(KRITIKUS, Q, 0); drawNotebook(g, x + 10, y, stars); if (tt < 6.9) drawSpeedLines(g, 1, 0.5, cx.t); } });
  const y = sitY(KRITIKUS, 0.86) + 0.1 * float;
  cg.group.position.copy(CUP_G); cg.group.rotation.set(0, 0, 0); cc.group.position.copy(CUP_C); cc.group.rotation.set(0, yaw, 0);
  if (tt < 3.0) P = reach(c, KRITIKUS, P, 0, () => cupPath(cg, CUP_G.clone(), mouthPt(c, KRITIKUS, P), n, l1, s1, yaw, r, -1).add(V(0, 0, 0)), T1X, T1Z, cx, 0.86, y, ex, at(tt, 0.1, 0.3) * (1 - at(tt, 1.6, 1.85)));
  else P = reach(c, KRITIKUS, P, 1, () => cupPath(cc, CUP_C.clone(), mouthPt(c, KRITIKUS, P), n, l2, s2, yaw, r), T1X, T1Z, cx, 0.86, y, ex, at(tt, 3.1, 3.3) * (1 - at(tt, 5.9, 6.1)));
  k.head.position.copy(mouthPt(c, KRITIKUS, P)).add(V(0, 0.3, 0)).addScaledVector(n, 0.3); k.head.intensity = glow * 0.6;
  cg.update(cx.t, 0.8); cc.update(cx.t, 0.8);
  k.star.begin(); if (float > 0.05) for (let i = 0; i < 10; i++) { const a = cx.t * 1.5 + i * 0.63, rr = 0.32 + 0.05 * Math.sin(cx.t * 3 + i); k.star.add(mouthPt(c, KRITIKUS, P).add(V(rr * Math.cos(a), 0.12 + 0.18 * Math.sin(a * 1.3), 0.05 + 0.1 * Math.sin(a))), 0.05 + 0.03 * Math.sin(cx.t * 9 + i), float); } k.star.end();
  return P;
};
const tableProps = (k: K) => { addCup(k, "glass", CUP_G.clone()); addCup(k, "ceramic", CUP_C.clone());
  for (const [txt, x, col] of [["5.000", CUP_G.x, "#2f6f4f"], ["50.000", CUP_C.x, "#a0302a"]] as [string, number, string][]) { const tt = tent(txt, col); tt.position.set(x, 0.74, TENT_Z); k.W.root.add(tt); k.tents.push(tt); } };
const B9 = actor(61, [{ t: 0, mood: "nervous", sweat: true, arms: ["clasp", "clasp"], look: [0.7, 0.1] }, { t: 1.5, mood: "worried", look: [0.7, 0] }, { t: 4.5, mood: "surprised", look: [0.7, 0] }, { t: 5.5, mood: "excited", arms: ["up", "clasp"], look: [0.7, 0] }]);
const S9: SceneDef = {
  from: 54.5, to: 61.5, ...DAY,
  mk: mkSet("day", (k) => { k.W.setMenu(1, 7); tableProps(k); }),
  keys: [...move(0, 3.9, [{ pos: [2.7, 1.32, 3.15], look: [2.36, 1.12, 1.2], fov: 42 }, { pos: [2.62, 1.3, 2.95], look: [2.36, 1.13, 1.2], fov: 42 }]),
    ...move(3.9, 6.0, [{ pos: [2.3, 1.36, 3.05], look: [2.35, 1.22, 1.15], fov: 40 }, { pos: [2.32, 1.38, 2.85], look: [2.35, 1.26, 1.15], fov: 40 }]),
    ...move(6.0, 7.0, [{ pos: [3.0, 1.45, 2.95], look: [2.2, 1.12, 1.1], fov: 46 }, { pos: [2.95, 1.45, 2.85], look: [2.2, 1.12, 1.1], fov: 46 }])],
  focus: () => [T1X, 1.2, T1Z + 0.15],
  act: (cx) => { put(cx.card(0), BAPAK, life(actAt(B9, cx.t), cx.t, 61, 1.2), OX, OZ, cx, SB, 0, sweatEx(BAPAK, cx.t, 1 - at(cx.t, 4.4, 4.8))); actCritic(cx, cx.t, cx.card(1)); },
};

// ======================= 10. THE TURN (61.5 - 73.5): everyone freezes mid-motion; replays show the light was real =======================
const FROZ = { w: actor(80, [{ t: 0, mood: "laugh", arms: ["hug", "point"] }]), b: actor(81, [{ t: 0, mood: "surprised", arms: ["clasp", "clasp"], look: [0.7, 0] }]), bar: actor(82, [{ t: 0, mood: "shock", arms: ["up", "hip"], look: [-0.6, 0] }]) };
const S10: SceneDef = {
  from: 61.5, to: 73.5, ...DAY, bloom: 0.62,
  satAt: (t) => (t < 2.6 ? lerp(0.2, -0.55, at(t, 0.1, 0.6)) : t < 7.2 ? -0.2 : -0.2), fadeAt: (t) => 0.75 * at(t, 11.35, 12.0), // a soft dip to dark into the night (was a white flash)
  mk: mkSet("day", (k) => { k.W.setMenu(1, 7); tableProps(k); addCup(k, "ceramic", CUP_C.clone()); }),
  keys: [...move(0, 2.6, [{ pos: [-0.9, 1.45, 3.7], look: [-0.9, 1.2, 1.2], fov: 48 }, { pos: [2.2, 1.45, 3.7], look: [2.3, 1.2, 1.2], fov: 48 }], lin),
    ...move(2.6, 7.2, [{ pos: [2.7, 1.32, 3.2], look: [2.37, 1.2, 1.15], fov: 42 }, { pos: [2.45, 1.34, 2.75], look: [2.36, 1.3, 1.15], fov: 42 }]),
    ...move(7.2, 12.0, [{ pos: [2.7, 1.34, 3.1], look: [2.36, 1.2, 1.15], fov: 42 }, { pos: [2.55, 1.35, 2.85], look: [2.35, 1.22, 1.15], fov: 42 }])],
  focus: (t) => (t < 2.6 ? [1.6, 1.2, 1.3] : [T1X, 1.3, T1Z + 0.1]),
  act: (cx) => {
    const { t, card } = cx, k = kk(cx.set), [cg, cc, cb] = k.cups;
    for (let i = 0; i < 6; i++) card(i).setVisible(false);
    if (t < 2.6) { // the tableau: frozen mid-laugh, mid-jump, mid-photo; only the critic's light still breathes
      cb.group.visible = cb.saucer.visible = false; const f = 0.37;
      put(card(0), BAPAK, actAt(FROZ.b, 0.5), OX, OZ, cx, SB, 0.06, shockEx(BAPAK, 0.6));
      put(card(2), ISTRI, laughing(actAt(FROZ.w, 0.5), f, 1), IX, IZ, cx, 0.86, 0.04, tearsEx(ISTRI, f, 1));
      put(card(3), BARISTA, actAt(FROZ.bar, 0.5), -0.2, 2.0, cx, SC, 0, shockEx(BARISTA, 0.8));
      const P = actCritic(cx, 5.3, card(1), 1); void P; cg.update(f, 0); cc.update(f, 0);
    } else if (t < 7.2) { // replay 1 in slow motion: the man in the suit, the light plain to see
      [cg, cc].forEach((c) => (c.group.visible = c.saucer.visible = false)); cb.group.visible = cb.saucer.visible = true;
      actSuit(cx, 4.1 + (t - 2.6) * 0.5, card(4), 1.3, cb, CUP_C);
    } else { // replay 2: the critic, brighter than anything before; we fly into the light
      cb.group.visible = cb.saucer.visible = false; [cg, cc].forEach((c) => (c.group.visible = c.saucer.visible = true));
      actCritic(cx, 3.2 + (t - 7.2) * 0.62, card(5), 0.9);
    }
  },
};

// ======================= 11. NIGHT (73.5 - 84.6): he tests it on himself, looks around, gulps the expensive one =======================
const G1 = V(0.55, BAR + 0.004, 0.68), G2 = V(0.95, BAR + 0.004, 0.68);
const B11 = actor(64, [{ t: 0, mood: "neutral", arms: ["chest", "chest"], look: [0, 0.5] }, { t: 3.0, mood: "smug", look: [0.2, 0.5] }, { t: 5.5, mood: "neutral", look: [0, 0] },
  { t: 6.6, mood: "suspicious", look: [0, 0.2] }, { t: 7.4, mood: "neutral" }, { t: 8.6, mood: "surprised", look: [0, 0.45] }, { t: 9.0, mood: "nervous", look: [-1, 0] },
  { t: 9.35, look: [1, 0] }, { t: 9.7, look: [-1, 0.1] }, { t: 9.95, mood: "smug", look: [0, 0.3] }, { t: 10.75, mood: "laugh", look: [0, 0] }]);
const S11: SceneDef = {
  from: 73.5, to: 84.6, ...NIGHT, fadeAt: (t) => 0.9 * at(t, 10.6, 11.05),
  mk: mkSet("night", (k) => { k.W.kettle.visible = false; k.W.setMenu(1, 9); addCup(k, "glass", G1); addCup(k, "glass", G2); k.label = sticker(); k.W.root.add(k.label); k.W.setDay("BULAN", 2); }),
  keys: [...move(0, 3.0, [{ pos: [-2.2, 1.65, 7.7], look: [0.75, 2.4, 0.6], fov: 50 }, { pos: [-1.9, 1.6, 7.1], look: [0.7, 2.15, 0.6], fov: 50 }]),
    ...move(3.0, 5.5, [{ pos: [0.9, 1.3, 2.15], look: [0.8, 1.04, 0.66], fov: 40 }, { pos: [0.88, 1.28, 2.0], look: [0.8, 1.04, 0.66], fov: 40 }]),
    ...move(5.5, 11.1, [{ pos: [0.9, 1.48, 2.75], look: [0.8, 1.32, 0.35], fov: 40 }, { pos: [0.85, 1.48, 2.5], look: [0.8, 1.36, 0.35], fov: 40 }])],
  focus: (t) => (t < 3 ? [0.8, 1.3, 0.7] : t < 5.5 ? [0.8, 1.03, 0.66] : [0.8, 1.4, 0.4]),
  act: (cx) => {
    const { t, cam } = cx, k = kk(cx.set), [g1, g2] = k.cups, c = cx.card(0), n = camDir(cam, OX, OZ), yaw = yawTo(cam, OX, OZ), r = rightOf(cam);
    const stick = at(t, 4.0, 4.2); k.label!.visible = t > 4.0; k.label!.scale.setScalar(easeOutBack(stick) * 1.0 + 0.001);
    const l1 = at(t, 5.7, 6.15) * (1 - at(t, 6.75, 7.15)), s1 = at(t, 6.1, 6.35) * (1 - at(t, 6.55, 6.75));
    const l2 = at(t, 7.4, 7.85) * (1 - 0.45 * at(t, 8.45, 8.9)) + 0.45 * at(t, 10.0, 10.3), s2 = at(t, 7.8, 8.05) * (1 - at(t, 8.3, 8.5)) + 1.35 * at(t, 10.2, 10.65);
    const glow = at(t, 8.0, 8.9) * 0.95;
    let P = life(actAt(B11, t), t, 64, 0.9); if ((s1 > 0.4 && t < 7) || s2 > 0.4) P = eyesShut(P);
    if (t > 6.6 && t < 7.4) P = { ...P, mouth: { kind: "wavy", open: 0.1 }, arms: P.arms }; // meh
    if (t > 9.0 && t < 9.95) P = { ...P, head: { ...P.head, rot: P.head.rot + 0.12 * Math.sign(Math.sin((t - 9.0) * Math.PI / 0.35)) } }; // sneaky looks
    if (t > 10.2 && t < 10.7) P = { ...P, head: { ...P.head, dy: P.head.dy - 10 * at(t, 10.2, 10.5), rot: P.head.rot - 0.15 * at(t, 10.2, 10.5) }, bob: P.bob + 4 * Math.sin(t * 40) };
    if (t > 10.75) P = squash(P, Math.max(0, 1 - (t - 10.75) * 5));
    const ex = both(glowEx(BAPAK, glow, t), sparkEx(BAPAK, t, glow * (t > 10.7 ? 1 : 0.4)), sweatEx(BAPAK, t, t > 9.0 && t < 9.95 ? 1 : 0));
    g1.group.position.copy(G1); g1.group.rotation.set(0, 0, 0); g2.group.position.copy(G2); g2.group.rotation.set(0, 0, 0);
    if (t < 3.0) P = reach(c, BAPAK, P, 1, G2.clone().add(V(0.045, 0.04, 0)), OX, OZ, cx, SB, 0, ex);
    else if (t < 5.5) { P = reach(c, BAPAK, P, 1, G2.clone().add(V(0.045, 0.035, 0)), OX, OZ, cx, SB, 0, ex); P = reach(c, BAPAK, P, 0, G2.clone().add(V(-0.005, 0.05, 0.04)), OX, OZ, cx, SB, 0, ex, at(t, 3.5, 4.0) * (1 - at(t, 4.5, 5.0))); }
    else if (t < 7.25) P = reach(c, BAPAK, P, 0, () => cupPath(g1, G1.clone(), mouthPt(c, BAPAK, P), n, l1, s1, yaw, r, -1), OX, OZ, cx, SB, 0, ex, at(t, 5.5, 5.7) * (1 - at(t, 7.15, 7.25)));
    else P = reach(c, BAPAK, P, 1, () => cupPath(g2, G2.clone(), mouthPt(c, BAPAK, P), n, l2, Math.min(1.35, s2), yaw, r), OX, OZ, cx, SB, 0, ex, at(t, 7.25, 7.4));
    g2.group.updateWorldMatrix(true, false); k.label!.position.copy(g2.group.localToWorld(V(0, 0.05, 0.037))); k.label!.quaternion.copy(g2.group.quaternion);
    k.head.position.copy(mouthPt(c, BAPAK, P)).add(V(0, 0.4, 0)).addScaledVector(n, 0.5); k.head.intensity = glow * 0.3;
    g1.update(t, 0.9); g2.update(t, 0.9); g2.coffee.visible = t < 10.6;
    k.star.begin(); if (stick > 0 && stick < 1) for (let i = 0; i < 5; i++) k.star.add(k.label!.position.clone().add(V(0.05 * Math.cos(i * 1.26), 0.04 * Math.sin(i * 1.26), 0.02)), 0.03 * Math.sin(Math.PI * stick), 1); k.star.end();
  },
};

export const KOPI2_SCENES = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11];
export const KOPI2_FRAMES = 85 * FPS;
export const KopiFilm2: React.FC = () => <Reel scenes={KOPI2_SCENES} />;
// single-scene clips (the user edits them in CapCut): the scene shifted to start at 0
const clip = (S: SceneDef): SceneDef => ({ ...S, from: 0, to: S.to - S.from });
export const KOPI2_CLIPS = { KopiS1: S1, KopiS7: S7, KopiS8: S8, KopiS10: S10 };
export const clipFrames = (S: SceneDef) => Math.round((S.to - S.from) * FPS);
export const KopiClip: React.FC<{ id: keyof typeof KOPI2_CLIPS }> = ({ id }) => <Reel scenes={[clip(KOPI2_CLIPS[id])]} />;
