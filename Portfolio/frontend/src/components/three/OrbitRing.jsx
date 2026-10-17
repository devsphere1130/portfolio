import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const OrbitRing = ({ radius = 1.7, rotation = [0, 0, 0], speed = 0.2, nodeCount = 3, mouse }) => {
  const ringRef = useRef(null);
  const nodes = useMemo(
    () =>
      Array.from({ length: nodeCount }, (_, index) => ({
        angle: (index / nodeCount) * Math.PI * 2,
        size: index % 2 ? 0.045 : 0.06,
      })),
    [nodeCount]
  );

  useFrame((state) => {
    if (!ringRef.current) return;
    ringRef.current.rotation.z = rotation[2] + state.clock.elapsedTime * speed;
    ringRef.current.rotation.x = rotation[0] + mouse.current.y * 0.08;
    ringRef.current.rotation.y = rotation[1] + mouse.current.x * 0.08;
  });

  return (
    <group ref={ringRef} rotation={rotation}>
      <mesh>
        <torusGeometry args={[radius, 0.006, 8, 160]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.32} blending={THREE.AdditiveBlending} />
      </mesh>
      {nodes.map((node) => (
        <mesh key={node.angle} position={[Math.cos(node.angle) * radius, Math.sin(node.angle) * radius, 0]}>
          <sphereGeometry args={[node.size, 16, 16]} />
          <meshStandardMaterial color="#a5f3fc" emissive="#38bdf8" emissiveIntensity={1.2} />
        </mesh>
      ))}
    </group>
  );
};
