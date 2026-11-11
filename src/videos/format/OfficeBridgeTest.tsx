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
import { Pen, bodyFront, Outfit, Expr } from "../bridge/toon";
import { blinkAt } from "./toonCast";
import { buildOffice, contactBlob } from "./officeSet";

const W = 1080, H = 1920;
const FONT = "'Avenir Next', 'Helvetica Neue', Arial, sans-serif";
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => Easing.inOut(Easing.cubic)(clamp01(x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const SHOTS = [[0, 90], [90, 180], [180, 270]] as const;
export const OFFICE_FRAMES = 270;

// ---------- cast: ORIGINAL bridge characters (toon.ts) in office clothes ----------
const RINA: Outfit = { jacket: "#7b5ac9", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#3a2416", skin: "#f5c9a0" };
const DODI: Outfit = { jacket: "#3f6fb5", pants: "#2f3442", boots: "#2a2420", hat: "hair", hair: "#1e1410", skin: "#ecd0b6" };
const BOSS: Outfit = { jacket: "#3b3f52", pants: "#2a2e3c", boots: "#1e1a18", hat: "hair", hair: "#5a5a5a", moustache: "#4a3020", build: "stout", skin: "#c99067" };
type Who = "rina" | "dodi" | "boss";
const OUTFIT: Record<Who, Outfit> = { rina: RINA, dodi: DODI, boss: BOSS };
const SEAT = { rina: new THREE.Vector3(-0.85, 0.32, -0.95), dodi: new THREE.Vector3(0.85, 0.32, -0.95) }; // raised: chair height
type Pose2D = { expr: Expr; mode: "stand" | "sit" | "stroll"; blink: number; look: number; wave?: number; phase?: number };
const acting = (who: Who, f: number): Pose2D => {
  const blink = blinkAt(f, who === "rina" ? 3 : who === "dodi" ? 9 : 15);
  if (who === "dodi") {
    if (f < 90) return { expr: "neutral", mode: "sit", blink, look: -0.3 };
    if (f < 135) return { expr: (Math.floor(f / 6) % 2 ? "grin" : "smile"), mode: "sit", blink, look: -1 };
    if (f < 185) return { expr: "laugh", mode: "sit", blink: 0, look: -1 };
    if (f < 205) return { expr: "grin", mode: "sit", blink, look: 1 };
    return { expr: "shock", mode: "sit", blink: 0, look: 1 };
  }
  if (who === "rina") {
    if (f < 90) return { expr: "neutral", mode: "sit", blink, look: 0.3 };
    if (f < 140) return { expr: "smile_closed", mode: "sit", blink, look: 1 };
    if (f < 205) return { expr: "laugh", mode: "sit", blink: 0, look: 1 };
    return { expr: f < 230 ? "shock" : "nervous", mode: "sit", blink: 0, look: 1 };
  }
  return { expr: f < 230 ? "stern" : "grin", mode: f < 214 ? "stroll" : "stand", blink, look: -1, phase: f / 10 };
};
const bossPos = (f: number) => new THREE.Vector3(lerp(2.6, 1.35, Easing.out(Easing.cubic)(clamp01((f - 180) / 34))), 0, 0.25);
const drawWho = (g: CanvasRenderingContext2D, who: Who, f: number) => {
  const a = acting(who, f); g.clearRect(0, 0, 600, 1000);
  bodyFront(new Pen(g), OUTFIT[who], { expr: a.expr, mode: a.mode, blink: a.blink, look: a.look, phase: a.phase ?? 0, seed: who === "rina" ? 2 : who === "dodi" ? 5 : 8, facing: 0 });
  // card shading: the window is on screen right, so the left side of the body falls into soft cool shade
  g.save(); g.globalCompositeOperation = "source-atop";
  const sh = g.createLinearGradient(120, 0, 480, 0); sh.addColorStop(0, "rgba(40,50,95,0.30)"); sh.addColorStop(0.55, "rgba(40,50,95,0)"); sh.addColorStop(1, "rgba(255,226,170,0.10)");
  g.fillStyle = sh; g.fillRect(0, 0, 600, 1000);
  const fl = g.createLinearGradient(0, 640, 0, 1000); fl.addColorStop(0, "rgba(40,50,95,0)"); fl.addColorStop(1, "rgba(40,50,95,0.22)"); // darker toward the floor
  g.fillStyle = fl; g.fillRect(0, 0, 600, 1000); g.restore();
};

type Card = { mesh: THREE.Mesh; g: CanvasRenderingContext2D; tex: THREE.CanvasTexture };
const makeCard = (): Card => {
  const c = document.createElement("canvas"); c.width = 600; c.height = 1000;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.296, 2.16).translate(0, 1.08 - 0.054, 0), new THREE.MeshBasicMaterial({ map: tex, color: "#fff2e2", transparent: true, alphaTest: 0.5, toneMapped: true }));
  mesh.layers.set(NOINK); mesh.renderOrder = 1;
  return { mesh, g: c.getContext("2d")!, tex };
};

// ---------- set: detailed office from officeSet.ts ----------

// ---------- per-shot light: warm window sun from the right-back, cool fill, ceiling-lamp glow ----------
const LIGHT = [
  { sun: 2.4, hemi: 0.75, patch: 26 },  // wide: show the sun patch on the floor
  { sun: 2.0, hemi: 0.85, patch: 18 },  // two-shot: softer, faces readable
  { sun: 2.6, hemi: 0.7, patch: 22 },   // boss arrives: a bit more contrast
];

// ---------- shots ----------
type Pose = { pos: THREE.Vector3; target: THREE.Vector3; fov: number; cInf: number; focus: THREE.Vector3 };
const head = (who: "rina" | "dodi") => SEAT[who].clone().add(new THREE.Vector3(0, 1.25, 0));
const shotPose = (i: number, f: number): Pose => {
  const t = clamp01((f - SHOTS[i][0]) / 90);
  if (i === 0) return { pos: new THREE.Vector3(lerp(2.2, 1.8, ease(t)), 1.55, lerp(5.6, 5.2, ease(t))), target: new THREE.Vector3(0.3, 1.45, -1.2), fov: 46, cInf: 8, focus: head("rina") };
  if (i === 1) return { pos: new THREE.Vector3(0, 1.55, lerp(4.6, 4.2, ease(t))), target: new THREE.Vector3(0, 1.3, -0.95), fov: 40, cInf: 14, focus: head("dodi") };
  return { pos: new THREE.Vector3(0.5, 1.75, lerp(5.6, 5.2, ease(t))), target: new THREE.Vector3(0.5, 1.2, -0.4), fov: 42, cInf: 10, focus: head("dodi") };
};

const makeBloom = () => new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.45, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
const fwd = new THREE.Vector3();
const ShotInner: React.FC<{ i: number }> = ({ i }) => {
  const local = useCurrentFrame(), f = local + SHOTS[i][0];
  const { camera, scene } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const set = useMemo(buildOffice, []);
  const blobs = useMemo(() => ({ rina: contactBlob(), dodi: contactBlob(), boss: contactBlob() }), []);
  const cards = useMemo(() => ({ rina: makeCard(), dodi: makeCard(), boss: makeCard() }), []);
  const fx = useMemo(() => ({ ink: new InkPass(scene, cam), lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }), bloom: makeBloom(), tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day) }), [scene, cam]);
  React.useEffect(() => () => InkPass.prototype.dispose.call(fx.ink), [fx]);
  const p = shotPose(i, f);
  cam.position.copy(p.pos); cam.lookAt(p.target); cam.fov = p.fov; cam.near = 0.1; cam.far = 200; cam.updateProjectionMatrix(); cam.layers.enable(NOINK);
  // cast: draw this frame's drawings and billboard toward the camera (yaw only)
  for (const who of ["rina", "dodi", "boss"] as Who[]) {
    const c = cards[who]; drawWho(c.g, who, f); c.tex.needsUpdate = true; c.mesh.visible = who !== "boss" || f >= 180;
    const pos = who === "boss" ? bossPos(f) : SEAT[who]; c.mesh.position.copy(pos);
    c.mesh.rotation.set(0, Math.atan2(cam.position.x - pos.x, cam.position.z - pos.z), 0);
    const b = blobs[who]; b.visible = c.mesh.visible; b.position.set(pos.x, 0.006, pos.z + 0.05); // contact shadow on the floor
  }
  noInkFallback(set);
  cam.getWorldDirection(fwd);
  fx.lens.focus = Math.max(0.3, p.focus.clone().sub(cam.position).dot(fwd)); fx.lens.cInf = p.cInf;
  return (
    <>
      <hemisphereLight args={["#fff1dc", "#6f6a7c", LIGHT[i].hemi]} />
      <directionalLight position={[5, 7, 7]} intensity={LIGHT[i].sun} color="#ffe2b8" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-bias={-0.0005} shadow-normalBias={0.02} />
      <spotLight position={[2.3, 2.9, -2.6]} target-position={[1.4, 0, 0.6]} angle={0.55} penumbra={0.7} intensity={LIGHT[i].patch} distance={9} decay={1.6} color="#ffd9a0" />
      <pointLight position={[-1.4, 3.0, -0.6]} intensity={2.5} distance={5} color="#fff6e0" />
      <pointLight position={[1.4, 3.0, -0.6]} intensity={2.5} distance={5} color="#fff6e0" />
      <color attach="background" args={["#e6e1d4"]} />
      <primitive object={set} dispose={null} />
      {Object.values(blobs).map((b, k) => <primitive key={"b" + k} object={b} dispose={null} />)}
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
  { who: "dodi", a: 96, b: 134, text: "Bos lagi cuti, kan? Santai dulu..." },
  { who: "rina", a: 140, b: 180, text: "Hahaha, setuju!" },
  { who: "boss", a: 200, b: 236, text: "Siapa bilang saya cuti?" },
  { who: "rina", a: 240, b: 268, text: "Eh... Pak!" },
];
const Bubbles: React.FC<{ i: number }> = ({ i }) => {
  const local = useCurrentFrame(), f = local + SHOTS[i][0];
  const p = shotPose(i, f);
  const anchor = (who: Who) => (who === "boss" ? bossPos(f).add(new THREE.Vector3(0, 2.15, 0)) : SEAT[who].clone().add(new THREE.Vector3(0, 1.6, 0)));
  return (
    <AbsoluteFill style={{ pointerEvents: "none", fontFamily: FONT }}>
      {LINES.filter((l) => f >= l.a && f < l.b).map((l) => {
        const at = project(anchor(l.who), p); const s = Easing.out(Easing.back(2))(clamp01((f - l.a) / 6));
        const x = Math.max(260, Math.min(W - 260, at.x)), y = Math.max(420, at.y);
        return (
          <div key={l.text} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -100%) scale(${s})`, transformOrigin: "50% 100%" }}>
            <div style={{ background: "#fff", border: "6px solid #1c2340", borderRadius: 34, padding: "18px 28px", fontSize: 40, fontWeight: 800, color: "#1c2340", minWidth: 360, maxWidth: 560, textAlign: "center", lineHeight: 1.15 }}>{l.text}</div>
            <div style={{ width: 0, height: 0, margin: "-2px auto 0", borderLeft: "18px solid transparent", borderRight: "18px solid transparent", borderTop: "26px solid #1c2340" }} />
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 60, top: 96, background: "#ffd23f", color: "#1c2340", fontWeight: 800, fontSize: 24, letterSpacing: 2, padding: "6px 12px", borderRadius: 8 }}>TES KANTOR · TOKOH ASLI BRIDGE · SHOT {i + 1}/3</div>
      <div style={{ position: "absolute", left: 60, bottom: 120, fontSize: 22, color: "rgba(28,35,64,0.75)", fontWeight: 600 }}>Cerita fiktif · tes internal · tokoh & efek dari mesin "bridge" (MIT, Mr omi)</div>
    </AbsoluteFill>
  );
};

export const OfficeBridgeTest: React.FC = () => (
  <AbsoluteFill style={{ background: "#e6e1d4" }}>
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
