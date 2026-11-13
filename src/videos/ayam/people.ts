// Our Indonesian cast for "Satu Ayam yang Sama", drawn with the cartoon-short engine's Pen + bodyFront (bridge/toon.ts,
// MIT, Mr omi): bean heads, plum ink, painted crescents. Our own outfits + overlays on top of bodyFront:
// caping (rice-farmer hat), peci, hijab, sunglasses + gold chain (rich), patches (poor) and the karung goni (sack) that
// everybody wears after the whirlwind takes everything. Plus chickens and chicks in the same ink style.
import { Pen, bodyFront, headBlob, Outfit, FrontOpts, INK, mix, shade, HANDS_OUT } from "../bridge/toon";

type P2 = [number, number];
/** plain white faces like the reference channel */
export const WHITE = "#fbf8f2";
const BUILD = { adult: { a: 118, torso: 1.1, legs: 1.4, tw: 0.8 }, stout: { a: 118, torso: 1.15, legs: 1.32, tw: 0.92 }, kid: { a: 112, torso: 0.85, legs: 1.0, tw: 0.72 } };

export type Extra = "caping" | "peci" | "hijab" | "longhair" | "shades" | "chain" | "patches" | "sack" | "sweat" | "suit";
/** damage 0..1 = holes, tears and dirt on the clothes; shine 0..1 = glossy sheen + sparkles (restored wealth) */
export type Person = { o: Outfit; extras: Extra[]; hijab?: string; sack?: string; sign?: string; cheque?: boolean; damage?: number; shine?: number };
/** the same person in a story state: their own clothes, torn by the whirlwind (damage) and restored later (shine) */
export const state = (p: Person, damage: number, shine = 0): Person => ({ ...p, damage, shine });

