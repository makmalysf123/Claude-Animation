// Format test: one short that combines the three references (see docs/style-references/):
//   A hook on a 3D globe (map storytelling)  ->  B fly-in to a real map with a drawn line + pins (map storytelling)
//   C cut-away reconstruction with a mannequin (3D news reconstruction)  ->  D data cards + verdict (Seanomics-style data layer)
// Topic: the Wallace Line. ALL NUMBERS ARE SAMPLE DATA (marked on screen). Heavy effects are off for speed.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Easing, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame } from "remotion";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { BALI, COL, LOMBOK, P, WALLACE, globeTexture, regionLand, yawFor } from "./geo";

export const W = 1080, H = 1920, FPS = 30;
export const FORMAT_TEST_FRAMES = 420;
const BEAT = { A: [0, 105], B: [90, 225], C: [210, 330], D: [315, 420] } as const;
const XF = 15; // crossfade frames between beats

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => Easing.inOut(Easing.cubic)(clamp01(x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const FONT = "'Avenir Next', 'Helvetica Neue', Arial, sans-serif";

// ---------- camera helpers (pure functions of the frame, shared by 3D and the DOM labels) ----------
type Pose = { pos: THREE.Vector3; target: THREE.Vector3; fov: number };
const SetCam: React.FC<{ pose: Pose }> = ({ pose }) => {
  const { camera } = useThree();
  const c = camera as THREE.PerspectiveCamera;
  c.position.copy(pose.pos); c.lookAt(pose.target); c.fov = pose.fov; c.near = 0.05; c.far = 800; c.updateProjectionMatrix();
  return null;
};
const project = (p: THREE.Vector3, pose: Pose) => {
  const cam = new THREE.PerspectiveCamera(pose.fov, W / H, 0.05, 800);
  cam.position.copy(pose.pos); cam.lookAt(pose.target); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const v = p.clone().project(cam);
  return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H, ok: v.z < 1 };
};

const Canvas3D: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThreeCanvas flat width={W} height={H} camera={{ fov: 40, near: 0.05, far: 800 }} style={{ background: COL.bg }}>
    {children}
  </ThreeCanvas>
);

// Fade a whole beat in/out at its edges
const Beat: React.FC<{ len: number; first?: boolean; last?: boolean; children: React.ReactNode }> = ({ len, first, last, children }) => {
  const f = useCurrentFrame();
  const o = Math.min(first ? 1 : clamp01(f / XF), last ? 1 : clamp01((len - f) / XF));
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

// ---------- small UI pieces ----------
const Pill: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ children, color = COL.key, style }) => (
  <span style={{ display: "inline-block", padding: "8px 18px", borderRadius: 999, background: color, color: COL.ink, fontWeight: 800, fontSize: 26, letterSpacing: 2, ...style }}>{children}</span>
);
const rise = (f: number, at: number, dur = 14) => ({ opacity: clamp01((f - at) / dur), transform: `translateY(${(1 - ease((f - at) / dur)) * 40}px)` });

const Label: React.FC<{ at: { x: number; y: number; ok: boolean }; text: string; sub?: string; color: string; show: number }> = ({ at, text, sub, color, show }) =>
  !at.ok ? null : (
    <div style={{ position: "absolute", left: at.x, top: at.y, transform: `translate(-50%, -100%) translateY(${-28 - (1 - show) * 20}px)`, opacity: show, textAlign: "center", fontFamily: FONT }}>
      <div style={{ background: COL.ink, border: `3px solid ${color}`, color: COL.text, borderRadius: 16, padding: "10px 22px", fontSize: 40, fontWeight: 800, whiteSpace: "nowrap" }}>{text}</div>
      {sub ? <div style={{ color, fontSize: 26, fontWeight: 700, marginTop: 6 }}>{sub}</div> : null}
      <div style={{ width: 4, height: 28, background: color, margin: "0 auto" }} />
    </div>
  );

