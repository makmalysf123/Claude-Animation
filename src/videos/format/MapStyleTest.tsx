// Map style test: satellite base (NASA Blue Marble, public domain) + glowing region highlights + glowing dashed line.
// Recipe: docs/style-references/map-style-recipe.md. Camera rule: hold, one smooth fly, hold (no constant panning).
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Easing, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { P, Pick, WALLACE, fillFor, ringsFor } from "./geo";

const W = 1080, H = 1920;
export const MAP_STYLE_FRAMES = 480;
const FONT = "'Avenir Next', 'Helvetica Neue', Arial, sans-serif";
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => Easing.inOut(Easing.cubic)(clamp01(x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const C = { kal: "#6dff9f", sul: "#ffb347", bali: "#38e8d0", lombok: "#ff9f43", line: "#ff4f7a" };

// ---------- textures ----------
type Tex = { indo: THREE.Texture; detail: THREE.Texture };
let texP: Promise<Tex> | null = null;
const loadTex = () => (texP ??= Promise.all(["maps/indonesia_bmng_60.jpg", "maps/bali_lombok_bmng_240.jpg"].map((u) => new THREE.TextureLoader().loadAsync(staticFile(u))))
  .then(([indo, detail]) => { for (const t of [indo, detail]) { t.anisotropy = 8; t.generateMipmaps = true; } return { indo, detail }; }));
const useTex = () => {
  const [t, setT] = useState<Tex | null>(null);
  const [h] = useState(() => delayRender("map textures", { timeoutInMilliseconds: 120000 }));
  useEffect(() => { loadTex().then((x) => { setT(x); continueRender(h); }); }, [h]);
  return t;
};

// Our own grade: ocean by brightness from near-black to deep teal, land a touch desaturated and lifted.
export const gradeMat = (map: THREE.Texture) => new THREE.ShaderMaterial({
  uniforms: { map: { value: map }, opacity: { value: 1 } }, transparent: true, depthWrite: false,
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `uniform sampler2D map; uniform float opacity; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(map, vUv).rgb;
      float ocean = smoothstep(0.04, 0.14, c.b - max(c.r, c.g));
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      // brighter, GeoGlobeTales-like: deep sea mid navy-teal, shelves light cyan, land bright and natural
      vec3 sea = mix(vec3(0.07, 0.19, 0.30), vec3(0.26, 0.58, 0.68), smoothstep(0.04, 0.36, l));
      vec3 land = pow(clamp(mix(vec3(l), c, 0.95) * 1.4, 0.0, 1.0), vec3(0.88));
      gl_FragColor = vec4(mix(land, sea, ocean), opacity);
    }`,
});

// ---------- camera: hold A -> one fly -> hold B ----------
type Pose = { pos: THREE.Vector3; target: THREE.Vector3; fov: number };
const A = { t: [116.9, -1.4] as const, h0: 37, h1: 34 };
const Bq = { t: [115.86, -8.62] as const, h0: 7.8, h1: 7.0 };
const pose = (f: number): Pose => {
  let lon: number, lat: number, h: number;
  if (f < 150) { lon = A.t[0]; lat = A.t[1]; h = lerp(A.h0, A.h1, ease(f / 150)); }
  else if (f < 230) { const t = ease((f - 150) / 80); lon = lerp(A.t[0], Bq.t[0], t); lat = lerp(A.t[1], Bq.t[1], t); h = lerp(A.h1, Bq.h0, t) + Math.sin(t * Math.PI) * 3; }
  else { lon = Bq.t[0]; lat = Bq.t[1]; h = lerp(Bq.h0, Bq.h1, ease((f - 230) / 250)); }
  const tgt = P(lon, lat); tgt.z += h * 0.08; // nudge so the subject sits slightly above centre
  return { pos: tgt.clone().add(new THREE.Vector3(0, h, h * 0.28)), target: tgt, fov: 40 };
};
const SetCam: React.FC<{ p: Pose }> = ({ p }) => {
  const c = useThree().camera as THREE.PerspectiveCamera;
  c.position.copy(p.pos); c.lookAt(p.target); c.fov = p.fov; c.near = 0.5; c.far = 500; c.updateProjectionMatrix();
  return null;
};
const project = (v: THREE.Vector3, p: Pose) => {
  const cam = new THREE.PerspectiveCamera(p.fov, W / H, 0.5, 500);
  cam.position.copy(p.pos); cam.lookAt(p.target); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const q = v.clone().project(cam);
  return { x: ((q.x + 1) / 2) * W, y: ((1 - q.y) / 2) * H, ok: q.z < 1 };
};

// ---------- glowing outlines ----------
const segs = (rings: THREE.Vector3[][]) => { const a: number[] = []; for (const r of rings) for (let i = 0; i < r.length - 1; i++) a.push(r[i].x, r[i].y, r[i].z, r[i + 1].x, r[i + 1].y, r[i + 1].z); return a; };
export const fatLine = (pos: number[], color: string, width: number, opacity: number, dashed = false) => {
  const g = new LineSegmentsGeometry(); g.setPositions(pos);
  const m = new LineMaterial({ color: new THREE.Color(color).getHex(), linewidth: width, transparent: true, opacity, depthTest: false, dashed, dashSize: 0.18, gapSize: 0.12 });
  m.resolution.set(W, H);
  const l = new LineSegments2(g, m); if (dashed) l.computeLineDistances(); l.renderOrder = 5; return l;
};
type Hi = { fill: THREE.Mesh; glow: LineSegments2; core: LineSegments2; n: number; keys: number[] };
// Reveal: 1) the thin white border is traced (the "container"), 2) colour pours in from the island's most inland
// point and flows outward like spilled liquid: an irregular, wobbling front (noise), reaching bays and peninsulas last.
const liquidMat = (color: string, center: THREE.Vector2, maxR: number) => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: { color: { value: new THREE.Color(color) }, opacity: { value: 0 }, center: { value: center }, maxR: { value: maxR }, progress: { value: 0 }, time: { value: 0 }, soft: { value: 0.012 } },
  vertexShader: "varying vec2 vXZ; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vXZ = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }",
  fragmentShader: `uniform vec3 color; uniform float opacity, maxR, progress, time, soft; uniform vec2 center; varying vec2 vXZ;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
    void main(){
      vec2 q = (vXZ - center) / maxR;                                    // 0 at the drop point, ~1 at the farthest coast
      // GeoGlobeTales reveal (studied frame by frame, "France vs England"): one ink blot drops in the middle and swells
      // outward with a lumpy, shape-shifting edge until the border clips it. No holes, no tendrils, crisp edge.
      float ang = atan(q.y, q.x);
      float lump = fbm(vec2(cos(ang), sin(ang)) * 2.3 + vec2(time * 1.4, -time * 1.1)) - 0.5; // lumpy rim that changes shape
      float dn = length(q) * (1.0 + lump * 0.75);
      float front = progress * 1.35;                                      // just enough to cover the lumpiest coast at 1.0
      float inside = 1.0 - smoothstep(front - soft, front, dn);
      gl_FragColor = vec4(color, opacity * inside);
    }`,
});
// Most inland point of the largest ring: the inside grid point farthest from any coastline.
export const pourPoint = (rings: THREE.Vector3[][]) => {
  const main = rings.reduce((a, b) => (b.length > a.length ? b : a));
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const v of main) { x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); z0 = Math.min(z0, v.z); z1 = Math.max(z1, v.z); }
  const step = Math.max(1, Math.floor(main.length / 400));
  const pts = main.filter((_, i) => i % step === 0);
  const inside = (x: number, z: number) => { let c = false; for (let i = 0, j = main.length - 1; i < main.length; j = i++) { const a = main[i], b = main[j]; if ((a.z > z) !== (b.z > z) && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) c = !c; } return c; };
  let best = new THREE.Vector2((x0 + x1) / 2, (z0 + z1) / 2), bestD = -1;
  for (let i = 1; i < 40; i++) for (let j = 1; j < 40; j++) {
    const x = x0 + ((x1 - x0) * i) / 40, z = z0 + ((z1 - z0) * j) / 40;
    if (!inside(x, z)) continue;
    let d = 1e9; for (const v of pts) d = Math.min(d, Math.hypot(v.x - x, v.z - z));
    if (d > bestD) { bestD = d; best = new THREE.Vector2(x, z); }
  }
  return best;
};
// Segments ordered by how far along their own ring they are, so a growing instanceCount traces every ring at once.
const tracedSegs = (rings: THREE.Vector3[][]) => {
  const list: { t: number; v: number[] }[] = [];
  for (const r of rings) for (let i = 0; i < r.length - 1; i++) list.push({ t: i / Math.max(1, r.length - 2), v: [r[i].x, r[i].y, r[i].z, r[i + 1].x, r[i + 1].y, r[i + 1].z] });
  list.sort((a, b) => a.t - b.t);
  return list.flatMap((x) => x.v);
};
const makeHi = (pick: Pick, color: string): Hi => {
  const rings = ringsFor(pick, 0.02);
  const c = pourPoint(rings);
  let maxR = 0; for (const r of rings) for (const v of r) maxR = Math.max(maxR, Math.hypot(v.x - c.x, v.z - c.y));
  const fill = new THREE.Mesh(fillFor(pick), liquidMat(color, c, maxR));
  fill.position.y = 0.01; fill.renderOrder = 4;
  // coast segments ordered by distance from the ink drop, so the border lights up exactly where the ink arrives
  const list: { k: number; v: number[] }[] = [];
  for (const r of rings) for (let i = 0; i < r.length - 1; i++) {
    const mx = (r[i].x + r[i + 1].x) / 2, mz = (r[i].z + r[i + 1].z) / 2;
    list.push({ k: Math.hypot(mx - c.x, mz - c.y) / maxR, v: [r[i].x, r[i].y, r[i].z, r[i + 1].x, r[i + 1].y, r[i + 1].z] });
  }
  list.sort((a, b) => a.k - b.k);
  const s = list.flatMap((x) => x.v);
  return { fill, glow: fatLine(s, "#ffffff", 5, 0), core: fatLine(s, "#ffffff", 1.6, 0), n: list.length, keys: list.map((x) => x.k) };
};
// trace: 0..1 border drawn; fill: 0..1 liquid poured; time: seconds (keeps the ripples moving); alpha: overall fade
const setHi = (h: Hi, trace: number, fill: number, alpha = 1, time = 0) => {
  const u = (h.fill.material as THREE.ShaderMaterial).uniforms;
  u.progress.value = fill; u.time.value = time; u.opacity.value = 0.3 * alpha * (fill > 0 ? 1 : 0);
  // border lights up where the ink has reached the coast: same front as the shader (progress * 1.6, in maxR units)
  void trace;
  const front = fill * 1.35 / 1.08; // a touch later than the average front, so the line never runs ahead of the ink
  let lo = 0, hi = h.keys.length; while (lo < hi) { const m = (lo + hi) >> 1; if (h.keys[m] <= front) lo = m + 1; else hi = m; }
  for (const l of [h.glow, h.core]) (l.geometry as LineSegmentsGeometry).instanceCount = lo;
  (h.glow.material as LineMaterial).opacity = 0.12 * alpha * (fill > 0 ? 1 : 0);
  (h.core.material as LineMaterial).opacity = 0.95 * alpha * (fill > 0 ? 1 : 0);
};
// Speed follows the region's real size: drop point -> farthest coast (degrees). A city fills in ~0.35 s, Bali ~0.53 s,
// Kalimantan ~1.0 s, a continent-sized country tops out at 1.5 s. sqrt keeps big regions from becoming sluggish.
const sizeCache = new Map<Pick, number>();
const regionSize = (pick: Pick) => {
  let r = sizeCache.get(pick);
  if (r === undefined) {
    const rings = ringsFor(pick, 0); const c = pourPoint(rings);
    r = 0; for (const ring of rings) for (const v of ring) r = Math.max(r, Math.hypot(v.x - c.x, v.z - c.y));
    sizeCache.set(pick, r);
  }
  return r;
};
export const revealFrames = (pick: Pick) => Math.round(Math.min(45, Math.max(10, 9 + 7.5 * Math.sqrt(regionSize(pick)))));
// timing for one region starting at frame `at`: blot swells over `dur` frames, border fades in near the end, then the label is typed
const reveal = (f: number, at: number, dur: number) => {
  const fill = Easing.out(Easing.sin)(clamp01((f - at) / dur)); // gentle: the swelling is spread over the whole duration
  return { fill, trace: Easing.out(Easing.quad)(clamp01((f - at - dur * 0.6) / 4)), type: clamp01((f - at - dur) / 10) };
};

