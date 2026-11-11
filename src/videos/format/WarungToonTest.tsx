// Toon-world test: the bridge engine's post chain (ink lines -> lens blur -> bloom -> tone -> grade; MIT, Mr omi)
// with OUR OWN character style (toonCast.ts) and our own set. Scene: lunch at a warung, three shots with hard cuts:
//   1) wide establishing (seller stirring, Budi and Sari chatting)  2) two-shot (Sari tells a story, Budi bursts out laughing)
//   3) close-up on Budi (seller brings the plates: surprise -> big smile). Fictional story.
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
import { makeProp } from "../bridge/props";
import { Act, Look, blinkAt, drawPerson, talkAt } from "./toonCast";

const W = 1080, H = 1920;
const FONT = "'Avenir Next', 'Helvetica Neue', Arial, sans-serif";
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => Easing.inOut(Easing.cubic)(clamp01(x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const SHOTS = [[0, 90], [90, 180], [180, 270]] as const;
export const WARUNG_TOON_FRAMES = 270;

// ---------- cast (our style) ----------
const BUDI: Look = { skin: "#d9a074", hair: "#24180f", hairStyle: "short", shirt: "#ff6b6b", pattern: "#ffd2c4", pants: "#2c3550" };
const SARI: Look = { skin: "#e8b48a", hair: "#2a1a10", hairStyle: "hijab", hijab: "#2fb59a", shirt: "#f4c34f", pattern: "#fff1b8", pants: "#3a3f5c" };
const DARTI: Look = { skin: "#c98e63", hair: "#2a1d14", hairStyle: "peci", shirt: "#7a4a2e", pattern: "#d8a46a", pants: "#3a2f2a", apron: "#f6f2e8", moustache: true };
type Who = "budi" | "sari" | "darti";
const LOOKS: Record<Who, Look> = { budi: BUDI, sari: SARI, darti: DARTI };
const SEAT = { budi: new THREE.Vector3(-0.45, -0.15, -0.95), sari: new THREE.Vector3(0.45, -0.15, -0.95) };

// per-frame acting (global frame f)
const acting = (who: Who, f: number): Act => {
  const blink = blinkAt(f, who === "budi" ? 1 : who === "sari" ? 7 : 13);
  if (who === "sari") {
    const talking = f < 150 || (f > 160 && f < 175);
    return { expr: f >= 150 && f < 200 ? "laugh" : talking ? "talk" : "smile", talk: talkAt(f, 2), blink, look: -0.8, armL: talking ? 25 + 18 * Math.sin(f / 5) : 10, armR: talking ? 55 + 25 * Math.sin(f / 4) : 20, seated: true, laughT: f };
  }
  if (who === "budi") {
    if (f < 90) return { expr: f % 60 < 30 ? "talk" : "smile", talk: talkAt(f, 5), blink, look: 0.8, armL: 12, armR: 30, seated: true };
    if (f < 140) return { expr: "smile", blink, look: 0.8, armL: 12, armR: 20, seated: true };
    if (f < 190) return { expr: "laugh", blink: 0, look: 0.3, armL: 20 + 10 * Math.sin(f / 3), armR: 40 + 12 * Math.sin(f / 3.3), seated: true, laughT: f, bob: 6 * Math.sin(f / 2.2) };
    if (f < 212) return { expr: "talk", talk: talkAt(f, 1) * 0.5, blink, look: 0.9, armL: 12, armR: 25, seated: true };
    if (f < 232) return { expr: "surprised", blink: 0, look: 1, armL: 70, armR: 75, seated: true, bob: -8 };
    return { expr: f < 252 ? "talk" : "smile", talk: talkAt(f, 3), blink, look: 1, armL: 20, armR: 60, seated: true, holdR: "spoon" };
  }
  // darti: stirring at the stall, then (shot 3) bringing the plate
  if (f < 180) return { expr: f % 80 < 40 ? "smile" : "neutral", blink, look: 0, armL: 10, armR: 70 + 20 * Math.sin(f / 4), holdR: "ladle", bob: 3 * Math.sin(f / 8) };
  return { expr: f > 214 ? "talk" : "smile", talk: talkAt(f, 4), blink, look: -1, armL: 10, armR: 95, holdR: "plate", bob: 4 * Math.abs(Math.sin(f / 4)) };
};
const dartiPos = (f: number) => (f < 180 ? new THREE.Vector3(0.1, 0, -2.75) : new THREE.Vector3(lerp(2.6, 1.2, Easing.out(Easing.cubic)(clamp01((f - 180) / 26))), 0, -0.05));

type Card = { mesh: THREE.Mesh; g: CanvasRenderingContext2D; tex: THREE.CanvasTexture };
const makeCard = (): Card => {
  const c = document.createElement("canvas"); c.width = 600; c.height = 1000;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.75).translate(0, 0.875, 0), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, toneMapped: true }));
  mesh.layers.set(NOINK); mesh.renderOrder = 1;
  return { mesh, g: c.getContext("2d")!, tex };
};

