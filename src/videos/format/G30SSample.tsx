// SAMPLE of the explainer format, topic G30S (night of 30 Sep - 1 Oct 1965).
// Backbone = storytelling with Seanomics-style cards (timeline, big numbers, names, two versions).
// Map and 3D are inserts where a moment benefits from being seen: route to Lubang Buaya (map),
// the abduction at a house (3D, illustration), the well (3D cut-away, non-graphic).
// Facts are limited to widely documented ones and still need checking before publishing (marked SAMPEL on screen).
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Easing, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame } from "remotion";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { clone as skClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { COL, LocalProj, PL, landNear } from "./geo";

const W = 1080, H = 1920, FPS = 30;
const FONT = "'Avenir Next', 'Helvetica Neue', Arial, sans-serif";
const XF = 12;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => Easing.inOut(Easing.cubic)(clamp01(x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// beats [from, to] in frames
const B = {
  hook: [0, 120], timeline: [110, 300], map: [290, 450], house: [440, 600],
  names: [590, 720], well: [710, 880], versions: [870, 1020], end: [1010, 1110],
} as const;
export const G30S_FRAMES = 1110;
type BeatK = keyof typeof B;
const len = (k: BeatK) => B[k][1] - B[k][0];

// ---------- shared bits ----------
type Pose = { pos: THREE.Vector3; target: THREE.Vector3; fov: number; near?: number };
const SetCam: React.FC<{ pose: Pose }> = ({ pose }) => {
  const c = useThree().camera as THREE.PerspectiveCamera;
  c.position.copy(pose.pos); c.lookAt(pose.target); c.fov = pose.fov; c.near = pose.near ?? 0.05; c.far = 900; c.updateProjectionMatrix();
  return null;
};
const project = (p: THREE.Vector3, pose: Pose) => {
  const cam = new THREE.PerspectiveCamera(pose.fov, W / H, 0.05, 900);
  cam.position.copy(pose.pos); cam.lookAt(pose.target); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const v = p.clone().project(cam);
  return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H, ok: v.z < 1 };
};
const Canvas3D: React.FC<{ children: React.ReactNode; bg?: string }> = ({ children, bg = COL.bg }) => (
  <ThreeCanvas flat width={W} height={H} camera={{ fov: 40, near: 0.05, far: 900 }} style={{ background: bg }}>{children}</ThreeCanvas>
);
const Beat: React.FC<{ k: BeatK; children: React.ReactNode }> = ({ k, children }) => {
  const f = useCurrentFrame();
  const o = Math.min(k === "hook" ? 1 : clamp01(f / XF), k === "end" ? 1 : clamp01((len(k) - f) / XF));
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};
const rise = (f: number, at: number, dur = 14): React.CSSProperties => ({ opacity: clamp01((f - at) / dur), transform: `translateY(${(1 - ease((f - at) / dur)) * 40}px)` });
const Pill: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ children, color = COL.key, style }) => (
  <span style={{ display: "inline-block", padding: "8px 18px", borderRadius: 999, background: color, color: COL.ink, fontWeight: 800, fontSize: 26, letterSpacing: 2, ...style }}>{children}</span>
);
const card: React.CSSProperties = { background: "rgba(16,26,44,0.95)", border: "2px solid rgba(255,255,255,0.10)", borderRadius: 28, padding: "30px 36px" };
const Tag: React.FC<{ at: { x: number; y: number; ok: boolean }; text: string; sub?: string; color?: string; show: number }> = ({ at, text, sub, color = COL.key, show }) =>
  !at.ok ? null : (
    <div style={{ position: "absolute", left: at.x, top: at.y, transform: `translate(-50%, -100%) translateY(${-22 - (1 - show) * 18}px)`, opacity: show, textAlign: "center", fontFamily: FONT }}>
      <div style={{ background: COL.ink, border: `3px solid ${color}`, color: COL.text, borderRadius: 14, padding: "8px 18px", fontSize: 34, fontWeight: 800, whiteSpace: "nowrap" }}>{text}</div>
      {sub ? <div style={{ color, fontSize: 24, fontWeight: 700, marginTop: 4 }}>{sub}</div> : null}
      <div style={{ width: 4, height: 22, background: color, margin: "0 auto" }} />
    </div>
  );