const Scene: React.FC<{ tex: Tex }> = ({ tex }) => {
  const f = useCurrentFrame();
  const p = pose(f);
  const base = useMemo(() => {
    const indo = new THREE.Mesh(new THREE.PlaneGeometry(54, 44), gradeMat(tex.indo)); indo.rotation.x = -Math.PI / 2; indo.position.set(2, 0, -1); // lon 92..146, lat 20..-24
    const det = new THREE.Mesh(new THREE.PlaneGeometry(9, 6), gradeMat(tex.detail)); det.rotation.x = -Math.PI / 2; det.position.set(-0.5, 0.002, 5); det.renderOrder = 1;
    return { indo, det };
  }, [tex]);
  const hi = useMemo(() => ({ kal: makeHi("Kalimantan", C.kal), sul: makeHi("Sulawesi", C.sul), bali: makeHi("Bali", C.bali), lombok: makeHi("Lombok", C.lombok) }), []);
  const wall = useMemo(() => {
    const pts = new THREE.CatmullRomCurve3(WALLACE.map(([lo, la]) => P(lo, la, 0.03)), false, "catmullrom", 0.2).getPoints(300);
    const a: number[] = []; for (let i = 0; i < pts.length - 1; i++) a.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
    return { glow: fatLine(a, C.line, 16, 0), core: fatLine(a, "#ffe8ee", 3.2, 0, true), n: pts.length - 1 };
  }, []);
  // detail texture takes over when close
  (base.det.material as THREE.ShaderMaterial).uniforms.opacity.value = clamp01((14 - p.pos.y) / 4);
  // highlight timing
  const out = 1 - ease((f - 150) / 14);
  const go = (h: Hi, pick: Pick, at: number, alpha = 1) => { const r = reveal(f, at, revealFrames(pick)); setHi(h, r.trace, r.fill, alpha, f / 30); };
  go(hi.kal, "Kalimantan", 16, out); go(hi.sul, "Sulawesi", 64, out); go(hi.bali, "Bali", 245); go(hi.lombok, "Lombok", 268);
  // the line draws itself (show the first k segments)
  const k = Math.floor(ease((f - 300) / 70) * wall.n);
  for (const l of [wall.glow, wall.core]) { (l.geometry as LineSegmentsGeometry).instanceCount = k; (l.material as LineMaterial).opacity = f < 300 ? 0 : l === wall.glow ? 0.5 : 1; }
  return (
    <>
      <SetCam p={p} />
      {/* deep-sea backdrop so the edge of the satellite image never shows as black */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}><planeGeometry args={[400, 400]} /><meshBasicMaterial color="#12304c" /></mesh>
      <primitive object={base.indo} />
      <primitive object={base.det} />
      {Object.values(hi).map((h, i) => <group key={i}><primitive object={h.fill} /><primitive object={h.glow} /><primitive object={h.core} /></group>)}
      <primitive object={wall.glow} />
      <primitive object={wall.core} />
    </>
  );
};

