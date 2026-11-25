// Floor plan of the test room (metres). x: left -> right, z: back (window wall) -> front (door wall), y: up.
// Pure numbers, no three.js, so scripts can check the camera path against it in plain node.
export type V3 = [number, number, number];
export const ROOM = { x0: -2.5, x1: 2.5, z0: -2.8, z1: 2.8, h: 2.9 };
export const WIN = { x0: 0.2, x1: 1.8, y0: 0.95, y1: 2.35 }; // window hole in the back wall
export const DESK = { x: 1.0, z: -2.42, w: 1.45, d: 0.68, top: 0.76 };
export const BED = { x0: -1.95, x1: -0.35, z0: -2.8, z1: -0.62 };
export const CHAIR: V3 = [1.0, 0, -1.68];
export const WARD = { x0: 1.9, x1: 2.5, z0: 0.25, z1: 1.65, h: 2.15 };
export const LAPTOP: V3 = [0.95, DESK.top, -2.4];
export const DOOR = { x: 0.55, w: 0.9 };
/** solid boxes the camera must stay out of: [x0, y0, z0, x1, y1, z1] */
export const SOLIDS: Record<string, [number, number, number, number, number, number]> = {
  bed: [BED.x0, 0, BED.z0, BED.x1, 0.72, BED.z1], headboard: [BED.x0 - 0.05, 0, ROOM.z0, BED.x1 + 0.05, 1.2, ROOM.z0 + 0.12],
  nightstand: [-2.5, 0, -2.8, -2.0, 0.85, -2.25], desk: [DESK.x - DESK.w / 2, 0, ROOM.z0, DESK.x + DESK.w / 2, 1.3, DESK.z + DESK.d / 2],
  chair: [CHAIR[0] - 0.36, 0, CHAIR[2] - 0.36, CHAIR[0] + 0.36, 1.12, CHAIR[2] + 0.36], wardrobe: [WARD.x0, 0, WARD.z0, WARD.x1, WARD.h, WARD.z1],
  plant: [1.8, 0, -1.4, 2.5, 1.35, -0.6], drawers: [-2.5, 0, 0.95, -1.95, 1.35, 1.95], lamp: [-0.28, 2.75, -0.28, 0.28, ROOM.h, 0.28],
  armchair: [1.55, 0, 1.85, 2.5, 0.85, 2.8],
};
