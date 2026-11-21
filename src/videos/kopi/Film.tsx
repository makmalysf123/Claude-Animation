// "Kopi Mahal Itu Cuma Gengsi?" (about 85 s). Approved script: docs/scripts/kopi-mahal-naskah-v1.md.
// Times below are seconds inside each scene (the scene's own clock starts at 0). No narrator, no subtitles here:
// the user adds those in CapCut. Text that exists IN the world (chalk board, calendar, price tents, phone) is fine.
// Props stay where the story puts them; hands REACH to them (see `reach`), so a held cup is really in the hand.
import React from "react";
import * as THREE from "three";
import { actAt, Actor, Beat, Word, FPS, clamp01, sm } from "../../lib/acting";
import { headCenter, handPoint, Limb, Pose, CharSpec, OUTLINE } from "../../lib/toon2";
import { SU, ToonCard } from "../../lib/toonCard";
import { Reel, SceneDef, SetLike, Ctx, Key, handWorld } from "../../lib/scene";
import { WarungSet } from "./warung";
import { BAPAK, ISTRI, BARISTA, BERJAS, KRITIKUS, TETANGGA1, TETANGGA2, ANTRE } from "./cast";
import { CoffeeCup, Sachet, Phone, cupBoxes, drawHeadGlow, drawGlasses, drawTie, drawChalk, drawNotebook, drawMaskBubble } from "./props";
import { canvasTex } from "../ketindihan2/sets";

// ---------------- small helpers ----------------
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const at = (t: number, a: number, b: number) => sm((t - a) / (b - a));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const SC = 0.88, SB = 1.0;
const scl = (S: CharSpec) => (S === BAPAK ? SB : S === BERJAS ? 0.95 : SC);
type Ex = (g: CanvasRenderingContext2D, P: Pose) => void;
const both = (...f: (Ex | undefined)[]): Ex => (g, P) => f.forEach((x) => x?.(g, P));
/** words spread over [t0, t1] by length */
const say = (text: string, t0: number, t1: number, stress: number[] = []): Word[] => {
  const ws = text.split(" "), tot = ws.reduce((s, w) => s + w.length + 2, 0); let c = t0;
  return ws.map((w, i) => { const d = ((w.length + 2) / tot) * (t1 - t0), o = { w, t0: c, t1: c + d * 0.92, stress: stress.includes(i) }; c += d; return o; });
};
const actor = (seed: number, beats: Beat[], words: Word[] = []): Actor => ({ seed, beats, words });
/** world point of a canvas point (design units) on a placed card */
const cardPt = (c: ToonCard, x: number, y: number) => { c.mesh.updateMatrixWorld(); return c.mesh.localToWorld(V((x - 300) * SU, (975 - y) * SU, 0)); };
const mouthPt = (c: ToonCard, S: CharSpec, P: Pose) => { const [x, y] = headCenter(S, P); return cardPt(c, x, y + S.R * 0.5); };
const camDir = (cam: THREE.Camera, x: number, z: number) => V(cam.position.x - x, 0, cam.position.z - z).normalize();
const yawTo = (cam: THREE.Camera, x: number, z: number) => Math.atan2(cam.position.x - x, cam.position.z - z);
const put = (c: ToonCard, S: CharSpec, P: Pose, x: number, z: number, cx: Ctx, sc = scl(S), y = 0, extra?: Ex) => c.update(S, P, x, z, cx.cam, cx.set.sunDir, sc, y, extra);
const setArm = (P: Pose, i: 0 | 1, L: Limb, u = 1): Pose => { if (u <= 0) return P; const A = P.arms[i], M: Limb = { a: [lerp(A.a[0], L.a[0], u), lerp(A.a[1], L.a[1], u)], b: [lerp(A.b[0], L.b[0], u), lerp(A.b[1], L.b[1], u)] }; return { ...P, arms: (i ? [P.arms[0], M] : [M, P.arms[1]]) as [Limb, Limb] }; };
const eyesShut = (P: Pose, u = 1): Pose => (u < 0.5 ? P : { ...P, eyes: [{ kind: "closed" }, { kind: "closed" }] });
/** move hand i so that, seen from the camera, it lands on `target` (a world point on or in front of the card).
 *  `target` may be a function of the placed card (e.g. to follow the mouth). w 0..1 blends the reach in. */
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
/** a simple walk cycle on top of a pose; `ph` is the stride phase in cycles */
const walk = (P: Pose, ph: number, amp = 1, stomp = 0): Pose => {
  const a0 = ph * Math.PI * 2;
  const legs = [0, 1].map((k) => { const s = k ? 1 : -1, a = a0 + k * Math.PI, sw = Math.cos(a), lift = Math.max(0, Math.sin(a)); return { a: [s * 5 + 16 * sw * amp, 118 - 22 * lift * amp], b: [s * 3 + 34 * sw * amp, -48 * lift * amp] } as Limb; }) as [Limb, Limb];
  const arms = P.arms.map((A, k) => { const sw = Math.cos(a0 + (1 - k) * Math.PI) * amp; return { a: [A.a[0] + 10 * sw, A.a[1]], b: [A.b[0] + 26 * sw, A.b[1] - 4 * Math.abs(sw)] } as Limb; }) as [Limb, Limb];
  return { ...P, legs, arms, bob: P.bob - (6 + 8 * stomp) * Math.abs(Math.sin(a0)) * amp };
};
const drawTwoFingers = (g: CanvasRenderingContext2D, x: number, y: number) => {
  g.save(); g.fillStyle = "#fbf9f6"; g.strokeStyle = OUTLINE; g.lineWidth = 5;
  for (const [dx, a] of [[-9, -0.28], [9, 0.28]] as [number, number][]) { g.save(); g.translate(x + dx * 0.6, y - 6); g.rotate(a); g.beginPath(); g.roundRect(-6.5, -50, 13, 50, 6.5); g.fill(); g.stroke(); g.restore(); }
  g.fillStyle = OUTLINE; g.beginPath(); g.arc(x, y, 17, 0, Math.PI * 2); g.fill();
  g.restore();
};
const glowEx = (S: CharSpec, k: number, t: number): Ex => (g, P) => { const [x, y] = headCenter(S, P); drawHeadGlow(g, x, y, S.R, k, t); };
const glassesEx: Ex = (g, P) => { const [x, y] = headCenter(KRITIKUS, P); drawGlasses(g, x, y + KRITIKUS.R * 0.02, KRITIKUS.R, P.head.rot); };
const tieEx: Ex = (g, P) => { const [x, y] = headCenter(BERJAS, P); drawTie(g, x + P.body.lean * 120, y + BERJAS.R * 1.02, 118); };

