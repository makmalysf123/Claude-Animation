// 3D test: one story, three different scenes, so we can see what the 3D layer still lacks.
// Story: the Proclamation of Indonesian Independence, 16-17 August 1945 (widely documented; still marked SAMPEL).
//   1) night road: the car taking Soekarno-Hatta to Rengasdengklok before dawn (moving car, headlights, tracking camera)
//   2) interior: drafting the proclamation text at Admiral Maeda's house (table lamp, figures around a table, orbit)
//   3) daylight exterior: the reading at Jl. Pegangsaan Timur 56 (house, crowd, flag raised, slow push-in)
// Figures are Mixamo mannequins (one flat colour, no face). Key figure in our key colour, others grey.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Easing, Sequence, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { clone as skClone } from "three/examples/jsm/utils/SkeletonUtils.js";

const W = 1080, H = 1920, FPS = 30;
const FONT = "'Avenir Next', 'Helvetica Neue', Arial, sans-serif";
const KEY = "#ff5d73", GREY = "#a9aeb8", INK = "#0b1322";
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => Easing.inOut(Easing.cubic)(clamp01(x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const S = { road: [0, 150], room: [150, 300], porch: [300, 450] } as const;
export const PROCLAMATION_FRAMES = 450;
const XF = 12;

// ---------- mannequins ----------
export type Clips = { base: THREE.Group; idle: THREE.AnimationClip; walk: THREE.AnimationClip; wave: THREE.AnimationClip };
let clipsP: Promise<Clips> | null = null;
const loadClips = () => (clipsP ??= (() => {
  const L = new FBXLoader();
  return Promise.all(["idle", "walking", "waving"].map((n) => L.loadAsync(staticFile(`mixamo/${n}.fbx`)))).then(([a, b, c]) => {
    const take = (o: THREE.Group) => {
      const k = [...o.animations].sort((x, y) => y.duration - x.duration)[0].clone(); // real take, not "Take 001"
      const hips = k.tracks.find((t) => /Hips\.position$/.test(t.name));
      if (hips) { const v = hips.values, n = v.length / 3; for (let i = 1; i < n; i++) { v[i * 3] = v[0]; v[i * 3 + 2] = v[2]; } }
      return k;
    };
    a.updateMatrixWorld(true);
    const top = a.getObjectByName("mixamorigHeadTop_End") ?? a.getObjectByName("mixamorigHead");
    a.scale.setScalar(1.78 / Math.max(1e-3, top ? top.getWorldPosition(new THREE.Vector3()).y : 180));
    return { base: a, idle: take(a), walk: take(b), wave: take(c) };
  });
})());
export const useClips = () => {
  const [c, setC] = useState<Clips | null>(null);
  const [h] = useState(() => delayRender("mannequins", { timeoutInMilliseconds: 300000 }));
  useEffect(() => { loadClips().then((x) => { setC(x); continueRender(h); }); }, [h]);
  return c;
};
type Man = { m: THREE.Group; mixer: THREE.AnimationMixer; acts: Record<"idle" | "walk" | "wave", THREE.AnimationAction>; phase: number };
export const makeMan = (C: Clips, color: string, phase = 0): Man => {
  const m = skClone(C.base) as THREE.Group;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
  m.traverse((o) => { const s = o as THREE.SkinnedMesh; if (s.isMesh) { s.material = mat; s.frustumCulled = false; s.castShadow = true; } });
  const mixer = new THREE.AnimationMixer(m);
  const acts = { idle: mixer.clipAction(C.idle), walk: mixer.clipAction(C.walk), wave: mixer.clipAction(C.wave) };
  Object.values(acts).forEach((a) => a.play());
  return { m, mixer, acts, phase };
};
export const poseMan = (man: Man, clip: "idle" | "walk" | "wave", t: number) => {
  for (const k of ["idle", "walk", "wave"] as const) man.acts[k].setEffectiveWeight(k === clip ? 1 : 0);
  const a = man.acts[clip];
  a.time = (t + man.phase) % a.getClip().duration;
  man.mixer.update(0);
};

// ---------- shared ----------
export type Pose = { pos: THREE.Vector3; target: THREE.Vector3; fov: number };
export const SetCam: React.FC<{ p: Pose }> = ({ p }) => {
  const c = useThree().camera as THREE.PerspectiveCamera;
  c.position.copy(p.pos); c.lookAt(p.target); c.fov = p.fov; c.near = 0.1; c.far = 400; c.updateProjectionMatrix();
  return null;
};
export const project = (v: THREE.Vector3, p: Pose) => {
  const cam = new THREE.PerspectiveCamera(p.fov, W / H, 0.1, 400); cam.position.copy(p.pos); cam.lookAt(p.target); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const q = v.clone().project(cam); return { x: ((q.x + 1) / 2) * W, y: ((1 - q.y) / 2) * H, ok: q.z < 1 };
};
export const std = (color: string, rough = 0.85, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });
export const Canvas3D: React.FC<{ bg: string; children: React.ReactNode }> = ({ bg, children }) => (
  <ThreeCanvas flat shadows width={W} height={H} camera={{ fov: 40, near: 0.1, far: 400 }} style={{ background: bg }}>{children}</ThreeCanvas>
);
export const Fade: React.FC<{ len: number; first?: boolean; last?: boolean; children: React.ReactNode }> = ({ len, first, last, children }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: Math.min(first ? 1 : clamp01(f / XF), last ? 1 : clamp01((len - f) / XF)) }}>{children}</AbsoluteFill>;
};
export const Tag: React.FC<{ at: { x: number; y: number; ok: boolean }; text: string; show: number; color?: string }> = ({ at, text, show, color = KEY }) =>
  !at.ok ? null : (
    <div style={{ position: "absolute", left: at.x, top: at.y, transform: "translate(-50%, -100%)", opacity: show, textAlign: "center", fontFamily: FONT }}>
      <div style={{ background: INK, border: `3px solid ${color}`, color: "#fff", borderRadius: 12, padding: "6px 14px", fontSize: 30, fontWeight: 800, whiteSpace: "nowrap" }}>{text}</div>
      <div style={{ width: 3, height: 26, background: color, margin: "0 auto" }} />
    </div>
  );
