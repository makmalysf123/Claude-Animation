// Muscular 3D mannequin fighters (test 2026-11-18), made entirely in code:
//  - our own skeleton (A-pose bind, every bind rotation = identity, so posing works in plain character space),
//  - a body sculpted as a signed-distance field (pecs, six-pack, lats, delts, biceps, quads, calves...) smooth-unioned
//    and turned into a mesh with marching cubes, then auto-skinned to the bones,
//  - real hands: palm + 3-segment fingers + thumb as rigid pieces on the finger bones (or a boxing glove),
//  - a cel shader with 3 hard tones whose edges are broken by brush noise (stuck to the skin, so they never boil),
//    plus brushy white highlight streaks.
// Character space: facing +z, left = +x, feet on y = 0, metres.
import * as THREE from "three";
import { edgeTable as ET, triTable as TT } from "three/examples/jsm/objects/MarchingCubes.js";
const edgeTable = ET as unknown as Int32Array, triTable = TT as unknown as Int32Array; // (the .d.ts is wrong: both are flat Int32Arrays)
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

type V3 = [number, number, number];
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const S2 = Math.SQRT1_2;

// ======================= skeleton =======================
type BoneDef = { name: string; parent: string | null; p: V3 };
const ARM_D = V(S2, -S2, 0); // left arm direction in the A-pose bind
const FINGERS = [ // name, offset across the palm (z), length scale
  ["Index", 0.028, 0.95], ["Middle", 0.009, 1.0], ["Ring", -0.01, 0.95], ["Pinky", -0.027, 0.8],
] as const;
const defs = (): BoneDef[] => {
  const D: BoneDef[] = [
    { name: "hips", parent: null, p: [0, 0.98, 0] }, { name: "spine", parent: "hips", p: [0, 1.06, -0.005] },
    { name: "spine1", parent: "spine", p: [0, 1.17, -0.01] }, { name: "chest", parent: "spine1", p: [0, 1.29, -0.01] },
    { name: "neck", parent: "chest", p: [0, 1.5, -0.02] }, { name: "head", parent: "neck", p: [0, 1.58, 0] }, { name: "headTop", parent: "head", p: [0, 1.82, 0] },
  ];
  for (const [s, sx] of [["L", 1], ["R", -1]] as const) {
    const m = (v: THREE.Vector3): V3 => [v.x * sx, v.y, v.z];
    const sh = V(0.19, 1.45, -0.02), el = sh.clone().addScaledVector(ARM_D, 0.29), wr = el.clone().addScaledVector(ARM_D, 0.26), kn = wr.clone().addScaledVector(ARM_D, 0.085);
    D.push({ name: "clav" + s, parent: "chest", p: m(V(0.03, 1.45, -0.01)) }, { name: "arm" + s, parent: "clav" + s, p: m(sh) }, { name: "fore" + s, parent: "arm" + s, p: m(el) }, { name: "hand" + s, parent: "fore" + s, p: m(wr) });
    for (const [f, dz, k] of FINGERS) { const back = f === "Pinky" ? 0.008 : 0; let p = kn.clone().addScaledVector(ARM_D, -back).add(V(0, 0, dz)); let par = "hand" + s;
      [0.04, 0.028, 0.024, 0].forEach((L, j) => { D.push({ name: f + (j + 1) + s, parent: par, p: m(p) }); par = f + (j + 1) + s; p = p.clone().addScaledVector(ARM_D, L * k); }); }
    { const n = V(-S2, -S2, 0), td = ARM_D.clone().multiplyScalar(0.4).add(V(0, 0, 0.6)).add(n.clone().multiplyScalar(0.25)).normalize();
      let p = wr.clone().addScaledVector(ARM_D, 0.022).addScaledVector(n, 0.012).add(V(0, 0, 0.03)), par = "hand" + s;
      [0.03, 0.025, 0.021, 0].forEach((L, j) => { D.push({ name: "Thumb" + (j + 1) + s, parent: par, p: m(p) }); par = "Thumb" + (j + 1) + s; p = p.clone().addScaledVector(td, L); }); }
    D.push({ name: "thigh" + s, parent: "hips", p: m(V(0.095, 0.94, 0)) }, { name: "shin" + s, parent: "thigh" + s, p: m(V(0.1, 0.52, 0.015)) },
      { name: "foot" + s, parent: "shin" + s, p: m(V(0.105, 0.09, -0.01)) }, { name: "toe" + s, parent: "foot" + s, p: m(V(0.105, 0.02, 0.13)) });
  }
  return D;
};
const DEFS = defs();
const DEF = Object.fromEntries(DEFS.map((d) => [d.name, d]));
const BP = (n: string) => V(...DEF[n].p); // bind position (character space)

