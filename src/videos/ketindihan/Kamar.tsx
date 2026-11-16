// "Satu Malam Ketindihan", first test scene: Pak Udin's bedroom at 3 a.m. (script lines 2-3, video 0:05.0-0:18.4).
// Script: docs/scripts/ketindihan-elevenlabs.md. Times below are GLOBAL video seconds (T() maps them to this clip).
// Shots: clock insert -> wide room (eyes snap open) -> hand that cannot move -> face + chest pressed down
//        -> POV to the dark corner (a figure fades in, eyes open on "menatap") -> dip to black.
// Plain three.js set (toon two-tone walls/furniture, ink outlines) + flat drawn cards for the people (NOINK layer).
import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { InkPass, NOINK } from "../bridge/ink";
import { twoTone } from "../bridge/shade";
import { Pen } from "../bridge/toon";
import type { Outfit } from "../bridge/toon";
import { drawPerson, geom, WHITE } from "../ayam/people";
import type { Person, ActOpts } from "../ayam/people";
import { TEX } from "../ayam/dress";
import { sm, clamp01, lerp } from "../ayam/AyamActTest";

const W = 1080, H = 1920, FPS = 30, T0 = 5.0;
/** global video second -> local frame */
export const T = (sec: number) => Math.round((sec - T0) * FPS);
export const KAMAR_FRAMES = T(18.4);
const SU = 0.00216;
/** drawn cards are unlit; this tint makes white read as white-in-moonlight */
const MOONLIT = "#aebbdc";
/** the figure emerges from the wall: card colour goes from the lit wall tone to near black */
const FIG_FROM = new THREE.Color("#4d5170"), FIG_TO = new THREE.Color("#07080f"); // metres per card design unit (same as the ayam cast)

// ---------------- materials / textures ----------------
const lam = (color: string, extra: THREE.MeshLambertMaterialParameters = {}) => twoTone(new THREE.MeshLambertMaterial({ color, ...extra }));
const ctex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
};
/** kotak-kotak (plaid) blanket */
const blanketTex = ctex(256, 256, (g) => {
  g.fillStyle = "#b8423c"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "rgba(245,226,190,0.55)"; for (let i = 0; i < 256; i += 64) { g.fillRect(i + 20, 0, 14, 256); g.fillRect(0, i + 20, 256, 14); }
  g.fillStyle = "rgba(60,20,30,0.35)"; for (let i = 0; i < 256; i += 64) { g.fillRect(i + 44, 0, 6, 256); g.fillRect(0, i + 44, 256, 6); }
}, [2, 2]);
/** plain plaster: soft low-contrast mottling, no cracks (a big wall at close range shows every mark) */
const wallTex = ctex(256, 256, (g) => {
  g.fillStyle = "#e6e0d2"; g.fillRect(0, 0, 256, 256); let s = 7; const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(120,110,100,${0.02 + r() * 0.04})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 10 + r() * 30, 8 + r() * 20, r() * 3, 0, 7); g.fill(); }
}, [3, 3]);
const clockTex = (sec: number) => ctex(256, 256, (g) => {
  g.fillStyle = "#f3ecd8"; g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.fill();
  g.lineWidth = 12; g.strokeStyle = "#241726"; g.stroke();
  g.fillStyle = "#241726"; g.font = "bold 34px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  [["12", 0], ["3", 90], ["6", 180], ["9", 270]].forEach(([s, a]) => { const r = ((a as number) * Math.PI) / 180; g.fillText(s as string, 128 + 88 * Math.sin(r), 128 - 88 * Math.cos(r)); });
  const hand = (deg: number, len: number, w: number, col = "#241726") => { const r = (deg * Math.PI) / 180; g.strokeStyle = col; g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + len * Math.sin(r), 128 - len * Math.cos(r)); g.stroke(); };
  hand(90, 54, 11); hand(0, 82, 8); hand(sec * 6, 92, 3, "#c0353a");
  g.fillStyle = "#241726"; g.beginPath(); g.arc(128, 128, 9, 0, Math.PI * 2); g.fill();
});

