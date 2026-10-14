import { pick, useContent, useSection } from '../content/hooks';
import { SectionHeading } from '../components/SectionHeading';
import { TechItem } from '../components/TechItem';

export const TechStack = () => {
  const { technologies: technologiesData } = useContent();
  const section = useSection('home', 'tech-stack');
  return (
    <section id="stack" className="py-24 md:py-32">
      <div className="section-shell">
        <SectionHeading subtitle={pick(section, 'subtitle', 'A practical engineering stack for scalable business applications, REST APIs, dashboards and polished customer-facing interfaces.')}>
          {pick(section, 'title', 'Technology chosen for product outcomes.')}
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
