# Cartoon 3D short style: what we learned (RicksClips3000 + claude-animated-shorts)

Studied on 2026-11-11.

Sources:
- **Five recent Shorts from @RicksClips3000**, studied frame by frame:
  - Why Drivers Started Filming The Road
  - The Town Built Around a Button
  - The Pink Prison Cell Experiment
  - Why Sailors Carried Storm Oil
  - The Difference Between Rich And Poor (KnoxClips7000, same style)

  Method: contact sheets every 3.3 s, plus dense strips every 2-3 frames around camera moves and transitions.
- **The repo `mromidev/claude-animated-shorts`**: `SKILL.md`, `STYLE_BIBLE.md`, and the seven measured reports (motion, depth, lighting, outlines, textures, characters, grade). It is cloned in `.cache/` (gitignored).

## What the channel does (seen in the frames)

**World**
- Detailed 3D sets: cars, houses, rooms, ships.
- Every surface is painted as a few flat colour fields with thin painted seams.
- Windows, doors and mortar are painted into the texture, not stuck on as thin boxes.
- Lots of props everywhere, and big foreground props in close-ups (a pot, a lens, a car door) in about a third of the medium and close shots.

**Light**
- The light changes with the story beat: bright day, then purple dusk with warm headlights and bloom, then blue night with warm windows.
- Window light shafts fall across rooms and characters.
- Hard sun shadows: window bars run over the characters.

**Characters**
- Bean heads, plum ink, deadpan lidded eyes.
- Pale faces (luma about .93), simple stick limbs.
- The expression changes on the word: a 1-frame swap hidden by a blink.

**Camera**
- Almost never still: a slow push-in on every hold (0.15-0.35 % per frame).
- Moves are ease-in-out glides of about 20-25 frames, not snaps. A crane-up to an aerial takes about 0.8 s.
- Low eye-level camera, about 0.8 × character height.
- Rolls of 4-8°.

**Transitions**
- About 6-frame crossfades between places.
- Continuous flights, for example the prison yard: up through the roof, to an aerial patchwork of fields with 3D clouds that cast shadows, then down through a cloud to the next place. That matches our "zoom into Indonesia through clouds" idea.
- Whip pans are rare and always carry strong motion blur.

**Effects**
- Money and coins are hundreds of individual 3D bundles that pour, fly and pile up, never one textured cone.
- Debris on impacts, dust puffs, glows and rings around important objects.

**Inserts**
- About 22 % of shots are prop close-ups: a hand, a button, a bowl.

## Why our test glitched

1. **The brown ground vanished for a frame.** The dirt and road planes sat 1.5-3 cm above the grass. Through the post-processing chain the depth buffer cannot tell them apart at 20-60 m, so whole planes flicker behind the grass (z-fighting).
   - Fix: one ground mesh with a painted world-space map (grass, dirt, road, field). Nothing is coplanar.
2. **Black lines at doors and windows "moved".** Doors and windows were 1 cm boxes in front of the wall. They z-fight, and the ink pass outlines whichever wins on each frame.
   - Fix: paint doors and windows into the facade textures, as the reference and `facadeHD` do. Geometry only for things at least about 15 cm proud (terrace pillars, balcony, step).
3. **The gold pile looked fake.** It was one cone with a tiling coin texture.
   - Fix: a heap of about 1,500 instanced coins, gold bars and money sacks; coins slide and roll.
4. **No sound.** The picture was not locked yet. Sound is made last, timed to the final frames.

## Rules we keep (from the repo reports)
- Ink #0b0a0c, about 3 px at 1080. Lines on silhouettes, depth jumps, creases and contacts. Character cards never get world ink.
- Sky stops by elevation, with fog the horizon colour.
- Two-tone shade: day shadow about 0.5 of lit, never grey. Golden light comes from behind, with violet shadows.
- Card shading so faces stay light. A contact blob under every standing figure.
- DOF on close and medium shots (cInf 10-16 px), wides sharp. Bloom only on emissive things: lamps, sun, glints.
- Composition:
  - head top at y about 0.35 (MS) and 0.38 (FS)
  - horizon at y about 0.45
  - camera at about 0.8 × character height
  - a foreground object in about one third of medium shots