// ---------------- Pak Udin ----------------
const UDIN: Person = {
  o: { jacket: "#5a7fa8", pants: "#8a3b3b", boots: "#5a3b2a", hat: "hair", hair: "#1e1410", skin: WHITE, moustache: "#2a1d14", build: "stout" } as Outfit,
  extras: [],
};
/** one drawn card (1200 x 2000 canvas = 600 x 1000 design units x 2), redrawn only when its key changes */
class Card {
  canvas = document.createElement("canvas"); tex: THREE.CanvasTexture; mat: THREE.MeshBasicMaterial; mesh: THREE.Mesh; key = "";
  constructor(w = 600, h = 1000, sole = 975, k = 2) {
    this.canvas.width = w * k; this.canvas.height = h * k; this.k = k;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    this.mat = new THREE.MeshBasicMaterial({ map: this.tex, alphaTest: 0.5, side: THREE.DoubleSide, color: new THREE.Color(MOONLIT) });
    const geo = new THREE.PlaneGeometry(w * SU, h * SU); geo.translate(0, (sole - h / 2) * SU, 0);
    this.mesh = new THREE.Mesh(geo, this.mat); this.mesh.layers.set(NOINK); this.mesh.receiveShadow = true; this.mesh.renderOrder = 1;
  }
  k: number;
  draw(key: string, fn: (p: Pen) => void) {
    if (key === this.key) return; this.key = key;
    const g = this.canvas.getContext("2d")!; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    g.setTransform(this.k, 0, 0, this.k, 0, 0); fn(new Pen(g)); this.tex.needsUpdate = true;
  }
}

/** the figure in the corner: tall hunched silhouette, long arms; eyes are separate glowing meshes */
const drawFigure = (p: Pen) => {
  const g = p.g, body = "#ffffff"; // tinted by the material colour (wall-coloured -> near black)
  
  p.ol = 0;
  p.poly([[240, 240], [360, 240], [420, 420], [440, 700], [400, 1000], [200, 1000], [160, 700], [180, 420]], body, 0); // torso
  p.ell(300, 170, 95, 110, body, 0); // head
  p.line([[190, 300], [130, 520], [120, 760]], body, 34, false); p.line([[410, 300], [470, 520], [480, 760]], body, 34, false); // long arms
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) p.line([[300 + s * 180, 760], [300 + s * (175 + k * 9), 830 + k * 4]], body, 9, false); // fingers
  g.strokeStyle = "#b9c8ff"; g.lineWidth = 6; g.beginPath(); g.ellipse(300, 170, 95, 110, 0, Math.PI * 1.05, Math.PI * 1.75); g.stroke(); // faint moon rim
};
/** the hand on the blanket: palm down, fingers spread a little; tw = finger twitch 0..1 */
const drawHand = (p: Pen, tw: number) => {
  p.ol = 7;
  for (let i = 0; i < 4; i++) { const x = 70 + i * 34, curl = i === 1 ? tw * 0.55 : i === 2 ? tw * 0.35 : i === 0 ? tw * 0.15 : 0; p.line([[x, 150], [x + 2, 70 + 80 * curl]], WHITE, 24 + curl * 10); }
  if (tw > 0.25) { p.ol = 0; for (const [cx, cy, r] of [[95, 50, 22], [130, 44, 30]] as const) p.ell(cx, cy, r, r * 0.5, null, 0); // tremble ticks above the fingers
    p.stroke([[78, 42], [88, 30]], 5); p.stroke([[112, 28], [118, 14]], 5); p.stroke([[146, 30], [156, 18]], 5); p.ol = 7; }
  p.line([[180, 175], [228, 135]], WHITE, 26); // thumb
  p.poly([[50, 140], [185, 135], [205, 230], [190, 290], [70, 290], [45, 220]], WHITE, 7); // palm
  p.poly([[70, 280], [190, 280], [195, 300], [65, 300]], "#5a7fa8", 7); // sleeve
};

