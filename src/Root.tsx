import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { Cube } from "./test/Cube";
import { Props } from "./test/Props";
import { MixamoTest, TOTAL as MIXAMO_FRAMES } from "./test/MixamoTest";
import { FormatTest, FORMAT_TEST_FRAMES } from "./videos/format/FormatTest";
import { G30SSample, G30S_FRAMES } from "./videos/format/G30SSample";
import { CatsSample, CATS_FRAMES } from "./videos/format/CatsSample";
import { KrakatauSample, KRAKATAU_FRAMES } from "./videos/format/KrakatauSample";
import { MapStyleTest, MAP_STYLE_FRAMES, MapPreview } from "./videos/format/MapStyleTest";
import { CountryRevealTest, COUNTRY_TEST_FRAMES } from "./videos/format/CountryRevealTest";
import { Proclamation3DTest, PROCLAMATION_FRAMES } from "./videos/format/Proclamation3DTest";
import { DailyLife3DTest, DAILY_FRAMES } from "./videos/format/DailyLife3DTest";
import { WarungToonTest, WARUNG_TOON_FRAMES } from "./videos/format/WarungToonTest";
import { OfficeBridgeTest, OFFICE_FRAMES } from "./videos/format/OfficeBridgeTest";
import { AyamStory, AYAM_FRAMES } from "./videos/format/AyamStory";
import { AyamTest, AYAM_TEST_FRAMES } from "./videos/ayam/AyamTest";
import { AyamRef, AYAM_REF_FRAMES } from "./videos/ayam/AyamRef";
import { AyamCast } from "./videos/ayam/AyamCast";

export const RemotionRoot: React.FC = () => (
  <>
  <Composition id="AyamCast" component={AyamCast} durationInFrames={1} fps={30} width={1080} height={1920} />
  <Composition id="AyamRef" component={AyamRef} durationInFrames={AYAM_REF_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="AyamTest" component={AyamTest} durationInFrames={AYAM_TEST_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="AyamStory" component={AyamStory} durationInFrames={AYAM_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="OfficeBridgeTest" component={OfficeBridgeTest} durationInFrames={OFFICE_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="WarungToonTest" component={WarungToonTest} durationInFrames={WARUNG_TOON_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="DailyLife3DTest" component={DailyLife3DTest} durationInFrames={DAILY_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="Proclamation3DTest" component={Proclamation3DTest} durationInFrames={PROCLAMATION_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="CountryRevealTest" component={CountryRevealTest} durationInFrames={COUNTRY_TEST_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="MapPreview" component={MapPreview} durationInFrames={1} fps={30} width={1920} height={1080} defaultProps={{ highlight: false }} />
  <Composition id="MapStyleTest" component={MapStyleTest} durationInFrames={MAP_STYLE_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="KrakatauSample" component={KrakatauSample} durationInFrames={KRAKATAU_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="CatsSample" component={CatsSample} durationInFrames={CATS_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="G30SSample" component={G30SSample} durationInFrames={G30S_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="FormatTest" component={FormatTest} durationInFrames={FORMAT_TEST_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="MixamoTest" component={MixamoTest} durationInFrames={MIXAMO_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="Props" component={Props} durationInFrames={1} fps={30} width={1080} height={1080} />
  <Composition id="Cube" component={Cube} durationInFrames={30} fps={30} width={540} height={960} />
  <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
