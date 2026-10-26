import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { frameDelta } from './animationTime';

export const ParticleField = ({ mouse, reduced = false }) => {
  const pointsRef = useRef(null);
  const time = useRef(0);
  const particleCount = reduced ? 80 : 180;

  const positions = useMemo(() => {
    const values = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      values[index * 3] = (Math.random() - 0.5) * 8;
      values[index * 3 + 1] = (Math.random() - 0.5) * 5;
      values[index * 3 + 2] = (Math.random() - 0.5) * 5;
    }
    return values;
  }, [particleCount]);

  useFrame((_, delta) => {
    if (!pointsRef.current || reduced) return;
    time.current += frameDelta(delta);
    pointsRef.current.rotation.y = time.current * 0.025 + mouse.current.x * 0.04;
    pointsRef.current.rotation.x = mouse.current.y * 0.025;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.018}
        color="#7dd3fc"
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
