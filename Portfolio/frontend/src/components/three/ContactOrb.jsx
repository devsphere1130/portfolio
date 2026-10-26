import { Component, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitRing } from './OrbitRing';
import { frameDelta, smoothing } from './animationTime';
import { GeneratedEnvironment } from './GeneratedEnvironment';

// The hero's orbital sphere, recomposed as a calm, contained focal point for the Contact card.
const ORB_RADIUS = 1.95; // outer ring plus node size: what the camera must keep in frame

const CameraFit = () => {
  const { camera, size } = useThree();
  useEffect(() => {
    const halfVerticalFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const halfFov = Math.atan(Math.tan(halfVerticalFov) * Math.min(size.width / size.height, 1));
    camera.position.z = ORB_RADIUS / Math.sin(halfFov);
  }, [camera, size.width, size.height]);
  return null;
};

const Orb = ({ pointer, reduced }) => {
  const groupRef = useRef(null);
  const coreRef = useRef(null);
  const shellRef = useRef(null);
  const tilt = useRef({ x: 0, y: 0 });
  const time = useRef(0);

  useFrame((_, rawDelta) => {
    // Own time (see animationTime.js): no snap or jump after the canvas pauses and resumes.
    const delta = frameDelta(rawDelta);
    time.current += delta;
    const t = time.current;
    // Ease toward the pointer so card parallax feels weighty rather than twitchy.
    tilt.current.x = THREE.MathUtils.lerp(tilt.current.x, pointer.current.x, smoothing(0.05, delta));
    tilt.current.y = THREE.MathUtils.lerp(tilt.current.y, pointer.current.y, smoothing(0.05, delta));
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.12 + tilt.current.x * 0.35;
      groupRef.current.rotation.x = 0.18 - tilt.current.y * 0.25;
      groupRef.current.position.y = Math.sin(t * 0.7) * 0.05;
    }
    if (reduced) return;
    if (coreRef.current) coreRef.current.rotation.y += delta * 0.25;
    if (shellRef.current) {
      shellRef.current.rotation.y -= delta * 0.15;
      shellRef.current.scale.setScalar(1 + Math.sin(t * 1.1) * 0.015);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.78, 5]} />
        <meshStandardMaterial color="#08111f" emissive="#38bdf8" emissiveIntensity={0.5} metalness={0.7} roughness={0.18} transparent opacity={0.78} />
      </mesh>
      <mesh ref={shellRef}>
        <icosahedronGeometry args={[0.92, 1]} />
        <meshBasicMaterial color="#7dd3fc" wireframe transparent opacity={0.2} blending={THREE.AdditiveBlending} />
      </mesh>
      <OrbitRing radius={1.25} rotation={[1.2, 0.15, 0.2]} speed={0.16} nodeCount={3} mouse={pointer} />
      <OrbitRing radius={1.58} rotation={[0.35, 0.95, 0.7]} speed={-0.1} nodeCount={2} mouse={pointer} />
      <OrbitRing radius={1.86} rotation={[1.45, -0.35, -0.5]} speed={0.07} nodeCount={4} mouse={pointer} />
    </group>
  );
};

class OrbBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFail?.();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export const ContactOrb = ({ pointer, active, reduced, onReady, onFail }) => (
  <OrbBoundary onFail={onFail}>
    <Canvas
      className="contact-orb-canvas"
      dpr={[1, 1.5]}
      frameloop={active && !reduced ? 'always' : 'demand'}
      camera={{ position: [0, 0, 6], fov: 36 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        requestAnimationFrame(() => requestAnimationFrame(() => onReady?.()));
      }}
      fallback={null}
    >
      <CameraFit />
      <ambientLight intensity={0.35} />
      <pointLight position={[2.4, 2, 3]} intensity={2.2} color="#7dd3fc" />
      <pointLight position={[-3, -1.5, 2]} intensity={0.8} color="#a5a4f3" />
      <Orb pointer={pointer} reduced={reduced} />
      <GeneratedEnvironment />
    </Canvas>
  </OrbBoundary>
);