// ---------- persistent chrome: date timeline + chapter + sample stamp + source ----------
const DATES = [{ d: "30 Sep", t: 0.06 }, { d: "1 Okt", t: 0.3 }, { d: "3 Okt", t: 0.6 }, { d: "4 Okt", t: 0.78 }, { d: "5 Okt", t: 0.95 }];
const SOURCES: [BeatK, string][] = [
  ["hook", ""], ["timeline", "Sumber: catatan sejarah umum (perlu dicek)"], ["map", "Peta: Natural Earth · posisi perkiraan"],
  ["house", "Ilustrasi rekonstruksi, bukan rekaman"], ["names", "Sumber: catatan sejarah umum (perlu dicek)"],
  ["well", "Ilustrasi rekonstruksi · bukan skala"], ["versions", "Anderson, \"How Did the Generals Die?\", Indonesia 43 (1987)"], ["end", ""],
];
const Chrome: React.FC = () => {
  const f = useCurrentFrame();
  const prog = interpolate(f, [0, 300, 450, 600, 880, 1110], [0.02, 0.3, 0.33, 0.36, 0.78, 0.95], { extrapolateRight: "clamp" });
  const src = [...SOURCES].reverse().find(([k]) => f >= B[k][0])?.[1] ?? "";
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: COL.text, pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, bottom: "auto", height: 420, background: "linear-gradient(rgba(7,13,24,0.94) 55%, rgba(7,13,24,0))" }} />
      <div style={{ position: "absolute", left: 70, right: 70, top: 96 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}><Pill>G30S</Pill><span style={{ fontSize: 30, fontWeight: 700 }}>Bagian 1 · Satu malam</span></div>
          <Pill color="#ffd23f" style={{ fontSize: 22, padding: "6px 14px" }}>SAMPEL</Pill>
        </div>
        <div style={{ position: "relative", height: 8, borderRadius: 4, background: "rgba(255,255,255,0.14)", marginTop: 34 }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${prog * 100}%`, borderRadius: 4, background: COL.key }} />
          {DATES.map((m) => (
            <div key={m.d} style={{ position: "absolute", left: `${m.t * 100}%`, top: -9 }}>
              <div style={{ width: 26, height: 26, borderRadius: 13, transform: "translateX(-50%)", background: prog >= m.t ? COL.key : "#2a3447", border: `4px solid ${COL.bg}` }} />
              <div style={{ position: "absolute", left: 0, top: 32, transform: "translateX(-50%)", fontSize: 24, fontWeight: 700, whiteSpace: "nowrap", color: prog >= m.t ? COL.text : COL.dim }}>{m.d}</div>
            </div>
          ))}
        </div>
      </div>
      {src ? <div style={{ position: "absolute", left: 70, right: 70, bottom: 120, fontSize: 24, color: COL.dim }}>{src}</div> : null}
    </AbsoluteFill>
  );
};

// ================= 1. HOOK (cards only) =================
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: COL.text, justifyContent: "center", padding: "0 80px", background: `radial-gradient(circle at 50% 45%, #16233b 0%, ${COL.bg} 70%)` }}>
      <div style={{ ...rise(f, 4), fontSize: 34, letterSpacing: 6, color: COL.key, fontWeight: 800 }}>30 SEPTEMBER → 1 OKTOBER 1965</div>
      <div style={{ ...rise(f, 10), fontSize: 104, lineHeight: 1.02, fontWeight: 800, margin: "20px 0 50px" }}>Satu malam yang mengubah Indonesia.</div>
      <div style={{ ...card, ...rise(f, 34), display: "flex", alignItems: "center", gap: 30 }}>
        <div style={{ fontSize: 190, fontWeight: 800, lineHeight: 0.9, color: COL.key }}>7</div>
        <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.2 }}>perwira TNI AD<br /><span style={{ color: COL.dim }}>tewas dalam hitungan jam</span></div>
      </div>
    </AbsoluteFill>
  );
};

