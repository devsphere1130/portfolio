import { useCallback, useRef } from 'react';
import { CtaLink } from '../components/CtaLink';
import { pick, useSection } from '../content/hooks';
import { usePointerFollow } from '../hooks/usePointerFollow';

export const FinalCTA = () => {
  const glowRef = useRef(null);
  const section = useSection('home', 'cta');
  const primary = pick(section, 'primary_cta', { label: 'Start a Project', href: '/contact' });
  const secondary = pick(section, 'secondary_cta', { label: "Let's Talk", href: '/contact' });

  // Shift the spotlight up to ~8% of the section with the pointer, via transform (no re-renders).
  // The layer is 120% of the section, so 6.67% of its own size equals 8% of the section.
  usePointerFollow(
    useCallback(({ normalizedX, normalizedY }) => {
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${normalizedX * 6.67}%, ${normalizedY * 6.67}%, 0)`;
      }
    }, []),
    { ease: 0.12 },
  );

  return (
    <section id="contact" className="relative overflow-hidden border-y border-white/10 py-24 md:py-32">
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[10%] opacity-70 will-change-transform"
        style={{ background: 'radial-gradient(circle at 50% 50%, rgba(56,189,248,0.18), transparent 32rem)' }}
      />
      <div className="section-shell relative">
        <div className="glass-panel mx-auto max-w-5xl rounded-lg p-8 text-center md:p-14">
          <p className="mb-5 text-sm font-bold uppercase tracking-[0.3em] text-sky-300">{pick(section, 'eyebrow', 'Start the conversation')}</p>
          <h2 className="text-balance text-4xl font-semibold leading-[1.02] tracking-tight text-white md:text-6xl">
            {pick(section, 'title', 'Have a product, platform or complex idea in mind?')}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            {pick(section, 'description', 'Let us turn it into software that works for real users, real operations and real business goals.')}
          </p>
          <div className="final-cta-actions mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <CtaLink primary href={primary.href || '/contact'}>{primary.label || 'Start a Project'}</CtaLink>
            <CtaLink href={secondary.href || '/contact'}>{secondary.label || "Let's Talk"}</CtaLink>
          </div>
        </div>
      </div>
    </section>
  );
};
