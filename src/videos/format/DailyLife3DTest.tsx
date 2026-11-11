// 3D test #2: everyday life, three scenes with three lights. Fictional story "Sehari bersama Budi".
//   1) morning kampung lane: Budi walks to work past houses, a neighbour waves (low warm sun, long shadows)
//   2) noon at a warung: market stalls, seller and customers (high sun, short shadows, slow orbit)
//   3) dusk at a bus stop: people waiting under street lights, a bus pulls in and stops (orange-purple sky)
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Easing, Sequence, useCurrentFrame } from "remotion";
import { makeProp } from "../bridge/props";
import { Canvas3D, Clips, Fade, Pose, SetCam, Tag, makeMan, poseMan, project, std, useClips } from "./Proclamation3DTest";

const FPS = 30, KEY = "#ff5d73", GREY = "#a9aeb8";
const FONT = "'Avenir Next', 'Helvetica Neue', Arial, sans-serif";
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => Easing.inOut(Easing.cubic)(clamp01(x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const S = { morning: [0, 150], noon: [150, 300], dusk: [300, 450] } as const;
export const DAILY_FRAMES = 450;

const Card: React.FC<{ n: number; when: string; where: string; what: string }> = ({ n, when, where, what }) => {
  const f = useCurrentFrame();
  const a = clamp01((f - 6) / 12);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", fontFamily: FONT, color: "#fff" }}>
      <div style={{ position: "absolute", inset: 0, bottom: "auto", height: 360, background: "linear-gradient(rgba(8,14,26,0.75), rgba(8,14,26,0))" }} />
      <div style={{ position: "absolute", left: 60, top: 96, opacity: a, transform: `translateY(${(1 - a) * 20}px)` }}>
        <span style={{ background: KEY, color: "#0b1322", fontWeight: 800, fontSize: 24, padding: "6px 14px", borderRadius: 999, letterSpacing: 2 }}>ADEGAN {n}/3</span>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 2, color: "#ffe2b8", marginTop: 18 }}>{when.toUpperCase()}</div>
        <div style={{ fontSize: 50, fontWeight: 800, lineHeight: 1.1, marginTop: 6, textShadow: "0 3px 14px rgba(0,0,0,0.55)" }}>{where}</div>
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, bottom: 300, opacity: clamp01((f - 24) / 12), background: "rgba(11,19,34,0.86)", borderRadius: 22, padding: "22px 28px", fontSize: 38, fontWeight: 700, lineHeight: 1.25 }}>{what}</div>
      <div style={{ position: "absolute", left: 60, bottom: 120, fontSize: 22, color: "rgba(255,255,255,0.65)" }}>Cerita fiktif · tes animasi 3D</div>
    </AbsoluteFill>
  );
};
const house = (x: number, z: number, wall: string, roof: string, w = 4, d = 3.5) => (
  <group key={`${x}${z}`} position={[x, 0, z]}>
    <mesh position={[0, 1.4, 0]} castShadow receiveShadow><boxGeometry args={[w, 2.8, d]} /><primitive object={std(wall)} attach="material" /></mesh>
    <mesh position={[0, 3.3, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, (d / w) * 1.05]} castShadow><coneGeometry args={[w * 0.78, 1.2, 4]} /><primitive object={std(roof, 0.8, { flatShading: true })} attach="material" /></mesh>
    <mesh position={[0, 1.0, d / 2 + 0.01]}><boxGeometry args={[0.9, 2.0, 0.04]} /><primitive object={std("#5b3b25")} attach="material" /></mesh>
    {[-1.2, 1.2].map((wx) => <mesh key={wx} position={[wx * (w / 4), 1.6, d / 2 + 0.01]}><boxGeometry args={[0.8, 0.7, 0.03]} /><meshStandardMaterial color="#2f4256" roughness={0.2} /></mesh>)}
  </group>
);

