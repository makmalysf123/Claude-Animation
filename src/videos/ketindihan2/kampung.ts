// The night kampung for the hook (S1): streets, varied Indonesian houses (gable/hip/zinc roofs, porches, fences,
// water towers, antennas), palms, banana plants, leafy trees, power poles with sagging wires, street lamps pooling warm
// light, moonlit soft shadows. Pak Budi's house sits at the origin, facing +z; the camera ends at its bedroom window.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { woodPlanks, plaster, rooftiles, stone, dirt, bananaLeaf, grassTuft, curtain, rnd, fbm } from "../../lib/world2/textures";
import { std, canvasTex } from "./sets";
import { interiorWindow, RoomKind } from "./interior";
const MOONDIR = new THREE.Vector3(-24, 40, -32).normalize();

type V3 = [number, number, number];
const mat = (c: string, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
const put = (g: THREE.Object3D, o: THREE.Object3D, p: V3, r: V3 = [0, 0, 0]) => { o.position.set(...p); o.rotation.set(...r); o.traverse((k) => { if ((k as THREE.Mesh).isMesh) { k.castShadow = true; k.receiveShadow = true; } }); g.add(o); return o; };
const M = (geo: THREE.BufferGeometry, m: THREE.Material) => new THREE.Mesh(geo, m);
const rbox = (w: number, h: number, d: number, r = 0.03) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.1, h / 2.1, d / 2.1));