const SceneCard: React.FC<{ n: number; when: string; where: string; what: string }> = ({ n, when, where, what }) => {
  const f = useCurrentFrame();
  const a = clamp01((f - 6) / 12);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", fontFamily: FONT, color: "#fff" }}>
      <div style={{ position: "absolute", inset: 0, bottom: "auto", height: 380, background: "linear-gradient(rgba(6,12,22,0.85), rgba(6,12,22,0))" }} />
      <div style={{ position: "absolute", left: 60, top: 96, opacity: a, transform: `translateY(${(1 - a) * 20}px)` }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span style={{ background: KEY, color: INK, fontWeight: 800, fontSize: 24, padding: "6px 14px", borderRadius: 999, letterSpacing: 2 }}>ADEGAN {n}/3</span>
          <span style={{ background: "#ffd23f", color: INK, fontWeight: 800, fontSize: 20, padding: "5px 10px", borderRadius: 6, letterSpacing: 2 }}>SAMPEL</span>
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 2, color: "#ffd0d8", marginTop: 18 }}>{when.toUpperCase()}</div>
        <div style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.1, marginTop: 6, textShadow: "0 3px 14px rgba(0,0,0,0.6)" }}>{where}</div>
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, bottom: 300, opacity: clamp01((f - 24) / 12), background: "rgba(11,19,34,0.88)", borderRadius: 22, padding: "22px 28px", fontSize: 38, fontWeight: 700, lineHeight: 1.25 }}>{what}</div>
      <div style={{ position: "absolute", left: 60, bottom: 120, fontSize: 22, color: "rgba(255,255,255,0.6)" }}>Rekonstruksi ilustrasi · bukan rekaman · tokoh digambarkan sebagai manekin</div>
    </AbsoluteFill>
  );
};

