// Detailed office set (reusable): painted canvas textures + small props, toon-shaded so the ink pass outlines them.
import * as THREE from "three";
import { NOINK } from "../bridge/ink";

const grad = (() => { const d = new Uint8Array([110, 190, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
export const toon = (c: string, map?: THREE.Texture) => new THREE.MeshToonMaterial({ color: map ? "#ffffff" : c, map: map ?? null, gradientMap: grad });
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// ---------- painted textures ----------
const paint = (w: number, h: number, fn: (g: CanvasRenderingContext2D) => void, repeat: [number, number] = [1, 1]) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; fn(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8; return t;
};
const speckle = (g: CanvasRenderingContext2D, w: number, h: number, n: number, col: string, a: number) => { g.fillStyle = col; g.globalAlpha = a; for (let i = 0; i < n; i++) g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3); g.globalAlpha = 1; };
const floorTex = () => paint(512, 512, (g) => {
  g.fillStyle = "#c9cfd3"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? "#c3c9ce" : "#ccd2d6"; g.fillRect(x * 128 + 2, y * 128 + 2, 124, 124); }
  speckle(g, 512, 512, 1600, "#8e979e", 0.25); g.strokeStyle = "#a9b0b5"; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke(); }
}, [8, 8]);
const wallTex = () => paint(512, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#efe8d8"); gr.addColorStop(1, "#e2d9c5"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  speckle(g, 512, 512, 900, "#b9ad93", 0.18); g.fillStyle = "#8a7b62"; g.fillRect(0, 488, 512, 24); // baseboard
}, [4, 1]);
const woodTex = () => paint(256, 256, (g) => {
  g.fillStyle = "#c79a63"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "#a97c48"; g.globalAlpha = 0.5;
  for (let i = 0; i < 18; i++) { g.lineWidth = 1 + rnd() * 2; g.beginPath(); const y = rnd() * 256; g.moveTo(0, y); g.bezierCurveTo(80, y + rnd() * 10 - 5, 170, y + rnd() * 10 - 5, 256, y); g.stroke(); } g.globalAlpha = 1;
});
const posterTex = (bg: string, title: string, accent: string) => paint(256, 360, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, 256, 360); g.fillStyle = accent; g.beginPath(); g.arc(128, 150, 70, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#ffffff"; g.font = "bold 34px Arial"; g.textAlign = "center"; g.fillText(title, 128, 300);
});
const calendarTex = () => paint(256, 300, (g) => {
  g.fillStyle = "#fff"; g.fillRect(0, 0, 256, 300); g.fillStyle = "#d0453b"; g.fillRect(0, 0, 256, 60); g.fillStyle = "#fff"; g.font = "bold 30px Arial"; g.textAlign = "center"; g.fillText("NOVEMBER", 128, 42);
  g.fillStyle = "#333"; g.font = "18px Arial"; for (let i = 0; i < 30; i++) g.fillText(String(i + 1), 30 + (i % 7) * 33, 95 + Math.floor(i / 7) * 40);
  g.strokeStyle = "#d0453b"; g.lineWidth = 4; g.beginPath(); g.arc(30 + 3 * 33, 95 + 1 * 40 - 6, 16, 0, Math.PI * 2); g.stroke();
});
const screenTex = (code: boolean) => paint(256, 160, (g) => {
  g.fillStyle = code ? "#1e2433" : "#eaf3ff"; g.fillRect(0, 0, 256, 160);
  for (let i = 0; i < 10; i++) { g.fillStyle = code ? ["#7fd4a8", "#e9c46a", "#8ab4ff"][i % 3] : "#9fb3c8"; g.fillRect(14 + (i % 3) * 8, 14 + i * 14, 60 + rnd() * 140, 6); }
});

