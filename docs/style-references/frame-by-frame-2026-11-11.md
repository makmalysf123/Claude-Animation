# Frame-by-frame study: the 6 newest RicksClips3000 shorts (2026-11-11)

**What this is:** a private study after "Satu Ayam" v1 was rejected (static cameras, stiff characters, props popping in, flat light).

**Method:**
- Every frame of each video was captured at 30 fps by seeking frame by frame in the in-app browser: 2,005 + 1,867 + 1,936 + 1,953 frames for videos 1, 2, 6 and 5.
- I read them as 60-frame contact sheets (2 s each).
- At acting moments I read consecutive frames (step 1-2 f) at larger size.
- For videos 3 and 4 I took overview frames every 1.5 s, plus consecutive-frame strips.

**Videos:**
1. How One Cart Stopped an Entire Army (i4hYq1oSXTg)
2. Why Drivers Started Filming The Road (e9NoHjAXYIY)
3. This Shape Saved Roller Coasters (QlDPMzGmYac)
4. The Pink Prison Cell Experiment (HxqtHI62otM)
5. Why Perfect Railroads Don't Work (7xS87iActkU)
6. Why Sailors Carried Storm Oil (Mz72MuPgnGY)

Also read file by file: `mromidev/claude-animated-shorts` (SKILL.md, story.ts, cast.ts, toon.ts, world.ts, lights.ts, Bridge.tsx, and the motion, characters and lighting reports).

## 1. Camera: what v1 did wrong

**v1:** one fixed framing per shot from the front, with a slow creep.

**Reference: a new framing roughly every 1.5-2 s.** Video 4 sampled every 1.5 s gives a different framing almost every sample:
- high-angle wide
- insert of a poster
- big close-up of a face
- top-down insert of a paint can
- hall wide
- two-shot at a table
- foreground hand with a stopwatch close to the lens
- low pink-room wide

**Shot types used constantly:**
- **Inserts and close-ups of the object the line is about:** the cart's lever, the arrows sticking in the cart, the paint can, the stopwatch, the broken coaster car.
- **Low angles:** grass blades in the foreground (v1 f660), hero shots from below (v3 f0).
- **Over-the-shoulder with a big foreground character cut by the frame edge on purpose:** v1 f1028-1072, a soldier at the edge in front of the man on the cart. This is the only kind of "cut-off" allowed: deliberate, a framing element, never the subject.
- **Top-down inserts** (v4 f225).
- **POV shots** (v1 f1620: from the cart roof looking up at the arrows).

**Moves (frame-measured):**
- **Follow the object to change place.**
  - v6 f4-40: the chef pours oil and the camera cranes down the hull following the stream to the sea, in about 1.2 s with no cut.
  - v1 f60-120: the camera travels from the cart, along the castle wall, over it, across the fields, into the approaching army. One continuous ~2 s move.
  - v2 f48-58: from inside the car, the camera pulls out through the windscreen to the car on the highway in 10 frames.
- **Trucks and pans that follow a walking character into frame:** v1 f612-629, the camera slides along the cart and the man walks in from the right.
- **Lateral tracking** along a line of soldiers (v1 f181-215) or alongside a moving car (v2 f484-540).
- **Crossfade dissolves of 4-6 frames** at place or time changes (v1 f142-146, f176-181, f236-240).
- **Background life during holds:** traffic passes behind the actors (v2 f256-290) and the camera orbits slightly. A hold is never a frozen picture.
- **The repo's grammar (story.ts):**
  - 2-3 camera keys per shot
  - cut on the word for big reframes
  - smootherstep glides of 18-40 f
  - punch push-ins of 0.6 %/f for ~35 f on key words
  - rolls of 4-8°
  - frame-alternating kicks over 7 f on impacts
  - foreground props in about 1/3 of shots

## 2. Characters: what v1 did wrong

**v1:** everyone stood upright, symmetric, arms down, and the expression switched in one frame.

**Talking or reacting faces change on almost every frame** (v1 f308-325, commander, step 1):
- **Mouth:** a new shape every 1-2 f (dash, small open, wide teeth, O, gritted teeth).
- **Brows:** relaxed, then raised (f314-316), then one raised (f317-319), then furrowing into a deep V over 6 f (f320-325).
- **Eyes:** lidded, dot, slanted.
- **Head:** tilts and bobs a few pixels; the hat or helmet moves with it.
- **When the narrator quotes a character, that character lip-syncs the words.**

