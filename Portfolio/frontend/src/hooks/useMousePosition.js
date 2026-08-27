import { useState, useEffect, useRef } from 'react';

export const useMousePosition = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0, normalizedX: 0, normalizedY: 0 });
  const target = useRef({ x: 0, y: 0, normalizedX: 0, normalizedY: 0 });
  const current = useRef({ x: 0, y: 0, normalizedX: 0, normalizedY: 0 });
  const frame = useRef(null);
  const isDesktop = useRef(typeof window !== 'undefined' ? window.innerWidth > 768 : false);

  useEffect(() => {
    const tick = () => {
      current.current = {
        x: current.current.x + (target.current.x - current.current.x) * 0.16,
        y: current.current.y + (target.current.y - current.current.y) * 0.16,
        normalizedX:
          current.current.normalizedX +
          (target.current.normalizedX - current.current.normalizedX) * 0.12,
        normalizedY:
          current.current.normalizedY +
          (target.current.normalizedY - current.current.normalizedY) * 0.12,
      };

      setMousePosition(current.current);
      frame.current = requestAnimationFrame(tick);
    };

    const handleMouseMove = (e) => {
      if (!isDesktop.current) return;

      const x = e.clientX;
      const y = e.clientY;
      const normalizedX = (x / window.innerWidth) * 2 - 1;
      const normalizedY = (y / window.innerHeight) * 2 - 1;

      target.current = { x, y, normalizedX, normalizedY };
    };

    const handleResize = () => {
      isDesktop.current = window.innerWidth > 768;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);
    frame.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frame.current);
    };
  }, []);

  return mousePosition;
};
