import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ServiceCard } from '../components/services/ServiceCard';
import { ServiceDetailPanel } from '../components/services/ServiceDetailPanel';
import { useContent } from '../content/hooks';
import { useDetailPanel } from '../hooks/useDetailPanel';

gsap.registerPlugin(ScrollTrigger);

export const CapabilitiesStrip = () => {
  const containerRef = useRef(null);
  const { services: serviceDetails } = useContent();
  const { activeIndex, isOpen, open, close, contact, cardRef } = useDetailPanel();

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
          {serviceDetails.map((service, index) => (
            <ServiceCard
              key={service.id}
              ref={cardRef(index)}
              service={service}
              index={index}
              active={activeIndex === index}
              onOpen={open}
            />
          ))}
        </div>
      </div>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <ServiceDetailPanel
              services={serviceDetails}
              activeIndex={activeIndex}
              onSelect={open}
              onClose={close}
              onContact={contact}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </section>
  );
};