// ======================= sculpted body (SDF) =======================
type Prim = { kind: "ell"; c: THREE.Vector3; r: V3; rot: number; k: number } | { kind: "cone"; a: THREE.Vector3; b: THREE.Vector3; ra: number; rb: number; k: number };
const ell = (c: V3 | THREE.Vector3, r: V3, k = 0.025, rot = 0): Prim => ({ kind: "ell", c: Array.isArray(c) ? V(...c) : c.clone(), r, rot, k });
const cone = (a: THREE.Vector3 | V3, b: THREE.Vector3 | V3, ra: number, rb: number, k = 0.025): Prim => ({ kind: "cone", a: Array.isArray(a) ? V(...a) : a.clone(), b: Array.isArray(b) ? V(...b) : b.clone(), ra, rb, k });
const prims = (): Prim[] => {
  const P: Prim[] = [
    ell([0, 1.685, 0.01], [0.098, 0.118, 0.106], 0.02), ell([0, 1.612, 0.035], [0.07, 0.055, 0.068], 0.03),
    cone([0, 1.47, -0.02], [0, 1.63, 0.0], 0.064, 0.052, 0.03),
    ell([0, 1.31, -0.005], [0.165, 0.175, 0.105], 0.03), ell([0, 1.13, 0.0], [0.128, 0.13, 0.088], 0.045), ell([0, 0.975, -0.005], [0.145, 0.1, 0.098], 0.045),
    ell([0, 1.02, 0.068], [0.05, 0.045, 0.026], 0.015),
  ];
  for (const y of [1.235, 1.165, 1.095]) for (const s of [-1, 1]) P.push(ell([s * 0.033, y, 0.072], [0.031, 0.031, 0.024], 0.011)); // six-pack
  for (const s of [-1, 1]) {
    const M = (x: number, y: number, z: number): V3 => [s * x, y, z];
    const sh = BP(s > 0 ? "armL" : "armR"), el = BP(s > 0 ? "foreL" : "foreR"), wr = BP(s > 0 ? "handL" : "handR"), d = el.clone().sub(sh).normalize(), rot = -s * Math.PI / 4;
    const hip = BP(s > 0 ? "thighL" : "thighR"), kn = BP(s > 0 ? "shinL" : "shinR"), an = BP(s > 0 ? "footL" : "footR");
    P.push(
      ell(M(0.085, 1.5, -0.035), [0.085, 0.04, 0.055], 0.03, -s * 0.45), // trapezius
      ell(M(0.075, 1.375, 0.058), [0.088, 0.06, 0.044], 0.014, -s * 0.15), // pectoral
      ell(M(0.112, 1.27, -0.045), [0.075, 0.14, 0.058], 0.03, s * 0.25), // lat
      ell(M(0.116, 1.1, 0.01), [0.05, 0.08, 0.068], 0.03), // oblique
      ell(M(0.075, 0.93, -0.068), [0.08, 0.09, 0.065], 0.03), // glute
      ell(M(0.205, 1.43, -0.015), [0.075, 0.07, 0.072], 0.02), // deltoid
      cone(sh, el, 0.046, 0.037, 0.02), ell(sh.clone().addScaledVector(d, 0.14).add(V(0, 0, 0.026)), [0.078, 0.041, 0.042], 0.02, rot), // biceps
      ell(sh.clone().addScaledVector(d, 0.13).add(V(0, 0, -0.03)), [0.088, 0.04, 0.038], 0.02, rot), // triceps
      cone(el, wr, 0.041, 0.026, 0.02), ell(el.clone().addScaledVector(d, 0.065).add(V(0, 0, 0.01)), [0.072, 0.04, 0.038], 0.02, rot), ell(wr, [0.028, 0.028, 0.03], 0.015),
      cone(hip, kn, 0.088, 0.055, 0.03), ell(M(0.106, 0.7, 0.046), [0.062, 0.14, 0.05], 0.02), ell(M(0.073, 0.57, 0.036), [0.036, 0.05, 0.035], 0.015), // quads + teardrop
      ell(M(0.1, 0.72, -0.04), [0.056, 0.14, 0.05], 0.02), ell(M(0.1, 0.52, 0.03), [0.04, 0.04, 0.034], 0.02), // hamstring, knee
      cone(kn, an, 0.051, 0.03, 0.02), ell(M(0.106, 0.36, -0.036), [0.048, 0.09, 0.045], 0.018), // calf
      cone(M(0.105, 0.08, -0.02), M(0.105, 0.03, 0.12), 0.04, 0.03, 0.02), ell(M(0.105, 0.048, -0.04), [0.035, 0.038, 0.04], 0.015), // foot, heel
    );
    for (const y of [1.27, 1.23, 1.19]) P.push(ell(M(0.137, y, 0.048), [0.024, 0.018, 0.02], 0.01)); // serratus
  }
  return P;
};
const smin = (a: number, b: number, k: number) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const evalPrim = (p: Prim, x: number, y: number, z: number) => {
  if (p.kind === "ell") { let px = x - p.c.x, py = y - p.c.y; const pz = z - p.c.z;
    if (p.rot) { const c = Math.cos(-p.rot), s = Math.sin(-p.rot), qx = px * c - py * s; py = px * s + py * c; px = qx; }
    const [rx, ry, rz] = p.r, k0 = Math.hypot(px / rx, py / ry, pz / rz), k1 = Math.hypot(px / (rx * rx), py / (ry * ry), pz / (rz * rz)); return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(rx, ry, rz); }
  const bax = p.b.x - p.a.x, bay = p.b.y - p.a.y, baz = p.b.z - p.a.z, pax = x - p.a.x, pay = y - p.a.y, paz = z - p.a.z;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)));
  return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - (p.ra + (p.rb - p.ra) * h);
};
const primBox = (p: Prim): [THREE.Vector3, THREE.Vector3] => {
  const m = 0.035 + p.k; if (p.kind === "ell") { const r = Math.max(...p.r) + m; return [p.c.clone().subScalar(r), p.c.clone().addScaledVector(V(1, 1, 1), r)]; }
  const r = Math.max(p.ra, p.rb) + m; return [p.a.clone().min(p.b).subScalar(r), p.a.clone().max(p.b).addScalar(r)];
};
/** SDF -> mesh: field on a grid (only near each primitive), marching cubes with shared vertices, normals = SDF gradient */
const sculpt = (cell = 0.006) => {
  const P = prims(), lo = V(-0.66, -0.01, -0.17), hi = V(0.66, 1.84, 0.18);
  const nx = Math.ceil((hi.x - lo.x) / cell) + 1, ny = Math.ceil((hi.y - lo.y) / cell) + 1, nz = Math.ceil((hi.z - lo.z) / cell) + 1, yd = nx, zd = nx * ny;
  const F = new Float32Array(nx * ny * nz).fill(1);
  for (const p of P) { const [a, b] = primBox(p); const i0 = Math.max(0, Math.floor((a.x - lo.x) / cell)), i1 = Math.min(nx - 1, Math.ceil((b.x - lo.x) / cell)), j0 = Math.max(0, Math.floor((a.y - lo.y) / cell)), j1 = Math.min(ny - 1, Math.ceil((b.y - lo.y) / cell)), k0 = Math.max(0, Math.floor((a.z - lo.z) / cell)), k1 = Math.min(nz - 1, Math.ceil((b.z - lo.z) / cell));
    for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const q = i + j * yd + k * zd; F[q] = smin(F[q], evalPrim(p, lo.x + i * cell, lo.y + j * cell, lo.z + k * cell), p.k); } }
  const pos: number[] = [], nor: number[] = [], idx: number[] = [], vmap = new Map<number, number>();
  const grad = (i: number, j: number, k: number, out: number[]) => { const q = i + j * yd + k * zd;
    out[0] = F[q + (i < nx - 1 ? 1 : 0)] - F[q - (i > 0 ? 1 : 0)]; out[1] = F[q + (j < ny - 1 ? yd : 0)] - F[q - (j > 0 ? yd : 0)]; out[2] = F[q + (k < nz - 1 ? zd : 0)] - F[q - (k > 0 ? zd : 0)]; };
  const ga = [0, 0, 0], gb = [0, 0, 0];
  const vert = (i: number, j: number, k: number, axis: 0 | 1 | 2) => {
    const key = (i + j * yd + k * zd) * 3 + axis; const got = vmap.get(key); if (got !== undefined) return got;
    const i2 = i + (axis === 0 ? 1 : 0), j2 = j + (axis === 1 ? 1 : 0), k2 = k + (axis === 2 ? 1 : 0), fa = F[i + j * yd + k * zd], fb = F[i2 + j2 * yd + k2 * zd], t = fa / (fa - fb);
    pos.push(lo.x + (i + (i2 - i) * t) * cell, lo.y + (j + (j2 - j) * t) * cell, lo.z + (k + (k2 - k) * t) * cell);
    grad(i, j, k, ga); grad(i2, j2, k2, gb); const n = V(ga[0] + (gb[0] - ga[0]) * t, ga[1] + (gb[1] - ga[1]) * t, ga[2] + (gb[2] - ga[2]) * t).normalize(); nor.push(n.x, n.y, n.z);
    const id = pos.length / 3 - 1; vmap.set(key, id); return id;
  };
  // edge -> (corner offset, axis), Bourke numbering
  const E: [number, number, number, 0 | 1 | 2][] = [[0, 0, 0, 0], [1, 0, 0, 1], [0, 1, 0, 0], [0, 0, 0, 1], [0, 0, 1, 0], [1, 0, 1, 1], [0, 1, 1, 0], [0, 0, 1, 1], [0, 0, 0, 2], [1, 0, 0, 2], [1, 1, 0, 2], [0, 1, 0, 2]];
  const C: [number, number, number][] = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
  const ev = new Int32Array(12);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let ci = 0; for (let c = 0; c < 8; c++) if (F[i + C[c][0] + (j + C[c][1]) * yd + (k + C[c][2]) * zd] < 0) ci |= 1 << c;
    const bits = edgeTable[ci]; if (!bits) continue;
    for (let e = 0; e < 12; e++) if (bits & (1 << e)) { const [a, b, c, ax] = E[e]; ev[e] = vert(i + a, j + b, k + c, ax); }
    for (let t = 0; triTable[ci * 16 + t] !== -1; t += 3) idx.push(ev[triTable[ci * 16 + t]], ev[triTable[ci * 16 + t + 1]], ev[triTable[ci * 16 + t + 2]]);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
  // make the winding agree with the outward normals
  { const a = V().fromArray(pos, idx[0] * 3), b = V().fromArray(pos, idx[1] * 3), c = V().fromArray(pos, idx[2] * 3), fn = b.clone().sub(a).cross(c.clone().sub(a)), n = V().fromArray(nor, idx[0] * 3);
    if (fn.dot(n) < 0) { for (let t = 0; t < idx.length; t += 3) { const s = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = s; } g.setIndex(idx); } }
  return g;
};