**Expression swaps** (v3 f184-192):
1. Grin.
2. f186: half-lid eyes with the grin still there.
3. f188: a blink.
4. f192: deadpan.

So the swap hides behind a 2-4 frame blink. **The head outline changes too:** wider and rounder on the grin, narrower and taller on deadpan.

**Whole-body acting:**
- **Bending and reaching:** v1 f744-752, a soldier bends forward and reaches down to a basket; the head drops and the torso leans ~30°.
- **Strike** (v1 f762-776):
  - the angry man rushes in with a fast arm swing, red motion trails and an impact mark (the slap)
  - the camera follows
  - a radial ring wipe closes the beat
- **Flex** (v4 f786-800): the arms rise into a flex over ~6 f, the face turns menacing, then cracks spread from the body (f800-830) while the camera pushes in.
- **Working poses:** the rail worker is bent over his tool, the arm reaching to the ground (v5 f30-46), talking the whole time.
- **Sitting:** the scam guy sits on the road against the car with his legs splayed (v2 f256-290), yelling with squeezed eyes.
- **Props held in both hands, and they move with the body:** the broken coaster car (v3), the pot of oil (v6), the paint can (v4), the stopwatch (v4).
- **Torso lean 3-8°, head tilt about ±5°, one arm doing something while the other hangs, never mirror-symmetric** (characters report).

**Props never pop in:**
- They are carried, thrown, poured or walked in. The coat flies in an arc over the cart (v1 f912-924), and the oil pours as a stream (v6).
- When something must appear, it arrives through an action or with a puff.

## 3. Light, atmosphere and effects

**The light follows the beat:**
- v1: day, then purple dusk, then blue night with warm lanterns, then sunset. Video 2 has the same arc.
- **Night is never flat:**
  - moonlit blue base
  - warm practical lights (lanterns, lamps, car headlights) that throw **bright pools on the ground** and light faces from their side (v2 f1196-1240, headlight pool)
  - the rest falls off into blue
- **Interior and gate light:** a warm sun shaft through the gate behind the actors, with rim light on their heads (v1 f296-340).
- **Faces:** crescent shading on the side away from the key light, and a gradient across the torso (1.0 → 0.55-0.66).
- **Shadows:**
  - day: soft contact blobs
  - sunset: long soft figure shadows
  - hard shadows from bars, rigging or windows fall across the characters

**Atmosphere and effects (all seen in these 6):**
- dust clouds behind an army
- sawdust and wood chips flying
- arrow streaks with white trails
- a fire-and-smoke mushroom with the characters lit orange (v5)
- splash at the waterline (v6)
- falling leaves and debris at night (v2)
- a red crack network (v4)
- motion smears on fast arms and passing trains (v5)
- the impact ring wipe (v1 f778)

## 4. What this means for "Satu Ayam" v2 (the rebuild)

1. **Shots.** Each beat gets 2-4 framings, cut on words: wide, then a close-up of the faces, then an insert of the object (the chicken, the egg basket, the bones, the coin heap). Add low angles and over-the-shoulder shots with a foreground character, and keep subjects inside the frame.
2. **Place changes.** Follow an object instead of cutting:
   - the whirlwind debris carries the camera to the lapangan
   - a falling chicken leads the camera down to each group
   - smoke from the roast rises into the night sky
   - an egg rolls into the next scene

   Use 4-6 f dissolves only for time jumps.
3. **Faces.**
   - Mouth and brow changes on ones while a character is quoted or reacting.
   - Every expression swap goes behind a 4-frame blink (half / shut / shut / half).
   - The head outline morphs with the expression.
   - Head tilt ±5° and bobbing; hats follow.
4. **Bodies.** New poses:
   - bend and reach
   - carry with two hands
   - hand over
   - eat (hand to mouth)
   - point
   - flex or anger
   - sit on the ground
   - walk in profile with planted feet, bob 3-7 % and lean 1-7°

   Torso lean 3-8°, asymmetric arms.
5. **Props.** Every prop enters through an action:
   - the basket is carried in and set down
   - the roast is turned on the spit, eaten bite by bite and shrinks to bones
   - the eggs are handed over one by one
   - the chickens fall with puffs
6. **Light.**
   - Night: bonfire pool on the ground and faces lit from the fire side, with smoke rising.
   - Sunset: long shadows.
   - Storm: dark grey with dust and debris clouds and a camera kick on impacts.
   - Day: a side-back sun for crescent shading and contact blobs.
