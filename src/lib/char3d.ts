// Full-3D toon characters (test, 2026-11-18): white ball head with a 2D ink face painted on it, soft lumpy 3D hair or a
// hat, a small rounded clothed body, thin dark stick arms/legs, round mitten hands and egg shoes, a thin ink outline
// (inverted hull). Our own cast, made in code; the style follows the user's reference short (ball heads + stick limbs).
// Axes: character local +z = facing direction, feet on y = 0.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Eye, Brow, Mouth } from "./toon2";

export const INK = "#1e1c22";
type V3 = [number, number, number];
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// ---------------- outline (inverted hull, pushed out along the normal) ----------------
const olCache = new Map<number, THREE.Material>();
const outlineMat = (w: number) => {
  let m = olCache.get(w); if (m) return m;
  const b = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  b.onBeforeCompile = (s) => { s.vertexShader = s.vertexShader.replace("#include <begin_vertex>", `vec3 transformed = position + normal * ${w.toFixed(5)};`); };
  b.customProgramCacheKey = () => "ol" + w; olCache.set(w, b); return b;
};
const shadow = (m: THREE.Mesh) => { m.castShadow = m.receiveShadow = true; return m; };
/** a mesh plus its ink hull (w metres thick) */
const inked = (geo: THREE.BufferGeometry, mat: THREE.Material, w = 0.006) => { const m = shadow(new THREE.Mesh(geo, mat)); if (w > 0) { const h = new THREE.Mesh(geo, outlineMat(w)); h.castShadow = false; m.add(h); } return m; };