// ================= 1. NIGHT ROAD =================
const TREES = Array.from({ length: 60 }, (_, i) => { const side = i % 2 ? 1 : -1; const r = Math.sin(i * 91.7) * 0.5 + 0.5; return { x: -60 + i * 2.6 + r * 1.5, z: side > 0 ? 8 + r * 4 : -(4.5 + r * 4), s: 0.8 + r * 0.7 }; });
const carX = (f: number) => lerp(-30, 22, f / 150);
const roadPose = (f: number): Pose => {
  const x = carX(f);
  return { pos: new THREE.Vector3(x + 12, 3.0, 3.9), target: new THREE.Vector3(x - 0.5, 0.7, 0), fov: 40 }; // ahead on the verge, looking back down the road
};
const Car: React.FC<{ f: number }> = ({ f }) => {
  const spot = useMemo(() => { const s = new THREE.SpotLight("#fff1c8", 60, 30, 0.45, 0.6, 1.2); s.castShadow = true; s.target.position.set(12, 0, 0); return s; }, []);
  const spin = -(carX(f) / 0.45); // wheel radius 0.45
  return (
    <group position={[carX(f), 0, 0]}>
      <mesh position={[0, 0.75, 0]} castShadow><boxGeometry args={[4.4, 0.75, 1.85]} /><primitive object={std("#3b4d43", 0.35, { metalness: 0.35 })} attach="material" /></mesh>
      <mesh position={[-0.35, 1.38, 0]} castShadow><boxGeometry args={[2.2, 0.62, 1.7]} /><primitive object={std("#3b4d43", 0.35, { metalness: 0.35 })} attach="material" /></mesh>
      <mesh position={[-0.35, 1.38, 0]}><boxGeometry args={[2.24, 0.48, 1.74]} /><meshStandardMaterial color="#0d1620" roughness={0.1} metalness={0.6} /></mesh>
      {[[-1.4, 0.95], [-1.4, -0.95], [1.45, 0.95], [1.45, -0.95]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.45, z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.45, 0.45, 0.28, 20]} /><meshStandardMaterial color="#0b0c0e" roughness={0.9} /></mesh>
      ))}
      {[0.6, -0.6].map((z) => <mesh key={z} position={[2.22, 0.82, z]}><sphereGeometry args={[0.13, 16, 12]} /><meshBasicMaterial color="#fff6d8" /></mesh>)}
      <primitive object={spot} position={[2.3, 0.9, 0]} />
      <primitive object={spot.target} />
      <group rotation={[0, 0, spin]} />
    </group>
  );
};
const RoadScene: React.FC = () => {
  const f = useCurrentFrame();
  const trees = useMemo(() => {
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.18, 2, 8), std("#2b2219"), TREES.length);
    const crown = new THREE.InstancedMesh(new THREE.SphereGeometry(1.2, 12, 10), std("#16301f"), TREES.length);
    const d = new THREE.Object3D();
    TREES.forEach((t, i) => {
      d.position.set(t.x, t.s, t.z); d.scale.setScalar(t.s); d.updateMatrix(); trunk.setMatrixAt(i, d.matrix);
      d.position.set(t.x, 2.4 * t.s, t.z); d.scale.set(t.s, t.s * 1.15, t.s); d.updateMatrix(); crown.setMatrixAt(i, d.matrix);
    });
    trunk.castShadow = crown.castShadow = true; trunk.receiveShadow = crown.receiveShadow = true;
    return { trunk, crown };
  }, []);
  return (
    <>
      <SetCam p={roadPose(f)} />
      <hemisphereLight args={["#7d93c4", "#141a26", 0.95]} />
      <directionalLight position={[-20, 30, 10]} intensity={0.9} color="#a9bdff" />
      <fog attach="fog" args={["#16223a", 22, 70]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[200, 80]} /><primitive object={std("#1a2416")} attach="material" /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow><planeGeometry args={[200, 4.2]} /><primitive object={std("#3a3328", 0.95)} attach="material" /></mesh>
      <primitive object={trees.trunk} />
      <primitive object={trees.crown} />
      <Car f={f} />
    </>
  );
};
const RoadOverlay: React.FC = () => {
  const f = useCurrentFrame();
  const at = project(new THREE.Vector3(carX(f) - 0.3, 2.1, 0), roadPose(f));
  return (
    <AbsoluteFill>
      <Tag at={at} text="Soekarno & Hatta" show={clamp01((f - 30) / 12)} />
      <SceneCard n={1} when="16 Agustus 1945 · dini hari" where="Menuju Rengasdengklok" what="Para pemuda membawa Soekarno dan Hatta keluar dari Jakarta sebelum subuh." />
    </AbsoluteFill>
  );
};
const RoadBeat: React.FC = () => <Canvas3D bg="#16223a"><RoadScene /></Canvas3D>;

