// Still gallery for checking toon2 drawing against the reference: two characters x several moods/poses in one frame.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { drawChar, CharSpec } from "../lib/toon2";
import { actAt, Actor, MoodName, ArmName } from "../lib/acting";

export const UDIN: CharSpec = {
  R: 134, bodyW: 196, bodyH: 245, legLen: 345, skin: "#fbf9f6", hair: { color: "#1f1512", style: "short" }, moustache: "thin", hat: "peci", head: { bTop: 0.9, bBot: 1.0, nTop: 2.05, nBot: 2.25, drift: -0.09 },
  cloth: { top: "#e8dfcb", pattern: "knit", bottom: "#7a2a33", bottomFrom: 0.6, plaid: ["#7a2a33", "#2d3352", "#f0d9a8"], collar: "round" },
};
export const NARTI: CharSpec = {
  R: 126, bodyW: 188, bodyH: 258, legLen: 335, skin: "#fbf9f6", hair: { color: "#231816", style: "bun" }, hat: "none", head: { bTop: 0.92, bBot: 0.95, nTop: 2.05, nBot: 1.95, drift: -0.11 },
  cloth: { top: "#2f6f78", pattern: "batik", patternCol: "#d9a441", collar: "v" },
};
const CELLS: { S: CharSpec; mood: MoodName; arms: [ArmName, ArmName]; talk?: boolean }[] = [
  { S: UDIN, mood: "story", arms: ["open", "open"], talk: true }, { S: UDIN, mood: "worried", arms: ["rest", "chest"] },
  { S: UDIN, mood: "shock", arms: ["up", "up"] }, { S: UDIN, mood: "nervous", arms: ["hug", "fixhat"] },
  { S: NARTI, mood: "suspicious", arms: ["hip", "hip"] }, { S: NARTI, mood: "whisper", arms: ["mouthHand", "rest"], talk: true },
  { S: NARTI, mood: "excited", arms: ["point", "clasp"], talk: true }, { S: NARTI, mood: "wink", arms: ["chin", "hip"] },
];
export const ToonGallery: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const g = ref.current!.getContext("2d")!; g.clearRect(0, 0, 1920, 1080);
    CELLS.forEach((c, i) => {
      const A: Actor = { seed: i + 2, words: c.talk ? [{ w: "bawa", t0: 0, t1: 2 }] : [], beats: [{ t: 0, mood: c.mood, arms: c.arms, turn: i % 2 ? -0.3 : 0.3 }] };
      g.setTransform(0.5, 0, 0, 0.5, (i % 4) * 480 + 90, Math.floor(i / 4) * 540 + 30);
      drawChar(g, c.S, actAt(A, 1.0 + i * 0.13, 300));
    });
  }, []);
  return <AbsoluteFill style={{ background: "linear-gradient(#d8c3a2, #b48a5e)" }}><canvas ref={ref} width={1920} height={1080} /></AbsoluteFill>;
};
