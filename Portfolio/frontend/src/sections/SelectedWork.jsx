import { projectsData } from '../data/projects';
import { SectionHeading } from '../components/SectionHeading';
import { ProjectCard } from '../components/ProjectCard';

export const SelectedWork = () => {
  return (
    <section id="work" className="py-24 md:py-32">
      <div className="section-shell">
        <SectionHeading subtitle="A selection of digital products and business systems I've designed and engineered.">
          Selected Work
        </SectionHeading>

        <div className="mt-16 space-y-20 md:space-y-28">
          {projectsData.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>

        <div className="mt-16 text-center">
          <button className="interactive rounded-md border border-white/15 px-8 py-4 font-bold text-white transition-colors hover:border-sky-300/50 hover:bg-white/[0.04]">
            View All Projects
          </button>
        </div>
      </div>
    </section>
  );
};
