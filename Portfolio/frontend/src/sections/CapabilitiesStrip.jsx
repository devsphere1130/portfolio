import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const capabilities = [
  'Product Development',
  'Business Software',
  'SaaS Platforms',
  'API & Backend Systems',
  'Frontend Engineering',
  'Automation',
];

export const CapabilitiesStrip = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const items = containerRef.current?.querySelectorAll('.capability-item');
      if (!items) return;

      gsap.fromTo(
        items,
        { opacity: 0, x: -30 },
        {
          opacity: 1,
          x: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 85%',
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="border-y border-white/10 bg-slate-950/50 py-12"
    >
      <div className="section-shell">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((capability, index) => (
            <div
              key={capability}
              className="capability-item flex items-center gap-4 rounded-md border border-white/10 bg-white/[0.025] p-5"
            >
              <div className="font-mono text-lg font-bold tabular-nums text-sky-300 md:text-2xl">
                {String(index + 1).padStart(2, '0')}
              </div>
              <div>
                <h3 className="text-base font-semibold text-white md:text-lg">
                  {capability}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
