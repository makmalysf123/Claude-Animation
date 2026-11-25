// Full render with a SMALL temp bundle (public/ is linked, not copied). usage:
//   node scripts/render.mjs <CompId> <out.mp4> [frames a-b]
// optional env: PROPS='{"speed":1.5}' (input props), CRF=12, CONCURRENCY=4, GL=swangle
import fs from "node:fs";
import path from "node:path";
const TMP = process.env.REMOTION_TMP || path.resolve("tmp");
fs.mkdirSync(TMP, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.TMPDIR = TMP;
const { bundle } = await import("@remotion/bundler");
const { renderMedia, selectComposition } = await import("@remotion/renderer");
const [id, out, range] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public"), symlinkPublicDir: true });
const chromiumOptions = { gl: process.env.GL || "angle" };
const inputProps = process.env.PROPS ? JSON.parse(process.env.PROPS) : {};
const composition = await selectComposition({ serveUrl, id, chromiumOptions, inputProps });
const frameRange = range ? range.split("-").map(Number) : null;
let last = -1;
await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: path.resolve(out), chromiumOptions, frameRange, inputProps, crf: Number(process.env.CRF || 16), muted: !!process.env.MUTED, timeoutInMilliseconds: 600000,
  ...(process.env.CONCURRENCY ? { concurrency: Number(process.env.CONCURRENCY) } : {}),
  onProgress: ({ progress }) => { const p = Math.floor(progress * 100); if (p >= last + 5) { last = p; console.log(`progress ${p}%`); } } });
console.log("done", out);
