// "Halaman belakang sore": the back yard of a small kampung house at dusk, for the gold-coin video. The house's back
// wall is the plane z = 0 facing +z; the yard runs to a brick wall at z = 8.4; the low sun sets beyond that wall (so
// shots looking at the house are front-lit and warm, shots looking out are backlit against the sunset).
// A half-dug pond hole sits in the middle of the yard (x -0.2..1.4, z 2.4..3.6, 0.42 m deep) with a fresh dirt mound,
// bricks and a cement sack for the pond beside it. Built from the same textured stylised-real kit as world2/teras.ts.
import * as THREE from "three";
import { woodPlanks, dirt, plaster, rooftiles, bamboo, terracotta, stone, bananaLeaf, grassTuft, rnd, seedRnd, fbm } from "../../lib/world2/textures";
import { canvasTex } from "../ketindihan2/sets";

type V3 = [number, number, number];
const std = (t: { map: THREE.Texture; normal: THREE.Texture }, rep: [number, number], extra: THREE.MeshStandardMaterialParameters = {}) => {
  const map = t.map.clone(), normal = t.normal.clone(); map.repeat.set(...rep); normal.repeat.set(...rep); map.wrapS = map.wrapT = normal.wrapS = normal.wrapT = THREE.RepeatWrapping; map.needsUpdate = normal.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map, normalMap: normal, normalScale: new THREE.Vector2(1, 1), roughness: 0.88, metalness: 0, ...extra });
};
const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, p: V3, r: V3 = [0, 0, 0], cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.rotation.set(...r); m.castShadow = cast; m.receiveShadow = true; return m; };
const box = (w: number, h: number, d: number, mat: THREE.Material, p: V3, r?: V3, cast = true) => mesh(new THREE.BoxGeometry(w, h, d), mat, p, r, cast);

/** the pit */
export const PIT = { x0: -0.4, x1: 1.6, z0: 2.2, z1: 4.0, depth: 0.42, stepZ: 3.3, stepD: 0.14 };
/** where the coin lies in the pit (top face of the coin) */
export const COIN_AT = new THREE.Vector3(0.85, -PIT.stepD + 0.012, 3.55);