// ================= 2. ROOM =================
const ROOM_PEOPLE = [
  { x: -0.95, z: 0.05, ry: Math.PI / 2, key: true, label: "Soekarno" },
  { x: 0.95, z: -0.1, ry: -Math.PI / 2, key: false, label: "Hatta" },
  { x: 0.1, z: -1.15, ry: 0, key: false, label: "" },
  { x: -2.0, z: -1.6, ry: 0.6, key: false, label: "" },
  { x: 2.1, z: -1.5, ry: -0.5, key: false, label: "" },
];
const roomPose = (f: number): Pose => {
  const a = THREE.MathUtils.degToRad(lerp(28, -12, ease(f / 150)));
  const r = lerp(8.2, 7.4, ease(f / 150));
  return { pos: new THREE.Vector3(Math.sin(a) * r, 4.2, Math.cos(a) * r), target: new THREE.Vector3(0, 1.0, -0.3), fov: 40 };
};
const RoomScene: React.FC<{ C: Clips }> = ({ C }) => {
  const f = useCurrentFrame();
  const men = useMemo(() => ROOM_PEOPLE.map((p, i) => makeMan(C, p.key ? KEY : GREY, i * 0.73)), [C]);
  men.forEach((m, i) => { const p = ROOM_PEOPLE[i]; m.m.position.set(p.x, 0, p.z); m.m.rotation.y = p.ry; poseMan(m, "idle", f / FPS); });
  const flick = 1 + Math.sin(f / 2.3) * 0.04 + Math.sin(f / 5.1) * 0.03;
  return (
    <>
      <SetCam p={roomPose(f)} />
      <hemisphereLight args={["#6d6a8a", "#1a120c", 0.35]} />
      <pointLight position={[0, 2.25, -0.1]} intensity={18 * flick} distance={9} decay={1.6} color="#ffc977" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <directionalLight position={[-4, 6, 6]} intensity={0.25} color="#8ea2ff" />
      {/* floor + two walls (dollhouse cut-away) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[9, 7]} /><primitive object={std("#5a3a24", 0.7)} attach="material" /></mesh>
      <mesh position={[0, 1.6, -3.5]} receiveShadow><boxGeometry args={[9, 3.2, 0.15]} /><primitive object={std("#d9cdb4")} attach="material" /></mesh>
      <mesh position={[-4.5, 1.6, 0]} receiveShadow><boxGeometry args={[0.15, 3.2, 7]} /><primitive object={std("#cfc2a8")} attach="material" /></mesh>
      <mesh position={[1.6, 1.8, -3.42]}><boxGeometry args={[1.6, 1.1, 0.02]} /><meshBasicMaterial color="#0f1d3a" /></mesh>
      <mesh position={[1.6, 1.8, -3.41]}><boxGeometry args={[1.7, 1.2, 0.01]} /><meshStandardMaterial color="#3b2a1c" /></mesh>
      {/* table */}
      <mesh position={[0, 0.76, -0.1]} castShadow receiveShadow><boxGeometry args={[1.5, 0.08, 1.0]} /><primitive object={std("#3e2716", 0.55)} attach="material" /></mesh>
      {[[-0.68, -0.52], [0.68, -0.52], [-0.68, 0.32], [0.68, 0.32]].map(([x, z]) => <mesh key={`${x}${z}`} position={[x, 0.37, z]} castShadow><boxGeometry args={[0.07, 0.74, 0.07]} /><primitive object={std("#3e2716")} attach="material" /></mesh>)}
      {/* lamp + papers */}
      <mesh position={[0.45, 0.95, -0.35]} castShadow><cylinderGeometry args={[0.05, 0.1, 0.3, 12]} /><primitive object={std("#2a2a2a", 0.4)} attach="material" /></mesh>
      <mesh position={[0.45, 1.15, -0.35]}><coneGeometry args={[0.22, 0.2, 16, 1, true]} /><meshStandardMaterial color="#f1d9a0" emissive="#ffb84d" emissiveIntensity={0.6} side={THREE.DoubleSide} /></mesh>
      <mesh position={[-0.15, 0.805, -0.05]} rotation={[-Math.PI / 2, 0, 0.12]}><planeGeometry args={[0.32, 0.44]} /><meshStandardMaterial color="#f6f1e2" emissive="#fff6dc" emissiveIntensity={0.25} /></mesh>
      <mesh position={[-0.15, 0.81, -0.05]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.36, 0.42, 40]} /><meshBasicMaterial color={KEY} transparent opacity={0.55 * clamp01((f - 50) / 12) * (0.75 + 0.25 * Math.sin(f / 5))} /></mesh>
      {men.map((m, i) => <primitive key={i} object={m.m} />)}
    </>
  );
};
const RoomBeat: React.FC = () => { const C = useClips(); return C ? <Canvas3D bg="#0b0f18"><RoomScene C={C} /></Canvas3D> : null; };
const RoomOverlay: React.FC = () => {
  const f = useCurrentFrame();
  const p = roomPose(f);
  return (
    <AbsoluteFill>
      {ROOM_PEOPLE.filter((x) => x.label).map((x, i) => <Tag key={x.label} at={project(new THREE.Vector3(x.x, 1.92, x.z + 0.05), p)} text={x.label} color={x.key ? KEY : "#c9ced8"} show={clamp01((f - 20 - i * 8) / 12)} />)}
      <Tag at={project(new THREE.Vector3(-0.15, 0.95, -0.05), p)} text="Naskah proklamasi" color="#ffd23f" show={clamp01((f - 55) / 12)} />
      <SceneCard n={2} when="16–17 Agustus 1945 · tengah malam" where="Rumah Laksamana Maeda" what="Naskah proklamasi dirumuskan, lalu diketik menjelang pagi." />
    </AbsoluteFill>
  );
};