/** palm frond: a central rib with leaflets, alpha texture */
const frondTex = canvasTex(128, 512, (g) => {
  g.clearRect(0, 0, 128, 512);
  for (let y = 6; y < 500; y += 5) { const L = 60 * Math.sin(Math.PI * Math.min(1, (y + 30) / 540)) ** 0.7; for (const s of [-1, 1]) { const c = 0.8 + 0.4 * rnd(); g.fillStyle = `rgb(${62 * c},${104 * c},${44 * c})`; g.save(); g.translate(64, y); g.rotate(s * (1.05 - 0.25 * y / 512)); g.beginPath(); g.ellipse(0, -L / 2, 4.5, L / 2, 0, 0, Math.PI * 2); g.fill(); g.restore(); } }
  g.strokeStyle = "#8a8a4a"; g.lineWidth = 6; g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 512); g.stroke();
});
/** leafy canopy texture (no alpha) for the big trees */
const leafTex = canvasTex(256, 256, (g) => {
  for (let y = 0; y < 256; y += 2) for (let x = 0; x < 256; x += 2) { const n = fbm(x, y, 256, 16, 4); const v = 0.5 + n * 0.8; g.fillStyle = `rgb(${30 * v + 10},${70 * v + 18},${38 * v + 10})`; g.fillRect(x, y, 2, 2); }
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(150,200,110,${0.12 + rnd() * 0.18})`; g.beginPath(); g.ellipse(rnd() * 256, rnd() * 256, 3 + rnd() * 4, 1.5 + rnd() * 2, rnd() * 3, 0, Math.PI * 2); g.fill(); }
});
leafTex.wrapS = leafTex.wrapT = THREE.RepeatWrapping;
/** corrugated zinc */
const zincTex = canvasTex(256, 256, (g) => { for (let x = 0; x < 256; x++) { const k = 0.5 + 0.5 * Math.sin(x / 256 * Math.PI * 24); const n = fbm(x, 0, 256, 8, 3); const v = 120 + 70 * k + 30 * n; g.fillStyle = `rgb(${v},${v + 4},${v + 10})`; g.fillRect(x, 0, 1, 256); } for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(120,70,40,${rnd() * 0.25})`; g.fillRect(rnd() * 256, rnd() * 256, 6 + rnd() * 30, 3 + rnd() * 20); } });
zincTex.wrapS = zincTex.wrapT = THREE.RepeatWrapping;
/** lit window: warm glow with a curtain silhouette and a frame cross */
const winTex = (lit: number, seed: number) => canvasTex(128, 128, (g) => {
  const gr = g.createRadialGradient(64, 70, 5, 64, 70, 90); gr.addColorStop(0, lit ? "#ffd89a" : "#22304e"); gr.addColorStop(1, lit ? "#c87830" : "#0c1426"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  if (lit) { g.fillStyle = "rgba(150,60,30,0.55)"; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(30 + seed * 10, 64, 18, 128); g.lineTo(0, 128); g.fill(); g.beginPath(); g.moveTo(128, 0); g.quadraticCurveTo(98 - seed * 10, 64, 110, 128); g.lineTo(128, 128); g.fill(); }
  else { g.fillStyle = "rgba(160,190,255,0.18)"; g.beginPath(); g.moveTo(10, 0); g.lineTo(50, 0); g.lineTo(10, 60); g.fill(); }
  g.fillStyle = "#3a2618"; g.fillRect(60, 0, 8, 128); g.fillRect(0, 60, 128, 8); g.lineWidth = 10; g.strokeStyle = "#3a2618"; g.strokeRect(0, 0, 128, 128);
});
const WIN = [winTex(0, 0), winTex(1, 0), winTex(1, 1)];

export class KampungSet {
  root = new THREE.Group(); sunDir = new THREE.Vector3(); ghostSpots: V3[] = []; heroWindow: V3 = [0, 1.45, 2.06];
  private tw: { m: THREE.ShaderMaterial; ph: number; tv: boolean }[] = [];
  constructor() {
    const R = this.root;
    // ---------- ground, roads, gutters ----------
    const ground = M(new THREE.PlaneGeometry(140, 140), std(dirt(), [36, 36], { color: "#8a8f78" })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; R.add(ground);
    const grassM = std(dirt(), [10, 10], { color: "#5c7a46" });
    const asphalt = std(stone(), [3, 40], { color: "#5a5c66", roughness: 0.32, metalness: 0.05 });
    const road = (x: number, z: number, w: number, l: number, rotY = 0) => { const r = M(new THREE.BoxGeometry(w, 0.04, l), asphalt); r.position.set(x, 0.02, z); r.rotation.y = rotY; r.receiveShadow = true; R.add(r);
      for (const s of [-1, 1]) { const c = M(new THREE.BoxGeometry(0.18, 0.08, l), mat("#9a968a", { roughness: 0.9 })); c.position.set(x + (rotY ? 0 : s * (w / 2 + 0.09)), 0.04, z + (rotY ? s * (w / 2 + 0.09) : 0)); c.rotation.y = rotY; c.receiveShadow = c.castShadow = true; R.add(c); } };
    road(0, 6.2, 4.2, 140, Math.PI / 2); road(-12, 0, 3.6, 140); road(12, 0, 3.6, 140);
    // ---------- houses ----------
    const wallCols = ["#e8dcc0", "#cfe0cc", "#bcd3e3", "#f2e2b6", "#e6c9b8", "#d9d2c8", "#c8d8b0"];
    const tileTints = ["#e0ccc0", "#4c4c58", "#c8b8ac", "#5a5260", "#d8c4b4"];
    const tiles = rooftiles();
    const slots: [number, number, number][] = []; // x, z, facing (1 = +z, -1 = -z)
    for (const x of [-24, -17, -6, 6, 17, 24]) slots.push([x, 0, 1]);
    for (const x of [-24, -17, -6, 6, 17, 24]) slots.push([x, 12.6, -1]);
    for (const x of [-24, -17, -6, 0, 6, 17, 24]) slots.push([x, -9, 1]);
    for (const x of [-17, -6, 0, 6, 17]) slots.push([x, 21.5, -1]);
    slots.unshift([0, 0, 1]); // hero house first
    slots.forEach(([x, z, f], i) => {
      if (i > 0 && Math.abs(x) < 1 && z === 0) return;
      const hero = i === 0, hx = hero ? 0 : x + (rnd() - 0.5) * 0.8, hz = hero ? 0 : z + (rnd() - 0.5) * 0.6;
      const w = hero ? 5.2 : 4.4 + rnd() * 0.9, d = hero ? 4.2 : 3.8 + rnd() * 1.2, h = 2.6 + rnd() * 0.4;
      const kind = hero ? 0 : i % 3; // 0 gable tiles, 1 hip tiles, 2 zinc lean-to
      const g = new THREE.Group(); g.position.set(hx, 0, hz); g.rotation.y = f > 0 ? 0 : Math.PI; R.add(g);
      const wm = std(plaster(wallCols[(i * 3) % wallCols.length]), [2, 1]);
      put(g, M(new THREE.BoxGeometry(w, h, d), wm), [0, h / 2, 0]);
      put(g, M(new THREE.BoxGeometry(w + 0.06, 0.35, d + 0.06), mat("#6f6a62", { roughness: 0.95 })), [0, 0.175, 0]);
      // roof
      const tint = tileTints[i % tileTints.length], ov = 0.45, rh = kind === 2 ? 0.6 : 1.35 + rnd() * 0.35;
      const tm = new THREE.MeshStandardMaterial({ map: tiles.map, normalMap: tiles.normal, color: tint, roughness: 0.42, metalness: 0.05, side: THREE.DoubleSide });
      if (kind === 0) {
        const L = Math.hypot(d / 2 + ov, rh), a = Math.atan2(rh, d / 2 + ov);
        for (const s of [-1, 1]) { const sl = put(g, M(new THREE.BoxGeometry(w + 2 * ov, 0.07, L), tm), [0, h + rh / 2, s * (d / 4 + ov / 2)], [s * a, 0, 0]); void sl; }
        put(g, M(new THREE.CylinderGeometry(0.09, 0.09, w + 2 * ov, 8), mat("#7a3a2a")), [0, h + rh + 0.03, 0], [0, 0, Math.PI / 2]);
        const tri = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, rh)]);
        for (const s of [-1, 1]) put(g, M(new THREE.ShapeGeometry(tri), wm), [s * (w / 2 + 0.001), h, 0], [0, s * Math.PI / 2, 0]);
      } else if (kind === 1) {
        const geo = new THREE.BufferGeometry(), X = w / 2 + ov, Z = d / 2 + ov, r = Math.max(0.3, X - Z);
        const P = [[-X, 0, Z], [X, 0, Z], [r, rh, 0], [-X, 0, Z], [r, rh, 0], [-r, rh, 0], [X, 0, -Z], [-X, 0, -Z], [-r, rh, 0], [X, 0, -Z], [-r, rh, 0], [r, rh, 0], [X, 0, Z], [X, 0, -Z], [r, rh, 0], [-X, 0, -Z], [-X, 0, Z], [-r, rh, 0]];
        geo.setAttribute("position", new THREE.Float32BufferAttribute(P.flat(), 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(P.flatMap((p) => [p[0] / 1.2, (p[2] + p[1]) / 1.2]), 2)); geo.computeVertexNormals();
        put(g, M(geo, tm), [0, h, 0]);
      } else {
        const zm = new THREE.MeshStandardMaterial({ map: zincTex, color: "#c8ccd4", metalness: 0.55, roughness: 0.45, side: THREE.DoubleSide }); zm.map!.repeat.set(3, 1);
        const L = Math.hypot(d + 2 * ov, rh); put(g, M(new THREE.BoxGeometry(w + 2 * ov, 0.05, L), zm), [0, h + rh / 2, 0], [-Math.atan2(rh, d + 2 * ov), 0, 0]);
      }
      // front: door, windows, porch
      const fz = d / 2 + 0.015, litBoth = !hero && rnd() > 0.45;
      put(g, M(rbox(0.95, 2.0, 0.08, 0.02), std(woodPlanks(["#5d3a22", "#2f4a5a", "#6a2e2a"][i % 3], 3, "dr" + (i % 3)), [1, 1])), [-w * 0.18, 1.0, fz]);
      for (const wx of [w * 0.12, w * 0.34]) {
        const lit = hero ? (wx > w * 0.3 ? 2 : 0) : litBoth || rnd() > 0.6 ? 1 + (i % 2) : 0;
        put(g, M(rbox(0.95, 1.05, 0.1, 0.02), mat("#4a2e1c")), [wx, 1.45, fz]);
        const kindR: RoomKind = hero ? "budi" : (["living", "bedroom", "kitchen"] as RoomKind[])[(i + Math.round(wx * 3)) % 3];
        const tv = kindR === "living" && lit > 0, light = hero ? new THREE.Color(0.42, 0.3, 0.2) : !lit ? new THREE.Color(0.035, 0.04, 0.07) : kindR === "kitchen" ? new THREE.Color(1.25, 1.35, 1.25) : new THREE.Color(1.6, 1.1, 0.62);
        const wmat = interiorWindow(kindR, light, MOONDIR, { curtain: hero ? 0.55 : 0.25 + rnd() * 0.5, tv: tv ? 0.5 : 0 });
        const gl = M(new THREE.PlaneGeometry(1, 1), wmat); gl.scale.set(0.82, 0.92, 1); gl.position.set(wx, 1.45, fz + 0.06); g.add(gl); void WIN;
        if (tv) this.tw.push({ m: wmat, ph: rnd() * 10, tv: true });
        if (lit && !hero && Math.abs(hx) < 14 && hz > -12 && hz < 16) { const wl = new THREE.PointLight(kindR === "kitchen" ? "#e8f0ff" : "#ffb468", 1.4, 4.5, 1.8); wl.position.set(wx, 1.45, fz + 0.5); g.add(wl); }
        if (hero && wx > w * 0.3) this.heroWindow = [hx + wx, 1.45, hz + fz + 0.07];
      }
      // porch roof on posts + a porch lamp
      if (kind !== 2 || hero) {
        const pm = std(woodPlanks("#6a4a30", 2, "post"), [1, 1]);
        for (const px of [-w / 2 + 0.25, w / 2 - 0.25]) put(g, M(new THREE.CylinderGeometry(0.06, 0.07, h - 0.3, 8), pm), [px, (h - 0.3) / 2, d / 2 + 1.1]);
        put(g, M(new THREE.BoxGeometry(w + 0.3, 0.06, 1.5), tm), [0, h - 0.18, d / 2 + 0.72], [0.22, 0, 0]);
        put(g, M(new THREE.BoxGeometry(w, 0.1, 1.3), std(stone(), [3, 1], { color: "#b8ae9e" })), [0, 0.05, d / 2 + 0.65]);
        const bulbOn = hero ? false : rnd() > 0.35;
        const bulb = M(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: bulbOn ? new THREE.Color(4, 3, 1.6) : new THREE.Color(0.3, 0.3, 0.3) })); bulb.position.set(0.3, h - 0.45, d / 2 + 0.5); g.add(bulb);
        if (bulbOn && Math.abs(hx) < 16 && hz < 14 && hz > -10) { const pl = new THREE.PointLight("#ffb46a", 3.2, 6, 1.6); pl.position.set(0.3, h - 0.6, d / 2 + 0.6); g.add(pl); }
      }
      // fence + gate, yard clutter
      if (!hero && rnd() > 0.3) { const fm = std(plaster("#d8d0c0"), [3, 0.5]); for (const s of [-1, 1]) put(g, M(new THREE.BoxGeometry(w / 2 - 0.6, 0.8, 0.14), fm), [s * (w / 4 + 0.3), 0.4, d / 2 + 1.75]); put(g, M(new THREE.BoxGeometry(1.0, 0.75, 0.05), mat("#2b2f38", { metalness: 0.6, roughness: 0.4 })), [0.1, 0.4, d / 2 + 1.75]); }
      if (rnd() > 0.45) { const tg = new THREE.Group(); put(tg, M(new THREE.CylinderGeometry(0.42, 0.42, 0.8, 16), mat(["#2c6fb0", "#e08a2a", "#d8d8d0"][i % 3], { roughness: 0.4 })), [0, 0.4, 0]); for (const a of [0.4, -0.4]) for (const b of [0.4, -0.4]) put(tg, M(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 5), mat("#555")), [a, -0.5, b]); put(g, tg, [w / 2 - 0.8, h + 1.15, -d / 2 + 0.8]); }
      if (rnd() > 0.5) { const an = new THREE.Group(); put(an, M(new THREE.CylinderGeometry(0.015, 0.015, 2.4, 4), mat("#888", { metalness: 0.7 })), [0, 1.2, 0]); for (let k = 0; k < 5; k++) put(an, M(new THREE.CylinderGeometry(0.01, 0.01, 0.9 - k * 0.12, 4), mat("#888", { metalness: 0.7 })), [0, 1.6 + k * 0.17, 0], [0, 0, Math.PI / 2]); put(g, an, [-w / 2 + 0.6, h + 0.8, -0.4]); }
      for (let k = 0; k < 3; k++) if (rnd() > 0.4) { const pot = new THREE.Group(); put(pot, M(new THREE.CylinderGeometry(0.16, 0.12, 0.28, 12), mat("#a8583a")), [0, 0.14, 0]); put(pot, M(new THREE.IcosahedronGeometry(0.25, 1), new THREE.MeshStandardMaterial({ map: leafTex, roughness: 0.9 })), [0, 0.42, 0]); put(g, pot, [-w / 2 + 0.4 + k * 0.5, 0.1, d / 2 + 1.3]); }
      if (hero) {
        const wd = std(woodPlanks("#7a5232", 4, "bale"), [1, 1]), bale = new THREE.Group();
        put(bale, M(rbox(1.6, 0.08, 0.6, 0.02), wd), [0, 0.42, 0]); for (const a of [-0.72, 0.72]) for (const b of [-0.24, 0.24]) put(bale, M(new THREE.BoxGeometry(0.07, 0.42, 0.07), wd), [a, 0.21, b]);
        put(bale, M(rbox(1.5, 0.35, 0.06, 0.02), wd), [0, 0.65, -0.28]); put(g, bale, [-w * 0.05, 0.1, d / 2 + 0.55]);
        for (const [sx, c] of [[-0.9, "#2a5a8a"], [-0.72, "#2a5a8a"], [0.55, "#8a3a2a"], [0.72, "#8a3a2a"]] as [number, string][]) put(g, M(rbox(0.11, 0.03, 0.26, 0.01), mat(c)), [sx - w * 0.18, 0.12, d / 2 + 0.95], [0, 0.2 * sx, 0]);
        put(g, M(new THREE.BoxGeometry(0.9, 0.012, 0.55), std(woodPlanks("#8a6a3a", 9, "mat"), [1, 1])), [-w * 0.18, 0.105, d / 2 + 0.4]);
        const cage = new THREE.Group(); put(cage, M(new THREE.CylinderGeometry(0.18, 0.18, 0.32, 14, 1, true), new THREE.MeshStandardMaterial({ color: "#c8a060", wireframe: true })), [0, 0, 0]); put(cage, M(new THREE.ConeGeometry(0.2, 0.14, 14), mat("#a87a40")), [0, 0.23, 0]); put(g, cage, [-w * 0.42, h - 0.75, d / 2 + 0.95]);
        for (let k = 0; k < 5; k++) { const pot = new THREE.Group(); put(pot, M(new THREE.CylinderGeometry(0.17, 0.12, 0.3, 14), mat(["#a8583a", "#3a6a8a", "#c8b090"][k % 3])), [0, 0.15, 0]); const leaf = M(new THREE.IcosahedronGeometry(0.28, 2), new THREE.MeshStandardMaterial({ map: leafTex, roughness: 0.9 })); leaf.scale.set(1, 1.2, 1); put(pot, leaf, [0, 0.5, 0]); put(g, pot, [w / 2 - 0.35 - k * 0.42, 0.1, d / 2 + 1.25]); }
        const mb = new THREE.Group(); put(mb, M(new THREE.TorusGeometry(0.26, 0.07, 8, 18), mat("#151515")), [-0.55, 0.3, 0]); put(mb, M(new THREE.TorusGeometry(0.26, 0.07, 8, 18), mat("#151515")), [0.55, 0.3, 0]); put(mb, M(rbox(1.2, 0.35, 0.32, 0.12), mat("#1d3f8a", { metalness: 0.3, roughness: 0.3 })), [0, 0.62, 0]); put(mb, M(rbox(0.5, 0.12, 0.28, 0.05), mat("#1a1a1a")), [-0.15, 0.85, 0]); put(g, mb, [-w / 2 - 0.9, 0, d / 2 + 0.6], [0, 1.4, 0]);
      }
      this.ghostSpots.push([hx, h + rh + 1.6, hz]);
    });
    // ---------- trees: palms, bananas, canopy trees, bushes ----------
    const bark = std(woodPlanks("#5a4636", 3, "palmbark"), [1, 6]);
    const fm = new THREE.MeshStandardMaterial({ map: frondTex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8, color: "#c8d8b0" });
    const palm = (x: number, z: number, H: number, lean: number) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rnd() * 6.28; R.add(g);
      const pts = Array.from({ length: 8 }, (_, k) => new THREE.Vector3(lean * (k / 7) ** 2, (H * k) / 7, 0));
      put(g, M(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.16, 8), bark), [0, 0, 0]);
      for (let k = 0; k < 11; k++) { const fr = M(new THREE.PlaneGeometry(0.9, 3.0, 1, 6), fm); const pa = fr.geometry.attributes.position as THREE.BufferAttribute; for (let v = 0; v < pa.count; v++) { const yy = pa.getY(v) + 1.5; pa.setZ(v, -0.35 * yy * yy); } fr.geometry.computeVertexNormals(); fr.geometry.translate(0, 1.5, 0);
        const piv = new THREE.Group(); piv.position.set(lean, H, 0); piv.rotation.set(0, (k / 11) * 6.28, 0); fr.rotation.x = -0.6 - 0.5 * rnd(); fr.castShadow = true; piv.add(fr); g.add(piv); }
    };
    const banana = (x: number, z: number) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); R.add(g); const bl = new THREE.MeshStandardMaterial({ map: bananaLeaf(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.75 });
      put(g, M(new THREE.CylinderGeometry(0.1, 0.14, 1.8, 8), mat("#6b7a3c")), [0, 0.9, 0]);
      for (let k = 0; k < 6; k++) { const lf = M(new THREE.PlaneGeometry(0.55, 2.0), bl); lf.geometry.translate(0, 1.0, 0); const piv = new THREE.Group(); piv.position.set(0, 1.7, 0); piv.rotation.y = k * 1.05 + rnd(); lf.rotation.x = -0.5 - rnd() * 0.5; lf.castShadow = true; piv.add(lf); g.add(piv); }
    };
    const canopy = (x: number, z: number, s: number) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); R.add(g); const lm = new THREE.MeshStandardMaterial({ map: leafTex, roughness: 0.95 });
      put(g, M(new THREE.CylinderGeometry(0.18 * s, 0.3 * s, 2.6 * s, 9), std(woodPlanks("#4b3426", 3, "bark"), [1, 3])), [0, 1.3 * s, 0]);
      for (let k = 0; k < 10; k++) { const geo = new THREE.IcosahedronGeometry((0.9 + rnd() * 0.6) * s, 2); const pa = geo.attributes.position as THREE.BufferAttribute; for (let v = 0; v < pa.count; v++) { const f = 1 + 0.18 * Math.sin(pa.getX(v) * 7 + pa.getY(v) * 5) * Math.cos(pa.getZ(v) * 6); pa.setXYZ(v, pa.getX(v) * f, pa.getY(v) * f, pa.getZ(v) * f); } geo.computeVertexNormals();
        put(g, M(geo, lm), [(rnd() - 0.5) * 2.4 * s, (2.8 + rnd() * 1.4) * s, (rnd() - 0.5) * 2.4 * s]); }
    };
    [[-3.4, -2.9, 7, 1.0], [9.2, -3.2, 6.5, -0.8], [-14.6, 9.6, 7.5, 0.6], [20.6, 3.2, 6.8, 0.9], [-3, 17.5, 7, -0.6], [-20.5, -4.5, 6.2, 0.5], [21, 16, 7.2, 0.7]].forEach(([x, z, H, l]) => palm(x, z, H, l));
    [[-3.2, 3.2], [9.3, 2.6], [-15, 3.2], [9.5, 9.8], [-8.6, 9.6], [14.6, -5.2], [-20.5, 2.9]].forEach(([x, z]) => banana(x, z));
    [[-25, 6, 1.3], [27, 7, 1.4], [-9, -14, 1.5], [9, -15, 1.6], [0, 27, 1.5], [-28, -10, 1.4], [30, -8, 1.5], [-3, -12, 1.2]].forEach(([x, z, s]) => canopy(x, z, s));
    const gt = new THREE.MeshStandardMaterial({ map: grassTuft(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1 });
    for (let k = 0; k < 260; k++) { const x = (rnd() - 0.5) * 60, z = (rnd() - 0.5) * 50; if (Math.abs(z - 6.2) < 2.6 || Math.abs(x + 12) < 2.2 || Math.abs(x - 12) < 2.2) continue; const q = M(new THREE.PlaneGeometry(0.6, 0.45), gt); q.position.set(x, 0.22, z); q.rotation.y = rnd() * 3; R.add(q); }
    void grassM;
    // ---------- power poles, wires, street lamps ----------
    const poleM = mat("#5e5a54", { roughness: 0.9 }), wireM = mat("#111111", { roughness: 0.6 });
    const poles: THREE.Vector3[] = [];
    for (let x = -27; x <= 27; x += 9) { const p = new THREE.Vector3(x + 5.8, 0, 3.75); poles.push(p); put(R, M(new THREE.CylinderGeometry(0.09, 0.13, 7.5, 8), poleM), [p.x, 3.75, p.z]); put(R, M(new THREE.BoxGeometry(1.4, 0.08, 0.08), poleM), [p.x, 7.0, p.z]);
      // street lamp arm + glowing head + light pool
      put(R, M(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), poleM), [p.x, 5.6, p.z + 0.5], [Math.PI / 2 - 0.25, 0, 0]);
      const head = M(new THREE.CylinderGeometry(0.2, 0.12, 0.14, 12), mat("#333", { metalness: 0.5 })); head.position.set(p.x, 5.8, p.z + 1.05); R.add(head);
      const glow = M(new THREE.CircleGeometry(0.11, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.8, 2.2) })); glow.rotation.x = Math.PI / 2; glow.position.set(p.x, 5.72, p.z + 1.05); R.add(glow);
      if (Math.abs(x) <= 20) { const sp = new THREE.SpotLight("#ffc27a", 140, 16, 0.85, 0.65, 1.6); sp.position.set(p.x, 5.7, p.z + 1.05); sp.target.position.set(p.x, 0, p.z + 2.0); if (Math.abs(x) <= 10) { sp.castShadow = true; sp.shadow.mapSize.set(1024, 1024); sp.shadow.bias = -0.0008; } R.add(sp, sp.target); }
    }
    for (let k = 0; k < poles.length - 1; k++) for (const dx of [-0.6, 0, 0.6]) { const a = poles[k].clone().add(new THREE.Vector3(dx * 0.2, 6.95, dx)), b = poles[k + 1].clone().add(new THREE.Vector3(dx * 0.2, 6.95, dx)); const mid = a.clone().lerp(b, 0.5); mid.y -= 0.55; R.add(M(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 24, 0.012, 4), wireM)); }
    // a few parked motorbikes / a gerobak
    for (const [x, z, r] of [[-14.2, 4.0, -0.2], [19.8, 3.8, 0.1], [-7.5, 8.6, 2.9]] as [number, number, number][]) { const mb = new THREE.Group(); put(mb, M(new THREE.TorusGeometry(0.26, 0.07, 8, 18), mat("#151515")), [-0.55, 0.3, 0]); put(mb, M(new THREE.TorusGeometry(0.26, 0.07, 8, 18), mat("#151515")), [0.55, 0.3, 0]); put(mb, M(rbox(1.2, 0.35, 0.32, 0.12), mat(["#b8202a", "#1d3f8a", "#e8e8e8"][Math.abs(Math.round(x)) % 3], { metalness: 0.3, roughness: 0.3 })), [0, 0.62, 0]); put(mb, M(rbox(0.5, 0.12, 0.28, 0.05), mat("#1a1a1a")), [-0.15, 0.85, 0]); put(R, mb, [x, 0, z], [0, r, 0]); }
    // ---------- sky, moon, clouds, far hills ----------
    const sky = M(new THREE.SphereGeometry(150, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, map: canvasTex(64, 512, (g) => { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#03050f"); gr.addColorStop(0.42, "#0d1838"); gr.addColorStop(0.5, "#24346a"); gr.addColorStop(0.56, "#3a4a80"); gr.addColorStop(1, "#141a30"); g.fillStyle = gr; g.fillRect(0, 0, 64, 512); }) })); R.add(sky);
    const stars = new THREE.BufferGeometry(), sp: number[] = []; for (let k = 0; k < 900; k++) { const th = rnd() * 6.28, ph = 0.08 + rnd() * 1.2; sp.push(140 * Math.cos(ph) * Math.cos(th), 140 * Math.sin(ph), 140 * Math.cos(ph) * Math.sin(th)); }
    stars.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3)); R.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: "#dfe6ff", size: 0.5, fog: false })));
    const moon = M(new THREE.CircleGeometry(4, 40), new THREE.MeshBasicMaterial({ fog: false, map: canvasTex(256, 256, (g) => { g.fillStyle = "#f4f2e8"; g.beginPath(); g.arc(128, 128, 126, 0, 6.29); g.fill(); for (let k = 0; k < 18; k++) { g.fillStyle = `rgba(170,170,160,${0.15 + rnd() * 0.25})`; g.beginPath(); g.arc(30 + rnd() * 196, 30 + rnd() * 196, 6 + rnd() * 26, 0, 6.29); g.fill(); } }), color: new THREE.Color(2.2, 2.2, 2.3) }));
    moon.position.set(-40, 62, -95); moon.lookAt(0, 0, 0); R.add(moon);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(190,205,255,0.8)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }), blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); halo.scale.set(40, 40, 1); halo.position.copy(moon.position); R.add(halo);
    const cloudT = canvasTex(256, 128, (g) => { for (let k = 0; k < 40; k++) { const x = 30 + rnd() * 196, y = 50 + rnd() * 40, r = 14 + rnd() * 30, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(120,135,180,0.35)"); gr.addColorStop(1, "rgba(120,135,180,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 128); } });
    for (let k = 0; k < 9; k++) { const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudT, transparent: true, depthWrite: false, fog: false })); c.scale.set(50 + rnd() * 30, 18, 1); c.position.set(-80 + k * 22 + rnd() * 10, 38 + rnd() * 18, -90 - rnd() * 20); R.add(c); }
    const hills = M(new THREE.CylinderGeometry(95, 95, 16, 64, 1, true), new THREE.MeshBasicMaterial({ side: THREE.BackSide, transparent: true, map: canvasTex(1024, 128, (g) => { g.fillStyle = "#0b1022"; g.beginPath(); g.moveTo(0, 128); for (let x = 0; x <= 1024; x += 8) g.lineTo(x, 70 - 40 * Math.abs(Math.sin(x / 140)) - 14 * fbm(x, 3, 1024, 16, 3)); g.lineTo(1024, 128); g.fill(); }) })); hills.position.y = 6; R.add(hills);
    // ---------- light ----------
    const moonL = new THREE.DirectionalLight("#b4c6ff", 4.4); moonL.position.set(-24, 40, -30); moonL.target.position.set(0, 0, 2); moonL.castShadow = true;
    moonL.shadow.mapSize.set(4096, 4096); Object.assign(moonL.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 5, far: 110 }); moonL.shadow.bias = -0.0004; moonL.shadow.normalBias = 0.03; moonL.shadow.radius = 4;
    this.sunDir.copy(moonL.position).sub(moonL.target.position).normalize();
    R.add(moonL, moonL.target, new THREE.HemisphereLight("#41538e", "#1a1424", 1.15));
    void curtain;
  }
  update(t: number) { for (const w of this.tw) w.m.uniforms.uTv.value = 0.35 + 0.25 * Math.sin(t * 9 + w.ph) * Math.sin(t * 3.7 + w.ph * 2) + (Math.sin(t * 1.3 + w.ph) > 0.8 ? 0.3 : 0); }
}
