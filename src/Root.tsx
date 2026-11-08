import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { Cube } from "./test/Cube";
import { Props } from "./test/Props";
import { MixamoTest, TOTAL as MIXAMO_FRAMES } from "./test/MixamoTest";

export const RemotionRoot: React.FC = () => (
  <>
  <Composition id="MixamoTest" component={MixamoTest} durationInFrames={MIXAMO_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="Props" component={Props} durationInFrames={1} fps={30} width={1080} height={1080} />
  <Composition id="Cube" component={Cube} durationInFrames={30} fps={30} width={540} height={960} />
  <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
