import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const SectionHeading = ({ children, subtitle, className = '' }) => {
  const headingRef = useRef(null);
  const subtitleRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.registerEffect({
        name: 'fadeInUp',
        effect: (targets, config) => {
          return gsap.to(targets, {
            duration: 1,
            y: 0,
            opacity: 1,
            ease: 'power2.out',
            ...config,
          });
        },
        defaults: { duration: 0.5 },
      });

      if (headingRef.current) {
        gsap.fromTo(
          headingRef.current,
          { y: 50, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: headingRef.current,
              start: 'top 80%',
            },
          }
        );
      }

      if (subtitleRef.current) {
        gsap.fromTo(
          subtitleRef.current,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1,
            delay: 0.2,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: subtitleRef.current,
              start: 'top 80%',
            },
          }
        );
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      <h2
        ref={headingRef}
        className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-tight text-white md:text-5xl lg:text-6xl"
      >
        {children}
      </h2>
      {subtitle && (
        <p
          ref={subtitleRef}
          className="max-w-2xl text-base leading-7 text-slate-400 md:text-lg"
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};
