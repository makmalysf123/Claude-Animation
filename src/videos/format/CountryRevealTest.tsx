// Country reveal test: a continental country (China) and an archipelago (Indonesia), real political borders.
// Each island/part gets its own ink drop (reference: GeoGlobeTales "France vs England"): a small lumpy blot swells from the
// part's most inland point. In an archipelago the drops start one after another, rippling out from the largest island.
// Each part's speed follows its size; the thin white border lights up where the ink reaches the coast.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Easing, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { COUNTRY, P, countryParts } from "./geo";
import { fatLine, gradeMat, pourPoint } from "./MapStyleTest";

const W = 1080, H = 1920;
export const COUNTRY_TEST_FRAMES = 380;
const FONT = "'Avenir Next', 'Helvetica Neue', Arial, sans-serif";
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => Easing.inOut(Easing.cubic)(clamp01(x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------- texture (NASA Blue Marble crop: lon 55..165, lat 88..-48, 40 px/deg) ----------
let texP: Promise<THREE.Texture> | null = null;
const useTex = () => {
  const [t, setT] = useState<THREE.Texture | null>(null);
  const [h] = useState(() => delayRender("asia texture", { timeoutInMilliseconds: 120000 }));
  useEffect(() => { (texP ??= new THREE.TextureLoader().loadAsync(staticFile("maps/asia_bmng_40.jpg")).then((x) => { x.anisotropy = 8; return x; })).then((x) => { setT(x); continueRender(h); }); }, [h]);
  return t;
};

// ---------- per-part ink ----------
const partFrames = (maxR: number) => Math.round(Math.min(45, Math.max(10, 9 + 7.5 * Math.sqrt(maxR))));
type Country = { fill: THREE.Mesh; glow: LineSegments2; core: LineSegments2; keys: number[]; end: number; anchor: THREE.Vector2 };
const NOISE = `
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
  float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }`;
const inkMat = (color: string) => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: { color: { value: new THREE.Color(color) }, opacity: { value: 0.3 }, uF: { value: -1 }, time: { value: 0 } },
  vertexShader: `attribute vec2 aC; attribute float aR, aDelay, aDur; uniform float uF;
    varying vec2 vXZ, vC; varying float vR, vP;
    void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vXZ = w.xz; vC = aC; vR = aR;
      float t = clamp((uF - aDelay) / aDur, 0.0, 1.0); vP = (uF < aDelay) ? -1.0 : sin(t * 1.5707963);
      gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform vec3 color; uniform float opacity, time; varying vec2 vXZ, vC; varying float vR, vP; ${NOISE}
    void main(){
      if (vP < 0.0) discard;
      vec2 q = (vXZ - vC) / vR; float ang = atan(q.y, q.x);
      float lump = fbm(vec2(cos(ang), sin(ang)) * 2.3 + vec2(time * 1.4, -time * 1.1) + vC * 0.37) - 0.5;
      float dn = length(q) * (1.0 + lump * 0.75);
      float inside = 1.0 - smoothstep(vP * 1.35 - 0.012, vP * 1.35, dn);
      gl_FragColor = vec4(color, opacity * inside);
    }`,
});
// spread: frames over which the drops ripple out from the biggest part to the farthest one
const buildCountry = (id: string, color: string, spread: number): Country => {
  const parts = countryParts(id, 0.02).filter((p) => p[0].length > 3);
  const info = parts.map((rings) => {
    const c = pourPoint([rings[0]]);
    let maxR = 0; for (const v of rings[0]) maxR = Math.max(maxR, Math.hypot(v.x - c.x, v.z - c.y));
    return { rings, c, maxR: Math.max(maxR, 0.02), delay: 0, dur: 0 };
  });
  const main = info.reduce((a, b) => (b.maxR > a.maxR ? b : a));
  let far = 0; for (const i of info) far = Math.max(far, i.c.distanceTo(main.c));
  for (const i of info) { i.delay = far > 0 ? spread * Math.pow(i.c.distanceTo(main.c) / far, 0.8) : 0; i.dur = partFrames(i.maxR); }
  // fill geometry with per-part attributes
  const geos = info.map((i) => {
    const toV = (r: THREE.Vector3[]) => r.map((v) => new THREE.Vector2(v.x, -v.z));
    const shape = new THREE.Shape(toV(i.rings[0])); for (const h of i.rings.slice(1)) shape.holes.push(new THREE.Path(toV(h)));
    const g = new THREE.ShapeGeometry(shape); g.rotateX(-Math.PI / 2); g.deleteAttribute("uv"); g.deleteAttribute("normal");
    const n = g.getAttribute("position").count;
    g.setAttribute("aC", new THREE.BufferAttribute(new Float32Array(n * 2).map((_, k) => (k % 2 ? i.c.y : i.c.x)), 2));
    g.setAttribute("aR", new THREE.BufferAttribute(new Float32Array(n).fill(i.maxR), 1));
    g.setAttribute("aDelay", new THREE.BufferAttribute(new Float32Array(n).fill(i.delay), 1));
    g.setAttribute("aDur", new THREE.BufferAttribute(new Float32Array(n).fill(i.dur), 1));
    return g;
  });
  const fill = new THREE.Mesh(mergeGeometries(geos)!, inkMat(color)); fill.position.y = 0.01; fill.renderOrder = 4;
  // border segments keyed by the frame the ink reaches them (inverse of the sine ease)
  const list: { k: number; v: number[] }[] = [];
  for (const i of info) for (const r of i.rings) for (let s = 0; s < r.length - 1; s++) {
    const d = Math.hypot((r[s].x + r[s + 1].x) / 2 - i.c.x, (r[s].z + r[s + 1].z) / 2 - i.c.y) / i.maxR;
    list.push({ k: i.delay + i.dur * (2 / Math.PI) * Math.asin(clamp01((d * 1.08) / 1.35)), v: [r[s].x, r[s].y, r[s].z, r[s + 1].x, r[s + 1].y, r[s + 1].z] });
  }
  list.sort((a, b) => a.k - b.k);
  const pos = list.flatMap((x) => x.v);
  const end = Math.max(...info.map((i) => i.delay + i.dur));
  return { fill, glow: fatLine(pos, "#ffffff", 5, 0.12), core: fatLine(pos, "#ffffff", 1.4, 0.95), keys: list.map((x) => x.k), end, anchor: main.c };
};
const setCountry = (c: Country, uF: number, time: number) => {
  const u = (c.fill.material as THREE.ShaderMaterial).uniforms; u.uF.value = uF; u.time.value = time;
  let lo = 0, hi = c.keys.length; while (lo < hi) { const m = (lo + hi) >> 1; if (c.keys[m] <= uF) lo = m + 1; else hi = m; }
  for (const l of [c.glow, c.core]) (l.geometry as LineSegmentsGeometry).instanceCount = lo;
  void LineMaterial;
};