// ======================= skinning =======================
const SKIN_BONES: [string, string][] = [["hips", "spine"], ["spine", "spine1"], ["spine1", "chest"], ["chest", "neck"], ["neck", "head"], ["head", "headTop"]];
for (const s of ["L", "R"]) SKIN_BONES.push(["clav" + s, "arm" + s], ["arm" + s, "fore" + s], ["fore" + s, "hand" + s], ["thigh" + s, "shin" + s], ["shin" + s, "foot" + s], ["foot" + s, "toe" + s]);
const segDist = (p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3) => { const ab = b.clone().sub(a), h = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())); return p.distanceTo(a.clone().addScaledVector(ab, h)); };
const skin = (g: THREE.BufferGeometry, boneIndex: (n: string) => number) => {
  const pos = g.attributes.position, n = pos.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), p = V();
  // distance is measured to the bone's flesh (segment distance minus its typical radius), so the wide torso keeps its
  // own side flesh instead of handing it to the nearby upper arm
  const RAD: Record<string, number> = { hips: 0.14, spine: 0.13, spine1: 0.14, chest: 0.15, neck: 0.06, head: 0.1, clav: 0.06, arm: 0.05, fore: 0.038, thigh: 0.085, shin: 0.05, foot: 0.035 };
  const segs = SKIN_BONES.map(([a, b]) => ({ i: boneIndex(a), a: BP(a), b: BP(b), side: a.endsWith("L") ? 1 : a.endsWith("R") ? -1 : 0, rad: RAD[a.endsWith("L") || a.endsWith("R") ? a.slice(0, -1) : a] }));
  for (let v = 0; v < n; v++) { p.fromBufferAttribute(pos, v);
    const d = segs.map((s) => (s.side && Math.sign(p.x) !== s.side && Math.abs(p.x) > 0.02 ? 9 : segDist(p, s.a, s.b) - s.rad));
    const dmin = Math.min(...d), w = d.map((x) => Math.exp(-(((x - dmin) / 0.028) ** 2)));
    const top = w.map((x, i) => [x, i]).sort((A, B) => B[0] - A[0]).slice(0, 4), sum = top.reduce((s, [x]) => s + x, 0);
    top.forEach(([x, i], k) => { si[v * 4 + k] = segs[i].i; sw[v * 4 + k] = x / sum; }); }
  g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4));
};
let BODY: THREE.BufferGeometry | null = null;

