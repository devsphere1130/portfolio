import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import { CapabilityCard } from '../components/CapabilityCard';
import { CapabilityDetailPanel } from '../components/capabilities/CapabilityDetailPanel';
import { SectionHeading } from '../components/SectionHeading';
import { useDetailPanel } from '../hooks/useDetailPanel';
import { pick, useContent, useSection } from '../content/hooks';

export const Services = () => {
  const { activeIndex, isOpen, open, close, contact, cardRef } = useDetailPanel();
  const { capabilities: servicesData } = useContent();
  const section = useSection('home', 'capabilities');

  return (
    <section id="services" className="border-y border-white/10 bg-slate-950/40 py-24 md:py-32">
      <div className="section-shell">
        <SectionHeading subtitle={pick(section, 'subtitle', 'Client work usually fails when the build ignores the business workflow. These capabilities are framed around outcomes first.')}>
          {pick(section, 'title', 'From complex ideas to production-ready software.')}
        </SectionHeading>
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {servicesData.map((service, index) => (
            <CapabilityCard
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
            <CapabilityDetailPanel
              capabilities={servicesData}
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
