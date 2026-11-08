import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, getInputProps } from "remotion";
import { EffectComposer, Vignette } from "@react-three/postprocessing";
export const Cube: React.FC = () => {
  const f = useCurrentFrame();
  const fx = (getInputProps() as { fx?: boolean }).fx;
  return (
    <ThreeCanvas linear width={540} height={960} style={{ background: "#223" }} camera={{ position: [0, 0, 5], fov: 50 }}>
      <ambientLight intensity={0.4} /><directionalLight position={[3, 4, 5]} intensity={2} />
      <mesh rotation={[0.4, f * 0.05, 0]}><boxGeometry args={[1.5, 1.5, 1.5]} /><meshStandardMaterial color="#e33" /></mesh>
      {fx ? <EffectComposer multisampling={0}><Vignette darkness={0.8} /></EffectComposer> : null}
    </ThreeCanvas>
  );
};
