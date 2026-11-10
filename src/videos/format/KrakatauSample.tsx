// SAMPLE of the explainer format, third theme: "dramatic / nature" (charcoal, lava orange, ember, ash).
// Topic: the 1883 eruption of Krakatau. Story cards + timeline are the backbone; inserts:
//   map of the Sunda Strait with spreading pressure rings, 3D cut-away volcano (chamber -> eruption -> caldera),
//   3D tsunami height comparison (no people), globe with the ash haze.
// Facts are widely documented but still marked SAMPEL. Camera rule: hold still, only slow pushes (no constant pans).
import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame } from "remotion";
import { LocalProj, PL, globeTexture, landNear, yawFor } from "./geo";

const W = 1080, H = 1920;
const K = {
  bg: "#141012", panel: "rgba(32,24,22,0.94)", text: "#f6efe8", dim: "#a99d97", lava: "#ff6b1a", ember: "#ffb703",
  ash: "#8d8a8e", sea: "#1d4e57", seaDeep: "#0f2a30", land: "#3d3532", rock: "#5b4a41", rockDark: "#3e322c",
};
const HEAD = "Futura, 'Avenir Next', Arial, sans-serif";
const BODY = "'Avenir Next', 'Helvetica Neue', Arial, sans-serif";
const XF = 12;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => Easing.inOut(Easing.cubic)(clamp01(x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const B = {
  hook: [0, 120], map: [110, 300], timeline: [290, 480], volcano: [470, 690],
  numbers: [680, 820], tsunami: [810, 990], globe: [980, 1130], end: [1120, 1250],
} as const;
export const KRAKATAU_FRAMES = 1250;
type BeatK = keyof typeof B;
const len = (k: BeatK) => B[k][1] - B[k][0];

// ---------- shared ----------
type Pose = { pos: THREE.Vector3; target: THREE.Vector3; fov: number; near?: number };
const SetCam: React.FC<{ pose: Pose }> = ({ pose }) => {
  const c = useThree().camera as THREE.PerspectiveCamera;
  c.position.copy(pose.pos); c.lookAt(pose.target); c.fov = pose.fov; c.near = pose.near ?? 0.1; c.far = 2000; c.updateProjectionMatrix();
  return null;
};
const project = (p: THREE.Vector3, pose: Pose) => {
  const cam = new THREE.PerspectiveCamera(pose.fov, W / H, 0.1, 2000);
  cam.position.copy(pose.pos); cam.lookAt(pose.target); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const v = p.clone().project(cam);
  return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H, ok: v.z < 1 };
};
const Canvas3D: React.FC<{ children: React.ReactNode; bg?: string }> = ({ children, bg = K.bg }) => (
  <ThreeCanvas flat width={W} height={H} camera={{ fov: 40, near: 0.1, far: 2000 }} style={{ background: bg }}>{children}</ThreeCanvas>
);
const Beat: React.FC<{ k: BeatK; children: React.ReactNode }> = ({ k, children }) => {
  const f = useCurrentFrame();
  const o = Math.min(k === "hook" ? 1 : clamp01(f / XF), k === "end" ? 1 : clamp01((len(k) - f) / XF));
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};
const rise = (f: number, at: number, dur = 14): React.CSSProperties => ({ opacity: clamp01((f - at) / dur), transform: `translateY(${(1 - ease((f - at) / dur)) * 36}px)` });
const panel: React.CSSProperties = { color: K.text, background: K.panel, border: "2px solid rgba(255,183,3,0.18)", borderRadius: 20, padding: "28px 34px" };
const Kicker: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ children, color = K.ember, style }) => (
  <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 28, letterSpacing: 6, color, textTransform: "uppercase", ...style }}>{children}</div>
);
const Tag: React.FC<{ at: { x: number; y: number; ok: boolean }; text: string; color?: string; show: number; side?: "left" | "right" }> = ({ at, text, color = K.ember, show, side = "right" }) =>
  !at.ok ? null : (
    <div style={{ position: "absolute", left: at.x, top: at.y, transform: `translate(${side === "right" ? "0" : "-100%"}, -50%)`, opacity: show, display: "flex", alignItems: "center", gap: 10, flexDirection: side === "right" ? "row" : "row-reverse" }}>
      <div style={{ width: 46, height: 3, background: color }} />
      <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 30, color: K.text, background: "rgba(20,16,18,0.85)", border: `2px solid ${color}`, borderRadius: 10, padding: "6px 14px", whiteSpace: "nowrap", letterSpacing: 1 }}>{text}</div>
    </div>
  );

