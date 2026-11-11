// "Satu Ayam yang Sama": Indonesian retelling of a rich-vs-poor parable (inspired by a reference Short; our own
// story beats, setting, characters and look). 60 s, 1080x1920, no speech bubbles: the user adds subtitles.
//   0-300     map: Indonesia inks in, then every dot becomes one share of people: poor+vulnerable / middle / rich
//             (BPS 2024 via news reports), then a dive toward Java through clouds
//   300-1800  toon village (bridge post chain, MIT Mr omi; our own cast from toonCast.ts):
//             handout -> Budi fries his hen -> Sari keeps hers for eggs -> Joko hatches them (growth graph with
//             Budi + Sari reacting in the same shot) -> timeline: Joko's farm grows -> Budi protests -> Budi works for Joko
import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { AbsoluteFill, Easing, Sequence, useCurrentFrame } from "remotion";
import { InkPass, NOINK, noInkFallback } from "../bridge/ink";
import { LensBlur } from "../bridge/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH } from "../bridge/grade";
import { Act, Look, blinkAt, drawChick, drawHenShape, drawPerson, talkAt } from "./toonCast";
import { buildKampung, Kampung } from "./kampungSet";
import { COUNTRY, P } from "./geo";
import { gradeMat } from "./MapStyleTest";
import { buildCountry, setCountry, useTex } from "./CountryRevealTest";

const W = 1080, H = 1920;
export const AYAM_FRAMES = 1800;
const FONT = "'Avenir Next', 'Helvetica Neue', Arial, sans-serif";
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => Easing.inOut(Easing.cubic)(clamp01(x));
const easeOut = (x: number) => Easing.out(Easing.cubic)(clamp01(x));
const pop = (x: number) => Easing.out(Easing.back(2.2))(clamp01(x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ================================================================ data (BPS 2024, via news reports)
const CLASS = [
  { key: "miskin", label: "Miskin & rentan miskin", pct: 33.3, color: "#ff4d5e", note: "miskin 9,0% + rentan 24,2%" },
  { key: "menengah", label: "Kelas menengah", pct: 66.3, color: "#ffd23f", note: "menengah 17,1% + menuju menengah 49,2%" },
  { key: "kaya", label: "Kelas atas (kaya)", pct: 0.4, color: "#2ee6a6", note: "sekitar 1 juta orang" },
];
const MAP = { inkStart: 12, split: [[112, 150], [150, 192], [196, 226]] as [number, number][], dive: [232, 300] as [number, number] };
const CLOUDS = [236, 352] as const;

// ================================================================ part 1: map
type MPose = { pos: THREE.Vector3; target: THREE.Vector3 };
const mapPose = (f: number): MPose => {
  const ID = [119.6, -5.5], JAVA = [110.4, -7.25];
  let lon = ID[0], lat = ID[1], h = lerp(132, 124, ease(f / MAP.dive[0]));
  if (f > MAP.dive[0]) { const t = clamp01((f - MAP.dive[0]) / (MAP.dive[1] - MAP.dive[0])); const e = Easing.in(Easing.quad)(t); lon = lerp(ID[0], JAVA[0], easeOut(t * 1.4)); lat = lerp(ID[1], JAVA[1], easeOut(t * 1.4)); h = 124 * Math.pow(3 / 124, e); }
  const tgt = P(lon, lat); return { pos: tgt.clone().add(new THREE.Vector3(0, h, h * 0.03)), target: tgt };
};
const MapScene: React.FC<{ tex: THREE.Texture }> = ({ tex }) => {
  const f = useCurrentFrame();
  const cam = useThree().camera as THREE.PerspectiveCamera;
  const p = mapPose(f);
  cam.position.copy(p.pos); cam.lookAt(p.target); cam.fov = 40; cam.near = 0.5; cam.far = 2000; cam.updateProjectionMatrix();
  const base = useMemo(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(110, 136), gradeMat(tex)); m.rotation.x = -Math.PI / 2; m.position.set(-7, 0, -23); return m; }, [tex]);
  const id = useMemo(() => buildCountry(COUNTRY.Indonesia, "#fff1c9", 40), []);
  setCountry(id, f - MAP.inkStart, f / 30);
  const u = (id.fill.material as THREE.ShaderMaterial).uniforms;
  const s = MAP.split.map(([a, b]) => clamp01((f - a) / (b - a)));
  u.uSplit.value.set(s[2], s[1], s[0]); // x = kaya, y = menengah, z = miskin
  u.opacity.value = 0.42;
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}><planeGeometry args={[2000, 2000]} /><meshBasicMaterial color="#12304c" /></mesh>
      <primitive object={base} />
      <primitive object={id.fill} /><primitive object={id.glow} /><primitive object={id.core} />
    </>
  );
};
const MapOverlay: React.FC = () => {
  const f = useCurrentFrame();
  const out = 1 - clamp01((f - MAP.dive[0]) / 18);
  const title = clamp01((f - 70) / 14) * out;
  const total = 279;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", fontFamily: FONT }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 65% at 50% 46%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.35) 100%)" }} />
      <div style={{ position: "absolute", top: 210, left: 0, right: 0, textAlign: "center", opacity: title, transform: `translateY(${(1 - title) * 20}px)` }}>
        <div style={{ fontSize: 96, fontWeight: 900, letterSpacing: 6, color: "#fff", textShadow: "0 6px 28px rgba(0,0,0,0.7)" }}>INDONESIA</div>
        <div style={{ fontSize: 44, fontWeight: 700, color: "#ffe9a8", marginTop: 6, textShadow: "0 4px 18px rgba(0,0,0,0.7)" }}>± {Math.round(total * easeOut((f - 70) / 30))} juta orang</div>
      </div>
      {/* legend: one row per class, numbers count up as that class's dots light up */}
      <div style={{ position: "absolute", left: 60, right: 60, top: 1290, opacity: clamp01((f - 108) / 10) * out, background: "rgba(8,18,32,0.82)", borderRadius: 28, padding: "30px 36px", border: "2px solid rgba(255,255,255,0.12)" }}>
        {CLASS.map((c, i) => {
          const [a, b] = MAP.split[i]; const t = clamp01((f - a) / (b - a)); const on = clamp01((f - a) / 8);
          return (
            <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 22, opacity: 0.25 + 0.75 * on, marginBottom: i < 2 ? 18 : 0 }}>
              <div style={{ width: 34, height: 34, borderRadius: 17, background: c.color, boxShadow: `0 0 ${18 * on}px ${c.color}` }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 38, fontWeight: 800, color: "#fff" }}>{c.label}</div>
                <div style={{ fontSize: 24, color: "rgba(255,255,255,0.6)" }}>{c.note}</div>
              </div>
              <div style={{ fontSize: 64, fontWeight: 900, color: c.color, minWidth: 210, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{(c.pct * easeOut(t)).toFixed(1).replace(".", ",")}%</div>
            </div>
          );
        })}
        <div style={{ display: "flex", height: 26, borderRadius: 13, overflow: "hidden", marginTop: 26, background: "rgba(255,255,255,0.08)" }}>
          {CLASS.map((c, i) => { const [a, b] = MAP.split[i]; return <div key={c.key} style={{ width: `${c.pct * easeOut((f - a) / (b - a))}%`, minWidth: c.key === "kaya" && f > a ? 8 : 0, background: c.color }} />; })}
        </div>
        <div style={{ fontSize: 22, color: "rgba(255,255,255,0.5)", marginTop: 14 }}>1 titik = sebagian penduduk · Sumber: BPS 2024 (dikutip media)</div>
      </div>
    </AbsoluteFill>
  );
};
const MapPart: React.FC = () => {
  const tex = useTex();
  return (
    <AbsoluteFill style={{ background: "#03080d" }}>
      {tex ? <ThreeCanvas flat width={W} height={H} camera={{ fov: 40, near: 0.5, far: 2000 }} style={{ background: "#03080d" }}><MapScene tex={tex} /></ThreeCanvas> : null}
      <MapOverlay />
    </AbsoluteFill>
  );
};

