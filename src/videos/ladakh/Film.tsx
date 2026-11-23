// "Menara Es Dolma" (~116 s), formula A V2. Script: docs/scripts/menara-es-ladakh-naskah-v1.md.
// Rules:
// - No on-screen text. Narration and subtitles are added in CapCut.
// - Everything is 3D except the people, who are 2D cards. Objects use downloaded models.
// - Props are really held. The camera is calm and holds at stops.
// - Characters hold still between beats, heads are small, and Dolma never smiles knowingly.
import React from "react";
import * as THREE from "three";
import { continueRender, delayRender } from "remotion";
import { actAt, FPS, sm } from "../../lib/acting";
import { Pose, CharSpec } from "../../lib/toon2";
import { SU, ToonCard } from "../../lib/toonCard";
import { Reel, SceneDef, SetLike, Ctx, handWorld, V3 } from "../../lib/scene";
import { TEX, SpritePool, drawShockLines } from "../kopi/fx";
import { canvasTex } from "../ketindihan2/sets";
import { DOLMA, TASHI, WARGA_A, WARGA_B, WARGA_C, DOLMA_X, TASHI_X, WARGA_A_X, WARGA_C_X, headAt, both, Ex } from "./cast";
import { loadModels, hasModels, mdl, recolor } from "./models";
import { LembahSet, LembahOpts, IceStupa, TIP_SIDE, STUPA, STUPA_R, STALL, GATE, CHANNEL, PIPE, PIT, DOLMA_HOUSE, streamX, thermometer, heightAt } from "./lembah";
import { V, at, lerp, say, actor, cardPt, camDir, put, reach, path, goTo, nod, freezeArm, shake, crouch, onLadder, headW, move, hold1, dip, twoShot, breathEx, headlampEx, coldEx, P3 } from "./rig";

// ---------------- look ----------------
type Look = Pick<SceneDef, "fog" | "dens" | "bg" | "cInf" | "env" | "exposure" | "bloom" | "sat" | "contrast" | "grade" | "night">;
const DAY: Look = { fog: "#c8d6e8", dens: 0.0014, bg: "#9cc4ec", cInf: 6, env: 0.4, exposure: 0.0, bloom: 0.55, sat: 0.14, contrast: 0.1, grade: [[0.42, 0.48, 0.6], [0.64, 0.56, 0.46], 0.22] };
const SPRING: Look = { ...DAY, fog: "#d8d2c4", grade: [[0.44, 0.48, 0.58], [0.68, 0.56, 0.42], 0.26], sat: 0.16 };
const NIGHT: Look = { fog: "#0c1428", dens: 0.0025, bg: "#0a1022", cInf: 4, env: 0.1, exposure: 0.02, bloom: 1.0, sat: 0.08, contrast: 0.14, night: true, grade: [[0.32, 0.4, 0.62], [0.6, 0.58, 0.55], 0.3] };

// ---------------- props + hands ----------------
type FX = { cups: THREE.Object3D[]; hands: THREE.Mesh[]; puff: SpritePool; dust: SpritePool; snowdust: SpritePool; ladder: THREE.Object3D; shovel: THREE.Object3D; buckets: THREE.Object3D[]; letter: THREE.Mesh; pen: THREE.Mesh; stick: THREE.Mesh;
  pipePiece: THREE.Mesh; seeds: THREE.InstancedMesh; lamp: THREE.SpotLight; lampT: THREE.Object3D; torch: THREE.Group; valve: THREE.Group };
/** the offer letter: `vis` lines fully written, `strikes` lines struck through (fractional = being struck), the next
 *  line written up to `writ` (0..1) */
const letterTex = (vis: number, strikes: number, writ: number) => canvasTex(512, 640, (g) => {
  g.fillStyle = "#f3eedf"; g.fillRect(0, 0, 512, 640); g.strokeStyle = "rgba(120,100,70,0.25)"; g.lineWidth = 1; for (let y = 120; y < 620; y += 34) { g.beginPath(); g.moveTo(30, y); g.lineTo(482, y); g.stroke(); }
  g.fillStyle = "#1f2c58"; g.font = "bold 40px Georgia, serif"; g.fillText("OFFER FOR LAND", 52, 78);
  g.font = "26px Georgia, serif"; g.fillText("Field of Dolma, for guesthouse", 52, 140);
  // a small doodle of the guesthouse he wants to build, top right, clear of the amounts
  g.strokeStyle = "#1f2c58"; g.lineWidth = 3; g.strokeRect(372, 190, 108, 58); g.beginPath(); g.moveTo(364, 190); g.lineTo(426, 162); g.lineTo(488, 190); g.stroke(); for (let i = 0; i < 3; i++) g.strokeRect(382 + i * 32, 200, 18, 18); g.strokeRect(416, 226, 20, 22);
  const amts = ["\u20b9 8,00,000", "\u20b9 6,00,000", "\u20b9 4,50,000"]; g.font = "bold 52px Georgia, serif";
  for (let i = 0; i < 3; i++) { const y = 300 + i * 100, x = 52, w = i < vis ? 1 : i === vis ? writ : 0; if (w <= 0) continue;
    g.save(); g.beginPath(); g.rect(x - 8, y - 60, 300 * w + 8, 80); g.clip(); g.fillStyle = "#1f2c58"; g.fillText(amts[i], x, y); g.restore();
    const sk = Math.max(0, Math.min(1, strikes - i)); if (sk > 0) { g.strokeStyle = "#c81e28"; g.lineWidth = 7; g.beginPath(); g.moveTo(x - 6, y - 16); g.lineTo(x - 6 + 300 * sk, y - 22 + 6 * sk); g.stroke(); } }
  g.font = "italic 30px Georgia, serif"; g.fillStyle = "#1f2c58"; g.fillText("Tashi", 380, 606);
});
/** text row centre of amount line i, as a fraction of the letter height (for the pen) */
const ROWV = (i: number) => (300 + i * 100 - 18) / 640;
const LETTER_TEX: Record<string, THREE.Texture> = {};
const addFx = (R: THREE.Object3D): FX => {
  const hand = () => { const h = new THREE.Mesh(new THREE.SphereGeometry(17 * SU, 20, 14), new THREE.MeshBasicMaterial({ color: "#191514" })); h.visible = false; h.renderOrder = 10; R.add(h); return h; };
  const pm = new THREE.MeshStandardMaterial({ color: "#1c1c1e", roughness: 0.45 });
  const torch = new THREE.Group(); torch.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.026, 0.2, 12).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#c83a2a", roughness: 0.4 })));
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.024, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.3, 1.9), toneMapped: false })); lens.position.z = 0.101; torch.add(lens);
  const valve = new THREE.Group(); const vm = new THREE.MeshStandardMaterial({ color: "#3a4a6a", metalness: 0.6, roughness: 0.35 });
  valve.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 12), pm).translateY(0.35)); const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 8, 20), new THREE.MeshStandardMaterial({ color: "#c82a24", metalness: 0.4, roughness: 0.4 })); wheel.position.y = 0.78; wheel.rotation.x = Math.PI / 2; valve.add(wheel);
  valve.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.12), vm).translateY(0.66)); valve.traverse((x) => { (x as THREE.Mesh).castShadow = true; });
  const F: FX = {
    hands: [0, 1, 2, 3, 4, 5].map(hand), cups: [0, 1].map(() => mdl("cup")), puff: new SpritePool(R, TEX.puff, 90, false, "#f4f8ff"), dust: new SpritePool(R, TEX.dust, 50, false, "#c8b8a0"), snowdust: new SpritePool(R, TEX.puff, 80, false, "#f2f8ff"),
    ladder: recolor(mdl("ladder", 1.68), { Brown: "#8a5e36" }), shovel: mdl("shovel"), buckets: [0, 1, 2, 3, 4].map(() => mdl("bucket")),
    letter: new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.27), new THREE.MeshStandardMaterial({ map: letterTex(1, 0, 0), color: "#d8d2c2", roughness: 0.85, side: THREE.DoubleSide })),
    pen: new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 8), new THREE.MeshStandardMaterial({ color: "#1f3a8a", roughness: 0.3 })),
    stick: new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 1.3, 8), new THREE.MeshStandardMaterial({ color: "#6a4a2a", roughness: 0.8 })),
    pipePiece: new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 12), pm),
    seeds: new THREE.InstancedMesh(new THREE.SphereGeometry(0.008, 5, 4), new THREE.MeshStandardMaterial({ color: "#d8b870", roughness: 0.6 }), 300),
    lamp: new THREE.SpotLight("#fff2d8", 0, 9, 0.55, 0.6, 1.6), lampT: new THREE.Object3D(), torch, valve,
  };
  F.seeds.count = 0; F.seeds.frustumCulled = false; F.lamp.target = F.lampT; F.lamp.castShadow = true; F.lamp.shadow.mapSize.set(1024, 1024);
  for (const o of [...F.cups, F.ladder, F.shovel, ...F.buckets, F.letter, F.pen, F.stick, F.pipePiece, F.seeds, F.lamp, F.lampT, F.torch, F.valve]) { R.add(o); (o as THREE.Mesh).castShadow = true; }
  return F;
};
const fxBegin = (F: FX) => { for (const p of [F.puff, F.dust, F.snowdust]) p.begin(); F.hands.forEach((h) => (h.visible = false)); for (const g of [...F.cups, F.ladder, F.shovel, ...F.buckets, F.letter, F.pen, F.stick, F.pipePiece, F.torch, F.valve]) g.visible = false; F.seeds.count = 0; F.lamp.intensity = 0; };
const fxEnd = (F: FX) => { for (const p of [F.puff, F.dust, F.snowdust]) p.end(); };
/** a ball hand on a grip point, nudged to the camera side of the prop so the prop is clearly HELD */
const hold = (F: FX, i: number, p: THREE.Vector3, cam: THREE.Camera, sc = 1) => { const h = F.hands[i]; h.position.copy(p).addScaledVector(cam.position.clone().sub(p).normalize(), 0.03 * sc); h.scale.setScalar(sc); h.visible = true; };
type WithFx = { fx: FX };
const mk = (o: LembahOpts = {}) => () => { const k = new LembahSet(o) as LembahSet & WithFx; k.fx = addFx(k.root); return k as unknown as SetLike; };
const K_ = (cx: Ctx) => cx.set as unknown as LembahSet & WithFx;
const sunlit = (c: ToonCard) => { c.shade = 0.42; c.liftCol = "255,236,206"; c.shadeCol = "60,80,150"; };
const nightC = (c: ToonCard) => { c.shade = 0.75; c.liftCol = "150,180,255"; c.shadeCol = "14,20,56"; };
const setLetter = (F: FX, vis: number, strikes: number, writ = 0) => { const q = (x: number) => Math.round(x * 10) / 10, key = `${vis}_${q(strikes)}_${q(writ)}`; if (!LETTER_TEX[key]) LETTER_TEX[key] = letterTex(vis, q(strikes), q(writ)); (F.letter.material as THREE.MeshStandardMaterial).map = LETTER_TEX[key]; (F.letter.material as THREE.MeshStandardMaterial).needsUpdate = true; };
const shockEx = (S: CharSpec, k: number): Ex => (g, P) => { if (k <= 0.01) return; const [x, y] = headAt(S, P); drawShockLines(g, x, y - S.R * 0.1, S.R, k); };

