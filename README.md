# Claude Animation

Animated vertical shorts made with code: a 3D world in **three.js**, rendered to video frame by frame with **Remotion**,
plus synthesized sound effects and music in Python. Claude writes and edits the code; you pick the topic and review.

## What's inside
| Path | What it is |
|---|---|
| `src/videos/bridge/` | "The Bridge That Fell for a Song": a complete 67 s example short (world, characters, ink lines, lens blur, colour grade, camera) |
| `src/videos/bridge/props.ts` | Our own procedural props (lantern, cart, market stalls, bench, windmill, canoe, lily pad, flowers, grass) |
| `src/test/MixamoTest.tsx` | Test scene: a Mixamo character with idle, walk, wave, surprised and drop-kick animations |
| `src/lib/` | Small helpers |
| `audio/` | Sound effect and music synthesizer (Python: numpy + scipy) |
| `scripts/stills.mjs` | Render single frames to check the look before a full render |
| `docs/` | The original skill instructions and the style research it was built from |

## Setup on a Mac
1. Install **Node.js** (LTS) from nodejs.org.
2. In this folder:
   ```bash
   npm install
   pip3 install numpy scipy
   ```
3. Preview in the browser:
   ```bash
   npm run studio
   ```
4. Render a video:
   ```bash
   npx remotion render src/index.ts BridgeShort out/bridge.mp4
   ```
   A part only, e.g. the collapse (frames 1000-1149):
   ```bash
   npx remotion render src/index.ts BridgeShort out/collapse.mp4 --frames=1000-1149
   ```

## Assets that are not in the repository
- **Mixamo characters/animations** (`public/mixamo/*.fbx`): download from mixamo.com (FBX Binary, 30 fps).
  Put them in `public/mixamo/` named `idle.fbx`, `walking.fbx`, `waving.fbx`, `surprised.fbx`, `drop_kick.fbx`.
- **Kenney models** (optional, `public/bridge/kenney/*.glb`, CC0 from kenney.nl). Without them our own props in
  `props.ts` are used automatically.
- **Voice**: not included. Each short needs `voice.wav` + word timings (`words.json`).

## Credits
The bridge short engine, sound synthesizer and research come from
[mromidev/claude-animated-shorts](https://github.com/mromidev/claude-animated-shorts) by Mr omi (MIT license, see
`LICENSE-claude-animated-shorts`). The bridge story, script and characters are his: use them for testing, not for publishing.
