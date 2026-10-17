import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const roles = [
  'Software Developer',
  'Full-Stack Developer',
  'React Developer',
  'Django Developer',
  'Product Engineer',
  'Web Application Developer',
];

export const AnimatedRole = () => {
  const roleRefs = useRef([]);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return undefined;

    const ctx = gsap.context(() => {
      gsap.set(roleRefs.current, { yPercent: 110, opacity: 0 });
      gsap.set(roleRefs.current[0], { yPercent: 0, opacity: 1 });

      const timeline = gsap.timeline({ repeat: -1, repeatDelay: 1.8 });

      roles.forEach((_, index) => {
        const current = roleRefs.current[index];
        const next = roleRefs.current[(index + 1) % roles.length];

        timeline
          .to(current, {
            yPercent: -110,
            opacity: 0,
            duration: 0.62,
            ease: 'power3.inOut',
          })
          .fromTo(
            next,
            { yPercent: 110, opacity: 0 },
            { yPercent: 0, opacity: 1, duration: 0.62, ease: 'power3.inOut' },
            '<'
          )
          .to({}, { duration: 2.1 });
      });
    });

    return () => ctx.revert();
  }, [prefersReducedMotion]);

  return (
    <span className="relative mt-3 inline-flex max-w-full rounded-md border border-sky-300/20 bg-sky-300/[0.06] px-4 py-3 shadow-[0_0_44px_rgba(56,189,248,0.1)] backdrop-blur-sm sm:px-5">
      <span className="relative inline-grid h-[1.1em] w-[min(78vw,11.9em)] overflow-hidden align-bottom text-[clamp(1.65rem,2.8vw,2.95rem)] leading-none text-sky-100">
        {roles.map((role, index) => (
          <span
            key={role}
            ref={(element) => {
              roleRefs.current[index] = element;
            }}
            className="col-start-1 row-start-1 truncate whitespace-nowrap pr-2 will-change-transform"
          >
            {role}
          </span>
        ))}
      </span>
    </span>
  );
};