// ---- the three classes (before the whirlwind) ----
export const RICH: Person = { o: { jacket: "#2a3350", pants: "#232838", boots: "#1b1a20", hat: "hair", hair: "#3a3a3a", skin: WHITE, build: "stout", buttons: "#e8c45a", moustache: "#3a2a20" }, extras: ["shades", "chain", "suit"] };
export const RICH2: Person = { o: { jacket: "#7a2e3a", pants: "#2b2530", boots: "#1b1a20", hat: "hair", hair: "#1e1410", skin: WHITE, dress: "#b0263a", buttons: "#e8c45a" }, extras: ["chain", "longhair"] };
export const MID: Person = { o: { jacket: "#3a6fb0", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#1e1410", skin: WHITE, dress: "#3a6fb0" }, extras: ["longhair"] };
export const MID2: Person = { o: { jacket: "#3f6fb5", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#1e1410", skin: WHITE }, extras: ["peci"] };
export const POOR: Person = { o: { jacket: "#9a8466", pants: "#5b5246", boots: "#6b4a2e", hat: "hair", hair: "#2a1d14", skin: WHITE }, extras: ["caping", "patches"] };
export const POOR2: Person = { o: { jacket: "#8a7a6a", pants: "#4d463d", boots: "#5a4030", hat: "hair", hair: "#1e1410", skin: WHITE, dress: "#7d6b5a" }, extras: ["patches", "longhair"] };
/** villagers for the crowds: variety of skins / hair / hats */
const SK = [WHITE, WHITE, WHITE, WHITE, WHITE];
/** villagers for the crowds, by class (i % 3: 0 rich, 1 middle, 2 poor), men and women mixed, own clothes per class */
export const villager = (i: number): Person => {
  const cls = i % 3, female = Math.floor(i / 3) % 2 === 1, hair = ["#1e1410", "#2a1d14", "#3a2416"][i % 3];
  const RICHC = [["#2a3350", "#7a2e3a"], ["#3b2a4a", "#1f5a4a"], ["#4a3a1a", "#2a3a6a"]][i % 3], MIDC = ["#3f6fb5", "#2f8f8a", "#c0703a", "#5a7a3a"], POORC = ["#9a8466", "#8a7a6a", "#7d7060"];
  const base: Outfit = cls === 0 ? { jacket: RICHC[0], pants: "#232838", boots: "#1b1a20", hat: "hair", hair, skin: WHITE, buttons: "#e8c45a", dress: female ? RICHC[1] : undefined, build: !female && i % 2 ? "stout" : "adult" }
    : cls === 1 ? { jacket: MIDC[i % 4], pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair, skin: WHITE, dress: female ? MIDC[(i + 1) % 4] : undefined }
    : { jacket: POORC[i % 3], pants: "#5b5246", boots: "#6b4a2e", hat: "hair", hair, skin: WHITE, dress: female ? "#7d6b5a" : undefined };
  const extras: Extra[] = [];
  if (female) extras.push("longhair");
  if (cls === 0) extras.push("chain");
  if (cls === 1 && !female && i % 2) extras.push("peci");
  if (cls === 2) { extras.push("patches"); if (!female && i % 2) extras.push("caping"); }
  return { o: base, extras };
};

// ---- body geometry: the same numbers as bodyFront (bob, squat, head morph, lean), so overlays ride on the body ----
const rd = (d: number) => (d * Math.PI) / 180;
const geom = (o: Outfit, opts: FrontOpts) => {
  const Bd = BUILD[o.build ?? "adult"], headK = opts.headK ?? 1, H0 = headBlob(opts.seed ?? 1, Bd.a, opts.facing ?? 0);
  const H = { ...H0, a: H0.a * headK, b: H0.b / Math.sqrt(headK) }, HH = 2 * H0.b, W = 2 * H0.a, sole = 975, two = Math.PI * 2;
  const mode = opts.mode ?? "march", ph = opts.phase ?? 0, tall = (1 + Bd.torso + Bd.legs) * HH;
  const bob = (opts.bobK ?? 1) * (mode === "march" ? 0.025 * tall * Math.cos(2 * two * ph) : mode === "stroll" ? 0.015 * tall * Math.cos(2 * two * ph) : 0);
  const torsoBot = mode === "sit" ? sole - 0.2 * HH : sole - Bd.legs * HH + bob + (opts.squat ?? 0) * 0.34 * Bd.legs * HH;
  const chin = torsoBot - Bd.torso * HH, hc = chin - H.b, hipY = torsoBot - 0.12 * HH;
  const sway = mode === "march" ? 1.6 * Math.sin(two * ph) : mode === "stroll" ? 1.0 * Math.sin(two * ph) : 0, A = (opts.tilt ?? 0) + sway, Ah = A + (opts.headTilt ?? 0);
  const c = Math.cos(rd(A)), sn = Math.sin(rd(A)), cpx = 300 + (300 - 300) * c - (chin - hipY) * sn, cpy = hipY + (300 - 300) * sn + (chin - hipY) * c;
  const torsoRot = A ? [rd(A), 300, hipY] : null, headRot = Ah ? [rd(Ah), 300, chin, cpx - 300, cpy - chin] : null;
  return { H, HH, W, Wh: 2 * H.a, sole, torsoBot, chin, hc, crown: hc - H.b, u: W / 100, Ta: ((Bd.tw / 2) * W) / 1.06, torsoRot, headRot };
};
/** things a hand can hold (drawn at the hand after the body) */
export type Held = "drumstick" | "bone" | "egg" | "basket" | "crank" | "coin" | "plank";
/** motion trail: where the hands (and what they hold) were 1-3 frames ago, drawn as fading ghosts behind the body */
export type Ghost = { hands: [P2 | null, P2 | null]; a: number };
export type ActOpts = FrontOpts & { hold?: [Held | null, Held | null]; trail?: Ghost[]; signSway?: number; bitten?: number };
const drawHeld = (p: Pen, k: Held, [x, y]: [number, number], side: number, u: number) => {
  if (k === "drumstick" || k === "bone") {
    p.stroke([[x - side * 4 * u, y + 2 * u], [x + side * 16 * u, y - 18 * u]], 5 * u, "#f4ecd8"); p.ell(x + side * 18 * u, y - 21 * u, 4 * u, 4 * u, "#f4ecd8", 2 * u);
    if (k === "drumstick") p.ell(x - side * 6 * u, y + 6 * u, 13 * u, 10 * u, "#b8642a", 3 * u, 0, 360, side * 35);
  } else if (k === "egg") p.ell(x, y - 6 * u, 8 * u, 10 * u, "#fbf3e2", 2.6 * u);
  else if (k === "coin") p.ell(x, y - 4 * u, 8 * u, 8 * u, "#ffcf3a", 2.6 * u);
  else if (k === "crank") p.stroke([[x, y], [x, y - 22 * u]], 4 * u, "#6b4a2e");
  else if (k === "plank") { p.poly([[x - side * 150 * u, y - 14 * u], [x + side * 40 * u, y - 4 * u], [x + side * 40 * u, y + 8 * u], [x - side * 150 * u, y - 2 * u]], "#9a7048", 3 * u); p.stroke([[x - side * 120 * u, y - 7 * u], [x + side * 20 * u, y + 1 * u]], 1.5 * u, "#6b4a2e"); }
  else if (k === "basket") {
    p.ell(x - side * 26 * u, y - 10 * u, 16 * u, 10 * u, "#fbf3e2", 2.4 * u); p.ell(x - side * 12 * u, y - 13 * u, 14 * u, 9 * u, "#f4ead6", 2.4 * u);
    p.poly([[x - side * 50 * u, y - 8 * u], [x + side * 8 * u, y - 8 * u], [x + side * 2 * u, y + 22 * u], [x - side * 44 * u, y + 22 * u]], "#b88a4a", 3 * u);
    for (let i = 1; i < 4; i++) p.stroke([[x - side * (50 - i * 2) * u, y - 8 * u + i * 7.5 * u], [x + side * (8 - i * 2) * u, y - 8 * u + i * 7.5 * u]], 1.6 * u, "#8a6234");
  }
};

/** draw one person (600 x 1000 design space). The sack replaces the body below the chin. */
export const drawPerson = (p: Pen, P: Person, opts: ActOpts) => {
  opts = { ...opts };
  const o = P.o, G = geom(o, opts), { H, HH, W, chin, hc, crown, u, sole } = G, Wh = G.Wh;
  const sack = P.extras.includes("sack");
  if (P.extras.includes("hijab")) { // drape behind the head + over the shoulders
    p.ell(300, hc + 0.2 * H.b, H.a * 1.22, H.b * 1.25, P.hijab!, 5 * u);
    if (!sack) p.poly([[300 - 0.62 * W, chin + 0.55 * HH], [300 - 0.5 * W, chin - 0.1 * HH], [300 + 0.5 * W, chin - 0.1 * HH], [300 + 0.62 * W, chin + 0.55 * HH]], P.hijab!, 5 * u);
  }
  p.rot = G.headRot;
  if (P.extras.includes("longhair")) {
    const hairPts: P2[] = [];
    for (let i = 0; i <= 20; i++) { const t = Math.PI + (i / 20) * Math.PI; hairPts.push([300 + Math.cos(t) * H.a * 1.1, hc + Math.sin(t) * H.b * 1.08]); }
    hairPts.push([300 + H.a * 1.12, hc + 0.9 * H.b], [300 + H.a * 0.95, chin + 0.28 * HH], [300 - H.a * 0.95, chin + 0.28 * HH], [300 - H.a * 1.12, hc + 0.9 * H.b]);
    p.poly(hairPts, o.hair ?? "#1e1410", 5 * u);
  }
  if (P.sign) {
    // the board rides on the raised hand: same torso rotation as the arm, plus its own swing about the fist (signSway, rad).
    // Board, stick AND lettering all go through the same transform, so the text can never stay behind when the board moves.
    opts = { ...opts, wave: 1 };
    const tcx = 300 + 3 * u * (opts.facing ?? 0), Sy = chin + 0.12 * HH;
    const hx = tcx + 1.18 * G.Ta + 16 * u + 12 * u, hy = Sy - 0.6 * HH;
    const bw = 300, bh = 150, bx = Math.min(hx, 600 - bw / 2 - 8), by = Math.max(bh / 2 + 6, crown - 0.55 * HH);
    const sa = opts.signSway ?? 0, cs = Math.cos(sa), sn = Math.sin(sa);
    const R = ([x, y]: P2): P2 => [hx + (x - hx) * cs - (y - hy) * sn, hy + (x - hx) * sn + (y - hy) * cs];
    const quad = (x0: number, y0: number, x1: number, y1: number, j = 0): P2[] => [R([x0, y0]), R([x1, y0 + j]), R([x1 - j * 0.7, y1]), R([x0 + j * 0.5, y1 - j * 0.7])];
    p.rot = G.torsoRot;
    p.band([R([hx, hy + 40]), R([hx, by + bh / 2 - 4])], "#8b5a32", 9, 2.5, "round"); // stick from below the fist up into the board
    const edge = quad(bx - bw / 2 + 7, by - bh / 2 + 9, bx + bw / 2 + 7, by + bh / 2 + 9, 4); // cardboard thickness on the shadow side
    p.poly(edge, P.cheque ? "#c9c9c0" : "#b89a6a", 5);
    if (P.cheque) { // giant cheque: white, green border, small header line
      p.poly(quad(bx - bw / 2, by - bh / 2, bx + bw / 2, by + bh / 2), "#fbfbf6", 6);
      p.poly(quad(bx - bw / 2 + 10, by - bh / 2 + 10, bx + bw / 2 - 10, by + bh / 2 - 10), null, 3);
    } else p.poly(quad(bx - bw / 2, by - bh / 2, bx + bw / 2, by + bh / 2, 4), "#f1e6c8", 6);
    const g = p.g, [tx, ty] = p.P(...R([bx, by])); g.save(); g.translate(tx, ty); g.rotate(sa + (G.torsoRot ? G.torsoRot[0] : 0));
    if (P.cheque) { g.fillStyle = "#2e7d4f"; g.font = "800 20px 'Avenir Next', Arial"; g.textAlign = "center"; g.fillText("BAYAR KEPADA: PAK WARGA", 0, -bh / 2 + 34, bw - 44); }
    g.fillStyle = P.cheque ? "#1f6b44" : "#c0262f"; g.textAlign = "center"; g.textBaseline = "middle";
    let fsz = 80; g.font = `900 ${fsz}px 'Avenir Next', Arial`; const tw = g.measureText(P.sign).width; fsz = Math.min(80, (fsz * (bw - 36)) / tw); g.font = `900 ${fsz}px 'Avenir Next', Arial`;
    g.fillText(P.sign, 0, P.cheque ? 18 : 2); g.restore();
    p.rot = G.headRot;
  }
  if (opts.trail) { // ghosts of the arms and held props along the path of a fast move (reference: the hammer swing)
    const tcx = 300 + 3 * u * (opts.facing ?? 0); p.rot = G.torsoRot;
    for (const gh of opts.trail) { p.g.save(); p.g.globalAlpha = gh.a;
      gh.hands.forEach((t, i) => { if (!t) return; const side = i ? 1 : -1, S: P2 = [tcx + side * 0.85 * G.Ta, chin + 0.12 * HH], Hd: P2 = [300 + t[0] * HH, chin + t[1] * HH];
        const E: P2 = [(S[0] + Hd[0]) / 2 + side * 6 * u, (S[1] + Hd[1]) / 2 + 0.05 * HH];
        p.stroke([S, E, Hd], 6.6 * u, "#2a2030"); p.dot(Hd[0], Hd[1], 8 * u, "#2a2030");
        const k = opts.hold?.[i]; if (k) { const [x, y] = p.P(Hd[0], Hd[1]); const keep = p.rot; p.rot = null; drawHeld(p, k, [x, y], side, u); p.rot = keep; } });
      p.g.restore(); }
  }
  p.rot = null;
  bodyFront(p, o, opts);
  const hands = { l: [...HANDS_OUT.l] as [number, number], r: [...HANDS_OUT.r] as [number, number] };
  p.rot = G.torsoRot;
  const thinInk = 4.5 * u;
  if (sack) {
    // karung goni: wide tapered sack from the shoulders to the ground, rope tie at the top, burlap weave, a stencil stripe
    const top = chin + 0.18 * HH, bot = sole + 2, wT = 0.6 * W, wM = 0.7 * W, wB = 0.62 * W;
    const pts: P2[] = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([300 - wT - (wM - wT) * Math.sin(t * Math.PI * 0.9), top + (bot - top - 40 * u) * t]); } // left side bulges
    for (let i = 0; i <= 10; i++) { const a = Math.PI + (i / 10) * Math.PI; pts.push([300 + wB * Math.cos(a) * -1, bot - 40 * u + Math.sin(a) * -40 * u]); } // rounded bottom
    for (let i = 12; i >= 0; i--) { const t = i / 12; pts.push([300 + wT + (wM - wT) * Math.sin(t * Math.PI * 0.9), top + (bot - top - 40 * u) * t]); }
    for (let i = 0; i <= 8; i++) pts.push([300 + wT - (2 * wT * i) / 8, top - 7 * u * (i % 2)]); // ragged gathered rim
    p.gradFill(pts, P.sack!, shade(P.sack!, 0.72), opts.light ?? -2.1);
    p.clip(pts, () => {
      const g = p.g; g.save(); g.globalAlpha = 0.18; g.strokeStyle = shade(P.sack!, 0.5); g.lineWidth = 1.6 * u;
      for (let y = top; y < bot; y += 4 * u) { g.beginPath(); g.moveTo(300 - wT * 1.1, y); g.lineTo(300 + wT * 1.1, y); g.stroke(); }
      for (let x = 300 - wT * 1.1; x < 300 + wT * 1.1; x += 4 * u) { g.beginPath(); g.moveTo(x, top); g.lineTo(x, bot); g.stroke(); }
      g.restore();
      p.band([[300 - wT * 1.1, top + 0.55 * (bot - top)], [300 + wT * 1.1, top + 0.55 * (bot - top)]], "#c0453a", 5 * u, 0);
      p.band([[300 - wT * 1.1, top + 0.62 * (bot - top)], [300 + wT * 1.1, top + 0.62 * (bot - top)]], "#3f6fb5", 3 * u, 0);
    });
    p.poly(pts, null, 5 * u);
    p.stroke([[300 - wT * 0.92, top + 7 * u], [300 + wT * 0.92, top + 7 * u]], 2.4 * u, "#7a5a34"); // rope
    p.dot(300 - wT * 0.86, top + 2 * u, 5.5 * u); p.dot(300 + wT * 0.86, top + 2 * u, 5.5 * u); // hands holding the rim
  }
  if (P.extras.includes("suit") && !o.dress) { // expensive suit: white shirt V, red silk tie, lapels, gold pocket line
    const y0 = chin + 0.08 * HH, y1 = chin + 0.62 * HH;
    p.poly([[300 - 0.17 * W, y0], [300 + 0.17 * W, y0], [300, y1]], "#f7f6f2", 3 * u);
    p.poly([[300 - 0.05 * W, y0 + 2 * u], [300 + 0.05 * W, y0 + 2 * u], [300 + 0.035 * W, y0 + 0.1 * HH], [300 + 0.06 * W, y1 - 0.06 * HH], [300, y1 + 0.02 * HH], [300 - 0.06 * W, y1 - 0.06 * HH], [300 - 0.035 * W, y0 + 0.1 * HH]], "#c0262f", 2.6 * u);
    for (const sd of [-1, 1]) p.stroke([[300 + sd * 0.2 * W, y0 - 2 * u], [300 + sd * 0.04 * W, y1 + 0.02 * HH]], 3 * u);
    p.stroke([[300 + 0.17 * W, chin + 0.42 * HH], [300 + 0.27 * W, chin + 0.4 * HH]], 2.6 * u, "#e8c45a");
  }
  // ---- wear: the whirlwind tore everyone's own clothes; holes show the white skin, rips, ragged hem, dirt; shine when restored ----
  const dmg = P.damage ?? 0, shn = P.shine ?? 0;
  if (dmg > 0.02 || shn > 0.02) {
    const dress = !!o.dress, tcx = 300, top = chin + 0.1 * HH, bot = dress ? sole - 0.4 * HH : G.torsoBot - 0.05 * HH, hw = dress ? 0.42 * W : G.Ta * 0.82;
    const rnd = (k: number) => { const x = Math.sin((opts.seed ?? 1) * 91.7 + k * 37.3) * 43758.5453; return x - Math.floor(x); };
    const g = p.g;
    if (dmg > 0.02) {
      g.save(); g.globalCompositeOperation = "source-atop"; // dirt and dust over the clothes
      for (let k = 0; k < Math.round(3 + 5 * dmg); k++) { g.fillStyle = `rgba(92,70,48,${(0.18 + 0.2 * rnd(k + 40)) * dmg})`; g.beginPath(); g.ellipse(tcx + (rnd(k + 41) - 0.5) * 2 * hw, top + rnd(k + 42) * (sole - 40 - top), 16 + 30 * rnd(k + 43), 10 + 18 * rnd(k + 44), rnd(k + 45) * 3, 0, 7); g.fill(); }
      g.restore();
      const nh = Math.round(1 + 4 * dmg);
      for (let k = 0; k < nh; k++) { // holes: jagged, the white skin shows through
        const cx = tcx + (rnd(k) - 0.5) * 1.5 * hw, cy = top + 0.15 * (bot - top) + rnd(k + 10) * 0.7 * (bot - top), r = (0.1 + 0.08 * rnd(k + 20)) * hw * (0.7 + 0.5 * dmg);
        const pts: P2[] = []; for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, rr = r * (0.65 + 0.5 * rnd(k * 9 + i + 30)); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.85]); }
        p.poly(pts, o.skin ?? WHITE, 3.2 * u);
        for (let i = 0; i < 3; i++) { const a = rnd(k * 3 + i + 60) * Math.PI * 2; p.stroke([[cx + Math.cos(a) * r, cy + Math.sin(a) * r], [cx + Math.cos(a) * r * 1.45, cy + Math.sin(a) * r * 1.4]], 2 * u); } // frayed threads
      }
      for (let k = 0; k < Math.round(2 * dmg + 0.5); k++) { // rips: zigzag slashes
        const x0 = tcx + (rnd(k + 70) - 0.5) * 1.4 * hw, y0 = top + rnd(k + 71) * 0.5 * (bot - top), pts: P2[] = [];
        for (let i = 0; i < 6; i++) pts.push([x0 + i * 6 * u * (rnd(k + 72) < 0.5 ? 1 : -1), y0 + i * 7 * u + (i % 2 ? 4 * u : -2 * u)]);
        p.stroke(pts, 2.6 * u);
      }
      // (no hanging hem flaps: they read as triangles at the feet)
    }
    if (shn > 0.02) {
      g.save(); g.globalCompositeOperation = "source-atop"; // glossy sheen across the clothes
      const gr = g.createLinearGradient(tcx - hw, top, tcx + hw, bot); gr.addColorStop(0.3, "rgba(255,255,255,0)"); gr.addColorStop(0.45, `rgba(255,250,225,${0.38 * shn})`); gr.addColorStop(0.55, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(tcx - hw - 20, top, 2 * hw + 40, bot - top); g.restore();
      for (let k = 0; k < Math.round(2 + 3 * shn); k++) { // sparkles around the body
        const sx = 300 + (k % 2 ? 1 : -1) * (0.62 + 0.25 * rnd(k + 90)) * W, sy = crown + rnd(k + 91) * (sole - crown) * 0.8, rr = (8 + 10 * rnd(k + 92)) * u * shn;
        p.poly([[sx, sy - rr], [sx + rr * 0.25, sy - rr * 0.25], [sx + rr, sy], [sx + rr * 0.25, sy + rr * 0.25], [sx, sy + rr], [sx - rr * 0.25, sy + rr * 0.25], [sx - rr, sy], [sx - rr * 0.25, sy - rr * 0.25]], "#fff3b0", 2 * u);
      }
    }
  }
  if (P.extras.includes("patches") && !sack) {
    p.poly([[300 - 0.28 * W, chin + 0.5 * HH], [300 - 0.12 * W, chin + 0.47 * HH], [300 - 0.1 * W, chin + 0.66 * HH], [300 - 0.27 * W, chin + 0.68 * HH]], mix(o.jacket, "#c9a46a", 0.5), 2.5 * u);
    p.poly([[300 + 0.1 * W, chin + 0.8 * HH], [300 + 0.24 * W, chin + 0.78 * HH], [300 + 0.25 * W, chin + 0.92 * HH], [300 + 0.12 * W, chin + 0.93 * HH]], mix(o.jacket, "#6d5a44", 0.5), 2.5 * u);
  }
  if (P.extras.includes("chain") && !sack) {
    const pts: P2[] = []; for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push([300 - 0.22 * W + 0.44 * W * t, chin + 0.12 * HH + Math.sin(t * Math.PI) * 0.28 * HH]); }
    p.stroke(pts, 3.2 * u, "#e8b820"); p.ell(300, chin + 0.44 * HH, 5 * u, 5 * u, "#ffd84a", 2 * u);
  }
  p.rot = G.headRot;
  if ((P.damage ?? 0) > 0.5) { // dust and smudges on the face after the whirlwind (the reference fall: sand on the skin)
    const dmg = P.damage!, rr = (k: number) => { const x = Math.sin((opts.seed ?? 1) * 57.3 + k * 19.1) * 43758.5453; return x - Math.floor(x); };
    const g = p.g; g.save(); g.globalAlpha = 0.5 * dmg;
    for (let k = 0; k < 7; k++) { const [x, y] = p.P(300 + (rr(k) - 0.5) * 1.3 * H.a, hc + (rr(k + 9) - 0.2) * 0.9 * H.b); g.fillStyle = k % 3 ? "#8a6a4a" : "#6a5038"; g.beginPath(); g.ellipse(x, y, (4 + 9 * rr(k + 3)) * u, (3 + 6 * rr(k + 5)) * u, rr(k + 7) * 3, 0, 7); g.fill(); }
    g.restore();
  }
  { const W = Wh;
  if (P.extras.includes("shades")) {
    const ey = hc + 0.05 * H.b;
    for (const s of [-1, 1]) p.poly([[300 + s * 0.06 * W, ey - 0.13 * H.b], [300 + s * 0.4 * W, ey - 0.15 * H.b], [300 + s * 0.36 * W, ey + 0.17 * H.b], [300 + s * 0.09 * W, ey + 0.14 * H.b]], "#14121a", 3 * u);
    p.stroke([[300 - 0.06 * W, ey - 0.08 * H.b], [300 + 0.06 * W, ey - 0.08 * H.b]], 3 * u);
    p.stroke([[300 + 0.22 * W, ey - 0.1 * H.b], [300 + 0.3 * W, ey - 0.02 * H.b]], 2.4 * u, "#ffffff");
  }
  if (P.extras.includes("sweat")) { // cartoon sweat drop at the temple
    const sx = 300 + H.a * 0.98, sy = hc - 0.35 * H.b;
    p.poly([[sx, sy - 0.22 * H.b], [sx + 0.13 * H.a, sy + 0.05 * H.b], [sx, sy + 0.16 * H.b], [sx - 0.13 * H.a, sy + 0.05 * H.b]], "#8fd3ff", 3 * u);
    p.ell(sx - 0.03 * H.a, sy + 0.02 * H.b, 0.035 * H.a, 0.05 * H.b, "#ffffff", 0);
  }
  if (P.extras.includes("peci")) {
    const y0 = crown + 0.32 * H.b, y1 = crown - 0.12 * H.b;
    p.poly([[300 - 0.47 * W, y0], [300 - 0.43 * W, y1], [300 + 0.43 * W, y1], [300 + 0.47 * W, y0]], "#18171d", thinInk);
  }
  if (P.extras.includes("caping")) {
    const y0 = crown + 0.3 * H.b;
    p.poly([[300 - 0.95 * W, y0 + 4 * u], [300, crown - 0.55 * H.b], [300 + 0.95 * W, y0 + 4 * u], [300 + 0.6 * W, y0 + 9 * u], [300 - 0.6 * W, y0 + 9 * u]], "#e2c27a", thinInk);
    for (const k of [-0.5, -0.2, 0.15, 0.45]) p.stroke([[300 + k * 0.4 * W, crown - 0.3 * H.b], [300 + k * W * 1.3, y0 + 5 * u]], 1.6 * u, "#b8964f");
  }
  if (P.extras.includes("hijab")) { // cap over the whole crown down to the brow, then the fold under the chin
    const cap: P2[] = [];
    for (let i = 0; i <= 24; i++) { const t = Math.PI + (i / 24) * Math.PI; cap.push([300 + Math.cos(t) * H.a * 1.08, hc - 0.05 * H.b + Math.sin(t) * H.b * 1.1]); }
    for (let i = 0; i <= 16; i++) { const t = (i / 16) * Math.PI; cap.push([300 + Math.cos(t) * H.a * 0.78, hc - 0.18 * H.b - Math.sin(t) * H.b * 0.42]); } // face opening (brow arc)
    p.poly(cap, P.hijab!, thinInk);
    for (const sd of [-1, 1]) p.poly([[300 + sd * H.a * 1.08, hc - 0.05 * H.b], [300 + sd * H.a * 0.8, hc - 0.18 * H.b], [300 + sd * H.a * 0.78, hc + 0.45 * H.b], [300 + sd * H.a * 1.0, hc + 0.5 * H.b]], P.hijab!, thinInk);
  }
  if (P.extras.includes("hijab")) { // front fold under the chin, framing the face
    p.poly([[300 - 0.5 * W, hc + 0.3 * H.b], [300 - 0.3 * W, chin + 0.12 * HH], [300 + 0.3 * W, chin + 0.12 * HH], [300 + 0.5 * W, hc + 0.3 * H.b], [300 + 0.42 * W, chin - 0.02 * HH], [300 - 0.42 * W, chin - 0.02 * HH]], P.hijab!, thinInk);
  }
  }
  p.rot = null;
  if (opts.hold) { if (opts.hold[0]) drawHeld(p, opts.hold[0], hands.l, -1, u); if (opts.hold[1]) drawHeld(p, opts.hold[1], hands.r, 1, u); }
};