// ---------- props ----------
export const buildOffice = () => {
  seed = 7;
  const g = new THREE.Group();
  const add = <T extends THREE.Mesh>(m: T) => { m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, ry = 0) => { const m = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)); m.position.set(x, y, z); m.rotation.y = ry; return m; };
  const cyl = (rt: number, rb: number, h: number, mat: THREE.Material, x: number, y: number, z: number) => { const m = add(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 16), mat)); m.position.set(x, y, z); return m; };
  const plane = (w: number, h: number, tex: THREE.Texture, x: number, y: number, z: number, ry = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), toon("#fff", tex)); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; g.add(m); return m; };
  const wood = toon("#fff", woodTex()), dark = toon("#2b2f38"), metal = toon("#9aa3ad"), white = toon("#f6f4ee");
  // room
  const fl = add(new THREE.Mesh(new THREE.PlaneGeometry(14, 14), toon("#fff", floorTex()))); fl.rotation.x = -Math.PI / 2; fl.position.z = 0.5;
  const wt = wallTex(); box(12, 3.4, 0.2, toon("#fff", wt), 0, 1.7, -3.2); box(0.2, 3.4, 8, toon("#fff", wt), -4.2, 1.7, 0.6);
  box(12, 0.12, 8, toon("#f2efe7"), 0, 3.4, 0.6); // ceiling edge (visible in low shots)
  // window with frame + blinds (light comes from here)
  box(1.9, 1.4, 0.06, new THREE.MeshBasicMaterial({ color: new THREE.Color("#d8efff").multiplyScalar(1.25) }), 2.3, 1.85, -3.09);
  for (let i = 0; i < 9; i++) box(1.9, 0.04, 0.03, white, 2.3, 1.25 + i * 0.15, -3.05);
  box(2.0, 0.08, 0.12, white, 2.3, 1.1, -3.05);
  // whiteboard with marker scribbles, posters, calendar, clock
  box(2.2, 1.2, 0.05, white, -1.7, 1.85, -3.07);
  plane(2.0, 1.0, paint(400, 200, (c) => { c.fillStyle = "#fff"; c.fillRect(0, 0, 400, 200); c.strokeStyle = "#2f6fb5"; c.lineWidth = 5; c.beginPath(); c.moveTo(30, 150); c.lineTo(120, 90); c.lineTo(200, 120); c.lineTo(300, 40); c.stroke(); c.fillStyle = "#d0453b"; c.font = "bold 30px Arial"; c.fillText("TARGET Q4!", 210, 180); }), -1.7, 1.85, -3.04);
  plane(0.55, 0.78, posterTex("#2f6fb5", "TEAM", "#ffd23f"), -3.2, 1.95, -3.09); plane(0.55, 0.78, posterTex("#5a8f4a", "FOKUS", "#f4a259"), -4.09, 1.95, -1.6, Math.PI / 2);
  plane(0.42, 0.5, calendarTex(), 0.65, 1.85, -3.09);
  const clock = cyl(0.2, 0.2, 0.05, white, 0.0, 2.75, -3.06); clock.rotation.x = Math.PI / 2;
  // ceiling lights
  for (const x of [-1.4, 1.4]) { box(1.2, 0.06, 0.3, new THREE.MeshBasicMaterial({ color: new THREE.Color("#fff6dc").multiplyScalar(1.3) }), x, 3.25, -0.6); }
  // filing cabinet + shelf with binders + water dispenser + plants + printer
  box(0.6, 1.3, 0.55, metal, -3.5, 0.65, -2.7); for (let i = 0; i < 3; i++) box(0.5, 0.02, 0.02, dark, -3.5, 0.3 + i * 0.4, -2.42);
  box(1.4, 0.05, 0.35, wood, -1.9, 2.75, -3.0);
  for (let i = 0; i < 8; i++) box(0.12, 0.3, 0.26, toon(["#d0453b", "#2f6fb5", "#ffd23f", "#5a8f4a"][i % 4]), -2.45 + i * 0.15, 2.93, -3.0);
  box(0.45, 0.95, 0.4, toon("#dfe3e8"), 3.4, 0.48, -2.6); cyl(0.15, 0.15, 0.4, toon("#9fd4ff"), 3.4, 1.15, -2.6);
  box(0.8, 0.75, 0.55, toon("#e8e6e0"), 3.6, 0.38, -1.2); box(0.6, 0.3, 0.45, toon("#cfd3d9"), 3.6, 0.9, -1.2); // printer table
  for (const [x, z, s] of [[-3.5, -1.4, 1], [3.6, 0.6, 0.8]] as [number, number, number][]) { cyl(0.22 * s, 0.17 * s, 0.4 * s, toon("#b5653f"), x, 0.2 * s, z); for (let k = 0; k < 5; k++) { const l = add(new THREE.Mesh(new THREE.SphereGeometry(0.2 * s, 10, 8), toon(k % 2 ? "#4f8a4a" : "#5d9c55"))); l.position.set(x + Math.cos(k * 1.3) * 0.15 * s, (0.55 + (k % 3) * 0.18) * s, z + Math.sin(k * 1.3) * 0.15 * s); } }
  // two desks: wood top, modesty panel, angled monitor with a lit screen, keyboard, mug, papers, files, lamp, office chair
  for (const x of [-0.85, 0.85]) {
    box(1.4, 0.05, 0.75, wood, x, 0.74, -0.45); box(1.36, 0.7, 0.04, wood, x, 0.37, -0.1); box(1.2, 0.025, 0.01, toon("#8a6538"), x, 0.55, -0.075); box(1.2, 0.025, 0.01, toon("#8a6538"), x, 0.2, -0.075); // panel grooves
    for (const lx of [-0.65, 0.65]) box(0.05, 0.72, 0.6, toon("#8a6538"), x + lx, 0.36, -0.45);
    const mx = x + (x < 0 ? -0.42 : 0.42), ry = x < 0 ? 0.6 : -0.6;
    box(0.5, 0.32, 0.04, dark, mx, 0.98, -0.55, ry); box(0.07, 0.16, 0.07, dark, mx, 0.84, -0.56);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.28), new THREE.MeshBasicMaterial({ map: screenTex(x > 0) })); scr.position.set(mx + Math.sin(ry) * 0.022, 0.98, -0.55 + Math.cos(ry) * 0.022); scr.rotation.y = ry; g.add(scr);
    box(0.42, 0.02, 0.14, dark, x - (x < 0 ? -0.05 : 0.05), 0.775, -0.28);
    cyl(0.045, 0.045, 0.1, toon(x < 0 ? "#e2453c" : "#ffd23f"), x + (x < 0 ? 0.48 : -0.48), 0.82, -0.25);
    for (let i = 0; i < 3; i++) box(0.22, 0.006, 0.3, white, x + (x < 0 ? 0.25 : -0.3) + i * 0.02, 0.77 + i * 0.006, -0.62, 0.15 * i - 0.1);
    box(0.25, 0.06, 0.32, toon(x < 0 ? "#2f6fb5" : "#5a8f4a"), x + (x < 0 ? 0.5 : -0.5), 0.8, -0.65, 0.2);
    // chair behind the desk (back visible around the seated figure)
    box(0.55, 0.08, 0.5, dark, x, 0.48, -1.05); box(0.5, 0.65, 0.07, dark, x, 0.85, -1.32); cyl(0.04, 0.04, 0.42, metal, x, 0.24, -1.05);
  }
  // cable + bin + paper on the floor (small "lived-in" details)
  cyl(0.16, 0.13, 0.32, toon("#6b7280"), -1.85, 0.16, 0.05);
  box(0.21, 0.004, 0.3, white, -1.6, 0.003, 0.35, 0.6);
  return g;
};

// soft contact blob under a character (multiply-like dark ellipse)
export const contactBlob = () => {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d")!;
  const r = g.createRadialGradient(64, 64, 4, 64, 64, 62); r.addColorStop(0, "rgba(20,24,40,0.55)"); r.addColorStop(1, "rgba(20,24,40,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.layers.set(NOINK); m.renderOrder = 0; return m;
};
