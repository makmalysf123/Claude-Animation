// Effects for "Kopi Mahal" v2. Every effect is a pure function of time (no state carried between frames), so any
// render tab draws the same picture for the same frame. 3D effects use sprite pools; effects that belong to a
// character (tears, shock lines, speed lines, sparkles, a spit-take spray) are drawn into its 2D card.
import * as THREE from "three";
import { canvasTex, LiveTex } from "../ketindihan2/sets";
import { OUTLINE } from "../../lib/toon2";
import { hash, clamp01, sm } from "../../lib/acting";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export const TEX = {
  puff: canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,0.85)"); gr.addColorStop(0.5, "rgba(255,255,255,0.4)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }),
  star: canvasTex(64, 64, (g) => { g.translate(32, 32); const gr = g.createRadialGradient(0, 0, 0, 0, 0, 30); gr.addColorStop(0, "rgba(255,255,240,1)"); gr.addColorStop(0.25, "rgba(255,230,160,0.7)"); gr.addColorStop(1, "rgba(255,200,100,0)"); g.fillStyle = gr;
    g.beginPath(); for (let k = 0; k < 8; k++) { const r = k % 2 ? 4 : 30, a = (k * Math.PI) / 4; g.lineTo(r * Math.cos(a), r * Math.sin(a)); } g.fill(); }),
  drop: canvasTex(32, 32, (g) => { g.fillStyle = "#4a2410"; g.beginPath(); g.arc(16, 18, 11, 0, Math.PI * 2); g.fill(); g.fillStyle = "rgba(255,220,180,0.6)"; g.beginPath(); g.arc(12, 14, 3, 0, Math.PI * 2); g.fill(); }),
  chalk: canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(250,248,240,0.9)"); gr.addColorStop(1, "rgba(250,248,240,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }),
  laugh: canvasTex(128, 128, (g) => { // our own laughing-tears face (drawn, no emoji font)
    g.translate(64, 64); g.fillStyle = "#ffd23f"; g.strokeStyle = "#b8860b"; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 54, 0, Math.PI * 2); g.fill(); g.stroke();
    g.strokeStyle = "#3a2410"; g.lineWidth = 7; g.lineCap = "round"; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 20, -10, 11, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    g.fillStyle = "#3a2410"; g.beginPath(); g.moveTo(-30, 8); g.quadraticCurveTo(0, 56, 30, 8); g.closePath(); g.fill(); g.fillStyle = "#e8505b"; g.beginPath(); g.ellipse(0, 28, 13, 8, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#7cc6ff"; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 44, 4, 9, 16, s * 0.4, 0, Math.PI * 2); g.fill(); } }),
  dust: canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(214,196,170,0.8)"); gr.addColorStop(1, "rgba(214,196,170,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }),
  flash: canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.2, "rgba(230,240,255,0.8)"); gr.addColorStop(1, "rgba(200,220,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    g.fillStyle = "rgba(255,255,255,0.9)"; for (let k = 0; k < 4; k++) { g.save(); g.translate(64, 64); g.rotate((k * Math.PI) / 4); g.fillRect(-64, -1.5, 128, 3); g.restore(); } }),
  bag: canvasTex(64, 64, (g) => { g.fillStyle = "rgba(240,240,236,0.9)"; g.beginPath(); g.moveTo(12, 14); g.lineTo(20, 4); g.lineTo(26, 14); g.lineTo(38, 14); g.lineTo(44, 4); g.lineTo(52, 14); g.quadraticCurveTo(58, 50, 32, 58); g.quadraticCurveTo(6, 50, 12, 14); g.fill(); g.strokeStyle = "rgba(120,120,120,0.6)"; g.lineWidth = 2; g.stroke(); }),
};

/** a pool of camera-facing sprites sharing one texture; fill it every frame with begin() / add() / end() */
export class SpritePool {
  private s: THREE.Sprite[] = []; private n = 0;
  constructor(private parent: THREE.Object3D, private tex: THREE.Texture, private max = 60, private additive = false, private tint = "#ffffff") {}
  begin() { this.n = 0; }
  add(p: THREE.Vector3, size: number, opacity = 1, rot = 0) {
    if (this.n >= this.max || opacity <= 0.003 || size <= 0) return;
    let sp = this.s[this.n]; if (!sp) { sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthWrite: false, color: this.tint, blending: this.additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: !this.additive })); sp.renderOrder = 8; this.parent.add(sp); this.s.push(sp); }
    sp.visible = true; sp.position.copy(p); sp.scale.set(size, size, 1); (sp.material as THREE.SpriteMaterial).opacity = opacity; (sp.material as THREE.SpriteMaterial).rotation = rot; this.n++;
  }
  end() { for (let i = this.n; i < this.s.length; i++) this.s[i].visible = false; }
}