// ---------------- the ladder on the cone ----------------
/** ladder leaning on the cone at azimuth `az` (radians, from +x toward +z), reaching height `top` */
const ladderAt = (h: number, az: number, top = h - 0.7) => {
  const rTop = STUPA_R * Math.pow(Math.max(0.02, 1 - top / h), 0.9) + 0.42, len = 1.68 * 3.6, run = Math.sqrt(Math.max(0.5, len * len - top * top)), rBase = rTop + run;
  const dir = V(Math.cos(az), 0, Math.sin(az)), base = STUPA.clone().addScaledVector(dir, rBase), tp = STUPA.clone().addScaledVector(dir, rTop).add(V(0, top, 0));
  return { base, top: tp, dir, pt: (y: number) => base.clone().lerp(tp, y / top), out: (y: number, d: number) => base.clone().lerp(tp, y / top).addScaledVector(dir, d) };
};
const placeLadder = (F: FX, L: ReturnType<typeof ladderAt>) => {
  F.ladder.visible = true; const up = L.top.clone().sub(L.base).normalize(), side = V(-L.dir.z, 0, L.dir.x), fw = side.clone().cross(up).normalize();
  F.ladder.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, up, fw)); F.ladder.position.copy(L.base);
};

// ======================================================================================================
// S1 HOOK (0 - 10): frame 0 bright: Dolma on the ladder at the top of the ice cone, fitting a new pipe piece; the spray
//   glitters above. Then pull back and up: the cone stands alone in the brown valley under the snow peaks.
const H1 = 4.8, AZ1 = 1.95;
const D1 = actor(11, [{ t: 0, mood: "neutral", arms: ["rest", "rest"], look: [0.55, -0.55] }, { t: 3.4, mood: "neutral", look: [0.35, -0.35] }, { t: 6.2, mood: "neutral", look: [-0.3, 0.35] }]);
/** Dolma on the ladder. With `push` >= 0 she holds a new pipe section in both hands, its far end on the nozzle at the
 *  cone tip (push 1 = still 10 cm short, 0 = fitted); otherwise one hand holds the ladder rail. */
const dolmaOnLadder = (cx: Ctx, F: FX, P0: Pose, h: number, y: number, ext: Ex, push: number, c = cx.card(0)) => {
  const L = ladderAt(h, AZ1); placeLadder(F, L); const p = L.out(y, 0.28); let P = onLadder(P0);
  put(c, DOLMA, P, p.x, p.z, cx, p.y, ext);
  if (push >= 0) { const n = camDir(cx.cam, p.x, p.z), right = V(n.z, 0, -n.x), sd = Math.sign(V(STUPA.x - p.x, 0, STUPA.z - p.z).dot(right)) || 1;
    const A = cardPt(c, P.x + sd * DOLMA.bodyW * 0.42, 975 - DOLMA.legLen + P.bob - DOLMA.bodyH * 0.78).addScaledVector(n, 0.16), B = V(STUPA.x, h + 0.52 + 0.1 * push, STUPA.z), d = B.clone().sub(A);
    const g0 = A.clone(), g1 = A.clone().addScaledVector(d, 0.24);
    P = reach(c, DOLMA, P, sd > 0 ? 0 : 1, g0, p.x, p.z, cx, p.y, ext); P = reach(c, DOLMA, P, sd > 0 ? 1 : 0, g1, p.x, p.z, cx, p.y, ext); hold(F, 0, g0, cx.cam); hold(F, 1, g1, cx.cam);
    const a0 = A.clone().addScaledVector(d, -0.06); F.pipePiece.visible = true; F.pipePiece.position.copy(a0.clone().lerp(B, 0.5)); F.pipePiece.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().normalize()); F.pipePiece.scale.set(0.75, B.distanceTo(a0) / 0.55, 0.75); }
  else { const g = L.pt(y + 1.05).addScaledVector(L.dir, 0.06); P = reach(c, DOLMA, P, 1, g, p.x, p.z, cx, p.y, ext); hold(F, 1, g, cx.cam); }
  return P;
};
const S1: SceneDef = {
  from: 0, to: 10, ...DAY, mk: mk({ season: "winter", stupa: H1, trench: 2, shadowAt: [0, 0, -7], shadowSize: 11 }),
  keys: [...hold1(0, 5.4, { pos: [2.9, 3.4, -0.6], look: [-0.45, 4.45, -7.0], fov: 42 }, [0.06, 0.02, 0.06]),
    ...move(5.4, 10, [{ pos: [2.96, 3.42, -0.54], look: [-0.45, 4.45, -7.0], fov: 42 }, { pos: [5, 6, 7], look: [0, 4.0, -9], fov: 46 }, { pos: [6, 10.5, 17], look: [-1, 3.5, -12], fov: 46 }])],
  focus: (t) => (t < 5.4 ? [-0.5, H1, -6.6] : [0, 3, -8]),
  act: (cx) => {
    const { t } = cx, k = K_(cx), F = k.fx; fxBegin(F); sunlit(cx.card(0)); k.sprayAt(t, 1);
    dolmaOnLadder(cx, F, actAt(D1, t), H1, 3.5, both(DOLMA_X, coldEx(DOLMA, 0.6)), 1 - at(t, 1.2, 3.0));
    fxEnd(F);
  },
};

// S2 STAKES (10 - 22)
//   a 10-14.2 wide: frozen terraced fields, Dolma in her field among last year's thin stubble (failed harvest)
//   b 14.2-17 two-shot at her field edge: Tashi holds out a paper; she takes it
//   c 17-19 insert: the offer in her hands
//   d 19-22 Tashi paces her field with big measuring steps, counting; Dolma at the cone base behind
const D2a = actor(21, [{ t: 0, mood: "neutral", arms: ["rest", "rest"], look: [0.2, -0.6] }]);
const S2a: SceneDef = {
  from: 10, to: 14.2, ...DAY, mk: mk({ season: "winter", stupa: H1, trench: 2, stubble: true, shadowAt: [4, 0, 0], shadowSize: 14 }), fadeAt: dip(4.2, 0.25, 0),
  keys: [...move(0, 4.2, [{ pos: [9.5, 7.5, 16.5], look: [3, 1.0, -2], fov: 44 }, { pos: [9.2, 6.4, 14], look: [3.5, 1.2, -2.5], fov: 42 }], (x) => x)],
  focus: () => [5.5, 1, 3.5],
  act: (cx) => { const { t } = cx, k = K_(cx), F = k.fx; fxBegin(F); sunlit(cx.card(0)); k.sprayAt(t + 10, 1);
    put(cx.card(0), DOLMA, actAt(D2a, t), 5.5, 3.5, cx, 0, DOLMA_X); fxEnd(F); },
};
const T2b = actor(22, [{ t: 0, mood: "smug", arms: ["rest", "rest"], turn: 0.4, look: [0.85, 0] }, { t: 1.25, mood: "smug", arms: ["hip", "hip"] }, { t: 2.2, mood: "smug", arms: ["hip", "hip"], look: [0.8, 0.1] }]);
const D2b = actor(23, [{ t: 0, mood: "neutral", arms: ["rest", "rest"], turn: -0.4, look: [-0.85, 0] }, { t: 1.2, mood: "neutral", arms: ["chest", "chest"], look: [-0.2, 0.55] }]);
const TA2: [number, number] = [0.2, 2.2], DA2: [number, number] = [1.5, 2.0];
const S2b: SceneDef = {
  from: 14.2, to: 17, ...DAY, mk: mk({ season: "winter", stupa: H1, trench: 2, stubble: true, shadowAt: [1, 0, 2], shadowSize: 9 }),
  keys: [...hold1(0, 2.8, twoShot(TA2, DA2, 4.6, { h: 1.42, ly: 1.1, fov: 38 }), [0.05, 0, -0.05])],
  focus: () => [0.85, 1.2, 2.1],
  act: (cx) => {
    const { t, cam } = cx, F = K_(cx).fx; fxBegin(F); sunlit(cx.card(0)); sunlit(cx.card(1)); K_(cx).sprayAt(t + 14, 1);
    let PT = actAt(T2b, t); put(cx.card(0), TASHI, PT, TA2[0], TA2[1], cx, 0, TASHI_X); let PD = actAt(D2b, t); put(cx.card(1), DOLMA, PD, DA2[0], DA2[1], cx, 0, DOLMA_X);
    setLetter(F, 1, 0); F.letter.visible = true; const n = camDir(cam, 0.85, 2.1);
    const give = at(t, 0.5, 1.2), take = at(t, 1.2, 1.6), mid = V(0.85, 1.15, 2.1).addScaledVector(n, 0.25), fromT = handWorld(cx.card(0), TASHI, PT, 1);
    const pos = t < 1.2 ? fromT.clone().lerp(mid, give) : mid.clone().lerp(cardPt(cx.card(1), PD.x, 975 - DOLMA.legLen + PD.bob - DOLMA.bodyH * 0.55).addScaledVector(n, 0.15), take);
    F.letter.position.copy(pos); F.letter.lookAt(pos.clone().add(n)); F.letter.rotateZ(0.1);
    if (t < 1.25) { PT = reach(cx.card(0), TASHI, PT, 1, pos.clone().add(V(-0.08, -0.06, 0)), TA2[0], TA2[1], cx, 0, TASHI_X); hold(F, 2, pos.clone().add(V(-0.08, -0.06, 0)), cam); }
    if (t > 1.2) { const gl = pos.clone().add(V(-0.09, -0.1, 0)), gr = pos.clone().add(V(0.09, -0.1, 0)); PD = reach(cx.card(1), DOLMA, PD, 0, gl, DA2[0], DA2[1], cx, 0, DOLMA_X); PD = reach(cx.card(1), DOLMA, PD, 1, gr, DA2[0], DA2[1], cx, 0, DOLMA_X); hold(F, 0, gl, cam); hold(F, 1, gr, cam); }
    fxEnd(F);
  },
};
const S2c: SceneDef = {
  from: 17, to: 19, ...DAY, mk: mk({ season: "winter", stupa: H1, trench: 2, stubble: true, shadowAt: [1, 0, 2], shadowSize: 6 }), cInf: 0.9,
  keys: [...hold1(0, 2, { pos: [1.36, 1.4, 2.78], look: [1.5, 1.1, 2.06], fov: 32 }, [0.0, 0.0, -0.05])],
  focus: () => [1.5, 1.1, 2.06],
  act: (cx) => { const { cam } = cx, F = K_(cx).fx; fxBegin(F); setLetter(F, 1, 0); F.letter.visible = true; const p = V(1.5, 1.1, 2.06); F.letter.position.copy(p); F.letter.lookAt(cam.position); F.letter.rotateX(-0.12); F.letter.rotateZ(0.05); F.letter.updateMatrixWorld(true);
    hold(F, 0, F.letter.localToWorld(V(-0.086, -0.108, 0.012)), cam, 0.42); hold(F, 1, F.letter.localToWorld(V(0.086, -0.104, 0.012)), cam, 0.42); fxEnd(F); },
};
const T2d = actor(24, [{ t: 0, mood: "smug", arms: ["hip", "hip"], look: [0.4, 0.2] }, { t: 1.1, mood: "smug", arms: ["point", "hip"], look: [-0.3, -0.3] }, { t: 2.0, mood: "smug", arms: ["hip", "point"], look: [0.3, -0.4] }]);
const D2d = actor(25, [{ t: 0, mood: "neutral", arms: ["rest", "rest"], look: [0.6, 0.1] }]);
const S2d: SceneDef = {
  from: 19, to: 22, ...DAY, mk: mk({ season: "winter", stupa: H1, trench: 2, stubble: true, shadowAt: [4, 0, 0], shadowSize: 12 }), fadeAt: dip(3, 0, 0.25),
  keys: [...hold1(0, 3, { pos: [9.5, 1.6, 8.5], look: [3.8, 1.5, -2.5], fov: 42 }, [0.05, 0, -0.08])],
  focus: () => [5, 1.2, 1.5],
  act: (cx) => { const { t } = cx, F = K_(cx).fx; fxBegin(F); sunlit(cx.card(0)); sunlit(cx.card(1)); K_(cx).sprayAt(t + 19, 1);
    const w = path(t, 0, 3, [2.6, 0.2], [7.6, 2.6], 1.05); put(cx.card(0), TASHI, goTo(actAt(T2d, t), w, 1.3), w.x, w.z, cx, 0, TASHI_X);
    put(cx.card(1), DOLMA, actAt(D2d, t), 2.9, -4.3, cx, 0, DOLMA_X); fxEnd(F); },
};

