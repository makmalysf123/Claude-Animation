// Motion blur, step 2: averages every group of k frames of a "...Blur" render (k samples per frame across a 180 degree
// shutter, see SubCtx in src/lib/scene.tsx) into one 30 fps frame. Remotion's ffmpeg has no tmix/select filter, so the
// averaging happens here: decode raw RGB -> mean of k frames -> PNG -> H.264 (crf 16). No Python needed.
// usage: node scripts/motion_blur.mjs <in_120fps.mp4> <out.mp4> [k=4] [fps=30]
// Recipe from the MIT-licensed inkbeat-shorts skill (render-and-qa.md).
import { spawn } from "node:child_process";
import zlib from "node:zlib";
const [inp, outp, kArg = "4", fpsArg = "30"] = process.argv.slice(2);
if (!inp || !outp) { console.error("usage: node scripts/motion_blur.mjs <in.mp4> <out.mp4> [k=4] [fps=30]"); process.exit(1); }
const K = Number(kArg), FPS = Number(fpsArg), FFD = "node_modules/@remotion/compositor-darwin-arm64", env = { ...process.env, DYLD_LIBRARY_PATH: FFD };
const probe = await new Promise((res) => { const p = spawn(`${FFD}/ffprobe`, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", inp], { env }); let o = ""; p.stdout.on("data", (d) => (o += d)); p.on("close", () => res(o.trim())); });
const [W, H] = probe.split(",").map(Number); if (!W || !H) { console.error("could not read size of", inp); process.exit(1); }
const FB = W * H * 3;

/** minimal PNG writer: 8-bit RGB, "Sub" filter per row, fast deflate */
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0); return Buffer.concat([len, td, crc]); };
const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
const png = (rgb) => {
  const raw = Buffer.alloc(H * (W * 3 + 1));
  for (let y = 0; y < H; y++) { const o = y * (W * 3 + 1), s = y * W * 3; raw[o] = 1; for (let i = 0; i < W * 3; i++) raw[o + 1 + i] = (rgb[s + i] - (i >= 3 ? rgb[s + i - 3] : 0)) & 255; }
  return Buffer.concat([SIG, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 1 })), chunk("IEND", Buffer.alloc(0))]);
};

const dec = spawn(`${FFD}/ffmpeg`, ["-v", "error", "-i", inp, "-pix_fmt", "rgb24", "-c:v", "rawvideo", "-f", "image2pipe", "-"], { env });
const enc = spawn(`${FFD}/ffmpeg`, ["-v", "error", "-y", "-f", "image2pipe", "-c:v", "png", "-framerate", String(FPS), "-i", "-", "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-r", String(FPS), outp], { env });
enc.stderr.on("data", (d) => process.stderr.write(d)); dec.stderr.on("data", (d) => process.stderr.write(d));
const acc = new Uint16Array(FB), out = Buffer.alloc(FB);
let pend = Buffer.alloc(0), inFrames = 0, outFrames = 0;
const frame = (fr) => {
  for (let i = 0; i < FB; i++) acc[i] += fr[i];
  if (++inFrames % K === 0) {
    for (let i = 0; i < FB; i++) { out[i] = (acc[i] + (K >> 1)) / K; acc[i] = 0; }
    outFrames++; if (outFrames % 60 === 0) process.stdout.write(`\r${outFrames} frames`);
    if (!enc.stdin.write(png(out))) { dec.stdout.pause(); enc.stdin.once("drain", () => dec.stdout.resume()); }
  }
};
dec.stdout.on("data", (d) => { pend = pend.length ? Buffer.concat([pend, d]) : d; while (pend.length >= FB) { frame(pend.subarray(0, FB)); pend = pend.subarray(FB); } });
dec.on("close", (code) => { if (code) { console.error("decode failed"); process.exit(1); } if (inFrames % K) console.warn(`\nwarning: ${inFrames % K} leftover frames (input frames not a multiple of ${K})`); enc.stdin.end(); });
enc.on("close", (code) => { console.log(`\n${inFrames} samples -> ${outFrames} frames at ${FPS} fps: ${outp}`); process.exit(code ?? 0); });
