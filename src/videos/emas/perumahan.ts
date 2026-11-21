// "Taman belakang perumahan": the back garden of a two-storey house in a city housing estate at dusk (the user asked
// for a city setting, not a kampung). The house's back wall is the plane z = 0 facing +z: sliding glass kitchen door,
// windows, an AC unit, a canopy over a tiled terrace. A lawn runs to painted boundary walls (the far one topped with
// roster blocks that throw a dappled pattern); beyond are the neighbours' houses, a water tower and a hazy skyline
// under the sunset. The pond hole being dug (PIT) is cut into the lawn; the coin lies on its shallow step.
import * as THREE from "three";
import { grassTuft, bananaLeaf, rnd, seedRnd, fbm } from "../../lib/world2/textures";
import { canvasTex } from "../ketindihan2/sets";
import { PIT, COIN_AT, makeCoin, soilTex } from "./halaman";

type V3 = [number, number, number];
const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, p: V3, r: V3 = [0, 0, 0], cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.rotation.set(...r); m.castShadow = cast; m.receiveShadow = true; return m; };
const box = (w: number, h: number, d: number, mat: THREE.Material, p: V3, r?: V3, cast = true) => mesh(new THREE.BoxGeometry(w, h, d), mat, p, r, cast);
const rep = (t: THREE.Texture, x: number, y: number) => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(x, y); c.needsUpdate = true; return c; };
const std = (map: THREE.Texture, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.85, ...extra });

