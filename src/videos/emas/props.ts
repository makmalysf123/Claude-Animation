// 3D props for the gold-coin film. Everything is a real 3D object (only the characters are 2D cards). Screens are live
// canvas textures with pictures and icons only, no readable words (the user adds narration and subtitles).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { canvasTex, LiveTex } from "../ketindihan2/sets";
import { rnd } from "../../lib/world2/textures";

type V3 = [number, number, number];
export const mat = (c: string, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });
export const M = (geo: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], p: V3 = [0, 0, 0], r: V3 = [0, 0, 0]) => { const o = new THREE.Mesh(geo, m); o.position.set(...p); o.rotation.set(...r); o.castShadow = true; o.receiveShadow = true; return o; };
export const rb = (w: number, h: number, d: number, r = 0.01) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.1, h / 2.1, d / 2.1));
const GOLD = () => new THREE.MeshStandardMaterial({ color: "#f2c14e", metalness: 0.95, roughness: 0.22, emissive: "#6a4006", emissiveIntensity: 0.35 });

/** a little picture of the coin (for screens) */
const drawCoin = (g: CanvasRenderingContext2D, x: number, y: number, r: number) => {
  const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); gr.addColorStop(0, "#fff0a8"); gr.addColorStop(0.6, "#e7b443"); gr.addColorStop(1, "#9a6a14"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#8a5c12"; g.lineWidth = r * 0.08; g.beginPath(); g.arc(x, y, r * 0.85, 0, Math.PI * 2); g.stroke(); g.lineWidth = r * 0.12; g.lineCap = "round";
  g.beginPath(); g.moveTo(x - r * 0.35, y - r * 0.28); g.lineTo(x + r * 0.35, y - r * 0.28); g.moveTo(x + r * 0.2, y - r * 0.28); g.lineTo(x + r * 0.2, y + r * 0.4); g.moveTo(x - r * 0.2, y - r * 0.28); g.quadraticCurveTo(x - r * 0.3, y + r * 0.2, x - r * 0.05, y + r * 0.35); g.stroke();
};
const sparkle = (g: CanvasRenderingContext2D, x: number, y: number, s: number, c = "#fff3b0") => { g.fillStyle = c; g.beginPath(); for (let j = 0; j < 8; j++) { const rr = j % 2 ? s * 0.28 : s, a = (j * Math.PI) / 4; g.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); } g.fill(); };
const lines = (g: CanvasRenderingContext2D, x: number, y: number, w: number, n: number, c = "#9aa3ad", lh = 22) => { g.fillStyle = c; for (let i = 0; i < n; i++) { g.beginPath(); g.roundRect(x, y + i * lh, w * (i === n - 1 ? 0.55 : 0.85 + 0.15 * Math.sin(i * 3.1)), lh * 0.45, 5); g.fill(); } };
const bubble = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) => { g.fillStyle = c; g.beginPath(); g.roundRect(x, y, w, h, 18); g.fill(); };

