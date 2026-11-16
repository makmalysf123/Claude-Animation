// Tiny local receiver for reference-video studies: the in-app browser seeks a video frame by frame and POSTs each
// frame (JPEG) or a JSON blob here; files land under out/refstudy/<study>/.
//   POST /save?study=<id>&name=<file>   body = raw bytes
// Only listens on 127.0.0.1. Started through .claude/launch.json ("frame-sink").
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("out/refstudy");
const PORT = 8765;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Private-Network": "true",
};
const safe = (s) => String(s || "").replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 80);

http.createServer((req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
  const u = new URL(req.url, "http://x");
  // GET /: a relay page. Pages with a strict CSP (YouTube) cannot fetch localhost, but they can window.open() this page
  // and postMessage({study, name, data: ArrayBuffer|Blob}) to it; the relay POSTs it here and answers {ack: name}.
  if (req.method === "GET") {
    res.writeHead(200, { ...cors, "Content-Type": "text/html" });
    return res.end(`<!doctype html><title>frame-sink relay</title><body style="font:14px monospace;background:#111;color:#9f9">relay ready <span id=n>0</span>
<script>let n=0;addEventListener('message',async(e)=>{const m=e.data;if(!m||!m.name)return;
await fetch('/save?study='+encodeURIComponent(m.study)+'&name='+encodeURIComponent(m.name),{method:'POST',body:m.data});
document.getElementById('n').textContent=++n;e.source.postMessage({ack:m.name},'*');});</script>`);
  }
  if (req.method !== "POST" || u.pathname !== "/save") { res.writeHead(404, cors); return res.end(); }
  const study = safe(u.searchParams.get("study")), name = safe(u.searchParams.get("name"));
  if (!study || !name) { res.writeHead(400, cors); return res.end("need study + name"); }
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const dir = path.join(ROOT, study); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name), Buffer.concat(chunks));
    res.writeHead(200, cors); res.end("ok");
  });
}).listen(PORT, "127.0.0.1", () => console.log(`frame-sink on http://127.0.0.1:${PORT} -> ${ROOT}`));
