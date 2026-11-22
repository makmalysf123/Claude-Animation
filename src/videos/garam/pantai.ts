// PantaiSet: the younger brother's coconut garden right on the coast, late morning. Sand slopes down to the sea at
// z = SHORE; lush leaning palms, beached fishing boats, a house behind the palms. The sea is a moving 3D surface with
// a foam line that runs up and back down the wet sand; `spray` (0..1) makes salty mist blow from the surf to the palms.
import * as THREE from "three";
import { canvasTex } from "../ketindihan2/sets";
import { fbm, rnd, seedRnd } from "../../lib/world2/textures";
import { M } from "../emas/props";
import { mdl, recolor, crownWorld } from "./models";
import { scatter, V3 } from "./kebun";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export const SHORE = -7;
/** sand height: a gentle beach falling toward the water, small dunes inland */
export const sandAt = (x: number, z: number) => (z > SHORE ? (z - SHORE) * 0.06 + 0.25 * Math.sin(x * 0.21 + z * 0.13) * Math.min(1, (z - SHORE) / 10) : (z - SHORE) * 0.08);
const sandTex = (() => { const t = canvasTex(1024, 1024, (g) => {
  for (let y = 0; y < 1024; y += 4) for (let x = 0; x < 1024; x += 4) { const n = fbm(x, y, 1024, 10, 5), r = 0.5 + 0.5 * Math.sin(y * 0.09 + 6 * fbm(x, y, 1024, 3, 2)); const v = 0.9 + 0.08 * n - 0.035 * r; g.fillStyle = `rgb(${(236 * v) | 0},${(220 * v) | 0},${(186 * v) | 0})`; g.fillRect(x, y, 4, 4); }
  for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? "120,100,80" : "255,250,240"},${0.2 + rnd() * 0.3})`; g.fillRect(rnd() * 1024, rnd() * 1024, 1.5, 1.5); }
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; })();
const seaNormal = (() => { const N = 256, h = (x: number, y: number) => fbm(x, y, N, 8, 4) + 0.5 * Math.sin((x + y) * 0.2); const t = canvasTex(N, N, (g) => {
  const id = g.createImageData(N, N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = h((x + 1) % N, y) - h((x + N - 1) % N, y), dy = h(x, (y + 1) % N) - h(x, (y + N - 1) % N); const n = V(-dx * 3, -dy * 3, 1).normalize(); const i = (y * N + x) * 4; id.data[i] = (n.x * 0.5 + 0.5) * 255; id.data[i + 1] = (n.y * 0.5 + 0.5) * 255; id.data[i + 2] = (n.z * 0.5 + 0.5) * 255; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0); }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
const foamTex = (() => { const t = canvasTex(512, 128, (g) => { const id = g.createImageData(512, 128); for (let y = 0; y < 128; y++) for (let x = 0; x < 512; x++) { const n = fbm(x, y, 512, 24, 4), edge = Math.exp(-Math.pow((y - 40 - 14 * fbm(x, 7, 512, 6, 2)) / 10, 2)), lace = n > 0.12 && y > 40 ? (n - 0.12) * 3 : 0; const a = Math.min(1, edge * 0.95 + lace * Math.max(0, 1 - (y - 40) / 80)); const i = (y * 512 + x) * 4; id.data[i] = id.data[i + 1] = 255; id.data[i + 2] = 252; id.data[i + 3] = 255 * a; } g.putImageData(id, 0, 0); }); t.wrapS = THREE.RepeatWrapping; return t; })();

export class PantaiSet {
  root = new THREE.Group(); sunDir = new THREE.Vector3(); sea: THREE.Mesh; base: Float32Array; foam: THREE.Mesh[] = []; wet: THREE.Mesh;
  constructor(public o: { shadowAt?: V3; shadowSize?: number; sun?: V3 } = {}) {
    const R = this.root; seedRnd(31);
    // ---- sand
    const sg = new THREE.PlaneGeometry(260, 140, 200, 110).rotateX(-Math.PI / 2); sg.translate(0, 0, 40); const sp = sg.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < sp.count; i++) sp.setY(i, sandAt(sp.getX(i), sp.getZ(i))); sg.computeVertexNormals();
    const st = sandTex.clone(); st.repeat.set(60, 32); st.needsUpdate = true; const sand = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ map: st, roughness: 0.95 })); sand.receiveShadow = true; R.add(sand);
    // wet sand band (darker, a touch glossy)
    const wt = canvasTex(64, 64, (g) => { const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, "rgba(120,100,76,0)"); gr.addColorStop(0.5, "rgba(120,100,76,0.55)"); gr.addColorStop(1, "rgba(120,100,76,0.7)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    this.wet = M(new THREE.PlaneGeometry(260, 5), new THREE.MeshStandardMaterial({ map: wt, transparent: true, roughness: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), [0, 0, SHORE + 1.6], [-Math.PI / 2 - 0.06, 0, 0]) as THREE.Mesh; this.wet.position.y = sandAt(0, SHORE + 1.6) + 0.01; R.add(this.wet);
    // ---- the sea: a moving surface, deep blue-green with sky reflections, foam lines
    const qg = new THREE.PlaneGeometry(300, 160, 150, 80).rotateX(-Math.PI / 2); qg.translate(0, 0, SHORE - 78); this.base = Float32Array.from((qg.attributes.position as THREE.BufferAttribute).array as Float32Array);
    const sn = seaNormal.clone(); sn.repeat.set(40, 24); sn.needsUpdate = true;
    this.sea = new THREE.Mesh(qg, new THREE.MeshPhysicalMaterial({ color: "#2f8a9a", roughness: 0.08, metalness: 0.0, normalMap: sn, normalScale: new THREE.Vector2(0.55, 0.55), clearcoat: 1, clearcoatRoughness: 0.1, transparent: true, opacity: 0.94, envMapIntensity: 1.4 }));
    this.sea.receiveShadow = true; this.sea.position.y = -0.05; R.add(this.sea);
    for (let k = 0; k < 3; k++) { const ft = foamTex.clone(); ft.repeat.set(10, 1); ft.offset.x = k * 0.37; ft.needsUpdate = true; const f = M(new THREE.PlaneGeometry(260, 2.6), new THREE.MeshStandardMaterial({ map: ft, transparent: true, roughness: 0.6, depthWrite: false, emissive: "#ffffff", emissiveIntensity: 0.15 }), [0, 0, SHORE], [-Math.PI / 2, 0, 0]) as THREE.Mesh; f.renderOrder = 3; R.add(f); this.foam.push(f); }
    // ---- palms: lush, leaning toward the sea, in a band along the beach; more far along the coast
    const HOUSES: [number, number, number, Record<string, string>][] = [[-9, 17, Math.PI / 2, { _crayfishdiffuse: "#dce9ee", "02___Default": "#2a6a8a", "07___Default": "#f4f0e6", "03___Default": "#22262c" }],
      [11, 19, Math.PI / 2 + 0.3, { _crayfishdiffuse: "#f2e6cc", "02___Default": "#b4532e", "07___Default": "#5a3a26", "03___Default": "#22262c" }], [26, 21, Math.PI / 2 - 0.2, { _crayfishdiffuse: "#e8eedc", "02___Default": "#3a7a5a", "07___Default": "#f4f0e6", "03___Default": "#22262c" }]];
    const free = (x: number, z: number) => HOUSES.every(([hx, hz]) => Math.hypot(x - hx, z - hz) > 7.5);
    const palms: { x: number; z: number; s: number }[] = [{ x: -3.2, z: 5.2, s: 1.05 }, { x: 3.6, z: 6.4, s: 0.95 }, { x: 0.2, z: 10.5, s: 1.1 }, { x: -6.5, z: 9, s: 1 }, { x: 7.5, z: 11, s: 1.05 }];
    for (let i = 0; i < 130; i++) { const x = (rnd() - 0.5) * 150, z = 3 + rnd() * 34; if (Math.abs(x) < 2.8 && z < 8) continue; if (!free(x, z) || palms.some((q) => Math.hypot(q.x - x, q.z - z) < 2.6)) continue; palms.push({ x, z, s: 0.9 + rnd() * 0.35 }); }
    const nutsAt: THREE.Vector3[] = [];
    palms.forEach((p, i) => { const o2 = mdl(i % 3 ? "coco_palm2" : "coco_palm", p.s); o2.position.set(p.x, sandAt(p.x, p.z) - 0.05, p.z); o2.rotation.y = rnd() * 6.28; R.add(o2); if (i < 40) nutsAt.push(crownWorld(o2)); });
    // heavy green coconut bunches under the crowns (the lush coast palms), and fallen nuts on the sand
    const bunch: { x: number; y: number; z: number; s: number; r: number }[] = [];
    nutsAt.forEach((c, i) => { for (let k = 0; k < 18; k++) { const a = k * 2.4 + i, r = 0.26 + 0.14 * ((k * 0.37) % 1); bunch.push({ x: c.x + Math.cos(a) * r, y: c.y - 0.2 - 0.6 * ((k * 0.618) % 1), z: c.z + Math.sin(a) * r, s: 1.25 + 0.3 * ((k * 0.73) % 1), r: k }); } });
    for (let i = 0; i < 40; i++) { const x = (rnd() - 0.5) * 30, z = 4 + rnd() * 14; bunch.push({ x, y: sandAt(x, z) + 0.06, z, s: 1.2, r: rnd() * 6 }); }
    scatter(R, "coconut", bunch, { tint: "#6f9a2e" });
    // beach plants, rocks, the brother's house, beached boats
    scatter(R, "fern", Array.from({ length: 50 }, () => { const x = (rnd() - 0.5) * 100, z = 8 + rnd() * 30; return { x, y: sandAt(x, z), z, s: 0.6 + rnd() * 0.6, r: rnd() * 6 }; }));
    scatter(R, "grass", Array.from({ length: 300 }, () => { const x = (rnd() - 0.5) * 100, z = 6 + rnd() * 30; return { x, y: sandAt(x, z), z, s: 0.6 + rnd() * 0.8, r: rnd() * 6 }; }), { cast: false, tint: "#9aa060" });
    scatter(R, "rocks", Array.from({ length: 30 }, () => { const x = (rnd() - 0.5) * 60, z = SHORE - 1 + rnd() * 6; return { x, y: sandAt(x, z) - 0.03, z, s: 1 + rnd() * 3, r: rnd() * 6 }; }), { tint: "#6a6660" });
    HOUSES.forEach(([x, z, r, cols]) => { const h = recolor(mdl("house"), cols); h.position.set(x, sandAt(x, z), z); h.rotation.y = r; R.add(h); });
    scatter(R, "bushes", Array.from({ length: 30 }, () => { const x = (rnd() - 0.5) * 120, z = 12 + rnd() * 26; return { x, y: sandAt(x, z), z, s: 0.5 + rnd() * 0.5, r: rnd() * 6 }; }));
    const stall = recolor(mdl("stand"), {}, 0.7); stall.position.set(-4.5, sandAt(-4.5, 12.5), 12.5); stall.rotation.y = 0.5; R.add(stall);
    const BOAT: Record<string, string>[] = [{ Wood: "#2a62b8", DarkWood: "#f4f0e6" }, { Wood: "#e04a3a", DarkWood: "#f2d040" }, { Wood: "#2a9a6a", DarkWood: "#f4f0e6" }];
    [[6.5, SHORE + 3.2, 0.25], [-10, SHORE + 2.6, -0.3], [14, SHORE + 4, 0.6], [-17, SHORE + 3.5, 0.1], [22, SHORE + 2.8, -0.4]].forEach(([x, z, r], i) => { const b = recolor(mdl("boat"), BOAT[i % 3], 0.6); b.position.set(x, sandAt(x, z) - 0.05, z); b.rotation.set(0.04, r, 0.05); R.add(b); });
    // ---- sky + clouds, bright late-morning light
    const cm = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#dfe8f4", emissiveIntensity: 0.28, roughness: 1, fog: false });
    for (let i = 0; i < 34; i++) { const az = (i / 34) * Math.PI * 2 + rnd() * 0.25, dist = 150 + rnd() * 70, hh = i % 3 ? 14 + rnd() * 22 : 40 + rnd() * 40, c = mdl(i % 2 ? "cloud_1" : "cloud_2", i % 3 ? 30 + rnd() * 40 : 18 + rnd() * 20); c.traverse((x) => { const me = x as THREE.Mesh; if (me.isMesh) { me.material = cm; me.castShadow = me.receiveShadow = false; } }); c.position.set(Math.sin(az) * dist, hh, -Math.cos(az) * dist); c.lookAt(0, hh, 0); R.add(c); }
    const skyT = canvasTex(8, 512, (g) => { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#1f5fb8"); gr.addColorStop(0.25, "#3f86d4"); gr.addColorStop(0.43, "#93c4ea"); gr.addColorStop(0.5, "#f4efe0"); gr.addColorStop(1, "#d8e4e6"); g.fillStyle = gr; g.fillRect(0, 0, 8, 512); });
    R.add(new THREE.Mesh(new THREE.SphereGeometry(280, 32, 16), new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide, fog: false, depthWrite: false })));
    const at = V(...(this.o.shadowAt ?? [0, 0, 2])), S = this.o.shadowSize ?? 16, dir = V(...(this.o.sun ?? [0.55, 0.72, 0.42])).normalize();
    const sun = new THREE.DirectionalLight("#fff0d6", 3.4); sun.position.copy(at).addScaledVector(dir, 60); sun.target.position.copy(at); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
    Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 20, far: 110 }); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.04; sun.shadow.radius = 3; R.add(sun, sun.target);
    R.add(new THREE.HemisphereLight("#cfe4ff", "#d8c8a0", 1.35)); this.sunDir.copy(dir);
    // the sun itself, low over the sea with a soft glow
    const glow = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,250,235,1)"); gr.addColorStop(0.12, "rgba(255,244,214,0.9)"); gr.addColorStop(0.4, "rgba(255,226,170,0.25)"); gr.addColorStop(1, "rgba(255,220,160,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    const sd = V(dir.x, 0.22, dir.z).normalize(); const sunS = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending, color: new THREE.Color(1.4, 1.3, 1.1), toneMapped: false })); sunS.position.copy(sd.multiplyScalar(250)); sunS.scale.setScalar(90); R.add(sunS);
  }
  update(t: number) {
    const pa = this.sea.geometry.attributes.position as THREE.BufferAttribute, b = this.base;
    for (let i = 0; i < pa.count; i++) { const x = b[i * 3], z = b[i * 3 + 2]; pa.setY(i, 0.09 * Math.sin(x * 0.35 + z * 0.6 + t * 1.6) + 0.06 * Math.sin(x * 0.9 - z * 0.4 + t * 2.3) + 0.12 * Math.sin(z * 0.45 + t * 1.1) * Math.min(1, (SHORE - z) / 6)); }
    pa.needsUpdate = true; this.sea.geometry.computeVertexNormals();
    const nm = (this.sea.material as THREE.MeshPhysicalMaterial).normalMap!; nm.offset.set(t * 0.004, t * 0.009);
    this.foam.forEach((f, k) => { const ph = ((t / 5.5 + k / 3) % 1), run = Math.sin(ph * Math.PI); const z = SHORE - 0.8 + 2.4 * run; f.position.set(k * 0.7, sandAt(0, z) + 0.03, z); (f.material as THREE.MeshStandardMaterial).opacity = Math.min(1, 1.4 * Math.sin(ph * Math.PI) + 0.1) * (ph > 0.5 ? 1 - (ph - 0.5) * 1.2 : 1); });
  }
}
