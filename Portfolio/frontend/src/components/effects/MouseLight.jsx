import { useCallback, useRef } from 'react';
import { usePointerFollow } from '../../hooks/usePointerFollow';

// A soft glow that trails the pointer. The gradient is painted once on its own layer and
// moved with transform, so following the mouse costs no repaints.
export const MouseLight = () => {
  const glowRef = useRef(null);

  usePointerFollow(
    useCallback(({ x, y }) => {
      if (glowRef.current) glowRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }, []),
    { ease: 0.16 },
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-80" aria-hidden="true">
      <div
        ref={glowRef}
        className="absolute left-0 top-0 -ml-[42rem] -mt-[42rem] h-[84rem] w-[84rem] will-change-transform"
        style={{ background: 'radial-gradient(circle closest-side, rgba(56,189,248,0.11), transparent 42%)' }}
      />
    </div>
  );
};
