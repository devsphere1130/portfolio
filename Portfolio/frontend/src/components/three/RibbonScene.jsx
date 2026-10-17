import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { createRibbonGeometry } from './ribbonGeometry';
import { createRibbonMaterial } from './ribbonMaterial';
import { createRibbonEnvironment } from './ribbonEnvironment';
import { RibbonGlow } from './RibbonGlow';

// Separate sheets cross at the shoulder and lower curl, leaving dark pockets
// between the blue outer fold and its bright cyan inner edge.
const layers = [
  { name: 'crown', offset: -24, depth: -0.8, width: 1.2, phase: 1.1, color: '#003c64' },
  { name: 'crown', color: '#009fc9' },
  { name: 'wing', offset: -13, depth: -1.8, width: 1.6, phase: 0.6, color: '#004b7c' },
  { name: 'wing', color: '#0082a0' },
  { name: 'body', offset: -25, offsetY: 15, depth: -2.4, width: 1.55, phase: 1.5, color: '#002766' },
  { name: 'body', offset: -12, offsetY: 5, depth: -1.2, width: 1.16, phase: 0.7, color: '#0038b8' },
  { name: 'body', color: '#008aad' },
  { name: 'inner', color: '#00c4da' },
  { name: 'fall', offset: 12, depth: -0.65, width: 1.35, phase: 1.6, color: '#003867' },
  { name: 'fall', color: '#00a6b8' },
  { name: 'return', offset: -5, offsetY: 12, depth: -0.5, width: 1.3, phase: 1.2, color: '#005280' },
  { name: 'return', width: 0.95, color: '#009bcc' },
  { name: 'arch', offset: -5, offsetY: 9, depth: -0.4, width: 1.8, phase: 0.8, color: '#003e6b' },
  { name: 'arch', color: '#00b2d1' },
];

export const RibbonScene = ({ animate, speed, amplitude }) => {
  const uniforms = useMemo(() => ({ time: { value: 0 }, amplitude: { value: 0 } }), []);
  const environment = useMemo(createRibbonEnvironment, []);
  const sheets = useMemo(() => layers.map(({ name, color, ...shape }) => ({
    geometry: createRibbonGeometry(name, shape),
    material: createRibbonMaterial(uniforms, color, environment, {
      fadeStart: name === 'body' || name === 'inner' ? 1 : 0,
      fadeEnd: name === 'arch' ? 1 : 0,
    }),
  })), [uniforms, environment]);

  useEffect(() => {
    uniforms.amplitude.value = amplitude;
  }, [amplitude, uniforms]);

  useEffect(() => () => {
    sheets.forEach(({ geometry, material }) => {
      geometry.dispose();
      material.dispose();
    });
    environment.dispose();
  }, [sheets, environment]);

  useFrame((_, delta) => {
    if (animate) uniforms.time.value += Math.min(delta, 0.05) * speed;
  });

  return (
    <>
      {sheets.map(({ geometry, material }, index) => (
        <mesh key={index} geometry={geometry} material={material} frustumCulled={false} dispose={null} />
      ))}
      <RibbonGlow />
    </>
  );
};
