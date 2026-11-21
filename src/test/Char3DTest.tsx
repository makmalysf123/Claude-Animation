// Test 2026-11-18: three full-3D toon characters (src/lib/char3d.ts) standing in the Kopi Mahal kedai (day).
// Scene 1 = group shot, scenes 2-4 = one close-up each. Stills: frames 15, 45, 75, 105.
import React from "react";
import * as THREE from "three";
import { Reel, SceneDef, V3 } from "../lib/scene";
import { KedaiSet } from "../videos/kopi/kedai";
import { Char3, FaceFn, INK, collar, buttons, cloth, clothTex, fabric, solidCloth, inked, V } from "../lib/char3d";

// ---------------- faces (x,y in -1..1 of the head radius, y up) ----------------
const pen = (g: CanvasRenderingContext2D, u: number, k = 1) => { g.strokeStyle = INK; g.fillStyle = INK; g.lineWidth = 0.034 * u * k; };
const circle = (g: CanvasRenderingContext2D, x: number, y: number, r: number) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); };
const line = (g: CanvasRenderingContext2D, P: (x: number, y: number) => [number, number], pts: [number, number][]) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(...P(x, y)) : g.moveTo(...P(x, y)))); g.stroke(); };
const curve = (g: CanvasRenderingContext2D, P: (x: number, y: number) => [number, number], a: [number, number], c: [number, number], b: [number, number]) => { g.beginPath(); g.moveTo(...P(...a)); g.quadraticCurveTo(...P(...c), ...P(...b)); g.stroke(); };
/** round eye: outline, pupil looking (dx,dy), optional upper lid at height lid (-1..1 of the eye) */
const eye = (g: CanvasRenderingContext2D, P: (x: number, y: number) => [number, number], u: number, x: number, y: number, R: number, dx: number, dy: number, pr: number, lid?: number, glint = true) => {
  const [cx, cy] = P(x, y), rr = R * u;
  g.save(); circle(g, cx, cy, rr); g.clip();
  g.fillStyle = "#ffffff"; g.fill(); g.fillStyle = INK; circle(g, cx + dx * rr * 0.5, cy - dy * rr * 0.5, pr * u); g.fill();
  if (glint) { g.fillStyle = "#ffffff"; circle(g, cx + dx * rr * 0.5 + pr * u * 0.35, cy - dy * rr * 0.5 - pr * u * 0.35, pr * u * 0.32); g.fill(); }
  if (lid !== undefined) { g.fillStyle = "#e9e6e0"; g.fillRect(cx - rr, cy - rr, 2 * rr, rr * (1 - lid)); pen(g, u); g.beginPath(); g.moveTo(cx - rr, cy - rr * lid); g.lineTo(cx + rr, cy - rr * lid); g.stroke(); }
  g.restore(); pen(g, u); circle(g, cx, cy, rr); g.stroke();
};