// ---------- camera: China (hold) -> one fly -> Indonesia (hold) ----------
type Pose = { pos: THREE.Vector3; target: THREE.Vector3; fov: number };
const CN = { t: [104.5, 34.0] as const, h0: 158, h1: 150 }, ID = { t: [119.6, -5.5] as const, h0: 132, h1: 126 };
const START = { china: 14, indo: 196 };
const pose = (f: number): Pose => {
  let lon: number, lat: number, h: number;
  if (f < 120) { lon = CN.t[0]; lat = CN.t[1]; h = lerp(CN.h0, CN.h1, ease(f / 120)); }
  else if (f < 180) { const t = ease((f - 120) / 60); lon = lerp(CN.t[0], ID.t[0], t); lat = lerp(CN.t[1], ID.t[1], t); h = lerp(CN.h1, ID.h0, t) + Math.sin(t * Math.PI) * 10; }
  else { lon = ID.t[0]; lat = ID.t[1]; h = lerp(ID.h0, ID.h1, ease((f - 180) / 200)); }
  const tgt = P(lon, lat);
  return { pos: tgt.clone().add(new THREE.Vector3(0, h, h * 0.03)), target: tgt, fov: 40 }; // near top-down: no horizon feel
};
const project = (v: THREE.Vector3, p: Pose) => {
  const cam = new THREE.PerspectiveCamera(p.fov, W / H, 1, 2000); cam.position.copy(p.pos); cam.lookAt(p.target); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const q = v.clone().project(cam); return { x: ((q.x + 1) / 2) * W, y: ((1 - q.y) / 2) * H };
};

