// 3D props for "Gaji Naik": banknotes (our own design, not a real note), an instant-noodle bowl with steam, a
// treadmill with a live display, a wall calendar for the end of the month, and 2D hand props drawn on the cards.
import * as THREE from "three";
import { canvasTex, LiveTex } from "../ketindihan2/sets";
import { OUTLINE } from "../../lib/toon2";
import { hash } from "../../lib/acting";

const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, p: [number, number, number] = [0, 0, 0], r: [number, number, number] = [0, 0, 0], cast = true) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.rotation.set(...r); m.castShadow = cast; m.receiveShadow = true; return m;
};

// ---------------- banknotes ----------------
/** a pink-red "100.000" note: our own design (guilloche lines, a jasmine emblem, no faces, no real note copied) */
let billTexC: THREE.Texture | null = null;
export const billTex = () => billTexC ??= canvasTex(512, 240, (g) => {
  const gr = g.createLinearGradient(0, 0, 512, 240); gr.addColorStop(0, "#f2b3b8"); gr.addColorStop(0.5, "#e47f8c"); gr.addColorStop(1, "#d8697a");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 240);
  g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 1.2; for (let i = 0; i < 26; i++) { g.beginPath(); for (let x = 0; x <= 512; x += 8) g.lineTo(x, 20 + i * 8 + 6 * Math.sin(x * 0.04 + i)); g.stroke(); }
  g.strokeStyle = "#9c2f45"; g.lineWidth = 6; g.strokeRect(10, 10, 492, 220); g.lineWidth = 2; g.strokeRect(20, 20, 472, 200);
  g.fillStyle = "rgba(255,245,240,0.85)"; g.beginPath(); g.ellipse(380, 120, 70, 82, 0, 0, Math.PI * 2); g.fill(); // watermark window
  g.fillStyle = "#b23a52"; for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; g.beginPath(); g.ellipse(380 + 26 * Math.cos(a), 120 + 26 * Math.sin(a), 20, 11, a, 0, Math.PI * 2); g.fill(); } // jasmine emblem
  g.fillStyle = "#f7d36a"; g.beginPath(); g.arc(380, 120, 12, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#7d1f36"; g.font = "bold 64px 'Helvetica Neue', Arial"; g.fillText("100.000", 40, 92); g.font = "bold 30px 'Helvetica Neue', Arial"; g.fillText("RUPIAH", 44, 196);
  g.fillStyle = "rgba(125,31,54,0.5)"; g.fillRect(40, 118, 210, 6); g.fillRect(40, 134, 170, 6);
});
/** a slightly curled note (subdivided so it can bend) */
const billGeo = (() => { const g = new THREE.PlaneGeometry(0.151, 0.071, 8, 2); const p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) p.setZ(i, 0.012 * Math.sin((p.getX(i) / 0.151 + 0.5) * Math.PI)); g.computeVertexNormals(); return g; })();
/** two one-sided faces back to back, so the print reads correctly (not mirrored) from both sides */
export const makeBill = () => { const mat = new THREE.MeshStandardMaterial({ map: billTex(), roughness: 0.62 }); const m = mesh(billGeo, mat); const back = mesh(billGeo, mat); back.rotation.y = Math.PI; m.add(back); return m; };

/** a rain of notes: each falls with flutter from its own height and lands flat on the ground (never through it) */
export class BillRain {
  group = new THREE.Group(); bills: { m: THREE.Mesh; p: THREE.Vector3; v: number; ph: number; spin: number; ground: number }[] = [];
  constructor(n: number, box: { x: [number, number]; y: [number, number]; z: [number, number] }, groundY = 0, seed = 1) {
    for (let i = 0; i < n; i++) {
      const r = (k: number) => hash(seed * 97 + i * 13 + k);
      const m = makeBill(); this.group.add(m);
      this.bills.push({ m, p: new THREE.Vector3(box.x[0] + r(1) * (box.x[1] - box.x[0]), box.y[0] + r(2) * (box.y[1] - box.y[0]), box.z[0] + r(3) * (box.z[1] - box.z[0])), v: 0.45 + 0.35 * r(4), ph: r(5) * 6.28, spin: (r(6) - 0.5) * 5, ground: groundY + 0.002 + 0.004 * r(7) });
    }
  }
  update(t: number) {
    for (const b of this.bills) {
      const y = b.p.y - b.v * t, landed = y <= b.ground + 0.04;
      if (landed) { const tl = (b.p.y - b.ground - 0.04) / b.v; b.m.position.set(b.p.x + 0.18 * Math.sin(tl * 2.2 + b.ph), b.ground, b.p.z + 0.1 * Math.cos(tl * 1.7 + b.ph)); b.m.rotation.set(-Math.PI / 2, 0, b.ph); b.m.scale.set(1, 1, 0.3); continue; }
      b.m.position.set(b.p.x + 0.18 * Math.sin(t * 2.2 + b.ph), y, b.p.z + 0.1 * Math.cos(t * 1.7 + b.ph));
      b.m.rotation.set(0.9 * Math.sin(t * 3.1 + b.ph), b.ph + b.spin * t, 0.6 * Math.sin(t * 2.6 + b.ph * 2)); b.m.scale.set(1, 1, 1);
    }
  }
}

