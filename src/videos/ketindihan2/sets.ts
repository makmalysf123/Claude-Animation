// Sets for "Satu Malam Ketindihan" in the approved world2 look (textured stylised-real surfaces, warm/cool light,
// haze, no ink on the world): night rooms (bedroom, kitchen, living room, baby room), the brain control room, and the
// night kampung seen from above. Every set: `root`, `sunDir` (key light direction for the cards' ink), `update(t)`.
import * as THREE from "three";
import { woodPlanks, plaster, rooftiles, bamboo, stone, curtain, dirt, rnd } from "../../lib/world2/textures";

type V3 = [number, number, number];
export const std = (t: { map: THREE.Texture; normal: THREE.Texture }, rep: [number, number], extra: THREE.MeshStandardMaterialParameters = {}) => {
  const map = t.map.clone(), normal = t.normal.clone(); map.repeat.set(...rep); normal.repeat.set(...rep); map.needsUpdate = normal.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map, normalMap: normal, roughness: 0.88, metalness: 0, ...extra });
};
const col = (c: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...extra });
export const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, p: V3, r: V3 = [0, 0, 0], cast = true) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.rotation.set(...r); m.castShadow = cast; m.receiveShadow = true; return m;
};
export const box = (w: number, h: number, d: number, mat: THREE.Material, p: V3, r?: V3, cast = true) => mesh(new THREE.BoxGeometry(w, h, d), mat, p, r, cast);
export const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};
/** a canvas texture redrawn on demand (clock faces, screens, calendar circle) */
export class LiveTex {
  c = document.createElement("canvas"); g: CanvasRenderingContext2D; tex: THREE.CanvasTexture; key = "";
  constructor(w: number, h: number) { this.c.width = w; this.c.height = h; this.g = this.c.getContext("2d")!; this.tex = new THREE.CanvasTexture(this.c); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8; }
  draw(key: string, fn: (g: CanvasRenderingContext2D, w: number, h: number) => void) { if (key === this.key) return; this.key = key; this.g.clearRect(0, 0, this.c.width, this.c.height); fn(this.g, this.c.width, this.c.height); this.tex.needsUpdate = true; }
}
const glowSprite = (color: string, size: number, p: V3) => {
  const t = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, color); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.set(size, size, 1); s.position.set(...p); return s;
};