// ---------------- the phone ----------------
export type PhoneMode = "camera" | "answer" | "ask" | "typing" | "off";
export class PhoneProp {
  group = new THREE.Group(); screen = new LiveTex(360, 760); light = new THREE.PointLight("#bcd8ff", 0, 0.9, 2);
  constructor(col = "#2b6fd6") {
    this.group.add(M(rb(0.075, 0.156, 0.009, 0.009), mat("#1c1e22", { metalness: 0.7, roughness: 0.3 })));
    const s = M(new THREE.PlaneGeometry(0.068, 0.148), new THREE.MeshBasicMaterial({ map: this.screen.tex, toneMapped: false }), [0, 0, 0.0047]); s.castShadow = false; this.group.add(s);
    this.group.add(M(new THREE.PlaneGeometry(0.07, 0.15), mat(col, { roughness: 0.25, metalness: 0.3 }), [0, 0, -0.0047], [0, Math.PI, 0]));
    this.group.add(M(new THREE.CylinderGeometry(0.008, 0.008, 0.003, 18), mat("#111", { roughness: 0.05 }), [-0.022, 0.058, -0.0058], [Math.PI / 2, 0, 0]));
    this.light.position.set(0, 0, 0.12); this.group.add(this.light);
  }
  /** u = progress 0..1 inside the mode */
  draw(mode: PhoneMode, u: number, t: number) {
    this.light.intensity = mode === "off" ? 0 : 0.35;
    const key = mode + Math.floor(u * 24) + (mode === "camera" ? Math.floor(t * 6) : 0);
    this.screen.draw(key, (g, w, h) => {
      if (mode === "off") { g.fillStyle = "#08090c"; g.fillRect(0, 0, w, h); return; }
      if (mode === "camera") { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#5a3a24"); gr.addColorStop(1, "#7a5232"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(40,24,12,${0.3 + (i % 3) * 0.1})`; g.beginPath(); g.ellipse((i * 97) % w, (i * 173) % h, 14 + (i % 4) * 6, 9, i, 0, Math.PI * 2); g.fill(); }
        drawCoin(g, w / 2, h * 0.42, 92); sparkle(g, w / 2 + 70, h * 0.36, 26);
        g.strokeStyle = "rgba(255,255,255,0.85)"; g.lineWidth = 4; const s = 70; for (const [x, y, dx, dy] of [[50, 140, 1, 1], [w - 50, 140, -1, 1], [50, h - 260, 1, -1], [w - 50, h - 260, -1, -1]]) { g.beginPath(); g.moveTo(x, y + dy * s); g.lineTo(x, y); g.lineTo(x + dx * s, y); g.stroke(); }
        const flash = u > 0.7 && u < 0.8 ? 1 : 0; g.fillStyle = "#fff"; g.beginPath(); g.arc(w / 2, h - 110, 40, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 5; g.beginPath(); g.arc(w / 2, h - 110, 50, 0, Math.PI * 2); g.stroke();
        if (flash) { g.fillStyle = "rgba(255,255,255,0.9)"; g.fillRect(0, 0, w, h); } return; }
      // chat with the AI: header, the photo you sent, its answers (pictures + bars, no words)
      g.fillStyle = "#f3f0fa"; g.fillRect(0, 0, w, h); g.fillStyle = "#6b4ce6"; g.fillRect(0, 0, w, 96); sparkle(g, 48, 50, 22, "#fff"); g.fillStyle = "rgba(255,255,255,0.8)"; g.beginPath(); g.roundRect(84, 38, 140, 18, 9); g.fill();
      bubble(g, w - 200, 120, 180, 180, "#d8f5d0"); drawCoin(g, w - 110, 210, 66);
      if (mode === "answer") { const k = Math.min(1, u * 1.6); if (k > 0.05) { bubble(g, 18, 320, w - 70, 300 * k, "#ffffff"); g.save(); g.beginPath(); g.rect(18, 320, w - 70, 300 * k); g.clip();
          drawCoin(g, 80, 380, 40); for (let i = 0; i < 3; i++) { g.fillStyle = "#c79a2c"; g.beginPath(); g.roundRect(140, 352 + i * 22, 140 - i * 30, 12, 6); g.fill(); }
          g.fillStyle = "#2f9a4a"; for (let i = 0; i < 9; i++) { g.beginPath(); g.roundRect(40 + i * 30, 470 + (i % 2) * 6, 22, 60, 4); g.fill(); g.fillStyle = "#c6f0c8"; g.fillRect(48 + i * 30, 492 + (i % 2) * 6, 6, 16); g.fillStyle = "#2f9a4a"; }
          lines(g, 40, 556, w - 120, 2); g.restore(); }
        if (u > 0.55) for (let i = 0; i < 4; i++) sparkle(g, 60 + i * 80, 650 + 12 * Math.sin(t * 5 + i), 18 + 6 * Math.sin(t * 7 + i)); return; }
      bubble(g, 18, 320, w - 70, 150, "#ffffff"); lines(g, 40, 345, w - 120, 4); bubble(g, 18, 490, 190, 150, "#ffffff");
      g.fillStyle = "#6b4ce6"; g.font = "bold 120px Arial"; g.textAlign = "center"; g.fillText("?", 113, 610); // a question mark, not a word
      if (mode === "typing") { g.fillStyle = "#d9d6e2"; g.fillRect(0, h - 260, w, 260); for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) { const hit = Math.floor(u * 40 + t * 9) % 36 === r * 9 + c; g.fillStyle = hit ? "#9a8ad8" : "#fff"; g.beginPath(); g.roundRect(8 + c * 39, h - 250 + r * 60, 33, 50, 7); g.fill(); }
        const n = Math.floor(u * 14); bubble(g, w - 40 - Math.min(260, n * 20), 660 - 0, Math.min(260, n * 20) + 20, 70, "#d8f5d0"); for (let i = 0; i < n; i++) { g.fillStyle = "#4a6a48"; g.beginPath(); g.arc(w - 30 - i * 18, 695, 6, 0, Math.PI * 2); g.fill(); } }
    });
  }
}