/** price tent card on a table */
const tent = (txt: string, col: string) => {
  const tex = canvasTex(256, 128, (g) => { g.fillStyle = "#fbf7ec"; g.fillRect(0, 0, 256, 128); g.strokeStyle = col; g.lineWidth = 8; g.strokeRect(8, 8, 240, 112); g.fillStyle = col; g.font = "bold 66px 'Helvetica Neue', Arial"; g.textAlign = "center"; g.fillText(txt, 128, 88); });
  const G = new THREE.Group(), geo = new THREE.PlaneGeometry(0.13, 0.065); geo.translate(0, 0.0325, 0);
  const f = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 })); f.position.z = 0.012; f.rotation.x = -0.36; f.castShadow = true;
  const b = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: "#efe8d6", roughness: 0.8 })); b.position.z = -0.012; b.rotation.set(0.36, Math.PI, 0); b.castShadow = true;
  G.add(f, b); return G;
};
/** the paper price sticker for the night scene */
const sticker = () => { const tex = canvasTex(160, 96, (g) => { g.fillStyle = "#fff6d8"; g.fillRect(0, 0, 160, 96); g.fillStyle = "#b0302a"; g.font = "bold 46px 'Helvetica Neue', Arial"; g.textAlign = "center"; g.fillText("50.000", 80, 64); g.fillStyle = "rgba(200,200,190,0.6)"; g.fillRect(0, 0, 160, 10); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.036), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 })); return m; };
// the chalk board face (same transform as in warung.ts), used to put the writing hand on the board
const BOARD = (() => { const bd = new THREE.Object3D(); bd.position.set(-2.05, 0, 1.95); bd.rotation.y = 0.22; const f = new THREE.Object3D(); f.position.set(0, 1.12, 0.025); f.rotation.x = -0.12; bd.add(f); bd.updateMatrixWorld(true); return f; })();

// ---------------- the set + props for a scene ----------------
type K = SetLike & { W: WarungSet; cups: CoffeeCup[]; sachets: Sachet[]; phone: Phone; tents: THREE.Group[]; head: THREE.PointLight; label?: THREE.Mesh; boxes?: THREE.Group };
const kk = (s: SetLike) => s as K;
const mkSet = (mode: "day" | "night", f?: (k: K) => void) => () => {
  const W = new WarungSet(mode), k = W as unknown as K; k.W = W; k.cups = []; k.sachets = []; k.tents = [];
  k.phone = new Phone(); k.phone.group.visible = false; W.root.add(k.phone.group);
  k.head = new THREE.PointLight("#ffc472", 0, 1.4, 2); W.root.add(k.head);
  f?.(k); return k as SetLike;
};
const addCup = (k: K, kind: "glass" | "ceramic", p: THREE.Vector3, full = true) => { const c = new CoffeeCup(kind, full); c.group.position.copy(p); c.saucer.position.copy(p); k.W.root.add(c.group, c.saucer); k.cups.push(c); return c; };
const addSachet = (k: K) => { const s = new Sachet(); s.attachStream(k.W.root); k.W.root.add(s.group); k.sachets.push(s); return s; };
/** lift a cup from `rest` to the mouth (u 0..1) and tilt it in sip (0..1); returns the handle point for the hand */
const cupPath = (cup: CoffeeCup, rest: THREE.Vector3, mouth: THREE.Vector3, n: THREE.Vector3, u: number, sip: number, yaw: number, card?: THREE.Vector3) => {
  const m = mouth.clone().addScaledVector(n, 0.07).add(V(0, -0.075, 0)), p = rest.clone().lerp(m, u); p.y += Math.sin(Math.PI * u) * 0.04;
  if (card) { const depth = p.clone().sub(card).dot(n); if (depth < 0.08) p.addScaledVector(n, (0.08 - depth) * sm(u / 0.25)); } // a lifted cup is always in front of the body
  cup.group.position.copy(p); cup.group.rotation.set(-0.75 * sip, yaw, 0, "YXZ"); cup.group.updateWorldMatrix(true, false);
  return cup.group.localToWorld(V(cup.kind === "ceramic" ? 0.07 : 0.042, 0.036, 0));
};

const DAY = { fog: "#efd9b6", dens: 0.009, bg: "#cfe0f2", cInf: 7, env: 0.42, exposure: 0.03, bloom: 0.7, sat: 0.2, contrast: 0.12, grade: [[0.4, 0.5, 0.58], [0.64, 0.54, 0.4], 0.32] as [[number, number, number], [number, number, number], number] } as const;
const NIGHT = { fog: "#0a0e1a", dens: 0.03, bg: "#05070d", cInf: 6, night: true, env: 0.1, bloom: 0.95, exposure: 0.02 } as const;
const cut = (t: number, a: Omit<Key, "t">, b: Omit<Key, "t">, dur: number): Key[] => [{ t, ...a }, { t: t + dur - 0.03, ...b }];

