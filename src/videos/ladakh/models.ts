// Downloaded 3D models for "Menara Es Dolma" (public/ladakh/models/), loaded once before the film renders.
// The models and their licences are listed in public/ladakh/models/CREDITS.md.
// Normalising is the same as in the Garam film: each model is centred on x/z, stands on y = 0, is scaled to a real
// size, and has shadows on. `mdl(name)` returns a fresh clone, and `recolor` changes material colours by name.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { clone as skClone } from "three/examples/jsm/utils/SkeletonUtils.js";

/** for each model: [file, axis, metres]. The axis is "h" (height) or "l" (longest horizontal side). */
const LIST: Record<string, [string, "h" | "l", number]> = {
  tree_bare: ["tree_bare.glb", "h", 9], tree_bare2: ["tree_bare2.glb", "h", 11], trees_small: ["trees_small.glb", "h", 4.5], poplar: ["poplar.glb", "h", 13],
  ladder: ["ladder.glb", "h", 3.6], bucket: ["bucket.glb", "h", 0.36], shovel: ["shovel.glb", "h", 1.35], rocks: ["rocks.glb", "l", 0.6], rock_big: ["rock_big.glb", "l", 1.6],
  kettle: ["kettle.glb", "h", 0.3], cup: ["cup.glb", "h", 0.1], woodpile: ["woodpile.glb", "l", 1.6], logs: ["logs.glb", "l", 1.4], sheep: ["sheep.glb", "h", 0.85], cow: ["cow.glb", "h", 1.35],
  cloud_1: ["cloud_1.glb", "l", 1], cloud_2: ["cloud_2.glb", "l", 1], table: ["table.glb", "l", 1.5],
};
const BANK: Record<string, THREE.Object3D> = {};
let P: Promise<void> | null = null;
export const loadModels = () => (P ??= (() => {
  const L = new GLTFLoader();
  return Promise.all(Object.entries(LIST).map(([n, [f, ax, m]]) => L.loadAsync(staticFile(`ladakh/models/${f}`)).then((g) => {
    const o = g.scene; o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const k = m / (ax === "h" ? s.y : Math.max(s.x, s.z)); const W = new THREE.Group(); o.position.set(-c.x, -b.min.y, -c.z); W.add(o); W.scale.setScalar(k);
    o.traverse((x) => { const me = x as THREE.Mesh; if (me.isMesh) { me.castShadow = me.receiveShadow = true; const ms = Array.isArray(me.material) ? me.material : [me.material]; ms.forEach((q) => { const sm = q as THREE.MeshStandardMaterial; if (sm.isMeshStandardMaterial) { if (sm.metalness > 0.5 && !sm.metalnessMap) sm.metalness = 0.3; if (sm.map) sm.map.anisotropy = 8; } }); } });
    BANK[n] = W;
  })));
})().then(() => undefined));
export const hasModels = () => Object.keys(BANK).length === Object.keys(LIST).length;
/** a fresh copy of a model (scaled, standing on the ground); `s` multiplies the normalised size */
export const mdl = (n: string, s = 1) => { const o = skClone(BANK[n]); /* SkeletonUtils: rigged animals keep their own bones */ o.scale.multiplyScalar(s); return o; };
/** new colours by material name. Materials are cloned, so other copies keep theirs; "*" recolours every material. */
export const recolor = (o: THREE.Object3D, map: Record<string, string>, rough = 0.85) => {
  const done = new Map<THREE.Material, THREE.Material>();
  o.traverse((x) => { const me = x as THREE.Mesh; if (!me.isMesh) return;
    const swap = (q: THREE.Material) => { if (done.has(q)) return done.get(q)!; const c = (q as THREE.MeshStandardMaterial).clone(); const col = map[q.name] ?? map["*"]; if (col) c.color.set(col); if (c.isMeshStandardMaterial) c.roughness = Math.max(c.roughness, rough); done.set(q, c); return c; };
    me.material = Array.isArray(me.material) ? me.material.map(swap) : swap(me.material); });
  return o;
};
