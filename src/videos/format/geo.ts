// Map data helpers for the explainer format: real coastlines from Natural Earth (world-atlas, public domain).
// Globe: land painted into an equirectangular canvas texture. Map: land polygons extruded into thin 3D slabs.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { feature } from "topojson-client";
import land10 from "world-atlas/land-10m.json";
import land50 from "world-atlas/land-50m.json";

export const COL = {
  bg: "#070d18",
  ocean: "#10213a",
  oceanLine: "rgba(255,255,255,0.05)",
  land: "#e6dcc4",
  landSide: "#a89a7c",
  west: "#4fc3b5", // Asian side
  east: "#f4a259", // Australian side
  key: "#ff5d73", // key subject / the line: our signature colour
  ink: "#0b1322",
  text: "#f4f1ea",
  dim: "#8b97ab",
};

type Ring = [number, number][];
export type Poly = Ring[];

const polys = (topo: any): Poly[] => {
  const fc = feature(topo, topo.objects.land) as any;
  const out: Poly[] = [];
  for (const ft of fc.features ?? [fc]) {
    const g = ft.geometry;
    if (g.type === "Polygon") out.push(g.coordinates);
    else if (g.type === "MultiPolygon") out.push(...g.coordinates);
  }
  return out;
};

// ---------- globe texture ----------
let globeTex: THREE.CanvasTexture | null = null;
export const globeTexture = () => {
  if (globeTex) return globeTex;
  const W = 4096, H = 2048;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = COL.ocean; g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(255,255,255,0.07)"; g.lineWidth = 2;
  for (let lon = -180; lon <= 180; lon += 15) { const x = ((lon + 180) / 360) * W; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let lat = -75; lat <= 75; lat += 15) { const y = ((90 - lat) / 180) * H; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.fillStyle = COL.land;
  for (const p of polys(land50)) {
    for (const off of [-360, 0, 360]) {
      g.beginPath();
      for (const ring of p) {
        let prev: number | null = null;
        ring.forEach(([lon, lat], i) => {
          let L = lon;
          if (prev !== null) { while (L - prev > 180) L -= 360; while (L - prev < -180) L += 360; } // unwrap across the antimeridian
          prev = L;
          const x = ((L + off + 180) / 360) * W, y = ((90 - lat) / 180) * H;
          if (i) g.lineTo(x, y); else g.moveTo(x, y);
        });
        g.closePath();
      }
      g.fill("evenodd");
    }
  }
  globeTex = new THREE.CanvasTexture(c);
  globeTex.anisotropy = 8;
  globeTex.colorSpace = THREE.SRGBColorSpace;
  return globeTex;
};

// Rotation (radians, about Y) that brings longitude `lon` to face the camera (+Z) on a THREE.SphereGeometry.
export const yawFor = (lon: number) => {
  const phi = ((lon + 180) / 360) * Math.PI * 2;
  return -Math.atan2(-Math.cos(phi), Math.sin(phi));
};

// ---------- flat map ----------
export const LON0 = 117, LAT0 = -3;
export const P = (lon: number, lat: number, y = 0) => new THREE.Vector3(lon - LON0, y, -(lat - LAT0));

// Wallace Line, approximate (for the test only)
export const WALLACE: [number, number][] = [
  [115.78, -11.5], [115.78, -8.3], [117.2, -6.3], [118.2, -4.0], [118.8, -1.0], [119.4, 2.0], [120.3, 4.5], [121.8, 5.6], [124.0, 7.5], [126.0, 10.5],
];
const wallaceLonAt = (lat: number) => {
  const w = WALLACE;
  if (lat <= w[0][1]) return w[0][0];
  for (let i = 1; i < w.length; i++) if (lat <= w[i][1]) { const a = w[i - 1], b = w[i]; const t = (lat - a[1]) / (b[1] - a[1]); return a[0] + (b[0] - a[0]) * t; }
  return w[w.length - 1][0];
};

export const BALI: [number, number] = [115.15, -8.4];
export const LOMBOK: [number, number] = [116.3, -8.62];

type Built = { west: THREE.BufferGeometry; east: THREE.BufferGeometry; bali: THREE.BufferGeometry; lombok: THREE.BufferGeometry };
let built: Built | null = null;
export const regionLand = (depth = 0.08): Built => {
  if (built) return built;
  const bbox = [92, -14, 144, 20];
  const west: THREE.BufferGeometry[] = [], east: THREE.BufferGeometry[] = [];
  let bali: THREE.BufferGeometry | null = null, lombok: THREE.BufferGeometry | null = null;
  for (const p of polys(land10)) {
    const r = p[0];
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [x, y] of r) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (x1 < bbox[0] || x0 > bbox[2] || y1 < bbox[1] || y0 > bbox[3]) continue;
    if (Math.hypot(x1 - x0, y1 - y0) < 0.03) continue; // skip specks
    const toV = (ring: Ring) => ring.map(([lon, lat]) => new THREE.Vector2(lon - LON0, lat - LAT0));
    const shape = new THREE.Shape(toV(r));
    for (const h of p.slice(1)) shape.holes.push(new THREE.Path(toV(h)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const near = (q: [number, number]) => Math.abs(cx - q[0]) < 0.35 && Math.abs(cy - q[1]) < 0.3 && x1 - x0 > 0.4;
    if (!bali && near(BALI)) { bali = geo; continue; }
    if (!lombok && near(LOMBOK)) { lombok = geo; continue; }
    (cx < wallaceLonAt(cy) ? west : east).push(geo);
  }
  built = { west: mergeGeometries(west)!, east: mergeGeometries(east)!, bali: bali!, lombok: lombok! };
  return built;
};

// ---------- generic local map (any city/region) ----------
// Projection: x = (lon - lon0) * k, z = -(lat - lat0) * k. Returns one merged slab geometry of the land in `bbox`.
export type LocalProj = { lon0: number; lat0: number; k: number };
export const PL = (pr: LocalProj, lon: number, lat: number, y = 0) => new THREE.Vector3((lon - pr.lon0) * pr.k, y, -(lat - pr.lat0) * pr.k);
const landCache = new Map<string, THREE.BufferGeometry>();
export const landNear = (pr: LocalProj, bbox: [number, number, number, number], depth: number) => {
  const key = JSON.stringify([pr, bbox, depth]);
  const hit = landCache.get(key);
  if (hit) return hit;
  const geos: THREE.BufferGeometry[] = [];
  for (const p of polys(land10)) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [x, y] of p[0]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (x1 < bbox[0] || x0 > bbox[2] || y1 < bbox[1] || y0 > bbox[3]) continue;
    const toV = (ring: Ring) => ring.map(([lon, lat]) => new THREE.Vector2((lon - pr.lon0) * pr.k, (lat - pr.lat0) * pr.k));
    const shape = new THREE.Shape(toV(p[0]));
    for (const h of p.slice(1)) shape.holes.push(new THREE.Path(toV(h)));
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    geos.push(g);
  }
  const merged = mergeGeometries(geos)!;
  landCache.set(key, merged);
  return merged;
};

// ---------- Indonesia by island group (for choropleth-style maps) ----------
export const GROUPS = ["Sumatra", "Jawa", "Kalimantan", "Sulawesi", "Bali & NT", "Maluku", "Papua"] as const;
export type Group = (typeof GROUPS)[number];
export const GROUP_CENTER: Record<Group, [number, number]> = {
  Sumatra: [101.5, -0.3], Jawa: [110.2, -7.3], Kalimantan: [114.0, 0.6], Sulawesi: [121.0, -1.8],
  "Bali & NT": [119.5, -8.7], Maluku: [128.8, -3.2], Papua: [137.5, -4.3],
};
const groupOf = (cx: number, cy: number): Group | null => {
  if (cx < 106.2 && cy > -6.2 && cy < 6.2 && cx > 94.5 && !(cx > 99.5 && cy > 1.6)) return "Sumatra"; // not the Malay Peninsula
  if (cx >= 105 && cx < 114.6 && cy < -5.6 && cy > -9.2) return "Jawa"; // not Christmas Island
  if (cx >= 108 && cx < 119.3 && cy >= -4.6 && cy < 7.2) return "Kalimantan"; // not Palawan
  if (cx >= 114.6 && cx < 125.5 && cy < -7.6) return "Bali & NT";
  if (cx >= 118.5 && cx < 125.6 && cy >= -6.5 && cy < 2.6) return "Sulawesi";
  if (cx >= 130.8 && cy > -9.5) return "Papua"; // not Australia
  if (cx >= 124 && cx < 135.5 && cy > -9.5 && cy < 3.0) return "Maluku"; // not the Philippines
  return null;
};
let groupsBuilt: { geo: Record<Group, THREE.BufferGeometry>; other: THREE.BufferGeometry } | null = null;
export const islandGroups = (depth = 0.12) => {
  if (groupsBuilt) return groupsBuilt;
  const bins: Record<string, THREE.BufferGeometry[]> = {};
  for (const p of polys(land10)) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [x, y] of p[0]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (x1 < 92 || x0 > 144 || y1 < -14 || y0 > 20) continue;
    if (Math.hypot(x1 - x0, y1 - y0) < 0.04) continue;
    const toV = (ring: Ring) => ring.map(([lon, lat]) => new THREE.Vector2(lon - LON0, lat - LAT0));
    const shape = new THREE.Shape(toV(p[0]));
    for (const h of p.slice(1)) shape.holes.push(new THREE.Path(toV(h)));
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    const k = groupOf((x0 + x1) / 2, (y0 + y1) / 2) ?? "other";
    (bins[k] ??= []).push(g);
  }
  const geo = Object.fromEntries(GROUPS.map((k) => [k, mergeGeometries(bins[k] ?? [])!])) as Record<Group, THREE.BufferGeometry>;
  groupsBuilt = { geo, other: mergeGeometries(bins.other ?? [])! };
  return groupsBuilt;
};

