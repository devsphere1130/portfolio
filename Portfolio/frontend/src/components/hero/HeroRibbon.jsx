import { Component, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { RibbonScene } from '../three/RibbonScene';
import { useReducedMotion } from '../../hooks/useReducedMotion';

class RibbonBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <div className="hero-ribbon__fallback" /> : this.props.children;
  }
}

// Speed is radians per second: 0.18 gives a gentle, roughly 35-second wave.
export const HeroRibbon = ({ speed = 0.18, amplitude = 0.18 }) => {
  const rootRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const animate = inView && pageVisible && !prefersReducedMotion && speed > 0;

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(rootRef.current);
    const handleVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <div ref={rootRef} className="hero-ribbon" aria-hidden="true">
      <div className="hero-ribbon__scene">
        <RibbonBoundary>
          <Canvas
            style={{ pointerEvents: 'none' }}
            orthographic
            camera={{
              position: [0, 0, 30],
              left: -5,
              right: 5,
              top: 7.5,
              bottom: -7.5,
              near: 0.1,
              far: 60,
              manual: true,
            }}
            dpr={[1, 1.25]}
            frameloop={animate ? 'always' : 'demand'}
            gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
            fallback={<div className="hero-ribbon__fallback" />}
            onCreated={({ gl, camera }) => {
              camera.updateProjectionMatrix();
              gl.setClearColor(0x000000, 0);
              gl.toneMappingExposure = 1.15;
            }}
          >
            <RibbonScene animate={animate} speed={speed} amplitude={amplitude} />
          </Canvas>
        </RibbonBoundary>
      </div>
    </div>
  );
};