// ================================================================ clouds: fly through them from the map into the village
const CLOUD_SET = Array.from({ length: 16 }, (_, i) => ({ a: hash(i) * Math.PI * 2, r: 0.15 + hash(i + 40) * 0.5, s: 0.7 + hash(i + 80) * 0.8, d: hash(i + 120) * 30 }));
const Cloud: React.FC<{ x: number; y: number; s: number; o: number }> = ({ x, y, s, o }) => (
  <svg viewBox="-200 -120 400 240" style={{ position: "absolute", left: x - 300 * s, top: y - 180 * s, width: 600 * s, height: 360 * s, opacity: o, overflow: "visible" }}>
    <g fill="#dfe9f3">{[[-110, 30, 70], [-40, 10, 95], [50, 20, 85], [125, 38, 60], [0, 50, 90]].map(([cx, cy, r], k) => <circle key={k} cx={cx} cy={cy + 10} r={r} />)}</g>
    <g fill="#ffffff">{[[-110, 20, 66], [-40, -5, 92], [50, 5, 82], [125, 28, 56], [0, 38, 84]].map(([cx, cy, r], k) => <circle key={k} cx={cx} cy={cy} r={r} />)}</g>
  </svg>
);
const Clouds: React.FC = () => {
  const f = useCurrentFrame();
  if (f < CLOUDS[0] || f > CLOUDS[1]) return null;
  const veil = f < 300 ? clamp01((f - 262) / 30) : 1 - clamp01((f - 300) / 34);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      {CLOUD_SET.map((c, i) => {
        const t = (f - CLOUDS[0] - c.d) / 70; if (t < 0) return null;
        const z = Math.pow(t, 1.6) * 3.2; // grows + slides outward: we fall through them
        const x = W / 2 + Math.cos(c.a) * c.r * W * (0.4 + z * 1.6), y = H / 2 + Math.sin(c.a) * c.r * H * (0.35 + z * 1.2);
        return <Cloud key={i} x={x} y={y} s={c.s * (0.3 + z * 2.2)} o={clamp01(t * 5) * (1 - clamp01((z - 2.6) / 1.2))} />;
      })}
      <AbsoluteFill style={{ background: "#f4f9ff", opacity: veil }} />
    </AbsoluteFill>
  );
};

