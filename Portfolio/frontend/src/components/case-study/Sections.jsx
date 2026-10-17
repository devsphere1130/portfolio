import { ArrowUpRight, Bell, ChartColumn, Cloud, Code2, CreditCard, Database, FileText, Globe, Layers, Lock, MessageSquare, Search, Settings, ShieldCheck, Smartphone, Users, Workflow, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { groupStack } from '../../lib/caseStudy';
import { Prose, Reveal, ResponsiveImage, SectionHeader } from './Primitives';
import { VideoPlayer } from './ProjectVideoSection';

// Matches FEATURE_ICONS in backend/cms/project_serializers.py.
const ICONS = {
  shield: ShieldCheck, zap: Zap, chart: ChartColumn, users: Users, workflow: Workflow, database: Database, lock: Lock,
  bell: Bell, globe: Globe, smartphone: Smartphone, layers: Layers, 'credit-card': CreditCard, search: Search,
  'file-text': FileText, settings: Settings, cloud: Cloud, code: Code2, message: MessageSquare,
};

export const ProjectOverview = ({ project, index }) => (
  <section id="overview" className="cs-section" aria-labelledby="cs-overview-title">
    <div className="cs-shell cs-overview">
      <div className="cs-overview-aside">
        <SectionHeader id="cs-overview-title" index={index} eyebrow="Overview" title="The project" highlight="at a glance." />
        {project.audience && (
          <Reveal className="cs-aside-card" delay={0.1}>
            <h3>Built for</h3>
            <p>{project.audience}</p>
          </Reveal>
        )}
      </div>
      <Reveal delay={0.05}><Prose paragraphs={project.overview} /></Reveal>
    </div>
  </section>
);

export const ProjectBuildComponents = ({ items, index, onOpenImage }) => {
  // Image-led items read best as alternating editorial rows; text-only items as a card grid.
  const editorial = items.some((item) => item.image || item.video);
  return (
    <section className="cs-section" aria-labelledby="cs-build-title">
      <div className="cs-shell">
        <SectionHeader id="cs-build-title" index={index} eyebrow="What we built" title="Inside the" highlight="solution."
                       intro="The engineering work behind the product, piece by piece." />
        {editorial ? (
          <ol className="cs-build-list">
            {items.map((item, i) => (
              <Reveal as="li" key={item.id} className="cs-build">
                <div className="cs-build-copy">
                  <span className="cs-build-index">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{item.title}</h3>
                  <p className="cs-build-summary">{item.summary}</p>
                  <Prose paragraphs={item.details} />
                </div>
                {item.video ? <VideoPlayer video={item.video} compact /> : item.image && (
                  <figure className="cs-build-media">
                    <button type="button" className="cs-slide-button" onClick={() => onOpenImage(item.image)} aria-label={`Enlarge image: ${item.title}`}>
                      <ResponsiveImage image={item.image} sizes="(min-width: 1024px) 55vw, 100vw" />
                    </button>
                  </figure>
                )}
              </Reveal>
            ))}
          </ol>
        ) : (
          <ul className="cs-build-cards">
            {items.map((item, i) => (
              <Reveal as="li" key={item.id} className="cs-build-card" delay={(i % 3) * 0.06}>
                <span className="cs-build-index">{String(i + 1).padStart(2, '0')}</span>
                <h3>{item.title}</h3>
                <p className="cs-build-summary">{item.summary}</p>
                <Prose paragraphs={item.details} />
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export const ProjectTechnologyStack = ({ stack, index }) => {
  const groups = groupStack(stack);
  return (
    <section className="cs-section" aria-labelledby="cs-stack-title">
      <div className="cs-shell">
        <SectionHeader id="cs-stack-title" index={index} eyebrow="Technology" title="The stack" highlight="behind it." />
        <Reveal className={`cs-stack cols-${Math.min(groups.length, 4)}`}>
          {groups.map((group) => (
            <div key={group.category} className="cs-stack-group">
              <h3>{group.category}</h3>
              <ul>
                {group.entries.map((entry) => (
                  <li key={entry.name}><strong>{entry.name}</strong>{entry.note && <span>{entry.note}</span>}</li>
                ))}
              </ul>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
};

export const ProjectStory = ({ blocks, index, onOpenImage }) => (
  <section className="cs-section" aria-labelledby="cs-story-title">
    <div className="cs-shell">
      <SectionHeader id="cs-story-title" index={index} eyebrow="The story" title="From problem" highlight="to production." />
      <ol className="cs-story">
        {blocks.map((block, i) => (
          <Reveal as="li" key={block.key} className="cs-story-block">
            <div className="cs-story-label"><span>{String(i + 1).padStart(2, '0')}</span><h3>{block.title}</h3></div>
            <Prose paragraphs={block.paragraphs} />
            {block.image && (
              <figure className="cs-story-media">
                <button type="button" className="cs-slide-button" onClick={() => onOpenImage(block.image)} aria-label={`Enlarge image: ${block.title}`}>
                  <ResponsiveImage image={block.image} sizes="(min-width: 1024px) 60vw, 100vw" />
                </button>
              </figure>
            )}
          </Reveal>
        ))}
      </ol>
    </div>
  </section>
);

export const ProjectFeatures = ({ features, index }) => (
  <section className="cs-section" aria-labelledby="cs-features-title">
    <div className="cs-shell">
      <SectionHeader id="cs-features-title" index={index} eyebrow="Key features" title="What it" highlight="does." />
      <ul className="cs-features">
        {features.map((feature, i) => {
          const Icon = ICONS[feature.icon_key];
          return (
            <Reveal as="li" key={feature.id} className="cs-feature" delay={(i % 3) * 0.06}>
              {feature.image && <ResponsiveImage image={feature.image} sizes="(min-width: 1100px) 30vw, (min-width: 640px) 45vw, 100vw" />}
              <div className="cs-feature-body">
                {Icon && !feature.image && <span className="cs-feature-icon" aria-hidden="true"><Icon size={20} /></span>}
                <h3>{feature.title}</h3>
                {feature.description && <p>{feature.description}</p>}
              </div>
            </Reveal>
          );
        })}
      </ul>
    </div>
  </section>
);

export const ProjectOutcomes = ({ outcomes, index }) => (
  <section className="cs-section" aria-labelledby="cs-outcomes-title">
    <div className="cs-shell">
      <SectionHeader id="cs-outcomes-title" index={index} eyebrow="Outcomes" title="The" highlight="impact." />
      <ul className={`cs-outcomes ${outcomes.length > 2 ? 'many' : ''}`}>
        {outcomes.map((outcome, i) => (
          <Reveal as="li" key={outcome.id} className="cs-outcome" delay={(i % 3) * 0.06}>
            {outcome.metric_value && <span className="cs-metric">{outcome.metric_value}</span>}
            <h3>{outcome.label}</h3>
            {outcome.description && <p>{outcome.description}</p>}
          </Reveal>
        ))}
      </ul>
    </div>
  </section>
);

export const RelatedProjects = ({ projects, index }) => (
  <section className="cs-section" aria-labelledby="cs-related-title">
    <div className="cs-shell">
      <SectionHeader id="cs-related-title" index={index} eyebrow="More work" title="Related" highlight="projects." />
      <ul className="cs-related">
        {projects.map((project, i) => (
          <Reveal as="li" key={project.slug} delay={(i % 3) * 0.06}>
            <Link to={`/work/${project.slug}`} className="cs-related-card">
              {project.cover && <ResponsiveImage image={project.cover} alt="" sizes="(min-width: 768px) 33vw, 100vw" />}
              <div className="cs-related-body">
                {project.category && <p className="cs-eyebrow">{project.category}</p>}
                <h3>{project.title}</h3>
                {project.short_description && <p>{project.short_description}</p>}
                <span className="cs-link">View case study<ArrowUpRight size={16} aria-hidden="true" /></span>
              </div>
            </Link>
          </Reveal>
        ))}
      </ul>
    </div>
  </section>
);