// S3 FALSE READING (22 - 31)
//   a 22-27 two-shot at the cone base: Dolma turns the valve wheel; Tashi: "Air kok dijadiin patung? ..."
//   b 27-31 the tea stall: two villagers with steaming glasses whisper, glancing toward the cone
const VALVE: [number, number] = [2.25, -4.65], DA3: [number, number] = [2.8, -5.05], TA3: [number, number] = [3.0, -3.95];
const TQ3 = say("Air kok dijadiin patung? Musim dingin gini, air nggak ada gunanya!", 0.6, 4.4, [3, 8, 9]);
const T3 = actor(31, [{ t: 0, mood: "smug", arms: ["rest", "rest"], turn: 0.45, look: [0.85, 0] }, { t: 0.6, mood: "suspicious", arms: ["rest", "open"] }, { t: 2.2, mood: "angry", arms: ["shrug", "shrug"], look: [0.9, 0] }, { t: 4.5, mood: "smug", arms: ["hug", "hug"] }], TQ3);
const D3 = actor(32, [{ t: 0, mood: "neutral", arms: ["rest", "rest"], turn: -0.3, look: [-0.3, 0.45] }, { t: 3.6, mood: "neutral", look: [-0.85, 0.05] }, { t: 4.4, look: [-0.2, 0.45] }]);
const S3a: SceneDef = {
  from: 22, to: 27, ...DAY, mk: mk({ season: "winter", stupa: 5.0, trench: 2, shadowAt: [3, 0, -4], shadowSize: 9 }),
  keys: [...hold1(0, 5, twoShot(TA3, DA3, 4.7, { h: 1.5, ly: 1.25, fov: 40 }), [0.05, 0, -0.06])],
  focus: () => [2.9, 1.2, -4.5],
  act: (cx) => {
    const { t, cam } = cx, k = K_(cx), F = k.fx; fxBegin(F); sunlit(cx.card(0)); sunlit(cx.card(1)); k.sprayAt(t + 22, 1);
    F.valve.visible = true; F.valve.position.set(VALVE[0], 0, VALVE[1]); const wheel = F.valve.children[1] as THREE.Mesh; wheel.rotation.z = t * 1.6;
    const P = actAt(D3, t); put(cx.card(0), DOLMA, P, DA3[0], DA3[1], cx, 0, DOLMA_X);
    const wc = V(VALVE[0], 0.78, VALVE[1]), a = t * 1.6, g0 = wc.clone().add(V(Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12)), g1 = wc.clone().add(V(Math.cos(a + Math.PI) * 0.12, 0, Math.sin(a + Math.PI) * 0.12));
    let Q = reach(cx.card(0), DOLMA, P, 0, g0, DA3[0], DA3[1], cx, 0, DOLMA_X); Q = reach(cx.card(0), DOLMA, Q, 1, g1, DA3[0], DA3[1], cx, 0, DOLMA_X); hold(F, 0, g0, cam, 0.9); hold(F, 1, g1, cam, 0.9);
    put(cx.card(1), TASHI, actAt(T3, t), TA3[0], TA3[1], cx, 0, both(TASHI_X, breathEx(TASHI, t, 0.6, 1)));
    fxEnd(F);
  },
};
const WQ3 = say("Kasihan, gagal panen bikin dia stres.", 1.0, 3.2, [0, 5]);
const A3 = actor(33, [{ t: 0, mood: "whisper", arms: ["chest", "chest"], turn: 0.4, look: [0.8, 0.1] }, { t: 0.9, mood: "whisper", arms: ["chest", "mouthHand"] }, { t: 3.3, mood: "worried", arms: ["chest", "chest"], look: [-0.85, 0.05] }], WQ3);
const B3 = actor(34, [{ t: 0, mood: "worried", arms: ["chest", "chest"], turn: -0.35, look: [-0.8, 0.05] }, { t: 2.2, mood: "suspicious", look: [-0.9, 0.0] }, { t: 3.2, mood: "worried", look: [-0.8, 0.1], nod: 1 }]);
const WA3: [number, number] = [18.9, -7.45], WB3: [number, number] = [18.9, -6.2];
const cupIn = (cx: Ctx, F: FX, c: ToonCard, S: CharSpec, P0: Pose, x: number, z: number, ext: Ex | undefined, cup: THREE.Object3D, side: 0 | 1, hi: number) => {
  put(c, S, P0, x, z, cx, 0, ext); const n = camDir(cx.cam, x, z), p = cardPt(c, P0.x + (side ? 1 : -1) * S.bodyW * 0.25, 975 - S.legLen + P0.bob - S.bodyH * 0.62).addScaledVector(n, 0.16);
  const P = reach(c, S, P0, side, p.clone().add(V(0, -0.02, 0)), x, z, cx, 0, ext); cup.visible = true; cup.position.copy(p).add(V(0, -0.06, 0)); hold(F, hi, p.clone().add(V(0, -0.01, 0)).addScaledVector(n, 0.04), cx.cam, 0.6);
  for (let i = 0; i < 3; i++) { const u = ((cx.t * 0.5 + i / 3) % 1); F.puff.add(p.clone().add(V(0.01 * Math.sin(i * 4 + cx.t), 0.05 + u * 0.32, 0)), 0.05 + u * 0.12, 0.35 * Math.sin(u * Math.PI), i); }
  return P;
};
const S3b: SceneDef = {
  from: 27, to: 31, ...DAY, mk: mk({ season: "winter", stupa: 5.0, trench: 2, shadowAt: [19, 0, -7], shadowSize: 9 }), fadeAt: dip(4, 0.25, 0.25),
  keys: [...hold1(0, 4, { pos: [14.0, 1.5, -6.6], look: [19.0, 1.2, -6.85], fov: 38 }, [0.06, 0, -0.03])],
  focus: () => [18.9, 1.2, -6.8],
  act: (cx) => { const { t } = cx, F = K_(cx).fx; fxBegin(F); sunlit(cx.card(0)); sunlit(cx.card(1));
    cupIn(cx, F, cx.card(0), WARGA_A, actAt(A3, t), WA3[0], WA3[1], WARGA_A_X, F.cups[0], 0, 0);
    cupIn(cx, F, cx.card(1), WARGA_B, actAt(B3, t), WB3[0], WB3[1], undefined, F.cups[1], 1, 1);
    fxEnd(F); },
};