// ---------------- instant noodle bowl ----------------
const noodleTex = () => canvasTex(256, 256, (g) => {
  g.fillStyle = "#c98a2e"; g.fillRect(0, 0, 256, 256); // broth
  for (let i = 0; i < 70; i++) { g.strokeStyle = i % 3 ? "#f3cf6e" : "#e6b54c"; g.lineWidth = 6; g.beginPath(); let x = hash(i) * 256, y = hash(i + 50) * 256; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (hash(i * 7 + k) - 0.5) * 70; y += (hash(i * 11 + k) - 0.5) * 70; g.quadraticCurveTo(x + 20, y - 20, x, y); } g.stroke(); }
  g.fillStyle = "#4f9a3a"; for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(hash(i * 3) * 256, hash(i * 5) * 256, 6, 4, hash(i) * 3, 0, Math.PI * 2); g.fill(); } // spring onion
  g.fillStyle = "#b8452e"; for (let i = 0; i < 18; i++) { g.beginPath(); g.arc(hash(i * 17) * 256, hash(i * 19) * 256, 3, 0, Math.PI * 2); g.fill(); } // chilli flakes
});
export class NoodleBowl {
  group = new THREE.Group(); private steam: THREE.Points; private base: Float32Array;
  constructor() {
    const pts: THREE.Vector2[] = []; for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push(new THREE.Vector2(0.035 + 0.055 * Math.sin(u * Math.PI * 0.5) + (u > 0.93 ? 0.004 : 0), u * 0.07)); }
    const bowlM = new THREE.MeshPhysicalMaterial({ color: "#f6f3ec", roughness: 0.25, clearcoat: 0.6, side: THREE.DoubleSide });
    const bowl = mesh(new THREE.LatheGeometry(pts, 40), bowlM); this.group.add(bowl);
    const rim = mesh(new THREE.TorusGeometry(0.0905, 0.0035, 8, 48), new THREE.MeshStandardMaterial({ color: "#c0392b", roughness: 0.4 }), [0, 0.07, 0], [Math.PI / 2, 0, 0]); this.group.add(rim);
    const band = mesh(new THREE.CylinderGeometry(0.083, 0.07, 0.012, 40, 1, true), new THREE.MeshStandardMaterial({ color: "#2f6fb0", roughness: 0.4, side: THREE.DoubleSide }), [0, 0.045, 0]); this.group.add(band);
    const soup = mesh(new THREE.CircleGeometry(0.084, 40), new THREE.MeshPhysicalMaterial({ map: noodleTex(), roughness: 0.18, clearcoat: 0.8 }), [0, 0.06, 0], [-Math.PI / 2, 0, 0], false); this.group.add(soup);
    const egg = new THREE.Group(); egg.position.set(0.025, 0.063, 0.01);
    egg.add(mesh(new THREE.SphereGeometry(0.026, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: "#fbfaf4", roughness: 0.3, clearcoat: 0.5 }), [0, 0, 0], [0, 0, 0]));
    egg.add(mesh(new THREE.SphereGeometry(0.012, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: "#f2a91e", roughness: 0.2, clearcoat: 1 }), [0, 0.012, 0])); egg.scale.set(1, 0.55, 1); this.group.add(egg);
    // steam: soft puffs that rise, widen and fade
    const n = 70, pos = new Float32Array(n * 3); this.base = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { this.base[i * 3] = (hash(i) - 0.5) * 0.1; this.base[i * 3 + 1] = hash(i + 9); this.base[i * 3 + 2] = (hash(i + 3) - 0.5) * 0.1; }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const puff = canvasTex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); });
    this.steam = new THREE.Points(g, new THREE.PointsMaterial({ map: puff, size: 0.05, transparent: true, opacity: 0.3, depthWrite: false, sizeAttenuation: true })); this.steam.renderOrder = 3; this.group.add(this.steam);
  }
  update(t: number) {
    const p = (this.steam.geometry.attributes.position as THREE.BufferAttribute), a = p.array as Float32Array;
    for (let i = 0; i < a.length / 3; i++) { const u = (this.base[i * 3 + 1] + t * 0.35) % 1; a[i * 3] = this.base[i * 3] * (1 + 2 * u) + 0.03 * Math.sin(t * 2 + i); a[i * 3 + 1] = 0.08 + u * 0.32; a[i * 3 + 2] = this.base[i * 3 + 2] * (1 + 2 * u); }
    p.needsUpdate = true;
  }
}

