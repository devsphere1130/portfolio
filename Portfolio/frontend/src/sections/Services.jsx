import { servicesData } from '../data/services';
import { CapabilityCard } from '../components/CapabilityCard';
import { SectionHeading } from '../components/SectionHeading';

export const Services = () => {
  return (
    <section id="services" className="border-y border-white/10 bg-slate-950/40 py-24 md:py-32">
      <div className="section-shell">
        <SectionHeading subtitle="Client work usually fails when the build ignores the business workflow. These capabilities are framed around outcomes first.">
          From complex ideas to production-ready software.
        </SectionHeading>
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {servicesData.map((service, index) => (
            <CapabilityCard key={service.id} service={service} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};