// S4 ESCALATION (31 - 44)
//   a 31-35.5 night: Dolma digs the long trench with a head torch, breath steaming; the black pipe waits beside it
//   b 35.5-38.5 the thermometer on her wall: -22
//   c 38.5-41.5 day, the tea stall table: Tashi strikes his number and writes a lower one, twice
//   d 41.5-44 Tashi at the table, smug, tapping the pen
const DIG = PIPE.getPointAt(0.5), DIGT = PIPE.getTangentAt(0.5).setY(0).normalize(), DPERP = V(-DIGT.z, 0, DIGT.x);
const D4 = actor(41, [{ t: 0, mood: "worried", arms: ["rest", "rest"], look: [0.5, -0.5] }]);
// she stands beside the trench end; the camera looks across the trench from the other side
const DX4 = DIG.x + DPERP.x * 0.6 - DIGT.x * 0.25, DZ4 = DIG.z + DPERP.z * 0.6 - DIGT.z * 0.25;
const S4a: SceneDef = {
  from: 31, to: 35.5, ...NIGHT, mk: mk({ season: "winter", night: true, stupa: 1.6, trench: 0.5, shadowAt: [DIG.x, 0, DIG.z], shadowSize: 10 }), fadeAt: dip(4.5, 0.35, 0),
  keys: [...hold1(0, 4.5, { pos: [DIG.x - DPERP.x * 3.6 + DIGT.x * 0.9, DIG.y + 1.45, DIG.z - DPERP.z * 3.6 + DIGT.z * 0.9], look: [DX4 + DIGT.x * 0.25, DIG.y + 0.8, DZ4 + DIGT.z * 0.25], fov: 40 }, [0.05, 0, -0.05])],
  focus: () => [DX4, DIG.y + 0.8, DZ4],
  act: (cx) => {
    const { t, cam } = cx, F = K_(cx).fx; fxBegin(F); nightC(cx.card(0));
    const x = DX4, z = DZ4, y = heightAt(x, z), cyc = (t * 0.7) % 1, dig = cyc < 0.45 ? sm(cyc / 0.45) : 1 - sm((cyc - 0.45) / 0.55), ex = both(DOLMA_X, headlampEx(DOLMA), breathEx(DOLMA, t, 1, 1));
    let P = actAt(D4, t); P = { ...P, body: { ...P.body, lean: P.body.lean + 0.14 * dig } }; put(cx.card(0), DOLMA, P, x, z, cx, y, ex);
    // the blade goes into the trench end beside her (to the side on screen, not in front of her body)
    const blade = V(DIG.x + DIGT.x * 0.45, DIG.y + 0.02 + 0.22 * (1 - dig), DIG.z + DIGT.z * 0.45), me = V(x, blade.y, z), handle = blade.clone().add(V(0, 1.0, 0)).lerp(me.clone().add(V(0, 1.0, 0)), 0.55 + 0.1 * dig);
    F.shovel.visible = true; F.shovel.position.copy(blade); F.shovel.quaternion.setFromUnitVectors(V(0, 1, 0), handle.clone().sub(blade).normalize());
    const g0 = blade.clone().lerp(handle, 0.6), g1 = blade.clone().lerp(handle, 0.97);
    P = reach(cx.card(0), DOLMA, P, 0, g0, x, z, cx, y, ex); P = reach(cx.card(0), DOLMA, P, 1, g1, x, z, cx, y, ex); hold(F, 0, g0, cam); hold(F, 1, g1, cam);
    if (dig > 0.85) for (let i = 0; i < 6; i++) F.dust.add(blade.clone().add(V((i - 3) * 0.06, 0.1 + 0.05 * i, 0)), 0.15, 0.4, i);
    const hw = headW(cx.card(0), DOLMA, P); F.lamp.intensity = 6; F.lamp.position.copy(hw).add(V(0, 0.12, 0)); F.lampT.position.copy(blade);
    fxEnd(F);
  },
};
const THERMO = V(DOLMA_HOUSE.x - 3.04, 1.65, DOLMA_HOUSE.z - 1.6);
const S4b: SceneDef = {
  from: 35.5, to: 38.5, ...NIGHT, mk: () => { const k = mk({ season: "winter", night: true, stupa: 2.2, trench: 1, shadowAt: [THERMO.x, 0, THERMO.z], shadowSize: 6 })() as unknown as LembahSet & WithFx;
    const th = thermometer(-22); th.position.copy(THERMO); th.rotation.y = -Math.PI / 2; k.root.add(th);
    const bulb = new THREE.PointLight("#ffb866", 1.6, 5, 2); bulb.position.copy(THERMO).add(V(-0.4, 0.9, 0.9)); k.root.add(bulb); return k as unknown as SetLike; },
  keys: [...move(0, 3, [{ pos: [THERMO.x - 0.75, THERMO.y + 0.05, THERMO.z + 0.12], look: [THERMO.x, THERMO.y + 0.02, THERMO.z], fov: 32 }, { pos: [THERMO.x - 0.55, THERMO.y - 0.12, THERMO.z + 0.05], look: [THERMO.x, THERMO.y - 0.12, THERMO.z], fov: 30 }], (x) => x)],
  focus: () => [THERMO.x, THERMO.y - 0.1, THERMO.z], cInf: 1.2,
  act: (cx) => { const { t } = cx, F = K_(cx).fx; fxBegin(F); for (let i = 0; i < 10; i++) { const u = ((t * 0.25 + i / 10) % 1); F.puff.add(V(THERMO.x - 0.25 - 0.1 * u, THERMO.y - 0.4 + u * 0.6, THERMO.z + 0.35 - u * 0.5), 0.12 + u * 0.3, 0.12 * Math.sin(u * Math.PI), i); } fxEnd(F); },
};
/** the clear spot on the tea-stall table top, measured from the model (LembahSet.tableFree): 19.33, 0.423, -6.70 */
const TABLE = V(19.36, 0.423, -6.70);
const S4c: SceneDef = {
  from: 38.5, to: 41.5, ...DAY, mk: mk({ season: "winter", stupa: 3.2, trench: 2, shadowAt: [TABLE.x, 0, TABLE.z], shadowSize: 4 }), cInf: 0.8,
  keys: [...hold1(0, 3, { pos: [TABLE.x + 0.02, TABLE.y + 0.55, TABLE.z - 0.38], look: [TABLE.x, TABLE.y, TABLE.z - 0.02], fov: 36 }, [0.0, -0.02, 0.0])],
  focus: () => [TABLE.x - 0.05, TABLE.y, TABLE.z],
  act: (cx) => { const { t, cam } = cx, F = K_(cx).fx; fxBegin(F);
    // strike line 0, write line 1, strike line 1, write line 2
    const s1 = at(t, 0.15, 0.6), w1 = at(t, 0.7, 1.3), s2 = at(t, 1.55, 2.0), w2 = at(t, 2.1, 2.7);
    const vis = w1 >= 1 ? (w2 >= 1 ? 3 : 2) : 1, strikes = s1 + s2, writ = vis === 1 ? w1 : vis === 2 ? w2 : 0; setLetter(F, vis, strikes, writ);
    const p = V(TABLE.x, TABLE.y + 0.003, TABLE.z); F.letter.visible = true; F.letter.position.copy(p); F.letter.rotation.set(-Math.PI / 2, 0, Math.PI + 0.06); // seen from the -z side of the table: text top points +z, away from the camera
    // letter coords: u across the text (0 left .. 1 right), v down the page (0 top .. 1 bottom)
    const lp = (u: number, v: number) => p.clone().add(V(-(u - 0.5) * 0.21, 0, (0.5 - v) * 0.27));
    const writing = (w: number) => w > 0 && w < 1, striking = (k: number) => k > 0 && k < 1;
    let tip: THREE.Vector3, down = true;
    if (striking(s1)) tip = lp(0.1 + 0.57 * s1, ROWV(0)); else if (writing(w1)) tip = lp(0.1 + 0.55 * w1, ROWV(1) + 0.012 * Math.sin(w1 * 50)); else if (striking(s2)) tip = lp(0.1 + 0.57 * s2, ROWV(1)); else if (writing(w2)) tip = lp(0.1 + 0.55 * w2, ROWV(2) + 0.012 * Math.sin(w2 * 50));
    else { down = false; tip = lp(t < 1.4 ? 0.7 : 0.72, t < 1.4 ? ROWV(1) - 0.04 : ROWV(2) - 0.04); }
    tip.y = TABLE.y + 0.006 + (down ? 0 : 0.03);
    const back = V(-0.02, 0.065, -0.035); F.pen.visible = true; F.pen.position.copy(tip).addScaledVector(back, 0.5); F.pen.quaternion.setFromUnitVectors(V(0, 1, 0), back.clone().normalize());
    hold(F, 0, tip.clone().addScaledVector(back, 0.85), cam, 0.32); fxEnd(F); },
};
const T4d = actor(43, [{ t: 0, mood: "smug", arms: ["hug", "hug"], look: [0.2, 0.5] }, { t: 1.2, mood: "smug", look: [-0.6, 0.2] }]);
const S4d: SceneDef = {
  from: 41.5, to: 44, ...DAY, mk: mk({ season: "winter", stupa: 3.6, trench: 2, shadowAt: [19, 0, -6.5], shadowSize: 6 }), fadeAt: dip(2.5, 0, 0.3),
  keys: [...hold1(0, 2.5, { pos: [14.7, 1.45, -6.9], look: [18.95, 1.2, -7.25], fov: 36 }, [0.04, 0, -0.03])],
  focus: () => [18.9, 1.3, -6.7],
  act: (cx) => { const { t, cam } = cx, F = K_(cx).fx; fxBegin(F); sunlit(cx.card(0)); const x = 18.95, z = -7.3; let P = actAt(T4d, t); P = nod(P, t, 1.4, 2, 10);
    put(cx.card(0), TASHI, P, x, z, cx, 0, TASHI_X); void cam; fxEnd(F); },
};