// ================================================================ part 2: village
const BUDI: Look = { skin: "#d9a074", hair: "#24180f", hairStyle: "short", shirt: "#ff6b6b", pattern: "#ffd2c4", pants: "#2c3550" };
const SARI: Look = { skin: "#e8b48a", hair: "#2a1a10", hairStyle: "hijab", hijab: "#2fb59a", shirt: "#f4c34f", pattern: "#fff1b8", pants: "#3a3f5c" };
const JOKO: Look = { skin: "#c98e63", hair: "#1b120c", hairStyle: "short", shirt: "#3f7fd0", pattern: "#a9d0ff", pants: "#2f2a26" };
const KADES: Look = { skin: "#b97f57", hair: "#2a1d14", hairStyle: "peci", shirt: "#7a4a2e", pattern: "#e0b070", pants: "#2c2622", moustache: true };
type Who = "budi" | "sari" | "joko" | "kades";
const LOOKS: Record<Who, Look> = { budi: BUDI, sari: SARI, joko: JOKO, kades: KADES };
const WHO: Who[] = ["budi", "sari", "joko", "kades"];

type ShotId = "A" | "B" | "C1" | "C2" | "D" | "E1" | "E2" | "F" | "G" | "H";
const SHOTS: [number, number, ShotId][] = [[300, 480, "A"], [480, 570, "B"], [570, 660, "C1"], [660, 780, "C2"], [780, 960, "D"], [960, 1080, "E1"], [1080, 1200, "E2"], [1200, 1440, "F"], [1440, 1620, "G"], [1620, 1800, "H"]];
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const HANDOUT = [405, 428, 451]; // chicken lands next to budi, sari, joko

const posOf = (who: Who, f: number): THREE.Vector3 | null => {
  if (f < 570) return ({ budi: V(-0.95, 0, -5.0), sari: V(0, 0, -5.15), joko: V(0.95, 0, -5.0), kades: V(0.45, 0.3, -7.3) } as const)[who];
  if (f < 780) return who === "budi" ? V(-10.2, 0, 6.35) : null;
  if (f < 960) return who === "sari" ? V(-0.5, 0, 6.6) : null;
  if (f < 1080) return who === "joko" ? V(9.4, 0, 6.4) : null;
  if (f < 1200) return ({ budi: V(8.05, 0, 8.9), sari: V(7.3, 0, 8.65), joko: V(9.35, 0, 7.4), kades: null } as const)[who];
  if (f < 1440) return who === "joko" ? V(10.4, 0, 7.6) : null;
  if (f < 1620) return ({ budi: V(8.05, 0, 8.9), sari: V(7.2, 0, 8.6), joko: V(9.45, 0, 8.1), kades: null } as const)[who];
  if (who === "budi") return V(lerp(12.4, 10.55, easeOut((f - 1622) / 60)), 0, lerp(8.0, 8.5, easeOut((f - 1622) / 60)));
  if (who === "joko") return V(9.35, 0, 8.3);
  return null;
};
const acting = (who: Who, f: number): Act => {
  const blink = blinkAt(f, { budi: 1, sari: 7, joko: 13, kades: 19 }[who]);
  if (f < 570) { // handout at the balai desa
    if (who === "kades") { const k = HANDOUT.findIndex((h) => f > h - 22 && f < h + 4); return { expr: f > 470 ? "smile" : "talk", talk: talkAt(f, 3), blink, look: k < 0 ? 0 : [-1, -0.2, 0.6][k], armL: 10, armR: k >= 0 ? 85 : 15, holdR: k >= 0 ? "chicken" : null }; }
    const k = { budi: 0, sari: 1, joko: 2 }[who]; const got = f > HANDOUT[k];
    if (f >= 480) return { expr: f % 70 < 40 ? "smile" : "laugh", laughT: f, blink, look: who === "budi" ? 0.5 : who === "joko" ? -0.5 : 0, armL: 12, armR: 18 + (got ? 10 : 0) };
    return { expr: got ? "smile" : "neutral", blink, look: 0, armL: 10, armR: got && f < HANDOUT[k] + 20 ? 60 : 12, bob: got && f < HANDOUT[k] + 10 ? -10 * Math.sin(((f - HANDOUT[k]) / 10) * Math.PI) : 0 };
  }
  if (who === "budi") {
    if (f < 660) return { expr: f < 615 ? "smile" : "laugh", laughT: f, blink, look: 0.9, armL: 12, armR: 70 + 12 * Math.sin(f / 4), holdR: "ladle" };
    if (f < 745) return { expr: f % 50 < 30 ? "chew" : "laugh", chewT: f, laughT: f, blink: f % 50 < 30 ? 1 : 0, look: 0, armL: 12, armR: 112 + 8 * Math.sin(f / 5), holdR: "drumstick" };
    if (f < 780) return { expr: "sad", blink, look: 0.5, armL: 10, armR: 45, holdR: "bone" };
    if (f < 1200) { const s = f > 1100; return { expr: s ? "surprised" : "neutral", blink: s ? 0 : blink, look: 1, armL: s ? 60 : 10, armR: s ? 70 : 12, bob: s && f < 1112 ? -8 : 0 }; }
    if (f < 1620) { const angry = f > 1470; return { expr: angry ? (f % 40 < 24 ? "angry" : "talk") : "sad", talk: talkAt(f, 2), blink, look: 1, armL: angry ? 30 + 20 * Math.sin(f / 3) : 10, armR: 150 }; }
    return { expr: f > 1700 ? "neutral" : "sad", blink, look: -1, armL: 40, armR: 48, holdR: "tray", bob: f < 1682 ? 5 * Math.abs(Math.sin(f / 4)) : 0 };
  }
  if (who === "sari") {
    if (f < 960) return { expr: f > 880 ? "laugh" : "smile", laughT: f, blink, look: 0.8, armL: 10, armR: f > 900 ? 80 : 20, holdR: f > 900 ? "tray" : null };
    if (f < 1200) { const s = f > 1112; return { expr: s ? "surprised" : "smile", blink: s ? 0 : blink, look: 1, armL: s ? 70 : 10, armR: s ? 55 : 10 }; }
    return { expr: f > 1530 ? "talk" : "sad", talk: talkAt(f, 6) * 0.6, blink, look: 1, armL: 15, armR: 15 };
  }
  if (who === "joko") {
    if (f < 1080) return { expr: f > 1010 ? "laugh" : "smile", laughT: f, blink, look: 0.8, armL: f > 1010 ? 45 : 10, armR: f > 1010 ? 50 : 10 };
    if (f < 1440) return { expr: "smile", blink, look: -0.4, armL: 10, armR: 20 };
    if (f < 1620) return { expr: f > 1540 ? "talk" : "neutral", talk: talkAt(f, 4), blink, look: -1, armL: 12, armR: f > 1540 ? 40 : 12 };
    return { expr: f > 1700 ? "smile" : "neutral", blink, look: 1, armL: 10, armR: f > 1690 ? 58 : 15, holdR: f > 1690 ? "coin" : null };
  }
  return { expr: "neutral", blink };
};

