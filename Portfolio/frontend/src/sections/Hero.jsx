import { useCallback, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { HeroContent } from '../components/hero/HeroContent';
import { HeroRibbon } from '../components/hero/HeroRibbon';
import { ScrollIndicator } from '../components/hero/ScrollIndicator';
import { HeroScene } from '../components/three/HeroScene';

// Reveal each 3D layer only once its canvas has drawn, sliding in from its own side.
const reveal = (element, fromX) => {
  if (!element || element.dataset.revealed) return;
  element.dataset.revealed = 'true';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(element, { opacity: 1, x: 0 });
    return;
  }
  gsap.fromTo(element, { opacity: 0, x: fromX }, {
    opacity: 1, x: 0, duration: 1.3, ease: 'power3.out', clearProps: 'transform',
  });
};

export const Hero = () => {
  const sectionRef = useRef(null);
  const sceneRef = useRef(null);

  const handleRibbonReady = useCallback((element) => reveal(element, -160), []);
  const handleSceneReady = useCallback(() => reveal(sceneRef.current, 160), []);

  useEffect(() => {
    const ribbon = sectionRef.current?.querySelector('.hero-ribbon');
    const scene = sceneRef.current;
    // Safety net: if WebGL fails or is slow, still show the fallbacks.
    const timer = setTimeout(() => {
      reveal(ribbon, -160);
      reveal(scene, 160);
    }, 3000);
    return () => {
      clearTimeout(timer);
      gsap.killTweensOf([ribbon, scene]);
    };
  }, []);

  return (
    <section ref={sectionRef} id="home" className="hero-section relative isolate min-h-[calc(100vh-5rem)] overflow-hidden pt-32 md:pt-36">
      <div className="hero-grid absolute inset-0 opacity-45" />
      <div className="absolute right-[-12rem] top-24 h-[34rem] w-[34rem] rounded-full bg-sky-400/10 blur-3xl" />
      <div className="absolute left-[-18rem] bottom-0 h-[28rem] w-[28rem] rounded-full bg-violet-400/6 blur-3xl" />
      <HeroRibbon speed={0.18} amplitude={0.18} onReady={handleRibbonReady} />

      <div className="hero-content-layout">
        <HeroContent />
        <div ref={sceneRef} className="hero-content-scene opacity-0">
          <HeroScene onReady={handleSceneReady} />
        </div>
      </div>

      <ScrollIndicator />
    </section>
  );
};
