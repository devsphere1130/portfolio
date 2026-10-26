import { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useContent } from '../content/hooks';
import { fillTemplate } from '../lib/whatsapp';
import { WhatsAppLink } from './whatsapp/WhatsAppLink';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const ProjectCard = ({ project, index }) => {
  const cardRef = useRef(null);
  const { whatsapp } = useContent();
  const imageRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardRef.current,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          delay: index * 0.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: cardRef.current,
            start: 'top 80%',
          },
        }
      );
    });

    return () => ctx.revert();
  }, [index]);

  const handleHover = () => {
    if (imageRef.current) {
      gsap.to(imageRef.current, {
        scale: 1.05,
        duration: 0.4,
        ease: 'power2.out',
      });
    }
  };

  const handleHoverEnd = () => {
    if (imageRef.current) {
      gsap.to(imageRef.current, {
        scale: 1,
        duration: 0.4,
        ease: 'power2.out',
      });
    }
  };

  return (
    <motion.article
      ref={cardRef}
      onMouseEnter={handleHover}
      onMouseLeave={handleHoverEnd}
      whileHover={{ y: -6 }}
      className={`group relative grid cursor-pointer gap-8 lg:grid-cols-2 lg:items-center ${
        index % 2 ? 'lg:[&_.project-image]:order-2' : ''
      }`}
      data-cursor="view"
    >
      {/* The image is a link too (the text panel's backdrop-filter stops the title's overlay at that panel). */}
      <Link to={`/work/${project.slug}`} tabIndex={-1} aria-hidden="true"
            className="project-image relative block aspect-[16/10] overflow-hidden rounded-lg border border-white/10 bg-slate-900 lg:aspect-auto lg:min-h-[28rem]">
        {project.image ? (
          <img
            ref={imageRef}
            src={project.image}
            alt={project.imageAlt || project.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover object-left-top opacity-80 saturate-90 transition-opacity duration-300 group-hover:opacity-100"
          />
        ) : (
          // No cover uploaded yet: an abstract branded panel (never a broken image or fake screenshot).
          <div ref={imageRef} aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.22),transparent_55%),radial-gradient(circle_at_80%_90%,rgba(165,164,243,0.14),transparent_50%),#070d17]">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(120,200,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(120,200,255,0.06)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_40%_40%,#000,transparent_75%)]" />
            <span className="absolute left-6 top-6 font-mono text-xs uppercase tracking-[0.24em] text-sky-200/50">{project.category}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
        <div aria-hidden="true" className="absolute bottom-6 left-6 flex items-center gap-3 rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-white opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100">
            <span className="text-sm font-semibold">View Case Study</span>
            <ArrowRight size={20} />
        </div>
      </Link>

      <div ref={contentRef} className="glass-panel rounded-lg p-6 md:p-8">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-[0.24em] text-sky-300">
            {project.category}
          </span>
          {project.isFeatured && (
            <>
              <div className="h-1 w-1 rounded-full bg-slate-600" />
              <span className="text-xs text-slate-500">Featured Project</span>
            </>
          )}
        </div>

        <h3 className="text-3xl font-semibold tracking-tight text-white transition-colors group-hover:text-sky-200 md:text-5xl">
          {/* The title link covers the whole card, so a click anywhere opens the case study. */}
          <Link to={`/work/${project.slug}`} className="after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-sky-300">
            {project.title}
          </Link>
        </h3>

        {project.problem && (
          <>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Problem</p>
            <p className="mt-2 leading-7 text-slate-300">{project.problem}</p>
          </>
        )}

        {project.description && (
          <>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Built</p>
            <p className="mt-2 leading-7 text-slate-400">{project.description}</p>
          </>
        )}

        <div className="flex flex-wrap gap-2 pt-6">
          {project.technologies.map((tech) => (
            <span
              key={tech}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300 transition-colors hover:border-sky-300/50"
            >
              {tech}
            </span>
          ))}
        </div>
        <div className="relative z-10 mt-6 flex flex-wrap items-center gap-3">
          <Link to={`/work/${project.slug}`} tabIndex={-1} aria-hidden="true"
                className="inline-flex items-center gap-2 rounded-md border border-sky-300/30 px-4 py-2.5 text-sm font-semibold text-sky-100 transition-colors hover:border-sky-300/60 hover:bg-sky-300/10">
            View Case Study <ArrowRight size={16} />
          </Link>
          {whatsapp?.enabled && whatsapp.show_project_buttons && (
            <WhatsAppLink phone={whatsapp.phone} className="wa-button"
                          text={fillTemplate(whatsapp.project_message_template, { title: project.title, url: `${window.location.origin}/work/${project.slug}` })}>
              Ask about this project
            </WhatsAppLink>
          )}
        </div>
      </div>
    </motion.article>
  );
};