// ================= 2. TIMELINE (cards) =================
const EVENTS = [
  { d: "30 Sep · malam", t: "Pasukan berkumpul di sekitar Lubang Buaya" },
  { d: "1 Okt · dini hari", t: "Penjemputan di 7 rumah perwira" },
  { d: "1 Okt · pagi", t: "Pengumuman \"Dewan Revolusi\" lewat RRI" },
  { d: "3 Okt", t: "Sumur di Lubang Buaya ditemukan" },
  { d: "4 Okt", t: "Jenazah diangkat dari sumur" },
  { d: "5 Okt", t: "Dimakamkan di TMP Kalibata" },
];
const Timeline: React.FC = () => {
  const f = useCurrentFrame();
  const fill = ease((f - 10) / 150);
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: COL.text, padding: "430px 80px 0", background: COL.bg }}>
      <div style={{ ...rise(f, 0), fontSize: 30, letterSpacing: 4, color: COL.dim, fontWeight: 800, marginBottom: 30 }}>KRONOLOGI SINGKAT</div>
      <div style={{ position: "relative", paddingLeft: 70 }}>
        <div style={{ position: "absolute", left: 18, top: 10, bottom: 40, width: 6, borderRadius: 3, background: "rgba(255,255,255,0.12)" }} />
        <div style={{ position: "absolute", left: 18, top: 10, width: 6, borderRadius: 3, height: `${fill * 92}%`, background: COL.key }} />
        {EVENTS.map((e, i) => {
          const at = 14 + i * 24;
          const on = f >= at;
          return (
            <div key={e.t} style={{ position: "relative", marginBottom: 34, ...rise(f, at) }}>
              <div style={{ position: "absolute", left: -66, top: 6, width: 34, height: 34, borderRadius: 17, background: on ? COL.key : "#2a3447", border: `6px solid ${COL.bg}` }} />
              <div style={{ fontSize: 28, fontWeight: 800, color: COL.key, letterSpacing: 1 }}>{e.d.toUpperCase()}</div>
              <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.15 }}>{e.t}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ================= 3. MAP: Jakarta, route to Lubang Buaya =================
const JKT: LocalProj = { lon0: 106.86, lat0: -6.23, k: 60 };
const PTS = {
  menteng: [106.832, -6.196] as [number, number], // area of several homes (approx.)
  halim: [106.891, -6.266] as [number, number],
  lb: [106.904, -6.293] as [number, number], // Lubang Buaya (approx.)
  istana: [106.827, -6.17] as [number, number],
};
const mapPose = (f: number): Pose => {
  const t = ease(f / 150);
  const tgt = PL(JKT, 106.866, lerp(-6.228, -6.236, t)); // coast at the top, Lubang Buaya just above the card
  const h = lerp(36, 33, t);
  return { pos: tgt.clone().add(new THREE.Vector3(0, h, h * 0.22)), target: tgt, fov: 40 };
};
const routeCurve = new THREE.CatmullRomCurve3([
  PL(JKT, ...PTS.menteng, 0.12), PL(JKT, 106.86, -6.235, 0.6), PL(JKT, ...PTS.halim, 0.35), PL(JKT, ...PTS.lb, 0.12),
]);
const Pin: React.FC<{ p: THREE.Vector3; c: string; s: number }> = ({ p, c, s }) => (
  <group position={p} scale={Math.max(0.001, s)}>
    <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.04, 0.04, 0.5, 8]} /><meshBasicMaterial color={c} /></mesh>
    <mesh position={[0, 0.55, 0]}><sphereGeometry args={[0.14, 16, 12]} /><meshBasicMaterial color={c} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}><ringGeometry args={[0.18, 0.26, 32]} /><meshBasicMaterial color={c} transparent opacity={0.6} /></mesh>
  </group>
);
const MapScene: React.FC = () => {
  const f = useCurrentFrame();
  const land = useMemo(() => landNear(JKT, [106.3, -6.9, 107.5, -5.6], 0.06), []);
  const grid = useMemo(() => { const pts: THREE.Vector3[] = []; for (let i = -20; i <= 20; i++) { pts.push(new THREE.Vector3(i * 1.5, 0.07, -30), new THREE.Vector3(i * 1.5, 0.07, 30), new THREE.Vector3(-30, 0.07, i * 1.5), new THREE.Vector3(30, 0.07, i * 1.5)); } return new THREE.BufferGeometry().setFromPoints(pts); }, []);
  const tube = useMemo(() => new THREE.TubeGeometry(routeCurve, 300, 0.05, 8, false), []);
  const glow = useMemo(() => new THREE.TubeGeometry(routeCurve, 300, 0.14, 8, false), []);
  const draw = Math.floor(ease((f - 40) / 70) * 300) * 8 * 6;
  tube.setDrawRange(0, draw); glow.setDrawRange(0, draw);
  return (
    <>
      <SetCam pose={mapPose(f)} />
      <hemisphereLight args={["#dfe8ff", "#1a2233", 0.9]} />
      <directionalLight position={[-6, 14, 8]} intensity={1.2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}><planeGeometry args={[400, 400]} /><meshBasicMaterial color={COL.ocean} /></mesh>
      <mesh geometry={land}><meshStandardMaterial color="#3a4256" roughness={1} /></mesh>
      <lineSegments geometry={grid}><lineBasicMaterial color="#ffffff" transparent opacity={0.07} /></lineSegments>
      <Pin p={PL(JKT, ...PTS.menteng, 0.06)} c={COL.text} s={ease((f - 12) / 12)} />
      <Pin p={PL(JKT, ...PTS.lb, 0.06)} c={COL.key} s={ease((f - 100) / 12)} />
      <mesh geometry={glow}><meshBasicMaterial color={COL.key} transparent opacity={0.25} depthWrite={false} /></mesh>
      <mesh geometry={tube}><meshBasicMaterial color={COL.key} /></mesh>
    </>
  );
};
const MapOverlay: React.FC = () => {
  const f = useCurrentFrame();
  const pose = mapPose(f);
  const at = (q: [number, number]) => project(PL(JKT, q[0], q[1], 0.7), pose);
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: COL.text }}>
      <Tag at={at(PTS.menteng)} text="Menteng" sub="RUMAH-RUMAH PERWIRA*" color={COL.text} show={ease((f - 14) / 12)} />
      <Tag at={at(PTS.lb)} text="Lubang Buaya" sub="DEKAT HALIM" color={COL.key} show={ease((f - 102) / 12)} />
      <div style={{ position: "absolute", left: 70, right: 70, bottom: 300, ...card, ...rise(f, 60) }}>
        <div style={{ fontSize: 26, letterSpacing: 3, color: COL.dim, fontWeight: 800 }}>JARAK GARIS LURUS</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <div style={{ fontSize: 130, fontWeight: 800, lineHeight: 1.05 }}>±13</div>
          <div style={{ fontSize: 52, fontWeight: 800, color: COL.key }}>km</div>
        </div>
        <div style={{ fontSize: 30, color: COL.dim }}>dari pusat kota ke Lubang Buaya, dini hari</div>
      </div>
    </AbsoluteFill>
  );
};

