// RoomCamTest: a light test of camera moves. One bedroom, one unbroken take (27 s at speed 1, 1080x1920, 30 fps):
// push-in, crane, glide, FOV zoom, orbit, top-down + spin, low angle, pan, pull-out. The path is in cam.ts (checked
// frame by frame against the furniture by scripts/roomcam_check.mjs); the room is kamar.ts.
// Faster take: npx remotion render src/index.ts RoomCamTest out/room/fast.mp4 --props='{"speed":1.5}'
import React from "react";
import { continueRender, delayRender } from "remotion";
import { Reel, SceneDef, SetLike } from "../../lib/scene";
import { applyCam } from "../../lib/camMoves";
import { loadRoom, roomReady } from "./models";
import { Kamar } from "./kamar";
import { roomCam } from "./cam";

export type RoomCamProps = { speed: number };
export const roomCamFrames = (speed = 1) => Math.round(roomCam(speed).seconds * 30);
export const ROOMCAM_FRAMES = roomCamFrames(1);
const scenes = (speed: number): SceneDef[] => {
  const C = roomCam(speed);
  return [{
    from: 0, to: C.seconds, mk: () => new Kamar() as unknown as SetLike, keys: [{ t: 0, pos: [0, 1.5, 0], look: [0, 1.5, -1], fov: 50 }],
    fog: "#cfd8e2", dens: 0.012, bg: "#a8c4e0", env: 0.38, exposure: 0.0, bloom: 0.45, sat: 0.12, contrast: 0.1, cInf: 2.2, ao: [0.45, 0.6, 2.4],
    grade: [[0.46, 0.49, 0.56], [0.58, 0.54, 0.47], 0.18], near: 0.03, far: 220,
    focus: (t) => C.at(t).l,
    act: ({ t, cam }) => applyCam(cam, C.at(t)),
  }];
};
export const RoomCamTest: React.FC<RoomCamProps> = ({ speed = 1 }) => {
  const S = React.useMemo(() => scenes(speed), [speed]);
  const [ok, setOk] = React.useState(roomReady()), [h] = React.useState(() => (roomReady() ? null : delayRender("room models", { timeoutInMilliseconds: 240000 })));
  React.useEffect(() => { if (!ok) loadRoom().then(() => { setOk(true); if (h !== null) continueRender(h); }); }, [ok, h]);
  return ok ? <Reel scenes={S} /> : null;
};