// ---------------- the room ----------------
/** height of the blanket over the lying body: x across the bed (0 = centre), z along it (0 = chest); dent = chest pushed down */
const blanketH = (x: number, z: number, dent: number) => {
  const body = Math.exp(-(x * x) / 0.09) * (0.17 * Math.exp(-((z + 0.05) ** 2) / 0.12) + 0.11 * clamp01(1 - Math.abs(z - 0.55) / 0.7));
  const press = dent * 0.22 * Math.exp(-(x * x) / 0.07 - ((z - 0.34) ** 2) / 0.05);
  return 0.035 + Math.max(0, body - press);
};
class Room {
  root = new THREE.Group(); clockMat: THREE.MeshBasicMaterial; blanket: THREE.Mesh; udin = new Card(); figure = new Card(600, 1000, 975, 1); hand = new Card(300, 300, 300, 2);
  eyes: THREE.Mesh[] = []; moon: THREE.DirectionalLight; lastSec = -1; lastDent = -1;
  bedX = -0.5; bedTop = 0.55; chestZ = -0.75;
  constructor() {
    const R = this.root, add = (m: THREE.Mesh, cast = true) => { m.castShadow = cast; m.receiveShadow = true; R.add(m); return m; };
    const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, cast = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return add(m, cast); };
    const wall = TEX.texLam(wallTex, "#b9c4d8"), floor = TEX.texLam(TEX.woodTex, "#c9a27a"), wood = TEX.texLam(TEX.woodTex, "#a27a52");
    // floor, back wall, right wall, ceiling, left wall with a window hole (moonlight only comes in through it)
    box(3.8, 0.1, 3.6, floor, 0, -0.05, 0, false);
    box(3.8, 2.9, 0.12, wall, 0, 1.45, -1.66);
    box(0.12, 2.9, 3.6, wall, 1.86, 1.45, 0);
    box(3.8, 0.12, 3.6, lam("#9aa6bb"), 0, 2.92, 0);
    const WZ0 = -0.9, WZ1 = 0.2, WY0 = 1.0, WY1 = 2.05;
    box(0.12, WY0, 3.6, wall, -1.86, WY0 / 2, 0); box(0.12, 2.9 - WY1, 3.6, wall, -1.86, (2.9 + WY1) / 2, 0);
    box(0.12, WY1 - WY0, WZ0 + 1.8, wall, -1.86, (WY0 + WY1) / 2, (-1.8 + WZ0) / 2); box(0.12, WY1 - WY0, 1.8 - WZ1, wall, -1.86, (WY0 + WY1) / 2, (WZ1 + 1.8) / 2);
    const frame = lam("#6b4a2e");
    for (const z of [WZ0, (WZ0 + WZ1) / 2, WZ1]) box(0.08, WY1 - WY0, 0.05, frame, -1.84, (WY0 + WY1) / 2, z);
    for (const y of [WY0, (WY0 + WY1) / 2, WY1]) box(0.08, 0.05, WZ1 - WZ0, frame, -1.84, y, (WZ0 + WZ1) / 2);
    const night = new THREE.Mesh(new THREE.PlaneGeometry(WZ1 - WZ0 + 0.4, WY1 - WY0 + 0.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.18, 0.26, 0.55), fog: false }));
    night.position.set(-2.4, (WY0 + WY1) / 2, (WZ0 + WZ1) / 2); night.rotation.y = Math.PI / 2; night.layers.set(NOINK); R.add(night);
    const moonDisc = new THREE.Mesh(new THREE.CircleGeometry(0.09, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.3, 2.6) }));
    moonDisc.position.set(-2.38, 1.8, -0.55); moonDisc.rotation.y = Math.PI / 2; moonDisc.layers.set(NOINK); R.add(moonDisc);
    // curtains, a little open
    const curtain = lam("#4f6a8a", { side: THREE.DoubleSide });
    for (const [z, s] of [[WZ0 - 0.05, 1], [WZ1 + 0.05, -1]] as const) {
      const g = new THREE.PlaneGeometry(0.45, 1.35, 8, 1); const pos = g.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < pos.count; k++) pos.setZ(k, 0.035 * Math.sin(pos.getX(k) * 26)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, curtain); m.position.set(-1.76, (WY0 + WY1) / 2 + 0.1, z + s * 0.12); m.rotation.y = Math.PI / 2; add(m, false);
    }
    // bed: frame, headboard, mattress, pillow
    const bx = this.bedX, bt = this.bedTop;
    box(1.3, 0.3, 2.1, wood, bx, 0.2, -0.55); box(1.36, 1.0, 0.08, wood, bx, 0.5, -1.58);
    box(1.22, 0.2, 2.0, lam("#e6e2d6"), bx, bt - 0.1, -0.55);
    const pillow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 12), lam("#f1efe8")); pillow.scale.set(1.0, 0.13, 0.36); pillow.position.set(bx, bt + 0.06, -1.32); add(pillow);
    // blanket: a sheet draped over the body from the shoulders down, hanging over both sides
    const bg = new THREE.PlaneGeometry(1.36, 1.5, 48, 48); bg.rotateX(-Math.PI / 2); this.blanket = new THREE.Mesh(bg, twoTone(new THREE.MeshLambertMaterial({ map: blanketTex, side: THREE.DoubleSide })));
    this.blanket.position.set(bx, bt, this.chestZ + 0.7); add(this.blanket); this.setDent(0);
    // nightstand with a glass and a phone; wardrobe; chair with a hanging shirt (a shape that reads as "someone" in the dark)
    box(0.45, 0.5, 0.4, wood, 0.45, 0.25, -1.38); box(0.45, 0.04, 0.42, lam("#7d5a3a"), 0.45, 0.52, -1.38);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.1, 16), lam("#cfe3ee")); glass.position.set(0.36, 0.59, -1.42); add(glass);
    box(0.08, 0.012, 0.15, lam("#1e2230"), 0.54, 0.547, -1.33);
    box(0.55, 2.0, 1.1, wood, 1.52, 1.0, 0.75); box(0.02, 1.8, 0.02, lam("#3b2a1a"), 1.24, 1.0, 0.75);
    // wall clock above the nightstand
    this.clockMat = new THREE.MeshBasicMaterial({ map: clockTex(0), color: new THREE.Color(MOONLIT) });
    const clock = new THREE.Mesh(new THREE.CircleGeometry(0.17, 40), this.clockMat); clock.position.set(0.55, 2.05, -1.595); clock.layers.set(NOINK); R.add(clock);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.022, 10, 40), lam("#3b2a1a")); rim.position.set(0.55, 2.05, -1.59); add(rim);
    // Pak Udin lying on his back: card flat on the bed, head on the pillow (card +y -> headboard)
    this.udin.mesh.rotation.set(-Math.PI / 2 + 0.1, 0, 0); this.udin.mesh.position.set(bx, bt + 0.025, 0.3); R.add(this.udin.mesh);
    // the hand lying on the blanket edge (camera side)
    this.hand.mesh.rotation.order = "YXZ"; this.hand.mesh.rotation.set(-Math.PI / 2, Math.PI, -0.2); this.hand.mesh.scale.setScalar(0.4); this.hand.mesh.position.set(bx + 0.36, bt + 0.11, -0.72); R.add(this.hand.mesh);
    // the figure in the back-right corner + its eyes (HDR white for the bloom)
    this.figure.mesh.position.set(1.62, 0, -1.42); this.figure.mesh.scale.setScalar(0.95); this.figure.mesh.rotation.y = -0.9; R.add(this.figure.mesh);
    this.figure.mat.alphaTest = 0.5;
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 5, 5.5) }));
      e.position.set(s * 0.075, (975 - 175) * SU, 0.02); e.layers.set(NOINK); this.eyes.push(e); this.figure.mesh.add(e);
    }
    this.figure.draw("fig", drawFigure);
    // light: moon through the window (the only shadow-casting light), dim blue fill, faint warm from the clock side
    this.moon = new THREE.DirectionalLight(new THREE.Color("#a9c1ff"), 2.4); this.moon.position.set(-5.5, 4.6, -0.2); this.moon.target.position.set(0, 0.4, -0.5);
    this.moon.castShadow = true; this.moon.shadow.mapSize.set(2048, 2048); Object.assign(this.moon.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 14 }); this.moon.shadow.bias = -0.0004; this.moon.shadow.normalBias = 0.02;
    R.add(this.moon, this.moon.target);
    R.add(new THREE.HemisphereLight(new THREE.Color("#4a5a8a"), new THREE.Color("#1a1626"), 0.75));
    const fill = new THREE.PointLight(new THREE.Color("#6f80c0"), 0.9, 6, 1.5); fill.position.set(-0.6, 2.4, 1.2); R.add(fill);
  }
  setDent(d: number) {
    const k = Math.round(d * 30) / 30; if (k === this.lastDent) return; this.lastDent = k;
    const pos = (this.blanket.geometry as THREE.BufferGeometry).attributes.position as THREE.BufferAttribute, half = 0.61;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), zl = pos.getZ(i) + 0.7; // zl: 0 = chest line (blanket top edge at -0.0)
      const ax = Math.abs(x); let y = blanketH(x, zl - 0.05, k);
      if (ax > half) y = blanketH(half * Math.sign(x), zl, k) - (ax - half) * 4.5; // hangs down over the bed edge
      pos.setY(i, y);
    }
    pos.needsUpdate = true; this.blanket.geometry.computeVertexNormals();
  }
  setClock(sec: number) { const s = Math.floor(sec); if (s === this.lastSec) return; this.lastSec = s; this.clockMat.map?.dispose(); this.clockMat.map = clockTex(s); this.clockMat.needsUpdate = true; }
}

