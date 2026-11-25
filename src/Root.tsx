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
import { AyamShort, AYAM_SHORT_FRAMES } from "./videos/ayam/AyamShort";
import { AyamActTest, AYAM_ACT_FRAMES } from "./videos/ayam/AyamActTest";
import { AyamFull, AYAM_FULL_FRAMES } from "./videos/ayam/AyamFull";
import { KetindihanKamar, KAMAR_FRAMES } from "./videos/ketindihan/Kamar";
import { ActingTest, ACTING_FRAMES } from "./test/ActingTest";
import { Char3DTest, CHAR3D_FRAMES } from "./test/Char3DTest";
import { Move3DTest, MOVE3D_FRAMES } from "./test/Move3DTest";
import { FightTest, FIGHT_FRAMES } from "./test/FightTest";
import { Silhouette2DTest, SIL_FRAMES } from "./test/Silhouette2D";
import { ToonGallery } from "./test/ToonGallery";
import { KetindihanFilm, FILM_FRAMES } from "./videos/ketindihan2/Film";
import { GajiHook, HOOK_FRAMES } from "./videos/gaji/Hook";
import { KopiFilm, KOPI_FRAMES } from "./videos/kopi/Film";
import { KopiFilm2, KOPI2_FRAMES, KopiClip, KOPI2_CLIPS, clipFrames } from "./videos/kopi/Film2";
import { EmasPrevA, EmasPrevB, EmasPrevC, EMAS_PREV_FRAMES } from "./videos/emas/Preview";
import { EmasFilm, EMAS_FRAMES } from "./videos/emas/Film";
import { PlesterFilm, PLESTER_FRAMES } from "./videos/plester/Film";
import { GaramModelTest } from "./videos/garam/ModelTest";
import { GaramFilm, GARAM_FRAMES } from "./videos/garam/Film";
import { GaramCaptions, GARAM_CAP_FRAMES } from "./videos/garam/Captions";
import { LadakhSetTest } from "./videos/ladakh/SetTest";
import { LadakhFilm, LADAKH_FRAMES } from "./videos/ladakh/Film";
import { LadakhCaptions, LADAKH_CAP_FRAMES } from "./videos/ladakh/Captions";
import { ContactSheet, SHEET_W, SHEET_H, sheetMeta } from "./test/ContactSheet";
import { RoomCamTest, RoomCamTestBlur, ROOMCAM_FRAMES, roomCamFrames } from "./videos/room/RoomCamTest";

export const RemotionRoot: React.FC = () => (
  <>
  <Composition id="RoomCamTest" component={RoomCamTest} durationInFrames={ROOMCAM_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ speed: 1 }} calculateMetadata={({ props }) => ({ durationInFrames: roomCamFrames(props.speed) })} />
  <Composition id="RoomCamTestBlur" component={RoomCamTestBlur} durationInFrames={ROOMCAM_FRAMES * 4} fps={120} width={1080} height={1920} defaultProps={{ speed: 1 }} calculateMetadata={({ props }) => ({ durationInFrames: roomCamFrames(props.speed) * 4 })} />
  <Composition id="KopiFilm" component={KopiFilm} durationInFrames={KOPI_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="KopiFilm2" component={KopiFilm2} durationInFrames={KOPI2_FRAMES} fps={30} width={1080} height={1920} />
  {(Object.keys(KOPI2_CLIPS) as (keyof typeof KOPI2_CLIPS)[]).map((id) => <Composition key={id} id={id} component={KopiClip} durationInFrames={clipFrames(KOPI2_CLIPS[id])} fps={30} width={1080} height={1920} defaultProps={{ id }} />)}
  <Composition id="GajiHook" component={GajiHook} durationInFrames={HOOK_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="KetindihanFilm" component={KetindihanFilm} durationInFrames={FILM_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="ToonGallery" component={ToonGallery} durationInFrames={1} fps={30} width={1920} height={1080} />
  <Composition id="Move3DTest" component={Move3DTest} durationInFrames={MOVE3D_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="EmasFilm" component={EmasFilm} durationInFrames={EMAS_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="PlesterFilm" component={PlesterFilm} durationInFrames={PLESTER_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="GaramModelTest" component={GaramModelTest} durationInFrames={90} fps={30} width={1080} height={1920} />
  <Composition id="GaramFilm" component={GaramFilm} durationInFrames={GARAM_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="LadakhFilm" component={LadakhFilm} durationInFrames={LADAKH_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="LadakhCaptions" component={LadakhCaptions} durationInFrames={LADAKH_CAP_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="LadakhSetTest" component={LadakhSetTest} durationInFrames={150} fps={30} width={1080} height={1920} />
  <Composition id="GaramCaptions" component={GaramCaptions} durationInFrames={GARAM_CAP_FRAMES} fps={30} width={1080} height={1920} />
  {([["EmasPrevA", EmasPrevA], ["EmasPrevB", EmasPrevB], ["EmasPrevC", EmasPrevC]] as const).map(([id, C]) => <Composition key={id} id={id} component={C} durationInFrames={EMAS_PREV_FRAMES} fps={30} width={1080} height={1920} />)}
  <Composition id="Silhouette2DTest" component={Silhouette2DTest} durationInFrames={SIL_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="FightTest" component={FightTest} durationInFrames={FIGHT_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="Char3DTest" component={Char3DTest} durationInFrames={CHAR3D_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="ActingTest" component={ActingTest} durationInFrames={ACTING_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="ContactSheet" component={ContactSheet} durationInFrames={1} fps={30} width={SHEET_W} height={SHEET_H} defaultProps={{ prefix: "f_", frames: [] as number[] }} calculateMetadata={sheetMeta} />
  <Composition id="KetindihanKamar" component={KetindihanKamar} durationInFrames={KAMAR_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="AyamFull" component={AyamFull} durationInFrames={AYAM_FULL_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="AyamActTest" component={AyamActTest} durationInFrames={AYAM_ACT_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="AyamShort" component={AyamShort} durationInFrames={AYAM_SHORT_FRAMES} fps={30} width={1080} height={1920} />
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
