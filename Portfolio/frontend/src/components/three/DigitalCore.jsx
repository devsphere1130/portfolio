import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { frameDelta, smoothing } from './animationTime';
import { OrbitRing } from './OrbitRing';
import { TechNode } from './TechNode';

const techNodes = [
  ['React', [-1.7, 0.86, 0.2]],
  ['Django', [1.65, -0.7, -0.1]],
  ['REST API', [0.25, 1.7, 0.1]],
  ['Python', [-0.55, -1.55, 0.2]],
  ['PostgreSQL', [1.05, 1.08, -0.35]],
];

// Calm, cinematic motion (radians per second).
const SYSTEM_SPIN = 0.12; // the whole sphere + rings slowly turning
const MOUSE_TURN = 0.45; // how far the pointer can turn the system (about ±26°)
const CORE_SPIN = [0.15, 0.22]; // inner core, x and y
const SHELL_SPIN = -0.1; // wireframe shell

export const DigitalCore = ({ mouse, hoverRef, reduced = false }) => {
  const coreRef = useRef(null);
  const shellRef = useRef(null);
  const groupRef = useRef(null);
  const time = useRef(0);

  useFrame((_, delta) => {
    const dt = frameDelta(delta, reduced);
    time.current += dt;
    const t = time.current;
    const hoverBoost = hoverRef.current ? 1.45 : 1;
    const follow = smoothing(0.06, Math.min(delta, 0.05));

    if (groupRef.current) {
      const targetY = t * SYSTEM_SPIN + mouse.current.x * MOUSE_TURN;
      const targetX = -mouse.current.y * 0.5;
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, follow);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, follow);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, mouse.current.x * 0.12, smoothing(0.04, Math.min(delta, 0.05)));
      groupRef.current.position.y = Math.sin(t * 0.8) * 0.08;
    }

    if (coreRef.current) {
      coreRef.current.rotation.x += CORE_SPIN[0] * hoverBoost * dt;
      coreRef.current.rotation.y += CORE_SPIN[1] * hoverBoost * dt;
      coreRef.current.material.emissiveIntensity = THREE.MathUtils.lerp(
        coreRef.current.material.emissiveIntensity,
        hoverRef.current ? 0.85 : 0.45,
        smoothing(0.05, Math.min(delta, 0.05))
      );
    }

    if (shellRef.current) {
      shellRef.current.rotation.y += SHELL_SPIN * dt;
      shellRef.current.scale.setScalar(1 + Math.sin(t * 1.4) * 0.018);
    }
  });

  return (
    <group ref={groupRef} position={[0.28, 0, 0]} scale={0.86}>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.92, 5]} />
        <meshStandardMaterial
          color="#08111f"
          emissive="#38bdf8"
          emissiveIntensity={0.45}
          metalness={0.7}
          roughness={0.18}
          transparent
          opacity={0.72}
        />
      </mesh>

      <mesh ref={shellRef}>
        <icosahedronGeometry args={[1.08, 1]} />
        <meshBasicMaterial color="#7dd3fc" wireframe transparent opacity={0.18} blending={THREE.AdditiveBlending} />
      </mesh>

      <OrbitRing radius={1.42} rotation={[0.9, 0.2, 0.1]} speed={0.12} mouse={mouse} reduced={reduced} />
      <OrbitRing radius={1.74} rotation={[0.25, 1.1, 0.8]} speed={-0.1} nodeCount={4} mouse={mouse} reduced={reduced} />
      <OrbitRing radius={2.04} rotation={[1.35, -0.15, -0.4]} speed={0.07} nodeCount={5} mouse={mouse} reduced={reduced} />
      <OrbitRing radius={2.34} rotation={[0.1, 0.65, 1.35]} speed={-0.05} nodeCount={3} mouse={mouse} reduced={reduced} />

      {techNodes.map(([label, position]) => (
        <TechNode key={label} label={label} position={position} mouse={mouse} reduced={reduced} />
      ))}
    </group>
  );
};