// ================= 1. MORNING LANE =================
const budiX = (f: number) => lerp(-7, 5, clamp01((f - 8) / 140));
const morningPose = (f: number): Pose => {
  const x = budiX(f);
  return { pos: new THREE.Vector3(x + 3.5, 3.4, 13.5), target: new THREE.Vector3(x + 0.8, 1.2, -0.6), fov: 40 };
};
const Morning: React.FC<{ C: Clips }> = ({ C }) => {
  const f = useCurrentFrame();
  const budi = useMemo(() => makeMan(C, KEY), [C]);
  const neigh = useMemo(() => makeMan(C, GREY, 0.4), [C]);
  budi.m.position.set(budiX(f), 0, 0.6); budi.m.rotation.y = Math.PI / 2; poseMan(budi, "walk", f / FPS);
  neigh.m.position.set(1.6, 0, -1.6); neigh.m.rotation.y = -0.4 + (f > 50 ? -0.4 : 0); poseMan(neigh, f > 50 && f < 130 ? "wave" : "idle", f > 50 ? (f - 50) / FPS : f / FPS);
  return (
    <>
      <SetCam p={morningPose(f)} />
      <hemisphereLight args={["#ffe6c7", "#5a6b4a", 0.7]} />
      <directionalLight position={[-14, 5, 6]} intensity={2.4} color="#ffcf94" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={10} shadow-camera-bottom={-10} shadow-bias={-0.0004} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[80, 40]} /><primitive object={std("#7a8f57")} attach="material" /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.6]} receiveShadow><planeGeometry args={[60, 2.6]} /><primitive object={std("#b8a88a", 0.95)} attach="material" /></mesh>
      {[[-9, "#e8d9b8", "#9b4b33"], [-4.2, "#cfe0d2", "#5a4a3a"], [0.6, "#f0d6cf", "#a3462f"], [5.4, "#dfe3f0", "#6b3a2a"], [10.2, "#efe4c4", "#8a3e2b"]].map(([x, w, r]) => house(x as number, -3.6, w as string, r as string))}
      {[-6.6, -1.8, 3.0, 7.8].map((x) => <mesh key={x} position={[x, 0.45, -1.6]} castShadow><boxGeometry args={[0.12, 0.9, 0.12]} /><primitive object={std("#e9e3d6")} attach="material" /></mesh>)}
      <primitive object={budi.m} /><primitive object={neigh.m} />
    </>
  );
};
const MorningOverlay: React.FC = () => {
  const f = useCurrentFrame(); const p = morningPose(f);
  return (
    <AbsoluteFill>
      <Tag at={project(new THREE.Vector3(budiX(f), 1.95, 0.6), p)} text="Budi" show={clamp01((f - 14) / 10)} />
      <Tag at={project(new THREE.Vector3(1.6, 2.45, -1.6), p)} text="Tetangga" color="#c9ced8" show={clamp01((f - 55) / 10) * (1 - clamp01((f - 135) / 10))} />
      <Card n={1} when="Pagi · 06.30" where="Berangkat kerja" what="Budi menyusuri gang kampung. Tetangga menyapa dari depan rumah." />
    </AbsoluteFill>
  );
};

// ================= 2. NOON WARUNG =================
const noonPose = (f: number): Pose => {
  const a = THREE.MathUtils.degToRad(lerp(-24, 16, ease(f / 150))), r = lerp(10.5, 9.5, ease(f / 150));
  return { pos: new THREE.Vector3(Math.sin(a) * r, 3.4, Math.cos(a) * r), target: new THREE.Vector3(0, 1.2, -0.6), fov: 40 };
};
const NOON_PEOPLE = [{ x: 0.2, z: 0.4, ry: Math.PI, c: KEY, clip: "idle" as const, label: "Budi" }, { x: -0.4, z: -1.9, ry: 0, c: "#c8b49a", clip: "idle" as const, label: "Penjual" },
  { x: 1.6, z: 0.9, ry: Math.PI + 0.5, c: GREY, clip: "idle" as const, label: "" }, { x: -1.9, z: 1.1, ry: Math.PI - 0.6, c: GREY, clip: "wave" as const, label: "" }];
