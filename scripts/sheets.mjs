// Frame-by-frame study sheets: renders 12 consecutive frames per start (scale 0.25) and tiles them 6 x 2 with frame numbers.
// usage: COMP=<id> node scripts/sheets.mjs <outDir> <start,start,...>
//   -> <outDir>/f_<n>.jpg (single frames) and <outDir>/sheet_<start>.jpg (contact sheets)
// env: GL=<angle|swangle> as in stills.mjs
import fs from "node:fs";
import path from "node:path";
const TMP = process.env.REMOTION_TMP || path.resolve("tmp");
fs.mkdirSync(TMP, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.TMPDIR = TMP;
const { bundle } = await import("@remotion/bundler");
const { renderStill, selectComposition } = await import("@remotion/renderer");
const [outDir, starts] = process.argv.slice(2);
const dir = path.resolve(outDir); fs.mkdirSync(dir, { recursive: true });
const chromiumOptions = { gl: process.env.GL || "angle" };
const onBrowserLog = (l) => { if (l.type === "error") console.log("[error]", l.text.slice(0, 300)); };
const entryPoint = path.resolve("src/index.ts");
// 1) the frames themselves
const serveUrl = await bundle({ entryPoint, publicDir: path.resolve("public") });
const comp = await selectComposition({ serveUrl, id: process.env.COMP, chromiumOptions });
const list = starts.split(",").map(Number);
for (const a of list) for (let f = a; f < a + 12 && f < comp.durationInFrames; f++) {
  const out = path.join(dir, `f_${f}.jpg`); if (fs.existsSync(out)) continue;
  await renderStill({ composition: comp, serveUrl, frame: f, output: out, imageFormat: "jpeg", jpegQuality: 85, scale: 0.25, chromiumOptions, onBrowserLog, timeoutInMilliseconds: 600000 });
}
// 2) the sheets (the frames folder is the public dir of this bundle)
const sheetUrl = await bundle({ entryPoint, publicDir: dir });
for (const a of list) {
  const frames = Array.from({ length: 12 }, (_, i) => a + i).filter((f) => f < comp.durationInFrames);
  const inputProps = { prefix: "f_", frames };
  const sc = await selectComposition({ serveUrl: sheetUrl, id: "ContactSheet", inputProps });
  await renderStill({ composition: sc, serveUrl: sheetUrl, frame: 0, output: path.join(dir, `sheet_${a}.jpg`), imageFormat: "jpeg", jpegQuality: 85, inputProps });
  console.log("sheet", a);
}