/** Pak Darto: smug half-lid eyes, heavy brows, a thick moustache, a sly smile */
const faceBapak: FaceFn = (g, P, u) => {
  eye(g, P, u, -0.3, 0.04, 0.15, 0.25, -0.1, 0.06, 0.15); eye(g, P, u, 0.3, 0.04, 0.15, 0.25, -0.1, 0.06, 0.25);
  pen(g, u, 2.4); line(g, P, [[-0.48, 0.27], [-0.14, 0.22]]); line(g, P, [[0.14, 0.25], [0.46, 0.34]]);
  pen(g, u, 0.9); curve(g, P, [-0.04, -0.06], [0.07, -0.13], [0.0, -0.18]);
  // moustache: two filled lobes
  g.fillStyle = INK; g.beginPath(); g.moveTo(...P(0, -0.2)); g.bezierCurveTo(...P(-0.12, -0.16), ...P(-0.3, -0.2), ...P(-0.34, -0.33)); g.bezierCurveTo(...P(-0.22, -0.27), ...P(-0.1, -0.29), ...P(0, -0.26));
  g.bezierCurveTo(...P(0.1, -0.29), ...P(0.22, -0.27), ...P(0.34, -0.33)); g.bezierCurveTo(...P(0.3, -0.2), ...P(0.12, -0.16), ...P(0, -0.2)); g.fill();
  pen(g, u); curve(g, P, [-0.1, -0.38], [0.04, -0.43], [0.17, -0.34]);
  pen(g, u, 0.6); curve(g, P, [-0.5, -0.0], [-0.53, -0.06], [-0.49, -0.12]); curve(g, P, [0.5, -0.0], [0.53, -0.06], [0.49, -0.12]); // laugh creases
};
/** Mbak Sari: big bright eyes with lashes, blush, an open happy mouth */
const faceSari: FaceFn = (g, P, u) => {
  for (const s of [-1, 1]) { const [bx, by] = P(s * 0.45, -0.17); g.fillStyle = "rgba(240,130,140,0.45)"; g.beginPath(); g.ellipse(bx, by, 0.13 * u, 0.07 * u, 0, 0, Math.PI * 2); g.fill(); }
  eye(g, P, u, -0.28, 0.02, 0.17, 0.15, 0.15, 0.085); eye(g, P, u, 0.28, 0.02, 0.17, 0.15, 0.15, 0.085);
  pen(g, u, 1.1); for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const a = -0.25 - k * 0.35, ex = s * 0.28 + s * 0.17 * Math.cos(a) * 1.0, ey = 0.02 + 0.17 * Math.sin(-a) * 0.9; line(g, P, [[ex, ey], [ex + s * 0.07 * Math.cos(a + 0.3), ey + 0.07 * Math.sin(-a + 0.3)]]); }
  pen(g, u, 1.3); curve(g, P, [-0.44, 0.27], [-0.3, 0.37], [-0.14, 0.29]); curve(g, P, [0.14, 0.29], [0.3, 0.37], [0.44, 0.27]);
  pen(g, u, 0.8); curve(g, P, [-0.03, -0.1], [0.05, -0.16], [0.0, -0.19]);
  // open mouth: dark D, teeth band, tongue
  const mouth = () => { g.beginPath(); g.moveTo(...P(-0.2, -0.26)); g.quadraticCurveTo(...P(0, -0.22), ...P(0.2, -0.26)); g.quadraticCurveTo(...P(0.17, -0.52), ...P(0, -0.53)); g.quadraticCurveTo(...P(-0.17, -0.52), ...P(-0.2, -0.26)); };
  mouth(); g.fillStyle = "#4b1d26"; g.fill(); g.save(); mouth(); g.clip(); g.fillStyle = "#ffffff"; g.fillRect(...P(-0.3, -0.2), 0.6 * u, 0.09 * u); g.fillStyle = "#e5707e"; g.beginPath(); g.ellipse(...P(0.02, -0.53), 0.14 * u, 0.09 * u, 0, 0, Math.PI * 2); g.fill(); g.restore();
  pen(g, u); mouth(); g.stroke();
};
/** Dimas (kid): raised brows, eyes up at his own waving hand, freckles, a gap-tooth grin */
const faceDimas: FaceFn = (g, P, u) => {
  eye(g, P, u, -0.27, 0.03, 0.16, 0.35, 0.45, 0.07); eye(g, P, u, 0.27, 0.03, 0.16, 0.35, 0.45, 0.07);
  pen(g, u, 1.8); curve(g, P, [-0.43, 0.3], [-0.28, 0.42], [-0.13, 0.33]); curve(g, P, [0.13, 0.33], [0.28, 0.42], [0.43, 0.3]);
  g.fillStyle = "rgba(150,90,60,0.55)"; for (const s of [-1, 1]) for (const [x, y] of [[0.4, -0.13], [0.47, -0.18], [0.36, -0.2], [0.44, -0.24]]) { circle(g, ...P(s * x, y), 0.014 * u); g.fill(); }
  pen(g, u, 0.8); curve(g, P, [-0.03, -0.1], [0.06, -0.15], [0.0, -0.19]);
  const mouth = () => { g.beginPath(); g.moveTo(...P(-0.3, -0.24)); g.quadraticCurveTo(...P(0, -0.27), ...P(0.3, -0.24)); g.quadraticCurveTo(...P(0.22, -0.55), ...P(0, -0.56)); g.quadraticCurveTo(...P(-0.22, -0.55), ...P(-0.3, -0.24)); };
  mouth(); g.fillStyle = "#4b1d26"; g.fill(); g.save(); mouth(); g.clip(); g.fillStyle = "#ffffff"; g.fillRect(...P(-0.4, -0.2), 0.8 * u, 0.11 * u); g.fillStyle = "#4b1d26"; g.fillRect(...P(-0.025, -0.2), 0.05 * u, 0.11 * u);
  g.fillStyle = "#e5707e"; g.beginPath(); g.ellipse(...P(0, -0.56), 0.18 * u, 0.1 * u, 0, 0, Math.PI * 2); g.fill(); g.restore(); pen(g, u); mouth(); g.stroke();
  pen(g, u, 0.7); line(g, P, [[-0.025, -0.25], [-0.025, -0.35]]); line(g, P, [[0.025, -0.25], [0.025, -0.35]]);
};

