import { ArrowRight } from 'lucide-react';
import { MagneticButton } from '../components/MagneticButton';
import { useMousePosition } from '../hooks/useMousePosition';

export const FinalCTA = () => {
  const { normalizedX, normalizedY } = useMousePosition();

  return (
    <section id="contact" className="relative overflow-hidden border-y border-white/10 py-24 md:py-32">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background: `radial-gradient(circle at ${50 + normalizedX * 8}% ${50 + normalizedY * 8}%, rgba(56,189,248,0.18), transparent 32rem)`,
        }}
      />
      <div className="section-shell relative">
        <div className="glass-panel mx-auto max-w-5xl rounded-lg p-8 text-center md:p-14">
          <p className="mb-5 text-sm font-bold uppercase tracking-[0.3em] text-sky-300">Start the conversation</p>
          <h2 className="text-balance text-4xl font-semibold leading-[1.02] tracking-tight text-white md:text-6xl">
            Have a product, platform or complex idea in mind?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Let us turn it into software that works for real users, real operations and real business goals.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <MagneticButton href="mailto:contact@devsphere.dev" className="interactive rounded-md border border-sky-200/40 bg-sky-300 px-7 py-4 font-bold !text-slate-950 hover:bg-sky-200 hover:!text-slate-950">
              Start a Project
              <ArrowRight size={19} />
            </MagneticButton>
            <MagneticButton href="mailto:contact@devsphere.dev" className="interactive rounded-md border border-white/15 px-7 py-4 font-bold text-white hover:border-sky-300/50 hover:bg-white/[0.04]">
              Let's Talk
            </MagneticButton>
          </div>
        </div>
      </div>
    </section>
  );
};