/** fresh dug soil: darker, damp, clods and roots */
export const soilTex = () => canvasTex(512, 512, (g) => {
  const img = g.createImageData(512, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) { const n = fbm(x, y, 512, 10, 5), c = fbm(x * 3, y * 3, 512, 40, 2); const k = 0.55 + n * 0.5 + (c > 0.3 ? 0.25 : 0); const i = (y * 512 + x) * 4;
    img.data[i] = 128 * k + 14; img.data[i + 1] = 88 * k + 10; img.data[i + 2] = 58 * k + 6; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  g.strokeStyle = "rgba(170,130,90,0.5)"; g.lineWidth = 1.5; for (let i = 0; i < 18; i++) { g.beginPath(); let x = rnd() * 512, y = rnd() * 512; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 30; y += rnd() * 16; g.lineTo(x, y); } g.stroke(); } // little roots
});
/** red clay bricks (bata merah) with mortar, moss low down */
const brickTex = (key: string, moss = true) => canvasTex(512, 512, (g) => {
  g.fillStyle = "#b7a58c"; g.fillRect(0, 0, 512, 512); void key;
  for (let r = 0; r < 16; r++) for (let c = -1; c < 9; c++) { const x = c * 64 + (r % 2) * 32 + 2, y = r * 32 + 2, v = rnd();
    g.fillStyle = `rgb(${150 + v * 50},${66 + v * 26},${44 + v * 18})`; g.fillRect(x, y, 60, 28);
    for (let k = 0; k < 30; k++) { g.fillStyle = `rgba(${rnd() > 0.5 ? "60,24,16" : "220,150,110"},0.25)`; g.fillRect(x + rnd() * 60, y + rnd() * 28, 2 + rnd() * 3, 1 + rnd() * 2); } }
  if (moss) { const gr = g.createLinearGradient(0, 512, 0, 300); gr.addColorStop(0, "rgba(70,90,40,0.75)"); gr.addColorStop(1, "rgba(70,90,40,0)"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); }
});
/** corrugated zinc with rust streaks */
const zincTex = () => canvasTex(512, 256, (g) => {
  g.fillStyle = "#9a9ea2"; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 40; i++) { const x = rnd() * 512, w = 6 + rnd() * 30, gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(140,70,30,0)"); gr.addColorStop(0.6 + rnd() * 0.3, `rgba(140,70,30,${0.3 + rnd() * 0.4})`); gr.addColorStop(1, "rgba(110,50,20,0.7)"); g.fillStyle = gr; g.fillRect(x, 0, w, 256); }
  for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? "255,255,255" : "60,40,30"},0.15)`; g.fillRect(rnd() * 512, rnd() * 256, 3, 3); }
});
/** a cloth texture: plaid sarung, striped towel, plain tee */
const clothTex = (kind: "sarung" | "towel" | "tee" | "daster") => canvasTex(256, 256, (g) => {
  if (kind === "sarung") { g.fillStyle = "#2f4f7a"; g.fillRect(0, 0, 256, 256); g.globalAlpha = 0.55; g.fillStyle = "#9b2f35"; for (let i = 0; i < 256; i += 64) { g.fillRect(i, 0, 22, 256); g.fillRect(0, i, 256, 22); } g.fillStyle = "#e9d9a8"; for (let i = 30; i < 256; i += 64) { g.fillRect(i, 0, 5, 256); g.fillRect(0, i, 256, 5); } g.globalAlpha = 1; }
  else if (kind === "towel") { g.fillStyle = "#f1ece0"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#d9534f"; g.fillRect(0, 30, 256, 18); g.fillRect(0, 208, 256, 18); g.fillStyle = "#3b7dd8"; g.fillRect(0, 56, 256, 8); g.fillRect(0, 192, 256, 8); }
  else if (kind === "daster") { g.fillStyle = "#d98a3a"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#7a2f4a"; for (let i = 0; i < 24; i++) { const x = rnd() * 256, y = rnd() * 256; g.beginPath(); for (let k = 0; k < 5; k++) { const a = k * 1.2566; g.ellipse(x + 9 * Math.cos(a), y + 9 * Math.sin(a), 6, 3, a, 0, Math.PI * 2); } g.fill(); } }
  else { g.fillStyle = "#e0b43c"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#2c3e66"; g.beginPath(); g.arc(128, 120, 46, 0, Math.PI * 2); g.fill(); g.fillStyle = "#e0b43c"; g.beginPath(); g.arc(128, 120, 30, 0, Math.PI * 2); g.fill(); g.fillStyle = "#c79a2c"; g.fillRect(0, 0, 256, 14); }
  for (let y = 0; y < 256; y += 2) { g.fillStyle = "rgba(0,0,0,0.04)"; g.fillRect(0, y, 256, 1); }
});

export class HalamanSet {
  root = new THREE.Group();
  sun = new THREE.DirectionalLight("#ff9e5a", 3.6);
  hemi = new THREE.HemisphereLight("#8e9ee6", "#8a5a3e", 1.15);
  sunDir = new THREE.Vector3();
  coin!: THREE.Group; coinGlow!: THREE.Sprite; coinLight = new THREE.PointLight("#ffc65a", 0, 1.6, 2);
  private sway: { o: THREE.Object3D; base: THREE.Euler; amp: number; f: number; ph: number }[] = [];
  private cloths: { m: THREE.Mesh; base: Float32Array; ph: number }[] = [];
  private skyMat!: THREE.ShaderMaterial;

  constructor() {
    seedRnd(11);
    const R = this.root;
    // ---------------- light: low sun beyond the far wall, cool dusk sky fill ----------------
    this.sun.position.set(-7.5, 3.9, 15); this.sun.target.position.set(0.3, 0.4, 2.6); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096); Object.assign(this.sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
    this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.03; this.sun.shadow.radius = 5;
    this.sunDir.copy(this.sun.position).sub(this.sun.target.position).normalize();
    R.add(this.sun, this.sun.target, this.hemi);
    const win = new THREE.PointLight("#ffb46a", 1.4, 5, 1.8); win.position.set(1.9, 1.5, 0.7); R.add(win); // warm kitchen light spilling out
    R.add(this.coinLight);

    // ---------------- sky dome: violet zenith, orange-pink horizon, sun glow toward the sunset ----------------
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
      uniforms: { uSun: { value: this.sunDir.clone() } },
      vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: `varying vec3 vD; uniform vec3 uSun;
        void main(){ float h = max(vD.y, 0.0); float s = max(dot(normalize(vD), uSun), 0.0);
          vec3 zen = vec3(0.24,0.25,0.52), mid = vec3(0.62,0.48,0.66), hor = vec3(1.0,0.62,0.42);
          vec3 c = mix(hor, mid, smoothstep(0.0, 0.22, h)); c = mix(c, zen, smoothstep(0.18, 0.7, h));
          c += vec3(1.0,0.55,0.22) * pow(s, 6.0) * 0.55 * (1.0 - smoothstep(0.0,0.5,h)); c += vec3(1.0,0.85,0.55) * pow(s, 90.0) * 1.6; c += vec3(1.2,1.05,0.8) * smoothstep(0.9993, 0.9996, s) * 2.2;
          if (vD.y < 0.0) c = hor * 0.8;
          gl_FragColor = vec4(c, 1.0); }`,
    });
    R.add(new THREE.Mesh(new THREE.SphereGeometry(120, 48, 24), this.skyMat));

    // ---------------- ground with the pit cut out ----------------
    const shape = new THREE.Shape(); shape.moveTo(-30, -30); shape.lineTo(30, -30); shape.lineTo(30, 30); shape.lineTo(-30, 30); shape.closePath();
    const hole = new THREE.Path(); { const n = 28, P = PIT; for (let i = 0; i <= n * 4; i++) { const s = i / n, side = Math.floor(s) % 4, u = s - Math.floor(s); let x: number, z: number;
      if (side === 0) { x = P.x0 + (P.x1 - P.x0) * u; z = P.z0; } else if (side === 1) { x = P.x1; z = P.z0 + (P.z1 - P.z0) * u; } else if (side === 2) { x = P.x1 - (P.x1 - P.x0) * u; z = P.z1; } else { x = P.x0; z = P.z1 - (P.z1 - P.z0) * u; }
      const j = 0.035 * Math.sin(i * 2.3) + 0.02 * Math.sin(i * 5.1); x += side % 2 ? (side === 1 ? j : -j) : 0; z += side % 2 ? 0 : (side === 0 ? -j : j);
      if (i === 0) hole.moveTo(x, -z); else hole.lineTo(x, -z); } }
    shape.holes.push(hole);
    const gg = new THREE.ShapeGeometry(shape, 1); gg.rotateX(-Math.PI / 2);
    { const uv = gg.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.8, uv.getY(i) / 2.8); }
    R.add(mesh(gg, std(dirt(), [1, 1], { roughness: 0.96, color: "#c89e78" }), [0, 0, 0], [0, 0, 0], false));
    // pit: walls + floor in fresh soil (UVs in metres), ragged lip of clods
    const soil = new THREE.MeshStandardMaterial({ map: soilTex(), roughness: 1 }); soil.map!.wrapS = soil.map!.wrapT = THREE.RepeatWrapping;
    const wall = (w: number, p: V3, ry: number) => { const g = new THREE.PlaneGeometry(w, PIT.depth + 0.06, 24, 4); const pp = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pp.count; i++) pp.setZ(i, 0.025 * Math.sin(pp.getX(i) * 9 + pp.getY(i) * 13) + 0.015 * Math.sin(pp.getX(i) * 23)); g.computeVertexNormals(); const m = mesh(g, soil, p, [0, ry, 0], false); return m; };
    const D = PIT.depth, cx = (PIT.x0 + PIT.x1) / 2, cz = (PIT.z0 + PIT.z1) / 2, w = PIT.x1 - PIT.x0, d = PIT.z1 - PIT.z0;
    R.add(wall(w + 0.1, [cx, -D / 2 + 0.02, PIT.z0 - 0.02], 0), wall(w + 0.1, [cx, -D / 2 + 0.02, PIT.z1 + 0.02], Math.PI), wall(d + 0.1, [PIT.x0 - 0.02, -D / 2 + 0.02, cz], Math.PI / 2), wall(d + 0.1, [PIT.x1 + 0.02, -D / 2 + 0.02, cz], -Math.PI / 2));
    { const fg = new THREE.PlaneGeometry(w + 0.1, d + 0.1, 30, 24); const pp = fg.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pp.count; i++) pp.setZ(i, 0.03 * fbm(pp.getX(i) * 60 + 99, pp.getY(i) * 60, 256, 8, 3)); fg.computeVertexNormals(); R.add(mesh(fg, soil, [cx, -D, cz], [-Math.PI / 2, 0, 0], false)); }
    { const sg = new THREE.BoxGeometry(w + 0.06, D - PIT.stepD, PIT.z1 - PIT.stepZ + 0.04, 30, 2, 20); const pp = sg.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i); pp.setXYZ(i, x, y + (y > 0 ? 0.02 * fbm(x * 50 + 9, z * 50, 256, 8, 3) : 0), z + (z < 0 ? 0.03 * Math.sin(x * 11) + 0.02 * Math.sin(y * 30 + x * 5) : 0)); } sg.computeVertexNormals();
      R.add(mesh(sg, soil, [cx, -D + (D - PIT.stepD) / 2, (PIT.stepZ + PIT.z1) / 2 + 0.02], [0, 0, 0], false)); }
    const clodGeo = new THREE.DodecahedronGeometry(1, 1), clods = new THREE.InstancedMesh(clodGeo, soil, 260); const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Sv = new THREE.Vector3(), P = new THREE.Vector3();
    for (let i = 0; i < 260; i++) { const side = i % 4, u = rnd(), s = 0.012 + rnd() ** 2 * 0.035; let x = 0, z = 0, y = 0;
      if (i < 200) { if (side === 0) { x = PIT.x0 + w * u; z = PIT.z0 - 0.05 - rnd() * 0.25; } else if (side === 1) { x = PIT.x1 + 0.05 + rnd() * 0.3; z = PIT.z0 + d * u; } else if (side === 2) { x = PIT.x0 + w * u; z = PIT.z1 + 0.05 + rnd() * 0.25; } else { x = PIT.x0 - 0.05 - rnd() * 0.25; z = PIT.z0 + d * u; } y = s * 0.3; }
      else { x = PIT.x0 + 0.1 + rnd() * (w - 0.2); z = PIT.z0 + 0.1 + rnd() * (d - 0.2); y = (z > PIT.stepZ ? -PIT.stepD : -D) + s * 0.3; if (Math.hypot(x - COIN_AT.x, z - COIN_AT.z) < 0.12) x += 0.3; } // clods on the pit floor and step
      P.set(x, y, z); Q.setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3)); Sv.set(s * 1.3, s * 0.7, s); M.compose(P, Q, Sv); clods.setMatrixAt(i, M); }
    clods.castShadow = clods.receiveShadow = true; R.add(clods);
    // the dirt mound dug out of the pit (left of it)
    { const mg = new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2); const pp = mg.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i), n = 1 + 0.18 * fbm(x * 40 + 50, z * 40 + y * 30, 256, 6, 3); pp.setXYZ(i, x * n, y * n * (0.8 + 0.2 * Math.sin(x * 5)), z * n); } mg.computeVertexNormals();
      const mound = mesh(mg, soil, [-1.2, -0.02, 2.9], [0, 0.4, 0]); mound.scale.set(0.62, 0.34, 0.75); R.add(mound);
      const m2 = mesh(mg, soil, [-0.95, -0.02, 4.1], [0, 1.3, 0]); m2.scale.set(0.35, 0.18, 0.4); R.add(m2); }
    // stones and gravel scattered on the yard
    const peb = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), std(stone(), [1, 1]), 300);
    for (let i = 0; i < 300; i++) { const s = 0.01 + rnd() ** 3 * 0.035; let x = (rnd() - 0.5) * 8, z = 0.4 + rnd() * 7.8; if (x > PIT.x0 - 0.1 && x < PIT.x1 + 0.1 && z > PIT.z0 - 0.1 && z < PIT.z1 + 0.1) x += 2; P.set(x, s * 0.35, z); Q.setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3)); Sv.set(s * 1.2, s * 0.6, s); M.compose(P, Q, Sv); peb.setMatrixAt(i, M); }
    peb.castShadow = peb.receiveShadow = true; R.add(peb);
    // grass: thick along the walls and fence, patchy in the yard, none around the pit and mound
    const gMat = new THREE.MeshStandardMaterial({ map: grassTuft(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1, color: "#c8d890" });
    const gGeo = new THREE.PlaneGeometry(1, 1); gGeo.translate(0, 0.5, 0); const grass = new THREE.InstancedMesh(gGeo, gMat, 900);
    for (let i = 0; i < 900; i++) { let x: number, z: number, s: number;
      if (i < 240) { x = -3.45 + rnd() * 0.4; z = 0.3 + rnd() * 8; s = 0.25; } else if (i < 440) { x = 3.5 + rnd() * 0.5; z = 0.3 + rnd() * 8; s = 0.3; } else if (i < 560) { x = (rnd() - 0.5) * 7; z = 10.0 + rnd() * 0.3; s = 0.28; }
      else { x = (rnd() - 0.5) * 7; z = 0.6 + rnd() * 7.4; s = 0.1 + rnd() * 0.14; const near = x > -2.0 && x < 2.1 && z > 1.5 && z < 4.7; if (near) { M.makeScale(0, 0, 0); grass.setMatrixAt(i, M); continue; } }
      s *= 0.7 + rnd() * 0.6; P.set(x, 0, z); Q.setFromEuler(new THREE.Euler(0, rnd() * Math.PI, 0)); Sv.set(s * 1.4, s, s); M.compose(P, Q, Sv); grass.setMatrixAt(i, M); }
    grass.castShadow = true; grass.receiveShadow = true; R.add(grass);
    const leafMat = new THREE.MeshStandardMaterial({ color: "#8a5a2c", roughness: 1, side: THREE.DoubleSide }), leaf2 = new THREE.MeshStandardMaterial({ color: "#6e4a2c", roughness: 1, side: THREE.DoubleSide });
    for (let i = 0; i < 60; i++) R.add(mesh(new THREE.CircleGeometry(0.04 + rnd() * 0.05, 5), i % 3 ? leafMat : leaf2, [(rnd() - 0.5) * 7, 0.006, 0.5 + rnd() * 7.5], [-Math.PI / 2, 0, rnd() * 6], false));

    // ---------------- back of the house ----------------
    const plast = std(plaster("#e8dcc4"), [3, 1]), brick = new THREE.MeshStandardMaterial({ map: brickTex("w"), roughness: 0.9 }); brick.map!.wrapS = brick.map!.wrapT = THREE.RepeatWrapping; brick.map!.repeat.set(4, 0.5);
    R.add(box(8.4, 2.9, 0.18, plast, [0.2, 1.45, -0.09])); // plastered wall
    R.add(box(8.4, 0.55, 0.04, brick, [0.2, 0.275, 0.02])); // bare brick skirting (plaster fell off)
    R.add(box(8.6, 0.12, 0.3, std(stone(), [6, 1]), [0.2, 0.06, 0.18])); // rabat beton strip along the wall
    const beam = std(woodPlanks("#5a3820", 2, "beam"), [1, 1]), woodDark = std(woodPlanks("#4e2f1a", 4, "dk"), [1, 1]);
    // back door, half open, warm light inside
    R.add(box(1.0, 2.1, 0.08, beam, [-1.3, 1.05, 0.02]));
    R.add(box(0.84, 1.98, 0.02, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.25, 0.78, 0.42) }), [-1.3, 1.02, 0.03], undefined, false));
    { const dp = new THREE.Group(); dp.position.set(-1.72, 0, 0.06); const dr = box(0.84, 1.96, 0.05, woodDark, [0.42, 1.0, 0]); dp.add(dr); for (const y of [0.55, 1.45]) dp.add(box(0.6, 0.6, 0.02, std(woodPlanks("#5d3a22", 3, "pn"), [1, 1]), [0.42, y, 0.035])); dp.rotation.y = -1.15; R.add(dp); }
    R.add(box(1.1, 0.14, 0.5, std(stone(), [2, 1]), [-1.3, 0.07, 0.5])); // step
    // kitchen window with warm light and a jalousie, a shelf of jerry cans below
    const wx = 1.9, wy = 1.55; R.add(box(1.3, 1.0, 0.1, beam, [wx, wy, 0.03]));
    R.add(box(1.14, 0.84, 0.02, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.35, 0.9, 0.5) }), [wx, wy, 0.05], undefined, false));
    for (let k = 0; k < 7; k++) R.add(box(1.12, 0.06, 0.012, new THREE.MeshStandardMaterial({ color: "#cfe4ef", roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.55 }), [wx, wy - 0.36 + k * 0.12, 0.09], [0.6, 0, 0], false));
    for (let i = -2; i <= 2; i++) R.add(box(0.016, 0.86, 0.016, new THREE.MeshStandardMaterial({ color: "#2a2a2a", metalness: 0.6, roughness: 0.5 }), [wx + i * 0.24, wy, 0.12]));
    // zinc awning over the back
    { const zg = new THREE.PlaneGeometry(8.6, 1.7, 172, 1); const pp = zg.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pp.count; i++) pp.setZ(i, 0.018 * Math.sin(pp.getX(i) * Math.PI * 2 / 0.1)); zg.computeVertexNormals();
      const zm = new THREE.MeshStandardMaterial({ map: zincTex(), metalness: 0.55, roughness: 0.5, side: THREE.DoubleSide }); R.add(mesh(zg, zm, [0.2, 2.72, 0.78], [-Math.PI / 2 + 0.22, 0, 0]));
      for (const x of [-3.6, 4.0]) R.add(box(0.1, 2.5, 0.1, beam, [x, 1.25, 1.52]));
      R.add(box(8.6, 0.1, 0.12, beam, [0.2, 2.5, 1.54])); }
    // roof tiles above the wall
    R.add(mesh(new THREE.PlaneGeometry(9, 3.4), std(rooftiles(), [7, 3], { side: THREE.DoubleSide }), [0.2, 3.6, -1.2], [-Math.PI / 2 + 0.5, 0, 0]));
    // under the awning: blue water drum, a zinc bucket, a plastic chair, sandals, jerry cans
    R.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.85, 28), new THREE.MeshStandardMaterial({ color: "#2f63b0", roughness: 0.4 }), [2.95, 0.425 + 0.12, 0.55]));
    R.add(mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.04, 28), new THREE.MeshStandardMaterial({ color: "#244f90", roughness: 0.4 }), [2.95, 0.99, 0.55]));
    R.add(mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.26, 20, 1, true), new THREE.MeshStandardMaterial({ color: "#a9adb0", metalness: 0.7, roughness: 0.35, side: THREE.DoubleSide }), [2.35, 0.13 + 0.12, 0.6]));
    for (const [x, c] of [[0.55, "#d9b13a"], [0.82, "#3a8a4a"]] as const) R.add(box(0.22, 0.32, 0.14, new THREE.MeshStandardMaterial({ color: c, roughness: 0.45 }), [x, 0.28, 0.35]));
    { const ch = new THREE.Group(); ch.position.set(-2.6, 0.12, 0.7); ch.rotation.y = 0.5; const pl = new THREE.MeshStandardMaterial({ color: "#2e8a56", roughness: 0.45 });
      ch.add(box(0.44, 0.04, 0.42, pl, [0, 0.44, 0])); ch.add(box(0.44, 0.42, 0.04, pl, [0, 0.68, -0.2], [-0.12, 0, 0])); for (const [x, z] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) ch.add(mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.44, 8), pl, [x, 0.22, z])); R.add(ch); }
    for (const [x, r] of [[-1.45, 0.2], [-1.2, -0.25]] as const) R.add(box(0.1, 0.022, 0.26, new THREE.MeshStandardMaterial({ color: "#7a3a2a", roughness: 0.8 }), [x, 0.152, 0.62], [0, r, 0]));
    // clothesline between two bamboo poles, with a sarung, a towel, a tee and a house dress
    { const bam = std(bamboo(), [1, 2]); for (const x of [-3.1, 3.2]) R.add(mesh(new THREE.CylinderGeometry(0.03, 0.035, 2.15, 10), bam, [x, 1.07, 0.95]));
      R.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 6.3, 4), new THREE.MeshStandardMaterial({ color: "#d8d2c4" }), [0.05, 2.02, 0.95], [0, 0, Math.PI / 2], false));
      for (const [x, wd, ht, k] of [[-2.3, 0.95, 1.0, "sarung"], [-1.05, 0.55, 0.85, "towel"], [1.35, 0.6, 0.62, "tee"], [2.4, 0.62, 0.95, "daster"]] as const) {
        const cg = new THREE.PlaneGeometry(wd, ht, 12, 10); cg.translate(0, -ht / 2, 0); const m = mesh(cg, new THREE.MeshStandardMaterial({ map: clothTex(k), roughness: 0.95, side: THREE.DoubleSide }), [x, 2.02, 0.95]);
        if (k === "tee") { const pp = cg.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pp.count; i++) { const y = -pp.getY(i), xx = pp.getX(i); if (y < 0.2 && Math.abs(xx) > wd * 0.32) pp.setX(i, xx * 1.25); } }
        m.castShadow = false; this.cloths.push({ m, base: Float32Array.from((cg.attributes.position as THREE.BufferAttribute).array as Float32Array), ph: rnd() * 6 }); R.add(m);
        for (const s of [-1, 1]) R.add(box(0.015, 0.05, 0.02, new THREE.MeshStandardMaterial({ color: ["#e24a4a", "#3a8ad8", "#e2c23a"][Math.floor(rnd() * 3)] }), [x + s * wd * 0.42, 2.02, 0.95], undefined, false)); // pegs
      } }

    // ---------------- boundaries: brick wall left, bamboo fence + trees right, brick wall far ----------------
    const bW = new THREE.MeshStandardMaterial({ map: brickTex("L"), roughness: 0.92 }); bW.map!.wrapS = bW.map!.wrapT = THREE.RepeatWrapping; bW.map!.repeat.set(3.5, 0.9);
    R.add(box(0.2, 1.9, 10.6, bW, [-3.75, 0.95, 5.2]));
    for (let i = 0; i < 14; i++) R.add(box(0.22, 0.07, 0.24, bW, [-3.75 + (rnd() - 0.5) * 0.03, 1.93, 0.4 + i * 0.6 + rnd() * 0.2], [0, rnd() * 0.3, 0])); // loose bricks on top
    const far = new THREE.MeshStandardMaterial({ map: brickTex("F"), roughness: 0.92 }); far.map!.wrapS = far.map!.wrapT = THREE.RepeatWrapping; far.map!.repeat.set(3.5, 0.65);
    R.add(box(8.0, 1.1, 0.2, far, [0.1, 0.55, 10.4]));
    const fence = std(bamboo(), [8, 1]); R.add(box(0.05, 1.5, 10.4, fence, [4.25, 0.75, 5.2]));
    for (let i = 0; i < 11; i++) R.add(mesh(new THREE.CylinderGeometry(0.04, 0.045, 1.65, 10), std(bamboo(), [1, 1]), [4.22, 0.82, 0.2 + i * 1.0]));
    // banana clump (left, near the far wall) and a papaya (right, near the house)
    const lm = new THREE.MeshStandardMaterial({ map: bananaLeaf(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.75 });
    const banana = (x: number, z: number, h: number, n: number) => { const tree = new THREE.Group(); tree.position.set(x, 0, z);
      tree.add(mesh(new THREE.CylinderGeometry(0.1, 0.15, h, 14), new THREE.MeshStandardMaterial({ color: "#7b8a4a", roughness: 0.9, map: bamboo().map }), [0, h / 2, 0]));
      for (let i = 0; i < n; i++) { const g = new THREE.PlaneGeometry(0.55, 2.0, 1, 16); g.translate(0, 1.0, 0); const p = g.attributes.position as THREE.BufferAttribute;
        for (let k = 0; k < p.count; k++) { const y = p.getY(k); p.setZ(k, -0.35 * (y / 2) ** 2 * 2.2); } g.computeVertexNormals();
        const piv = new THREE.Group(); piv.position.set(0, h - 0.1, 0); piv.rotation.set(-0.85 - rnd() * 0.6, (i / n) * Math.PI * 2 + rnd() * 0.4, 0); const lf = new THREE.Mesh(g, lm); lf.castShadow = true; piv.add(lf); tree.add(piv);
        this.sway.push({ o: piv, base: piv.rotation.clone(), amp: 0.05 + rnd() * 0.05, f: 0.5 + rnd() * 0.5, ph: rnd() * 6 }); }
      R.add(tree); };
    banana(-3.1, 8.4, 2.6, 8); banana(-2.55, 9.6, 2.1, 6); banana(3.7, 9.5, 2.4, 7);
    { const pap = new THREE.Group(); pap.position.set(3.6, 0, 1.9); pap.add(mesh(new THREE.CylinderGeometry(0.06, 0.1, 2.8, 10), new THREE.MeshStandardMaterial({ color: "#9a9070", roughness: 0.9 }), [0, 1.4, 0]));
      const pl = new THREE.MeshStandardMaterial({ color: "#4f8a34", roughness: 0.8, side: THREE.DoubleSide });
      for (let i = 0; i < 9; i++) { const piv = new THREE.Group(); piv.position.set(0, 2.8, 0); piv.rotation.set(-0.7 - rnd() * 0.5, (i / 9) * Math.PI * 2, 0); const st = mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.7, 5), pl, [0, 0.35, 0]); piv.add(st);
        const lf = mesh(new THREE.CircleGeometry(0.32, 7), pl, [0, 0.75, 0], [Math.PI / 2 - 0.3, 0, 0]); piv.add(lf); pap.add(piv); this.sway.push({ o: piv, base: piv.rotation.clone(), amp: 0.04, f: 0.7, ph: i }); }
      for (let i = 0; i < 4; i++) { const fr = mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshStandardMaterial({ color: i % 2 ? "#6f9a32" : "#d9a032", roughness: 0.6 }), [0.09 * Math.cos(i * 1.6), 2.6 - (i % 2) * 0.12, 0.09 * Math.sin(i * 1.6)]); fr.scale.set(1, 1.4, 1); pap.add(fr); }
      R.add(pap); }
    // potted plants along the left wall
    const pts: THREE.Vector2[] = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.12 + 0.06 * Math.sin(t * Math.PI * 0.9) + (t > 0.92 ? 0.025 : 0), t * 0.3)); }
    const potMat = std(terracotta(), [2, 1]), potLeaf = new THREE.MeshStandardMaterial({ color: "#3f7a34", roughness: 0.8, side: THREE.DoubleSide });
    for (const [px, pz] of [[-3.3, 1.6], [-3.3, 2.3], [-3.35, 5.2]] as const) { R.add(mesh(new THREE.LatheGeometry(pts, 18), potMat, [px, 0, pz]));
      for (let i = 0; i < 10; i++) R.add(mesh(new THREE.PlaneGeometry(0.09, 0.4 + rnd() * 0.25), potLeaf, [px + (rnd() - 0.5) * 0.12, 0.5, pz + (rnd() - 0.5) * 0.12], [(rnd() - 0.5) * 0.7, rnd() * Math.PI, (rnd() - 0.5) * 0.7])); }

    // ---------------- pond supplies: bricks, cement sack, a zinc bucket ----------------
    { const bk = new THREE.MeshStandardMaterial({ color: "#b0583a", roughness: 0.9 }), bk2 = new THREE.MeshStandardMaterial({ color: "#9a4a30", roughness: 0.9 });
      for (let l = 0; l < 5; l++) for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) R.add(box(0.2, 0.06, 0.1, (i + j + l) % 3 ? bk : bk2, l % 2 ? [2.2 + i * 0.105, 0.03 + l * 0.062, 2.8 + j * 0.21] : [2.2 + j * 0.21 - 0.05, 0.03 + l * 0.062, 2.75 + i * 0.105 + 0.05], [0, l % 2 ? Math.PI / 2 : 0, 0]));
      const sack = new THREE.SphereGeometry(1, 20, 12); const pp = sack.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pp.count; i++) { const y = pp.getY(i); pp.setY(i, Math.max(-0.2, y)); } sack.computeVertexNormals();
      const sackTex = canvasTex(256, 256, (g) => { g.fillStyle = "#d9d2c0"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#c0392b"; g.fillRect(0, 70, 256, 60); g.fillStyle = "#fff"; g.font = "bold 44px Arial"; g.textAlign = "center"; g.fillText("SEMEN", 128, 116); g.fillStyle = "#555"; g.font = "bold 28px Arial"; g.fillText("40 kg", 128, 170); });
      const sm = mesh(sack, new THREE.MeshStandardMaterial({ map: sackTex, roughness: 0.95 }), [2.45, 0.07, 3.75], [0, -0.5, 0]); sm.scale.set(0.3, 0.12, 0.22); R.add(sm);
      R.add(mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.27, 20, 1, true), new THREE.MeshStandardMaterial({ color: "#a9adb0", metalness: 0.7, roughness: 0.35, side: THREE.DoubleSide }), [2.15, 0.135, 4.5])); }

    // ---------------- beyond the walls: neighbour roofs, palms, a mosque dome on the sunset, power lines ----------------
    const sil = new THREE.MeshStandardMaterial({ color: "#5a4048", roughness: 1 }), sil2 = new THREE.MeshStandardMaterial({ color: "#6e4a4e", roughness: 1 });
    for (const [x, z, w, h, ry] of [[-6, 12, 5, 2.6, 0.1], [0.5, 13.5, 6, 3.0, -0.05], [7, 11.5, 5, 2.4, 0.2], [-9, -6, 6, 3.2, 0], [8, -5, 6, 3.0, 0], [11, 3, 5, 2.8, Math.PI / 2], [-11, 4, 5, 3, Math.PI / 2]] as const) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; g.add(box(w, h, 3, sil2, [0, h / 2, 0])); const rg = new THREE.CylinderGeometry(0.01, w * 0.62, 1.4, 4, 1); rg.rotateY(Math.PI / 4); const rf = mesh(rg, sil, [0, h + 0.7, 0]); rf.scale.set(1, 1, 3 / w); g.add(rf); R.add(g); }
    { const mq = new THREE.Group(); mq.position.set(-10, 0, 34); mq.add(box(7, 4, 6, sil2, [0, 2, 0])); mq.add(mesh(new THREE.SphereGeometry(2.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), sil, [0, 4, 0])); mq.add(mesh(new THREE.ConeGeometry(0.2, 0.9, 8), sil, [0, 6.8, 0]));
      mq.add(mesh(new THREE.CylinderGeometry(0.45, 0.5, 10, 10), sil, [5.2, 5, 0])); mq.add(mesh(new THREE.SphereGeometry(0.6, 12, 8), sil, [5.2, 10.4, 0])); R.add(mq); }
    const palm = (x: number, z: number, h: number, lean: number) => { const g = new THREE.Group(); g.position.set(x, 0, z); const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(lean * 0.3, h * 0.6, 0), new THREE.Vector3(lean, h, 0));
      g.add(mesh(new THREE.TubeGeometry(curve, 16, 0.12, 8), sil, [0, 0, 0])); const top = curve.getPoint(1);
      for (let i = 0; i < 10; i++) { const fg = new THREE.PlaneGeometry(0.5, 2.6, 1, 10); fg.translate(0, 1.3, 0); const p = fg.attributes.position as THREE.BufferAttribute; for (let k = 0; k < p.count; k++) { const y = p.getY(k); p.setZ(k, -0.5 * (y / 2.6) ** 2 * 2.6); p.setX(k, p.getX(k) * (1 - y / 2.8)); }
        const piv = new THREE.Group(); piv.position.copy(top); piv.rotation.set(-1.0 - rnd() * 0.5, (i / 10) * Math.PI * 2, 0); piv.add(mesh(fg, new THREE.MeshStandardMaterial({ color: "#3e3a40", roughness: 1, side: THREE.DoubleSide }), [0, 0, 0])); g.add(piv); this.sway.push({ o: piv, base: piv.rotation.clone(), amp: 0.03, f: 0.35, ph: i }); }
      R.add(g); };
    palm(-4.5, 15, 8, 0.8); palm(4.2, 17, 9.5, -1.0); palm(9, 14, 7, 0.5); palm(-7, -9, 8.5, 0.6); palm(5, -10, 9, -0.7); palm(-13, 10, 7.5, 0.4);
    for (const z of [10.2]) { for (const x of [-5, 5]) R.add(mesh(new THREE.CylinderGeometry(0.08, 0.1, 7, 8), sil, [x, 3.5, z])); for (let k = 0; k < 3; k++) { const cu = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-14, 6.6 - k * 0.25, z), new THREE.Vector3(0, 6.0 - k * 0.25, z), new THREE.Vector3(14, 6.6 - k * 0.25, z)); R.add(mesh(new THREE.TubeGeometry(cu, 30, 0.012, 4), sil, [0, 0, 0], [0, 0, 0], false)); } }

    // ---------------- the coin (lying in the pit) ----------------
    this.coin = makeCoin(); this.coin.position.copy(COIN_AT); this.coin.rotation.set(-0.18, 0.4, 0.12); R.add(this.coin);
    const gt = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,240,190,1)"); gr.addColorStop(0.25, "rgba(255,200,90,0.55)"); gr.addColorStop(1, "rgba(255,160,40,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    this.coinGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); this.coinGlow.renderOrder = 9; R.add(this.coinGlow);
  }
  /** glow around the coin, k 0..1 */
  glow(k: number, t: number) {
    const p = this.coin.getWorldPosition(new THREE.Vector3()); this.coinGlow.position.copy(p).add(new THREE.Vector3(0, 0.01, 0)); this.coinGlow.scale.setScalar(0.12 + 0.18 * k * (1 + 0.06 * Math.sin(t * 8)));
    (this.coinGlow.material as THREE.SpriteMaterial).opacity = 0.9 * k; this.coinGlow.visible = k > 0.01; this.coinLight.position.copy(p).add(new THREE.Vector3(0, 0.08, 0.05)); this.coinLight.intensity = 0.9 * k;
  }
  update(t: number) {
    for (const s of this.sway) { s.o.rotation.x = s.base.x + s.amp * Math.sin(t * s.f * Math.PI * 2 + s.ph); s.o.rotation.z = s.base.z + s.amp * 0.6 * Math.sin(t * s.f * 1.3 + s.ph); }
    for (const c of this.cloths) { const pp = c.m.geometry.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pp.count; i++) { const x = c.base[i * 3], y = c.base[i * 3 + 1], k = -y; pp.setZ(i, k * 0.06 * Math.sin(t * 1.6 + c.ph + x * 2.5) + k * 0.03 * Math.sin(t * 2.7 + x * 5)); } pp.needsUpdate = true; c.m.geometry.computeVertexNormals(); }
  }
}

/** an old gold trade coin, about 2.2 cm across: stamped motif, worn rim, a crust of soil on one side */
export const makeCoin = () => {
  const face = canvasTex(256, 256, (g) => {
    const gr = g.createRadialGradient(110, 100, 10, 128, 128, 128); gr.addColorStop(0, "#ffe9a0"); gr.addColorStop(0.6, "#e7b443"); gr.addColorStop(1, "#a8761c"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = "#8a5c12"; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 112, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#9a6a18"; for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; g.beginPath(); g.arc(128 + 96 * Math.cos(a), 128 + 96 * Math.sin(a), 5, 0, Math.PI * 2); g.fill(); } // bead ring
    g.strokeStyle = "#8a5c12"; g.lineWidth = 12; g.lineCap = "round"; // an invented stamped glyph (not a real script)
    g.beginPath(); g.moveTo(84, 92); g.lineTo(172, 92); g.moveTo(104, 92); g.quadraticCurveTo(92, 150, 120, 172); g.moveTo(152, 92); g.lineTo(152, 176); g.moveTo(120, 132); g.lineTo(152, 132); g.stroke();
    g.fillStyle = "#8a5c12"; g.beginPath(); g.arc(128, 60, 9, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? "255,250,220" : "120,80,20"},0.18)`; g.fillRect(rnd() * 256, rnd() * 256, 2, 2); }
    g.fillStyle = "rgba(90,60,36,0.85)"; for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(170 + rnd() * 50, 150 + rnd() * 70, 8 + rnd() * 14, 5 + rnd() * 9, rnd() * 3, 0, Math.PI * 2); g.fill(); } // soil crust
  });
  const gold = new THREE.MeshStandardMaterial({ map: face, bumpMap: face, bumpScale: 1.5, metalness: 0.9, roughness: 0.28, color: "#ffffff", emissive: "#7a4a08", emissiveIntensity: 0.5 });
  const rim = new THREE.MeshStandardMaterial({ color: "#d9a43a", metalness: 0.95, roughness: 0.3, emissive: "#6a4006", emissiveIntensity: 0.5 });
  const G = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.0025, 40), [rim, gold, gold]); c.castShadow = true; G.add(c); return G;
};