// ---------- chrome ----------
const MARKS = [{ d: "26 Agu", t: 0.05 }, { d: "27 Agu", t: 0.3 }, { d: "Sesudahnya", t: 0.6 }, { d: "1927", t: 0.8 }, { d: "2018", t: 0.96 }];
const SOURCES: [BeatK, string][] = [
  ["hook", ""], ["map", "Peta: Natural Earth · posisi perkiraan"], ["timeline", "Sumber: catatan sejarah umum (perlu dicek)"],
  ["volcano", "Ilustrasi · bukan skala"], ["numbers", "Sumber: catatan sejarah umum (perlu dicek)"], ["tsunami", "Ilustrasi perbandingan tinggi · bukan skala"],
  ["globe", "Ilustrasi"], ["end", ""],
];
const Chrome: React.FC = () => {
  const f = useCurrentFrame();
  const prog = interpolate(f, [0, 300, 480, 990, 1130, 1250], [0.03, 0.2, 0.42, 0.6, 0.72, 0.96], { extrapolateRight: "clamp" });
  const src = [...SOURCES].reverse().find(([k]) => f >= B[k][0])?.[1] ?? "";
  return (
    <AbsoluteFill style={{ color: K.text, pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, bottom: "auto", height: 420, background: `linear-gradient(rgba(20,16,18,0.95) 55%, rgba(20,16,18,0))` }} />
      <div style={{ position: "absolute", left: 70, right: 70, top: 96 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 30, letterSpacing: 5 }}><span style={{ color: K.lava }}>▲</span> KRAKATAU 1883</div>
          <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 20, letterSpacing: 3, color: K.bg, background: K.ember, borderRadius: 6, padding: "6px 12px" }}>SAMPEL</div>
        </div>
        <div style={{ position: "relative", height: 4, background: "rgba(255,255,255,0.14)", marginTop: 38 }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${prog * 100}%`, background: `linear-gradient(90deg, ${K.ember}, ${K.lava})` }} />
          {MARKS.map((m) => (
            <div key={m.d} style={{ position: "absolute", left: `${m.t * 100}%`, top: -8 }}>
              <div style={{ width: 20, height: 20, transform: "translateX(-50%) rotate(45deg)", background: prog >= m.t ? K.lava : "#3a302c", border: `3px solid ${K.bg}` }} />
              <div style={{ position: "absolute", left: 0, top: 26, transform: "translateX(-50%)", fontFamily: BODY, fontSize: 22, fontWeight: 700, whiteSpace: "nowrap", color: prog >= m.t ? K.text : K.dim }}>{m.d}</div>
            </div>
          ))}
        </div>
      </div>
      {src ? <div style={{ position: "absolute", left: 70, right: 70, bottom: 120, fontFamily: BODY, fontSize: 24, color: K.dim }}>{src}</div> : null}
    </AbsoluteFill>
  );
};

// ================= 1. HOOK =================
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const flash = clamp01(1 - Math.abs(f - 30) / 10) * 0.5;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 70%, #3a1a10 0%, ${K.bg} 65%)`, color: K.text, justifyContent: "center", padding: "0 80px" }}>
      <AbsoluteFill style={{ background: K.ember, opacity: flash }} />
      <Kicker style={rise(f, 2)}>27 Agustus 1883 · 10.02</Kicker>
      <div style={{ ...rise(f, 10), fontFamily: HEAD, fontWeight: 700, fontSize: 100, lineHeight: 1.0, margin: "22px 0 50px", textTransform: "uppercase" }}>
        Ledakan yang<br />terdengar<br /><span style={{ color: K.lava }}>4.800 km</span>
      </div>
      <div style={{ ...panel, ...rise(f, 40), fontFamily: BODY, fontSize: 36, lineHeight: 1.3 }}>
        Dari Selat Sunda sampai Pulau Rodrigues, dekat Mauritius. <span style={{ color: K.dim }}>Salah satu suara terkeras dalam sejarah.</span>
      </div>
    </AbsoluteFill>
  );
};

