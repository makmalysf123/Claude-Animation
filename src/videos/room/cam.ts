// The camera of RoomCamTest: one unbroken take built from moves with the shared engine in src/lib/camMoves.ts
// (guide: docs/tech/camera-moves.md). Pure maths, so scripts/roomcam_check.mjs can test every frame against the room.
// `roomCam(speed)`: speed 1 = the 27 s take the user saw; 1.5 = every move 1.5x faster (18 s).
import { makeCam, topDown, Move, Pose } from "../../lib/camMoves";
import { LAPTOP } from "./layout";

const START: Pose = { p: [1.35, 2.5, 2.55], l: [-0.65, 0.55, -1.45], f: 64 };
/** the moves with their length in seconds at speed 1; the name is what the move is, for the list given to the user */
export const MOVES: Move[] = [
  { name: "A  push-in + crane down (whole room, high diagonal)", kind: "line", dur: 3.2, to: { p: [1.15, 2.2, 2.1], l: [-0.45, 0.65, -1.35], f: 56 } },
  { name: "   hold", kind: "hold", dur: 0.5 },
  { name: "B  glide over the room down to the desk, push in on the laptop", kind: "line", dur: 3.1, via: [1.25, 1.9, -0.05], to: { p: [1.5, 1.4, -1.15], l: [LAPTOP[0], LAPTOP[1] + 0.14, LAPTOP[2]], f: 40 } },
  { name: "C  zoom in (FOV) on the laptop screen", kind: "hold", dur: 1.2, to: { f: 22 } },
  { name: "D  orbit left round the desk + zoom out: laptop, lamp, window", kind: "orbit", dur: 3.4, c: [1.0, 0.95, -2.35], to: { p: [0.12, 1.32, -1.48], l: [1.05, 1.2, -2.55], f: 46 } },
  { name: "E  crane up and tilt down: top-down on the bed", kind: "line", dur: 3.0, via: [-0.45, 2.65, -1.25], to: topDown(-1.15, 2.62, -1.72, 74, [0, 0, -1]) },
  { name: "F  top-down spin 90 deg + zoom out", kind: "hold", dur: 1.6, to: { f: 86, up: [1, 0, 0] } },
  { name: "G  crane down to a low angle near the floor: the wardrobe", kind: "line", dur: 3.6, via: [-0.6, 1.3, 1.2], to: { p: [-0.2, 0.3, 1.6], l: [2.1, 1.2, 0.95], f: 64 } },
  { name: "H  pan left: wardrobe -> bed + nightstand", kind: "pan", dur: 2.7, to: { p: [-0.22, 0.42, 1.68], l: [-1.55, 0.66, -2.05], f: 50 } },
  { name: "I  pull out + crane up to the far corner, zoom out: whole room", kind: "line", dur: 3.4, via: [-1.3, 1.0, 2.45], to: { p: [-2.05, 2.48, 2.38], l: [0.6, 0.6, -1.25], f: 70 } },
  { name: "   hold (slow drift)", kind: "hold", dur: 1.3, to: { f: 66 } },
];
export const roomCam = (speed = 1) => makeCam(START, MOVES, { speed });
const C1 = roomCam(1);
export const CAM_SECONDS = C1.seconds;
export const camAt = C1.at;