/** a burst of n particles thrown from `o` at time t0: direction `dir` +- spread, speed, gravity; returns [pos, age01] */
export const burst = (t: number, t0: number, life: number, n: number, o: THREE.Vector3, dir: THREE.Vector3, spread: number, speed: number, grav: number, seed: number) => {
  const out: [THREE.Vector3, number, number][] = []; const a = t - t0; if (a < 0 || a > life) return out;
  for (let i = 0; i < n; i++) { const r1 = hash(seed + i * 3.1), r2 = hash(seed + i * 5.7), r3 = hash(seed + i * 7.3), sp = speed * (0.55 + 0.6 * r3), d = dir.clone().add(V((r1 - 0.5) * 2 * spread, (r2 - 0.5) * 2 * spread, (hash(seed + i * 9.9) - 0.5) * 2 * spread)).normalize();
    out.push([o.clone().addScaledVector(d, sp * a).add(V(0, -0.5 * grav * a * a, 0)), a / life, i]); }
  return out;
};

/** latte art drawn on the cup's milk surface: p 0..1 = how far the pour has gone (white blob -> heart -> swan wings) */
export class LatteArt {
  tex = new LiveTex(256, 256);
  draw(p: number) {
    const q = Math.round(p * 40) / 40;
    this.tex.draw("l" + q, (g, w) => {
      g.fillStyle = "#7a4a26"; g.fillRect(0, 0, w, w); const gr = g.createRadialGradient(128, 128, 60, 128, 128, 128); gr.addColorStop(0, "rgba(160,104,60,0)"); gr.addColorStop(1, "rgba(70,36,16,0.8)"); g.fillStyle = gr; g.fillRect(0, 0, w, w);
      if (q <= 0) return; g.fillStyle = "#fbf3e4";
      const b = clamp01(q / 0.45), r = 22 + 44 * b; g.beginPath(); g.ellipse(128, 150 - 10 * b, r, r * 0.8, 0, 0, Math.PI * 2); g.fill(); // the white blob
      if (q > 0.45) { const k = clamp01((q - 0.45) / 0.3); for (let i = 0; i < 4; i++) { const y = 150 - 22 * i * k, rr = (60 - i * 11) * k; g.fillStyle = i % 2 ? "#a46a3c" : "#fbf3e4"; g.beginPath(); g.ellipse(128, y, rr, rr * 0.55, 0, Math.PI, Math.PI * 2); g.fill(); } } // wing layers
      if (q > 0.75) { const k = clamp01((q - 0.75) / 0.25); g.strokeStyle = "#fbf3e4"; g.lineWidth = 9; g.lineCap = "round"; g.beginPath(); g.moveTo(128, 170); g.quadraticCurveTo(128 + 6, 100, 128 - 4, 60 + 40 * (1 - k)); g.stroke(); g.fillStyle = "#fbf3e4"; g.beginPath(); g.arc(124, 60 + 40 * (1 - k), 10 * k, 0, Math.PI * 2); g.fill(); } // neck + head pulled through
    });
  }
}

/** a curved stream of liquid from `a` to `b` (kettle spout or milk pitcher) */
export class Stream {
  mesh: THREE.Mesh;
  constructor(parent: THREE.Object3D, color = "#e8eef2", opacity = 0.65) { this.mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V(0, 0, 0), V(0, 0, 0), V(0, -0.1, 0)), 12, 0.004, 6), new THREE.MeshPhysicalMaterial({ color, roughness: 0.05, transparent: true, opacity, clearcoat: 1 })); this.mesh.visible = false; this.mesh.castShadow = false; parent.add(this.mesh); }
  set(a: THREE.Vector3 | null, b?: THREE.Vector3, r = 0.004) {
    if (!a || !b) { this.mesh.visible = false; return; }
    const mid = a.clone().lerp(b, 0.5); mid.y = a.y + 0.01; mid.x += (b.x - a.x) * 0.15;
    this.mesh.geometry.dispose(); this.mesh.geometry = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 12, r, 6); this.mesh.visible = true;
  }
}