// ---------------- shots (camera + acting) ----------------
type V3 = [number, number, number];
type Shot = { from: number; pos: V3; look: V3; fov: number; to?: { pos: V3; look: V3; fov?: number } };
const SHOTS: Shot[] = [
  { from: T(5.0), pos: [0.3, 1.75, -0.2], look: [0.55, 1.95, -1.6], fov: 34, to: { pos: [0.34, 1.8, -0.35], look: [0.55, 1.97, -1.6] } }, // clock insert
  { from: T(6.9), pos: [-1.45, 2.15, 1.5], look: [0.0, 0.8, -1.0], fov: 50, to: { pos: [-1.38, 2.08, 1.34], look: [-0.02, 0.8, -1.02] } }, // wide room
  { from: T(9.9), pos: [0.15, 1.45, -0.05], look: [-0.14, 0.66, -0.62], fov: 34, to: { pos: [0.12, 1.38, -0.12], look: [-0.14, 0.66, -0.62] } }, // hand insert
  { from: T(11.1), pos: [-0.5, 2.25, 0.25], look: [-0.5, 0.6, -0.95], fov: 40, to: { pos: [-0.5, 2.1, 0.08], look: [-0.5, 0.6, -0.98] } }, // face + chest
  { from: T(14.6), pos: [-0.5, 0.8, -1.25], look: [1.5, 1.25, -1.3], fov: 56, to: { pos: [-0.5, 0.8, -1.25], look: [1.55, 1.35, -1.35], fov: 48 } }, // POV corner
];
const shotAt = (l: number) => { let i = 0; for (let k = 0; k < SHOTS.length; k++) if (l >= SHOTS[k].from) i = k; return i; };