## Faces, frame by frame (added 2026-11-11)

Sources:
- "How a Mirror Rigged a Horse Race" (5WMQhPObNqQ), 10.6-11.5 s, every frame.
- "Why Perfect Railroads Don't Work" (7xS87iActkU), 16.9-18.9 s and 54.6-56.1 s, every 1-2 frames.

**Talking**
- The mouth changes every 2-3 frames, following the syllables. It cycles between:
  - a closed side smirk
  - wide open with teeth and tongue
  - small open
  - back to the line
- The prop in the mouth (a toothpick) moves with it.

**Brows**
- They move on every beat: up when the mouth opens, down on the stressed word.
- They are often asymmetric: one raised, the other flat.

**Eyes**
- There are several eye types, swapped instantly:
  - deadpan half-lids (default)
  - big rings with small dot pupils (surprise, mania)
  - almond eyes with pupils
  - shut lines (blink)
- The eye size pulses between frames: the ring grows and shrinks a little.
- Blinks also happen in the middle of a grin.

**Head shape**
- The head outline changes with the expression. It is wider and rounder on a big grin or surprise, narrower and taller on a neutral face, and a little squashed on a shout.
- On a three-quarter turn, all features slide toward one side and the head bulges on that side. The head also tilts a few degrees.
- Hats and caps tilt with the head.

**Anger**
- The face fills with purple from the chin up in about 4 frames.
- White steam puffs pop out on both sides of the head and keep cycling.
- The brows form a sharp V, and the mouth is gritted teeth (a rectangle with tooth lines).
- The head trembles 1-2 px.

**Shock gags**
- The hat jumps up off the head on a big surprise.
- Sweat drops appear.

**Timing**
- Expression swaps are instant (1 frame) and land just before the word.
- Long holds are never frozen: blinks, eye-size pulses and mouth beats keep the face alive.

**Hats, frame by frame** (Railroads, 53.75-54.60 s, every frame)
- **At rest** the hat sits on the head and follows every head bob and tilt with no lag (bowler, cap, top hat). When the head tilts, the hat tilts the same amount.
- **The shock pop** lasts about 12 frames, and every frame is a different pose:
  1. **Anticipation**, 2 frames before the shock (53.90-53.95): the face drops to deadpan and the hat already tips about 15°, then about 30°, and lifts a little.
  2. **Pop** (54.00): the face swaps to ring eyes and an O mouth. The hat jumps straight up, upright, about a third of a head height above the crown.
  3. **Rise** (54.05): it goes a little higher and starts to rotate.
  4. **Tumble away** (54.10-54.35): it flies sideways in an arc (about 0.6 head width per frame) and spins about 25-35° per frame. It is a real 3D hat: we see the top, the brim and the inside as it turns. It leaves the frame in about 8 frames and never comes back in the shot.
  5. The head stays frozen in shock (ring eyes, O mouth, sweat drop) while the hat flies. A blink follows.
- The cut after it is a 6-frame crossfade (54.35-54.55) into the next shot.
- **For our cast:** caps, peci and caping should be drawn or placed as a separate piece that follows the head tilt. On shock gags they pop (anticipation tip, then a straight pop up, then a spinning arc out of frame), for example the caping flying off when the whirlwind arrives.

**Dust / snow puff on an impact** ("What the Grave Bell Really Meant", GM9UKnZ6JFw, 11.25-12.40 s, every 2 frames)
- **Frame 0** (the bell swings): first a few bright specks jump off the surface (the snow on the roof).
- **Frames 2-4:** the snow layer on the roof lifts away as lumps. At the same time, a soft white puff appears right on the surface.
- **Frames 4-12:** the puff grows about 3x. It is made of overlapping soft round blobs with lighter tops and slightly darker undersides, semi-transparent, and drifts up and to the side. Small specks keep falling around it.
- **Frames 12-24:** it keeps drifting and fades out slowly. It is gone after about 1 s. The surface it came from is now bare.
- The puff takes the scene light (blue-white at night). It is not pure white and has no ink outline.
- The same recipe fits a fall into a coffin or onto the ground: a ring of soft puffs low at the contact point, specks flying out, a quick grow, then a slow fade.

