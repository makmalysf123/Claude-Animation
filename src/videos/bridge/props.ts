// Our own procedural props: stand-ins for the Kenney models (kenney.nl), built from three.js primitives.
// Each prop is a THREE.Group with its base near y = 0; build.ts scales it to the placement height, merges it by
// material and converts every material to the shared two-tone Lambert look (toLambert), so only colour + shape
// matter here. Material names reuse build.ts RECOLOR keys where they exist (wood, woodDark, stone, grass).
import * as THREE from "three";

const mats = new Map<string, THREE.MeshStandardMaterial>();
const M = (name: string, color: string) => {
  const k = name + color;
  let m = mats.get(k);
  if (!m) { m = new THREE.MeshStandardMaterial({ color, name }); mats.set(k, m); }
  return m;
};
const mesh = (g: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  g.add(m); return m;
};
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt: number, rb: number, h: number, seg = 10) => new THREE.CylinderGeometry(rt, rb, h, seg);
const rng = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

const WOOD = () => M("wood", "#a8724a"), WOOD_D = () => M("woodDark", "#7a4f33"), IRON = () => M("iron", "#3b3f47");

/** street lantern: iron post, glass box with a warm lamp, little roof and finial (~2.8 units tall) */
const lantern = () => {
  const g = new THREE.Group();
  mesh(g, cyl(0.12, 0.16, 0.25), IRON(), 0, 0.12);
  mesh(g, cyl(0.05, 0.06, 2.1), IRON(), 0, 1.3);
  mesh(g, box(0.34, 0.06, 0.34), IRON(), 0, 2.36);
  mesh(g, box(0.3, 0.36, 0.3), M("lampGlass", "#ffe6a3"), 0, 2.57);
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) mesh(g, box(0.035, 0.38, 0.035), IRON(), x * 0.15, 2.57, z * 0.15);
  mesh(g, new THREE.ConeGeometry(0.28, 0.2, 4), IRON(), 0, 2.85, 0, 0, Math.PI / 4);
  mesh(g, new THREE.SphereGeometry(0.05, 8, 6), IRON(), 0, 2.98);
  return g;
};

/** spoked wheel in the x-y plane, radius r */
const wheel = (g: THREE.Group, x: number, y: number, z: number, r: number) => {
  mesh(g, new THREE.TorusGeometry(r, r * 0.09, 6, 20), WOOD_D(), x, y, z);
  mesh(g, cyl(r * 0.16, r * 0.16, r * 0.3, 10), WOOD_D(), x, y, z, Math.PI / 2);
  for (let k = 0; k < 6; k++) mesh(g, box(r * 0.07, r * 1.9, r * 0.07), WOOD_D(), x, y, z, 0, 0, (k * Math.PI) / 6);
};
/** hand cart: plank bed with side boards, two big wheels, shafts, a few sacks (~2.2 units tall incl. sacks) */
const cart = () => {
  const g = new THREE.Group();
  const bedY = 0.85;
  mesh(g, box(2.2, 0.12, 1.2), WOOD(), 0, bedY);
  for (const s of [-1, 1]) mesh(g, box(2.2, 0.4, 0.07), WOOD(), 0, bedY + 0.24, s * 0.58);
  mesh(g, box(0.07, 0.4, 1.2), WOOD(), -1.07, bedY + 0.24, 0);
  for (const s of [-1, 1]) wheel(g, -0.2, 0.62, s * 0.72, 0.62);
  mesh(g, cyl(0.04, 0.04, 1.6), WOOD_D(), -0.2, 0.62, 0, Math.PI / 2);
  for (const s of [-1, 1]) mesh(g, box(1.6, 0.07, 0.07), WOOD_D(), 1.85, bedY - 0.1, s * 0.4, 0, 0, 0.12);
  const sack = M("sack", "#d8c49a");
  for (const [x, z, r] of [[-0.6, -0.2, 0.36], [0.05, 0.22, 0.34], [-0.25, 0.18, 0.3]]) {
    const m = mesh(g, new THREE.SphereGeometry(r, 12, 9), sack, x, bedY + 0.06 + r * 0.8, z);
    m.scale.set(1, 1.25, 0.9);
  }
  return g;
};

