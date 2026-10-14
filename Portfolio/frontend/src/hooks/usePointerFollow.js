import { useEffect, useRef } from 'react';

// Eases a point toward the pointer and hands it to `apply` for direct DOM writes.
// Unlike React state, this never re-renders, and the rAF loop stops once the point settles.
export const usePointerFollow = (apply, { ease = 0.14, minWidth = 769 } = {}) => {
  const applyRef = useRef(apply);

  useEffect(() => {
    applyRef.current = apply;
  }, [apply]);

  useEffect(() => {
    const center = () => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const current = center();
    let target = { ...current };
    let frame = 0;

    const emit = () => applyRef.current({
      x: current.x,
      y: current.y,
      normalizedX: (current.x / window.innerWidth) * 2 - 1,
      normalizedY: (current.y / window.innerHeight) * 2 - 1,
    });

    const tick = () => {
      current.x += (target.x - current.x) * ease;
      current.y += (target.y - current.y) * ease;
      emit();
      const settled = Math.abs(target.x - current.x) < 0.1 && Math.abs(target.y - current.y) < 0.1;
      frame = settled ? 0 : requestAnimationFrame(tick);
    };

    const handleMove = (event) => {
      if (window.innerWidth < minWidth) return;
      target = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(tick);
    };

    emit();
    window.addEventListener('pointermove', handleMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handleMove);
      cancelAnimationFrame(frame);
    };
  }, [ease, minWidth]);
};