const Inner: React.FC = () => {
  const l = useCurrentFrame();
  const { camera, scene } = useThree(); const cam = camera as THREE.PerspectiveCamera;
  const room = useMemo(() => new Room(), []);
  const post = useMemo(() => ({
    ink: new InkPass(scene, cam),
    bloom: new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.9, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.7 }),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
  }), [scene, cam]);
  React.useEffect(() => () => InkPass.prototype.dispose.call(post.ink), [post]);

  // camera: each shot is a still framing with a very slow drift toward its end framing (calm camera)
  const si = shotAt(l), S = SHOTS[si], end = si + 1 < SHOTS.length ? SHOTS[si + 1].from : KAMAR_FRAMES, u = sm((l - S.from) / (end - S.from));
  const P = S.to ? S.pos.map((v, i) => lerp(v, S.to!.pos[i], u)) : S.pos, Lk = S.to ? S.look.map((v, i) => lerp(v, S.to!.look[i], u)) : S.look;
  const fov = S.to?.fov ? lerp(S.fov, S.to.fov, sm((l - T(15.2)) / 30)) : S.fov;
  cam.position.set(P[0], P[1], P[2]); cam.up.set(0, 1, 0); cam.lookAt(Lk[0], Lk[1], Lk[2]); cam.fov = fov; cam.near = 0.05; cam.far = 50; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.layers.enable(NOINK);

  // clock: seconds tick from 03:00:00
  room.setClock((l - T(5.0)) / FPS);
  // acting: asleep -> eyes snap open on "terbuka" (8.0) -> strain + sweat when the chest is pressed ("berat" 11.8)
  const awake = l >= T(7.95), pressed = l >= T(11.75);
  const dent = l < T(11.75) ? 0 : Math.min(1, (l - T(11.75)) / 5) * (0.88 + 0.12 * Math.sin((l - T(11.75)) * 0.3));
  room.setDent(dent);
  const breathe = pressed ? 0 : Math.round(Math.sin(l * 0.12) * 3) / 3;
  const opening = l >= T(7.95) - 2 && l < T(7.95);
  const face: ActOpts["face"] = opening ? { eye: "lid", mouth: "dash" } : !awake ? { eye: "dash", mouth: "dash" } : pressed ? { eye: "shock", mouth: "teeth", brow: [-0.6, -0.6] } : { eye: "shock", mouth: "dash" };
  // eyes dart (the only thing that can move): left, right, back; again while pressed; toward the corner before the POV cut
  const dart = (t: number) => (t >= 8.9 && t < 9.3 ? -1.4 : t >= 9.3 && t < 9.7 ? 1.4 : t >= 12.7 && t < 13.0 ? -1.4 : t >= 13.0 && t < 13.3 ? 1.4 : t >= 14.2 ? 1.6 : 0);
  const opts: ActOpts = { mode: "stand", armsFront: false, expr: pressed ? "pained" : "neutral", face, blink: 0, seed: 7, look: awake ? dart(T0 + l / FPS) : 0 };
  const P2: Person = pressed ? { ...UDIN, extras: ["sweat"] } : UDIN;
  room.udin.draw(JSON.stringify([opts, P2.extras]), (p) => { drawPerson(p, P2, opts); const G = geom(P2.o, opts); p.g.clearRect(0, G.chin + 0.3 * G.HH, 600, 1000); });
  const shake = pressed ? (Math.floor(l / 2) % 2 ? 1 : -1) * 0.012 * (0.6 + 0.4 * Math.sin(l * 0.7)) : 0;
  room.udin.mesh.position.y = room.bedTop + 0.025 + breathe * 0.004 - 0.02 * dent;
  room.udin.mesh.rotation.z = shake; room.udin.mesh.position.x = room.bedX + shake * 0.15;
  // the hand tries to move: tiny tremble on "tidak bisa bergerak" (10.2), never really lifts
  const hu = (l - T(10.0)) / (T(11.1) - T(10.0)), tw = hu > 0 && hu < 1 ? Math.sin(Math.PI * hu) * (0.75 + 0.25 * (Math.floor(l / 2) % 2 ? 1 : -1)) : 0;
  const twq = Math.round(tw * 20) / 20; room.hand.draw("h" + twq, (p) => drawHand(p, twq));
  room.hand.mesh.visible = si <= 2;
  // the figure: only in the corner POV; fades in 15.3-16.4, eyes open on "menatap" (16.6)
  const figA = si === 4 ? sm((l - T(15.3)) / 33) : 0, eyeK = l >= T(16.55) ? sm((l - T(16.55)) / 3) : 0;
  room.figure.mesh.visible = figA > 0.01; room.figure.mat.color.copy(FIG_FROM).lerp(FIG_TO, figA);
  room.figure.mesh.rotation.z = -0.07 * sm((l - T(16.7)) / 24);
  room.eyes.forEach((e) => { e.visible = eyeK > 0; e.scale.set(1, Math.max(0.05, eyeK), 1); });

  return (
    <>
      <primitive object={room.root} dispose={null} />
      <EffectComposer multisampling={4}>
        <primitive object={post.ink} dispose={null} /><primitive object={post.bloom} dispose={null} /><primitive object={post.tone} dispose={null} />
      </EffectComposer>
    </>
  );
};

export const KetindihanKamar: React.FC = () => {
  const l = useCurrentFrame();
  const black = clamp01((l - T(17.4)) / 6); // dip to black after the sting
  return (
    <AbsoluteFill style={{ background: "#05060c" }}>
      <ThreeCanvas width={W} height={H} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 40, near: 0.05, far: 50 }}>
        <Inner />
      </ThreeCanvas>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 60% at 50% 48%, rgba(0,0,0,0) 55%, rgba(4,6,16,0.55) 100%)" }} />
      <AbsoluteFill style={{ background: "#000", opacity: black }} />
    </AbsoluteFill>
  );
};
