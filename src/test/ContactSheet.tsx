// Contact sheet for frame-by-frame study: consecutive stills in a grid, each labelled with its frame number (and time).
// Rendered by scripts/sheets.mjs / scripts/refsheets.mjs, which serve the stills folder as the public dir (no ffmpeg needed).
// Props: prefix + frames (file names `${prefix}${pad(frame)}.jpg`), cols, cell size, optional crop of each frame
// (x, y, w, h in source pixels of a srcW x srcH image) to study one area (a face, a hand) frame by frame.
import React from "react";
import { AbsoluteFill, CalculateMetadataFunction, Img, staticFile } from "remotion";

export type SheetProps = { prefix: string; frames: number[]; pad?: number; cols?: number; cellW?: number; cellH?: number; fps?: number;
  crop?: { x: number; y: number; w: number; h: number; srcW: number; srcH: number } };
export const SHEET_W = 1620, SHEET_H = 960;
export const sheetMeta: CalculateMetadataFunction<SheetProps> = ({ props }) => {
  const cols = props.cols ?? 6, cw = props.cellW ?? 270, ch = props.cellH ?? 480, rows = Math.ceil(props.frames.length / cols) || 1;
  return { width: cols * cw, height: rows * ch };
};
export const ContactSheet: React.FC<SheetProps> = ({ prefix, frames, pad = 0, cols = 6, cellW = 270, cellH = 480, fps = 30, crop }) => {
  const name = (f: number) => `${prefix}${String(f).padStart(pad, "0")}.jpg`;
  return (
    <AbsoluteFill style={{ background: "#111", display: "grid", gridTemplateColumns: `repeat(${cols}, ${cellW}px)`, gridAutoRows: `${cellH}px` }}>
      {frames.map((f) => {
        const img = crop
          ? <Img src={staticFile(name(f))} style={{ position: "absolute", width: (crop.srcW * cellW) / crop.w, height: (crop.srcH * cellH) / crop.h, left: (-crop.x * cellW) / crop.w, top: (-crop.y * cellH) / crop.h }} />
          : <Img src={staticFile(name(f))} style={{ width: cellW, height: cellH, display: "block" }} />;
        return (
          <div key={f} style={{ position: "relative", width: cellW, height: cellH, overflow: "hidden", outline: "1px solid #444" }}>
            {img}
            <div style={{ position: "absolute", left: 2, top: 2, padding: "0 4px", background: "rgba(0,0,0,0.75)", color: "#ff0", font: `bold ${cellW < 200 ? 13 : 17}px monospace` }}>{f} · {(f / fps).toFixed(2)}s</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
