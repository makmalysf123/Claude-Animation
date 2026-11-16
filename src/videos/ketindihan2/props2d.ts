// Hand-held props drawn into the character cards (same ink style), placed at the hand from toon2.handPoint.
const INK = "#2b1a26";
const stroke = (g: CanvasRenderingContext2D, w: number, c = INK) => { g.lineWidth = w; g.strokeStyle = c; g.lineCap = "round"; g.lineJoin = "round"; g.stroke(); };

/** scissors at (x, y), pointing along `ang`, blades open by `open` (0..1) */
export const drawScissors = (g: CanvasRenderingContext2D, x: number, y: number, ang: number, open: number, s = 1) => {
  g.save(); g.translate(x, y); g.rotate(ang); g.scale(s, s);
  const a = 0.06 + 0.32 * open;
  for (const k of [-1, 1]) {
    g.save(); g.rotate(k * a);
    g.beginPath(); g.moveTo(0, -6); g.lineTo(150, -3); g.lineTo(150, 3); g.lineTo(0, 7); g.closePath();
    const gr = g.createLinearGradient(0, -6, 0, 7); gr.addColorStop(0, "#f2f4f7"); gr.addColorStop(1, "#9aa2ad"); g.fillStyle = gr; g.fill(); stroke(g, 4);
    g.beginPath(); g.ellipse(-38, k * 14, 24, 15, 0, 0, Math.PI * 2); g.fillStyle = k > 0 ? "#d6453a" : "#e0574a"; g.fill(); stroke(g, 5);
    g.beginPath(); g.ellipse(-38, k * 14, 11, 6, 0, 0, Math.PI * 2); g.fillStyle = "#f6f0e6"; g.fill();
    g.restore();
  }
  g.beginPath(); g.arc(0, 0, 6, 0, Math.PI * 2); g.fillStyle = "#555"; g.fill();
  g.restore();
};
/** broom (sapu lidi handle + fan of sticks) held at (x, y), tilted */
export const drawBroom = (g: CanvasRenderingContext2D, x: number, y: number, ang: number) => {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.translate(0, 110); g.beginPath(); g.moveTo(0, -160); g.lineTo(0, 120); stroke(g, 16, INK); g.beginPath(); g.moveTo(0, -160); g.lineTo(0, 120); stroke(g, 9, "#b88a4a");
  g.beginPath(); g.moveTo(-8, 120); g.lineTo(-70, 330); g.lineTo(70, 330); g.lineTo(8, 120); g.closePath(); g.fillStyle = "#c9a35e"; g.fill(); stroke(g, 6);
  for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(i * 1.5, 130); g.lineTo(i * 11, 325); stroke(g, 2, "#8a6a34"); }
  g.restore();
};
/** pillow hugged in front of the chest, between the two hands */
export const drawPillow = (g: CanvasRenderingContext2D, a: [number, number], b: [number, number]) => {
  const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2 + 10, w = Math.max(120, Math.abs(b[0] - a[0]) + 60);
  g.beginPath(); g.ellipse(cx, cy, w / 2, 62, 0, 0, Math.PI * 2); const gr = g.createLinearGradient(0, cy - 60, 0, cy + 60); gr.addColorStop(0, "#f6efe0"); gr.addColorStop(1, "#d8c9ae"); g.fillStyle = gr; g.fill(); stroke(g, 8);
  g.beginPath(); g.moveTo(cx - w / 3, cy - 10); g.quadraticCurveTo(cx, cy + 6, cx + w / 3, cy - 10); stroke(g, 3, "rgba(43,26,38,0.35)");
};
/** fresh diaper held in a hand */
export const drawDiaper = (g: CanvasRenderingContext2D, x: number, y: number) => {
  g.beginPath(); g.moveTo(x - 50, y - 30); g.lineTo(x + 50, y - 30); g.quadraticCurveTo(x + 40, y + 40, x, y + 45); g.quadraticCurveTo(x - 40, y + 40, x - 50, y - 30); g.closePath();
  g.fillStyle = "#fbfbff"; g.fill(); stroke(g, 6); g.fillStyle = "#8fc6e8"; g.fillRect(x - 46, y - 30, 92, 10);
};
/** the rat with a cracker, in a 600 x 1000 card (sits near the bottom) */
export const drawRat = (g: CanvasRenderingContext2D, chew: number) => {
  g.save(); g.translate(300, 900);
  g.beginPath(); g.moveTo(90, 30); g.quadraticCurveTo(200, 40, 230, -30); stroke(g, 10, "#c98a8a");
  g.beginPath(); g.ellipse(20, 0, 110, 70, 0, 0, Math.PI * 2); g.fillStyle = "#8a8a94"; g.fill(); stroke(g, 10);
  g.beginPath(); g.ellipse(-90, -30, 60, 48, -0.3, 0, Math.PI * 2); g.fillStyle = "#9a9aa4"; g.fill(); stroke(g, 10);
  for (const ex of [-120, -60]) { g.beginPath(); g.ellipse(ex, -90, 26, 30, 0, 0, Math.PI * 2); g.fillStyle = "#d9a8b0"; g.fill(); stroke(g, 8); }
  g.beginPath(); g.arc(-110, -40, 9, 0, Math.PI * 2); g.fillStyle = INK; g.fill(); g.beginPath(); g.arc(-150, -20, 10, 0, Math.PI * 2); g.fillStyle = "#e07a8a"; g.fill();
  // cracker (kerupuk) in its paws, with a bite out of it
  g.save(); g.translate(-150, 10 + chew * 4); g.beginPath(); g.ellipse(0, 0, 55, 40, 0.2, 0.4, Math.PI * 2 - 0.1); g.lineTo(0, 0); g.closePath(); g.fillStyle = "#f2deb0"; g.fill(); stroke(g, 6); g.restore();
  g.restore();
};
/** sweat drops flying off a hot baby, t loops */
export const drawSweat = (g: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: number) => {
  for (let i = 0; i < 5; i++) {
    const u = ((t * 1.6 + i / 5) % 1), a = -Math.PI / 2 + (i - 2) * 0.55, d = r * (1.05 + u * 0.5), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d + u * u * 60;
    g.globalAlpha = 1 - u; g.beginPath(); g.moveTo(x, y - 22); g.quadraticCurveTo(x + 14, y, x, y + 10); g.quadraticCurveTo(x - 14, y, x, y - 22); g.fillStyle = "#bfe6ff"; g.fill(); stroke(g, 4); g.globalAlpha = 1;
  }
  // red hot cheeks
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * r * 0.55, cy + r * 0.2, r * 0.22, r * 0.12, 0, 0, Math.PI * 2); g.fillStyle = "rgba(240,90,90,0.55)"; g.fill(); }
};
/** a sheet of paper with a caption and a doodle, used on the brain tables (canvas 300 x 400) */
export const drawSheet = (g: CanvasRenderingContext2D, w: number, h: number, title: string, icon: (g: CanvasRenderingContext2D) => void) => {
  g.fillStyle = "#fbf6ea"; g.fillRect(0, 0, w, h); g.strokeStyle = INK; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
  g.save(); g.translate(w / 2, h * 0.42); icon(g); g.restore();
  g.fillStyle = INK; let fs = 64; g.font = `bold ${fs}px sans-serif`; while (g.measureText(title).width > w * 0.86 && fs > 18) { fs -= 2; g.font = `bold ${fs}px sans-serif`; } g.textAlign = "center"; g.fillText(title, w / 2, h * 0.88);
};