// ---- chickens: shared pre-drawn textures (3 peck poses x 2 directions; chicks 2 hops x 2 directions) ----
type Tex = THREE.MeshBasicMaterial;
const henMats = () => {
  const mk = (fn: (g: CanvasRenderingContext2D) => void, s: number) => { const c = document.createElement("canvas"); c.width = c.height = 300; const g = c.getContext("2d")!; g.translate(150, 170); g.scale(s, s); fn(g); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.5, color: "#fff4e6" }); };
  const hen: Tex[][] = [0, 0.5, 1].map((pk) => ([-1, 1] as const).map((d) => mk((g) => drawHenShape(g, pk, d), 0.78)));
  const chick: Tex[][] = [0, 1].map((hp) => ([-1, 1] as const).map((d) => mk((g) => drawChick(g, hp, d), 1.0)));
  return { hen, chick };
};
const FLOCK = (() => {
  const out: { x: number; z: number; chick: boolean }[] = []; let i = 0;
  while (out.length < 80) { i++; const x = 10.6 + hash(i * 3.1) * 7.8, z = 5.2 + hash(i * 7.7) * 4.2; if (Math.hypot(x - 16.4, z - 6.1) < 1.2 || Math.hypot(x - 10.3, z - 7.5) < 0.5) continue; out.push({ x, z, chick: out.length % 5 === 4 }); }
  out.sort((a, b) => Math.hypot(a.x - 10.5, a.z - 7) - Math.hypot(b.x - 10.5, b.z - 7)); // grows outward from the nest
  return out;
})();
const STAGE = [[1200, 1280], [1280, 1360], [1360, 1440]] as const;
const flockShown = (f: number) => {
  if (f < 1080) return 0;
  if (f < 1200) return 5 + 35 * ease((f - 1090) / 100);
  const k = f < 1280 ? 0 : f < 1360 ? 1 : 2; const prev = [40, 14, 34][k], n = [14, 34, 76][k];
  return k === 0 ? 14 : lerp(prev, n, easeOut((f - STAGE[k][0]) / 26));
};
const coopsShown = (f: number) => (f < 1200 ? 0 : f < 1280 ? 1 : f < 1360 ? 3 : 7);
const coopAt = (f: number, i: number) => { const starts = [1204, 1284, 1290, 1364, 1369, 1374, 1379]; return pop((f - starts[i]) / 12); };