// ================= mannequins (Mixamo, one flat colour, no face texture) =================
type Clips = { base: THREE.Group; idle: THREE.AnimationClip; walk: THREE.AnimationClip };
let clipsP: Promise<Clips> | null = null;
const loadClips = () => {
  if (!clipsP) {
    const L = new FBXLoader();
    clipsP = Promise.all(["idle", "walking"].map((n) => L.loadAsync(staticFile(`mixamo/${n}.fbx`)))).then(([a, b]) => {
      const take = (o: THREE.Group) => {
        const c = [...o.animations].sort((x, y) => y.duration - x.duration)[0].clone();
        const hips = c.tracks.find((t) => /Hips\.position$/.test(t.name));
        if (hips) { const v = hips.values, n = v.length / 3; for (let k = 1; k < n; k++) { v[k * 3] = v[0]; v[k * 3 + 2] = v[2]; } }
        return c;
      };
      a.updateMatrixWorld(true);
      const top = a.getObjectByName("mixamorigHeadTop_End") ?? a.getObjectByName("mixamorigHead");
      a.scale.setScalar(1.78 / Math.max(1e-3, top ? top.getWorldPosition(new THREE.Vector3()).y : 180));
      return { base: a, idle: take(a), walk: take(b) };
    });
  }
  return clipsP;
};
const useClips = () => {
  const [c, setC] = useState<Clips | null>(null);
  const [h] = useState(() => delayRender("mannequins", { timeoutInMilliseconds: 300000 }));
  useEffect(() => { loadClips().then((x) => { setC(x); continueRender(h); }); }, [h]);
  return c;
};
const makeMan = (C: Clips, color: string) => {
  const m = skClone(C.base) as THREE.Group;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  m.traverse((o) => { const s = o as THREE.SkinnedMesh; if (s.isMesh) { s.material = mat; s.frustumCulled = false; s.castShadow = true; } });
  const mixer = new THREE.AnimationMixer(m);
  return { m, mixer, idle: mixer.clipAction(C.idle), walk: mixer.clipAction(C.walk) };
};
type Man = ReturnType<typeof makeMan>;
const pose = (man: Man, clip: "idle" | "walk", C: Clips, t: number, offset = 0) => {
  man.idle.play(); man.walk.play();
  const a = clip === "walk" ? man.walk : man.idle, b = clip === "walk" ? man.idle : man.walk;
  const d = clip === "walk" ? C.walk.duration : C.idle.duration;
  a.setEffectiveWeight(1); b.setEffectiveWeight(0);
  a.time = (t + offset) % d;
  man.mixer.update(0);
};