// ---------- overlay: labels on the map, keyword caption, vignette, credit ----------
const Big: React.FC<{ at: { x: number; y: number; ok: boolean }; text: string; show: number; size?: number; color?: string; typed?: number }> = ({ at, text, show, size = 96, color = "#fff", typed }) =>
  !at.ok ? null : (
    <div style={{ position: "absolute", left: at.x, top: at.y, transform: `translate(-50%, -50%) scale(${0.85 + 0.15 * show})`, opacity: show,
      fontFamily: FONT, fontWeight: 800, fontSize: size, letterSpacing: 2, color, whiteSpace: "nowrap",
      textShadow: "0 6px 28px rgba(0,0,0,0.75), 0 2px 6px rgba(0,0,0,0.6)" }}>{typed === undefined ? text : <>{text.slice(0, Math.ceil(typed * text.length))}<span style={{ visibility: "hidden" }}>{text.slice(Math.ceil(typed * text.length))}</span></>}</div>
  );
const CAPTIONS: [number, number, string][] = [[16, 64, "pulau terbesar ketiga di dunia"], [64, 140, "bentuknya seperti huruf K"], [240, 300, "dua pulau bertetangga"], [310, 470, "dipisah garis tak terlihat"]];
const Overlay: React.FC = () => {
  const f = useCurrentFrame();
  const p = pose(f);
  const at = (lon: number, lat: number) => project(P(lon, lat, 0.05), p);
  const fadeA = 1 - ease((f - 140) / 12);
  const cap = [...CAPTIONS].reverse().find(([a, b]) => f >= a && f < b);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 65% at 50% 46%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.3) 100%)" }} />
      <Big at={at(114.5, 0.4)} text="KALIMANTAN" show={fadeA} typed={reveal(f, 16, revealFrames("Kalimantan")).type} size={78} />
      <Big at={at(121.0, -2.4)} text="SULAWESI" show={fadeA} typed={reveal(f, 64, revealFrames("Sulawesi")).type} size={64} />
      <Big at={at(115.15, -7.95)} text="BALI" show={1} typed={reveal(f, 245, revealFrames("Bali")).type} />
      <Big at={at(116.32, -9.2)} text="LOMBOK" show={1} typed={reveal(f, 268, revealFrames("Lombok")).type} />
      <Big at={at(115.2, -9.75)} text="Garis Wallace" show={ease((f - 345) / 14)} size={56} color="#ffd0dc" />
      {cap ? <div key={cap[2]} style={{ position: "absolute", left: 60, right: 60, top: 1440, textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: 60, color: "#fff",
        opacity: ease((f - cap[0]) / 10) * (1 - ease((f - cap[1] + 10) / 10)), textShadow: "0 4px 22px rgba(0,0,0,0.85)" }}>{cap[2]}</div> : null}
      <div style={{ position: "absolute", left: 60, top: 96, fontFamily: FONT, fontWeight: 800, fontSize: 24, letterSpacing: 3, color: "#0b1322", background: "#ffd23f", borderRadius: 8, padding: "6px 12px" }}>TES GAYA PETA</div>
      <div style={{ position: "absolute", left: 60, bottom: 120, fontFamily: FONT, fontSize: 24, color: "rgba(255,255,255,0.7)" }}>Peta: NASA Blue Marble · Natural Earth · garis perkiraan</div>
    </AbsoluteFill>
  );
};