// ================= 2. MAP: Sunda Strait + pressure rings =================
const SUNDA: LocalProj = { lon0: 105.62, lat0: -6.05, k: 7 };
const PLACES = {
  krakatau: [105.423, -6.102] as [number, number], anyer: [105.88, -6.07] as [number, number],
  merak: [106.0, -5.93] as [number, number], lampung: [105.27, -5.45] as [number, number],
};
const mapPose = (f: number): Pose => {
  const tgt = PL(SUNDA, 105.64, lerp(-6.62, -6.66, ease(f / 180)));
  const h = lerp(30, 28, ease(f / 180));
  return { pos: tgt.clone().add(new THREE.Vector3(0, h, h * 0.3)), target: tgt, fov: 40 };
};
const MapScene: React.FC = () => {
  const f = useCurrentFrame();
  const land = useMemo(() => landNear(SUNDA, [102.5, -8.5, 108.5, -3.5], 0.08), []);
  const kp = PL(SUNDA, ...PLACES.krakatau, 0.1);
  const rings = [0, 22, 44].map((d) => { const t = clamp01((f - 50 - d) / 90); return { r: 0.2 + t * 9, o: (1 - t) * (t > 0 ? 0.9 : 0) }; });
  return (
    <>
      <SetCam pose={mapPose(f)} />
      <hemisphereLight args={["#ffe2c4", "#1a1412", 0.85]} />
      <directionalLight position={[-6, 14, 8]} intensity={1.1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}><planeGeometry args={[300, 300]} /><meshBasicMaterial color={K.seaDeep} /></mesh>
      <mesh geometry={land}><meshStandardMaterial color={K.land} roughness={1} /></mesh>
      {rings.map((r, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[kp.x, 0.15, kp.z]}><ringGeometry args={[r.r, r.r + 0.08, 96]} /><meshBasicMaterial color={K.lava} transparent opacity={r.o} depthWrite={false} /></mesh>
      ))}
      <mesh position={kp}><sphereGeometry args={[0.16, 24, 16]} /><meshBasicMaterial color={K.lava} /></mesh>
      <mesh position={kp} scale={1 + 0.25 * Math.sin(f / 5)}><sphereGeometry args={[0.32, 24, 16]} /><meshBasicMaterial color={K.lava} transparent opacity={0.25} depthWrite={false} /></mesh>
    </>
  );
};
const MapOverlay: React.FC = () => {
  const f = useCurrentFrame();
  const pose = mapPose(f);
  const at = (q: [number, number]) => project(PL(SUNDA, q[0], q[1], 0.12), pose);
  const lbl = (txt: string, q: [number, number], d: number, side?: "left" | "right", c?: string) => <Tag at={at(q)} text={txt} show={clamp01((f - d) / 12)} side={side} color={c} />;
  return (
    <AbsoluteFill>
      {lbl("SUMATRA", [105.05, -5.75], 6, "right", K.dim)}
      {lbl("JAWA", [106.15, -6.75], 10, "left", K.dim)}
      {lbl("KRAKATAU", PLACES.krakatau, 18, "left", K.lava)}
      {lbl("Anyer", PLACES.anyer, 30, "right")}
      {lbl("Merak", PLACES.merak, 36, "right")}
      <div style={{ position: "absolute", left: 70, right: 70, bottom: 290, ...panel, ...rise(f, 70) }}>
        <Kicker>Selat Sunda</Kicker>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 52, lineHeight: 1.1, marginTop: 8 }}>Gunung api di tengah jalur kapal tersibuk antara Sumatra dan Jawa.</div>
      </div>
    </AbsoluteFill>
  );
};

