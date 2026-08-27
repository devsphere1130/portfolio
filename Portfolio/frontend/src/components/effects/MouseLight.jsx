import { useMousePosition } from '../../hooks/useMousePosition';

export const MouseLight = () => {
  const { x, y } = useMousePosition();

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 opacity-80"
      style={{
        background: `radial-gradient(42rem circle at ${x || window.innerWidth / 2}px ${y || window.innerHeight / 2}px, rgba(56,189,248,0.11), transparent 42%)`,
      }}
    />
  );
};
