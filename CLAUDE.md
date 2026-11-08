# Notes for Claude (read first)

The person behind this project is new to coding. Explain in plain words, Indonesian or English (follow their language),
and do the technical work yourself. Never publish the bridge short as theirs: it is Mr omi's story (test material only).

## Stack: pinned on purpose, do not "upgrade"
React 18.3, @react-three/fiber 8.18, @react-three/postprocessing 2.x, postprocessing 6.x, three 0.170, Remotion 4.0.541.
- With React 19 + @react-three/fiber 9 + @react-three/postprocessing 3, every `<EffectComposer>` renders BLANK frames
  inside Remotion (plain three.js still works). This cost hours to find; keep the pins.
- R3F 8 copies a `dispose={null}` prop onto the object, so `obj.dispose` becomes null. Call cleanup through the class
  prototype (see `InkPass.prototype.dispose.call(...)` in `src/videos/bridge/Bridge.tsx`).

## Rendering
- Stills first, always: `COMP=<id> node scripts/stills.mjs out/<name>/s_ 100,400 0.5`, look at them, fix, then render.
- Full render: `npx remotion render src/index.ts <Comp> out/<name>.mp4` (add `--frames=a-b` for a part).
- Cloud box without GPU: add `--gl=swangle` (and `GL=swangle` for stills). On a Mac/PC with a GPU the defaults work.
- Remotion leaves temp bundles behind; keep 30+ GB free on the Mac (256 GB disk) and clean `tmp/` after big jobs.
- Remotion writes a silent audio track; add sound with ffmpeg `-map 0:v:0 -map 1:a:0`.

## Assets
- `src/videos/bridge/props.ts` makes our own props for every Kenney model name; Kenney GLBs in `public/bridge/kenney/`
  are used instead when present.
- Mixamo FBX: each file holds the real take ("mixamo.com") AND an empty "Take 001", in either order. Always use the
  longest clip. Scale the character by its head-top bone (`mixamorigHeadTop_End`) to ~1.78 m; strip x/z hips root motion
  for walk/idle loops and move the character in code. See `src/test/MixamoTest.tsx`.

## Sound
`audio/sfx_gen.py` synthesizes ~40 effects (bolt snap, splash, boots, whoosh, crowd...). `audio/sfx.py render(v_ref)`
builds the bridge's effect track; `audio/music.py render(build(), ref)` the march score. `audio/mix.py` needs a voice
(`voice/voice.wav` + `voice/words.json`). Claude cannot hear audio: verify levels by measurement and ask the user.

## Workflow lessons
- Check stills at full size for objects passing through each other, hands not touching what they hold, cameras inside
  walls, text overflowing. The user notices these immediately.
- Realistic characters (e.g. Mixamo "Remy") clash with the toon world; prefer stylised characters.