// ---------------- laptop ----------------
export type LaptopMode = "browse" | "notif" | "email" | "off";
export class Laptop {
  group = new THREE.Group(); lid = new THREE.Group(); screen = new LiveTex(640, 400); light = new THREE.PointLight("#cfe0ff", 0, 1.6, 2);
  constructor() {
    const al = mat("#b8bcc4", { metalness: 0.7, roughness: 0.3 });
    this.group.add(M(rb(0.34, 0.016, 0.24, 0.006), al, [0, 0.008, 0])); this.group.add(M(new THREE.PlaneGeometry(0.3, 0.12), mat("#2a2c30"), [0, 0.0165, -0.03], [-Math.PI / 2, 0, 0]));
    this.group.add(M(new THREE.PlaneGeometry(0.1, 0.06), mat("#a8acb4", { metalness: 0.5 }), [0, 0.0165, 0.075], [-Math.PI / 2, 0, 0]));
    this.lid.position.set(0, 0.016, -0.12); this.group.add(this.lid);
    this.lid.add(M(rb(0.34, 0.22, 0.008, 0.006), al, [0, 0.11, 0]));
    const s = M(new THREE.PlaneGeometry(0.31, 0.19), new THREE.MeshBasicMaterial({ map: this.screen.tex, toneMapped: false }), [0, 0.11, 0.0045]); s.castShadow = false; this.lid.add(s);
    this.light.position.set(0, 0.15, 0.25); this.group.add(this.light);
  }
  /** open 0..1 (lid angle) */
  open(k: number) { this.lid.rotation.x = (1 - k) * 1.5708 - 0.26 * k; }
  draw(mode: LaptopMode, u: number, t: number) {
    this.light.intensity = mode === "off" ? 0 : 0.6;
    const key = mode + Math.floor(u * 30) + Math.floor(t * 4);
    this.screen.draw(key, (g, w, h) => {
      if (mode === "off") { g.fillStyle = "#050608"; g.fillRect(0, 0, w, h); return; }
      g.fillStyle = "#f6f4ef"; g.fillRect(0, 0, w, h); g.fillStyle = "#7a1f2a"; g.fillRect(0, 0, w, 54); for (let i = 0; i < 3; i++) { g.fillStyle = ["#ff5f57", "#febc2e", "#28c840"][i]; g.beginPath(); g.arc(20 + i * 18, 27, 6, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "rgba(255,255,255,0.85)"; g.beginPath(); g.roundRect(90, 16, 300, 22, 11); g.fill(); drawCoin(g, w - 40, 27, 18);
      if (mode === "email") { g.fillStyle = "#e9e6f2"; g.fillRect(0, 54, 160, h - 54); for (let i = 0; i < 6; i++) { g.fillStyle = i === 0 ? "#cfc6ee" : "#e9e6f2"; g.fillRect(0, 60 + i * 52, 160, 48); lines(g, 14, 72 + i * 52, 130, 2, "#8a8a9a", 16); }
        drawCoin(g, 230, 120, 40); lines(g, 290, 95, 300, 3, "#5a5a6a", 24); g.fillStyle = "#2f9a4a"; g.beginPath(); g.roundRect(200, 200, 400, 120, 14); g.fill(); for (let i = 0; i < 8; i++) { g.fillStyle = "#c6f0c8"; g.beginPath(); g.roundRect(222 + i * 46, 225, 34, 70, 6); g.fill(); } return; }
      // a collector's shop page: banner, coin grid, a phone icon, a map with a pin
      const gr = g.createLinearGradient(0, 54, w, 160); gr.addColorStop(0, "#f3d37a"); gr.addColorStop(1, "#c98a2c"); g.fillStyle = gr; g.fillRect(0, 54, w, 100); for (let i = 0; i < 5; i++) drawCoin(g, 60 + i * 120, 104, 34);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) { const x = 20 + c * 150, y = 170 + r * 110; g.fillStyle = "#fff"; g.fillRect(x, y, 136, 98); drawCoin(g, x + 40, y + 45, 26); lines(g, x + 72, y + 30, 56, 3, "#b0a8a0", 16); }
      g.fillStyle = "#cfe3d0"; g.fillRect(480, 170, 145, 210); g.strokeStyle = "#fff"; g.lineWidth = 6; g.beginPath(); g.moveTo(480, 250); g.lineTo(625, 300); g.moveTo(540, 170); g.lineTo(560, 380); g.stroke();
      g.fillStyle = "#e0352b"; g.beginPath(); g.arc(553, 255, 18, Math.PI, 0); g.lineTo(553, 290); g.closePath(); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(553, 255, 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#2f9a4a"; g.beginPath(); g.roundRect(20, 400 - 50, 120, 36, 18); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 4; g.beginPath(); g.arc(50, 368, 8, 0.5, 2.6); g.stroke();
      if (mode === "notif") { const k = Math.min(1, u * 4), y = -120 + 180 * (1 - Math.pow(1 - k, 3)); g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.roundRect(w - 330, y + 6, 310, 110, 16); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.roundRect(w - 336, y, 310, 110, 16); g.fill();
        g.fillStyle = "#e0352b"; g.beginPath(); g.roundRect(w - 320, y + 18, 74, 74, 14); g.fill(); g.fillStyle = "#fff"; g.fillRect(w - 308, y + 38, 50, 34); g.strokeStyle = "#e0352b"; g.lineWidth = 4; g.beginPath(); g.moveTo(w - 308, y + 38); g.lineTo(w - 283, y + 58); g.lineTo(w - 258, y + 38); g.stroke();
        g.fillStyle = "#2f9a4a"; for (let i = 0; i < 5; i++) { g.beginPath(); g.roundRect(w - 230 + i * 36, y + 26, 28, 56, 5); g.fill(); } if (u > 0.3) for (let i = 0; i < 3; i++) sparkle(g, w - 50 - i * 70, y + 100 + 6 * Math.sin(t * 6 + i), 14); }
    });
  }
}

/** a little lidded porcelain jar (guci): blue on white; `lid` lifts off */
export class Guci {
  group = new THREE.Group(); lid = new THREE.Group();
  constructor() {
    const tex = canvasTex(256, 128, (g) => { g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, 256, 128); g.strokeStyle = "#2d4f9e"; g.lineWidth = 4; g.beginPath(); for (let x = 0; x <= 256; x += 4) g.lineTo(x, 64 + 18 * Math.sin(x * 0.1)); g.stroke();
      for (let i = 0; i < 8; i++) { g.fillStyle = "#2d4f9e"; g.beginPath(); g.ellipse(16 + i * 32, 64 + 18 * Math.sin((16 + i * 32) * 0.1), 7, 11, 0.4, 0, Math.PI * 2); g.fill(); } g.fillRect(0, 10, 256, 5); g.fillRect(0, 112, 256, 5); });
    const por = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08 });
    const pts: THREE.Vector2[] = []; for (let i = 0; i <= 16; i++) { const v = i / 16; pts.push(new THREE.Vector2(0.03 + 0.045 * Math.sin(Math.PI * (0.15 + 0.75 * v)) + (v > 0.9 ? -0.012 : 0), v * 0.12)); }
    this.group.add(M(new THREE.LatheGeometry(pts, 32), por)); this.group.add(M(new THREE.CircleGeometry(0.03, 20), mat("#1a1206"), [0, 0.118, 0], [-Math.PI / 2, 0, 0]));
    this.lid.position.y = 0.12; this.group.add(this.lid); this.lid.add(M(new THREE.CylinderGeometry(0.036, 0.036, 0.012, 28), por, [0, 0.006, 0])); this.lid.add(M(new THREE.SphereGeometry(0.012, 14, 10), por, [0, 0.018, 0]));
  }
  /** lid open 0..1: lifts and tips back */
  open(k: number) { this.lid.position.set(0, 0.12 + 0.07 * k, -0.03 * k); this.lid.rotation.x = -0.5 * k; }
}