// ================= 3. PORCH, DAYLIGHT =================
const CROWD = Array.from({ length: 16 }, (_, i) => { const row = Math.floor(i / 6), col = i % 6; const j = Math.sin(i * 12.9) * 0.3; return { x: -3.1 + col * 1.25 + (row % 2) * 0.6 + j, z: 4.2 + row * 1.25 + j * 0.5, ry: Math.PI + j * 0.4 }; });
const porchPose = (f: number): Pose => {
  const t = ease(f / 150);
  return { pos: new THREE.Vector3(lerp(5.5, 4.0, t), lerp(4.6, 3.8, t), lerp(16.5, 13.5, t)), target: new THREE.Vector3(-0.4, 2.0, 0.8), fov: 40 };
};
const flagY = (f: number) => lerp(1.2, 3.85, ease((f - 60) / 70));
const PorchScene: React.FC<{ C: Clips }> = ({ C }) => {
  const f = useCurrentFrame();
  const speaker = useMemo(() => makeMan(C, KEY, 0.2), [C]);
  const crowd = useMemo(() => CROWD.map((_, i) => makeMan(C, GREY, i * 0.61)), [C]);
  speaker.m.position.set(0, 0.6, 1.3); speaker.m.rotation.y = 0; poseMan(speaker, "idle", f / FPS);
  crowd.forEach((m, i) => { const c = CROWD[i]; m.m.position.set(c.x, 0, c.z); m.m.rotation.y = c.ry; poseMan(m, "idle", f / FPS); });
  const flag = useMemo(() => {
    const g = new THREE.PlaneGeometry(1.5, 1.0, 20, 2);
    const red = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: "#d4202a", side: THREE.DoubleSide, roughness: 0.7 }));
    const white = new THREE.Mesh(g.clone(), new THREE.MeshStandardMaterial({ color: "#f5f3ee", side: THREE.DoubleSide, roughness: 0.7 }));
    red.scale.y = 0.5; white.scale.y = 0.5; red.position.y = 0.25; white.position.y = -0.25; red.castShadow = white.castShadow = true;
    const grp = new THREE.Group(); grp.add(red, white); return { grp, parts: [red, white], base: g.getAttribute("position").array.slice() as Float32Array };
  }, []);
  for (const part of flag.parts) { // wave the cloth
    const pos = part.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) { const x = flag.base[i * 3]; pos.setZ(i, Math.sin(x * 3.2 - f / 3.5) * 0.09 * (x + 0.75)); }
    pos.needsUpdate = true; part.geometry.computeVertexNormals();
  }
  flag.grp.position.set(-1.3 + 0.75, flagY(f), 3.4);
  return (
    <>
      <SetCam p={porchPose(f)} />
      <hemisphereLight args={["#cfe3ff", "#6b5a3e", 0.75]} />
      <directionalLight position={[8, 14, 10]} intensity={2.0} color="#fff3dc" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-bias={-0.0004} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[80, 60]} /><primitive object={std("#7c9a52")} attach="material" /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 6]} receiveShadow><planeGeometry args={[12, 9]} /><primitive object={std("#b9a77f", 0.95)} attach="material" /></mesh>
      {/* house: body, roof, veranda with columns, steps */}
      <mesh position={[0, 2.0, -2.2]} castShadow receiveShadow><boxGeometry args={[9, 4, 4]} /><primitive object={std("#ece6d6")} attach="material" /></mesh>
      <mesh position={[0, 4.8, -2.2]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 0.48]} castShadow><coneGeometry args={[6.6, 1.6, 4]} /><primitive object={std("#7a3a2a", 0.8, { flatShading: true })} attach="material" /></mesh>
      <mesh position={[0, 0.3, 1.0]} castShadow receiveShadow><boxGeometry args={[6, 0.6, 2.6]} /><primitive object={std("#d8d0bd")} attach="material" /></mesh>
      <mesh position={[0, 3.3, 1.0]} castShadow><boxGeometry args={[6.4, 0.18, 2.8]} /><primitive object={std("#e3dccb")} attach="material" /></mesh>
      {[-2.7, -0.9, 0.9, 2.7].map((x) => <mesh key={x} position={[x, 1.95, 2.15]} castShadow><cylinderGeometry args={[0.13, 0.15, 2.7, 14]} /><primitive object={std("#f4efe2")} attach="material" /></mesh>)}
      {[0, 1].map((i) => <mesh key={i} position={[0, 0.1 + i * 0.2, 2.5 + (1 - i) * 0.3]} receiveShadow castShadow><boxGeometry args={[2.2, 0.2, 0.3]} /><primitive object={std("#cfc6b1")} attach="material" /></mesh>)}
      {[-2.2, 2.2].map((x) => <mesh key={x} position={[x, 2.0, -0.18]}><boxGeometry args={[1.0, 1.4, 0.04]} /><meshStandardMaterial color="#3b4a5a" roughness={0.2} /></mesh>)}
      <mesh position={[0, 1.6, -0.18]}><boxGeometry args={[1.1, 2.2, 0.04]} /><primitive object={std("#6b4a30")} attach="material" /></mesh>
      {/* microphone */}
      <mesh position={[0, 1.35, 1.75]}><cylinderGeometry args={[0.02, 0.02, 1.5, 8]} /><meshStandardMaterial color="#222" /></mesh>
      <mesh position={[0, 2.12, 1.75]}><sphereGeometry args={[0.07, 12, 10]} /><meshStandardMaterial color="#333" metalness={0.6} roughness={0.3} /></mesh>
      {/* bamboo flag pole */}
      <mesh position={[-1.3, 2.5, 3.4]} castShadow><cylinderGeometry args={[0.05, 0.07, 5.0, 10]} /><primitive object={std("#c9a96a", 0.6)} attach="material" /></mesh>
      <primitive object={flag.grp} />
      <primitive object={speaker.m} />
      {crowd.map((m, i) => <primitive key={i} object={m.m} />)}
    </>
  );
};
const PorchBeat: React.FC = () => { const C = useClips(); return C ? <Canvas3D bg="#a9cdee"><PorchScene C={C} /></Canvas3D> : null; };
const PorchOverlay: React.FC = () => {
  const f = useCurrentFrame();
  const p = porchPose(f);
  return (
    <AbsoluteFill>
      <Tag at={project(new THREE.Vector3(0, 2.75, 1.3), p)} text="Soekarno" show={clamp01((f - 18) / 12)} />
      <Tag at={project(new THREE.Vector3(-0.55, flagY(f) + 0.7, 3.4), p)} text="Sang Merah Putih" color="#ffd23f" show={clamp01((f - 70) / 12)} />
      <SceneCard n={3} when="17 Agustus 1945 · 10.00" where="Jl. Pegangsaan Timur 56, Jakarta" what="Proklamasi dibacakan, lalu bendera Merah Putih dikibarkan." />
    </AbsoluteFill>
  );
};

// ================= composition =================
const len = (k: keyof typeof S) => S[k][1] - S[k][0];
export const Proclamation3DTest: React.FC = () => (
  <AbsoluteFill style={{ background: "#05080f" }}>
    <Sequence from={S.road[0]} durationInFrames={len("road")}><Fade len={len("road")} first><RoadBeat /><RoadOverlay /></Fade></Sequence>
    <Sequence from={S.room[0]} durationInFrames={len("room")}><Fade len={len("room")}><RoomBeat /><RoomOverlay /></Fade></Sequence>
    <Sequence from={S.porch[0]} durationInFrames={len("porch")}><Fade len={len("porch")} last><PorchBeat /><PorchOverlay /></Fade></Sequence>
  </AbsoluteFill>
);
