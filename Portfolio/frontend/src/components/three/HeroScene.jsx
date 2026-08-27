import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { DigitalCore } from './DigitalCore';
import { ParticleField } from './ParticleField';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const CameraRig = ({ mouse, hoverRef }) => {
  const lightRef = useRef(null);
  const { camera } = useThree();

  useFrame(() => {
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, mouse.current.x * 0.58, 0.045);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, mouse.current.y * 0.32, 0.045);
    camera.lookAt(0, 0, 0);

    if (lightRef.current) {
      lightRef.current.position.x = THREE.MathUtils.lerp(lightRef.current.position.x, 2 + mouse.current.x * 1.4, 0.05);
      lightRef.current.position.y = THREE.MathUtils.lerp(lightRef.current.position.y, 2 - mouse.current.y * 1.2, 0.05);
      lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, hoverRef.current ? 3 : 2.1, 0.05);
    }
  });

  return <pointLight ref={lightRef} position={[2, 2, 3]} intensity={2.1} color="#7dd3fc" />;
};

const MouseSmoother = ({ mouse, target }) => {
  useFrame(() => {
    mouse.current.x = THREE.MathUtils.lerp(mouse.current.x, target.current.x, 0.055);
    mouse.current.y = THREE.MathUtils.lerp(mouse.current.y, target.current.y, 0.055);
  });

  return null;
};

const SceneContent = ({ mouse, hoverRef, reduced }) => (
  <>
    <ambientLight intensity={0.35} />
    <CameraRig mouse={mouse} hoverRef={hoverRef} />
    <DigitalCore mouse={mouse} hoverRef={hoverRef} reduced={reduced} />
    <ParticleField mouse={mouse} reduced={reduced} />
    <Environment preset="city" />
  </>
);

export const HeroScene = () => {
  const mouse = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const hoverRef = useRef(false);
  const prefersReducedMotion = useReducedMotion();
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (window.innerWidth < 768) return;
      target.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      target.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  if (webglFailed) {
    return (
      <div className="relative grid h-full min-h-[24rem] place-items-center overflow-hidden rounded-lg border border-white/10 bg-slate-950/60">
        <div className="absolute h-72 w-72 rounded-full border border-sky-300/20 bg-sky-300/10 blur-xl" />
        <div className="relative h-44 w-44 rounded-full border border-sky-200/30 bg-sky-300/10 shadow-[0_0_90px_rgba(56,189,248,0.22)]" />
      </div>
    );
  }

  return (
    <div
      className="relative h-[27rem] min-h-[27rem] w-full overflow-visible md:h-[36rem] lg:h-[calc(100vh-7rem)] lg:min-h-[40rem]"
      onPointerEnter={() => {
        hoverRef.current = true;
      }}
      onPointerLeave={() => {
        hoverRef.current = false;
      }}
      data-cursor="3d"
    >
      <div className="absolute inset-6 rounded-full bg-sky-300/10 blur-3xl" />
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 6.2], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
        onError={() => setWebglFailed(true)}
      >
        <Suspense fallback={null}>
          <MouseSmoother mouse={mouse} target={target} />
          <SceneContent mouse={mouse} hoverRef={hoverRef} reduced={prefersReducedMotion} />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute left-4 top-8 hidden text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-sky-200/50 md:block">
        System / Online
      </div>
      <div className="pointer-events-none absolute bottom-8 right-4 hidden text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-slate-400/55 md:block">
        Full Stack
      </div>
    </div>
  );
};
