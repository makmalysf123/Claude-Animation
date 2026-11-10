// SAMPLE of the explainer format with a light, cheerful theme. Topic: cats across Indonesia.
// Same format (story cards + graph + map + 3D), different palette and motion: cream background, candy colours,
// rounded type, bouncy pops. Per-island cat numbers are FICTIONAL sample data (marked on screen).
// The wild cat species list is real but should still be checked before publishing.
import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame } from "remotion";
import { makeProp } from "../bridge/props";
import { GROUPS, GROUP_CENTER, Group, P, islandGroups } from "./geo";

const W = 1080, H = 1920, FPS = 30;
const T = {
  bg: "#fff6e9", card: "#ffffff", ink: "#2b2d42", dim: "#7b7f99", line: "#f0e2cc",
  coral: "#ff6b6b", sun: "#ffd93d", mint: "#6bcb77", sky: "#4d96ff", lav: "#b983ff", peach: "#ffb26b",
  sea: "#bfe6ff", seaLine: "#a6dcff", land0: "#fff1c9",
};
const HEAD = "'Arial Rounded MT Bold', 'Avenir Next', Arial, sans-serif";
const BODY = "'Avenir Next', 'Helvetica Neue', Arial, sans-serif";
const XF = 10;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => Easing.inOut(Easing.cubic)(clamp01(x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const pop = (f: number, at: number) => spring({ frame: f - at, fps: FPS, config: { damping: 9, stiffness: 140, mass: 0.6 } });
const popStyle = (f: number, at: number): React.CSSProperties => { const s = pop(f, at); return { transform: `scale(${s})`, opacity: clamp01(s * 3) }; };

const B = { hook: [0, 120], map: [110, 320], chart: [310, 450], cats: [440, 620], wild: [610, 760], end: [750, 860] } as const;
export const CATS_FRAMES = 860;
type BeatK = keyof typeof B;
const len = (k: BeatK) => B[k][1] - B[k][0];

// FICTIONAL sample numbers (millions of cats)
const DATA: Record<Group, number> = { Jawa: 12.4, Sumatra: 6.1, Sulawesi: 2.3, Kalimantan: 2.0, "Bali & NT": 1.4, Maluku: 0.6, Papua: 0.5 };
const GROUP_COL: Record<Group, string> = { Jawa: T.coral, Sumatra: T.peach, Sulawesi: T.sun, Kalimantan: T.mint, "Bali & NT": T.lav, Maluku: T.sky, Papua: "#7fd4c7" };

// ---------- shared ----------
type Pose = { pos: THREE.Vector3; target: THREE.Vector3; fov: number };
const SetCam: React.FC<{ pose: Pose }> = ({ pose }) => {
  const c = useThree().camera as THREE.PerspectiveCamera;
  c.position.copy(pose.pos); c.lookAt(pose.target); c.fov = pose.fov; c.near = 0.05; c.far = 900; c.updateProjectionMatrix();
  return null;
};
const project = (p: THREE.Vector3, pose: Pose) => {
  const cam = new THREE.PerspectiveCamera(pose.fov, W / H, 0.05, 900);
  cam.position.copy(pose.pos); cam.lookAt(pose.target); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const v = p.clone().project(cam);
  return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H, ok: v.z < 1 };
};
const Canvas3D: React.FC<{ children: React.ReactNode; bg: string }> = ({ children, bg }) => (
  <ThreeCanvas flat width={W} height={H} camera={{ fov: 40, near: 0.05, far: 900 }} style={{ background: bg }}>{children}</ThreeCanvas>
);
const Beat: React.FC<{ k: BeatK; children: React.ReactNode }> = ({ k, children }) => {
  const f = useCurrentFrame();
  const o = Math.min(k === "hook" ? 1 : clamp01(f / XF), k === "end" ? 1 : clamp01((len(k) - f) / XF));
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};
const card: React.CSSProperties = { background: T.card, borderRadius: 36, padding: "30px 36px", border: `4px solid ${T.ink}`, boxShadow: `0 10px 0 ${T.ink}` };
const Sticker: React.FC<{ children: React.ReactNode; color: string; style?: React.CSSProperties }> = ({ children, color, style }) => (
  <span style={{ display: "inline-block", padding: "8px 20px", borderRadius: 999, background: color, color: T.ink, border: `3px solid ${T.ink}`, fontFamily: HEAD, fontSize: 26, ...style }}>{children}</span>
);

// ---------- chrome: chapter progress with paw prints ----------
const CHAPTERS: [BeatK, string][] = [["hook", "Halo"], ["map", "Peta"], ["chart", "Ranking"], ["cats", "Di gang"], ["wild", "Kucing liar"], ["end", "Kamu"]];
const Chrome: React.FC = () => {
  const f = useCurrentFrame();
  const cur = CHAPTERS.reduce((a, [k], i) => (f >= B[k][0] ? i : a), 0);
  return (
    <AbsoluteFill style={{ fontFamily: HEAD, color: T.ink, pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 60, right: 60, top: 90, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 10 }}>
          {CHAPTERS.map(([k], i) => (
            <div key={k} style={{ width: 54, height: 54, borderRadius: 27, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
              background: i <= cur ? T.sun : "rgba(43,45,66,0.08)", border: `3px solid ${i <= cur ? T.ink : "transparent"}`, transform: i === cur ? "scale(1.12)" : undefined }}>
              {i <= cur ? "🐾" : ""}
            </div>
          ))}
        </div>
        <Sticker color={T.coral} style={{ fontSize: 22, color: "#fff" }}>DATA CONTOH</Sticker>
      </div>
      <div style={{ position: "absolute", left: 62, top: 168, fontSize: 30 }}>{CHAPTERS[cur][1]}</div>
    </AbsoluteFill>
  );
};

// ================= 1. HOOK =================
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const wob = Math.sin(f / 8) * 4;
  return (
    <AbsoluteFill style={{ background: T.bg, fontFamily: HEAD, color: T.ink, justifyContent: "center", alignItems: "center", textAlign: "center", padding: "0 70px" }}>
      <div style={{ position: "absolute", width: 820, height: 820, borderRadius: 410, background: T.sun, opacity: 0.35, transform: `scale(${pop(f, 0)})` }} />
      <div style={{ fontSize: 230, ...popStyle(f, 4), transform: `${popStyle(f, 4).transform} rotate(${wob}deg)` }}>🐈</div>
      <div style={{ fontSize: 98, lineHeight: 1.05, ...popStyle(f, 14) }}>Indonesia,<br />negeri <span style={{ color: T.coral }}>kucing</span>?</div>
      <div style={{ ...card, marginTop: 50, display: "flex", alignItems: "center", gap: 24, ...popStyle(f, 40) }}>
        <div style={{ fontSize: 120, color: T.coral, lineHeight: 1 }}>25 jt+</div>
        <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 34, textAlign: "left", lineHeight: 1.2 }}>kucing di 7 pulau besar<br /><span style={{ color: T.dim }}>(angka contoh)</span></div>
      </div>
    </AbsoluteFill>
  );
};