// ---------- set ----------
const toonGrad = (() => { const d = new Uint8Array([110, 190, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const toon = (c: string) => new THREE.MeshToonMaterial({ color: c, gradientMap: toonGrad });
const signTexture = () => {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 256; const g = c.getContext("2d")!;
  g.fillStyle = "#1f5f8b"; g.fillRect(0, 0, 1024, 256); g.fillStyle = "#ffd23f"; g.font = "bold 120px 'Avenir Next', Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("WARUNG BU DARTI", 512, 132);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};
const buildSet = () => {
  const g = new THREE.Group();
  const add = (m: THREE.Mesh) => { m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  const box = (w: number, h: number, d: number, c: string, x: number, y: number, z: number) => { const m = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(c))); m.position.set(x, y, z); return m; };
  const ground = add(new THREE.Mesh(new THREE.PlaneGeometry(30, 30), toon("#d9c7a0"))); ground.rotation.x = -Math.PI / 2;
  box(12, 3.6, 0.3, "#efd9b4", 0, 1.8, -4.2); // back wall
  box(1.0, 2.1, 0.06, "#6b4a30", -3.2, 1.05, -4.03); box(1.3, 0.9, 0.06, "#35506b", 3.0, 1.8, -4.03);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: signTexture() })); sign.position.set(0.2, 3.05, -4.02); g.add(sign);
  // table with cloth, plates, glasses
  box(1.7, 0.74, 0.85, "#d0453b", 0, 0.37, -0.5);
  box(1.74, 0.03, 0.89, "#f7f1e3", 0, 0.755, -0.5);
  for (const x of [-0.45, 0.45]) {
    const plate = add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.025, 24), toon("#ffffff"))); plate.position.set(x, 0.78, -0.62);
    const glass = add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.16, 16), new THREE.MeshToonMaterial({ color: "#c7792a", gradientMap: toonGrad, transparent: true, opacity: 0.85 }))); glass.position.set(x + 0.25, 0.85, -0.45);
  }
  const jar = add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.3, 20), new THREE.MeshToonMaterial({ color: "#cfe7f2", gradientMap: toonGrad, transparent: true, opacity: 0.7 }))); jar.position.set(0.72, 0.92, -0.25);
  const place = (name: string, x: number, z: number, h: number, ry = 0) => {
    const o = makeProp(name)!; const b = new THREE.Box3().setFromObject(o); const s = h / (b.max.y - b.min.y);
    o.scale.setScalar(s); o.position.set(x, -b.min.y * s, z); o.rotation.y = ry;
    o.traverse((c) => { const m = c as THREE.Mesh; if (m.isMesh) { m.material = toon("#" + (m.material as THREE.MeshStandardMaterial).color.getHexString()); m.castShadow = m.receiveShadow = true; } });
    g.add(o);
  };
  place("stall-red", 0.1, -2.35, 2.7); place("lantern", -2.4, -2.6, 2.5); place("cart", -2.6, -0.9, 1.3, 0.7);
  for (const [x, z] of [[2.4, -3.4], [-1.4, -3.6], [3.2, -1.6]] as [number, number][]) { place("grass_large", x, z, 0.5); }
  return g;
};

// ---------- shots ----------
type Pose = { pos: THREE.Vector3; target: THREE.Vector3; fov: number; cInf: number; focus: THREE.Vector3 };
const head = (who: "budi" | "sari") => SEAT[who].clone().add(new THREE.Vector3(0, 1.3, 0));
const shotPose = (i: number, f: number): Pose => {
  const t = clamp01((f - SHOTS[i][0]) / 90);
  if (i === 0) { const tgt = new THREE.Vector3(0.1, 1.05, -1.2); return { pos: new THREE.Vector3(lerp(3.6, 3.0, ease(t)), lerp(2.4, 2.2, t), lerp(6.0, 5.3, ease(t))), target: tgt, fov: 40, cInf: 8, focus: head("budi") }; }
  if (i === 1) { const tgt = new THREE.Vector3(0, 1.12, -0.95); return { pos: new THREE.Vector3(0.05, 1.32, lerp(3.0, 2.7, ease(t))), target: tgt, fov: 38, cInf: 14, focus: head("sari") }; }
  return { pos: new THREE.Vector3(0.38, 1.7, lerp(4.9, 4.5, ease(t))), target: new THREE.Vector3(0.38, 1.12, -0.5), fov: 42, cInf: 12, focus: head("budi") };
};

