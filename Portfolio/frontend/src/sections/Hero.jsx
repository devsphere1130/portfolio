import { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import { AnimatedInfoPanel } from '../components/hero/AnimatedInfoPanel';
import { ScrollIndicator } from '../components/hero/ScrollIndicator';
import { MagneticButton } from '../components/MagneticButton';
import { HeroScene } from '../components/three/HeroScene';
import { useReducedMotion } from '../hooks/useReducedMotion';

const services = [
  { title: 'Web applications', meta: 'Responsive products for customers and internal teams.' },
  { title: 'Django APIs', meta: 'Secure backend systems, integrations and business logic.' },
  { title: 'SaaS platforms', meta: 'Dashboards, workflows and scalable product foundations.' },
  { title: 'Business dashboards', meta: 'Clear operational views for tracking and decisions.' },
  { title: 'Automation systems', meta: 'Workflow tools that reduce manual business effort.' },
  { title: 'Quality testing', meta: 'Validation support before launch and after iteration.' },
];

const team = [
  {
    title: 'Ajay Gaikwad',
    meta: 'Full-Stack Developer · 1.5 years experience',
  },
  {
    title: 'Sarthak Zaware',
    meta: 'Full-Stack Developer · 1.5 years experience',
  },
  {
    title: 'Rushabh Katekar',
    meta: 'Marketing Team · 1 year experience',
  },
  {
    title: 'Shivraj Shingan',
    meta: 'Tester · 2 years experience',
  },
];

export const Hero = () => { 
  const rootRef = useRef(null);
  const labelRef = useRef(null);
  const nameRef = useRef(null);
  const introRef = useRef(null);
  const copyRef = useRef(null);
  const buttonsRef = useRef(null);
  const statusRef = useRef(null);
  const sceneRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (prefersReducedMotion) {
        gsap.set('.hero-reveal', { y: 0, opacity: 1 });
        gsap.set(sceneRef.current, { opacity: 1, scale: 1 });
        return;
      }

      const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });

      timeline
        .fromTo(labelRef.current, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 })
        .fromTo(nameRef.current, { yPercent: 105 }, { yPercent: 0, duration: 0.72 }, '-=0.12')
        .fromTo(introRef.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, '-=0.36')
        .fromTo(copyRef.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.52 }, '-=0.24')
        .fromTo(
          buttonsRef.current?.children,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.48, stagger: 0.09 },
          '-=0.18'
        )
        .fromTo(statusRef.current, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, '-=0.18')
        .fromTo(sceneRef.current, { opacity: 0, scale: 0.86 }, { opacity: 1, scale: 1, duration: 0.9 }, '-=0.92');
    }, rootRef);

    return () => ctx.revert();
  }, [prefersReducedMotion]);

  return (
    <section
      id="home"
      ref={rootRef}
      className="relative min-h-[calc(100vh-5rem)] overflow-hidden pt-24 md:pt-28"
    >
      <div className="hero-grid absolute inset-0 opacity-45" />
      <div className="absolute right-[-12rem] top-24 h-[34rem] w-[34rem] rounded-full bg-sky-400/10 blur-3xl" />
      <div className="absolute left-[-18rem] bottom-0 h-[28rem] w-[28rem] rounded-full bg-violet-400/6 blur-3xl" />

      <div className="relative mx-auto grid min-h-[calc(100vh-7rem)] w-[calc(100%_-_2rem)] max-w-[1280px] items-center gap-8 py-10 lg:grid-cols-[40fr_60fr] lg:py-0 xl:w-[calc(100%_-_4rem)] xl:max-w-[1400px]">
        <div className="max-w-[34rem]">
          <p
            ref={labelRef}
            className="hero-reveal mb-5 text-sm font-bold uppercase tracking-[0.32em] text-sky-300"
          >
            Welcome to
          </p>

          <div className="overflow-hidden">
            <h1
              ref={nameRef}
              className="hero-reveal text-[clamp(3rem,5vw,5rem)] font-semibold leading-[0.95] tracking-tight text-white"
            >
              devsphere
            </h1>
          </div>

          <div
            ref={introRef}
            className="hero-reveal mt-6 max-w-xl rounded-lg border border-sky-300/20 bg-sky-300/[0.06] p-5 shadow-[0_0_44px_rgba(56,189,248,0.1)] backdrop-blur-sm"
          >
            <p className="text-xl font-semibold leading-tight text-sky-100 md:text-2xl">
              We build production-ready software with development, marketing and testing support.
            </p>
          </div>

          <div ref={copyRef} className="hero-reveal mt-6 max-w-xl">
            <div className="grid gap-3 sm:grid-cols-2">
              <AnimatedInfoPanel label="What we provide" items={services} />
              <AnimatedInfoPanel label="Team behind the work" items={team} delay={0.7} />
            </div>
          </div>

          <div ref={buttonsRef} className="mt-7 flex flex-col gap-4 sm:flex-row">
            <MagneticButton
              href="#contact"
              className="interactive group rounded-md border border-sky-200/45 bg-sky-300 px-7 py-4 font-bold !text-slate-950 shadow-[0_0_44px_rgba(56,189,248,0.2)] transition-all hover:border-sky-100 hover:bg-sky-200 hover:!text-slate-950 hover:shadow-[0_0_60px_rgba(56,189,248,0.32)]"
            >
              Start a Project
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </MagneticButton>
            <MagneticButton
              href="#work"
              className="interactive rounded-md border border-white/15 bg-slate-950/20 px-7 py-4 font-bold text-white backdrop-blur-sm transition-all hover:border-sky-300/60 hover:bg-white/[0.04]"
            >
              View My Work
            </MagneticButton>
          </div>

          <div ref={statusRef} className="hero-reveal mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
            <span className="inline-flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-55" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300" />
              </span>
              Available for selected projects
            </span>
            <span className="hidden h-1 w-1 rounded-full bg-slate-600 sm:inline-block" />
            <span>India - Working Worldwide</span>
          </div>
        </div>

        <div ref={sceneRef} className="relative opacity-0 lg:translate-x-8 xl:translate-x-14">
          <HeroScene />
        </div>
      </div>

      <ScrollIndicator />
    </section>
  );
};