## "This Shape Saved Roller Coasters" (QlDPMzGmYac): metal, trees, day vs night

**Metal rails (10.3-11.3 s, night)**
- The steel rails are round tubes with a dark body and one bright specular streak along the top or inner edge. The streak is a reflection of the single warm bulb hanging under the station roof.
- The streak is brightest close to the camera, with a small bloom, and fades with distance. It slides along the rail as the camera moves, which is what makes them read as real metal.
- The loop tracks at night carry many tiny white glints from the moonlight.
- The same bulb throws a warm pool on the wooden platform, and the edges fall off into the blue night.
- Our version: metal materials with a specular highlight (Phong) toward the main local light, plus bloom above threshold only on the brightest streak.

**Trees are real 3D**
- **Day:**
  - A broadleaf tree is many leaf clumps with jagged, leafy alpha-cut edges.
  - Each clump has its own lit side (bright yellow-green, toward the sun) and shade side (deep green), and the clumps shade each other.
  - It has a brown trunk and an ink outline.
  - Pines are stacked layers of leafy clumps, not one smooth cone.
- **Night:** the same trees turn into near-black navy silhouettes with only a faint moon rim, sitting against a pale moonlit ground.

**Hills**
- **Day:**
  - Smooth rolling grass with a painted gradient: lighter on the sunlit tops, darker in the hollows.
  - Visible grass strokes up close.
  - Distant hills fade into a blue haze (aerial perspective).
- **Night:**
  - The hill surfaces turn pale blue-lavender (moonlit) while the trees go dark, so the silhouettes read strongly.
  - The sky is deep blue with stars. The moon glows with a bloom halo. Wispy clouds are lit by the moon on their edges.

**Other things unique to this video**
- **Day to night:** a crossfade dissolve over about 10 frames (9.95 s), on the line "the night before".
- **Floodlights and fairy lights at night:** a warm floodlight from below makes a blown-out spot on the ground with bloom. Strings of small coloured bulbs run along the wooden track and glow.
- **Object morph:** the round loop squeezes into a teardrop (clothoid) shape over about 2 s (24-26 s) while the camera cranes back. The story idea is acted out by the object itself.
- **Escalating laugh:** a foreground character's expression builds over about 1 s (21.2-22.2 s): smug, then grin, then open laugh, then a huge laugh.
- **Grand opening (day):**
  - confetti on a red carpet
  - glossy balloons with a highlight
  - a ferris wheel with coloured cabins and flags
  - characters casting crisp shadows
  - a big foreground prop (a "FIRST!" sign) in the frame

## "The Pink Prison Cell Experiment" (HxqtHI62otM), frame by frame

**Floor crack from a stomp (25.30-25.85 s, every 1.5 frames)**
1. **Anticipation, 2 frames:** the foot lifts and the face goes smug.
2. **Impact frame:** the foot lands. On that same frame a pink-white flash glows right under the foot and the first short cracks appear.
3. **Next 2 frames:** chips and debris specks jump up and out, and a low dust puff appears at the contact point.
4. **About 8 frames:** grey crack lines grow outward radially, branching as they go.
   - The centre stays lit (a glow decal) and the outer tips are thin.
   - The cracks stay in place after that; they are permanent.
   - The face turns to a big grin.

**Red "power" lines from the hands (26.40-27.10 s)**
- The arms rise (a flex) over about 3 frames.
- Red branching lines, like veins or lightning, then appear on the wall starting at the hands and forearms.
- The pattern changes every 1-2 frames (new branches in new places), so it reads as crackling energy rather than a static crack.
- The face darkens: shadowed eyes and a menacing grin.
- **Our rule:** every crack or energy line starts exactly at the contact point (the hand tip or the foot), placed in 3D where the hand touches the wall or floor, and grows outward from there.

**Light coming into a room** (0.5 s, 3.8 s, 33.5 s)
- **Three layers every time:**
  1. A visible beam: a soft, slightly hazy diagonal shaft from the window or skylight.
  2. A hard bright patch on the far wall or floor, shaped like the window, with the bars' shadows inside it.
  3. Characters lit only where the beam hits them: the top of the head bright, the rest in cool shade.