// ================= 4. HOUSE AT NIGHT (3D, illustration) =================
const housePose = (f: number): Pose => {
  const d = lerp(40, 33, ease(f / 160));
  const dir = new THREE.Vector3(0.42, 0.45, 0.79).normalize();
  const tgt = new THREE.Vector3(2.2, 0.8, 3.6);
  return { pos: tgt.clone().add(dir.multiplyScalar(d)), target: tgt, fov: 40 };
};
const GATE = new THREE.Vector3(0, 0, 4.4), TRUCK = new THREE.Vector3(7.2, 0, 7.4);
const HouseSet: React.FC<{ C: Clips }> = ({ C }) => {
  const f = useCurrentFrame();
  const men = useMemo(() => [0, 1, 2].map(() => makeMan(C, "#9aa3b2")), [C]);
  const fence = useMemo(() => { const xs: number[] = []; for (let x = -6; x <= 6; x += 0.8) if (Math.abs(x) > 1.1) xs.push(x); return xs; }, []);
  men.forEach((man, i) => {
    const start = TRUCK.clone().add(new THREE.Vector3(-1.6 - i * 0.9, 0, -0.4 + i * 0.7));
    const end = GATE.clone().add(new THREE.Vector3(-0.8 + i * 0.8, 0, 0.9 + i * 0.35));
    const t = clamp01((f - 10 - i * 8) / 110);
    const walking = t > 0 && t < 1;
    man.m.position.lerpVectors(start, end, t);
    const dir = end.clone().sub(start);
    man.m.rotation.y = walking || t === 0 ? Math.atan2(dir.x, dir.z) : Math.atan2(-man.m.position.x, -man.m.position.z + 0);
    pose(man, walking ? "walk" : "idle", C, f / FPS, i * 0.37);
  });
  const pulse = 0.35 + 0.25 * Math.sin(f / 5);
  return (
    <>
      <SetCam pose={housePose(f)} />
      <hemisphereLight args={["#6f86b8", "#0b0f18", 0.55]} />
      <directionalLight position={[-10, 14, 6]} intensity={0.55} color="#9db4ff" />
      <pointLight position={[0, 2.2, 3.2]} intensity={14} distance={12} color="#ffcf7a" />
      <pointLight position={[6.5, 4.5, 6.3]} intensity={10} distance={14} color="#ffe2b0" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[120, 120]} /><meshStandardMaterial color="#1a2232" roughness={1} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 7.4]}><planeGeometry args={[60, 3.6]} /><meshStandardMaterial color="#262e3e" roughness={1} /></mesh>
      {[-12, -8, -4, 0, 4, 8, 12].map((x) => <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, 7.4]}><planeGeometry args={[1.6, 0.12]} /><meshBasicMaterial color="#6b7385" /></mesh>)}
      {/* house */}
      <mesh position={[0, 1.5, 0]}><boxGeometry args={[7, 3, 5]} /><meshStandardMaterial color="#cfc6b4" roughness={1} /></mesh>
      <mesh position={[0, 4.1, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 0.72]}><coneGeometry args={[5.2, 2.2, 4]} /><meshStandardMaterial color="#7a4b3a" roughness={1} flatShading /></mesh>
      <mesh position={[0, 1.0, 2.52]}><boxGeometry args={[1.1, 2.0, 0.05]} /><meshStandardMaterial color="#3b2a20" /></mesh>
      {[-2.3, 2.3].map((x) => <mesh key={x} position={[x, 1.7, 2.52]}><boxGeometry args={[1.3, 1.0, 0.05]} /><meshBasicMaterial color="#ffd27a" /></mesh>)}
      {/* fence */}
      {fence.map((x) => <mesh key={x} position={[x, 0.5, 4.4]}><boxGeometry args={[0.12, 1.0, 0.12]} /><meshStandardMaterial color="#e8e2d4" /></mesh>)}
      <mesh position={[-3.6, 0.85, 4.4]}><boxGeometry args={[4.9, 0.08, 0.08]} /><meshStandardMaterial color="#e8e2d4" /></mesh>
      <mesh position={[3.6, 0.85, 4.4]}><boxGeometry args={[4.9, 0.08, 0.08]} /><meshStandardMaterial color="#e8e2d4" /></mesh>
      {/* street lamp */}
      <mesh position={[6.5, 2.3, 6.0]}><cylinderGeometry args={[0.06, 0.08, 4.6, 8]} /><meshStandardMaterial color="#2b3242" /></mesh>
      <mesh position={[6.5, 4.6, 6.0]}><sphereGeometry args={[0.22, 16, 12]} /><meshBasicMaterial color="#ffe2b0" /></mesh>
      {/* truck */}
      <group position={TRUCK.toArray()}>
        <mesh position={[1.9, 1.0, 0]}><boxGeometry args={[1.6, 1.5, 2.0]} /><meshStandardMaterial color="#4b5a3b" roughness={0.9} /></mesh>
        <mesh position={[-0.6, 0.85, 0]}><boxGeometry args={[3.4, 0.5, 2.0]} /><meshStandardMaterial color="#3f4d33" roughness={0.9} /></mesh>
        <mesh position={[-0.6, 1.75, 0]}><boxGeometry args={[3.4, 1.3, 2.0]} /><meshStandardMaterial color="#56653f" roughness={0.9} /></mesh>
        {[[-1.6, 1], [-1.6, -1], [1.8, 1], [1.8, -1]].map(([x, z]) => <mesh key={`${x}${z}`} position={[x, 0.42, z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.42, 0.42, 0.3, 16]} /><meshStandardMaterial color="#14171d" /></mesh>)}
      </group>
      {/* highlight ring at the gate */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 4.9]}><ringGeometry args={[1.3, 1.6, 48]} /><meshBasicMaterial color={COL.key} transparent opacity={pulse * ease((f - 60) / 20)} /></mesh>
      {men.map((m, i) => <primitive key={i} object={m.m} />)}
    </>
  );
};
const HouseBeat: React.FC = () => { const C = useClips(); return C ? <Canvas3D bg="#0a0f1a"><HouseSet C={C} /></Canvas3D> : null; };
const HouseOverlay: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: COL.text }}>
      <div style={{ position: "absolute", left: 70, right: 70, bottom: 300, ...card, ...rise(f, 20) }}>
        <div style={{ fontSize: 28, letterSpacing: 3, color: COL.key, fontWeight: 800 }}>1 OKTOBER 1965 · DINI HARI</div>
        <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.12, marginTop: 8 }}>Pasukan datang ke 7 rumah perwira dalam waktu hampir bersamaan.</div>
      </div>
      <div style={{ position: "absolute", right: 70, top: 300, fontSize: 24, color: COL.dim, textAlign: "right", ...rise(f, 8) }}>ILUSTRASI<br />rumah tidak menggambarkan lokasi asli</div>
    </AbsoluteFill>
  );
};

