import { technologiesData } from '../data/technologies';
import { SectionHeading } from '../components/SectionHeading';
import { TechItem } from '../components/TechItem';

export const TechStack = () => {
  return (
    <section id="stack" className="py-24 md:py-32">
      <div className="section-shell">
        <SectionHeading subtitle="A practical engineering stack for scalable business applications, REST APIs, dashboards and polished customer-facing interfaces.">
          Technology chosen for product outcomes.
        </SectionHeading>
        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          {technologiesData.map((group) => (
            <article key={group.category} className="glass-panel rounded-lg p-6">
              <h3 className="mb-5 text-xl font-semibold text-white">{group.category}</h3>
              <ul className="grid gap-3 sm:grid-cols-2">
                {group.items.map((tech) => (
                  <TechItem key={tech.name} tech={tech} />
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
