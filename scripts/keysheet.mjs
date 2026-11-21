// One contact sheet from up to 12 existing stills: node scripts/keysheet.mjs <dir> <prefix> <n,n,...> <out.jpg>
// (stills are <dir>/<prefix><n>.jpg, e.g. from stills.mjs; tiled 6 x 2 by the ContactSheet composition)
import fs from "node:fs";
import path from "node:path";
const TMP = process.env.REMOTION_TMP || path.resolve("tmp");
fs.mkdirSync(TMP, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.TMPDIR = TMP;
const { bundle } = await import("@remotion/bundler");
const { renderStill, selectComposition } = await import("@remotion/renderer");
const [dir, prefix, list, out] = process.argv.slice(2);
const frames = list.split(",").map(Number), inputProps = { prefix, frames };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve(dir) });
const sc = await selectComposition({ serveUrl, id: "ContactSheet", inputProps });
await renderStill({ composition: sc, serveUrl, frame: 0, output: path.resolve(out), imageFormat: "jpeg", jpegQuality: 85, inputProps });
console.log("sheet", out);
