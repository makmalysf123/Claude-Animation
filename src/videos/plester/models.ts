// Downloaded 3D models for the Plester film (public/plester/models/), loaded once before the film renders. Credits and
// licences: public/plester/models/CREDITS.md. Each model is normalised: centred on x/z, standing on y = 0, scaled to a
// real-world size, shadows on. `mdl(name)` returns a fresh clone (materials shared; recolour with `recolor`).
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";

/** file, and the real size we want: [axis, metres] (h = height, l = longest horizontal side) */
const LIST: Record<string, [string, "h" | "l", number]> = {
  town_a: ["town_a.glb", "h", 11.5], town_b: ["town_b.glb", "h", 11.5], town_c: ["town_c.glb", "h", 13], town_d: ["town_d.glb", "h", 13.5], town_h: ["town_h.glb", "h", 13],
  cloud_1: ["cloud_1.glb", "l", 1], cloud_2: ["cloud_2.glb", "l", 1],
  scooter_matic: ["scooter_matic.glb", "l", 1.85], scooter_vespa: ["scooter_vespa.glb", "l", 1.8], scooter_white: ["scooter_matic2.glb", "l", 1.85],
  vendor_cart: ["vendor_cart.glb", "h", 2.3], market_stalls: ["market_stalls.glb", "h", 2.3], umbrella: ["umbrella.glb", "h", 2.3], palm: ["palm.glb", "h", 7],
  crate: ["ph/plastic_crate_01/plastic_crate_01_1k.gltf", "h", 0.26], basket: ["ph/wicker_basket_01/wicker_basket_01_1k.gltf", "h", 0.12],
  bananas: ["ph/bananas/bananas_1k.gltf", "h", 0.18], chair: ["ph/plastic_monobloc_chair_01/plastic_monobloc_chair_01_1k.gltf", "h", 0.88],
  plant: ["ph/potted_plant_02/potted_plant_02_1k.gltf", "h", 0.84], lamp: ["ph/street_lamp_01/street_lamp_01_1k.gltf", "h", 3.9],
};
const BANK: Record<string, THREE.Object3D> = {};
let P: Promise<void> | null = null;
export const loadModels = () => (P ??= (() => {
  const L = new GLTFLoader();
  return Promise.all(Object.entries(LIST).map(([n, [f, ax, m]]) => L.loadAsync(staticFile(`plester/models/${f}`)).then((g) => {
    const o = g.scene; o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const k = m / (ax === "h" ? s.y : Math.max(s.x, s.z)); const W = new THREE.Group(); o.position.set(-c.x, -b.min.y, -c.z); W.add(o); W.scale.setScalar(k);
    o.traverse((x) => { const me = x as THREE.Mesh; if (me.isMesh) { me.castShadow = me.receiveShadow = true; const ms = Array.isArray(me.material) ? me.material : [me.material]; ms.forEach((q) => { const sm = q as THREE.MeshStandardMaterial; if (sm.isMeshStandardMaterial && sm.metalness > 0.5 && !sm.metalnessMap) sm.metalness = 0.3; }); } });
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
