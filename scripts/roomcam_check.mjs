// Checks every frame of the RoomCamTest camera: inside the room (with a margin), outside every piece of furniture,
// the up vector never parallel to the view, and no sudden jumps (speed per frame).
// usage: node scripts/roomcam_check.mjs [speed=1]   (speed 1.5 = the take 1.5x faster)
import { buildSync } from "esbuild";
import fs from "node:fs";
import path from "node:path";
const out = path.resolve("tmp/roomcam_check.mjs");
fs.mkdirSync("tmp", { recursive: true });
buildSync({ entryPoints: ["src/videos/room/cam.ts"], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error" });
const { roomCam } = await import(out + "?" + Date.now());
const SPEED = Number(process.argv[2] ?? 1), CAM = roomCam(SPEED), camAt = CAM.at, CAM_SECONDS = CAM.seconds;
const { ROOM, SOLIDS } = await import(out.replace("roomcam_check", "roomcam_layout") + "?x").catch(async () => {
  buildSync({ entryPoints: ["src/videos/room/layout.ts"], bundle: true, format: "esm", platform: "node", outfile: out.replace("roomcam_check", "roomcam_layout"), logLevel: "error" });
  return import(out.replace("roomcam_check", "roomcam_layout") + "?y");
});
const M = 0.18, FPS = 30, N = Math.round(CAM_SECONDS * FPS);
let bad = 0, prev = null, maxV = 0, maxA = 0, pv = 0;
for (let f = 0; f < N; f++) {
  const c = camAt(f / FPS), [x, y, z] = c.p; const why = [];
  if (x < ROOM.x0 + M || x > ROOM.x1 - M || z < ROOM.z0 + M || z > ROOM.z1 - M || y < 0.15 || y > ROOM.h - M) why.push("near wall/floor/ceiling");
  for (const [n, b] of Object.entries(SOLIDS)) if (x > b[0] - M && x < b[3] + M && y > b[1] - M && y < b[4] + M && z > b[2] - M && z < b[5] + M) why.push("in " + n);
  const d = c.l.map((v, k) => v - c.p[k]), dl = Math.hypot(...d), dot = Math.abs((d[0] * c.up[0] + d[1] * c.up[1] + d[2] * c.up[2]) / dl);
  if (dot > 0.94) why.push("up ~ parallel to view " + dot.toFixed(2));
  if (prev) { const v = Math.hypot(x - prev[0], y - prev[1], z - prev[2]); maxV = Math.max(maxV, v); maxA = Math.max(maxA, Math.abs(v - pv)); pv = v; }
  prev = c.p;
  if (why.length) { bad++; if (bad < 40) console.log(f, (f / FPS).toFixed(2), c.p.map((v) => v.toFixed(2)).join(","), why.join("; ")); }
}
CAM.moves.forEach((m, i) => console.log(`${(i ? CAM.ends[i - 1] : 0).toFixed(1).padStart(4)}-${CAM.ends[i].toFixed(1).padStart(4)} s  ${m.name}`));
console.log(`speed ${SPEED}x: frames ${N}, bad ${bad}, max speed ${(maxV * FPS).toFixed(2)} m/s, max speed change/frame ${(maxA * FPS).toFixed(3)} m/s`);