// ---------------- textures ----------------
/** smooth painted render: faint roller marks, rain streaks from the top, a damp grey band near the ground */
const paintTex = (base: string, key: number) => canvasTex(512, 512, (g) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512); void key;
  const img = g.getImageData(0, 0, 512, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) { const n = fbm(x + key * 97, y, 512, 6, 4) * 10 + fbm(x * 3, y * 3, 512, 40, 2) * 4, i = (y * 512 + x) * 4; for (let k = 0; k < 3; k++) img.data[i + k] = Math.max(0, Math.min(255, img.data[i + k] + n)); }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 26; i++) { const x = rnd() * 512, w = 3 + rnd() * 14, h = 40 + rnd() * 160, gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(90,84,76,0.16)"); gr.addColorStop(1, "rgba(90,84,76,0)"); g.fillStyle = gr; g.fillRect(x, 0, w, h); }
  const gb = g.createLinearGradient(0, 512, 0, 400); gb.addColorStop(0, "rgba(70,72,60,0.35)"); gb.addColorStop(1, "rgba(70,72,60,0)"); g.fillStyle = gb; g.fillRect(0, 0, 512, 512);
});
/** cream ceramic floor tiles 60 x 60 with grout */
const tileTex = () => canvasTex(512, 512, (g) => {
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const v = 228 + rnd() * 10; g.fillStyle = `rgb(${v},${v - 8},${v - 20})`; g.fillRect(c * 128, r * 128, 128, 128);
    for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(150,130,110,${0.05 + rnd() * 0.06})`; g.beginPath(); g.ellipse(c * 128 + rnd() * 128, r * 128 + rnd() * 128, 6 + rnd() * 18, 2 + rnd() * 6, rnd() * 3, 0, Math.PI * 2); g.fill(); } }
  g.fillStyle = "#a59a8a"; for (let k = 0; k <= 4; k++) { g.fillRect(k * 128 - 2, 0, 4, 512); g.fillRect(0, k * 128 - 2, 512, 4); }
});
/** a tended lawn (rumput gajah mini): mottled greens, a few dry patches */
const lawnTex = () => canvasTex(512, 512, (g) => {
  const img = g.createImageData(512, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) { const n = fbm(x, y, 512, 8, 5), f = fbm(x * 6, y * 6, 512, 96, 2), dry = Math.max(0, fbm(x + 300, y, 512, 3, 3) - 0.18) * 2.5, i = (y * 512 + x) * 4, k = 0.75 + n * 0.35 + f * 0.25;
    img.data[i] = (78 + dry * 70) * k; img.data[i + 1] = (122 + dry * 20) * k; img.data[i + 2] = (52 + dry * 10) * k; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
});
/** roster (ventilation) blocks: square concrete blocks with a quatrefoil hole; alpha cut */
const rosterTex = () => canvasTex(256, 256, (g) => {
  g.fillStyle = "#d8d2c6"; g.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) { const x = c * 128 + 64, y = r * 128 + 64; g.strokeStyle = "rgba(120,112,100,0.6)"; g.lineWidth = 3; g.strokeRect(c * 128 + 2, r * 128 + 2, 124, 124);
    g.globalCompositeOperation = "destination-out"; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; g.beginPath(); g.arc(x + 24 * Math.cos(a), y + 24 * Math.sin(a), 22, 0, Math.PI * 2); g.fill(); } g.globalCompositeOperation = "source-over"; }
});
/** a facade of windows for the neighbours: framed dark glass, some lit warm, a few with curtains */
const facadeTex = (base: string, floors: number, cols: number, seed: number) => canvasTex(256, 256, (g) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256); void seed;
  const fh = 256 / floors, cw = 256 / cols;
  for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) { const lit = rnd() < 0.35, x = c * cw + cw * 0.2, y = f * fh + fh * 0.22, w = cw * 0.6, h = fh * 0.5;
    g.fillStyle = "#2f3236"; g.fillRect(x - 3, y - 3, w + 6, h + 6); g.fillStyle = lit ? "#ffc879" : "#3e4a58"; g.fillRect(x, y, w, h);
    if (!lit) { g.fillStyle = "rgba(200,220,240,0.18)"; g.fillRect(x, y, w * 0.4, h); } else if (rnd() < 0.5) { g.fillStyle = "rgba(200,120,90,0.6)"; g.fillRect(x, y, w * 0.35, h); }
    g.fillStyle = "#2f3236"; g.fillRect(x + w / 2 - 1, y, 2, h); g.fillStyle = "rgba(0,0,0,0.15)"; g.fillRect(x - 6, y + h + 3, w + 12, 4); }
});
/** a city tower at dusk: cool silhouette with rows of windows, some lit */
const towerTex = (seed: number) => canvasTex(128, 512, (g) => {
  g.fillStyle = ["#8a8298", "#7b7d92", "#958a96"][seed % 3]; g.fillRect(0, 0, 128, 512);
  for (let y = 8; y < 512; y += 14) for (let x = 6; x < 128; x += 12) { const lit = rnd() < 0.16; g.fillStyle = lit ? "#ffd08a" : `rgba(40,44,70,${0.4 + rnd() * 0.3})`; g.fillRect(x, y, 7, 8); }
});
/** the kitchen seen through the glass: warm light, upper and lower cabinets, a fridge, a hanging lamp */
const kitchenTex = () => canvasTex(512, 256, (g) => {
  const gr = g.createRadialGradient(256, 40, 10, 256, 120, 300); gr.addColorStop(0, "#fff0cf"); gr.addColorStop(1, "#c98a52"); g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  g.fillStyle = "#8a5a36"; g.fillRect(20, 30, 300, 60); g.fillRect(20, 150, 300, 106); g.fillStyle = "#e9e1d2"; g.fillRect(20, 140, 300, 12);
  g.strokeStyle = "rgba(60,30,10,0.5)"; g.lineWidth = 2; for (let x = 20; x <= 320; x += 75) { g.strokeRect(x, 30, 75, 60); g.strokeRect(x, 152, 75, 104); }
  g.fillStyle = "#d9dcdf"; g.fillRect(360, 40, 90, 216); g.strokeStyle = "#9aa0a6"; g.strokeRect(360, 40, 90, 216); g.fillRect(366, 120, 4, 40);
  g.fillStyle = "#2b2b2b"; g.fillRect(250, 0, 2, 30); g.fillStyle = "#ffe7b0"; g.beginPath(); g.arc(251, 36, 12, 0, Math.PI * 2); g.fill();
});
/** a bedroom upstairs: dim, a curtain half drawn */
const roomTex = (lit: boolean) => canvasTex(256, 256, (g) => {
  g.fillStyle = lit ? "#e8b57a" : "#4a4652"; g.fillRect(0, 0, 256, 256); g.fillStyle = lit ? "#b98a5a" : "#36323e"; g.fillRect(0, 180, 256, 76);
  g.fillStyle = lit ? "#c76a5a" : "#6a5a7a"; for (let i = 0; i < 10; i++) g.fillRect(i * 9, 0, 6, 256); g.fillStyle = lit ? "#a8524a" : "#594a68"; for (let i = 0; i < 10; i++) g.fillRect(i * 9 + 6, 0, 3, 256);
});
const clothTex = (kind: "batik" | "towel" | "tee" | "jeans") => canvasTex(256, 256, (g) => {
  if (kind === "batik") { g.fillStyle = "#7a3a24"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "#e8c27a"; g.lineWidth = 4; for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 32) { g.beginPath(); g.arc(x + 16, y + 16, 10, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(x, y + 16); g.lineTo(x + 32, y + 16); g.stroke(); } }
  else if (kind === "towel") { g.fillStyle = "#f1ece0"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#3b7dd8"; g.fillRect(0, 30, 256, 18); g.fillRect(0, 208, 256, 18); }
  else if (kind === "jeans") { g.fillStyle = "#3d5a86"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 300; i++) { g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(rnd() * 256, rnd() * 256, 3, 1); } }
  else { g.fillStyle = "#e0b43c"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#2c3e66"; g.beginPath(); g.arc(128, 120, 46, 0, Math.PI * 2); g.fill(); g.fillStyle = "#e0b43c"; g.beginPath(); g.arc(128, 120, 30, 0, Math.PI * 2); g.fill(); }
  for (let y = 0; y < 256; y += 2) { g.fillStyle = "rgba(0,0,0,0.04)"; g.fillRect(0, y, 256, 1); }
});

export class PerumahanSet {
  root = new THREE.Group();
  sun = new THREE.DirectionalLight("#ffa060", 3.5);
  hemi = new THREE.HemisphereLight("#93a2e2", "#6a6a48", 1.2);
  sunDir = new THREE.Vector3();
  coin!: THREE.Group; coinGlow!: THREE.Sprite; coinLight = new THREE.PointLight("#ffc65a", 0, 1.6, 2);
  private sway: { o: THREE.Object3D; base: THREE.Euler; amp: number; f: number; ph: number }[] = [];
  private cloths: { m: THREE.Mesh; base: Float32Array; ph: number }[] = [];

  constructor() {
    seedRnd(21);
    const R = this.root;
    // ---------------- light ----------------
    this.sun.position.set(-7.5, 5.0, 15); this.sun.target.position.set(0.3, 0.4, 2.6); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096); Object.assign(this.sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 45 });
    this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.03; this.sun.shadow.radius = 4;
    this.sunDir.copy(this.sun.position).sub(this.sun.target.position).normalize();
    R.add(this.sun, this.sun.target, this.hemi, this.coinLight);
    const kitchen = new THREE.PointLight("#ffbd78", 2.0, 5, 1.6); kitchen.position.set(-0.8, 1.6, 0.6); R.add(kitchen);

    // ---------------- sky ----------------
    const sky = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false, uniforms: { uSun: { value: this.sunDir.clone() } },
      vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: `varying vec3 vD; uniform vec3 uSun;
        void main(){ float h = max(vD.y, 0.0); float s = max(dot(normalize(vD), uSun), 0.0);
          vec3 zen = vec3(0.26,0.29,0.56), mid = vec3(0.66,0.52,0.68), hor = vec3(1.0,0.66,0.46);
          vec3 c = mix(hor, mid, smoothstep(0.0, 0.2, h)); c = mix(c, zen, smoothstep(0.16, 0.7, h));
          c += vec3(1.0,0.55,0.22) * pow(s, 6.0) * 0.6 * (1.0 - smoothstep(0.0,0.5,h)); c += vec3(1.0,0.85,0.55) * pow(s, 90.0) * 1.6; c += vec3(1.2,1.05,0.8) * smoothstep(0.9993, 0.9996, s) * 2.2;
          if (vD.y < 0.0) c = hor * 0.8; gl_FragColor = vec4(c, 1.0); }`,
    });
    R.add(new THREE.Mesh(new THREE.SphereGeometry(140, 48, 24), sky));

    // ---------------- lawn with the pit cut out, a trampled soil patch around it ----------------
    const pitPath = (grow: number, wob: number) => { const p = new THREE.Path(), n = 28, P = PIT; for (let i = 0; i <= n * 4; i++) { const s = i / n, side = Math.floor(s) % 4, u = s - Math.floor(s); let x: number, z: number;
        if (side === 0) { x = P.x0 + (P.x1 - P.x0) * u; z = P.z0; } else if (side === 1) { x = P.x1; z = P.z0 + (P.z1 - P.z0) * u; } else if (side === 2) { x = P.x1 - (P.x1 - P.x0) * u; z = P.z1; } else { x = P.x0; z = P.z1 - (P.z1 - P.z0) * u; }
        const j = 0.035 * Math.sin(i * 2.3) + 0.02 * Math.sin(i * 5.1) + grow + wob * (0.5 + 0.5 * Math.sin(i * 0.9 + 1) * Math.sin(i * 0.37)); x += side % 2 ? (side === 1 ? j : -j) : 0; z += side % 2 ? 0 : (side === 0 ? -j : j);
        if (i === 0) p.moveTo(x, -z); else p.lineTo(x, -z); } return p; };
    const lawnShape = new THREE.Shape(); lawnShape.moveTo(-30, -30); lawnShape.lineTo(30, -30); lawnShape.lineTo(30, 30); lawnShape.lineTo(-30, 30); lawnShape.closePath(); lawnShape.holes.push(pitPath(0, 0));
    const lg = new THREE.ShapeGeometry(lawnShape, 1); lg.rotateX(-Math.PI / 2); { const uv = lg.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.5, uv.getY(i) / 2.5); }
    const lawn = lawnTex(); lawn.wrapS = lawn.wrapT = THREE.RepeatWrapping; R.add(mesh(lg, std(lawn, { roughness: 0.95 }), [0, 0, 0], [0, 0, 0], false));
    const soil = new THREE.MeshStandardMaterial({ map: soilTex(), roughness: 1 }); soil.map!.wrapS = soil.map!.wrapT = THREE.RepeatWrapping;
    { const ring = new THREE.Shape(pitPath(0.32, 0.22).getPoints()); ring.holes.push(pitPath(0, 0)); const rg = new THREE.ShapeGeometry(ring, 1); rg.rotateX(-Math.PI / 2); const uv = rg.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i));
      const rm = mesh(rg, soil, [0, 0.004, 0], [0, 0, 0], false); R.add(rm); }
    // pit walls, floor, the shallow step, clods, the dug-out mound
    const D = PIT.depth, cx = (PIT.x0 + PIT.x1) / 2, cz = (PIT.z0 + PIT.z1) / 2, w = PIT.x1 - PIT.x0, d = PIT.z1 - PIT.z0;
    const wall = (wd: number, p: V3, ry: number) => { const g = new THREE.PlaneGeometry(wd, D + 0.06, 24, 4); const pp = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pp.count; i++) pp.setZ(i, 0.025 * Math.sin(pp.getX(i) * 9 + pp.getY(i) * 13) + 0.015 * Math.sin(pp.getX(i) * 23)); g.computeVertexNormals(); return mesh(g, soil, p, [0, ry, 0], false); };
    R.add(wall(w + 0.1, [cx, -D / 2 + 0.02, PIT.z0 - 0.02], 0), wall(w + 0.1, [cx, -D / 2 + 0.02, PIT.z1 + 0.02], Math.PI), wall(d + 0.1, [PIT.x0 - 0.02, -D / 2 + 0.02, cz], Math.PI / 2), wall(d + 0.1, [PIT.x1 + 0.02, -D / 2 + 0.02, cz], -Math.PI / 2));
    { const fg = new THREE.PlaneGeometry(w + 0.1, d + 0.1, 30, 24); const pp = fg.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pp.count; i++) pp.setZ(i, 0.03 * fbm(pp.getX(i) * 60 + 99, pp.getY(i) * 60, 256, 8, 3)); fg.computeVertexNormals(); R.add(mesh(fg, soil, [cx, -D, cz], [-Math.PI / 2, 0, 0], false)); }
    { const sg = new THREE.BoxGeometry(w + 0.06, D - PIT.stepD, PIT.z1 - PIT.stepZ + 0.04, 30, 2, 20); const pp = sg.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i); pp.setXYZ(i, x, y + (y > 0 ? 0.02 * fbm(x * 50 + 9, z * 50, 256, 8, 3) : 0), z + (z < 0 ? 0.03 * Math.sin(x * 11) + 0.02 * Math.sin(y * 30 + x * 5) : 0)); } sg.computeVertexNormals();
      R.add(mesh(sg, soil, [cx, -D + (D - PIT.stepD) / 2, (PIT.stepZ + PIT.z1) / 2 + 0.02], [0, 0, 0], false)); }
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Sv = new THREE.Vector3(), P = new THREE.Vector3();
    const clods = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 1), soil, 240);
    for (let i = 0; i < 240; i++) { const side = i % 4, u = rnd(), s = 0.012 + rnd() ** 2 * 0.03; let x = 0, z = 0, y = 0;
      if (i < 180) { if (side === 0) { x = PIT.x0 + w * u; z = PIT.z0 - 0.05 - rnd() * 0.3; } else if (side === 1) { x = PIT.x1 + 0.05 + rnd() * 0.35; z = PIT.z0 + d * u; } else if (side === 2) { x = PIT.x0 + w * u; z = PIT.z1 + 0.05 + rnd() * 0.3; } else { x = PIT.x0 - 0.05 - rnd() * 0.3; z = PIT.z0 + d * u; } y = s * 0.3; }
      else { x = PIT.x0 + 0.1 + rnd() * (w - 0.2); z = PIT.z0 + 0.1 + rnd() * (d - 0.2); y = (z > PIT.stepZ ? -PIT.stepD : -D) + s * 0.3; if (Math.hypot(x - COIN_AT.x, z - COIN_AT.z) < 0.12) x += 0.3; }
      P.set(x, y, z); Q.setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3)); Sv.set(s * 1.3, s * 0.7, s); M.compose(P, Q, Sv); clods.setMatrixAt(i, M); }
    clods.castShadow = clods.receiveShadow = true; R.add(clods);
    { const mg = new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2); const pp = mg.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i), n = 1 + 0.18 * fbm(x * 40 + 50, z * 40 + y * 30, 256, 6, 3); pp.setXYZ(i, x * n, y * n * (0.8 + 0.2 * Math.sin(x * 5)), z * n); } mg.computeVertexNormals();
      const m1 = mesh(mg, soil, [-1.25, -0.02, 2.9], [0, 0.4, 0]); m1.scale.set(0.62, 0.34, 0.75); R.add(m1); const m2 = mesh(mg, soil, [-1.0, -0.02, 4.15], [0, 1.3, 0]); m2.scale.set(0.35, 0.18, 0.4); R.add(m2); }
    // short lawn blades everywhere (not on the soil), longer tufts along the walls
    const gMat = new THREE.MeshStandardMaterial({ map: grassTuft(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1, color: "#9cc070" });
    const gGeo = new THREE.PlaneGeometry(1, 1); gGeo.translate(0, 0.5, 0); const grass = new THREE.InstancedMesh(gGeo, gMat, 1400);
    for (let i = 0; i < 1400; i++) { let x: number, z: number, s: number;
      if (i < 200) { x = -4.25 + rnd() * 0.35; z = 1.7 + rnd() * 7; s = 0.2; } else if (i < 400) { x = 4.35 + rnd() * 0.35; z = 1.7 + rnd() * 7; s = 0.2; } else if (i < 520) { x = -4.2 + rnd() * 8.8; z = 8.45 + rnd() * 0.25; s = 0.22; }
      else { x = -4.2 + rnd() * 8.8; z = 1.7 + rnd() * 6.9; s = 0.06 + rnd() * 0.05; if (x > PIT.x0 - 0.5 && x < PIT.x1 + 0.5 && z > PIT.z0 - 0.45 && z < PIT.z1 + 0.45 || (x > -1.9 && x < -0.5 && z > 2.0 && z < 4.6)) { M.makeScale(0, 0, 0); grass.setMatrixAt(i, M); continue; } }
      s *= 0.7 + rnd() * 0.6; P.set(x, 0, z); Q.setFromEuler(new THREE.Euler(0, rnd() * Math.PI, 0)); Sv.set(s * 1.5, s, s); M.compose(P, Q, Sv); grass.setMatrixAt(i, M); }
    grass.castShadow = true; grass.receiveShadow = true; R.add(grass);
    // stepping stones from the terrace to the side path
    const conc = new THREE.MeshStandardMaterial({ color: "#b9b4ab", roughness: 0.9 });
    for (let i = 0; i < 6; i++) R.add(box(0.42, 0.04, 0.42, conc, [2.75 + i * 0.2, 0.02, 1.95 + i * 0.62], [0, 0.1 * Math.sin(i * 2), 0]));

    // ---------------- the house: two storeys, painted, openings cut into the wall ----------------
    const wallCol = paintTex("#ece5d8", 1);
    { const sh = new THREE.Shape(); sh.moveTo(-4.4, 0); sh.lineTo(4.6, 0); sh.lineTo(4.6, 6.0); sh.lineTo(-4.4, 6.0); sh.closePath();
      const holes: [number, number, number, number][] = [[-2.0, 0.12, 0.4, 2.32], [1.5, 1.1, 2.7, 2.1], [-2.6, 3.4, -1.0, 4.8], [0.6, 3.4, 2.2, 4.8], [3.3, 4.15, 3.85, 4.7]];
      for (const [a, b, c, e] of holes) { const h = new THREE.Path(); h.moveTo(a, b); h.lineTo(a, e); h.lineTo(c, e); h.lineTo(c, b); h.closePath(); sh.holes.push(h); }
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false }); g.translate(0, 0, -0.2); { const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3); }
      const wm = std(rep(wallCol, 1, 1), { roughness: 0.8 }); R.add(mesh(g, wm, [0, 0, 0]));
      // plinth of dark granite tiles, eave fascia, metal-tile roof
      R.add(box(9.0, 0.5, 0.03, new THREE.MeshStandardMaterial({ color: "#5d5a58", roughness: 0.35, metalness: 0.1 }), [0.1, 0.37, 0.015]));
      R.add(box(9.4, 0.25, 0.08, new THREE.MeshStandardMaterial({ color: "#f3efe8", roughness: 0.6 }), [0.1, 6.05, 0.62]));
      const roofT = canvasTex(256, 256, (q) => { q.fillStyle = "#44464c"; q.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 32) { const gr = q.createLinearGradient(0, y, 0, y + 32); gr.addColorStop(0, "#5a5d64"); gr.addColorStop(1, "#2e3035"); q.fillStyle = gr; q.fillRect(0, y, 256, 30); } for (let x = 0; x < 256; x += 32) { q.fillStyle = "rgba(0,0,0,0.25)"; q.fillRect(x, 0, 2, 256); } });
      R.add(mesh(new THREE.PlaneGeometry(9.6, 4.4), std(rep(roofT, 6, 3), { roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide }), [0.1, 7.0, -1.0], [-Math.PI / 2 + 0.55, 0, 0]));
      R.add(mesh(new THREE.PlaneGeometry(9.4, 0.7), new THREE.MeshStandardMaterial({ color: "#e8e2d8", roughness: 0.7, side: THREE.DoubleSide }), [0.1, 5.95, 0.32], [Math.PI / 2, 0, 0])); // soffit
      // what's behind the openings: kitchen (lit), two bedrooms (one lit), a bathroom (frosted)
      const inside = (tex: THREE.Texture, x: number, y: number, wd: number, h: number, glow: number) => { R.add(mesh(new THREE.PlaneGeometry(wd, h), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(glow, glow, glow), toneMapped: true }), [x, y, -0.7], [0, 0, 0], false));
        for (const s of [-1, 1]) R.add(mesh(new THREE.PlaneGeometry(0.5, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55 * glow, 0.4 * glow, 0.3 * glow) }), [x + s * wd / 2, y, -0.45], [0, -s * Math.PI / 2, 0], false)); };
      inside(kitchenTex(), -0.8, 1.22, 2.4, 2.2, 1.25); inside(kitchenTex(), 2.1, 1.6, 1.2, 1.0, 1.15); inside(roomTex(false), -1.8, 4.1, 1.6, 1.4, 0.9); inside(roomTex(true), 1.4, 4.1, 1.6, 1.4, 1.05);
      R.add(box(0.55, 0.55, 0.02, new THREE.MeshStandardMaterial({ color: "#dfe6ea", roughness: 0.4, transparent: true, opacity: 0.85 }), [3.575, 4.425, -0.05], undefined, false));
      // aluminium frames + glass
      const alu = new THREE.MeshStandardMaterial({ color: "#3a3d42", metalness: 0.6, roughness: 0.35 }), glass = new THREE.MeshPhysicalMaterial({ color: "#c9dbe4", roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.22, envMapIntensity: 2 });
      const frame = (a: number, b: number, c: number, e: number, mull: number[]) => { const fw = 0.05, z = -0.04; R.add(box(c - a, fw, 0.06, alu, [(a + c) / 2, b + fw / 2, z]), box(c - a, fw, 0.06, alu, [(a + c) / 2, e - fw / 2, z]), box(fw, e - b, 0.06, alu, [a + fw / 2, (b + e) / 2, z]), box(fw, e - b, 0.06, alu, [c - fw / 2, (b + e) / 2, z]));
        for (const m of mull) R.add(box(fw * 0.8, e - b, 0.06, alu, [m, (b + e) / 2, z])); R.add(mesh(new THREE.PlaneGeometry(c - a, e - b), glass, [(a + c) / 2, (b + e) / 2, -0.03], [0, 0, 0], false)); };
      frame(-2.0, 0.12, 0.4, 2.32, [-0.8]); frame(1.5, 1.1, 2.7, 2.1, [2.1]); frame(-2.6, 3.4, -1.0, 4.8, [-1.8]); frame(0.6, 3.4, 2.2, 4.8, [1.4]);
      for (const [x, wd] of [[1.4, 1.8], [-1.8, 1.8], [2.1, 1.4]] as const) R.add(box(wd, 0.06, 0.16, new THREE.MeshStandardMaterial({ color: "#f3efe8", roughness: 0.6 }), [x, x === 2.1 ? 1.07 : 3.37, 0.06]));
      // AC unit with its pipe, a PVC downpipe, an outdoor lamp by the door
      const acT = canvasTex(256, 192, (q) => { q.fillStyle = "#e9eaea"; q.fillRect(0, 0, 256, 192); q.fillStyle = "#3a3d42"; q.beginPath(); q.arc(100, 96, 70, 0, Math.PI * 2); q.fill(); q.strokeStyle = "#cfd2d4"; q.lineWidth = 3; for (let r = 12; r < 70; r += 11) { q.beginPath(); q.arc(100, 96, r, 0, Math.PI * 2); q.stroke(); } for (let y = 20; y < 180; y += 8) { q.fillStyle = "#c9cbcc"; q.fillRect(190, y, 50, 3); } });
      const ac = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.56, 0.3), [new THREE.MeshStandardMaterial({ color: "#e4e5e5" }), new THREE.MeshStandardMaterial({ color: "#e4e5e5" }), new THREE.MeshStandardMaterial({ color: "#e4e5e5" }), new THREE.MeshStandardMaterial({ color: "#e4e5e5" }), new THREE.MeshStandardMaterial({ map: acT, roughness: 0.5 }), new THREE.MeshStandardMaterial({ color: "#e4e5e5" })]);
      ac.position.set(3.5, 3.0, 0.2); ac.castShadow = ac.receiveShadow = true; R.add(ac); R.add(box(0.9, 0.04, 0.4, alu, [3.5, 2.7, 0.2]));
      R.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 8), new THREE.MeshStandardMaterial({ color: "#f0f0f0" }), [3.0, 3.6, 0.06]));
      R.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 5.9, 12), new THREE.MeshStandardMaterial({ color: "#8f9499", roughness: 0.5 }), [4.45, 3.05, 0.08]));
      R.add(box(0.12, 0.2, 0.1, new THREE.MeshStandardMaterial({ color: "#2a2a2a" }), [0.65, 2.45, 0.06])); R.add(mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.9, 1.2) }), [0.65, 2.38, 0.13], [0, 0, 0], false)); }

    // ---------------- terrace: tiles, a canopy on a black steel frame, the household's things ----------------
    { const tt = tileTex(); R.add(box(9.0, 0.12, 1.65, new THREE.MeshStandardMaterial({ map: rep(tt, 7.5, 1.4), roughness: 0.32, metalness: 0.05 }), [0.1, 0.06, 0.82]));
      R.add(box(9.0, 0.12, 0.04, new THREE.MeshStandardMaterial({ color: "#8a8178", roughness: 0.8 }), [0.1, 0.06, 1.66]));
      const steel = new THREE.MeshStandardMaterial({ color: "#1f2124", metalness: 0.5, roughness: 0.5 });
      for (const x of [-4.2, -2.3, 4.4]) R.add(box(0.08, 2.75, 0.08, steel, [x, 1.5, 1.6]));
      R.add(box(8.8, 0.1, 0.08, steel, [0.1, 2.88, 1.6]));
      for (let x = -4.2; x <= 4.45; x += 1.08) R.add(box(0.05, 0.08, 1.7, steel, [x, 2.98, 0.82], [-0.08, 0, 0]));
      const poly = new THREE.MeshPhysicalMaterial({ color: "#c79a62", roughness: 0.3, transparent: true, opacity: 0.55, side: THREE.DoubleSide }); const pm = mesh(new THREE.PlaneGeometry(8.8, 1.75), poly, [0.1, 3.03, 0.82], [-Math.PI / 2 - 0.08, 0, 0], false); R.add(pm);
      // a front-loading washing machine, a doormat, sandals, a cement pot with a monstera, a rattan chair, a drying rack with laundry
      const wmT = canvasTex(256, 256, (q) => { q.fillStyle = "#f2f2f0"; q.fillRect(0, 0, 256, 256); q.fillStyle = "#cfd2d4"; q.fillRect(0, 0, 256, 50); q.fillStyle = "#2a2d33"; q.beginPath(); q.arc(128, 150, 72, 0, Math.PI * 2); q.fill(); q.fillStyle = "#57606c"; q.beginPath(); q.arc(128, 150, 54, 0, Math.PI * 2); q.fill(); q.fillStyle = "rgba(255,255,255,0.25)"; q.beginPath(); q.ellipse(108, 128, 18, 10, -0.6, 0, Math.PI * 2); q.fill(); q.fillStyle = "#3a8ad8"; q.fillRect(180, 18, 50, 14); });
      const wmM = new THREE.MeshStandardMaterial({ color: "#efefed", roughness: 0.4 }); const wmc = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.85, 0.58), [wmM, wmM, wmM, wmM, new THREE.MeshStandardMaterial({ map: wmT, roughness: 0.4 }), wmM]); wmc.position.set(3.75, 0.545, 0.4); wmc.castShadow = wmc.receiveShadow = true; R.add(wmc);
      R.add(box(0.9, 0.015, 0.55, new THREE.MeshStandardMaterial({ color: "#6a4a3a", roughness: 1 }), [-0.8, 0.128, 0.45]));
      for (const [x, r] of [[-1.15, 0.2], [-0.95, -0.25]] as const) R.add(box(0.1, 0.022, 0.26, new THREE.MeshStandardMaterial({ color: "#2a4a7a", roughness: 0.8 }), [x, 0.135, 0.95], [0, r, 0]));
      const potM = new THREE.MeshStandardMaterial({ color: "#8d8c88", roughness: 0.9 });
      const plant = (x: number, z: number, y0: number, s: number) => { R.add(mesh(new THREE.CylinderGeometry(0.2 * s, 0.15 * s, 0.4 * s, 18), potM, [x, y0 + 0.2 * s, z]));
        const lm = new THREE.MeshStandardMaterial({ map: bananaLeaf(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.7, color: "#6a9a52" });
        for (let i = 0; i < 9; i++) { const g = new THREE.PlaneGeometry(0.28 * s, 0.5 * s, 1, 6); g.translate(0, 0.25 * s, 0); const pv = new THREE.Group(); pv.position.set(x, y0 + 0.38 * s, z); pv.rotation.set(-0.5 - rnd() * 0.6, (i / 9) * Math.PI * 2, 0); const lf = new THREE.Mesh(g, lm); lf.castShadow = true; pv.add(lf); R.add(pv); this.sway.push({ o: pv, base: pv.rotation.clone(), amp: 0.03, f: 0.6, ph: i }); } };
      plant(0.85, 0.35, 0.12, 1.2); plant(-3.9, 0.4, 0.12, 1.0); plant(-3.95, 2.3, 0, 1.3); plant(-3.95, 5.6, 0, 1.1);
      { const ch = new THREE.Group(); ch.position.set(1.1, 0.12, 1.0); ch.rotation.y = -0.4; const rt = new THREE.MeshStandardMaterial({ color: "#a5774a", roughness: 0.8 });
        ch.add(mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.08, 20), rt, [0, 0.4, 0])); ch.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.45, 20, 1, true, Math.PI * 0.65, Math.PI * 0.7), new THREE.MeshStandardMaterial({ color: "#a5774a", roughness: 0.8, side: THREE.DoubleSide }), [0, 0.66, 0]));
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.6; ch.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.4, 6), rt, [0.22 * Math.cos(a), 0.2, 0.22 * Math.sin(a)])); } R.add(ch); }
      { const rack = new THREE.Group(); rack.position.set(-3.0, 0.12, 1.05); rack.rotation.y = 0.15; const am = new THREE.MeshStandardMaterial({ color: "#c9ccd0", metalness: 0.8, roughness: 0.3 });
        for (const s of [-1, 1]) { rack.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.35, 6), am, [s * 0.75, 0.62, 0.25], [0.38, 0, 0])); rack.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.35, 6), am, [s * 0.75, 0.62, -0.25], [-0.38, 0, 0])); }
        for (let k = 0; k < 4; k++) rack.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.5, 6), am, [0, 1.22, -0.18 + k * 0.12], [0, 0, Math.PI / 2], false));
        for (const [x, wd, ht, kd, zz] of [[-0.42, 0.55, 0.7, "batik", -0.18], [0.12, 0.45, 0.55, "towel", -0.06], [0.45, 0.42, 0.5, "tee", 0.06], [-0.05, 0.4, 0.75, "jeans", 0.18]] as const) {
          const cg = new THREE.PlaneGeometry(wd, ht, 10, 8); cg.translate(0, -ht / 2, 0); const m = mesh(cg, new THREE.MeshStandardMaterial({ map: clothTex(kd), roughness: 0.95, side: THREE.DoubleSide }), [x, 1.22, zz]); m.castShadow = false;
          this.cloths.push({ m, base: Float32Array.from((cg.attributes.position as THREE.BufferAttribute).array as Float32Array), ph: rnd() * 6 }); rack.add(m); }
        R.add(rack); } }

    // ---------------- boundary walls (painted render, caps), roster on top of the far wall ----------------
    { const bw = paintTex("#d6cfc2", 2), cap = new THREE.MeshStandardMaterial({ color: "#c4bdb0", roughness: 0.8 });
      R.add(box(0.16, 2.2, 8.9, std(rep(bw, 3, 0.8)), [-4.48, 1.1, 4.45])); R.add(box(0.24, 0.07, 8.9, cap, [-4.48, 2.235, 4.45]));
      R.add(box(0.16, 2.2, 8.9, std(rep(bw, 3, 0.8)), [4.78, 1.1, 4.45])); R.add(box(0.24, 0.07, 8.9, cap, [4.78, 2.235, 4.45]));
      R.add(box(9.4, 1.05, 0.16, std(rep(bw, 3, 0.4)), [0.15, 0.525, 8.9])); R.add(box(9.4, 0.06, 0.24, cap, [0.15, 1.08, 8.9]));
      const rt = rosterTex(); const ros = new THREE.MeshStandardMaterial({ map: rep(rt, 23, 2.5), alphaTest: 0.5, roughness: 0.9, side: THREE.DoubleSide }); const rm = mesh(new THREE.PlaneGeometry(9.2, 1.0), ros, [0.15, 1.6, 8.9]); rm.castShadow = true; R.add(rm);
      R.add(box(9.4, 0.08, 0.24, cap, [0.15, 2.14, 8.9]));
      for (const x of [-4.48, -1.4, 1.7, 4.78]) R.add(box(0.24, 2.2, 0.24, std(rep(bw, 0.3, 0.8)), [x, 1.1, 8.9])); }
    // palm clumps in the far corners, a mango tree in the left corner (sways)
    const palm = (x: number, z: number, n: number, h: number) => { const fm = new THREE.MeshStandardMaterial({ color: "#5f8f3a", roughness: 0.8, side: THREE.DoubleSide }), tm = new THREE.MeshStandardMaterial({ color: "#c8b25a", roughness: 0.7 });
      for (let k = 0; k < n; k++) { const sx = x + (rnd() - 0.5) * 0.5, sz = z + (rnd() - 0.5) * 0.4, hh = h * (0.6 + rnd() * 0.5); R.add(mesh(new THREE.CylinderGeometry(0.035, 0.05, hh, 8), tm, [sx, hh / 2, sz], [(rnd() - 0.5) * 0.15, 0, (rnd() - 0.5) * 0.15]));
        for (let i = 0; i < 7; i++) { const g = new THREE.PlaneGeometry(0.32, 1.3, 1, 8); g.translate(0, 0.65, 0); const p = g.attributes.position as THREE.BufferAttribute; for (let j = 0; j < p.count; j++) { const y = p.getY(j); p.setZ(j, -0.4 * (y / 1.3) ** 2); p.setX(j, p.getX(j) * (1 - y / 1.4)); }
          const pv = new THREE.Group(); pv.position.set(sx, hh, sz); pv.rotation.set(-0.7 - rnd() * 0.6, (i / 7) * Math.PI * 2 + rnd(), 0); const lf = new THREE.Mesh(g, fm); lf.castShadow = true; pv.add(lf); R.add(pv); this.sway.push({ o: pv, base: pv.rotation.clone(), amp: 0.05, f: 0.5 + rnd() * 0.4, ph: rnd() * 6 }); } } };
    palm(-3.9, 8.3, 4, 2.2); palm(4.2, 8.2, 3, 2.0);
    { const tree = new THREE.Group(); tree.position.set(3.7, 0, 6.9); const bark = new THREE.MeshStandardMaterial({ color: "#5a4636", roughness: 0.9 }), leafM = new THREE.MeshStandardMaterial({ color: "#3f6e30", roughness: 0.85, flatShading: true });
      tree.add(mesh(new THREE.CylinderGeometry(0.1, 0.16, 2.2, 10), bark, [0, 1.1, 0], [0, 0, 0.08])); tree.add(mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.2, 8), bark, [0.35, 2.2, 0], [0, 0, -0.6]));
      const crown = new THREE.Group(); crown.position.set(0.1, 2.6, 0); tree.add(crown);
      for (let i = 0; i < 9; i++) { const g = new THREE.IcosahedronGeometry(0.55 + rnd() * 0.3, 1); const p = g.attributes.position as THREE.BufferAttribute; for (let j = 0; j < p.count; j++) { const k = 1 + 0.15 * Math.sin(p.getX(j) * 9 + p.getY(j) * 7 + i); p.setXYZ(j, p.getX(j) * k, p.getY(j) * k * 0.8, p.getZ(j) * k); } g.computeVertexNormals();
        crown.add(mesh(g, leafM, [(rnd() - 0.5) * 1.6, rnd() * 0.9, (rnd() - 0.5) * 1.4])); }
      this.sway.push({ o: crown, base: crown.rotation.clone(), amp: 0.015, f: 0.3, ph: 0 }); R.add(tree); }

    // ---------------- pond supplies: light concrete blocks, cement sack, a wheelbarrow, a rubber bucket ----------------
    { const hb = new THREE.MeshStandardMaterial({ color: "#dedbd4", roughness: 0.95 });
      for (let l = 0; l < 4; l++) for (let i = 0; i < 3; i++) R.add(box(0.6, 0.2, 0.1, hb, l % 2 ? [2.55, 0.1 + l * 0.2, 2.5 + i * 0.2] : [2.3 + i * 0.2, 0.1 + l * 0.2, 2.7], [0, l % 2 ? 0 : Math.PI / 2, 0]));
      const sack = new THREE.SphereGeometry(1, 20, 12); const pp = sack.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pp.count; i++) pp.setY(i, Math.max(-0.2, pp.getY(i))); sack.computeVertexNormals();
      const sackTex = canvasTex(256, 256, (g) => { g.fillStyle = "#d9d2c0"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#c0392b"; g.fillRect(0, 70, 256, 60); g.fillStyle = "#fff"; g.font = "bold 44px Arial"; g.textAlign = "center"; g.beginPath(); g.arc(128, 100, 22, 0, Math.PI * 2); g.fill(); });
      const sm = mesh(sack, new THREE.MeshStandardMaterial({ map: sackTex, roughness: 0.95 }), [2.55, 0.07, 3.6], [0, -0.5, 0]); sm.scale.set(0.3, 0.12, 0.22); R.add(sm);
      const wb = new THREE.Group(); wb.position.set(3.45, 0, 3.75); wb.rotation.y = -0.35; const tray = new THREE.MeshStandardMaterial({ color: "#2f6e3a", metalness: 0.4, roughness: 0.5, side: THREE.DoubleSide }), st = new THREE.MeshStandardMaterial({ color: "#2a2a2a", metalness: 0.5, roughness: 0.5 });
      const tg = new THREE.CylinderGeometry(0.42, 0.28, 0.28, 4, 1, true); tg.rotateY(Math.PI / 4); const tm = mesh(tg, tray, [0, 0.5, 0]); tm.scale.set(1, 1, 1.4); wb.add(tm); wb.add(mesh(new THREE.BoxGeometry(0.38, 0.02, 0.5), tray, [0, 0.37, 0]));
      wb.add(mesh(new THREE.TorusGeometry(0.17, 0.05, 10, 20), st, [0, 0.2, 0.6], [0, Math.PI / 2, 0])); for (const s of [-1, 1]) { wb.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.3, 6), st, [s * 0.22, 0.45, -0.15], [Math.PI / 2 - 0.25, 0, 0])); wb.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.36, 6), st, [s * 0.2, 0.18, -0.25])); }
      R.add(wb); R.add(mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.24, 18, 1, true), new THREE.MeshStandardMaterial({ color: "#ff8c42", roughness: 0.5, side: THREE.DoubleSide }), [2.95, 0.12, 3.15])); }

    // ---------------- beyond: neighbours' houses, a water tower, the city skyline at dusk ----------------
    const roofM = new THREE.MeshStandardMaterial({ color: "#3e3f45", roughness: 0.6, metalness: 0.3 });
    const nhouse = (x: number, z: number, wd: number, dp: number, h: number, col: string, ry: number, seed: number) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
      const ft = facadeTex(col, 2, Math.max(2, Math.round(wd / 2.2)), seed), side = new THREE.MeshStandardMaterial({ color: col, roughness: 0.85 }), fr = new THREE.MeshStandardMaterial({ map: ft, roughness: 0.8 });
      const b = new THREE.Mesh(new THREE.BoxGeometry(wd, h, dp), [side, side, side, side, fr, fr]); b.position.y = h / 2; b.castShadow = b.receiveShadow = true; g.add(b);
      const rg = new THREE.CylinderGeometry(0.01, Math.SQRT1_2 * 1.0, 1.6, 4, 1); rg.rotateY(Math.PI / 4); const rf = mesh(rg, roofM, [0, h + 0.8, 0]); rf.scale.set(wd * 1.1, 1, dp * 1.1); g.add(rf); R.add(g); return g; };
    nhouse(-12.5, 14.0, 6, 7, 6.4, "#b7d1c3", 0.02, 1); nhouse(1.0, 13.6, 6.2, 7, 6.8, "#e6c4a9", -0.03, 2); nhouse(7.6, 12.8, 6, 7, 6.2, "#cfd3d8", 0.05, 3);
    nhouse(-10.5, 4.5, 6, 7, 6.6, "#d9c9a2", Math.PI / 2, 4); nhouse(10.8, 4.0, 6, 7, 6.4, "#c9c2d6", -Math.PI / 2, 5); nhouse(-9, -7, 7, 6, 7.5, "#d4d0c4", 0, 6); nhouse(7, -8, 7, 6, 8.5, "#bfcad0", 0, 7);
    { const tw = new THREE.Group(); tw.position.set(2.6, 6.8, 13.0); const st = new THREE.MeshStandardMaterial({ color: "#3a3c40", metalness: 0.5, roughness: 0.5 });
      for (const [a, b] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) tw.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), st, [a, 0.7, b]));
      tw.add(mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.2, 20), new THREE.MeshStandardMaterial({ color: "#e57a2c", roughness: 0.5 }), [0, 2.0, 0])); tw.add(mesh(new THREE.SphereGeometry(0.55, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#e57a2c", roughness: 0.5 }), [0, 2.6, 0])); R.add(tw);
      const dish = mesh(new THREE.SphereGeometry(0.4, 16, 8, 0, Math.PI * 2, 0, 0.6), new THREE.MeshStandardMaterial({ color: "#e8e8e8", roughness: 0.5, side: THREE.DoubleSide }), [-4.0, 7.3, 11.2], [-1.2, 0, 0]); R.add(dish); }
    // a mosque dome and more roofs far off (a middle-class estate: no tall buildings)
    { const sil = new THREE.MeshStandardMaterial({ color: "#8a7a8e", roughness: 1 }), mq = new THREE.Group(); mq.position.set(-16, 0, 34); mq.add(box(8, 4.5, 7, sil, [0, 2.25, 0], undefined, false)); mq.add(mesh(new THREE.SphereGeometry(2.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#3f8a74", roughness: 0.5, metalness: 0.3 }), [0, 4.5, 0], [0, 0, 0], false));
      mq.add(mesh(new THREE.CylinderGeometry(0.45, 0.5, 11, 10), sil, [5.5, 5.5, 0], [0, 0, 0], false)); mq.add(mesh(new THREE.ConeGeometry(0.7, 1.4, 10), new THREE.MeshStandardMaterial({ color: "#3f8a74", roughness: 0.5 }), [5.5, 11.7, 0], [0, 0, 0], false)); R.add(mq);
      const cols = ["#d8b4a0", "#b8c8b0", "#c8b8d0", "#e0cfa0", "#a8c0d0"]; for (let i = 0; i < 16; i++) { const a2 = (i / 16) * Math.PI * 2, r = 22 + rnd() * 10, x = Math.sin(a2) * r, z = Math.cos(a2) * r; if (Math.abs(x) < 6 && z > 0 && z < 20) continue; nhouse(x, z, 6, 6, 5.5 + rnd() * 2, cols[i % 5], a2, 10 + i); }
      for (const [x, z] of [[-8, 20], [9, 22], [-20, 8], [18, -14]] as const) { const tr = new THREE.Group(); tr.position.set(x, 0, z); tr.add(mesh(new THREE.CylinderGeometry(0.2, 0.3, 4, 8), new THREE.MeshStandardMaterial({ color: "#5a4636" }), [0, 2, 0])); for (let k = 0; k < 5; k++) tr.add(mesh(new THREE.IcosahedronGeometry(1.6 + rnd(), 1), new THREE.MeshStandardMaterial({ color: "#4f7f3a", roughness: 0.9, flatShading: true }), [(rnd() - 0.5) * 2.5, 4.5 + rnd() * 1.5, (rnd() - 0.5) * 2.5])); R.add(tr); } }

    // ---------------- the coin (lying on the step in the pit) ----------------
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
    for (const c of this.cloths) { const pp = c.m.geometry.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pp.count; i++) { const x = c.base[i * 3], y = c.base[i * 3 + 1], k = -y; pp.setZ(i, k * 0.05 * Math.sin(t * 1.6 + c.ph + x * 2.5) + k * 0.025 * Math.sin(t * 2.7 + x * 5)); } pp.needsUpdate = true; c.m.geometry.computeVertexNormals(); }
  }
}
