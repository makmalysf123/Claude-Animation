// Tile stills that already exist into one contact sheet (no re-render). usage:
//   node scripts/tilesheet.mjs <dir> <prefix> <frame,frame,...> <out.jpg> [cols] [cellW] [cellH]
import fs from "node:fs";
import path from "node:path";
const TMP = process.env.REMOTION_TMP || path.resolve("tmp");
fs.mkdirSync(TMP, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.TMPDIR = TMP;
const { bundle } = await import("@remotion/bundler");
const { renderStill, selectComposition } = await import("@remotion/renderer");
const [dir, prefix, frames, out, cols = "6", cw = "270", ch = "480"] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve(dir) });
const inputProps = { prefix, frames: frames.split(",").map(Number), cols: Number(cols), cellW: Number(cw), cellH: Number(ch) };
const sc = await selectComposition({ serveUrl, id: "ContactSheet", inputProps });
await renderStill({ composition: sc, serveUrl, frame: 0, output: path.resolve(out), imageFormat: "jpeg", jpegQuality: 85, inputProps });
console.log("sheet", out);