// ---- shots / cameras (hold still at each stop; a slow push only) ----
type Pose = { pos: THREE.Vector3; target: THREE.Vector3; fov: number; cInf: number; focus: THREE.Vector3 };
const shotPose = (id: ShotId, f: number, a: number, b: number): Pose => {
  const t = clamp01((f - a) / (b - a)), e = ease(t);
  const head = (who: Who) => (posOf(who, f) ?? V(0, 0, 0)).clone().add(V(0, 1.3, 0));
  switch (id) {
    case "A": { const d = ease((f - 300) / 120); return { pos: V(lerp(6, 0, d), lerp(30, 1.7, Easing.out(Easing.quad)(d)), lerp(22, 1.3, d)), target: V(0, lerp(0, 1.4, d), lerp(-3, -5.6, d)), fov: 46, cInf: 6, focus: head("sari") }; }
    case "B": return { pos: V(0, 1.05, lerp(0.7, 0.45, e)), target: V(0, 0.82, -5.2), fov: 54, cInf: 10, focus: head("sari") };
    case "C1": return { pos: V(-9.8, 1.7, lerp(11.7, 11.4, e)), target: V(-9.8, 0.95, 6.3), fov: 40, cInf: 10, focus: head("budi") };
    case "C2": return { pos: V(-10.0, 1.5, lerp(9.0, 8.8, e)), target: V(-10.0, 1.25, 6.35), fov: 38, cInf: 16, focus: head("budi") };
    case "D": return { pos: V(0.0, 1.5, lerp(11.2, 10.9, e)), target: V(0.0, 0.85, 6.7), fov: 40, cInf: 10, focus: head("sari") };
    case "E1": return { pos: V(9.95, 1.45, lerp(10.6, 10.3, e)), target: V(9.95, 0.75, 6.7), fov: 40, cInf: 12, focus: V(10.1, 0.3, 6.7) };
    case "E2": return { pos: V(8.2, 1.2, 13.0), target: V(8.35, 2.0, 8.2), fov: 50, cInf: 8, focus: head("budi") };
    case "F": return { pos: V(10.4, 8.0, 18.2), target: V(13.1, 0.3, 6.0), fov: 44, cInf: 4, focus: V(13, 0.5, 6) };
    case "G": return { pos: V(8.35, 1.4, lerp(13.7, 13.4, e)), target: V(8.35, 1.15, 8.5), fov: 50, cInf: 10, focus: head("budi") };
    case "H": return { pos: V(9.95, 1.35, 12.9), target: V(9.95, 1.7, 8.3), fov: 50, cInf: 10, focus: head("budi") };
  }
};

type Card = { mesh: THREE.Mesh; g: CanvasRenderingContext2D; tex: THREE.CanvasTexture; blob: THREE.Mesh };
const blobTex = (() => { let t: THREE.Texture | null = null; return () => { if (t) return t; const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d")!; const r = g.createRadialGradient(64, 64, 4, 64, 64, 62); r.addColorStop(0, "rgba(25,35,25,0.5)"); r.addColorStop(1, "rgba(25,35,25,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); t = new THREE.CanvasTexture(c); return t; }; })();
const makeBlob = (w: number) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.5), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.layers.set(NOINK); return m; };
const makeCard = (): Card => {
  const c = document.createElement("canvas"); c.width = 600; c.height = 1000;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.75).translate(0, 0.875, 0), new THREE.MeshBasicMaterial({ map: tex, color: "#fff6ea", transparent: true, alphaTest: 0.5 }));
  mesh.layers.set(NOINK); mesh.renderOrder = 1;
  return { mesh, g: c.getContext("2d")!, tex, blob: makeBlob(0.8) };
};
// card shading: sun from the left, so the right side of each body sits in soft cool shade
const shadeCard = (g: CanvasRenderingContext2D) => {
  g.save(); g.globalCompositeOperation = "source-atop";
  const sh = g.createLinearGradient(140, 0, 480, 0); sh.addColorStop(0, "rgba(255,230,180,0.10)"); sh.addColorStop(0.5, "rgba(40,50,95,0)"); sh.addColorStop(1, "rgba(40,50,95,0.26)");
  g.fillStyle = sh; g.fillRect(0, 0, 600, 1000); g.restore();
};

