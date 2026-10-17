import { useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector2 } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const RibbonGlow = () => {
  const { gl, scene, camera, size, viewport, invalidate } = useThree();
  const composerRef = useRef(null);

  useLayoutEffect(() => {
    const composer = new EffectComposer(gl);
    composer.renderTarget1.samples = 4;
    composer.renderTarget2.samples = 4;
    const render = new RenderPass(scene, camera);
    const bloom = new UnrealBloomPass(gl.getSize(new Vector2()), 0.4, 0.08, 0.95);
    // Keep the halo close to the polished edges instead of lighting the copy.
    bloom.compositeMaterial.uniforms.bloomFactors.value = [1, 0.4, 0.12, 0, 0];
    const output = new OutputPass();
    composer.addPass(render);
    composer.addPass(bloom);
    composer.addPass(output);
    composerRef.current = composer;
    invalidate();

    return () => {
      composerRef.current = null;
      render.dispose();
      bloom.dispose();
      bloom.materialHighPassFilter.dispose();
      output.dispose();
      composer.dispose();
    };
  }, [gl, scene, camera, invalidate]);

  useLayoutEffect(() => {
    composerRef.current?.setPixelRatio(viewport.dpr);
    composerRef.current?.setSize(size.width, size.height);
    invalidate();
  }, [size.width, size.height, viewport.dpr, invalidate]);

  // Rendering through the composer keeps glow attached to the moving folds.
  // The canvas's demand mode still pauses these passes when motion is disabled.
  useFrame((_, delta) => composerRef.current?.render(delta), 1);
  return null;
};