// ================= 5. NAMES (cards) =================
const NAMES = ["Ahmad Yani", "R. Soeprapto", "M.T. Haryono", "S. Parman", "D.I. Pandjaitan", "Sutoyo Siswomiharjo", "Pierre Tendean"];
const Names: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: COL.text, padding: "420px 70px 0", background: COL.bg }}>
      <div style={{ ...rise(f, 0), fontSize: 30, letterSpacing: 4, color: COL.dim, fontWeight: 800, marginBottom: 26 }}>YANG TEWAS MALAM ITU</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {NAMES.map((n, i) => (
          <div key={n} style={{ ...card, padding: "26px 28px", ...rise(f, 8 + i * 7), gridColumn: i === NAMES.length - 1 ? "1 / span 2" : undefined, borderLeft: `8px solid ${COL.key}` }}>
            <div style={{ fontSize: 24, color: COL.dim, fontWeight: 700 }}>{String(i + 1).padStart(2, "0")}</div>
            <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1 }}>{n}</div>
          </div>
        ))}
      </div>
      <div style={{ ...rise(f, 70), fontSize: 30, color: COL.dim, marginTop: 28, lineHeight: 1.3 }}>Jenderal A.H. Nasution juga menjadi sasaran, tetapi berhasil lolos.</div>
    </AbsoluteFill>
  );
};