- The room itself stays cool and blue in the shade, while the patch is warm white.
- In the pink cell, the pink walls tint the characters' white clothes pink (bounce light).

**Zoom out and change of place (38.3-41.9 s, about 3.5 s, one continuous camera move)**
1. **38.30-38.77, pull up:** the camera rises and tilts down onto the characters (top-down). It speeds up (ease-in).
2. **38.83-39.03, through the roof:** we pass through the skylight frame, the glass roof and the roof gravel, then see the building's roof edge.
3. **39.10-39.83, fast rise with a slight yaw spin:**
   - The building shrinks to a small compound among fields.
   - Centre-pivot circles, field patches, a river and tree clumps appear.
4. **39.83-40.30, tilt to an oblique view:**
   - The horizon appears with haze.
   - Puffy 3D clouds (white tops, blue-grey undersides, dark shadows cast on the fields) pass close to the lens for parallax.
   - Many identical small compounds dot the land, matching the line "jails all over the country".
5. **40.30-40.70, short hold** with a slow drift.
6. **40.70-41.03, dive:** the camera pitches down and passes through a cloud (white sweeps across the top of the frame).
7. **41.03-41.43, fast swoop** onto another jail.
8. **41.43-41.83, settle:** the camera eases out to a low oblique of the new location (pink vans parked outside, matching the story).
- **For us:** the map, then down onto Java and the kampung through clouds, follows exactly this grammar. The reverse can be used too: from the kampung up to "all of Indonesia".

**Other findings in this video**
- **Inserts:** top-down prop close-ups (a paint bowl on a cutting mat, a colour swatch card "P-618", a giant stopwatch in the foreground).
- **Colour cue:** the whole cell is pink, and the bounce light tints the characters.
- **Hall lighting:** sunlit with haze and soft blown highlights. Skylights throw grid-shaped patches on the floor.

## "Apa yang terjadi kalau Bagas selalu bilang tidak di kantor?" (kzUgW39VfbI): Indonesian office, same style, 131 s

**Pendant lamps that feel real** (23.8 s, 29.0 s, 42.0 s; dense at 41.4-42.9 s)
1. **The shade:** a cone with a dark outside and a glowing rim and underside. The bulb is a small hot spot with bloom.
2. **The beam:** a soft visible cone of warm light from under the shade down to the table. It is brightest at the top and fades as it goes down, its edges are soft, and it is semi-transparent: the window and city show through it.
3. **The pool:** a warm bright ellipse on the table under the lamp. Glossy things in it (a bottle, cups, a phone) get small highlights.
4. **People under it:** the tops of their heads and shoulders are lit warm, while the lower body and the faces turned away stay in cooler shade.
5. Several lamps in one room each make their own cone and pool. In the negotiation room (61-75 s), golden lamps against a dark room give a cinematic mood with a vignette.
- The light does not flicker. The scene stays alive through a slow camera slide (parallax against the city outside the window).

**Other details**
- **Wipe transition** (41.4 s): a dark foreground object (a pillar or person) crosses the lens and reveals the next shot.
- **Into the phone** (10.8 s): the phone screen fills the frame and the motivational video on it becomes the shot. The phone is in the blurred foreground and the screen glows on the scene.
- **Phone UI inserts** (36.8 s, 54 s, 85.5 s): close-ups of a chat app showing the message, held in a hand or lying on the desk.
- **The night room** (8.2 s, bookended at 103 s):
  - small lesehan desk, sajadah, laptop glow on the face
  - a string of coloured fairy lights, each bulb with a soft glow halo on the wall
  - a line of hanging shirts
  - a starry window, a poster, books
- **Face colour changes:** a whole face turns red when angry or embarrassed (71.5 s), and there is sweat on a nervous boss (92.5 s).
- **Indonesian cast and props:**
  - hijab women, a bald boss with a moustache, office lanyards
  - a "SYUKURAN AKUISISI" banner and a "KANTOR PUSAT" logo wall
  - queue rope posts, wall calendar, whiteboard with "NOVEMBER"
- **Crowded rooms:** dozens of characters at once (an open office, a ceremony), all at different depths with background blur.