// ======================= 1. HOOK (0 - 6) =======================
const CUP1 = V(1.0, 0.968, 0.76), OX = 0.8, OZ = 0.5;
const B_HOOK = actor(31, [{ t: 0, mood: "smug", arms: ["chest", "open"], look: [0.15, 0.55] }, { t: 2.5, mood: "smug", look: [0.05, 0.35] }]);
const B_BOARD = actor(32, [{ t: 0, mood: "neutral", arms: ["point", "rest"], look: [-0.75, 0.15], lean: -0.04 }, { t: 2.2, mood: "smug", arms: ["rest", "hip"], look: [0, 0], lean: 0 }]);
const S1: SceneDef = {
  from: 0, to: 6, ...DAY,
  mk: mkSet("day", (k) => { k.W.setMenu(0.5); addCup(k, "ceramic", CUP1, false); addSachet(k); }),
  keys: [...cut(0, { pos: [1.18, 1.5, 2.8], look: [0.92, 1.24, 0.7], fov: 40 }, { pos: [1.12, 1.45, 2.4], look: [0.92, 1.2, 0.7], fov: 40 }, 3.3),
    ...cut(3.3, { pos: [-1.62, 1.28, 5.05], look: [-1.9, 1.1, 1.95], fov: 40 }, { pos: [-1.7, 1.2, 4.5], look: [-1.9, 1.04, 1.95], fov: 40 }, 2.7)],
  focus: (t) => (t < 3.3 ? [0.95, 1.15, 0.72] : [-1.72, 0.95, 1.98]),
  act: (cx) => {
    const { t, card } = cx, k = kk(cx.set), cup = k.cups[0], sa = k.sachets[0], c = card(0);
    if (t < 3.3) {
      const tear = at(t, 0.15, 0.6), tilt = at(t, 0.65, 0.95) * (1 - at(t, 2.1, 2.5)), pour = at(t, 0.8, 0.95) * (1 - at(t, 1.95, 2.1)), away = at(t, 2.3, 3.1);
      sa.group.position.copy(CUP1).add(V(0.057 * tilt + 0.14 * away, 0.17 - 0.02 * tilt + 0.1 * away, 0.02)); sa.group.rotation.set(0, 0, 1.9 * tilt); sa.group.updateWorldMatrix(true, false);
      const mouth = sa.group.localToWorld(V(0, 0.06, 0)), to = CUP1.clone().add(V(0, 0.055, 0)); sa.update(t, tear, pour, mouth, to);
      cup.coffee.visible = t > 1.0; cup.coffee.scale.setScalar(0.55 + 0.45 * at(t, 1.0, 2.0)); cup.update(t, at(t, 2.0, 3.0));
      let P = actAt(B_HOOK, t);
      P = reach(c, BAPAK, P, 1, sa.group.localToWorld(V(0.03, -0.035, 0.008)), OX, OZ, cx);
      P = reach(c, BAPAK, P, 0, sa.group.localToWorld(V(-0.028, 0.058, 0.008)), OX, OZ, cx, SB, 0, undefined, 1 - at(t, 0.65, 1.0));
    } else {
      const tw = t - 3.3, p = 0.5 + 0.5 * at(tw, 0.35, 2.0), b = (p - 0.5) * 2; k.W.setMenu(p);
      sa.group.visible = false; cup.update(t, 1);
      const pt = BOARD.localToWorld(V(0.08 + 0.3 * b, -0.25 + 0.035 * Math.sin(tw * 19), 0.03)), w = 1 - at(tw, 2.1, 2.5);
      const chalk: Ex = (g, Q) => { if (w < 0.2) return; const [hx, hy] = handPoint(BAPAK, Q, 0); drawChalk(g, hx - 4, hy - 6, -0.7); };
      reach(c, BAPAK, actAt(B_BOARD, tw), 0, pt, -1.3, 2.08, cx, SB, 0, chalk, w);
    }
  },
};

// ======================= 2. CONTEXT: empty warung, the cafe across (6 - 13.5) =======================
const B_BORED = actor(33, [{ t: 0, mood: "worried", arms: ["rest", "chin"], look: [-0.4, 0.3], lean: 0.05 }, { t: 1.9, look: [0.55, 0.15] }, { t: 3.0, look: [0.2, 0.4] }]);
const Q_ACT = ANTRE.map((_, i) => actor(40 + i, [{ t: 0, mood: (["story", "neutral", "excited", "neutral", "smug"] as const)[i], arms: ([["rest", "chest"], ["clasp", "clasp"], ["rest", "hip"], ["chest", "rest"], ["hip", "rest"]] as const)[i] as unknown as ["rest", "rest"], look: "dart" }]));
const BAR_ACT = actor(48, [{ t: 0, mood: "smug", arms: ["clasp", "clasp"], look: [0.3, 0.2] }, { t: 2.2, arms: ["chest", "clasp"], look: [-0.2, 0.3] }]);
const cafeCrowd = (cx: Ctx, t: number, from = 1) => {
  [2.1, 1.65, 1.2, 0.75, 0.32].forEach((x, i) => put(cx.card(from + i), ANTRE[i], actAt(Q_ACT[i], t + i), x, 9.35 + 0.12 * Math.sin(i * 2.3), cx, SC * (0.95 + 0.05 * (i % 2)), 0.12));
  put(cx.card(from + 5), BARISTA, actAt(BAR_ACT, t), -0.2, 14.45, cx, SC, 0.28);
};
const S2: SceneDef = {
  from: 6, to: 13.5, ...DAY,
  mk: mkSet("day", (k) => { k.W.setMenu(1); addCup(k, "ceramic", CUP1); }),
  keys: [...cut(0, { pos: [0.6, 1.36, 3.0], look: [0.4, 1.2, 0.8], fov: 40 }, { pos: [-2.3, 1.75, 7.9], look: [0.95, 2.9, 0.6], fov: 50 }, 3.4),
    ...cut(3.4, { pos: [0.2, 1.6, 3.0], look: [0.75, 2.7, 10.0], fov: 48 }, { pos: [0.3, 1.5, 4.2], look: [0.8, 1.5, 10.0], fov: 40 }, 4.1)],
  focus: (t) => (t < 3.4 ? [0.3, 1.2, 0.6] : [0.5, 1.4, 9.4]),
  act: (cx) => { const { t } = cx; kk(cx.set).cups[0].update(t, 0.15); put(cx.card(0), BAPAK, actAt(B_BORED, t), OX, OZ, cx); cafeCrowd(cx, t); },
};

// ======================= 3. RIDICULE 1: the wife laughs (13.5 - 18.5) =======================
const ISTRI_ACT = actor(34, [
  { t: 0, mood: "laugh", arms: ["hug", "hug"], bend: 20, lean: 0.12 }, { t: 1.25, mood: "surprised", event: "shockSmall", arms: ["mouthHand", "hug"], bend: 6, lean: 0.05 },
  { t: 1.8, mood: "laugh", arms: ["point", "hip"], bend: 0, lean: -0.05, look: [-0.7, 0] }, { t: 4.3, mood: "laugh", arms: ["hug", "hug"], bend: 16, lean: 0.1 }],
  say("Siapa yang mau bayar lima puluh ribu buat kopi sachet?", 1.9, 4.2, [4, 8]));
