// Test: a Mixamo character (FBX "with skin" downloads) in a small toon stage, with a deterministic,
// frame-exact animation timeline (idle -> walk in -> turn + wave -> surprised -> drop kick).
// Every frame is a pure function of the frame number, so Remotion can render frames in any order.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree, useFrame } from "@react-three/fiber";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { OutlineEffect } from "three/examples/jsm/effects/OutlineEffect.js";
import { makeProp } from "../videos/bridge/props";

export const FPS = 30;
const CLIPS = ["idle", "walking", "waving", "surprised", "drop_kick"] as const;
type ClipName = (typeof CLIPS)[number];
type Loaded = { model: THREE.Group; clips: Record<ClipName, THREE.AnimationClip>; walkSpeed: number };

// ---------- timeline (frames) ----------
type Seg = { clip: ClipName; a: number; b: number; loop: boolean };
const WALK_A = 50, WALK_B = 140;
const SEGS: Seg[] = [
  { clip: "idle", a: 0, b: WALK_A, loop: true },
  { clip: "walking", a: WALK_A, b: WALK_B, loop: true },
  { clip: "waving", a: WALK_B, b: 205, loop: false },
  { clip: "surprised", a: 205, b: 255, loop: false },
  { clip: "drop_kick", a: 255, b: 345, loop: false },
];
export const TOTAL = 345;
const XF = 8; // crossfade frames between clips
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };

// ---------- loading ----------
let loadP: Promise<Loaded> | null = null;
let unitScale = 0.01; // model units -> metres (set at load)
const toonGrad = (() => { const d = new Uint8Array([90, 170, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const load = () => {
  if (!loadP) {
    const loader = new FBXLoader();
    loadP = Promise.all(CLIPS.map((n) => loader.loadAsync(staticFile(`mixamo/${n}.fbx`)))).then((objs) => {
      const model = objs[0];
      const clips = {} as Record<ClipName, THREE.AnimationClip>;
      let walkSpeed = 1.0;
      objs.forEach((o, i) => {
        // Mixamo FBX files hold the real take ("mixamo.com") plus an empty "Take 001", in either order: use the longest
        const clip = [...o.animations].sort((x, y) => y.duration - x.duration)[0].clone();
        clip.name = CLIPS[i];
        const hips = clip.tracks.find((t) => /Hips\.position$/.test(t.name));
        if (hips && (CLIPS[i] === "walking" || CLIPS[i] === "idle" || CLIPS[i] === "waving")) {
          // strip forward/sideways root motion (the timeline moves the character); keep the vertical bob
          const v = hips.values, n = v.length / 3;
          if (CLIPS[i] === "walking") walkSpeed = Math.abs(v[(n - 1) * 3 + 2] - v[2]) / clip.duration || 100; // model units/s (converted below)
          for (let k = 1; k < n; k++) { v[k * 3] = v[0]; v[k * 3 + 2] = v[2]; }
        }
        clips[CLIPS[i]] = clip;
      });
      // toon materials: keep the albedo texture, flat 3-step light, no gloss
      model.traverse((c) => {
        const m = c as THREE.SkinnedMesh;
        if (!m.isMesh) return;
        m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
        const old = (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshPhongMaterial[];
        const mats = old.map((o) => new THREE.MeshToonMaterial({ map: o.map ?? null, color: o.map ? 0xffffff : o.color, gradientMap: toonGrad, transparent: false, alphaTest: o.alphaMap ? 0.5 : 0, alphaMap: o.alphaMap ?? null }));
        m.material = Array.isArray(m.material) ? mats : mats[0];
      });
      // scale by the real height: head-top bone in the bind pose -> 1.78 m
      model.updateMatrixWorld(true);
      const top = model.getObjectByName("mixamorigHeadTop_End") ?? model.getObjectByName("mixamorigHead");
      const h = top ? top.getWorldPosition(new THREE.Vector3()).y : 180;
      const k = 1.78 / Math.max(1e-3, h);
      model.scale.setScalar(k);
      unitScale = k;
      return { model, clips, walkSpeed: walkSpeed * k };
    });
  }
  return loadP;
};

// ---------- stage ----------
const Stage: React.FC<{ L: Loaded }> = ({ L }) => {
  const f = useCurrentFrame();
  const { gl, scene, camera } = useThree();
  const outline = useMemo(() => new OutlineEffect(gl, { defaultThickness: 0.004, defaultColor: [0.05, 0.04, 0.06] }), [gl]);
  const mixer = useMemo(() => new THREE.AnimationMixer(L.model), [L]);
  const actions = useMemo(() => Object.fromEntries(CLIPS.map((n) => { const a = mixer.clipAction(L.clips[n]); a.play(); return [n, a]; })) as Record<ClipName, THREE.AnimationAction>, [mixer, L]);
  const world = useMemo(() => {
    const g = new THREE.Group();
    const ground = new THREE.Mesh(new THREE.CircleGeometry(14, 48), new THREE.MeshToonMaterial({ color: "#7cb35a", gradientMap: toonGrad }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
    const path = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.6), new THREE.MeshToonMaterial({ color: "#d9c39a", gradientMap: toonGrad }));
    path.rotation.x = -Math.PI / 2; path.position.set(-0.5, 0.005, 0); path.receiveShadow = true; g.add(path);
    const place = (name: string, x: number, z: number, h: number, ry = 0) => {
      const o = makeProp(name)!; const b = new THREE.Box3().setFromObject(o); const s = h / (b.max.y - b.min.y);
      o.scale.setScalar(s); o.position.set(x, -b.min.y * s, z); o.rotation.y = ry;
      o.traverse((c) => { const m = c as THREE.Mesh; if (m.isMesh) { const om = m.material as THREE.MeshStandardMaterial; m.material = new THREE.MeshToonMaterial({ color: om.color, gradientMap: toonGrad }); m.castShadow = m.receiveShadow = true; } });
      g.add(o);
    };
    place("stall-red", -2.6, -3.2, 2.6, 0.25); place("stall-green", 1.2, -3.6, 2.6, -0.1); place("stall-bench", 2.6, -1.4, 0.75, -0.5);
    place("lantern", -1.4, -1.6, 2.6); place("lantern", 3.4, -2.4, 2.6); place("cart", 4.2, -4.5, 1.5, 0.6);
    for (const [x, z] of [[-3.5, -1.2], [-2.8, -0.9], [2.0, -0.8], [0.4, -1.5], [3.0, 0.9]]) place("flower_redA", x, z, 0.4);
    for (const [x, z] of [[-1.8, 1.2], [1.6, 1.3], [-0.6, -1.1], [2.4, -1.9]]) place("grass_large", x, z, 0.35);
    g.add(L.model);
    return g;
  }, [L]);

  // which clips are active and how strongly (crossfade XF frames into each new segment)
  for (const n of CLIPS) actions[n].setEffectiveWeight(0);
  SEGS.forEach((s, i) => {
    const prev = SEGS[i - 1], next = SEGS[i + 1];
    const fadeIn = i === 0 ? 1 : smooth((f - s.a) / XF);
    const fadeOut = next ? 1 - smooth((f - next.a) / XF) : 1;
    const inRange = f >= s.a && (!next || f < next.a + XF);
    if (!inRange) return;
    const w = Math.min(fadeIn, fadeOut);
    const a = actions[s.clip], d = s.clip === "walking" ? L.clips.walking.duration : L.clips[s.clip].duration;
    const t = (f - s.a) / FPS;
    a.time = s.loop ? t % d : Math.min(t, d - 1e-3);
    a.setEffectiveWeight(w);
    void prev;
  });
  mixer.update(0);

  // root placement: walk in from the left along x, then turn to face the camera
  const walkDist = L.walkSpeed * (WALK_B - WALK_A) / FPS;
  const x0 = -walkDist + 0.0;
  const x = f < WALK_A ? x0 : f < WALK_B ? x0 + walkDist * ((f - WALK_A) / (WALK_B - WALK_A)) : 0;
  L.model.position.set(x, 0, 0);
  const turnIn = smooth((f - (WALK_A - 10)) / 12), turnOut = smooth((f - (WALK_B - 4)) / 14);
  L.model.rotation.y = (Math.PI / 2) * turnIn * (1 - turnOut);

  // camera: slow push-in, small kick on the drop kick
  const cam = camera as THREE.PerspectiveCamera;
  L.model.updateMatrixWorld(true);
  const hip = (L.model.getObjectByName("mixamorigHips") ?? L.model).getWorldPosition(new THREE.Vector3());
  const push = f / TOTAL;
  cam.position.set(0.4 + hip.x * 0.6, 1.3, 6.4 - push * 1.2);
  cam.lookAt(hip.x * 0.8, 0.95, 0);
  cam.fov = 34; cam.updateProjectionMatrix();

  useFrame(() => { outline.render(scene, camera); }, 1);
  useEffect(() => () => { mixer.stopAllAction(); }, [mixer]);
  return <primitive object={world} />;
};

const useLoaded = () => {
  const [L, setL] = useState<Loaded | null>(null);
  const [h] = useState(() => delayRender("mixamo fbx", { timeoutInMilliseconds: 300000 }));
  useEffect(() => { load().then((l) => { setL(l); continueRender(h); }); }, [h]);
  return L;
};

export const MixamoTest: React.FC = () => {
  const L = useLoaded();
  return (
    <AbsoluteFill style={{ background: "#9fd3f0" }}>
      {L ? (
        <ThreeCanvas linear width={1080} height={1920} shadows camera={{ fov: 34, near: 0.1, far: 200 }} style={{ background: "#9fd3f0" }}>
          <hemisphereLight args={["#cfe8ff", "#6b8f4e", 0.9]} />
          <directionalLight position={[4, 7, 5]} intensity={2.4} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048}
            shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-bias={-0.0005} />
          <Stage L={L} />
        </ThreeCanvas>
      ) : null}
    </AbsoluteFill>
  );
};