// ---- chickens (300 x 300 design, feet at y = 285) ----
export const drawHen = (p: Pen, peck: number, col = "#fbf6ea", comb = "#d9363e") => {
  const ink = 7;
  p.stroke([[132, 222], [126, 282]], 6, "#e89a2c"); p.stroke([[166, 222], [172, 282]], 6, "#e89a2c");
  p.stroke([[114, 282], [138, 282]], 5, "#e89a2c"); p.stroke([[160, 282], [184, 282]], 5, "#e89a2c");
  p.poly([[78, 150], [36, 92], [62, 150], [30, 128], [70, 178]], col, ink); // tail
  p.ell(150, 180, 82, 56, col, ink);
  p.ell(140, 186, 40, 26, shade(col, 0.88), 5, 0, 360, -0.25); // wing
  const hx = 212 + peck * 22, hy = 112 + peck * 70;
  p.poly([[176, 150], [hx - 18, hy - 10], [hx + 14, hy + 4], [206, 176]], col, 0);
  p.ell(hx, hy, 32, 30, col, ink);
  p.poly([[hx - 16, hy - 26], [hx - 10, hy - 46], [hx, hy - 32], [hx + 8, hy - 48], [hx + 14, hy - 30], [hx + 24, hy - 38], [hx + 22, hy - 20]], comb, 5);
  p.poly([[hx + 26, hy - 4], [hx + 50, hy + 4], [hx + 26, hy + 12]], "#f2a33a", 5);
  p.ell(hx + 18, hy + 22, 7, 11, comb, 4);
  p.dot(hx + 10, hy - 6, 5, INK);
};
export const drawChick = (p: Pen, hop: number) => {
  const y = -hop * 16;
  p.stroke([[138, 250 + y], [134, 282]], 5, "#e89a2c"); p.stroke([[162, 250 + y], [166, 282]], 5, "#e89a2c");
  p.ell(150, 220 + y, 46, 40, "#ffd84a", 6); p.ell(178, 178 + y, 28, 26, "#ffd84a", 6);
  p.poly([[200, 174 + y], [218, 180 + y], [200, 188 + y]], "#f2a33a", 4);
  p.dot(186, 172 + y, 4, INK);
};
