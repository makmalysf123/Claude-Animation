// Character sheet: the three classes through the story's clothing states (one still, 1080 x 1920).
//   rows: before the whirlwind -> right after (torn, holes, dirt) -> after the chicken (middle + rich recovering) -> ending
//   (rich restored and shining, middle neat again, poor still torn)
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { Pen } from "../bridge/toon";
import { drawPerson, Person, RICH, RICH2, MID, MID2, POOR, POOR2, state } from "./people";

const FONT = "'Avenir Next', 'Helvetica Neue', Arial, sans-serif";
type Cell = { P: Person; seed: number };
const ROWS: { label: string; cells: Cell[] }[] = [
  { label: "1 · Sebelum puting beliung", cells: [{ P: RICH, seed: 4 }, { P: MID, seed: 2 }, { P: POOR, seed: 3 }] },
  { label: "2 · Setelah puting beliung", cells: [{ P: state(RICH, 1), seed: 4 }, { P: state(MID, 1), seed: 2 }, { P: state(POOR, 1), seed: 3 }] },
  { label: "3 · Setelah dapat ayam (pulih)", cells: [{ P: state(RICH2, 0.45, 0.2), seed: 6 }, { P: state(MID2, 0.5), seed: 5 }, { P: state(POOR2, 1), seed: 7 }] },
  { label: "4 · Akhir cerita", cells: [{ P: state(RICH, 0, 1), seed: 4 }, { P: state(MID, 0.1), seed: 2 }, { P: state(POOR, 1), seed: 3 }] },
];
const COLS = ["KAYA", "MENENGAH", "MISKIN"];

const Fig: React.FC<{ c: Cell }> = ({ c }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const cv = ref.current!; const g = cv.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.setTransform(cv.width / 600, 0, 0, cv.width / 600, 0, 0);
    drawPerson(new Pen(g), c.P, { mode: "stand", expr: "neutral", seed: c.seed, blink: 0 });
  }, [c]);
  return <canvas ref={ref} width={300} height={500} style={{ width: 228, height: 380 }} />;
};

export const AyamCast: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(#cfe3f5, #f3ead8)", fontFamily: FONT }}>
    <div style={{ display: "flex", justifyContent: "space-around", padding: "28px 40px 0", fontSize: 34, fontWeight: 900, color: "#1c2340", letterSpacing: 3 }}>
      {COLS.map((c) => <div key={c} style={{ width: 300, textAlign: "center" }}>{c}</div>)}
    </div>
    {ROWS.map((r) => (
      <div key={r.label} style={{ marginTop: 6 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#1c2340", padding: "0 48px", opacity: 0.8 }}>{r.label}</div>
        <div style={{ display: "flex", justifyContent: "space-around", padding: "0 40px" }}>
          {r.cells.map((c, i) => <Fig key={i} c={c} />)}
        </div>
      </div>
    ))}
  </AbsoluteFill>
);