// ================= 3. TIMELINE =================
const EVENTS = [
  { d: "26 Agu · siang", t: "Letusan makin kuat, abu menutup langit" },
  { d: "27 Agu · 05.30", t: "Ledakan besar pertama" },
  { d: "27 Agu · 06.44", t: "Ledakan kedua" },
  { d: "27 Agu · 10.02", t: "Ledakan terbesar: pulau runtuh" },
  { d: "27 Agu · 10.41", t: "Ledakan keempat" },
  { d: "27 Agu", t: "Tsunami menghantam pesisir Selat Sunda" },
];
const Timeline: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: K.bg, color: K.text, padding: "400px 80px 0" }}>
      <Kicker style={{ ...rise(f, 0), color: K.dim, marginBottom: 30 }}>Jam demi jam</Kicker>
      {EVENTS.map((e, i) => {
        const at = 10 + i * 22, big = i === 3;
        return (
          <div key={e.d} style={{ display: "flex", gap: 26, marginBottom: 26, alignItems: "flex-start", ...rise(f, at) }}>
            <div style={{ width: 210, flexShrink: 0, fontFamily: HEAD, fontWeight: 700, fontSize: 26, letterSpacing: 1, color: big ? K.lava : K.ember, paddingTop: 8 }}>{e.d.toUpperCase()}</div>
            <div style={{ flex: 1, borderLeft: `4px solid ${big ? K.lava : "rgba(255,183,3,0.35)"}`, paddingLeft: 22, fontFamily: big ? HEAD : BODY, fontWeight: 700, fontSize: big ? 50 : 38, lineHeight: 1.15, color: big ? K.text : "#e6dcd5" }}>{e.t}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ================= 4. 3D VOLCANO: cut-away, eruption, collapse =================
// profile: concave volcano (x = radius, y = height). Split into base (below SPLIT) and top (sinks during collapse).
const PROFILE = (() => { const pts: THREE.Vector2[] = []; for (let i = 0; i <= 24; i++) { const t = i / 24; const r = lerp(7.0, 0.55, Math.pow(t, 0.62)); pts.push(new THREE.Vector2(r, t * 7.2 - 3.0)); } return pts; })();
const SPLIT = 1.8;
const profPart = (lo: number, hi: number) => PROFILE.filter((p) => p.y >= lo - 1e-6 && p.y <= hi + 1e-6);
const CHAMBER_Y = -4.6;
const lathe = (pts: THREE.Vector2[]) => new THREE.LatheGeometry([new THREE.Vector2(0, pts[0].y), ...pts, new THREE.Vector2(0, pts[pts.length - 1].y)], 64, Math.PI / 2, Math.PI); // back half
const capShape = (pts: THREE.Vector2[]) => { const s = new THREE.Shape(); s.moveTo(-pts[0].x, pts[0].y); for (const p of pts) s.lineTo(-p.x, p.y); for (const p of [...pts].reverse()) s.lineTo(p.x, p.y); s.closePath(); return new THREE.ShapeGeometry(s); };
const ASH_N = 260;
const volPose = (f: number): Pose => {
  const t = ease(f / 210);
  const tgt = new THREE.Vector3(0, lerp(-0.6, 0.2, t), 0); // aim low so the chamber stays above the card
  return { pos: new THREE.Vector3(lerp(8, 6.5, t), lerp(4.0, 3.5, t), lerp(40, 37, t)), target: tgt, fov: 40, near: 1 };
};
const VolcanoScene: React.FC = () => {
  const f = useCurrentFrame();
  const g = useMemo(() => {
    const base = profPart(-4, SPLIT), top = profPart(SPLIT, 10);
    return { baseL: lathe(base), topL: lathe(top), baseC: capShape(base), topC: capShape(top) };
  }, []);
  const ash = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: K.ash, roughness: 1 }), ASH_N);
    m.frustumCulled = false; return m;
  }, []);
  // phases: 0-40 calm, 40-140 eruption, 120-175 collapse
  const erupt = clamp01((f - 40) / 15), collapse = ease((f - 125) / 50);
  const dummy = new THREE.Object3D();
  const craterY = 4.2 - collapse * 2.4;
  for (let i = 0; i < ASH_N; i++) {
    const r1 = Math.sin(i * 12.9898) * 43758.5453, r2 = Math.sin(i * 78.233) * 12345.678, r3 = Math.sin(i * 39.425) * 9876.54;
    const fr = (x: number) => x - Math.floor(x);
    const birth = 40 + fr(r1) * 110, age = f - birth;
    if (age < 0 || f < 40) { dummy.scale.setScalar(0.0001); dummy.position.set(0, -50, 0); }
    else {
      const a = fr(r2) * Math.PI * 2, spread = 0.25 + age * 0.045 * (0.5 + fr(r3));
      const y = 4.2 + age * (0.16 + fr(r3) * 0.07);
      dummy.position.set(Math.cos(a) * spread, Math.min(y, 16 + fr(r1) * 3), Math.sin(a) * spread * 0.6 - 0.6);
      dummy.scale.setScalar(0.25 + Math.min(age, 80) * 0.018 * (0.6 + fr(r2)));
    }
    dummy.updateMatrix(); ash.setMatrixAt(i, dummy.matrix);
  }
  ash.instanceMatrix.needsUpdate = true;
  const glow = erupt * (1 - collapse * 0.6) * (0.75 + 0.25 * Math.sin(f / 3));
  return (
    <>
      <SetCam pose={volPose(f)} />
      <hemisphereLight args={["#ffd9c0", "#1a1412", 0.75]} />
      <directionalLight position={[8, 12, 10]} intensity={1.2} />
      <pointLight position={[0, 3.8, 0.5]} intensity={60 * glow} distance={14} color={K.lava} />
      {/* sea */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -20]}><planeGeometry args={[120, 40]} /><meshStandardMaterial color={K.sea} roughness={0.6} /></mesh>
      {/* cut face: water (0 to -3) and crust below the seabed */}
      <mesh position={[0, -1.5, -0.02]}><boxGeometry args={[60, 3, 0.02]} /><meshBasicMaterial color={K.seaDeep} /></mesh>
      <mesh position={[0, -6.5, -0.02]}><boxGeometry args={[60, 7, 0.02]} /><meshBasicMaterial color="#2a201c" /></mesh>
      <mesh position={[0, -3.0, 0]}><boxGeometry args={[60, 0.06, 0.03]} /><meshBasicMaterial color="#5b4a41" /></mesh>
      {/* volcano: back half + cut face */}
      <mesh geometry={g.baseL}><meshStandardMaterial color={K.rock} roughness={1} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={g.baseC} position={[0, 0, 0.01]}><meshStandardMaterial color={K.rockDark} roughness={1} /></mesh>
      <group position={[0, -collapse * 2.4, 0]} scale={[1 - collapse * 0.25, 1, 1 - collapse * 0.25]} visible={collapse < 0.98}>
        <mesh geometry={g.topL}><meshStandardMaterial color={K.rock} roughness={1} side={THREE.DoubleSide} /></mesh>
        <mesh geometry={g.topC} position={[0, 0, 0.01]}><meshStandardMaterial color={K.rockDark} roughness={1} /></mesh>
      </group>
      {/* magma chamber + conduit drawn on the cut face */}
      <mesh position={[0, CHAMBER_Y, 0.03]} scale={[2.4, 0.85, 0.01]}><sphereGeometry args={[1, 48, 24]} /><meshBasicMaterial color={K.lava} /></mesh>
      <mesh position={[0, (craterY + CHAMBER_Y) / 2, 0.03]}><boxGeometry args={[0.28, craterY - CHAMBER_Y, 0.01]} /><meshBasicMaterial color={erupt > 0 ? K.ember : "#7a3410"} /></mesh>
      {/* crater glow */}
      <mesh position={[0, craterY, 0]} scale={0.6 + glow * 0.9}><sphereGeometry args={[0.6, 24, 16]} /><meshBasicMaterial color={K.ember} transparent opacity={0.55 * glow} depthWrite={false} /></mesh>
      <primitive object={ash} />
    </>
  );
};
const VolcanoOverlay: React.FC = () => {
  const f = useCurrentFrame();
  const pose = volPose(f);
  const p = (x: number, y: number) => project(new THREE.Vector3(x, y, 0.05), pose);
  const phase = f < 40 ? 0 : f < 125 ? 1 : 2;
  const cap = [
    { k: "Di dalam gunung", t: "Dapur magma menumpuk tekanan." },
    { k: "10.02", t: "Tekanan lepas: kolom abu naik puluhan kilometer." },
    { k: "Lalu", t: "Gunung kosong di bawahnya, lalu runtuh ke laut: terbentuk kaldera." },
  ][phase];
  return (
    <AbsoluteFill>
      <Tag at={p(-2.5, CHAMBER_Y)} text="DAPUR MAGMA" color={K.lava} show={clamp01((f - 8) / 12)} side="left" />
      <Tag at={p(-1.2, 10)} text="KOLOM ABU" color={K.ash} show={clamp01((f - 70) / 12) * (1 - clamp01((f - 150) / 12))} side="left" />
      <Tag at={p(1.8, 2.0)} text="KALDERA" color={K.ember} show={clamp01((f - 165) / 12)} />
      <div key={phase} style={{ position: "absolute", left: 70, right: 70, bottom: 290, ...panel, ...rise(f, [10, 45, 130][phase]) }}>
        <Kicker>{cap.k}</Kicker>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 48, lineHeight: 1.12, marginTop: 8 }}>{cap.t}</div>
      </div>
    </AbsoluteFill>
  );
};