// Persistent chrome: chronology timeline (our signature), chapter tag, source, sample-data stamp
const YEARS = [{ y: "1854", t: 0.12 }, { y: "1856", t: 0.45 }, { y: "1863", t: 0.85 }];
const Chrome: React.FC = () => {
  const f = useCurrentFrame();
  const prog = interpolate(f, [0, 105, 225, 330, 420], [0.05, 0.12, 0.45, 0.62, 0.85], { extrapolateRight: "clamp" });
  const chapter = f < BEAT.C[0] ? "Garis tak terlihat" : f < BEAT.D[0] ? "Rekonstruksi 1856" : "Kesimpulan";
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: COL.text, pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 440, background: "linear-gradient(rgba(7,13,24,0.92) 55%, rgba(7,13,24,0))" }} />
      <div style={{ position: "absolute", left: 70, right: 70, top: 96 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 26, letterSpacing: 4, color: COL.dim, fontWeight: 700 }}>KRONOLOGI</div>
          <Pill color="#ffd23f" style={{ fontSize: 22, padding: "6px 14px" }}>DATA CONTOH</Pill>
        </div>
        <div style={{ position: "relative", height: 8, borderRadius: 4, background: "rgba(255,255,255,0.14)" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${prog * 100}%`, borderRadius: 4, background: COL.key }} />
          {YEARS.map((m) => (
            <div key={m.y} style={{ position: "absolute", left: `${m.t * 100}%`, top: -9 }}>
              <div style={{ width: 26, height: 26, borderRadius: 13, transform: "translateX(-50%)", background: prog >= m.t ? COL.key : "#2a3447", border: `4px solid ${COL.bg}` }} />
              <div style={{ position: "absolute", left: 0, top: 34, transform: "translateX(-50%)", fontSize: 26, fontWeight: 700, color: prog >= m.t ? COL.text : COL.dim }}>{m.y}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 78, display: "flex", alignItems: "center", gap: 18 }}>
          <Pill>BAB 1</Pill>
          <span style={{ fontSize: 34, fontWeight: 700 }}>{chapter}</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 70, bottom: 120, fontSize: 24, color: COL.dim }}>Sumber: contoh untuk tes format (bukan data asli)</div>
    </AbsoluteFill>
  );
};

// ================= A. HOOK: globe =================
const STARS = (() => { const g = new THREE.BufferGeometry(); const n = 900, a = new Float32Array(n * 3); let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let i = 0; i < n; i++) { const u = r() * 2 - 1, t = r() * Math.PI * 2, R = 120; a[i * 3] = R * Math.sqrt(1 - u * u) * Math.cos(t); a[i * 3 + 1] = R * u; a[i * 3 + 2] = R * Math.sqrt(1 - u * u) * Math.sin(t); } g.setAttribute("position", new THREE.BufferAttribute(a, 3)); return g; })();
const globePose = (f: number): Pose => {
  const z = lerp(4.2, 2.05, ease((f - 20) / 85));
  return { pos: new THREE.Vector3(0, 0.25 * (1 - ease(f / 105)), z), target: new THREE.Vector3(0, -0.05, 0), fov: 38 };
};
const GlobeScene: React.FC = () => {
  const f = useCurrentFrame();
  const tex = useMemo(() => globeTexture(), []);
  const spin = yawFor(lerp(95, 117, ease(f / 95)));
  const tilt = THREE.MathUtils.degToRad(lerp(8, -4, ease(f / 95)));
  return (
    <>
      <SetCam pose={globePose(f)} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[-3, 2, 4]} intensity={1.6} />
      <points geometry={STARS}><pointsMaterial color="#9fb3d1" size={0.35} sizeAttenuation /></points>
      <group rotation={[tilt, spin, 0]}>
        <mesh><sphereGeometry args={[1, 128, 96]} /><meshStandardMaterial map={tex} roughness={1} /></mesh>
      </group>
      <mesh><sphereGeometry args={[1.045, 64, 48]} /><meshBasicMaterial color="#5fa8ff" transparent opacity={0.12} side={THREE.BackSide} /></mesh>
    </>
  );
};
const HookText: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: COL.text, justifyContent: "flex-end", padding: "0 80px 430px" }}>
      <div style={{ ...rise(f, 8), fontSize: 30, letterSpacing: 5, color: COL.key, fontWeight: 800, marginBottom: 18 }}>PERNAH KEPIKIRAN?</div>
      <div style={{ ...rise(f, 14), fontSize: 92, lineHeight: 1.04, fontWeight: 800 }}>
        Kenapa harimau tak pernah sampai ke <span style={{ color: COL.key }}>Lombok</span>?
      </div>
    </AbsoluteFill>
  );
};

// ================= B / D. MAP =================
const mapPose = (mode: "zoom" | "overview", f: number): Pose => {
  if (mode === "zoom") {
    const t = ease((f - 10) / 110);
    const tgt = new THREE.Vector3().lerpVectors(P(117.5, -5.0), P(115.75, -8.55), t);
    const h = lerp(26, 4.2, t), back = lerp(13, 3.0, t);
    return { pos: tgt.clone().add(new THREE.Vector3(0, h, back)), target: tgt, fov: 40 };
  }
  const tgt = P(118.6, -2.2 + 0.4 * ease(f / 105));
  const h = lerp(31, 29, ease(f / 105));
  return { pos: tgt.clone().add(new THREE.Vector3(0, h, h * 0.5)), target: tgt, fov: 40 };
};
const wallaceCurve = new THREE.CatmullRomCurve3(WALLACE.map(([lo, la]) => P(lo, la, 0.14)), false, "catmullrom", 0.2);
const MapScene: React.FC<{ mode: "zoom" | "overview" }> = ({ mode }) => {
  const f = useCurrentFrame();
  const land = useMemo(() => regionLand(), []);
  const camH = mapPose(mode, f).pos.y;
  const rad = 0.0028 * camH + 0.012; // keep the line a similar on-screen width at every zoom
  const tube = useMemo(() => new THREE.TubeGeometry(wallaceCurve, 400, rad, 10, false), [rad]);
  const glow = useMemo(() => new THREE.TubeGeometry(wallaceCurve, 400, rad * 2.8, 10, false), [rad]);
  const grid = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let lo = 92; lo <= 144; lo += 2) pts.push(P(lo, -16, 0.001), P(lo, 22, 0.001));
    for (let la = -16; la <= 22; la += 2) pts.push(P(92, la, 0.001), P(144, la, 0.001));
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);
  const draw = mode === "zoom" ? clamp01((f - 20) / 60) : 1;
  const segs = Math.floor(draw * 400) * 10 * 6;
  tube.setDrawRange(0, segs); glow.setDrawRange(0, segs);
  const sideT = mode === "zoom" ? 0 : ease(f / 40);
  const islandT = mode === "zoom" ? ease((f - 50) / 20) : 1;
  const c = (base: string, tint: string, t: number) => new THREE.Color(base).lerp(new THREE.Color(tint), t);
  return (
    <>
      <SetCam pose={mapPose(mode, f)} />
      <hemisphereLight args={["#dfe8ff", "#1a2233", 0.9]} />
      <directionalLight position={[-8, 20, 10]} intensity={1.3} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}><planeGeometry args={[400, 400]} /><meshBasicMaterial color={COL.ocean} /></mesh>
      <lineSegments geometry={grid}><lineBasicMaterial color="#ffffff" transparent opacity={0.06} /></lineSegments>
      <mesh geometry={land.west}><meshStandardMaterial color={c(COL.land, COL.west, sideT * 0.85)} roughness={1} /></mesh>
      <mesh geometry={land.east}><meshStandardMaterial color={c(COL.land, COL.east, sideT * 0.85)} roughness={1} /></mesh>
      <mesh geometry={land.bali}><meshStandardMaterial color={c(COL.land, COL.west, Math.max(islandT, sideT))} roughness={1} /></mesh>
      <mesh geometry={land.lombok}><meshStandardMaterial color={c(COL.land, COL.east, Math.max(islandT, sideT))} roughness={1} /></mesh>
      <mesh geometry={glow}><meshBasicMaterial color={COL.key} transparent opacity={0.25} depthWrite={false} /></mesh>
      <mesh geometry={tube}><meshBasicMaterial color={COL.key} /></mesh>
    </>
  );
};
const MapOverlayZoom: React.FC = () => {
  const f = useCurrentFrame();
  const pose = mapPose("zoom", f);
  const bali = project(P(BALI[0], BALI[1], 0.1), pose), lombok = project(P(LOMBOK[0], LOMBOK[1], 0.1), pose);
  const line = project(P(115.78, -6.5, 0.14), pose);
  const s1 = ease((f - 50) / 14), s2 = ease((f - 58) / 14);
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: COL.text }}>
      <Label at={bali} text="Bali" sub="ASIA" color={COL.west} show={s1} />
      <Label at={lombok} text="Lombok" sub="AUSTRALIA" color={COL.east} show={s2} />
      {line.ok && f < 70 ? <div style={{ position: "absolute", left: line.x + 26, top: line.y - 30, opacity: clamp01((f - 30) / 12) * clamp01((70 - f) / 10), fontSize: 34, fontWeight: 800, color: COL.key }}>Garis Wallace</div> : null}
      <div style={{ position: "absolute", left: 70, right: 70, bottom: 330, ...rise(f, 78) }}>
        <div style={{ background: "rgba(11,19,34,0.92)", border: "2px solid rgba(255,255,255,0.12)", borderRadius: 28, padding: "30px 40px" }}>
          <div style={{ fontSize: 28, letterSpacing: 3, color: COL.dim, fontWeight: 700 }}>JARAK BALI ↔ LOMBOK</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
            <div style={{ fontSize: 150, fontWeight: 800, color: COL.text, lineHeight: 1.05 }}>35</div>
            <div style={{ fontSize: 56, fontWeight: 800, color: COL.key }}>km*</div>
          </div>
          <div style={{ fontSize: 30, color: COL.dim }}>Dekat, tapi hewannya sangat berbeda.</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ================= C. RECONSTRUCTION (cut-away diorama + mannequin) =================
type Man = { model: THREE.Group; idle: THREE.AnimationClip; wave: THREE.AnimationClip };
let manP: Promise<Man> | null = null;
const loadMan = () => {
  if (!manP) {
    const loader = new FBXLoader();
    manP = Promise.all(["idle", "waving"].map((n) => loader.loadAsync(staticFile(`mixamo/${n}.fbx`)))).then(([a, b]) => {
      const clip = (o: THREE.Group) => {
        const c = [...o.animations].sort((x, y) => y.duration - x.duration)[0].clone(); // real take, not the empty "Take 001"
        const hips = c.tracks.find((t) => /Hips\.position$/.test(t.name));
        if (hips) { const v = hips.values, n = v.length / 3; for (let k = 1; k < n; k++) { v[k * 3] = v[0]; v[k * 3 + 2] = v[2]; } }
        return c;
      };
      const model = a;
      // mannequin look: one flat colour, no face or clothing texture
      const mat = new THREE.MeshStandardMaterial({ color: COL.key, roughness: 0.55 });
      model.traverse((o) => { const m = o as THREE.SkinnedMesh; if (m.isMesh) { m.material = mat; m.frustumCulled = false; } });
      model.updateMatrixWorld(true);
      const top = model.getObjectByName("mixamorigHeadTop_End") ?? model.getObjectByName("mixamorigHead");
      model.scale.setScalar(1.78 / Math.max(1e-3, top ? top.getWorldPosition(new THREE.Vector3()).y : 180));
      return { model, idle: clip(a), wave: clip(b) };
    });
  }
  return manP;
};
const useMan = () => {
  const [m, setM] = useState<Man | null>(null);
  const [h] = useState(() => delayRender("mannequin", { timeoutInMilliseconds: 300000 }));
  useEffect(() => { loadMan().then((x) => { setM(x); continueRender(h); }); }, [h]);
  return m;
};
const dioPose = (f: number): Pose => {
  const a = THREE.MathUtils.degToRad(lerp(32, 18, ease(f / 120)));
  const r = lerp(25, 22.5, ease(f / 120));
  const tgt = new THREE.Vector3(0, -1.0, 0);
  return { pos: new THREE.Vector3(Math.sin(a) * r, 5.0, Math.cos(a) * r), target: tgt, fov: 40 };
};
const block = (top: string) => [COL.landSide, COL.landSide, top, COL.landSide, "#8f8266", COL.landSide].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
const Diorama: React.FC<{ man: Man }> = ({ man }) => {
  const f = useCurrentFrame();
  const mixer = useMemo(() => new THREE.AnimationMixer(man.model), [man]);
  const idle = useMemo(() => { const x = mixer.clipAction(man.idle); x.play(); return x; }, [mixer, man]);
  const wave = useMemo(() => { const x = mixer.clipAction(man.wave); x.play(); return x; }, [mixer, man]);
  const w = ease((f - 45) / 10);
  idle.time = (f / FPS) % man.idle.duration; idle.setEffectiveWeight(1 - w);
  wave.time = Math.min(Math.max(0, (f - 45) / FPS), man.wave.duration - 1e-3); wave.setEffectiveWeight(w);
  mixer.update(0);
  man.model.position.set(-3.1, 0, 0.6); man.model.rotation.y = Math.PI / 2 - 0.35;
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(3, 4.3, 4)), []);
  const pulse = 0.16 + 0.08 * Math.sin(f / 6);
  const glowS = ease((f - 25) / 20);
  return (
    <>
      <SetCam pose={dioPose(f)} />
      <hemisphereLight args={["#e6eeff", "#202838", 0.85]} />
      <directionalLight position={[6, 12, 8]} intensity={1.5} />
      <mesh position={[0, -5.6, 0]}><boxGeometry args={[60, 0.2, 60]} /><meshBasicMaterial color={COL.bg} /></mesh>
      <mesh position={[-3.0, -2.25, 0]} material={block(COL.west)}><boxGeometry args={[3, 4.5, 4]} /></mesh>
      <mesh position={[3.0, -2.25, 0]} material={block(COL.east)}><boxGeometry args={[3, 4.5, 4]} /></mesh>
      <mesh position={[0, -4.75, 0]}><boxGeometry args={[3, 0.5, 4]} /><meshStandardMaterial color="#6f6450" roughness={1} /></mesh>
      {/* X-ray water: see-through volume + bright edges */}
      <mesh position={[0, -2.35, 0]}><boxGeometry args={[3, 4.3, 4]} /><meshStandardMaterial color="#2f8fe0" transparent opacity={0.32} depthWrite={false} /></mesh>
      <lineSegments geometry={edges} position={[0, -2.35, 0]}><lineBasicMaterial color="#9fd4ff" /></lineSegments>
      {/* depth gauge */}
      <mesh position={[0.6, -2.35, 2.02]}><boxGeometry args={[0.06, 4.3, 0.02]} /><meshBasicMaterial color={COL.text} /></mesh>
      {/* highlight sphere on the strait */}
      <mesh position={[0, -2.2, 0]} scale={0.2 + 0.8 * glowS}><sphereGeometry args={[1.8, 48, 32]} /><meshBasicMaterial color={COL.key} transparent opacity={pulse * glowS} depthWrite={false} /></mesh>
      <primitive object={man.model} />
    </>
  );
};
const DioramaBeat: React.FC = () => {
  const man = useMan(); // load before the canvas mounts: the canvas only redraws on frame changes
  return man ? <Canvas3D><Diorama man={man} /></Canvas3D> : null;
};
const DioramaOverlay: React.FC = () => {
  const f = useCurrentFrame();
  const pose = dioPose(f);
  const west = project(new THREE.Vector3(-3.0, -2.6, 2.0), pose), east = project(new THREE.Vector3(3.0, -2.6, 2.0), pose);
  const depth = project(new THREE.Vector3(0.6, -3.7, 2.02), pose), man = project(new THREE.Vector3(-3.1, 2.0, 0.6), pose);
  const s = (at: number) => ease((f - at) / 14);
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: COL.text }}>
      <Label at={man} text="Wallace" sub="1856" color={COL.key} show={s(10)} />
      {[{ p: west, e: "🐅", t: "Asia", c: COL.west, at: 30 }, { p: east, e: "🦘", t: "Australia", c: COL.east, at: 40 }].map((k) => (
        <div key={k.t} style={{ position: "absolute", left: k.p.x, top: k.p.y, transform: `translate(-50%, -50%) translateY(${(1 - s(k.at)) * 30}px)`, opacity: s(k.at), textAlign: "center" }}>
          <div style={{ fontSize: 110 }}>{k.e}</div>
          <Pill color={k.c}>{k.t.toUpperCase()}</Pill>
        </div>
      ))}
      {depth.ok ? (
        <div style={{ position: "absolute", left: depth.x - 22, top: depth.y, transform: "translate(-100%, -50%)", textAlign: "right", opacity: s(35), fontWeight: 800 }}>
          <div style={{ fontSize: 64, color: "#bfe3ff" }}>±250 m*</div>
          <div style={{ fontSize: 26, color: COL.dim }}>laut dalam</div>
        </div>
      ) : null}
      <div style={{ position: "absolute", right: 70, bottom: 330, fontSize: 26, color: COL.dim, textAlign: "right" }}>REKONSTRUKSI · ILUSTRASI<br />bukan skala sebenarnya</div>
    </AbsoluteFill>
  );
};

// ================= D. DATA + VERDICT =================
const VerdictOverlay: React.FC = () => {
  const f = useCurrentFrame();
  const card = (c: string): React.CSSProperties => ({ flex: 1, background: "rgba(11,19,34,0.94)", borderRadius: 28, padding: "28px 30px", borderTop: `8px solid ${c}` });
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: COL.text, justifyContent: "flex-end", padding: "0 70px 330px" }}>
      <div style={{ display: "flex", gap: 24, ...rise(f, 30) }}>
        <div style={card(COL.west)}>
          <div style={{ fontSize: 26, letterSpacing: 3, color: COL.west, fontWeight: 800 }}>BARAT</div>
          <div style={{ fontSize: 46, fontWeight: 800, margin: "6px 0 10px" }}>🐅 Asia</div>
          <div style={{ fontSize: 30, color: COL.dim, lineHeight: 1.35 }}>harimau<br />badak<br />orangutan</div>
        </div>
        <div style={card(COL.east)}>
          <div style={{ fontSize: 26, letterSpacing: 3, color: COL.east, fontWeight: 800 }}>TIMUR</div>
          <div style={{ fontSize: 46, fontWeight: 800, margin: "6px 0 10px" }}>🦘 Australia</div>
          <div style={{ fontSize: 30, color: COL.dim, lineHeight: 1.35 }}>kakatua<br />kuskus<br />komodo*</div>
        </div>
      </div>
      <div style={{ marginTop: 26, background: COL.key, color: COL.ink, borderRadius: 28, padding: "26px 34px", fontSize: 50, fontWeight: 800, lineHeight: 1.1, ...rise(f, 50) }}>
        Laut dalam = tembok tak terlihat bagi hewan darat.
      </div>
    </AbsoluteFill>
  );
};

// ================= composition =================
const len = (b: readonly [number, number]) => b[1] - b[0];
export const FormatTest: React.FC = () => (
  <AbsoluteFill style={{ background: COL.bg }}>
    <Sequence from={BEAT.A[0]} durationInFrames={len(BEAT.A)}>
      <Beat len={len(BEAT.A)} first><Canvas3D><GlobeScene /></Canvas3D><HookText /></Beat>
    </Sequence>
    <Sequence from={BEAT.B[0]} durationInFrames={len(BEAT.B)}>
      <Beat len={len(BEAT.B)}><Canvas3D><MapScene mode="zoom" /></Canvas3D><MapOverlayZoom /></Beat>
    </Sequence>
    <Sequence from={BEAT.C[0]} durationInFrames={len(BEAT.C)}>
      <Beat len={len(BEAT.C)}><DioramaBeat /><DioramaOverlay /></Beat>
    </Sequence>
    <Sequence from={BEAT.D[0]} durationInFrames={len(BEAT.D)}>
      <Beat len={len(BEAT.D)} last><Canvas3D><MapScene mode="overview" /></Canvas3D><VerdictOverlay /></Beat>
    </Sequence>
    <Chrome />
  </AbsoluteFill>
);
