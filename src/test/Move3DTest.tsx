// Motion test 2026-11-18 for the full-3D cast (src/lib/char3d.ts), in the Kopi kedai (day).
// Shot A (0 - 3.45): Pak Darto strolls in whistling, stops, glances at the camera, looks away, DOUBLE TAKE (hop, peci
// pops up, hands up), turns to face us. Shot B (3.45 - 6.6): closer; "Lho?" ... looks at his own hands ... "Kok aku
// jadi tiga dimensi?!", ends grinning with open hands. Mbak Sari idles at the back and flinches at the double take.
import React from "react";
import * as THREE from "three";
import { Reel, SceneDef, V3, Ctx } from "../lib/scene";
import { KedaiSet } from "../videos/kopi/kedai";
import { Char3, Face3, Traits, paintFace, faceKey, V } from "../lib/char3d";
import { MOODS, MoodName, Word, speechAt, kick, spring, sm, clamp01, noise } from "../lib/acting";
import type { Mouth } from "../lib/toon2";
import { mkBapak, mkSari } from "./Char3DTest";

export const MOVE3D_FRAMES = 198;
const T_DARTO: Traits = { eyeX: 0.3, eyeY: 0.04, eyeR: 0.15, pupil: 0.06, browY: 0.26, browW: 0.34, browK: 2.4, mouthY: -0.41, mouthW: 0.3, mustache: true, creases: true };
const T_SARI: Traits = { eyeX: 0.28, eyeY: 0.02, eyeR: 0.17, pupil: 0.085, browY: 0.3, browW: 0.3, browK: 1.3, mouthY: -0.33, mouthW: 0.4, lashes: true, blush: true };

// ---------------- timing ----------------
const X0 = -1.0, X1 = -0.1, Z = 1.72, T_DEC = 2.0, D = 0.32, T_STOP = T_DEC + D; // walk, then ease to a stop
const V_W = (X1 - X0) / (T_DEC + D / 2), STEP = 0.24; // speed (m/s) and stance travel per step
const dist = (t: number) => (t < T_DEC ? V_W * t : t < T_STOP ? V_W * T_DEC + V_W * ((t - T_DEC) - ((t - T_DEC) ** 2) / (2 * D)) : X1 - X0);
const T_TAKE = 2.86, T_TURN0 = 2.9, T_TURN1 = 3.22, CUT = 3.45, END = MOVE3D_FRAMES / 30;
const WORDS: Word[] = [
  { w: "Lho", t0: 3.62, t1: 3.92, stress: true },
  { w: "Kok", t0: 4.42, t1: 4.6 }, { w: "aku", t0: 4.6, t1: 4.86 }, { w: "jadi", t0: 4.86, t1: 5.1 },
  { w: "tiga", t0: 5.16, t1: 5.44, stress: true }, { w: "dimensi", t0: 5.44, t1: 6.02, stress: true },
];
const at = (t: number, a: number, b: number) => sm((t - a) / (b - a));
const blinkAt = (t: number, times: number[]) => { let b = 0; for (const s of times) { const x = (t - s) / 0.13; if (x > 0 && x < 1) b = Math.max(b, 1 - Math.abs(2 * x - 1)); } return b; };

// ---------------- arm poses (relative to the shoulder, +x side) ----------------
type AP = [THREE.Vector3, THREE.Vector3];
const P = (e: V3, w: V3): AP => [V(...e), V(...w)];
const POSE = {
  rest: P([0.035, -0.165, 0.0], [0.045, -0.32, 0.045]), up: P([0.21, 0.02, -0.01], [0.33, 0.15, -0.02]), palms: P([0.1, -0.16, 0.1], [0.01, -0.08, 0.27]),
  chest: P([0.12, -0.15, 0.07], [-0.06, -0.11, 0.19]), open: P([0.15, -0.11, 0.07], [0.26, -0.05, 0.15]),
};
const swing = (a: number): AP => { const e = V(0.035, -0.165 * Math.cos(a), 0.165 * Math.sin(a)), b = a + 0.25 + 0.15 * Math.abs(a); return [e, e.clone().add(V(0.01, -0.16 * Math.cos(b), 0.16 * Math.sin(b)))]; };
const mix = (a: AP, b: AP, u: number): AP => [a[0].clone().lerp(b[0], u), a[1].clone().lerp(b[1], u)];
/** pose track: [time, pose] keys, each blended in over `dur` */
const track = (t: number, keys: [number, AP][], dur = 0.16) => { let p = keys[0][1]; for (const [k, q] of keys) if (t >= k) p = mix(p, q, sm((t - k) / dur)); return p; };