// ================= 5. BIG NUMBERS =================
const NUMS = [
  { n: "±36.000", u: "korban jiwa", s: "sebagian besar karena tsunami", c: K.lava },
  { n: "4.800", u: "km", s: "jarak suara ledakan terdengar", c: K.ember },
  { n: "±2/3", u: "pulau", s: "hilang runtuh ke laut", c: K.ember },
  { n: "Berkali-kali", u: "", s: "gelombang tekanan udara mengelilingi bumi", c: K.ash },
];
const Numbers: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: K.bg, color: K.text, padding: "400px 70px 0" }}>
      <Kicker style={{ ...rise(f, 0), color: K.dim, marginBottom: 26 }}>Dalam angka</Kicker>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
        {NUMS.map((x, i) => (
          <div key={x.s} style={{ ...panel, ...rise(f, 8 + i * 10), gridColumn: i === 0 || i === 3 ? "1 / span 2" : undefined, borderLeft: `8px solid ${x.c}` }}>
            <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: i === 0 ? 120 : i === 3 ? 64 : 84, lineHeight: 1, color: x.c }}>{x.n} <span style={{ fontSize: 40, color: K.text }}>{x.u}</span></div>
            <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: 30, color: K.dim, marginTop: 10 }}>{x.s}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ================= 6. TSUNAMI height comparison (3D, no people) =================