// S5 THE WATCHER (44 - 56)
//   a 44-48 night: Tashi peeks over the boundary wall at the glittering cone, an unlit torch in his hand
//   b 48-52 time-lapse, locked wide: night after night the cone grows taller but no wider; Tashi pops up in new spots
//   c 52-56 day: Tashi taps the ice with a stick, it rings like stone; "Kalau cuma es, aku bisa bikin lebih banyak."
const T5a = actor(51, [{ t: 0, mood: "suspicious", arms: ["rest", "rest"], look: [0.85, -0.1] }, { t: 1.6, mood: "surprised", look: [0.75, -0.35] }, { t: 2.6, mood: "suspicious", look: [0.85, -0.25] }]);
const S5a: SceneDef = {
  from: 44, to: 48, ...NIGHT, mk: mk({ season: "winter", night: true, stupa: 3.0, trench: 2, shadowAt: [-3, 0, -4], shadowSize: 8 }), fadeAt: dip(4, 0.3, 0),
  keys: [...hold1(0, 4, { pos: [-0.9, 1.05, -0.6], look: [-4.1, 0.95, -3.0], fov: 40 }, [0.03, 0, -0.06])],
  focus: () => [-4.2, 0.9, -3.0],
  act: (cx) => { const { t, cam } = cx, k = K_(cx), F = k.fx; fxBegin(F); nightC(cx.card(0)); k.sprayAt(t + 44, 1);
    const x = -4.2, z = -3.0, ex = both(TASHI_X, breathEx(TASHI, t, 0.7, 1)); let P = crouch(actAt(T5a, t), 0.62);
    P = { ...P, head: { ...P.head, dy: P.head.dy - 30 * at(t, 0.2, 0.7) } }; put(cx.card(0), TASHI, P, x, z, cx, 0, ex);
    const n = camDir(cam, x, z), tp = cardPt(cx.card(0), P.x - TASHI.bodyW * 0.42, 975 - TASHI.legLen + P.bob - TASHI.bodyH * 0.7).addScaledVector(n, 0.18);
    P = reach(cx.card(0), TASHI, P, 0, tp, x, z, cx, 0, ex); F.torch.visible = true; F.torch.position.copy(tp); F.torch.lookAt(tp.clone().add(V(1, 0.3, 0))); hold(F, 0, tp, cam, 0.85); fxEnd(F); },
};
const SPOTS5: [number, number, number, number][] = [[0, 1.0, WALL_X_(-0.6), -1.5], [1.0, 2.0, WALL_X_(-0.6), -7.5], [2.0, 3.0, WALL_X_(-0.6), -12.0], [3.0, 4.0, WALL_X_(-0.6), -4.4]];
function WALL_X_(d: number) { return -3.5 + d; }
const T5b = actor(52, [{ t: 0, mood: "suspicious", arms: ["rest", "rest"], look: [0.85, -0.2] }, { t: 1.0, mood: "surprised", look: [0.85, -0.3] }, { t: 2.0, mood: "worried", look: [0.85, -0.3] }, { t: 3.0, mood: "suspicious", look: [0.8, -0.4] }]);
const S5b: SceneDef = {
  from: 48, to: 52, ...NIGHT, mk: mk({ season: "winter", night: true, stupa: 2.0, trench: 2, shadowAt: [-1.5, 0, -5], shadowSize: 12 }), fadeAt: dip(4, 0.25, 0),
  keys: [...hold1(0, 4, { pos: [2.5, 3.0, 12.0], look: [-2.5, 2.2, -5.0], fov: 48 }, [0.0, 0, -0.04])],
  focus: () => [-2.5, 2, -5],
  act: (cx) => { const { t } = cx, k = K_(cx), F = k.fx; fxBegin(F); nightC(cx.card(0)); const h = lerp(2.0, 6.3, sm(t / 4)); k.stupa!.setH(h); k.sprayAt(t * 3 + 48, 1);
    if (k.moon) k.moon.position.applyAxisAngle(V(0, 1, 0), 0); const sp = SPOTS5.find(([a, b]) => t >= a && t < b) ?? SPOTS5[3]; let P = crouch(actAt(T5b, t), 0.55);
    P = { ...P, head: { ...P.head, dy: P.head.dy - 25 } }; put(cx.card(0), TASHI, P, sp[2], sp[3], cx, 0, TASHI_X); fxEnd(F); },
};
const TQ5 = say("Kalau cuma es... aku bisa bikin lebih banyak.", 1.6, 3.9, [2, 5]);
const T5c = actor(53, [{ t: 0, mood: "suspicious", arms: ["rest", "rest"], turn: 0.3, look: [0.8, -0.2] }, { t: 0.9, mood: "surprised", look: [0.8, -0.1] }, { t: 1.5, mood: "smug", arms: ["rest", "hip"], turn: 0.05, look: [0.1, 0.2] }, { t: 3.3, mood: "excited", arms: ["rest", "up"], look: [-0.5, 0.2] }], TQ5);
const TC5: [number, number] = [-3.0, -5.2];
const S5c: SceneDef = {
  from: 52, to: 56, ...DAY, mk: mk({ season: "winter", stupa: 6.2, trench: 2, shadowAt: [-2, 0, -6], shadowSize: 8 }), fadeAt: dip(4, 0.3, 0.25),
  keys: [...hold1(0, 4, { pos: [0.8, 1.45, -2.2], look: [-2.6, 1.1, -5.6], fov: 40 }, [0.04, 0, -0.04])],
  focus: () => [TC5[0], 1.2, TC5[1]],
  act: (cx) => { const { t, cam } = cx, k = K_(cx), F = k.fx; fxBegin(F); sunlit(cx.card(0)); k.sprayAt(t + 52, 1);
    let P = actAt(T5c, t); const tap = t < 1.4 ? Math.max(0, Math.sin(t * 9)) : 0; put(cx.card(0), TASHI, P, TC5[0], TC5[1], cx, 0, TASHI_X);
    const n = camDir(cam, TC5[0], TC5[1]), hand = cardPt(cx.card(0), P.x + TASHI.bodyW * 0.5, 975 - TASHI.legLen + P.bob - TASHI.bodyH * 0.45).addScaledVector(n, 0.1);
    const toCone = V(STUPA.x - TC5[0], 0, STUPA.z - TC5[1]).normalize(), tipP = hand.clone().addScaledVector(toCone, 1.0 - 0.12 * tap).add(V(0, -0.15, 0));
    if (t < 1.5) { P = reach(cx.card(0), TASHI, P, 1, hand, TC5[0], TC5[1], cx, 0, TASHI_X); F.stick.visible = true; F.stick.position.copy(hand.clone().lerp(tipP, 0.5)); F.stick.quaternion.setFromUnitVectors(V(0, 1, 0), tipP.clone().sub(hand).normalize()); hold(F, 1, hand, cam);
      if (tap > 0.95) for (let i = 0; i < 5; i++) F.snowdust.add(tipP.clone().add(V(0.04 * (i - 2), 0.05 * i, 0)), 0.08, 0.6, i); }
    fxEnd(F); },
};

// S6 THE COPY (56 - 64)
//   a 56-59 Tashi lifts the slab of his sluice gate; water spreads over his whole field
//   b 59-61.8 from high: his wide flat sheet of ice beside her narrow cone
//   c 61.8-64 Tashi poses on his ice, slips, flails, catches himself
const T6a = actor(61, [{ t: 0, mood: "excited", arms: ["rest", "rest"], look: [-0.3, -0.5] }, { t: 1.2, mood: "smug", arms: ["rest", "up"], look: [0.5, -0.3] }]);
const S6a: SceneDef = {
  from: 56, to: 59, ...DAY, mk: mk({ season: "winter", stupa: 6.2, trench: 2, flat: { fill: 0, ice: 0 }, shadowAt: [-8, 0, -10], shadowSize: 12 }),
  keys: [...move(0, 3, [{ pos: [-0.8, 2.6, -19.8], look: [-5.6, 0.7, -13.0], fov: 44 }, { pos: [-0.6, 3.8, -20.4], look: [-7.5, 0.3, -10.0], fov: 46 }], sm)],
  focus: (t) => [-6 - 3 * at(t, 0, 3), 0.5, -13 + 3 * at(t, 0, 3)],
  act: (cx) => { const { t, cam } = cx, k = K_(cx), F = k.fx; fxBegin(F); sunlit(cx.card(0)); k.flat!.U.uFill.value = at(t, 0.6, 3.0) * 1.05; k.flat!.U.uIce.value = 0;
    const x = -4.2, z = -16.05; let P = actAt(T6a, t); put(cx.card(0), TASHI, P, x, z, cx, 0, TASHI_X);
    const ly = 0.62 + 0.36 * sm(at(t, 0.2, 0.9)); k.gateSlab.position.y = ly; k.gateSlab.rotation.x = -0.25 * at(t, 0.2, 0.9);
    const g0 = V(GATE.x + 0.3, ly + 0.03, GATE.z - 1.52), g1 = V(GATE.x + 0.3, ly + 0.03, GATE.z - 1.28);
    P = reach(cx.card(0), TASHI, P, 0, g0, x, z, cx, 0, TASHI_X); P = reach(cx.card(0), TASHI, P, 1, g1, x, z, cx, 0, TASHI_X); hold(F, 0, g0, cam); hold(F, 1, g1, cam);
    for (let i = 0; i < 14; i++) { const u = ((t * 1.3 + i / 14) % 1); F.puff.add(V(GATE.x + (i % 3 - 1) * 0.15, 0.1 + 0.15 * Math.sin(u * 3), GATE.z - 1.1 + u * 1.2), 0.18, 0.25 * (1 - u) * at(t, 0.5, 0.8), i); }
    fxEnd(F); },
};
const S6b: SceneDef = {
  from: 59, to: 61.8, ...DAY, mk: mk({ season: "winter", stupa: 6.3, trench: 2, flat: { fill: 1.05, ice: 1 }, shadowAt: [-5, 0, -6], shadowSize: 16 }), fadeAt: dip(2.8, 0.25, 0),
  keys: [...move(0, 2.8, [{ pos: [7.5, 17, -7], look: [-6, 0, -6.2], fov: 50 }, { pos: [8.2, 18.2, -7], look: [-6, 0, -6.2], fov: 50 }], (x) => x)],
  focus: () => [-5, 0, -6],
  act: (cx) => { const { t } = cx, k = K_(cx), F = k.fx; fxBegin(F); k.sprayAt(t + 59, 1); fxEnd(F); },
};
const T6c = actor(62, [{ t: 0, mood: "smug", arms: ["hip", "hip"], look: [0.3, 0.3] }, { t: 0.9, mood: "shock", arms: ["up", "up"], event: "shockSmall", look: [0, -0.3] }, { t: 1.6, mood: "nervous", arms: ["open", "open"], look: [-0.3, -0.5] }, { t: 2.0, mood: "smug", arms: ["hip", "hip"], look: [0.3, 0.3] }]);
const S6c: SceneDef = {
  from: 61.8, to: 64, ...DAY, mk: mk({ season: "winter", stupa: 6.3, trench: 2, flat: { fill: 1.05, ice: 1 }, shadowAt: [-10, 0, -4], shadowSize: 8 }), fadeAt: dip(2.2, 0, 0.3),
  keys: [...hold1(0, 2.2, { pos: [-7.4, 1.3, -1.0], look: [-10.4, 1.1, -4.6], fov: 40 }, [0.03, 0, -0.05])],
  focus: () => [-10.4, 1, -4.6],
  act: (cx) => { const { t } = cx, F = K_(cx).fx; fxBegin(F); sunlit(cx.card(0)); let P = actAt(T6c, t);
    const sl = at(t, 0.85, 1.05) * (1 - at(t, 1.5, 1.95)); P = { ...P, legs: [{ a: [-20 - 60 * sl, 116 - 20 * sl], b: [-30 - 90 * sl, 0] }, { a: [20 + 30 * sl, 116 - 30 * sl], b: [30 + 40 * sl, -40 * sl] }], body: { ...P.body, lean: P.body.lean - 0.25 * sl * Math.sin(t * 14) } };
    put(cx.card(0), TASHI, P, -10.4 + 0.25 * sl, -4.6, cx, 0.035, both(TASHI_X, shockEx(TASHI, sl))); fxEnd(F); },
};

