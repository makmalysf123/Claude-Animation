// Props for "Kopi Mahal": the two cups (a cheap fluted glass and a fancy ceramic cup with saucer), a 3-in-1 sachet
// that pours, a phone with a group chat, boxes of new cups, and the 2D things drawn on the cards (chalk, glasses,
// notebook, tie, the warm "pleasure light" inside a head, gossip bubbles).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { canvasTex, LiveTex } from "../ketindihan2/sets";
import { OUTLINE } from "../../lib/toon2";
import { hash } from "../../lib/acting";

const mat = (c: string, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });
const M = (geo: THREE.BufferGeometry, m: THREE.Material, p: [number, number, number] = [0, 0, 0], r: [number, number, number] = [0, 0, 0]) => { const k = new THREE.Mesh(geo, m); k.position.set(...p); k.rotation.set(...r); k.castShadow = k.receiveShadow = true; return k; };
const puffTex = canvasTex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,0.6)"); gr.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); });

/** a coffee cup with steam. kind "glass": cheap fluted glass (gelas belimbing) on a small plastic saucer;
 *  kind "ceramic": white glossy cup, gold rim, saucer. Origin = bottom centre (sits on a table or in a hand). */
export class CoffeeCup {
  group = new THREE.Group(); /** the saucer is separate so the cup can be lifted off it */ saucer = new THREE.Group(); coffee: THREE.Mesh; private steam: THREE.Points; private base: Float32Array; topY: number;
  constructor(public kind: "glass" | "ceramic", full = true) {
    const G = this.group;
    if (kind === "glass") {
      const pts: THREE.Vector2[] = []; for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(new THREE.Vector2(0.026 + 0.012 * u, u * 0.095)); }
      const lathe = new THREE.LatheGeometry(pts, 12); // 12 flat facets = fluted
      const gm = new THREE.MeshPhysicalMaterial({ color: "#eef6f4", roughness: 0.05, transparent: true, opacity: 0.28, clearcoat: 1, side: THREE.DoubleSide, flatShading: true });
      const g = M(lathe, gm); g.castShadow = false; g.renderOrder = 6; G.add(g);
      G.add(M(new THREE.CylinderGeometry(0.027, 0.027, 0.006, 24), new THREE.MeshPhysicalMaterial({ color: "#eef6f4", roughness: 0.1, transparent: true, opacity: 0.5 }), [0, 0.003, 0]));
      const liquid = M(new THREE.CylinderGeometry(0.035, 0.026, 0.078, 24), new THREE.MeshPhysicalMaterial({ color: "#2a140a", roughness: 0.08, clearcoat: 1 }), [0, 0.042, 0]); G.add(liquid);
      this.coffee = M(new THREE.CircleGeometry(0.0355, 24), new THREE.MeshPhysicalMaterial({ color: "#3a1c0c", roughness: 0.05, clearcoat: 1 }), [0, 0.0815, 0], [-Math.PI / 2, 0, 0]); G.add(this.coffee); this.topY = 0.095;
      const sc = M(new THREE.CylinderGeometry(0.062, 0.05, 0.008, 28), mat("#2f8f6f", { roughness: 0.4 }), [0, -0.004, 0]); this.saucer.add(sc);
    } else {
      const pts: THREE.Vector2[] = []; for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push(new THREE.Vector2(0.024 + 0.022 * Math.sin(u * Math.PI * 0.55) + 0.004 * u, u * 0.07)); }
      const cm = new THREE.MeshPhysicalMaterial({ color: "#fbfaf6", roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide });
      G.add(M(new THREE.LatheGeometry(pts, 40), cm));
      G.add(M(new THREE.TorusGeometry(0.05, 0.0018, 8, 48), mat("#d8b45a", { metalness: 1, roughness: 0.22 }), [0, 0.07, 0], [Math.PI / 2, 0, 0]));
      const handle = M(new THREE.TorusGeometry(0.017, 0.0045, 10, 24, Math.PI * 1.2), cm, [0.054, 0.038, 0], [0, 0, -Math.PI * 0.6]); G.add(handle);
      this.coffee = M(new THREE.CircleGeometry(0.046, 32), new THREE.MeshPhysicalMaterial({ color: "#3a1c0c", roughness: 0.05, clearcoat: 1 }), [0, 0.06, 0], [-Math.PI / 2, 0, 0]); G.add(this.coffee); this.topY = 0.07;
      const sp: THREE.Vector2[] = [new THREE.Vector2(0, 0), new THREE.Vector2(0.075, 0.002), new THREE.Vector2(0.088, 0.009), new THREE.Vector2(0.09, 0.012)];
      this.saucer.add(M(new THREE.LatheGeometry(sp, 40), cm, [0, -0.012, 0])); this.saucer.add(M(new THREE.TorusGeometry(0.089, 0.0014, 6, 48), mat("#d8b45a", { metalness: 1, roughness: 0.22 }), [0, 0.0, 0], [Math.PI / 2, 0, 0]));
      // a crema swirl on the surface
      (this.coffee.material as THREE.MeshPhysicalMaterial).map = canvasTex(128, 128, (g) => { g.fillStyle = "#4a240f"; g.fillRect(0, 0, 128, 128); g.strokeStyle = "rgba(196,140,80,0.7)"; g.lineWidth = 5; g.beginPath(); for (let a = 0; a < 14; a += 0.1) g.lineTo(64 + a * 3.6 * Math.cos(a), 64 + a * 3.6 * Math.sin(a)); g.stroke(); });
    }
    this.coffee.visible = full;
    const n = 16, pos = new Float32Array(n * 3); this.base = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { this.base[i * 3] = (hash(i + 2) - 0.5) * 0.05; this.base[i * 3 + 1] = hash(i + 7); this.base[i * 3 + 2] = (hash(i + 5) - 0.5) * 0.05; }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.steam = new THREE.Points(g, new THREE.PointsMaterial({ map: puffTex, size: 0.07, transparent: true, opacity: 0.16, depthWrite: false })); this.steam.renderOrder = 7; G.add(this.steam);
    G.traverse((k) => { if ((k as THREE.Mesh).isMesh && k !== this.steam) k.castShadow = true; });
  }
  update(t: number, steam = 1) {
    const p = this.steam.geometry.attributes.position as THREE.BufferAttribute, a = p.array as Float32Array;
    for (let i = 0; i < a.length / 3; i++) { const u = (this.base[i * 3 + 1] + t * 0.3) % 1; a[i * 3] = this.base[i * 3] * (1 + 2.5 * u) + 0.012 * Math.sin(t * 2.2 + i); a[i * 3 + 1] = this.topY + u * 0.2; a[i * 3 + 2] = this.base[i * 3 + 2] * (1 + 2.5 * u); }
    p.needsUpdate = true; (this.steam.material as THREE.PointsMaterial).opacity = 0.16 * steam; this.steam.visible = steam > 0.01;
  }
}

