import { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const ProjectCard = ({ project, index }) => {
  const cardRef = useRef(null);
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
      className={`group grid cursor-pointer gap-8 lg:grid-cols-2 lg:items-center ${
        index % 2 ? 'lg:[&_.project-image]:order-2' : ''
      }`}
      data-cursor="view"
    >
      <div className="project-image relative min-h-[20rem] overflow-hidden rounded-lg border border-white/10 bg-slate-900 md:min-h-[28rem]">
        <img
          ref={imageRef}
          src={project.image}
          alt={project.title}
          loading="lazy"
          className="h-full w-full object-cover opacity-80 saturate-90 transition-opacity duration-300 group-hover:opacity-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
        <div className="absolute bottom-6 left-6 flex items-center gap-3 rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-white opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100">
            <span className="text-sm font-semibold">View Case Study</span>
            <ArrowRight size={20} />
        </div>
      </div>

      <div ref={contentRef} className="glass-panel rounded-lg p-6 md:p-8">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-[0.24em] text-sky-300">
            {project.category}
          </span>
          <div className="h-1 w-1 rounded-full bg-slate-600" />
          <span className="text-xs text-slate-500">Featured Project</span>
        </div>

        <h3 className="text-3xl font-semibold tracking-tight text-white transition-colors group-hover:text-sky-200 md:text-5xl">
          {project.title}
        </h3>

        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Problem
        </p>
        <p className="mt-2 leading-7 text-slate-300">{project.problem}</p>

        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Built
        </p>
        <p className="mt-2 leading-7 text-slate-400">{project.description}</p>

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
      </div>
    </motion.article>
  );
};