const Scene: React.FC<{ tex: THREE.Texture }> = ({ tex }) => {
  const f = useCurrentFrame();
  const p = pose(f);
  const cam = useThree().camera as THREE.PerspectiveCamera;
  cam.position.copy(p.pos); cam.lookAt(p.target); cam.fov = p.fov; cam.near = 1; cam.far = 2000; cam.updateProjectionMatrix();
  const base = useMemo(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(110, 136), gradeMat(tex)); m.rotation.x = -Math.PI / 2; m.position.set(-7, 0, -23); return m; }, [tex]);
  const cn = useMemo(() => buildCountry(COUNTRY.China, "#ffb347", 10), []);
  const id = useMemo(() => buildCountry(COUNTRY.Indonesia, "#ff5c7a", 40), []);
  setCountry(cn, f - START.china, f / 30);
  setCountry(id, f - START.indo, f / 30);
  const fade = 1 - ease((f - 150) / 20); // China fades while flying away
  (cn.fill.material as THREE.ShaderMaterial).uniforms.opacity.value = 0.3 * fade;
  (cn.core.material as LineMaterial).opacity = 0.95 * fade; (cn.glow.material as LineMaterial).opacity = 0.12 * fade;
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}><planeGeometry args={[2000, 2000]} /><meshBasicMaterial color="#12304c" /></mesh>
      <primitive object={base} />
      {[cn, id].map((c, i) => <group key={i}><primitive object={c.fill} /><primitive object={c.glow} /><primitive object={c.core} /></group>)}
    </>
  );
};

const Label: React.FC<{ x: number; y: number; text: string; typed: number; size: number; show: number }> = ({ x, y, text, typed, size, show }) => (
  <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", opacity: show, fontFamily: FONT, fontWeight: 800, fontSize: size, letterSpacing: 3, color: "#fff", whiteSpace: "nowrap",
    textShadow: "0 6px 28px rgba(0,0,0,0.75), 0 2px 6px rgba(0,0,0,0.6)" }}>
    {text.slice(0, Math.ceil(typed * text.length))}<span style={{ visibility: "hidden" }}>{text.slice(Math.ceil(typed * text.length))}</span>
  </div>
);
const Overlay: React.FC<{ ends: { china: number; indo: number } }> = ({ ends }) => {
  const f = useCurrentFrame();
  const p = pose(f);
  const cnAt = project(P(103.5, 35.5, 0.1), p), idAt = project(P(119.0, -14.5, 0.1), p);
  const fade = 1 - ease((f - 150) / 20);
  const polar = 1 - ease((f - 120) / 60) * 0.7; // strongest over China (far north in view), lighter over Indonesia
  const cap = f < 170 ? "Negara daratan: satu tetes tinta besar" : "Negara kepulauan: tiap pulau punya tetesnya sendiri";
  const capA = f < 170 ? clamp01((f - 10) / 10) * fade : clamp01((f - 190) / 10);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 65% at 50% 46%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.3) 100%)" }} />
      {/* high-latitude fade: a flat map stretches the polar regions, so let them dissolve into the night instead */}
      <AbsoluteFill style={{ background: `linear-gradient(rgba(6,16,30,${(0.97 * polar).toFixed(3)}) 0%, rgba(6,16,30,${(0.85 * polar).toFixed(3)}) 9%, rgba(6,16,30,0) 26%)` }} />
      <Label {...cnAt} text="CHINA" typed={clamp01((f - START.china - ends.china) / 10)} size={96} show={fade} />
      <Label {...idAt} text="INDONESIA" typed={clamp01((f - START.indo - ends.indo) / 12)} size={84} show={1} />
      <div style={{ position: "absolute", left: 60, right: 60, top: 1440, textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 48, color: "#fff", opacity: capA, textShadow: "0 4px 22px rgba(0,0,0,0.85)" }}>{cap}</div>
      <div style={{ position: "absolute", left: 60, top: 96, fontFamily: FONT, fontWeight: 800, fontSize: 24, letterSpacing: 3, color: "#0b1322", background: "#ffd23f", borderRadius: 8, padding: "6px 12px" }}>TES NEGARA</div>
      <div style={{ position: "absolute", left: 60, bottom: 120, fontFamily: FONT, fontSize: 24, color: "rgba(255,255,255,0.7)" }}>Peta: NASA Blue Marble · Natural Earth (batas negara)</div>
    </AbsoluteFill>
  );
};

export const CountryRevealTest: React.FC = () => {
  const tex = useTex();
  const ends = useMemo(() => ({ china: buildCountry(COUNTRY.China, "#000", 10).end, indo: buildCountry(COUNTRY.Indonesia, "#000", 40).end }), []);
  return (
    <AbsoluteFill style={{ background: "#03080d" }}>
      {tex ? <ThreeCanvas flat width={W} height={H} camera={{ fov: 40, near: 1, far: 2000 }} style={{ background: "#03080d" }}><Scene tex={tex} /></ThreeCanvas> : null}
      <Overlay ends={ends} />
    </AbsoluteFill>
  );
};