const waveShape = (() => {
  const s = new THREE.Shape(); s.moveTo(-40, 0); s.lineTo(-40, 6);
  s.bezierCurveTo(-26, 8, -14, 14, -6, 24); s.bezierCurveTo(-3, 28, 1, 30, 3, 28.5); s.bezierCurveTo(5, 27, 4.5, 24, 2.5, 23);
  s.bezierCurveTo(5, 18, 7, 8, 9, 0); s.closePath(); return s;
})();
const tsuPose = (f: number): Pose => {
  const t = ease(f / 180);
  return { pos: new THREE.Vector3(lerp(16, 14, t), lerp(16, 14, t), lerp(104, 96, t)), target: new THREE.Vector3(10, 12, 0), fov: 40, near: 2 };
};
const TsunamiScene: React.FC = () => {
  const f = useCurrentFrame();
  const waveGeo = useMemo(() => new THREE.ExtrudeGeometry(waveShape, { depth: 36, bevelEnabled: false }), []);
  const x = lerp(-30, -3, ease((f - 10) / 120)); // approaches, then holds before the shore
  const rise3 = ease((f - 10) / 60);
  const houses = [[16, 3], [20, -6], [24, 6], [28, -2], [32, 8]];
  const palms = [[14, -8], [19, 10], [26, 12], [30, -10]];
  return (
    <>
      <SetCam pose={tsuPose(f)} />
      <hemisphereLight args={["#ffe6cf", "#1a1412", 0.8]} />
      <directionalLight position={[20, 40, 30]} intensity={1.3} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-20, 0, 0]}><planeGeometry args={[120, 60]} /><meshStandardMaterial color={K.sea} roughness={0.5} /></mesh>
      <mesh position={[30, -1, 0]}><boxGeometry args={[36, 2, 60]} /><meshStandardMaterial color="#6b5a46" roughness={1} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[30, 0.02, 0]}><planeGeometry args={[36, 60]} /><meshStandardMaterial color="#8b7a52" roughness={1} /></mesh>
      {houses.map(([hx, hz]) => (
        <group key={`${hx}${hz}`} position={[hx, 0, hz]}>
          <mesh position={[0, 1.5, 0]}><boxGeometry args={[4, 3, 3.5]} /><meshStandardMaterial color="#d8cbb5" roughness={1} /></mesh>
          <mesh position={[0, 4, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 0.85]}><coneGeometry args={[3.2, 2, 4]} /><meshStandardMaterial color="#8a4a2e" roughness={1} flatShading /></mesh>
        </group>
      ))}
      {palms.map(([px, pz]) => (
        <group key={`${px}${pz}`} position={[px, 0, pz]}>
          <mesh position={[0, 6, 0]} rotation={[0, 0, 0.08]}><cylinderGeometry args={[0.25, 0.4, 12, 8]} /><meshStandardMaterial color="#7a5c3c" /></mesh>
          <mesh position={[0.5, 12.3, 0]} scale={[1, 0.45, 1]}><sphereGeometry args={[2.6, 12, 8]} /><meshStandardMaterial color="#3f6b3a" flatShading /></mesh>
        </group>
      ))}
      <group position={[x, 0, -18]} scale={[1, 0.15 + 0.85 * rise3, 1]}>
        <mesh geometry={waveGeo}><meshStandardMaterial color="#2c7f8c" roughness={0.35} transparent opacity={0.92} /></mesh>
      </group>
      {/* height gauge in front of the wave */}
      <mesh position={[x + 6, 15, 19]} renderOrder={10}><boxGeometry args={[0.35, 30, 0.1]} /><meshBasicMaterial color={K.text} depthTest={false} transparent opacity={rise3} /></mesh>
      <mesh position={[16, 2.5, 19]} renderOrder={10}><boxGeometry args={[0.35, 5, 0.1]} /><meshBasicMaterial color={K.ember} depthTest={false} /></mesh>
    </>
  );
};
const TsunamiOverlay: React.FC = () => {
  const f = useCurrentFrame();
  const pose = tsuPose(f);
  const x = lerp(-30, -3, ease((f - 10) / 120));
  const top = project(new THREE.Vector3(x + 6, 30, 19), pose), house = project(new THREE.Vector3(16.5, 5, 19), pose);
  return (
    <AbsoluteFill>
      {top.ok ? <div style={{ position: "absolute", left: top.x + 20, top: top.y, transform: "translateY(-30%)", opacity: clamp01((f - 60) / 14) }}>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 92, lineHeight: 1, color: K.text }}>±30 m</div>
        <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 28, color: K.dim }}>tinggi gelombang di beberapa titik*</div>
      </div> : null}
      <Tag at={house} text="Rumah ±5 m" color={K.ember} show={clamp01((f - 30) / 12)} />
      <div style={{ position: "absolute", left: 70, right: 70, bottom: 290, ...panel, ...rise(f, 100) }}>
        <Kicker color={K.lava}>Yang paling mematikan</Kicker>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 48, lineHeight: 1.12, marginTop: 8 }}>Bukan ledakannya, tapi tsunami yang menyapu ratusan desa pesisir.</div>
      </div>
    </AbsoluteFill>
  );
};