/** a glossy family car for the dream */
export const dreamCar = (col = "#e0303a") => {
  const G = new THREE.Group(), paint = new THREE.MeshPhysicalMaterial({ color: col, metalness: 0.4, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 }), glass = new THREE.MeshPhysicalMaterial({ color: "#20303e", roughness: 0.05, metalness: 0.2, clearcoat: 1 }), tyre = mat("#141414", { roughness: 0.8 }), rim = mat("#d0d4d8", { metalness: 1, roughness: 0.2 });
  G.add(M(rb(1.6, 0.36, 0.72, 0.12), paint, [0, 0.32, 0])); G.add(M(rb(0.9, 0.3, 0.64, 0.12), paint, [-0.1, 0.62, 0]));
  for (const s of [-1, 1]) G.add(M(new THREE.PlaneGeometry(0.78, 0.22), glass, [-0.1, 0.63, s * 0.322], [0, s > 0 ? 0 : Math.PI, 0]));
  G.add(M(new THREE.PlaneGeometry(0.58, 0.24), glass, [0.36, 0.63, 0], [0, Math.PI / 2, -0.5]));
  for (const x of [-0.5, 0.5]) for (const z of [-0.36, 0.36]) { G.add(M(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 22), tyre, [x, 0.16, z], [Math.PI / 2, 0, 0])); G.add(M(new THREE.CylinderGeometry(0.09, 0.09, 0.105, 16), rim, [x, 0.16, z], [Math.PI / 2, 0, 0])); }
  for (const z of [-0.24, 0.24]) G.add(M(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshStandardMaterial({ color: "#fff8e0", emissive: "#fff2c0", emissiveIntensity: 0.6 }), [0.8, 0.36, z]));
  return G;
};
/** a two-storey dream villa with columns and a pool */
export const dreamHouse = () => {
  const G = new THREE.Group(), wall = mat("#fbf6ec"), roof = mat("#3b4a6b", { roughness: 0.4 }), gl = new THREE.MeshPhysicalMaterial({ color: "#8fd0ff", roughness: 0.05, metalness: 0.2, emissive: "#ffd28a", emissiveIntensity: 0.25 }), gold = GOLD();
  G.add(M(new THREE.BoxGeometry(1.6, 0.6, 1.0), wall, [0, 0.3, 0])); G.add(M(new THREE.BoxGeometry(1.2, 0.5, 0.9), wall, [0.1, 0.85, 0]));
  G.add(M(new THREE.ConeGeometry(0.95, 0.4, 4), roof, [0.1, 1.3, 0], [0, Math.PI / 4, 0])); for (const x of [-0.6, -0.3, 0.3, 0.6]) G.add(M(new THREE.CylinderGeometry(0.035, 0.035, 0.6, 12), wall, [x, 0.3, 0.55]));
  for (const [x, y] of [[-0.45, 0.32], [0.45, 0.32], [-0.2, 0.85], [0.4, 0.85]] as const) G.add(M(new THREE.PlaneGeometry(0.22, 0.24), gl, [x, y, 0.505]));
  G.add(M(new THREE.BoxGeometry(1.0, 0.04, 0.5), new THREE.MeshPhysicalMaterial({ color: "#3ec5e8", roughness: 0.05, transmission: 0, emissive: "#1a6a8a", emissiveIntensity: 0.3 }), [0.1, 0.02, 0.95])); G.add(M(new THREE.SphereGeometry(0.06, 12, 8), gold, [0.1, 1.55, 0]));
  return G;
};
/** a ring in a red velvet box (lid open) */
export const ringBox = () => {
  const G = new THREE.Group(), vel = mat("#b0182a", { roughness: 0.9 });
  G.add(M(rb(0.06, 0.035, 0.06, 0.008), vel, [0, 0.0175, 0])); const lid = new THREE.Group(); lid.position.set(0, 0.035, -0.03); lid.rotation.x = -1.9; lid.add(M(rb(0.06, 0.02, 0.06, 0.008), vel, [0, 0.01, 0.03])); G.add(lid);
  G.add(M(new THREE.TorusGeometry(0.014, 0.003, 10, 28), GOLD(), [0, 0.05, 0])); G.add(M(new THREE.OctahedronGeometry(0.008), new THREE.MeshPhysicalMaterial({ color: "#eafcff", roughness: 0, metalness: 0, emissive: "#a8e8ff", emissiveIntensity: 0.6 }), [0, 0.067, 0]));
  return G;
};
/** a thin envelope (the reward) */
export const envelope = () => { const G = new THREE.Group(), pap = mat("#f0e6cc", { roughness: 0.8 }); G.add(M(new THREE.BoxGeometry(0.16, 0.09, 0.004), pap)); const f = M(new THREE.PlaneGeometry(0.16, 0.05), mat("#e4d6b4", { side: THREE.DoubleSide }), [0, 0.02, 0.0025], [0.1, 0, 0]); G.add(f); return G; };
/** handcuffs: two rings and a short chain */
export const handcuffs = () => { const G = new THREE.Group(), st = mat("#c8ccd2", { metalness: 1, roughness: 0.18 }); for (const x of [-0.05, 0.05]) G.add(M(new THREE.TorusGeometry(0.03, 0.006, 10, 24), st, [x, 0, 0])); for (let i = 0; i < 3; i++) G.add(M(new THREE.TorusGeometry(0.006, 0.0018, 6, 12), st, [-0.016 + i * 0.016, 0, 0], [0, i % 2 ? Math.PI / 2 : 0, 0])); return G; };
/** a jeweller's digital scale whose display shows `value` in seven-segment digits */
export class GoldScale {
  group = new THREE.Group(); disp = new LiveTex(256, 96); pan: THREE.Mesh;
  constructor() {
    this.group.add(M(rb(0.16, 0.035, 0.2, 0.01), mat("#2a2c30", { metalness: 0.4, roughness: 0.35 }), [0, 0.0175, 0]));
    this.pan = M(new THREE.CylinderGeometry(0.06, 0.06, 0.006, 32), mat("#d8dce0", { metalness: 1, roughness: 0.15 }), [0, 0.04, -0.02]); this.group.add(this.pan);
    const s = M(new THREE.PlaneGeometry(0.1, 0.035), new THREE.MeshBasicMaterial({ map: this.disp.tex, toneMapped: false }), [0, 0.0412, 0.071], [-Math.PI / 2 + 0.25, 0, 0]); s.castShadow = false; this.group.add(s);
  }
  show(v: string) { this.disp.draw(v, (g, w, h) => { g.fillStyle = "#0e1a10"; g.fillRect(0, 0, w, h); const segs: Record<string, number[]> = { "0": [1, 1, 1, 0, 1, 1, 1], "1": [0, 0, 1, 0, 0, 1, 0], "2": [1, 0, 1, 1, 1, 0, 1], "3": [1, 0, 1, 1, 0, 1, 1], "4": [0, 1, 1, 1, 0, 1, 0], "5": [1, 1, 0, 1, 0, 1, 1], "6": [1, 1, 0, 1, 1, 1, 1], "7": [1, 0, 1, 0, 0, 1, 0], "8": [1, 1, 1, 1, 1, 1, 1], "9": [1, 1, 1, 1, 0, 1, 1] };
    let x = 30; g.fillStyle = "#7dff8a"; for (const ch of v) { if (ch === ".") { g.fillRect(x - 6, 76, 9, 9); x += 10; continue; } const s = segs[ch]; if (!s) { x += 40; continue; } const W = 34, H2 = 30, T = 7, y = 16;
      const bars: [number, number, number, number][] = [[x, y, W, T], [x - T / 2, y, T, H2], [x + W - T / 2, y, T, H2], [x, y + H2, W, T], [x - T / 2, y + H2, T, H2], [x + W - T / 2, y + H2, T, H2], [x, y + 2 * H2, W, T]]; bars.forEach((b, i) => { if (s[i]) g.fillRect(...b); }); x += 52; } }); }
}
/** a wall/table clock whose hands can be spun */
export class Clock {
  group = new THREE.Group(); hour = new THREE.Group(); min = new THREE.Group();
  constructor(r = 0.18, rimCol = "#e0352b") {
    this.group.add(M(new THREE.CylinderGeometry(r, r, 0.03, 40), mat(rimCol, { roughness: 0.4 }), [0, 0, 0], [Math.PI / 2, 0, 0]));
    const face = canvasTex(256, 256, (g) => { g.fillStyle = "#fffdf6"; g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.fill(); g.fillStyle = "#2a2a2a"; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.beginPath(); g.arc(128 + 100 * Math.sin(a), 128 - 100 * Math.cos(a), i % 3 ? 5 : 9, 0, Math.PI * 2); g.fill(); } });
    this.group.add(M(new THREE.CircleGeometry(r * 0.9, 40), new THREE.MeshStandardMaterial({ map: face, roughness: 0.5 }), [0, 0, 0.016]));
    this.hour.add(M(new THREE.BoxGeometry(r * 0.08, r * 0.5, 0.004), mat("#222"), [0, r * 0.22, 0])); this.min.add(M(new THREE.BoxGeometry(r * 0.05, r * 0.75, 0.004), mat("#222"), [0, r * 0.34, 0]));
    this.hour.position.z = 0.02; this.min.position.z = 0.024; this.group.add(this.hour, this.min);
  }
  set(hours: number) { this.hour.rotation.z = -(hours / 12) * Math.PI * 2; this.min.rotation.z = -(hours % 1) * Math.PI * 2; }
}
/** a stack of banknotes (red 100k-style notes, a paper band) */
export const cashStack = (n = 10) => { const G = new THREE.Group(), note = mat("#d8697a", { roughness: 0.7 }), band = mat("#f4f1ea"); for (let i = 0; i < n; i++) G.add(M(new THREE.BoxGeometry(0.15, 0.002, 0.07), note, [(rnd() - 0.5) * 0.004, i * 0.0022, (rnd() - 0.5) * 0.003])); G.add(M(new THREE.BoxGeometry(0.03, n * 0.0022 + 0.002, 0.072), band, [0, n * 0.0011, 0])); return G; };
/** a puffy 3D thought cloud */
export const cloud3D = (w = 1, col = "#ffffff") => { const G = new THREE.Group(), m = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.6, transparent: true, opacity: 0.92, emissive: "#c8d4ff", emissiveIntensity: 0.25 });
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; G.add(M(new THREE.SphereGeometry(0.22 * w * (0.8 + 0.3 * Math.sin(i * 2.3)), 20, 14), m, [Math.cos(a) * 0.42 * w, Math.sin(a) * 0.22 * w, (i % 3) * 0.03 * w])); }
  G.add(M(new THREE.SphereGeometry(0.34 * w, 24, 16), m)); G.traverse((k) => { (k as THREE.Mesh).castShadow = false; }); return G; };