// ======================= cel material with brush edges =======================
const BRUSH_GLSL = `
varying vec3 vBrushP;
float bh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float bn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(bh(i), bh(i + vec3(1,0,0)), f.x), mix(bh(i + vec3(0,1,0)), bh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(bh(i + vec3(0,0,1)), bh(i + vec3(1,0,1)), f.x), mix(bh(i + vec3(0,1,1)), bh(i + vec3(1,1,1)), f.x), f.y), f.z); }
float brush(){ vec3 p = vBrushP; return bn(p * vec3(34.0, 9.0, 34.0)) * 0.6 + bn(p * vec3(120.0, 26.0, 120.0)) * 0.4; }
`;
export const celMat = (col: string, o: { deep?: number; mid?: number; spec?: string; specK?: number } = {}) => {
  const m = new THREE.MeshToonMaterial({ color: col });
  const deep = (o.deep ?? 0.24).toFixed(3), mid = (o.mid ?? 0.52).toFixed(3), sp = new THREE.Color(o.spec ?? "#fff1ec"), spK = (o.specK ?? 0.55).toFixed(3);
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vBrushP;").replace("#include <skinning_vertex>", "#include <skinning_vertex>\nvBrushP = transformed;");
    s.fragmentShader = s.fragmentShader.replace("#include <gradientmap_pars_fragment>", `${BRUSH_GLSL}
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
  float d = dot( normal, lightDirection ) + ( brush() - 0.5 ) * 0.46;
  return vec3( d > 0.08 ? 1.0 : ( d > -0.32 ? ${mid} : ${deep} ) );
}`).replace("#include <opaque_fragment>", `#include <opaque_fragment>
#if NUM_DIR_LIGHTS > 0
  { vec3 Nn = normalize( vNormal ); vec3 Ll = directionalLights[ 0 ].direction; vec3 Vv = normalize( vViewPosition );
    float hh = dot( normalize( Ll + Vv ), Nn ); float st = step( 0.992 - brush() * 0.025, hh );
    gl_FragColor.rgb = mix( gl_FragColor.rgb, vec3(${sp.r.toFixed(3)}, ${sp.g.toFixed(3)}, ${sp.b.toFixed(3)}), st * ${spK} ); }
#endif`);
  };
  m.customProgramCacheKey = () => `cel${col}${deep}${mid}${spK}`;
  return m;
};