// ---------------- 2D effects drawn on a character card (design units of the card) ----------------
/** tears flying out of both eye corners in arcs (laughing / crying) */
export const drawTears = (g: CanvasRenderingContext2D, cx: number, cy: number, R: number, t: number, k = 1) => {
  if (k <= 0.01) return; g.save(); g.fillStyle = "#8fd3ff"; g.strokeStyle = OUTLINE; g.lineWidth = 3;
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const u = (t * 2.2 + i * 0.25 + (s > 0 ? 0.12 : 0)) % 1, x = cx + s * (R * 0.55 + R * 0.9 * u), y = cy - R * 0.05 - R * 0.55 * Math.sin(Math.PI * u) + R * 0.5 * u * u, r = R * 0.07 * (1 - 0.4 * u) * k;
    g.globalAlpha = (1 - u) * k; g.beginPath(); g.ellipse(x, y, r, r * 1.3, s * 0.6, 0, Math.PI * 2); g.fill(); g.stroke(); }
  g.restore();
};
/** short radiating "shock" lines around the head (emanata); k 0..1 */
export const drawShockLines = (g: CanvasRenderingContext2D, cx: number, cy: number, R: number, k: number, n = 9) => {
  if (k <= 0.01) return; g.save(); g.strokeStyle = OUTLINE; g.lineCap = "round"; g.lineWidth = 7 * k;
  for (let i = 0; i < n; i++) { const a = -Math.PI + (i / (n - 1)) * Math.PI, r0 = R * (1.2 + 0.1 * (i % 2)), r1 = r0 + R * 0.3 * k; g.beginPath(); g.moveTo(cx + r0 * Math.cos(a), cy + r0 * Math.sin(a)); g.lineTo(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a)); g.stroke(); }
  g.restore();
};
/** speed lines trailing a moving character: dir = -1 lines on the left (moving right), +1 on the right */
export const drawSpeedLines = (g: CanvasRenderingContext2D, dir: number, k: number, t: number) => {
  if (k <= 0.01) return; g.save(); g.strokeStyle = `rgba(43,26,38,${0.55 * k})`; g.lineCap = "round"; g.lineWidth = 5;
  for (let i = 0; i < 7; i++) { const y = 250 + i * 95 + 20 * Math.sin(t * 9 + i), x0 = 300 + dir * (150 + 30 * hash(i)), L = (90 + 70 * hash(i + 4)) * k; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + dir * L, y); g.stroke(); }
  g.restore();
};
/** sparkles around a point (k 0..1) */
export const drawSparkles = (g: CanvasRenderingContext2D, cx: number, cy: number, R: number, t: number, k: number, n = 6) => {
  if (k <= 0.01) return; g.save();
  for (let i = 0; i < n; i++) { const a = t * 0.9 + (i / n) * Math.PI * 2, r = R * (1.25 + 0.2 * Math.sin(t * 2 + i)), x = cx + r * Math.cos(a), y = cy + r * Math.sin(a) * 0.85, s = R * 0.12 * k * (0.5 + 0.5 * Math.abs(Math.sin(t * 5 + i * 1.3)));
    g.fillStyle = i % 2 ? "#fff3b0" : "#ffd36b"; g.beginPath(); for (let j = 0; j < 8; j++) { const rr = j % 2 ? s * 0.28 : s, aa = (j * Math.PI) / 4; g.lineTo(x + rr * Math.cos(aa), y + rr * Math.sin(aa)); } g.fill(); }
  g.restore();
};
/** a spit-take spray of coffee from the mouth to one side; u 0..1 = time since the spit over its length */
export const drawSpray = (g: CanvasRenderingContext2D, mx: number, my: number, dir: number, u: number, R: number) => {
  if (u <= 0 || u >= 1) return; g.save();
  for (let i = 0; i < 26; i++) { const sp = 0.5 + hash(i * 3.3), a = (hash(i * 1.7) - 0.5) * 0.9, d = R * 3.2 * u * sp, x = mx + dir * d * Math.cos(a), y = my + d * Math.sin(a) + R * 1.6 * u * u, r = R * (0.03 + 0.05 * hash(i * 9.1)) * (1 - 0.5 * u);
    g.globalAlpha = 1 - u * u; g.fillStyle = i % 4 ? "#5a2e14" : "#8a5a34"; g.beginPath(); g.ellipse(x, y, r * 1.4, r, a, 0, Math.PI * 2); g.fill(); }
  g.restore();
};
/** sweat drops flying off the head (nervous) */
export const drawFlyingSweat = (g: CanvasRenderingContext2D, cx: number, cy: number, R: number, t: number, k = 1) => {
  if (k <= 0.01) return; g.save(); g.fillStyle = "#bfe6ff"; g.strokeStyle = OUTLINE; g.lineWidth = 3;
  for (let i = 0; i < 3; i++) { const u = (t * 1.6 + i / 3) % 1, s = i % 2 ? 1 : -1, x = cx + s * R * (0.9 + 0.5 * u), y = cy - R * (0.7 - 0.8 * u * u), r = R * 0.07; g.globalAlpha = k * (1 - u);
    g.beginPath(); g.moveTo(x, y - r * 1.8); g.quadraticCurveTo(x + r, y, x, y + r); g.quadraticCurveTo(x - r, y, x, y - r * 1.8); g.fill(); g.stroke(); }
  g.restore();
};
/** a little "z" trail rising from a sleeper */
export const drawZzz = (g: CanvasRenderingContext2D, x: number, y: number, t: number) => {
  g.save(); g.fillStyle = "#3a4a6a"; g.font = "bold 46px 'Comic Sans MS', cursive";
  for (let i = 0; i < 3; i++) { const u = (t * 0.6 + i / 3) % 1; g.globalAlpha = Math.sin(Math.PI * u); g.font = `bold ${26 + 30 * u}px 'Comic Sans MS', cursive`; g.fillText("z", x + 40 * u + 10 * Math.sin(t * 3 + i), y - 160 * u); }
  g.restore();
};
/** a sleeping cat curled on a cushion (2D card content, design units) */
export const drawCat = (g: CanvasRenderingContext2D, t: number, wake = 0) => {
  g.save(); g.translate(300, 860); g.lineJoin = "round"; g.lineCap = "round"; const br = 1 + 0.03 * Math.sin(t * 2.4);
  g.fillStyle = "#c9c2b6"; g.strokeStyle = OUTLINE; g.lineWidth = 9;
  g.beginPath(); g.ellipse(0, 0, 150 * br, 78 * br, 0, Math.PI, Math.PI * 2); g.lineTo(150, 30); g.quadraticCurveTo(0, 60, -150, 30); g.closePath(); g.fillStyle = "#e7a34b"; g.fill(); g.stroke(); // body
  g.fillStyle = "#c97f2e"; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(-60 + i * 45, -50 + 8 * Math.abs(i - 1.5), 10, 30, 0.3, 0, Math.PI * 2); g.fill(); } // stripes
  g.fillStyle = "#e7a34b"; g.beginPath(); g.ellipse(-110, -20, 62, 54, 0, 0, Math.PI * 2); g.fill(); g.stroke(); // head
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(-110 + s * 20, -60); g.lineTo(-110 + s * 48, -100); g.lineTo(-110 + s * 54, -44); g.closePath(); g.fill(); g.stroke(); }
  g.lineWidth = 6; if (wake > 0.5) { g.fillStyle = OUTLINE; for (const s of [-1, 1]) { g.beginPath(); g.arc(-110 + s * 22, -22, 9, 0, Math.PI * 2); g.fill(); } } else for (const s of [-1, 1]) { g.beginPath(); g.arc(-110 + s * 22, -26, 12, 0.2, Math.PI - 0.2); g.stroke(); }
  g.beginPath(); g.moveTo(-118, 2); g.quadraticCurveTo(-110, 10, -102, 2); g.stroke();
  g.lineWidth = 9; g.strokeStyle = OUTLINE; g.fillStyle = "#e7a34b"; const tw = 20 * Math.sin(t * 1.7); g.beginPath(); g.moveTo(140, 10); g.quadraticCurveTo(220, -20 + tw, 190, -90 + tw); g.lineWidth = 34; g.strokeStyle = OUTLINE; g.stroke(); g.lineWidth = 20; g.strokeStyle = "#e7a34b"; g.stroke();
  g.restore();
};
export const easeOutBack = (x: number) => { const c1 = 1.70158, c3 = c1 + 1, u = clamp01(x); return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
export { sm };
