// Cast of "Gaji Naik Tapi Tetap Habis", in the approved toon2 style (same as Ketindihan): plain white faces,
// hand-drawn head shapes that differ per character, textured clothes that tell the story.
import type { CharSpec } from "../../lib/toon2";

const SKIN = "#fbf9f6";
/** the young office worker whose pay keeps rising: striped office shirt, dark trousers, no hat, slightly square head */
export const DIKA: CharSpec = {
  R: 130, bodyW: 184, bodyH: 248, legLen: 352, skin: SKIN, hair: { color: "#1d1411", style: "fringe" }, hat: "none",
  head: { bTop: 0.96, bBot: 0.9, nTop: 2.5, nBot: 2.1, drift: 0.07 },
  cloth: { top: "#dce8f6", pattern: "stripe", patternCol: "#8fa9cf", bottom: "#2b3350", bottomFrom: 0.64, collar: "v", buttons: 3 },
};