/** market stall: counter, four posts, striped sloping awning, crates of fruit (~3.2 units tall) */
const stall = (main: string) => () => {
  const g = new THREE.Group();
  const W = 2.6, D = 1.4;
  mesh(g, box(W, 0.9, D * 0.75), WOOD(), 0, 0.45, 0.15);
  mesh(g, box(W + 0.1, 0.08, D * 0.85), WOOD_D(), 0, 0.94, 0.15);
  for (const [x, z, h] of [[-1, -1, 2.55], [1, -1, 2.55], [-1, 1, 2.25], [1, 1, 2.25]]) mesh(g, box(0.1, h, 0.1), WOOD_D(), x * (W / 2 - 0.05), h / 2, z * (D / 2));
  // striped awning: alternating strips, sloping toward +z, with a scalloped valance
  const n = 8, sw = (W + 0.4) / n, white = M("awningWhite", "#f3ead6"), col = M("awning" + main, main);
  for (let i = 0; i < n; i++) {
    const x = -W / 2 - 0.2 + sw * (i + 0.5), m = i % 2 ? white : col;
    mesh(g, box(sw, 0.05, D + 0.6), m, x, 2.55, 0.05, -0.22);
    // scallop: a half disc hanging under the front edge of the awning
    mesh(g, new THREE.CylinderGeometry(sw / 2, sw / 2, 0.05, 12, 1, false, -Math.PI / 2, Math.PI), m, x, 2.4, D / 2 + 0.36, Math.PI / 2);
  }
  // fruit crates on the counter
  const fruit = [M("fruitRed", "#d9442f"), M("fruitOrange", "#f09a2c"), M("fruitGreen", "#7cb342")];
  const r = rng(main.length * 97 + 7);
  for (let c = 0; c < 3; c++) {
    const cx = -0.8 + c * 0.8;
    mesh(g, box(0.62, 0.22, 0.5), WOOD(), cx, 1.09, 0.3);
    for (let k = 0; k < 7; k++) mesh(g, new THREE.SphereGeometry(0.085, 10, 8), fruit[c], cx - 0.22 + (k % 4) * 0.15 + r() * 0.03, 1.25 + (k > 3 ? 0.06 : 0), 0.18 + (k > 3 ? 0.13 : 0) + r() * 0.05);
  }
  return g;
};

/** bench: plank seat and back on two legs (~1 unit tall) */
const bench = () => {
  const g = new THREE.Group();
  mesh(g, box(1.8, 0.08, 0.45), WOOD(), 0, 0.48, 0);
  mesh(g, box(1.8, 0.3, 0.06), WOOD(), 0, 0.82, -0.22, -0.12);
  for (const s of [-1, 1]) { mesh(g, box(0.08, 0.48, 0.4), WOOD_D(), s * 0.75, 0.24, 0); mesh(g, box(0.07, 0.5, 0.07), WOOD_D(), s * 0.75, 0.72, -0.2, -0.12); }
  return g;
};

/** windmill: tapered octagonal tower, gallery, conical cap and four lattice sails facing +z (~16 units tall) */
const windmill = () => {
  const g = new THREE.Group();
  mesh(g, cyl(2.0, 3.0, 9, 8), M("millWall", "#ecdab2"), 0, 4.5);
  mesh(g, cyl(3.2, 3.2, 0.25, 8), WOOD_D(), 0, 5.2);
  mesh(g, new THREE.ConeGeometry(2.4, 2.6, 8), M("millRoof", "#c8664c"), 0, 10.3);
  mesh(g, box(1.0, 1.7, 0.2), WOOD_D(), 0, 0.85, 2.95, -0.1);
  for (const [y, a] of [[6.8, 0], [3.2, Math.PI / 2]]) mesh(g, box(0.7, 0.8, 0.15), M("millWindow", "#3f6fb5"), Math.sin(a) * 2.3, y, Math.cos(a) * 2.3, 0, a);
  const hub = new THREE.Group(); hub.position.set(0, 9.6, 2.6); hub.rotation.z = 0.35; g.add(hub);
  mesh(hub, cyl(0.35, 0.35, 0.6), WOOD_D(), 0, 0, 0, Math.PI / 2);
  for (let k = 0; k < 4; k++) {
    const arm = new THREE.Group(); arm.rotation.z = (k * Math.PI) / 2; hub.add(arm);
    mesh(arm, box(0.22, 6.2, 0.16), WOOD_D(), 0, 3.3, 0.25);
    mesh(arm, box(1.25, 5.0, 0.05), M("sailCloth", "#f3ead6"), 0.72, 3.8, 0.3);
    for (let j = 0; j < 6; j++) mesh(arm, box(1.3, 0.06, 0.08), WOOD_D(), 0.72, 1.5 + j * 0.92, 0.33);
  }
  return g;
};