// S7 MARCH (64 - 77)
//   a 64-70 time-lapse from high: the sun swings across; his ice sheet shrinks into puddles that run off; the cone
//     only drips
//   b 70-74 crack! The top of the cone snaps and falls; two villagers point: "Tuh kan, runtuh juga."
//   c 74-77 Dolma at the base, flat face; the cone is hardly smaller
const S7a: SceneDef = {
  from: 64, to: 70, ...SPRING, mk: mk({ season: "march", stupa: 6.3, trench: 2, flat: { fill: 1.05, ice: 1, melt: 0 }, shadowAt: [-4, 0, -5], shadowSize: 16, stream: "dry" }), fadeAt: dip(6, 0.3, 0),
  keys: [...hold1(0, 6, { pos: [8.2, 18.2, -7], look: [-6, 0, -6.2], fov: 50 }, [0.05, 0, 0])],
  focus: () => [-4.5, 0, -5],
  act: (cx) => { const { t } = cx, k = K_(cx), F = k.fx; fxBegin(F); const u = at(t, 0.3, 5.6); k.flat!.U.uMelt.value = u * 1.05; k.flat!.U.uDry.value = at(t, 4.0, 6.0) * 0.6;
    k.sunTurn(-1.3 + 2.6 * ((t / 1.5) % 1), 0.3 + 0.25 * Math.sin(((t / 1.5) % 1) * Math.PI)); k.stupa!.setMelt(0.6); k.stupa!.drip(t * 2, 0.6); k.stupa!.setH(6.3 - 0.25 * u); fxEnd(F); },
};
const VQ7 = say("Tuh kan, runtuh juga.", 1.8, 3.2, [1, 2]);
const A7 = actor(71, [{ t: 0, mood: "neutral", arms: ["chest", "chest"], look: [-0.7, -0.4] }, { t: 0.6, mood: "shock", event: "shockSmall", look: [-0.7, -0.5] }, { t: 1.6, mood: "smug", arms: ["chest", "point"], look: [-0.85, -0.2] }], VQ7);
const B7 = actor(72, [{ t: 0, mood: "neutral", arms: ["rest", "rest"], look: [-0.7, -0.4] }, { t: 0.6, mood: "surprised", look: [-0.75, -0.5] }, { t: 1.9, mood: "suspicious", arms: ["hug", "hug"], look: [-0.85, -0.2], nod: 1 }]);
const S7b: SceneDef = {
  from: 70, to: 74, ...SPRING, mk: mk({ season: "march", stupa: 6.05, trench: 2, flat: { fill: 1.05, ice: 1, melt: 1.05, dry: 0.6 }, shadowAt: [4, 0, -4], shadowSize: 12, stream: "dry" }),
  keys: [...hold1(0, 4, { pos: [11.5, 2.0, 3.8], look: [1.6, 3.4, -7.0], fov: 46 }, [0.05, 0, -0.06])],
  focus: () => [5, 1.5, -3],
  act: (cx) => { const { t } = cx, k = K_(cx), F = k.fx; fxBegin(F); sunlit(cx.card(0)); sunlit(cx.card(1)); k.stupa!.setMelt(0.6); k.stupa!.drip(t + 70, 0.6);
    const fall = at(t, 0.55, 1.25); k.stupa!.breakTip(fall);
    if (t > 1.2) { const land = STUPA.clone().addScaledVector(TIP_SIDE, 3.4).add(V(0, 0.2, 0)); for (let i = 0; i < 26; i++) { const u = Math.min(1, (t - 1.2) / 1.6), a = i * 2.4; F.snowdust.add(land.clone().add(V(Math.cos(a) * (0.3 + u * 1.6), 0.1 + u * 0.9 * ((i % 4) / 4 + 0.3), Math.sin(a) * (0.3 + u * 1.2))), 0.35 + u * 0.8, 0.7 * (1 - u), i); } }
    put(cx.card(0), WARGA_A, actAt(A7, t), 7.6, -0.05, cx, 0, both(WARGA_A_X, shockEx(WARGA_A, at(t, 0.6, 0.75) * (1 - at(t, 1.2, 1.5)))));
    put(cx.card(1), WARGA_B, actAt(B7, t), 7.9, -1.1, cx); fxEnd(F); },
};
const D7c = actor(73, [{ t: 0, mood: "neutral", arms: ["rest", "rest"], look: [0.1, -0.2] }, { t: 1.6, mood: "neutral", look: [-0.5, -0.6] }]);
const S7c: SceneDef = {
  from: 74, to: 77, ...SPRING, mk: mk({ season: "march", stupa: 6.05, trench: 2, tipBroken: true, flat: { fill: 1.05, ice: 1, melt: 1.05, dry: 0.7 }, shadowAt: [2, 0, -5], shadowSize: 10, stream: "dry" }), fadeAt: dip(3, 0, 0.35),
  keys: [...hold1(0, 3, { pos: [8.0, 2.2, 1.6], look: [0.6, 2.8, -7.4], fov: 46 }, [0.04, 0, -0.06])],
  focus: () => [2.9, 1.2, -4.0],
  act: (cx) => { const { t } = cx, k = K_(cx), F = k.fx; fxBegin(F); sunlit(cx.card(0)); k.stupa!.setMelt(0.6); k.stupa!.drip(t + 74, 0.6); k.stupa!.breakTip(1);
    put(cx.card(0), DOLMA, actAt(D7c, t), 3.2, -3.9, cx, 0, DOLMA_X); fxEnd(F); },
};