// ---------- outlines (rings as world-space points) for glowing borders ----------
export type Pick = "Bali" | "Lombok" | Group;
export const ringsFor = (pick: Pick, y = 0.03): THREE.Vector3[][] => {
  const out: THREE.Vector3[][] = [];
  for (const p of polys(land10)) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [x, yy] of p[0]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, yy); y1 = Math.max(y1, yy); }
    if (x1 < 92 || x0 > 144 || y1 < -14 || y0 > 20 || Math.hypot(x1 - x0, y1 - y0) < 0.04) continue;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const near = (q: [number, number]) => Math.abs(cx - q[0]) < 0.35 && Math.abs(cy - q[1]) < 0.3 && x1 - x0 > 0.4;
    const ok = pick === "Bali" ? near(BALI) : pick === "Lombok" ? near(LOMBOK) : groupOf(cx, cy) === pick;
    if (ok) out.push(p[0].map(([lon, lat]) => P(lon, lat, y)));
  }
  return out;
};
export const fillFor = (pick: Pick) => {
  const shapes: THREE.Shape[] = [];
  for (const r of ringsFor(pick, 0)) shapes.push(new THREE.Shape(r.map((v) => new THREE.Vector2(v.x, -v.z))));
  const g = new THREE.ShapeGeometry(shapes);
  g.rotateX(-Math.PI / 2);
  return g;
};

// ---------- countries (real political borders, Natural Earth 1:10m) ----------
import countries10 from "world-atlas/countries-10m.json";
export const COUNTRY = { China: "156", Indonesia: "360" } as const;
// Each island/part of a country as rings in world space (outer ring first, then holes).
export const countryParts = (id: string, y = 0): THREE.Vector3[][][] => {
  const fc = feature(countries10, (countries10 as any).objects.countries) as any;
  const ft = fc.features.find((x: any) => x.id === id);
  if (!ft) return [];
  const g = ft.geometry;
  const ps: Poly[] = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  return ps.map((p) => p.map((ring) => ring.map(([lon, lat]) => P(lon, lat, y))));
};
