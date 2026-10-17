import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitRing } from './OrbitRing';
import { TechNode } from './TechNode';

const techNodes = [
  ['React', [-1.7, 0.86, 0.2]],
  ['Django', [1.65, -0.7, -0.1]],
  ['REST API', [0.25, 1.7, 0.1]],
  ['Python', [-0.55, -1.55, 0.2]],
  ['PostgreSQL', [1.05, 1.08, -0.35]],
];

export const DigitalCore = ({ mouse, hoverRef, reduced = false }) => {
  const coreRef = useRef(null);
  const shellRef = useRef(null);
  const groupRef = useRef(null);

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime;
    const hoverBoost = hoverRef.current ? 1.45 : 1;

    if (groupRef.current) {
      const targetY = elapsed * 0.22 + mouse.current.x * Math.PI;
      const targetX = -mouse.current.y * 1.05;
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, 0.06);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, 0.06);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, mouse.current.x * 0.22, 0.04);
      groupRef.current.position.y = Math.sin(elapsed * 0.8) * 0.08;
    }

    if (coreRef.current && !reduced) {
      coreRef.current.rotation.x += 0.004 * hoverBoost;
      coreRef.current.rotation.y += 0.006 * hoverBoost;
      coreRef.current.material.emissiveIntensity = THREE.MathUtils.lerp(
        coreRef.current.material.emissiveIntensity,
        hoverRef.current ? 0.85 : 0.45,
        0.05
      );
    }

    if (shellRef.current) {
      shellRef.current.rotation.y -= 0.003;
      shellRef.current.scale.setScalar(1 + Math.sin(elapsed * 1.4) * 0.018);
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

      <OrbitRing radius={1.42} rotation={[0.9, 0.2, 0.1]} speed={0.2} mouse={mouse} />
      <OrbitRing radius={1.74} rotation={[0.25, 1.1, 0.8]} speed={-0.16} nodeCount={4} mouse={mouse} />
      <OrbitRing radius={2.04} rotation={[1.35, -0.15, -0.4]} speed={0.11} nodeCount={5} mouse={mouse} />
      <OrbitRing radius={2.34} rotation={[0.1, 0.65, 1.35]} speed={-0.08} nodeCount={3} mouse={mouse} />

      {techNodes.map(([label, position]) => (
        <TechNode key={label} label={label} position={position} mouse={mouse} />
      ))}
    </group>
  );
};