// ---------------- face ----------------
const face = (mood: MoodName, mouth: Mouth | null, look: [number, number], blink: number, over: Partial<Face3> = {}): Face3 => {
  const M = MOODS[mood]; return { eyes: M.eyes, brows: M.brows, mouth: mouth ?? M.rest, look, blink, ...over };
};
/** head yaw/pitch (in root space) that points the face at a world point */
const lookYawPitch = (c: Char3, p: THREE.Vector3) => { c.root.updateMatrixWorld(); const l = c.root.worldToLocal(p.clone()); const dy = l.y - c.headY; return [Math.atan2(l.x, l.z), -Math.atan2(dy, Math.hypot(l.x, l.z))] as [number, number]; };

// ---------------- Pak Darto ----------------
const darto = (c: Char3, t: number, cam: THREE.Camera) => {
  const walk = 1 - at(t, T_DEC, T_STOP + 0.06), d = dist(t), ph = d / (2 * STEP);
  // root: walking along +x, then turning to the camera (airborne, during a small second hop)
  const face0 = Math.PI / 2, camAng = Math.atan2(cam.position.x - X1, cam.position.z - Z) * 0.85 + 0.0;
  const turnTo = t < CUT ? camAng : Math.atan2(0.05, 1); c.root.position.set(X0 + d, 0.03, Z);
  c.root.rotation.y = face0 + (turnTo - face0) * at(t, T_TURN0, T_TURN1);
  // feet: stance foot planted on the floor, swing foot lifted; blend to the rest stance while stopping
  for (let i = 0; i < 2; i++) { const p = (((ph + i * 0.5) % 1) + 1) % 1, rest = c.restFoot(i); let z: number, y = 0.06, pitch = 0;
    if (p < 0.5) { z = STEP / 2 - (p / 0.5) * STEP; pitch = 0.3 * sm((p - 0.36) / 0.14); }
    else { const s = (p - 0.5) / 0.5; z = -STEP / 2 + STEP * sm(s); y += 0.065 * Math.sin(Math.PI * s); pitch = -0.35 * Math.sin(Math.PI * s); }
    c.setLeg(i, rest.clone().lerp(V(rest.x, y, z), walk), pitch * walk); }
  // body: bob twice per cycle, sway, lean; the double take hop with squash and stretch; the turn hop
  const hop = Math.max(0, Math.sin(Math.PI * clamp01((t - T_TAKE) / 0.26))) * 0.075 + Math.max(0, Math.sin(Math.PI * clamp01((t - (T_TAKE + 0.3)) / 0.22))) * 0.03;
  const squash = -0.07 * Math.max(0, Math.sin(Math.PI * clamp01((t - (T_TAKE - 0.08)) / 0.1))) + 0.06 * kick(t, T_TAKE, 3.2, 0.35) - 0.04 * Math.max(0, Math.sin(Math.PI * clamp01((t - (T_TAKE + 0.26)) / 0.1)));
  c.body.position.y = walk * 0.016 * (0.5 - 0.5 * Math.cos(4 * Math.PI * ph)) + hop + 0.003 * Math.sin(t * 2.3) * (1 - walk);
  c.body.scale.set(1 - squash * 0.5, 1 + squash, 1 - squash * 0.5);
  c.body.rotation.set(0.07 * walk - 0.06 * kick(t, T_TAKE, 2.2, 0.3) + 0.02 * noise(t, 3) * (1 - walk), 0, 0.035 * walk * Math.sin(2 * Math.PI * ph));
  // arms
  const sw = (i: number) => swing(0.42 * walk * Math.cos(2 * Math.PI * ((ph + (1 - i) * 0.5) % 1)));
  for (let i = 0; i < 2; i++) {
    let a = t < T_STOP ? sw(i) : mix(sw(i), POSE.rest, at(t, T_STOP - 0.05, T_STOP + 0.2));
    a = track(t, [[0, a], [T_TAKE - 0.02, POSE.up], [3.98, POSE.palms], [4.62, i === 1 ? POSE.chest : POSE.rest], [5.3, POSE.open]], 0.14);
    if (t > T_TAKE && t < 3.98) { const k = 0.05 * kick(t, T_TAKE + 0.06, 3, 0.3); a = [a[0].clone().add(V(0, k, 0)), a[1].clone().add(V(0.01 * Math.sin(t * 40) * (1 - at(t, 3.0, 3.4)), k * 1.6, 0))]; }
    if (t > 5.3) { const g = 0.03 * kick(t, 5.44, 2.4, 0.3); a = [a[0], a[1].clone().add(V(0, g, 0))]; }
    c.armRel(i, a[0], a[1]); }
  // head: forward on the walk, a quick glance at the lens, back, then the snap; looks down at his hands; back at us
  const [cy, cp] = lookYawPitch(c, cam.position.clone());
  const glance = at(t, 2.32, 2.44) * (1 - at(t, 2.52, 2.7)) * 0.55, snap = at(t, T_TAKE - 0.03, T_TAKE + 0.05), down = at(t, 3.98, 4.15) * (1 - at(t, 4.5, 4.66));
  let yaw = cy * Math.max(glance, snap), pitch = cp * Math.max(glance, snap);
  if (t >= CUT) { yaw = cy; pitch = cp; }
  pitch = pitch * (1 - down) + 0.5 * down; yaw *= 1 - down * 0.7;
  const sp = speechAt(WORDS, t, t > 5.1 ? "excited" : "normal", 7);
  const pop = (sp.stressT !== null ? 0.07 * kick(t, sp.stressT, 4, 0.35) : 0) + 0.1 * kick(t, T_TAKE, 3.5, 0.3);
  c.head.rotation.set(pitch + 0.04 * Math.sin(4 * Math.PI * ph) * walk + 0.03 * kick(t, sp.stressT ?? -9, 3, 0.4), yaw, 0.05 * Math.sin(t * 0.9) * (1 - walk) - 0.08 * at(t, 6.05, 6.3));
  const big = t > T_TAKE && t < 3.95 ? 1 : 0; c.head.scale.set(1 + pop * 0.6 + 0.03 * big, 1 + pop + 0.07 * big, 1 + pop * 0.6);
  // peci pops off the head and lands back
  if (c.hat) { const hh = Math.max(0, Math.sin(Math.PI * clamp01((t - (T_TAKE + 0.02)) / 0.34))); c.hat.position.y = c.hatY + 0.11 * hh; c.hat.rotation.z = 0.25 * hh * Math.sin(t * 9) + 0.08 * kick(t, T_TAKE + 0.36, 3, 0.3); }
  // face
  const bl = blinkAt(t, [0.9, 2.58, 4.3, 5.95]);
  let f: Face3;
  if (t < 2.3) f = face("smug", { kind: "oo", open: 0.25 + 0.15 * Math.sin(t * 13), w: 0.9 }, [0.9, 0.1], bl); // strolling, whistling
  else if (t < T_TAKE - 0.03) f = face("neutral", null, glance > 0.05 ? [-0.9, 0] : [0.5, 0], bl);
  else if (t < 3.98) f = face("shock", sp.mouth ?? { kind: "zigzag", open: 0.55 + 0.1 * Math.sin(t * 30) }, [0, 0], 0);
  else if (t < 4.5) f = face("surprised", { kind: "o", open: 0.35 }, [0, -0.85], bl);
  else if (t < 6.02) f = face(t > 5.1 ? "excited" : "surprised", sp.mouth, [0, 0], bl);
  else f = face("excited", { kind: "smileBig", open: 0.75 }, [0, 0.05], bl);
  c.face.draw(faceKey(f), paintFace(T_DARTO, f));
};