const Noon: React.FC<{ C: Clips }> = ({ C }) => {
  const f = useCurrentFrame();
  const men = useMemo(() => NOON_PEOPLE.map((p, i) => makeMan(C, p.c, i * 0.57)), [C]);
  men.forEach((m, i) => { const p = NOON_PEOPLE[i]; m.m.position.set(p.x, 0, p.z); m.m.rotation.y = p.ry; poseMan(m, p.clip, f / FPS); });
  const set = useMemo(() => {
    const g = new THREE.Group();
    const place = (name: string, x: number, z: number, h: number, ry = 0) => {
      const o = makeProp(name)!; const b = new THREE.Box3().setFromObject(o); const s = h / (b.max.y - b.min.y);
      o.scale.setScalar(s); o.position.set(x, -b.min.y * s, z); o.rotation.y = ry;
      o.traverse((c) => { const m = c as THREE.Mesh; if (m.isMesh) { m.castShadow = m.receiveShadow = true; } });
      g.add(o);
    };
    place("stall-red", 0, -1.2, 2.8); place("stall-green", 4.2, -2.4, 2.8, -0.35); place("stall-bench", -2.6, -0.2, 0.75, 0.5); place("lantern", -4.0, -2.0, 2.6); place("cart", 3.8, 1.6, 1.4, -0.9);
    return g;
  }, []);
  return (
    <>
      <SetCam p={noonPose(f)} />
      <hemisphereLight args={["#e6f2ff", "#8a7a5a", 0.9]} />
      <directionalLight position={[3, 18, 4]} intensity={2.6} color="#fff6e6" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-10} shadow-bias={-0.0004} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[60, 60]} /><primitive object={std("#c9b48c", 0.95)} attach="material" /></mesh>
      {house(-1, -6.5, "#e9e0cf", "#7a3f2c", 12, 3)}
      <primitive object={set} />
      {men.map((m, i) => <primitive key={i} object={m.m} />)}
    </>
  );
};
const NoonOverlay: React.FC = () => {
  const f = useCurrentFrame(); const p = noonPose(f);
  return (
    <AbsoluteFill>
      {NOON_PEOPLE.filter((x) => x.label).map((x, i) => <Tag key={x.label} at={project(new THREE.Vector3(x.x, 1.95, x.z), p)} text={x.label} color={x.c === KEY ? KEY : "#c9ced8"} show={clamp01((f - 16 - i * 10) / 10)} />)}
      <Card n={2} when="Siang · 12.15" where="Makan siang di warung" what="Jam istirahat: warung tenda dekat kantor selalu ramai." />
    </AbsoluteFill>
  );
};