const B_SULK = actor(35, [{ t: 0, mood: "suspicious", arms: ["hip", "hip"], look: [-0.6, 0.1] }, { t: 2.6, mood: "worried", look: [-0.3, 0.3] }]);
const S3: SceneDef = {
  from: 13.5, to: 18.5, ...DAY,
  mk: mkSet("day", (k) => { k.W.setMenu(1); addCup(k, "ceramic", CUP1); }),
  keys: [{ t: 0, pos: [-0.35, 1.45, 5.4], look: [-1.1, 1.12, 1.9], fov: 40 }, { t: 5, pos: [-0.45, 1.42, 4.85], look: [-1.12, 1.12, 1.9], fov: 40 }],
  focus: () => [-1.2, 1.2, 2.2],
  act: (cx) => { const { t } = cx; kk(cx.set).cups[0].update(t, 0.3); put(cx.card(0), BAPAK, actAt(B_SULK, t), OX, OZ, cx); put(cx.card(1), ISTRI, actAt(ISTRI_ACT, t), -1.18, 2.22, cx, 0.86); },
};

// ======================= 4. DAY 1, DAY 2, the barista's photo (18.5 - 26.5) =======================
const CAL: Omit<Key, "t"> = { pos: [2.82, 1.56, 3.02], look: [2.93, 1.55, 2.33], fov: 36 }, CAL2: Omit<Key, "t"> = { pos: [2.84, 1.56, 2.9], look: [2.93, 1.55, 2.33], fov: 36 };
const PH = V(-1.15, 1.3, 3.1), PH_CAM: Omit<Key, "t"> = { pos: [-0.2, 1.45, 5.2], look: [-1.2, 1.2, 2.6], fov: 40 };
const B_WAIT = actor(36, [{ t: 0, mood: "worried", arms: ["rest", "chin"], look: [0.5, 0.3] }, { t: 1.0, look: [0.7, 0.1] }]);
const BAR_PHOTO = actor(37, [{ t: 0, mood: "smug", arms: ["open", "hip"], look: [-0.6, -0.1] }, { t: 1.3, mood: "laugh", look: [0.2, 0.1] }]);
const S4: SceneDef = {
  from: 18.5, to: 26.5, ...DAY,
  mk: mkSet("day", (k) => { k.W.setMenu(1); addCup(k, "ceramic", CUP1); k.W.setDay("HARI", 1); }),
  keys: [...cut(0, CAL, CAL2, 2.6), ...cut(2.6, { pos: [1.22, 1.3, 1.95], look: [1.0, 1.08, 0.76], fov: 38 }, { pos: [1.2, 1.28, 1.82], look: [1.0, 1.07, 0.76], fov: 38 }, 2.0),
    ...cut(4.6, PH_CAM, { pos: [-0.3, 1.45, 4.85], look: [-1.2, 1.22, 2.7], fov: 40 }, 2.0),
    ...cut(6.6, { pos: [-1.03, 1.32, 3.37], look: [-1.15, 1.3, 3.1], fov: 34 }, { pos: [-1.04, 1.32, 3.34], look: [-1.15, 1.3, 3.1], fov: 34 }, 1.4)],
  focus: (t) => (t < 2.6 ? [2.93, 1.55, 2.33] : t < 4.6 ? [1.0, 1.05, 0.76] : t < 6.6 ? [-1.1, 1.3, 3.0] : [-1.15, 1.3, 3.1]),
  act: (cx) => {
    const { t, cam } = cx, k = kk(cx.set); k.W.setDay("HARI", t < 1.25 ? 1 : 2); k.cups[0].update(t, 0);
    put(cx.card(0), BAPAK, actAt(B_WAIT, t), OX, OZ, cx);
    const ph = k.phone; ph.group.visible = t >= 4.6;
    if (t >= 4.6) {
      ph.group.position.copy(PH); ph.group.rotation.set(0, yawTo(cam, PH.x, PH.z), 0); ph.group.updateWorldMatrix(true, false); ph.draw(t < 6.6 ? "camera" : "chat", t - 6.6, k.W.menu.c);
      const c = cx.card(1); let P = actAt(BAR_PHOTO, t - 4.6);
      reach(c, BARISTA, P, 0, ph.group.localToWorld(V(-0.028, -0.06, -0.01)), -0.72, 2.95, cx);
    } else cx.card(1).setVisible(false);
  },
};

// ======================= 5. THE MAN IN THE SUIT (26.5 - 33.5) =======================
const CUP_B = V(1.0, 0.968, 1.06), BX = 1.0, BZ = 1.5;
const BERJAS_ACT = actor(38, [{ t: 0, mood: "worried", arms: ["rest", "rest"], look: [0.4, 0] }, { t: 2.4, mood: "neutral", arms: ["rest", "rest"], look: [0, 0.35] },
  { t: 3.5, mood: "surprised", look: [0, 0.1] }, { t: 4.4, mood: "story", look: [0.1, 0] }, { t: 5.3, mood: "smug", arms: ["rest", "rest"], look: [-0.3, -0.1] }]);
const B_HOPE = actor(39, [{ t: 0, mood: "surprised", arms: ["hip", "hip"], look: [0.6, 0] }, { t: 2.4, mood: "nervous", arms: ["clasp", "clasp"], look: [0.5, 0.1] }, { t: 5.5, mood: "excited", arms: ["up", "clasp"] }]);
/** the man at the counter: lift, sip, hold, glow, two fingers. `tt` is his clock, glow `gk` 0..1 */
const actBerjas = (cx: Ctx, tt: number, gk: number, c: ToonCard) => {
  const k = kk(cx.set), cup = k.cups[0], n = camDir(cx.cam, BX, BZ), yaw = yawTo(cx.cam, BX, BZ);
  const lift = at(tt, 2.6, 3.1) * (1 - at(tt, 4.0, 4.5) * 0.55), sip = at(tt, 2.95, 3.25) * (1 - at(tt, 3.6, 3.9)), fing = at(tt, 5.2, 5.6);
  let P = actAt(BERJAS_ACT, tt); P = eyesShut(P, sip > 0.4 ? 1 : 0); P = setArm(P, 0, { a: [-64, -8], b: [-58, -118] }, fing);
  const ex = both(tieEx, glowEx(BERJAS, gk, cx.t), (g, Q) => { if (fing > 0.6) { const [x, y] = handPoint(BERJAS, Q, 0); drawTwoFingers(g, x, y); } });
  P = reach(c, BERJAS, P, 1, (cc) => cupPath(cup, CUP_B.clone().add(V(0, 0.012, 0)), mouthPt(cc, BERJAS, P), n, lift, sip, yaw, V(BX, 0, BZ)), BX, BZ, cx, 0.95, 0, ex, at(tt, 2.35, 2.6));
  k.head.position.copy(mouthPt(c, BERJAS, P)).add(V(0, 0.3, 0)).addScaledVector(n, 0.3); k.head.intensity = gk * 0.5;
  cup.update(cx.t, 0.6);
};
const S5: SceneDef = {
  from: 26.5, to: 33.5, ...DAY,
  mk: mkSet("day", (k) => { k.W.setMenu(1); addCup(k, "ceramic", CUP_B); }),
  keys: [...cut(0, { pos: [0.2, 1.6, 6.2], look: [0.95, 1.2, 2.0], fov: 42 }, { pos: [0.3, 1.58, 5.8], look: [0.95, 1.2, 1.8], fov: 42 }, 2.4),
    ...cut(2.4, { pos: [1.12, 1.52, 3.65], look: [1.0, 1.4, 1.5], fov: 38 }, { pos: [1.07, 1.5, 3.1], look: [1.0, 1.42, 1.5], fov: 38 }, 4.6)],
  focus: (t) => (t < 2.4 ? [1.2, 1.3, 2.2] : [1.0, 1.45, 1.55]),
  act: (cx) => {
    const { t } = cx, c = cx.card(1); put(cx.card(0), BAPAK, actAt(B_HOPE, t), 0.62, OZ, cx);
    if (t < 2.4) { const u = at(t, 0, 2.25), x = lerp(1.5, BX, u), z = lerp(3.7, BZ, u); kk(cx.set).cups[0].update(t, 0.6);
      put(c, BERJAS, walk(actAt(BERJAS_ACT, t), t * 1.7, 1 - at(t, 1.9, 2.3)), x, z, cx, 0.95, 0, tieEx); }
    else actBerjas(cx, t, at(t, 4.1, 5.1) * 0.7, c);
  },
};

