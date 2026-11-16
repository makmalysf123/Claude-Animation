// "Teras kampung pagi": the front of a wooden kampung house on a sunny morning, built to the reference's environment
// look (frame-by-frame-mine-salting.md, sections H-I): textured stylised-real surfaces (wood grain, plaster stains,
// clay tiles, packed dirt with real pebbles and grass), warm low sun with long soft shadows, cool sky fill, a warm bulb,
// light shafts and floating dust, haze. No ink outlines on the world (only the characters have them).
// Axes: the facade is the plane z = 0 facing +z; the yard is z > 1.6; x to the right as seen from the yard.
import * as THREE from "three";
import { woodPlanks, dirt, plaster, rooftiles, bamboo, terracotta, stone, bananaLeaf, grassTuft, snakeLeaf, shaftTex, curtain, rnd } from "./textures";

const std = (t: { map: THREE.Texture; normal: THREE.Texture }, rep: [number, number], extra: THREE.MeshStandardMaterialParameters = {}) => {
  const map = t.map.clone(), normal = t.normal.clone(); map.repeat.set(...rep); normal.repeat.set(...rep); map.needsUpdate = normal.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map, normalMap: normal, normalScale: new THREE.Vector2(1, 1), roughness: 0.88, metalness: 0, ...extra });
};
const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, p: [number, number, number], r: [number, number, number] = [0, 0, 0], cast = true) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.rotation.set(...r); m.castShadow = cast; m.receiveShadow = true; return m;
};
const box = (w: number, h: number, d: number, mat: THREE.Material, p: [number, number, number], r?: [number, number, number], cast = true) => mesh(new THREE.BoxGeometry(w, h, d), mat, p, r, cast);
const paperTex = (draw: (g: CanvasRenderingContext2D) => void, w = 256, h = 320) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

export class TerasSet {
  root = new THREE.Group();
  sun = new THREE.DirectionalLight("#ffd9a8", 3.4);
  hemi = new THREE.HemisphereLight("#c9dbff", "#a07a52", 1.5);
  sunDir = new THREE.Vector3();
  private sway: { o: THREE.Object3D; base: THREE.Euler; amp: number; f: number; ph: number }[] = [];
  private cage = new THREE.Group(); private bulb!: THREE.Mesh; private dust!: THREE.Points; private shafts: THREE.Mesh[] = [];