const makeBloom = () => new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.4, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
const fwd = new THREE.Vector3();
type Bird = { mesh: THREE.Mesh; blob: THREE.Mesh };
const ShotInner: React.FC<{ k: number }> = ({ k }) => {
  const [a, b, id] = SHOTS[k];
  const f = useCurrentFrame() + a;
  const { camera, scene } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const set: Kampung = useMemo(buildKampung, []);
  const cards = useMemo(() => Object.fromEntries(WHO.map((w) => [w, makeCard()])) as Record<Who, Card>, []);
  const mats = useMemo(henMats, []);
  const birds = useMemo<Bird[]>(() => Array.from({ length: 92 }, () => ({ mesh: (() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), mats.hen[0][0]); m.layers.set(NOINK); m.renderOrder = 1; return m; })(), blob: makeBlob(0.4) })), [mats]);
  const fx = useMemo(() => ({ ink: new InkPass(scene, cam), lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }), bloom: makeBloom(), tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day) }), [scene, cam]);
  React.useEffect(() => () => InkPass.prototype.dispose.call(fx.ink), [fx]);
  const p = shotPose(id, f, a, b);
  cam.position.copy(p.pos); cam.lookAt(p.target); cam.fov = p.fov; cam.near = 0.1; cam.far = 300; cam.updateProjectionMatrix(); cam.layers.enable(NOINK);
  const yawTo = (x: number, z: number) => Math.atan2(cam.position.x - x, cam.position.z - z);
  // people
  for (const w of WHO) {
    const c = cards[w], pos = posOf(w, f); c.mesh.visible = c.blob.visible = !!pos; if (!pos) continue;
    drawPerson(c.g, LOOKS[w], acting(w, f)); shadeCard(c.g); c.tex.needsUpdate = true;
    c.mesh.position.copy(pos); c.mesh.rotation.set(0, yawTo(pos.x, pos.z), 0); c.blob.position.set(pos.x, pos.y + 0.012, pos.z + 0.04);
  }
  // protest sign: in Budi's raised right hand (card plane, ~0.3 m right of his centre)
  const bp = posOf("budi", f); set.sign.visible = !!bp && f >= 1440 && f < 1620;
  if (bp && set.sign.visible) { const yw = yawTo(bp.x, bp.z); set.sign.position.set(bp.x + Math.cos(yw) * 0.3, 0.42 + 0.04 * Math.sin(f / 3), bp.z - Math.sin(yw) * 0.3 + 0.02); set.sign.rotation.set(0, yw, 0.06 * Math.sin(f / 5)); }
  // chickens
  const birdList: { x: number; z: number; y?: number; s: number; chick: boolean; seed: number; scale?: number }[] = [];
  if (f < 570) WHO.slice(0, 3).forEach((w, i) => { const t = (f - HANDOUT[i]) / 8; if (t > 0) { const pp = posOf(w, f)!; birdList.push({ x: pp.x + 0.42, z: pp.z + 0.45, s: 0.55, chick: false, seed: i, scale: pop(t), y: Math.max(0, 0.6 * (1 - t)) }); } });
  if (id === "D") birdList.push({ x: 0.45, z: 6.95, s: 0.6, chick: false, seed: 4 });
  if (id === "E1") {
    const henX = f < 1000 ? 10.1 : lerp(10.1, 10.38, easeOut((f - 1000) / 15)); birdList.push({ x: henX, z: f < 1000 ? 6.7 : 6.95, y: f < 1000 ? 0.05 : 0, s: 0.62, chick: false, seed: 9 });
    set.nestEggs.forEach((e, i) => { const hatch = 1012 + i * 9; e.visible = f < hatch; if (f >= hatch) birdList.push({ x: e.position.x + Math.cos(i) * 0.12 * easeOut((f - hatch) / 10), z: e.position.z + 0.12, s: 0.3, chick: true, seed: 20 + i, scale: pop((f - hatch) / 7) }); });
  } else set.nestEggs.forEach((e) => (e.visible = f < 1000));
  const nF = Math.floor(flockShown(f));
  for (let i = 0; i < nF; i++) { const q = FLOCK[i]; birdList.push({ x: q.x + 0.12 * Math.sin(f * 0.02 + i), z: q.z, s: q.chick ? 0.3 : 0.58, chick: q.chick, seed: 40 + i, scale: f < 1440 ? pop((flockShown(f) - i) / 1.5) : 1 }); }
  birds.forEach((bd, i) => {
    const q = birdList[i]; bd.mesh.visible = bd.blob.visible = !!q; if (!q) return;
    const ph = Math.sin(f * 0.23 + q.seed * 1.7), dir = q.seed % 2 ? 1 : 0;
    bd.mesh.material = q.chick ? mats.chick[ph > 0.2 ? 1 : 0][dir] : mats.hen[ph > 0.7 ? 2 : ph > 0.35 ? 1 : 0][dir];
    const sc = q.s * (q.scale ?? 1); bd.mesh.scale.set(sc, sc, sc); bd.mesh.position.set(q.x, q.y ?? 0, q.z); bd.mesh.rotation.set(0, yawTo(q.x, q.z), 0);
    bd.blob.position.set(q.x, 0.011, q.z + 0.02); bd.blob.scale.setScalar(q.s * 1.4 * (q.scale ?? 1));
  });
  // props over time
  const day = id === "D" ? Math.floor(lerp(1, 30, clamp01((f - 800) / 130))) : 30;
  set.sariEggs.forEach((e, i) => (e.visible = f >= 780 && i < Math.min(14, Math.floor(day / 2.1))));
  set.coops.forEach((c, i) => { const s = i < coopsShown(f) ? coopAt(f, i) : 0; c.visible = s > 0.01; c.scale.setScalar(1.05 * Math.max(0.01, s)); });
  const fl = 1 + 0.25 * Math.sin(f * 1.3) + 0.15 * Math.sin(f * 2.9); set.fire.scale.set(fl, fl * 1.2, fl); set.fire.visible = f < 780;
  set.steam.forEach((s, i) => { const t = ((f * 0.02 + i / 6) % 1); s.visible = f < 780; s.position.set(-9.4 + 0.1 * Math.sin(i * 2 + f * 0.05), 0.95 + t * 0.6, 6.3); s.scale.setScalar(0.4 + t * 0.6); (s.material as THREE.MeshBasicMaterial).opacity = 0.75 * Math.sin(t * Math.PI); s.rotation.set(0, yawTo(-9.4, 6.3), 0); });
  noInkFallback(set.group);
  cam.getWorldDirection(fwd);
  fx.lens.focus = Math.max(0.3, p.focus.clone().sub(cam.position).dot(fwd)); fx.lens.cInf = p.cInf;
  const sh = p.target; // keep the sun's shadow box centred on what the shot looks at
  return (
    <>
      <hemisphereLight args={["#fff6e4", "#7f9a5a", 0.95]} />
      <directionalLight position={[sh.x - 7, 12, sh.z + 6]} target-position={[sh.x, 0, sh.z]} intensity={2.4} color="#fff0d2" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-camera-far={60} shadow-bias={-0.0005} shadow-normalBias={0.02} />
      <primitive attach="background" object={set.sky} />
      <primitive object={set.group} dispose={null} />
      {WHO.map((w) => <group key={w}><primitive object={cards[w].mesh} dispose={null} /><primitive object={cards[w].blob} dispose={null} /></group>)}
      {birds.map((bd, i) => <group key={"b" + i}><primitive object={bd.mesh} dispose={null} /><primitive object={bd.blob} dispose={null} /></group>)}
      <EffectComposer multisampling={4}>
        <primitive object={fx.ink} dispose={null} />
        <primitive object={fx.lens.pre} dispose={null} />
        <primitive object={fx.lens.main} dispose={null} />
        <primitive object={fx.bloom} dispose={null} />
        <primitive object={fx.tone} dispose={null} />
        <primitive object={fx.grade} dispose={null} />
      </EffectComposer>
    </>
  );
};

