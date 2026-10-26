import { Link } from 'react-router-dom';
import { pick, useContent, useSection } from '../content/hooks';
import { SectionHeading } from '../components/SectionHeading';
import { ProjectList } from '../components/ProjectList';

export const SelectedWork = () => {
  const { projects, status } = useContent();
  const section = useSection('home', 'selected-work');
  const cta = pick(section, 'cta', { label: 'View All Projects', href: '/projects' });
  // Featured projects first; the API already orders by display order.
  const shown = [...projects].sort((a, b) => Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured))).slice(0, 2);
  // The API confirmed there are no projects yet: leave the section out rather than show an empty block.
  // (While loading it shows skeletons; if the API can't be reached, ProjectList shows a notice.)
  if (status === 'live' && !projects.length) return null;
  return (
    <section id="work" className="py-24 md:py-32">
      <div className="section-shell">
        <SectionHeading subtitle={pick(section, 'subtitle', "A selection of digital products and business systems I've designed and engineered.")}>
          {pick(section, 'title', 'Selected Work')}
        </SectionHeading>

        <div className="mt-16">
          <ProjectList projects={shown} />
        </div>

        <div className="mt-16 text-center">
          <Link
            to={cta.href || '/projects'}
            className="interactive inline-flex rounded-md border border-white/15 px-8 py-4 font-bold text-white transition-colors hover:border-sky-300/50 hover:bg-white/[0.04]"
          >
            {cta.label || 'View All Projects'}
          </Link>
        </div>
      </div>
    </section>
  );
};
