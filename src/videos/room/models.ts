// Assets for the camera-movement test room (RoomCamTest). Only what the room needs is loaded (a few scanned Poly Haven
// props, four photo textures and one HDR sky) from public/pilot/, plus Quaternius town houses and palms (CC0) from
// public/plester/models/ (credits in the CREDITS.md files there).
// Same normalising as the pilot film: each model is centred on x/z, stands on y = 0 and is scaled to a real size.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { clone as skClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { staticFile } from "remotion";

const ph = (n: string) => `ph/models/${n}/${n}.gltf`;
/** [file under public/pilot/ (or public/<path> after an @), axis, metres]; axis "h" = height, "l" = longest horizontal side */
const LIST: Record<string, [string, "h" | "l", number]> = {
  lamp: [ph("desk_lamp_arm_01"), "h", 0.5], plant_small: [ph("potted_plant_04"), "h", 0.24],
  plant_big: [ph("potted_plant_02"), "h", 1.3], books: [ph("book_encyclopedia_set_01"), "l", 0.4], drawers: [ph("drawer_cabinet"), "h", 0.95],
  side_table: [ph("side_table_01"), "h", 0.52], clock: [ph("wall_clock"), "l", 0.32],
  notepads: [ph("office_notepads"), "l", 0.2], stationery: [ph("stationery_supplies"), "l", 0.2], armchair: [ph("modern_arm_chair_01"), "h", 0.8],
  chair: ["models/chair_exec.glb", "h", 1.1], town_a: ["@plester/models/town_a.glb", "h", 7.2], town_d: ["@plester/models/town_d.glb", "h", 8.4], town_h: ["@plester/models/town_h.glb", "h", 8], palm: ["@plester/models/palm.glb", "h", 6.5], bush: ["models/bush.glb", "l", 1.8],
};
const ALPHA: Record<string, [string, RegExp]> = { plant_big: ["ph/models/potted_plant_02/textures/potted_plant_02_leaves_alpha_1k.jpg", /leaves/] };
const TEX = ["laminate_floor_02", "painted_plaster_wall", "fabric_pattern_07", "dirty_carpet"] as const;
export type TexName = (typeof TEX)[number];
type PbrSet = { map?: THREE.Texture; normalMap?: THREE.Texture; roughnessMap?: THREE.Texture };
const BANK: Record<string, THREE.Object3D> = {}, PBR: Partial<Record<TexName, PbrSet>> = {};
let SKY: THREE.DataTexture | null = null;

let P: Promise<void> | null = null;
export const loadRoom = () => (P ??= (() => {
  const L = new GLTFLoader(), TL = new THREE.TextureLoader();
  const texP = TEX.flatMap((n) => (["map:diff", "normalMap:nor", "roughnessMap:rough"] as const).map((kf) => {
    const [k, f] = kf.split(":") as [keyof PbrSet, string];
    if (n === "fabric_pattern_07" && k === "map") return Promise.resolve();
    return TL.loadAsync(staticFile(`pilot/ph/tex/${n}/${f}.jpg`)).then((t) => { t.colorSpace = k === "map" ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 16; t.wrapS = t.wrapT = THREE.RepeatWrapping; (PBR[n] ??= {})[k] = t; });
  }));
  const skyP = new RGBELoader().loadAsync(staticFile("pilot/ph/hdri/sky_sun.hdr")).then((t) => { t.mapping = THREE.EquirectangularReflectionMapping; SKY = t as THREE.DataTexture; });
  const mdlP = Object.entries(LIST).map(([n, [f, ax, m]]) => L.loadAsync(staticFile(f.startsWith("@") ? f.slice(1) : `pilot/${f}`)).then((g) => {
    const o = g.scene; o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const k = m / (ax === "h" ? s.y : Math.max(s.x, s.z)); const W = new THREE.Group(); o.position.set(-c.x, -b.min.y, -c.z); W.add(o); W.scale.setScalar(k);
    o.traverse((x) => { const me = x as THREE.Mesh; if (!me.isMesh) return; me.castShadow = me.receiveShadow = true; const ms = Array.isArray(me.material) ? me.material : [me.material];
      ms.forEach((q) => { const sm = q as THREE.MeshStandardMaterial; if (sm.isMeshStandardMaterial) { if (sm.metalness > 0.5 && !sm.metalnessMap) sm.metalness = 0.3; if (sm.map) sm.map.anisotropy = 8; } }); });
    BANK[n] = W;
    const am = ALPHA[n]; if (am) return TL.loadAsync(staticFile(`pilot/${am[0]}`)).then((t) => { t.flipY = false; t.colorSpace = THREE.NoColorSpace; o.traverse((x) => { const me = x as THREE.Mesh; if (!me.isMesh) return; const q = me.material as THREE.MeshStandardMaterial; if (!am[1].test(q.name)) return; Object.assign(q, { alphaMap: t, alphaTest: 0.5, transparent: false, side: THREE.DoubleSide }); q.needsUpdate = true; }); });
  }));
  return Promise.all([...texP, skyP, ...mdlP]);
})().then(() => undefined));
export const roomReady = () => Object.keys(BANK).length === Object.keys(LIST).length && !!SKY && Object.keys(PBR).length === TEX.length;
/** a fresh copy of a model; `s` multiplies the normalised size */
export const mdl = (n: string, s = 1) => { const o = skClone(BANK[n]); o.scale.multiplyScalar(s); return o; };
export const mdlBox = (n: string) => new THREE.Box3().setFromObject(BANK[n]);
/** fresh copies of a photo texture set, repeated (u, v) times */
export const pbr = (n: TexName, u = 1, v = u) => { const s = PBR[n]!, o: PbrSet = {}; for (const k of ["map", "normalMap", "roughnessMap"] as const) { const t = s[k]; if (!t) continue; const c = t.clone(); c.repeat.set(u, v); c.needsUpdate = true; o[k] = c; } return o; };
export const skyTex = () => SKY!;