// ================= 2. MAP: pan across the islands, bubbles pop =================
// Three still stops (west, centre, east). The camera holds still while islands pop, and only glides between stops.
const ORDER: Group[] = ["Sumatra", "Jawa", "Kalimantan", "Bali & NT", "Sulawesi", "Maluku", "Papua"];
const POP: Record<Group, number> = { Sumatra: 12, Jawa: 28, Kalimantan: 78, "Bali & NT": 92, Sulawesi: 106, Maluku: 152, Papua: 166 };
const STOPS: { at: [number, number]; from: number; to: number }[] = [
  { at: [105.5, -3.6], from: 0, to: 50 },     // west: Sumatra, Jawa
  { at: [118.0, -3.4], from: 72, to: 125 },   // centre: Kalimantan, Bali & NT, Sulawesi
  { at: [133.0, -4.2], from: 147, to: 210 },  // east: Maluku, Papua (held longest)
];
const mapPose = (f: number): Pose => {
  let lon = STOPS[0].at[0], lat = STOPS[0].at[1];
  for (let i = 0; i < STOPS.length; i++) {
    const s = STOPS[i], n = STOPS[i + 1];
    if (f >= s.from) { lon = s.at[0]; lat = s.at[1]; }
    if (n && f > s.to && f < n.from) { const t = ease((f - s.to) / (n.from - s.to)); lon = lerp(s.at[0], n.at[0], t); lat = lerp(s.at[1], n.at[1], t); }
  }
  const tgt = P(lon, lat); tgt.z += 4.5; // keep islands above the bottom card
  const h = 40;
  return { pos: tgt.clone().add(new THREE.Vector3(0, h, h * 0.45)), target: tgt, fov: 40 };
};
const groupAt = (f: number) => ORDER.reduce<Group>((cur, k) => (f >= POP[k] ? k : cur), ORDER[0]);
const MapScene: React.FC = () => {
  const f = useCurrentFrame();
  const g = useMemo(() => islandGroups(), []);
  const grid = useMemo(() => { const pts: THREE.Vector3[] = []; for (let lo = 90; lo <= 146; lo += 2) pts.push(P(lo, -16, 0.002), P(lo, 22, 0.002)); for (let la = -16; la <= 22; la += 2) pts.push(P(90, la, 0.002), P(146, la, 0.002)); return new THREE.BufferGeometry().setFromPoints(pts); }, []);
  const seen = (k: Group) => ease((f - POP[k]) / 8);
  return (
    <>
      <SetCam pose={mapPose(f)} />
      <hemisphereLight args={["#ffffff", "#ffe8c4", 1.1]} />
      <directionalLight position={[-6, 14, 8]} intensity={0.8} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}><planeGeometry args={[400, 400]} /><meshBasicMaterial color={T.sea} /></mesh>
      <lineSegments geometry={grid}><lineBasicMaterial color="#ffffff" transparent opacity={0.6} /></lineSegments>
      <mesh geometry={g.other}><meshStandardMaterial color={T.land0} roughness={1} /></mesh>
      {GROUPS.map((k) => (
        <mesh key={k} geometry={g.geo[k]}><meshStandardMaterial color={new THREE.Color(T.land0).lerp(new THREE.Color(GROUP_COL[k]), seen(k))} roughness={1} /></mesh>
      ))}
    </>
  );
};
const fmt = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 1 });
const MapOverlay: React.FC = () => {
  const f = useCurrentFrame();
  const pose = mapPose(f);
  const cur = groupAt(f);
  return (
    <AbsoluteFill style={{ fontFamily: HEAD, color: T.ink }}>
      {ORDER.map((k, i) => {
        const at = project(P(GROUP_CENTER[k][0], GROUP_CENTER[k][1], 0.2), pose);
        const appear = POP[k]; void i;
        const s = pop(f, appear);
        const size = 90 + Math.sqrt(DATA[k]) * 34;
        return !at.ok || f < appear ? null : (
          <div key={k} style={{ position: "absolute", left: at.x, top: at.y, transform: `translate(-50%, -50%) scale(${s})`, textAlign: "center" }}>
            <div style={{ width: size, height: size, borderRadius: size / 2, background: "#fff", border: `5px solid ${T.ink}`, boxShadow: `0 8px 0 ${T.ink}`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: size * 0.36, lineHeight: 1 }}>🐱</div>
              <div style={{ fontSize: size * 0.2 }}>{fmt(DATA[k])} jt</div>
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 70, right: 70, bottom: 300, ...card, display: "flex", alignItems: "center", gap: 24, ...popStyle(f, 6) }}>
        <div style={{ width: 90, height: 90, borderRadius: 24, background: GROUP_COL[cur], border: `4px solid ${T.ink}` }} />
        <div>
          <div style={{ fontFamily: BODY, fontWeight: 800, fontSize: 26, letterSpacing: 2, color: T.dim }}>SEKARANG DI</div>
          <div style={{ fontSize: 64, lineHeight: 1.05 }}>{cur}</div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 64, color: T.coral, lineHeight: 1 }}>{fmt(DATA[cur])}</div>
          <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 26, color: T.dim }}>juta kucing*</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ================= 3. BAR CHART =================
