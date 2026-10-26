import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { DigitalCore } from './DigitalCore';
import { GeneratedEnvironment } from './GeneratedEnvironment';
import { ParticleField } from './ParticleField';
import { ReadySignal } from './ReadySignal';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { frameDelta, smoothing } from './animationTime';

const CameraRig = ({ mouse, hoverRef }) => {
  const lightRef = useRef(null);
  const { camera, size } = useThree();

  useEffect(() => {
    // Fit the complete rotating orbit in the narrower canvas dimension.
    // 2.25 includes the outer ring, its nodes, and the core's gentle bob.
    const halfVerticalFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const halfFov = Math.atan(Math.tan(halfVerticalFov) * Math.min(size.width / size.height, 1));
    camera.position.z = Math.max(6.2, 2.25 / Math.sin(halfFov));
  }, [camera, size.width, size.height]);

  useFrame((_, delta) => {
    const dt = frameDelta(delta);
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0.28 + mouse.current.x * 0.58, smoothing(0.045, dt));
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, mouse.current.y * 0.32, smoothing(0.045, dt));
    camera.lookAt(0.28, 0, 0);

    if (lightRef.current) {
      const k = smoothing(0.05, dt);
      lightRef.current.position.x = THREE.MathUtils.lerp(lightRef.current.position.x, 2 + mouse.current.x * 1.4, k);
      lightRef.current.position.y = THREE.MathUtils.lerp(lightRef.current.position.y, 2 - mouse.current.y * 1.2, k);
      lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, hoverRef.current ? 3 : 2.1, k);
    }
  });

  return <pointLight ref={lightRef} position={[2, 2, 3]} intensity={2.1} color="#7dd3fc" />;
};

const MouseSmoother = ({ mouse, target }) => {
  useFrame((_, delta) => {
    const k = smoothing(0.055, frameDelta(delta));
    mouse.current.x = THREE.MathUtils.lerp(mouse.current.x, target.current.x, k);
    mouse.current.y = THREE.MathUtils.lerp(mouse.current.y, target.current.y, k);
  });

  return null;
};

const SceneContent = ({ mouse, hoverRef, reduced }) => (
  <>
    <ambientLight intensity={0.35} />
    <CameraRig mouse={mouse} hoverRef={hoverRef} />
    <DigitalCore mouse={mouse} hoverRef={hoverRef} reduced={reduced} />
    <ParticleField mouse={mouse} reduced={reduced} />
    <GeneratedEnvironment />
  </>
);

export const HeroScene = ({ onReady }) => {
  const mouse = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const hoverRef = useRef(false);
  const prefersReducedMotion = useReducedMotion();
  const [webglFailed, setWebglFailed] = useState(false);
  const containerRef = useRef(null);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);

  // Stop rendering while scrolled away or in a background tab; the last frame stays on screen.
  useEffect(() => {
    if (!containerRef.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(containerRef.current);
    const handleVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [webglFailed]);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (window.innerWidth < 768) return;
      target.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      target.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  // The still sphere (its real first frame) shows until the live canvas is ready, and stays if WebGL fails.
  const poster = <img data-poster className="hero-3d-poster hero-3d-poster--alpha object-contain" src="/hero/sphere-poster.webp" alt="" decoding="async" fetchpriority="high" />;

  if (webglFailed) {
    return <div className="relative h-[27rem] min-h-[27rem] w-full md:h-[36rem] lg:h-[calc(100vh-7rem)] lg:min-h-[40rem]">{poster}</div>;
  }

  return (
    <div
      ref={containerRef}
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
      {poster}
      <div data-live className="hero-3d-live">
      <Canvas
        dpr={[1, 1.5]}
        frameloop={inView && pageVisible ? 'always' : 'never'}
        resize={{ offsetSize: true }}
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
          <ReadySignal onReady={onReady} />
        </Suspense>
      </Canvas>
      </div>
      <div className="pointer-events-none absolute left-4 top-8 hidden text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-sky-200/50 md:block">
        System / Online
      </div>
      <div className="pointer-events-none absolute bottom-8 right-4 hidden text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-slate-400/55 md:block">
        Full Stack
      </div>
    </div>
  );
};