// ======================= 6. RIDICULE 3: neighbours whisper "it's only prestige" (33.5 - 38) =======================
const T1_ACT = actor(50, [{ t: 0, mood: "whisper", arms: ["rest", "mouthHand"], look: [0.7, 0], lean: 0.08 }, { t: 2.6, mood: "smug", arms: ["chest", "chest"], look: [0.5, 0] }], say("itu cuma gengsi", 0.3, 1.5, [2]));
const T2_ACT = actor(51, [{ t: 0, mood: "suspicious", arms: ["chest", "chest"], look: [-0.7, 0], lean: -0.06 }, { t: 2.2, mood: "whisper", arms: ["mouthHand", "rest"], look: [-0.6, 0] }], say("mana ada yang mau ngaku ketipu", 2.3, 3.9, [5]));
const S6: SceneDef = {
  from: 33.5, to: 38, ...DAY,
  mk: mkSet("day"),
  keys: [{ t: 0, pos: [-6.6, 1.5, 5.7], look: [-7.1, 1.65, 1.5], fov: 42 }, { t: 4.5, pos: [-6.7, 1.48, 5.2], look: [-7.12, 1.65, 1.5], fov: 42 }],
  focus: () => [-7.15, 1.3, 1.95],
  act: (cx) => {
    const { t } = cx; put(cx.card(0), TETANGGA1, actAt(T1_ACT, t), -7.45, 1.95, cx, 0.86); put(cx.card(1), TETANGGA2, actAt(T2_ACT, t), -6.85, 1.95, cx, 0.86);
    const b = cx.card(2), kb = at(t, 1.5, 2.0); b.custom((g) => drawMaskBubble(g, 300, 600, 1.4 * kb * (1 + 0.03 * Math.sin(t * 5))), -7.2, 1.9, cx.cam, cx.set.sunDir, 0.9, 1.25); b.shadow.visible = false; b.contact.visible = false;
  },
};

// ======================= 7. WEEK 1 -> MONTH 2: a small queue, new cups, the barista glances (38 - 45) =======================
const FRIEND = ANTRE[2], F_ACT = actor(52, [{ t: 0, mood: "excited", arms: ["rest", "point"], look: [-0.4, 0] }, { t: 1.6, mood: "story", arms: ["rest", "rest"] }]);
const BJ_Q = actor(53, [{ t: 0, mood: "story", arms: ["rest", "open"], look: [0.5, 0] }]);
const B_BUSY = actor(54, [{ t: 0, mood: "excited", arms: ["open", "clasp"], look: [0.4, 0.2] }, { t: 1.4, mood: "laugh", arms: ["clasp", "open"], look: [0.6, 0.1] }]);
const BAR_GLANCE = actor(55, [{ t: 0, mood: "suspicious", arms: ["clasp", "clasp"], look: [0.0, 0.0] }, { t: 1.0, mood: "worried", look: [0.3, 0] }]);
const S7: SceneDef = {
  from: 38, to: 45, ...DAY,
  mk: mkSet("day", (k) => { k.W.setMenu(1, 7); k.boxes = cupBoxes(); k.boxes.position.set(1.08, 0.742, 2.12); k.boxes.rotation.y = -0.2; k.boxes.scale.setScalar(0.72); k.W.root.add(k.boxes);
    for (const x of [0.62, 0.98, 1.3]) addCup(k, "ceramic", V(x, 0.968, 1.02)); k.W.setDay("MINGGU", 1); }),
  keys: [...cut(0, CAL, CAL2, 2.0), ...cut(2.0, { pos: [3.4, 1.95, 6.9], look: [1.4, 1.75, 1.6], fov: 46 }, { pos: [3.2, 1.9, 6.4], look: [1.35, 1.7, 1.6], fov: 46 }, 3.0),
    ...cut(5.0, { pos: [0.85, 1.6, 7.25], look: [0.72, 1.7, 14.45], fov: 15 }, { pos: [0.85, 1.6, 7.35], look: [0.72, 1.72, 14.45], fov: 13 }, 2.0)],
  focus: (t) => (t < 2 ? [2.93, 1.55, 2.25] : t < 5 ? [1.0, 1.2, 1.7] : [0.75, 1.7, 14.45]),
  act: (cx) => {
    const { t } = cx, k = kk(cx.set); k.W.setDay(t < 1.0 ? "MINGGU" : "BULAN", t < 1.0 ? 1 : 2); k.cups.forEach((c, i) => c.update(t + i, 0.8));
    put(cx.card(0), BAPAK, actAt(B_BUSY, t), 0.68, OZ, cx); put(cx.card(1), BERJAS, actAt(BJ_Q, t), 1.05, 1.5, cx, 0.95, 0, tieEx); put(cx.card(2), FRIEND, actAt(F_ACT, t), 1.42, 1.9, cx);
    put(cx.card(3), ANTRE[0], actAt(Q_ACT[0], t), 1.85, 2.35, cx); put(cx.card(4), ANTRE[1], actAt(Q_ACT[1], t + 2), 2.25, 2.85, cx, SC * 0.96);
    put(cx.card(5), BARISTA, actAt(BAR_GLANCE, t - 5), 0.72, 14.45, cx, SC, 0.28);
  },
};

