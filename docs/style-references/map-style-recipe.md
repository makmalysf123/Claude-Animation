# Map style recipe (learned from GeoGlobeTales, rebuilt with our own tools)

Observed 10 November 2026 from close-up frames of their Shorts (Wallace Line, Darién Gap, Spain's borders).
We copy the *principles*, not their exact look. Labels, fonts and colours stay ours.

## What their maps are made of
1. **Base = real satellite image with relief.** Land is satellite colour with mountain shading; the ocean
   shows depth: light shallow shelves along coasts, dark deep basins, visible trenches and ridges.
   Slightly dark and cool overall, with a soft vignette at the edges.
2. **Highlighted region = coloured glass over the terrain.** The region is tinted with one saturated colour
   (green, orange, blue, cyan) at partial opacity, so mountains still show through. Around it is a thin
   bright outline plus a soft outer glow. Everything else stays natural.
3. **Lines = light, not ink.** Borders and routes are thin bright cores (white or pale pink) with a wide
   coloured glow; often dashed.
4. **Labels sit on the map.** Big bold white text with a heavy soft shadow, no boxes. Small subtitle text
   for narration.
5. **Camera** is mostly top-down with a slight tilt; slow push-ins, one smooth fly between places.
6. They also cut to real aerial footage and 3D city views (not something we can make without licensed footage).

## How we build it (src/videos/format/MapStyleTest.tsx)
- Base image: NASA Blue Marble Next Generation with topography & bathymetry (public domain), July 2004.
  Source tiles D1 + D2 (500 m/px) are kept local in `.cache/nasa/` (gitignored); cropped textures live in
  `public/maps/`: `indonesia_bmng_60.jpg` (lon 92–146, lat 20…−24, 60 px/deg) and
  `bali_lombok_bmng_240.jpg` (lon 112–121, lat −5…−11, 240 px/deg). Crop script logic: see the commit message.
- Grade in a shader: ocean mapped by brightness to dark-to-teal (our own grade, not theirs), land slightly
  desaturated and brightened. Vignette as a CSS overlay.
- Region highlight: Natural Earth polygons as a glassy tinted fill (opacity 0.3) + a thin white border (1.6 px).
- Colour reveal (copied from GeoGlobeTales "France vs England", studied frame by frame): one ink blot appears at the
  region's most inland point and swells with a lumpy, shape-shifting edge until the coast clips it. Duration follows
  size: `frames = 9 + 7.5 * sqrt(drop point -> farthest coast, degrees)`, clamped 10..45 (Bali ~0.5 s, Kalimantan ~1 s).
  The white border lights up segment by segment exactly where the ink reaches the coast. Labels are typed afterwards.
- Countries (`CountryRevealTest.tsx`): real borders from world-atlas countries-10m. Every island/part has its own drop;
  in an archipelago the drops ripple out from the largest part. Wide countries in a vertical frame show the polar
  regions, which a flat map stretches: keep the camera top-down and fade the top of the frame to dark.
- Textures: also `asia_bmng_40.jpg` (lon 55–165, lat 88…−48, 40 px/deg) cropped from the 21600×10800 world image.
- Lines: three.js fat lines (`LineSegments2`) with a dashed white core and a wide soft glow.
- Credit on screen: "Peta: NASA Blue Marble · Natural Earth".
