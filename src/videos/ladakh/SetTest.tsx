// Look test for the Ladakh valley set (not part of the film): one still per camera view.
import React from "react";
import { continueRender, delayRender } from "remotion";
import { Reel, SceneDef, SetLike } from "../../lib/scene";
import { loadModels, hasModels } from "./models";
import { LembahSet, LembahOpts } from "./lembah";

const mk = (o: LembahOpts) => () => new LembahSet(o) as unknown as SetLike;
const DAY = { fog: "#c8d4e4", dens: 0.0016, bg: "#9cc4ec", cInf: 6, env: 0.4, exposure: 0.0, bloom: 0.55, sat: 0.12, contrast: 0.1, grade: [[0.42, 0.48, 0.6], [0.62, 0.56, 0.46], 0.22] as [[number, number, number], [number, number, number], number] };
const NIGHT = { fog: "#0c1428", dens: 0.003, bg: "#0a1022", cInf: 4, env: 0.1, exposure: 0.0, bloom: 1.0, sat: 0.1, contrast: 0.14, night: true };
const act = (cx: { t: number; set: SetLike; cam: import("three").PerspectiveCamera }) => { const k = cx.set as unknown as LembahSet; k.sprayAt(cx.t + 3, 1, cx.cam); };
const S: SceneDef[] = [
  { from: 0, to: 1, ...DAY, mk: mk({ season: "winter", stupa: 6.0, trench: 2 }), keys: [{ t: 0, pos: [6.5, 2.2, 4.5], look: [0, 4.2, -8], fov: 46 }], act },
  { from: 1, to: 2, ...DAY, mk: mk({ season: "winter", stupa: 6.0, flat: {}, trench: 2 }), keys: [{ t: 0, pos: [10, 14, 18], look: [-4, 1, -8], fov: 50 }], act },
  { from: 2, to: 3, ...DAY, mk: mk({ season: "winter", stupa: 5.0, trench: 2 }), keys: [{ t: 0, pos: [10.5, 1.6, 1.5], look: [17, 1.3, -3.5], fov: 42 }], act },
  { from: 3, to: 4, ...NIGHT, mk: mk({ season: "winter", night: true, stupa: 3.5, trench: 0.6, shadowAt: [10, 0, -26] }), keys: [{ t: 0, pos: [4, 2.0, -18], look: [12, 0.6, -30], fov: 44 }], act },
  { from: 4, to: 5, ...DAY, mk: mk({ season: "april", stupa: 4.6, channel: 1, sowed: 0.6, trench: 2, flat: { melt: 1.2 } }), keys: [{ t: 0, pos: [-8, 3.5, 12], look: [2, 1.5, -6], fov: 48 }], act },
];
export const LadakhSetTest: React.FC = () => {
  const [ok, setOk] = React.useState(hasModels()), [h] = React.useState(() => (hasModels() ? null : delayRender("ladakh models", { timeoutInMilliseconds: 240000 })));
  React.useEffect(() => { if (!ok) loadModels().then(() => { setOk(true); if (h !== null) continueRender(h); }); }, [ok, h]);
  return ok ? <Reel scenes={S} /> : null;
};
