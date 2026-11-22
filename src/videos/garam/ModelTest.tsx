// Quick look at every downloaded model for the Garam film (not part of the film).
import React from "react";
import * as THREE from "three";
import { continueRender, delayRender } from "remotion";
import { Reel, SceneDef } from "../../lib/scene";
import { loadModels, hasModels, mdl, sickLeaves } from "./models";

const mk = () => {
  const root = new THREE.Group(), sunDir = new THREE.Vector3(0.6, 0.8, 0.4).normalize();
  root.add(new THREE.Mesh(new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#8a9a6a" })));
  const sun = new THREE.DirectionalLight("#fff0d8", 3); sun.position.copy(sunDir).multiplyScalar(30); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20 }); root.add(sun);
  root.add(new THREE.HemisphereLight("#cfe0ff", "#806040", 1.2));
  const row = (names: string[], z: number, gap: number, s = 1) => names.forEach((n, i) => { const o = mdl(n, s); o.position.set((i - (names.length - 1) / 2) * gap, 0, z); root.add(o); });
  row(["coco_palm", "coco_palm2"], -30, 9);
  const sick = sickLeaves(mdl("coco_palm"), 1, 2); sick.position.set(13, 0, -30); root.add(sick);
  row(["house", "stand", "pickup", "boat", "banana"], 0, 7);
  row(["sack", "bag_open", "jar", "hoe", "coconut", "bushes", "fern", "grass", "rocks"], 20, 0.9);
  return { root, sunDir, update: () => undefined };
};
const S: SceneDef[] = [
  { from: 0, to: 1, mk, keys: [{ t: 0, pos: [0, 4.5, -8], look: [0, 5, -30], fov: 50 }], act: () => undefined, fog: "#cfe0ff", dens: 0.002, bg: "#bcd6f0" },
  { from: 1, to: 2, mk, keys: [{ t: 0, pos: [0, 1.4, 23.5], look: [0, 0.3, 20], fov: 45 }], act: () => undefined, fog: "#cfe0ff", dens: 0.002, bg: "#bcd6f0" },
  { from: 2, to: 3, mk, keys: [{ t: 0, pos: [0, 4, 22], look: [0, 1.5, 0], fov: 45 }], act: () => undefined, fog: "#cfe0ff", dens: 0.002, bg: "#bcd6f0" },
];
export const GaramModelTest: React.FC = () => {
  const [ok, setOk] = React.useState(hasModels()), [h] = React.useState(() => (hasModels() ? null : delayRender("garam models", { timeoutInMilliseconds: 240000 })));
  React.useEffect(() => { if (!ok) loadModels().then(() => { setOk(true); if (h !== null) continueRender(h); }); }, [ok, h]);
  return ok ? <Reel scenes={S} /> : null;
};
