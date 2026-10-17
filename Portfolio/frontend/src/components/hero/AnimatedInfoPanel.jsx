import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export const AnimatedInfoPanel = ({ label, items, delay = 0 }) => {
  const itemRefs = useRef([]);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion || items.length <= 1) return undefined;

    const ctx = gsap.context(() => {
      gsap.set(itemRefs.current, { yPercent: 110, opacity: 0 });
      gsap.set(itemRefs.current[0], { yPercent: 0, opacity: 1 });

      const timeline = gsap.timeline({
        repeat: -1,
        delay,
        repeatDelay: 1.5,
      });

      items.forEach((_, index) => {
        const current = itemRefs.current[index];
        const next = itemRefs.current[(index + 1) % items.length];

        timeline
          .to(current, {
            yPercent: -110,
            opacity: 0,
            duration: 0.58,
            ease: 'power3.inOut',
          })
          .fromTo(
            next,
            { yPercent: 110, opacity: 0 },
            { yPercent: 0, opacity: 1, duration: 0.58, ease: 'power3.inOut' },
            '<'
          )
          .to({}, { duration: 2.25 });
      });
    });

    return () => ctx.revert();
  }, [delay, items, prefersReducedMotion]);

  return (
    <article className="rounded-lg border border-sky-300/20 bg-slate-950/80 p-4 backdrop-blur-md">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-sky-300">
        {label}
      </p>
      <div className="relative h-[4.6rem] overflow-hidden">
        {items.map((item, index) => (
          <div
            key={`${item.title}-${item.meta}`}
            ref={(element) => {
              itemRefs.current[index] = element;
            }}
            className="absolute inset-0 flex flex-col justify-center will-change-transform"
          >
            <p className="text-xl font-semibold leading-tight text-white">
              {item.title}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              {item.meta}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
};
