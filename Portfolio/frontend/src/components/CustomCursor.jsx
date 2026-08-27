import { useEffect, useRef, useState } from 'react';
import { useMousePosition } from '../hooks/useMousePosition';

export const CustomCursor = () => {
  const { x, y } = useMousePosition();
  const cursorRef = useRef(null);
  const ringRef = useRef(null);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth > 768 : false);
  const [cursorVariant, setCursorVariant] = useState('default');

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;

    if (cursorRef.current) {
      cursorRef.current.style.left = `${x}px`;
      cursorRef.current.style.top = `${y}px`;
    }

    if (ringRef.current) {
      ringRef.current.style.left = `${x}px`;
      ringRef.current.style.top = `${y}px`;
    }

    const element = document.elementFromPoint(x, y);
    if (element?.closest?.('[data-cursor="3d"]')) {
      setCursorVariant('move');
    } else if (element?.closest?.('[data-cursor="view"]')) {
      setCursorVariant('view');
    } else if (element?.tagName === 'BUTTON' || element?.closest?.('.interactive')) {
      setCursorVariant('interactive');
    } else if (element?.closest?.('a')) {
      setCursorVariant('link');
    } else {
      setCursorVariant('default');
    }
  }, [x, y, isDesktop]);

  if (!isDesktop) return null;

  return (
    <>
      <div
        ref={cursorRef}
        className={`fixed h-2 w-2 rounded-full bg-white pointer-events-none z-50 transition-transform duration-200 ${
          cursorVariant !== 'default' ? 'scale-75' : 'scale-100'
        }`}
        style={{ transform: 'translate(-50%, -50%)' }}
      />
      <div
        ref={ringRef}
        className={`fixed grid h-9 w-9 place-items-center rounded-full border border-white/60 text-[10px] font-bold text-sky-100 pointer-events-none z-50 transition-all duration-200 ${
          cursorVariant === 'interactive' ? 'scale-110 border-sky-300 bg-transparent' : ''
        } ${
          cursorVariant === 'view' ? 'h-14 w-14 border-sky-300 bg-sky-300/15' : ''
        } ${
          cursorVariant === 'move' ? 'h-11 w-11 border-sky-300/80 bg-sky-300/10' : ''
        }`}
        style={{ transform: 'translate(-50%, -50%)' }}
      >
        {cursorVariant === 'view' ? 'VIEW' : cursorVariant === 'move' ? '+' : ''}
      </div>
    </>
  );
};
