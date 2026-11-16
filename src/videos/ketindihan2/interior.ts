// "Interior mapping" windows: a flat window plane that shows a real-looking room behind it (back wall, side walls,
// floor and ceiling with parallax as the camera moves), lit from inside (lamp falloff, a flickering TV), with
// curtains + window bars on top and the night sky / moon reflected in the glass (fresnel). No geometry behind it.
import * as THREE from "three";
import { canvasTex } from "./sets";
import { rnd } from "../../lib/world2/textures";

export type RoomKind = "living" | "bedroom" | "kitchen" | "budi";

/** 1024 atlas: [0,0.5)x[0.5,1] back wall, [0.5,1]x[0.5,1] side wall, [0,0.5)x[0,0.5) floor, [0.5,1]x[0,0.5) ceiling */
const atlas = (kind: RoomKind) => canvasTex(1024, 1024, (g) => {
  const Q = 512, wall = { living: "#d8c8a0", bedroom: "#c8d4c0", kitchen: "#e8e4d8", budi: "#8c6646" }[kind];
  // back wall (top-left quadrant in canvas = v high)
  g.fillStyle = wall; g.fillRect(0, 0, Q, Q); for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.05})`; g.fillRect(rnd() * Q, rnd() * Q, 3, 3); }
  if (kind === "budi") { g.fillStyle = "rgba(0,0,0,0.25)"; for (let x = 0; x < Q; x += 46) g.fillRect(x, 0, 3, Q); }
  const frame = (x: number, y: number, w: number, h: number, c: string) => { g.fillStyle = "#4a2e1c"; g.fillRect(x - 6, y - 6, w + 12, h + 12); g.fillStyle = c; g.fillRect(x, y, w, h); };
  if (kind === "living") {
    frame(60, 110, 90, 70, "#9ab8c8"); frame(190, 90, 70, 90, "#c8a888"); g.fillStyle = "#3a2a20"; g.fillRect(290, 300, 190, 120); g.fillStyle = "#222"; g.fillRect(320, 220, 130, 90);
    g.fillStyle = "#4a6a3a"; g.fillRect(20, 330, 230, 110); g.fillRect(20, 290, 40, 150); g.fillRect(210, 290, 40, 150); // sofa
    g.fillStyle = "#1a1418"; g.beginPath(); g.arc(130, 290, 34, 0, 6.3); g.fill(); g.fillRect(100, 320, 60, 70); // someone on the sofa watching TV
  } else if (kind === "bedroom") {
    frame(180, 100, 140, 100, "#e8c8a8"); g.fillStyle = "#6a3a2a"; g.fillRect(40, 300, 420, 30); g.fillStyle = "#e8e0d0"; g.fillRect(50, 280, 400, 40); g.fillStyle = "#b8423c"; g.fillRect(150, 286, 300, 34);
    g.fillStyle = "#5a3420"; g.fillRect(400, 120, 100, 300);
  } else if (kind === "kitchen") {
    g.fillStyle = "#f2f2f0"; for (let y = 190; y < 330; y += 22) for (let x = 0; x < Q; x += 22) g.fillRect(x + 1, y + 1, 20, 20); g.fillStyle = "#7a5232"; g.fillRect(0, 330, Q, 182);
    g.fillStyle = "#c8ccd2"; g.fillRect(120, 290, 90, 40); g.fillStyle = "#e0e0e0"; g.fillRect(380, 80, 110, 250); g.fillStyle = "#5a3a22"; g.fillRect(40, 120, 200, 12); for (let k = 0; k < 6; k++) { g.fillStyle = ["#c8483c", "#e0b84a", "#5a8a4a"][k % 3]; g.fillRect(50 + k * 30, 90, 18, 30); }
  } else { // Budi's room: the bed with its red blanket, the clock, the wardrobe, the night lamp glow
    g.fillStyle = "#6a3f24"; g.fillRect(60, 250, 300, 90); g.fillStyle = "#e9e4da"; g.fillRect(70, 300, 290, 40); g.fillStyle = "#a82c30"; g.fillRect(150, 296, 210, 60); g.fillStyle = "#f1efe8"; g.fillRect(80, 290, 70, 26);
    g.fillStyle = "#f4ecd8"; g.beginPath(); g.arc(420, 120, 34, 0, 6.3); g.fill(); g.strokeStyle = "#3a2414"; g.lineWidth = 6; g.stroke(); g.fillStyle = "#5a3420"; g.fillRect(380, 280, 80, 140);
    const gr = g.createRadialGradient(420, 270, 5, 420, 270, 120); gr.addColorStop(0, "rgba(255,190,110,0.8)"); gr.addColorStop(1, "rgba(255,190,110,0)"); g.fillStyle = gr; g.fillRect(0, 0, Q, Q);
  }
  // side wall (top-right): same wall + a door or shelf
  g.fillStyle = wall; g.fillRect(Q, 0, Q, Q); g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(Q, 0, Q, Q); g.fillStyle = "#5a3a22"; g.fillRect(Q + 300, 120, 140, 392);
  // floor (bottom-left): tiles / planks
  for (let y = 0; y < Q; y += 32) for (let x = 0; x < Q; x += 32) { const v = 120 + ((x + y) / 32 % 2) * 20 + rnd() * 10; g.fillStyle = kind === "budi" ? `rgb(${v * 0.6},${v * 0.42},${v * 0.28})` : `rgb(${v},${v * 0.95},${v * 0.88})`; g.fillRect(x, Q + y, 31, 31); }
  // ceiling (bottom-right) with a lamp disc
  g.fillStyle = "#e8e2d8"; g.fillRect(Q, Q, Q, Q); g.fillStyle = "#fff6d8"; g.beginPath(); g.arc(Q + 256, Q + 256, 40, 0, 6.3); g.fill();
});
/** curtains + window bars over the glass (alpha) */
const curtainTex = (open: number, warm: string) => canvasTex(256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  for (const s of [0, 1]) { const w = 128 * (1 - open); g.fillStyle = warm; g.beginPath(); if (!s) { g.moveTo(0, 0); g.lineTo(w, 0); g.quadraticCurveTo(w * 0.7, 140, w * 0.45, 256); g.lineTo(0, 256); } else { g.moveTo(256, 0); g.lineTo(256 - w, 0); g.quadraticCurveTo(256 - w * 0.7, 140, 256 - w * 0.45, 256); g.lineTo(256, 256); } g.fill();
    g.strokeStyle = "rgba(0,0,0,0.18)"; g.lineWidth = 3; for (let k = 1; k < 5; k++) { const x = s ? 256 - (w * k) / 5 : (w * k) / 5; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x * 0.85 + (s ? 30 : 0), 140, x * 0.6 + (s ? 90 : 0), 256); g.stroke(); } }
  g.fillStyle = "#3a2618"; g.fillRect(122, 0, 12, 256); g.fillRect(0, 122, 256, 12); g.fillRect(0, 0, 256, 10); g.fillRect(0, 246, 256, 10); g.fillRect(0, 0, 10, 256); g.fillRect(246, 0, 10, 256);
});

const VS = /* glsl */ `
varying vec3 vPos; varying vec3 vCam; varying vec2 vUv; varying vec3 vMoon;
uniform vec3 uMoonDir;
void main() {
  vPos = position; vUv = uv;
  mat4 inv = inverse(modelMatrix);
  vCam = (inv * vec4(cameraPosition, 1.0)).xyz;
  vMoon = normalize((inv * vec4(uMoonDir, 0.0)).xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const FS = /* glsl */ `
varying vec3 vPos; varying vec3 vCam; varying vec2 vUv; varying vec3 vMoon;
uniform sampler2D uRoom; uniform sampler2D uCurt; uniform float uDepth; uniform vec3 uLight; uniform float uTv; uniform float uRefl;
vec3 room(vec2 uv, int q) { vec2 o = q == 0 ? vec2(0.0, 0.5) : q == 1 ? vec2(0.5, 0.5) : q == 2 ? vec2(0.0, 0.0) : vec2(0.5, 0.0); return texture2D(uRoom, o + clamp(uv, 0.002, 0.998) * 0.5).rgb; }
void main() {
  vec3 ro = vPos; vec3 rd = normalize(vPos - vCam);
  float tx = ((rd.x > 0.0 ? 0.5 : -0.5) - ro.x) / rd.x; float ty = ((rd.y > 0.0 ? 0.5 : -0.5) - ro.y) / rd.y; float tz = (-uDepth - ro.z) / min(rd.z, -1e-4);
  float t = min(tz, min(tx, ty)); vec3 h = ro + rd * t; vec3 c; float depth = clamp(-h.z / uDepth, 0.0, 1.0);
  if (t == tz) c = room(h.xy + 0.5, 0);
  else if (t == tx) c = room(vec2(rd.x > 0.0 ? depth : 1.0 - depth, h.y + 0.5), 1);
  else if (rd.y < 0.0) c = room(vec2(h.x + 0.5, 1.0 - depth), 2);
  else c = room(vec2(h.x + 0.5, depth), 3);
  // lamp near the ceiling centre: falloff, warm; the TV adds a flickering blue cast
  vec3 lampP = vec3(0.0, 0.42, -uDepth * 0.5); float d = length(h - lampP); float lit = 1.0 / (1.0 + 2.5 * d * d);
  c *= uLight * (0.25 + 1.6 * lit) + uTv * vec3(0.25, 0.4, 0.9) * (0.6 + 0.4 * depth);
  c *= 0.7 + 0.3 * depth; // darker towards the window wall (no light hits it directly)
  vec4 cu = texture2D(uCurt, vUv); vec3 curtLit = cu.rgb * (uLight * 0.9 + 0.08) + cu.rgb * uTv * 0.15; c = mix(c, curtLit, cu.a);
  // glass reflection: night sky + the moon glint, strongest at grazing angles
  vec3 rf = reflect(rd, vec3(0.0, 0.0, 1.0)); float fres = 0.05 + 0.6 * pow(1.0 - abs(rd.z), 4.0);
  vec3 sky = mix(vec3(0.03, 0.05, 0.12), vec3(0.15, 0.2, 0.38), clamp(rf.y * 0.5 + 0.5, 0.0, 1.0));
  float moon = smoothstep(0.985, 0.998, dot(normalize(rf), vMoon)) * 3.0 + smoothstep(0.9, 0.99, dot(normalize(rf), vMoon)) * 0.35;
  c = c * (1.0 - fres * uRefl) + (sky + vec3(0.75, 0.82, 1.0) * moon) * fres * uRefl * 1.6;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

export const interiorWindow = (kind: RoomKind, light: THREE.Color, moonDir: THREE.Vector3, opts: { curtain?: number; tv?: number; refl?: number; depth?: number } = {}) => {
  const m = new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS, toneMapped: false,
    uniforms: { uRoom: { value: atlas(kind) }, uCurt: { value: curtainTex(opts.curtain ?? 0.45, kind === "budi" ? "#c8b8d8" : ["#d89a5a", "#e8c870", "#c87a6a"][Math.floor(rnd() * 3)]) }, uDepth: { value: opts.depth ?? 1.3 }, uLight: { value: light }, uTv: { value: opts.tv ?? 0 }, uRefl: { value: opts.refl ?? 1 }, uMoonDir: { value: moonDir.clone().normalize() } },
  });
  return m;
};
