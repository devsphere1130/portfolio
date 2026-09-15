import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { createRibbonGeometry } from './ribbonGeometry';
import { createRibbonMaterial } from './ribbonMaterial';

export const RibbonScene = ({ animate, speed, amplitude }) => {
  const uniforms = useMemo(() => ({ time: { value: 0 }, amplitude: { value: 0 } }), []);
  const sheets = useMemo(() => [
    { name: 'crown', offset: -56, depth: -0.8, width: 0.6, phase: 1.1, color: '#003c64' },
    { name: 'crown', color: '#007f9e' },
    { name: 'body', offset: -22, offsetY: 12, depth: -0.8, width: 1.5, phase: 1.4, color: '#002655' },
    { name: 'body', offset: -10, offsetY: 5, depth: -0.4, width: 1.15, phase: 0.6, color: '#004e8c' },
    { name: 'body', color: '#007ba5' },
    { name: 'return', offset: -8, offsetY: 15, depth: -0.6, width: 1.3, phase: 1.2, color: '#003b77' },
    { name: 'return', width: 0.94, color: '#0085a5' },
    { name: 'arch', offset: -5, offsetY: 7, depth: -0.4, width: 1.7, phase: 0.8, color: '#003e6b' },
    { name: 'arch', color: '#0096b2' },
  ].map(({ name, color, ...shape }) => ({
    geometry: createRibbonGeometry(name, shape),
    material: createRibbonMaterial(uniforms, color),
  })), [uniforms]);

  useEffect(() => {
    uniforms.amplitude.value = amplitude;
  }, [amplitude, uniforms]);

  useEffect(() => () => {
    sheets.forEach(({ geometry, material }) => {
      geometry.dispose();
      material.dispose();
    });
  }, [sheets]);

  useFrame((_, delta) => {
    if (animate) uniforms.time.value += Math.min(delta, 0.05) * speed;
  });

  return (
    <>
      <ambientLight intensity={0.16} color="#168baf" />
      <directionalLight position={[3, 4, 6]} intensity={1.2} color="#aafaff" />
      <directionalLight position={[-5, -2, 3]} intensity={0.8} color="#006dff" />
      {sheets.map(({ geometry, material }, index) => (
        <mesh key={index} geometry={geometry} material={material} frustumCulled={false} dispose={null} />
      ))}
      {/* Local studio panels produce reflections without loading HDR images. */}
      <Environment resolution={128} frames={1}>
        <color attach="background" args={['#010916']} />
        <Lightformer position={[-4, 1, 5]} scale={[1.25, 12, 1]} intensity={5} color="#87f5ff" />
        <Lightformer position={[3, 2, 4]} scale={[0.4, 14, 1]} intensity={6} color="#eaffff" />
        <Lightformer position={[1, 5, 3]} scale={[9, 0.45, 1]} intensity={3} color="#7cefff" />
        <Lightformer position={[-1, -4, 3]} scale={[6, 0.65, 1]} intensity={3} color="#00c8ff" />
        <Lightformer position={[1, 0, -5]} scale={[3, 10, 1]} intensity={0.8} color="#0047db" />
        <Lightformer form="ring" position={[-3, 0, 6]} scale={7} intensity={1.5} color="#009eca" />
      </Environment>
    </>
  );
};
