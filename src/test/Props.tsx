import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { makeProp, PROP_NAMES } from "../videos/bridge/props";
const H: Record<string, number> = { windmill: 2.6, "stall-red": 1.9, "stall-green": 1.9, cart: 1.4, lantern: 1.9, "stall-bench": 0.7, canoe: 0.5, lily_large: 0.15, flower_redA: 0.6, flower_yellowA: 0.6, flower_purpleA: 0.6, grass: 0.5, grass_large: 0.6 };
const Scene: React.FC = () => {
  const g = useMemo(() => {
    const root = new THREE.Group();
    PROP_NAMES.forEach((n, i) => {
      const o = makeProp(n)!; const b = new THREE.Box3().setFromObject(o); const s = H[n] / (b.max.y - b.min.y);
      o.scale.setScalar(s); const col = i % 4, row = Math.floor(i / 4);
      o.position.set((col - 1.5) * 3.0, -b.min.y * s - row * 2.9 + 3.6, 0); o.rotation.y = 0.5;
      root.add(o);
    });
    return root;
  }, []);
  return <primitive object={g} />;
};
export const Props: React.FC = () => (
  <ThreeCanvas linear width={1080} height={1080} style={{ background: "#9fd0ee" }} camera={{ position: [0, -0.4, 15], fov: 46 }}>
    <ambientLight intensity={0.9} /><directionalLight position={[4, 6, 8]} intensity={2.2} />
    <Scene />
  </ThreeCanvas>
);