export const MapStyleTest: React.FC = () => {
  const tex = useTex();
  return (
    <AbsoluteFill style={{ background: "#03080d" }}>
      {tex ? (
        <ThreeCanvas flat width={W} height={H} camera={{ fov: 40, near: 0.5, far: 500 }} style={{ background: "#03080d" }}>
          <Scene tex={tex} />
        </ThreeCanvas>
      ) : null}
      <Overlay />
    </AbsoluteFill>
  );
};

// ---------- whole-map preview (landscape 16:9): base grade only, or every island group highlighted ----------
const PW = 1920, PH = 1080;
const PREVIEW_COL: Record<string, string> = { Sumatra: "#ffb347", Jawa: "#ff6b8a", Kalimantan: "#6dff9f", Sulawesi: "#ffd23f", "Bali & NT": "#c38bff", Maluku: "#5ec8ff", Papua: "#38e8d0" };
const previewPose: Pose = (() => { const tgt = P(118.8, -2.2); return { pos: tgt.clone().add(new THREE.Vector3(0, 37.5, 4)), target: tgt, fov: 40 }; })();
const PreviewScene: React.FC<{ tex: Tex; highlight: boolean }> = ({ tex, highlight }) => {
  const indo = useMemo(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(54, 44), gradeMat(tex.indo)); m.rotation.x = -Math.PI / 2; m.position.set(2, 0, -1); return m; }, [tex]);
  const his = useMemo(() => (highlight ? GROUP_LIST.map((g) => { const h = makeHi(g, PREVIEW_COL[g]); for (const l of [h.glow, h.core]) (l.material as LineMaterial).resolution.set(PW, PH); setHi(h, 1, 1); return h; }) : []), [highlight]);
  const c = useThree().camera as THREE.PerspectiveCamera;
  c.position.copy(previewPose.pos); c.lookAt(previewPose.target); c.fov = previewPose.fov; c.near = 0.5; c.far = 500; c.updateProjectionMatrix();
  return (<><primitive object={indo} />{his.map((h, i) => <group key={i}><primitive object={h.fill} /><primitive object={h.glow} /><primitive object={h.core} /></group>)}</>);
};
const GROUP_LIST = ["Sumatra", "Jawa", "Kalimantan", "Sulawesi", "Bali & NT", "Maluku", "Papua"] as const;
const LABEL_AT: Record<string, [number, number]> = { Sumatra: [101.2, -0.6], Jawa: [110.0, -7.4], Kalimantan: [114.0, 0.6], Sulawesi: [121.4, -2.6], "Bali & NT": [119.5, -9.4], Maluku: [128.6, -3.0], Papua: [137.5, -4.6] };
export const MapPreview: React.FC<{ highlight: boolean }> = ({ highlight }) => {
  const tex = useTex();
  const at = (lon: number, lat: number) => {
    const cam = new THREE.PerspectiveCamera(previewPose.fov, PW / PH, 0.5, 500);
    cam.position.copy(previewPose.pos); cam.lookAt(previewPose.target); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    const q = P(lon, lat, 0.05).project(cam); return { x: ((q.x + 1) / 2) * PW, y: ((1 - q.y) / 2) * PH };
  };
  return (
    <AbsoluteFill style={{ background: "#03080d" }}>
      {tex ? <ThreeCanvas flat width={PW} height={PH} camera={{ fov: 40, near: 0.5, far: 500 }} style={{ background: "#03080d" }}><PreviewScene tex={tex} highlight={highlight} /></ThreeCanvas> : null}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 80% at 50% 50%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.28) 100%)" }} />
      {GROUP_LIST.map((g) => { const p = at(...LABEL_AT[g]); return (
        <div key={g} style={{ position: "absolute", left: p.x, top: p.y, transform: "translate(-50%,-50%)", fontFamily: FONT, fontWeight: 800, fontSize: g === "Kalimantan" || g === "Sumatra" || g === "Papua" ? 44 : 32,
          letterSpacing: 2, color: "#fff", whiteSpace: "nowrap", textShadow: "0 4px 20px rgba(0,0,0,0.8), 0 2px 5px rgba(0,0,0,0.6)" }}>{g.toUpperCase()}</div>); })}
      <div style={{ position: "absolute", left: 40, top: 34, fontFamily: FONT, fontWeight: 800, fontSize: 22, letterSpacing: 3, color: "#0b1322", background: "#ffd23f", borderRadius: 8, padding: "6px 12px" }}>{highlight ? "PRATINJAU · SEMUA PULAU DISOROT" : "PRATINJAU · PETA DASAR"}</div>
      <div style={{ position: "absolute", left: 40, bottom: 30, fontFamily: FONT, fontSize: 20, color: "rgba(255,255,255,0.7)" }}>Peta: NASA Blue Marble · Natural Earth</div>
    </AbsoluteFill>
  );
};


