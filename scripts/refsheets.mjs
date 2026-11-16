// Contact sheets of a reference video's extracted frames (out/refstudy/<study>/{small,full}/f_0000.jpg).
// usage: node scripts/refsheets.mjs <framesDir> <outDir> <json spec list>
//   spec: {"name":"ov_000","from":0,"to":39,"step":1,"cols":10,"cellW":162,"cellH":288,"crop":{x,y,w,h,srcW,srcH}}
import fs from "node:fs";
import path from "node:path";
const TMP = process.env.REMOTION_TMP || path.resolve("tmp");
fs.mkdirSync(TMP, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.TMPDIR = TMP;
const { bundle } = await import("@remotion/bundler");
const { renderStill, selectComposition } = await import("@remotion/renderer");
const [framesDir, outDir, specJson] = process.argv.slice(2);
const specs = JSON.parse(specJson.startsWith("@") ? fs.readFileSync(specJson.slice(1), "utf8") : specJson);
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve(framesDir) });
const have = new Set(fs.readdirSync(framesDir));
for (const s of specs) {
  const frames = []; for (let f = s.from; f <= s.to; f += s.step ?? 1) if (have.has(`f_${String(f).padStart(4, "0")}.jpg`)) frames.push(f);
  const inputProps = { prefix: "f_", pad: 4, frames, cols: s.cols ?? 10, cellW: s.cellW ?? 162, cellH: s.cellH ?? 288, crop: s.crop };
  const comp = await selectComposition({ serveUrl, id: "ContactSheet", inputProps });
  await renderStill({ composition: comp, serveUrl, frame: 0, output: path.join(outDir, `${s.name}.jpg`), imageFormat: "jpeg", jpegQuality: 88, inputProps });
  process.stdout.write(s.name + " ");
}
console.log("done");
