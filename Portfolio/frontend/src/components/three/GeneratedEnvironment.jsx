import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { SPHERE_LIGHTS, createRibbonEnvironment } from './ribbonEnvironment';

// Reflections from a small lighting map generated in code (a soft blue "sky", see SPHERE_LIGHTS),
// instead of downloading a 1.5 MB HDR photo. It is ready on the first frame and costs no network.
export const GeneratedEnvironment = () => {
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    const texture = createRibbonEnvironment(SPHERE_LIGHTS);
    const previous = scene.environment;
    scene.environment = texture;
    return () => {
      scene.environment = previous;
      texture.dispose();
    };
  }, [scene]);

  return null;
};