// ---------------- clock face, calendar ----------------
export const drawClock = (g: CanvasRenderingContext2D, w: number, h: number, hh: number, mm: number, ss: number) => {
  const c = w / 2; g.fillStyle = "#f4ecd8"; g.beginPath(); g.arc(c, c, c * 0.94, 0, Math.PI * 2); g.fill(); g.lineWidth = c * 0.1; g.strokeStyle = "#3a2618"; g.stroke();
  g.fillStyle = "#2b1a26"; g.font = `bold ${c * 0.24}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillText(String(i), c + Math.sin(a) * c * 0.7, c - Math.cos(a) * c * 0.7); }
  const hand = (a: number, l: number, wd: number, cl = "#2b1a26") => { g.strokeStyle = cl; g.lineWidth = wd; g.lineCap = "round"; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.sin(a) * l, c - Math.cos(a) * l); g.stroke(); };
  hand(((hh % 12) + mm / 60) / 12 * Math.PI * 2, c * 0.45, c * 0.09); hand((mm / 60) * Math.PI * 2, c * 0.68, c * 0.06); hand((ss / 60) * Math.PI * 2, c * 0.74, c * 0.025, "#c0353a");
  g.fillStyle = "#2b1a26"; g.beginPath(); g.arc(c, c, c * 0.07, 0, Math.PI * 2); g.fill();
};
/** hand-drawn red marker circle, p 0..1 of the stroke drawn */
export const markerCircle = (g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, p: number, w: number) => {
  if (p <= 0) return; g.strokeStyle = "rgba(214,30,40,0.92)"; g.lineWidth = w; g.lineCap = "round"; g.beginPath();
  const n = 60, end = p * 1.12 * Math.PI * 2; for (let i = 0; i <= n; i++) { const a = -Math.PI * 0.6 + (end * i) / n, wob = 1 + 0.05 * Math.sin(a * 3 + 1); g.lineTo(cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob * (1 + 0.04 * i / n)); } g.stroke();
};

// ================= night rooms =================
export type RoomKind = "kamar" | "dapur" | "tamu" | "bayi";
export class RoomSet {
  root = new THREE.Group(); sunDir = new THREE.Vector3(); moon = new THREE.DirectionalLight("#a9c0ff", 4.2);
  hemi = new THREE.HemisphereLight("#6a7cb4", "#3a2c38", 2.1); lamp = new THREE.PointLight("#ffbf7a", 0, 7, 1.6);
  clock?: LiveTex; calendar?: LiveTex; door?: THREE.Group; fan?: THREE.Group; bulb?: THREE.Mesh; spark?: THREE.Sprite; panci?: THREE.Mesh;
  // anchor points the film uses
  bedTop = 0.55; bedX = -1.15; pillowZ = -1.55; windowCenter: V3 = [0.4, 1.55, -2.0]; treeSpot: V3 = [0.8, 2.2, -5.0];
  constructor(public kind: RoomKind) {
    const R = this.root;
    const wallMat = kind === "dapur" ? std(plaster("#d9cdb4"), [3, 1.5]) : kind === "bayi" ? std(plaster("#cfe0e8"), [3, 1.5]) : std(woodPlanks(kind === "kamar" ? "#8c6646" : "#7a5638", 8, "rw" + kind), [3, 1]);
    const floor = std(woodPlanks("#6b4a30", 10, "fl" + kind), [3, 3]);
    R.add(box(4.6, 0.1, 4.6, floor, [0, -0.05, 0], undefined, false));
    // back wall with a window hole (x -0.35..1.15, y 1.0..2.1), side walls, ceiling
    const W0 = -0.35, W1 = 1.15, Y0 = 1.0, Y1 = 2.1, Z = -2.0;
    R.add(box(W0 + 2.3, 2.9, 0.12, wallMat, [(-2.3 + W0) / 2, 1.45, Z])); R.add(box(2.3 - W1, 2.9, 0.12, wallMat, [(W1 + 2.3) / 2, 1.45, Z]));
    R.add(box(W1 - W0, Y0, 0.12, wallMat, [(W0 + W1) / 2, Y0 / 2, Z])); R.add(box(W1 - W0, 2.9 - Y1, 0.12, wallMat, [(W0 + W1) / 2, (Y1 + 2.9) / 2, Z]));
    R.add(box(0.12, 2.9, 4.6, wallMat, [-2.3, 1.45, 0])); R.add(box(0.12, 2.9, 4.6, wallMat, [2.3, 1.45, 0]));
    R.add(box(4.6, 0.12, 4.6, col("#3a3044"), [0, 2.95, 0], undefined, false));
    const frame = std(woodPlanks("#4e3220", 2, "wf"), [1, 1]);
    for (const x of [W0, (W0 + W1) / 2, W1]) R.add(box(0.06, Y1 - Y0, 0.08, frame, [x, (Y0 + Y1) / 2, Z + 0.02]));
    for (const y of [Y0, (Y0 + Y1) / 2, Y1]) R.add(box(W1 - W0, 0.06, 0.08, frame, [(W0 + W1) / 2, y, Z + 0.02]));
    const cg = new THREE.PlaneGeometry(0.45, 1.25, 10, 1); const cp = cg.attributes.position as THREE.BufferAttribute; for (let i = 0; i < cp.count; i++) cp.setZ(i, 0.03 * Math.sin(cp.getX(i) * 26)); cg.computeVertexNormals();
    for (const s of [-1, 1]) R.add(mesh(cg, std(curtain(), [1, 1], { side: THREE.DoubleSide }), [(W0 + W1) / 2 + s * 0.95, 1.6, Z + 0.1], undefined, false));
    // outside: night sky, moon, a tree (baby room: the kunti's tree), far roofs
    const sky = canvasTex(256, 512, (g) => { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#0b1230"); gr.addColorStop(1, "#2a3a6e"); g.fillStyle = gr; g.fillRect(0, 0, 256, 512); g.fillStyle = "#fff"; for (let i = 0; i < 60; i++) g.fillRect(rnd() * 256, rnd() * 300, 1.5, 1.5); });
    const skyM = new THREE.Mesh(new THREE.PlaneGeometry(14, 9), new THREE.MeshBasicMaterial({ map: sky, fog: false })); skyM.position.set(0.4, 2.5, -9); R.add(skyM);
    const moon = new THREE.Mesh(new THREE.CircleGeometry(0.35, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.5, 2.7), fog: false })); moon.position.set(-1.2, 4.3, -8.9); R.add(moon);
    R.add(glowSprite("rgba(170,190,255,0.6)", 3, [-1.2, 4.3, -8.8]));
    { const tree = new THREE.Group(); tree.position.set(this.treeSpot[0], 0, this.treeSpot[2]);
      const bark = std(woodPlanks("#4b3426", 3, "bark"), [1, 3]);
      tree.add(mesh(new THREE.CylinderGeometry(0.22, 0.35, 4.2, 10), bark, [0, 2.1, 0]));
      tree.add(mesh(new THREE.CylinderGeometry(0.09, 0.14, 1.9, 8), bark, [-0.75, 2.4, 0], [0, 0, 1.05])); // the branch the kunti sits on
      const leaf = col("#1f3a2a", { roughness: 1 }); for (let i = 0; i < 9; i++) tree.add(mesh(new THREE.IcosahedronGeometry(0.9 + rnd() * 0.5, 1), leaf, [(rnd() - 0.5) * 2.6, 3.6 + rnd() * 1.2, (rnd() - 0.5) * 1.2]));
      R.add(tree); }
    for (let i = 0; i < 5; i++) { const h = box(2.2, 1.6, 1.5, col("#1c1a2a"), [-5 + i * 2.6, 0.8, -12 - rnd() * 2]); R.add(h); if (rnd() > 0.4) R.add(box(0.3, 0.3, 0.02, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.1, 0.5) }), [-5 + i * 2.6 + 0.4, 0.9, h.position.z + 0.76], undefined, false)); }
    // light: moonlight through the window, dim sky fill, practical lamp (per room)
    this.moon.position.set(-2.2, 6.5, -9); this.moon.target.position.set(-0.2, 0.3, 0.6); this.moon.castShadow = true; this.moon.shadow.mapSize.set(2048, 2048);
    Object.assign(this.moon.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 20 }); this.moon.shadow.bias = -0.0005; this.moon.shadow.radius = 3;
    this.sunDir.copy(this.moon.position).sub(this.moon.target.position).normalize();
    R.add(this.moon, this.moon.target, this.hemi, this.lamp);
    const fill = new THREE.PointLight("#ffcf9a", 2.4, 8, 1.4); fill.position.set(0.8, 2.4, 1.6); R.add(fill);
    const treeLight = new THREE.PointLight("#b9ccff", 6, 8, 1.2); treeLight.position.set(0.0, 3.2, -3.4); R.add(treeLight);
    // door on the right wall (hinged at the back edge)
    { const d = new THREE.Group(); d.position.set(2.24, 0, 0.35); const leafM = std(woodPlanks("#5d3a22", 3, "door"), [1, 1]);
      const leafG = new THREE.Group(); leafG.add(box(0.06, 2.05, 0.9, leafM, [0, 1.03, 0.45])); leafG.add(mesh(new THREE.SphereGeometry(0.03, 10, 8), col("#c9a24a", { metalness: 0.8, roughness: 0.3 }), [-0.06, 1.0, 0.8]));
      d.add(leafG); this.door = leafG; R.add(d); R.add(box(0.1, 2.15, 1.04, frame, [2.27, 1.07, 0.8])); }
    if (kind === "kamar") this.kamar(frame); else if (kind === "dapur") this.dapur(); else if (kind === "tamu") this.tamu(); else this.bayi();
  }
  private kamar(frame: THREE.Material) {
    const R = this.root, wood = std(woodPlanks("#6d4428", 4, "bed"), [1, 1]), bx = this.bedX, bt = this.bedTop;
    R.add(box(1.25, 0.3, 2.1, wood, [bx, 0.2, -0.85])); R.add(box(1.3, 1.0, 0.08, wood, [bx, 0.5, -1.92]));
    R.add(box(1.17, 0.2, 2.0, col("#e6e2d6"), [bx, bt - 0.1, -0.85]));
    const pillow = mesh(new THREE.SphereGeometry(0.5, 24, 12), col("#f1efe8"), [bx, bt + 0.06, this.pillowZ]); pillow.scale.set(0.95, 0.13, 0.33); R.add(pillow);
    const blanketTex = canvasTex(256, 256, (g) => { g.fillStyle = "#b8423c"; g.fillRect(0, 0, 256, 256); g.fillStyle = "rgba(245,226,190,0.55)"; for (let i = 0; i < 256; i += 64) { g.fillRect(i + 20, 0, 14, 256); g.fillRect(0, i + 20, 256, 14); } });
    blanketTex.wrapS = blanketTex.wrapT = THREE.RepeatWrapping; blanketTex.repeat.set(2, 2);
    const bg = new THREE.PlaneGeometry(1.32, 1.35, 30, 30); bg.rotateX(-Math.PI / 2); const pp = bg.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), z = pp.getZ(i), ax = Math.abs(x); let y = 0.04 + 0.13 * Math.exp(-(x * x) / 0.08) * Math.exp(-((z + 0.25) ** 2) / 0.35); if (ax > 0.6) y -= (ax - 0.6) * 4; pp.setY(i, y); }
    bg.computeVertexNormals(); R.add(mesh(bg, new THREE.MeshStandardMaterial({ map: blanketTex, roughness: 0.95, side: THREE.DoubleSide }), [bx, bt, -0.55]));
    R.add(box(0.45, 0.5, 0.4, wood, [0.0, 0.25, -1.75])); R.add(mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.1, 12), col("#cfe3ee", { roughness: 0.2 }), [-0.05, 0.55, -1.78]));
    // wall clock + calendar on the back wall (right of the window)
    this.clock = new LiveTex(256, 256); const cm = new THREE.Mesh(new THREE.CircleGeometry(0.22, 40), new THREE.MeshStandardMaterial({ map: this.clock.tex, roughness: 0.6 })); cm.position.set(1.88, 2.2, -1.93); R.add(cm);
    this.calendar = new LiveTex(320, 420); const cal = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.55), new THREE.MeshStandardMaterial({ map: this.calendar.tex, roughness: 0.9 })); cal.position.set(1.88, 1.5, -1.93); R.add(cal);
    void frame; this.setClock(3, 0, 0); this.setCalendar(0);
  }
  private dapur() {
    const R = this.root, wood = std(woodPlanks("#7a5232", 5, "kc"), [2, 1]);
    R.add(box(2.6, 0.9, 0.6, wood, [0.6, 0.45, -1.65])); R.add(box(2.7, 0.06, 0.66, std(stone(), [3, 1]), [0.6, 0.93, -1.65]));
    R.add(box(0.7, 0.12, 0.45, col("#2b2b30", { metalness: 0.6, roughness: 0.4 }), [0.2, 1.02, -1.65])); // stove
    this.panci = mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.18, 20), col("#c9ced4", { metalness: 0.35, roughness: 0.35 }), [0.05, 1.17, -1.65]); R.add(this.panci);
    R.add(mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.3, 16), col("#d9e6ea", { transparent: true, opacity: 0.55, roughness: 0.1 }), [1.3, 1.11, -1.7])); // kerupuk jar
    R.add(box(1.6, 0.05, 0.3, wood, [-1.2, 1.8, -1.8])); for (let i = 0; i < 4; i++) R.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 10), col(["#c8483c", "#e0b84a", "#5a8a4a", "#c8d0d8"][i]), [-1.8 + i * 0.35, 1.92, -1.8]));
    this.lamp.position.set(0.6, 2.4, -0.5); this.lamp.intensity = 0.0;
  }
  private tamu() {
    const R = this.root, fab = std(curtain(), [2, 1]);
    R.add(box(2.0, 0.42, 0.85, fab, [-0.6, 0.21, -1.4])); R.add(box(2.0, 0.6, 0.18, fab, [-0.6, 0.65, -1.78])); for (const s of [-1, 1]) R.add(box(0.18, 0.55, 0.85, fab, [-0.6 + s * 1.0, 0.45, -1.4]));
    R.add(box(1.0, 0.4, 0.6, std(woodPlanks("#6d4428", 3, "tb"), [1, 1]), [-0.6, 0.2, -0.4]));
    R.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.45, 4), col("#111"), [0.3, 2.72, -0.4], undefined, false));
    this.bulb = mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.3, 1.3) }), [0.3, 2.45, -0.4], undefined, false); R.add(this.bulb);
    this.lamp.position.set(0.3, 2.35, -0.4);
    R.add(box(0.14, 0.2, 0.03, col("#efe9dc"), [1.6, 0.35, -1.93])); // wall socket
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(1.6, 0.35, -1.88), new THREE.Vector3(1.4, 0.05, -1.6), new THREE.Vector3(0.6, 0.03, -1.2), new THREE.Vector3(0.3, 0.05, -0.6)]);
    R.add(mesh(new THREE.TubeGeometry(curve, 40, 0.012, 6), col("#222"), [0, 0, 0]));
    this.spark = glowSprite("rgba(255,220,140,1)", 0.25, [1.6, 0.33, -1.85]); R.add(this.spark);
  }
  private bayi() {
    const R = this.root, wood = std(woodPlanks("#e8d2b0", 6, "crib"), [1, 1]);
    R.add(box(1.3, 0.08, 0.75, wood, [-0.2, 0.55, -1.2])); for (const z of [-1.55, -0.85]) for (let i = 0; i <= 10; i++) R.add(box(0.03, 0.45, 0.03, wood, [-0.85 + i * 0.13, 0.8, z]));
    for (const x of [-0.85, 0.45]) R.add(box(0.05, 0.9, 0.75, wood, [x, 0.55, -1.2])); R.add(box(1.3, 0.05, 0.05, wood, [-0.2, 1.03, -0.85])); R.add(box(1.3, 0.05, 0.05, wood, [-0.2, 1.03, -1.55]));
    R.add(box(1.2, 0.1, 0.65, col("#bfe1f2"), [-0.2, 0.64, -1.2]));
    // standing fan (off)
    const f = new THREE.Group(); f.position.set(1.35, 0, -1.1); f.add(mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 20), col("#ddd"), [0, 0.03, 0])); f.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 8), col("#ccc"), [0, 0.53, 0]));
    const head = new THREE.Group(); head.position.set(0, 1.08, 0); head.add(mesh(new THREE.TorusGeometry(0.22, 0.012, 6, 30), col("#bbb"), [0, 0, 0], [0, Math.PI / 2, 0]));
    const blades = new THREE.Group(); for (let i = 0; i < 3; i++) blades.add(mesh(new THREE.BoxGeometry(0.02, 0.16, 0.06), col("#7fb7d8"), [0, Math.cos(i * 2.09) * 0.11, Math.sin(i * 2.09) * 0.11], [i * 2.09, 0, 0]));
    head.add(blades); f.add(head); f.rotation.y = -0.6; this.fan = blades; R.add(f);
  }
  setClock(h: number, m: number, s: number) { this.clock?.draw(`${h}:${m}:${Math.floor(s)}`, (g, w, hh) => drawClock(g, w, hh, h, m, s)); }
  /** calendar page with today's date; p = progress of the red marker circle around "21:00 TIDUR" */
  setCalendar(p: number) {
    this.calendar?.draw("c" + Math.round(p * 60), (g, w, h) => {
      g.fillStyle = "#f6f0e2"; g.fillRect(0, 0, w, h); g.fillStyle = "#b8312c"; g.fillRect(0, 0, w, 70); g.fillStyle = "#fff"; g.font = "bold 34px sans-serif"; g.textAlign = "center"; g.fillText("NOVEMBER", w / 2, 48);
      g.fillStyle = "#2b1a26"; g.font = "bold 120px serif"; g.fillText("14", w / 2, 210); g.font = "bold 30px sans-serif"; g.fillText("SABTU", w / 2, 255);
      g.font = "bold 46px sans-serif"; g.fillStyle = "#3a2a30"; g.fillText("21.00", w / 2, 340);
      if (p > 0.85) { g.fillStyle = `rgba(214,30,40,${Math.min(1, (p - 0.85) / 0.15)})`; g.font = "italic bold 34px sans-serif"; g.fillText("TIDUR!", w / 2, 395); }
      markerCircle(g, w / 2, 328, 105, 48, Math.min(1, p / 0.85), 8);
    });
  }
  update(t: number) {
    if (this.fan) this.fan.rotation.x = 0;
    if (this.spark) { const on = Math.sin(t * 37) > 0.6 && Math.sin(t * 5.3) > 0; (this.spark.material as THREE.SpriteMaterial).opacity = on ? 1 : 0; }
  }
}

// ================= brain control room =================
export class BrainSet {
  root = new THREE.Group(); sunDir = new THREE.Vector3(0.4, 0.8, 0.5).normalize();
  leverSadar = new THREE.Group(); leverOtot = new THREE.Group(); lock = new THREE.Group(); monitor = new LiveTex(512, 320); screen = new LiveTex(512, 256);
  projCone!: THREE.Mesh; toasterA = new THREE.Group(); toasterB = new THREE.Group(); shelfItems: THREE.Mesh[] = [];
  constructor() {
    const R = this.root;
    // rounded "skull" room: curved back wall panels, pinkish-brain lining at the top
    const wall = std(plaster("#5f6f86"), [4, 2]), panel = col("#3c4658", { metalness: 0.3, roughness: 0.6 });
    R.add(box(9, 0.1, 7, std(woodPlanks("#4a4a58", 12, "bf"), [3, 3]), [0, -0.05, 0], undefined, false));
    const back = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 4.2, 40, 1, true, Math.PI * 0.55, Math.PI * 0.9), new THREE.MeshStandardMaterial({ map: wall.map, normalMap: wall.normalMap, color: "#8fa0b8", side: THREE.BackSide, roughness: 0.9 }));
    back.position.set(0, 2.1, 1.5); back.receiveShadow = true; R.add(back);
    const brainTex = canvasTex(512, 256, (g) => { g.fillStyle = "#e7a5b0"; g.fillRect(0, 0, 512, 256); g.strokeStyle = "#c97c8c"; g.lineWidth = 7; for (let i = 0; i < 40; i++) { g.beginPath(); let x = rnd() * 512, y = rnd() * 256; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 70; y += (rnd() - 0.5) * 40; g.quadraticCurveTo(x + 20, y - 20, x, y); } g.stroke(); } });
    brainTex.wrapS = THREE.RepeatWrapping; brainTex.repeat.set(3, 1);
    const ceil = new THREE.Mesh(new THREE.SphereGeometry(5.2, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2.4), new THREE.MeshStandardMaterial({ map: brainTex, side: THREE.BackSide, roughness: 0.7 })); ceil.position.set(0, 2.6, 1.5); R.add(ceil);
    // control console with the two big levers
    R.add(box(3.4, 1.0, 0.9, panel, [0, 0.5, -1.6]));
    const mkLever = (g: THREE.Group, x: number, label: string, color: string) => {
      g.position.set(x, 1.0, -1.45);
      g.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.36, 12), col("#c9ccd2", { metalness: 0.8, roughness: 0.3 }), [0, 0.18, 0]));
      g.add(mesh(new THREE.SphereGeometry(0.11, 20, 14), col(color, { roughness: 0.4 }), [0, 0.38, 0]));
      R.add(g);
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.24), new THREE.MeshStandardMaterial({ map: canvasTex(280, 96, (c) => { c.fillStyle = "#1a1d24"; c.fillRect(0, 0, 280, 96); c.fillStyle = "#f2e6c8"; c.font = "bold 54px sans-serif"; c.textAlign = "center"; c.fillText(label, 140, 68); }) }));
      plate.position.set(x, 0.75, -1.14); R.add(plate);
    };
    mkLever(this.leverSadar, -0.65, "SADAR", "#4fc76a"); mkLever(this.leverOtot, 0.65, "OTOT", "#e0574a");
    this.lock.position.set(0.65, 1.17, -1.35); this.lock.add(mesh(new THREE.BoxGeometry(0.2, 0.18, 0.09), col("#d4a93a", { metalness: 0.9, roughness: 0.3 }), [0, 0, 0])); this.lock.add(mesh(new THREE.TorusGeometry(0.07, 0.022, 8, 16, Math.PI), col("#bfc3c9", { metalness: 0.9 }), [0, 0.09, 0])); R.add(this.lock);
    // monitor on the wall (icons), big "JAWABAN" screen
    const mon = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.94), new THREE.MeshBasicMaterial({ map: this.monitor.tex, toneMapped: false })); mon.position.set(-2.1, 2.0, -1.2); mon.rotation.y = 0.45; R.add(mon); R.add(box(1.6, 1.04, 0.08, panel, [-2.12, 2.0, -1.25], [0, 0.45, 0]));
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), new THREE.MeshBasicMaterial({ map: this.screen.tex, toneMapped: false })); scr.position.set(0, 2.45, -2.4); R.add(scr); R.add(box(1.95, 1.05, 0.1, panel, [0, 2.45, -2.47]));
    this.setMonitor(0); this.setScreen("");
    // projector (dream) with a light cone
    const proj = new THREE.Group(); proj.position.set(2.2, 1.3, -0.6); proj.add(box(0.5, 0.35, 0.6, col("#6b5a46", { metalness: 0.4 }), [0, 0, 0])); proj.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.2, 16), col("#222"), [-0.3, 0, 0], [0, 0, Math.PI / 2]));
    for (const z of [-0.18, 0.18]) proj.add(mesh(new THREE.TorusGeometry(0.16, 0.03, 8, 20), col("#3a3a3a"), [0.05, 0.32, z]));
    R.add(proj);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.2, 24, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.9, 0.7), transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    cone.rotation.z = -Math.PI / 2; cone.position.set(0.45, 1.3, -0.6); this.projCone = cone; R.add(cone);
    // two tables for the paper stacks (left "JIN", right the 4 causes)
    const tw = std(woodPlanks("#8a6040", 4, "tbl"), [1, 1]);
    for (const x of [-1.25, 1.25]) { R.add(box(1.2, 0.06, 0.7, tw, [x, 0.92, 0.6])); for (const dx of [-0.52, 0.52]) for (const dz of [-0.28, 0.28]) R.add(box(0.05, 0.9, 0.05, tw, [x + dx, 0.45, 0.6 + dz])); }
    // toasters (for the "fastest to come to mind" beat)
    for (const [g, x] of [[this.toasterA, -0.6], [this.toasterB, 0.6]] as const) { g.position.set(x, 0.95, 0.6); g.add(mesh(new THREE.BoxGeometry(0.42, 0.3, 0.26), col("#d8dde2", { metalness: 0.75, roughness: 0.25 }), [0, 0.15, 0])); g.visible = false; R.add(g); }
    // archive shelves: a huge overflowing "mystic stories" shelf and a tiny dusty "science" shelf
    const shelfM = std(woodPlanks("#5a3d26", 3, "sh"), [1, 2]);
    R.add(box(2.4, 2.6, 0.45, shelfM, [-3.0, 1.3, 1.6], [0, Math.PI / 2 - 0.35, 0]));
    const items = ["#7a2a33", "#2b2b3a", "#e0b84a", "#3f6b4a", "#5a2a6a", "#c8483c"];
    for (let i = 0; i < 36; i++) { const m = box(0.22, 0.3, 0.08 + rnd() * 0.12, col(items[i % 6]), [0, 0, 0]); const row = i % 6, colI = Math.floor(i / 6); m.position.set(-2.75 + (rnd() - 0.5) * 0.1, 0.35 + row * 0.42, 0.65 + colI * 0.33); m.rotation.y = Math.PI / 2 - 0.35 + (rnd() - 0.5) * 0.3; m.rotation.z = (rnd() - 0.5) * 0.3; this.shelfItems.push(m); R.add(m); }
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.32), new THREE.MeshStandardMaterial({ map: canvasTex(400, 80, (c) => { c.fillStyle = "#2b1a12"; c.fillRect(0, 0, 400, 80); c.fillStyle = "#f2d39a"; c.font = "bold 40px sans-serif"; c.textAlign = "center"; c.fillText("CERITA MISTIS", 200, 55); }) }));
    lab.position.set(-2.72, 2.75, 1.5); lab.rotation.y = Math.PI / 2 - 0.35; R.add(lab);
    R.add(box(0.6, 0.5, 0.3, shelfM, [3.1, 1.4, 1.2], [0, -Math.PI / 2 + 0.4, 0]));
    const lab2 = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.16), new THREE.MeshStandardMaterial({ map: canvasTex(400, 100, (c) => { c.fillStyle = "#2b2b2b"; c.fillRect(0, 0, 400, 100); c.fillStyle = "#cfd6dc"; c.font = "bold 34px sans-serif"; c.textAlign = "center"; c.fillText("PENJELASAN ILMIAH", 200, 64); }) }));
    lab2.position.set(3.0, 1.75, 1.15); lab2.rotation.y = -Math.PI / 2 + 0.4; R.add(lab2);
    // light: cool overhead + warm console glow + coloured rim
    const key = new THREE.DirectionalLight("#ffe6c4", 2.2); key.position.set(3, 6, 5); key.target.position.set(0, 1, 0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 });
    this.sunDir.copy(key.position).sub(key.target.position).normalize();
    R.add(key, key.target, new THREE.HemisphereLight("#9fb4e6", "#3a2a40", 1.9));
    const warm = new THREE.PointLight("#ff9a4a", 2.2, 6, 1.4); warm.position.set(0, 1.6, -1.0); R.add(warm);
    R.add(glowSprite("rgba(255,170,90,0.5)", 2.2, [0, 1.5, -1.2]));
  }
  setMonitor(icons: number) { this.monitor.draw("m" + icons, (g, w, h) => {
    g.fillStyle = "#0b1a1e"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(80,255,180,0.15)"; for (let y = 0; y < h; y += 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = "#7dffc4"; g.font = "bold 30px monospace"; g.fillText("PEMICU:", 20, 44);
    const lab = ["KURANG TIDUR", "STRES", "TIDUR TELENTANG"]; for (let i = 0; i < Math.min(3, icons); i++) { g.fillStyle = "#ffd36a"; g.fillText("• " + lab[i], 30, 110 + i * 70); }
  }); }
  setScreen(text: string, blink = 1) { this.screen.draw("s" + text + blink, (g, w, h) => {
    g.fillStyle = "#101826"; g.fillRect(0, 0, w, h); g.fillStyle = "#6fa8ff"; g.font = "bold 34px sans-serif"; g.textAlign = "center"; g.fillText("JAWABAN:", w / 2, 60);
    if (text) { g.globalAlpha = blink; g.fillStyle = "#ff5a4a"; g.font = "bold 110px sans-serif"; g.fillText(text, w / 2, 190); g.globalAlpha = 1; }
  }); }
  update(t: number) { (this.projCone.material as THREE.MeshBasicMaterial).opacity = 0.045 + 0.015 * Math.sin(t * 23) * Math.sin(t * 7); }
}

// ================= night kampung from above =================
export class AerialSet {
  root = new THREE.Group(); sunDir = new THREE.Vector3(-0.3, 0.8, -0.5).normalize(); windows: THREE.Mesh[] = []; ghostSpots: V3[] = [];
  /** the house the camera flies into: its window centre */
  target: V3 = [0, 1.3, 2.01];
  constructor() {
    const R = this.root;
    R.add(mesh(new THREE.PlaneGeometry(80, 80), std(dirt(), [20, 20], { color: "#6a6a88" }), [0, 0, 0], [-Math.PI / 2, 0, 0], false));
    const walls = [std(woodPlanks("#6a4a32", 6, "aw1"), [2, 1]), std(plaster("#c9bba0"), [2, 1]), std(woodPlanks("#7c5a3c", 6, "aw2"), [2, 1])];
    const roofM = std(rooftiles(), [4, 2], { side: THREE.DoubleSide });
    let k = 0;
    for (let gx = -3; gx <= 3; gx++) for (let gz = -3; gz <= 1; gz++) {
      if (rnd() < 0.18 && !(gx === 0 && gz === 0)) continue;
      const x = gx * 6 + (rnd() - 0.5) * 1.2, z = gz * 6 + (rnd() - 0.5) * 1.2, w = 3.6 + rnd(), d = 3.2 + rnd() * 0.8, h = 2.4;
      const hx = gx === 0 && gz === 0 ? 0 : x, hz = gx === 0 && gz === 0 ? 0 : z;
      R.add(box(w, h, d, walls[k++ % 3], [hx, h / 2, hz]));
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, d * 0.72, w + 0.5, 3, 1), roofM); roof.rotation.set(0, 0, Math.PI / 2); roof.position.set(hx, h + 0.55, hz); roof.scale.set(1, 1, 1.05); roof.castShadow = true; R.add(roof);
      const lit = gx === 0 && gz === 0 ? false : rnd() > 0.35;
      const wm = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.6), new THREE.MeshBasicMaterial({ color: lit ? new THREE.Color(2.2, 1.5, 0.7) : new THREE.Color(0.05, 0.06, 0.12) }));
      wm.position.set(hx, 1.3, hz + d / 2 + 0.01); R.add(wm); this.windows.push(wm);
      if (gx === 0 && gz === 0) this.target = [hx, 1.3, hz + d / 2 + 0.01];
      this.ghostSpots.push([hx, h + 1.8, hz]);
      if (rnd() > 0.5) { const tr = new THREE.Group(); tr.position.set(x + 2.6, 0, z + 2.4); tr.add(mesh(new THREE.CylinderGeometry(0.12, 0.18, 2.2, 8), col("#3b2a20"), [0, 1.1, 0])); tr.add(mesh(new THREE.IcosahedronGeometry(1.1, 1), col("#1f3326"), [0, 2.6, 0])); R.add(tr); }
    }
    const moonL = new THREE.DirectionalLight("#a9bfff", 3.0); moonL.position.set(-10, 20, -14); moonL.castShadow = true; moonL.shadow.mapSize.set(2048, 2048); Object.assign(moonL.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, far: 80 });
    this.sunDir.copy(moonL.position).normalize(); R.add(moonL, new THREE.HemisphereLight("#5a6ca8", "#241c30", 1.8));
    const sky = new THREE.Mesh(new THREE.SphereGeometry(120, 32, 16), new THREE.MeshBasicMaterial({ map: canvasTex(64, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#050816"); gr.addColorStop(0.5, "#16224a"); gr.addColorStop(1, "#2e3a66"); g.fillStyle = gr; g.fillRect(0, 0, 64, 256); }), side: THREE.BackSide, fog: false }));
    R.add(sky);
    const moon = new THREE.Mesh(new THREE.CircleGeometry(3, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 2.6, 2.8), fog: false })); moon.position.set(-30, 40, -60); moon.lookAt(0, 0, 0); R.add(moon);
    void bamboo;
  }
  update(_t: number) { void _t; }
}

/** a little cartoon ghost icon (the "every village has a horror story" pops) */
export const drawGhost = (g: CanvasRenderingContext2D, s: number) => {
  if (s <= 0.01) return; g.save(); g.translate(300, 600); g.scale(s, s);
  g.fillStyle = "rgba(240,244,255,0.95)"; g.strokeStyle = "#2b1a26"; g.lineWidth = 14; g.beginPath(); g.moveTo(-110, 120); g.lineTo(-110, -30); g.arc(0, -30, 110, Math.PI, 0); g.lineTo(110, 120);
  for (let i = 0; i < 4; i++) g.quadraticCurveTo(110 - 27.5 * (2 * i + 1), 160, 110 - 55 * (i + 1), 120); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#2b1a26"; for (const x of [-38, 38]) { g.beginPath(); g.ellipse(x, -30, 15, 22, 0, 0, Math.PI * 2); g.fill(); } g.beginPath(); g.ellipse(0, 30, 18, 24, 0, 0, Math.PI * 2); g.fill();
  g.restore();
};
