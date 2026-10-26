import { useCallback, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { HeroContent } from '../components/hero/HeroContent';
import { HeroRibbon } from '../components/hero/HeroRibbon';
import { ScrollIndicator } from '../components/hero/ScrollIndicator';
import { HeroScene } from '../components/three/HeroScene';

// Each 3D layer shows a still poster of its first frame immediately; once the canvas has really drawn,
// the live canvas crossfades over it. Poster and first frame match, so there is no flash or pop.
const reveal = (element) => {
  if (!element || element.dataset.revealed) return;
  element.dataset.revealed = 'true';
  const live = element.querySelector('[data-live]');
  const poster = element.querySelector('[data-poster]');
  if (!live) return;
  // Hide (never remove: React owns the node) so the browser stops compositing the placeholder.
  const done = () => { if (poster) poster.style.visibility = 'hidden'; };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(live, { opacity: 1 });
    done();
    return;
  }
  gsap.to(live, { opacity: 1, duration: 0.45, ease: 'power1.out' });
  if (poster) gsap.to(poster, { opacity: 0, duration: 0.45, ease: 'power1.out', onComplete: done });
};

export const Hero = () => {
  const sectionRef = useRef(null);
  const sceneRef = useRef(null);

  const handleRibbonReady = useCallback((element) => reveal(element), []);
  const handleSceneReady = useCallback(() => reveal(sceneRef.current), []);

  // No timer needed: while WebGL starts (or if it fails), the posters are already showing.
  useEffect(() => {
    const section = sectionRef.current;
    return () => gsap.killTweensOf(section?.querySelectorAll('[data-live], [data-poster]') ?? []);
  }, []);

  return (
    <section ref={sectionRef} id="home" className="hero-section relative isolate min-h-[calc(100vh-5rem)] overflow-hidden pt-32 md:pt-36">
      <div className="hero-grid absolute inset-0 opacity-45" />
      <div className="absolute right-[-12rem] top-24 h-[34rem] w-[34rem] rounded-full bg-sky-400/10 blur-3xl" />
      <div className="absolute left-[-18rem] bottom-0 h-[28rem] w-[28rem] rounded-full bg-violet-400/6 blur-3xl" />
      <HeroRibbon speed={0.18} amplitude={0.18} onReady={handleRibbonReady} />

      <div className="hero-content-layout">
        <HeroContent />
        <div ref={sceneRef} className="hero-content-scene">
          <HeroScene onReady={handleSceneReady} />
        </div>
      </div>

      <ScrollIndicator />
    </section>
  );
};