// ======================= the fighter =======================
export type FighterOpts = { color: string; gloves?: boolean; gloveColor?: string };
export class Fighter {
  root = new THREE.Group(); bones: Record<string, THREE.Bone> = {}; mesh: THREE.SkinnedMesh; mat: THREE.Material;
  /** character-space rotation and position of every bone for the current pose */
  q: Record<string, THREE.Quaternion> = {}; p: Record<string, THREE.Vector3> = {};
  private len: Record<string, number> = {};
  constructor(public o: FighterOpts) {
    for (const d of DEFS) { const b = new THREE.Bone(); b.name = d.name; const par = d.parent ? this.bones[d.parent] : null; b.position.copy(BP(d.name)).sub(par ? BP(d.parent!) : V()); (par ?? this.root).add(b); this.bones[d.name] = b; }
    this.mat = celMat(o.color);
    if (!BODY) BODY = sculpt();
    const names = DEFS.map((d) => d.name), g = BODY.clone(); skin(g, (n) => names.indexOf(n));
    this.mesh = new THREE.SkinnedMesh(g, this.mat); this.mesh.castShadow = this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
    this.root.add(this.mesh); this.root.updateMatrixWorld(true);
    this.mesh.bind(new THREE.Skeleton(names.map((n) => this.bones[n])), this.mesh.matrixWorld);
    for (const d of DEFS) if (d.parent) this.len[d.name] = BP(d.name).distanceTo(BP(d.parent));
    for (const s of ["L", "R"]) this.hand(s, o);
    this.reset();
  }
  /** palm + fingers (rigid pieces on the bones), or a boxing glove */
  private hand(s: string, o: FighterOpts) {
    const sx = s === "L" ? 1 : -1, wr = BP("hand" + s), d = ARM_D.clone().multiplyScalar(1).setX(S2 * sx), n = V(-S2 * sx, -S2, 0), w = V(0, 0, 1);
    const basis = new THREE.Matrix4().makeBasis(d, n, d.clone().cross(n).normalize());
    const put = (geo: THREE.BufferGeometry, mat: THREE.Material, center: THREE.Vector3, bone: string) => { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; m.quaternion.setFromRotationMatrix(basis); m.position.copy(center).sub(BP(bone)); this.bones[bone].add(m); return m; };
    if (o.gloves) {
      const gm = celMat(o.gloveColor ?? "#17161a", { deep: 0.55, mid: 0.8, spec: "#d8d8de", specK: 0.9 });
      const gl = new THREE.SphereGeometry(1, 40, 28); gl.scale(0.078, 0.062, 0.068); put(gl, gm, wr.clone().addScaledVector(d, 0.075).addScaledVector(n, 0.012), "hand" + s);
      const th = new THREE.SphereGeometry(1, 24, 16); th.scale(0.045, 0.028, 0.03); put(th, gm, wr.clone().addScaledVector(d, 0.05).addScaledVector(n, 0.01).addScaledVector(w, 0.06), "hand" + s);
      const cuff = new THREE.CylinderGeometry(0.044, 0.05, 0.075, 28); cuff.rotateZ(-Math.PI / 2); put(cuff, gm, wr.clone().addScaledVector(d, 0.005), "hand" + s);
      return;
    }
    put(new RoundedBoxGeometry(0.09, 0.03, 0.078, 3, 0.012), this.mat, wr.clone().addScaledVector(d, 0.048), "hand" + s);
    for (const [f, , k] of FINGERS) for (let j = 1; j <= 3; j++) { const a = BP(f + j + s), b = BP(f + (j + 1) + s), L = a.distanceTo(b), r = 0.0105 * (f === "Pinky" ? 0.88 : 1) * (j === 3 ? 0.92 : 1);
      put(new THREE.CapsuleGeometry(r, L, 6, 12).rotateZ(-Math.PI / 2 * 1), this.mat, a.clone().lerp(b, 0.5), f + j + s); void k; }
    for (let j = 1; j <= 3; j++) { const a = BP("Thumb" + j + s), b = BP("Thumb" + (j + 1) + s), L = a.distanceTo(b), m = new THREE.Mesh(new THREE.CapsuleGeometry(0.0115, L, 6, 12), this.mat);
      m.castShadow = true; m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); m.position.copy(a.clone().lerp(b, 0.5)).sub(BP("Thumb" + j + s)); this.bones["Thumb" + j + s].add(m); }
  }
  // ---------------- posing in character space ----------------
  reset() { for (const d of DEFS) { this.q[d.name] = new THREE.Quaternion(); } this.fk(); }
  /** forward kinematics: positions from the rotations; writes the bones' local transforms */
  fk(hipsPos?: THREE.Vector3) {
    for (const d of DEFS) { const b = this.bones[d.name];
      if (!d.parent) { this.p[d.name] = (hipsPos ?? BP(d.name)).clone(); b.position.copy(this.p[d.name]); b.quaternion.copy(this.q[d.name]); continue; }
      const pq = this.q[d.parent]; this.p[d.name] = this.p[d.parent].clone().add(BP(d.name).sub(BP(d.parent)).applyQuaternion(pq));
      b.quaternion.copy(pq.clone().invert().multiply(this.q[d.name])); }
  }
  /** rotation that turns bind direction d0 (with bind up u0) into d1 (with up near u1) */
  static aimQ(d0: THREE.Vector3, u0: THREE.Vector3, d1: THREE.Vector3, u1: THREE.Vector3) {
    const f = (d: THREE.Vector3, u: THREE.Vector3) => { const x = d.clone().normalize(), z = u.clone().sub(x.clone().multiplyScalar(u.dot(x))).normalize(), y = z.clone().cross(x); return new THREE.Matrix4().makeBasis(x, y, z); };
    const m = f(d1, u1).multiply(f(d0, u0).transpose()); return new THREE.Quaternion().setFromRotationMatrix(m);
  }
  bindDir(a: string, b: string) { return BP(b).sub(BP(a)).normalize(); }
  /** two-bone IK for an arm or a leg: root bone, mid bone, end bone; target point and pole (bend direction), all in character space */
  ik(a: string, b: string, c: string, target: THREE.Vector3, pole: THREE.Vector3, up0: THREE.Vector3) {
    this.fk(this.p.hips); const S = this.p[a], l1 = this.len[b], l2 = this.len[c], T = target.clone().sub(S), d = Math.min(T.length(), (l1 + l2) * 0.999), dir = T.normalize();
    const ca = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - ca * ca)), pl = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
    const E = S.clone().addScaledVector(dir, ca).addScaledVector(pl, h), W = S.clone().addScaledVector(dir, d);
    const bendUp = W.clone().sub(E).sub(E.clone().sub(S).normalize().multiplyScalar(W.clone().sub(E).dot(E.clone().sub(S).normalize())));
    const up = bendUp.lengthSq() > 1e-6 ? bendUp.normalize() : up0;
    this.q[a] = Fighter.aimQ(this.bindDir(a, b), up0, E.clone().sub(S), up); this.q[b] = Fighter.aimQ(this.bindDir(b, c), up0, W.clone().sub(E), up);
    this.fk(this.p.hips); return { E, W };
  }
  /** hand orientation: fist pointing along dir, palm facing palm; curl 0..1 closes the fingers */
  handPose(s: "L" | "R", dir: THREE.Vector3, palm: THREE.Vector3, curl = 1, thumb = curl) {
    const sx = s === "L" ? 1 : -1, d0 = V(S2 * sx, -S2, 0), n0 = V(-S2 * sx, -S2, 0);
    this.q["hand" + s] = Fighter.aimQ(d0, n0, dir, palm); const hq = this.q["hand" + s], ax = d0.clone().cross(n0).normalize();
    for (const [f] of FINGERS) { let a = 0; for (let j = 1; j <= 4; j++) { a += (j === 1 ? 1.45 : j === 2 ? 1.75 : 1.2) * curl * (j < 4 ? 1 : 0); this.q[f + j + s] = hq.clone().multiply(new THREE.Quaternion().setFromAxisAngle(ax, Math.min(a, 4.2))); } }
    // thumb: lies across the middle segments of the curled index and middle fingers (hand-local maths, bind frame)
    const chain = (f: string) => { const out = [BP(f + "1" + s)]; let a = 0; for (let j = 1; j <= 3; j++) { a += (j === 1 ? 1.45 : j === 2 ? 1.75 : 1.2) * curl; out.push(out[j - 1].clone().add(BP(f + (j + 1) + s).sub(BP(f + j + s)).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(ax, Math.min(a, 4.2))))); } return out; };
    const I = chain("Index"), M = chain("Middle"), T = I[1].clone().add(I[2]).add(M[1]).add(M[2]).multiplyScalar(0.25).addScaledVector(n0, 0.017);
    const t1 = BP("Thumb1" + s), qa = new THREE.Quaternion().setFromUnitVectors(BP("Thumb2" + s).sub(t1).normalize(), T.sub(t1).normalize()), qb = new THREE.Quaternion().slerp(qa, Math.min(1, thumb));
    for (let j = 1; j <= 4; j++) this.q["Thumb" + j + s] = hq.clone().multiply(qb);
  }
  /** character-space point -> world */
  world(p: THREE.Vector3) { this.root.updateMatrixWorld(); return p.clone().applyMatrix4(this.root.matrixWorld); }
  local(p: THREE.Vector3) { this.root.updateMatrixWorld(); return this.root.worldToLocal(p.clone()); }
}
export { V as vec, BP as bindPos };
