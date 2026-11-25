// Smooth camera moves for any video: one unbroken take built from a list of moves (first used in RoomCamTest).
// Each move starts exactly where the one before ended and is eased with smootherstep (speed AND acceleration are zero
// at both ends), so nothing jumps or jerks. Pure maths (no three.js), so a node script can check every frame
// (see scripts/roomcam_check.mjs). Guide with examples: docs/tech/camera-moves.md.
//
//   const cam = makeCam(START, [ { kind: "line", dur: 3, to: {...} }, { kind: "orbit", dur: 3, c: [...], to: {...} } ], { speed: 1.5 });
//   act: ({ t, cam: c }) => applyCam(c, cam.at(t))       // cam.seconds = total length after the speed change
export type V3 = [number, number, number];
/** p = camera position, l = point it looks at, f = vertical field of view (smaller = more zoom), up = top of frame */
export type Pose = { p: V3; l: V3; f: number; up?: V3 };
export type Move = { name?: string; dur: number } & (
  | { kind: "line"; to: Pose; via?: V3 } // dolly / push-in / pull-out / crane (via = bend point for a curved path)
  | { kind: "orbit"; to: Pose; c: V3 } // arc around point c (angle, radius and height blend)
  | { kind: "pan"; to: Pose } // turn the head: the look direction swings by angle, not through the middle
  | { kind: "hold"; to?: Partial<Pose> } // stay put; may still change fov (lens zoom) or up (spin)
);
export type CamOpts = { speed?: number; drift?: number };
export type CamState = { p: V3; l: V3; f: number; up: V3 };

const ease = (u: number) => { u = Math.min(1, Math.max(0, u)); return u * u * u * (u * (u * 6 - 15) + 10); };
const mix = (a: number, b: number, u: number) => a + (b - a) * u;
const mixV = (a: V3, b: V3, u: number): V3 => [mix(a[0], b[0], u), mix(a[1], b[1], u), mix(a[2], b[2], u)];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const angMix = (a: number, b: number, u: number) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * u; };
const UP: V3 = [0, 1, 0];

/** straight down at (x, z) from height y, looking at floor height `floor`; `up` = which floor direction is the top of the frame */
export const topDown = (x: number, y: number, z: number, f: number, up: V3, floor = 0.3): Pose => ({ p: [x, y, z], l: [x, floor, z], f, up });

/**
 * Build a camera from a start pose and a list of moves. `speed` > 1 makes every move faster (1.5 = 1.5x faster,
 * the take gets shorter); `drift` = metres of slow wander so no frame is ever frozen (0 to switch off).
 */
export const makeCam = (start: Pose, moves: Move[], opts: CamOpts = {}) => {
  const k = 1 / (opts.speed ?? 1), dr = opts.drift ?? 0.003;
  const ends: number[] = []; let acc = 0; for (const m of moves) ends.push((acc += m.dur * k));
  const poses: Pose[] = []; let a = start;
  for (const m of moves) { a = m.kind === "hold" ? { ...a, ...(m.to ?? {}), p: a.p, l: a.l } : m.to; poses.push(a); }
  const at = (t: number): CamState => {
    let i = ends.findIndex((e) => t < e); if (i < 0) i = moves.length - 1;
    const m = moves[i], a = i ? poses[i - 1] : start, b = poses[i], t0 = i ? ends[i - 1] : 0;
    const u = ease((t - t0) / (ends[i] - t0)), upA = a.up ?? UP, upB = b.up ?? UP;
    let p: V3, l: V3;
    if (m.kind === "line") {
      if (m.via) { const w0 = (1 - u) * (1 - u), w1 = 2 * u * (1 - u), w2 = u * u; p = [0, 1, 2].map((j) => w0 * a.p[j] + w1 * m.via![j] + w2 * b.p[j]) as V3; }
      else p = mixV(a.p, b.p, u);
      l = mixV(a.l, b.l, u);
    } else if (m.kind === "orbit") {
      const ra = sub(a.p, m.c), rb = sub(b.p, m.c);
      const ang = angMix(Math.atan2(ra[2], ra[0]), Math.atan2(rb[2], rb[0]), u), r = mix(Math.hypot(ra[0], ra[2]), Math.hypot(rb[0], rb[2]), u);
      p = [m.c[0] + r * Math.cos(ang), m.c[1] + mix(ra[1], rb[1], u), m.c[2] + r * Math.sin(ang)]; l = mixV(a.l, b.l, u);
    } else if (m.kind === "pan") {
      p = mixV(a.p, b.p, u); const da = sub(a.l, a.p), db = sub(b.l, b.p);
      const yaw = angMix(Math.atan2(da[2], da[0]), Math.atan2(db[2], db[0]), u), pit = mix(Math.atan2(da[1], Math.hypot(da[0], da[2])), Math.atan2(db[1], Math.hypot(db[0], db[2])), u), d = mix(len(da), len(db), u);
      l = add(p, [d * Math.cos(pit) * Math.cos(yaw), d * Math.sin(pit), d * Math.cos(pit) * Math.sin(yaw)]);
    } else { p = a.p; l = a.l; }
    p = add(p, [dr * Math.sin(t * 0.9 + 1), dr * Math.sin(t * 0.7 + 2), dr * Math.sin(t * 0.8 + 3)]);
    return { p, l, f: mix(a.f, b.f, u), up: norm(mixV(upA, upB, u)) };
  };
  return { at, seconds: acc, ends, moves };
};

/** put a camera state on a three.js PerspectiveCamera (typed loosely so this file needs no three.js import) */
export const applyCam = (cam: { position: { set: (...v: V3) => unknown }; up: { set: (...v: V3) => unknown }; lookAt: (...v: V3) => void; fov: number; updateProjectionMatrix: () => void; updateMatrixWorld: () => void }, c: CamState) => {
  cam.position.set(...c.p); cam.up.set(...c.up); cam.lookAt(...c.l); cam.fov = c.f; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
};