/** a 3-in-1 sachet (our own "KOPI JAYA" brand); `tear` 0..1 rips the top strip off, `pour` 0..1 streams the powder */
export class Sachet {
  group = new THREE.Group(); private strip: THREE.Mesh; private stream: THREE.Points;
  static tex = canvasTex(256, 400, (g) => {
    const gr = g.createLinearGradient(0, 0, 256, 400); gr.addColorStop(0, "#8a3f1c"); gr.addColorStop(1, "#4e1f0c"); g.fillStyle = gr; g.fillRect(0, 0, 256, 400);
    g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(0, 0, 256, 40); g.fillStyle = "#f2c94c"; g.fillRect(0, 300, 256, 22);
    g.fillStyle = "#fff"; g.font = "bold 46px Arial"; g.textAlign = "center"; g.fillText("KOPI", 128, 120); g.fillText("JAYA", 128, 170); g.font = "bold 30px Arial"; g.fillStyle = "#f2c94c"; g.fillText("3 in 1", 128, 220);
    g.fillStyle = "#2a120a"; g.beginPath(); g.ellipse(128, 262, 40, 22, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#fff"; g.font = "20px Arial"; g.fillText("Rp 1.500", 128, 372);
    g.strokeStyle = "rgba(0,0,0,0.3)"; g.setLineDash([6, 4]); g.lineWidth = 3; g.beginPath(); g.moveTo(0, 40); g.lineTo(256, 40); g.stroke();
  });
  constructor() {
    const m = new THREE.MeshStandardMaterial({ map: Sachet.tex, roughness: 0.35, metalness: 0.2 });
    const body = M(new RoundedBoxGeometry(0.07, 0.1, 0.006, 2, 0.002), m); this.group.add(body);
    this.strip = M(new THREE.BoxGeometry(0.07, 0.011, 0.006), mat("#7a3518", { roughness: 0.35, metalness: 0.2 }), [0, 0.0555, 0]); this.group.add(this.strip);
    const n = 160, pos = new Float32Array(n * 3); const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const dot = canvasTex(16, 16, (c) => { c.fillStyle = "#6a3a1c"; c.beginPath(); c.arc(8, 8, 7, 0, Math.PI * 2); c.fill(); });
    this.stream = new THREE.Points(g, new THREE.PointsMaterial({ map: dot, size: 0.006, transparent: true, alphaTest: 0.3 })); this.stream.visible = false;
  }
  /** world-space powder stream from the sachet mouth down to `to` */
  attachStream(parent: THREE.Object3D) { parent.add(this.stream); }
  update(t: number, tear: number, pour: number, mouth: THREE.Vector3, to: THREE.Vector3) {
    this.strip.position.set(tear * 0.03, 0.0555 + tear * 0.04, 0); this.strip.rotation.z = -tear * 1.2; this.strip.visible = tear < 0.98;
    this.stream.visible = pour > 0.01; if (!this.stream.visible) return;
    const p = this.stream.geometry.attributes.position as THREE.BufferAttribute, a = p.array as Float32Array, n = a.length / 3;
    for (let i = 0; i < n; i++) { const u = (hash(i) + t * 2.2) % 1, k = u * pour; a[i * 3] = mouth.x + (to.x - mouth.x) * k + (hash(i * 3) - 0.5) * 0.006; a[i * 3 + 1] = mouth.y + (to.y - mouth.y) * k; a[i * 3 + 2] = mouth.z + (to.z - mouth.z) * k + (hash(i * 5) - 0.5) * 0.006; }
    p.needsUpdate = true;
  }
}

/** a phone: body + live screen (group chat) */
export class Phone {
  group = new THREE.Group(); screen = new LiveTex(360, 760);
  constructor() {
    const fr = mat("#2b2e35", { metalness: 0.8, roughness: 0.3 });
    this.group.add(M(new RoundedBoxGeometry(0.075, 0.156, 0.009, 4, 0.009), fr));
    const s = M(new THREE.PlaneGeometry(0.068, 0.148), new THREE.MeshBasicMaterial({ map: this.screen.tex, toneMapped: false }), [0, 0, 0.0047]); s.castShadow = false; this.group.add(s);
    const back = M(new THREE.PlaneGeometry(0.07, 0.15), mat("#d9d4cc", { roughness: 0.25, metalness: 0.2 }), [0, 0, -0.0047], [0, Math.PI, 0]); this.group.add(back);
    for (const [x, y] of [[-0.022, 0.06], [-0.022, 0.044]] as [number, number][]) this.group.add(M(new THREE.CylinderGeometry(0.0055, 0.0055, 0.003, 18), mat("#111", { roughness: 0.05, metalness: 0.5 }), [x, y, -0.0058], [Math.PI / 2, 0, 0]));
  }
  /** mode "camera": viewfinder of the menu board; mode "chat": the group message with the photo, n laughs */
  draw(mode: "camera" | "chat", t: number, menu: HTMLCanvasElement) {
    const k = mode === "chat" ? "c" + Math.min(4, Math.floor(t * 3)) : "v" + Math.floor(t * 2);
    this.screen.draw(k, (g, w, h) => {
      if (mode === "camera") { g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.drawImage(menu, 20, 120, w - 40, w - 40); g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 2; for (const f of [1 / 3, 2 / 3]) { g.beginPath(); g.moveTo(20 + (w - 40) * f, 120); g.lineTo(20 + (w - 40) * f, 120 + w - 40); g.stroke(); g.beginPath(); g.moveTo(20, 120 + (w - 40) * f); g.lineTo(w - 20, 120 + (w - 40) * f); g.stroke(); }
        g.fillStyle = "#fff"; g.beginPath(); g.arc(w / 2, h - 90, 34, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 4; g.beginPath(); g.arc(w / 2, h - 90, 42, 0, Math.PI * 2); g.stroke(); return; }
      g.fillStyle = "#ece5dd"; g.fillRect(0, 0, w, h); g.fillStyle = "#1f6f5c"; g.fillRect(0, 0, w, 96); g.fillStyle = "#fff"; g.font = "bold 26px Arial"; g.fillText("Barista Sekecamatan", 22, 62);
      g.fillStyle = "#fff"; g.beginPath(); g.roundRect(18, 120, w - 70, 380, 14); g.fill(); g.drawImage(menu, 28, 130, w - 90, w - 90); g.fillStyle = "#111"; g.font = "bold 22px Arial";
      g.fillText("Warung paling halu", 30, 150 + w - 80); g.fillText("sekecamatan", 30, 178 + w - 80);
      const n = Math.min(4, Math.floor(t * 3)); for (let i = 0; i < n; i++) { const y = 530 + i * 56, right = i % 2 === 0; g.fillStyle = right ? "#dcf8c6" : "#fff"; g.beginPath(); g.roundRect(right ? w - 210 : 18, y, 190, 44, 12); g.fill(); g.fillStyle = "#222"; g.font = "bold 22px Arial"; g.fillText(["wkwkwk", "HAHAHA", "halu parah", "50 ribu??"][i], (right ? w - 196 : 32), y + 30); }
    });
  }
}

/** a stack of cardboard boxes of new cups */
export const cupBoxes = () => {
  const G = new THREE.Group(); const tex = canvasTex(256, 192, (g) => { g.fillStyle = "#c79a5e"; g.fillRect(0, 0, 256, 192); g.fillStyle = "#3a2410"; g.font = "bold 30px Arial"; g.textAlign = "center"; g.fillText("CANGKIR", 128, 70); g.fillText("KERAMIK", 128, 106); g.font = "bold 26px Arial"; g.fillText("isi 12", 128, 150); g.strokeStyle = "#3a2410"; g.lineWidth = 3; g.strokeRect(10, 10, 236, 172); });
  const box = mat("#c79a5e", { roughness: 0.9 }), lab = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
  [[0, 0.15, 0, 0.05], [0.42, 0.15, 0.02, -0.08], [0.2, 0.45, 0.01, 0.12]].forEach(([x, y, z, r]) => { const b = M(new THREE.BoxGeometry(0.4, 0.3, 0.32), [box, box, box, box, lab, box] as unknown as THREE.Material, [x, y, z], [0, r, 0]); G.add(b); G.add(M(new THREE.BoxGeometry(0.41, 0.03, 0.06), mat("#c9b98a", { roughness: 0.4 }), [x, y + 0.15, z], [0, r, 0])); });
  return G;
};

// ---------------- 2D, drawn on the character cards ----------------
/** the warm "pleasure light" inside a head: k 0..1 */
export const drawHeadGlow = (g: CanvasRenderingContext2D, cx: number, cy: number, R: number, k: number, t: number) => {
  if (k <= 0.01) return;
  const fl = 1 + 0.05 * Math.sin(t * 9);
  g.save(); g.globalCompositeOperation = "source-atop";
  const gr = g.createRadialGradient(cx, cy - R * 0.25, 0, cx, cy - R * 0.25, R * 0.95 * fl);
  gr.addColorStop(0, `rgba(255,236,170,${0.75 * k})`); gr.addColorStop(0.35, `rgba(255,190,90,${0.42 * k})`); gr.addColorStop(1, "rgba(255,150,40,0)");
  g.fillStyle = gr; g.fillRect(cx - R * 2, cy - R * 2, R * 4, R * 4); g.restore();
  // a soft halo just outside the outline + a few sparkles
  g.save(); g.globalCompositeOperation = "destination-over"; const h = g.createRadialGradient(cx, cy - R * 0.2, R * 0.9, cx, cy - R * 0.2, R * 1.6); h.addColorStop(0, `rgba(255,200,110,${0.35 * k})`); h.addColorStop(1, "rgba(255,200,110,0)"); g.fillStyle = h; g.fillRect(cx - R * 2, cy - R * 2, R * 4, R * 4); g.restore();
  g.save(); for (let i = 0; i < 4; i++) { const a = t * 1.3 + i * 1.57, r = R * (1.15 + 0.1 * Math.sin(t * 3 + i)), x = cx + r * Math.cos(a), y = cy - R * 0.2 + r * Math.sin(a) * 0.8, s = R * 0.07 * k * (0.6 + 0.4 * Math.sin(t * 7 + i));
    g.fillStyle = `rgba(255,236,170,${0.9 * k})`; g.beginPath(); g.moveTo(x, y - s * 2); g.lineTo(x + s * 0.5, y - s * 0.5); g.lineTo(x + s * 2, y); g.lineTo(x + s * 0.5, y + s * 0.5); g.lineTo(x, y + s * 2); g.lineTo(x - s * 0.5, y + s * 0.5); g.lineTo(x - s * 2, y); g.lineTo(x - s * 0.5, y - s * 0.5); g.fill(); } g.restore();
};
/** round glasses over the eyes */
export const drawGlasses = (g: CanvasRenderingContext2D, cx: number, cy: number, R: number, rot = 0) => {
  g.save(); g.translate(cx, cy); g.rotate(rot); g.strokeStyle = OUTLINE; g.lineWidth = R * 0.06; g.fillStyle = "rgba(200,225,240,0.22)";
  for (const s of [-1, 1]) { g.beginPath(); g.arc(s * R * 0.36, -R * 0.02, R * 0.25, 0, Math.PI * 2); g.fill(); g.stroke(); g.save(); g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = R * 0.03; g.beginPath(); g.arc(s * R * 0.36, -R * 0.02, R * 0.17, -2.4, -1.7); g.stroke(); g.restore(); }
  g.beginPath(); g.moveTo(-R * 0.11, -R * 0.06); g.quadraticCurveTo(0, -R * 0.13, R * 0.11, -R * 0.06); g.stroke(); g.restore();
};
/** a loosened tie on a shirt front */
export const drawTie = (g: CanvasRenderingContext2D, x: number, top: number, len: number) => {
  g.save(); g.fillStyle = "#b8323a"; g.strokeStyle = OUTLINE; g.lineWidth = 5; g.lineJoin = "round";
  g.beginPath(); g.moveTo(x - 14, top); g.lineTo(x + 14, top); g.lineTo(x + 9, top + 22); g.lineTo(x - 9, top + 22); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(x - 9, top + 22); g.lineTo(x + 9, top + 22); g.lineTo(x + 20, top + len - 22); g.lineTo(x + 4, top + len); g.lineTo(x - 10, top + len - 20); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.25)"; g.lineWidth = 4; for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(x - 8 + i * 2, top + 22 + i * (len / 6)); g.lineTo(x + 14, top + 10 + i * (len / 6)); g.stroke(); } g.restore();
};
/** a stick of chalk at the hand */
export const drawChalk = (g: CanvasRenderingContext2D, x: number, y: number, ang: number) => { g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = "#f6f3ea"; g.strokeStyle = OUTLINE; g.lineWidth = 4; g.beginPath(); g.roundRect(-6, -40, 12, 44, 3); g.fill(); g.stroke(); g.restore(); };
/** a little notebook held at the hand, `stars` 0..5 written in */
export const drawNotebook = (g: CanvasRenderingContext2D, x: number, y: number, stars: number) => {
  g.save(); g.translate(x, y - 40); g.rotate(-0.12); g.fillStyle = "#f3eedf"; g.strokeStyle = OUTLINE; g.lineWidth = 5; g.beginPath(); g.roundRect(-46, -58, 92, 116, 6); g.fill(); g.stroke();
  g.strokeStyle = "rgba(43,26,38,0.25)"; g.lineWidth = 2; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-36, -26 + i * 18); g.lineTo(36, -26 + i * 18); g.stroke(); }
  g.fillStyle = "#e0a419"; for (let i = 0; i < Math.floor(stars); i++) { const sx = -34 + i * 17, sy = -42; g.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 3.5 : 8, a = -Math.PI / 2 + k * Math.PI / 5; g.lineTo(sx + r * Math.cos(a), sy + r * Math.sin(a)); } g.fill(); }
  g.restore();
};
/** a gossip thought bubble above a head, with a smiling mask inside (= "they're just pretending") */
export const drawMaskBubble = (g: CanvasRenderingContext2D, cx: number, cy: number, k: number) => {
  if (k <= 0.01) return; g.save(); g.translate(cx, cy); g.scale(k, k); g.fillStyle = "#fffdf6"; g.strokeStyle = OUTLINE; g.lineWidth = 6;
  for (const [x, y, r] of [[-60, 90, 10], [-40, 60, 16]] as [number, number, number][]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke(); }
  g.beginPath(); g.ellipse(0, 0, 92, 62, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = "#f2d16b"; g.beginPath(); g.ellipse(0, 0, 48, 40, 0, 0, Math.PI * 2); g.fill(); g.lineWidth = 4; g.stroke();
  g.fillStyle = OUTLINE; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 18, -8, 9, 6, 0, 0, Math.PI * 2); g.fill(); }
  g.lineWidth = 5; g.beginPath(); g.arc(0, 6, 22, 0.2, Math.PI - 0.2); g.stroke(); g.lineWidth = 3; g.beginPath(); g.moveTo(48, 0); g.lineTo(70, -14); g.stroke();
  g.restore();
};