// ================= 3. DUSK BUS STOP =================
const busX = (f: number) => lerp(-30, -7.5, Easing.out(Easing.cubic)(clamp01((f - 40) / 70))); // stops beside the shelter, not in front of it
const duskPose = (f: number): Pose => {
  const t = ease(f / 150);
  return { pos: new THREE.Vector3(lerp(6, 4.5, t), 3.8, lerp(14, 12, t)), target: new THREE.Vector3(-0.8, 1.3, -0.8), fov: 40 };
};
const STOP_PEOPLE = [{ x: 1.0, z: -1.1, ry: -0.9, c: KEY, label: "Budi" }, { x: 2.2, z: -1.4, ry: -1.1, c: GREY, label: "" }, { x: -0.2, z: -1.5, ry: -1.3, c: GREY, label: "" }];
const Dusk: React.FC<{ C: Clips }> = ({ C }) => {
  const f = useCurrentFrame();
  const men = useMemo(() => STOP_PEOPLE.map((p, i) => makeMan(C, p.c, i * 0.81)), [C]);
  men.forEach((m, i) => { const p = STOP_PEOPLE[i]; m.m.position.set(p.x, 0.15, p.z); m.m.rotation.y = p.ry; poseMan(m, "idle", f / FPS); });
  const glow = 0.85 + 0.15 * Math.sin(f / 4);
  return (
    <>
      <SetCam p={duskPose(f)} />
      <hemisphereLight args={["#f6b48c", "#3a3150", 1.0]} />
      <directionalLight position={[-20, 6, 4]} intensity={1.4} color="#ff9b62" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={10} shadow-camera-bottom={-10} />
      <pointLight position={[3.8, 4.2, 0.6]} intensity={30} distance={14} decay={1.7} color="#ffd58a" castShadow />
      <pointLight position={[1, 2.6, -1.2]} intensity={8} distance={6} color="#cfe6ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[80, 40]} /><primitive object={std("#3b3f48", 0.6)} attach="material" /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 2.8]} receiveShadow><planeGeometry args={[80, 5.5]} /><primitive object={std("#2b2e35", 0.35, { metalness: 0.15 })} attach="material" /></mesh>
      {[-8, -4, 0, 4, 8].map((x) => <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, 2.8]}><planeGeometry args={[1.8, 0.12]} /><meshBasicMaterial color="#d9d2b8" /></mesh>)}
      <mesh position={[0, 0.07, -0.8]} receiveShadow><boxGeometry args={[16, 0.15, 3.0]} /><primitive object={std("#8a8478")} attach="material" /></mesh>
      {/* shelter */}
      <mesh position={[1, 2.9, -1.2]} castShadow><boxGeometry args={[4.6, 0.12, 2.0]} /><primitive object={std("#3d6b8a", 0.5)} attach="material" /></mesh>
      {[-1.1, 3.1].map((x) => <mesh key={x} position={[x, 1.5, -2.0]} castShadow><boxGeometry args={[0.1, 2.8, 0.1]} /><primitive object={std("#9aa3ad", 0.4, { metalness: 0.5 })} attach="material" /></mesh>)}
      <mesh position={[1, 1.5, -2.15]}><boxGeometry args={[4.2, 2.4, 0.04]} /><meshStandardMaterial color="#a9c7dd" transparent opacity={0.25} roughness={0.1} /></mesh>
      <mesh position={[1, 0.6, -1.8]} castShadow><boxGeometry args={[3.2, 0.1, 0.5]} /><primitive object={std("#6b4a30")} attach="material" /></mesh>
      {/* street lamp */}
      <mesh position={[3.8, 2.2, 0.6]}><cylinderGeometry args={[0.06, 0.09, 4.4, 10]} /><primitive object={std("#30343c", 0.5)} attach="material" /></mesh>
      <mesh position={[3.8, 4.35, 0.6]}><sphereGeometry args={[0.22, 16, 12]} /><meshBasicMaterial color="#fff0c8" /></mesh>
      <mesh position={[3.8, 4.35, 0.6]} scale={glow}><sphereGeometry args={[0.6, 16, 12]} /><meshBasicMaterial color="#ffd58a" transparent opacity={0.18} depthWrite={false} /></mesh>
      {/* bus */}
      <group position={[busX(f), 0, 3.2]}>
        <mesh position={[0, 1.7, 0]} castShadow><boxGeometry args={[9, 2.8, 2.5]} /><primitive object={std("#2f7d6a", 0.45)} attach="material" /></mesh>
        <mesh position={[0, 2.1, -1.26]}><boxGeometry args={[8.2, 1.0, 0.02]} /><meshStandardMaterial color="#ffe3a6" emissive="#ffcf7a" emissiveIntensity={0.9} /></mesh>
        <mesh position={[0, 2.1, 1.26]}><boxGeometry args={[8.2, 1.0, 0.02]} /><meshStandardMaterial color="#ffe3a6" emissive="#ffcf7a" emissiveIntensity={0.9} /></mesh>
        {[-3.2, 3.0].map((x) => [-1.2, 1.2].map((z) => <mesh key={`${x}${z}`} position={[x, 0.45, z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.5, 0.5, 0.35, 18]} /><meshStandardMaterial color="#111" /></mesh>))}
        {[0.8, -0.8].map((z) => <mesh key={z} position={[4.51, 0.9, z]}><sphereGeometry args={[0.15, 12, 10]} /><meshBasicMaterial color="#fff6d8" /></mesh>)}
      </group>
      {men.map((m, i) => <primitive key={i} object={m.m} />)}
    </>
  );
};
const DuskOverlay: React.FC = () => {
  const f = useCurrentFrame(); const p = duskPose(f);
  return (
    <AbsoluteFill>
      <Tag at={project(new THREE.Vector3(1.0, 2.1, -1.1), p)} text="Budi" show={clamp01((f - 14) / 10)} />
      <Card n={3} when="Sore · 17.40" where="Menunggu bus pulang" what="Lampu jalan mulai menyala. Bus terakhir akhirnya datang." />
    </AbsoluteFill>
  );
};

// ================= composition =================
const Beat3D: React.FC<{ bg: string; Scene: React.FC<{ C: Clips }> }> = ({ bg, Scene }) => { const C = useClips(); return C ? <Canvas3D bg={bg}><Scene C={C} /></Canvas3D> : null; };
const len = (k: keyof typeof S) => S[k][1] - S[k][0];
export const DailyLife3DTest: React.FC = () => (
  <AbsoluteFill style={{ background: "#05080f" }}>
    <Sequence from={S.morning[0]} durationInFrames={len("morning")}><Fade len={len("morning")} first><Beat3D bg="#f3c99a" Scene={Morning} /><MorningOverlay /></Fade></Sequence>
    <Sequence from={S.noon[0]} durationInFrames={len("noon")}><Fade len={len("noon")}><Beat3D bg="#9ccbf0" Scene={Noon} /><NoonOverlay /></Fade></Sequence>
    <Sequence from={S.dusk[0]} durationInFrames={len("dusk")}><Fade len={len("dusk")} last><Beat3D bg="#6b4a7a" Scene={Dusk} /><DuskOverlay /></Fade></Sequence>
  </AbsoluteFill>
);