const makeBloom = () => new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.45, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
const fwd = new THREE.Vector3();
const ShotInner: React.FC<{ i: number }> = ({ i }) => {
  const local = useCurrentFrame(), f = local + SHOTS[i][0];
  const { camera, scene } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const set = useMemo(buildSet, []);
  const cards = useMemo(() => ({ budi: makeCard(), sari: makeCard(), darti: makeCard() }), []);
  const fx = useMemo(() => ({ ink: new InkPass(scene, cam), lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }), bloom: makeBloom(), tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day) }), [scene, cam]);
  React.useEffect(() => () => InkPass.prototype.dispose.call(fx.ink), [fx]);
  const p = shotPose(i, f);
  cam.position.copy(p.pos); cam.lookAt(p.target); cam.fov = p.fov; cam.near = 0.1; cam.far = 200; cam.updateProjectionMatrix(); cam.layers.enable(NOINK);
  // cast: draw this frame's drawings and billboard toward the camera (yaw only)
  for (const who of ["budi", "sari", "darti"] as Who[]) {
    const c = cards[who]; drawPerson(c.g, LOOKS[who], acting(who, f)); c.tex.needsUpdate = true;
    const pos = who === "darti" ? dartiPos(f) : SEAT[who]; c.mesh.position.copy(pos);
    c.mesh.rotation.set(0, Math.atan2(cam.position.x - pos.x, cam.position.z - pos.z), 0);
  }
  noInkFallback(set);
  cam.getWorldDirection(fwd);
  fx.lens.focus = Math.max(0.3, p.focus.clone().sub(cam.position).dot(fwd)); fx.lens.cInf = p.cInf;
  return (
    <>
      <hemisphereLight args={["#fff4e0", "#8a7a5a", 0.9]} />
      <directionalLight position={[-5, 9, 6]} intensity={2.2} color="#fff1d6" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-bias={-0.0005} />
      <color attach="background" args={["#a9d6f2"]} />
      <primitive object={set} dispose={null} />
      {Object.values(cards).map((c, k) => <primitive key={k} object={c.mesh} dispose={null} />)}
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

// ---------- overlay: speech bubbles in our style ----------
const project = (v: THREE.Vector3, p: Pose) => { const c = new THREE.PerspectiveCamera(p.fov, W / H, 0.1, 200); c.position.copy(p.pos); c.lookAt(p.target); c.updateMatrixWorld(); c.updateProjectionMatrix(); const q = v.clone().project(c); return { x: ((q.x + 1) / 2) * W, y: ((1 - q.y) / 2) * H }; };
const LINES: { who: Who; a: number; b: number; text: string }[] = [
  { who: "sari", a: 100, b: 148, text: "Terus dia kepeleset pas lewat depan bos!" },
  { who: "budi", a: 150, b: 180, text: "Hahaha!" },
  { who: "darti", a: 212, b: 240, text: "Nasi rames dua, siap!" },
  { who: "budi", a: 238, b: 268, text: "Wah, cepat banget, Bu!" },
];
const Bubbles: React.FC<{ i: number }> = ({ i }) => {
  const local = useCurrentFrame(), f = local + SHOTS[i][0];
  const p = shotPose(i, f);
  const anchor = (who: Who) => (who === "darti" ? dartiPos(f).add(new THREE.Vector3(0, 1.75, 0)) : SEAT[who].clone().add(new THREE.Vector3(0, 1.6, 0)));
  return (
    <AbsoluteFill style={{ pointerEvents: "none", fontFamily: FONT }}>
      {LINES.filter((l) => f >= l.a && f < l.b).map((l) => {
        const at = project(anchor(l.who), p); const s = Easing.out(Easing.back(2))(clamp01((f - l.a) / 6));
        const x = Math.max(260, Math.min(W - 260, at.x)), y = Math.max(420, at.y);
        return (
          <div key={l.text} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -100%) scale(${s})`, transformOrigin: "50% 100%" }}>
            <div style={{ background: "#fff", border: "6px solid #1c2340", borderRadius: 34, padding: "18px 28px", fontSize: 40, fontWeight: 800, color: "#1c2340", maxWidth: 560, textAlign: "center", lineHeight: 1.15 }}>{l.text}</div>
            <div style={{ width: 0, height: 0, margin: "-2px auto 0", borderLeft: "18px solid transparent", borderRight: "18px solid transparent", borderTop: "26px solid #1c2340" }} />
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 60, top: 96, background: "#ffd23f", color: "#1c2340", fontWeight: 800, fontSize: 24, letterSpacing: 2, padding: "6px 12px", borderRadius: 8 }}>TES GAYA TOKOH · SHOT {i + 1}/3</div>
      <div style={{ position: "absolute", left: 60, bottom: 120, fontSize: 22, color: "rgba(28,35,64,0.75)", fontWeight: 600 }}>Cerita fiktif · efek kamera dari mesin "bridge" (MIT, Mr omi) · tokoh gaya sendiri</div>
    </AbsoluteFill>
  );
};

export const WarungToonTest: React.FC = () => (
  <AbsoluteFill style={{ background: "#a9d6f2" }}>
    {SHOTS.map(([a, b], i) => (
      <Sequence key={i} from={a} durationInFrames={b - a}>
        <AbsoluteFill>
          <ThreeCanvas width={W} height={H} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 40, near: 0.1, far: 200 }}>
            <ShotInner i={i} />
          </ThreeCanvas>
        </AbsoluteFill>
        <Bubbles i={i} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