  constructor() {
    const R = this.root;
    // ---------------- light ----------------
    this.sun.position.set(-6, 3.6, 9.5); // low morning sun: rakes across the yard and reaches under the eave this.sun.target.position.set(0, 0.8, 1); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096); Object.assign(this.sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.02; this.sun.shadow.radius = 4;
    this.sunDir.copy(this.sun.position).sub(this.sun.target.position).normalize();
    R.add(this.sun, this.sun.target, this.hemi);
    const bounce = new THREE.PointLight("#ffb978", 1.2, 9, 1.6); bounce.position.set(0, 0.4, 3.5); R.add(bounce); // warm bounce off the sunny yard

    // ---------------- ground ----------------
    const ground = mesh(new THREE.PlaneGeometry(40, 40), std(dirt(), [14, 14], { roughness: 0.95 }), [0, 0, 8], [-Math.PI / 2, 0, 0], false); R.add(ground);
    // pebbles (real 3D, catch the low sun), grass tufts along the house and in the yard, fallen leaves
    const pebGeo = new THREE.DodecahedronGeometry(1, 0), pebMat = std(stone(), [1, 1]);
    const peb = new THREE.InstancedMesh(pebGeo, pebMat, 420); const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Sv = new THREE.Vector3(), P = new THREE.Vector3();
    for (let i = 0; i < 420; i++) { const s = 0.01 + rnd() ** 3 * 0.04; P.set((rnd() - 0.5) * 12, s * 0.35, 1.7 + rnd() * 7); Q.setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3)); Sv.set(s * (0.8 + rnd() * 0.6), s * 0.6, s); M.compose(P, Q, Sv); peb.setMatrixAt(i, M); }
    peb.castShadow = true; peb.receiveShadow = true; R.add(peb);
    const gMat = new THREE.MeshStandardMaterial({ map: grassTuft(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1 });
    const gGeo = new THREE.PlaneGeometry(1, 1); gGeo.translate(0, 0.5, 0);
    const grass = new THREE.InstancedMesh(gGeo, gMat, 520);
    for (let i = 0; i < 520; i++) {
      const nearHouse = i < 200, x = (rnd() - 0.5) * 12, z = nearHouse ? 1.55 + rnd() * 0.35 : 1.8 + rnd() ** 2 * 7, edgeK = Math.min(1, Math.abs(x) / 3), s = (nearHouse ? 0.22 : 0.12 + 0.18 * edgeK) * (0.7 + rnd() * 0.6);
      if (!nearHouse && Math.abs(x) < 1.6 && z < 5 && rnd() < 0.8) { M.makeScale(0, 0, 0); grass.setMatrixAt(i, M); continue; } // trodden path in front of the step
      P.set(x, 0, z); Q.setFromEuler(new THREE.Euler(0, rnd() * Math.PI, 0)); Sv.set(s * 1.4, s, s); M.compose(P, Q, Sv); grass.setMatrixAt(i, M);
    }
    grass.castShadow = true; grass.receiveShadow = true; R.add(grass);
    const leafMat = new THREE.MeshStandardMaterial({ color: "#8a5a2c", roughness: 1, side: THREE.DoubleSide });
    for (let i = 0; i < 40; i++) R.add(mesh(new THREE.CircleGeometry(0.05 + rnd() * 0.04, 5), leafMat, [-3 + (rnd() - 0.5) * 6, 0.006, 2 + rnd() * 3], [-Math.PI / 2, 0, rnd() * 6], false));

    // ---------------- house: porch, facade, door, window ----------------
    const wood = std(woodPlanks("#9a6a40", 6), [3, 1]), woodDark = std(woodPlanks("#4e2f1a", 4, "dk"), [1, 1]), woodH = std(woodPlanks("#8a5a33", 8, "fl"), [1, 2]);
    const plast = std(plaster(), [3, 0.5]);
    R.add(box(9.4, 0.42, 1.5, plast, [0, 0.21, 0.75])); // porch base
    const deck = box(9.4, 0.05, 1.52, woodH, [0, 0.445, 0.75]); deck.material = std(woodPlanks("#8a5a33", 10, "deck"), [1, 3]); (deck.material as THREE.MeshStandardMaterial).map!.rotation = Math.PI / 2; R.add(deck);
    R.add(box(1.2, 0.2, 0.42, std(stone(), [2, 1]), [-1.4, 0.1, 1.72])); // stone step
    R.add(box(9.4, 2.65, 0.12, wood, [0, 0.47 + 1.325, -0.06])); // plank wall
    const beam = std(woodPlanks("#5a3820", 2, "beam"), [1, 1]);
    for (const y of [0.5, 2.95]) R.add(box(9.5, 0.14, 0.16, beam, [0, y, 0.02]));
    for (const x of [-4.6, -2.3, 3.1, 4.6]) R.add(box(0.14, 2.5, 0.16, beam, [x, 1.72, 0.03]));
    // door with frame and panels
    R.add(box(1.12, 2.12, 0.1, beam, [-1.4, 0.47 + 1.06, 0.04]));
    const door = box(0.92, 2.0, 0.06, woodDark, [-1.4, 0.47 + 1.0, 0.08]); R.add(door);
    for (const [y, h] of [[1.0, 0.7], [1.95, 0.7]]) R.add(box(0.66, h, 0.03, std(woodPlanks("#5d3a22", 3, "pn"), [1, 1]), [-1.4, y, 0.12]));
    R.add(mesh(new THREE.SphereGeometry(0.03, 12, 8), new THREE.MeshStandardMaterial({ color: "#c9a24a", metalness: 0.8, roughness: 0.3 }), [-1.05, 1.45, 0.15]));
    // roster (ventilation blocks) above the door
    for (let i = 0; i < 4; i++) { R.add(box(0.2, 0.2, 0.08, plast, [-1.7 + i * 0.2, 2.72, 0.05])); R.add(box(0.1, 0.1, 0.02, new THREE.MeshBasicMaterial({ color: "#1c120c" }), [-1.7 + i * 0.2, 2.72, 0.095], undefined, false)); }
    // window: frame, dark room, batik curtain, bars, open shutters
    const wx = 1.25, wy = 1.75;
    R.add(box(1.4, 1.12, 0.1, beam, [wx, wy, 0.04]));
    R.add(box(1.2, 0.95, 0.02, new THREE.MeshStandardMaterial({ color: "#20140e", roughness: 1 }), [wx, wy, 0.07], undefined, false));
    const cg = new THREE.PlaneGeometry(0.5, 0.92, 12, 1); const cp = cg.attributes.position as THREE.BufferAttribute; for (let i = 0; i < cp.count; i++) cp.setZ(i, 0.025 * Math.sin(cp.getX(i) * 28)); cg.computeVertexNormals();
    for (const s of [-1, 1]) R.add(mesh(cg, std(curtain(), [1, 1], { side: THREE.DoubleSide }), [wx + s * 0.34, wy, 0.1]));
    for (let i = -2; i <= 2; i++) R.add(box(0.02, 0.95, 0.02, new THREE.MeshStandardMaterial({ color: "#2a2a2a", metalness: 0.6, roughness: 0.5 }), [wx + i * 0.22, wy, 0.13]));
    for (const s of [-1, 1]) { const sh = new THREE.Group(); sh.position.set(wx + s * 0.62, wy, 0.1); const panel = box(0.6, 1.0, 0.04, std(woodPlanks("#6d4428", 3, "sh"), [1, 1]), [s * 0.3, 0, 0]); for (let k = -3; k <= 3; k++) panel.add(box(0.5, 0.025, 0.05, beam, [0, k * 0.13, 0.02], [0.4, 0, 0])); sh.add(panel); sh.rotation.y = s * 1.9; R.add(sh); }
    // posts and the eave (soffit planks, fascia, clay tile edge)
    for (const x of [-3.7, 3.7]) { R.add(box(0.15, 2.5, 0.15, beam, [x, 0.47 + 1.25, 1.3])); R.add(box(0.26, 0.08, 0.26, plast, [x, 0.49, 1.3])); }
    const sof = mesh(new THREE.PlaneGeometry(9.8, 2.0), std(woodPlanks("#7d5232", 14, "sof"), [1, 1], { side: THREE.DoubleSide }), [0, 2.88, 0.95], [Math.PI / 2 + 0.12, 0, 0]); R.add(sof);
    R.add(box(9.9, 0.16, 0.06, beam, [0, 2.76, 1.97]));
    const tileRow = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.11, 0.42, 10, 1, true, 0, Math.PI), std(rooftiles(), [1, 1], { side: THREE.DoubleSide }), 46);
    for (let i = 0; i < 46; i++) { P.set(-4.95 + i * 0.22, 2.9, 1.95); Q.setFromEuler(new THREE.Euler(Math.PI / 2 - 0.25, 0, 0)); Sv.set(1, 1, 1); M.compose(P, Q, Sv); tileRow.setMatrixAt(i, M); }
    tileRow.castShadow = true; R.add(tileRow);
    const roof = mesh(new THREE.PlaneGeometry(10, 4), std(rooftiles(), [7, 3], { side: THREE.DoubleSide }), [0, 3.4, 0.4], [-Math.PI / 2 + 0.42, 0, 0]); R.add(roof);
    // bulb under the eave (warm glow even in daylight), calendar, bird cage
    R.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.35, 4), new THREE.MeshBasicMaterial({ color: "#111" }), [0.25, 2.62, 1.0], undefined, false));
    this.bulb = mesh(new THREE.SphereGeometry(0.055, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.4, 1.3) }), [0.25, 2.42, 1.0], undefined, false); R.add(this.bulb);
    const cal = mesh(new THREE.PlaneGeometry(0.34, 0.46), new THREE.MeshStandardMaterial({ roughness: 0.9, map: paperTex((g) => { g.fillStyle = "#f3ecdc"; g.fillRect(0, 0, 256, 320); g.fillStyle = "#b8312c"; g.fillRect(0, 0, 256, 90); g.fillStyle = "#fff"; g.font = "bold 34px sans-serif"; g.fillText("NOVEMBER", 30, 58); g.fillStyle = "#333"; for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) g.fillText(String(r * 7 + c + 1), 14 + c * 34, 130 + r * 38); g.fillStyle = "#b8312c"; for (let r = 0; r < 5; r++) g.fillText(String(r * 7 + 1), 14, 130 + r * 38); }) }), [-0.15, 1.95, 0.08], undefined, false); R.add(cal);
    { const cgp = this.cage; cgp.position.set(2.55, 2.72, 1.15); const barM = new THREE.MeshStandardMaterial({ color: "#c9a86a", roughness: 0.6 }), hook = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.25, 4), barM, [0, -0.12, 0], undefined, false); cgp.add(hook);
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; cgp.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.36, 4), barM, [Math.cos(a) * 0.15, -0.48, Math.sin(a) * 0.15])); }
      cgp.add(mesh(new THREE.SphereGeometry(0.155, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), barM, [0, -0.3, 0]));
      cgp.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 20), std(bamboo(), [1, 1]), [0, -0.66, 0]));
      const bird = mesh(new THREE.SphereGeometry(0.045, 12, 8), new THREE.MeshStandardMaterial({ color: "#6f8a3a", roughness: 0.7 }), [0, -0.55, 0]); bird.scale.set(1.3, 1, 1); cgp.add(bird);
      R.add(cgp); }
    // ---------------- porch props ----------------
    const bam = std(bamboo(), [2, 1]);
    const bench = new THREE.Group(); bench.position.set(2.75, 0.47, 0.55);
    bench.add(box(1.6, 0.05, 0.7, bam, [0, 0.42, 0])); for (const [x, z] of [[-0.72, -0.28], [0.72, -0.28], [-0.72, 0.28], [0.72, 0.28]]) bench.add(mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.42, 10), bam, [x, 0.21, z]));
    bench.add(box(1.6, 0.04, 0.05, bam, [0, 0.12, 0.3])); R.add(bench);
    R.add(mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.02, 16), new THREE.MeshStandardMaterial({ color: "#e9e4d8", roughness: 0.4 }), [2.4, 0.95, 0.5])); // a glass of tea on the bench
    R.add(mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.09, 12), new THREE.MeshStandardMaterial({ color: "#c97a2c", transparent: true, opacity: 0.85, roughness: 0.15 }), [2.4, 1.0, 0.5]));
    const pts: THREE.Vector2[] = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.13 + 0.07 * Math.sin(t * Math.PI * 0.9) + (t > 0.92 ? 0.03 : 0), t * 0.36)); }
    const potMat = std(terracotta(), [2, 1]);
    for (const [px, pz, n] of [[-2.85, 0.85, 9], [3.95, 2.15, 7], [-4.2, 2.3, 8]] as const) {
      const yb = px > -3 && pz < 1.4 ? 0.47 : 0; R.add(mesh(new THREE.LatheGeometry(pts, 20), potMat, [px, yb, pz]));
      const lm = new THREE.MeshStandardMaterial({ map: snakeLeaf(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7 });
      for (let i = 0; i < n; i++) { const l = mesh(new THREE.PlaneGeometry(0.12, 0.55 + rnd() * 0.25), lm, [px + (rnd() - 0.5) * 0.12, yb + 0.6, pz + (rnd() - 0.5) * 0.12], [(rnd() - 0.5) * 0.4, rnd() * Math.PI, (rnd() - 0.5) * 0.4]); l.geometry.translate(0, 0, 0); R.add(l); }
    }
    for (const [x, r] of [[-1.52, 0.2], [-1.28, -0.15]] as const) R.add(mesh(new THREE.BoxGeometry(0.11, 0.025, 0.28), new THREE.MeshStandardMaterial({ color: "#2c3a5a", roughness: 0.8 }), [x, 0.215, 1.78], [0, r, 0])); // sandals on the step
    { const broom = new THREE.Group(); broom.position.set(3.55, 0.47, 1.12); broom.rotation.z = 0.22;
      broom.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), bam, [0, 0.95, 0]));
      const sticks = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.95, 24, 1, true), new THREE.MeshStandardMaterial({ color: "#a98a52", roughness: 0.9, side: THREE.DoubleSide })); sticks.position.y = 0.47; sticks.rotation.x = Math.PI; sticks.castShadow = true; broom.add(sticks); R.add(broom); }
    // ---------------- banana tree (left) and a bamboo fence far right ----------------
    { const tree = new THREE.Group(); tree.position.set(-4.7, 0, 3.3);
      tree.add(mesh(new THREE.CylinderGeometry(0.11, 0.16, 2.6, 14), new THREE.MeshStandardMaterial({ color: "#7b8a4a", roughness: 0.9, map: bamboo().map }), [0, 1.3, 0]));
      const lm = new THREE.MeshStandardMaterial({ map: bananaLeaf(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.75 });
      for (let i = 0; i < 8; i++) {
        const g = new THREE.PlaneGeometry(0.55, 2.0, 1, 16); g.translate(0, 1.0, 0); const p = g.attributes.position as THREE.BufferAttribute;
        for (let k = 0; k < p.count; k++) { const y = p.getY(k); p.setZ(k, -0.35 * (y / 2) ** 2 * 2.2); p.setX(k, p.getX(k) * (1 - 0.15 * Math.abs(p.getX(k)))); } g.computeVertexNormals();
        const piv = new THREE.Group(); piv.position.set(0, 2.5, 0); piv.rotation.set(-0.9 - rnd() * 0.5, (i / 8) * Math.PI * 2, 0);
        const lf = new THREE.Mesh(g, lm); lf.castShadow = true; piv.add(lf); tree.add(piv); this.sway.push({ o: piv, base: piv.rotation.clone(), amp: 0.06 + rnd() * 0.05, f: 0.6 + rnd() * 0.5, ph: rnd() * 6 });
      }
      R.add(tree); }
    const fence = std(bamboo(), [6, 1]); R.add(box(6, 1.3, 0.05, fence, [8.2, 0.65, 2.0], [0, -0.3, 0]));
    // neighbouring houses at the sides (same materials, further away in the haze)
    for (const s of [-1, 1]) { const nb = new THREE.Group(); nb.position.set(s * 9.8, 0, -1.5); nb.add(box(5, 2.8, 0.12, std(woodPlanks("#6a4a32", 6, "nb" + s), [3, 1]), [0, 1.4, 0])); nb.add(mesh(new THREE.PlaneGeometry(6, 3), std(rooftiles(), [5, 2], { side: THREE.DoubleSide }), [0, 3.3, 0.6], [-Math.PI / 2 + 0.5, 0, 0])); R.add(nb); }

    // ---------------- light shafts through the banana leaves + dust ----------------
    const sm = new THREE.MeshBasicMaterial({ map: shaftTex(), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    for (let i = 0; i < 4; i++) { const s = mesh(new THREE.PlaneGeometry(0.5 + rnd() * 0.5, 7), sm.clone(), [-3.2 + i * 0.9, 2.4, 2.8 + i * 0.3], [0, 0.4, -0.65], false); this.shafts.push(s); R.add(s); }
    const dg = new THREE.BufferGeometry(), dp: number[] = []; for (let i = 0; i < 260; i++) dp.push((rnd() - 0.5) * 7, rnd() * 3, 0.5 + rnd() * 5);
    dg.setAttribute("position", new THREE.Float32BufferAttribute(dp, 3));
    const dotTex = paperTex((g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(255,240,210,1)"); gr.addColorStop(1, "rgba(255,240,210,0)"); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); }, 32, 32);
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ map: dotTex, size: 0.025, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
    R.add(this.dust);
  }
  /** per-frame life: leaves sway, cage swings, bulb breathes, shafts shimmer, dust drifts */
  update(t: number) {
    for (const s of this.sway) { s.o.rotation.x = s.base.x + s.amp * Math.sin(t * s.f * Math.PI * 2 + s.ph); s.o.rotation.z = s.base.z + s.amp * 0.6 * Math.sin(t * s.f * 1.3 + s.ph); }
    this.cage.rotation.z = 0.05 * Math.sin(t * 1.7); this.cage.rotation.x = 0.03 * Math.sin(t * 1.3 + 1);
    this.shafts.forEach((m, i) => ((m.material as THREE.MeshBasicMaterial).opacity = 0.12 + 0.05 * Math.sin(t * 0.8 + i * 1.7)));
    this.dust.position.set(0.05 * Math.sin(t * 0.3), 0.04 * t % 0.6, 0.03 * Math.cos(t * 0.25));
    this.dust.rotation.y = t * 0.02;
  }
}