// ---------------- textures ----------------
const tex = (c: HTMLCanvasElement, rep: [number, number] = [1, 1]) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); return t; };
const canvas = (w: number, h: number, f: (g: CanvasRenderingContext2D) => void) => { const c = document.createElement("canvas"); c.width = w; c.height = h; f(c.getContext("2d")!); return c; };
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
/** soft woven noise over a base colour */
const fabric = (g: CanvasRenderingContext2D, w: number, h: number, base: string, k = 14) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h / 60; i++) { const v = rnd() > 0.5 ? 255 : 0; g.fillStyle = `rgba(${v},${v},${v},${(rnd() * k) / 255})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 3, 1); }
};

/** the face is drawn flat on a square canvas (x,y in -1..1 of the head radius, y up) and projected from the front
 *  onto the ball's equirect texture, so it wraps like ink painted on the head */
export type FaceFn = (g: CanvasRenderingContext2D, P: (x: number, y: number) => [number, number], u: number) => void;
const FW = 2048, FH = 1024, FF = 1024;
let FMAP: { head: Int32Array; face: Int32Array } | null = null;
/** head-texture pixel -> face-canvas pixel, for the front half only (built once) */
const faceMap = () => {
  if (FMAP) return FMAP; const hs: number[] = [], fs: number[] = [];
  for (let j = 0; j < FH; j++) { const th = ((j + 0.5) / FH) * Math.PI, y = Math.cos(th), s = Math.sin(th);
    for (let i = 0; i < FW; i++) { const ph = ((i + 0.5) / FW) * Math.PI * 2, x = -Math.cos(ph) * s, z = Math.sin(ph) * s; if (z <= 0.02) continue;
      const fx = Math.min(FF - 1, Math.max(0, Math.round(((x + 1) / 2) * FF))), fy = Math.min(FF - 1, Math.max(0, Math.round(((1 - y) / 2) * FF))); hs.push(j * FW + i); fs.push(fy * FF + fx); } }
  FMAP = { head: Int32Array.from(hs), face: Int32Array.from(fs) }; return FMAP;
};
/** a live head texture: redraws only when the face key changes */
export class FaceTex {
  private fc = (() => { const c = document.createElement("canvas"); c.width = c.height = FF; c.getContext("2d", { willReadFrequently: true }); return c; })(); private hc = canvas(FW, FH, () => {}); private img: ImageData; tex: THREE.CanvasTexture; private key = "";
  constructor() { const g = this.hc.getContext("2d")!; this.img = g.createImageData(FW, FH); this.img.data.fill(255); this.tex = tex(this.hc); this.tex.wrapS = this.tex.wrapT = THREE.ClampToEdgeWrapping; }
  draw(key: string, face: FaceFn) {
    if (key === this.key) return; this.key = key;
    const g = this.fc.getContext("2d", { willReadFrequently: true })!; g.clearRect(0, 0, FF, FF); g.lineCap = g.lineJoin = "round";
    face(g, (x, y) => [FF / 2 + (x * FF) / 2, FF / 2 - (y * FF) / 2], FF / 2);
    const fd = g.getImageData(0, 0, FF, FF).data, d = this.img.data, M = faceMap();
    for (let k = 0; k < M.head.length; k++) { const o = M.head[k] * 4, q = M.face[k] * 4, a = fd[q + 3] / 255, na = 1 - a;
      d[o] = 255 * na + fd[q] * a; d[o + 1] = 255 * na + fd[q + 1] * a; d[o + 2] = 255 * na + fd[q + 2] * a; }
    this.hc.getContext("2d")!.putImageData(this.img, 0, 0); this.tex.needsUpdate = true;
  }
}

// ---------------- hair: lumpy blobs on the skull ----------------
const fib = (n: number) => { const out: THREE.Vector3[] = []; for (let i = 0; i < n; i++) { const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), a = i * 2.39996323; out.push(V(Math.cos(a) * r, y, Math.sin(a) * r)); } return out; };
/** soft clay hair: big ellipsoid clumps flattened against the skull, so they merge into a smooth helmet with a few lumps */
const hairGeo = (r: number, keep: (d: THREE.Vector3) => boolean, rb: (d: THREE.Vector3) => number, out = 0.9, jitter = 0.04, n = 70, flat = 0.42) => {
  const parts: THREE.BufferGeometry[] = [], q = new THREE.Quaternion(), m = new THREE.Matrix4();
  for (const d of fib(n)) { if (!keep(d)) continue; const b = rb(d) * r; const g = new THREE.SphereGeometry(b, 24, 16); g.scale(1, 1, flat);
    q.setFromUnitVectors(V(0, 0, 1), d); g.applyMatrix4(m.makeRotationFromQuaternion(q));
    const c = d.clone().multiplyScalar(r * (out + jitter * (rnd() - 0.5))); g.translate(c.x, c.y, c.z); parts.push(g); }
  return mergeGeometries(parts)!;
};


// ---------------- body ----------------
/** rounded bottle torso (lathe), seam at the back so the front is u = 0.5 */
const torsoGeo = (R: number, Ht: number) => {
  const p: [number, number][] = [[0, 0], [0.85, 0], [0.98, 0.05], [1.0, 0.2], [0.97, 0.45], [0.9, 0.68], [0.78, 0.84], [0.6, 0.94], [0.35, 0.99], [0, 1.0]];
  const g = new THREE.LatheGeometry(p.map(([a, b]) => new THREE.Vector2(a * R, b * Ht)), 48, Math.PI);
  const uv = g.attributes.uv, pos = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setY(i, pos.getY(i) / Ht); // v = height, so cloth prints sit where drawn
  return g;
};
/** a tube along a few points whose shape can change every frame (arms, legs, sleeves) */
class TubeLimb {
  mesh: THREE.Mesh; hull: THREE.Mesh | null = null;
  constructor(parent: THREE.Object3D, public rad: number, mat: THREE.Material, w = 0, public seg = 24) {
    this.mesh = shadow(new THREE.Mesh(new THREE.BufferGeometry(), mat)); parent.add(this.mesh);
    if (w > 0) { this.hull = new THREE.Mesh(this.mesh.geometry, outlineMat(w)); this.hull.castShadow = false; this.mesh.add(this.hull); }
  }
  set(pts: THREE.Vector3[]) { const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "centripetal"), this.seg, this.rad, 10, false); this.mesh.geometry.dispose(); this.mesh.geometry = g; if (this.hull) this.hull.geometry = g; }
}

export type CharSpec3 = {
  r: number; leg: number; torsoH: number; torsoR: number; flat?: number; skin?: string;
  face: FaceFn; shirt: THREE.Material; limb?: string; shoe?: string;
  hair?: { col: string; keep: (d: THREE.Vector3) => boolean; rb: (d: THREE.Vector3) => number; out?: number; jitter?: number; n?: number; flat?: number };
  /** arms: elbow + wrist in local space (the shoulder is found from the torso); sleeve = 0..1 of the arm covered */
  arms: [[V3, V3], [V3, V3]]; sleeve?: number; sleeveR?: number; sleeveMat?: THREE.Material;
  shorts?: THREE.Material;
};

export class Char3 {
  /** root = placement in the world; body = hop/lean/squash; head = look + pop */
  root = new THREE.Group(); head = new THREE.Group(); body = new THREE.Group(); face = new FaceTex();
  hands: THREE.Mesh[] = []; shoes: THREE.Group[] = []; headY: number; torsoTop: number; hipY: number; legLen: number; hat: THREE.Object3D | null = null; hatY = 0;
  private arms: { stick: TubeLimb; sleeve: TubeLimb | null; cuff: THREE.Mesh | null }[] = []; private legs: TubeLimb[] = [];
  constructor(public S: CharSpec3) {
    const { r, leg, torsoH, torsoR } = S, flat = S.flat ?? 0.78, limbM = new THREE.MeshStandardMaterial({ color: S.limb ?? "#2a2830", roughness: 0.55 });
    this.root.add(this.body); this.hipY = leg + 0.05; this.torsoTop = this.hipY + torsoH - 0.03; this.headY = this.torsoTop + r * 0.8; this.legLen = ((this.hipY + 0.04 - 0.06) / 2) * 1.025;
    const tor = inked(torsoGeo(torsoR, torsoH), S.shirt, 0.005); tor.position.y = this.hipY - 0.03; tor.scale.z = flat; this.body.add(tor);
    this.head.position.y = this.headY; this.body.add(this.head); this.face.draw("init", S.face);
    const hm = new THREE.MeshPhysicalMaterial({ map: this.face.tex, color: S.skin ?? "#dedad3", roughness: 0.68, clearcoat: 0.06, clearcoatRoughness: 0.5, specularIntensity: 0.4 });
    // the ink stays ink: where the face texture is ink-dark, the lit result is pulled back to flat ink (no sun glare on the eyes)
    hm.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace("#include <opaque_fragment>", `#include <opaque_fragment>
      float inkK = 1.0 - smoothstep(0.016, 0.05, max(sampledDiffuseColor.r, max(sampledDiffuseColor.g, sampledDiffuseColor.b)));
      gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.010, 0.009, 0.012), inkK);`); };
    hm.customProgramCacheKey = () => "inkhead";
    const head = inked(new THREE.SphereGeometry(r, 96, 64), hm, 0.006); head.scale.set(1, 1.02, 0.94); this.head.add(head);
    if (S.hair) { const h = S.hair; const hg = hairGeo(r, h.keep, h.rb, h.out, h.jitter, h.n, h.flat); const hair = inked(hg, new THREE.MeshPhysicalMaterial({ color: h.col, roughness: 0.72, sheen: 0.35, sheenColor: new THREE.Color("#7a6a60") }), 0.005); hair.scale.set(1, 1.02, 0.94); this.head.add(hair); }
    for (let i = 0; i < 2; i++) { const s = i === 0 ? -1 : 1, sm = S.sleeveMat ?? S.shirt;
      const stick = new TubeLimb(this.body, 0.017, limbM), sleeve = S.sleeve ? new TubeLimb(this.body, S.sleeveR ?? 0.04, sm, 0.004, 16) : null;
      const cuff = S.sleeve ? inked(new THREE.TorusGeometry(S.sleeveR ?? 0.04, 0.008, 10, 24), sm, 0.003) : null; if (cuff) this.body.add(cuff);
      this.arms.push({ stick, sleeve, cuff });
      const hand = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.036, 24, 16), limbM)); hand.scale.set(1, 1.05, 0.85);
      const th = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), limbM)); th.position.set(-s * 0.03, 0.012, 0.012); hand.add(th); this.body.add(hand); this.hands.push(hand);
      this.setArm(i, V(...S.arms[i][0]), V(...S.arms[i][1])); }
    const shoeM = new THREE.MeshPhysicalMaterial({ color: S.shoe ?? "#2c2b31", roughness: 0.55, clearcoat: 0.15 });
    for (let i = 0; i < 2; i++) { const s = i === 0 ? -1 : 1;
      this.legs.push(new TubeLimb(this.body, 0.021, limbM));
      if (S.shorts) { const sh = inked(new THREE.CylinderGeometry(0.052, 0.058, 0.13, 24, 1, true), S.shorts, 0.004); sh.position.set(s * torsoR * 0.43, this.hipY - 0.05, 0); this.body.add(sh); }
      const g = new THREE.Group(); this.body.add(g); this.shoes.push(g);
      const shoe = shadow(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), shoeM)); shoe.scale.set(0.058, 0.042, 0.1); shoe.position.set(0, -0.02, 0.03); g.add(shoe);
      const ol = new THREE.Mesh(shoe.geometry, outlineMat(0.07)); shoe.add(ol);
      this.setLeg(i, this.restFoot(i)); }
  }
  side = (i: number) => (i === 0 ? -1 : 1);
  shoulder(i: number) { return V(this.side(i) * this.S.torsoR * 0.82, this.torsoTop - 0.07, 0); }
  hip(i: number) { return V(this.side(i) * this.S.torsoR * 0.42, this.hipY + 0.04, 0); }
  restFoot(i: number) { return V(this.side(i) * this.S.torsoR * 0.52, 0.06, 0); }
  /** arm from offsets relative to the shoulder, written for the +x side (mirrored for arm 0) */
  armRel(i: number, e: V3 | THREE.Vector3, w: V3 | THREE.Vector3) { const s = this.side(i), E = Array.isArray(e) ? V(...e) : e.clone(), W = Array.isArray(w) ? V(...w) : w.clone(); E.x *= s; W.x *= s; const sh = this.shoulder(i); this.setArm(i, sh.clone().add(E), sh.clone().add(W)); }
  setArm(i: number, el: THREE.Vector3, wr: THREE.Vector3) {
    const s = this.side(i), sh = this.shoulder(i), pts = [sh, el, wr], A = this.arms[i]; A.stick.set(pts);
    const cur = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    if (A.sleeve && A.cuff) { const f = this.S.sleeve!; const sp = Array.from({ length: 8 }, (_, k) => cur.getPoint((k / 7) * f)); sp[0] = sh.clone().add(V(-s * 0.03, 0.01, 0)); A.sleeve.set(sp);
      A.cuff.position.copy(cur.getPoint(f)); A.cuff.quaternion.setFromUnitVectors(V(0, 0, 1), cur.getTangent(f)); }
    const tan = cur.getTangent(1); this.hands[i].position.copy(wr).addScaledVector(tan, 0.022);
  }
  /** leg by two-bone IK: the knee bends forward; foot = ankle point (local), pitch tips the shoe */
  setLeg(i: number, foot: THREE.Vector3, pitch = 0) {
    const hip = this.hip(i), l = this.legLen, d = foot.clone().sub(hip), dist = Math.min(d.length(), 2 * l * 0.999), dn = d.clone().normalize();
    const mid = hip.clone().addScaledVector(dn, dist / 2), h = Math.sqrt(Math.max(0, l * l - (dist / 2) * (dist / 2)));
    const fw = V(0, 0, 1).addScaledVector(dn, -dn.z).normalize(), knee = mid.addScaledVector(fw, h), ank = hip.clone().addScaledVector(dn, dist);
    this.legs[i].set([hip, knee, ank]); const sh = this.shoes[i]; sh.position.copy(ank); sh.rotation.set(pitch, 0, 0);
  }
  front(x: number, yn: number, out = 0) { const S = this.S, R = S.torsoR * (yn > 0.9 ? 0.8 : 0.97), y = this.hipY - 0.03 + yn * S.torsoH; return V(x, y, Math.sqrt(Math.max(0, R * R - x * x)) * (S.flat ?? 0.78) + out); }
  add(o: THREE.Object3D) { this.body.add(o); return o; }
  setHat(o: THREE.Object3D) { this.hat = o; this.hatY = o.position.y; }
  /** idle life: breathing, a slow head tilt and nod */
  update(t: number, ph = 0) {
    this.body.position.y = 0.004 * Math.sin(t * 2.2 + ph);
    this.head.rotation.set(0.03 * Math.sin(t * 1.3 + ph), 0.05 * Math.sin(t * 0.7 + ph), 0.04 * Math.sin(t * 0.9 + ph * 2));
  }
}

// ---------------- the ink face: eyes, brows, mouths (same names as the 2D acting engine) ----------------
export type Face3 = { eyes: [Eye, Eye]; brows: [Brow, Brow]; mouth: Mouth; look: [number, number]; blink: number };
export type Traits = { eyeX: number; eyeY: number; eyeR: number; pupil: number; browY: number; browW: number; browK: number; mouthY: number; mouthW: number;
  mustache?: boolean; lashes?: boolean; blush?: boolean; freckles?: boolean; creases?: boolean; gapTooth?: boolean };
type PF = (x: number, y: number) => [number, number];
const MOUTH_IN = "#4b1d26", TONGUE = "#e5707e";
const ink = (g: CanvasRenderingContext2D, u: number, k = 1) => { g.strokeStyle = INK; g.fillStyle = INK; g.lineWidth = 0.034 * u * k; };
const drawEye = (g: CanvasRenderingContext2D, P: PF, u: number, T: Traits, side: number, e: Eye, look: [number, number], blink: number) => {
  const x = side * T.eyeX, y = T.eyeY, [cx, cy] = P(x, y);
  let kind = e.kind; const lid0 = Math.max(e.lid ?? 0, blink);
  if (lid0 > 0.9 && kind !== "happy" && kind !== "squeeze") kind = "closed";
  const sz = (e.size ?? 1) * ({ big: 1.12, round: 1.15, shock: 1.3 } as Record<string, number>)[kind] || (e.size ?? 1), R = T.eyeR * sz * u;
  if (kind === "closed") { ink(g, u, 1.1); g.beginPath(); g.moveTo(cx - R, cy); g.quadraticCurveTo(cx, cy + R * 0.55, cx + R, cy); g.stroke(); return; }
  if (kind === "happy") { ink(g, u, 1.2); g.beginPath(); g.moveTo(cx - R, cy + R * 0.25); g.quadraticCurveTo(cx, cy - R * 0.9, cx + R, cy + R * 0.25); g.stroke(); return; }
  if (kind === "squeeze") { ink(g, u, 1.2); g.beginPath(); g.moveTo(cx - side * R, cy - R * 0.6); g.lineTo(cx + side * R * 0.7, cy); g.lineTo(cx - side * R, cy + R * 0.6); g.stroke(); return; }
  const pr = T.pupil * u * ({ big: 1.25, round: 0.62, shock: 0.42 } as Record<string, number>)[kind] || T.pupil * u;
  const px = cx + look[0] * R * 0.5, py = cy - look[1] * R * 0.5;
  g.save(); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip(); g.fillStyle = "#ffffff"; g.fill();
  g.fillStyle = INK; g.beginPath(); g.arc(px, py, pr, 0, Math.PI * 2); g.fill();
  if (kind !== "shock") { g.fillStyle = "#ffffff"; g.beginPath(); g.arc(px + pr * 0.38, py - pr * 0.38, pr * 0.32, 0, Math.PI * 2); g.fill(); }
  if (lid0 > 0.02) { const ang = (e.lidAng ?? 0) * side, ly = cy - R + 2 * R * lid0; g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(cx - R * 1.1, cy - R * 1.2); g.lineTo(cx + R * 1.1, cy - R * 1.2); g.lineTo(cx + R * 1.1, ly + ang * R); g.lineTo(cx - R * 1.1, ly - ang * R); g.closePath(); g.fill();
    ink(g, u); g.beginPath(); g.moveTo(cx - R * 1.1, ly - ang * R); g.lineTo(cx + R * 1.1, ly + ang * R); g.stroke(); }
  g.restore(); ink(g, u); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
  if (T.lashes) { ink(g, u, 1.1); for (let k = 0; k < 3; k++) { const a = Math.PI / 2 - (0.35 + k * 0.33) * side, ex = cx + Math.cos(a) * R * side * side, ey = cy - Math.sin(a) * R; const bx = ex + Math.cos(a) * R * 0.35, by = ey - Math.sin(a) * R * 0.35; if (Math.sin(a) > 0 && side * Math.cos(a) > -0.2) { g.beginPath(); g.moveTo(ex, ey); g.lineTo(bx, by); g.stroke(); } } }
};
const drawBrow = (g: CanvasRenderingContext2D, P: PF, u: number, T: Traits, side: number, b: Brow) => {
  if (b.hide) return; const cx = side * T.eyeX, cy = T.browY - b.dy * 1.3, hw = T.browW / 2, a = (b.ang ?? 0) * 0.55;
  const inner = [cx - side * hw * Math.cos(a), cy + hw * Math.sin(a)], outer = [cx + side * hw * Math.cos(a), cy - hw * Math.sin(a)], mid = [cx, cy + (b.arch ?? 0) * 1.6 + 0.02];
  ink(g, u, T.browK); g.beginPath(); g.moveTo(...P(inner[0], inner[1])); g.quadraticCurveTo(...P(mid[0], mid[1]), ...P(outer[0], outer[1])); g.stroke();
};
const drawMouth = (g: CanvasRenderingContext2D, P: PF, u: number, T: Traits, m: Mouth) => {
  const cx = (m.dx ?? 0) * 0.6, cy = T.mouthY, ww = T.mouthW * (m.w ?? 1), o = Math.max(0, m.open), k = m.kind;
  const [X, Y] = P(cx, cy); g.save(); g.translate(X, Y); g.rotate(-(m.tilt ?? 0) * 0.6); const W = ww * u, Hh = o * 0.16 * u;
  const closed = ["pout", "line", "m", "smile", "smirk", "frown", "wavy"].includes(k) && o < 0.12;
  ink(g, u);
  if (closed || (o < 0.05 && k !== "oo")) {
    g.beginPath();
    if (k === "smile" || k === "smileBig") { g.moveTo(-W * 0.5, -W * 0.08); g.quadraticCurveTo(0, W * 0.3, W * 0.5, -W * 0.08); }
    else if (k === "smirk") { g.moveTo(-W * 0.45, W * 0.02); g.quadraticCurveTo(W * 0.1, W * 0.18, W * 0.5, -W * 0.14); }
    else if (k === "frown") { g.moveTo(-W * 0.45, W * 0.1); g.quadraticCurveTo(0, -W * 0.22, W * 0.45, W * 0.1); }
    else if (k === "wavy") { g.moveTo(-W * 0.45, 0); for (let i = 1; i <= 8; i++) g.lineTo(-W * 0.45 + (i / 8) * W * 0.9, Math.sin(i * 1.6) * W * 0.06); }
    else if (k === "pout") { g.moveTo(-W * 0.22, 0); g.quadraticCurveTo(0, W * 0.07, W * 0.22, 0); }
    else { g.moveTo(-W * 0.4, 0); g.lineTo(W * 0.4, 0); }
    g.stroke(); g.restore(); return;
  }
  const shape = () => { g.beginPath();
    if (k === "o" || k === "oo" || k === "talkO" || k === "stadium") { const w2 = (k === "oo" ? 0.3 : k === "o" ? 0.4 : k === "talkO" ? 0.5 : 0.62) * W, h2 = Math.max(Hh, k === "oo" ? 0.05 * u : 0.02 * u); g.ellipse(0, h2 * 0.3, w2, h2, 0, 0, Math.PI * 2); }
    else if (k === "zigzag") { const w2 = 0.55 * W; g.ellipse(0, Hh * 0.3, w2, Math.max(Hh, 0.04 * u), 0, 0, Math.PI * 2); }
    else if (k === "clench") { const w2 = 0.6 * W, h2 = Math.max(0.06 * u, Hh * 0.6); g.roundRect(-w2, -h2 * 0.5, 2 * w2, h2, h2 * 0.45); }
    else { const w2 = (k === "wide" ? 0.62 : k === "smileBig" || k === "laugh" ? 0.6 : 0.52) * W, lift = k === "smileBig" || k === "laugh" ? W * 0.12 : 0; g.moveTo(-w2, -lift); g.quadraticCurveTo(0, lift * 0.3, w2, -lift); g.quadraticCurveTo(w2 * 0.9, Hh * 1.6, 0, Hh * 1.65); g.quadraticCurveTo(-w2 * 0.9, Hh * 1.6, -w2, -lift); g.closePath(); } };
  shape(); g.fillStyle = MOUTH_IN; g.fill();
  g.save(); shape(); g.clip();
  if (k === "clench") { g.fillStyle = "#ffffff"; g.fillRect(-W, -W, 2 * W, 2 * W); ink(g, u, 0.6); g.beginPath(); g.moveTo(-W, 0); g.lineTo(W, 0); for (let i = -2; i <= 2; i++) { g.moveTo(i * W * 0.2, -W); g.lineTo(i * W * 0.2, W); } g.stroke(); }
  else { if (Hh > 0.04 * u || k === "zigzag") { g.fillStyle = "#ffffff"; g.fillRect(-W, -W, 2 * W, W + Math.min(Hh * 0.35, 0.05 * u) - (k === "smileBig" || k === "laugh" ? W * 0.02 : 0) + (k === "o" || k === "talkO" || k === "stadium" || k === "zigzag" ? -Hh * 0.6 : 0));
      if (T.gapTooth) { g.fillStyle = MOUTH_IN; g.fillRect(-0.025 * u, -W, 0.05 * u, W + 0.03 * u); } }
    if (Hh > 0.06 * u) { g.fillStyle = TONGUE; g.beginPath(); g.ellipse(0, Hh * 1.55, W * 0.32, Hh * 0.55, 0, 0, Math.PI * 2); g.fill(); } }
  g.restore(); ink(g, u); shape(); g.stroke(); g.restore();
};
/** a face painter for one character's traits and the current face state */
export const paintFace = (T: Traits, f: Face3): FaceFn => (g, P, u) => {
  if (T.blush) for (const s of [-1, 1]) { const [bx, by] = P(s * (T.eyeX + 0.16), T.eyeY - 0.19); g.fillStyle = "rgba(240,130,140,0.45)"; g.beginPath(); g.ellipse(bx, by, 0.13 * u, 0.07 * u, 0, 0, Math.PI * 2); g.fill(); }
  if (T.freckles) { g.fillStyle = "rgba(150,90,60,0.55)"; for (const s of [-1, 1]) for (const [x, y] of [[0.4, -0.13], [0.47, -0.18], [0.36, -0.2], [0.44, -0.24]]) { g.beginPath(); g.arc(...P(s * x, y), 0.014 * u, 0, Math.PI * 2); g.fill(); } }
  drawEye(g, P, u, T, -1, f.eyes[0], f.look, f.blink); drawEye(g, P, u, T, 1, f.eyes[1], f.look, f.blink);
  drawBrow(g, P, u, T, -1, f.brows[0]); drawBrow(g, P, u, T, 1, f.brows[1]);
  ink(g, u, 0.85); g.beginPath(); g.moveTo(...P(-0.04, -0.06)); g.quadraticCurveTo(...P(0.07, -0.13), ...P(0.0, -0.18)); g.stroke(); // nose
  if (T.creases) { ink(g, u, 0.6); for (const s of [-1, 1]) { g.beginPath(); g.moveTo(...P(s * 0.5, 0)); g.quadraticCurveTo(...P(s * 0.53, -0.06), ...P(s * 0.49, -0.12)); g.stroke(); } }
  drawMouth(g, P, u, T, f.mouth);
  if (T.mustache) { const lift = Math.min(0.05, f.mouth.open * 0.04); g.fillStyle = INK; g.beginPath(); g.moveTo(...P(0, -0.2 + lift)); g.bezierCurveTo(...P(-0.12, -0.16 + lift), ...P(-0.3, -0.2 + lift), ...P(-0.34, -0.33 + lift)); g.bezierCurveTo(...P(-0.22, -0.27 + lift), ...P(-0.1, -0.29 + lift), ...P(0, -0.26 + lift));
    g.bezierCurveTo(...P(0.1, -0.29 + lift), ...P(0.22, -0.27 + lift), ...P(0.34, -0.33 + lift)); g.bezierCurveTo(...P(0.3, -0.2 + lift), ...P(0.12, -0.16 + lift), ...P(0, -0.2 + lift)); g.fill(); }
};
/** a stable key for a face state (2 decimals) so unchanged faces are not repainted */
export const faceKey = (f: Face3) => JSON.stringify(f, (_, v) => (typeof v === "number" ? Math.round(v * 50) / 50 : v));

// ---------------- small parts ----------------
export const collar = (c: Char3, mat: THREE.Material) => { for (const s of [-1, 1]) { const p = inked(new RoundedBoxGeometry(0.08, 0.014, 0.06, 2, 0.006), mat, 0.003); p.position.copy(c.front(s * 0.04, 0.93, 0.0)); p.rotation.set(-0.9, s * 0.35, s * 0.55); c.add(p); } };
export const buttons = (c: Char3, n: number, col = "#efe6d2", from = 0.25, to = 0.82) => { const m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.3 }); for (let i = 0; i < n; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), m); b.scale.z = 0.5; b.position.copy(c.front(0, from + ((to - from) * i) / Math.max(1, n - 1), 0.002)); c.add(b); } };
export const clothTex = (draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, rep: [number, number] = [1, 1]) => tex(canvas(1024, 512, (g) => draw(g, 1024, 512)), rep);
export const cloth = (map: THREE.Texture, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.85, ...o });
export const solidCloth = (base: string, k = 14) => cloth(clothTex((g, w, h) => fabric(g, w, h, base, k)));
export { fabric, inked, outlineMat, V };