// ================= 7. GLOBE: ash haze around the world =================
const globePose: Pose = { pos: new THREE.Vector3(0, 0.35, 4.6), target: new THREE.Vector3(0, -0.25, 0), fov: 38 };
const GlobeScene: React.FC = () => {
  const f = useCurrentFrame();
  const tex = useMemo(() => globeTexture(), []);
  const haze = ease((f - 20) / 100);
  return (
    <>
      <SetCam pose={globePose} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[-3, 2, 4]} intensity={1.4} />
      <group rotation={[0.1, yawFor(lerp(105, 40, ease(f / 150))), 0]}>
        <mesh><sphereGeometry args={[1, 128, 96]} /><meshStandardMaterial map={tex} roughness={1} /></mesh>
      </group>
      <mesh><sphereGeometry args={[1.035, 96, 64]} /><meshBasicMaterial color={K.lava} transparent opacity={0.28 * haze} depthWrite={false} /></mesh>
      <mesh><sphereGeometry args={[1.09, 64, 48]} /><meshBasicMaterial color={K.ember} transparent opacity={0.16 * haze} side={THREE.BackSide} depthWrite={false} /></mesh>
    </>
  );
};
const GlobeOverlay: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 70, right: 70, bottom: 290, ...panel, ...rise(f, 40) }}>
        <Kicker>Berbulan-bulan sesudahnya</Kicker>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 48, lineHeight: 1.12, marginTop: 8 }}>Abu di udara membuat matahari terbenam merah di banyak negara, dan suhu bumi sempat turun.</div>
      </div>
    </AbsoluteFill>
  );
};

