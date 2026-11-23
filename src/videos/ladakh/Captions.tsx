// Burned-in captions over the user's final edit of "Menara Es Dolma" (public/ladakh/final/1123.mov), same style as Garam.
// Word times come from captions.json (narration aligned to the edit's audio by audio/ladakh_caption_align.py).
import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, interpolate } from "remotion";
import WORDS from "./captions.json";

type W = { w: string; s: number; e: number; brk?: boolean; end?: boolean };
export const LADAKH_CAP_FRAMES = 3100;
const FONT = "'Avenir Next', 'Arial Black', 'Helvetica Neue', Arial, sans-serif";
const MAXC = 17; // max characters per caption chunk

// group words into short chunks: never across a phrase break, at most ~17 characters / 3 words
const chunks: { words: W[]; s: number; e: number }[] = [];
{
  let cur: W[] = [];
  const flush = () => { if (cur.length) chunks.push({ words: cur, s: cur[0].s, e: cur[cur.length - 1].e }); cur = []; };
  for (const w of WORDS as W[]) {
    const len = cur.map((x) => x.w).join(" ").length + w.w.length + 1;
    if (cur.length && (len > MAXC || cur.length >= 3)) flush();
    cur.push(w);
    if (w.brk) flush();
  }
  flush();
  // show a chunk until the next one starts if the pause is short, else 0.35 s after its last word
  for (let i = 0; i < chunks.length; i++) {
    const nx = chunks[i + 1];
    chunks[i].e = nx && nx.s - chunks[i].e < 0.7 ? nx.s : chunks[i].e + 0.35;
  }
}

const clean = (w: string) => w.replace(/\.\.\./g, "…");

export const LadakhCaptions: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const c = chunks.find((k) => t >= k.s && t < k.e);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <OffthreadVideo src={staticFile("ladakh/final/1123.mov")} muted />
      {c && (() => {
        const age = t - c.s;
        const pop = interpolate(age, [0, 0.08, 0.16], [0.86, 1.06, 1], { extrapolateRight: "clamp" });
        return (
          <div style={{ position: "absolute", left: 70, right: 70, top: 1235, display: "flex", justifyContent: "center", flexWrap: "wrap",
            columnGap: 22, rowGap: 0, transform: `scale(${pop})`, transformOrigin: "50% 50%" }}>
            {c.words.map((w, i) => {
              const on = t >= w.s - 0.03 && (t < w.e + 0.02 || (i === c.words.length - 1));
              const done = t >= w.e;
              const hl = on && !(done && i < c.words.length - 1);
              return (
                <span key={i} style={{ fontFamily: FONT, fontWeight: 900, fontSize: 92, lineHeight: 1.12, letterSpacing: 0.5,
                  color: hl ? "#FFD63A" : "#FFFFFF", WebkitTextStroke: "14px #121212", paintOrder: "stroke fill",
                  textShadow: "0 7px 0 rgba(0,0,0,0.55), 0 10px 22px rgba(0,0,0,0.35)" }}>{clean(w.w)}</span>
              );
            })}
          </div>
        );
      })()}
    </AbsoluteFill>
  );
};
