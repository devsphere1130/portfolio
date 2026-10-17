import { useEffect } from 'react';

// Fires once the scene has mounted and its first frames have been drawn,
// so entrance animations reveal real pixels instead of an empty canvas.
export const ReadySignal = ({ onReady }) => {
  useEffect(() => {
    if (!onReady) return undefined;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => onReady());
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [onReady]);

  return null;
};
