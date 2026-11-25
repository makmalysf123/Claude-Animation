// Tempo meter of a rendered video, no Python needed: camera beats per minute, % still frames, % fast frames, hard cuts
// and brightness (mean CIE L*). Definitions and targets follow the MIT-licensed inkbeat-shorts skill
// (scripts/analyze_pacing.py, Copyright (c) the inkbeat-shorts contributors), so the numbers are comparable:
// - frames decoded at 180x320, every 4th pixel kept, grey = 0.299 R + 0.587 G + 0.114 B;
// - change10 = mean absolute grey change between frames 10 apart, smoothed over 5 frames;
// - a BEAT = a peak of change10 above 20, peaks at least 12 frames apart; STILL < 8, FAST > 35;
// - a HARD CUT = scene score > 0.3 (Remotion's ffmpeg has no `select` filter, so the score is recomputed here the way
//   ffmpeg does it: min(frame difference, change of the frame difference) / 100, an approximation).
// Their targets for a viral 3D cartoon Short: 56 +- 4 beats/min, still 5-20%, fast <= 35%, cuts ~0, L* >= 50.
// Our calm house style (camera holds at stops) sits lower on purpose; compare versions, not only the targets.
// usage: node scripts/pacing.mjs <video.mp4> [fps=30] [--json out.json]
import { spawn } from "node:child_process";
import fs from "node:fs";
const args = process.argv.slice(2), vid = args[0], FPS = Number(args[1] && !args[1].startsWith("--") ? args[1] : 30);
const jsonOut = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;
if (!vid) { console.error("usage: node scripts/pacing.mjs <video.mp4> [fps] [--json out.json]"); process.exit(1); }
const W = 180, H = 320, FB = W * H * 3, GW = W / 4, GH = H / 4;
const FFD = "node_modules/@remotion/compositor-darwin-arm64";

const lin = new Float64Array(256).map((_, i) => { const c = i / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
const lstar = (y) => 116 * (y > 216 / 24389 ? Math.cbrt(y) : (24389 / 27 * y + 16) / 116) - 16;
const greys = [], Ls = [], mafd = [];
let pend = Buffer.alloc(0), prevFull = null;
const take = (fr) => {
  const g = new Float32Array(GW * GH);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const o = (y * 4 * W + x * 4) * 3; g[y * GW + x] = 0.299 * fr[o] + 0.587 * fr[o + 1] + 0.114 * fr[o + 2]; }
  greys.push(g);
  let L = 0, n = 0; for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) { const o = (y * W + x) * 3; L += lstar(0.2126 * lin[fr[o]] + 0.7152 * lin[fr[o + 1]] + 0.0722 * lin[fr[o + 2]]); n++; }
  Ls.push(L / n);
  if (prevFull) { let s = 0; for (let i = 0; i < FB; i++) s += Math.abs(fr[i] - prevFull[i]); mafd.push(s / FB); } else mafd.push(0);
  prevFull = Buffer.from(fr);
};
const p = spawn(`${FFD}/ffmpeg`, ["-v", "error", "-i", vid, "-vf", `scale=${W}:${H}`, "-pix_fmt", "rgb24", "-c:v", "rawvideo", "-f", "image2pipe", "-"], { env: { ...process.env, DYLD_LIBRARY_PATH: FFD } });
p.stdout.on("data", (d) => { pend = Buffer.concat([pend, d]); while (pend.length >= FB) { take(pend.subarray(0, FB)); pend = pend.subarray(FB); } });
p.stderr.on("data", (d) => process.stderr.write(d));
p.on("close", (code) => {
  if (code) process.exit(1);
  const n = greys.length, dur = n / FPS, BK = 10;
  const d = new Float64Array(n);
  for (let f = BK; f < n; f++) { let s = 0; const a = greys[f], b = greys[f - BK]; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); d[f] = s / a.length; }
  const ds = d.map((_, i) => { let s = 0; for (let j = i - 2; j <= i + 2; j++) if (j >= 0 && j < n) s += d[j]; return s / 5; });
  const peaks = []; for (let i = 1; i < n - 1; i++) if (ds[i] >= ds[i - 1] && ds[i] > ds[i + 1] && ds[i] > 20) peaks.push(i);
  const sel = []; for (const q of peaks.sort((a, b) => ds[b] - ds[a])) if (sel.every((s) => Math.abs(q - s) >= 12)) sel.push(q);
  const beats = sel.map((q) => Math.max(0, q - BK / 2)).sort((a, b) => a - b);
  const cuts = []; for (let f = 1; f < n; f++) { const sc = Math.min(mafd[f], Math.abs(mafd[f] - mafd[f - 1])) / 100; if (sc > 0.3) cuts.push(f); }
  const body = Array.from(ds.slice(BK)), pct = (a, q) => [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) * q)];
  const per10 = Array.from({ length: Math.ceil(dur / 10) }, (_, k) => beats.filter((b) => b / FPS >= k * 10 && b / FPS < (k + 1) * 10).length);
  const still = body.filter((v) => v < 8).length / body.length, fast = body.filter((v) => v > 35).length / body.length;
  const m = {
    frames: n, duration_s: +dur.toFixed(2), beats: beats.length, beats_per_min: +((beats.length / dur) * 60).toFixed(1), beats_per_10s: per10,
    frac_still: +still.toFixed(3), frac_fast: +fast.toFixed(3), hard_cuts: cuts.length, cut_times_s: cuts.map((c) => +(c / FPS).toFixed(2)),
    L_mean: +(Ls.reduce((a, b) => a + b, 0) / n).toFixed(1), L_p5: +pct(Ls, 0.05).toFixed(1), L_p95: +pct(Ls, 0.95).toFixed(1),
    beat_times_s: beats.map((b) => +(b / FPS).toFixed(2)),
  };
  console.log(`${vid}: ${m.frames} frames, ${m.duration_s} s`);
  console.log(`  beats ${m.beats} = ${m.beats_per_min}/min   (Shorts target 52-60; per 10 s: ${per10.join(" ")})`);
  console.log(`  still ${(still * 100).toFixed(0)}%   (Shorts 5-20%)    fast ${(fast * 100).toFixed(0)}%   (Shorts <= 35%)`);
  console.log(`  hard cuts ${m.hard_cuts}${cuts.length ? " at " + m.cut_times_s.join(", ") + " s" : ""}   (Shorts ~0)`);
  console.log(`  brightness L* mean ${m.L_mean} (p5 ${m.L_p5}, p95 ${m.L_p95})   (day frames ~50-54)`);
  console.log(`  beat times s: ${m.beat_times_s.join(" ")}`);
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(m, null, 1));
});