// ---------------- cloth ----------------
const batikTex = () => clothTex((g, w, h) => {
  fabric(g, w, h, "#6e3b1c", 18); const c = 64;
  for (let y = 0; y < h + c; y += c) for (let x = 0; x < w + c; x += c) { const ox = x + ((y / c) % 2) * c * 0.5;
    for (let k = 0; k < 4; k++) { const a = (k * Math.PI) / 2 + Math.PI / 4; g.save(); g.translate(ox + Math.cos(a) * 13, y + Math.sin(a) * 13); g.rotate(a); g.fillStyle = "#e2c08a"; g.beginPath(); g.ellipse(0, 0, 13, 7, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#3a1c0c"; g.lineWidth = 2.5; g.stroke(); g.fillStyle = "#3a1c0c"; g.beginPath(); g.ellipse(2, 0, 4, 2, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
    g.fillStyle = "#3a1c0c"; g.beginPath(); g.arc(ox, y, 3.5, 0, Math.PI * 2); g.fill(); g.fillStyle = "#c98d3e"; g.beginPath(); g.arc(ox + c / 2, y + c / 2, 4, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = "rgba(40,18,6,0.85)"; g.fillRect(w / 2 - 3, 0, 6, h); // placket
});
const kidTex = () => clothTex((g, w, h) => {
  fabric(g, w, h, "#f3f1ec", 10); g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(w / 2 - 2, 0, 4, h * 0.78);
  g.strokeStyle = "rgba(60,60,70,0.45)"; g.lineWidth = 3; g.strokeRect(w / 2 + 70, h * 0.33, 60, 54); // chest pocket
  g.fillStyle = "#c9a227"; g.beginPath(); g.arc(w / 2 - 95, h * 0.36, 14, 0, Math.PI * 2); g.fill(); // badge
  const red = canvasRed(w); g.drawImage(red, 0, h * 0.78);
  g.fillStyle = "#2a2a2a"; g.fillRect(0, h * 0.78, w, 10); g.fillStyle = "#c9c9c9"; g.fillRect(w / 2 - 16, h * 0.78 - 2, 32, 14); // belt + buckle
});
const canvasRed = (w: number) => { const c = document.createElement("canvas"); c.width = w; c.height = 120; fabric(c.getContext("2d")!, w, 120, "#b0262f", 16); return c; };
const hoodieTex = () => clothTex((g, w, h) => { fabric(g, w, h, "#f2b324", 16); g.fillStyle = "rgba(120,70,0,0.18)"; g.fillRect(0, h - 40, w, 40); g.fillStyle = "rgba(255,255,255,0.0)"; });

// ---------------- the three ----------------
export const mkBapak = () => {
  const r = 0.235, leg = 0.34, torsoH = 0.4, torsoR = 0.175, sy = leg + 0.05 + torsoH - 0.03 - 0.07, hip = leg + 0.05;
  const batik = cloth(batikTex());
  const c = new Char3({ r, leg, torsoH, torsoR, face: faceBapak, shirt: batik, sleeve: 0.36, sleeveR: 0.046,
    hair: { col: "#4a4542", keep: (d) => d.y > -0.15 && d.y < 0.42 && d.z < 0.1 && (Math.abs(d.x) > 0.55 || d.z < -0.3), rb: () => 0.3, out: 0.95, jitter: 0.02, n: 90, flat: 0.35 },
    arms: [[[-0.3, sy + 0.02, 0.07], [-0.36, sy + 0.25, 0.12]], [[0.31, sy - 0.13, -0.04], [0.19, hip + 0.07, 0.05]]] });
  collar(c, batik); buttons(c, 4, "#e9dcc0");
  // peci: black velvet cap
  const peci = inked(new THREE.CylinderGeometry(r * 0.83, r * 0.9, r * 0.52, 64), new THREE.MeshPhysicalMaterial({ color: "#16161a", roughness: 0.9, sheen: 1, sheenColor: new THREE.Color("#5a5a66"), sheenRoughness: 0.5 }), 0.006);
  peci.position.set(0, r * 0.8, -0.01); peci.rotation.x = -0.12; peci.scale.z = 0.93; c.head.add(peci); c.setHat(peci);
  return c;
};
export const mkSari = () => {
  const r = 0.225, leg = 0.34, torsoH = 0.36, torsoR = 0.155, sy = leg + 0.05 + torsoH - 0.03 - 0.07;
  const hood = cloth(hoodieTex());
  const c = new Char3({ r, leg, torsoH, torsoR, face: faceSari, shirt: hood, sleeve: 0.9, sleeveR: 0.04, limb: "#2a2830",
    hair: { col: "#2b1f1b", keep: (d) => { if (d.y < -0.5) return false; const face = d.z > 0.18 && Math.abs(d.x) < 0.8 && d.y < 0.62; return !face && (d.y > 0.25 || d.z < 0.25); }, rb: (d) => (d.z > 0.3 ? 0.38 : 0.5), out: 0.98, jitter: 0.03, n: 60, flat: 0.4 },
    arms: [[[-0.21, sy - 0.2, 0.08], [-0.08, sy - 0.12, 0.2]], [[0.2, sy - 0.2, -0.01], [0.2, sy - 0.41, 0.03]]] });
  // hood bunched behind the neck, kangaroo pocket, drawstrings
  const hb = inked(new THREE.SphereGeometry(1, 32, 20), hood, 0.06); hb.scale.set(0.15, 0.07, 0.09); hb.position.set(0, c.torsoTop - 0.01, -0.07); c.add(hb);
  const pk = inked(new THREE.CapsuleGeometry(0.035, 0.12, 8, 16), hood, 0.004); pk.rotation.z = Math.PI / 2; pk.scale.set(1, 1, 0.35); pk.position.copy(c.front(0, 0.22, -0.004)); c.add(pk);
  const strM = new THREE.MeshStandardMaterial({ color: "#f6f2ea", roughness: 0.7 });
  for (const s of [-1, 1]) { const p = c.front(s * 0.035, 0.8, 0.004); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.11, 8), strM); st.position.copy(p).add(V(0, -0.055, 0.006)); st.castShadow = true; c.add(st); const ag = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), strM); ag.position.copy(st.position).add(V(0, -0.058, 0)); c.add(ag); }
  // iced coffee held in the right hand: plastic cup, latte, a domed lid and a straw
  const h = c.hands[0], cup = new THREE.Group(); cup.position.copy(h.position).add(V(0.055, 0.0, 0.02)); c.add(cup);
  const plast = new THREE.MeshPhysicalMaterial({ color: "#eef4f6", roughness: 0.08, transparent: true, opacity: 0.35, clearcoat: 1 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.032, 0.13, 32, 1, true), plast); body.renderOrder = 3; cup.add(body);
  const latte = new THREE.Mesh(new THREE.CylinderGeometry(0.039, 0.031, 0.1, 32), new THREE.MeshStandardMaterial({ color: "#b98a5e", roughness: 0.5 })); latte.position.y = -0.012; cup.add(latte);
  const foam = new THREE.Mesh(new THREE.CylinderGeometry(0.0395, 0.039, 0.02, 32), new THREE.MeshStandardMaterial({ color: "#efe3cf", roughness: 0.6 })); foam.position.y = 0.045; cup.add(foam);
  const lid = new THREE.Mesh(new THREE.SphereGeometry(0.043, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), plast); lid.scale.y = 0.45; lid.position.y = 0.065; cup.add(lid);
  const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.2, 10), new THREE.MeshStandardMaterial({ color: "#2f8a4a", roughness: 0.4 })); straw.position.set(0.008, 0.11, 0); straw.rotation.z = -0.15; cup.add(straw);
  for (const m of [latte, foam, straw]) m.castShadow = true;
  return c;
};
export const mkDimas = () => {
  const r = 0.215, leg = 0.22, torsoH = 0.3, torsoR = 0.14, sy = leg + 0.05 + torsoH - 0.03 - 0.07;
  const shirt = cloth(kidTex()), white = solidCloth("#f3f1ec", 10), red = solidCloth("#b0262f", 16);
  const c = new Char3({ r, leg, torsoH, torsoR, face: faceDimas, shirt, sleeve: 0.38, sleeveR: 0.04, sleeveMat: white, shorts: red,
    hair: { col: "#231a17", keep: (d) => (d.y > 0.3 ? !(d.z > 0.45 && d.y < 0.64) : (d.z < -0.1 && d.y > -0.25) || (Math.abs(d.x) > 0.85 && d.y > 0.0 && d.z < 0.3)), rb: (d) => (d.y > 0.7 ? 0.5 : 0.42), out: 0.99, jitter: 0.1, n: 55, flat: 0.45 },
    arms: [[[-0.18, sy - 0.14, 0.0], [-0.16, sy - 0.3, 0.04]], [[0.27, sy + 0.06, 0.05], [0.37, sy + 0.27, 0.08]]] });
  collar(c, white);
  const tie = inked(new THREE.ConeGeometry(0.022, 0.11, 4), red, 0.003); tie.rotation.set(Math.PI + 0.12, Math.PI / 4, 0); tie.scale.z = 0.4; tie.position.copy(c.front(0, 0.74, 0.008)); c.add(tie);
  return c;
};