// ======================= 8. THE CRITIC + the kitchen secret (45 - 54.5) =======================
const TX = 1.15, TZ = 1.76, CUP_G = V(0.94, 0.746, 2.0), CUP_C = V(1.36, 0.754, 2.0);
const KR_WALK = actor(56, [{ t: 0, mood: "angry", arms: ["rest", "rest"], look: [-0.4, 0.1] }, { t: 2.6, mood: "suspicious", look: [0, 0] }]);
const KR_ORDER = actor(57, [{ t: 0, mood: "suspicious", arms: ["point", "rest"], look: [-0.3, 0.4] }, { t: 1.4, arms: ["rest", "point"], look: [0.3, 0.4] }, { t: 2.6, mood: "smug", arms: ["hip", "hip"], look: [0, 0] }]);
const B_NERV = actor(58, [{ t: 0, mood: "nervous", sweat: true, arms: ["clasp", "clasp"], look: [0.6, 0.1] }]);
const B_SECRET = actor(59, [{ t: 0, mood: "nervous", sweat: true, arms: ["chest", "chest"], look: [0.6, 0.2] }, { t: 1.4, mood: "smug", look: [0, 0.4] }]);
const tableProps = (k: K) => { addCup(k, "glass", CUP_G); addCup(k, "ceramic", CUP_C);
  for (const [txt, x, col] of [["5.000", 0.94, "#2f6f4f"], ["50.000", 1.36, "#a0302a"]] as [string, number, string][]) { const tt = tent(txt, col); tt.position.set(x, 0.742, 2.27); k.W.root.add(tt); k.tents.push(tt); } };
const S8: SceneDef = {
  from: 45, to: 54.5, ...DAY,
  mk: mkSet("day", (k) => { k.W.setMenu(1, 7); tableProps(k); addSachet(k); addSachet(k); }),
  keys: [...cut(0, { pos: [2.75, 0.42, 4.1], look: [2.3, 1.05, 1.6], fov: 44 }, { pos: [1.75, 0.45, 3.9], look: [1.3, 1.05, 1.7], fov: 44 }, 3.0),
    ...cut(3.0, { pos: [1.15, 1.4, 3.95], look: [1.15, 1.02, 1.95], fov: 44 }, { pos: [1.15, 1.38, 3.7], look: [1.15, 1.04, 1.95], fov: 44 }, 3.2),
    ...cut(6.2, { pos: [0.82, 1.32, 1.95], look: [0.8, 1.17, 0.8], fov: 40 }, { pos: [0.82, 1.32, 1.82], look: [0.8, 1.17, 0.8], fov: 40 }, 3.3)],
  focus: (t) => (t < 3 ? [1.8, 1.2, 1.6] : t < 6.2 ? [TX, 1.0, 2.0] : [0.8, 1.17, 0.86]),
  act: (cx) => {
    const { t } = cx, k = kk(cx.set); k.cups.forEach((c) => c.update(t, 1));
    const [s1, s2] = k.sachets; s1.group.visible = s2.group.visible = t >= 6.2;
    if (t < 6.2) {
      put(cx.card(0), BAPAK, actAt(B_NERV, t), 0.62, OZ, cx);
      if (t < 3) { const u = at(t, 0, 2.7), x = lerp(2.75, TX, u), z = lerp(1.55, TZ, u); put(cx.card(1), KRITIKUS, walk(actAt(KR_WALK, t), t * 1.2, 1 - at(t, 2.5, 2.9), 1), x, z, cx, 0.86, 0, glassesEx); }
      else put(cx.card(1), KRITIKUS, actAt(KR_ORDER, t - 3), TX, TZ, cx, 0.86, 0, glassesEx);
    } else {
      cx.card(1).setVisible(false);
      const tw = t - 6.2, tear = at(tw, 0.7, 1.4), c = cx.card(0); let P = actAt(B_SECRET, tw);
      const pos = [V(0.67, 1.17 + 0.01 * Math.sin(tw * 3), 0.86), V(0.93, 1.17 + 0.01 * Math.sin(tw * 3 + 1), 0.86)];
      [s1, s2].forEach((s, i) => { s.group.position.copy(pos[i]); s.group.rotation.set(0, 0, (i ? -1 : 1) * 0.12); s.group.updateWorldMatrix(true, false); s.update(tw, tear, 0, pos[i], pos[i]); });
      P = reach(c, BAPAK, P, 0, s1.group.localToWorld(V(-0.025, -0.03, 0.006)), OX, OZ, cx);
      reach(c, BAPAK, P, 1, s2.group.localToWorld(V(0.025, -0.03, 0.006)), OX, OZ, cx);
    }
  },
};

// ======================= 9. THE TASTE TEST (54.5 - 61.5) =======================
const KR_TASTE = actor(60, [{ t: 0, mood: "suspicious", arms: ["rest", "rest"], look: [0, 0.3] }, { t: 1.2, mood: "neutral", look: [0, 0] }, { t: 1.9, mood: "angry", look: [0, 0] },
  { t: 3.1, mood: "suspicious", look: [0.2, 0.3] }, { t: 4.1, mood: "excited", look: [0, 0] }, { t: 6.0, mood: "smug", arms: ["chest", "rest"], look: [-0.3, 0.5] }],
  [...say("Pahit.", 2.0, 2.5, [0]), ...say("Biasa.", 2.7, 3.2, [0]), ...say("Ada cokelat.", 4.7, 5.4, [1]), ...say("Ada buah.", 5.6, 6.2, [1])]);