const Chart: React.FC = () => {
  const f = useCurrentFrame();
  const rows = [...GROUPS].sort((a, b) => DATA[b] - DATA[a]);
  const max = DATA[rows[0]];
  return (
    <AbsoluteFill style={{ background: T.bg, fontFamily: HEAD, color: T.ink, padding: "290px 70px 0" }}>
      <div style={{ fontSize: 76, lineHeight: 1.05, ...popStyle(f, 0) }}>Siapa juara<br /><span style={{ color: T.coral }}>pulau kucing</span>?</div>
      <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 30, color: T.dim, margin: "12px 0 34px" }}>jumlah kucing per pulau (contoh, juta)</div>
      {rows.map((k, i) => {
        const g = spring({ frame: f - 14 - i * 6, fps: FPS, config: { damping: 14, stiffness: 90 } });
        return (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 22 }}>
            <div style={{ width: 230, fontSize: 34, textAlign: "right" }}>{k}</div>
            <div style={{ flex: 1, position: "relative", height: 70 }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(DATA[k] / max) * 72 * g}%`, minWidth: 8, background: GROUP_COL[k], border: `4px solid ${T.ink}`, borderRadius: 20, boxShadow: `0 6px 0 ${T.ink}` }} />
              <div style={{ position: "absolute", left: `calc(${(DATA[k] / max) * 72 * g}% + 16px)`, whiteSpace: "nowrap", top: 12, fontSize: 36, opacity: clamp01(g) }}>
                {i === 0 ? "👑 " : ""}{fmt(DATA[k] * clamp01(g))}
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ================= 4. 3D: cats in a market alley =================
type Cat = { g: THREE.Group; head: THREE.Group; tail: THREE.Group; eyes: THREE.Mesh[] };
const toonGrad = (() => { const d = new Uint8Array([140, 210, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const toon = (c: string) => new THREE.MeshToonMaterial({ color: c, gradientMap: toonGrad });
const makeCat = (fur: string, ear = "#ff9eaa", patch?: string): Cat => {
  const g = new THREE.Group();
  const furM = toon(fur);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), furM); body.scale.set(1, 1.25, 0.95); body.position.y = 0.5; g.add(body);
  if (patch) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16), toon(patch)); p.position.set(0.18, 0.66, 0.24); p.scale.set(1, 0.9, 0.5); g.add(p); }
  for (const x of [-0.16, 0.16]) { const paw = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), furM); paw.position.set(x, 0.1, 0.3); paw.scale.set(1, 0.7, 1.2); g.add(paw); }
  const head = new THREE.Group(); head.position.y = 1.12; g.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.36, 32, 24), furM); skull.scale.set(1.12, 0.95, 1); head.add(skull);
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.26, 4), furM); e.position.set(0.2 * s, 0.33, 0); e.rotation.z = -0.35 * s; head.add(e);
    const ei = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 4), toon(ear)); ei.position.set(0.2 * s, 0.31, 0.04); ei.rotation.z = -0.35 * s; head.add(ei);
  }
  const eyes: THREE.Mesh[] = [];
  for (const s of [-1, 1]) { const ey = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), new THREE.MeshBasicMaterial({ color: "#2b2d42" })); ey.position.set(0.13 * s, 0.03, 0.33); head.add(ey); eyes.push(ey); }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshBasicMaterial({ color: "#ff7a8a" })); nose.position.set(0, -0.06, 0.36); head.add(nose);
  const tail = new THREE.Group(); tail.position.set(0, 0.22, -0.36); g.add(tail);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.1, 0.25, -0.25), new THREE.Vector3(0.05, 0.6, -0.3), new THREE.Vector3(-0.08, 0.85, -0.2)]);
  tail.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.07, 10, false), furM));
  g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
  return { g, head, tail, eyes };
};
const CATS = [
  { name: "Oyen", fur: "#f4a259", x: -0.9, z: 1.4, ry: 0.25, s: 1.0, ph: 0 },
  { name: "Mochi", fur: "#ffffff", x: 0.4, z: 2.1, ry: -0.15, s: 0.9, ph: 1.3, patch: "#f4a259" },
  { name: "Item", fur: "#3a3d55", x: 1.5, z: 0.9, ry: -0.5, s: 1.05, ph: 2.1 },
  { name: "Abu", fur: "#a7abc0", x: -1.9, z: 0.3, ry: 0.6, s: 0.85, ph: 0.7 },
  { name: "Belang", fur: "#fff1c9", x: 1.9, z: 2.6, ry: -0.8, s: 0.8, ph: 1.9, patch: "#3a3d55" },
];
const catPose = (f: number): Pose => {
  const a = THREE.MathUtils.degToRad(lerp(-14, 12, ease(f / 180)));
  const r = lerp(17.5, 15.5, ease(f / 180));
  const tgt = new THREE.Vector3(0.2, 0.9, 0.6);
  return { pos: new THREE.Vector3(Math.sin(a) * r, 5.2, Math.cos(a) * r), target: tgt, fov: 40 };
};
const CatScene: React.FC = () => {
  const f = useCurrentFrame();
  const cats = useMemo(() => CATS.map((c) => { const k = makeCat(c.fur, undefined, c.patch); k.g.position.set(c.x, 0, c.z); k.g.rotation.y = c.ry; k.g.scale.setScalar(c.s); return k; }), []);
  const set = useMemo(() => {
    const g = new THREE.Group();
    const place = (name: string, x: number, z: number, h: number, ry = 0) => {
      const o = makeProp(name)!; const b = new THREE.Box3().setFromObject(o); const s = h / (b.max.y - b.min.y);
      o.scale.setScalar(s); o.position.set(x, -b.min.y * s, z); o.rotation.y = ry;
      o.traverse((c) => { const m = c as THREE.Mesh; if (m.isMesh) { const om = m.material as THREE.MeshStandardMaterial; m.material = toon("#" + om.color.getHexString()); m.castShadow = m.receiveShadow = true; } });
      g.add(o);
    };
    place("stall-red", -2.4, -2.2, 2.7, 0.2); place("stall-green", 2.2, -2.5, 2.7, -0.2); place("stall-bench", 0.1, -0.7, 0.75);
    place("lantern", -4.2, -0.6, 2.6); place("cart", 4.4, -0.4, 1.4, -0.7);
    for (const [x, z, n] of [[-3.6, 2.4, "flower_redA"], [3.6, 3.2, "flower_yellowA"], [-0.8, 3.4, "flower_purpleA"], [1.4, 3.6, "flower_redA"]] as [number, number, string][]) place(n, x, z, 0.45);
    for (const [x, z] of [[-4.4, 1.4], [4.6, 1.8], [-2.0, 3.8]]) place("grass_large", x, z, 0.35);
    return g;
  }, []);
  cats.forEach((c, i) => {
    const ph = CATS[i].ph;
    c.tail.rotation.z = Math.sin(f / 7 + ph) * 0.45;
    c.head.rotation.z = Math.sin(f / 23 + ph) * 0.12;
    c.head.rotation.y = Math.sin(f / 31 + ph) * 0.25;
    const blink = ((f + ph * 40) % 70) < 4 ? 0.1 : 1;
    c.eyes.forEach((e) => (e.scale.y = blink));
    c.g.position.y = Math.max(0, Math.sin(clamp01((f - 8 - i * 6) / 12) * Math.PI)) * 0.5; // little hop on entry
  });
  return (
    <>
      <SetCam pose={catPose(f)} />
      <hemisphereLight args={["#ffffff", "#ffe2b8", 0.9]} />
      <directionalLight position={[5, 10, 7]} intensity={1.6} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048}
        shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-bias={-0.0005} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[9, 64]} /><primitive object={toon("#ffe7b3")} attach="material" /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 1.2]} receiveShadow><planeGeometry args={[12, 2.6]} /><primitive object={toon("#f6d39a")} attach="material" /></mesh>
      <primitive object={set} />
      {cats.map((c, i) => <primitive key={i} object={c.g} />)}
    </>
  );
};
const CatOverlay: React.FC = () => {
  const f = useCurrentFrame();
  const pose = catPose(f);
  return (
    <AbsoluteFill style={{ fontFamily: HEAD, color: T.ink }}>
      {CATS.map((c, i) => {
        const at = project(new THREE.Vector3(c.x, 1.85 * c.s, c.z), pose);
        return at.ok ? (
          <div key={c.name} style={{ position: "absolute", left: at.x, top: at.y, transform: `translate(-50%, -100%) scale(${pop(f, 20 + i * 6)})` }}>
            <Sticker color={[T.sun, T.mint, T.sky, T.lav, T.peach][i]} style={{ fontSize: 28 }}>{c.name}</Sticker>
          </div>
        ) : null;
      })}
      <div style={{ position: "absolute", left: 70, right: 70, bottom: 300, ...card, ...popStyle(f, 40) }}>
        <div style={{ fontFamily: BODY, fontWeight: 800, fontSize: 26, letterSpacing: 2, color: T.coral }}>KUCING KAMPUNG</div>
        <div style={{ fontSize: 50, lineHeight: 1.12, marginTop: 6 }}>Penghuni setia gang, pasar, dan warung.</div>
      </div>
    </AbsoluteFill>
  );
};
const CatBeat: React.FC = () => <Canvas3D bg="#cdeeff"><CatScene /></Canvas3D>;

// ================= 5. WILD CATS (real species, check before publishing) =================
const WILD = [
  { n: "Kucing merah", w: "endemik Kalimantan", c: T.coral },
  { n: "Kucing hutan", w: "tersebar luas", c: T.mint },
  { n: "Kucing batu", w: "Sumatra & Kalimantan", c: T.sky },
  { n: "Kucing tandang", w: "Sumatra & Kalimantan", c: T.lav },
  { n: "Kucing emas", w: "Sumatra", c: T.sun },
  { n: "Macan dahan", w: "Sumatra & Kalimantan", c: T.peach },
];
const Wild: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: T.bg, fontFamily: HEAD, color: T.ink, padding: "290px 70px 0" }}>
      <div style={{ fontSize: 72, lineHeight: 1.05, ...popStyle(f, 0) }}>Bukan cuma <span style={{ color: T.coral }}>Oyen</span>!</div>
      <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 32, color: T.dim, margin: "10px 0 30px", ...popStyle(f, 6) }}>Kucing liar asli hutan Indonesia:</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {WILD.map((k, i) => (
          <div key={k.n} style={{ ...card, padding: "24px 26px", background: k.c, ...popStyle(f, 14 + i * 7) }}>
            <div style={{ fontSize: 60, lineHeight: 1 }}>🐆</div>
            <div style={{ fontSize: 38, marginTop: 8, lineHeight: 1.05 }}>{k.n}</div>
            <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 26, marginTop: 6 }}>{k.w}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ================= 6. END =================
const End: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: T.sun, fontFamily: HEAD, color: T.ink, justifyContent: "center", alignItems: "center", textAlign: "center", padding: "0 70px" }}>
      <div style={{ fontSize: 200, ...popStyle(f, 0), transform: `${popStyle(f, 0).transform} rotate(${Math.sin(f / 6) * 6}deg)` }}>😺</div>
      <div style={{ fontSize: 84, lineHeight: 1.06, ...popStyle(f, 8) }}>Kucing di rumahmu<br />namanya siapa?</div>
      <div style={{ ...card, marginTop: 40, fontSize: 40, ...popStyle(f, 26) }}>Tulis di komentar 👇</div>
    </AbsoluteFill>
  );
};

// ================= composition =================
const S: React.FC<{ k: BeatK; children: React.ReactNode }> = ({ k, children }) => (
  <Sequence from={B[k][0]} durationInFrames={len(k)}><Beat k={k}>{children}</Beat></Sequence>
);
export const CatsSample: React.FC = () => {
  const f = useCurrentFrame();
  void interpolate; void f;
  return (
    <AbsoluteFill style={{ background: T.bg }}>
      <S k="hook"><Hook /></S>
      <S k="map"><Canvas3D bg={T.sea}><MapScene /></Canvas3D><MapOverlay /></S>
      <S k="chart"><Chart /></S>
      <S k="cats"><CatBeat /><CatOverlay /></S>
      <S k="wild"><Wild /></S>
      <S k="end"><End /></S>
      <Chrome />
    </AbsoluteFill>
  );
};
