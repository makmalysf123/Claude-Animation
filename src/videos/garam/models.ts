// Downloaded 3D models for "Garam di Pohon Kelapa" (public/garam/models/), loaded once before the film renders.
// Credits and licences: public/garam/models/CREDITS.md. Same normalising as the Plester film: centred on x/z, standing on
// y = 0, scaled to a real size, shadows on. `mdl(name)` returns a fresh clone; `recolor` / `sickLeaves` change materials.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";

/** file, and the real size we want: [axis, metres] (h = height, l = longest horizontal side) */
const LIST: Record<string, [string, "h" | "l", number, string?]> = {
  coco_palm: ["coco_palm.glb", "h", 8.5], coco_palm2: ["coco_palm2.glb", "h", 10], coconut: ["coconut.glb", "l", 0.24, "Sphere001"],
  sack: ["sack.glb", "h", 0.72], bag_open: ["bag_open.glb", "l", 0.5], house: ["house.glb", "h", 5.6], stand: ["stand.glb", "h", 2.5],
  shelves: ["shelves.glb", "h", 1.9], shelf_tall: ["shelf_tall.glb", "h", 1.9], jar: ["jar.glb", "h", 0.34], hoe: ["hoe.glb", "l", 1.25],
  boat: ["boat.glb", "l", 6.2], pickup: ["pickup.glb", "l", 4.9], chicken: ["chicken.glb", "h", 0.42], bushes: ["bushes.glb", "l", 4],
  fern: ["fern.glb", "l", 1.3], grass: ["grass.glb", "l", 0.7], rocks: ["rocks.glb", "l", 0.6], banana: ["banana.glb", "h", 4.2],
  table: ["table.glb", "l", 1.7], cloud_1: ["cloud_1.glb", "l", 1], cloud_2: ["cloud_2.glb", "l", 1], scooter: ["scooter_matic.glb", "l", 1.85],
};
const BANK: Record<string, THREE.Object3D> = {};
/** a palm is centred on its trunk foot (its crown leans, so the bounding-box centre is beside the trunk) */
const trunkBase = (o: THREE.Object3D, b: THREE.Box3) => {
  const lim = b.min.y + (b.max.y - b.min.y) * 0.02, v = new THREE.Vector3(), sum = new THREE.Vector3(); let n = 0;
  o.traverse((x) => { const me = x as THREE.Mesh; if (!me.isMesh) return; const pa = me.geometry.attributes.position; for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(me.matrixWorld); if (v.y < lim) { sum.add(v); n++; } } });
  return n ? sum.divideScalar(n) : null;
};
let P: Promise<void> | null = null;
export const loadModels = () => (P ??= (() => {
  const L = new GLTFLoader();
  return Promise.all(Object.entries(LIST).map(([n, [f, ax, m, part]]) => L.loadAsync(staticFile(`garam/models/${f}`)).then((g) => {
    let o: THREE.Object3D = g.scene; if (part) { o.updateMatrixWorld(true); const keep = o.getObjectByName(part)!; const grp = new THREE.Group(); keep.matrixWorld.decompose(keep.position, keep.quaternion, keep.scale); keep.removeFromParent(); grp.add(keep); o = grp; } o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const k = m / (ax === "h" ? s.y : Math.max(s.x, s.z)); const W = new THREE.Group(); const base = n.startsWith("coco_palm") ? trunkBase(o, b) : null; o.position.set(-(base?.x ?? c.x), -b.min.y, -(base?.z ?? c.z)); W.add(o); W.scale.setScalar(k);
    o.traverse((x) => { const me = x as THREE.Mesh; if (me.isMesh) { me.castShadow = me.receiveShadow = true; const ms = Array.isArray(me.material) ? me.material : [me.material]; ms.forEach((q) => { const sm = q as THREE.MeshStandardMaterial; if (sm.isMeshStandardMaterial) { if (sm.metalness > 0.5 && !sm.metalnessMap) sm.metalness = 0.3; if (sm.map) sm.map.anisotropy = 8; } }); } });
    BANK[n] = W;
  })));
})().then(() => undefined));
export const hasModels = () => Object.keys(BANK).length === Object.keys(LIST).length;
/** a fresh copy of a model (scaled, on the ground); `s` multiplies the normalised size */
export const mdl = (n: string, s = 1) => { const o = BANK[n].clone(true); o.scale.multiplyScalar(s); return o; };
/** give a model new colours by material name (materials are cloned so other copies keep theirs) */
export const recolor = (o: THREE.Object3D, map: Record<string, string>, rough = 0.85) => {
  const done = new Map<THREE.Material, THREE.Material>();
  o.traverse((x) => { const me = x as THREE.Mesh; if (!me.isMesh) return;
    const swap = (q: THREE.Material) => { if (done.has(q)) return done.get(q)!; const c = (q as THREE.MeshStandardMaterial).clone(); const col = map[q.name]; if (col) c.color.set(col); if (c.isMeshStandardMaterial) c.roughness = Math.max(c.roughness, rough); done.set(q, c); return c; };
    me.material = Array.isArray(me.material) ? me.material.map(swap) : swap(me.material); });
  return o;
};
/** where a palm geometry's crown sits (geometry units): centre of the top 35% of vertices, and the height where the
 *  fronds start (cached per geometry) */