// ---------------- scenes ----------------
const DAY = { fog: "#efd9b6", dens: 0.009, bg: "#cfe0f2", cInf: 6, env: 0.42, exposure: 0.03, bloom: 0.7, sat: 0.2, contrast: 0.12, grade: [[0.4, 0.5, 0.58], [0.64, 0.54, 0.4], 0.32] as [V3, V3, number] };
const SPOT: [number, number][] = [[0.02, 1.6], [1.0, 1.6], [0.5, 2.1]]; // bapak, sari, dimas
const GROUP_CAM: V3 = [0.5, 1.0, 6.0];
type Cast = { set: KedaiSet; cast: Char3[] };
const mk = () => { const set = new KedaiSet("day"); const cast = [mkBapak(), mkSari(), mkDimas()];
  cast.forEach((c, i) => { const [x, z] = SPOT[i]; c.root.position.set(x, 0.03, z); c.root.rotation.y = Math.atan2(GROUP_CAM[0] - x, GROUP_CAM[2] - z) * 0.8; set.root.add(c.root); });
  return Object.assign(set, { cast }) as unknown as KedaiSet; };
const act = (cx: { t: number; set: unknown }) => { (cx.set as unknown as Cast).cast.forEach((c, i) => c.update(cx.t, i * 1.7)); };
const close = (i: number, from: number): SceneDef => { const [x, z] = SPOT[i], hy = [0.95, 0.9, 0.71][i];
  return { from, to: from + 1, ...DAY, mk, act, keys: [{ t: 0, pos: [x + 0.28, hy - 0.02, z + 1.5], look: [x, hy - 0.22, z], fov: 40 }], focus: () => [x, hy, z + 0.2] }; };
const SCENES: SceneDef[] = [
  { from: 0, to: 1, ...DAY, mk, act, keys: [{ t: 0, pos: GROUP_CAM, look: [0.5, 0.78, 1.8], fov: 40 }], focus: () => [0.5, 0.85, 1.9] },
  close(0, 1), close(1, 2), close(2, 3),
];
export const CHAR3D_FRAMES = 120;
export const Char3DTest: React.FC = () => <Reel scenes={SCENES} />;