// S8 APRIL (77 - 90): the reversal, events first, no explanation
//   a 77-80.5 the stream bed is bone dry; a villager stands in it with an empty bucket
//   b 80.5-83.5 Tashi alone in his dry field
//   c 83.5-86.5 silence, then a drip: the cone base drips into the channel; follow the shining water down to her field
//   d 86.5-90 Dolma sows barley along the wet channel
const A8 = actor(81, [{ t: 0, mood: "worried", arms: ["rest", "rest"], look: [0.2, -0.6] }, { t: 1.6, mood: "worried", look: [-0.6, -0.1] }]);
const SX8 = streamX(-3);
const S8a: SceneDef = {
  from: 77, to: 80.5, ...SPRING, mk: mk({ season: "april", stupa: 4.4, trench: 2, tipBroken: true, flat: { melt: 1.2 }, shadowAt: [SX8, 0, -3], shadowSize: 8, stream: "dry" }), fadeAt: dip(3.5, 0.4, 0),
  keys: [...hold1(0, 3.5, { pos: [SX8 - 0.6, 2.4, 4.2], look: [SX8 - 0.1, 0.7, -4.0], fov: 42 }, [0.06, 0, -0.06])],
  focus: () => [SX8, 0.8, -3.2],
  act: (cx) => { const { t, cam } = cx, F = K_(cx).fx; fxBegin(F); sunlit(cx.card(0)); const x = SX8, z = -3.2; let P = actAt(A8, t); put(cx.card(0), WARGA_A, P, x, z, cx, 0, WARGA_A_X);
    const n = camDir(cam, x, z), hp = cardPt(cx.card(0), P.x + WARGA_A.bodyW * 0.55, 975 - WARGA_A.legLen + P.bob - WARGA_A.bodyH * 0.35).addScaledVector(n, 0.12); P = reach(cx.card(0), WARGA_A, P, 1, hp, x, z, cx, 0, WARGA_A_X);
    const b = F.buckets[0]; b.visible = true; b.position.copy(hp).add(V(0, -0.36, 0)); b.rotation.set(0.15, 0.4, 0.1); hold(F, 1, hp, cam); fxEnd(F); },
};
const T8 = actor(82, [{ t: 0, mood: "worried", arms: ["rest", "rest"], look: [0.3, -0.7] }, { t: 1.4, mood: "worried", arms: ["open", "open"], look: [0.0, 0.6] }, { t: 2.4, mood: "nervous", arms: ["chest", "chest"], look: [0.85, 0] }]);
const S8b: SceneDef = {
  from: 80.5, to: 83.5, ...SPRING, mk: mk({ season: "april", stupa: 4.4, trench: 2, tipBroken: true, flat: { melt: 1.2 }, shadowAt: [-11, 0, -5], shadowSize: 10, stream: "dry" }), fadeAt: dip(3, 0.25, 0),
  keys: [...move(0, 3, [{ pos: [-11.0, 6.5, 6.0], look: [-11.0, 0.6, -5.0], fov: 46 }, { pos: [-11.0, 4.8, 3.5], look: [-11.0, 0.8, -5.0], fov: 44 }], (x) => x)],
  focus: () => [-11, 1, -5],
  act: (cx) => { const { t } = cx, F = K_(cx).fx; fxBegin(F); sunlit(cx.card(0)); put(cx.card(0), TASHI, actAt(T8, t), -11, -5, cx, 0, TASHI_X); fxEnd(F); },
};
const S8c: SceneDef = {
  from: 83.5, to: 86.5, ...SPRING, mk: mk({ season: "april", stupa: 4.4, trench: 2, tipBroken: true, channel: 1, flat: { melt: 1.2 }, shadowAt: [3, 0, -3], shadowSize: 8, stream: "dry" }), fadeAt: dip(3, 0.3, 0),
  keys: [...hold1(0, 1.0, { pos: [7.5, 1.6, -5.5], look: [2.2, 0.7, -6.2], fov: 38 }, [0, 0, 0]), ...move(1.0, 3, [{ pos: [7.5, 1.6, -5.5], look: [2.2, 0.7, -6.2], fov: 38 }, { pos: [5.8, 1.7, -2.2], look: [3.6, 0.1, -0.8], fov: 40 }, { pos: [7.4, 1.7, 2.8], look: [5.1, 0.05, 5.4], fov: 42 }])],
  focus: (t) => (t < 1.2 ? [1.8, 0.4, -5.5] : [4.6, 0.1, 2]),
  act: (cx) => { const { t } = cx, k = K_(cx), F = k.fx; fxBegin(F); k.stupa!.setMelt(0.85); k.stupa!.drip(t + 83, 0.9); fxEnd(F); },
};
const D8d = actor(84, [{ t: 0, mood: "neutral", arms: ["rest", "open"], look: [0.4, -0.5] }]);
const S8d: SceneDef = {
  from: 86.5, to: 90, ...SPRING, mk: mk({ season: "april", stupa: 4.4, trench: 2, tipBroken: true, channel: 1, flat: { melt: 1.2 }, shadowAt: [6, 0, 3], shadowSize: 9, stream: "dry" }), fadeAt: dip(3.5, 0, 0.3),
  keys: [...hold1(0, 3.5, { pos: [11.0, 1.7, 9.5], look: [6.9, 0.9, 2.5], fov: 38 }, [0.04, 0, -0.06])],
  focus: (t) => [lerp(5.4, 6.6, t / 3.5), 1, lerp(1.4, 3.8, t / 3.5)],
  act: (cx) => { const { t, cam } = cx, F = K_(cx).fx; fxBegin(F); sunlit(cx.card(0)); const w = path(t, 0, 3.5, [6.3, 1.0], [7.4, 4.0], 0.5); let P = goTo(actAt(D8d, t), w, 0.6); const P0 = P;
    put(cx.card(0), DOLMA, P, w.x, w.z, cx, 0, DOLMA_X); const n = camDir(cam, w.x, w.z);
    const bp = cardPt(cx.card(0), P.x - DOLMA.bodyW * 0.62, 975 - DOLMA.legLen + P.bob - DOLMA.bodyH * 0.3).addScaledVector(n, 0.12); P = freezeArm(P, P0, 0); P = reach(cx.card(0), DOLMA, P, 0, bp, w.x, w.z, cx, 0, DOLMA_X);
    const b = F.buckets[1]; b.visible = true; b.position.copy(bp).add(V(0, -0.34, 0)); hold(F, 0, bp, cam);
    // the throwing hand: dips into the bucket, flings an arc of seed over the channel bank
    const cyc = (t % 0.9) / 0.9, fl = cyc < 0.4 ? sm(cyc / 0.4) : 1 - sm((cyc - 0.4) / 0.6), inB = bp.clone().add(V(0, -0.05, 0)), out = cardPt(cx.card(0), P.x + DOLMA.bodyW * 0.9, 975 - DOLMA.legLen + P.bob - DOLMA.bodyH * 0.75).addScaledVector(n, 0.2);
    P = reach(cx.card(0), DOLMA, P, 1, inB.clone().lerp(out, fl), w.x, w.z, cx, 0, DOLMA_X); hold(F, 1, handWorld(cx.card(0), DOLMA, P, 1), cam);
    const T = new THREE.Matrix4(); let m = 0; for (let k2 = 0; k2 < 5; k2++) { const tk = Math.floor(t / 0.9) * 0.9 - k2 * 0.9 + 0.36, a = t - tk; if (a < 0 || a > 0.7) continue; const o = out.clone();
      for (let i = 0; i < 50; i++) { const vx = 0.6 + 0.9 * ((i * 0.618) % 1), vz = (((i * 0.37) % 1) - 0.5) * 1.2, vy = 0.5 + ((i * 0.73) % 1) * 0.8, y = o.y + vy * a - 4.9 * a * a; if (y < 0.01) continue; T.makeTranslation(o.x + vx * a * n.z * -1 + vz * a * 0.3, y, o.z + vx * a * n.x + vz * a); F.seeds.setMatrixAt(m++, T); } }
    F.seeds.count = m; F.seeds.instanceMatrix.needsUpdate = true; fxEnd(F); },
};

// S9 PAYOFF (90 - 110)
//   a 90-95 the snow range up high (the ice up there melts only in summer) and the dry stream bed below
//   b 95-98.5 winter: the stream still runs; at the intake a box takes the water into the pipe
//   c 98.5-102 the pit: the frozen top layer, the soft soil below; the buried pipe keeps flowing; a pipe left on top is frozen
//   d 102-107 equal ice, two shapes: a flat slab and a cone in the sun; the slab melts away, the cone barely shrinks
//   e 107-110 back to the opening: the spray at the top of the tower
const S9a: SceneDef = {
  from: 90, to: 95, ...SPRING, mk: mk({ season: "april", stupa: 4.4, trench: 2, tipBroken: true, channel: 1, flat: { melt: 1.2 }, shadowAt: [20, 0, -30], shadowSize: 30, stream: "dry" }), fadeAt: dip(5, 0.35, 0), cInf: 9,
  keys: [...hold1(0, 1.6, { pos: [32.0, 2.6, 9], look: [27, 80, -420], fov: 42 }, [0, 0.1, 0]), ...move(1.6, 5, [{ pos: [32.0, 2.7, 9], look: [27, 80, -420], fov: 42 }, { pos: [32.3, 4.2, 10], look: [34, 0, -6], fov: 44 }])],
  focus: (t) => (t < 2.5 ? [30, 80, -420] : [34, 0, -6]),
  act: (cx) => { const F = K_(cx).fx; fxBegin(F); fxEnd(F); },
};
const INTAKE = V(streamX(-26) - 1.75, 0, -26);
const S9b: SceneDef = {
  from: 95, to: 98.5, ...DAY, mk: () => { const k = mk({ season: "winter", stupa: 5.2, trench: 2, stream: "frozen", flowing: true, shadowAt: [INTAKE.x, 0, INTAKE.z], shadowSize: 8 })() as unknown as LembahSet & WithFx;
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.8), new THREE.MeshStandardMaterial({ color: "#7a7a80", roughness: 0.6, metalness: 0.3 })); box.position.set(INTAKE.x + 0.7, INTAKE.y + 0.15, INTAKE.z); box.castShadow = true; k.root.add(box);
    const grill = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), new THREE.MeshStandardMaterial({ color: "#2a2a2e", metalness: 0.6, roughness: 0.4 })); grill.position.set(INTAKE.x + 1.11, INTAKE.y + 0.15, INTAKE.z); grill.rotation.y = Math.PI / 2; k.root.add(grill);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 12), new THREE.MeshStandardMaterial({ color: "#1c1c1e", roughness: 0.45 })); p.rotation.z = Math.PI / 2; p.position.set(INTAKE.x - 0.1, INTAKE.y + 0.0, INTAKE.z); k.root.add(p);
    return k as unknown as SetLike; },
  keys: [...hold1(0, 3.5, { pos: [INTAKE.x - 2.2, INTAKE.y + 1.7, INTAKE.z + 4.2], look: [INTAKE.x + 1.2, INTAKE.y + 0.1, INTAKE.z - 1.0], fov: 42 }, [0.06, 0, -0.06])],
  focus: () => [INTAKE.x + 0.8, INTAKE.y, INTAKE.z],
  act: (cx) => { const { t } = cx, F = K_(cx).fx; fxBegin(F); for (let i = 0; i < 12; i++) { const u = ((t * 0.8 + i / 12) % 1); F.puff.add(V(INTAKE.x + 1.25 + u * 0.5, INTAKE.y + 0.1, INTAKE.z + (i % 3 - 1) * 0.15), 0.12, 0.25 * (1 - u), i); } fxEnd(F); },
};
const PC = V((PIT.x0 + PIT.x1) / 2, 0, (PIT.z0 + PIT.z1) / 2);
const S9c: SceneDef = {
  from: 98.5, to: 102, ...DAY, mk: mk({ season: "winter", stupa: 5.2, trench: 2, pit: true, shadowAt: [PC.x, 0, PC.z], shadowSize: 6 }), fadeAt: dip(3.5, 0.3, 0), cInf: 2.5,
  keys: [...move(0, 3.5, [{ pos: [PC.x + 0.2, 1.6, PIT.z1 + 2.3], look: [PC.x, -1.1, PIT.z0], fov: 44 }, { pos: [PC.x + 0.1, 0.9, PIT.z1 + 1.4], look: [PC.x, -1.5, PIT.z0], fov: 42 }], (x) => x)],
  focus: () => [PC.x, -1.6, PIT.z0],
  act: (cx) => { const { t } = cx, k = K_(cx), F = k.fx; fxBegin(F); fxEnd(F); void t; void k; },
};
const DEMO_S = V(5.6, 0, 5.2), DEMO_C = V(7.7, 0, 1.4);
const S9d: SceneDef = {
  from: 102, to: 107, ...SPRING, mk: () => { const k = mk({ season: "march", stupa: false, trench: 2, stream: "dry", shadowAt: [7, 0, 3.5], shadowSize: 8 })() as unknown as LembahSet & WithFx & { demo: { slab: THREE.Mesh; cone: IceStupa; pud: THREE.Mesh } };
    const cone = new IceStupa(k.root, DEMO_C); cone.G.scale.setScalar(0.32); cone.pipe.visible = false; cone.setH(6.6);
    const st = new THREE.MeshPhysicalMaterial({ color: "#eef6fa", roughness: 0.3, clearcoat: 0.7, emissive: "#3a70a8", emissiveIntensity: 0.05 });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, 2.6), st); slab.position.copy(DEMO_S).add(V(0, 0.1, 0)); slab.castShadow = slab.receiveShadow = true; k.root.add(slab);
    const pud = new THREE.Mesh(new THREE.CircleGeometry(2.0, 40), new THREE.MeshStandardMaterial({ color: "#9fb4c2", roughness: 0.1, metalness: 0.05, transparent: true, opacity: 0, polygonOffset: true, polygonOffsetFactor: -4, depthWrite: false })); pud.rotation.x = -Math.PI / 2; pud.position.copy(DEMO_S).add(V(0, 0.02, 0)); k.root.add(pud);
    k.demo = { slab, cone, pud }; return k as unknown as SetLike; },
  keys: [...hold1(0, 5, { pos: [5.3, 4.6, 14.0], look: [6.1, 0.5, 3.4], fov: 42 }, [0, 0, -0.06])],
  focus: () => [6.5, 0.6, 3.5],
  act: (cx) => { const { t } = cx, k = K_(cx) as unknown as LembahSet & WithFx & { demo: { slab: THREE.Mesh; cone: IceStupa; pud: THREE.Mesh } }, F = k.fx; fxBegin(F); const u = at(t, 0.6, 4.4);
    k.sunTurn(-1.2 + 2.4 * ((t / 1.25) % 1), 0.32 + 0.25 * Math.sin(((t / 1.25) % 1) * Math.PI));
    const s = Math.max(0.001, 1 - u), d = k.demo; d.slab.scale.set(Math.max(0.001, 1 - 0.55 * u), s, Math.max(0.001, 1 - 0.55 * u)); d.slab.position.y = 0.1 * s; d.slab.visible = u < 0.995;
    (d.pud.material as THREE.MeshStandardMaterial).opacity = Math.min(0.9, u * 2) * (1 - at(t, 4.4, 5)); d.cone.setH(6.6 - 0.5 * u); d.cone.setMelt(0.7); d.cone.drip(t, 0.5); fxEnd(F); },
};
const S9e: SceneDef = {
  from: 107, to: 110, ...DAY, mk: mk({ season: "winter", stupa: 6.2, trench: 2, shadowAt: [0, 0, -7], shadowSize: 10 }), fadeAt: dip(3, 0.3, 0.35),
  keys: [...move(0, 3, [{ pos: [-2.8, 4.2, -1.6], look: [0, 7.0, -8], fov: 40 }, { pos: [-2.4, 4.5, -2.4], look: [0, 7.3, -8], fov: 38 }], (x) => x)],
  focus: () => [0, 7.2, -8],
  act: (cx) => { const { t } = cx, k = K_(cx), F = k.fx; fxBegin(F); k.sprayAt(t + 107, 1); fxEnd(F); },
};

