import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { frameDelta } from './animationTime';

export const TechNode = ({ label, position, mouse, reduced = false }) => {
  const nodeRef = useRef(null);
  const time = useRef(0);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (!nodeRef.current) return;
    const dt = frameDelta(delta, reduced);
    time.current += dt;
    // The parent group already sets the anchor position; only bob locally.
    nodeRef.current.position.y = Math.sin(time.current * 1.2 + position[0]) * 0.06;
    nodeRef.current.rotation.y += (0.35 + mouse.current.x * 0.08) * dt; // radians per second
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