/** the critic's tasting: glass first (flat face), then the ceramic (eyes shut, glow). `tt` his clock, glow gain `gk` */
const actCritic = (cx: Ctx, tt: number, gk: number, c: ToonCard) => {
  const k = kk(cx.set), [cg, cc] = k.cups, n = camDir(cx.cam, TX, TZ), yaw = yawTo(cx.cam, TX, TZ);
  const l1 = at(tt, 0.2, 0.75) * (1 - at(tt, 1.45, 1.95)), s1 = at(tt, 0.7, 0.95) * (1 - at(tt, 1.25, 1.45));
  const l2 = at(tt, 3.2, 3.75) * (1 - 0.35 * at(tt, 4.5, 5.0)), s2 = at(tt, 3.7, 3.95) * (1 - at(tt, 4.3, 4.5));
  const glow = at(tt, 4.2, 5.0) * gk, shut = tt > 3.85 && tt < 6.0, stars = clamp01((tt - 6.0) / 0.9) * 5;
  let P = actAt(KR_TASTE, tt); if (shut) P = { ...eyesShut(P), mouth: tt > 4.6 ? P.mouth : { kind: "smile", open: 0.2 }, head: { ...P.head, rot: P.head.rot + 0.1 * at(tt, 3.9, 4.4) } };
  const ex = both(glassesEx, glowEx(KRITIKUS, glow, cx.t), (g, Q) => { if (tt > 5.8) { const [x, y] = handPoint(KRITIKUS, Q, 0); drawNotebook(g, x + 10, y, stars); } });
  cg.group.position.copy(CUP_G); cg.group.rotation.set(0, 0, 0); cc.group.position.copy(CUP_C).add(V(0, 0.012, 0)); cc.group.rotation.set(0, yaw, 0);
  if (tt < 3.0) P = reach(c, KRITIKUS, P, 0, (q) => cupPath(cg, CUP_G, mouthPt(q, KRITIKUS, P), n, l1, s1, yaw, V(TX, 0, TZ)).add(V(-0.084, 0, 0)), TX, TZ, cx, 0.86, 0, ex, at(tt, 0.0, 0.2) * (1 - at(tt, 1.95, 2.2)));
  else P = reach(c, KRITIKUS, P, 1, (q) => cupPath(cc, CUP_C.clone().add(V(0, 0.012, 0)), mouthPt(q, KRITIKUS, P), n, l2, s2, yaw, V(TX, 0, TZ)), TX, TZ, cx, 0.86, 0, ex, at(tt, 3.0, 3.2));
  k.head.position.copy(mouthPt(c, KRITIKUS, P)).add(V(0, 0.3, 0)).addScaledVector(n, 0.3); k.head.intensity = glow * 0.5;
  cg.update(cx.t, 0.8); cc.update(cx.t, 0.8);
};
const S9: SceneDef = {
  from: 54.5, to: 61.5, ...DAY,
  mk: mkSet("day", (k) => { k.W.setMenu(1, 7); tableProps(k); }),
  keys: [{ t: 0, pos: [1.2, 1.38, 3.45], look: [1.15, 1.18, 1.85], fov: 38 }, { t: 3.6, pos: [1.2, 1.38, 3.35], look: [1.15, 1.2, 1.85], fov: 38 }, { t: 5.2, pos: [1.18, 1.4, 3.0], look: [1.15, 1.26, 1.8], fov: 36 }, { t: 7, pos: [1.18, 1.4, 2.95], look: [1.15, 1.26, 1.8], fov: 36 }],
  focus: () => [TX, 1.28, 1.9],
  act: (cx) => { put(cx.card(0), BAPAK, actAt(B_NERV, cx.t), 0.62, OZ, cx); actCritic(cx, cx.t, 1, cx.card(1)); },
};

// ======================= 10. THE TURN: everyone goes quiet; replays show the light was real (61.5 - 73.5) =======================
const still = (seed: number, mood: Beat["mood"], arms: [string, string], look: [number, number]) => actor(seed, [{ t: 0, mood, arms: arms as ["rest", "rest"], look }]);
const QUIET = { istri: still(61, "surprised", ["mouthHand", "rest"], [0.5, 0]), bar: still(62, "shock", ["rest", "rest"], [0.6, 0]), bapak: still(63, "surprised", ["clasp", "clasp"], [0.6, 0.1]) };
const S10: SceneDef = {
  from: 61.5, to: 73.5, ...DAY, bloom: 0.75,
  mk: mkSet("day", (k) => { k.W.setMenu(1, 7); tableProps(k); addCup(k, "ceramic", CUP_B); }),
  keys: [...cut(0, { pos: [0.25, 1.55, 5.7], look: [0.2, 1.22, 1.8], fov: 42 }, { pos: [0.25, 1.55, 5.55], look: [0.2, 1.22, 1.8], fov: 42 }, 2.6),
    ...cut(2.6, { pos: [1.08, 1.5, 3.3], look: [1.0, 1.42, 1.5], fov: 36 }, { pos: [1.04, 1.5, 3.0], look: [1.0, 1.45, 1.5], fov: 34 }, 4.6),
    ...cut(7.2, { pos: [1.18, 1.4, 3.15], look: [1.15, 1.26, 1.8], fov: 36 }, { pos: [1.16, 1.4, 2.75], look: [1.15, 1.32, 1.8], fov: 33 }, 4.8)],
  focus: (t) => (t < 2.6 ? [0.2, 1.3, 2.3] : t < 7.2 ? [1.0, 1.5, 1.55] : [TX, 1.35, 1.8]),
  act: (cx) => {
    const { t } = cx, k = kk(cx.set); const [cg, cc, cb] = k.cups;
    const hideAll = () => { for (let i = 0; i < 6; i++) cx.card(i).setVisible(false); };
    if (t < 2.6) { // frozen faces; the critic sits in the middle still glowing faintly
      cb.group.visible = cb.saucer.visible = false; [cg, cc].forEach((c) => c.update(t, 0.8));
      put(cx.card(0), BAPAK, actAt(QUIET.bapak, 0.5), OX, OZ, cx); put(cx.card(1), ISTRI, actAt(QUIET.istri, 0.5), -0.5, 2.35, cx, 0.86);
      put(cx.card(2), BARISTA, actAt(QUIET.bar, 0.5), 0.18, 2.95, cx); cx.card(3).setVisible(false);
      cx.card(4).setVisible(false);
    } else if (t < 7.2) { // replay 1, slow: the man in the suit, now the light is plain to see
      hideAll(); [cg, cc].forEach((c) => (c.group.visible = c.saucer.visible = false)); cb.group.visible = cb.saucer.visible = true;
      const kb = kk(cx.set); kb.cups = [cb, cg, cc]; put(cx.card(0), BAPAK, actAt(B_HOPE, 4.5), 0.62, OZ, cx);
      actBerjas(cx, 2.9 + (t - 2.6) * 0.55, 0.4 + 0.6 * at(t, 3.2, 5.0), cx.card(4)); kb.cups = [cg, cc, cb];
    } else { // replay 2: the critic, the light grows past anything we saw before
      hideAll(); cb.group.visible = cb.saucer.visible = false; [cg, cc].forEach((c) => (c.group.visible = c.saucer.visible = true));
      put(cx.card(0), BAPAK, actAt(B_NERV, t), 0.62, OZ, cx); actCritic(cx, 3.3 + (t - 7.2) * 0.6, 1.0, cx.card(5));
    }
  },
};

