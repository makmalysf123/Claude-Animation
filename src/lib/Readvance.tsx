// Remotion's ThreeCanvas renders each frame with one advance() that can run before an <EffectComposer>
// has registered its passes (React runs sibling effects in order), which gives blank stills/frames.
// Put <Readvance /> LAST inside the canvas: it renders the frame again once everything above is mounted.
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useCurrentFrame } from "remotion";
export const Readvance: React.FC = () => {
  const { advance } = useThree();
  const frame = useCurrentFrame();
  useEffect(() => { advance(performance.now()); }, [frame, advance]);
  return null;
};