// S10 CALLBACK (110 - 116): a queue with buckets at the end of Dolma's channel; Tashi last with two buckets and the
//   folded offer in his pocket. Dolma takes his bucket and sets it at the front of the line. Flat face.
const QEND = CHANNEL.getPointAt(1);
const QP = (i: number): [number, number] => [7.1 + 0.75 * i, 8.3 - 0.22 * i];
const Q10: [CharSpec, Ex | undefined][] = [[WARGA_A, WARGA_A_X], [WARGA_C, WARGA_C_X], [WARGA_B, undefined]];
const T10 = actor(101, [{ t: 0, mood: "nervous", arms: ["rest", "rest"], look: [-0.4, -0.2] }, { t: 3.0, mood: "surprised", look: [-0.7, -0.1] }, { t: 4.6, mood: "nervous", look: [-0.75, 0.1], nod: 1 }]);
const D10 = actor(102, [{ t: 0, mood: "neutral", arms: ["rest", "rest"], look: [0.6, 0.1] }, { t: 3.2, mood: "neutral", look: [-0.7, 0.1] }]);
const QW = actor(103, [{ t: 0, mood: "neutral", arms: ["rest", "rest"], look: [-0.4, 0.1] }, { t: 3.0, mood: "surprised", look: [0.7, 0.0] }, { t: 4.4, mood: "neutral", look: [-0.3, 0.1] }]);
/** bucket hanging from the hand on side `sd` (-1 left, 1 right) of a placed card; returns the pose with the arm down to it */
const carry = (cx: Ctx, F: FX, ci: number, S: CharSpec, P: Pose, x: number, z: number, ex: Ex | undefined, sd: -1 | 1, bi: number, hi: number) => {
  const n = camDir(cx.cam, x, z), hp = cardPt(cx.card(ci), P.x + sd * S.bodyW * 0.55, 975 - S.legLen + P.bob - S.bodyH * 0.32).addScaledVector(n, 0.12);
  const Q = reach(cx.card(ci), S, P, sd > 0 ? 1 : 0, hp, x, z, cx, 0, ex); const b = F.buckets[bi]; b.visible = true; b.position.copy(hp).add(V(0, -0.35, 0)); hold(F, hi, hp, cx.cam); return Q;
};
const S10: SceneDef = {
  from: 110, to: 116, ...SPRING, mk: mk({ season: "april", stupa: 4.2, trench: 2, tipBroken: true, channel: 1, sowed: 0.8, flat: { melt: 1.2 }, shadowAt: [8, 0, 7], shadowSize: 9, stream: "dry" }), fadeAt: dip(6, 0.3, 0.6),
  keys: [...hold1(0, 6, { pos: [10.2, 1.7, 1.9], look: [8.3, 1.0, 8.0], fov: 46 }, [0.04, 0, -0.06])],
  focus: () => [8.3, 1.0, 7.9],
  act: (cx) => { const { t, cam } = cx, F = K_(cx).fx; fxBegin(F); for (let i = 0; i < 5; i++) sunlit(cx.card(i));
    Q10.forEach(([S, ex], i) => { const [x, z] = QP(i); const P = actAt(QW, t - i * 0.15); put(cx.card(i), S, P, x, z, cx, 0, ex); carry(cx, F, i, S, P, x, z, ex, 1, i, i); });
    // Tashi last in line with two buckets; Dolma walks over, takes one and sets it down at the head of the line
    const [tx, tz] = QP(3); let PT = actAt(T10, t); put(cx.card(3), TASHI, PT, tx, tz, cx, 0, TASHI_X);
    PT = carry(cx, F, 3, TASHI, PT, tx, tz, TASHI_X, -1, 3, 3);
    const A: [number, number] = [6.3, 7.3], B: [number, number] = [tx - 0.15, tz - 0.75];
    const w = t < 3.0 ? path(t, 0.6, 2.9, A, B, 0.55) : path(t, 3.5, 5.6, B, [6.55, 7.55], 0.55);
    let PD = goTo(actAt(D10, t), w, 0.7); put(cx.card(4), DOLMA, PD, w.x, w.z, cx, 0, DOLMA_X);
    if (t < 3.1) PT = carry(cx, F, 3, TASHI, PT, tx, tz, TASHI_X, 1, 4, 4);
    else if (t < 5.7) PD = carry(cx, F, 4, DOLMA, PD, w.x, w.z, DOLMA_X, 1, 4, 4);
    else { const b = F.buckets[4]; b.visible = true; b.position.set(6.45, 0, 8.15); }
    // the folded offer poking out of his robe
    F.letter.visible = true; setLetter(F, 3, 2); const nT = camDir(cam, tx, tz), pk = cardPt(cx.card(3), PT.x + TASHI.bodyW * 0.18, 975 - TASHI.legLen + PT.bob - TASHI.bodyH * 0.8).addScaledVector(nT, 0.05); F.letter.position.copy(pk); F.letter.lookAt(pk.clone().add(nT)); F.letter.scale.set(0.5, 0.4, 1); F.letter.rotateZ(0.5);
    fxEnd(F); },
};

export const LADAKH_SCENES: SceneDef[] = [S1, S2a, S2b, S2c, S2d, S3a, S3b, S4a, S4b, S4c, S4d, S5a, S5b, S5c, S6a, S6b, S6c, S7a, S7b, S7c, S8a, S8b, S8c, S8d, S9a, S9b, S9c, S9d, S9e, S10];
export const LADAKH_FRAMES = Math.round(116 * FPS);
void nod; void shake; void lerp; type _U = V3;
/** the downloaded models load once; the film waits for them */
/** opening-frame options (checklist: offer 2-3 first frames): 0 = three-quarter ladder view (default), 1 = closer and
 *  lower on Dolma, 2 = wide over the cone and village. Only the first 5.4 s change. */
const HOOK_CAMS: P3[] = [
  { pos: [2.9, 3.4, -0.6], look: [-0.45, 4.45, -7.0], fov: 42 },
  { pos: [-0.2, 3.2, -3.4], look: [-0.45, 4.6, -7.2], fov: 40 },
  { pos: [4.6, 5.2, 5.0], look: [-0.2, 4.0, -7.5], fov: 44 },
];
const withHook = (k: number): SceneDef[] => (k ? [{ ...S1, keys: [...hold1(0, 5.4, HOOK_CAMS[k], [0.06, 0.02, 0.06]), ...move(5.4, 10, [{ ...HOOK_CAMS[k] }, { pos: [5, 6, 7], look: [0, 4.0, -9], fov: 46 }, { pos: [6, 10.5, 17], look: [-1, 3.5, -12], fov: 46 }])] }, ...LADAKH_SCENES.slice(1)] : LADAKH_SCENES);
export const LadakhFilm: React.FC<{ hook?: number }> = ({ hook = 1 }) => {
  const [ok, setOk] = React.useState(hasModels()), [h] = React.useState(() => (hasModels() ? null : delayRender("ladakh models", { timeoutInMilliseconds: 240000 })));
  React.useEffect(() => { if (!ok) loadModels().then(() => { setOk(true); if (h !== null) continueRender(h); }); }, [ok, h]);
  const scenes = React.useMemo(() => withHook(hook), [hook]);
  return ok ? <Reel scenes={scenes} /> : null;
};