// ---------------- treadmill ----------------
export class Treadmill {
  group = new THREE.Group(); belt: THREE.Texture; screen = new LiveTex(512, 256);
  constructor() {
    const G = this.group, plastic = new THREE.MeshPhysicalMaterial({ color: "#2a2d33", roughness: 0.45, clearcoat: 0.3 }), metal = new THREE.MeshStandardMaterial({ color: "#b9bec6", metalness: 1, roughness: 0.28 });
    const accent = new THREE.MeshStandardMaterial({ color: "#e0782a", roughness: 0.4 });
    G.add(mesh(new THREE.BoxGeometry(0.82, 0.14, 1.9), plastic, [0, 0.09, 0]));
    for (const s of [-1, 1]) { G.add(mesh(new THREE.BoxGeometry(0.09, 0.025, 1.86), metal, [s * 0.365, 0.172, 0])); G.add(mesh(new THREE.BoxGeometry(0.012, 0.05, 1.7), accent, [s * 0.414, 0.11, 0])); }
    this.belt = canvasTex(64, 512, (g) => { g.fillStyle = "#1b1c1f"; g.fillRect(0, 0, 64, 512); for (let y = 0; y < 512; y += 8) { g.fillStyle = y % 16 ? "#24262a" : "#16171a"; g.fillRect(0, y, 64, 4); } });
    this.belt.wrapS = this.belt.wrapT = THREE.RepeatWrapping; this.belt.repeat.set(1, 3);
    G.add(mesh(new THREE.PlaneGeometry(0.62, 1.84), new THREE.MeshStandardMaterial({ map: this.belt, roughness: 0.85 }), [0, 0.162, 0], [-Math.PI / 2, 0, 0], false));
    G.add(mesh(new THREE.BoxGeometry(0.82, 0.2, 0.3), plastic, [0, 0.14, 0.98])); // motor hood
    G.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 12), metal, [0, 0.08, -0.98], [0, 0, Math.PI / 2])); // rear roller
    for (const s of [-1, 1]) G.add(mesh(new THREE.CylinderGeometry(0.028, 0.032, 1.15, 14), metal, [s * 0.34, 0.75, 1.0], [0.18, 0, 0])); // uprights
    const con = new THREE.Group(); con.position.set(0, 1.3, 1.1); con.rotation.x = -0.75; G.add(con);
    con.add(mesh(new THREE.BoxGeometry(0.78, 0.36, 0.08), plastic));
    const scr = mesh(new THREE.PlaneGeometry(0.4, 0.2), new THREE.MeshBasicMaterial({ map: this.screen.tex, toneMapped: false }), [0, 0.02, -0.041], [0, Math.PI, 0], false); con.add(scr);
    for (const s of [-1, 1]) con.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 10), metal, [s * 0.33, -0.16, -0.08], [Math.PI / 2, 0, 0])); // short grips only (never through the runner)
    G.traverse((k) => { if ((k as THREE.Mesh).isMesh) { k.castShadow = true; k.receiveShadow = true; } });
  }
  update(t: number, speed: number) {
    this.belt.offset.y = -t * speed * 1.6;
    const km = "0.0";
    this.screen.draw("s" + Math.floor(t * 4) % 2, (g, w, h) => {
      g.fillStyle = "#08130d"; g.fillRect(0, 0, w, h); g.fillStyle = "#3dff8a"; g.shadowColor = "#3dff8a"; g.shadowBlur = 10;
      g.font = "bold 42px 'Courier New', monospace"; g.fillText("KECEPATAN 12", 26, 70); g.fillText("JARAK " + km + " KM", 26, 140);
      g.fillStyle = Math.floor(t * 4) % 2 ? "#ff5a4a" : "#7a2a24"; g.shadowColor = "#ff5a4a"; g.fillText("SALDO: Rp 0", 26, 214);
    });
  }
}