// ======================= 11. NIGHT: he tests it on himself (73.5 - 84.6, then black) =======================
const G1 = V(0.62, 0.964, 0.76), G2 = V(0.98, 0.964, 0.76), NX = 0.8, NZ = 0.5;
const B_NIGHT = actor(64, [{ t: 0, mood: "neutral", arms: ["chest", "chest"], look: [0, 0.5] }, { t: 3.0, mood: "smug", look: [0.2, 0.5] }, { t: 5.5, mood: "neutral", look: [0, 0] },
  { t: 6.9, mood: "suspicious", look: [0, 0.2] }, { t: 7.6, mood: "neutral" }, { t: 8.5, mood: "surprised", look: [0, 0.45] }, { t: 9.2, mood: "nervous", look: [-0.8, 0] },
  { t: 9.6, look: [0.8, 0] }, { t: 10.0, mood: "smug", look: [0, 0.3] }]);
const S11: SceneDef = {
  from: 73.5, to: 84.6, ...NIGHT,
  mk: mkSet("night", (k) => { k.W.setMenu(1, 9); addCup(k, "glass", G1); addCup(k, "glass", G2); k.label = sticker(); k.W.root.add(k.label); k.W.setDay("BULAN", 2); }),
  keys: [...cut(0, { pos: [-2.2, 1.65, 7.7], look: [0.8, 2.5, 0.6], fov: 50 }, { pos: [-1.9, 1.6, 7.1], look: [0.7, 2.2, 0.6], fov: 50 }, 3.0),
    ...cut(3.0, { pos: [0.83, 1.27, 1.9], look: [0.8, 1.04, 0.76], fov: 40 }, { pos: [0.83, 1.25, 1.8], look: [0.8, 1.04, 0.76], fov: 40 }, 2.5),
    ...cut(5.5, { pos: [0.86, 1.52, 2.5], look: [0.8, 1.36, 0.6], fov: 38 }, { pos: [0.84, 1.52, 2.05], look: [0.8, 1.4, 0.55], fov: 36 }, 5.6)],
  focus: (t) => (t < 3 ? [0.8, 1.3, 0.7] : t < 5.5 ? [0.8, 1.03, 0.76] : [0.8, 1.4, 0.55]),
  act: (cx) => {
    const { t, cam } = cx, k = kk(cx.set), [g1, g2] = k.cups, c = cx.card(0), n = camDir(cam, NX, NZ), yaw = yawTo(cam, NX, NZ);
    const stick = at(t, 4.0, 4.25); k.label!.visible = t > 4.0; k.label!.scale.setScalar(0.4 + 0.6 * stick);
    const l1 = at(t, 5.7, 6.2) * (1 - at(t, 6.8, 7.2)), s1 = at(t, 6.15, 6.4) * (1 - at(t, 6.6, 6.8));
    const l2 = at(t, 7.3, 7.8) * (1 - 0.45 * at(t, 8.4, 8.9)) + 0.45 * at(t, 10.1, 10.5), s2 = at(t, 7.75, 8.0) * (1 - at(t, 8.3, 8.5)) + 1.25 * at(t, 10.3, 10.9);
    const glow = at(t, 8.0, 8.9) * 0.95;
    let P = actAt(B_NIGHT, t); if ((s1 > 0.4 && t < 7) || (s2 > 0.4)) P = eyesShut(P);
    if (t > 10.3) P = { ...P, head: { ...P.head, dy: P.head.dy - 8 * at(t, 10.3, 10.8), rot: P.head.rot - 0.12 * at(t, 10.3, 10.8) } };
    const ex = glowEx(BAPAK, glow, t);
    g1.group.position.copy(G1); g1.group.rotation.set(0, 0, 0); g2.group.position.copy(G2); g2.group.rotation.set(0, 0, 0);
    if (t < 3.0) { P = reach(c, BAPAK, P, 1, G2.clone().add(V(0.045, 0.04, 0)), NX, NZ, cx, SB, 0, ex); }
    else if (t < 5.5) { P = reach(c, BAPAK, P, 1, G2.clone().add(V(0.045, 0.035, 0)), NX, NZ, cx, SB, 0, ex); P = reach(c, BAPAK, P, 0, G2.clone().add(V(-0.005, 0.05, 0.04)), NX, NZ, cx, SB, 0, ex, at(t, 3.5, 4.0) * (1 - at(t, 4.5, 5.0))); }
    else if (t < 7.25) P = reach(c, BAPAK, P, 0, (q) => cupPath(g1, G1, mouthPt(q, BAPAK, P), n, l1, s1, yaw, V(NX, 0, NZ)).add(V(-0.084, 0, 0)), NX, NZ, cx, SB, 0, ex, at(t, 5.5, 5.7) * (1 - at(t, 7.2, 7.25)));
    else P = reach(c, BAPAK, P, 1, (q) => cupPath(g2, G2, mouthPt(q, BAPAK, P), n, l2, Math.min(1.25, s2), yaw, V(NX, 0, NZ)), NX, NZ, cx, SB, 0, ex, at(t, 7.25, 7.4));
    // the sticker rides on the front of glass 2
    g2.group.updateWorldMatrix(true, false); k.label!.position.copy(g2.group.localToWorld(V(0, 0.05, 0.036))); k.label!.quaternion.copy(g2.group.quaternion);
    k.head.position.copy(mouthPt(c, BAPAK, P)).add(V(0, 0.4, 0)).addScaledVector(n, 0.5); k.head.intensity = glow * 0.3;
    g1.update(t, 0.9); g2.update(t, 0.9); g2.coffee.visible = t < 10.75;
  },
};

export const KOPI_SCENES = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11];
export const KOPI_FRAMES = 85 * FPS;
export const KopiFilm: React.FC = () => <Reel scenes={KOPI_SCENES} />;
