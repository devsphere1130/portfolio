import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';

export const TechNode = ({ label, position, mouse }) => {
  const nodeRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!nodeRef.current) return;
    nodeRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.2 + position[0]) * 0.06;
    nodeRef.current.rotation.y += 0.01 + mouse.current.x * 0.002;
  });

  return (
    <group position={position}>
      <mesh
        ref={nodeRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[0.16, 0.16, 0.16]} />
        <meshStandardMaterial color="#0f172a" emissive="#38bdf8" emissiveIntensity={hovered ? 1.2 : 0.35} roughness={0.35} metalness={0.7} />
      </mesh>
      {hovered && (
        <Html distanceFactor={7} center>
          <div className="rounded-full border border-sky-300/30 bg-slate-950/80 px-3 py-1 text-xs font-semibold text-sky-100 backdrop-blur-md">
            {label}
          </div>
        </Html>
      )}
    </group>
  );
};