// ---------------- Mbak Sari (background) ----------------
const SARI_AT: [number, number] = [0.74, 1.32];
const sari = (c: Char3, t: number, cam: THREE.Camera, dartoHead: THREE.Vector3) => {
  c.root.position.set(SARI_AT[0], 0.03, SARI_AT[1]); c.root.rotation.y = -0.35;
  const flinch = spring(t, T_TAKE + 0.08, 3, 0.4), k = kick(t, T_TAKE + 0.08, 3.4, 0.3);
  c.body.position.y = 0.004 * Math.sin(t * 2.1) + 0.03 * Math.max(0, k); c.body.rotation.x = -0.08 * Math.max(0, k);
  const [dy, dp] = lookYawPitch(c, dartoHead), [cy, cp] = lookYawPitch(c, cam.position.clone());
  const toD = t < 1.4 ? 0 : at(t, 1.4, 1.7) * (t < T_TAKE ? 0.6 : 1);
  c.head.rotation.set(cp * (1 - toD) + dp * toD + 0.02 * Math.sin(t * 1.2), cy * (1 - toD) * 0.5 + dy * toD, 0.05 * Math.sin(t * 0.8) - 0.1 * flinch * (1 - at(t, 4.5, 5.0)));
  const mood: MoodName = t < T_TAKE + 0.06 ? "neutral" : t < 4.6 ? "surprised" : "laugh";
  const f = face(mood, mood === "neutral" ? { kind: "smile", open: 0 } : mood === "laugh" ? { kind: "laugh", open: 0.6 + 0.25 * Math.abs(Math.sin(t * 14)) } : { kind: "o", open: 0.3 }, [0.4, 0], blinkAt(t, [0.5, 2.2, 3.9, 5.6]));
  c.face.draw(faceKey(f), paintFace(T_SARI, f));
};

