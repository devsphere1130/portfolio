import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, ArrowLeft, ArrowUpRight, Code2 } from 'lucide-react';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { yearRange } from '../../lib/caseStudy';
import { ResponsiveImage } from './Primitives';

const EASE = [0.22, 1, 0.36, 1];

export const ProjectHero = ({ project, onExplore }) => {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  // Controlled background motion: the glow drifts slowly as the hero scrolls away.
  const glowY = useTransform(scrollYProgress, [0, 1], ['0%', reduced ? '0%' : '30%']);

  const rise = (i) => ({
    initial: { opacity: 0, y: reduced ? 0 : 26, filter: reduced ? 'none' : 'blur(8px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: reduced ? 0.2 : 0.9, delay: reduced ? 0 : 0.08 * i, ease: EASE },
  });

  const years = yearRange(project.started_at, project.completed_at);
  const facts = [
    ['Role', project.project_role],
    ['Duration', project.project_duration],
    ['Client', project.client_name],
    ['Year', years],
  ].filter(([, value]) => value);
  const labels = [project.category, project.status_label, project.is_featured && 'Featured'].filter(Boolean);
  const media = project.hero;
  // Size the card to the image's own ratio so any screenshot fits exactly, with no letterboxing or cropping.
  const mediaStyle = media?.width && media?.height
    ? { aspectRatio: `${media.width} / ${media.height}`, '--cs-media-ratio': media.width / media.height }
    : undefined;

  return (
    <section ref={ref} className="cs-hero" aria-labelledby="cs-title">
      <div className="cs-hero-bg" aria-hidden="true">
        <motion.div className="cs-hero-glow" style={{ y: glowY }} />
      </div>
      <div className={`cs-shell cs-hero-grid ${media ? 'has-media' : ''}`}>
        <div className="cs-hero-copy">
          <motion.div {...rise(0)}>
            <Link to="/projects" className="cs-back"><ArrowLeft size={16} aria-hidden="true" />All work</Link>
          </motion.div>
          {labels.length > 0 && (
            <motion.p className="cs-eyebrow" {...rise(1)}>
              <span className="cs-eyebrow-dot" aria-hidden="true" />{labels.join(' · ')}
            </motion.p>
          )}
          <motion.h1 id="cs-title" className="cs-title" {...rise(2)}>{project.title}</motion.h1>
          {project.short_description && <motion.p className="cs-summary" {...rise(3)}>{project.short_description}</motion.p>}
          {project.description && project.description !== project.short_description && (
            <motion.p className="cs-intro" {...rise(4)}>{project.description}</motion.p>
          )}
          {project.technologies?.length > 0 && (
            <motion.ul className="cs-badges" aria-label="Main technologies" {...rise(5)}>
              {project.technologies.map((tech) => <li key={tech} className="cs-chip">{tech}</li>)}
            </motion.ul>
          )}
          {facts.length > 0 && (
            <motion.dl className="cs-facts" {...rise(6)}>
              {facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </motion.dl>
          )}
          <motion.div className="cs-actions" {...rise(7)}>
            <button type="button" className="interactive hero-content-cta hero-content-cta-primary" onClick={onExplore}>
              <span>Explore the Project<ArrowDown size={18} aria-hidden="true" /></span>
            </button>
            {project.project_url && (
              <a className="cs-link" href={project.project_url} target="_blank" rel="noopener noreferrer">
                Live project<ArrowUpRight size={16} aria-hidden="true" />
              </a>
            )}
            {project.repository_url && (
              <a className="cs-link" href={project.repository_url} target="_blank" rel="noopener noreferrer">
                <Code2 size={16} aria-hidden="true" />Source code
              </a>
            )}
          </motion.div>
        </div>

        {media && (
          <motion.figure
            className="cs-hero-media"
            style={mediaStyle}
            initial={{ opacity: 0, clipPath: reduced ? 'inset(0 0 0 0 round 16px)' : 'inset(8% 6% 8% 6% round 16px)' }}
            animate={{ opacity: 1, clipPath: 'inset(0% 0% 0% 0% round 16px)' }}
            transition={{ duration: reduced ? 0.2 : 1.2, delay: reduced ? 0 : 0.25, ease: EASE }}
          >
            <div className="cs-hero-media-inner">
              <ResponsiveImage image={media} eager sizes="(min-width: 1024px) 52vw, 100vw" fetchpriority="high" />
            </div>
          </motion.figure>
        )}
      </div>
    </section>
  );
};