/** canoe: a long shallow hull (squashed half-sphere) with a darker inside and two thwarts (~0.7 units tall) */
const canoe = () => {
  const g = new THREE.Group();
  const hull = mesh(g, new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M("canoeHull", "#b5543c"), 0, 0.55, 0);
  hull.scale.set(2.4, 0.55, 0.55); hull.rotation.x = 0;
  const inner = mesh(g, new THREE.CircleGeometry(1, 24), M("canoeInside", "#6e3b2a"), 0, 0.53, 0, -Math.PI / 2);
  inner.scale.set(2.3, 0.5, 1);
  for (const x of [-0.7, 0.7]) mesh(g, box(0.1, 0.05, 1.0), WOOD(), x, 0.5, 0);
  return g;
};

/** lily pad with a notch and sometimes a pink flower (flat, ~0.08 units tall) */
const lily = () => {
  const g = new THREE.Group();
  mesh(g, new THREE.CylinderGeometry(0.6, 0.6, 0.04, 20, 1, false, 0.35, Math.PI * 2 - 0.7), M("lilyPad", "#4f9a3e"), 0, 0.02);
  const p = M("lilyFlower", "#f2a6c2");
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; mesh(g, new THREE.ConeGeometry(0.06, 0.16, 6), p, 0.15 + Math.cos(a) * 0.06, 0.1, 0.1 + Math.sin(a) * 0.06, Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); }
  return g;
};

/** flower: stem, two leaves, five petals and a centre (~0.5 units tall) */
const flower = (petal: string) => () => {
  const g = new THREE.Group();
  const leaf = M("stem", "#4c9a37");
  mesh(g, cyl(0.012, 0.016, 0.42, 6), leaf, 0, 0.21);
  for (const s of [-1, 1]) { const l = mesh(g, new THREE.SphereGeometry(0.06, 8, 6), leaf, s * 0.05, 0.14, 0, 0, 0, s * 0.6); l.scale.set(1.6, 0.4, 0.8); }
  const pm = M("petal" + petal, petal);
  for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; const pe = mesh(g, new THREE.SphereGeometry(0.045, 8, 6), pm, Math.cos(a) * 0.05, 0.44, Math.sin(a) * 0.05); pe.scale.set(1.3, 0.5, 1.3); }
  mesh(g, new THREE.SphereGeometry(0.03, 8, 6), M("flowerCentre", "#f2c230"), 0, 0.46);
  return g;
};

/** grass tuft: a fan of thin blades (~0.5 units tall) */
const grassTuft = (blades: number) => () => {
  const g = new THREE.Group();
  const m = M("grass", "#6aab4f"), r = rng(blades * 31);
  for (let k = 0; k < blades; k++) {
    const a = (k / blades) * Math.PI * 2 + r(), lean = 0.25 + r() * 0.3, h = 0.3 + r() * 0.25;
    const b = mesh(g, new THREE.ConeGeometry(0.03, h, 4), m, Math.cos(a) * 0.06, h / 2, Math.sin(a) * 0.06);
    b.rotation.set(Math.sin(a) * lean, 0, -Math.cos(a) * lean);
  }
  return g;
};

const MAKERS: Record<string, () => THREE.Group> = {
  lantern, cart, "stall-red": stall("#c8463a"), "stall-green": stall("#3f8f5a"), "stall-bench": bench, windmill, canoe,
  lily_large: lily, flower_redA: flower("#d9442f"), flower_yellowA: flower("#f2c230"), flower_purpleA: flower("#8a5cc0"),
  grass: grassTuft(7), grass_large: grassTuft(13),
};

/** our own model for a Kenney prop name (null when we have none) */
export const makeProp = (name: string): THREE.Object3D | null => (MAKERS[name] ? MAKERS[name]() : null);
export const PROP_NAMES = Object.keys(MAKERS);