// ---------------- scenes ----------------
const DAY = { fog: "#efd9b6", dens: 0.009, bg: "#cfe0f2", cInf: 6, env: 0.42, exposure: 0.03, bloom: 0.42, sat: 0.2, contrast: 0.12, grade: [[0.4, 0.5, 0.58], [0.64, 0.54, 0.4], 0.32] as [V3, V3, number] };
type Cast = { cast: Char3[] };
const mk = () => { const set = new KedaiSet("day"); const cast = [mkBapak(), mkSari()]; cast.forEach((c) => set.root.add(c.root)); return Object.assign(set, { cast }) as unknown as KedaiSet; };
const act = (from: number) => (cx: Ctx) => { const t = cx.t + from, [d, s] = (cx.set as unknown as Cast).cast;
  darto(d, t, cx.cam); d.head.updateMatrixWorld(); sari(s, t, cx.cam, d.head.getWorldPosition(V())); };
const SCENES: SceneDef[] = [
  { from: 0, to: CUT, ...DAY, mk, act: act(0), keys: [{ t: 0, pos: [0.0, 1.02, 5.55], look: [0.0, 0.74, 1.7], fov: 40 }], focus: (t) => [X0 + dist(t), 0.8, Z] },
  { from: CUT, to: END, ...DAY, mk, act: act(CUT), keys: [{ t: 0, pos: [X1 + 0.07, 1.0, 3.55], look: [X1 + 0.01, 0.86, 1.7], fov: 38 }, { t: END - CUT, pos: [X1 + 0.07, 0.99, 3.3], look: [X1 + 0.01, 0.88, 1.7], fov: 38 }], focus: () => [X1, 0.9, Z + 0.1] },
];
export const Move3DTest: React.FC = () => <Reel scenes={SCENES} />;