// ---------------- end-of-month calendar (the 30th circled, past days crossed out) ----------------
export const endOfMonthCalendar = () => {
  const tex = canvasTex(384, 480, (g) => {
    g.fillStyle = "#f3ecdc"; g.fillRect(0, 0, 384, 480); g.fillStyle = "#b8312c"; g.fillRect(0, 0, 384, 120);
    g.fillStyle = "#fff"; g.font = "bold 50px 'Helvetica Neue', Arial"; g.fillText("NOVEMBER", 50, 80);
    g.font = "bold 34px 'Helvetica Neue', Arial";
    for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) { const d = r * 7 + c + 1; if (d > 30) continue; const x = 18 + c * 52, y = 170 + r * 62; g.fillStyle = c === 0 ? "#b8312c" : "#333"; g.fillText(String(d), x, y);
      if (d < 30) { g.strokeStyle = "rgba(40,40,40,0.7)"; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 4, y - 28); g.lineTo(x + 38, y + 6); g.moveTo(x + 38, y - 28); g.lineTo(x - 4, y + 6); g.stroke(); } }
    g.strokeStyle = "#d61e28"; g.lineWidth = 7; g.beginPath(); g.ellipse(18 + 1 * 52 + 20, 170 + 4 * 62 - 12, 34, 30, -0.1, 0, Math.PI * 2); g.stroke();
  });
  const g = new THREE.Group();
  g.add(mesh(new THREE.PlaneGeometry(0.42, 0.52), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), [0, 0, 0], [0, 0, 0], false));
  g.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.02, 8), new THREE.MeshStandardMaterial({ color: "#555", metalness: 0.7, roughness: 0.4 }), [0, 0.27, 0.01], [Math.PI / 2, 0, 0], false)); // nail
  return g;
};

// ---------------- 2D hand props (drawn on the character card, exactly at the hand point) ----------------
/** a brown pay envelope, bills sticking out, held at (x, y) */
export const drawEnvelope = (g: CanvasRenderingContext2D, x: number, y: number, ang: number, s = 1) => {
  g.save(); g.translate(x, y); g.rotate(ang); g.scale(s, s); g.lineJoin = "round";
  for (let k = 0; k < 3; k++) { g.save(); g.rotate(-0.25 + k * 0.22); g.fillStyle = k % 2 ? "#e47f8c" : "#d8697a"; g.strokeStyle = OUTLINE; g.lineWidth = 5; g.beginPath(); g.rect(-34, -118, 68, 92); g.fill(); g.stroke(); g.fillStyle = "#7d1f36"; g.font = "bold 18px 'Helvetica Neue', Arial"; g.fillText("100", -20, -92); g.restore(); }
  g.fillStyle = "#c99a5b"; g.strokeStyle = OUTLINE; g.lineWidth = 7; g.beginPath(); g.roundRect(-70, -50, 140, 92, 6); g.fill(); g.stroke();
  g.strokeStyle = "rgba(43,26,38,0.55)"; g.lineWidth = 4; g.beginPath(); g.moveTo(-66, -46); g.lineTo(0, 0); g.lineTo(66, -46); g.stroke();
  g.fillStyle = "#3a2410"; g.font = "bold 26px 'Helvetica Neue', Arial"; g.textAlign = "center"; g.fillText("GAJI", 0, 30);
  g.restore();
};
/** a fork lifting a long noodle strand toward the mouth */
export const drawForkNoodles = (g: CanvasRenderingContext2D, hx: number, hy: number, mx: number, my: number, t: number) => {
  g.save(); g.lineCap = "round"; g.strokeStyle = "#9aa1aa"; g.lineWidth = 7; g.beginPath(); g.moveTo(hx, hy); g.lineTo(mx - 6, my + 26); g.stroke();
  g.strokeStyle = "#e8bf55"; g.lineWidth = 6; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(mx - 10 + k * 8, my + 20); for (let y = 0; y < 150; y += 10) g.lineTo(mx - 12 + k * 9 + 6 * Math.sin(y * 0.09 + t * 6 + k), my + 20 + y); g.stroke(); }
  g.restore();
};