// ================= 6. THE WELL (3D cut-away, non-graphic) =================
const wellPose = (f: number): Pose => {
  const t = ease(f / 170);
  const tgt = new THREE.Vector3(0, lerp(-6.5, -8.0, t), -1);
  return { pos: new THREE.Vector3(lerp(11, 8, t), lerp(6, 3, t), lerp(44, 41, t)), target: tgt, fov: 40, near: 2 }; // far camera: raise near plane for depth precision
};
const WellSet: React.FC<{ C: Clips }> = ({ C }) => {
  const f = useCurrentFrame();
  const man = useMemo(() => makeMan(C, "#9aa3b2"), [C]);
  man.m.position.set(-1.9, 0, -1.3); man.m.rotation.y = 0.9;
  pose(man, "idle", C, f / FPS);
  const R = 0.42, D = 12;
  const earth = useMemo(() => [new THREE.MeshStandardMaterial({ color: "#7a6448", roughness: 1 })], []);
  const top = "#4d6b45";
  // faces: +x, -x, +y, -y, +z (the cut), -z. `shaft` = the side that faces the well, painted dark like the shaft wall
  const blockMats = (c: string, shaft?: 0 | 1) => ["#6e5a40", "#6e5a40", c, "#6e5a40", "#8a7353", "#6e5a40"].map((x, i) => new THREE.MeshStandardMaterial({ color: i === shaft ? "#3b3026" : x, roughness: 1 }));
  void earth;
  const s = ease((f - 30) / 20);
  return (
    <>
      <SetCam pose={wellPose(f)} />
      <hemisphereLight args={["#e6eeff", "#202838", 0.85]} />
      <directionalLight position={[6, 12, 10]} intensity={1.4} />
      {/* ground behind the cut */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -18]}><planeGeometry args={[80, 30]} /><meshStandardMaterial color={top} roughness={1} /></mesh>
      {/* cut-away earth block with the shaft at x=0, z=0 (front face is the cut) */}
      <mesh position={[-(6 + R) / 2, -D / 2 - 0.75, -1.5]} material={blockMats(top, 0)}><boxGeometry args={[6 - R, D + 1.5, 3]} /></mesh>
      <mesh position={[(6 + R) / 2, -D / 2 - 0.75, -1.5]} material={blockMats(top, 1)}><boxGeometry args={[6 - R, D + 1.5, 3]} /></mesh>
      {/* back filler sits just behind the shaft wall, so the two never share a surface (that flickered) */}
      <mesh position={[0, -D / 2 - 0.75, -1.5 - (R + 0.04) / 2]} material={blockMats(top)}><boxGeometry args={[2 * R, D + 1.5, 3 - R - 0.04]} /></mesh>
      <mesh position={[0, -D - 0.75, -R / 2]} material={blockMats(top)}><boxGeometry args={[2 * R, 1.5, R]} /></mesh>
      {/* shaft wall (back half) */}
      <mesh position={[0, -D / 2, 0]}><cylinderGeometry args={[R, R, D, 32, 1, true, Math.PI / 2, Math.PI]} /><meshStandardMaterial color="#3b3026" side={THREE.BackSide} roughness={1} /></mesh>
      {/* rim (back half) */}
      <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[R + 0.12, R + 0.12, 0.5, 32, 1, true, Math.PI / 2, Math.PI]} /><meshStandardMaterial color="#9b9486" side={THREE.DoubleSide} /></mesh>
      {/* depth gauge */}
      <mesh position={[1.25, -D / 2, 0.5]} renderOrder={10}><boxGeometry args={[0.07, D, 0.02]} /><meshBasicMaterial color={COL.text} depthTest={false} /></mesh>
      {[0, 3, 6, 9, 12].map((y) => <mesh key={y} position={[1.25, -y, 0.5]} renderOrder={10}><boxGeometry args={[0.45, 0.06, 0.02]} /><meshBasicMaterial color={COL.text} depthTest={false} /></mesh>)}
      {/* highlight at the bottom */}
      <mesh position={[0, -D + 0.6, 0]} scale={0.3 + 0.7 * s}><sphereGeometry args={[1.3, 32, 24]} /><meshBasicMaterial color={COL.key} transparent opacity={(0.18 + 0.08 * Math.sin(f / 6)) * s} depthWrite={false} /></mesh>
      <primitive object={man.m} />
    </>
  );
};
const WellBeat: React.FC = () => { const C = useClips(); return C ? <Canvas3D bg="#0b1220"><WellSet C={C} /></Canvas3D> : null; };
const WellOverlay: React.FC = () => {
  const f = useCurrentFrame();
  const p = wellPose(f);
  const g = project(new THREE.Vector3(1.6, -6, 0.5), p);
  const man = project(new THREE.Vector3(-1.9, 0.9, -1.3), p);
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: COL.text }}>
      {man.ok ? <div style={{ position: "absolute", left: man.x - 40, top: man.y, transform: "translate(-100%, -50%)", textAlign: "right", opacity: ease((f - 10) / 12), fontSize: 26, fontWeight: 700, color: COL.dim }}>orang ±1,7 m<br />untuk skala</div> : null}
      {g.ok ? (
        <div style={{ position: "absolute", left: g.x + 16, top: g.y, transform: "translateY(-50%)", ...rise(f, 30) }}>
          <div style={{ fontSize: 96, fontWeight: 800, color: COL.text }}>±12 m</div>
          <div style={{ fontSize: 28, color: COL.dim, fontWeight: 700 }}>kedalaman sumur*</div>
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 70, right: 70, bottom: 300, ...card, ...rise(f, 60) }}>
        <div style={{ fontSize: 28, letterSpacing: 3, color: COL.key, fontWeight: 800 }}>LUBANG BUAYA</div>
        <div style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.15, marginTop: 6 }}>Sumur tua ini ditemukan 3 Oktober. Jenazah diangkat sehari kemudian.</div>
      </div>
    </AbsoluteFill>
  );
};

