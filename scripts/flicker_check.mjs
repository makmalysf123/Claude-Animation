// Finds one-frame flicker in a rendered video, no Python needed: decodes every frame small and grey, measures how much
// each frame differs from the one before, and flags spikes (a frame much more different than its neighbours) and
// brightness pops. usage: node scripts/flicker_check.mjs <video.mp4> [k=2.5]
import { spawnSync } from "node:child_process";
const [vid, kArg = "2.5"] = process.argv.slice(2), K = Number(kArg), W = 90, H = 160;
const ff = "node_modules/@remotion/compositor-darwin-arm64/ffmpeg";
const r = spawnSync(ff, ["-v", "error", "-i", vid, "-vf", `scale=${W}:${H}:flags=area,format=gray`, "-c:v", "rawvideo", "-f", "image2pipe", "-"], { maxBuffer: 1 << 30, env: { ...process.env, DYLD_LIBRARY_PATH: "node_modules/@remotion/compositor-darwin-arm64" } });
if (r.status !== 0) { console.error(String(r.stderr)); process.exit(1); }
const buf = r.stdout, N = buf.length / (W * H), luma = [], diff = [0];
for (let f = 0; f < N; f++) { let s = 0, d = 0; for (let i = 0; i < W * H; i++) { const v = buf[f * W * H + i]; s += v; if (f) d += Math.abs(v - buf[(f - 1) * W * H + i]); } luma.push(s / (W * H)); if (f) diff.push(d / (W * H)); }
const med = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];
const flags = [];
for (let f = 2; f < N - 2; f++) {
  const loc = med([diff[f - 2], diff[f - 1], diff[f + 1], diff[f + 2]]);
  if (diff[f] > K * Math.max(loc, 0.25) && diff[f] > 0.8) flags.push(`${f} diff ${diff[f].toFixed(2)} vs ~${loc.toFixed(2)}`);
  const lb = (luma[f - 1] + luma[f + 1]) / 2; if (Math.abs(luma[f] - lb) > 1.5) flags.push(`${f} luma pop ${luma[f].toFixed(1)} vs ${lb.toFixed(1)}`);
}
console.log(`frames ${N}; mean diff ${(diff.reduce((a, b) => a + b, 0) / N).toFixed(2)}, max ${Math.max(...diff).toFixed(2)} at ${diff.indexOf(Math.max(...diff))}`);
console.log(flags.length ? "FLAGS:\n" + flags.join("\n") : "no spikes or pops");
const still = diff.map((d, f) => (f && d < 0.02 ? f : -1)).filter((f) => f > 0); console.log(`frozen frames (identical to previous): ${still.length ? still.join(",") : "none"}`);