const crownCache = new Map<string, THREE.Vector3>();
const crownOfGeo = (g: THREE.BufferGeometry) => {
  let c = crownCache.get(g.uuid); if (c) return c; g.computeBoundingBox(); const b = g.boundingBox!, pa = g.attributes.position, lim = b.min.y + (b.max.y - b.min.y) * 0.65;
  let x = 0, z = 0, n = 0; for (let i = 0; i < pa.count; i++) if (pa.getY(i) > lim) { x += pa.getX(i); z += pa.getZ(i); n++; } x /= n; z /= n;
  const ys: number[] = []; for (let i = 0; i < pa.count; i++) if (Math.hypot(pa.getX(i) - x, pa.getZ(i) - z) < (b.max.y - b.min.y) * 0.03) ys.push(pa.getY(i)); ys.sort((a, q) => a - q);
  c = new THREE.Vector3(x, ys.length ? ys[Math.floor(ys.length * 0.8)] : b.max.y * 0.85, z); crownCache.set(g.uuid, c); return c;
};
/** the crown centre of a placed palm in world space */
export const crownWorld = (o: THREE.Object3D) => { o.updateMatrixWorld(true); let out: THREE.Vector3 | null = null; o.traverse((x) => { const me = x as THREE.Mesh; if (!out && me.isMesh) out = crownOfGeo(me.geometry).clone().applyMatrix4(me.matrixWorld); }); return out! as THREE.Vector3; };
/** a palm whose health can change over time. sick 1: chloride-poor straw-yellow fronds that hang down limp and pull in
 *  (a thin, drooping crown); sick 0: green fronds that arch up and spread out (a full crown). `setHealth` changes it live
 *  (used for the time-lapse). `seed` varies the patchiness per tree. */
export const sickLeaves = (o: THREE.Object3D, k: number, seed = 0) => {
  const U: { uSick: { value: number }; uSeed: { value: number } }[] = [];
  o.traverse((x) => { const me = x as THREE.Mesh; if (!me.isMesh) return;
    const C = crownOfGeo(me.geometry), H = me.geometry.boundingBox!.max.y; const u = { uSick: { value: k }, uSeed: { value: seed } }; U.push(u);
    const m = (me.material as THREE.MeshStandardMaterial).clone(); m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u, { uC: { value: C }, uH: { value: H } });
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uSick; uniform vec3 uC; uniform float uH;")
        .replace("#include <begin_vertex>", `#include <begin_vertex>
        { vec2 r = transformed.xz - uC.xz; float d = length(r) / uH; float up = smoothstep(uC.y - uH * 0.08, uC.y + uH * 0.02, transformed.y);
          float w = up * smoothstep(0.03, 0.09, d); float droop = mix(-0.35, 1.0, uSick);
          transformed.y -= w * droop * uH * 2.6 * d * d; transformed.xz -= r * w * 0.16 * max(0.0, droop) * smoothstep(0.05, 0.35, d); }`);
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uSick; uniform float uSeed;")
        .replace("#include <map_fragment>", `#include <map_fragment>
        { vec3 c = diffuseColor.rgb; float green = smoothstep(-0.03, 0.07, c.g - max(c.r, c.b) * 0.86);
          float pch = 0.5 + 0.5 * sin(vMapUv.x * 37.0 + vMapUv.y * 23.0 + uSeed * 5.1);
          float lum = dot(c, vec3(0.3, 0.55, 0.15));
          vec3 straw = vec3(0.86, 0.68, 0.28) * (0.65 + 0.7 * lum), dry = vec3(0.55, 0.38, 0.2) * (0.7 + 0.6 * lum);
          vec3 lush = c * vec3(0.82, 1.08, 0.8);
          diffuseColor.rgb = mix(mix(c, lush, (1.0 - uSick) * green), mix(straw, dry, pch * 0.7), green * uSick * (0.7 + 0.3 * pch)); }`);
    }; m.customProgramCacheKey = () => "sick2"; me.material = m; });
  o.userData.health = U; return o;
};
export const setHealth = (o: THREE.Object3D, sick: number) => { for (const u of (o.userData.health ?? []) as { uSick: { value: number } }[]) u.uSick.value = sick; };
/** coconut husk colour (the downloaded nut is textured orange): plain husk colour, a little sheen */
export const nutCol = (o: THREE.Object3D, husk: string, rough = 0.55) => {
  o.traverse((x) => { const me = x as THREE.Mesh; if (!me.isMesh) return; const m = (me.material as THREE.MeshStandardMaterial).clone(); m.map = null; m.color.set(husk); m.roughness = rough; m.needsUpdate = true; me.material = m; });
  return o;
};
