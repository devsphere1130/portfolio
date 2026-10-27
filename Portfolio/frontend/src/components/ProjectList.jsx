import { useContent } from '../content/hooks';
import { ProjectCard } from './ProjectCard';

/** Placeholder with the same footprint as a ProjectCard, so nothing jumps when the real cards arrive. */
const ProjectCardSkeleton = ({ flipped }) => (
  <div aria-hidden="true" className={`grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)] gap-8 xl:grid-cols-2 xl:items-center ${flipped ? 'xl:[&>*:first-child]:order-2' : ''}`}>
    <div className="aspect-[16/10] min-w-0 rounded-lg border border-white/10 bg-white/[0.03] motion-safe:animate-pulse" />
    <div className="glass-panel space-y-4 rounded-lg p-6 md:p-8">
      <div className="h-3 w-28 rounded bg-white/10 motion-safe:animate-pulse" />
      <div className="h-10 w-3/4 rounded bg-white/10 motion-safe:animate-pulse" />
      <div className="h-3 w-full rounded bg-white/[0.07] motion-safe:animate-pulse" />
      <div className="h-3 w-5/6 rounded bg-white/[0.07] motion-safe:animate-pulse" />
      <div className="flex gap-2 pt-2">
        {[0, 1, 2].map((i) => <div key={i} className="h-6 w-16 rounded-full bg-white/[0.07] motion-safe:animate-pulse" />)}
      </div>
    </div>
  </div>
);

const Notice = ({ children }) => (
  <p className="glass-panel rounded-lg px-6 py-10 text-center text-slate-400">{children}</p>
);

/**
 * Project cards from the API, with explicit states: skeletons while loading, a notice if the API
 * can't be reached or there are no projects yet. `limit` shows only the first N (featured first is
 * the caller's job).
 */
export const ProjectList = ({ projects, limit, skeletons = 2 }) => {
  const { status } = useContent();
  const shown = limit ? projects.slice(0, limit) : projects;
  if (shown.length) {
    return (
      <div className="space-y-20 md:space-y-28">
        {shown.map((project, index) => <ProjectCard key={project.id} project={project} index={index} />)}
      </div>
    );
  }
  if (status === 'loading') {
    return (
      <div className="space-y-20 md:space-y-28" role="status" aria-label="Loading projects">
        {Array.from({ length: skeletons }, (_, i) => <ProjectCardSkeleton key={i} flipped={i % 2 === 1} />)}
      </div>
    );
  }
  if (status === 'error') return <Notice>Projects couldn’t be loaded right now. Please refresh the page in a moment.</Notice>;
  return <Notice>New case studies are on the way. Check back soon.</Notice>;
};
