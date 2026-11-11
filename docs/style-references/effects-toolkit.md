# Effects toolkit (use only when the story beat needs it)

**Rule:** an effect goes into a scene only if that beat needs it. Everything learned from the reference Shorts waits here until then. The frame-by-frame studies are in [cartoon-3d-short-study.md](cartoon-3d-short-study.md).

| Effect | Status | Where / how | Use it when |
|---|---|---|---|
| Ground crack from a contact point (glowing centre, branches, chips) | coded | `AyamWorld.setCrack(x, z, prog, size)` in `src/videos/ayam/world.ts`; centre = exact foot or hand point; animate `prog` 0→1 over ~8 f | a heavy stomp, punch or landing that the story wants to feel powerful |
| Dust / debris puff | coded | `Cast.fx(key, 300, 300, p => fxPuff(p, t), x, y, z, w, h, cam)`; grows ~3x in 12 f, fades by ~1 s | something lands, falls into a box or coffin, or snow / dust is shaken off |
| Light from a glowing object on faces (fire, screen, lamp) | coded | `Who.glow = { at, col, k, radius }` in world.ts; flicker with `AyamWorld.fireK(f)` | a character is near a bonfire, candle, phone or laptop screen, or lamp |
| Storm: grey gradient sky, muted world, fog | coded | mood `"storm"` in `setLight` | bad weather beats |
| Rain streaks | coded | `AyamWorld.setRain(cam, f)` (visible in storm) | storms only |
| Whirlwind (grey funnel, wall cloud, dust skirt, debris) | coded | `AyamWorld.setWind(lf)` | the "everything taken away" beat |
| Night with moon + bonfire | coded | mood `"night"`, `bonfire` group | night beats |
| Sunset (side-back sun, warm rims, violet gradient shade) | coded | mood `"golden"` | evening beats |
| Shade height gradient (dark base, light top) | coded | `TONE.uHBot / uHTop / uHRange` per mood (bridge/shade.ts) | always on (subtle) |
| 3D clouds + cloud shadows, 3D hills, clump trees | coded | world.ts constructor | always on (world) |
| Zoom out / fly to another place through clouds (about 3.5 s, one continuous move) | studied | camera keys: pull up → through roof → rise + yaw → oblique hold → dive through cloud → swoop → settle | changing location or showing "all over the country" |
| Hat pop on shock (tip 2 f → pop up → spinning arc out) | studied | needs hats as separate pieces | a big surprise |
| Face colour fill (purple anger, red embarrassed) + steam puffs | studied | overlay on the head drawing | anger or embarrassment beats |
| Talking mouth cycle (every 2-3 f), brow moves, ring eyes, head squash | studied | toon face library | dialogue and acting beats |
| Window light (beam + window-shaped patch + partly lit characters) | studied | additive beam card + patch decal | indoor scenes |
| Pendant lamp (cone shade, visible beam, warm pool, lit heads) | studied | additive cone + pool decal + `Who.glow` | indoor scenes with lamps |
| Fairy lights with glow halos | studied | small emissive bulbs + glow sprites | night rooms, celebrations |
| Metal specular streak (rails, pipes) | studied | Phong + bloom on the brightest streak | close-ups of metal |
| Wipe by a foreground object; into a phone screen | studied | camera passes a dark foreground prop / screen fills the frame | changing scene inside the same location; phone story beats |
| Object morph (shape changes to explain an idea) | studied | animate the geometry | when the idea is about a shape |