// ================= 8. END =================
const End: React.FC = () => {
  const f = useCurrentFrame();
  const row = (y: string, t: string, at: number, c: string) => (
    <div style={{ display: "flex", gap: 26, alignItems: "baseline", marginBottom: 26, ...rise(f, at) }}>
      <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 64, color: c, width: 190 }}>{y}</div>
      <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 38, lineHeight: 1.2 }}>{t}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 80%, #3a1a10 0%, ${K.bg} 60%)`, color: K.text, justifyContent: "center", padding: "0 80px" }}>
      {row("1927", "Anak Krakatau muncul dari laut, di tengah kaldera.", 4, K.ember)}
      {row("2018", "Lerengnya longsor dan memicu tsunami Selat Sunda.", 22, K.lava)}
      <div style={{ ...rise(f, 50), fontFamily: HEAD, fontWeight: 700, fontSize: 84, lineHeight: 1.02, textTransform: "uppercase", marginTop: 40 }}>Gunung ini<br /><span style={{ color: K.lava }}>belum selesai.</span></div>
    </AbsoluteFill>
  );
};

// ================= composition =================
const S: React.FC<{ k: BeatK; children: React.ReactNode }> = ({ k, children }) => (
  <Sequence from={B[k][0]} durationInFrames={len(k)}><Beat k={k}>{children}</Beat></Sequence>
);
export const KrakatauSample: React.FC = () => (
  <AbsoluteFill style={{ background: K.bg }}>
    <S k="hook"><Hook /></S>
    <S k="map"><Canvas3D bg={K.seaDeep}><MapScene /></Canvas3D><MapOverlay /></S>
    <S k="timeline"><Timeline /></S>
    <S k="volcano"><Canvas3D bg="#1d1614"><VolcanoScene /></Canvas3D><VolcanoOverlay /></S>
    <S k="numbers"><Numbers /></S>
    <S k="tsunami"><Canvas3D bg="#2a2220"><TsunamiScene /></Canvas3D><TsunamiOverlay /></S>
    <S k="globe"><Canvas3D bg={K.bg}><GlobeScene /></Canvas3D><GlobeOverlay /></S>
    <S k="end"><End /></S>
    <Chrome />
  </AbsoluteFill>
);