// ================= 7. TWO VERSIONS (cards) =================
const Versions: React.FC = () => {
  const f = useCurrentFrame();
  const col = (c: string): React.CSSProperties => ({ ...card, flex: 1, borderTop: `10px solid ${c}`, padding: "30px 30px" });
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: COL.text, padding: "430px 70px 0", background: COL.bg }}>
      <div style={{ ...rise(f, 0), fontSize: 30, letterSpacing: 4, color: COL.dim, fontWeight: 800 }}>DUA CERITA BERBEDA</div>
      <div style={{ ...rise(f, 6), fontSize: 64, fontWeight: 800, lineHeight: 1.08, margin: "14px 0 34px" }}>Bagaimana mereka meninggal?</div>
      <div style={{ display: "flex", gap: 22 }}>
        <div style={{ ...col("#e0574f"), ...rise(f, 20) }}>
          <div style={{ fontSize: 24, letterSpacing: 2, color: "#e0574f", fontWeight: 800 }}>BERITA 1965</div>
          <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.15, marginTop: 10 }}>Disiksa dan dimutilasi</div>
          <div style={{ fontSize: 26, color: COL.dim, marginTop: 14 }}>disebarkan luas oleh media saat itu</div>
        </div>
        <div style={{ ...col(COL.west), ...rise(f, 40) }}>
          <div style={{ fontSize: 24, letterSpacing: 2, color: COL.west, fontWeight: 800 }}>HASIL VISUM</div>
          <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.15, marginTop: 10 }}>Luka tembak & benturan</div>
          <div style={{ fontSize: 26, color: COL.dim, marginTop: 14 }}>tidak disebut adanya mutilasi</div>
        </div>
      </div>
      <div style={{ ...rise(f, 70), ...card, marginTop: 24, fontSize: 34, fontWeight: 700, lineHeight: 1.25 }}>
        Laporan visum baru dipublikasikan luas <span style={{ color: COL.key }}>22 tahun kemudian</span>.
      </div>
    </AbsoluteFill>
  );
};

// ================= 8. END =================
const End: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: COL.text, justifyContent: "center", padding: "0 80px", background: `radial-gradient(circle at 50% 50%, #1b1730 0%, ${COL.bg} 70%)` }}>
      <div style={{ ...rise(f, 0), fontSize: 30, letterSpacing: 5, color: COL.dim, fontWeight: 800 }}>5 OKTOBER 1965</div>
      <div style={{ ...rise(f, 6), fontSize: 64, fontWeight: 800, lineHeight: 1.1, margin: "12px 0 60px" }}>Dimakamkan di Taman Makam Pahlawan Kalibata.</div>
      <div style={{ ...rise(f, 30), ...card, borderLeft: `10px solid ${COL.key}` }}>
        <div style={{ fontSize: 26, letterSpacing: 3, color: COL.key, fontWeight: 800 }}>BAGIAN 2</div>
        <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.1, marginTop: 6 }}>Siapa sebenarnya dalangnya?</div>
        <div style={{ fontSize: 30, color: COL.dim, marginTop: 10 }}>versi-versi sejarah, dan buktinya</div>
      </div>
    </AbsoluteFill>
  );
};

// ================= composition =================
const S: React.FC<{ k: BeatK; children: React.ReactNode }> = ({ k, children }) => (
  <Sequence from={B[k][0]} durationInFrames={len(k)}><Beat k={k}>{children}</Beat></Sequence>
);
export const G30SSample: React.FC = () => (
  <AbsoluteFill style={{ background: COL.bg }}>
    <S k="hook"><Hook /></S>
    <S k="timeline"><Timeline /></S>
    <S k="map"><Canvas3D><MapScene /></Canvas3D><MapOverlay /></S>
    <S k="house"><HouseBeat /><HouseOverlay /></S>
    <S k="names"><Names /></S>
    <S k="well"><WellBeat /><WellOverlay /></S>
    <S k="versions"><Versions /></S>
    <S k="end"><End /></S>
    <Chrome />
  </AbsoluteFill>
);