/** sweat ON the face: beads on the forehead and temples that slide down the skin, one rolls off the chin; wet sheen,
 *  hot red cheeks. (cx, cy) = head centre, R = head radius, design units */
export const drawFaceSweat = (g: CanvasRenderingContext2D, cx: number, cy: number, R: number, t: number) => {
  const drops: [number, number, number][] = [[-0.45, -0.55, 0], [0.35, -0.62, 0.35], [-0.78, -0.1, 0.6], [0.75, -0.2, 0.15], [0.1, -0.7, 0.8]];
  for (const [dx, dy, ph] of drops) {
    const u = (t * 0.45 + ph) % 1, x = cx + dx * R, y = cy + (dy + u * 0.55) * R, s = 0.075 * R * (0.7 + 0.3 * Math.sin(ph * 9));
    g.globalAlpha = Math.min(1, (1 - u) * 3);
    g.beginPath(); g.moveTo(x, y - s * 1.8); g.quadraticCurveTo(x + s, y - s * 0.2, x, y + s); g.quadraticCurveTo(x - s, y - s * 0.2, x, y - s * 1.8); g.fillStyle = "rgba(190,230,255,0.9)"; g.fill(); g.lineWidth = s * 0.35; g.strokeStyle = "rgba(60,120,170,0.8)"; g.stroke();
    g.beginPath(); g.arc(x - s * 0.3, y - s * 0.4, s * 0.25, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill();
    g.strokeStyle = "rgba(170,215,255,0.35)"; g.lineWidth = s * 0.5; g.beginPath(); g.moveTo(x, y - s * 1.8); g.lineTo(x, y - s * 1.8 - u * 0.4 * R); g.stroke(); // wet trail
  }
  g.globalAlpha = 1;
  const v = (t * 0.7) % 1; if (v < 0.6) { const y = cy + R * (0.95 + v * 0.8); g.beginPath(); g.ellipse(cx + 0.05 * R, y, 0.05 * R, 0.07 * R, 0, 0, Math.PI * 2); g.fillStyle = "rgba(190,230,255,0.9)"; g.fill(); }
  for (const s2 of [-1, 1]) { g.beginPath(); g.ellipse(cx + s2 * R * 0.55, cy + R * 0.22, R * 0.24, R * 0.13, 0, 0, Math.PI * 2); g.fillStyle = "rgba(240,80,80,0.55)"; g.fill(); }
  g.save(); g.globalCompositeOperation = "source-atop"; const sh = g.createRadialGradient(cx - R * 0.35, cy - R * 0.45, 0, cx - R * 0.35, cy - R * 0.45, R * 0.6); sh.addColorStop(0, "rgba(255,255,255,0.35)"); sh.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = sh; g.fillRect(cx - R * 1.2, cy - R * 1.2, R * 2.4, R * 2.4); g.restore();
};
/** turn a clean white dress into an old, ragged kuntilanak dress: torn jagged hem and sleeves, mud and grime, rips */
export const raggedDress = (g: CanvasRenderingContext2D, cx: number, top: number, hipY: number, bw: number) => {
  const H = hipY - top;
  g.save(); g.globalCompositeOperation = "source-atop";
  for (let k = 0; k < 26; k++) { const x = cx + (Math.sin(k * 12.9898) * 0.5) * bw * 0.9, y = top + H * (0.25 + 0.75 * ((Math.sin(k * 78.233) + 1) / 2)), r = bw * (0.05 + 0.08 * ((Math.sin(k * 3.7) + 1) / 2));
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, k % 3 ? "rgba(110,95,80,0.45)" : "rgba(70,80,70,0.4)"); gr.addColorStop(1, "rgba(110,95,80,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  const hem = g.createLinearGradient(0, hipY - H * 0.35, 0, hipY); hem.addColorStop(0, "rgba(90,80,70,0)"); hem.addColorStop(1, "rgba(80,70,60,0.55)"); g.fillStyle = hem; g.fillRect(cx - bw, hipY - H * 0.35, bw * 2, H * 0.4);
  g.strokeStyle = "rgba(60,50,45,0.7)"; g.lineWidth = 3; for (let k = 0; k < 5; k++) { const x = cx + (k - 2) * bw * 0.18, y = top + H * (0.45 + 0.08 * k); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 8, y + 22); g.lineTo(x + 2, y + 40); g.stroke(); }
  g.globalCompositeOperation = "destination-out"; g.beginPath(); g.moveTo(cx - bw, hipY + 20); for (let k = 0; k <= 14; k++) { const x = cx - bw * 0.62 + (k / 14) * bw * 1.24, y = hipY - (k % 2 ? 30 + 18 * Math.sin(k * 5.1) : 2); g.lineTo(x, y); } g.lineTo(cx + bw, hipY + 20); g.closePath(); g.fill();
  g.restore();
};
