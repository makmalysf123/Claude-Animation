// Finds flicker in a rendered video, no Python needed. Decodes every frame small and grey, then:
//  1. spikes: a frame much more different from the one before than its neighbours are;
//  2. brightness pops; 3. frozen frames (identical to the previous one);
//  4. TAB-PATTERN test (idea and thresholds from the MIT-licensed inkbeat-shorts skill, scripts/flicker.py,
//     Copyright (c) the inkbeat-shorts contributors): Remotion renders with several browser tabs; a tab that draws
//     differently (random numbers, state set once per tab, GPU overload) makes a one-frame spike that repeats every
//     k frames. Each frame is measured on a 3x4 grid; a frame that differs from BOTH neighbours while the neighbours
//     agree is a one-frame spike; spikes piling up on one residue modulo k (2..16) = a broken tab. Exit code 3.
// usage: node scripts/flicker_check.mjs <video.mp4> [k=2.5]
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

// --- tab-pattern test: 3 columns x 4 rows of tiles (30 x 40 px each) ---
const GX = 3, GY = 4, TW = W / GX, TH = H / GY, TH_SPIKE = 4;
const tile = Array.from({ length: N }, (_, f) => { const o = new Float64Array(GX * GY); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) o[Math.floor(y / TH) * GX + Math.floor(x / TW)] += buf[f * W * H + y * W + x]; return o.map((v) => v / (TW * TH)); });
const spikes = [], score = [];
for (let f = 1; f < N - 1; f++) { let hit = false, sc = -1e9; for (let i = 0; i < GX * GY; i++) { const a = tile[f - 1][i], b = tile[f][i], c = tile[f + 1][i], sp = Math.min(Math.abs(b - a), Math.abs(b - c)), cons = Math.abs(a - c); if (sp > TH_SPIKE && cons < sp * 0.35) hit = true; sc = Math.max(sc, sp - 0.5 * cons); } if (hit) spikes.push(f); score.push([f, sc]); }
let best = null;
for (let k = 2; k <= 16; k++) { const cnt = new Array(k).fill(0); spikes.forEach((f) => cnt[f % k]++); const r0 = cnt.indexOf(Math.max(...cnt)), frames = Math.ceil((N - r0) / k), tot = cnt.reduce((a, b) => a + b, 0);
  if (cnt[r0] >= 5 && cnt[r0] >= Math.sqrt(frames) && cnt[r0] > (2.5 * (tot - cnt[r0])) / (k - 1) && (!best || cnt[r0] >= 0.9 * best[2])) best = [k, r0, cnt[r0]]; } // a stride-8 tab also piles up mod 2 and 4: keep the largest k
console.log(`one-frame spikes (3x4 grid): ${spikes.length ? spikes.slice(0, 60).join(",") + (spikes.length > 60 ? " ..." : "") : "none"}`);
console.log(`strongest odd-one-out frames: ${score.sort((a, b) => b[1] - a[1]).slice(0, 5).map(([f, s]) => `${f} (${(f / 30).toFixed(2)} s, ${s.toFixed(1)})`).join(", ")}`);
console.log(best ? `TAB PATTERN: every ${best[0]} frames (frames = ${best[1]} mod ${best[0]}, ${best[2]} spikes) -> a render tab draws differently` : "tab pattern: none");
if (best) process.exit(3);