// ================================================================ overlays (Seanomics-style cards; no speech bubbles)
const Chip: React.FC<{ text: string; color?: string; o?: number; top?: number }> = ({ text, color = "#ffd23f", o = 1, top = 150 }) => (
  <div style={{ position: "absolute", left: 60, top, opacity: o, background: color, color: "#1c2340", fontFamily: FONT, fontWeight: 900, fontSize: 40, letterSpacing: 2, padding: "10px 22px", borderRadius: 14, border: "5px solid #1c2340" }}>{text}</div>
);
const GRAPH = { a: 1092, b: 1188, months: [0, 3, 6, 9, 12, 15, 18, 21, 24], vals: [1, 3, 7, 16, 34, 70, 140, 260, 480] };
const Graph: React.FC<{ f: number }> = ({ f }) => {
  const o = clamp01((f - 1084) / 8), t = clamp01((f - GRAPH.a) / (GRAPH.b - GRAPH.a));
  const x0 = 110, x1 = 900, y0 = 560, y1 = 120, max = 500;
  const pts = GRAPH.months.map((m, i) => [x0 + (m / 24) * (x1 - x0), y0 - (GRAPH.vals[i] / max) * (y0 - y1)]);
  const L = pts.length - 1, pos = t * L, k = Math.floor(pos), fr = pos - k;
  const shown = pts.slice(0, k + 1); if (k < L) shown.push([lerp(pts[k][0], pts[k + 1][0], fr), lerp(pts[k][1], pts[k + 1][1], fr)]);
  const head = shown[shown.length - 1], val = k < L ? Math.round(lerp(GRAPH.vals[k], GRAPH.vals[k + 1], fr)) : GRAPH.vals[L];
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 150, height: 700, opacity: o, transform: `scale(${0.94 + 0.06 * o})`, background: "rgba(10,20,36,0.88)", borderRadius: 32, border: "3px solid rgba(255,255,255,0.15)", fontFamily: FONT }}>
      <div style={{ position: "absolute", left: 50, top: 34, fontSize: 46, fontWeight: 900, color: "#fff", letterSpacing: 2 }}>AYAM JOKO</div>
      <div style={{ position: "absolute", right: 50, top: 46, fontSize: 24, color: "rgba(255,255,255,0.5)" }}>ilustrasi</div>
      <svg width={1000} height={700} style={{ position: "absolute", left: 0, top: 0 }}>
        {[0, 100, 200, 300, 400, 500].map((v) => { const y = y0 - (v / max) * (y0 - y1); return <g key={v}><line x1={x0} x2={x1} y1={y} y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth={2} /><text x={x0 - 16} y={y + 8} fill="rgba(255,255,255,0.5)" fontSize={22} textAnchor="end">{v}</text></g>; })}
        {[0, 6, 12, 18, 24].map((m) => <text key={m} x={x0 + (m / 24) * (x1 - x0)} y={y0 + 44} fill="rgba(255,255,255,0.6)" fontSize={24} textAnchor="middle">{m === 0 ? "awal" : `bln ${m}`}</text>)}
        <polygon points={[...shown, [head[0], y0], [x0, y0]].map((q) => q.join(",")).join(" ")} fill="rgba(46,230,166,0.16)" />
        <polyline points={shown.map((q) => q.join(",")).join(" ")} fill="none" stroke="#2ee6a6" strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={head[0]} cy={head[1]} r={16} fill="#2ee6a6" stroke="#fff" strokeWidth={5} />
        <text x={Math.min(head[0], 780)} y={head[1] - 34} fill="#fff" fontSize={56} fontWeight={900} textAnchor="middle">{val}</text>
        {/* comparison lines: Budi stays at 0, Sari stays at 1 hen + eggs */}
        <line x1={x0} x2={x0 + t * (x1 - x0)} y1={y0 - 2} y2={y0 - 2} stroke="#ff4d5e" strokeWidth={7} strokeLinecap="round" />
        <line x1={x0} x2={x0 + t * (x1 - x0)} y1={y0 - 9} y2={y0 - 9} stroke="#ffd23f" strokeWidth={7} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", left: 50, bottom: 34, display: "flex", gap: 34, fontSize: 28, color: "#fff", fontWeight: 700 }}>
        <span><span style={{ color: "#2ee6a6" }}>●</span> Joko</span><span><span style={{ color: "#ffd23f" }}>●</span> Sari</span><span><span style={{ color: "#ff4d5e" }}>●</span> Budi</span>
      </div>
    </div>
  );
};
const Timeline: React.FC<{ f: number }> = ({ f }) => {
  const labels = ["BULAN 1", "BULAN 6", "TAHUN 2"], counts = [14, 34, 76];
  const k = f < 1280 ? 0 : f < 1360 ? 1 : 2, o = clamp01((f - 1204) / 8);
  const fill = (k + easeOut((f - STAGE[k][0]) / 20)) / 3;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 150, opacity: o, fontFamily: FONT }}>
      <div style={{ position: "relative", height: 120 }}>
        <div style={{ position: "absolute", left: 40, right: 40, top: 40, height: 14, borderRadius: 7, background: "rgba(28,35,64,0.25)" }} />
        <div style={{ position: "absolute", left: 40, top: 40, height: 14, borderRadius: 7, width: `calc(${Math.min(1, fill * 1.5)} * (100% - 80px))`, background: "#1c2340" }} />
        {labels.map((l, i) => { const on = i <= k, x = `calc(40px + ${i / 2} * (100% - 80px))`, s = i === k ? pop((f - STAGE[i][0]) / 10) : 1; return (
          <div key={l} style={{ position: "absolute", left: x, top: 47, transform: `translate(-50%,-50%) scale(${on ? 0.8 + 0.4 * s : 0.8})` }}>
            <div style={{ width: 46, height: 46, borderRadius: 23, background: on ? "#2ee6a6" : "#fff", border: "6px solid #1c2340" }} />
            <div style={{ position: "absolute", top: 58, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", fontSize: 34, fontWeight: 900, color: on ? "#1c2340" : "rgba(28,35,64,0.45)" }}>{l}</div>
          </div>); })}
      </div>
      <div style={{ marginTop: 40, display: "inline-block", background: "#fff", border: "5px solid #1c2340", borderRadius: 18, padding: "10px 26px", fontSize: 44, fontWeight: 900, color: "#1c2340" }}>
        {counts[k]} ayam · {coopsShown(f)} kandang
      </div>
    </div>
  );
};
const EndCard: React.FC<{ f: number }> = ({ f }) => {
  const o = clamp01((f - 1712) / 10);
  const cols = [["BUDI", "dimakan", "#ff4d5e"], ["SARI", "disimpan", "#ffd23f"], ["JOKO", "dikembangkan", "#2ee6a6"]];
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: 170, opacity: o, transform: `translateY(${(1 - o) * 24}px)`, background: "rgba(10,20,36,0.9)", borderRadius: 32, padding: "36px 30px", fontFamily: FONT, textAlign: "center" }}>
      <div style={{ fontSize: 30, color: "rgba(255,255,255,0.6)", letterSpacing: 3, fontWeight: 700 }}>MODAL AWALNYA SAMA</div>
      <div style={{ fontSize: 64, fontWeight: 900, color: "#fff", margin: "6px 0 26px" }}>Satu ayam.</div>
      <div style={{ display: "flex", justifyContent: "space-around" }}>
        {cols.map(([n, v, c], i) => { const s = pop((f - 1726 - i * 8) / 10); return (
          <div key={n} style={{ transform: `scale(${s})` }}>
            <div style={{ width: 70, height: 70, borderRadius: 35, background: c, margin: "0 auto 12px", border: "5px solid #fff" }} />
            <div style={{ fontSize: 34, fontWeight: 900, color: "#fff" }}>{n}</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: c }}>{v}</div>
          </div>); })}
      </div>
    </div>
  );
};
const VillageOverlay: React.FC<{ k: number }> = ({ k }) => {
  const [a, , id] = SHOTS[k]; const f = useCurrentFrame() + a;
  const day = Math.floor(lerp(1, 30, clamp01((f - 800) / 130)));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {id === "D" && <Chip text={`HARI ${day} · ${Math.min(14, Math.floor(day / 2.1))} TELUR`} o={clamp01((f - 790) / 8)} />}
      {id === "E1" && f > 1010 && <Chip text="TELURNYA DITETASKAN" color="#2ee6a6" o={clamp01((f - 1010) / 8)} />}
      {id === "E2" && <Graph f={f} />}
      {id === "F" && <Timeline f={f} />}
      {id === "H" && <EndCard f={f} />}
    </AbsoluteFill>
  );
};

export const AyamStory: React.FC = () => (
  <AbsoluteFill style={{ background: "#03080d" }}>
    <Sequence from={0} durationInFrames={300}><MapPart /></Sequence>
    {SHOTS.map(([a, b], k) => (
      <Sequence key={k} from={a} durationInFrames={b - a}>
        <AbsoluteFill>
          <ThreeCanvas width={W} height={H} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 40, near: 0.1, far: 300 }}>
            <ShotInner k={k} />
          </ThreeCanvas>
        </AbsoluteFill>
        <VillageOverlay k={k} />
      </Sequence>
    ))}
    <Clouds />
  </AbsoluteFill>
);
